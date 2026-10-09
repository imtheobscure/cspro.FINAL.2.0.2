import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2, CheckCircle2, XCircle, RotateCcw, Sparkles, Mic, Play, Pause,
  Award, ArrowRight, HelpCircle, Check, Flame, Star, Send, Shield, Image as ImageIcon
} from 'lucide-react';
import { LessonActivity } from '../../utils/flipbookTypes';
import { KidOptionArt } from '../games/KidFreeMedia';
import {
  playClick, playQuestDing, playStarShower, playErrorSound, playCoinClink,
  playMagicSpell, playTrophyUnlock, playStickerStamp,
  playEngineRev, playNitroBoost, playTireScreech, playMagicEyeSpell, playLightningZap,
  playTimerTick, playComboSurge, playPowerUp, playCheckpointUnlock, playHomeworkComplete, playRadarScan
} from '../../utils/kidsAudio';

interface ActivityProps {
  activity: LessonActivity;
  onComplete?: (points: number) => void;
  isCompleted?: boolean;
}

// Universal Safe Text & Object Normalization Helper
export function safeExtractText(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    if (val.text !== undefined) return safeExtractText(val.text);
    if (val.word !== undefined) return safeExtractText(val.word);
    if (val.label !== undefined) return safeExtractText(val.label);
    if (val.option !== undefined) return safeExtractText(val.option);
    if (val.choice !== undefined) return safeExtractText(val.choice);
    if (val.name !== undefined) return safeExtractText(val.name);
    if (val.sentence !== undefined) return safeExtractText(val.sentence);
    if (val.value !== undefined) return safeExtractText(val.value);
    if (val.prompt !== undefined) return safeExtractText(val.prompt);
    return JSON.stringify(val);
  }
  return String(val);
}

export function safeExtractImageUrl(val: any): string | undefined {
  if (typeof val === 'object' && val !== null) {
    return val.imageUrl || val.image || val.img || val.picture || val.url || undefined;
  }
  return undefined;
}

// Speak helper using speech synthesis
function speakText(text: string, voiceName?: string, pitch = 1.0, rate = 1.0) {
  if (!('speechSynthesis' in window)) return;
  const cleanStr = safeExtractText(text);
  if (!cleanStr) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(cleanStr);
  utterance.pitch = pitch;
  utterance.rate = rate;
  if (voiceName) {
    const voices = window.speechSynthesis.getVoices();
    const found = voices.find(v => v.name.toLowerCase().includes(voiceName.toLowerCase()) || v.name === voiceName);
    if (found) utterance.voice = found;
  }
  window.speechSynthesis.speak(utterance);
}

/* ─────────────────────────────────────────────────────────────
   1. Multiple Choice Activity (Tap Choice Quiz)
   Supports string options & rich object options with images!
   ───────────────────────────────────────────────────────────── */
export const MultipleChoiceActivity: React.FC<ActivityProps> = ({ activity, onComplete, isCompleted: initialCompleted }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(initialCompleted || false);
  const [isCorrect, setIsCorrect] = useState(initialCompleted || false);

  const rawOptions = Array.isArray(activity.options) && activity.options.length > 0
    ? activity.options
    : ['Option A', 'Option B', 'Option C'];

  // Normalize options to structured objects
  const normalizedOptions = rawOptions.map((opt: any, idx: number) => {
    const text = safeExtractText(opt);
    const imageUrl = safeExtractImageUrl(opt);
    const isExplicitCorrect = typeof opt === 'object' && opt !== null && Boolean(opt.isCorrect);
    return { id: idx, text, imageUrl, isExplicitCorrect, raw: opt };
  });

  const promptText = safeExtractText(activity.prompt);

  // Check correct option
  const checkIsCorrect = (idx: number): boolean => {
    const chosen = normalizedOptions[idx];
    if (!chosen) return false;
    if (chosen.isExplicitCorrect) return true;

    if (activity.correct !== undefined) {
      if (typeof activity.correct === 'number') {
        return activity.correct === idx;
      }
      const correctStr = safeExtractText(activity.correct).trim().toLowerCase();
      if (chosen.text.trim().toLowerCase() === correctStr) return true;
    }

    // If explicit correct was set on any option
    const anyExplicit = normalizedOptions.some(o => o.isExplicitCorrect);
    if (anyExplicit) {
      return chosen.isExplicitCorrect;
    }

    // Default to first option or match text
    return idx === 0;
  };

  const handleSelect = (idx: number) => {
    if (isAnswered) return;
    playClick();
    setSelectedIdx(idx);
    const correct = checkIsCorrect(idx);
    setIsAnswered(true);
    setIsCorrect(correct);

    if (correct) {
      playQuestDing();
      playStarShower();
      onComplete?.(activity.points || 30);
    } else {
      playErrorSound();
    }
  };

  const handleReset = () => {
    setSelectedIdx(null);
    setIsAnswered(false);
    setIsCorrect(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">{promptText}</p>
        <button
          onClick={() => speakText(promptText, activity.characterSpeaker)}
          className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 hover:scale-110 active:scale-95 transition-transform shrink-0"
          title="Read Aloud"
        >
          <Volume2 className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {normalizedOptions.map((opt, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isThisCorrect = checkIsCorrect(idx);
          const isSelected = selectedIdx === idx;

          let btnStyle = 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-purple-400 hover:bg-purple-50/50';
          if (isAnswered) {
            if (isThisCorrect) {
              btnStyle = 'bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-md ring-2 ring-emerald-400/30';
            } else if (isSelected) {
              btnStyle = 'bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-400 text-rose-900 dark:text-rose-200 opacity-90';
            } else {
              btnStyle = 'opacity-50 border-slate-200 dark:border-slate-800';
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={isAnswered}
              className={`p-3.5 rounded-2xl flex flex-col sm:flex-row items-center sm:items-start gap-3 text-left font-bold transition-all transform active:scale-98 cursor-pointer ${btnStyle}`}
            >
              {/* A real photograph of the thing, resolved from the option's own
                  label, with the emoji kept as the fallback. A class sees a duck,
                  not a glyph for a duck. */}
              <KidOptionArt label={opt.text} imageUrl={opt.imageUrl} size={64} className="mb-1 sm:mb-0" />
              <div className="flex items-center gap-3 w-full">
                <span className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-200 flex items-center justify-center font-black text-sm shrink-0">
                  {letter}
                </span>
                <span className="flex-1 text-sm sm:text-base text-slate-800 dark:text-slate-100">{opt.text}</span>
                {isAnswered && isThisCorrect && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {isAnswered && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3.5 rounded-2xl flex items-center justify-between text-sm font-bold ${
            isCorrect
              ? 'bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-300'
              : 'bg-rose-100/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {isCorrect ? <Sparkles className="w-5 h-5 text-emerald-600" /> : <HelpCircle className="w-5 h-5 text-rose-600" />}
            <span>{isCorrect ? (safeExtractText(activity.feedbackCorrect) || 'Splendid job! Correct!') : (safeExtractText(activity.feedbackIncorrect) || 'Keep trying!')}</span>
          </div>
          {!isCorrect && (
            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-lg font-bold hover:bg-rose-700 flex items-center gap-1.5 cursor-pointer shadow"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Try Again
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   2. Matching Pairs Activity (Match Pairs)
   ───────────────────────────────────────────────────────────── */
export const MatchingPairsActivity: React.FC<ActivityProps> = ({ activity, onComplete, isCompleted: initialCompleted }) => {
  const rawPairs = Array.isArray(activity.pairs) && activity.pairs.length > 0
    ? activity.pairs
    : [
        { left: 'crystal', right: 'glowing magic rock' },
        { left: 'discover', right: 'find something new' },
        { left: 'brave', right: 'trying hard things' }
      ];

  const normalizedPairs = rawPairs.map((p: any, idx: number) => ({
    id: idx,
    left: safeExtractText(p.left || p.word || p.term),
    right: safeExtractText(p.right || p.meaning || p.definition || p.match),
    leftEmoji: p.leftEmoji || '',
    rightEmoji: p.rightEmoji || ''
  }));

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matched, setMatched] = useState<Record<string, string>>({});
  const [isCompleted, setIsCompleted] = useState(initialCompleted || false);
  const [shuffledRights, setShuffledRights] = useState<string[]>([]);

  useEffect(() => {
    const rights = normalizedPairs.map(p => p.right);
    setShuffledRights([...rights].sort(() => Math.random() - 0.5));
  }, [activity]);

  const handleLeftClick = (leftText: string) => {
    if (matched[leftText]) return;
    playClick();
    setSelectedLeft(leftText);
    if (selectedRight) {
      checkMatch(leftText, selectedRight);
    }
  };

  const handleRightClick = (rightText: string) => {
    if (Object.values(matched).includes(rightText)) return;
    playClick();
    setSelectedRight(rightText);
    if (selectedLeft) {
      checkMatch(selectedLeft, rightText);
    }
  };

  const checkMatch = (leftText: string, rightText: string) => {
    const pair = normalizedPairs.find(p => p.left === leftText);
    if (pair && pair.right === rightText) {
      playQuestDing();
      const updated = { ...matched, [leftText]: rightText };
      setMatched(updated);
      setSelectedLeft(null);
      setSelectedRight(null);

      if (Object.keys(updated).length === normalizedPairs.length) {
        setIsCompleted(true);
        playStarShower();
        onComplete?.(activity.points || 30);
      }
    } else {
      playErrorSound();
      setSelectedLeft(null);
      setSelectedRight(null);
    }
  };

  const handleReset = () => {
    setMatched({});
    setSelectedLeft(null);
    setSelectedRight(null);
    setIsCompleted(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">{safeExtractText(activity.prompt) || 'Match each word with its meaning:'}</p>
        <span className="text-xs px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold">
          {Object.keys(matched).length}/{normalizedPairs.length} Matched
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Left column */}
        <div className="space-y-2.5">
          <p className="text-xs font-black text-slate-500 uppercase tracking-wider text-center">Words</p>
          {normalizedPairs.map(pair => {
            const isMatched = !!matched[pair.left];
            const isSelected = selectedLeft === pair.left;
            return (
              <button
                key={pair.left}
                onClick={() => handleLeftClick(pair.left)}
                disabled={isMatched}
                className={`w-full p-3 rounded-xl font-bold text-sm text-left transition-all border-2 flex items-center justify-between cursor-pointer ${
                  isMatched
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-800 dark:text-emerald-200'
                    : isSelected
                    ? 'bg-purple-100 dark:bg-purple-900/60 border-purple-500 text-purple-900 dark:text-purple-100 shadow-md'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-purple-300'
                }`}
              >
                <span>{pair.leftEmoji} {pair.left}</span>
                {isMatched && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              </button>
            );
          })}
        </div>

        {/* Right column */}
        <div className="space-y-2.5">
          <p className="text-xs font-black text-slate-500 uppercase tracking-wider text-center">Meanings</p>
          {shuffledRights.map(right => {
            const isMatched = Object.values(matched).includes(right);
            const isSelected = selectedRight === right;
            return (
              <button
                key={right}
                onClick={() => handleRightClick(right)}
                disabled={isMatched}
                className={`w-full p-3 rounded-xl font-bold text-sm text-left transition-all border-2 flex items-center justify-between gap-3 cursor-pointer ${
                  isMatched
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-800 dark:text-emerald-200'
                    : isSelected
                    ? 'bg-purple-100 dark:bg-purple-900/60 border-purple-500 text-purple-900 dark:text-purple-100 shadow-md'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-purple-300'
                }`}
              >
                {/* A photograph of the thing, found from the label. This is what makes
                    the pair-matching game a recognition task rather than a reading one:
                    a pre-reader can complete it because the right column is a picture,
                    not a sentence. The text stays as the caption and as the fallback. */}
                <span className="flex items-center gap-3 min-w-0">
                  <KidOptionArt label={right} size={44} />
                  <span className="truncate">{right}</span>
                </span>
                {isMatched && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {isCompleted && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-3.5 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 rounded-2xl flex items-center justify-between"
        >
          <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold text-sm">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <span>{safeExtractText(activity.feedbackCorrect) || 'All matched perfectly!'}</span>
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1 font-bold cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </motion.div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   3. Drag & Drop Sorter Activity (Sort Cards)
   ───────────────────────────────────────────────────────────── */
export const DragDropSortActivity: React.FC<ActivityProps> = ({ activity, onComplete, isCompleted: initialCompleted }) => {
  const rawItems = Array.isArray(activity.items) ? activity.items : ['brave', 'curious', 'discover', 'whisper'];
  const items = rawItems.map(it => safeExtractText(it));

  const rawCategories = Array.isArray(activity.categories) ? activity.categories : [
    { name: 'Actions', emoji: '⚡', items: ['discover', 'whisper'] },
    { name: 'Traits', emoji: '💖', items: ['brave', 'curious'] }
  ];

  const categories = rawCategories.map(c => ({
    name: safeExtractText(c.name),
    emoji: c.emoji || '📁',
    items: Array.isArray(c.items) ? c.items.map(it => safeExtractText(it)) : []
  }));

  const [assigned, setAssigned] = useState<Record<string, string>>({});
  const [isCompleted, setIsCompleted] = useState(initialCompleted || false);
  const [activeItem, setActiveItem] = useState<string | null>(null);

  const handleAssign = (item: string, catName: string) => {
    playClick();
    const updated = { ...assigned, [item]: catName };
    setAssigned(updated);
    setActiveItem(null);

    // Check if all items placed
    if (Object.keys(updated).length === items.length) {
      let allCorrect = true;
      for (const itm of items) {
        const targetCat = categories.find(c => c.items.includes(itm));
        if (targetCat && updated[itm] !== targetCat.name) {
          allCorrect = false;
          break;
        }
      }

      if (allCorrect) {
        setIsCompleted(true);
        playQuestDing();
        playStarShower();
        onComplete?.(activity.points || 30);
      } else {
        playErrorSound();
      }
    }
  };

  const handleReset = () => {
    setAssigned({});
    setIsCompleted(false);
    setActiveItem(null);
  };

  const unassignedItems = items.filter(it => !assigned[it]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">{safeExtractText(activity.prompt) || 'Sort the words into correct categories:'}</p>
        <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
          Tap a word tile, then tap a category box!
        </span>
      </div>

      {/* Unassigned items bank */}
      <div className="p-3.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 min-h-[60px] flex flex-wrap gap-2 items-center">
        {unassignedItems.length === 0 ? (
          <span className="text-lg font-bold text-slate-400">All word cards placed! ✨</span>
        ) : (
          unassignedItems.map(item => (
            <button
              key={item}
              onClick={() => {
                playClick();
                setActiveItem(activeItem === item ? null : item);
              }}
              className={`px-3.5 py-2 rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer ${
                activeItem === item
                  ? 'bg-purple-600 text-white scale-105 ring-2 ring-purple-300'
                  : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600 hover:border-purple-400'
              }`}
            >
              {item}
            </button>
          ))
        )}
      </div>

      {/* Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {categories.map(cat => {
          const placedInCat = items.filter(it => assigned[it] === cat.name);
          return (
            <div
              key={cat.name}
              onClick={() => activeItem && handleAssign(activeItem, cat.name)}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                activeItem
                  ? 'border-purple-400 bg-purple-50/40 dark:bg-purple-950/20 hover:scale-101'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{cat.emoji}</span>
                <span className="font-black text-sm text-slate-800 dark:text-slate-100">{cat.name}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 min-h-[40px]">
                {placedInCat.map(it => (
                  <span
                    key={it}
                    onClick={e => {
                      e.stopPropagation();
                      playClick();
                      const up = { ...assigned };
                      delete up[it];
                      setAssigned(up);
                      setIsCompleted(false);
                    }}
                    className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 rounded-lg text-lg font-bold flex items-center gap-1 hover:bg-rose-100 hover:text-rose-800 cursor-pointer"
                    title="Tap to remove"
                  >
                    {it} ×
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {isCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 rounded-2xl flex items-center justify-between text-emerald-900 dark:text-emerald-200 text-sm font-bold"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <span>{safeExtractText(activity.feedbackCorrect) || 'All categories sorted!'}</span>
          </div>
          <button onClick={handleReset} className="text-xs text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </motion.div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   4. Sentence Builder Activity (Build Sentence)
   ───────────────────────────────────────────────────────────── */
export const SentenceBuilderActivity: React.FC<ActivityProps> = ({ activity, onComplete, isCompleted: initialCompleted }) => {
  const rawOrder = activity.correctOrder || activity.items || ['I', 'discover', 'a', 'glowing', 'crystal.'];
  const correctOrder = rawOrder.map(w => safeExtractText(w));

  const [pool, setPool] = useState<string[]>([]);
  const [placed, setPlaced] = useState<string[]>([]);
  const [isAnswered, setIsAnswered] = useState(initialCompleted || false);
  const [isCorrect, setIsCorrect] = useState(initialCompleted || false);

  useEffect(() => {
    const scrambled = [...correctOrder].sort(() => Math.random() - 0.5);
    setPool(scrambled);
  }, [activity]);

  const handleTileClick = (word: string, index: number) => {
    if (isAnswered) return;
    playClick();
    const newPool = [...pool];
    newPool.splice(index, 1);
    setPool(newPool);
    setPlaced([...placed, word]);
  };

  const handlePlacedClick = (word: string, index: number) => {
    if (isAnswered) return;
    playClick();
    const newPlaced = [...placed];
    newPlaced.splice(index, 1);
    setPlaced(newPlaced);
    setPool([...pool, word]);
  };

  const handleCheck = () => {
    const isMatched = placed.join(' ').trim().toLowerCase() === correctOrder.join(' ').trim().toLowerCase();
    setIsAnswered(true);
    setIsCorrect(isMatched);

    if (isMatched) {
      playQuestDing();
      playStarShower();
      onComplete?.(activity.points || 30);
    } else {
      playErrorSound();
    }
  };

  const handleReset = () => {
    const scrambled = [...correctOrder].sort(() => Math.random() - 0.5);
    setPool(scrambled);
    setPlaced([]);
    setIsAnswered(false);
    setIsCorrect(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">{safeExtractText(activity.prompt) || 'Arrange the words in correct order:'}</p>
        <button
          onClick={() => speakText(correctOrder.join(' '))}
          className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 cursor-pointer"
          title="Hear Correct Sentence"
        >
          <Volume2 className="w-4 h-4" />
        </button>
      </div>

      {/* Target sentence slot */}
      <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-purple-200 dark:border-slate-700 min-h-[64px] flex flex-wrap gap-2 items-center">
        {placed.length === 0 ? (
          <span className="text-lg font-bold text-slate-400">Tap word tiles below to assemble your sentence...</span>
        ) : (
          placed.map((word, idx) => (
            <motion.button
              key={`${word}-${idx}`}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              onClick={() => handlePlacedClick(word, idx)}
              className="px-3.5 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:brightness-110 cursor-pointer"
            >
              {word}
            </motion.button>
          ))
        )}
      </div>

      {/* Available words bank */}
      <div className="flex flex-wrap gap-2">
        {pool.map((word, idx) => (
          <button
            key={`${word}-${idx}`}
            onClick={() => handleTileClick(word, idx)}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-sm font-bold border border-slate-300 dark:border-slate-600 hover:border-purple-400 cursor-pointer"
          >
            {word}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={handleCheck}
          disabled={placed.length === 0 || isAnswered}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl text-sm shadow-md hover:brightness-110 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
        >
          <Check className="w-4 h-4" /> Check Sentence
        </button>
        <button
          onClick={handleReset}
          className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm flex items-center gap-1 hover:bg-slate-300 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" /> Clear
        </button>
      </div>

      {isAnswered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`p-3.5 rounded-2xl text-sm font-bold flex items-center justify-between ${
            isCorrect
              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-300'
              : 'bg-rose-100 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border border-rose-300'
          }`}
        >
          <span>{isCorrect ? (safeExtractText(activity.feedbackCorrect) || 'Well done!') : (safeExtractText(activity.feedbackIncorrect) || 'Order is not quite right.')}</span>
          {!isCorrect && (
            <button onClick={handleReset} className="text-xs text-rose-700 dark:text-rose-300 hover:underline cursor-pointer">
              Try Again
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   5. Fill in the Blank Activity (Fill Blanks)
   ───────────────────────────────────────────────────────────── */
export const FillBlankActivity: React.FC<ActivityProps> = ({ activity, onComplete, isCompleted: initialCompleted }) => {
  const rawBlanks = Array.isArray(activity.blanks) && activity.blanks.length > 0
    ? activity.blanks
    : [
        { sentence: 'Countess Vespera is ___ about the ancient map.', answer: 'curious', choices: ['curious', 'sleepy', 'loud'] }
      ];

  const blanks = rawBlanks.map(b => ({
    sentence: safeExtractText(b.sentence),
    answer: safeExtractText(b.answer),
    choices: Array.isArray(b.choices) ? b.choices.map(c => safeExtractText(c)) : ['curious', 'brave']
  }));

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isAnswered, setIsAnswered] = useState(initialCompleted || false);
  const [isCorrect, setIsCorrect] = useState(initialCompleted || false);

  const handleSelect = (blankIdx: number, choice: string) => {
    playClick();
    const updated = { ...answers, [blankIdx]: choice };
    setAnswers(updated);

    if (Object.keys(updated).length === blanks.length) {
      let correct = true;
      blanks.forEach((b, idx) => {
        if (updated[idx]?.trim().toLowerCase() !== b.answer.trim().toLowerCase()) {
          correct = false;
        }
      });
      setIsAnswered(true);
      setIsCorrect(correct);
      if (correct) {
        playQuestDing();
        playStarShower();
        onComplete?.(activity.points || 30);
      } else {
        playErrorSound();
      }
    }
  };

  const handleReset = () => {
    setAnswers({});
    setIsAnswered(false);
    setIsCorrect(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">{safeExtractText(activity.prompt) || 'Fill in the blanks with target words:'}</p>

      <div className="space-y-3">
        {blanks.map((b, idx) => {
          const parts = b.sentence.split('___');
          const currentVal = answers[idx];

          return (
            <div key={idx} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 space-y-3">
              <p className="text-sm sm:text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">
                {parts[0]}
                <span className="inline-block px-3 py-1 bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-200 rounded-xl font-black mx-1 border border-purple-300">
                  {currentVal || '______'}
                </span>
                {parts[1] || ''}
              </p>

              <div className="flex flex-wrap gap-2">
                {b.choices.map(choice => (
                  <button
                    key={choice}
                    onClick={() => handleSelect(idx, choice)}
                    className={`px-3 py-1.5 rounded-xl text-lg font-bold border transition-all cursor-pointer ${
                      currentVal === choice
                        ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                        : 'bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:border-purple-300'
                    }`}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {isAnswered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`p-3.5 rounded-2xl text-sm font-bold flex items-center justify-between ${
            isCorrect
              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-300'
              : 'bg-rose-100 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border border-rose-300'
          }`}
        >
          <span>{isCorrect ? (safeExtractText(activity.feedbackCorrect) || 'Excellent cloze mastery!') : (safeExtractText(activity.feedbackIncorrect) || 'Review the clues!')}</span>
          {!isCorrect && (
            <button onClick={handleReset} className="text-xs text-rose-700 dark:text-rose-300 hover:underline cursor-pointer">
              Try Again
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   6. Listen & Choose Activity (Listen & Choose)
   ───────────────────────────────────────────────────────────── */
export const ListenChooseActivity: React.FC<ActivityProps> = ({ activity, onComplete, isCompleted: initialCompleted }) => {
  const rawOptions = Array.isArray(activity.options) ? activity.options : ['whisper', 'whistle', 'winner'];
  const options = rawOptions.map(o => safeExtractText(o));
  const correct = safeExtractText(activity.correct || options[0] || 'whisper');

  const [selected, setSelected] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(initialCompleted || false);
  const [isCorrect, setIsCorrect] = useState(initialCompleted || false);

  const handlePlayAudio = () => {
    playClick();
    speakText(safeExtractText(activity.readAloudText) || correct, activity.characterSpeaker, 1.0, 0.9);
  };

  const handleSelect = (opt: string) => {
    if (isAnswered) return;
    playClick();
    setSelected(opt);
    const isMatched = opt.trim().toLowerCase() === correct.trim().toLowerCase();
    setIsAnswered(true);
    setIsCorrect(isMatched);

    if (isMatched) {
      playQuestDing();
      playStarShower();
      onComplete?.(activity.points || 30);
    } else {
      playErrorSound();
    }
  };

  const handleReset = () => {
    setSelected(null);
    setIsAnswered(false);
    setIsCorrect(false);
  };

  return (
    <div className="space-y-4 text-center">
      <p className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">{safeExtractText(activity.prompt) || 'Listen carefully and choose the correct word:'}</p>

      {/* Big Audio Trigger */}
      <div className="flex justify-center">
        <button
          onClick={handlePlayAudio}
          className="px-6 py-4 rounded-3xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black text-base shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 cursor-pointer"
        >
          <Volume2 className="w-6 h-6 animate-pulse" />
          <span>Tap to Listen 🔊</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        {options.map((opt, idx) => {
          let style = 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-purple-400';
          if (isAnswered) {
            if (opt.trim().toLowerCase() === correct.trim().toLowerCase()) {
              style = 'bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 text-emerald-900 dark:text-emerald-200';
            } else if (selected === opt) {
              style = 'bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-400 text-rose-900 dark:text-rose-200';
            } else {
              style = 'opacity-50 border-slate-200';
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(opt)}
              disabled={isAnswered}
              className={`p-3.5 rounded-2xl font-bold text-base transition-all transform active:scale-98 cursor-pointer flex flex-col items-center gap-2 ${style}`}
            >
              {/* This is the screen a 3-year-old is asked to point at, so it is
                  the screen that most needs a real photograph. "🐮 cow" becomes a
                  photograph of a cow, with the emoji underneath as both the
                  fallback and the alt text. Nothing else changes about the task:
                  the child still hears a word and points at the thing. */}
              <KidOptionArt label={opt} size={80} />
              <span className="text-base">{opt}</span>
            </button>
          );
        })}
      </div>

      {isAnswered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`p-3.5 rounded-2xl text-sm font-bold flex items-center justify-between ${
            isCorrect
              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-300'
              : 'bg-rose-100 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border border-rose-300'
          }`}
        >
          <span>{isCorrect ? (safeExtractText(activity.feedbackCorrect) || 'Great listening ears!') : (safeExtractText(activity.feedbackIncorrect) || 'Listen once more!')}</span>
          {!isCorrect && (
            <button onClick={handleReset} className="text-xs text-rose-700 dark:text-rose-300 hover:underline cursor-pointer">
              Try Again
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   7. Speak & Pronounce Activity (Speak Repeat)
   ───────────────────────────────────────────────────────────── */
export const SpeakRepeatActivity: React.FC<ActivityProps> = ({ activity, onComplete, isCompleted: initialCompleted }) => {
  const targetText = safeExtractText(activity.readAloudText || activity.prompt || 'I am curious and brave today!');
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [score, setScore] = useState<number | null>(initialCompleted ? 100 : null);
  const [isCompleted, setIsCompleted] = useState(initialCompleted || false);

  const handleListenModel = () => {
    playClick();
    speakText(targetText, activity.characterSpeaker, 1.1, 0.95);
  };

  const handleStartSpeech = () => {
    playClick();
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Fallback if browser doesn't support Web Speech API
      setSpokenText(targetText);
      setScore(95);
      setIsCompleted(true);
      playQuestDing();
      playStarShower();
      onComplete?.(activity.points || 30);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsListening(true);
      recognition.start();

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSpokenText(transcript);
        setIsListening(false);

        const targetClean = targetText.toLowerCase().replace(/[^a-z0-9]/g, '');
        const transClean = transcript.toLowerCase().replace(/[^a-z0-9]/g, '');
        const match = targetClean === transClean || targetClean.includes(transClean) || transClean.includes(targetClean);
        const calcScore = match ? 100 : Math.max(65, Math.floor(Math.random() * 25) + 70);

        setScore(calcScore);
        if (calcScore >= 70) {
          setIsCompleted(true);
          playQuestDing();
          playStarShower();
          onComplete?.(activity.points || 30);
        } else {
          playErrorSound();
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    } catch {
      setIsListening(false);
    }
  };

  return (
    <div className="space-y-4 text-center">
      <p className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">{safeExtractText(activity.prompt) || 'Say the phrase aloud clearly:'}</p>

      {/* Target Phrase Banner */}
      <div className="p-4 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border-2 border-purple-200 dark:border-purple-800">
        <p className="text-lg font-black text-purple-900 dark:text-purple-100">"{targetText}"</p>
        <button
          onClick={handleListenModel}
          className="mt-2 text-lg font-bold text-purple-700 dark:text-purple-300 hover:underline flex items-center gap-1 mx-auto cursor-pointer"
        >
          <Volume2 className="w-3.5 h-3.5" /> Hear the word
        </button>
      </div>

      {/* Mic Button */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={handleStartSpeech}
          disabled={isListening}
          className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-transform cursor-pointer ${
            isListening
              ? 'bg-rose-500 animate-pulse scale-110 ring-4 ring-rose-300'
              : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:scale-105 active:scale-95'
          }`}
        >
          <Mic className="w-8 h-8" />
        </button>
        <span className="text-lg font-bold text-slate-500">
          {isListening ? 'Listening... Speak now!' : 'Tap Mic & Say Aloud'}
        </span>
      </div>

      {spokenText && (
        <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 text-lg font-bold">
          <span className="text-slate-500">You said: </span>
          <span className="text-slate-800 dark:text-slate-100">"{spokenText}"</span>
        </div>
      )}

      {score !== null && (
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className={`p-3.5 rounded-2xl font-bold text-sm ${
            score >= 70
              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-300'
              : 'bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <span>Your speaking score: {score}% — {score >= 70 ? (safeExtractText(activity.feedbackCorrect) || 'Great speaking!') : 'Keep practicing!'}</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   8. 3D Memory Match Activity (Memory Match with Power-Ups)
   ───────────────────────────────────────────────────────────── */
export const MemoryMatchActivity: React.FC<ActivityProps> = ({ activity, onComplete, isCompleted: initialCompleted }) => {
  const rawPairs = Array.isArray(activity.pairs) && activity.pairs.length > 0
    ? activity.pairs
    : [
        { left: '💎 Crystal', right: 'Glowing Rock' },
        { left: '🗺️ Discover', right: 'Find Something' },
        { left: '🛡️ Brave', right: 'Not Afraid' }
      ];

  const normalizedPairs = rawPairs.map((p: any) => ({
    left: safeExtractText(p.left || p.word),
    right: safeExtractText(p.right || p.meaning)
  }));

  interface Card {
    id: number;
    text: string;
    pairId: number;
  }

  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isCompleted, setIsCompleted] = useState(initialCompleted || false);
  const [magicEyeActive, setMagicEyeActive] = useState(false);
  const [magicEyeUsed, setMagicEyeUsed] = useState(false);
  const [lightningUsed, setLightningUsed] = useState(false);
  const [doubleXpActive, setDoubleXpActive] = useState(false);

  useEffect(() => {
    const list: Card[] = [];
    normalizedPairs.forEach((p, idx) => {
      list.push({ id: idx * 2, text: p.left, pairId: idx });
      list.push({ id: idx * 2 + 1, text: p.right, pairId: idx });
    });
    setCards(list.sort(() => Math.random() - 0.5));
  }, [activity]);

  const handleCardClick = (card: Card) => {
    if (magicEyeActive || flipped.length === 2 || flipped.includes(card.id) || matched.includes(card.id)) return;
    playClick();

    const newFlipped = [...flipped, card.id];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const card1 = cards.find(c => c.id === newFlipped[0]);
      const card2 = cards.find(c => c.id === newFlipped[1]);

      if (card1 && card2 && card1.pairId === card2.pairId) {
        playQuestDing();
        const updatedMatched = [...matched, card1.id, card2.id];
        setMatched(updatedMatched);
        setFlipped([]);

        if (updatedMatched.length === cards.length) {
          setIsCompleted(true);
          playStarShower();
          const basePts = activity.points || 30;
          onComplete?.(doubleXpActive ? basePts * 2 : basePts);
        }
      } else {
        setTimeout(() => {
          setFlipped([]);
        }, 1000);
      }
    }
  };

  // Power Up 1: Magic Eye (Reveal all cards for 2.5s)
  const useMagicEye = () => {
    if (magicEyeUsed || isCompleted) return;
    playMagicEyeSpell();
    setMagicEyeUsed(true);
    setMagicEyeActive(true);
    setTimeout(() => {
      setMagicEyeActive(false);
    }, 2500);
  };

  // Power Up 2: Lightning Zap (Instantly match 1 random pair)
  const useLightningZap = () => {
    if (lightningUsed || isCompleted) return;
    const unmatchedPairIds = Array.from(new Set(cards.filter(c => !matched.includes(c.id)).map(c => c.pairId)));
    if (unmatchedPairIds.length === 0) return;
    playLightningZap();
    setLightningUsed(true);
    const targetPairId = unmatchedPairIds[0];
    const pairCardIds = cards.filter(c => c.pairId === targetPairId).map(c => c.id);
    const updatedMatched = [...matched, ...pairCardIds];
    setMatched(updatedMatched);
    setFlipped([]);

    if (updatedMatched.length === cards.length) {
      setIsCompleted(true);
      playStarShower();
      const basePts = activity.points || 30;
      onComplete?.(doubleXpActive ? basePts * 2 : basePts);
    }
  };

  const handleReset = () => {
    const list: Card[] = [];
    normalizedPairs.forEach((p, idx) => {
      list.push({ id: idx * 2, text: p.left, pairId: idx });
      list.push({ id: idx * 2 + 1, text: p.right, pairId: idx });
    });
    setCards(list.sort(() => Math.random() - 0.5));
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setIsCompleted(false);
    setMagicEyeUsed(false);
    setMagicEyeActive(false);
    setLightningUsed(false);
  };

  return (
    <div className="space-y-4">
      {/* Header with Moves and Score */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">{safeExtractText(activity.prompt) || 'Flip and find matching pairs:'}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-full font-bold">
            Moves: {moves} | Matched: {matched.length / 2}/{normalizedPairs.length}
          </span>
          {doubleXpActive && (
            <span className="text-xs px-2 py-0.5 bg-amber-400 text-slate-950 font-black rounded-full animate-bounce">
              ⚡ 2X XP Active!
            </span>
          )}
        </div>
      </div>

      {/* Hero Power-Up Toolbar */}
      <div className="p-2.5 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-slate-800 dark:to-purple-950/40 rounded-2xl border-2 border-purple-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-black text-purple-950 dark:text-purple-200">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Hero Power-Ups:</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={useMagicEye}
            disabled={magicEyeUsed || isCompleted}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              magicEyeUsed
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md hover:scale-105 active:scale-95'
            }`}
            title="Reveal all cards for 2.5 seconds"
          >
            <span>👁️ Magic Eye</span>
            {magicEyeActive && <span className="animate-ping text-[10px]">✨</span>}
          </button>

          <button
            onClick={useLightningZap}
            disabled={lightningUsed || isCompleted}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              lightningUsed
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:scale-105 active:scale-95'
            }`}
            title="Instantly solve 1 pair"
          >
            <span>⚡ Lightning Match</span>
          </button>

          <button
            onClick={() => {
              playQuestDing();
              setDoubleXpActive(!doubleXpActive);
            }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
              doubleXpActive
                ? 'bg-amber-400 text-slate-950 shadow-inner ring-2 ring-amber-500'
                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-amber-50'
            }`}
          >
            <span>🌟 2X Booster</span>
          </button>
        </div>
      </div>

      {/* 3D Upright Card Grid (No mirrored/flipped text) */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
        {cards.map(card => {
          const isRevealed = magicEyeActive || flipped.includes(card.id) || matched.includes(card.id);
          const isDone = matched.includes(card.id);

          return (
            <motion.div
              key={card.id}
              onClick={() => handleCardClick(card)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              className="h-24 sm:h-28 rounded-2xl cursor-pointer select-none"
            >
              <div
                className={`w-full h-full rounded-2xl border-2 flex items-center justify-center p-2 text-center text-xs sm:text-sm font-black shadow-md transition-all duration-300 ${
                  isRevealed
                    ? isDone
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-900 dark:text-emerald-100 shadow-emerald-500/20'
                      : 'bg-white dark:bg-slate-800 border-purple-500 text-purple-950 dark:text-purple-100 ring-2 ring-purple-400 shadow-purple-500/20'
                    : 'bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 border-purple-300 text-white hover:brightness-110'
                }`}
              >
                {isRevealed ? (
                  <motion.div
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center justify-center w-full h-full"
                  >
                    <span className="leading-snug break-words">{card.text}</span>
                    {isDone && <span className="text-xs text-emerald-500 mt-0.5">✓</span>}
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 opacity-75">
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-purple-200">Flip</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {isCompleted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-emerald-100 dark:bg-emerald-950/50 border-2 border-emerald-400 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-emerald-950 dark:text-emerald-200 text-sm font-bold shadow-lg"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🏆✨</span>
            <div>
              <p className="font-black text-emerald-900 dark:text-emerald-100">
                {safeExtractText(activity.feedbackCorrect) || 'Memory Master! You matched all pairs!'}
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Completed in {moves} moves • +{doubleXpActive ? (activity.points || 30) * 2 : (activity.points || 30)} XP earned!
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow-md transition-all cursor-pointer"
          >
            Play Again 🔄
          </button>
        </motion.div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   9. True / False Activity (True/False)
   ───────────────────────────────────────────────────────────── */
export const TrueFalseActivity: React.FC<ActivityProps> = ({ activity, onComplete, isCompleted: initialCompleted }) => {
  const [selected, setSelected] = useState<boolean | null>(null);
  const [isAnswered, setIsAnswered] = useState(initialCompleted || false);
  const [isCorrect, setIsCorrect] = useState(initialCompleted || false);

  const correctBool = Boolean(activity.correct);

  const handleChoose = (choice: boolean) => {
    if (isAnswered) return;
    playClick();
    setSelected(choice);
    const isMatched = choice === correctBool;
    setIsAnswered(true);
    setIsCorrect(isMatched);

    if (isMatched) {
      playQuestDing();
      playStarShower();
      onComplete?.(activity.points || 20);
    } else {
      playErrorSound();
    }
  };

  const handleReset = () => {
    setSelected(null);
    setIsAnswered(false);
    setIsCorrect(false);
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-2xl border-2 border-purple-200 dark:border-purple-800">
        <p className="text-base sm:text-lg font-black text-purple-900 dark:text-purple-100">"{safeExtractText(activity.prompt)}"</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleChoose(true)}
          disabled={isAnswered}
          className={`p-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isAnswered
              ? correctBool === true
                ? 'bg-emerald-500 text-white shadow-lg ring-4 ring-emerald-300'
                : selected === true
                ? 'bg-rose-400 text-white opacity-80'
                : 'opacity-40 bg-slate-200'
              : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md active:scale-95'
          }`}
        >
          <Check className="w-6 h-6" /> TRUE
        </button>

        <button
          onClick={() => handleChoose(false)}
          disabled={isAnswered}
          className={`p-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isAnswered
              ? correctBool === false
                ? 'bg-rose-500 text-white shadow-lg ring-4 ring-rose-300'
                : selected === false
                ? 'bg-rose-400 text-white opacity-80'
                : 'opacity-40 bg-slate-200'
              : 'bg-rose-500 hover:bg-rose-600 text-white shadow-md active:scale-95'
          }`}
        >
          <XCircle className="w-6 h-6" /> FALSE
        </button>
      </div>

      {isAnswered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`p-3.5 rounded-2xl text-sm font-bold flex items-center justify-between ${
            isCorrect
              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-300'
              : 'bg-rose-100 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border border-rose-300'
          }`}
        >
          <span>{isCorrect ? (safeExtractText(activity.feedbackCorrect) || 'Correct fact verification!') : (safeExtractText(activity.feedbackIncorrect) || 'Check the story clues again!')}</span>
          {!isCorrect && (
            <button onClick={handleReset} className="text-xs text-rose-700 dark:text-rose-300 hover:underline cursor-pointer">
              Try Again
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   10. Word Order Race Activity (Word Race: Right-to-Left + Competitors)
   ───────────────────────────────────────────────────────────── */
export const WordOrderRaceActivity: React.FC<ActivityProps> = ({ activity, onComplete, isCompleted: initialCompleted }) => {
  const rawOrder = activity.correctOrder || activity.items || ['Diego', 'is', 'a', 'brave', 'explorer.'];
  const correctOrder = rawOrder.map(w => safeExtractText(w));

  const [scrambled, setScrambled] = useState<string[]>([]);
  const [placed, setPlaced] = useState<string[]>([]);
  const [heroProgress, setHeroProgress] = useState(0); // 0% to 100%
  const [isCompleted, setIsCompleted] = useState(initialCompleted || false);
  const [isNitro, setIsNitro] = useState(false);

  // Fake AI Rival Competitors Progress (0% to 100%)
  const [competitors, setCompetitors] = useState([
    { id: 'robo', name: '🤖 Robo-Racer', emoji: '🏎️', progress: 10, speed: 0.8 },
    { id: 'dragon', name: '🐲 Shadow-Dragon', emoji: '🐉', progress: 15, speed: 0.9 },
    { id: 'blitz', name: '⚡ Blitz-Bot', emoji: '🚗', progress: 8, speed: 0.7 }
  ]);

  useEffect(() => {
    setScrambled([...correctOrder].sort(() => Math.random() - 0.5));
  }, [activity]);

  // Dynamic interval for AI rival competitors advancing
  useEffect(() => {
    if (isCompleted) return;
    const interval = setInterval(() => {
      setCompetitors(prev =>
        prev.map(c => {
          if (c.progress >= 90) return c; // don't let rivals finish completely before user has a chance
          const increment = (Math.random() * 2 + 0.5) * c.speed;
          return { ...c, progress: Math.min(88, c.progress + increment) };
        })
      );
    }, 800);
    return () => clearInterval(interval);
  }, [isCompleted]);

  const handleTileClick = (word: string) => {
    if (isCompleted) return;
    const nextExpected = correctOrder[placed.length];
    if (word.trim().toLowerCase() === nextExpected?.trim().toLowerCase()) {
      playEngineRev();
      playNitroBoost();
      setIsNitro(true);
      setTimeout(() => setIsNitro(false), 600);

      const newPlaced = [...placed, word];
      setPlaced(newPlaced);
      const newScrambled = [...scrambled];
      newScrambled.splice(newScrambled.indexOf(word), 1);
      setScrambled(newScrambled);
      const pct = (newPlaced.length / correctOrder.length) * 100;
      setHeroProgress(pct);

      if (newPlaced.length === correctOrder.length) {
        setIsCompleted(true);
        playTrophyUnlock();
        playStarShower();
        onComplete?.(activity.points || 35);
      }
    } else {
      playTireScreech();
      playErrorSound();
    }
  };

  const handleReset = () => {
    setScrambled([...correctOrder].sort(() => Math.random() - 0.5));
    setPlaced([]);
    setHeroProgress(0);
    setIsCompleted(false);
    setCompetitors([
      { id: 'robo', name: '🤖 Robo-Racer', emoji: '🏎️', progress: 10, speed: 0.8 },
      { id: 'dragon', name: '🐲 Shadow-Dragon', emoji: '🐉', progress: 15, speed: 0.9 },
      { id: 'blitz', name: '⚡ Blitz-Bot', emoji: '🚗', progress: 8, speed: 0.7 }
    ]);
  };

  // Calculate current rank (1st, 2nd, 3rd, 4th)
  const isFirst = heroProgress >= Math.max(...competitors.map(c => c.progress));

  return (
    <div className="space-y-4">
      {/* Header with Title and Live Position */}
      <div className="flex items-center justify-between">
        <p className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">
          {safeExtractText(activity.prompt) || 'Race to tap words in speed sequence:'}
        </p>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-black flex items-center gap-1 ${
            isFirst ? 'bg-amber-400 text-slate-950 shadow-md animate-pulse' : 'bg-red-100 text-red-700'
          }`}>
            {isFirst ? '🥇 1st Place (Leading!)' : '🏎️ In the Race'}
          </span>
          <span className="text-lg font-bold text-red-500 flex items-center gap-1">
            <Flame className="w-4 h-4 fill-red-500" /> Nitro Speed
          </span>
        </div>
      </div>

      {/* ── MULTI-LANE RACE TRACK (RIGHT-TO-LEFT) ── */}
      <div className="p-3 bg-slate-900 rounded-3xl border-4 border-slate-700 shadow-2xl relative overflow-hidden space-y-2">
        {/* Track Headers: Finish Line on LEFT, Start Line on RIGHT */}
        <div className="flex items-center justify-between text-xs font-black text-white px-2 border-b border-slate-700/60 pb-1">
          <div className="flex items-center gap-1 text-amber-300">
            <span className="text-base">🏆</span>
            <span className="uppercase tracking-wider">FINISH LINE 🚩</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <span className="uppercase tracking-wider">START LINE</span>
            <span className="text-base">🏁</span>
          </div>
        </div>

        {/* Lane 1: Hero Car (User) */}
        <div className="relative h-12 bg-slate-800/90 rounded-2xl border border-amber-400/50 flex items-center px-2 overflow-hidden shadow-inner">
          {/* Track speed lines moving right-to-left */}
          <div className="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(90deg,#fff_0px,#fff_20px,transparent_20px,transparent_40px)]" />

          {/* Hero Nitro Boost Aura */}
          <div
            className="absolute top-0 bottom-0 right-0 bg-gradient-to-l from-amber-500/20 via-red-500/30 to-transparent transition-all duration-300"
            style={{ width: `${heroProgress}%` }}
          />

          {/* Left Finish Marker */}
          <div className="absolute left-2 z-10 text-lg">🏁</div>

          {/* Hero Racer Car (Moves from RIGHT to LEFT) */}
          <motion.div
            className="absolute z-20 flex items-center gap-1 select-none"
            style={{
              right: `calc(${heroProgress}% * 0.85 + 8px)`,
            }}
            animate={isNitro ? { scale: [1, 1.2, 1], y: [0, -2, 0] } : {}}
            transition={{ duration: 0.2 }}
          >
            {isNitro && <span className="text-xs font-black text-amber-300 animate-pulse">🔥NITRO</span>}
            <span className="text-2xl drop-shadow-md">🏎️💨</span>
            <span className="px-1.5 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] rounded-md shadow-xs">
              HERO
            </span>
          </motion.div>

          {/* Right Start Marker */}
          <div className="absolute right-2 z-10 text-sm opacity-40">🚦</div>
        </div>

        {/* Lanes 2, 3, 4: AI Rival Competitors */}
        {competitors.map((comp) => (
          <div
            key={comp.id}
            className="relative h-8 bg-slate-800/40 rounded-xl border border-slate-700/50 flex items-center px-2 overflow-hidden"
          >
            <div className="absolute left-2 z-10 text-xs opacity-50">🏁</div>

            {/* Competitor Car (Moves Right to Left) */}
            <div
              className="absolute z-20 flex items-center gap-1 transition-all duration-500 select-none"
              style={{
                right: `calc(${comp.progress}% * 0.85 + 8px)`
              }}
            >
              <span className="text-lg">{comp.emoji}</span>
              <span className="text-[9px] font-bold text-slate-400 truncate max-w-[80px]">
                {comp.name}
              </span>
            </div>

            <div className="absolute right-2 z-10 text-xs opacity-20">🚦</div>
          </div>
        ))}
      </div>

      {/* Target Word Sequence (Placed so far) */}
      <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 min-h-[52px] flex flex-wrap gap-2 items-center">
        <span className="text-xs font-black text-slate-400 mr-1 uppercase">Sentence:</span>
        {placed.length === 0 ? (
          <span className="text-xs text-slate-400 italic">Tap the word cards below in correct sentence order...</span>
        ) : (
          placed.map((w, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-xs sm:text-sm font-black shadow-sm"
            >
              {w}
            </motion.span>
          ))
        )}
      </div>

      {/* Scrambled Word Cards to Tap */}
      <div className="flex flex-wrap gap-2.5 pt-1">
        {scrambled.map((word, idx) => (
          <button
            key={idx}
            onClick={() => handleTileClick(word)}
            className="px-4 py-2.5 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 text-white rounded-2xl font-black text-sm shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>{word}</span>
          </button>
        ))}
      </div>

      {/* Race Finished Celebration */}
      {isCompleted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl font-bold"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏆🏁</span>
            <div>
              <p className="font-black text-base">
                {safeExtractText(activity.feedbackCorrect) || '1ST PLACE VICTORY! Speed Champion!'}
              </p>
              <p className="text-xs text-slate-900 font-semibold">
                You crossed the finish line first with a perfect sentence sequence! (+{activity.points || 35} XP)
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-slate-950 text-white font-black rounded-xl text-xs shadow-md hover:bg-slate-800 transition-all cursor-pointer"
          >
            Race Again 🏎️
          </button>
        </motion.div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   11. Choose a story path (Choose Adventure)
   ───────────────────────────────────────────────────────────── */
export const StoryChoiceActivity: React.FC<ActivityProps> = ({ activity, onComplete, isCompleted: initialCompleted }) => {
  const rawChoices = Array.isArray(activity.storyChoices) && activity.storyChoices.length > 0
    ? activity.storyChoices
    : [
        { choice: 'Whisper the magic word into the keyhole', outcome: 'The crystal door opens with golden light!', best: true },
        { choice: 'Try to force the heavy stone door', outcome: 'The door is too heavy to move.', best: false }
      ];

  const choices = rawChoices.map(c => ({
    choice: safeExtractText(c.choice || c.option || c.text),
    outcome: safeExtractText(c.outcome || c.result),
    nextPlot: safeExtractText(c.nextPlot || ''),
    best: Boolean(c.best),
    bonusXp: typeof c.bonusXp === 'number' ? c.bonusXp : 0
  }));

  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);

  const handleSelect = (idx: number) => {
    playClick();
    setSelectedChoice(idx);
    const chosen = choices[idx];
    if (chosen.best) {
      playQuestDing();
      playStarShower();
      onComplete?.((activity.points || 30) + (chosen.bonusXp || 0));
    } else {
      playCoinClink();
      onComplete?.(Math.floor((activity.points || 30) * 0.7));
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">{safeExtractText(activity.prompt) || 'Choose what happens next:'}</p>

      <div className="space-y-2.5">
        {choices.map((c, idx) => {
          const isSelected = selectedChoice === idx;
          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              className={`w-full p-4 rounded-2xl font-bold text-left text-sm transition-all border-2 flex items-start gap-3 cursor-pointer ${
                isSelected
                  ? 'bg-purple-100 dark:bg-purple-950/60 border-purple-500 text-purple-900 dark:text-purple-100 shadow-md ring-2 ring-purple-300'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-purple-300'
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <div className="flex-1">
                <p className="text-slate-800 dark:text-slate-100 font-bold">{c.choice}</p>
                {isSelected && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 text-xs font-semibold text-purple-700 dark:text-purple-300">
                    <p>✨ <strong>Outcome:</strong> {c.outcome}</p>
                    {c.nextPlot && <p className="mt-1 opacity-90">{c.nextPlot}</p>}
                  </motion.div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   12. Song Karaoke Activity (Song Karaoke)
   ───────────────────────────────────────────────────────────── */
export const SongKaraokeActivity: React.FC<ActivityProps> = ({ activity, onComplete }) => {
  const rawLyrics = Array.isArray(activity.lyrics) ? activity.lyrics : [
    'I am curious, I ask why, 🌟',
    'I am brave, I touch the sky! 🛡️',
    'With my friends I walk the way, 👫',
    'We discover words today! 💎'
  ];
  const lyrics = rawLyrics.map(l => safeExtractText(l));

  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);

  const handleSingLine = (index: number) => {
    playClick();
    setActiveLine(index);
    speakText(lyrics[index], undefined, 1.2, 0.95);
  };

  const handleSingAll = () => {
    playClick();
    setIsPlayingAll(true);
    let curr = 0;

    const playNext = () => {
      if (curr >= lyrics.length) {
        setIsPlayingAll(false);
        setActiveLine(null);
        playTrophyUnlock();
        onComplete?.(activity.points || 30);
        return;
      }
      setActiveLine(curr);
      speakText(lyrics[curr], undefined, 1.2, 0.95);
      curr++;
      setTimeout(playNext, 2200);
    };

    playNext();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">{safeExtractText(activity.prompt) || 'Sing along with the melody:'}</p>
        <button
          onClick={handleSingAll}
          disabled={isPlayingAll}
          className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
        >
          <Play className="w-3.5 h-3.5" /> Play Full Song 🎶
        </button>
      </div>

      <div className="space-y-2">
        {lyrics.map((line, idx) => {
          const isActive = activeLine === idx;
          return (
            <button
              key={idx}
              onClick={() => handleSingLine(idx)}
              className={`w-full p-3.5 rounded-2xl text-left font-black text-sm sm:text-base transition-all border-2 flex items-center justify-between cursor-pointer ${
                isActive
                  ? 'bg-pink-100 dark:bg-pink-950/60 border-pink-500 text-pink-950 dark:text-pink-100 scale-102 shadow-lg ring-2 ring-pink-300'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-pink-300'
              }`}
            >
              <span>{line}</span>
              <Volume2 className={`w-4 h-4 ${isActive ? 'text-pink-600 animate-bounce' : 'text-slate-400'}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   13. Writing Game (Writing Mission)
   ───────────────────────────────────────────────────────────── */
export const WritingMissionActivity: React.FC<ActivityProps> = ({ activity, onComplete, isCompleted: initialCompleted }) => {
  const rawFrames = Array.isArray(activity.sentenceFrames) ? activity.sentenceFrames : ['Today we discovered a ___ in the cave.', 'My friend was very ___ today.'];
  const frames = rawFrames.map(f => safeExtractText(f));

  const rawWordBank = Array.isArray(activity.wordBank) ? activity.wordBank : ['crystal', 'discover', 'brave', 'curious', 'whisper'];
  const wordBank = rawWordBank.map(w => safeExtractText(w));

  const [text, setText] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(initialCompleted || false);

  const handleStarterClick = (frame: string) => {
    playClick();
    setText(prev => (prev ? `${prev} ${frame}` : frame));
  };

  const handleWordClick = (word: string) => {
    playClick();
    setText(prev => (prev ? `${prev} ${word}` : word));
  };

  const handleSubmit = () => {
    if (!text.trim()) return;
    playQuestDing();
    playStarShower();
    setIsSubmitted(true);
    onComplete?.(activity.points || 35);
  };

  return (
    <div className="space-y-4">
      <p className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">{safeExtractText(activity.prompt) || 'Write your magical mission story:'}</p>

      {/* Sentence starter pills */}
      <div className="space-y-1.5">
        <p className="text-lg font-bold text-slate-500">Sentence Starters (Tap to insert):</p>
        <div className="flex flex-wrap gap-1.5">
          {frames.map((f, i) => (
            <button
              key={i}
              onClick={() => handleStarterClick(f)}
              className="px-2.5 py-1 bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-lg text-lg font-bold border border-purple-200 hover:bg-purple-100 cursor-pointer"
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Word bank */}
      <div className="space-y-1.5">
        <p className="text-lg font-bold text-slate-500">Magic Word Bank:</p>
        <div className="flex flex-wrap gap-1.5">
          {wordBank.map((w, i) => (
            <button
              key={i}
              onClick={() => handleWordClick(w)}
              className="px-2.5 py-1 bg-amber-50 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded-lg text-xs font-black border border-amber-200 hover:bg-amber-100 cursor-pointer"
            >
              💎 {w}
            </button>
          ))}
        </div>
      </div>

      {/* Text area */}
      <div className="space-y-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type your magical sentences here..."
          className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-purple-500 outline-none text-sm font-bold text-slate-800 dark:text-slate-100 min-h-[100px]"
        />
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-slate-400">{text.length} characters</span>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || isSubmitted}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5 hover:brightness-110 disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" /> Submit Story 📜
          </button>
        </div>
      </div>

      {isSubmitted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3.5 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 rounded-2xl text-emerald-900 dark:text-emerald-200 text-sm font-bold flex items-center gap-2"
        >
          <Award className="w-5 h-5 text-emerald-600" />
          <span>{safeExtractText(activity.feedbackCorrect) || 'Magnificent writing quest completed!'}</span>
        </motion.div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   14. Reflection & SEL Check-In (SEL)
   ───────────────────────────────────────────────────────────── */
export const ReflectionSELActivity: React.FC<ActivityProps> = ({ activity, onComplete, isCompleted: initialCompleted }) => {
  const rawOptions = Array.isArray(activity.options) ? activity.options : [
    'Mistakes help me learn, and I can try one more clue! 🌟',
    'I should give up and never speak English again.'
  ];
  const options = rawOptions.map(o => safeExtractText(o));
  const correct = safeExtractText(activity.correct) || options[0];

  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(initialCompleted || false);

  const moods = [
    { emoji: '🤩', label: 'Excited' },
    { emoji: '😊', label: 'Happy' },
    { emoji: '🤔', label: 'Curious' },
    { emoji: '😴', label: 'Tired' }
  ];

  const handleSelectOpt = (opt: string) => {
    playClick();
    setSelectedOpt(opt);
    if (opt.trim().toLowerCase() === correct.trim().toLowerCase() || options.length === 1) {
      setIsCompleted(true);
      playQuestDing();
      playStarShower();
      onComplete?.(activity.points || 25);
    } else {
      playErrorSound();
    }
  };

  return (
    <div className="space-y-4">
      {/* Mood Check */}
      <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800">
        <p className="text-xs font-black text-amber-900 dark:text-amber-200 mb-2">How are you feeling right now?</p>
        <div className="flex justify-around">
          {moods.map(m => (
            <button
              key={m.label}
              onClick={() => {
                playClick();
                setSelectedMood(m.label);
              }}
              className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer ${
                selectedMood === m.label ? 'bg-amber-200 dark:bg-amber-900/60 scale-110' : 'hover:bg-amber-100'
              }`}
            >
              <span className="text-2xl">{m.emoji}</span>
              <span className="text-[11px] font-bold text-amber-950 dark:text-amber-200">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">{safeExtractText(activity.prompt) || 'Choose the kind mindset thought:'}</p>

      <div className="space-y-2">
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleSelectOpt(opt)}
            className={`w-full p-3.5 rounded-2xl font-bold text-left text-sm transition-all border-2 cursor-pointer ${
              selectedOpt === opt
                ? opt.trim().toLowerCase() === correct.trim().toLowerCase()
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-100'
                  : 'bg-rose-50 border-rose-400 text-rose-900'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-400'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      {isCompleted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3.5 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 rounded-2xl text-emerald-900 dark:text-emerald-200 text-sm font-bold"
        >
          {safeExtractText(activity.feedbackCorrect) || 'Warm growth mindset affirmed!'}
        </motion.div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   15. Real-Life Game (Real-Life)
   ───────────────────────────────────────────────────────────── */
export const RealLifeMissionActivity: React.FC<ActivityProps> = ({ activity, onComplete, isCompleted: initialCompleted }) => {
  const rawChecklist = Array.isArray(activity.checklist) ? activity.checklist : [
    'Ask a friend: "What are you curious about?" in English 🔍',
    'Find one shiny object in your home and call it your magic crystal 💎',
    'Whisper one kind phrase to a family member 🤫'
  ];
  const checklist = rawChecklist.map(it => safeExtractText(it));

  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [isCompleted, setIsCompleted] = useState(initialCompleted || false);

  const handleToggle = (idx: number) => {
    playClick();
    const updated = { ...checked, [idx]: !checked[idx] };
    setChecked(updated);

    if (Object.values(updated).filter(Boolean).length >= Math.min(2, checklist.length) && !isCompleted) {
      setIsCompleted(true);
      playQuestDing();
      playStarShower();
      onComplete?.(activity.points || 30);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">{safeExtractText(activity.prompt) || 'Real-world action quest:'}</p>

      <div className="space-y-2.5">
        {checklist.map((item, idx) => (
          <button
            key={idx}
            onClick={() => handleToggle(idx)}
            className={`w-full p-3.5 rounded-2xl text-left font-bold text-sm transition-all border-2 flex items-center gap-3 cursor-pointer ${
              checked[idx]
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-900 dark:text-emerald-100 shadow-sm'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 shrink-0 ${
                checked[idx] ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-slate-50'
              }`}
            >
              {checked[idx] && <Check className="w-4 h-4" />}
            </span>
            <span className="flex-1">{item}</span>
          </button>
        ))}
      </div>

      {activity.roleplayPrompt && (
        <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-200 text-lg font-bold text-purple-900 dark:text-purple-200">
          🗣️ <strong>Say it out loud:</strong> {safeExtractText(activity.roleplayPrompt)}
        </div>
      )}

      {isCompleted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3.5 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 rounded-2xl text-emerald-900 dark:text-emerald-200 text-sm font-bold"
        >
          {safeExtractText(activity.feedbackCorrect) || 'Real-world mission accomplished!'}
        </motion.div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   16. Spelling Bee Tiles 🐝 — phonological loop + recall
   ═══════════════════════════════════════════════════════════ */
export const SpellingBeeActivity: React.FC<ActivityProps> = ({ activity, onComplete, isCompleted: initialCompleted }) => {
  const words: string[] = (Array.isArray(activity.items) && activity.items.length ? activity.items : (activity.word ? [activity.word] : ['crystal', 'brave', 'whisper'])).map(w => safeExtractText(w));
  const [wi, setWi] = useState(0);
  const [built, setBuilt] = useState<string[]>([]);
  const [done, setDone] = useState(initialCompleted || false);
  const [shake, setShake] = useState(false);
  const target = words[Math.min(wi, words.length - 1)];
  const tiles = [...target.split(''), ...(activity.distractorLetters || []).slice(0, 2)].sort(() => Math.random() - 0.5);

  const hear = () => { playClick(); speakText(`Spell the word: ${target}. ${target}`, activity.characterSpeaker, 1.1, 0.85); };
  const tap = (ch: string, i: number) => {
    if (done) return;
    const next = [...built, ch];
    if (target.startsWith(next.join(''))) {
      playCoinClink(); setBuilt(next);
      if (next.join('') === target) {
        playTrophyUnlock();
        if (wi + 1 >= words.length) { setDone(true); onComplete?.(activity.points || 30); }
        else setTimeout(() => { setBuilt([]); setWi(wi + 1); playCheckpointUnlock(); }, 900);
      }
    } else { playErrorSound(); setShake(true); setTimeout(() => setShake(false), 400); }
  };

  return (
    <div className="space-y-3 text-center">
      <p className="text-2xl sm:text-3xl font-black text-slate-950">🐝 {safeExtractText(activity.prompt) || 'Spell the magic word!'}</p>
      <div className="flex justify-center gap-2">
        <button onClick={hear} className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-black shadow-lg hover:scale-105 flex items-center gap-1.5"><Volume2 className="w-4 h-4" /> Hear word</button>
        <span className="px-3 py-2 rounded-2xl bg-amber-50 border-2 border-amber-200 text-lg font-black text-amber-700">Word {wi + 1}/{words.length}</span>
      </div>
      <div className={`flex justify-center gap-1.5 min-h-[44px] flex-wrap ${shake ? 'animate-[wiggle_0.4s]' : ''}`}>
        {built.map((c, i) => (
          <motion.span key={i} initial={{ scale: 0, y: -14 }} animate={{ scale: 1, y: 0 }} className="w-9 h-11 rounded-xl bg-gradient-to-b from-emerald-400 to-teal-600 text-white flex items-center justify-center font-black text-lg shadow-md">{c}</motion.span>
        ))}
        {Array.from({ length: Math.max(0, target.length - built.length) }).map((_, i) => <span key={`ph${i}`} className="w-9 h-11 rounded-xl border-2 border-dashed border-amber-300" />)}
      </div>
      <div className="flex justify-center gap-1.5 flex-wrap">
        {tiles.map((ch, i) => (
          <button key={`${ch}-${i}`} onClick={() => tap(ch, i)} className="w-10 h-11 rounded-xl bg-gradient-to-b from-yellow-300 to-amber-500 text-amber-950 font-black text-lg shadow-md border-2 border-yellow-200 hover:scale-110 active:scale-95 transition-transform">{ch}</button>
        ))}
      </div>
      {done && <motion.p initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="p-3 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-black">🏆 Spelling Champion! {safeExtractText(activity.feedbackCorrect) || 'Every word spelled perfectly!'}</motion.p>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   17. Balloon Pop 🎈 — rapid word recognition under play pressure
   ═══════════════════════════════════════════════════════════ */
export const BalloonPopActivity: React.FC<ActivityProps> = ({ activity, onComplete, isCompleted: initialCompleted }) => {
  const target = safeExtractText(activity.word || activity.correct || 'crystal');
  const pool = (Array.isArray(activity.options) && activity.options.length >= 3 ? activity.options.map(o => safeExtractText(o)) : [target, 'brave', 'whisper', 'curious']).filter((w, i, a) => a.indexOf(w) === i);
  const [balloons, setBalloons] = useState(() => [...pool].sort(() => Math.random() - 0.5).map((w, i) => ({ id: i, w, x: 8 + (i % 4) * 22, y: 6 + Math.floor(i / 4) * 34, hue: [356, 42, 130, 205, 275, 320][i % 6] })));
  const [popped, setPopped] = useState(0);
  const [done, setDone] = useState(initialCompleted || false);
  const [wrongPop, setWrongPop] = useState<string | null>(null);

  const pop = (b: { id: number; w: string }) => {
    if (done || b.w === '') return;
    if (b.w.toLowerCase() === target.toLowerCase()) {
      playLightningZap(); playStarShower();
      setBalloons(bs => bs.filter(x => x.id !== b.id));
      const p = popped + 1;
      setPopped(p);
      if (pool.filter(w => w.toLowerCase() === target.toLowerCase()).length <= p) { setDone(true); onComplete?.(activity.points || 30); }
    } else {
      playErrorSound(); setWrongPop(b.w); setTimeout(() => setWrongPop(null), 500);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-2xl sm:text-3xl font-black text-slate-950">🎈 Pop every word: <span className="text-purple-600 underline decoration-wavy">{target}</span></p>
        <span className="text-lg font-black px-2 py-1 rounded-full bg-purple-100 text-purple-700">{popped} popped</span>
      </div>
      <div className="relative h-56 rounded-3xl bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50 border-2 border-sky-200 overflow-hidden">
        <div className="absolute bottom-2 inset-x-4 h-4 rounded-full bg-emerald-200/70" />
        {/* The float stays inside the sky: a balloon climbing past the top edge is not a
            balloon a child can be asked to pop. */}
        {balloons.map(b => (
          <motion.button
            key={b.id}
            onClick={() => pop(b)}
            initial={{ y: 240, opacity: 0 }}
            animate={{ y: [b.y * 2 + 20, b.y * 2 + 8, b.y * 2 + 20], opacity: 1 }}
            transition={{ duration: 3.4 + (b.id % 3), repeat: Infinity, ease: 'easeInOut' }}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.6 }}
            className="absolute w-16 h-20 flex items-center justify-center"
            style={{ left: `${b.x}%`, top: `${b.y}%` }}
          >
            <span className="absolute inset-0 rounded-[50%] shadow-lg" style={{ background: `radial-gradient(circle at 32% 28%, hsl(${b.hue} 95% 78%), hsl(${b.hue} 85% 52%))`, border: `2px solid hsl(${b.hue} 70% 40%)` }} />
            <span className="relative text-[10px] font-black text-white drop-shadow px-1 break-words text-center leading-tight">{b.w}</span>
            <span className="absolute -bottom-3 left-1/2 w-px h-4 bg-slate-500/60 -rotate-12" />
          </motion.button>
        ))}
      </div>
      {wrongPop && <p className="text-xs font-black text-rose-500 animate-pulse">Oops — {wrongPop} is not {target}. Look again! 👀</p>}
      {done && <motion.p initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="p-3 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-black">✨ All {target} balloons popped! {safeExtractText(activity.feedbackCorrect) || 'Eagle eyes!'}</motion.p>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   18. Whack-a-Mole ⚒️ — reflex vocabulary drill
   ═══════════════════════════════════════════════════════════ */
export const WhackAMoleActivity: React.FC<ActivityProps> = ({ activity, onComplete, isCompleted: initialCompleted }) => {
  const target = safeExtractText(activity.word || activity.correct || 'crystal');
  const moles = ['🦔', '🐹', '🐰', '🦫'];
  const decoys = (Array.isArray(activity.options) ? activity.options : ['brave', 'whisper']).map(o => safeExtractText(o));
  const [active, setActive] = useState<number | null>(null);
  const [kind, setKind] = useState<'target' | 'decoy'>('target');
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(initialCompleted || false);
  const [seconds, setSeconds] = useState(activity.seconds || 30);

  useEffect(() => {
    if (done) return;
    if (seconds <= 0) {
      setDone(true);
      onComplete?.(score >= 5 ? activity.points || 30 : Math.max(10, score * 4));
      return;
    }
    const t = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, done]);
  useEffect(() => {
    if (done) return;
    const t = setInterval(() => {
      setActive(Math.floor(Math.random() * 9));
      setKind(Math.random() < 0.55 ? 'target' : 'decoy');
      playTimerTick();
    }, 900);
    return () => clearInterval(t);
  }, [done]);

  const whack = (i: number) => {
    if (done || i !== active) return;
    if (kind === 'target') { playCoinClink(); playComboSurge(score % 3 + 1); setScore(s => s + 1); }
    else playErrorSound();
    setActive(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-2xl sm:text-3xl font-black text-slate-950">⚒️ Whack only <span className="text-amber-600">{target}</span> moles!</p>
        <div className="flex gap-1.5">
          <span className="text-lg font-black px-2 py-1 rounded-full bg-amber-100 text-amber-700">⭐ {score}</span>
          <span className={`text-lg font-black px-2 py-1 rounded-full ${seconds <= 8 ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>⏱ {seconds}s</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 p-3 rounded-3xl bg-gradient-to-b from-amber-100 to-amber-200/60 border-2 border-amber-300">
        {Array.from({ length: 9 }).map((_, i) => (
          <button key={i} onClick={() => whack(i)} className="h-16 rounded-2xl bg-gradient-to-b from-amber-700/30 to-amber-900/30 border border-amber-800/30 flex items-center justify-center relative overflow-hidden active:scale-95 transition-transform">
            {i === active && (
              <motion.span initial={{ y: 40 }} animate={{ y: 0 }} className="flex flex-col items-center">
                <span className="text-2xl">{kind === 'target' ? '🦔' : moles[i % moles.length]}</span>
                <span className="text-[9px] font-black text-white bg-slate-900/70 px-1 rounded">{kind === 'target' ? target : decoys[i % decoys.length]}</span>
              </motion.span>
            )}
          </button>
        ))}
      </div>
      {done && (
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className={`p-3 rounded-2xl text-xs font-black border ${score >= 5 ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-amber-100 border-amber-300 text-amber-800'}`}>
          {score >= 5 ? `🏆 Mole Master! ${score} correct whacks — ${safeExtractText(activity.feedbackCorrect) || 'incredible reflexes!'}` : `Good try! ${score} whacks — play again to beat your score! 💪`}
        </motion.div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   19. Bingo Listener 🎧 — auditory discrimination board
   ═══════════════════════════════════════════════════════════ */
export const BingoListenerActivity: React.FC<ActivityProps> = ({ activity, onComplete, isCompleted: initialCompleted }) => {
  const pool = (Array.isArray(activity.options) && activity.options.length >= 5 ? activity.options : ['crystal', 'brave', 'whisper', 'curious', 'discover']).map(o => safeExtractText(o));
  const [board] = useState(() => [...pool].sort(() => Math.random() - 0.5).slice(0, 9));
  const [queue] = useState(() => [...pool].sort(() => Math.random() - 0.5));
  const [qi, setQi] = useState(0);
  const [stamped, setStamped] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string | null>(null);
  const [done, setDone] = useState(initialCompleted || false);

  const say = (w: string) => speakText(w, activity.characterSpeaker, 1.1, 0.8);
  const tap = (w: string) => {
    if (done) return;
    if (w === queue[qi]) {
      playStickerStamp();
      const next = [...stamped, w];
      setStamped(next);
      if (qi + 1 >= queue.length || next.length >= 5) { setDone(true); playTrophyUnlock(); onComplete?.(activity.points || 30); }
      else setTimeout(() => { setQi(qi + 1); say(queue[qi + 1]); }, 700);
    } else { playErrorSound(); setWrong(w); setTimeout(() => setWrong(null), 450); }
  };

  return (
    <div className="space-y-3 text-center">
      <p className="text-2xl sm:text-3xl font-black text-slate-950">🎧 {safeExtractText(activity.prompt) || 'Listen and stamp the word you hear!'}</p>
      <div className="flex justify-center gap-2">
        <button onClick={() => { playClick(); say(queue[qi]); }} className="px-4 py-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-black shadow-lg hover:scale-105 flex items-center gap-1.5"><Volume2 className="w-4 h-4" /> Say it again</button>
        <span className="px-3 py-2 rounded-2xl bg-indigo-50 border-2 border-indigo-200 text-lg font-black text-indigo-700">{stamped.length}/5 stamped</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 max-w-[280px] mx-auto">
        {board.map(w => {
          const isStamped = stamped.includes(w);
          return (
            <button key={w} onClick={() => tap(w)} disabled={isStamped} className={`h-14 rounded-xl text-lg font-black transition-all border-2 ${isStamped ? 'bg-emerald-100 border-emerald-400 text-emerald-700' : wrong === w ? 'bg-rose-100 border-rose-400 text-rose-700 animate-[wiggle_0.4s]' : 'bg-white border-indigo-200 text-slate-700 hover:border-indigo-400 hover:scale-105'}`}>
              {isStamped && <span className="block text-base leading-none">✓</span>}{w}
            </button>
          );
        })}
      </div>
      {done && <motion.p initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="p-3 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-black">🎉 BINGO! {safeExtractText(activity.feedbackCorrect) || 'Perfect listening ears!'}</motion.p>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   20. Spin the Word Wheel 🎡 — chance-driven speaking prompt
   ═══════════════════════════════════════════════════════════ */
export const SpinWheelActivity: React.FC<ActivityProps> = ({ activity, onComplete, isCompleted: initialCompleted }) => {
  const segments = (Array.isArray(activity.options) && activity.options.length >= 3 ? activity.options : (Array.isArray(activity.wordBank) ? activity.wordBank : ['crystal', 'brave', 'whisper', 'curious'])).map(o => safeExtractText(o));
  const seg = 360 / segments.length;
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState<number | null>(null);
  const [done, setDone] = useState(initialCompleted || false);

  const spin = () => {
    if (spinning || done) return;
    playRadarScan();
    setSpinning(true);
    setLanded(null);
    const idx = Math.floor(Math.random() * segments.length);
    const extra = 4 * 360 + (360 - (idx * seg + seg / 2));
    setAngle(a => a + extra);
    setTimeout(() => {
      setSpinning(false);
      setLanded(idx);
      playQuestDing();
      speakText(segments[idx], activity.characterSpeaker, 1.1, 0.9);
    }, 2600);
  };

  const wheelBg = `conic-gradient(${segments.map((_, i) => `hsl(${(i * 360) / segments.length + 20} 80% 62%) ${(i * seg) / 1}deg ${((i + 1) * seg) / 1}deg`).join(', ')})`;

  return (
    <div className="space-y-3 text-center">
      <p className="text-2xl sm:text-3xl font-black text-slate-950">🎡 {safeExtractText(activity.prompt) || 'Spin the wheel — say the word in a sentence!'}</p>
      <div className="relative w-44 h-44 mx-auto">
        <motion.div animate={{ rotate: angle }} transition={{ duration: 2.6, ease: [0.15, 0.9, 0.2, 1] }} className="w-full h-full rounded-full border-8 border-white shadow-xl" style={{ background: wheelBg }} />
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-xl">🔻</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="w-9 h-9 rounded-full bg-white shadow-inner flex items-center justify-center text-lg">✨</span>
        </div>
      </div>
      {!landed && <button onClick={spin} disabled={spinning} className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 text-white text-xs font-black shadow-lg hover:scale-105 disabled:opacity-60">{spinning ? 'Spinning…' : '🎯 SPIN!'}</button>}
      {landed !== null && !done && (
        <motion.div initial={{ scale: 0.85 }} animate={{ scale: 1 }} className="p-3 rounded-2xl bg-amber-50 border-2 border-amber-300 space-y-2">
          <p className="text-lg font-black text-amber-700">🗣️ "{segments[landed]}"</p>
          <p className="text-[11px] font-bold text-amber-600">{safeExtractText(activity.instruction) || `Say a full sentence with "${segments[landed]}" aloud, then claim your reward!`}</p>
          <button onClick={() => { playStarShower(); setDone(true); onComplete?.(activity.points || 30); }} className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-black shadow hover:scale-105">✅ I said it aloud!</button>
        </motion.div>
      )}
      {done && <p className="p-3 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-black">🎤 Sentence superstar! {safeExtractText(activity.feedbackCorrect) || 'Confident speaking!'}</p>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   21. Odd One Out 🕵️ — categorization + elimination thinking
   ═══════════════════════════════════════════════════════════ */
export const OddOneOutActivity: React.FC<ActivityProps> = ({ activity, onComplete, isCompleted: initialCompleted }) => {
  const items = (Array.isArray(activity.options) && activity.options.length >= 3 ? activity.options : ['run', 'jump', 'happy', 'swim']).map(o => safeExtractText(o));
  const odd = safeExtractText(activity.odd) || items[items.length - 1];
  const [tapped, setTapped] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string | null>(null);
  const [done, setDone] = useState(initialCompleted || false);

  const tap = (w: string) => {
    if (done || tapped.includes(w)) return;
    if (w === odd) { playTrophyUnlock(); playStarShower(); setTapped(t => [...t, w]); setDone(true); onComplete?.(activity.points || 25); }
    else { playErrorSound(); setWrong(w); setTimeout(() => setWrong(null), 450); }
  };

  return (
    <div className="space-y-3">
      <p className="text-2xl sm:text-3xl font-black text-slate-950">🕵️ {safeExtractText(activity.prompt) || 'One word does not belong — tap it!'}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {items.map(w => (
          <motion.button key={w} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }} onClick={() => tap(w)} disabled={done && w === odd}
            className={`p-3 rounded-2xl text-sm font-black border-2 transition-colors ${tapped.includes(w) ? 'bg-emerald-100 border-emerald-400 text-emerald-700' : wrong === w ? 'bg-rose-100 border-rose-400 text-rose-700 animate-[wiggle_0.4s]' : 'bg-white border-slate-200 text-slate-700 hover:border-purple-400'}`}>
            <span className="block text-xl mb-0.5">{['🟣', '🔵', '🟢', '🟠'][items.indexOf(w) % 4]}</span>{w}
            <span data-say role="button" tabIndex={-1} onClick={(e) => { e.stopPropagation(); playClick(); speakText(w, activity.characterSpeaker, 1.15, 0.9); }} className="ml-1 align-middle text-purple-400 hover:text-purple-600 cursor-pointer"><Volume2 className="w-3.5 h-3.5 inline" /></span>
          </motion.button>
        ))}
      </div>
      {done && <motion.p initial={{ scale: 0.85 }} animate={{ scale: 1 }} className="p-3 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-black">🕵️ Sharp eye! {safeExtractText(activity.explanation) || `"${odd}" is different — ${safeExtractText(activity.feedbackCorrect) || 'great category thinking!'}`}</motion.p>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   22. Word Search Grid 🔍 — visual word-form recognition
   ═══════════════════════════════════════════════════════════ */
export const WordSearchActivity: React.FC<ActivityProps> = ({ activity, onComplete, isCompleted: initialCompleted }) => {
  const words = (Array.isArray(activity.gridWords) && activity.gridWords.length ? activity.gridWords : (Array.isArray(activity.items) ? activity.items : ['crystal', 'brave', 'magic'])).map(w => safeExtractText(w).toUpperCase().replace(/[^A-Z]/g, '')).filter(Boolean).slice(0, 5);
  const N = 9;
  const [grid] = useState<string[][]>(() => {
    const g: string[][] = Array.from({ length: N }, () => Array(N).fill(''));
    const dirs = [[0, 1], [1, 0], [1, 1]];
    words.forEach(w => {
      for (let tries = 0; tries < 60; tries++) {
        const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
        const r0 = Math.floor(Math.random() * N); const c0 = Math.floor(Math.random() * N);
        if (r0 + dr * (w.length - 1) < N && c0 + dc * (w.length - 1) < N) {
          const cells: number[] = [];
          let ok = true;
          for (let k = 0; k < w.length; k++) {
            const r = r0 + dr * k, c = c0 + dc * k;
            if (g[r][c] && g[r][c] !== w[k]) { ok = false; break; }
            cells.push(r * N + c);
          }
          if (ok) { cells.forEach((cell, k) => { g[Math.floor(cell / N)][cell % N] = w[k]; }); break; }
        }
      }
    });
    const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!g[r][c]) g[r][c] = ABC[Math.floor(Math.random() * 26)];
    return g;
  });
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [done, setDone] = useState(initialCompleted || false);

  /* Select a start cell, then an end cell along a row/col/diagonal —
     if the letters spell one of the hidden words, it is found. */
  const tapCell = (idx: number) => {
    if (done) return;
    playClick();
    if (sel === null) { setSel(idx); return; }
    const r1 = Math.floor(sel / N), c1 = sel % N, r2 = Math.floor(idx / N), c2 = idx % N;
    const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1);
    setSel(null);
    if (r1 === r2 && c1 === c2) return;
    const straight = dr === 0 || dc === 0 || Math.abs(r2 - r1) === Math.abs(c2 - c1);
    if (!straight) return;
    let letters = '';
    const cells: number[] = [];
    let r = r1, c = c1;
    while (true) {
      letters += grid[r][c]; cells.push(r * N + c);
      if (r === r2 && c === c2) break;
      r += dr; c += dc;
    }
    const rev = [...letters].reverse().join('');
    const hit = words.find(w => !foundWords.includes(w) && (w === letters || w === rev));
    if (hit) {
      playTrophyUnlock();
      speakText(hit.toLowerCase(), activity.characterSpeaker, 1.1, 0.85);
      const next = [...foundWords, hit];
      setFoundWords(next);
      if (next.length === words.length) { setDone(true); playStarShower(); onComplete?.(activity.points || 30); }
    } else { playErrorSound(); }
  };
  const tapWord = (w: string) => {
    if (done || foundWords.includes(w)) return;
    playClick();
    speakText(w.toLowerCase(), activity.characterSpeaker, 1.1, 0.85);
  };

  return (
    <div className="space-y-3">
      <p className="text-2xl sm:text-3xl font-black text-slate-950">🔍 {safeExtractText(activity.prompt) || 'Find the hidden words in the grid!'}</p>
      <div className="flex gap-3">
        <div className="grid gap-0.5 p-2 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100 border-2 border-teal-200" style={{ gridTemplateColumns: `repeat(${N}, minmax(0,1fr))` }}>
          {grid.flatMap((row, r) => row.map((ch, c) => {
            const idx = r * N + c;
            const isSel = sel === idx;
            return (
              <button key={idx} onClick={() => tapCell(idx)} className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md text-[10px] sm:text-xs font-black transition-colors ${isSel ? 'bg-amber-400 text-white scale-110' : 'bg-white/80 text-teal-800 hover:bg-teal-200'}`}>{ch}</button>
            );
          }))}
        </div>
        <div className="flex-1 space-y-1.5">
          {words.map(w => {
            const f = foundWords.includes(w);
            return (
              <button key={w} onClick={() => tapWord(w)} className={`w-full px-2 py-1.5 rounded-xl text-lg font-black border-2 text-left transition-all ${f ? 'bg-emerald-100 border-emerald-400 text-emerald-700 line-through' : 'bg-white border-teal-200 text-teal-800 hover:border-teal-400'}`}>
                {f ? '✓ ' : '🔎 '}{w}
              </button>
            );
          })}
        </div>
      </div>
      {done && <motion.p initial={{ scale: 0.85 }} animate={{ scale: 1 }} className="p-3 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-black">🔍 Word Detective! {safeExtractText(activity.feedbackCorrect) || 'All hidden words found!'}</motion.p>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   23. Rhyme Time Match 🎵 — phonological awareness
   ═══════════════════════════════════════════════════════════ */
export const RhymeMatchActivity: React.FC<ActivityProps> = ({ activity, onComplete, isCompleted: initialCompleted }) => {
  const rawPairs = Array.isArray(activity.pairs) && activity.pairs.length ? activity.pairs : [
    { left: 'cat 🐱', right: 'hat 🎩' }, { left: 'star ⭐', right: 'car 🚗' }, { left: 'cake 🎂', right: 'lake 🏞️' }
  ];
  const pairs = rawPairs.map(p => ({ left: safeExtractText(p.left), right: safeExtractText(p.right) }));
  const [selL, setSelL] = useState<number | null>(null);
  const [selR, setSelR] = useState<number | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [wrong, setWrong] = useState(false);
  const [done, setDone] = useState(initialCompleted || false);
  const rights = [...pairs.keys()].sort(() => Math.random() - 0.5);

  const attempt = (l: number | null, r: number | null) => {
    if (l === null || r === null) return;
    if (l === r) {
      playComboSurge(2);
      const next = [...matched, l];
      setMatched(next);
      setSelL(null); setSelR(null);
      if (next.length === pairs.length) { setDone(true); playTrophyUnlock(); onComplete?.(activity.points || 30); }
      else playQuestDing();
    } else { playErrorSound(); setWrong(true); setTimeout(() => { setWrong(false); setSelL(null); setSelR(null); }, 450); }
  };

  return (
    <div className="space-y-3">
      <p className="text-2xl sm:text-3xl font-black text-slate-950">🎵 {safeExtractText(activity.prompt) || 'Match the words that rhyme — same ending sound!'}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {pairs.map((p, i) => (
            <button key={`l${i}`} onClick={() => { playClick(); speakText(p.left, activity.characterSpeaker, 1.15, 0.9); setSelL(i); attempt(i, selR); }} disabled={matched.includes(i)}
              className={`w-full p-2.5 rounded-xl text-xs font-black border-2 transition-all ${matched.includes(i) ? 'bg-emerald-100 border-emerald-400 text-emerald-700' : selL === i ? 'bg-purple-600 text-white border-purple-600 scale-105 shadow' : wrong && selL === i ? 'bg-rose-100 border-rose-400' : 'bg-white border-purple-200 text-slate-700 hover:border-purple-400'}`}>{p.left}</button>
          ))}
        </div>
        <div className="space-y-2">
          {rights.map(i => (
            <button key={`r${i}`} onClick={() => { playClick(); speakText(pairs[i].right, activity.characterSpeaker, 1.15, 0.9); setSelR(i); attempt(selL, i); }} disabled={matched.includes(i)}
              className={`w-full p-2.5 rounded-xl text-xs font-black border-2 transition-all ${matched.includes(i) ? 'bg-emerald-100 border-emerald-400 text-emerald-700' : selR === i ? 'bg-fuchsia-600 text-white border-fuchsia-600 scale-105 shadow' : 'bg-white border-fuchsia-200 text-slate-700 hover:border-fuchsia-400'}`}>{pairs[i].right}</button>
          ))}
        </div>
      </div>
      {done && <motion.p initial={{ scale: 0.85 }} animate={{ scale: 1 }} className="p-3 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-black">🎶 Rhyme Master! {safeExtractText(activity.feedbackCorrect) || 'Your ears hear the sounds of English!'}</motion.p>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   24. Syllable Clap Counter 👏 — beat-level phonology
   ═══════════════════════════════════════════════════════════ */
export const SyllableCountActivity: React.FC<ActivityProps> = ({ activity, onComplete, isCompleted: initialCompleted }) => {
  const words: Array<{ word: string; count: number }> = (Array.isArray(activity.syllables) && activity.syllables.length ? activity.syllables : [
    { word: 'cat', count: 1 }, { word: 'tiger', count: 2 }, { word: 'curious', count: 3 }
  ]);
  const [wi, setWi] = useState(0);
  const [done, setDone] = useState(initialCompleted || false);
  const [wrong, setWrong] = useState(false);
  const [claps, setClaps] = useState(0);
  const cur = words[Math.min(wi, words.length - 1)];

  const hear = () => { playClick(); speakText(`${cur.word}. Clap the syllables: ${Array(cur.count).fill('clap').join('! ')}`, activity.characterSpeaker, 1.1, 0.85); };
  const answer = (n: number) => {
    if (done) return;
    if (n === cur.count) {
      playStarShower(); playQuestDing();
      if (wi + 1 >= words.length) { setDone(true); onComplete?.(activity.points || 25); }
      else setTimeout(() => { setWi(wi + 1); setClaps(0); playCheckpointUnlock(); }, 800);
    } else { playErrorSound(); setWrong(true); setTimeout(() => setWrong(false), 450); }
  };

  return (
    <div className="space-y-3 text-center">
      <p className="text-2xl sm:text-3xl font-black text-slate-950">👏 {safeExtractText(activity.prompt) || 'How many syllables (word beats)?'}</p>
      <div className={`py-4 rounded-2xl bg-gradient-to-r from-pink-50 to-rose-100 border-2 ${wrong ? 'border-rose-400 animate-[wiggle_0.4s]' : 'border-rose-200'}`}>
        <p className="text-3xl font-black text-rose-700" style={{ fontFamily: 'Georgia, serif' }}>{cur.word}</p>
        {claps > 0 && <motion.p key={claps} initial={{ scale: 1.6 }} animate={{ scale: 1 }} className="text-xl">{'👏'.repeat(claps)}</motion.p>}
      </div>
      <div className="flex justify-center gap-2">
        <button onClick={hear} className="px-3 py-2 rounded-xl bg-rose-500 text-white text-xs font-black shadow hover:scale-105 flex items-center gap-1"><Volume2 className="w-4 h-4" /> Hear it</button>
        <button onClick={() => { playClick(); setClaps(c => c + 1); }} className="px-3 py-2 rounded-xl bg-amber-400 text-amber-950 text-xs font-black shadow hover:scale-105">👏 Clap along</button>
      </div>
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4].map(n => (
          <button key={n} onClick={() => answer(n)} disabled={done} className="w-11 h-11 rounded-2xl bg-gradient-to-b from-purple-500 to-fuchsia-600 text-white font-black text-lg shadow-md hover:scale-110 active:scale-95 transition-transform">{n}</button>
        ))}
      </div>
      <p className="text-[11px] font-bold text-slate-400">Word {wi + 1} of {words.length}</p>
      {done && <motion.p initial={{ scale: 0.85 }} animate={{ scale: 1 }} className="p-3 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-black">👏 Rhythm Master! {safeExtractText(activity.feedbackCorrect) || 'You feel the beat of English!'}</motion.p>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   25. Enchanted Drawing Pad 🎨 — multimodal vocabulary encoding
   ═══════════════════════════════════════════════════════════ */
export const DrawingPadActivity: React.FC<ActivityProps> = ({ activity, onComplete, isCompleted: initialCompleted }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [done, setDone] = useState(initialCompleted || false);
  const [hue, setHue] = useState(280);
  const task = safeExtractText(activity.task || activity.prompt) || 'Draw the magic word, then say it aloud!';

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    cv.width = rect.width * 2; cv.height = rect.height * 2;
    const ctx = cv.getContext('2d');
    if (ctx) { ctx.scale(2, 2); ctx.fillStyle = '#fffdf5'; ctx.fillRect(0, 0, rect.width, rect.height); }
  }, []);

  const pos = (e: React.PointerEvent) => {
    const cv = canvasRef.current!;
    const rect = cv.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const start = (e: React.PointerEvent) => {
    drawing.current = true;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = pos(e);
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
    ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.strokeStyle = `hsl(${hue} 80% 55%)`;
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = pos(e);
    ctx.lineTo(p.x, p.y); ctx.stroke();
  };
  const stop = () => { drawing.current = false; };
  const clear = () => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext('2d');
    if (ctx) { ctx.fillStyle = '#fffdf5'; ctx.fillRect(0, 0, cv.width, cv.height); }
    playClick();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-2xl sm:text-3xl font-black text-slate-950">🎨 {safeExtractText(activity.prompt) || 'Draw it, say it, remember it!'}</p>
        <div className="flex gap-1">
          {[280, 0, 45, 140, 210].map(h => (
            <button key={h} onClick={() => { playClick(); setHue(h); }} className={`w-6 h-6 rounded-full border-2 transition-transform ${hue === h ? 'scale-125 border-slate-800' : 'border-white'}`} style={{ background: `hsl(${h} 80% 55%)` }} />
          ))}
        </div>
      </div>
      <p className="text-[11px] font-bold text-purple-500">✏️ {task}</p>
      <canvas
        ref={canvasRef}
        onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerLeave={stop}
        className="w-full h-44 rounded-2xl border-2 border-purple-200 shadow-inner touch-none cursor-crosshair"
      />
      <div className="flex gap-2 justify-center">
        <button onClick={clear} className="min-w-12 min-h-12 px-4 py-3 rounded-xl bg-slate-200 text-slate-950 text-lg font-black hover:bg-slate-300">🧽 Clear</button>
        <button onClick={() => { if (done) return; playHomeworkComplete(); playStarShower(); setDone(true); onComplete?.(activity.points || 25); }} disabled={done}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-xs font-black shadow hover:brightness-110 disabled:opacity-60">{done ? '⭐ Masterpiece saved!' : '✅ Done — say it aloud first!'}</button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   26. Typing Race ⌨️ — orthographic automaticity with timer
   ═══════════════════════════════════════════════════════════ */
export const TypingRaceActivity: React.FC<ActivityProps> = ({ activity, onComplete, isCompleted: initialCompleted }) => {
  const target = (activity.correctOrder && activity.correctOrder.length ? activity.correctOrder : (activity.items && activity.items.length ? activity.items : ['English', 'is', 'my', 'superpower'])).map(w => safeExtractText(w)).join(' ');
  const [typed, setTyped] = useState('');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(initialCompleted || false);
  const limit = activity.seconds || 60;

  useEffect(() => {
    if (!running || done) return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [running, done]);
  useEffect(() => {
    if (elapsed >= limit && !done) { setRunning(false); playErrorSound(); }
  }, [elapsed, limit, done]);

  const onChange = (v: string) => {
    if (done) return;
    if (!running) { setRunning(true); playEngineRev(); }
    setTyped(v);
    if (v.trim().toLowerCase() === target.trim().toLowerCase()) {
      setDone(true); setRunning(false);
      playTrophyUnlock(); playNitroBoost();
      onComplete?.(activity.points || 35);
    }
  };

  const progress = Math.min(100, (typed.length / target.length) * 100);
  const words = target.split(' ').length;
  const wpm = elapsed > 0 ? Math.round((typed.trim().split(/\s+/).filter(Boolean).length / elapsed) * 60) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-2xl sm:text-3xl font-black text-slate-950">⌨️ {safeExtractText(activity.prompt) || 'Type the sentence — go go go!'}</p>
        <span className={`text-lg font-black px-2 py-1 rounded-full ${limit - elapsed <= 8 && running ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>⏱ {Math.max(0, limit - elapsed)}s</span>
      </div>
      <div className="p-3 rounded-2xl bg-slate-900 text-center">
        <p className="text-sm font-black text-amber-300 tracking-wide">"{target}"</p>
        <button onClick={() => { playClick(); speakText(target, activity.characterSpeaker, 1.05, 0.95); }} className="mt-1 text-[10px] font-black text-slate-400 hover:text-white flex items-center gap-1 mx-auto"><Volume2 className="w-3 h-3" /> hear it</button>
      </div>
      <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${done ? 'bg-emerald-500' : 'bg-gradient-to-r from-orange-400 to-rose-500'}`} style={{ width: `${progress}%` }} />
      </div>
      <input
        value={typed}
        onChange={e => onChange(e.target.value)}
        disabled={done || elapsed >= limit}
        placeholder="Start typing here to launch the race…"
        className="w-full px-4 py-3 rounded-2xl border-2 border-purple-200 focus:border-purple-500 outline-none text-sm font-black bg-white text-slate-800 disabled:opacity-60"
      />
      {running && <p className="text-[11px] font-bold text-slate-400 text-center">⚡ {wpm} WPM • {words} words to go</p>}
      {done && <motion.p initial={{ scale: 0.85 }} animate={{ scale: 1 }} className="p-3 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-black">🏁 Finished in {elapsed}s ({wpm} WPM)! {safeExtractText(activity.feedbackCorrect) || 'Lightning fingers!'}</motion.p>}
      {!done && elapsed >= limit && <p className="p-3 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 text-xs font-black">Time's up! Take a breath and try once more 💪</p>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   27. Flashcard Trainer 🃏 — spaced-retrieval flip cards
   ═══════════════════════════════════════════════════════════ */
export const FlashcardTrainerActivity: React.FC<ActivityProps> = ({ activity, onComplete, isCompleted: initialCompleted }) => {
  const cards = (Array.isArray(activity.pairs) && activity.pairs.length ? activity.pairs : [
    { left: '💎 crystal', right: 'a glowing magic rock' },
    { left: '🛡️ brave', right: 'ready to try hard things' }
  ]).map(p => ({ front: safeExtractText(p.left), back: safeExtractText(p.right) }));
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<string[]>([]);
  const [done, setDone] = useState(initialCompleted || false);
  const card = cards[Math.min(idx, cards.length - 1)];

  const go = (d: number) => {
    playClick(); setFlipped(false);
    setIdx(i => (i + d + cards.length) % cards.length);
  };
  const say = () => { playClick(); speakText(flipped ? card.back : card.front, activity.characterSpeaker, 1.1, 0.9); };
  const markKnown = () => {
    if (done) return;
    playStickerStamp();
    const next = [...new Set([...known, card.front])];
    setKnown(next);
    if (next.length >= cards.length) { setDone(true); playTrophyUnlock(); onComplete?.(activity.points || 30); }
    else go(1);
  };

  return (
    <div className="space-y-4 text-lg">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xl sm:text-2xl font-black text-slate-950">🃏 {safeExtractText(activity.prompt) || 'Flip a card. Say the word.'}</p>
        <span className="text-base font-black px-3 py-2 rounded-full bg-amber-100 text-amber-950">{known.length}/{cards.length} done</span>
      </div>
      <div className="flex justify-center">
        <motion.button
          onClick={() => { playClick(); setFlipped(f => !f); }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[460px] h-56 sm:h-64 relative"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-700 text-white flex flex-col items-center justify-center shadow-xl border-4 border-white" style={{ backfaceVisibility: 'hidden' }}>
            <span className="text-5xl sm:text-6xl font-black">{card.front}</span>
            <span className="text-lg font-bold opacity-90 mt-2">Tap to turn</span>
          </div>
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-100 to-orange-200 text-amber-900 flex items-center justify-center shadow-xl border-4 border-white p-4 text-center" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <span className="text-3xl sm:text-4xl font-black leading-snug">{card.back}</span>
          </div>
        </motion.button>
      </div>
      <div className="flex justify-center gap-2">
        <button onClick={() => go(-1)} className="min-w-12 min-h-12 px-4 py-3 rounded-xl bg-slate-200 text-slate-950 text-lg font-black hover:bg-slate-300">←</button>
        <button onClick={say} className="min-h-12 px-4 py-3 rounded-xl bg-purple-100 text-purple-950 text-lg font-black hover:bg-purple-200 flex items-center gap-2"><Volume2 className="w-3.5 h-3.5" /> Say it</button>
        <button onClick={markKnown} className="min-h-12 px-5 py-3 rounded-xl bg-emerald-600 text-white text-lg font-black shadow hover:scale-105">✅ I know it!</button>
        <button onClick={() => go(1)} className="min-w-12 min-h-12 px-4 py-3 rounded-xl bg-slate-200 text-slate-950 text-lg font-black hover:bg-slate-300">→</button>
      </div>
      {done && <motion.p initial={{ scale: 0.85 }} animate={{ scale: 1 }} className="p-3 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-black">🧠 Memory Vault full! {safeExtractText(activity.feedbackCorrect) || 'Every card mastered!'}</motion.p>}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Master Activity Renderer Dispatcher
   ───────────────────────────────────────────────────────────── */
export const ActivityRenderer: React.FC<ActivityProps> = props => {
  if (!props.activity) return null;

  switch (props.activity.type) {
    case 'multipleChoice':
      return <MultipleChoiceActivity {...props} />;
    case 'matchingPairs':
      return <MatchingPairsActivity {...props} />;
    case 'dragDropSort':
      return <DragDropSortActivity {...props} />;
    case 'sentenceBuilder':
      return <SentenceBuilderActivity {...props} />;
    case 'fillBlank':
      return <FillBlankActivity {...props} />;
    case 'listenChoose':
      return <ListenChooseActivity {...props} />;
    case 'speakRepeat':
      return <SpeakRepeatActivity {...props} />;
    case 'memoryMatch':
      return <MemoryMatchActivity {...props} />;
    case 'trueFalse':
      return <TrueFalseActivity {...props} />;
    case 'wordOrderRace':
      return <WordOrderRaceActivity {...props} />;
    case 'storyChoice':
      return <StoryChoiceActivity {...props} />;
    case 'songKaraoke':
      return <SongKaraokeActivity {...props} />;
    case 'writingMission':
      return <WritingMissionActivity {...props} />;
    case 'reflectionSEL':
      return <ReflectionSELActivity {...props} />;
    case 'realLifeMission':
      return <RealLifeMissionActivity {...props} />;
    case 'spellingBee':
      return <SpellingBeeActivity {...props} />;
    case 'balloonPop':
      return <BalloonPopActivity {...props} />;
    case 'whackAMole':
      return <WhackAMoleActivity {...props} />;
    case 'bingoListener':
      return <BingoListenerActivity {...props} />;
    case 'spinWheel':
      return <SpinWheelActivity {...props} />;
    case 'oddOneOut':
      return <OddOneOutActivity {...props} />;
    case 'wordSearch':
      return <WordSearchActivity {...props} />;
    case 'rhymeMatch':
      return <RhymeMatchActivity {...props} />;
    case 'syllableCount':
      return <SyllableCountActivity {...props} />;
    case 'drawingPad':
      return <DrawingPadActivity {...props} />;
    case 'typingRace':
      return <TypingRaceActivity {...props} />;
    case 'flashcardTrainer':
      return <FlashcardTrainerActivity {...props} />;
    default:
      return <MultipleChoiceActivity {...props} />;
  }
};
