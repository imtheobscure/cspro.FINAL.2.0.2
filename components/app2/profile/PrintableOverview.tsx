
import React, { useRef, useMemo, useState } from 'react';
import { toPng } from 'html-to-image';
import { Learner, CoursePlan } from '../../../types2';
import { ICONS } from '../../../constants2';
import RadarChartComponent from '../RadarChartComponent';
import { calculateAge, formatBirthday } from '../../../utils/dateUtils';
import { getFlagEmoji } from '../../../utils/countryUtils';
import StarRating from '../StarRating';
import { differenceInDays, isThisWeek, isThisMonth } from 'date-fns';
import AttendanceTracker from '../AttendanceTracker';
import { getAvatarUrl } from '../../../services/avatarService';
import { useCalendarStore } from '../../../store/useCalendarStore';
import { sendEmailWithAIGreeting } from '../../../utils/emailSender';

const InfoItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: React.ReactNode }) => (
    <div className="flex items-start gap-3 print:break-inside-avoid">
        <span className="text-brand-gray-dark mt-1 w-5 h-5 flex items-center justify-center">{icon}</span>
        <div>
            <p className="text-sm text-brand-gray-dark">{label}</p>
            <div className="font-bold">{value || 'N/A'}</div>
        </div>
    </div>
);

// FIX: Added `children` to the props type to allow child elements, resolving multiple type errors.
const Section: React.FC<{
    title: string;
    icon: React.ReactElement;
    children: React.ReactNode;
}> = ({ title, icon, children }) => (
     <div className="border border-gray-200 rounded-lg p-4 print:shadow-none print:border-gray-300 print:break-inside-avoid h-full">
        <div className="flex items-center gap-3 mb-4">
            {icon && <span className="text-brand-green">{React.cloneElement(icon as React.ReactElement<any>, { className: 'w-6 h-6' })}</span>}
            <h3 className="text-xl font-extrabold text-brand-gray-darkest">{title}</h3>
        </div>
        <div>{children}</div>
    </div>
);

const StatCard = ({ icon, value, label, bgColor, textColor, iconClass = '' }) => (
    <div className={`p-4 rounded-xl flex flex-col items-center justify-center text-center ${bgColor} ${textColor} print:shadow-none print:border print:border-gray-200 shadow-md`}>
        <div className={`text-4xl mb-2 ${iconClass}`}>{icon}</div>
        <div className="text-3xl font-extrabold">{Number.isNaN(value) ? 0 : value}</div>
        <div className="font-bold">{label}</div>
    </div>
);


const PrintableOverview: React.FC<{ learner: Learner, learners: Learner[] }> = ({ learner, learners }) => {
    // FIX: Refactored multi-property selectors with `shallow` to individual selectors to resolve type inference issues.
    const calendarEvents = useCalendarStore(state => state.calendarEvents);
    const { coursePlan } = learner;
    
    // Ensure coursePlan is defined
    const safeCoursePlan = coursePlan || {
        level: 'N/A', targetLevel: 'N/A', courseName: 'N/A', duration: 60, frequency: 'Custom', totalSessions: 0, currentLesson: 'N/A'
    };
    
    const overviewRef = useRef<HTMLDivElement>(null);
    const [leaderboardPeriod, setLeaderboardPeriod] = useState<'all' | 'week' | 'month'>('all');

    const coursePlanLabels = {
        duration: {30: '30m - Quick Drills', 60: '60m - Standard', 90: '90m - In-Depth', 120: '120m - Intensive'} as any,
        frequency: {Light: '1x/wk - Light', Balanced: '2x/wk - Balanced', Intensive: '3x/wk - Intensive', Custom: 'Flex - Custom'} as any,
    };
    
    const leaderboard = useMemo(() => {
        const filteredLearners = (learners || []).filter(l => {
            if (leaderboardPeriod === 'all') return true;
            
            const sessions = l.sessions || [];
            const lastSession = sessions
                .filter(s => s.attended && s.date && !isNaN(new Date(s.date).getTime()))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

            if (!lastSession) return false;

            const lastSessionDate = new Date(lastSession.date);

            if (leaderboardPeriod === 'week') {
                return isThisWeek(lastSessionDate, { weekStartsOn: 1 });
            }
            if (leaderboardPeriod === 'month') {
                return isThisMonth(lastSessionDate);
            }
            return true;
        });

        const sorted = [...filteredLearners].sort((a, b) => (b.xp || 0) - (a.xp || 0));
        const currentIndex = sorted.findIndex(l => l.id === learner.id);
        
        if (currentIndex === -1) return null;
        
        const above = currentIndex > 0 ? sorted[currentIndex - 1] : null;
        const below = currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null;
        
        return {
            above,
            current: { ...sorted[currentIndex], rank: currentIndex + 1 },
            below,
        };
    }, [learner, learners, leaderboardPeriod]);

    const sessions = learner.sessions || [];
    const totalHours = Math.round(sessions.reduce((acc, s) => acc + (s.attended ? s.duration || 0 : 0), 0) / 60) || 0;
    const lastSession = sessions.filter(s => s.attended).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const daysSinceLastSession = lastSession ? differenceInDays(new Date(), new Date(lastSession.date)) : null;
    const lastSeen = daysSinceLastSession !== null ? `${daysSinceLastSession}d ago` : 'N/A';
    let lastSeenEmoji = '🤩';
    if (daysSinceLastSession !== null) {
        if (daysSinceLastSession <= 7) lastSeenEmoji = '😊';
        else if (daysSinceLastSession <= 21) lastSeenEmoji = '🤔';
        else lastSeenEmoji = '😟';
    }
    
    const masteredSkills = useMemo(() => learner.masteredSkills || [], [learner.masteredSkills]);
    const needsHelpItems = useMemo(() => {
        const sessions = learner.sessions || [];
        const allItems = sessions.flatMap(s => s.needsHelp || []);
        return [...new Set(allItems)]
            .filter(item => !masteredSkills.includes(item));
    }, [learner.sessions, masteredSkills]);

    const allSkillsLearned = useMemo(() => {
        const sessions = learner.sessions || [];
        const skills = new Set<string>();
        sessions.forEach(session => {
            if (session.skillsLearned) {
                session.skillsLearned.forEach(skill => skills.add(skill));
            }
        });
        return Array.from(skills);
    }, [learner.sessions]);


    const learnerEvents = useMemo(() => {
        return calendarEvents.filter(e => e.learnerId === learner.id);
    }, [calendarEvents, learner.id]);


    const handleScreenshot = () => {
        if (overviewRef.current) {
            toPng(overviewRef.current, {
                cacheBust: true,
                pixelRatio: 2,
                backgroundColor: '#ffffff',
                fetchRequestInit: { credentials: 'omit' },
                styleSheetsFilter: (sheet) => {
                    if (sheet.href) {
                        try {
                            const url = new URL(sheet.href, window.location.origin);
                            if (url.origin !== window.location.origin) {
                                return false;
                            }
                        } catch (e) {
                            return false;
                        }
                    }
                    try {
                        const rules = sheet.cssRules;
                        return true;
                    } catch (e) {
                        return false;
                    }
                }
            } as any).then(dataUrl => {
                const link = document.createElement('a');
                link.download = `${learner.name}-overview.png`;
                link.href = dataUrl;
                link.click();
            });
        }
    };

    const generateOverviewTextSummary = (): string => {
        const { coursePlan } = learner;
        const safeCoursePlan = coursePlan || {
            level: 'N/A', targetLevel: 'N/A', courseName: 'N/A', duration: 60, frequency: 'Custom', totalSessions: 0, currentLesson: 'N/A'
        };
        const sessions = learner.sessions || [];
        const totalHours = Math.round(sessions.reduce((acc, s) => acc + (s.attended ? s.duration || 0 : 0), 0) / 60) || 0;

        let summary = `PROFILE OVERVIEW FOR ${(learner.name || '').toUpperCase()}\n\n`;
        summary += `== ENGAGEMENT STATS ==\n`;
        summary += `- XP Points: ${learner.xp}\n`;
        summary += `- Session Streak: ${learner.streak}\n`;
        summary += `- Total Learning Hours: ${totalHours}\n\n`;

        summary += `== COURSE PLAN ==\n`;
        summary += `- Course: ${safeCoursePlan.courseName}\n`;
        summary += `- Level: ${safeCoursePlan.level} -> ${safeCoursePlan.targetLevel}\n`;
        summary += `- Frequency: ${safeCoursePlan.frequency}\n\n`;

        summary += `== NEEDS & EXPECTATIONS ==\n`;
        summary += `Needs:\n${learner.needs?.map(n => `- ${n.name} (Priority: ${n.rating}/5)`).join('\n') || 'None'}\n`;
        summary += `Expectations: ${learner.expectations || 'Not set'}\n\n`;

        return summary;
    };

    const handleEmail = async () => {
        const bodyContent = generateOverviewTextSummary();
        await sendEmailWithAIGreeting({
            learner,
            topic: "Profile Overview",
            subject: `Your Profile Overview from your Tutor`,
            bodyContent,
        });
    };

    return (
        <div>
            <div id="printable-content" ref={overviewRef}>
                 <div className="text-center mb-6">
                    <img src={getAvatarUrl(learner.gender, learner.avatarId, learner.name)} alt={learner.name} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-white shadow-lg print:shadow-none object-cover" />
                    <h2 className="text-3xl font-extrabold">{learner.name}'s Profile Overview</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <Section title="Personal Information" icon={ICONS.user}>
                        <div className="space-y-3">
                            <InfoItem icon={ICONS.calendar} label="Birthday" value={`${formatBirthday(learner.birthday)} (Age ${calculateAge(learner.birthday)})`} />
                            <InfoItem icon={ICONS.email} label="Email" value={<a href={`mailto:${learner.email}`} className="text-brand-blue hover:underline">{learner.email}</a>} />
                            <InfoItem icon={ICONS.globe} label="Location" value={`${learner.city || ''}, ${learner.country} ${getFlagEmoji(learner.country)}`} />
                            <InfoItem icon={ICONS.message} label="Languages" value={learner.languages?.join(', ') || 'N/A'} />
                            <InfoItem icon={<span>🧠</span>} label="Learning Style" value={learner.learningStyle || 'Not set'} />
                            <InfoItem icon={<span>💖</span>} label="Interests" value={learner.interests || 'Not set'} />
                            <InfoItem icon={ICONS.briefcase} label="Occupation" value={learner.occupation} />
                        </div>
                    </Section>
                    <Section title="Course Plan" icon={ICONS.calendar}>
                        <div className="grid grid-cols-1 gap-3">
                            <InfoItem icon={<span>🎯</span>} label="Current Level" value={safeCoursePlan.level} />
                            <InfoItem icon={<span>🚀</span>} label="Target Level" value={safeCoursePlan.targetLevel} />
                            <InfoItem icon={<span>⚡</span>} label="Course Name" value={safeCoursePlan.courseName} />
                            <InfoItem icon={<span>⏳</span>} label="Duration" value={coursePlanLabels.duration[safeCoursePlan.duration as keyof typeof coursePlanLabels.duration]} />
                            <InfoItem icon={<span>🔄</span>} label="Frequency" value={coursePlanLabels.frequency[safeCoursePlan.frequency as keyof typeof coursePlanLabels.frequency]} />
                            <InfoItem icon={<span>🗓️</span>} label="Total Sessions" value={`${safeCoursePlan.totalSessions} Sessions`} />
                            <InfoItem icon={<span>📖</span>} label="Current Lesson" value={safeCoursePlan.currentLesson || 'Not set'} />
                            {safeCoursePlan.features && <div className="col-span-1"><InfoItem icon={<span>✨</span>} label="Features" value={<div className="whitespace-pre-wrap">{safeCoursePlan.features}</div>} /></div>}
                        </div>
                    </Section>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <Section title="Engagement" icon={ICONS.leaderboard}>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <StatCard icon="✨" value={learner.xp || 0} label="XP Points" bgColor="bg-purple-50" textColor="text-purple-700" iconClass="text-purple-500" />
                            <StatCard icon="🔥" value={learner.streak || 0} label="Session Streak" bgColor="bg-orange-50" textColor="text-orange-700" iconClass="text-orange-500" />
                            <StatCard icon="⏰" value={totalHours || 0} label="Total Hours" bgColor="bg-blue-50" textColor="text-blue-700" iconClass="text-blue-500" />
                            <StatCard icon={lastSeenEmoji} value={lastSeen} label="Last Seen" bgColor="bg-green-50" textColor="text-green-700" iconClass="text-green-500" />
                        </div>
                        
                        
                            <>
                                <div className="border-t my-4"></div>
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-base text-brand-gray-darkest">Leaderboard Position</h4>
                                    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                                        <button onClick={() => setLeaderboardPeriod('all')} className={`px-2 py-1 text-xs font-bold rounded-md ${leaderboardPeriod === 'all' ? 'bg-white shadow' : 'text-gray-600'}`}>All-Time</button>
                                        <button onClick={() => setLeaderboardPeriod('week')} className={`px-2 py-1 text-xs font-bold rounded-md ${leaderboardPeriod === 'week' ? 'bg-white shadow' : 'text-gray-600'}`}>This Week</button>
                                        <button onClick={() => setLeaderboardPeriod('month')} className={`px-2 py-1 text-xs font-bold rounded-md ${leaderboardPeriod === 'month' ? 'bg-white shadow' : 'text-gray-600'}`}>This Month</button>
                                    </div>
                                </div>
                                {leaderboard ? (
                                <div className="space-y-2">
                                    {leaderboard.above && (
                                        <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 text-sm">
                                            <span className="font-bold w-6 text-center text-gray-500">{leaderboard.current.rank - 1}</span>
                                            <span className="flex-1 font-semibold text-gray-600">{leaderboard.above.name}</span>
                                            <span className="font-bold text-gray-500">{leaderboard.above.xp} XP</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-100 border-2 border-brand-purple text-base shadow-md">
                                        <span className="font-extrabold w-6 text-center text-brand-purple flex items-center justify-center">
                                            <i className="fas fa-star text-yellow-500 mr-1"></i>{leaderboard.current.rank}
                                        </span>
                                        <span className="flex-1 font-extrabold text-brand-purple">{leaderboard.current.name} (You)</span>
                                        <span className="font-extrabold text-brand-purple">{leaderboard.current.xp} XP</span>
                                    </div>
                                    {leaderboard.below && (
                                        <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 text-sm">
                                            <span className="font-bold w-6 text-center text-gray-500">{leaderboard.current.rank + 1}</span>
                                            <span className="flex-1 font-semibold text-gray-600">{leaderboard.below.name}</span>
                                            <span className="font-bold text-gray-500">{leaderboard.below.xp} XP</span>
                                        </div>
                                    )}
                                </div>
                                ) : (
                                    <p className="text-center text-sm text-gray-500 p-4">You are not ranked for this period.</p>
                                )}
                            </>
                        
                    </Section>
                    <Section title="Competency Overview" icon={ICONS.target}>
                         <div className="mt-6">
                            <RadarChartComponent data={learner.competencies} />
                        </div>
                    </Section>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <Section title="Needs, Wants & Expectations" icon={ICONS.target}>
                         <div className="mb-4">
                            <h4 className="font-bold text-base mb-2 text-brand-gray-darkest">Expectations</h4>
                            {learner.expectations && learner.expectations.trim() ? (
                                <div className="flex flex-wrap gap-2">
                                   {learner.expectations.split(',').map(e => e.trim()).filter(Boolean).map((exp, i) => (
                                        <span key={i} className="bg-blue-100 text-brand-blue text-sm font-semibold px-3 py-1 rounded-full">{exp}</span>
                                   ))}
                                </div>
                            ) : <p className="text-sm text-brand-gray-dark">No expectations set.</p>}
                        </div>

                         <div className="border-t border-brand-gray-light pt-4 mt-4">
                             <h4 className="font-bold text-base mb-2 text-brand-gray-darkest">Needs Assessment</h4>
                            <div className="space-y-2">
                                {learner.needs?.map(need => (
                                    <div key={need.id} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                                        <span className="font-medium">{need.name}</span>
                                        <StarRating rating={need.rating} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Section>
                    <Section title="Strengths & Weaknesses" icon={<span>📊</span>}>
                        <h4 className="font-bold text-base mb-2 text-green-700">✅ Key Skills Practiced</h4>
                        {allSkillsLearned.length > 0 ? (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {allSkillsLearned.map((item, index) => (
                                    <span key={index} className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                                        {item}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-brand-gray-medium italic mb-4">No specific skills have been logged yet.</p>
                        )}
                        <div className="border-t pt-4">
                            <h4 className="font-bold text-base mb-2 text-red-700">💡 Learning Challenges to Recycle</h4>
                            {needsHelpItems.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {needsHelpItems.map((item, index) => (
                                        <span key={index} className="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-brand-gray-medium italic">No recurring challenges noted.</p>
                            )}
                        </div>
                    </Section>
                </div>

            </div>
            <div className="no-print mt-8 flex justify-end gap-2">
                <button
                    onClick={handleEmail}
                    className="bg-brand-blue text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-600 transition-colors"
                >
                    <i className="fas fa-envelope mr-2"></i>Email Overview
                </button>
                <button
                    onClick={handleScreenshot}
                    className="bg-brand-green text-white font-bold py-2 px-6 rounded-lg hover:bg-green-600 transition-colors"
                >
                    <i className="fas fa-camera mr-2"></i>Take Screenshot
                </button>
            </div>
        </div>
    );
};

export default PrintableOverview;
