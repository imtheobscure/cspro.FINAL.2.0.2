
export const SUPPORTED_TARGET_LANGUAGES = [
  "English", "Spanish", "French", "German", "Italian", "Portuguese",
  "Chinese", "Japanese", "Korean", "Russian", "Arabic", "Hindi"
];

export const LANGUAGE_CODE_MAP: Record<string, string> = {
  "English": "en", "Spanish": "es", "French": "fr", "German": "de",
  "Italian": "it", "Portuguese": "pt", "Chinese": "zh", "Japanese": "ja",
  "Korean": "ko", "Russian": "ru", "Arabic": "ar", "Hindi": "hi"
};

export const WEEKLY_CHALLENGE_THEMES = [
  "Mystery/Detective", "Simulation/Roleplay", "Escape Room", 
  "Sci-Fi Adventure", "Historical Time Travel", "Business Tycoon"
];

export interface VoiceInfo {
    id: string;
    name: string;
    description: string;
    gender: 'male' | 'female' | 'child';
}

export interface Activity {
    type: string; // 'paragraph', 'list', 'questions', etc.
    title: string;
    content: string | any; // content can be JSON parsed object
    comprehensiveFeedback?: string;
    imageUrl?: string;
    imageCaption?: string;
    videoUrl?: string;
    videoCaption?: string;
}

export interface Section {
    title: string;
    color: string;
    activities: Activity[];
    studyTime?: string;
    xpReward?: number;
    videoUrl?: string;
}

export interface StructuredOutput {
    sections: Section[];
}

export interface HomeworkTask {
    title: string;
    text?: string;
    scenario?: string;
    script?: string;
    instruction?: string;
    prompt?: string;
    modelAnswer?: string;
    explanation?: string;
    exercises?: string;
    task?: string;
    questions?: { question: string; answer: string }[];
    // New fields
    context?: string;
    comprehensionQuestions?: { question: string; answer: string }[];
    story?: string;
    hypotheticalQuestion?: string;
    optionA?: { description: string; outcome: string };
    optionB?: { description: string; outcome: string };
    expertComment?: string;
    analysisQuestions?: { question: string; answer: string }[];
    searchTopic?: string;
    taskInstructions?: string;
    analysis?: string;
    intro?: string;
    comments?: { character: string; text: string }[];
}

export interface HomeworkOutput {
    reading: { title: string; tasks: HomeworkTask[] };
    listening: { title: string; podcast: HomeworkTask; conversation: HomeworkTask };
    speaking: HomeworkTask;
    writing: HomeworkTask;
    grammar: HomeworkTask;
    vocabulary: HomeworkTask;
    integratedSkills: HomeworkTask;
    softSkills: HomeworkTask;
    dialogue?: HomeworkTask;
    fiction?: HomeworkTask;
    roleplay?: HomeworkTask;
    practical?: HomeworkTask;
    review?: HomeworkTask;
    discussion?: HomeworkTask;
    answerKey: string;
    [key: string]: any; // Allow indexing
}

export interface QuizOutput {
    sections: Section[];
    answerKey: string;
}

export interface LearningPackage {
    lesson: StructuredOutput;
    lessonSummary: string;
    homework: HomeworkOutput | null;
    quiz: QuizOutput | null;
    lessonPlan: string;
    generatedAt: string;
    completed: boolean;
    platformId?: string;
}

export interface SimulationCharacter {
    name: string;
    voice: string;
}

export interface SimulationLine {
    speaker: string;
    line: string;
    emotion: string;
}

export interface SimulationScenario {
    title: string;
    scenario: string;
    characters: SimulationCharacter[];
    dialogue: SimulationLine[];
    dialogueForStudent: string;
    discussionQuestions: {
        comprehension: string[];
        speaking: string[];
        synthesis: string[];
    };
    practicePrompt: string;
    systemInstructionForPractice: string;
}

export interface StudyGuideOutput {
    audioOverview: { title: string; script: any; audioBase64?: string };
    summarySlides: Slide[];
    flashcards: Flashcard[];
}

export interface Slide {
    title: string;
    content: string;
    usageNotes?: string;
    personalizedExamples?: string[];
    comparison?: string;
    commonErrors?: string;
    bulletPoints: string[];
}

export interface Flashcard {
    term: string;
    partOfSpeech: string;
    register: string;
    definition: string;
    example?: string;
    examples?: string[];
    wouldYouRather?: { optionA: string; optionB: string; consequenceA: string; consequenceB: string };
    ccq?: { question: string; answer: string };
}

export interface WeeklyChallengeSection<T> {
    dayOfWeek: string;
    color: string;
    estimatedTime: string;
    content: T;
}

export interface WeeklyChallengeReading {
    instruction: string;
    genre: string;
    text: string;
    questions: { question: string; answer: string }[];
    answerKey: string;
}

export interface WeeklyChallengeFictionReading extends Omit<WeeklyChallengeReading, 'questions'> {
    questions: { question: string; answer: boolean | string }[]; // boolean for True/False
}

export interface WeeklyChallengeListening {
    instruction: string;
    genre: string;
    text: string;
    comprehensionQuestions: { question: string; answer: string }[];
    answerKey: string;
    speakingQuestions: { question: string; requirements: string[] }[];
}

export interface WeeklyChallengeDialogueLine {
    character: string;
    line: string;
}

export interface WeeklyChallengeDialogue {
    instruction: string;
    title: string;
    characters: string[];
    lines: WeeklyChallengeDialogueLine[];
}

export interface WeeklyChallengeRolePlayTurn {
    character: string;
    choices: { option: string; text: string }[];
}

export interface WeeklyChallengeRolePlay {
    instruction: string;
    title: string;
    scenario: string;
    turns: WeeklyChallengeRolePlayTurn[];
}

export interface WeeklyChallengeIntegratedActivity {
    instruction: string;
    searchTopic: string;
    resourceDescription: string;
    task: string;
}

export interface WeekendReview {
    instruction: string;
    productiveChallenge: { title: string; description: string };
    reviewQuestions: { context: string; question: string; checklist: string[] }[];
}

export interface WeeklyChallengeOutput {
    comments: { characterName: string; characterAvatar: string; commentText: string }[];
    reading?: WeeklyChallengeSection<WeeklyChallengeReading>;
    fictionReading?: WeeklyChallengeSection<WeeklyChallengeFictionReading>;
    listening?: WeeklyChallengeSection<WeeklyChallengeListening>;
    speaking?: WeeklyChallengeSection<{ instruction: string }>;
    writing?: WeeklyChallengeSection<{ instruction: string }>;
    dialogue?: WeeklyChallengeSection<WeeklyChallengeDialogue>;
    rolePlay?: WeeklyChallengeSection<WeeklyChallengeRolePlay>;
    integratedActivity?: WeeklyChallengeSection<WeeklyChallengeIntegratedActivity>;
    weekendReview?: WeeklyChallengeSection<WeekendReview>;
    generatedAt?: string;
    [key: string]: any;
}

export interface GamifiedWeeklyChallengeOutput {
    theme: string;
    storylineIntro: string;
    finalReward: string;
    days: Array<{
        dayNumber: number;
        dayName: string;
        title: string;
        skillLabel: string;
        content: {
            text?: string;
            audioScript?: string;
            speakingPrompt?: string;
            task: string;
            quiz?: { question: string; options: string[]; answer: string }[];
        };
        unlockClue: string;
        secretCode: string;
        voices?: { character: string; voiceId: string }[];
    }>;
    generatedAt: string;
}

export interface PrintableWorksheetOutput {
    sections: { title: string; instruction: string; content: string }[];
    answerKey: string;
}

export interface SlideContent {
    slideNumber: number;
    title: string;
    keywordsSection: { title: string; content: string };
    examplesSection: { title: string; content: string };
    comprehensionSection: { title: string; questions: { q: string; a: string }[] };
    strategySection: { title: string; content: string };
    dialogueSection: { title: string; content: string };
    grammarSection: { title: string; content: string };
    visualCue: string;
}

export interface SlidePackageOutput {
    slides: SlideContent[];
    explainer: {
        mindMap: string;
        notes: Array<{
            slideNumber: number;
            context: string;
            warmUpActivity: string;
            keyVocabularyAndConcepts: string;
            deeperComprehension: { shortAnswer: string; criticalThinking: string; exampleGeneration: string };
            coreLectureNotes: string;
            practicalApplication: string;
            discussionPrompts: { for: string; against: string };
            culturalConnection: string;
            commonMisconceptions: string;
            caseStudyExample: string;
            summaryAndTakeaways: string;
        }>;
    };
}

export interface MusicLesson {
    title: string;
    artist: string;
    lyrics: string;
    vocabulary: { word: string; definition: string }[];
    grammarFocus: { point: string; explanation: string };
    exercises: { type: string; question: string; options?: string[]; answer?: string }[];
}

export interface MusicLessonOutput {
    title: string;
    artist: string;
    htmlContent: string;
}

export interface DailyLessonData {
    secretCode: string;
    htmlContent: string;
    createdAt?: string;
}

export interface ConversationGameData {
    secretCode: string;
    htmlContent: string;
    theme: string;
    createdAt?: string;
}

export interface PlaceGame {
    placeName: string;
    city: string;
    country: string;
    htmlContent: string;
    createdAt?: string;
}

export interface PartyModeQuestion {
    id: string;
    type: string;
    question: string;
    context?: string;
    options?: string[];
    answer: string;
    hotSeatQuestions?: string[];
    tabooCards?: { target: string; forbidden: string[] }[];
    icons?: string[];
    conceptLesson?: { title: string; lifeSkill: string; content: string };
    bingoActions?: { action: string; isLesson: boolean }[];
    suspects?: { name: string; alibi: string; isGuilty: boolean; voice: string }[];
    bombTasks?: string[];
    sentimentData?: { emotion: string; line: string; keywords: string[] };
    spyfallData?: { 
        location: string; 
        job: string; 
        players: { name: string; avatarSeed: string; statement: string; isSpy: boolean }[] 
    };
    speedReaderData?: { paragraph: string; aiSpeed: number };
    forbiddenWords?: string[];
    points: number;
    skill: string;
    difficultyLevel?: string;
    taunt?: string;
    motivation?: string;
    explanation?: string;
    hint?: string;
    deepDive?: string;
    examples?: string[];
    ccq?: { question: string; answer: string };
    speakingCCQ?: string;
    /**
     * The colour-coded mini lesson revealed after this card. Requested by the Copy
     * AI prompt on every grid question and rendered on reveal; `media` is what lets
     * a question teach something words cannot (an image, a gif, a pronunciation
     * clip, a YouTube scene).
     */
    feedback?: {
        headline?: string;
        correct?: string;
        wrong?: string;
        rule?: string;
        vocab?: string;
        steps?: string[];
        examples?: string[];
        speak?: string;
        media?: { kind?: string; url: string; caption?: string }[];
    };
    /**
     * Which CEFR point this card actually tests, filled in by the Party Mode
     * generator (never by the AI) so the end-of-game report can group the class's
     * misses by CEFR point and name the weakest one. `cefrLevel` is the level that
     * point belongs to; a card that matches nothing keeps both empty and is grouped
     * by its `skill` instead.
     */
    cefrLevel?: string;
    cefrTopic?: string;
    /** Hidden-role games only (Mafia / Werewolf). */
    variant?: 'mafia' | 'werewolf';
    setting?: string;
    title?: string;
    characters?: {
        name?: string;
        role?: string;
        team?: string;
        statement?: string;
        line?: string;
        avatarSeed?: string;
        seed?: string;
        /**
         * One sentence that narrows the character towards their team. Shown only
         * when the round's difficulty asks for tells — see the Mafia/Werewolf
         * difficulty setting — and named in the end-of-round report as "the real
         * tell".
         */
        tell?: string;
    }[];
    solution?: string[];
    /** 1-based cell number the card was dealt into, set by the board. */
    gridId?: number;
}

export interface PartyModeOutput {
    gameTitle: string;
    gameDescription: string;
    questions: PartyModeQuestion[];
    powerUps: string[];
    /*
     * Set by `generatePartyModeHtml` just before the lesson is written out.
     * `cefrLevel`/`cefrTier` are the learner's (or class's) ceiling, which is what
     * makes the report's CEFR grouping mean "at your level" rather than "whatever
     * the AI happened to write".
     */
    cefrLevel?: string;
    cefrTier?: number;
    tutor?: { name?: string; avatar?: string } | null;
    learnerAvatar?: string;
    learnerName?: string;
    readAloudVoice?: string;
}

export interface LearnerContent {
    rawText: string;
    lessonText?: string;
    learningPackage: LearningPackage | null;
    partyMode?: PartyModeOutput;
    generatedLessons?: Record<string, StructuredOutput>;
    simulations?: SimulationScenario[];
    gamifiedWeeklyChallenge?: GamifiedWeeklyChallengeOutput;
    weeklyChallenge?: WeeklyChallengeOutput;
    learningApp?: StructuredOutput;
    printableWorksheet?: PrintableWorksheetOutput;
    studyGuide?: StudyGuideOutput;
    slidePackage?: SlidePackageOutput;
    dailyLesson?: DailyLessonData;
    conversationGame?: ConversationGameData;
    placeGame?: PlaceGame;
    musicLesson?: MusicLessonOutput;
    liveLesson?: any;
    videoLesson?: StructuredOutput;
    avatarLesson?: any;
    avatarLessonV2?: any;
}

export interface AttachedFileMeta {
    id: string; // Unique ID to map back to session file object
    name: string;
    type: string;
    size: number;
    description: string;
}

export interface LessonImage {
    id: string;
    url: string;
    caption: string;
    type: 'image' | 'gif';
    altText?: string;
    sourceUrl?: string;
}

export interface LessonVideo {
    id: string;
    url: string;
    caption: string;
    type: 'youtube' | 'mp4' | 'vimeo';
    altText?: string;
    sourceUrl?: string;
}

/** One entry of the detailed Table of Contents that sectioned lessons (Micro Lesson V1/V2, Explainer,
 *  Exam Prep, Conversational, Bilingual) must ship: the exact section title plus a concise description
 *  of what that section covers. Drives the Lesson Settings media-AI prompt and the Learner Path log. */
export interface LessonTableOfContentsEntry {
    section?: number | string;
    title: string;
    overview?: string;
    skills?: string[];
    activityHighlights?: string[];
}

/** Unified media item handled by the Lesson Settings → “Add Media” studio.
 *  Replaces the split Lesson Images / Lesson Videos sections with one media
 *  list (images, GIFs, YouTube/Vimeo/MP4 videos, audio/podcasts, any embed)
 *  that can be injected into a specific section of the generated lesson. */
export type LessonMediaType = 'image' | 'gif' | 'youtube' | 'vimeo' | 'video' | 'audio' | 'podcast' | 'embed';

export interface LessonMediaItem {
    id: string;
    type: LessonMediaType;
    url: string;
    caption?: string;
    altText?: string;
    sourceUrl?: string;
    title?: string;
    /** Optional — which section the media belongs to, e.g. "0", "1" or a section title like "Grammar Deep Dive".
     *  Leave empty for automatic even distribution across the lesson. */
    targetSection?: string | number;
    /** Optional — which activity *inside* `targetSection` it belongs to: a 1-based activity
     *  number, or the activity's title. Without it, several items aimed at one section are
     *  spread one per activity body, which is usually what you want; with it, the media
     *  lands in exactly the card the tutor means. */
    targetActivity?: string | number;
    /** Magazine layout: "left"/"right" floats the media so body text wraps tightly around it;
     *  "center"/"full" render full-width blocks. "auto" (default) floats images/GIFs/audio and
     *  makes videos/embeds full width. */
    align?: 'auto' | 'left' | 'right' | 'center' | 'full';
    /** Width hint used when floating (images default to ~46%, audio players ~340px). */
    width?: 'sm' | 'md' | 'lg' | 'full';
}

export interface LessonSettings {
    lessonName?: string;
    unitNumber?: string;
    unitName?: string;
    autoUpdateCoursePlan?: boolean;
    nextClassDate?: string;
    lessonTimeRange?: string; // e.g. "45-60 minutes"
    materialLinks?: string;
    teacherNotes?: string;
    homeworkChecklist?: string;
    themeColor?: string;
    headerImage?: string; // URL for header background
    attachedFiles?: AttachedFileMeta[]; // NO BASE64 DATA HERE
    enableAccessibility?: boolean;
    enableCollaboration?: boolean;
    /**
     * Create the lesson's one-page **Lesson Cheat Sheet** (content map, words, grammar,
     * pronunciation and the questions to ask again).
     *
     * OFF by default: a lesson with no sheet is the normal case, and the sheet is a deliberate
     * teaching choice made in Lesson Creator → Step 2 · Customization & Lesson Structure.
     */
    lessonCheatSheet?: boolean;
    lessonImages?: LessonImage[];
    lessonVideos?: LessonVideo[];
    /** Unified media items added from the Lesson Settings “Add Media” studio (images, GIFs,
     *  YouTube/Vimeo/MP4, audio/podcasts/embeds). Takes precedence over legacy arrays. */
    lessonMedia?: LessonMediaItem[];
}

export interface AppCharacter {
    id: string;
    code: string; // e.g., 'male1', 'male2', 'maya_lin', 'leo_drake', etc.
    name: string;
    avatarUrl: string; // Real person avatar image URL
    avatarFallback?: string; // Inline SVG monogram used as the onError fallback for avatarUrl
    voice: string; // Unique Microsoft Azure voice for read-aloud
    personality: string; // Bio / personality description
    nationality: string; // e.g., 'American', 'British'
    gender?: 'male' | 'female' | 'child';
    catchphrases?: string; // Lines separated by Enter/newlines; can include $name
    role?: string;
    tone?: string;
    toneDescription?: string;
    bio?: string;
    initialFriendship?: number;
    signatureLines?: string[];
}

export interface Classmate {
    id: string;
    name: string;
    voice: string;
    nationality: string;
    placeOfLiving: string;
    facts: string;
    mood: string;
    job: string;
    focusedLanguage: string;
    roles: string[]; // 'helping my learner', 'my learner friend', 'enemy', 'lover', 'custom', etc.
    customRole?: string;
    avatarUrl?: string; // For realistic picture
}

export interface LearnerProfile {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    cefrLevel: string;
    l1Language: string;
    targetLanguage: string;
    translationLanguage?: string; // Optional override
    tutorVoice?: string;
    readAloudVoice?: string;
    enableTranslations?: boolean;
    personalInfo: {
        age: number;
        country: string;
        city?: string;
        occupation?: string;
        address?: string;
        gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
    };
    interests: string;
    situations?: string;
    focus?: string;
    facts: string[];
    learningChallenges: string[];
    needsAndExpectations: string;
    sessionHistory: Array<{
        date: string;
        summary: string;
        needsHelp: string[];
        corrections: string[];
        title?: string;
        headings?: string[];
        review?: {
            stars: number;
            liked: string;
            disliked: string;
            expectationsMetOptions: string[];
            /** Kept in step with `types2.ts` — see components/app2/profile/reviewSkills.ts. */
            skillRatings?: Partial<Record<'clarity' | 'progress' | 'preparation' | 'reassurance', number>>;
        };
    }>;
    coursePlan: {
        longTermGoals?: string[];
        shortTermGoals?: string[];
        targetLevel?: string;
        courseName?: string;
        classFrequency?: number;
        currentLesson?: number | string;
        totalSessions?: number | string;
        coursebookInfo?: any;
        features?: string[] | string;
        modules?: any[];
        [key: string]: any;
    };
    // Custom preferences for generation
    languageFocus?: string;
    commonMistakes?: string;
    examPrepDetails?: string;
    lessonPrefs?: string;
    lessonPlanPrefs?: string;
    homeworkPrefs?: string;
    quizPrefs?: string;
    
    currentLessonSettings?: LessonSettings;
    lastGeneratedAt?: string;
    lessonHistory?: Array<{
        title: string;
        date: string;
        headings: string[];
        completedHeadings?: string[];
        /** Detailed per-section Table of Contents (exact coverage) shown in the Learner Path log when present. */
        toc?: LessonTableOfContentsEntry[];
    }>;
    
    classmates?: Classmate[];
    manualGeneratorSettings?: {
        tone?: string;
        cefrLevel?: string;
        targetAudience?: string;
        details?: string;
        selectedActivities?: string[];
        readAloudVoice?: string;
        addL1Translation?: boolean;
    };
    // For compatibility with ProfileMapper
    rawProfile?: any;
    sessionAnalysis?: any[];
    syllabus?: any;
}

export interface PlatformProfile {
    id: string;
    name: string;
    description: string;
    specifications: {
        wordCount?: number;
        register: 'Formal' | 'Informal' | 'Neutral' | 'Academic' | 'Business';
        outputFormat: 'Markdown' | 'PlainText' | 'HTML';
        customInstructions: string;
        tone?: string;
        pov?: string;
        emojiIntensity?: string;
        maxTokens?: number;
        targetAudience?: string;
    };
    // Added for parity with Learner Profile
    examPrepDetails?: string;
    languageFocus?: string;
    commonMistakes?: string;
    lessonPrefs?: string;
    lessonPlanPrefs?: string;
    homeworkPrefs?: string;
    quizPrefs?: string;
    classFrequency?: number;
    country?: string;
    city?: string;
    classmates?: Classmate[];

    /* The platform's own ceiling: the same CEFR level + grammar-tier pair the
       individual profile picks in Step 2. These fields were missing from the type,
       which is why the dashboard tile showed "undefined • undefined" and the
       level was forgotten the moment you reloaded. */
    targetLevel?: string;
    targetLanguage?: string;
    cefrTier?: number;
    targetAudience?: string;
    topic?: string;
    /** Default read-aloud voice used for every lesson generated for this platform. */
    readAloudVoice?: string;

    lessonHistory?: Array<{ title: string; date: string; headings: string[]; completedHeadings?: string[] }>;
    currentLessonSettings?: LessonSettings;
}

export interface GroupClass {
    /** CEFR ceiling + grammar tier (1 · Easy / 2 · Medium / 3 · Advanced) for the class. */
    cefrLevel?: string;
    cefrTier?: number;
    id: string;
    name: string;
    targetLevel: string;
    l1Language: string;
    targetLanguage: string;
    enableTranslations?: boolean;
    requirements: string;
    learnerFacts: string;
    readAloudVoice?: string;
    
    // Added for parity with Learner Profile
    examPrepDetails?: string;
    languageFocus?: string;
    commonMistakes?: string;
    classFrequency?: number;
    country?: string;
    city?: string;
    classmates?: Classmate[];
    
    lessonPrefs?: string;
    lessonPlanPrefs?: string;
    homeworkPrefs?: string;
    quizPrefs?: string;
    
    currentLessonSettings?: LessonSettings;
    lessonHistory?: Array<{ title: string; date: string; headings: string[]; completedHeadings?: string[] }>;
    lastGeneratedAt?: string;
}

export interface TutorPlatformProfile {
    personalInformation: {
        name: string;
        email?: string;
        phone?: string;
        country: string;
        city?: string;
        occupation?: string;
        languages?: string[];
        gender?: string;
        interests?: string;
    };
    coursePlan: {
        level: string;
        targetLevel: string;
        courseName: string;
    };
    lastSessionRecap?: {
        date: string;
        lessonName: string;
        keyLearnings: string[];
        areasToImprove: string[];
    };
    facts?: string;
    learningChallenges?: string[];
    needsWantsAndExpectations: {
        needs: { name: string }[];
        expectations: string;
    };
}

export interface TutorProfile {
    name: string;
    interests: string;
    teachingMethod: string;
    bio: string;
    useForPersonalization: boolean;
    baseTotal?: number;
    historicalHoursTaught?: number;
    streakWarningDays?: string;
    backupReminderInterval?: string;
    notifyOnStreakFreeze?: boolean;
    notifyOnQuizSubmit?: boolean;
    notifyOnIdle?: boolean;
}

export interface OutlineNode {
    title: string;
    description: string;
}
