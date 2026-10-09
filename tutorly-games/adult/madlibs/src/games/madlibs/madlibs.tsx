// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  TUTORLY MADLIBS – SUPER PREMIUM 3D EDUCATIONAL GAME (SINGLE FILE VERSION)
//  All-in-one: Component + Data + CSS + JSON Import System
//  Perfect for screen sharing in online language classes
// ═══════════════════════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  Sparkles, Users, RotateCcw, ChevronRight, ChevronLeft,
  Star, MessageCircle, Shuffle, Target, BookOpen, Check, ThumbsUp,
  ThumbsDown, Flame, Heart, Eye, AlertCircle, Play, Upload, Copy,
  FileJson, GraduationCap, Globe, Palette, Layers, X,
  Volume2, Square, Download, FileText,
  Timer, Trophy, Brain, GitBranch, BookMarked, Zap,
} from "lucide-react";

// ── game modules ─────────────────────────────────────────────────────────────
// Types, the grammar coach + adaptive difficulty, the branching engine and all
// localStorage work live in their own files: the component owns the screens and
// the lesson state, those own the rules.
import { branchesFor, fillBeat } from "./branches";
import {
  adaptLevel, coachAnswer, difficultyLabel, hidesSuggestions, initialDifficulty,
  recordAnswer, suggestionLimit, weakSpotSummary,
  type CoachNote, type DifficultyState,
} from "./grammar";
import {
  clearSession, collectWords, dueVocab, loadSession, loadVocab, masteredCount,
  reviewWord, saveSession, saveVocab, vocabCsv,
  type SavedSession, type VocabWord,
} from "./storage";
import type { Blank, Branch, CommentEntry, GamePhase, Payload, Player, StoryBeat, Template } from "./types";

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  INLINE CSS STYLES (injected into document head)
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const INLINE_STYLES = `

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  font-family: 'Nunito', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  margin: 0;
  padding: 0;
}
.font-nunito { font-family: 'Nunito', system-ui, sans-serif; }

/* 3D Card effects */
.perspective { perspective: 1000px; }
.card-3d {
  transform-style: preserve-3d;
  transition: transform 0.4s ease;
}
.card-3d:hover {
  transform: rotateY(3deg) rotateX(-2deg) translateZ(6px);
}

/* Glow effects */
.glow-violet { box-shadow: 0 0 30px rgba(139, 92, 246, 0.35), 0 8px 32px rgba(139, 92, 246, 0.2); }
.glow-amber { box-shadow: 0 0 30px rgba(251, 191, 36, 0.35), 0 8px 32px rgba(251, 191, 36, 0.2); }
.glow-pink { box-shadow: 0 0 30px rgba(236, 72, 153, 0.35), 0 8px 32px rgba(236, 72, 153, 0.2); }

/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 99px; }
::-webkit-scrollbar-thumb { background: #c4b5fd; border-radius: 99px; }
::-webkit-scrollbar-thumb:hover { background: #8b5cf6; }

/* Animations */
@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.animated-gradient {
  background: linear-gradient(270deg, #ede9fe, #fdf4ff, #f0f9ff, #fef9c3);
  background-size: 400% 400%;
  animation: gradient-shift 12s ease infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%) skewX(-15deg); }
  100% { transform: translateX(200%) skewX(-15deg); }
}
.shimmer::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  animation: shimmer 2.5s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}
.float { animation: float 3s ease-in-out infinite; }

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 10px rgba(139,92,246,0.3); }
  50% { box-shadow: 0 0 30px rgba(139,92,246,0.7), 0 0 60px rgba(139,92,246,0.3); }
}
.pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
`;

// Inject styles on load
if (typeof document !== "undefined") {
  const styleId = "tutorly-madlibs-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = INLINE_STYLES;
    document.head.appendChild(style);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════════════════════
type ThemeKey = 
  | "fantasy" | "mystery" | "historical" | "post-apocalyptic" | "noir" 
  | "fairy-tale" | "mythology" | "slice-of-life" | "sports" | "holiday"
  | "dream-surreal" | "time-travel" | "japanese-anime" | "custom";

// MoodKey options: "hilarious" | "gloomy" | "epic" | "satirical" | "romantic" | "absurd"

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  THEME & MOOD CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const THEMES: Record<ThemeKey, { emoji: string; label: string; color: string; desc: string }> = {
  "fantasy":          { emoji: "🐉", label: "Fantasy",          color: "from-purple-500 to-indigo-600",   desc: "Dragons, wizards, magical kingdoms, Harry Potter vibes" },
  "mystery":          { emoji: "🔍", label: "Mystery",          color: "from-slate-600 to-zinc-800",      desc: "Detectives, clues, hidden treasures, whodunits" },
  "historical":       { emoji: "🏛️", label: "Historical",       color: "from-amber-600 to-yellow-700",    desc: "Ancient Rome, knights, samurai, bygone eras" },
  "post-apocalyptic": { emoji: "☢️", label: "Post-Apocalyptic", color: "from-orange-600 to-red-700",      desc: "Wastelands, mutants, survival, Mad Max style" },
  "noir":             { emoji: "🚬", label: "Noir",             color: "from-gray-700 to-slate-900",      desc: "Dark alleys, femme fatale, rain-soaked streets" },
  "fairy-tale":       { emoji: "👸", label: "Fairy Tale",       color: "from-pink-400 to-rose-500",       desc: "Princesses, wolves, enchanted forests, happily ever after" },
  "mythology":        { emoji: "⚡", label: "Mythology",        color: "from-amber-500 to-orange-600",    desc: "Greek gods, Norse legends, epic monsters" },
  "slice-of-life":    { emoji: "☕", label: "Slice of Life",    color: "from-green-500 to-emerald-600",   desc: "School, office, family dinner, everyday moments" },
  "sports":           { emoji: "🏆", label: "Sports",           color: "from-blue-500 to-cyan-600",       desc: "Underdog teams, championship games, training montages" },
  "holiday":          { emoji: "🎄", label: "Holiday",          color: "from-red-500 to-green-600",       desc: "Christmas, Halloween, birthday chaos, celebrations" },
  "dream-surreal":    { emoji: "🌙", label: "Dream / Surreal",  color: "from-violet-500 to-purple-600",   desc: "Floating cities, talking animals, impossible physics" },
  "time-travel":      { emoji: "⏰", label: "Time Travel",      color: "from-cyan-500 to-blue-600",       desc: "Paradoxes, past/future jumps, flux capacitors" },
  "japanese-anime":   { emoji: "🎌", label: "Japanese Anime",   color: "from-pink-500 to-violet-600",     desc: "High school drama, magical girls, mecha battles" },
  "custom":           { emoji: "🤖", label: "AI Custom",        color: "from-emerald-500 to-teal-600",    desc: "AI-generated based on your lesson and learner" },
};

// Available moods for reference (used in template tagging)
// hilarious: 😂 Fun & Hilarious - Maximum comedy
// gloomy: 💀 Gloomy & Dark - Dramatic tension
// epic: ⚔️ Epic & Heroic - Grand adventures
// satirical: 🎭 Satirical & Ironic - Social commentary
// romantic: 💕 Romantic & Sweet - Love stories
// absurd: 🤪 Absurd & Surreal - Nonsensical logic

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  ABSURD WORD BANKS (for the chaos button)
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const ABSURD_WORDS: Record<string, string[]> = {
  noun:        ["pickle", "spatula", "kumquat", "stapler", "accordion", "penguin", "trampoline", "waffle", "turboencabulator", "existential crisis"],
  verb:        ["yodeled", "slithered", "photosynthesized", "moonwalked", "sneezed", "obliterated", "vibed", "yeeted", "transcended"],
  adjective:   ["fluorescent", "suspiciously moist", "aggressively beige", "philosophically confused", "radioactive", "sentient", "crunchy"],
  place:       ["inside a waffle", "on the Moon's parking lot", "in a giant sock drawer", "between two bagels", "inside a whale's nostril"],
  person:      ["Lord Picklesworth", "Madame Baguette", "Sir Fluffington III", "Chef Noodles", "Captain Chaos", "Professor Wobble"],
  animal:      ["sentient burrito", "disco octopus", "time-traveling hamster", "judgmental pigeon", "philosophical shrimp"],
  food:        ["existential croissant", "crying taco", "regretful meatball", "philosophical dumpling", "anxious spaghetti"],
  emotion:     ["aggressively optimistic", "mildly bewildered", "cosmically confused", "chaotically neutral", "suspiciously happy"],
  number:      ["47", "1,000,000", "negative three", "∞", "approximately seven-ish", "enough", "π"],
  color:       ["radioactive chartreuse", "invisible beige", "aggressive mauve", "existential purple", "screaming yellow"],
  exclamation: ["YEET!", "By the sacred pickle!", "Great googly moogly!", "Holy enchiladas!", "What in tarnation?!"],
  adverb:      ["aggressively", "suspiciously", "philosophically", "chaotically", "reluctantly", "enthusiastically"],
  default:     ["banana", "turboencabulator", "wobble", "glorp", "snazzle", "flibbertigibbet"],
};

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  FAKE COMMENTERS & REACTION TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const FAKE_COMMENTERS = [
  { name: "CoolKid99",      avatar: "😎", delay: 0.4 },
  { name: "TeacherPet",     avatar: "🤓", delay: 0.9 },
  { name: "LaughingHyena",  avatar: "😂", delay: 1.5 },
  { name: "SilentObserver", avatar: "👀", delay: 2.1 },
  { name: "DramaQueen",     avatar: "😱", delay: 2.7 },
  { name: "PhilosophyBro",  avatar: "🧐", delay: 3.2 },
  { name: "MemeLord",       avatar: "🐸", delay: 3.8 },
  { name: "GrammarNazi",    avatar: "📚", delay: 4.3 },
  { name: "ChaosGoblin",    avatar: "👺", delay: 4.9 },
  { name: "Lurker2000",     avatar: "🕵️", delay: 5.5 },
];

const COMMENT_TEMPLATES = [
  (_s: string, word: string) => `💀 "${word}"?! I physically cannot.`,
  (_s: string, word: string) => `bro said "${word}" with his whole chest 💅`,
  (_s: string, word: string) => `the "${word}" part sent me to another dimension 🚀`,
  (_s: string, _w: string) => `I'm calling my lawyer after reading this 😭`,
  (_s: string, _w: string) => `this story is now officially cursed. you're welcome.`,
  (_s: string, word: string) => `"${word}" ???? I need to lie down 🛋️`,
  (_s: string, _w: string) => `historians will study this. not in a good way.`,
  (_s: string, word: string) => `the fact that "${word}" fit perfectly is ALARMING 🚨`,
  (_s: string, _w: string) => `I showed this to my cat. she left the room.`,
  (_s: string, _w: string) => `*slaps table* AGAIN! READ IT AGAIN!`,
  (_s: string, _w: string) => `Shakespeare is spinning in his grave rn 💀`,
  (_s: string, word: string) => `"${word}" is doing HEAVY lifting in this sentence 🏋️`,
  (_s: string, _w: string) => `I am simultaneously horrified and delighted`,
  (_s: string, _w: string) => `this is getting sent to the group chat immediately`,
  (_s: string, _w: string) => `nobody: \nthis story: *exists*\nme: 💀💀💀`,
];

const VOTE_REACTIONS = ["😂", "💀", "🔥", "😭", "👑", "🤯", "💅", "🤌"];

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  DEFAULT DEMO PLAYERS
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const DEMO_PLAYERS: Player[] = [
  { id: "p1", name: "Alice" },
  { id: "p2", name: "Bob" },
  { id: "p3", name: "Carlos" },
  { id: "p4", name: "Diana" },
];

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  MASSIVE TEMPLATE DATABASE - ALL THEMES × ALL MOODS
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const TEMPLATE_DATABASE: Template[] = [
  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // 🐉 FANTASY THEME
  // ─────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "fantasy-hilarious-1",
    theme: "🐉 Fantasy",
    mood: "😂 Hilarious",
    cefrLevel: "B1",
    title: "The World's Worst Wizard",
    templateText: `In the magical kingdom of {1}, there lived a wizard named {2} who was famous for being absolutely {3} at magic.

One day, the king demanded that {2} cast a {4} spell to defeat the dragon terrorizing the village. Instead, the wizard accidentally turned the dragon into a giant {5}!

"What have you done?!" screamed the king, watching the {5} {6} through the castle gardens.

{2} tried to fix it by waving their {7} wand, but this only made things worse – now the {5} could also {8} and speak {9}!

The villagers weren't even mad anymore. They started {10} and charging tourists {11} gold coins to see the famous "{12} Dragon of {1}."

The wizard was awarded the title of "{13}" and given a lifetime supply of {14}.`,
    blanks: [
      { id: "1", label: "Fantasy Kingdom Name", type: "place", suggestions: ["Fluffington", "Pickle-upon-Avon", "Waffleshire", "Noodleland"] },
      { id: "2", label: "Wizard Name", type: "person", suggestions: ["Gandalf's Cousin Gary", "Merlin Jr.", "Dave the Adequate", "Sir Oopsie"] },
      { id: "3", label: "Adjective (skill level)", type: "adjective", suggestions: ["terrible", "hilariously bad", "catastrophically awful", "impressively incompetent"] },
      { id: "4", label: "Type of Spell", type: "adjective", suggestions: ["powerful", "destructive", "ancient", "forbidden"] },
      { id: "5", label: "Funny Animal/Thing", type: "animal", suggestions: ["rubber duck", "corgi", "giant chicken", "disco ball"] },
      { id: "6", label: "Verb (-ing)", type: "verb", suggestions: ["waddling", "moonwalking", "breakdancing", "yodeling"] },
      { id: "7", label: "Material", type: "adjective", suggestions: ["sparkly", "soggy", "suspiciously sticky", "slightly melted"] },
      { id: "8", label: "Verb (ability)", type: "verb", suggestions: ["juggle", "do taxes", "play the accordion", "make sourdough"] },
      { id: "9", label: "Language", type: "noun", suggestions: ["fluent sarcasm", "ancient meme", "passive-aggressive Post-it notes", "interpretive dance"] },
      { id: "10", label: "Verb (-ing)", type: "verb", suggestions: ["celebrating", "selling merchandise", "taking selfies", "starting a fan club"] },
      { id: "11", label: "Number", type: "number", suggestions: ["69", "420", "3.50", "a bajillion"] },
      { id: "12", label: "Adjective", type: "adjective", suggestions: ["Magnificent", "Majestic", "Mildly Concerning", "Absolutely Unhinged"] },
      { id: "13", label: "Funny Title", type: "noun", suggestions: ["Royal Disaster", "Chaos Wizard Supreme", "Professional Accident", "The Chosen Mess"] },
      { id: "14", label: "Random Food", type: "food", suggestions: ["cheese wheels", "magic mushrooms (legal ones)", "enchanted tacos", "dragon-shaped gummies"] },
    ],
    reflectionQuestions: [
      "Find all the PAST TENSE verbs in this story. Can you change them to present tense?",
      "What CONDITIONAL would you use? 'If the wizard HAD practiced more, he....'",
      "Identify 3 ADJECTIVE + NOUN combinations. Create your own funny ones!",
      "Rewrite the king's dialogue using REPORTED SPEECH.",
      "What MODAL VERBS could describe the wizard's abilities? (could, should, might...)",
    ],
    normalEnding: `Eventually, {2} learned to control their magic. The {5}-dragon became the kingdom's beloved mascot, and {1} became famous for its unusual approach to problem-solving. Some say it was the greatest accident in magical history.`,
    absurdEnding: `The {5}-dragon ran for mayor of {1} and won by a landslide. {2} became its campaign manager, and together they legalized {8}ing in public spaces. The king retired to become a {14} food critic. Nobody questioned any of this.`,
  },
  {
    id: "fantasy-gloomy-1",
    theme: "🐉 Fantasy",
    mood: "💀 Gloomy",
    cefrLevel: "B2",
    title: "The Last Light of Eldoria",
    templateText: `The ancient kingdom of {1} had been dying for {2} years. Its once-{3} towers now crumbled into {4} dust.

In the throne room, the elderly wizard {5} stared at the {6} crystal – the only thing keeping the darkness at bay. It flickered {7}, like a candle in a storm.

"We have {8} days left," they whispered to the {9} knight beside them. "After that, the {10} will consume everything."

The knight, whose name was {11}, gripped their {12} sword tightly. "Then I will journey to the {13} Mountains and find the {14}. It's our only hope."

{5} shook their head {15}. "Many have tried. None have returned. The path is guarded by {16}, and the mountain itself {17}."

But {11} had already made their decision. As they walked toward the {18} gates, they didn't look back. Some quests require everything you have – and everything you are.`,
    blanks: [
      { id: "1", label: "Kingdom Name", type: "place", suggestions: ["Eldoria", "Shadowmere", "The Dying Lands", "Ashenfell"] },
      { id: "2", label: "Number (years)", type: "number", suggestions: ["a thousand", "countless", "three hundred", "too many"] },
      { id: "3", label: "Adjective (past glory)", type: "adjective", suggestions: ["magnificent", "gleaming", "proud", "invincible"] },
      { id: "4", label: "Adjective (decay)", type: "adjective", suggestions: ["grey", "forgotten", "cold", "bitter"] },
      { id: "5", label: "Wizard Name", type: "person", suggestions: ["Aldric the Grey", "Morwen", "The Last Keeper", "Seraphina"] },
      { id: "6", label: "Adjective (crystal)", type: "adjective", suggestions: ["dying", "ancient", "sacred", "cracked"] },
      { id: "7", label: "Adverb", type: "adverb", suggestions: ["weakly", "desperately", "hopelessly", "faintly"] },
      { id: "8", label: "Small Number", type: "number", suggestions: ["three", "seven", "twelve", "mere hours"] },
      { id: "9", label: "Adjective (knight)", type: "adjective", suggestions: ["weary", "determined", "scarred", "silent"] },
      { id: "10", label: "Dark Force", type: "noun", suggestions: ["shadow", "void", "eternal night", "forgotten ones"] },
      { id: "11", label: "Knight Name", type: "person", suggestions: ["Kira", "Marcus", "The Nameless One", "Ashara"] },
      { id: "12", label: "Adjective (sword)", type: "adjective", suggestions: ["father's", "broken", "legendary", "rusted"] },
      { id: "13", label: "Adjective (mountains)", type: "adjective", suggestions: ["Forbidden", "Weeping", "Black", "Endless"] },
      { id: "14", label: "Magical Item", type: "noun", suggestions: ["Heart of Light", "Last Flame", "Tear of the Sun", "Forgotten Relic"] },
      { id: "15", label: "Adverb (sadly)", type: "adverb", suggestions: ["solemnly", "gravely", "with tears", "knowing the truth"] },
      { id: "16", label: "Monsters", type: "noun", suggestions: ["shadow beasts", "the dead", "nightmares made flesh", "fallen heroes"] },
      { id: "17", label: "Verb (danger)", type: "verb", suggestions: ["hungers for souls", "drives travelers mad", "erases memories", "never forgives"] },
      { id: "18", label: "Adjective (gates)", type: "adjective", suggestions: ["crumbling", "ancient", "iron", "final"] },
    ],
    reflectionQuestions: [
      "This story uses PAST PERFECT tense ('had been dying'). Find other examples and explain why.",
      "Identify the METAPHORS. What does 'a candle in a storm' represent?",
      "How does the author create a GLOOMY ATMOSPHERE? List specific words and techniques.",
      "Change the DIRECT SPEECH to INDIRECT SPEECH.",
      "Write an alternative ending using CONDITIONAL sentences (If they had..., they would have...).",
    ],
    normalEnding: `After {8} days of treacherous journey, {11} reached the {13} Mountains. The {14} was real. With trembling hands, they grasped it – and light flooded back into the world. {1} would live. But {11} never returned home; some victories cost everything.`,
    absurdEnding: `{11} got halfway up the mountain before realizing they'd forgotten the map. The {16} turned out to be surprisingly friendly and gave directions. The {14} was actually just a really nice lamp from IKEA. {1} was saved, but nobody felt particularly heroic about it.`,
  },
  {
    id: "fantasy-epic-1",
    theme: "🐉 Fantasy",
    mood: "⚔️ Epic",
    cefrLevel: "B2",
    title: "The Battle of the Seven Flames",
    templateText: `The prophecy spoke of {1} – the one who would wield the {2} Blade and unite the {3} kingdoms against the {4} Army.

{1} stood atop the {5} cliff, watching {6} thousand enemy soldiers march toward the last free city of {7}. The wind howled {8}, carrying the sound of war drums.

"Today we fight not for glory," {1} shouted to the {9} warriors behind them, "but for every {10} who cannot fight! For every {11} we have lost! For {7}!"

The soldiers raised their {12} weapons and roared so loudly that even the {4} Army hesitated.

When {1} charged forward, the {2} Blade blazed with {13} light. Each strike was like {14}, each battle cry echoed across {15}.

Historians would later call it "The Battle of the Seven Flames" – the day when {1} proved that {16} could never be conquered by {17}.`,
    blanks: [
      { id: "1", label: "Hero Name", type: "person", suggestions: ["Valorian", "Astrid Firebrand", "The Chosen One", "Commander Theron"] },
      { id: "2", label: "Legendary (adjective)", type: "adjective", suggestions: ["Phoenix", "Dawn", "Starfire", "Titan"] },
      { id: "3", label: "Number", type: "number", suggestions: ["seven", "twelve", "five", "countless"] },
      { id: "4", label: "Evil (adjective)", type: "adjective", suggestions: ["Shadow", "Crimson", "Doom", "Dread"] },
      { id: "5", label: "Adjective (cliff)", type: "adjective", suggestions: ["ancient", "storm-beaten", "sacred", "final"] },
      { id: "6", label: "Large Number", type: "number", suggestions: ["fifty", "a hundred", "ten thousand", "countless"] },
      { id: "7", label: "City Name", type: "place", suggestions: ["Luminara", "The Last Haven", "Solara", "Everhold"] },
      { id: "8", label: "Adverb", type: "adverb", suggestions: ["fiercely", "ominously", "defiantly", "eternally"] },
      { id: "9", label: "Adjective (warriors)", type: "adjective", suggestions: ["brave", "battle-hardened", "legendary", "undying"] },
      { id: "10", label: "Innocent Group", type: "noun", suggestions: ["child", "elder", "innocent soul", "dreamer"] },
      { id: "11", label: "Lost Thing", type: "noun", suggestions: ["hero", "loved one", "home", "generation"] },
      { id: "12", label: "Adjective (weapons)", type: "adjective", suggestions: ["gleaming", "ancestral", "enchanted", "blood-sworn"] },
      { id: "13", label: "Color", type: "color", suggestions: ["golden", "blazing white", "prismatic", "blinding"] },
      { id: "14", label: "Powerful Thing", type: "noun", suggestions: ["thunder", "divine judgment", "a falling star", "destiny itself"] },
      { id: "15", label: "Large Area", type: "place", suggestions: ["the entire realm", "history", "the heavens themselves", "eternity"] },
      { id: "16", label: "Virtue", type: "noun", suggestions: ["hope", "courage", "the human spirit", "freedom"] },
      { id: "17", label: "Dark Concept", type: "noun", suggestions: ["fear", "darkness", "tyranny", "despair"] },
    ],
    reflectionQuestions: [
      "This is EPIC STYLE writing. What features make it feel grand and heroic? List at least 5.",
      "Find all the SUPERLATIVES and explain their effect on the reader.",
      "Convert the hero's speech to REPORTED SPEECH while keeping the emotion.",
      "Identify PERSONIFICATION (giving human qualities to non-human things).",
      "Write your own BATTLE CRY using the same grammatical structures!",
    ],
    normalEnding: `The battle raged until sunset. When the {4} Army finally retreated, {1} planted the {2} Blade in the ground and knelt. {7} was saved. The {3} kingdoms would remember this day forever – and {1}'s name would be carved into every monument across the realm.`,
    absurdEnding: `Halfway through the battle, both armies got confused about who was fighting whom. {1} accidentally became best friends with the enemy general over a shared love of {12} weapons. They opened a museum together. The {2} Blade became a tourist attraction with a gift shop.`,
  },

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // 🔍 MYSTERY THEME
  // ─────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "mystery-hilarious-1",
    theme: "🔍 Mystery",
    mood: "😂 Hilarious",
    cefrLevel: "B1",
    title: "The Case of the Missing Sandwich",
    templateText: `Detective {1} adjusted their {2} hat and stared at the crime scene: an empty plate where the legendary {3} Sandwich had once been.

"This is the most {4} case I've ever seen," they muttered, pulling out a {5} magnifying glass.

The suspects were lined up: {6}, the {7} butler; {8}, the suspiciously {9} chef; and a {10} named {11} who had no alibi.

"Where were you at {12} o'clock?" demanded Detective {1}.

The butler started {13} nervously. The chef began {14}. The {10} just stared {15} into the distance.

Finally, {1} noticed a single {16} crumb leading toward the {17}. Following the trail, they discovered the sandwich thief was... {18}!

"You would have gotten away with it," {1} declared, "if not for your {19} obsession with {20}!"`,
    blanks: [
      { id: "1", label: "Detective Name", type: "person", suggestions: ["Sherlock Homeboy", "Nancy Drool", "Inspector Gadget's Cousin", "Detective Snackson"] },
      { id: "2", label: "Adjective (hat)", type: "adjective", suggestions: ["ridiculously tiny", "oversized", "sparkly", "sentient"] },
      { id: "3", label: "Adjective (sandwich)", type: "adjective", suggestions: ["Ultimate", "Legendary", "World-Famous", "Suspiciously Expensive"] },
      { id: "4", label: "Adjective (serious)", type: "adjective", suggestions: ["serious", "baffling", "delicious-sounding", "dramatically unnecessary"] },
      { id: "5", label: "Adjective (magnifying glass)", type: "adjective", suggestions: ["comically large", "bedazzled", "slightly cracked", "probably haunted"] },
      { id: "6", label: "Butler Name", type: "person", suggestions: ["Jeeves", "Reginald", "Sir Butles McButlerface", "Greg"] },
      { id: "7", label: "Adjective (butler)", type: "adjective", suggestions: ["suspicious", "overly formal", "clearly guilty-looking", "mustached"] },
      { id: "8", label: "Chef Name", type: "person", suggestions: ["Chef Boyardee Jr.", "Gordon Ramsey's Rival", "Chef Suspicious", "Julio"] },
      { id: "9", label: "Adjective (chef)", type: "adjective", suggestions: ["sweaty", "nervous", "definitely hiding something", "covered in crumbs"] },
      { id: "10", label: "Animal", type: "animal", suggestions: ["cat", "parrot", "goldfish", "emotionally complex hamster"] },
      { id: "11", label: "Pet Name", type: "person", suggestions: ["Mr. Whiskers", "Sir Chomps-a-Lot", "The Usual Suspect", "Steve"] },
      { id: "12", label: "Time", type: "number", suggestions: ["3:47", "lunch", "snack", "midnight"] },
      { id: "13", label: "Nervous Action", type: "verb", suggestions: ["sweating profusely", "whistling suspiciously", "doing jazz hands", "speaking in French"] },
      { id: "14", label: "Nervous Action 2", type: "verb", suggestions: ["crying into a soufflé", "blaming the ingredients", "praying to the cooking gods", "stress-baking"] },
      { id: "15", label: "Adverb", type: "adverb", suggestions: ["menacingly", "philosophically", "judgmentally", "hungrily"] },
      { id: "16", label: "Food Item", type: "food", suggestions: ["mayonnaise", "pickle", "mystery sauce", "glitter (edible)"] },
      { id: "17", label: "Location", type: "place", suggestions: ["basement", "secret room", "someone's mouth", "interdimensional portal"] },
      { id: "18", label: "Unexpected Thief", type: "person", suggestions: ["the detective's own stomach", "the ghost of sandwiches past", "a very sneaky plant", "the narrator"] },
      { id: "19", label: "Adjective", type: "adjective", suggestions: ["uncontrollable", "chaotic", "suspiciously specific", "Instagram-worthy"] },
      { id: "20", label: "Food/Hobby", type: "noun", suggestions: ["carbs", "attention", "being dramatically caught", "sandwich-based crimes"] },
    ],
    reflectionQuestions: [
      "Identify all PAST CONTINUOUS verbs ('was/were + -ing'). Why does the author use this tense for actions?",
      "Find 5 ADJECTIVE + NOUN combinations that create humor. Why are they funny?",
      "Convert the detective's question to INDIRECT SPEECH: 'The detective asked where they had been at...'",
      "This story uses WOULD HAVE for past conditionals. Create 3 more examples!",
      "List all the PHRASAL VERBS you can find and explain their meanings.",
    ],
    normalEnding: `The mystery was solved. {18} was sentenced to two weeks without {20}, which everyone agreed was fair. Detective {1} received a medal and, most importantly, a replacement {3} Sandwich. Justice (and lunch) was served.`,
    absurdEnding: `Plot twist: the sandwich was never real. It was a shared hallucination caused by extreme hunger. Everyone in the mansion had been fasting for a reality TV show that nobody remembered signing up for. {1} retired from detective work to open a sandwich shop. The {10} became the mascot.`,
  },
  {
    id: "mystery-noir-1",
    theme: "🔍 Mystery",
    mood: "💀 Gloomy",
    cefrLevel: "C1",
    title: "Shadows Don't Forget",
    templateText: `The rain hadn't stopped in {1} days. Neither had my {2}.

I'm {3}, and this city owes me answers. Somebody killed {4} – the only {5} person left in this whole {6} town. And I was going to find out who.

The trail led me to the {7} Club, where a {8} named {9} sang songs about {10} and broken promises. She knew something. They always do.

"You're asking {11} questions, detective," she whispered, her voice like {12}.

"I specialize in {11} questions," I replied, lighting a {13} cigarette. "Tell me about the night {4} died."

Her eyes went {14}. "Some truths are buried for a reason. Dig them up, and you might find your own {15} waiting."

I left the club with more questions than answers. The rain kept falling. It always does in this city – like the sky itself is trying to {16} what we've all {17}.`,
    blanks: [
      { id: "1", label: "Number (days)", type: "number", suggestions: ["seven", "too many", "forty", "endless"] },
      { id: "2", label: "Negative Feeling", type: "noun", suggestions: ["headache", "suspicion", "guilt", "insomnia"] },
      { id: "3", label: "Detective Name", type: "person", suggestions: ["Jack Marlowe", "Sam Nightingale", "Vera Shadows", "Detective Nobody"] },
      { id: "4", label: "Victim Name", type: "person", suggestions: ["Maria Chen", "The Mayor", "Father Thomas", "Lily Graves"] },
      { id: "5", label: "Adjective (positive)", type: "adjective", suggestions: ["decent", "honest", "innocent", "untouchable"] },
      { id: "6", label: "Adjective (town)", type: "adjective", suggestions: ["godforsaken", "corrupt", "dying", "forgotten"] },
      { id: "7", label: "Adjective (club)", type: "adjective", suggestions: ["Blue Moon", "Velvet Shadow", "Last Chance", "Broken Heart"] },
      { id: "8", label: "Occupation", type: "noun", suggestions: ["singer", "dancer", "bartender", "ghost from my past"] },
      { id: "9", label: "Femme Fatale Name", type: "person", suggestions: ["Veronica Lake", "Isabella Noir", "Ruby Crimson", "The Woman with No Name"] },
      { id: "10", label: "Sad Topic", type: "noun", suggestions: ["lost love", "betrayal", "yesterday", "everything we can't have"] },
      { id: "11", label: "Adjective (questions)", type: "adjective", suggestions: ["dangerous", "the wrong", "deadly", "expensive"] },
      { id: "12", label: "Simile (voice)", type: "noun", suggestions: ["whiskey and regret", "smoke and secrets", "silk hiding a blade", "a funeral in spring"] },
      { id: "13", label: "Adjective (cigarette)", type: "adjective", suggestions: ["second-to-last", "bitter", "cheap", "borrowed"] },
      { id: "14", label: "Adjective (eyes)", type: "adjective", suggestions: ["dark", "hollow", "distant", "haunted"] },
      { id: "15", label: "Dark Thing", type: "noun", suggestions: ["grave", "ghost", "past", "end"] },
      { id: "16", label: "Verb", type: "verb", suggestions: ["wash away", "forget", "bury", "mourn"] },
      { id: "17", label: "Past Participle (negative)", type: "verb", suggestions: ["done", "become", "buried", "forgotten"] },
    ],
    reflectionQuestions: [
      "NOIR STYLE uses specific techniques: short sentences, first-person narration, metaphors. Find 3 examples of each.",
      "Identify all the SIMILES and METAPHORS. What do they reveal about the narrator's mindset?",
      "The narrator uses PRESENT TENSE even for past events. Why? How does this affect the mood?",
      "Find examples of PERSONIFICATION (rain, sky, city). What emotions do they convey?",
      "Write a continuation using the SAME STYLE. Include at least 2 metaphors and 1 internal monologue.",
    ],
    normalEnding: `Three days later, I had my answer. It wasn't pretty. It never is. {4}'s killer was the last person anyone would suspect – including me. When I finally confronted them at the {7} Club, they didn't even deny it. "You can't prove anything," they said. They were wrong. I always am.`,
    absurdEnding: `Turns out {4} wasn't actually dead. They'd faked their death to avoid paying their {7} Club bar tab, which had accumulated to approximately {1} thousand dollars. The entire mystery was just an elaborate way to avoid a {13} cigarette debt. I didn't even get paid. I never do.`,
  },

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // 🏛️ HISTORICAL THEME
  // ─────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "historical-hilarious-1",
    theme: "🏛️ Historical",
    mood: "😂 Hilarious",
    cefrLevel: "B1",
    title: "Julius Caesar's Very Bad Day",
    templateText: `The year was {1} BC, and Julius Caesar was having a {2} day.

First, his {3} toga got stuck in a {4}. Then, his favorite senator {5} started a rumor that Caesar secretly collected {6}.

"By Jupiter's {7}!" Caesar exclaimed, "Can a Roman emperor not enjoy a simple {8} without being judged?"

His advisor Brutus approached {9}. "My lord, the Senate is waiting. They wish to discuss the new {10} tax."

"Another tax?" Caesar sighed. "Fine. But I'm bringing my pet {11} named {12} for emotional support."

The Senate meeting was a disaster. {12} ate someone's {13}, three senators started {14}, and Caesar accidentally declared war on {15} instead of approving the budget.

"I should have stayed in {16}," Caesar muttered, as Brutus {17} behind him.

The Ides of March were only {18} days away. Things were about to get {19}.`,
    blanks: [
      { id: "1", label: "Year", type: "number", suggestions: ["44", "100", "69", "420"] },
      { id: "2", label: "Adjective", type: "adjective", suggestions: ["terrible", "chaotic", "historically significant", "cursed"] },
      { id: "3", label: "Adjective (toga)", type: "adjective", suggestions: ["favorite", "only clean", "designer", "recently-washed"] },
      { id: "4", label: "Object", type: "noun", suggestions: ["chariot wheel", "column", "senator's beard", "aggressive fountain"] },
      { id: "5", label: "Senator Name", type: "person", suggestions: ["Gossipus Maximus", "Dramatius", "Senator Karen", "Brutus's cousin twice removed"] },
      { id: "6", label: "Unusual Collection", type: "noun", suggestions: ["decorative spoons", "cat memes (paintings)", "tiny gladiator figurines", "pressed leaves"] },
      { id: "7", label: "Body Part", type: "noun", suggestions: ["beard", "thunder thighs", "magnificent eyebrows", "sandal"] },
      { id: "8", label: "Activity", type: "noun", suggestions: ["bath", "conquest", "afternoon nap", "existential crisis"] },
      { id: "9", label: "Adverb", type: "adverb", suggestions: ["suspiciously", "nervously", "too casually", "while hiding a knife"] },
      { id: "10", label: "Unusual Tax Subject", type: "noun", suggestions: ["toga", "chariot parking", "excessive beard length", "dramatic sighing"] },
      { id: "11", label: "Exotic Animal", type: "animal", suggestions: ["lion", "elephant", "very judgmental cat", "emotional support chicken"] },
      { id: "12", label: "Pet Name", type: "person", suggestions: ["Flufficus", "Lord Snuggles III", "Mr. Whiskers of Rome", "Brutus Jr."] },
      { id: "13", label: "Important Document", type: "noun", suggestions: ["lunch", "battle plans", "someone's will", "the peace treaty"] },
      { id: "14", label: "Chaotic Action (-ing)", type: "verb", suggestions: ["wrestling", "crying dramatically", "quoting Greek poetry badly", "throwing grapes"] },
      { id: "15", label: "Unexpected Enemy", type: "place", suggestions: ["the cafeteria", "their own city", "the concept of Mondays", "everyone named Marcus"] },
      { id: "16", label: "Vacation Spot", type: "place", suggestions: ["Gaul", "Egypt", "bed", "anywhere but here"] },
      { id: "17", label: "Suspicious Action", type: "verb", suggestions: ["sharpened something", "exchanged looks with other senators", "laughed nervously", "measured the distance to Caesar's back"] },
      { id: "18", label: "Small Number", type: "number", suggestions: ["three", "seven", "fifteen", "way too few"] },
      { id: "19", label: "Adjective (foreshadowing)", type: "adjective", suggestions: ["stabby", "historically significant", "significantly worse", "ironic"] },
    ],
    reflectionQuestions: [
      "Find all the PAST TENSE verbs. Why is past tense natural for historical narratives?",
      "Identify 3 examples of DRAMATIC IRONY (where readers know something characters don't).",
      "Convert Caesar's exclamation to INDIRECT SPEECH.",
      "List all the COMPOUND NOUNS and ADJECTIVE + NOUN combinations.",
      "Research: What actually happened on the Ides of March? Write a 3-sentence summary using PASSIVE VOICE.",
    ],
    normalEnding: `The next few days passed without incident. Caesar gave {12} a medal, pardoned {5} for the rumor, and briefly considered a career change to pottery. The Senate remained chaotic. Rome continued being Rome. Some things never change – even in {1} BC.`,
    absurdEnding: `Caesar decided the whole "ruling an empire" thing was overrated and opened a {8} spa instead. {12} became the new emperor by accident (nobody noticed the difference for three weeks). Brutus became a life coach. The {10} tax was quietly forgotten. History textbooks never recovered.`,
  },
  {
    id: "historical-epic-1",
    theme: "🏛️ Historical",
    mood: "⚔️ Epic",
    cefrLevel: "B2",
    title: "The Last Stand of the Three Hundred",
    templateText: `At the narrow pass of {1}, King {2} of Sparta addressed his {3} warriors for the final time.

"Persians number in the {4}," he declared, his voice {5} across the mountains. "They say their arrows will block out the {6}."

A young warrior named {7} shouted back: "Then we shall fight in the {8}!"

The Spartans {9} their shields as one, creating a wall of {10}. Their spears gleamed {11} in the morning light.

Across the field, the Persian general {12} watched through {13} eyes. He had conquered {14} nations, but never faced warriors who {15} at the face of death.

When the battle began, each Spartan fought like {16}. The pass ran {17} with the blood of {18}.

For {19} days, {3} men held back an empire.

Some victories are not measured in {20}. Some victories live forever.`,
    blanks: [
      { id: "1", label: "Place Name", type: "place", suggestions: ["Thermopylae", "the Hot Gates", "the Narrow Pass", "destiny's threshold"] },
      { id: "2", label: "King Name", type: "person", suggestions: ["Leonidas", "Alexandros", "Theron", "a man whose name history would remember"] },
      { id: "3", label: "Number", type: "number", suggestions: ["three hundred", "the chosen", "three hundred", "a handful of"] },
      { id: "4", label: "Large Number", type: "number", suggestions: ["millions", "hundreds of thousands", "countless", "more than stars in the sky"] },
      { id: "5", label: "Verb (sound)", type: "verb", suggestions: ["thundered", "echoed", "roared", "carried like destiny itself"] },
      { id: "6", label: "Celestial Body", type: "noun", suggestions: ["sun", "very sky", "stars", "heavens"] },
      { id: "7", label: "Warrior Name", type: "person", suggestions: ["Stelios", "Astinos", "Dilios", "the youngest among them"] },
      { id: "8", label: "Dramatic Location", type: "noun", suggestions: ["shade", "darkness", "storm", "glory itself"] },
      { id: "9", label: "Verb (action)", type: "verb", suggestions: ["raised", "locked", "crashed", "united"] },
      { id: "10", label: "Material", type: "noun", suggestions: ["bronze and iron", "unyielding determination", "Spartan steel", "unbreakable will"] },
      { id: "11", label: "Adverb", type: "adverb", suggestions: ["dangerously", "hungrily", "righteously", "eternally"] },
      { id: "12", label: "Enemy Name", type: "person", suggestions: ["Xerxes", "the God-King", "the Persian Shadow", "he who called himself immortal"] },
      { id: "13", label: "Adjective (eyes)", type: "adjective", suggestions: ["calculating", "golden", "merciless", "fearful for the first time"] },
      { id: "14", label: "Number", type: "number", suggestions: ["a thousand", "countless", "every known", "all but these"] },
      { id: "15", label: "Verb (brave)", type: "verb", suggestions: ["laughed", "smiled", "spit", "roared back"] },
      { id: "16", label: "Number (each)", type: "number", suggestions: ["ten men", "a hundred", "an army", "legends"] },
      { id: "17", label: "Color", type: "color", suggestions: ["red", "crimson", "dark", "with the colors of courage"] },
      { id: "18", label: "Enemy Group", type: "noun", suggestions: ["invaders", "the so-called immortals", "those who dared advance", "an empire"] },
      { id: "19", label: "Number (days)", type: "number", suggestions: ["three", "seven", "eternal", "the most important"] },
      { id: "20", label: "Concept", type: "noun", suggestions: ["survivors", "territory", "numbers", "what others call victory"] },
    ],
    reflectionQuestions: [
      "Analyze the RHETORICAL DEVICES: repetition, parallelism, rhetorical questions. Find examples of each.",
      "This text uses SHORT SENTENCES for impact. Find 3 examples and explain their effect.",
      "Identify PASSIVE VOICE constructions. Why might an author choose active vs. passive voice in epic storytelling?",
      "Find all SIMILES and METAPHORS. How do they elevate the writing from informative to inspiring?",
      "The ending uses PHILOSOPHICAL statements. Write 3 more 'Some victories...' sentences using the same structure.",
    ],
    normalEnding: `When the final Spartan fell, he fell forward – toward the enemy, not away. {12} ordered the pass cleared with trembling hands. He had won the battle, but something had been lost that day. The {3} had shown the world that tyrants can bleed. That empires can be defied. That {3} is enough.`,
    absurdEnding: `Halfway through day two, both sides called timeout for lunch. Someone had brought {6} amount of hummus, and it seemed rude not to share. By day three, the battle had turned into a competitive cooking show. {2} won with his legendary lamb souvlaki. {12} took second place and became surprisingly okay with it.`,
  },

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // 🎌 JAPANESE ANIME THEME
  // ─────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "anime-hilarious-1",
    theme: "🎌 Japanese Anime",
    mood: "😂 Hilarious",
    cefrLevel: "B1",
    title: "Transfer Student Chaos",
    templateText: `It was a {1} day at {2} High School when the classroom door slid open DRAMATICALLY.

"I-I'm {3}," stammered the new transfer student, whose hair was an impossible shade of {4}. "Please take care of me!"

Student Council President {5} adjusted their glasses {6}. "Another transfer student? This is the {7} one this semester."

The new student's backstory was {8}: they were secretly a {9}, could {10} when emotional, and had a mysterious {11} on their {12}.

Within approximately {13} seconds, three people had already developed a crush on them:
- {14}, the {15} childhood friend
- {16}, the {17} rival
- And somehow, the school's {18}

"NANI?!" screamed everyone simultaneously.

By lunch, {3} had accidentally {19} the school gym, befriended a talking {20}, and started a tournament arc that would last {21} episodes.

This was going to be a very {22} school year.`,
    blanks: [
      { id: "1", label: "Adjective (day)", type: "adjective", suggestions: ["completely normal", "suspiciously peaceful", "fated", "plot-convenient"] },
      { id: "2", label: "School Name", type: "place", suggestions: ["Sakura Academy", "Generic Anime", "Definitely Not Suspicious", "Plot Device"] },
      { id: "3", label: "Protagonist Name", type: "person", suggestions: ["Yuki", "Haru", "Sora", "Insert-Name-Here-kun"] },
      { id: "4", label: "Impossible Hair Color", type: "color", suggestions: ["electric blue", "cotton candy pink", "gravity-defying silver", "protagonist gold"] },
      { id: "5", label: "President Name", type: "person", suggestions: ["Kaichou-sama", "Megane-kun", "Senpai Supreme", "The One With Glasses"] },
      { id: "6", label: "Adverb", type: "adverb", suggestions: ["menacingly", "sparkingly", "in a way that reflected the light dramatically", "while the soundtrack swelled"] },
      { id: "7", label: "Large Number", type: "number", suggestions: ["47th", "69th", "420th", "mathematically impossible"] },
      { id: "8", label: "Adjective", type: "adjective", suggestions: ["unnecessarily complicated", "tragically mysterious", "exposition-heavy", "three seasons long"] },
      { id: "9", label: "Secret Identity", type: "noun", suggestions: ["demon lord's reincarnation", "magical girl", "isekai protagonist", "person with a normal life (rare)"] },
      { id: "10", label: "Power (-ing)", type: "verb", suggestions: ["shoot lasers", "transform dramatically", "summon their true form", "break the fourth wall"] },
      { id: "11", label: "Marking", type: "noun", suggestions: ["seal", "birthmark shaped like a dragon", "mysterious tattoo", "plot-relevant scar"] },
      { id: "12", label: "Body Part", type: "noun", suggestions: ["forehead", "eye (covered by hair)", "back (always conveniently shown)", "soul"] },
      { id: "13", label: "Small Number", type: "number", suggestions: ["3.5", "negative two", "before they even spoke", "one dramatic close-up"] },
      { id: "14", label: "Character Name", type: "person", suggestions: ["Childhood-Friend-chan", "Obvious Love Interest-kun", "Yamada", "The One Who's Definitely Not Jealous"] },
      { id: "15", label: "Archetype", type: "adjective", suggestions: ["tsundere", "oblivious", "desperately in love", "literally childhood friends since episode 1"] },
      { id: "16", label: "Rival Name", type: "person", suggestions: ["Dark-Version-of-Protagonist", "Edgy-kun", "Sasuke-Wannabe", "The One With Cooler Hair"] },
      { id: "17", label: "Archetype", type: "adjective", suggestions: ["brooding", "secretly soft", "misunderstood", "100% going to switch sides later"] },
      { id: "18", label: "Unexpected Admirer", type: "noun", suggestions: ["vending machine", "background character #47", "the narrator", "a sentient desk"] },
      { id: "19", label: "Verb (past)", type: "verb", suggestions: ["destroyed", "accidentally befriended", "unlocked a secret level in", "caused a tournament arc in"] },
      { id: "20", label: "Mascot Animal", type: "animal", suggestions: ["cat that's definitely not a god", "mysterious flying creature", "suspiciously wise hamster", "creature made for merchandise"] },
      { id: "21", label: "Large Number", type: "number", suggestions: ["347", "however long the manga runs", "three seasons and a movie", "filler-included 500"] },
      { id: "22", label: "Adjective", type: "adjective", suggestions: ["very long", "dramatically exhausting", "merchandise-generating", "fan-wiki-filling"] },
    ],
    reflectionQuestions: [
      "Anime uses many LOANWORDS from Japanese (like 'NANI'). Find English equivalents for: sensei, senpai, kawaii, baka.",
      "This story uses HYPERBOLE (extreme exaggeration) for comedy. Find 5 examples and explain why they're funny.",
      "Identify the PRESENT PERFECT tense ('had already developed'). Why is it used here?",
      "The text uses PASSIVE VOICE ('was going to be'). Find 3 more passive constructions and convert them to active.",
      "TROPES are common story patterns. List 5 anime tropes from this story and explain them to someone unfamiliar with anime.",
    ],
    normalEnding: `By the end of the semester, {3} had saved the world exactly {21} times, their hair had somehow gotten even more {4}, and they'd collected a friend group of exactly one representative from each character archetype. The talking {20} got its own spin-off manga. Season 2 was already confirmed.`,
    absurdEnding: `The entire school year turned out to be a dream sequence. {3} woke up as a middle-aged accountant named Steve who had never watched anime in his life. He stared at his very normal, {4}-free reflection and wondered why he suddenly felt the urge to adjust non-existent glasses {6}. The {20} was his real cat. It did not talk. Or did it?`,
  },
  {
    id: "anime-epic-1",
    theme: "🎌 Japanese Anime",
    mood: "⚔️ Epic",
    cefrLevel: "B2",
    title: "The Final Form Awakens",
    templateText: `{1} stood at the edge of {2}, their {3} cloak billowing in the wind that seemed to exist only for dramatic effect.

Across the battlefield, the villain {4} laughed {5}. "You cannot defeat me! I have transcended {6} itself!"

"Maybe," {1} replied, their voice {7}. "But I'm not fighting alone. I carry the will of everyone who believed in me: {8}, who taught me to {9}. {10}, who sacrificed everything. And {11}... who I couldn't save."

A single tear fell as {1} released their true power. The transformation began.

{12} energy exploded outward. Their {13} transformed into {14}. Ancient symbols of {15} appeared across their skin, glowing with the light of {16}.

This was it. The form that only appeared once every {17} years.

"IMPOSSIBLE!" screamed {4}, for the first time showing {18}.

{1} raised their {19} and spoke the words that would echo through anime history:

"{20}... is my FINAL FORM!"`,
    blanks: [
      { id: "1", label: "Hero Name", type: "person", suggestions: ["Akira", "Zero", "The Protagonist", "Someone Worth Believing In"] },
      { id: "2", label: "Epic Location", type: "place", suggestions: ["the world's end", "where heaven meets earth", "the Final Battle Zone™", "a really tall cliff"] },
      { id: "3", label: "Adjective (cloak)", type: "adjective", suggestions: ["tattered", "ancestral", "plot-significant", "dramatically flowing"] },
      { id: "4", label: "Villain Name", type: "person", suggestions: ["Lord Darkness", "The One Who Was Wronged", "Definitely-Final-Boss-kun", "your own shadow"] },
      { id: "5", label: "Adverb", type: "adverb", suggestions: ["maniacally", "with false confidence", "while the orchestra swelled", "too soon"] },
      { id: "6", label: "Concept", type: "noun", suggestions: ["humanity", "mortality", "the need for flashbacks", "reasonable power scaling"] },
      { id: "7", label: "Adjective (voice)", type: "adjective", suggestions: ["steady", "resolute", "quieter than thunder but just as powerful", "perfectly voice-acted"] },
      { id: "8", label: "Mentor Name", type: "person", suggestions: ["Master who died in episode 12", "The One Who Saw My Potential", "Sensei", "the fallen comrade"] },
      { id: "9", label: "Lesson Verb", type: "verb", suggestions: ["never give up", "believe in myself", "protect what matters", "aim for the heart"] },
      { id: "10", label: "Sacrifice Name", type: "person", suggestions: ["The friend who didn't make it", "my past self", "everyone in the destroyed village", "hope itself"] },
      { id: "11", label: "Lost Person Name", type: "person", suggestions: ["the one I loved", "my own innocence", "the person I used to be", "this arc's death"] },
      { id: "12", label: "Energy Color", type: "color", suggestions: ["Golden", "Prismatic", "Transcendent white", "Whatever color represents plot armor"] },
      { id: "13", label: "Feature", type: "noun", suggestions: ["eyes", "hair", "entire being", "very soul"] },
      { id: "14", label: "New Form", type: "noun", suggestions: ["pure light", "something beyond human", "the stuff of legends", "merchandise potential"] },
      { id: "15", label: "Concept", type: "noun", suggestions: ["destiny", "the ancient ones", "power that surpasses gods", "main character energy"] },
      { id: "16", label: "Light Source", type: "noun", suggestions: ["a thousand suns", "every star ever born", "the opening theme", "pure determination"] },
      { id: "17", label: "Large Number", type: "number", suggestions: ["a thousand", "ten thousand", "once per series", "whenever ratings need it"] },
      { id: "18", label: "Emotion", type: "emotion", suggestions: ["fear", "the emotion they swore to abandon", "that this might not go their way", "adequate power scaling concerns"] },
      { id: "19", label: "Weapon/Hand", type: "noun", suggestions: ["legendary blade", "fist of determination", "weapon that chose them", "open palm of friendship"] },
      { id: "20", label: "Declaration", type: "noun", suggestions: ["THIS", "FRIENDSHIP", "THE POWER OF BELIEVING", "PLUS ULTRA"] },
    ],
    reflectionQuestions: [
      "Epic anime uses SPECIFIC SENTENCE STRUCTURES for impact. Find examples of: fragments, exclamations, and ellipsis.",
      "Analyze the TRANSFORMATION SEQUENCE. What grammatical structures build tension? (progressive, passive, etc.)",
      "This text is heavy with ABSTRACT NOUNS (destiny, power, will). List them all and discuss why epic stories use them.",
      "Find all CONDITIONAL STRUCTURES (expressed or implied). How do they relate to sacrifice and consequences?",
      "The text uses FLASHBACK REFERENCES. Write a 5-sentence flashback scene for one of the mentioned characters.",
    ],
    normalEnding: `The battle lasted exactly long enough for one more monologue from each side. When {1}'s final attack landed, it wasn't just {4} who fell—it was the entire philosophy of {6}. In the aftermath, {1} looked up at the clearing sky and smiled. The {17}-year wait had been worth it. Somewhere, {8}, {10}, and {11} were smiling too.`,
    absurdEnding: `Plot twist: {4} was actually {1}'s long-lost cousin who just wanted attention. They hugged it out while the orchestra awkwardly faded. The "Final Form" turned out to be a wardrobe malfunction. The real treasure was the merchandise they sold along the way. Season 2 was cancelled but revived by fan petition.`,
  },

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // 🌙 DREAM / SURREAL THEME
  // ─────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "dream-absurd-1",
    theme: "🌙 Dream / Surreal",
    mood: "🤪 Absurd",
    cefrLevel: "B1",
    title: "The Tuesday That Forgot How to Tuesday",
    templateText: `I woke up and immediately noticed that my {1} had been replaced by a {2}. This seemed fine.

The clock showed {3} o'clock, but the hands were spelling out "{4}" instead of showing time. I decided not to question it.

My breakfast cereal sang me a {5} song about {6}. The milk had opinions about {7}. Normal morning.

Outside, the sky was {8} with occasional bursts of {9}. A {10} walked by wearing a {11} and discussing {12} with a mailbox.

"Excuse me," I asked the mailbox, "is today still Tuesday?"

The mailbox {13} at me. "Tuesday resigned last month. We're in {14} now."

At this point, the ground became {15}, gravity started working {16}, and my neighbor's {17} flew past quoting {18}.

I went back to bed. This was clearly a problem for future me—assuming time still {19} in a {20} way.`,
    blanks: [
      { id: "1", label: "Body Part", type: "noun", suggestions: ["left elbow", "sense of direction", "concept of self", "everything below the knees"] },
      { id: "2", label: "Absurd Replacement", type: "noun", suggestions: ["philosophical question", "vintage bicycle", "cloud of bees (friendly)", "strongly-worded email"] },
      { id: "3", label: "Impossible Time", type: "number", suggestions: ["purple", "yesterday", "eleventeen", "¯\\_(ツ)_/¯"] },
      { id: "4", label: "Unexpected Word", type: "noun", suggestions: ["HELP", "BANANA", "WHY", "SCREAM QUIETLY"] },
      { id: "5", label: "Music Genre", type: "adjective", suggestions: ["jazz-metal fusion", "passive-aggressive lullaby", "existential pop", "uncomfortably specific"] },
      { id: "6", label: "Philosophical Topic", type: "noun", suggestions: ["the futility of matching socks", "taxes in the afterlife", "why Tuesdays exist", "the void's vacation plans"] },
      { id: "7", label: "Topic", type: "noun", suggestions: ["geopolitics", "your life choices", "spoon etiquette", "the concept of wetness"] },
      { id: "8", label: "Impossible Color", type: "color", suggestions: ["plaid", "loud", "kind of screaming", "a color that hasn't been invented yet"] },
      { id: "9", label: "Weather Event", type: "noun", suggestions: ["falling punctuation", "aggressive sunshine", "clouds shaped like regret", "emotional support rain"] },
      { id: "10", label: "Animal/Object", type: "animal", suggestions: ["self-aware traffic cone", "philosophical duck", "sentient lamp", "extremely polite void"] },
      { id: "11", label: "Outfit", type: "noun", suggestions: ["business casual anxiety", "three hats stacked nervously", "yesterday's dreams", "confidence (borrowed)"] },
      { id: "12", label: "Absurd Topic", type: "noun", suggestions: ["the emotional lives of stairs", "parallel parking in alternate dimensions", "whether thoughts have calories", "the ethics of talking to furniture"] },
      { id: "13", label: "Reaction Verb (past)", type: "verb", suggestions: ["sighed existentially", "judged", "became briefly sentient to express disappointment", "glowed ominously"] },
      { id: "14", label: "Replacement Day", type: "noun", suggestions: ["Blursday", "the in-between times", "Thursday's cousin who nobody invited", "conceptual soup"] },
      { id: "15", label: "Unexpected Texture", type: "adjective", suggestions: ["optional", "strongly opinionated", "medium rare", "conceptually wobbly"] },
      { id: "16", label: "Adverb", type: "adverb", suggestions: ["sideways", "politely", "with noticeable reluctance", "sarcastically"] },
      { id: "17", label: "Household Object", type: "noun", suggestions: ["garden gnome", "refrigerator", "sense of purpose", "collection of unread emails"] },
      { id: "18", label: "Unexpected Source", type: "noun", suggestions: ["ancient prophecy", "IKEA instructions", "your search history", "the terms and conditions nobody reads"] },
      { id: "19", label: "Verb", type: "verb", suggestions: ["worked", "existed", "made sense", "bothered to try"] },
      { id: "20", label: "Adjective", type: "adjective", suggestions: ["linear", "normal", "forward", "comprehensible"] },
    ],
    reflectionQuestions: [
      "SURREALIST writing breaks logical rules. Find 5 examples of impossible combinations and explain what makes them absurd.",
      "Notice the CASUAL TONE despite chaos. How does this contrast create humor? Find phrases that show acceptance of absurdity.",
      "Identify all PERSONIFICATION (giving human traits to non-human things). Why is this technique central to surrealism?",
      "The text uses PARENTHETICAL COMMENTS (in brackets). What purpose do they serve? Write 3 of your own.",
      "CREATE YOUR OWN surreal sentence using this formula: [Normal thing] + [impossible action] + [casual reaction].",
    ],
    normalEnding: `Eventually, Tuesday came back from wherever days go when they resign. Everything returned to normal, except I still couldn't find my {1}. The mailbox and I stayed in touch. The cereal stopped singing but left a nice review of my morning routine. Sometimes I miss the {8} sky, but mostly I'm glad gravity decided to be professional again.`,
    absurdEnding: `I never did wake up. This story is still happening. You're part of it now. Somewhere, a mailbox is judging your reading speed. The cereal wants you to know that {6} was important and you should think about it more. Don't look for your {1}. It's fine where it is. We're all fine here. Fine is a concept that {19} in a {20} way. Probably.`,
  },

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // ⏰ TIME TRAVEL THEME
  // ─────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "time-travel-hilarious-1",
    theme: "⏰ Time Travel",
    mood: "😂 Hilarious",
    cefrLevel: "B1",
    title: "Accidentally Ruining History (Again)",
    templateText: `Dr. {1} activated the time machine for what was supposed to be a simple observation mission to {2}.

"Remember," said their AI assistant {3}, "DO NOT {4} anything. History is {5}."

"Yeah, yeah," Dr. {1} muttered, stepping through the portal.

Immediately upon arrival in {2}, they tripped over a {6} and accidentally {7} directly into {8}.

"WHO ARE YOU?" demanded {8}, looking extremely {9}.

"I'm, uh... a {10} from {11}?" Dr. {1} improvised {12}.

This explanation somehow worked. Within {13} hours, Dr. {1} had accidentally:
- Taught {8} how to {14}
- Introduced the concept of {15} to ancient civilization
- Started a trend of {16} that would last centuries

When they returned to the present, {3} displayed the changes: {17} had never been invented, everyone now spoke {18}, and for some reason, all {19} were now {20}.

"Okay," Dr. {1} admitted, "maybe I {4}ed a little."`,
    blanks: [
      { id: "1", label: "Scientist Name", type: "person", suggestions: ["Professor Oopsie", "Dr. Chaos", "The Regretful One", "Fumbles McTimewarp"] },
      { id: "2", label: "Historical Period", type: "place", suggestions: ["ancient Egypt", "medieval France", "the dinosaur age", "last Tuesday"] },
      { id: "3", label: "AI Name", type: "person", suggestions: ["JARVIS-but-sarcastic", "Clippy 3000", "SIGHS-bot", "The Done-With-This-AI"] },
      { id: "4", label: "Forbidden Verb", type: "verb", suggestions: ["change", "touch", "improve", "befriend anyone important"] },
      { id: "5", label: "Adjective", type: "adjective", suggestions: ["fragile", "delicate", "not a suggestion", "definitely not a playground"] },
      { id: "6", label: "Historical Object", type: "noun", suggestions: ["very important artifact", "suspiciously placed rock", "someone's cat", "the timeline itself"] },
      { id: "7", label: "Embarrassing Action", type: "verb", suggestions: ["faceplanted", "somersaulted", "accidentally dabbed", "interpretive danced"] },
      { id: "8", label: "Historical Figure", type: "person", suggestions: ["Cleopatra", "Shakespeare", "a very confused pharaoh", "literally anyone important"] },
      { id: "9", label: "Emotion", type: "emotion", suggestions: ["confused", "offended", "intrigued", "prepared to have you executed"] },
      { id: "10", label: "Cover Identity", type: "noun", suggestions: ["traveling merchant", "wizard from the future", "very lost tourist", "definitely not a time traveler"] },
      { id: "11", label: "Fake Place", type: "place", suggestions: ["the far lands of Canada", "the kingdom of... later", "definitely not the future", "your imagination"] },
      { id: "12", label: "Adverb", type: "adverb", suggestions: ["desperately", "with wild hand gestures", "while sweating", "through nervous laughter"] },
      { id: "13", label: "Small Number", type: "number", suggestions: ["two", "approximately four-ish", "way too few", "enough to ruin everything"] },
      { id: "14", label: "Modern Activity", type: "verb", suggestions: ["dab", "do the Macarena", "make TikToks", "appreciate memes"] },
      { id: "15", label: "Modern Concept", type: "noun", suggestions: ["pizza delivery", "passive-aggressive emails", "gym memberships", "the concept of weekends"] },
      { id: "16", label: "Fashion/Trend", type: "noun", suggestions: ["backward hats", "saying 'yeet'", "existential dread", "crocs as formal wear"] },
      { id: "17", label: "Important Invention", type: "noun", suggestions: ["the wheel", "sliced bread", "Mondays", "regret"] },
      { id: "18", label: "Absurd Language", type: "noun", suggestions: ["Shakespearean emoji", "aggressive French", "ancient memes", "passive-aggressive interpretive dance"] },
      { id: "19", label: "Common Animals", type: "animal", suggestions: ["dogs", "cats", "pigeons", "squirrels"] },
      { id: "20", label: "Absurd Change", type: "adjective", suggestions: ["purple", "telepathic", "tiny lawyers", "obsessed with jazz"] },
    ],
    reflectionQuestions: [
      "TIME TRAVEL stories use complex tenses. Find examples of: past, past perfect, future-in-the-past, and conditionals.",
      "The humor comes from UNDERSTATEMENT ('maybe I changed a little'). Find other examples and explain the technique.",
      "Identify the CAUSE AND EFFECT chains. How does one small action lead to big consequences?",
      "Convert the timeline changes to CONDITIONAL sentences: 'If Dr. {1} hadn't....'",
      "PARADOX is a time travel concept. Explain what paradoxes are and identify any potential ones in this story.",
    ],
    normalEnding: `Dr. {1} spent the next three weeks fixing the timeline. The {19} were returned to normal (mostly). {17} was re-invented (it's a bit different now). {8} retained a mysterious memory of a {10} who taught them to {14}, which historians still can't explain. {3} added "successful trip: 0%" to its permanent display.`,
    absurdEnding: `Turns out the timeline PREFERRED the changes. The council of time lords (just three bored grad students) voted to keep {15} in ancient history. {8} became known as the inventor of {14}. Dr. {1} received a paradox-shaped trophy and a firm request to never time travel again. The {19} remained {20} because honestly, it's an improvement.`,
  },
  {
    id: "time-travel-epic-1",
    theme: "⏰ Time Travel",
    mood: "⚔️ Epic",
    cefrLevel: "C1",
    title: "The Loop That Must Not Break",
    templateText: `They called it the {1} Paradox—the moment when time itself would {2}.

Commander {3} had lived through this day {4} times. Each loop, they remembered everything. Each loop, they watched {5} die. Each loop, they tried something different.

And each loop, they failed.

"The timeline converges here," explained Dr. {6}, pointing to the {7} device that was both their salvation and their prison. "Whatever choice you make, {5} dies at exactly {8} o'clock."

"Then I won't make a choice," {3} replied, their voice {9} with {10} loops of grief. "I'll make a sacrifice."

The plan was {11}: instead of saving {5}, they would {12} themselves—removing the observer from the loop entirely. Without someone to remember, the loop would {13}.

"You'll be erased from every timeline," Dr. {6} warned. "No one will remember you existed."

{3} looked at {5} one last time. "As long as they {14}. As long as the loop {15}."

At {8} o'clock, Commander {3} stepped into the {7} device.

History recorded nothing. But somewhere, in a timeline that finally moved forward, {5} felt inexplicably {16}—as if someone had loved them enough to become {17}.`,
    blanks: [
      { id: "1", label: "Greek Letter/Name", type: "noun", suggestions: ["Omega", "Eternal", "Ouroboros", "Final"] },
      { id: "2", label: "Catastrophic Verb", type: "verb", suggestions: ["shatter", "collapse", "cease to exist", "consume itself"] },
      { id: "3", label: "Commander Name", type: "person", suggestions: ["Reyes", "Chen", "the Last Guardian", "someone whose name the universe forgot"] },
      { id: "4", label: "Large Number", type: "number", suggestions: ["ten thousand", "countless", "more than memory could hold", "∞"] },
      { id: "5", label: "Person to Save", type: "person", suggestions: ["Maya", "the one they loved", "their past self", "the only one who mattered"] },
      { id: "6", label: "Scientist Name", type: "person", suggestions: ["Hawking", "Temporal", "the one who understood", "the architect of this prison"] },
      { id: "7", label: "Adjective (device)", type: "adjective", suggestions: ["temporal", "paradox", "broken", "impossible"] },
      { id: "8", label: "Significant Time", type: "number", suggestions: ["11:11", "midnight", "the moment before forever", "00:00"] },
      { id: "9", label: "Adjective (voice)", type: "adjective", suggestions: ["heavy", "tired", "resolved", "ancient despite their young face"] },
      { id: "10", label: "Number (loops)", type: "number", suggestions: ["ten thousand", "a lifetime's worth of", "infinite", "too many to count"] },
      { id: "11", label: "Adjective (plan)", type: "adjective", suggestions: ["impossible", "the only one left", "what no one else would consider", "the final option"] },
      { id: "12", label: "Sacrifice Verb", type: "verb", suggestions: ["erase", "sacrifice", "unmake", "give up"] },
      { id: "13", label: "Loop Result", type: "verb", suggestions: ["break", "end", "become meaningless", "finally move forward"] },
      { id: "14", label: "Positive Outcome", type: "verb", suggestions: ["live", "remember joy", "find peace", "move forward"] },
      { id: "15", label: "Loop Ending", type: "verb", suggestions: ["ends", "releases them", "becomes a memory", "sets them free"] },
      { id: "16", label: "Emotion", type: "emotion", suggestions: ["grateful", "at peace", "loved", "as if something important had been lost and found simultaneously"] },
      { id: "17", label: "Abstract State", type: "noun", suggestions: ["nothing", "a memory without a face", "the guardian they'd never know", "forever"] },
    ],
    reflectionQuestions: [
      "This story uses MULTIPLE TENSES to convey time loops. Map out which tenses appear and why each is used.",
      "SACRIFICE is a major theme. Find the vocabulary related to sacrifice and discuss their emotional impact.",
      "The ending uses PASSIVE CONSTRUCTION ('History recorded nothing'). Why is passive voice powerful here?",
      "Analyze CONDITIONAL STRUCTURES: What 'if' statements are implied? What are the consequences of each choice?",
      "Write an ALTERNATIVE ENDING where {3} finds another solution. Use proper conditional and tense structures.",
    ],
    normalEnding: `Time moved forward. {5} lived a full life, never knowing why they sometimes cried during {8} o'clock, or why they felt compelled to save strangers. Scientists eventually called it the {1} Phenomenon—an inexplicable surge of {16}ness that appeared across the population. None of them knew a name had been erased so thoroughly that even time forgot to mourn.`,
    absurdEnding: `Plot twist: the loop was caused by a software bug in the {7} device. Dr. {6} had simply never tried turning it off and on again. {3} was extremely annoyed to learn this after sacrifice #10,001. They filed a formal complaint with the Time Bureau and got a gift card as compensation. {5} found the whole thing hilarious once they stopped being dead.`,
  },

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // ☕ SLICE OF LIFE THEME
  // ─────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "slice-of-life-hilarious-1",
    theme: "☕ Slice of Life",
    mood: "😂 Hilarious",
    cefrLevel: "A2",
    title: "The Family Dinner Disaster",
    templateText: `Every {1} evening, the {2} family gathered for dinner. This week, things went {3} wrong.

It started when Dad tried to cook {4} for the first time. The kitchen filled with {5} smoke and a smell like {6}.

"It's supposed to look like that!" Dad insisted {7}.

Mom walked in, saw the {8}, and immediately called {9} for backup.

Meanwhile, the kids were {10}. Little {11} had somehow gotten {12} stuck in the {13}. Teenage {14} was refusing to eat anything that wasn't {15}.

Grandma arrived with her famous {16} and opinions about everyone's {17}.

"In MY day," she announced, "we didn't have {18}. We just {19} like normal people!"

The dog ate someone's {20}. The cat judged everyone from the {21}.

By {22} PM, three people were {23}, one person was hiding in the {24}, and the smoke alarm had become {25}.

They ordered pizza.

"Same time next week?" asked Dad.

Everyone {26}.`,
    blanks: [
      { id: "1", label: "Day of Week", type: "noun", suggestions: ["Sunday", "Friday", "any day ending in Y", "dreaded"] },
      { id: "2", label: "Family Name", type: "person", suggestions: ["Johnson", "Garcia", "Chaos", "Average-But-Actually-Not"] },
      { id: "3", label: "Adverb", type: "adverb", suggestions: ["hilariously", "predictably", "catastrophically", "impressively"] },
      { id: "4", label: "Dish", type: "food", suggestions: ["lasagna", "something from the internet", "a family recipe nobody remembered correctly", "food"] },
      { id: "5", label: "Color", type: "color", suggestions: ["concerning grey", "impossible purple", "actively hostile black", "questionable"] },
      { id: "6", label: "Bad Smell", type: "noun", suggestions: ["burning regret", "a tire fire", "ambition exceeding ability", "the opposite of cooking"] },
      { id: "7", label: "Adverb", type: "adverb", suggestions: ["unconvincingly", "while sweating", "through gritted teeth", "with misplaced confidence"] },
      { id: "8", label: "Kitchen State", type: "noun", suggestions: ["disaster zone", "crime scene", "modern art piece", "her husband's life choices"] },
      { id: "9", label: "Backup", type: "noun", suggestions: ["her mother", "the fire department", "a divorce lawyer", "anyone with cooking skills"] },
      { id: "10", label: "Action (-ing)", type: "verb", suggestions: ["fighting", "being suspiciously quiet", "causing structural damage", "existing aggressively"] },
      { id: "11", label: "Child Name", type: "person", suggestions: ["Timmy", "Little Monster", "The Small One", "whoever was fastest"] },
      { id: "12", label: "Body Part", type: "noun", suggestions: ["head", "entire self", "hand", "will to live"] },
      { id: "13", label: "Household Item", type: "noun", suggestions: ["banister", "laundry basket", "time-out corner", "somewhere impossible"] },
      { id: "14", label: "Teen Name", type: "person", suggestions: ["Madison", "The Dramatic One", "Angst Personified", "whoever was loudest"] },
      { id: "15", label: "Picky Food", type: "food", suggestions: ["beige", "social-media-approved", "from a very specific restaurant", "approved by influencers"] },
      { id: "16", label: "Grandma Dish", type: "food", suggestions: ["mystery casserole", "judgment pie", "passive-aggressive soup", "something from 1952"] },
      { id: "17", label: "Life Choice", type: "noun", suggestions: ["life choices", "parenting style", "haircuts", "everything they'd done since birth"] },
      { id: "18", label: "Modern Thing", type: "noun", suggestions: ["TikTok", "anxiety medication", "meal kits", "the concept of 'self-care'"] },
      { id: "19", label: "Old Activity", type: "verb", suggestions: ["suffered in silence", "ate our vegetables", "walked uphill both ways", "figured it out"] },
      { id: "20", label: "Important Item", type: "noun", suggestions: ["homework", "car keys", "will to live", "the only edible dish"] },
      { id: "21", label: "High Place", type: "noun", suggestions: ["refrigerator", "moral high ground", "chandelier", "somewhere impossibly judgmental"] },
      { id: "22", label: "Time", type: "number", suggestions: ["7:30", "too early to be this chaotic", "wine o'clock", "whenever hope died"] },
      { id: "23", label: "Emotional State (-ing)", type: "verb", suggestions: ["crying", "stress-eating snacks", "hiding", "pretending to take important calls"] },
      { id: "24", label: "Hiding Spot", type: "noun", suggestions: ["bathroom", "garage", "car", "witness protection"] },
      { id: "25", label: "State", type: "adjective", suggestions: ["background music", "sentient", "the most reliable family member", "exhausted"] },
      { id: "26", label: "Response", type: "verb", suggestions: ["groaned in unison", "pretended not to hear", "laughed because what else can you do", "checked their calendars with dread"] },
    ],
    reflectionQuestions: [
      "This story uses PRESENT TENSE even though it describes past events. Why? What effect does this create?",
      "Find all PHRASAL VERBS (walked in, filled with, etc.) and explain their meanings.",
      "DIALOGUE TAGS show how characters speak. Find 3 examples and create alternatives.",
      "Identify the HUMOR TECHNIQUES: exaggeration, understatement, irony. Give examples of each.",
      "Write about YOUR family dinner using the same light, humorous tone and at least 5 similar structures.",
    ],
    normalEnding: `The pizza arrived at {22}:47. Everyone ate in slightly chaotic peace. {11} was freed from the {13}. {14} agreed that pizza was acceptable. Grandma compared the pizza unfavorably to pizzas from 1962. The dog got the crusts. The cat remained unmoved. It was, by {2} family standards, a successful dinner.`,
    absurdEnding: `The smoke alarm gained consciousness and started reviewing Dad's cooking on Yelp (1 star). The dog became a food critic. Grandma's {16} turned out to be sentient and had opinions about its own recipe. The family agreed to switch to ordering delivery for all future gatherings. The cat approved. For the first time in history, the cat approved of something.`,
  },

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // 🎄 HOLIDAY THEME
  // ─────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "holiday-hilarious-1",
    theme: "🎄 Holiday",
    mood: "😂 Hilarious",
    cefrLevel: "B1",
    title: "The Gift Exchange Gone Wrong",
    templateText: `The annual {1} party gift exchange was supposed to be {2}. Budget: {3} dollars maximum.

When {4} opened their present and found a {5}, everyone pretended it was {6}. The gift tag said "From: {7}" but everyone knew it was actually from {8}, who was sweating {9}.

Things escalated when {10} revealed they'd accidentally wrapped their {11} instead of the actual gift. "I was wondering why my bag felt {12}!" they exclaimed {13}.

{14}, who took gift exchanges {15} seriously, had brought a {16} complete with {17}. "It's handmade," they announced {18}.

The white elephant swap began. By round {19}, chaos reigned:
- {20} had somehow acquired {21} identical {22}
- Someone's {23} kept "accidentally" ending up with the most expensive gift
- The {5} had been strategically avoided by everyone until {24} got stuck with it

{25} declared: "Next year, we're doing {26} instead."

Everyone {27}.`,
    blanks: [
      { id: "1", label: "Holiday", type: "noun", suggestions: ["Christmas", "office", "neighborhood", "Secret Santa disaster"] },
      { id: "2", label: "Adjective", type: "adjective", suggestions: ["simple", "fun", "stress-free", "a good idea"] },
      { id: "3", label: "Number", type: "number", suggestions: ["25", "20", "definitely not whatever this cost", "suggested but ignored"] },
      { id: "4", label: "Person Name", type: "person", suggestions: ["Karen", "Dave", "the person who always complains", "someone trying to smile"] },
      { id: "5", label: "Terrible Gift", type: "noun", suggestions: ["singing fish plaque", "used candle", "regift from 1998", "something from their car"] },
      { id: "6", label: "Polite Reaction", type: "adjective", suggestions: ["thoughtful", "unique", "certainly... something", "exactly what they wanted (lying)"] },
      { id: "7", label: "Fake Name", type: "person", suggestions: ["Secret Santa", "Anonymous", "A Well-Wisher", "Mystery Gifter"] },
      { id: "8", label: "Actual Gifter", type: "person", suggestions: ["Bob from accounting", "the one eating snacks nervously", "someone looking at the ceiling", "the obvious suspect"] },
      { id: "9", label: "Adverb", type: "adverb", suggestions: ["profusely", "suspiciously", "while not making eye contact", "directly into the punch bowl"] },
      { id: "10", label: "Person Name", type: "person", suggestions: ["Linda", "newcomer Jim", "the one who always forgets things", "the panicking one"] },
      { id: "11", label: "Personal Item", type: "noun", suggestions: ["lunch", "car keys", "actual wallet", "emotional baggage"] },
      { id: "12", label: "Adjective", type: "adjective", suggestions: ["light", "suspiciously heavy", "like it contained food", "wrong"] },
      { id: "13", label: "Adverb", type: "adverb", suggestions: ["nervously", "too loudly", "while everyone stared", "with dawning horror"] },
      { id: "14", label: "Overachiever Name", type: "person", suggestions: ["Susan", "the competitive one", "same person who decorates too early", "Martha Stewart Jr."] },
      { id: "15", label: "Adverb", type: "adverb", suggestions: ["WAY too", "aggressively", "threateningly", "Pinterest-level"] },
      { id: "16", label: "Elaborate Gift", type: "noun", suggestions: ["gift basket from a yacht catalog", "handmade quilt", "actual piece of furniture", "small business startup"] },
      { id: "17", label: "Extra Feature", type: "noun", suggestions: ["monogramming", "a certificate of authenticity", "a QR code to a longer explanation", "too much thought"] },
      { id: "18", label: "Adverb", type: "adverb", suggestions: ["smugly", "while making eye contact with the person who brought the fish", "intimidatingly", "as if this were a competition"] },
      { id: "19", label: "Number", type: "number", suggestions: ["three", "seventeen", "way too many", "when Kevin showed up late"] },
      { id: "20", label: "Person Name", type: "person", suggestions: ["Steve", "the confused one", "someone who doesn't understand the rules", "a first-timer"] },
      { id: "21", label: "Number", type: "number", suggestions: ["four", "seven", "somehow twelve", "an impossible amount of"] },
      { id: "22", label: "Duplicate Gift", type: "noun", suggestions: ["scented candles", "coffee mugs", "wine glasses", "gift cards to the same store"] },
      { id: "23", label: "Role", type: "noun", suggestions: ["boss", "the 'lucky' one", "someone's kid who shouldn't be here", "most competitive coworker"] },
      { id: "24", label: "Unlucky Person", type: "person", suggestions: ["the late arrival", "someone who'd been in the bathroom", "the newest hire", "poor, poor Derek"] },
      { id: "25", label: "Leader Type", type: "noun", suggestions: ["Party planner", "HR", "The exhausted host", "Whoever had enough"] },
      { id: "26", label: "Alternative", type: "noun", suggestions: ["nothing", "donating to charity", "absolutely anything else", "separate holidays"] },
      { id: "27", label: "Response", type: "verb", suggestions: ["nodded aggressively", "said that's what they said last year", "pretended to hear their phone ring", "started planning next year's chaos already"] },
    ],
    reflectionQuestions: [
      "Find all QUANTIFIERS (everyone, someone, nobody, etc.) and explain how they're used.",
      "This story uses PAST CONTINUOUS for ongoing actions ('was sweating'). Find more examples and explain why.",
      "Identify PASSIVE VOICE constructions. Convert them to active voice and discuss the difference.",
      "CULTURAL CONTEXT: Gift exchanges vary by culture. Write about gift-giving traditions you know!",
      "The text uses PARENTHETICAL HUMOR. Find examples and create your own using the same pattern.",
    ],
    normalEnding: `The {5} found a home in the office break room, where it became a {1} tradition to regift it every year. {14}'s elaborate gift was used exactly once before being put in a closet. The {11} was returned to {10}, who has since started a very thorough packing checklist. The next year, they did indeed try {26}. It was equally chaotic.`,
    absurdEnding: `The {5} achieved sentience and became the company mascot. {14}'s gift turned out to be worth a fortune on Antiques Roadshow, but they'd already regifted it. The whole party was revealed to be a social experiment by HR, who published a paper titled "Gift Exchange Dynamics in Late-Stage Capitalism." Everyone got gift cards as an apology.`,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  AI GENERATION INSTRUCTIONS (Copy this prompt to ChatGPT/Claude)
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const AI_GENERATION_PROMPT = `
═══════════════════════════════════════════════════════════════════════════════
🤖 TUTORLY MADLIBS – AI GENERATOR (STRICT MODE)
═══════════════════════════════════════════════════════════════════════════════

OUTPUT RULES (MANDATORY):
1) Output ONLY a SINGLE JSON object. No markdown fences. No commentary.
2) The JSON MUST parse (double quotes, no trailing commas).
3) The JSON MUST include learnerInfo and madlibs.
4) madlibs MUST contain EXACTLY 15 stories.

GOAL:
Generate 5 BEST-FIT THEMES for this learner + lesson, and for each theme generate 3 moods.
Total = 5 themes × 3 moods = 15 madlibs.
All stories must STRICTLY match the learner's CEFR level.

═══════════════════════════════════════════════════════════════════════════════
STEP A — Read the learnerInfo and adapt content
═══════════════════════════════════════════════════════════════════════════════
- Use learnerInfo.cefrLevel as the single source of truth.
- Use learnerInfo.lessonTopic to design reflectionQuestions and grammar focus.
- Use learnerInfo.interests to pick 5 themes that are most motivating.

learnerInfo fields:
- cefrLevel: A1 | A2 | B1 | B2 | C1 | C2  (required)
- age: number (optional)
- interests: string[] (optional)
- lessonTopic: string (required; can be grammar, vocabulary, functional language)

═══════════════════════════════════════════════════════════════════════════════
STEP B — Choose EXACTLY 5 themes (best match)
═══════════════════════════════════════════════════════════════════════════════
Pick 5 from the allowed theme labels below (use EXACT strings):
- "🐉 Fantasy"
- "🔍 Mystery"
- "🏛️ Historical"
- "☢️ Post-Apocalyptic"
- "🚬 Noir"
- "👸 Fairy Tale"
- "⚡ Mythology"
- "☕ Slice of Life"
- "🏆 Sports"
- "🎄 Holiday"
- "🌙 Dream / Surreal"
- "⏰ Time Travel"
- "🎌 Japanese Anime"
- "🤖 AI Custom" (only if the lessonTopic clearly needs a custom scenario)

RULES:
- Themes must be DIVERSE (not all similar).
- At least 2 of the 5 themes must directly match interests.
- If interests are unknown, pick broadly appealing themes.

═══════════════════════════════════════════════════════════════════════════════
STEP C — For EACH theme, pick EXACTLY 3 moods
═══════════════════════════════════════════════════════════════════════════════
Use EXACT mood strings (3 distinct moods per theme):
- "😂 Hilarious"
- "💀 Gloomy"
- "⚔️ Epic"
- "🎭 Satirical"
- "💕 Romantic"
- "🤪 Absurd"

Total moods created = 15 stories.

═══════════════════════════════════════════════════════════════════════════════
CEFR STRICT RULES (choose based on learnerInfo.cefrLevel)
═══════════════════════════════════════════════════════════════════════════════
A1:
- 6–8 blanks. Short sentences. Present simple + past simple only.
- Concrete vocab, daily life.
- Reflection Qs: basic word order, simple tense ID, simple vocab.

A2:
- 8–10 blanks. Present/past simple + present/past continuous.
- High-frequency phrasal verbs ok.
- Reflection Qs: simple transformations, tense contrast.

B1:
- 10–14 blanks. Add present perfect; conditionals 1–2; reported speech basics.
- Reflection Qs: grammar patterns + controlled production.

B2:
- 12–16 blanks. Passive voice + conditionals type 3 + more complex clauses.
- Reflection Qs: nuance, register, style.

C1:
- 14–18 blanks. Inversion/subjunctive allowed, sophisticated connectors.
- Reflection Qs: rhetorical devices, discourse analysis.

C2:
- 16–20 blanks. Idioms, collocations, register shifts, subtle humor.
- Reflection Qs: deep critical reading + rewriting tasks.

IMPORTANT: ALL 15 stories MUST use the SAME CEFR level as learnerInfo.cefrLevel.

═══════════════════════════════════════════════════════════════════════════════
JSON SHAPE (MUST MATCH EXACTLY)
═══════════════════════════════════════════════════════════════════════════════
Top level:
{
  "learnerInfo": { ... },
  "madlibs": Template[]
}

Template object (ALL fields required):
{
  "id": string,
  "theme": string,            // one of allowed theme labels
  "mood": string,             // one of allowed mood labels
  "cefrLevel": string,        // must equal learnerInfo.cefrLevel
  "title": string,
  "templateText": string,     // MUST include placeholders {1}..{N}
  "blanks": Blank[],
  "reflectionQuestions": string[],  // RECOMMENDED exactly 5
  "normalEnding": string,
  "absurdEnding": string
}

Blank object:
{
  "id": "1" | "2" | ... | "N",  // MUST be sequential strings starting at "1"
  "label": string,
  "type": one of: "noun" | "verb" | "adjective" | "person" | "place" | "animal" | "food" | "emotion" | "number" | "color" | "adverb" | "exclamation",
  "suggestions": string[]  // 4–8 suggestions, CEFR-appropriate
}

ID RULES (STRICT):
- 15 unique template ids.
- Use kebab-case: <themeKey>-<moodKey>-<index>
  Example: "fantasy-hilarious-1", "mystery-gloomy-1"

PLACEHOLDER RULES (STRICT):
- templateText MUST contain EVERY placeholder {1}..{N} at least once.
- templateText MUST NOT contain placeholders outside 1..N.
- normalEnding/absurdEnding may repeat placeholders, but MUST NOT introduce new ones.

REFLECTION QUESTIONS RULES:
- Must target learnerInfo.lessonTopic.
- Include at least:
  - 2 grammar-focus questions (identify/transform)
  - 1 vocab/word choice question
  - 1 speaking prompt
  - 1 short writing prompt
- Adjust complexity to CEFR.

STORY QUALITY RULES:
- Each theme+mood pair should feel meaningfully different.
- Keep humor grammatically correct even when absurd.
- Avoid sensitive/explicit content (especially with minors).

═══════════════════════════════════════════════════════════════════════════════
FINAL SELF-CHECK (AI MUST DO BEFORE OUTPUT)
═══════════════════════════════════════════════════════════════════════════════
Before you output the JSON, verify ALL:
1) JSON parses.
2) madlibs.length === 15.
3) Exactly 5 distinct themes; exactly 3 moods per theme.
4) Every template.cefrLevel === learnerInfo.cefrLevel.
5) For EACH template:
   - blanks ids are sequential strings starting at "1".
   - placeholders in templateText match blanks exactly.
   - endings don't introduce new placeholders.
   - reflectionQuestions length >= 5 and match lessonTopic.

Now output the final JSON ONLY.
`;

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  JSON IMPORT TEMPLATE FOR AI GENERATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const JSON_IMPORT_TEMPLATE = `{
  "learnerInfo": {
    "cefrLevel": "B1",
    "age": 14,
    "interests": ["anime", "games", "music"],
    "lessonTopic": "Past Simple vs Past Continuous"
  },
  "madlibs": [
    {
      "id": "fantasy-hilarious-1",
      "theme": "🐉 Fantasy",
      "mood": "😂 Hilarious",
      "cefrLevel": "B1",
      "title": "The Wizard Who Couldn't Stop Sneezing",
      "templateText": "Once upon a time, a {1} wizard was {2} in his tower when he accidentally {3}...",
      "blanks": [
        { "id": "1", "label": "Adjective", "type": "adjective", "suggestions": ["clumsy", "forgetful", "ancient", "confused"] },
        { "id": "2", "label": "Verb (-ing)", "type": "verb", "suggestions": ["practicing", "sleeping", "cooking", "dancing"] },
        { "id": "3", "label": "Past Verb", "type": "verb", "suggestions": ["sneezed", "tripped", "exploded", "vanished"] }
      ],
      "reflectionQuestions": [
        "Find all PAST CONTINUOUS verbs (was/were + -ing). Why does the author use this tense?",
        "Identify the INTERRUPTED ACTION: What was happening when something else occurred?",
        "Rewrite the story using PAST SIMPLE only. How does it change the feeling?",
        "Find 3 IRREGULAR PAST VERBS and write their base forms.",
        "Create a NEW SENTENCE using: 'While [someone] was [verb-ing], [someone] [past verb]'"
      ],
      "normalEnding": "The wizard finally learned to control his sneezes. The kingdom was safe, and he became known as 'The Wizard Who Learned.'",
      "absurdEnding": "The wizard's sneezes became so powerful they created a new weather system. Now it rains confetti every Tuesday."
    },
    {
      "id": "fantasy-gloomy-1",
      "theme": "🐉 Fantasy",
      "mood": "💀 Gloomy",
      "cefrLevel": "B1",
      "title": "The Last Dragon's Tear",
      "templateText": "..."
    },
    {
      "id": "fantasy-epic-1",
      "theme": "🐉 Fantasy", 
      "mood": "⚔️ Epic",
      "cefrLevel": "B1",
      "title": "The Battle for Dawn",
      "templateText": "..."
    }
  ]
}

// REMEMBER: Generate 5 themes × 3 moods = 15 total stories!
// All stories MUST match the learner's CEFR level!`;

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════════════════════
function pickAbsurd(type: string): string {
  const key = type.toLowerCase() as keyof typeof ABSURD_WORDS;
  const pool = ABSURD_WORDS[key] ?? ABSURD_WORDS.default;
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildEnding(raw: string, answers: Record<string, string>): string {
  let text = raw;
  Object.entries(answers).forEach(([id, val]) => {
    text = text.replace(new RegExp(`\\{${id}\\}`, "g"), val);
  });
  return text;
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  IMPORT VALIDATION (AI JSON safety net)
// ═══════════════════════════════════════════════════════════════════════════════════════════════
function extractPlaceholderIds(text: string): string[] {
  const ids: string[] = [];
  const re = /\{(\d+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) ids.push(m[1]);
  return ids;
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function isCefrLevel(x: any): x is (typeof CEFR_LEVELS)[number] {
  return typeof x === "string" && (CEFR_LEVELS as readonly string[]).includes(x);
}

function expectedBlankRange(level: (typeof CEFR_LEVELS)[number]): [number, number] {
  switch (level) {
    case "A1": return [6, 8];
    case "A2": return [8, 10];
    case "B1": return [10, 14];
    case "B2": return [12, 16];
    case "C1": return [14, 18];
    case "C2": return [16, 20];
  }
}

function validateImportedMadlibs(parsed: any): { ok: boolean; errors: string[]; warnings: string[]; templates: Template[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const learnerLevel = parsed?.learnerInfo?.cefrLevel;
  const hasLearnerInfo = !!parsed?.learnerInfo;

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, errors: ["Top-level JSON must be an object."], warnings: [], templates: [] };
  }

  if (!parsed.madlibs || !Array.isArray(parsed.madlibs)) {
    return { ok: false, errors: ["JSON must contain a 'madlibs' array."], warnings: [], templates: [] };
  }

  if (hasLearnerInfo && !isCefrLevel(learnerLevel)) {
    errors.push("learnerInfo.cefrLevel must be one of: A1, A2, B1, B2, C1, C2.");
  }

  if (hasLearnerInfo && parsed.madlibs.length !== 15) {
    errors.push(`AI import must include exactly 15 madlibs stories (received ${parsed.madlibs.length}).`);
  } else if (!hasLearnerInfo && parsed.madlibs.length < 1) {
    errors.push("madlibs array is empty.");
  }

  const templates: Template[] = [];
  const ids = new Set<string>();

  parsed.madlibs.forEach((t: any, idx: number) => {
    const prefix = `Story #${idx + 1}`;

    if (!t || typeof t !== "object") {
      errors.push(`${prefix}: must be an object.`);
      return;
    }

    const required = ["id","theme","mood","cefrLevel","title","templateText","blanks","reflectionQuestions","normalEnding","absurdEnding"];
    required.forEach((k) => {
      if (!(k in t)) errors.push(`${prefix}: missing required field '${k}'.`);
    });

    if (typeof t.id !== "string" || !t.id.trim()) {
      errors.push(`${prefix}: id must be a non-empty string.`);
    } else {
      if (ids.has(t.id)) errors.push(`${prefix}: duplicate id '${t.id}'.`);
      ids.add(t.id);
    }

    if (hasLearnerInfo && isCefrLevel(learnerLevel)) {
      if (t.cefrLevel !== learnerLevel) {
        errors.push(`${prefix}: cefrLevel '${t.cefrLevel}' must equal learnerInfo.cefrLevel '${learnerLevel}'.`);
      }
    } else if (!isCefrLevel(t.cefrLevel)) {
      warnings.push(`${prefix}: cefrLevel '${t.cefrLevel}' is not a standard CEFR level.`);
    }

    if (typeof t.templateText !== "string" || !t.templateText.trim()) {
      errors.push(`${prefix}: templateText must be a non-empty string.`);
    }

    if (!Array.isArray(t.blanks) || t.blanks.length === 0) {
      errors.push(`${prefix}: blanks must be a non-empty array.`);
    }

    // CEFR-based blank count check
    if (isCefrLevel(t.cefrLevel)) {
      const [minB, maxB] = expectedBlankRange(t.cefrLevel);
      if (Array.isArray(t.blanks) && (t.blanks.length < minB || t.blanks.length > maxB)) {
        warnings.push(`${prefix}: blanks count ${t.blanks.length} is outside recommended range ${minB}-${maxB} for ${t.cefrLevel}.`);
      }
    }

    // Validate blanks ids sequential + placeholder consistency
    if (Array.isArray(t.blanks)) {
      const blankIds = t.blanks.map((b: any) => String(b?.id));
      const expectedIds = Array.from({ length: t.blanks.length }, (_, i) => String(i + 1));

      // basic shape
      t.blanks.forEach((b: any, bi: number) => {
        const bp = `${prefix} Blank #${bi + 1}`;
        if (!b || typeof b !== "object") {
          errors.push(`${bp}: must be an object.`);
          return;
        }
        ["id","label","type","suggestions"].forEach((k) => {
          if (!(k in b)) errors.push(`${bp}: missing field '${k}'.`);
        });
        if (typeof b.label !== "string" || !b.label.trim()) errors.push(`${bp}: label must be a non-empty string.`);
        if (typeof b.type !== "string" || !b.type.trim()) errors.push(`${bp}: type must be a non-empty string.`);
        if (!Array.isArray(b.suggestions) || b.suggestions.length < 3) warnings.push(`${bp}: suggestions should have at least 3 items.`);
      });

      if (uniq(blankIds).length !== blankIds.length) {
        errors.push(`${prefix}: blank ids must be unique.`);
      }

      // strict sequential check (important for our renderer)
      const isSequential = blankIds.every((id: string, i: number) => id === expectedIds[i]);
      if (!isSequential) {
        errors.push(`${prefix}: blank ids must be sequential strings starting at "1" (expected ${expectedIds.join(", ")}).`);
      }

      const textIds = extractPlaceholderIds(String(t.templateText ?? ""));
      const endingIds = extractPlaceholderIds(String(t.normalEnding ?? "") + "\n" + String(t.absurdEnding ?? ""));

      const usedInText = uniq(textIds);
      const usedInEndings = uniq(endingIds);

      // require every blank id appears in templateText
      expectedIds.forEach((id) => {
        if (!usedInText.includes(id)) errors.push(`${prefix}: templateText is missing placeholder {${id}}.`);
      });

      // forbid extra placeholders
      const extraText = usedInText.filter((id) => !expectedIds.includes(id));
      if (extraText.length) errors.push(`${prefix}: templateText contains unknown placeholders: ${extraText.map((x) => `{${x}}`).join(", ")}.`);

      const extraEnd = usedInEndings.filter((id) => !expectedIds.includes(id));
      if (extraEnd.length) errors.push(`${prefix}: endings contain unknown placeholders: ${extraEnd.map((x) => `{${x}}`).join(", ")}.`);
    }

    if (!Array.isArray(t.reflectionQuestions) || t.reflectionQuestions.length < 3) {
      errors.push(`${prefix}: reflectionQuestions must be an array with at least 3 questions.`);
    } else if (t.reflectionQuestions.length < 5) {
      warnings.push(`${prefix}: reflectionQuestions should ideally be 5 for a full lesson.`);
    }

    templates.push(t as Template);
  });

  return { ok: errors.length === 0, errors, warnings, templates };
}

function autoFixImportedJson(parsed: any): { fixed: any; fixes: string[] } {
  const fixes: string[] = [];
  if (!parsed || typeof parsed !== "object") return { fixed: parsed, fixes };

  // shallow clone
  const fixed: any = {
    ...parsed,
    learnerInfo: parsed.learnerInfo && typeof parsed.learnerInfo === "object" ? { ...parsed.learnerInfo } : parsed.learnerInfo,
    madlibs: Array.isArray(parsed.madlibs) ? parsed.madlibs.map((t: any) => ({ ...t })) : parsed.madlibs,
  };

  const trimStr = (v: any) => (typeof v === "string" ? v.trim() : v);

  if (Array.isArray(fixed.madlibs)) {
    fixed.madlibs = fixed.madlibs.map((t: any, ti: number) => {
      const out: any = { ...t };

      ["id","theme","mood","cefrLevel","title","templateText","normalEnding","absurdEnding"].forEach((k) => {
        const before = out[k];
        out[k] = trimStr(out[k]);
        if (before !== out[k] && typeof before === "string") fixes.push(`Story #${ti+1}: trimmed '${k}'.`);
      });

      if (Array.isArray(out.reflectionQuestions)) {
        out.reflectionQuestions = out.reflectionQuestions
          .map((q: any) => (typeof q === "string" ? q.trim() : q))
          .filter((q: any) => typeof q === "string" && q.length > 0);
      }

      if (Array.isArray(out.blanks)) {
        out.blanks = out.blanks.map((b: any, bi: number) => {
          const bout: any = { ...b };

          // id numeric → string
          if (typeof bout.id === "number") {
            bout.id = String(bout.id);
            fixes.push(`Story #${ti+1} Blank #${bi+1}: converted id number → string.`);
          }
          if (typeof bout.id === "string") {
            const before = bout.id;
            bout.id = bout.id.trim();
            if (before !== bout.id) fixes.push(`Story #${ti+1} Blank #${bi+1}: trimmed blank id.`);
          }

          // trim label/type
          if (typeof bout.label === "string") {
            const before = bout.label;
            bout.label = bout.label.trim();
            if (before !== bout.label) fixes.push(`Story #${ti+1} Blank #${bi+1}: trimmed label.`);
          }
          if (typeof bout.type === "string") {
            const before = bout.type;
            bout.type = bout.type.trim();
            if (before !== bout.type) fixes.push(`Story #${ti+1} Blank #${bi+1}: trimmed type.`);
          }

          if (Array.isArray(bout.suggestions)) {
            const beforeLen = bout.suggestions.length;
            bout.suggestions = bout.suggestions
              .map((s: any) => (typeof s === "string" ? s.trim() : String(s)))
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0);
            if (bout.suggestions.length !== beforeLen) fixes.push(`Story #${ti+1} Blank #${bi+1}: cleaned suggestions.`);
          }

          return bout;
        });
      }

      return out;
    });
  }

  return { fixed, fixes };
}

function buildFilledStoryPlain(template: Template, answers: Record<string,string>): string {
  let text = template.templateText;
  template.blanks.forEach((b) => {
    const v = (answers[b.id] ?? "___").toString();
    text = text.replace(new RegExp(`\\{${b.id}\\}`, "g"), v);
  });
  return text;
}

function buildExportHtml(template: Template, answers: Record<string,string>): string {
  const story = buildFilledStoryPlain(template, answers);
  const answerLines = template.blanks.map((b) => `• ${b.label} (${b.type}): ${answers[b.id] ?? "___"}`).join("\n");
  const questions = (template.reflectionQuestions || []).map((q, i) => `${i+1}. ${q}`).join("\n");

  const esc = (s: string) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(template.title)} – Tutorly Madlibs Export</title>
<style>
  body { font-family: Nunito, system-ui, Arial; padding: 28px; line-height: 1.6; color: #0f172a; }
  h1 { font-size: 28px; margin: 0 0 6px; }
  .meta { color: #475569; font-weight: 700; margin-bottom: 18px; }
  .card { border: 2px solid #e2e8f0; border-radius: 16px; padding: 18px; margin: 14px 0; }
  .story { white-space: pre-wrap; font-size: 18px; font-weight: 600; }
  .mono { white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 14px; }
  .hint { color: #64748b; font-size: 12px; font-weight: 700; }
  @media print {
    body { padding: 0; }
    .card { break-inside: avoid; }
  }
</style>
</head>
<body>
  <h1>${esc(template.title)}</h1>
  <div class="meta">${esc(template.theme)} · ${esc(template.mood)} · CEFR: ${esc(template.cefrLevel)}</div>

  <div class="card">
    <div class="hint">STORY</div>
    <div class="story">${esc(story)}</div>
  </div>

  <div class="card">
    <div class="hint">ANSWERS</div>
    <div class="mono">${esc(answerLines)}</div>
  </div>

  <div class="card">
    <div class="hint">REFLECTION QUESTIONS</div>
    <div class="mono">${esc(questions)}</div>
  </div>

  <div class="hint">Tip: Use your browser's Print → Save as PDF to create a PDF homework sheet.</div>
</body>
</html>`;
}

function downloadTextFile(filename: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  CONFETTI BURST COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════════════════════
function ConfettiBurst() {
  const colors = ["#f472b6", "#a78bfa", "#34d399", "#fbbf24", "#60a5fa", "#fb923c"];
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-50">
      {Array.from({ length: 40 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2.5 h-2.5 rounded-sm"
          style={{
            left: `${Math.random() * 100}%`,
            top: "-10px",
            background: colors[i % colors.length],
            rotate: Math.random() * 360,
          }}
          animate={{
            y: ["0vh", "110vh"],
            rotate: [0, Math.random() * 720 - 360],
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 1.8 + Math.random() * 1.5,
            delay: Math.random() * 0.8,
            ease: "easeIn",
          }}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  PROGRESS RING COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════════════════════
function ProgressRing({
  pct,
  size = 64,
  stroke = 6,
  color = "#a78bfa",
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c - (pct / 100) * c }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        style={{ strokeDasharray: c }}
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  BLANK CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════════════════════
function BlankCard({
  blank,
  players,
  value,
  onChange,
  index,
  filled,
  darkMode,
  coach,
  owner,
  isActive = false,
  suggestionCap = 5,
}: {
  blank: Blank;
  players: Player[];
  value: string;
  onChange: (id: string, v: string) => void;
  index: number;
  filled: boolean;
  darkMode: boolean;
  /** the grammar coach's read on the word currently in the box */
  coach?: CoachNote | null;
  /** whose turn this blank belongs to */
  owner?: Player | null;
  /** the blank the class is on right now */
  isActive?: boolean;
  /** 0 hides the suggestions (expert mode), 8 shows the assisted set */
  suggestionCap?: number;
}) {
  const isPerson = blank.type.toLowerCase() === "person" || blank.label.toLowerCase().includes("name");
  const allSugg = isPerson ? [...players.map((p) => p.name), ...blank.suggestions] : blank.suggestions;

  const typeColors: Record<string, string> = {
    person: "from-violet-500 to-purple-600",
    noun: "from-blue-500 to-cyan-600",
    verb: "from-green-500 to-emerald-600",
    adjective: "from-orange-400 to-amber-500",
    emotion: "from-pink-500 to-rose-600",
    animal: "from-teal-500 to-cyan-600",
    food: "from-yellow-400 to-orange-500",
    place: "from-indigo-500 to-blue-600",
    number: "from-red-400 to-pink-500",
    color: "from-fuchsia-500 to-violet-600",
    adverb: "from-emerald-500 to-green-600",
    exclamation: "from-rose-500 to-red-600",
  };
  const grad = typeColors[blank.type.toLowerCase()] ?? "from-slate-400 to-slate-600";
  const dm = darkMode;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`
        relative rounded-2xl border-2 transition-all duration-300 overflow-hidden group
        ${isActive ? "ring-4 ring-offset-1 ring-violet-400/70" : ""}
        ${
          filled
            ? dm
              ? "border-violet-500 bg-violet-900/30 shadow-lg shadow-violet-500/20"
              : "border-violet-400 bg-violet-50 shadow-lg shadow-violet-200/60"
            : dm
              ? "border-slate-700 bg-slate-800 hover:border-violet-600"
              : "border-slate-200 bg-white hover:border-violet-300 hover:shadow-md"
        }
      `}
    >
      <div className={`h-1.5 bg-gradient-to-r ${grad}`} />

      <div className="p-4">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`text-xs font-black px-2.5 py-1 rounded-full text-white bg-gradient-to-r ${grad}`}>
            #{index + 1}
          </span>
          {owner && (
            <span
              className={`text-xs font-black px-2.5 py-1 rounded-full border-2 ${isActive ? "animate-pulse" : ""}`}
              style={{ borderColor: owner.color ?? "#8b5cf6", color: owner.color ?? "#8b5cf6" }}
              title={`This blank belongs to ${owner.name}`}
            >
              {owner.emoji ?? "🎭"} {owner.name}
            </span>
          )}
          <span className={`font-black text-base leading-tight ${dm ? "text-white" : "text-slate-800"}`}>
            {blank.label}
          </span>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${dm ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-400"}`}
          >
            {blank.type}
          </span>
          {filled && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center ml-auto"
            >
              <Check size={12} className="text-white" strokeWidth={3} />
            </motion.div>
          )}
        </div>

        {suggestionCap > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {allSugg.slice(0, suggestionCap).map((s: string) => (
            <button
              key={s}
              onClick={() => onChange(blank.id, s)}
              className={`text-sm px-3 py-1 rounded-full border transition-all font-semibold
                ${
                  value === s
                    ? `text-white bg-gradient-to-r ${grad} border-transparent shadow-md scale-105`
                    : dm
                      ? "text-slate-300 border-slate-600 bg-slate-700 hover:border-violet-500"
                      : "text-slate-600 border-slate-200 bg-slate-50 hover:border-violet-300 hover:bg-violet-50"
                }`}
            >
              {s}
            </button>
          ))}
        </div>
        )}

        <div className="relative">
          <input
            type="text"
            placeholder="✏️ or type your own answer…"
            value={value || ""}
            onChange={(e) => onChange(blank.id, e.target.value)}
            className={`
              w-full px-4 py-2.5 rounded-xl border-2 text-base font-semibold outline-none transition-all
              ${
                dm
                  ? filled
                    ? "border-violet-500 bg-violet-900/40 text-violet-200 placeholder:text-slate-500"
                    : "border-slate-600 bg-slate-700 text-white placeholder:text-slate-400 focus:border-violet-500"
                  : filled
                    ? "border-violet-400 bg-violet-50 text-violet-700 placeholder:text-slate-300"
                    : "border-slate-200 bg-white text-slate-800 placeholder:text-slate-300 focus:border-violet-400 focus:bg-violet-50/50"
              }
            `}
          />
        </div>

        {coach && value.trim() && (
          <div
            className={`mt-2.5 flex items-start gap-2 rounded-xl border px-3 py-2 ${
              coach.level === "match"
                ? dm
                  ? "bg-emerald-900/30 border-emerald-700"
                  : "bg-emerald-50 border-emerald-200"
                : coach.level === "close"
                  ? dm
                    ? "bg-amber-900/30 border-amber-700"
                    : "bg-amber-50 border-amber-200"
                  : dm
                    ? "bg-rose-900/30 border-rose-700"
                    : "bg-rose-50 border-rose-200"
            }`}
          >
            <span className="text-base leading-none mt-0.5">
              {coach.level === "match" ? "✅" : coach.level === "close" ? "🤏" : "🧑‍🏫"}
            </span>
            <p
              className={`text-sm font-semibold leading-snug ${
                coach.level === "match"
                  ? dm
                    ? "text-emerald-300"
                    : "text-emerald-700"
                  : coach.level === "close"
                    ? dm
                      ? "text-amber-300"
                      : "text-amber-700"
                    : dm
                      ? "text-rose-300"
                      : "text-rose-700"
              }`}
            >
              {coach.message}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  STORY TEXT RENDERER
// ═══════════════════════════════════════════════════════════════════════════════════════════════
function StoryText({
  template,
  answers,
  highlightId,
  darkMode,
}: {
  template: Template;
  answers: Record<string, string>;
  highlightId?: string;
  darkMode: boolean;
}) {
  let html = template.templateText;
  template.blanks.forEach((b) => {
    const val = answers[b.id] || "___";
    const isHighlighted = b.id === highlightId;
    const base = `px-2 py-0.5 mx-0.5 rounded-md font-black text-base border-b-2 inline-block`;
    const style = isHighlighted
      ? `${base} bg-amber-300 text-amber-900 border-amber-500 shadow-lg scale-110 animate-pulse`
      : val === "___"
        ? darkMode
          ? `${base} bg-slate-700 text-slate-400 border-slate-500`
          : `${base} bg-slate-100 text-slate-400 border-slate-300`
        : darkMode
          ? `${base} bg-violet-800 text-violet-200 border-violet-500`
          : `${base} bg-violet-100 text-violet-700 border-violet-400`;
    const replacement = `<span class="${style}">${val}</span>`;
    html = html.replace(new RegExp(`\\{${b.id}\\}`, "g"), replacement);
  });
  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      className={`leading-loose text-lg font-semibold whitespace-pre-wrap ${darkMode ? "text-slate-200" : "text-slate-700"}`}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  LIVE COMMENT FEED
// ═══════════════════════════════════════════════════════════════════════════════════════════════
function CommentFeed({
  answers,
  active,
  darkMode,
}: {
  answers: Record<string, string>;
  active: boolean;
  darkMode: boolean;
}) {
  const [comments, setComments] = useState<CommentEntry[]>([]);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const dm = darkMode;

  useEffect(() => {
    if (!active) return;
    setComments([]);
    const randomWord = () => {
      const vals = Object.values(answers).filter(Boolean);
      return vals[Math.floor(Math.random() * vals.length)] || "that";
    };
    const timers: ReturnType<typeof setTimeout>[] = [];
    FAKE_COMMENTERS.forEach((c, i) => {
      const t = setTimeout(() => {
        const fn = randomFrom(COMMENT_TEMPLATES);
        const text = fn("story", randomWord());
        setComments((prev) => [
          ...prev,
          {
            id: `${c.name}-${i}`,
            name: c.name,
            avatar: c.avatar,
            text,
            timestamp: Date.now(),
            votes: Math.floor(Math.random() * 50),
            reaction: randomFrom(VOTE_REACTIONS),
          },
        ]);
        setTimeout(() => {
          containerRef.current?.scrollTo({
            top: containerRef.current.scrollHeight,
            behavior: "smooth",
          });
        }, 50);
      }, c.delay * 1000);
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
  }, [active, answers]);

  const upvote = (id: string) => setVotes((v) => ({ ...v, [id]: (v[id] ?? 0) + 1 }));

  return (
    <div
      className={`rounded-2xl border-2 overflow-hidden shadow-lg ${dm ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}
    >
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-3 flex items-center gap-2">
        <MessageCircle size={20} className="text-white" />
        <span className="font-black text-white text-lg">Live Audience Reactions</span>
        {active && (
          <span className="ml-auto flex items-center gap-1.5 text-white/90 text-sm font-bold">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            LIVE
          </span>
        )}
      </div>
      <div ref={containerRef} className="h-64 overflow-y-auto p-4 space-y-3 scroll-smooth">
        <AnimatePresence>
          {comments.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: -30, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex items-start gap-3 group"
            >
              <span className="text-2xl flex-shrink-0 drop-shadow">{c.avatar}</span>
              <div
                className={`flex-1 rounded-2xl rounded-tl-none px-4 py-2.5 border ${dm ? "bg-slate-700 border-slate-600" : "bg-slate-50 border-slate-200"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-black text-sm ${dm ? "text-white" : "text-slate-800"}`}>{c.name}</span>
                  <span className={dm ? "text-slate-400" : "text-slate-400"}>{c.reaction}</span>
                </div>
                <p className={`font-semibold text-base leading-relaxed ${dm ? "text-slate-200" : "text-slate-700"}`}>
                  {c.text}
                </p>
              </div>
              <button
                onClick={() => upvote(c.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-slate-400 hover:text-pink-500 text-sm font-bold mt-1"
              >
                <Heart size={14} /> {c.votes + (votes[c.id] ?? 0)}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {!active && (
          <p className={`text-center text-sm font-semibold py-8 ${dm ? "text-slate-500" : "text-slate-300"}`}>
            Comments appear when the story is revealed 👆
          </p>
        )}
        {active && comments.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className={`font-bold ${dm ? "text-slate-400" : "text-slate-400"}`}
            >
              Audience is typing…
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  STORY REVEAL REEL
// ═══════════════════════════════════════════════════════════════════════════════════════════════
function StoryRevealReel({
  template,
  answers,
  onFinish,
  darkMode,
}: {
  template: Template;
  answers: Record<string, string>;
  onFinish: () => void;
  darkMode: boolean;
}) {
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [done, setDone] = useState(false);
  const blanks = template.blanks;
  const total = blanks.length;
  const dm = darkMode;

  const advance = () => {
    if (currentIdx < total - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      setDone(true);
    }
  };

  const current = blanks[currentIdx];

  return (
    <div className="flex flex-col items-center gap-6 min-h-[420px]">
      <div className="w-full flex items-center gap-3">
        <div className={`flex-1 h-3 rounded-full overflow-hidden ${dm ? "bg-slate-700" : "bg-slate-200"}`}>
          <motion.div
            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
            animate={{ width: `${currentIdx < 0 ? 0 : ((currentIdx + 1) / total) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <span className={`font-black text-sm w-16 text-right ${dm ? "text-slate-400" : "text-slate-600"}`}>
          {currentIdx < 0 ? "Start" : `${currentIdx + 1}/${total}`}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {currentIdx === -1 && (
          <motion.div
            key="title-card"
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: -90, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={`w-full max-w-lg rounded-3xl p-10 text-center shadow-2xl ${dm ? "bg-gradient-to-br from-violet-800 to-fuchsia-800 shadow-violet-900/50" : "bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-violet-300/50"}`}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="text-7xl mb-4"
            >
              🎭
            </motion.div>
            <h2 className="text-3xl font-black text-white mb-2">{template.title}</h2>
            <p className="text-violet-200 font-semibold text-lg mb-8">
              We'll reveal each word one by one… get ready!
            </p>
            <button
              onClick={advance}
              className="bg-white text-violet-700 font-black text-xl px-10 py-4 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center gap-2 mx-auto"
            >
              <Play size={22} /> Start the Reveal!
            </button>
          </motion.div>
        )}

        {currentIdx >= 0 && !done && current && (
          <motion.div
            key={`blank-${currentIdx}`}
            initial={{ scale: 0.7, opacity: 0, rotateX: 30 }}
            animate={{ scale: 1, opacity: 1, rotateX: 0 }}
            exit={{ scale: 1.1, opacity: 0, rotateX: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full"
          >
            <div
              className={`rounded-3xl border-2 shadow-2xl overflow-hidden mb-6 ${dm ? "bg-slate-800 border-slate-700 shadow-violet-900/30" : "bg-white border-violet-200 shadow-violet-100/60"}`}
            >
              <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 flex items-center gap-2">
                <span className="text-white font-black text-sm uppercase tracking-widest">
                  Blank #{currentIdx + 1} · {current.label}
                </span>
              </div>
              <div className="p-8 text-center">
                <motion.div
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 400, delay: 0.1 }}
                  className={`inline-block rounded-2xl px-8 py-5 mb-4 shadow-inner border-4 ${dm ? "bg-amber-900/50 border-amber-600" : "bg-amber-100 border-amber-400"}`}
                >
                  <span
                    className={`text-4xl md:text-5xl font-black tracking-wide drop-shadow ${dm ? "text-amber-300" : "text-amber-700"}`}
                  >
                    {answers[current.id] || "???"}
                  </span>
                </motion.div>
                <p className={dm ? "text-slate-400 font-semibold text-lg" : "text-slate-500 font-semibold text-lg"}>
                  {current.type.toUpperCase()} · {current.label}
                </p>
              </div>
            </div>

            <div className={`rounded-2xl border p-6 ${dm ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
              <p
                className={`text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-1 ${dm ? "text-slate-500" : "text-slate-400"}`}
              >
                <Eye size={12} /> Story so far…
              </p>
              <StoryText
                template={template}
                answers={Object.fromEntries(template.blanks.slice(0, currentIdx + 1).map((b) => [b.id, answers[b.id]]))}
                highlightId={current.id}
                darkMode={darkMode}
              />
            </div>

            <div className="flex justify-between items-center mt-6">
              <button
                onClick={() => setCurrentIdx((i) => Math.max(-1, i - 1))}
                className={`flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl border-2 transition-colors ${dm ? "text-slate-300 border-slate-600 hover:border-violet-500" : "text-slate-500 border-slate-200 hover:border-violet-300"}`}
              >
                <ChevronLeft size={18} /> Back
              </button>
              <button
                onClick={advance}
                className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-black text-lg px-8 py-3 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
              >
                {currentIdx < total - 1 ? (
                  <>
                    Next Word <ChevronRight size={20} />
                  </>
                ) : (
                  <>
                    Finish! <Sparkles size={20} />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {done && (
          <motion.div
            key="done"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="flex flex-col items-center gap-6"
          >
            <ConfettiBurst />
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
              transition={{ repeat: 3, duration: 0.4 }}
              className="text-8xl"
            >
              🎉
            </motion.div>
            <h3 className={`text-3xl font-black text-center ${dm ? "text-violet-400" : "text-violet-700"}`}>
              All blanks revealed!
            </h3>
            <p className={`font-semibold text-lg text-center ${dm ? "text-slate-400" : "text-slate-600"}`}>
              Time to read the full story and watch the audience react!
            </p>
            <button
              onClick={onFinish}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-black text-xl px-12 py-4 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-transform flex items-center gap-3"
            >
              <BookOpen size={24} /> Read Full Story
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  SWIPE ENDING COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════════════════════
function SwipeEnding({
  template,
  answers,
  onBack,
  onComplete,
  sessionMode,
  darkMode,
}: {
  template: Template;
  answers: Record<string, string>;
  onBack: () => void;
  onComplete?: (ending: "normal" | "absurd") => void;
  sessionMode?: boolean;
  darkMode: boolean;
}) {
  const [chosen, setChosen] = useState<"normal" | "absurd" | null>(null);
  const [dragging, setDragging] = useState(false);
  const [canonVotes, setCanonVotes] = useState<{ normal: number; absurd: number }>({ normal: 0, absurd: 0 });
  const dm = darkMode;

  const normalText = buildEnding(template.normalEnding, answers);
  const absurdText = buildEnding(template.absurdEnding, answers);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setDragging(false);
    if (info.offset.x > 80) setChosen("normal");
    if (info.offset.x < -80) setChosen("absurd");
  };

  const vote = (which: "normal" | "absurd") => {
    setCanonVotes((v) => ({ ...v, [which]: v[which] + 1 }));
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className={`text-2xl font-black mb-1 ${dm ? "text-white" : "text-slate-800"}`}>Choose Your Ending</h3>
        <p className={dm ? "text-slate-400 font-semibold" : "text-slate-500 font-semibold"}>
          Swipe <span className="text-green-500 font-black">RIGHT</span> for Normal · Swipe{" "}
          <span className="text-rose-500 font-black">LEFT</span> for Absurd
        </p>
      </div>

      {!chosen && (
        <div className="relative h-72 flex items-center justify-center select-none">
          <div
            className={`absolute left-4 top-4 w-full h-full rounded-3xl flex items-center justify-center ${dm ? "bg-green-900/50 border-2 border-green-700" : "bg-green-100 border-2 border-green-300"}`}
          >
            <div className="text-center">
              <div className="text-4xl mb-2">😌</div>
              <span className={`font-black text-lg ${dm ? "text-green-400" : "text-green-700"}`}>NORMAL</span>
            </div>
          </div>
          <div
            className={`absolute right-4 top-4 w-full h-full rounded-3xl flex items-center justify-center ${dm ? "bg-rose-900/50 border-2 border-rose-700" : "bg-rose-100 border-2 border-rose-300"}`}
          >
            <div className="text-center">
              <div className="text-4xl mb-2">🤪</div>
              <span className={`font-black text-lg ${dm ? "text-rose-400" : "text-rose-700"}`}>ABSURD</span>
            </div>
          </div>
          <motion.div
            drag="x"
            dragConstraints={{ left: -150, right: 150 }}
            onDragStart={() => setDragging(true)}
            onDragEnd={handleDragEnd}
            className={`absolute w-[90%] rounded-3xl border-2 shadow-2xl p-6 cursor-grab active:cursor-grabbing z-10 ${dm ? "bg-slate-800 border-violet-500 shadow-violet-900/40" : "bg-white border-violet-300 shadow-violet-200/60"} ${dragging ? "shadow-3xl" : ""}`}
            whileDrag={{ rotate: 3 }}
          >
            <div className="text-center mb-4 text-4xl">📖</div>
            <p className={`font-semibold text-center text-lg ${dm ? "text-slate-300" : "text-slate-600"}`}>
              Drag to choose your ending!
            </p>
            <div className="flex justify-between mt-4 text-sm font-black">
              <span className="text-green-500 flex items-center gap-1">
                <ChevronLeft size={14} />
                Normal
              </span>
              <span className="text-rose-500 flex items-center gap-1">
                Absurd
                <ChevronRight size={14} />
              </span>
            </div>
          </motion.div>
        </div>
      )}

      {chosen && (
        <AnimatePresence mode="wait">
          <motion.div
            key={chosen}
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className={`rounded-3xl border-2 p-6 shadow-lg ${
              chosen === "normal"
                ? dm
                  ? "bg-green-900/30 border-green-700"
                  : "bg-green-50 border-green-300"
                : dm
                  ? "bg-rose-900/30 border-rose-700"
                  : "bg-rose-50 border-rose-300"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{chosen === "normal" ? "😌" : "🤪"}</span>
              <h4
                className={`font-black text-2xl ${chosen === "normal" ? (dm ? "text-green-400" : "text-green-700") : dm ? "text-rose-400" : "text-rose-700"}`}
              >
                {chosen === "normal" ? "The Normal Ending" : "The Absurd Ending"}
              </h4>
            </div>
            <p className={`font-semibold text-lg leading-relaxed mb-6 whitespace-pre-wrap ${dm ? "text-slate-200" : "text-slate-700"}`}>
              {chosen === "normal" ? normalText : absurdText}
            </p>

            <div className={`border-t pt-4 ${dm ? "border-slate-700" : "border-slate-200"}`}>
              <p className={`font-black text-center mb-3 ${dm ? "text-slate-300" : "text-slate-600"}`}>
                👥 Class vote: Which ending is CANON?
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => vote("normal")}
                  className={`flex-1 flex items-center justify-center gap-2 border-2 font-black text-lg py-3 rounded-2xl transition-colors ${dm ? "bg-green-900/40 border-green-700 text-green-400 hover:bg-green-900/60" : "bg-green-100 border-green-300 text-green-700 hover:bg-green-200"}`}
                >
                  <ThumbsUp size={20} /> Normal ({canonVotes.normal})
                </button>
                <button
                  onClick={() => vote("absurd")}
                  className={`flex-1 flex items-center justify-center gap-2 border-2 font-black text-lg py-3 rounded-2xl transition-colors ${dm ? "bg-rose-900/40 border-rose-700 text-rose-400 hover:bg-rose-900/60" : "bg-rose-100 border-rose-300 text-rose-700 hover:bg-rose-200"}`}
                >
                  Absurd ({canonVotes.absurd}) <ThumbsDown size={20} />
                </button>
              </div>
            </div>

            <button
              onClick={() => setChosen(null)}
              className={`mt-4 w-full py-2.5 rounded-xl border-2 font-bold transition-colors ${dm ? "border-slate-600 text-slate-400 hover:border-violet-500" : "border-slate-200 text-slate-500 hover:border-violet-300"}`}
            >
              ↩ See the other ending
            </button>

            {sessionMode && onComplete && chosen && (
              <button
                onClick={() => onComplete(chosen)}
                className="mt-3 w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-black text-xl shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-transform"
              >
                ✅ Complete Story & Continue Session
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {!chosen && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setChosen("normal")}
            className={`p-4 rounded-2xl border-2 font-black text-base transition-colors ${dm ? "bg-green-900/40 border-green-700 text-green-400 hover:bg-green-900/60" : "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"}`}
          >
            😌 Reveal Normal
          </button>
          <button
            onClick={() => setChosen("absurd")}
            className={`p-4 rounded-2xl border-2 font-black text-base transition-colors ${dm ? "bg-rose-900/40 border-rose-700 text-rose-400 hover:bg-rose-900/60" : "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"}`}
          >
            🤪 Reveal Absurd
          </button>
        </div>
      )}

      <button
        onClick={onBack}
        className={`w-full py-3 rounded-xl border-2 font-bold transition-colors flex items-center justify-center gap-2 ${dm ? "border-slate-600 text-slate-400 hover:border-violet-500" : "border-slate-200 text-slate-500 hover:border-violet-300"}`}
      >
        <RotateCcw size={16} /> Back to Story
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  PEER CHALLENGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════════════════════
function PeerChallenge({
  template,
  player1Answers,
  players,
  onBack,
  darkMode,
}: {
  template: Template;
  player1Answers: Record<string, string>;
  players: Player[];
  onBack: () => void;
  darkMode: boolean;
}) {
  const [p2Answers, setP2Answers] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<"fill" | "versus">("fill");
  const [votes, setVotes] = useState<Record<string, string>>({});
  const dm = darkMode;

  const p2Name = players[1]?.name ?? "Player 2";
  const p1Name = players[0]?.name ?? "Player 1";

  const isP2Done = template.blanks.every((b) => p2Answers[b.id]?.trim());

  if (phase === "fill") {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-3 mb-1">
            <Users size={24} />
            <h3 className="text-2xl font-black">Peer Challenge!</h3>
          </div>
          <p className="text-indigo-200 font-semibold">
            {p2Name}, fill the same blanks without seeing {p1Name}'s answers!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {template.blanks.map((b, i) => (
            <BlankCard
              key={b.id}
              blank={b}
              players={players}
              value={p2Answers[b.id] || ""}
              onChange={(id, v) => setP2Answers((prev) => ({ ...prev, [id]: v }))}
              index={i}
              filled={!!p2Answers[b.id]?.trim()}
              darkMode={darkMode}
            />
          ))}
        </div>

        <div className="flex gap-4">
          <button
            onClick={onBack}
            className={`flex-1 py-3 rounded-xl border-2 font-bold transition-colors ${dm ? "border-slate-600 text-slate-400 hover:border-violet-500" : "border-slate-200 text-slate-500 hover:border-violet-300"}`}
          >
            ← Back
          </button>
          <button
            onClick={() => setPhase("versus")}
            disabled={!isP2Done}
            className={`flex-1 py-3 rounded-xl font-black text-lg transition-all flex items-center justify-center gap-2
              ${
                isP2Done
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:scale-105"
                  : dm
                    ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
          >
            ⚡ Compare Stories!
          </button>
        </div>
      </div>
    );
  }

  const totalBlanks = template.blanks.length;
  const voteCount = (pid: string) => Object.values(votes).filter((v) => v === pid).length;
  const p1Wins = voteCount("p1") > voteCount("p2");
  const p2Wins = voteCount("p2") > voteCount("p1");

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className={`text-2xl font-black ${dm ? "text-white" : "text-slate-800"}`}>⚔️ Side-by-Side Showdown!</h3>
        <p className={dm ? "text-slate-400 font-semibold" : "text-slate-500 font-semibold"}>
          Vote which answer is funnier / more creative for each blank!
        </p>
      </div>

      <div className="space-y-4">
        {template.blanks.map((b) => {
          const v1 = player1Answers[b.id] || "—";
          const v2 = p2Answers[b.id] || "—";
          const voted = votes[b.id];
          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border-2 overflow-hidden shadow-sm ${dm ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}
            >
              <div className={`border-b px-4 py-2 flex items-center gap-2 ${dm ? "bg-slate-700 border-slate-600" : "bg-slate-50 border-slate-200"}`}>
                <span className={`font-black text-sm ${dm ? "text-slate-300" : "text-slate-600"}`}>
                  #{b.id} {b.label}
                </span>
                <span className={`ml-auto text-xs capitalize font-semibold ${dm ? "text-slate-500" : "text-slate-400"}`}>{b.type}</span>
              </div>
              <div className={`grid grid-cols-2 divide-x ${dm ? "divide-slate-700" : "divide-slate-200"}`}>
                {[
                  { pid: "p1", name: p1Name, val: v1, col: "violet" },
                  { pid: "p2", name: p2Name, val: v2, col: "indigo" },
                ].map(({ pid, name, val, col }) => (
                  <button
                    key={pid}
                    onClick={() => setVotes((prev) => ({ ...prev, [b.id]: pid }))}
                    className={`p-4 text-center transition-all ${
                      voted === pid
                        ? col === "violet"
                          ? dm
                            ? "bg-violet-900/40 border-b-4 border-b-violet-500"
                            : "bg-violet-50 border-b-4 border-b-violet-500"
                          : dm
                            ? "bg-indigo-900/40 border-b-4 border-b-indigo-500"
                            : "bg-indigo-50 border-b-4 border-b-indigo-500"
                        : dm
                          ? "hover:bg-slate-700"
                          : "hover:bg-slate-50"
                    }`}
                  >
                    <p
                      className={`text-xs font-black uppercase tracking-widest mb-1 ${col === "violet" ? "text-violet-500" : "text-indigo-500"}`}
                    >
                      {name}
                    </p>
                    <p className={`text-xl font-black mb-2 ${dm ? "text-white" : "text-slate-800"}`}>{val}</p>
                    {voted === pid && <span className="text-2xl">👑</span>}
                  </button>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-5 text-white">
        <h4 className="font-black text-xl text-center mb-4">🏆 Scoreboard</h4>
        <div className="grid grid-cols-2 gap-4">
          {[
            { name: p1Name, score: voteCount("p1"), wins: p1Wins },
            { name: p2Name, score: voteCount("p2"), wins: p2Wins },
          ].map(({ name, score, wins }) => (
            <div key={name} className={`bg-white/20 rounded-xl p-4 text-center ${wins ? "ring-4 ring-white shadow-xl" : ""}`}>
              <p className="font-black text-3xl">{score}</p>
              <p className="font-semibold text-sm text-white/80">{name}</p>
              {wins && <p className="text-yellow-200 font-black text-xs mt-1">🏆 WINNING</p>}
            </div>
          ))}
        </div>
        <p className="text-center text-white/70 text-sm font-semibold mt-3">
          {Object.keys(votes).length}/{totalBlanks} blanks voted
        </p>
      </div>

      <button
        onClick={onBack}
        className={`w-full py-3 rounded-xl border-2 font-bold transition-colors flex items-center justify-center gap-2 ${dm ? "border-slate-600 text-slate-400 hover:border-violet-500" : "border-slate-200 text-slate-500 hover:border-violet-300"}`}
      >
        <RotateCcw size={16} /> Back
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  JSON IMPORT MODAL
// ═══════════════════════════════════════════════════════════════════════════════════════════════
function JsonImportModal({
  isOpen,
  onClose,
  onImport,
  darkMode,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImport: (payload: { templates: Template[]; learnerInfo?: any; notes?: string[] }) => void;
  darkMode: boolean;
}) {
  const [jsonInput, setJsonInput] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"instructions" | "template" | "paste">("instructions");
  const dm = darkMode;

  const [notice, setNotice] = useState("");

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const { fixed, fixes } = autoFixImportedJson(parsed);
      const result = validateImportedMadlibs(fixed);

      const notes = [...fixes, ...result.warnings];

      if (!result.ok) {
        setNotice("");
        const fixNote = fixes.length ? `\n\nAuto-fixes attempted:\n- ${fixes.slice(0, 6).join("\n- ")}` : "";
        setError(result.errors.slice(0, 12).join("\n") + fixNote);
        return;
      }

      setError("");
      setNotice(notes.length ? notes.slice(0, 10).join("\n") : "✅ JSON validated successfully.");

      onImport({ templates: result.templates, learnerInfo: fixed.learnerInfo, notes });
      onClose();
      setJsonInput("");
    } catch {
      setNotice("");
      setError("Invalid JSON format. Please check your input.");
    }
  };

  const copyTemplate = () => {
    navigator.clipboard.writeText(JSON_IMPORT_TEMPLATE);
  };

  const copyAIPrompt = () => {
    navigator.clipboard.writeText(AI_GENERATION_PROMPT);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-4xl max-h-[90vh] overflow-auto rounded-3xl shadow-2xl ${dm ? "bg-slate-800" : "bg-white"}`}
      >
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileJson size={28} className="text-white" />
            <div>
              <h2 className="text-2xl font-black text-white">AI Madlibs Generator</h2>
              <p className="text-emerald-100 text-sm font-semibold">Generate 5 themes × 3 moods = 15 stories</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Tab Bar */}
        <div className={`flex border-b ${dm ? "border-slate-700" : "border-slate-200"}`}>
          {[
            { id: "instructions", label: "🤖 AI Instructions", icon: "🎯" },
            { id: "template", label: "📋 JSON Template", icon: "📝" },
            { id: "paste", label: "📥 Paste & Import", icon: "✨" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 px-4 py-3 font-black text-sm transition-all ${
                activeTab === tab.id
                  ? dm
                    ? "bg-emerald-900/30 text-emerald-400 border-b-2 border-emerald-500"
                    : "bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500"
                  : dm
                    ? "text-slate-400 hover:text-slate-200"
                    : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* AI Instructions Tab */}
          {activeTab === "instructions" && (
            <div className="space-y-6">
              {/* Critical Rule Box */}
              <div className={`rounded-2xl border-2 overflow-hidden ${dm ? "border-amber-600 bg-amber-900/20" : "border-amber-400 bg-amber-50"}`}>
                <div className={`px-4 py-3 ${dm ? "bg-amber-900/40" : "bg-amber-100"}`}>
                  <h3 className={`font-black text-lg flex items-center gap-2 ${dm ? "text-amber-400" : "text-amber-800"}`}>
                    ⚠️ MANDATORY: 5 Themes × 3 Moods = 15 Madlibs
                  </h3>
                </div>
                <div className="p-4">
                  <p className={`font-semibold text-base leading-relaxed ${dm ? "text-amber-200" : "text-amber-900"}`}>
                    The AI <strong>MUST</strong> generate exactly <strong>15 madlibs stories</strong>:
                  </p>
                  <ul className={`mt-3 space-y-2 ${dm ? "text-amber-200" : "text-amber-900"}`}>
                    <li className="flex items-start gap-2 font-semibold">
                      <span className="text-lg">1️⃣</span>
                      <span>Select <strong>5 BEST THEMES</strong> based on learner interests</span>
                    </li>
                    <li className="flex items-start gap-2 font-semibold">
                      <span className="text-lg">2️⃣</span>
                      <span>For EACH theme, create <strong>3 DIFFERENT MOODS</strong></span>
                    </li>
                    <li className="flex items-start gap-2 font-semibold">
                      <span className="text-lg">3️⃣</span>
                      <span><strong>STRICTLY FOLLOW</strong> the learner's CEFR level</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Available Themes & Moods */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className={`rounded-xl border p-4 ${dm ? "border-slate-700 bg-slate-700/50" : "border-slate-200 bg-slate-50"}`}>
                  <h4 className={`font-black text-base mb-3 ${dm ? "text-white" : "text-slate-800"}`}>🎭 Available Themes (pick 5)</h4>
                  <div className="flex flex-wrap gap-2">
                    {["🐉 Fantasy", "🔍 Mystery", "🏛️ Historical", "☢️ Post-Apocalyptic", "🚬 Noir", "👸 Fairy Tale", "⚡ Mythology", "☕ Slice of Life", "🏆 Sports", "🎄 Holiday", "🌙 Dream/Surreal", "⏰ Time Travel", "🎌 Japanese Anime"].map((t) => (
                      <span key={t} className={`text-xs font-bold px-2 py-1 rounded-full ${dm ? "bg-slate-600 text-slate-200" : "bg-white text-slate-700 border border-slate-200"}`}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={`rounded-xl border p-4 ${dm ? "border-slate-700 bg-slate-700/50" : "border-slate-200 bg-slate-50"}`}>
                  <h4 className={`font-black text-base mb-3 ${dm ? "text-white" : "text-slate-800"}`}>🎨 Available Moods (pick 3 per theme)</h4>
                  <div className="flex flex-wrap gap-2">
                    {["😂 Hilarious", "💀 Gloomy", "⚔️ Epic", "🎭 Satirical", "💕 Romantic", "🤪 Absurd"].map((m) => (
                      <span key={m} className={`text-xs font-bold px-2 py-1 rounded-full ${dm ? "bg-slate-600 text-slate-200" : "bg-white text-slate-700 border border-slate-200"}`}>
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* CEFR Level Requirements */}
              <div className={`rounded-xl border p-4 ${dm ? "border-slate-700 bg-slate-700/50" : "border-slate-200 bg-slate-50"}`}>
                <h4 className={`font-black text-base mb-3 flex items-center gap-2 ${dm ? "text-white" : "text-slate-800"}`}>
                  <GraduationCap size={18} /> CEFR Level Requirements (MUST FOLLOW)
                </h4>
                <div className="grid md:grid-cols-3 gap-3 text-sm">
                  {[
                    { level: "A1", blanks: "6-8", vocab: "Basic 500 words", grammar: "Present/past simple only" },
                    { level: "A2", blanks: "8-10", vocab: "1000 words", grammar: "+ continuous tenses" },
                    { level: "B1", blanks: "10-14", vocab: "2500 words", grammar: "+ present perfect, conditionals 1-2" },
                    { level: "B2", blanks: "12-16", vocab: "5000 words", grammar: "+ all tenses, passive, conditionals 3" },
                    { level: "C1", blanks: "14-18", vocab: "Academic", grammar: "+ subjunctive, inversion" },
                    { level: "C2", blanks: "16-20", vocab: "Native-level", grammar: "Full complexity, idioms" },
                  ].map((c) => (
                    <div key={c.level} className={`p-3 rounded-lg ${dm ? "bg-slate-800" : "bg-white border border-slate-200"}`}>
                      <div className={`font-black text-lg ${dm ? "text-violet-400" : "text-violet-600"}`}>{c.level}</div>
                      <div className={`text-xs font-semibold ${dm ? "text-slate-400" : "text-slate-500"}`}>{c.blanks} blanks</div>
                      <div className={`text-xs ${dm ? "text-slate-400" : "text-slate-500"}`}>{c.vocab}</div>
                      <div className={`text-xs ${dm ? "text-slate-400" : "text-slate-500"}`}>{c.grammar}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Copy AI Prompt Button */}
              <div className="flex gap-4">
                <button
                  onClick={copyAIPrompt}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-black text-lg py-4 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
                >
                  <Copy size={20} /> Copy Full AI Prompt to Clipboard
                </button>
                <button
                  onClick={() => setActiveTab("paste")}
                  className={`flex-1 flex items-center justify-center gap-2 border-2 font-black text-lg py-4 rounded-2xl transition-colors ${dm ? "border-slate-600 text-slate-300 hover:border-emerald-500" : "border-slate-200 text-slate-600 hover:border-emerald-500"}`}
                >
                  Next: Paste JSON →
                </button>
              </div>
            </div>
          )}

          {/* JSON Template Tab */}
          {activeTab === "template" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className={`font-black text-sm uppercase tracking-widest ${dm ? "text-slate-300" : "text-slate-600"}`}>
                  JSON Structure Template
                </label>
                <button
                  onClick={copyTemplate}
                  className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700"
                >
                  <Copy size={14} /> Copy Template
                </button>
              </div>
              <pre
                className={`text-xs p-4 rounded-xl overflow-x-auto border max-h-[50vh] ${dm ? "bg-slate-900 border-slate-700 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"}`}
              >
                {JSON_IMPORT_TEMPLATE}
              </pre>
              <button
                onClick={() => setActiveTab("paste")}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-lg py-4 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
              >
                Next: Paste Your JSON →
              </button>
            </div>
          )}

          {/* Paste Tab */}
          {activeTab === "paste" && (
            <div className="space-y-4">
              <div className={`rounded-xl border p-4 ${dm ? "border-emerald-800 bg-emerald-900/20" : "border-emerald-200 bg-emerald-50"}`}>
                <h4 className={`font-black text-base flex items-center gap-2 ${dm ? "text-emerald-400" : "text-emerald-700"}`}>
                  ✅ Checklist Before Importing
                </h4>
                <ul className={`mt-2 space-y-1 text-sm font-semibold ${dm ? "text-emerald-200" : "text-emerald-800"}`}>
                  <li>☐ Contains exactly 15 madlibs (5 themes × 3 moods)</li>
                  <li>☐ All stories match learner's CEFR level</li>
                  <li>☐ Reflection questions target the lesson topic</li>
                  <li>☐ Each story has normalEnding and absurdEnding</li>
                </ul>
              </div>
              
              <div>
                <label className={`font-black text-sm uppercase tracking-widest mb-2 block ${dm ? "text-slate-300" : "text-slate-600"}`}>
                  Paste Your Generated JSON
                </label>
                <textarea
                  value={jsonInput}
                  onChange={(e) => {
                    setJsonInput(e.target.value);
                    setError("");
                  }}
                  placeholder='Paste your AI-generated JSON here... (must contain "madlibs" array with 15 stories)'
                  rows={12}
                  className={`w-full p-4 rounded-xl border-2 font-mono text-sm resize-none outline-none transition-colors ${
                    dm
                      ? "bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500"
                      : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500"
                  }`}
                />
                {error && (
                  <p className="text-red-500 text-sm font-bold mt-2 flex items-start gap-2 whitespace-pre-wrap">
                    <AlertCircle size={14} className="mt-0.5" />
                    <span>{error}</span>
                  </p>
                )}
                {notice && !error && (
                  <p className={`text-sm font-bold mt-2 flex items-start gap-2 whitespace-pre-wrap ${dm ? "text-emerald-300" : "text-emerald-700"}`}>
                    <span className="mt-0.5">✅</span>
                    <span>{notice}</span>
                  </p>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={onClose}
                  className={`flex-1 py-3 rounded-xl border-2 font-bold transition-colors ${dm ? "border-slate-600 text-slate-400 hover:border-slate-500" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!jsonInput.trim()}
                  className={`flex-1 py-3 rounded-xl font-black text-lg transition-all flex items-center justify-center gap-2 ${
                    jsonInput.trim()
                      ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg hover:scale-105"
                      : dm
                        ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <Upload size={20} /> Import {jsonInput.trim() ? "15" : ""} Madlibs
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  BEAT LINE — one branch paragraph, painted with a tone-coloured rail
// ═══════════════════════════════════════════════════════════════════════════════════════════════
function BeatLine({ text, tone, darkMode }: { text: string; tone?: Branch["tone"]; darkMode: boolean }) {
  const dm = darkMode;
  const rail =
    tone === "absurd"
      ? "from-rose-500 to-orange-500"
      : tone === "wild"
        ? "from-amber-500 to-pink-500"
        : "from-violet-500 to-indigo-500";
  return (
    <div className="relative pl-5">
      <span className={`absolute left-0 top-1 bottom-1 w-1 rounded-full bg-gradient-to-b ${rail}`} />
      <p className={`text-lg font-semibold leading-relaxed whitespace-pre-wrap ${dm ? "text-slate-200" : "text-slate-700"}`}>
        {text}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  TURN BAR — whose turn it is, the clock, and the live scoreboard
// ═══════════════════════════════════════════════════════════════════════════════════════════════
function TurnBar({
  players,
  scores,
  activePlayerId,
  secondsLeft,
  turnSeconds,
  turnMode,
  stealOpen,
  onToggleTurnMode,
  onSteal,
  onPass,
  darkMode,
}: {
  players: Player[];
  scores: Record<string, number>;
  activePlayerId: string | null;
  secondsLeft: number;
  turnSeconds: number;
  turnMode: boolean;
  stealOpen: boolean;
  onToggleTurnMode: () => void;
  onSteal: () => void;
  onPass: () => void;
  darkMode: boolean;
}) {
  const dm = darkMode;
  const best = Math.max(0, ...players.map((p) => scores[p.id] ?? 0));
  const pct = turnSeconds > 0 ? Math.max(0, Math.min(100, (secondsLeft / turnSeconds) * 100)) : 0;
  const urgent = secondsLeft <= 8;

  return (
    <div
      className={`rounded-2xl border-2 overflow-hidden shadow-lg ${
        dm ? "bg-slate-800 border-slate-700" : "bg-white border-violet-100"
      }`}
    >
      <div className={`flex items-center gap-3 px-4 py-2.5 ${dm ? "bg-slate-700/60" : "bg-violet-50"}`}>
        <Trophy size={18} className="text-amber-500" />
        <span className={`font-black text-sm uppercase tracking-widest ${dm ? "text-slate-300" : "text-slate-600"}`}>
          Turn Scoreboard
        </span>
        <button
          onClick={onToggleTurnMode}
          className={`ml-auto text-xs font-black px-3 py-1.5 rounded-full border-2 transition-colors ${
            turnMode
              ? "border-violet-500 text-violet-600 bg-violet-50"
              : dm
                ? "border-slate-600 text-slate-400"
                : "border-slate-200 text-slate-400"
          }`}
          title="Turn-based play rotates the blanks between the players"
        >
          {turnMode ? "🎯 Turns ON" : "🎯 Turns OFF"}
        </button>
      </div>

      <div className="p-4 flex flex-wrap items-center gap-3">
        {players.map((p) => {
          const isActive = turnMode && p.id === activePlayerId;
          const score = scores[p.id] ?? 0;
          return (
            <div
              key={p.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all ${
                isActive
                  ? "border-violet-500 shadow-md scale-[1.03]"
                  : dm
                    ? "border-slate-700"
                    : "border-slate-200"
              }`}
              style={{ background: isActive ? `${p.color ?? "#8b5cf6"}18` : "transparent" }}
            >
              <span className="text-xl">{p.emoji ?? "🎭"}</span>
              <div className="leading-tight">
                <div className={`font-black text-sm ${dm ? "text-white" : "text-slate-800"}`}>{p.name}</div>
                <div className={`font-bold text-xs ${dm ? "text-slate-400" : "text-slate-500"}`}>
                  {score} pts {score === best && best > 0 ? "👑" : ""}
                </div>
              </div>
              {isActive && <span className="text-xs font-black text-violet-500">TURN</span>}
            </div>
          );
        })}

        {turnMode && activePlayerId && (
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Timer size={16} className={urgent ? "text-rose-500" : "text-violet-500"} />
              <span className={`font-black text-lg tabular-nums ${urgent ? "text-rose-500" : dm ? "text-slate-200" : "text-slate-700"}`}>
                {secondsLeft}s
              </span>
            </div>
            <button
              onClick={onPass}
              className={`text-xs font-black px-3 py-2 rounded-xl border-2 transition-colors ${
                dm ? "border-slate-600 text-slate-300 hover:border-violet-500" : "border-slate-200 text-slate-500 hover:border-violet-300"
              }`}
            >
              ⏭ Pass
            </button>
          </div>
        )}
      </div>

      {turnMode && (
        <div className={`h-1.5 ${dm ? "bg-slate-700" : "bg-slate-100"}`}>
          <motion.div
            className={`h-full ${urgent ? "bg-gradient-to-r from-rose-500 to-orange-500" : "bg-gradient-to-r from-violet-500 to-fuchsia-500"}`}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      )}

      <AnimatePresence>
        {stealOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`px-4 py-3 flex items-center gap-3 flex-wrap border-t ${dm ? "bg-rose-900/30 border-rose-800" : "bg-rose-50 border-rose-200"}`}
          >
            <span className="text-2xl">⏰</span>
            <p className={`font-black ${dm ? "text-rose-300" : "text-rose-700"}`}>
              Time! The blank is open — anyone can steal it.
            </p>
            <button
              onClick={onSteal}
              className="ml-auto bg-gradient-to-r from-rose-500 to-orange-500 text-white font-black px-5 py-2.5 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
            >
              😈 Steal it
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  BRANCH ROUND — "what happens next": pick a path, fill its fresh blanks
// ═══════════════════════════════════════════════════════════════════════════════════════════════
function BranchRound({
  template,
  branches,
  players,
  difficulty,
  roundsLeft,
  onDone,
  onSkip,
  darkMode,
}: {
  template: Template;
  branches: Branch[];
  players: Player[];
  difficulty: DifficultyState;
  roundsLeft: number;
  onDone: (branch: Branch, answers: Record<string, string>) => void;
  onSkip: () => void;
  darkMode: boolean;
}) {
  const dm = darkMode;
  const [chosen, setChosen] = useState<Branch | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [coach, setCoach] = useState<Record<string, CoachNote>>({});
  const cap = suggestionLimit(difficulty);

  const filled = chosen ? chosen.blanks.every((b) => answers[b.id]?.trim()) : false;

  const handleAnswer = (blank: Blank, value: string) => {
    const first = !answers[blank.id]?.trim() && value.trim().length > 0;
    setAnswers((prev) => ({ ...prev, [blank.id]: value }));
    if (first) setCoach((prev) => ({ ...prev, [blank.id]: coachAnswer(blank, value) }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3">
          <GitBranch size={26} />
          <div>
            <h3 className="text-2xl font-black">What happens next?</h3>
            <p className="text-violet-200 font-semibold">
              Round {3 - roundsLeft} of 2 · the class writes its own continuation of “{template.title}”.
            </p>
          </div>
        </div>
      </div>

      {!chosen && (
        <div className="grid md:grid-cols-3 gap-4">
          {branches.map((b) => (
            <motion.button
              key={b.id}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setChosen(b);
                setAnswers({});
                setCoach({});
              }}
              className={`text-left rounded-2xl border-2 p-5 shadow-md transition-colors ${
                dm ? "bg-slate-800 border-slate-700 hover:border-violet-500" : "bg-white border-slate-200 hover:border-violet-400"
              }`}
            >
              <span className="text-3xl block mb-2">
                {b.tone === "absurd" ? "🤪" : b.tone === "wild" ? "🌀" : "🎬"}
              </span>
              <h4 className={`font-black text-base leading-snug ${dm ? "text-white" : "text-slate-800"}`}>{b.label}</h4>
              <p className={`text-xs font-bold mt-2 ${dm ? "text-slate-400" : "text-slate-500"}`}>
                {b.blanks.length} new words
              </p>
            </motion.button>
          ))}
        </div>
      )}

      {chosen && (
        <div className="space-y-4">
          <div className={`rounded-2xl border-2 p-5 ${dm ? "bg-slate-800/60 border-indigo-700" : "bg-indigo-50 border-indigo-200"}`}>
            <p className={`text-xs font-black uppercase tracking-widest mb-2 ${dm ? "text-indigo-300" : "text-indigo-600"}`}>
              The class chose
            </p>
            <p className={`font-black text-xl ${dm ? "text-white" : "text-slate-800"}`}>{chosen.label}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {chosen.blanks.map((b, i) => (
              <BlankCard
                key={b.id}
                blank={b}
                players={players}
                value={answers[b.id] || ""}
                onChange={(_, v) => handleAnswer(b, v)}
                index={i}
                filled={!!answers[b.id]?.trim()}
                coach={coach[b.id] ?? null}
                owner={players[i % Math.max(1, players.length)] ?? null}
                suggestionCap={cap}
                darkMode={darkMode}
              />
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <button
              onClick={() => setChosen(null)}
              className={`md:w-44 py-4 rounded-2xl border-2 font-black transition-colors ${
                dm ? "border-slate-600 text-slate-300 hover:border-violet-500" : "border-slate-200 text-slate-500 hover:border-violet-300"
              }`}
            >
              ↩ Pick another path
            </button>
            <button
              onClick={() => onDone(chosen, answers)}
              disabled={!filled}
              className={`flex-1 py-4 rounded-2xl font-black text-xl flex items-center justify-center gap-2 transition-all ${
                filled
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xl hover:scale-[1.01] active:scale-[0.99]"
                  : dm
                    ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
            >
              <Sparkles size={22} /> Add this beat to the story
            </button>
          </div>
        </div>
      )}

      <button
        onClick={onSkip}
        className={`w-full py-3 rounded-xl border-2 font-bold transition-colors flex items-center justify-center gap-2 ${
          dm ? "border-slate-600 text-slate-400 hover:border-violet-500" : "border-slate-200 text-slate-500 hover:border-violet-300"
        }`}
      >
        <GitBranch size={16} /> Skip the extra beat and go to the ending
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  VOCAB REVIEW — spaced repetition over the words the class produced
// ═══════════════════════════════════════════════════════════════════════════════════════════════
function VocabReview({
  queue,
  totalBank,
  mastered,
  onGrade,
  onDone,
  onExport,
  darkMode,
}: {
  queue: VocabWord[];
  totalBank: number;
  mastered: number;
  onGrade: (id: string, recalled: boolean) => void;
  onDone: () => void;
  onExport: () => void;
  darkMode: boolean;
}) {
  const dm = darkMode;
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const current = queue[index];

  const grade = (recalled: boolean) => {
    if (!current) return;
    onGrade(current.id, recalled);
    setRevealed(false);
    setIndex((i) => i + 1);
  };

  if (!current) {
    return (
      <div className={`rounded-3xl border-2 p-8 text-center ${dm ? "bg-slate-800 border-slate-700" : "bg-white border-violet-100"}`}>
        <div className="text-6xl mb-3">📚</div>
        <h3 className={`text-2xl font-black mb-1 ${dm ? "text-white" : "text-slate-800"}`}>Word bank up to date</h3>
        <p className={`font-semibold mb-6 ${dm ? "text-slate-400" : "text-slate-500"}`}>
          {totalBank} words collected · {mastered} mastered. The next review is scheduled automatically.
        </p>
        <div className="flex flex-col md:flex-row gap-3 justify-center">
          <button
            onClick={onExport}
            className="px-6 py-3 rounded-2xl border-2 border-emerald-400 text-emerald-600 font-black hover:bg-emerald-50 transition-colors"
          >
            <Download size={18} className="inline mr-2" /> Export word bank (CSV)
          </button>
          <button
            onClick={onDone}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-black shadow-lg hover:scale-105 transition-transform"
          >
            ✅ Back to the story
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <BookMarked size={22} className="text-violet-500" />
        <h3 className={`text-xl font-black ${dm ? "text-white" : "text-slate-800"}`}>
          Word review {index + 1} / {queue.length}
        </h3>
        <span className={`ml-auto text-sm font-bold ${dm ? "text-slate-400" : "text-slate-500"}`}>
          {totalBank} collected · {mastered} mastered
        </span>
      </div>

      <div
        className={`rounded-3xl border-2 p-8 text-center shadow-xl ${dm ? "bg-slate-800 border-slate-700" : "bg-white border-violet-200"}`}
      >
        <p className={`text-xs font-black uppercase tracking-widest mb-3 ${dm ? "text-slate-400" : "text-slate-500"}`}>
          Which word did you use here?
        </p>
        <p className={`font-black text-xl mb-1 ${dm ? "text-white" : "text-slate-800"}`}>{current.type} blank</p>
        <p className={`font-semibold mb-6 ${dm ? "text-slate-400" : "text-slate-400"}`}>in “{current.templateTitle}”</p>

        {revealed ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <div className={`inline-block rounded-2xl px-8 py-5 mb-6 border-4 ${dm ? "bg-violet-900/40 border-violet-600" : "bg-violet-50 border-violet-300"}`}>
              <span className={`text-3xl font-black ${dm ? "text-violet-200" : "text-violet-700"}`}>{current.word}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => grade(true)}
                className="py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black hover:scale-[1.02] transition-transform"
              >
                ✅ I remembered it
              </button>
              <button
                onClick={() => grade(false)}
                className="py-4 rounded-2xl border-2 border-rose-300 text-rose-600 font-black hover:bg-rose-50 transition-colors"
              >
                🔁 Not yet
              </button>
            </div>
          </motion.div>
        ) : (
          <button
            onClick={() => setRevealed(true)}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-black text-lg shadow-lg hover:scale-105 transition-transform"
          >
            🔍 Reveal the word
          </button>
        )}
      </div>

      <p className={`text-center text-sm font-semibold ${dm ? "text-slate-500" : "text-slate-400"}`}>
        Remembered words move days up the schedule (1 → 3 → 7 → 16 → 35); “not yet” brings them back today.
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  PHASE TAB BAR CONFIG
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const PHASES: { key: GamePhase; label: string; icon: string }[] = [
  { key: "SELECT", label: "Theme", icon: "🎭" },
  { key: "FILL", label: "Fill In", icon: "✏️" },
  { key: "REVEAL_REEL", label: "Reveal", icon: "🎬" },
  { key: "STORY", label: "Story", icon: "📖" },
  { key: "BRANCH", label: "What Next", icon: "🔀" },
  { key: "SWIPE_ENDING", label: "Ending", icon: "🏁" },
  { key: "PEER_FILL", label: "Challenge", icon: "⚔️" },
  { key: "REVIEW", label: "Word Bank", icon: "📚" },
];

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  MAIN MADLIBS TOOL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════════════════════
export function MadlibsTool({
  payload,
  players,
  topic = "General English",
  level = "B1",
  location = "",
  packNote,
  darkMode: darkModeProp = false,
  onDarkModeChange,
  onExit,
  onHome,
}: {
  payload?: Payload;
  players?: Player[];
  /** lesson focus chosen on the setup page */
  topic?: string;
  /** CEFR band the coach calibrates against */
  level?: string;
  /** story setting written by the teacher */
  location?: string;
  /** one-line note about the AI pack that was just loaded */
  packNote?: string | null;
  darkMode?: boolean;
  onDarkModeChange?: (v: boolean) => void;
  /** back to the setup page */
  onExit?: () => void;
  /** back to the splash screen */
  onHome?: () => void;
}) {
  // The shell already handed us the class, so these ARE the players.
  const allPlayers = useMemo<Player[]>(() => (players?.length ? players : DEMO_PLAYERS), [players]);
  const externalTemplates: Template[] = payload?.madlibs ?? [];

  // A saved session is picked up when the splash's “Continue saved game” was used.
  const restored = useMemo(() => loadSession(), []);

  const [phase, setPhase] = useState<GamePhase>(restored?.phase ?? "SELECT");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(restored?.template ?? null);
  const [answers, setAnswers] = useState<Record<string, string>>(restored?.answers ?? {});
  const [beats, setBeats] = useState<StoryBeat[]>(restored?.beats ?? []);
  const [branchRoundsLeft, setBranchRoundsLeft] = useState(2);
  const [showConfetti, setShowConfetti] = useState(false);
  const [score, setScore] = useState(0);
  const [scoreAtStoryStart, setScoreAtStoryStart] = useState(0);
  const [streak, setStreak] = useState(0);

  // turn-based play: every blank belongs to a player, the clock can open it up
  const [scores, setScores] = useState<Record<string, number>>(restored?.scores ?? {});
  const [ownership, setOwnership] = useState<Record<string, number>>({});
  const [currentPlayer, setCurrentPlayer] = useState(restored?.currentPlayer ?? 0);
  const [turnMode, setTurnMode] = useState(true);
  const [turnSeconds, setTurnSeconds] = useState(45);
  const [secondsLeft, setSecondsLeft] = useState(45);
  const [stealOpen, setStealOpen] = useState(false);

  // grammar coach + adaptive difficulty
  const [coachNotes, setCoachNotes] = useState<Record<string, CoachNote>>({});
  const [difficulty, setDifficulty] = useState<DifficultyState>(restored?.difficulty ?? initialDifficulty);

  // vocabulary bank (persisted) + the review queue built from what is due
  const [vocab, setVocab] = useState<VocabWord[]>(() => loadVocab());
  const [reviewQueue, setReviewQueue] = useState<VocabWord[]>([]);
  const [lastCollected, setLastCollected] = useState({ added: 0, reused: 0 });

  const [sessionCompleted, setSessionCompleted] = useState(restored?.sessionCompleted ?? 0);
  const [reflections, setReflections] = useState<string[]>(restored?.reflections ?? []);
  const [recapOpen, setRecapOpen] = useState(false);
  const [recapText, setRecapText] = useState<string>("");

  const [darkMode, setDarkMode] = useState(darkModeProp);
  const [showAbsurdWarning, setShowAbsurdWarning] = useState(false);
  /** stories pasted mid-lesson through the in-game importer, on top of the shell's pack */
  const [customTemplates, setCustomTemplates] = useState<Template[]>([]);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [themeFilter, setThemeFilter] = useState<string>("all");
  const [moodFilter, setMoodFilter] = useState<string>("all");
  const [cefrFilter, setCefrFilter] = useState<string>("all");

  useEffect(() => setDarkMode(darkModeProp), [darkModeProp]);
  const toggleDark = () => {
    setDarkMode((d) => {
      onDarkModeChange?.(!d);
      return !d;
    });
  };

  // Variety/Combo scoring
  const usedWordsRef = useRef<Set<string>>(new Set());
  const [comboChain, setComboChain] = useState(0);
  const [comboMult, setComboMult] = useState(1);
  const [scoreToast, setScoreToast] = useState<string | null>(null);

  // Optional voice mode (Web Speech API)
  const [voiceMode, setVoiceMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceRate, setVoiceRate] = useState(1);
  const [voicePitch, setVoicePitch] = useState(1);
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  /** the lesson arc (warm-up → main quest → finale) is always on in class mode */
  const sessionMode = true;

  // Combine all templates: built-in library + the shell's AI pack + anything
  // pasted mid-lesson through the teacher's importer.
  const allTemplates = useMemo(() => {
    return [...TEMPLATE_DATABASE, ...externalTemplates, ...customTemplates];
  }, [externalTemplates, customTemplates]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return allTemplates.filter((t) => {
      if (themeFilter !== "all" && !t.theme.toLowerCase().includes(themeFilter.toLowerCase())) return false;
      if (moodFilter !== "all" && !t.mood.toLowerCase().includes(moodFilter.toLowerCase())) return false;
      if (cefrFilter !== "all" && t.cefrLevel !== cefrFilter) return false;
      return true;
    });
  }, [allTemplates, themeFilter, moodFilter, cefrFilter]);

  const isAllFilled = selectedTemplate ? selectedTemplate.blanks.every((b) => answers[b.id]?.trim()) : false;

  const filledCount = selectedTemplate ? selectedTemplate.blanks.filter((b) => answers[b.id]?.trim()).length : 0;

  const totalBlanks = selectedTemplate?.blanks.length ?? 0;
  const pct = totalBlanks > 0 ? Math.round((filledCount / totalBlanks) * 100) : 0;

  const lessonTopic = topic;
  const supportsTts = typeof window !== "undefined" && "speechSynthesis" in window;

  // ── turn-based play ───────────────────────────────────────────────────────
  // A blank belongs to a player from the moment the story is picked. The first
  // unfilled blank is the one in play; if its owner lets the clock run out, the
  // class can steal it.
  const activeBlank = useMemo(
    () => (selectedTemplate?.blanks ?? []).find((b) => !answers[b.id]?.trim()) ?? null,
    [selectedTemplate, answers],
  );
  const activeOwnerIndex = activeBlank ? ownership[activeBlank.id] ?? currentPlayer : currentPlayer;
  const activePlayer = allPlayers[activeOwnerIndex] ?? allPlayers[0] ?? null;
  const suggestionCap = suggestionLimit(difficulty);

  // one tick per second while a turn is running
  useEffect(() => {
    if (phase !== "FILL" || !turnMode || !activeBlank || stealOpen) return;
    const t = window.setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, [phase, turnMode, activeBlank, stealOpen]);

  // the clock ran out → the blank is open to steal
  useEffect(() => {
    if (phase === "FILL" && turnMode && activeBlank && secondsLeft === 0 && !stealOpen) setStealOpen(true);
  }, [phase, turnMode, activeBlank, secondsLeft, stealOpen]);

  // ── persistence: every meaningful change is saved, so nothing is lost ─────
  useEffect(() => {
    if (!selectedTemplate) return;
    saveSession({
      version: 1,
      savedAt: Date.now(),
      phase,
      template: selectedTemplate,
      answers,
      beats,
      scores,
      currentPlayer: activeOwnerIndex,
      sessionCompleted,
      reflections,
      players: allPlayers,
      difficulty,
      topic: lessonTopic,
      level,
      location,
    } satisfies SavedSession);
  }, [phase, selectedTemplate, answers, beats, scores, activeOwnerIndex, sessionCompleted, reflections, difficulty]);

  // Load voices when voice mode is used
  useEffect(() => {
    if (!voiceMode || !supportsTts) return;
    const synth = window.speechSynthesis;
    const load = () => {
      const voices = synth.getVoices();
      if (voices?.length) setAvailableVoices(voices);
    };
    load();
    synth.onvoiceschanged = load;
    return () => {
      // Some browsers type this as EventHandler | null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (synth as any).onvoiceschanged = null;
    };
  }, [voiceMode, supportsTts]);

  const stopSpeaking = () => {
    if (!supportsTts) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const speak = (text: string, mode: "story" | "commentator" = "story") => {
    if (!supportsTts) return;
    stopSpeaking();
    const utter = new SpeechSynthesisUtterance(text);

    const voice = availableVoices[voiceIndex];
    if (voice) utter.voice = voice;

    utter.rate = voiceRate;
    utter.pitch = mode === "commentator" ? Math.min(2, voicePitch + 0.3) : voicePitch;

    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utter);
  };

  /**
   * One blank, one turn. The coach reads the FORM of the word, the clock decides
   * the speed bonus, the owner banks the points — and a steal pays the player who
   * rescued the blank instead.
   */
  const handleAnswer = (id: string, value: string) => {
    const raw = value.trim();
    const wasEmpty = !answers[id]?.trim();
    const selectedBlank = selectedTemplate?.blanks.find((b) => b.id === id) ?? null;

    if (selectedTemplate && selectedBlank && wasEmpty && raw.length > 0) {
      const note = coachAnswer(selectedBlank, raw);
      setCoachNotes((prev) => ({ ...prev, [id]: note }));
      setDifficulty((d) => recordAnswer(d, selectedBlank.type, note.ok));

      const ownerIndex = ownership[id] ?? currentPlayer;
      const owner = allPlayers[ownerIndex] ?? allPlayers[0];
      const stealerIndex = (ownerIndex + 1) % Math.max(1, allPlayers.length);
      const bankedTo = stealOpen ? allPlayers[stealerIndex] ?? owner : owner;

      const speed = Math.max(0, Math.min(1, secondsLeft / Math.max(1, turnSeconds)));
      const norm = raw.toLowerCase();
      const isUnique = !usedWordsRef.current.has(norm);
      if (isUnique) usedWordsRef.current.add(norm);

      const base = note.ok ? 10 : 3;
      const variety = isUnique ? 6 : -5;
      const speedBonus = note.ok ? Math.round(6 * speed) : 0;
      const newChain = isUnique ? comboChain + 1 : 0;
      const mult = 1 + Math.min(0.75, Math.floor(newChain / 3) * 0.25);
      const stealMult = stealOpen ? 1.5 : 1;
      const delta = Math.max(
        1,
        Math.round((base + note.bonus + variety + speedBonus) * mult * stealMult),
      );

      if (bankedTo) setScores((prev) => ({ ...prev, [bankedTo.id]: (prev[bankedTo.id] ?? 0) + delta }));
      if (stealOpen) setOwnership((prev) => ({ ...prev, [id]: stealerIndex }));

      setComboChain(newChain);
      setComboMult(mult);
      setScore((s) => s + delta);
      setStreak((s) => s + 1);
      setStealOpen(false);
      setSecondsLeft(turnSeconds);
      setCurrentPlayer((prev) => (prev + 1) % Math.max(1, allPlayers.length));

      const tags = [
        ...note.tags,
        isUnique ? "+unique" : "-repeat",
        stealOpen ? "STEAL x1.5" : speedBonus > 2 ? "+fast" : "",
      ]
        .filter(Boolean)
        .join(" ");
      setScoreToast(`${bankedTo?.name ?? "Player"} +${delta} · ${tags} · x${mult.toFixed(2)}`);
      window.setTimeout(() => setScoreToast(null), 1800);
    }

    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  /** steal the blank the clock just opened */
  const handleSteal = () => {
    if (!activeBlank) return;
    const stealerIndex = (activeOwnerIndex + 1) % Math.max(1, allPlayers.length);
    const stealer = allPlayers[stealerIndex];
    setOwnership((prev) => ({ ...prev, [activeBlank.id]: stealerIndex }));
    setStealOpen(false);
    setSecondsLeft(turnSeconds);
    setScoreToast(`😈 ${stealer?.name ?? "Player"} steals blank #${activeBlank.id} — 1.5× points if the form is right!`);
    window.setTimeout(() => setScoreToast(null), 2200);
  };

  /** hand the blank on without a fight */
  const handlePass = () => {
    if (!activeBlank) return;
    const nextIndex = (activeOwnerIndex + 1) % Math.max(1, allPlayers.length);
    setOwnership((prev) => ({ ...prev, [activeBlank.id]: nextIndex }));
    setStealOpen(false);
    setSecondsLeft(turnSeconds);
  };

  /**
   * Start a story. This is the ONLY place the per-story state is cleared — it is
   * deliberately not an effect on `selectedTemplate`, because that also fires on
   * mount and would wipe a session restored from localStorage.
   */
  const handleSelectTemplate = (t: Template) => {
    setSelectedTemplate(t);
    setAnswers({});
    setBeats([]);
    setBranchRoundsLeft(2);
    setScoreAtStoryStart(score);
    setStreak(0);
    usedWordsRef.current = new Set();
    setComboChain(0);
    setComboMult(1);
    setScoreToast(null);
    setCoachNotes({});
    setStealOpen(false);
    setSecondsLeft(turnSeconds);

    // Deal the blanks round-robin so every learner owns a fair share of the story.
    const deal: Record<string, number> = {};
    const count = Math.max(1, allPlayers.length);
    t.blanks.forEach((b, i) => {
      deal[b.id] = (currentPlayer + i) % count;
    });
    setOwnership(deal);
    setPhase("FILL");
  };

  const handleAbsurdFill = () => {
    if (!selectedTemplate) return;
    const newAnswers: Record<string, string> = {};
    const used = new Set<string>();
    selectedTemplate.blanks.forEach((b) => {
      const w = pickAbsurd(b.type);
      newAnswers[b.id] = w;
      used.add(w.trim().toLowerCase());
    });
    usedWordsRef.current = used;
    setComboChain(0);
    setComboMult(1);
    setCoachNotes({});
    setStealOpen(false);
    setAnswers(newAnswers);
    setShowAbsurdWarning(true);
    setScore((s) => s + 50);
    setTimeout(() => setShowAbsurdWarning(false), 3000);
  };

  const handleGenerateStory = () => {
    if (!isAllFilled) return;
    setShowConfetti(true);
    setScore((s) => s + 100);
    setStreak(0);
    setStealOpen(false);
    setTimeout(() => setShowConfetti(false), 3000);
    setPhase("REVEAL_REEL");
  };

  const exportHomeworkHtml = () => {
    if (!selectedTemplate) return;
    const html = buildExportHtml(selectedTemplate, answers);
    downloadTextFile(`tutorly-madlibs-${selectedTemplate.id}.html`, html, "text/html;charset=utf-8");
  };

  const exportHomeworkPdf = () => {
    if (!selectedTemplate) return;
    const html = buildExportHtml(selectedTemplate, answers);
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    window.setTimeout(() => {
      try { w.print(); } catch { /* ignore */ }
    }, 400);
  };

  const completeStoryAndContinueSession = (ending: "normal" | "absurd") => {
    if (!selectedTemplate) return;

    stopSpeaking();

    const nextCompleted = sessionCompleted + 1;
    const gained = Math.max(0, score - scoreAtStoryStart);

    const acts = [
      { name: "Warm-up", goal: 1, tip: "Keep it fun and fast. Focus on confidence." },
      { name: "Main Quest", goal: 3, tip: "Switch themes/moods. Push target grammar in sentences." },
      { name: "Tournament / Finale", goal: 4, tip: "Do Peer Challenge + pick canon ending + export homework." },
    ] as const;

    const actIndex = nextCompleted <= acts[0].goal ? 0 : nextCompleted <= acts[1].goal ? 1 : 2;
    const isCheckpoint = nextCompleted === 1 || nextCompleted === 3 || nextCompleted === 4;

    const keyWords = selectedTemplate.blanks
      .map((b) => (answers[b.id] ?? "").trim())
      .filter(Boolean)
      .slice(0, 10)
      .join(", ");

    // Every word the class produced — base blanks and branch beats — lands in
    // the bank, which schedules the next review for each one.
    const inputs = [
      ...selectedTemplate.blanks.map((b) => ({
        word: answers[b.id] ?? "",
        type: b.type,
        templateId: selectedTemplate.id,
        templateTitle: selectedTemplate.title,
      })),
      ...beats.flatMap((beat) =>
        Object.values(beat.answers).map((word) => ({
          word,
          type: "branch",
          templateId: selectedTemplate.id,
          templateTitle: selectedTemplate.title,
        })),
      ),
    ].filter((v) => v.word.trim());

    const collected = collectWords(vocab, inputs);
    setVocab(collected.bank);
    saveVocab(collected.bank);
    setLastCollected({ added: collected.added.length, reused: collected.reused.length });

    const mvp = allPlayers
      .map((p) => ({ name: p.name, score: scores[p.id] ?? 0 }))
      .sort((a, b) => b.score - a.score)[0];
    const targetLevel = adaptLevel(difficulty, selectedTemplate.cefrLevel);

    setSessionCompleted(nextCompleted);
    setRecapText(
      `ACT ${actIndex + 1}/3 – ${acts[actIndex].name}\n` +
        (isCheckpoint ? "✅ CHECKPOINT REACHED!\n" : "") +
        `Story completed: ${selectedTemplate.title}\n` +
        `Ending chosen: ${ending.toUpperCase()}\n` +
        `Beats added: ${beats.length}\n` +
        `Points gained this story: +${gained}\n` +
        `🏆 MVP: ${mvp?.name ?? "the class"} (${mvp?.score ?? 0} pts)\n` +
        `🎚️ Coach: ${difficultyLabel(difficulty)}` +
        (targetLevel !== selectedTemplate.cefrLevel ? ` → next story at ${targetLevel}\n` : "\n") +
        `🧑‍🏫 ${weakSpotSummary(difficulty)}\n` +
        `📚 Word bank: +${collected.added.length} new · ${collected.reused.length} reused · ${masteredCount(collected.bank)} mastered\n` +
        (lessonTopic ? `Lesson focus: ${lessonTopic}\n` : "") +
        (keyWords ? `Key words: ${keyWords}\n` : "") +
        `Next: ${acts[actIndex].tip}`,
    );
    setRecapOpen(true);

    if (isCheckpoint) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1800);
    }
  };

  /**
   * Stories pasted from the in-game teacher tool are appended to this lesson's
   * library — the class roster and the session stay exactly where they are.
   */
  const handleImportTemplates = (payload: { templates: Template[]; learnerInfo?: unknown; notes?: string[] }) => {
    setCustomTemplates((prev) => [...prev, ...payload.templates]);
    setScoreToast(`📥 ${payload.templates.length} stories added to this lesson`);
    window.setTimeout(() => setScoreToast(null), 2200);
  };

  /** append a finished branch beat to the running story */
  const handleBranchDone = (branch: Branch, branchAnswers: Record<string, string>) => {
    // A double-click must not append the same beat twice. The click guard is a
    // ref, not state, because the second click lands before React re-renders.
    if (beats.some((b) => b.branchId === branch.id)) return;
    const text = fillBeat(branch.beat, branchAnswers);
    setBeats((prev) =>
      prev.some((b) => b.branchId === branch.id)
        ? prev
        : [...prev, { branchId: branch.id, label: branch.label, text, answers: branchAnswers }],
    );
    setBranchRoundsLeft((n) => Math.max(0, n - 1));
    setScore((s) => s + 80);
    setScoreToast("🎬 +80 · the class just wrote a new beat");
    window.setTimeout(() => setScoreToast(null), 2000);
    setReflections((prev) => {
      const addition = ["Commit to a path in the story", `Branch taken: ${branch.label}`];
      return [...prev, ...addition].slice(-12);
    });
    setPhase("STORY");
  };

  /** open the word bank for a spaced-repetition round */
  const startVocabularyReview = () => {
    const due = dueVocab(vocab, Date.now(), 8);
    const queue = due.length
      ? due
      : [...vocab].sort((a, b) => a.strength - b.strength).slice(0, 6);
    setReviewQueue(queue);
    setPhase("REVIEW");
  };

  const handleGradeWord = (id: string, recalled: boolean) => {
    setVocab((prev) => {
      const next = reviewWord(prev, id, recalled);
      saveVocab(next);
      return next;
    });
  };

  const exportVocab = () => {
    downloadTextFile("tutorly-madlibs-word-bank.csv", vocabCsv(vocab), "text/csv;charset=utf-8");
  };

  const goToPhase = (p: GamePhase) => {
    if (p === "FILL" && !selectedTemplate) return;
    if (
      (p === "REVEAL_REEL" || p === "STORY" || p === "SWIPE_ENDING" || p === "PEER_FILL" || p === "BRANCH") &&
      !isAllFilled
    )
      return;
    if (p === "REVIEW") {
      startVocabularyReview();
      return;
    }
    setPhase(p);
  };

  const dm = darkMode;

  // Get unique values for filters
  const uniqueThemes = useMemo(() => {
    const themes = new Set(allTemplates.map((t) => t.theme.split(" ")[0]));
    return Array.from(themes);
  }, [allTemplates]);

  const uniqueMoods = useMemo(() => {
    const moods = new Set(allTemplates.map((t) => t.mood.split(" ")[0]));
    return Array.from(moods);
  }, [allTemplates]);

  return (
    <div
      className={`min-h-screen font-nunito transition-colors duration-300 ${dm ? "bg-slate-900" : "bg-gradient-to-br from-violet-50 via-white to-fuchsia-50"}`}
    >
      {showConfetti && <ConfettiBurst />}

      <AnimatePresence>
        {scoreToast && (
          <motion.div
            key={scoreToast}
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl border-2 font-black text-base ${
              dm
                ? "bg-slate-800 border-violet-600 text-violet-200"
                : "bg-white border-violet-200 text-violet-700"
            }`}
          >
            {scoreToast}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {recapOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setRecapOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden ${dm ? "bg-slate-800" : "bg-white"}`}
            >
              <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 p-6">
                <h3 className="text-3xl font-black text-white">🎯 Session Checkpoint</h3>
                <p className="text-violet-200 font-semibold">Warm-up → Main Quest → Tournament / Finale</p>
              </div>
              <div className="p-6 space-y-4">
                <pre className={`whitespace-pre-wrap text-lg font-semibold leading-relaxed ${dm ? "text-slate-200" : "text-slate-700"}`}>{recapText}</pre>

                <div className={`rounded-2xl border p-4 ${dm ? "border-slate-700 bg-slate-700/40" : "border-slate-200 bg-slate-50"}`}>
                  <div className={`font-black ${dm ? "text-white" : "text-slate-800"}`}>Session Progress</div>
                  <div className={`mt-2 font-semibold ${dm ? "text-slate-300" : "text-slate-600"}`}>
                    Completed stories: <span className="font-black">{sessionCompleted}</span> / 4
                  </div>
                  <div className={`mt-2 h-3 rounded-full overflow-hidden ${dm ? "bg-slate-700" : "bg-slate-200"}`}>
                    <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: `${Math.min(100, (sessionCompleted / 4) * 100)}%` }} />
                  </div>
                  <div className={`mt-3 font-semibold ${dm ? "text-slate-300" : "text-slate-600"}`}>
                    Word bank: <span className="font-black">+{lastCollected.added}</span> new ·{" "}
                    <span className="font-black">{lastCollected.reused}</span> reused ·{" "}
                    <span className="font-black">{vocab.length}</span> collected ·{" "}
                    <span className="font-black">{masteredCount(vocab)}</span> mastered
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                  <button
                    onClick={() => {
                      setRecapOpen(false);
                      setSelectedTemplate(null);
                      setAnswers({});
                      setPhase("SELECT");
                    }}
                    className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xl shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-transform"
                  >
                    Continue → Choose Next Story
                  </button>
                  <button
                    onClick={() => {
                      setRecapOpen(false);
                      setSessionCompleted(0);
                      setAnswers({});
                      setReflections([]);
                      setSelectedTemplate(null);
                      clearSession();
                      setPhase("SELECT");
                    }}
                    className={`flex-1 py-4 rounded-2xl border-2 font-black text-xl transition-colors ${dm ? "border-slate-600 text-slate-300 hover:border-rose-500" : "border-slate-200 text-slate-600 hover:border-rose-300"}`}
                  >
                    Restart Session
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The teacher's in-game importer: adds stories without touching the roster. */}
      <JsonImportModal
        isOpen={showJsonModal}
        onClose={() => setShowJsonModal(false)}
        onImport={handleImportTemplates}
        darkMode={darkMode}
      />

      {/* ── Top Nav Bar ───────────────────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-40 border-b transition-colors duration-300 ${dm ? "bg-slate-900/90 border-slate-700" : "bg-white/90 border-violet-100"} backdrop-blur-md`}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <button onClick={onHome} className="flex items-center gap-2.5 text-left" title="Back to the splash screen">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-300/40">
              <span className="text-xl">🎭</span>
            </div>
            <div>
              <h1 className={`font-black text-lg leading-none ${dm ? "text-white" : "text-slate-800"}`}>Tutorly</h1>
              <p className={`text-xs font-bold leading-none ${dm ? "text-violet-400" : "text-violet-500"}`}>MadLibs</p>
            </div>
          </button>

          <div className="flex items-center gap-3 ml-4">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${dm ? "bg-slate-800" : "bg-amber-50 border border-amber-200"}`}>
              <Star size={14} className="text-amber-500" />
              <span className={`font-black text-sm ${dm ? "text-amber-400" : "text-amber-700"}`}>{score} pts</span>
            </div>
            {streak > 1 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-100 border border-orange-200"
              >
                <Flame size={14} className="text-orange-500" />
                <span className="font-black text-sm text-orange-700">{streak}x</span>
              </motion.div>
            )}
            {comboChain > 1 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${dm ? "bg-violet-900/40 border-violet-700" : "bg-violet-50 border-violet-200"}`}
              >
                <span className={`font-black text-sm ${dm ? "text-violet-300" : "text-violet-700"}`}>
                  Combo x{comboMult.toFixed(2)}
                </span>
                <span className={`text-xs font-bold ${dm ? "text-violet-400" : "text-violet-500"}`}>
                  ({comboChain})
                </span>
              </motion.div>
            )}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${dm ? "bg-slate-800 border-slate-700" : "bg-indigo-50 border-indigo-200"}`}
              title="The coach adapts to how the class is answering"
            >
              <Brain size={14} className="text-indigo-500" />
              <span className={`font-black text-xs hidden sm:inline ${dm ? "text-indigo-300" : "text-indigo-700"}`}>
                {difficultyLabel(difficulty)}
              </span>
            </div>
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${dm ? "bg-slate-800 border-slate-700" : "bg-emerald-50 border-emerald-200"}`}
              title="Words collected in the word bank"
            >
              <BookMarked size={14} className="text-emerald-500" />
              <span className={`font-black text-xs ${dm ? "text-emerald-300" : "text-emerald-700"}`}>{vocab.length}</span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {selectedTemplate && (
              <div className="relative">
                <ProgressRing pct={pct} size={44} stroke={5} />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-violet-600">
                  {pct}%
                </span>
              </div>
            )}
            <button
              onClick={startVocabularyReview}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 font-black text-sm transition-colors ${dm ? "border-emerald-700 text-emerald-300 hover:bg-emerald-900/30" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}
              title="Review the words the class has collected"
            >
              <BookMarked size={16} /> <span className="hidden sm:inline">Word bank</span>
            </button>
            <button
              onClick={onExit}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 font-black text-sm transition-colors ${dm ? "border-slate-600 text-slate-300 hover:border-violet-500" : "border-slate-200 text-slate-500 hover:border-violet-300"}`}
              title="Back to the player setup"
            >
              <Users size={16} /> <span className="hidden sm:inline">Setup</span>
            </button>
            <button
              onClick={toggleDark}
              className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all ${dm ? "bg-slate-700 border-slate-600 text-yellow-300" : "bg-white border-slate-200 text-slate-600 hover:border-violet-300"}`}
            >
              {dm ? "☀️" : "🌙"}
            </button>
          </div>
        </div>

        <div className={`border-t ${dm ? "border-slate-700" : "border-violet-100"} px-4 overflow-x-auto`}>
          <div className="flex gap-1 max-w-6xl mx-auto py-2">
            {PHASES.map((p) => {
              const isActive = phase === p.key;
              const isLocked =
                (p.key === "FILL" && !selectedTemplate) ||
                ((p.key === "REVEAL_REEL" || p.key === "STORY" || p.key === "BRANCH" || p.key === "SWIPE_ENDING" || p.key === "PEER_FILL") &&
                  !isAllFilled);
              return (
                <button
                  key={p.key}
                  onClick={() => goToPhase(p.key as GamePhase)}
                  disabled={isLocked}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-black whitespace-nowrap transition-all
                    ${
                      isActive
                        ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md"
                        : isLocked
                          ? dm
                            ? "text-slate-600 cursor-not-allowed"
                            : "text-slate-300 cursor-not-allowed"
                          : dm
                            ? "text-slate-300 hover:bg-slate-700"
                            : "text-slate-600 hover:bg-violet-50"
                    }`}
                >
                  <span>{p.icon}</span>
                  <span className="hidden sm:inline">{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* ── SELECT PHASE ─────────────────────────────────────────────────── */}
          {phase === "SELECT" && (
            <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="text-center mb-6">
                <h2 className={`text-3xl font-black mb-2 ${dm ? "text-white" : "text-slate-800"}`}>Pick the next story</h2>
                <p className={`text-lg font-semibold ${dm ? "text-slate-400" : "text-slate-500"}`}>
                  {filteredTemplates.length} templates · {lessonTopic} · {level}
                  {location ? ` · ${location}` : ""}
                </p>
              </div>

              {packNote && (
                <div className={`rounded-2xl border-2 px-4 py-3 mb-4 flex items-center gap-3 ${dm ? "bg-emerald-900/30 border-emerald-700" : "bg-emerald-50 border-emerald-200"}`}>
                  <Sparkles size={18} className="text-emerald-500" />
                  <p className={`font-bold text-sm ${dm ? "text-emerald-200" : "text-emerald-800"}`}>AI pack · {packNote}</p>
                </div>
              )}

              <div className={`rounded-2xl border-2 px-4 py-3 mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 ${dm ? "bg-slate-800 border-slate-700" : "bg-white border-violet-100"}`}>
                {[
                  { icon: "🎯", label: `${allPlayers.length} players get their own blanks` },
                  { icon: "🧑‍🏫", label: `Coach: ${difficultyLabel(difficulty)}` },
                  { icon: "🔀", label: "Every story branches twice" },
                  { icon: "📚", label: `${vocab.length} words in the bank` },
                ].map((f) => (
                  <span key={f.label} className={`flex items-center gap-1.5 text-xs font-bold ${dm ? "text-slate-300" : "text-slate-600"}`}>
                    <span className="text-base">{f.icon}</span> {f.label}
                  </span>
                ))}
              </div>

              {/* Filters */}
              <div className={`rounded-2xl p-4 mb-6 flex flex-wrap gap-4 items-center ${dm ? "bg-slate-800 border border-slate-700" : "bg-white border border-slate-200"}`}>
                <div className="flex items-center gap-2">
                  <Palette size={16} className={dm ? "text-slate-400" : "text-slate-500"} />
                  <select
                    value={themeFilter}
                    onChange={(e) => setThemeFilter(e.target.value)}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-sm outline-none ${dm ? "bg-slate-700 text-white border-slate-600" : "bg-slate-50 border border-slate-200"}`}
                  >
                    <option value="all">All Themes</option>
                    {uniqueThemes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Layers size={16} className={dm ? "text-slate-400" : "text-slate-500"} />
                  <select
                    value={moodFilter}
                    onChange={(e) => setMoodFilter(e.target.value)}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-sm outline-none ${dm ? "bg-slate-700 text-white border-slate-600" : "bg-slate-50 border border-slate-200"}`}
                  >
                    <option value="all">All Moods</option>
                    {uniqueMoods.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap size={16} className={dm ? "text-slate-400" : "text-slate-500"} />
                  <select
                    value={cefrFilter}
                    onChange={(e) => setCefrFilter(e.target.value)}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-sm outline-none ${dm ? "bg-slate-700 text-white border-slate-600" : "bg-slate-50 border border-slate-200"}`}
                  >
                    <option value="all">All Levels</option>
                    {CEFR_LEVELS.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="ml-auto flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowJsonModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm shadow-md hover:scale-105 transition-transform"
                    title="Paste another AI pack — it joins this lesson without losing the class"
                  >
                    <Upload size={16} /> Add story pack
                  </button>
                  <button
                    onClick={onExit}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-bold text-sm transition-colors ${dm ? "border-slate-600 text-slate-300 hover:border-violet-500" : "border-slate-200 text-slate-500 hover:border-violet-300"}`}
                    title="Back to the player setup — this starts a new class"
                  >
                    <Users size={16} /> Class setup
                  </button>
                </div>
              </div>

              {/* Template Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((t, i) => (
                  <motion.button
                    key={t.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: Math.min(i * 0.05, 0.5) }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectTemplate(t)}
                    className={`text-left rounded-2xl border-2 overflow-hidden shadow-md transition-all group ${dm ? "bg-slate-800 border-slate-700 hover:border-violet-500" : "bg-white border-slate-200 hover:border-violet-400"}`}
                  >
                    <div className={`h-1.5 bg-gradient-to-r ${THEMES[t.theme.split(" ")[0].toLowerCase().replace("🐉", "fantasy").replace("🔍", "mystery").replace("🏛️", "historical").replace("☢️", "post-apocalyptic").replace("🚬", "noir").replace("👸", "fairy-tale").replace("⚡", "mythology").replace("☕", "slice-of-life").replace("🏆", "sports").replace("🎄", "holiday").replace("🌙", "dream-surreal").replace("⏰", "time-travel").replace("🎌", "japanese-anime").replace("🤖", "custom") as ThemeKey]?.color ?? "from-slate-400 to-slate-600"}`} />
                    <div className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <span className="text-2xl">{t.theme.split(" ")[0]}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-black text-base leading-tight line-clamp-2 ${dm ? "text-white" : "text-slate-800"}`}>
                            {t.title}
                          </h3>
                          <p className={`text-xs font-semibold mt-1 ${dm ? "text-slate-400" : "text-slate-500"}`}>
                            {t.mood}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${dm ? "bg-violet-900/50 text-violet-400" : "bg-violet-100 text-violet-700"}`}>
                          {t.cefrLevel}
                        </span>
                        <span className={`text-xs font-semibold ${dm ? "text-slate-500" : "text-slate-400"}`}>
                          {t.blanks.length} blanks
                        </span>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              {filteredTemplates.length === 0 && (
                <div className="text-center py-12">
                  <p className={`text-lg font-semibold ${dm ? "text-slate-400" : "text-slate-500"}`}>
                    No templates match your filters. Try adjusting them or{" "}
                    <button onClick={onExit} className="text-violet-500 underline">
                      load a custom pack
                    </button>
                    .
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── FILL PHASE ───────────────────────────────────────────────────── */}
          {phase === "FILL" && selectedTemplate && (
            <motion.div key="fill" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className={`rounded-3xl overflow-hidden shadow-xl ${dm ? "bg-slate-800 border border-slate-700" : "bg-white border-2 border-violet-100"}`}>
                <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 p-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <p className="text-violet-200 font-bold text-sm uppercase tracking-widest mb-1">
                        {selectedTemplate.theme} · {selectedTemplate.mood}
                      </p>
                      <h2 className="text-2xl md:text-3xl font-black text-white">{selectedTemplate.title}</h2>
                      <p className="text-violet-200 text-sm mt-1">
                        CEFR: {selectedTemplate.cefrLevel} · Coach: {difficultyLabel(difficulty)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="relative inline-block">
                        <ProgressRing pct={pct} size={72} stroke={7} color="#ffffff" />
                        <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-white">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-white rounded-full" animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
                  </div>
                  <p className="text-violet-200 text-sm font-semibold mt-1">
                    {filledCount} of {totalBlanks} blanks filled
                  </p>
                </div>

                <AnimatePresence>
                  {showAbsurdWarning && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-2"
                    >
                      <span className="text-2xl">🤪</span>
                      <p className="text-amber-700 font-black text-base">
                        CHAOS MODE activated! All blanks filled with maximum absurdity!
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="p-4 flex flex-wrap gap-3">
                  <button
                    onClick={handleAbsurdFill}
                    className="flex items-center gap-2 bg-amber-100 border-2 border-amber-300 text-amber-700 font-black px-5 py-2.5 rounded-xl hover:bg-amber-200 transition-all hover:scale-105 active:scale-95 text-base"
                  >
                    <Shuffle size={18} /> 🤪 Absurd Autofill
                  </button>
                  <button
                    onClick={() => {
                      setAnswers({});
                      setCoachNotes({});
                      setStealOpen(false);
                      setSecondsLeft(turnSeconds);
                      usedWordsRef.current = new Set();
                    }}
                    className={`flex items-center gap-2 border-2 font-black px-5 py-2.5 rounded-xl transition-all text-base ${dm ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                  >
                    <RotateCcw size={18} /> Clear All
                  </button>
                  <button
                    onClick={() => setPhase("SELECT")}
                    className={`flex items-center gap-2 border-2 font-black px-5 py-2.5 rounded-xl transition-all text-base ${dm ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                  >
                    <ChevronLeft size={18} /> Change Theme
                  </button>
                </div>
              </div>

              {/* whose turn it is, the clock and the live scoreboard */}
              <TurnBar
                players={allPlayers}
                scores={scores}
                activePlayerId={activePlayer?.id ?? null}
                secondsLeft={secondsLeft}
                turnSeconds={turnSeconds}
                turnMode={turnMode}
                stealOpen={stealOpen}
                onToggleTurnMode={() => {
                  setTurnMode((v) => !v);
                  setStealOpen(false);
                  setSecondsLeft(turnSeconds);
                }}
                onSteal={handleSteal}
                onPass={handlePass}
                darkMode={darkMode}
              />

              {turnMode && (
                <div className={`rounded-2xl border px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 ${dm ? "bg-slate-800/60 border-slate-700" : "bg-violet-50 border-violet-100"}`}>
                  <div className="flex items-center gap-2">
                    <Zap size={16} className="text-violet-500" />
                    <p className={`text-sm font-bold ${dm ? "text-slate-300" : "text-slate-600"}`}>
                      {activePlayer && activeBlank ? (
                        <>
                          <span className="font-black">{activePlayer.name}</span> owns blank #
                          {selectedTemplate.blanks.findIndex((b) => b.id === activeBlank.id) + 1} — {activeBlank.label}. Beat the clock for a speed bonus.
                        </>
                      ) : (
                        "Every blank is filled — generate the story!"
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <Timer size={14} className={dm ? "text-slate-400" : "text-slate-500"} />
                    <input
                      type="range"
                      min={15}
                      max={90}
                      step={5}
                      value={turnSeconds}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setTurnSeconds(v);
                        setSecondsLeft(v);
                      }}
                      className="w-32"
                    />
                    <span className={`font-black text-xs ${dm ? "text-slate-300" : "text-slate-600"}`}>{turnSeconds}s / blank</span>
                  </div>
                </div>
              )}

              {hidesSuggestions(difficulty) && (
                <div className={`rounded-2xl border px-4 py-2.5 flex items-center gap-2 ${dm ? "bg-indigo-900/30 border-indigo-700" : "bg-indigo-50 border-indigo-200"}`}>
                  <Brain size={16} className="text-indigo-500" />
                  <p className={`text-sm font-bold ${dm ? "text-indigo-200" : "text-indigo-700"}`}>
                    Expert mode: the hints are off, so the class recalls the form from memory. The coach still marks the word.
                  </p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                {selectedTemplate.blanks.map((b, i) => (
                  <BlankCard
                    key={b.id}
                    blank={b}
                    players={allPlayers}
                    value={answers[b.id] || ""}
                    onChange={handleAnswer}
                    index={i}
                    filled={!!answers[b.id]?.trim()}
                    coach={coachNotes[b.id] ?? null}
                    owner={allPlayers[ownership[b.id] ?? 0] ?? null}
                    isActive={turnMode && activeBlank?.id === b.id}
                    suggestionCap={suggestionCap}
                    darkMode={darkMode}
                  />
                ))}
              </div>

              <motion.div animate={isAllFilled ? { scale: [1, 1.02, 1] } : {}} transition={{ repeat: Infinity, duration: 2 }}>
                <button
                  onClick={handleGenerateStory}
                  disabled={!isAllFilled}
                  className={`w-full py-5 rounded-2xl font-black text-2xl transition-all flex items-center justify-center gap-3 shadow-xl
                    ${
                      isAllFilled
                        ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:scale-[1.02] active:scale-[0.98] shadow-violet-300/50 cursor-pointer"
                        : dm
                          ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    }`}
                >
                  {isAllFilled ? (
                    <>
                      <Sparkles size={26} /> Generate My Story! <Sparkles size={26} />
                    </>
                  ) : (
                    <>
                      <AlertCircle size={22} /> Fill all {totalBlanks - filledCount} remaining blanks
                    </>
                  )}
                </button>
              </motion.div>

              {isAllFilled && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setPhase("PEER_FILL")}
                  className={`w-full py-3.5 rounded-2xl font-black text-lg border-2 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] ${dm ? "border-indigo-500 text-indigo-400 hover:bg-indigo-900/30" : "border-indigo-300 text-indigo-600 hover:bg-indigo-50"}`}
                >
                  <Users size={20} /> ⚔️ Challenge a Peer Instead!
                </motion.button>
              )}
            </motion.div>
          )}

          {/* ── REVEAL REEL PHASE ────────────────────────────────────────────── */}
          {phase === "REVEAL_REEL" && selectedTemplate && (
            <motion.div key="reveal" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className={`rounded-3xl p-6 shadow-xl ${dm ? "bg-slate-800 border border-slate-700" : "bg-white border-2 border-violet-100"}`}>
                <StoryRevealReel template={selectedTemplate} answers={answers} onFinish={() => setPhase("STORY")} darkMode={darkMode} />
              </div>
            </motion.div>
          )}

          {/* ── STORY PHASE ──────────────────────────────────────────────────── */}
          {phase === "STORY" && selectedTemplate && (
            <motion.div key="story" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className={`rounded-3xl overflow-hidden shadow-2xl ${dm ? "bg-slate-800 border border-slate-700" : "bg-white border-2 border-violet-100"}`}>
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-6">
                  <h3 className="text-3xl font-black text-white text-center drop-shadow">{selectedTemplate.title}</h3>
                  <p className="text-amber-100 text-center font-semibold mt-1">
                    {selectedTemplate.theme} · {selectedTemplate.mood}
                  </p>
                </div>
                <div className="p-8 space-y-6">
                  <StoryText template={selectedTemplate} answers={answers} darkMode={darkMode} />
                  {beats.length > 0 && (
                    <div className="space-y-5">
                      {beats.map((beat) => (
                        <div key={beat.branchId} className="space-y-2">
                          <p className={`text-xs font-black uppercase tracking-widest ${dm ? "text-indigo-300" : "text-indigo-600"}`}>
                            🔀 The class chose · {beat.label}
                          </p>
                          <BeatLine text={beat.text} tone="normal" darkMode={darkMode} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <CommentFeed answers={answers} active={true} darkMode={darkMode} />

              {/* Voice / Narration Mode */}
              <div className={`rounded-3xl overflow-hidden shadow-lg ${dm ? "bg-slate-800 border border-slate-700" : "bg-white border-2 border-emerald-100"}`}>
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-5 flex items-center gap-3">
                  <Volume2 size={24} className="text-white" />
                  <div className="flex-1">
                    <h4 className="text-2xl font-black text-white">🎙️ Narrated Mode</h4>
                    <p className="text-emerald-100 font-semibold text-sm">Optional text-to-speech for screen-shared classes</p>
                  </div>
                  <button
                    onClick={() => setVoiceMode(v => !v)}
                    className={`px-4 py-2 rounded-xl font-black border-2 transition-colors ${
                      voiceMode
                        ? "bg-white text-emerald-700 border-white"
                        : "bg-white/10 text-white border-white/30 hover:bg-white/20"
                    }`}
                  >
                    {voiceMode ? "ON" : "OFF"}
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {!supportsTts && (
                    <p className={`font-bold ${dm ? "text-slate-300" : "text-slate-600"}`}>
                      Your browser doesn't support speech synthesis (text-to-speech).
                    </p>
                  )}

                  {voiceMode && supportsTts && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className={`rounded-2xl border p-4 ${dm ? "border-slate-700 bg-slate-700/40" : "border-slate-200 bg-slate-50"}`}>
                        <label className={`font-black text-sm uppercase tracking-widest ${dm ? "text-slate-300" : "text-slate-600"}`}>
                          Voice
                        </label>
                        <select
                          value={voiceIndex}
                          onChange={(e) => setVoiceIndex(Number(e.target.value))}
                          className={`mt-2 w-full px-3 py-2 rounded-xl border-2 font-semibold outline-none ${dm ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-slate-200"}`}
                        >
                          {availableVoices.length === 0 && <option value={0}>Default voice</option>}
                          {availableVoices.map((v, i) => (
                            <option key={`${v.name}-${i}`} value={i}>
                              {v.name} ({v.lang})
                            </option>
                          ))}
                        </select>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div>
                            <label className={`text-xs font-black uppercase tracking-widest ${dm ? "text-slate-400" : "text-slate-500"}`}>Rate</label>
                            <input
                              type="range"
                              min={0.7}
                              max={1.3}
                              step={0.05}
                              value={voiceRate}
                              onChange={(e) => setVoiceRate(Number(e.target.value))}
                              className="w-full"
                            />
                            <div className={`text-sm font-black ${dm ? "text-slate-300" : "text-slate-600"}`}>{voiceRate.toFixed(2)}</div>
                          </div>
                          <div>
                            <label className={`text-xs font-black uppercase tracking-widest ${dm ? "text-slate-400" : "text-slate-500"}`}>Pitch</label>
                            <input
                              type="range"
                              min={0.7}
                              max={1.3}
                              step={0.05}
                              value={voicePitch}
                              onChange={(e) => setVoicePitch(Number(e.target.value))}
                              className="w-full"
                            />
                            <div className={`text-sm font-black ${dm ? "text-slate-300" : "text-slate-600"}`}>{voicePitch.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>

                      <div className={`rounded-2xl border p-4 ${dm ? "border-slate-700 bg-slate-700/40" : "border-slate-200 bg-slate-50"}`}>
                        <label className={`font-black text-sm uppercase tracking-widest ${dm ? "text-slate-300" : "text-slate-600"}`}>
                          Controls
                        </label>
                        <div className="mt-3 grid grid-cols-1 gap-3">
                          <button
                            onClick={() => speak(buildFilledStoryPlain(selectedTemplate, answers), "story")}
                            disabled={!voiceMode || !supportsTts}
                            className={`w-full py-3 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all ${
                              isSpeaking
                                ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                : "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg hover:scale-[1.01]"
                            }`}
                          >
                            <Volume2 size={20} /> Read Story Aloud
                          </button>
                          <button
                            onClick={() => speak(`Welcome to Tutorly Madlibs! Today's lesson topic is ${lessonTopic || "language practice"}.`, "commentator")}
                            className={`w-full py-3 rounded-2xl font-black text-lg border-2 transition-colors ${dm ? "border-emerald-500 text-emerald-300 hover:bg-emerald-900/20" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"}`}
                          >
                            🎙️ Commentator Intro
                          </button>
                          <button
                            onClick={stopSpeaking}
                            className={`w-full py-3 rounded-2xl font-black text-lg flex items-center justify-center gap-2 border-2 ${dm ? "border-slate-600 text-slate-300 hover:border-rose-500" : "border-slate-200 text-slate-600 hover:border-rose-300"}`}
                          >
                            <Square size={18} /> Stop
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={`rounded-3xl overflow-hidden shadow-lg ${dm ? "bg-slate-800 border border-slate-700" : "bg-white border-2 border-blue-100"}`}>
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-5 flex items-center gap-3">
                  <BookOpen size={24} className="text-white" />
                  <h4 className="text-2xl font-black text-white">🤔 Reflection Questions</h4>
                </div>
                <div className="p-6 space-y-3">
                  {selectedTemplate.reflectionQuestions.map((q, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`flex gap-4 p-4 rounded-2xl border ${dm ? "border-slate-700 bg-slate-700/50" : "border-blue-100 bg-blue-50"}`}
                    >
                      <span className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-md mt-0.5">
                        {i + 1}
                      </span>
                      <p className={`font-semibold text-lg leading-relaxed ${dm ? "text-slate-200" : "text-slate-700"}`}>{q}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {branchRoundsLeft > 0 && (
                  <button
                    onClick={() => setPhase("BRANCH")}
                    className="col-span-2 md:col-span-1 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-lg py-4 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
                  >
                    <GitBranch size={20} /> What happens next?
                  </button>
                )}
                <button
                  onClick={() => setPhase("SWIPE_ENDING")}
                  className="col-span-2 md:col-span-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-teal-500 text-white font-black text-lg py-4 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
                >
                  🏁 Choose Ending
                </button>
                <button
                  onClick={startVocabularyReview}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-lg py-4 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
                >
                  <BookMarked size={20} /> Word bank ({dueVocab(vocab).length})
                </button>
                <button
                  onClick={() => setPhase("PEER_FILL")}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-lg py-4 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
                >
                  <Users size={20} /> Peer Battle
                </button>
                <button
                  onClick={() => setPhase("FILL")}
                  className={`flex items-center justify-center gap-2 font-black text-lg py-4 rounded-2xl border-2 transition-all hover:scale-105 ${dm ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  <RotateCcw size={20} /> Edit Words
                </button>

                <button
                  onClick={exportHomeworkHtml}
                  className={`flex items-center justify-center gap-2 font-black text-lg py-4 rounded-2xl border-2 transition-all hover:scale-105 ${dm ? "border-emerald-600 text-emerald-300 hover:bg-emerald-900/20" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}
                >
                  <FileText size={20} /> Export HTML
                </button>
                <button
                  onClick={exportHomeworkPdf}
                  className={`flex items-center justify-center gap-2 font-black text-lg py-4 rounded-2xl border-2 transition-all hover:scale-105 ${dm ? "border-blue-600 text-blue-300 hover:bg-blue-900/20" : "border-blue-200 text-blue-700 hover:bg-blue-50"}`}
                >
                  <Download size={20} /> Export PDF
                </button>
              </div>
            </motion.div>
          )}

          {/* ── SWIPE ENDING PHASE ───────────────────────────────────────────── */}
          {phase === "SWIPE_ENDING" && selectedTemplate && (
            <motion.div key="swipe" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className={`rounded-3xl p-6 shadow-xl ${dm ? "bg-slate-800 border border-slate-700" : "bg-white border-2 border-violet-100"}`}>
                <SwipeEnding
  template={selectedTemplate}
  answers={answers}
  onBack={() => setPhase("STORY")}
  onComplete={sessionMode ? completeStoryAndContinueSession : undefined}
  sessionMode={sessionMode}
  darkMode={darkMode}
/>
              </div>
            </motion.div>
          )}

          {/* ── PEER CHALLENGE PHASE ─────────────────────────────────────────── */}
          {(phase === "PEER_FILL" || phase === "PEER_VERSUS") && selectedTemplate && (
            <motion.div key="peer" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className={`rounded-3xl p-6 shadow-xl ${dm ? "bg-slate-800 border border-slate-700" : "bg-white border-2 border-violet-100"}`}>
                <PeerChallenge
                  template={selectedTemplate}
                  player1Answers={answers}
                  players={allPlayers}
                  onBack={() => setPhase("STORY")}
                  darkMode={darkMode}
                />
              </div>
            </motion.div>
          )}
          {/* ── BRANCH PHASE ──────────────────────────────────────────────────── */}
          {phase === "BRANCH" && selectedTemplate && (
            <motion.div key="branch" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className={`rounded-3xl p-6 shadow-xl ${dm ? "bg-slate-800 border border-slate-700" : "bg-white border-2 border-violet-100"}`}>
                <BranchRound
                  template={selectedTemplate}
                  branches={branchesFor(selectedTemplate, 3)}
                  players={allPlayers}
                  difficulty={difficulty}
                  roundsLeft={branchRoundsLeft}
                  onDone={handleBranchDone}
                  onSkip={() => setPhase("STORY")}
                  darkMode={darkMode}
                />
              </div>
            </motion.div>
          )}

          {/* ── WORD BANK / REVIEW PHASE ─────────────────────────────────────── */}
          {phase === "REVIEW" && (
            <motion.div key="review" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className={`rounded-3xl p-6 shadow-xl ${dm ? "bg-slate-800 border border-slate-700" : "bg-white border-2 border-violet-100"}`}>
                <VocabReview
                  queue={reviewQueue}
                  totalBank={vocab.length}
                  mastered={masteredCount(vocab)}
                  onGrade={handleGradeWord}
                  onDone={() => setPhase(selectedTemplate ? "STORY" : "SELECT")}
                  onExport={exportVocab}
                  darkMode={darkMode}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────────── */}
      <footer className={`border-t mt-8 ${dm ? "border-slate-700 bg-slate-900" : "border-violet-100 bg-white/80"} backdrop-blur-sm`}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <Star size={16} className="text-amber-500" />
              <span className={`font-black text-sm ${dm ? "text-slate-300" : "text-slate-700"}`}>{score} pts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Target size={16} className="text-violet-500" />
              <span className={`font-black text-sm ${dm ? "text-slate-300" : "text-slate-700"}`}>
                {filledCount}/{totalBlanks} blanks
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe size={16} className="text-blue-500" />
              <span className={`font-black text-sm ${dm ? "text-slate-300" : "text-slate-700"}`}>{allTemplates.length} templates</span>
            </div>
          </div>
          <p className={`text-xs font-semibold ${dm ? "text-slate-500" : "text-slate-400"}`}>
            Tutorly MadLibs 🎭 · turn-based, coached, branching stories for the language classroom
          </p>
        </div>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════════════════════════
export default MadlibsTool;
