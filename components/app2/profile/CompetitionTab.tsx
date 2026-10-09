import React, { useState, useEffect, useRef } from 'react';
import { toBlob } from 'html-to-image';
import { Learner, HomeworkAssignment } from '../../../types2';
import { useLearnerStore } from '../../../store/useLearnerStore';
import { useAutomationStore } from '../../../store/useAutomationStore';
import { getAvatarUrl } from '../../../services/avatarService';
import SectionCard from '../SectionCard';
import { sendEmailWithAIGreeting } from '../../../utils/emailSender';
import { getWeeklyActivityStats, compareWeeklyStats, formatMinutes, WEEKLY_STAT_ROWS, getWeekNumber } from '../../../utils/weeklyStats';
import { getCategoryById } from '../../../data/learnerCategories';

// Countdown until the end of the WEEK (Sunday 23:59:59) — the Weekly Competition deadline
const calculateTimeLeft = () => {
    const now = new Date();
    const endOfWeek = new Date(now);
    const daysUntilSunday = (7 - endOfWeek.getDay()) % 7;
    endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday);
    endOfWeek.setHours(23, 59, 59, 999);
    const diff = Math.max(0, endOfWeek.getTime() - now.getTime());
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${String(days).padStart(2, '0')}d : ${String(hours).padStart(2, '0')}h : ${String(minutes).padStart(2, '0')}m : ${String(seconds).padStart(2, '0')}s`;
};

const CompetitionTab: React.FC<{ learner: Learner, isForScreenshot?: boolean }> = ({ learner, isForScreenshot = false }) => {
    const learners = useLearnerStore(state => state.learners);
    const toggleCompetition = useLearnerStore(state => state.toggleCompetition);
    const declareWinner = useLearnerStore(state => state.declareWinner);
    const homeworkAssignments = useAutomationStore(state => state.homeworkAssignments);

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
    const posterRef = useRef<HTMLDivElement>(null);
    const [emailButtonState, setEmailButtonState] = useState<'idle' | 'generating' | 'generated'>('idle');
    const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);

    useEffect(() => {
        if (isForScreenshot) return;
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);
        return () => clearInterval(timer);
    }, [isForScreenshot]);

    const opponent = learners.find(l => l.id === learner.currentOpponentId);

    const handleCopyPoster = () => {
        if (posterRef.current) {
            toBlob(posterRef.current, { 
                pixelRatio: 2, 
                cacheBust: true, 
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
            } as any).then(blob => {
                if (blob) {
                    navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
                        .then(() => alert('Poster copied to clipboard!'))
                        .catch(err => {
                            console.error('Failed to copy image', err);
                            alert('Could not copy poster to clipboard. Your browser might not support this feature or permission was denied.');
                        });
                }
            });
        }
    };

    const handleEmailFlow = async () => {
        if (emailButtonState === 'idle') {
            if (posterRef.current) {
                setEmailButtonState('generating');
                try {
                    const blob = await toBlob(posterRef.current, { 
                        pixelRatio: 2, 
                        cacheBust: true, 
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
                    } as any);
                    if (blob) {
                        setGeneratedBlob(blob);
                        setEmailButtonState('generated');
                    } else {
                        throw new Error("Blob conversion failed.");
                    }
                } catch (err) {
                    console.error("Error generating poster image:", err);
                    alert("Could not generate the poster image.");
                    setEmailButtonState('idle');
                }
            }
        } else if (emailButtonState === 'generated' && generatedBlob) {
            try {
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': generatedBlob })]);
                const bodyContent = `Check out your latest competition poster!\n\nI've copied it to your clipboard. Just paste it into this email to see it (Ctrl+V or Cmd+V).\n\nGood luck!`;
                await sendEmailWithAIGreeting({
                    learner,
                    topic: `Competition Poster`,
                    subject: `Your Weekly Competition Poster! 🏆`,
                    bodyContent,
                });
                setEmailButtonState('idle');
                setGeneratedBlob(null);
            } catch (err) {
                console.error("Failed to copy or email poster:", err);
                alert("Could not copy the poster to the clipboard. Your browser might not support this feature or permission was denied.");
                setEmailButtonState('generated');
            }
        }
    };


    const PosterContent = (
        <div ref={posterRef}>
            <div className="relative w-full h-[350px] overflow-hidden rounded-xl shadow-lg border-4 border-black">
                {/* Backgrounds */}
                <div 
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(75deg, #1CB0F6 calc(50% - 10px), #000 calc(50% - 10px), #000 calc(50% + 10px), #FF4B4B calc(50% + 10px))`
                  }}
                ></div>

                {/* Content */}
                <div className="absolute inset-0 flex justify-around items-center p-4">
                    {/* Player 1 */}
                    <div className="flex flex-col items-center gap-2 z-10">
                        <button onClick={() => !isForScreenshot && opponent && declareWinner(learner.id, opponent.id)} title={`Declare ${learner.name} as winner`} disabled={!opponent || isForScreenshot} className="disabled:cursor-not-allowed">
                            <div className="bg-white p-2 rounded-md shadow-lg transform -rotate-6">
                                <img src={getAvatarUrl(learner.gender, learner.avatarId, learner.name)} alt={learner.name} className="w-32 h-32 object-cover rounded" />
                            </div>
                        </button>
                        <div className="bg-black text-white font-bold px-4 py-1 rounded-md text-lg shadow-lg">{learner.name}</div>
                        <div className="bg-white text-black font-bold px-3 py-1 rounded-full text-sm shadow-lg">Wins: {learner.competitionWins || 0}</div>
                    </div>

                    {/* VS Circle */}
                    <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-black rounded-full flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 z-20 border-4 border-white">
                        <span className="text-white text-4xl font-extrabold">VS</span>
                    </div>

                    {/* Player 2 */}
                    <div className="flex flex-col items-center gap-2 z-10">
                        {opponent ? (
                            <>
                                <button onClick={() => !isForScreenshot && declareWinner(opponent.id, learner.id)} title={`Declare ${opponent.name} as winner`} disabled={isForScreenshot}>
                                    <div className="bg-white p-2 rounded-md shadow-lg transform rotate-6">
                                        <img src={getAvatarUrl(opponent.gender, opponent.avatarId, opponent.name)} alt={opponent.name} className="w-32 h-32 object-cover rounded" />
                                    </div>
                                </button>
                                <div className="bg-black text-white font-bold px-4 py-1 rounded-md text-lg shadow-lg">{opponent.name}</div>
                                <div className="bg-white text-black font-bold px-3 py-1 rounded-full text-sm shadow-lg">Wins: {opponent.competitionWins || 0}</div>
                            </>
                        ) : (
                            <div className="bg-white p-2 rounded-md shadow-lg transform rotate-6 w-[144px] h-[144px] flex items-center justify-center">
                                <div className="text-5xl font-bold text-gray-300">?</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
    
    if (isForScreenshot) {
        return PosterContent;
    }

    return (
        <SectionCard title="Weekly Competition" icon={<i className="fas fa-trophy"></i>}>
            <div className="space-y-6">
                {PosterContent}

                <div className="p-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800">
                    <div className="text-center sm:text-left">
                        <p className="font-bold text-lg">Weekly Matchmaking Deadline (Sunday 23:59):</p>
                        <p className="font-mono text-3xl sm:text-4xl font-extrabold text-brand-green">{timeLeft}</p>
                        <p className="text-xs text-indigo-100 mt-1 dark:text-gray-400">🤖 Self-running: at the deadline this learner's week is compared with their rival — the winner is auto-awarded +100 XP & a Week record, then everyone is re-paired two-by-two inside the same category.</p>
                    </div>
                    <div className="flex flex-col items-center gap-3">
                         <label className="flex items-center gap-3 cursor-pointer bg-white/15 p-3 rounded-lg dark:bg-gray-700">
                            <input type="checkbox" checked={learner.isCompeting || false} onChange={() => toggleCompetition(learner.id)} className="h-6 w-6 rounded text-brand-green focus:ring-brand-green" />
                            <span className="font-bold">Participate in weekly matching</span>
                        </label>
                        <div className="flex gap-2">
                            <button onClick={handleCopyPoster} className="bg-white/20 text-white font-bold py-2 px-4 rounded-lg hover:bg-white/30 transition-colors dark:bg-gray-600 dark:hover:bg-gray-700">
                                <i className="fas fa-copy mr-2"></i>Copy
                            </button>
                             <button onClick={handleEmailFlow} disabled={emailButtonState === 'generating'} className="bg-brand-blue text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400">
                                {emailButtonState === 'idle' && <><i className="fas fa-envelope mr-2"></i>Email Poster</>}
                                {emailButtonState === 'generating' && <><i className="fas fa-spinner fa-spin mr-2"></i>Generating...</>}
                                {emailButtonState === 'generated' && <><i className="fas fa-clipboard-check mr-2"></i>Copy & Email</>}
                            </button>
                        </div>
                    </div>
                </div>

                <WeeklyDuel learner={learner} opponent={opponent} learners={learners} />

                <div>
                    <h3 className="text-xl font-bold mb-3">Victory Log</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {(learner.weeklyWinRecords || []).length > 0 ? (
                            [...(learner.weeklyWinRecords || [])].reverse().map((record, index) => (
                                <div key={index} className="flex items-center gap-3 p-2 bg-green-50 rounded-lg border-l-4 border-brand-green">
                                    <img src={getAvatarUrl(learner.gender, learner.avatarId, learner.name)} alt={learner.name} className="w-10 h-10 rounded-full" />
                                    <div className="flex-1">
                                        <p className="font-semibold">Defeated <span className="font-bold">{record.opponentName}</span></p>
                                        <p className="text-xs text-gray-500">{new Date(record.date).toLocaleDateString()} • Week {record.week}, {record.year}</p>
                                    </div>
                                    <span className="text-xs font-black px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 shrink-0" title="Auto-awarded bonus XP for the weekly duel win">
                                        +{record.bonusXp} XP 🎁
                                    </span>
                                </div>
                            ))
                        ) : (learner.matchHistory || []).length > 0 ? (
                            [...(learner.matchHistory || [])].reverse().map((match, index) => (
                                <div key={index} className="flex items-center gap-3 p-2 bg-green-50 rounded-lg border-l-4 border-brand-green">
                                    <img src={getAvatarUrl(match.opponentGender, match.opponentAvatarId, match.opponentName)} alt={match.opponentName} className="w-10 h-10 rounded-full" />
                                    <div>
                                        <p className="font-semibold">Defeated <span className="font-bold">{match.opponentName}</span></p>
                                        <p className="text-xs text-gray-500">{new Date(match.date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 text-center p-4">No victories recorded yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </SectionCard>
    );
};

// ============ WEEKLY DUEL — activity comparison over the last 7 days ============
const WeeklyDuel: React.FC<{ learner: Learner; opponent?: Learner; learners?: Learner[] }> = ({ learner, opponent, learners = [] }) => {
    const homeworkAssignments = useAutomationStore(state => state.homeworkAssignments);
    const myStats = getWeeklyActivityStats(learner, homeworkAssignments);
    const oppStats = opponent ? getWeeklyActivityStats(opponent, homeworkAssignments) : null;
    const myCategory = getCategoryById(learner.category);
    const oppCategory = opponent ? getCategoryById(opponent.category) : undefined;

    if (!opponent) {
        return (
            <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-dashed border-amber-300 rounded-xl text-center">
                <div className="text-3xl mb-2">⚔️</div>
                <h3 className="font-extrabold text-amber-900 text-lg">No opponent assigned yet</h3>
                <p className="text-xs text-amber-700 mt-1 font-medium">
                    Click <span className="font-black">Reassign Players</span> on the Dashboard leaderboard to pair this learner two-by-two with another learner from the same category ({myCategory?.name || 'any'}).
                </p>
            </div>
        );
    }

    const edge = compareWeeklyStats(myStats, oppStats);

    // Category rank of this learner this week (by weekly XP within the same category)
    const categoryRank = (() => {
        const sameCategory = learners.filter(l => l.category === learner.category && l.id !== learner.id);
        const ranked = [...sameCategory, learner]
            .filter(l => l.isCompeting || true)
            .sort((a, b) => getWeeklyActivityStats(b, homeworkAssignments).xpEarned - getWeeklyActivityStats(a, homeworkAssignments).xpEarned);
        const pos = ranked.findIndex(l => l.id === learner.id);
        return pos === -1 ? null : { rank: pos + 1, total: ranked.length };
    })();

    // Challenge board progress (from learner.challenges)
    const challenges = Object.entries(learner.challenges || {});
    const challengesDone = challenges.filter(([, s]) => s === 'completed').length;

    const downloadDuelReportCard = () => {
        const statsRow = (label: string, icon: string, mine: string, theirs: string, winner: 'a' | 'b' | 'tie') => `
            <tr>
                <td class="metric">${icon} ${label}</td>
                <td class="${winner === 'a' ? 'win' : ''}">${winner === 'a' ? '🥇 ' : ''}${mine}</td>
                <td class="${winner === 'b' ? 'win' : ''}">${winner === 'b' ? '🥇 ' : ''}${theirs}</td>
            </tr>`;

        const rows = WEEKLY_STAT_ROWS.map(row => {
            const myVal = myStats[row.key as keyof typeof myStats] as number;
            const oppVal = oppStats![row.key as keyof typeof oppStats] as number;
            const winner = row.better(myVal, oppVal);
            return statsRow(row.label, row.icon, row.value(myStats), row.value(oppStats!), winner);
        }).join('');

        const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Weekly Duel Report — ${learner.name}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; margin: 0; padding: 40px; background: #f1f5f9; }
  .sheet { max-width: 860px; margin: 0 auto; background: #fff; border-radius: 18px; box-shadow: 0 10px 40px rgba(15,23,42,.12); overflow: hidden; }
  .head { background: linear-gradient(120deg, #4f46e5, #9333ea, #e11d48); color: #fff; padding: 28px 32px; }
  .head h1 { margin: 0 0 4px; font-size: 24px; }
  .head p { margin: 2px 0; opacity: .9; font-size: 13px; }
  .body { padding: 24px 32px 32px; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin: 28px 0 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 9px 12px; border-bottom: 1px solid #eef2f7; text-align: left; }
  th { background: #f8fafc; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }
  td.metric { font-weight: 700; }
  td.win { background: #ecfdf5; color: #047857; font-weight: 800; }
  .vs { text-align: center; font-size: 22px; font-weight: 900; color: #64748b; padding: 14px 0; }
  .pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; }
  .pill.g { background: #d1fae5; color: #065f46; } .pill.r { background: #ffe4e6; color: #9f1239; } .pill.y { background: #fef3c7; color: #92400e; }
  .cards { display: flex; gap: 14px; flex-wrap: wrap; }
  .card { flex: 1; min-width: 200px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; }
  .card .num { font-size: 26px; font-weight: 900; color: #4f46e5; }
  .card .lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: .5px; margin-top: 2px; }
  .foot { padding: 16px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
</style></head><body>
  <div class="sheet">
    <div class="head">
      <h1>⚔️ Weekly Duel Report Card — Week ${getWeekNumber(new Date())}</h1>
      <p><strong>${learner.name}</strong> (${myCategory?.emoji || ''} ${myCategory?.name || 'No Category'}) vs <strong>${opponent!.name}</strong></p>
      <p>Week of ${new Date(Date.now() - 6 * 86400000).toLocaleDateString()} → ${new Date().toLocaleDateString()} • Generated ${new Date().toLocaleString()}</p>
    </div>
    <div class="body">
      <h2>📊 7-Day Activity Comparison</h2>
      <table>
        <tr><th>Metric</th><th>${learner.name}</th><th>${opponent!.name}</th></tr>
        ${rows}
      </table>
      <p class="vs">🏁 ${edge > 0 ? learner.name + ' leads the week' : edge < 0 ? opponent!.name + ' leads the week' : 'Week is tied'}</p>

      <h2>🏅 Category Standing & Challenge Progress</h2>
      <div class="cards">
        <div class="card"><div class="num">${categoryRank ? `${categoryRank.rank} / ${categoryRank.total}` : '—'}</div><div class="lbl">Category Rank (${myCategory?.name || 'uncategorized'})</div></div>
        <div class="card"><div class="num">${challengesDone} / ${challenges.length}</div><div class="lbl">Weekly Challenges Completed</div></div>
        <div class="card"><div class="num">${myStats.xpEarned} XP</div><div class="lbl">XP Earned This Week</div></div>
        <div class="card"><div class="num">${myStats.sessionsAttended} / ${myStats.sessionsTotal}</div><div class="lbl">Sessions Attended</div></div>
      </div>

      <h2>🎯 Verdict</h2>
      <p style="font-size:14px;line-height:1.6">${edge > 0 ? `On every measurable axis — sessions, study time, homework, exam analyses, participation and XP — ${learner.name} currently edges out ${opponent!.name} this week (${formatMinutes(myStats.totalMinutes)} vs ${formatMinutes(oppStats!.totalMinutes)} studied).` : edge < 0 ? `${opponent!.name} currently holds the edge this week, out-studying ${learner.name} (${formatMinutes(oppStats!.totalMinutes)} vs ${formatMinutes(myStats.totalMinutes)}). ${learner.name} needs more attended sessions, completed homework and reviewed items to take the lead.` : `The duel is dead even this week — the winner will be decided by who shows up and delivers before Sunday 23:59.`}</p>
      <p style="font-size:12px;color:#64748b">💡 The tutor declares the official winner by clicking an avatar on the Weekly Competition poster. The winner automatically receives <strong>+100 bonus XP</strong> and a Week ${getWeekNumber(new Date())} victory record.</p>
    </div>
    <div class="foot">Generated by Tutorly Learner Dashboard • Weekly Competition</div>
  </div>
</body></html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Duel-Report-${learner.name.replace(/\s+/g, '-')}-Week${getWeekNumber(new Date())}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-500 text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-lg">⚔️</span>
                    <h3 className="font-extrabold text-sm tracking-wide">This Week's Duel — 7-Day Activity Comparison</h3>
                </div>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${edge > 0 ? 'bg-emerald-400/90 text-emerald-950' : edge < 0 ? 'bg-rose-400/90 text-rose-950' : 'bg-white/20 text-white'}`}>
                    {edge > 0 ? `${learner.name} leads the week` : edge < 0 ? `${opponent.name} leads the week` : 'Week is tied'}
                </span>
            </div>

            {/* Header row with the two players */}
            <div className="grid grid-cols-2 divide-x divide-slate-100 bg-white">
                <div className={`p-3 text-center ${edge >= 0 ? 'bg-emerald-50/60' : ''}`}>
                    <div className="flex items-center justify-center gap-2">
                        <img src={getAvatarUrl(learner.gender, learner.avatarId, learner.name)} alt={learner.name} className="w-10 h-10 rounded-full border-2 border-emerald-400" />
                        <div className="text-left">
                            <p className="font-black text-sm truncate max-w-[120px]">{learner.name}</p>
                            {myCategory && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${myCategory.chip}`}>{myCategory.emoji} {myCategory.name}</span>}
                        </div>
                    </div>
                </div>
                <div className={`p-3 text-center ${edge <= 0 ? 'bg-rose-50/60' : ''}`}>
                    <div className="flex items-center justify-center gap-2">
                        <img src={getAvatarUrl(opponent.gender, opponent.avatarId, opponent.name)} alt={opponent.name} className="w-10 h-10 rounded-full border-2 border-rose-400" />
                        <div className="text-left">
                            <p className="font-black text-sm truncate max-w-[120px]">{opponent.name}</p>
                            {oppCategory && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${oppCategory.chip}`}>{oppCategory.emoji} {oppCategory.name}</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Metric rows */}
            {WEEKLY_STAT_ROWS.map(row => {
                const myVal = myStats[row.key as keyof typeof myStats] as number;
                const oppVal = oppStats![row.key as keyof typeof oppStats] as number;
                const winner = row.better(myVal, oppVal);
                return (
                    <div key={row.key} className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 bg-white">
                        <div className={`p-2.5 px-4 flex items-center justify-between gap-2 ${winner === 'a' ? 'bg-emerald-50/70' : ''}`}>
                            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                <span>{row.icon}</span>
                                <span className="hidden sm:inline">{row.label}</span>
                            </span>
                            <span className={`text-sm font-black ${winner === 'a' ? 'text-emerald-600' : 'text-slate-800'}`}>
                                {winner === 'a' && <span className="mr-1">🥇</span>}{row.value(myStats)}
                            </span>
                        </div>
                        <div className={`p-2.5 px-4 flex items-center justify-between gap-2 ${winner === 'b' ? 'bg-rose-50/70' : ''}`}>
                            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                <span>{row.icon}</span>
                                <span className="hidden sm:inline">{row.label}</span>
                            </span>
                            <span className={`text-sm font-black ${winner === 'b' ? 'text-rose-600' : 'text-slate-800'}`}>
                                {winner === 'b' && <span className="mr-1">🥇</span>}{row.value(oppStats!)}
                            </span>
                        </div>
                    </div>
                );
            })}

            <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] text-slate-500 font-semibold">
                    📊 Compared over the last 7 days — sessions, study time ({formatMinutes(myStats.totalMinutes)} vs {formatMinutes(oppStats!.totalMinutes)}), homework, exam analyses, reviewed items, active days & XP.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400">Declare a winner above by clicking an avatar on the poster 🏆</span>
                    <button
                        onClick={downloadDuelReportCard}
                        className="text-[10px] font-black bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                        title="Download a printable report card combining the 7-day comparison, category rank and challenge progress"
                    >
                        <i className="fas fa-file-pdf"></i> Download Report Card
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CompetitionTab;