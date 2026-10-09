// ============================================================
// SUPER ADMIN CONSOLE MODAL
// For info.tutomy@gmail.com to manage registered tutors, tiers, and status.
//
// Layout: a light, deliberately plain console (no colour-coding) arranged as
// tabs — Tutors · Sign-in health · Database · Cloud · Credentials · System.
// Each tab scrolls on its own, so nothing (least of all the Credential Vault
// and its Google-Authenticator setup) is ever clipped, regardless of screen
// height. The console forces the light theme while it is open and restores the
// app's own theme when it closes.
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { TutorAccount, UserTier, GRANT_DURATIONS, formatTierRemaining } from '../../utils/tiers';
import { tutorAuthService, ADMIN_EMAIL, ADMIN_DEFAULT_PASS } from '../../services/tutorAuthService';
import { formatBytes } from '../../utils/formatBytes';
import CredentialVaultPanel from './CredentialVaultPanel';

type TabKey = 'tutors' | 'signin' | 'database' | 'cloud' | 'credentials' | 'system';

const clusterKeyOf = (tier?: string): 'free' | 'pro' | 'vip' => {
  const key = String(tier || 'free').toLowerCase();
  return key === 'pro' || key === 'vip' ? key : 'free';
};
const TIER_CLUSTER_LABEL: Record<'free' | 'pro' | 'vip', string> = {
  free: 'Free users · 30 learner limit',
  pro: 'Pro tutors · 100 learner limit',
  vip: 'VIP elite · unlimited learners'
};

export const AdminConsoleModal: React.FC = () => {
  const {
    isAdminConsoleOpen,
    closeAdminConsole,
    tutor,
    token,
    setTierOverride
  } = useAuthStore();

  const [tab, setTab] = useState<TabKey>('tutors');

  const [tutorsList, setTutorsList] = useState<TutorAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isForceSaving, setIsForceSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // New tutor modal state
  const [showAddTutor, setShowAddTutor] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newTier, setNewTier] = useState<UserTier>('pro');
  const [newDuration, setNewDuration] = useState(60);

  // Auth-file structure state (detects older user records on the host)
  const [authSchema, setAuthSchema] = useState<{
    checking: boolean;
    needsUpdate?: boolean;
    accountsNeedingUpdate?: number;
    totalAccounts?: number;
    outdatedAccounts?: any[];
    missingFields?: string[];
    error?: string;
  }>({ checking: false });
  const [isMigratingSchema, setIsMigratingSchema] = useState(false);

  // MySQL connection test state
  const [mysqlTest, setMysqlTest] = useState<{
    success: boolean;
    mysqlConnected?: boolean;
    configFound?: boolean;
    configSource?: string;
    /** The credentials-file path that actually answered, if any. */
    configFile?: string | null;
    /** Every path checked — printed when nothing was found. */
    configTried?: string[];
    configHasNulls?: boolean;
    pdoAvailable?: boolean;
    /** PDO can be present while the mysql driver is not — distinct failures. */
    pdoMysqlDriver?: boolean;
    tableExists?: boolean;
    accountCount?: number;
    storageSource?: string;
    error?: string;
    /** MySQL error number, when the failure came from MySQL itself. */
    errorCode?: string | null;
    checkedAt?: string;
  } | null>(null);
  const [isTestingMySql, setIsTestingMySql] = useState(false);
  const [mysqlMigrate, setMysqlMigrate] = useState<{
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
  } | null>(null);
  const [isMigratingMySql, setIsMigratingMySql] = useState(false);

  // MySQL schema auto-update (auth.php?action=db_schema_sync)
  const [isSyncingSchema, setIsSyncingSchema] = useState(false);
  const [schemaResult, setSchemaResult] = useState<{
    success: boolean;
    tableCreated?: boolean;
    columnsAdded?: string[];
    notes?: string[];
    cloudTablesReady?: boolean;
    tables?: string[];
    columnCount?: number;
    schemaVersion?: number;
    unsupported?: boolean;
    error?: string;
  } | null>(null);

  // Sign-in repair (auth.php?action=login_repair)
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState<{
    success: boolean;
    repaired?: number;
    stillMissing?: number;
    needsResetAccounts?: Array<{ email: string; name?: string }>;
    saved?: boolean;
    totalAccounts?: number;
    unsupported?: boolean;
    error?: string;
  } | null>(null);

  /**
   * VIP cloud-storage report (auth.php?action=cloud_stats).
   */
  const [cloudStats, setCloudStats] = useState<{
    success: boolean;
    unsupported?: boolean;
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
    error?: string;
  } | null>(null);
  const [isLoadingCloudStats, setIsLoadingCloudStats] = useState(false);

  // Password reset state (per tutor)
  const [passwordTarget, setPasswordTarget] = useState<TutorAccount | null>(null);
  const [passwordDraft, setPasswordDraft] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordResult, setPasswordResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Pagination state for scalable >500 accounts
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Which build/runtime is ACTUALLY answering on the host? (?action=version)
  const [hostInfo, setHostInfo] = useState<Record<string, any> | null>(null);
  const [isCheckingHost, setIsCheckingHost] = useState(false);

  /**
   * The console is a light, plain surface on purpose — high contrast, no colour
   * coding. The app itself can be in dark mode, so the `dark` class is taken off
   * <html> while the console is open and put back exactly as it was on close.
   */
  useEffect(() => {
    if (!isAdminConsoleOpen) return;
    // The app puts `dark` on BOTH <html> and <body>, and the dark variant matches
    // `.dark *` — so both must be cleared, or the vault panel below would still
    // render dark and the console would look half-themed.
    const targets = [document.documentElement, document.body];
    const hadDark = targets.map(el => el.classList.contains('dark'));
    targets.forEach(el => el.classList.remove('dark'));
    return () => { targets.forEach((el, i) => { if (hadDark[i]) el.classList.add('dark'); }); };
  }, [isAdminConsoleOpen]);

  const checkHost = async () => {
    setIsCheckingHost(true);
    const info = await tutorAuthService.getHostVersion();
    setHostInfo(info);
    setIsCheckingHost(false);
  };

  const checkAuthSchema = async () => {
    setAuthSchema({ checking: true });
    try {
      const email = tutor?.email || ADMIN_EMAIL;
      const tok = token || '';
      const res = await tutorAuthService.getAuthSchemaStatus(email, tok, ADMIN_DEFAULT_PASS);
      if (res.success) {
        setAuthSchema({
          checking: false,
          needsUpdate: res.needsUpdate,
          accountsNeedingUpdate: res.accountsNeedingUpdate,
          totalAccounts: res.totalAccounts,
          outdatedAccounts: res.outdatedAccounts || [],
          missingFields: res.missingFields || []
        });
      } else {
        setAuthSchema({ checking: false, error: res.error || 'Auth-file version check unavailable.' });
      }
    } catch (e: any) {
      setAuthSchema({ checking: false, error: e.message });
    }
  };

  const testMySql = async () => {
    setIsTestingMySql(true);
    setMysqlTest(null);
    const res = await tutorAuthService.testDatabaseConnection();
    setMysqlTest(res);
    setIsTestingMySql(false);
    if (res.success && res.mysqlConnected) void loadCloudStats();
  };

  const loadCloudStats = async () => {
    setIsLoadingCloudStats(true);
    const res = await tutorAuthService.getCloudStats();
    setCloudStats(res);
    setIsLoadingCloudStats(false);
  };

  /** One-click: create/update every table + column the current build needs. */
  const handleSyncSchema = async () => {
    const ok = window.confirm(
      'Update the MySQL schema now?\n\n' +
      'This creates the `users` and cloud tables if they are missing, and ADDS any column the current ' +
      'build expects but the table does not have yet.\n\n' +
      'It is safe and idempotent: no account, row or existing column is ever changed or deleted.\n\nContinue?'
    );
    if (!ok) return;
    setIsSyncingSchema(true);
    setSchemaResult(null);
    const res = await tutorAuthService.syncDatabaseSchema();
    setSchemaResult(res);
    setIsSyncingSchema(false);
    if (res.success) {
      setStatusMessage(
        res.tableCreated
          ? '✅ MySQL schema created — the users table and cloud tables are ready.'
          : (res.columnsAdded && res.columnsAdded.length > 0
            ? `✅ MySQL schema updated — added: ${res.columnsAdded.join(', ')}.`
            : '✅ MySQL schema is already up to date.')
      );
      void testMySql();
    } else {
      setStatusMessage('⚠️ Schema update failed: ' + (res.error || 'check the host error log.'));
    }
  };

  /** One-click: restore missing password hashes so those accounts can sign in. */
  const handleRepairSignIn = async () => {
    const ok = window.confirm(
      'Repair sign-in for accounts that show “no usable password hash”?\n\n' +
      'For each affected account this copies the password hash back from whichever store still has it ' +
      '(the encrypted account file or MySQL). Accounts whose password is genuinely gone are reported so ' +
      'you can set a new one.\n\nNo existing password is changed or removed.\n\nContinue?'
    );
    if (!ok) return;
    setIsRepairing(true);
    setRepairResult(null);
    const res = await tutorAuthService.repairSignIn();
    setRepairResult(res);
    setIsRepairing(false);
    if (res.success) {
      if ((res.repaired ?? 0) > 0) {
        setStatusMessage(`✅ Repaired ${res.repaired} account(s) — they can sign in again.`);
        void checkHost();
      } else {
        setStatusMessage('No account had a recoverable hash to restore.');
      }
    } else {
      setStatusMessage('⚠️ Sign-in repair failed: ' + (res.error || 'check the host error log.'));
    }
  };

  const migrateMySql = async () => {
    const ok = window.confirm(
      'Import every account from the encrypted-file store into MySQL?\n\n' +
      'Accounts already in MySQL are UPDATED (profile, tier, status) — never duplicated. ' +
      'The encrypted-file store is kept as the offline fallback and stays untouched.\n\n' +
      'The master admin (info.tutomy@gmail.com) is included automatically.\n\nContinue?'
    );
    if (!ok) return;
    setIsMigratingMySql(true);
    setMysqlMigrate(null);
    const res = await tutorAuthService.migrateDatabase();
    setMysqlMigrate(res);
    setIsMigratingMySql(false);
    if (res.success) await testMySql();
  };

  const handleMigrateAuthSchema = async () => {
    const count = authSchema.accountsNeedingUpdate ?? 0;
    const ok = window.confirm(
      `Your hosted auth file stores ${count} account(s) in the older structure.\n\n` +
      `Clicking “Update” rewrites each account IN PLACE to the current structure — it ADDS the new fields ` +
      `(schema version, tier expiry, signature, learner limits) with safe defaults.` +
      `\n\nNo user, email, password, token or existing tier access is removed.\n\nContinue?`
    );
    if (!ok) return;
    setIsMigratingSchema(true);
    try {
      const email = tutor?.email || ADMIN_EMAIL;
      const tok = token || '';
      const res = await tutorAuthService.migrateAuthSchema(email, tok, ADMIN_DEFAULT_PASS);
      if (res.success) {
        setStatusMessage(`✅ ${res.message || 'Auth file migrated to the current structure.'}`);
        await checkAuthSchema();
        await fetchTutors();
      } else {
        setStatusMessage('⚠️ Migration failed: ' + (res.error || 'Check data/ folder permissions on the host.'));
        await checkAuthSchema();
      }
    } catch (e: any) {
      setStatusMessage('Migration error: ' + e.message);
    } finally {
      setIsMigratingSchema(false);
    }
  };

  const fetchTutors = async () => {
    setIsLoading(true);
    try {
      const email = tutor?.email || ADMIN_EMAIL;
      const tok = token || '';
      const list = await tutorAuthService.getTutors(email, tok, ADMIN_DEFAULT_PASS);
      setTutorsList(list);
    } catch (e: any) {
      setStatusMessage('Error loading tutors: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminConsoleOpen) {
      setTab('tutors');
      fetchTutors();
      checkAuthSchema();
      checkHost();
    }
  }, [isAdminConsoleOpen]);

  if (!isAdminConsoleOpen) return null;

  const handleForceSaveToFile = async () => {
    setIsForceSaving(true);
    try {
      const email = tutor?.email || ADMIN_EMAIL;
      const tok = token || '';
      const res = await tutorAuthService.forceSaveTutorsToDisk({
        adminEmail: email,
        adminToken: tok,
        adminPass: ADMIN_DEFAULT_PASS,
        tutors: tutorsList
      });
      setStatusMessage(res.success ? `💾 Force Save Complete: ${res.message}` : `⚠️ Force Save Warning: ${res.message || 'Check storage permissions'}`);
    } catch (e: any) {
      setStatusMessage('Force Save error: ' + e.message);
    } finally {
      setIsForceSaving(false);
    }
  };

  const handleApproveTutor = async (targetEmail: string) => {
    try {
      const email = tutor?.email || ADMIN_EMAIL;
      const tok = token || '';
      await tutorAuthService.adminVerifyTutor(email, tok, targetEmail);
      const updatedList = tutorsList.map(t => (t.email === targetEmail ? { ...t, emailVerified: true, status: 'active' as const } : t));
      setTutorsList(updatedList);
      await tutorAuthService.forceSaveTutorsToDisk({
        adminEmail: email,
        adminToken: tok,
        adminPass: ADMIN_DEFAULT_PASS,
        tutors: updatedList
      });
      setStatusMessage(`Manually verified & saved Gmail for ${targetEmail}`);
    } catch (e: any) {
      setStatusMessage('Verification error: ' + e.message);
    }
  };

  const handleUpdateTier = async (targetEmail: string, newT: UserTier, durationDays?: number) => {
    try {
      const email = tutor?.email || ADMIN_EMAIL;
      const tok = token || '';
      const dur = durationDays ?? (newT === 'vip' ? 120 : newT === 'pro' ? 60 : 0);
      const nextExpiry = newT === 'free' ? undefined : new Date(Date.now() + dur * 86400000).toISOString();

      const updatedList = tutorsList.map(t => (t.email === targetEmail ? { ...t, tier: newT, tierExpiresAt: nextExpiry } : t));
      setTutorsList(updatedList);

      const res = await tutorAuthService.updateTutorTier({
        adminEmail: email,
        adminToken: tok,
        adminPass: ADMIN_DEFAULT_PASS,
        targetEmail,
        tier: newT,
        durationDays: newT === 'free' ? undefined : dur
      });

      const saveRes = await tutorAuthService.forceSaveTutorsToDisk({
        adminEmail: email,
        adminToken: tok,
        adminPass: ADMIN_DEFAULT_PASS,
        tutors: updatedList
      });

      if (res.success) {
        setStatusMessage(
          saveRes.success
            ? `✅ Updated ${targetEmail} to ${newT.toUpperCase()} & saved to the server file.`
            : `✅ ${targetEmail} is ${newT.toUpperCase()} on the server, but the full-database save reported: ${saveRes.message}`
        );
        if (tutor?.email === targetEmail) setTierOverride(newT);
      } else {
        setStatusMessage('Update Note: ' + (res.error || res.message));
        await fetchTutors();
      }
    } catch (e: any) {
      setStatusMessage('Failed to update tier: ' + e.message);
    }
  };

  const handleToggleStatus = async (targetEmail: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const email = tutor?.email || ADMIN_EMAIL;
      const tok = token || '';
      const updatedList = tutorsList.map(t => (t.email === targetEmail ? { ...t, status: nextStatus as any } : t));
      setTutorsList(updatedList);

      const res = await tutorAuthService.updateTutorTier({
        adminEmail: email,
        adminToken: tok,
        adminPass: ADMIN_DEFAULT_PASS,
        targetEmail,
        status: nextStatus
      });

      await tutorAuthService.forceSaveTutorsToDisk({
        adminEmail: email,
        adminToken: tok,
        adminPass: ADMIN_DEFAULT_PASS,
        tutors: updatedList
      });

      if (res.success) setStatusMessage(`Tutor ${targetEmail} is now ${nextStatus} and saved.`);
    } catch (e: any) {
      setStatusMessage('Status update failed: ' + e.message);
    }
  };

  const openPasswordModal = (target: TutorAccount) => {
    setPasswordTarget(target);
    setPasswordDraft('');
    setPasswordConfirm('');
    setShowPasswordText(false);
    setPasswordResult(null);
  };

  const closePasswordModal = () => {
    setPasswordTarget(null);
    setPasswordDraft('');
    setPasswordConfirm('');
    setShowPasswordText(false);
    setPasswordResult(null);
  };

  const generatePassword = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const symbols = '!@#$%&*?';
    let generated = '';
    const bytes = new Uint32Array(12);
    try {
      crypto.getRandomValues(bytes);
    } catch {
      for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 4294967295);
    }
    for (let i = 0; i < 10; i += 1) generated += alphabet[bytes[i] % alphabet.length];
    generated += symbols[bytes[10] % symbols.length];
    generated += String(bytes[11] % 10);
    generated += alphabet[bytes[3] % alphabet.length];
    setPasswordDraft(generated);
    setPasswordConfirm(generated);
    setShowPasswordText(true);
    setPasswordResult(null);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTarget) return;
    if (passwordDraft.length < 6) {
      setPasswordResult({ ok: false, message: 'Use at least 6 characters.' });
      return;
    }
    if (passwordDraft !== passwordConfirm) {
      setPasswordResult({ ok: false, message: 'The two password fields must match.' });
      return;
    }
    setIsSavingPassword(true);
    setPasswordResult(null);
    try {
      const email = tutor?.email || ADMIN_EMAIL;
      const tok = token || '';
      const res = await tutorAuthService.adminSetPassword({
        adminEmail: email,
        adminToken: tok,
        adminPass: ADMIN_DEFAULT_PASS,
        targetEmail: passwordTarget.email,
        newPassword: passwordDraft
      });
      if (res.success) {
        setStatusMessage(`🔑 ${res.message}`);
        setPasswordResult({ ok: true, message: res.message || 'Password updated.' });
      } else {
        setPasswordResult({ ok: false, message: res.error || 'The password could not be changed.' });
      }
    } catch (err: any) {
      setPasswordResult({ ok: false, message: err?.message || 'The password could not be changed.' });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleDeleteTutor = async (targetEmail: string) => {
    if (targetEmail === ADMIN_EMAIL) {
      alert('Cannot delete the master admin account.');
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently remove tutor ${targetEmail}?`)) return;
    try {
      const email = tutor?.email || ADMIN_EMAIL;
      const tok = token || '';
      const ok = await tutorAuthService.deleteTutor(email, tok, targetEmail);
      if (ok) {
        const remaining = tutorsList.filter(t => t.email !== targetEmail);
        setTutorsList(remaining);
        await tutorAuthService.forceSaveTutorsToDisk({
          adminEmail: email,
          adminToken: tok,
          adminPass: ADMIN_DEFAULT_PASS,
          tutors: remaining
        });
        setStatusMessage(`Deleted tutor ${targetEmail} and updated the database.`);
      }
    } catch (e: any) {
      setStatusMessage('Delete failed: ' + e.message);
    }
  };

  const handleCreateTutor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newPassword) {
      alert('Email and password are required.');
      return;
    }
    try {
      const res = await tutorAuthService.register({
        email: newEmail.trim(),
        password: newPassword,
        name: newName.trim() || newEmail.split('@')[0]
      });
      if (res.success) {
        if (newTier !== 'free') {
          await tutorAuthService.updateTutorTier({
            adminEmail: tutor?.email || ADMIN_EMAIL,
            adminToken: token || '',
            adminPass: ADMIN_DEFAULT_PASS,
            targetEmail: newEmail.trim(),
            tier: newTier,
            durationDays: newDuration
          });
        }
        setStatusMessage(`Successfully provisioned tutor ${newEmail}`);
        setShowAddTutor(false);
        setNewEmail('');
        setNewPassword('');
        setNewName('');
        fetchTutors();
      } else {
        alert(res.error || 'Failed to create tutor.');
      }
    } catch (e: any) {
      alert('Error creating tutor: ' + e.message);
    }
  };

  const handleExportDB = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tutorsList, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `tutomy_tutors_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportDBClick = () => fileInputRef.current?.click();

  const handleImportDBFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);
        const listToImport: TutorAccount[] = Array.isArray(parsed)
          ? parsed
          : (parsed.tutors && Array.isArray(parsed.tutors))
            ? parsed.tutors
            : null;
        if (!listToImport || listToImport.length === 0) {
          alert('Invalid DB file: expected a JSON array of tutor accounts.');
          return;
        }
        let importedCount = 0;
        const existingMap = new Map<string, TutorAccount>();
        tutorsList.forEach(t => existingMap.set(t.email.toLowerCase(), t));
        listToImport.forEach(item => {
          if (item && item.email && typeof item.email === 'string') {
            const cleanEmail = item.email.trim().toLowerCase();
            const existing = existingMap.get(cleanEmail);
            existingMap.set(cleanEmail, {
              ...(existing || {}),
              ...item,
              email: item.email.trim(),
              tier: item.tier || existing?.tier || 'free',
              status: item.status || existing?.status || 'active',
              role: item.role || existing?.role || 'tutor'
            });
            importedCount++;
          }
        });
        const mergedList = Array.from(existingMap.values());
        setTutorsList(mergedList);
        localStorage.setItem('tutomy_tutors_db_v1', JSON.stringify(mergedList));
        setStatusMessage(`Successfully imported and merged ${importedCount} tutor accounts!`);
      } catch (err: any) {
        alert('Failed to parse database file: ' + err.message);
      } finally {
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const filteredTutors = tutorsList
    .filter(t => {
      const matchesSearch =
        (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTier = selectedTierFilter === 'all' || clusterKeyOf(t.tier) === selectedTierFilter;
      return matchesSearch && matchesTier;
    })
    .sort((a, b) => {
      const rank = { free: 0, pro: 1, vip: 2 } as Record<string, number>;
      const rankA = rank[clusterKeyOf(a.tier)] ?? 0;
      const rankB = rank[clusterKeyOf(b.tier)] ?? 0;
      if (rankA !== rankB) return rankA - rankB;
      return String(a.name || a.email).localeCompare(String(b.name || b.email));
    });

  const totalPages = Math.max(1, Math.ceil(filteredTutors.length / pageSize));
  const paginatedTutors = filteredTutors.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = {
    total: tutorsList.length,
    free: tutorsList.filter(t => (t.tier || 'free') === 'free').length,
    pro: tutorsList.filter(t => t.tier === 'pro').length,
    vip: tutorsList.filter(t => t.tier === 'vip').length,
    active: tutorsList.filter(t => t.status === 'active').length,
    suspended: tutorsList.filter(t => t.status === 'suspended').length
  };

  const accountsWithoutPassword = Number(hostInfo?.accountsWithoutPassword || 0);
  const signInProblem = accountsWithoutPassword > 0 || !!authSchema.needsUpdate;
  const dbProblem = !!mysqlTest && !mysqlTest.mysqlConnected;

  const tabs: Array<{ key: TabKey; label: string; badge?: string }> = [
    { key: 'tutors', label: `Tutors (${stats.total})` },
    { key: 'signin', label: 'Sign-in health', badge: accountsWithoutPassword > 0 ? `⚠ ${accountsWithoutPassword}` : (authSchema.needsUpdate ? '⚠' : undefined) },
    { key: 'database', label: 'Database', badge: dbProblem ? '⚠' : (mysqlTest?.mysqlConnected ? 'ok' : undefined) },
    { key: 'cloud', label: 'Cloud', badge: cloudStats?.success ? formatBytes(cloudStats.storedBytes ?? 0) : undefined },
    { key: 'credentials', label: 'Credentials', badge: '🔐' },
    { key: 'system', label: 'System' }
  ];

  const panel = 'rounded-xl border border-slate-200 bg-white p-3';
  const subPanel = 'rounded-lg border border-slate-200 bg-slate-50 p-3';
  const btn = 'px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-[11px] cursor-pointer transition disabled:opacity-50';
  const btnPrimary = 'px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer transition disabled:opacity-50';
  const th = 'px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wide text-[10px]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 bg-black/60 animate-fade-in overflow-y-auto">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-[1400px] shadow-2xl relative my-2 text-slate-900 flex flex-col h-[94vh] max-h-[94vh] max-sm:h-auto max-sm:max-h-none">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 p-3 sm:p-4 border-b border-slate-200 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Super Admin Console</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-300 text-slate-600 uppercase">
                Master authority
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              Signed in as <strong className="text-slate-700">{ADMIN_EMAIL}</strong> · manage tutors, tiers, passwords and the database.
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            <input type="file" ref={fileInputRef} onChange={handleImportDBFile} accept=".json,application/json" className="hidden" />
            <button type="button" onClick={handleForceSaveToFile} disabled={isForceSaving} className={btn} title="Write all tutor settings & tiers to the server file now">
              {isForceSaving ? '⏳ Saving…' : '💾 Force save'}
            </button>
            <button type="button" onClick={handleImportDBClick} className={btn} title="Import a JSON database backup">📤 Import DB</button>
            <button type="button" onClick={handleExportDB} className={btn} title="Download a JSON backup of the roster">📥 Export DB</button>
            <button type="button" onClick={() => setShowAddTutor(true)} className={btnPrimary}>➕ Add tutor</button>
            <button type="button" onClick={closeAdminConsole} className="w-8 h-8 shrink-0 rounded-full border border-slate-300 hover:bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer" title="Close">✕</button>
          </div>
        </div>

        {/* Status toast */}
        {statusMessage && (
          <div className="mx-3 sm:mx-4 mt-2 px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 flex items-start justify-between gap-2">
            <span className="min-w-0 break-words">{statusMessage}</span>
            <button onClick={() => setStatusMessage(null)} className="text-slate-500 hover:text-slate-800 shrink-0">✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-1 px-3 sm:px-4 border-b border-slate-200 shrink-0">
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-3 py-2.5 text-xs font-bold border-b-2 -mb-px transition cursor-pointer ${
                tab === t.key ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
              {t.badge && <span className="ml-1.5 text-[10px] font-bold text-slate-500">{t.badge}</span>}
            </button>
          ))}
          <button
            type="button"
            onClick={() => { fetchTutors(); checkAuthSchema(); checkHost(); }}
            className="ml-auto my-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-[11px] font-bold cursor-pointer"
            title="Reload the roster, auth-file check and host report"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Scrollable tab body — this is what stops anything being clipped */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3">

          {/* ── TUTORS ─────────────────────────────────────────────── */}
          {tab === 'tutors' && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
                {[
                  ['Total', stats.total],
                  ['Free', stats.free],
                  ['Pro', stats.pro],
                  ['VIP', stats.vip],
                  ['Active', stats.active],
                  ['Suspended', stats.suspended]
                ].map(([label, value]) => (
                  <div key={label as string} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="text-[10px] font-bold text-slate-500 uppercase truncate">{label}</span>
                    <span className="text-base font-black text-slate-900 tabular-nums">{value as number}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  placeholder="Search by name or email…"
                  className="w-full sm:w-80 px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                <select
                  value={selectedTierFilter}
                  onChange={(e) => { setSelectedTierFilter(e.target.value); setCurrentPage(1); }}
                  className="px-2 py-2 border border-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                >
                  <option value="all">All tiers ({stats.total})</option>
                  <option value="free">Free ({stats.free})</option>
                  <option value="pro">Pro ({stats.pro})</option>
                  <option value="vip">VIP ({stats.vip})</option>
                </select>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full min-w-[1040px] text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className={th}>Tutor</th>
                      <th className={th}>Email</th>
                      <th className={th}>Tier</th>
                      <th className={th}>Gmail</th>
                      <th className={th}>Status</th>
                      <th className={th}>Registered</th>
                      <th className={`${th} text-right`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      <tr><td colSpan={7} className="p-8 text-center text-slate-400">Loading the roster…</td></tr>
                    ) : filteredTutors.length === 0 ? (
                      <tr><td colSpan={7} className="p-8 text-center text-slate-400">No tutors match your criteria.</td></tr>
                    ) : (
                      paginatedTutors.map((t, rowIndex) => {
                        const cluster = clusterKeyOf(t.tier);
                        const previousCluster = rowIndex > 0 ? clusterKeyOf(paginatedTutors[rowIndex - 1].tier) : null;
                        const showClusterHeading = cluster !== previousCluster;
                        const clusterCount = filteredTutors.filter(x => clusterKeyOf(x.tier) === cluster).length;
                        const verified = t.emailVerified || t.email === ADMIN_EMAIL;
                        return (
                          <React.Fragment key={t.email}>
                            {showClusterHeading && (
                              <tr className="bg-slate-50 border-t border-slate-200">
                                <td colSpan={7} className="px-3 py-1.5">
                                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">{TIER_CLUSTER_LABEL[cluster]}</span>
                                  <span className="ml-2 text-[10px] font-bold text-slate-500">({clusterCount})</span>
                                </td>
                              </tr>
                            )}
                            <tr className="hover:bg-slate-50 transition align-top">
                              <td className="p-3">
                                <div className="font-bold text-slate-900 flex items-center gap-1">
                                  {t.name || 'Unnamed tutor'}
                                  {t.email === ADMIN_EMAIL && <span className="text-[10px] text-slate-500 font-bold">👑 Master admin</span>}
                                </div>
                                <span className="text-[10px] text-slate-400">{t.country || t.timezone || 'Global'}</span>
                              </td>
                              <td className="p-3 font-mono text-[11px] text-slate-600">{t.email}</td>
                              <td className="p-3">
                                <select
                                  value={t.tier || 'free'}
                                  onChange={(e) => handleUpdateTier(t.email, e.target.value as UserTier)}
                                  className="p-1 border border-slate-300 rounded-lg text-[11px] font-bold cursor-pointer bg-white"
                                >
                                  <option value="free">Free (30 learners)</option>
                                  <option value="pro">Pro (100 learners)</option>
                                  <option value="vip">VIP (unlimited)</option>
                                </select>
                                {t.tier && t.tier !== 'free' && t.email !== ADMIN_EMAIL && (
                                  <div className="mt-1 flex items-center gap-1.5">
                                    <select
                                      value={(() => { const e = t.tierExpiresAt ? new Date(t.tierExpiresAt).getTime() - Date.now() : 0; return Math.max(30, Math.round(e / 86400000)); })()}
                                      onChange={(e) => handleUpdateTier(t.email, t.tier as UserTier, parseInt(e.target.value, 10))}
                                      className="p-0.5 border border-slate-300 rounded text-[10px] font-bold cursor-pointer bg-white"
                                      title="Grant duration in days"
                                    >
                                      {GRANT_DURATIONS.map(d => <option key={d} value={d}>{d}d</option>)}
                                    </select>
                                    {t.tierExpiresAt && (
                                      <span className="text-[9px] font-bold text-slate-500">
                                        {new Date(t.tierExpiresAt).getTime() > Date.now()
                                          ? `${formatTierRemaining(t.tierExpiresAt)} left`
                                          : `expired ${new Date(t.tierExpiresAt).toLocaleDateString()}`}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="p-3">
                                {verified ? (
                                  <span className="text-[11px] font-semibold text-slate-700">Verified</span>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-semibold text-slate-500">Pending</span>
                                    <button type="button" onClick={() => handleApproveTutor(t.email)} className={btn} title="Manually verify & activate this tutor">Approve</button>
                                  </div>
                                )}
                              </td>
                              <td className="p-3">
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(t.email, t.status || 'active')}
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                                    t.status === 'suspended' ? 'border-slate-400 text-slate-600' : 'border-slate-300 text-slate-800'
                                  }`}
                                  title="Toggle active / suspended"
                                >
                                  {t.status === 'suspended' ? 'Suspended' : 'Active'}
                                </button>
                              </td>
                              <td className="p-3 text-[11px] text-slate-400">
                                {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {t.email === ADMIN_EMAIL ? (
                                    <span className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500 border border-slate-300" title="Fixed by ADMIN_DEFAULT_PASS on the host">
                                      🔒 Host password
                                    </span>
                                  ) : (
                                    <button type="button" onClick={() => openPasswordModal(t)} className={btn} title={`Change the password for ${t.email}`}>
                                      🔑 Password
                                    </button>
                                  )}
                                  {t.email !== ADMIN_EMAIL && (
                                    <button type="button" onClick={() => handleDeleteTutor(t.email)} className="p-1.5 text-slate-400 hover:text-slate-800 transition cursor-pointer" title="Delete tutor account">🗑️</button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-2">
                  <span>Showing {filteredTutors.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filteredTutors.length)} of {filteredTutors.length}</span>
                  <span className="text-slate-300">|</span>
                  <span>Per page</span>
                  <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className="px-2 py-1 border border-slate-300 rounded-lg font-bold bg-white">
                    {[15, 25, 50, 100, 250].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className={`${btn} disabled:cursor-not-allowed`}>◀ Previous</button>
                  <span className="px-2 font-mono text-xs font-black">Page {currentPage} of {totalPages}</span>
                  <button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className={`${btn} disabled:cursor-not-allowed`}>Next ▶</button>
                </div>
              </div>
            </>
          )}

          {/* ── SIGN-IN HEALTH ─────────────────────────────────────── */}
          {tab === 'signin' && (
            <>
              <div className={panel}>
                <h3 className="text-sm font-black text-slate-900">Accounts that cannot sign in</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  An account with <strong>no usable password hash</strong> can never pass a password check. This usually happens when the
                  host could not read its encrypted account file and fell back to a hash-free copy — the hashes still exist in the other
                  store, and “Repair sign-in” copies them back.
                </p>

                <div className={`mt-3 ${subPanel}`}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-xs font-bold text-slate-800">
                      {isCheckingHost ? 'Checking the host…' : accountsWithoutPassword > 0
                        ? `⚠️ ${accountsWithoutPassword} account(s) have no usable password hash`
                        : '✅ Every account has a usable password hash'}
                    </div>
                    <button
                      type="button"
                      onClick={handleRepairSignIn}
                      disabled={isRepairing}
                      className={`${btnPrimary} ${accountsWithoutPassword === 0 ? 'opacity-60' : ''}`}
                      title="Copy missing password hashes back from the other store"
                    >
                      {isRepairing ? '⏳ Repairing…' : '🔧 Repair sign-in'}
                    </button>
                  </div>

                  {repairResult && (
                    <div className="mt-2 text-[11px] font-semibold text-slate-700">
                      {repairResult.success ? (
                        <>
                          <div>Repaired: <b>{repairResult.repaired ?? 0}</b> · still needing a new password: <b>{repairResult.stillMissing ?? 0}</b>{repairResult.saved === false ? ' · ⚠️ the stores could not be written (check data/ permissions)' : ''}</div>
                          {!!repairResult.needsResetAccounts?.length && (
                            <div className="mt-2">
                              <div className="font-bold">These accounts need a NEW password (set it in the Tutors tab → 🔑 Password):</div>
                              <div className="mt-1 space-y-0.5 max-h-40 overflow-y-auto">
                                {repairResult.needsResetAccounts.map(a => (
                                  <div key={a.email} className="font-mono text-[10px]">{a.name ? `${a.name} — ` : ''}{a.email}</div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <span>⚠️ {repairResult.error || 'The repair could not be run.'}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className={panel}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Account file structure</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Detects accounts stored in an older shape and upgrades them in place. Existing users, emails, passwords and access are never removed.
                    </p>
                  </div>
                  <button type="button" onClick={checkAuthSchema} disabled={authSchema.checking} className={btn}>↻ Re-check</button>
                </div>

                {authSchema.checking ? (
                  <div className="mt-3 text-xs text-slate-500">Checking…</div>
                ) : authSchema.needsUpdate ? (
                  <div className={`mt-3 ${subPanel}`}>
                    <div className="text-xs font-bold text-slate-800">
                      ⚠️ {authSchema.accountsNeedingUpdate ?? 0} of {authSchema.totalAccounts ?? 0} account(s) use an older structure
                    </div>
                    {!!(authSchema.missingFields || []).length && (
                      <p className="text-[11px] text-slate-600 mt-1">
                        Missing fields: {(authSchema.missingFields || []).map(f => <code key={f} className="font-mono bg-white border border-slate-200 px-1 rounded mx-0.5">{f}</code>)}
                      </p>
                    )}
                    <button type="button" onClick={handleMigrateAuthSchema} disabled={isMigratingSchema} className={`${btnPrimary} mt-2`}>
                      {isMigratingSchema ? '⏳ Updating…' : '🔄 Update account file'}
                    </button>
                  </div>
                ) : authSchema.error ? (
                  <div className="mt-3 text-[11px] text-slate-500">{authSchema.error} — the console still works; this check is an optional safeguard.</div>
                ) : (
                  <div className="mt-3 text-xs font-semibold text-slate-700">✅ All accounts use the current structure.</div>
                )}
              </div>
            </>
          )}

          {/* ── DATABASE ───────────────────────────────────────────── */}
          {tab === 'database' && (
            <>
              <div className={panel}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">MySQL connection</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Verifies that the host can reach its MySQL database and the <code className="font-mono bg-slate-100 px-1 rounded">users</code> table.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={testMySql} disabled={isTestingMySql} className={btnPrimary}>
                      {isTestingMySql ? '⏳ Testing…' : '🧪 Test connection'}
                    </button>
                    <button type="button" onClick={migrateMySql} disabled={isMigratingMySql} className={btn}>
                      {isMigratingMySql ? '⏳ Migrating…' : '🔄 Migrate file accounts → MySQL'}
                    </button>
                  </div>
                </div>

                {/*
                 * The report is only drawn when the host ACTUALLY answered. It used
                 * to render unconditionally, so a rejected request (the host replies
                 * `Admin authorization required.` with no diagnostic fields) showed a
                 * full, confident table of `NOT FOUND / MISSING / missing / 0 /
                 * unknown` — every line of it an `undefined` default. A host that is
                 * perfectly healthy looked broken, and the one true sentence was the
                 * error at the bottom.
                 */}
                {mysqlTest && !mysqlTest.success && (
                  <div className={`mt-3 ${subPanel}`}>
                    <div className="text-xs font-bold text-slate-800">⚠️ The host did not answer the MySQL check — no readings are shown</div>
                    <p className="mt-1 text-[11px] text-slate-700">{mysqlTest.error || 'The request to auth.php failed.'}</p>
                    {/authoriz/i.test(mysqlTest.error || '') && (
                      <p className="mt-1 text-[11px] text-slate-600">
                        Your saved sign-in token no longer matches the account store on the host. Sign out and back in as the master admin,
                        then use <b>Sign-in health → 🔧 Repair sign-in</b> — that copies the missing records back and fixes the token check.
                      </p>
                    )}
                  </div>
                )}

                {mysqlTest && mysqlTest.success && (
                  <div className={`mt-3 ${subPanel}`}>
                    <div className="text-xs font-bold text-slate-800">
                      {mysqlTest.mysqlConnected ? '✅ MySQL connected' : '❌ MySQL is not connected'}
                      {mysqlTest.checkedAt && <span className="font-normal text-slate-400"> · checked {new Date(mysqlTest.checkedAt).toLocaleString()}</span>}
                    </div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-700">
                      <div>
                        Credentials file:{' '}
                        <b>{mysqlTest.configFound ? (mysqlTest.configSource || 'found') : 'NOT FOUND'}</b>
                      </div>
                      <div>
                        PDO: <b>{mysqlTest.pdoAvailable ? 'available' : 'MISSING'}</b>
                        {mysqlTest.pdoAvailable && <> · mysql driver: <b>{mysqlTest.pdoMysqlDriver ? 'loaded' : 'MISSING'}</b></>}
                      </div>
                      <div>users table: <b>{mysqlTest.tableExists ? 'exists' : 'missing'}</b></div>
                      <div>Accounts in DB: <b>{mysqlTest.accountCount ?? 0}</b></div>
                      <div className="sm:col-span-2">Storage in use: <b>{mysqlTest.storageSource || 'unknown'}</b></div>
                    </div>

                    {mysqlTest.configFile && (
                      <div className="mt-2 text-[11px] text-slate-600">Read from: <span className="font-mono break-all">{mysqlTest.configFile}</span></div>
                    )}

                    {/* Why "NOT FOUND" is only useful with the list of places we looked. */}
                    {!mysqlTest.configFound && !!(mysqlTest.configTried || []).length && (
                      <details className="mt-2 text-[11px] text-slate-600">
                        <summary className="cursor-pointer font-bold">{mysqlTest.configTried!.length} path(s) checked — show</summary>
                        <div className="mt-1 space-y-0.5">
                          {mysqlTest.configTried!.map(p => (
                            <div key={p} className="font-mono text-[10px] break-all">{p}</div>
                          ))}
                        </div>
                      </details>
                    )}

                    {mysqlTest.error && (
                      <div className="mt-2 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-800">
                        {mysqlTest.errorCode && <span className="mr-1 font-mono text-[10px] text-slate-500">MySQL {mysqlTest.errorCode}:</span>}
                        {mysqlTest.error}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className={panel}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Database schema</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Creates the <code className="font-mono bg-slate-100 px-1 rounded">users</code> and cloud tables when missing and adds any column the
                      current build expects. Idempotent and non-destructive — no row or existing column is ever changed.
                    </p>
                  </div>
                  <button type="button" onClick={handleSyncSchema} disabled={isSyncingSchema} className={btnPrimary}>
                    {isSyncingSchema ? '⏳ Updating schema…' : '🛠 Update database schema'}
                  </button>
                </div>

                {schemaResult && (
                  <div className={`mt-3 ${subPanel}`}>
                    {schemaResult.success ? (
                      <div className="text-[11px] text-slate-700 space-y-1">
                        <div className="text-xs font-bold text-slate-800">✅ Schema is up to date</div>
                        <div>users table: <b>{schemaResult.tableCreated ? 'created just now' : 'already existed'}</b> · <b>{schemaResult.columnCount ?? 0}</b> columns</div>
                        <div>Cloud tables: <b>{schemaResult.cloudTablesReady ? 'ready' : 'not created (check PDO privileges)'}</b></div>
                        {!!schemaResult.tables?.length && <div>Tables present: <span className="font-mono">{schemaResult.tables.join(', ')}</span></div>}
                        {!!schemaResult.columnsAdded?.length
                          ? <div>Columns added: <span className="font-mono">{schemaResult.columnsAdded.join(', ')}</span></div>
                          : <div>No columns were missing.</div>}
                        {!!schemaResult.notes?.length && (
                          <div className="pt-1">
                            {schemaResult.notes.map((n, i) => <div key={i} className="text-[10px] text-slate-500">• {n}</div>)}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400">Auth schema version: {schemaResult.schemaVersion ?? '?'}</div>
                      </div>
                    ) : (
                      <div className="text-[11px] font-semibold text-slate-700">⚠️ {schemaResult.error || 'The schema update could not be run.'}</div>
                    )}
                  </div>
                )}
              </div>

              {mysqlMigrate && (
                <div className={panel}>
                  <div className="text-xs font-bold text-slate-800">
                    {mysqlMigrate.success
                      ? `${mysqlMigrate.failed ? '⚠️' : '✅'} ${mysqlMigrate.migrated ?? 0}/${mysqlMigrate.total ?? 0} account(s) imported into MySQL`
                      : '❌ Migration failed'}
                    {mysqlMigrate.migratedAt && <span className="font-normal text-slate-400"> · {new Date(mysqlMigrate.migratedAt).toLocaleString()}</span>}
                  </div>
                  {mysqlMigrate.success ? (
                    <div className="mt-1 text-[11px] text-slate-600">
                      {mysqlMigrate.adminIncluded && <div>👑 Master admin included</div>}
                      {mysqlMigrate.failed
                        ? <div className="font-bold">{mysqlMigrate.failed} account(s) failed — see the rows below.</div>
                        : <div>The encrypted-file store stays as the offline fallback.</div>}
                    </div>
                  ) : (
                    <div className="mt-1 text-[11px] font-semibold text-slate-700">{mysqlMigrate.error}</div>
                  )}
                  {!!mysqlMigrate.results?.length && (
                    <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                      {mysqlMigrate.results.map(r => (
                        <div key={r.email} className="flex items-center gap-2 px-2.5 py-1.5 text-[11px]">
                          <span>{r.result === 'imported' ? '✅' : '❌'}</span>
                          <span className="font-bold truncate max-w-[160px]">{r.name || r.email}</span>
                          <span className="font-mono text-[10px] text-slate-500 truncate">{r.email}</span>
                          <span className="ml-auto text-[10px] font-bold uppercase text-slate-500">{r.tier}</span>
                          {r.error && <span title={r.error} className="cursor-help">⚠️</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── CLOUD ──────────────────────────────────────────────── */}
          {tab === 'cloud' && (
            <div className={panel}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-sm font-black text-slate-900">VIP cloud storage</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Live row counts, per-tutor sizes and the real table footprint. No backup payload is ever opened.
                  </p>
                </div>
                <button type="button" onClick={loadCloudStats} disabled={isLoadingCloudStats} className={btnPrimary}>
                  {isLoadingCloudStats ? '⏳ Reading…' : '↻ Refresh report'}
                </button>
              </div>

              {!cloudStats && !isLoadingCloudStats && (
                <p className="mt-2 text-[11px] text-slate-500">Press “Refresh report” to read the host's cloud tables.</p>
              )}

              {cloudStats && !cloudStats.success && (
                <div className="mt-2 text-[11px] font-semibold text-slate-700">⚠️ {cloudStats.error || 'The report is unavailable.'}</div>
              )}

              {cloudStats?.success && (
                <>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      ['Tutors backed up', String(cloudStats.tutorsWithBackup ?? 0)],
                      ['Stored (gzip)', formatBytes(cloudStats.storedBytes ?? 0)],
                      ['Raw', formatBytes(cloudStats.rawBytes ?? 0)],
                      ['Index rows', String(cloudStats.indexRows ?? 0)]
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                        <div className="text-[10px] font-bold uppercase text-slate-500 truncate">{label}</div>
                        <div className="text-base font-black text-slate-900 tabular-nums">{value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 space-y-1.5 text-[11px]">
                    {!!cloudStats.overQuota?.length && (
                      <div className={subPanel}>🚫 <b>{cloudStats.overQuota.length}</b> tutor(s) over the {formatBytes(cloudStats.quotaBytes ?? 0)} cap: {cloudStats.overQuota.slice(0, 5).map(o => o.email).join(', ')}{cloudStats.overQuota.length > 5 ? ` +${cloudStats.overQuota.length - 5} more` : ''}</div>
                    )}
                    {!!cloudStats.nearQuota?.length && (
                      <div className={subPanel}>⚠️ <b>{cloudStats.nearQuota.length}</b> tutor(s) above 80% of the cap: {cloudStats.nearQuota.slice(0, 5).map(o => o.email).join(', ')}{cloudStats.nearQuota.length > 5 ? ` +${cloudStats.nearQuota.length - 5} more` : ''}</div>
                    )}
                    {!!cloudStats.orphaned?.length && (
                      <div className={subPanel}>🧹 <b>{cloudStats.orphaned.length}</b> backup(s) belong to deleted accounts: {cloudStats.orphaned.slice(0, 5).map(o => o.email).join(', ')}{cloudStats.orphaned.length > 5 ? ` +${cloudStats.orphaned.length - 5} more` : ''}</div>
                    )}
                    {!cloudStats.overQuota?.length && !cloudStats.nearQuota?.length && !cloudStats.orphaned?.length && (
                      <div className={subPanel}>✅ Every backup is inside the {formatBytes(cloudStats.quotaBytes ?? 0)} per-backup cap, and no orphaned rows were found.</div>
                    )}
                  </div>

                  {!!cloudStats.tables?.length && (
                    <div className="mt-3">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">On-disk footprint</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {cloudStats.tables.map(t => (
                          <span key={t.name} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px]">{t.name} · {formatBytes(t.bytes)} · ~{t.rows} rows</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {!!cloudStats.sections?.length && (
                    <div className="mt-3">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Section sizes across all backups</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {cloudStats.sections.map(s => (
                          <span key={s.section} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px]">{s.section} · <b>{formatBytes(s.bytes)}</b> · {s.items} item(s) · {s.tutors} tutor(s)</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {!!cloudStats.tutors?.length && (
                    <div className="mt-3">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Per tutor (largest first)</div>
                      <div className="mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                        {cloudStats.tutors.map(t => (
                          <div key={t.email} className="flex items-center gap-2 px-2.5 py-1.5 text-[11px]">
                            <span className="min-w-0 flex-1 truncate"><b>{t.name || t.email}</b> <span className="text-slate-500">· {t.email}</span></span>
                            <span className="shrink-0 text-[10px] font-bold uppercase text-slate-500">{t.tier ?? 'no account'}</span>
                            <span className="shrink-0 font-mono tabular-nums">{formatBytes(t.bytes)}</span>
                            <span className="shrink-0 w-12 text-right tabular-nums text-slate-500">{t.percent ?? 0}%</span>
                            <span className="hidden sm:inline shrink-0 w-36 text-right text-slate-500 truncate">{t.updatedAt ? new Date(t.updatedAt).toLocaleString() : '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!cloudStats.tutors?.length && <p className="mt-3 text-[11px] text-slate-500">No VIP tutor has saved to the cloud yet.</p>}

                  <p className="mt-3 text-[11px] text-slate-500">
                    Each backup is one gzip-compressed row, refused above {formatBytes(cloudStats.quotaBytes ?? 0)}. Images are stripped in the browser before upload.
                  </p>
                </>
              )}
            </div>
          )}

          {/* ── CREDENTIALS ────────────────────────────────────────── */}
          {tab === 'credentials' && <CredentialVaultPanel
            adminEmail={ADMIN_EMAIL}
            adminToken={token || ''}
            adminPass={ADMIN_DEFAULT_PASS}
            onRequestPasswordChange={(email) => {
              const target = tutorsList.find(t => (t.email || '').toLowerCase().trim() === email.toLowerCase().trim());
              openPasswordModal(target || ({ email, name: email.split('@')[0] } as TutorAccount));
            }}
          />}

          {/* ── SYSTEM ─────────────────────────────────────────────── */}
          {tab === 'system' && (
            <>
              <div className={panel}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Host report</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Proves which build and runtime are actually answering on the host.</p>
                  </div>
                  <button type="button" onClick={checkHost} disabled={isCheckingHost} className={btn}>↻ Re-check</button>
                </div>

                <div className="mt-3 text-[11px] text-slate-700 space-y-1">
                  {isCheckingHost && <div className="text-slate-500">Checking…</div>}
                  {!isCheckingHost && !hostInfo && <div className="font-semibold">No answer from auth.php — check that the new auth.php really is on the host.</div>}
                  {!isCheckingHost && hostInfo && (
                    <>
                      <div>Runtime: <b>{String(hostInfo.runtime || '?').toUpperCase()}</b> · PHP {hostInfo.phpVersion || '?'}</div>
                      <div>auth.php uploaded: <b>{(hostInfo.authFileMtime || hostInfo.serverFileMtime || 'unknown').replace('T', ' ').slice(0, 19)}</b></div>
                      <div>Accounts: <b>{hostInfo.accounts ?? '?'}</b> · auth structure v{hostInfo.authSchemaVersion ?? '?'} · vault v{hostInfo.vaultSchemaVersion ?? '?'}</div>
                      <div>MySQL in use: <b>{hostInfo.mysqlInUse ? 'yes' : 'no'}</b> · credential vault: <b>{hostInfo.vaultConfigured ? 'set up' : 'not set up yet'}</b></div>
                      <div className="text-slate-500">Compare the upload time with your deploy — if it is old, the new build never reached the host.</div>
                    </>
                  )}
                </div>
              </div>

              {(accountsWithoutPassword > 0 || hostInfo?.storeWarning) && (
                <div className={panel}>
                  <h3 className="text-sm font-black text-slate-900">Warnings</h3>
                  <div className="mt-2 space-y-1.5 text-[11px]">
                    {accountsWithoutPassword > 0 && (
                      <div className={subPanel}>⚠️ {accountsWithoutPassword} account(s) have no usable password hash — they cannot sign in. Fix them in the <b>Sign-in health</b> tab.</div>
                    )}
                    {hostInfo?.storeWarning && <div className={subPanel}>⚠️ {String(hostInfo.storeWarning)}</div>}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Provision tutor modal */}
        {showAddTutor && (
          <div className="absolute inset-0 bg-black/50 z-30 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-300 p-5 rounded-2xl max-w-md w-full shadow-2xl text-slate-900">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-lg">Add new tutor</h3>
                <button onClick={() => setShowAddTutor(false)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>
              <form onSubmit={handleCreateTutor} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold mb-1">Full name</label>
                  <input type="text" required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Professor John" className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-bold mb-1">Email</label>
                  <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="john@example.com" className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-bold mb-1">Initial password</label>
                  <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-bold mb-1">Tier</label>
                  <select value={newTier} onChange={(e) => setNewTier(e.target.value as UserTier)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold">
                    <option value="free">Free starter (30 learners)</option>
                    <option value="pro">Pro tutor (100 learners)</option>
                    <option value="vip">VIP elite (unlimited)</option>
                  </select>
                </div>
                {newTier !== 'free' && (
                  <div>
                    <label className="block font-bold mb-1">Access duration</label>
                    <select value={newDuration} onChange={(e) => setNewDuration(parseInt(e.target.value, 10))} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold">
                      {GRANT_DURATIONS.map(d => <option key={d} value={d}>{d} days</option>)}
                    </select>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowAddTutor(false)} className={btn}>Cancel</button>
                  <button type="submit" className={btnPrimary}>Create & save</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Change / reset one tutor's password */}
        {passwordTarget && (
          <div className="absolute inset-0 bg-black/50 z-30 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white border border-slate-300 p-5 rounded-2xl max-w-md w-full shadow-2xl text-slate-900 my-4">
              <div className="flex justify-between items-start mb-3 gap-2">
                <div className="min-w-0">
                  <h3 className="font-black text-lg">🔑 Change password</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">{passwordTarget.name || 'Tutor'} · <span className="font-mono">{passwordTarget.email}</span></p>
                </div>
                <button onClick={closePasswordModal} className="text-slate-400 hover:text-slate-700 shrink-0" title="Close">✕</button>
              </div>

              <div className="mb-3 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-700">
                The tutor signs in with this password right away — online and offline. Any lesson they have open stays signed in.
              </div>

              <form onSubmit={handlePasswordReset} className="space-y-3 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold">New password</label>
                    {passwordDraft.length > 0 && (
                      <span className="text-[10px] font-black uppercase text-slate-500">
                        {passwordDraft.length >= 12 ? 'strong' : passwordDraft.length >= 8 ? 'good' : 'short'}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPasswordText ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={passwordDraft}
                      onChange={(e) => { setPasswordDraft(e.target.value); setPasswordResult(null); }}
                      placeholder="At least 6 characters"
                      autoFocus
                      className="w-full p-2.5 pr-20 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                    />
                    <button type="button" onClick={() => setShowPasswordText(v => !v)} className="absolute right-2 top-2 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-slate-200">
                      {showPasswordText ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1">Repeat new password</label>
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={passwordConfirm}
                    onChange={(e) => { setPasswordConfirm(e.target.value); setPasswordResult(null); }}
                    placeholder="Type it again"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <button type="button" onClick={generatePassword} className={btn}>🎲 Generate strong password</button>
                  <span className="text-[10px] text-slate-400 font-semibold">Copy it before closing to share with the tutor.</span>
                </div>

                {passwordResult && (
                  <div className={`rounded-lg border px-3 py-2 text-[11px] font-semibold ${passwordResult.ok ? 'border-slate-300 bg-slate-50 text-slate-700' : 'border-slate-400 bg-slate-100 text-slate-800'}`}>
                    {passwordResult.ok ? '✅ ' : '⚠️ '}{passwordResult.message}
                  </div>
                )}

                {!passwordResult && passwordConfirm.length > 0 && passwordDraft !== passwordConfirm && (
                  <div className="rounded-lg border border-slate-400 bg-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-800">
                    ⚠️ The two passwords do not match yet.
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={closePasswordModal} className={btn}>{passwordResult?.ok ? 'Done' : 'Cancel'}</button>
                  <button type="submit" disabled={isSavingPassword || passwordDraft.length < 6 || passwordDraft !== passwordConfirm} className={btnPrimary}>
                    {isSavingPassword ? '⏳ Updating…' : '🔑 Update password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminConsoleModal;
