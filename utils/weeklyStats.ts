/**
 * Weekly activity stats used by the Weekly Competition.
 * Every measurable component of a learner's week: session logs, homework
 * analysis used, exam analysis used, participation, XP, and more.
 */
import { Learner, HomeworkAssignment } from '../types2';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** ISO-8601 week number (Monday-based) used to tag weekly duel victories. */
export const getWeekNumber = (date: Date | string = new Date()): number => {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export interface WeeklyActivityStats {
  sessionsTotal: number;
  sessionsAttended: number;
  sessionsMissed: number;
  totalMinutes: number;
  participationRate: number; // 0-100
  homeworkTotal: number;
  homeworkCompleted: number;
  homeworkPending: number;
  examsLogged: number;
  xpEarned: number; // estimated from measurable activity
  reviewedItems: number; // corrections / recycled items count
  daysActive: number; // distinct active days
}

export const getWeeklyActivityStats = (
  learner: Learner,
  homeworkAssignments: HomeworkAssignment[] = []
): WeeklyActivityStats => {
  const now = new Date().getTime();
  const weekAgo = now - WEEK_MS;

  const sessions = (learner.sessions || []).filter(s => {
    try { return new Date(s.date).getTime() >= weekAgo; } catch { return false; }
  });

  const attended = sessions.filter(s => s.attended);
  const missed = sessions.filter(s => !s.attended);
  const totalMinutes = attended.reduce((sum, s) => sum + (s.duration || 0), 0);

  const learnerHomework = (homeworkAssignments || []).filter(h => h.learnerId === learner.id);
  const weekHomework = learnerHomework.filter(h => {
    try {
      const d = h.submittedAt || h.dueDate;
      return new Date(d).getTime() >= weekAgo;
    } catch { return false; }
  });
  const homeworkCompleted = weekHomework.filter(h => h.status === 'submitted' || h.status === 'reviewed').length;
  const homeworkPending = weekHomework.filter(h => h.status === 'assigned' || h.status === 'overdue').length;

  const exams = (learner.examAnalysis || []).filter((e: any) => {
    try { return new Date(e.date).getTime() >= weekAgo; } catch { return false; }
  });

  // XP estimate from measurable activity:
  //  - 50 XP per attended session (matches the standard session XP award)
  //  - xpReward for homework completed this week
  //  - xpEarned recorded on exam analyses logged this week
  const sessionXp = attended.length * 50;
  const homeworkXp = weekHomework.reduce((sum, h) => (h.status === 'submitted' || h.status === 'reviewed') ? sum + (h.xpReward || 0) : sum, 0);
  const examXp = exams.reduce((sum, e: any) => sum + (Number(e.xpEarned) || 0), 0);
  const xpEarned = sessionXp + homeworkXp + examXp;

  // Reviewed / recycled items (corrections tracked as needsHelp + mastered skills)
  const reviewedItems = (learner.sessions || [])
    .filter(s => { try { return new Date(s.date).getTime() >= weekAgo; } catch { return false; } })
    .reduce((sum, s) => sum + ((s.needsHelp || []).length + (s.skillsLearned || []).length), 0);

  const daysActive = new Set(
    sessions.map(s => { try { return new Date(s.date).toISOString().split('T')[0]; } catch { return ''; } })
  ).size;

  const sessionsTotal = sessions.length;

  return {
    sessionsTotal,
    sessionsAttended: attended.length,
    sessionsMissed: missed.length,
    totalMinutes,
    participationRate: sessionsTotal > 0 ? Math.round((attended.length / sessionsTotal) * 100) : 0,
    homeworkTotal: weekHomework.length,
    homeworkCompleted,
    homeworkPending,
    examsLogged: exams.length,
    xpEarned,
    reviewedItems,
    daysActive,
  };
};

export interface WeeklyDuelStats {
  learner: WeeklyActivityStats;
  opponent: WeeklyActivityStats;
}

/** Deterministic "edge" used to compare two learners across every metric. */
export const compareWeeklyStats = (a: WeeklyActivityStats, b: WeeklyActivityStats): number => {
  let edge = 0;
  edge += (a.sessionsAttended - b.sessionsAttended) * 3;
  edge += (a.totalMinutes - b.totalMinutes) / 30;
  edge += (a.participationRate - b.participationRate) * 0.4;
  edge += (a.homeworkCompleted - b.homeworkCompleted) * 2;
  edge += (a.examsLogged - b.examsLogged) * 2;
  edge += (a.xpEarned - b.xpEarned) / 10;
  edge += (a.daysActive - b.daysActive) * 1.5;
  return Math.round(edge * 10) / 10;
};

export const formatMinutes = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
};

export interface WeeklyStatRow {
  key: string;
  label: string;
  icon: string;
  value: (stats: WeeklyActivityStats) => string;
  better: (a: number, b: number) => 'a' | 'b' | 'tie';
}

export const WEEKLY_STAT_ROWS: WeeklyStatRow[] = [
  { key: 'sessions', label: 'Sessions Attended', icon: '📅', value: s => `${s.sessionsAttended} / ${s.sessionsTotal}`, better: (a, b) => a > b ? 'a' : a < b ? 'b' : 'tie' },
  { key: 'minutes', label: 'Study Time', icon: '⏱️', value: s => formatMinutes(s.totalMinutes), better: (a, b) => a > b ? 'a' : a < b ? 'b' : 'tie' },
  { key: 'participation', label: 'Participation', icon: '🎯', value: s => `${s.participationRate}%`, better: (a, b) => a > b ? 'a' : a < b ? 'b' : 'tie' },
  { key: 'homework', label: 'Homework Done', icon: '📝', value: s => `${s.homeworkCompleted} / ${s.homeworkTotal}`, better: (a, b) => a > b ? 'a' : a < b ? 'b' : 'tie' },
  { key: 'exams', label: 'Exam Analyses', icon: '🎓', value: s => `${s.examsLogged}`, better: (a, b) => a > b ? 'a' : a < b ? 'b' : 'tie' },
  { key: 'reviewed', label: 'Items Reviewed', icon: '🔁', value: s => `${s.reviewedItems}`, better: (a, b) => a > b ? 'a' : a < b ? 'b' : 'tie' },
  { key: 'daysActive', label: 'Active Days', icon: '🔥', value: s => `${s.daysActive}`, better: (a, b) => a > b ? 'a' : a < b ? 'b' : 'tie' },
  { key: 'xp', label: 'XP Earned', icon: '✨', value: s => `${s.xpEarned} XP`, better: (a, b) => a > b ? 'a' : a < b ? 'b' : 'tie' },
];

/** Builds the AI prompt text summarizing the whole competition for a weekly review. */
export const buildCompetitionAiPrompt = (
  learners: Learner[],
  homeworkAssignments: HomeworkAssignment[] = [],
  roundContext?: { roundWeek?: number | null; roundYear?: number | null }
): string => {
  const lines: string[] = [];
  lines.push('You are a professional Educational Analyst. Below is the full Weekly Competition data for all learners (grouped by category), including each learner\'s own weekly activity, their paired competitor, the category cohort they belong to, and the results of the round that just settled.');
  lines.push('');

  const roundWeek = roundContext?.roundWeek ?? null;
  const roundYear = roundContext?.roundYear ?? null;
  const prevDate = new Date(Date.now() - WEEK_MS);
  const prevWeek = getWeekNumber(prevDate);
  const prevYear = prevDate.getFullYear();

  if (roundWeek && roundYear) {
    lines.push(`===== ACTIVE ROUND: Week ${roundWeek}, ${roundYear} =====`);
    lines.push('');
  }

  // Last round's settled results (auto-settled at the Sunday deadline + manually declared) pre-fill the review.
  const settled = learners
    .flatMap(l => (l.weeklyWinRecords || []).map(r => ({ ...r, winnerId: l.id, winnerName: l.name })))
    .filter(r => r.week === prevWeek && r.year === prevYear)
    .sort((a, b) => a.winnerName.localeCompare(b.winnerName));

  lines.push('===== LAST WEEK\'S SETTLED RESULTS (Week ' + prevWeek + ', ' + prevYear + ') =====');
  lines.push('');
  if (settled.length > 0) {
    settled.forEach(r => {
      lines.push(`- 🏆 ${r.winnerName} defeated ${r.opponentName} (+${r.bonusXp ?? 100} bonus XP) — declared/settled on ${r.date || 'the weekly deadline'}`);
    });
    lines.push('');
    lines.push('Evaluate each winner vs their defeated competitor: which metrics decided the duel, where the loser was stronger, and whether the bonus XP was justified by activity.');
  } else {
    lines.push('- No duel was settled last week (no declared winner, or duels ended tied). Learners who still had an active opponent at the Sunday deadline were settled automatically by the app; otherwise review why the pair produced no clear winner.');
  }
  lines.push('');

  lines.push('===== CURRENT PAIRINGS THIS WEEK =====');
  lines.push('');
  const competing = learners.filter(l => l.isCompeting);
  if (competing.length === 0) {
    lines.push('- No learner is currently participating in the weekly matching. Encourage participation first.');
  } else {
    competing.forEach(l => {
      const opponent = learners.find(o => o.id === l.currentOpponentId);
      lines.push(`- ${l.name} (${l.category || 'No Category'}) vs ${opponent ? opponent.name + ' (' + (opponent.category || 'No Category') + ')' : 'waiting for a same-category rival'}`);
    });
  }
  lines.push('');

  lines.push('Produce a DETAILED WEEKLY PERFORMANCE REVIEW that covers:');
  lines.push('1. For EACH learner individually: participation, session logs, homework analysis used, exam analysis used, XP earned, study time, active days, and any measurable component available.');
  lines.push('2. Head-to-head comparison with their paired competitor (who is winning the week and why, metric by metric).');
  lines.push('3. Comparison against everyone else in the same category (where they rank, strengths, weaknesses).');
  lines.push('4. Concrete recommendations for the following week.');
  lines.push('');
  lines.push('===== LEARNERS =====');
  lines.push('');
  learners.forEach(l => {
    const stats = getWeeklyActivityStats(l, homeworkAssignments);
    const opponent = learners.find(o => o.id === l.currentOpponentId);
    lines.push(`### ${l.name} (${l.category || 'No Category'})`);
    lines.push(`- Weekly stats: ${stats.sessionsAttended}/${stats.sessionsTotal} sessions attended, ${stats.totalMinutes} mins studied, ${stats.participationRate}% participation, ${stats.homeworkCompleted} homework done, ${stats.examsLogged} exam analyses, ${stats.reviewedItems} items reviewed, ${stats.daysActive} active days, ${stats.xpEarned} XP earned`);
    lines.push(`- Competitions won (all-time): ${l.competitionWins || 0}`);
    lines.push(`- Paired competitor this week: ${opponent ? opponent.name : 'None yet — new same-category pairs are created automatically at the Sunday deadline'}`);
    lines.push('');
  });
  lines.push('===== END OF DATA =====');
  lines.push('');
  lines.push('Use only the data above. Never invent attendance, homework, or exams that are not listed.');
  return lines.join('\n');
};