/* ═══════════════════════════════════════════════════════════════════════════
   BRANCHING STORY ENGINE
   ───────────────────────────────────────────────────────────────────────────
   Once the base story is told, the class picks "what happens next". A branch
   adds one fresh beat that needs its own words, so one template carries several
   beats and the lesson ends on a storyline the class chose together.

   Templates may ship `branches` in their JSON (the AI is asked to write them).
   When a template has none — every built-in one, to begin with — the engine
   synthesises theme-flavoured choices from the pools below, so branching works
   for all content with no extra authoring.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { Blank, Branch, Template } from "./types";

interface PoolBlank {
  label: string;
  type: string;
  suggestions: string[];
}

const FANTASY: PoolBlank[] = [
  { label: "Secret Place", type: "place", suggestions: ["the Whispering Forest", "the dragon's cave", "the broken tower", "the moonlit lake"] },
  { label: "Magic Object", type: "noun", suggestions: ["enchanted amulet", "cursed spoon", "glowing map", "talking sword"] },
  { label: "Creature (new)", type: "animal", suggestions: ["baby griffin", "polite troll", "very tired phoenix", "tiny gargoyle"] },
  { label: "Feelings", type: "emotion", suggestions: ["suspicious", "thrilled", "mildly cursed", "heroic"] },
  { label: "Riddle Word", type: "noun", suggestions: ["destiny", "walnut", "prophecy", "biscuit"] },
  { label: "Spell Action", type: "verb", suggestions: ["conjure", "teleport", "glow", "explode"] },
];

const MYSTERY: PoolBlank[] = [
  { label: "Suspicious Place", type: "place", suggestions: ["abandoned cinema", "rainy alley", "the lighthouse", "room 13"] },
  { label: "Clue", type: "noun", suggestions: ["glove", "train ticket", "half a photo", "suspicious receipt"] },
  { label: "Witness", type: "person", suggestions: ["the night porter", "a nosy neighbour", "the barista", "nobody at all"] },
  { label: "Secret Feeling", type: "emotion", suggestions: ["uneasy", "guilty", "curious", "definitely lying"] },
  { label: "Suspicious Verb", type: "verb", suggestions: ["follow", "hide", "confess", "investigate"] },
  { label: "Alibi Word", type: "noun", suggestions: ["a broken watch", "the wrong key", "a burnt letter", "an empty cage"] },
];

const HISTORICAL: PoolBlank[] = [
  { label: "Ancient Place", type: "place", suggestions: ["the forum", "a castle kitchen", "the Silk Road", "the harbour"] },
  { label: "Relic", type: "noun", suggestions: ["crown", "scroll", "brass compass", "clay tablet"] },
  { label: "Historical Figure", type: "person", suggestions: ["a tired emperor", "the palace cook", "a Roman engineer", "a restless queen"] },
  { label: "Mood of the Age", type: "emotion", suggestions: ["rebellious", "proud", "starving", "hopeful"] },
  { label: "Decree Verb", type: "verb", suggestions: ["declare", "banish", "build", "forgive"] },
];

const APOCALYPSE: PoolBlank[] = [
  { label: "Ruined Place", type: "place", suggestions: ["the flooded mall", "the last petrol station", "a collapsed bridge", "the dead arcade"] },
  { label: "Survival Object", type: "noun", suggestions: ["one working torch", "a rusty can opener", "half a map", "a solar radio"] },
  { label: "Settlement Name", type: "place", suggestions: ["Hope Flats", "Camp 9", "the Quiet Zone", "Scrapyard City"] },
  { label: "Survivor Feeling", type: "emotion", suggestions: ["determined", "exhausted", "ruthless", "weirdly optimistic"] },
  { label: "Survival Verb", type: "verb", suggestions: ["scavenge", "negotiate", "repair", "escape"] },
];

const NOIR: PoolBlank[] = [
  { label: "Rainy Place", type: "place", suggestions: ["the all-night diner", "a payphone booth", "the docks", "room 402"] },
  { label: "Evidence", type: "noun", suggestions: ["a matchbook", "a lipstick stain", "an unpaid bill", "a photograph"] },
  { label: "Client", type: "person", suggestions: ["a nervous heiress", "the wrong brother", "a jazz singer", "the police captain"] },
  { label: "Bad Feeling", type: "emotion", suggestions: ["paranoid", "tired", "bought", "cold"] },
  { label: "Night Verb", type: "verb", suggestions: ["tail", "bribe", "confess", "disappear"] },
];

const FAIRY_TALE: PoolBlank[] = [
  { label: "Enchanted Place", type: "place", suggestions: ["the glass garden", "the candy village", "the deep wood", "the cloud staircase"] },
  { label: "Enchanted Object", type: "noun", suggestions: ["glass slipper", "talking mirror", "golden apple", "tiny key"] },
  { label: "Character", type: "person", suggestions: ["a bored fairy", "the third prince", "a very tall dwarf", "the baker's daughter"] },
  { label: "Story Feeling", type: "emotion", suggestions: ["hopeful", "jealous", "brave", "sleepy"] },
  { label: "Magic Verb", type: "verb", suggestions: ["wish", "transform", "rescue", "dance"] },
];

const MYTH: PoolBlank[] = [
  { label: "Sacred Place", type: "place", suggestions: ["Mount Olympus", "the underworld gate", "the sea of monsters", "the star forge"] },
  { label: "Divine Object", type: "noun", suggestions: ["thunderbolt", "golden fleece", "winged sandals", "golden apple"] },
  { label: "God or Hero", type: "person", suggestions: ["a grumpy Zeus", "a forgetful hero", "the ferryman", "a minor goddess"] },
  { label: "Epic Feeling", type: "emotion", suggestions: ["furious", "honoured", "doomed", "glorious"] },
  { label: "Divine Verb", type: "verb", suggestions: ["smite", "bless", "transform", "punish"] },
];

const SLICE: PoolBlank[] = [
  { label: "Everyday Place", type: "place", suggestions: ["the staff kitchen", "platform 3", "the school corridor", "the corner shop"] },
  { label: "Everyday Object", type: "noun", suggestions: ["a lost umbrella", "someone's lunch", "a phone charger", "a sticky note"] },
  { label: "Everyday Person", type: "person", suggestions: ["the new colleague", "the bus driver", "your neighbour", "the barista"] },
  { label: "Small Feeling", type: "emotion", suggestions: ["awkward", "proud", "embarrassed", "relieved"] },
  { label: "Everyday Verb", type: "verb", suggestions: ["apologise", "pretend", "help", "panic"] },
];

const SPORTS: PoolBlank[] = [
  { label: "Stadium Area", type: "place", suggestions: ["the changing room", "the bench", "the final third", "the tunnel"] },
  { label: "Lucky Object", type: "noun", suggestions: ["lucky socks", "the captain's armband", "an old ball", "a water bottle"] },
  { label: "Rival", type: "person", suggestions: ["the star striker", "the strict coach", "last year's champion", "your own teammate"] },
  { label: "Game Feeling", type: "emotion", suggestions: ["nervous", "fired up", "exhausted", "invincible"] },
  { label: "Match Verb", type: "verb", suggestions: ["dribble", "tackle", "celebrate", "choke"] },
];

const HOLIDAY: PoolBlank[] = [
  { label: "Festive Place", type: "place", suggestions: ["the kitchen", "grandma's living room", "the town square", "the airport gate"] },
  { label: "Festive Object", type: "noun", suggestions: ["burnt pudding", "a mystery present", "tangled lights", "the last mince pie"] },
  { label: "Relative", type: "person", suggestions: ["Uncle Dave", "the competitive cousin", "grandma", "the neighbour"] },
  { label: "Festive Feeling", type: "emotion", suggestions: ["festive", "stuffed", "awkward", "delighted"] },
  { label: "Party Verb", type: "verb", suggestions: ["unwrap", "toast", "sing", "escape"] },
];

const DREAM: PoolBlank[] = [
  { label: "Impossible Place", type: "place", suggestions: ["the upside-down city", "the ocean of doors", "the hallway of clocks", "the talking forest"] },
  { label: "Impossible Object", type: "noun", suggestions: ["a melting staircase", "yesterday's sandwich", "a clock with no hands", "the wrong moon"] },
  { label: "Dream Character", type: "person", suggestions: ["yourself, but taller", "a talking lamp", "the version of you that did the homework", "nobody, loudly"] },
  { label: "Dream Feeling", type: "emotion", suggestions: ["floaty", "dread", "confused", "euphoric"] },
  { label: "Dream Verb", type: "verb", suggestions: ["float", "forget", "remember", "wake"] },
];

const TIMETRAVEL: PoolBlank[] = [
  { label: "Era / Place", type: "place", suggestions: ["1912", "the Jurassic coast", "next Thursday", "the year 3025"] },
  { label: "Time Object", type: "noun", suggestions: ["a broken watch", "a flux capacitor", "a history textbook", "a phone with 1%"] },
  { label: "Person Out of Time", type: "person", suggestions: ["a confused Viking", "a Victorian inventor", "your future self", "a Roman tourist"] },
  { label: "Time Feeling", type: "emotion", suggestions: ["dizzy", "paranoid", "nostalgic", "late"] },
  { label: "Time Verb", type: "verb", suggestions: ["rewind", "jump", "change", "warn"] },
];

const ANIME: PoolBlank[] = [
  { label: "Anime Place", type: "place", suggestions: ["the rooftop", "the school gate", "the shrine steps", "the training ground"] },
  { label: "Special Item", type: "noun", suggestions: ["a mysterious pendant", "a bento", "a transformation pen", "a rival's notebook"] },
  { label: "Anime Character", type: "person", suggestions: ["the transfer student", "the club president", "a magical cat", "the childhood friend"] },
  { label: "Anime Feeling", type: "emotion", suggestions: ["determined", "flustered", "dramatic", "shocked"] },
  { label: "Anime Verb", type: "verb", suggestions: ["transform", "confess", "train", "shout"] },
];

const DEFAULT_POOL: PoolBlank[] = [
  { label: "New Place", type: "place", suggestions: ["the next town", "the old warehouse", "the other side", "a strange room"] },
  { label: "New Object", type: "noun", suggestions: ["a locked box", "a note", "a strange key", "a broken phone"] },
  { label: "New Character", type: "person", suggestions: ["a stranger", "an old friend", "the person in charge", "a helpful kid"] },
  { label: "New Feeling", type: "emotion", suggestions: ["curious", "worried", "excited", "suspicious"] },
  { label: "Next Action", type: "verb", suggestions: ["investigate", "run", "ask", "hide"] },
];

const POOLS: { match: RegExp; pool: PoolBlank[] }[] = [
  { match: /fantasy/i, pool: FANTASY },
  { match: /mystery|noir/i, pool: MYSTERY.concat(NOIR) },
  { match: /historical/i, pool: HISTORICAL },
  { match: /post-apocalyptic|apocalyp/i, pool: APOCALYPSE },
  { match: /fairy/i, pool: FAIRY_TALE },
  { match: /mythology/i, pool: MYTH },
  { match: /slice/i, pool: SLICE },
  { match: /sport/i, pool: SPORTS },
  { match: /holiday/i, pool: HOLIDAY },
  { match: /dream|surreal/i, pool: DREAM },
  { match: /time/i, pool: TIMETRAVEL },
  { match: /anime|japanese/i, pool: ANIME },
];

export function themePool(theme: string): PoolBlank[] {
  const hit = POOLS.find((p) => p.match.test(theme));
  return hit ? hit.pool : DEFAULT_POOL;
}

/** Three beats that work for any story, so a synthesised branch always reads. */
const SYNTHETIC_BEATS: { label: (t: Template) => string; beat: string; tone: Branch["tone"] }[] = [
  {
    label: () => "Chase it — straight into the trouble",
    beat: "Nobody waited for permission. They ran straight to {1}, where a {3} was already waiting for them. The plan, it turned out, had depended on {2} all along.",
    tone: "normal",
  },
  {
    label: () => "Turn back — and take the long way",
    beat: "They chose the sensible option and headed for {1} instead. Halfway there, {3} appeared out of nowhere holding {2}, and nobody could agree whether that was good news.",
    tone: "absurd",
  },
  {
    label: () => "Stop and ask one honest question",
    beat: `"{3}, what is really going on?" The answer stopped the whole kingdom: {2}. Someone at the back whispered about {1}, and everyone pretended not to hear.`,
    tone: "wild",
  },
];

function pickDistinct<T>(arr: T[], n: number, avoid: Set<string>, key: (v: T) => string): T[] {
  const out: T[] = [];
  for (let i = 0; i < arr.length && out.length < n; i++) {
    const item = arr[(i + avoid.size) % arr.length];
    const k = key(item);
    if (avoid.has(k) || out.some((o) => key(o) === k)) continue;
    out.push(item);
  }
  // fall back to anything unused if the pool was too small
  for (let i = 0; out.length < n && i < arr.length; i++) {
    if (!out.includes(arr[i])) out.push(arr[i]);
  }
  return out;
}

/**
 * Build 2-3 theme-flavoured choices for a template that ships none.
 * Deterministic per template id, so the same story offers the same choices.
 */
export function synthesizeBranches(template: Template, count = 3): Branch[] {
  const pool = themePool(template.theme);
  const avoid = new Set(template.blanks.map((b) => b.label.toLowerCase()));

  return SYNTHETIC_BEATS.slice(0, Math.max(2, Math.min(count, SYNTHETIC_BEATS.length))).map((pattern, i) => {
    const chosen = pickDistinct(pool, 3, avoid, (p) => p.label.toLowerCase() + i);
    const blanks: Blank[] = chosen.map((p, bi) => ({
      id: String(bi + 1),
      label: p.label,
      type: p.type,
      suggestions: p.suggestions,
    }));
    return {
      id: `${template.id}-branch-${i + 1}`,
      label: pattern.label(template),
      beat: pattern.beat,
      blanks,
      tone: pattern.tone,
    };
  });
}

/** A template's own branches when present, synthesised ones otherwise. */
export function branchesFor(template: Template, count = 3): Branch[] {
  const own = (template.branches ?? []).filter((b) => b && b.beat && Array.isArray(b.blanks) && b.blanks.length > 0);
  return own.length >= 2 ? own.slice(0, 4) : synthesizeBranches(template, count);
}

/** Fill a beat's {n} placeholders with the branch's answers. */
export function fillBeat(beat: string, answers: Record<string, string>): string {
  let text = beat;
  Object.entries(answers).forEach(([id, val]) => {
    text = text.replace(new RegExp(`\\{${id}\\}`, "g"), val?.trim() || "___");
  });
  // The library's own beats always match their blanks, but an AI pack can ship a
  // beat that mentions a placeholder its blank list forgot. Leaving it would print
  // a literal "{3}" in the middle of the story, so anything unresolved becomes ___.
  return text.replace(/\{\d+\}/g, "___");
}
