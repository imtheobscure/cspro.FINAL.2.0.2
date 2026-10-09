import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { speakWithCatVoice, stopSpeaking, getVoices, getBestNaturalVoice } from '../utils/tts';

const CAT_MOODS: Record<string, { label: string; tip: string }> = {
  '😺': { label: 'Happy', tip: 'Ready to help!' },
  '😸': { label: 'Excited', tip: 'Great answer!' },
  '😹': { label: 'Laughing', tip: 'Haha! Too funny!' },
  '😻': { label: 'Love', tip: 'You\'re amazing!' },
  '😼': { label: 'Smug', tip: 'I knew that.' },
  '😽': { label: 'Content', tip: 'Purring happily...' },
  '🙀': { label: 'Shocked', tip: 'What?! Really?!' },
  '😿': { label: 'Sad', tip: 'Try again, friend...' },
  '😾': { label: 'Grumpy', tip: 'Do better!' },
  '🐱': { label: 'Neutral', tip: 'I\'m watching you...' },
};

export const CatWidget: React.FC = () => {
  const {
    catMood, setCatMood, catMuted, setCatMuted,
    catVoice, setCatVoice, catMessage,
  } = useStore();

  const [open, setOpen] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const loadVoices = () => {
      const v = getVoices();
      if (v.length > 0) {
        setVoices(v);
        if (!catVoice) {
          const best = getBestNaturalVoice();
          if (best) setCatVoice(best.name);
        }
      }
    };
    loadVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
  }, [catVoice, setCatVoice]);

  // Auto-speak when cat message changes
  useEffect(() => {
    if (!catMessage || catMuted) return;
    clearTimeout(speakTimeoutRef.current);
    speakTimeoutRef.current = setTimeout(() => {
      setIsSpeaking(true);
      speakWithCatVoice(catMessage, catVoice, catMuted, () => setIsSpeaking(false));
    }, 300);
  }, [catMessage, catMuted, catVoice]);

  const handleMute = () => {
    if (!catMuted) stopSpeaking();
    setCatMuted(!catMuted);
  };

  const moodInfo = CAT_MOODS[catMood] ?? CAT_MOODS['😺'];

  const handleCatClick = () => {
    setOpen(!open);
    if (!open && catMessage) {
      speakWithCatVoice(catMessage, catVoice, catMuted, () => setIsSpeaking(false));
      setIsSpeaking(true);
    }
  };

  // Filter to best quality voices
  const naturalVoices = voices.filter(v => {
    const bad = ['Microsoft David', 'Microsoft Mark', 'Microsoft Zira', 'Alex (English'];
    return !bad.some(b => v.name.includes(b));
  });

  return (
    <div className="fixed bottom-6 right-6 z-[80] flex flex-col items-end gap-3">
      {/* Chat bubble */}
      <AnimatePresence>
        {open && catMessage && (
          <motion.div
            className="bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 max-w-xs shadow-2xl relative"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
          >
            <div className="text-white text-sm leading-relaxed">{catMessage}</div>
            {isSpeaking && (
              <div className="flex gap-1 mt-2">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 bg-yellow-400 rounded-full"
                    animate={{ scaleY: [1, 2, 1] }}
                    transition={{ duration: 0.5, delay: i * 0.15, repeat: Infinity }}
                  />
                ))}
              </div>
            )}
            {/* Triangle pointer */}
            <div className="absolute -bottom-2 right-6 w-4 h-4 bg-gray-900 border-r border-b border-gray-700 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice selector panel */}
      <AnimatePresence>
        {showVoice && (
          <motion.div
            className="bg-gray-900 border border-gray-700 rounded-2xl p-4 w-72 shadow-2xl"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
          >
            <h4 className="text-yellow-400 font-bold mb-3 text-sm">🗣️ Cat Voice</h4>
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
              {naturalVoices.map(v => (
                <button
                  key={v.name}
                  onClick={() => { setCatVoice(v.name); speakWithCatVoice('Testing, testing! Meow!', v.name, false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${catVoice === v.name ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50' : 'text-gray-300 hover:bg-gray-800'}`}
                >
                  <div className="font-semibold">{v.name}</div>
                  <div className="text-gray-500">{v.lang}</div>
                </button>
              ))}
              {naturalVoices.length === 0 && <p className="text-gray-500 text-xs">No voices available yet. Try refreshing.</p>}
            </div>
            <button onClick={() => setShowVoice(false)} className="mt-3 w-full text-xs text-gray-400 hover:text-white">Close</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mood buttons */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="bg-gray-900 border border-gray-700 rounded-2xl p-3 flex flex-wrap gap-2 max-w-xs shadow-xl"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <div className="w-full text-xs text-gray-400 font-semibold mb-1">Mood: {moodInfo.label} · {moodInfo.tip}</div>
            {Object.keys(CAT_MOODS).map(mood => (
              <button
                key={mood}
                onClick={() => { setCatMood(mood); setOpen(false); }}
                className={`text-2xl rounded-lg p-1 transition-all hover:scale-110 ${catMood === mood ? 'bg-yellow-500/20 ring-1 ring-yellow-500' : 'hover:bg-gray-800'}`}
              >
                {mood}
              </button>
            ))}
            <div className="w-full flex gap-2 mt-2">
              <button
                onClick={handleMute}
                className={`flex-1 text-xs py-1.5 rounded-lg font-bold transition-colors ${catMuted ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-gray-800 text-gray-300 hover:text-white'}`}
              >
                {catMuted ? '🔇 Muted' : '🔊 Mute'}
              </button>
              <button
                onClick={() => setShowVoice(!showVoice)}
                className="flex-1 text-xs py-1.5 rounded-lg font-bold bg-gray-800 text-gray-300 hover:text-white transition-colors"
              >
                🗣️ Voice
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main cat button */}
      <motion.button
        onClick={handleCatClick}
        className="relative w-16 h-16 rounded-full border-2 border-yellow-500/50 bg-gray-900 shadow-2xl text-4xl flex items-center justify-center hover:border-yellow-400 transition-all"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          boxShadow: isSpeaking
            ? ['0 0 10px rgba(255,215,0,0.3)', '0 0 25px rgba(255,215,0,0.6)', '0 0 10px rgba(255,215,0,0.3)']
            : ['0 0 10px rgba(255,215,0,0.1)', '0 0 20px rgba(255,215,0,0.2)', '0 0 10px rgba(255,215,0,0.1)'],
        }}
        transition={{ duration: isSpeaking ? 0.5 : 2, repeat: Infinity }}
      >
        <motion.span
          key={catMood}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          {catMood}
        </motion.span>
        {catMuted && (
          <div className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center text-xs">🔇</div>
        )}
        {isSpeaking && !catMuted && (
          <div className="absolute -bottom-1 -right-1 flex gap-0.5">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-1 h-1 bg-yellow-400 rounded-full"
                animate={{ scaleY: [1, 3, 1] }}
                transition={{ duration: 0.4, delay: i * 0.1, repeat: Infinity }}
              />
            ))}
          </div>
        )}
      </motion.button>
    </div>
  );
};
