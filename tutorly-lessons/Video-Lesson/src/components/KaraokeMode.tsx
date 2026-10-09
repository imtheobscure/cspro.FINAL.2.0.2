import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store';
import { speak, stopSpeaking, getBestNaturalVoice } from '../utils/tts';

interface KaraokeWord {
  word: string;
  spoken: boolean;
  active: boolean;
}

export const KaraokeMode: React.FC = () => {
  const {
    karaokeMode, setKaraokeMode,
    currentSubtitle, subtitles,
    setIsPlaying, catVoice,
  } = useStore();

  const [words, setWords] = useState<KaraokeWord[]>([]);
  const [listening, setListening] = useState(false);
  const [karaokePhase, setKaraokePhase] = useState<'idle' | 'tts' | 'listen' | 'done'>('idle');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [lineIdx, setLineIdx] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!karaokeMode) {
      stopSpeaking();
      recognitionRef.current?.abort();
      streamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      setListening(false);
      setKaraokePhase('idle');
      return;
    }
    const firstLine = subtitles.findIndex(s => s.text.trim().length > 0);
    setLineIdx(Math.max(0, firstLine));
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      streamRef.current = stream;
    }).catch(() => { /* mic denied */ });
  }, [karaokeMode, subtitles]);

  useEffect(() => {
    if (!karaokeMode || !currentSubtitle) return;
    const idx = subtitles.indexOf(currentSubtitle);
    if (idx === lineIdx) return;
    setLineIdx(idx);
    handleNewLine(currentSubtitle.text);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSubtitle, karaokeMode]);

  const handleNewLine = useCallback((text: string) => {
    setIsPlaying(false);
    stopSpeaking();
    setKaraokePhase('tts');
    setAccuracy(null);
    setWords(text.split(' ').map(w => ({ word: w, spoken: false, active: false })));
    const voice = catVoice ? window.speechSynthesis?.getVoices().find(v => v.name === catVoice) : getBestNaturalVoice();
    speak(text, voice ?? null, 0.85, () => {
      setKaraokePhase('listen');
      startRecognition(text);
    });
    const wordArr = text.split(' ');
    const totalDur = (text.length / 8) * 1000;
    wordArr.forEach((_, i) => {
      setTimeout(() => {
        setWords(prev => prev.map((w, j) => ({
          ...w,
          active: j === i,
          spoken: j < i,
        })));
      }, (i / wordArr.length) * totalDur);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catVoice, setIsPlaying]);

  const startRecognition = (expected: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    let transcript = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          transcript += e.results[i][0].transcript + ' ';
        } else {
          interim = e.results[i][0].transcript;
        }
      }
      const current = (transcript + interim).toLowerCase();
      const spokenWords = current.split(/\s+/);
      setWords(prev => prev.map((w, i) => ({
        ...w,
        spoken: spokenWords.some((sw: string) => sw.includes(w.word.toLowerCase().replace(/[^a-z]/g, ''))),
        active: i === spokenWords.length - 1,
      })));
    };
    rec.onstop = () => {
      setListening(false);
      const expWords = expected.toLowerCase().split(/\s+/).filter(Boolean);
      const spkWords = transcript.toLowerCase().split(/\s+/).filter(Boolean);
      const matched = expWords.filter((ew: string) => spkWords.some((sw: string) => sw.includes(ew.replace(/[^a-z]/g, '')))).length;
      const acc = Math.round((matched / Math.max(expWords.length, 1)) * 100);
      setAccuracy(acc);
      setKaraokePhase('done');
      setTimeout(() => {
        setIsPlaying(true);
        setKaraokePhase('idle');
      }, 2000);
    };
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
    setTimeout(() => {
      try { rec.stop(); } catch { /* ignore */ }
    }, 8000);
  };

  if (!karaokeMode) return null;

  return (
    <motion.div
      className="bg-gray-950/95 border border-purple-500/40 rounded-2xl p-5 shadow-2xl"
      style={{ boxShadow: '0 0 30px rgba(168,85,247,0.3)' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-purple-400 font-black flex items-center gap-2">
          🎤 Karaoke Mode
          {listening && (
            <motion.span
              className="text-red-400 text-sm"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              ● REC
            </motion.span>
          )}
        </h3>
        <button
          onClick={() => setKaraokeMode(false)}
          className="text-gray-400 hover:text-white text-sm px-3 py-1 rounded-lg border border-gray-700"
        >
          Exit
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {(['tts', 'listen', 'done'] as const).map(phase => (
          <div
            key={phase}
            className={`flex-1 h-1.5 rounded-full transition-all ${
              karaokePhase === phase ? 'bg-purple-500' :
              karaokePhase === 'done' ? 'bg-purple-900' :
              'bg-gray-800'
            }`}
          />
        ))}
      </div>

      <p className="text-center text-sm text-gray-400 mb-4">
        {karaokePhase === 'idle' && '⏳ Waiting for next line...'}
        {karaokePhase === 'tts' && '🔊 Listen carefully...'}
        {karaokePhase === 'listen' && '🎤 Your turn! Repeat what you heard.'}
        {karaokePhase === 'done' && accuracy !== null && (
          accuracy >= 80 ? `🌟 Excellent! ${accuracy}% accuracy!` :
          accuracy >= 50 ? `👍 Good try! ${accuracy}% accuracy` :
          `💪 Keep practicing! ${accuracy}% accuracy`
        )}
      </p>

      {words.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center min-h-16 items-center p-3 bg-black/30 rounded-xl mb-4">
          {words.map((w, i) => (
            <motion.span
              key={i}
              className={`text-lg md:text-xl font-bold transition-all px-1 rounded ${
                w.spoken ? 'text-green-400' :
                w.active ? 'text-yellow-400 scale-110' :
                'text-gray-500'
              }`}
              animate={w.active ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              {w.word}
            </motion.span>
          ))}
        </div>
      )}

      {accuracy !== null && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Accuracy</span>
            <span className={accuracy >= 70 ? 'text-green-400' : accuracy >= 40 ? 'text-yellow-400' : 'text-red-400'}>{accuracy}%</span>
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${accuracy >= 70 ? 'bg-green-500' : accuracy >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${accuracy}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
        </motion.div>
      )}

      <p className="text-center text-gray-600 text-xs mt-3">
        Click a subtitle word to look it up · Mic activates automatically
      </p>
    </motion.div>
  );
};
