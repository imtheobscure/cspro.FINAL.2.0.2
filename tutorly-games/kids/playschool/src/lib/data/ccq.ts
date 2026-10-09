import type { Kind, Lang, Word } from "./types";
import { label } from "./index";
import { t } from "./phrases";

export type CcqType = "yesno" | "choice" | "talk";

export interface Ccq {
  key: string;
  type: CcqType;
  vars?: Record<string, string>;
  /** expected answer for yes/no */
  answer?: "yes" | "no";
  /** option word ids for choice questions */
  optionIds?: string[];
  correct?: number;
  /** tutor hint, always English */
  note?: string;
}

const BIG = new Set([
  "elephant", "whale", "giraffe", "lion", "tiger", "bear", "cow", "horse", "camel",
  "shark", "dolphin", "kangaroo", "zebra", "panda", "big", "truck", "bus", "plane", "train", "tree",
]);
const SMALL = new Set([
  "ant", "mouse", "bee", "ladybug", "worm", "flyI", "cricket", "mosquito", "beetle",
  "snail", "small", "rabbit", "hamster", "goldfish", "chick", "seed", "biscuit", "candle",
]);
const FLY = new Set(["plane", "helicopter", "rocket", "bird", "parrot", "bee", "butterfly", "flyI", "mosquito", "fly", "up"]);
const SWIM = new Set(["fish", "goldfish", "whale", "dolphin", "shark", "octopus", "crab", "squid", "blowfish", "turtle", "swim", "swimming", "sea"]);
const COLD = new Set(["icecream", "water", "juice", "milk", "snowy", "cold", "winter", "snowman"]);
const HOT = new Set(["soup", "noodles", "rice", "hot", "summer", "sunny", "tea"]);
const HAPPY = new Set(["happy", "love", "surprise", "proud"]);

function frameKey(kind: Kind): string {
  switch (kind) {
    case "clothes":
    case "body":
      return "frame.iHave";
    case "feeling":
    case "color":
    case "shape":
    case "weather":
    case "number":
    case "letter":
      return "frame.itIs";
    case "person":
    case "food":
    case "drink":
      return "frame.iLike";
    case "place":
      return "frame.iGoTo";
    case "action":
    case "time":
      return "frame.iCanSee";
    default:
      return "frame.iCanSee";
  }
}

export function sentenceFor(word: Word, lang: Lang): string {
  return t(frameKey(word.k), lang, { w: label(word, lang) });
}

/** Concept-check questions — the heart of tutor-led speaking practice. */
export function getCcqs(word: Word, lang: Lang): Ccq[] {
  const out: Ccq[] = [];
  const v = { w: label(word, lang) };
  const push = (c: Ccq) => out.push(c);

  const sizeQ = (): Ccq | null => {
    if (BIG.has(word.id))
      return { key: "ccq.bigOrSmall", type: "choice", optionIds: ["big", "small"], correct: 0 };
    if (SMALL.has(word.id))
      return { key: "ccq.bigOrSmall", type: "choice", optionIds: ["big", "small"], correct: 1 };
    return null;
  };

  switch (word.k) {
    case "animal":
      push({ key: "ccq.isAnimal", type: "yesno", answer: "yes" });
      push({ key: "ccq.isPerson", type: "yesno", answer: "no" });
      if (FLY.has(word.id)) push({ key: "ccq.canFly", type: "yesno", answer: "yes" });
      else if (SWIM.has(word.id)) push({ key: "ccq.canSwim", type: "yesno", answer: "yes" });
      push({ key: "ccq.whatSound", type: "talk", note: "Elicit the animal sound, then say it together." });
      break;
    case "person":
      push({ key: "ccq.isPerson", type: "yesno", answer: "yes" });
      push({ key: "ccq.isAnimal", type: "yesno", answer: "no" });
      push({ key: "ccq.whereIs", type: "talk", vars: v, note: "Ask: where can we see this person?" });
      break;
    case "food":
      push({ key: "ccq.isFood", type: "yesno", answer: "yes" });
      push({ key: "ccq.canEat", type: "yesno", answer: "yes" });
      if (COLD.has(word.id)) push({ key: "ccq.hotOrCold", type: "choice", optionIds: ["hot", "cold"], correct: 1 });
      else if (HOT.has(word.id)) push({ key: "ccq.hotOrCold", type: "choice", optionIds: ["hot", "cold"], correct: 0 });
      push({ key: "ccq.doYouLike", type: "talk", vars: v });
      break;
    case "drink":
      push({ key: "ccq.canDrink", type: "yesno", answer: "yes" });
      push({ key: "ccq.canEat", type: "yesno", answer: "no" });
      push({ key: "ccq.doYouLike", type: "talk", vars: v });
      break;
    case "body":
      push({ key: "ccq.isBody", type: "yesno", answer: "yes" });
      push({ key: "ccq.canEat", type: "yesno", answer: "no" });
      push({ key: "ccq.pointTo", type: "talk", vars: v, note: "Child touches their own body part." });
      break;
    case "clothes":
      push({ key: "ccq.isClothes", type: "yesno", answer: "yes" });
      push({ key: "ccq.canEat", type: "yesno", answer: "no" });
      push({ key: "ccq.pointTo", type: "talk", vars: v });
      break;
    case "place":
      push({ key: "ccq.isPlace", type: "yesno", answer: "yes" });
      push({ key: "ccq.isFood", type: "yesno", answer: "no" });
      push({ key: "ccq.whereIs", type: "talk", vars: v });
      break;
    case "vehicle":
      push({ key: "ccq.isVehicle", type: "yesno", answer: "yes" });
      push({ key: "ccq.canFly", type: "yesno", answer: FLY.has(word.id) ? "yes" : "no" });
      push({ key: "ccq.whatSound", type: "talk", note: "Vroom / beep / choo — make the sound together." });
      break;
    case "action":
      push({ key: "ccq.isAction", type: "yesno", answer: "yes" });
      push({ key: "say.showme", type: "talk", note: "Total Physical Response — child acts it out." });
      if (SWIM.has(word.id)) push({ key: "ccq.canSwim", type: "yesno", answer: "yes" });
      if (FLY.has(word.id)) push({ key: "ccq.canFly", type: "yesno", answer: "yes" });
      break;
    case "color":
      push({ key: "ccq.isColor", type: "yesno", answer: "yes" });
      push({ key: "ccq.canYouSee", type: "talk", vars: v });
      push({ key: "ccq.pointTo", type: "talk", vars: v, note: "Point to something of this colour in the room." });
      break;
    case "shape":
      push({ key: "ccq.whatIsThis", type: "talk", vars: v });
      push({ key: "ccq.canYouSee", type: "talk", vars: v });
      push({ key: "say.showme", type: "talk", note: "Draw the shape in the air with one finger." });
      break;
    case "number":
      push({ key: "ccq.howMany", type: "talk" });
      push({ key: "ccq.whatIsThis", type: "talk", vars: v });
      break;
    case "letter":
      push({ key: "ccq.whatSound", type: "talk", note: `Letter sound: /${word.sound ?? ""}/` });
      push({ key: "ccq.whatIsThis", type: "talk", vars: v });
      break;
    case "feeling":
      push({ key: "ccq.isHappy", type: "yesno", answer: HAPPY.has(word.id) ? "yes" : "no" });
      push({ key: "say.showme", type: "talk", note: "Make the face!" });
      break;
    case "weather":
      push({ key: "ccq.whatIsThis", type: "talk", vars: v });
      if (COLD.has(word.id)) push({ key: "ccq.hotOrCold", type: "choice", optionIds: ["hot", "cold"], correct: 1 });
      else if (HOT.has(word.id)) push({ key: "ccq.hotOrCold", type: "choice", optionIds: ["hot", "cold"], correct: 0 });
      push({ key: "ccq.canYouSee", type: "talk", vars: v, note: "Look out of the window together." });
      break;
    case "nature":
      push({ key: "ccq.isAnimal", type: "yesno", answer: "no" });
      push({ key: "ccq.whatIsThis", type: "talk", vars: v });
      push({ key: "ccq.canYouSee", type: "talk", vars: v });
      break;
    case "time":
      push({ key: "ccq.whatIsThis", type: "talk", vars: v });
      push({ key: "ccq.doYouLike", type: "talk", vars: v });
      break;
    default:
      push({ key: "ccq.isThing", type: "yesno", answer: "yes" });
      push({ key: "ccq.isFood", type: "yesno", answer: "no" });
      push({ key: "ccq.pointTo", type: "talk", vars: v });
  }

  const sq = sizeQ();
  if (sq) push(sq);
  push({ key: "ccq.doYouLike", type: "talk", vars: v });
  return out.slice(0, 5);
}

/** Repetition + production drill ladder: the tutor clicks through these. */
export function getDrills(word: Word, lang: Lang): Ccq[] {
  const w = label(word, lang);
  const drills: Ccq[] = [
    { key: "say.it3", type: "talk", note: "Choral repetition x3 — fingers count along." },
    { key: "say.loud", type: "talk" },
    { key: "say.quiet", type: "talk" },
    { key: "say.slow", type: "talk" },
    { key: "say.showme", type: "talk" },
    { key: "say.happy", type: "talk" },
    { key: "say.sentence", type: "talk", vars: { s: sentenceFor(word, lang) } },
    { key: "ccq.findInRoom", type: "talk", vars: { w } },
    { key: "say.ask", type: "talk", note: "Role reversal: the child asks the tutor." },
  ];
  return drills;
}
