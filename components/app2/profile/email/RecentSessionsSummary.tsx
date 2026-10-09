import React from 'react';
import { Session } from '../../../../types2';
import { format } from 'date-fns';

const RecentSessionsSummary: React.FC<{ sessions: Session[] }> = ({ sessions }) => {
    const recentSessions = [...(sessions || [])]
        .filter(s => s.attended)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3);

    if (recentSessions.length === 0) {
        return <p className="text-center text-gray-500 p-4">No recent sessions to summarize.</p>;
    }

    return (
        <div className="space-y-4">
            {recentSessions.map(session => (
                <div key={session.id} className="p-4 bg-gray-50 rounded-lg border">
                    <h3 className="font-bold text-lg">{session.lessonName || `Session on ${format(new Date(session.date), 'MMMM d, yyyy')}`}</h3>
                    <p className="text-sm text-gray-500 mb-2">{format(new Date(session.date), 'PPPP')}</p>
                    {session.aiAnalysis?.summary && (
                        <blockquote className="border-l-4 border-brand-blue pl-4 py-1 my-2 bg-white italic">
                            {session.aiAnalysis.summary}
                        </blockquote>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-sm">
                        <div>
                            <h4 className="font-semibold text-green-700 mb-1">✅ Strengths:</h4>
                            <ul className="list-disc list-inside space-y-1">
                                {(session.skillsLearned || session.aiAnalysis?.strengths || []).map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                        </div>
                         <div>
                            <h4 className="font-semibold text-red-700 mb-1">💡 Weaknesses:</h4>
                             <ul className="list-disc list-inside space-y-1">
                                {(session.needsHelp || session.aiAnalysis?.weaknesses || []).map((w, i) => <li key={i}>{w}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default RecentSessionsSummary;