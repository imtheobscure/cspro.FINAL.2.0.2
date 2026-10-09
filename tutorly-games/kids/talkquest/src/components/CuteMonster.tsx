'use client';

import React from 'react';
import { motion } from 'framer-motion';

export type MonsterMood = 'crying' | 'sad' | 'ok' | 'happy' | 'sleepy';

export const CuteMonster: React.FC<{
  mood?: MonsterMood;
  rocking?: boolean;
  size?: number;
}> = ({ mood = 'ok', rocking = false, size = 280 }) => {
  const palette: Record<MonsterMood, { body: string; belly: string; horn: string }> = {
    crying: { body: '#fb7185', belly: '#fecdd3', horn: '#fda4af' },
    sad: { body: '#fdba74', belly: '#ffedd5', horn: '#fb923c' },
    ok: { body: '#fbbf24', belly: '#fef3c7', horn: '#f59e0b' },
    happy: { body: '#34d399', belly: '#d1fae5', horn: '#6ee7b7' },
    sleepy: { body: '#a78bfa', belly: '#ede9fe', horn: '#c4b5fd' },
  };
  const c = palette[mood];

  const mouth =
    mood === 'crying' ? 'M 78 148 Q 110 128 142 148' :
    mood === 'sad' ? 'M 82 148 Q 110 138 138 148' :
    mood === 'ok' ? 'M 84 146 L 136 146' :
    mood === 'happy' ? 'M 78 142 Q 110 172 142 142' :
    'M 86 148 Q 110 154 134 148';

  return (
    <motion.div
      animate={rocking ? { rotate: [-6, 6, -6] } : { rotate: 0, y: [0, -8, 0] }}
      transition={rocking
        ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' }
        : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      style={{ width: size, height: size }}
      className="relative mx-auto"
    >
      <svg viewBox="0 0 220 240" width="100%" height="100%" aria-label="Baby Gloop">
        <defs>
          <radialGradient id="gloopBody" cx="40%" cy="30%">
            <stop offset="0%" stopColor={c.belly} />
            <stop offset="70%" stopColor={c.body} />
            <stop offset="100%" stopColor={c.body} />
          </radialGradient>
          <radialGradient id="gloopShadow" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#000" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <filter id="gloopSoft">
            <feGaussianBlur stdDeviation="0.4" />
          </filter>
        </defs>

        {/* Ground shadow */}
        <ellipse cx="110" cy="222" rx="58" ry="10" fill="url(#gloopShadow)" />

        {/* Feet */}
        <ellipse cx="78" cy="198" rx="22" ry="14" fill={c.body} />
        <ellipse cx="142" cy="198" rx="22" ry="14" fill={c.body} />
        <ellipse cx="78" cy="196" rx="14" ry="7" fill={c.belly} opacity="0.7" />
        <ellipse cx="142" cy="196" rx="14" ry="7" fill={c.belly} opacity="0.7" />

        {/* Arms */}
        <ellipse cx="42" cy="132" rx="18" ry="28" fill={c.body} transform="rotate(-18 42 132)" />
        <ellipse cx="178" cy="132" rx="18" ry="28" fill={c.body} transform="rotate(18 178 132)" />

        {/* Body */}
        <ellipse cx="110" cy="128" rx="78" ry="72" fill="url(#gloopBody)" />

        {/* Belly shine */}
        <ellipse cx="110" cy="150" rx="42" ry="32" fill={c.belly} opacity="0.55" />

        {/* Horns */}
        <path d="M 58 72 Q 48 28 70 68" fill={c.horn} />
        <path d="M 110 58 Q 110 12 122 62" fill={c.horn} />
        <path d="M 154 72 Q 172 28 148 68" fill={c.horn} />
        <circle cx="50" cy="30" r="7" fill={c.horn} />
        <circle cx="110" cy="16" r="8" fill={c.horn} />
        <circle cx="170" cy="30" r="7" fill={c.horn} />

        {/* Ears */}
        <ellipse cx="46" cy="96" rx="14" ry="18" fill={c.body} />
        <ellipse cx="174" cy="96" rx="14" ry="18" fill={c.body} />
        <ellipse cx="46" cy="98" rx="7" ry="10" fill="#fda4af" opacity="0.55" />
        <ellipse cx="174" cy="98" rx="7" ry="10" fill="#fda4af" opacity="0.55" />

        {/* Blush */}
        <ellipse cx="58" cy="138" rx="16" ry="10" fill="#fb7185" opacity="0.45" />
        <ellipse cx="162" cy="138" rx="16" ry="10" fill="#fb7185" opacity="0.45" />

        {/* Eyes */}
        {mood === 'sleepy' ? (
          <>
            <path d="M 70 118 Q 86 108 102 118" stroke="#1e293b" strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d="M 118 118 Q 134 108 150 118" stroke="#1e293b" strokeWidth="5" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <ellipse cx="86" cy="118" rx="18" ry={mood === 'crying' ? 22 : 20} fill="white" />
            <ellipse cx="134" cy="118" rx="18" ry={mood === 'crying' ? 22 : 20} fill="white" />
            <circle cx="90" cy={mood === 'sad' ? 124 : 120} r="8" fill="#1e293b" />
            <circle cx="138" cy={mood === 'sad' ? 124 : 120} r="8" fill="#1e293b" />
            <circle cx="86" cy={mood === 'sad' ? 118 : 114} r="3.2" fill="white" />
            <circle cx="134" cy={mood === 'sad' ? 118 : 114} r="3.2" fill="white" />
            {mood === 'happy' && (
              <>
                <path d="M 70 108 Q 86 100 102 108" stroke="#1e293b" strokeWidth="3" fill="none" opacity="0.25" />
                <path d="M 118 108 Q 134 100 150 108" stroke="#1e293b" strokeWidth="3" fill="none" opacity="0.25" />
              </>
            )}
          </>
        )}

        {/* Mouth */}
        <path d={mouth} stroke="#1e293b" strokeWidth="5" fill={mood === 'crying' ? '#1e293b' : 'none'} strokeLinecap="round" />
        {mood === 'happy' && <ellipse cx="110" cy="158" rx="10" ry="6" fill="#fb7185" opacity="0.5" />}

        {/* Tears */}
        {(mood === 'crying' || mood === 'sad') && (
          <>
            <motion.ellipse cx="78" cy="148" rx="5" ry="8" fill="#7dd3fc"
              animate={{ cy: [142, 168], opacity: [0.9, 0] }}
              transition={{ duration: 1.1, repeat: Infinity }} />
            <motion.ellipse cx="146" cy="148" rx="5" ry="8" fill="#7dd3fc"
              animate={{ cy: [142, 168], opacity: [0.9, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: 0.45 }} />
          </>
        )}

        {/* Sleep zzz */}
        {mood === 'sleepy' && (
          <motion.text x="168" y="70" fontSize="22" fontWeight="800" fill="#6366f1"
            animate={{ y: [70, 50], opacity: [1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}>Z</motion.text>
        )}
      </svg>
    </motion.div>
  );
};
