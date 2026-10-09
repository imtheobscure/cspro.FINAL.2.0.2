import React, { useCallback, useEffect, useRef, useState, FC } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useLearnerStore } from '../../store/useLearnerStore';
import { useAuthStore } from '../../store/useAuthStore';
import {
    saveToCloud,
    getBackupTarget,
    hasChosenBackupTarget,
    isVipTier,
    getCloudBackupInfo,
    type CloudBackupInfo,
} from '../../services/cloudBackup';
import { formatBytes } from '../../utils/formatBytes';

type Phase = 'idle' | 'saving' | 'done' | 'error';

const loadDiskModule = () => import('../../utils/diskStorage');

/** Absolute timestamps from the server read as "saved 3 min ago". */
const savedAgoFrom = (iso: string): string => {
    const at = new Date(iso).getTime();
    if (!Number.isFinite(at)) return '';
    const secs = Math.max(0, Math.round((Date.now() - at) / 1000));
    if (secs < 45) return 'saved just now';
    const mins = Math.round(secs / 60);
    if (mins < 60) return `saved ${mins} min ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `saved ${hrs} h ago`;
    return `saved ${Math.round(hrs / 24)} d ago`;
};

/**
 * Every learner / group / tutor-profile edit that is worth backing up.
 * Comparing this snapshot keeps unrelated store churn (timers, voices, AI modals)
 * from popping the reminder over and over.
 */
const relevantSnapshot = (): string => {
    const ls = useLearnerStore.getState();
    const as = useAppStore.getState();
    // `backupTarget` is a preference, not unsaved work: switching between Hard Disk
    // and Cloud from this card must not flag the card as having pending edits.
    const { backupTarget: _preference, ...tutorInfo } = (as.tutorInfo || {}) as any;
    return JSON.stringify([ls.learners, ls.groupClasses, tutorInfo, as.appName, as.appAddress]);
};

/**
 * Floating "unsaved changes" card that lives in the bottom-right corner.
 *
 *  - Appears whenever dashboard data changes (new learner, edited profile, tutor info…)
 *  - Stays on screen while the tutor keeps editing
 *  - "Save to Hard Disk" writes everything with a live progress bar
 *  - If no backup folder is connected yet it asks for one, then saves immediately
 */
const SaveToDiskPrompt: FC = () => {
    const [visible, setVisible] = useState(false);
    const [phase, setPhase] = useState<Phase>('idle');
    const [progress, setProgress] = useState(0);
    const [stepLabel, setStepLabel] = useState('');
    const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
    const [folderName, setFolderName] = useState('');
    const [diskConnected, setDiskConnected] = useState(false);
    const [apiSupported, setApiSupported] = useState(true);
    const [error, setError] = useState('');
    const [pendingEdits, setPendingEdits] = useState(0);
    const [summary, setSummary] = useState<{ updated: number; upToDate: number } | null>(null);
    // Where this tutor chose to save. VIP tutors are asked once; the answer lives
    // on tutorInfo so the Kids dashboard and every widget follow the same choice.
    const [target, setTarget] = useState<'disk' | 'cloud'>(getBackupTarget());
    const [needsChoice, setNeedsChoice] = useState(false);
    // Cloud status for the card footer: usage, revision and when it was last saved.
    const [cloudInfo, setCloudInfo] = useState<CloudBackupInfo | null>(null);
    const [cloudInfoLoading, setCloudInfoLoading] = useState(false);
    const cloudFetchedAtRef = useRef(0);
    const cloudInfoRef = useRef<CloudBackupInfo | null>(null);

    const changeTickRef = useRef(0);
    const savedTickRef = useRef(0);
    const savingRef = useRef(false);
    const hideTimerRef = useRef<any>(null);
    const dirtyTimerRef = useRef<any>(null);
    const mountedRef = useRef(true);

    /* ── watch for real edits ─────────────────────────────────────────── */
    useEffect(() => {
        mountedRef.current = true;
        let last = relevantSnapshot();

        const markDirty = () => {
            changeTickRef.current += 1;
            if (dirtyTimerRef.current) clearTimeout(dirtyTimerRef.current);
            // small debounce so fast typing doesn't blink the card
            dirtyTimerRef.current = setTimeout(() => {
                if (!mountedRef.current) return;
                setPendingEdits(Math.max(1, changeTickRef.current - savedTickRef.current));
                setVisible(true);
                setPhase((p) => (p === 'saving' || p === 'done' ? p : 'idle'));
            }, 650);
        };

        const onStoreChange = () => {
            const snap = relevantSnapshot();
            if (snap === last) return;
            last = snap;
            markDirty();
        };

        const unsubLearner = useLearnerStore.subscribe(onStoreChange);
        const unsubApp = useAppStore.subscribe(onStoreChange);

        return () => {
            mountedRef.current = false;
            unsubLearner();
            unsubApp();
            if (dirtyTimerRef.current) clearTimeout(dirtyTimerRef.current);
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        };
    }, []);

    // Tier is read through the store so the ask-once prompt and the cloud status
    // still work when the card mounts before the auth session has been restored.
    const authTier = useAuthStore(state => state.tier);
    const authRole = useAuthStore(state => state.tutor?.role);

    /* ── ask a VIP tutor once where to save (Hard Disk or Cloud) ──────── */
    useEffect(() => {
        setTarget(getBackupTarget());
        setNeedsChoice(isVipTier() && !hasChosenBackupTarget());
    }, [authTier, authRole]);

    /**
     * Cloud status (usage / revision / last saved). Small request — the server
     * reads only the tiny index rows, never the payload — and throttled so the
     * card appearing on every edit burst does not become a polling loop.
     */
    const refreshCloudInfo = useCallback(async (force = false) => {
        if (!isVipTier()) { setCloudInfo(null); cloudInfoRef.current = null; return; }
        const now = Date.now();
        if (!force && cloudInfoRef.current && now - cloudFetchedAtRef.current < 60_000) return;
        setCloudInfoLoading(true);
        try {
            const info = await getCloudBackupInfo();
            cloudFetchedAtRef.current = Date.now();
            cloudInfoRef.current = info;
            setCloudInfo(info);
        } finally {
            setCloudInfoLoading(false);
        }
    }, []);

    useEffect(() => { void refreshCloudInfo(true); }, [refreshCloudInfo, authTier, authRole]);

    // Re-read the cloud status each time the card comes back into view.
    useEffect(() => { if (visible) void refreshCloudInfo(); }, [visible, refreshCloudInfo]);

    const handleChooseTarget = useCallback((next: 'disk' | 'cloud') => {
        if (next === 'cloud' && !isVipTier()) {
            alert('Cloud saving is a VIP feature.\n\nYour data keeps saving to your hard disk folder — nothing is lost. Upgrade to VIP to also keep a copy on the server.');
            return;
        }
        useAppStore.getState().setTutorInfo({ backupTarget: next } as any);
        setTarget(next);
        setNeedsChoice(false);
        if (next === 'cloud') void refreshCloudInfo(true);
    }, [refreshCloudInfo]);

    /* ── reflect an already-connected backup folder ───────────────────── */
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const dm = await loadDiskModule();
                if (!cancelled) setApiSupported(dm.isFileSystemAccessSupported());
                if (!dm.isDiskModeEnabled()) return;
                const handle = await dm.getStoredDirectoryHandle();
                if (!handle || cancelled) return;
                const perm = await handle.queryPermission?.({ mode: 'readwrite' });
                if (cancelled) return;
                setDiskConnected(perm === 'granted');
                setFolderName(handle.name || '');
            } catch { /* folder simply not connected yet */ }
        })();
        return () => { cancelled = true; };
    }, []);

    /* ── save everything to disk, with progress ───────────────────────── */
    const handleSave = useCallback(async (full = false) => {
        if (savingRef.current) return;
        savingRef.current = true;
        setPhase('saving');
        setProgress(0);
        setStepLabel(full ? 'Writing a complete backup…' : 'Saving your latest changes…');
        setError('');
        setSummary(null);

        try {
            const dm = await loadDiskModule();
            let handle: any = null;

            // Cloud target: one explicit upload, no folder involved.
            if (target === 'cloud' && isVipTier()) {
                const tickAtStartCloud = changeTickRef.current;
                setStepLabel('Uploading your workspace to the cloud…');
                const res = await saveToCloud();
                if (!res.success) throw new Error(res.error || 'Cloud save failed.');
                void refreshCloudInfo(true);
                savedTickRef.current = tickAtStartCloud;
                setPendingEdits(Math.max(0, changeTickRef.current - tickAtStartCloud));
                setProgress(100);
                // Say what was left behind, or the tutor sees a cloud copy much smaller than
                // their disk backup and has to guess what is missing from it.
                const keptOnDisk = res.strippedBytes
                    ? ` · ${formatBytes(res.strippedBytes)} of images stayed on your disk`
                    : '';
                setStepLabel(`Saved to the cloud · revision ${res.revision ?? 1} · ${((res.bytes || 0) / 1024).toFixed(1)} KB${keptOnDisk}`);
                setLastSavedAt(Date.now());
                setSummary(null);
                setPhase('done');
                hideTimerRef.current = setTimeout(() => { if (mountedRef.current) setVisible(false); }, 4200);
                return;
            }

            if (dm.isDiskModeEnabled()) {
                const stored = await dm.getStoredDirectoryHandle();
                if (stored) {
                    const granted = await dm.verifyDirectoryPermission(stored, true);
                    if (granted) handle = stored;
                }
            }

            if (!handle) {
                if (!dm.isFileSystemAccessSupported()) {
                    throw new Error('Direct folder access is not available here. Open the app in a full browser tab and try again.');
                }
                handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
                await dm.storeDirectoryHandle(handle);
                dm.setDiskModeEnabled(true);
            }

            setFolderName(handle.name || '');
            setDiskConnected(true);

            const tickAtStart = changeTickRef.current;
            const savedAtStart = savedTickRef.current;

            const ok = await dm.saveAllToDisk(handle, (done, total, label) => {
                if (!mountedRef.current) return;
                setProgress(Math.round((done / Math.max(1, total)) * 100));
                setStepLabel(label);
            }, { full });
            if (!ok) {
                const why = dm.getLastSyncSummary();
                throw new Error(why?.blocked
                    ? 'Saving was stopped on purpose: your backup folder holds more learners than this browser, so writing now would replace a good backup with empty data. Click “Restore All from Folder” in General settings first — or use Full to force a rewrite.'
                    : 'Backup could not be completed. Allow read & write access to the folder and try again.');
            }

            const stats = dm.getLastSyncSummary();
            if (stats && mountedRef.current) setSummary({ updated: stats.learnersUpdated, upToDate: stats.learnersUpToDate });
            savedTickRef.current = tickAtStart;
            setPendingEdits(tickAtStart - savedAtStart);
            setProgress(100);
            setStepLabel(stats && stats.learnersUpdated > 0
                ? `${stats.learnersUpdated} learner${stats.learnersUpdated === 1 ? '' : 's'} updated${stats.learnersUpToDate ? ` · ${stats.learnersUpToDate} already up to date` : ''}`
                : 'Everything is on your hard disk');
            setLastSavedAt(Date.now());
            setPhase('done');

            if (changeTickRef.current !== tickAtStart) {
                // edits arrived while we were saving — keep the card up for another pass
                setPendingEdits(Math.max(1, changeTickRef.current - savedTickRef.current));
                hideTimerRef.current = setTimeout(() => { if (mountedRef.current) setPhase('idle'); }, 1500);
            } else {
                hideTimerRef.current = setTimeout(() => { if (mountedRef.current) setVisible(false); }, 4200);
            }
        } catch (e: any) {
            if (e?.name === 'AbortError') {
                setPhase('idle');
                setStepLabel('');
            } else {
                const name = String(e?.name || '');
                setPhase('error');
                setError(
                    name === 'NotAllowedError' || name === 'SecurityError'
                        ? 'Folder access was blocked. Allow access to the folder (or open the app in a full browser tab) and try again.'
                        : e?.message || 'Backup failed unexpectedly. Please try again.'
                );
            }
        } finally {
            savingRef.current = false;
        }
    }, [target, refreshCloudInfo]);

    /* ── fallback: download a full backup file (works without folder access) ── */
    const handleDownloadBackup = useCallback(async () => {
        try {
            const ls = useLearnerStore.getState();
            const as = useAppStore.getState();
            const { get } = await import('idb-keyval');
            const [content, groupContent, platformContent] = await Promise.all([
                get('tutor-crafter-content'),
                get('tutor-crafter-group-content'),
                get('tutor-crafter-platform-content'),
            ]);
            const payload = {
                exportedAt: new Date().toISOString(),
                learners: ls.learners,
                groupClasses: ls.groupClasses,
                platforms: JSON.parse(localStorage.getItem('tutor-crafter-platforms') || '[]'),
                tutorProfile: as.tutorInfo,
                appName: as.appName,
                appAddress: as.appAddress,
                content: content || {},
                groupContent: groupContent || {},
                platformContent: platformContent || {},
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tutorly-backup-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 4000);

            savedTickRef.current = changeTickRef.current;
            setProgress(100);
            setStepLabel('Backup file downloaded');
            setLastSavedAt(Date.now());
            setPhase('done');
            hideTimerRef.current = setTimeout(() => { if (mountedRef.current) setVisible(false); }, 4200);
        } catch (e: any) {
            setPhase('error');
            setError(e?.message || 'Could not create the backup file.');
        }
    }, []);

    if (!visible) return null;

    const saving = phase === 'saving';
    const done = phase === 'done';
    const failed = phase === 'error';
    const cloudTarget = target === 'cloud' && isVipTier();

    // First run for a VIP tutor: ask where to save, once.
    if (needsChoice && !saving && !done) {
        return (
            <div className="fixed bottom-5 right-5 z-[75] w-[calc(100vw-2.5rem)] max-w-[400px] select-none" role="status">
                <div className="overflow-hidden rounded-2xl bg-white shadow-[0_18px_50px_-12px_rgba(15,23,42,.35)] ring-1 ring-slate-900/10">
                    <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400" />
                    <div className="p-4">
                        <p className="text-[15px] font-bold text-slate-900">Where should we save your data?</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                            Your work saves to your hard disk by default. As a VIP you can also keep a copy on the cloud (on the server database) — ask us once, change it any time in General settings.
                        </p>
                        <div className="mt-3 flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={() => handleChooseTarget('disk')}
                                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-3.5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-500 hover:to-blue-500 active:scale-[.98]"
                            >
                                💾 Save to Hard Disk (default)
                            </button>
                            <button
                                type="button"
                                onClick={() => handleChooseTarget('cloud')}
                                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                                ☁️ Also Save to Cloud
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const savedAgo = (() => {
        if (!lastSavedAt) return '';
        const secs = Math.max(0, Math.round((Date.now() - lastSavedAt) / 1000));
        if (secs < 45) return 'just now';
        const mins = Math.round(secs / 60);
        if (mins < 60) return `${mins} min ago`;
        const hrs = Math.round(mins / 60);
        return `${hrs} h ago`;
    })();

    return (
        <div
            className="fixed bottom-5 right-5 z-[75] w-[calc(100vw-2.5rem)] max-w-[400px] select-none"
            style={{ animation: 'savePromptIn .28s cubic-bezier(.21,1.02,.73,1) both' }}
            role="status"
            aria-live="polite"
        >
            <style>{`
                @keyframes savePromptIn{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
                @keyframes saveBarStripes{from{background-position:0 0}to{background-position:28px 0}}
            `}</style>

            <div className="relative overflow-hidden rounded-2xl bg-white shadow-[0_18px_50px_-12px_rgba(15,23,42,.35)] ring-1 ring-slate-900/10">
                {/* gradient accent */}
                <div className={`h-1.5 w-full bg-gradient-to-r ${done ? 'from-emerald-400 via-green-500 to-teal-500' : failed ? 'from-rose-400 via-red-500 to-orange-500' : 'from-indigo-500 via-blue-500 to-cyan-400'}`} />

                <div className="p-4">
                    <div className="flex items-start gap-3">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-lg ${done ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/30' : failed ? 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/30' : 'bg-gradient-to-br from-indigo-500 to-blue-600 shadow-indigo-500/30'}`}>
                            {done ? (
                                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                            ) : failed ? (
                                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 8v5" /><path d="M12 17h.01" /><path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>
                            ) : (
                                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 12H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" /><path d="M6 16h.01" /><path d="M10 16h.01" />
                                </svg>
                            )}
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <p className="truncate text-[15px] font-bold text-slate-900">
                                    {saving ? (cloudTarget ? 'Saving to the cloud…' : 'Saving to hard disk…') : done ? 'Backed up successfully' : failed ? 'Backup failed' : 'Unsaved changes'}
                                </p>
                                {!saving && !done && !failed && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                                        {pendingEdits > 1 ? `${pendingEdits} edits` : 'new'}
                                    </span>
                                )}
                            </div>
                            {done && summary && (
                                <p className="mt-1 text-[11px] font-semibold text-emerald-600">
                                    {summary.updated > 0
                                        ? `${summary.updated} learner ${summary.updated === 1 ? 'folder' : 'folders'} updated`
                                        : 'No learner changed'}
                                    {summary.upToDate > 0 ? ` · ${summary.upToDate} already up to date` : ''}
                                </p>
                            )}
                            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                                {saving
                                    ? stepLabel || 'Writing your data…'
                                    : done                                        ? (cloudTarget ? `Saved to the cloud${savedAgo ? ` • ${savedAgo}` : ''}` : (folderName ? `Saved to “${folderName}”${savedAgo ? ` • ${savedAgo}` : ''}` : 'Saved to your local folder'))
                                            : failed
                                                ? error
                                                : (cloudTarget
                                                    ? 'Your latest learners, sessions and settings are only in the browser. Save them to the cloud so nothing is lost.'
                                                    : 'Your latest learners & profile edits are only in the browser. Save them to your hard disk so nothing is lost.')}
                            </p>

                            {!saving && !done && (
                                <div className="mt-2 space-y-1.5">
                                    {/* Target switch + live status: one click between Hard Disk and Cloud. */}
                                    <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-2 py-1.5 ring-1 ring-slate-200/70">
                                        <div className="min-w-0 text-[11px] font-semibold text-slate-500">
                                            {cloudTarget ? (
                                                !cloudInfo
                                                    ? <span>{cloudInfoLoading ? 'Checking cloud…' : 'Cloud target selected'}</span>
                                                    : !cloudInfo.success
                                                        ? <span className="text-amber-700">{cloudInfo.error || 'Cloud is not reachable right now.'}</span>
                                                        : cloudInfo.exists
                                                            ? <span className="break-words" title={`${formatBytes(cloudInfo.bytes)} of ${formatBytes(cloudInfo.maxBytes)} used`}>
                                                                {formatBytes(cloudInfo.bytes)} · rev {cloudInfo.revision}
                                                                {cloudInfo.updatedAt ? ` · ${savedAgoFrom(cloudInfo.updatedAt).replace('saved ', '')}` : ''}
                                                              </span>
                                                            : <span className="break-words">No cloud copy yet — save once to create it ({formatBytes(cloudInfo.maxBytes)} available).</span>
                                            ) : (
                                                <span className="break-words">
                                                    {diskConnected ? `Backup folder: ${folderName || 'connected'}` : 'No backup folder connected yet'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-white p-0.5 ring-1 ring-slate-200" role="group" aria-label="Backup target">
                                            <button
                                                type="button"
                                                onClick={() => handleChooseTarget('disk')}
                                                title="Save to a folder on this computer"
                                                className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition ${!cloudTarget ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                                            >
                                                💾 Disk
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleChooseTarget('cloud')}
                                                title={isVipTier() ? 'Save to the server database' : 'Cloud saving is a VIP feature'}
                                                className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition ${cloudTarget ? 'bg-sky-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                                            >
                                                ☁️ Cloud{isVipTier() ? '' : ' 🔒'}
                                            </button>
                                        </div>
                                    </div>
                                    {/* On VIP, the cloud copy is always visible — even while the hard disk is the active target. */}
                                    {isVipTier() && !cloudTarget && cloudInfo?.success && (
                                        <p className="flex items-start gap-1.5 text-[11px] font-semibold text-slate-400">
                                            <i className="fas fa-cloud mt-0.5"></i>
                                            <span className="break-words">
                                                {cloudInfo.exists
                                                    ? <>Cloud copy: {formatBytes(cloudInfo.bytes)} · rev {cloudInfo.revision}{cloudInfo.updatedAt ? ` · ${savedAgoFrom(cloudInfo.updatedAt)}` : ''}{cloudInfo.device ? ` · ${cloudInfo.device}` : ''}</>
                                                    : <>Cloud copy: none yet · {formatBytes(cloudInfo.maxBytes)} available</>}
                                            </span>
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {!saving && (
                            <button
                                type="button"
                                onClick={() => setVisible(false)}
                                className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                aria-label="Dismiss"
                            >
                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        )}
                    </div>

                    {(saving || done) && (
                        <div className="mt-3">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                                <div
                                    className={`h-full rounded-full transition-all duration-300 ease-out ${done ? 'bg-gradient-to-r from-emerald-400 to-green-500' : 'bg-gradient-to-r from-indigo-500 to-blue-500'}`}
                                    style={{
                                        width: `${Math.max(saving ? 4 : 0, Math.min(100, progress))}%`,
                                        backgroundImage: saving ? 'linear-gradient(90deg,rgba(255,255,255,.28) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.28) 50%,rgba(255,255,255,.28) 75%,transparent 75%)' : undefined,
                                        backgroundSize: saving ? '28px 28px' : undefined,
                                        animation: saving ? 'saveBarStripes .7s linear infinite' : undefined,
                                    }}
                                />
                            </div>
                            <div className="mt-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                                <span className="truncate pr-2">{stepLabel || 'Working…'}</span>
                                <span className="tabular-nums">{progress}%</span>
                            </div>
                        </div>
                    )}

                    {!saving && !done && (
                        <div className="mt-3.5 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => handleSave()}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-3.5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-500 hover:to-blue-500 active:scale-[.98]"
                            >
                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><path d="M17 21v-8H7v8M7 3v5h8" /></svg>
                                {failed ? 'Retry backup' : (cloudTarget ? 'Save to Cloud' : 'Save changes')}
                            </button>
                            {!cloudTarget && (
                            <button
                                type="button"
                                onClick={() => handleSave(true)}
                                title="Rewrite every learner folder and photo, even the unchanged ones"
                                className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                                Full
                            </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setVisible(false)}
                                className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100"
                            >
                                Later
                            </button>
                        </div>
                    )}

                    {!saving && !done && !apiSupported && (
                        <button
                            type="button"
                            onClick={handleDownloadBackup}
                            className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                            ⬇ Download a backup file instead
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SaveToDiskPrompt;
