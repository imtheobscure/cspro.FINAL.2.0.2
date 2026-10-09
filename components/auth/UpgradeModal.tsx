// ============================================================
// PRO & VIP UPGRADE / TIER COMPARISON MODAL
// A high-contrast pricing sheet that has to read well in BOTH themes.
//
// Colour comes from the .plan-modal token layer in ./planModal.css (pm-*
// classes) rather than the app-wide html.dark remap, because that remap only
// covers a fixed list of utilities: gradients and alpha tints slipped through it
// and produced pale panels under remapped white text. Tailwind is used here for
// layout, spacing and typography only.
//
// The stylesheet is imported HERE, not from a global entry, because that is what
// went wrong before: the layer used to sit in the repo-root index.css, which
// nothing imports, so none of these classes existed in the shipped CSS and the
// whole dialog rendered as a transparent, uncoloured ghost. Importing it from the
// one component that uses it makes that impossible to repeat.
// ============================================================

import React, { useEffect, useState } from 'react';
import './planModal.css';
import { useAuthStore } from '../../store/useAuthStore';
import { TIER_CONFIGS, DONATION_INFO, VIP_PLANS, formatTierRemaining } from '../../utils/tiers';
import type { UserTier } from '../../utils/tiers';
import TierBadge from '../ui/TierBadge';
import { ADMIN_EMAIL } from '../../services/tutorAuthService';

type CopyTarget = 'card' | 'phone';
type CardStatus = 'current' | 'recommended' | null;

// ── One feature line ────────────────────────────────────────────────
const FeatureRow: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-start gap-2 text-[12.5px] leading-snug">
    <span className="pm-check shrink-0 font-black" aria-hidden="true">✓</span>
    <span className="pm-text-2">{label}</span>
  </div>
);

// ── A single tier column ────────────────────────────────────────────
const PlanCard: React.FC<{
  tier: UserTier;
  status: CardStatus;
  meta: string;
  features: string[];
  children: React.ReactNode;
}> = ({ tier, status, meta, features, children }) => {
  const [expanded, setExpanded] = useState(false);
  const config = TIER_CONFIGS[tier];
  const visible = expanded ? features : features.slice(0, 4);
  const ink = tier === 'free' ? 'pm-ink-free' : tier === 'pro' ? 'pm-ink-pro' : 'pm-ink-vip';

  return (
    <section
      className={`pm-card pm-card--${tier} ${status === 'current' ? 'pm-card--current' : ''} rounded-2xl p-3 sm:p-3.5`}
    >
      <div className="flex items-start justify-between gap-2">
        <TierBadge tier={tier} size="sm" className={tier === 'vip' ? 'pm-vip-badge' : ''} />
        {status === 'current' && <span className="pm-pill pm-pill--current">Your plan</span>}
        {status === 'recommended' && <span className="pm-pill pm-pill--recommended">Recommended</span>}
      </div>

      <h3 className="pm-text mt-2.5 text-[17px] font-black leading-tight tracking-tight sm:text-lg">
        {config.label}
      </h3>
      <p className={`mt-0.5 text-[11px] font-black uppercase tracking-wider ${ink}`}>{meta}</p>
      <p className="pm-text-2 mt-1.5 text-[12.5px] leading-snug">{config.description}</p>

      <div className="mt-2">
        <span className={`pm-chip pm-chip--${tier} rounded-lg px-2.5 py-1 text-[12px] font-bold`}>
          <span aria-hidden="true">👥</span>
          <span>{config.learnerLimit}</span>
        </span>
      </div>

      <div className="pm-hairline mt-3 border-t pt-2">
        <p className="pm-text-3 text-[10.5px] font-black uppercase tracking-wider">What&apos;s included</p>
        <ul className="mt-2 space-y-1">
          {visible.map((feature, i) => (
            <li key={i}>
              <FeatureRow label={feature} />
            </li>
          ))}
        </ul>
        {features.length > 4 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className={`mt-2.5 cursor-pointer text-[11.5px] font-extrabold underline-offset-2 hover:underline ${ink}`}
          >
            {expanded ? '− Show fewer benefits' : `+ See all ${features.length} benefits`}
          </button>
        )}
      </div>

      <div className="mt-auto pt-3">{children}</div>
    </section>
  );
};

// ── "Transfer to card" block, shared by the PRO and VIP columns ─────
const TransferPanel: React.FC<{
  copied: CopyTarget | null;
  onCopy: (text: string, kind: CopyTarget) => void;
  mailSubject: string;
  mailBody: string;
  activateLabel: string;
  showSupport?: boolean;
}> = ({ copied, onCopy, mailSubject, mailBody, activateLabel, showSupport }) => (
  <div className="pm-panel space-y-2 rounded-xl p-3">
    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
      <span className="pm-text-3 text-[10.5px] font-black uppercase tracking-wider">Transfer to card</span>
      <span className="pm-text-3 text-[11px] font-bold">
        🏦 {DONATION_INFO.bank} · {DONATION_INFO.cardHolder}
      </span>
    </div>

    <button
      type="button"
      onClick={() => onCopy(DONATION_INFO.cardNumber, 'card')}
      className="pm-btn pm-btn--ghost pm-btn--split pm-code cursor-pointer px-3 text-[13px]"
      title="Copy the card number"
    >
      <span className="break-all">{DONATION_INFO.cardNumber}</span>
      <span className="pm-text-3 shrink-0 text-[10px] font-black">
        {copied === 'card' ? '✓ COPIED' : '📋 COPY'}
      </span>
    </button>

    <a
      href={`mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`}
      className="pm-btn pm-btn--indigo"
    >
      {activateLabel}
    </a>

    {showSupport && (
      <button
        type="button"
        onClick={() => onCopy(DONATION_INFO.supportPhone, 'phone')}
        className="pm-btn pm-btn--ghost pm-btn--split cursor-pointer px-3 text-[12px]"
        title="Copy the VIP support number"
      >
        <span>☎️ VIP support · {DONATION_INFO.supportPhone}</span>
        <span className="pm-text-3 shrink-0 text-[10px] font-black">
          {copied === 'phone' ? '✓ COPIED' : '📋 COPY'}
        </span>
      </button>
    )}
  </div>
);

export const UpgradeModal: React.FC = () => {
  const { isUpgradeModalOpen, closeUpgradeModal, tier, tutor } = useAuthStore();

  const [copied, setCopied] = useState<CopyTarget | null>(null);

  // Lock the page behind the dialog and let Escape close it.
  useEffect(() => {
    if (!isUpgradeModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeUpgradeModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isUpgradeModalOpen, closeUpgradeModal]);

  const copyText = async (text: string, kind: CopyTarget) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!isUpgradeModalOpen) return null;

  // ── Remaining-time banner for granted tiers ─────────────────────────
  const isPaidTier = tier === 'pro' || tier === 'vip';
  const expiryAt = tutor?.tierExpiresAt || null;
  const remaining = expiryAt ? formatTierRemaining(expiryAt) : '';
  const expiryDate = expiryAt ? new Date(expiryAt).toLocaleDateString() : '';
  const tierName = tier === 'vip' ? 'VIP Elite' : 'Premium';

  const statusFor = (candidate: UserTier): CardStatus => {
    if (tier === candidate) return 'current';
    if (candidate === 'pro' && tier === 'free') return 'recommended';
    return null;
  };

  const bestValueDays = VIP_PLANS.reduce(
    (best, plan) => (plan.priceToman / plan.days < best.priceToman / best.days ? plan : best),
    VIP_PLANS[0]
  ).days;

  const tutorEmail = tutor?.email || 'my account email';

  return (
    <div
      /*
       * `hide-scrollbar` on both scroll containers. The sheet has to be able to
       * scroll on a short screen, but the browser's default bar is a hard grey
       * slab pinned to the right edge of an otherwise airy dialog. Content still
       * scrolls by wheel, trackpad, touch and keyboard; only the bar goes away.
       */
      className="plan-modal pm-overlay animate-fade-in fixed inset-0 z-50 flex items-center justify-center overflow-y-auto hide-scrollbar p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Choose your plan"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeUpgradeModal();
      }}
    >
      <div className="pm-shell my-auto flex max-h-[96dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl sm:rounded-3xl">
        {/* Top accent bar */}
        <div className="pm-accent-bar h-1 w-full shrink-0" aria-hidden="true" />

        {/* Header — stays put while the plan grid scrolls */}
        <header className="pm-hairline flex shrink-0 items-start justify-between gap-3 border-b px-4 py-2.5 sm:px-6">
          <div className="min-w-0">
            <p className="pm-text-3 text-[10.5px] font-black uppercase tracking-[0.14em]">Membership</p>
            <h2 className="pm-text font-heading mt-1 text-lg font-black tracking-tight sm:text-2xl">Choose your plan</h2>
            <p className="pm-text-2 mt-1 text-[12.5px] font-medium leading-snug sm:text-sm">
              Start free today — upgrade anytime.{' '}
              <strong className="pm-text font-extrabold">Your learners and data are never lost.</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={closeUpgradeModal}
            aria-label="Close"
            className="pm-icon-btn shrink-0 text-sm font-bold"
          >
            ✕
          </button>
        </header>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain hide-scrollbar px-4 py-3 sm:px-6">
          {/* Active tier banner with remaining time */}
          {isPaidTier && (
            <div className="pm-panel mb-4 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5">
              <span className="text-base" aria-hidden="true">{tier === 'vip' ? '👑' : '⭐'}</span>
              <p
                className={`text-[12.5px] font-bold leading-snug ${
                  tier === 'vip' ? 'pm-ink-vip' : 'pm-ink-pro'
                }`}
              >
                {tierName} is active
                {remaining ? (
                  <>
                    {' — '}
                    <span className="pm-text font-black">{remaining} left</span>
                  </>
                ) : (
                  ' on this account'
                )}
                {remaining && expiryDate ? <span className="pm-text-3"> · until {expiryDate}</span> : null}
                {!remaining ? '.' : null}
              </p>
            </div>
          )}

          {/* Tier columns */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* 1. FREE */}
            <PlanCard tier="free" status={statusFor('free')} meta="$0 · Lifetime" features={TIER_CONFIGS.free.features}>
              {tier === 'free' ? (
                <div className="pm-note" role="note">
                  <span aria-hidden="true">✓</span>
                  <span>Your current plan — free forever</span>
                </div>
              ) : (
                <div className="pm-note" role="note">
                  <span aria-hidden="true">✓</span>
                  <span>Included with your paid plan</span>
                </div>
              )}
            </PlanCard>

            {/* 2. PRO */}
            <PlanCard
              tier="pro"
              status={statusFor('pro')}
              meta="One-time donation"
              features={TIER_CONFIGS.pro.features}
            >
              <TransferPanel
                copied={copied}
                onCopy={copyText}
                mailSubject="Premium Tier After Donation"
                mailBody={`Hi, I just donated to keep Tutorly alive. My tutor account is ${tutorEmail} — please activate Premium for me.`}
                activateLabel="🚀 I donated — activate Premium"
              />
            </PlanCard>

            {/* 3. VIP */}
            <PlanCard
              tier="vip"
              status={statusFor('vip')}
              meta="60 / 120 day plans"
              features={TIER_CONFIGS.vip.features}
            >
              <div className="space-y-1.5">
                <p className="pm-ink-vip text-[10.5px] font-black uppercase tracking-wider">
                  👑 Pick a VIP duration
                </p>

                {VIP_PLANS.map((plan) => {
                  const perDay = Math.round(plan.priceToman / plan.days);
                  return (
                    <button
                      key={plan.days}
                      type="button"
                      onClick={() => copyText(DONATION_INFO.cardNumber, 'card')}
                      className="pm-btn pm-btn--vip pm-btn--split cursor-pointer px-3.5"
                      title="Copy the card number for this plan"
                    >
                      <span className="flex items-center gap-2 text-left">
                        <span>👑 {plan.label}</span>
                        {plan.days === bestValueDays && (
                          <span className="rounded bg-black/30 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ring-1 ring-white/40">
                            Best value
                          </span>
                        )}
                      </span>
                      <span className="text-right leading-tight">
                        <span className="pm-code">{plan.priceToman.toLocaleString()} Toman</span>
                        <span className="block text-[9.5px] font-bold opacity-90">
                          ≈ {perDay.toLocaleString()} Toman/day
                        </span>
                      </span>
                    </button>
                  );
                })}

                <TransferPanel
                  copied={copied}
                  onCopy={copyText}
                  mailSubject="VIP Plan Activation"
                  mailBody={`Hi, I just transferred for a VIP Elite plan. My tutor account is ${tutorEmail} — please activate VIP for me.`}
                  activateLabel="🚀 I transferred — activate VIP"
                  showSupport
                />
              </div>
            </PlanCard>
          </div>

          <p className="pm-text-3 mt-2.5 text-center text-[11px] leading-relaxed">
            Payments are handled manually — no subscriptions, no auto-renewals. Your learners, lessons and settings
            are never touched by a plan change.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
