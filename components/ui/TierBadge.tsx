// ============================================================
// TIER BADGE COMPONENT
// Displays high-quality glowing badges for Free, PRO, and VIP.
// ============================================================

import React from 'react';
import { UserTier, TIER_CONFIGS } from '../../utils/tiers';
import { useAuthStore } from '../../store/useAuthStore';

interface TierBadgeProps {
  tier: UserTier;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}

export const TierBadge: React.FC<TierBadgeProps> = ({
  tier,
  size = 'sm',
  showLabel = true,
  className = '',
  onClick,
  interactive = false
}) => {
  const openUpgradeModal = useAuthStore(state => state.openUpgradeModal);

  const config = TIER_CONFIGS[tier] || TIER_CONFIGS.free;

  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5 gap-1',
    sm: 'text-[11px] px-2.5 py-1 gap-1.5',
    md: 'text-xs px-3.5 py-1.5 gap-2 font-bold',
    lg: 'text-sm px-4 py-2 gap-2.5 font-extrabold'
  }[size];

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick();
    } else if (interactive && (tier === 'pro' || tier === 'vip')) {
      e.stopPropagation();
      openUpgradeModal(`Explore ${config.label} privileges`);
    }
  };

  if (tier === 'vip') {
    return (
      <span
        onClick={handleClick}
        className={`inline-flex items-center rounded-full font-black tracking-wide text-amber-100 bg-gradient-to-r from-amber-500 via-purple-600 to-pink-600 shadow-sm shadow-amber-500/20 border border-amber-300/40 select-none ${
          interactive ? 'cursor-pointer hover:scale-105 transition-transform' : ''
        } ${sizeClasses} ${className}`}
        title="VIP Elite Feature"
      >
        <span className="text-amber-200 animate-pulse">👑</span>
        {showLabel && <span>VIP ELITE</span>}
      </span>
    );
  }

  if (tier === 'pro') {
    return (
      <span
        onClick={handleClick}
        className={`inline-flex items-center rounded-full font-extrabold tracking-wide text-white bg-gradient-to-r from-indigo-600 to-blue-600 shadow-sm shadow-indigo-500/20 border border-indigo-300/30 select-none ${
          interactive ? 'cursor-pointer hover:scale-105 transition-transform' : ''
        } ${sizeClasses} ${className}`}
        title="Pro Tutor Feature"
      >
        <span className="text-yellow-300">⭐</span>
        {showLabel && <span>PRO</span>}
      </span>
    );
  }

  return (
    <span
      onClick={handleClick}
      className={`inline-flex items-center rounded-full font-bold tracking-wide text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 select-none ${sizeClasses} ${className}`}
      title="Free Tier Feature"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
      {showLabel && <span>FREE</span>}
    </span>
  );
};

export default TierBadge;
