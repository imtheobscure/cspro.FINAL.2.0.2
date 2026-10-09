/**
 * The spreadsheet export.
 *
 * JSON is the backup — it round-trips back into the app and nothing is lost. This is
 * the other thing a mentor needs: the roster in a form they can sort, filter, pivot and
 * send to someone else. So it is written for a reader, not for a parser:
 *
 *  - One sheet per kind of fact, never one giant dump, so a pivot table has something
 *    clean to stand on.
 *  - Every derived number the app shows on screen appears here too (health, tier,
 *    Power Score, completeness, days stuck in a phase) — the point of an export is to
 *    stop the mentor from having to open the app to answer a question.
 *  - Status is spelled out in words as well as carried as a machine-readable phase id,
 *    because "waiting" in a cell beside "waiting" in a column header means nothing to
 *    a reader three weeks later.
 *
 * All of it comes from the same selectors the views use, so the spreadsheet can never
 * disagree with the app about a tutor's numbers.
 */

import type { AppState } from "../types";
import {
  PHASES,
  accountCompleteness,
  averages,
  badgesFor,
  healthOf,
  latestSnapshot,
  moodMeta,
  nudgesFor,
  phaseMeta,
  scoresOf,
  sortedSnapshots,
  superTutorMonitor,
  tierFor,
  totalEarnings,
} from "./domain";
import { tutorPlatforms } from "./platforms";
import { daysBetween, relativeDate, shortDate } from "./format";
import { downloadWorkbook, type CellValue, type Sheet, type SheetColumn } from "./xlsx";

const on = (value: boolean): string => (value ? "Yes" : "No");
const list = (items: string[] | undefined, separator = "; "): string => (items ?? []).filter(Boolean).join(separator);

/** Newest first, the way a mentor reads: the thing that just happened, then history. */
function byDateDesc<T extends { at?: string; weekOf?: string; dueAt?: string }>(items: T[], key: keyof T): T[] {
  return [...items].sort((a, b) => String(b[key] ?? "").localeCompare(String(a[key] ?? "")));
}

function rosterSheet(state: AppState): Sheet {
  const columns: SheetColumn[] = [
    { header: "Name", width: 24 },
    { header: "Latin name", width: 22 },
    { header: "Status", width: 18 },
    { header: "Status (id)", width: 12 },
    { header: "Days in status", width: 14 },
    { header: "Platform(s)", width: 24 },
    { header: "Country", width: 14 },
    { header: "Phone", width: 16 },
    { header: "Email", width: 26 },
    { header: "Joined", width: 13 },
    { header: "Health score", width: 12 },
    { header: "Burnout risk", width: 12 },
    { header: "Power score", width: 11 },
    { header: "Success probability", width: 18 },
    { header: "Last audit", width: 13 },
    { header: "Tier", width: 12 },
    { header: "Account complete", width: 16 },
    { header: "Missing pieces", width: 34 },
    { header: "Total earnings (USD)", width: 18 },
    { header: "Last week earnings (USD)", width: 20 },
    { header: "4-week avg earnings (USD)", width: 21 },
    { header: "Earnings trend", width: 15 },
    { header: "Lessons (last week)", width: 17 },
    { header: "Trials (last week)", width: 16 },
    { header: "Trial conversion %", width: 16 },
    { header: "Active students", width: 14 },
    { header: "Rating (4-week avg)", width: 17 },
    { header: "Response hours (avg)", width: 18 },
    { header: "Last numbers", width: 13 },
    { header: "Last conversation", width: 16 },
    { header: "Mood", width: 12 },
    { header: "Next follow-up", width: 14 },
    { header: "Open follow-ups", width: 15 },
    { header: "Reminders", width: 40 },
    { header: "Badges", width: 30 },
    { header: "Tags", width: 20 },
    { header: "Months on roster", width: 16 },
    { header: "Notes", width: 60 },
  ];

  const rows: CellValue[][] = state.tutors.map((tutor) => {
    const phase = phaseMeta(tutor.phase);
    const health = healthOf(tutor);
    const scores = scoresOf(tutor);
    const completeness = accountCompleteness(tutor.account);
    const last = latestSnapshot(tutor);
    const avg = averages(tutor, 4);
    const trend = avg.earningsUsd - (latestSnapshot(tutor)?.earningsUsd ?? 0);
    const lastLog = byDateDesc(tutor.logs, "at")[0];
    const openFollowUps = tutor.logs.flatMap((l) => l.followUps ?? []).filter((f) => !f.done);
    const nudges = nudgesFor(tutor);
    const badges = badgesFor(tutor, totalEarnings(tutor), state.toman.rialPerUsd);

    return [
      tutor.name,
      tutor.latinName,
      phase.label,
      tutor.phase,
      daysBetween(tutor.phaseSince || tutor.createdAt),
      list(tutorPlatforms(tutor, state.customPlatforms).map((p) => p.name)),
      tutor.country,
      tutor.phone,
      tutor.email,
      tutor.startedAt ? shortDate(tutor.startedAt) : "",
      health.score,
      on(health.burnoutRisk),
      scores.hasAudit ? scores.power : "",
      scores.hasAudit ? scores.probability : "",
      scores.hasAudit ? shortDate(scores.hasAudit.at) : "never audited",
      scores.hasAudit ? tierFor(scores.power).name : "",
      `${completeness.percent}% (${completeness.done}/${completeness.total})`,
      list(completeness.missing),
      Math.round(totalEarnings(tutor)),
      last ? last.earningsUsd : "",
      Math.round(avg.earningsUsd),
      trend > 0 ? "up" : trend < 0 ? "down" : "flat",
      last ? last.lessons : "",
      last ? last.trials : "",
      avg.trials ? Math.round((avg.trialsConverted / avg.trials) * 100) : "",
      last ? last.activeStudents : "",
      avg.rating ? Number(avg.rating.toFixed(2)) : "",
      avg.responseHours ? Number(avg.responseHours.toFixed(1)) : "",
      last ? shortDate(last.weekOf) : "never",
      lastLog ? shortDate(lastLog.at) : "never",
      lastLog ? moodMeta(lastLog.mood).label : "",
      tutor.nextFollowUpAt ? shortDate(tutor.nextFollowUpAt) : "",
      openFollowUps.length,
      list(nudges.map((n) => `[${n.severity}] ${n.title}`)),
      list(badges.map((b) => b.label)),
      list(tutor.tags),
      daysBetween(tutor.startedAt) > 0 ? Math.round(daysBetween(tutor.startedAt) / 30) : 0,
      tutor.notes.replace(/\s+/g, " ").trim(),
    ];
  });

  return { name: "Roster", columns, rows };
}

function weeklySheet(state: AppState): Sheet {
  const columns: SheetColumn[] = [
    { header: "Tutor", width: 24 },
    { header: "Status", width: 16 },
    { header: "Week of", width: 13 },
    { header: "Earnings (USD)", width: 15 },
    { header: "Lessons", width: 10 },
    { header: "Trials", width: 10 },
    { header: "Trials converted", width: 16 },
    { header: "Trial conversion %", width: 16 },
    { header: "Active students", width: 14 },
    { header: "New students", width: 13 },
    { header: "Rating", width: 10 },
    { header: "Response hours", width: 14 },
    { header: "Cancellations", width: 13 },
    { header: "Notes", width: 40 },
  ];

  const rows: CellValue[][] = [];
  for (const tutor of state.tutors) {
    for (const snap of byDateDesc(sortedSnapshots(tutor), "weekOf")) {
      rows.push([
        tutor.name,
        phaseMeta(tutor.phase).short,
        shortDate(snap.weekOf),
        snap.earningsUsd,
        snap.lessons,
        snap.trials,
        snap.trialsConverted,
        snap.trials ? Math.round((snap.trialsConverted / snap.trials) * 100) : "",
        snap.activeStudents,
        snap.newStudents,
        snap.rating || "",
        snap.responseHours || "",
        snap.cancellations,
        snap.notes.replace(/\s+/g, " ").trim(),
      ]);
    }
  }
  return { name: "Weekly numbers", columns, rows };
}

function auditSheet(state: AppState): Sheet {
  const columns: SheetColumn[] = [
    { header: "Tutor", width: 24 },
    { header: "Status", width: 16 },
    { header: "Audited", width: 13 },
    { header: "Power score", width: 12 },
    { header: "Success probability", width: 18 },
    { header: "Tier", width: 12 },
    { header: "Summary", width: 60 },
    { header: "Strengths", width: 40 },
    { header: "Weaknesses", width: 40 },
    { header: "Top actions", width: 60 },
    { header: "Super Tutor: met", width: 30 },
    { header: "Super Tutor: not met", width: 40 },
  ];

  const rows: CellValue[][] = [];
  for (const tutor of state.tutors) {
    const audit = tutor.audit;
    if (!audit) continue;
    const checks = superTutorMonitor(tutor);
    rows.push([
      tutor.name,
      phaseMeta(tutor.phase).short,
      shortDate(audit.at),
      audit.powerScore,
      audit.successProbability,
      tierFor(audit.powerScore).name,
      audit.summary.replace(/\s+/g, " ").trim(),
      list(audit.strengths, " · "),
      list(audit.weaknesses, " · "),
      list(audit.actions.map((a) => `${a.impact}: ${a.title} — ${a.how}`), " · "),
      list(checks.filter((c) => c.met).map((c) => `${c.criterion} (${c.value})`)),
      list(checks.filter((c) => !c.met).map((c) => `${c.criterion} — target ${c.target}, now ${c.value}`)),
    ]);
  }
  return { name: "Audits", columns, rows };
}

function goalsSheet(state: AppState): Sheet {
  const columns: SheetColumn[] = [
    { header: "Tutor", width: 24 },
    { header: "Status", width: 16 },
    { header: "Monthly income goal (USD)", width: 22 },
    { header: "Hours per week", width: 15 },
    { header: "Students target", width: 15 },
    { header: "Student types wanted", width: 30 },
    { header: "Life goal", width: 30 },
    { header: "Life goal cost (USD)", width: 18 },
    { header: "Goal notes", width: 40 },
    { header: "Goal set", width: 13 },
    { header: "90-day plan summary", width: 50 },
    { header: "Plan set", width: 13 },
    { header: "Plan weeks", width: 12 },
    { header: "Weeks done", width: 12 },
    { header: "This week's focus", width: 40 },
    { header: "This week's metric", width: 30 },
  ];

  const rows: CellValue[][] = state.tutors.map((tutor) => {
    const goal = tutor.goal;
    const plan = tutor.plan;
    const firstOpen = plan?.weeks.find((w) => !w.done) ?? plan?.weeks[0];
    return [
      tutor.name,
      phaseMeta(tutor.phase).short,
      goal ? goal.monthlyIncomeUsd : "",
      goal ? goal.hoursPerWeek : "",
      goal ? goal.studentsTarget : "",
      list(goal?.studentTypes),
      goal?.lifeGoal ?? "",
      goal?.lifeGoalCostUsd ?? "",
      goal?.notes.replace(/\s+/g, " ").trim() ?? "",
      goal ? shortDate(goal.createdAt) : "no goal set",
      plan?.summary.replace(/\s+/g, " ").trim() ?? "",
      plan ? shortDate(plan.createdAt) : "no plan",
      plan ? plan.weeks.length : "",
      plan ? plan.weeks.filter((w) => w.done).length : "",
      firstOpen?.focus ?? "",
      firstOpen?.metric ?? "",
    ];
  });
  return { name: "Goals & 90-day plan", columns, rows };
}

function conversationsSheet(state: AppState): Sheet {
  const columns: SheetColumn[] = [
    { header: "Tutor", width: 24 },
    { header: "When", width: 13 },
    { header: "Days ago", width: 11 },
    { header: "Kind", width: 12 },
    { header: "Mood", width: 13 },
    { header: "Language", width: 12 },
    { header: "Summary", width: 70 },
    { header: "Actions agreed", width: 50 },
    { header: "Profile updates", width: 40 },
    { header: "SWOT: strengths", width: 34 },
    { header: "SWOT: weaknesses", width: 34 },
    { header: "SWOT: opportunities", width: 34 },
    { header: "SWOT: threats", width: 34 },
    { header: "Open follow-ups", width: 40 },
    { header: "Kept original chat", width: 16 },
  ];

  const rows: CellValue[][] = [];
  for (const tutor of state.tutors) {
    for (const log of byDateDesc(tutor.logs, "at")) {
      rows.push([
        tutor.name,
        shortDate(log.at),
        Math.abs(daysBetween(log.at)),
        log.kind,
        moodMeta(log.mood).label,
        log.language,
        log.summary.replace(/\s+/g, " ").trim(),
        list(log.actions, " · "),
        (log.profileUpdates ?? "").replace(/\s+/g, " ").trim(),
        list(log.swot?.strengths),
        list(log.swot?.weaknesses),
        list(log.swot?.opportunities),
        list(log.swot?.threats),
        list((log.followUps ?? []).filter((f) => !f.done).map((f) => `${f.text} (due ${shortDate(f.dueAt)})`), " · "),
        on(!!log.raw),
      ]);
    }
  }
  return { name: "Conversations", columns, rows };
}

function followUpSheet(state: AppState): Sheet {
  const columns: SheetColumn[] = [
    { header: "Tutor", width: 24 },
    { header: "Status", width: 16 },
    { header: "Follow-up", width: 60 },
    { header: "Due", width: 13 },
    { header: "Done", width: 8 },
    { header: "Overdue by (days)", width: 17 },
    { header: "From conversation", width: 13 },
  ];

  const rows: CellValue[][] = [];
  for (const tutor of state.tutors) {
    for (const log of byDateDesc(tutor.logs, "at")) {
      for (const f of log.followUps ?? []) {
        const overdue = f.done ? 0 : daysBetween(f.dueAt);
        rows.push([
          tutor.name,
          phaseMeta(tutor.phase).short,
          f.text.replace(/\s+/g, " ").trim(),
          shortDate(f.dueAt),
          on(f.done),
          overdue > 0 ? overdue : 0,
          shortDate(log.at),
        ]);
      }
    }
  }
  return { name: "Follow-ups", columns, rows };
}

function remindersSheet(state: AppState): Sheet {
  const columns: SheetColumn[] = [
    { header: "Tutor", width: 24 },
    { header: "Status", width: 16 },
    { header: "Severity", width: 11 },
    { header: "Reminder", width: 40 },
    { header: "Why it fired", width: 60 },
    { header: "What to do", width: 50 },
  ];

  const rank = { urgent: 0, warn: 1, info: 2 } as const;
  const rows: CellValue[][] = state.tutors.flatMap((tutor) =>
    nudgesFor(tutor)
      .sort((a, b) => rank[a.severity] - rank[b.severity])
      .map((n) => [tutor.name, phaseMeta(tutor.phase).short, n.severity, `${n.icon} ${n.title}`, n.detail, n.action]),
  );
  return { name: "Reminders", columns, rows };
}

function summarySheet(state: AppState): Sheet {
  const columns: SheetColumn[] = [
    { header: "Measure", width: 34 },
    { header: "Value", width: 22 },
    { header: "What it means", width: 70 },
  ];

  const total = state.tutors.reduce((sum, t) => sum + totalEarnings(t), 0);
  const withNumbers = state.tutors.filter((t) => latestSnapshot(t)).length;
  const audited = state.tutors.filter((t) => t.audit).length;
  const openFollowUps = state.tutors.reduce((sum, t) => sum + t.logs.flatMap((l) => l.followUps ?? []).filter((f) => !f.done).length, 0);
  const reminderCount = state.tutors.reduce((sum, t) => sum + nudgesFor(t).length, 0);
  const healthy = state.tutors.filter((t) => healthOf(t).score >= 70).length;

  const rows: CellValue[][] = [
    ["Tutors on the roster", state.tutors.length, "Everyone currently being mentored."],
    ...PHASES.map((phase) => [
      `${phase.emoji} ${phase.label}`,
      state.tutors.filter((t) => t.phase === phase.id).length,
      phase.goal,
    ]),
    ["Total earnings recorded (USD)", Math.round(total), "Sum of every weekly snapshot for every tutor."],
    ["Tutors with numbers recorded", `${withNumbers} of ${state.tutors.length}`, "The rest have no weekly figures yet, so their projections are guesses."],
    ["Tutors with a profile audit", `${audited} of ${state.tutors.length}`, "Power Score and Success Probability exist only where an audit has run."],
    ["Tutors in good health (70+)", `${healthy} of ${state.tutors.length}`, "Health blends completeness, students, fresh numbers, mood and load."],
    ["Open follow-ups", openFollowUps, "Promises you made in a conversation that are not ticked off."],
    ["Live reminders", reminderCount, "Everything the reminder engine is currently nagging about."],
    ["Toman rate used (rial per USD)", state.toman.rialPerUsd, `Set ${relativeDate(state.toman.updatedAt)} — every Toman figure in the app reads this.`],
    ["Custom platforms", state.customPlatforms.length ? list(state.customPlatforms.map((p) => p.name)) : "none", "Platforms you added beyond the built-in list."],
    ["Export generated", new Date().toLocaleString(), "The moment this file was written."],
  ];
  return { name: "Summary", columns, rows };
}

/**
 * Everyone who is not being worked on right now, beside the reason you wrote.
 *
 * It sits directly after the Roster because that is the question the roster raises: the active
 * tutors are the ones you already know about, and the quiet ones — waiting for an account,
 * preparing their documents, gone passive, or never started at all — are the ones a mentor loses
 * track of. Longest on the roster first, so someone who has been sitting there for a year comes
 * before someone who arrived last week, and the reason each one is on hold travels with them.
 */
function notActiveSheet(state: AppState): Sheet {
  const columns: SheetColumn[] = [
    { header: "Name", width: 24 },
    { header: "Latin name", width: 22 },
    { header: "Status", width: 24 },
    { header: "Status (id)", width: 12 },
    { header: "Days in this status", width: 18 },
    { header: "Joined", width: 13 },
    { header: "Months on roster", width: 16 },
    { header: "Platform(s)", width: 24 },
    { header: "Country", width: 14 },
    { header: "Phone", width: 16 },
    { header: "Email", width: 26 },
    { header: "Earnings recorded (USD)", width: 20 },
    { header: "Students", width: 11 },
    { header: "Health score", width: 13 },
    { header: "Account complete", width: 16 },
    { header: "Last conversation", width: 16 },
    { header: "Days since a conversation", width: 22 },
    { header: "Open follow-ups", width: 15 },
    { header: "Why not continuing", width: 60 },
    { header: "Reason written", width: 14 },
    { header: "Notes", width: 50 },
    { header: "Reminders", width: 40 },
  ];

  const rows: CellValue[][] = state.tutors
    .filter((tutor) => tutor.phase !== "active")
    // Oldest registration first: the person who has been on hold the longest is the one to
    // decide about today, not the newest arrival.
    .sort((a, b) => String(a.startedAt || a.createdAt).localeCompare(String(b.startedAt || b.createdAt)))
    .map((tutor) => {
      const phase = phaseMeta(tutor.phase);
      const completeness = accountCompleteness(tutor.account);
      const last = latestSnapshot(tutor);
      const lastLog = byDateDesc(tutor.logs, "at")[0];
      const openFollowUps = tutor.logs.flatMap((l) => l.followUps ?? []).filter((f) => !f.done);
      const monthsOnRoster = Math.max(0, Math.round(daysBetween(tutor.startedAt || tutor.createdAt) / 30));

      return [
        tutor.name,
        tutor.latinName,
        `${phase.emoji} ${phase.label}`,
        tutor.phase,
        daysBetween(tutor.phaseSince || tutor.createdAt),
        tutor.startedAt ? shortDate(tutor.startedAt) : "",
        monthsOnRoster,
        list(tutorPlatforms(tutor, state.customPlatforms).map((p) => p.name)),
        tutor.country,
        tutor.phone,
        tutor.email,
        Math.round(totalEarnings(tutor)),
        last ? last.activeStudents : "",
        healthOf(tutor).score,
        `${completeness.percent}% (${completeness.done}/${completeness.total})`,
        lastLog ? shortDate(lastLog.at) : "never",
        lastLog ? daysBetween(lastLog.at) : "never",
        openFollowUps.length,
        (tutor.holdNote ?? "").replace(/\s+/g, " ").trim(),
        tutor.holdNoteAt ? shortDate(tutor.holdNoteAt) : "",
        tutor.notes.replace(/\s+/g, " ").trim(),
        list(
          nudgesFor(tutor).map((n) => `[${n.severity}] ${n.title}`),
        ),
      ];
    });

  return { name: "Not active", columns, rows };
}

/** Every sheet, in the order a mentor wants to read them. */
export function workbookFromState(state: AppState): Sheet[] {
  return [
    summarySheet(state),
    rosterSheet(state),
    notActiveSheet(state),
    weeklySheet(state),
    auditSheet(state),
    goalsSheet(state),
    followUpSheet(state),
    remindersSheet(state),
    conversationsSheet(state),
  ];
}

/**
 * The one call Settings needs.
 *
 * Builds the sheets once and reports what went in, so the confirmation toast can state
 * real numbers instead of a vague "done". Counting here rather than in the render path
 * matters: the reminder engine runs per tutor to build the Reminders sheet, and that is
 * not work to repeat on every keystroke. */
export function downloadSpreadsheet(state: AppState, filename?: string): { rows: number; sheets: number } {
  const sheets = workbookFromState(state);
  const stamp = new Date().toISOString().slice(0, 10);
  downloadWorkbook(sheets, filename ?? `preply-success-advisor-${stamp}.xlsx`);
  return { rows: sheets.reduce((sum, s) => sum + s.rows.length, 0), sheets: sheets.length };
}
