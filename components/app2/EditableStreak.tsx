import React, { useState } from 'react';
import { useLearnerStore } from '../../store/useLearnerStore';
import { Learner } from '../../types2';

interface EditableStreakProps {
  learner: Learner;
  size?: 'sm' | 'md' | 'lg';
}

export const EditableStreak: React.FC<EditableStreakProps> = ({ learner, size = 'md' }) => {
  const updateLearner = useLearnerStore(state => state.updateLearner);
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(learner.streak);

  const handleBlurOrSubmit = () => {
    setIsEditing(false);
    if (value !== learner.streak && !isNaN(value) && value >= 0) {
      updateLearner({
        ...learner,
        streak: value
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlurOrSubmit();
    } else if (e.key === 'Escape') {
      setValue(learner.streak);
      setIsEditing(false);
    }
  };

  const streak = learner.streak;
  
  // Determine class based on ranges:
  // common 1-10, uncommon 10-20, rare 20-30, legendary 30-40, epic >40
  let glowClass = 'streak-glow-common';
  if (streak > 40) {
    glowClass = 'streak-glow-epic';
  } else if (streak >= 30) {
    glowClass = 'streak-glow-legendary';
  } else if (streak >= 20) {
    glowClass = 'streak-glow-rare';
  } else if (streak >= 10) {
    glowClass = 'streak-glow-uncommon';
  }

  const iconSizeClass = size === 'sm' ? 'w-4 h-4 text-xs' : size === 'lg' ? 'w-8 h-8 text-2xl' : 'w-5 h-5 text-base';

  if (isEditing) {
    return (
      <div 
        className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-0.5 shadow-sm inline-flex" 
        onClick={e => e.stopPropagation()}
      >
        <i className={`fas fa-fire ${glowClass} ${iconSizeClass} animate-pulse mr-1`} />
        <input
          type="number"
          value={value}
          onChange={e => setValue(Math.max(0, parseInt(e.target.value) || 0))}
          onBlur={handleBlurOrSubmit}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-12 bg-transparent border-none focus:outline-none focus:ring-0 p-0 text-center font-bold text-gray-950 dark:text-gray-50 text-sm"
          style={{ appearance: 'textfield' }}
        />
      </div>
    );
  }

  return (
    <div 
      className={`inline-flex items-center gap-1.5 font-bold cursor-pointer transition-all hover:scale-110 select-none ${glowClass}`}
      onClick={(e) => {
        e.stopPropagation();
        setValue(learner.streak);
        setIsEditing(true);
      }}
      title="Click to edit Session Streak"
    >
      <i className={`fas fa-fire ${iconSizeClass}`} />
      <span className={size === 'lg' ? 'text-2xl font-black' : size === 'sm' ? 'text-xs' : 'text-base font-extrabold'}>
        {streak}
      </span>
    </div>
  );
};
