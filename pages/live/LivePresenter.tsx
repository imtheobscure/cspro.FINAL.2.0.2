import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LiveLessonManual, ProcedureStep } from './liveTypes';
import { LIVE_HTML_CSS } from '../../utils/liveLessonHtmlStyles';
import { normalizeLiveLesson } from '../../data/liveLessonMock';

/* ───────────────────────── helpers ───────────────────────── */

function esc(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function md(text: string): string {
  const t = String(text || '');
  const lines = t.split('\n');
  const tbl: string[] = [];
  const rest: string[] = [];
  for (const ln of lines) {
    if (ln.includes('|')) tbl.push(ln);
    else rest.push(ln);
  }
  let tableHtml = '';
  if (tbl.length > 2) {
    const rows = tbl.filter((l) => !l.includes('---'));
    tableHtml =
      '<table>' +
      rows
        .map((r, j) => {
          const cells = r.split('|').filter((c) => c.trim() !== '');
          return (
            '<tr>' +
            cells
              .map((c) => (j === 0 ? `<td><strong>${mdInline(c.trim())}</strong></td>` : `<td>${mdInline(c.trim())}</td>`))
              .join('') +
            '</tr>'
          );
        })
        .join('') +
      '</table>';
  }
  return mdInline(rest.join('\n')) + tableHtml;
}

function mdInline(t: string): string {
  return t
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#818cf8;text-decoration:underline">$1</a>')
    .replace(/\n/g, '<br/>');
}

function fmtTime(s: number): string {
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

function mdHtml(text: string) {
  return { __html: md(text) };
}

/* Print / Export PDF — renders the whole lesson as a printable study worksheet
   (same content as the standalone HTML's print handler). */
function printWorksheet(manual: LiveLessonManual) {
  const escH = (s: unknown) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const meta = manual.metadata || ({} as any);
  const parts: string[] = [];
  parts.push("<div style='text-align:center;padding:8px 0 18px;border-bottom:3px solid #6366f1;margin-bottom:18px'>" +
    "<h1 style='font-size:24px;font-weight:900;color:#111827;margin:0 0 4px'>" + escH(meta.title || 'Live Lesson') + "</h1>" +
    "<p style='font-size:13px;color:#6b7280;margin:0'>Level " + escH(meta.level || 'B1') + " · " + escH(meta.topic || '') + " · Study Worksheet — " + new Date().toLocaleDateString() + "</p></div>");
  if (meta.learningObjectives?.length) {
    parts.push("<div style='margin-bottom:16px'><b style='font-size:14px'>🎯 Learning objectives</b><ul style='font-size:13px;color:#374151;margin:6px 0 0;padding-left:20px'>" +
      meta.learningObjectives.map((o: any) => "<li>" + escH(typeof o === 'string' ? o : o?.text || '') + "</li>").join('') + "</ul></div>");
  }
  const steps = manual.procedureBlocks || [];
  steps.forEach((step, i) => {
    const act: any = step.h5pActivity || {};
    let inner = '';
    if (step.studentInstructions) inner += "<p style='font-size:13px;margin:0 0 8px;color:#374151'>" + escH(step.studentInstructions) + "</p>";
    const t = act.type || step.type || '';
    if (t === 'would-you-rather' && act.rounds) {
      inner += act.rounds.map((r: any, ri: number) => "<p style='font-size:13px;margin:0 0 6px'><b>" + (ri + 1) + ".</b> " + escH(r.optionA?.text || '') + "  <b>OR</b>  " + escH(r.optionB?.text || '') + "</p><p style='font-size:12px;color:#6b7280;margin:0 0 8px'>Your choice: ________ — Explain why: ________________________________________</p>").join('');
    } else if (t === 'accordion' && act.panels) {
      inner += act.panels.map((p: any) => "<div style='margin-bottom:10px'><p style='font-weight:700;font-size:13px;margin:0 0 2px'>" + escH(p.title || '') + "</p><p style='font-size:13px;color:#374151;margin:0;line-height:1.6'>" + escH(String(p.content || '').replace(/<[^>]*>/g, '').slice(0, 420)) + "</p></div>").join('');
    } else if (t === 'true-false') {
      inner += "<p style='font-size:13px;margin:0 0 4px'><b>Statement:</b> " + escH(act.statement || '') + "</p><p style='font-size:13px;margin:0 0 8px'>Circle one:  ⭕ TRUE   ⭕ FALSE</p><p style='font-size:12px;color:#6b7280;margin:0'>Answer: <b>" + escH(act.correct || act.answer ? 'TRUE' : 'FALSE') + "</b>" + (act.explanation ? ' — ' + escH(act.explanation) : '') + "</p>";
    } else if (t === 'multiple-choice' && act.choices) {
      inner += "<p style='font-size:13px;font-weight:600;margin:0 0 6px'>" + escH(act.question || '') + "</p>" + act.choices.map((c: any, ci: number) => "<p style='font-size:13px;margin:0 0 2px;padding-left:12px'>" + String.fromCharCode(65 + ci) + ". <span style='border-bottom:1px solid #9ca3af;display:inline-block;min-width:200px'>" + escH(c.text || '') + "</span></p>").join('') + "<p style='font-size:12px;color:#6b7280;margin:6px 0 0'>" + act.choices.filter((c: any) => c.correct).map((c: any) => 'Answer: ' + escH(c.text)).join(' · ') + "</p>";
    } else if (t === 'fill-in-blanks' && act.sentences) {
      inner += act.sentences.map((sn: any, si: number) => "<p style='font-size:13px;margin:0 0 8px'><b>" + (si + 1) + ".</b> " + escH(String(sn.text || sn.sentence || '').replace(/_{2,}/g, '________')) + "</p>").join('');
    } else if (t === 'mark-the-words' && act.text) {
      inner += "<p style='font-size:13px;line-height:1.8;margin:0 0 6px'>" + escH(String(act.text).replace(/\[[^\]]*\]/g, (m: string) => m.slice(1, -1))) + "</p><p style='font-size:12px;color:#6b7280;margin:0'>Circle the target words in the text.</p>";
    } else if (t === 'memory-game' && act.pairs) {
      inner += "<p style='font-size:12px;color:#6b7280;margin:0 0 6px'>Match each term with its definition:</p>" + act.pairs.map((p2: any) => "<p style='font-size:13px;margin:0 0 4px'><b>" + escH(p2.term || p2.a || '') + "</b> — match: ________  <span style='color:#6b7280'>(" + escH(p2.definition || p2.b || '').substring(0, 60) + '…)</span></p>').join('');
    } else if (t === 'flashcards' && act.cards) {
      inner += act.cards.map((c: any) => "<p style='font-size:13px;margin:0 0 6px'><b>" + escH(c.front || '') + "</b> → " + escH(c.back || '') + "</p>").join('');
    } else if (t === 'drag-the-words' && act.sentence) {
      inner += "<p style='font-size:13px;margin:0 0 6px'>" + escH(String(act.sentence).replace(/_{2,}/g, '________')) + "</p><p style='font-size:12px;color:#6b7280;margin:0 0 6px'>Word bank: " + escH((act.words || act.bank || []).join(' · ')) + "</p>";
    } else if (t === 'word-cloud') {
      inner += "<p style='font-size:12px;color:#6b7280;margin:0 0 4px'>Write the words that best describe today's learning:</p><p style='font-size:13px;margin:0 0 10px'>1. ____________  2. ____________  3. ____________</p>";
    } else if (t === 'image-hotspots' && act.hotspots) {
      inner += act.hotspots.map((hs: any) => "<p style='font-size:13px;margin:0 0 4px'><b>📍 " + escH(hs.label || hs.title || '') + "</b> — " + escH(String(hs.description || hs.content || '').slice(0, 160)) + "</p>").join('');
    } else if (t === 'spot-the-difference' && act.differences) {
      inner += act.differences.map((d: any, di: number) => "<p style='font-size:13px;margin:0 0 4px'><b>" + (di + 1) + ".</b> " + escH(d.description || d.text || '') + "</p>").join('');
    } else if (t === 'truth-or-dare' && act.items) {
      inner += act.items.map((it: any) => "<p style='font-size:13px;margin:0 0 4px'><span style='color:" + (it.type === 'truth' ? '#2563eb' : '#dc2626') + ";font-weight:700'>" + (it.type === 'truth' ? 'TRUTH' : 'DARE') + "</span> — " + escH(it.text || it.prompt || '') + "</p>").join('');
    } else if (t === 'audio-discussion' && act.prompts) {
      inner += act.prompts.map((p: any, pi: number) => "<p style='font-size:13px;margin:0 0 4px'><b>" + (pi + 1) + ".</b> " + escH(p.text || '') + "</p><p style='font-size:12px;color:#6b7280;margin:0 0 8px'>Your answer (write before recording): ________________________________________</p>").join('');
    } else if (t === 'team-quiz' && act.questions) {
      inner += act.questions.map((q: any, qi: number) => "<div style='page-break-inside:avoid;margin-bottom:10px'><p style='font-weight:700;font-size:13px;margin:0 0 4px'>" + (qi + 1) + ". " + escH(q.question || '') + "</p>" + (q.choices || []).map((c: any, ci: number) => "<p style='font-size:13px;margin:0 0 2px;padding-left:12px'>" + String.fromCharCode(65 + ci) + ". " + escH(c.text || '') + (c.correct ? ' ✓' : '') + "</p>").join('') + "</div>").join('');
    } else {
      inner += "<pre style='font-size:11px;color:#6b7280;background:#f9fafb;padding:8px;border-radius:8px;overflow:hidden'>" + escH(JSON.stringify(act, null, 2).slice(0, 600)) + "</pre>";
    }
    if (step.ccqQuestions?.length) inner += "<p style='font-size:12px;color:#6b7280;margin:8px 0 2px'><b>Concept check:</b> " + step.ccqQuestions.map((c: any) => escH(c.question || '')).join(' · ') + "</p>";
    if (step.speakingQuestions?.length) inner += "<p style='font-size:12px;color:#6b7280;margin:4px 0 2px'><b>Speaking practice:</b> " + step.speakingQuestions.map((sq: any) => escH(sq.question || '')).join(' · ') + "</p>";
    parts.push("<section style='margin-bottom:18px;page-break-inside:avoid'><div style='background:#eef2ff;border-radius:10px 10px 0 0;padding:8px 14px;display:flex;align-items:center;gap:10px'><b style='font-size:14px;color:#312e81'>" + (i + 1) + ". " + escH(step.title || 'Step') + "</b><span style='font-size:11px;color:#6366f1;background:#fff;border:1px solid #c7d2fe;border-radius:999px;padding:2px 10px'>" + escH(String(t).replace(/-/g, ' ')) + "</span></div><div style='border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;padding:14px'>" + inner + "</div></section>");
  });
  const doc = "<!doctype html><html><head><meta charset='utf-8'><title>" + escH(meta.title || 'Live Lesson') + " — Worksheet</title>" +
    "<style>@media print{body{padding:20px}}*{box-sizing:border-box}body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111827;max-width:820px;margin:0 auto;padding:24px}section{break-inside:avoid-page}</style>" +
    "</head><body>" + parts.join('') +
    "<script>window.onload=function(){setTimeout(function(){window.print();},250);};</" + "script>" +
    "</body></html>";
  const win = window.open('', '_blank');
  if (!win) { window.alert('Popup blocked. Allow popups to print the worksheet.'); return; }
  win.document.open();
  win.document.write(doc);
  win.document.close();
}

const TIERS = [
  { min: 500, label: 'Legendary', emoji: '🌟', color: '#fbbf24', cls: 'll-tier-legendary' },
  { min: 250, label: 'Epic', emoji: '🟣', color: '#c084fc', cls: 'll-tier-epic' },
  { min: 100, label: 'Rare', emoji: '🔵', color: '#60a5fa', cls: 'll-tier-rare' },
  { min: 0, label: 'Common', emoji: '⚪', color: '#94a3b8', cls: 'll-tier-common' },
];
function tierFor(p: number) {
  return TIERS.find((t) => p >= t.min) || TIERS[TIERS.length - 1];
}
const PHASES: Record<string, { label: string; emoji: string; cls: string; color: string }> = {
  study: { label: 'Study', emoji: '📖', cls: 'll-pt-study', color: '#60a5fa' },
  speak: { label: 'Speak', emoji: '🎤', cls: 'll-pt-speak', color: '#34d399' },
  review: { label: 'Review', emoji: '🔄', cls: 'll-pt-review', color: '#a78bfa' },
};

const BG_LIST = [
  { id: 'none', name: 'No Background', emoji: '⬜', url: '' },
  { id: 'classroom', name: 'Classroom', emoji: '🏫', url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1920&q=80' },
  { id: 'library', name: 'Library', emoji: '📚', url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1920&q=80' },
  { id: 'cafe', name: 'Cozy Café', emoji: '☕', url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1920&q=80' },
  { id: 'nature', name: 'Nature', emoji: '🌿', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80' },
  { id: 'beach', name: 'Beach', emoji: '🏖️', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80' },
  { id: 'city', name: 'City Skyline', emoji: '🌆', url: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1920&q=80' },
  { id: 'mountains', name: 'Mountains', emoji: '🏔️', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80' },
  { id: 'space', name: 'Space', emoji: '🌌', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=80' },
  { id: 'office', name: 'Modern Office', emoji: '🏢', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&q=80' },
  { id: 'garden', name: 'Garden', emoji: '🌸', url: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=1920&q=80' },
  { id: 'rain', name: 'Rainy Window', emoji: '🌧️', url: 'https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=1920&q=80' },
];
const AMBIENT = [
  { id: 'none', name: 'No Sound', emoji: '🔇', url: '' },
  { id: 'rain', name: 'Gentle Rain', emoji: '🌧️', url: 'https://assets.mixkit.co/active_storage/sfx/2515/2515-preview.mp3' },
  { id: 'forest', name: 'Forest Birds', emoji: '🌲', url: 'https://assets.mixkit.co/active_storage/sfx/2432/2432-preview.mp3' },
  { id: 'ocean', name: 'Ocean Waves', emoji: '🌊', url: 'https://assets.mixkit.co/active_storage/sfx/2167/2167-preview.mp3' },
  { id: 'cafe', name: 'Café Ambience', emoji: '☕', url: 'https://assets.mixkit.co/active_storage/sfx/2188/2188-preview.mp3' },
  { id: 'fire', name: 'Fireplace', emoji: '🔥', url: 'https://assets.mixkit.co/active_storage/sfx/2188/2188-preview.mp3' },
  { id: 'wind', name: 'Gentle Wind', emoji: '🍃', url: 'https://assets.mixkit.co/active_storage/sfx/2432/2432-preview.mp3' },
];

interface StepState {
  status?: 'active' | 'completed';
  score?: number;
  maxScore?: number;
  attempts?: number;
  completedAt?: number;
}
interface Settings {
  idx: number;
  points: number;
  streak: number;
  badges: string[];
  steps: Record<string, StepState>;
  tts: boolean;
  teacher: boolean;
  theme: 'dark' | 'light';
  /** Bumped when the theme default changes, so an old stored default can be replaced. */
  themeV?: number;
  voice: string;
  rate: number;
  pitch: number;
  muted: boolean;
  bg: string;
  ambient: string;
  volume: number;
}
//
// Live lessons are presented on a shared/projected screen, where a light ground
// keeps the room readable — so light is the default, and the dark theme is the
// option the tutor opts into with the sun/moon toggle.
//
const THEME_VERSION = 2;

const DEFAULT_SETTINGS: Settings = {
  idx: 0, points: 0, streak: 0, badges: [], steps: {},
  tts: true, teacher: true, theme: 'light', themeV: THEME_VERSION, voice: '', rate: 0.9, pitch: 1.1, muted: false,
  bg: BG_LIST[1].url, ambient: 'none', volume: 0.3,
};

function useCat(settings: Settings, save: () => void) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const mutedRef = useRef(settings.muted);
  useEffect(() => { mutedRef.current = settings.muted; }, [settings.muted]);

  useEffect(() => {
    const load = () => {
      try { setVoices(window.speechSynthesis?.getVoices() || []); } catch { setVoices([]); }
    };
    load();
    window.speechSynthesis?.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', load);
  }, []);

  const pickVoice = useCallback((): SpeechSynthesisVoice | null => {
    const vs = voices.length ? voices : (window.speechSynthesis?.getVoices() || []);
    if (settings.voice) {
      const found = vs.find((v) => v.name === settings.voice);
      if (found) return found;
    }
    const en = vs.filter((v) => v.lang?.startsWith('en'));
    const natural = en.find((v) => /google|samantha|karen|daniel|moira|tessa|fiona|rishi|ava|zoe|siri|natural|premium|enhanced|neural/i.test(v.name));
    const nonRobotic = en.find((v) => !/david|mark|zira|hazel/i.test(v.name));
    return natural || nonRobotic || en[0] || null;
  }, [voices, settings.voice]);

  const speak = useCallback((text: string, mood?: string) => {
    if (mutedRef.current || !settings.tts) return;
    if (!window.speechSynthesis || !text) return;
    const clean = text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, '').replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '').replace(/#{1,6}\s/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
    if (!clean) return;
    try { window.speechSynthesis.cancel(); } catch { /* noop */ }
    const u = new SpeechSynthesisUtterance(clean);
    u.rate = settings.rate; u.pitch = settings.pitch; u.volume = 1;
    const v = pickVoice();
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
    setMessage(text.substring(0, 110));
    window.setTimeout(() => setMessage(null), 6000);
  }, [settings, pickVoice]);

  return { voices, speak, setVoice: save, message };
}

/* ───────────────────────── feedback / buttons ───────────────────────── */

function Feedback({ feedback, result }: { feedback?: any; result?: 'correct' | 'incorrect' }) {
  if (!feedback || !result) return null;
  const ok = result === 'correct';
  const txt = ok ? feedback.correctFeedback || 'Great job!' : feedback.incorrectFeedback || 'Not quite — try again!';
  return (
    <div className={`ll-fb ${ok ? 'll-ok' : 'll-no'}`}>
      <b>{ok ? '✅ ' : '❌ '} <span dangerouslySetInnerHTML={{ __html: mdInline(txt) }} /></b>
      {feedback.languageNote && <p>💡 <span dangerouslySetInnerHTML={{ __html: mdInline(feedback.languageNote) }} /></p>}
      {feedback.encouragement && <p>{esc(feedback.encouragement)}</p>}
    </div>
  );
}

function Btn({ className, children, onClick, disabled }: { className?: string; children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return <button className={`ll-btn ${className || ''}`} onClick={onClick} disabled={disabled}>{children}</button>;
}

/* ───────────────────────── activities ───────────────────────── */

function ActivityRenderer({ step, ctx }: { step: ProcedureStep; ctx: Ctx }) {
  const a = (step.h5pActivity || { type: step.type }) as any;
  const t = a.type || step.type;
  switch (t) {
    case 'would-you-rather': return <WYR step={step} a={a} ctx={ctx} />;
    case 'accordion': return <Acc step={step} a={a} ctx={ctx} />;
    case 'true-false': return <TF step={step} a={a} ctx={ctx} />;
    case 'mark-the-words': return <MTW step={step} a={a} ctx={ctx} />;
    case 'fill-in-blanks': return <FIB step={step} a={a} ctx={ctx} />;
    case 'memory-game': return <Mem step={step} a={a} ctx={ctx} />;
    case 'image-hotspots': return <IH step={step} a={a} ctx={ctx} />;
    case 'spot-the-difference': return <STD step={step} a={a} ctx={ctx} />;
    case 'truth-or-dare': return <TOD step={step} a={a} ctx={ctx} />;
    case 'drag-the-words': return <DTW step={step} a={a} ctx={ctx} />;
    case 'flashcards': return <FC step={step} a={a} ctx={ctx} />;
    case 'word-cloud': return <WC step={step} a={a} ctx={ctx} />;
    case 'multiple-choice': return <MCQ step={step} a={a} ctx={ctx} />;
    case 'audio-discussion': return <AUD step={step} a={a} ctx={ctx} />;
    case 'team-quiz': return <TQ step={step} a={a} ctx={ctx} />;
    default: return <Default a={a} />;
  }
}

interface Ctx {
  speak: (t: string, m?: string) => void;
  award: (p: number, b?: string) => void;
  complete: (s: number, m: number) => void;
  confetti: (t?: string) => void;
  next: () => void;
}

function Default({ a }: { a: any }) {
  return (
    <div className="ll-default">
      <span className="ll-de">🚧</span>
      <b>Activity: {(a.type || 'activity').replace(/-/g, ' ')}</b>
      <p>This activity type is coming soon!</p>
      <pre className="ll-jsonpre">{JSON.stringify(a, null, 2)}</pre>
    </div>
  );
}

function WYR({ step, a, ctx }: { step: ProcedureStep; a: any; ctx: Ctx }) {
  const rounds = a.rounds?.length ? a.rounds : [{ id: 'r0', question: a.question, optionA: a.optionA, optionB: a.optionB, speakingPrompts: a.speakingPrompts, feedback: a.feedback }];
  const [ri, setRi] = useState(0);
  const [choices, setChoices] = useState<Record<number, string>>({});
  const cur = rounds[ri];
  const pick = (which: string) => {
    if (choices[ri]) return;
    setChoices((c) => ({ ...c, [ri]: which }));
    ctx.award(step.gamification?.points ? Math.ceil(step.gamification.points / rounds.length) : 4);
    ctx.complete(10, 10);
    ctx.confetti('correct');
    ctx.speak(cur.feedback?.correctFeedback || 'Great choice! Now explain why!', 'excited');
  };
  return (
    <div>
      {rounds.length > 1 && (
        <div className="ll-wyrnav">
          <Btn className="ll-ghost" onClick={() => setRi((x) => Math.max(0, x - 1))} disabled={ri === 0}>‹ Back</Btn>
          <div className="ll-wyrdots">
            {rounds.map((r: any, i: number) => (
              <button key={i} className={`ll-wyrdot ${i === ri ? 'll-on' : ''} ${choices[i] ? 'll-chosen' : ''}`} onClick={() => setRi(i)} />
            ))}
            <span style={{ fontSize: 14, color: 'var(--ll-txt2)' }}>{ri + 1} / {rounds.length}</span>
          </div>
          <Btn className="ll-ghost" onClick={() => setRi((x) => Math.min(rounds.length - 1, x + 1))} disabled={ri >= rounds.length - 1}>Next ›</Btn>
        </div>
      )}
      {cur.question && <div className="ll-wyrq">{cur.question}</div>}
      <div className="ll-wyrgrid">
        {[cur.optionA, cur.optionB].map((opt: any, i: number) => (
          <div key={i} className={`ll-wyropt ${choices[ri] === (i ? 'b' : 'a') ? 'll-on' : ''}`}>
            {opt?.emoji && <span className="ll-oe">{opt.emoji}</span>}
            <b>{opt?.text}</b>
            {choices[ri] === (i ? 'b' : 'a') && <span style={{ color: '#34d399', fontWeight: 700 }}>✓ Chosen</span>}
          </div>
        ))}
      </div>
      {choices[ri] ? <Feedback feedback={cur.feedback} result="correct" /> : (
        <div className="ll-btnrow">
          <Btn className="ll-pri" onClick={() => pick('a')}>Choose A</Btn>
          <Btn className="ll-grn" onClick={() => pick('b')}>Choose B</Btn>
        </div>
      )}
      {cur.speakingPrompts?.length > 0 && (
        <div className="ll-spkprompts" style={{ marginTop: 14 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ll-txt2)', marginBottom: 6 }}>🗣️ Speaking prompts</h4>
          <ul>
            {cur.speakingPrompts.map((p: string, i: number) => (
              <li key={i} onClick={() => ctx.speak(p)} style={{ cursor: 'pointer' }}>🔊 {p}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Acc({ step, a, ctx }: { step: ProcedureStep; a: any; ctx: Ctx }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [viewed, setViewed] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const toggle = (id: string) => {
    setOpen((o) => ({ ...o, [id]: !o[id] }));
    const next = { ...viewed, [id]: true };
    setViewed(next);
    const all = a.panels.every((p: any) => next[p.id]);
    if (all && !done) {
      setDone(true);
      ctx.award(step.gamification?.points ?? 15);
      ctx.complete(a.panels.length, a.panels.length);
      ctx.confetti('correct');
    }
  };
  const openAll = () => {
    const o: Record<string, boolean> = {}; const v: Record<string, boolean> = {};
    a.panels.forEach((p: any) => { o[p.id] = true; v[p.id] = true; });
    setOpen(o); setViewed(v);
    if (!done) {
      setDone(true);
      ctx.award(step.gamification?.points ?? 15);
      ctx.complete(a.panels.length, a.panels.length);
      ctx.confetti('correct');
    }
  };
  const allViewed = a.panels.every((p: any) => viewed[p.id]);
  return (
    <div>
      {a.panels.map((p: any) => (
        <div key={p.id} className={`ll-acc ${open[p.id] ? 'll-open' : ''}`}>
          <button className="ll-accbtn" onClick={() => toggle(p.id)}>
            <span dangerouslySetInnerHTML={{ __html: mdInline(p.title) }} /> <span>{open[p.id] ? '▴' : '▾'}</span>
          </button>
          <div className="ll-accbody" dangerouslySetInnerHTML={mdHtml(p.content)} />
        </div>
      ))}
      {!allViewed ? (
        <div className="ll-btnrow"><Btn className="ll-pri" onClick={openAll}>Open All</Btn></div>
      ) : (
        <Feedback feedback={a.feedback} result="correct" />
      )}
    </div>
  );
}

function TF({ step, a, ctx }: { step: ProcedureStep; a: any; ctx: Ctx }) {
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);
  const correct = answer === a.correct;
  const handle = (val: boolean) => {
    if (checked) return;
    setAnswer(val); setChecked(true);
    if (val === a.correct) {
      ctx.award(step.gamification?.points ?? 10);
      ctx.complete(10, 10);
      ctx.confetti('correct');
      ctx.speak(a.feedback?.correctFeedback || 'Purrfect! You got it right!', 'excited');
    } else {
      ctx.speak(a.feedback?.incorrectFeedback || 'Oops! Let me explain why...', 'sad');
    }
  };
  const btn = (val: boolean) => {
    let cls = 'll-tfbtn';
    if (checked) {
      if (answer === val) cls += correct ? ' ll-pick-ok' : ' ll-pick-no';
      else if (a.correct === val) cls += ' ll-reveal-ok';
      else cls += ' ll-reveal-no';
    }
    return (
      <button className={cls} onClick={() => handle(val)} disabled={checked}>
        {val ? '✅' : '❌'}<small>{val ? 'TRUE' : 'FALSE'}</small>
      </button>
    );
  };
  return (
    <div>
      <div className="ll-actq">
        {a.image && <img src={a.image} style={{ width: '100%', borderRadius: 12, marginBottom: 14, maxHeight: 260, objectFit: 'cover' }} />}
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <p style={{ flex: 1 }}>“{a.statement}”</p>
          {a.ttsEnabled && <button className="ll-ico-btn" onClick={() => ctx.speak(a.statement)}>🔊</button>}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {btn(true)}{btn(false)}
      </div>
      {checked && (
        <>
          <Feedback feedback={a.feedback} result={correct ? 'correct' : 'incorrect'} />
          <div className="ll-btnrow">
            {correct
              ? <Btn className="ll-pri" onClick={() => ctx.next()}>Next ›</Btn>
              : <Btn className="ll-pri" onClick={() => { setAnswer(null); setChecked(false); }}>Try Again</Btn>}
          </div>
          {a.ttsEnabled && (correct ? a.trueFeedback : a.falseFeedback) && (
            <div className="ll-tip" onClick={() => ctx.speak(correct ? a.trueFeedback : a.falseFeedback)}>🔊 Listen to feedback</div>
          )}
        </>
      )}
    </div>
  );
}

function MTW({ step, a, ctx }: { step: ProcedureStep; a: any; ctx: Ctx }) {
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [checked, setChecked] = useState(false);
  const words = a.text.split(/(\s+)/);
  const correctSet: Record<string, boolean> = {};
  a.correctWords.forEach((w: string) => { correctSet[w.toLowerCase()] = true; });
  const toggle = (w: string) => setMarked((m) => ({ ...m, [w]: !m[w] }));
  let precision = 0, recall = 0, correctMarked = 0, markedCount = 0;
  for (const m in marked) { if (marked[m]) { markedCount++; if (correctSet[m]) correctMarked++; } }
  if (markedCount > 0) precision = correctMarked / markedCount;
  if (a.correctWords.length > 0) recall = correctMarked / a.correctWords.length;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const score = Math.round(f1 * 100);
  const check = () => {
    setChecked(true);
    if (score >= 80) {
      ctx.award(step.gamification?.points ?? 20);
      ctx.complete(score, 100);
      ctx.confetti('correct');
    }
  };
  return (
    <div>
      <div className="ll-actq">
        <p style={{ fontSize: 13, color: 'var(--ll-txt2)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>
          Click on words to mark them. Mark: {a.correctWords.join(', ')} type words.
        </p>
        <p className="ll-marktext">
          {words.map((w, i) => {
            if (/^\s+$/.test(w)) return <span key={i}> </span>;
            const clean = w.replace(/[^a-zA-Z']/g, '').toLowerCase();
            if (!clean) return <span key={i}>{w}</span>;
            const isMarked = !!marked[clean];
            const isCorrect = !!correctSet[clean];
            let cls = '';
            if (!checked) cls = isMarked ? ' ll-m' : '';
            else {
              if (isCorrect && isMarked) cls = ' ll-okm';
              else if (isCorrect && !isMarked) cls = ' ll-miss';
              else if (!isCorrect && isMarked) cls = ' ll-wrong';
            }
            return <span key={i} className={cls} onClick={() => !checked && toggle(clean)} style={checked ? { cursor: 'default' } : undefined}>{w}</span>;
          })}
        </p>
      </div>
      {!checked ? (
        <div className="ll-btnrow"><Btn className="ll-pri" onClick={check}>Check ✓</Btn></div>
      ) : (
        <>
          <div className="ll-score">
            <span>Precision: <b>{Math.round(precision * 100)}%</b></span>
            <span>Recall: <b>{Math.round(recall * 100)}%</b></span>
            <span>F1: <b>{score}</b></span>
          </div>
          <Feedback feedback={a.feedback} result={score >= 80 ? 'correct' : 'incorrect'} />
          <div className="ll-btnrow">
            <Btn className="ll-ghost" onClick={() => { setMarked({}); setChecked(false); }}>↺ Try Again</Btn>
            {score >= 80 && <Btn className="ll-pri" onClick={() => ctx.next()}>Next ›</Btn>}
          </div>
        </>
      )}
    </div>
  );
}

function FIB({ step, a, ctx }: { step: ProcedureStep; a: any; ctx: Ctx }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [hints, setHints] = useState<Record<string, boolean>>({});
  const lines = a.textWithBlanks.split('\n');
  const blankOf = (id: string) => a.blanks.find((b: any) => b.id === id);
  const isCorrect = (id: string) => {
    const blank = blankOf(id);
    if (!blank) return false;
    return blank.correct.some((c: string) => a.caseSensitive ? c === answers[id] : c.toLowerCase() === String(answers[id] || '').toLowerCase());
  };
  const correctCount = a.blanks.filter((b: any) => isCorrect(b.id)).length;
  const allCorrect = correctCount === a.blanks.length;
  const check = () => {
    setChecked(true);
    if (allCorrect) {
      ctx.award(step.gamification?.points ?? 25);
      ctx.complete(correctCount, a.blanks.length);
      ctx.confetti('correct');
      ctx.speak(a.feedback?.correctFeedback || 'Excellent! All blanks correct!', 'excited');
    }
  };
  return (
    <div>
      {lines.map((line, li) => {
        const parts = line.split(/\[blank\d+\]/g);
        const matches = line.match(/\[blank(\d+)\]/g) || [];
        return (
          <div key={li} className="ll-fibline">
            {parts.map((part, pi) => {
              const els: React.ReactNode[] = [];
              if (part) els.push(<span key={`t${pi}`} className="ll-tx" dangerouslySetInnerHTML={{ __html: mdInline(part) }} />);
              if (matches[pi]) {
                const num = matches[pi].match(/\d+/)?.[0];
                const bid = `blank${num}`;
                const blank = blankOf(bid);
                if (blank) {
                  const ok = checked ? isCorrect(bid) : null;
                  els.push(
                    <React.Fragment key={`b${pi}`}>
                      <input
                        className={`ll-blank ${checked ? (ok ? 'll-okb' : 'll-badb') : ''}`}
                        value={answers[bid] || ''}
                        onChange={(e) => setAnswers((x) => ({ ...x, [bid]: e.target.value }))}
                        disabled={checked}
                        placeholder="..."
                      />
                      {blank.hint && !checked && <button className="ll-hintbtn" onClick={() => setHints((h) => ({ ...h, [bid]: true }))}>💡</button>}
                      {hints[bid] && <span className="ll-hint">{blank.hint}</span>}
                    </React.Fragment>,
                  );
                }
              }
              return els;
            })}
          </div>
        );
      })}
      {!checked ? (
        <div className="ll-btnrow"><Btn className="ll-pri" onClick={check}>Check ✓</Btn></div>
      ) : (
        <>
          <Feedback feedback={a.feedback} result={allCorrect ? 'correct' : 'incorrect'} />
          <div className="ll-btnrow">
            {!allCorrect ? (
              <>
                <Btn className="ll-ghost" onClick={() => { setAnswers({}); setChecked(false); }}>↺ Try Again</Btn>
                {a.showSolutionButton && (
                  <Btn className="ll-grn" onClick={() => {
                    const sol: Record<string, string> = {};
                    a.blanks.forEach((b: any) => { sol[b.id] = b.correct[0]; });
                    setAnswers(sol); setChecked(true);
                  }}>👁 Show Solution</Btn>
                )}
              </>
            ) : (
              <Btn className="ll-pri" onClick={() => ctx.next()}>Next ›</Btn>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function DTW({ step, a, ctx }: { step: ProcedureStep; a: any; ctx: Ctx }) {
  const [placed, setPlaced] = useState<Record<number, string>>({});
  const [bankSel, setBankSel] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const slots = a.textWithPlaceholders.split('[drag]');
  const numSlots = slots.length - 1;
  const used = new Set(Object.values(placed));
  const wordOf = (id: string) => a.words.find((w: any) => w.id === id);
  const correctCount = Array.from({ length: numSlots }, (_, i) => {
    const w = wordOf(placed[i]);
    return w ? w.correctPosition === i + 1 : false;
  }).filter(Boolean).length;
  const allOk = correctCount === numSlots;
  return (
    <div>
      <div className="ll-bank">
        <p>🧩 Word Bank — click a word, then click a blank</p>
        <div className="ll-bankrow">
          {a.words.map((w: any, i: number) => used.has(w.id) ? null : (
            <button key={w.id} className={`ll-dragword ${bankSel === String(i) ? 'll-grab' : ''}`} onClick={() => setBankSel(String(i))}>☰ {w.word}</button>
          ))}
          {a.words.every((w: any) => used.has(w.id)) && !checked && <span style={{ fontSize: 13, color: 'var(--ll-txt3)', fontStyle: 'italic' }}>All words placed!</span>}
        </div>
      </div>
      <div className="ll-dtext">
        {slots.map((text, i) => {
          const els: React.ReactNode[] = [];
          if (text) els.push(<span key={`t${i}`} dangerouslySetInnerHTML={{ __html: mdInline(text.trim()) }} />);
          if (i < numSlots) {
            const w = wordOf(placed[i]);
            const ok = checked && w ? w.correctPosition === i + 1 : false;
            els.push(
              <span key={`s${i}`} className={`ll-slot ${checked ? (w ? (ok ? 'll-okb' : 'll-badb') : '') : ''}`}
                onClick={() => {
                  if (placed[i]) { const n = { ...placed }; delete n[i]; setPlaced(n); return; }
                  if (bankSel === null) return;
                  const wid = a.words[Number(bankSel)].id;
                  if (Object.values(placed).includes(wid)) return;
                  setPlaced((p) => ({ ...p, [i]: wid })); setBankSel(null);
                }}>
                {w ? w.word : '___'}
              </span>,
            );
          }
          return els;
        })}
      </div>
      {!checked ? (
        <div className="ll-btnrow">
          <Btn className="ll-pri" onClick={() => { setChecked(true); if (allOk) { ctx.award(step.gamification?.points ?? 20); ctx.complete(correctCount, numSlots); ctx.confetti('correct'); } }}>Check ✓</Btn>
        </div>
      ) : (
        <>
          <Feedback feedback={a.feedback} result={allOk ? 'correct' : 'incorrect'} />
          <div className="ll-btnrow">
            {!allOk ? <Btn className="ll-ghost" onClick={() => { setPlaced({}); setChecked(false); }}>↺ Try Again</Btn> : <Btn className="ll-pri" onClick={() => ctx.next()}>Next ›</Btn>}
          </div>
        </>
      )}
    </div>
  );
}

interface MemCard { id: string; pair: string; content: string; flip: boolean; match: boolean; }
function Mem({ step, a, ctx }: { step: ProcedureStep; a: any; ctx: Ctx }) {
  const init = (): MemCard[] => {
    const cards: MemCard[] = [];
    a.pairs.forEach((p: any) => {
      cards.push({ id: p.id + '-A', pair: p.id, content: p.cardA, flip: false, match: false });
      cards.push({ id: p.id + '-B', pair: p.id, content: p.cardB, flip: false, match: false });
    });
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  };
  const [cards, setCards] = useState<MemCard[]>(init);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [matched, setMatched] = useState(0);
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    if (flipped.length === 2 && !finished) {
      const a1 = cards[flipped[0]], a2 = cards[flipped[1]];
      const t = window.setTimeout(() => {
        if (a1.pair === a2.pair) {
          setCards((cs) => cs.map((c) => flipped.includes(cards.indexOf(c)) ? { ...c, match: true } : c));
          const nm = matched + 1;
          setMatched(nm);
          if (nm === a.pairs.length) {
            setFinished(true);
            ctx.confetti('perfect');
            ctx.award(step.gamification?.points ?? 30);
            ctx.complete(a.pairs.length, a.pairs.length);
          }
        } else {
          setCards((cs) => cs.map((c) => flipped.includes(cards.indexOf(c)) ? { ...c, flip: false } : c));
        }
        setFlipped([]);
      }, 900);
      return () => window.clearTimeout(t);
    }
  }, [flipped]);
  useEffect(() => {
    if (!finished && (flipped.length === 1 || moves > 0)) {
      const iv = window.setInterval(() => setTimer((t) => t + 1), 1000);
      return () => window.clearInterval(iv);
    }
  }, [flipped.length, moves, finished]);
  const click = (i: number) => {
    if (finished || flipped.length >= 2 || cards[i].flip || cards[i].match) return;
    setFlipped((f) => [...f, i]);
    setCards((cs) => cs.map((c, ci) => ci === i ? { ...c, flip: true } : c));
    if (flipped.length === 1) setMoves((m) => m + 1);
  };
  return (
    <div>
      <div className="ll-memhead">
        <span style={{ fontSize: 14, color: 'var(--ll-txt2)' }}>⏱ {fmtTime(timer)}</span>
        <span style={{ fontSize: 14, color: 'var(--ll-txt2)' }}>🎯 {matched}/{a.pairs.length}</span>
        <span style={{ fontSize: 14, color: 'var(--ll-txt2)' }}>👆 {moves} moves</span>
        <span style={{ flex: 1 }} />
        <button className="ll-ico-btn" onClick={() => { setCards(init()); setFlipped([]); setMoves(0); setTimer(0); setMatched(0); setFinished(false); }}>↺ Restart</button>
      </div>
      <div className="ll-memgrid">
        {cards.map((c, i) => (
          <button key={c.id} className={`ll-memcard ${c.match ? 'll-match' : c.flip ? 'll-flip' : ''}`} onClick={() => click(i)}>
            <span className="ll-mfront">❓</span><span className="ll-mback">{c.content}</span>
          </button>
        ))}
      </div>
      {finished && (
        <>
          <Feedback feedback={a.feedback} result="correct" />
          <div className="ll-btnrow"><Btn className="ll-pri" onClick={() => ctx.next()}>Next ›</Btn></div>
        </>
      )}
    </div>
  );
}

function IH({ step, a, ctx }: { step: ProcedureStep; a: any; ctx: Ctx }) {
  const [hotspots, setHotspots] = useState<any[]>(() => JSON.parse(JSON.stringify(a.hotspots || [])));
  const [visited, setVisited] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [edit, setEdit] = useState<{ label: string; content: string; icon: string }>({ label: '', content: '', icon: '' });
  const click = (i: number) => {
    if (adding) return;
    setActive(i);
    setVisited((v) => {
      const nv = { ...v, [hotspots[i].id]: true };
      if (Object.keys(nv).length >= hotspots.length && hotspots.length > 0 && !visited[hotspots[i].id]) {
        ctx.award(step.gamification?.points ?? 20);
        ctx.complete(hotspots.length, hotspots.length);
        ctx.confetti('correct');
      }
      return nv;
    });
    ctx.speak(hotspots[i].content, 'happy');
  };
  const allVisited = hotspots.length > 0 && hotspots.every((h) => visited[h.id]);
  return (
    <div>
      {a.showSpeakingQuestion && (
        <div style={{ background: 'rgba(67,56,202,.15)', border: '1px solid rgba(99,102,241,.25)', borderRadius: 12, padding: '14px 18px', marginBottom: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 22 }}>🎤</span><p style={{ fontSize: 16, color: '#c7d2fe' }}>{a.showSpeakingQuestion}</p>
        </div>
      )}
      <div className="ll-ihwrap" style={{ position: 'relative' }} onClick={(e) => {
        if (!adding) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
        const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
        setHotspots((hs) => [...hs, { id: `h-${Date.now()}`, x, y, label: 'New hotspot', content: 'Describe this place!', icon: '📍' }]);
        setAdding(false);
      }}>
        <img src={a.imageUrl} alt={a.imageAlt || 'Image'} draggable={false} style={{ display: 'block', width: '100%' }} />
        {hotspots.map((h, i) => (
          <button key={h.id} className={`ll-ihpin ${visited[h.id] ? 'll-visited' : ''}`} style={{ left: `${h.x}%`, top: `${h.y}%` }} onClick={(e) => { e.stopPropagation(); click(i); }}>{h.icon || '📍'}</button>
        ))}
        {active !== null && hotspots[active] && (
          <div className="ll-ihpop">
            <button className="ll-ihx" onClick={() => setActive(null)}>✕</button>
            <b>{hotspots[active].label}</b><p>{hotspots[active].content}</p>
            <div className="ll-btnrow">
              <button className="ll-btn ll-ghost" onClick={() => { setHotspots((hs) => hs.filter((_, i) => i !== active)); setActive(null); }}>🗑 Delete</button>
              <button className="ll-btn ll-ghost" onClick={() => { setEditing(active); setEdit({ label: hotspots[active].label, content: hotspots[active].content, icon: hotspots[active].icon || '' }); setActive(null); }}>✏️ Edit</button>
            </div>
          </div>
        )}
        {editing !== null && hotspots[editing] && (
          <div className="ll-ihpop">
            <button className="ll-ihx" onClick={() => setEditing(null)}>✕</button>
            <b>✏️ Edit hotspot</b>
            <input style={ihInput} value={edit.label} placeholder="Label" onChange={(e) => setEdit({ ...edit, label: e.target.value })} />
            <input style={ihInput} value={edit.content} placeholder="Content" onChange={(e) => setEdit({ ...edit, content: e.target.value })} />
            <input style={ihInput} value={edit.icon} placeholder="Icon emoji" onChange={(e) => setEdit({ ...edit, icon: e.target.value })} />
            <div className="ll-btnrow"><button className="ll-btn ll-pri" onClick={() => { setHotspots((hs) => hs.map((h, i) => i === editing ? { ...h, ...edit } : h)); setEditing(null); }}>💾 Save</button></div>
          </div>
        )}
      </div>
      <div className="ll-btnrow" style={{ marginTop: 12 }}>
        <button className="ll-btn ll-ghost" onClick={() => { setAdding(!adding); setActive(null); setEditing(null); }}>➕ Add Hotspot</button>
        {adding && <span style={{ fontSize: 13, color: '#fbbf24', alignSelf: 'center' }}>Click anywhere on the image to place the hotspot</span>}
        <span style={{ flex: 1 }} />
        {allVisited && <Btn className="ll-pri" onClick={() => ctx.next()}>Next ›</Btn>}
      </div>
    </div>
  );
}
const ihInput: React.CSSProperties = { width: '100%', marginTop: 8, padding: 8, borderRadius: 8, border: '1px solid var(--ll-brd)', background: 'var(--ll-bg3)', color: 'var(--ll-txt)' };

function STD({ step, a, ctx }: { step: ProcedureStep; a: any; ctx: Ctx }) {
  const [found, setFound] = useState<Record<string, boolean>>({});
  const [wrong, setWrong] = useState(0);
  const [finished, setFinished] = useState(false);
  const [timer, setTimer] = useState(a.timeLimit || 0);
  const click = (e: React.MouseEvent<HTMLDivElement>) => {
    if (finished) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    let hit: any = null;
    for (const d of a.differences) {
      if (found[d.id]) continue;
      const dist = Math.sqrt(Math.pow(x - d.x, 2) + Math.pow(y - d.y, 2));
      if (dist <= d.radius) { hit = d; break; }
    }
    if (hit) {
      const nf = { ...found, [hit.id]: true };
      setFound(nf);
      if (Object.keys(nf).length >= a.differences.length) {
        setFinished(true);
        ctx.confetti('perfect');
        ctx.award(step.gamification?.points ?? 25);
        ctx.complete(a.differences.length, a.differences.length);
        ctx.speak('Amazing! You found all the differences!', 'love');
      } else {
        ctx.speak(`Great find! ${Object.keys(nf).length} of ${a.differences.length} found!`, 'excited');
      }
    } else {
      setWrong((w) => w + 1);
      ctx.speak('Hmm, not quite there. Look more carefully!', 'thinking');
    }
  };
  return (
    <div>
      <div className="ll-memhead">
        <span style={{ fontSize: 14, color: 'var(--ll-txt2)' }}>👀 {Object.keys(found).length}/{a.differences.length} found</span>
        {a.timeLimit && <span style={{ fontSize: 14, color: 'var(--ll-txt2)' }}>⏱ {fmtTime(timer)}</span>}
        <span style={{ fontSize: 14, color: 'var(--ll-txt2)' }}>❌ {wrong}</span>
        <span style={{ flex: 1 }} />
        <button className="ll-ico-btn" onClick={() => { setFound({}); setWrong(0); setFinished(false); setTimer(a.timeLimit || 0); }}>↺ Restart</button>
      </div>
      <div className="ll-stdgrid">
        <div className="ll-stdimg" style={{ position: 'relative', cursor: 'pointer' }} onClick={click}>
          <img src={a.imageA} draggable={false} style={{ display: 'block', width: '100%' }} />
          {a.differences.map((d: any) => found[d.id] && <span key={d.id} className="ll-stdmark ll-ok" style={{ left: `${d.x}%`, top: `${d.y}%` }} />)}
        </div>
        <div className="ll-stdimg"><img src={a.imageB} draggable={false} style={{ display: 'block', width: '100%' }} /></div>
      </div>
      {finished ? (
        <>
          <Feedback feedback={a.feedback} result="correct" />
          <div className="ll-btnrow"><Btn className="ll-pri" onClick={() => ctx.next()}>Next ›</Btn></div>
        </>
      ) : (
        <div className="ll-tip" style={{ marginTop: 12 }}>Click Image A where you spot a difference vs Image B. Use “has changed / has appeared / has been removed” to describe it!</div>
      )}
    </div>
  );
}

function TOD({ step, a, ctx }: { step: ProcedureStep; a: any; ctx: Ctx }) {
  const [filter, setFilter] = useState<'all' | 'truth' | 'dare'>('all');
  const [current, setCurrent] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [completed, setCompleted] = useState<Record<number, boolean>>({});
  const filtered = a.items.map((it: any, i: number) => ({ it, i })).filter((x: any) => filter === 'all' || x.it.type === filter);
  const spin = () => {
    if (spinning || !filtered.length) return;
    setSpinning(true);
    let count = 0;
    const iv = window.setInterval(() => {
      setCurrent(Math.floor(Math.random() * filtered.length));
      count++;
      if (count >= 12) { window.clearInterval(iv); setSpinning(false); }
    }, 80);
  };
  const item = current !== null ? filtered[current] : null;
  return (
    <div>
      <div className="ll-todfilters">
        {([['all', '🎲 All', 'll-on-all'], ['truth', '🔵 Truth', 'll-on-blue'], ['dare', '🔴 Dare', 'll-on-red']] as const).map(([f, label, cls]) => (
          <button key={f} className={`ll-todf ${filter === f ? cls : ''}`} onClick={() => { setFilter(f); setCurrent(null); }}>{label}</button>
        ))}
      </div>
      <div style={{ textAlign: 'center' }}>
        <button className={`ll-wheel ${spinning ? 'll-spin' : ''}`} onClick={spin} disabled={spinning}>🎲<br /><b>SPIN!</b></button>
      </div>
      {item ? (
        <>
          <div className="ll-todcard">
            <span className={item.it.type === 'truth' ? 'll-tag-t' : 'll-tag-d'}>{item.it.type === 'truth' ? '🔵 TRUTH' : '🔴 DARE'}</span>
            <b>{item.it.text}</b>
            {item.it.targetLanguage && <p>🎯 Target: “{item.it.targetLanguage}”</p>}
          </div>
          <div className="ll-btnrow" style={{ justifyContent: 'center' }}>
            {completed[current] ? <Btn className="ll-ghost" onClick={spin}>Next card</Btn> : (
              <Btn className="ll-pri" onClick={() => {
                setCompleted((c) => ({ ...c, [current]: true }));
                ctx.award(10);
                const done = Object.keys({ ...completed, [current]: true }).length;
                if (done >= Math.min(3, a.items.length)) ctx.complete(done, a.items.length);
                ctx.speak('Great use of the target language!', 'excited');
              }}>✅ Done it!</Btn>
            )}
          </div>
        </>
      ) : !spinning && (
        <div className="ll-todcard"><p style={{ color: 'var(--ll-txt3)' }}>Press SPIN to draw a card!</p></div>
      )}
    </div>
  );
}

function FC({ step, a, ctx }: { step: ProcedureStep; a: any; ctx: Ctx }) {
  const init = (): any[] => {
    const cards = JSON.parse(JSON.stringify(a.cards || []));
    if (a.shuffle) {
      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }
    }
    return cards;
  };
  const [cards, setCards] = useState<any[]>(init);
  const [ci, setCi] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Record<string, boolean>>({});
  const [unknown, setUnknown] = useState<Record<string, boolean>>({});
  const cur = cards[ci];
  const progress = ((Object.keys(known).length + Object.keys(unknown).length) / cards.length) * 100;
  const finished = Object.keys(known).length + Object.keys(unknown).length === cards.length;
  const mark = (k: boolean) => {
    const id = cur.id;
    if (k) { setKnown((x) => ({ ...x, [id]: true })); setUnknown((x) => { const n = { ...x }; delete n[id]; return n; }); }
    else { setUnknown((x) => ({ ...x, [id]: true })); setKnown((x) => { const n = { ...x }; delete n[id]; return n; }); }
    if (ci < cards.length - 1) { setCi(ci + 1); setFlipped(false); }
    if (k && Object.keys(known).length + 1 >= cards.length) {
      ctx.award(step.gamification?.points ?? 15);
      ctx.complete(Object.keys(known).length + 1, cards.length);
      ctx.confetti('correct');
    }
  };
  const backLines = String(cur.back || '').split('\n');
  return (
    <div>
      <div className="ll-fcbar">
        <div className="ll-pbar"><div className="ll-pfill" style={{ width: `${progress}%` }} /></div>
        <span style={{ fontSize: 13, color: 'var(--ll-txt2)', whiteSpace: 'nowrap' }}>{ci + 1}/{cards.length}</span>
        <button className="ll-ico-btn" title="Shuffle" onClick={() => { setCards(init()); setCi(0); setFlipped(false); setKnown({}); setUnknown({}); }}>🔀</button>
      </div>
      <div className="ll-fcstage">
        <button className="ll-ico-btn" onClick={() => { if (ci > 0) { setCi(ci - 1); setFlipped(false); } }} disabled={ci === 0 || finished}>‹</button>
        <div className={`ll-fccard ${flipped ? 'll-flipped' : ''}`} onClick={() => setFlipped(!flipped)}>
          <div className="ll-fcinner">
            <div className="ll-fcface"><b>{cur.front}</b>{cur.category && <small>{cur.category}</small>}<p style={{ fontSize: 12, color: 'var(--ll-txt3)' }}>Click to flip</p></div>
            <div className="ll-fcface ll-back"><b>{backLines[0]}</b>{backLines.slice(1).join(' ') && <p>{backLines.slice(1).join(' ')}</p>}</div>
          </div>
        </div>
        <button className="ll-ico-btn" onClick={() => { if (ci < cards.length - 1) { setCi(ci + 1); setFlipped(false); } }} disabled={ci >= cards.length - 1 || finished}>›</button>
      </div>
      {!finished ? (
        <div className="ll-fcmark">
          <button className="ll-btn ll-fck" onClick={() => mark(true)}>✓ Got It</button>
          <button className="ll-btn ll-fcu" onClick={() => mark(false)}>✗ Still Learning</button>
        </div>
      ) : (
        <>
          <Feedback feedback={a.feedback} result="correct" />
          <div className="ll-btnrow"><Btn className="ll-pri" onClick={() => ctx.next()}>Next ›</Btn></div>
        </>
      )}
    </div>
  );
}

function WC({ step, a, ctx }: { step: ProcedureStep; a: any; ctx: Ctx }) {
  const [words, setWords] = useState<{ text: string; count: number }[]>(() => (a.seedWords || []).map((w: string) => ({ text: w, count: 1 })));
  const [submitted, setSubmitted] = useState(0);
  const [input, setInput] = useState('');
  const maxSub = a.maxSubmissions || 5;
  const add = () => {
    const word = input.trim().toLowerCase();
    if (!word || submitted >= maxSub) return;
    const ex = words.find((w) => w.text.toLowerCase() === word);
    if (ex) setWords((ws) => ws.map((w) => w.text.toLowerCase() === word ? { ...w, count: w.count + 1 } : w));
    else setWords((ws) => [...ws, { text: word, count: 1 }]);
    setInput('');
    const ns = submitted + 1;
    setSubmitted(ns);
    if (ns >= maxSub) {
      ctx.award(step.gamification?.points ?? 10);
      ctx.complete(10, 10);
    }
  };
  const maxCount = Math.max(...words.map((w) => w.count), 1);
  const colors = ['ll-c0', 'll-c1', 'll-c2', 'll-c3', 'll-c4', 'll-c5'];
  return (
    <div>
      <div className="ll-actq"><p>{a.prompt}</p></div>
      <div className="ll-wcin">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Type a word..." disabled={submitted >= maxSub} />
        <button className="ll-btn ll-pri" onClick={add} disabled={submitted >= maxSub || !input.trim()}>➤</button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--ll-txt3)', marginBottom: 12 }}>{submitted}/{maxSub} submissions</p>
      <div className="ll-cloud">
        {words.map((w, i) => (
          <span key={i} className={`ll-cw ${colors[i % colors.length]}`} style={{ fontSize: `${0.85 + (w.count / maxCount) * 1.15}rem` }}>{w.text}</span>
        ))}
      </div>
      {submitted >= maxSub && (
        <>
          <Feedback feedback={a.feedback} result="correct" />
          <div className="ll-btnrow"><Btn className="ll-pri" onClick={() => ctx.next()}>Next ›</Btn></div>
        </>
      )}
    </div>
  );
}

function MCQ({ step, a, ctx }: { step: ProcedureStep; a: any; ctx: Ctx }) {
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [checked, setChecked] = useState(false);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const correctIds: Record<string, boolean> = {};
  a.choices.forEach((c: any) => { if (c.correct) correctIds[c.id] = true; });
  const choices = a.randomise ? [...a.choices].sort(() => Math.random() - 0.5) : a.choices;
  const selCount = Object.values(sel).filter(Boolean).length;
  const check = () => {
    setChecked(true);
    let match = true;
    for (const ck in correctIds) if (!sel[ck]) match = false;
    for (const sk in sel) if (sel[sk] && !correctIds[sk]) match = false;
    const need = Object.keys(correctIds).length;
    const okAll = a.allowMultiple ? selCount === need : selCount === 1;
    const ok = match && okAll;
    if (!ok) {
      for (const bad in sel) {
        if (sel[bad] && !correctIds[bad]) {
          setShakeId(bad);
          window.setTimeout(() => setShakeId(null), 600);
        }
      }
    } else {
      ctx.award(step.gamification?.points ?? 10);
      ctx.complete(10, 10);
      ctx.confetti('correct');
      ctx.speak(a.feedback?.correctFeedback || 'Purrfect! Correct answer!', 'excited');
    }
  };
  return (
    <div>
      <div className="ll-actq">
        {a.questionImage && <img src={a.questionImage} style={{ width: '100%', borderRadius: 12, marginBottom: 12, maxHeight: 190, objectFit: 'cover' }} />}
        <p dangerouslySetInnerHTML={{ __html: mdInline(a.question) }} />
        {a.allowMultiple && <small>Select all correct answers</small>}
      </div>
      <div className="ll-mcq">
        {choices.map((ch: any) => {
          const isSel = !!sel[ch.id];
          const isCorrect = !!correctIds[ch.id];
          let cls = 'll-choice';
          if (checked) cls += isCorrect ? ' ll-okc' : isSel ? ' ll-badc' : '';
          else if (isSel) cls += ' ll-sel';
          if (shakeId === ch.id) cls += ' ll-shake';
          return (
            <button key={ch.id} className={cls} disabled={checked} onClick={() => {
              if (a.allowMultiple) setSel((x) => ({ ...x, [ch.id]: !x[ch.id] }));
              else setSel({ [ch.id]: true });
            }}>
              <span style={{ fontSize: 18 }}>{isSel ? (checked ? (isCorrect ? '✅' : '❌') : '●') : '○'}</span>
              <span dangerouslySetInnerHTML={{ __html: mdInline(ch.text) }} />
            </button>
          );
        })}
      </div>
      {!checked ? (
        <div className="ll-btnrow"><Btn className="ll-pri" onClick={check} disabled={selCount === 0}>Check ✓</Btn></div>
      ) : (
        <>
          <Feedback feedback={a.feedback} result={(() => {
            let match = true;
            for (const ck in correctIds) if (!sel[ck]) match = false;
            for (const sk in sel) if (sel[sk] && !correctIds[sk]) match = false;
            const need = Object.keys(correctIds).length;
            return match && (a.allowMultiple ? selCount === need : selCount === 1) ? 'correct' : 'incorrect';
          })()} />
          <div className="ll-btnrow">
            {(() => {
              let match = true;
              for (const ck in correctIds) if (!sel[ck]) match = false;
              for (const sk in sel) if (sel[sk] && !correctIds[sk]) match = false;
              const ok = match && (a.allowMultiple ? selCount === Object.keys(correctIds).length : selCount === 1);
              if (ok) return <Btn className="ll-pri" onClick={() => ctx.next()}>Next ›</Btn>;
              return (
                <>
                  <Btn className="ll-ghost" onClick={() => { setSel({}); setChecked(false); }}>↺ Try Again</Btn>
                  {a.showSolutionButton && <Btn className="ll-grn" onClick={() => { const s: Record<string, boolean> = {}; a.choices.forEach((c: any) => { if (c.correct) s[c.id] = true; }); setSel(s); setChecked(true); }}>👁 Show Solution</Btn>}
                </>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}

/* ── audio-discussion ──────────────────────────────────────────────────── */

function AUD({ step, a, ctx }: { step: ProcedureStep; a: any; ctx: Ctx }) {
  const prompts: any[] = a.prompts || [];
  const [recs, setRecs] = useState<Record<string, number>>({});
  const [recording, setRecording] = useState<string | null>(null);
  const submit = () => {
    const pts = step.gamification?.points ?? 15;
    ctx.award(pts, '🎙');
    ctx.complete(pts, pts);
    ctx.confetti('correct');
    ctx.speak('Great speaking! I loved hearing your opinions.', 'love');
  };
  const doneCount = Object.keys(recs).length;
  const allDone = prompts.length > 0 && doneCount >= prompts.length;
  return (
    <div>
      <div className="ll-actq"><p>{a.instructions || 'Listen to the prompt, record your spoken answer, then compare with the sample opinions.'}</p></div>
      {prompts.map((p) => {
        const rec = recs[p.id];
        const listening = recording === p.id;
        return (
          <div key={p.id} className={`ll-aud ${rec ? 'll-audrec' : ''}`}>
            <div className="ll-audq" onClick={() => ctx.speak(p.text, 'thinking')}>
              <span className="ll-audico">🎧</span>
              <div>
                <b>{p.text}</b>
                {p.hint && <p className="ll-follow">💡 {p.hint}</p>}
                {p.usefulLanguage?.length ? (
                  <div className="ll-audlang">{p.usefulLanguage.map((l: string, i: number) => <span key={i}>{l}</span>)}</div>
                ) : null}
              </div>
            </div>
            <div className="ll-audctl">
              <Btn className={listening ? 'll-stop' : 'll-pri'} onClick={() => {
                if (listening) { setRecording(null); return; }
                setRecording(p.id);
                setRecs((r) => ({ ...r, [p.id]: 0 }));
                ctx.speak('Recording! Speak clearly and use today\'s language.', 'excited');
                window.setTimeout(() => {
                  setRecs((r) => (r[p.id] !== undefined ? { ...r, [p.id]: Math.max(r[p.id] || 0, 3) } : r));
                  setRecording((cur) => (cur === p.id ? null : cur));
                }, 3000);
              }}>{listening ? '⏹ Stop' : '🎙 Record'}</Btn>
              {rec != null && <span className="ll-audlen">⏱ {rec}s</span>}
              {rec != null && <Btn className="ll-ghost" onClick={() => window.alert('▶ Playing your ' + rec + 's response…')}>▶ Play</Btn>}
            </div>
            {rec != null && <div className="ll-audwave"><span /><span /><span /><span /><span /></div>}
          </div>
        );
      })}
      {a.sampleOpinions?.length ? (
        <div className="ll-audsamp">
          <h4>💬 Sample opinions</h4>
          {a.sampleOpinions.map((op: any, i: number) => (
            <div key={i} className="ll-item" onClick={() => ctx.speak(op.text, 'neutral')}>
              <div className="ll-srow"><p>{op.text}</p>{op.speaker && <span className="ll-stype">{op.speaker}</span>}</div>
            </div>
          ))}
        </div>
      ) : null}
      <div className="ll-btnrow">
        <Btn className="ll-pri" onClick={submit} disabled={!allDone}>Submit responses ✓ ({doneCount}/{prompts.length})</Btn>
        <Btn className="ll-pri" onClick={() => ctx.next()}>Next ›</Btn>
      </div>
    </div>
  );
}

/* ── team-quiz ─────────────────────────────────────────────────────────── */

function TQ({ step, a, ctx }: { step: ProcedureStep; a: any; ctx: Ctx }) {
  const qs: any[] = a.questions || [];
  const [qi, setQi] = useState(0);
  const [teamScore, setTeamScore] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [secs, setSecs] = useState(a.secondsPerQuestion || 20);
  const perQ = a.secondsPerQuestion || 20;
  useEffect(() => {
    if (finished || revealed) return;
    setSecs(perQ);
    const iv = window.setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(iv);
  }, [qi, finished, revealed, perQ]);
  useEffect(() => {
    if (!revealed && secs === 0 && !finished) setRevealed(true); // time's up — reveal
  }, [secs, revealed, finished]);
  if (!qs.length) return <Default a={a} />;
  if (finished) {
    const maxPts = qs.reduce((acc: number, q: any) => acc + (q.points || 10), 0);
    return (
      <div className="ll-tqdone">
        <span className="ll-tqemoji">{teamScore >= maxPts * 0.8 ? '🏆' : teamScore >= maxPts * 0.5 ? '🎉' : '💪'}</span>
        <h3>Team score: {teamScore} / {maxPts}</h3>
        <p>{teamScore >= maxPts * 0.8 ? 'Outstanding teamwork!' : teamScore >= maxPts * 0.5 ? 'Great collaboration — review the misses together.' : 'Nice effort — retry to beat your score!'}</p>
        <div className="ll-tqboard">
          {qs.map((q: any) => {
            const picked = answers[q.id];
            const ok = (q.choices || []).some((c: any) => c.correct && c.id === picked);
            return <span key={q.id} className={`ll-tqcell ${ok ? 'll-tqok' : 'll-tqno'}`} title={q.question}>{ok ? '✅' : '❌'}</span>;
          })}
        </div>
        <div className="ll-btnrow">
          <Btn className="ll-ghost" onClick={() => { setQi(0); setTeamScore(0); setAnswers({}); setRevealed(false); setFinished(false); }}>↺ Retry quiz</Btn>
          <Btn className="ll-pri" onClick={() => ctx.next()}>Next ›</Btn>
        </div>
      </div>
    );
  }
  const q = qs[qi];
  const picked = answers[q.id];
  return (
    <div>
      <div className="ll-tqhead">
        <span className="ll-tqnum">Q{qi + 1}/{qs.length}</span>
        <span className={`ll-tqtimer ${secs <= 5 ? 'll-tqhot' : ''}`}>⏱ {secs}s</span>
        <span className="ll-tqscore">🏆 {teamScore}</span>
      </div>
      <div className="ll-actq"><p dangerouslySetInnerHTML={{ __html: mdInline(q.question || '') }} /></div>
      <div className="ll-mcq">
        {(q.choices || []).map((ch: any) => {
          const isPick = picked === ch.id;
          const isCorr = !!ch.correct;
          let cls = 'll-choice';
          if (revealed) cls += isCorr ? ' ll-okc' : isPick ? ' ll-badc' : '';
          else if (isPick) cls += ' ll-sel';
          return (
            <button key={ch.id} className={cls} disabled={revealed} onClick={() => {
              setAnswers((x) => ({ ...x, [q.id]: ch.id }));
              setRevealed(true);
              if (ch.correct) {
                const qp = q.points || 10;
                setTeamScore((s) => s + qp);
                ctx.award(qp);
                ctx.confetti('correct');
                ctx.speak(a.feedback?.correctFeedback || 'Correct! The team scores!', 'excited');
              } else {
                ctx.speak(a.feedback?.incorrectFeedback || 'Not this time — discuss and retry!', 'sad');
              }
            }}>
              <span style={{ fontSize: 18 }}>{revealed ? (isCorr ? '✅' : isPick ? '❌' : '○') : isPick ? '●' : '○'}</span>
              <span dangerouslySetInnerHTML={{ __html: mdInline(ch.text || '') }} />
            </button>
          );
        })}
      </div>
      {revealed && (
        <>
          <Feedback feedback={a.feedback} result={(() => {
            const corr = (q.choices || []).find((c: any) => c.correct);
            return picked && corr && picked === corr.id ? 'correct' : 'incorrect';
          })()} />
          <div className="ll-btnrow">
            <Btn className="ll-pri" onClick={() => {
              if (qi < qs.length - 1) { setQi(qi + 1); setRevealed(false); }
              else {
                setFinished(true);
                const maxTotal = qs.reduce((acc: number, x: any) => acc + (x.points || 10), 0);
                ctx.complete(teamScore, maxTotal);
              }
            }}>{qi < qs.length - 1 ? 'Next question ›' : 'See team score 🏆'}</Btn>
          </div>
        </>
      )}
    </div>
  );
}

/* ───────────────────────── app shell ───────────────────────── */

export interface LivePresenterProps {
  lesson: LiveLessonManual;
  learnerName?: string;
  onExit?: () => void;
}

export function LivePresenter({ lesson, learnerName, onExit }: LivePresenterProps) {
  const [manual, setManual] = useState<LiveLessonManual>(() =>
    normalizeLiveLesson(lesson, { learnerName }),
  );
  const [settings, setSettings] = useState<Settings>(() => {
    const key = `tutorly-live-progress-${manual.learnerProfile?.name || 'Student'}`;
    let saved: Partial<Settings> = {};
    try { saved = JSON.parse(localStorage.getItem(key) || '{}'); } catch { /* noop */ }
    //
    // Theme migration. The old default was dark, and save() ran on mount, so that
    // default is sitting in localStorage even for tutors who never touched the
    // toggle. Changing DEFAULT_SETTINGS alone would therefore never reach them —
    // drop the stored theme until it carries the current marker. Once a tutor
    // chooses a theme themselves, the marker is saved with it and it sticks.
    //
    if (saved.themeV !== THEME_VERSION) delete saved.theme;
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      themeV: THEME_VERSION,
      idx: Math.min((saved.idx ?? 0), manual.procedureBlocks.length - 1),
    };
  });
  const [hydrated, setHydrated] = useState(false);
  const [ui, setUi] = useState<{ q?: string; phase?: string; bgOpen?: boolean; ambOpen?: boolean; catPanel?: boolean; voiceQ?: string; aiPanel?: boolean; aiTab?: string; aiErr?: string; aiImport?: string }>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const [timer, setTimer] = useState(0);

  const key = `tutorly-live-progress-${manual.learnerProfile?.name || 'Student'}`;
  const steps = manual.procedureBlocks;

  const save = useCallback(() => {
    setSettings((s) => {
      const next = { ...s };
      localStorage.setItem(key, JSON.stringify(next));
      const done = Object.values(next.steps).filter((p) => p.status === 'completed').length;
      const tier = tierFor(next.points);
      localStorage.setItem(
        'live_lesson_stats',
        JSON.stringify({
          xp: next.points, points: next.points, level: Math.max(1, Math.floor(next.points / 150) + 1),
          streak: next.streak, badges: next.badges, tier: tier.label,
          completedSteps: done, totalSteps: steps.length, stepsDone: done,
          lastStepTitle: steps[next.idx]?.title || '', lastStep: next.idx,
          title: manual.metadata?.title || 'Live Lesson', updatedAt: Date.now(),
        }),
      );
      return next;
    });
  }, [key, steps, manual]);

  // hydration guard: don't clobber persisted stats on first mount
  useEffect(() => {
    const t = window.setTimeout(() => setHydrated(true), 50);
    return () => window.clearTimeout(t);
  }, []);

  const cat = useCat(settings, save);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg(null), 2500);
  }, []);

  const award = useCallback((points: number, badge?: string) => {
    setSettings((s) => {
      const next = { ...s, points: s.points + points, streak: points > 0 ? s.streak + 1 : 0 };
      if (badge && !next.badges.includes(badge)) next.badges = [...next.badges, badge];
      return next;
    });
  }, []);

  const complete = useCallback((score: number, maxScore: number) => {
    const step = steps[settings.idx];
    if (!step) return;
    setSettings((s) => {
      const cur = s.steps[step.id] || { status: 'active', attempts: 0 } as StepState;
      const nextSteps = {
        ...s.steps,
        [step.id]: { status: 'completed' as const, score, maxScore, attempts: (cur.attempts || 0) + 1, completedAt: Date.now() },
      };
      const done = Object.values(nextSteps).filter((p) => p.status === 'completed').length;
      let badges = s.badges;
      if (done === steps.length && !badges.includes('🎓')) badges = [...badges, '🎓'];
      return { ...s, steps: nextSteps, badges };
    });
  }, [steps, settings.idx]);

  const next = useCallback(() => {
    setSettings((s) => ({ ...s, idx: Math.min(s.idx + 1, steps.length - 1) }));
  }, [steps.length]);

  useEffect(() => { save(); }, [save]);
  useEffect(() => {
    if (hydrated) save();
  }, [hydrated, save]);

  const confetti = useCallback((type?: string) => {
    const colors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#f472b6'];
    const count = type === 'perfect' ? 90 : 50;
    for (let i = 0; i < count; i++) {
      window.setTimeout(() => {
        const c = document.createElement('div');
        c.className = 'll-confetti';
        c.style.left = `${5 + Math.random() * 90}%`;
        c.style.background = colors[i % colors.length];
        c.style.width = `${6 + Math.random() * 6}px`;
        c.style.height = `${8 + Math.random() * 8}px`;
        c.style.animationDuration = `${1.4 + Math.random() * 1.2}s`;
        document.body.appendChild(c);
        window.setTimeout(() => c.remove(), 3000);
      }, Math.random() * 300);
    }
  }, []);

  const ctx: Ctx = { speak: cat.speak, award, complete, confetti, next };

  const step = steps[settings.idx];
  const tier = tierFor(settings.points);
  const learner = manual.learnerProfile || {};
  const done = Object.values(settings.steps).filter((p) => p.status === 'completed').length;

  // timer countdown
  useEffect(() => {
    if (timer > 0) {
      timerRef.current = window.setInterval(() => setTimer((t) => Math.max(0, t - 1)), 1000);
      return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
    }
  }, [timer > 0, settings.idx]);

  const stepTotal = step?.durationSeconds || 300;
  const stepTimer = timer || stepTotal;

  return (
    <>
      <style>{LIVE_HTML_CSS}</style>
      {/*
        Fill the host box instead of assuming the whole viewport. The page renders
        a 40px toolbar above this, so a 100vh child overflowed by exactly 40px and
        pushed the Previous/Next footer off the bottom of the screen. The host is a
        flex column with a definite height, so flex:1 + minHeight:0 is the correct
        contract — minHeight:0 is what stops a tall step from expanding the column.
      */}
      <div className={settings.theme === 'light' ? 'll-light' : ''} style={{ flex: 1, minHeight: 0, height: '100%' }}>
        <div className="ll-app" style={{ height: '100%' }}>
          <div className="ll-bgimg" style={settings.bg ? { backgroundImage: `url('${settings.bg}')`, opacity: settings.theme === 'light' ? 0.12 : 0.08 } : {}} />
          <Sidebar manual={manual} settings={settings} ui={ui} setUi={setUi} setSettings={setSettings} done={done} tier={tier} />
          <main className="ll-main">
            <Header settings={settings} setSettings={setSettings} ui={ui} setUi={setUi} manual={manual} onExit={onExit} setToast={toast} catSpeak={cat.speak} />
            <div className="ll-content"><div className="ll-wrap">
              <div className="ll-stephead">
                <div>
                  <h1 className="ll-title">{step.title}</h1>
                  {step.gamification?.points && <div className="ll-zap">⚡ +{step.gamification.points} points available</div>}
                </div>
                {step.communityLegacy && <span className="ll-legacy">Community/Legacy</span>}
              </div>
              {settings.teacher && step.teacherPrompt && (
                <div className="ll-tnotes" onMouseEnter={() => cat.speak(step.teacherPrompt || '')}>
                  <h4>🎯 Teacher Instructions</h4>
                  <div className="ll-md" dangerouslySetInnerHTML={mdHtml(step.teacherPrompt)} />
                </div>
              )}
              {step.studentInstructions && (
                <div className="ll-sinst" onMouseEnter={() => cat.speak(step.studentInstructions || '')}><p>{step.studentInstructions}</p></div>
              )}
              {step.languageReference && <LanguagePanel ref={step.languageReference} speak={cat.speak} />}
              <TimerBar timer={stepTimer} total={stepTotal} running={false} />
              <div className="ll-card">
                <ActivityRenderer step={step} ctx={ctx} />
              </div>
              <FeedbackPanel step={step} speak={cat.speak} />
            </div></div>
            <footer className="ll-footer"><div className="ll-inner">
              <button className="ll-navbtn ll-prev" onClick={() => setSettings((s) => ({ ...s, idx: Math.max(0, s.idx - 1) }))} disabled={settings.idx === 0}>‹ Previous</button>
              <div className="ll-dots">
                {steps.map((st, i) => {
                  const pr = settings.steps[st.id];
                  return <button key={st.id} className={`ll-dot ${i === settings.idx ? 'll-cur' : ''} ${pr?.status === 'completed' ? 'll-done' : ''}`} onClick={() => setSettings((s) => ({ ...s, idx: i }))} />;
                })}
              </div>
              <button className="ll-navbtn ll-next" onClick={next} disabled={settings.idx >= steps.length - 1}>Next ›</button>
            </div></footer>
          </main>
          <CatWidget settings={settings} setSettings={setSettings} ui={ui} setUi={setUi} cat={cat} />
          {ui.aiPanel && <AIPanel manual={manual} settings={settings} ui={ui} setUi={setUi} setManual={setManual} toast={toast} />}
        </div>
        {toastMsg && <div className="ll-toast">{toastMsg}</div>}
      </div>
    </>
  );
}

function Sidebar({ manual, settings, ui, setUi, setSettings, done, tier }: any) {
  const learner = manual.learnerProfile || {};
  const steps = manual.procedureBlocks;
  const open = !!ui.sidebarOpen; // hoisted so the header hamburger can open it on mobile
  const close = () => setUi((u: any) => ({ ...u, sidebarOpen: false }));
  const filtered = steps.filter((st: any) => {
    const okPhase = !ui.phase || st.phase === ui.phase;
    const q = (ui.q || '').toLowerCase();
    const okQ = !q || st.title?.toLowerCase().includes(q) || st.type?.toLowerCase().includes(q);
    return okPhase && okQ;
  });
  return (
    <aside className={`ll-side ${open ? 'll-open' : ''}`}>
      <div className="ll-prof">
        <div className="ll-profrow">
          <div className={`ll-avatar ${tier.cls}`}>{(learner.name || 'S').substring(0, 1).toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="ll-profname">{learner.name || 'Student'}</p>
            <p className="ll-tier-txt" style={{ color: tier.color }}>{tier.emoji} {tier.label}</p>
            <p className="ll-sub">{learner.level || manual.metadata.level || 'B1'} • {manual.metadata.targetLanguage || 'en-US'}</p>
          </div>
        </div>
        <div className="ll-stats">
          <div className="ll-stat"><b>⭐ {settings.points}</b><span>Points</span></div>
          <div className="ll-stat"><b>🔥 {settings.streak}</b><span>Streak</span></div>
          <div className="ll-stat"><b>🏆 {settings.badges.length}</b><span>Badges</span></div>
        </div>
        {settings.badges.length > 0 && <div className="ll-badges">{settings.badges.map((b: string, i: number) => <span key={i} className="ll-badge">{b}</span>)}</div>}
      </div>
      <div className="ll-search">
        <input placeholder="Search activities..." value={ui.q || ''} onChange={(e) => setUi((u: any) => ({ ...u, q: e.target.value }))} />
        {ui.q && <button className="ll-x" onClick={() => setUi((u: any) => ({ ...u, q: '' }))}>✕</button>}
      </div>
      <div className="ll-phases">
        {['study', 'speak', 'review'].map((p) => {
          const pc = PHASES[p];
          const count = steps.filter((st: any) => st.phase === p).length;
          const on = ui.phase === p;
          return (
            <button key={p} className={`ll-phase ${on ? 'll-on' : ''}`} style={on ? { background: 'rgba(99,102,241,.15)', color: '#818cf8' } : {}} onClick={() => setUi((u: any) => ({ ...u, phase: on ? undefined : p }))}>
              <span className="ll-emoji">{pc.emoji}</span><b>{pc.label}</b><small>{count} activities</small>
            </button>
          );
        })}
      </div>
      <div className="ll-steps">
        {filtered.map((st: any, i: number) => {
          const origIdx = steps.findIndex((s: any) => s.id === st.id);
          const pr = settings.steps[st.id];
          const active = origIdx === settings.idx;
          const doneStep = pr?.status === 'completed';
          const pc = PHASES[st.phase || 'speak'];
          return (
            <button key={st.id} className={`ll-step ${active ? 'll-active' : ''} ${doneStep ? 'll-done' : ''}`} onClick={() => { setSettings((s: any) => ({ ...s, idx: origIdx })); close(); }}>
              <span className="ll-sico">{doneStep ? '✅' : active ? '🔵' : '⚪'}</span>
              <span className="ll-sinfo">
                <span className={`ll-phasetag ${pc.cls}`}>{pc.emoji} {pc.label}</span>
                <span className="ll-steptitle">{origIdx + 1}. {st.title}</span>
                <span className="ll-stype">{(st.type || '').replace(/-/g, ' ')}</span>
                {pr?.score !== undefined && <span className="ll-sscore">✅ {pr.score}/{pr.maxScore} pts</span>}
              </span>
              <span className="ll-smeta">
                {active && <span style={{ color: '#818cf8', fontSize: 16 }}>›</span>}
                {st.gamification?.points && <span className="ll-pts">⚡{st.gamification.points}</span>}
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: 'var(--ll-txt3)' }}><span style={{ fontSize: 34, display: 'block', marginBottom: 8 }}>🔍</span>No activities found</div>}
      </div>
      <div className="ll-prog">
        <div className="ll-progrow"><span>Progress</span><b>{done}/{steps.length}</b></div>
        <div className="ll-progbar"><div className="ll-progfill" style={{ width: `${steps.length ? (done / steps.length * 100) : 0}%` }} /></div>
      </div>
    </aside>
  );
}

function Header({ settings, setSettings, ui, setUi, manual, onExit, setToast, catSpeak }: any) {
  const bgCur = BG_LIST.find((b) => b.url === settings.bg) || BG_LIST[0];
  const ambCur = AMBIENT.find((a) => a.id === settings.ambient) || AMBIENT[0];
  return (
    <header className="ll-header">
      <button className="ll-hbtn ll-sidetoggle" title="Menu" onClick={() => setUi((u: any) => ({ ...u, sidebarOpen: !u.sidebarOpen }))}>☰</button>
      <button className="ll-hbtn" title="Classroom Home" onClick={() => onExit ? onExit() : (window.location.href = '/')}>🏠</button>
      <div className="ll-dd">
        <button className={`ll-hbtn ${ui.bgOpen ? 'll-on' : ''}`} onClick={() => setUi((u: any) => ({ ...u, bgOpen: !u.bgOpen, ambOpen: false }))}>{bgCur.emoji} Background ▾</button>
        {ui.bgOpen && (
          <div className="ll-ddmenu"><h4>🖼️ Background Image</h4><div className="ll-ddgrid">
            {BG_LIST.map((b) => (
              <button key={b.id} className={`ll-ddcell ${settings.bg === b.url ? 'll-cur' : ''}`} onClick={() => { setSettings((s: any) => ({ ...s, bg: b.url })); setUi((u: any) => ({ ...u, bgOpen: false })); }}>
                <span className="ll-thumb">{b.url ? <img src={b.url} loading="lazy" /> : b.emoji}</span><span>{b.name}</span>
              </button>
            ))}
          </div></div>
        )}
      </div>
      {/* Stamping themeV here is what makes the migration one-shot: once the tutor
          picks a theme, it is a deliberate choice and later loads keep it. */}
      <button className="ll-hbtn" title="Toggle theme" onClick={() => setSettings((s: any) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark', themeV: THEME_VERSION }))}>{settings.theme === 'dark' ? '☀️' : '🌙'}</button>
      <button className={`ll-hbtn ${settings.teacher ? 'll-on' : ''}`} onClick={() => setSettings((s: any) => ({ ...s, teacher: !s.teacher }))}>{settings.teacher ? '👁 Teacher' : '🚫 Teacher'}</button>
      <button className={`ll-hbtn ${settings.tts ? 'll-em' : ''}`} onClick={() => setSettings((s: any) => ({ ...s, tts: !s.tts }))}>{settings.tts ? '🔊' : '🔇'}</button>
      <div className="ll-dd">
        <button className={`ll-hbtn ${ui.ambOpen ? 'll-on' : ''}`} onClick={() => setUi((u: any) => ({ ...u, ambOpen: !u.ambOpen, bgOpen: false }))}>{ambCur.emoji} {settings.ambient === 'none' ? 'Ambient ▾' : 'Playing ▾'}</button>
        {ui.ambOpen && (
          <div className="ll-ddmenu"><h4>🎵 Ambient Sounds</h4><div className="ll-ddlist">
            {AMBIENT.map((a) => (
              <button key={a.id} className={`ll-ddrow ${settings.ambient === a.id ? 'll-cur' : ''}`} onClick={() => setSettings((s: any) => ({ ...s, ambient: a.id }))}>
                <span className="ll-eq">{a.emoji}</span>{a.name}{settings.ambient === a.id ? ' •' : ''}
              </button>
            ))}
          </div></div>
        )}
      </div>
      <span className="ll-spacer" />
      <button className="ll-hbtn" title="Print / Export PDF study worksheet" onClick={() => printWorksheet(manual)}>🖨️</button>
      <button className="ll-hbtn ll-grad" onClick={() => setUi((u: any) => ({ ...u, aiPanel: true, aiTab: u.aiTab || 'generate' }))}>✨ Lesson Info</button>
    </header>
  );
}

function TimerBar({ timer, total, running }: { timer: number; total: number; running: boolean }) {
  const rem = timer || total;
  const prog = Math.max(0, Math.min(1, rem / total));
  const circ = 2 * Math.PI * 26;
  const off = circ * (1 - prog);
  const color = rem <= 10 ? '#ef4444' : rem <= 30 ? '#f59e0b' : '#6366f1';
  return (
    <div className="ll-timer">
      <div className="ll-tcirc">
        <svg width="62" height="62" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="26" fill="none" stroke="var(--ll-bg3)" strokeWidth="4" />
          <circle cx="28" cy="28" r="26" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off} />
        </svg>
        <span className="ll-tt" style={{ color: rem <= 30 ? '#fbbf24' : 'var(--ll-txt)' }}>{fmtTime(rem)}</span>
      </div>
      {running && <div className="ll-tdot" />}
    </div>
  );
}

function LanguagePanel({ ref: langRef, speak }: any) {
  const [open, setOpen] = useState<Record<string, boolean>>({ grammar: true });
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const sec = (id: string) => <button className="ll-sechead" onClick={() => setOpen((o) => ({ ...o, [id]: !o[id] }))}>{open[id] ? '▴' : '▾'}</button>;
  return (
    <div className="ll-lang">
      <div className="ll-langhead"><span>📚</span><span>Language Reference</span></div>
      {langRef.grammar?.length > 0 && (
        <div className="ll-sec">
          <button className="ll-sechead" onClick={() => setOpen((o) => ({ ...o, grammar: !o.grammar }))}>📖 Grammar <span>{open.grammar ? '▴' : '▾'}</span></button>
          {open.grammar && <div className="ll-secbody">
            {langRef.grammar.map((g: any, i: number) => (
              <div key={i} className="ll-grow" onMouseEnter={() => speak(`${g.rule}. For example: ${g.example}`)}>
                <button className="ll-chk" onClick={() => setChecked((c) => ({ ...c, [`g-${i}`]: !c[`g-${i}`] }))}>{checked[`g-${i}`] ? '☑' : '⬜'}</button>
                <div className="ll-gbox" style={{ borderLeftColor: g.color || '#6366f1', background: `${g.color || '#6366f1'}15` }}>
                  <b dangerouslySetInnerHTML={{ __html: mdInline(g.rule) }} />
                  <i>“{g.example}”</i>
                </div>
              </div>
            ))}
          </div>}
        </div>
      )}
      {langRef.vocabulary?.length > 0 && (
        <div className="ll-sec">
          <button className="ll-sechead" onClick={() => setOpen((o) => ({ ...o, vocab: !o.vocab }))}>📝 Vocabulary <span>{open.vocab ? '▴' : '▾'}</span></button>
          {open.vocab && <div className="ll-secbody"><div className="ll-vwrap">
            {langRef.vocabulary.map((v: any, i: number) => (
              <div key={i} className="ll-vchip" style={{ background: `${v.color || '#f59e0b'}20`, border: `2px solid ${v.color || '#f59e0b'}40` }} onMouseEnter={() => speak(`${v.word}: ${v.definition}`)}>
                <b style={{ color: v.color || '#f59e0b' }}>{v.word}</b><span>– {v.definition}</span>
              </div>
            ))}
          </div></div>}
        </div>
      )}
      {langRef.expressions?.length > 0 && (
        <div className="ll-sec">
          <button className="ll-sechead" onClick={() => setOpen((o) => ({ ...o, expr: !o.expr }))}>💡 Expressions <span>{open.expr ? '▴' : '▾'}</span></button>
          {open.expr && <div className="ll-secbody">
            {langRef.expressions.map((e: any, i: number) => (
              <div key={i} className="ll-grow ll-expr" onMouseEnter={() => speak(e.phrase)}>
                <button className="ll-chk" onClick={() => setChecked((c) => ({ ...c, [`e-${i}`]: !c[`e-${i}`] }))}>{checked[`e-${i}`] ? '☑' : '⬜'}</button>
                <div><b>“{e.phrase}”</b><p>{e.context}</p></div>
              </div>
            ))}
          </div>}
        </div>
      )}
      {langRef.spokenGrammar?.length > 0 && (
        <div className="ll-sec">
          <button className="ll-sechead" onClick={() => setOpen((o) => ({ ...o, spoken: !o.spoken }))}>🗣️ Spoken Grammar <span>{open.spoken ? '▴' : '▾'}</span></button>
          {open.spoken && <div className="ll-secbody">
            {langRef.spokenGrammar.map((sg: string, i: number) => (
              <div key={i} className="ll-grow" onMouseEnter={() => speak(sg)}>
                <button className="ll-chk" onClick={() => setChecked((c) => ({ ...c, [`sg-${i}`]: !c[`sg-${i}`] }))}>{checked[`sg-${i}`] ? '☑' : '⬜'}</button>
                <p style={{ color: '#22d3ee', fontSize: 17 }}>{sg}</p>
              </div>
            ))}
          </div>}
        </div>
      )}
      {langRef.sentenceStarters?.length > 0 && (
        <div className="ll-sec">
          <button className="ll-sechead" onClick={() => setOpen((o) => ({ ...o, starters: !o.starters }))}>✍️ Sentence Starters <span>{open.starters ? '▴' : '▾'}</span></button>
          {open.starters && <div className="ll-secbody">
            {langRef.sentenceStarters.map((ss: any, i: number) => (
              <div key={i} className="ll-grow" onMouseEnter={() => speak(ss.starter)}>
                <button className="ll-chk" onClick={() => setChecked((c) => ({ ...c, [`ss-${i}`]: !c[`ss-${i}`] }))}>{checked[`ss-${i}`] ? '☑' : '⬜'}</button>
                <div className="ll-ssbox"><b>“{ss.starter}”</b>{ss.purpose && <p>{ss.purpose}</p>}</div>
              </div>
            ))}
          </div>}
        </div>
      )}
    </div>
  );
}

function FeedbackPanel({ step, speak }: any) {
  const ccqs = (step.ccqQuestions || []).concat(step.h5pActivity?.feedback?.ccqQuestions || []);
  const spks = (step.speakingQuestions || []).concat(step.h5pActivity?.feedback?.speakingQuestions || []);
  return (
    <>
      {ccqs.length > 0 && (
        <div className="ll-ccq"><h4>❓ Concept Check Questions (CCQ)</h4>
          {ccqs.map((c: any, i: number) => (
            <div key={i} className="ll-item" onMouseEnter={() => speak(c.question)}>
              <b>💬 <span dangerouslySetInnerHTML={{ __html: mdInline(c.question) }} /></b>
              {c.answer && <details><summary>👁️ Show answer</summary><p className="ll-ans" dangerouslySetInnerHTML={{ __html: mdInline(c.answer) }} /></details>}
              {c.purpose && <p className="ll-purp">Purpose: {c.purpose}</p>}
            </div>
          ))}
        </div>
      )}
      {spks.length > 0 && (
        <div className="ll-spk"><h4>🎤 Speaking Practice</h4>
          {spks.map((sq: any, i: number) => (
            <div key={i} className="ll-item" onMouseEnter={() => speak(sq.question)}>
              <div className="ll-srow">
                <p dangerouslySetInnerHTML={{ __html: mdInline(sq.question) }} />
                {sq.level && <span className={`ll-level ll-lv-${sq.level}`}>{sq.level}</span>}
              </div>
              {sq.followUp && <p className="ll-follow">↪️ Follow-up: {sq.followUp}</p>}
              {sq.targetLanguage && <p className="ll-target">🎯 Target: “{sq.targetLanguage}”</p>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function CatWidget({ settings, setSettings, ui, setUi, cat }: any) {
  const [panel, setPanel] = useState(false);
  const filtered = cat.voices.filter((v: any) => {
    const q = (ui.voiceQ || '').toLowerCase();
    return !q || v.name.toLowerCase().includes(q) || (v.lang || '').toLowerCase().includes(q);
  });
  return (
    <div className="ll-cat" id="ll-cat">
      {panel && (
        <div className="ll-catpanel">
          <h3>🎤 Cat Voice Settings</h3>
          <button
            className={`ll-mutebig ${settings.muted ? 'll-todf ll-on-red' : 'll-todf ll-on-blue'}`}
            onClick={() => setSettings((s: any) => ({ ...s, muted: !s.muted }))}
          >{settings.muted ? '🔇 Cat is Muted — click to unmute' : '🔊 Cat is Speaking — click to mute'}</button>
          <div className="ll-catsearch">🔍 <input placeholder="Search voices..." value={ui.voiceQ || ''} onChange={(e) => setUi((u: any) => ({ ...u, voiceQ: e.target.value }))} /></div>
          <div className="ll-voices">
            {filtered.map((v: any, i: number) => (
              <button key={v.name} className={`ll-voice ${settings.voice === v.name ? 'll-cur' : ''}`} onClick={() => setSettings((s: any) => ({ ...s, voice: v.name }))}>
                {v.name}<small>{v.lang}</small>
              </button>
            ))}
            {filtered.length === 0 && <p style={{ padding: 10, fontSize: 13, color: 'var(--ll-txt3)' }}>No voices found</p>}
          </div>
          <div className="ll-catsliders">
            <div><label>Speed: <b>{settings.rate.toFixed(1)}x</b></label><input type="range" min="0.5" max="1.5" step="0.1" value={settings.rate} onChange={(e) => setSettings((s: any) => ({ ...s, rate: parseFloat(e.target.value) }))} /></div>
            <div><label>Pitch: <b>{settings.pitch.toFixed(1)}</b></label><input type="range" min="0.5" max="1.5" step="0.1" value={settings.pitch} onChange={(e) => setSettings((s: any) => ({ ...s, pitch: parseFloat(e.target.value) }))} /></div>
          </div>
        </div>
      )}
      {cat.message && !settings.muted && <div className="ll-catbub"><p>{cat.message}</p></div>}
      <button className={`ll-catface ${settings.muted ? 'll-muted' : ''}`} onClick={() => { if (settings.muted) setSettings((s: any) => ({ ...s, muted: false })); else setPanel(!panel); }}>
        {settings.muted ? '😿' : '🐱'}
      </button>
      <button className={`ll-catmute ${settings.muted ? 'll-m' : ''}`} onClick={() => setSettings((s: any) => ({ ...s, muted: !s.muted }))}>{settings.muted ? '🔇' : '🔊'}</button>
      <button className={`ll-catset ${panel ? 'll-rot' : ''}`} onClick={() => setPanel(!panel)}>⚙</button>
    </div>
  );
}

function AIPanel({ manual, settings, ui, setUi, setManual, toast }: any) {
  const [err, setErr] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const buildPrompt = () => {
    const meta = manual.metadata || {};
    const learner = manual.learnerProfile || {};
    const types = manual.procedureBlocks.map((st: any) => st.type);
    return [
      'You are an expert ESL/EFL lesson designer. Create a COMPLETE, DETAILED "Live Lesson" manual in JSON (LiveLessonManual schema).',
      '',
      `TOPIC: ${meta.topic || 'General English'}`,
      `LEVEL: ${meta.level || 'B1'} (CEFR)`,
      `LEARNER: ${learner.name || 'Student'} — interests: ${(learner.interests || []).join(', ') || 'travel, music, technology'}`,
      `DURATION: ${meta.durationMinutes || 60} minutes`,
      `PHASE: ${meta.phase || 'speak'}`,
      '',
      'CRITICAL RULES:',
      '1. NEVER write teacher instructions — always talk directly to the learner.',
      `2. Simplify ALL language to CEFR ${meta.level || 'B1'}.`,
      '3. Personalize using learner name and interests.',
      '4. Every activity must have 3-5 items/rounds/cards and recycle lesson language.',
      `5. Use ONLY these activity types: ${types.join(', ')}.`,
      '',
      'SCHEMA:',
      '{"metadata": {lessonId, title, description, durationMinutes, learningObjectives[], targetLanguage, defaultLocale, phase, level, topic},',
      ' "learnerProfile": {name, level, interests[]},',
      ' "globalSettings": {timerBehaviour, gamification: {points, retryAllowed, maxRetries, badgeConditions[]}, confettiOnCorrect},',
      ' "procedureBlocks": [',
      '   {id, title, type, phase: study|speak|review, durationSeconds, teacherPrompt, studentInstructions,',
      '    languageReference: {grammar[], vocabulary[], expressions[], spokenGrammar[], sentenceStarters[]},',
      '    ccqQuestions[], speakingQuestions[], h5pActivity: {type, ...}, gamification: {points, retryAllowed, maxRetries}}',
      ' ]}',
      '',
      'Return ONLY raw JSON, no markdown fences.',
    ].join('\n');
  };
  const copy = () => {
    const p = buildPrompt();
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(p).then(() => toast('📋 Prompt copied to clipboard!'));
    } else {
      const ta = document.createElement('textarea');
      ta.value = p; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('📋 Prompt copied to clipboard!'); } catch { /* noop */ }
      document.body.removeChild(ta);
    }
  };
  return (
    <div className="ll-modal" onClick={(e) => { if (e.target === e.currentTarget) setUi((u: any) => ({ ...u, aiPanel: false })); }}>
      <div className="ll-modalbox">
        <div className="ll-modaltabs">
          <button className={`ll-modaltab ${ui.aiTab !== 'import' ? 'll-on' : ''}`} onClick={() => setUi((u: any) => ({ ...u, aiTab: 'generate' }))}>✨ Lesson Info & AI Prompt</button>
          <button className={`ll-modaltab ${ui.aiTab === 'import' ? 'll-on' : ''}`} onClick={() => setUi((u: any) => ({ ...u, aiTab: 'import' }))}>📥 Import JSON</button>
        </div>
        <div className="ll-modalbody">
          {ui.aiTab === 'import' ? (
            <>
              <p style={{ fontSize: 14, color: 'var(--ll-txt2)', marginBottom: 10 }}>Paste a Live Lesson manual JSON (from any AI) to load it into this presenter:</p>
              {err && <div className="ll-jsonerr">⚠️ {err}</div>}
              <div className="ll-field"><textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder='{"metadata":{...},"procedureBlocks":[...]}' style={{ minHeight: 220 }} /></div>
              <div className="ll-btnrow">
                <button className="ll-btn ll-pri" onClick={() => {
                  try {
                    const parsed = JSON.parse(importText || 'null');
                    if (!parsed || !parsed.procedureBlocks?.length) throw new Error('Missing procedureBlocks[]');
                    setManual(normalizeLiveLesson(parsed, {}));
                    setUi((u: any) => ({ ...u, aiPanel: false }));
                    toast('✅ Lesson loaded!');
                  } catch (e: any) { setErr(e.message || String(e)); }
                }}>Load Lesson</button>
              </div>
            </>
          ) : (
            <>
              <div className="ll-field"><label>Lesson</label><input value={manual.metadata?.title || ''} disabled /></div>
              <div className="ll-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label>Learner</label><input value={manual.learnerProfile?.name || 'Student'} disabled /></div>
                <div><label>Level</label><input value={manual.metadata?.level || 'B1'} disabled /></div>
              </div>
              <div className="ll-field"><label>Learning objectives</label><textarea disabled value={(manual.metadata?.learningObjectives || []).join('\n')} /></div>
              <div className="ll-field"><label>Activity types ({manual.procedureBlocks.length} steps)</label><div className="ll-actsgrid">
                {manual.procedureBlocks.map((st: any, i: number) => <span key={i} style={{ fontSize: 13, color: 'var(--ll-txt2)' }}>{i + 1}. {(st.type || '').replace(/-/g, ' ')}</span>)}
              </div></div>
              <div className="ll-field"><label>📋 AI prompt (copy into any AI to regenerate/improve this lesson)</label>
                <div className="ll-promptbox">{buildPrompt()}</div>
              </div>
              <div className="ll-btnrow"><button className="ll-btn ll-pri" onClick={copy}>📋 Copy Prompt</button></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}