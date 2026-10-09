/*
 * The live dictionary.
 *
 * The deck JSON the AI produces already carries a definition, a pronunciation and synonyms —
 * but it is a *generated* deck, and the interesting failure of a generated deck is not that it
 * is wrong, it is that it is thin: the same two collocations, the same three synonyms, the same
 * example sentence recycled across every card. A learner at C1 level notices immediately.
 *
 * So the card's own content stays the spine and this fills in around it, from sources that
 * actually know the word:
 *
 *  - **Wiktionary** (`en.wiktionary.org/api/rest_v1`) for IPA, the part of speech, and every
 *    sense of the word — which is the genuinely valuable one, because polysemy is the thing a
 *    generated deck flattens. "Sanction" gets one definition from a model and two opposite
 *    ones from a dictionary.
 *  - **Datamuse** (`api.datamuse.com`) for synonyms, antonyms, rhymes and near-rhymes. It has
 *    no key, it is fast, it is `Access-Control-Allow-Origin` for any origin, and the
 *    `sounds-like` and `near-rhyme` packs have no equivalent elsewhere without a key.
 *
 * Note what is *not* here: `api.dictionaryapi.dev`. It is the obvious first choice and it was
 * unreachable from the network this was built on — which is itself the argument for preferring
 * Wikimedia. These are the same endpoints that serve the site to the open web, run by an
 * organisation with a public commitment to keeping them up.
 */

import { getJson, qs, stripHtml } from "./http";

export interface Sense {
  partOfSpeech: string;
  definition: string;
  examples: string[];
}

export interface WordData {
  /** IPA with slashes, e.g. `/ˌserənˈdɪpəti/`. */
  ipa: string;
  senses: Sense[];
  /** Rendered by the browser from the ARPAbet Datamuse returns. */
  rhymes: string[];
  soundsLike: string[];
  synonyms: string[];
  antonyms: string[];
  /** Syllable count, which the Speak section uses to pace the word. */
  syllables: number;
}

export const EMPTY_WORD_DATA: WordData = {
  ipa: "",
  senses: [],
  rhymes: [],
  soundsLike: [],
  synonyms: [],
  antonyms: [],
  syllables: 0,
};

interface WiktionaryResponse {
  [language: string]: {
    partOfSpeech?: string;
    language?: string;
    definitions?: { definition?: string; parsedExamples?: { example?: string }[] }[];
  }[];
}

interface DatamuseEntry {
  word: string;
  tags?: string[];
  numSyllables?: number;
}

/**
 * Datamuse encodes pronunciation as ARPAbet with a trailing stress digit per vowel
 * (`S EH0 R AH0 N D IH1 P IH0 T IY0`). The digit is noise to a learner, and the app has no
 * ARPAbet table, so it is dropped — this is a *display* field only, and the Wiktionary IPA is
 * what the card actually teaches.
 */
function cleanDatamusePron(tags: string[] | undefined): string {
  const pron = tags?.find((tag) => tag.startsWith("pron:"));
  return pron ? pron.replace("pron:", "").replace(/[0-9]/g, "") : "";
}

export { cleanDatamusePron };

/** Split a `/ˌserənˈdɪpəti/` into something the card can lay out. */
export function ipaSegments(ipa: string): string[] {
  return ipa.replace(/\//g, "").split(/(?=[ˈˌ])/).filter(Boolean);
}

export async function lookupWord(word: string): Promise<WordData> {
  const term = word.trim().toLowerCase();
  if (!term) return EMPTY_WORD_DATA;

  const [definition, data] = await Promise.all([
    getJson<WiktionaryResponse>(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(term)}`, `def:${term}`),
    getJson<DatamuseEntry[]>(`https://api.datamuse.com/words?${qs({ sp: term, md: "prs", max: 3 })}`, `sp:${term}`),
  ]);

  const [synonyms, antonyms, rhymes, soundsLike] = await Promise.all([
    getJson<DatamuseEntry[]>(`https://api.datamuse.com/words?${qs({ rel_syn: term, max: 10 })}`, `syn:${term}`),
    getJson<DatamuseEntry[]>(`https://api.datamuse.com/words?${qs({ rel_ant: term, max: 6 })}`, `ant:${term}`),
    getJson<DatamuseEntry[]>(`https://api.datamuse.com/words?${qs({ rel_rhy: term, max: 8 })}`, `rhy:${term}`),
    getJson<DatamuseEntry[]>(`https://api.datamuse.com/words?${qs({ rel_nry: term, max: 6 })}`, `nry:${term}`),
  ]);

  return {
    ipa: extractIpa(definition),
    senses: extractSenses(definition),
    rhymes: (rhymes ?? []).map((entry) => entry.word).filter(Boolean),
    soundsLike: (soundsLike ?? []).map((entry) => entry.word).filter(Boolean),
    synonyms: (synonyms ?? []).map((entry) => entry.word).filter(Boolean),
    antonyms: (antonyms ?? []).map((entry) => entry.word).filter(Boolean),
    syllables: data?.find((entry) => entry.word.toLowerCase() === term)?.numSyllables ?? 0,
  };
}

function extractIpa(definition: WiktionaryResponse | null): string {
  const english = definition?.en;
  if (!english) return "";
  for (const entry of english) {
    const raw = (entry as unknown as { pronunciations?: string[] }).pronunciations;
    // Not every REST revision exposes `pronunciations`; the IPA is also in the page's renders.
    if (Array.isArray(raw)) {
      const found = raw.find((item) => item.includes("/"));
      if (found) return found;
    }
  }
  return "";
}

function extractSenses(definition: WiktionaryResponse | null): Sense[] {
  const english = definition?.en;
  if (!english) return [];
  const senses: Sense[] = [];
  for (const entry of english) {
    for (const item of entry.definitions ?? []) {
      const text = stripHtml(item.definition);
      if (!text) continue;
      /*
       * Wiktionary writes a definition that only makes sense in context as "Usually preceded
       * by ...", and those read as noise on a card next to a clean one. Kept, because dropping
       * them loses real accuracy — the note is usually the point of the entry — but capped so
       * one heavily-qualified word cannot fill a card.
       */
      senses.push({
        partOfSpeech: entry.partOfSpeech ?? "",
        definition: text,
        examples: (item.parsedExamples ?? []).map((example) => stripHtml(example.example)).filter(Boolean).slice(0, 2),
      });
      if (senses.length >= 8) return senses;
    }
  }
  return senses;
}
