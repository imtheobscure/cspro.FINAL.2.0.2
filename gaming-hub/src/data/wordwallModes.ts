export type WordwallModeId =
  | "match-up"
  | "find-the-match"
  | "group-sort"
  | "quiz"
  | "open-the-box"
  | "wordsearch"
  | "anagram"
  | "missing-word"
  | "unscramble"
  | "labelled-diagram"
  | "flip-tiles"
  | "flashcards"
  | "rank-order"
  | "true-or-false";

export interface WordwallItem {
  id: string;
  term: string;
  definition: string;
  group: string;
  image: string;
  order: number;
  sentence: string;
  missingWord: string;
  statement: string;
  truth: boolean;
  diagramX: number;
  diagramY: number;
}

export interface WordwallModeSpec {
  id: WordwallModeId;
  name: string;
  emoji: string;
  bgImage: string;
  accent: string;
  short: string;
  logic: string[];
}

export interface WordwallPayload {
  title: string;
  topic: string;
  level: string;
  backgroundImage: string;
  items: WordwallItem[];
}

const img = (id: string) => `https://images.unsplash.com/${id}?w=1200&q=80&auto=format&fit=crop`;

export const WORDWALL_MODES: WordwallModeSpec[] = [
  { id: "match-up", name: "Match Up", emoji: "🔗", bgImage: img("photo-1522202176988-66273c2fd55f"), accent: "from-sky-400 to-blue-700", short: "Drag questions into answer containers, then submit all pairs.", logic: ["Split screen with answer containers above and draggable question cards below.", "Cards snap to containers on drop.", "Submit evaluates all pairs, highlights correct green, shakes and returns incorrect cards."] },
  { id: "find-the-match", name: "Find the Match", emoji: "🎯", bgImage: img("photo-1500530855697-b586d89ba3ee"), accent: "from-emerald-400 to-teal-700", short: "A fixed target and a moving carousel of options.", logic: ["Target stays fixed in the center.", "Options scroll across at speed.", "Tap the matching option for speed points; wrong taps freeze and remove a life."] },
  { id: "group-sort", name: "Group Sort", emoji: "🗂️", bgImage: img("photo-1456324504439-367cee3b3c32"), accent: "from-amber-400 to-orange-700", short: "Sort one item at a time into category baskets.", logic: ["Labeled columns act as sorting zones.", "Drag the current card into a zone or tap a category.", "Items stack inside baskets and can be checked instantly."] },
  { id: "quiz", name: "Quiz", emoji: "❓", bgImage: img("photo-1434030216411-0b793f4b4173"), accent: "from-violet-400 to-purple-800", short: "Formal timed multiple-choice quiz.", logic: ["Question at top, four answer buttons below.", "Per-question countdown locks answers on selection.", "Green/red flash, answer reveal, score saved, auto-advance."] },
  { id: "open-the-box", name: "Open the Box", emoji: "🎁", bgImage: img("photo-1607082349566-187342175e2f"), accent: "from-pink-400 to-rose-700", short: "Tap mystery boxes, reveal mini-questions, clear or fail each box.", logic: ["Grid of sealed boxes.", "Tap triggers 3D flip/open animation.", "Answer the revealed prompt; box becomes green check or red cross."] },
  { id: "wordsearch", name: "Wordsearch", emoji: "🔍", bgImage: img("photo-1455390582262-044cdead277a"), accent: "from-cyan-400 to-blue-700", short: "Find hidden words in a dense letter grid.", logic: ["Letter grid plus word checklist.", "Drag/select letter vectors horizontally, vertically, or diagonally.", "Valid strings lock highlights and cross off checklist words."] },
  { id: "anagram", name: "Anagram", emoji: "🔠", bgImage: img("photo-1516321318423-f06f85e504b3"), accent: "from-fuchsia-400 to-pink-700", short: "Rearrange scrambled letter tiles into a target word.", logic: ["Scrambled individual letters appear as draggable/swap tiles.", "Click two tiles to swap positions.", "The string is evaluated live and wins as soon as it matches."] },
  { id: "missing-word", name: "Missing Word", emoji: "🕳️", bgImage: img("photo-1519389950473-47ba0277781c"), accent: "from-lime-400 to-green-700", short: "Drag word tokens into sentence blanks.", logic: ["Reading passage contains structural gaps.", "Candidate words sit in a bottom tray.", "Submit locks correct words and ejects incorrect tokens."] },
  { id: "unscramble", name: "Unscramble", emoji: "🧩", bgImage: img("photo-1523240795612-9a054b0db644"), accent: "from-orange-300 to-amber-700", short: "Reorder full-word blocks into a sentence.", logic: ["Word blocks sit on a linear track.", "Click or drag blocks to reorder.", "Engine compares final index sequence to master sentence."] },
  { id: "labelled-diagram", name: "Labelled Diagram", emoji: "🏷️", bgImage: img("photo-1513475382585-d06e58bcb0e0"), accent: "from-teal-300 to-emerald-700", short: "Dock text labels onto image coordinate pins.", logic: ["Background image contains fixed coordinate nodes.", "Drag/tap labels to matching nodes.", "Snapping radius locks labels; final verification checks ID match."] },
  { id: "flip-tiles", name: "Flip Tiles", emoji: "🔳", bgImage: img("photo-1610890716171-6b1bb98ffd09"), accent: "from-slate-400 to-slate-900", short: "Flip exploratory two-sided tiles and mark learned/review.", logic: ["Grid of two-sided tiles.", "Click flips 180 degrees to reveal explanation.", "Learner marks tile learned or needs review."] },
  { id: "flashcards", name: "Flashcards", emoji: "🃏", bgImage: img("photo-1457369804613-52c61a468e7d"), accent: "from-blue-300 to-violet-700", short: "Linear flip deck with difficult-card tracking.", logic: ["One prominent card at a time.", "Tap flips prompt/answer; next/previous navigates.", "Viewed and difficult states are recorded for restart/shuffle."] },
  { id: "rank-order", name: "Rank Order", emoji: "📊", bgImage: img("photo-1503676260728-1c00da094a0b"), accent: "from-purple-400 to-indigo-800", short: "Drag items up/down a vertical ladder into correct order.", logic: ["Vertical scale represents order.", "Items shift spacing while moved.", "Check verifies final array against sorted dataset."] },
  { id: "true-or-false", name: "True or False", emoji: "⚖️", bgImage: img("photo-1495020689067-958852a7765e"), accent: "from-red-400 to-blue-700", short: "Fast conveyor statements with True and False buttons.", logic: ["Statements arrive one by one under time pressure.", "Tap True/False or swipe direction.", "Correct builds combo and accelerates; wrong breaks streak."] },
];

export const wordwallModeById = (id: WordwallModeId) => WORDWALL_MODES.find(m => m.id === id) ?? WORDWALL_MODES[0];

export const SAMPLE_WORDWALL_PAYLOAD: WordwallPayload = {
  title: "World Vocabulary Challenge",
  topic: "Nature, Places, and Weather",
  level: "A2-B1",
  backgroundImage: img("photo-1500530855697-b586d89ba3ee"),
  items: [
    { id: "sun", term: "sun", definition: "the star that gives Earth light", group: "Weather", image: img("photo-1507525428034-b723cf961d3e"), order: 1, sentence: "The ___ is very bright today.", missingWord: "sun", statement: "The sun gives Earth light.", truth: true, diagramX: 50, diagramY: 16 },
    { id: "cloud", term: "cloud", definition: "white or gray water vapor in the sky", group: "Weather", image: img("photo-1500534314209-a25ddb2bd429"), order: 2, sentence: "A dark ___ can bring rain.", missingWord: "cloud", statement: "Clouds are usually under the ocean.", truth: false, diagramX: 36, diagramY: 26 },
    { id: "river", term: "river", definition: "a long natural stream of water", group: "Nature", image: img("photo-1500530855697-b586d89ba3ee"), order: 3, sentence: "The ___ flows through the valley.", missingWord: "river", statement: "A river is a natural stream of water.", truth: true, diagramX: 44, diagramY: 72 },
    { id: "mountain", term: "mountain", definition: "a very high area of land", group: "Nature", image: img("photo-1464822759023-fed622ff2c3b"), order: 4, sentence: "We climbed the ___ slowly.", missingWord: "mountain", statement: "A mountain is usually flat and low.", truth: false, diagramX: 58, diagramY: 42 },
    { id: "forest", term: "forest", definition: "a large area covered with trees", group: "Nature", image: img("photo-1448375240586-882707db888b"), order: 5, sentence: "Many animals live in the ___.", missingWord: "forest", statement: "A forest has many trees.", truth: true, diagramX: 24, diagramY: 61 },
    { id: "city", term: "city", definition: "a large town with many buildings", group: "Places", image: img("photo-1449824913935-59a10b8d2000"), order: 6, sentence: "The ___ has tall buildings.", missingWord: "city", statement: "A city is always empty and quiet.", truth: false, diagramX: 74, diagramY: 67 },
    { id: "desert", term: "desert", definition: "a very dry place with little rain", group: "Places", image: img("photo-1509316785289-025f5b846b35"), order: 7, sentence: "The ___ is hot and dry.", missingWord: "desert", statement: "A desert usually has little rain.", truth: true, diagramX: 70, diagramY: 80 },
    { id: "ocean", term: "ocean", definition: "a huge body of salt water", group: "Places", image: img("photo-1507525428034-b723cf961d3e"), order: 8, sentence: "The ___ covers much of Earth.", missingWord: "ocean", statement: "The ocean is made of salt water.", truth: true, diagramX: 28, diagramY: 84 },
  ],
};
