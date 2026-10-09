import React, { useMemo } from 'react';
import { GroupClass, GroupParticipant } from '../../../../types2';
import ProgressBar from '../../ProgressBar';
import { groupL1Label, participantLevelLabel } from '../../../../services/groupParticipants';

/**
 * The class report.
 *
 * It used to read the linked learner accounts, which a group class no longer has — so a
 * class taught from a roster produced an empty report. It now reports on the ROSTER: who is
 * in the class, their levels and L1s, attendance per learner and the mandatory questioning
 * plan, which is the thing a tutor actually revisits between sessions.
 *
 * Attendance is per learner (`GroupParticipant.attendance`), so the class figure is the
 * average of the people in the room, not just "was the session held".
 */
interface GroupReportProps {
    group: GroupClass;
    roster: GroupParticipant[];
}

const StatCard: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
    <div className={`p-4 rounded-lg text-white ${color}`}>
        <p className="text-sm font-bold">{label}</p>
        <p className="text-3xl font-extrabold">{value}</p>
    </div>
);

const GroupReport: React.FC<GroupReportProps> = ({ group, roster }) => {
    const data = useMemo(() => {
        const sessions = group.sessions || [];
        const totalSessions = sessions.length;

        const attendanceFor = (p: GroupParticipant) => {
            const records = p.attendance || [];
            if (records.length === 0) return null;
            return Math.round((records.filter((a) => a.present).length / records.length) * 100);
        };

        const perLearner = roster.map((p) => ({
            participant: p,
            attendance: attendanceFor(p),
            level: participantLevelLabel(p),
        }));

        const withAttendance = perLearner.filter((row) => row.attendance !== null) as Array<{ participant: GroupParticipant; attendance: number; level: string }>;
        const overallAttendance = withAttendance.length
            ? Math.round(withAttendance.reduce((sum, row) => sum + row.attendance, 0) / withAttendance.length)
            : 0;

        const levelCounts = new Map<string, number>();
        perLearner.forEach((row) => levelCounts.set(row.level, (levelCounts.get(row.level) || 0) + 1));
        const levelSpread = [...levelCounts.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([level, count]) => `${level}×${count}`)
            .join(' · ');

        const quiet = roster.filter((p) => p.talkative === 'low');
        const studyMinutes = sessions.reduce((sum, s: any) => sum + (s.duration || 0), 0);

        return {
            totalSessions,
            overallAttendance,
            levelSpread: levelSpread || '—',
            // "Arabic" only when the whole class is recorded and agrees; otherwise the label
            // says so ("Mixed (3)", "Arabic (1/3)") instead of over-claiming.
            classL1: groupL1Label(roster),
            quiet,
            studyHours: Math.round((studyMinutes / 60) * 10) / 10,
            perLearner,
        };
    }, [group, roster]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Learners" value={String(roster.length)} color="bg-brand-purple" />
                <StatCard label="Sessions logged" value={String(data.totalSessions)} color="bg-brand-blue" />
                <StatCard
                    label="Attendance"
                    value={data.perLearner.some((r) => r.attendance !== null) ? `${data.overallAttendance}%` : '—'}
                    color="bg-brand-green"
                />
                <StatCard label="Hours taught" value={String(data.studyHours)} color="bg-amber-500" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="bg-gray-50 border border-brand-gray-light rounded-lg p-3">
                    <p className="text-[11px] font-bold uppercase text-gray-500">Level spread</p>
                    <p className="font-bold">{data.levelSpread}</p>
                </div>
                <div className="bg-gray-50 border border-brand-gray-light rounded-lg p-3">
                    <p className="text-[11px] font-bold uppercase text-gray-500">Class L1 for translations</p>
                    <p className="font-bold">{data.classL1}</p>
                </div>
                <div className="bg-gray-50 border border-brand-gray-light rounded-lg p-3">
                    <p className="text-[11px] font-bold uppercase text-gray-500">Need protection</p>
                    <p className="font-bold">
                        {data.quiet.length ? `${data.quiet.length} — ${data.quiet.map((p) => p.name).join(', ')}` : 'none flagged'}
                    </p>
                </div>
            </div>

            <div>
                <h4 className="font-bold text-sm mb-2">Per learner</h4>
                {roster.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                        No learners on this class yet — add them on the Profile tab, or import a roster from a transcript.
                    </p>
                ) : (
                    <div className="divide-y divide-gray-100 border border-brand-gray-light rounded-lg overflow-hidden">
                        {data.perLearner.map(({ participant: p, attendance, level }) => (
                            <div key={p.id} className="p-3 space-y-1.5">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <span className="font-bold">{p.name}</span>
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                                        {level}
                                    </span>
                                    {p.l1 && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 border border-cyan-200">
                                            L1: {p.l1}
                                        </span>
                                    )}
                                    {attendance !== null && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                                            {attendance}% attended
                                        </span>
                                    )}
                                    {p.talkative === 'low' && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                            protect
                                        </span>
                                    )}
                                </div>
                                {p.progress !== undefined && p.progress > 0 && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-gray-500 w-16">Progress</span>
                                        <div className="flex-1 max-w-xs">
                                            <ProgressBar progress={p.progress} />
                                        </div>
                                        <span className="text-[11px] font-bold text-gray-600">{p.progress}%</span>
                                    </div>
                                )}
                                {p.facts && <p className="text-xs text-gray-600">{p.facts}</p>}
                                {(p.email || p.phone || p.country) && (
                                    <p className="text-[11px] text-gray-500">
                                        <i className="fas fa-address-card text-brand-blue"></i>{' '}
                                        {[p.email, p.phone, p.country].filter(Boolean).join(' · ')}
                                    </p>
                                )}
                                {p.routing && (
                                    <p className="text-[11px] text-purple-700 bg-purple-50 border border-purple-100 rounded-md px-2 py-1">
                                        <i className="fas fa-route"></i> {p.routing}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {group.groupRouting && group.groupRouting.trim() && (
                <div>
                    <h4 className="font-bold text-sm mb-2">Mandatory questioning plan (Step 2)</h4>
                    <pre className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-xs whitespace-pre-wrap font-mono text-gray-700">
                        {group.groupRouting.trim()}
                    </pre>
                </div>
            )}

            {group.rosterSource && (
                <p className="text-[11px] text-gray-500">
                    Roster source: <strong>{group.rosterSource}</strong>
                </p>
            )}
        </div>
    );
};

export default GroupReport;
