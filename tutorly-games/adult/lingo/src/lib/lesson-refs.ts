/**
 * "Where can I read about this?" — the bridge from a Home lesson to the
 * References hub.
 *
 * A lesson is a slice of the pack, so the entries that back it are exactly the
 * pack items in that slice. Nothing here is invented: every link points at an
 * entry the lesson itself is built from.
 */
import type { ContentPack } from "@/content/tutolingo";
import type { LessonPlan } from "@/content/units";
import { refHref, refAnchor, type RefTab } from "@/lib/ref-link";

export interface LessonRef {
  tab: RefTab;
  /** Entry key as stored in the pack (term / topic title / expression / dialogue title). */
  key: string;
  label: string;
}

const MAX_PER_TAB = 2;

function uniq(list: LessonRef[]): LessonRef[] {
  const seen = new Set<string>();
  const out: LessonRef[] = [];
  for (const r of list) {
    const id = `${r.tab}:${r.key.toLowerCase()}`;
    if (!r.key.trim() || seen.has(id)) continue;
    seen.add(id);
    out.push(r);
  }
  return out;
}

/** The reference entries a whole lesson is built from. */
export function lessonRefs(pack: ContentPack, plan: LessonPlan): LessonRef[] {
  const s = plan.slice;
  const pick = <T,>(arr: T[], idx: number[]) =>
    idx.map((i) => arr[i]).filter(Boolean).slice(0, MAX_PER_TAB);

  const grammar: LessonRef[] = pick(pack.grammar, s.grammar).map((g) => ({
    tab: "grammar" as const,
    key: g.title,
    label: g.title,
  }));
  const vocab: LessonRef[] = pick(pack.vocabulary, s.vocab).map((v) => ({
    tab: "vocabulary" as const,
    key: v.term,
    label: v.term,
  }));
  const idioms: LessonRef[] = pick(pack.idioms, s.idioms).map((i) => ({
    tab: "idioms" as const,
    key: i.expression,
    label: i.expression,
  }));
  const dialogues: LessonRef[] = pick(pack.conversations, s.conversations).map((c) => ({
    tab: "dialogues" as const,
    key: c.title,
    label: c.title,
  }));

  // Ordered like the lesson itself: rule first, then words, then idioms/dialogues.
  return uniq([...grammar, ...vocab, ...idioms, ...dialogues]);
}

/**
 * Does the pack actually contain the entry a deep link asked for?
 *
 * Deep-link keys come from the pack itself, but a hand-edited URL (or a pack
 * that was swapped underneath a link) can point at something that is not there.
 * Checking the data — rather than the rendered DOM — keeps the answer exact and
 * instant, so the References banner never promises an entry it cannot show.
 * The matching rule mirrors the one the views use to scroll and flash.
 */
export function refExists(pack: ContentPack, tab: RefTab, key: string | undefined): boolean {
  const needle = (key || "").trim().toLowerCase();
  if (!needle) return false;
  const match = (value: string | undefined) => {
    const v = (value || "").trim().toLowerCase();
    return !!v && (v === needle || (needle.length > 3 && v.includes(needle)));
  };
  switch (tab) {
    case "vocabulary":
      return pack.vocabulary.some((v) => match(v.term));
    case "grammar":
      return pack.grammar.some((g) => match(g.title));
    case "idioms":
      return pack.idioms.some((i) => match(i.expression));
    case "dialogues":
      return (
        pack.conversations.some((c) => match(c.title) || c.turns.some((t) => match(t.target))) ||
        pack.sentences.some((s) => match(s.target))
      );
  }
}

/** A single deep link for one lesson entry. */
export function lessonRefHref(r: LessonRef): string {
  return refHref(r.tab, r.key);
}

export { refAnchor };
