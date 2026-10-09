import React, { useRef, useState, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { format } from 'date-fns';
import { Learner, Session } from '../../../types2';
import SectionCard from '../SectionCard';
import { ICONS } from '../../../constants2';
import SessionItem from './SessionItem';
import SessionDetailModal from './SessionDetailModal';
import LessonTimer from './LessonTimer';
import { useAppStore } from '../../../store/useAppStore';
import { useAutomationStore } from '../../../store/useAutomationStore';
import { useLearnerStore } from '../../../store/useLearnerStore';
import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';

const mkSessionKey = (d: string | Date | undefined | null): string | null => {
    if (!d) return null;
    try {
        const x = typeof d === 'string' ? new Date(`${d}T00:00:00`) : new Date(d);
        return isNaN(x.getTime()) ? null : format(x, 'yyyy-MM-dd');
    } catch { return null; }
};

interface SessionLogProps {
    learner: Learner;
    onManualLogClick: () => void;
    onEditSession: (session: Session) => void;
    onRemoveSession: (sessionId: string) => void;
    onUpdateSession: (session: Session) => void;
}

const SessionLog: React.FC<SessionLogProps> = ({ learner, onManualLogClick, onEditSession, onRemoveSession, onUpdateSession }) => {
    // Same activity markers as the Calendar tab — loved class, homework,
    // exam, review and lesson material, all keyed by session date.
    const homeworkAll = useAutomationStore(state => state.homeworkAssignments);
    const reviewsAll = useAutomationStore(state => state.spacedRepetitionItems);
    const markersByDate = useMemo(() => {
        const map = new Map<string, { icon: string; cls: string; title: string }[]>();
        const push = (k: string | null, m: { icon: string; cls: string; title: string }) => {
            if (!k) return;
            const arr = map.get(k) || [];
            arr.push(m);
            map.set(k, arr);
        };
        homeworkAll.filter(h => h.learnerId === learner.id).forEach(h => {
            push(mkSessionKey(h.dueDate), { icon: '📝', cls: 'bg-amber-100 text-amber-700', title: `Homework: ${h.title} (${h.status})` });
        });
        reviewsAll.filter(r => r.learnerId === learner.id).forEach(r => {
            push(mkSessionKey(r.nextReviewDate), { icon: '🔁', cls: 'bg-sky-100 text-sky-700', title: `Review due: ${r.content}` });
        });
        (((learner as any).examAnalysis) || []).forEach((exam: any) => {
            push(mkSessionKey(exam.date || exam.completedAt || exam.examDate), { icon: '🎓', cls: 'bg-violet-100 text-violet-700', title: `Exam: ${exam.examTitle || 'Mock Test'}` });
        });
        (((learner as any).lessonHistory) || []).forEach((l: any) => {
            push(mkSessionKey(l.date), { icon: '📖', cls: 'bg-indigo-100 text-indigo-700', title: `Lesson material: ${l.title || 'Lesson'}` });
        });
        (learner.sessions || []).forEach(s => {
            if (!s.attended) return;
            // Same star rules as the Calendar tab: rating, review stars, or positive AI sentiment.
            const stars = Math.max(
                Number(s.rating) || 0,
                Number((s as any).review?.stars) || 0,
                ((s as any).aiAnalysis?.sentiment === 'positive' ? 4 : 0)
            );
            if (stars >= 4) {
                push(mkSessionKey(s.date), { icon: `${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}`, cls: 'bg-amber-100 text-amber-700', title: `Loved this class — rated ${stars}/5 stars` });
            }
        });
        return map;
    }, [learner, homeworkAll, reviewsAll]);
    // FIX: Refactored multi-property selectors with `shallow` to individual selectors to resolve type inference issues.
    const activeTimer = useAppStore(state => state.activeTimer);
    const stopTimer = useAppStore(state => state.stopTimer);
    const [detailModalInfo, setDetailModalInfo] = useState<{session: Session, sessionNumber: number} | null>(null);
    const isTimerForCurrentLearner = activeTimer && activeTimer.learnerId === learner.id;

    // Report states
    const [reportData, setReportData] = useState<any>(null);
    const [isSavingReport, setIsSavingReport] = useState(false);

    const handleEndSession = () => {
        stopTimer();
    };
    
    const handleShowDetails = useCallback((session: Session, sessionNumber: number) => {
        setDetailModalInfo({ session, sessionNumber });
    }, []);

    const handleCloseDetails = () => {
        setDetailModalInfo(null);
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.name.endsWith('.zip')) {
            try {
                const zip = await JSZip.loadAsync(file);
                if (zip.file("report.json")) {
                    const content = await zip.file("report.json")!.async("string");
                    const data = JSON.parse(content);
                    setReportData(data);
                } else {
                    alert('Invalid Learner Report. report.json not found.');
                }
            } catch (error) {
                console.error(error);
                alert('Error reading ZIP file.');
            }
        } else if (file.name.endsWith('.json')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target?.result as string);
                    setReportData(data);
                } catch (err) {
                    alert('Error reading JSON file.');
                }
            };
            reader.readAsText(file);
        }
        event.target.value = '';
    };

    const handleSaveReport = () => {
        if (!reportData) return;
        setIsSavingReport(true);
        
        let problems = '';
        if (reportData.incorrectAnswers && reportData.incorrectAnswers.length > 0) {
            problems = '\nIssues found: ' + reportData.incorrectAnswers.map((p: any) => p.details || '').join(', ');
        }
        
        let essays = '';
        if (reportData.essayAnswers && Object.keys(reportData.essayAnswers).length > 0) {
            essays = '\nEssays: ' + Object.values(reportData.essayAnswers).join('\n\n');
        }

        const newSession: Session = {
            id: uuidv4(),
            learnerId: learner.id,
            date: reportData.startedAt || new Date().toISOString(),
            duration: Math.ceil((reportData.durationSeconds || 0) / 60),
            status: 'completed',
            attended: true,
            topics: ['Self Practice via Micro Lesson'],
            notes: `Finished with ${reportData.xp || 0} XP. ${problems} ${essays}`,
        };

        const currentSessions = learner.sessions || [];
        const updatedLearner = { ...learner, sessions: [newSession, ...currentSessions] };
        
        const updateLearner = useLearnerStore.getState().updateLearner;
        updateLearner(updatedLearner);
        
        setReportData(null);
        setIsSavingReport(false);
    };

    const sortedSessions = [...learner.sessions]
        .map((session, index) => ({ session, originalIndex: index }))
        .sort((a, b) => {
            const timeA = new Date(a.session.date).getTime();
            const timeB = new Date(b.session.date).getTime();
            if (timeA !== timeB) {
                return timeB - timeA;
            }
            // Secondary sort: larger originalIndex (more recently added) comes first
            return b.originalIndex - a.originalIndex;
        })
        .map(item => item.session);

    const parentRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
        count: sortedSessions.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 100,
        overscan: 5,
    });


    return (
        <SectionCard title="Session History" icon={ICONS.calendar}>
            {isTimerForCurrentLearner ? (
                 <div className="p-4 bg-gray-50 border rounded-lg space-y-4 animate-fade-in">
                    <div className="text-center">
                        <p className="font-bold text-lg">Lesson in progress for:</p>
                        <p className="text-xl text-brand-purple font-extrabold my-1">{activeTimer.learnerName}</p>
                    </div>
                     <div className="flex justify-center items-center">
                         <button onClick={handleEndSession} className="bg-brand-red text-white font-bold px-6 py-3 rounded-lg hover:bg-red-700 transition-colors shadow-lg">
                            End Session
                        </button>
                    </div>
                 </div>
            ) : (
                <LessonTimer learner={learner} />
            )}
            
            <div className="relative text-center my-4">
                <span className="absolute left-0 top-1/2 w-full h-px bg-gray-200"></span>
                <span className="relative bg-white px-2 text-xs font-semibold text-gray-500 uppercase">OR</span>
            </div>
            <button 
                onClick={onManualLogClick} 
                className="w-full bg-brand-blue text-white font-bold py-2 rounded-lg hover:bg-blue-600 transition-transform hover:scale-105 shadow-md hover:shadow-lg"
            >
                Log a Session
            </button>

            {reportData && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg animate-fade-in shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-green-800">Learner Report Loaded</h4>
                        <button onClick={() => setReportData(null)} title="Clear" className="text-gray-400 hover:text-red-500">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    <ul className="text-sm text-green-700 space-y-1 mb-4">
                        <li><strong>Time Spent:</strong> {Math.ceil((reportData.durationSeconds || 0) / 60)} minutes</li>
                        <li><strong>XP Earned:</strong> {reportData.xp || 0} XP</li>
                        <li><strong>Errors:</strong> {reportData.incorrectAnswers?.length || 0} found</li>
                    </ul>
                    <button 
                        onClick={handleSaveReport} 
                        disabled={isSavingReport}
                        className="w-full bg-green-600 text-white font-bold py-2 rounded-md hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                        {isSavingReport ? 'Saving...' : 'Save as Session'}
                    </button>
                </div>
            )}

            <div ref={parentRef} className="max-h-[40rem] overflow-y-auto pr-2 -mr-2 mt-4">
                {sortedSessions.length > 0 
                    ? (
                        <div
                            style={{
                                height: `${rowVirtualizer.getTotalSize()}px`,
                                width: '100%',
                                position: 'relative',
                            }}
                        >
                            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                                const session = sortedSessions[virtualItem.index];
                                const sessionNumber = session.sessionNumber || (learner.sessions.length - virtualItem.index);
                                const dayMarkers = markersByDate.get(mkSessionKey(session.date));
                const sessionStars = (session.attended && session.rating && Number(session.rating) >= 1)
                    ? Math.min(5, Math.round(Number(session.rating)))
                    : ((session as any).review?.stars && Number((session as any).review.stars) >= 1)
                      ? Math.min(5, Math.round(Number((session as any).review.stars)))
                      : 0;
                                return (
                                    <div
                                        key={session.id}
                                        data-index={virtualItem.index}
                                        ref={(node) => rowVirtualizer.measureElement(node)}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            transform: `translateY(${virtualItem.start}px)`,
                                        }}
                                    >
                                        <div className="pb-4">
                                            <SessionItem 
                                                session={session} 
                                                sessionNumber={sessionNumber}
                                                totalSessions={Number(((learner as any).coursePlan || (learner as any).plan || {}).totalSessions) || 0} 
                                                onShow={handleShowDetails}
                                                onEdit={onEditSession}
                                                onRemove={onRemoveSession}
                                                markers={<>
                                                    {sessionStars > 0 && (
                                                        <span
                                                            className="text-[11px] tracking-tight text-amber-500 leading-none"
                                                            title={`Rated ${sessionStars}/5 by the student`}
                                                        >
                                                            {'★'.repeat(sessionStars)}{'☆'.repeat(5 - sessionStars)}
                                                        </span>
                                                    )}
                                                    {dayMarkers?.map((m, i) => (
                                                        <span key={i} title={m.title} className={`text-[10px] w-5 h-5 rounded-md ${m.cls} flex items-center justify-center`}>{m.icon}</span>
                                                    ))}
                                                </>
                                            }
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                    : null
                }
            </div>
            
            {detailModalInfo && (
                <SessionDetailModal
                    isOpen={!!detailModalInfo}
                    onClose={handleCloseDetails}
                    session={detailModalInfo.session}
                    sessionNumber={detailModalInfo.sessionNumber}
                    learner={learner}
                />
            )}
        </SectionCard>
    );
};

export default SessionLog;