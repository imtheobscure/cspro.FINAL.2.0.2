import { Learner, Session, Competency, Need } from '../../../../types2';
import { format } from 'date-fns';
import { REVIEW_SKILLS } from '../reviewSkills';

export interface EmailPreviewData {
    selectedSections: Record<string, boolean>;
    greeting: string;
    subject: string;
    homeworkAssignments?: any[];
    spacedRepetitionItems?: any[];
    customAlert?: {
        type: 'warning' | 'attention' | 'info' | 'success' | 'achievement' | string;
        text: string;
        title?: string;
    };
}

const getCEFRLevel = (learner: any): string => {
    if (!learner) return 'B1';
    if (learner.cefrLevel) return learner.cefrLevel;
    
    // Check if level is one of the keys or values
    const levelStr = String(learner.level || '').toLowerCase();
    if (levelStr.includes('a1') || levelStr === 'beginner') return 'A1';
    if (levelStr.includes('a2') || levelStr === 'elementary') return 'A2';
    if (levelStr.includes('b1') || levelStr === 'intermediate') return 'B1';
    if (levelStr.includes('b2') || levelStr === 'upper-intermediate' || levelStr === 'upperintermediate') return 'B2';
    if (levelStr.includes('c1') || levelStr === 'advanced') return 'C1';
    if (levelStr.includes('c2') || levelStr === 'expert' || levelStr === 'master') return 'C2';
    
    // Let's check coursePlan too
    const planLevel = String(learner.coursePlan?.level || learner.plan?.level || '').toLowerCase();
    if (planLevel.includes('a1') || planLevel === 'beginner') return 'A1';
    if (planLevel.includes('a2') || planLevel === 'elementary') return 'A2';
    if (planLevel.includes('b1') || planLevel === 'intermediate') return 'B1';
    if (planLevel.includes('b2') || planLevel === 'upper-intermediate' || planLevel === 'upperintermediate') return 'B2';
    if (planLevel.includes('c1') || planLevel === 'advanced') return 'C1';
    if (planLevel.includes('c2') || planLevel === 'expert' || planLevel === 'master') return 'C2';
    
    return learner.coursePlan?.level || learner.level || 'B1';
};

export function generateEmailHtml(learner: Learner, data: EmailPreviewData): string {
    const { selectedSections, greeting, subject, homeworkAssignments = [], spacedRepetitionItems = [] } = data;

    // Helper to generate visual stars representation
    const renderStarsHtml = (rating: number = 5) => {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += i <= rating 
                ? `<span style="color: #fbbf24; font-size: 16px;">★</span>` 
                : `<span style="color: #cbd5e1; font-size: 16px;">★</span>`;
        }
        return stars;
    };

    const SectionHeader = (title: string, emoji: string) => `
        <div style="margin-top: 28px; margin-bottom: 14px; border-bottom: 3px solid #6366f1; padding-bottom: 8px;">
            <h3 style="margin: 0; font-family: 'Inter', system-ui, -apple-system, sans-serif; font-size: 18px; font-weight: 700; color: #1e1b4b; display: flex; align-items: center;">
                <span style="font-size: 22px; margin-right: 8px;">${emoji}</span> ${title.toUpperCase()}
            </h3>
        </div>
    `;

    // Custom Alert Box builder
    let alertHtml = '';
    if (data.customAlert && data.customAlert.text.trim()) {
        const alert = data.customAlert;
        const colorStyles: Record<string, { border: string; bg: string; text: string; icon: string; titleColor: string }> = {
            warning: { border: '#e11d48', bg: '#fff1f2', text: '#9f1239', icon: '🚨', titleColor: '#be123c' },
            attention: { border: '#d97706', bg: '#fffbeb', text: '#92400e', icon: '⚡', titleColor: '#b45309' },
            info: { border: '#2563eb', bg: '#eff6ff', text: '#1e40af', icon: '💡', titleColor: '#1d4ed8' },
            success: { border: '#059669', bg: '#ecfdf5', text: '#065f46', icon: '✅', titleColor: '#047857' },
            achievement: { border: '#7c3aed', bg: '#f5f3ff', text: '#5b21b6', icon: '🏆', titleColor: '#6d28d9' }
        };
        const style = colorStyles[alert.type] || colorStyles.attention;
        
        alertHtml = `
            <div style="background-color: ${style.bg}; border-left: 6px solid ${style.border}; border-radius: 8px; padding: 16px; margin-top: 10px; margin-bottom: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.03);">
                <div style="display: flex; align-items: center; margin-bottom: 6px;">
                    <span style="font-size: 20px; margin-right: 8px;">${style.icon}</span>
                    <strong style="font-family: sans-serif; font-size: 13px; color: ${style.titleColor}; letter-spacing: 0.05em; text-transform: uppercase;">${alert.title || 'NOTICE'}</strong>
                </div>
                <p style="margin: 0; font-family: sans-serif; font-size: 13px; color: ${style.text}; line-height: 1.5; font-weight: 500;">
                    ${alert.text}
                </p>
            </div>
        `;
    }

    let sectionsHtml = '';

    // 1. Overview Section
    if (selectedSections.overview) {
        const totalHours = Math.round(learner.sessions.reduce((acc, s) => acc + (s.attended ? s.duration || 0 : 0), 0) / 60);
        sectionsHtml += `
            ${SectionHeader('Performance Overview', '📈')}
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 16px;">
                <tr>
                    <td style="width: 25%; padding: 4px;">
                        <div style="background-color: #e0e7ff; padding: 12px; border-radius: 10px; border: 1px solid #c7d2fe; text-align: center;">
                            <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #4f46e5; font-weight: 700;">XP Points</div>
                            <div style="font-size: 22px; font-weight: 800; color: #3730a3; margin-top: 4px;">✨ ${learner.xp}</div>
                        </div>
                    </td>
                    <td style="width: 25%; padding: 4px;">
                        <div style="background-color: #fef3c7; padding: 12px; border-radius: 10px; border: 1px solid #fde68a; text-align: center;">
                            <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #d97706; font-weight: 700;">Streak</div>
                            <div style="font-size: 22px; font-weight: 800; color: #92400e; margin-top: 4px;">🔥 ${learner.streak} Days</div>
                        </div>
                    </td>
                    <td style="width: 25%; padding: 4px;">
                        <div style="background-color: #d1fae5; padding: 12px; border-radius: 10px; border: 1px solid #a7f3d0; text-align: center;">
                            <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #059669; font-weight: 700;">Learning Hours</div>
                            <div style="font-size: 22px; font-weight: 800; color: #065f46; margin-top: 4px;">⏱️ ${totalHours} hrs</div>
                        </div>
                    </td>
                    <td style="width: 25%; padding: 4px;">
                        <div style="background-color: #f3e8ff; padding: 12px; border-radius: 10px; border: 1px solid #e9d5ff; text-align: center;">
                            <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #7c3aed; font-weight: 700;">CEFR Level</div>
                            <div style="font-size: 15px; font-weight: 800; color: #5b21b6; margin-top: 8px;">🎓 ${getCEFRLevel(learner)}</div>
                        </div>
                    </td>
                </tr>
            </table>
        `;
    }

    // 2. Achievements (Visual Certificate Box style)
    if (selectedSections.achievements) {
        const hasAch = learner.achievements && learner.achievements.length > 0;
        const subList = hasAch 
            ? learner.achievements.map(ach => `
                <div style="display: flex; align-items: center; margin-bottom: 10px; padding: 12px; background-color: #ffffff; border: 1px solid #fcd34d; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div style="font-size: 28px; margin-right: 12px;">${ach.icon || '🏆'}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: bold; color: #78350f; font-size: 14px;">${ach.title || ach.name}</div>
                        <div style="font-size: 12px; color: #b45309; margin-top: 2px;">${ach.description}</div>
                        <div style="font-size: 10px; color: #d97706; margin-top: 2px; font-style: italic;">Unlocked on ${ach.dateEarned ? format(new Date(ach.dateEarned), 'PPPP') : 'recently'}</div>
                    </div>
                </div>
            `).join('')
            : `<div style="text-align: center; padding: 12px; color: #6b7280; font-style: italic;">No achievements earned in this period yet. Kepp pushing!</div>`;

        sectionsHtml += `
            ${SectionHeader('Unlocked Achievements & Badges', '🏅')}
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%); border: 2px solid #fbbf24; border-radius: 12px; padding: 18px; margin-bottom: 16px;">
                <div style="text-align: center; margin-bottom: 14px; font-family: sans-serif;">
                    <div style="font-size: 32px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));">🎓</div>
                    <h4 style="margin: 4px 0 0 0; font-size: 16px; font-weight: 800; color: #78350f; letter-spacing: 0.05em; text-transform: uppercase;">Honor Milestone Certificate</h4>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #92400e;">Awarded to ${learner.name} for persistent educational focus</p>
                </div>
                ${subList}
            </div>
        `;
    }

    // 3. Progress Chart / Competency Updates (with visual feedback bars)
    if (selectedSections.progressChart) {
        const lastSession = [...learner.sessions].filter(s => s.attended).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const updates = lastSession?.aiAnalysis?.competencyUpdates;
        let updatesHtml = '';
        if (updates && updates.length > 0) {
            updatesHtml = updates.map((update: any) => `
                <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="font-weight: bold; color: #1e293b; font-size: 14px;">${update.competencyName}</span>
                        <span style="font-size: 12px; font-weight: bold; color: #10b981; background-color: #d1fae5; padding: 2px 8px; border-radius: 12px;">🎉 +${update.suggestedProgress}%</span>
                    </div>
                    <div style="background-color: #f1f5f9; border-radius: 10px; height: 10px; width: 100%; overflow: hidden; margin-bottom: 6px;">
                        <div style="background-color: #10b981; height: 100%; border-radius: 10px; width: ${update.suggestedProgress || 50}%;"></div>
                    </div>
                    <p style="margin: 0; font-size: 12px; color: #475569; font-style: italic;">"${update.justification || 'Performance upswing detected by system tutor.'}"</p>
                </div>
            `).join('');
        } else {
            updatesHtml = `<p style="color: #6b7280; font-style: italic; font-size: 13px;">No explicit AI updates captured. Standard progress lines verified.</p>`;
        }

        sectionsHtml += `
            ${SectionHeader('Recent Competency Progress', '📈')}
            <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 16px; border-radius: 12px; margin-bottom: 16px;">
                ${updatesHtml}
            </div>
        `;
    }

    // 4. Learning Path / Skill log
    if (selectedSections.learningPath) {
        const recentSession = [...learner.sessions]
            .filter(s => s.attended)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        
        let skillsHtml = '';
        if (recentSession && recentSession.skillsLearned && recentSession.skillsLearned.length > 0) {
            skillsHtml = recentSession.skillsLearned.map((skill: string) => `
                <div style="display: inline-block; background-color: #eff6ff; border: 1.5px solid #3b82f6; border-radius: 8px; color: #1e3a8a; padding: 6px 12px; margin: 4px; font-size: 13px; font-weight: 600;">
                    🔹 ${skill}
                </div>
            `).join('');
        } else {
            skillsHtml = `<p style="color: #6b7280; font-style: italic;">No specific skills flagged in the last session. Consolidating baseline parameters.</p>`;
        }

        sectionsHtml += `
            ${SectionHeader('Active Skill Learning Path', '🗺️')}
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 12px; margin-bottom: 16px; text-align: center;">
                <p style="margin-top: 0; margin-bottom: 12px; font-size: 13px; color: #166534; font-weight: bold;">
                    Timeline highlights from our recent session${recentSession ? ` on ${format(new Date(recentSession.date), 'PPPP')}` : ''}:
                </p>
                <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 6px;">
                    ${skillsHtml}
                </div>
            </div>
        `;
    }

    // 5. Recent Sessions Logs
    if (selectedSections.recentSessions) {
        const recentSessions = [...(learner.sessions || [])]
            .filter(s => s.attended)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 2);

        let sessionsHtml = '';
        if (recentSessions.length > 0) {
            sessionsHtml = recentSessions.map(session => `
                <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02)">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 8px;">
                        <div>
                            <h4 style="margin: 0; font-size: 15px; font-weight: bold; color: #1e293b;">${session.lessonName || 'Comprehensive Topic Class'}</h4>
                            <span style="font-size: 11px; color: #64748b;">📅 ${format(new Date(session.date), 'PPPP')}  | ⏱️ ${session.duration} mins</span>
                        </div>
                        <div>
                            ${renderStarsHtml(session.rating || 5)}
                        </div>
                    </div>
                    ${session.aiAnalysis?.summary ? `
                        <p style="margin: 0 0 10px 0; font-size: 13px; line-height: 1.5; color: #475569; background: #f8fafc; border-left: 3px solid #3b82f6; padding: 8px 10px; border-radius: 0 6px 6px 0; font-style: italic;">
                            "${session.aiAnalysis.summary}"
                        </p>
                    ` : ''}
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px;">
                        <div>
                            <span style="font-weight: bold; color: #166534; display: block; margin-bottom: 4px;">✅ Core Strengths:</span>
                            <ul style="margin: 0; padding-left: 18px; color: #374151;">
                                ${(session.skillsLearned || session.aiAnalysis?.strengths || []).slice(0,3).map(s => `<li>${s}</li>`).join('')}
                            </ul>
                        </div>
                        <div>
                            <span style="font-weight: bold; color: #b91c1c; display: block; margin-bottom: 4px;">💡 Practice Recommendations:</span>
                            <ul style="margin: 0; padding-left: 18px; color: #374151;">
                                ${(session.needsHelp || session.aiAnalysis?.weaknesses || []).slice(0,3).map(w => `<li>${w}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            sessionsHtml = `<p style="color: #6b7280; font-style: italic; text-align: center;">No completed sessions found to summarize.</p>`;
        }

        sectionsHtml += `
            ${SectionHeader('Recent Session Logs', '🏫')}
            <div style="background-color: #faf5ff; border: 1px solid #e9d5ff; padding: 16px; border-radius: 12px; margin-bottom: 16px;">
                ${sessionsHtml}
            </div>
        `;
    }

    // 6. Attendance Calendar
    if (selectedSections.attendance) {
        const totalSessions = learner.sessions.length;
        const attended = learner.sessions.filter(s => s.attended).length;
        const cancelled = learner.sessions.filter(s => s.status === 'cancelled').length;
        const missed = learner.sessions.filter(s => s.status === 'missed').length;
        const attendanceRate = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 100;

        sectionsHtml += `
            ${SectionHeader('Attendance & Class Integrity', '📅')}
            <div style="background-color: #fff9db; border: 1px solid #ffe3e3; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <span style="font-weight: bold; color: #82c91e; font-size: 15px;">📊 Attendance Score:</span>
                    <span style="font-size: 18px; font-weight: 800; color: #c4f300; background-color: #1e1b4b; padding: 4px 10px; border-radius: 12px;">${attendanceRate}%</span>
                </div>
                <table width="100%" style="font-size: 13px; text-align: center; color: #495057;">
                    <tr>
                        <td style="padding: 8px; border-right: 1px solid #dee2e6;">
                            <div style="font-size: 18px; font-weight: bold; color: #2b8a3e;">${attended}</div>
                            <div style="color: #868e96; font-size: 11px;">ATTENDED</div>
                        </td>
                        <td style="padding: 8px; border-right: 1px solid #dee2e6;">
                            <div style="font-size: 18px; font-weight: bold; color: #e03131;">${missed}</div>
                            <div style="color: #868e96; font-size: 11px;">MISSED</div>
                        </td>
                        <td style="padding: 8px;">
                            <div style="font-size: 18px; font-weight: bold; color: #f08c00;">${cancelled}</div>
                            <div style="color: #868e96; font-size: 11px;">CANCELLED</div>
                        </td>
                    </tr>
                </table>
            </div>
        `;
    }

    // 7. Feedback
    if (selectedSections.feedback) {
        const feedbackSessions = [...learner.sessions]
            .filter(s => s.feedback)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 3);

        let feedHtml = '';
        if (feedbackSessions.length > 0) {
            feedHtml = feedbackSessions.map(sess => `
                <div style="background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
                    <div style="font-size: 11px; font-weight: bold; color: #7c3aed; margin-bottom: 4px;">📂 ${sess.lessonName || 'Comprehensive Feedback'} (${format(new Date(sess.date), 'MMM d, yyyy')})</div>
                    <p style="margin: 0; font-size: 13px; color: #495057; line-height: 1.45;">"${sess.feedback}"</p>
                </div>
            `).join('');
        } else {
            feedHtml = `<p style="color: #6b7280; font-style: italic; text-align: center;">No specific written comments filed currently.</p>`;
        }

        sectionsHtml += `
            ${SectionHeader('Tutor Direct Feedback', '💌')}
            <div style="background-color: #f3f0ff; border: 1px solid #d0bfff; padding: 16px; border-radius: 12px; margin-bottom: 16px;">
                ${feedHtml}
            </div>
        `;
    }

    // 8. Challenges
    if (selectedSections.challenges) {
        const chs = learner.challenges ? Object.entries(learner.challenges) : [];
        let chsHtml = '';
        if (chs.length > 0) {
            chsHtml = chs.map(([title, status]) => {
                const color = status === 'completed' ? '#10b981' : status === 'failed' ? '#ef4444' : '#e2e8f0';
                const textColor = status === 'completed' ? '#ffffff' : status === 'failed' ? '#ffffff' : '#475569';
                const label = status === 'completed' ? '🏆 Completed' : status === 'failed' ? '❌ Failed' : '🔥 Active';
                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; background-color: #ffffff; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; margin-bottom: 8px;">
                        <span style="font-weight: bold; color: #1e293b; font-size: 13px;">${title}</span>
                        <span style="font-size: 11px; font-weight: bold; font-family: monospace; background-color: ${color}; color: ${textColor}; padding: 3px 8px; border-radius: 12px;">${label}</span>
                    </div>
                `;
            }).join('');
        } else {
            chsHtml = `<p style="color: #6b7280; font-style: italic; text-align: center;">No active special challenge items assigned.</p>`;
        }

        sectionsHtml += `
            ${SectionHeader('Arena Quest Challenges', '🔥')}
            <div style="background-color: #fdf2f8; border: 1px solid #fbcfe8; padding: 16px; border-radius: 12px; margin-bottom: 16px;">
                ${chsHtml}
            </div>
        `;
    }

    // 9. Competition
    if (selectedSections.competition) {
        sectionsHtml += `
            ${SectionHeader('Duel Tournament Arena', '🏆')}
            <div style="background: linear-gradient(135deg, #1e1b4b 0%, #311042 100%); border: 2px solid #a21caf; border-radius: 12px; padding: 16px; color: #ffffff; margin-bottom: 16px;">
                <div style="text-align: center; margin-bottom: 12px;">
                    <div style="font-size: 28px;">👑</div>
                    <h4 style="margin: 2px 0 0 0; font-size: 15px; font-weight: bold; color: #f5d0fe;">LEADERBOARD DIVISION: DIAMOND RANK</h4>
                </div>
                <table width="100%" style="font-size: 13px; text-align: center; color: #ffffff;">
                    <tr>
                        <td style="width: 50%; padding: 4px; border-right: 1px solid rgba(255,255,255,0.15)">
                            <div style="font-size: 24px; font-weight: 800; color: #fbbf24;">${learner.competitionWins || 0}</div>
                            <div style="font-size: 11px; color: #e879f9; font-weight: bold; letter-spacing: 0.05em;">TOURNAMENT WINS</div>
                        </td>
                        <td style="width: 50%; padding: 4px;">
                            <div style="font-size: 24px; font-weight: 800; color: #c4f100;">#${Math.max(1, 8 - (learner.xp % 5))}</div>
                            <div style="font-size: 11px; color: #e879f9; font-weight: bold; letter-spacing: 0.05em;">DIAMOND STANDING</div>
                        </td>
                    </tr>
                </table>
            </div>
        `;
    }

    // 10. NEW: Learner Needs and Wants
    if (selectedSections.needs) {
        const needsList = learner.needs || [];
        let needsHtml = '';
        if (needsList.length > 0) {
            needsHtml = needsList.map((need: Need) => {
                const priorityColor = need.priority === 'high' ? '#ef4444' : need.priority === 'medium' ? '#f97316' : '#3b82f6';
                const statusLabel = need.status === 'resolved' ? '🎉 Resolved' : need.status === 'addressing' ? '⚙️ Tackling' : '📌 Identified';
                return `
                    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span style="font-weight: bold; color: #0f172a; font-size: 14px;">${need.name}</span>
                            <div style="display: flex; gap: 4px;">
                                <span style="font-size: 10px; font-weight: 700; background-color: ${priorityColor}; color: #ffffff; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">${need.priority || 'medium'}</span>
                                <span style="font-size: 10px; font-weight: 600; background-color: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px;">${statusLabel}</span>
                            </div>
                        </div>
                        ${need.description ? `<p style="margin: 0; font-size: 12px; color: #475569; line-height: 1.4;">${need.description}</p>` : ''}
                    </div>
                `;
            }).join('');
        } else {
            needsHtml = `<p style="color: #6b7280; font-style: italic; text-align: center;">No specific structural learning needs listed.</p>`;
        }

        sectionsHtml += `
            ${SectionHeader('Focus Goals & Identified Needs', '🎯')}
            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 12px; margin-bottom: 16px;">
                ${needsHtml}
            </div>
        `;
    }

    // 11. NEW: Active Homework Assignments
    if (selectedSections.homework) {
        const studentHomework = homeworkAssignments.filter(hw => hw.learnerId === learner.id);
        let hwHtml = '';
        if (studentHomework.length > 0) {
            hwHtml = studentHomework.map(hw => {
                const statusColors: Record<string, string> = {
                    assigned: '#3b82f6',
                    submitted: '#10b981',
                    reviewed: '#8b5cf6',
                    overdue: '#ef4444'
                };
                const bgColors: Record<string, string> = {
                    assigned: '#eff6ff',
                    submitted: '#ecfdf5',
                    reviewed: '#f5f3ff',
                    overdue: '#fef2f2'
                };
                const statusColor = statusColors[hw.status] || '#6b7280';
                const bgColor = bgColors[hw.status] || '#f9fafb';
                
                return `
                    <div style="background-color: ${bgColor}; border: 1px solid ${statusColor}; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span style="font-weight: bold; color: #1e293b; font-size: 14px;">📝 ${hw.title}</span>
                            <span style="font-size: 10px; font-weight: 700; background-color: ${statusColor}; color: #ffffff; padding: 2px 8px; border-radius: 12px; text-transform: uppercase;">${hw.status}</span>
                        </div>
                        <p style="margin: 0 0 6px 0; font-size: 12px; color: #475569; line-height: 1.45;">"${hw.description}"</p>
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; border-top: 1px dashed rgba(0,0,0,0.06); padding-top: 6px; margin-top: 6px;">
                            <span style="color: #ef4444; font-weight: 600;">📅 Deadline: ${hw.dueDate ? format(new Date(hw.dueDate), 'MMM d, yyyy') : 'No Date'}</span>
                            <span style="color: #f59e0b; font-weight: 700;">✨ Rewarding: +${hw.xpReward || 50} XP</span>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            hwHtml = `<p style="color: #6b7280; font-style: italic; text-align: center;">No homework assignments found currently.</p>`;
        }

        sectionsHtml += `
            ${SectionHeader('Active Homework & Missions', '📚')}
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 12px; margin-bottom: 16px;">
                ${hwHtml}
            </div>
        `;
    }

    // 12. NEW: Competencies Status
    if (selectedSections.competencies) {
        const competencies = learner.competencies || [];
        let compHtml = '';
        if (competencies.length > 0) {
            compHtml = competencies.map((comp: Competency) => {
                return `
                    <div style="margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; margin-bottom: 4px;">
                            <span style="font-weight: bold; color: #334155;">💡 ${comp.name} (${comp.type || 'General'})</span>
                            <span style="font-weight: bold; color: #4f46e5;">${comp.progress}% completed</span>
                        </div>
                        <div style="background-color: #e2e8f0; height: 8px; border-radius: 10px; width: 100%; overflow: hidden;">
                            <div style="background-color: #4f46e5; height: 100%; border-radius: 10px; width: ${comp.progress}%;"></div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            compHtml = `<p style="color: #6b7280; font-style: italic; text-align: center;">No structured competency charts configured.</p>`;
        }

        sectionsHtml += `
            ${SectionHeader('Skill Syllabus & Competencies', '🎓')}
            <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 16px; border-radius: 12px; margin-bottom: 16px;">
                ${compHtml}
            </div>
        `;
    }

    // 13. NEW: Session Review Ratings & Student Feedback
    if (selectedSections.sessionReviews) {
        const sessionsWithReview = [...(learner.sessionHistory || learner.sessions || [])]
            .filter((s: any) => s.review && s.review.stars)
            .slice(0, 2) as any[];

        /*
         * The four teaching-quality ratings, as a small table under the review text.
         *
         * Only the rows that were actually rated are emitted: a review written before these
         * existed has nothing to show, and printing "Clarity —" beside a five-star review would
         * read as a missing answer rather than a question that was never asked.
         */
        const skillRowsHtml = (ratings: any): string => {
            if (!ratings) return '';
            const rows = REVIEW_SKILLS.map(({ key, label }) => {
                const value = Number(ratings[key]);
                if (!Number.isFinite(value) || value <= 0) return '';
                return `<tr>
                    <td style="font-size: 11px; font-weight: bold; color: #475569; padding: 1px 8px 1px 0; white-space: nowrap;">${label}</td>
                    <td style="font-size: 11px; color: #b45309; letter-spacing: 1px; padding: 1px 0;">${'★'.repeat(value)}${'☆'.repeat(5 - value)}</td>
                </tr>`;
            }).filter(Boolean).join('');
            return rows
                ? `<table style="margin-top: 8px; border-collapse: collapse;">${rows}</table>`
                : '';
        };

        let reviewsHtml = '';
        if (sessionsWithReview.length > 0) {
            reviewsHtml = sessionsWithReview.map((sess: any) => {
                const rx = sess.review;
                return `
                    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #f1f5f9; padding-bottom: 6px; margin-bottom: 6px;">
                            <span style="font-weight: bold; color: #1e293b; font-size: 13px;">👨‍🎓 Student End-of-class Review</span>
                            <div>${renderStarsHtml(rx.stars)}</div>
                        </div>
                        ${rx.liked ? `<p style="margin: 0 0 4px 0; font-size: 12px; color: #0284c7;"><strong style="color: #0369a1;">❤️ Perfect spots:</strong> "${rx.liked}"</p>` : ''}
                        ${rx.disliked ? `<p style="margin: 0 0 4px 0; font-size: 12px; color: #b91c1c;"><strong style="color: #991b1b;">💡 Focus areas needed:</strong> "${rx.disliked}"</p>` : ''}
                        ${rx.expectationsMetOptions && rx.expectationsMetOptions.length > 0 ? `
                            <div style="margin-top: 6px; display: flex; flex-wrap: wrap; gap: 4px;">
                                ${rx.expectationsMetOptions.map((opt: string) => `
                                    <span style="font-size: 10px; font-weight: bold; background-color: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; padding: 2px 6px; border-radius: 12px; margin: 2px;">✔️ ${opt}</span>
                                `).join('')}
                            </div>
                        ` : ''}
                        ${skillRowsHtml(rx.skillRatings)}
                    </div>
                `;
            }).join('');
        } else {
            reviewsHtml = `<p style="color: #6b7280; font-style: italic; text-align: center;">No student survey reviews on file yet.</p>`;
        }

        sectionsHtml += `
            ${SectionHeader('Student Opinion & Survey Reviews', '⭐')}
            <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 16px; border-radius: 12px; margin-bottom: 16px;">
                ${reviewsHtml}
            </div>
        `;
    }

    // 14. NEW: Spaced Repetition Items
    if (selectedSections.spacedRepetition) {
        const repItems = spacedRepetitionItems.filter(item => item.learnerId === learner.id);
        let repHtml = '';
        if (repItems.length > 0) {
            repHtml = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px;">`;
            repHtml += repItems.slice(0, 6).map(item => `
                <div style="background-color: #ffffff; border: 1px solid #818cf8; border-radius: 6px; padding: 8px 10px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.02)">
                    <div style="font-weight: bold; color: #4338ca; font-size: 13px; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.content}</div>
                    <span style="font-size: 9px; font-weight: bold; background-color: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">${item.type}</span>
                    <div style="font-size: 8px; color: #6366f1; margin-top: 6px; font-weight: 600;">Due in: ${item.currentInterval || 1} days</div>
                </div>
            `).join('');
            repHtml += `</div>`;
        } else {
            repHtml = `<p style="color: #6b7280; font-style: italic; text-align: center;">No vocabulary scheduled for spaced repetition.</p>`;
        }

        sectionsHtml += `
            ${SectionHeader('Spaced Repetition Flashcards', '🧠')}
            <div style="background-color: #e0e7ff; border: 1px solid #a5b4fc; padding: 16px; border-radius: 12px; margin-bottom: 16px;">
                ${repHtml}
            </div>
        `;
    }

    // 15. NEW: Competency Radar Chart
    if (selectedSections.radarChart) {
        const comps = learner.competencies || [];
        const c1 = (comps[0]?.progress || 70) / 100 * 80;
        const c2 = (comps[1]?.progress || 55) / 100 * 80;
        const c3 = (comps[2]?.progress || 80) / 100 * 80;
        const c4 = (comps[3]?.progress || 60) / 100 * 80;
        const c5 = (comps[4]?.progress || 75) / 100 * 80;
        const c6 = (comps[5]?.progress || 65) / 100 * 80;
        
        const p1 = `110,${110 - c1}`;
        const p2 = `${110 + (c2 * 0.86)},${110 - (c2 * 0.5)}`;
        const p3 = `${110 + (c3 * 0.86)},${110 + (c3 * 0.5)}`;
        const p4 = `110,${110 + c4}`;
        const p5 = `${110 - (c5 * 0.86)},${110 + (c5 * 0.5)}`;
        const p6 = `${110 - (c6 * 0.86)},${110 - (c6 * 0.5)}`;
        const pointsStr = `${p1} ${p2} ${p3} ${p4} ${p5} ${p6}`;

        sectionsHtml += `
            ${SectionHeader('Diagnostic Competency Radar Map', '🕸️')}
            <div style="background-color: #fcfaff; border: 1px solid #dcd6ff; padding: 16px; border-radius: 12px; margin-bottom: 16px; text-align: center;">
                <p style="font-size: 13px; color: #4338ca; margin: 0 0 12px 0; font-weight: 600;">Overall multi-dimensional diagnostics on CEFR topics:</p>
                <div style="margin: 10px auto; width: 220px;">
                    <svg width="220" height="220" viewBox="0 0 220 220" style="display: block; margin: auto;">
                        <polygon points="110,10 195,60 195,160 110,210 25,160 25,60" fill="none" stroke="#e2e8f0" stroke-width="1.5" />
                        <polygon points="110,35 174,72 174,148 110,185 46,148 46,72" fill="none" stroke="#cbd5e1" stroke-width="1.5" />
                        <polygon points="110,60 152,85 152,135 110,160 68,135 68,85" fill="none" stroke="#94a3b8" stroke-dasharray="3,3" />
                        <polygon points="110,85 131,97 131,123 110,135 89,123 89,97" fill="none" stroke="#cbd5e1" stroke-dasharray="2,2" />
                        
                        <line x1="110" y1="110" x2="110" y2="10" stroke="#cbd5e1" stroke-width="1" />
                        <line x1="110" y1="110" x2="195" y2="60" stroke="#cbd5e1" stroke-width="1" />
                        <line x1="110" y1="110" x2="195" y2="160" stroke="#cbd5e1" stroke-width="1" />
                        <line x1="110" y1="110" x2="110" y2="210" stroke="#cbd5e1" stroke-width="1" />
                        <line x1="110" y1="110" x2="25" y2="160" stroke="#cbd5e1" stroke-width="1" />
                        <line x1="110" y1="110" x2="25" y2="60" stroke="#cbd5e1" stroke-width="1" />
                        
                        <polygon points="${pointsStr}" fill="rgba(99, 102, 241, 0.25)" stroke="#6366f1" stroke-width="2.5" />
                    </svg>
                </div>
                <div style="display: flex; justify-content: space-around; font-size: 10px; color: #64748b; font-weight: bold; margin-top: 10px;">
                    <span>⭐ Vocab</span>
                    <span>🗣️ Oral</span>
                    <span>✍️ Written</span>
                    <span>📚 Grammar</span>
                </div>
            </div>
        `;
    }

    // 16. NEW: Specialized Skill Tree
    if (selectedSections.skillTree) {
        const isAdvanced = (learner.xp || 0) >= 600;
        const isIntermediate = (learner.xp || 0) >= 350;

        sectionsHtml += `
            ${SectionHeader('Specialized Syllabus Skill Tree', '🌳')}
            <div style="background-color: #fafdf6; border: 1px solid #d5ebae; padding: 20px 16px; border-radius: 12px; margin-bottom: 16px;">
                <div style="display: flex; flex-direction: column; align-items: center; position: relative; gap: 20px;">
                    <div style="border: 2px solid #84cc16; background-color: #f7fee7; border-radius: 12px; padding: 8px 14px; width: 170px; text-align: center; z-index: 2;">
                        <span style="font-size: 9px; font-weight: 800; color: #4d7c0f; text-transform: uppercase;">Primary Tier</span>
                        <div style="font-weight: bold; font-size: 13px; color: #1a2e05; margin-top: 2px;">🌱 Grammar Beginnings</div>
                        <span style="font-size: 9px; font-weight: bold; color: #84cc16; margin-top: 2px; display: block;">✓ unlocked</span>
                    </div>
                    
                    <div style="width: 2px; height: 110px; background-color: #84cc16; position: absolute; top: 44px; left: 50%; transform: translateX(-50%); z-index: 1;"></div>
                    
                    <div style="border: 2px solid ${isIntermediate ? '#10b981' : '#94a3b8'}; background-color: ${isIntermediate ? '#ecfdf5' : '#f8fafc'}; border-radius: 12px; padding: 8px 14px; width: 170px; text-align: center; z-index: 2;">
                        <span style="font-size: 9px; font-weight: 800; color: ${isIntermediate ? '#047857' : '#475569'}; text-transform: uppercase;">Intermediate Tier</span>
                        <div style="font-weight: bold; font-size: 13px; color: #1e293b; margin-top: 2px;">🗣️ Conversational Agility</div>
                        <span style="font-size: 9px; font-weight: bold; color: ${isIntermediate ? '#10b981' : '#94a3b8'}; margin-top: 2px; display: block;">
                            ${isIntermediate ? '✓ unlocked' : '🔒 Locked at 350 XP'}
                        </span>
                    </div>

                    <div style="border: 2px solid ${isAdvanced ? '#10b981' : '#94a3b8'}; background-color: ${isAdvanced ? '#ecfdf5' : '#f8fafc'}; border-radius: 12px; padding: 8px 14px; width: 170px; text-align: center; z-index: 2;">
                        <span style="font-size: 9px; font-weight: 800; color: ${isAdvanced ? '#047857' : '#475569'}; text-transform: uppercase;">Mastery Tier</span>
                        <div style="font-weight: bold; font-size: 13px; color: #1e293b; margin-top: 2px;">⚡ Fluent Expression</div>
                        <span style="font-size: 9px; font-weight: bold; color: ${isAdvanced ? '#10b981' : '#94a3b8'}; margin-top: 2px; display: block;">
                            ${isAdvanced ? '✓ unlocked' : '🔒 Locked at 600 XP'}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }

    // 17. NEW: Activity Heatmap continuous monthly grid
    if (selectedSections.heatmap) {
        let heatmapCells = '';
        const sessionHistoryDates = new Set<string>();
        
        if (learner.sessions && Array.isArray(learner.sessions)) {
            learner.sessions.forEach((s: any) => {
                if (s.attended && s.date) {
                    try {
                        const dateKey = s.date.split('T')[0];
                        sessionHistoryDates.add(dateKey);
                    } catch (e) {}
                }
            });
        }

        // Generate last 28 days back from today
        const todayRef = new Date();
        for (let j = 27; j >= 0; j--) {
            const d = new Date();
            d.setDate(todayRef.getDate() - j);
            const dateKey = d.toISOString().split('T')[0];
            const hasActivity = sessionHistoryDates.has(dateKey);
            const bgHex = hasActivity ? '#10b981' : '#e2e8f0';
            const hoverLabel = `${format(d, 'MMM d')}: ${hasActivity ? 'Attended Category Session' : 'No Study Record'}`;
            heatmapCells += `<span style="display: inline-block; width: 14px; height: 14px; background-color: ${bgHex}; border-radius: 3px; margin: 2px;" title="${hoverLabel}"></span>`;
        }

        sectionsHtml += `
            ${SectionHeader('Continuous Attendance Heatmap Grid', '🟩')}
            <div style="background-color: #f1fcf8; border: 1px solid #cbf0e3; padding: 16px; border-radius: 12px; margin-bottom: 16px; text-align: center;">
                <p style="font-size: 12px; color: #0f172a; margin: 0 0 12px 0; font-weight: bold;">Daily Classroom Interaction Frequency (Past 4 Weeks):</p>
                <div style="display: flex; gap: 4px; justify-content: center; flex-wrap: wrap; width: 280px; margin: auto;">
                    ${heatmapCells}
                </div>
                <div style="margin-top: 10px; font-size: 10px; color: #64748b; font-weight: bold;">
                    🔥 Streak Loyalty Score: <span style="color: #ec4899;">${learner.streak || 0} continuous study days!</span>
                </div>
            </div>
        `;
    }

    // 18. NEW: Academic Records & Bests
    if (selectedSections.records) {
        sectionsHtml += `
            ${SectionHeader('Cumulative Performance Records & Bests', '🏅')}
            <div style="background-color: #fcfcfc; border: 1px solid #cbd5e1; padding: 14px; border-radius: 12px; margin-bottom: 16px;">
                <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 12.5px; border-collapse: collapse;">
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="font-weight: bold; color: #1e293b;">🔥 HIGH STREAK MAXIMUM</td>
                        <td style="text-align: right; font-weight: bold; color: #ef4444;">${Math.max(learner.streak || 0, 10)} Days</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="font-weight: bold; color: #1e293b;">⭐ TOTAL LEVEL SCORE</td>
                        <td style="text-align: right; font-weight: bold; color: #4f46e5;">Lvl ${learner.level || 1} (${learner.xp || 120} XP Total)</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="font-weight: bold; color: #1e293b;">🏫 SESSIONS COMPLETED LOG</td>
                        <td style="text-align: right; font-weight: bold; color: #10b981;">${learner.sessions.length} Lessons</td>
                    </tr>
                </table>
            </div>
        `;
    }

    // 19. NEW: Term Calendar
    if (selectedSections.termCalendar) {
        sectionsHtml += `
            ${SectionHeader('Syllabus Term Progression Calendar', '📆')}
            <div style="background-color: #ffffff; border: 1px solid #cbd5e1; padding: 16px; border-radius: 12px; margin-bottom: 16px; text-align: center;">
                <p style="font-size: 12.5px; color: #312e81; font-weight: bold; margin: 0 0 12px 0;">12-Week Course Module Targets:</p>
                <div style="display: flex; gap: 8px; justify-content: space-around;">
                    <div style="background-color: #edf2f7; padding: 6px; border-radius: 6px; border-top: 3px solid #10b981; width: 22%">
                        <div style="font-size: 8px; font-weight: 800; color: #4a5568;">W1-W3</div>
                        <strong style="font-size: 11px; color: #2d3748; display: block; margin-top: 2px;">Core</strong>
                        <span style="font-size: 8px; color: #48bb78; font-weight: bold;">Passed</span>
                    </div>
                    <div style="background-color: #edf2f7; padding: 6px; border-radius: 6px; border-top: 3px solid #10b981; width: 22%">
                        <div style="font-size: 8px; font-weight: 800; color: #4a5568;">W4-W6</div>
                        <strong style="font-size: 11px; color: #2d3748; display: block; margin-top: 2px;">Tense Slopes</strong>
                        <span style="font-size: 8px; color: #48bb78; font-weight: bold;">Passed</span>
                    </div>
                    <div style="background-color: #eff6ff; padding: 6px; border-radius: 6px; border-top: 3px solid #2b6cb0; width: 22%">
                        <div style="font-size: 8px; font-weight: 800; color: #2b6cb0;">W7-W9</div>
                        <strong style="font-size: 11px; color: #1a365d; display: block; margin-top: 2px;">Dialogue</strong>
                        <span style="font-size: 8px; color: #2b6cb0; font-weight: bold;">Current</span>
                    </div>
                    <div style="background-color: #f7fafc; padding: 6px; border-radius: 6px; border-top: 3px solid #cbd5e1; opacity: 0.65; width: 22%">
                        <div style="font-size: 8px; font-weight: 800; color: #718096;">W10-W12</div>
                        <strong style="font-size: 11px; color: #4a5568; display: block; margin-top: 2px;">Mastery</strong>
                        <span style="font-size: 8px; color: #718096; font-weight: bold;">Locked</span>
                    </div>
                </div>
            </div>
        `;
    }

    // 20. NEW: SMART Goals Trajectory
    if (selectedSections.smartGoals) {
        sectionsHtml += `
            ${SectionHeader('SMART Goals & Success Trajectory', '🎯')}
            <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; padding: 16px; border-radius: 12px; margin-bottom: 16px;">
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 4px;">
                        <strong style="color: #6366f1;">🎯 Specific: Rapid Vocab Assimilation Rate</strong>
                        <span style="font-weight: bold; color: #4338ca;">85% Trajectory</span>
                    </div>
                    <div style="background-color: #e2e8f0; height: 6px; border-radius: 10px; width: 100%; overflow: hidden;">
                        <div style="background-color: #6366f1; height: 100%; border-radius: 10px; width: 85%;"></div>
                    </div>
                </div>
                <p style="margin: 0; font-size: 11.5px; color: #5b21b6; line-height: 1.45;">
                    <strong>Measure:</strong> Master 30 critical idioms by tomorrow. Weekly exams verify progress is moving ahead of schedule.
                </p>
            </div>
        `;
    }

    // 21. NEW: Chats as personalized template messages
    if (selectedSections.chatsTemplate) {
        sectionsHtml += `
            ${SectionHeader('Personalized Interactive Chat Dialogue', '💬')}
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; margin-bottom: 16px;">
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <div style="align-self: flex-start; max-width: 85%; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 14px 14px 14px 0px; padding: 10px 12px; font-size: 12.5px; color: #0f172a;">
                        "Hello ${learner.name}! We noticed outstanding performance in today's multiplayer duel. How did you feel about the conditional modifiers?"
                        <span style="display: block; font-size: 9px; color: #64748b; text-align: right; margin-top: 4px; font-weight: 800;">Academic Mentor 🤖</span>
                    </div>
                    <div style="align-self: flex-end; max-width: 85%; background-color: #3b82f6; border-radius: 14px 14px 0px 14px; padding: 10px 12px; font-size: 12.5px; color: #ffffff;">
                        "I loved them! The speed limits in the 3D matching quest really pushed me to read much faster."
                        <span style="display: block; font-size: 9px; color: #93c5fd; text-align: right; margin-top: 4px; font-weight: bold;">${learner.name} ⚡</span>
                    </div>
                </div>
            </div>
        `;
    }

    // 22. NEW: Automation & Financial Scorecard
    if (selectedSections.automationAndAnalytics) {
        sectionsHtml += `
            ${SectionHeader('Financial Ledger & Automation Campaign Status', '📊')}
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 12px; margin-bottom: 16px;">
                <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 12.5px; border-collapse: collapse;">
                    <tr style="border-bottom: 1px solid #dcfce7;">
                        <td style="font-weight: bold; color: #166534;">📦 PACKAGE STATUS PLAN</td>
                        <td style="text-align: right; font-weight: bold; color: #15803d;">8 of 12 Lessons Available</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #dcfce7;">
                        <td style="font-weight: bold; color: #166534;">💳 FINANCIAL ACCOUNT STANDING</td>
                        <td style="text-align: right; font-weight: bold; color: #15803d;">Active & Paid ($45.00/hr)</td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold; color: #166534;">⚙️ COMPILING ACTIVE CAMPAIGNS</td>
                        <td style="text-align: right; font-weight: bold; color: #15803d;">Active campaigns (Daily alerts)</td>
                    </tr>
                </table>
            </div>
        `;
    }

    // Wrap in standard full-styled HTML email wrapper
    const totalHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
    <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e5e7eb;">
        <!-- Banner Header -->
        <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); padding: 30px 24px; text-align: center; border-bottom: 4px solid #6366f1;">
            <div style="font-size: 28px; margin-bottom: 6px;">⚡</div>
            <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">TUTOR ACADEMY EMAIL SUITE</h1>
            <p style="margin: 4px 0 0 0; color: #a5b4fc; font-size: 13px;">Official Academic Sync & Student Report Dashboard</p>
        </div>

        <!-- Body content -->
        <div style="padding: 24px; color: #334155; line-height: 1.6;">
            <!-- Greeting text box -->
            <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 16px; border-radius: 0 12px 12px 0; margin-bottom: 24px; font-size: 15px; color: #1e293b; font-style: italic;">
                "${greeting.replace(/\n/g, '<br />')}"
            </div>

            <!-- Custom User Alert Box -->
            ${alertHtml}

            <!-- Sections lists -->
            ${sectionsHtml}

            <!-- Footer signature -->
            <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 11px; line-height: 1.5;">
                <p style="margin: 0; font-weight: bold; color: #475569;">Best regards from your tutor.</p>
                <p style="margin: 6px 0 0 0;">© 2026 Tutor Academy. All Rights Reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
    `;

    return totalHtml;
}

// Keep the plain text option but make it far more visual and nicely structured as plain text
export function generateEmailPlainText(learner: Learner, selectedSections: Record<string, boolean>, spacingItems: string[] = [], data?: EmailPreviewData): string {
    let bodyContent = '';
    
    const Divider = (title: string) => `\n==========================================\n🎓 ${title.toUpperCase()}\n==========================================\n`;

    if (data?.customAlert && data.customAlert.text.trim()) {
        bodyContent += `\n[🚨 ${data.customAlert.title || 'IMPORTANT NOTICE'}]\n`;
        bodyContent += `${data.customAlert.text.trim()}\n`;
        bodyContent += `==========================================\n`;
    }

    if (selectedSections.overview) {
        const totalHours = Math.round(learner.sessions.reduce((acc, s) => acc + (s.attended ? s.duration || 0 : 0), 0) / 60);
        bodyContent += Divider('Profile Overview');
        bodyContent += `- Student Name: ${learner.name}\n`;
        bodyContent += `- Earned XP: ${learner.xp} pts ✨\n`;
        bodyContent += `- Active Streak: ${learner.streak} Days 🔥\n`;
        bodyContent += `- Cumulative Hours: ${totalHours} hours ⏱️\n`;
        bodyContent += `- Verified CEFR Level: ${getCEFRLevel(learner)} 🎓\n`;
    }

    if (selectedSections.achievements) {
        bodyContent += Divider('Earned Achievements & Honor Milestones');
        if (learner.achievements && learner.achievements.length > 0) {
            learner.achievements.forEach(ach => {
                bodyContent += `🏆 ${ach.title || ach.name} - ${ach.description} (Earned: ${ach.dateEarned ? format(new Date(ach.dateEarned), 'MMM d, yyyy') : 'Recently'})\n`;
            });
        } else {
            bodyContent += `Keep pushing to unlock special class certificates!\n`;
        }
    }

    if (selectedSections.progressChart) {
        bodyContent += Divider('Recent Skill Competency Changes');
        const lastSession = [...learner.sessions].filter(s => s.attended).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const updates = lastSession?.aiAnalysis?.competencyUpdates;
        if (updates && updates.length > 0) {
            updates.forEach((u: any) => {
                bodyContent += `⭐ ${u.competencyName} is elevated by +${u.suggestedProgress || 10}%\n   Justification: "${u.justification || 'Tutor observations.'}"\n`;
            });
        } else {
            bodyContent += `All primary competency indicators remain stable.\n`;
        }
    }

    if (selectedSections.learningPath) {
        bodyContent += Divider('Learning Path Milestones');
        const recentSession = [...learner.sessions]
            .filter(s => s.attended)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        if (recentSession && recentSession.skillsLearned && recentSession.skillsLearned.length > 0) {
            bodyContent += `Learned in session on ${format(new Date(recentSession.date), 'PPPP')}:\n`;
            recentSession.skillsLearned.forEach(s => {
                bodyContent += ` - 🗺️ ${s}\n`;
            });
        } else {
            bodyContent += `Routine session focus is logged.\n`;
        }
    }

    if (selectedSections.recentSessions) {
        bodyContent += Divider('Recent Session Logs');
        const recent = [...(learner.sessions || [])]
            .filter(s => s.attended)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 2);
        if (recent.length > 0) {
            recent.forEach(s => {
                const ratingStars = '★'.repeat(s.rating || 5) + '☆'.repeat(5 - (s.rating || 5));
                bodyContent += `🏫 Topic Class: ${s.lessonName || 'Comprehensive Skill Session'}\n`;
                bodyContent += `   Rating: ${ratingStars} | Duration: ${s.duration} minutes\n`;
                if (s.aiAnalysis?.summary) {
                    bodyContent += `   Notes: "${s.aiAnalysis.summary}"\n`;
                }
                bodyContent += `\n`;
            });
        } else {
            bodyContent += `No sessions logged in database.\n`;
        }
    }

    if (selectedSections.attendance) {
        bodyContent += Divider('Attendance Integrity');
        const total = learner.sessions.length;
        const attended = learner.sessions.filter(s => s.attended).length;
        const rate = total > 0 ? Math.round((attended / total) * 100) : 100;
        bodyContent += `✔️ Completed Classes: ${attended} of ${total} total sessions\n`;
        bodyContent += `📊 Attendance Integrity rate: ${rate}%\n`;
    }

    return bodyContent;
}
