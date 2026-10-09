import React, { useEffect, useState } from 'react';
import { GroupClass, GroupParticipant } from '../../../../types2';
import { groupL1Summary, participantLevelLabel, suggestGroupRoutingPlan } from '../../../../services/groupParticipants';

/**
 * "Group Plan (Step 2)" — the first tab of a group class's lesson workspace.
 *
 * It sits ahead of Lesson Creator and Gallery because it decides something both of them
 * depend on: WHO gets asked what. A one-to-one lesson never needs this; a room of eight
 * always does, and getting it wrong is how the quiet learner is lost and the loud one
 * answers everything.
 *
 * What is typed here is stored on the class (`GroupClass.groupRouting`) and injected into
 * every lesson prompt as a hard override by `groupClassPromptBlock`, so it applies to the
 * Lesson Creator, the Gallery formats and the copied prompt alike. "Draft from roster"
 * writes a first version from the learners' own levels, L1s and personalities.
 */
interface GroupLessonBriefProps {
    group: GroupClass;
    roster: GroupParticipant[];
    onUpdate: (updated: GroupClass) => void;
}

/** What this learner should be given, from their level and how much they speak. */
function suggestedRole(p: GroupParticipant): string {
    const level = participantLevelLabel(p);
    if (p.talkative === 'low') {
        return 'Closed or choice questions, reading and writing roles, pair work — never asked first.';
    }
    if (p.talkative === 'high') {
        return 'Model answers and demonstrations, then hand the next item to somebody else by name.';
    }
    if (level.startsWith('A')) return 'Supported questions with a model answer shown first.';
    if (level === 'B1' || level === 'B2') return 'Open questions, opinions and short explanation tasks.';
    return 'Debate, abstract questions and reformulation tasks.';
}

/**
 * The four decisions this plan actually makes, as one-click lines.
 *
 * The box is free text because that is what the tutor asked for — but a blank box is
 * hostile at 8pm before a lesson. These add the line and leave the cursor at the end of
 * it, so writing the plan is mostly naming people.
 */
const QUICK_LINES: { label: string; icon: string; line: string }[] = [
    { label: 'Ask MORE', icon: 'fa-arrow-up', line: 'Ask MORE questions of: ' },
    { label: 'Ask LESS / protect', icon: 'fa-shield-halved', line: 'Ask LESS of, and never put on the spot: ' },
    { label: 'These parts with these learners ONLY', icon: 'fa-user-lock', line: 'Use these parts with these learners ONLY: ' },
    { label: 'Pair these two together', icon: 'fa-people-arrows', line: 'Pair together: ' },
];

const GroupLessonBrief: React.FC<GroupLessonBriefProps> = ({ group, roster, onUpdate }) => {
    const [plan, setPlan] = useState(group.groupRouting || '');
    const l1 = groupL1Summary(roster);
    const [saved, setSaved] = useState(false);
    const [copyNote, setCopyNote] = useState('');

    // The plan belongs to the class, so follow it if the class changes underneath us.
    useEffect(() => {
        setPlan(group.groupRouting || '');
    }, [group.id, group.groupRouting]);

    const save = () => {
        onUpdate({ ...group, groupRouting: plan });
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const copyPlan = async () => {
        const text = [
            `GROUP PLAN — ${group.name}`,
            '',
            'LEARNERS',
            ...roster.map((p) => `- ${p.name} (${participantLevelLabel(p)}${p.l1 ? `, L1 ${p.l1}` : ''}): ${suggestedRole(p)}`),
            '',
            'MANDATORY QUESTIONING PLAN',
            plan.trim() || '(not written yet)',
        ].join('\n');
        try {
            await navigator.clipboard.writeText(text);
            setCopyNote('Plan copied');
        } catch {
            setCopyNote('Clipboard blocked — select the text and copy manually');
        }
        setTimeout(() => setCopyNote(''), 2500);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2">
                    <label className="block text-xs font-bold mb-1">
                        Who to ask more, who to leave alone, and which parts belong to which learners
                    </label>
                    <textarea
                        value={plan}
                        onChange={(e) => setPlan(e.target.value)}
                        rows={12}
                        className="w-full p-3 bg-white border border-brand-gray-light rounded-lg focus:ring-2 focus:ring-brand-purple text-sm font-mono"
                        placeholder={
                            'e.g.\n• Ask MORE of: Sara (B2) — 4-5 open questions, role-play\n• Ask LESS of: Yuki (A2) — closed questions only, never first\n• Use listening drills with Omar only'
                        }
                    />
                    {/* Insert a decision instead of typing structure into a blank box. */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {QUICK_LINES.map((q) => (
                            <button
                                key={q.label}
                                type="button"
                                onClick={() => setPlan((current) => `${current.replace(/\s*$/, '')}${current.trim() ? '\n' : ''}• ${q.line}`)}
                                className="bg-gray-50 border border-brand-gray-light text-gray-600 font-semibold px-2.5 py-1 rounded-full text-[11px] hover:bg-white hover:text-brand-purple"
                                title={`Insert: ${q.line}`}
                            >
                                <i className={`fas ${q.icon} mr-1`}></i> {q.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                        <button
                            type="button"
                            onClick={() => setPlan(suggestGroupRoutingPlan(roster))}
                            className="bg-white border border-brand-gray-light font-bold px-3 py-2 rounded-lg text-xs hover:bg-gray-50"
                            title="Write a first draft from the learners' levels, L1s and personalities"
                        >
                            <i className="fas fa-magic mr-1"></i> Draft from roster
                        </button>
                        <button
                            type="button"
                            onClick={copyPlan}
                            className="bg-white border border-brand-gray-light font-bold px-3 py-2 rounded-lg text-xs hover:bg-gray-50"
                        >
                            <i className="fas fa-clipboard mr-1"></i> Copy plan
                        </button>
                        <button
                            type="button"
                            onClick={() => { setPlan(''); onUpdate({ ...group, groupRouting: '' }); }}
                            className="bg-white border border-brand-gray-light font-bold px-3 py-2 rounded-lg text-xs hover:bg-gray-50"
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            onClick={save}
                            className="bg-brand-purple text-white font-bold px-4 py-2 rounded-lg text-xs hover:bg-purple-700"
                        >
                            <i className="fas fa-save mr-1"></i> Save plan
                        </button>
                        {saved && <span className="text-xs font-bold text-emerald-600 self-center">Saved — every new lesson will follow it</span>}
                        {copyNote && <span className="text-xs font-bold text-gray-500 self-center">{copyNote}</span>}
                    </div>
                </div>

                <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-4 text-xs text-gray-700 space-y-2">
                    <p className="font-bold text-brand-purple">
                        <i className="fas fa-info-circle mr-1"></i> How this is used
                    </p>
                    <p>
                        This plan is part of <strong>every</strong> lesson prompt for this class — Lesson Creator, the
                        Gallery formats and the prompt you copy out — as a mandatory instruction that overrides the AI&apos;s
                        own idea of who to ask.
                    </p>
                    <p>
                        <strong>{roster.length}</strong> learner{roster.length === 1 ? '' : 's'} on the class.
                        {roster.length === 0 ? ' Add them in the Profile tab — the plan works far better with names.' : ''}
                    </p>
                    {/* Translation strategy, decided by the roster's L1s and stated in every prompt. */}
                    <div className="border-t border-purple-100 pt-2">
                        <p className="font-bold text-brand-purple">
                            <i className="fas fa-language mr-1"></i> Translation in this class
                        </p>
                        {l1.shared ? (
                            <p>
                                Everyone here shares <strong>{l1.shared}</strong>, so the lesson may use {l1.shared} for
                                short glosses and error explanations — the lesson itself stays in English.
                            </p>
                        ) : l1.languages.length > 1 ? (
                            <p>
                                First languages are <strong>mixed</strong> ({l1.languages.join(', ')}), so no single
                                language may be used for translation. Each learner&apos;s own L1 is listed below.
                            </p>
                        ) : l1.recorded > 0 ? (
                            <p className="text-amber-700">
                                Only <strong>{l1.recorded} of {l1.total}</strong> learners have an L1 recorded
                                ({l1.languages.join(', ')}), so the lesson will not translate as a whole. Add the rest on
                                the Profile tab — a class is only treated as sharing a language once everyone is recorded.
                            </p>
                        ) : (
                            <p className="text-gray-500">
                                No learner&apos;s L1 recorded yet, so the lesson will not translate by default. Add each
                                learner&apos;s L1 in the Profile tab.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Who should answer what — the roster read back as teaching decisions. */}
            {roster.length > 0 && (
                <div className="border border-brand-gray-light rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-gray-600">
                        Who answers what — a starting point, edit it above
                    </div>
                    <div className="divide-y divide-gray-100">
                        {roster.map((p) => (
                            <div key={p.id} className="px-4 py-2.5 flex flex-wrap items-baseline gap-x-3 text-sm">
                                <span className="font-bold min-w-[9rem]">{p.name}</span>
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                                    {participantLevelLabel(p)}
                                </span>
                                {p.l1 && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 border border-cyan-200">
                                        L1: {p.l1}
                                    </span>
                                )}
                                {p.talkative === 'low' && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                        protect
                                    </span>
                                )}
                                {p.talkative === 'high' && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                                        ask more
                                    </span>
                                )}
                                <span className="text-gray-600 text-xs">{suggestedRole(p)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupLessonBrief;
