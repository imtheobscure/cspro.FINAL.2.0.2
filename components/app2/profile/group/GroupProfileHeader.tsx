import React, { useMemo, useState } from 'react';
import { CourseLevel, GroupClass, GroupParticipant } from '../../../../types2';
import Modal from '../../Modal';
import { buildGroupProfileFacts, groupL1Label, participantLevelLabel } from '../../../../services/groupParticipants';

/**
 * The class profile header.
 *
 * A group class gets the same action set as an individual profile — Report, Update Profile,
 * Copy Profile Facts, Compose Email, Subscribe — because a tutor doing the same job for eight
 * people should not have fewer tools than for one. Three of them are genuinely different for
 * a group:
 *
 *   · Update Profile edits the CLASS (its level, schedule, name), not one person;
 *   · Copy Profile Facts copies the whole class — the class facts plus every learner with
 *     their level, L1, facts, routing and contact details;
 *   · Compose Email writes to every learner whose email is on the roster, in one go, which
 *     is why the roster records contact information at all.
 */
interface GroupProfileHeaderProps {
    group: GroupClass;
    /** The class roster (`participantsData`) — people, not learner accounts. */
    roster: GroupParticipant[];
    onUpdate: (updatedGroup: GroupClass) => void;
    onGenerateReport: () => void;
}

const GroupProfileHeader: React.FC<GroupProfileHeaderProps> = ({ group, roster, onUpdate, onGenerateReport }) => {
    const [isEditingName, setIsEditingName] = useState(false);
    const [name, setName] = useState(group.name);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);
    const [isEmailOpen, setIsEmailOpen] = useState(false);
    const [copiedFacts, setCopiedFacts] = useState(false);
    const [manualCopy, setManualCopy] = useState('');
    const [emails, setEmails] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [copyNote, setCopyNote] = useState('');

    // One labelled value for both the header line and the tooltip, so "the class shares
    // Arabic" is never claimed from a single learner's form entry.
    const classL1 = useMemo(() => groupL1Label(roster), [roster]);
    const withEmail = useMemo(() => roster.filter((p) => (p.email || '').trim()), [roster]);

    const handleSaveName = () => {
        if (name.trim()) {
            onUpdate({ ...group, name: name.trim() });
            setIsEditingName(false);
        }
    };

    const writeClipboard = async (text: string, onDone: () => void) => {
        try {
            await navigator.clipboard.writeText(text);
            onDone();
        } catch {
            // Clipboard access can be refused (an embedded frame, an insecure origin). Never
            // leave the tutor with nothing: show the text so it can be selected and copied.
            setManualCopy(text);
        }
    };

    const handleCopyProfileFacts = () =>
        writeClipboard(buildGroupProfileFacts(group, roster), () => {
            setCopiedFacts(true);
            setTimeout(() => setCopiedFacts(false), 2500);
        });

    const openCompose = () => {
        setEmails(withEmail.map((p) => p.email).join(', '));
        setSubject(`${group.name} — next session`);
        setBody(
            [
                `Hello everyone,`,
                ``,
                `A quick note for our next ${group.name} session.`,
                ``,
                `Please bring: something you want to talk about in English this week.`,
                ``,
                `See you there.`,
            ].join('\n')
        );
        setCopyNote('');
        setIsEmailOpen(true);
    };

    return (
        <header className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative h-32 w-32 flex items-center justify-center">
                {roster.length > 0 ? (
                    roster.slice(0, 3).map((p, index) => (
                        <div
                            key={p.id}
                            title={p.name}
                            className="w-20 h-20 rounded-full border-4 border-white shadow-lg absolute flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-2xl font-extrabold"
                            style={{
                                zIndex: 3 - index,
                                transform: `translateX(${(index - 1) * 30}px) rotate(${(index - 1) * 5}deg)`,
                            }}
                        >
                            {p.name.trim().charAt(0).toUpperCase()}
                        </div>
                    ))
                ) : (
                    <div className="w-32 h-32 rounded-full border-8 border-white shadow-lg flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-4xl font-extrabold">
                        {group.name.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-4 flex-wrap">
                    {isEditingName ? (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="text-5xl font-extrabold p-2 border-b-2"
                                autoFocus
                            />
                            <button type="button" onClick={handleSaveName} className="bg-green-500 text-white rounded-lg px-3">✓</button>
                        </div>
                    ) : (
                        <h1 className="text-5xl font-extrabold">{group.name}</h1>
                    )}
                    <button type="button" onClick={() => setIsEditingName(!isEditingName)} title="Edit Group Name" className="text-gray-400 hover:text-brand-blue transition-colors">
                        <i className="fas fa-pencil-alt"></i>
                    </button>
                </div>

                <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap mt-2 text-sm text-brand-gray-dark">
                    <span className="font-semibold">
                        {roster.length} Learner{roster.length === 1 ? '' : 's'}
                    </span>
                    <span className="font-semibold">
                        Class level: <strong>{group.level || 'not set'}</strong>
                    </span>
                    {classL1 !== 'Not set' && (
                        <span className="font-semibold" title="First language for translations — a class counts as sharing one only when every learner is recorded">
                            L1: <strong>{classL1}</strong>
                        </span>
                    )}
                    {roster.length > 0 && (
                        <span className="text-gray-500">
                            <i className="fas fa-envelope"></i> {withEmail.length}/{roster.length} have an email
                        </span>
                    )}
                </div>

                <div className="flex items-center justify-center sm:justify-start gap-2 mt-4 flex-wrap">
                    <button type="button" onClick={onGenerateReport} className="bg-brand-purple text-white font-bold py-2 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all">
                        Report
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsUpdateOpen(true)}
                        className="bg-brand-green text-white font-bold py-2 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                        title="Edit this class profile: name, CEFR level and schedule"
                    >
                        Update Profile
                    </button>
                    <button
                        type="button"
                        onClick={handleCopyProfileFacts}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center gap-2"
                        title="Copy the class facts AND every learner (level, L1, facts, how to use them, contact) to the clipboard"
                    >
                        <i className={`fas ${copiedFacts ? 'fa-check-circle text-emerald-200' : 'fa-clipboard'}`}></i>
                        {copiedFacts ? 'Copied Profile Facts!' : 'Copy Profile Facts'}
                    </button>
                    <button
                        type="button"
                        onClick={openCompose}
                        className="bg-brand-blue text-white font-bold py-2 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center gap-2"
                    >
                        <i className="fas fa-paper-plane"></i> Compose Email
                    </button>
                    {/* The same Subscribe control an individual profile has. The class is the
                        subscriber — there are no learner accounts to subscribe individually. */}
                    <button
                        type="button"
                        onClick={() => onUpdate({ ...group, isSubscribed: !group.isSubscribed })}
                        aria-pressed={!!group.isSubscribed}
                        className={`font-bold py-2 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center gap-2 border ${group.isSubscribed
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'bg-white border-slate-200 text-slate-600'}`}
                        title={group.isSubscribed ? 'Subscribed — click to unsubscribe this class' : 'Subscribe this class'}
                    >
                        <i className={`fas ${group.isSubscribed ? 'fa-bell' : 'fa-bell-slash'}`}></i>
                        {group.isSubscribed ? 'Subscribed' : 'Subscribe'}
                    </button>
                </div>
            </div>

            {/* ── Update class profile ── */}
            <Modal isOpen={isUpdateOpen} onClose={() => setIsUpdateOpen(false)} title={`Update Profile: ${group.name}`}>
                <div className="space-y-4">
                    <div>
                        <label className="font-bold text-sm mb-1 block">Class name</label>
                        <input
                            className="w-full p-3 bg-white border border-brand-gray-light rounded-lg focus:ring-2 focus:ring-brand-blue"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="font-bold text-sm mb-1 block">Class level (CEFR)</label>
                            <select
                                className="w-full p-3 bg-white border border-brand-gray-light rounded-lg focus:ring-2 focus:ring-brand-blue"
                                value={group.level || CourseLevel.B1}
                                onChange={(e) => onUpdate({ ...group, level: e.target.value as CourseLevel })}
                            >
                                {Object.values(CourseLevel).map((l) => (
                                    <option key={l} value={l}>{l}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="font-bold text-sm mb-1 block">Schedule</label>
                            <input
                                className="w-full p-3 bg-white border bg-white border-brand-gray-light rounded-lg focus:ring-2 focus:ring-brand-blue"
                                value={group.schedule || ''}
                                onChange={(e) => onUpdate({ ...group, schedule: e.target.value })}
                                placeholder="e.g. Tue & Thu 19:00"
                            />
                        </div>
                    </div>
                    <div className="bg-gray-50 border border-brand-gray-light rounded-lg p-3 text-xs text-gray-600">
                        Learners are edited in <strong>Class Learners</strong> on the Profile tab — add them by hand, or
                        copy the AI prompt and paste a roster back from a transcript.
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setIsUpdateOpen(false)} className="bg-gray-200 font-bold px-4 py-2 rounded-lg">Cancel</button>
                        <button
                            type="button"
                            onClick={() => {
                                if (name.trim()) onUpdate({ ...group, name: name.trim() });
                                setIsUpdateOpen(false);
                                setCopiedFacts(false);
                            }}
                            className="bg-brand-green text-white font-bold px-4 py-2 rounded-lg"
                        >
                            Save class profile
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ── Compose email to the whole class ── */}
            <Modal isOpen={isEmailOpen} onClose={() => setIsEmailOpen(false)} title={`Compose Email — ${group.name}`}>
                <div className="space-y-4">
                    {roster.length === 0 ? (
                        <p className="text-sm text-gray-600">No learners on this class yet.</p>
                    ) : withEmail.length === 0 ? (
                        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                            None of the {roster.length} learners has an email address yet. Add one in
                            <strong> Class Learners</strong> (the roster records each learner&apos;s contact details) and this
                            button will fill them in automatically.
                        </p>
                    ) : null}

                    <div>
                        <label className="font-bold text-sm mb-1 block">To ({withEmail.length} learner{withEmail.length === 1 ? '' : 's'})</label>
                        <input
                            className="w-full p-3 bg-white border border-brand-gray-light rounded-lg focus:ring-2 focus:ring-brand-blue text-sm"
                            value={emails}
                            onChange={(e) => setEmails(e.target.value)}
                            placeholder="one@example.com, two@example.com"
                        />
                    </div>
                    <div>
                        <label className="font-bold text-sm mb-1 block">Subject</label>
                        <input
                            className="w-full p-3 bg-white border border-brand-gray-light rounded-lg focus:ring-2 focus:ring-brand-blue text-sm"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="font-bold text-sm mb-1 block">Message</label>
                        <textarea
                            className="w-full p-3 bg-white border border-brand-gray-light rounded-lg focus:ring-2 focus:ring-brand-blue text-sm"
                            rows={8}
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <a
                            href={`mailto:${encodeURIComponent(emails)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
                            className="bg-brand-blue text-white font-bold px-4 py-2 rounded-lg text-sm"
                        >
                            <i className="fas fa-envelope-open-text mr-1"></i> Open in mail app
                        </a>
                        <button
                            type="button"
                            onClick={() => writeClipboard(emails, () => { setCopyNote('Recipients copied'); setTimeout(() => setCopyNote(''), 2000); })}
                            className="bg-white border border-brand-gray-light font-bold px-4 py-2 rounded-lg text-sm"
                        >
                            Copy recipients
                        </button>
                        <button
                            type="button"
                            onClick={() => writeClipboard(`${subject}\n\n${body}`, () => { setCopyNote('Message copied'); setTimeout(() => setCopyNote(''), 2000); })}
                            className="bg-white border border-brand-gray-light font-bold px-4 py-2 rounded-lg text-sm"
                        >
                            Copy message
                        </button>
                        {copyNote && <span className="text-xs font-bold text-emerald-600">{copyNote}</span>}
                    </div>
                    <div className="flex flex-wrap gap-3 text-[11px] text-gray-600 border-t pt-3">
                        {roster.map((p) => (
                            <span key={p.id} className="flex items-center gap-1">
                                <i className="fas fa-user text-purple-400"></i>
                                <strong>{p.name}</strong>
                                {p.email ? <span className="text-gray-500">· {p.email}</span> : <span className="text-amber-600">· no email</span>}
                                {p.cefr && p.cefr !== 'unknown' ? <span className="text-gray-400">({p.cefr})</span> : null}
                            </span>
                        ))}
                    </div>
                </div>
            </Modal>

            {/* Clipboard refused — the facts have to be reachable anyway. */}
            <Modal isOpen={!!manualCopy} onClose={() => setManualCopy('')} title="Copy the class profile facts">
                <textarea
                    className="w-full p-3 border border-brand-gray-light rounded-lg font-mono text-xs"
                    rows={16}
                    readOnly
                    value={manualCopy}
                    onFocus={(e) => e.currentTarget.select()}
                />
                <p className="text-xs text-gray-500 mt-2">Select all and copy — the clipboard was blocked by the browser.</p>
            </Modal>
        </header>
    );
};

export default GroupProfileHeader;

/** Kept for the class contact list so the level label stays consistent across the app. */
export { participantLevelLabel };
