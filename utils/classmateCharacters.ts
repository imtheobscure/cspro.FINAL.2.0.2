import { buildCharacterAvatarDataUri } from './voiceGroups';

export interface ClassmateCharacter {
    id: string;
    code: string;
    name: string;
    avatarUrl: string;
    voice: string;
    nationality: string;
    tone: string;
    toneDescription: string;
    personality: string;
    bio: string;
    signatureLines: string[];
    initialFriendship: number;
    role: string;
    gender: 'male' | 'female';
    /** Inline SVG monogram — the onError fallback for avatarUrl (never a broken image). */
    avatarFallback?: string;
}

/**
 * Companion portraits.
 *
 * `avatarUrl` is the REAL portrait photo (tutors asked for the actual faces back in the
 * 🤝 Classmate Studio); `avatarFallback` is a tiny inline SVG monogram that every avatar
 * <img> swaps in onError, so a blocked/offline CDN degrades gracefully instead of showing a
 * broken image. Keep the two in step: photo first, monogram always.
 */
const SAFE_AVATAR = (name: string, gender: 'male' | 'female') => buildCharacterAvatarDataUri(name, gender);
const PHOTO = (unsplashId: string) => `https://images.unsplash.com/${unsplashId}?auto=format&fit=crop&w=400&q=80`;

export const CLASSMATE_CHARACTERS: ClassmateCharacter[] = [
    {
        id: 'maya_lin',
        code: 'maya_lin',
        name: 'Maya Lin',
        avatarUrl: PHOTO('photo-1534528741775-53994a69daeb'),
        avatarFallback: SAFE_AVATAR('Maya Lin', 'female'),
        voice: 'Microsoft Jenny Online (Natural) - English (United States)',
        nationality: 'American',
        tone: 'Friendly & Supportive',
        toneDescription: 'Uses a warm, encouraging tone, celebrates every milestone, and patiently explains tough concepts with empathy.',
        personality: 'Empathetic, enthusiastic study companion who loves high-fives and building learner confidence.',
        bio: 'A 22-year-old linguistics student from San Francisco who believes positive reinforcement and patience make the best study environment.',
        signatureLines: [
            "We're in this together, $name! ✨",
            "Take your time, you've got this! 🌟",
            "That was pure brilliance, $name! 💖",
            "Every mistake is just a stepping stone to fluency, $name! 🌱"
        ],
        initialFriendship: 40,
        role: 'Encouraging Study Partner',
        gender: 'female'
    },
    {
        id: 'leo_drake',
        code: 'leo_drake',
        name: 'Leo Drake',
        avatarUrl: PHOTO('photo-1507003211169-0a1dd7228f2d'),
        avatarFallback: SAFE_AVATAR('Leo Drake', 'male'),
        voice: 'Microsoft Ryan Online (Natural) - English (United Kingdom)',
        nationality: 'British',
        tone: 'Competitive & Taunting',
        toneDescription: 'Taunts the learner playfully, challenges their speed and precision, and speaks with sharp competitive esports language.',
        personality: 'Hyper-competitive honor student and gamer who treats every lesson like an intense leaderboard tournament.',
        bio: 'A 21-year-old gaming streamer and university debater from Manchester who pushes you by challenging your scores and taunting hesitation.',
        signatureLines: [
            "Think you can beat my high score, $name? 🎮",
            "Is that your final answer, or are you handing me the win? 😏",
            "Don't get cocky, $name — the next round is mine! ⚡",
            "Not bad... but I solved that in half the time, $name! 🏆"
        ],
        initialFriendship: 10,
        role: 'Fierce Academic Rival',
        gender: 'male'
    },
    {
        id: 'dr_sterling',
        code: 'dr_sterling',
        name: 'Dr. Arthur Sterling',
        avatarUrl: PHOTO('photo-1500648767791-00dcc994a43e'),
        avatarFallback: SAFE_AVATAR('Dr. Arthur Sterling', 'male'),
        voice: 'Microsoft Guy Online (Natural) - English (United States)',
        nationality: 'American',
        tone: 'Academic & Rigorous',
        toneDescription: 'Intellectual, formal, slow-paced, demands syntactic rigor and explores deep etymological roots.',
        personality: 'Distinguished literature professor who insists on grammatical precision and thoughtful structural analysis.',
        bio: 'A 48-year-old visiting professor from Oxford and Boston who admires disciplined thought, etymology, and elegant rhetorical style.',
        signatureLines: [
            "Let us dissect the linguistic nuance here, $name. 🧐",
            "Precision in syntax is paramount, my friend. 📖",
            "A fascinating hypothesis, $name — let us verify the grammatical rule. 🏛️",
            "True mastery demands consistent analytical discipline, $name. 🎓"
        ],
        initialFriendship: 25,
        role: 'Strict Academic Mentor',
        gender: 'male'
    },
    {
        id: 'chloe_vance',
        code: 'chloe_vance',
        name: 'Chloe Vance',
        avatarUrl: PHOTO('photo-1494790108377-be9c29b29330'),
        avatarFallback: SAFE_AVATAR('Chloe Vance', 'female'),
        voice: 'Microsoft Aria Online (Natural) - English (United States)',
        nationality: 'Canadian',
        tone: 'Sassy Gen-Z & Meme Master',
        toneDescription: 'Speaks with modern digital slang, reaction gifs, sticker references, viral memes, and quick-witted banter.',
        personality: 'Trendy digital native who turns vocabulary and grammar into hilarious memes, stickers, and viral catchphrases.',
        bio: 'A 20-year-old content creator from Toronto who makes English idioms unforgettable using internet humor and reaction memes.',
        signatureLines: [
            "No cap, that answer was actually iconic, $name! 🔥",
            "Main character energy right here, $name! 💅",
            "Bestie, you literally devoured that vocabulary! 🚀",
            "Big yikes on that tricky question, but we move! 😂"
        ],
        initialFriendship: 30,
        role: 'Meme-Obsessed Bestie',
        gender: 'female'
    },
    {
        id: 'kai_rivera',
        code: 'kai_rivera',
        name: 'Kai Rivera',
        avatarUrl: PHOTO('photo-1506794778202-cad84cf45f1d'),
        avatarFallback: SAFE_AVATAR('Kai Rivera', 'male'),
        voice: 'Microsoft Christopher Online (Natural) - English (United States)',
        nationality: 'American',
        tone: 'Chill & Relaxed Surfer',
        toneDescription: 'Laid-back, serene, meditative, uses musical metaphors and eliminates all stress from the learning session.',
        personality: 'Easygoing musician and surf instructor who believes language fluency comes from rhythm, flow, and zero anxiety.',
        bio: 'A 24-year-old acoustic musician and surfer from San Diego who helps learners conquer speaking anxiety through relaxed banter.',
        signatureLines: [
            "No stress at all, $name — just ride the wave. 🌊",
            "Keep the vibe easy and steady, $name. 🎶",
            "Smooth as silk, $name — you're totally in the groove! 🏄‍♂️",
            "Take a deep breath and feel the natural cadence of the language."
        ],
        initialFriendship: 50,
        role: 'Zen Fluency Guide',
        gender: 'male'
    },
    {
        id: 'valentina_rossi',
        code: 'valentina_rossi',
        name: 'Valentina Rossi',
        avatarUrl: PHOTO('photo-1517841905240-472988babdf9'),
        avatarFallback: SAFE_AVATAR('Valentina Rossi', 'female'),
        voice: 'Microsoft Sonia Online (Natural) - English (United Kingdom)',
        nationality: 'Italian-British',
        tone: 'Dramatic Soap Opera Star',
        toneDescription: 'Theatrical, passionate, expressive, frames every grammar point as a high-stakes dramatic plot twist.',
        personality: 'Expressive theatre actress who brings intense passion, melodrama, and dramatic flair to every dialogue scenario.',
        bio: 'A 26-year-old stage performer from London and Milan who turns standard ESL reading passages into gripping telenovela episodes.',
        signatureLines: [
            "Mamma mia, $name! The tension in this dialogue is unbearable! 🎭",
            "What a scandalous plot twist in that sentence, $name! 💔",
            "Bravo, $name! Pure theatrical poetry! 🌹",
            "Speak from the heart with fiery passion and conviction, $name! 💥"
        ],
        initialFriendship: 20,
        role: 'Melodramatic Co-Star',
        gender: 'female'
    },
    {
        id: 'marcus_vance',
        code: 'marcus_vance',
        name: 'Marcus Vance',
        avatarUrl: PHOTO('photo-1492562080023-ab3db95bfbce'),
        avatarFallback: SAFE_AVATAR('Marcus Vance', 'male'),
        voice: 'Microsoft William Online (Natural) - English (Australia)',
        nationality: 'Australian',
        tone: 'Executive Business Tycoon',
        toneDescription: 'Direct, corporate, ROI-focused, time-is-money executive style tailored for professional negotiation.',
        personality: 'High-powered management strategist who focuses on high-impact executive summaries, brevity, and assertive negotiation.',
        bio: 'A 35-year-old business consultant from Sydney who prepares you for high-stakes corporate boardroom diplomacy and negotiation.',
        signatureLines: [
            "Let's optimize our efficiency, $name. 💼",
            "Bottom line: did we hit the core linguistic KPI? 📈",
            "Deliver your answer with executive authority, $name. 🤝",
            "Time is money — excellent execution on that point! ⚡"
        ],
        initialFriendship: 15,
        role: 'Executive Corporate Mentor',
        gender: 'male'
    },
    {
        id: 'nova_cross',
        code: 'nova_cross',
        name: 'Nova Cross',
        avatarUrl: PHOTO('photo-1531746020798-e6953c6e8e04'),
        avatarFallback: SAFE_AVATAR('Nova Cross', 'female'),
        voice: 'Microsoft Natasha Online (Natural) - English (Australia)',
        nationality: 'Australian',
        tone: 'Inquisitive Mystery Detective',
        toneDescription: 'Investigative, observant, forensic, treats reading comprehension as solving a high-stakes crime case.',
        personality: 'Sharp mystery investigator who treats vocabulary and tricky grammar as clues waiting to be cracked.',
        bio: 'A 27-year-old forensic investigator and puzzle champion from Melbourne who loves escape rooms and decoding tricky linguistic riddles.',
        signatureLines: [
            "The linguistic evidence points directly to that answer, $name. 🔍",
            "Every sentence leaves a trail of clues — let's follow it. 🕵️‍♀️",
            "Case cracked! Brilliant deductive reasoning, detective $name! 🎯",
            "Look closer at the contextual evidence before making your move."
        ],
        initialFriendship: 20,
        role: 'Forensic Puzzle Detective',
        gender: 'female'
    }
];

export function getClassmateCharacterById(id: string, customList?: any[]): ClassmateCharacter {
    const list = customList && customList.length > 0 ? customList : CLASSMATE_CHARACTERS;
    const normalizedId = (id || '').toLowerCase().trim();
    const found = list.find((c: any) => (c.id || '').toLowerCase().trim() === normalizedId || (c.code || '').toLowerCase().trim() === normalizedId) ||
                  CLASSMATE_CHARACTERS.find(c => (c.id || '').toLowerCase().trim() === normalizedId || (c.code || '').toLowerCase().trim() === normalizedId);
    if (found) {
        return {
            id: found.id || found.code || 'maya_lin',
            code: found.code || found.id || 'maya_lin',
            name: found.name || 'Maya Lin',
            avatarUrl: found.avatarUrl || buildCharacterAvatarDataUri(found.name || 'Maya Lin', found.gender),
            avatarFallback: found.avatarFallback || buildCharacterAvatarDataUri(found.name || 'Maya Lin', found.gender),
            voice: found.voice || 'Microsoft Jenny Online (Natural) - English (United States)',
            nationality: found.nationality || 'American',
            tone: found.tone || 'Friendly & Supportive',
            toneDescription: found.toneDescription || found.personality || 'Engaged and helpful study companion.',
            personality: found.personality || 'Empathetic, enthusiastic study companion.',
            bio: found.bio || found.personality || 'A dedicated learning partner.',
            signatureLines: found.signatureLines || (found.catchphrases ? found.catchphrases.split('\n').map((s: string) => s.trim()).filter(Boolean) : ["Let's do this together, $name! ✨"]),
            initialFriendship: found.initialFriendship !== undefined ? found.initialFriendship : 30,
            role: found.role || 'Study Partner',
            gender: found.gender === 'male' ? 'male' : 'female'
        };
    }
    return CLASSMATE_CHARACTERS[0];
}

export function getFriendshipMeterStatus(val: number) {
    if (val <= -60) return { label: 'Arch Nemesis', icon: '😡', color: '#ef4444', desc: 'Hostile and fiercely confrontational' };
    if (val <= -20) return { label: 'Competitive Rival', icon: '😒', color: '#f97316', desc: 'Frequent sarcastic taunts and challenges' };
    if (val < 15) return { label: 'New Acquaintance', icon: '🤝', color: '#94a3b8', desc: 'Polite and neutral classmate' };
    if (val < 40) return { label: 'Classmate', icon: '💬', color: '#60a5fa', desc: 'Collaborative and engaged study buddy' };
    if (val < 65) return { label: 'Study Partner', icon: '😊', color: '#10b981', desc: 'Warm, helpful and highly encouraging' };
    if (val < 85) return { label: 'Close Friend', icon: '💛', color: '#f59e0b', desc: 'Shares inside jokes, memes, and support' };
    if (val < 98) return { label: 'Best Friend', icon: '💖', color: '#ec4899', desc: 'Deep camaraderie and celebratory cheer' };
    return { label: 'Inseparable Duo', icon: '💕', color: '#d946ef', desc: 'Absolute bond of mutual trust and fun' };
}
