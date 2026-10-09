// ============================================================
// TUTOR AUTH & PERMISSION STORE (ZUSTAND)
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TutorAccount, UserTier, getEffectiveTier } from '../utils/tiers';
import { tutorAuthService, ADMIN_EMAIL } from '../services/tutorAuthService';
import { useAppStore } from './useAppStore';

export interface AuthState {
  tutor: TutorAccount | null;
  token: string | null;
  tier: UserTier;
  tierExpiresAt: string | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Modal States
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'register' | 'verify';
  verificationEmail: string;
  isUpgradeModalOpen: boolean;
  upgradeFeatureReason: string;
  isAdminConsoleOpen: boolean;

  // Actions
  initAuth: () => Promise<void>;
  /**
   * `needsPasswordReset` is passed through from auth.php's 409: the account exists
   * but has no usable password hash, so the caller must offer the reset flow rather
   * than reporting a wrong password that could never have been right.
   */
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string; pendingVerification?: boolean; needsPasswordReset?: boolean }>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    avatarUrl?: string;
    avatarId?: string;
    bio?: string;
    teachingMethod?: string;
    interests?: string;
    nativeLanguage?: string;
    hourlyRate?: number;
    country?: string;
    timezone?: string;
  }) => Promise<{ success: boolean; error?: string; pendingVerification?: boolean }>;
  verifyEmailCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  resendVerificationCode: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkSession: () => Promise<void>;
  forceCheckStatus: (hardRefresh?: boolean) => Promise<{ success: boolean; tier: UserTier; message: string }>;
  redeemCode: (code: string) => Promise<{ success: boolean; tier?: UserTier; message?: string }>;
  updateTutorProfile: (updates: Partial<TutorAccount>) => Promise<void>;
  setTierOverride: (tier: UserTier) => void;

  openAuthModal: (tab?: 'login' | 'register' | 'verify') => void;
  closeAuthModal: () => void;
  openUpgradeModal: (reason?: string) => void;
  closeUpgradeModal: () => void;
  openAdminConsole: () => void;
  openAdminModal: () => void;
  closeAdminConsole: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      tutor: null,
      token: null,
      tier: 'free',
      tierExpiresAt: null,
      isAdmin: false,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      isAuthModalOpen: false,
      authModalTab: 'login',
      verificationEmail: '',
      isUpgradeModalOpen: false,
      upgradeFeatureReason: '',
      isAdminConsoleOpen: false,

      initAuth: async () => {
        await get().checkSession();
      },

      login: async (email: string, pass: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await tutorAuthService.login(email, pass);
          if (res.success && res.tutor) {
            const isAdm = res.tutor.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() || res.tutor.role === 'admin';
            const pendingVerification = res.pendingVerification === true || res.tutor.emailVerified !== true;
            const liveTier: UserTier = isAdm ? 'vip' : getEffectiveTier(res.tutor.tier, res.tutor.tierExpiresAt);

            set({
              tutor: res.tutor,
              token: res.token || null,
              tier: liveTier,
              tierExpiresAt: isAdm ? null : (res.tutor.tierExpiresAt || null),
              isAdmin: isAdm,
              isAuthenticated: !pendingVerification,
              verificationEmail: res.tutor.email,
              isLoading: false,
              error: null,
              isAuthModalOpen: pendingVerification,
              authModalTab: pendingVerification ? 'verify' : 'login'
            });

            // Synchronize with general settings / tutorInfo
            useAppStore.getState().setTutorInfo({
              name: res.tutor.name,
              email: res.tutor.email,
              avatarId: res.tutor.avatarId || 'tutor-default-avatar',
              bio: res.tutor.bio,
              teachingMethod: res.tutor.teachingMethod,
              interests: res.tutor.interests,
              timezone: res.tutor.timezone
            });

            return { success: true, pendingVerification };
          } else {
            // A hash-less account (auth.php 409) must NOT be reported as a wrong
            // password: the caller needs the flag so it can offer the reset flow.
            // Keep `error: null` in that case, or the sign-in screen would show a
            // red message about a password that no longer exists.
            const needsReset = res.needsPasswordReset === true;
            set({ isLoading: false, error: needsReset ? null : (res.error || 'Failed to sign in.') });
            return { success: false, needsPasswordReset: needsReset, error: res.error || 'Failed to sign in.' };
          }
        } catch (err: any) {
          const msg = err?.message || 'Login connection error.';
          set({ isLoading: false, error: msg });
          return { success: false, error: msg };
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });

        // Enforce Gmail validation client-side
        if (!data.email.trim().toLowerCase().endsWith('@gmail.com')) {
          const err = 'Registration is strictly restricted to @gmail.com email addresses. Please use your Gmail account.';
          set({ isLoading: false, error: err });
          return { success: false, error: err };
        }

        try {
          const res = await tutorAuthService.register(data);
          if (res.success && res.tutor) {
            const isAdm = res.tutor.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() || res.tutor.role === 'admin';
            const pendingVerification = res.pendingVerification === true || res.tutor.emailVerified !== true;
            const liveTier: UserTier = isAdm ? 'vip' : getEffectiveTier(res.tutor.tier, res.tutor.tierExpiresAt);

            set({
              tutor: res.tutor,
              token: res.token || null,
              tier: liveTier,
              tierExpiresAt: isAdm ? null : (res.tutor.tierExpiresAt || null),
              isAdmin: isAdm,
              isAuthenticated: !pendingVerification,
              verificationEmail: res.email || data.email.trim().toLowerCase(),
              isLoading: false,
              error: null,
              isAuthModalOpen: pendingVerification,
              authModalTab: pendingVerification ? 'verify' : 'login'
            });

            // Synchronize with general settings / tutorInfo
            useAppStore.getState().setTutorInfo({
              name: res.tutor.name,
              email: res.tutor.email,
              avatarId: res.tutor.avatarId || 'tutor-default-avatar',
              bio: res.tutor.bio,
              teachingMethod: res.tutor.teachingMethod,
              interests: res.tutor.interests,
              timezone: res.tutor.timezone
            });

            return {
              success: true,
              pendingVerification
            };
          } else {
            set({ isLoading: false, error: res.error || 'Registration failed.' });
            return { success: false, error: res.error || 'Registration failed.' };
          }
        } catch (err: any) {
          const msg = err?.message || 'Registration connection error.';
          set({ isLoading: false, error: msg });
          return { success: false, error: msg };
        }
      },

      verifyEmailCode: async (code: string) => {
        set({ isLoading: true, error: null });
        const email = get().verificationEmail || get().tutor?.email || '';
        try {
          const res = await tutorAuthService.verifyEmailCode(email, code);
          if (res.success) {
            const currentTutor = get().tutor;
            const isAdm = email.toLowerCase() === ADMIN_EMAIL.toLowerCase() || (currentTutor && currentTutor.role === 'admin');
            const session = tutorAuthService.getStoredSession();
            const tutorObj: TutorAccount = res.tutor || (session?.tutor ? { ...session.tutor, emailVerified: true, status: 'active' } : {
              id: currentTutor?.id || `tut_${Date.now()}`,
              email: currentTutor?.email || email,
              name: currentTutor?.name || email.split('@')[0],
              role: isAdm ? 'admin' : 'tutor',
              tier: (currentTutor?.tier || 'free') as UserTier,
              status: 'active' as const,
              emailVerified: true,
              createdAt: currentTutor?.createdAt || new Date().toISOString(),
              lastLogin: new Date().toISOString()
            });

            tutorObj.emailVerified = true;
            tutorObj.status = 'active';

            set({
              tutor: tutorObj,
              token: session?.token || get().token || `tok_${Date.now()}`,
              tier: isAdm ? 'vip' : getEffectiveTier(tutorObj.tier, tutorObj.tierExpiresAt),
              tierExpiresAt: isAdm ? null : (tutorObj.tierExpiresAt || null),
              isAdmin: isAdm,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              isAuthModalOpen: false
            });

            return { success: true };
          } else {
            set({ isLoading: false, error: res.error || 'Invalid code.' });
            return { success: false, error: res.error || 'Invalid code.' };
          }
        } catch (e: any) {
          const msg = e?.message || 'Verification error.';
          set({ isLoading: false, error: msg });
          return { success: false, error: msg };
        }
      },

      resendVerificationCode: async () => {
        const email = get().verificationEmail || get().tutor?.email || '';
        if (!email) return { success: false, error: 'No email found.' };
        return await tutorAuthService.resendVerificationCode(email);
      },

      logout: () => {
        tutorAuthService.clearSession();
        set({
          tutor: null,
          token: null,
          tier: 'free',
          tierExpiresAt: null,
          isAdmin: false,
          isAuthenticated: false,
          error: null
        });
      },

      checkSession: async () => {
        try {
          const updatedTutor = await tutorAuthService.checkSession();
          if (updatedTutor) {
            const isAdm = updatedTutor.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() || updatedTutor.role === 'admin';
            const liveTier: UserTier = isAdm ? 'vip' : getEffectiveTier(updatedTutor.tier, updatedTutor.tierExpiresAt);

            set({
              tutor: updatedTutor,
              tier: liveTier,
              tierExpiresAt: isAdm ? null : (updatedTutor.tierExpiresAt || null),
              isAdmin: isAdm,
              isAuthenticated: true
            });

            // Sync with tutorInfo
            useAppStore.getState().setTutorInfo({
              name: updatedTutor.name,
              email: updatedTutor.email,
              avatarId: updatedTutor.avatarId || 'tutor-default-avatar',
              bio: updatedTutor.bio,
              teachingMethod: updatedTutor.teachingMethod,
              interests: updatedTutor.interests,
              timezone: updatedTutor.timezone
            });
          }
        } catch (e) {
          console.log('Session check fallback:', e);
        }
      },

      forceCheckStatus: async (hardRefresh = false) => {
        set({ isLoading: true, error: null });
        try {
          const currentEmail = get().tutor?.email;
          const res = await tutorAuthService.forceCheckAndRefreshTier(currentEmail, hardRefresh);
          
          if (res.success && res.tutor) {
            const isAdm = res.tutor.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() || res.tutor.role === 'admin';
            const liveTier: UserTier = isAdm ? 'vip' : getEffectiveTier(res.tier, res.tutor.tierExpiresAt);

            set({
              tutor: res.tutor,
              tier: liveTier,
              tierExpiresAt: isAdm ? null : (res.tutor.tierExpiresAt || null),
              isAdmin: isAdm,
              isAuthenticated: true,
              isLoading: false
            });

            useAppStore.getState().setTutorInfo({
              name: res.tutor.name,
              email: res.tutor.email,
              avatarId: res.tutor.avatarId || 'tutor-default-avatar',
              bio: res.tutor.bio,
              teachingMethod: res.tutor.teachingMethod,
              interests: res.tutor.interests,
              timezone: res.tutor.timezone
            });

            return { success: true, tier: liveTier, message: res.message };
          } else {
            set({ isLoading: false });
            return { success: false, tier: get().tier, message: res.message || 'Status check failed.' };
          }
        } catch (err: any) {
          const msg = err?.message || 'Failed to check status.';
          set({ isLoading: false, error: msg });
          return { success: false, tier: get().tier, message: msg };
        }
      },

      redeemCode: async (code: string) => {
        set({ isLoading: true, error: null });
        try {
          const currentEmail = get().tutor?.email || '';
          const res = await tutorAuthService.activateCode(code, currentEmail);
          if (res.success && res.tier) {
            const effTier = get().isAdmin ? 'vip' : getEffectiveTier(res.tier, get().tutor?.tierExpiresAt || null);
            set({ tier: effTier, isLoading: false });
            if (get().tutor) {
              const updated = { ...get().tutor!, tier: effTier };
              set({ tutor: updated });
              tutorAuthService.saveSession(updated, get().token || '');
            }
            return { success: true, tier: effTier, message: res.message };
          } else {
            set({ isLoading: false, error: res.message });
            return { success: false, message: res.message };
          }
        } catch (err: any) {
          const msg = err?.message || 'Error redeeming code.';
          set({ isLoading: false, error: msg });
          return { success: false, message: msg };
        }
      },

      updateTutorProfile: async (updates: Partial<TutorAccount>) => {
        const current = get().tutor;
        if (!current) return;
        const merged: TutorAccount = { ...current, ...updates };
        const token = get().token || 'token_' + Date.now();

        tutorAuthService.saveSession(merged, token);
        set({ tutor: merged });

        useAppStore.getState().setTutorInfo({
          name: merged.name,
          email: merged.email,
          avatarId: merged.avatarId,
          bio: merged.bio,
          teachingMethod: merged.teachingMethod,
          interests: merged.interests,
          timezone: merged.timezone
        });
      },

      setTierOverride: (newTier: UserTier) => {
        // Only the master admin may override tiers locally (grants must go
        // through the admin console so the server signs & persists them).
        if (!get().isAdmin) return;
        const cur = get().tutor;
        if (cur) {
          const upd: TutorAccount = { ...cur, tier: newTier };
          tutorAuthService.saveSession(upd, get().token || 'token');
          set({ tutor: upd, tier: newTier });
        } else {
          set({ tier: newTier });
        }
      },

      openAuthModal: (tab = 'login') => set({ isAuthModalOpen: true, authModalTab: tab, error: null }),
      closeAuthModal: () => set({ isAuthModalOpen: false, error: null }),
      openUpgradeModal: (reason = '') => set({ isUpgradeModalOpen: true, upgradeFeatureReason: reason }),
      closeUpgradeModal: () => set({ isUpgradeModalOpen: false, upgradeFeatureReason: '' }),
      openAdminConsole: () => set({ isAdminConsoleOpen: true }),
      openAdminModal: () => set({ isAdminConsoleOpen: true }),
      closeAdminConsole: () => set({ isAdminConsoleOpen: false })
    }),
    {
      name: 'tutomy_auth_state_v1',
      partialize: (state) => ({
        tutor: state.tutor,
        token: state.token,
        tier: state.tier,
        tierExpiresAt: state.tierExpiresAt,
        isAdmin: state.isAdmin,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
