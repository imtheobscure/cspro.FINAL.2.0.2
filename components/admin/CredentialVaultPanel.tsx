// ============================================================
// 🔐 CREDENTIAL VAULT — Super Admin Console panel
// ============================================================
// The most sensitive screen in the app, behind a SECOND lock:
//   • a secondary admin passphrase (not the sign-in password), and/or
//   • a Google Authenticator / Authy code (set up once, right here).
//
// Inside, every account's chosen password can be revealed (when it was ever
// captured while in memory), tested against the live server, or replaced.
// Accounts that existed before the vault only have one-way hashes — those are
// shown as "not recoverable" and can only be reset.
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  tutorAuthService,
  VaultCredentialRow,
  VaultResult
} from '../../services/tutorAuthService';

interface Props {
  adminEmail: string;
  adminToken: string;
  adminPass?: string;
  /** Opens the console's existing "Change Password" flow for one account. */
  onRequestPasswordChange: (email: string) => void;
}

const fmt = (value?: string | null): string => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
};

const groupSecret = (secret: string): string => (secret.match(/.{1,4}/g) || []).join(' ');

export const CredentialVaultPanel: React.FC<Props> = ({
  adminEmail,
  adminToken,
  adminPass,
  onRequestPasswordChange
}) => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<VaultResult | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Second-factor entry
  const [secondPass, setSecondPass] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [unlockToken, setUnlockToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  // First-time setup / rotate
  const [showSetup, setShowSetup] = useState(false);
  const [newSecondPass, setNewSecondPass] = useState('');
  const [repeatSecondPass, setRepeatSecondPass] = useState('');
  const [pendingSecret, setPendingSecret] = useState<string | null>(null);
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState('');

  // Revealed data
  const [rows, setRows] = useState<VaultCredentialRow[]>([]);
  const [search, setSearch] = useState('');
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  // Per-account login tester
  const [testTarget, setTestTarget] = useState<string | null>(null);
  const [testValue, setTestValue] = useState('');
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const auth = useMemo(
    () => ({ adminEmail, adminToken, adminPass }),
    [adminEmail, adminToken, adminPass]
  );

  const isUnlocked = !!unlockToken;

  /** Seconds until the unlock token expires (0 = locked). */
  const [secondsLeft, setSecondsLeft] = useState(0);
  useEffect(() => {
    if (!isUnlocked || !expiresAt) {
      setSecondsLeft(0);
      return;
    }
    const tick = () => {
      const left = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        setUnlockToken(null);
        setRows([]);
        setRevealed({});
        setNotice('The vault locked itself again after 15 minutes. Unlock it to continue.');
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [isUnlocked, expiresAt]);

  const loadStatus = useCallback(async () => {
    const res = await tutorAuthService.vaultStatus(auth);
    setStatus(res);
    if (!res.success) {
      // "Unsupported host" gets its own amber explainer below — no extra banner.
      if (!res.unsupported) setError(res.error || 'Could not read the vault status.');
    } else {
      setError(null);
    }
    return res;
  }, [auth]);

  const loadRows = useCallback(async (token: string) => {
    const res = await tutorAuthService.vaultCredentials({ ...auth, unlockToken: token });
    if (res.success && res.tutors) {
      setRows(res.tutors);
      setError(null);
    } else if (res.locked) {
      setUnlockToken(null);
      setError(res.error || 'The vault locked itself. Unlock it again.');
    } else {
      setError(res.error || 'Could not read the stored passwords.');
    }
    return res;
  }, [auth]);

  useEffect(() => {
    if (open && !status) void loadStatus();
  }, [open, status, loadStatus]);

  const handleUnlock = async () => {
    if (!secondPass && !totpCode) {
      setError('Enter your secondary passphrase or a current authenticator code.');
      return;
    }
    setIsBusy(true);
    setError(null);
    const res = await tutorAuthService.vaultUnlock({
      ...auth,
      secondPass: secondPass || undefined,
      totpCode: totpCode || undefined
    });
    setIsBusy(false);
    if (!res.success || !res.unlockToken) {
      setError(res.error || 'Could not unlock the vault.');
      return;
    }
    setUnlockToken(res.unlockToken);
    setExpiresAt(res.expiresAt || null);
    setSecondPass('');
    setTotpCode('');
    setNotice('Vault unlocked for 15 minutes.');
    await loadRows(res.unlockToken);
  };

  const handleSaveSecondPass = async () => {
    if (newSecondPass.length < 8) {
      setError('The secondary passphrase must be at least 8 characters.');
      return;
    }
    if (newSecondPass !== repeatSecondPass) {
      setError('The two passphrase fields must match.');
      return;
    }
    setIsBusy(true);
    setError(null);
    const res = await tutorAuthService.vaultGateSetup({
      ...auth,
      secondPass: newSecondPass,
      // An existing lock must be proven before it can be changed.
      unlockToken: unlockToken || undefined,
      totpCode: totpCode || undefined
    });
    setIsBusy(false);
    if (!res.success) {
      setError(res.error || 'Could not save the secondary passphrase.');
      return;
    }
    setNewSecondPass('');
    setRepeatSecondPass('');
    setNotice(res.message || 'Secondary passphrase saved.');
    await loadStatus();
  };

  const handleStartTotp = async () => {
    setIsBusy(true);
    setError(null);
    const res = await tutorAuthService.vaultGateSetup({
      ...auth,
      enableTotp: true,
      unlockToken: unlockToken || undefined,
      secondPass: secondPass || undefined,
      totpCode: totpCode || undefined
    });
    setIsBusy(false);
    if (!res.success) {
      setError(res.error || 'Could not start the authenticator setup.');
      return;
    }
    setPendingSecret(res.totpSecret || null);
    setPendingUri(res.otpauthUri || null);
    setNotice(res.message || 'Add the key to Google Authenticator, then confirm a code.');
  };

  const handleConfirmTotp = async () => {
    setIsBusy(true);
    setError(null);
    const res = await tutorAuthService.vaultGateSetup({
      ...auth,
      confirmTotp: true,
      totpCode: confirmCode,
      unlockToken: unlockToken || undefined,
      secondPass: secondPass || undefined
    });
    setIsBusy(false);
    if (!res.success) {
      setError(res.error || 'That code was not accepted.');
      return;
    }
    setConfirmCode('');
    setPendingSecret(null);
    setPendingUri(null);
    setNotice(res.message || 'Google Authenticator is now required for the vault.');
    await loadStatus();
  };

  const handleDisableTotp = async () => {
    if (!window.confirm('Stop requiring an authenticator code for the credential vault?')) return;
    setIsBusy(true);
    setError(null);
    const res = await tutorAuthService.vaultGateSetup({
      ...auth,
      disableTotp: true,
      unlockToken: unlockToken || undefined,
      secondPass: secondPass || undefined,
      totpCode: totpCode || undefined
    });
    setIsBusy(false);
    if (!res.success) {
      setError(res.error || 'Could not disable the authenticator.');
      return;
    }
    setNotice(res.message || 'Authenticator requirement removed.');
    await loadStatus();
  };

  const handleTest = async (email: string) => {
    if (!unlockToken) return;
    setIsBusy(true);
    setTestResult(null);
    const res = await tutorAuthService.vaultTestPassword({
      ...auth,
      unlockToken,
      targetEmail: email,
      candidate: testValue
    });
    setIsBusy(false);
    if (!res.success) {
      setTestResult({ ok: false, message: res.error || 'The test could not be run.' });
      return;
    }
    setTestResult(
      res.verified
        ? { ok: true, message: `✅ This IS the current password (verified by ${res.method || 'the server'}).` }
        : { ok: false, message: `❌ Not the current password. Stored hash: ${res.hashHealth || 'unknown'}.` }
    );
  };

  const handleForget = async (email: string) => {
    if (!unlockToken) return;
    if (!window.confirm(`Stop storing a readable copy of ${email}'s password?\n\nTheir sign-in password does NOT change — the console just will not be able to reveal it again.`)) return;
    setIsBusy(true);
    const res = await tutorAuthService.vaultForgetPassword({ ...auth, unlockToken, targetEmail: email });
    setIsBusy(false);
    if (!res.success) {
      setError(res.error || 'Could not forget that copy.');
      return;
    }
    setNotice(res.message || 'Stored copy forgotten.');
    await loadRows(unlockToken);
  };

  const handlePurge = async () => {
    if (!unlockToken) return;
    if (!window.confirm('Delete EVERY stored readable password copy?\n\nNo sign-in password changes — the console simply stops being able to reveal them. Accounts keep working normally.')) return;
    setIsBusy(true);
    const res = await tutorAuthService.vaultForgetPassword({ ...auth, unlockToken, purgeAll: true });
    setIsBusy(false);
    if (!res.success) {
      setError(res.error || 'Could not purge the stored copies.');
      return;
    }
    setNotice(res.message || 'Stored copies purged.');
    await loadRows(unlockToken);
  };

  const copy = async (email: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(email);
      window.setTimeout(() => setCopied((c) => (c === email ? null : c)), 1600);
    } catch {
      setError('Your browser blocked clipboard access — reveal the password and copy it manually.');
    }
  };

  const filteredRows = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (r.name || '').toLowerCase().includes(q) || (r.email || '').toLowerCase().includes(q);
  });

  const recoverable = rows.filter((r) => r.password).length;
  const configured = !!status?.configured;

  return (
    <div className="mt-3 rounded-2xl border-2 border-indigo-300/70 dark:border-indigo-800/70 bg-gradient-to-br from-indigo-50/80 to-slate-50 dark:from-indigo-950/30 dark:to-slate-900/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left cursor-pointer hover:bg-indigo-100/60 dark:hover:bg-indigo-950/40 transition"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-base">🔐</span>
          <span className="font-black text-sm text-indigo-900 dark:text-indigo-200">Credential Vault</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white uppercase">Second lock</span>
          <span className="text-[11px] text-indigo-800/90 dark:text-indigo-300/90 truncate">
            {configured
              ? `Unlock with ${status?.secondPassSet ? 'your passphrase' : ''}${status?.secondPassSet && status?.totpEnabled ? ' or ' : ''}${status?.totpEnabled ? 'Google Authenticator' : ''} to see or change each user's password`
              : 'Set a secondary passphrase or Google Authenticator, then view / change every user password'}
          </span>
        </span>
        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 shrink-0">{open ? '▲ Hide' : '▼ Open'}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          {error && (
            <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-[11px] font-semibold text-rose-800 dark:text-rose-200 flex items-start justify-between gap-2">
              <span>⚠️ {error}</span>
              <button onClick={() => setError(null)} className="opacity-60 hover:opacity-100">✕</button>
            </div>
          )}
          {notice && (
            <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200 flex items-start justify-between gap-2">
              <span>✅ {notice}</span>
              <button onClick={() => setNotice(null)} className="opacity-60 hover:opacity-100">✕</button>
            </div>
          )}

          {status?.unsupported && (
            <div className="rounded-xl border border-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-[11px] font-semibold text-amber-900 dark:text-amber-200">
              {/^localhost$|^127\.0\.0\.1$/.test(window.location.hostname)
                ? 'This local dev server (Node) does not provide the credential vault — it is a feature of the cPanel PHP host (public/auth.php). On the live site, upload the new dist/auth.php if you see this message.'
                : 'This host is still running an older auth.php, so it has no credential vault. Upload the new auth.php from this build (it ships as dist/auth.php), then reopen the console. You can confirm what is live by opening /auth.php?action=version.'}
            </div>
          )}

          {/* Security posture — always visible */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 px-3 py-2 text-[10px] leading-relaxed text-slate-600 dark:text-slate-300">
            <b>How this works:</b> a readable copy of a password is kept (AES-encrypted on the host) only for accounts whose
            password passed through the server while signed in — registrations, sign-ins and admin resets.
            Accounts created before this feature only have one-way hashes, so they can be <b>reset</b> but never revealed.
            {status?.captureEnabled === false && <span className="text-amber-700 dark:text-amber-300"> Plain-text capture is switched off on this host (VAULT_CAPTURE_ENABLED).</span>}
            {typeof status?.storedPasswords === 'number' && <span> Stored copies on the host: <b>{status.storedPasswords}</b>.</span>}
          </div>

          {/* ── Locked: the second factor ─────────────────────────────── */}
          {!isUnlocked && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-black text-slate-800 dark:text-slate-100">
                  {configured ? '🔒 Vault locked — verify your second factor' : '⚙️ No second factor yet — create one'}
                </div>
                <button
                  onClick={() => setShowSetup((v) => !v)}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  {showSetup ? 'Cancel setup' : configured ? 'Change lock' : 'Set up lock'}
                </button>
              </div>

              {configured ? (
                <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] items-end">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {status?.secondPassSet && (
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        Secondary passphrase
                        <input
                          type="password"
                          value={secondPass}
                          onChange={(e) => setSecondPass(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') void handleUnlock(); }}
                          className="mt-0.5 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs"
                          placeholder="••••••••"
                        />
                      </label>
                    )}
                    {status?.totpEnabled && (
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        Google Authenticator code
                        <input
                          inputMode="numeric"
                          value={totpCode}
                          onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          onKeyDown={(e) => { if (e.key === 'Enter') void handleUnlock(); }}
                          className="mt-0.5 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs tracking-[0.3em] font-mono"
                          placeholder="123456"
                        />
                      </label>
                    )}
                  </div>
                  <button
                    onClick={handleUnlock}
                    disabled={isBusy}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black disabled:opacity-50 cursor-pointer"
                  >
                    {isBusy ? '⏳ Verifying…' : '🔓 Unlock vault'}
                  </button>
                  <span className="text-[10px] text-slate-500">Either factor works.</span>
                </div>
              ) : (
                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                  The vault is currently <b>not protected</b>: your master password alone would open it.
                  Use <b>Set up lock</b> to add a secondary passphrase and (optionally) Google Authenticator.
                </div>
              )}

              {showSetup && (
                <div className="mt-1 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/30 p-3 space-y-3">
                  {/* 1. Secondary passphrase */}
                  <div>
                    <div className="text-[11px] font-black text-indigo-900 dark:text-indigo-200 mb-1">
                      1. Secondary admin passphrase {status?.secondPassSet && <span className="font-normal">(set — enter a new one to replace it)</span>}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        type="password"
                        value={newSecondPass}
                        onChange={(e) => setNewSecondPass(e.target.value)}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs"
                        placeholder="New secondary passphrase (8+ characters)"
                      />
                      <input
                        type="password"
                        value={repeatSecondPass}
                        onChange={(e) => setRepeatSecondPass(e.target.value)}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs"
                        placeholder="Repeat it"
                      />
                    </div>
                    <button
                      onClick={handleSaveSecondPass}
                      disabled={isBusy}
                      className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black disabled:opacity-50 cursor-pointer"
                    >
                      Save passphrase
                    </button>
                    <div className="mt-1 text-[10px] text-slate-500">
                      Keep this different from your sign-in password. Changing an existing lock also needs the current factor below.
                    </div>
                  </div>

                  {/* 2. Google Authenticator */}
                  <div className="pt-2 border-t border-indigo-200 dark:border-indigo-900">
                    <div className="text-[11px] font-black text-indigo-900 dark:text-indigo-200 mb-1">
                      2. Google Authenticator (optional but recommended)
                    </div>
                    {status?.totpEnabled ? (
                      <div className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
                        ✅ Authenticator code required
                        <button onClick={handleDisableTotp} disabled={isBusy} className="text-[10px] font-bold underline cursor-pointer">
                          remove
                        </button>
                      </div>
                    ) : !pendingSecret ? (
                      <button
                        onClick={handleStartTotp}
                        disabled={isBusy}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-black disabled:opacity-50 cursor-pointer"
                      >
                        📱 Generate an authenticator key
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <ol className="text-[11px] text-slate-700 dark:text-slate-200 list-decimal list-inside space-y-1">
                          <li>Open Google Authenticator (or Authy) → <b>Add account</b> → <b>Enter a setup key</b>.</li>
                          <li>Account name: <span className="font-mono">Tutomy Super Admin</span></li>
                          <li>
                            Key:
                            <span className="font-mono font-black tracking-wide ml-1 select-all">{groupSecret(pendingSecret)}</span>
                            <button
                              onClick={() => copy('totp-secret', pendingSecret)}
                              className="ml-2 text-[10px] font-bold underline cursor-pointer"
                            >
                              {copied === 'totp-secret' ? 'copied' : 'copy'}
                            </button>
                          </li>
                          <li>Type: <b>Time based</b> · 6 digits · 30 seconds</li>
                        </ol>
                        {pendingUri && (
                          <div className="text-[10px] text-slate-500 break-all font-mono bg-white/70 dark:bg-slate-900/60 rounded-lg p-2">
                            {pendingUri}
                          </div>
                        )}
                        <div className="flex items-end gap-2">
                          <input
                            inputMode="numeric"
                            value={confirmCode}
                            onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-28 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs font-mono tracking-[0.3em]"
                            placeholder="123456"
                          />
                          <button
                            onClick={handleConfirmTotp}
                            disabled={isBusy || confirmCode.length !== 6}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black disabled:opacity-50 cursor-pointer"
                          >
                            Confirm & switch on
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Unlocked: the credentials ─────────────────────────────── */}
          {isUnlocked && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/85 dark:bg-slate-900/60 p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">🔓 Unlocked</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
                  re-locks in {Math.floor(secondsLeft / 60)}m {String(secondsLeft % 60).padStart(2, '0')}s
                </span>
                <span className="text-[11px] text-slate-600 dark:text-slate-300">
                  {rows.length} accounts · {recoverable} with a readable password
                </span>
                <div className="flex-1" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name or email…"
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-[11px]"
                />
                <button
                  onClick={() => unlockToken && loadRows(unlockToken)}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[10px] font-bold cursor-pointer"
                  title="Reload the stored passwords"
                >
                  ⟳ Reload
                </button>
                <button
                  onClick={handlePurge}
                  className="px-2 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold cursor-pointer"
                  title="Delete every stored readable copy (no password changes)"
                >
                  🗑 Purge stored copies
                </button>
                <button
                  onClick={() => { setUnlockToken(null); setRows([]); setRevealed({}); setNotice('Vault locked.'); }}
                  className="px-2 py-1 rounded-lg bg-slate-800 text-white text-[10px] font-bold cursor-pointer"
                >
                  🔒 Lock now
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-[11px]">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-left">
                    <tr>
                      <th className="px-2 py-1.5 font-black">Account</th>
                      <th className="px-2 py-1.5 font-black">Role / Tier</th>
                      <th className="px-2 py-1.5 font-black">Chosen password</th>
                      <th className="px-2 py-1.5 font-black">Stored hash</th>
                      <th className="px-2 py-1.5 font-black">Last change</th>
                      <th className="px-2 py-1.5 font-black">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.email} className="border-t border-slate-200 dark:border-slate-800 align-top">
                        <td className="px-2 py-1.5">
                          <div className="font-bold text-slate-800 dark:text-slate-100">{row.name || '—'}</div>
                          <div className="font-mono text-[10px] text-slate-500">{row.email}</div>
                        </td>
                        <td className="px-2 py-1.5">
                          <div>{row.role === 'admin' ? '👑 admin' : '👩‍🏫 tutor'}</div>
                          <div className="text-[10px] text-slate-500">{row.tier}{row.status !== 'active' ? ` · ${row.status}` : ''}</div>
                        </td>
                        <td className="px-2 py-1.5">
                          {row.password ? (
                            <div className="flex items-center gap-1.5">
                              <span className={`font-mono ${revealed[row.email] ? 'text-slate-900 dark:text-white' : 'blur-[3px] select-none'} bg-slate-100 dark:bg-slate-800 rounded px-1.5 py-0.5`}>
                                {revealed[row.email] ? row.password : '••••••••'}
                              </span>
                              <button
                                onClick={() => setRevealed((r) => ({ ...r, [row.email]: !r[row.email] }))}
                                className="text-[10px] font-bold underline cursor-pointer"
                              >
                                {revealed[row.email] ? 'hide' : 'reveal'}
                              </button>
                              <button
                                onClick={() => copy(row.email, row.password as string)}
                                className="text-[10px] font-bold underline cursor-pointer"
                              >
                                {copied === row.email ? 'copied' : 'copy'}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold" title="This account's password was never seen in plain text, so only its one-way hash exists. Set a new password to make it viewable.">
                              not recoverable — only hashes exist
                            </span>
                          )}
                          {row.password && (
                            <div className="text-[9px] text-slate-500 mt-0.5">
                              captured {fmt(row.passwordCapturedAt)}{row.passwordCapturedBy ? ` by ${row.passwordCapturedBy}` : ''}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-[10px]">{row.hashHealth}</td>
                        <td className="px-2 py-1.5 text-[10px]">
                          {fmt(row.passwordUpdatedAt)}
                          {row.passwordUpdatedBy && <div className="text-slate-500">by {row.passwordUpdatedBy}</div>}
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => { setTestTarget(testTarget === row.email ? null : row.email); setTestValue(''); setTestResult(null); }}
                              className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[10px] font-bold cursor-pointer text-left"
                              title="Check whether a password really signs this account in"
                            >
                              🧪 Test login
                            </button>
                            <button
                              onClick={() => onRequestPasswordChange(row.email)}
                              className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold cursor-pointer text-left"
                              title="Set a new password (also stores it in the vault)"
                            >
                              🔑 New password
                            </button>
                            {row.password && (
                              <button
                                onClick={() => handleForget(row.email)}
                                className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[10px] font-bold cursor-pointer text-left"
                                title="Stop storing a readable copy (does not change the password)"
                              >
                                🙈 Forget copy
                              </button>
                            )}
                          </div>
                          {testTarget === row.email && (
                            <div className="mt-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 w-56">
                              <div className="text-[10px] font-bold mb-1">Password to test</div>
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  value={testValue}
                                  onChange={(e) => setTestValue(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') void handleTest(row.email); }}
                                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] font-mono"
                                  placeholder="type a password…"
                                />
                                <button
                                  onClick={() => handleTest(row.email)}
                                  disabled={isBusy || !testValue}
                                  className="px-2 py-1 rounded-lg bg-slate-800 text-white text-[10px] font-bold disabled:opacity-50 cursor-pointer"
                                >
                                  Check
                                </button>
                              </div>
                              {testResult && (
                                <div className={`mt-1 text-[10px] font-semibold ${testResult.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                                  {testResult.message}
                                </div>
                              )}
                              <button
                                onClick={() => { setTestValue(row.password || ''); setTestResult(null); }}
                                className="mt-1 text-[9px] underline cursor-pointer"
                              >
                                fill with the stored password
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredRows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-2 py-3 text-center text-[11px] text-slate-500">
                          No accounts match that search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="text-[10px] text-slate-500">
                “Test login” runs the host's real verification (bcrypt or the offline hash), so a ✅ here means that password
                would sign the account in right now. Resetting a password never signs the tutor out of a lesson in progress.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CredentialVaultPanel;
