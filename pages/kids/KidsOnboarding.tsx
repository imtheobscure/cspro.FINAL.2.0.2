/* ════════════════════════════════════════════════════════════════════════════
   🌟 KIDS LEARNING KINGDOM — Hero Creation Onboarding Wizard
   ════════════════════════════════════════════════════════════════════════════
   A fully interactive, gamified, 6-step hero creation experience.
   The wizard is used by language teachers who screen-share during
   an interview session with a new kid learner and their parent.
   ════════════════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Learner, AvatarArchetype, PetType, ThemeType } from './types';

/* ─── Props ──────────────────────────────────────────────────────────────── */
interface KidsOnboardingProps {
  onComplete: (learner: Learner) => void;
  onCancel: () => void;
}

/* ─── Cat Mascot Reactions ──────────────────────────────────────────────── */
type CatMood = 'happy' | 'excited' | 'thinking' | 'proud' | 'surprised' | 'love' | 'scared';
const CAT_EMOJIS: Record<CatMood, string> = {
  happy:    '😺',
  excited:  '😸',
  love:     '😻',
  thinking: '😼',
  proud:    '😽',
  surprised:'🙀',
  scared:   '😿',
};
const CAT_COLORS: Record<CatMood, string> = {
  happy:    'from-yellow-300 to-amber-400',
  excited:  'from-pink-400 to-rose-500',
  love:     'from-red-400 to-pink-500',
  thinking: 'from-purple-400 to-indigo-500',
  proud:    'from-emerald-400 to-teal-500',
  surprised:'from-orange-400 to-amber-500',
  scared:   'from-blue-400 to-indigo-500',
};

/* ─── Placement Test Questions (English language) ────────────────────────── */
interface PlacementQuestion {
  id: string;
  text: string;
  emoji: string;
  options: { label: string; value: string; correct: boolean }[];
  level: 'A1' | 'A2' | 'B1';
  explanation: string;
}

const PLACEMENT_QUESTIONS: PlacementQuestion[] = [
  {
    id: 'pq1', level: 'A1', emoji: '🐶',
    text: 'What colour is the sky? 🌤️',
    options: [
      { label: 'Red 🔴', value: 'red', correct: false },
      { label: 'Blue 💙', value: 'blue', correct: true },
      { label: 'Green 💚', value: 'green', correct: false },
    ],
    explanation: 'The sky is blue! ☁️',
  },
  {
    id: 'pq2', level: 'A1', emoji: '🍎',
    text: 'Choose the correct sentence:',
    options: [
      { label: 'I am have a cat 🐱', value: 'a', correct: false },
      { label: 'I has a cat 🐱', value: 'b', correct: false },
      { label: 'I have a cat 🐱', value: 'c', correct: true },
    ],
    explanation: 'We say "I have" not "I am have" or "I has"!',
  },
  {
    id: 'pq3', level: 'A2', emoji: '⏰',
    text: 'What time do you usually eat breakfast?',
    options: [
      { label: 'In the morning 🌅', value: 'morning', correct: true },
      { label: 'At midnight 🌙', value: 'midnight', correct: false },
      { label: 'After dinner 🍽️', value: 'dinner', correct: false },
    ],
    explanation: 'Breakfast is eaten in the morning! 🌞',
  },
  {
    id: 'pq4', level: 'A2', emoji: '🏃',
    text: 'Complete: "She ___ to school every day."',
    options: [
      { label: 'go', value: 'go', correct: false },
      { label: 'goes', value: 'goes', correct: true },
      { label: 'going', value: 'going', correct: false },
    ],
    explanation: 'With "she/he/it" we add -s → "goes"! 📚',
  },
  {
    id: 'pq5', level: 'B1', emoji: '🎭',
    text: 'What does "curious" mean?',
    options: [
      { label: 'Angry 😠', value: 'angry', correct: false },
      { label: 'Wanting to know things 🔍', value: 'curious', correct: true },
      { label: 'Very fast ⚡', value: 'fast', correct: false },
    ],
    explanation: 'Curious means you want to learn and discover! 🧐',
  },
];

/* ─── Archetype Options ─────────────────────────────────────────────────────── */
const FEMALE_ARCHETYPES: { id: AvatarArchetype; emoji: string }[] = [
  { id: 'Fairy', emoji: '🧚‍♀️' },
  { id: 'Vampire', emoji: '🧛‍♀️' },
  { id: 'Mermaid', emoji: '🧜‍♀️' },
  { id: 'Genie', emoji: '🧞‍♀️' },
  { id: 'Zombie', emoji: '🧟‍♀️' },
  { id: 'Elf', emoji: '🧝‍♀️' },
  { id: 'Superhero', emoji: '🦸‍♀️' },
  { id: 'Supervillain', emoji: '🦹‍♀️' },
  { id: 'Mage', emoji: '🧙‍♀️' },
  { id: 'Baby', emoji: '👼' },
];

const MALE_ARCHETYPES: { id: AvatarArchetype; emoji: string }[] = [
  { id: 'Fairy', emoji: '🧚‍♂️' },
  { id: 'Vampire', emoji: '🧛‍♂️' },
  { id: 'Mermaid', emoji: '🧜‍♂️' },
  { id: 'Genie', emoji: '🧞‍♂️' },
  { id: 'Zombie', emoji: '🧟‍♂️' },
  { id: 'Elf', emoji: '🧝‍♂️' },
  { id: 'Superhero', emoji: '🦸‍♂️' },
  { id: 'Supervillain', emoji: '🦹‍♂️' },
  { id: 'Mage', emoji: '🧙‍♂️' },
  { id: 'Troll', emoji: '🧌' },
];

const PET_OPTIONS: { type: PetType; label: string; emoji: string }[] = [
  { type: 'Dog', label: 'Dog', emoji: '🐶' },
  { type: 'Cat', label: 'Cat', emoji: '🐱' },
  { type: 'Bird', label: 'Bird', emoji: '🐦' },
  { type: 'Fish', label: 'Fish', emoji: '🐟' },
  { type: 'Lizard', label: 'Lizard', emoji: '🦎' },
  { type: 'Snake', label: 'Snake', emoji: '🐍' },
  { type: 'Turtle', label: 'Turtle', emoji: '🐢' },
];

/* ─── Hobbies & Interests ────────────────────────────────────────────────── */
const HOBBY_OPTIONS = [
  { label: 'Drawing & Art', emoji: '🎨' },
  { label: 'Music & Singing', emoji: '🎵' },
  { label: 'Sports & Running', emoji: '⚽' },
  { label: 'Animals & Pets', emoji: '🐾' },
  { label: 'Reading Stories', emoji: '📚' },
  { label: 'Science & Experiments', emoji: '🔬' },
  { label: 'Dancing', emoji: '💃' },
  { label: 'Video Games', emoji: '🎮' },
  { label: 'Cooking & Baking', emoji: '🍪' },
  { label: 'Space & Planets', emoji: '🪐' },
  { label: 'Dinosaurs', emoji: '🦕' },
  { label: 'Superheroes', emoji: '🦸' },
  { label: 'Fairy Tales', emoji: '🧚' },
  { label: 'Robots & Tech', emoji: '🤖' },
  { label: 'Ocean & Sea Life', emoji: '🐬' },
];

/* ─── Learning Style Cards ──────────────────────────────────────────────── */
const LEARNING_STYLES = [
  { id: 'Visual', label: 'I love pictures & videos!', emoji: '👁️', desc: 'Charts, colours, and images' },
  { id: 'Auditory', label: 'I love listening & music!', emoji: '👂', desc: 'Songs, speaking, and sounds' },
  { id: 'Kinesthetic', label: 'I love doing things!', emoji: '🙌', desc: 'Games, movement, and activities' },
  { id: 'Reading', label: 'I love reading & writing!', emoji: '📖', desc: 'Books, notes, and stories' },
];

/* ─── Parent Expectation Options ─────────────────────────────────────────── */
const PARENT_EXPECTATION_OPTIONS = [
  { id: 'fun', label: 'Fun & Engaging Lessons', emoji: '🎉' },
  { id: 'homework', label: 'Regular Homework Practice', emoji: '📝' },
  { id: 'pronunciation', label: 'Pronunciation Focus', emoji: '🗣️' },
  { id: 'grammar', label: 'Grammar & Structure', emoji: '📐' },
  { id: 'vocabulary', label: 'Vocabulary Building', emoji: '📚' },
  { id: 'speaking', label: 'Confidence in Speaking', emoji: '💬' },
  { id: 'reading', label: 'Reading Skills', emoji: '👀' },
  { id: 'writing', label: 'Writing Skills', emoji: '✍️' },
  { id: 'exam', label: 'Exam Preparation', emoji: '🎯' },
  { id: 'stories', label: 'Storytelling & Creativity', emoji: '🌟' },
];



/* Sound Synthesis Utility for Kid profiles */
const useKidSound = () => {
  const [muted, setMuted] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!ctxRef.current && typeof window !== 'undefined') {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return ctxRef.current;
  };

  const playTone = (freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.08) => {
    const ctx = initAudio();
    if (!ctx || muted) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch { /* ignore */ }
  };

  const play = (kind: 'click' | 'success' | 'levelUp' | 'cardFlip') => {
    if (kind === 'click') playTone(600, 0.08, 'triangle', 0.04);
    if (kind === 'cardFlip') playTone(400, 0.1, 'sine', 0.05);
    if (kind === 'success') {
      playTone(523, 0.1);
      setTimeout(() => playTone(659, 0.1), 100);
      setTimeout(() => playTone(784, 0.15), 200);
    }
    if (kind === 'levelUp') {
      playTone(440, 0.1);
      setTimeout(() => playTone(554, 0.1), 100);
      setTimeout(() => playTone(659, 0.1), 200);
      setTimeout(() => playTone(880, 0.35), 300);
    }
  };

  return { play, muted, toggleMute: () => setMuted(!muted) };
};

/* ─── CEFR calculation from placement score ──────────────────────────────── */
const scoreToCEFR = (score: number): 'A1' | 'A2' | 'B1' | 'B2' => {
  if (score <= 1) return 'A1';
  if (score <= 2) return 'A1';
  if (score <= 3) return 'A2';
  if (score <= 4) return 'B1';
  return 'B1';
};

/* ─── Confetti burst ─────────────────────────────────────────────────────── */
const ConfettiBlast: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#01a3a4', '#ff9f43'];
  return (
    <div className="fixed inset-0 pointer-events-none z-[90] overflow-hidden">
      {Array.from({ length: 80 }, (_, i) => (
        <motion.div
          key={i} className="absolute w-4 h-4"
          style={{
            left: `${Math.random() * 100}%`, top: '-5%',
            backgroundColor: colors[i % colors.length],
            borderRadius: Math.random() > 0.5 ? '50%' : '3px',
          }}
          animate={{
            y: ['0vh', `${100 + Math.random() * 30}vh`],
            x: [0, (Math.random() - 0.5) * 300],
            rotate: [0, Math.random() * 720],
            opacity: [1, 1, 0],
          }}
          transition={{ duration: 2.5 + Math.random() * 2, ease: 'easeIn', delay: Math.random() * 0.8 }}
        />
      ))}
    </div>
  );
};

/* ─── Mascot Cat bubble ──────────────────────────────────────────────────── */
interface MascotProps { mood: CatMood; speech: string; name?: string }
const Mascot: React.FC<MascotProps> = ({ mood, speech, name = 'Whiskers' }) => (
  <motion.div
    initial={{ opacity: 0, x: -30 }}
    animate={{ opacity: 1, x: 0 }}
    key={speech}
    className="flex items-end gap-4 mb-8"
  >
    {/* Cat emoji */}
    <motion.div
      animate={{
        rotate: [0, -5, 5, -5, 0],
        scale: [1, 1.05, 1, 1.05, 1],
      }}
      transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
      className={`w-24 h-24 rounded-full bg-gradient-to-br ${CAT_COLORS[mood]} flex items-center justify-center text-5xl shadow-2xl shrink-0 border-4 border-white`}
    >
      {CAT_EMOJIS[mood]}
    </motion.div>

    {/* Speech bubble */}
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="relative bg-white rounded-[2rem] rounded-bl-none p-5 shadow-xl border-2 border-indigo-100 flex-1 max-w-lg"
    >
      <p className="font-black text-indigo-900 text-base md:text-lg leading-snug">{speech}</p>
      <div className="absolute -bottom-3 left-4 w-6 h-6 bg-white border-r-2 border-b-2 border-indigo-100 rotate-45" />
      <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest">{name} the magical cat 🐾</p>
    </motion.div>
  </motion.div>
);

/* ─── Animated XP Bar ─────────────────────────────────────────────────────── */
const XPBar: React.FC<{ score: number; total: number }> = ({ score, total }) => (
  <div className="flex items-center gap-3 mb-2">
    <span className="text-2xl">⚡</span>
    <div className="flex-1 bg-indigo-100 rounded-full h-4 overflow-hidden border border-indigo-200">
      <motion.div
        className="h-full bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${total > 0 ? (score / total) * 100 : 0}%` }}
        transition={{ duration: 0.6 }}
      />
    </div>
    <span className="font-black text-indigo-700 text-sm">{score * 20}/{total * 20} XP</span>
  </div>
);

/* ─── Step progress indicator ─────────────────────────────────────────────── */
const StepDots: React.FC<{ current: number; total: number; theme: ThemeType }> = ({ current, total, theme }) => {
  const btnGradient = theme === 'space' ? 'from-indigo-600 to-slate-800' : 'from-pink-500 to-purple-600';
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <motion.div
          key={i}
          animate={{ scale: i + 1 === current ? 1.4 : 1 }}
          className={`rounded-full transition-all ${
            i + 1 < current ? 'w-5 h-5 bg-green-500' :
            i + 1 === current ? `w-6 h-6 bg-gradient-to-r ${btnGradient} shadow-lg` :
            'w-4 h-4 bg-gray-200'
          }`}
        >
          {i + 1 < current && <span className="flex items-center justify-center w-full h-full text-[9px] text-white font-black">✓</span>}
        </motion.div>
      ))}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */
const DRAFT_KEY = 'kids_onboarding_draft';
const TOTAL_STEPS = 6;

const KidsOnboarding: React.FC<KidsOnboardingProps> = ({ onComplete, onCancel }) => {
  /* ── State ── */
  const [step, setStep] = useState(1);
  const [showConfetti, setShowConfetti] = useState(false);

  /* ── Form state ── */
  const [heroTheme, setHeroTheme] = useState<'fairy' | 'space'>('fairy'); // Light / Dark Toggle
  const [heroName, setHeroName] = useState('');
  const [heroAge, setHeroAge] = useState(7);
  const [heroGender, setHeroGender] = useState<'Male' | 'Female' | 'PreferNotToSay'>('PreferNotToSay');
  const [heroArchetype, setHeroArchetype] = useState<AvatarArchetype>('Fairy');
  const [heroPet, setHeroPet] = useState<PetType>('Cat');
  const [heroAvatar, setHeroAvatar] = useState('🧚');
  const [heroCountry, setHeroCountry] = useState('');
  const [heroCity, setHeroCity] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [nativeLang, setNativeLang] = useState('Spanish');
  const [targetLang, setTargetLang] = useState('English');
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const [learningStyle, setLearningStyle] = useState<string>('');
  const [sessionFreq] = useState('2x');
  const [parentExpectations, setParentExpectations] = useState<string[]>([]);
  const [tutorStyles] = useState<string[]>([]);

  // Teacher Custom Fields
  const [customText, setCustomText] = useState('');
  const [customEmoji, setCustomEmoji] = useState('🌟');

  /* ── Placement test state ── */
  const [placementAnswers, setPlacementAnswers] = useState<Record<string, string>>({});
  const [placementRevealed, setPlacementRevealed] = useState<Record<string, boolean>>({});
  const [placementScore, setPlacementScore] = useState(0);
  const [placementDone, setPlacementDone] = useState(false);

  // Background control helpers (Correct shade darkening or wrong lightening)
  const [bgLightness, setBgLightness] = useState<number>(100);

  const { play } = useKidSound();

  /* ── Draft restore/save ── */
  useEffect(() => {
    try {
      const d = localStorage.getItem(DRAFT_KEY);
      if (d) {
        const p = JSON.parse(d);
        if (p.heroName) {
          setHeroName(p.heroName);
          setHeroAge(p.heroAge || 7);
          setHeroCountry(p.heroCountry || '');
          setHeroCity(p.city || '');
          setHeroGender(p.heroGender || 'PreferNotToSay');
          setHeroTheme(p.heroTheme || 'fairy');
          setNativeLang(p.nativeLang || 'Spanish');
          setTargetLang(p.targetLang || 'English');
          setSelectedHobbies(p.selectedHobbies || []);
          setLearningStyle(p.learningStyle || '');
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const draft = { heroName, heroAge, heroCountry, heroCity, heroGender, heroTheme, nativeLang, targetLang, selectedHobbies, learningStyle };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [heroName, heroAge, heroCountry, heroCity, heroGender, heroTheme, nativeLang, targetLang, selectedHobbies, learningStyle]);

  /* ── Mascot speeches per step ── */
  const getMascotSpeech = useCallback((): { mood: CatMood; speech: string } => {
    const heroDisplay = heroName || 'young hero';
    switch (step) {
      case 1: return { mood: 'happy',    speech: `Purrrr! 🐾 Welcome to the Hero Creation Academy! Let's build the profile for our new hero. Teacher — please ask these questions while screen-sharing! 🎓` };
      case 2: return { mood: 'excited',  speech: `Amazing! Now let's do a quick English adventure mini-test for ${heroDisplay}! 🌟 Don't worry — it's super fun and there are no wrong answers, just discoveries! Purrrr!` };
      case 3: return { mood: 'love',     speech: `I LOVE this part! 😻 Tell me ALL about ${heroDisplay}'s favourite things! The more I know, the better lessons I can make just for them! Meow!` };
      case 4: return { mood: 'thinking', speech: `Hmmmm 🤔 Every hero learns differently! Let's find out how ${heroDisplay} loves to learn and how often they want to practice! This is SO important!` };
      case 5: return { mood: 'proud',    speech: `This section is for the PARENTS! 👨‍👩‍👧 Dear parent, please tell me what YOU hope ${heroDisplay} will achieve. Your input makes all the difference! 💪` };
      case 6: return { mood: 'excited',  speech: `MEOW-TASTIC!! The hero profile for ${heroDisplay} is COMPLETE! They are ready to embark on their English adventure! Let's celebrate! 🎉🎈` };
      default: return { mood: 'happy', speech: 'Purrrr! Let\'s go!' };
    }
  }, [step, heroName]);

  const mascot = getMascotSpeech();

  /* ── Placement answer handler with background shading ── */
  const handlePlacementAnswer = (questionId: string, value: string, correct: boolean) => {
    if (placementRevealed[questionId]) return; // already answered
    setPlacementAnswers(prev => ({ ...prev, [questionId]: value }));
    setPlacementRevealed(prev => ({ ...prev, [questionId]: true }));
    if (correct) {
      setPlacementScore(prev => prev + 1);
      setBgLightness(l => Math.max(l - 15, 60)); // Darker
    } else {
      setBgLightness(l => Math.min(l + 15, 140)); // Lighter
    }
  };

  /* ── Check placement done ── */
  useEffect(() => {
    if (Object.keys(placementRevealed).length === PLACEMENT_QUESTIONS.length) {
      setPlacementDone(true);
    }
  }, [placementRevealed]);

  /* ── Toggle multi-select helpers ── */
  const toggleHobby = (hobby: string) => setSelectedHobbies(prev => prev.includes(hobby) ? prev.filter(h => h !== hobby) : [...prev, hobby]);
  const toggleExpectation = (id: string) => setParentExpectations(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);


  /* ── Navigation ── */
  const canGoNext = (): boolean => {
    if (step === 1) return heroName.trim().length > 0 && heroCountry.trim().length > 0;
    if (step === 2) return placementDone;
    if (step === 3) return selectedHobbies.length > 0;
    if (step === 4) return learningStyle.length > 0;
    if (step === 5) return parentExpectations.length > 0;
    return true;
  };

  const handleNext = () => {
    if (!canGoNext()) return;
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handlePrev = () => {
    setStep(s => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── Final submission ── */
  const handleSubmit = () => {
    const cefrLevel = scoreToCEFR(placementScore);
    const now = new Date().toISOString().split('T')[0];
    const newLearner: Learner = {
      id: `hero-${Date.now()}`,
      name: heroName.trim() || 'New Hero',
      age: heroAge,
      xp: 50 + placementScore * 20,
      petXp: 0,
      streak: 0,
      totalSessions: 0,
      totalMinutes: 0,
      coins: 100,
      level: 1,
      avatar: heroGender === 'Female' ? '🧚‍♀️' : '🦸‍♂️',
      theme: heroTheme,
      joinDate: now,
      lastActive: now,
      skills: { pronunciation: 20, vocabulary: 20 + placementScore * 10, grammar: 20, speaking: 20, listening: 20, reading: 20 + placementScore * 10, writing: 20 },
      achievements: ['first-steps'],
      badges: [],
      completedQuests: [],
      currentQuests: ['placement-quest'],
      purchasedRewards: [],
      parentNotes: [parentName ? `Parent: ${parentName}` : ''],
      dailyXP: [50],
      favoriteSubject: selectedHobbies[0] || 'English',
      mood: 'excited',
      country: heroCountry.trim(),
      city: heroCity.trim(),
      status: 'active',
      tags: ['New Hero', `CEFR ${cefrLevel}`],
      nativeLang: nativeLang,
      targetLang: targetLang,
      contactEmail: parentEmail.trim(),
      interests: selectedHobbies,
      expectations: tutorStyles.includes('strict') ? 'Strict' : tutorStyles.includes('conversational') ? 'Conversational' : 'Gamified',
      targetCEFR: cefrLevel,
      coursePlan: ['Introduction to English', `${heroName.trim()}'s First Lesson`, 'Alphabet & Phonics Quest'],
      lessonHistory: [],
      flashcards: [],
      feedbackLog: [],
      dripToggles: { welcome: true, weeklyReminder: true },
      attack: 40 + placementScore * 5,
      defense: 40 + placementScore * 5,
      avatarArchetype: heroArchetype,
      petType: heroPet,
      landItems: [
        { id: 'item1', emoji: '🌲', name: 'Magic Pine', row: 1, col: 2 },
      ],
      dialogueText: "Ready for our adventure!",
      parentName: parentName.trim(),
      parentPhone: parentPhone.trim(),
      gender: heroGender,
      spokenLanguages: [nativeLang],
      hobbies: selectedHobbies,
      learningStyle: learningStyle as any,
      placementScore,
      sessionFrequency: sessionFreq,
      parentExpectations,
    };

    setShowConfetti(true);
    localStorage.removeItem(DRAFT_KEY);
    setTimeout(() => {
      setShowConfetti(false);
      onComplete(newLearner);
    }, 3500);
  };

  /* ── Dynamic Background Emojis Generator based on Onboarding selections ── */
  const dynamicBackgroundEmojis = useMemo(() => {
    const list: string[] = [];

    // 1. Age (small-to-big emojis)
    if (heroAge > 0) {
      const ageEmojis = ['👶', '🍼', '🎈', '🎒', '🧩', '🦖', '🚀', '⚽', '🎨', '📖'];
      for (let i = 0; i < Math.min(heroAge, ageEmojis.length); i++) {
        list.push(ageEmojis[i]);
      }
    }

    // 2. Character Archetype Emojis
    if (heroArchetype) {
      const matchingArchetype = (heroGender === 'Female' ? FEMALE_ARCHETYPES : MALE_ARCHETYPES).find(a => a.id === heroArchetype);
      if (matchingArchetype) {
        list.push(matchingArchetype.emoji, matchingArchetype.emoji, matchingArchetype.emoji);
      }
    }

    // 3. Companion Pet Emojis
    if (heroPet) {
      const matchingPet = PET_OPTIONS.find(p => p.type === heroPet);
      if (matchingPet) {
        list.push(matchingPet.emoji, matchingPet.emoji);
      }
    }

    // 4. Custom Hobbies Emojis
    selectedHobbies.forEach(h => {
      const match = HOBBY_OPTIONS.find(o => o.label === h);
      if (match) list.push(match.emoji);
    });

    // 5. Custom teacher emoji input
    if (customEmoji) {
      list.push(customEmoji);
    }

    // 6. Learning Style Emojis
    if (learningStyle) {
      const styleMatch = LEARNING_STYLES.find(s => s.id === learningStyle);
      if (styleMatch) list.push(styleMatch.emoji);
    }

    // 7. Level achievements in the background (if complete)
    if (placementDone) {
      list.push('🏆', '📜', scoreToCEFR(placementScore));
    }

    return list;
  }, [heroAge, heroArchetype, heroGender, heroPet, selectedHobbies, customEmoji, learningStyle, placementDone, placementScore]);

  /* ── Avatar list based on gender ── */
  const avatarList = heroGender === 'Female' ? FEMALE_ARCHETYPES : MALE_ARCHETYPES;

  /* ── Theme gradient logic (Pink theme for Female, Blue theme for Male) ── */
  const genderGradient = heroGender === 'Female'
    ? 'from-pink-100 via-rose-50 to-pink-100'
    : heroGender === 'Male'
    ? 'from-blue-100 via-indigo-50 to-blue-100'
    : 'from-gray-100 via-slate-50 to-gray-100';

  const textColor = heroTheme === 'space' ? 'text-white' : 'text-indigo-950';
  const subColor = heroTheme === 'space' ? 'text-indigo-200' : 'text-gray-500';
  const cardBg = heroTheme === 'space' ? 'bg-slate-900/90 border-indigo-500/30' : 'bg-white/70 border-white/60';
  const btnGradient = heroTheme === 'space' ? 'from-indigo-600 to-slate-800' : 'from-pink-500 to-purple-600';

  return (
    <div
      style={{ filter: `brightness(${bgLightness}%)` }}
      className={`min-h-screen relative overflow-x-hidden bg-gradient-to-b ${genderGradient} font-kids pb-24 transition-all duration-500`}
    >
      {/* Dynamic Background Emojis Storyboard */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
        {dynamicBackgroundEmojis.map((em, i) => (
          <motion.span
            key={i}
            className="absolute text-7xl opacity-20 filter blur-[0.5px]"
            style={{
              left: `${(i * 12 + 10) % 90}%`,
              top: `${(i * 19 + 5) % 90}%`,
              fontSize: `${60 + (i * 8)}px` // small-to-big age emojis etc
            }}
            animate={{
              y: [0, -15, 0],
              rotate: [0, 8, -8, 0],
            }}
            transition={{ duration: 5 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            {em}
          </motion.span>
        ))}

        {/* Display Country Name in background */}
        {heroCountry && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 select-none font-black text-6xl md:text-9xl text-indigo-950">
            {heroCountry.toUpperCase()}
          </div>
        )}
      </div>

      <ConfettiBlast active={showConfetti} />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <motion.span className="text-6xl drop-shadow-xl" animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 3 }}>
              👑
            </motion.span>
            <div>
              <h1 className={`text-3xl md:text-4xl font-black ${textColor}`}>Hero Academy Wizard</h1>
              <p className={`text-sm font-bold ${subColor} mt-1`}>Step {step} of {TOTAL_STEPS} • Character Calibration</p>
            </div>
          </div>

          {/* Theme Selector (Superhero Light vs Supervillain Dark) */}
          <div className="flex gap-2 justify-center mt-4">
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { play('click'); setHeroTheme('fairy'); }}
              className={`px-5 py-2.5 rounded-2xl text-xs font-black border-2 cursor-pointer transition-all ${
                heroTheme === 'fairy'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-transparent shadow-lg'
                  : 'bg-white/60 text-gray-700 border-white/50'
              }`}
            >
              ☀️ Light Theme (Superhero)
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { play('click'); setHeroTheme('space'); }}
              className={`px-5 py-2.5 rounded-2xl text-xs font-black border-2 cursor-pointer transition-all ${
                heroTheme === 'space'
                  ? 'bg-gradient-to-r from-indigo-950 to-slate-900 text-white border-transparent shadow-lg'
                  : 'bg-white/60 text-gray-700 border-white/50'
              }`}
            >
              🌙 Dark Theme (Supervillain)
            </motion.button>
          </div>
        </motion.div>

        {/* Step progress dots */}
        <StepDots current={step} total={TOTAL_STEPS} theme={heroTheme} />

        {/* XP Progress bar */}
        {step > 1 && <XPBar score={placementScore} total={PLACEMENT_QUESTIONS.length} />}

        {/* Mascot Whiskers */}
        <Mascot mood={mascot.mood} speech={mascot.speech} />

        {/* ─── STEP CONTENT ─── */}
        <AnimatePresence mode="wait">
          {/* STEP 1: Personal Info & Identity */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="space-y-6">
              <div className={`${cardBg} backdrop-blur-xl rounded-[2.5rem] p-6 border-4 shadow-2xl space-y-6`}>
                <h2 className={`text-2xl font-black ${textColor} flex items-center gap-3`}>🦸 Name Your Hero!</h2>

                {/* Hero Name */}
                <div>
                  <label className={`block text-sm font-black ${subColor} mb-2 uppercase tracking-wider`}>Hero Name *</label>
                  <input
                    value={heroName}
                    onChange={e => setHeroName(e.target.value)}
                    placeholder="E.g. Luna Starlight ✨"
                    className="w-full px-5 py-4 text-xl font-black rounded-2xl border-3 border-indigo-200 bg-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all"
                  />
                </div>

                {/* Age & Gender */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-black ${subColor} mb-2 uppercase tracking-wider`}>Age 🎂 (Adds background elements!)</label>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setHeroAge(a => Math.max(4, a - 1))} className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 font-black text-2xl flex items-center justify-center hover:bg-indigo-200 cursor-pointer">−</button>
                      <span className={`text-4xl font-black ${textColor} w-12 text-center`}>{heroAge}</span>
                      <button onClick={() => setHeroAge(a => Math.min(14, a + 1))} className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 font-black text-2xl flex items-center justify-center hover:bg-indigo-200 cursor-pointer">+</button>
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-black ${subColor} mb-2 uppercase tracking-wider`}>Gender 👤 (Tints background!)</label>
                    <div className="flex gap-2">
                      {[{ v: 'Female' as const, e: '👧 Pink' }, { v: 'Male' as const, e: '👦 Blue' }, { v: 'PreferNotToSay' as const, e: '🌟 Neutral' }].map(({ v, e }) => (
                        <button
                          key={v} onClick={() => { setHeroGender(v); setHeroAvatar(v === 'Female' ? '🧚‍♀️' : '🦸‍♂️'); }}
                          className={`flex-1 py-3 rounded-2xl text-xs font-black border-2 cursor-pointer transition-all ${heroGender === v ? 'bg-indigo-500 text-white border-indigo-400 shadow' : 'bg-white/60 border-gray-200'}`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Character Archetype Selector with Emojis */}
                <div>
                  <label className={`block text-sm font-black ${subColor} mb-3 uppercase tracking-wider`}>Pick Character Archetype! {heroAvatar}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {avatarList.map((av) => (
                      <motion.button
                        key={av.id} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                        onClick={() => { setHeroArchetype(av.id); setHeroAvatar(av.emoji); }}
                        className={`py-3 rounded-2xl border-3 cursor-pointer transition-all flex flex-col items-center gap-1 ${heroArchetype === av.id ? 'bg-indigo-500 border-indigo-400 text-white shadow-xl scale-110' : 'bg-white/60 border-transparent hover:border-indigo-200 text-indigo-950'}`}
                      >
                        <span className="text-3xl">{av.emoji}</span>
                        <span className="text-[10px] font-black">{av.id}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Starting Companion Pet */}
                <div>
                  <label className={`block text-sm font-black ${subColor} mb-3 uppercase tracking-wider`}>Pick Starting Companion Pet! {heroPet}</label>
                  <div className="grid grid-cols-4 gap-3">
                    {PET_OPTIONS.map((pet) => (
                      <motion.button
                        key={pet.type} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => setHeroPet(pet.type)}
                        className={`py-3 rounded-2xl border-3 cursor-pointer transition-all flex flex-col items-center gap-1 ${heroPet === pet.type ? 'bg-indigo-500 text-white border-indigo-400 shadow-xl scale-110' : 'bg-white/60 border-transparent text-indigo-950 hover:border-indigo-200'}`}
                      >
                        <span className="text-3xl">{pet.emoji}</span>
                        <span className="text-[10px] font-black">{pet.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-black ${subColor} mb-2 uppercase tracking-wider`}>Country 🌍 *</label>
                    <input
                      value={heroCountry}
                      onChange={e => setHeroCountry(e.target.value)}
                      placeholder="Mexico, Spain, Brazil..."
                      className="w-full px-4 py-3 font-bold rounded-2xl border-2 border-indigo-200 bg-white outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-black ${subColor} mb-2 uppercase tracking-wider`}>City 🏙️</label>
                    <input
                      value={heroCity}
                      onChange={e => setHeroCity(e.target.value)}
                      placeholder="Mexico City, Madrid..."
                      className="w-full px-4 py-3 font-bold rounded-2xl border-2 border-indigo-200 bg-white outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>

                {/* Parent Contact Details */}
                <div className="grid grid-cols-1 gap-4 pt-4 border-t border-gray-100">
                  <h3 className={`text-base font-black ${textColor} flex items-center gap-2`}>👨‍👩‍👧 Parent Contact & Expectations</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <input value={parentName} onChange={e => setParentName(e.target.value)} placeholder="Parent Name" className="px-4 py-3 font-bold rounded-2xl border-2 border-indigo-200 bg-white outline-none" />
                    <input value={parentPhone} onChange={e => setParentPhone(e.target.value)} placeholder="WhatsApp 📱" className="px-4 py-3 font-bold rounded-2xl border-2 border-indigo-200 bg-white outline-none" />
                  </div>
                  <input value={parentEmail} onChange={e => setParentEmail(e.target.value)} placeholder="Parent Email 📧" type="email" className="w-full px-4 py-3 font-bold rounded-2xl border-2 border-indigo-200 bg-white outline-none" />
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Placement test questions */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="space-y-5">
              <div className={`${cardBg} backdrop-blur-xl rounded-[2.5rem] p-6 border-4 shadow-2xl`}>
                <h2 className={`text-2xl font-black ${textColor} flex items-center gap-3 mb-2`}>⚔️ English Mini Adventure Test!</h2>
                <p className={`text-sm font-bold ${subColor} mb-6`}>Answer questions to power up your English skills! Correct answers darken background shading, wrong answers lighten it!</p>

                <div className="space-y-6">
                  {PLACEMENT_QUESTIONS.map((q) => (
                    <motion.div
                      key={q.id}
                      className={`p-5 rounded-2xl border-2 ${heroTheme === 'space' ? 'bg-slate-700/60 border-indigo-500/30' : 'bg-indigo-50/60 border-indigo-100'}`}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-3xl">{q.emoji}</span>
                        <div>
                          <span className={`text-[10px] font-black uppercase ${subColor} bg-white/50 px-2 py-0.5 rounded-full`}>Level {q.level}</span>
                          <p className={`font-black text-base mt-1 ${textColor}`}>{q.text}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {q.options.map((opt) => {
                          const isAnswered = !!placementRevealed[q.id];
                          const isSelected = placementAnswers[q.id] === opt.value;
                          const isCorrect = opt.correct;
                          let bg = 'bg-white/80 border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 cursor-pointer';
                          if (isAnswered) {
                            if (isCorrect) bg = 'bg-green-100 border-green-400';
                            else if (isSelected && !isCorrect) bg = 'bg-red-100 border-red-400';
                            else bg = 'bg-white/50 border-gray-200';
                          }
                          return (
                            <button
                              key={opt.value}
                              onClick={() => handlePlacementAnswer(q.id, opt.value, opt.correct)}
                              className={`w-full text-left px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all ${bg} ${!isAnswered ? 'cursor-pointer' : 'cursor-default'}`}
                            >
                              <span className="flex items-center gap-3 text-indigo-950">
                                {isAnswered && isCorrect && <span className="text-green-600 text-lg">✅</span>}
                                {isAnswered && isSelected && !isCorrect && <span className="text-red-600 text-lg">❌</span>}
                                {opt.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Hobbies & Custom Interests */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="space-y-6">
              <div className={`${cardBg} backdrop-blur-xl rounded-[2.5rem] p-6 border-4 shadow-2xl`}>
                <h2 className={`text-2xl font-black ${textColor} flex items-center gap-3 mb-2`}>💖 What Does {heroName || 'the hero'} LOVE?</h2>
                <p className={`text-sm font-bold ${subColor} mb-6`}>Pick some topics! They populate the dynamic profile background in real-time. 🌟</p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {HOBBY_OPTIONS.map((h) => {
                    const isSelected = selectedHobbies.includes(h.label);
                    return (
                      <motion.button
                        key={h.label} whileHover={{ scale: 1.06, y: -3 }} whileTap={{ scale: 0.95 }}
                        onClick={() => toggleHobby(h.label)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-transparent shadow-xl'
                            : 'bg-white/70 border-gray-200 hover:border-indigo-300 text-indigo-950'
                        }`}
                      >
                        <span className="text-4xl">{h.emoji}</span>
                        <span className="text-xs font-black text-center leading-tight">{h.label}</span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Teacher Custom Text & Emoji Field */}
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <h3 className={`text-sm font-black ${textColor}`}>🛠️ Teacher Custom Hobby Element</h3>
                  <div className="flex gap-2">
                    <input
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      placeholder="Add custom topic label..."
                      className="flex-grow p-3 rounded-xl border border-indigo-100 bg-white font-bold text-xs text-indigo-950"
                    />
                    <select
                      value={customEmoji}
                      onChange={(e) => setCustomEmoji(e.target.value)}
                      className="p-3 rounded-xl border border-indigo-100 bg-white font-bold text-xs"
                    >
                      {['🌟', '🐲', '🧙‍♀️', '🦸‍♂️', '🍭', '🍕', '🚗', '🎸', '⚽', '🍦'].map(em => (
                        <option key={em} value={em}>{em}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        if (customText.trim()) {
                          toggleHobby(customText);
                          setCustomText('');
                        }
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black cursor-pointer"
                    >
                      Add Custom
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Learning Style preferences */}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="space-y-6">
              <div className={`${cardBg} backdrop-blur-xl rounded-[2.5rem] p-6 border-4 shadow-2xl`}>
                <h2 className={`text-2xl font-black ${textColor} flex items-center gap-3 mb-2`}>🧠 How Does {heroName || 'the hero'} Learn Best?</h2>
                <p className={`text-sm font-bold ${subColor} mb-5`}>Selecting adds the style emoji to the classroom background! *</p>
                <div className="grid grid-cols-2 gap-4">
                  {LEARNING_STYLES.map((ls) => {
                    const isSelected = learningStyle === ls.id;
                    return (
                      <motion.button
                        key={ls.id} whileHover={{ scale: 1.04, y: -3 }} whileTap={{ scale: 0.96 }}
                        onClick={() => setLearningStyle(ls.id)}
                        className={`p-5 rounded-2xl border-3 cursor-pointer transition-all flex flex-col items-center gap-3 text-center ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-transparent shadow-xl'
                            : 'bg-white/70 border-gray-200 hover:border-indigo-300 text-indigo-950'
                        }`}
                      >
                        <span className="text-5xl">{ls.emoji}</span>
                        <span className="text-sm font-black">{ls.label}</span>
                        <span className="text-[11px] font-bold">{ls.desc}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 5: Parent expectation card */}
          {step === 5 && (
            <motion.div key="step5" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="space-y-6">
              <div className={`${cardBg} backdrop-blur-xl rounded-[2.5rem] p-6 border-4 shadow-2xl`}>
                <h2 className={`text-2xl font-black ${textColor} flex items-center gap-3 mb-2`}>🎯 What Are Your Goals for {heroName || 'your child'}?</h2>
                <p className={`text-sm font-bold ${subColor} mb-5`}>Select what you hope they achieve! *</p>
                <div className="grid grid-cols-2 gap-3">
                  {PARENT_EXPECTATION_OPTIONS.map((e) => {
                    const isSelected = parentExpectations.includes(e.id);
                    return (
                      <motion.button
                        key={e.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => toggleExpectation(e.id)}
                        className={`flex items-center gap-3 p-4 rounded-2xl border-3 cursor-pointer transition-all text-left ${
                          isSelected
                            ? 'bg-amber-500 text-white border-transparent shadow-lg'
                            : 'bg-white/70 border-gray-200 hover:border-amber-300 text-indigo-950'
                        }`}
                      >
                        <span className="text-3xl">{e.emoji}</span>
                        <span className="text-xs font-black flex-1">{e.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 6: Summary reviewed */}
          {step === 6 && (
            <motion.div key="step6" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="space-y-6">
              <div className={`${cardBg} backdrop-blur-xl rounded-[2.5rem] p-8 border-4 shadow-2xl text-center`}>
                <div className="text-8xl mb-4">{heroAvatar}</div>
                <h2 className={`text-4xl font-black ${textColor} mb-1`}>{heroName || 'New Hero'}</h2>
                <p className={`text-lg font-bold ${subColor} mb-6`}>👑 Level: {scoreToCEFR(placementScore)} • Companion: {heroPet}</p>

                <div className="grid grid-cols-2 gap-4 text-left mb-6">
                  {[
                    { icon: '🌍', label: 'Country', value: `${heroCity ? heroCity + ', ' : ''}${heroCountry}` },
                    { icon: '🗣️', label: 'Native Language', value: nativeLang },
                    { icon: '🎯', label: 'Learning', value: targetLang },
                    { icon: '⚡', label: 'Placement Score', value: `${placementScore} / 5` },
                    { icon: '🧠', label: 'Learning Style', value: learningStyle || '—' },
                    { icon: '🏆', label: 'CEFR Target', value: scoreToCEFR(placementScore) },
                  ].map(({ icon, label, value }) => (
                    <div key={label} className="bg-indigo-50/80 rounded-2xl p-3 text-indigo-950">
                      <p className="text-[11px] font-black uppercase text-gray-400">{icon} {label}</p>
                      <p className="text-sm font-black mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={handleSubmit}
                  className={`w-full py-5 bg-gradient-to-r ${btnGradient} text-white text-xl font-black rounded-2xl shadow-2xl cursor-pointer`}
                >
                  🌟 Create {heroName || 'Hero'}'s Kingdom Profile! 🎉
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation back and next */}
        <div className="flex items-center justify-between mt-8 gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={step === 1 ? onCancel : handlePrev}
            className="px-8 py-4 bg-white/60 backdrop-blur border-2 border-white/60 text-gray-700 font-black rounded-2xl shadow hover:bg-white/80 cursor-pointer text-sm"
          >
            {step === 1 ? '← Exit' : '← Back'}
          </motion.button>

          <div className={`text-center text-sm font-black ${subColor}`}>
            <span className="text-xl">{CAT_EMOJIS[mascot.mood]}</span>
            <br />
            Step {step}/{TOTAL_STEPS}
          </div>

          {step < TOTAL_STEPS ? (
            <motion.button
              whileHover={canGoNext() ? { scale: 1.05 } : {}}
              whileTap={canGoNext() ? { scale: 0.95 } : {}}
              onClick={handleNext}
              disabled={!canGoNext()}
              className={`px-8 py-4 bg-gradient-to-r ${btnGradient} text-white font-black rounded-2xl shadow-xl cursor-pointer text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Next →
            </motion.button>
          ) : (
            <div className="w-28" />
          )}
        </div>
      </div>
    </div>
  );
};

export default KidsOnboarding;
export { KidsOnboarding };
