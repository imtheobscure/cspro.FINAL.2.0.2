import React, { useMemo, useRef, useState } from 'react';
import { GroupClass, GroupParticipant } from '../../../../types2';
import { useLearnerStore } from '../../../../store/useLearnerStore';
import SectionCard from '../../SectionCard';
import {
    buildGroupLessonFacts,
    groupL1Label,
    groupRosterPrompt,
    parseGroupRoster,
    participantLevelLabel,
} from '../../../../services/groupParticipants';

/**
 * The roster of a GROUP class.
 *
 * A group class has no individual accounts behind it: the tutor types the people in, or
 * pastes an AI's answer, and that IS the roster. This component is the one place that
 * happens, and it is reused by "Create New Group Class" as well as the class profile, so
 * a class can be built complete in either place.
 *
 * Two ways in, because tutors arrive with different things in hand:
 *   · manually — name, CEFR, facts, and how to use that person in class;
 *   · from a transcript — copy the AI prompt to any external AI together with the
 *     transcript, then paste the JSON it returns back here (see
 *     `services/groupParticipants.ts` for the prompt and the tolerant parser).
 */

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

type Draft = Omit<GroupParticipant, 'id'>;

const emptyDraft = (cefr = ''): Draft => ({
    name: '',
    cefr,
    l1: '',
    facts: '',
    interests: '',
    goals: '',
    talkative: 'unknown',
    routing: '',
    email: '',
    phone: '',
    country: '',
    progress: 0,
    attendance: [],
});

const talkativeBadge: Record<string, { label: string; className: string }> = {
    high: { label: 'Talkative', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    medium: { label: 'Steady', className: 'bg-sky-100 text-sky-700 border-sky-200' },
    low: { label: 'Shy', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    unknown: { label: 'Unknown', className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

interface GroupParticipantsManagerProps {
    group: GroupClass;
    onUpdate?: (updated: GroupClass) => void;
    /** Passed by the create-class modal: the class does not exist yet. */
    draftParticipants?: Draft[];
    onDraftChange?: (participants: Draft[]) => void;
    compact?: boolean;
}

const GroupParticipantsManager: React.FC<GroupParticipantsManagerProps> = ({
    group,
    onUpdate,
    draftParticipants,
    onDraftChange,
    compact = false,
}) => {
    // When `draftParticipants` is provided the manager edits a local list instead of the
    // store — that is the create-class flow, where the id does not exist yet.
    const isDraft = Array.isArray(draftParticipants);
    const addGroupParticipant = useLearnerStore((s) => s.addGroupParticipant);
    const updateGroupParticipant = useLearnerStore((s) => s.updateGroupParticipant);
    const removeGroupParticipant = useLearnerStore((s) => s.removeGroupParticipant);
    const importGroupParticipants = useLearnerStore((s) => s.importGroupParticipants);

    const [draft, setDraft] = useState<Draft>(emptyDraft());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState<GroupParticipant | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const [importReport, setImportReport] = useState<{ ok: boolean; lines: string[] } | null>(null);
    const [copied, setCopied] = useState(false);
    const [showAttendance, setShowAttendance] = useState(false);
    const [attendanceSessionId, setAttendanceSessionId] = useState('');
    const [presentIds, setPresentIds] = useState<string[]>([]);
    const [attendanceSaved, setAttendanceSaved] = useState(false);
    const fileRef = useRef<HTMLInputElement | null>(null);
    const recordGroupAttendance = useLearnerStore((s) => s.recordGroupAttendance);
    const sessions = (group.sessions || []) as Array<{ id: string; date?: string; topic?: string; notes?: string }>;

    const participants = isDraft ? (draftParticipants as Draft[]) : (group.participantsData || []);

    const stats = useMemo(() => {
        const levels = participants.map((p) => participantLevelLabel(p)).filter((l) => l !== 'Unknown level');
        const counts = new Map<string, number>();
        levels.forEach((l) => counts.set(l, (counts.get(l) || 0) + 1));
        const spread = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([l, n]) => `${l}×${n}`).join(' · ');
        const loggedSessions = group.sessions?.length || 0;
        const attendanceFor = (p: Draft | GroupParticipant) => {
            const records = (p.attendance || []);
            const present = records.filter((a) => a.present).length;
            // Unknown sessions count as attended: a new roster should not open on 0 %.
            const total = Math.max(records.length, loggedSessions);
            return total === 0 ? null : Math.round((present / total) * 100);
        };
        const rates = participants.map(attendanceFor).filter((r): r is number => r !== null);
        const avgAttendance = rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : null;
        const quietCount = participants.filter((p) => p.talkative === 'low').length;
        // What the class can be translated into as a whole: one shared L1 (only when every
        // learner is recorded), a mix, or a gap. Shown here because it is the one group-level
        // fact that changes what a lesson is allowed to do.
        const classL1 = groupL1Label(participants as GroupParticipant[]);
        return { spread: spread || '—', avgAttendance, quietCount, attendanceFor, classL1 };
    }, [participants, group.sessions]);

    const mutateDraftList = (next: Draft[]) => onDraftChange?.(next);

    const handleAdd = () => {
        if (!draft.name.trim()) return;
        const clean: Draft = { ...draft, name: draft.name.trim() };
        if (isDraft) mutateDraftList([...participants, clean]);
        else addGroupParticipant(group.id, clean);
        setDraft(emptyDraft(draft.cefr || ''));
        setShowAddForm(false);
        setImportReport(null);
    };

    const handleSaveEdit = () => {
        if (!editDraft) return;
        if (isDraft) {
            mutateDraftList(
                (draftParticipants as Draft[]).map((p, i) => (i === Number(editingId) ? { ...editDraft } : p))
            );
        } else {
            updateGroupParticipant(group.id, editDraft);
        }
        setEditingId(null);
        setEditDraft(null);
    };

    const handleRemove = (index: number, participant: Draft | GroupParticipant) => {
        if (isDraft) mutateDraftList((draftParticipants as Draft[]).filter((_, i) => i !== index));
        else removeGroupParticipant(group.id, (participant as GroupParticipant).id);
    };

    /**
     * Attendance belongs to the ROSTER, not to the session: a group class needs to know WHO
     * was missing, and every rate on this card (and the class profile's) is derived from
     * these records. Everyone is ticked by default — the common case is a full room.
     */
    const openAttendance = () => {
        const next = !showAttendance;
        setShowAttendance(next);
        setAttendanceSaved(false);
        if (next) {
            const first = sessions[0];
            setAttendanceSessionId(first?.id || '');
            setPresentIds(participants.map((p) => (p as GroupParticipant).id).filter(Boolean));
        }
    };

    const saveAttendance = () => {
        const session = sessions.find((s) => s.id === attendanceSessionId);
        if (!session) return;
        recordGroupAttendance(group.id, session.id, session.date || new Date().toISOString().split('T')[0], presentIds);
        setAttendanceSaved(true);
        setTimeout(() => setAttendanceSaved(false), 2500);
    };

    const copyPrompt = async () => {
        const prompt = groupRosterPrompt(`"${group.name || 'my group class'}"`);
        try {
            await navigator.clipboard.writeText(prompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // Clipboard permission can be refused (an embedded frame, an insecure origin).
            // Show the prompt so it can still be selected and copied by hand.
            setPasteText((t) => t || prompt);
            setImportReport({ ok: false, lines: ['Your browser blocked the clipboard. The prompt has been placed in the box below — select and copy it.'] });
        }
    };

    const applyImport = (raw: string, source: string) => {
        const parsed = parseGroupRoster(raw);
        if (parsed.errors.length || parsed.participants.length === 0) {
            setImportReport({ ok: false, lines: [...parsed.errors, ...parsed.warnings] });
            return;
        }
        let added = parsed.participants.length;
        if (isDraft) {
            const merged = [...(draftParticipants as Draft[])];
            parsed.participants.forEach((incoming) => {
                const at = merged.findIndex((p) => p.name.trim().toLowerCase() === incoming.name.trim().toLowerCase());
                if (at === -1) merged.push(incoming);
                else merged[at] = { ...incoming, ...merged[at] };
            });
            added = merged.length - participants.length;
            mutateDraftList(merged);
        } else {
            added = importGroupParticipants(group.id, parsed.participants, { source });
        }
        const summary = parsed.groupSummary ? [`Group summary: ${parsed.groupSummary}`] : [];
        setImportReport({
            ok: true,
            lines: [
                `Imported ${parsed.participants.length} learner${parsed.participants.length === 1 ? '' : 's'} (${added} new).`,
                ...summary,
                ...parsed.warnings,
            ],
        });
        setPasteText('');
    };

    const readFile = async (file: File) => {
        const text = await file.text();
        // A transcript is NOT JSON: hand it to the AI first. Only .json is imported directly.
        if (/\.json$/i.test(file.name) || text.trim().startsWith('{') || text.trim().startsWith('[')) {
            applyImport(text, file.name);
        } else {
            setPasteText(text);
            setImportReport({
                ok: false,
                lines: [
                    `"${file.name}" is not JSON, so it cannot be imported directly — it is source material.`,
                    'Copy the AI prompt, give the AI this file, then paste the JSON it returns into the box.',
                    'It has been loaded into the box below so you can copy it to your AI.',
                ],
            });
        }
    };

    const field = 'w-full p-3 bg-white border border-brand-gray-light rounded-lg focus:ring-2 focus:ring-brand-blue text-sm';

    const cancelEdit = () => {
        setEditingId(null);
        setEditDraft(null);
    };

    /*
     * The form is memoised so its component TYPE stays the same between renders.
     *
     * Declared inline, this function is a brand-new component on every render, so React
     * unmounts and rebuilds all twelve inputs on every keystroke — each key lands in a fresh
     * <input>, focus and IME composition are lost, and a field edited in the same tick as
     * another (autofill, paste, a script) writes to a node React has already thrown away.
     * Nothing inside depends on a changing value: `field` is a constant string and
     * everything else arrives as a prop.
     *
     * Fields report a PATCH, not the whole object, and the parent merges it with the previous
     * state, so no handler can resurrect values from a stale render.
     */
    const ParticipantForm = useMemo(() => {
        const Form: React.FC<{
            value: Draft;
            onChange: (patch: Partial<Draft>) => void;
            onSubmit: () => void;
            submitLabel: string;
            /** Editing an existing learner needs a way out without saving; adding one does not. */
            onCancel?: () => void;
        }> = ({
            value,
            onChange,
            onSubmit,
            submitLabel,
            onCancel,
        }) => (
        <div className="bg-gray-50 border border-brand-gray-light rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                    <label className="block text-xs font-bold mb-1">Learner name *</label>
                    <input className={field} value={value.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="e.g. Sara Haddad" />
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1">CEFR level</label>
                    <select className={field} value={value.cefr || ''} onChange={(e) => onChange({ cefr: e.target.value })}>
                        <option value="">Unknown</option>
                        {CEFR_LEVELS.map((l) => (
                            <option key={l} value={l}>{l}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1">L1 (first language)</label>
                    <input className={field} value={value.l1 || ''} onChange={(e) => onChange({ l1: e.target.value })} placeholder="Arabic" />
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1">Progress %</label>
                    <input
                        type="number"
                        min={0}
                        max={100}
                        className={field}
                        value={Number.isFinite(value.progress as number) ? (value.progress as number) : 0}
                        onChange={(e) => onChange({ progress: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                    />
                </div>
            </div>
            <p className="text-[10px] text-gray-500 -mt-1">
                L1 drives translations: a group may all share one language (the lesson can use it for support) or be a
                mix (then the lesson must not translate into any single language).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                    <label className="block text-xs font-bold mb-1">Email</label>
                    <input className={field} value={value.email || ''} onChange={(e) => onChange({ email: e.target.value })} placeholder="name@example.com" />
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1">Phone / WhatsApp</label>
                    <input className={field} value={value.phone || ''} onChange={(e) => onChange({ phone: e.target.value })} placeholder="+971 …" />
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1">Country / city</label>
                    <input className={field} value={value.country || ''} onChange={(e) => onChange({ country: e.target.value })} placeholder="Dubai" />
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold mb-1">Facts about this learner</label>
                <textarea
                    className={field}
                    rows={3}
                    value={value.facts || ''}
                    onChange={(e) => onChange({ facts: e.target.value })}
                    placeholder="Job, goals, family, what they talk about — anything a tutor can open a conversation with."
                />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                    <label className="block text-xs font-bold mb-1">Interests</label>
                    <input className={field} value={value.interests || ''} onChange={(e) => onChange({ interests: e.target.value })} placeholder="football, cooking" />
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1">Goals</label>
                    <input className={field} value={value.goals || ''} onChange={(e) => onChange({ goals: e.target.value })} placeholder="job interview, travel" />
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1">Speaks</label>
                    <select className={field} value={value.talkative || 'unknown'} onChange={(e) => onChange({ talkative: e.target.value as Draft['talkative'] })}>
                        <option value="unknown">Unknown</option>
                        <option value="high">A lot — confident</option>
                        <option value="medium">Steady</option>
                        <option value="low">Little — shy / quiet</option>
                    </select>
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold mb-1">How to use them in class</label>
                <textarea
                    className={field}
                    rows={2}
                    value={value.routing || ''}
                    onChange={(e) => onChange({ routing: e.target.value })}
                    placeholder="e.g. ask often and first; loves role-play; keep questions short"
                />
            </div>
            <div className="flex justify-end gap-2">
                {onCancel && (
                    <button type="button" onClick={onCancel} className="bg-white border border-brand-gray-light font-bold px-4 py-2 rounded-lg hover:bg-gray-100">
                        Cancel
                    </button>
                )}
                <button type="button" onClick={onSubmit} className="bg-brand-blue text-white font-bold px-4 py-2 rounded-lg hover:bg-blue-600" data-participant-submit="true">
                    {submitLabel}
                </button>
            </div>
        </div>
        );
        return Form;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <SectionCard title={isDraft ? 'Learners (roster)' : 'Class Learners'} icon={<i className="fas fa-users"></i>}>
            {/* ── Roster summary ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
                    <p className="text-2xl font-extrabold text-brand-purple">{participants.length}</p>
                    <p className="text-[11px] font-bold text-gray-500 uppercase">Learners</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                    <p className="text-sm font-extrabold text-brand-blue truncate">{stats.spread}</p>
                    <p className="text-[11px] font-bold text-gray-500 uppercase">Level spread</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                    <p className="text-2xl font-extrabold text-emerald-600">{stats.avgAttendance === null ? '—' : `${stats.avgAttendance}%`}</p>
                    <p className="text-[11px] font-bold text-gray-500 uppercase">Attendance</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                    <p className="text-2xl font-extrabold text-amber-600">{stats.quietCount}</p>
                    <p className="text-[11px] font-bold text-gray-500 uppercase">Need protection</p>
                </div>
                <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-3 text-center" title="The class's first language. One shared language means the lesson can use it for support; a mix means it must not translate into any single language.">
                    <p className="text-sm font-extrabold text-cyan-700 truncate">{stats.classL1}</p>
                    <p className="text-[11px] font-bold text-gray-500 uppercase">Class L1</p>
                </div>
            </div>

            {/* ── Roster ── */}
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1 mb-4">
                {participants.length === 0 && (
                    <p className="text-sm text-gray-500 italic bg-gray-50 rounded-lg p-4 text-center">
                        No learners yet. Add them one by one, or copy the AI prompt and paste the roster back.
                    </p>
                )}
                {participants.map((p, index) => {
                    const record = p as GroupParticipant;
                    const rate = stats.attendanceFor(p);
                    const badge = talkativeBadge[record.talkative || 'unknown'] || talkativeBadge.unknown;
                    const isEditing = isDraft ? editingId === String(index) : editingId === record.id;

                    if (isEditing && editDraft) {
                        return (
                            <ParticipantForm
                                key={`edit-${index}`}
                                value={editDraft}
                                onChange={(patch) => setEditDraft((prev) => (prev ? { ...prev, ...patch } : prev))}
                                onSubmit={handleSaveEdit}
                                submitLabel="Save"
                                onCancel={cancelEdit}
                            />
                        );
                    }

                    return (
                        <div key={record.id || `draft-${index}`} className="group border border-brand-gray-light rounded-xl p-3 hover:shadow-sm transition-shadow">
                            <div className="flex items-start gap-3">
                                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-extrabold flex items-center justify-center flex-shrink-0">
                                    {(record.name || '?').trim().charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-bold truncate">{record.name}</p>
                                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                                            {participantLevelLabel(p)}
                                        </span>
                                        {record.l1 && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 border border-cyan-200" title="First language — used for translations">
                                                L1: {record.l1}
                                            </span>
                                        )}
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.className}`}>{badge.label}</span>
                                        {rate !== null && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                                                {rate}% attended
                                            </span>
                                        )}
                                    </div>
                                    {record.facts && <p className="text-xs text-gray-600 mt-1">{record.facts}</p>}
                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-gray-500">
                                        {record.interests && <span><i className="fas fa-star text-amber-400"></i> {record.interests}</span>}
                                        {record.goals && <span><i className="fas fa-bullseye text-rose-400"></i> {record.goals}</span>}
                                    </div>
                                    {/* Contact information is the tutor's, not the AI's: it is what
                                        Compose Email and the class profile need. */}
                                    {(record.email || record.phone || record.country) && (
                                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-gray-600">
                                            {record.email && (
                                                <a href={`mailto:${record.email}`} className="hover:underline" title="Email this learner">
                                                    <i className="fas fa-envelope text-brand-blue"></i> {record.email}
                                                </a>
                                            )}
                                            {record.phone && <span><i className="fas fa-phone text-emerald-600"></i> {record.phone}</span>}
                                            {record.country && <span><i className="fas fa-location-dot text-rose-500"></i> {record.country}</span>}
                                        </div>
                                    )}
                                    {typeof record.progress === 'number' && record.progress > 0 && (
                                        <div className="mt-1.5 flex items-center gap-2" title={`Progress: ${record.progress}%`}>
                                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-brand-blue to-brand-purple" style={{ width: `${Math.max(0, Math.min(100, record.progress))}%` }} />
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-500">{record.progress}%</span>
                                        </div>
                                    )}
                                    {record.routing && (
                                        <p className="text-[11px] text-purple-700 bg-purple-50 border border-purple-100 rounded-md px-2 py-1 mt-1.5">
                                            <i className="fas fa-route"></i> {record.routing}
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingId(isDraft ? String(index) : record.id);
                                            setEditDraft({ ...(record as GroupParticipant), id: record.id || `draft-${index}` });
                                        }}
                                        className="text-brand-blue p-1"
                                        title="Edit learner"
                                    >
                                        <i className="fas fa-pen"></i>
                                    </button>
                                    <button type="button" onClick={() => handleRemove(index, p)} className="text-red-500 p-1" title="Remove from class">
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Add manually ── */}
            <div className="flex flex-wrap gap-2 mb-3">                    {/* type="button" is not optional: this manager is also rendered INSIDE the
                        "Create New Group Class" form, where an untyped button is a submit
                        button — clicking "Add participant" would create the class on the spot. */}
                    <button
                        type="button"
                        onClick={() => { setShowAddForm((v) => !v); setShowImport(false); }}
                        className="flex-1 min-w-[9rem] bg-brand-blue text-white font-bold py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors text-sm"
                    >
                    <i className="fas fa-user-plus mr-1"></i> Add learner
                </button>
                <button
                    type="button"
                    onClick={() => { setShowImport((v) => !v); setShowAddForm(false); }}
                    className="flex-1 min-w-[9rem] bg-brand-purple text-white font-bold py-2 px-3 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                    <i className="fas fa-robot mr-1"></i> Add from a transcript (AI)
                </button>
            </div>

            {showAddForm && (
                <ParticipantForm
                    value={draft}
                    onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
                    onSubmit={handleAdd}
                    submitLabel="Add to class"
                />
            )}

            {showImport && (
                <div className="border-2 border-dashed border-purple-200 bg-purple-50/40 rounded-xl p-4 space-y-3">
                    <div>
                        <h4 className="font-bold text-sm text-brand-purple">
                            <i className="fas fa-magic mr-1"></i> Build the roster from a transcript
                        </h4>
                        <p className="text-xs text-gray-600 mt-1">
                            Copy the prompt, give it to your own AI (ChatGPT, Claude, Gemini…) together with the
                            transcript or file of everyone introducing themselves, then paste its JSON answer below.
                            No accounts are created — these people live in this class only.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={copyPrompt} className="bg-brand-purple text-white font-bold px-3 py-2 rounded-lg text-sm hover:bg-purple-700">
                            <i className={`fas ${copied ? 'fa-check' : 'fa-copy'} mr-1`}></i> {copied ? 'Prompt copied!' : 'Copy AI prompt'}
                        </button>
                        <label className="bg-white border border-brand-gray-light font-bold px-3 py-2 rounded-lg text-sm cursor-pointer hover:bg-gray-50">
                            <i className="fas fa-file-import mr-1"></i> Load a file
                            <input
                                ref={fileRef}
                                type="file"
                                accept=".json,.txt,.md,.csv,.vtt,.srt"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) readFile(file);
                                    e.target.value = '';
                                }}
                            />
                        </label>
                    </div>
                    <textarea
                        className={`${field} font-mono text-xs`}
                        rows={compact ? 5 : 8}
                        value={pasteText}
                        onChange={(e) => setPasteText(e.target.value)}
                        placeholder='Paste the AI JSON here — { "participants": [ { "name": "...", "cefr": "...", "facts": "..." } ] }'
                    />
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => applyImport(pasteText, 'pasted JSON')}
                            disabled={!pasteText.trim()}
                            className="bg-brand-green text-white font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-40"
                        >
                            <i className="fas fa-upload mr-1"></i> Import learners
                        </button>
                    </div>
                </div>
            )}

            {importReport && (
                <div className={`mt-3 rounded-lg p-3 text-xs border ${importReport.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                    {importReport.lines.map((line, i) => (
                        <p key={i} className={i === 0 ? 'font-bold' : 'mt-1'}>
                            {line}
                        </p>
                    ))}
                </div>
            )}

            {!isDraft && participants.length > 0 && (
                <div className="mt-4 border-t pt-4">
                    <button
                        type="button"
                        onClick={openAttendance}
                        className="w-full text-left font-bold text-sm flex items-center justify-between"
                    >
                        <span>
                            <i className="fas fa-clipboard-check mr-1 text-emerald-600"></i> Log attendance for a session
                        </span>
                        <i className={`fas fa-chevron-${showAttendance ? 'up' : 'down'} text-gray-400`}></i>
                    </button>
                    {showAttendance &&
                        (sessions.length === 0 ? (
                            <p className="text-xs text-gray-500 mt-2">
                                No sessions logged yet — add one in the Sessions tab and it will appear here.
                            </p>
                        ) : (
                            <div className="space-y-3 mt-3">
                                <select
                                    className={field}
                                    value={attendanceSessionId}
                                    onChange={(e) => {
                                        setAttendanceSessionId(e.target.value);
                                        setPresentIds(participants.map((p) => (p as GroupParticipant).id).filter(Boolean));
                                        setAttendanceSaved(false);
                                    }}
                                >
                                    {sessions.map((s, i) => (
                                        <option key={s.id} value={s.id}>
                                            {s.date ? new Date(s.date).toLocaleDateString() : `Session ${i + 1}`}
                                            {s.topic ? ` — ${s.topic}` : ''}
                                        </option>
                                    ))}
                                </select>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {participants.map((p) => {
                                        const record = p as GroupParticipant;
                                        return (
                                            <label key={record.id} className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={presentIds.includes(record.id)}
                                                    onChange={(e) =>
                                                        setPresentIds((ids) =>
                                                            e.target.checked ? [...ids, record.id] : ids.filter((x) => x !== record.id)
                                                        )
                                                    }
                                                />
                                                <span className="font-semibold">{record.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={saveAttendance} className="bg-brand-green text-white font-bold px-4 py-2 rounded-lg text-sm">
                                        <i className="fas fa-save mr-1"></i> Save attendance
                                    </button>
                                    {attendanceSaved && <span className="text-xs text-emerald-600 font-bold">Saved — rates updated</span>}
                                </div>
                            </div>
                        ))}
                </div>
            )}

            {!isDraft && participants.length > 0 && (
                <p className="text-[11px] text-gray-400 mt-3">
                    <i className="fas fa-circle-info mr-1"></i>
                    These people feed the lesson generator directly — every lesson is built around their names, levels
                    and facts, and the AI is told who to ask what.
                </p>
            )}
        </SectionCard>
    );
};

export default GroupParticipantsManager;

/** Exported for the class profile's "who is in this class" summary and the AI bridge. */
export { buildGroupLessonFacts };
