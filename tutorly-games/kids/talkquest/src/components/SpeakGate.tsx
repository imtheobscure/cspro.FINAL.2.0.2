'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Volume2, Check, RotateCcw } from 'lucide-react';
import { AudioManager } from '@/lib/audio';
import { useKidSpeechRecognition } from '@/lib/speech';

/**
 * Screen-share speaking gate.
 * Kids must produce the line. Tutor confirms (mic often blocked on share).
 * Games should not award the round until onPass fires.
 */
export const SpeakGate: React.FC<{
  title?: string;
  line: string;
  hint?: string;
  onPass: () => void;
  passLabel?: string;
}> = ({ title = 'Say it out loud', line, hint, onPass, passLabel = 'I heard it!' }) => {
  const [tries, setTries] = useState(0);
  const { listening, startListening, stopListening, transcript } = useKidSpeechRecognition();

  const heard = () => {
    AudioManager.playSound('correct');
    onPass();
  };

  const again = () => {
    setTries(t => t + 1);
    AudioManager.playSound('pop');
    AudioManager.speak(line, 'en');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-white p-5 shadow-2xl border-4 border-amber-300">
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-600">{title}</p>
      <p className="mt-2 text-xl md:text-2xl font-black text-slate-900 leading-snug">“{line}”</p>
      {hint && <p className="mt-1 text-sm font-bold text-slate-500">{hint}</p>}
      {transcript && <p className="mt-2 text-xs font-bold text-sky-700">Mic heard: {transcript}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => AudioManager.speak(line, 'en')}
          className="btn-3d inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 text-white font-black text-sm cursor-pointer">
          <Volume2 className="w-4 h-4" /> Hear first
        </button>
        <button onClick={() => listening ? stopListening() : startListening()}
          className={`btn-3d inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-sm cursor-pointer ${listening ? 'bg-rose-500 text-white' : 'bg-sky-200 text-slate-900'}`}>
          <Mic className="w-4 h-4" /> {listening ? 'Listening…' : 'I will say it'}
        </button>
        <button onClick={again}
          className="btn-3d inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-orange-100 text-slate-900 font-black text-sm cursor-pointer">
          <RotateCcw className="w-4 h-4" /> Try again {tries > 0 ? `(${tries})` : ''}
        </button>
        <button onClick={heard}
          className="btn-3d inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-400 text-slate-900 font-black text-sm cursor-pointer ml-auto">
          <Check className="w-4 h-4" /> {passLabel}
        </button>
      </div>
      <p className="mt-2 text-[11px] font-bold text-slate-400">Tutor: only press green when the child really said it.</p>
    </motion.div>
  );
};
