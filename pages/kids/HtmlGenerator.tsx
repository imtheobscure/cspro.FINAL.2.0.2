import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Check, Copy, Download, Sparkles, Wand2, ArrowRight,
  AlertCircle, CheckCircle2, RefreshCw, Volume2, Film, Image as ImageIcon,
  Flame, Star, Gamepad2, Calendar, Shield, Swords, Award, Play, Code2
} from 'lucide-react';
import { Learner, TeacherProfile, getAvatarEvolution, getPetEvolution } from './types';
import { LessonConfig, FlipbookJSON, ActivityType, ContentType, Tone, Level } from './utils/flipbookTypes';
import { ACTIVITY_DEFINITIONS, buildMasterAIPrompt } from './utils/flipbookPrompt';
import { buildMasterHomeworkPrompt } from './utils/homeworkPrompt';
import { createEnchantedDemoBook } from './utils/flipbookDemo';
import { FlipBookReader } from './components/flipbook/FlipBookReader';
import { buildStandaloneFlipbookHtml } from './utils/flipbookHtmlExport';
import { playClick, playQuestDing, playStarShower } from './utils/kidsAudio';

const CONTENT_TYPES: ContentType[] = [
  'English Lesson', 'Story Lesson', 'Song Lesson', 'Vocabulary Quest',
  'Grammar Quest', 'Speaking Mission', 'Reading Mission', 'Phonics Lab'
];

const TONES: Tone[] = ['Playful', 'Encouraging', 'Story-based', 'Gamified', 'Discovery-led', 'Adventure'];
const LEVELS: Level[] = ['Pre-A1', 'A1', 'A2', 'B1', 'B2'];

const AGE_BAND_GUIDANCE: Record<string, { label: string; methodology: string }> = {
  '4-6': { label: 'Ages 4–6', methodology: 'Focus on touch-and-say mechanics, nursery rhymes, basic phonics, short oral turns, repetition, and large visual targets.' },
  '7-10': { label: 'Ages 7–10', methodology: 'Prioritize sentence-building games, interactive stories, vocabulary rewards, playful repetition, and supported speaking.' },
  '11-15': { label: 'Ages 11–15', methodology: 'Prioritize grammar challenges, conversational simulations, reading comprehension, reasoning, and age-appropriate autonomy.' },
};

function ageBandFor(age: number): '4-6' | '7-10' | '11-15' {
  return age <= 6 ? '4-6' : age <= 10 ? '7-10' : '11-15';
}

export const HtmlGenerator: React.FC<{
  learnerName?: string;
  learnerAge?: number;
  tutorName?: string;
  tutorStyle?: string;
  learner?: Learner;
  teacher?: TeacherProfile;
}> = ({
  learnerName = 'Luna',
  learnerAge = 8,
  tutorName = 'Wizard Dan',
  tutorStyle = 'Gamified & Discovery-led',
  learner,
  teacher
}) => {
  const avatarRank = learner ? getAvatarEvolution(learner.gender, learner.avatarArchetype, learner.xp) : undefined;
  const petRank = learner ? getPetEvolution(learner.petType, learner.petXp ?? 0) : undefined;

  // Primary Tab: 'flipbook' | 'homework'
  const [activeTab, setActiveTab] = useState<'flipbook' | 'homework'>('flipbook');

  // View state for Flipbook: 'studio' (Setup & Paste) or 'preview' (Interactive 3D Flip Book)
  const [viewMode, setViewMode] = useState<'studio' | 'preview'>('studio');

  const [config, setConfig] = useState<LessonConfig>({
    contentType: 'English Lesson',
    tone: 'Discovery-led',
    level: learner?.targetCEFR || 'A2',
    topic: 'The Crystal Cave & Spoken Magic',
    sourceText: 'Diego Wave and Countess Vespera discover a glowing blue crystal door hidden behind vines.',
    requiredActivities: ACTIVITY_DEFINITIONS.map(activity => activity.id),
    useTutorInfo: true,
    includeStory: true,
    includeSong: true,
    includeReadAloud: true,
    includeFutureSkills: true,
    includeSEL: true,
    includeCriticalThinking: true,
    includeImages: true,
    includeVideos: true,
    includeAzureVoices: true,
    discoveryMode: true,
    microlearning: true,
    customInstructions: '',
    tutorName: teacher?.characterName || tutorName,
    tutorStyle: teacher?.teachingStyle || tutorStyle,
    learnerName: learner?.name || learnerName,
    learnerAge: learner?.age || learnerAge
  });

  const [jsonInput, setJsonInput] = useState('');
  const [activeBook, setActiveBook] = useState<FlipbookJSON | null>(() => createEnchantedDemoBook(undefined, learner));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const ageBand = ageBandFor(config.learnerAge);
  const [copiedToast, setCopiedToast] = useState(false);

  // Homework Generator State
  const [homeworkBrief, setHomeworkBrief] = useState(
    'Create 5 intense gamified quest rounds (Nitro Word Race, Oral Pronunciation Lab, 3D Memory Match, Shadow Dragon Boss Battle, and Hero SEL Reflection) reviewing the lesson vocabulary and past tense verbs with realistic sound effects!'
  );
  const [homeworkDeadline, setHomeworkDeadline] = useState('Friday, 5:00 PM');
  const [homeworkHtmlInput, setHomeworkHtmlInput] = useState('');
  const [homeworkCopiedToast, setHomeworkCopiedToast] = useState(false);
  const [homeworkPreviewOpen, setHomeworkPreviewOpen] = useState(false);
  const mockHomeworkHtml = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Homework Gen Demo</title><style>body{font-family:system-ui;background:linear-gradient(135deg,#172554,#581c87);padding:18px;color:#172033}main{max-width:860px;margin:auto;background:#fff;padding:28px;border-radius:28px;box-shadow:0 18px 60px #0006}h1{color:#4c1d95;font-size:clamp(28px,5vw,48px)}h2{margin-top:28px;color:#172554}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card{padding:18px;border:3px solid #c4b5fd;border-radius:18px;background:#f5f3ff;cursor:pointer;font-size:20px;font-weight:800}.card:hover{transform:translateY(-2px);background:#ddd6fe}.good{background:#bbf7d0!important;border-color:#16a34a!important}.bad{background:#fecaca!important;border-color:#dc2626!important}input{font-size:20px;padding:14px;border:3px solid #c4b5fd;border-radius:14px;max-width:100%}button{padding:14px 20px;border:0;border-radius:14px;background:#7c3aed;color:white;font-size:18px;font-weight:800;cursor:pointer;margin:5px}.finish{background:#16a34a}#status{padding:18px;border-radius:16px;background:#fef3c7;font-size:20px;font-weight:800;margin-top:20px}</style></head><body><main><h1>🌟 Homework Adventure</h1><p>Try lots of English games: choose, match, spell, speak, type, and finish the quest!</p><h2>1. Choose the right word</h2><div class="grid"><button class="card" onclick="choose(this,false)">A — sleepy</button><button class="card" onclick="choose(this,true)">B — brave</button><button class="card" onclick="choose(this,false)">C — green</button></div><h2>2. Match the word</h2><div class="grid"><button class="card" onclick="match(this,false)">A — whisper</button><button class="card" onclick="match(this,true)">B — speak softly</button><button class="card" onclick="match(this,false)">C — run fast</button></div><h2>3. Spell the word</h2><input id="word" placeholder="Type crystal"><button onclick="checkWord()">Check word</button><h2>4. Say it</h2><button onclick="say()">🔊 Hear crystal</button><button onclick="listen()">🎙️ Say crystal</button><h2>5. Finish</h2><button class="finish" onclick="finish()">✅ Finish homework</button><div id="status">Ready for your quest!</div><script>const s=()=>document.getElementById('status');function choose(b,ok){b.classList.add(ok?'good':'bad');s().textContent=ok?'Correct! +25 XP ✨':'Try again — look at the letters.'}function match(b,ok){b.classList.add(ok?'good':'bad');s().textContent=ok?'Great match! +25 XP':'Try another card.'}function checkWord(){s().textContent=document.getElementById('word').value.trim().toLowerCase()==='crystal'?'Excellent spelling! +25 XP':'Please try again.'}function say(){speechSynthesis?.speak(new SpeechSynthesisUtterance('crystal'))}function listen(){s().textContent='Nice speaking! +25 XP 🎤'}function finish(){s().textContent='Homework complete! You did it! 🎉 +150 XP'}</script></main></body></html>`;

  const personalization = useMemo(() => {
    if (!learner) return 'Hero learner with curiosity and brave mindset. Use simple child-friendly English.';
    const sessions = (learner.sessionLogs || []).slice(-8).map((session: any) => `${session.date || ''}: ${session.summary || session.topic || ''}`).join(' | ');
    const quests = [...(learner.currentQuests || []), ...(learner.completedQuests || [])].join(', ');
    const homework = (learner.homework || []).map((item: any) => item.title || item.name || item.description || '').join(', ');
    return `PERSONALIZED LEARNER DATA — Name: ${learner.name}; age: ${learner.age}; avatar: ${avatarRank?.emoji} ${avatarRank?.form}; pet: ${petRank?.emoji} ${petRank?.form}; interests: ${(learner.interests || []).join(', ') || 'none recorded'}; learning style: ${learner.learningStyle || 'playful visual'}; goals: ${(learner.smartGoals || []).map((goal: any) => goal.goal).join(', ') || 'build confidence'}; skills: ${Object.entries(learner.skills || {}).map(([k, v]) => `${k} ${v}%`).join(', ')}; strengths: ${(learner.sessionLogs || []).flatMap((session: any) => (session.strengths || []).map((item: any) => typeof item === 'string' ? item : item.text)).join(', ') || 'curiosity and effort'}; focus areas: ${(learner.weaknesses || []).map((item: any) => item.name).join(', ') || 'gentle review'}; recent sessions: ${sessions || 'none recorded'}; quests: ${quests || 'none recorded'}; homework: ${homework || 'none recorded'}. Use this data in every story, game, reward, example, and message. Use short, clear, friendly words.`;
  }, [learner, avatarRank, petRank]);

  // Copy Flipbook Master Prompt
  const handleCopyPrompt = () => {
    playClick();
    const masterPrompt = buildMasterAIPrompt(config, personalization);
    navigator.clipboard.writeText(masterPrompt);
    setCopiedToast(true);
    playQuestDing();
    setTimeout(() => setCopiedToast(false), 3000);
  };

  // Copy Homework Master Prompt
  const handleCopyHomeworkPrompt = () => {
    if (!activeBook) return;
    playClick();
    const hwPrompt = buildMasterHomeworkPrompt(
      activeBook,
      homeworkBrief,
      homeworkDeadline,
      learner,
      teacher
    );
    navigator.clipboard.writeText(hwPrompt);
    setHomeworkCopiedToast(true);
    playQuestDing();
    setTimeout(() => setHomeworkCopiedToast(false), 3000);
  };

  useEffect(() => {
    if (!homeworkHtmlInput.trim()) setHomeworkHtmlInput(mockHomeworkHtml);
  }, []);

  // Load Demo Book
  const handleLoadDemo = () => {
    playClick();
    const demo = createEnchantedDemoBook(config, learner);
    setActiveBook(demo);
    setJsonInput(JSON.stringify(demo, null, 2));
    setJsonError(null);
    playStarShower();
  };

  // Validate & Parse Pasted JSON
  const handleValidateAndPreview = () => {
    playClick();
    if (!jsonInput.trim()) {
      if (activeBook) {
        setViewMode('preview');
        return;
      }
      setJsonError('Please paste your AI-generated JSON into the box below.');
      return;
    }

    try {
      let cleaned = jsonInput.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(json)?\s*/i, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(cleaned) as FlipbookJSON;
      if (!parsed.title || !Array.isArray(parsed.sections)) {
        throw new Error("JSON is missing required 'title' or 'sections' array.");
      }

      setActiveBook(parsed);
      setJsonError(null);
      setViewMode('preview');
      playQuestDing();
      playStarShower();
    } catch (err: any) {
      setJsonError(err?.message || 'Invalid JSON format. Please check syntax.');
    }
  };

  // Standalone HTML Download for Flipbook
  const handleDownloadStandaloneHtml = () => {
    if (!activeBook) return;
    playClick();
    const htmlString = buildStandaloneFlipbookHtml({ ...activeBook, contentType: activeBook.contentType || config.contentType });
    const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const slug = (activeBook.title || 'flipbook').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    link.href = url;
    link.download = `${slug}-flip-book.html`;
    link.click();
    URL.revokeObjectURL(url);
    playStarShower();
  };

  // Standalone HTML Download for Homework Game
  const handleDownloadHomeworkHtml = () => {
    if (!homeworkHtmlInput.trim()) return;
    playClick();
    let cleaned = homeworkHtmlInput.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(html)?\s*/i, '').replace(/\s*```$/, '');
    }
    const blob = new Blob([cleaned], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const slug = (learner?.name || 'hero').toLowerCase();
    link.href = url;
    link.download = `${slug}-homework-quest.html`;
    link.click();
    URL.revokeObjectURL(url);
    playStarShower();
  };

  const toggleActivity = (actId: ActivityType) => {
    playClick();
    setConfig(prev => {
      const exists = prev.requiredActivities.includes(actId);
      const next = exists
        ? prev.requiredActivities.filter(a => a !== actId)
        : [...prev.requiredActivities, actId];
      return { ...prev, requiredActivities: next };
    });
  };

  // ══════════════════════════════════════════════════════════════
  // VIEW MODE: PREVIEW (Hyper-Realistic 3D Flip Book)
  // ══════════════════════════════════════════════════════════════
  if (viewMode === 'preview' && activeBook) {
    return (
      <FlipBookReader
        book={activeBook}
        onBackToStudio={() => {
          playClick();
          setViewMode('studio');
        }}
        onDownloadHtml={handleDownloadStandaloneHtml}
        onUpdateBook={updated => setActiveBook(updated)}
      />
    );
  }

  // ══════════════════════════════════════════════════════════════
  // VIEW MODE: STUDIO (Flipbook Studio & Gamified Homework Generator)
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2 px-2 sm:px-4">
      {/* ── TOP PRIMARY TAB SWITCHER ── */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => {
            playClick();
            setActiveTab('flipbook');
          }}
          className={`px-6 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'flipbook'
              ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white shadow-xl scale-105'
              : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>📖                  Flipbook Studio</span>
        </button>

        <button
          onClick={() => {
            playClick();
            setActiveTab('homework');
          }}
          className={`px-6 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'homework'
              ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white shadow-xl scale-105'
              : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700'
          }`}
        >
          <Gamepad2 className="w-4 h-4 text-amber-300" />
          <span>🎮 Homework Gen</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB 1: MAGIC BOOK STUDIO
         ══════════════════════════════════════════════════════════ */}
      {activeTab === 'flipbook' && (
        <div className="space-y-6">
          {/* HEADER BANNER */}
          <div className="p-6 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl border-2 border-purple-500/30 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5 z-10">
              <div className="flex items-center gap-2">
                <span className="text-3xl">📖✨</span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Flipbook Studio
                </h2>
                <span className="px-2.5 py-0.5 bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black rounded-full">
                  3D Drag-To-Flip Engine
                </span>
              </div>
              <p className="text-xs sm:text-sm text-purple-200/90 font-medium max-w-2xl">
                Create 3D flipbooks with realistic curling page animations, character dialogues with Azure Natural children's voices, YouTube singalongs, and 27 high-fidelity interactive activities & arcade games.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-2.5 z-10">
              <button
                onClick={handleLoadDemo}
                className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md"
              >
                <Wand2 className="w-4 h-4 text-amber-300" /> Load Enchanted Demo
              </button>
              <button
                onClick={handleValidateAndPreview}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" /> Open Flipbook 📖
              </button>
            </div>
          </div>

          {/* TWO-COLUMN WORKSPACE: LEFT CONFIG + RIGHT PROMPT & PASTE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: BOOK CONFIGURATION */}
            <div className="lg:col-span-5 space-y-5 bg-white dark:bg-slate-900/80 rounded-3xl p-5 sm:p-6 border-2 border-purple-200 dark:border-slate-800 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-black text-base text-slate-900 dark:text-purple-100 flex items-center gap-2">
                  ⚙️ Lesson Parameters
                </h3>
                <span className="text-xs font-bold text-slate-400">Step 1</span>
              </div>

              <div className="space-y-4">
                {/* Topic & Lesson Name */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">
                    Lesson Topic or Quest Theme
                  </label>
                  <input
                    type="text"
                    value={config.topic}
                    onChange={e => setConfig({ ...config, topic: e.target.value })}
                    placeholder="e.g. The Crystal Cave, Ocean Phonics, Space Aliens..."
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 focus:border-purple-500 outline-none"
                  />
                </div>

                {/* Age band methodology */}
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border-2 border-purple-200 dark:border-purple-800">
                  <label className="block text-xs font-black text-purple-900 dark:text-purple-200 mb-1">Learner age & methodology</label>
                  <input
                    type="number"
                    min={4}
                    max={15}
                    value={config.learnerAge}
                    onChange={e => setConfig({ ...config, learnerAge: Math.max(4, Math.min(15, Number(e.target.value) || 4)) })}
                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 text-xs font-bold text-slate-800 dark:text-slate-100"
                  />
                  <p className="mt-2 text-[11px] leading-5 font-bold text-purple-800 dark:text-purple-200">{AGE_BAND_GUIDANCE[ageBand].label}: {AGE_BAND_GUIDANCE[ageBand].methodology}</p>
                </div>

                {/* Level & Content Type */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">
                      CEFR Level
                    </label>
                    <select
                      value={config.level}
                      onChange={e => setConfig({ ...config, level: e.target.value as Level })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 focus:border-purple-500 outline-none"
                    >
                      {LEVELS.map(lvl => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">
                      Content Type
                    </label>
                    <select
                      value={config.contentType}
                      onChange={e => setConfig({ ...config, contentType: e.target.value as ContentType })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 focus:border-purple-500 outline-none"
                    >
                      {CONTENT_TYPES.map(ct => (
                        <option key={ct} value={ct}>{ct}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Source Text / Lesson Notes */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">
                    Lesson Content
                  </label>
                  <textarea
                    rows={6}
                    value={config.sourceText}
                    onChange={e => setConfig({ ...config, sourceText: e.target.value })}
                    placeholder="Paste the FULL unit text from your coursebook — every story, dialogue, vocabulary bank, grammar box, song, and exercise. The AI will analyse all parts and build one chapter per natural division."
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-100 focus:border-purple-500 outline-none resize-none"
                  />
                </div>

                {/* Required Activity Toggles */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-2">
                    Select Required Interactive Activities ({config.requiredActivities.length}/{ACTIVITY_DEFINITIONS.length})
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {ACTIVITY_DEFINITIONS.map(act => {
                      const isSelected = config.requiredActivities.includes(act.id);
                      return (
                        <button
                          key={act.id}
                          type="button"
                          onClick={() => toggleActivity(act.id)}
                          className={`p-2 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between border cursor-pointer ${
                            isSelected
                              ? 'bg-purple-100 dark:bg-purple-950/60 border-purple-400 text-purple-900 dark:text-purple-200'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 opacity-60'
                          }`}
                        >
                          <span className="truncate">{act.emoji} {act.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: COPY PROMPT & PASTE JSON */}
            <div className="lg:col-span-7 space-y-5 flex flex-col justify-between">
              {/* STEP 1: COPY MASTER PROMPT */}
              <div className="p-5 sm:p-6 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800/90 rounded-3xl border-2 border-purple-300 dark:border-purple-900/50 shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-xs">
                      1
                    </span>
                    <h3 className="font-black text-base text-purple-950 dark:text-purple-100">
                      Copy Flipbook AI Prompt
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                    5X Quality &amp; Quantity
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  Enforces rich 5X reiteration, multi-character dialogues with Azure Natural voices, and age-calibrated activities for {AGE_BAND_GUIDANCE[ageBand].label} ({AGE_BAND_GUIDANCE[ageBand].methodology}).
                </p>

                <button
                  onClick={handleCopyPrompt}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:brightness-110 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl hover:scale-101 active:scale-99 transition-all cursor-pointer"
                >
                  {copiedToast ? (
                    <>
                      <Check className="w-5 h-5 text-emerald-300" />
                      <span>Prompt Copied to Clipboard! Paste in Gemini/ChatGPT ✨</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span>Copy AI Prompt to Clipboard 📋</span>
                    </>
                  )}
                </button>
              </div>

              {/* STEP 2: PASTE JSON & PREVIEW */}
              <div className="p-5 sm:p-6 bg-white dark:bg-slate-900/80 rounded-3xl border-2 border-purple-200 dark:border-slate-800 shadow-md space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs">
                      2
                    </span>
                    <h3 className="font-black text-base text-slate-900 dark:text-purple-100">
                      Paste AI JSON &amp; Open Flipbook
                    </h3>
                    </div>
                    <button
                      onClick={handleLoadDemo}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Wand2 className="w-3.5 h-3.5" /> Paste Demo JSON
                    </button>
                  </div>

                  <textarea
                    value={jsonInput}
                    onChange={e => {
                      setJsonInput(e.target.value);
                      setJsonError(null);
                    }}
                    placeholder="Paste the JSON response from your AI model here (e.g. { title: '...', sections: [...] })..."
                    rows={7}
                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border-2 border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-100 focus:border-indigo-500 outline-none resize-none"
                  />

                  {jsonError && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-200">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{jsonError}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={handleValidateAndPreview}
                    className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white font-black text-sm sm:text-base rounded-2xl shadow-xl flex items-center justify-center gap-2 hover:scale-101 active:scale-99 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <span>Validate &amp; Open Flipbook (Preview) 📖</span>
                  </button>

                  <button
                    onClick={handleDownloadStandaloneHtml}
                    disabled={!activeBook}
                    className="px-5 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm rounded-2xl border border-slate-700 flex items-center justify-center gap-2 hover:scale-101 active:scale-99 transition-all cursor-pointer disabled:opacity-50"
                    title="Download Standalone Flip Book HTML"
                  >
                    <Download className="w-4 h-4" /> Save HTML
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2: GAMIFIED HOMEWORK HTML5 GENERATOR
         ══════════════════════════════════════════════════════════ */}
      {activeTab === 'homework' && (
        <div className="space-y-6">
          {/* BANNER */}
          <div className="p-6 bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 rounded-3xl border-2 border-amber-400 text-white shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-3xl">🎮⚔️</span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Homework Gen
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-amber-100 font-medium max-w-2xl">
                Automatically extracts your Flipbook lesson content, Hero &amp; Pet details, and CEFR level to prompt AI for a 100% standalone, zero-dependency HTML5 gamified homework file with 5 reiterated rounds and audio synthesis!
              </p>
            </div>
            <div className="px-4 py-2 bg-black/20 rounded-2xl border border-white/20 text-xs font-black">
              Learner: {learner?.name || learnerName} {learner?.avatar || '🦸'} • Pet: {petRank?.emoji || '🐾'} {petRank?.form || learner?.petType || ''}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: HOMEWORK PARAMETERS & PROMPT (6 COLS) */}
            <div className="lg:col-span-6 space-y-5 bg-white dark:bg-slate-900/80 rounded-3xl p-5 sm:p-6 border-2 border-amber-300 dark:border-slate-800 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-black text-base text-slate-900 dark:text-amber-100 flex items-center gap-2">
                  📝 Homework Quest Instructions
                </h3>
                <span className="text-xs font-bold text-amber-600">Active Lesson: {activeBook?.title || 'Flipbook'}</span>
              </div>

              {/* Lesson Context Extract */}
              {activeBook && (
                <div className="p-3.5 bg-amber-50 dark:bg-slate-800/70 rounded-2xl border border-amber-200 dark:border-slate-700 text-xs space-y-1.5">
                  <p className="font-black text-amber-900 dark:text-amber-300">
                    📖 Lesson Context Extracted:
                  </p>
                  <p className="text-slate-700 dark:text-slate-300 font-medium">
                    Topic: <span className="font-bold">{activeBook.title}</span> (CEFR {activeBook.level})
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    Target Vocabulary: {activeBook.vocabulary.map(v => v.word).join(', ')}
                  </p>
                </div>
              )}

              {/* Due Date & Deadline Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">
                    📅 Due Date / Deadline
                  </label>
                  <input
                    type="text"
                    value={homeworkDeadline}
                    onChange={e => setHomeworkDeadline(e.target.value)}
                    placeholder="e.g. Friday, 5:00 PM"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">
                    🏆 Completion XP Reward
                  </label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-amber-600 dark:text-amber-400 flex items-center justify-between">
                    <span>+150 XP &amp; Gold Seal</span>
                    <span>🌟</span>
                  </div>
                </div>
              </div>

              {/* Custom Homework Brief Textbox */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">
                  Custom Teacher Homework Brief
                </label>
                <textarea
                  rows={4}
                  value={homeworkBrief}
                  onChange={e => setHomeworkBrief(e.target.value)}
                  placeholder="Explain what kind of homework gamified quest to create..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:border-amber-500 outline-none resize-none"
                />
              </div>

              {/* COPY HOMEWORK MASTER PROMPT BUTTON */}
              <button
                onClick={handleCopyHomeworkPrompt}
                className="w-full py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:brightness-110 text-white font-black text-sm sm:text-base rounded-2xl shadow-xl flex items-center justify-center gap-2.5 cursor-pointer transition-all hover:scale-101 active:scale-99"
              >
                {homeworkCopiedToast ? (
                  <>
                    <Check className="w-5 h-5 text-emerald-300" />
                    <span>Homework AI Prompt Copied! Paste into AI ✨</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    <span>Copy Homework Gen AI Prompt 📋</span>
                  </>
                )}
              </button>
            </div>

            {/* RIGHT COLUMN: PASTE HTML5 & PREVIEW / DOWNLOAD (6 COLS) */}
            <div className="lg:col-span-6 space-y-5 bg-white dark:bg-slate-900/80 rounded-3xl p-5 sm:p-6 border-2 border-amber-300 dark:border-slate-800 shadow-md flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-black text-base text-slate-900 dark:text-amber-100 flex items-center gap-2">
                    📥 Paste &amp; Play HTML5 Homework Code
                  </h3>
                  <span className="text-xs font-bold text-slate-400">Zero Dependencies</span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  Paste the generated standalone HTML5 code from AI below to test the game and save it as a local <code className="font-bold text-amber-600">.html</code> file for your student.
                </p>

                <textarea
                  rows={9}
                  value={homeworkHtmlInput}
                  onChange={e => setHomeworkHtmlInput(e.target.value)}
                  placeholder="Paste AI's generated <!DOCTYPE html> ... </html> code here..."
                  className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border-2 border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-100 focus:border-amber-500 outline-none resize-none"
                />
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => { setHomeworkHtmlInput(mockHomeworkHtml); setHomeworkPreviewOpen(true); playClick(); }}
                  className="flex-1 py-4 bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:brightness-110 text-white font-black text-xs sm:text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Wand2 className="w-4 h-4" /> Paste Cool Demo Game
                </button>
                <button
                  onClick={() => {
                    if (!homeworkHtmlInput.trim()) return;
                    playClick();
                    setHomeworkPreviewOpen(!homeworkPreviewOpen);
                  }}
                  disabled={!homeworkHtmlInput.trim()}
                  className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white font-black text-xs sm:text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 transition-all"
                >
                  <Play className="w-4 h-4" />
                  <span>{homeworkPreviewOpen ? 'Close Game Preview' : 'Play / Test Game Preview 🎮'}</span>
                </button>

                <button
                  onClick={handleDownloadHomeworkHtml}
                  disabled={!homeworkHtmlInput.trim()}
                  className="px-5 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-white font-black text-xs sm:text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 transition-all"
                >
                  <Download className="w-4 h-4" /> Save .HTML File 💾
                </button>
              </div>
            </div>
          </div>

          {/* LIVE IFRAME SANDBOX PREVIEW */}
          {homeworkPreviewOpen && homeworkHtmlInput.trim() && (
            <div className="w-full bg-slate-900 p-4 rounded-3xl border-4 border-amber-400 shadow-2xl space-y-3">
              <div className="flex items-center justify-between text-white pb-2 border-b border-slate-700">
                <h4 className="font-black text-sm flex items-center gap-2">
                  <span>🎮 Live Standalone Game Sandbox</span>
                </h4>
                <button
                  onClick={() => setHomeworkPreviewOpen(false)}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕ Close Preview
                </button>
              </div>

              <div className="w-full h-[600px] rounded-2xl overflow-hidden bg-white">
                <iframe
                  srcDoc={homeworkHtmlInput.replace(/^```(html)?\s*/i, '').replace(/\s*```$/, '')}
                  title="Gamified Homework Quest Sandbox"
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin allow-modals allow-downloads"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
