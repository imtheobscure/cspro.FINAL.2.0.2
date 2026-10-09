import { nanoid } from "nanoid";
import type {
  EffectCard,
  Entity,
  EvolutionSystem,
  GameState,
  SocialDeductionPreset,
  Soundscape,
  Universe,
} from "./types";

export const PALETTE = [
  "#f43f5e", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#a855f7",
];

function preferredNaturalVoice(): string | undefined {
  try {
    if (typeof window === "undefined" || !window.speechSynthesis) return undefined;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) => v.name.toLowerCase().includes("ava") && v.name.toLowerCase().includes("microsoft"));
    const natural = voices.find((v) =>
      v.lang.includes("en-US") &&
      !v.name.toLowerCase().includes("david") &&
      (v.name.toLowerCase().includes("natural") || v.name.toLowerCase().includes("aria") || v.name.toLowerCase().includes("jenny") || v.name.toLowerCase().includes("guy")),
    );
    return preferred?.voiceURI ?? natural?.voiceURI;
  } catch {
    return undefined;
  }
}

export function makeEntity(partial: Partial<Entity> = {}): Entity {
  const i = Math.floor(Math.random() * PALETTE.length);
  return {
    id: nanoid(8),
    kind: "player",
    name: "New Hero",
    emoji: "🧝",
    background: "",
    personality: "",
    goals: "",
    language: "en-US",
    cefrLevel: "B1",
    nativeLanguage: "English",
    learningLanguage: "English",
    abilities: "",
    voiceURI: partial.voiceURI ?? preferredNaturalVoice(),
    translationVoiceURI: partial.translationVoiceURI ?? preferredNaturalVoice(),
    health: 100,
    maxHealth: 100,
    lives: 3,
    hunger: 0,
    thirst: 0,
    score: 0,
    deaths: 0,
    dead: false,
    inventory: [],
    statuses: [],
    powerUps: [],
    relationships: [],
    color: PALETTE[i],
    evolutionLevel: 0,
    ...partial,
  };
}

export const SOCIAL_PRESETS: SocialDeductionPreset[] = [
  { id: "mafia", name: "Mafia", icon: "🕴️", blurb: "Townsfolk vs hidden killers.", roles: ["Godfather", "Mafia Enforcer", "Detective", "Doctor", "Townsperson", "Witness", "Mayor"], roleDetails: [
    role("Godfather", "🕴️", "Mafia", "Appears calm and innocent under pressure.", "Blend in and redirect suspicion.", "Survive until the Mafia controls the vote.", "Silky, confident, manipulative."),
    role("Mafia Enforcer", "🔫", "Mafia", "Loyal muscle who protects the Godfather.", "Act like a nervous citizen.", "Remove investigators before they expose the family.", "Short answers, intimidation hidden as jokes."),
    role("Detective", "🕵️", "Town", "Secretly investigates one suspect per night.", "Ask precise questions without revealing too much.", "Identify Mafia and convince the town.", "Analytical, cautious, evidence-focused."),
    role("Doctor", "🩺", "Town", "Can save one target from elimination.", "Seem ordinary while reading danger.", "Keep key Town roles alive.", "Warm, protective, evasive."),
    role("Townsperson", "🏘️", "Town", "No powers, only reasoning and votes.", "Pressure contradictions.", "Vote out Mafia through social reads.", "Emotional but observant."),
    role("Witness", "👁️", "Town", "Saw one suspicious silhouette but lacks proof.", "Drop clues carefully.", "Survive long enough to clarify the clue.", "Haunted, indirect, vivid."),
    role("Mayor", "🏛️", "Town", "Public influence; final vote breaks ties.", "Lead discussion fairly.", "Prevent chaotic votes.", "Commanding, diplomatic."),
  ] },
  { id: "werewolf", name: "Werewolf", icon: "🐺", blurb: "Village hunts the wolves.", roles: ["Alpha Werewolf", "Werewolf", "Seer", "Witch", "Hunter", "Villager", "Elder"], roleDetails: [
    role("Alpha Werewolf", "🐺", "Pack", "Commands the pack and resists one detection.", "Sound like a protector.", "Turn the village against itself.", "Primal, patient, falsely noble."),
    role("Werewolf", "🌕", "Pack", "Kills at night with the pack.", "Hide predatory slips.", "Survive the vote.", "Defensive, instinctive."),
    role("Seer", "🔮", "Village", "Reads one aura each night.", "Guide without exposing identity.", "Find wolves before the moon rises again.", "Cryptic, spiritual."),
    role("Witch", "🧪", "Village", "Has one save and one poison.", "Bargain with information.", "Use potions at decisive moments.", "Sharp, theatrical."),
    role("Hunter", "🏹", "Village", "If killed, can take someone down.", "Draw attacks away from Seer.", "Threaten wolves into mistakes.", "Blunt, brave."),
    role("Villager", "🌾", "Village", "No powers, strong vote.", "Track contradictions.", "Protect the village.", "Folksy, suspicious."),
    role("Elder", "🧓", "Village", "Survives one night attack.", "Mediate panic.", "Keep the village rational.", "Slow, wise, emotional."),
  ] },
  { id: "spyfall", name: "Spyfall", icon: "🕵️", blurb: "Find the spy among you.", roles: ["Spy", "Pilot", "Tourist", "Manager", "Security", "Mechanic"], roleDetails: [
    role("Spy", "🕵️", "Spy", "Does not know the location.", "Answer vaguely while learning the setting.", "Guess the location or avoid exposure.", "Careful, adaptive, probing."),
    role("Pilot", "✈️", "Location Team", "Knows the location and has technical access.", "Ask location-specific questions.", "Expose the spy.", "Confident, technical."),
    role("Tourist", "📸", "Location Team", "Knows the location but not operations.", "Use casual details.", "Spot ignorance.", "Chatty, distracted."),
    role("Manager", "📋", "Location Team", "Knows staff routines.", "Coordinate interrogation.", "Pin down contradictions.", "Organized, impatient."),
    role("Security", "🛡️", "Location Team", "Knows restricted areas.", "Test access knowledge.", "Protect the site.", "Direct, skeptical."),
    role("Mechanic", "🔧", "Location Team", "Knows machines and failures.", "Ask practical questions.", "Catch wrong assumptions.", "Grounded, dry humor."),
  ] },
  { id: "resistance", name: "Resistance / Avalon", icon: "⚔️", blurb: "Loyalists vs spies on missions.", roles: ["Merlin", "Percival", "Loyal Servant", "Assassin", "Morgana", "Minion"], roleDetails: [
    role("Merlin", "🧙", "Good", "Knows the evil team but must stay hidden.", "Guide missions indirectly.", "Win missions without being assassinated.", "Wise, coded, restrained."),
    role("Percival", "🛡️", "Good", "Sees Merlin and Morgana but not which is which.", "Protect the true Merlin.", "Infer the real guide.", "Loyal, conflicted."),
    role("Loyal Servant", "⚜️", "Good", "No secret info.", "Read votes and mission results.", "Approve clean teams.", "Earnest, strategic."),
    role("Assassin", "🗡️", "Evil", "Can kill Merlin at the end.", "Identify Merlin.", "Lose missions slowly enough to learn.", "Cold, observant."),
    role("Morgana", "🌑", "Evil", "Appears as Merlin to Percival.", "Confuse Percival.", "Impersonate guidance.", "Elegant, misleading."),
    role("Minion", "🦂", "Evil", "Knows allies.", "Sabotage missions and deflect.", "Protect Assassin's read.", "Mocking, opportunistic."),
  ] },
  { id: "secret-hitler", name: "Secret Hitler", icon: "🎩", blurb: "Liberals vs fascists.", roles: ["Liberal", "Fascist", "Secret Hitler", "President", "Chancellor"], roleDetails: [
    role("Liberal", "🕊️", "Liberal", "Has no secret allies.", "Pass liberal policies and inspect claims.", "Stop fascist majority and identify Hitler.", "Principled, suspicious."),
    role("Fascist", "🦅", "Fascist", "Knows the fascist team.", "Sow confusion and normalize bad votes.", "Pass fascist policies.", "Polished, strategic."),
    role("Secret Hitler", "🎩", "Fascist", "Must look harmless and survive election danger.", "Appear moderate.", "Become Chancellor after enough fascist policies.", "Measured, charismatic."),
    role("President", "🏛️", "Office", "Chooses a Chancellor and sees policies.", "Justify choices.", "Use power credibly.", "Authoritative."),
    role("Chancellor", "📜", "Office", "Receives final policy choice.", "Explain policy claims.", "Build trust or cover lies.", "Formal, persuasive."),
  ] },
  { id: "coup", name: "Coup", icon: "👑", blurb: "Bluff your way to power.", roles: ["Duke", "Assassin", "Captain", "Ambassador", "Contessa", "Inquisitor"], roleDetails: [
    role("Duke", "👑", "Influence", "Takes tax and blocks foreign aid.", "Project power.", "Control economy.", "Regal, dismissive."),
    role("Assassin", "🗡️", "Influence", "Pays to remove influence.", "Threaten selectively.", "Force risky blocks.", "Quiet, dangerous."),
    role("Captain", "🏴‍☠️", "Influence", "Steals coins and blocks theft.", "Pressure weak players.", "Starve rivals.", "Bold, teasing."),
    role("Ambassador", "🤝", "Influence", "Swaps cards and blocks steals.", "Look harmless.", "Control information.", "Smooth, diplomatic."),
    role("Contessa", "💃", "Influence", "Blocks assassination.", "Punish assassins.", "Bait attacks.", "Elegant, fearless."),
    role("Inquisitor", "🔎", "Influence", "Inspects or swaps influence.", "Create paranoia.", "Expose bluffs.", "Precise, relentless."),
  ] },
  { id: "codenames", name: "Codenames", icon: "🔡", blurb: "Spymasters give one-word clues.", roles: ["Blue Spymaster", "Red Spymaster", "Field Operative", "Assassin Word", "Bystander"], roleDetails: [
    role("Blue Spymaster", "🔵", "Blue", "Knows blue words and danger words.", "Give CEFR-friendly one-word clues.", "Connect blue words safely.", "Concise, strategic."),
    role("Red Spymaster", "🔴", "Red", "Knows red words and danger words.", "Give clever but fair clues.", "Beat blue team.", "Competitive, witty."),
    role("Field Operative", "🧠", "Team", "Guesses from clues.", "Discuss reasoning aloud.", "Avoid assassin word.", "Collaborative, speculative."),
    role("Assassin Word", "☠️", "Hazard", "Instant loss if chosen.", "Tempt risky associations.", "Remain hidden until selected.", "Ominous, silent."),
    role("Bystander", "👤", "Neutral", "Harmless wrong guess.", "Distract with ambiguity.", "Slow progress.", "Neutral, dry."),
  ] },
];

function role(role: string, emoji: string, alignment: string, facts: string, publicGoal: string, secretGoal: string, conversationStyle: string) {
  return { role, emoji, alignment, facts, publicGoal, secretGoal, conversationStyle };
}

export const STARTER_EFFECTS: EffectCard[] = [
  { id: nanoid(6), name: "Critical Hit", emoji: "💥", animation: "burst", soundUrl: "", color: "#f97316" },
  { id: nanoid(6), name: "Earthquake", emoji: "🌋", animation: "shake", soundUrl: "", color: "#dc2626" },
  { id: nanoid(6), name: "Time Warp", emoji: "🌀", animation: "spin", soundUrl: "", color: "#8b5cf6" },
  { id: nanoid(6), name: "Heartbeat", emoji: "❤️", animation: "pulse", soundUrl: "", color: "#ec4899" },
  { id: nanoid(6), name: "Blood Rain", emoji: "🩸", animation: "rain", soundUrl: "", color: "#b91c1c" },
  { id: nanoid(6), name: "Ascension", emoji: "👼", animation: "float", soundUrl: "", color: "#38bdf8" },
  { id: nanoid(6), name: "Boss Reveal", emoji: "👹", animation: "zoom", soundUrl: "", color: "#7c3aed" },
  { id: nanoid(6), name: "Lightning", emoji: "⚡", animation: "flash", soundUrl: "", color: "#facc15" },
  { id: nanoid(6), name: "Phantom Slide", emoji: "👻", animation: "slide", soundUrl: "", color: "#64748b" },
  { id: nanoid(6), name: "Drunken Haze", emoji: "🍺", animation: "wobble", soundUrl: "", color: "#d97706" },
  { id: nanoid(6), name: "Treasure", emoji: "💎", animation: "burst", soundUrl: "", color: "#06b6d4" },
  { id: nanoid(6), name: "Jump Scare", emoji: "😱", animation: "flash", soundUrl: "", color: "#ef4444" },
];

import {
  CHARACTER_CATEGORIES,
  BASE_EMOJI_TO_CATEGORY,
  emojiForLevel,
  type CharacterCategory,
} from "./characterCatalog";

export {
  CHARACTER_CATEGORIES,
  BASE_EMOJI_TO_CATEGORY,
  emojiForLevel,
  titleForLevel,
  SUPPORTED_BASE_EMOJIS,
} from "./characterCatalog";

/**
 * Backwards-compatible shim: every supported base emoji is its own
 * 5-level "system" so the rest of the app (which uses evolutionSystemId)
 * can keep working without changes. evolutionLevel stays 0..5.
 */
export const EVOLUTION_SYSTEMS: EvolutionSystem[] = CHARACTER_CATEGORIES.map((c) => ({
  id: c.id,
  name: c.displayName,
  icon: c.baseEmoji,
  blurb: `5 levels — ${c.ladder.map((l) => l.emoji).join(" → ")} → ${c.finalEmoji}`,
  levels: [
    { level: 1, emoji: c.ladder[0].emoji, title: c.ladder[0].title },
    { level: 2, emoji: c.ladder[1].emoji, title: c.ladder[1].title },
    { level: 3, emoji: c.ladder[2].emoji, title: c.ladder[2].title },
    { level: 4, emoji: c.ladder[3].emoji, title: c.ladder[3].title },
    { level: 5, emoji: c.finalEmoji, title: c.displayName + " (final)" },
  ],
}));

export const EVOLUTION_MAP: Record<string, EvolutionSystem> = Object.fromEntries(
  EVOLUTION_SYSTEMS.map((s) => [s.id, s]),
);

/** Return a character's visible emoji at their current evolution level (0..5). */
export function displayEmojiForEntity(e: { emoji: string; evolutionLevel?: number }): string {
  const cat = BASE_EMOJI_TO_CATEGORY[e.emoji];
  if (!cat) return e.emoji;
  return emojiForLevel(cat, Math.max(0, Math.min(5, e.evolutionLevel ?? 0)));
}

/** Pick the right category for a base emoji (gender-aware). */
export function categoryForBaseEmoji(emoji: string): CharacterCategory | undefined {
  return BASE_EMOJI_TO_CATEGORY[emoji];
}

export const STARTER_SOUNDSCAPES: Soundscape[] = [
  { id: nanoid(6), name: "Haunted Forest", url: "", volume: 0.6, loop: true },
  { id: nanoid(6), name: "Tavern Ambience", url: "", volume: 0.6, loop: true },
  { id: nanoid(6), name: "Rainstorm", url: "", volume: 0.6, loop: true },
];

export const STARTER_UNIVERSES: Universe[] = [
  { id: nanoid(6), name: "The Last Citadel", icon: "🏰", category: "custom", description: "A dying fantasy kingdom under siege.", lore: "The Citadel of Vael stands as the last bastion against the Ashen Horde. Magic is fading, food is scarce, and betrayal lurks in every shadowed hall." },
  { id: nanoid(6), name: "Neon Derelict", icon: "🛰️", category: "video-game", description: "Cyberpunk survival horror aboard a drifting station.", lore: "Station Helios-7 lost contact 40 days ago. Something rewrote the AI. The crew is gone. The lights still flicker in a language no one taught them." },
];

export function defaultState(): GameState {
  // Use only category-supported base emojis so evolution ladders work out of the box.
  const heroes: Entity[] = [
    makeEntity({ name: "Lyra", emoji: "🧝", background: "Exiled court elf.", personality: "Curious, reckless.", goals: "Reclaim her stolen name.", abilities: "Arcane sight.", color: PALETTE[5] }),
    makeEntity({ name: "Kael", emoji: "🦸", background: "Mercenary hero with a debt.", personality: "Stoic, loyal.", goals: "Find his missing sister.", abilities: "Blade dance.", color: PALETTE[0] }),
  ];
  const npc: Entity = makeEntity({
    kind: "npc", name: "The Hollow King", emoji: "🧛",
    background: "Undying ruler of the Ashen Horde.",
    personality: "Cold, theatrical.", goals: "Consume the Citadel.", abilities: "Necromancy.", isAlly: false,
    bilingual: false,
    relationships: [ { targetId: heroes[0].id, value: -40 }, { targetId: heroes[1].id, value: -10 } ],
    color: PALETTE[6],
  });
  return {
    meta: { id: nanoid(10), title: "Untitled Campaign", createdAt: Date.now(), version: 1 },
    settings: { mode: "adult", difficulty: "normal", tone: "dark", cefrLevel: "B1", scoringEnabled: true, consensusMode: false, highContrast: false, keyboardOnly: false },
    entities: [...heroes, npc],
    universes: STARTER_UNIVERSES,
    activeUniverseId: STARTER_UNIVERSES[0].id,
    effects: STARTER_EFFECTS,
    soundscapes: STARTER_SOUNDSCAPES,
    chapters: [],
    storyMap: [],
    chat: [],
    chatGroups: [],
    conversation: [],
    conversationDraft: [],
    paused: false,
    liveInputs: [],
    environment: { manualWeather: "clear" },
    isHosting: false,
    sessionCode: nanoid(6).toUpperCase(),
    sessionPeers: [],
    speakingEntityId: undefined,
    sessionPanelOpen: false,
    selectedPlayerId: undefined,
    decisionPanelHeight: 320,
  };
}
