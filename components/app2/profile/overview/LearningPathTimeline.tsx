import React from 'react';
import { Session, LessonSectionFocus } from '../../../../types2';
import { format, getWeekOfMonth } from 'date-fns';

interface LearningPathTimelineProps {
    sessions: Session[];
    isForScreenshot?: boolean;
}

const LearningPathTimeline: React.FC<LearningPathTimelineProps> = ({ sessions, isForScreenshot = false }) => {
    const completedSessions = sessions
        .filter(s => s.attended)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (completedSessions.length === 0) {
        return <p className="text-center text-gray-500 p-4">No completed sessions to display. Log a session to build the learning path.</p>;
    }

    const sessionsToDisplay = isForScreenshot ? completedSessions.slice(0, 10) : completedSessions;

    const groupedSessions = sessionsToDisplay.reduce((acc, session) => {
        const date = new Date(session.date);
        const monthKey = format(date, 'MMMM yyyy');
        const weekOfMonth = getWeekOfMonth(date, { weekStartsOn: 1 });
        const weekKey = `Week ${weekOfMonth}`;

        if (!acc[monthKey]) {
            acc[monthKey] = {};
        }
        if (!acc[monthKey][weekKey]) {
            acc[monthKey][weekKey] = [];
        }
        acc[monthKey][weekKey].push(session);
        return acc;
    }, {} as Record<string, Record<string, Session[]>>);

    return (
        <div className="relative pl-8">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            {Object.entries(groupedSessions).map(([monthKey, weeks]) => (
                <div key={monthKey} className="mb-8">
                    <h3 className="text-xl font-bold text-brand-purple sticky top-20 bg-background-light py-2 z-10 -ml-8 pl-8">{monthKey}</h3>
                    {Object.entries(weeks).map(([weekKey, sessionsInWeek]) => (
                        <div key={weekKey} className="mb-4 pl-4 relative">
                            <div className="absolute -left-5 top-2.5 w-3 h-3 bg-gray-300 rounded-full border-2 border-white"></div>
                            <h4 className="font-semibold text-brand-gray-dark mb-2">{weekKey}</h4>
                            {sessionsInWeek.map((session) => {
                                 const sessionNumber = completedSessions.length - completedSessions.findIndex(s => s.id === session.id);
                                 
                                 // Extract concise section breakdown & points
                                 const sections: LessonSectionFocus[] = session.sectionFocus && session.sectionFocus.length > 0
                                     ? session.sectionFocus
                                     : [];
                                 
                                 const hasGrammar = (session.grammarPoints && session.grammarPoints.length > 0) || sections.some(sec => sec.grammar);
                                 const hasVocab = (session.vocabularyPoints && session.vocabularyPoints.length > 0) || sections.some(sec => sec.vocabulary);
                                 const hasPronunciation = (session.pronunciationPoints && session.pronunciationPoints.length > 0) || sections.some(sec => sec.pronunciation);

                                 return (
                                    <div key={session.id} className="relative mb-6">
                                        <div className="absolute -left-12 top-1.5 w-8 h-8 bg-brand-blue rounded-full border-4 border-white text-white flex items-center justify-center font-bold text-sm shadow-sm">{sessionNumber}</div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-gray-500 font-semibold">{format(new Date(session.date), 'MMMM d, yyyy')}</p>
                                            <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-200">
                                                {session.lessonName || `Session ${sessionNumber}`}
                                            </span>
                                        </div>

                                        <div className="mt-2 p-4 bg-white rounded-lg border border-gray-200 shadow-sm space-y-3">
                                            {/* Quick Targets Tag Summary */}
                                            {(hasGrammar || hasVocab || hasPronunciation || (session.topics && session.topics.length > 0)) && (
                                                <div className="flex flex-wrap gap-1.5 pb-2 border-b border-gray-100">
                                                    {(session.topics || []).map((tp, i) => (
                                                        <span key={i} className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded font-medium">
                                                            🏷️ {tp}
                                                        </span>
                                                    ))}
                                                    {hasGrammar && (
                                                        <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded font-semibold border border-blue-200">
                                                            📘 Grammar Covered
                                                        </span>
                                                    )}
                                                    {hasVocab && (
                                                        <span className="bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded font-semibold border border-emerald-200">
                                                            📗 Vocab Covered
                                                        </span>
                                                    )}
                                                    {hasPronunciation && (
                                                        <span className="bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded font-semibold border border-purple-200">
                                                            🎙️ Pronunciation Covered
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Detailed Section Breakdown */}
                                            {sections.length > 0 ? (
                                                <div className="space-y-2">
                                                    <h5 className="font-bold text-xs uppercase tracking-wider text-gray-500">📜 Lesson Section Focus Breakdown:</h5>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {sections.map((sec, idx) => (
                                                            <div key={idx} className="p-2.5 bg-gray-50 rounded-md border border-gray-200 text-xs space-y-1">
                                                                <div className="font-bold text-gray-800 flex items-center gap-1.5">
                                                                    <span className="w-2 h-2 rounded-full bg-brand-blue inline-block"></span>
                                                                    {sec.sectionTitle || `Section ${idx + 1}`}
                                                                </div>
                                                                <div className="flex flex-wrap gap-2 pl-3 pt-0.5">
                                                                    {sec.grammar && (
                                                                        <span className="text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-200 font-medium">
                                                                            📘 <strong className="font-semibold">Grammar:</strong> {sec.grammar}
                                                                        </span>
                                                                    )}
                                                                    {sec.vocabulary && (
                                                                        <span className="text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                                                                            📗 <strong className="font-semibold">Vocab:</strong> {sec.vocabulary}
                                                                        </span>
                                                                    )}
                                                                    {sec.pronunciation && (
                                                                        <span className="text-purple-700 bg-purple-50/80 px-2 py-0.5 rounded border border-purple-200 font-medium">
                                                                            🎙️ <strong className="font-semibold">Pronunciation:</strong> {sec.pronunciation}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Standalone Grammar / Vocab / Pronunciation Arrays if sectionFocus is empty */
                                                (session.grammarPoints?.length || session.vocabularyPoints?.length || session.pronunciationPoints?.length) ? (
                                                    <div className="space-y-2 text-xs">
                                                        {session.grammarPoints && session.grammarPoints.length > 0 && (
                                                            <div className="p-2 bg-blue-50/70 rounded border border-blue-200">
                                                                <span className="font-bold text-blue-800">📘 Grammar Points:</span> {session.grammarPoints.join(', ')}
                                                            </div>
                                                        )}
                                                        {session.vocabularyPoints && session.vocabularyPoints.length > 0 && (
                                                            <div className="p-2 bg-emerald-50/70 rounded border border-emerald-200">
                                                                <span className="font-bold text-emerald-800">📗 Vocabulary Points:</span> {session.vocabularyPoints.join(', ')}
                                                            </div>
                                                        )}
                                                        {session.pronunciationPoints && session.pronunciationPoints.length > 0 && (
                                                            <div className="p-2 bg-purple-50/70 rounded border border-purple-200">
                                                                <span className="font-bold text-purple-800">🎙️ Pronunciation Points:</span> {session.pronunciationPoints.join(', ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : null
                                            )}

                                            {(session.skillsLearned && session.skillsLearned.length > 0) && (
                                                <div className="pt-1">
                                                    <h5 className="font-bold text-green-700 text-xs">✅ Skills Learned:</h5>
                                                    <ul className="list-disc list-inside text-xs mt-1 space-y-0.5 text-gray-700">
                                                        {session.skillsLearned.map((skill, i) => <li key={i}>{skill}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                             {(session.aiAnalysis?.competencyUpdates && session.aiAnalysis.competencyUpdates.length > 0) && (
                                                <div className="pt-1">
                                                    <h5 className="font-bold text-purple-700 text-xs">📊 Competency Updates:</h5>
                                                    <ul className="list-disc list-inside text-xs mt-1 space-y-0.5 text-gray-700">
                                                        {session.aiAnalysis.competencyUpdates.map((update, i) => (
                                                            <li key={i}>
                                                                <strong>{update.competencyName}</strong> progress updated to <strong>{update.suggestedProgress}%</strong>. 
                                                                <em className="text-gray-600">"{update.justification}"</em>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {(!sections || sections.length === 0) && (!session.grammarPoints || session.grammarPoints.length === 0) && (!session.vocabularyPoints || session.vocabularyPoints.length === 0) && (!session.pronunciationPoints || session.pronunciationPoints.length === 0) && (!session.skillsLearned || session.skillsLearned.length === 0) && (!session.aiAnalysis?.competencyUpdates || session.aiAnalysis.competencyUpdates.length === 0) && (
                                                <p className="text-xs text-gray-500 italic">No specific section focus, skills, or competency updates were logged for this session.</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default LearningPathTimeline;