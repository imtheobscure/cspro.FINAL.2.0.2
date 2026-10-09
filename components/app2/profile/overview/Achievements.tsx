import React, { useMemo } from 'react';
import { Learner } from '../../../../types2';

interface AchievementsProps {
    learner: Learner;
    isForScreenshot?: boolean;
}

const Achievements: React.FC<AchievementsProps> = ({ learner, isForScreenshot = false }) => {
    const attendedSessions = learner.sessions.filter(s => s.attended).length;
    
    const standardAchievements = [
        { name: "First Session", icon: "fas fa-flag", unlocked: attendedSessions >= 1, description: "Complete your first session." },
        { name: "Session Apprentice", icon: "fas fa-star", unlocked: attendedSessions >= 5, description: "Complete 5 sessions." },
        { name: "Session Veteran", icon: "fas fa-trophy", unlocked: attendedSessions >= 10, description: "Complete 10 sessions." },
        { name: "Streak Starter", icon: "fas fa-fire", unlocked: learner.streak >= 3, description: "Maintain a 3-session streak." },
        { name: "Streak Pro", icon: "fas fa-burn", unlocked: learner.streak >= 5, description: "Maintain a 5-session streak." },
        { name: "On Fire!", icon: "fas fa-meteor", unlocked: learner.streak >= 10, description: "Maintain a 10-session streak!" },
    ];
    
    const personalizedAchievements = useMemo(() => {
        const needsLower = (learner.needs as any[] || []).map(n => {
            if (!n) return '';
            if (typeof n === 'string') return n.toLowerCase();
            if (typeof n === 'object') {
                const nameStr = n.name || '';
                return typeof nameStr === 'string' ? nameStr.toLowerCase() : '';
            }
            return '';
        }).filter(Boolean);
        const achievements = [];
        if (needsLower.some(n => n.includes('job') || n.includes('interview'))) {
            achievements.push({ name: "Interview Ace", icon: "fas fa-user-tie", unlocked: false, description: "Successfully complete a mock interview session." });
        }
        if (needsLower.some(n => n.includes('travel'))) {
            achievements.push({ name: "World Traveler", icon: "fas fa-plane-departure", unlocked: false, description: "Master vocabulary for booking a flight and hotel." });
        }
        const competencies = learner.competencies || [];
        achievements.push({ name: "Confident Speaker", icon: "fas fa-bullhorn", unlocked: competencies.some(c => c?.name === 'Confidence' && c?.progress > 75), description: "Reach over 75% in your Confidence competency." });

        return achievements;
    }, [learner.needs, learner.competencies]);

    const AchievementCard: React.FC<{ name: string, icon: string, unlocked: boolean, description: string }> = ({ name, icon, unlocked, description }) => (
        <div className={`p-4 rounded-lg flex items-center gap-4 border-2 ${unlocked ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-100 border-gray-200'}`}>
            <i className={`${icon} text-3xl w-10 text-center ${unlocked ? 'text-yellow-500' : 'text-gray-400'}`}></i>
            <div>
                <h4 className={`font-bold ${unlocked ? 'text-yellow-900' : 'text-gray-600'}`}>{name}</h4>
                <p className={`text-sm ${unlocked ? 'text-yellow-800' : 'text-gray-500'}`}>{description}</p>
            </div>
        </div>
    );
    
    return (
        <div className="space-y-6">
            <div>
                <h3 className="font-bold text-xl mb-3">Standard Achievements</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {standardAchievements.map(ach => <AchievementCard key={ach.name} {...ach} />)}
                </div>
            </div>
             {!isForScreenshot && (
                <div>
                    <h3 className="font-bold text-xl mb-3">Personalized Achievements</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {personalizedAchievements.map(ach => <AchievementCard key={ach.name} {...ach} />)}
                    </div>
                </div>
             )}
        </div>
    );
};

export default Achievements;