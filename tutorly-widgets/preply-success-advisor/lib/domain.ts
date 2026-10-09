import type { AccountData, Audit, LogEntry, PhaseId, PhaseMeta, Snapshot, Task, TaskKind, Tutor } from "../types";
import { daysBetween, relativeDate, shortDate } from "./format";

/**
 * Everything the app *derives* rather than stores.
 *
 * Scores, tiers, health, nudges and trends are all computed from the tutor's own
 * data on every render. Nothing here is persisted, so nothing here can go stale: when
 * the AI updates a profile or a week of numbers lands, every badge and alert moves
 * with it.
 */

/* ----------------------------------------------------------------- phases -- */

export const PHASES: PhaseMeta[] = [
  {
    id: "preparing",
    label: "Preparing data for account",
    short: "Preparing",
    emoji: "📝",
    goal: "Get every document, photo, video and certificate in hand.",
    color: "#F59E0B",
    nudgeAfterDays: 14,
  },
  {
    id: "waiting",
    label: "Waiting for an account",
    short: "Waiting",
    emoji: "⏳",
    goal: "Keep them warm and ready to book their first week the moment approval lands.",
    color: "#3B82F6",
    nudgeAfterDays: 21,
  },
  {
    id: "active",
    label: "Active account",
    short: "Active",
    emoji: "🚀",
    goal: "Raise income, reviews and rank week over week.",
    color: "#10B981",
    nudgeAfterDays: 21,
  },
  {
    id: "passive",
    label: "Passive account",
    short: "Passive",
    emoji: "😴",
    goal: "Find the reason they stopped and remove it.",
    color: "#4B5563",
    nudgeAfterDays: 14,
  },
];

export const phaseMeta = (id: PhaseId): PhaseMeta =>
  PHASES.find((p) => p.id === id) ?? PHASES[0];

/* ------------------------------------------------------------------ tiers -- */

export interface Tier {
  id: "common" | "rare" | "epic" | "legendary";
  name: string;
  min: number;
  color: string;
  /** Tailwind classes for the card's glow and ring. */
  glow: string;
  ring: string;
  emoji: string;
}

export const TIERS: Tier[] = [
  {
    id: "common",
    name: "Common",
    min: 0,
    color: "#64748B",
    glow: "",
    ring: "ring-slate-300",
    emoji: "🪨",
  },
  {
    id: "rare",
    name: "Rare",
    min: 41,
    color: "#3B82F6",
    glow: "tier-rare",
    ring: "ring-blue-300",
    emoji: "💠",
  },
  {
    id: "epic",
    name: "Epic",
    min: 61,
    color: "#8B5CF6",
    glow: "tier-epic",
    ring: "ring-purple-300",
    emoji: "🔮",
  },
  {
    id: "legendary",
    name: "Legendary",
    min: 81,
    color: "#F59E0B",
    glow: "tier-legendary",
    ring: "ring-amber-300",
    emoji: "👑",
  },
];

export function tierFor(score: number): Tier {
  return [...TIERS].reverse().find((t) => score >= t.min) ?? TIERS[0];
}

/* ----------------------------------------------------------- performance -- */

export function sortedSnapshots(tutor: Tutor): Snapshot[] {
  return [...tutor.snapshots].sort((a, b) => (a.weekOf < b.weekOf ? -1 : 1));
}

export function latestSnapshot(tutor: Tutor): Snapshot | undefined {
  return sortedSnapshots(tutor).slice(-1)[0];
}

export interface Trend {
  /** Difference between the last two weeks, as an absolute number. */
  earningsDelta: number;
  lessonsDelta: number;
  trialsDelta: number;
  ratingDelta: number;
  /** Percentage change in earnings, rounded. */
  earningsPercent: number;
  direction: "up" | "down" | "flat";
}

export function weekTrend(tutor: Tutor): Trend {
  const s = sortedSnapshots(tutor);
  const empty: Trend = {
    earningsDelta: 0,
    lessonsDelta: 0,
    trialsDelta: 0,
    ratingDelta: 0,
    earningsPercent: 0,
    direction: "flat",
  };
  if (s.length < 2) return empty;
  const [prev, last] = [s[s.length - 2], s[s.length - 1]];
  const earningsDelta = last.earningsUsd - prev.earningsUsd;
  return {
    earningsDelta,
    lessonsDelta: last.lessons - prev.lessons,
    trialsDelta: last.trials - prev.trials,
    ratingDelta: Number((last.rating - prev.rating).toFixed(2)),
    earningsPercent: prev.earningsUsd > 0 ? Math.round((earningsDelta / prev.earningsUsd) * 100) : 0,
    direction: earningsDelta > 0 ? "up" : earningsDelta < 0 ? "down" : "flat",
  };
}

/** Averages over the last n weeks, used by projections and the health score. */
export function averages(tutor: Tutor, weeks = 4): Snapshot & { sampleSize: number } {
  const s = sortedSnapshots(tutor).slice(-weeks);
  const base: Snapshot & { sampleSize: number } = {
    id: "avg",
    weekOf: s.slice(-1)[0]?.weekOf ?? "",
    earningsUsd: 0,
    lessons: 0,
    trials: 0,
    trialsConverted: 0,
    activeStudents: 0,
    newStudents: 0,
    rating: 0,
    responseHours: 0,
    cancellations: 0,
    notes: "",
    createdAt: "",
    sampleSize: s.length,
  };
  if (!s.length) return base;
  const sum = (fn: (x: Snapshot) => number) => s.reduce((a, x) => a + (fn(x) || 0), 0);
  const ratingWeeks = s.filter((x) => x.rating > 0).length;
  return {
    ...base,
    earningsUsd: Math.round(sum((x) => x.earningsUsd) / s.length),
    lessons: Math.round(sum((x) => x.lessons) / s.length),
    trials: Math.round((sum((x) => x.trials) / s.length) * 10) / 10,
    trialsConverted: Math.round((sum((x) => x.trialsConverted) / s.length) * 10) / 10,
    activeStudents: Math.round(sum((x) => x.activeStudents) / s.length),
    newStudents: Math.round((sum((x) => x.newStudents) / s.length) * 10) / 10,
    rating: ratingWeeks ? Number((sum((x) => (x.rating || 0)) / ratingWeeks).toFixed(2)) : 0,
    responseHours: Math.round((sum((x) => x.responseHours) / s.length) * 10) / 10,
    cancellations: Math.round((sum((x) => x.cancellations) / s.length) * 10) / 10,
  };
}

/** Weekly income the tutor is on pace for, minus the platform's cut. */
export function projectedMonthly(tutor: Tutor, hourlyRate: number, commission: number): number {
  const avg = averages(tutor, 4);
  const lessonsPerWeek = avg.lessons || avg.activeStudents || 0;
  if (!lessonsPerWeek) return 0;
  return Math.round(lessonsPerWeek * hourlyRate * (1 - commission) * 4.3);
}

/* ------------------------------------------------------------- health ----- */

export interface HealthPart {
  key: string;
  label: string;
  /** 0–1 contribution before weighting. */
  ratio: number;
  weight: number;
  detail: string;
}

export interface Health {
  score: number;
  parts: HealthPart[];
  /** Present when the score is low enough to warrant a gentle intervention. */
  burnoutRisk: boolean;
  /**
   * True only when the numbers actually show a heavy load — hours overbooked, or a
   * full book with a slipping rating. A low score on its own is *not* evidence of
   * burnout: a tutor with no numbers recorded yet scores low for lack of information,
   * and telling their mentor they are burning out would be a made-up claim.
   */
  overloaded: boolean;
}

/**
 * Tutor Health Score — a rolling read on whether someone is actually well, not just
 * earning. It blends profile completeness, whether they still have students, how
 * fresh their numbers are, how they sounded in the last conversation, and how much
 * load they are carrying (a heavy load with a falling rating is the burnout signal).
 */
export function healthOf(tutor: Tutor): Health {
  const avg = averages(tutor, 4);
  const last = latestSnapshot(tutor);
  const completeness = accountCompleteness(tutor.account);
  const daysSinceNumbers = last ? daysBetween(last.weekOf) : 90;
  const lastLog = [...tutor.logs].sort((a, b) => (a.at < b.at ? -1 : 1)).slice(-1)[0];
  const daysSinceTalk = lastLog ? daysBetween(lastLog.at) : 90;
  const hoursOpen = tutor.account.availabilityHours || 0;
  const lastMood = lastLog?.mood;

  const parts: HealthPart[] = [
    {
      key: "completeness",
      label: "Account completeness",
      ratio: completeness.percent / 100,
      weight: 0.25,
      detail: `${completeness.done} of ${completeness.total} profile pieces in place`,
    },
    {
      key: "students",
      label: "Reaching students",
      ratio: clamp01((avg.activeStudents || 0) / 8),
      weight: 0.2,
      detail: avg.activeStudents ? `${avg.activeStudents} active students on average` : "no active students recorded",
    },
    {
      key: "freshness",
      label: "Numbers are current",
      ratio: clamp01(1 - daysSinceNumbers / 21),
      weight: 0.15,
      detail: last ? `last numbers ${relativeDate(last.weekOf)}` : "no numbers recorded yet",
    },
    {
      key: "contact",
      label: "In contact with you",
      ratio: clamp01(1 - daysSinceTalk / 30),
      weight: 0.15,
      detail: lastLog ? `last conversation ${relativeDate(lastLog.at)}` : "never talked yet",
    },
    {
      key: "mood",
      label: "How they sounded",
      ratio: lastMood === "thriving" ? 1 : lastMood === "steady" ? 0.75 : lastMood === "worried" ? 0.4 : lastMood === "at-risk" ? 0.15 : 0.6,
      weight: 0.15,
      detail: lastMood && lastMood !== "unknown" ? `last read: ${lastMood}` : "no conversation analyzed yet",
    },
    {
      key: "load",
      label: "Load is sustainable",
      ratio: loadRatio(tutor),
      weight: 0.1,
      detail:
        hoursOpen && avg.lessons
          ? `${avg.lessons} lessons a week against ${hoursOpen} hours open`
          : hoursOpen
            ? `${hoursOpen} hours open, no lessons recorded yet`
            : "no availability recorded",
    },
  ];

  const score = Math.round(parts.reduce((a, p) => a + p.ratio * p.weight, 0) * 100);
  const utilisation = hoursOpen ? avg.lessons / hoursOpen : 0;
  const overloaded = (avg.lessons >= 8 && utilisation > 0.7) || (avg.lessons > 20 && avg.rating > 0 && avg.rating < 4.7);
  return { score, parts, burnoutRisk: score < 50 || overloaded, overloaded };
}

function loadRatio(tutor: Tutor): number {
  const avg = averages(tutor, 4);
  const hours = tutor.account.availabilityHours || 0;
  if (!hours) return 0.6;
  const taught = avg.lessons || 0;
  const util = taught / hours;
  // Under-used hours are a problem too, but a full book with a slipping rating is worse.
  if (util > 1) return 0.3;
  if (util > 0.7) return 0.9;
  if (util > 0.3) return 1;
  return 0.55;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));

/* -------------------------------------------------------- completeness ---- */

export interface Completeness {
  done: number;
  total: number;
  percent: number;
  missing: string[];
}

/** Which pieces of the public profile are actually filled in. */
export function accountCompleteness(a: AccountData): Completeness {
  const checks: [string, boolean][] = [
    ["Headlines (3)", a.headlines.filter((h) => h.trim()).length >= 3],
    ["Description", a.description.trim().length > 200],
    ["Intro video script", a.videoScripts.some((s) => s.plain.trim().length > 50)],
    ["Profile photo", !!a.photo],
    ["Subjects with detail", a.subjects.some((s) => s.description.trim().length > 40)],
    ["Proficiency levels", a.proficiencyLevels.length > 0],
    ["Age groups", a.ageGroups.length > 0],
    ["Certificates", a.certificates.length > 0],
    ["Specialties", a.specialties.length >= 3],
    ["Availability set", a.availabilityHours > 0],
    ["Price set", a.priceUsd > 0],
  ];
  const done = checks.filter(([, ok]) => ok).length;
  return {
    done,
    total: checks.length,
    percent: Math.round((done / checks.length) * 100),
    missing: checks.filter(([, ok]) => !ok).map(([label]) => label),
  };
}

/* --------------------------------------------------------------- nudges --- */

export type NudgeSeverity = "info" | "warn" | "urgent";

export interface Nudge {
  id: string;
  tutorId: string;
  tutorName: string;
  severity: NudgeSeverity;
  icon: string;
  title: string;
  detail: string;
  /** What to do about it, in one line. */
  action: string;
}

/**
 * The reminder engine.
 *
 * Every rule here is a real follow-up a mentor would otherwise forget: someone stuck
 * in a phase, a week with no numbers, no trial booked in a while, a profile score
 * that fell, a price never revisited, an unanswered follow-up. The board shows the
 * count; Insights shows the list; the tutor card shows its own.
 */
export function nudgesFor(tutor: Tutor, now = new Date()): Nudge[] {
  const out: Nudge[] = [];
  const push = (n: Omit<Nudge, "id" | "tutorId" | "tutorName">) =>
    out.push({ ...n, id: `${tutor.id}:${n.title}`, tutorId: tutor.id, tutorName: tutor.name });

  const phase = phaseMeta(tutor.phase);
  const inPhase = daysBetween(tutor.phaseSince || tutor.createdAt, now);
  const last = latestSnapshot(tutor);
  const avg = averages(tutor, 3);
  const trend = weekTrend(tutor);

  if (tutor.phase !== "passive" && inPhase >= phase.nudgeAfterDays) {
    push({
      severity: inPhase >= phase.nudgeAfterDays * 2 ? "urgent" : "warn",
      icon: phase.emoji,
      title: `${inPhase} days in "${phase.short}"`,
      detail: `${tutor.name} has been in ${phase.short} for ${inPhase} days, past the ${phase.nudgeAfterDays}-day mark.`,
      action: "Send a check-in and clear whatever is blocking them.",
    });
  }

  if (tutor.phase === "active") {
    const days = last ? daysBetween(last.weekOf, now) : 999;
    if (days > 14) {
      push({
        severity: days > 28 ? "urgent" : "warn",
        icon: "📊",
        title: days > 900 ? "No weekly numbers ever" : `No numbers for ${days} days`,
        detail: "Income, trials and rating are all blind spots until this week is logged.",
        action: "Ask for the Insight page and paste it in the Weekly update prompt.",
      });
    }
    if (last && last.trials === 0 && days > 7) {
      push({
        severity: "warn",
        icon: "🎯",
        title: "No trials booked this week",
        detail: "Trials are the only source of new regular students.",
        action: "Run the audit and open another availability block in peak hours.",
      });
    }
    if (last && last.responseHours > 24) {
      push({
        severity: "warn",
        icon: "⏱️",
        title: `Replies take ${last.responseHours}h`,
        detail: "A slow reply is the fastest way to lose a trial booking.",
        action: "Turn on notifications and answer inside 12 hours for two weeks.",
      });
    }
    if (last && last.cancellations > 1) {
      push({
        severity: "urgent",
        icon: "🚫",
        title: `${last.cancellations} cancellations`,
        detail: "Cancellations push the profile down and can cost the Super Tutor badge.",
        action: "Ask what happened before it repeats, and trim the hours they cannot keep.",
      });
    }
    if (!tutor.account.priceUsd) {
      push({
        severity: "info",
        icon: "💵",
        title: "Price not recorded",
        detail: "Income projections and the price benchmark both need this.",
        action: "Set the rate on the Account tab.",
      });
    } else if (avg.lessons >= 12 && avg.rating >= 4.8) {
      push({
        severity: "info",
        icon: "📈",
        title: "Ready for a price raise",
        detail: `${avg.lessons} lessons a week at ${avg.rating} stars — demand is there.`,
        action: "Benchmark the price and raise it in one step, then watch bookings for two weeks.",
      });
    }
  }

  if (tutor.phase === "waiting" && inPhase > 30) {
    push({
      severity: "warn",
      icon: "📨",
      title: "Account still not approved",
      detail: `${inPhase} days since submission.`,
      action: "Ask them to check the review email and resubmit anything that was rejected.",
    });
  }

  if (tutor.phase === "preparing" && !accountCompleteness(tutor.account).done) {
    push({
      severity: "info",
      icon: "📝",
      title: "Nothing prepared yet",
      detail: "No account content exists, so they cannot submit anything.",
      action: "Run Create the account content and paste the result back.",
    });
  }

  if (tutor.phase === "passive" && inPhase > 21) {
    push({
      severity: "warn",
      icon: "🔌",
      title: "Switched off for a while",
      detail: `${inPhase} days since they went passive.`,
      action: "Ask what made them stop. Fix that before asking them to teach again.",
    });
  }

  if (tutor.audit && inPhase >= 7 && tutor.audit.powerScore < 60) {
    push({
      severity: "warn",
      icon: "🧭",
      title: `Profile score ${tutor.audit.powerScore}/100`,
      detail: tutor.audit.weaknesses[0] || "Several criteria scored low.",
      action: "Work the three ranked actions from the last audit.",
    });
  }

  if (trend.direction === "down" && trend.earningsPercent <= -20) {
    push({
      severity: "urgent",
      icon: "📉",
      title: `Earnings down ${Math.abs(trend.earningsPercent)}%`,
      detail: "A sudden drop usually means availability, a rating dip, or a lost student.",
      action: "Open SOS and work the three-point recovery plan.",
    });
  }

  const overdue = tutor.logs.flatMap((l) => l.followUps).filter((f) => !f.done && f.dueAt && f.dueAt <= now.toISOString().slice(0, 10));
  if (overdue.length) {
    push({
      severity: "warn",
      icon: "✅",
      title: `${overdue.length} follow-up${overdue.length > 1 ? "s" : ""} overdue`,
      detail: overdue.map((f) => f.text).join(" · ").slice(0, 160),
      action: "Tick them off in Communication, or reschedule with a real date.",
    });
  }

  const health = healthOf(tutor);
  if (health.burnoutRisk && tutor.phase === "active") {
    const loadLine = health.parts.find((p) => p.key === "load")?.detail ?? "";
    const overCapacity = health.overloaded && health.score >= 50 && loadLine !== "no availability recorded";
    push(
      health.overloaded
        ? {
            severity: "warn",
            icon: "🫀",
            title: `Health score ${health.score}%`,
            detail: overCapacity
              ? `${loadLine} — the calendar is over capacity, even if the money is good.`
              : "Load, mood and momentum are all drifting.",
            action: "Read the burnout angle before pushing more hours — cut load before adding it.",
          }
        : {
            severity: "info",
            icon: "🔍",
            title: `Health score ${health.score}%`,
            detail: "Nothing here says burnout — the profile or the numbers are simply incomplete.",
            action: "Fill the gaps before drawing conclusions: run an audit, then log the next conversation.",
          },
    );
  }

  return out;
}

/* ---------------------------------------------------------- mentor tasks -- */

export interface TaskStatus {
  task: Task;
  /** Days from today until `dueAt`: 0 today, negative once it is late. */
  daysLeft: number;
  overdue: boolean;
  /** Inside the lead time the mentor set — this is when it should start showing up. */
  inWindow: boolean;
}

/**
 * Where a task stands today.
 *
 * Everything about a task that a screen needs to decide is derived here rather than
 * stored: `done` is the only thing worth persisting, because "3 days late" must still
 * be true tomorrow without anything having to rewrite the record.
 */
export function taskStatus(task: Task, now = new Date()): TaskStatus {
  const daysLeft = task.dueAt ? -daysBetween(task.dueAt, now) : 0;
  return {
    task,
    daysLeft,
    overdue: daysLeft < 0,
    inWindow: daysLeft <= Math.max(0, task.remindDaysBefore || 0),
  };
}

/**
 * Open tasks, most urgent first: late ones at the top, then whatever is due soonest.
 * Anything already ticked off sorts to the bottom so the list never buries today.
 */
export function sortedTasks(tasks: Task[], now = new Date()): TaskStatus[] {
  return tasks
    .map((task) => taskStatus(task, now))
    .sort((a, b) => {
      if (a.task.done !== b.task.done) return a.task.done ? 1 : -1;
      if (a.daysLeft !== b.daysLeft) return a.daysLeft - b.daysLeft;
      return a.task.title.localeCompare(b.task.title);
    });
}

/**
 * The mentor's own tasks, turned into the same alerts the roster produces.
 *
 * They deliberately ride the existing nudge pipeline rather than a second list next to
 * it: a reminder you wrote is exactly as important as one the engine noticed, it should
 * sort by the same "handle today / this week" rule, and it should bump the badge in the
 * sidebar. A task shows up only when its lead time opens, so a note for next month is
 * filed quietly instead of nagging for thirty days.
 */
export function taskNudges(tasks: Task[], tutors: Tutor[] = [], now = new Date()): Nudge[] {
  const out: Nudge[] = [];
  for (const status of sortedTasks(tasks, now)) {
    const { task, daysLeft } = status;
    if (task.done || !task.dueAt) continue;
    if (!status.inWindow && !status.overdue) continue;
    const owner = task.tutorId ? tutors.find((t) => t.id === task.tutorId) : undefined;
    const late = status.overdue;
    const when = late
      ? `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} overdue (was due ${shortDate(task.dueAt)})`
      : daysLeft === 0
        ? "due today"
        : `due in ${daysLeft} day${daysLeft === 1 ? "" : "s"} (${shortDate(task.dueAt)})`;
    out.push({
      id: `task:${task.id}`,
      tutorId: task.tutorId,
      tutorName: owner?.name ?? (task.tutorId ? "someone no longer on the roster" : "Whole roster"),
      severity: late || daysLeft === 0 ? "urgent" : "warn",
      icon: task.kind === "reminder" ? "⏰" : "📌",
      title: task.title,
      detail: `${when}${task.detail ? ` · ${task.detail}` : ""}`.slice(0, 180),
      action: late
        ? "Do it now, or move the date so it stops nagging you."
        : "Write the message or make the call, then tick it off on the board.",
    });
  }
  return out;
}

export function allNudges(tutors: Tutor[], tasks: Task[] = []): Nudge[] {
  const order: Record<NudgeSeverity, number> = { urgent: 0, warn: 1, info: 2 };
  return [...tutors.flatMap((t) => nudgesFor(t)), ...taskNudges(tasks, tutors)].sort(
    (a, b) => order[a.severity] - order[b.severity],
  );
}

/* ------------------------------------------------------- falling behind --- */

export interface FallingBehind {
  tutor: Tutor;
  reasons: string[];
  score: number;
}

/** Tutors whose numbers are sliding, with the reasons spelled out. */
export function fallingBehind(tutors: Tutor[]): FallingBehind[] {
  const out: FallingBehind[] = [];
  for (const tutor of tutors) {
    const reasons: string[] = [];
    const t = weekTrend(tutor);
    const s = sortedSnapshots(tutor);
    const avg = averages(tutor, 3);
    if (t.direction === "down" && t.earningsPercent <= -15) reasons.push(`earnings ${t.earningsPercent}% week over week`);
    if (s.length >= 3) {
      const lastThree = s.slice(-3).map((x) => x.lessons);
      if (lastThree[2] < lastThree[0] && lastThree[1] <= lastThree[0]) reasons.push("lessons falling three weeks running");
    }
    if (avg.rating > 0 && avg.rating < 4.7) reasons.push(`rating ${avg.rating}`);
    if (avg.responseHours > 24) reasons.push(`replies take ${avg.responseHours}h`);
    if (healthOf(tutor).score < 55) reasons.push(`health ${healthOf(tutor).score}%`);
    if (reasons.length >= 2) {
      out.push({ tutor, reasons, score: reasons.length * 25 + (100 - healthOf(tutor).score) / 4 });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

/* --------------------------------------------------------- super tutor ---- */

export interface SuperTutorRow {
  criterion: string;
  target: string;
  value: string;
  met: boolean;
}

/**
 * The nine things Preply's Super Tutor assessment looks at, checked against the
 * numbers actually recorded. Anything the app cannot see is marked "unknown" rather
 * than assumed to be passing — a wrong green tick is worse than an honest blank.
 */
export function superTutorMonitor(tutor: Tutor): SuperTutorRow[] {
  const avg = averages(tutor, 4);
  const totalLessons = sortedSnapshots(tutor).slice(-13).reduce((a, s) => a + s.lessons, 0);
  const trials = sortedSnapshots(tutor).slice(-13).reduce((a, s) => a + s.trials, 0);
  const converted = sortedSnapshots(tutor).slice(-13).reduce((a, s) => a + s.trialsConverted, 0);
  const conversion = trials ? Math.round((converted / trials) * 100) : 0;
  const cancels = sortedSnapshots(tutor).slice(-13).reduce((a, s) => a + s.cancellations, 0);

  const row = (criterion: string, target: string, value: string, met: boolean | null): SuperTutorRow => ({
    criterion,
    target,
    value,
    met: met === null ? false : met,
  });

  return [
    row("Lessons taught (90 days)", "40+", totalLessons ? `${totalLessons}` : "no data", totalLessons ? totalLessons >= 40 : null),
    row("Rating", "4.8+", avg.rating ? avg.rating.toFixed(2) : "no data", avg.rating ? avg.rating >= 4.8 : null),
    row("Absences", "0", "tracked by the platform", null),
    row("Trial → subscription", "50%+", trials ? `${conversion}%` : "no data", trials ? conversion >= 50 : null),
    row("Trial cancellations", "≤5%", "tracked by the platform", null),
    row("Lesson cancellations", "≤20%", cancels ? `${cancels} this quarter` : "none recorded", cancels ? cancels <= Math.max(1, Math.round(totalLessons * 0.2)) : null),
    row("New messages answered in 24h", "80%+", avg.responseHours ? `${avg.responseHours}h average` : "no data", avg.responseHours ? avg.responseHours <= 24 : null),
    row("Trials in the platform classroom", "80%+", "tracked by the platform", null),
    row("Follow-up after the trial", "80%+", "tracked by the platform", null),
  ];
}

/* -------------------------------------------------------------- badges ---- */

export interface Badge {
  id: string;
  label: string;
  emoji: string;
  detail: string;
}

/** Milestone badges, computed from cumulative earnings and profile state. */
export function badgesFor(tutor: Tutor, totalEarningsUsd: number, rialPerUsd: number): Badge[] {
  const out: Badge[] = [];
  const tomanTotal = (totalEarningsUsd * rialPerUsd) / 10;
  const tiers: [number, string][] = [
    [50_000_000, "50M Toman"],
    [100_000_000, "100M Toman"],
    [500_000_000, "500M Toman"],
  ];
  /**
   * One Dollar Warrior badge, at the highest milestone reached.
   *
   * Pushing one badge per threshold crossed put the identical label on the card two and
   * three times for a tutor who had earned 299M Toman, which reads as a rendering bug
   * rather than an achievement. The badge names the milestone behind it and the next one
   * to reach, so it still moves as they earn.
   */
  const reached = tiers.filter(([threshold]) => tomanTotal >= threshold);
  if (reached.length) {
    const [threshold, label] = reached[reached.length - 1];
    const upcoming = tiers.find(([next]) => tomanTotal < next);
    out.push({
      id: `warrior-${threshold}`,
      label: "Dollar Warrior",
      emoji: "🪙",
      detail: upcoming ? `${label} earned — next badge at ${upcoming[1]}` : `${label} earned — every milestone cleared`,
    });
  }
  const c = accountCompleteness(tutor.account);
  if (c.percent === 100) out.push({ id: "complete", label: "Profile complete", emoji: "✅", detail: "Every profile piece is filled in" });
  if (tutor.audit && tutor.audit.powerScore >= 81) out.push({ id: "legendary", label: "Legendary profile", emoji: "👑", detail: `Power score ${tutor.audit.powerScore}` });
  if (latestSnapshot(tutor)?.trialsConverted) out.push({ id: "closer", label: "Trial closer", emoji: "🤝", detail: "Converted a trial into a subscription" });
  if (tutor.phase === "active" && averages(tutor, 4).activeStudents >= 5) out.push({ id: "busy", label: "Booked up", emoji: "📚", detail: "5+ active students" });
  return out;
}

/* ------------------------------------------------------------- factories -- */

export function emptyAccount(): AccountData {
  return {
    headlines: [],
    description: "",
    videoScripts: [],
    yearsOfExperience: 0,
    subjects: [],
    proficiencyLevels: [],
    ageGroups: [],
    certificates: [],
    specialties: [],
    availabilityHours: 0,
    priceUsd: 0,
    extra: {},
  };
}

export function newTutor(partial: Partial<Tutor> = {}): Tutor {
  const now = new Date().toISOString();
  const tutor: Tutor = {
    id: `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: "Unnamed tutor",
    latinName: "",
    phone: "",
    country: "",
    startedAt: now.slice(0, 10),
    platformId: "preply",
    phase: "preparing",
    phaseSince: now.slice(0, 10),
    email: "",
    tags: [],
    sourceText: "",
    notes: "",
    account: emptyAccount(),
    snapshots: [],
    logs: [],
    messages: [],
    auditHistory: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
  // The platform list is derived, never copied by hand: it always contains the primary,
  // and a caller who passed only a `platformId` still ends up with a consistent set.
  return { ...tutor, platformIds: uniquePlatformIds(tutor.platformId, partial.platformIds) };
}

/** Primary first, no duplicates, no blanks. */
export function uniquePlatformIds(primary: string, others?: string[]): string[] {
  return [...new Set([primary, ...(others ?? [])].filter(Boolean))];
}

export function newSnapshot(partial: Partial<Snapshot> = {}): Snapshot {
  return {
    id: `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    weekOf: new Date().toISOString().slice(0, 10),
    earningsUsd: 0,
    lessons: 0,
    trials: 0,
    trialsConverted: 0,
    activeStudents: 0,
    newStudents: 0,
    rating: 0,
    responseHours: 0,
    cancellations: 0,
    notes: "",
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

/**
 * A task, with the date defaulted to today.
 *
 * A task with no date would be invisible in every list this app has — the date is what
 * puts it in front of you — so today is a better starting point than an empty field,
 * and the mentor can drag it forward from there.
 */
export function newTask(partial: Partial<Task> = {}): Task {
  return {
    id: `k_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    title: "",
    detail: "",
    dueAt: new Date().toISOString().slice(0, 10),
    remindDaysBefore: 1,
    tutorId: "",
    kind: "task" as TaskKind,
    done: false,
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

export function newLog(partial: Partial<LogEntry> = {}): LogEntry {
  return {
    id: `l_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    kind: "chat",
    summary: "",
    language: "",
    raw: "",
    mood: "unknown",
    swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
    followUps: [],
    actions: [],
    ...partial,
  };
}

/** The audit's headline numbers, or honest zeros. */
export function scoresOf(tutor: Tutor): { power: number; probability: number; hasAudit: false | Audit } {
  if (!tutor.audit) return { power: 0, probability: 0, hasAudit: false };
  return { power: tutor.audit.powerScore, probability: tutor.audit.successProbability, hasAudit: tutor.audit };
}

/* --------------------------------------------------------- cultural cal ---- */

export interface CulturalEvent {
  name: string;
  emoji: string;
  /** Month (1-12) and day. */
  month: number;
  day: number;
  note: string;
  windowBeforeDays: number;
}

/**
 * The events that move a tutor's calendar. Booked hours follow the Iranian calendar
 * closely — nowruz empties the week, and the nights before a holiday fill up with
 * students who want a lesson before they travel.
 */
export const CULTURAL_EVENTS: CulturalEvent[] = [
  { name: "Nowruz", emoji: "🌷", month: 3, day: 21, note: "New year — tutors travel. Cut availability for the week and say why, in advance.", windowBeforeDays: 14 },
  { name: "Chaharshanbe Suri", emoji: "🔥", month: 3, day: 18, note: "Last Tuesday before Nowruz. Evenings are gone; mornings open up instead.", windowBeforeDays: 7 },
  { name: "Eid al-Fitr", emoji: "🌙", month: 3, day: 20, note: "Dates move with the lunar calendar — confirm the year's date before planning.", windowBeforeDays: 10 },
  { name: "Yalda Night", emoji: "🍉", month: 12, day: 21, note: "Longest night of the year, family-first. Same treatment as Nowruz.", windowBeforeDays: 7 },
  { name: "Muharram", emoji: "🕌", month: 6, day: 26, note: "Quieter fortnight for many tutors — students abroad still book, so keep mornings open.", windowBeforeDays: 10 },
  { name: "Mehregan", emoji: "🍂", month: 10, day: 2, note: "Autumn festival. A good excuse for a warm message and an extra evening slot.", windowBeforeDays: 5 },
];

export function upcomingEvents(now = new Date(), withinDays = 45): (CulturalEvent & { inDays: number })[] {
  return CULTURAL_EVENTS.map((e) => {
    const thisYear = new Date(now.getFullYear(), e.month - 1, e.day);
    const next = thisYear.getTime() < now.getTime() ? new Date(now.getFullYear() + 1, e.month - 1, e.day) : thisYear;
    return { ...e, inDays: Math.round((next.getTime() - now.getTime()) / 86_400_000) };
  })
    .filter((e) => e.inDays <= withinDays)
    .sort((a, b) => a.inDays - b.inDays);
}

/* ----------------------------------------------------------------- misc --- */

export function totalEarnings(tutor: Tutor): number {
  return sortedSnapshots(tutor).reduce((a, s) => a + s.earningsUsd, 0);
}

export function scoreColor(score: number): string {
  if (score >= 81) return "#F59E0B";
  if (score >= 61) return "#8B5CF6";
  if (score >= 41) return "#3B82F6";
  return "#64748B";
}

export function moodMeta(mood: LogEntry["mood"]): { emoji: string; label: string; color: string } {
  switch (mood) {
    case "thriving":
      return { emoji: "🌟", label: "Thriving", color: "#10B981" };
    case "steady":
      return { emoji: "🙂", label: "Steady", color: "#3B82F6" };
    case "worried":
      return { emoji: "😟", label: "Worried", color: "#F59E0B" };
    case "at-risk":
      return { emoji: "🚨", label: "At risk", color: "#EF4444" };
    default:
      return { emoji: "❔", label: "Unknown", color: "#64748B" };
  }
}
