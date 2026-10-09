
import React, { useState, useEffect } from 'react';
// Fix: Changed react-router-dom import to named import.
import { useNavigate } from 'react-router-dom';
import { Learner, CourseLevel, Need, Competency, CompetencyStatus, CoursePlan, Skill } from '../../types2';
import { useLearnerStore } from '../../store/useLearnerStore';
import { useAppStore } from '../../store/useAppStore';
import EditableStarRating from '../../components/app2/EditableStarRating';
import { generateRandomAvatarId } from '../../services/avatarService';
import CoursePlannerForm from '../../components/app2/CoursePlannerForm';
import TagSelector from '../../components/app2/TagSelector';
import { INTEREST_OPTIONS, EXPECTATION_OPTIONS, SPOKEN_LANGUAGE_OPTIONS, LEARNING_FACTORS } from '../../constants2';
import { getTimezoneForLocation } from '../../services/geminiService2';
import TriStateSelector from '../../components/app2/TriStateSelector';
import LearningProfileTest from '../../components/app2/tests/LearningProfileTest';
import { COURSEBOOK_MANAGER_DATA, CoursebookDetailed } from '../../data/CoursebookManagerData';
import CoursebookManagerModal from '../../components/app2/CoursebookManagerModal';
import { syncLearnerToDisk, triggerAutoSyncImmediate, isDiskModeEnabled } from '../../utils/diskStorage';
import { useAuthStore } from '../../store/useAuthStore';
import { canAddLearner, FREE_LEARNER_LIMIT } from '../../utils/tiers';
import { LEARNER_CATEGORIES, getCategoryById } from '../../data/learnerCategories';
import { CEFR_LEVEL_ORDER, CEFR_LEVEL_LABELS, normalizeCefrLevel, type CefrLevelKey } from '../../utils/cefrGrammarDictionary';

const DRAFT_KEY = 'onboarding_draft';

/**
 * The Review & Calibrate board must speak the exact same CEFR language as
 * Lesson Creation > Lesson Customization (A1, A2, A2+, B1, B1+, B2, C1, C2).
 * Any level string the AI returns (or a legacy 'Intermediate' style name) is
 * mapped onto one of those codes so the two screens never disagree.
 */
/** Shared normaliser (see utils/cefrGrammarDictionary) so this board stores the
 *  exact same codes as Lesson Creation > Lesson Customization. */
const normalizeReviewCefrLevel = (value: any, fallback: CefrLevelKey = 'B1'): CefrLevelKey =>
    normalizeCefrLevel(value, fallback);

/** Closest native CourseLevel enum member for a CEFR code (A2+/B1+ fold into A2/B1). */
const toCourseLevelEnum = (cefr: string): CourseLevel => {
    const map: Record<string, CourseLevel> = {
        'A1': CourseLevel.A1,
        'A2': CourseLevel.A2,
        'A2+': CourseLevel.A2,
        'B1': CourseLevel.B1,
        'B1+': CourseLevel.B1,
        'B2': CourseLevel.B2,
        'C1': CourseLevel.C1,
        'C2': CourseLevel.C2,
    };
    return map[cefr] || CourseLevel.B1;
};

const initialFormData: Partial<Learner> = {
    name: '',
    category: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    birthday: '',
    occupation: '',
    major: '',
    gender: 'PreferNotToSay',
    interests: '',
    situations: '',
    focus: '',
    expectations: '',
    learningStyle: '',
    learningFactors: {},
    languages: ['English'],
    registeredName: '',
    needs: [{ id: 'n1', name: 'Improve general fluency', rating: 3, learningPath: [] }],
    competencies: [],
    coursePlan: {
        level: 'B1',
        targetLevel: 'B2',
        courseName: 'General English',
        duration: 60,
        frequency: 'Balanced',
        totalSessions: 24,
        currentLesson: '',
        features: '',
    },
};

const inputClass = "w-full p-3 bg-white border border-brand-gray-light rounded-lg focus:ring-2 focus:ring-brand-blue placeholder:text-brand-gray-medium text-lg";

const countriesList = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
    "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
    "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
    "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica",
    "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt",
    "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon",
    "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
    "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel",
    "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan",
    "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar",
    "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia",
    "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal",
    "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan",
    "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar",
    "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia",
    "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa",
    "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan",
    "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan",
    "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States of America", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City",
    "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

const commonCorrections: { [key: string]: string } = {
    'chech': 'Czech Republic',
    'chech republic': 'Czech Republic',
    'czechio': 'Czech Republic',
    'czech': 'Czech Republic',
    'czechia': 'Czech Republic',
    'us': 'United States of America',
    'usa': 'United States of America',
    'uk': 'United Kingdom',
    'uae': 'United Arab Emirates',
    'colobia': 'Colombia',
    'austrilia': 'Australia',
    'german': 'Germany'
};

function getLevenshteinDistance(a: string, b: string): number {
    const tmp: number[][] = [];
    for (let i = 0; i <= a.length; i++) {
        tmp[i] = [i];
    }
    for (let j = 0; j <= b.length; j++) {
        tmp[0][j] = j;
    }
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            tmp[i][j] = Math.min(
                tmp[i - 1][j] + 1,
                tmp[i][j - 1] + 1,
                tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
            );
        }
    }
    return tmp[a.length][b.length];
}

function getBigramSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().replace(/\s+/g, '');
    const s2 = str2.toLowerCase().replace(/\s+/g, '');
    
    const getPairs = (s: string) => {
        const pairs = new Set<string>();
        for (let i = 0; i < s.length - 1; i++) {
            pairs.add(s.substring(i, i + 2));
        }
        return pairs;
    };
    
    const pairs1 = getPairs(s1);
    const pairs2 = getPairs(s2);
    
    if (pairs1.size === 0 || pairs2.size === 0) return 0;
    
    let intersection = 0;
    pairs1.forEach(p => {
        if (pairs2.has(p)) intersection++;
    });
    
    return (2 * intersection) / (pairs1.size + pairs2.size);
}

interface CustomSlide {
    id: string;
    title: string;
    emoji: string;
    content: string;
}

/**
 * Colour and an icon for the bolded keyword in a slide's example answers.
 *
 * The slides ask the learner for ten different *kinds* of answer — who they are, what
 * they like, how they learn, what they want from a tutor, how often they want to meet —
 * and every one of them was bolded the same white, so the deck read as a wall of text.
 * Each rule below is one of those kinds: the word lists are deliberately small and
 * concrete (the words the example answers actually use) and the first match wins, so a
 * phrase like "Industrial Design" lands on identity while "photography" lands on
 * interests. Anything the rules do not recognise still gets the default highlight,
 * because an unstyled bold word next to coloured ones looks like a mistake.
 */
const KEYWORD_RULES: { cls: string; emoji: string; word: RegExp }[] = [
    {
        cls: 'kw-interest',
        emoji: '🌍',
        word: /(cooking|hiking|biking|swimming|diving|cycling|running|yoga|chess|karaoke|volunteering|gardening|plants|animals|nature|space|psychology|philosophy|geography|politics|fashion|dancing|theater|writing|languages|photography|documentar|history|travel|startups?|artificial intelligence|puzzles?|tech|music|cinema|game|games|sport|fitness|design|art|reading|education|cities?|villages?|students|classroom|hybrid|online|topics?|interests?)/i,
    },
    {
        cls: 'kw-style',
        emoji: '🧠',
        word: /(visual|auditory|linguistic|logical|mathematical|kinesthetic|memory|focus|logic|motivation|confidence|fear of mistakes|anxiety|style|superpower|brain)/i,
    },
    {
        cls: 'kw-tutor',
        emoji: '💛',
        word: /(patient|supportive|clear|organized|organised|on time|punctual|fun|energetic|engaging|enthusiastic|approachable|respectful|knowledgeable|homework|feedback|communicator)/i,
    },
    {
        cls: 'kw-goal',
        emoji: '🎯',
        word: /(goal|target|situation|meeting|presentation|update|email|speak|speaking|hesitat|error|focus|fluen|accent|pronunciation|interview|calls?)/i,
    },
    {
        cls: 'kw-plan',
        emoji: '📅',
        word: /(level|beginner|elementary|intermediate|advanced|expert|b1|b2|c1|c2|a1|a2|duration|frequency|week|session|minute|coursebook|course book|intensive|balanced|standard|in-depth|\d{1,2},? \d{4}|^[a-z]+ \d{1,2},? \d{4}$)/i,
    },
    {
        cls: 'kw-identity',
        emoji: '👤',
        word: /(name|years old|age|birthday|gender|female|male|live|city|address|email|contact|job|manager|engineer|teacher|nurse|developer|designer|design|science|major|study|university|language|italian|japanese|english|spanish|french|german|@)/i,
    },
    {
        // "Sofia", "Milan, Italy", "Tokyo, Japan": a proper noun is who they are, not what
        // they like. Checked last, so it can never steal a word the rules above own.
        cls: 'kw-identity',
        emoji: '👤',
        word: /^[A-Z][a-zA-Z]+(?: [A-Za-z0-9-]+)*(?:, [A-Z][a-zA-Z]+)?$/, // also "Via Roma 12"
    },
];

/**
 * A per-word emoji, so a bolded keyword gets an icon that MEANS it.
 *
 * A word with no entry gets NO icon, on purpose. Falling back to a category emoji (every
 * interest 🌍, every person 👤) is what made the first version look like one emoji
 * repeated down the slide. This map carries the words the example answers actually use —
 * the manual wizard's interest and expectation lists, the learning-factor words, and the
 * everyday words around them — so Swimming gets 🏊 and Cooking gets 🍳. Matching is on
 * whole normalized words, so "art" can never match inside "artificial"; a word too new
 * for the map simply renders without an icon.
 */
const WORD_EMOJI: Record<string, string> = {
    // Interests — mirrors INTEREST_OPTIONS in constants2 plus the classics learners name.
    technology: '💻', tech: '💻', 'art & design': '🎨', art: '🎨', design: '🎨', science: '🔬', history: '📜',
    work: '💼', job: '💼', jobs: '💼', study: '📚', studied: '📚', degree: '🎓', company: '🏢',
    'first language': '🗣️', 'other languages': '🗨️', everyday: '🗓️', friend: '🤝', friends: '🤝',
    picture: '🖼️', pictures: '🖼️', video: '📹', videos: '📹', words: '🔤', word: '🔤',
    memory: '🧠', rules: '📏', patterns: '🔷', motivated: '🔥', confident: '💪', anxious: '😥',
    correct: '🛠️', cooked: '🍳', watched: '🎬', film: '🎬', gym: '🏋️', shops: '🛍️',
    expensive: '💰', cheap: '🪙', quiet: '🤫', car: '🚗', teachers: '👩‍🏫',
    travel: '✈️', 'food & cooking': '🍔', food: '🍔', cooking: '🍳', 'gourmet cooking': '👨‍🍳',
    music: '🎵', musical: '🎵', 'movies & tv shows': '🎬', movies: '🎬', documentaries: '🎬', cinema: '🎬',
    gaming: '🎮', games: '🎮', sports: '⚽', swimming: '🏊', diving: '🤿', hiking: '🥾', biking: '🚵',
    'mountain biking': '🚵', cycling: '🚴', running: '🏃', football: '⚽', yoga: '🧘',
    fashion: '👗', 'fitness & health': '💪', fitness: '💪', reading: '📚', writing: '✍️',
    photography: '📷', 'nature & outdoors': '🌲', nature: '🌲', 'animals & pets': '🐾',
    gardening: '🌱', plants: '🌱', dancing: '💃', 'theater & performing arts': '🎭',
    'space & astronomy': '🚀', space: '🚀', psychology: '🧠', philosophy: '🤔',
    languages: '🗣️', geography: '🗺️', 'politics & current events': '🏛️', politics: '🏛️',
    startups: '🚀', 'tech startups': '🚀', 'artificial intelligence': '🤖',
    puzzles: '🧩', volunteering: '❤️', chess: '♟️', karaoke: '🎤',
    // Learning factors — LEARNING_FACTORS in constants2.
    visual: '🖼️', auditory: '🎧', kinesthetic: '🤸', 'reading/writing': '✍️',
    linguistic: '🗣️', 'logical-mathematical': '🧮', spatial: '🎨', 'bodily-kinesthetic': '🏃',
    interpersonal: '🤝', intrapersonal: '🧘', naturalist: '🌿',
    logic: '⚖️', creativity: '💡', focus: '🎯',
    anxiety: '😥', confidence: '💪', 'fear of mistakes': '😨', motivation: '🔥', 'risk-taking': '🎲',
    // Expectations — EXPECTATION_OPTIONS in constants2.
    energetic: '⚡', serious: '🧐', fun: '😂', 'on time': '⏰', 'give homework': '✍️',
    'not to give homework': '🙅', patient: '🤗', knowledgeable: '🧠', organized: '📂',
    approachable: '😊', enthusiastic: '✨', communicator: '💬', supportive: '🙏',
    engaging: '🎬', feedback: '🎯', respectful: '🤝', homework: '📝', corrections: '🎯',
    // Goals & focus.
    meetings: '📅', update: '🔄', presentations: '📊', presentation: '📊', emails: '📧', email: '📧',
    calls: '📞', interviews: '💼', interview: '💼', exams: '📝', exam: '📝', ielts: '🎓',
    speaking: '🗣️', fluency: '🌊', hesitations: '⏳', grammar: '📐', vocabulary: '📖',
    pronunciation: '🎙️', accent: '🎙️', listening: '👂', errors: '🛠️', error: '🛠️',
    // Levels, planning and the placement test.
    beginner: '🌱', elementary: '🌿', intermediate: '🌳', 'upper-intermediate': '🌲',
    advanced: '🚀', expert: '🏆', minutes: '⏱️', minute: '⏱️', week: '📅', weekly: '📅',
    sessions: '🔢', session: '🔢', intensive: '🔥', 'in-depth': '🔍', balanced: '⚖️',
    coursebook: '📚', business: '💼', custom: '✨',
    // Identity & places.
    milan: '🇮🇹', italy: '🇮🇹', tokyo: '🇯🇵', japan: '🇯🇵', 'sao paulo': '🇧🇷', brazil: '🇧🇷',
    portuguese: '🇧🇷', italian: '🇮🇹', japanese: '🇯🇵', english: '🇬🇧', spanish: '🇪🇸', french: '🇫🇷',
    german: '🇩🇪', mandarin: '🇨🇳', arabic: '🇸🇦', hindi: '🇮🇳', russian: '🇷🇺', korean: '🇰🇷',
    turkish: '🇹🇷', bengali: '🇧🇩', engineer: '💻', 'software engineer': '💻', nurse: '🩺', nursing: '🩺',
    teacher: '👩‍🏫', accountant: '🧾', marketing: '📈', 'computer science': '💻',
    // Placement-test vocabulary.
    yesterday: '📆', routine: '🔁', city: '🏙️', cities: '🏙️', village: '🏡', villages: '🏡', education: '🎓',
    student: '🎒', students: '🎒', online: '🌐', classroom: '🏫', hybrid: '🧩', pro: '✅', con: '❌', pros: '✅', cons: '❌',
};

const WORD_EMOJI_KEYS = Object.keys(WORD_EMOJI).sort((a, b) => b.length - a.length);

/** Normalizes a phrase to space-separated lowercase words (handles `/`, `&`, `-`). */
const normWords = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** The emoji that means this word, or nothing at all when nothing fits it. */
function emojiForKeyword(text: string): string {
    const words = normWords(text);
    if (!words) return '';
    if (WORD_EMOJI[words]) return WORD_EMOJI[words];
    const padded = ` ${words} `;
    for (const key of WORD_EMOJI_KEYS) {
        const k = normWords(key);
        if (k && padded.includes(` ${k} `)) return WORD_EMOJI[key];
    }
    if (/\S+@\S+\.\S+/.test(text)) return '📧';
    return '';
}

/** Styles one `<strong>` from a slide's content, with a word-specific emoji. */
function decorateKeywords(html: string): string {
    return html.replace(/<strong>([\s\S]*?)<\/strong>/g, (_match, text: string) => {
        const rule = KEYWORD_RULES.find((r) => r.word.test(text));
        const emoji = emojiForKeyword(text);
        const cls = rule ? rule.cls : 'kw-default';
        return `<strong class="kw ${cls}">${emoji ? `${emoji} ` : ''}${text}</strong>`;
    });
}

/**
 * The FIRST shipped deck (7 slides, 2-3 samples each). Kept verbatim on purpose: the
 * expanded deck below replaces it, and the seven legacy `slideIndex` views further down
 * this file (the -99x blocks) are hand-written copies of these same slides. Nothing a
 * tutor has already seen was deleted — the questions simply moved into more slides.
 */
const LEGACY_DEFAULT_SLIDES: CustomSlide[] = [
    { 
        id: 'slide-1', 
        title: 'Welcome, {name}!', 
        emoji: '👋', 
        content: `Let's co-design a personalized curriculum that aligns with your real-world professional needs, goals, and style.<br/><br/><p class="text-base text-indigo-400 font-medium tracking-wide">Press Right Arrow → to begin</p>` 
    },
    { 
        id: 'slide-2', 
        title: 'About You', 
        emoji: '🗺️ 💼', 
        content: `What is your name, age, birthday, and gender? Where do you live? What is your job, major, and native language?<br/><br/><div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto pt-4 text-left"><div class="bg-slate-800/50 p-5 rounded-2xl"><p class="text-sm font-black text-indigo-400 uppercase tracking-wider">Example Response 1</p><p class="text-slate-200 text-xl leading-relaxed">"Hello! My name is <strong>Sofia</strong>. I am <strong>32 years old</strong>. My birthday is <strong>May 12, 1994</strong>. My gender is <strong>female</strong>. I live in <strong>Milan, Italy</strong>. My address is <strong>Via Roma 12</strong>. You can contact me using <strong>sofia.design@gmail.com</strong> to send me homework and feedbacks. My job is <strong>Design Manager</strong>. My major/field of study is <strong>Industrial Design</strong>. My native language is <strong>Italian</strong>. I love <strong>gourmet cooking</strong> and <strong>hiking</strong>."</p></div><div class="bg-slate-800/50 p-5 rounded-2xl"><p class="text-sm font-black text-indigo-400 uppercase tracking-wider">Example Response 2</p><p class="text-slate-200 text-xl leading-relaxed">"Hi! I am <strong>Kenji</strong>. I am <strong>28 years old</strong>. My birthday is <strong>October 5, 1998</strong>. My gender is <strong>male</strong>. My city is <strong>Tokyo, Japan</strong>. My address is <strong>Shibuya 3-2-1</strong>. My email is <strong>kenji.code@gmail.com</strong> for homework and feedbacks. My job is <strong>Software Engineer</strong>. My major/field of study is <strong>Computer Science</strong>. My native language is <strong>Japanese</strong>. I like <strong>travel documentaries</strong> and <strong>mountain biking</strong>."</p></div></div>` 
    },
    { 
        id: 'slide-3', 
        title: 'Your Goals and Focus', 
        emoji: '🎯 💬', 
        content: `Where do you want to use the language? What do you want to focus on in our lessons?<br/><br/><div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto pt-4 text-left"><div class="bg-slate-800/50 p-5 rounded-2xl"><p class="text-sm font-black text-indigo-400 uppercase tracking-wider">Example Target Situations</p><p class="text-slate-200 text-xl leading-relaxed">"I have weekly project updates and presentation meetings at work. I feel a bit slow and hesitant when I speak."</p></div><div class="bg-slate-800/50 p-5 rounded-2xl"><p class="text-sm font-black text-indigo-400 uppercase tracking-wider">Example Lesson Focus</p><p class="text-slate-200 text-xl leading-relaxed">"I want to focus on speaking with no hesitations, writing clean emails, and fixing my errors."</p></div></div>` 
    },
    { 
        id: 'slide-4', 
        title: 'How Do You Learn Best?', 
        emoji: '🧠 🎨', 
        content: `What is your learning style? Tell us what helps you learn and your favorite topics!<br/><br/><div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto pt-4 text-left"><div class="bg-slate-800/50 p-5 rounded-2xl"><p class="text-sm font-black text-indigo-400 uppercase tracking-wider">Example Response 1</p><p class="text-slate-200 text-xl leading-relaxed">"My style is <strong>Visual</strong> (seeing pictures) and <strong>Linguistic</strong> (talking). My superpower is <strong>Memory</strong> (remembering easily). I have high <strong>Motivation</strong> and <strong>Confidence</strong>! My favorite topics & interests are <strong>global history</strong>, <strong>world travel documentaries</strong>, and <strong>mountain biking</strong>."</p></div><div class="bg-slate-800/50 p-5 rounded-2xl"><p class="text-sm font-black text-indigo-400 uppercase tracking-wider">Example Response 2</p><p class="text-slate-200 text-xl leading-relaxed">"I learn best with <strong>Auditory</strong> (listening) and <strong>Logical-Mathematical</strong> (solving puzzles). My brain works best with <strong>Focus</strong> and <strong>Logic</strong>. In class, I have some <strong>Fear of Mistakes</strong> and <strong>Anxiety</strong>. My interests are <strong>tech startups</strong>, <strong>artificial intelligence</strong>, and <strong>photography</strong>."</p></div></div>` 
    },
    { 
        id: 'slide-5', 
        title: 'Tutor Expectations', 
        emoji: '🤝', 
        content: `What should your teacher be like? What helps you feel happy and successful in class?<br/><br/><div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto pt-4 text-left"><div class="bg-slate-800/50 p-5 rounded-2xl"><p class="text-sm font-black text-indigo-400 uppercase tracking-wider">Example Response 1</p><p class="text-slate-200 text-xl leading-relaxed">"I want my tutor to be extremely <strong>Patient</strong> and <strong>Supportive</strong> when I speak. They should be a <strong>Clear communicator</strong> who provides <strong>clear feedback</strong> on errors. I also prefer someone who is <strong>On time</strong> and highly <strong>Organized</strong>. Please <strong>Give homework</strong>."</p></div><div class="bg-slate-800/50 p-5 rounded-2xl"><p class="text-sm font-black text-indigo-400 uppercase tracking-wider">Example Response 2</p><p class="text-slate-200 text-xl leading-relaxed">"I like when classes are <strong>Fun</strong> and <strong>Energetic</strong>, making lessons <strong>Engaging</strong> and <strong>Enthusiastic</strong>. They should be <strong>Approachable</strong> and <strong>Respectful</strong>. They must be <strong>Knowledgeable</strong> about technology, but they should <strong>Not to give homework</strong>."</p></div></div>` 
    },
    { 
        id: 'slide-6', 
        title: 'Course Scheduling & Level', 
        emoji: '📅 🚀', 
        content: `What is your level and goal? How long and how often would you like our lessons to be?<br/><br/><div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto pt-4 text-left"><div class="bg-slate-800/50 p-5 rounded-2xl"><p class="text-sm font-black text-indigo-400 uppercase tracking-wider">Example Response 1</p><p class="text-slate-200 text-xl leading-relaxed">"My current level is <strong>Intermediate (B1)</strong>, but my goal is <strong>Upper-Intermediate (B2)</strong>. I choose the <strong>Business Result Upper-Intermediate</strong> coursebook. I want a lesson <strong>Duration</strong> of <strong>60 minutes (Standard)</strong> with a <strong>Frequency</strong> of <strong>2x per week (Balanced)</strong> for a total of <strong>24 Sessions (Standard)</strong>."</p></div><div class="bg-slate-800/50 p-5 rounded-2xl"><p class="text-sm font-black text-indigo-400 uppercase tracking-wider">Example Response 2</p><p class="text-slate-200 text-xl leading-relaxed">"I am currently an <strong>Advanced (C1)</strong> speaker trying to reach <strong>Expert (C2)</strong>. I choose the <strong>C1 Advanced Speakout</strong> course book. I want a lesson <strong>Duration</strong> of <strong>90 minutes (In-Depth)</strong> with an intensive <strong>Frequency</strong> of <strong>3x per week (Intensive)</strong>, completing <strong>48 Sessions (Intensive)</strong>."</p></div></div>` 
    },
    { 
        id: 'slide-7', 
        title: 'Placement Speaking Test', 
        emoji: '📝', 
        content: `Please answer these three questions naturally. Your grammar, vocabulary, and flow will be reviewed to find your perfect CEFR level.<br/><br/><div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto pt-4 text-left"><div class="bg-indigo-950/25 border border-indigo-500/20 p-5 rounded-2xl"><span class="bg-indigo-500/20 text-indigo-300 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">Level A (Basic)</span><h4 class="font-bold text-white text-base mt-3">Q1: Daily Life & Routines</h4><p class="text-slate-300 text-base mt-2 font-medium">"What did you do yesterday evening? Tell us about your routine."</p></div><div class="bg-indigo-950/25 border border-indigo-500/20 p-5 rounded-2xl"><span class="bg-indigo-500/20 text-indigo-300 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">Level B (Independent)</span><h4 class="font-bold text-white text-base mt-3">Q2: Opinions & Comparison</h4><p class="text-slate-300 text-base mt-2 font-medium">"Compare living in a big city with living in a small village. What are the pros and cons?"</p></div><div class="bg-indigo-950/25 border border-indigo-500/20 p-5 rounded-2xl"><span class="bg-indigo-500/20 text-indigo-300 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">Level C (Proficient)</span><h4 class="font-bold text-white text-base mt-3">Q3: Abstract Hypothesis</h4><p class="text-slate-300 text-base mt-2 font-medium">"Do you think technology will change education in the next decade? Explain your perspective."</p></div></div>` 
    }
];

/**
 * The expanded deck: 17 slides, one question group per slide, 3-8 worked sample
 * answers each.
 *
 * It replaced the old 7-slide deck because a single "About You" slide asked for nine
 * details at once and the learner had nothing to model an answer on. Every question
 * from the old deck is still here, in the same order — it is just split so each slide
 * asks about one thing and shows several realistic answers. The interest and tutor
 * examples reuse the lists the Classic Manual Wizard offers (INTEREST_OPTIONS and
 * EXPECTATION_OPTIONS in constants2), so both onboarding routes speak the same
 * vocabulary.
 *
 * Bump DECK_VERSION whenever this array changes shape: the loader uses it to tell a
 * deck saved by an older build apart from the current one.
 */
const DECK_VERSION = 5;
const DEFAULT_SLIDES: CustomSlide[] = [
    {
        id: 'slide-2',
        title: 'About You: Name & Basics',
        emoji: '👤 🎂',
        content: `<p class="ask">Tell me about you.</p><div class="chips"><span class="chip">👤 Name</span><span class="chip">🎂 Age</span><span class="chip">🎁 Birthday</span><span class="chip">⚧️ Gender</span></div><div class="cards"><div class="card"><p class="label">Sample Answer 1</p><p class="answer">"My name is <strong>Sofia</strong>. I am <strong>32 years old</strong> and <strong>female</strong>. My birthday is <strong>May 12</strong>."</p></div><div class="card"><p class="label">Sample Answer 2</p><p class="answer">"I am <strong>Kenji</strong>. I am <strong>28</strong> and <strong>male</strong>. My birthday is <strong>October 5</strong>."</p></div></div>`
    },
    {
        id: 'slide-3',
        title: 'About You: Where You Live',
        emoji: '🏙️ 📍',
        content: `<p class="ask">Where do you live?</p><div class="chips"><span class="chip">🏙️ City</span><span class="chip">🌍 Country</span><span class="chip">🏠 Address</span></div><div class="cards"><div class="card"><p class="label">Sample Answer 1</p><p class="answer">"I live in <strong>Milan, Italy</strong>. My address is <strong>Via Roma 12</strong>."</p></div><div class="card"><p class="label">Sample Answer 2</p><p class="answer">"I live in <strong>Tokyo, Japan</strong>. My address is <strong>Shibuya 3-2-1</strong>."</p></div></div>`
    },
    {
        id: 'slide-4',
        title: 'About You: Work & Study',
        emoji: '💼 🎓',
        content: `<p class="ask">What is your job? What do you study?</p><div class="chips"><span class="chip">💼 Job</span><span class="chip">🎓 Major / Study</span><span class="chip">🏢 Company</span></div><div class="cards"><div class="card"><p class="label">Sample Answer 1</p><p class="answer">"I am a <strong>Design Manager</strong>. I studied <strong>Industrial Design</strong>."</p></div><div class="card"><p class="label">Sample Answer 2</p><p class="answer">"I am a <strong>Software Engineer</strong>. My degree is <strong>Computer Science</strong>."</p></div></div>`
    },
    {
        id: 'slide-5',
        title: 'About You: Language & Contact',
        emoji: '🗣️ 📧',
        content: `<p class="ask">What is your first language? What is your email?</p><div class="chips"><span class="chip">🗣️ First language</span><span class="chip">🗨️ Other languages</span><span class="chip">📧 Email</span></div><div class="cards"><div class="card"><p class="label">Sample Answer 1</p><p class="answer">"My first language is <strong>Italian</strong>. My email is <strong>sofia.design@gmail.com</strong>."</p></div><div class="card"><p class="label">Sample Answer 2</p><p class="answer">"I speak <strong>Japanese</strong> and a little <strong>English</strong>. My email is <strong>kenji.code@gmail.com</strong>."</p></div></div>`
    },
    {
        id: 'slide-6',
        title: 'Your Goals: Where You Need English',
        emoji: '🎯 🌍',
        content: `<p class="ask">Why do you need English?</p><div class="chips"><span class="chip">💼 Success at work</span><span class="chip">✈️ For travel</span><span class="chip">🎓 For study</span><span class="chip">📝 For exams</span><span class="chip">🏡 Moving abroad</span><span class="chip">🗣️ Daily conversations</span><span class="chip">🤝 Family & friends</span><span class="chip">📞 Client calls</span><span class="chip">📊 Presentations</span><span class="chip">📧 Emails</span><span class="chip">🎤 Job interviews</span></div><div class="cards"><div class="card"><p class="label">Sample Answer 1</p><p class="answer">"I need English for <strong>work</strong>: <strong>meetings</strong>, <strong>emails</strong>, and <strong>client calls</strong>."</p></div><div class="card"><p class="label">Sample Answer 2</p><p class="answer">"I need it for <strong>travel</strong> and for <strong>everyday</strong> talks with <strong>friends</strong>."</p></div></div>`
    },
    {
        id: 'slide-7',
        title: 'Your Goals: What to Improve',
        emoji: '💬 🎧',
        content: `<p class="ask">What do you want to improve?</p><div class="chips"><span class="chip">🗣️ Speaking</span><span class="chip">👂 Listening</span><span class="chip">📖 Vocabulary</span><span class="chip">📐 Grammar</span><span class="chip">🎙️ Pronunciation</span><span class="chip">✍️ Writing</span><span class="chip">🌊 Fluency</span></div><div class="cards"><div class="card"><p class="label">Sample Answer 1</p><p class="answer">"I want to improve <strong>speaking</strong> and <strong>listening</strong>."</p></div><div class="card"><p class="label">Sample Answer 2</p><p class="answer">"My <strong>grammar</strong> and <strong>vocabulary</strong> are weak. I want more <strong>fluency</strong>."</p></div></div>`
    },
    {
        id: 'slide-8',
        title: 'How You Learn Best',
        emoji: '🧠 🖼️',
        content: `<p class="ask">How do you learn best?</p><div class="chips"><span class="chip">🖼️ Visual (pictures)</span><span class="chip">🎧 Auditory (listening)</span><span class="chip">🤸 Kinesthetic (doing)</span><span class="chip">✍️ Reading & writing</span></div><div class="cards"><div class="card"><p class="label">Sample Answer 1</p><p class="answer">"I learn best with <strong>pictures</strong> and <strong>videos</strong>."</p></div><div class="card"><p class="label">Sample Answer 2</p><p class="answer">"I learn best by <strong>listening</strong> and <strong>speaking</strong> with people."</p></div></div>`
    },
    {
        id: 'slide-9',
        title: 'Your Strengths',
        emoji: '💪 💡',
        content: `<p class="ask">What are you good at?</p><div class="chips"><span class="chip">🧠 Memory</span><span class="chip">⚖️ Logic</span><span class="chip">💡 Creativity</span><span class="chip">🎯 Focus</span></div><div class="cards"><div class="card"><p class="label">Sample Answer 1</p><p class="answer">"I have a good <strong>memory</strong>. I remember new <strong>words</strong> fast."</p></div><div class="card"><p class="label">Sample Answer 2</p><p class="answer">"I am good at <strong>logic</strong>. I like <strong>rules</strong> and <strong>patterns</strong>."</p></div></div>`
    },
    {
        id: 'slide-10',
        title: 'How You Feel in Class',
        emoji: '🎭 ❤️',
        content: `<p class="ask">How do you feel in class?</p><div class="chips"><span class="chip">🔥 Motivation</span><span class="chip">💪 Confidence</span><span class="chip">😥 Anxiety</span><span class="chip">😨 Fear of mistakes</span><span class="chip">🎲 Risk-taking</span></div><div class="cards"><div class="card"><p class="label">Sample Answer 1</p><p class="answer">"I am <strong>motivated</strong> and <strong>confident</strong>. Please correct me any time."</p></div><div class="card"><p class="label">Sample Answer 2</p><p class="answer">"I feel <strong>anxious</strong> when I speak. I have a <strong>fear of mistakes</strong>."</p></div></div>`
    },
    {
        id: 'slide-11',
        title: 'What Do You Like?',
        emoji: '🌍 ⚽',
        content: `<p class="ask">What do you like?</p><div class="chips"><div class="flex flex-wrap gap-2.5 justify-center max-w-7xl mx-auto pt-3 pb-2"><span class="chip">💻 Technology</span><span class="chip">🎨 Art & Design</span><span class="chip">🔬 Science</span><span class="chip">📜 History</span><span class="chip">✈️ Travel</span><span class="chip">🍔 Food & Cooking</span><span class="chip">🎵 Music</span><span class="chip">🎬 Movies & TV Shows</span><span class="chip">🎮 Gaming</span><span class="chip">⚽ Sports</span><span class="chip">🏊 Swimming</span><span class="chip">👗 Fashion</span><span class="chip">💪 Fitness & Health</span><span class="chip">📚 Reading</span><span class="chip">✍️ Writing</span><span class="chip">📷 Photography</span><span class="chip">🌲 Nature & Outdoors</span><span class="chip">🐾 Animals & Pets</span><span class="chip">🌱 Gardening</span><span class="chip">💃 Dancing</span><span class="chip">🎭 Theater & Performing Arts</span><span class="chip">🚀 Space & Astronomy</span><span class="chip">🧠 Psychology</span><span class="chip">🤔 Philosophy</span><span class="chip">🗣️ Languages</span><span class="chip">🗺️ Geography</span><span class="chip">🏛️ Politics & Current Events</span></div><div class="cards"><div class="card"><p class="label">Sample Answer 1</p><p class="answer">"I like <strong>sports</strong> — <strong>swimming</strong> and <strong>football</strong>. I also play <strong>games</strong>."</p></div><div class="card"><p class="label">Sample Answer 2</p><p class="answer">"I like <strong>cooking</strong>, <strong>travel</strong>, and <strong>music</strong>."</p></div></div>`
    },
    {
        id: 'slide-12',
        title: 'Your Ideal Teacher',
        emoji: '🤝 😊',
        content: `<p class="ask">How should your teacher be?</p><div class="chips"><span class="chip">😊 Approachable</span><span class="chip">🤗 Patient</span><span class="chip">🙏 Supportive</span><span class="chip">🤝 Respectful</span><span class="chip">⚡ Energetic</span><span class="chip">😂 Fun</span><span class="chip">🧐 Serious</span><span class="chip">🧠 Knowledgeable</span><span class="chip">✨ Enthusiastic</span></div><div class="cards"><div class="card"><p class="label">Sample Answer 1</p><p class="answer">"I want a <strong>patient</strong> and <strong>supportive</strong> teacher."</p></div><div class="card"><p class="label">Sample Answer 2</p><p class="answer">"I like <strong>fun</strong> and <strong>energetic</strong> lessons."</p></div></div>`
    },
    {
        id: 'slide-13',
        title: 'Lessons, Homework & Feedback',
        emoji: '📂 📝',
        content: `<p class="ask">How do you like your lessons?</p><div class="chips"><span class="chip">⏰ On time</span><span class="chip">📂 Organized</span><span class="chip">💬 Clear speech</span><span class="chip">🎯 Clear feedback</span><span class="chip">✍️ Homework: yes</span><span class="chip">🙅 Homework: no</span><span class="chip">🛠️ Correct me</span></div><div class="cards"><div class="card"><p class="label">Sample Answer 1</p><p class="answer">"Please <strong>give me homework</strong> and check it every week."</p></div><div class="card"><p class="label">Sample Answer 2</p><p class="answer">"No <strong>homework</strong>, please. Just <strong>correct</strong> me in class."</p></div></div>`
    },
    {
        id: 'slide-14',
        title: 'Your Level',
        emoji: '📊 🚀',
        content: `<p class="ask">What is your level now? What level do you want?</p><div class="chips"><span class="chip">🌱 A1 Beginner</span><span class="chip">🌿 A2 Elementary</span><span class="chip">🌳 B1 Intermediate</span><span class="chip">🌲 B2 Upper-Intermediate</span><span class="chip">🚀 C1 Advanced</span><span class="chip">🏆 C2 Expert</span></div><div class="cards"><div class="card"><p class="label">Sample Answer 1</p><p class="answer">"I am <strong>Intermediate (B1)</strong>. I want <strong>Upper-Intermediate (B2)</strong>."</p></div><div class="card"><p class="label">Sample Answer 2</p><p class="answer">"I am <strong>Advanced (C1)</strong>. My goal is <strong>Expert (C2)</strong>."</p></div></div>`
    },
    {
        id: 'slide-15',
        title: 'Lesson Time & Coursebook',
        emoji: '⏱️ 📅',
        content: `<p class="ask">How long and how often?</p><div class="chips"><span class="chip">⏱️ 30 min</span><span class="chip">⏳ 45 min</span><span class="chip">🕐 60 min</span><span class="chip">🕑 90 min</span><span class="chip">📅 1x week</span><span class="chip">🗓️ 2x week</span><span class="chip">📆 3x week</span><span class="chip">1️⃣ 8 sessions</span><span class="chip">🔢 24 sessions</span><span class="chip">#️⃣ 48 sessions</span><span class="chip">📚 Coursebook</span></div><div class="cards"><div class="card"><p class="label">Sample Answer 1</p><p class="answer">"<strong>60 minutes</strong>, <strong>2x per week</strong>, <strong>24 sessions</strong>."</p></div><div class="card"><p class="label">Sample Answer 2</p><p class="answer">"<strong>90 minutes</strong>, <strong>3x per week</strong>, <strong>48 sessions</strong>. I want a <strong>coursebook</strong>."</p></div></div>`
    },
    {
        id: 'slide-16',
        title: 'Placement Test A: Daily Life',
        emoji: '📆 ☀️',
        content: `<p class="ask">What did you do yesterday evening?</p><div class="chips"><span class="chip">🕒 Yesterday</span><span class="chip">🍽️ Dinner</span><span class="chip">🎬 A film</span><span class="chip">🔁 My routine</span></div><div class="cards"><div class="card"><p class="label">Sample A1 · A1-A2</p><p class="answer">"Yesterday I <strong>cooked</strong> dinner and <strong>watched</strong> a <strong>film</strong>."</p></div><div class="card"><p class="label">Sample A2 · A2</p><p class="answer">"After work I <strong>went</strong> to the <strong>gym</strong>, then I <strong>studied</strong> English."</p></div></div>`
    },
    {
        id: 'slide-17',
        title: 'Placement Test B: City or Village',
        emoji: '⚖️ 🏙️',
        content: `<p class="ask">Big city or small village? Why?</p><div class="chips"><span class="chip">🏙️ City: jobs, shops</span><span class="chip">🏡 Village: quiet, nature</span><span class="chip">✅ Good points</span><span class="chip">❌ Bad points</span></div><div class="cards"><div class="card"><p class="label">Sample B1 · B1</p><p class="answer">"I like the <strong>city</strong>: more <strong>jobs</strong> and <strong>shops</strong>. But it is <strong>expensive</strong>."</p></div><div class="card"><p class="label">Sample B2 · B2</p><p class="answer">"I prefer a <strong>village</strong>. It is <strong>quiet</strong> and <strong>cheap</strong>. But you need a <strong>car</strong>."</p></div></div>`
    },
    {
        id: 'slide-18',
        title: 'Placement Test C: Technology & Education',
        emoji: '🔮 🤖',
        content: `<p class="ask">Will technology change education? Why?</p><div class="chips"><span class="chip">🤖 Technology</span><span class="chip">🏫 Education</span><span class="chip">🔮 The future</span><span class="chip">🤔 My opinion</span></div><div class="cards"><div class="card"><p class="label">Sample C1 · B2</p><p class="answer">"I think <strong>technology</strong> will help <strong>education</strong>. Students can learn at home."</p></div><div class="card"><p class="label">Sample C2 · C1</p><p class="answer">"Maybe, but <strong>teachers</strong> are still important. I prefer a <strong>hybrid</strong> class."</p></div></div>`
    }
];

const SLIDE_DECK_STORAGE_PREFIX = 'tutor_slides_deck_';

interface StoredSlideDeck {
    version: number;
    slides: CustomSlide[];
}

const slideDeckStorageKey = () =>
    `${SLIDE_DECK_STORAGE_PREFIX}${useAppStore.getState().tutorInfo?.email || 'default'}`;

/** A slide that shipped with the app (custom ones are `slide-custom-<timestamp>`). */
const isShippedSlideId = (id: string) => /^slide-\d+$/.test(id);

/**
 * Reads the tutor's deck, upgrading it to DECK_VERSION on the way.
 *
 * The upgrade rule is the important part: a deck saved by an older build used to shadow
 * every new default slide, so an expanded deck was invisible to anyone who had ever
 * opened the editor. Now the shipped slides always come from DEFAULT_SLIDES, and only
 * the slides a tutor added themselves (`slide-custom-…`) survive from an old save. The
 * deck is re-persisted under the new version, so the migration runs at most once.
 */
function loadSlideDeck(): { slides: CustomSlide[]; migrated: boolean } {
    try {
        const raw = localStorage.getItem(slideDeckStorageKey());
        if (!raw) return { slides: DEFAULT_SLIDES, migrated: false };
        const parsed = JSON.parse(raw) as StoredSlideDeck | CustomSlide[] | null;
        const stored = Array.isArray(parsed) ? { version: 0, slides: parsed } : parsed;
        if (!stored || !Array.isArray(stored.slides) || stored.slides.length === 0) {
            return { slides: DEFAULT_SLIDES, migrated: false };
        }
        if (stored.version === DECK_VERSION) {
            return { slides: stored.slides, migrated: false };
        }
        const ownSlides = stored.slides.filter((s) => s && s.id && !isShippedSlideId(s.id));
        return { slides: [...DEFAULT_SLIDES, ...ownSlides], migrated: true };
    } catch (e) {
        console.error("Failed to load custom slides", e);
        return { slides: DEFAULT_SLIDES, migrated: false };
    }
}

function persistSlideDeck(deck: CustomSlide[]) {
    try {
        const payload: StoredSlideDeck = { version: DECK_VERSION, slides: deck };
        localStorage.setItem(slideDeckStorageKey(), JSON.stringify(payload));
    } catch (e) {
        console.error("Failed to save custom slides", e);
    }
}

const OnboardingWizard: React.FC = () => {
    const [step, setStep] = useState(1);
    const [onboardingMode, setOnboardingMode] = useState<'selection' | 'manual' | 'automatic'>('selection');
    const [slideIndex, setSlideIndex] = useState(0);
    const [autoName, setAutoName] = useState('');
    const [pastedJsonText, setPastedJsonText] = useState('');
    const [isJsonFaulty, setIsJsonFaulty] = useState(false);
    const [parsedLearnerData, setParsedLearnerData] = useState<Partial<Learner> | null>(null);

    const [isCoursebookModalOpen, setIsCoursebookModalOpen] = useState(false);
    const [selectedCoursebookIdForModal, setSelectedCoursebookIdForModal] = useState<string | undefined>(undefined);
    const [activeVideoModalId, setActiveVideoModalId] = useState<string | null>(null);
    const [activeTocDrawerId, setActiveTocDrawerId] = useState<string | null>(null);

    const [deckLoad] = useState(() => loadSlideDeck());
    const [slides, setSlides] = useState<CustomSlide[]>(deckLoad.slides);
    const [deckNotice, setDeckNotice] = useState(deckLoad.migrated);

    // Upgrading a deck saved by an older build is a one-time, on-mount write.
    useEffect(() => {
        if (deckLoad.migrated) {
            persistSlideDeck(deckLoad.slides);
            console.info(`Onboarding slide deck upgraded to version ${DECK_VERSION}`);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingSlides, setEditingSlides] = useState<CustomSlide[]>([]);
    const [activeEditIndex, setActiveEditIndex] = useState(0);
    const [editTitle, setEditTitle] = useState('');
    const [editEmoji, setEditEmoji] = useState('');
    const [editContent, setEditContent] = useState('');

    const handleSaveSlides = (newSlides: CustomSlide[]) => {
        setSlides(newSlides);
        persistSlideDeck(newSlides);
    };

    const handleResetSlides = () => {
        if (window.confirm(`Reset the slide deck to the shipped ${DEFAULT_SLIDES.length}-slide version? All custom edits will be lost.`)) {
            handleSaveSlides(DEFAULT_SLIDES);
            setSlides(DEFAULT_SLIDES);
            setDeckNotice(false);
            if (slideIndex > DEFAULT_SLIDES.length) {
                setSlideIndex(DEFAULT_SLIDES.length);
            }
            setIsEditorOpen(false);
        }
    };

    useEffect(() => {
        if (isEditorOpen) {
            setEditingSlides([...slides]);
            setActiveEditIndex(0);
            if (slides.length > 0) {
                setEditTitle(slides[0].title);
                setEditEmoji(slides[0].emoji);
                setEditContent(slides[0].content);
            }
        }
    }, [isEditorOpen, slides]);

    const updateActiveEditSlide = (field: 'title' | 'emoji' | 'content', val: string) => {
        if (field === 'title') setEditTitle(val);
        else if (field === 'emoji') setEditEmoji(val);
        else if (field === 'content') setEditContent(val);

        setEditingSlides(prev => prev.map((s, idx) => {
            if (idx === activeEditIndex) {
                return { ...s, [field]: val };
            }
            return s;
        }));
    };

    const handleAddNewSlide = () => {
        const newSlide: CustomSlide = {
            id: `slide-custom-${Date.now()}`,
            title: 'New Onboarding Slide',
            emoji: '💡',
            content: '<p>Edit this text to ask the student about their goals or background.</p>'
        };
        const updated = [...editingSlides, newSlide];
        setEditingSlides(updated);
        setActiveEditIndex(updated.length - 1);
        setEditTitle(newSlide.title);
        setEditEmoji(newSlide.emoji);
        setEditContent(newSlide.content);
    };

    const handleDeleteActiveSlide = () => {
        if (editingSlides.length <= 1) {
            alert("You must have at least 1 slide in the deck.");
            return;
        }
        if (window.confirm("Are you sure you want to delete this slide?")) {
            const updated = editingSlides.filter((_, idx) => idx !== activeEditIndex);
            setEditingSlides(updated);
            const newActiveIdx = Math.max(0, activeEditIndex - 1);
            setActiveEditIndex(newActiveIdx);
            setEditTitle(updated[newActiveIdx].title);
            setEditEmoji(updated[newActiveIdx].emoji);
            setEditContent(updated[newActiveIdx].content);
        }
    };

    const handleSwitchEditSlide = (idx: number) => {
        setActiveEditIndex(idx);
        setEditTitle(editingSlides[idx].title);
        setEditEmoji(editingSlides[idx].emoji);
        setEditContent(editingSlides[idx].content);
    };

    const applyTextFormatting = (type: 'bold' | 'italic' | 'size-sm' | 'size-md' | 'size-lg' | 'size-xl' | 'emoji', value?: string) => {
        const textarea = document.getElementById('slide-content-textarea') as HTMLTextAreaElement;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end);

        let replacement = '';
        if (type === 'bold') {
            replacement = `<strong>${selectedText || 'bold text'}</strong>`;
        } else if (type === 'italic') {
            replacement = `<em>${selectedText || 'italic text'}</em>`;
        } else if (type === 'size-sm') {
            replacement = `<span style="font-size: 14px;">${selectedText || 'small text'}</span>`;
        } else if (type === 'size-md') {
            replacement = `<span style="font-size: 18px;">${selectedText || 'medium text'}</span>`;
        } else if (type === 'size-lg') {
            replacement = `<span style="font-size: 24px;">${selectedText || 'large text'}</span>`;
        } else if (type === 'size-xl') {
            replacement = `<span style="font-size: 32px;">${selectedText || 'extra large text'}</span>`;
        } else if (type === 'emoji' && value) {
            replacement = value;
        }

        const newText = text.substring(0, start) + replacement + text.substring(end);
        
        updateActiveEditSlide('content', newText);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + replacement.length, start + replacement.length);
        }, 0);
    };

    const cleanAndParseJSON = (text: string): any => {
        let clean = text.trim();
        // Remove markdown code block markers if any
        if (clean.includes('```')) {
            const matches = clean.match(/```(?:json)?([\s\S]+?)```/);
            if (matches && matches[1]) {
                clean = matches[1].trim();
            } else {
                clean = clean.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
            }
        }
        // Remove conversational text outside the outer-most JSON braces
        const firstBrace = clean.indexOf('{');
        const lastBrace = clean.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            clean = clean.substring(firstBrace, lastBrace + 1);
        }
        return JSON.parse(clean);
    };

    const normalizeLearnerProfileData = (raw: any): Partial<Learner> => {
        if (!raw || typeof raw !== 'object') return {};

        // 1. Personal Information
        const name = raw.name || raw.fullName || raw.studentName || raw.registeredName || 'New Learner';
        const registeredName = raw.registeredName || name;
        const email = raw.email || '';
        const phone = raw.phone || '';
        const country = raw.country || raw.location || '';
        const city = raw.city || '';
        const occupation = raw.occupation || raw.job || raw.profession || '';
        const major = raw.major || raw.fieldOfStudy || raw.field_of_study || '';
        const l1Language = raw.l1Language || raw.l1 || raw.nativeLanguage || raw.native_language || raw.speakingLanguage || raw.language || '';
        const targetLanguage = raw.targetLanguage || raw.l2 || raw.learningLanguage || raw.learning_language || 'English';
        const gender = raw.gender || 'PreferNotToSay';

        // 2. Pedagogical Context & Situational Context
        const situations = raw.situations || raw.targetSituations || raw.target_situations || raw.situationalContext || raw.situational_context || raw.situationsContext || raw.situationalContexts || '';
        const focus = raw.focus || raw.instructionalFocus || raw.instructional_focus || raw.pedagogicalFocus || raw.pedagogical_focus || raw.learningFocus || '';
        const learningStyle = raw.learningStyle || raw.learning_style || raw.learningPreferences || raw.learning_preferences || '';
        const expectations = raw.expectations || raw.tutorExpectations || raw.tutor_expectations || raw.expectationsFromTutor || '';
        
        // Interests
        let interests = '';
        if (typeof raw.interests === 'string') {
            interests = raw.interests;
        } else if (Array.isArray(raw.interests)) {
            interests = raw.interests.join(', ');
        } else if (raw.hobbies) {
            interests = Array.isArray(raw.hobbies) ? raw.hobbies.join(', ') : String(raw.hobbies);
        }

        // Facts
        let factsArr: string[] = [];
        if (Array.isArray(raw.facts)) {
            factsArr = raw.facts.map((f: any) => typeof f === 'string' ? f.trim() : String(f)).filter(Boolean);
        } else if (typeof raw.facts === 'string' && raw.facts.trim()) {
            factsArr = raw.facts.split('\n').map((f: any) => f.trim()).filter(Boolean);
        }
        if (Array.isArray(raw.personalFacts)) {
            const pf = raw.personalFacts.map((f: any) => typeof f === 'string' ? f.trim() : String(f)).filter(Boolean);
            factsArr = [...new Set([...factsArr, ...pf])];
        } else if (typeof raw.personalFacts === 'string' && raw.personalFacts.trim()) {
            const pf = raw.personalFacts.split('\n').map((f: any) => f.trim()).filter(Boolean);
            factsArr = [...new Set([...factsArr, ...pf])];
        }
        if (raw.funFacts) {
            const ff = Array.isArray(raw.funFacts) ? raw.funFacts : String(raw.funFacts).split('\n');
            factsArr = [...new Set([...factsArr, ...ff.map((f: any) => f.trim()).filter(Boolean)])];
        }

        // 3. Course Parameters / Plan
        const rawCoursePlan = raw.coursePlan || raw.course_plan || raw.plan || {};
        const levelStr = normalizeReviewCefrLevel(rawCoursePlan.level || raw.level || raw.cefrLevel || raw.cefr_level, 'B1');
        const targetLevelStr = normalizeReviewCefrLevel(rawCoursePlan.targetLevel || raw.targetLevel || raw.target_level, 'B2');
        const courseName = rawCoursePlan.courseName || raw.courseName || raw.course_name || 'General English';
        const duration = typeof rawCoursePlan.duration === 'number' ? rawCoursePlan.duration : (parseInt(rawCoursePlan.duration) || 60);
        const frequency = rawCoursePlan.frequency || 'Balanced';
        const totalSessions = typeof rawCoursePlan.totalSessions === 'number' ? rawCoursePlan.totalSessions : (parseInt(rawCoursePlan.totalSessions) || 24);

        const coursePlan: CoursePlan = {
            level: levelStr,
            targetLevel: targetLevelStr,
            courseName,
            duration,
            frequency,
            totalSessions,
            ...(rawCoursePlan.features ? { features: rawCoursePlan.features } : {})
        };

        // 4. Needs & Competencies
        let rawNeeds: any[] = Array.isArray(raw.needs) ? raw.needs : [];
        if (rawNeeds.length === 0 && Array.isArray(raw.needsAndExpectations)) {
            rawNeeds = raw.needsAndExpectations;
        }

        const needs: Need[] = rawNeeds.map((n: any, idx: number) => {
            const needName = n.name || n.title || n.needName || `Goal Need ${idx + 1}`;
            const rating = typeof n.rating === 'number' ? n.rating : 3;
            
            let learningPath: Skill[] = [];
            if (Array.isArray(n.learningPath)) {
                learningPath = n.learningPath.map((s: any, sIdx: number) => {
                    if (typeof s === 'string') {
                        return { id: `s_${idx}_${sIdx}_${Date.now()}`, name: s, progress: 0 };
                    }
                    return {
                        id: s.id || `s_${idx}_${sIdx}_${Date.now()}`,
                        name: s.name || s.skillName || s.title || `Competency ${sIdx + 1}`,
                        progress: typeof s.progress === 'number' ? s.progress : 0
                    };
                });
            } else if (Array.isArray(n.skills)) {
                learningPath = n.skills.map((s: any, sIdx: number) => {
                    if (typeof s === 'string') {
                        return { id: `s_${idx}_${sIdx}_${Date.now()}`, name: s, progress: 0 };
                    }
                    return {
                        id: s.id || `s_${idx}_${sIdx}_${Date.now()}`,
                        name: s.name || s.skillName || s.title || `Competency ${sIdx + 1}`,
                        progress: typeof s.progress === 'number' ? s.progress : 0
                    };
                });
            }

            return {
                id: n.id || `n_${idx}_${Date.now()}`,
                name: needName,
                rating,
                learningPath
            };
        });

        // Extract competencies
        let rawCompetencies: any[] = Array.isArray(raw.competencies) ? raw.competencies : [];
        const competenciesMap = new Map<string, Competency>();

        // Populate from raw.competencies if present
        rawCompetencies.forEach((c: any, idx: number) => {
            const compName = c.name || c.title || c.competencyName || `Competency ${idx + 1}`;
            const key = compName.toLowerCase().trim();
            competenciesMap.set(key, {
                id: c.id || `c_${idx}_${Date.now()}`,
                name: compName,
                icon: c.icon || 'target',
                rating: typeof c.rating === 'number' ? c.rating : 3,
                initialProgress: typeof c.initialProgress === 'number' ? c.initialProgress : (typeof c.progress === 'number' ? c.progress : 0),
                progress: typeof c.progress === 'number' ? c.progress : 0,
                status: c.status || ('OnTrack' as CompetencyStatus)
            });
        });

        // CRITICAL: Ensure EVERY skill in needs[].learningPath has a corresponding Competency entry!
        needs.forEach(need => {
            (need.learningPath || []).forEach(skill => {
                const key = skill.name.toLowerCase().trim();
                if (!competenciesMap.has(key)) {
                    competenciesMap.set(key, {
                        id: skill.id || `c_${Math.random().toString(36).substr(2, 6)}`,
                        name: skill.name,
                        icon: 'target',
                        rating: need.rating || 3,
                        initialProgress: skill.progress || 0,
                        progress: skill.progress || 0,
                        status: 'OnTrack' as CompetencyStatus
                    });
                }
            });
        });

        const competencies: Competency[] = Array.from(competenciesMap.values());
        const goals = needs.map(n => n.name);

        // 5. Coursebook Manager Recommendations Mapping
        let rawSuggested: any[] = Array.isArray(raw.suggestedCoursebooks) ? raw.suggestedCoursebooks : (Array.isArray(raw.recommendedCoursebooks) ? raw.recommendedCoursebooks : []);
        let suggestedCoursebooks: Array<{
            id: string;
            title: string;
            matchReason: string;
            recommendedLevel: string;
            book?: CoursebookDetailed;
        }> = [];

        if (rawSuggested.length > 0) {
            rawSuggested.forEach((item: any) => {
                if (!item) return;
                const bookId = item.id || item.coursebookId || item.title || '';
                const found = COURSEBOOK_MANAGER_DATA.find(b => 
                    b.id.toLowerCase() === String(bookId).toLowerCase() || 
                    b.coursebook.toLowerCase().includes(String(bookId).toLowerCase()) ||
                    String(bookId).toLowerCase().includes(b.id.toLowerCase())
                );
                if (found) {
                    suggestedCoursebooks.push({
                        id: found.id,
                        title: found.coursebook,
                        matchReason: item.matchReason || item.reason || `Tailored for ${found.category} and ${found.primaryFocus}.`,
                        recommendedLevel: item.recommendedLevel || item.level || levelStr || found.cefr,
                        book: found
                    });
                } else if (item.title) {
                    suggestedCoursebooks.push({
                        id: item.id || `cb_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                        title: item.title,
                        matchReason: item.matchReason || `Recommended based on student preferences and focus on ${focus || 'language mastery'}.`,
                        recommendedLevel: item.recommendedLevel || levelStr || 'B1'
                    });
                }
            });
        }

        // Fallback logic if AI returned 0 or 1 books
        if (suggestedCoursebooks.length < 2) {
            const existingIds = new Set(suggestedCoursebooks.map(s => s.id));
            const occLower = (occupation || '').toLowerCase();
            const focusLower = (focus || '').toLowerCase();

            COURSEBOOK_MANAGER_DATA.forEach(b => {
                if (existingIds.has(b.id) || suggestedCoursebooks.length >= 3) return;
                
                let isMatch = false;
                if (occLower.includes('business') || occLower.includes('manager') || occLower.includes('engineer') || focusLower.includes('business') || focusLower.includes('corporate')) {
                    if (b.category === 'Business English' || b.id === 'business-partner') isMatch = true;
                } else if (focusLower.includes('exam') || focusLower.includes('ielts')) {
                    if (b.category === 'Exam Preparation' || b.id === 'ielts-mindset') isMatch = true;
                } else if (focusLower.includes('academic') || focusLower.includes('university')) {
                    if (b.category === 'Academic English' || b.id === 'unlock-3rd') isMatch = true;
                } else if (focusLower.includes('travel') || focusLower.includes('trip')) {
                    if (b.category === 'Survival & Travel' || b.id === 'hot-english-travel') isMatch = true;
                } else if (focusLower.includes('slang') || focusLower.includes('casual')) {
                    if (b.category === 'Slang & Colloquial' || b.id === 'slangman-street-speak') isMatch = true;
                }

                if (isMatch || suggestedCoursebooks.length < 2) {
                    suggestedCoursebooks.push({
                        id: b.id,
                        title: b.coursebook,
                        matchReason: `Selected from Coursebook Manager catalog for ${b.ageGroupCategory} matching CEFR level ${levelStr} and focus on ${b.primaryFocus}.`,
                        recommendedLevel: levelStr || b.cefr,
                        book: b
                    });
                    existingIds.add(b.id);
                }
            });
        }

        return {
            ...raw,
            name,
            registeredName,
            email,
            phone,
            country,
            city,
            occupation,
            major,
            l1Language,
            targetLanguage,
            gender,
            level: toCourseLevelEnum(levelStr),
            cefrLevel: levelStr,
            situations,
            focus,
            learningStyle,
            expectations,
            interests,
            facts: factsArr,
            coursePlan,
            plan: coursePlan,
            suggestedCoursebooks,
            needs,
            competencies,
            goals
        };
    };

    const getAnalysisPrompt = (learnerName: string) => {
        const coursebooksCatalogStr = COURSEBOOK_MANAGER_DATA.map(cb => 
            `- ID: "${cb.id}" | Coursebook Title: "${cb.coursebook}" | Publisher: ${cb.publisher} | CEFR: ${cb.cefr} | Age Category: ${cb.ageGroupCategory} | Category: ${cb.category} | Primary Focus: ${cb.primaryFocus} | Units: ${cb.unitsCount}`
        ).join('\n');

        return `You are an expert language tutor and curriculum designer.
I have just completed an oral interview with my language student, ${learnerName || 'the student'}.
I will provide you with the raw, messy oral interview transcript or tutor notes.

Analyze this messy input, fix spelling errors, guess their country of origin and native language (L1), identify their professional occupation or study, and understand their learning preferences, expectations, and goals.

========================================
PLACEMENT TEST ANALYSIS & LEVEL CALIBRATION GUIDELINES:
The interview contains a Placement Test section with responses to 3 specific speaking questions:
- Question A (Routine / Basic past): "What did you do yesterday evening? Tell us about your routine."
- Question B (Opinions & Comparing / Independent): "Compare living in a big city with living in a small village. What are the pros and cons?"
- Question C (Abstract / Proficient Hypothesis): "Do you think artificial intelligence will replace humans in creative fields in the next decade? Explain your perspective."

You must inspect the answers to these questions to determine the learner's current CEFR level:
1. Look for A-level speech patterns (A1/A2): Simple sentences, basic present/past tense, simple coordinates ("and", "but"), routine topics. If the student struggles beyond basic routine, assign "Beginner" (A1) or "Elementary" (A2).
2. Look for B-level speech patterns (B1/B2): Able to compare, explain pros and cons, use subordinating clauses ("because", "although", "while"), state clear opinions, and use modal verbs. If they express intermediate thoughts clearly but lacks high-level nuance, assign "Intermediate" (B1) or "Upper-Intermediate" (B2).
3. Look for C-level speech patterns (C1/C2): Uses hypothetical reasoning (conditionals like "If AI were to..."), advanced discourse markers ("consequently", "nevertheless", "on the contrary"), abstract vocabulary, and shows high-level fluency and grammatical complexity. If they handle complex/abstract arguments comfortably, assign "Advanced" (C1) or "Expert" (C2).

Calibrate and output the chosen level in the "coursePlan.level" field accordingly. The value MUST be one of these exact CEFR codes, matching our Lesson Customization levels: A1, A2, A2+, B1, B1+, B2, C1, C2. Do not let the general student background info (like job or major) bias your linguistic analysis of their spoken output.
========================================

========================================
OFFICIAL COURSEBOOK MANAGER RECOMMENDATION INSTRUCTION:
You MUST analyze the student's background, age group, level, occupation, and goals against our official Coursebook Manager catalog below:

${coursebooksCatalogStr}

Select 1 to 3 coursebooks from this catalog that are the absolute best match for this student.
For each selected coursebook, provide a tailored 1-2 sentence matchReason explaining why this specific book fits their goals.
Output them inside a "suggestedCoursebooks" array in the JSON schema.
========================================

IMPORTANT: Based on their goals and what they say about their needs (e.g., "confidence", "business writing", "presentation skills"), you must automatically generate 10 to 15 highly relevant, practical, and measurable competencies (language skills/competencies) to help them achieve their goals. Group them under relevant "needs" folders.
For needs, in the slides just show Needs, situations, and focus.

Generate and output exactly a single, valid JSON object with the following schema:
{
  "name": "${learnerName || 'Student Name'}",
  "country": "Best estimate of country (e.g. Brazil)",
  "city": "Best estimate of city or empty",
  "occupation": "Best estimate of occupation (e.g. Software Engineer)",
  "major": "Best estimate of major/field of study or empty",
  "gender": "Male, Female, or PreferNotToSay",
  "l1Language": "Native language (e.g. Portuguese)",
  "targetLanguage": "English",
  "interests": "Hobbies and topics of interest separated by commas (e.g. Tech, Hiking, Cooking)",
  "facts": [], // IMPORTANT: Extract 3 to 7 clean, highly specific facts, personal stories, details about their family, pets, unique hobbies, travels, or interesting background details provided in the raw interview text. Format: ["Has a cat named Lulu", "Loves Italian gourmet cooking"].
  "situations": "Real-world situations where they will use the language (e.g. Weekly team syncs, client emails)",
  "focus": "Pedagogical focus for lessons (e.g. Speaking confidence, grammar correction)",
  "learningStyle": "Visual, Auditory, Kinesthetic, or Read/Write",
  "expectations": "Tutor expectations (e.g. Patient & Supportive, Structured & Detail-oriented)",
  "coursePlan": {
    "level": "B1", // MUST be one of these exact CEFR codes: A1, A2, A2+, B1, B1+, B2, C1, C2
    "targetLevel": "B2", // MUST be one of: A1, A2, A2+, B1, B1+, B2, C1, C2
    "courseName": "Business English",
    "duration": 60,
    "frequency": "Balanced",
    "totalSessions": 24
  },
  "suggestedCoursebooks": [
    {
      "id": "business-partner",
      "title": "Business Partner",
      "matchReason": "Completely matches their corporate workflow and presentation needs with authentic Financial Times case studies.",
      "recommendedLevel": "B2"
    }
  ],
  "needs": [
    {
      "id": "n1",
      "name": "General Fluency & Speaking",
      "rating": 4,
      "learningPath": [
        { "id": "s1_1", "name": "🗣️ Introducing oneself confidently", "progress": 0 },
        { "id": "s1_2", "name": "💬 Handling spontaneous Q&A", "progress": 0 }
      ]
    }
  ],
  "competencies": [
    {
      "id": "c1",
      "name": "🗣️ Introducing oneself confidently",
      "progress": 0,
      "rating": 4,
      "icon": "target",
      "status": "OnTrack"
    }
  ]
}

Only return the raw JSON object. Do not include any other text, instructions, or wrappers except a standard code block.

Here is the raw transcript / notes:
[PASTE YOUR MESSY TRANSCRIPT HERE]`;
    };

    const handleSaveParsedLearner = async (data: Partial<Learner>) => {
        const learnersCount = useLearnerStore.getState().learners.length;
        const currentTier = useAuthStore.getState().tier;
        if (!canAddLearner(learnersCount, currentTier)) {
            useAuthStore.getState().openUpgradeModal(`You have reached the Free Tier limit of ${FREE_LEARNER_LIMIT} learner profiles. Upgrade to PRO or VIP to add new learners.`);
            return;
        }

        setIsSubmitting(true);
        const normalizedData = normalizeLearnerProfileData(data);
        let learnerDataWithTimezone = { ...normalizedData };
        if (normalizedData.country) {
            try {
                const timezone = await getTimezoneForLocation(normalizedData.country, normalizedData.city || '');
                if (timezone) {
                    learnerDataWithTimezone.timezone = timezone;
                }
            } catch (error) {
                console.error("Failed to fetch timezone during parsed save", error);
            }
        }
        
        // Ensure all competencies in needs are mapped to competencies array
        const competenciesMap = new Map<string, Competency>();
        (learnerDataWithTimezone.competencies || []).forEach((c, idx) => {
            if (c?.name) competenciesMap.set(c.name.trim().toLowerCase(), c);
        });
        (learnerDataWithTimezone.needs || []).forEach((n, nIdx) => {
            (n.learningPath || []).forEach((s, sIdx) => {
                if (s?.name && !competenciesMap.has(s.name.trim().toLowerCase())) {
                    competenciesMap.set(s.name.trim().toLowerCase(), {
                        id: s.id || `c_${nIdx}_${sIdx}_${Date.now()}`,
                        name: s.name.trim(),
                        icon: 'target',
                        rating: n.rating || 3,
                        initialProgress: s.progress || 0,
                        progress: s.progress || 0,
                        status: (s.progress || 0) >= 40 ? CompetencyStatus.OnTrack : CompetencyStatus.NeedsWork
                    });
                }
            });
        });
        learnerDataWithTimezone.competencies = Array.from(competenciesMap.values());

        const newLearner: Learner = {
            id: Date.now().toString(),
            dateCreated: new Date().toISOString().split('T')[0],
            xp: 0,
            streak: 0,
            sessions: [],
            status: 'active',
            joinedAt: new Date().toISOString(),
            avatarId: 'default',
            ...learnerDataWithTimezone,
        } as Learner;
        
        addLearner(newLearner);
        localStorage.removeItem(DRAFT_KEY);

        // Immediate hard disk persistence before navigation
        if (isDiskModeEnabled()) {
            try {
                await syncLearnerToDisk(newLearner);
                await triggerAutoSyncImmediate();
            } catch (diskErr) {
                console.warn("Failed immediate disk sync during onboarding:", diskErr);
            }
        }

        setIsSubmitting(false);
        alert(`Learner ${newLearner.name} created successfully!`);
        navigate(`/learner/${newLearner.id}`);
    };
    const addLearner = useLearnerStore(state => state.addLearner);
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showLearningTest, setShowLearningTest] = useState(false);

    const handleLearningTestComplete = (results: { vark: string[], gardner: string[], mental: string[], sel: string[] }) => {
        setFormData(prev => {
            const newFactors = { ...(prev.learningFactors || {}) };
            const allTraits = [...results.vark, ...results.gardner, ...results.mental, ...results.sel];
            
            allTraits.forEach(trait => {
                newFactors[trait] = 'strength';
            });
            
            return {
                ...prev,
                learningFactors: newFactors
            };
        });
        setShowLearningTest(false);
    };
    
    // State for the new competency inputs, keyed by need ID
    const [newCompetencyInputs, setNewCompetencyInputs] = useState<Record<string, { name: string; progress: number }>>({});

    const [copiedNeedId, setCopiedNeedId] = useState<string | null>(null);
    const [importModalOpenNeedId, setImportModalOpenNeedId] = useState<string | null>(null);
    const [pastedText, setPastedText] = useState<string>('');
    const [parsedCompetencies, setParsedCompetencies] = useState<string[] | null>(null);
    const [selectedImportIndices, setSelectedImportIndices] = useState<Record<number, boolean>>({});
    const [pasteError, setPasteError] = useState<string | null>(null);

    const handleAddMultipleSkillsToNeed = (needId: string, competencyNames: string[]) => {
        setFormData(prev => {
            let updatedNeeds = [...(prev.needs || [])];
            let updatedCompetencies = [...(prev.competencies || [])];

            competencyNames.forEach((name, idx) => {
                const trimmedName = name.trim();
                if (!trimmedName) return;

                // Find and update the need
                updatedNeeds = updatedNeeds.map(n => {
                    if (n.id === needId) {
                        if (n.learningPath.some(s => s.name.toLowerCase() === trimmedName.toLowerCase())) return n; // No duplicates
                        const newSkill: Skill = { id: `s${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`, name: trimmedName, progress: 0 };
                        return { ...n, learningPath: [...n.learningPath, newSkill] };
                    }
                    return n;
                });

                // Add global competency if not existing
                if (!updatedCompetencies.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
                    const newCompetency: Competency = {
                        id: `c${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
                        name: trimmedName,
                        icon: 'target',
                        rating: 3,
                        initialProgress: 0,
                        progress: 0,
                        status: CompetencyStatus.OnTrack
                    };
                    updatedCompetencies.push(newCompetency);
                }
            });

            return { ...prev, needs: updatedNeeds, competencies: updatedCompetencies };
        });
    };

    const copyPromptToClipboard = (needId: string, needName: string) => {
        const prompt = `You are an expert language tutor and curriculum designer.
I need a comprehensive list of measurable, practical language competencies (short term learning goals) to help the student achieve their long term goal.

Student Profile:
- Name: ${formData.name || 'Student'}
- Country: ${formData.country || 'N/A'}
- Occupation: ${formData.occupation || 'N/A'}
- Target Language (L2): ${formData.targetLanguage || 'L2'}

Long Term Goal:
"${needName}"

Generate a list of exactly 25 to 35 separate, highly specific competencies for this student's L2 learning path.
Rules:
1. Each competency must be described using very simple, easy, literal words (e.g., "Meetings", "Writing emails", not "Navigating corporate streams" or "Mastering textual threads"). No metaphorical or flowery language.
2. Provide a single relevant emoji for each competency.
3. Output the result ONLY as a raw, single JSON code block. Do not write any greetings or warnings outside the JSON block.

The JSON schema must be exactly as follows:
{
  "goal": "${needName}",
  "competencies": [
    {
      "name": "Emoji & Competency text"
    }
  ]
}

Example format:
{
  "goal": "${needName}",
  "competencies": [
    { "name": "🤝 Professional introductions" },
    { "name": "📞 Making phone calls" },
    { "name": "📧 Writing clear emails" }
  ]
}`;

        navigator.clipboard.writeText(prompt);
        setCopiedNeedId(needId);
    };

    const parseAndLoadJSON = (text: string): boolean => {
        try {
            let cleanText = text.trim();
            if (cleanText.startsWith('```')) {
                const matches = cleanText.match(/```(?:json)?([\s\S]+?)```/);
                if (matches && matches[1]) {
                    cleanText = matches[1].trim();
                }
            }

            const parsed = JSON.parse(cleanText);
            let extracted: string[] = [];

            if (Array.isArray(parsed)) {
                extracted = parsed.map((item: any) => {
                    if (typeof item === 'string') return item;
                    if (item && typeof item === 'object') return item.name || item.competency || JSON.stringify(item);
                    return '';
                }).filter(Boolean);
            } else if (parsed && typeof parsed === 'object') {
                const list = parsed.competencies || parsed.skills || parsed.list || parsed.goals || [];
                if (Array.isArray(list)) {
                    extracted = list.map((item: any) => {
                        if (typeof item === 'string') return item;
                        if (item && typeof item === 'object') return item.name || item.text || item.competency || JSON.stringify(item);
                        return '';
                    }).filter(Boolean);
                } else if (typeof parsed.goal === 'string' && Array.isArray(parsed.competencies)) {
                    extracted = parsed.competencies.map((item: any) => item.name || item).filter(Boolean);
                } else {
                    const arrayKey = Object.keys(parsed).find(key => Array.isArray(parsed[key]));
                    if (arrayKey) {
                        extracted = parsed[arrayKey].map((item: any) => {
                            if (typeof item === 'string') return item;
                            if (item && typeof item === 'object') return item.name || item.competency || JSON.stringify(item);
                            return '';
                        }).filter(Boolean);
                    } else {
                        throw new Error("Could not find a competencies list in the parsed JSON object");
                    }
                }
            }

            if (extracted.length === 0) {
                throw new Error("No competencies found in this JSON format.");
            }

            setParsedCompetencies(extracted);
            const initialSelection: Record<number, boolean> = {};
            extracted.forEach((_, idx) => {
                initialSelection[idx] = true;
            });
            setSelectedImportIndices(initialSelection);
            setPasteError(null);
            return true;
        } catch (e: any) {
            setPasteError(e.message || "Invalid JSON format. Please ensure the AI output is copied correctly.");
            setParsedCompetencies(null);
            return false;
        }
    };

    useEffect(() => {
        const handleGlobalPaste = (e: ClipboardEvent) => {
            if (!copiedNeedId) return;
            
            // Get paste data
            const pasted = e.clipboardData?.getData('text');
            if (!pasted) return;
            
            // Try to parse and load it
            const success = parseAndLoadJSON(pasted);
            if (success) {
                // Open the competencies selection modal for active need!
                setImportModalOpenNeedId(copiedNeedId);
            } else {
                console.warn("Global paste parsing failed", pasted);
            }
        };
        
        window.addEventListener('paste', handleGlobalPaste);
        return () => {
            window.removeEventListener('paste', handleGlobalPaste);
        };
    }, [copiedNeedId]);

    const handleAddImportedCompetencies = () => {
        if (!importModalOpenNeedId || !parsedCompetencies) return;
        
        const selectedNames = parsedCompetencies.filter((_, idx) => selectedImportIndices[idx]);
        if (selectedNames.length > 0) {
            handleAddMultipleSkillsToNeed(importModalOpenNeedId, selectedNames);
        }

        setImportModalOpenNeedId(null);
        setPastedText('');
        setParsedCompetencies(null);
        setSelectedImportIndices({});
        setPasteError(null);
    };

    const [formData, setFormData] = useState<Partial<Learner>>(() => {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
            try {
                const parsed = JSON.parse(savedDraft);
                if (parsed && typeof parsed === 'object' && parsed.name !== undefined) {
                    return { ...initialFormData, ...parsed };
                }
            } catch (e) {
                console.error("Failed to parse onboarding draft", e);
                localStorage.removeItem(DRAFT_KEY);
            }
        }
        return initialFormData;
    });

    const [countryQuery, setCountryQuery] = useState(formData.country || '');
    const [countrySuggestions, setCountrySuggestions] = useState<string[]>([]);
    const [isCountryLoading, setIsCountryLoading] = useState(false);
    const [showCountryDropdown, setShowCountryDropdown] = useState(false);

    const [cityQuery, setCityQuery] = useState(formData.city || '');
    const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
    const [isCityLoading, setIsCityLoading] = useState(false);
    const [showCityDropdown, setShowCityDropdown] = useState(false);

    useEffect(() => {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    }, [formData]);

    // Populate queries if country/city exists (e.g. from draft)
    useEffect(() => {
        if (formData.country) {
            setCountryQuery(formData.country);
        }
    }, [formData.country]);

    useEffect(() => {
        if (formData.city) {
            setCityQuery(formData.city);
        }
    }, [formData.city]);

    // Handle clicks outside of dropdowns to close them
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const countryGroup = document.getElementById('country-autocomplete-group');
            const cityGroup = document.getElementById('city-autocomplete-group');
            if (countryGroup && !countryGroup.contains(e.target as Node)) {
                setShowCountryDropdown(false);
            }
            if (cityGroup && !cityGroup.contains(e.target as Node)) {
                setShowCityDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced Country Fetching from local fuzzy country list
    useEffect(() => {
        if (!countryQuery || countryQuery.trim() === formData.country) {
            setCountrySuggestions([]);
            return;
        }

        const handler = setTimeout(() => {
            setIsCountryLoading(true);
            const query = countryQuery.trim().toLowerCase();

            // Check manual corrections first
            let exactCorrection: string | null = null;
            if (commonCorrections[query]) {
                exactCorrection = commonCorrections[query];
            } else {
                const matchingKey = Object.keys(commonCorrections).find(k => k.startsWith(query) || k.includes(query));
                if (matchingKey) {
                    exactCorrection = commonCorrections[matchingKey];
                }
            }

            // Find matches in countries list
            const startsWithMatches = countriesList.filter(c => c.toLowerCase().startsWith(query));
            const includesMatches = countriesList.filter(c => c.toLowerCase().includes(query) && !startsWithMatches.includes(c));

            let suggestions = [...startsWithMatches, ...includesMatches];

            if (exactCorrection && !suggestions.includes(exactCorrection)) {
                suggestions.unshift(exactCorrection);
            }

            // Fuzzy matching if suggestions are sparse
            if (suggestions.length < 5) {
                const scoredList = countriesList
                    .map(c => {
                        const lev = getLevenshteinDistance(query, c.toLowerCase());
                        const bigram = getBigramSimilarity(query, c.toLowerCase());
                        const score = bigram * 10 - lev * 0.5;
                        return { country: c, score };
                    })
                    .filter(item => !suggestions.includes(item.country))
                    .sort((a, b) => b.score - a.score);

                const needed = 8 - suggestions.length;
                const topScored = scoredList.slice(0, needed).map(item => item.country);
                suggestions = [...suggestions, ...topScored];
            }

            setCountrySuggestions(suggestions.slice(0, 8));
            setIsCountryLoading(false);
        }, 300);

        return () => clearTimeout(handler);
    }, [countryQuery, formData.country]);

    // Debounced City & Address Fetching in Selected Country from Free Geocoding API
    useEffect(() => {
        if (!cityQuery || cityQuery.trim() === formData.city) {
            setCitySuggestions([]);
            return;
        }

        const handler = setTimeout(async () => {
            setIsCityLoading(true);
            try {
                // Focus search inside the selected Country if available for better filtering
                const fullQuery = formData.country ? `${cityQuery}, ${formData.country}` : cityQuery;
                const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullQuery)}&format=json&accept-language=en&limit=10`);
                if (!res.ok) throw new Error('Network error');
                const data = await res.json();
                const results: string[] = [];

                data.forEach((item: any) => {
                    let displayName = item.display_name;
                    // Format output beautifully by stripping duplicate country name
                    if (formData.country) {
                        const countryLower = formData.country.toLowerCase();
                        const parts = displayName.split(',').map((p: string) => p.trim());
                        const filteredParts = parts.filter((p: string) => p.toLowerCase() !== countryLower);
                        displayName = filteredParts.join(', ');
                    }
                    if (displayName && !results.includes(displayName)) {
                        results.push(displayName);
                    }
                });
                setCitySuggestions(results);
            } catch (error) {
                console.error("City autocomplete error", error);
            } finally {
                setIsCityLoading(false);
            }
        }, 400);

        return () => clearTimeout(handler);
    }, [cityQuery, formData.city, formData.country]);

    const handleCountrySelect = (selectedCountry: string) => {
        setCountryQuery(selectedCountry);
        setFormData(prev => ({ ...prev, country: selectedCountry }));
        setCountrySuggestions([]);
        setShowCountryDropdown(false);
    };

    const handleCitySelect = (selectedCity: string) => {
        setCityQuery(selectedCity);
        setFormData(prev => ({ ...prev, city: selectedCity }));
        setCitySuggestions([]);
        setShowCityDropdown(false);
    };

    const handleNext = () => setStep(s => s + 1);
    const handlePrev = () => setStep(s => s - 1);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleTagChange = (name: keyof Learner, value: string) => {
        setFormData(prev => ({...prev, [name]: value}));
    }

    const handleLearningFactorChange = (label: string, state: 'strength' | 'challenge' | 'neutral') => {
        setFormData(prev => {
            const newFactors = { ...(prev.learningFactors || {}) };
            if (state === 'neutral') {
                delete newFactors[label];
            } else {
                newFactors[label] = state;
            }
            return { ...prev, learningFactors: newFactors };
        });
    };
    
    const handleLanguageChange = (value: string) => {
        setFormData(prev => ({ ...prev, languages: value.split(',').map(s => s.trim()).filter(Boolean) }));
    };

    const handleCoursePlanChange = (updatedPlan: CoursePlan) => {
        setFormData(prev => ({ ...prev, coursePlan: updatedPlan }));
    };
    
    const handleNeedChange = (index: number, name: string) => {
        const newNeeds = [...formData.needs!];
        newNeeds[index].name = name;
        setFormData(prev => ({ ...prev, needs: newNeeds }));
    };
    const handleNeedRatingChange = (index: number, rating: number) => {
        const newNeeds = [...formData.needs!];
        newNeeds[index].rating = rating;
        setFormData(prev => ({ ...prev, needs: newNeeds }));
    };
    const addNeed = () => {
        const newNeeds = [...formData.needs!, { id: `n${Date.now()}`, name: '', rating: 3, learningPath: [] }];
        setFormData(prev => ({ ...prev, needs: newNeeds }));
    };
    const removeNeed = (index: number) => {
        const newNeeds = formData.needs!.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, needs: newNeeds }));
    };
    
    const handleAddSkillToNeed = (needId: string, skillName: string, skillProgress: number) => {
        setFormData(prev => {
            const trimmedSkillName = skillName.trim();
            if (!trimmedSkillName) return prev;

            const updatedNeeds = prev.needs!.map(n => {
                if (n.id === needId) {
                    if (n.learningPath.some(s => s.name.toLowerCase() === trimmedSkillName.toLowerCase())) return n; // No duplicates
                    const newSkill: Skill = { id: `s${Date.now()}`, name: trimmedSkillName, progress: skillProgress };
                    return { ...n, learningPath: [...n.learningPath, newSkill] };
                }
                return n;
            });

            const existingCompetencies = prev.competencies || [];
            let updatedCompetencies = [...existingCompetencies];
            if (!existingCompetencies.some(c => c.name.toLowerCase() === trimmedSkillName.toLowerCase())) {
                const newCompetency: Competency = {
                    id: `c${Date.now()}`, name: trimmedSkillName, icon: 'target', rating: 3,
                    initialProgress: skillProgress, progress: skillProgress, status: CompetencyStatus.OnTrack
                };
                updatedCompetencies.push(newCompetency);
            }

            return { ...prev, needs: updatedNeeds, competencies: updatedCompetencies };
        });
    };

    const handleRemoveSkillFromNeed = (needId: string, skillId: string, skillName: string) => {
        setFormData(prev => {
            const updatedNeeds = prev.needs!.map(n => {
                if (n.id === needId) {
                    return { ...n, learningPath: n.learningPath.filter(skill => skill.id !== skillId) };
                }
                return n;
            });

            const isSkillUsedElsewhere = updatedNeeds.some(n => n.learningPath.some(s => s.name.toLowerCase() === skillName.toLowerCase()));
            let updatedCompetencies = prev.competencies || [];
            if (!isSkillUsedElsewhere) {
                updatedCompetencies = updatedCompetencies.filter(c => c.name.toLowerCase() !== skillName.toLowerCase());
            }

            return { ...prev, needs: updatedNeeds, competencies: updatedCompetencies };
        });
    };
    
    const handleNewCompetencyInputChange = (needId: string, field: 'name' | 'progress', value: string | number) => {
        setNewCompetencyInputs(prev => ({
            ...prev,
            [needId]: {
                ...(prev[needId] || { name: '', progress: 0 }),
                [field]: value
            }
        }));
    };
    
    const handleTriggerAddCompetency = (needId: string) => {
        const inputState = newCompetencyInputs[needId];
        if (!inputState || !inputState.name.trim()) return;
        handleAddSkillToNeed(needId, inputState.name, inputState.progress);
        setNewCompetencyInputs(prev => ({
            ...prev,
            [needId]: { name: '', progress: 0 }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const learnersCount = useLearnerStore.getState().learners.length;
        const currentTier = useAuthStore.getState().tier;
        if (!canAddLearner(learnersCount, currentTier)) {
            useAuthStore.getState().openUpgradeModal(`You have reached the Free Tier limit of ${FREE_LEARNER_LIMIT} learner profiles. Upgrade to PRO or VIP to add new learners.`);
            return;
        }

        setIsSubmitting(true);
        let learnerDataWithTimezone = { ...formData };
        // Keep the learner's CEFR code in sync with the Course Planner selection so
        // Lesson Creation > Lesson Customization reads exactly the level chosen here.
        const manualCefrLevel = normalizeCefrLevel(formData.coursePlan?.level, 'B1');
        learnerDataWithTimezone.cefrLevel = manualCefrLevel;
        learnerDataWithTimezone.level = toCourseLevelEnum(manualCefrLevel);
        if (formData.country) {
            try {
                const timezone = await getTimezoneForLocation(formData.country, formData.city);
                if (timezone) {
                    learnerDataWithTimezone.timezone = timezone;
                }
            } catch (error) {
                console.error("Failed to fetch timezone during onboarding", error);
            }
        }

        // Make sure competencies map all skills in needs before save
        const competenciesMap = new Map<string, Competency>();
        (learnerDataWithTimezone.competencies || []).forEach((c, idx) => {
            if (c?.name) competenciesMap.set(c.name.trim().toLowerCase(), c);
        });
        (learnerDataWithTimezone.needs || []).forEach((n, nIdx) => {
            (n.learningPath || []).forEach((s, sIdx) => {
                if (s?.name && !competenciesMap.has(s.name.trim().toLowerCase())) {
                    competenciesMap.set(s.name.trim().toLowerCase(), {
                        id: s.id || `c_${nIdx}_${sIdx}_${Date.now()}`,
                        name: s.name.trim(),
                        icon: 'target',
                        rating: n.rating || 3,
                        initialProgress: s.progress || 0,
                        progress: s.progress || 0,
                        status: (s.progress || 0) >= 40 ? CompetencyStatus.OnTrack : CompetencyStatus.NeedsWork
                    });
                }
            });
        });
        learnerDataWithTimezone.competencies = Array.from(competenciesMap.values());

        const newLearner: Learner = {
            id: Date.now().toString(),
            dateCreated: new Date().toISOString().split('T')[0],
            xp: 0,
            streak: 0,
            sessions: [],
            status: 'active',
            joinedAt: new Date().toISOString(),
            avatarId: 'default',
            ...learnerDataWithTimezone,
        } as Learner;

        addLearner(newLearner);
        localStorage.removeItem(DRAFT_KEY);

        // Immediate hard disk persistence before navigation
        if (isDiskModeEnabled()) {
            try {
                await syncLearnerToDisk(newLearner);
                await triggerAutoSyncImmediate();
            } catch (diskErr) {
                console.warn("Failed immediate disk sync during onboarding:", diskErr);
            }
        }

        setIsSubmitting(false);
        alert(`Learner ${newLearner.name} created successfully!`);
        navigate(`/learner/${newLearner.id}`);
    };
    
    // Helper functions for updating parsed learner data in the Review Board
    const handleParsedFieldChange = (name: keyof Learner, value: any) => {
        setParsedLearnerData(prev => {
            if (!prev) return null;
            return { ...prev, [name]: value };
        });
    };

    const handleParsedCoursePlanFieldChange = (name: keyof CoursePlan, value: any) => {
        setParsedLearnerData(prev => {
            if (!prev) return null;
            const currentCoursePlan = prev.coursePlan || {};
            return {
                ...prev,
                coursePlan: {
                    ...currentCoursePlan,
                    [name]: value
                }
            };
        });
    };

    const handleParsedNeedNameChange = (needIdx: number, value: string) => {
        setParsedLearnerData(prev => {
            if (!prev || !prev.needs) return prev;
            const updatedNeeds = [...prev.needs];
            updatedNeeds[needIdx] = { ...updatedNeeds[needIdx], name: value };
            return { ...prev, needs: updatedNeeds };
        });
    };

    const handleParsedNeedRatingChange = (needIdx: number, value: number) => {
        setParsedLearnerData(prev => {
            if (!prev || !prev.needs) return prev;
            const updatedNeeds = [...prev.needs];
            updatedNeeds[needIdx] = { ...updatedNeeds[needIdx], rating: value };
            return { ...prev, needs: updatedNeeds };
        });
    };

    const handleParsedSkillNameChange = (needIdx: number, skillIdx: number, value: string) => {
        setParsedLearnerData(prev => {
            if (!prev || !prev.needs) return prev;
            const updatedNeeds = [...prev.needs];
            const path = [...(updatedNeeds[needIdx].learningPath || [])];
            path[skillIdx] = { ...path[skillIdx], name: value };
            updatedNeeds[needIdx] = { ...updatedNeeds[needIdx], learningPath: path };
            return { ...prev, needs: updatedNeeds };
        });
    };

    const handleParsedSkillProgressChange = (needIdx: number, skillIdx: number, value: number) => {
        setParsedLearnerData(prev => {
            if (!prev || !prev.needs) return prev;
            const updatedNeeds = [...prev.needs];
            const path = [...(updatedNeeds[needIdx].learningPath || [])];
            path[skillIdx] = { ...path[skillIdx], progress: value };
            updatedNeeds[needIdx] = { ...updatedNeeds[needIdx], learningPath: path };
            return { ...prev, needs: updatedNeeds };
        });
    };

    const removeParsedSkill = (needIdx: number, skillIdx: number) => {
        setParsedLearnerData(prev => {
            if (!prev || !prev.needs) return prev;
            const updatedNeeds = [...prev.needs];
            const path = (updatedNeeds[needIdx].learningPath || []).filter((_, idx) => idx !== skillIdx);
            updatedNeeds[needIdx] = { ...updatedNeeds[needIdx], learningPath: path };
            return { ...prev, needs: updatedNeeds };
        });
    };

    const addParsedSkill = (needIdx: number) => {
        setParsedLearnerData(prev => {
            if (!prev || !prev.needs) return prev;
            const updatedNeeds = [...prev.needs];
            const path = [...(updatedNeeds[needIdx].learningPath || [])];
            path.push({ id: `s_parsed_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, name: 'New Competency', progress: 0 });
            updatedNeeds[needIdx] = { ...updatedNeeds[needIdx], learningPath: path };
            return { ...prev, needs: updatedNeeds };
        });
    };

    const removeParsedNeed = (needIdx: number) => {
        setParsedLearnerData(prev => {
            if (!prev || !prev.needs) return prev;
            const updatedNeeds = prev.needs.filter((_, idx) => idx !== needIdx);
            return { ...prev, needs: updatedNeeds };
        });
    };

    const addParsedNeed = () => {
        setParsedLearnerData(prev => {
            if (!prev) return prev;
            const updatedNeeds = [...(prev.needs || [])];
            updatedNeeds.push({ id: `n_parsed_${Date.now()}`, name: 'New Goal / Need', rating: 3, learningPath: [] });
            return { ...prev, needs: updatedNeeds };
        });
    };

    // Keyboard navigation listener for slide presentation deck
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (onboardingMode !== 'automatic' || parsedLearnerData !== null) return;
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            const maxSlide = slides.length + 1;
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                setSlideIndex(prev => Math.min(prev + 1, maxSlide));
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setSlideIndex(prev => Math.max(prev - 1, 0));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onboardingMode, parsedLearnerData, slides]);

    const [tourStep, setTourStep] = useState<number | null>(null);
    const [isUnmuted, setIsUnmuted] = useState<boolean>(() => {
        return localStorage.getItem("onboarding_speech_unmuted") === "true";
    });

    // Auto-resume Onboarding tour when routed from Dashboard's companion guide
    useEffect(() => {
        const startMode = localStorage.getItem("onboarding_tour_start_mode");
        if (startMode === "oral") {
            setTourStep(2); // Slide 1 of Oral
            setOnboardingMode('automatic');
            setSlideIndex(0);
            localStorage.removeItem("onboarding_tour_start_mode");
        } else if (startMode === "manual") {
            setTourStep(10); // Manual step 1
            setOnboardingMode('manual');
            setStep(1);
            localStorage.removeItem("onboarding_tour_start_mode");
        }
    }, []);

    const ONBOARDING_TOUR_STEPS = [
        {
            title: "Onboarding Companion Guide",
            text: "This guide will walk you through registering a new student using both the conversational Oral Interview presentation deck and the structured 6-step Manual Wizard. Click 'Next Tip' to explore both flows!",
            mode: "selection"
        },
        {
            title: "Onboarding Mode Choice",
            text: "Choose 'Interactive Oral Interview' for a screen-shared conversation with custom slides, or select 'Classic Manual Wizard' for a standard admin form to create student profiles.",
            mode: "selection"
        },
        {
            title: "Oral Interview: Name Entry Screen",
            text: "Before the deck starts, the tutor types the learner's name. It is injected into every slide that uses the {name} placeholder, so the presentation feels personal from the first screen.",
            mode: "automatic",
            slideIndex: 0
        },
        {
            title: "About You — Name & Basics",
            text: "This one asks for the name, age, birthday, and gender. Three sample answers show the length and shape of a good reply.",
            mode: "automatic",
            slideIndex: 1
        },
        {
            title: "About You — Where You Live",
            text: "This one collects the city, country, and address, with Milan, Tokyo, and Sao Paulo examples to model.",
            mode: "automatic",
            slideIndex: 2
        },
        {
            title: "About You — Work & Study",
            text: "Here the tutor asks for the job and the major or field of study, using a design manager, a software engineer, a nurse, and a student as models.",
            mode: "automatic",
            slideIndex: 3
        },
        {
            title: "About You — Language & Contact",
            text: "This slide captures the native language and the email address for homework and feedback.",
            mode: "automatic",
            slideIndex: 4
        },
        {
            title: "Your Goals: Where You Need English",
            text: "This slide explores why the learner needs the language — work, exams, travel, study, moving abroad, daily life. The checklist carries the options; two short answers show the shape of a reply.",
            mode: "automatic",
            slideIndex: 5
        },
        {
            title: "Your Goals: What to Improve",
            text: "This slide narrows the focus: speaking, listening, vocabulary, grammar, pronunciation, writing, fluency.",
            mode: "automatic",
            slideIndex: 6
        },
        {
            title: "How You Learn Best",
            text: "This slide covers the four learning styles — visual, auditory, kinesthetic, reading and writing — as a checklist.",
            mode: "automatic",
            slideIndex: 7
        },
        {
            title: "Your Strengths",
            text: "This slide digs into memory, logic, creativity, and focus, so lessons can be built around the learner's real strengths.",
            mode: "automatic",
            slideIndex: 8
        },
        {
            title: "How You Feel in Class",
            text: "This slide uncovers motivation, confidence, anxiety, fear of mistakes, and risk-taking. It tells the tutor how gentle or how challenging to be.",
            mode: "automatic",
            slideIndex: 9
        },
        {
            title: "What Do You Like?",
            text: "This is the topic menu: all 26 interests the Classic Manual Wizard offers, as keyword chips, plus two short sample answers.",
            mode: "automatic",
            slideIndex: 10
        },
        {
            title: "Your Ideal Teacher",
            text: "This slide covers the human side of the teacher: approachable, patient, supportive, respectful, energetic, fun, serious, knowledgeable, enthusiastic.",
            mode: "automatic",
            slideIndex: 11
        },
        {
            title: "Lessons, Homework & Feedback",
            text: "This slide handles curriculum expectations: punctuality, organisation, clear feedback, whether homework is wanted, and how corrections should be delivered.",
            mode: "automatic",
            slideIndex: 12
        },
        {
            title: "Your Level",
            text: "This slide records the current CEFR level and the target level, from complete beginner (A1) up to expert (C2).",
            mode: "automatic",
            slideIndex: 13
        },
        {
            title: "Lesson Time & Coursebook",
            text: "This slide configures lesson length (30 to 90 minutes), weekly frequency, total sessions, and whether a coursebook is wanted.",
            mode: "automatic",
            slideIndex: 14
        },
        {
            title: "Placement Test A: Daily Life",
            text: "The placement test opens here with an A1-A2 question about yesterday evening, with sample answers labelled by level.",
            mode: "automatic",
            slideIndex: 15
        },
        {
            title: "Placement Test B: City or Village",
            text: "This one asks the learner to choose between a big city and a small village, showing how well they give opinions and structure an argument.",
            mode: "automatic",
            slideIndex: 16
        },
        {
            title: "Placement Test C: Technology & Education",
            text: "The test closes here with an abstract, hypothetical question about technology and education, the marker of a B2-C2 speaker.",
            mode: "automatic",
            slideIndex: 17
        },
        {
            title: "Transcribing and Extracting Oral Profiles",
            text: "The final screen is the analysis board: write custom assessment notes, or transcribe student speech live with the Microphone tool. Click 'Save and Parse' to let the AI auto-extract all metadata!",
            mode: "automatic",
            slideIndex: 18
        },
        {
            title: "Manual Form Step 1: Personal Details",
            text: "Switching to Manual Mode! Step 1 collects essential contact details: Full Name, Registered system names, Email, Phone, Country, Address, and Occupation.",
            mode: "manual",
            step: 1
        },
        {
            title: "Manual Form Step 2: Interests & Expectations",
            text: "In Step 2, tag student interests (e.g., Finance, Tech), specify target goals, native/target languages, and define cognitive factors like memory confidence.",
            mode: "manual",
            step: 2
        },
        {
            title: "Manual Form Step 3: Grade Starting Competencies",
            text: "Step 3 grades 5 baseline competencies out of 5 stars: Speaking, Grammar, Listening, Pronunciation, and Writing. The AI adapts lesson exercises to these ratings.",
            mode: "manual",
            step: 3
        },
        {
            title: "Manual Form Step 4: Map Needs & Learning Path",
            text: "Step 4 establishes core Needs (e.g., 'Master negotiation idioms'). For each need card, you can associate custom lessons, chapters, and milestones.",
            mode: "manual",
            step: 4
        },
        {
            title: "Manual Form Step 5: Scheduling & Lesson Durations",
            text: "Step 5 configures curriculum density. Set CEFR levels (e.g., B2), lesson duration (e.g., 60 minutes), frequency (e.g., twice weekly), and course names.",
            mode: "manual",
            step: 5
        },
        {
            title: "Manual Form Step 6: Review & Finalize Profile",
            text: "Step 6 is the final validation! Verify timezone alignment and click 'Save & Launch' to instantly create the student's active card, skill tree, and coursebooks!",
            mode: "manual",
            step: 6
        }
    ];

    // Sync state and slide indices according to current onboarding tour step
    useEffect(() => {
        if (tourStep === null) {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            return;
        }
        const stepObj = ONBOARDING_TOUR_STEPS[tourStep];
        if (!stepObj) return;

        // Sync mode
        if (stepObj.mode) {
            setOnboardingMode(stepObj.mode as any);
        }
        // Sync slide index (Oral Interview)
        if (stepObj.slideIndex !== undefined) {
            setSlideIndex(stepObj.slideIndex);
        }
        // Sync manual step
        if (stepObj.step !== undefined) {
            setStep(stepObj.step);
        }

        // Web Speech synthesis
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            if (isUnmuted) {
                const textToSpeak = `${stepObj.title}. ${stepObj.text}`;
                const utterance = new SpeechSynthesisUtterance(textToSpeak);
                utterance.rate = 1.0;
                window.speechSynthesis.speak(utterance);
            }
        }
    }, [tourStep, isUnmuted]);

    // Highlight elements dynamically based on onboarding tour step
    useEffect(() => {
        if (tourStep !== null) {
            let selector = "";
            if (tourStep === 1) {
                selector = "onboarding-oral-btn";
            } else if (tourStep >= 2 && tourStep <= 8) {
                selector = "onboarding-slide-card";
            } else if (tourStep === 9) {
                selector = "onboarding-save-parse-card";
            } else if (tourStep >= 10 && tourStep <= 15) {
                selector = "onboarding-manual-form-step";
            }

            if (selector) {
                const timer = setTimeout(() => {
                    const el = document.getElementById(selector);
                    if (el) {
                        el.scrollIntoView({ behavior: "smooth", block: "center" });
                        const highlightClasses = ["ring-4", "ring-offset-2", "ring-indigo-600", "animate-pulse", "scale-[1.01]", "transition-all", "duration-500"];
                        el.classList.add(...highlightClasses);
                        (el as any)._cleanupHighlight = () => {
                            el.classList.remove(...highlightClasses);
                        };
                    }
                }, 100);

                return () => {
                    clearTimeout(timer);
                    const el = document.getElementById(selector);
                    if (el && (el as any)._cleanupHighlight) {
                        (el as any)._cleanupHighlight();
                    }
                };
            }
        }
    }, [tourStep, onboardingMode, slideIndex, step]);

    const renderTourOverlay = () => {
        if (tourStep === null) return null;
        const stepObj = ONBOARDING_TOUR_STEPS[tourStep];
        if (!stepObj) return null;

        const isFromDashboardTour = localStorage.getItem("dashboard_tour_step_resume") !== null;

        return (
            <div className="fixed bottom-6 right-6 z-50 max-w-md w-full bg-white text-gray-800 border-2 border-indigo-200 rounded-3xl shadow-2xl p-6 font-sans text-left animate-slide-up flex flex-col gap-4">
                <div className="flex justify-between items-start gap-4 border-b border-indigo-100 pb-3">
                    <div className="flex items-center gap-2">
                        <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <span className="text-xs font-black tracking-widest text-indigo-600 uppercase">
                            {isFromDashboardTour ? "Add New Learner Tour" : "ONBOARDING COMPANION"}
                        </span>
                    </div>
                    <span className="text-xs font-bold font-mono text-gray-400">Step {tourStep + 1} of {ONBOARDING_TOUR_STEPS.length}</span>
                </div>

                <div className="space-y-1.5">
                    <h3 className="text-xl font-extrabold text-slate-800 leading-tight">
                        {stepObj.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        {stepObj.text}
                    </p>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-indigo-100">
                    <button
                        type="button"
                        onClick={() => {
                            const newMute = !isUnmuted;
                            setIsUnmuted(newMute);
                            localStorage.setItem("onboarding_speech_unmuted", String(newMute));
                        }}
                        className={`p-2.5 rounded-xl border transition duration-200 cursor-pointer ${isUnmuted ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-gray-50 border-gray-200 text-gray-400'}`}
                        title={isUnmuted ? "Mute Voice" : "Unmute Voice"}
                    >
                        <i className={`fas ${isUnmuted ? 'fa-volume-up' : 'fa-volume-mute'}`}></i>
                    </button>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                if (isFromDashboardTour) {
                                    if (tourStep === 2) {
                                        localStorage.setItem("dashboard_tour_step_resume", "14");
                                        if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
                                        navigate('/dashboard');
                                        return;
                                    }
                                    if (tourStep === 10) {
                                        localStorage.setItem("dashboard_tour_step_resume", "15");
                                        if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
                                        navigate('/dashboard');
                                        return;
                                    }
                                }
                                if (tourStep === 0) {
                                    setTourStep(null);
                                    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
                                } else {
                                    setTourStep(prev => prev !== null ? prev - 1 : null);
                                }
                            }}
                            className="px-4 py-2 border border-gray-200 text-slate-600 hover:bg-slate-50 font-extrabold text-xs rounded-xl transition cursor-pointer"
                        >
                            {tourStep === 0 || (isFromDashboardTour && (tourStep === 2 || tourStep === 10)) ? "Exit to Dashboard" : "Back"}
                        </button>
                        {tourStep < ONBOARDING_TOUR_STEPS.length - 1 ? (
                            <button
                                type="button"
                                onClick={() => {
                                    if (isFromDashboardTour) {
                                        if (tourStep === 9) {
                                            localStorage.setItem("dashboard_tour_step_resume", "16");
                                            if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
                                            navigate('/dashboard');
                                            return;
                                        }
                                    }
                                    setTourStep(prev => prev !== null ? prev + 1 : null);
                                }}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-indigo-600/10 cursor-pointer"
                            >
                                {isFromDashboardTour && tourStep === 9 ? "Manual Onboarding ➡️" : "Next Tip"} <i className="fas fa-arrow-right ml-1"></i>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    if (isFromDashboardTour && tourStep === 15) {
                                        localStorage.setItem("dashboard_tour_step_resume", "17");
                                        if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
                                        navigate('/dashboard');
                                        return;
                                    }
                                    setTourStep(null);
                                    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
                                    alert("Congratulations! You completed the Add Learner Onboarding Companion Tour!");
                                }}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-emerald-600/10 cursor-pointer"
                            >
                                {isFromDashboardTour ? "Finish & Go Back" : "Finish Tour"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const totalSteps = 6;

    // 1. SELECTION MODE RENDER
    if (onboardingMode === 'selection') {
        return (
            <div className="bg-slate-50 min-h-[80vh] flex items-center justify-center p-4 sm:p-8 font-sans">
                <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-xl max-w-4xl w-full text-center space-y-8 border border-gray-100 animate-fade-in">
                    <div className="space-y-3">
                        <span className="text-sm tracking-widest text-brand-blue font-bold uppercase">Onboarding Setup</span>
                        <h2 className="text-4xl sm:text-5xl font-black text-gray-900 leading-none">Add a New Learner Profile</h2>
                        <p className="text-xl text-gray-500 max-w-2xl mx-auto">Choose your preferred setup method to construct a comprehensive curriculum and profile.</p>
                        <div className="flex justify-center pt-2">
                            <button
                                type="button"
                                onClick={() => setTourStep(0)}
                                className="px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-sm rounded-2xl border border-indigo-200 transition flex items-center gap-2 shadow-sm cursor-pointer animate-bounce"
                            >
                                <i className="fas fa-question-circle text-lg animate-pulse"></i> Start Onboarding Companion Tour
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        {/* Interactive Oral Interview */}
                        <div 
                            id="onboarding-oral-btn"
                            onClick={() => {
                                setOnboardingMode('automatic');
                                setSlideIndex(0);
                            }}
                            className="group relative bg-gradient-to-b from-indigo-50/50 to-white hover:from-indigo-50 hover:to-indigo-50/30 border-2 border-indigo-100 hover:border-indigo-400 p-8 rounded-3xl text-left cursor-pointer transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col justify-between space-y-6"
                        >
                            <div className="space-y-4">
                                <div className="h-14 w-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300 shadow-md shadow-indigo-100">
                                    <i className="fas fa-comments"></i>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800">Interactive Oral Interview</h3>
                                <p className="text-gray-500 text-base leading-relaxed">
                                    Share your screen with the learner. Walk through minimalist, highly readable, 3D-emoji slides. Transcribe responses orally. External AI auto-generates structured profiles and dynamic competencies.
                                </p>
                            </div>
                            <div className="flex items-center text-indigo-600 font-bold text-base gap-2 group-hover:translate-x-1 transition-transform">
                                Launch Presentation Mode <i className="fas fa-arrow-right"></i>
                            </div>
                        </div>

                        {/* Classic Manual Setup */}
                        <div 
                            id="onboarding-manual-btn"
                            onClick={() => {
                                setOnboardingMode('manual');
                                setStep(1);
                            }}
                            className="group bg-gradient-to-b from-slate-50/50 to-white hover:from-slate-50 hover:to-slate-50/30 border-2 border-gray-100 hover:border-gray-400 p-8 rounded-3xl text-left cursor-pointer transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col justify-between space-y-6"
                        >
                            <div className="space-y-4">
                                <div className="h-14 w-14 bg-gray-100 text-gray-600 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300 shadow-md shadow-gray-100">
                                    <i className="fas fa-edit"></i>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800">Classic Manual Wizard</h3>
                                <p className="text-gray-500 text-base leading-relaxed">
                                    Manually enter all personal information, needs, scheduling, and custom interests step-by-step using a structured admin form.
                                </p>
                            </div>
                            <div className="flex items-center text-gray-600 font-bold text-base gap-2 group-hover:translate-x-1 transition-transform">
                                Open Form Wizard <i className="fas fa-arrow-right"></i>
                            </div>
                        </div>
                    </div>
                    {renderTourOverlay()}
                </div>
            </div>
        );
    }

    // 2. AUTOMATIC PRESENTATION / REVIEW MODE RENDER
    if (onboardingMode === 'automatic') {
        // Render Review Board if AI JSON has been parsed
        if (parsedLearnerData !== null) {
            return (
                <div className="bg-slate-50 min-h-screen p-4 sm:p-8 font-sans text-gray-800 animate-fade-in">
                    <div className="max-w-6xl mx-auto space-y-8 bg-white rounded-3xl p-6 sm:p-10 shadow-2xl border border-gray-100">
                        {/* Review Board Header */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6 border-gray-100">
                            <div>
                                <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm tracking-wider uppercase">
                                    <i className="fas fa-analytics animate-pulse"></i> Extraction Successful
                                </div>
                                <h2 className="text-3xl font-black text-gray-900 mt-1">Review & Calibrate Curriculum</h2>
                                <p className="text-gray-500 text-base">Tweak automatically generated profile metadata, needs, and target competency structures below.</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setParsedLearnerData(null);
                                        setPastedJsonText('');
                                        setSlideIndex(8);
                                    }}
                                    className="px-5 py-3 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    Back to Slides
                                </button>
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => handleSaveParsedLearner(parsedLearnerData)}
                                    className="px-6 py-3 bg-brand-green hover:bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-600/20 transition-all flex items-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            Save & Launch Profile <i className="fas fa-check-circle"></i>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Review Fields Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* General Profile Info Card */}
                            <div className="bg-slate-50/50 border border-gray-100 p-6 rounded-2xl space-y-4">
                                <h3 className="text-xl font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                                    <i className="fas fa-user-circle text-indigo-500"></i> Personal Information
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-500 mb-1">Full Name</label>
                                        <input 
                                            type="text" 
                                            value={parsedLearnerData.name || ''} 
                                            onChange={(e) => handleParsedFieldChange('name', e.target.value)}
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-base font-semibold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-500 mb-1">Registered Name</label>
                                        <input 
                                            type="text" 
                                            value={parsedLearnerData.registeredName || ''} 
                                            onChange={(e) => handleParsedFieldChange('registeredName', e.target.value)}
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-base"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-500 mb-1">Email Address</label>
                                        <input 
                                            type="email" 
                                            value={parsedLearnerData.email || ''} 
                                            onChange={(e) => handleParsedFieldChange('email', e.target.value)}
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-base"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-500 mb-1">Phone Number</label>
                                        <input 
                                            type="tel" 
                                            value={parsedLearnerData.phone || ''} 
                                            onChange={(e) => handleParsedFieldChange('phone', e.target.value)}
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-base"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-500 mb-1">Country</label>
                                        <input 
                                            type="text" 
                                            value={parsedLearnerData.country || ''} 
                                            onChange={(e) => handleParsedFieldChange('country', e.target.value)}
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-base font-semibold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-500 mb-1">City</label>
                                        <input 
                                            type="text" 
                                            value={parsedLearnerData.city || ''} 
                                            onChange={(e) => handleParsedFieldChange('city', e.target.value)}
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-base"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-500 mb-1">Job</label>
                                        <input 
                                            type="text" 
                                            value={parsedLearnerData.occupation || ''} 
                                            onChange={(e) => handleParsedFieldChange('occupation', e.target.value)}
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-base"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-500 mb-1">Field of Study / Major</label>
                                        <input 
                                            type="text" 
                                            value={parsedLearnerData.major || ''} 
                                            onChange={(e) => handleParsedFieldChange('major', e.target.value)}
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-base"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-500 mb-1">L1: Speaking Language</label>
                                        <input 
                                            type="text" 
                                            value={parsedLearnerData.l1Language || ''} 
                                            onChange={(e) => handleParsedFieldChange('l1Language', e.target.value)}
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-base"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-500 mb-1">L2: Learning Language</label>
                                        <input 
                                            type="text" 
                                            value={parsedLearnerData.targetLanguage || ''} 
                                            onChange={(e) => handleParsedFieldChange('targetLanguage', e.target.value)}
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-base"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-500 mb-1">Gender</label>
                                        <select 
                                            value={parsedLearnerData.gender || 'PreferNotToSay'} 
                                            onChange={(e) => handleParsedFieldChange('gender', e.target.value)}
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-base"
                                        >
                                            <option value="PreferNotToSay">Prefer not to say</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Course Setup Parameters */}
                            <div className="bg-slate-50/50 border border-gray-100 p-6 rounded-2xl space-y-4">
                                <div className="flex justify-between items-center border-b pb-2">
                                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <i className="fas fa-calendar-alt text-indigo-500"></i> Course Parameters
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedCoursebookIdForModal(undefined);
                                            setIsCoursebookModalOpen(true);
                                        }}
                                        className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                                    >
                                        <span>📚</span> Coursebook Manager
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-500 mb-1">Current CEFR Level</label>
                                        <select 
                                            value={normalizeReviewCefrLevel(parsedLearnerData.coursePlan?.level, 'B1')} 
                                            onChange={(e) => handleParsedCoursePlanFieldChange('level', e.target.value)}
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-base"
                                        >
                                            {CEFR_LEVEL_ORDER.map(lvl => (
                                                <option key={lvl} value={lvl}>{CEFR_LEVEL_LABELS[lvl]}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-500 mb-1">Target CEFR Level</label>
                                        <select 
                                            value={normalizeReviewCefrLevel(parsedLearnerData.coursePlan?.targetLevel, 'B2')} 
                                            onChange={(e) => handleParsedCoursePlanFieldChange('targetLevel', e.target.value)}
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-base"
                                        >
                                            {CEFR_LEVEL_ORDER.map(lvl => (
                                                <option key={lvl} value={lvl}>{CEFR_LEVEL_LABELS[lvl]}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-500 mb-1">Course Template Name</label>
                                        <input 
                                            type="text" 
                                            value={parsedLearnerData.coursePlan?.courseName || 'General English'} 
                                            onChange={(e) => handleParsedCoursePlanFieldChange('courseName', e.target.value)}
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-base"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-500 mb-1">Weekly Frequency</label>
                                        <input 
                                            type="text" 
                                            value={parsedLearnerData.coursePlan?.frequency || 'Balanced'} 
                                            onChange={(e) => handleParsedCoursePlanFieldChange('frequency', e.target.value)}
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-base"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-500 mb-1">Lesson Duration (mins)</label>
                                        <input 
                                            type="number" 
                                            value={parsedLearnerData.coursePlan?.duration || 60} 
                                            onChange={(e) => handleParsedCoursePlanFieldChange('duration', parseInt(e.target.value) || 60)}
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-base"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-500 mb-1">Total Course Sessions</label>
                                        <input 
                                            type="number" 
                                            value={parsedLearnerData.coursePlan?.totalSessions || 24} 
                                            onChange={(e) => handleParsedCoursePlanFieldChange('totalSessions', parseInt(e.target.value) || 24)}
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-base"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Pedagogical Alignment details */}
                        <div className="bg-slate-50/50 border border-gray-100 p-6 rounded-2xl space-y-6">
                            <h3 className="text-xl font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                                <i className="fas fa-magic text-indigo-500"></i> Pedagogical Context
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-500 mb-1">Target Situations (Where they will use language)</label>
                                    <textarea 
                                        value={parsedLearnerData.situations || ''} 
                                        onChange={(e) => handleParsedFieldChange('situations', e.target.value)}
                                        className="w-full h-24 p-3 bg-white border border-gray-200 rounded-xl text-base resize-none focus:outline-none"
                                        placeholder="e.g. sync meetings, customer support emails"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-500 mb-1">Instructional Focus (What lessons concentrate on)</label>
                                    <textarea 
                                        value={parsedLearnerData.focus || ''} 
                                        onChange={(e) => handleParsedFieldChange('focus', e.target.value)}
                                        className="w-full h-24 p-3 bg-white border border-gray-200 rounded-xl text-base resize-none focus:outline-none"
                                        placeholder="e.g. grammar patterns, vocabulary extensions"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-500 mb-1">Learning Style Preferences</label>
                                    <textarea 
                                        value={parsedLearnerData.learningStyle || ''} 
                                        onChange={(e) => handleParsedFieldChange('learningStyle', e.target.value)}
                                        className="w-full h-24 p-3 bg-white border border-gray-200 rounded-xl text-base resize-none focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-500 mb-1">Tutor Expectations</label>
                                    <textarea 
                                        value={parsedLearnerData.expectations || ''} 
                                        onChange={(e) => handleParsedFieldChange('expectations', e.target.value)}
                                        className="w-full h-24 p-3 bg-white border border-gray-200 rounded-xl text-base resize-none focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-500 mb-1">Interests & Hobbies (Comma separated)</label>
                                <input 
                                    type="text" 
                                    value={parsedLearnerData.interests || ''} 
                                    onChange={(e) => handleParsedFieldChange('interests', e.target.value)}
                                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-base"
                                    placeholder="e.g. Photography, Hiking, Cooking"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-500 mb-1">Extracted Personal Facts (One fact per line)</label>
                                <textarea 
                                    value={Array.isArray(parsedLearnerData.facts) ? parsedLearnerData.facts.join('\n') : (typeof parsedLearnerData.facts === 'string' ? parsedLearnerData.facts : '')} 
                                    onChange={(e) => {
                                        // Keep the raw lines EXACTLY as typed (whitespace + blank lines preserved)
                                        // so users can freely add/edit/delete lines while typing. Cleaning and
                                        // filtering happens later in normalizeLearnerProfileData on save.
                                        handleParsedFieldChange('facts', e.target.value.split('\n'));
                                    }}
                                    className="w-full h-32 p-3 bg-white border border-gray-200 rounded-xl text-base focus:outline-none"
                                    placeholder="e.g. Has a pet golden retriever named Max&#10;Loves Italian gourmet cooking&#10;Wants to travel to Japan next year"
                                />
                            </div>
                        </div>

                        {/* Needs & Competencies Folders (Extracted dynamically!) */}
                        <div className="bg-slate-50/50 border border-gray-100 p-6 rounded-2xl space-y-6">
                            <div className="flex justify-between items-center border-b pb-3">
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <i className="fas fa-bullseye text-brand-blue"></i> Needs & Competency Folders
                                </h3>
                                <button
                                    type="button"
                                    onClick={addParsedNeed}
                                    className="text-sm bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-100 flex items-center gap-1.5 transition-colors"
                                >
                                    <i className="fas fa-plus"></i> Add Goal Need
                                </button>
                            </div>

                            <div className="space-y-6">
                                {(parsedLearnerData.needs || []).map((need: any, needIdx: number) => (
                                    <div key={need.id || needIdx} className="bg-white border border-gray-200 p-5 rounded-2xl space-y-4 shadow-sm relative">
                                        <button
                                            type="button"
                                            onClick={() => removeParsedNeed(needIdx)}
                                            className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-lg transition-colors"
                                            title="Delete Need Folder"
                                        >
                                            <i className="fas fa-trash-alt"></i>
                                        </button>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pr-8">
                                            <div className="md:col-span-8">
                                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Goal Need Title</label>
                                                <input
                                                    type="text"
                                                    value={need.name || ''}
                                                    onChange={(e) => handleParsedNeedNameChange(needIdx, e.target.value)}
                                                    className="w-full p-2.5 bg-slate-50 border border-gray-200 rounded-lg text-base font-bold text-gray-800"
                                                    placeholder="e.g. Negotiating agreements"
                                                />
                                            </div>
                                            <div className="md:col-span-4">
                                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Importance</label>
                                                <div className="flex items-center gap-2 h-11">
                                                    <EditableStarRating 
                                                        rating={need.rating || 3} 
                                                        onRatingChange={(r) => handleParsedNeedRatingChange(needIdx, r)} 
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t pt-4 space-y-3">
                                            <div className="flex justify-between items-center mb-1">
                                                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Dynamic Competencies & Starting Mastery</h4>
                                                <button
                                                    type="button"
                                                    onClick={() => addParsedSkill(needIdx)}
                                                    className="text-xs text-indigo-600 font-bold hover:underline"
                                                >
                                                    + Add Competency
                                                </button>
                                            </div>

                                            <div className="divide-y divide-gray-100">
                                                {(need.learningPath || []).map((skill: any, skillIdx: number) => (
                                                    <div key={skill.id || skillIdx} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                        <div className="flex-1">
                                                            <input
                                                                type="text"
                                                                value={skill.name || ''}
                                                                onChange={(e) => handleParsedSkillNameChange(needIdx, skillIdx, e.target.value)}
                                                                className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none p-1 font-medium text-gray-800 text-base"
                                                                placeholder="Competency name"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-3 w-full md:w-64 justify-end">
                                                            <input
                                                                type="range"
                                                                min="0"
                                                                max="100"
                                                                value={skill.progress || 0}
                                                                onChange={(e) => handleParsedSkillProgressChange(needIdx, skillIdx, parseInt(e.target.value) || 0)}
                                                                className="w-full accent-indigo-600 h-1.5 bg-gray-100 rounded-lg cursor-pointer"
                                                            />
                                                            <span className="text-sm font-bold text-gray-500 w-10 text-right">{skill.progress || 0}%</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeParsedSkill(needIdx, skillIdx)}
                                                                className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                                            >
                                                                <i className="fas fa-times-circle"></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Review Board Footer */}
                        <div className="flex justify-end gap-3 pt-6 border-t">
                            <button
                                type="button"
                                onClick={() => {
                                    setParsedLearnerData(null);
                                    setPastedJsonText('');
                                    setSlideIndex(8);
                                }}
                                className="px-5 py-3 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                Back to Slides
                            </button>
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => handleSaveParsedLearner(parsedLearnerData)}
                                className="px-8 py-3 bg-brand-green hover:bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-600/20 transition-all flex items-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        Save & Launch Profile <i className="fas fa-check-circle"></i>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Coursebook Manager Modal for Review Board */}
                        <CoursebookManagerModal
                            isOpen={isCoursebookModalOpen}
                            onClose={() => setIsCoursebookModalOpen(false)}
                            onSelectCoursebook={(courseName) => {
                                handleParsedCoursePlanFieldChange('courseName', courseName);
                            }}
                            initialSelectedId={selectedCoursebookIdForModal}
                        />
                    </div>
                </div>
            );
        }

        // Otherwise render presentation slides deck

        return (
            /*
             * Full-bleed on purpose: this deck is presented on a projector, so it takes
             * the whole viewport (the route no longer sits in a `container` column — see
             * App.tsx) and the padding below is only breathing room *inside* the card.
             */
            <div className="bg-slate-900 text-white min-h-[90vh] flex flex-col justify-between p-4 sm:p-8 rounded-3xl shadow-2xl relative font-sans overflow-hidden">
                <style dangerouslySetInnerHTML={{ __html: `
                    @keyframes float-emoji {
                        0%, 100% { transform: translateY(0px) rotate(0deg); }
                        50% { transform: translateY(-15px) rotate(3deg); }
                    }
                    .animate-float-emoji {
                        animation: float-emoji 4.5s ease-in-out infinite;
                    }
                    @keyframes breathe-glow {
                        0%, 100% { transform: scale(0.96); opacity: 0.35; filter: blur(50px); }
                        50% { transform: scale(1.06); opacity: 0.65; filter: blur(65px); }
                    }
                    .animate-breathe-glow {
                        animation: breathe-glow 6s ease-in-out infinite;
                    }
                    /*
                     * The bolded keyword of an example answer, coloured by what kind of
                     * answer it is — see KEYWORD_RULES for the six kinds. Weights and
                     * spacing are set here as well, because these keywords live inside
                     * HTML written by hand in a slide and have to survive an editor that
                     * re-writes a deck without knowing about this file.
                     */
                    .slide-rich .kw { font-weight: 800; letter-spacing: 0.01em; }
                    .slide-rich .kw-identity { color: #7dd3fc; }
                    .slide-rich .kw-interest { color: #fcd34d; }
                    .slide-rich .kw-style { color: #c4b5fd; }
                    .slide-rich .kw-goal { color: #6ee7b7; }
                    .slide-rich .kw-tutor { color: #fda4af; }
                    .slide-rich .kw-plan { color: #67e8f9; }
                    .slide-rich .kw-default { color: #fdba74; }
                    /*
                     * Shared building blocks for a slide body, so the HTML written into a
                     * slide stays short enough to edit by hand. Every slide is the same
                     * shape: one short question, the checklist of keywords the tutor needs
                     * to hear, and two worked answers.
                     */
                    .slide-rich .ask { font-size: 2.7rem; font-weight: 900; color: #ffffff; line-height: 1.2; }
                    .slide-rich .chips { display: flex; flex-wrap: wrap; gap: 0.625rem; justify-content: center; max-width: 76rem; margin: 0 auto; padding-top: 1.1rem; }
                    .slide-rich .chip { display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(51, 65, 85, 0.5); border-radius: 9999px; padding: 0.5rem 1.15rem; font-size: 1.5rem; line-height: 1.4; font-weight: 600; color: #e2e8f0; }
                    .slide-rich .cards { display: grid; gap: 1.25rem; max-width: 80rem; margin: 1.75rem auto 0; text-align: left; }
                    @media (min-width: 768px) { .slide-rich .cards { grid-template-columns: 1fr 1fr; } }
                    .slide-rich .card { background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(51, 65, 85, 0.4); border-radius: 1rem; padding: 1.5rem; }
                    .slide-rich .card .label { font-size: 1rem; font-weight: 900; color: #818cf8; text-transform: uppercase; letter-spacing: 0.05em; }
                    .slide-rich .card .answer { margin-top: 0.5rem; font-size: 1.6rem; line-height: 1.6; color: #e2e8f0; }
                `}} />

                {/* Ambient glowing blobs */}
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-600/10 blur-[100px] pointer-events-none animate-pulse" style={{animationDelay: '2s'}} />

                {/* Header Row: Title and Edit Deck button */}
                <div className="flex justify-between items-center pb-4 border-b border-slate-800 z-10">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-400">Onboarding Interactive Slides</h1>
                        <p className="text-xs text-slate-500 font-mono">Present to {autoName || 'Learner'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setTourStep(2)}
                            className="text-xs bg-indigo-900/60 hover:bg-indigo-900/90 text-indigo-300 hover:text-white px-3 py-1.5 rounded-lg border border-indigo-700 font-extrabold transition-all cursor-pointer"
                        >
                            <i className="fas fa-question-circle mr-1"></i> Tour Guide
                        </button>
                        <button
                            type="button"
                            onClick={handleResetSlides}
                            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 px-3 py-1.5 rounded-lg border border-slate-700 hover:text-white transition-colors"
                            title="Reset deck to default"
                        >
                            <i className="fas fa-undo mr-1"></i> Reset
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsEditorOpen(true)}
                            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center w-10 h-10 border border-indigo-500"
                            title="Edit Slides"
                        >
                            <i className="fas fa-edit text-lg"></i>
                        </button>
                    </div>
                </div>

                {deckNotice && (
                    <div className="flex items-center justify-between gap-3 bg-indigo-600/10 border border-indigo-500/30 rounded-2xl px-4 py-2.5 z-10 text-left">
                        <p className="text-sm text-indigo-200">
                            <i className="fas fa-wand-magic-sparkles mr-2"></i>
                            Slide deck upgraded to the new {DEFAULT_SLIDES.length}-slide version. Slides you added yourself were kept.
                        </p>
                        <button
                            type="button"
                            onClick={() => setDeckNotice(false)}
                            className="text-sm font-bold text-indigo-300 hover:text-white shrink-0"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {slideIndex === 0 ? (
                    /* Slide Index 0: Name Entry Screen */
                    <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto space-y-8 py-10 text-center relative z-10 animate-fade-in">
                        <div className="space-y-4">
                            <span className="inline-block text-[110px] select-none hover:scale-110 transition-transform duration-300 cursor-pointer drop-shadow-[0_20px_25px_rgba(0,0,0,0.4)] animate-float-emoji">👋</span>
                            <h2 className="text-4xl sm:text-5xl font-black text-white leading-none mt-4">Let's build a customized learning journey!</h2>
                            <p className="text-xl text-slate-400">First, what is the learner's full name?</p>
                        </div>
                        
                        <div className="w-full space-y-4">
                            <input 
                                type="text" 
                                autoFocus
                                placeholder="e.g. Sofia" 
                                value={autoName} 
                                onChange={(e) => {
                                    setAutoName(e.target.value);
                                    setFormData(prev => ({ ...prev, name: e.target.value }));
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && autoName.trim()) {
                                        setSlideIndex(1);
                                    }
                                }}
                                className="w-full text-center p-5 bg-slate-800/80 border-2 border-indigo-500/30 rounded-2xl focus:border-indigo-400 outline-none text-3xl font-bold transition-all placeholder:text-slate-600 text-white shadow-xl"
                            />
                            <div className="flex gap-3 justify-center">
                                <button 
                                    type="button"
                                    onClick={() => setOnboardingMode('selection')}
                                    className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-lg rounded-2xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    id="onboarding-launch-deck-btn"
                                    type="button"
                                    onClick={() => {
                                        if (autoName.trim()) {
                                            setSlideIndex(1);
                                        }
                                    }}
                                    disabled={!autoName.trim()}
                                    className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-lg rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
                                >
                                    Launch Presentation Deck <i className="fas fa-play"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Slide index 1..slides.length: Slide Presentation Deck viewport */
                    <div className="flex-1 flex flex-col justify-between relative z-10 space-y-8 animate-fade-in">
                        {/*
                         * No step strip and no emoji/title header: with 18 slides the row of
                         * checkpoints ate the top half of every screen, and the question is
                         * already the first thing inside the slide itself. Where the tutor is
                         * (slide number, emoji, title) now lives in the single footer line.
                         */}

                        {/* Viewport for active slide */}
                        <div id="onboarding-slide-card" className="flex-1 flex flex-col items-center w-full max-w-7xl mx-auto py-4 text-center space-y-6 overflow-y-auto overflow-x-hidden">
                            {slideIndex >= 1 && slideIndex <= slides.length && (
                                <div className="space-y-4 animate-fade-in w-full max-w-7xl my-auto">
                                    <div 
                                        className="slide-rich text-3xl md:text-4xl text-slate-300 w-full max-w-7xl mx-auto leading-relaxed space-y-4"
                                        dangerouslySetInnerHTML={{ __html: decorateKeywords(slides[slideIndex - 1].content.replace(/{name}/g, autoName)) }}
                                    />
                                </div>
                            )}

                            {slideIndex === -999 && (
                                <div className="space-y-6 animate-fade-in">
                                    <span className="inline-block text-[110px] select-none hover:scale-110 transition-transform duration-300 cursor-pointer drop-shadow-[0_20px_25px_rgba(0,0,0,0.4)] animate-float-emoji">👋</span>
                                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">Welcome, {autoName}!</h2>
                                    <p className="text-xl md:text-2xl text-slate-300 max-w-2xl mx-auto leading-relaxed">Let's co-design a personalized curriculum that aligns with your real-world professional needs, goals, and style.</p>
                                    <p className="text-base text-indigo-400 font-medium tracking-wide">Press Right Arrow → to begin</p>
                                </div>
                            )}

                            {slideIndex === -992 && (
                                <div className="space-y-6 animate-fade-in w-full max-w-4xl">
                                    <div className="flex gap-4 justify-center">
                                        <span className="inline-block text-[90px] animate-float-emoji drop-shadow-[0_15px_20px_rgba(0,0,0,0.4)]">🗺️</span>
                                        <span className="inline-block text-[90px] animate-float-emoji drop-shadow-[0_15px_20px_rgba(0,0,0,0.4)]" style={{animationDelay: '1s'}}>💼</span>
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">About You</h2>
                                    <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                                        What is your name, age, birthday, and gender? Where do you live? What is your job, major, and native language?
                                    </p>
                                    
                                    {/* Animated Sample Answers */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto pt-4 text-left">
                                        <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 p-6 rounded-2xl transition-colors space-y-2">
                                            <p className="text-sm font-black text-indigo-400 uppercase tracking-wider">Example Response 1</p>
                                            <p className="text-slate-200 text-xl leading-relaxed">
                                                "Hello! My name is <strong>Sofia</strong>. I am <strong>32 years old</strong>. My birthday is <strong>May 12, 1994</strong>. I am a <strong>female</strong>. I live in <strong>Milan, Italy</strong>. My address is <strong>Via Roma 12</strong>. You can contact me using <strong>sofia.design@gmail.com</strong> to send me homework and feedbacks. My job is <strong>Design Manager</strong>. My major/field of study is <strong>Industrial Design</strong>. My native language is <strong>Italian</strong>. I love <strong>gourmet cooking</strong> and <strong>hiking</strong>."
                                            </p>
                                        </div>
                                        <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 p-6 rounded-2xl transition-colors space-y-2">
                                            <p className="text-sm font-black text-indigo-400 uppercase tracking-wider">Example Response 2</p>
                                            <p className="text-slate-200 text-xl leading-relaxed">
                                                "Hi! I am <strong>Kenji</strong>. I am <strong>28 years old</strong>. My birthday is <strong>October 5, 1998</strong>. I am a <strong>male</strong>. My city is <strong>Tokyo, Japan</strong>. My address is <strong>Shibuya 3-2-1</strong>. My email is <strong>kenji.code@gmail.com</strong> for homework and feedbacks. My job is <strong>Software Engineer</strong>. My major/field of study is <strong>Computer Science</strong>. My native language is <strong>Japanese</strong>. I like <strong>travel documentaries</strong> and <strong>mountain biking</strong>."
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {slideIndex === -993 && (
                                <div className="space-y-6 animate-fade-in w-full max-w-4xl">
                                    <div className="flex gap-4 justify-center">
                                        <span className="inline-block text-[90px] animate-float-emoji drop-shadow-[0_15px_20px_rgba(0,0,0,0.4)]">🎯</span>
                                        <span className="inline-block text-[90px] animate-float-emoji drop-shadow-[0_15px_20px_rgba(0,0,0,0.4)]" style={{animationDelay: '1.2s'}}>💬</span>
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">Your Goals and Focus</h2>
                                    <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                                        Where do you want to use the language? What do you want to focus on in our lessons?
                                    </p>
                                    
                                    {/* Animated Sample Answers */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto pt-4 text-left">
                                        <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 p-6 rounded-2xl transition-colors space-y-2">
                                            <p className="text-sm font-black text-indigo-400 uppercase tracking-wider">Example Target Situations</p>
                                            <p className="text-slate-200 text-xl leading-relaxed">
                                                "I have weekly project updates and presentation meetings at work. I feel a bit slow and hesitant when I speak."
                                            </p>
                                        </div>
                                        <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 p-6 rounded-2xl transition-colors space-y-2">
                                            <p className="text-sm font-black text-indigo-400 uppercase tracking-wider">Example Lesson Focus</p>
                                            <p className="text-slate-200 text-xl leading-relaxed">
                                                "I want to focus on speaking with no hesitations, writing clean emails, and fixing my errors."
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {slideIndex === -994 && (
                                <div className="space-y-6 animate-fade-in w-full max-w-4xl">
                                    <div className="flex gap-4 justify-center">
                                        <span className="inline-block text-[90px] animate-float-emoji drop-shadow-[0_15px_20px_rgba(0,0,0,0.4)]">🧠</span>
                                        <span className="inline-block text-[90px] animate-float-emoji drop-shadow-[0_15px_20px_rgba(0,0,0,0.4)]" style={{animationDelay: '1.4s'}}>🎨</span>
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">How Do You Learn Best?</h2>
                                    <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                                        What is your learning style? Tell us what helps you learn and your favorite topics!
                                    </p>
                                    
                                    {/* Animated Sample Answers */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto pt-4 text-left">
                                        <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 p-6 rounded-2xl transition-colors space-y-2">
                                            <p className="text-sm font-black text-indigo-400 uppercase tracking-wider">Example Response 1</p>
                                            <p className="text-slate-200 text-xl leading-relaxed">
                                                "My style is <strong>Visual</strong> (seeing pictures) and <strong>Linguistic</strong> (talking). My superpower is <strong>Memory</strong> (remembering easily). I have high <strong>Motivation</strong> and <strong>Confidence</strong>! My favorite topics & interests are <strong>global history</strong>, <strong>world travel documentaries</strong>, and <strong>mountain biking</strong>."
                                            </p>
                                        </div>
                                        <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 p-6 rounded-2xl transition-colors space-y-2">
                                            <p className="text-sm font-black text-indigo-400 uppercase tracking-wider">Example Response 2</p>
                                            <p className="text-slate-200 text-xl leading-relaxed">
                                                "I learn best with <strong>Auditory</strong> (listening) and <strong>Logical-Mathematical</strong> (solving puzzles). My brain works best with <strong>Focus</strong> and <strong>Logic</strong>. In class, I have some <strong>Fear of Mistakes</strong> and <strong>Anxiety</strong>. My interests are <strong>tech startups</strong>, <strong>artificial intelligence</strong>, and <strong>photography</strong>."
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {slideIndex === -995 && (
                                <div className="space-y-6 animate-fade-in w-full max-w-4xl">
                                    <span className="inline-block text-[100px] animate-float-emoji drop-shadow-[0_15px_20px_rgba(0,0,0,0.4)]">🤝</span>
                                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">Tutor Expectations</h2>
                                    <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                                        What should your teacher be like? What helps you feel happy and successful in class?
                                    </p>
                                    
                                    {/* Expected styles layout */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto pt-4 text-left">
                                        <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 p-6 rounded-2xl transition-colors space-y-2">
                                            <p className="text-sm font-black text-indigo-400 uppercase tracking-wider">Example Response 1</p>
                                            <p className="text-slate-200 text-xl leading-relaxed">
                                                "I want my tutor to be extremely <strong>Patient</strong> and <strong>Supportive</strong> when I speak. They should be a <strong>Clear communicator</strong> who provides **clear feedback** on errors. I also prefer someone who is **On time** and highly **Organized**. Please **Give homework**."
                                            </p>
                                        </div>
                                        <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 p-6 rounded-2xl transition-colors space-y-2">
                                            <p className="text-sm font-black text-indigo-400 uppercase tracking-wider">Example Response 2</p>
                                            <p className="text-slate-200 text-xl leading-relaxed">
                                                "I like when classes are **Fun** and **Energetic**, making lessons **Engaging** and **Enthusiastic**. They should be **Approachable** and **Respectful**. They must be **Knowledgeable** about technology, but they should **Not to give homework**."
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {slideIndex === -996 && (
                                <div className="space-y-6 animate-fade-in w-full max-w-4xl">
                                    <div className="flex gap-4 justify-center">
                                        <span className="inline-block text-[90px] animate-float-emoji drop-shadow-[0_15px_20px_rgba(0,0,0,0.4)]">📅</span>
                                        <span className="inline-block text-[90px] animate-float-emoji drop-shadow-[0_15px_20px_rgba(0,0,0,0.4)]" style={{animationDelay: '1.6s'}}>🚀</span>
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">Course Scheduling & Level</h2>
                                    <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                                        What is your level and goal? How long and how often would you like our lessons to be?
                                    </p>
                                    
                                    {/* Animated Sample Answers */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto pt-4 text-left">
                                        <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 p-6 rounded-2xl transition-colors space-y-2">
                                            <p className="text-sm font-black text-indigo-400 uppercase tracking-wider">Example Response 1</p>
                                            <p className="text-slate-200 text-xl leading-relaxed">
                                                "My current level is **Intermediate (B1)**, but my goal is **Upper-Intermediate (B2)**. I choose the **Business Result Upper-Intermediate** coursebook. I want a lesson **Duration** of **60 minutes (Standard)** with a **Frequency** of **2x per week (Balanced)** for a total of **24 Sessions (Standard)**."
                                            </p>
                                        </div>
                                        <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 p-6 rounded-2xl transition-colors space-y-2">
                                            <p className="text-sm font-black text-indigo-400 uppercase tracking-wider">Example Response 2</p>
                                            <p className="text-slate-200 text-xl leading-relaxed">
                                                "I am currently an **Advanced (C1)** speaker trying to reach **Expert (C2)**. I choose the **C1 Advanced Speakout** course book. I want a lesson **Duration** of **90 minutes (In-Depth)** with an intensive **Frequency** of **3x per week (Intensive)**, completing **48 Sessions (Intensive)**."
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {slideIndex === -997 && (
                                <div className="space-y-6 animate-fade-in w-full max-w-4xl">
                                    <div className="flex gap-4 justify-center">
                                        <span className="inline-block text-[90px] animate-float-emoji drop-shadow-[0_15px_20px_rgba(0,0,0,0.4)]">📝</span>
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">Placement Speaking Test</h2>
                                    <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                                        Please answer these three questions naturally. The AI will listen to your grammar, vocabulary, and flow to find your perfect CEFR level.
                                    </p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto pt-4 text-left">
                                        <div className="bg-indigo-950/25 border border-indigo-500/20 p-5 rounded-2xl transition-all">
                                            <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">Level A (Basic)</span>
                                            <h4 className="font-bold text-white text-base mt-3">Q1: Daily Life & Routines</h4>
                                            <p className="text-slate-300 text-base mt-2 font-medium">"What did you do yesterday evening? Tell us about your routine."</p>
                                            <p className="text-slate-400 text-xs mt-3 italic">AI looks for: basic past tense verbs, simple sentence connectors ("and", "but"), everyday nouns.</p>
                                        </div>
                                        <div className="bg-indigo-950/25 border border-indigo-500/20 p-5 rounded-2xl transition-all">
                                            <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">Level B (Independent)</span>
                                            <h4 className="font-bold text-white text-base mt-3">Q2: Opinions & Comparison</h4>
                                            <p className="text-slate-300 text-base mt-2 font-medium">"Compare living in a big city with living in a small village. What are the pros and cons?"</p>
                                            <p className="text-slate-400 text-xs mt-3 italic">AI looks for: comparatives, subordinate clauses ("although", "because"), expressing viewpoints.</p>
                                        </div>
                                        <div className="bg-indigo-950/25 border border-indigo-500/20 p-5 rounded-2xl transition-all">
                                            <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">Level C (Proficient)</span>
                                            <h4 className="font-bold text-white text-base mt-3">Q3: Abstract Hypothesis</h4>
                                            <p className="text-slate-300 text-base mt-2 font-medium">"Do you think artificial intelligence will replace humans in creative fields in the next decade? Explain your perspective."</p>
                                            <p className="text-slate-400 text-xs mt-3 italic">AI looks for: conditionals, hypothetical reasoning, advanced connectors, complex vocabulary.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {slideIndex === slides.length + 1 && (
                                <div id="onboarding-save-parse-card" className="space-y-6 animate-fade-in w-full max-w-2xl mx-auto">
                                    <div className="relative inline-block">
                                        <span className="inline-block text-[110px] drop-shadow-[0_20px_25px_rgba(0,0,0,0.4)] animate-float-emoji">✨</span>
                                        <div className="absolute inset-0 bg-indigo-500/30 rounded-full blur-2xl pointer-events-none animate-pulse" />
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">Thank you, {autoName}!</h2>
                                    <p className="text-xl md:text-2xl text-slate-300 max-w-lg mx-auto">Your customized profile is being analyzed... ✨</p>
                                    
                                    {/* Subtly Integrated Copy-Paste Interface */}
                                    <div className="pt-6 space-y-4">
                                        <div className="flex justify-end items-center px-1">
                                            {/* Unobtrusive Copy Button with no text */}
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    const p = getAnalysisPrompt(autoName);
                                                    // Silent on purpose: the button sits inside the flow the tutor is
                                                    // already following, and a modal telling them what they just
                                                    // asked for interrupted it. The copy is the whole feedback.
                                                    navigator.clipboard.writeText(p);
                                                }}
                                                className="text-slate-500 hover:text-indigo-400 p-2 rounded-full border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex items-center justify-center h-10 w-10 bg-slate-900/55"
                                                title="Copy Prompt"
                                            >
                                                <i className="fas fa-copy text-lg"></i>
                                            </button>
                                        </div>

                                        <textarea
                                            placeholder=""
                                            value={pastedJsonText}
                                            onChange={(e) => {
                                                const text = e.target.value;
                                                setPastedJsonText(text);
                                                if (!text.trim()) {
                                                    setIsJsonFaulty(false);
                                                    return;
                                                }
                                                try {
                                                    const parsed = cleanAndParseJSON(text);
                                                    if (parsed && typeof parsed === 'object') {
                                                        const normalized = normalizeLearnerProfileData(parsed);
                                                        setParsedLearnerData(normalized);
                                                        setIsJsonFaulty(false);
                                                    } else {
                                                        setIsJsonFaulty(true);
                                                    }
                                                } catch (err) {
                                                    setIsJsonFaulty(true);
                                                }
                                            }}
                                            className={`w-full h-24 p-3.5 border rounded-2xl text-xs font-mono focus:outline-none transition-colors ${
                                                isJsonFaulty 
                                                    ? 'border-red-500 bg-red-950/20 text-red-100 focus:border-red-400' 
                                                    : 'border-slate-800 bg-slate-800/50 focus:border-indigo-500 text-slate-300 focus:bg-slate-850'
                                            }`}
                                        />
                                        {isJsonFaulty && (
                                            <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-left animate-fade-in animate-duration-300">
                                                <p className="text-red-400 text-xs font-semibold leading-relaxed">
                                                    <i className="fas fa-exclamation-triangle mr-1"></i> Pasteboard error. Please ensure the full JSON block from the AI is copied and contains valid fields.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* High-Fidelity Slide Deck Editor Modal */}
                            {isEditorOpen && (
                                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                    <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col md:flex-row h-[90vh] md:h-[80vh] overflow-hidden text-left">
                                        
                                        {/* Sidebar: Slide selector list */}
                                        <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col bg-slate-950">
                                            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                                                <div>
                                                    <h3 className="font-extrabold text-white text-lg">Slide Deck Editor</h3>
                                                    <p className="text-xs text-slate-400">
                                                        {editingSlides.length} slides · shipped deck v{DECK_VERSION}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleResetSlides}
                                                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-xl text-sm font-bold flex items-center justify-center border border-slate-700"
                                                        title={`Restore the shipped ${DEFAULT_SLIDES.length}-slide deck`}
                                                    >
                                                        <i className="fas fa-undo"></i>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleAddNewSlide}
                                                        className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1 shadow-lg shadow-indigo-600/10 transition-colors"
                                                        title="Add Slide"
                                                    >
                                                        <i className="fas fa-plus"></i>
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                                {editingSlides.map((s, idx) => (
                                                    <button
                                                        key={s.id}
                                                        type="button"
                                                        onClick={() => handleSwitchEditSlide(idx)}
                                                        className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
                                                            idx === activeEditIndex
                                                                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 font-bold'
                                                                : 'bg-slate-900/50 border-transparent hover:border-slate-800 text-slate-400 hover:text-slate-200'
                                                        }`}
                                                    >
                                                        <span className="text-2xl">{s.emoji}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-xs block font-mono text-slate-500">Slide {idx + 1}</span>
                                                            <span className="text-sm truncate block font-bold leading-tight">{s.title.replace('{name}', 'Sofia')}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Editor Workspace */}
                                        <div className="flex-1 flex flex-col justify-between bg-slate-900 min-h-0">
                                            {editingSlides.length > 0 && (
                                                <div className="p-6 space-y-4 flex-1 overflow-y-auto min-h-0">
                                                    <div className="flex justify-between items-center">
                                                        <span className="bg-indigo-950 border border-indigo-500/20 text-indigo-400 font-mono text-xs px-2.5 py-1 rounded-full font-bold">
                                                            EDITING SLIDE {activeEditIndex + 1} OF {editingSlides.length}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={handleDeleteActiveSlide}
                                                            className="text-xs bg-red-950 hover:bg-red-900 text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-500/10 transition-colors"
                                                            title="Delete Slide"
                                                        >
                                                            <i className="fas fa-trash-alt mr-1"></i> Delete Slide
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                        <div className="sm:col-span-2">
                                                            <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-1.5">Slide Title</label>
                                                            <input
                                                                type="text"
                                                                value={editTitle}
                                                                onChange={(e) => updateActiveEditSlide('title', e.target.value)}
                                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-base focus:outline-none focus:border-indigo-500 font-bold"
                                                                placeholder="Welcome, {name}!"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-1.5">Slide Emojis</label>
                                                            <input
                                                                type="text"
                                                                value={editEmoji}
                                                                onChange={(e) => updateActiveEditSlide('emoji', e.target.value)}
                                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-base focus:outline-none focus:border-indigo-500 text-center text-xl"
                                                                placeholder="👋"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="block text-xs font-black uppercase text-slate-400 tracking-wider">Slide Content (HTML/Rich-Text)</label>
                                                        
                                                        {/* Text formatting panel */}
                                                        <div className="flex flex-wrap gap-1.5 p-2 bg-slate-950 border border-slate-800 rounded-xl">
                                                            <button
                                                                type="button"
                                                                onClick={() => applyTextFormatting('bold')}
                                                                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded border border-slate-800 hover:text-white"
                                                                title="Make selected text bold"
                                                            >
                                                                <i className="fas fa-bold mr-1"></i> Bold
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => applyTextFormatting('italic')}
                                                                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs italic rounded border border-slate-800 hover:text-white"
                                                                title="Make selected text italic"
                                                            >
                                                                <i className="fas fa-italic mr-1"></i> Italic
                                                            </button>
                                                            <div className="h-5 w-px bg-slate-800 self-center" />
                                                            <button
                                                                type="button"
                                                                onClick={() => applyTextFormatting('size-sm')}
                                                                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded border border-slate-800 hover:text-white"
                                                            >
                                                                Small
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => applyTextFormatting('size-md')}
                                                                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded border border-slate-800 hover:text-white"
                                                            >
                                                                Medium
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => applyTextFormatting('size-lg')}
                                                                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded border border-slate-800 hover:text-white"
                                                            >
                                                                Large
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => applyTextFormatting('size-xl')}
                                                                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded border border-slate-800 hover:text-white"
                                                            >
                                                                X-Large
                                                            </button>
                                                        </div>

                                                        <textarea
                                                            id="slide-content-textarea"
                                                            value={editContent}
                                                            onChange={(e) => updateActiveEditSlide('content', e.target.value)}
                                                            className="w-full h-44 bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-slate-300 text-sm font-mono focus:outline-none focus:border-indigo-500"
                                                            placeholder="<p>Slide content goes here...</p>"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="p-6 bg-slate-950 border-t border-slate-800 flex justify-between items-center gap-3">
                                                <span className="text-slate-500 text-xs font-mono">Use &lt;strong&gt;word&lt;/strong&gt; for bolding.</span>
                                                <div className="flex gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsEditorOpen(false)}
                                                        className="px-5 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-sm font-bold rounded-xl transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            handleSaveSlides(editingSlides);
                                                            setIsEditorOpen(false);
                                                        }}
                                                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/15 transition-all"
                                                    >
                                                        Save Slide Deck
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Navigation controls at bottom */}
                        <div className="flex justify-between items-center pt-6 border-t border-slate-800">
                            <button 
                                id="onboarding-prev-slide-btn"
                                type="button" 
                                onClick={() => {
                                    if (slideIndex === 1) {
                                        setSlideIndex(0);
                                    } else {
                                        setSlideIndex(prev => prev - 1);
                                    }
                                }}
                                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-colors flex items-center gap-2"
                            >
                                <i className="fas fa-arrow-left"></i> Previous
                            </button>
                            
                            <span className="text-slate-500 text-lg font-semibold">
                                Slide {slideIndex} of {slides.length + 1}
                                {slideIndex >= 1 && slideIndex <= slides.length && (
                                    <span className="text-slate-300">
                                        {' '}· {slides[slideIndex - 1].emoji} {slides[slideIndex - 1].title.replace(/{name}/g, autoName)}
                                    </span>
                                )}
                            </span>

                            {slideIndex < slides.length + 1 ? (
                                <button 
                                    id="onboarding-next-slide-btn"
                                    type="button" 
                                    onClick={() => {
                                        setSlideIndex(prev => prev + 1);
                                    }}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-indigo-600/10 flex items-center gap-2"
                                >
                                    Next <i className="fas fa-arrow-right"></i>
                                </button>
                            ) : (
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setOnboardingMode('selection');
                                        setSlideIndex(0);
                                        setPastedJsonText('');
                                        setIsJsonFaulty(false);
                                    }}
                                    className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-colors"
                                >
                                    Exit
                                </button>
                            )}
                        </div>
                    </div>
                )}
                {renderTourOverlay()}
            </div>
        );
    }

    // 3. MANUAL SETUP FORM (WRAPPER)
    return (
        <form id="onboarding-manual-form-step" onSubmit={handleSubmit} className="bg-white p-4 sm:p-8 rounded-2xl shadow-xl w-full mx-auto animate-fade-in">
            <div className="flex justify-between items-center border-b pb-4 mb-6">
                <div>
                    <h2 className="text-4xl font-extrabold text-gray-900 leading-none">Create a New Learner Profile</h2>
                    <p className="text-lg text-brand-gray-dark mt-1">Step {step} of {totalSteps}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setTourStep(10)}
                        className="px-4 py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition-colors text-sm flex items-center gap-1.5"
                    >
                        <i className="fas fa-question-circle"></i> Tour Guide
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setOnboardingMode('selection');
                        }}
                        className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold rounded-xl transition-colors text-sm"
                    >
                        Change Mode
                    </button>
                </div>
            </div>
            
            <div className="w-full bg-brand-gray-light rounded-full h-2.5 mb-8">
                <div className="bg-brand-blue h-2.5 rounded-full transition-all duration-300" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
            </div>

            {step === 1 && (
                <div className="space-y-6 animate-fade-in">
                    <h3 className="text-4xl font-bold">1. Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block font-semibold text-xl mb-2 flex items-center gap-2"><i className="fas fa-user w-5 text-center text-brand-gray-medium"></i> Full Name</label>
                            <input type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} className={inputClass} />
                        </div>
                        <div>
                            <label className="block font-semibold text-xl mb-2 flex items-center gap-2"><i className="fas fa-id-badge w-5 text-center text-brand-gray-medium"></i> Registered Name</label>
                            <input type="text" name="registeredName" placeholder="Name in other systems (e.g., Preply)" value={formData.registeredName} onChange={handleChange} className={inputClass} />
                        </div>
                         <div>
                            <label className="block font-semibold text-xl mb-2 flex items-center gap-2"><i className="fas fa-envelope w-5 text-center text-brand-gray-medium"></i> Email Address</label>
                            <input type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleChange} className={inputClass} />
                        </div>
                        <div>
                            <label className="block font-semibold text-xl mb-2 flex items-center gap-2"><i className="fas fa-phone w-5 text-center text-brand-gray-medium"></i> Phone Number</label>
                            <input type="tel" name="phone" placeholder="Phone Number" value={formData.phone} onChange={handleChange} className={inputClass} />
                        </div>
                        <div>
                            <label className="block font-semibold text-xl mb-2 flex items-center gap-2"><i className="fas fa-briefcase w-5 text-center text-brand-gray-medium"></i> Occupation</label>
                            <input type="text" name="occupation" placeholder="Occupation" value={formData.occupation} onChange={handleChange} className={inputClass} />
                        </div>
                        <div className="relative" id="country-autocomplete-group">
                            <label className="block font-semibold text-xl mb-2 flex items-center gap-2"><i className="fas fa-globe w-5 text-center text-brand-gray-medium"></i> Country</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    placeholder="Country" 
                                    value={countryQuery} 
                                    onChange={(e) => {
                                        setCountryQuery(e.target.value);
                                        setShowCountryDropdown(true);
                                    }} 
                                    onFocus={() => setShowCountryDropdown(true)}
                                    className={inputClass} 
                                />
                                {isCountryLoading && (
                                    <div className="absolute right-3 top-3.5 flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-blue"></div>
                                    </div>
                                )}
                            </div>
                            {showCountryDropdown && countrySuggestions.length > 0 && (
                                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                    {countrySuggestions.map((countryOpt, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handleCountrySelect(countryOpt)}
                                            className="w-full text-left px-4 py-3 hover:bg-brand-blue hover:text-white transition-colors border-b last:border-0 border-gray-100 text-lg font-medium"
                                        >
                                            {countryOpt}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="relative" id="city-autocomplete-group">
                            <label className="block font-semibold text-xl mb-2 flex items-center gap-2"><i className="fas fa-city w-5 text-center text-brand-gray-medium"></i> City & Address</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    placeholder="City name or address..." 
                                    value={cityQuery} 
                                    onChange={(e) => {
                                        setCityQuery(e.target.value);
                                        setShowCityDropdown(true);
                                    }} 
                                    onFocus={() => setShowCityDropdown(true)}
                                    className={inputClass} 
                                />
                                {isCityLoading && (
                                    <div className="absolute right-3 top-3.5 flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-blue"></div>
                                    </div>
                                )}
                            </div>
                            {showCityDropdown && citySuggestions.length > 0 && (
                                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                    {citySuggestions.map((cityOpt, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handleCitySelect(cityOpt)}
                                            className="w-full text-left px-4 py-3 hover:bg-brand-blue hover:text-white transition-colors border-b last:border-0 border-gray-100 text-lg font-medium"
                                        >
                                            {cityOpt}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                           <label className="block font-semibold text-xl mb-2 flex items-center gap-2"><i className="fas fa-birthday-cake w-5 text-center text-brand-gray-medium"></i> Birthday</label>
                           <input type="date" name="birthday" value={formData.birthday} onChange={handleChange} className={inputClass} />
                        </div>
                         <div>
                            <label className="block font-semibold text-xl mb-2 flex items-center gap-2"><i className="fas fa-graduation-cap w-5 text-center text-brand-gray-medium"></i> Major/Field of Study</label>
                            <input type="text" name="major" placeholder="Major/Field of Study" value={formData.major} onChange={handleChange} className={inputClass} />
                        </div>
                         <div>
                            <label className="block font-semibold text-xl mb-2 flex items-center gap-2"><i className="fas fa-venus-mars w-5 text-center text-brand-gray-medium"></i> Gender</label>
                            <select name="gender" value={formData.gender} onChange={handleChange} className={inputClass}>
                                <option value="PreferNotToSay">Prefer not to say</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <div>
                            <label className="block font-semibold text-xl mb-2 flex items-center gap-2"><i className="fas fa-comment w-5 text-center text-brand-gray-medium"></i> L1: Speaking Language</label>
                            <input type="text" name="l1Language" placeholder="e.g. Spanish" value={formData.l1Language || ''} onChange={handleChange} className={inputClass} />
                        </div>
                        <div>
                            <label className="block font-semibold text-xl mb-2 flex items-center gap-2"><i className="fas fa-language w-5 text-center text-brand-gray-medium"></i> L2: Target Language</label>
                            <input type="text" name="targetLanguage" placeholder="e.g. English" value={formData.targetLanguage || ''} onChange={handleChange} className={inputClass} />
                        </div>
                    </div>
                </div>
            )}
            
            {step === 2 && (
                 <div className="space-y-6 animate-fade-in">
                    <h3 className="text-4xl font-bold">2. Needs & Competencies</h3>
                    <p className="text-2xl text-brand-gray-dark mb-4">Hi {formData.name || 'Learner'}, Why do you want to learn {formData.targetLanguage || 'L2'}?</p>
                    <div className="space-y-4">
                        {(formData.needs || []).map((need, index) => (
                           <div key={need.id} className="bg-gray-50 p-4 rounded-lg space-y-3 border">
                                <div className="flex items-center gap-2">
                                    <input type="text" placeholder="Learner's need (e.g. Confidence)" value={need.name} onChange={(e) => handleNeedChange(index, e.target.value)} className={`${inputClass} bg-white`} />
                                    
                                    {/* AI Import trigger */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!need.name.trim()) {
                                                alert("Please type a goal / learner's need first (e.g. Success at work) to generate competencies.");
                                                return;
                                            }
                                            copyPromptToClipboard(need.id, need.name);
                                            setPasteError(null);
                                        }}
                                        className={`rounded-xl transition-all duration-350 flex items-center justify-center h-[52px] w-[52px] border ${
                                            copiedNeedId === need.id
                                                ? 'bg-purple-600 text-white shadow-lg animate-pulse border-purple-500 hover:bg-purple-700'
                                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                                        }`}
                                        title="Click to copy Prompt, then press Ctrl+V to paste JSON competencies"
                                    >
                                        <i className="fas fa-magic text-lg"></i>
                                    </button>

                                    <EditableStarRating rating={need.rating} onRatingChange={(r) => handleNeedRatingChange(index, r)} />
                                    <button type="button" onClick={() => removeNeed(index)} className="text-red-500 hover:text-red-700 p-2 text-2xl font-bold">&times;</button>
                                </div>
                                <div className="pl-4 space-y-2">
                                    <h5 className="text-lg font-bold text-gray-600">Competencies for this Need</h5>
                                    {(need.learningPath || []).map(skill => (
                                        <div key={skill.id} className="flex items-center justify-between text-base bg-white p-2 rounded-md border">
                                            <span>{skill.name} <span className="text-gray-500">({skill.progress}%)</span></span>
                                            <button type="button" onClick={() => handleRemoveSkillFromNeed(need.id, skill.id, skill.name)} className="text-red-500 text-lg font-bold">&times;</button>
                                        </div>
                                    ))}
                                     <div 
                                        className="flex gap-2"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleTriggerAddCompetency(need.id);
                                            }
                                        }}
                                    >
                                        <input 
                                            type="text"
                                            value={newCompetencyInputs[need.id]?.name || ''}
                                            onChange={e => handleNewCompetencyInputChange(need.id, 'name', e.target.value)}
                                            placeholder="Type new competency and press Enter..." 
                                            className={`${inputClass} text-base bg-white flex-grow`}
                                        />
                                        <input
                                            type="number"
                                            min="0" max="100"
                                            value={newCompetencyInputs[need.id]?.progress || 0}
                                            onChange={e => handleNewCompetencyInputChange(need.id, 'progress', parseInt(e.target.value) || 0)}
                                            className={`${inputClass} text-base bg-white w-32`}
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => handleTriggerAddCompetency(need.id)}
                                            className="bg-brand-blue text-white font-bold text-xl rounded-lg px-4 hover:bg-blue-600 transition-colors"
                                            aria-label="Add Competency"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center">
                        <button type="button" onClick={addNeed} className="font-bold text-brand-blue hover:underline text-lg">+ Add Need</button>
                    </div>

                    {/* Situations and Lesson Focus Section */}
                    <div className="pt-6 border-t border-brand-gray-light space-y-6">
                        <h4 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <i className="fas fa-briefcase text-brand-purple"></i> Situations & Lessons Focus
                        </h4>
                        <p className="text-lg text-brand-gray-dark">
                            Define specific real-world contexts and instructional focal points to make lessons extremely relevant.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block font-semibold text-xl mb-2 flex items-center gap-2">
                                    <i className="fas fa-comments text-brand-blue"></i> Situations (where they will use L2)
                                </label>
                                <textarea
                                    name="situations"
                                    placeholder="e.g. Weekly project syncs, networking events, writing technical documentation..."
                                    value={formData.situations || ''}
                                    onChange={handleChange}
                                    className={`${inputClass} h-32 resize-none`}
                                />
                            </div>
                            <div>
                                <label className="block font-semibold text-xl mb-2 flex items-center gap-2">
                                    <i className="fas fa-bullseye text-brand-blue"></i> Focus (What lessons should concentrate on)
                                </label>
                                <textarea
                                    name="focus"
                                    placeholder="e.g. Spontaneous speaking practice, formal business register, pronunciation correction..."
                                    value={formData.focus || ''}
                                    onChange={handleChange}
                                    className={`${inputClass} h-32 resize-none`}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-8 animate-fade-in relative">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <div>
                            <h3 className="text-4xl font-bold">3. Learning Profile & Interests</h3>
                            <p className="text-2xl text-brand-gray-dark mt-2">{formData.name || 'Learner'}, Let's see how you learn best so I can make the best personalized lessons for you.</p>
                        </div>
                    </div>

                    {/* Category (Theme) — colors the profile, recommends lesson types & pairs weekly rivals */}
                    <div className="bg-white border-2 border-brand-gray-light rounded-2xl p-5 space-y-3">
                        <label className="block font-semibold text-xl flex items-center gap-2">
                            <i className="fas fa-palette text-brand-purple"></i> Category (Theme)
                        </label>
                        <p className="text-base text-brand-gray-dark">Pick the theme that best describes this learner's goal. It colors the profile sections, decorates the background, flags recommended lesson types in the Lesson Creator, and pairs them with same-category rivals in the Weekly Competition.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {LEARNER_CATEGORIES.map(cat => {
                                const selected = formData.category === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => handleTagChange('category', cat.id)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${selected ? 'border-brand-purple bg-purple-50 shadow-md' : 'border-brand-gray-light bg-white hover:border-purple-300'}`}
                                    >
                                        <span className="text-2xl">{cat.emoji}</span>
                                        <span className="flex-1 min-w-0">
                                            <span className="block font-bold text-base">{cat.name}</span>
                                            <span className="block text-xs text-brand-gray-dark truncate">{cat.tagline}</span>
                                        </span>
                                        {selected && <span className="text-brand-purple font-black">✓</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                        <button 
                            type="button"
                            onClick={() => setShowLearningTest(true)}
                            className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded hover:bg-purple-200 flex items-center gap-2 font-semibold"
                        >
                            <i className="fas fa-brain"></i> Take Profile Assessment
                        </button>
                    
                    <LearningProfileTest 
                        isOpen={showLearningTest} 
                        onClose={() => setShowLearningTest(false)} 
                        onComplete={handleLearningTestComplete} 
                    />
                    {Object.entries(LEARNING_FACTORS).map(([category, data]) => (
                         <div key={category} className={`p-4 border-2 border-dashed border-${data.color}-400 rounded-lg space-y-4 bg-${data.color}-50`}>
                            <h4 className={`font-bold text-xl text-${data.color}-800`}>{category}</h4>
                            <p className="text-lg text-brand-gray-dark italic">{data.guide}</p>
                            <TriStateSelector 
                                factors={data.items}
                                values={formData.learningFactors || {}}
                                onValueChange={handleLearningFactorChange}
                            />
                        </div>
                    ))}
                    
                    <label className="block font-semibold text-xl">💖 Favorite Topics & Interests
                        <TagSelector
                            options={INTEREST_OPTIONS}
                            value={formData.interests || ''}
                            onChange={(v) => handleTagChange('interests', v)}
                            placeholder="Add custom interest and press Enter"
                        />
                    </label>
                </div>
            )}
            
            {step === 4 && (
                 <div className="space-y-6 animate-fade-in">
                    <h3 className="text-4xl font-bold">4. Tutor Expectations</h3>
                    <p className="text-2xl text-brand-gray-dark mb-4">{formData.name || 'Learner'}, how would you like your teacher to be?</p>
                    <TagSelector
                        options={EXPECTATION_OPTIONS}
                        value={formData.expectations || ''}
                        onChange={(v) => handleTagChange('expectations', v)}
                        placeholder="Add new expectation and press Enter"
                    />
                </div>
            )}

            {step === 5 && (
                <div className="space-y-6 animate-fade-in">
                    <h3 className="text-4xl font-bold">5. Course Plan & Scheduling</h3>
                    <p className="text-2xl text-brand-gray-dark mb-4">{formData.name || 'Learner'}, let's map out your schedule and core parameters for a perfect course layout.</p>
                     <CoursePlannerForm 
                        plan={formData.coursePlan!} 
                        onPlanChange={handleCoursePlanChange} 
                     />
                </div>
            )}
            
            {step === 6 && (
                <div className="space-y-8 animate-fade-in text-center">
                    <h3 className="text-4xl font-bold">🎉 Ready to Go!</h3>
                    <p className="text-2xl text-brand-gray-dark">You're all set. A new profile for <strong className="text-brand-purple">{formData.name || 'this learner'}</strong> will be created with the following details.</p>
                    <div className="p-6 bg-gray-50 rounded-lg text-left max-w-md mx-auto space-y-4 shadow-inner text-lg">
                        <p><strong><i className="fas fa-user mr-2 text-brand-blue"></i>Name:</strong> {formData.name}</p>
                        <p><strong><i className="fas fa-graduation-cap mr-2 text-brand-blue"></i>Level:</strong> {formData.coursePlan?.level}</p>
                        <p><strong><i className="fas fa-bullseye mr-2 text-brand-blue"></i>Needs:</strong> {formData.needs?.map(n => n.name).join(', ')}</p>
                        <p><strong><i className="fas fa-heart mr-2 text-brand-blue"></i>Interests:</strong> {formData.interests}</p>
                        {getCategoryById(formData.category) && (
                            <p><strong><i className="fas fa-palette mr-2 text-brand-purple"></i>Category:</strong> {getCategoryById(formData.category)!.emoji} {getCategoryById(formData.category)!.name}</p>
                        )}
                    </div>
                    <p className="text-base text-gray-500">Click the button below to finish and view the new profile.</p>
                </div>
            )}

            <div className="flex justify-between mt-10">
                {step > 1 ? (
                    <button type="button" onClick={handlePrev} className="bg-brand-gray-medium text-white font-bold py-3 px-8 rounded-xl hover:bg-brand-gray-dark transition-colors text-lg">Previous</button>
                ) : <div />}
                {step < totalSteps ? (
                    <button type="button" onClick={handleNext} className="bg-brand-blue text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-600 transition-colors text-lg">Next</button>
                ) : (
                    <button type="submit" disabled={isSubmitting} className="bg-brand-green text-white font-bold py-3 px-8 rounded-xl hover:bg-green-600 transition-colors disabled:bg-gray-400 text-lg">
                        {isSubmitting ? 'Creating...' : 'Create & View Profile'}
                    </button>
                )}
            </div>

            {/* PREMIUM COOL SELECT MODAL */}
            {importModalOpenNeedId && parsedCompetencies && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 p-4 animate-fade-in font-sans">
                    <div className="bg-white rounded-3xl p-6 md:p-8 max-w-3xl w-full shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-4 border-b pb-4">
                            <h3 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                                <span className="p-2 bg-purple-100 text-purple-700 rounded-xl"><i className="fas fa-magic"></i></span>
                                Select Competencies
                            </h3>
                            <button 
                                type="button" 
                                onClick={() => {
                                    setImportModalOpenNeedId(null);
                                    setParsedCompetencies(null);
                                }} 
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
                            <div className="bg-gray-50 p-4 rounded-xl text-gray-700 text-base">
                                Choose which competencies are the perfect match for the goal <strong className="text-gray-900">"{formData.needs?.find(n => n.id === importModalOpenNeedId)?.name}"</strong>:
                            </div>

                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-medium">
                                    {Object.values(selectedImportIndices).filter(Boolean).length} of {parsedCompetencies.length} Selected
                                </span>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const sel: Record<number, boolean> = {};
                                            parsedCompetencies.forEach((_, i) => { sel[i] = true; });
                                            setSelectedImportIndices(sel);
                                        }}
                                        className="text-purple-600 hover:text-purple-800 font-bold"
                                    >
                                        Select All
                                    </button>
                                    <span className="text-gray-300">|</span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedImportIndices({})}
                                        className="text-gray-500 hover:text-gray-700 font-bold"
                                    >
                                        Deselect All
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 pr-2 border rounded-xl bg-white animate-fade-in">
                                {parsedCompetencies.map((comp, idx) => {
                                    const isSelected = !!selectedImportIndices[idx];
                                    return (
                                        <label 
                                            key={idx} 
                                            className={`flex items-start gap-3 p-3 text-base cursor-pointer hover:bg-purple-50/50 transition-colors ${isSelected ? 'bg-purple-50/20' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => {
                                                    setSelectedImportIndices(prev => ({
                                                        ...prev,
                                                        [idx]: !prev[idx]
                                                    }));
                                                }}
                                                className="mt-1 h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                            />
                                            <span className="font-semibold text-gray-800 leading-tight">{comp}</span>
                                        </label>
                                    );
                                })}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setImportModalOpenNeedId(null);
                                        setParsedCompetencies(null);
                                    }}
                                    className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAddImportedCompetencies}
                                    className="px-6 py-2.5 rounded-xl bg-brand-green hover:bg-green-600 text-white font-bold shadow-lg shadow-green-600/25 transition-all"
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Coursebook Manager Modal */}
            <CoursebookManagerModal
                isOpen={isCoursebookModalOpen}
                onClose={() => setIsCoursebookModalOpen(false)}
                onSelectCoursebook={(courseName) => {
                    if (parsedLearnerData) {
                        handleParsedCoursePlanFieldChange('courseName', courseName);
                    } else {
                        setFormData(prev => ({
                            ...prev,
                            coursePlan: {
                                ...prev.coursePlan,
                                courseName: courseName
                            } as CoursePlan
                        }));
                    }
                }}
                initialSelectedId={selectedCoursebookIdForModal}
            />

            {/* Video Preview Modal */}
            {activeVideoModalId && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl relative">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                            <span className="font-extrabold text-white text-sm flex items-center gap-2">
                                🎬 Coursebook Video Introduction
                            </span>
                            <button 
                                type="button"
                                onClick={() => setActiveVideoModalId(null)}
                                className="text-slate-400 hover:text-white font-bold text-sm bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg transition-colors cursor-pointer"
                            >
                                Close ✕
                            </button>
                        </div>
                        <div className="aspect-video w-full bg-black">
                            <iframe 
                                src={`https://www.youtube-nocookie.com/embed/${activeVideoModalId}?autoplay=1`}
                                title="Coursebook Video Preview"
                                className="w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        </div>
                    </div>
                </div>
            )}

            {renderTourOverlay()}
        </form>
    );
};

export default OnboardingWizard;