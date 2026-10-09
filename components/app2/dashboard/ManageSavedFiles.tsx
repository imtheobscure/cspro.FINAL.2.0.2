import React, { FC, useState, useEffect, useMemo } from 'react';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import { triggerUniversalDownload, deleteSavedLesson, pairDigestsWithLessons, SavedHtmlLessonRecord } from '../../../utils/htmlLessonSaver';
import * as idb from 'idb-keyval';

/** Progress records mirrored by the React presenters / standalone HTML into localStorage. */
interface ProgressRecord {
    fileName: string;
    title: string;
    updatedAt: string;
    // Flipbook fields
    xp?: number;
    level?: number;
    completedPages?: number[];
    totalSections?: number;
    // Gamified Challenge fields
    points?: number;
    fearMeter?: number;
    completedDays?: number[];
}

const ManageSavedFiles: FC = () => {
    const [files, setFiles] = useState<SavedHtmlLessonRecord[]>([]);
    const [progress, setProgress] = useState<ProgressRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadFiles = async () => {
        setLoading(true);
        setError(null);
        try {
             const idbList: SavedHtmlLessonRecord[] = (await idb.get('tutorly_saved_html_lessons')) || [];
             const localFiles = JSON.parse(localStorage.getItem('tutorly-upload-fallback-files') || '[]');

             const combinedMap = new Map<string, SavedHtmlLessonRecord>();
             idbList.forEach(item => combinedMap.set(item.filename, item));

             localFiles.forEach((item: any) => {
                 if (!combinedMap.has(item.filename)) {
                     combinedMap.set(item.filename, {
                         id: `legacy_${item.filename}`,
                         tutor: item.tutor || 'Tutor',
                         learner: item.learner || 'Learner',
                         filename: item.filename,
                         type: 'HTML Lesson',
                         title: item.filename,
                         path: item.path || item.url || '',
                         url: item.url || item.path || '',
                         timestamp: item.timestamp || new Date().toISOString(),
                         size: item.size || 0
                     });
                 }
             });

             const sorted = Array.from(combinedMap.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
             setFiles(sorted);

             // Load flipbook + gamified progress for every learner that has saved files.
             const prog: ProgressRecord[] = [];
             const seen = new Set<string>();
             sorted.forEach((f) => {
                 const learner = f.learner || 'Learner';
                 if (seen.has(learner)) return;
                 seen.add(learner);
                 try {
                     const list: ProgressRecord[] = JSON.parse(localStorage.getItem(`tutorly-flipbook-progress-${learner}`) || '[]');
                     list.forEach((r) => prog.push(r));
                 } catch { /* ignore */ }
                 try {
                     const gList: ProgressRecord[] = JSON.parse(localStorage.getItem(`tutorly-gamified-progress-${learner}`) || '[]');
                     gList.forEach((r) => prog.push(r));
                 } catch { /* ignore */ }
                 try {
                     const mList: ProgressRecord[] = JSON.parse(localStorage.getItem(`tutorly-music-progress-${learner}`) || '[]');
                     mList.forEach((r) => prog.push(r));
                 } catch { /* ignore */ }
                 try {
                     const dList: ProgressRecord[] = JSON.parse(localStorage.getItem(`tutorly-daily-progress-${learner}`) || '[]');
                     dList.forEach((r) => prog.push(r));
                 } catch { /* ignore */ }
                 try {
                     const lvList: ProgressRecord[] = JSON.parse(localStorage.getItem(`tutorly-live-lessons-${learner}`) || '[]');
                     lvList.forEach((r) => prog.push(r));
                 } catch { /* ignore */ }
                 try {
                     const vdList: ProgressRecord[] = JSON.parse(localStorage.getItem(`tutorly-video-lessons-${learner}`) || '[]');
                     vdList.forEach((r) => prog.push(r));
                 } catch { /* ignore */ }
             });
             setProgress(prog);
        } catch (e: any) {
             console.warn("Error loading files:", e);
             setError(e.message || "Failed to load files");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFiles();
    }, []);

    /**
     * Lessons are the rows; a lesson's one-page A4 digest is a button on its row, so the library
     * keeps reading as a list of lessons. Digests whose lesson was deleted stay visible.
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

        // Derived files go with their lesson: deleting a lesson also deletes its A4 digest.
        await deleteSavedLesson(filename);
        setFiles(prev => prev.filter(f => f.filename !== filename));
    };

    const handleClearAll = async () => {
        if (!window.confirm('WARNING: Are you sure you want to delete ALL saved files? This cannot be undone.')) return;
        localStorage.setItem('tutorly-upload-fallback-files', '[]');
        await idb.set('tutorly_saved_html_lessons', []);
        setFiles([]);
        alert('All files cleared.');
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">📂 Manage Saved Files</h2>
                <div className="space-x-2">
                    <Button onClick={loadFiles} className="bg-blue-600 hover:bg-blue-700">🔄 Refresh</Button>
                    {files.length > 0 && (
                        <Button onClick={handleClearAll} className="bg-red-600 hover:bg-red-700">🗑️ Clear All</Button>
                    )}
                </div>
            </div>
            {loading ? (
                <p>Loading files...</p>
            ) : error ? (
                <div className="bg-red-50 text-red-600 p-4 rounded">
                    Cannot load files from server. (Are you on a static host without PHP?) <br/>
                    Details: {error}
                </div>
            ) : entries.length === 0 && orphanDigests.length === 0 ? (
                <p className="text-gray-500">No files saved yet.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="p-2 border">Tutor</th>
                                <th className="p-2 border">Learner</th>
                                <th className="p-2 border">File</th>
                                <th className="p-2 border text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map(({ lesson: f, digest }, idx) => (
                                <tr key={`${f.path || f.filename}-${f.timestamp || idx}-${idx}`} className="border-b hover:bg-gray-50">
                                    <td className="p-2">{f.tutor}</td>
                                    <td className="p-2">{f.learner}</td>
                                    <td className="p-2">
                                        <div className="font-semibold text-gray-900">{f.filename}</div>
                                        <div className="text-xs text-gray-500">{new Date(f.timestamp).toLocaleString()}</div>
                                        {digest && (
                                            <button
                                                type="button"
                                                onClick={() => handleOpenOrDownload(digest)}
                                                title="One-page A4 digest — key language & points, ready to print"
                                                className="text-[11px] mt-0.5 px-1.5 py-0.5 inline-block rounded bg-amber-50 text-amber-900 border border-amber-300 font-semibold hover:bg-amber-100 transition cursor-pointer"
                                            >
                                                🧾 A4 digest
                                            </button>
                                        )}
                                        {(() => {
                                            if ((f.type || '').toLowerCase().includes('gamified')) {
                                                const p = progress.find((r) => r.fileName === f.filename);
                                                if (!p) return null;
                                                const done = p.completedDays ? p.completedDays.length : 0;
                                                return <div className="text-[11px] mt-0.5 px-1.5 py-0.5 inline-block rounded bg-emerald-50 text-emerald-700 font-semibold">🏆 {p.points ?? 0} pts · 😱 {p.fearMeter ?? 0}% fear · {done} days done</div>;
                                            }
                                            if ((f.type || '').toLowerCase().includes('music')) {
                                                const p = progress.find((r) => r.fileName === f.filename);
                                                if (!p) return null;
                                                const done = p.completedPages ? p.completedPages.length : 0;
                                                return <div className="text-[11px] mt-0.5 px-1.5 py-0.5 inline-block rounded bg-emerald-50 text-emerald-700 font-semibold">🎵 {p.xp ?? 0} XP · Lv {p.level ?? 1} · {done}/{p.totalSections ?? 0} lessons</div>;
                                            }
                                            if ((f.type || '').toLowerCase().includes('video')) {
                                                const p = progress.find((r) => r.fileName === f.filename);
                                                if (!p) return null;
                                                const done = (p as any).completed ?? 0;
                                                const total = (p as any).total ?? 0;
                                                return <div className="text-[11px] mt-0.5 px-1.5 py-0.5 inline-block rounded bg-emerald-50 text-emerald-700 font-semibold">🎬 {(p as any).xp ?? 0} XP · Lv {(p as any).level ?? 1} · {done}/{total} activities</div>;
                                            }
                                            if ((f.type || '').toLowerCase().includes('live')) {
                                                const p = progress.find((r) => r.fileName === f.filename);
                                                if (!p) return null;
                                                const done = (p as any).completedSteps ?? 0;
                                                const total = (p as any).totalSteps ?? 0;
                                                return <div className="text-[11px] mt-0.5 px-1.5 py-0.5 inline-block rounded bg-emerald-50 text-emerald-700 font-semibold">⚡ {(p as any).xp ?? 0} XP · Lv {(p as any).levelNum ?? 1} · {done}/{total} steps · {(p as any).tier || ''}</div>;
                                            }
                                            if ((f.type || '').toLowerCase().includes('daily')) {
                                                const p = progress.find((r) => r.fileName === f.filename);
                                                if (!p) return null;
                                                const done = (p as any).completedSteps ? (p as any).completedSteps.length : 0;
                                                const mods = (p as any).completedModules ? (p as any).completedModules.length : 0;
                                                return <div className="text-[11px] mt-0.5 px-1.5 py-0.5 inline-block rounded bg-emerald-50 text-emerald-700 font-semibold">🐱 {(p as any).xp ?? 0} XP · Lv {(p as any).levelNum ?? 1} · {done}/10 steps · {mods}/3 games</div>;
                                            }
                                            const p = progress.find((r) => r.fileName === f.filename);
                                            if (!p) return null;
                                            const pct = p.totalSections > 0 ? Math.round((p.completedPages.length / p.totalSections) * 100) : 0;
                                            return <div className="text-[11px] mt-0.5 px-1.5 py-0.5 inline-block rounded bg-emerald-50 text-emerald-700 font-semibold">⚡ {p.xp} XP · Lv {p.level} · {p.completedPages.length}/{p.totalSections} sections ({pct}%)</div>;
                                        })()}
                                    </td>
                                    <td className="p-2 text-center space-x-2 flex justify-center">
                                        <Button
                                            onClick={() => handleOpenOrDownload(f)}
                                            className="bg-green-600 hover:bg-green-700 text-xs py-1"
                                        >
                                            📥 Open / Save
                                        </Button>
                                        {((f.type || '').toLowerCase().includes('flipbook') || (f.type || '').toLowerCase().includes('gamified') || (f.type || '').toLowerCase().includes('music') || (f.type || '').toLowerCase().includes('daily') || (f.type || '').toLowerCase().includes('live') || (f.type || '').toLowerCase().includes('video')) && (
                                            <Button
                                                onClick={() => handleOpenLiveAsPresenter(f)}
                                                className="bg-violet-600 hover:bg-violet-700 text-xs py-1"
                                            >
                                                ▶ Open Live as Presenter
                                            </Button>
                                        )}
                                        <Button
                                            onClick={() => handleDelete(f.filename)}
                                            className="bg-red-600 hover:bg-red-700 text-xs py-1"
                                        >
                                            🗑️ Delete
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {/* Digests left behind by deleted lessons — never silently dropped. */}
                            {orphanDigests.map((d, idx) => (
                                <tr key={`digest-${d.filename}-${idx}`} className="border-b bg-amber-50/60 hover:bg-amber-50">
                                    <td className="p-2">{d.tutor}</td>
                                    <td className="p-2">{d.learner}</td>
                                    <td className="p-2">
                                        <div className="font-semibold text-gray-900">{d.filename}</div>
                                        <div className="text-xs text-gray-500">{new Date(d.timestamp).toLocaleString()}</div>
                                        <div className="text-[11px] mt-0.5 px-1.5 py-0.5 inline-block rounded bg-amber-100 text-amber-900 font-semibold">🧾 Lesson Digest (A4)</div>
                                    </td>
                                    <td className="p-2 text-center space-x-2 flex justify-center">
                                        <Button
                                            onClick={() => handleOpenOrDownload(d)}
                                            className="bg-amber-600 hover:bg-amber-700 text-xs py-1"
                                        >
                                            🖨️ Open / Save
                                        </Button>
                                        <Button
                                            onClick={() => handleDelete(d.filename)}
                                            className="bg-red-600 hover:bg-red-700 text-xs py-1"
                                        >
                                            🗑️ Delete
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
};

export default ManageSavedFiles;
