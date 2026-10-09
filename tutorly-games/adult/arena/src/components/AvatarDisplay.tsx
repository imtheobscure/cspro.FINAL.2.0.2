import { motion } from 'framer-motion';
import type { Learner } from '../types';

/**
 * Shows either emoji-only or real person photo + emoji badge
 * based on localStorage('combat_arena_avatars') toggle.
 */
export function AvatarDisplay({ learner, size = 'lg', color = '#666', onHover }: {
  learner: Learner;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  onHover?: () => void;
}) {
  const avatarsOn = typeof window !== 'undefined' && localStorage.getItem('combat_arena_avatars') === 'on';
  const sz = size === 'lg' ? 'w-20 h-20 md:w-24 md:h-24' : size === 'md' ? 'w-16 h-16' : 'w-12 h-12';
  const emojiSz = size === 'lg' ? 'text-6xl md:text-7xl' : size === 'md' ? 'text-4xl' : 'text-3xl';
  const badgeSz = size === 'lg' ? 'w-9 h-9 text-xl' : size === 'md' ? 'w-7 h-7 text-base' : 'w-6 h-6 text-sm';

  if (!avatarsOn) {
    // Emoji only mode
    return (
      <motion.span className={`${emojiSz} flex-shrink-0 cursor-pointer block`}
        style={{ filter: `drop-shadow(0 4px 15px ${color}50)` }}
        onMouseEnter={onHover}
        whileHover={{ scale: 1.15 }}
        title={`${learner.name}`}>
        {learner.emoji}
      </motion.span>
    );
  }

  // Real photo + emoji badge mode
  return (
    <motion.div
      className={`${sz} rounded-2xl overflow-hidden relative flex-shrink-0 cursor-pointer`}
      style={{ border: `2px solid ${color}40`, boxShadow: `0 4px 20px ${color}25` }}
      onMouseEnter={onHover}
      whileHover={{ scale: 1.08 }}
      title={learner.name}
    >
      {/* Real person photo */}
      <img
        src={`https://i.pravatar.cc/200?u=${learner.id}`}
        alt={learner.name}
        className="w-full h-full object-cover"
        style={{ filter: 'brightness(0.7) saturate(0.85)' }}
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.7) 100%)' }} />
      {/* Emoji badge — bottom right, glossy circle */}
      <div
        className={`absolute bottom-0.5 right-0.5 ${badgeSz} rounded-full flex items-center justify-center`}
        style={{
          background: 'rgba(0,0,0,0.85)',
          border: `2px solid ${color}60`,
          boxShadow: `0 0 10px ${color}40, inset 0 1px 0 rgba(255,255,255,0.1)`,
        }}
      >
        {learner.emoji}
      </div>
    </motion.div>
  );
}
