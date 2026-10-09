
import React from 'react';

interface ProgressBarProps {
  progress: number;
  color?: string;
  previousProgress?: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, color = 'bg-brand-blue', previousProgress }) => {
  const safeProgress = Math.max(0, Math.min(100, progress));
  const safePrev = previousProgress !== undefined ? Math.max(0, Math.min(100, previousProgress)) : safeProgress;
  
  // Calculate the difference
  const hasGained = safeProgress > safePrev;
  const showDiff = previousProgress !== undefined && previousProgress < safeProgress;

  return (
    <div className="w-full bg-brand-gray-light rounded-full h-2.5 relative overflow-hidden">
      <div
        className={`${color} h-2.5 rounded-full transition-all duration-500 absolute left-0 top-0`}
        style={{ width: `${showDiff ? safePrev : safeProgress}%` }}
      ></div>
      {showDiff && (
        <div
          className={`${color} h-2.5 rounded-r-full transition-all duration-500 absolute top-0 opacity-50 animate-pulse`}
          style={{ left: `${safePrev}%`, width: `${safeProgress - safePrev}%` }}
        ></div>
      )}
    </div>
  );
};

export default ProgressBar;
