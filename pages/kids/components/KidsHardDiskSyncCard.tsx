/* ════════════════════════════════════════════════════════════════════════════
   🏰 KIDS LEARNING KINGDOM — Back-up Suite
   Young-learner adaptation of the Adult Dashboard > General Settings > Back-up
   Suite panel. Same engine (utils/diskStorage.ts: saveAllToDisk / loadAllFromDisk,
   plus the portable file export/import and VIP cloud), kid-friendly skin, and the
   "Save New Information to Local Disk" toggle that keeps Zero-Memory mode on.
   ════════════════════════════════════════════════════════════════════════════ */

import React, { useCallback, useEffect, useState } from 'react';
import {
  HardDrive, FolderOpen, Link2Off, KeyRound, RefreshCw,
  DownloadCloud, UploadCloud, ShieldCheck, Sparkles, Bug,
} from 'lucide-react';
import {
  isFileSystemAccessSupported,
  getStoredDirectoryHandle,
  storeDirectoryHandle,
  clearStoredDirectoryHandle,
  verifyDirectoryPermission,
  isDiskModeEnabled,
  setDiskModeEnabled,
  saveAllToDisk,
  getLastSyncSummary,
  loadAllFromDisk,
  getLastRestoreSummary,
  restoreFromSafetyCopy,
  clearKidsStorage,
  downloadFullBackupFile,
  importFullBackupFile,
} from '../../../utils/diskStorage';
import {
  saveToCloud,
  loadFromCloud,
  getCloudBackupInfo,
  isVipTier,
  type CloudBackupInfo,
} from '../../../services/cloudBackup';

const KIDS_STORAGE_KEY = 'kids_learning_kingdom_v2';
const COMBAT_KEY = 'combat_arena_storybook_v1';

type Busy = 'idle' | 'exporting' | 'importing' | 'flushing';

interface Props {
  /** Called after a successful restore so the dashboard can re-render its data. */
  onRestored?: () => void;
}

export const KidsHardDiskSyncCard: React.FC<Props> = ({ onRestored }) => {
  const supported = isFileSystemAccessSupported();

  const [directoryHandle, setDirectoryHandle] = useState<any>(null);
  const [directoryName, setDirectoryName] = useState('');
  const [hasPermission, setHasPermission] = useState(false);
  const [diskModeActive, setDiskModeActive] = useState(false);
  const [busy, setBusy] = useState<Busy>('idle');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const isVip = isVipTier();
  const [cloudInfo, setCloudInfo] = useState<CloudBackupInfo | null>(null);
  const [cloudBusy, setCloudBusy] = useState<'idle' | 'saving' | 'loading'>('idle');
  const [cloudMsg, setCloudMsg] = useState<string | null>(null);
  const [fileBusy, setFileBusy] = useState<'idle' | 'export' | 'import'>('idle');

  const refreshCloudInfo = useCallback(async () => {
    if (!isVipTier()) { setCloudInfo(null); return; }
    setCloudInfo(await getCloudBackupInfo());
  }, []);

  const handleCloudSave = async () => {
    setCloudBusy('saving');
    setCloudMsg('Uploading the kingdom to the cloud…');
    const res = await saveToCloud();
    setCloudBusy('idle');
    setCloudMsg(res.success
      ? `✅ Kingdom saved to the cloud — revision ${res.revision} (${((res.bytes || 0) / 1024).toFixed(1)} KB).`
      : `❌ ${res.error || 'Cloud save failed.'}`);
    if (res.success) void refreshCloudInfo();
  };

  const handleCloudRestore = async () => {
    if (!confirm('Download the cloud backup and replace the kingdom in this browser?')) return;
    setCloudBusy('loading');
    setCloudMsg('Downloading from the cloud…');
    const res = await loadFromCloud({ replace: true });
    setCloudBusy('idle');
    if (res.success) {
      setCloudMsg('✅ Kingdom restored from the cloud! Reloading…');
      setTimeout(() => { if (onRestored) onRestored(); else window.location.reload(); }, 700);
    } else {
      setCloudMsg(`❌ ${res.error || 'Cloud restore failed.'}`);
    }
  };

  const handleExportBackupFile = async () => {
    setFileBusy('export');
    try {
      const res = await downloadFullBackupFile();
      alert(res.ok
        ? `💾 Back-up file saved (${((res.bytes || 0) / 1024 / 1024).toFixed(1)} MB). It holds the whole kingdom — heroes, homework, badges, the shop and the Combat Arena.`
        : `Could not create the backup file: ${res.error || 'unknown error'}`);
    } finally { setFileBusy('idle'); }
  };

  const handleImportBackupFile = async (file: File) => {
    if (!confirm('Import this back-up file?\nAll heroes, homework, badges, the shop and Combat Arena history in the file are restored. Nothing in this browser is deleted.\n\nContinue?')) return;
    setFileBusy('import');
    try {
      const res = await importFullBackupFile(file);
      if (res.ok) {
        alert(`📥 Import complete — ${res.learners ?? 0} adult learner(s) and the whole kingdom restored. Reloading…`);
        if (onRestored) onRestored(); else window.location.reload();
      } else {
        alert(`Import failed: ${res.error || 'the file could not be read.'}`);
      }
    } finally { setFileBusy('idle'); }
  };

  const handleRestoreSafety = async () => {
    const ok = await restoreFromSafetyCopy({ replaceLearners: true });
    if (ok) {
      alert('✅ Restored from this browser\'s safety copy — reloading the kingdom.');
      if (onRestored) onRestored(); else window.location.reload();
    } else {
      alert('There is no safety copy in this browser yet. It is written automatically after every successful backup.');
    }
  };

  const refreshHandle = useCallback(async () => {
    const handle = await getStoredDirectoryHandle();
    if (handle) {
      setDirectoryHandle(handle);
      setDirectoryName(handle.name || 'Local Folder');
      setHasPermission(await verifyDirectoryPermission(handle, false));
    } else {
      setDirectoryHandle(null);
      setDirectoryName('');
      setHasPermission(false);
    }
  }, []);

  useEffect(() => {
    setDiskModeActive(isDiskModeEnabled());
    refreshHandle();
    void refreshCloudInfo();
  }, [refreshHandle, refreshCloudInfo]);

  const handleConnectFolder = async () => {
    try {
      if (!supported) {
        alert('This browser cannot open a local folder. Please use Chrome, Edge or Opera on a desktop computer.');
        return;
      }
      const handle = await (window as any).showDirectoryPicker();
      await storeDirectoryHandle(handle);
      setDirectoryHandle(handle);
      setDirectoryName(handle.name);
      setHasPermission(await verifyDirectoryPermission(handle, true));
      alert(`Royal vault connected: "${handle.name}"\nYour kingdom can now be backed up to this folder!`);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('Kids folder selection failed:', err);
      alert(`Could not open that folder: ${err?.message || String(err)}`);
    }
  };

  const handleAuthorize = async () => {
    if (!directoryHandle) return;
    const ok = await verifyDirectoryPermission(directoryHandle, true);
    setHasPermission(ok);
    alert(ok ? 'Folder permission granted! 🔓' : 'Permission was not granted.');
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect this folder? Your kingdom stays safe in the browser, but it will stop syncing to the hard drive.')) return;
    await clearStoredDirectoryHandle();
    setDirectoryHandle(null);
    setDirectoryName('');
    setHasPermission(false);
    setDiskModeActive(false);
    setDiskModeEnabled(false);
  };

  /** The "Save New Information to Local Disk" switch. */
  const handleToggleDiskMode = async (checked: boolean) => {
    if (checked && !directoryHandle) {
      alert('Connect a local folder first, then you can save new information to your hard disk.');
      return;
    }
    setDiskModeActive(checked);
    setDiskModeEnabled(checked);

    if (checked) {
      // Write everything we already have straight away so the vault is never stale.
      const ok = await runExport(true, true);
      if (!ok) {
        setDiskModeActive(false);
        setDiskModeEnabled(false);
      }
    }
  };

  /**
   * Backs the whole kingdom up. Pass `full` for the explicit “Backup now” button
   * (rewrites every folder); the default incremental mode only writes what changed,
   * which keeps automatic syncs fast.
   */
  const runExport = async (silent = false, full = false): Promise<boolean> => {
    try {
      const handle = await getStoredDirectoryHandle();
      if (!handle) {
        if (!silent) alert('Connect a local folder first.');
        return false;
      }
      const ok = await verifyDirectoryPermission(handle, true);
      if (!ok) {
        if (!silent) alert('Write permission was denied. Click "Authorize Folder Access" first.');
        return false;
      }

      setBusy('exporting');
      setProgress(0);
      setProgressLabel('Starting backup…');

      const success = await saveAllToDisk(handle, (done, total, label) => {
        setProgress(Math.round((done / Math.max(1, total)) * 100));
        setProgressLabel(label);
      }, { full });

      setBusy('idle');
      setProgress(0);
      setProgressLabel('');
      if (!silent) {
        const summary = getLastSyncSummary();
        const detail = summary
          ? ` ${summary.learnersUpdated} hero folder${summary.learnersUpdated === 1 ? '' : 's'} updated${summary.learnersUpToDate ? ` · ${summary.learnersUpToDate} already up to date` : ''}.`
          : '';
        alert(success
          ? `💾 Kingdom backed up! Every hero, homework, badge, the shop and the Combat Arena history are now on your hard drive.${detail}`
          : 'Backup did not finish. Please check the folder permission and try again.');
      }
      return success;
    } catch (err: any) {
      console.error('Kids export failed:', err);
      setBusy('idle');
      setProgress(0);
      if (!silent) alert(`Backup failed: ${err?.message || String(err)}`);
      return false;
    }
  };

  const handleRestore = async () => {
    try {
      const handle = await getStoredDirectoryHandle();
      if (!handle) {
        alert('Connect a local folder first.');
        return;
      }
      const ok = await verifyDirectoryPermission(handle, false);
      if (!ok) {
        alert('Read permission was denied. Click "Authorize Folder Access" first.');
        return;
      }
      if (!confirm('Restore the kingdom from your hard drive folder?\nAll heroes found in the folder will be loaded back into the dashboard.')) return;

      setBusy('importing');
      setProgress(30);
      setProgressLabel('Reading the royal vault…');

      const success = await loadAllFromDisk(handle, { replaceLearners: true });

      setProgress(100);
      setProgressLabel('Done!');
      setBusy('idle');

      if (success) {
        const summary = getLastRestoreSummary();
        alert(`📤 Kingdom restored from your hard drive! Reloading the dashboard…`);
        if (onRestored) onRestored();
        else window.location.reload();
      } else {
        alert('Restore did not complete. Please check the folder and try again — or use “Restore Safety Copy”.');
      }
      setProgress(0);
      setProgressLabel('');
    } catch (err: any) {
      console.error('Kids restore failed:', err);
      setBusy('idle');
      setProgress(0);
      alert(`Restore failed: ${err?.message || String(err)}`);
    }
  };

  /**
   * Removes ONLY the young-learner data so adult dashboard data is untouched.
   * The keys are cleared in IndexedDB too (that is the real store; the localStorage
   * mirrors alone are not enough), and never without a backup or a safety copy.
   */
  const handleFlushKidsMemory = async () => {
    let folderVerified = false;
    try {
      if (directoryHandle && hasPermission) {
        folderVerified = true;
      }
    } catch { /* treat as unverified */ }
    if (!folderVerified && !cloudInfo?.exists) {
      alert('Nothing was emptied. Back the kingdom up first — to your folder ("Backup Kingdom to Folder") or, on VIP, to the cloud. Your browser data was left untouched.');
      return;
    }
    if (!confirm('⚠️ This empties the browser memory for the KIDS kingdom (heroes, shop, teacher, combat history).\n\nA safety copy is kept, and you can restore from the folder or the cloud at any time.\n\nContinue?')) return;
    if (!confirm('🔥 Final check: really empty the kids browser memory now?')) return;

    try {
      setBusy('flushing');
      await clearKidsStorage();
      try {
        // Belt and braces: index.tsx / older bundles may still hold the legacy key.
        localStorage.removeItem(KIDS_STORAGE_KEY);
        localStorage.removeItem(COMBAT_KEY);
      } catch { /* IDB is enough */ }
      setBusy('idle');
      alert('🧹 Kids browser memory emptied. Use "Restore Kingdom from Folder" (or “Restore Safety Copy”) to bring the heroes back.');
      if (onRestored) onRestored();
    } catch (err: any) {
      setBusy('idle');
      alert(`Could not clear the kids memory: ${err?.message || String(err)}`);
    }
  };

  const statusBadge = directoryHandle
    ? (hasPermission
        ? <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">● Connected</span>
        : <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">● Needs Permission</span>)
    : <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-200 text-slate-600">○ Disconnected</span>;

  const working = busy !== 'idle';

  return (
    <div className="bg-gradient-to-br from-sky-50 to-indigo-50 p-4 rounded-2xl border border-sky-200 lg:col-span-2">
      <h3 className="font-extrabold text-indigo-950 text-sm mb-2 flex items-center gap-2">
        <HardDrive className="w-4 h-4 text-sky-500" /> 💾 Back-up Suite
      </h3>
      <p className="text-[11px] text-gray-600 font-semibold mb-3 leading-relaxed">
        Keep the whole kingdom on your own hard drive. Everything the heroes do — profiles, homework,
        sessions, quests, badges, the shop and the Combat Arena storybook — is saved into a folder on your
        computer, and can be restored at any time.
      </p>

      {!supported ? (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[11px] font-bold">
          ⚠️ This browser cannot use local folders. Please open the dashboard in Chrome, Edge or Opera on a desktop.
        </div>
      ) : (
        <div className="space-y-3">
          {/* Folder connection */}
          <div className="p-3 bg-white/80 border border-sky-100 rounded-xl space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-2 bg-sky-100 text-sky-600 rounded-xl shrink-0">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black text-indigo-950">Royal Vault Folder</p>
                  <p className="text-[10px] text-gray-500 font-mono truncate">
                    {directoryHandle ? directoryName : 'No folder connected yet'}
                  </p>
                </div>
              </div>
              {statusBadge}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {!directoryHandle ? (
                <button
                  type="button"
                  onClick={handleConnectFolder}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-black text-[11px] cursor-pointer flex items-center gap-1.5"
                >
                  <FolderOpen className="w-3.5 h-3.5" /> Connect Local Folder
                </button>
              ) : (
                <>
                  {!hasPermission && (
                    <button
                      type="button"
                      onClick={handleAuthorize}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-black text-[11px] cursor-pointer flex items-center gap-1.5"
                    >
                      <KeyRound className="w-3.5 h-3.5" /> Authorize Folder Access
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleConnectFolder}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-black text-[11px] cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Change Folder
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-black text-[11px] cursor-pointer flex items-center gap-1.5"
                  >
                    <Link2Off className="w-3.5 h-3.5" /> Disconnect
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Save new information toggle */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h4 className="font-black text-indigo-950 text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  Save New Information to Local Disk
                </h4>
                <p className="text-[10px] text-gray-600 font-semibold leading-relaxed">
                  When this switch is on, every new hero, homework item, quest, badge, store purchase and
                  Combat Arena result is written straight to your hard drive folder — no browser storage
                  limits, nothing ever lost.
                </p>
              </div>
              <label className="flex items-center h-6 shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={diskModeActive}
                  onChange={(e) => handleToggleDiskMode(e.target.checked)}
                  disabled={working}
                  className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-600 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Backup / Restore */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => runExport(false, true)}
              disabled={working || !directoryHandle}
              className="py-2.5 bg-gradient-to-r from-emerald-500 to-green-700 hover:from-emerald-600 hover:to-green-800 text-white font-black rounded-xl flex items-center justify-center gap-2 cursor-pointer text-[11px] shadow disabled:opacity-50"
            >
              <DownloadCloud className="w-4 h-4" />
              {busy === 'exporting' ? `Backing up… ${progress}%` : 'Backup Kingdom to Folder'}
            </button>
            <button
              type="button"
              onClick={handleRestore}
              disabled={working || !directoryHandle}
              className="py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-black rounded-xl flex items-center justify-center gap-2 cursor-pointer text-[11px] shadow disabled:opacity-50"
            >
              <UploadCloud className="w-4 h-4" />
              {busy === 'importing' ? 'Restoring…' : 'Restore Kingdom from Folder'}
            </button>
          </div>

          {/* Portable file — works with no folder connected, and understands older backups */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleExportBackupFile}
              disabled={working || fileBusy !== 'idle'}
              className="py-2 bg-violet-600 hover:bg-violet-700 text-white font-black rounded-xl flex items-center justify-center gap-2 cursor-pointer text-[11px] shadow disabled:opacity-50"
            >
              <DownloadCloud className="w-4 h-4" />
              {fileBusy === 'export' ? 'Preparing…' : 'Export Everything to File'}
            </button>
            <label className={`py-2 bg-slate-700 hover:bg-slate-800 text-white font-black rounded-xl flex items-center justify-center gap-2 cursor-pointer text-[11px] shadow text-center ${(working || fileBusy !== 'idle') ? 'opacity-50 pointer-events-none' : ''}`}>
              <UploadCloud className="w-4 h-4" />
              {fileBusy === 'import' ? 'Importing…' : 'Import From File'}
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void handleImportBackupFile(f); }}
              />
            </label>
          </div>

          {working && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-black text-gray-600">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  {progressLabel || 'Working…'}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(5, progress)}%` }}
                />
              </div>
            </div>
          )}

          {/* Safety copy — the browser's own never-purged fallback */}
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h4 className="font-black text-emerald-900 text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Safety Copy
                </h4>
                <p className="text-[10px] text-emerald-900/80 font-semibold leading-relaxed">
                  This browser keeps its own copy that is never cleared by a memory flush or a purge. Use it when the folder is
                  missing, unplugged, or stops asking for permission — the kingdom comes straight back.
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleRestoreSafety}
                disabled={working}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black text-[11px] cursor-pointer disabled:opacity-50"
              >
                ↻ Restore Safety Copy
              </button>
            </div>
          </div>

          {/* VIP cloud saving */}
          {isVip && (
            <div className="p-3 bg-sky-50/80 border border-sky-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-black text-sky-900 text-[11px] flex items-center gap-1.5">
                  <DownloadCloud className="w-3.5 h-3.5 text-sky-600" /> ☁️ Cloud Backup (VIP)
                </h4>
                <span className="text-[10px] font-black text-sky-800/80">
                  {cloudInfo?.exists
                    ? `${(cloudInfo.bytes / 1024).toFixed(1)} KB · rev ${cloudInfo.revision}`
                    : 'no copy yet'}
                </span>
              </div>
              <p className="text-[10px] text-sky-900/80 font-semibold leading-relaxed">
                Saved on the server database, so the kingdom survives a wiped browser or a lost folder. Follows the same choice
                you made in General settings.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCloudSave}
                  disabled={cloudBusy !== 'idle'}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-black text-[11px] cursor-pointer disabled:opacity-50"
                >
                  {cloudBusy === 'saving' ? 'Saving…' : '☁️ Save to Cloud'}
                </button>
                <button
                  type="button"
                  onClick={handleCloudRestore}
                  disabled={cloudBusy !== 'idle'}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black text-[11px] cursor-pointer disabled:opacity-50"
                >
                  {cloudBusy === 'loading' ? 'Restoring…' : '⬇️ Restore from Cloud'}
                </button>
                <button
                  type="button"
                  onClick={refreshCloudInfo}
                  disabled={cloudBusy !== 'idle'}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-black text-[11px] cursor-pointer disabled:opacity-50"
                >
                  ↻ Refresh
                </button>
              </div>
              {cloudMsg && <p className="text-[10px] font-bold text-sky-900 break-words">{cloudMsg}</p>}
            </div>
          )}

          {/* Kids-only memory purge */}
          <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl">
            <div className="flex items-start gap-2">
              <Bug className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-black text-red-800 text-[11px]">Empty Kids Browser Memory</h4>
                <p className="text-[10px] text-red-700 font-semibold leading-relaxed">
                  Clears the young learners' browser memory only (your Adult Dashboard data is not touched).
                  Use it after backing up, then restore from the folder whenever you need the kingdom back.
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleFlushKidsMemory}
                disabled={working}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-black text-[11px] cursor-pointer disabled:opacity-50"
              >
                Empty Kids Memory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KidsHardDiskSyncCard;
