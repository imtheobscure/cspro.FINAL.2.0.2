import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import { Lang, LANG_META, Word } from '../data/types';
import { speak, sfx, listenOnce, recognitionSupported, onSpeaking } from '../lib/audio';
import { useStore } from '../lib/store';

/* ---------- OpenMoji SVG icon (free, coherent hand-drawn style) ---------- */
function toCodepoints(emoji: string): string {
  const cps: string[] = [];
  for (const ch of emoji) {
    const cp = ch.codePointAt(0)!;
    cps.push(cp.toString(16).toUpperCase().padStart(4, '0'));
  }
  // OpenMoji keeps FE0F inside keycap & ZWJ sequences, but drops it for single emoji
  const keepFE0F = cps.includes('20E3') || cps.includes('200D');
  return cps.filter((c) => keepFE0F || c !== 'FE0F').join('-');
}
const isEmoji = (s: string) => /\p{Extended_Pictographic}/u.test(s) || /[\u20E3]/.test(s);

export function Icon({ icon, className, size }: { icon: string; className?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [icon]);
  if (isEmoji(icon) && !failed) {
    return (
      <img
        src={`https://cdn.jsdelivr.net/npm/openmoji@15.0.0/color/svg/${toCodepoints(icon)}.svg`}
        alt=""
        draggable={false}
        onError={() => setFailed(true)}
        className={cn('select-none pointer-events-none', className)}
        style={size ? { width: size, height: size } : undefined}
      />
    );
  }
  return (
    <span className={cn('select-none flex items-center justify-center font-black text-slate-700 leading-none', className)}
      style={size ? { width: size, height: size, fontSize: size * (isEmoji(icon) ? 0.8 : 0.55) } : undefined}>
      {icon}
    </span>
  );
}

/* ---------- Big kid-friendly button ---------- */
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'primary' | 'ghost' | 'success' | 'danger' | 'accent' | 'soft'; size?: 'md' | 'lg' | 'xl' };
export function Btn({ className, tone = 'primary', size = 'md', children, onClick, ...rest }: BtnProps) {
  const tones = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-[0_6px_0_#3730a3]',
    accent: 'bg-amber-400 text-slate-900 hover:bg-amber-500 shadow-[0_6px_0_#b45309]',
    success: 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_6px_0_#047857]',
    danger: 'bg-rose-500 text-white hover:bg-rose-600 shadow-[0_6px_0_#9f1239]',
    ghost: 'bg-white text-slate-800 border-2 border-slate-200 hover:border-indigo-300 shadow-[0_4px_0_#e2e8f0]',
    soft: 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 shadow-[0_4px_0_#c7d2fe]',
  };
  const sizes = { md: 'px-5 py-3 text-lg rounded-2xl', lg: 'px-7 py-4 text-xl rounded-3xl', xl: 'px-9 py-5 text-2xl rounded-3xl' };
  return (
    <motion.button
      whileTap={{ scale: 0.95, y: 4 }}
      whileHover={{ scale: 1.02 }}
      className={cn('font-bold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:shadow-none', tones[tone], sizes[size], className)}
      onClick={(e) => { sfx.tap(); onClick?.(e); }}
      {...(rest as any)}
    >
      {children}
    </motion.button>
  );
}

/* ---------- Speak button ---------- */
export function SpeakBtn({ text, lang, className, size = 'md', label }: { text: string; lang: Lang; className?: string; size?: 'sm' | 'md' | 'lg'; label?: string }) {
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => onSpeaking(setSpeaking), []);
  const s = { sm: 'w-10 h-10 text-lg', md: 'w-14 h-14 text-2xl', lg: 'w-20 h-20 text-4xl' }[size];
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={(e) => { e.stopPropagation(); speak(text, lang); }}
      title={`Read aloud (${LANG_META[lang].name})`}
      className={cn('rounded-full bg-sky-500 text-white flex items-center justify-center shadow-[0_4px_0_#0369a1] hover:bg-sky-600', label && 'px-5 w-auto gap-2', s, className)}
    >
      <motion.span animate={speaking ? { scale: [1, 1.2, 1] } : {}} transition={{ repeat: Infinity, duration: 0.6 }}>🔊</motion.span>
      {label && <span className="text-lg font-bold">{label}</span>}
    </motion.button>
  );
}

/* ---------- Microphone button (speech recognition) with tutor override ---------- */
export function MicBtn({ lang, onResult, className, size = 'lg', prompt }: { lang: Lang; onResult: (heard: string) => void; className?: string; size?: 'md' | 'lg'; prompt?: string }) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const supported = recognitionSupported();
  const start = async () => {
    if (!supported || listening) return;
    setListening(true); setInterim('');
    sfx.pop();
    try {
      const heard = await listenOnce(lang, setInterim);
      onResult(heard);
    } catch { onResult(''); }
    setListening(false);
  };
  const s = size === 'lg' ? 'w-24 h-24 text-5xl' : 'w-16 h-16 text-3xl';
  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={start}
        disabled={!supported}
        title={supported ? 'Tap and speak' : 'Speech recognition not supported in this browser – use the tutor buttons'}
        className={cn('rounded-full flex items-center justify-center shadow-[0_6px_0_#9f1239] transition-colors', s, listening ? 'bg-rose-400 animate-pulse' : 'bg-rose-500 hover:bg-rose-600', !supported && 'opacity-40')}
      >
        🎤
      </motion.button>
      {prompt && <div className="text-slate-500 text-base font-semibold">{prompt}</div>}
      {listening && <div className="text-rose-600 font-bold text-lg">Listening… {interim && <span className="text-slate-700">"{interim}"</span>}</div>}
    </div>
  );
}

/* ---------- Word card (dictionary tile) ---------- */
export function WordTile({ word, big, onClick, selected, hideText, className, showSupport = true }: { word: Word; big?: boolean; onClick?: () => void; selected?: boolean; hideText?: boolean; className?: string; showSupport?: boolean }) {
  const { settings } = useStore();
  const learn = settings.learn;
  const support = settings.support;
  return (
    <motion.button
      layout
      whileHover={onClick ? { y: -4 } : {}}
      whileTap={onClick ? { scale: 0.96 } : {}}
      onClick={onClick}
      className={cn(
        'bg-white rounded-3xl border-4 flex flex-col items-center justify-center gap-2 p-4 text-center transition-colors',
        selected ? 'border-indigo-500 shadow-[0_0_0_6px_#c7d2fe]' : 'border-slate-100 shadow-[0_6px_0_#e2e8f0]',
        big ? 'min-h-[300px]' : 'min-h-[180px]',
        className,
      )}
    >
      <Icon icon={word.icon} size={big ? 160 : 96} />
      {!hideText && (
        <>
          <div dir={LANG_META[learn].rtl ? 'rtl' : 'ltr'} className={cn('font-black text-slate-800 leading-tight', big ? 'text-5xl' : 'text-2xl')}>{word.t[learn]}</div>
          {showSupport && support !== 'none' && support !== learn && (
            <div dir={LANG_META[support].rtl ? 'rtl' : 'ltr'} className={cn('text-slate-500 font-semibold', big ? 'text-3xl' : 'text-lg')}>{word.t[support]}</div>
          )}
        </>
      )}
    </motion.button>
  );
}

/* ---------- Bilingual text ---------- */
export function BiText({ learn, support, className, sizeMain = 'text-3xl', sizeSub = 'text-xl' }: { learn: string; support?: string; className?: string; sizeMain?: string; sizeSub?: string }) {
  const { settings } = useStore();
  return (
    <div className={cn('text-center', className)}>
      <div dir={LANG_META[settings.learn].rtl ? 'rtl' : 'ltr'} className={cn('font-black text-slate-800', sizeMain)}>{learn}</div>
      {support && settings.support !== 'none' && settings.support !== settings.learn && (
        <div dir={LANG_META[settings.support as Lang].rtl ? 'rtl' : 'ltr'} className={cn('text-slate-500 font-semibold mt-1', sizeSub)}>{support}</div>
      )}
    </div>
  );
}

/* ---------- Speech bubble ---------- */
export function Bubble({ children, className, side = 'left' }: { children: React.ReactNode; className?: string; side?: 'left' | 'right' }) {
  return (
    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      className={cn('relative bg-white border-4 border-slate-200 rounded-3xl px-6 py-4 text-2xl font-bold text-slate-800 shadow-[0_6px_0_#e2e8f0]', className)}>
      <span className={cn('absolute -bottom-4 w-6 h-6 bg-white border-b-4 border-r-4 border-slate-200 rotate-45', side === 'left' ? 'left-8' : 'right-8')} />
      {children}
    </motion.div>
  );
}

/* ---------- Progress dots ---------- */
export function Progress({ total, current, className }: { total: number; current: number; className?: string }) {
  return (
    <div className={cn('flex gap-2 items-center', className)}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={cn('h-4 rounded-full transition-all', i < current ? 'bg-emerald-500 w-8' : i === current ? 'bg-indigo-500 w-10' : 'bg-slate-200 w-4')} />
      ))}
    </div>
  );
}

/* ---------- Confetti burst (lightweight) ---------- */
export function Confetti({ show }: { show: boolean }) {
  if (!show) return null;
  const pieces = Array.from({ length: 24 });
  const colors = ['#F59E0B', '#EC4899', '#10B981', '#3B82F6', '#8B5CF6'];
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-50">
      {pieces.map((_, i) => (
        <motion.div key={i}
          initial={{ x: '50vw', y: '40vh', scale: 0, rotate: 0 }}
          animate={{ x: `${10 + Math.random() * 80}vw`, y: `${80 + Math.random() * 20}vh`, scale: 1, rotate: 360 * (Math.random() > 0.5 ? 1 : -1) }}
          transition={{ duration: 1.4 + Math.random(), ease: 'easeOut' }}
          className="absolute w-4 h-4 rounded-sm" style={{ background: colors[i % colors.length] }} />
      ))}
    </div>
  );
}

/* ---------- Game shell (title, instructions for tutor, back) ---------- */
export function GameShell({ title, icon, tutorTip, children, onBack, right }: { title: string; icon: string; tutorTip: string; children: React.ReactNode; onBack: () => void; right?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 flex-wrap">
        <Btn tone="ghost" onClick={onBack}>← Back</Btn>
        <div className="flex items-center gap-3">
          <Icon icon={icon} size={56} />
          <h2 className="text-4xl font-black text-slate-800">{title}</h2>
        </div>
        <div className="ml-auto">{right}</div>
      </div>
      <details className="bg-amber-50 border-2 border-amber-200 rounded-2xl px-5 py-3 text-lg text-amber-900">
        <summary className="font-bold cursor-pointer">🧑‍🏫 Tutor tip</summary>
        <p className="mt-2 leading-relaxed">{tutorTip}</p>
      </details>
      {children}
    </div>
  );
}
