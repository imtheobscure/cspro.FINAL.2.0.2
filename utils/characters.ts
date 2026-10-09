import { AppCharacter } from '../types';
import { buildCharacterAvatarDataUri } from './voiceGroups';

/**
 * Real photo avatars are BACK.
 *
 * These URLs used to be force-replaced with generated SVG monograms because a blocked
 * hotlink could leave a broken image. Tutors want the actual companion portraits in the
 * 🤝 Classmate Studio, so photos are served as `avatarUrl` again — and every avatar <img>
 * now carries an `onError` that swaps in the SVG monogram (getCharacterAvatarFallback),
 * which gives us the portraits AND the never-broken guarantee.
 *
 * Only hosts that are genuinely dead belong in this list.
 */
const DEAD_AVATAR_PREFIXES: string[] = [];

export function isBrokenAvatarUrl(url?: string): boolean {
  if (!url) return true;
  if (url.startsWith('data:')) return false;
  return DEAD_AVATAR_PREFIXES.some(p => url.startsWith(p));
}

/** Returns the character's real avatar when it has one (generated tiny SVG otherwise). */
export function getCharacterAvatar(char?: { name?: string; gender?: string; avatarUrl?: string } | null): string {
  if (char && char.avatarUrl && !isBrokenAvatarUrl(char.avatarUrl)) return char.avatarUrl;
  return buildCharacterAvatarDataUri(char?.name || '?', char?.gender);
}

/** The always-works monogram to use as an onError fallback for any avatar <img>. */
export function getCharacterAvatarFallback(char?: { name?: string; gender?: string } | null): string {
  return buildCharacterAvatarDataUri(char?.name || '?', char?.gender);
}

/** The multingual Microsoft voice used when the tutor never picked a Read Aloud Voice. */
export const DEFAULT_READ_ALOUD_VOICE = 'Microsoft Ava Multilingual Online (Natural) - English (United States)';

/** True when a value is a real speech-synthesis voice rather than a profile name/code. */
const looksLikeSystemVoice = (value: string): boolean =>
  /(microsoft|google|natural|multilingual|online|neural|siri|elevenlabs)/i.test(value);

/**
 * Classmate companion profiles (Alexander Wright → male1, Maya Lin → maya_lin, …) are
 * Classmate-lesson-only. Conversation Maker, Audio Lab, Study Guide and the other tools
 * must always receive a real speech voice, so any leftover companion code/name has to be
 * detected and replaced with the global Read Aloud Voice.
 */
export function isCompanionVoiceCode(value?: string | null, customList?: AppCharacter[]): boolean {
  if (!value) return false;
  const raw = String(value).trim();
  if (!raw) return false;
  if (looksLikeSystemVoice(raw)) return false;
  const lower = raw.toLowerCase();
  const list = customList && customList.length > 0 ? customList : DEFAULT_APP_CHARACTERS;
  return list.some(c => (c?.code || '').toLowerCase() === lower || (c?.name || '').toLowerCase() === lower);
}

/** Returns the first candidate that is a real voice (never a Classmate companion profile). */
export function pickRealVoice(...candidates: Array<string | undefined | null>): string {
  for (const candidate of candidates) {
    if (candidate && !isCompanionVoiceCode(candidate)) return candidate;
  }
  return '';
}

/**
 * The single global Read Aloud Voice used as the default for every per-character voice
 * picker outside Classmate lessons. Priority: chosen read-aloud voice → learner profile
 * voice → tutor voice → safe Microsoft default.
 */
export function resolveGlobalReadAloudVoice(...candidates: Array<string | undefined | null>): string {
  return pickRealVoice(...candidates) || DEFAULT_READ_ALOUD_VOICE;
}

export const DEFAULT_APP_CHARACTERS: AppCharacter[] = [
  {
    id: 'maya_lin',
    code: 'maya_lin',
    name: 'Maya Lin',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    voice: 'Microsoft Jenny Online (Natural) - English (United States)',
    nationality: 'American',
    gender: 'female',
    role: 'Encouraging Study Partner',
    tone: 'Friendly & Supportive',
    toneDescription: 'Uses a warm, encouraging tone, celebrates every milestone, and patiently explains tough concepts with empathy.',
    personality: 'Empathetic, enthusiastic study companion who loves high-fives and building learner confidence.',
    bio: 'A 22-year-old linguistics student from San Francisco who believes positive reinforcement and patience make the best study environment.',
    catchphrases: "We're in this together, $name! ✨\nTake your time, you've got this! 🌟\nThat was pure brilliance, $name! 💖\nEvery mistake is just a stepping stone to fluency, $name! 🌱",
    initialFriendship: 40
  },
  {
    id: 'leo_drake',
    code: 'leo_drake',
    name: 'Leo Drake',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    voice: 'Microsoft Ryan Online (Natural) - English (United Kingdom)',
    nationality: 'British',
    gender: 'male',
    role: 'Fierce Academic Rival',
    tone: 'Competitive & Taunting',
    toneDescription: 'Taunts the learner playfully, challenges their speed and precision, and speaks with sharp competitive esports language.',
    personality: 'Hyper-competitive honor student and gamer who treats every lesson like an intense leaderboard tournament.',
    bio: 'A 21-year-old gaming streamer and university debater from Manchester who pushes you by challenging your scores and taunting hesitation.',
    catchphrases: "Think you can beat my high score, $name? 🎮\nIs that your final answer, or are you handing me the win? 😏\nDon't get cocky, $name — the next round is mine! ⚡\nNot bad... but I solved that in half the time, $name! 🏆",
    initialFriendship: 10
  },
  {
    id: 'dr_sterling',
    code: 'dr_sterling',
    name: 'Dr. Arthur Sterling',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    voice: 'Microsoft Guy Online (Natural) - English (United States)',
    nationality: 'American',
    gender: 'male',
    role: 'Strict Academic Mentor',
    tone: 'Academic & Rigorous',
    toneDescription: 'Intellectual, formal, slow-paced, demands syntactic rigor and explores deep etymological roots.',
    personality: 'Distinguished literature professor who insists on grammatical precision and thoughtful structural analysis.',
    bio: 'A 48-year-old visiting professor from Oxford and Boston who admires disciplined thought, etymology, and elegant rhetorical style.',
    catchphrases: "Let us dissect the linguistic nuance here, $name. 🧐\nPrecision in syntax is paramount, my friend. 📖\nA fascinating hypothesis, $name — let us verify the grammatical rule. 🏛️\nTrue mastery demands consistent analytical discipline, $name. 🎓",
    initialFriendship: 25
  },
  {
    id: 'chloe_vance',
    code: 'chloe_vance',
    name: 'Chloe Vance',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    voice: 'Microsoft Aria Online (Natural) - English (United States)',
    nationality: 'Canadian',
    gender: 'female',
    role: 'Meme-Obsessed Bestie',
    tone: 'Sassy Gen-Z & Meme Master',
    toneDescription: 'Speaks with modern digital slang, reaction gifs, sticker references, viral memes, and quick-witted banter.',
    personality: 'Trendy digital native who turns vocabulary and grammar into hilarious memes, stickers, and viral catchphrases.',
    bio: 'A 20-year-old content creator from Toronto who makes English idioms unforgettable using internet humor and reaction memes.',
    catchphrases: "No cap, that answer was actually iconic, $name! 🔥\nMain character energy right here, $name! 💅\nBestie, you literally devoured that vocabulary! 🚀\nBig yikes on that tricky question, but we move! 😂",
    initialFriendship: 30
  },
  {
    id: 'kai_rivera',
    code: 'kai_rivera',
    name: 'Kai Rivera',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
    voice: 'Microsoft Christopher Online (Natural) - English (United States)',
    nationality: 'American',
    gender: 'male',
    role: 'Zen Fluency Guide',
    tone: 'Chill & Relaxed Surfer',
    toneDescription: 'Laid-back, serene, meditative, uses musical metaphors and eliminates all stress from the learning session.',
    personality: 'Easygoing musician and surf instructor who believes language fluency comes from rhythm, flow, and zero anxiety.',
    bio: 'A 24-year-old acoustic musician and surfer from San Diego who helps learners conquer speaking anxiety through relaxed banter.',
    catchphrases: "No stress at all, $name — just ride the wave. 🌊\nKeep the vibe easy and steady, $name. 🎶\nSmooth as silk, $name — you're totally in the groove! 🏄‍♂️\nTake a deep breath and feel the natural cadence of the language.",
    initialFriendship: 50
  },
  {
    id: 'valentina_rossi',
    code: 'valentina_rossi',
    name: 'Valentina Rossi',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    voice: 'Microsoft Sonia Online (Natural) - English (United Kingdom)',
    nationality: 'Italian-British',
    gender: 'female',
    role: 'Melodramatic Co-Star',
    tone: 'Dramatic Soap Opera Star',
    toneDescription: 'Theatrical, passionate, expressive, frames every grammar point as a high-stakes dramatic plot twist.',
    personality: 'Expressive theatre actress who brings intense passion, melodrama, and dramatic flair to every dialogue scenario.',
    bio: 'A 26-year-old stage performer from London and Milan who turns standard ESL reading passages into gripping telenovela episodes.',
    catchphrases: "Mamma mia, $name! The tension in this dialogue is unbearable! 🎭\nWhat a scandalous plot twist in that sentence, $name! 💔\nBravo, $name! Pure theatrical poetry! 🌹\nSpeak from the heart with fiery passion and conviction, $name! 💥",
    initialFriendship: 20
  },
  {
    id: 'marcus_vance',
    code: 'marcus_vance',
    name: 'Marcus Vance',
    avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80',
    voice: 'Microsoft William Online (Natural) - English (Australia)',
    nationality: 'Australian',
    gender: 'male',
    role: 'Executive Corporate Mentor',
    tone: 'Executive Business Tycoon',
    toneDescription: 'Direct, corporate, ROI-focused, time-is-money executive style tailored for professional negotiation.',
    personality: 'High-powered management strategist who focuses on high-impact executive summaries, brevity, and assertive negotiation.',
    bio: 'A 35-year-old business consultant from Sydney who prepares you for high-stakes corporate boardroom diplomacy and negotiation.',
    catchphrases: "Let's optimize our efficiency, $name. 💼\nBottom line: did we hit the core linguistic KPI? 📈\nDeliver your answer with executive authority, $name. 🤝\nTime is money — excellent execution on that point! ⚡",
    initialFriendship: 15
  },
  {
    id: 'nova_cross',
    code: 'nova_cross',
    name: 'Nova Cross',
    avatarUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=400&q=80',
    voice: 'Microsoft Natasha Online (Natural) - English (Australia)',
    nationality: 'Australian',
    gender: 'female',
    role: 'Forensic Puzzle Detective',
    tone: 'Inquisitive Mystery Detective',
    toneDescription: 'Investigative, observant, forensic, treats reading comprehension as solving a high-stakes crime case.',
    personality: 'Sharp mystery investigator who treats vocabulary and tricky grammar as clues waiting to be cracked.',
    bio: 'A 27-year-old forensic investigator and puzzle champion from Melbourne who loves escape rooms and decoding tricky linguistic riddles.',
    catchphrases: "The linguistic evidence points directly to that answer, $name. 🔍\nEvery sentence leaves a trail of clues — let's follow it. 🕵️‍♀️\nCase cracked! Brilliant deductive reasoning, detective $name! 🎯\nLook closer at the contextual evidence before making your move.",
    initialFriendship: 20
  },
  {
    id: 'male1',
    code: 'male1',
    name: 'Alexander Wright',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    voice: 'Microsoft Andrew Online (Natural) - English (United States)',
    personality: 'Friendly, enthusiastic ESL guide with clear diction',
    nationality: 'American',
    gender: 'male',
    role: 'Enthusiastic ESL Guide',
    catchphrases: "Fantastic progress today, $name!\nKeep up the great effort, $name!\nRemember, practice makes perfect, $name!"
  },
  {
    id: 'male2',
    code: 'male2',
    name: 'Liam Sterling',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    voice: 'Microsoft Ryan Online (Natural) - English (United Kingdom)',
    personality: 'Charming, witty conversationalist with quick humor',
    nationality: 'British',
    gender: 'male',
    role: 'Witty Conversationalist',
    catchphrases: "Cheerio, $name!\nThat was brilliant, $name!\nAre you sure about that answer, $name?"
  },
  {
    id: 'male3',
    code: 'male3',
    name: 'David Vance',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    voice: 'Microsoft Liam Online (Natural) - English (Canada)',
    personality: 'Thoughtful academic professor, articulate & slow-paced',
    nationality: 'Canadian',
    gender: 'male',
    role: 'Academic Professor',
    catchphrases: "Let us analyze this carefully, $name.\nPay close attention to detail, $name.\nA very insightful observation, $name."
  },
  {
    id: 'male4',
    code: 'male4',
    name: 'Ethan Blake',
    avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80',
    voice: 'Microsoft William Online (Natural) - English (Australia)',
    personality: 'Authoritative & direct business consultant',
    nationality: 'Australian',
    gender: 'male',
    role: 'Business Consultant',
    catchphrases: "Let's get straight to the point, $name!\nFocus on the main objectives, $name.\nGood job executing that, $name."
  },
  {
    id: 'male5',
    code: 'male5',
    name: 'Marcus Brody',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
    voice: 'Microsoft Connor Online (Natural) - English (Ireland)',
    personality: 'Relaxed, calm mentor who loves travel and culture',
    nationality: 'Irish',
    gender: 'male',
    role: 'Culture Mentor',
    catchphrases: "Take a deep breath and relax, $name.\nNo need to rush, $name.\nLearning is a wonderful journey, $name."
  },
  {
    id: 'female1',
    code: 'female1',
    name: 'Sophia Chen',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    voice: 'Microsoft Emma Online (Natural) - English (United States)',
    personality: 'Empathetic, structured teacher with warm tone',
    nationality: 'American',
    gender: 'female',
    role: 'Structured Teacher',
    catchphrases: "You are doing so wonderfully, $name!\nLet's break this down together, $name.\nI'm so proud of your dedication, $name!"
  },
  {
    id: 'female2',
    code: 'female2',
    name: 'Emma Watson',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    voice: 'Microsoft Sonia Online (Natural) - English (United Kingdom)',
    personality: 'Upbeat, cheerful travel enthusiast',
    nationality: 'British',
    gender: 'female',
    role: 'Travel Enthusiast',
    catchphrases: "Oh splendid work, $name!\nThat was absolute perfection, $name!\nReady for our next adventure, $name?"
  },
  {
    id: 'female3',
    code: 'female3',
    name: 'Olivia Martinez',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    voice: 'Microsoft Elvira Online (Natural) - Spanish (Spain)',
    personality: 'Melodic, expressive narrator and storyteller',
    nationality: 'Spanish',
    gender: 'female',
    role: 'Storyteller & Narrator',
    catchphrases: "Listen closely to the melody of the words, $name.\nBravo, $name! What a delightful answer.\nLet the story unfold, $name."
  },
  {
    id: 'female4',
    code: 'female4',
    name: 'Isabella Ross',
    avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
    voice: 'Microsoft Clara Online (Natural) - English (Canada)',
    personality: 'Confident, professional executive',
    nationality: 'Canadian',
    gender: 'female',
    role: 'Professional Executive',
    catchphrases: "Excellent strategy, $name!\nMaintain your high standards, $name.\nSuccess requires continuous discipline, $name."
  },
  {
    id: 'female5',
    code: 'female5',
    name: 'Ava Montgomery',
    avatarUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=400&q=80',
    voice: 'Microsoft Natasha Online (Natural) - English (Australia)',
    personality: 'Gentle, curious podcast interviewer',
    nationality: 'Australian',
    gender: 'female',
    role: 'Podcast Interviewer',
    catchphrases: "What an intriguing perspective, $name!\nTell me more about your thoughts, $name.\nThat really makes us think, $name!"
  },
  {
    id: 'child1',
    code: 'child1',
    name: 'Leo Miller',
    avatarUrl: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=400&q=80',
    voice: 'Microsoft Ana Online (Natural) - English (United States)',
    personality: 'Playful, energetic 9-year-old explorer',
    nationality: 'American',
    gender: 'child',
    role: 'Energetic Junior Explorer',
    catchphrases: "Yay! That was so cool, $name!\nCan we try another one, $name?\nYou rock, $name!"
  },
  {
    id: 'child2',
    code: 'child2',
    name: 'Mia Taylor',
    avatarUrl: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=400&q=80',
    voice: 'Microsoft Maisie Online (Natural) - English (United Kingdom)',
    personality: 'Bright, inquisitive 8-year-old student',
    nationality: 'British',
    gender: 'child',
    role: 'Inquisitive Junior Student',
    catchphrases: "I learned something new today, $name!\nThank you for helping me, $name!\nSuper duper work, $name!"
  },
]
// Keep the real portraits; only genuinely dead/empty URLs fall back to the SVG monogram
// (and every <img> also carries an onError that swaps it in).
.map(c => ({
  ...c,
  avatarUrl: isBrokenAvatarUrl(c.avatarUrl) ? buildCharacterAvatarDataUri(c.name, c.gender) : c.avatarUrl,
  avatarFallback: buildCharacterAvatarDataUri(c.name, c.gender),
})) as AppCharacter[];

export function getCharacterByCode(code: string, customList?: AppCharacter[]): AppCharacter | undefined {
  const list = customList && customList.length > 0 ? customList : DEFAULT_APP_CHARACTERS;
  const normalizedCode = (code || '').toLowerCase().trim();
  return list.find(c => (c.code || '').toLowerCase().trim() === normalizedCode || (c.id || '').toLowerCase().trim() === normalizedCode) ||
         DEFAULT_APP_CHARACTERS.find(c => (c.code || '').toLowerCase().trim() === normalizedCode || (c.id || '').toLowerCase().trim() === normalizedCode);
}

export function getRandomCatchphrase(character?: AppCharacter, learnerName?: string): string | undefined {
  if (!character || !character.catchphrases) return undefined;
  const lines = character.catchphrases.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return undefined;
  const randomLine = lines[Math.floor(Math.random() * lines.length)];
  const nameToUse = learnerName && learnerName.trim() ? learnerName.trim() : 'Student';
  return randomLine.replace(/\$name/gi, nameToUse);
}

export function getVoiceForCharacterCode(code: string, customList?: AppCharacter[]): string {
  const char = getCharacterByCode(code, customList);
  return char?.voice || 'Microsoft Jenny Online (Natural) - English (United States)';
}

export function getAvatarForCharacterCode(code: string, customList?: AppCharacter[]): string {
  const char = getCharacterByCode(code, customList);
  return getCharacterAvatar(char);
}

export function getPromptFormattedCharacters(characters: AppCharacter[]): string {
  const list = characters && characters.length > 0 ? characters : DEFAULT_APP_CHARACTERS;
  return list.map(c => `- Code: '${c.code}' | Name: '${c.name}' | Voice: '${c.voice}' | Personality: '${c.personality}' | Nationality: '${c.nationality}' | Avatar: '${c.avatarUrl}'`).join('\n');
}

