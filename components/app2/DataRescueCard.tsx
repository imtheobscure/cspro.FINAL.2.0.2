import React, { FC, useEffect, useState } from 'react';
import { readSafetySnapshot, restoreFromSafetyCopy, type SafetySnapshot } from '../../utils/diskStorage';
import { useLearnerStore } from '../../store/useLearnerStore';

/** Hidden for the rest of the tab once the tutor says "not now". */
const DISMISS_KEY = 'tutorly_rescue_card_dismissed';

/**
 * Shown on the Adult Dashboard when the roster is empty but a rescue copy of it
 * still exists in this browser.
 *
 * An empty dashboard is the worst possible thing to show a tutor: it looks
 * identical whether they have simply not added a learner yet or whether the
 * browser dropped their entire library, so the natural reaction is to start over —
 * which is what turns a recoverable eviction into permanent loss. This card draws
 * the distinction and puts the restore one click away, without ever touching the
 * browser's copy on its own.
 */
const DataRescueCard: FC = () => {
    const liveLearnerCount = useLearnerStore(state => state.learners.length);
    const [snapshot, setSnapshot] = useState<SafetySnapshot | null>(null);
    const [checking, setChecking] = useState(true);
    const [restoring, setRestoring] = useState(false);
    const [dismissed, setDismissed] = useState(() => {
        try { return window.sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
    });

    useEffect(() => {
        let cancelled = false;
        readSafetySnapshot()
            .then(found => { if (!cancelled) setSnapshot(found); })
            .catch(() => {})
            .finally(() => { if (!cancelled) setChecking(false); });
        return () => { cancelled = true; };
    }, []);

    const rescuedLearners = Array.isArray(snapshot?.learners) ? snapshot!.learners.length : 0;

    // Nothing to rescue, the roster is fine, or the tutor already said not now.
    if (checking || dismissed || liveLearnerCount > 0 || rescuedLearners === 0) return null;

    const savedAt = (() => {
        const raw = snapshot?.at;
        if (!raw) return null;
        const date = new Date(raw);
        return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
    })();

    const handleRestore = async () => {
        setRestoring(true);
        try {
            const ok = await restoreFromSafetyCopy({ replaceLearners: true });
            if (ok) {
                alert(`✅ Restored ${rescuedLearners} learner${rescuedLearners === 1 ? '' : 's'} from the copy kept in this browser. Reloading now so the dashboard shows them.`);
                window.location.reload();
            } else {
                alert('The copy kept in this browser could not be read back. If you connected a backup folder, use Settings ▸ Back-up Suite ▸ Restore All From Folder instead.');
                setRestoring(false);
            }
        } catch (err) {
            alert(`Restore failed: ${err instanceof Error ? err.message : String(err)}`);
            setRestoring(false);
        }
    };

    const handleDismiss = () => {
        try { window.sessionStorage.setItem(DISMISS_KEY, '1'); } catch {}
        setDismissed(true);
    };

    return (
        <div className="m-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-left">
            <div className="flex items-start gap-3">
                <i className="fas fa-life-ring text-2xl text-amber-600 mt-0.5" aria-hidden="true"></i>
                <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-amber-900">
                        Your learners are not gone — a saved copy is still here
                    </h3>
                    <p className="text-sm text-amber-800 mt-1">
                        This dashboard is empty, but this browser still holds a copy of{' '}
                        <strong>{rescuedLearners} learner{rescuedLearners === 1 ? '' : 's'}</strong>
                        {savedAt ? <> saved on <strong>{savedAt}</strong></> : null}. That normally means the
                        browser dropped its own storage rather than you deleting anything.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                        <button
                            type="button"
                            onClick={handleRestore}
                            disabled={restoring}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-blue text-white font-bold hover:opacity-90 disabled:opacity-60 transition"
                        >
                            {restoring
                                ? <><i className="fas fa-spinner fa-spin"></i> Restoring…</>
                                : <><i className="fas fa-rotate-left"></i> Restore my data</>}
                        </button>
                        <button
                            type="button"
                            onClick={handleDismiss}
                            disabled={restoring}
                            className="px-3 py-2 rounded-lg bg-white border border-amber-300 text-amber-800 font-semibold hover:bg-amber-100 disabled:opacity-60 transition"
                        >
                            Not now
                        </button>
                    </div>
                    <p className="text-xs text-amber-700 mt-2">
                        Restoring only replaces the roster in this browser with the saved copy — nothing else is
                        deleted, and your backup folder is left untouched.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DataRescueCard;
