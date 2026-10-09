// ============================================================
// TUTOR AUTHENTICATION & ONBOARDING MODAL
// Clean sign-in & step-by-step onboarding for tutors and super admin.
// ============================================================

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { tutorAuthService } from '../../services/tutorAuthService';
import SimpleCaptcha from './SimpleCaptcha';

const AVATAR_PRESETS = [
  { id: 'tutor-m1', label: '👨‍🏫 Alex', gender: 'male' },
  { id: 'tutor-f1', label: '👩‍🏫 Sarah', gender: 'female' },
  { id: 'tutor-m2', label: '🧑‍🏫 David', gender: 'male' },
  { id: 'tutor-f2', label: '👩‍💼 Elena', gender: 'female' },
  { id: 'tutor-m3', label: '👨‍💼 Marcus', gender: 'male' },
  { id: 'tutor-f3', label: '👩‍🎓 Maya', gender: 'female' },
  { id: 'tutor-cat', label: '🐱 Whiskers', gender: 'neutral' },
  { id: 'tutor-owl', label: '🦉 Athena', gender: 'neutral' },
];

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    authModalTab,
    verificationEmail,
    closeAuthModal,
    openAuthModal,
    login,
    register,
    verifyEmailCode,
    resendVerificationCode,
    isLoading,
    error
  } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verificationInput, setVerificationInput] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  /*
   * Self-service password reset. Entered automatically when the host answers
   * `needsPasswordReset` — i.e. the account exists but has no usable hash, so NO
   * password can ever match it. Without this the only cure was the super admin
   * resetting it by hand, which is why accounts sat in the console's
   * "no usable password hash" list indefinitely.
   */
  const [resetOpen, setResetOpen] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  const activeEmailTarget = (verificationEmail || email || '').trim().toLowerCase();

  // Check stored 5-minute cooldown on mount or email change
  useEffect(() => {
    if (!activeEmailTarget) return;
    const storageKey = `last_verify_email_sent_${activeEmailTarget}`;
    const lastSent = parseInt(localStorage.getItem(storageKey) || '0', 10);
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    const elapsed = Date.now() - lastSent;
    if (elapsed < FIVE_MINUTES_MS) {
      const remainingSecs = Math.ceil((FIVE_MINUTES_MS - elapsed) / 1000);
      setResendCooldown(remainingSecs);
    }
  }, [activeEmailTarget, isAuthModalOpen]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown > 0]);

  // Onboarding fields
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState('tutor-m1');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('Passionate ESL & Language Tutor');
  const [teachingMethod, setTeachingMethod] = useState('Communicative Approach & Task-Based Learning');
  const [interests, setInterests] = useState('Languages, Travel, Technology, Literature');
  const [nativeLanguage, setNativeLanguage] = useState('English');
  const [hourlyRate, setHourlyRate] = useState(25);
  const [country, setCountry] = useState('');
  const [timezone, setTimezone] = useState(
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'
  );

  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!email.trim() || !password) {
      setLocalError('Please enter both your email and password.');
      return;
    }

    const res = await login(email, password);
    if (res.success) {
      setSuccessMessage('Welcome back!');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 1000);
    } else if (res.needsPasswordReset) {
      // The account has no usable password hash on the host, so no password could
      // have matched. Offer the reset straight away and send the code.
      setLocalError(null);
      setResetOpen(true);
      setResetNotice(null);
      await sendResetCode();
    } else if (res.pendingVerification) {
      setLocalError(null);
    } else {
      setLocalError(res.error || 'Failed to sign in.');
    }
  };

  /** Email a one-time code to the address on the account. */
  const sendResetCode = async () => {
    setResetBusy(true);
    const res = await tutorAuthService.requestPasswordReset(email);
    setResetBusy(false);
    setResetNotice(
      res.success
        ? (res.message || 'A 6-digit code is on its way.')
        : (res.error || 'The code could not be sent.')
    );
  };

  /** Set the new password with the emailed code, then sign in with it. */
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (resetCode.trim().length < 6) {
      setLocalError('Enter the 6-digit code from the email.');
      return;
    }
    if (resetNewPassword.length < 6) {
      setLocalError('Choose a password of at least 6 characters.');
      return;
    }
    setResetBusy(true);
    const res = await tutorAuthService.confirmPasswordReset(email, resetCode, resetNewPassword);
    if (!res.success) {
      setResetBusy(false);
      setLocalError(res.error || 'The new password could not be saved.');
      return;
    }
    // Password is set — sign in with it immediately so the tutor is not left on a
    // form wondering whether it worked.
    const signedIn = await login(email, resetNewPassword);
    setResetBusy(false);
    if (signedIn.success) {
      setResetOpen(false);
      setResetCode('');
      setResetNewPassword('');
      setPassword('');
      setSuccessMessage('Password set — welcome back!');
      setTimeout(() => setSuccessMessage(null), 1500);
    } else {
      setResetOpen(false);
      setResetNotice(null);
      setSuccessMessage('Password set. Please sign in with your new password.');
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@gmail.com')) {
      setLocalError('Registration is strictly restricted to @gmail.com email addresses. Please enter a valid Gmail account.');
      return;
    }

    if (!captchaVerified) {
      setLocalError('Please complete the human verification math check.');
      return;
    }

    const res = await register({
      email: cleanEmail,
      password,
      name: name.trim() || email.split('@')[0],
      avatarId,
      avatarUrl: avatarUrl.trim() || undefined,
      bio,
      teachingMethod,
      interests,
      nativeLanguage,
      hourlyRate,
      country,
      timezone
    });

    if (res.success) {
      setSuccessMessage('Account created! A verification code has been dispatched to your Gmail.');
      setTimeout(() => {
        closeAuthModal();
      }, 1500);
    } else {
      setLocalError(res.error || 'Failed to create account.');
    }
  };

  const handleVerifyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!verificationInput.trim()) {
      setLocalError('Please enter the 6-digit verification code.');
      return;
    }

    const res = await verifyEmailCode(verificationInput.trim());
    if (res.success) {
      setSuccessMessage('Gmail verified successfully! ✅');
      setTimeout(() => {
        closeAuthModal();
      }, 1000);
    } else {
      setLocalError(res.error || 'Invalid verification code. Please check your inbox or wait for Admin approval.');
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLocalError(null);
    const res = await resendVerificationCode();
    if (res.success) {
      setSuccessMessage('A new verification code has been dispatched to your Gmail.');
      setResendCooldown(300); // 5 minutes cooldown
      if (activeEmailTarget) {
        localStorage.setItem(`last_verify_email_sent_${activeEmailTarget}`, String(Date.now()));
      }
    } else {
      setLocalError(res.error || 'Failed to resend email.');
    }
  };

  const formatCooldown = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins > 0) {
      return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden text-slate-800 dark:text-slate-100">
        {/* Top Accent Header */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        {/* Close button */}
        <button
          type="button"
          onClick={closeAuthModal}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
        >
          ✕
        </button>

        {/* Header Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-2xl mb-2 shadow-inner">
            {authModalTab === 'verify' ? '✉️' : '🎓'}
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {authModalTab === 'login'
              ? 'Tutor Sign In'
              : authModalTab === 'verify'
              ? 'Verify Your Gmail Address'
              : 'Tutor Onboarding & Sign Up'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {authModalTab === 'login'
              ? 'Access your learners, lesson generator, and dashboard'
              : authModalTab === 'verify'
              ? 'Enter the 6-digit confirmation code sent to your Gmail inbox'
              : 'Setup your tutor profile for Adult & Kids workspaces'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl text-xs font-extrabold mb-6">
          <button
            type="button"
            onClick={() => {
              openAuthModal('login');
              setStep(1);
              setLocalError(null);
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all ${
              authModalTab === 'login'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            🔑 Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              openAuthModal('register');
              setLocalError(null);
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all ${
              authModalTab === 'register'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            ✨ Sign Up (Gmail)
          </button>
          {authModalTab === 'verify' && (
            <button
              type="button"
              className="flex-1 py-2.5 rounded-xl bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm font-black"
            >
              ✉️ Verify Code
            </button>
          )}
        </div>

        {/* Status Alerts */}
        {(localError || error) && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-2">
            <span>⚠️</span>
            <span className="flex-1">{localError || error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <span>🎉</span>
            <span className="flex-1">{successMessage}</span>
          </div>
        )}

        {/* VERIFICATION FORM */}
        {authModalTab === 'verify' && (
          <form onSubmit={handleVerifyCodeSubmit} className="space-y-4">
            {/* Anti-bot Honeypot */}
            <input type="text" name="hp_website" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
            
            <div className="p-4 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 text-xs text-indigo-950 dark:text-indigo-200 space-y-2">
              <div className="font-bold flex items-center justify-between text-indigo-700 dark:text-indigo-300">
                <div className="flex items-center gap-1.5">
                  <span>📧</span>
                  <span>Verification sent to:</span>
                </div>
                <a
                  href="https://mail.google.com/mail/u/0/#search/from%3Atutomy+OR+Tutomy+OR+in%3Aspam"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800 shadow-xs"
                >
                  <span>Open Gmail Search</span>
                  <span>↗</span>
                </a>
              </div>
              <div className="font-mono text-sm font-extrabold text-slate-900 dark:text-white break-all bg-white/70 dark:bg-slate-900/70 p-2 rounded-xl border border-indigo-200/50 dark:border-indigo-800/50">
                {activeEmailTarget || 'yourname@gmail.com'}
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                Enter your 6-digit confirmation code below. If not visible in your Primary inbox, please check your <strong>Spam / Junk</strong> or <strong>Promotions</strong> folder.
              </p>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5 text-center">
                6-Digit Confirmation Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={verificationInput}
                onChange={(e) => setVerificationInput(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
                placeholder="000000"
                autoComplete="one-time-code"
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-indigo-300 dark:border-indigo-700 rounded-2xl text-center text-2xl font-black font-mono tracking-widest text-indigo-600 dark:text-indigo-300 focus:ring-4 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !verificationInput.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
            >
              {isLoading ? 'Verifying Account...' : 'Verify Gmail & Claim ✅ Badge 🚀'}
            </button>

            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline disabled:opacity-50"
              >
                {resendCooldown > 0 ? `Resend in ${formatCooldown(resendCooldown)}` : '🔄 Resend Verification Code'}
              </button>

              <button
                type="button"
                onClick={closeAuthModal}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium"
              >
                Verify Later
              </button>
            </div>
          </form>
        )}

        {/* SIGN IN FORM */}
        {authModalTab === 'login' && (
          <>
          {/*
            Self-service reset panel. Shown when the host reports the account has no
            usable password hash, so the tutor is never stuck reading "incorrect
            password" for a password that cannot possibly be right. The sign-in form
            below stays mounted (just hidden) so nothing else in this screen changes
            shape when the panel appears.
          */}
          {resetOpen && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <b>This account needs a new password.</b> Its saved password was lost on the host, so no password can
                match it any more. Enter the 6-digit code we emailed to <b>{email}</b>, then choose a new one.
              </div>
              {resetNotice && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">{resetNotice}</div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">6-digit code from the email</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center font-mono tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">New password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={sendResetCode}
                  disabled={resetBusy}
                  className="text-xs font-semibold text-gray-600 hover:text-gray-900 underline disabled:opacity-50"
                >
                  {resetBusy ? 'Working…' : 'Resend code'}
                </button>
                <button
                  type="button"
                  onClick={() => { setResetOpen(false); setResetNotice(null); setLocalError(null); }}
                  className="text-xs font-semibold text-gray-600 hover:text-gray-900 underline"
                >
                  Back to sign in
                </button>
              </div>
              <button
                type="submit"
                disabled={resetBusy}
                className="w-full py-2.5 rounded-lg bg-gray-900 text-white font-bold text-sm hover:bg-gray-800 transition disabled:opacity-50"
              >
                {resetBusy ? 'Setting the password…' : 'Set new password & sign in'}
              </button>
            </form>
          )}

          <form onSubmit={handleLoginSubmit} className={`space-y-4 ${resetOpen ? 'hidden' : ''}`}>
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@gmail.com"
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign In to Dashboard 🚀'}
            </button>
          </form>
          </>
        )}

        {/* SIGN UP / ONBOARDING FORM */}
        {authModalTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            {step === 1 ? (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-200/70 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>🔒</span>
                    <span>Gmail-Only Registration Enforced</span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    Registration strictly requires an active <strong>@gmail.com</strong> email address. Your email will be verified via a 6-digit confirmation code before access is granted.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Your Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Teacher Alex"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Gmail Address (@gmail.com only) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (e.target.value && !e.target.value.toLowerCase().endsWith('@gmail.com') && e.target.value.includes('@')) {
                        setLocalError('Please use a @gmail.com address. Other email domains are not accepted.');
                      } else {
                        setLocalError(null);
                      }
                    }}
                    placeholder="alex.tutor@gmail.com"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Must end with <strong className="text-indigo-600 dark:text-indigo-400">@gmail.com</strong>. A verification link & code will be sent.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Create Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!name.trim() || !email.trim() || password.length < 6) {
                      setLocalError('Please complete name, valid email, and password (min 6 chars).');
                      return;
                    }
                    if (!email.trim().toLowerCase().endsWith('@gmail.com')) {
                      setLocalError('Registration requires a valid @gmail.com email address.');
                      return;
                    }
                    setLocalError(null);
                    setStep(2);
                  }}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Continue to Profile Details →
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in max-h-[60vh] overflow-y-auto pr-1">
                {/* Avatar Selection */}
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                    Choose Tutor Avatar
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {AVATAR_PRESETS.map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => setAvatarId(av.id)}
                        className={`p-2 rounded-xl text-center border text-xs font-bold transition flex flex-col items-center gap-1 ${
                          avatarId === av.id
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 shadow-sm'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span className="text-xl">{av.label.split(' ')[0]}</span>
                        <span className="text-[10px] truncate">{av.label.split(' ')[1]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Teaching Methodology & Bio */}
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Teaching Methodology / Style
                  </label>
                  <input
                    type="text"
                    value={teachingMethod}
                    onChange={(e) => setTeachingMethod(e.target.value)}
                    placeholder="e.g. Communicative Approach, CEFR-Focused, Conversational"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Short Tutor Bio
                  </label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell your learners a bit about your tutoring background..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                      Native Language
                    </label>
                    <input
                      type="text"
                      value={nativeLanguage}
                      onChange={(e) => setNativeLanguage(e.target.value)}
                      placeholder="e.g. English"
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                      Timezone
                    </label>
                    <input
                      type="text"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      placeholder="e.g. America/New_York"
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Anti-Bot Zero-API Captcha */}
                <div className="pt-2">
                  <SimpleCaptcha onVerify={setCaptchaVerified} />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-200 transition"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !captchaVerified}
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
                  >
                    {isLoading ? 'Sending Verification...' : 'Create & Send Verification Code ✉️'}
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
