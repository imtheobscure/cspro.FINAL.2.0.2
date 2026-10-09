import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import type { Activity } from '../types';
import { speak, speakWithCatVoice, stopSpeaking } from '../utils/tts';
import confetti from 'canvas-confetti';

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  gold:   { bg: 'from-yellow-900/80 to-yellow-800/60', border: 'border-yellow-500', text: 'text-yellow-400', glow: '0 0 30px rgba(255,215,0,0.4)' },
  teal:   { bg: 'from-teal-900/80 to-teal-800/60',    border: 'border-teal-500',   text: 'text-teal-400',   glow: '0 0 30px rgba(20,184,166,0.4)' },
  purple: { bg: 'from-purple-900/80 to-purple-800/60',border: 'border-purple-500', text: 'text-purple-400', glow: '0 0 30px rgba(168,85,247,0.4)' },
  orange: { bg: 'from-orange-900/80 to-orange-800/60',border: 'border-orange-500', text: 'text-orange-400', glow: '0 0 30px rgba(249,115,22,0.4)' },
  green:  { bg: 'from-green-900/80 to-green-800/60',  border: 'border-green-500',  text: 'text-green-400',  glow: '0 0 30px rgba(34,197,94,0.4)' },
  pink:   { bg: 'from-pink-900/80 to-pink-800/60',    border: 'border-pink-500',   text: 'text-pink-400',   glow: '0 0 30px rgba(236,72,153,0.4)' },
  blue:   { bg: 'from-blue-900/80 to-blue-800/60',    border: 'border-blue-500',   text: 'text-blue-400',   glow: '0 0 30px rgba(59,130,246,0.4)' },
};

function fireConfetti() {
  confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 }, colors: ['#ffd700', '#ff6b35', '#e91e8c', '#22c55e', '#3b82f6'] });
  setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0 } }), 250);
  setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 } }), 400);
}

interface Props {
  activity: Activity;
  onComplete: (correct: boolean, skipped?: boolean) => void;
}

// Lesson content panel
const LessonContentPanel: React.FC<{ activity: Activity; colors: typeof COLOR_MAP[string] }> = ({ activity, colors }) => {
  const { lessonContent } = activity;
  if (!lessonContent) return null;
  const { catMuted, catVoice, setCatMessage, setCatMood } = useStore();

  const speakSection = (text: string) => {
    speak(text, null, 1);
    setCatMessage(text.slice(0, 80) + '...');
    setCatMood('😸');
    speakWithCatVoice(text.slice(0, 100), catVoice, catMuted);
  };

  return (
    <motion.div
      className={`mb-6 rounded-2xl border ${colors.border} bg-gradient-to-br ${colors.bg} p-5 space-y-4`}
      initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
    >
      {lessonContent.warmUp && (
        <div>
          <h4 className={`font-bold ${colors.text} mb-1 flex items-center gap-2`}>
            🌡️ Warm-Up
            <button onClick={() => speakSection(lessonContent.warmUp!)} className="text-xs opacity-60 hover:opacity-100">🔊</button>
          </h4>
          <p className="text-gray-200 text-sm leading-relaxed">{lessonContent.warmUp}</p>
        </div>
      )}
      {lessonContent.meaning && (
        <div>
          <h4 className={`font-bold ${colors.text} mb-1 flex items-center gap-2`}>
            💡 Meaning
            <button onClick={() => speakSection(lessonContent.meaning!)} className="text-xs opacity-60 hover:opacity-100">🔊</button>
          </h4>
          <p className="text-gray-200 text-sm leading-relaxed">{lessonContent.meaning}</p>
        </div>
      )}
      {lessonContent.form && (
        <div>
          <h4 className={`font-bold ${colors.text} mb-1`}>📝 Form</h4>
          <p className="text-gray-200 text-sm bg-black/30 rounded-lg p-2 font-mono">{lessonContent.form}</p>
        </div>
      )}
      {lessonContent.use && (
        <div>
          <h4 className={`font-bold ${colors.text} mb-1`}>🗣️ Use</h4>
          <p className="text-gray-200 text-sm leading-relaxed">{lessonContent.use}</p>
        </div>
      )}
      {lessonContent.personalizedExamples && lessonContent.personalizedExamples.length > 0 && (
        <div>
          <h4 className={`font-bold ${colors.text} mb-2`}>✨ Your Examples</h4>
          <ul className="space-y-1">
            {lessonContent.personalizedExamples.map((ex, i) => (
              <li key={i} className="text-gray-200 text-sm flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">▸</span>
                <span className="italic">{ex}</span>
                <button onClick={() => speak(ex, null, 0.9)} className="text-xs opacity-50 hover:opacity-100 ml-auto">🔊</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {lessonContent.lifeApplication && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
          <h4 className="font-bold text-yellow-400 mb-1">🌟 In Your Life</h4>
          <p className="text-gray-200 text-sm">{lessonContent.lifeApplication}</p>
        </div>
      )}
    </motion.div>
  );
};

// Flashcard activity
const FlashcardActivity: React.FC<Props> = ({ activity, onComplete }) => {
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const cards = activity.content.cards ?? [];
  const colors = COLOR_MAP[activity.color] ?? COLOR_MAP.gold;
  const total = cards.length;

  const handleNext = () => {
    if (cardIndex < total - 1) {
      setCardIndex(i => i + 1);
      setFlipped(false);
    } else {
      onComplete(true);
    }
  };

  const card = cards[cardIndex];
  if (!card) return null;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-sm text-gray-400">Card {cardIndex + 1} of {total}</div>
      <div className="w-full flex justify-center" style={{ perspective: 1000 }}>
        <motion.div
          className="relative w-72 h-48 md:w-96 md:h-56 cursor-pointer"
          onClick={() => setFlipped(!flipped)}
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 80 }}
        >
          {/* Front */}
          <div
            className={`absolute inset-0 rounded-2xl border-2 ${colors.border} bg-gradient-to-br ${colors.bg} flex flex-col items-center justify-center p-6 shadow-2xl`}
            style={{ backfaceVisibility: 'hidden', boxShadow: colors.glow }}
          >
            <div className="text-5xl mb-3">{activity.emoji}</div>
            <div className={`text-2xl md:text-3xl font-black ${colors.text}`}>{card.front}</div>
            {card.pronunciation && <div className="text-gray-400 text-sm mt-2">/{card.pronunciation}/</div>}
            <div className="text-gray-500 text-xs mt-4">Click to reveal →</div>
          </div>
          {/* Back */}
          <div
            className={`absolute inset-0 rounded-2xl border-2 ${colors.border} bg-gradient-to-br from-gray-800/90 to-gray-700/80 flex flex-col items-center justify-center p-6 shadow-2xl`}
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', boxShadow: colors.glow }}
          >
            <div className={`text-xl font-bold ${colors.text} text-center mb-2`}>{card.back}</div>
            {card.translation && (
              <div className="text-purple-400 text-sm mt-1 bg-purple-500/10 px-3 py-1 rounded-lg">
                🌍 {card.translation}
              </div>
            )}
            {card.example && (
              <div className="text-gray-300 text-sm italic text-center mt-2 bg-black/30 rounded-lg p-2">
                "{card.example}"
                <button className="ml-2 text-xs opacity-60 hover:opacity-100" onClick={e => { e.stopPropagation(); speak(card.example!, null, 0.85); }}>🔊</button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
      <div className="flex gap-3">
        {flipped && (
          <>
            <button onClick={handleNext} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-colors">
              {cardIndex < total - 1 ? 'Next Card →' : '✓ Done!'}
            </button>
          </>
        )}
        {!flipped && (
          <button onClick={() => setFlipped(true)} className={`px-6 py-2 border-2 ${colors.border} ${colors.text} rounded-xl font-bold hover:bg-white/10 transition-colors`}>
            Flip Card
          </button>
        )}
      </div>
    </div>
  );
};

// Multiple choice
const MultipleChoiceActivity: React.FC<Props> = ({ activity, onComplete }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const colors = COLOR_MAP[activity.color] ?? COLOR_MAP.teal;
  const options = activity.content.options ?? [];

  const handleSubmit = () => {
    if (!selected) return;
    const opt = options.find(o => o.id === selected);
    setSubmitted(true);
    setTimeout(() => onComplete(opt?.isCorrect ?? false), 1200);
  };

  return (
    <div className="space-y-4">
      <p className="text-white text-lg font-semibold">{activity.content.question}</p>
      <div className="grid gap-3">
        {options.map(opt => {
          let btnClass = `w-full text-left px-5 py-3 rounded-xl border-2 font-semibold transition-all text-sm md:text-base `;
          if (!submitted) {
            btnClass += selected === opt.id
              ? `${colors.border} ${colors.text} bg-white/10`
              : 'border-gray-600 text-gray-300 hover:border-gray-400 hover:bg-white/5';
          } else {
            if (opt.isCorrect) btnClass += 'border-green-500 bg-green-500/20 text-green-300';
            else if (selected === opt.id && !opt.isCorrect) btnClass += 'border-red-500 bg-red-500/20 text-red-300';
            else btnClass += 'border-gray-700 text-gray-500';
          }
          return (
            <motion.button
              key={opt.id}
              className={btnClass}
              onClick={() => !submitted && setSelected(opt.id)}
              whileHover={!submitted ? { scale: 1.01 } : {}}
              whileTap={!submitted ? { scale: 0.99 } : {}}
            >
              <span className="mr-2">{submitted ? (opt.isCorrect ? '✅' : (selected === opt.id ? '❌' : '○')) : (selected === opt.id ? '●' : '○')}</span>
              {opt.text}
            </motion.button>
          );
        })}
      </div>
      {!submitted && (
        <motion.button
          onClick={handleSubmit}
          disabled={!selected}
          className={`w-full py-3 rounded-xl font-black text-lg transition-all ${selected ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:brightness-110' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
          whileHover={selected ? { scale: 1.02 } : {}}
          whileTap={selected ? { scale: 0.98 } : {}}
        >
          Submit Answer
        </motion.button>
      )}
    </div>
  );
};

// True/False
const TrueFalseActivity: React.FC<Props> = ({ activity, onComplete }) => {
  const [selected, setSelected] = useState<boolean | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const correct = activity.content.answer;

  const handleSelect = (val: boolean) => {
    if (submitted) return;
    setSelected(val);
    setSubmitted(true);
    setTimeout(() => onComplete(val === correct), 1000);
  };

  return (
    <div className="space-y-6">
      <p className="text-white text-lg font-semibold leading-relaxed">{activity.content.question}</p>
      <div className="grid grid-cols-2 gap-4">
        {[true, false].map(val => {
          let cls = `py-6 rounded-2xl font-black text-2xl border-2 transition-all cursor-pointer `;
          if (!submitted) {
            cls += val ? 'border-green-500 hover:bg-green-500/20 text-green-400' : 'border-red-500 hover:bg-red-500/20 text-red-400';
          } else {
            if (val === correct) cls += 'border-green-500 bg-green-500/30 text-green-300';
            else if (val === selected && val !== correct) cls += 'border-red-500 bg-red-500/30 text-red-300';
            else cls += 'border-gray-700 text-gray-500';
          }
          return (
            <motion.button
              key={String(val)}
              className={cls}
              onClick={() => handleSelect(val)}
              whileHover={!submitted ? { scale: 1.03 } : {}}
              whileTap={!submitted ? { scale: 0.97 } : {}}
            >
              {val ? '✅ TRUE' : '❌ FALSE'}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

// Fill in blanks
const FillBlanksActivity: React.FC<Props> = ({ activity, onComplete }) => {
  const parts = (activity.content.sentence ?? '').split('___');
  const blanks = activity.content.blanks ?? [];
  const [answers, setAnswers] = useState<string[]>(blanks.map(() => ''));
  const [submitted, setSubmitted] = useState(false);
  const colors = COLOR_MAP[activity.color] ?? COLOR_MAP.orange;

  const handleSubmit = () => {
    const correct = blanks.every((b, i) => answers[i].trim().toLowerCase() === b.toLowerCase());
    setSubmitted(true);
    setTimeout(() => onComplete(correct), 1200);
  };

  return (
    <div className="space-y-6">
      <div className={`text-lg font-semibold text-white leading-relaxed flex flex-wrap items-center gap-1 p-4 rounded-xl bg-black/30 border ${colors.border}`}>
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            <span>{part}</span>
            {i < blanks.length && (
              <input
                type="text"
                value={answers[i]}
                onChange={e => {
                  const next = [...answers];
                  next[i] = e.target.value;
                  setAnswers(next);
                }}
                disabled={submitted}
                className={`border-b-2 ${submitted ? (answers[i].trim().toLowerCase() === blanks[i].toLowerCase() ? 'border-green-500 text-green-300' : 'border-red-500 text-red-300') : `${colors.border} text-yellow-300`} bg-transparent outline-none w-28 text-center mx-1 font-bold`}
                placeholder="..."
              />
            )}
          </React.Fragment>
        ))}
      </div>
      {submitted && (
        <div className="text-center">
          <p className="text-gray-400 text-sm">Correct answers: <span className="text-yellow-400 font-bold">{blanks.join(', ')}</span></p>
        </div>
      )}
      {!submitted && (
        <motion.button
          onClick={handleSubmit}
          disabled={answers.some(a => !a.trim())}
          className={`w-full py-3 rounded-xl font-black text-lg ${answers.every(a => a.trim()) ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-black hover:brightness-110' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Check Answers
        </motion.button>
      )}
    </div>
  );
};

// Matching
const MatchingActivity: React.FC<Props> = ({ activity, onComplete }) => {
  const pairs = activity.content.pairs ?? [];
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<Record<string, string>>({});
  const rights = pairs.map(p => p.right);
  const colors = COLOR_MAP[activity.color] ?? COLOR_MAP.green;

  const handleRight = (right: string) => {
    if (!selectedLeft) return;
    const newMatched = { ...matched, [selectedLeft]: right };
    setMatched(newMatched);
    setSelectedLeft(null);
    if (Object.keys(newMatched).length === pairs.length) {
      const allCorrect = pairs.every(p => newMatched[p.left] === p.right);
      setTimeout(() => onComplete(allCorrect), 600);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-2">
        <h4 className={`font-bold ${colors.text} text-sm mb-3`}>Terms</h4>
        {pairs.map(p => {
          const isMatched = matched[p.left] !== undefined;
          const isSelected = selectedLeft === p.left;
          return (
            <motion.button
              key={p.left}
              onClick={() => !isMatched && setSelectedLeft(isSelected ? null : p.left)}
              className={`w-full text-left px-4 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${
                isMatched ? 'border-green-500 bg-green-500/20 text-green-300 cursor-default' :
                isSelected ? `${colors.border} bg-white/10 ${colors.text}` :
                'border-gray-600 text-gray-300 hover:border-gray-400 cursor-pointer'
              }`}
              whileHover={!isMatched ? { scale: 1.02 } : {}}
            >
              {isMatched ? `✓ ` : ''}{p.left}
            </motion.button>
          );
        })}
      </div>
      <div className="space-y-2">
        <h4 className={`font-bold ${colors.text} text-sm mb-3`}>Definitions</h4>
        {rights.map(r => {
          const isMatched = Object.values(matched).includes(r);
          const matchedLeft = Object.entries(matched).find(([, v]) => v === r)?.[0];
          return (
            <motion.button
              key={r}
              onClick={() => !isMatched && handleRight(r)}
              className={`w-full text-left px-4 py-2.5 rounded-xl border-2 text-sm transition-all ${
                isMatched ? 'border-green-500 bg-green-500/20 text-green-300 cursor-default' :
                selectedLeft ? `${colors.border} text-white hover:bg-white/10 cursor-pointer` :
                'border-gray-600 text-gray-300 cursor-default'
              }`}
              whileHover={selectedLeft && !isMatched ? { scale: 1.02 } : {}}
            >
              {isMatched ? `✓ ${matchedLeft} → ` : ''}{r}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

// Speaking
const SpeakingActivity: React.FC<Props> = ({ activity, onComplete }) => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const colors = COLOR_MAP[activity.color] ?? COLOR_MAP.purple;
  const expected = activity.content.expectedSentence ?? '';

  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition not supported in this browser.'); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const said = e.results[0][0].transcript;
      setTranscript(said);
      const similarity = calcSimilarity(said.toLowerCase(), expected.toLowerCase());
      setScore(Math.round(similarity * 100));
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
    setTranscript('');
    setScore(null);
  }, [expected]);

  function calcSimilarity(a: string, b: string): number {
    const wordsA = a.split(/\s+/).filter(Boolean);
    const wordsB = b.split(/\s+/).filter(Boolean);
    const setB = new Set(wordsB);
    const common = wordsA.filter(w => setB.has(w)).length;
    return common / Math.max(wordsA.length, wordsB.length, 1);
  }

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => onComplete((score ?? 0) >= 50), 1000);
  };

  return (
    <div className="space-y-5">
      <div className={`p-4 rounded-xl border ${colors.border} bg-black/30`}>
        <p className="text-gray-400 text-sm mb-1">Say this sentence:</p>
        <p className={`text-xl font-bold ${colors.text}`}>"{expected}"</p>
        <button onClick={() => speak(expected, null, 0.85)} className="mt-2 text-xs text-gray-400 hover:text-white transition-colors">🔊 Listen first</button>
      </div>
      <div className="flex flex-col items-center gap-4">
        <motion.button
          onClick={listening ? () => recognitionRef.current?.stop() : startListening}
          className={`w-20 h-20 rounded-full border-4 flex items-center justify-center text-3xl transition-all ${listening ? 'border-red-500 bg-red-500/20' : `${colors.border} bg-white/5 hover:bg-white/10`}`}
          animate={listening ? { scale: [1, 1.1, 1], boxShadow: ['0 0 0px red', '0 0 20px red', '0 0 0px red'] } : {}}
          transition={{ duration: 1, repeat: Infinity }}
          whileHover={{ scale: 1.05 }}
        >
          {listening ? '🛑' : '🎤'}
        </motion.button>
        {listening && <p className="text-red-400 font-bold animate-pulse">🔴 Listening...</p>}
        {transcript && (
          <div className="w-full bg-black/30 rounded-xl p-4 border border-gray-600">
            <p className="text-gray-400 text-sm mb-1">You said:</p>
            <p className="text-white font-semibold">"{transcript}"</p>
            {score !== null && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-400">Match Score</span>
                  <span className={`font-black text-lg ${score >= 70 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{score}%</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
        {score !== null && !submitted && (
          <motion.button
            onClick={handleSubmit}
            className="px-8 py-3 rounded-xl font-black bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:brightness-110 transition-all"
            whileHover={{ scale: 1.05 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Submit
          </motion.button>
        )}
      </div>
    </div>
  );
};

// Word Scramble
const WordScrambleActivity: React.FC<Props> = ({ activity, onComplete }) => {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const correct = activity.content.correctWord ?? '';
  const scrambled = activity.content.scrambledWord ?? '';
  const colors = COLOR_MAP[activity.color] ?? COLOR_MAP.gold;

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => onComplete(answer.trim().toUpperCase() === correct.toUpperCase()), 1000);
  };

  return (
    <div className="space-y-6 text-center">
      <div className={`p-6 rounded-2xl border-2 ${colors.border} bg-black/30`}>
        <p className="text-gray-400 text-sm mb-2">Unscramble this word:</p>
        <p className={`text-4xl font-black tracking-widest ${colors.text}`}>
          {scrambled.split('').join(' ')}
        </p>
      </div>
      <input
        type="text"
        value={answer}
        onChange={e => setAnswer(e.target.value.toUpperCase())}
        placeholder="Type the word..."
        className={`w-full bg-gray-800 border-2 ${submitted ? (answer.toUpperCase() === correct.toUpperCase() ? 'border-green-500 text-green-300' : 'border-red-500 text-red-300') : colors.border} text-white text-center text-2xl font-black rounded-xl px-4 py-3 outline-none tracking-widest`}
        disabled={submitted}
        onKeyDown={e => e.key === 'Enter' && !submitted && handleSubmit()}
      />
      {submitted && answer.toUpperCase() !== correct.toUpperCase() && (
        <p className="text-gray-400">The answer was: <span className="text-yellow-400 font-bold">{correct}</span></p>
      )}
      {!submitted && (
        <motion.button
          onClick={handleSubmit}
          disabled={!answer.trim()}
          className={`w-full py-3 rounded-xl font-black text-lg ${answer.trim() ? `bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:brightness-110` : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Check!
        </motion.button>
      )}
    </div>
  );
};

// Ordering
const OrderingActivity: React.FC<Props> = ({ activity, onComplete }) => {
  const original = activity.content.orderedItems ?? [];
  const [items, setItems] = useState(() => [...original].sort(() => Math.random() - 0.5));
  const [submitted, setSubmitted] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const colors = COLOR_MAP[activity.color] ?? COLOR_MAP.teal;

  const moveItem = (from: number, to: number) => {
    const next = [...items];
    const [removed] = next.splice(from, 1);
    next.splice(to, 0, removed);
    setItems(next);
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const correct = items.every((item, i) => item === original[i]);
    setTimeout(() => onComplete(correct), 1000);
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">Drag to reorder:</p>
      {items.map((item, i) => (
        <motion.div
          key={item}
          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-grab active:cursor-grabbing ${submitted ? (item === original[i] ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10') : `${colors.border} bg-black/30 hover:bg-white/5`}`}
          draggable
          onDragStart={() => setDragIdx(i)}
          onDragOver={e => { e.preventDefault(); if (dragIdx !== null && dragIdx !== i) moveItem(dragIdx, i); setDragIdx(i); }}
          onDragEnd={() => setDragIdx(null)}
          layout
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <span className={`font-black text-xl ${colors.text} w-8`}>{i + 1}</span>
          <span className="text-white text-sm flex-1">{item}</span>
          <span className="text-gray-500">⠿</span>
        </motion.div>
      ))}
      {!submitted && (
        <motion.button
          onClick={handleSubmit}
          className={`w-full py-3 rounded-xl font-black text-lg bg-gradient-to-r from-teal-600 to-blue-600 text-white hover:brightness-110`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Check Order
        </motion.button>
      )}
    </div>
  );
};

// Drag & Drop Sequence
const DragDropActivity: React.FC<Props> = ({ activity, onComplete }) => {
  const items = activity.content.items ?? [];
  const targets = activity.content.targets ?? [];
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [dragItem, setDragItem] = useState<string | null>(null);
  const colors = COLOR_MAP[activity.color] ?? COLOR_MAP.orange;
  const usedItems = Object.values(assignments);

  const handleDrop = (target: string) => {
    if (!dragItem) return;
    setAssignments(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { if (next[k] === dragItem) delete next[k]; });
      next[target] = dragItem;
      return next;
    });
    setDragItem(null);
  };

  const handleSubmit = () => {
    const correct = targets.every((t, i) => assignments[t] === items[i]);
    onComplete(correct);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {items.filter(item => !usedItems.includes(item)).map(item => (
          <motion.div
            key={item}
            className={`px-4 py-2 rounded-xl border-2 ${colors.border} ${colors.text} bg-black/30 cursor-grab font-semibold text-sm`}
            draggable
            onDragStart={() => setDragItem(item)}
            whileHover={{ scale: 1.05 }}
            whileDrag={{ scale: 1.1, zIndex: 999 }}
          >
            {item}
          </motion.div>
        ))}
      </div>
      <div className="space-y-3">
        {targets.map(target => (
          <div
            key={target}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 border-dashed ${assignments[target] ? colors.border : 'border-gray-600'} bg-black/20 min-h-12`}
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(target)}
          >
            <span className="text-gray-400 text-sm w-20 flex-shrink-0">{target}:</span>
            {assignments[target] ? (
              <span className={`font-semibold ${colors.text} text-sm`}>{assignments[target]}</span>
            ) : (
              <span className="text-gray-600 text-xs">Drop here...</span>
            )}
          </div>
        ))}
      </div>
      {Object.keys(assignments).length === targets.length && (
        <motion.button
          onClick={handleSubmit}
          className="w-full py-3 rounded-xl font-black text-lg bg-gradient-to-r from-orange-500 to-yellow-500 text-black hover:brightness-110"
          whileHover={{ scale: 1.02 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Check!
        </motion.button>
      )}
    </div>
  );
};

// Would You Rather
const WouldYouRatherActivity: React.FC<Props> = ({ activity, onComplete }) => {
  const [selected, setSelected] = useState<1 | 2 | null>(null);
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const colors = COLOR_MAP[activity.color] ?? COLOR_MAP.purple;

  const handleSubmit = () => {
    if (!selected || !reason.trim()) return;
    setSubmitted(true);
    setTimeout(() => onComplete(true), 800);
  };

  return (
    <div className="space-y-5">
      <p className={`text-center font-black text-xl ${colors.text}`}>🤔 Would You Rather...?</p>
      <div className="grid grid-cols-2 gap-4">
        {[activity.content.wouldYouOption1, activity.content.wouldYouOption2].map((opt, i) => (
          <motion.button
            key={i}
            onClick={() => !submitted && setSelected((i + 1) as 1 | 2)}
            className={`p-4 rounded-2xl border-2 font-semibold text-sm text-center min-h-28 flex items-center justify-center transition-all ${selected === i + 1 ? `${colors.border} ${colors.text} bg-white/10` : 'border-gray-600 text-gray-300 hover:border-gray-400'}`}
            whileHover={!submitted ? { scale: 1.03 } : {}}
            whileTap={!submitted ? { scale: 0.97 } : {}}
          >
            <div>
              <div className="text-3xl mb-2">{i === 0 ? '🅰️' : '🅱️'}</div>
              {opt}
            </div>
          </motion.button>
        ))}
      </div>
      {selected && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Why did you choose this? Give your reason..."
            className={`w-full bg-gray-800 border-2 ${colors.border} text-white rounded-xl px-4 py-3 h-24 outline-none resize-none text-sm`}
            disabled={submitted}
          />
          {!submitted && (
            <motion.button
              onClick={handleSubmit}
              disabled={!reason.trim()}
              className={`w-full py-3 mt-3 rounded-xl font-black text-lg ${reason.trim() ? `bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:brightness-110` : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
              whileHover={{ scale: 1.02 }}
            >
              Share My Choice!
            </motion.button>
          )}
        </motion.div>
      )}
    </div>
  );
};

// Discussion
const DiscussionActivity: React.FC<Props> = ({ activity, onComplete }) => {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const colors = COLOR_MAP[activity.color] ?? COLOR_MAP.blue;

  return (
    <div className="space-y-5">
      <div className={`p-4 rounded-xl border ${colors.border} bg-black/30`}>
        <p className={`text-lg font-semibold ${colors.text} leading-relaxed`}>{activity.content.discussionPrompt}</p>
      </div>
      <textarea
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        placeholder="Share your thoughts..."
        className={`w-full bg-gray-800 border-2 ${colors.border} text-white rounded-xl px-4 py-3 h-32 outline-none resize-none`}
        disabled={submitted}
      />
      {!submitted && (
        <motion.button
          onClick={() => { setSubmitted(true); setTimeout(() => onComplete(answer.trim().length > 20), 800); }}
          disabled={answer.trim().length < 10}
          className={`w-full py-3 rounded-xl font-black text-lg ${answer.trim().length >= 10 ? `bg-gradient-to-r from-blue-600 to-teal-600 text-white hover:brightness-110` : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
          whileHover={{ scale: 1.02 }}
        >
          Share Response (min 10 chars)
        </motion.button>
      )}
    </div>
  );
};

// Predict Next
const PredictNextActivity: React.FC<Props> = ({ activity, onComplete }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [showConsequence, setShowConsequence] = useState(false);
  const opts = activity.content.predictOptions ?? [];
  const colors = COLOR_MAP[activity.color] ?? COLOR_MAP.purple;

  const handleSelect = (i: number) => {
    setSelected(i);
    setShowConsequence(true);
  };

  return (
    <div className="space-y-4">
      <p className="text-white font-semibold">{activity.content.question}</p>
      <div className="grid gap-3">
        {opts.map((opt, i) => (
          <motion.button
            key={i}
            onClick={() => !showConsequence && handleSelect(i)}
            className={`w-full text-left p-4 rounded-xl border-2 font-semibold text-sm transition-all ${selected === i ? `${colors.border} ${colors.text} bg-white/10` : 'border-gray-600 text-gray-300 hover:border-gray-400 hover:bg-white/5'}`}
            whileHover={!showConsequence ? { scale: 1.01 } : {}}
          >
            🔮 {opt.text}
          </motion.button>
        ))}
      </div>
      <AnimatePresence>
        {showConsequence && selected !== null && (
          <motion.div
            className={`p-4 rounded-xl border ${colors.border} bg-white/5`}
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          >
            <p className={`font-bold ${colors.text} mb-1`}>Consequence:</p>
            <p className="text-gray-200 text-sm">{opts[selected].consequence}</p>
            <motion.button
              onClick={() => onComplete(true)}
              className="mt-3 px-6 py-2 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:brightness-110"
              whileHover={{ scale: 1.05 }}
            >
              Continue →
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Voice Over
const VoiceOverActivity: React.FC<Props> = ({ activity, onComplete }) => {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { addRecording } = useStore();

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    chunksRef.current = [];
    recorder.ondataavailable = e => chunksRef.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      addRecording(url, `VoiceOver_${Date.now()}`);
      stream.getTracks().forEach(t => t.stop());
    };
    recorder.start();
    setRecording(true);
  };

  const stop = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="space-y-5 text-center">
      <div className="p-4 rounded-xl bg-black/30 border border-yellow-500/30">
        <p className="text-gray-400 text-sm mb-2">Narrate this:</p>
        <p className="text-white font-semibold italic">{activity.content.question}</p>
      </div>
      <motion.button
        onClick={recording ? stop : start}
        className={`w-24 h-24 mx-auto rounded-full border-4 flex items-center justify-center text-4xl ${recording ? 'border-red-500 bg-red-500/20' : 'border-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20'}`}
        animate={recording ? { scale: [1, 1.05, 1], boxShadow: ['0 0 0px red', '0 0 25px red', '0 0 0px red'] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
        whileHover={{ scale: recording ? 1 : 1.05 }}
      >
        {recording ? '🛑' : '🎬'}
      </motion.button>
      <p className="text-gray-400 text-sm">{recording ? '🔴 Recording... Click to stop' : 'Click to start recording'}</p>
      {audioUrl && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <audio src={audioUrl} controls className="w-full" />
          <motion.button
            onClick={() => onComplete(true)}
            className="w-full py-3 rounded-xl font-black bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:brightness-110"
            whileHover={{ scale: 1.02 }}
          >
            🎬 Submit Recording!
          </motion.button>
        </motion.div>
      )}
    </div>
  );
};

// Reflection
const ReflectionActivity: React.FC<Props> = ({ activity, onComplete }) => {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { addJournalEntry } = useStore();
  const colors = COLOR_MAP[activity.color] ?? COLOR_MAP.pink;

  const handleSubmit = () => {
    if (!answer.trim()) return;
    addJournalEntry(activity.content.reflectionPrompt ?? '', answer);
    setSubmitted(true);
    setTimeout(() => onComplete(true), 600);
  };

  return (
    <div className="space-y-5">
      <div className={`p-4 rounded-xl border ${colors.border} bg-black/30`}>
        <p className={`font-semibold ${colors.text} leading-relaxed`}>{activity.content.reflectionPrompt}</p>
      </div>
      <textarea
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        placeholder="Write your reflection here..."
        className={`w-full bg-gray-800 border-2 ${submitted ? 'border-green-500' : colors.border} text-white rounded-xl px-4 py-3 h-36 outline-none resize-none`}
        disabled={submitted}
      />
      {!submitted && (
        <motion.button
          onClick={handleSubmit}
          disabled={answer.trim().length < 15}
          className={`w-full py-3 rounded-xl font-black text-lg ${answer.trim().length >= 15 ? `bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:brightness-110` : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
          whileHover={{ scale: 1.02 }}
        >
          📝 Save to Journal
        </motion.button>
      )}
      {submitted && <p className="text-center text-green-400 font-bold">✅ Saved to your journal!</p>}
    </div>
  );
};

// Truth or Dare
const TruthOrDareActivity: React.FC<Props> = ({ activity, onComplete }) => {
  const [choice, setChoice] = useState<'truth' | 'dare' | null>(null);
  const [answer, setAnswer] = useState('');
  const _colors = COLOR_MAP[activity.color] ?? COLOR_MAP.orange; void _colors;

  return (
    <div className="space-y-5 text-center">
      {!choice ? (
        <div className="grid grid-cols-2 gap-4">
          <motion.button
            onClick={() => setChoice('truth')}
            className="py-10 rounded-2xl border-4 border-blue-500 text-blue-400 font-black text-2xl hover:bg-blue-500/20 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            💬 TRUTH
          </motion.button>
          <motion.button
            onClick={() => setChoice('dare')}
            className="py-10 rounded-2xl border-4 border-red-500 text-red-400 font-black text-2xl hover:bg-red-500/20 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🔥 DARE
          </motion.button>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
          <div className={`p-5 rounded-2xl border-2 ${choice === 'truth' ? 'border-blue-500 bg-blue-500/10' : 'border-red-500 bg-red-500/10'}`}>
            <p className="text-2xl mb-3">{choice === 'truth' ? '💬' : '🔥'}</p>
            <p className="text-white font-semibold text-lg">{choice === 'truth' ? activity.content.truth : activity.content.dare}</p>
          </div>
          <textarea
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="Your response..."
            className="w-full bg-gray-800 border-2 border-gray-600 text-white rounded-xl px-4 py-3 h-24 outline-none resize-none"
          />
          <motion.button
            onClick={() => onComplete(answer.trim().length > 5)}
            disabled={answer.trim().length <= 5}
            className={`w-full py-3 rounded-xl font-black text-lg ${answer.trim().length > 5 ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:brightness-110' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
            whileHover={{ scale: 1.02 }}
          >
            Submit!
          </motion.button>
        </motion.div>
      )}
    </div>
  );
};

// Hotspot Activity
const HotspotActivity: React.FC<Props> = ({ activity, onComplete }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const hotspot = activity.content.hotspot;
  const colors = COLOR_MAP[activity.color] ?? COLOR_MAP.teal;

  if (!hotspot) return <div className="text-white">No hotspot data</div>;

  const handleSubmit = () => {
    if (!selected) return;
    const opt = hotspot.options?.find(o => o.id === selected);
    setSubmitted(true);
    setTimeout(() => onComplete(opt?.isCorrect ?? false), 1000);
  };

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-xl border ${colors.border} bg-black/30`}>
        <p className="text-white text-lg font-semibold">{hotspot.question}</p>
        {hotspot.hint && <p className="text-gray-400 text-sm mt-2">💡 Hint: {hotspot.hint}</p>}
      </div>
      {hotspot.options && (
        <div className="grid gap-2">
          {hotspot.options.map(opt => (
            <motion.button
              key={opt.id}
              onClick={() => !submitted && setSelected(opt.id)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                !submitted
                  ? selected === opt.id
                    ? `${colors.border} ${colors.text} bg-white/10`
                    : 'border-gray-600 text-gray-300 hover:border-gray-400'
                  : opt.isCorrect
                    ? 'border-green-500 bg-green-500/20 text-green-300'
                    : selected === opt.id
                      ? 'border-red-500 bg-red-500/20 text-red-300'
                      : 'border-gray-700 text-gray-500'
              }`}
              whileHover={!submitted ? { scale: 1.01 } : {}}
            >
              {opt.text}
            </motion.button>
          ))}
        </div>
      )}
      {!submitted && hotspot.options && (
        <motion.button
          onClick={handleSubmit}
          disabled={!selected}
          className={`w-full py-3 rounded-xl font-black text-lg ${selected ? 'bg-gradient-to-r from-teal-500 to-blue-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
          whileHover={selected ? { scale: 1.02 } : {}}
        >
          Submit
        </motion.button>
      )}
    </div>
  );
};

// VideoPause Activity
const VideoPauseActivity: React.FC<Props> = ({ activity, onComplete }) => {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const colors = COLOR_MAP[activity.color] ?? COLOR_MAP.orange;

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-xl border ${colors.border} bg-black/30`}>
        <p className={`text-lg font-semibold ${colors.text}`}>🎬 Video Pause Question</p>
        <p className="text-white mt-2">{activity.content.videoPausePrompt || activity.content.question}</p>
      </div>
      <textarea
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        placeholder="Share your thoughts..."
        className={`w-full bg-gray-800 border-2 ${colors.border} text-white rounded-xl px-4 py-3 h-32 outline-none resize-none`}
        disabled={submitted}
      />
      {!submitted && (
        <motion.button
          onClick={() => { setSubmitted(true); setTimeout(() => onComplete(answer.trim().length > 10), 800); }}
          disabled={answer.trim().length < 5}
          className={`w-full py-3 rounded-xl font-black text-lg ${answer.trim().length >= 5 ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-black' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
          whileHover={{ scale: 1.02 }}
        >
          Submit Response
        </motion.button>
      )}
    </div>
  );
};

// Reading Challenge Activity
const ReadingChallengeActivity: React.FC<Props> = ({ activity, onComplete }) => {
  const [phase, setPhase] = useState<'read' | 'questions' | 'whatif'>('read');
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showTranslation, setShowTranslation] = useState(false);
  const [whatIfChoice, setWhatIfChoice] = useState<number | null>(null);
  const colors = COLOR_MAP[activity.color] ?? COLOR_MAP.blue;
  const reading = activity.content.reading;
  const whatIf = activity.content.whatIfScenario;
  const { learnerL1 } = useStore();

  if (!reading && !whatIf) return <div className="text-white">No reading content</div>;

  const currentQuestion = reading?.questions[questionIdx];
  const allCorrect = reading?.questions.every((q, i) => {
    const ans = answers[i];
    return q.options.find(o => o.id === ans)?.isCorrect;
  });

  return (
    <div className="space-y-4">
      {/* Genre badge */}
      <div className="flex items-center gap-2">
        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
          reading?.genre === 'fiction' ? 'bg-purple-500/20 text-purple-400' :
          reading?.genre === 'whatIf' ? 'bg-orange-500/20 text-orange-400' :
          'bg-blue-500/20 text-blue-400'
        }`}>
          {reading?.genre === 'fiction' ? '📖 Fiction' : reading?.genre === 'whatIf' ? '🔮 What If?' : '📰 Factual'}
        </span>
        <span className="text-gray-500 text-sm">{reading?.title || whatIf?.scenario?.slice(0, 40)}...</span>
      </div>

      {phase === 'read' && reading && (
        <div className="space-y-4">
          <div className={`p-5 rounded-2xl border ${colors.border} bg-black/30 max-h-64 overflow-y-auto`}>
            <p className="text-white leading-relaxed whitespace-pre-line">{reading.text}</p>
          </div>
          {reading.translation && (
            <div>
              <button
                onClick={() => setShowTranslation(!showTranslation)}
                className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
              >
                🌍 {showTranslation ? 'Hide' : 'Show'} {learnerL1.toUpperCase()} Translation
              </button>
              {showTranslation && (
                <div className="mt-2 p-3 bg-gray-800/50 rounded-xl text-gray-300 text-sm italic">
                  {reading.translation}
                </div>
              )}
            </div>
          )}
          <button onClick={() => speak(reading.text, null, 0.9)} className="text-sm text-gray-400 hover:text-white">
            🔊 Read Aloud
          </button>
          <motion.button
            onClick={() => setPhase('questions')}
            className={`w-full py-3 rounded-xl font-black text-lg bg-gradient-to-r ${colors.text === 'text-blue-400' ? 'from-blue-600 to-teal-600' : 'from-purple-600 to-pink-600'} text-white`}
            whileHover={{ scale: 1.02 }}
          >
            📝 Answer Questions
          </motion.button>
        </div>
      )}

      {phase === 'questions' && reading && currentQuestion && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Question {questionIdx + 1} of {reading.questions.length}</span>
            <div className="flex gap-1">
              {reading.questions.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${answers[i] ? 'bg-green-500' : i === questionIdx ? 'bg-yellow-500' : 'bg-gray-600'}`} />
              ))}
            </div>
          </div>
          <p className="text-white font-semibold">{currentQuestion.question}</p>
          <div className="grid gap-2">
            {currentQuestion.options.map(opt => (
              <button
                key={opt.id}
                onClick={() => setAnswers({ ...answers, [questionIdx]: opt.id })}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all ${
                  answers[questionIdx] === opt.id
                    ? `${colors.border} ${colors.text} bg-white/10`
                    : 'border-gray-600 text-gray-300 hover:border-gray-400'
                }`}
              >
                {opt.text}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {questionIdx > 0 && (
              <button onClick={() => setQuestionIdx(questionIdx - 1)} className="px-4 py-2 bg-gray-800 text-white rounded-xl">
                ← Back
              </button>
            )}
            <motion.button
              onClick={() => {
                if (questionIdx < reading.questions.length - 1) {
                  setQuestionIdx(questionIdx + 1);
                } else if (whatIf) {
                  setPhase('whatif');
                } else {
                  onComplete(allCorrect ?? false);
                }
              }}
              disabled={!answers[questionIdx]}
              className={`flex-1 py-3 rounded-xl font-black ${answers[questionIdx] ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
              whileHover={{ scale: 1.02 }}
            >
              {questionIdx < reading.questions.length - 1 ? 'Next →' : whatIf ? 'What If? →' : 'Finish'}
            </motion.button>
          </div>
        </div>
      )}

      {phase === 'whatif' && whatIf && (
        <div className="space-y-4">
          <div className={`p-4 rounded-xl border ${colors.border} bg-black/30`}>
            <p className="text-orange-400 font-bold mb-2">🔮 What If...?</p>
            <p className="text-white">{whatIf.scenario}</p>
          </div>
          <div className="grid gap-3">
            {whatIf.options.map((opt, i) => (
              <motion.button
                key={i}
                onClick={() => setWhatIfChoice(i)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  whatIfChoice === i
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-gray-600 hover:border-gray-400'
                }`}
                whileHover={{ scale: 1.01 }}
              >
                <p className="text-white font-semibold">{opt.choice}</p>
                {whatIfChoice === i && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 pt-2 border-t border-gray-700"
                  >
                    <p className="text-orange-300 text-sm">💫 {opt.consequence}</p>
                    {opt.followUp && <p className="text-gray-400 text-xs mt-1">{opt.followUp}</p>}
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>
          {whatIfChoice !== null && (
            <motion.button
              onClick={() => onComplete(true)}
              className="w-full py-3 rounded-xl font-black text-lg bg-gradient-to-r from-orange-500 to-yellow-500 text-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileHover={{ scale: 1.02 }}
            >
              Continue →
            </motion.button>
          )}
        </div>
      )}
    </div>
  );
};

// Listening Comprehension Activity
const ListeningComprehensionActivity: React.FC<Props> = ({ activity, onComplete }) => {
  const [phase, setPhase] = useState<'listen' | 'questions'>('listen');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const colors = COLOR_MAP[activity.color] ?? COLOR_MAP.purple;
  const listening = activity.content.listening;
  const { learnerL1 } = useStore();

  if (!listening) return <div className="text-white">No listening content</div>;

  const currentQuestion = listening.questions[questionIdx];

  const handlePlay = () => {
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      speak(listening.audioText, null, 0.9, () => setIsPlaying(false));
    }
  };

  const allCorrect = listening.questions.every((q, i) => {
    const ans = answers[i];
    return q.options.find(o => o.id === ans)?.isCorrect;
  });

  return (
    <div className="space-y-4">
      {/* Genre badge */}
      <div className="flex items-center gap-2">
        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
          listening.genre === 'podcast' ? 'bg-purple-500/20 text-purple-400' :
          listening.genre === 'dialogue' ? 'bg-teal-500/20 text-teal-400' :
          listening.genre === 'interview' ? 'bg-blue-500/20 text-blue-400' :
          listening.genre === 'story' ? 'bg-pink-500/20 text-pink-400' :
          'bg-orange-500/20 text-orange-400'
        }`}>
          {listening.genre === 'podcast' ? '🎙️ Podcast' :
           listening.genre === 'dialogue' ? '💬 Dialogue' :
           listening.genre === 'interview' ? '🎤 Interview' :
           listening.genre === 'story' ? '📖 Story' : '🎤 Talk'}
        </span>
        <span className="text-gray-400 text-sm">{listening.title}</span>
      </div>

      {phase === 'listen' && (
        <div className="space-y-4">
          {/* Audio player visual */}
          <div className={`p-6 rounded-2xl border ${colors.border} bg-black/30 text-center`}>
            <motion.button
              onClick={handlePlay}
              className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl ${isPlaying ? 'bg-red-500' : 'bg-purple-500'}`}
              animate={isPlaying ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
            >
              {isPlaying ? '⏹' : '▶️'}
            </motion.button>
            <p className="text-gray-400 mt-3 text-sm">{isPlaying ? 'Playing...' : 'Click to listen'}</p>
            {isPlaying && (
              <div className="flex justify-center gap-1 mt-3">
                {[0, 1, 2, 3, 4].map(i => (
                  <motion.div
                    key={i}
                    className="w-1.5 bg-purple-500 rounded-full"
                    animate={{ height: [10, 30, 10] }}
                    transition={{ duration: 0.5, delay: i * 0.1, repeat: Infinity }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Transcript toggle */}
          {listening.showTranscript && (
            <div>
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
              >
                📄 {showTranscript ? 'Hide' : 'Show'} Transcript
              </button>
              <AnimatePresence>
                {showTranscript && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 p-4 bg-gray-800/50 rounded-xl text-gray-300 text-sm max-h-40 overflow-y-auto"
                  >
                    {listening.audioText}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Translation */}
          {listening.translation && (
            <div className="p-3 bg-gray-800/30 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">🌍 {learnerL1.toUpperCase()} Translation:</p>
              <p className="text-gray-400 text-sm italic">{listening.translation}</p>
            </div>
          )}

          <motion.button
            onClick={() => setPhase('questions')}
            className="w-full py-3 rounded-xl font-black text-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white"
            whileHover={{ scale: 1.02 }}
          >
            📝 Answer Questions
          </motion.button>
        </div>
      )}

      {phase === 'questions' && currentQuestion && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Question {questionIdx + 1} of {listening.questions.length}</span>
            <button onClick={handlePlay} className="text-sm text-purple-400 hover:text-purple-300">
              🔊 Replay audio
            </button>
          </div>
          <p className="text-white font-semibold">{currentQuestion.question}</p>
          <div className="grid gap-2">
            {currentQuestion.options.map(opt => (
              <button
                key={opt.id}
                onClick={() => setAnswers({ ...answers, [questionIdx]: opt.id })}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all ${
                  answers[questionIdx] === opt.id
                    ? `${colors.border} ${colors.text} bg-white/10`
                    : 'border-gray-600 text-gray-300 hover:border-gray-400'
                }`}
              >
                {opt.text}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {questionIdx > 0 && (
              <button onClick={() => setQuestionIdx(questionIdx - 1)} className="px-4 py-2 bg-gray-800 text-white rounded-xl">
                ← Back
              </button>
            )}
            <motion.button
              onClick={() => {
                if (questionIdx < listening.questions.length - 1) {
                  setQuestionIdx(questionIdx + 1);
                } else {
                  onComplete(allCorrect);
                }
              }}
              disabled={!answers[questionIdx]}
              className={`flex-1 py-3 rounded-xl font-black ${answers[questionIdx] ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
              whileHover={{ scale: 1.02 }}
            >
              {questionIdx < listening.questions.length - 1 ? 'Next →' : 'Finish'}
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Activity Modal
export const ActivityModal: React.FC = () => {
  const {
    currentActivity, setCurrentActivity,
    setIsPlaying, addXP, incrementStreak, resetStreak,
    completeActivity, setShowConfetti, setShakeScreen,
    learner, lesson,
    setCatMood, setCatMessage, catMuted, catVoice,
    addBadge, setShowBadgeModal, updateLeaderboard,
    showCountdown, setShowCountdown, pendingActivity, setPendingActivity,
  } = useStore();

  const [countdown, setCountdown] = useState(3);
  const [showLesson, setShowLesson] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<{ msg: string; correct: boolean } | null>(null);

  // Countdown
  useEffect(() => {
    if (!showCountdown || !pendingActivity) return;
    setCountdown(3);
    let c = 3;
    const iv = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(iv);
        setShowCountdown(false);
        setCurrentActivity(pendingActivity);
        setPendingActivity(null);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [showCountdown, pendingActivity, setShowCountdown, setCurrentActivity, setPendingActivity]);

  const handleComplete = useCallback((correct: boolean, skipped = false) => {
    if (!currentActivity) return;
    const act = currentActivity;

    if (skipped) {
      setFeedbackMsg({ msg: '⏭ Skipped – no XP earned', correct: false });
      setTimeout(() => {
        setFeedbackMsg(null);
        setCurrentActivity(null);
        setIsPlaying(true);
      }, 1200);
      return;
    }

    completeActivity(act.id);

    if (correct) {
      addXP(act.points);
      incrementStreak();
      setShowConfetti(true);
      fireConfetti();
      setTimeout(() => setShowConfetti(false), 3500);

      // Badge checks
      const newStreak = learner.streak + 1;
      if (!learner.completedActivities.length) {
        addBadge('first_answer'); setShowBadgeModal('first_answer');
      }
      if (newStreak >= 5) {
        addBadge('streak_5'); setShowBadgeModal('streak_5');
      }
      if (act.type === 'speaking') {
        addBadge('perfect_speaker'); setShowBadgeModal('perfect_speaker');
      }
      if (['flashcard','multipleChoice','fillBlanks','wordScramble'].includes(act.type)) {
        const vocabCount = learner.completedActivities.filter(id => {
          const found = lesson?.segments.flatMap(s => s.activities).find(a => a.id === id);
          return found && ['flashcard','multipleChoice','fillBlanks'].includes(found.type);
        }).length;
        if (vocabCount >= 2) { addBadge('word_master'); setShowBadgeModal('word_master'); }
      }

      // Cat feedback
      const catMsg = act.catFeedback?.correct ?? '🐱 Purrfect! Well done!';
      setCatMood('😸');
      setCatMessage(catMsg);
      speakWithCatVoice(catMsg, catVoice, catMuted);

      setFeedbackMsg({ msg: act.correctFeedback, correct: true });
    } else {
      resetStreak();
      setShakeScreen(true);
      setTimeout(() => setShakeScreen(false), 820);

      const catMsg = act.catFeedback?.incorrect ?? '😿 Oh no! Try again!';
      setCatMood('😿');
      setCatMessage(catMsg);
      speakWithCatVoice(catMsg, catVoice, catMuted);

      setFeedbackMsg({ msg: act.incorrectFeedback, correct: false });
    }

    updateLeaderboard();

    setTimeout(() => {
      setFeedbackMsg(null);
      setCurrentActivity(null);
      setShowLesson(true);
      setIsPlaying(true);
    }, 2500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentActivity, completeActivity, addXP, incrementStreak, resetStreak, setShowConfetti, setShakeScreen, setCurrentActivity, setIsPlaying, learner, lesson, addBadge, setShowBadgeModal, setCatMood, setCatMessage, catMuted, catVoice, updateLeaderboard]);

  const colors = currentActivity ? (COLOR_MAP[currentActivity.color] ?? COLOR_MAP.gold) : COLOR_MAP.gold;

  const renderActivity = (act: Activity) => {
    const props: Props = { activity: act, onComplete: handleComplete };
    switch (act.type) {
      case 'flashcard': return <FlashcardActivity {...props} />;
      case 'multipleChoice': return <MultipleChoiceActivity {...props} />;
      case 'trueFalse': return <TrueFalseActivity {...props} />;
      case 'fillBlanks': return <FillBlanksActivity {...props} />;
      case 'matching': return <MatchingActivity {...props} />;
      case 'speaking': return <SpeakingActivity {...props} />;
      case 'wordScramble': return <WordScrambleActivity {...props} />;
      case 'ordering': return <OrderingActivity {...props} />;
      case 'dragDrop': return <DragDropActivity {...props} />;
      case 'wouldYouRather': return <WouldYouRatherActivity {...props} />;
      case 'discussion': return <DiscussionActivity {...props} />;
      case 'predictNext': return <PredictNextActivity {...props} />;
      case 'voiceOver': return <VoiceOverActivity {...props} />;
      case 'reflection': return <ReflectionActivity {...props} />;
      case 'truthOrDare': return <TruthOrDareActivity {...props} />;
      case 'hotspot': return <HotspotActivity {...props} />;
      case 'videoPause': return <VideoPauseActivity {...props} />;
      case 'readingChallenge': return <ReadingChallengeActivity {...props} />;
      case 'listeningComprehension': return <ListeningComprehensionActivity {...props} />;
      default: return <div className="text-white text-center">Activity type: {act.type}</div>;
    }
  };

  return (
    <>
      {/* Countdown overlay */}
      <AnimatePresence>
        {showCountdown && pendingActivity && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.85)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="text-center">
              <motion.div
                key={countdown}
                className="text-9xl font-black"
                style={{ color: countdown === 1 ? '#ef4444' : countdown === 2 ? '#f97316' : '#22c55e' }}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.4, type: 'spring' }}
              >
                {countdown}
              </motion.div>
              <motion.p className="text-white text-2xl mt-4 font-bold" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity }}>
                {pendingActivity.emoji} {pendingActivity.title || 'Activity incoming...'}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activity modal */}
      <AnimatePresence>
        {currentActivity && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.92)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 ${colors.border} bg-gray-950 shadow-2xl`}
              style={{ boxShadow: colors.glow }}
              initial={{ scale: 0.7, rotateX: -15, y: 80 }}
              animate={{ scale: 1, rotateX: 0, y: 0 }}
              exit={{ scale: 0.7, rotateX: 15, y: 80 }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            >
              {/* Header */}
              <div className={`bg-gradient-to-r ${colors.bg} p-5 rounded-t-3xl flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{currentActivity.emoji}</span>
                  <div>
                    <h3 className={`font-black text-lg ${colors.text}`}>{currentActivity.title || currentActivity.type}</h3>
                    <div className="flex gap-2 text-xs text-gray-400">
                      <span className="capitalize">{currentActivity.type}</span>
                      <span>·</span>
                      <span className="text-yellow-400 font-bold">+{currentActivity.points} XP</span>
                      <span>·</span>
                      <span className="capitalize">{currentActivity.difficulty}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleComplete(false, true)}
                  className="text-gray-400 hover:text-gray-200 text-sm px-3 py-1 rounded-lg border border-gray-600 hover:border-gray-400 transition-colors"
                >
                  Skip ⏭
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Lesson content toggle */}
                {currentActivity.lessonContent && (
                  <button
                    onClick={() => setShowLesson(!showLesson)}
                    className={`text-sm font-bold ${colors.text} opacity-80 hover:opacity-100 flex items-center gap-2`}
                  >
                    📖 {showLesson ? 'Hide' : 'Show'} Lesson Content
                  </button>
                )}

                {/* Lesson content */}
                <AnimatePresence>
                  {showLesson && <LessonContentPanel activity={currentActivity} colors={colors} />}
                </AnimatePresence>

                {/* Activity */}
                {renderActivity(currentActivity)}

                {/* Feedback */}
                <AnimatePresence>
                  {feedbackMsg && (
                    <motion.div
                      className={`p-4 rounded-xl font-bold text-center text-lg ${feedbackMsg.correct ? 'bg-green-500/20 border border-green-500 text-green-300' : 'bg-red-500/20 border border-red-500 text-red-300'}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {feedbackMsg.correct ? '🎉 ' : '💔 '}{feedbackMsg.msg}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
