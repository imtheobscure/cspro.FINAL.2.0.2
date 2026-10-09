import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { UserTier } from '../../utils/tiers';

interface TierGatedOverlayProps {
  requiredTier?: UserTier;
  featureName: string;
  description?: string;
  children: React.ReactNode;
}

export const TierGatedOverlay: React.FC<TierGatedOverlayProps> = ({
  requiredTier = 'vip',
  featureName,
  description,
  children
}) => {
  const currentTier = useAuthStore(state => state.tier);
  const openUpgradeModal = useAuthStore(state => state.openUpgradeModal);

  const isUnlocked =
    requiredTier === 'free' ||
    (requiredTier === 'pro' && (currentTier === 'pro' || currentTier === 'vip')) ||
    (requiredTier === 'vip' && currentTier === 'vip');

  if (isUnlocked) {
    return <>{children}</>;
  }

  const isVip = requiredTier === 'vip';

  return (
    <div className="relative w-full h-full min-h-[320px] rounded-2xl overflow-hidden group">
      {/* Background preview with blur & opacity masking */}
      <div className="filter blur-sm opacity-40 pointer-events-none select-none transition-all duration-300">
        {children}
      </div>

      {/* Transparent Glass Lock Overlay */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md rounded-2xl text-center border border-white/10 animate-fade-in">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl mb-4 ${
          isVip 
            ? 'bg-gradient-to-tr from-amber-500 via-purple-600 to-pink-500 text-white shadow-amber-500/25 animate-pulse'
            : 'bg-gradient-to-tr from-indigo-600 to-blue-600 text-white shadow-indigo-500/25'
        }`}>
          {isVip ? '👑' : '⭐'}
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider text-white bg-white/10 border border-white/20 mb-2">
          <span>{isVip ? 'VIP Exclusive Feature' : 'PRO Feature Access'}</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-white mb-2 max-w-md">
          {featureName} is locked
        </h3>

        <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
          {description || `Upgrade to ${isVip ? 'VIP Elite Master' : 'PRO Tutor'} to unlock ${featureName}, full interactive studios, unlimited learner profiles, and smart tools.`}
        </p>

        <button
          type="button"
          onClick={() => openUpgradeModal(`Unlock ${featureName} with a ${requiredTier.toUpperCase()} account.`)}
          className={`px-6 py-3 rounded-xl font-extrabold text-sm text-white shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 ${
            isVip
              ? 'bg-gradient-to-r from-amber-500 via-purple-600 to-pink-600 hover:from-amber-400 hover:to-pink-500 shadow-amber-500/30'
              : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-indigo-500/30'
          }`}
        >
          <span>{isVip ? '👑 Upgrade to VIP' : '⭐ Upgrade to PRO'}</span>
          <i className="fas fa-arrow-right text-xs"></i>
        </button>
      </div>
    </div>
  );
};

export default TierGatedOverlay;
