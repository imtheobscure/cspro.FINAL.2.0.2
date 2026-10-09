import React, { useState, useEffect, useRef } from 'react';
import { Question, PowerUpType } from '../types/game';
import { POWER_UP_CONFIG } from '../data/sampleQuestions';
import { DEFAULT_FRUIT_TRIGGERS, voiceService } from '../utils/speechRecognition';
import { soundManager } from '../utils/audio';
import { Volume2, Mic, Clock, CheckCircle2, XCircle, Sparkles, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuestionModalProps {
  question: Question;
  powerUpReward: PowerUpType;
  isSurvivorRescue?: boolean;
  survivorName?: string;
  isMicActive: boolean;
  onAnswerResult: (correct: boolean, reward: PowerUpType) => void;
}

export const QuestionModal: React.FC<QuestionModalProps> = ({
  question,
  powerUpReward,
  isSurvivorRescue = false,
  survivorName = 'Ally Survivor',
  isMicActive,
  onAnswerResult,
}) => {
  // Timer State
  const initialTime = question.difficultySeconds || 20;
  const [timeLeft, setTimeLeft] = useState<number>(initialTime);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // Multi-select state
  const [selectedMultiIndices, setSelectedMultiIndices] = useState<number[]>([]);

  // Spelling state
  const [typedSpelling, setTypedSpelling] = useState<string>('');

  // Unscramble state
  const [scrambledPool, setScrambledPool] = useState<{ id: string; word: string }[]>([]);
  const [placedWords, setPlacedWords] = useState<{ id: string; word: string }[]>([]);

  // Sorting state
  const [sortingItems, setSortingItems] = useState<{ text: string; category: 'A' | 'B'; placedIn?: 'A' | 'B' }[]>([]);

  // Mic state feedback
  const [micTranscript, setMicTranscript] = useState<string>('');
  const [recognizedFruit, setRecognizedFruit] = useState<string | null>(null);
  const [isSpeakingTTS, setIsSpeakingTTS] = useState<boolean>(false);
  const [micNotice, setMicNotice] = useState('');
  const answeredRef = useRef(false);
  const continuedRef = useRef(false);
  const mountedRef = useRef(true);

  const powerConfig = POWER_UP_CONFIG[powerUpReward] || POWER_UP_CONFIG.gatling_overload;
  const isMicSupported = voiceService.isSupported();

  // Setup Fruit trigger mapping for multiple choice / true false
  const fruitChoices = DEFAULT_FRUIT_TRIGGERS.slice(0, 4);

  // Initialize question type data
  useEffect(() => {
    mountedRef.current = true;
    answeredRef.current = false;
    continuedRef.current = false;
    setTimeLeft(initialTime);
    setIsAnswered(false);
    setIsCorrect(false);
    setSelectedIdx(null);
    setSelectedMultiIndices([]);
    setTypedSpelling('');
    setRecognizedFruit(null);
    setMicTranscript('');

    if (question.type === 'unscramble') {
      const words = question.scrambledWords || [];
      setScrambledPool(words.map((w, i) => ({ id: `${w}_${i}`, word: w.replace(/[^\p{L}\p{N}]/gu, '') })));
      setPlacedWords([]);
    }

    if (question.type === 'sorting') {
      setSortingItems(question.items.map(it => ({ ...it, placedIn: undefined })));
    }

    let autoPlay: ReturnType<typeof setTimeout> | undefined;
    if (question.type === 'listening' && question.audioScript) {
      autoPlay = setTimeout(() => handlePlayTTS(question.audioScript), 180);
    }
    return () => {
      mountedRef.current = false;
      if (autoPlay) clearTimeout(autoPlay);
      voiceService.stop();
      soundManager.stopSpeaking();
    };
  }, [question]);

  // Speech Recognition listener binding
  useEffect(() => {
    if (!isMicActive || isAnswered || isSpeakingTTS) return;

    let keywords: { word: string; index: number }[] = [];
    if (question.type === 'multiple_choice' || question.type === 'listening' || question.type === 'reading' || question.type === 'multi_select') {
      keywords = fruitChoices.slice(0, question.options.length).map((f, idx) => ({ word: f.word, index: idx }));
    } else if (question.type === 'true_false') {
      keywords = [
        { word: 'kiwi', index: 0 },    // True
        { word: 'avocado', index: 1 }, // False
      ];
    }
    if (!keywords.length) return;

    voiceService.setCallbacks(
      (index: number, word: string) => {
        setRecognizedFruit(word);
        if (question.type === 'multi_select') handleToggleMultiOption(index);
        else handleSelectOption(index);
      },
      (transcript: string) => {
        setMicTranscript(transcript);
      },
      (state, message) => {
        if (state === 'error') {
          setMicNotice(message || 'Microphone unavailable. Click an answer instead.');
        } else if (state === 'listening') {
          setMicNotice('Listening for fruit words');
        }
      }
    );

    voiceService.startListening(keywords);

    return () => {
      voiceService.stop();
    };
  }, [isMicActive, question, isAnswered, isSpeakingTTS]);

  // Countdown timer
  useEffect(() => {
    if (isAnswered || isSpeakingTTS) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isAnswered, isSpeakingTTS]);

  useEffect(() => {
    if (isAnswered || isSpeakingTTS) return;
    if (timeLeft <= 0) handleTimeOut();
    else if (timeLeft <= 5) soundManager.playTick();
  }, [timeLeft, isAnswered, isSpeakingTTS]);

  const handleTimeOut = () => {
    if (answeredRef.current) return;
    finalizeAnswer(false);
  };

  const handlePlayTTS = async (text: string) => {
    if (!mountedRef.current) return;
    voiceService.stop();
    setIsSpeakingTTS(true);
    await soundManager.speak(text, 0.92);
    if (mountedRef.current) setIsSpeakingTTS(false);
  };

  const handleSelectOption = (idx: number) => {
    if (answeredRef.current) return;
    setSelectedIdx(idx);

    let correct = false;
    if (question.type === 'multiple_choice' || question.type === 'listening' || question.type === 'reading') {
      correct = idx === question.correctIndex;
    } else if (question.type === 'true_false') {
      correct = (idx === 0 && question.isTrue) || (idx === 1 && !question.isTrue);
    }

    finalizeAnswer(correct);
  };

  const handleToggleMultiOption = (idx: number) => {
    if (answeredRef.current) return;
    setSelectedMultiIndices(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleConfirmMultiSelect = () => {
    if (isAnswered || question.type !== 'multi_select') return;
    const correctSet = new Set(question.correctIndices);
    const chosenSet = new Set(selectedMultiIndices);
    const isExactMatch = correctSet.size === chosenSet.size && 
      [...correctSet].every(item => chosenSet.has(item));

    finalizeAnswer(isExactMatch);
  };

  const handleConfirmSpelling = () => {
    if (isAnswered || question.type !== 'spelling') return;
    // Sanitized comparison without spaces or punctuation
    const cleanTyped = typedSpelling.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
    const cleanTarget = question.correctWord.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
    finalizeAnswer(cleanTyped === cleanTarget);
  };

  const handleTileClickInPool = (item: { id: string; word: string }) => {
    if (isAnswered) return;
    setScrambledPool(prev => prev.filter(w => w.id !== item.id));
    setPlacedWords(prev => [...prev, item]);
  };

  const handleTileClickInPlaced = (item: { id: string; word: string }) => {
    if (isAnswered) return;
    setPlacedWords(prev => prev.filter(w => w.id !== item.id));
    setScrambledPool(prev => [...prev, item]);
  };

  const handleConfirmUnscramble = () => {
    if (isAnswered || question.type !== 'unscramble') return;
    const formed = placedWords.map(w => w.word).join(' ').replace(/[^\p{L}\p{N}\s]/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');
    const cleanTarget = question.correctSentence
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .toLowerCase()
      .trim().replace(/\s+/g, ' ');
    finalizeAnswer(formed === cleanTarget);
  };

  const handleSortItem = (itemText: string, targetCat: 'A' | 'B') => {
    if (isAnswered) return;
    setSortingItems(prev => prev.map(item => 
      item.text === itemText ? { ...item, placedIn: targetCat } : item
    ));
  };

  const handleConfirmSorting = () => {
    if (isAnswered || question.type !== 'sorting') return;
    const allAssigned = sortingItems.every(it => it.placedIn !== undefined);
    if (!allAssigned) return;

    const allCorrect = sortingItems.every(it => it.placedIn === it.category);
    finalizeAnswer(allCorrect);
  };

  const finalizeAnswer = (correct: boolean) => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    voiceService.stop();
    soundManager.stopSpeaking();
    setIsAnswered(true);
    setIsCorrect(correct);

    if (correct) {
      soundManager.playCorrect();
      confetti({
        particleCount: 50,
        spread: 60,
        colors: ['#e7c38b', '#aac9a1', '#e9e5ce'],
        disableForReducedMotion: true,
        origin: { y: 0.6 }
      });
    } else {
      soundManager.playWrong();
    }
  };

  const handleContinue = () => {
    if (continuedRef.current) return;
    continuedRef.current = true;
    onAnswerResult(isCorrect, powerUpReward);
  };

  // Progress percentage for timer bar
  const timerPercent = Math.max(0, (timeLeft / initialTime) * 100);

  return (
    <div className="knowledge-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div role="dialog" aria-modal="true" aria-labelledby="knowledge-title" className="knowledge-gate relative w-full max-w-3xl bg-slate-900 border-2 border-amber-500/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 px-6 py-3.5 flex items-center justify-between border-b border-amber-400/40">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{isSurvivorRescue ? '👩‍⚕️' : powerConfig.icon}</span>
            <div>
              <div className="text-xs font-black tracking-widest text-amber-200 uppercase">
                {isSurvivorRescue ? `RESCUE ALLY EVENT: ${survivorName}` : 'POWER-UP KNOWLEDGE GATE'}
              </div>
              <h2 id="knowledge-title" className="text-lg font-extrabold text-white leading-tight">
                CEFR {question.cefr} Tactical Challenge
              </h2>
            </div>
          </div>

          {/* Reward Badge */}
          <div className="flex items-center gap-2 bg-slate-900/60 px-3.5 py-1.5 rounded-lg border border-amber-300/40">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <div className="text-right">
              <span className="text-[10px] text-amber-200 font-bold block uppercase tracking-wider">Reward</span>
              <span className="text-xs font-extrabold text-white">{powerConfig.name}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Timer Bar */}
        <div className="w-full bg-slate-800 h-2.5 relative">
          <div 
            className={`h-full transition-all duration-1000 ${
              timeLeft <= 5 ? 'bg-red-500' : timeLeft <= 10 ? 'bg-amber-400' : 'bg-emerald-500'
            }`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>

        {/* Subheader Timer & Audio Indicator */}
        <div className="px-6 py-2 bg-slate-950/80 flex items-center justify-between text-xs font-semibold text-slate-300 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 ${timeLeft <= 5 ? 'text-red-400 animate-bounce' : 'text-amber-400'}`} />
            <span>Time Remaining: <strong className={timeLeft <= 5 ? 'text-red-400 text-sm' : 'text-amber-300 text-sm'}>{timeLeft}s</strong></span>
          </div>

          {/* Microphone Status Banner if Active */}
          {isMicActive && isMicSupported && (
            <div className="flex items-center gap-2 bg-sky-950/80 border border-sky-500/50 px-2.5 py-1 rounded-full text-sky-300">
              <Mic className="w-3.5 h-3.5 animate-pulse text-sky-400" />
              <span>{micNotice || 'Voice enabled: speak a fruit word'}</span>
              {recognizedFruit ? (
                <span className="bg-sky-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded">
                  Heard: {recognizedFruit}
                </span>
              ) : micTranscript ? (
                <span className="bg-slate-800 text-slate-300 text-[11px] px-2 py-0.5 rounded truncate max-w-[150px]">
                  "{micTranscript}"
                </span>
              ) : null}
            </div>
          )}
        </div>

        {/* Content Body with Large Screen Sharing Fonts */}
        <div className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[68vh]">
          
          {/* Question Prompt */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-5 shadow-inner">
            <h3 className="text-xl md:text-2xl font-bold text-white leading-relaxed">
              {question.prompt}
            </h3>
            {question.type === 'true_false' && <p className="mt-4 text-xl md:text-2xl leading-relaxed text-amber-100">{question.statement}</p>}

            {/* If Listening question, show high quality audio button */}
            {question.type === 'listening' && (
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  disabled={isSpeakingTTS}
                  onClick={() => handlePlayTTS(question.audioScript)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md ${
                    isSpeakingTTS 
                      ? 'bg-sky-500 text-white animate-pulse' 
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  }`}
                >
                  <Volume2 className="w-5 h-5" />
                  {isSpeakingTTS ? 'Reading aloud...' : 'Listen to the briefing'}
                </button>
                <span className="text-xs text-slate-400">Browser voice / timer pauses during playback</span>
              </div>
            )}

            {/* If Reading question, show reading passage */}
            {question.type === 'reading' && (
              <div className="mt-4 p-4 bg-slate-900/90 rounded-lg border-l-4 border-amber-400 text-slate-200 text-base md:text-lg leading-relaxed">
                {question.readingPassage}
                <p className="mt-4 text-xl font-bold text-white">{question.question}</p>
              </div>
            )}
          </div>

          {/* Interactive Question Answering Views */}

          {/* 1. Multiple Choice / Listening / Reading */}
          {(question.type === 'multiple_choice' || question.type === 'listening' || question.type === 'reading') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {question.options.map((opt, idx) => {
                const fruit = fruitChoices[idx] || DEFAULT_FRUIT_TRIGGERS[0];
                const isSelected = selectedIdx === idx;
                const isCorrectOpt = idx === question.correctIndex;

                let btnStyle = 'bg-slate-800 hover:bg-slate-700/90 border-slate-700 text-white';
                if (isAnswered) {
                  if (isCorrectOpt) {
                    btnStyle = 'bg-emerald-700/90 border-emerald-400 text-white ring-2 ring-emerald-400';
                  } else if (isSelected) {
                    btnStyle = 'bg-rose-900/80 border-rose-500 text-slate-200 line-through';
                  } else {
                    btnStyle = 'bg-slate-800/50 border-slate-700 text-slate-400 opacity-60';
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handleSelectOption(idx)}
                    className={`relative p-5 rounded-xl border-2 text-left font-semibold text-lg md:text-xl transition-all shadow-lg flex items-center justify-between group active:scale-[0.98] ${btnStyle}`}
                  >
                    <div className="flex flex-col items-start gap-3">
                      {/* Fruit Trigger Badge (for voice recognition & screen sharing) */}
                      <span className="inline-flex items-center gap-1.5 bg-slate-900/80 border border-slate-600 px-3 py-1.5 rounded-lg text-sm md:text-base font-bold shadow-sm">
                        <span className="text-xl">{fruit.emoji}</span>
                        <span className="text-amber-300 font-extrabold tracking-wide">{fruit.label}</span>
                      </span>
                      <span className="leading-snug">{opt}</span>
                    </div>

                    {isAnswered && isCorrectOpt && (
                      <CheckCircle2 className="w-7 h-7 text-emerald-300 shrink-0" />
                    )}
                    {isAnswered && isSelected && !isCorrectOpt && (
                      <XCircle className="w-7 h-7 text-rose-300 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* 2. True / False */}
          {question.type === 'true_false' && (
            <div className="grid grid-cols-2 gap-5">
              {[
                { label: 'TRUE', isVal: true, idx: 0, fruit: { emoji: '🥝', word: 'kiwi', label: 'Kiwi' } },
                { label: 'FALSE', isVal: false, idx: 1, fruit: { emoji: '🥑', word: 'avocado', label: 'Avocado' } },
              ].map(opt => {
                const isSelected = selectedIdx === opt.idx;
                const isTarget = question.isTrue === opt.isVal;

                let btnStyle = 'bg-slate-800 hover:bg-slate-700 border-slate-700';
                if (isAnswered) {
                  if (isTarget) {
                    btnStyle = 'bg-emerald-700 border-emerald-400 ring-2 ring-emerald-400';
                  } else if (isSelected) {
                    btnStyle = 'bg-rose-900 border-rose-500';
                  }
                }

                return (
                  <button
                    key={opt.idx}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handleSelectOption(opt.idx)}
                    className={`p-6 rounded-2xl border-2 text-center transition-all shadow-lg active:scale-95 ${btnStyle}`}
                  >
                    <div className="text-3xl mb-1">{opt.fruit.emoji}</div>
                    <div className="text-xs uppercase font-extrabold text-amber-300 mb-1">
                      Say "{opt.fruit.label}"
                    </div>
                    <div className="text-2xl md:text-3xl font-black text-white">{opt.label}</div>
                  </button>
                );
              })}
            </div>
          )}

          {/* 3. Multi-Select */}
          {question.type === 'multi_select' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {question.options.map((opt, idx) => {
                  const isChecked = selectedMultiIndices.includes(idx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isAnswered}
                      onClick={() => handleToggleMultiOption(idx)}
                      className={`p-4 rounded-xl border-2 text-left font-semibold text-lg flex items-center gap-3 transition-all ${
                        isChecked 
                          ? 'bg-amber-600/30 border-amber-400 text-white' 
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-md border flex items-center justify-center font-bold text-xs ${
                        isChecked ? 'bg-amber-500 border-amber-400 text-slate-950' : 'border-slate-500'
                      }`}>
                        {isChecked && '✓'}
                      </div>
                      <span>{opt}</span>
                      <span className="ml-auto text-xs text-amber-200">{fruitChoices[idx]?.emoji} {fruitChoices[idx]?.label}</span>
                    </button>
                  );
                })}
              </div>

              {!isAnswered && (
                <button
                  type="button"
                  onClick={handleConfirmMultiSelect}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-lg rounded-xl shadow-lg active:scale-98 transition-all"
                >
                  Confirm Selections
                </button>
              )}
            </div>
          )}

          {/* 4. Spelling (Zero Punctuation Glitch Protected!) */}
          {question.type === 'spelling' && (
            <div className="space-y-4">
              {question.clue && (
                <div className="p-4 bg-slate-950/90 rounded-xl border border-amber-500/30 text-amber-300 font-mono text-center text-xl tracking-widest font-bold">
                  {question.clue}
                </div>
              )}

              <div className="flex gap-3">
                <input
                  type="text"
                  autoFocus
                  disabled={isAnswered}
                  value={typedSpelling}
                  onChange={(e) => setTypedSpelling(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                  placeholder="Type word (letters only)..."
                  className="flex-1 bg-slate-950 border-2 border-slate-700 focus:border-amber-400 text-white text-2xl font-bold px-5 py-3.5 rounded-xl uppercase tracking-wider outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmSpelling();
                  }}
                />
                {!isAnswered && (
                  <button
                    type="button"
                    onClick={handleConfirmSpelling}
                    className="px-8 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-lg rounded-xl shadow-lg transition-all"
                  >
                    Submit
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 5. Unscramble (Carefully sanitized punctuation as requested!) */}
          {question.type === 'unscramble' && (
            <div className="space-y-5">
              {/* Placed Words Tray */}
              <div className="min-h-[70px] p-4 bg-slate-950/90 border-2 border-dashed border-amber-500/60 rounded-xl flex flex-wrap gap-2.5 items-center">
                {placedWords.length === 0 ? (
                  <span className="text-slate-500 italic text-base">Tap words below in the correct order to construct sentence...</span>
                ) : (
                  placedWords.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      disabled={isAnswered}
                      onClick={() => handleTileClickInPlaced(item)}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-lg rounded-lg shadow cursor-pointer active:scale-95 transition-all"
                    >
                      {item.word}
                    </button>
                  ))
                )}
              </div>

              {/* Scrambled Pool */}
              <div className="flex flex-wrap gap-2.5">
                {scrambledPool.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handleTileClickInPool(item)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold text-lg rounded-lg shadow active:scale-95 transition-all"
                  >
                    {item.word}
                  </button>
                ))}
              </div>

              {!isAnswered && (
                <button
                  type="button"
                  disabled={placedWords.length === 0}
                  onClick={handleConfirmUnscramble}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-black text-lg rounded-xl shadow-lg transition-all"
                >
                  Verify Sentence
                </button>
              )}
            </div>
          )}

          {/* 6. Sorting / Categorization */}
          {question.type === 'sorting' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Category A Bucket */}
                <div className="bg-sky-950/40 border border-sky-500/40 rounded-xl p-4 min-h-[140px]">
                  <h4 className="text-sm font-black text-sky-400 uppercase tracking-wider mb-2 text-center">
                    Category: {question.categoryA}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {sortingItems.filter(it => it.placedIn === 'A').map(it => (
                      <span key={it.text} className="px-3 py-1 bg-sky-600 text-white text-sm font-bold rounded shadow">
                        {it.text}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Category B Bucket */}
                <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-4 min-h-[140px]">
                  <h4 className="text-sm font-black text-rose-400 uppercase tracking-wider mb-2 text-center">
                    Category: {question.categoryB}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {sortingItems.filter(it => it.placedIn === 'B').map(it => (
                      <span key={it.text} className="px-3 py-1 bg-rose-600 text-white text-sm font-bold rounded shadow">
                        {it.text}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Unsorted Items */}
              {!isAnswered && (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="text-xs text-slate-400 font-bold uppercase">Tap category for each item:</div>
                  <div className="space-y-2">
                    {sortingItems.map(item => (
                      <div key={item.text} className="flex items-center justify-between bg-slate-800/80 px-4 py-2 rounded-lg">
                        <span className="font-bold text-white text-base">{item.text}</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSortItem(item.text, 'A')}
                            className={`px-3 py-1 rounded text-xs font-black transition-all ${
                              item.placedIn === 'A' ? 'bg-sky-500 text-white' : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {question.categoryA}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSortItem(item.text, 'B')}
                            className={`px-3 py-1 rounded text-xs font-black transition-all ${
                              item.placedIn === 'B' ? 'bg-rose-500 text-white' : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {question.categoryB}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmSorting}
                    className="w-full mt-3 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-lg rounded-xl shadow-lg"
                  >
                    Confirm Sortings
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Educational Feedback & Continue CTA */}
          {isAnswered && (
            <div className={`p-5 rounded-xl border-2 animate-in zoom-in-95 duration-200 ${
              isCorrect ? 'bg-emerald-950/70 border-emerald-500/80' : 'bg-rose-950/70 border-rose-500/80'
            }`}>
              <div className="flex items-start gap-4">
                {isCorrect ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0 mt-1" />
                ) : (
                  <ShieldAlert className="w-8 h-8 text-rose-400 shrink-0 mt-1" />
                )}
                <div className="flex-1 space-y-1.5">
                  <div className="text-xl font-extrabold text-white">
                    {isCorrect ? 'EXCELLENT! TACTICAL POWER-UP GRANTED!' : 'INCORRECT INTEL! WEAPON LOST.'}
                  </div>
                  {question.explanation && (
                    <p className="text-slate-300 text-base leading-relaxed">
                      {question.explanation}
                    </p>
                  )}
                  {isCorrect && (
                    <div className="text-sm font-bold text-amber-300 pt-1">
                      Granted: {powerConfig.icon} {powerConfig.name} - {powerConfig.description}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                autoFocus
                onClick={handleContinue}
                className="w-full mt-4 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xl rounded-xl shadow-xl transition-all active:scale-[0.99]"
              >
                RETURN TO COMBAT ➔
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
