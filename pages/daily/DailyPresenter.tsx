import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { DailyLessonData, ConversationGameData, GuessThePlaceData } from './dailyTypes';
import { DAILY_HTML_CSS } from '../../utils/dailyLessonHtmlStyles';

/* ────────────────────────── tiny store ────────────────────────── */

const LEVELS = [
  { level: 1, name: 'Beginner', xpRequired: 0, badge: '🌱' },
  { level: 2, name: 'Explorer', xpRequired: 100, badge: '🔍' },
  { level: 3, name: 'Learner', xpRequired: 250, badge: '📚' },
  { level: 4, name: 'Scholar', xpRequired: 500, badge: '🎓' },
  { level: 5, name: 'Expert', xpRequired: 1000, badge: '⭐' },
  { level: 6, name: 'Master', xpRequired: 2000, badge: '🏆' },
  { level: 7, name: 'Grandmaster', xpRequired: 3500, badge: '💎' },
];
const ACHIEVEMENTS = [
  { id: 'first_step', name: 'First Step', emoji: '👣', xp: 10 },
  { id: 'halfway', name: 'Halfway There', emoji: '🌟', xp: 25 },
  { id: 'lesson_complete', name: 'Lesson Master', emoji: '🎓', xp: 100 },
  { id: 'perfect_quiz', name: 'Perfect Score', emoji: '💯', xp: 50 },
  { id: 'high_quiz', name: 'High Achiever', emoji: '🏆', xp: 30 },
  { id: 'conversation_win', name: 'Conversation Champion', emoji: '🗣️', xp: 40 },
  { id: 'place_found', name: 'World Explorer', emoji: '🌍', xp: 35 },
  { id: 'all_modules', name: 'Daily Legend', emoji: '🌈', xp: 75 },
  { id: 'secret_code', name: 'Code Breaker', emoji: '🔐', xp: 30 },
];
const CAT_EMOTIONS: Record<string, string[]> = {
  correct: ['😸', '😻', '😹', '😸', '😻'],
  incorrect: ['🙀', '😿', '😾', '🙀', '😿'],
  idle: ['😺', '😼', '😽', '🐱', '😺'],
  speaking: ['😻', '😸', '😹', '😻'],
  excited: ['😹', '😸', '😻', '😹'],
  thinking: ['🤔', '😼', '🐱', '😺'],
};
const STEPS = [
  { id: 1, label: 'Warm-Up', icon: '🔥', desc: 'Interactive Q&A' },
  { id: 2, label: 'Keywords', icon: '📖', desc: '22 Advanced Terms' },
  { id: 3, label: 'Listen', icon: '🎧', desc: 'Dialogue Player' },
  { id: 4, label: 'Reading', icon: '📰', desc: '3 Difficulty Levels' },
  { id: 5, label: 'Speaking', icon: '🎤', desc: 'Karaoke Mode' },
  { id: 6, label: 'Grammar', icon: '🔬', desc: '9 Grammar Slides' },
  { id: 7, label: 'Drama', icon: '🎭', desc: 'Radio Play' },
  { id: 8, label: 'Dictation', icon: '✍️', desc: 'Accuracy Test' },
  { id: 9, label: 'Discussion', icon: '💬', desc: 'Social Analysis' },
  { id: 10, label: 'Quiz', icon: '🧠', desc: 'Final Challenge' },
];

interface Props {
  lesson: DailyLessonData;
  learnerName?: string;
  avatar?: string;
  fileName?: string;
}

const DailyPresenter: React.FC<Props> = ({ lesson, learnerName = 'Learner', avatar = '🐱', fileName = 'daily-lesson' }) => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [module, setModuleTab] = useState<'lesson' | 'conversation' | 'place' | 'leaderboard'>('lesson');
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [completedModules, setCompletedModules] = useState<string[]>([]);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [secretCode, setSecretCode] = useState<string | null>(null);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [quizScores, setQuizScores] = useState<{ date: string; score: number; total: number }[]>([]);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [catVoice, setCatVoice] = useState<string | null>(null);
  const [speakerVoices, setSpeakerVoices] = useState<Record<string, string | null>>({});
  const [characterVoices, setCharacterVoices] = useState<Record<string, string | null>>({});

  const [message, setMessage] = useState(lesson.catFeedback?.lessonIntro || 'Welcome!');
  const [catEmotion, setCatEmotion] = useState('idle');
  const [catOpen, setCatOpen] = useState(false);
  const [catVoicesOpen, setCatVoicesOpen] = useState(false);
  const [catEmoji, setCatEmoji] = useState('😺');
  const [achPop, setAchPop] = useState<string | null>(null);
  const [xpToast, setXpToast] = useState<string | null>(null);
  const emojiIdx = useRef(0);
  const catTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // per-step ui state
  const [warmRevealed, setWarmRevealed] = useState<number[]>([]);
  const [warmCard, setWarmCard] = useState(0);
  const [kwMode, setKwMode] = useState<'flashcard' | 'list'>('flashcard');
  const [kwFilter, setKwFilter] = useState('All');
  const [kwSearch, setKwSearch] = useState('');
  const [kwCard, setKwCard] = useState(0);
  const [kwFlipped, setKwFlipped] = useState(false);
  const [mastered, setMastered] = useState<number[]>([]);
  const [dialogueVoicesOpen, setDialogueVoicesOpen] = useState(true);
  const [dialoguePlaying, setDialoguePlaying] = useState(false);
  const [dialogueLine, setDialogueLine] = useState(-1);
  const [dialoguePlayed, setDialoguePlayed] = useState(false);
  const [readLevel, setReadLevel] = useState<'basic' | 'intermediate' | 'advanced'>('intermediate');
  const [readPlaying, setReadPlaying] = useState(false);
  const [gramOpen, setGramOpen] = useState<number | null>(null);
  const [gramViewed, setGramViewed] = useState<number[]>([]);
  const [dramaVoicesOpen, setDramaVoicesOpen] = useState(true);
  const [dramaPlaying, setDramaPlaying] = useState(false);
  const [dramaLine, setDramaLine] = useState(-1);
  const [dramaPlayed, setDramaPlayed] = useState(false);
  const [dramaQuizOpen, setDramaQuizOpen] = useState(false);
  const [dramaAnswers, setDramaAnswers] = useState<(number | null)[]>([]);
  const [dramaSubmitted, setDramaSubmitted] = useState(false);
  const [dictIdx, setDictIdx] = useState(0);
  const [dictInput, setDictInput] = useState('');
  const [dictSubmitted, setDictSubmitted] = useState(false);
  const [dictScores, setDictScores] = useState<number[]>([]);
  const [dictResults, setDictResults] = useState<{ word: string; correct: boolean; userWord: string }[]>([]);
  const [discSelected, setDiscSelected] = useState<number | null>(null);
  const [discRevealed, setDiscRevealed] = useState(false);
  const [quizCur, setQuizCur] = useState(0);
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<boolean[]>([]);
  const [quizResults, setQuizResults] = useState(false);
  const [quizSecret, setQuizSecret] = useState(false);
  const [karaListening, setKaraListening] = useState(false);
  const [karaWords, setKaraWords] = useState<any[]>([]);
  const [karaWpm, setKaraWpm] = useState(0);
  const [karaStartTime, setKaraStartTime] = useState<number | null>(null);
  const [karaDone, setKaraDone] = useState(false);
  const [karaErr, setKaraErr] = useState('');
  const [cgNode, setCgNode] = useState('start');
  const [cgPicked, setCgPicked] = useState<number | null>(null);
  const [gpHintShown, setGpHintShown] = useState(0);
  const [gpGuess, setGpGuess] = useState('');
  const [gpRevealed, setGpRevealed] = useState(false);
  const [gpWon, setGpWon] = useState(false);

  const STATS_KEY = 'daily_lesson_stats';
  const PROG_KEY = `tutorly-daily-progress-${learnerName}`;
  const VOICE_KEY = 'daily_lesson_voices';
  const karaRec = useRef<any>(null);
  const dictRef = useRef<HTMLTextAreaElement>(null);
  const hydrated = useRef(false);

  const DATA = lesson;

  /* ---------- persistence ---------- */
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STATS_KEY) || 'null');
      if (saved) {
        setXp(saved.xp || 0); setLevel(saved.level || 1); setStreak(saved.streak || 0);
        setCompletedSteps(saved.completedSteps || []); setCompletedModules(saved.completedModules || []);
        setQuizScores(saved.quizScores || []); setSecretCode(saved.secretCode || null);
        setAchievements(saved.achievements || []); setTotalCorrect(saved.totalCorrect || 0); setTotalAttempts(saved.totalAttempts || 0);
      }
      const th = localStorage.getItem('dl_theme');
      if (th === 'light') setTheme('light');
      const vs = JSON.parse(localStorage.getItem(VOICE_KEY) || '{}');
      if (vs) { setCatVoice(vs.catVoice || null); setSpeakerVoices(vs.speakerVoices || {}); setCharacterVoices(vs.characterVoices || {}); }
    } catch (e) { /* ignore */ }
    // Only persist once the stored stats/voices have been applied, so the first
    // save (on mount, with zeroed state) never clobbers saved progress.
    const t = setTimeout(() => { hydrated.current = true; }, 0);
    return () => clearTimeout(t);
  }, []);

  const saveStats = () => {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify({ xp, level, streak, lastActive: new Date().toDateString(), completedSteps, completedModules, quizScores, secretCode, achievements, totalCorrect, totalAttempts }));
    } catch (e) { /* ignore */ }
    try {
      const list = JSON.parse(localStorage.getItem(PROG_KEY) || '[]');
      const rec = { fileName, title: DATA.topic, topic: DATA.topic, level: DATA.level, xp, levelNum: level, streak, completedSteps: completedSteps.slice(), completedModules: completedModules.slice(), achievements: achievements.slice(), secretCode, quizScores: quizScores.slice(), totalCorrect, totalAttempts, updatedAt: new Date().toISOString() };
      const others = list.filter((r: any) => r.fileName !== fileName);
      others.unshift(rec);
      localStorage.setItem(PROG_KEY, JSON.stringify(others.slice(0, 20)));
    } catch (e) { /* ignore */ }
  };
  useEffect(() => { if (hydrated.current) saveStats(); }, [xp, level, streak, completedSteps, completedModules, achievements, secretCode, totalCorrect, totalAttempts, quizScores]);

  const saveVoicePrefs = () => {
    try { localStorage.setItem(VOICE_KEY, JSON.stringify({ catVoice, speakerVoices, characterVoices })); } catch (e) { /* ignore */ }
  };
  useEffect(() => { if (hydrated.current) saveVoicePrefs(); }, [catVoice, speakerVoices, characterVoices]);

  /* ---------- audio ---------- */
  const tone = (freq: number, dur: number, type: OscillatorType, vol?: number) => {
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = type || 'sine'; o.frequency.setValueAtTime(freq, ctx.currentTime);
      g.gain.setValueAtTime(vol || 0.3, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.start(ctx.currentTime); o.stop(ctx.currentTime + dur);
      o.onended = () => ctx.close();
    } catch (e) { /* ignore */ }
  };
  const playSuccess = () => { tone(523.25, 0.15, 'sine', 0.3); setTimeout(() => tone(659.25, 0.15, 'sine', 0.3), 150); setTimeout(() => tone(783.99, 0.3, 'sine', 0.3), 300); };
  const playError = () => { tone(220, 0.2, 'sawtooth', 0.2); setTimeout(() => tone(180, 0.3, 'sawtooth', 0.2), 200); };
  const playUnlock = () => [261.63, 329.63, 392, 523.25, 659.25, 783.99].forEach((n, i) => setTimeout(() => tone(n, 0.2, 'sine', 0.3), i * 120));

  /* ---------- speech ---------- */
  const allVoices = () => (typeof speechSynthesis === 'undefined' ? [] : speechSynthesis.getVoices());
  const naturalVoices = () => {
    const vs = allVoices();
    const excl = ['david', 'zira', 'mark', 'hazel'];
    const pref = ['natural', 'enhanced', 'premium', 'neural', 'siri', 'alex', 'samantha', 'victoria', 'karen', 'moira', 'tessa', 'fiona'];
    const out = vs.filter(v => v.lang.startsWith('en') && !excl.some(p => v.name.toLowerCase().includes(p)));
    out.sort((a, b) => (pref.some(p => b.name.toLowerCase().includes(p)) ? 1 : 0) - (pref.some(p => a.name.toLowerCase().includes(p)) ? 1 : 0));
    return out.length ? out : vs.filter(v => v.lang.startsWith('en'));
  };
  const pickVoice = (name?: string | null) => allVoices().find(v => v.name === name) || null;
  const stripEmojis = (t: string) => String(t).replace(/[\u{1F600}-\u{1F64F}]/gu, '').replace(/[\u{1F300}-\u{1F5FF}]/gu, '').replace(/[\u{1F680}-\u{1F6FF}]/gu, '').replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '').replace(/[\u{2600}-\u{26FF}]/gu, '').replace(/[\u{2700}-\u{27BF}]/gu, '').replace(/[\u{FE00}-\u{FE0F}]/gu, '').replace(/[\u{1F900}-\u{1F9FF}]/gu, '').replace(/\s+/g, ' ').trim();
  const speak = (text: string, opts?: { rate?: number; pitch?: number; voice?: any; onEnd?: () => void }) => {
    if (isMuted || typeof speechSynthesis === 'undefined') return;
    speechSynthesis.cancel();
    const clean = stripEmojis(text);
    if (!clean) return;
    const u = new SpeechSynthesisUtterance(clean);
    const voice = opts?.voice || pickVoice(catVoice);
    if (voice) u.voice = voice;
    u.rate = opts?.rate || 0.9; u.pitch = opts?.pitch || 1.0;
    if (opts?.onEnd) u.onend = opts.onEnd;
    speechSynthesis.speak(u);
  };
  const speakLine = (prefix: 'speaker' | 'character', key: string, text: string) => {
    if (isMuted) return;
    const voice = prefix === 'speaker' ? pickVoice(speakerVoices[key]) : pickVoice(characterVoices[key]);
    speak(text, { rate: prefix === 'speaker' ? 0.88 : key === 'Narrator' ? 0.8 : 0.88, voice });
  };
  const stopSpeech = () => { if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); };

  /* ---------- cat ---------- */
  const catMessage = (msg: string, emotion: string, speakIt = true) => {
    setMessage(msg); setCatEmotion(emotion);
    const emojis = CAT_EMOTIONS[emotion] || CAT_EMOTIONS.idle;
    emojiIdx.current = 0; setCatEmoji(emojis[0]);
    if (catTimer.current) clearInterval(catTimer.current);
    catTimer.current = setInterval(() => {
      emojiIdx.current = (emojiIdx.current + 1) % emojis.length;
      setCatEmoji(emojis[emojiIdx.current]);
    }, 600);
    setTimeout(() => { if (catTimer.current) clearInterval(catTimer.current); setCatEmoji(emojis[0]); setCatEmotion('idle'); }, 3000);
    if (speakIt) speak(msg, { rate: 0.95, pitch: 1.1 });
  };
  useEffect(() => () => { if (catTimer.current) clearInterval(catTimer.current); if (karaRec.current) try { karaRec.current.stop(); } catch (e) {} }, []);

  const catFeedback = (kind: 'correct' | 'incorrect') => {
    const fb = DATA.catFeedback?.[kind];
    if (!fb || !fb.length) return kind === 'correct' ? 'Purr-fect!' : 'Keep trying!';
    return fb[Math.floor(Math.random() * fb.length)];
  };

  const totalProgress = () => Math.round((Math.min(1, completedSteps.length / 10) * 50) + (completedModules.includes('conversation') ? 25 : 0) + (completedModules.includes('place') ? 25 : 0));
  const levelInfo = () => { let cur = LEVELS[0]; for (const l of LEVELS) if (xp >= l.xpRequired) cur = l; const next = LEVELS.find(l => l.level === cur.level + 1) || null; const progress = next ? Math.min(100, Math.round(((xp - cur.xpRequired) / (next.xpRequired - cur.xpRequired)) * 100)) : 100; return { cur, next, progress }; };

  const addXP = (amount: number, silent = false) => {
    setXp(prev => {
      const n = prev + amount;
      let nl = 1; for (const l of LEVELS) if (n >= l.xpRequired) nl = l.level;
      if (nl > level) catMessage(`🎉 Level up! You reached level ${nl} — ${LEVELS[nl - 1].name}!`, 'excited');
      return n;
    });
    if (!silent) { setXpToast(`+${amount} XP`); setTimeout(() => setXpToast(null), 1600); }
    setLevel(l => l); // recomputed in levelInfo
  };
  // recompute level from xp
  useEffect(() => {
    let nl = 1; for (const l of LEVELS) if (xp >= l.xpRequired) nl = l.level;
    if (nl > level) setLevel(nl);
  }, [xp]);

  const checkAchievements = () => {
    const checks = [
      { id: 'first_step', c: completedSteps.length >= 1 },
      { id: 'halfway', c: completedSteps.length >= 5 },
      { id: 'lesson_complete', c: completedSteps.length >= 10 },
      { id: 'perfect_quiz', c: quizScores.some(s => s.score === s.total) },
      { id: 'high_quiz', c: quizScores.some(s => s.score / s.total >= 0.8) },
      { id: 'conversation_win', c: completedModules.includes('conversation') },
      { id: 'place_found', c: completedModules.includes('place') },
      { id: 'all_modules', c: completedModules.length >= 3 },
      { id: 'secret_code', c: secretCode !== null },
    ];
    let newXP = 0; let anyNew = false;
    checks.forEach(ch => {
      if (ch.c && !achievements.includes(ch.id)) {
        const a = ACHIEVEMENTS.find(x => x.id === ch.id);
        if (a) { setAchievements(prev => [...prev, ch.id]); newXP += a.xp; setAchPop(a.name); playSuccess(); setTimeout(() => setAchPop(null), 3000); anyNew = true; }
      }
    });
    if (newXP > 0) { setXp(prev => prev + newXP); }
  };
  useEffect(() => { checkAchievements(); }, [completedSteps, quizScores, completedModules, secretCode, achievements]);

  const stepUnlocked = (id: number) => id === 1 || completedSteps.includes(id - 1);

  const completeStep = (s: number) => {
    if (!completedSteps.includes(s)) setCompletedSteps(prev => [...prev, s]);
    if (s < 10) setCurrentStep(s + 1);
    const msgs: Record<number, string> = { 1: 'Great job on the warm-up! Now let\'s explore some important vocabulary.', 2: 'Fantastic! You now know 22 key terms. Let\'s listen to them in action.', 3: 'Wonderful listening! Now read about the topic at your own level.', 4: 'You read the article! Now let\'s try speaking it aloud.', 5: 'Amazing speaking practice! Time to analyse the grammar.', 6: 'Excellent grammar work! Now listen to a radio drama.', 7: 'Brilliant! Now test how well you can hear and write the sentences.', 8: 'Great dictation! Now let\'s discuss the topic critically.', 9: 'Wonderful analysis! Time for the final quiz. Give it your best!' };
    if (msgs[s]) catMessage(msgs[s], 'correct');
    if (!completedSteps.includes(s)) addXP(15);
  };

  /* ---------- karaoke ---------- */
  const karaPassage = useMemo(() => (DATA.reading?.basic?.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), [DATA]);
  const karaWordList = useMemo(() => karaPassage.split(/\s+/).filter(Boolean).map((w, i) => ({ word: w, status: 'pending', index: i })), [karaPassage]);
  useEffect(() => { if (!karaWords.length && karaWordList.length) setKaraWords(karaWordList); }, [karaWordList]);

  const karaStart = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setKaraErr('Speech recognition is not supported in your browser. Please use Chrome.'); return; }
    setKaraErr('');
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US';
    karaRec.current = rec; setKaraListening(true); setKaraStartTime(Date.now());
    setKaraWords(prev => prev.length ? prev.map((w, i) => i === 0 ? { ...w, status: 'current' } : w) : prev);
    rec.onresult = (ev: any) => {
      let finalT = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) if (ev.results[i].isFinal) finalT += ev.results[i][0].transcript;
      if (finalT) processKara(finalT);
    };
    rec.onerror = () => setKaraListening(false);
    rec.onend = () => { if (karaListening) { try { rec.start(); } catch (e) {} } };
    try { rec.start(); } catch (e) {}
  };
  const processKara = (transcript: string) => {
    const spoken = transcript.trim().toLowerCase().split(/\s+/).map(w => w.toLowerCase().replace(/[^a-z]/g, '')).filter(Boolean);
    if (!spoken.length) return;
    const latest = spoken[spoken.length - 1];
    setKaraWords(prev => {
      const updated = [...prev];
      for (let i = 0; i < Math.min(updated.length, 20); i++) {
        const w = updated[i].word.toLowerCase().replace(/[^a-z]/g, '');
        if (w === latest && updated[i].status === 'pending') {
          updated[i] = { ...updated[i], status: 'correct' };
          if (i + 1 < updated.length) updated[i + 1] = { ...updated[i + 1], status: 'current' };
          else setKaraDone(true);
          if (karaStartTime) { const mins = (Date.now() - karaStartTime) / 60000; const count = updated.filter(x => x.status === 'correct').length; if (mins > 0) setKaraWpm(Math.round(count / mins)); }
          break;
        }
      }
      return updated;
    });
  };
  const karaStop = () => { if (karaRec.current) try { karaRec.current.stop(); } catch (e) {} setKaraListening(false); };

  /* ---------- conversation / place ---------- */
  const cgData: ConversationGameData | undefined = DATA.conversationGame;
  const gpData: GuessThePlaceData | undefined = DATA.guessThePlace;

  const cgAdvance = () => {
    if (!cgData) return;
    const node = cgData.nodes[cgNode];
    const ch = node.choices[cgPicked!];
    setCgPicked(null);
    if (ch) {
      setCgNode(ch.next);
      const nxt = cgData.nodes[ch.next];
      if (nxt?.isEnd) {
        if (nxt.isWin && !completedModules.includes('conversation')) { setCompletedModules(prev => [...prev, 'conversation']); addXP(30); }
        if (nxt.isWin) catMessage('Congratulations! You navigated the interview perfectly!', 'excited');
        else catMessage('Good try! Read the feedback and try again.', 'idle');
      }
    }
  };
  const gpSubmit = () => {
    if (!gpData) return;
    const guess = gpGuess.toLowerCase().trim();
    const name = (gpData.name || '').toLowerCase();
    const city = name.split(',')[0].trim();
    const won = guess.includes(city) || city.includes(guess);
    setGpRevealed(true); setGpWon(won);
    if (won) { playSuccess(); if (!completedModules.includes('place')) { setCompletedModules(prev => [...prev, 'place']); addXP(30); } catMessage(`Purr-fect! It's ${gpData.name}! You're a true world explorer!`, 'excited'); }
    else { playError(); catMessage('Close! But not quite. Read the clues again and try!', 'thinking'); }
  };

  /* ---------- render helpers ---------- */
  const esc = (s: any) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const li = levelInfo();

  const SPEAKER_AVATARS: Record<string, [string, string]> = { 'Maya': ['👩‍💼', 'from-pink-400 to-rose-500'], 'James': ['👨‍💻', 'from-blue-400 to-indigo-500'] };
  const DRAMA_STYLES: Record<string, [string, string]> = { 'Narrator': ['📻', 'from-gray-500 to-gray-700'], 'Mom (Adaeze)': ['👩🏾‍🍳', 'from-rose-400 to-pink-500'], 'Dad (Emeka)': ['👨🏾‍💼', 'from-blue-500 to-indigo-600'], 'Teen (Zoe)': ['👧🏾', 'from-purple-400 to-violet-500'] };

  const VoiceSelect = ({ prefix, key, label, value, onChange, placeholder, emoji, color }: any) => (
    <div className="vs-row">
      <div className="vs-avatar" style={{ background: `linear-gradient(135deg, ${color.split(',')[0]} ${color.split(',')[1]}%)` }}>{emoji}</div>
      <select className="vs-select" value={value || ''} onChange={e => onChange(e.target.value || null)}>
        <option value="">{placeholder}</option>
        {naturalVoices().map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
      </select>
    </div>
  );

  const renderWarmup = () => {
    const w = DATA.warmup || [];
    const item = w[warmCard] || { question: '', answer: '', emoji: '❓' };
    const allRevealed = warmRevealed.length >= w.length;
    return <div>
      <div className="section-head"><span className="sh-icon">🔥</span><h2>Warm-Up Questions</h2><p>Think about each question, then reveal the answer</p></div>
      <div className="warm-nav">{w.map((_, i) => <button key={i} className={'warm-dot' + (i === warmCard ? ' current' : '') + (warmRevealed.includes(i) ? ' revealed' : '')} onClick={() => setWarmCard(i)}>{warmRevealed.includes(i) ? '✓' : i + 1}</button>)}</div>
      <div className="card warm-card"><div className="warm-q"><div className="w-emoji">{item.emoji}</div><p>{item.question}</p></div><div className="warm-a">
        {warmRevealed.includes(warmCard)
          ? <><div style={{ color: '#4ade80', fontWeight: 600, marginBottom: 10 }}>✅ Answer Revealed</div><p style={{ lineHeight: 1.7, color: 'var(--text)' }}>{item.answer}</p><button className="kw-sound" style={{ marginTop: 12 }} onClick={() => speak(item.answer)}>🔊 Listen Again</button></>
          : <div style={{ textAlign: 'center' }}><p style={{ color: 'var(--muted)', fontStyle: 'italic', marginBottom: 14 }}>Take a moment to think about your answer...</p><button className="reveal-btn" onClick={() => { if (!warmRevealed.includes(warmCard)) setWarmRevealed(prev => [...prev, warmCard]); speak(item.answer); }}>💡 Reveal Answer</button></div>}
      </div></div>
      <div className="warm-nav-row">
        <button className="warm-prev" onClick={() => setWarmCard(c => c - 1)} disabled={warmCard === 0}>← Previous</button>
        <span className="warm-count">{warmCard + 1} / {w.length}</span>
        {warmCard < w.length - 1 ? <button className="warm-next" onClick={() => setWarmCard(c => c + 1)}>Next →</button> : <button className="warm-next" style={{ background: 'linear-gradient(135deg,#22c55e,#10b981)' }} disabled={!allRevealed} onClick={() => completeStep(1)}>Complete Step ✓</button>}
      </div>
      {!allRevealed && <p className="warm-hint">Reveal all {w.length} answers to complete this step ({warmRevealed.length}/{w.length} done)</p>}
    </div>;
  };

  const renderKeywords = () => {
    const kws = DATA.keywords || [];
    const filtered = kws.filter(k => (kwFilter === 'All' || k.level === kwFilter) && (!kwSearch || k.term.toLowerCase().includes(kwSearch.toLowerCase()) || k.definition.toLowerCase().includes(kwSearch.toLowerCase())));
    const translations = (DATA.keywordTranslations && DATA.keywordTranslations.es) || {};
    return <div>
      <div className="section-head"><span className="sh-icon">📖</span><h2>Keywords & Phrases</h2><p>{kws.length} terms • flashcards & list view</p></div>
      <div className="kw-toggle">
        <button className={kwMode === 'flashcard' ? 'on' : ''} onClick={() => setKwMode('flashcard')}>🎴 Flashcards</button>
        <button className={kwMode === 'list' ? 'on' : ''} onClick={() => setKwMode('list')}>📋 List View</button>
      </div>
      <div className="kw-progress"><div className="progress-track" style={{ flex: 1, height: 8 }}><div className="progress-fill" style={{ width: `${Math.round((mastered.length / Math.max(1, kws.length)) * 100)}%` }}></div></div><span style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{mastered.length}/{kws.length} mastered</span></div>
      {kwMode === 'flashcard' ? (() => {
        const kw = filtered[kwCard];
        if (!kw) return <p style={{ textAlign: 'center', color: 'var(--muted)', padding: 30 }}>No keywords match your filter.</p>;
        const trans = translations[kw.term] || '';
        return <div>
          <div className="fc-dots">{filtered.slice(0, 10).map((_, i) => <button key={i} className={'fc-dot' + (i === kwCard ? ' cur' : '') + (mastered.includes(kws.indexOf(filtered[i])) ? ' mastered' : '')} onClick={() => { setKwCard(i); setKwFlipped(false); }}></button>)}{filtered.length > 10 && <span style={{ fontSize: 11, color: 'var(--muted)' }}>+{filtered.length - 10}</span>}</div>
          <div className="fc-wrap"><div className={'fc-inner' + (kwFlipped ? ' flipped' : '')} onClick={() => setKwFlipped(!kwFlipped)}>
            <div className="fc-face fc-front"><span className="fc-level">{kw.level}</span><div className="fc-term">{kw.term}</div>{trans && <div className="fc-trans">{trans}</div>}<button className="fc-listen" onClick={e => { e.stopPropagation(); speak(`${kw.term}. ${kw.definition}`); }}>🔊 Listen</button><div className="fc-tap">Tap to flip</div></div>
            <div className="fc-face fc-back"><div className="fc-back-scroll"><div className="fc-def-label">Definition</div><div className="fc-def">{kw.definition}</div><div className="fc-def-label">Example</div><div className="fc-ex">"{kw.example}"</div>{trans && <><div className="fc-def-label">Español</div><div className="fc-trans" style={{ color: 'var(--purple)', fontSize: 14 }}>{trans}</div></>}</div><div className="fc-tap" style={{ color: 'var(--muted)' }}>Tap to flip back</div></div>
          </div></div>
          <div className="fc-nav-row">
            <button className="fc-arr" disabled={kwCard === 0} onClick={() => { setKwCard(c => c - 1); setKwFlipped(false); }}>←</button>
            <button className="fc-master" onClick={() => { playSuccess(); if (!mastered.includes(kws.indexOf(kw))) setMastered(prev => [...prev, kws.indexOf(kw)]); if (kwCard < filtered.length - 1) { setKwCard(c => c + 1); setKwFlipped(false); } }}>✓ Mastered</button>
            <button className="fc-arr" disabled={kwCard >= filtered.length - 1} onClick={() => { setKwCard(c => c + 1); setKwFlipped(false); }}>→</button>
          </div>
        </div>;
      })() : (
        <div>
          <div className="kw-list-search">
            <span style={{ position: 'relative', flex: 1, minWidth: 180 }}><input className="kw-search" style={{ width: '100%', paddingLeft: 34 }} placeholder="Search terms..." value={kwSearch} onChange={e => { setKwSearch(e.target.value); setKwCard(0); }} /><span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>🔍</span></span>
            {['All', 'B1', 'B2'].map(l => <button key={l} className={'kw-level-btn' + (kwFilter === l ? ' on' : '')} onClick={() => { setKwFilter(l); setKwCard(0); }}>{l}</button>)}
          </div>
          <div className="kw-list">{filtered.map(k => {
            const gi = kws.indexOf(k); const isM = mastered.includes(gi); const tr = translations[k.term] || '';
            return <div key={k.term} className={'kw-item' + (isM ? ' mastered' : '')}>
              <button className="kw-check" onClick={() => setMastered(prev => isM ? prev.filter(x => x !== gi) : [...prev, gi])}>✓</button>
              <div className="kw-main"><span className="kw-term">{k.term}</span>{tr && <span style={{ color: 'var(--purple)', fontSize: 12 }}> ({tr})</span>}<div className="kw-def">{k.definition}</div></div>
              <button className="kw-sound" onClick={() => speak(`${k.term}. ${k.definition}`)}>🔊</button>
            </div>;
          })}</div>
        </div>
      )}
      <button className="grad-btn" style={{ marginTop: 16 }} onClick={() => completeStep(2)}>Continue to Listening ✓</button>
    </div>;
  };

  const renderListen = () => {
    const d = DATA.dialogue || { title: '', speakers: [], lines: [] };
    const emotions: Record<string, string> = { curious: 'rgba(250,204,21,.15),#fbbf24', calm: 'rgba(59,130,246,.15),#93c5fd', surprised: 'rgba(249,115,22,.15),#fb923c', reflective: 'rgba(139,92,246,.15),#c4b5fd', thoughtful: 'rgba(20,184,166,.15),#5eead4', concerned: 'rgba(239,68,68,.15),#fca5a5', serious: 'rgba(107,114,128,.15),#9ca3af', honest: 'rgba(99,102,241,.15),#a5b4fc', happy: 'rgba(34,197,94,.15),#86efac', amused: 'rgba(236,72,153,.15),#f9a8d4', encouraging: 'rgba(16,185,129,.15),#6ee7b7' };
    return <div>
      <div className="section-head"><span className="sh-icon">🎧</span><h2>Listen to the Dialogue</h2><p>{d.title}</p></div>
      {isMuted && <div className="muted-banner">🔇 Audio is muted. Unmute the cat to hear the dialogue.</div>}
      {dialogueVoicesOpen ? (
        <div className="voice-setup"><div className="vs-title">🎙️ Choose Voices for Each Character</div>
          {(d.speakers || []).map(s => { const a = SPEAKER_AVATARS[s] || ['👤', '107,114,128,.6']; return <VoiceSelect key={s} prefix="speaker" label={s} value={speakerVoices[s]} onChange={v => setSpeakerVoices(prev => ({ ...prev, [s]: v }))} placeholder={`Select voice for ${s}`} emoji={a[0]} color={a[1]} />; })}
          <button className="vs-skip" onClick={() => setDialogueVoicesOpen(false)}>Skip (use default voices)</button></div>
      ) : (
        <div className="speaker-cards">
          {(d.speakers || []).map(s => { const a = SPEAKER_AVATARS[s] || ['👤', '107,114,128,.6']; return <div key={s} className="speaker-card"><div className="vs-avatar" style={{ background: `linear-gradient(135deg, ${a[1].split(',')[0]} ${a[1].split(',')[1]}%)` }}>{a[0]}</div><div><div className="s-name">{s}</div><div className="s-voice">{(speakerVoices[s] || 'Default').slice(0, 20)}</div></div></div>; })}
          <button className="icon-btn" onClick={() => setDialogueVoicesOpen(true)}>⚙️</button></div>
      )}
      <div className="play-row">
        {!dialoguePlaying ? <button className="play-btn" disabled={isMuted} onClick={() => {
          setDialoguePlaying(true); setDialogueVoicesOpen(false); setDialogueLine(0);
          const lines = d.lines; let i = 0;
          const playNext = () => {
            if (i >= lines.length) { setDialoguePlaying(false); setDialogueLine(-1); setDialoguePlayed(true); return; }
            const line = lines[i]; setDialogueLine(i);
            speak(line.text, { rate: 0.88, pitch: pickVoice(speakerVoices[line.speaker]) ? 1.0 : (line.speaker === 'Maya' ? 1.2 : 0.85), voice: pickVoice(speakerVoices[line.speaker]), onEnd: () => { i++; setTimeout(playNext, 400); } });
          };
          playNext();
        }}><span style={{ fontSize: 22 }}>▶</span> {dialoguePlayed ? 'Play Again' : 'Play Dialogue'}</button>
        : <button className="play-btn stop" onClick={() => { stopSpeech(); setDialoguePlaying(false); setDialogueLine(-1); }}><span style={{ fontSize: 22 }}>⏹</span> Stop</button>}
      </div>
      <div className="transcript">{(d.lines || []).map((l, i) => {
        const a = SPEAKER_AVATARS[l.speaker] || ['👤', '107,114,128,.6'];
        const isMaya = l.speaker === 'Maya'; const active = dialogueLine === i;
        const em = emotions[l.emotion] ? <span className="msg-emotion" style={{ background: emotions[l.emotion].split(',')[0], color: emotions[l.emotion].split(',')[1] }}>{l.emotion}</span> : null;
        return <div key={i} className={'msg-row' + (isMaya ? ' reverse' : '')}>
          <div className="msg-avatar" style={{ background: `linear-gradient(135deg, ${a[1].split(',')[0]} ${a[1].split(',')[1]}%)`, ...(active ? { outline: '3px solid var(--purple)', outlineOffset: 2 } : {}) }}>{a[0]}</div>
          <div className="msg-body"><div className="msg-meta" style={isMaya ? { flexDirection: 'row-reverse' } : {}}><span className="msg-speaker">{l.speaker}</span>{em}<button className="msg-play" title="Play this line" onClick={() => speakLine('speaker', l.speaker, l.text)}>▶</button><select className="vs-inline" title={`Voice for ${l.speaker}`} value={speakerVoices[l.speaker] || ''} onChange={e => setSpeakerVoices(prev => ({ ...prev, [l.speaker]: e.target.value || null }))}><option value="">🎙️</option>{naturalVoices().map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}</select></div><div className={'msg-bubble' + (active ? ' active' : '')}>{l.text}</div></div>
        </div>;
      })}</div>
      <button className="grad-btn" style={{ marginTop: 16 }} onClick={() => completeStep(3)}>Continue to Reading ✓</button>
    </div>;
  };

  const renderReading = () => {
    const r = DATA.reading || {}; const art = r[readLevel] || { title: '', content: '' };
    const levels = [{ id: 'basic' as const, label: '🌱 Basic' }, { id: 'intermediate' as const, label: '📘 Intermediate' }, { id: 'advanced' as const, label: '🎓 Advanced' }];
    return <div>
      <div className="section-head"><span className="sh-icon">📰</span><h2>Multi-Level Reading</h2><p>Read the same topic at three difficulty levels</p></div>
      <div className="read-tabs">{levels.map(l => <button key={l.id} className={'read-tab' + (readLevel === l.id ? ' on' : '')} onClick={() => { stopSpeech(); setReadLevel(l.id); setReadPlaying(false); }}>{l.label}</button>)}</div>
      <div className="read-badge-bar"><span style={{ fontSize: 22 }}>{readLevel === 'basic' ? '🌱' : readLevel === 'intermediate' ? '📘' : '🎓'}</span><div><div style={{ fontWeight: 700, fontSize: 13 }}>{levels.find(l => l.id === readLevel)!.label} Level</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{(readLevel === 'basic' ? 'A1/A2' : readLevel === 'intermediate' ? 'B1/B2' : 'B2/C1')} vocabulary</div></div>
        {!readPlaying ? <button className="read-listen" disabled={isMuted} onClick={() => { setReadPlaying(true); speak(art.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), { rate: 0.85, onEnd: () => setReadPlaying(false) }); }}>🔊 Listen</button> : <button className="read-listen" style={{ color: '#f87171' }} onClick={() => { stopSpeech(); setReadPlaying(false); }}>⏹ Stop</button>}
      </div>
      <div className="read-art"><h3>{art.title}</h3><div dangerouslySetInnerHTML={{ __html: art.content }} /></div>
      <button className="grad-btn" style={{ marginTop: 16 }} onClick={() => completeStep(4)}>Continue to Speaking ✓</button>
    </div>;
  };

  const renderKaraoke = () => {
    const correctCount = karaWords.filter(w => w.status === 'correct').length;
    const progress = Math.round((correctCount / Math.max(1, karaWords.length)) * 100);
    return <div>
      <div className="section-head"><span className="sh-icon">🎤</span><h2>Karaoke Reading Mode</h2><p>Read aloud — words highlight as you speak</p></div>
      <div className="kara-stats">
        <div className="kara-stat" style={{ borderColor: 'rgba(34,197,94,.3)' }}><div className="v" style={{ color: '#4ade80' }}>{correctCount}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Words Said</div></div>
        <div className="kara-stat" style={{ borderColor: 'rgba(139,92,246,.3)' }}><div className="v" style={{ color: '#c4b5fd' }}>{karaWpm}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>WPM</div></div>
        <div className="kara-stat" style={{ borderColor: 'rgba(59,130,246,.3)' }}><div className="v" style={{ color: '#93c5fd' }}>{progress}%</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Progress</div></div>
      </div>
      <div className="progress-track" style={{ marginBottom: 14 }}><div className="progress-fill" style={{ width: `${progress}%` }}></div></div>
      <div className="play-row">
        {!karaListening ? <button className="play-btn" style={{ background: 'linear-gradient(135deg,#ef4444,#ec4899)' }} onClick={karaStart}>🎤 Start Speaking</button> : <button className="play-btn stop" onClick={karaStop}>⏹ Stop</button>}
        <button className="play-btn" style={{ background: 'var(--panel2)', color: 'var(--muted)' }} onClick={() => { karaStop(); setKaraWords([]); setKaraWpm(0); setKaraStartTime(null); setKaraDone(false); }}>🔄 Reset</button>
      </div>
      {karaListening && <div className="kara-listen-row"><span className="listen-dot"></span> Listening...</div>}
      {karaErr && <div className="muted-banner" style={{ color: '#fca5a5', borderColor: 'rgba(239,68,68,.4)', background: 'rgba(239,68,68,.1)' }}>{karaErr}</div>}
      <div className="kara-words">{karaWords.map((w, i) => <span key={i} className={'kw-word ' + (w.status === 'correct' ? 'correct' : w.status === 'current' ? 'current' : w.status === 'missed' ? 'missed' : '')}>{w.word}</span>)}</div>
      {karaDone && <div style={{ marginTop: 14, padding: 20, borderRadius: 16, background: 'rgba(34,197,94,.1)', border: '1px solid #22c55e', textAlign: 'center' }}><div style={{ fontSize: 34 }}>🎉</div><div style={{ fontWeight: 700, color: '#4ade80', marginTop: 6 }}>Reading Complete!</div><div style={{ fontSize: 13, color: 'var(--muted)' }}>Final speed: {karaWpm} WPM</div></div>}
      <button className="grad-btn" style={{ marginTop: 16 }} onClick={() => completeStep(5)}>Continue to Grammar Analysis ✓</button>
    </div>;
  };

  const renderGrammar = () => {
    const slides = DATA.grammarSlides || [];
    const grouped: Record<string, any[]> = { 'A2/B1': [], 'B1/B2': [], 'B2/C1': [] };
    slides.forEach(s => (grouped[s.level] = grouped[s.level] || []).push(s));
    const levelColors: Record<string, string> = { 'A2/B1': 'rgba(34,197,94,.12),#4ade80', 'B1/B2': 'rgba(59,130,246,.12),#60a5fa', 'B2/C1': 'rgba(139,92,246,.12),#c4b5fd' };
    return <div>
      <div className="section-head"><span className="sh-icon">🔬</span><h2>Language Analysis</h2><p>Grammar structures across CEFR levels — click any to explore</p></div>
      <div className="gram-progress"><div style={{ flex: 1 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}><span>Slides explored</span><span>{gramViewed.length}/{slides.length}</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${Math.round((gramViewed.length / Math.max(1, slides.length)) * 100)}%` }}></div></div></div></div>
      {Object.keys(grouped).map(lvl => { if (!grouped[lvl].length) return null; const c = levelColors[lvl] || levelColors['A2/B1'];
        return <div key={lvl} className="gram-group"><div className="gram-lvl-badge" style={{ background: c.split(',')[0], color: c.split(',')[1], border: `1px solid ${c.split(',')[1]}` }}>CEFR {lvl}</div>
          {grouped[lvl].map(g => { const idx = slides.indexOf(g); const open = gramOpen === idx; const viewed = gramViewed.includes(idx);
            return <div key={idx} className={'gram-card' + (open ? ' open' : '')} onClick={() => { if (open) setGramOpen(null); else { setGramOpen(idx); if (!gramViewed.includes(idx)) setGramViewed(prev => [...prev, idx]); speak(`${g.structure}. ${g.meaning}. Example: ${g.example}`); } }}>
              <div className="gram-head"><div className="gram-ico" style={viewed ? { background: c.split(',')[0], color: c.split(',')[1] } : {}}>{viewed ? '✅' : '📌'}</div><div style={{ flex: 1, minWidth: 0 }}><div className="gram-title">{g.structure}</div>{!open && <div className="gram-meaning">{g.meaning}</div>}</div><span className="gram-caret">▾</span></div>
              {open && <div className="gram-body"><div className="gram-sec-label">Example</div><div className="gram-ex" style={{ background: c.split(',')[0], color: c.split(',')[1] }}>"{g.example}"</div><div className="gram-sec-label">Meaning & Use</div><p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>{g.meaning}</p><div className="gram-sec-label">⚠️ Common Mistake</div><div className="gram-mistake">{g.mistake}</div><div className="gram-sec-label">Alternatives</div><div className="gram-alts">{(g.alternatives || []).map((a, i) => <span key={i} className="gram-alt">{a}</span>)}</div><button className="gram-listen" onClick={e => { e.stopPropagation(); speak(`${g.structure}. ${g.meaning}. Example: ${g.example}`); }}>🔊 Listen to Explanation</button></div>}
            </div>; })}
        </div>; })}
      <button className="grad-btn" onClick={() => completeStep(6)}>Continue to Radio Drama ✓</button>
    </div>;
  };

  const renderDrama = () => {
    const dr = DATA.radioDrama || { title: '', setting: '', cast: [], lines: [] };
    const ambient: Record<string, string> = { kitchen: '🍳 Kitchen ambiance', office: '💼 Office sounds', cafe: '☕ Café background', street: '🚗 Street noise', park: '🌳 Park atmosphere', rain: '🌧️ Rainy day' };
    const amKey = dr.ambientSound || 'kitchen';
    const qs = dr.comprehensionQuestions || [];
    return <div>
      <div className="section-head"><span className="sh-icon">🎭</span><h2>Radio Drama</h2><p>"{dr.title}" — {dr.setting}</p></div>
      <div className="ambient-pill"><div>🍳 {ambient[amKey] || ambient.kitchen}</div></div>
      {isMuted && <div className="muted-banner">🔇 Audio is muted. Unmute the cat to hear the drama.</div>}
      {dramaVoicesOpen ? (
        <div className="voice-setup"><div className="vs-title">🎙️ Choose Voices for Each Character</div>
          {(dr.cast || []).map(c => { const s = DRAMA_STYLES[c] || ['👤', '107,114,128,.6']; return <VoiceSelect key={c} prefix="character" label={c} value={characterVoices[c]} onChange={v => setCharacterVoices(prev => ({ ...prev, [c]: v }))} placeholder={`Select voice for ${c}`} emoji={s[0]} color={s[1]} />; })}
          <button className="vs-skip" onClick={() => setDramaVoicesOpen(false)}>Skip (use default voices)</button></div>
      ) : !dramaQuizOpen ? (
        <div className="cast-grid">{(dr.cast || []).map(c => { const s = DRAMA_STYLES[c] || ['👤', '107,114,128,.6']; const active = dramaLine >= 0 && dr.lines[dramaLine]?.character === c; return <div key={c} className={'cast-card' + (active ? ' active' : '')}><div className="cast-emoji" style={{ background: `linear-gradient(135deg, ${s[1].split(',')[0]} ${s[1].split(',')[1]}%)` }}>{s[0]}</div><div className="cast-name">{c}</div>{active && <div className="eq"><span></span><span></span><span></span></div>}</div>; })}</div>
      ) : null}
      {!dramaQuizOpen && <div>
        <div className="play-row">
          {!dramaPlaying ? <button className="play-btn" style={{ background: 'linear-gradient(135deg,#f43f5e,#ec4899)' }} disabled={isMuted} onClick={() => {
            setDramaPlaying(true); setDramaVoicesOpen(false); setDramaLine(0);
            const lines = dr.lines; let i = 0;
            const playNext = () => {
              if (i >= lines.length) { setDramaPlaying(false); setDramaLine(-1); setDramaPlayed(true); if (qs.length) { setDramaQuizOpen(true); setDramaAnswers(qs.map(() => null)); setDramaSubmitted(false); } return; }
              const line = lines[i]; setDramaLine(i);
              speak(line.text, { pitch: pickVoice(characterVoices[line.character]) ? 1.0 : (line.character === 'Narrator' ? 1.0 : line.character.includes('Mom') ? 1.15 : line.character.includes('Dad') ? 0.85 : 1.1), rate: line.character === 'Narrator' ? 0.8 : 0.88, voice: pickVoice(characterVoices[line.character]), onEnd: () => { i++; setTimeout(playNext, 500); } });
            };
            playNext();
          }}><span style={{ fontSize: 22 }}>🎙️</span> {dramaPlayed ? 'Replay Drama' : 'Play Radio Drama'}</button>
          : <button className="play-btn stop" onClick={() => { stopSpeech(); setDramaPlaying(false); }}><span>⏹</span> Stop</button>}
          <button className="play-btn" style={{ background: 'var(--panel2)', color: 'var(--muted)' }} onClick={() => setDramaVoicesOpen(true)}>⚙️</button>
        </div>
        <div className="script-box">{(dr.lines || []).map((l, i) => {
          const s = DRAMA_STYLES[l.character] || ['👤', '107,114,128,.6']; const active = dramaLine === i;
          if (l.character === 'Narrator') return <div key={i} className={'narr-line' + (active ? ' active' : '')}>[{l.text}]</div>;
          return <div key={i} className="msg-row"><div className="msg-avatar" style={{ background: `linear-gradient(135deg, ${s[1].split(',')[0]} ${s[1].split(',')[1]}%)`, ...(active ? { outline: '3px solid var(--purple)', outlineOffset: 2 } : {}) }}>{s[0]}</div><div className="msg-body"><div className="msg-meta"><span className="msg-speaker">{l.character}</span><button className="msg-play" title="Play this line" onClick={() => speakLine('character', l.character, l.text)}>▶</button><select className="vs-inline" title={`Voice for ${l.character}`} value={characterVoices[l.character] || ''} onChange={e => setCharacterVoices(prev => ({ ...prev, [l.character]: e.target.value || null }))}><option value="">🎙️</option>{naturalVoices().map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}</select></div><div className={'msg-bubble' + (active ? ' active' : '')} style={{ borderTopLeftRadius: 4 }}>{l.text}</div></div></div>;
        })}</div>
        <button className="grad-btn" style={{ marginTop: 16 }} onClick={() => { if (dramaPlayed && qs.length) { setDramaQuizOpen(true); setDramaAnswers(qs.map(() => null)); } else completeStep(7); }}>{dramaPlayed && qs.length ? 'Take Comprehension Quiz →' : 'Continue to Dictation ✓'}</button>
      </div>}
      {dramaQuizOpen && <div>
        <div className="section-head"><h2 style={{ fontSize: 18 }}>📝 Comprehension Check</h2><p>Test your understanding of the radio drama</p></div>
        {qs.map((q, qi) => <div key={qi} className="card card-pad" style={{ marginBottom: 12 }}><p style={{ fontWeight: 700, marginBottom: 12 }}>{qi + 1}. {q.question}</p>
          {q.options.map((opt, oi) => { const sel = dramaAnswers[qi] === oi; let cls = 'quiz-opt'; if (dramaSubmitted) { if (oi === q.correct) cls += ' correct'; else if (sel) cls += ' wrong'; else cls += ' dim'; } else if (sel) cls += ' correct'; return <button key={oi} className={cls} disabled={dramaSubmitted} onClick={() => setDramaAnswers(prev => { const n = [...prev]; n[qi] = oi; return n; })}><span className="q-letter">{String.fromCharCode(65 + oi)}</span>{opt}</button>; })}
          {dramaSubmitted && <div className="quiz-expl">💡 {q.explanation}</div>}
        </div>)}
        {!dramaSubmitted ? <button className="grad-btn" disabled={dramaAnswers.filter(a => a !== null && a !== undefined).length !== qs.length} onClick={() => { setDramaSubmitted(true); const score = dramaAnswers.filter((a, i) => a === qs[i].correct).length; if (score >= qs.length / 2) { playSuccess(); catMessage(catFeedback('correct'), 'correct'); } else { playError(); catMessage(catFeedback('incorrect'), 'incorrect'); } }}>Check Answers ✓</button>
          : <div><div className={'cg-end ' + (dramaAnswers.filter((a, i) => a === qs[i].correct).length >= qs.length / 2 ? 'win' : 'lose')} style={{ marginBottom: 12 }}><div style={{ fontSize: 34 }}>{dramaAnswers.filter((a, i) => a === qs[i].correct).length >= qs.length / 2 ? '🎉' : '💪'}</div><div style={{ fontWeight: 700, marginTop: 6 }}>You got {dramaAnswers.filter((a, i) => a === qs[i].correct).length}/{qs.length} correct!</div></div>
            <div className="play-row"><button className="play-btn" style={{ background: 'var(--panel2)', color: 'var(--muted)' }} onClick={() => { setDramaQuizOpen(false); setDramaSubmitted(false); setDramaAnswers(qs.map(() => null)); setDramaPlayed(false); setDramaVoicesOpen(true); }}>🔄 Replay Drama</button><button className="play-btn" onClick={() => completeStep(7)}>Continue →</button></div></div>}
      </div>}
    </div>;
  };

  const renderDictation = () => {
    const sents = DATA.dictation?.sentences || [];
    if (!sents.length) return <p style={{ color: 'var(--muted)', textAlign: 'center' }}>No dictation sentences.</p>;
    const sentence = sents[dictIdx];
    const avg = dictScores.length ? Math.round(dictScores.reduce((a, b) => a + b, 0) / dictScores.length) : 0;
    const acc = dictResults.length ? Math.round((dictResults.filter(r => r.correct).length / dictResults.length) * 100) : 0;
    return <div>
      <div className="section-head"><span className="sh-icon">✍️</span><h2>Dictation Challenge</h2><p>Listen carefully and type what you hear</p></div>
      <div className="dict-track">{sents.map((_, i) => <div key={i} className={'dict-seg' + (i < dictIdx ? (dictScores[i] >= 70 ? ' past-g' : ' past-b') : '') + (i === dictIdx ? ' cur' : '')}></div>)}</div>
      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>Sentence {dictIdx + 1} of {sents.length}{dictScores.length ? ` • Average accuracy: ${avg}%` : ''}</div>
      {isMuted && <div className="muted-banner">🔇 Unmute the cat to hear the sentence</div>}
      <div className="card card-pad dict-player"><div style={{ fontSize: 36 }}>🎧</div><p style={{ color: 'var(--muted)', fontSize: 13, margin: '8px 0 14px' }}>{isMuted ? 'Unmute to hear the sentence' : 'Click play to hear the sentence'}</p>
        <div className="play-row"><button className="play-btn" disabled={isMuted} onClick={() => speak(sentence, { rate: 0.7 })}><span style={{ fontSize: 20 }}>▶</span> Play Sentence</button>{dictSubmitted && <button className="play-btn" style={{ background: 'rgba(59,130,246,.2)', color: '#93c5fd' }} onClick={() => speak(sentence, { rate: 0.7 })}>🔁 Hear Again</button>}</div></div>
      <textarea ref={dictRef} rows={3} placeholder="Type what you heard..." className="gp-input" style={{ width: '100%', marginTop: 12, resize: 'none' }} disabled={dictSubmitted} value={dictInput} onChange={e => setDictInput(e.target.value)} />
      {!dictSubmitted ? <button className="grad-btn" style={{ marginTop: 12 }} disabled={!dictInput.trim()} onClick={() => {
        const ow = sentence.toLowerCase().replace(/[.,!?;:]/g, '').split(/\s+/);
        const tw = dictInput.toLowerCase().replace(/[.,!?;:]/g, '').split(/\s+/);
        const results = ow.map((word, i) => ({ word, userWord: tw[i] || '', correct: word === (tw[i] || '').toLowerCase() }));
        const a = results.length ? Math.round((results.filter(r => r.correct).length / results.length) * 100) : 0;
        setDictResults(results); setDictScores(prev => [...prev, a]); setDictSubmitted(true); setTotalAttempts(t => t + 1);
        if (a >= 70) { playSuccess(); setTotalCorrect(c => c + 1); } else { playError(); catMessage(catFeedback('incorrect'), 'incorrect'); }
      }}>Check My Answer ✓</button>
        : <div>
          <div className="dict-acc" style={acc >= 90 ? { borderColor: '#22c55e', background: 'rgba(34,197,94,.1)' } : acc >= 70 ? { borderColor: '#eab308', background: 'rgba(234,179,8,.1)' } : { borderColor: '#ef4444', background: 'rgba(239,68,68,.1)' }}>
            <div className="big" style={{ color: acc >= 90 ? '#4ade80' : acc >= 70 ? '#fbbf24' : '#f87171' }}>{acc}%</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: acc >= 90 ? '#4ade80' : acc >= 70 ? '#fbbf24' : '#f87171' }}>{acc >= 90 ? '🎉 Excellent!' : acc >= 70 ? '👍 Good effort!' : '💪 Keep practicing!'}</div>
          </div>
          <div className="card card-pad" style={{ marginBottom: 12 }}><div className="gram-sec-label" style={{ marginBottom: 8 }}>Word Analysis</div><div className="word-tags">{dictResults.map((r, i) => <span key={i} className={'word-tag ' + (r.correct ? 'good' : 'bad')}>{r.correct ? r.word : <><span style={{ textDecoration: 'line-through', opacity: .6 }}>{r.userWord || '?'}</span> → <b>{r.word}</b></>}</span>)}</div></div>
          <div className="dict-correct">✅ Correct sentence: "{sentence}"</div>
          {dictIdx >= sents.length - 1 ? <button className="grad-btn" style={{ background: 'linear-gradient(135deg,#22c55e,#10b981)' }} onClick={() => completeStep(8)}>Continue to Discussion ✓</button> : <button className="grad-btn" onClick={() => { setDictIdx(i => i + 1); setDictInput(''); setDictSubmitted(false); setDictResults([]); }}>Next Sentence →</button>}
        </div>}
    </div>;
  };

  const renderDiscussion = () => {
    const d = DATA.discussion || { post: '', comments: [] };
    const comments = d.comments || [];
    return <div>
      <div className="section-head"><span className="sh-icon">💬</span><h2>Discussion Corner</h2><p>Select the most insightful comment</p></div>
      <div className="card post-card"><div className="post-head"><div className="post-avatar">🐦</div><div><div className="post-name">TechWatcher</div><div className="post-handle">@TechWatcher • Just now</div></div><span className="post-tag">Discussion Post</span></div><p className="post-text">{d.post}</p><div className="post-stats"><span>❤️ 247 likes</span><span>💬 4 comments</span><span>🔁 89 shares</span></div></div>
      <div className="divider-row"><div className="line"></div><span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>Which response is most insightful?</span><div className="line"></div></div>
      {comments.map((c, i) => {
        let cls = 'comment-card';
        if (discRevealed) { if (c.isCorrect) cls += ' correct-ans'; else if (discSelected === i) cls += ' wrong-ans'; } else if (discSelected === i) cls += ' selected';
        return <div key={i} className={cls} onClick={() => { if (!discRevealed) { setDiscSelected(i); speak(c.text); } }}>
          <div className="comment-row"><div className="comment-avatar">{c.avatar}{discRevealed && (c.isCorrect ? <span className="comment-mark">✓</span> : discSelected === i ? <span className="comment-mark x">✗</span> : null)}</div>
            <div className="comment-main"><div className="comment-name">{c.character}{discSelected === i && !discRevealed && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'rgba(139,92,246,.2)', color: '#c4b5fd' }}>Selected</span>}</div><p className="comment-text">{c.text}</p>{discRevealed && <div className={'comment-fb ' + (c.isCorrect ? 'good' : 'neutral')}><div className="gram-sec-label">📊 Analysis</div>{c.feedback}</div>}</div><div className="radio-dot">{discSelected === i ? '✓' : ''}</div></div>
        </div>;
      })}
      {!discRevealed ? <button className="grad-btn" disabled={discSelected === null} onClick={() => { setDiscRevealed(true); const c = comments[discSelected!]; if (c.isCorrect) { playSuccess(); catMessage(catFeedback('correct'), 'correct'); } else { playError(); catMessage(catFeedback('incorrect'), 'incorrect'); } speak(c.feedback); }}>Submit My Answer ✓</button>
        : <div><div className={'cg-end ' + (comments[discSelected!]?.isCorrect ? 'win' : 'lose')} style={{ marginBottom: 12 }}><p style={{ fontWeight: 700 }}>{comments[discSelected!]?.isCorrect ? '🎉 Excellent critical thinking! You selected the most insightful response.' : '💡 Good try! Read Brittany\'s response for the best critical thinking example.'}</p></div><button className="grad-btn" onClick={() => completeStep(9)}>Continue to Final Quiz ✓</button></div>}
    </div>;
  };

  const renderQuiz = () => {
    const quiz = DATA.quiz || [];
    if (quizResults) {
      const score = quizAnswers.filter(Boolean).length;
      const pct = Math.round((score / Math.max(1, quiz.length)) * 100);
      return <div>
        <div className="results-hero"><div style={{ fontSize: 56 }}>{pct >= 90 ? '🏆' : pct >= 80 ? '⭐' : pct >= 60 ? '👍' : '📖'}</div><h2 style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>Quiz Complete!</h2><div className="big">{pct}%</div><p style={{ fontSize: 15 }}>{score} out of {quiz.length} correct</p></div>
        <div className="kara-stats" style={{ marginTop: 12 }}>
          <div className="kara-stat"><div className="v" style={{ color: '#4ade80' }}>{score}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Correct</div></div>
          <div className="kara-stat"><div className="v" style={{ color: '#f87171' }}>{quiz.length - score}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Incorrect</div></div>
          <div className="kara-stat"><div className="v" style={{ color: '#c4b5fd' }}>{pct}%</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Accuracy</div></div>
        </div>
        {quizSecret && <div className="secret-box"><div style={{ position: 'absolute', left: '15%', top: 8 }} className="sparkle">✨</div><div style={{ position: 'absolute', left: '40%', top: 12 }} className="sparkle">⭐</div><div style={{ position: 'absolute', left: '65%', top: 8 }} className="sparkle">💫</div><div style={{ position: 'absolute', left: '82%', top: 14 }} className="sparkle">✨</div>
          <div style={{ fontSize: 30, marginBottom: 8 }}>🔐</div><h3 style={{ color: '#fff', fontWeight: 900, fontSize: 17, marginBottom: 6 }}>Secret Progress Code Unlocked!</h3><p style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, marginBottom: 14 }}>You scored 80%+ and earned this exclusive code</p><div className="secret-code">{DATA.secretCode}</div><p style={{ color: 'rgba(255,255,255,.5)', fontSize: 11, marginTop: 12 }}>Save this code — it proves you completed today's lesson!</p></div>}
        <div style={{ marginTop: 14 }}><h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Answer Review:</h3>
          {quiz.map((q, i) => <div key={i} className={'review-row ' + (quizAnswers[i] ? 'good' : 'bad')}><span style={{ fontSize: 17 }}>{quizAnswers[i] ? '✅' : '❌'}</span><div style={{ flex: 1 }}><p style={{ fontSize: 13, fontWeight: 500 }}>{q.question}</p>{!quizAnswers[i] && <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{q.explanation}</p>}</div></div>)}
        </div>
        <button className="grad-btn" style={{ marginTop: 16, background: 'linear-gradient(135deg,#22c55e,#10b981)' }} onClick={() => {
          if (!completedSteps.includes(10)) { setCompletedSteps(prev => [...prev, 10]); addXP(15); }
          const s = quizAnswers.filter(Boolean).length;
          setQuizScores(prev => [...prev, { date: new Date().toISOString(), score: s, total: quiz.length }]);
          if (quizSecret && !secretCode) { setSecretCode(DATA.secretCode || null); addXP(50); }
          if (quizSecret) { catMessage(`Incredible! You scored ${s}/${quiz.length} and unlocked the secret code! You're a true language master!`, 'excited'); playUnlock(); } else { catMessage(`You scored ${s}/${quiz.length}. Good effort! Keep studying and try again!`, 'idle'); }
        }}>🎓 Complete Lesson!</button>
      </div>;
    }
    const q = quiz[quizCur] || quiz[0];
    if (!q) return <p style={{ color: 'var(--muted)', textAlign: 'center' }}>No quiz questions.</p>;
    return <div>
      <div className="section-head"><span className="sh-icon">🧠</span><h2>Final Quiz</h2><p>Score 80%+ to unlock the Secret Code</p></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}><div className="progress-track" style={{ flex: 1 }}><div className="progress-fill" style={{ width: `${Math.round((quizCur / quiz.length) * 100)}%` }}></div></div><span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>{quizCur + 1}/{quiz.length}</span></div>
      <div className="quiz-track">{quizAnswers.map((a, i) => <div key={i} className={'quiz-dot ' + (a ? 'good' : 'bad')}>{a ? '✓' : '✗'}</div>)}{Array.from({ length: Math.max(0, quiz.length - quizAnswers.length) }).map((_, i) => <div key={'e' + i} className="quiz-dot" style={{ background: 'var(--border)' }}></div>)}</div>
      <div className="card quiz-q-card"><div className="gram-sec-label" style={{ marginBottom: 6, color: 'var(--purple)' }}>Question {quizCur + 1}</div><p style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.5, marginBottom: 18 }}>{q.question}</p>
        {q.options.map((opt, oi) => { let cls = 'quiz-opt'; if (quizAnswered) { if (oi === q.correct) cls += ' correct'; else if (oi === quizSelected) cls += ' wrong'; else cls += ' dim'; } else if (oi === quizSelected) cls += ' correct'; return <button key={oi} className={cls} disabled={quizAnswered} onClick={() => { setQuizSelected(oi); setQuizAnswered(true); const ok = oi === q.correct; setQuizAnswers(prev => [...prev, ok]); setTotalAttempts(t => t + 1); if (ok) { playSuccess(); setTotalCorrect(c => c + 1); catMessage(catFeedback('correct'), 'correct'); speak(q.explanation); } else { playError(); catMessage(catFeedback('incorrect'), 'incorrect'); speak('Incorrect. ' + q.explanation); } }}><span className="q-letter">{String.fromCharCode(65 + oi)}</span>{opt}</button>; })}
        {quizAnswered && <div className="quiz-expl">💡 {q.explanation}</div>}
      </div>
      {quizAnswered && <button className="grad-btn" style={{ marginTop: 14 }} onClick={() => {
        if (quizCur < quiz.length - 1) { setQuizCur(c => c + 1); setQuizSelected(null); setQuizAnswered(false); } else { setQuizResults(true); const pct = Math.round((quizAnswers.filter(Boolean).length / quiz.length) * 100); if (pct >= 80) { setTimeout(() => { setQuizSecret(true); playUnlock(); speak(`Congratulations! You scored ${pct}% and have unlocked the secret progress code: ${DATA.secretCode}`); }, 1000); } }
      }}>{quizCur < quiz.length - 1 ? 'Next Question →' : 'See Results 🎯'}</button>}
    </div>;
  };

  const renderConversation = () => {
    if (!cgData) return <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>No conversation game in this lesson.</p>;
    const node = cgData.nodes[cgNode] || cgData.nodes.start;
    const char = cgData.characters.find(c => c.name === node.speaker);
    return <div>
      <div className="section-head"><span className="sh-icon">🗣️</span><h2>{cgData.title}</h2><p>{cgData.description}</p></div>
      <div className="cg-chars">{cgData.characters.map(c => <div key={c.name} className="cg-char"><div className="c-avatar" style={{ background: 'linear-gradient(135deg,#a78bfa,#6366f1)' }}>{c.avatar}</div><div><div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.role}</div></div></div>)}</div>
      {node.isEnd ? (
        <div className={'cg-end ' + (node.isWin ? 'win' : 'lose')}><div style={{ fontSize: 44 }}>{node.isWin ? '🎉' : '💼'}</div><div style={{ fontWeight: 900, fontSize: 18, margin: '8px 0' }}>{node.isWin ? 'Welcome Aboard!' : 'Interview Ended'}</div><p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>{node.endMessage}</p><button className="grad-btn" style={{ marginTop: 14, width: 'auto', padding: '12px 28px' }} onClick={() => { setCgNode('start'); setCgPicked(null); }}>🔄 Play Again</button></div>
      ) : (
        <div>
          <div className="card cg-dialogue"><div className="cg-speaker">{char ? char.avatar + ' ' : ''}{node.speaker}</div><div className="cg-text">{node.text}</div></div>
          {node.choices.map((ch, i) => <button key={i} className={'cg-choice' + (cgPicked === i ? ' picked' : '')} onClick={() => { setCgPicked(i); catMessage(ch.catNote, 'thinking'); }}><span style={{ fontWeight: 700, marginRight: 8 }}>{String.fromCharCode(65 + i)}.</span>{ch.text}<div className="cg-cat-note">🐱 {ch.catNote}</div></button>)}
          {cgPicked !== null && <button className="grad-btn" style={{ marginTop: 12 }} onClick={cgAdvance}>Continue →</button>}
        </div>
      )}
    </div>;
  };

  const renderPlace = () => {
    if (!gpData) return <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>No place game in this lesson.</p>;
    const clueHtml = () => {
      let out = esc(gpData.clue);
      Object.keys(gpData.tooltipWords || {}).forEach(w => { out = out.replace(new RegExp(`\\b${w}\\b`, 'gi'), `<span class="gp-word" data-w="${esc(w)}">${w}</span>`); });
      return out;
    };
    return <div>
      <div className="section-head"><span className="sh-icon">🗺️</span><h2>Guess the Place</h2><p>Read the description and guess where in the world you are</p></div>
      <div className="gp-clue" dangerouslySetInnerHTML={{ __html: clueHtml() }} />
      <div style={{ marginBottom: 12 }}><div className="gram-sec-label" style={{ marginBottom: 6 }}>Need a hint?</div>
        {gpData.hints.map((h, i) => i >= gpHintShown ? <button key={i} className="gp-hint-btn" onClick={() => setGpHintShown(s => s + 1)}>🔎 Reveal Hint {i + 1}</button> : <div key={i} className="gp-hint-btn" style={{ cursor: 'default', borderColor: 'rgba(139,92,246,.4)' }}>💡 Hint {i + 1}: <span className="hint">{h}</span></div>)}
      </div>
      <div className="gp-imgs">{gpData.images.map((img, i) => <div key={i} className="gp-img"><span className="e">{img.emoji}</span><div className="l">{img.label}</div><div className="d">{img.description}</div></div>)}</div>
      <div className="gram-sec-label" style={{ marginBottom: 6 }}>Survival phrases — tap to hear</div>
      <div className="gp-phrases">{gpData.survivalPhrases.map((p, i) => <button key={i} className="gp-phrase" onClick={() => speak(`${p.phrase}. ${p.translation}`)}><div className="ph">{p.phrase}</div><div className="pr">{p.pronunciation} — {p.translation}</div></button>)}</div>
      <button className="play-btn" style={{ width: '100%', marginBottom: 12 }} disabled={isMuted} onClick={() => { const lines = gpData.audioTour.lines; let i = 0; const playNext = () => { if (i >= lines.length) return; const l = lines[i]; speak(l.text, { rate: 0.9, onEnd: () => { i++; setTimeout(playNext, 350); } }); }; playNext(); }}>🎧 Audio Tour</button>
      <div className="gram-sec-label" style={{ marginBottom: 6 }}>Fun facts</div>
      <div className="gp-facts">{gpData.funFacts.map((f, i) => <div key={i} className="gp-fact">{f}</div>)}</div>
      {!gpRevealed ? <div className="gp-guess-row"><input className="gp-input" placeholder="What place is this?" value={gpGuess} onChange={e => setGpGuess(e.target.value)} onKeyDown={e => e.key === 'Enter' && gpSubmit()} /><button className="play-btn" onClick={gpSubmit}>Guess!</button></div>
        : <div className={'gp-result ' + (gpWon ? 'cg-end win' : 'cg-end lose')}><div style={{ fontSize: 40 }}>{gpWon ? '🎉' : '🤔'}</div><div style={{ fontWeight: 900, fontSize: 17, margin: '6px 0' }}>{gpWon ? 'Correct!' : 'The answer was...'}</div><div style={{ fontSize: 20, fontWeight: 900, color: 'var(--purple)' }}>{gpData.name}</div><p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>📍 {gpData.country} • 🗣️ {gpData.language}</p>{!gpWon && <button className="grad-btn" style={{ marginTop: 12, width: 'auto', padding: '10px 24px' }} onClick={() => { setGpRevealed(false); setGpGuess(''); }}>Try Another</button>}</div>}
    </div>;
  };

  const renderLeaderboard = () => {
    const rows = [
      { name: learnerName, avatar, xp, me: true },
      { name: 'Amira K.', avatar: '🦊', xp: Math.max(0, xp - 120) },
      { name: 'Liam O.', avatar: '🐼', xp: Math.max(0, xp - 260) },
      { name: 'Sofia R.', avatar: '🦉', xp: Math.max(0, xp - 400) },
      { name: 'Noah B.', avatar: '🐸', xp: Math.max(0, xp - 610) },
    ].sort((a, b) => b.xp - a.xp);
    const max = Math.max(100, rows[0]?.xp || 100);
    return <div>
      <div className="section-head"><span className="sh-icon">🏆</span><h2>Leaderboard</h2><p>You have {xp} XP • Level {level} {li.cur.badge} {li.cur.name}</p></div>
      {rows.map((r, i) => <div key={i} className="lb-card"><div className={'lb-rank ' + (i === 0 ? 'r1' : i === 1 ? 'r2' : i === 2 ? 'r3' : '')}>{i + 1}</div><div className="lb-avatar">{r.avatar}</div><div style={{ flex: 1, minWidth: 120 }}><div className="lb-name">{r.name}{r.me && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'rgba(139,92,246,.2)', color: '#c4b5fd' }}>You</span>}</div><div className="lb-xp">{r.xp} XP</div></div><div className="lb-bar"><div style={{ width: `${Math.round((r.xp / max) * 100)}%` }}></div></div></div>)}
      <div className="card card-pad" style={{ marginTop: 14 }}><div className="gram-sec-label" style={{ marginBottom: 6 }}>Your achievements</div><div className="gp-facts">{ACHIEVEMENTS.map(a => <div key={a.id} className="gp-fact" style={achievements.includes(a.id) ? {} : { opacity: .35 }}>{a.emoji} {a.name}</div>)}</div></div>
    </div>;
  };

  const renderLesson = () => {
    const cur = STEPS[currentStep - 1];
    return <div>
      <div className="step-rail">{STEPS.map(s => {
        let cls = 'step-chip';
        if (s.id === currentStep) cls += ' current';
        else if (completedSteps.includes(s.id)) cls += ' done';
        else if (!stepUnlocked(s.id)) cls += ' locked';
        return <button key={s.id} className={cls} disabled={!stepUnlocked(s.id)} onClick={() => setCurrentStep(s.id)}><span className="s-icon">{completedSteps.includes(s.id) ? '✅' : s.icon}</span><span className="s-label">{s.label}</span><span className="s-num">{s.id}</span></button>;
      })}</div>
      <div className="step-head"><div className="step-head-icon">{cur.icon}</div><div><div className="step-head-label">Step {cur.id} of 10</div><div className="step-head-title">{cur.label}</div><div className="step-head-desc">{cur.desc}</div></div>{completedSteps.includes(cur.id) && <div className="step-done-pill">✓ Completed</div>}</div>
      {currentStep === 1 && renderWarmup()}
      {currentStep === 2 && renderKeywords()}
      {currentStep === 3 && renderListen()}
      {currentStep === 4 && renderReading()}
      {currentStep === 5 && renderKaraoke()}
      {currentStep === 6 && renderGrammar()}
      {currentStep === 7 && renderDrama()}
      {currentStep === 8 && renderDictation()}
      {currentStep === 9 && renderDiscussion()}
      {currentStep === 10 && renderQuiz()}
    </div>;
  };

  const switchModule = (m: any) => {
    stopSpeech(); setModuleTab(m);
    const intros = DATA.catFeedback?.moduleIntro;
    if (intros && intros[m]) catMessage(intros[m], 'idle');
    if (m === 'leaderboard') catMessage('Check out how you rank against other learners! Keep learning to climb higher!', 'idle');
  };

  const catAnimClass = catEmotion === 'correct' || catEmotion === 'excited' ? 'bounce' : catEmotion === 'incorrect' ? 'shake' : catEmotion === 'speaking' ? 'speaking' : catEmotion === 'thinking' ? 'thinking' : '';

  /* ---------- print / export PDF ---------- */
  const printWorksheet = () => {
    const eH = (s: any) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const strip = (h: string) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const section = (title: string, icon: string, body: string) =>
      `<section style="page-break-inside:avoid;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:0 0 16px"><h2 style="font-size:17px;font-weight:800;color:#7c3aed;margin:0 0 10px">${icon} ${title}</h2>${body}</section>`;
    const parts: string[] = [];
    parts.push(`<div style="text-align:center;padding:8px 0 18px;border-bottom:3px solid #7c3aed;margin-bottom:18px"><h1 style="font-size:24px;font-weight:900;color:#111827;margin:0 0 4px">${eH(DATA.topic)}</h1><p style="font-size:13px;color:#6b7280;margin:0">Level ${eH(DATA.level)} · ${eH(DATA.theme)} · Study Worksheet — ${new Date().toLocaleDateString()}</p></div>`);
    parts.push(section('Warm-Up', '🔥', (DATA.warmup || []).map((w, i) => `<div style="margin-bottom:10px"><p style="font-weight:700;font-size:14px;margin:0 0 4px">${i + 1}. ${eH(w.emoji)} ${eH(w.question)}</p><div style="font-size:13px;color:#374151;padding-left:14px;border-left:3px solid #e5e7eb">${eH(w.answer)}</div></div>`).join('') || '<p style="color:#9ca3af">No warm-up questions.</p>'));
    parts.push(section('Keywords & Phrases', '📖', `<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#f3f4f6"><th style="text-align:left;padding:6px 8px;border:1px solid #e5e7eb">Term</th><th style="text-align:left;padding:6px 8px;border:1px solid #e5e7eb">Definition</th><th style="text-align:left;padding:6px 8px;border:1px solid #e5e7eb">Example</th></tr></thead><tbody>${(DATA.keywords || []).map(k => `<tr><td style="padding:6px 8px;border:1px solid #e5e7eb;font-weight:700">${eH(k.term)}</td><td style="padding:6px 8px;border:1px solid #e5e7eb">${eH(k.definition)}</td><td style="padding:6px 8px;border:1px solid #e5e7eb;font-style:italic">${eH(k.example)}</td></tr>`).join('')}</tbody></table>`));
    parts.push(section('Listening — Dialogue', '🎧', (DATA.dialogue?.lines || []).map(l => `<p style="font-size:13px;margin:0 0 6px"><b>${eH(l.speaker)}:</b> ${eH(l.text)}</p>`).join('') || '<p style="color:#9ca3af">No dialogue.</p>'));
    const r = DATA.reading || {};
    parts.push(section('Reading', '📰', ['basic', 'intermediate', 'advanced'].map(lvl => { const a: any = (r as any)[lvl]; if (!a) return ''; const txt = strip(a.content); return `<div style="margin-bottom:12px"><p style="font-weight:800;font-size:14px;color:#4f46e5;margin:0 0 4px">${eH(a.title)}</p><p style="font-size:13px;color:#374151;margin:0;line-height:1.6">${eH(txt.slice(0, 400))}${txt.length > 400 ? '…' : ''}</p></div>`; }).join('') || '<p style="color:#9ca3af">No reading.</p>'));
    parts.push(section('Language Analysis', '🔬', (DATA.grammarSlides || []).map(g => `<div style="margin-bottom:10px"><p style="font-weight:700;font-size:13px;margin:0 0 2px"><span style="color:#7c3aed">${eH(g.level)}</span> · ${eH(g.structure)}</p><p style="font-size:13px;margin:0 0 2px">${eH(g.meaning)}</p><p style="font-size:12px;color:#6b7280;margin:0">"${eH(g.example)}"</p></div>`).join('') || '<p style="color:#9ca3af">No grammar slides.</p>'));
    parts.push(section('Radio Drama', '🎭', (DATA.radioDrama?.lines || []).map(l => `<p style="font-size:13px;margin:0 0 6px"><b>${eH(l.character)}:</b> ${eH(l.text)}</p>`).join('') || '<p style="color:#9ca3af">No drama.</p>'));
    parts.push(section('Dictation', '✍️', (DATA.dictation?.sentences || []).map((s, i) => `<p style="font-size:13px;margin:0 0 6px"><b>${i + 1}.</b> <span style="border-bottom:1px solid #9ca3af;display:inline-block;min-width:260px"></span></p><p style="font-size:12px;color:#9ca3af;margin:0 0 12px">(Answer: ${eH(s)})</p>`).join('') || '<p style="color:#9ca3af">No dictation.</p>'));
    parts.push(section('Discussion', '💬', `<p style="font-size:13px;font-weight:600;margin:0 0 8px">${eH(DATA.discussion?.post)}</p><p style="font-size:12px;color:#6b7280;margin:0 0 6px">Which response is most insightful? Write why below.</p>${(DATA.discussion?.comments || []).map(c => `<div style="font-size:13px;margin:0 0 4px;padding-left:12px;border-left:3px solid #e5e7eb"><b>${eH(c.character)}:</b> ${eH(c.text)}</div>`).join('')}`));
    parts.push(section('Final Quiz', '🧠', (DATA.quiz || []).map((q, i) => `<div style="margin-bottom:12px;page-break-inside:avoid"><p style="font-weight:700;font-size:13px;margin:0 0 6px">${i + 1}. ${eH(q.question)}</p>${(q.options || []).map((o, oi) => `<p style="font-size:13px;margin:0 0 2px;padding-left:12px">${String.fromCharCode(65 + oi)}. <span style="border-bottom:1px solid #9ca3af;display:inline-block;min-width:200px">${eH(o)}</span></p>`).join('')}</div>`).join('') || '<p style="color:#9ca3af">No quiz.</p>'));
    parts.push(`<div style="text-align:center;padding:14px;border:2px dashed #7c3aed;border-radius:12px;font-size:13px;color:#6b7280">Secret code for this lesson: <b style="color:#111827;letter-spacing:.05em">${eH(DATA.secretCode || '—')}</b></div>`);
    const doc = `<!doctype html><html><head><meta charset="utf-8"><title>${eH(DATA.topic)} — Worksheet</title><style>@media print{body{padding:20px}} *{box-sizing:border-box} body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111827;max-width:820px;margin:0 auto;padding:24px} section{break-inside:avoid-page}</style></head><body>${parts.join('')}<script>window.onload=function(){setTimeout(function(){window.print();},250);};</${''}script></body></html>`;
    const win = window.open('', '_blank');
    if (!win) { alert('Popup blocked. Allow popups to print the worksheet.'); return; }
    win.document.open();
    win.document.write(doc);
    win.document.close();
  };

  return <div className={'daily-wrap' + (theme === 'light' ? ' light' : '')}>
    <style>{DAILY_HTML_CSS}</style>
    <div className="app-header"><div className="header-row">
      <div className="avatar-box">{avatar}</div>
      <div className="header-info"><div className="header-name">{learnerName}</div><div className="header-sub">{DATA.topic} • Level {DATA.level} • {li.cur.name}</div><div className="progress-track"><div className="progress-fill" style={{ width: `${totalProgress()}%` }}></div></div></div>
      <div className="streak-pill">🔥 {streak}</div>
      <button className="icon-btn" title="Print / Export PDF study worksheet" onClick={() => printWorksheet()}>🖨️</button>
      <button className="icon-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☀️' : '🌙'}</button>
    </div></div>
    <div className="module-tabs"><div className="tabs-row">
      {[{ id: 'lesson', label: 'Daily Lesson', icon: '📚' }, { id: 'conversation', label: 'Conversation', icon: '🗣️' }, { id: 'place', label: 'Guess Place', icon: '🗺️' }, { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' }].map(m => {
        const done = m.id !== 'lesson' && completedModules.includes(m.id);
        return <button key={m.id} className={'tab-btn' + (module === m.id ? ' active' : '')} onClick={() => switchModule(m.id)}><div className="t-icon">{m.icon}</div><div className="t-label">{m.label}</div>{done && <div className="tab-done">✓ Done</div>}</button>;
      })}
    </div></div>
    <main className="step-enter">
      {module === 'lesson' && renderLesson()}
      {module === 'conversation' && renderConversation()}
      {module === 'place' && renderPlace()}
      {module === 'leaderboard' && renderLeaderboard()}
    </main>
    <footer className="app-footer"><div className="footer-row"><div className="footer-meta" style={{ flex: 1 }}>Global Lesson Progress <span style={{ color: 'var(--purple)' }}>{totalProgress()}%</span></div><div className={'badge-chip' + (completedSteps.length >= 10 ? ' on' : '')}>📚</div><div className={'badge-chip' + (completedModules.includes('conversation') ? ' on' : '')}>🗣️</div><div className={'badge-chip' + (completedModules.includes('place') ? ' on' : '')}>🗺️</div>{secretCode && <div className="secret-pill">🔐 {secretCode}</div>}</div></footer>

    {/* cat mascot */}
    <div className="cat-wrap">
      {catOpen && <div className="cat-bubble-wrap"><div className="cat-bubble"><p className="cb-text">{message}</p>
        <div className="cat-actions"><button className="cat-act" onClick={() => setCatVoicesOpen(o => !o)}>🎙️ Voices</button><button className={'cat-act sound' + (isMuted ? ' off' : '')} onClick={() => { setIsMuted(m => { const nm = !m; if (nm) stopSpeech(); return nm; }); }}>{isMuted ? '🔇 Muted' : '🔊 Sound'}</button></div>
        {catVoicesOpen && <div className="cat-voices">{naturalVoices().map(v => <button key={v.name} className={'cat-voice-btn' + (catVoice === v.name ? ' on' : '')} onClick={() => { setCatVoice(v.name); setCatVoicesOpen(false); speak('Hello! This is how I sound. I will be your guide throughout the lesson!', { rate: 0.95, pitch: 1.1 }); }}>{v.name} ({v.lang})</button>)}</div>}
        <div className="cb-arrow"></div></div></div>}
      <button className={'cat-btn ' + catAnimClass} onClick={() => setCatOpen(o => !o)} aria-label="Cat assistant"><span className="cat-emoji">{catEmoji}</span>{message && <span className="cat-dot"></span>}</button>
    </div>

    {xpToast && <div className="xp-toast">{xpToast}</div>}
    {achPop && <div className="ach-pop"><span style={{ fontSize: 24 }}>🏆</span><div><div style={{ fontSize: 11, opacity: .8 }}>Achievement Unlocked!</div>{achPop}</div></div>}
  </div>;
};

export default DailyPresenter;