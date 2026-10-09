import React, { useState } from 'react';
import { Competency, Need } from '../../../types2';
import EditableStarRating from '../EditableStarRating';
import { createNeed, createSkill, syncCompetenciesFromNeeds } from '../../../utils/needsCompetencies';

/**
 * Needs → Competencies editor.
 *
 * The same structure the "add a new learner" flow asks for: a learner has NEEDS
 * ("Confidence at work"), and each need carries its own COMPETENCIES ("Small talk
 * with colleagues", "Disagreeing politely"), each with its own progress.
 *
 * It lives in one component because the profile needs it in two places — the
 * learner's "Competency Overview" (edit mode) and a group's "Group Needs &
 * Expectations" — and those two screens drifting apart is what made them
 * inconsistent in the first place.
 *
 * `onChange` hands back BOTH lists: the competencies are derived from the needs
 * (see syncCompetenciesFromNeeds), so callers cannot forget to update one.
 */
interface NeedsCompetencyEditorProps {
    needs: Need[];
    /** Existing competencies — carried through so nothing is lost on re-sync. */
    competencies?: Competency[];
    onChange: (needs: Need[], competencies: Competency[]) => void;
    /** Label for the empty state, e.g. "learner" or "class". */
    subject?: string;
    /** Hide the star rating column (used where the profile does not rate needs). */
    showRating?: boolean;
}

const inputClass =
    'w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple/30 focus:border-brand-purple';

const NeedsCompetencyEditor: React.FC<NeedsCompetencyEditorProps> = ({
    needs,
    competencies,
    onChange,
    subject = 'learner',
    showRating = true,
}) => {
    /** Uncommitted competency input, per need. */
    const [drafts, setDrafts] = useState<Record<string, { name: string; progress: number }>>({});

    const commit = (nextNeeds: Need[]) => {
        onChange(nextNeeds, syncCompetenciesFromNeeds(nextNeeds, needs, competencies));
    };

    const addNeed = () => commit([...(needs || []), createNeed()]);

    const removeNeed = (id: string) =>
        commit((needs || []).filter((n) => n.id !== id));

    const patchNeed = (id: string, patch: Partial<Need>) =>
        commit((needs || []).map((n) => (n.id === id ? { ...n, ...patch } : n)));

    const addSkill = (need: Need) => {
        const draft = drafts[need.id];
        const name = (draft?.name || '').trim();
        if (!name) return;
        const progress = Math.max(0, Math.min(100, Number(draft?.progress) || 0));
        const alreadyThere = (need.learningPath || []).some(
            (s: any) => String(s?.name || '').trim().toLowerCase() === name.toLowerCase(),
        );
        if (!alreadyThere) {
            patchNeed(need.id, { learningPath: [...(need.learningPath || []), createSkill(name, progress)] });
        }
        setDrafts((prev) => ({ ...prev, [need.id]: { name: '', progress: 0 } }));
    };

    const removeSkill = (need: Need, skillId: string, skillName: string) =>
        patchNeed(need.id, {
            learningPath: (need.learningPath || []).filter(
                (s: any) =>
                    s.id !== skillId &&
                    String(s?.name || '').trim().toLowerCase() !== skillName.trim().toLowerCase(),
            ),
        });

    const patchSkill = (need: Need, skillId: string, patch: { name?: string; progress?: number }) =>
        patchNeed(need.id, {
            learningPath: (need.learningPath || []).map((s: any) => (s.id === skillId ? { ...s, ...patch } : s)),
        });

    const setDraft = (needId: string, field: 'name' | 'progress', value: string | number) =>
        setDrafts((prev) => ({
            ...prev,
            [needId]: { name: '', progress: 0, ...(prev[needId] || {}), [field]: value },
        }));

    return (
        <div className="space-y-3">
            {(needs || []).length === 0 && (
                <p className="text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-300 rounded-xl px-3 py-3">
                    No needs yet. Add the {subject}'s first need — for example <em>“Confidence at work”</em> — then
                    add the competencies that prove it.
                </p>
            )}

            {(needs || []).map((need) => {
                const skills: any[] = need.learningPath || [];
                const draft = drafts[need.id] || { name: '', progress: 0 };
                return (
                    <div key={need.id} className="bg-slate-50/80 border border-slate-200 rounded-xl p-3">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={need.name}
                                onChange={(e) => patchNeed(need.id, { name: e.target.value })}
                                placeholder="Need — e.g. Confidence at work"
                                className={`${inputClass} font-semibold`}
                            />
                            {showRating && (
                                <EditableStarRating
                                    rating={need.rating}
                                    onRatingChange={(r) => patchNeed(need.id, { rating: r })}
                                />
                            )}
                            <button
                                type="button"
                                onClick={() => removeNeed(need.id)}
                                title="Remove this need and its competencies"
                                className="shrink-0 w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 text-xl leading-none font-bold"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="mt-2 pl-1">
                            <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                Competencies for this need
                            </div>

                            {skills.length === 0 && (
                                <p className="text-[11px] text-slate-400 mb-1">
                                    None yet — type one below and press Enter.
                                </p>
                            )}

                            <div className="space-y-1.5">
                                {skills.map((skill) => (
                                    <div
                                        key={skill.id}
                                        className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5"
                                    >
                                        <input
                                            type="text"
                                            value={skill.name}
                                            onChange={(e) => patchSkill(need, skill.id, { name: e.target.value })}
                                            className="flex-1 min-w-0 text-sm bg-transparent outline-none"
                                        />
                                        <div className="flex items-center gap-1 shrink-0">
                                            <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={typeof skill.progress === 'number' ? skill.progress : 0}
                                                onChange={(e) =>
                                                    patchSkill(need, skill.id, {
                                                        progress: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)),
                                                    })
                                                }
                                                className="w-14 text-xs text-right bg-slate-50 border border-slate-300 rounded px-1.5 py-1"
                                            />
                                            <span className="text-xs text-slate-500">%</span>
                                            <button
                                                type="button"
                                                onClick={() => removeSkill(need, skill.id, skill.name)}
                                                title="Remove competency"
                                                className="w-6 h-6 rounded text-red-500 hover:bg-red-50 text-base leading-none font-bold"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Add-another row: Enter or the + button commits it. */}
                            <div
                                className="flex items-center gap-2 mt-2"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addSkill(need);
                                    }
                                }}
                            >
                                <input
                                    type="text"
                                    value={draft.name}
                                    onChange={(e) => setDraft(need.id, 'name', e.target.value)}
                                    placeholder="Add competency — e.g. Small talk with colleagues"
                                    className={inputClass}
                                />
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={draft.progress}
                                    onChange={(e) => setDraft(need.id, 'progress', parseInt(e.target.value) || 0)}
                                    className={`${inputClass} w-20 text-right`}
                                />
                                <button
                                    type="button"
                                    onClick={() => addSkill(need)}
                                    className="shrink-0 px-3 py-2 rounded-lg bg-brand-blue text-white text-sm font-black hover:bg-blue-600 transition-colors"
                                    title="Add this competency"
                                >
                                    + Add
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}

            <button
                type="button"
                onClick={addNeed}
                className="text-sm font-bold text-brand-blue hover:underline inline-flex items-center gap-1.5"
            >
                <i className="fas fa-plus"></i> Add Need
            </button>
        </div>
    );
};

export default NeedsCompetencyEditor;
