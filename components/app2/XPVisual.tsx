import React from 'react';

interface XPVisualProps {
  xp: number;
  size?: 'sm' | 'md' | 'lg';
}

export const XPVisual: React.FC<XPVisualProps> = ({ xp, size = 'md' }) => {
  const iconSizeClass = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-2xl' : 'text-base';
  const textSizeClass = size === 'lg' ? 'text-2xl font-black' : size === 'sm' ? 'text-xs' : 'text-base font-extrabold';

  return (
    <div 
      className="inline-flex items-center gap-1.5 font-bold transition-transform hover:scale-110 select-none cursor-pointer"
      title={`${xp} Experience Points`}
    >
      <i className={`fas fa-gem text-indigo-500 dark:text-indigo-400 xp-glowing-gem ${iconSizeClass}`} />
      <span className={`bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent ${textSizeClass}`}>
        {xp} XP
      </span>
    </div>
  );
};
