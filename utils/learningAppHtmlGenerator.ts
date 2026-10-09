import { StructuredOutput, LearnerProfile } from '../types';
import { buildLessonFileName, getLessonFilePrefill } from './lessonFileNaming';

export const handleSaveLearningAppAsInteractiveHtml = async (
    content: StructuredOutput,
    learner: LearnerProfile,
    returnHtml: boolean = false
) => {
    // Construct Game Data
    const gameData = {
        sections: content.sections.map((s, i) => ({
            title: s.title,
            color: ['#58CC02', '#CE82FF', '#1CB0F6', '#FF9600', '#FF4B4B'][i % 5],
            xpReward: (i + 1) * 25,
            activities: s.activities.map(a => ({
                type: a.type,
                title: a.title,
                content: typeof a.content === 'string' ? a.content : JSON.stringify(a.content),
                skillLabel: 'Skill',
                skillIcon: 'fas fa-star'
            }))
        }))
    };

    const appCode = `
// =================================================================
// DuolingoApp.tsx — Complete Duolingo-Clone Learning Experience
// Single-file React + TypeScript | All question types | Gamified
// =================================================================
const { useState, useEffect, useCallback, useRef, useMemo, memo } = React;
/* self-contained type aliases — this file is precompiled to plain JS at generation
   time (no ESM, no in-browser Babel), so we can never import from 'react'; these
   aliases keep every FC<Props> / ReactNode / CSSProperties annotation valid and
   get stripped at compile time. */
type FC<P = {}> = (props: P) => any;
type ReactNode = any;
type CSSProperties = any;
type Dispatch<A> = (value: A) => void;
type SetStateAction<S> = S | ((prev: S) => S);

// ========================== TYPES ==========================
type ActivityType = 'multiple_choice' | 'matching' | 'scramble' | 'true_false' | 'dictation' | 'pronunciation' | 'cloze' | 'audio_matching';
type Screen = 'home' | 'lesson' | 'complete' | 'leaderboard' | 'review' | 'profile' | 'challenges' | 'shop';
type Difficulty = 'again' | 'hard' | 'good' | 'easy';

interface MCItem { context?: string; audioScript?: string; question: string; options: string[]; correctIndex: number; feedback: string; }
interface MatchPair { left: string; right: string; feedback?: string; }
interface ScrambleItem { sentence: string; feedback: string; }
interface DictItem { text: string; audioScript?: string; feedback: string; }
interface ClozeItem { text: string; hint: string; feedback: string; }
interface AudioMatchPair { audioScript: string; term: string; definition: string; feedback: string; }

interface Activity { type: ActivityType; title: string; content: string; skillLabel: string; skillIcon: string; }
interface Section { title: string; color: string; xpReward: number; activities: Activity[]; }
interface WorksheetData { sections: Section[]; }

interface FlashCard {
  id: string; question: string; answer: string; feedback: string; type: ActivityType;
  ease: number; interval: number; reps: number; nextReview: number; lapses: number;
}

interface FakeUser {
  id: string; name: string; avatar: string; xp: number; streak: number;
  level: number; country: string; online: boolean; league: string;
}

interface Challenge {
  id: string; title: string; desc: string; icon: string; target: number;
  current: number; xpReward: number; gems: number; done: boolean; type: string;
}

interface Achievement { id: string; title: string; desc: string; icon: string; unlocked: boolean; date?: number; }

interface LessonResult {
  xp: number; correct: number; incorrect: number; combo: number;
  time: number; accuracy: number; newCards: FlashCard[];
}

// ========================== THEME ==========================
const T = {
  green: '#58CC02', greenDk: '#46A302', greenLt: '#7CE830',
  purple: '#CE82FF', purpleDk: '#A855F7', blue: '#1CB0F6', blueDk: '#1899D6',
  orange: '#FF9600', orangeDk: '#E08600', red: '#FF4B4B', redDk: '#EA2B2B',
  gold: '#FFC800', goldDk: '#E0B000', pink: '#FF86D0', teal: '#00CD9C',
  bg: '#FFFFFF', bgLt: '#F7F7F7', surface: '#FFFFFF', surfaceLt: '#F7F7F7',
  card: '#FFFFFF', cardHover: '#F7F7F7', border: '#E5E5E5', borderLt: '#D4D4D4',
  text: '#4B4B4B', textSec: '#777777', textDim: '#AFAFAF',
  overlay: 'rgba(0,0,0,0.5)', shadow: 'rgba(0,0,0,0.1)',
  correctBg: 'rgba(88,204,2,0.10)', incorrectBg: 'rgba(255,75,75,0.10)',
  radius: '16px', radiusSm: '12px', radiusXs: '8px',
  font: "'Nunito', 'DIN Round', -apple-system, BlinkMacSystemFont, sans-serif",
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
};

// ========================== CSS INJECTION ==========================
const STYLE_ID = 'duolingo-app-styles';
const injectStyles = () => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = \`
    
    

    @keyframes duo-slideUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
    @keyframes duo-slideDown { from { opacity:0; transform:translateY(-30px); } to { opacity:1; transform:translateY(0); } }
    @keyframes duo-slideRight { from { opacity:0; transform:translateX(-40px); } to { opacity:1; transform:translateX(0); } }
    @keyframes duo-slideLeft { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
    @keyframes duo-fadeIn { from { opacity:0; } to { opacity:1; } }
    @keyframes duo-bounceIn { 0%{opacity:0;transform:scale(0.3);} 50%{opacity:1;transform:scale(1.05);} 70%{transform:scale(0.9);} 100%{transform:scale(1);} }
    @keyframes duo-shake { 0%,100%{transform:translateX(0);} 10%,30%,50%,70%,90%{transform:translateX(-5px);} 20%,40%,60%,80%{transform:translateX(5px);} }
    @keyframes duo-pulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.08);} }
    @keyframes duo-glow { 0%,100%{box-shadow:0 0 5px rgba(88,204,2,0.3);} 50%{box-shadow:0 0 25px rgba(88,204,2,0.6);} }
    @keyframes duo-spin { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }
    @keyframes duo-confetti { 0%{opacity:1;transform:translateY(0) rotate(0deg);} 100%{opacity:0;transform:translateY(-400px) rotate(720deg);} }
    @keyframes duo-xpFloat { 0%{opacity:1;transform:translateY(0) scale(1);} 100%{opacity:0;transform:translateY(-60px) scale(1.5);} }
    @keyframes duo-heartBeat { 0%,100%{transform:scale(1);} 15%{transform:scale(1.3);} 30%{transform:scale(1);} 45%{transform:scale(1.15);} }
    @keyframes duo-progressFill { from{width:0%;} }
    @keyframes duo-streak { 0%{transform:scale(1) rotate(0);} 25%{transform:scale(1.2) rotate(-5deg);} 50%{transform:scale(1) rotate(5deg);} 75%{transform:scale(1.1) rotate(-3deg);} 100%{transform:scale(1) rotate(0);} }
    @keyframes duo-flip { 0%{transform:rotateY(0);} 100%{transform:rotateY(180deg);} }
    @keyframes duo-flipBack { 0%{transform:rotateY(180deg);} 100%{transform:rotateY(360deg);} }
    @keyframes duo-ripple { 0%{transform:scale(0);opacity:0.5;} 100%{transform:scale(4);opacity:0;} }
    @keyframes duo-float { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-10px);} }
    @keyframes duo-levelPath { 0%{stroke-dashoffset:1000;} 100%{stroke-dashoffset:0;} }
    @keyframes duo-comboGlow { 0%{text-shadow:0 0 5px rgba(255,200,0,0.5);} 50%{text-shadow:0 0 20px rgba(255,200,0,0.8), 0 0 40px rgba(255,150,0,0.5);} 100%{text-shadow:0 0 5px rgba(255,200,0,0.5);} }

    .duo-app { font-family: \${T.font}; background:\${T.bg}; color:\${T.text}; min-height:100vh; overflow-x:hidden; -webkit-font-smoothing:antialiased; }
    .duo-app * { box-sizing:border-box; margin:0; padding:0; }
    .duo-app button { font-family:\${T.font}; cursor:pointer; border:none; outline:none; }
    .duo-app input { font-family:\${T.font}; outline:none; }
    .duo-app ::-webkit-scrollbar { width:6px; } 
    .duo-app ::-webkit-scrollbar-track { background:\${T.bg}; }
    .duo-app ::-webkit-scrollbar-thumb { background:\${T.border}; border-radius:3px; }

    @media (max-width:768px) {
      .duo-desktop-only { display:none !important; }
      .duo-mobile-nav { display:flex !important; }
      .duo-main { margin-left: 0 !important; }
    }
    @media (min-width:769px) {
      .duo-mobile-nav { display:none !important; }
      .duo-main { margin-left: 210px !important; }
    }
  \`;
  document.head.appendChild(style);
};

// ========================== SOUND ENGINE ==========================
class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  toggle() { this.enabled = !this.enabled; return this.enabled; }
  isEnabled() { return this.enabled; }

  private playTone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15, delay = 0) {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type; osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + dur);
    } catch (e) { /* silent fail */ }
  }

  correct() {
    this.playTone(523.25, 0.12, 'sine', 0.2);
    this.playTone(659.25, 0.12, 'sine', 0.2, 0.08);
    this.playTone(783.99, 0.2, 'sine', 0.18, 0.16);
  }

  incorrect() {
    this.playTone(220, 0.15, 'sawtooth', 0.1);
    this.playTone(180, 0.25, 'sawtooth', 0.08, 0.1);
  }

  combo(n: number) {
    const base = 400 + Math.min(n, 20) * 20;
    this.playTone(base, 0.08, 'sine', 0.15);
    this.playTone(base * 1.25, 0.08, 'sine', 0.15, 0.06);
    this.playTone(base * 1.5, 0.15, 'sine', 0.12, 0.12);
  }

  click() { this.playTone(800, 0.05, 'sine', 0.08); }
  tap() { this.playTone(600, 0.03, 'sine', 0.06); }

  complete() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      this.playTone(f, 0.2, 'sine', 0.15, i * 0.1)
    );
  }

  levelUp() {
    [392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
      this.playTone(f, 0.15, 'triangle', 0.12, i * 0.08)
    );
  }

  heartLost() {
    this.playTone(350, 0.2, 'triangle', 0.12);
    this.playTone(280, 0.3, 'triangle', 0.1, 0.15);
  }

  streak() {
    [440, 554.37, 659.25, 880].forEach((f, i) =>
      this.playTone(f, 0.1, 'sine', 0.1, i * 0.06)
    );
  }
}

const sfx = new SoundEngine();

// ========================== SPEECH ENGINE ==========================
// Voice selection: honor the learner's chosen read-aloud voice (injected as
// window.appConfig.voiceURI at generation time), fall back to natural voices,
// then any English voice. Microsoft Ava Multilingual (Natural) is the default
// expectation from the Lesson Creator customization.
const normalizeVoiceKey = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const pickVoice = (uri?: string): SpeechSynthesisVoice | null => {
  const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  if (!voices.length) return null;
  // 1. exact match on the configured voice name or URI
  if (uri) {
    const key = normalizeVoiceKey(uri);
    if (key) {
      const exact = voices.find(v => v.name === uri || v.voiceURI === uri);
      if (exact) return exact;
      const fuzzy = voices.find(v => normalizeVoiceKey(v.name) === key || normalizeVoiceKey(v.voiceURI) === key);
      if (fuzzy) return fuzzy;
    }
  }
  // 2. prefer natural / neural English voices (Ava, Aria, Jenny, Sonia...)
  const natural = voices.find(v => v.lang.toLowerCase().startsWith('en') && /natural|neural|multilingual/i.test(v.name));
  if (natural) return natural;
  // 3. any English voice, Google last resort
  const en = voices.filter(v => v.lang.toLowerCase().startsWith('en'));
  return en.find(v => /google/i.test(v.name)) || en[0] || null;
};

const speak = (text: string, rate = 1, pitch = 1): Promise<void> => {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate; u.pitch = pitch; u.lang = 'en-US';
    const cfg = (window as any).appConfig || {};
    const pref = pickVoice(cfg.voiceURI);
    if (pref) u.voice = pref;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
};
// Voices load async in Chrome — refresh the picker once they arrive.
if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged === null) {
  window.speechSynthesis.onvoiceschanged = () => { pickVoice((window as any).appConfig?.voiceURI); };
}

// ========================== SPACED REPETITION (SM-2) ==========================
const sm2 = (card: FlashCard, difficulty: Difficulty): FlashCard => {
  const c = { ...card };
  const q = { again: 0, hard: 2, good: 4, easy: 5 }[difficulty];

  if (q < 3) {
    c.reps = 0;
    c.interval = 1;
    c.lapses += 1;
  } else {
    c.reps += 1;
    if (c.reps === 1) c.interval = 1;
    else if (c.reps === 2) c.interval = 6;
    else c.interval = Math.round(c.interval * c.ease);
  }

  c.ease = Math.max(1.3, c.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  c.nextReview = Date.now() + c.interval * 86400000;
  return c;
};

const createFlashCard = (q: string, a: string, fb: string, type: ActivityType): FlashCard => ({
  id: \`fc-\${Date.now()}-\${Math.random().toString(36).slice(2, 8)}\`,
  question: q, answer: a, feedback: fb, type,
  ease: 2.5, interval: 0, reps: 0, nextReview: 0, lapses: 0,
});

// ========================== UTILITIES ==========================
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const formatTime = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return \`\${Math.floor(s / 60)}:\${(s % 60).toString().padStart(2, '0')}\`;
};
const todayStr = () => new Date().toISOString().split('T')[0];
const xpForLevel = (lvl: number) => 100 * lvl + 50 * Math.floor(lvl / 3);

const AVATARS = ['🦉', '🐱', '🐶', '🦊', '🐼', '🐨', '🐸', '🦁', '🐯', '🐻', '🐰', '🐮', '🐷', '🐵', '🦄', '🐲', '🦅', '🐺', '🦋', '🐢'];
const NAMES = ['Luna', 'Max', 'Aria', 'Leo', 'Nova', 'Kai', 'Zara', 'Finn', 'Mia', 'Atlas', 'Iris', 'Theo', 'Jade', 'Oscar', 'Stella', 'Hugo', 'Nora', 'Felix', 'Ruby', 'Soren', 'Alice', 'Marco', 'Yuki', 'Chen', 'Amira', 'Raj', 'Sofia', 'Luca', 'Emma', 'Noah'];
const COUNTRIES = ['🇺🇸', '🇬🇧', '🇯🇵', '🇰🇷', '🇫🇷', '🇩🇪', '🇧🇷', '🇮🇳', '🇪🇸', '🇮🇹', '🇲🇽', '🇨🇦', '🇦🇺', '🇹🇷', '🇸🇪', '🇳🇱', '🇵🇱', '🇹🇭', '🇻🇳', '🇨🇴'];
const LEAGUES = ['Bronze', 'Silver', 'Gold', 'Sapphire', 'Ruby', 'Emerald', 'Amethyst', 'Pearl', 'Obsidian', 'Diamond'];

const genFakeUsers = (count: number, playerXp: number): FakeUser[] => {
  const users: FakeUser[] = [];
  for (let i = 0; i < count; i++) {
    const xp = Math.max(0, playerXp + rand(-600, 800));
    users.push({
      id: \`fake-\${i}\`, name: NAMES[i % NAMES.length], avatar: AVATARS[i % AVATARS.length],
      xp, streak: rand(1, 90), level: rand(1, 30),
      country: COUNTRIES[rand(0, COUNTRIES.length - 1)], online: Math.random() > 0.6,
      league: LEAGUES[clamp(Math.floor(xp / 500), 0, LEAGUES.length - 1)],
    });
  }
  return users.sort((a, b) => b.xp - a.xp);
};

const genChallenges = (): Challenge[] => [
  { id: 'c1', title: 'Early Bird', desc: 'Complete 1 lesson', icon: '🌅', target: 1, current: 0, xpReward: 20, gems: 5, done: false, type: 'lessons' },
  { id: 'c2', title: 'Combo Master', desc: 'Get a 10x combo', icon: '🔥', target: 10, current: 0, xpReward: 40, gems: 10, done: false, type: 'combo' },
  { id: 'c3', title: 'Perfect Round', desc: 'Complete a lesson with 100% accuracy', icon: '💎', target: 1, current: 0, xpReward: 50, gems: 15, done: false, type: 'perfect' },
  { id: 'c4', title: 'Speed Demon', desc: 'Answer 5 questions in under 30 seconds', icon: '⚡', target: 5, current: 0, xpReward: 30, gems: 8, done: false, type: 'speed' },
  { id: 'c5', title: 'Scholar', desc: 'Answer 20 questions correctly', icon: '📚', target: 20, current: 0, xpReward: 60, gems: 20, done: false, type: 'correct' },
  { id: 'c6', title: 'Reviewer', desc: 'Review 10 flashcards', icon: '🔄', target: 10, current: 0, xpReward: 25, gems: 5, done: false, type: 'review' },
];

const defaultAchievements: Achievement[] = [
  { id: 'a1', title: 'First Steps', desc: 'Complete your first lesson', icon: '🎯', unlocked: false },
  { id: 'a2', title: 'On Fire', desc: 'Reach a 7-day streak', icon: '🔥', unlocked: false },
  { id: 'a3', title: 'Perfectionist', desc: '3 perfect lessons in a row', icon: '⭐', unlocked: false },
  { id: 'a4', title: 'Combo King', desc: 'Get a 20x combo', icon: '👑', unlocked: false },
  { id: 'a5', title: 'Centurion', desc: 'Earn 1000 XP total', icon: '🏆', unlocked: false },
  { id: 'a6', title: 'Night Owl', desc: 'Study after 10 PM', icon: '🦉', unlocked: false },
  { id: 'a7', title: 'Speed Runner', desc: 'Complete a lesson in under 2 minutes', icon: '⚡', unlocked: false },
  { id: 'a8', title: 'Collector', desc: 'Have 50 flashcards', icon: '🃏', unlocked: false },
];

// ========================== PERSISTENCE ==========================
const STORAGE_KEY = 'duolingo-clone-state';
interface SavedState {
  xp: number; totalXp: number; level: number; hearts: number; gems: number;
  streak: number; lastPlay: string; maxCombo: number;
  completedActs: string[]; unlockedSections: number[];
  flashcards: FlashCard[]; achievements: Achievement[];
  perfectStreak: number; totalCorrect: number; totalLessons: number;
  streakFreeze?: boolean; boostUntil?: number;
}

const loadState = (): SavedState | null => {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : null; }
  catch { return null; }
};

const saveState = (s: SavedState) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* silent */ }
};

// ========================== DEMO DATA ==========================
const DEMO_DATA: WorksheetData = {
  sections: [
    {
      title: 'Level 1: Foundations', color: '#58CC02', xpReward: 30,
      activities: [
        {
          type: 'matching', title: 'Match the vocabulary words', skillLabel: 'Vocabulary', skillIcon: 'fas fa-book',
          content: JSON.stringify({
            pairs: [
              { left: 'Abundant', right: 'Existing in large quantities' },
              { left: 'Benevolent', right: 'Well-meaning and kindly' },
              { left: 'Candid', right: 'Truthful and straightforward' },
              { left: 'Diligent', right: 'Having careful persistent effort' },
              { left: 'Eloquent', right: 'Fluent and persuasive in speech' },
              { left: 'Frugal', right: 'Sparing with money or resources' },
            ]
          })
        },
        {
          type: 'scramble', title: 'Unscramble the sentence', skillLabel: 'Grammar', skillIcon: 'fas fa-puzzle-piece',
          content: JSON.stringify({
            items: [
              { sentence: 'The scientist | carefully | analyzed | the experimental | results | yesterday.', feedback: 'Great use of adverb placement!' },
              { sentence: 'Despite | the heavy rain, | she decided | to walk | to the office | this morning.', feedback: 'Complex sentence with a dependent clause.' },
              { sentence: 'My neighbor | has been | volunteering | at the local | shelter | for three years.', feedback: 'Present perfect continuous tense.' },
              { sentence: 'The new | restaurant downtown | serves | authentic | Italian | cuisine.', feedback: 'Proper adjective ordering.' },
              { sentence: 'After finishing | his homework, | Tom | went outside | to play | with friends.', feedback: 'Temporal clause followed by main clause.' },
              { sentence: 'The children | were excited | about | the upcoming | field trip | to the museum.', feedback: 'Prepositional phrase usage.' },
            ]
          })
        },
        {
          type: 'pronunciation', title: 'Read aloud clearly', skillLabel: 'Pronunciation', skillIcon: 'fas fa-microphone',
          content: JSON.stringify({
            items: [
              { text: 'The weather forecast predicts sunshine throughout the weekend.', feedback: 'Focus on the "th" sounds.' },
              { text: 'She thoroughly enjoyed the theatrical performance last evening.', feedback: 'Notice the "th" in thoroughly and theatrical.' },
              { text: 'The particular pattern was practically impossible to replicate.', feedback: 'Practice the "p" and "r" clusters.' },
              { text: 'Would you mind explaining the difference between these two concepts?', feedback: 'Intonation rises for polite requests.' },
              { text: 'The entrepreneurial spirit drives innovation across industries.', feedback: 'Stress on the third syllable of entrepreneurial.' },
              { text: 'Approximately thirty-three percent of participants withdrew early.', feedback: 'Careful with number pronunciation.' },
            ]
          })
        },
        {
          type: 'true_false', title: 'True or False?', skillLabel: 'Listening', skillIcon: 'fas fa-headphones',
          content: JSON.stringify({
            items: [
              { context: 'The Pacific Ocean is the largest and deepest ocean on Earth, covering more than 60 million square miles.', audioScript: 'The Pacific Ocean is the largest and deepest ocean on Earth.', question: 'The Pacific Ocean covers more than 60 million square miles.', options: ['True', 'False'], correctIndex: 0, feedback: 'Correct! The text states it covers more than 60 million square miles.' },
              { context: 'Photosynthesis is the process by which green plants convert sunlight into chemical energy. This process requires water and carbon dioxide.', audioScript: 'Photosynthesis converts sunlight into chemical energy using water and carbon dioxide.', question: 'Photosynthesis only requires sunlight to work.', options: ['True', 'False'], correctIndex: 1, feedback: 'False! It also requires water and carbon dioxide.' },
              { context: 'The human brain contains approximately 86 billion neurons. Each neuron can form thousands of connections with other neurons.', audioScript: 'The brain has about 86 billion neurons, each forming thousands of connections.', question: 'The human brain has approximately 86 billion neurons.', options: ['True', 'False'], correctIndex: 0, feedback: 'Correct! The text confirms 86 billion neurons.' },
              { context: 'Mount Everest, at 8,849 meters, is the tallest mountain above sea level. However, Mauna Kea in Hawaii is taller when measured from its underwater base.', audioScript: 'Mount Everest is the tallest above sea level, but Mauna Kea is taller from its base.', question: 'Mount Everest is the tallest mountain when measured from base to peak.', options: ['True', 'False'], correctIndex: 1, feedback: 'False! Mauna Kea is taller from its underwater base.' },
              { context: 'The Great Wall of China stretches over 13,000 miles. It was built over many centuries by various Chinese dynasties.', audioScript: 'The Great Wall extends over 13,000 miles, built across centuries.', question: 'The Great Wall was built by a single Chinese dynasty.', options: ['True', 'False'], correctIndex: 1, feedback: 'False! Multiple dynasties contributed to its construction.' },
              { context: 'Water boils at 100 degrees Celsius at sea level. At higher altitudes, water boils at lower temperatures due to reduced atmospheric pressure.', audioScript: 'Water boils at 100°C at sea level but at lower temperatures at higher altitudes.', question: 'Water always boils at exactly 100 degrees Celsius.', options: ['True', 'False'], correctIndex: 1, feedback: 'False! Altitude affects the boiling point.' },
            ]
          })
        },
        {
          type: 'multiple_choice', title: 'Choose the best answer', skillLabel: 'Reading', skillIcon: 'fas fa-book-open',
          content: JSON.stringify({
            items: [
              { context: 'Climate change refers to long-term shifts in temperatures and weather patterns. While natural causes like volcanic eruptions play a role, human activities have been the main driver since the 1800s, primarily through burning fossil fuels.', question: 'What has been the main driver of climate change since the 1800s?', options: ['Volcanic eruptions', 'Human activities', 'Ocean currents', 'Solar radiation'], correctIndex: 1, feedback: 'Human activities, especially burning fossil fuels, are identified as the main driver.' },
              { context: 'The Renaissance was a cultural movement that began in Italy in the 14th century. It marked a period of renewed interest in classical Greek and Roman art, literature, and philosophy.', question: 'Where did the Renaissance begin?', options: ['France', 'England', 'Italy', 'Spain'], correctIndex: 2, feedback: 'The Renaissance originated in Italy in the 14th century.' },
              { context: 'Antibiotics are medications used to treat bacterial infections. However, they are ineffective against viral infections such as the common cold. Overuse of antibiotics can lead to antibiotic resistance.', question: 'Why is overuse of antibiotics a concern?', options: ['They cause allergies', 'They lead to resistance', 'They are expensive', 'They taste bad'], correctIndex: 1, feedback: 'Overuse can lead to antibiotic resistance, making bacteria harder to treat.' },
              { context: 'The Amazon Rainforest produces about 20% of the world\\'s oxygen. Often called "the lungs of the Earth," it spans across nine countries in South America and is home to millions of species.', question: 'How many countries does the Amazon span?', options: ['Five', 'Seven', 'Nine', 'Twelve'], correctIndex: 2, feedback: 'The Amazon Rainforest spans across nine South American countries.' },
              { context: 'Artificial intelligence refers to computer systems designed to perform tasks that typically require human intelligence. These include learning, reasoning, and problem-solving.', question: 'Which is NOT mentioned as a task of AI?', options: ['Learning', 'Reasoning', 'Cooking', 'Problem-solving'], correctIndex: 2, feedback: 'Cooking is not mentioned. The text lists learning, reasoning, and problem-solving.' },
              { context: 'Marie Curie was the first woman to win a Nobel Prize and remains the only person to win Nobel Prizes in two different scientific fields: Physics and Chemistry.', question: 'In which fields did Marie Curie win Nobel Prizes?', options: ['Physics and Biology', 'Chemistry and Medicine', 'Physics and Chemistry', 'Biology and Chemistry'], correctIndex: 2, feedback: 'Marie Curie won in Physics and Chemistry.' },
            ]
          })
        },
        {
          type: 'dictation', title: 'Listen and type what you hear', skillLabel: 'Writing', skillIcon: 'fas fa-pen',
          content: JSON.stringify({
            items: [
              { text: 'The early morning sunlight filtered through the curtains.', audioScript: 'The early morning sunlight filtered through the curtains.', feedback: 'Notice the past tense "filtered."' },
              { text: 'She has been studying for three hours without a break.', audioScript: 'She has been studying for three hours without a break.', feedback: 'Present perfect continuous tense structure.' },
              { text: 'The museum will be closed for renovations next month.', audioScript: 'The museum will be closed for renovations next month.', feedback: 'Future passive voice construction.' },
              { text: 'Despite the challenges, the team remained optimistic.', audioScript: 'Despite the challenges, the team remained optimistic.', feedback: 'Concessive clause with "despite."' },
              { text: 'Would you prefer tea or coffee with your breakfast?', audioScript: 'Would you prefer tea or coffee with your breakfast?', feedback: 'Polite question using "would."' },
              { text: 'The documentary explored the impact of technology on society.', audioScript: 'The documentary explored the impact of technology on society.', feedback: 'Past tense narrative structure.' },
            ]
          })
        },
      ]
    },
    {
      title: 'Level 2: Integrated Skills', color: '#CE82FF', xpReward: 50,
      activities: [
        {
          type: 'audio_matching', title: 'Listen and match', skillLabel: 'Vocab + Listening', skillIcon: 'fas fa-headphones-alt',
          content: JSON.stringify({
            pairs: [
              { audioScript: 'The word is Meticulous.', term: 'Meticulous', definition: 'Showing great attention to detail', feedback: 'Meticulous means very careful and precise.' },
              { audioScript: 'The word is Ambiguous.', term: 'Ambiguous', definition: 'Open to more than one interpretation', feedback: 'Ambiguous describes something unclear or having multiple meanings.' },
              { audioScript: 'The word is Resilient.', term: 'Resilient', definition: 'Able to recover quickly from difficulties', feedback: 'Resilient means bouncing back from challenges.' },
              { audioScript: 'The word is Pragmatic.', term: 'Pragmatic', definition: 'Dealing with things practically', feedback: 'Pragmatic focuses on practical approaches.' },
              { audioScript: 'The word is Ephemeral.', term: 'Ephemeral', definition: 'Lasting for a very short time', feedback: 'Ephemeral describes something fleeting.' },
              { audioScript: 'The word is Ubiquitous.', term: 'Ubiquitous', definition: 'Present everywhere at once', feedback: 'Ubiquitous means found everywhere.' },
            ]
          })
        },
        {
          type: 'cloze', title: 'Fill in the blanks', skillLabel: 'Grammar + Writing', skillIcon: 'fas fa-edit',
          content: JSON.stringify({
            items: [
              { text: 'If I [had known] about the meeting, I would have attended.', hint: 'past participle of "know" — conditional form', feedback: 'Third conditional: If + past perfect, would have + past participle.' },
              { text: 'The book [which] she recommended was absolutely fascinating.', hint: 'relative pronoun for things', feedback: '"Which" is used as a relative pronoun for non-human subjects.' },
              { text: 'They have been [living] in this city since 2015.', hint: 'continuous form of "live"', feedback: 'Present perfect continuous: have been + -ing form.' },
              { text: 'Neither the teacher [nor] the students were prepared.', hint: 'correlative conjunction pair with "neither"', feedback: '"Neither...nor" is a correlative conjunction pair.' },
              { text: 'The project must be [completed] by Friday afternoon.', hint: 'passive form of "complete"', feedback: 'Passive voice: must be + past participle.' },
              { text: 'She speaks English as [fluently] as a native speaker.', hint: 'adverb form of "fluent"', feedback: 'Adverb form used with "as...as" comparison structure.' },
            ]
          })
        },
        {
          type: 'true_false', title: 'Read, listen, and decide', skillLabel: 'Reading + Listening', skillIcon: 'fas fa-book-reader',
          content: JSON.stringify({
            items: [
              { context: 'Honey never spoils. Archaeologists have found 3,000-year-old honey in Egyptian tombs that was still edible.', audioScript: 'Honey has an incredibly long shelf life and has been found preserved in ancient tombs.', question: 'Honey can remain edible for thousands of years.', options: ['True', 'False'], correctIndex: 0, feedback: 'True! 3,000-year-old honey was still edible.' },
              { context: 'Octopuses have three hearts and blue blood. Two hearts pump blood to the gills, and one pumps it to the rest of the body.', audioScript: 'An octopus has three hearts: two for the gills and one for the body.', question: 'All three of an octopus\\'s hearts pump blood to the gills.', options: ['True', 'False'], correctIndex: 1, feedback: 'False! Only two hearts pump to the gills; one pumps to the body.' },
              { context: 'Venus is the hottest planet in our solar system, with surface temperatures reaching 475°C, despite Mercury being closer to the Sun.', audioScript: 'Venus is hotter than Mercury due to its thick atmosphere trapping heat.', question: 'Mercury is the hottest planet because it is closest to the Sun.', options: ['True', 'False'], correctIndex: 1, feedback: 'False! Venus is hottest due to its greenhouse effect.' },
              { context: 'The speed of light in a vacuum is approximately 299,792 kilometers per second. Nothing can travel faster than light in a vacuum.', audioScript: 'Light travels at roughly 300,000 km per second, the universal speed limit.', question: 'Light travels at about 300,000 km per second.', options: ['True', 'False'], correctIndex: 0, feedback: 'True! Approximately 299,792 km/s, rounded to 300,000.' },
              { context: 'Bananas are berries in botanical terms, but strawberries are not. True berries develop from a single ovary of a single flower.', audioScript: 'Botanically, bananas are berries while strawberries technically are not.', question: 'Strawberries are classified as true berries in botany.', options: ['True', 'False'], correctIndex: 1, feedback: 'False! Strawberries are not true berries botanically.' },
              { context: 'The Eiffel Tower can grow up to 15 cm taller during summer because heat causes the iron to expand.', audioScript: 'The Eiffel Tower\\'s height changes with temperature due to thermal expansion.', question: 'The Eiffel Tower is always exactly the same height.', options: ['True', 'False'], correctIndex: 1, feedback: 'False! Thermal expansion makes it taller in summer.' },
            ]
          })
        },
        {
          type: 'multiple_choice', title: 'Choose the best response', skillLabel: 'Speaking', skillIcon: 'fas fa-comments',
          content: JSON.stringify({
            items: [
              { audioScript: 'Excuse me, could you tell me how to get to the nearest subway station?', question: 'Someone asks you for directions to the subway. What\\'s the best response?', options: ['I don\\'t care about the subway.', 'Sure! Walk two blocks north and turn left. You\\'ll see it on your right.', 'The subway is a type of transportation.', 'I like taking the bus better.'], correctIndex: 1, feedback: 'This response is helpful and gives clear directions.' },
              { audioScript: 'I\\'m really sorry, but I accidentally broke your favorite mug.', question: 'Your friend apologizes for breaking your mug. What\\'s the most gracious response?', options: ['You owe me a new one right now!', 'I can\\'t believe you did that!', 'Don\\'t worry about it. Accidents happen. We can find another one.', 'I knew I shouldn\\'t have let you use it.'], correctIndex: 2, feedback: 'A gracious response acknowledges the accident and shows understanding.' },
              { audioScript: 'Would you be interested in joining our book club? We meet every Thursday evening.', question: 'You\\'re invited to a book club. What\\'s the best way to accept?', options: ['Books are boring.', 'That sounds wonderful! I\\'d love to join. What are you reading now?', 'Maybe. I\\'ll think about it. Don\\'t count on me.', 'Only if there are snacks.'], correctIndex: 1, feedback: 'Showing enthusiasm and asking a follow-up question demonstrates genuine interest.' },
              { audioScript: 'I\\'ve been feeling really stressed about my upcoming exam.', question: 'Your friend is stressed about an exam. What\\'s the most supportive response?', options: ['You should have studied earlier.', 'Exams aren\\'t that important anyway.', 'I understand how you feel. Would it help if we studied together?', 'Just don\\'t think about it.'], correctIndex: 2, feedback: 'Empathy and offering practical help is the most supportive approach.' },
              { audioScript: 'Good morning! I\\'m calling to schedule an appointment with Dr. Smith.', question: 'You\\'re calling a doctor\\'s office. How should you respond to their greeting?', options: ['Whatever, just give me an appointment.', 'Good morning! I\\'d like to schedule a check-up, please. When is the earliest availability?', 'Is Dr. Smith even good?', 'Hi. Appointment. Soon.'], correctIndex: 1, feedback: 'Professional, polite, and specific about your needs.' },
              { audioScript: 'Congratulations on your promotion! You really deserve it.', question: 'A colleague congratulates you on a promotion. Choose the best response.', options: ['I know, I\\'m the best.', 'It\\'s not a big deal.', 'Thank you so much! I\\'ve worked hard for this, and I appreciate your support.', 'Finally, someone noticed.'], correctIndex: 2, feedback: 'Gracious acceptance that acknowledges effort and appreciation.' },
            ]
          })
        },
        {
          type: 'scramble', title: 'Arrange the phrases correctly', skillLabel: 'Grammar', skillIcon: 'fas fa-random',
          content: JSON.stringify({
            items: [
              { sentence: 'Not only | did she complete | the marathon, | but she also | set a new | personal record.', feedback: '"Not only...but also" is an advanced correlative conjunction.' },
              { sentence: 'Had I known | about the traffic, | I would have | left the house | much earlier | this morning.', feedback: 'Inverted conditional: Had + subject + past participle.' },
              { sentence: 'The more | you practice, | the easier | it becomes | to speak | with confidence.', feedback: '"The more...the easier" is a comparative correlative structure.' },
              { sentence: 'Regardless of | the outcome, | we should be | proud of | the effort | we put in.', feedback: '"Regardless of" introduces a concessive phrase.' },
              { sentence: 'By the time | we arrive | at the airport, | the plane | will have already | departed.', feedback: 'Future perfect tense with time clause.' },
              { sentence: 'It is widely | believed that | regular exercise | can significantly | improve | mental health.', feedback: 'Passive introductory "It is believed that..." structure.' },
            ]
          })
        },
      ]
    },
    {
      title: 'Level 3: Complex Integration', color: '#1CB0F6', xpReward: 75,
      activities: [
        {
          type: 'cloze', title: 'Advanced fill-in-the-blank', skillLabel: 'Reading + Writing', skillIcon: 'fas fa-file-alt',
          content: JSON.stringify({
            items: [
              { text: 'The phenomenon of [cognitive] dissonance occurs when beliefs conflict with actions.', hint: 'Related to thinking and mental processes', feedback: 'Cognitive dissonance is a psychological concept about mental discomfort from contradictions.' },
              { text: 'Scientists [hypothesize] that the universe is approximately 13.8 billion years old.', hint: 'To form a theory or educated guess', feedback: 'Hypothesize means to propose a theory for investigation.' },
              { text: 'The company\\'s [unprecedented] growth surprised even the most optimistic analysts.', hint: 'Never done or experienced before', feedback: 'Unprecedented means never having happened before.' },
              { text: 'Her [meticulous] attention to detail ensured the project\\'s success.', hint: 'Extremely careful and precise', feedback: 'Meticulous describes thorough, careful attention.' },
              { text: 'The [correlation] between sleep quality and academic performance is well-documented.', hint: 'A mutual relationship between two things', feedback: 'Correlation describes a statistical relationship between variables.' },
              { text: 'The new policy aims to [mitigate] the environmental impact of industrial waste.', hint: 'To make less severe or serious', feedback: 'Mitigate means to reduce the severity of something.' },
            ]
          })
        },
        {
          type: 'multiple_choice', title: 'Listen and analyze', skillLabel: 'Speaking + Listening', skillIcon: 'fas fa-headphones',
          content: JSON.stringify({
            items: [
              { audioScript: 'The committee has decided to postpone the annual conference until further notice due to unforeseen circumstances. All registered participants will receive a full refund within 30 business days.', question: 'What will happen to registered participants?', options: ['They must register again', 'They will receive refunds', 'They need to attend virtually', 'They will be transferred to next year'], correctIndex: 1, feedback: 'Participants receive full refunds within 30 business days.' },
              { audioScript: 'While many people believe that goldfish have a three-second memory, research has shown they can actually remember things for up to five months. They can even be trained to recognize certain patterns.', question: 'What does the research show about goldfish memory?', options: ['They have 3-second memory', 'They can remember for 5 months', 'They cannot be trained', 'Their memory is worse than believed'], correctIndex: 1, feedback: 'Research shows goldfish memory lasts up to five months.' },
              { audioScript: 'The new city regulations require all restaurants to display nutritional information prominently on their menus. Restaurants have six months to comply or face potential fines.', question: 'How long do restaurants have to comply?', options: ['Three months', 'Six months', 'One year', 'Immediately'], correctIndex: 1, feedback: 'Restaurants have a six-month compliance window.' },
              { audioScript: 'Surprisingly, the tallest mountain in the solar system is not on Earth. Olympus Mons on Mars stands at approximately 21.9 kilometers high, nearly three times the height of Mount Everest.', question: 'How does Olympus Mons compare to Mount Everest?', options: ['Same height', 'Twice as tall', 'Nearly three times as tall', 'Half as tall'], correctIndex: 2, feedback: 'Olympus Mons is nearly three times the height of Everest.' },
              { audioScript: 'The internship program accepts applications from September first through October fifteenth. Applicants must submit a resume, two letters of recommendation, and a personal statement.', question: 'Which is NOT required for the application?', options: ['Resume', 'Letters of recommendation', 'Transcript', 'Personal statement'], correctIndex: 2, feedback: 'A transcript is not mentioned in the requirements.' },
              { audioScript: 'Due to the construction on Main Street, buses on routes 7 and 12 will be rerouted through Oak Avenue starting Monday. Normal service is expected to resume by the end of the month.', question: 'Which bus routes are affected?', options: ['Routes 5 and 7', 'Routes 7 and 12', 'Routes 12 and 15', 'All routes'], correctIndex: 1, feedback: 'Routes 7 and 12 are specifically mentioned as affected.' },
            ]
          })
        },
        {
          type: 'matching', title: 'Match synonyms', skillLabel: 'Advanced Vocabulary', skillIcon: 'fas fa-link',
          content: JSON.stringify({
            pairs: [
              { left: 'Ubiquitous', right: 'Omnipresent' },
              { left: 'Ephemeral', right: 'Transient' },
              { left: 'Eloquent', right: 'Articulate' },
              { left: 'Pragmatic', right: 'Practical' },
              { left: 'Ambivalent', right: 'Undecided' },
              { left: 'Arduous', right: 'Strenuous' },
            ]
          })
        },
        {
          type: 'dictation', title: 'Fast dictation challenge', skillLabel: 'Listening + Writing', skillIcon: 'fas fa-keyboard',
          content: JSON.stringify({
            items: [
              { text: 'The unprecedented growth of renewable energy has transformed the global economy.', audioScript: 'The unprecedented growth of renewable energy has transformed the global economy.', feedback: 'Note: "unprecedented" and "renewable" are key vocabulary.' },
              { text: 'Consequently, many traditional industries have had to adapt or risk becoming obsolete.', audioScript: 'Consequently, many traditional industries have had to adapt or risk becoming obsolete.', feedback: '"Consequently" signals a cause-effect relationship.' },
              { text: 'The pharmaceutical company announced a breakthrough in vaccine development.', audioScript: 'The pharmaceutical company announced a breakthrough in vaccine development.', feedback: '"Pharmaceutical" is a challenging word to spell.' },
              { text: 'Environmental sustainability requires collaboration between governments and corporations.', audioScript: 'Environmental sustainability requires collaboration between governments and corporations.', feedback: 'Complex noun phrase with "environmental sustainability."' },
              { text: 'The archaeological excavation revealed artifacts dating back to the Bronze Age.', audioScript: 'The archaeological excavation revealed artifacts dating back to the Bronze Age.', feedback: 'Note the spelling of "archaeological" and "excavation."' },
              { text: 'Notwithstanding the initial setbacks, the project was ultimately deemed a success.', audioScript: 'Notwithstanding the initial setbacks, the project was ultimately deemed a success.', feedback: '"Notwithstanding" is a formal concessive connector.' },
            ]
          })
        },
      ]
    },
    {
      title: 'Level 4: Mastery', color: '#FF9600', xpReward: 100,
      activities: [
        {
          type: 'multiple_choice', title: 'Scenario simulation', skillLabel: 'Full Integration', skillIcon: 'fas fa-brain',
          content: JSON.stringify({
            items: [
              { context: 'You are a project manager. Your team has just discovered a critical bug two days before the product launch. The CEO wants to launch on time, but your lead developer says it needs at least a week to fix properly.', question: 'What is the most professional course of action?', options: ['Launch anyway and fix it later', 'Propose a partial launch with the affected feature disabled, and provide a timeline for the fix', 'Blame the development team for the bug', 'Quit the project immediately'], correctIndex: 1, feedback: 'A partial launch balances stakeholder needs while maintaining quality.' },
              { context: 'During a job interview, the interviewer asks: "Tell me about a time you failed." You recall a project that went over budget by 40% last year.', question: 'What is the best way to frame your answer?', options: ['Say you\\'ve never failed', 'Describe the failure, what you learned, and how you improved your process', 'Blame your former colleagues', 'Change the subject to your strengths'], correctIndex: 1, feedback: 'Honest reflection with lessons learned demonstrates maturity and growth mindset.' },
              { context: 'You are presenting quarterly results to the board. The numbers are below expectations, but your team implemented significant process improvements that will show results next quarter.', question: 'How should you structure your presentation?', options: ['Only show the positive changes', 'Present the data honestly, acknowledge shortfalls, and present the improvement plan with projected impact', 'Blame market conditions entirely', 'Postpone the presentation'], correctIndex: 1, feedback: 'Transparency with a forward-looking plan builds trust and credibility.' },
              { context: 'A colleague from another department sends you an email with a passive-aggressive tone, criticizing your team\\'s response time on a shared project.', question: 'What is the most effective response?', options: ['Reply with an equally passive-aggressive email', 'Suggest a brief meeting to discuss workflow improvements and establish clearer expectations', 'Forward the email to your manager', 'Ignore the email entirely'], correctIndex: 1, feedback: 'A face-to-face discussion resolves conflicts more effectively than email exchanges.' },
              { context: 'You notice that a new company policy inadvertently discriminates against employees with disabilities. Your manager doesn\\'t seem aware of the issue.', question: 'What should you do?', options: ['Ignore it since it\\'s not your responsibility', 'Raise the concern with your manager constructively, providing specific examples', 'Post about it on social media', 'Wait for someone else to notice'], correctIndex: 1, feedback: 'Constructive escalation with evidence helps improve workplace policies.' },
              { context: 'Your team is split on a strategic decision. Half want approach A (faster but riskier) and half want approach B (slower but safer). You need to decide.', question: 'What is the best leadership approach?', options: ['Just pick one and move on', 'Facilitate a structured discussion weighing pros and cons, then make a decision with clear reasoning', 'Let the team vote and go with majority', 'Avoid the decision by asking for more research indefinitely'], correctIndex: 1, feedback: 'Structured decision-making with transparency builds team trust and ensures quality outcomes.' },
            ]
          })
        },
        {
          type: 'dictation', title: 'Expert dictation', skillLabel: 'Advanced Listening', skillIcon: 'fas fa-graduation-cap',
          content: JSON.stringify({
            items: [
              { text: 'The juxtaposition of classical architecture with contemporary design creates a striking visual narrative throughout the city center.', audioScript: 'The juxtaposition of classical architecture with contemporary design creates a striking visual narrative throughout the city center.', feedback: '"Juxtaposition" means placing things side by side for comparison.' },
              { text: 'Notwithstanding the considerable bureaucratic obstacles, the humanitarian organization persevered in its mission.', audioScript: 'Notwithstanding the considerable bureaucratic obstacles, the humanitarian organization persevered in its mission.', feedback: 'Complex sentence with formal register vocabulary.' },
              { text: 'The symposium addressed the philosophical implications of artificial intelligence in contemporary society.', audioScript: 'The symposium addressed the philosophical implications of artificial intelligence in contemporary society.', feedback: '"Symposium" is a conference for discussion of a particular subject.' },
              { text: 'Interdisciplinary collaboration between neuroscientists and psychologists yielded unprecedented insights.', audioScript: 'Interdisciplinary collaboration between neuroscientists and psychologists yielded unprecedented insights.', feedback: 'Multiple complex words requiring careful spelling.' },
              { text: 'The entrepreneur\\'s unconventional methodology disrupted established paradigms within the industry.', audioScript: 'The entrepreneur\\'s unconventional methodology disrupted established paradigms within the industry.', feedback: '"Paradigm" refers to a typical example or pattern.' },
              { text: 'Empirical evidence substantiates the hypothesis that biodiversity loss accelerates climate deterioration.', audioScript: 'Empirical evidence substantiates the hypothesis that biodiversity loss accelerates climate deterioration.', feedback: 'Academic register with precise scientific terminology.' },
            ]
          })
        },
        {
          type: 'true_false', title: 'Critical thinking challenge', skillLabel: 'Analysis', skillIcon: 'fas fa-chess',
          content: JSON.stringify({
            items: [
              { context: 'A study found that students who listen to music while studying scored 15% lower on tests. However, the study only included students who listened to music with lyrics, and the sample size was 30 students from one university.', question: 'This study proves that all music is harmful for studying.', options: ['True', 'False'], correctIndex: 1, feedback: 'False! The study only tested music with lyrics, had a small sample, and was from one university — insufficient to generalize.' },
              { context: 'Company X reported 200% growth in revenue last year. However, their revenue went from $100,000 to $300,000. The industry average revenue for similar companies is $5 million.', question: 'Company X\\'s "200% growth" means they are now an industry leader.', options: ['True', 'False'], correctIndex: 1, feedback: 'False! While 200% sounds impressive, $300K is far below the $5M industry average. Percentages can be misleading.' },
              { context: 'A survey reports that 90% of dentists recommend Brand Z toothpaste. The survey was funded by Brand Z and asked dentists: "Would you recommend Brand Z or no toothpaste at all?"', question: 'The survey methodology is unbiased and reliable.', options: ['True', 'False'], correctIndex: 1, feedback: 'False! The survey has conflict of interest (funded by Brand Z) and uses a false dichotomy in its question.' },
              { context: 'Global temperatures have risen by 1.1°C since pre-industrial times. While 1.1 degrees seems small, this average includes oceans, which heat more slowly. Land temperatures in some regions have risen by 2-3°C.', question: 'The 1.1°C average accurately represents temperature changes in all regions.', options: ['True', 'False'], correctIndex: 1, feedback: 'False! The average masks significant regional variation, with some areas warming much more.' },
              { context: 'After a new speed camera was installed on Highway 9, accidents decreased by 40% at that location. However, accidents on the two adjacent roads increased by 25%.', question: 'The speed camera definitively improved overall road safety.', options: ['True', 'False'], correctIndex: 1, feedback: 'False! This could be displacement — drivers may simply use alternative routes, shifting rather than reducing accidents.' },
              { context: 'A historical text from 1850 states: "Women are naturally suited for domestic work and lack the constitution for intellectual pursuits." This was written by a prominent physician of the era.', question: 'The physician\\'s authority makes this claim credible by modern scientific standards.', options: ['True', 'False'], correctIndex: 1, feedback: 'False! Appeal to authority doesn\\'t validate claims. Modern science has thoroughly debunked gender-based intellectual limitations.' },
            ]
          })
        },
      ]
    },
  ]
};

// ========================== PARSE CONTENT ==========================
const parseContent = (content: string) => {
  try { 
    // Strip markdown code blocks if present
    let clean = content.trim();
    if (clean.startsWith('\`\`\`')) {
      clean = clean.replace(/^\`\`\`(?:json)?\\n?/, '').replace(/\\n?\`\`\`$/, '');
    }
    return JSON.parse(clean); 
  } catch { return null; }
};

const getItems = (activity: Activity): any[] => {
  const data = parseContent(activity.content);
  if (!data) return [];

  // 1. Handle direct arrays (e.g. matching, scramble from prompt)
  if (Array.isArray(data)) {
    // Normalize based on activity type
    if (activity.type === 'matching') return data; 
    if (activity.type === 'scramble') return data;
    return data;
  }

  // 2. Handle "items" or "pairs" (native format)
  if (data.items) return data.items;
  if (data.pairs) return data.pairs;

  // 3. Handle "questions" (multiple_choice, true_false, contextual_mc, listening_mc)
  if (data.questions) {
    return data.questions.map((q: any) => {
      // Calculate correctIndex if 'a' is provided (answer string)
      let correctIndex = q.correctIndex;
      if (correctIndex === undefined && q.a && q.options) {
        correctIndex = q.options.indexOf(q.a);
      }
      // If still undefined, default to 0 (shouldn't happen with valid prompt)
      if (correctIndex === undefined || correctIndex === -1) correctIndex = 0;

      return {
        ...q,
        question: q.q || q.question,
        correctIndex,
        feedback: q.feedback || '',
        // Context/AudioScript might be at top level for contextual_mc/listening_mc
        context: q.context || data.context,
        audioScript: q.audioScript || data.audioScript
      };
    });
  }

  // 4. Handle "sentences" (dictation, gap_fill, error_correction)
  if (data.sentences) {
    return data.sentences.map((s: any) => {
      if (typeof s === 'string') return { text: s };
      
      // Handle gap_fill conversion to cloze format
      if (activity.type === 'cloze' && s.answer && s.sentence) {
        // Replace ___ or ___ (hint) with [answer]
        // Regex matches ___ followed optionally by (hint)
        const text = s.sentence.replace(/___(?:\\s*\\([^)]+\\))?/, \`[\${s.answer}]\`);
        return { ...s, text, hint: s.hint || '' };
      }

      return { ...s, text: s.sentence || s.text };
    });
  }

  // 5. Handle "words" (pronunciation)
  if (data.words) {
    return data.words.map((w: any) => ({
      ...w,
      text: w.word, // PronunciationQ expects 'text'
      audioScript: w.audioScript
    }));
  }

  return [];
};

// ========================== CONFETTI COMPONENT ==========================
const Confetti: FC<{ active: boolean }> = memo(({ active }) => {
  if (!active) return null;
  const pieces = useMemo(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i, left: \`\${rand(0, 100)}%\`, color: [T.green, T.gold, T.purple, T.blue, T.orange, T.pink][rand(0, 5)],
      delay: \`\${Math.random() * 0.5}s\`, dur: \`\${1 + Math.random() * 2}s\`, size: rand(6, 12),
    })), []);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', bottom: 0, left: p.left, width: p.size, height: p.size,
          backgroundColor: p.color, borderRadius: rand(0, 1) ? '50%' : '2px',
          animation: \`duo-confetti \${p.dur} \${p.delay} ease-out forwards\`,
        }} />
      ))}
    </div>
  );
});

// ========================== XP POPUP ==========================
const XPPopup: FC<{ xp: number; show: boolean }> = memo(({ xp, show }) => {
  if (!show || xp <= 0) return null;
  return (
    <div style={{
      position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)',
      fontSize: 28, fontWeight: 900, color: T.gold, zIndex: 9999, pointerEvents: 'none',
      animation: 'duo-xpFloat 1s ease-out forwards', textShadow: \`0 0 20px \${T.gold}\`,
    }}>
      +{xp} XP
    </div>
  );
});

// ========================== SMALL UI COMPONENTS ==========================
const s = {
  btn: (color: string, full = true): CSSProperties => ({
    background: full ? color : 'transparent', color: full ? '#fff' : color,
    border: full ? \`3px solid \${color}\` : \`2px solid \${color}\`,
    borderBottom: full ? \`4px solid \${color === T.green ? T.greenDk : color === T.purple ? T.purpleDk : color === T.blue ? T.blueDk : color === T.red ? T.redDk : color === T.orange ? T.orangeDk : color === T.gold ? T.goldDk : color}\` : \`2px solid \${color}\`,
    padding: '14px 32px', borderRadius: T.radiusSm, fontWeight: 800, fontSize: 15,
    letterSpacing: 0.8, textTransform: 'uppercase' as const, cursor: 'pointer',
    transition: T.transition, display: 'inline-flex', alignItems: 'center', gap: 8,
    justifyContent: 'center', width: '100%',
  }),
  card: (extra: CSSProperties = {}): CSSProperties => ({
    background: T.card, borderRadius: T.radius, border: \`2px solid \${T.border}\`,
    padding: 20, ...extra,
  }),
  flexCenter: { display: 'flex', alignItems: 'center', justifyContent: 'center' } as CSSProperties,
  flexBetween: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } as CSSProperties,
  flexCol: { display: 'flex', flexDirection: 'column' as const },
};

const Badge: FC<{ icon: string; value: string | number; color: string; label?: string; onClick?: () => void }> = memo(({ icon, value, color, label, onClick }) => (
  <div onClick={onClick} style={{
    ...s.flexCenter, flexDirection: 'column', gap: 2, cursor: onClick ? 'pointer' : 'default',
    padding: '6px 12px', borderRadius: T.radiusXs, transition: T.transition,
    background: onClick ? T.surfaceLt : 'transparent',
  }}>
    <div style={{ fontSize: 20 }}>{icon}</div>
    <div style={{ fontWeight: 800, fontSize: 14, color }}>{value}</div>
    {label && <div style={{ fontSize: 10, color: T.textDim }}>{label}</div>}
  </div>
));

const ProgressBar: FC<{ pct: number; color?: string; height?: number; showLabel?: boolean; animated?: boolean }> = memo(
  ({ pct, color = T.green, height = 12, showLabel = false, animated = true }) => (
    <div style={{ width: '100%', position: 'relative' }}>
      <div style={{
        height, borderRadius: height / 2, background: T.surfaceLt, overflow: 'hidden', width: '100%',
      }}>
        <div style={{
          height: '100%', borderRadius: height / 2, background: \`linear-gradient(90deg, \${color}, \${color}dd)\`,
          width: \`\${clamp(pct, 0, 100)}%\`, transition: animated ? 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          boxShadow: \`0 0 8px \${color}66\`,
        }} />
      </div>
      {showLabel && (
        <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: T.textSec, marginTop: 4 }}>
          {Math.round(pct)}%
        </div>
      )}
    </div>
  )
);

const Hearts: FC<{ current: number; max: number }> = memo(({ current, max }) => (
  <div style={{ ...s.flexCenter, gap: 4 }}>
    {Array.from({ length: max }, (_, i) => (
      <span key={i} style={{
        fontSize: 18, filter: i < current ? 'none' : 'grayscale(1) opacity(0.3)',
        animation: i === current - 1 && current <= 2 ? 'duo-heartBeat 1s ease infinite' : 'none',
      }}>❤️</span>
    ))}
  </div>
));

const ComboIndicator: FC<{ combo: number }> = memo(({ combo }) => {
  if (combo < 2) return null;
  const tier = combo >= 20 ? { color: T.gold, label: 'LEGENDARY', icon: '👑' }
    : combo >= 15 ? { color: T.orange, label: 'AMAZING', icon: '🔥' }
    : combo >= 10 ? { color: T.purple, label: 'INCREDIBLE', icon: '⚡' }
    : combo >= 5 ? { color: T.blue, label: 'GREAT', icon: '💫' }
    : { color: T.green, label: 'NICE', icon: '✨' };

  return (
    <div style={{
      ...s.flexCenter, gap: 6, padding: '8px 16px', borderRadius: 20,
      background: \`\${tier.color}22\`, border: \`2px solid \${tier.color}44\`,
      animation: 'duo-pulse 1s ease infinite',
    }}>
      <span style={{ fontSize: 18 }}>{tier.icon}</span>
      <span style={{ fontWeight: 900, fontSize: 14, color: tier.color, animation: 'duo-comboGlow 2s ease infinite' }}>
        {combo}x {tier.label}
      </span>
    </div>
  );
});

const SkillTag: FC<{ icon: string; label: string }> = memo(({ icon, label }) => (
  <div style={{
    ...s.flexCenter, gap: 6, padding: '4px 12px', borderRadius: 20,
    background: T.surfaceLt, fontSize: 12, color: T.textSec, fontWeight: 600,
  }}>
    <i className={icon} style={{ fontSize: 11 }} />
    {label}
  </div>
));

const Timer: FC<{ startTime: number }> = memo(({ startTime }) => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(interval);
  }, [startTime]);
  return <span style={{ fontWeight: 700, fontSize: 13, color: T.textDim, fontVariantNumeric: 'tabular-nums' }}>{formatTime(elapsed)}</span>;
});

// ========================== QUESTION COMPONENTS ==========================

// --- MULTIPLE CHOICE ---
const MultipleChoiceQ: FC<{
  item: MCItem; onAnswer: (correct: boolean) => void; disabled: boolean;
}> = memo(({ item, onAnswer, disabled }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSelect = (idx: number) => {
    if (disabled || submitted) return;
    sfx.tap();
    setSelected(idx);
  };

  const handleCheck = () => {
    if (selected === null || submitted) return;
    setSubmitted(true);
    const correct = selected === item.correctIndex;
    if (correct) sfx.correct(); else sfx.incorrect();
    setTimeout(() => onAnswer(correct), 1200);
  };

  useEffect(() => {
    if (item.audioScript) speak(item.audioScript);
  }, [item.audioScript]);

  return (
    <div style={{ ...s.flexCol, gap: 16, animation: 'duo-slideUp 0.4s ease' }}>
      {item.context && (
        <div style={{ ...s.card(), fontSize: 14, lineHeight: 1.7, color: T.textSec, maxHeight: 160, overflow: 'auto' }}>
          {item.context}
        </div>
      )}
      {item.audioScript && (
        <button onClick={() => speak(item.audioScript!)} style={{
          ...s.btn(T.blue, false), padding: '10px 20px', width: 'auto', alignSelf: 'flex-start',
        }}>
          <i className="fas fa-volume-up" /> Listen Again
        </button>
      )}
      <p style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.5 }}>{item.question}</p>
      <div style={{ ...s.flexCol, gap: 10 }}>
        {item.options.map((opt, idx) => {
          const isCorrect = idx === item.correctIndex;
          const isSelected = idx === selected;
          let bg = T.card;
          let border = T.border;
          let color = T.text;

          if (submitted && isSelected) {
            bg = isCorrect ? T.correctBg : T.incorrectBg;
            border = isCorrect ? T.green : T.red;
            color = isCorrect ? T.green : T.red;
          } else if (submitted && isCorrect) {
            bg = T.correctBg; border = T.green; color = T.green;
          } else if (isSelected) {
            bg = T.surfaceLt; border = T.blue; color = T.blue;
          }

          return (
            <button key={idx} onClick={() => handleSelect(idx)} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
              borderRadius: T.radiusSm, background: bg, border: \`2px solid \${border}\`,
              color, fontWeight: 600, fontSize: 15, textAlign: 'left' as const,
              transition: T.transition, animation: submitted && isSelected && !isCorrect ? 'duo-shake 0.4s ease' : 'none',
              cursor: disabled || submitted ? 'default' : 'pointer', opacity: submitted && !isSelected && !isCorrect ? 0.5 : 1,
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: 8, border: \`2px solid \${border}\`, ...s.flexCenter,
                fontSize: 13, fontWeight: 800, flexShrink: 0,
                background: isSelected ? (submitted ? (isCorrect ? T.green : T.red) : T.blue) : 'transparent',
                color: isSelected ? '#fff' : border,
              }}>
                {String.fromCharCode(65 + idx)}
              </span>
              <span>{opt}</span>
              {submitted && isCorrect && <i className="fas fa-check-circle" style={{ marginLeft: 'auto', color: T.green }} />}
              {submitted && isSelected && !isCorrect && <i className="fas fa-times-circle" style={{ marginLeft: 'auto', color: T.red }} />}
            </button>
          );
        })}
      </div>
      {submitted && (
        <div style={{
          ...s.card({ background: selected === item.correctIndex ? T.correctBg : T.incorrectBg, borderColor: selected === item.correctIndex ? T.green : T.red }),
          animation: 'duo-slideUp 0.3s ease', fontSize: 14, lineHeight: 1.6, color: T.textSec,
        }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: selected === item.correctIndex ? T.green : T.red, marginBottom: 6 }}>
            {selected === item.correctIndex ? '✅ Correct!' : '❌ Incorrect'}
          </div>
          {item.feedback}
        </div>
      )}
      {!submitted && (
        <button onClick={handleCheck} disabled={selected === null} style={{
          ...s.btn(selected !== null ? T.green : T.border),
          opacity: selected !== null ? 1 : 0.5,
        }}>
          CHECK
        </button>
      )}
    </div>
  );
});

// --- MATCHING ---
const MatchingQ: FC<{
  items: MatchPair[]; onAnswer: (correct: boolean) => void; disabled: boolean;
}> = memo(({ items, onAnswer, disabled }) => {
  const [leftSel, setLeftSel] = useState<number | null>(null);
  const [rightSel, setRightSel] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [incorrect, setIncorrect] = useState<[number, number] | null>(null);
  const shuffledRight = useMemo(() => {
    const indexed = items.map((p, i) => ({ text: p.right, origIdx: i }));
    return shuffle(indexed);
  }, [items]);
  const [correctCount, setCorrectCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    if (leftSel !== null && rightSel !== null) {
      const rightOrigIdx = shuffledRight[rightSel].origIdx;
      if (leftSel === rightOrigIdx) {
        sfx.correct();
        setMatched(prev => new Set([...prev, leftSel]));
        setCorrectCount(c => c + 1);
        setLeftSel(null); setRightSel(null);
      } else {
        sfx.incorrect();
        setIncorrect([leftSel, rightSel]);
        setErrorCount(c => c + 1);
        setTimeout(() => { setIncorrect(null); setLeftSel(null); setRightSel(null); }, 800);
      }
    }
  }, [leftSel, rightSel, shuffledRight]);

  useEffect(() => {
    if (matched.size === items.length) {
      setTimeout(() => onAnswer(errorCount === 0), 600);
    }
  }, [matched.size, items.length, errorCount, onAnswer]);

  return (
    <div style={{ animation: 'duo-slideUp 0.4s ease' }}>
      <p style={{ fontSize: 14, color: T.textDim, marginBottom: 12, textAlign: 'center' }}>
        Tap a word, then tap its match • {matched.size}/{items.length}
      </p>
      <ProgressBar pct={(matched.size / items.length) * 100} color={T.purple} height={6} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
        <div style={{ ...s.flexCol, gap: 8 }}>
          {items.map((pair, idx) => {
            const isMatched = matched.has(idx);
            const isSelected = leftSel === idx;
            const isIncorrect = incorrect && incorrect[0] === idx;
            return (
              <button key={\`l-\${idx}\`} onClick={() => { if (!isMatched && !disabled) { sfx.tap(); setLeftSel(idx); } }}
                style={{
                  padding: '12px 14px', borderRadius: T.radiusSm, fontWeight: 700, fontSize: 14,
                  background: isMatched ? (['#2563eb', '#059669', '#d97706', '#db2777', '#7c3aed', '#0891b2', '#ea580c', '#14b8a6', '#e11d48', '#4f46e5'][idx % 10]) : isIncorrect ? T.incorrectBg : isSelected ? T.surfaceLt : T.card,
                  border: \`2px solid \${isMatched ? (['#2563eb', '#059669', '#d97706', '#db2777', '#7c3aed', '#0891b2', '#ea580c', '#14b8a6', '#e11d48', '#4f46e5'][idx % 10]) : isIncorrect ? T.red : isSelected ? T.blue : T.border}\`,
                  color: isMatched ? '#ffffff' : isIncorrect ? T.red : isSelected ? T.blue : T.text,
                  transition: T.transition, cursor: isMatched || disabled ? 'default' : 'pointer',
                  opacity: 1,
                  animation: isIncorrect ? 'duo-shake 0.4s ease' : isMatched ? 'duo-bounceIn 0.3s ease' : 'none',
                }}>
                {pair.left} {isMatched && '✓'}
              </button>
            );
          })}
        </div>
        <div style={{ ...s.flexCol, gap: 8 }}>
          {shuffledRight.map((item, idx) => {
            const isMatched = matched.has(item.origIdx);
            const isSelected = rightSel === idx;
            const isIncorrect = incorrect && incorrect[1] === idx;
            return (
              <button key={\`r-\${idx}\`} onClick={() => { if (!isMatched && !disabled) { sfx.tap(); setRightSel(idx); } }}
                style={{
                  padding: '12px 14px', borderRadius: T.radiusSm, fontWeight: 600, fontSize: 13,
                  background: isMatched ? (['#2563eb', '#059669', '#d97706', '#db2777', '#7c3aed', '#0891b2', '#ea580c', '#14b8a6', '#e11d48', '#4f46e5'][item.origIdx % 10]) : isIncorrect ? T.incorrectBg : isSelected ? T.surfaceLt : T.card,
                  border: \`2px solid \${isMatched ? (['#2563eb', '#059669', '#d97706', '#db2777', '#7c3aed', '#0891b2', '#ea580c', '#14b8a6', '#e11d48', '#4f46e5'][item.origIdx % 10]) : isIncorrect ? T.red : isSelected ? T.blue : T.border}\`,
                  color: isMatched ? '#ffffff' : isIncorrect ? T.red : isSelected ? T.blue : T.textSec,
                  transition: T.transition, cursor: isMatched || disabled ? 'default' : 'pointer',
                  opacity: 1, textAlign: 'left' as const,
                  animation: isIncorrect ? 'duo-shake 0.4s ease' : isMatched ? 'duo-bounceIn 0.3s ease' : 'none',
                }}>
                {item.text} {isMatched && '✓'}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

// --- SCRAMBLE ---
const ScrambleQ: FC<{
  item: ScrambleItem; onAnswer: (correct: boolean) => void; disabled: boolean;
}> = memo(({ item, onAnswer, disabled }) => {
  const chunks = useMemo(() => item.sentence.split('|').map(s => s.trim()).filter(Boolean), [item.sentence]);
  const shuffled = useMemo(() => shuffle(chunks.map((c, i) => ({ text: c, idx: i }))), [chunks]);
  const [placed, setPlaced] = useState<{ text: string; idx: number }[]>([]);
  const [avail, setAvail] = useState(shuffled);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handlePick = (item: { text: string; idx: number }) => {
    if (disabled || submitted) return;
    sfx.tap();
    setPlaced(prev => [...prev, item]);
    setAvail(prev => prev.filter(a => a.idx !== item.idx));
  };

  const handleRemove = (item: { text: string; idx: number }) => {
    if (disabled || submitted) return;
    sfx.tap();
    setPlaced(prev => prev.filter(a => a.idx !== item.idx));
    setAvail(prev => [...prev, item]);
  };

  const handleCheck = () => {
    if (placed.length !== chunks.length || submitted) return;
    setSubmitted(true);
    const answer = placed.map(p => p.text).join(' ');
    const correct = chunks.join(' ');
    const ok = answer === correct;
    setIsCorrect(ok);
    if (ok) sfx.correct(); else sfx.incorrect();
    setTimeout(() => onAnswer(ok), 1200);
  };

  return (
    <div style={{ ...s.flexCol, gap: 16, animation: 'duo-slideUp 0.4s ease' }}>
      <div style={{
        ...s.card(), minHeight: 80, display: 'flex', flexWrap: 'wrap' as const, gap: 8,
        alignContent: 'flex-start', borderStyle: 'dashed',
        borderColor: submitted ? (isCorrect ? T.green : T.red) : T.border,
        animation: submitted && !isCorrect ? 'duo-shake 0.4s ease' : 'none',
      }}>
        {placed.length === 0 && <span style={{ color: T.textDim, fontSize: 14 }}>Tap words below to build the sentence...</span>}
        {placed.map((item, idx) => (
          <button key={\`p-\${item.idx}\`} onClick={() => handleRemove(item)} style={{
            padding: '8px 14px', borderRadius: T.radiusXs, fontWeight: 700, fontSize: 14,
            background: submitted ? (isCorrect ? T.correctBg : T.incorrectBg) : T.surfaceLt,
            border: \`2px solid \${submitted ? (isCorrect ? T.green : T.red) : T.blue}\`,
            color: submitted ? (isCorrect ? T.green : T.red) : T.blue,
            animation: \`duo-bounceIn 0.2s ease \${idx * 0.05}s both\`, cursor: submitted ? 'default' : 'pointer',
          }}>
            {item.text}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, justifyContent: 'center' }}>
        {avail.map(item => (
          <button key={\`a-\${item.idx}\`} onClick={() => handlePick(item)} style={{
            padding: '8px 14px', borderRadius: T.radiusXs, fontWeight: 700, fontSize: 14,
            background: T.card, border: \`2px solid \${T.border}\`, color: T.text,
            cursor: disabled || submitted ? 'default' : 'pointer', transition: T.transition,
          }}>
            {item.text}
          </button>
        ))}
      </div>
      {submitted && (
        <div style={{
          ...s.card({ background: isCorrect ? T.correctBg : T.incorrectBg, borderColor: isCorrect ? T.green : T.red }),
          animation: 'duo-slideUp 0.3s ease', fontSize: 14, color: T.textSec,
        }}>
          <div style={{ fontWeight: 800, color: isCorrect ? T.green : T.red, marginBottom: 4 }}>
            {isCorrect ? '✅ Perfect!' : '❌ Not quite right'}
          </div>
          {!isCorrect && <p style={{ marginBottom: 4 }}>Correct: {chunks.join(' ')}</p>}
          {item.feedback}
        </div>
      )}
      {!submitted && (
        <button onClick={handleCheck} disabled={placed.length !== chunks.length} style={{
          ...s.btn(placed.length === chunks.length ? T.green : T.border),
          opacity: placed.length === chunks.length ? 1 : 0.5,
        }}>
          CHECK
        </button>
      )}
    </div>
  );
});

// --- DICTATION ---
const DictationQ: FC<{
  item: DictItem; onAnswer: (correct: boolean) => void; disabled: boolean;
}> = memo(({ item, onAnswer, disabled }) => {
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [played, setPlayed] = useState(false);

  const handlePlay = () => {
    speak(item.audioScript || item.text);
    setPlayed(true);
  };

  useEffect(() => { handlePlay(); }, []);

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\\s]/g, '').replace(/\\s+/g, ' ').trim();

  const handleCheck = () => {
    if (!input.trim() || submitted) return;
    setSubmitted(true);
    const ok = normalize(input) === normalize(item.text);
    setIsCorrect(ok);
    if (ok) sfx.correct(); else sfx.incorrect();
    setTimeout(() => onAnswer(ok), 1200);
  };

  const similarity = useMemo(() => {
    if (!submitted || isCorrect) return 1;
    const a = normalize(input).split(' ');
    const b = normalize(item.text).split(' ');
    const matches = a.filter(w => b.includes(w)).length;
    return matches / Math.max(b.length, 1);
  }, [submitted, isCorrect, input, item.text]);

  return (
    <div style={{ ...s.flexCol, gap: 16, animation: 'duo-slideUp 0.4s ease' }}>
      <div style={{ ...s.flexCenter, gap: 16 }}>
        <button onClick={handlePlay} style={{
          width: 80, height: 80, borderRadius: '50%', background: \`\${T.blue}22\`,
          border: \`3px solid \${T.blue}\`, ...s.flexCenter, cursor: 'pointer',
          animation: played ? 'none' : 'duo-pulse 2s ease infinite', transition: T.transition,
        }}>
          <i className="fas fa-volume-up" style={{ fontSize: 28, color: T.blue }} />
        </button>
        <button onClick={() => speak(item.audioScript || item.text, 0.6)} style={{
          width: 50, height: 50, borderRadius: '50%', background: \`\${T.blue}11\`,
          border: \`2px solid \${T.blue}44\`, ...s.flexCenter, cursor: 'pointer',
        }}>
          <i className="fas fa-turtle" style={{ fontSize: 16, color: T.blue }} />
          🐢
        </button>
      </div>
      <p style={{ fontSize: 14, color: T.textDim, textAlign: 'center' }}>Type what you hear</p>
      <input value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleCheck()}
        disabled={disabled || submitted} placeholder="Type here..."
        style={{
          padding: '14px 18px', borderRadius: T.radiusSm, fontSize: 16, fontWeight: 600,
          background: T.card, border: \`2px solid \${submitted ? (isCorrect ? T.green : T.red) : T.border}\`,
          color: T.text, width: '100%', transition: T.transition,
          animation: submitted && !isCorrect ? 'duo-shake 0.4s ease' : 'none',
        }}
      />
      {submitted && (
        <div style={{
          ...s.card({ background: isCorrect ? T.correctBg : T.incorrectBg, borderColor: isCorrect ? T.green : T.red }),
          animation: 'duo-slideUp 0.3s ease', fontSize: 14, color: T.textSec,
        }}>
          <div style={{ fontWeight: 800, color: isCorrect ? T.green : T.red, marginBottom: 4 }}>
            {isCorrect ? '✅ Perfect!' : \`❌ \${similarity > 0.6 ? 'Almost!' : 'Not quite'} (\${Math.round(similarity * 100)}% match)\`}
          </div>
          {!isCorrect && (
            <p style={{ marginBottom: 8, fontFamily: 'monospace', fontSize: 13 }}>
              <strong>Correct:</strong> {item.text}
            </p>
          )}
          {item.feedback}
        </div>
      )}
      {!submitted && (
        <button onClick={handleCheck} disabled={!input.trim()} style={{
          ...s.btn(input.trim() ? T.green : T.border), opacity: input.trim() ? 1 : 0.5,
        }}>
          CHECK
        </button>
      )}
    </div>
  );
});

// --- PRONUNCIATION ---
const PronunciationQ: FC<{
  item: DictItem; onAnswer: (correct: boolean) => void; disabled: boolean;
}> = memo(({ item, onAnswer, disabled }) => {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startRecording = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      // Fallback: auto-pass
      setSubmitted(true); setIsCorrect(true); sfx.correct();
      setTimeout(() => onAnswer(true), 1200);
      return;
    }
    const recognition = new SR();
    recognition.lang = 'en-US'; recognition.continuous = false; recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setTranscript(text);
      setRecording(false);
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\\s]/g, '').replace(/\\s+/g, ' ').trim();
      const a = normalize(text).split(' ');
      const b = normalize(item.text).split(' ');
      const match = a.filter(w => b.includes(w)).length / b.length;
      const ok = match >= 0.7;
      setIsCorrect(ok); setSubmitted(true);
      if (ok) sfx.correct(); else sfx.incorrect();
      setTimeout(() => onAnswer(ok), 1200);
    };
    recognition.onerror = () => { setRecording(false); };
    recognition.onend = () => { setRecording(false); };
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  };

  const handleSkip = () => {
    setSubmitted(true); setIsCorrect(true); sfx.correct();
    setTimeout(() => onAnswer(true), 600);
  };

  return (
    <div style={{ ...s.flexCol, gap: 16, animation: 'duo-slideUp 0.4s ease', alignItems: 'center' }}>
      <div style={{ ...s.card(), textAlign: 'center', width: '100%' }}>
        <i className="fas fa-microphone" style={{ fontSize: 24, color: T.purple, marginBottom: 8 }} />
        <p style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.6 }}>{item.text}</p>
      </div>
      <button onClick={() => speak(item.text, 0.85)} style={{ ...s.btn(T.blue, false), width: 'auto', padding: '10px 20px' }}>
        <i className="fas fa-volume-up" /> Listen
      </button>
      {!submitted && (
        <>
          <button onClick={startRecording} disabled={recording || disabled} style={{
            width: 100, height: 100, borderRadius: '50%',
            background: recording ? \`\${T.red}33\` : \`\${T.purple}22\`,
            border: \`4px solid \${recording ? T.red : T.purple}\`,
            ...s.flexCenter, cursor: 'pointer',
            animation: recording ? 'duo-pulse 0.8s ease infinite' : 'none',
          }}>
            <i className={recording ? 'fas fa-stop' : 'fas fa-microphone'} style={{
              fontSize: 36, color: recording ? T.red : T.purple,
            }} />
          </button>
          <p style={{ fontSize: 13, color: T.textDim }}>{recording ? 'Listening...' : 'Tap to speak'}</p>
          <button onClick={handleSkip} style={{ fontSize: 13, color: T.textDim, background: 'none', textDecoration: 'underline', cursor: 'pointer' }}>
            Can't use microphone? Skip
          </button>
        </>
      )}
      {submitted && (
        <div style={{
          ...s.card({ background: isCorrect ? T.correctBg : T.incorrectBg, borderColor: isCorrect ? T.green : T.red, width: '100%' }),
          animation: 'duo-slideUp 0.3s ease', fontSize: 14, color: T.textSec, textAlign: 'center',
        }}>
          <div style={{ fontWeight: 800, color: isCorrect ? T.green : T.red, marginBottom: 4 }}>
            {isCorrect ? '✅ Great pronunciation!' : '❌ Try again next time'}
          </div>
          {transcript && <p style={{ marginBottom: 4, color: T.textDim }}>You said: "{transcript}"</p>}
          {item.feedback}
        </div>
      )}
    </div>
  );
});

// --- CLOZE ---
const ClozeQ: FC<{
  item: ClozeItem; onAnswer: (correct: boolean) => void; disabled: boolean;
}> = memo(({ item, onAnswer, disabled }) => {
  const match = item.text.match(/\\[([^\\]]+)\\]/);
  const answer = match ? match[1] : '';
  const parts = item.text.split(/\\[[^\\]]+\\]/);
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleCheck = () => {
    if (!input.trim() || submitted) return;
    setSubmitted(true);
    const ok = input.trim().toLowerCase() === answer.toLowerCase();
    setIsCorrect(ok);
    if (ok) sfx.correct(); else sfx.incorrect();
    setTimeout(() => onAnswer(ok), 1200);
  };

  return (
    <div style={{ ...s.flexCol, gap: 16, animation: 'duo-slideUp 0.4s ease' }}>
      <div style={{ ...s.card(), fontSize: 17, fontWeight: 600, lineHeight: 2 }}>
        {parts[0]}
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCheck()}
          disabled={disabled || submitted}
          placeholder="..."
          style={{
            display: 'inline-block', width: Math.max(80, answer.length * 12 + 20), padding: '4px 10px',
            borderRadius: T.radiusXs, fontSize: 16, fontWeight: 700, textAlign: 'center',
            background: submitted ? (isCorrect ? T.correctBg : T.incorrectBg) : T.surfaceLt,
            border: \`2px solid \${submitted ? (isCorrect ? T.green : T.red) : T.blue}\`,
            color: submitted ? (isCorrect ? T.green : T.red) : T.text,
            margin: '0 4px', animation: submitted && !isCorrect ? 'duo-shake 0.4s ease' : 'none',
          }}
        />
                {parts[1] || ''}
      </div>
      {item.hint && <p style={{ fontSize: 13, color: T.textDim, fontStyle: 'italic' }}>💡 Hint: {item.hint}</p>}
      {submitted && (
        <div style={{
          ...s.card({ background: isCorrect ? T.correctBg : T.incorrectBg, borderColor: isCorrect ? T.green : T.red }),
          animation: 'duo-slideUp 0.3s ease', fontSize: 14, color: T.textSec,
        }}>
          <div style={{ fontWeight: 800, color: isCorrect ? T.green : T.red, marginBottom: 4 }}>
            {isCorrect ? '✅ Correct!' : '❌ Incorrect'}
          </div>
          {!isCorrect && <p style={{ marginBottom: 4 }}>Correct answer: <strong>{answer}</strong></p>}
          {item.feedback}
        </div>
      )}
      {!submitted && (
        <button onClick={handleCheck} disabled={!input.trim()} style={{
          ...s.btn(input.trim() ? T.green : T.border), opacity: input.trim() ? 1 : 0.5,
        }}>
          CHECK
        </button>
      )}
    </div>
  );
});

// --- AUDIO MATCHING ---
const AudioMatchingQ: FC<{
  items: AudioMatchPair[]; onAnswer: (correct: boolean) => void; disabled: boolean;
}> = memo(({ items, onAnswer, disabled }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedDef, setSelectedDef] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const shuffledDefs = useMemo(() => shuffle(items.map((p, i) => ({ def: p.definition, origIdx: i }))), [items]);
  const [usedDefs, setUsedDefs] = useState<Set<number>>(new Set());

  const current = items[currentIdx];

  useEffect(() => {
    if (current) speak(current.audioScript);
  }, [currentIdx]);

  const handleSelect = (idx: number) => {
    if (disabled || submitted || usedDefs.has(idx)) return;
    sfx.tap();
    setSelectedDef(idx);
  };

  const handleCheck = () => {
    if (selectedDef === null || submitted) return;
    setSubmitted(true);
    const correct = shuffledDefs[selectedDef].origIdx === currentIdx;
    if (correct) sfx.correct(); else sfx.incorrect();
    setResults(prev => [...prev, correct]);
    setUsedDefs(prev => new Set([...prev, selectedDef]));

    setTimeout(() => {
      if (currentIdx < items.length - 1) {
        setCurrentIdx(i => i + 1);
        setSelectedDef(null);
        setSubmitted(false);
      } else {
        const finalResults = [...results, correct];
        const allCorrect = finalResults.every(r => r);
        setTimeout(() => onAnswer(allCorrect), 400);
      }
    }, 1000);
  };

  return (
    <div style={{ ...s.flexCol, gap: 16, animation: 'duo-slideUp 0.4s ease' }}>
      <div style={{ ...s.flexBetween, marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: T.textDim }}>Match {currentIdx + 1} of {items.length}</span>
        <div style={{ ...s.flexCenter, gap: 4 }}>
          {results.map((r, i) => (
            <span key={i} style={{ fontSize: 14 }}>{r ? '✅' : '❌'}</span>
          ))}
        </div>
      </div>
      <ProgressBar pct={((currentIdx + (submitted ? 1 : 0)) / items.length) * 100} color={T.blue} />
      
      <div style={{ ...s.flexCenter, flexDirection: 'column', gap: 12, padding: 20 }}>
        <button onClick={() => speak(current.audioScript)} style={{
          width: 90, height: 90, borderRadius: '50%', background: \`\${T.blue}22\`,
          border: \`4px solid \${T.blue}\`, ...s.flexCenter, cursor: 'pointer',
        }}>
          <i className="fas fa-volume-up" style={{ fontSize: 32, color: T.blue }} />
        </button>
        <p style={{ fontWeight: 800, fontSize: 18, color: T.blue }}>{current.term}</p>
      </div>

      <p style={{ fontSize: 14, color: T.textDim, textAlign: 'center' }}>Select the matching definition:</p>

      <div style={{ ...s.flexCol, gap: 8 }}>
        {shuffledDefs.map((item, idx) => {
          const isUsed = usedDefs.has(idx);
          const isSelected = selectedDef === idx;
          const isCorrectAnswer = item.origIdx === currentIdx;
          const showCorrect = submitted && isCorrectAnswer;
          const showIncorrect = submitted && isSelected && !isCorrectAnswer;

          return (
            <button key={idx} onClick={() => handleSelect(idx)} disabled={isUsed && !isSelected}
              style={{
                padding: '14px 18px', borderRadius: T.radiusSm, fontSize: 14, fontWeight: 600,
                textAlign: 'left' as const,
                background: showCorrect ? T.correctBg : showIncorrect ? T.incorrectBg : isSelected ? T.surfaceLt : T.card,
                border: \`2px solid \${showCorrect ? T.green : showIncorrect ? T.red : isSelected ? T.blue : T.border}\`,
                color: showCorrect ? T.green : showIncorrect ? T.red : isUsed ? T.textDim : T.text,
                opacity: isUsed && !showCorrect && !showIncorrect ? 0.4 : 1,
                cursor: isUsed || disabled ? 'default' : 'pointer', transition: T.transition,
                animation: showIncorrect ? 'duo-shake 0.4s ease' : showCorrect ? 'duo-bounceIn 0.3s ease' : 'none',
              }}>
              {item.def}
              {showCorrect && ' ✓'}
            </button>
          );
        })}
      </div>

      {submitted && (
        <div style={{
          ...s.card({ background: results[results.length - 1] ? T.correctBg : T.incorrectBg }),
          animation: 'duo-slideUp 0.3s ease', fontSize: 13, color: T.textSec,
        }}>
          {current.feedback}
        </div>
      )}

      {!submitted && (
        <button onClick={handleCheck} disabled={selectedDef === null} style={{
          ...s.btn(selectedDef !== null ? T.green : T.border),
          opacity: selectedDef !== null ? 1 : 0.5,
        }}>
          CHECK
        </button>
      )}
    </div>
  );
});

// --- TRUE/FALSE (reuse MC) ---
const TrueFalseQ: FC<{
  item: MCItem; onAnswer: (correct: boolean) => void; disabled: boolean;
}> = memo(({ item, onAnswer, disabled }) => {
  return <MultipleChoiceQ item={item} onAnswer={onAnswer} disabled={disabled} />;
});

// ========================== LESSON VIEW ==========================
interface LessonState {
  sectionIdx: number;
  activityIdx: number;
  itemIdx: number;
  correct: number;
  incorrect: number;
  combo: number;
  maxCombo: number;
  startTime: number;
  newCards: FlashCard[];
}

const LessonView: FC<{
  data: WorksheetData;
  sectionIdx: number;
  activityIdx: number;
  hearts: number;
  onComplete: (result: LessonResult) => void;
  onExit: () => void;
  onHeartLost: () => void;
}> = memo(({ data, sectionIdx, activityIdx, hearts, onComplete, onExit, onHeartLost }) => {
  const section = data.sections[sectionIdx];
  const activity = section.activities[activityIdx];
  const items = getItems(activity);

  if (!items || items.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', background: T.bg, color: T.text }}>
        <h2 style={{ fontSize: 24, marginBottom: 10 }}>No Content Available</h2>
        <p style={{ color: T.textDim }}>This activity has no valid items.</p>
        <button onClick={onExit} style={{ marginTop: 20, ...s.btn(T.border) }}>Exit</button>
      </div>
    );
  }

  const [state, setState] = useState<LessonState>({
    sectionIdx, activityIdx, itemIdx: 0,
    correct: 0, incorrect: 0, combo: 0, maxCombo: 0,
    startTime: Date.now(), newCards: [],
  });

  const [showXp, setShowXp] = useState(false);
  const [lastXp, setLastXp] = useState(0);

  const currentItem = items[state.itemIdx];
  const progress = ((state.itemIdx) / items.length) * 100;

  const handleAnswer = useCallback((correct: boolean) => {
    setState(prev => {
      const newCombo = correct ? prev.combo + 1 : 0;
      const newMaxCombo = Math.max(prev.maxCombo, newCombo);
      const newCards = [...prev.newCards];

      if (!correct && currentItem) {
        const q = currentItem.question || currentItem.text || currentItem.sentence || currentItem.left || '';
        const a = currentItem.options?.[currentItem.correctIndex] || currentItem.right || currentItem.text || '';
        const fb = currentItem.feedback || '';
        newCards.push(createFlashCard(q, a, fb, activity.type as ActivityType));
      }

      if (correct && newCombo > 1) {
        sfx.combo(newCombo);
      }

      return {
        ...prev,
        correct: prev.correct + (correct ? 1 : 0),
        incorrect: prev.incorrect + (correct ? 0 : 1),
        combo: newCombo,
        maxCombo: newMaxCombo,
        newCards,
      };
    });

    if (!correct) {
      onHeartLost();
    } else {
      const xp = 10 + Math.min(state.combo, 10) * 2;
      setLastXp(xp);
      setShowXp(true);
      setTimeout(() => setShowXp(false), 1000);
    }

    setTimeout(() => {
      if (state.itemIdx < items.length - 1) {
        setState(prev => ({ ...prev, itemIdx: prev.itemIdx + 1 }));
      } else {
        const elapsed = Date.now() - state.startTime;
        const accuracy = (state.correct + (correct ? 1 : 0)) / items.length * 100;
        const baseXp = section.xpReward;
        const comboBonus = Math.floor(state.maxCombo * 2);
        const accuracyBonus = accuracy === 100 ? 20 : accuracy >= 80 ? 10 : 0;
        const totalXp = baseXp + comboBonus + accuracyBonus;

        onComplete({
          xp: totalXp,
          correct: state.correct + (correct ? 1 : 0),
          incorrect: state.incorrect + (correct ? 0 : 1),
          combo: Math.max(state.maxCombo, correct ? state.combo + 1 : state.combo),
          time: elapsed,
          accuracy,
          newCards: state.newCards,
        });
      }
    }, 1500);
  }, [state, items.length, currentItem, activity.type, section.xpReward, onComplete, onHeartLost]);

  const renderQuestion = () => {
    if (!currentItem) return null;
    const props = { onAnswer: handleAnswer, disabled: false };

    switch (activity.type) {
      case 'multiple_choice':
        return <MultipleChoiceQ item={currentItem as MCItem} {...props} />;
      case 'true_false':
        return <TrueFalseQ item={currentItem as MCItem} {...props} />;
      case 'matching':
        return <MatchingQ items={items as MatchPair[]} {...props} />;
      case 'scramble':
        return <ScrambleQ item={currentItem as ScrambleItem} {...props} />;
      case 'dictation':
        return <DictationQ item={currentItem as DictItem} {...props} />;
      case 'pronunciation':
        return <PronunciationQ item={currentItem as DictItem} {...props} />;
      case 'cloze':
        return <ClozeQ item={currentItem as ClozeItem} {...props} />;
      case 'audio_matching':
        return <AudioMatchingQ items={items as AudioMatchPair[]} {...props} />;
      default:
        return <p>Unknown activity type: {activity.type}</p>;
    }
  };

  // For matching and audio_matching, show only once
  if (activity.type === 'matching' || activity.type === 'audio_matching') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: T.bg }}>
        <XPPopup xp={lastXp} show={showXp} />
        
        {/* Header */}
        <div style={{
          padding: '16px 20px', background: T.surface, borderBottom: \`1px solid \${T.border}\`,
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <div style={{ ...s.flexBetween, marginBottom: 12 }}>
            <button onClick={onExit} style={{
              background: 'none', color: T.textDim, fontSize: 20, padding: 8, cursor: 'pointer',
            }}>
              <i className="fas fa-times" />
            </button>
            <Hearts current={hearts} max={5} />
            <ComboIndicator combo={state.combo} />
          </div>
          <ProgressBar pct={progress} color={section.color} height={10} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: 20, maxWidth: 600, margin: '0 auto', width: '100%' }}>
          <div style={{ ...s.flexBetween, marginBottom: 16 }}>
            <SkillTag icon={activity.skillIcon} label={activity.skillLabel} />
            <Timer startTime={state.startTime} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, color: T.text }}>
            {activity.title}
          </h3>
          {renderQuestion()}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: T.bg }}>
      <XPPopup xp={lastXp} show={showXp} />
      
      {/* Header */}
      <div style={{
        padding: '16px 20px', background: T.surface, borderBottom: \`1px solid \${T.border}\`,
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ ...s.flexBetween, marginBottom: 12 }}>
          <button onClick={onExit} style={{
            background: 'none', color: T.textDim, fontSize: 20, padding: 8, cursor: 'pointer',
          }}>
            <i className="fas fa-times" />
          </button>
          <Hearts current={hearts} max={5} />
          <ComboIndicator combo={state.combo} />
        </div>
        <ProgressBar pct={progress} color={section.color} height={10} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 20, maxWidth: 600, margin: '0 auto', width: '100%' }}>
        <div style={{ ...s.flexBetween, marginBottom: 16 }}>
          <SkillTag icon={activity.skillIcon} label={activity.skillLabel} />
          <Timer startTime={state.startTime} />
        </div>
        <div style={{ ...s.flexBetween, marginBottom: 8 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text }}>{activity.title}</h3>
          <span style={{ fontSize: 13, color: T.textDim }}>{state.itemIdx + 1}/{items.length}</span>
        </div>
        <div key={\`\${activity.type}-\${state.itemIdx}\`}>
          {renderQuestion()}
        </div>
      </div>
    </div>
  );
});

// ========================== COMPLETE SCREEN ==========================
const CompleteScreen: FC<{
  result: LessonResult;
  section: Section;
  activity: Activity;
  onContinue: () => void;
  totalXp: number;
  level: number;
  streak: number;
}> = memo(({ result, section, activity, onContinue, totalXp, level, streak }) => {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    sfx.complete();
    setTimeout(() => setShowConfetti(false), 3000);
  }, []);

  const stars = result.accuracy === 100 ? 3 : result.accuracy >= 80 ? 2 : 1;

  return (
    <div style={{
      minHeight: '100vh', background: T.bg, ...s.flexCenter, flexDirection: 'column', padding: 20,
    }}>
      <Confetti active={showConfetti} />
      
      <div style={{
        ...s.card({ textAlign: 'center', maxWidth: 400, width: '100%' }),
        animation: 'duo-bounceIn 0.6s ease',
      }}>
        {/* Duo mascot with emotion matching performance */}
        <div style={{ ...s.flexCenter, gap: 14, marginBottom: 8 }}>
          <DuoMascot
            mood={result.accuracy === 100 ? 'excited' : result.accuracy >= 80 ? 'happy' : result.accuracy >= 50 ? 'normal' : 'sad'}
            size={104}
          />
          <div style={{ fontSize: 52, animation: 'duo-float 3s ease infinite' }}>
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i} style={{
                filter: i < stars ? 'none' : 'grayscale(1) opacity(0.3)',
                display: 'inline-block',
                animation: i < stars ? \`duo-bounceIn 0.4s ease \${i * 0.15}s both\` : 'none',
              }}>⭐</span>
            ))}
          </div>
        </div>

        <h2 style={{ fontSize: 28, fontWeight: 900, color: T.green, marginBottom: 8 }}>
          {result.accuracy === 100 ? 'PERFECT!' : result.accuracy >= 80 ? 'GREAT JOB!' : 'LESSON COMPLETE!'}
        </h2>

        <p style={{ color: T.textSec, marginBottom: 24 }}>{activity.title}</p>

        {/* Stats Grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24,
        }}>
          <div style={{ ...s.card({ background: T.surfaceLt, padding: 14 }) }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: T.gold }}>{result.xp}</div>
            <div style={{ fontSize: 12, color: T.textDim }}>XP EARNED</div>
          </div>
          <div style={{ ...s.card({ background: T.surfaceLt, padding: 14 }) }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: T.green }}>{Math.round(result.accuracy)}%</div>
            <div style={{ fontSize: 12, color: T.textDim }}>ACCURACY</div>
          </div>
          <div style={{ ...s.card({ background: T.surfaceLt, padding: 14 }) }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: T.orange }}>{result.combo}x</div>
            <div style={{ fontSize: 12, color: T.textDim }}>MAX COMBO</div>
          </div>
          <div style={{ ...s.card({ background: T.surfaceLt, padding: 14 }) }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: T.blue }}>{formatTime(result.time)}</div>
            <div style={{ fontSize: 12, color: T.textDim }}>TIME</div>
          </div>
        </div>

        {/* Level Progress */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ ...s.flexBetween, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.textSec }}>Level {level}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.gold }}>{totalXp} / {xpForLevel(level)} XP</span>
          </div>
          <ProgressBar pct={(totalXp / xpForLevel(level)) * 100} color={T.gold} height={10} />
        </div>

        {/* Streak */}
        <div style={{
          ...s.flexCenter, gap: 8, padding: '12px 20px', borderRadius: T.radiusSm,
          background: \`\${T.orange}22\`, marginBottom: 24,
        }}>
          <span style={{ fontSize: 24, animation: 'duo-streak 1s ease' }}>🔥</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: T.orange }}>{streak} Day Streak!</span>
        </div>

        {result.newCards.length > 0 && (
          <div style={{
            padding: '10px 16px', borderRadius: T.radiusSm, background: \`\${T.purple}22\`,
            marginBottom: 20, fontSize: 13, color: T.purple,
          }}>
            <i className="fas fa-clone" style={{ marginRight: 8 }} />
            {result.newCards.length} cards added for review
          </div>
        )}

        <button onClick={() => { sfx.click(); onContinue(); }} style={s.btn(T.green)}>
          CONTINUE
        </button>
      </div>
    </div>
  );
});

// ========================== LEADERBOARD ==========================
const LeaderboardView: FC<{
  fakeUsers: FakeUser[];
  playerXp: number;
  playerName: string;
  playerAvatar: string;
  playerStreak: number;
  onBack: () => void;
}> = memo(({ fakeUsers, playerXp, playerName, playerAvatar, playerStreak, onBack }) => {
  const allUsers = useMemo(() => {
    const player = {
      id: 'player', name: playerName, avatar: playerAvatar, xp: playerXp,
      streak: playerStreak, level: 1, country: '🌍', online: true, league: 'Gold', isPlayer: true,
    };
    return [...fakeUsers, player].sort((a, b) => b.xp - a.xp).slice(0, 30);
  }, [fakeUsers, playerXp, playerName, playerAvatar, playerStreak]);

  const playerRank = allUsers.findIndex(u => (u as any).isPlayer) + 1;

  return (
    <div style={{ minHeight: '100vh', background: T.bg }}>
      {/* Header */}
      <div style={{
        padding: '20px', background: \`linear-gradient(135deg, \${T.purple}44, \${T.blue}44)\`,
        borderBottom: \`1px solid \${T.border}\`,
      }}>
        <div style={{ ...s.flexBetween, marginBottom: 16 }}>
          <button onClick={onBack} style={{ background: 'none', color: T.text, fontSize: 20, cursor: 'pointer' }}>
            <i className="fas fa-arrow-left" />
          </button>
          <h2 style={{ fontWeight: 900, fontSize: 20 }}>🏆 Leaderboard</h2>
          <div style={{ width: 40 }} />
        </div>
        
        <div style={{ ...s.flexCenter, gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: T.textDim }}>Your Rank</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: T.gold }}>#{playerRank}</div>
          </div>
          <div style={{ width: 1, height: 40, background: T.border }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: T.textDim }}>Your XP</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: T.green }}>{playerXp}</div>
          </div>
        </div>
      </div>

      {/* League Tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '16px 20px', overflowX: 'auto' }}>
        {['Weekly', 'All Time', 'Friends'].map((tab, idx) => (
          <button key={tab} style={{
            padding: '8px 20px', borderRadius: 20, fontWeight: 700, fontSize: 13,
            background: idx === 0 ? T.purple : 'transparent',
            border: \`2px solid \${idx === 0 ? T.purple : T.border}\`,
            color: idx === 0 ? '#fff' : T.textDim, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            {tab}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ padding: '0 20px 100px' }}>
        {allUsers.map((user, idx) => {
          const isPlayer = (user as any).isPlayer;
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
          
          return (
            <div key={user.id} style={{
              ...s.card({
                marginBottom: 8,
                background: isPlayer ? \`\${T.green}22\` : T.card,
                borderColor: isPlayer ? T.green : T.border,
              }),
              display: 'flex', alignItems: 'center', gap: 12,
              animation: \`duo-slideRight 0.3s ease \${idx * 0.03}s both\`,
            }}>
              <div style={{
                width: 32, fontWeight: 900, fontSize: 14,
                color: medal ? T.gold : T.textDim, textAlign: 'center',
              }}>
                {medal || \`#\${idx + 1}\`}
              </div>
              <div style={{ fontSize: 32 }}>{user.avatar}</div>
              <div style={{ flex: 1 }}>
                <div style={{ ...s.flexCenter, gap: 6, justifyContent: 'flex-start' }}>
                  <span style={{ fontWeight: 700, color: isPlayer ? T.green : T.text }}>
                    {user.name} {isPlayer && '(You)'}
                  </span>
                  <span style={{ fontSize: 14 }}>{user.country}</span>
                  {user.online && <span style={{
                    width: 8, height: 8, borderRadius: '50%', background: T.green,
                  }} />}
                </div>
                <div style={{ fontSize: 12, color: T.textDim }}>
                  🔥 {user.streak} day streak
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: T.gold }}>{user.xp}</div>
                <div style={{ fontSize: 11, color: T.textDim }}>XP</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ========================== CHALLENGES VIEW ==========================
const ChallengesView: FC<{
  challenges: Challenge[];
  onBack: () => void;
  onClaim: (id: string) => void;
}> = memo(({ challenges, onBack, onClaim }) => {
  const daily = challenges.filter(c => ['lessons', 'correct', 'combo'].includes(c.type));
  const special = challenges.filter(c => !['lessons', 'correct', 'combo'].includes(c.type));

  return (
    <div style={{ minHeight: '100vh', background: T.bg }}>
      <div style={{
        padding: '20px', background: T.surface, borderBottom: \`1px solid \${T.border}\`,
        ...s.flexBetween,
      }}>
        <button onClick={onBack} style={{ background: 'none', color: T.text, fontSize: 20, cursor: 'pointer' }}>
          <i className="fas fa-arrow-left" />
        </button>
        <h2 style={{ fontWeight: 900, fontSize: 20 }}>⚡ Daily Challenges</h2>
        <div style={{ width: 40 }} />
      </div>

      <div style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: T.textDim, marginBottom: 12 }}>DAILY QUESTS</h3>
        {daily.map((ch, idx) => (
          <div key={ch.id} style={{
            ...s.card({ marginBottom: 12 }),
            animation: \`duo-slideUp 0.3s ease \${idx * 0.05}s both\`,
          }}>
            <div style={{ ...s.flexBetween, marginBottom: 10 }}>
              <div style={{ ...s.flexCenter, gap: 12 }}>
                <span style={{ fontSize: 28 }}>{ch.icon}</span>
                <div>
                  <div style={{ fontWeight: 700 }}>{ch.title}</div>
                  <div style={{ fontSize: 13, color: T.textDim }}>{ch.desc}</div>
                </div>
              </div>
              {ch.done ? (
                <button onClick={() => onClaim(ch.id)} style={{
                  ...s.btn(T.gold), padding: '8px 16px', width: 'auto',
                  animation: 'duo-pulse 1s ease infinite',
                }}>
                  CLAIM
                </button>
              ) : null}
            </div>
            <ProgressBar pct={(ch.current / ch.target) * 100} color={ch.done ? T.gold : T.blue} height={8} />
            <div style={{ ...s.flexBetween, marginTop: 8, fontSize: 12 }}>
              <span style={{ color: T.textDim }}>{ch.current}/{ch.target}</span>
              <div style={{ ...s.flexCenter, gap: 10 }}>
                <span style={{ color: T.gold }}>+{ch.xpReward} XP</span>
                <span style={{ color: T.teal }}>+{ch.gems} 💎</span>
              </div>
            </div>
          </div>
        ))}

        <h3 style={{ fontSize: 14, fontWeight: 700, color: T.textDim, marginBottom: 12, marginTop: 24 }}>SPECIAL</h3>
        {special.map((ch, idx) => (
          <div key={ch.id} style={{
            ...s.card({ marginBottom: 12 }),
            animation: \`duo-slideUp 0.3s ease \${(daily.length + idx) * 0.05}s both\`,
          }}>
            <div style={{ ...s.flexBetween, marginBottom: 10 }}>
              <div style={{ ...s.flexCenter, gap: 12 }}>
                <span style={{ fontSize: 28 }}>{ch.icon}</span>
                <div>
                  <div style={{ fontWeight: 700 }}>{ch.title}</div>
                  <div style={{ fontSize: 13, color: T.textDim }}>{ch.desc}</div>
                </div>
              </div>
            </div>
            <ProgressBar pct={(ch.current / ch.target) * 100} color={ch.done ? T.gold : T.purple} height={8} />
            <div style={{ ...s.flexBetween, marginTop: 8, fontSize: 12 }}>
              <span style={{ color: T.textDim }}>{ch.current}/{ch.target}</span>
              <div style={{ ...s.flexCenter, gap: 10 }}>
                <span style={{ color: T.gold }}>+{ch.xpReward} XP</span>
                <span style={{ color: T.teal }}>+{ch.gems} 💎</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// ========================== REVIEW / FLASHCARDS ==========================
const ReviewView: FC<{
  cards: FlashCard[];
  onBack: () => void;
  onUpdateCard: (card: FlashCard) => void;
  onAddXp: (xp: number) => void;
}> = memo(({ cards, onBack, onUpdateCard, onAddXp }) => {
  const dueCards = useMemo(() => 
    cards.filter(c => c.nextReview <= Date.now()).sort((a, b) => a.nextReview - b.nextReview),
  [cards]);
  
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  const current = dueCards[idx];

  const handleRate = (diff: Difficulty) => {
    if (!current) return;
    sfx.tap();
    const updated = sm2(current, diff);
    onUpdateCard(updated);
    onAddXp(diff === 'easy' ? 5 : diff === 'good' ? 3 : 1);
    setReviewed(r => r + 1);
    setFlipped(false);
    
    if (idx < dueCards.length - 1) {
      setIdx(i => i + 1);
    }
  };

  if (cards.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, ...s.flexCenter, flexDirection: 'column', padding: 20 }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>📚</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>No Cards Yet</h2>
        <p style={{ color: T.textDim, textAlign: 'center', marginBottom: 24 }}>
          Complete lessons to add cards for review. Mistakes become learning opportunities!
        </p>
        <button onClick={onBack} style={s.btn(T.purple)}>BACK TO HOME</button>
      </div>
    );
  }

  if (dueCards.length === 0 || idx >= dueCards.length) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, ...s.flexCenter, flexDirection: 'column', padding: 20 }}>
        <div style={{ fontSize: 64, marginBottom: 20, animation: 'duo-bounceIn 0.5s ease' }}>🎉</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>All Caught Up!</h2>
        <p style={{ color: T.textDim, textAlign: 'center', marginBottom: 8 }}>
          {reviewed > 0 ? \`You reviewed \${reviewed} cards!\` : 'No cards due for review right now.'}
        </p>
        <p style={{ color: T.textDim, fontSize: 13, marginBottom: 24 }}>
          {cards.length} total cards in your deck
        </p>
        <button onClick={onBack} style={s.btn(T.green)}>BACK TO HOME</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, ...s.flexCol }}>
      <div style={{
        padding: '16px 20px', background: T.surface, borderBottom: \`1px solid \${T.border}\`,
        ...s.flexBetween,
      }}>
        <button onClick={onBack} style={{ background: 'none', color: T.text, fontSize: 20, cursor: 'pointer' }}>
          <i className="fas fa-arrow-left" />
        </button>
        <h2 style={{ fontWeight: 800, fontSize: 16 }}>Review ({idx + 1}/{dueCards.length})</h2>
        <span style={{ fontSize: 13, color: T.textDim }}>{reviewed} done</span>
      </div>

      <ProgressBar pct={(idx / dueCards.length) * 100} color={T.purple} height={4} animated />

      <div style={{ flex: 1, ...s.flexCenter, padding: 20 }}>
        <div onClick={() => !flipped && setFlipped(true)} style={{
          ...s.card({
            width: '100%', maxWidth: 400, minHeight: 250, cursor: 'pointer',
            perspective: '1000px', position: 'relative',
          }),
          background: flipped ? T.surfaceLt : T.card,
          transition: 'all 0.4s ease',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0)',
          transformStyle: 'preserve-3d',
        }}>
          <div style={{
            ...s.flexCenter, flexDirection: 'column', height: '100%', padding: 20,
            backfaceVisibility: 'hidden',
          }}>
            {!flipped ? (
              <>
                <span style={{ fontSize: 11, color: T.textDim, marginBottom: 12, textTransform: 'uppercase' }}>
                  {current.type}
                </span>
                <p style={{ fontSize: 18, fontWeight: 700, textAlign: 'center', lineHeight: 1.6 }}>
                  {current.question}
                </p>
                <p style={{ fontSize: 13, color: T.textDim, marginTop: 20 }}>Tap to reveal answer</p>
              </>
            ) : (
              <div style={{ transform: 'rotateY(180deg)' }}>
                <p style={{ fontSize: 11, color: T.textDim, marginBottom: 8, textTransform: 'uppercase' }}>ANSWER</p>
                <p style={{ fontSize: 18, fontWeight: 700, textAlign: 'center', lineHeight: 1.6, color: T.green }}>
                  {current.answer}
                </p>
                {current.feedback && (
                  <p style={{ fontSize: 13, color: T.textSec, marginTop: 16, textAlign: 'center' }}>
                    {current.feedback}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {flipped && (
        <div style={{
          padding: 20, background: T.surface, borderTop: \`1px solid \${T.border}\`,
          animation: 'duo-slideUp 0.3s ease',
        }}>
          <p style={{ fontSize: 13, color: T.textDim, textAlign: 'center', marginBottom: 12 }}>
            How well did you remember?
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { diff: 'again' as Difficulty, label: 'Again', color: T.red, sub: '<1m' },
              { diff: 'hard' as Difficulty, label: 'Hard', color: T.orange, sub: '~1d' },
              { diff: 'good' as Difficulty, label: 'Good', color: T.blue, sub: \`~\${Math.max(1, Math.round(current.interval * current.ease))}d\` },
              { diff: 'easy' as Difficulty, label: 'Easy', color: T.green, sub: \`~\${Math.max(1, Math.round(current.interval * current.ease * 1.3))}d\` },
            ].map(opt => (
              <button key={opt.diff} onClick={() => handleRate(opt.diff)} style={{
                ...s.flexCol, alignItems: 'center', gap: 2,
                padding: '12px 8px', borderRadius: T.radiusSm,
                background: \`\${opt.color}22\`, border: \`2px solid \${opt.color}\`,
                color: opt.color, fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}>
                {opt.label}
                <span style={{ fontSize: 10, opacity: 0.7 }}>{opt.sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// ========================== PROFILE VIEW ==========================
const ProfileView: FC<{
  xp: number; totalXp: number; level: number; streak: number;
  hearts: number; gems: number; achievements: Achievement[];
  totalLessons: number; totalCorrect: number; maxCombo: number;
  onBack: () => void;
}> = memo(({ xp, totalXp, level, streak, hearts, gems, achievements, totalLessons, totalCorrect, maxCombo, onBack }) => {
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div style={{ minHeight: '100vh', background: T.bg, paddingBottom: 100 }}>
      {/* Header */}
      <div style={{
        padding: '30px 20px', background: \`linear-gradient(180deg, \${T.purple}44, \${T.bg})\`,
        textAlign: 'center',
      }}>
        <button onClick={onBack} style={{
          position: 'absolute', left: 20, top: 20,
          background: 'none', color: T.text, fontSize: 20, cursor: 'pointer',
        }}>
          <i className="fas fa-arrow-left" />
        </button>
        
        <div style={{
          width: 100, height: 100, borderRadius: '50%', margin: '0 auto 16px',
          background: \`\${T.purple}33\`, border: \`4px solid \${T.purple}\`,
          ...s.flexCenter, fontSize: 48,
        }}>
          🦉
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>Language Learner</h2>
        <p style={{ color: T.textDim }}>Level {level} • Joined 2024</p>
      </div>

      {/* Stats */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { icon: '🔥', value: streak, label: 'Day Streak', color: T.orange },
            { icon: '⚡', value: totalXp, label: 'Total XP', color: T.gold },
            { icon: '📚', value: totalLessons, label: 'Lessons Done', color: T.blue },
            { icon: '✅', value: totalCorrect, label: 'Correct Answers', color: T.green },
            { icon: '💎', value: gems, label: 'Gems', color: T.teal },
            { icon: '🎯', value: \`\${maxCombo}x\`, label: 'Best Combo', color: T.purple },
          ].map((stat, i) => (
            <div key={i} style={{
              ...s.card({ textAlign: 'center', padding: 16 }),
              animation: \`duo-slideUp 0.3s ease \${i * 0.05}s both\`,
            }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{stat.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: T.textDim }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Achievements */}
        <h3 style={{ fontSize: 14, fontWeight: 700, color: T.textDim, marginBottom: 12 }}>
          ACHIEVEMENTS ({unlockedCount}/{achievements.length})
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {achievements.map((ach, i) => (
            <div key={ach.id} style={{
              ...s.card({ textAlign: 'center', padding: 12 }),
              opacity: ach.unlocked ? 1 : 0.4,
              filter: ach.unlocked ? 'none' : 'grayscale(1)',
              animation: \`duo-slideUp 0.3s ease \${i * 0.03}s both\`,
            }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>{ach.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.textSec }}>{ach.title}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ========================== HOME VIEW ==========================
const HomeView: FC<{
  data: WorksheetData;
  xp: number; level: number; streak: number; hearts: number; gems: number;
  completedActs: string[];
  unlockedSections: number[];
  onStartLesson: (sIdx: number, aIdx: number) => void;
  onNavigate: (screen: Screen) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  streakFreeze: boolean;
  boostActive: boolean;
}> = memo(({
  data, xp, level, streak, hearts, gems,
  completedActs, unlockedSections,
  onStartLesson, onNavigate, soundEnabled, onToggleSound,
  streakFreeze, boostActive,
}) => {
  const xpNeeded = xpForLevel(level);
  const xpPct = (xp / xpNeeded) * 100;

  const navItems = [
    { icon: 'fas fa-home', label: 'Learn', screen: 'home' as Screen },
    { icon: 'fas fa-flag', label: 'Quests', screen: 'challenges' as Screen },
    { icon: 'fas fa-store', label: 'Shop', screen: 'shop' as Screen },
    { icon: 'fas fa-user', label: 'Profile', screen: 'profile' as Screen },
  ];

  return (
    <div style={{ minHeight: '100vh', background: T.bg, paddingBottom: 100 }}>
      {/* Desktop left sidebar (Duolingo web style) */}
      <div className="duo-desktop-only" style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: 210, zIndex: 120,
        background: T.surface, borderRight: \`1px solid \${T.border}\`,
        padding: '24px 12px', display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <div style={{ ...s.flexCenter, gap: 8, marginBottom: 18 }}>
          <span style={{ fontSize: 28 }}>🦉</span>
          <span style={{ fontWeight: 900, fontSize: 17, color: T.green }}>duolingo</span>
        </div>
        <div style={{ ...s.flexCenter, gap: 6, marginBottom: 14 }}>
          <span style={{ fontSize: 20 }}>🔥</span>
          <span style={{ fontWeight: 800, fontSize: 16, color: T.orange }}>{streak}</span>
          <span style={{ fontSize: 20 }}>💎</span>
          <span style={{ fontWeight: 800, fontSize: 16, color: T.teal }}>{gems}</span>
          <span style={{ fontSize: 20 }}>❤️</span>
          <span style={{ fontWeight: 800, fontSize: 16, color: T.red }}>{hearts}</span>
        </div>
        {navItems.map(nav => (
          <button key={nav.screen} onClick={() => onNavigate(nav.screen)} style={{
            ...s.flexCenter, justifyContent: 'flex-start', gap: 12, padding: '12px 16px',
            borderRadius: T.radiusSm, background: nav.screen === 'home' ? \`\${T.green}22\` : 'transparent',
            color: nav.screen === 'home' ? T.green : T.textSec, fontWeight: 700, fontSize: 14,
            cursor: 'pointer', transition: T.transition, width: '100%',
          }}>
            <i className={nav.icon} style={{ fontSize: 16 }} />
            {nav.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ ...s.flexCenter, gap: 8, padding: 12 }}>
          <DuoMascot mood="happy" size={48} bob={false} />
          <div style={{ fontSize: 12, color: T.textDim }}>
            <div style={{ fontWeight: 700, color: T.text }}>Level {level}</div>
            <div>{xp}/{xpNeeded} XP</div>
          </div>
        </div>
      </div>

      {/* Main content (shifted right on desktop) */}
      <div className="duo-main" style={{ maxWidth: 760, margin: '0 auto', paddingLeft: 0 }}>

      {/* Top Bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        padding: '12px 16px', background: T.surface,
        borderBottom: \`1px solid \${T.border}\`,
      }}>
        <div style={{ ...s.flexBetween }}>
          <Badge icon={streakFreeze ? '❄️' : '🔥'} value={streak} color={streakFreeze ? T.blue : T.orange} label="streak" onClick={() => onNavigate('profile')} />
          <Badge icon="💎" value={gems} color={T.teal} onClick={() => onNavigate('shop')} />
          <Badge icon="❤️" value={hearts} color={T.red} onClick={() => onNavigate('shop')} />
          <button onClick={onToggleSound} style={{
            background: 'none', fontSize: 18, color: soundEnabled ? T.text : T.textDim, cursor: 'pointer', padding: 8,
          }}>
            <i className={soundEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute'} />
          </button>
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={{ ...s.flexBetween, marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.textSec }}>Level {level}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: boostActive ? T.orange : T.gold }}>
              {boostActive && '⚡2x '}{xp}/{xpNeeded} XP
            </span>
          </div>
          <ProgressBar pct={xpPct} color={boostActive ? T.orange : T.gold} height={8} />
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ padding: '16px 20px', display: 'flex', gap: 10 }}>
        <button onClick={() => onNavigate('challenges')} style={{
          flex: 1, ...s.card({ padding: '14px 16px' }),
          ...s.flexCenter, gap: 8, cursor: 'pointer', transition: T.transition,
        }}>
          <span style={{ fontSize: 20 }}>⚡</span>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Daily Quests</span>
        </button>
        <button onClick={() => onNavigate('review')} style={{
          flex: 1, ...s.card({ padding: '14px 16px' }),
          ...s.flexCenter, gap: 8, cursor: 'pointer', transition: T.transition,
        }}>
          <span style={{ fontSize: 20 }}>🔄</span>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Review</span>
        </button>
        <button onClick={() => onNavigate('leaderboard')} style={{
          flex: 1, ...s.card({ padding: '14px 16px' }),
          ...s.flexCenter, gap: 8, cursor: 'pointer', transition: T.transition,
        }}>
          <span style={{ fontSize: 20 }}>🏆</span>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Ranks</span>
        </button>
      </div>

      {/* Level Path */}
      <div style={{ padding: '0 20px' }}>
        {data.sections.map((section, sIdx) => {
          const isUnlocked = unlockedSections.includes(sIdx);
          const sectionComplete = section.activities.every((_, aIdx) =>
            completedActs.includes(\`\${sIdx}-\${aIdx}\`)
          );

          return (
            <div key={sIdx} style={{
              marginBottom: 30,
              opacity: isUnlocked ? 1 : 0.5,
              animation: \`duo-slideUp 0.4s ease \${sIdx * 0.1}s both\`,
            }}>
              {/* Section Header */}
              <div style={{
                ...s.flexBetween, marginBottom: 16, padding: '12px 16px',
                background: \`\${section.color}22\`, borderRadius: T.radiusSm,
                borderLeft: \`4px solid \${section.color}\`,
              }}>
                <div>
                  <h3 style={{ fontWeight: 800, fontSize: 15, color: section.color }}>{section.title}</h3>
                  <p style={{ fontSize: 12, color: T.textDim }}>
                    {section.activities.filter((_, aIdx) => completedActs.includes(\`\${sIdx}-\${aIdx}\`)).length}
                    /{section.activities.length} complete • +{section.xpReward} XP
                  </p>
                </div>
                {sectionComplete && <span style={{ fontSize: 24 }}>✅</span>}
                {!isUnlocked && <span style={{ fontSize: 24 }}>🔒</span>}
              </div>

              {/* Activities Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {section.activities.map((activity, aIdx) => {
                  const actKey = \`\${sIdx}-\${aIdx}\`;
                  const done = completedActs.includes(actKey);
                  const canStart = isUnlocked && (aIdx === 0 || completedActs.includes(\`\${sIdx}-\${aIdx - 1}\`));

                  return (
                    <button key={aIdx} onClick={() => canStart && onStartLesson(sIdx, aIdx)}
                      disabled={!canStart}
                      style={{
                        ...s.flexCol, alignItems: 'center', gap: 8,
                        padding: 16, borderRadius: T.radius,
                        background: done ? \`\${section.color}22\` : canStart ? T.card : T.surfaceLt,
                        border: \`3px solid \${done ? section.color : canStart ? T.border : T.border}\`,
                        borderBottom: \`5px solid \${done ? section.color : canStart ? T.border : T.border}\`,
                        cursor: canStart ? 'pointer' : 'not-allowed',
                        opacity: canStart || done ? 1 : 0.4,
                        transition: T.transition,
                        animation: canStart && !done ? 'duo-glow 3s ease infinite' : 'none',
                      }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: done ? section.color : canStart ? T.surfaceLt : T.bg,
                        ...s.flexCenter,
                      }}>
                        {done ? (
                          <i className="fas fa-check" style={{ color: '#fff', fontSize: 18 }} />
                        ) : (
                          <i className={activity.skillIcon} style={{
                            fontSize: 18, color: canStart ? section.color : T.textDim,
                          }} />
                        )}
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: done ? section.color : T.textSec,
                        textAlign: 'center',
                      }}>
                        {activity.skillLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Nav (mobile) — Duolingo tabs */}
      <div className="duo-mobile-nav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: T.surface, borderTop: \`1px solid \${T.border}\`,
        padding: '8px 0', display: 'flex', justifyContent: 'space-around',
        zIndex: 100,
      }}>
        {navItems.map(nav => (
          <button key={nav.screen} onClick={() => onNavigate(nav.screen)} style={{
            ...s.flexCol, alignItems: 'center', gap: 2, padding: '8px 16px',
            background: 'none', cursor: 'pointer',
          }}>
            <i className={nav.icon} style={{
              fontSize: 20, color: nav.screen === 'home' ? T.green : T.textDim,
            }} />
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: nav.screen === 'home' ? T.green : T.textDim,
            }}>{nav.label}</span>
          </button>
        ))}
      </div>
      </div>
    </div>
  );
});

// ========================== DUO MASCOT ==========================
// CSS-drawn Duo-style owl with emotion faces (happy / sad / mad / excited / normal).
const DuoMascot: FC<{ mood?: string; size?: number; bob?: boolean }> = memo(({ mood = 'happy', size = 96, bob = true }) => {
  const eyeL = mood === 'mad' ? -3 : mood === 'sad' ? 2 : mood === 'excited' ? -2 : mood === 'happy' ? -1 : 0;
  const eyeR = mood === 'mad' ? 3 : mood === 'sad' ? -2 : mood === 'excited' ? 2 : mood === 'happy' ? 1 : 0;
  const browAng = mood === 'mad' ? 'rotate(8deg)' : mood === 'sad' ? 'rotate(-6deg)' : mood === 'excited' ? 'rotate(-8deg)' : 'none';
  const beakCol = mood === 'mad' ? '#E08600' : mood === 'sad' ? '#C77A00' : '#F4A100';
  const mouth = mood === 'sad' ? 'rotate(180deg)' : mood === 'mad' ? 'rotate(90deg)' : mood === 'excited' ? 'rotate(0deg)' : 'rotate(0deg)';
  return (
    <div style={{
      width: size, height: size, position: 'relative',
      animation: bob ? 'duo-float 3s ease-in-out infinite' : 'none',
      display: 'inline-block', flexShrink: 0,
    }}>
      {/* body */}
      <div style={{
        position: 'absolute', left: '8%', top: '18%', width: '84%', height: '74%',
        borderRadius: '48% 48% 44% 44%', background: '#58CC02',
        boxShadow: 'inset -8px -10px 0 rgba(0,0,0,0.12), inset 6px 6px 0 rgba(255,255,255,0.18)',
      }} />
      {/* belly */}
      <div style={{
        position: 'absolute', left: '24%', top: '52%', width: '52%', height: '36%',
        borderRadius: '50% 50% 42% 42%', background: '#FDF5E6',
        boxShadow: 'inset 0 -4px 0 rgba(0,0,0,0.08)',
      }} />
      {/* head */}
      <div style={{
        position: 'absolute', left: '14%', top: '0%', width: '72%', height: '58%',
        borderRadius: '50% 50% 46% 46%', background: '#58CC02',
        boxShadow: 'inset -6px -8px 0 rgba(0,0,0,0.12), inset 5px 5px 0 rgba(255,255,255,0.18)',
      }} />
      {/* ear tufts */}
      <div style={{ position: 'absolute', left: '12%', top: '-6%', width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderBottom: '22px solid #46A302' }} />
      <div style={{ position: 'absolute', right: '12%', top: '-6%', width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderBottom: '22px solid #46A302' }} />
      {/* eyes */}
      {[0, 1].map(i => (
        <div key={i} style={{
          position: 'absolute', left: i === 0 ? '24%' : '54%', top: '18%',
          width: '21%', height: '34%', borderRadius: '50%', background: '#fff',
          boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.06)',
        }}>
          <div style={{
            position: 'absolute', left: '38%', top: '26%', width: '34%', height: '46%',
            borderRadius: '50%', background: '#1A1A1A',
            transform: \`translate(\${i === 0 ? eyeL : eyeR}px, 0) rotate(\${i === 0 ? -6 : 6}deg)\`,
          }}>
            <div style={{ position: 'absolute', left: '12%', top: '8%', width: '40%', height: '40%', borderRadius: '50%', background: '#fff' }} />
          </div>
        </div>
      ))}
      {/* brows */}
      {[0, 1].map(i => mood === 'mad' || mood === 'sad' || mood === 'excited' ? (
        <div key={'b' + i} style={{
          position: 'absolute', left: i === 0 ? '21%' : '56%', top: '10%',
          width: '20%', height: '5%', borderRadius: 4, background: '#46A302',
          transform: i === 0 ? browAng : \`rotate(-\${parseFloat(String(browAng).match(/\d+/) || '0')}deg)\`,
        }} />
      ) : null)}
      {/* beak */}
      <div style={{
        position: 'absolute', left: '42%', top: '40%', width: '16%', height: '14%',
        background: beakCol, clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)',
        transform: mouth,
      }} />
      {/* cheeks */}
      {[0, 1].map(i => mood === 'excited' || mood === 'happy' ? (
        <div key={'c' + i} style={{
          position: 'absolute', left: i === 0 ? '16%' : '68%', top: '42%',
          width: '10%', height: '6%', borderRadius: '50%', background: 'rgba(255,150,150,0.55)',
        }} />
      ) : null)}
    </div>
  );
});

// ========================== SHOP VIEW ==========================
const ShopView: FC<{
  gems: number; hearts: number; streakFreeze: boolean;
  onBuy: (itemId: string) => void; onBack: () => void;
}> = memo(({ gems, hearts, streakFreeze, onBuy, onBack }) => {
  const items = [
    { id: 'hearts', icon: '❤️', name: 'Heart Refill', desc: 'Refill up to 3 hearts instantly', price: 350, color: T.red, owned: false },
    { id: 'freeze', icon: '❄️', name: 'Streak Freeze', desc: 'Protect your streak for one missed day', price: 200, color: T.blue, owned: streakFreeze },
    { id: 'boost', icon: '⚡', name: '2x XP Boost', desc: 'Double your XP for the next 15 minutes', price: 100, color: T.orange, owned: false },
    { id: 'gems500', icon: '💎', name: '500 Gems', desc: 'A shiny pouch of 500 gems', price: 0, color: T.teal, owned: false },
    { id: 'gems1200', icon: '💎', name: '1200 Gems', desc: 'A treasure chest of 1200 gems', price: 0, color: T.gold, owned: false },
  ];
  return (
    <div style={{ minHeight: '100vh', background: T.bg, paddingBottom: 110 }}>
      <div style={{
        padding: '18px 20px', background: \`linear-gradient(135deg, \${T.gold}33, \${T.orange}33)\`,
        borderBottom: \`1px solid \${T.border}\`,
      }}>
        <div style={{ ...s.flexBetween, marginBottom: 14 }}>
          <button onClick={() => { sfx.click(); onBack(); }} style={{ background: 'none', color: T.text, fontSize: 20, cursor: 'pointer' }}>
            <i className="fas fa-arrow-left" />
          </button>
          <h2 style={{ fontWeight: 900, fontSize: 20 }}>🛍️ Shop</h2>
          <div style={{
            ...s.flexCenter, gap: 6, background: T.surfaceLt, borderRadius: 20, padding: '6px 14px',
          }}>
            <span style={{ fontSize: 16 }}>💎</span>
            <span style={{ fontWeight: 900, fontSize: 15, color: T.teal }}>{gems}</span>
          </div>
        </div>
        <p style={{ fontSize: 13, color: T.textSec }}>
          Spend your hard-earned gems on power-ups for your learning journey!
        </p>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {items.map((item, idx) => (
          <div key={item.id} style={{
            ...s.card({ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14 }),
            animation: \`duo-slideUp 0.35s ease \${idx * 0.06}s both\`,
            borderLeft: \`6px solid \${item.color}\`,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', ...s.flexCenter,
              background: \`\${item.color}22\`, fontSize: 26, flexShrink: 0,
            }}>{item.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: T.text }}>{item.name}</div>
              <div style={{ fontSize: 12, color: T.textDim, marginTop: 2 }}>{item.desc}</div>
            </div>
            {item.owned ? (
              <span style={{
                fontWeight: 800, fontSize: 12, color: T.green, background: \`\${T.green}22\`,
                padding: '6px 12px', borderRadius: 16,
              }}>OWNED ✓</span>
            ) : item.price === 0 ? (
              <button onClick={() => { sfx.complete(); onBuy(item.id); }} style={{
                ...s.btn(item.color, false), padding: '8px 18px', fontSize: 12, width: 'auto',
              }}>
                +{item.id === 'gems500' ? '500' : '1200'} 💎
              </button>
            ) : (
              <button onClick={() => { sfx.click(); onBuy(item.id); }} disabled={gems < item.price} style={{
                ...s.btn(gems >= item.price ? item.color : T.textDim, false), padding: '8px 18px', fontSize: 12, width: 'auto',
                opacity: gems >= item.price ? 1 : 0.4, cursor: gems >= item.price ? 'pointer' : 'not-allowed',
              }}>
                {item.price} 💎
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

// ========================== MAIN APP ==========================
interface DuolingoAppProps {
  data?: WorksheetData;
}

const DuolingoApp: FC<DuolingoAppProps> = ({ data = window.gameData }) => {
  // Inject styles on mount
  useEffect(() => { injectStyles(); }, []);

  // State
  const [screen, setScreen] = useState<Screen>('home');
  const [currentLesson, setCurrentLesson] = useState<{ sIdx: number; aIdx: number } | null>(null);
  const [lastResult, setLastResult] = useState<LessonResult | null>(null);

  // Saved state
  const savedState = useRef(loadState());
  const [xp, setXp] = useState(savedState.current?.xp || 0);
  const [totalXp, setTotalXp] = useState(savedState.current?.totalXp || 0);
  const [level, setLevel] = useState(savedState.current?.level || 1);
  const [hearts, setHearts] = useState(savedState.current?.hearts || 5);
  const [gems, setGems] = useState(savedState.current?.gems || 100);
  const [streak, setStreak] = useState(savedState.current?.streak || 1);
  const [lastPlay, setLastPlay] = useState(savedState.current?.lastPlay || '');
  const [maxCombo, setMaxCombo] = useState(savedState.current?.maxCombo || 0);
  const [completedActs, setCompletedActs] = useState<string[]>(savedState.current?.completedActs || []);
  const [unlockedSections, setUnlockedSections] = useState<number[]>(savedState.current?.unlockedSections || [0]);
  const [flashcards, setFlashcards] = useState<FlashCard[]>(savedState.current?.flashcards || []);
  const [achievements, setAchievements] = useState<Achievement[]>(savedState.current?.achievements || defaultAchievements);
  const [perfectStreak, setPerfectStreak] = useState(savedState.current?.perfectStreak || 0);
  const [totalCorrect, setTotalCorrect] = useState(savedState.current?.totalCorrect || 0);
  const [totalLessons, setTotalLessons] = useState(savedState.current?.totalLessons || 0);

  const [challenges, setChallenges] = useState<Challenge[]>(genChallenges());
  const [fakeUsers] = useState<FakeUser[]>(() => genFakeUsers(29, totalXp));
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [streakFreeze, setStreakFreeze] = useState(savedState.current?.streakFreeze || false);
  const [boostUntil, setBoostUntil] = useState(savedState.current?.boostUntil || 0);
  const boostActive = boostUntil > Date.now();

  // Save state effect
  useEffect(() => {
    saveState({
      xp, totalXp, level, hearts, gems, streak, lastPlay, maxCombo,
      completedActs, unlockedSections, flashcards, achievements,
      perfectStreak, totalCorrect, totalLessons,
      streakFreeze, boostUntil,
    });
  }, [xp, totalXp, level, hearts, gems, streak, lastPlay, maxCombo, completedActs, unlockedSections, flashcards, achievements, perfectStreak, totalCorrect, totalLessons, streakFreeze, boostUntil]);

  // Streak check
  useEffect(() => {
    const today = todayStr();
    if (lastPlay && lastPlay !== today) {
      const lastDate = new Date(lastPlay);
      const todayDate = new Date(today);
      const diff = Math.floor((todayDate.getTime() - lastDate.getTime()) / 86400000);
      if (diff > 1) {
        setStreak(1);
      }
    }
  }, [lastPlay]);

  // Heart regeneration
  useEffect(() => {
    if (hearts < 5) {
      const timer = setInterval(() => {
        setHearts(h => Math.min(5, h + 1));
      }, 300000); // 5 minutes
      return () => clearInterval(timer);
    }
  }, [hearts]);

  // Level up check
  useEffect(() => {
    const needed = xpForLevel(level);
    if (xp >= needed) {
      setXp(xp - needed);
      setLevel(l => l + 1);
      sfx.levelUp();
    }
  }, [xp, level]);

  const handleToggleSound = useCallback(() => {
    const enabled = sfx.toggle();
    setSoundEnabled(enabled);
  }, []);

  const handleStartLesson = useCallback((sIdx: number, aIdx: number) => {
    if (hearts <= 0) {
      alert('No hearts left! Wait for regeneration or watch an ad.');
      return;
    }
    sfx.click();
    setCurrentLesson({ sIdx, aIdx });
    setScreen('lesson');
  }, [hearts]);

  const handleHeartLost = useCallback(() => {
    setHearts(h => Math.max(0, h - 1));
    sfx.heartLost();
  }, []);

  const handleLessonComplete = useCallback((result: LessonResult) => {
    if (!currentLesson) return;
    const { sIdx, aIdx } = currentLesson;
    const actKey = \`\${sIdx}-\${aIdx}\`;

    // Update state (2x XP boost doubles the reward while active)
    const xpGain = boostActive ? Math.round(result.xp * 2) : result.xp;
    setXp(x => x + xpGain);
    setTotalXp(tx => tx + xpGain);
    setTotalCorrect(tc => tc + result.correct);
    setTotalLessons(tl => tl + 1);
    setMaxCombo(mc => Math.max(mc, result.combo));
    setLastPlay(todayStr());
    setStreak(s => lastPlay === todayStr() ? s : s + 1);

    // Mark complete
    if (!completedActs.includes(actKey)) {
      setCompletedActs(prev => [...prev, actKey]);
    }

    // Add flashcards
    if (result.newCards.length > 0) {
      setFlashcards(prev => [...prev, ...result.newCards]);
    }

    // Perfect streak
    if (result.accuracy === 100) {
      setPerfectStreak(ps => ps + 1);
    } else {
      setPerfectStreak(0);
    }

    // Unlock next section
    const section = data.sections[sIdx];
    const sectionComplete = section.activities.every((_, i) =>
      completedActs.includes(\`\${sIdx}-\${i}\`) || (i === aIdx)
    );
    if (sectionComplete && sIdx + 1 < data.sections.length && !unlockedSections.includes(sIdx + 1)) {
      setUnlockedSections(prev => [...prev, sIdx + 1]);
    }

    // Update challenges
    setChallenges(prev => prev.map(c => {
      if (c.type === 'lessons') return { ...c, current: Math.min(c.target, c.current + 1), done: c.current + 1 >= c.target };
      if (c.type === 'correct') return { ...c, current: Math.min(c.target, c.current + result.correct), done: c.current + result.correct >= c.target };
      if (c.type === 'combo' && result.combo >= c.target) return { ...c, current: result.combo, done: true };
      if (c.type === 'perfect' && result.accuracy === 100) return { ...c, current: 1, done: true };
      if (c.type === 'speed' && result.time < 30000) return { ...c, current: Math.min(c.target, c.current + result.correct), done: c.current + result.correct >= c.target };
      return c;
    }));

    // Check achievements
    setAchievements(prev => prev.map(a => {
      if (a.unlocked) return a;
      if (a.id === 'a1' && totalLessons === 0) return { ...a, unlocked: true, date: Date.now() };
      if (a.id === 'a2' && streak >= 7) return { ...a, unlocked: true, date: Date.now() };
      if (a.id === 'a3' && perfectStreak >= 2 && result.accuracy === 100) return { ...a, unlocked: true, date: Date.now() };
      if (a.id === 'a4' && result.combo >= 20) return { ...a, unlocked: true, date: Date.now() };
      if (a.id === 'a5' && totalXp + result.xp >= 1000) return { ...a, unlocked: true, date: Date.now() };
      if (a.id === 'a6' && new Date().getHours() >= 22) return { ...a, unlocked: true, date: Date.now() };
      if (a.id === 'a7' && result.time < 120000) return { ...a, unlocked: true, date: Date.now() };
      if (a.id === 'a8' && flashcards.length + result.newCards.length >= 50) return { ...a, unlocked: true, date: Date.now() };
      return a;
    }));

    setLastResult(result);
    setScreen('complete');
  }, [currentLesson, completedActs, data.sections, unlockedSections, lastPlay, totalLessons, perfectStreak, streak, totalXp, flashcards.length, boostActive]);

  const handleContinue = useCallback(() => {
    setCurrentLesson(null);
    setLastResult(null);
    setScreen('home');
  }, []);

  const handleClaimChallenge = useCallback((id: string) => {
    const ch = challenges.find(c => c.id === id);
    if (!ch || !ch.done) return;
    sfx.complete();
    setXp(x => x + ch.xpReward);
    setTotalXp(tx => tx + ch.xpReward);
    setGems(g => g + ch.gems);
    setChallenges(prev => prev.filter(c => c.id !== id));
  }, [challenges]);

  const handleUpdateCard = useCallback((card: FlashCard) => {
    setFlashcards(prev => prev.map(c => c.id === card.id ? card : c));
  }, []);

  const handleBuy = useCallback((itemId: string) => {
    if (itemId === 'hearts') {
      if (gems < 350) return;
      setGems(g => g - 350);
      setHearts(h => Math.min(5, h + 3));
      alert('❤️ Hearts refilled!');
    } else if (itemId === 'freeze') {
      if (gems < 200) return;
      setGems(g => g - 200);
      setStreakFreeze(true);
      alert('❄️ Streak Freeze activated — your streak is protected!');
    } else if (itemId === 'boost') {
      if (gems < 100) return;
      setGems(g => g - 100);
      setBoostUntil(Date.now() + 15 * 60 * 1000);
      alert('⚡ 2x XP Boost active for 15 minutes!');
    } else if (itemId === 'gems500') {
      setGems(g => g + 500);
    } else if (itemId === 'gems1200') {
      setGems(g => g + 1200);
    }
  }, [gems]);

  const handleAddXp = useCallback((amount: number) => {
    setXp(x => x + amount);
    setTotalXp(tx => tx + amount);
    setChallenges(prev => prev.map(c => {
      if (c.type === 'review') return { ...c, current: Math.min(c.target, c.current + 1), done: c.current + 1 >= c.target };
      return c;
    }));
  }, []);

  // Render
  return (
    <div className="duo-app">
      {screen === 'home' && (
        <HomeView
          data={data}
          xp={xp} level={level} streak={streak} hearts={hearts} gems={gems}
          completedActs={completedActs} unlockedSections={unlockedSections}
          onStartLesson={handleStartLesson}
          onNavigate={setScreen}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          streakFreeze={streakFreeze}
          boostActive={boostActive}
        />
      )}

      {screen === 'shop' && (
        <ShopView
          gems={gems} hearts={hearts} streakFreeze={streakFreeze}
          onBuy={handleBuy}
          onBack={() => setScreen('home')}
        />
      )}

      {screen === 'lesson' && currentLesson && (
        <LessonView
          data={data}
          sectionIdx={currentLesson.sIdx}
          activityIdx={currentLesson.aIdx}
          hearts={hearts}
          onComplete={handleLessonComplete}
          onExit={() => { setScreen('home'); setCurrentLesson(null); }}
          onHeartLost={handleHeartLost}
        />
      )}

      {screen === 'complete' && lastResult && currentLesson && (
        <CompleteScreen
          result={lastResult}
          section={data.sections[currentLesson.sIdx]}
          activity={data.sections[currentLesson.sIdx].activities[currentLesson.aIdx]}
          onContinue={handleContinue}
          totalXp={xp}
          level={level}
          streak={streak}
        />
      )}

      {screen === 'leaderboard' && (
        <LeaderboardView
          fakeUsers={fakeUsers}
          playerXp={totalXp}
          playerName="You"
          playerAvatar="🦉"
          playerStreak={streak}
          onBack={() => setScreen('home')}
        />
      )}

      {screen === 'challenges' && (
        <ChallengesView
          challenges={challenges}
          onBack={() => setScreen('home')}
          onClaim={handleClaimChallenge}
        />
      )}

      {screen === 'review' && (
        <ReviewView
          cards={flashcards}
          onBack={() => setScreen('home')}
          onUpdateCard={handleUpdateCard}
          onAddXp={handleAddXp}
        />
      )}

      {screen === 'profile' && (
        <ProfileView
          xp={xp} totalXp={totalXp} level={level} streak={streak}
          hearts={hearts} gems={gems} achievements={achievements}
          totalLessons={totalLessons} totalCorrect={totalCorrect} maxCombo={maxCombo}
          onBack={() => setScreen('home')}
        />
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<DuolingoApp />);
    `;

    const cleanData = { ...gameData };
    if ((cleanData as any).htmlContent) delete (cleanData as any).htmlContent;

    // ============ PRECOMPILE AT GENERATION TIME ============
    // Transform the React+TypeScript app to plain JS here so the saved HTML is
    // self-contained — no Babel script tag needed in the generated file.
    let compiledApp = '';
    try {
        const mod: any = await import('@babel/standalone');
        const Babel = mod?.default || mod;
        const out = Babel.transform(appCode, {
            presets: [['typescript', { allExtensions: true, isTSX: true }], 'react'],
            filename: 'app.tsx'
        });
        compiledApp = String(out.code || '');
    } catch (err) {
        console.error('Review App precompile failed:', err);
        compiledApp = 'document.getElementById("root").innerHTML = JSON.stringify({ error: ' + JSON.stringify(String((err as any)?.message || err)) + ' });';
    }

    // Inline React/ReactDOM UMD so the file also works fully offline; fall back to
    // CDN script tags if the fetch fails (e.g. generation machine without network).
    const fetchText = async (url: string) => {
        try { const r = await fetch(url); return r.ok ? await r.text() : ''; }
        catch { return ''; }
    };
    const [reactUmd, reactDomUmd] = await Promise.all([
        fetchText('https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js'),
        fetchText('https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js'),
    ]);
    const reactTag = reactUmd
        ? `<script>${reactUmd}</script>`
        : `<script src="https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js"></script>`;
    const reactDomTag = reactDomUmd
        ? `<script>${reactDomUmd}</script>`
        : `<script src="https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js"></script>`;

    // Learner's chosen read-aloud voice (e.g. Microsoft Ava Multilingual Natural).
    const voiceURI = (learner as any)?.readAloudVoice || '';
    const coachVoiceURI = (learner as any)?.tutorVoice || '';
    const l1 = (learner as any)?.translationLanguage || (learner as any)?.l1Language || '';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔁 Review App</title>
    <!-- FontAwesome for the app icons (same source the rest of the app uses) -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer">
    <style>
        body { margin: 0; padding: 0; font-family: 'Nunito', 'DIN Round', -apple-system, BlinkMacSystemFont, sans-serif; background: #FFFFFF; color: #4B4B4B; }
    </style>
    ${reactTag}
    ${reactDomTag}
    <script>
        window.gameData = ${JSON.stringify(cleanData).replace(/</g, '\\u003c')};
        window.appConfig = { voiceURI: ${JSON.stringify(voiceURI)}, coachVoiceURI: ${JSON.stringify(coachVoiceURI)}, l1: ${JSON.stringify(l1)} };
    </script>
</head>
<body>
    <div id="root"></div>
    <script>
${compiledApp}
    </script>
</body>
</html>
    `;

    if (returnHtml) return html;

    // Legacy save path — follow the learner_book_unit_type_audience_date convention.
    const filename = buildLessonFileName({
        learnerName: learner.name,
        lessonLabel: 'Review App',
        ...getLessonFilePrefill(learner),
        audience: 'Learner',
    });

    import('./htmlLessonSaver').then(({ saveAndExportHtmlLesson }) => {
        saveAndExportHtmlLesson({
            htmlContent: html,
            fileName: filename,
            learnerName: learner.name,
            type: 'Learning App',
            title: filename,
            triggerDownload: true
        });
    }).catch(() => {
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            try { document.body.removeChild(a); } catch(e) {}
            URL.revokeObjectURL(url);
        }, 1000);
    });
};