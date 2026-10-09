import React, { FC, useState, useEffect, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { getSavedLessonsForLearner, triggerUniversalDownload, deleteSavedLesson, pairDigestsWithLessons, SavedHtmlLessonRecord } from '../../utils/htmlLessonSaver';

/** Flipbook progress records mirrored by the React presenter / standalone HTML into localStorage. */
interface FlipbookProgressRecord {
    fileName: string;
    title: string;
    xp: number;
    level: number;
    completedPages: number[];
    totalSections: number;
    answers: Record<string, unknown>;
    updatedAt: string;
}

const LearnerSavedFiles: FC<{ tutorName: string; learnerName: string }> = ({ tutorName, learnerName }) => {
    const [files, setFiles] = useState<SavedHtmlLessonRecord[]>([]);
    const [progress, setProgress] = useState<FlipbookProgressRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadFiles = async () => {
        setLoading(true);
        setError(null);
        try {
            const lessons = await getSavedLessonsForLearner(learnerName, tutorName);
            setFiles(lessons);
            try {
                const fb = JSON.parse(localStorage.getItem(`tutorly-flipbook-progress-${learnerName}`) || '[]');
                const gm = JSON.parse(localStorage.getItem(`tutorly-gamified-progress-${learnerName}`) || '[]');
                const mu = JSON.parse(localStorage.getItem(`tutorly-music-progress-${learnerName}`) || '[]');
                const dl = JSON.parse(localStorage.getItem(`tutorly-daily-progress-${learnerName}`) || '[]');
                const lv = JSON.parse(localStorage.getItem(`tutorly-live-lessons-${learnerName}`) || '[]');
                const vd = JSON.parse(localStorage.getItem(`tutorly-video-lessons-${learnerName}`) || '[]');
                setProgress([...(Array.isArray(fb) ? fb : []), ...(Array.isArray(gm) ? gm : []), ...(Array.isArray(mu) ? mu : []), ...(Array.isArray(dl) ? dl : []), ...(Array.isArray(lv) ? lv : []), ...(Array.isArray(vd) ? vd : [])]);
            } catch { setProgress([]); }
        } catch (e: any) {
             console.warn("Saved files load failed:", e);
             setError(e.message || "Failed to load saved files");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFiles();
    }, [tutorName, learnerName]);

    /**
     * Lessons are the library's rows; a lesson's one-page digest is a chip on its row, not a row
     * of its own. A digest left behind by a deleted lesson still gets shown — filed work should
     * not disappear just because its lesson was cleaned up.
     */
    const { entries, orphanDigests } = useMemo(() => pairDigestsWithLessons(files), [files]);

    const handleOpenOrDownload = (file: SavedHtmlLessonRecord) => {
        if (file.htmlContent) {
            triggerUniversalDownload(file.htmlContent, file.filename);
        } else if (file.url) {
            window.open(file.url, '_blank');
        }
    };

    // Flipbook Homework / Gamified Challenge lessons saved from the Manual JSON
    // Creator stash their live JSON in localStorage — re-open them in the React
    // presenter, not the HTML.
    const handleOpenLiveAsPresenter = (file: SavedHtmlLessonRecord) => {
        const t = (file.type || '').toLowerCase();
        const isVideo = t.includes('video');
        const isGamified = t.includes('gamified');
        const isMusic = t.includes('music');
        const isDaily = t.includes('daily');
        const isLive = !isVideo && t.includes('live');
        const key = isVideo ? `tutorly-video-lesson-${file.filename}` : isGamified ? `tutorly-gamified-live-${file.filename}` : isMusic ? `tutorly-music-live-${file.filename}` : isDaily ? `tutorly-daily-live-${file.filename}` : isLive ? `tutorly-live-live-${file.filename}` : `tutorly-flipbook-live-${file.filename}`;
        if (!localStorage.getItem(key)) {
            alert('No live copy of this lesson was found. Please open the HTML version instead — or re-save the lesson from the Lesson Creator to enable presenter mode.');
            return;
        }
        window.location.hash = `#/${isVideo ? 'video' : isGamified ? 'gamified' : isMusic ? 'music' : isDaily ? 'daily' : isLive ? 'livelesson' : 'flipbook'}/${encodeURIComponent(file.filename)}`;
    };

    const handleDelete = async (filename: string) => {
        if (!window.confirm(`Delete ${filename}?`)) return;

        try {
            // `deleteSavedLesson` also removes anything derived from it — a lesson's digest goes
            // with the lesson, so the library never lists a sheet for a lesson that is gone.
            await deleteSavedLesson(filename);
            setFiles(prev => prev.filter(f => f.filename !== filename));
        } catch (e) {
            console.error("Failed to delete file:", e);
        }
    };

    return (
        <Card className="mt-8 border-t-4 border-indigo-500">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">📂 Saved Library Files</h3>
                <button onClick={loadFiles} className="text-sm text-indigo-600 hover:underline cursor-pointer">
                    🔄 Refresh
                </button>
            </div>
            {loading ? (
                <Spinner />
            ) : error ? (
                <p className="text-red-500 text-sm">Could not load files: {error}</p>
            ) : files.length === 0 ? (
                <p className="text-gray-500 italic">No files saved for this learner yet.</p>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {entries.map(({ lesson: f, digest }, idx) => (
                        <Card key={`${f.path || f.filename}-${f.timestamp || idx}-${idx}`} className="flex justify-between items-center hover:shadow-md transition-shadow border-l-4 border-teal-500 bg-gray-50 p-4">
                            <div>
                                <h4 className="font-bold text-gray-900">{f.filename}</h4>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold">{f.type || 'Lesson'}</span>
                                    <p className="text-xs text-gray-500">{new Date(f.timestamp).toLocaleString()}</p>
                                    {digest && (
                                        <button
                                            type="button"
                                            onClick={() => handleOpenOrDownload(digest)}
                                            title="One-page A4 digest — key language & points, ready to print"
                                            className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300 font-semibold hover:bg-amber-100 transition cursor-pointer"
                                        >
                                            🧾 A4 digest
                                        </button>
                                    )}
                                    {(f.type || '').toLowerCase().includes('gamified') && (() => {
                                        const p = progress.find((r) => r.fileName === f.filename);
                                        if (!p) return <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-500 font-semibold">No progress yet</span>;
                                        const done = (p as any).completedDays ? (p as any).completedDays.length : 0;
                                        return (
                                            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                                                🏆 {(p as any).points ?? 0} pts · 😱 {(p as any).fearMeter ?? 0}% fear · {done} days done
                                            </span>
                                        );
                                    })()}
                                    {(f.type || '').toLowerCase().includes('music') && (() => {
                                        const p = progress.find((r) => r.fileName === f.filename);
                                        if (!p) return <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-500 font-semibold">No progress yet</span>;
                                        const done = (p as any).completedPages ? (p as any).completedPages.length : 0;
                                        return (
                                            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                                                🎵 {(p as any).xp ?? 0} XP · Lv {(p as any).level ?? 1} · {done}/{p.totalSections ?? 0} lessons
                                            </span>
                                        );
                                    })()}
                                    {(f.type || '').toLowerCase().includes('video') && (() => {
                                        const p = progress.find((r) => r.fileName === f.filename);
                                        if (!p) return <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-500 font-semibold">No progress yet</span>;
                                        const done = (p as any).completed ?? 0;
                                        const total = (p as any).total ?? 0;
                                        return (
                                            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                                                🎬 {(p as any).xp ?? 0} XP · Lv {(p as any).level ?? 1} · {done}/{total} activities
                                            </span>
                                        );
                                    })()}
                                    {(f.type || '').toLowerCase().includes('daily') && (() => {
                                        const p = progress.find((r) => r.fileName === f.filename);
                                        if (!p) return <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-500 font-semibold">No progress yet</span>;
                                        const done = (p as any).completedSteps ? (p as any).completedSteps.length : 0;
                                        const mods = (p as any).completedModules ? (p as any).completedModules.length : 0;
                                        return (
                                            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                                                🐱 {(p as any).xp ?? 0} XP · Lv {(p as any).levelNum ?? 1} · {done}/10 steps · {mods}/3 games
                                            </span>
                                        );
                                    })()}
                                    {(f.type || '').toLowerCase().includes('live') && (() => {
                                        const p = progress.find((r) => r.fileName === f.filename);
                                        if (!p) return <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-500 font-semibold">No progress yet</span>;
                                        const done = (p as any).completedSteps ?? 0;
                                        const total = (p as any).totalSteps ?? 0;
                                        return (
                                            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                                                ⚡ {(p as any).xp ?? 0} XP · Lv {(p as any).levelNum ?? 1} · {done}/{total} steps · {(p as any).tier || ''}
                                            </span>
                                        );
                                    })()}
                                    {(f.type || '').toLowerCase().includes('flipbook') && !(f.type || '').toLowerCase().includes('gamified') && !(f.type || '').toLowerCase().includes('daily') && (() => {
                                        const p = progress.find((r) => r.fileName === f.filename);
                                        if (!p) return <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-500 font-semibold">No progress yet</span>;
                                        const pct = p.totalSections > 0 ? Math.round((p.completedPages.length / p.totalSections) * 100) : 0;
                                        return (
                                            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                                                ⚡ {p.xp} XP · Lv {p.level} · {p.completedPages.length}/{p.totalSections} sections ({pct}%)
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleOpenOrDownload(f)}
                                    className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 text-sm font-bold shadow-sm flex items-center gap-2 cursor-pointer"
                                >
                                    <i className="fas fa-download"></i> Open / Download
                                </button>
                                {((f.type || '').toLowerCase().includes('flipbook') || (f.type || '').toLowerCase().includes('gamified') || (f.type || '').toLowerCase().includes('music') || (f.type || '').toLowerCase().includes('daily') || (f.type || '').toLowerCase().includes('live') || (f.type || '').toLowerCase().includes('video')) && (
                                    <button 
                                        onClick={() => handleOpenLiveAsPresenter(f)}
                                        className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 text-sm font-bold shadow-sm flex items-center gap-2 cursor-pointer"
                                    >
                                        <i className="fas fa-play"></i> Open Live as Presenter
                                    </button>
                                )}
                                <button 
                                    onClick={() => handleDelete(f.filename)}
                                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-bold shadow-sm flex items-center gap-2 cursor-pointer"
                                >
                                    <i className="fas fa-trash"></i>
                                </button>
                            </div>
                        </Card>
                    ))}
                    {/* A digest whose lesson was deleted: still listed, clearly marked as a sheet. */}
                    {orphanDigests.map((d, idx) => (
                        <Card key={`digest-${d.filename}-${idx}`} className="flex justify-between items-center hover:shadow-md transition-shadow border-l-4 border-amber-400 bg-amber-50/60 p-4">
                            <div>
                                <h4 className="font-bold text-gray-900">{d.filename}</h4>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold">🧾 Lesson Digest (A4)</span>
                                    <p className="text-xs text-gray-500">{new Date(d.timestamp).toLocaleString()}</p>
                                    {d.parentFilename && (
                                        <span className="text-[11px] text-gray-500">from {d.parentFilename} — that lesson is not in the library</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleOpenOrDownload(d)}
                                    className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 text-sm font-bold shadow-sm flex items-center gap-2 cursor-pointer"
                                >
                                    <i className="fas fa-print"></i> Open / Download
                                </button>
                                <button
                                    onClick={() => handleDelete(d.filename)}
                                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-bold shadow-sm flex items-center gap-2 cursor-pointer"
                                >
                                    <i className="fas fa-trash"></i>
                                </button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </Card>
    );
};

export default LearnerSavedFiles;
