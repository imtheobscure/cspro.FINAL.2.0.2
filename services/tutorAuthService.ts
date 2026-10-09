// ============================================================
// TUTOR AUTHENTICATION & SERVER SYNC SERVICE
// Interacts with /auth.php on cPanel host, with resilient
// offline/local storage fallback.
// ============================================================

import { TutorAccount, UserTier, getEffectiveTier } from '../utils/tiers';

export const ADMIN_EMAIL = 'info.tutomy@gmail.com';
export const ADMIN_DEFAULT_PASS = 't-@CjR:c!Q3=5NZ';

/**
 * Body for an ADMIN-ONLY auth.php action.
 *
 * Every admin action re-checks the session token against the host's account
 * store. When that store could not be decrypted — the same failure that leaves
 * accounts with no password hash — the admin's live token stops matching and the
 * host answers `Admin authorization required.` for EVERY request. That is what
 * made the MySQL panel report a perfectly healthy host as broken: the diagnostic
 * fields were never sent, and the console rendered their absence as
 * "NOT FOUND / MISSING / missing".
 *
 * `password` is the master fallback auth.php has always accepted for ADMIN_EMAIL,
 * so diagnostics can never be locked out by a stale token again.
 */
const adminAuthBody = (email: string, token: string) => ({
  email,
  token,
  password: ADMIN_DEFAULT_PASS
});

// Shared secret used to HMAC-sign tier grants (server uses the same string
// unless TIER_SIGNING_SECRET is set on the host — see server.ts).
export const TIER_SIGNING_SECRET = 'tutomy-tier-signing-v1';

const hexToBytes = (hex: string): Uint8Array => {
  const out = new Uint8Array(Math.floor(hex.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
};

/** Compute the HMAC-SHA256 signature for a tier grant (email|tier|expiry). */
export const computeTierSig = async (email: string, tier: string, tierExpiresAt?: string | null): Promise<string> => {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey('raw', enc.encode(TIER_SIGNING_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const payload = `${String(email || '').toLowerCase().trim()}|${String(tier || '')}|${String(tierExpiresAt || '')}`;
      const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
      return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('Tier signing unavailable:', e);
  }
  return '';
};

/** Verify a tier-grant signature. Returns false when no/unknown signature. */
export const verifyTierSig = async (email: string, tier: string, tierExpiresAt?: string | null, sig?: string | null): Promise<boolean> => {
  if (!sig) return false;
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey('raw', enc.encode(TIER_SIGNING_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
      const payload = `${String(email || '').toLowerCase().trim()}|${String(tier || '')}|${String(tierExpiresAt || '')}`;
      return await crypto.subtle.verify('HMAC', key, hexToBytes(sig), enc.encode(payload));
    }
  } catch (e) {
    console.warn('Tier verification unavailable:', e);
  }
  return false;
};

const LOCAL_STORAGE_SESSION_KEY = 'tutomy_auth_session';
const LOCAL_STORAGE_TUTORS_KEY = 'tutomy_local_tutors_db';
const LOCAL_STORAGE_DEVICE_KEY = 'tutomy_device_fp';

/**
 * Salted SHA-256 password hash generator
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = 'TUTOMY_SALT_2026_SECURE_AUTH_HASH_';
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(salt + password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return 'sha256_' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('SubtleCrypto unavailable, using fallback hash:', e);
  }
  // Safe fallback hash
  let hash = 0;
  const str = salt + password;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'h_' + Math.abs(hash).toString(16) + '_sec';
};

// Base API endpoint for auth.php (works on cspro.tutomy.com, localhost, relative)
export const getAuthEndpoint = (): string => {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    // Check if hosted on tutomy or subdomains
    if (window.location.hostname.includes('tutomy.com')) {
      return `${origin}/auth.php`;
    }
    // Fallback relative or dev endpoint
    return '/auth.php';
  }
  return '/auth.php';
};

/**
 * Generate or retrieve persistent browser device fingerprint to prevent account sharing
 */
export const getDeviceFingerprint = (): string => {
  try {
    let fp = localStorage.getItem(LOCAL_STORAGE_DEVICE_KEY);
    if (!fp) {
      const userAgent = navigator.userAgent;
      const screenRes = `${window.screen.width}x${window.screen.height}`;
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const randomSeed = Math.random().toString(36).substring(2, 10);
      fp = `dev_${btoa(`${userAgent}_${screenRes}_${timeZone}_${randomSeed}`).substring(0, 24)}`;
      localStorage.setItem(LOCAL_STORAGE_DEVICE_KEY, fp);
    }
    return fp;
  } catch {
    return 'dev_fallback_browser';
  }
};

/**
 * Local offline database fallback
 */
/**
 * One account as actually stored on a device/server: the public TutorAccount plus
 * the password hashes. `passwordHash` is the salted SHA-256 hash this app writes;
 * `passwordHashSha256` is the same value when it was set through the Super Admin
 * Console (the hosted auth file stores a bcrypt hash in `passwordHash` and this
 * portable hash next to it).
 */
type StoredTutorRecord = TutorAccount & { passwordHash?: string; passwordHashSha256?: string };

const getLocalTutorsDB = (): Record<string, StoredTutorRecord> => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_TUTORS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse local tutors DB:', e);
  }

  // Pre-seed Admin account with hashed password
  const defaultDB: Record<string, StoredTutorRecord> = {
    [ADMIN_EMAIL]: {
      id: 'admin_master_1',
      email: ADMIN_EMAIL,
      name: 'Super Admin',
      avatarUrl: '',
      avatarId: 'tutor-admin',
      bio: 'Tutomy Master Administrator',
      teachingMethod: 'All Pedagogies',
      interests: 'Curriculum & Management',
      nativeLanguage: 'English',
      country: 'Global',
      timezone: 'UTC',
      tier: 'vip',
      status: 'active',
      role: 'admin',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      deviceId: getDeviceFingerprint(),
      notes: 'Default Master Super Admin',
      passwordHash: 'sha256_admin_master_hash_placeholder' // Dynamically verified against ADMIN_DEFAULT_PASS
    }
  };
  saveLocalTutorsDB(defaultDB);
  return defaultDB;
};

const saveLocalTutorsDB = (db: Record<string, StoredTutorRecord>) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_TUTORS_KEY, JSON.stringify(db));
    // Also sync to legacy array key so all UI views share synced state
    const list = Object.values(db).map(t => {
      const copy = { ...t };
      delete (copy as any).passwordHash;
      // Also drop the client-compatible hash: it is still a password hash and the
      // other UI views that read this list must never see it.
      delete (copy as any).passwordHashSha256;
      return copy;
    });
    localStorage.setItem('tutomy_tutors_db_v1', JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to write local tutors DB:', e);
  }
};

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  tutor?: TutorAccount;
  token?: string;
  tutors?: TutorAccount[];
  count?: number;
  pendingVerification?: boolean;
  email?: string;
  /** auth.php reports whether the verification mail actually left the server. */
  mailSent?: boolean;
  /** Php/Node hosts report whether the MySQL write succeeded for the account. */
  mysqlSynced?: boolean;
  /**
   * auth.php answered 409: the account exists but has NO usable password hash, so
   * no password can ever match it. The caller must offer a reset (email code +
   * new password) instead of showing "incorrect password" forever.
   */
  needsPasswordReset?: boolean;
}

// ── Credential Vault contracts ───────────────────────────────────────────────
export interface VaultAdminAuth {
  adminEmail: string;
  adminToken: string;
  adminPass?: string;
  /** Short-lived token returned by vaultUnlock (15 minutes). */
  unlockToken?: string;
}

export interface VaultCredentialRow {
  email: string;
  name: string;
  role: string;
  tier: string;
  status: string;
  /** The chosen password, or null when it was never captured (only hashes exist). */
  password: string | null;
  passwordCapturedAt: string | null;
  passwordCapturedBy: string | null;
  passwordUpdatedAt: string | null;
  passwordUpdatedBy: string | null;
  hashHealth: string;
  lastLogin: string | null;
}

export interface VaultResult {
  success: boolean;
  error?: string;
  unsupported?: boolean;
  message?: string;
  warning?: string;
  configured?: boolean;
  secondPassSet?: boolean;
  totpEnabled?: boolean;
  totpPending?: boolean;
  totpSecret?: string;
  otpauthUri?: string;
  captureEnabled?: boolean;
  storedPasswords?: number;
  vaultState?: string;
  unlockToken?: string;
  expiresAt?: string;
  ttlSeconds?: number;
  needsSetup?: boolean;
  locked?: boolean;
  count?: number;
  withStoredPassword?: number;
  withoutStoredPassword?: number;
  removed?: number;
}

/**
 * One call into the host's credential vault. The admin session is always sent;
 * the second factor (unlock token, passphrase or authenticator code) is whatever
 * the caller supplied for this step.
 */
async function vaultRequest(action: string, params: Record<string, any>): Promise<VaultResult> {
  const body: Record<string, any> = {
    email: params.adminEmail,
    token: params.adminToken,
    password: params.adminPass || ADMIN_DEFAULT_PASS
  };
  const passthrough = [
    'unlockToken', 'secondPass', 'totpCode',
    'enableTotp', 'confirmTotp', 'disableTotp', 'disableSecondPass',
    'targetEmail', 'candidate', 'purgeAll'
  ];
  for (const key of passthrough) {
    if (params[key] !== undefined) body[key] = params[key];
  }
  try {
    const res = await fetch(`${getAuthEndpoint()}?action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => null);
    // An older auth.php does not know these actions and answers with the plain
    // {success, tutors:[…]} roster. That is NOT success here — say so clearly
    // instead of showing an empty (and misleading) vault.
    const isGenericRoster = !!data && Array.isArray((data as any).tutors)
      && (data as any).withStoredPassword === undefined
      && (data as any).unlockToken === undefined;
    if (isGenericRoster) {
      return {
        success: false,
        unsupported: true,
        error: 'This host is still running an older auth.php without the credential vault. Upload the new public/auth.php from your build (dist/auth.php) and reload this console.'
      };
    }
    if (data && typeof data === 'object') return data as VaultResult;
    return { success: false, error: `The host did not answer the ${action} request.` };
  } catch (e: any) {
    return {
      success: false,
      error: `Could not reach the host's auth.php (${e?.message || e}). Check your connection and that the new auth.php is uploaded.`
    };
  }
}

export const tutorAuthService = {
  /**
   * Register a new tutor (Gmail-only enforcement + verification dispatch)
   */
  async register(params: {
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
  }): Promise<AuthResponse> {
    const email = params.email.trim().toLowerCase();
    const deviceId = getDeviceFingerprint();

    // Enforce Gmail-Only Registration
    if (!email.endsWith('@gmail.com')) {
      return {
        success: false,
        error: 'Registration is strictly restricted to @gmail.com email addresses. Please enter a valid Gmail account.'
      };
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationToken = `vtok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    // The auth endpoint is authoritative. PHP/cPanel sends the mail from the
    // same request that persists the account; Node uses its SMTP compatibility
    // route only when the authoritative response reports no delivery.
    let verificationDispatched = false;

    // 1. Try real server auth.php
    try {
      const endpoint = `${getAuthEndpoint()}?action=register`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          email,
          deviceId,
          emailVerified: false,
          verificationCode,
          verificationToken,
          status: 'pending_verification'
        })
      });

      if (res.ok) {
        const data: AuthResponse = await res.json();
        if (data.success && data.tutor) {
          // PHP returns pendingVerification/mailSent from the same transaction.
          // Do not expose the code in the client response or trust a client-only
          // verification state.
          verificationDispatched = data.mailSent === true;
          if (!verificationDispatched) {
            try {
              const mailRes = await fetch('/api/auth/send-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name: params.name || 'Tutor', verificationCode, verificationToken })
              });
              verificationDispatched = mailRes.ok;
            } catch (mailErr) {
              console.warn('Verification delivery fallback unavailable:', mailErr);
            }
          }
          data.tutor.emailVerified = data.tutor.emailVerified === true;
          data.tutor.status = data.tutor.emailVerified ? 'active' : 'pending_verification';
          this.saveSession(data.tutor, data.token || 'token_' + Date.now());
          return {
            ...data,
            pendingVerification: data.tutor.emailVerified !== true,
            email,
            message: data.message || (verificationDispatched
              ? 'Account created. Check your Gmail inbox and Spam folder for the verification code.'
              : 'Account created and awaiting Gmail verification. Ask the administrator to approve the account if the email does not arrive.')
          };
        } else if (data.error) {
          return data;
        }
      }
    } catch (netErr) {
      console.log('Server unreachable for register, using persistent local engine:', netErr);
    }

    // 2. Offline / Local fallback
    const localDB = getLocalTutorsDB();
    if (localDB[email]) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    const tutorId = `tut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
    const hashedPassword = await hashPassword(params.password);

    const newTutor: TutorAccount & { passwordHash: string } = {
      id: tutorId,
      email,
      passwordHash: hashedPassword,
      name: params.name || email.split('@')[0],
      avatarUrl: params.avatarUrl || '',
      avatarId: params.avatarId || 'tutor-default',
      bio: params.bio || 'Language Tutor',
      teachingMethod: params.teachingMethod || 'Communicative Approach',
      interests: params.interests || '',
      nativeLanguage: params.nativeLanguage || 'English',
      hourlyRate: params.hourlyRate || 25,
      country: params.country || '',
      timezone: params.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      tier: 'free', // Free tier (30 learner limit)
      status: 'pending_verification',
      emailVerified: false,
      verificationCode,
      verificationToken,
      role: email === ADMIN_EMAIL ? 'admin' : 'tutor',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      deviceId,
      notes: ''
    };

    localDB[email] = newTutor;
    saveLocalTutorsDB(localDB);

    const cleanTutor: TutorAccount = { ...newTutor };
    delete (cleanTutor as any).passwordHash;

    this.saveSession(cleanTutor, token);
    return {
      success: true,
      pendingVerification: true,
      email,
      message: 'Account created! Please verify your Gmail or request Admin approval.',
      tutor: cleanTutor,
      token
    };
  },

  /**
   * Verify Gmail with 6-digit confirmation code
   */
  async verifyEmailCode(emailInput: string, codeInput: string): Promise<AuthResponse> {
    const email = emailInput.trim().toLowerCase();
    const code = codeInput.trim();

    // 1. Verify against the authoritative auth store first. The previous code
    // called a Node-only route here, so cPanel/PHP registrations could never be
    // activated from the PWA.
    const verificationEndpoints = [
      `${getAuthEndpoint()}?action=verify_code`,
      '/api/auth/verify-code'
    ];
    for (const endpoint of verificationEndpoints) {
      try {
        const body = endpoint.includes('auth.php')
          ? { email, code }
          : { email, code };
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        if (data.success) {
          const localDB = getLocalTutorsDB();
          if (localDB[email]) {
            localDB[email].emailVerified = true;
            localDB[email].status = 'active';
            delete localDB[email].verificationCode;
            delete localDB[email].verificationToken;
            saveLocalTutorsDB(localDB);
          }
          let cleanTutor: TutorAccount | null = data.tutor || null;
          if (!cleanTutor && localDB[email]) {
            cleanTutor = { ...localDB[email] };
            delete (cleanTutor as any).passwordHash;
          }
          const session = this.getStoredSession();
          const token = session?.token || `tok_${Date.now()}`;
          if (session && session.tutor && session.tutor.email === email) {
            session.tutor.emailVerified = true;
            session.tutor.status = 'active';
            this.saveSession(session.tutor, token);
            cleanTutor = session.tutor;
          } else if (cleanTutor) {
            this.saveSession(cleanTutor, token);
          }
          return {
            success: true,
            message: 'Gmail verified successfully! ✅',
            tutor: cleanTutor || undefined,
            token
          };
        }
        // A real server rejection is not an invitation to trust a stale local
        // code; only continue when this endpoint is unavailable.
        if (res.status !== 404 && res.status !== 405 && endpoint.includes('auth.php')) {
          return { success: false, error: data.error || 'Invalid or expired verification code.' };
        }
      } catch (e) {
        console.warn('Verification endpoint unavailable:', endpoint, e);
      }
    }

    // 2. Check local DB only when no authoritative endpoint was reachable
    const localDB = getLocalTutorsDB();
    const tutorRecord = localDB[email];
    if (tutorRecord) {
      if (
        (tutorRecord.verificationCode && tutorRecord.verificationCode === code) ||
        (tutorRecord.verificationToken && tutorRecord.verificationToken === code)
      ) {
        tutorRecord.emailVerified = true;
        tutorRecord.status = 'active';
        delete tutorRecord.verificationCode;
        saveLocalTutorsDB(localDB);

        const cleanTutor: TutorAccount = { ...tutorRecord };
        delete (cleanTutor as any).passwordHash;
        const session = this.getStoredSession();
        const token = session?.token || `tok_${Date.now()}`;
        this.saveSession(cleanTutor, token);

        return {
          success: true,
          message: 'Gmail verified successfully! ✅',
          tutor: cleanTutor,
          token
        };
      }
    }

    return { success: false, error: 'Invalid verification code. Please check your Gmail or contact Admin.' };
  },

  /**
   * Resend Gmail confirmation code with strict 5-minute cooldown to prevent spam / scams
   */
  async resendVerificationCode(emailInput: string, name?: string): Promise<AuthResponse> {
    const email = emailInput.trim().toLowerCase();
    const storageKey = `last_verify_email_sent_${email}`;
    const lastSentTime = parseInt(localStorage.getItem(storageKey) || '0', 10);
    const now = Date.now();
    const FIVE_MINUTES_MS = 5 * 60 * 1000;

    if (now - lastSentTime < FIVE_MINUTES_MS) {
      const waitSeconds = Math.ceil((FIVE_MINUTES_MS - (now - lastSentTime)) / 1000);
      const minutes = Math.floor(waitSeconds / 60);
      const seconds = waitSeconds % 60;
      const formattedTime = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
      return {
        success: false,
        error: `Anti-spam protection: Please wait ${formattedTime} before resending a verification code.`
      };
    }

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const localDB = getLocalTutorsDB();
    if (localDB[email]) {
      localDB[email].verificationCode = newCode;
      saveLocalTutorsDB(localDB);
    }

    const resendEndpoints = [
      `${getAuthEndpoint()}?action=resend_code`,
      '/api/auth/send-verification'
    ];
    for (const endpoint of resendEndpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({
            email,
            name: name || localDB[email]?.name || 'Tutor',
            verificationCode: newCode
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          localStorage.setItem(storageKey, String(now));
          return { success: true, message: data.message || 'Verification email resent to ' + email };
        }
        if (endpoint.includes('auth.php') && res.status !== 404 && res.status !== 405) {
          return { success: false, error: data.error || 'Failed to send the verification email.' };
        }
      } catch (e) {
        console.warn('Verification resend endpoint unavailable:', endpoint, e);
      }
    }
    return { success: false, error: 'Could not reach the email service. Please try again shortly.' };
  },

  /**
   * Super Admin manual verification of a tutor
   */
  async adminVerifyTutor(adminEmail: string, adminToken: string, targetEmail: string): Promise<boolean> {
    const localDB = getLocalTutorsDB();
    const cleanTarget = targetEmail.trim().toLowerCase();
    if (localDB[cleanTarget]) {
      localDB[cleanTarget].emailVerified = true;
      localDB[cleanTarget].status = 'active';
      delete localDB[cleanTarget].verificationCode;
      saveLocalTutorsDB(localDB);
    }

    try {
      const res = await fetch(`${getAuthEndpoint()}?action=verify_code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          email: cleanTarget,
          code: 'ADMIN_APPROVE',
          adminEmail,
          adminToken,
          adminPassword: ADMIN_DEFAULT_PASS
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return false;
      }
      const data = await res.json().catch(() => ({}));
      return data.success === true;
    } catch (e) {
      console.warn('Admin remote approve sync note:', e);
      return false;
    }
  },

  /**
   * Log in an existing tutor or admin
   */
  async login(emailInput: string, passwordInput: string): Promise<AuthResponse> {
    const email = emailInput.trim().toLowerCase();
    const password = passwordInput;
    const deviceId = getDeviceFingerprint();

    // 1. Try real server auth.php
    try {
      const endpoint = `${getAuthEndpoint()}?action=login`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, deviceId })
      });

      /*
       * Read the body whatever the status. `needsPasswordReset` arrives as a 409,
       * and the old `if (res.ok)` guard dropped every non-2xx answer — so the
       * hash-less account fell through to the OFFLINE fallback and the caller saw a
       * puzzling "incorrect password" instead of the one thing that could fix it.
       */
      const data = (await res.json().catch(() => null)) as AuthResponse | null;
      if (data) {
        if (data.success && data.tutor) {
          this.saveSession(data.tutor, data.token || 'token_' + Date.now());
          return data;
        }
        if (data.needsPasswordReset || data.error) {
          return data;
        }
      }
    } catch (netErr) {
      console.log('Server unreachable for login, checking local store:', netErr);
    }

    // 2. Offline / Local fallback
    const localDB = getLocalTutorsDB();

    // Special check for master admin
    if (email === ADMIN_EMAIL && password === ADMIN_DEFAULT_PASS) {
      const adminTutor: TutorAccount = {
        id: 'admin_master_1',
        email: ADMIN_EMAIL,
        name: 'Super Admin',
        avatarUrl: '',
        avatarId: 'tutor-admin',
        bio: 'Tutomy Master Administrator',
        teachingMethod: 'All Pedagogies',
        interests: 'Curriculum & Management',
        nativeLanguage: 'English',
        country: 'Global',
        timezone: 'UTC',
        tier: 'vip',
        status: 'active',
        role: 'admin',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        deviceId,
        notes: 'Master Super Admin'
      };
      const token = `admin_tok_${Date.now()}`;
      this.saveSession(adminTutor, token);
      return { success: true, tutor: adminTutor, token };
    }

    const tutorRecord = localDB[email];
    if (!tutorRecord) {
      return { success: false, error: 'Account not found with this email. Please sign up.' };
    }

    const inputHash = await hashPassword(password);
    const passwordMatches =
      (tutorRecord.passwordHash === inputHash) ||
      (tutorRecord.passwordHash === password) ||
      // Password set by the Super Admin Console (works online via the host hash too)
      (tutorRecord.passwordHashSha256 === inputHash);
    if (!passwordMatches) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    // Migrate unhashed password to hash
    if (tutorRecord.passwordHash === password) {
      tutorRecord.passwordHash = inputHash;
    }

    if (tutorRecord.status === 'suspended') {
      return { success: false, error: 'This tutor account is currently suspended. Please contact info.tutomy@gmail.com' };
    }

    tutorRecord.lastLogin = new Date().toISOString();
    tutorRecord.deviceId = deviceId;
    saveLocalTutorsDB(localDB);

    const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const cleanTutor: TutorAccount = { ...tutorRecord };
    delete (cleanTutor as any).passwordHash;

    this.saveSession(cleanTutor, token);
    return {
      success: true,
      message: 'Login successful!',
      tutor: cleanTutor,
      token
    };
  },

  /**
   * Check active session and fetch latest tier from server
   */
  /**
   * Check active session and fetch latest tier from server
   */
  async checkSession(): Promise<TutorAccount | null> {
    const result = await this.forceCheckAndRefreshTier(undefined, false);
    if (result.success && result.tutor) {
      return result.tutor;
    }
    const session = this.getStoredSession();
    return session?.tutor || null;
  },

  /**
   * Forcefully check and sync live tier status from server database and apply it immediately
   * (Works on cPanel auth.php, Node API, and static tutors_db.json fallback)
   */
  async forceCheckAndRefreshTier(targetEmail?: string, hardRefresh = false): Promise<{
    success: boolean;
    tier: UserTier;
    role: string;
    status: string;
    tutor: TutorAccount | null;
    message: string;
  }> {
    const session = this.getStoredSession();
    let email = (targetEmail || session?.tutor?.email || '').trim().toLowerCase();
    if (!email) {
      try {
        const storedAuth = localStorage.getItem('tutomy_auth_state_v1');
        if (storedAuth) {
          const parsed = JSON.parse(storedAuth);
          if (parsed?.state?.tutor?.email) {
            email = parsed.state.tutor.email.toLowerCase().trim();
          }
        }
      } catch (e) {}
    }

    if (!email) {
      return {
        success: false,
        tier: 'free',
        role: 'tutor',
        status: 'active',
        tutor: null,
        message: 'No active tutor account identified. Please log in or register.'
      };
    }

    const token = session?.token || `tok_${Date.now()}`;
    const timestamp = Date.now();
    let updatedTutor: TutorAccount | null = null;
    let newTier: UserTier = 'free';
    let newRole = 'tutor';
    let newStatus = 'active';
    let source = 'local';

    // 1. Try auth.php?action=check_status with cache buster
    try {
      const endpoint = `${getAuthEndpoint()}?action=check_status&_t=${timestamp}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        cache: 'no-store',
        body: JSON.stringify({ email, token })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.tutor) {
          updatedTutor = data.tutor;
          newTier = (data.tier || data.tutor.tier || 'free') as UserTier;
          newRole = data.role || data.tutor.role || 'tutor';
          newStatus = data.status || data.tutor.status || 'active';
          source = 'cPanel / auth.php';
        }
      }
    } catch (e) {
      console.warn('auth.php check_status failed:', e);
    }

    // 2. Try Express /api/admin/tutors or fallback
    if (!updatedTutor) {
      try {
        const res = await fetch(`/api/admin/tutors?_t=${timestamp}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.tutors)) {
            const match = data.tutors.find((t: any) => t.email && t.email.toLowerCase().trim() === email);
            if (match) {
              updatedTutor = match;
              newTier = (match.tier || 'free') as UserTier;
              newRole = match.role || 'tutor';
              newStatus = match.status || 'active';
              source = 'express server';
            }
          }
        }
      } catch (e) {}
    }

    // 3. Try reading static data/tutors_db.json if deployed as static assets on cPanel
    if (!updatedTutor) {
      const jsonUrls = [
        `data/tutors_db.json?_t=${timestamp}`,
        `/data/tutors_db.json?_t=${timestamp}`,
        `tutors_db.json?_t=${timestamp}`,
        `/tutors_db.json?_t=${timestamp}`
      ];
      for (const url of jsonUrls) {
        try {
          const res = await fetch(url, { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            const record = data[email] || (Array.isArray(data) ? data.find((t: any) => t.email?.toLowerCase().trim() === email) : null);
            if (record) {
              updatedTutor = record;
              newTier = (record.tier || 'free') as UserTier;
              newRole = record.role || 'tutor';
              newStatus = record.status || 'active';
              source = 'tutors_db.json';
              break;
            }
          }
        } catch (e) {}
      }
    }

    // 4. Fallback to local DB if all remote endpoints failed
    if (!updatedTutor) {
      const localDB = getLocalTutorsDB();
      if (localDB[email]) {
        updatedTutor = { ...localDB[email] };
        delete (updatedTutor as any).passwordHash;
        newTier = (updatedTutor.tier || 'free') as UserTier;
        newRole = updatedTutor.role || 'tutor';
        newStatus = updatedTutor.status || 'active';
        source = 'local store fallback';
      }
    }

    // ── Tier hardening: expiry + signature verification ───────────────
    const claimedExpiry = updatedTutor?.tierExpiresAt;
    let effective = getEffectiveTier(newTier as UserTier, claimedExpiry);
    if (effective !== 'free' && updatedTutor) {
      const sigValid = await verifyTierSig(email, effective, claimedExpiry, updatedTutor.tierSig);
      const trustedSource = source !== 'local store fallback';
      // Elevated tiers are only honoured when signed (server grants) or when
      // the record came straight from the server. Unsigned local-only records
      // are treated as tampered and dropped to free.
      if (!sigValid && !trustedSource) {
        effective = 'free';
      }
    }
    if (effective !== newTier) {
      newTier = effective;
      if (updatedTutor) updatedTutor.tier = effective;
    }

    // Always enforce master admin is VIP
    if (email === ADMIN_EMAIL || newRole === 'admin') {
      newTier = 'vip';
      newRole = 'admin';
      newStatus = 'active';
      if (updatedTutor) {
        updatedTutor.tier = 'vip';
        updatedTutor.role = 'admin';
      }
    }

    // Apply and persist to local stores synchronously
    if (updatedTutor) {
      const existingSession = this.getStoredSession()?.tutor;
      const existingLocal = getLocalTutorsDB()[email];
      
      // Preserve verified status if verified anywhere
      const isVerified = Boolean(
        updatedTutor.emailVerified || 
        existingSession?.emailVerified || 
        existingLocal?.emailVerified ||
        email === ADMIN_EMAIL ||
        newRole === 'admin'
      );
      
      updatedTutor.emailVerified = isVerified;
      updatedTutor.tier = newTier;
      updatedTutor.role = newRole as any;
      updatedTutor.status = newStatus as any;
      this.saveSession(updatedTutor, token);

      const localDB = getLocalTutorsDB();
      localDB[email] = { ...(localDB[email] || {}), ...updatedTutor, emailVerified: isVerified };
      saveLocalTutorsDB(localDB);
    }

    // Also update custom localStorage keys used across various submodules
    try {
      if (newTier === 'vip') {
        localStorage.setItem('tutorly_vip', 'true');
        localStorage.setItem('tutorly_premium', 'true');
      } else if (newTier === 'pro') {
        localStorage.setItem('tutorly_vip', 'false');
        localStorage.setItem('tutorly_premium', 'true');
      } else {
        localStorage.setItem('tutorly_vip', 'false');
        localStorage.setItem('tutorly_premium', 'false');
      }
      localStorage.setItem('tutomy_last_status_check', new Date().toISOString());
    } catch (e) {}

    const resultMessage = `${newTier.toUpperCase()} tier active • Synced successfully ✅`;

    if (hardRefresh && typeof window !== 'undefined') {
      setTimeout(() => {
        window.location.reload();
      }, 250);
    }

    return {
      success: true,
      tier: newTier,
      role: newRole,
      status: newStatus,
      tutor: updatedTutor,
      message: resultMessage
    };
  },

  /**
   * Admin: Get all tutors
   */
  async getTutors(adminEmail: string, adminToken: string, adminPass?: string): Promise<TutorAccount[]> {
    // 1. Try Express direct API first
    try {
      const res = await fetch('/api/admin/tutors', {
        headers: {
          'X-Admin-Email': adminEmail,
          'X-Admin-Token': adminToken,
          'X-Admin-Password': adminPass || ADMIN_DEFAULT_PASS
        },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.tutors) && data.tutors.length > 0) {
          // Merge to local storage
          const localDB = getLocalTutorsDB();
          data.tutors.forEach((t: TutorAccount) => {
            const em = t.email.toLowerCase().trim();
            localDB[em] = { ...(localDB[em] || {}), ...t };
          });
          saveLocalTutorsDB(localDB);
          return data.tutors;
        }
      }
    } catch (e) {
      console.warn('Direct /api/admin/tutors fetch failed, falling back to auth.php:', e);
    }

    // 2. Try auth.php endpoint
    try {
      const endpoint = `${getAuthEndpoint()}?action=get_tutors`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, token: adminToken, password: adminPass })
      });
      if (res.ok) {
        const data: AuthResponse = await res.json();
        if (data.success && data.tutors && data.tutors.length > 0) {
          const localDB = getLocalTutorsDB();
          data.tutors.forEach((t: TutorAccount) => {
            const em = t.email.toLowerCase().trim();
            localDB[em] = { ...(localDB[em] || {}), ...t };
          });
          saveLocalTutorsDB(localDB);
          return data.tutors;
        }
      }
    } catch (e) {
      console.warn('Could not fetch tutors from auth.php, using local store:', e);
    }

    // 3. Local fallback
    const localDB = getLocalTutorsDB();
    return Object.values(localDB).map(t => {
      const copy = { ...t };
      delete (copy as any).passwordHash;
      return copy;
    });
  },

  /**
   * Admin: Explicitly Force Save all tutors to server file on disk
   */
  async forceSaveTutorsToDisk(params: {
    adminEmail: string;
    adminToken: string;
    adminPass?: string;
    tutors: TutorAccount[];
  }): Promise<{ success: boolean; message: string; count?: number; filePath?: string; savedAt?: string }> {
    const list = params.tutors || [];
    
    // Save to local storage right away
    const localDB = getLocalTutorsDB();
    list.forEach(t => {
      const em = t.email.toLowerCase().trim();
      localDB[em] = { ...(localDB[em] || {}), ...t };
    });
    saveLocalTutorsDB(localDB);

    let savedOnServer = false;
    let serverMessage = '';

    // 1. Send to Express endpoint /api/admin/force-save-tutors
    try {
      const res = await fetch('/api/admin/force-save-tutors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tutors: list,
          email: params.adminEmail,
          token: params.adminToken,
          password: params.adminPass
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          savedOnServer = true;
          serverMessage = data.message || `Persisted ${data.count || list.length} accounts to data/tutors_db.json file! 💾`;
          return {
            success: true,
            message: serverMessage,
            count: data.count || list.length,
            filePath: data.filePath || 'data/tutors_db.json',
            savedAt: data.savedAt || new Date().toISOString()
          };
        }
      }
    } catch (e) {
      console.warn('Error during /api/admin/force-save-tutors:', e);
    }

    // 2. Try PHP auth.php force save endpoint (authoritative on cPanel)
    let serverError = '';
    try {
      const endpoint = `${getAuthEndpoint()}?action=force_save_db`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          email: params.adminEmail,
          token: params.adminToken,
          password: params.adminPass,
          adminEmail: params.adminEmail,
          adminToken: params.adminToken,
          adminPass: params.adminPass,
          tutors: list
        })
      });
      const data: any = await res.json().catch(() => null);
      // An auth.php older than this app answers unknown actions with a generic
      // {tutors:[…]} payload carrying success:true — never mistake that for a save.
      const genericFallback = !!data && Array.isArray(data.tutors) && !data.savedAt && !data.count;
      if (res.ok && data && data.success && !genericFallback) {
        savedOnServer = true;
        return {
          success: true,
          message: data.message || `Persisted ${list.length} accounts to host auth database! 💾`,
          count: data.count || list.length,
          savedAt: data.savedAt || new Date().toISOString()
        };
      }
      if (data && data.error) {
        serverError = data.error;
        if (res.status === 400 || res.status === 403 || res.status === 404) {
          return { success: false, message: data.error, count: 0 };
        }
      } else if (genericFallback) {
        serverError = 'The deployed auth.php is older than this app. Upload the new auth.php from the latest build.';
      }
    } catch (e) {
      console.warn('Error during PHP force_save_db:', e);
    }

    if (serverError) {
      return {
        success: false,
        message: `Could not save to the host: ${serverError} (nothing was written server-side).`,
        count: 0
      };
    }

    // Local-only confirmation when the host could not be reached at all.
    return {
      success: true,
      message: `Saved ${list.length} accounts on this device. The host was unreachable, so the server copy was not updated — try Force Save again once it is back.`,
      count: list.length,
      savedAt: new Date().toISOString()
    };
  },

  /**
   * Admin: Update tutor tier or status
   */
  async updateTutorTier(params: {
    adminEmail: string;
    adminToken: string;
    adminPass?: string;
    targetEmail: string;
    tier?: UserTier;
    status?: 'active' | 'suspended';
    notes?: string;
    durationDays?: number;
    tierExpiresAt?: string;
  }): Promise<AuthResponse> {
    const cleanTargetEmail = params.targetEmail.toLowerCase().trim();

    // Compute expiry (explicit ISO wins; otherwise now + durationDays)
    const nextExpiry = params.tier === 'free'
      ? null
      : (params.tierExpiresAt ? new Date(params.tierExpiresAt).toISOString() : (params.durationDays && params.durationDays > 0 ? new Date(Date.now() + params.durationDays * 86400000).toISOString() : null));
    const nextSig = nextExpiry ? await computeTierSig(cleanTargetEmail, params.tier || 'pro', nextExpiry) : '';

    // Update local copy immediately (signed, so offline checks still pass)
    const localDB = getLocalTutorsDB();
    if (localDB[cleanTargetEmail]) {
      if (params.tier) localDB[cleanTargetEmail].tier = params.tier;
      if (params.status) localDB[cleanTargetEmail].status = params.status;
      if (params.notes !== undefined) localDB[cleanTargetEmail].notes = params.notes;
      if (nextExpiry) {
        localDB[cleanTargetEmail].tierExpiresAt = nextExpiry;
        localDB[cleanTargetEmail].tierSig = nextSig;
      } else if (params.tier === 'free') {
        delete localDB[cleanTargetEmail].tierExpiresAt;
        delete localDB[cleanTargetEmail].tierSig;
      }
    } else {
      localDB[cleanTargetEmail] = {
        id: 'tut_' + Date.now(),
        email: cleanTargetEmail,
        name: cleanTargetEmail.split('@')[0],
        avatarUrl: '',
        avatarId: 'tutor-default-avatar',
        bio: 'Language Tutor',
        teachingMethod: 'Communicative Approach',
        interests: 'General Learning',
        nativeLanguage: 'English',
        country: 'Global',
        timezone: 'UTC',
        tier: params.tier || 'pro',
        status: params.status || 'active',
        role: cleanTargetEmail === ADMIN_EMAIL ? 'admin' : 'tutor',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        notes: params.notes || '',
        passwordHash: '',
        tierExpiresAt: nextExpiry || undefined,
        tierSig: nextSig || undefined
      };
    }
    saveLocalTutorsDB(localDB);

    // 1. Send to Express endpoint /api/admin/update-tier
    try {
      const res = await fetch('/api/admin/update-tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetEmail: cleanTargetEmail,
          tier: params.tier,
          status: params.status,
          notes: params.notes,
          durationDays: params.durationDays,
          tierExpiresAt: nextExpiry || undefined,
          adminPass: params.adminPass || ADMIN_DEFAULT_PASS
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          return data;
        }
      }
    } catch (e) {
      console.warn('Direct update-tier API failed, trying auth.php:', e);
    }

    // 2. Send to PHP auth.php — the authoritative store on the cPanel host.
    //    Both naming styles are sent (email/token/password AND the
    //    adminEmail/adminToken/adminPass the console uses) so a host running
    //    either contract accepts the grant instead of answering 403.
    let serverError = '';
    try {
      const endpoint = `${getAuthEndpoint()}?action=update_tier`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          ...params,
          email: params.adminEmail,
          token: params.adminToken,
          password: params.adminPass || ADMIN_DEFAULT_PASS
        })
      });
      const data: AuthResponse = await res.json().catch(() => ({} as AuthResponse));
      // An auth.php older than this app answers unknown actions with a generic
      // {tutors:[…]} payload — that is NOT a stored tier change.
      const genericFallback = Array.isArray((data as any)?.tutors) && !(data as any)?.tutor;
      if (res.ok && data.success && !genericFallback) {
        // The host is the source of truth: mirror exactly what it stored so the
        // console and this browser agree with the server.
        if (data.tutor) {
          localDB[cleanTargetEmail] = { ...localDB[cleanTargetEmail], ...(data.tutor as TutorAccount) } as TutorAccount;
          saveLocalTutorsDB(localDB);
        }
        return data;
      }
      if (data.error && (res.status === 400 || res.status === 403 || res.status === 404)) {
        // An explicit refusal must never be reported as a successful grant.
        return { success: false, error: data.error };
      }
      if (data.error) serverError = data.error;
      else if (genericFallback) serverError = 'The deployed auth.php is older than this app and does not support tier changes. Upload the new auth.php (and cs-db_config.php) from the latest build.';
    } catch (e) {
      console.warn('Server update_tier error, fallback to local confirmation:', e);
    }

    const copy: TutorAccount = { ...localDB[cleanTargetEmail] };
    delete (copy as any).passwordHash;

    if (serverError) {
      return {
        success: false,
        error: `The host did not store the tier change: ${serverError}`,
        tutor: copy
      };
    }

    return {
      success: true,
      message: `Tutor ${cleanTargetEmail} tier updated to ${(params.tier || copy.tier).toUpperCase()} on this device. The host was unreachable — save again from the console when it is back so sign-in everywhere sees the new tier.`,
      tutor: copy
    };
  },

  /**
   * Admin: set or reset one tutor's password.
   *
   * Order matters. The hosted auth.php is what online sign-in checks, so it is
   * written FIRST; the local Express mirror (dev / self-hosted) and this browser's
   * offline copy follow. The password is stored as a server bcrypt hash plus the
   * client-compatible salted SHA-256 hash, so the tutor can sign in online and
   * offline with the new password. Sessions are never invalidated by a reset.
   */
  async adminSetPassword(params: {
    adminEmail: string;
    adminToken: string;
    adminPass?: string;
    targetEmail: string;
    newPassword: string;
  }): Promise<AuthResponse & { serverSynced: boolean }> {
    const cleanTarget = params.targetEmail.toLowerCase().trim();
    const newPassword = String(params.newPassword || '');
    if (cleanTarget === '') {
      return { success: false, serverSynced: false, error: 'A tutor email is required.' };
    }
    if (newPassword.length < 6) {
      return { success: false, serverSynced: false, error: 'The new password must be at least 6 characters.' };
    }

    let serverSynced = false;
    let serverMessage = '';
    let lastError = '';

    // 1. Hosted auth.php — authoritative for online sign-in
    try {
      const res = await fetch(`${getAuthEndpoint()}?action=set_password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: params.adminEmail,
          token: params.adminToken,
          password: params.adminPass || ADMIN_DEFAULT_PASS,
          targetEmail: cleanTarget,
          newPassword
        })
      });
      const data = await res.json().catch(() => null);
      // A host that does not know this action answers with a generic {tutors:[…]}
      // payload and success:true — that is NOT a synced password change, so it must
      // fall through to the local server instead of being reported as done.
      const genericFallback = Array.isArray((data as any)?.tutors) && !(data as any)?.updatedAt;
      if (res.ok && data && data.success && !genericFallback) {
        serverSynced = true;
        serverMessage = data.message || '';
      } else if (data && data.error) {
        lastError = data.error;
        // An explicit rejection (wrong admin pass / unknown tutor) must not be
        // silently turned into a local-only change.
        if (res.status === 403 || res.status === 404 || res.status === 400) {
          return { success: false, serverSynced: false, error: data.error };
        }
      }
    } catch (e) {
      console.warn('Hosted auth.php set_password unreachable, trying the local server:', e);
    }

    // 2. Local Express mirror (works in dev and on self-hosted installs)
    if (!serverSynced) {
      try {
        const res = await fetch('/api/admin/set-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetEmail: cleanTarget,
            newPassword,
            adminEmail: params.adminEmail,
            adminPass: params.adminPass || ADMIN_DEFAULT_PASS
          })
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data && data.success) {
          serverSynced = true;
          serverMessage = data.message || '';
        } else if (data && data.error) {
          lastError = data.error;
        }
      } catch (e) {
        console.warn('Local set-password endpoint unavailable:', e);
      }
    }

    // 3. Offline copy so this browser accepts the new password immediately
    const localHash = await hashPassword(newPassword);
    const localDB = getLocalTutorsDB();
    const existing = localDB[cleanTarget];
    if (existing) {
      existing.passwordHash = localHash;
      existing.passwordHashSha256 = localHash;
      existing.notes = existing.notes || 'Password updated by Super Admin';
    } else {
      localDB[cleanTarget] = {
        id: 'tut_' + Date.now(),
        email: cleanTarget,
        name: cleanTarget.split('@')[0],
        avatarUrl: '',
        avatarId: 'tutor-default-avatar',
        bio: 'Language Tutor',
        teachingMethod: 'Communicative Approach',
        interests: 'General Learning',
        nativeLanguage: 'English',
        country: 'Global',
        timezone: 'UTC',
        tier: 'free',
        status: 'active',
        role: 'tutor',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        notes: 'Password updated by Super Admin',
        passwordHash: localHash,
        passwordHashSha256: localHash
      };
    }
    saveLocalTutorsDB(localDB);

    if (!serverSynced) {
      return {
        success: true,
        serverSynced: false,
        message: `Password changed for ${cleanTarget} on this device. The host auth file could not be reached${lastError ? ` (${lastError})` : ''} — online sign-in will switch over once the host is reachable, so save again from the console then.`
      };
    }

    return {
      success: true,
      serverSynced: true,
      message: serverMessage || `Password updated for ${cleanTarget}. The tutor can sign in with the new password right away.`
    };
  },

  /**
   * Admin: Delete tutor
   */
  async deleteTutor(adminEmail: string, adminToken: string, targetEmail: string, adminPass?: string): Promise<boolean> {
    const body = JSON.stringify({
      email: adminEmail,
      token: adminToken,
      password: adminPass || ADMIN_DEFAULT_PASS,
      targetEmail
    });
    // 1. Local Express mirror (already authorized by the admin password)
    try {
      const localRes = await fetch('/api/admin/delete-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });
      if (localRes.ok) {
        const localData = await localRes.json().catch(() => null);
        if (localData && localData.success) {
          const localDB = getLocalTutorsDB();
          delete localDB[targetEmail];
          saveLocalTutorsDB(localDB);
          return true;
        }
      }
    } catch (e) {
      console.warn('Local delete-tutor endpoint unavailable:', e);
    }

    try {
      const endpoint = `${getAuthEndpoint()}?action=delete_tutor`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const localDB = getLocalTutorsDB();
          delete localDB[targetEmail];
          saveLocalTutorsDB(localDB);
          return true;
        }
      }
    } catch (e) {
      console.warn('Server delete_tutor error:', e);
    }

    const localDB = getLocalTutorsDB();
    delete localDB[targetEmail];
    saveLocalTutorsDB(localDB);
    return true;
  },

  /**
   * Activate VIP or PRO tier using an activation code
   */
  async activateCode(code: string, email?: string): Promise<{ success: boolean; tier?: UserTier; message?: string }> {
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: 'Please enter a valid code.' };
    }

    // 1. Try server activation
    try {
      const endpoint = `${getAuthEndpoint()}?action=activate_code`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode, email })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.tier) {
          const session = this.getStoredSession();
          if (session && session.tutor) {
            session.tutor.tier = data.tier;
            this.saveSession(session.tutor, session.token);
          }
          return { success: true, tier: data.tier, message: data.message || `Successfully activated ${data.tier.toUpperCase()}!` };
        } else if (data.error) {
          return { success: false, message: data.error };
        }
      }
    } catch {
      // Fallback
    }

    // 2. Offline / Server error fallback
    return {
      success: false,
      message: 'Invalid activation code. Please contact the administrator (info.tutomy@gmail.com) for assistance.'
    };
  },

  /**
   * Admin: Test the hosted MySQL database connection via auth.php?action=db_status.
   * Returns a full health report (config found, connected, table exists, count).
   */
  /**
   * Ask the host to email a one-time code so the account holder can set a new
   * password themselves (auth.php?action=password_reset_request).
   *
   * This is what actually resolves "account(s) have no usable password hash": the
   * repair tool can only REPORT those accounts, and until now the only cure was an
   * admin reset. The address always answers the same way, so it cannot be used to
   * find out which addresses are registered.
   */
  async requestPasswordReset(emailInput: string): Promise<AuthResponse> {
    const email = emailInput.trim().toLowerCase();
    try {
      const res = await fetch(`${getAuthEndpoint()}?action=password_reset_request&_t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        cache: 'no-store',
        body: JSON.stringify({ email })
      });
      const data = (await res.json().catch(() => null)) as AuthResponse | null;
      if (!data) return { success: false, error: 'The host did not return a valid answer.' };
      return data;
    } catch (e: any) {
      return { success: false, error: 'Could not reach auth.php on the host: ' + (e.message || e) };
    }
  },

  /**
   * Finish a self-service reset: the emailed code plus the new password
   * (auth.php?action=password_reset_confirm). The host verifies the code, stores
   * both the bcrypt hash and the salted SHA-256 the offline fallback uses, and
   * clears the code so it is single-use.
   */
  async confirmPasswordReset(emailInput: string, code: string, newPassword: string): Promise<AuthResponse> {
    const email = emailInput.trim().toLowerCase();
    try {
      const res = await fetch(`${getAuthEndpoint()}?action=password_reset_confirm&_t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        cache: 'no-store',
        body: JSON.stringify({ email, code: code.trim(), newPassword })
      });
      const data = (await res.json().catch(() => null)) as AuthResponse | null;
      if (!data) return { success: false, error: 'The host did not return a valid answer.' };
      return data;
    } catch (e: any) {
      return { success: false, error: 'Could not reach auth.php on the host: ' + (e.message || e) };
    }
  },

  async testDatabaseConnection(): Promise<{
    success: boolean;
    mysqlConnected?: boolean;
    configFound?: boolean;
    configSource?: string;
    /** The credentials-file path that actually answered, if any. */
    configFile?: string | null;
    /** Every path that was checked — so "NOT FOUND" is actionable. */
    configTried?: string[];
    configHasNulls?: boolean;
    pdoAvailable?: boolean;
    /** Separate from pdoAvailable: PDO can exist without the mysql driver. */
    pdoMysqlDriver?: boolean;
    tableExists?: boolean;
    accountCount?: number;
    storageSource?: string;
    /** Plain-language cause. Never contains the DB user or database name. */
    error?: string;
    /** The MySQL error number, when the failure came from MySQL itself. */
    errorCode?: string | null;
  }> {
    const session = this.getStoredSession();
    const email = session?.tutor?.email || ADMIN_EMAIL;
    const token = session?.token || '';
    try {
      const endpoint = `${getAuthEndpoint()}?action=db_status&_t=${Date.now()}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        cache: 'no-store',
        body: JSON.stringify(adminAuthBody(email, token))
      });
      const data = await res.json();
      return { success: !!data.success, ...data };
    } catch (e: any) {
      return { success: false, error: 'Could not reach auth.php on the host: ' + (e.message || e) };
    }
  },

  /**
   * Admin: Live VIP cloud-storage report via auth.php?action=cloud_stats.
   *
   * Aggregates, per-section sums, the host's own table sizes, and ONE small row per
   * tutor (largest first, capped server-side) — the payload blobs are never
   * transferred, so this is cheap enough to poll while the roster grows.
   */
  async getCloudStats(): Promise<{
    success: boolean;
    checkedAt?: string;
    quotaBytes?: number;
    tutorsWithBackup?: number;
    storedBytes?: number;
    rawBytes?: number;
    revisions?: number;
    indexRows?: number;
    indexBytes?: number;
    tables?: Array<{ name: string; rows: number; bytes: number }>;
    sections?: Array<{ section: string; tutors: number; items: number; bytes: number }>;
    tutors?: Array<{
      email: string;
      name?: string;
      tier?: string | null;
      bytes: number;
      rawBytes: number;
      revision: number;
      device?: string;
      updatedAt?: string;
      percent?: number;
    }>;
    overQuota?: Array<{ email: string }>;
    nearQuota?: Array<{ email: string }>;
    orphaned?: Array<{ email: string }>;
    unsupported?: boolean;
    error?: string;
  }> {
    const session = this.getStoredSession();
    const email = session?.tutor?.email || ADMIN_EMAIL;
    const token = session?.token || '';
    try {
      const endpoint = `${getAuthEndpoint()}?action=cloud_stats&_t=${Date.now()}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        cache: 'no-store',
        body: JSON.stringify(adminAuthBody(email, token))
      });
      const data = await res.json();
      // An older auth.php answers `cloud_stats` with "Invalid action specified" (or an
      // unparseable body). Say so plainly instead of rendering an empty report as
      // "no tutors are using the cloud" — which would read as good news.
      if (data && data.success !== true && typeof data.error === 'string' && /Invalid action/i.test(data.error)) {
        return {
          success: false,
          unsupported: true,
          error: 'This host is still running an older auth.php without the cloud report. Upload the new public/auth.php from your build (dist/auth.php) and reload this console.'
        };
      }
      return { success: !!data.success, ...data };
    } catch (e: any) {
      return { success: false, error: 'Could not reach auth.php on the host: ' + (e.message || e) };
    }
  },

  /**
   * Admin: Import every account from the encrypted-file store into MySQL on
   * demand via auth.php?action=db_migrate. Returns per-account results.
   * Idempotent — existing rows are updated, never duplicated.
   */
  async migrateDatabase(): Promise<{
    success: boolean;
    migrated?: number;
    failed?: number;
    total?: number;
    adminIncluded?: boolean;
    results?: Array<{
      email: string;
      name?: string;
      tier?: string;
      status?: string;
      role?: string;
      result?: string;
      error?: string | null;
    }>;
    migratedAt?: string;
    error?: string;
  }> {
    const session = this.getStoredSession();
    const email = session?.tutor?.email || ADMIN_EMAIL;
    const token = session?.token || '';
    try {
      const endpoint = `${getAuthEndpoint()}?action=db_migrate&_t=${Date.now()}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        cache: 'no-store',
        body: JSON.stringify(adminAuthBody(email, token))
      });
      const data = await res.json();
      return { success: !!data.success, ...data };
    } catch (e: any) {
      return { success: false, error: 'Could not reach auth.php on the host: ' + (e.message || e) };
    }
  },

  /**
   * Admin: Bring the MySQL schema up to date via auth.php?action=db_schema_sync.
   * Creates the `users` + cloud tables when missing and ADDs any column the current
   * build expects but the table lacks. Idempotent and non-destructive.
   */
  async syncDatabaseSchema(): Promise<{
    success: boolean;
    tableCreated?: boolean;
    columnsAdded?: string[];
    notes?: string[];
    cloudTablesReady?: boolean;
    tables?: string[];
    columnCount?: number;
    schemaVersion?: number;
    checkedAt?: string;
    unsupported?: boolean;
    error?: string;
  }> {
    const session = this.getStoredSession();
    const email = session?.tutor?.email || ADMIN_EMAIL;
    const token = session?.token || '';
    try {
      const endpoint = `${getAuthEndpoint()}?action=db_schema_sync&_t=${Date.now()}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        cache: 'no-store',
        body: JSON.stringify(adminAuthBody(email, token))
      });
      const data = await res.json();
      if (data && data.success !== true && typeof data.error === 'string' && /Invalid action/i.test(data.error)) {
        return { success: false, unsupported: true, error: 'This host is still running an older auth.php without schema sync. Upload the new public/auth.php from this build (dist/auth.php) and reload this console.' };
      }
      return { success: !!data.success, ...data };
    } catch (e: any) {
      return { success: false, error: 'Could not reach auth.php on the host: ' + (e.message || e) };
    }
  },

  /**
   * Admin: Repair accounts that cannot sign in because their password hash is
   * missing, via auth.php?action=login_repair. Copies the hash back from whichever
   * store still holds it (encrypted file or MySQL) and reports accounts that
   * genuinely need a new password.
   */
  async repairSignIn(): Promise<{
    success: boolean;
    repaired?: number;
    stillMissing?: number;
    needsResetAccounts?: Array<{ email: string; name?: string }>;
    saved?: boolean;
    totalAccounts?: number;
    checkedAt?: string;
    unsupported?: boolean;
    error?: string;
  }> {
    const session = this.getStoredSession();
    const email = session?.tutor?.email || ADMIN_EMAIL;
    const token = session?.token || '';
    try {
      const endpoint = `${getAuthEndpoint()}?action=login_repair&_t=${Date.now()}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        cache: 'no-store',
        body: JSON.stringify(adminAuthBody(email, token))
      });
      const data = await res.json();
      if (data && data.success !== true && typeof data.error === 'string' && /Invalid action/i.test(data.error)) {
        return { success: false, unsupported: true, error: 'This host is still running an older auth.php without sign-in repair. Upload the new public/auth.php from this build (dist/auth.php) and reload this console.' };
      }
      return { success: !!data.success, ...data };
    } catch (e: any) {
      return { success: false, error: 'Could not reach auth.php on the host: ' + (e.message || e) };
    }
  },

  /**
   * Admin: Check whether the hosted auth file stores accounts in the current
   * structure. When the deployed auth.php/data predates the tier-expiry + learner
   * limit fields, this reports which accounts need an in-place upgrade.
   */
  async getAuthSchemaStatus(adminEmail: string, adminToken: string, adminPass?: string): Promise<{
    success: boolean;
    currentVersion?: number;
    needsUpdate?: boolean;
    accountsNeedingUpdate?: number;
    totalAccounts?: number;
    outdatedAccounts?: any[];
    missingFields?: string[];
    error?: string;
  }> {
    try {
      const endpoint = `${getAuthEndpoint()}?action=auth_schema_status`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, token: adminToken, password: adminPass || ADMIN_DEFAULT_PASS })
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) {
      console.warn('auth_schema_status failed:', e);
    }
    return { success: false, error: 'Could not reach auth file. If you just uploaded this build, the hosted auth.php may be an older version — upload the new auth.php first.' };
  },

  /**
   * Admin: In-place migration of the hosted auth file to the current structure.
   * Adds the new fields (schemaVersion, tierExpiresAt, tierSig, emailVerified,
   * learner limits) with safe defaults to every stored account. Users, emails,
   * password hashes, tokens and existing tier access are NEVER removed.
   */
  async migrateAuthSchema(adminEmail: string, adminToken: string, adminPass?: string): Promise<{
    success: boolean;
    migrated?: number;
    alreadyCurrent?: number;
    totalAccounts?: number;
    upgradedAccounts?: any[];
    message?: string;
    error?: string;
  }> {
    try {
      const endpoint = `${getAuthEndpoint()}?action=auth_schema_migrate`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, token: adminToken, password: adminPass || ADMIN_DEFAULT_PASS })
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) {
      console.warn('auth_schema_migrate failed:', e);
    }
    return { success: false, error: 'Migration request failed. Check folder permissions (data/ must be writable on the host).' };
  },

  /**
   * ── Credential Vault (Super Admin Console → 🔐 Credentials) ──────────────
   *
   * One extra lock in front of the account passwords. The vault requires the
   * admin session PLUS a secondary passphrase or a Google Authenticator code,
   * and it only exists on a host running the current auth.php — an older
   * deployment answers every vault action with the generic tutor list, which is
   * reported here as `unsupported` instead of being mistaken for success.
   */
  async vaultStatus(params: VaultAdminAuth): Promise<VaultResult> {
    return vaultRequest('vault_status', params);
  },

  async vaultGateSetup(params: VaultAdminAuth & {
    secondPass?: string;
    enableTotp?: boolean;
    confirmTotp?: boolean;
    totpCode?: string;
    disableTotp?: boolean;
    disableSecondPass?: boolean;
  }): Promise<VaultResult> {
    return vaultRequest('vault_gate_setup', params);
  },

  async vaultUnlock(params: VaultAdminAuth & { secondPass?: string; totpCode?: string }): Promise<VaultResult> {
    return vaultRequest('vault_unlock', params);
  },

  async vaultCredentials(params: VaultAdminAuth & { unlockToken: string }): Promise<VaultResult & { tutors?: VaultCredentialRow[] }> {
    return vaultRequest('vault_credentials', params);
  },

  async vaultTestPassword(params: VaultAdminAuth & {
    unlockToken: string;
    targetEmail: string;
    candidate: string;
  }): Promise<VaultResult & { verified?: boolean; method?: string | null; targetEmail?: string; hashHealth?: string }> {
    return vaultRequest('vault_test_password', params);
  },

  async vaultForgetPassword(params: VaultAdminAuth & {
    unlockToken: string;
    targetEmail?: string;
    purgeAll?: boolean;
  }): Promise<VaultResult> {
    return vaultRequest('vault_forget_password', params);
  },

  /**
   * Read the host's own deployment report (?action=version): which runtime is
   * serving requests, how many accounts exist, and whether the stored password
   * hashes are healthy. No secrets are returned, so it is safe to open directly
   * in a browser when a deploy "did not seem to take".
   */
  async getHostVersion(): Promise<Record<string, any> | null> {
    try {
      const res = await fetch(`${getAuthEndpoint()}?action=version&_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.runtime) return data;
      }
    } catch (e) {
      console.warn('version check failed:', e);
    }
    return null;
  },

  /**
   * Save session to localStorage
   */
  saveSession(tutor: TutorAccount, token: string) {
    try {
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify({ tutor, token }));
      // Set legacy flags for seamless backward compatibility
      if (tutor.tier === 'vip') {
        localStorage.setItem('tutorly_vip', 'true');
        localStorage.setItem('tutorly_premium', 'true');
      } else if (tutor.tier === 'pro') {
        localStorage.setItem('tutorly_vip', 'false');
        localStorage.setItem('tutorly_premium', 'true');
      } else {
        localStorage.setItem('tutorly_vip', 'false');
        localStorage.setItem('tutorly_premium', 'false');
      }
    } catch (e) {
      console.warn('Failed to save session:', e);
    }
  },

  /**
   * Get session from localStorage
   */
  getStoredSession(): { tutor: TutorAccount; token: string } | null {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to read session:', e);
    }
    return null;
  },

  /**
   * Clear session on Sign Out
   */
  clearSession() {
    try {
      localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
      localStorage.setItem('tutorly_vip', 'false');
      localStorage.setItem('tutorly_premium', 'false');
    } catch (e) {
      console.warn('Failed to clear session:', e);
    }
  }
};
