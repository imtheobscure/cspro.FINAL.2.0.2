'use client';

import React, { useState } from 'react';
import { twemojiUrl } from '@/lib/art';

export const WordPic: React.FC<{
  emoji: string;
  label?: string;
  size?: number;
  className?: string;
}> = ({ emoji, label, size = 96, className = '' }) => {
  const [fail, setFail] = useState(false);
  if (!emoji || fail) {
    return (
      <span className={`inline-flex items-center justify-center select-none ${className}`} style={{ fontSize: size * 0.82, lineHeight: 1 }} aria-label={label}>
        {emoji || '⭐'}
      </span>
    );
  }
  return (
    <img
      src={twemojiUrl(emoji)}
      alt={label || ''}
      width={size}
      height={size}
      draggable={false}
      onError={() => setFail(true)}
      className={`inline-block object-contain drop-shadow-md ${className}`}
      style={{ width: size, height: size }}
    />
  );
};
