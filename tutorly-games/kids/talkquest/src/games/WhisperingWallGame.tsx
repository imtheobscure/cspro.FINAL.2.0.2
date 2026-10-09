'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, Eye, EyeOff, Zap } from 'lucide-react';
import { scene } from '@/lib/art';
import { AudioManager } from '@/lib/audio';
import { useGameEngine, shuffle, pickN } from '@/lib/gameCore';
import { GameHUD, JuiceShell } from '@/components/GameHUD';
import { useKidSpeechRecognition } from '@/lib/speech';
import { SpeakGate } from '@/components/SpeakGate';

interface Props { onExit: () => void; onRewardStar: () => void; }

const PHRASE_POOL = [
  ['Open', 'the', 'golden', 'gate'],
  ['Silver', 'moon', 'light', 'shine'],
  ['Brave', 'heart', 'find', 'treasure'],
  ['Quiet', 'wind', 'carry', 'me'],
  ['Ancient', 'stone', 'hear', 'us'],
  ['Little', 'star', 'guide', 'us'],
  ['Secret', 'door', 'please', 'open'],
  ['Kind', 'words', 'break', 'curse'],
];
const RUNES = ['✦', '❂', '✵', '❈', '✹', '⟡', '◈', '❋'];

export const WhisperingWallGame: React.FC<Props> = ({ onExit, onRewardStar }) => {
  const g = useGameEngine({ startingLives: 3, maxLevel: 8 });
  const [phrase, setPhrase] = useState<string[]>([]);
  const [slots, setSlots] = useState<(string | null)[]>([]);
  const [bank, setBank] = useState<string[]>([]);
  const [memorise, setMemorise] = useState(true);      // memory phase
  const [guardAwake, setGuardAwake] = useState(false); // patrol mechanic
  const [guardTimer, setGuardTimer] = useState(0);
  const [doorOpen, setDoorOpen] = useState(false);
  const [lastWord, setLastWord] = useState('');
  const [spokenOk, setSpokenOk] = useState(false);

  const newRound = (lvl: number) => {
    const base = PHRASE_POOL[Math.floor(Math.random() * PHRASE_POOL.length)];
    const length = Math.min(4, 2 + Math.floor(lvl / 2));
    const p = base.slice(0, length);
    const decoyCount = Math.min(4, 1 + Math.floor(lvl / 2));
    const decoys = pickN(
      PHRASE_POOL.flat().filter(x => !p.includes(x)),
      decoyCount
    );
    setPhrase(p);
    setSlots(new Array(p.length).fill(null));
    setBank(shuffle([...p, ...decoys]));
    setDoorOpen(false);
    setSpokenOk(false);
    setMemorise(true);
    // memorise window shrinks as levels rise
    const showMs = Math.max(1400, 4200 - lvl * 350);
    AudioManager.playSound('sparkle');
    setTimeout(() => setMemorise(false), showMs);
  };

  useEffect(() => { if (g.running) newRound(g.level); /* eslint-disable-next-line */ }, [g.level, g.running]);

  // Guard patrol — when awake, placing a word costs a life (must wait)
  useEffect(() => {
    if (!g.running || memorise) return;
    const id = setInterval(() => {
      setGuardTimer(t => {
        const next = t + 1;
        const cycle = Math.max(4, 9 - g.level);
        if (next % cycle === 0) {
          setGuardAwake(a => {
            const now = !a;
            AudioManager.playSound(now ? 'alarm' : 'whoosh');
            return now;
          });
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [g.running, g.level, memorise]);

  const place = (word: string) => {
    if (memorise || !spokenOk) return;
    if (guardAwake) {
      AudioManager.playSound('thud');
      g.registerMiss(true);
      return;
    }
    const emptyIdx = slots.findIndex(s => s === null);
    if (emptyIdx === -1) return;

    if (word === phrase[emptyIdx]) {
      const next = [...slots]; next[emptyIdx] = word;
      setSlots(next);
      // Remove the tile that was actually tapped. The old code passed the index
      // of the *first* matching word in the bank, so hearing a word by voice
      // could delete a different tile and leave the right one behind forever.
      setBank(b => {
        const at = b.indexOf(word);
        return at === -1 ? b : b.filter((_, i) => i !== at);
      });
      setLastWord(word);
      AudioManager.speak(word, 'en');
      g.registerHit(120);
      onRewardStar();

      if (next.every(s => s !== null)) {
        setDoorOpen(true);
        AudioManager.playSound('unlock');
        setTimeout(() => g.advanceLevel(), 1400);
      }
    } else {
      g.registerMiss(true);
    }
  };

  const onVoice = useCallback((text: string) => {
    const lower = text.toLowerCase();
    const emptyIdx = slots.findIndex(s => s === null);
    if (emptyIdx === -1) return;
    const target = phrase[emptyIdx];
    // The recogniser also hears the words still on the table, so only the word
    // the wall actually wants counts. Anything else is a gentle nudge, and the
    // tutor can still place the tile by hand.
    if (lower.includes(target.toLowerCase()) && bank.includes(target)) {
      place(target);
    } else {
      AudioManager.playSound('select');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bank, phrase, slots, memorise, spokenOk, guardAwake]);
  const { listening, supported: micSupported, startListening, stopListening } = useKidSpeechRecognition(onVoice);

  const runeSet = useMemo(() => RUNES.slice(0, Math.max(2, phrase.length)), [phrase.length]);

  /* ---------------- Start screen ---------------- */
  if (!g.running && !g.gameOver && !g.victory) {
    return (
      <StartCard
        title="Whispering-Wall Escape"
        img={scene('whisper-wall')}
        tag="Memory · Voice · Patrol Dodge"
        rules={[
          'Listen. Then WHISPER the whole password. Tutor taps green only if they hear it.',
          'Rebuild the words in order — but never while the stone eye is open.',
          'Wrong word or tapping during the patrol costs a life.',
          'Combo if you whisper well and rebuild clean. 3 lives.',
        ]}
        onStart={g.start}
        onExit={onExit}
      />
    );
  }
  if (g.gameOver || g.victory) {
    return <EndCard victory={g.victory} score={g.score} best={g.bestCombo} onAgain={g.start} onExit={onExit} />;
  }

  return (
    <JuiceShell shake={g.shake} hitStop={g.hitStop} className="space-y-3">
      <GameHUD
        title="Whispering Wall" score={g.score} combo={g.combo} multiplier={g.multiplier}
        lives={g.lives} level={g.level} levelLabel={g.band.label}
        timeLeft={g.timeLeft} timeLimit={g.band.timeLimit} floaters={g.floaters} onExit={() => { g.stop(); onExit(); }}
      />

      <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl min-h-[520px]">
        <img src={scene('whisper-wall')} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-slate-950/70" />

        {/* Guard eye */}
        <div className="absolute top-4 right-4 z-20">
          <motion.div
            animate={guardAwake ? { scale: [1, 1.12, 1] } : { scale: 1 }}
            transition={{ duration: 0.7, repeat: guardAwake ? Infinity : 0 }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-sm border-2 ${
              guardAwake ? 'bg-rose-600 border-rose-300 text-white' : 'bg-emerald-700/80 border-emerald-400 text-emerald-50'
            }`}
          >
            {guardAwake ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            {guardAwake ? 'GUARD AWAKE — STOP!' : 'Guard asleep — go!'}
          </motion.div>
        </div>

        <div className="relative z-10 p-6 md:p-8">
          {/* Door */}
          <div className="flex justify-center mb-6">
            <div className="relative w-56 h-40">
              <motion.div
                className="absolute inset-y-0 left-0 w-1/2 rounded-l-2xl bg-gradient-to-br from-stone-600 to-stone-800 border-2 border-amber-400/40 flex items-center justify-center text-4xl text-amber-300/50"
                animate={{ x: doorOpen ? '-105%' : '0%' }} transition={{ duration: 1, ease: [0.6, 0, 0.3, 1] }}
              >{runeSet[0]}</motion.div>
              <motion.div
                className="absolute inset-y-0 right-0 w-1/2 rounded-r-2xl bg-gradient-to-bl from-stone-600 to-stone-800 border-2 border-amber-400/40 flex items-center justify-center text-4xl text-amber-300/50"
                animate={{ x: doorOpen ? '105%' : '0%' }} transition={{ duration: 1, ease: [0.6, 0, 0.3, 1] }}
              >{runeSet[1]}</motion.div>
              {doorOpen && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute inset-0 flex items-center justify-center text-6xl">💎</motion.div>
              )}
            </div>
          </div>

          {/* Memorise flash */}
          <AnimatePresence>
            {memorise && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }}
                className="max-w-2xl mx-auto mb-5 p-6 rounded-3xl bg-amber-400/95 text-slate-900 text-center shadow-2xl"
              >
                <p className="text-xs font-black uppercase tracking-[0.25em] mb-2">Memorise the password!</p>
                <p className="text-3xl md:text-4xl font-black">{phrase.join(' · ')}</p>
                <button onClick={() => AudioManager.speak(phrase.join(' '), 'en')}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-sm cursor-pointer">
                  <Volume2 className="w-4 h-4" /> Hear it
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {!memorise && !spokenOk && phrase.length > 0 && (
            <div className="max-w-2xl mx-auto">
              <SpeakGate
                title="Whisper the whole password"
                line={phrase.join(' ')}
                hint="Soft voice. The wall is listening. Tutor: green only if you hear a real whisper."
                passLabel="The wall heard the whisper"
                onPass={() => { setSpokenOk(true); g.registerHit(80); onRewardStar(); }}
              />
            </div>
          )}

          {/* Slots */}
          {!memorise && spokenOk && (
            <>
              <div className="max-w-2xl mx-auto grid grid-flow-col auto-cols-fr gap-2 mb-5">
                {slots.map((s, i) => (
                  <div key={i} className={`h-16 rounded-2xl border-2 border-dashed flex items-center justify-center text-lg font-black ${
                    s ? 'bg-amber-400/25 border-amber-300 text-white' : 'bg-white/5 border-white/25 text-white/40'
                  }`}>
                    {s || runeSet[i % runeSet.length]}
                  </div>
                ))}
              </div>

              <div className="max-w-2xl mx-auto flex flex-wrap justify-center gap-2 mb-5">
                {bank.map((word, i) => (
                  <motion.button
                    key={`${word}-${i}`} whileHover={{ scale: guardAwake ? 1 : 1.07 }} whileTap={{ scale: 0.94 }}
                    onClick={() => place(word)}
                    className={`px-5 py-3 rounded-xl font-black text-base shadow-lg cursor-pointer transition ${
                      guardAwake ? 'bg-slate-600 text-slate-300' : 'bg-gradient-to-br from-amber-300 to-orange-500 text-slate-900'
                    }`}
                  >{word}</motion.button>
                ))}
              </div>

              <div className="flex flex-col items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => listening ? stopListening() : startListening()}
                  className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl cursor-pointer ${
                    listening ? 'bg-rose-500 animate-pulse' : 'bg-gradient-to-br from-amber-400 to-orange-500'
                  }`}
                >
                  {listening ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
                </motion.button>
                <p className="text-xs font-bold text-white/70">
                  {!micSupported
                    ? 'This browser cannot listen. Whisper to your tutor, then tap the word!'
                    : listening ? 'Whispering…' : 'Tap and whisper the next word'}
                </p>
                {lastWord && <p className="text-xs font-black text-emerald-300">Last accepted: “{lastWord}”</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </JuiceShell>
  );
};

/* ---------- shared start / end cards ---------- */
export const StartCard: React.FC<{
  title: string; img: string; tag: string; rules: string[]; onStart: () => void; onExit: () => void;
}> = ({ title, img, tag, rules, onStart, onExit }) => (
  <div className="relative rounded-3xl overflow-hidden shadow-2xl min-h-[520px] border border-white/10">
    <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
    <div className="absolute inset-0 bg-slate-950/78" />
    <div className="relative z-10 p-8 md:p-12 max-w-2xl">
      <button onClick={onExit} className="mb-6 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm cursor-pointer">← All games</button>
      <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-300 mb-2">{tag}</p>
      <h2 className="text-4xl md:text-5xl font-black text-white mb-5">{title}</h2>
      <ul className="space-y-2 mb-8">
        {rules.map((r, i) => (
          <li key={i} className="flex gap-3 text-white/90 font-semibold">
            <span className="w-6 h-6 shrink-0 rounded-lg bg-amber-400 text-slate-900 text-xs font-black flex items-center justify-center">{i + 1}</span>
            {r}
          </li>
        ))}
      </ul>
      <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={onStart}
        className="px-10 py-5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-black text-xl shadow-2xl cursor-pointer inline-flex items-center gap-2">
        <Zap className="w-6 h-6" /> START
      </motion.button>
    </div>
  </div>
);

export const EndCard: React.FC<{
  victory: boolean; score: number; best: number; onAgain: () => void; onExit: () => void;
}> = ({ victory, score, best, onAgain, onExit }) => (
  <div className={`rounded-3xl p-10 text-center shadow-2xl ${victory ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-slate-700 to-slate-900'}`}>
    <div className="text-7xl mb-4">{victory ? '🏆' : '💪'}</div>
    <h2 className="text-4xl font-black text-white mb-2">{victory ? 'LEGEND!' : 'Good Try!'}</h2>
    <p className="text-white/80 font-bold mb-6">Score {score.toLocaleString()} · Best combo ×{best}</p>
    <div className="flex justify-center gap-3">
      <button onClick={onAgain} className="px-7 py-3.5 rounded-2xl bg-white text-slate-900 font-black cursor-pointer">Play Again</button>
      <button onClick={onExit} className="px-7 py-3.5 rounded-2xl bg-white/15 text-white font-black cursor-pointer">All Games</button>
    </div>
  </div>
);
