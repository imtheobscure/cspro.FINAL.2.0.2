import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store';

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export const TranscriptPanel: React.FC = () => {
  const { subtitles, currentSubtitle, currentTime, setShowDictionary, setDictionaryWord } = useStore();
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentSubtitle]);

  const handleWordClick = (word: string) => {
    const clean = word.replace(/[^a-zA-Z'-]/g, '');
    if (!clean) return;
    setDictionaryWord(clean);
    setShowDictionary(true);
  };

  if (subtitles.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <div className="text-4xl mb-3">📄</div>
        <p className="text-sm">No subtitles loaded.<br />Drop a VTT/SRT file on the player.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
      {subtitles.map((cue) => {
        const isActive = currentSubtitle?.id === cue.id;
        const isPast = currentTime > cue.endTime;
        return (
          <motion.div
            key={cue.id}
            ref={isActive ? activeRef : undefined}
            className={`px-3 py-2 rounded-xl cursor-pointer transition-all text-sm ${
              isActive
                ? 'bg-yellow-500/10 border border-yellow-500/30'
                : isPast
                  ? 'opacity-50 hover:opacity-80'
                  : 'hover:bg-gray-800/50'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className={`text-[10px] font-mono mt-0.5 ${isActive ? 'text-yellow-400' : 'text-gray-600'}`}>
                {formatTime(cue.startTime)}
              </span>
              <p className={`flex-1 leading-relaxed ${isActive ? 'text-white font-semibold' : 'text-gray-400'}`}>
                {cue.text.split(' ').map((word, i) => (
                  <span
                    key={i}
                    className="cursor-pointer hover:text-yellow-300 hover:underline transition-colors"
                    onClick={() => handleWordClick(word)}
                  >
                    {word}{' '}
                  </span>
                ))}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
