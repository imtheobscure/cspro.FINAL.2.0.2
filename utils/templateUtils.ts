import { Learner } from '../types2';

export interface VocalPraiseTemplate {
    id: string;
    title: string;
    text: string;
    icon: string;
}

/**
 * Dynamically generates 6 highly personalized vocal praise alarm templates 
 * using the learner's profile metadata and their latest logged session.
 */
export const generatePersonalizedTemplates = (learner: any): VocalPraiseTemplate[] => {
    const name = learner.name || 'Learner';
    const latestSession = learner.sessions && learner.sessions.length > 0 ? learner.sessions[0] : null;
    
    // Fallback extracting topic or utilizing core interests/goals
    const topic = (latestSession?.topics && latestSession.topics[0]) || 
                  (learner.coursePlan?.courseName) || 
                  (learner.interests && learner.interests[0]) || 
                  'Active Training';
                  
    const strengthsText = latestSession?.skillsLearned && latestSession.skillsLearned.length > 0 
        ? latestSession.skillsLearned[0] 
        : 'perfect focus';

    const goal = (learner.goals && learner.goals[0]) || 'mastering fluent expression';

    return [
        {
            id: 'interval_15',
            title: "15 min Stretch Warm-Up",
            text: `Awesome start, ${name}! You have been doing great with ${topic} so far. Stand up and do a quick 15-second stretch. Let's keep this fire burning!`,
            icon: "🧘"
        },
        {
            id: 'interval_20',
            title: "20 min Hydration Interval",
            text: `Take a sip of water, ${name}! 20 minutes under your belt. Your concentration is fantastic. Hydrate your brain, and let's jump right back in!`,
            icon: "💧"
        },
        {
            id: 'interval_25',
            title: "25 min Focus Anchor",
            text: `High five, ${name}! 25 minutes of incredible effort. Your practice on ${topic} is showing awesome progress. Take a deep breath!`,
            icon: "👀"
        },
        {
            id: 'interval_30',
            title: "30 min Milestone Praise",
            text: `Half an hour done, ${name}! That's a huge milestone. You are truly working hard towards your goal of ${goal}. Keep it up!`,
            icon: "✨"
        },
        {
            id: 'wrapup_10',
            title: "10 min Wrap-Up Phase",
            text: `Amazing, ${name}! Only 10 minutes left of our class. You've showed wonderful confidence in ${strengthsText} today. Let's finish like a champion!`,
            icon: "⏱️"
        },
        {
            id: 'complete_session',
            title: "Class Finished Ceremony",
            text: `BOOM! Class is successfully finished, ${name}! Super proud of your outstanding efforts on ${topic} today. You earned valuable XP and got closer to ${goal}. You did it!`,
            icon: "🏆"
        }
    ];
};

/**
 * Play a Sound Meme URL safely using the HTML5 Audio API.
 */
export const playSoundMeme = (url: string, volume: number = 0.25) => {
    if (!url) return;
    try {
        const audio = new Audio(url);
        audio.volume = Math.max(0, Math.min(1, volume));
        audio.play().catch(err => {
            console.warn("Autoplay or sound load prevented. Interaction needed.", err);
        });
    } catch (e) {
        console.error("Failed to play sound meme:", e);
    }
};

/**
 * Curated list of high-quality, reliable, direct-linking meme audio clips
 * that bypass CORS and represent the best meme library of MyInstants.
 */
export const POPULAR_MEMES = [
    { name: "Bruh Beep", keyword: "bruh", url: "https://www.myinstants.com/media/sounds/bruh.mp3", description: "The iconic standard high-bass 'Bruh' accent" },
    { name: "FBI Open Up", keyword: "fbi", url: "https://www.myinstants.com/media/sounds/fbi-open-up-sfx.mp3", description: "FBI agents battering down the door with heavy sirens" },
    { name: "And His Name Is John Cena", keyword: "john cena", url: "https://www.myinstants.com/media/sounds/and-his-name-is-john-cena-1.mp3", description: "High volume dramatic trumpets and theme announcer" },
    { name: "Emotional Damage", keyword: "damage", url: "https://www.myinstants.com/media/sounds/emotional-damage-meme.mp3", description: "Steven He expressing ultimate psychological devastation" },
    { name: "Coffin Dance (Astronomia)", keyword: "coffin", url: "https://www.myinstants.com/media/sounds/astronomia-coffin-dance.mp3", description: "Groovy electronic beat from the dancing pallbearers" },
    { name: "Sad Violin", keyword: "sad", url: "https://www.myinstants.com/media/sounds/sadviolin.mp3", description: "Melodramatic classical string weeping" },
    { name: "Direct Hit (OOF)", keyword: "oof", url: "https://www.myinstants.com/media/sounds/roblox-death-sound_1.mp3", description: "Classic Roblox digital impact chirp" },
    { name: "Inception Horn", keyword: "inception", url: "https://www.myinstants.com/media/sounds/inceptionbutton.mp3", description: "Dramatic, spine-chilling cinema synthetic brass blast" },
    { name: "Directed by Robert Weide", keyword: "directed", url: "https://www.myinstants.com/media/sounds/directed-by-robert-b_v26rG.mp3", description: "Silly jazzy ending theme from Curb Your Enthusiasm" },
    { name: "Super Airhorn", keyword: "airhorn", url: "https://www.myinstants.com/media/sounds/mlg-airhorn.mp3", description: "Deafening triple-blast MLG gaming horn sound" },
    { name: "Spongebob Fail Trombone", keyword: "spongebob", url: "https://www.myinstants.com/media/sounds/spongebob-fail.mp3", description: "Dejected, comical slide brass falling effect" },
    { name: "Ba Dum Tss!", keyword: "badum", url: "https://www.myinstants.com/media/sounds/badumtss.mp3", description: "The snappy standard double-snare and cymbal comedy punchline" },
    { name: "GTA V Wasted", keyword: "gta", url: "https://www.myinstants.com/media/sounds/wasted-gta-v_b6C0fIn.mp3", description: "Slowing visual crash theme and bell when you fail a mission" },
    { name: "Mission Passed Accent", keyword: "passed", url: "https://www.myinstants.com/media/sounds/gta-san-andreas-mission-passed_pPIdZpY.mp3", description: "Satisfying West-Coast synthesizer fanfare" },
    { name: "Anime Wow Greet", keyword: "wow", url: "https://www.myinstants.com/media/sounds/anime-wow.mp3", description: "High-pitched Japanese anime girl expressing pure awe" },
    { name: "Omae Wa Mou Nani", keyword: "nani", url: "https://www.myinstants.com/media/sounds/omae-wa-mou-shindeiru.mp3", description: "Screeching high laser lock-on and dramatic speech" },
    { name: "Awkward Silence Crickets", keyword: "cricket", url: "https://www.myinstants.com/media/sounds/cricket_chirping.mp3", description: "Ambient forest crickets chirping in uncomfortable quiet" },
    { name: "Screaming Goat", keyword: "goat", url: "https://www.myinstants.com/media/sounds/screaming-goat.mp3", description: "Highly enthusiastic wild goat making human-like shrieks" }
];
