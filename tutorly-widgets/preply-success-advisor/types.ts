/**
 * The whole domain model for the Preply Success Advisor.
 *
 * The app is a mentor's CRM for tutors spread across several teaching platforms.
 * Everything a tutor is — their account content, their working status, their goals,
 * their numbers, the conversations you had with them — hangs off one `Tutor` record,
 * so exporting one JSON file really is a complete backup.
 *
 * Almost every field is optional or defaulted, because the data arrives from an
 * external AI as pasted JSON and the model must survive whatever shape it comes back
 * in. `lib/normalize.ts` is the only place allowed to turn that raw JSON into these
 * types — never trust a field to be the right shape anywhere else.
 */

/* ------------------------------------------------------------------ phases -- */

/**
 * Where a tutor stands in the pipeline. This is the spine of the whole app: the
 * dashboard is a board over these four columns, and every reminder is driven by how
 * long someone has sat in one of them.
 */
export type PhaseId = "preparing" | "waiting" | "active" | "passive";

export interface PhaseMeta {
  id: PhaseId;
  label: string;
  short: string;
  emoji: string;
  /** One line the mentor can act on. */
  goal: string;
  color: string;
  /** How long someone may stay here before the app nags you about them. */
  nudgeAfterDays: number;
}

/* --------------------------------------------------------------- platforms -- */

export interface PlatformRule {
  label: string;
  detail: string;
}

export interface Platform {
  id: string;
  name: string;
  /** Brand color used for the platform chip, the card accent and the glow. */
  color: string;
  /** Where the color came from, shown in Settings so a guess is never passed off as fact. */
  colorSource: string;
  emoji: string;
  /**
   * The platform's real logo — a URL or an inlined data URL.
   *
   * Built-ins default to their own favicon, inlined (see `lib/platformLogos.ts`), so the
   * logo shows even with no network. Settings renders this instead of the emoji, falls
   * back to the emoji when it cannot load, and lets you point it at any other image URL.
   */
  logoUrl?: string;
  /** Commission the platform keeps, as a fraction, used in income projections. */
  commission: number;
  signupUrl: string;
  /** Platform-specific rules the AI must respect when it writes for this platform. */
  rules: PlatformRule[];
  /**
   * What this platform's profile page actually asks for — drives the Account tab
   * labels and the account-creation prompt, so the same app works everywhere.
   */
  accountFields: string[];
  custom?: boolean;
}

/* ------------------------------------------------------------- account data -- */

export interface Subject {
  name: string;
  description: string;
}

export interface VideoScript {
  plain: string;
  /** Phonetic stress guide, e.g. "I am a pro-FESS-ion-al TUT-or". */
  pronunciation: string;
}

/**
 * The content that makes up the tutor's public profile.
 *
 * Every string here is plain text or light HTML (`<strong>`) — the editors render
 * it as-is, and the exporters never have to escape anything special.
 */
export interface AccountData {
  headlines: string[];
  description: string;
  videoScripts: VideoScript[];
  yearsOfExperience: number;
  subjects: Subject[];
  proficiencyLevels: string[];
  ageGroups: string[];
  certificates: string[];
  specialties: string[];
  /** Open hours per week the tutor keeps on the platform. */
  availabilityHours: number;
  /** Displayed hourly rate in USD (the platform's own currency). */
  priceUsd: number;
  /** Base64 data URL, downscaled on paste. */
  photo?: string;
  /** Anything platform-specific the AI produced that has no fixed home. */
  extra: Record<string, string>;
}

/* ------------------------------------------------------------- performance -- */

/** One week of platform numbers, as reported in the tutor's Insight page. */
export interface Snapshot {
  id: string;
  /** ISO date of the Monday this week starts on. */
  weekOf: string;
  earningsUsd: number;
  lessons: number;
  trials: number;
  trialsConverted: number;
  activeStudents: number;
  newStudents: number;
  rating: number;
  responseHours: number;
  cancellations: number;
  notes: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ audits -- */

export interface SubScore {
  key: string;
  label: string;
  /** 0–100. */
  score: number;
  weight: number;
  tip: string;
}

export interface SuperTutorCheck {
  criterion: string;
  met: boolean;
  value: string;
  target: string;
}

export interface AuditAction {
  title: string;
  why: string;
  how: string;
  impact: "High" | "Medium" | "Low" | string;
}

export interface AuditHistoryPoint {
  at: string;
  powerScore: number;
  successProbability: number;
}

export interface Audit {
  id: string;
  at: string;
  /** Profile Power Score, 0–100. */
  powerScore: number;
  /** Success Probability Index, 0–100%. */
  successProbability: number;
  subScores: SubScore[];
  strengths: string[];
  weaknesses: string[];
  actions: AuditAction[];
  superTutor: SuperTutorCheck[];
  summary: string;
  sources: { title: string; url: string }[];
}

/* ------------------------------------------------------- goals, plan, comms -- */

export interface Goal {
  monthlyIncomeUsd: number;
  hoursPerWeek: number;
  studentsTarget: number;
  /** e.g. ["Adults", "IELTS candidates", "Business English"]. */
  studentTypes: string[];
  /** A life goal the tutor is saving for, used by the Freedom bar. */
  lifeGoal: string;
  lifeGoalCostUsd: number;
  notes: string;
  createdAt: string;
}

export interface PlanWeek {
  week: number;
  focus: string;
  actions: string[];
  metric: string;
  done: boolean;
}

export interface Plan90 {
  createdAt: string;
  summary: string;
  weeks: PlanWeek[];
}

export interface Swot {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface FollowUp {
  id: string;
  text: string;
  dueAt: string;
  done: boolean;
}

/**
 * One entry in the communication log.
 *
 * You paste the raw chat history; the AI returns a concise rewrite, a read on how
 * the tutor is doing, and the SWOT — that analysis is what the nudges and the
 * consulting prompts read later.
 */
export interface LogEntry {
  id: string;
  at: string;
  kind: "chat" | "note" | "call" | "milestone" | "alert";
  /**
   * The **clean version** of the conversation — what the AI wrote after reading the
   * chat, Persian or English. This is the log: concise, in English, third person, the
   * version you read when you come back to this tutor in a month.
   */
  summary: string;
  /** What language the two of you actually spoke in. */
  language: string;
  /** The conversation as it was pasted. Only kept when “keep the original” is on. */
  raw: string;
  mood: "thriving" | "steady" | "worried" | "at-risk" | "unknown";
  swot: Swot;
  followUps: FollowUp[];
  actions: string[];
  /** A short note of what this conversation changed on the profile, for the timeline. */
  profileUpdates?: string;
}

export type MessageTone = "cheerleader" | "mentor" | "tough-love" | "warmth";

export interface CraftedMessage {
  id: string;
  at: string;
  tone: MessageTone | string;
  occasion: string;
  text: string;
  sentAt?: string;
}

/* ------------------------------------------------------------------ tasks -- */

export type TaskKind = "task" | "reminder";

/**
 * A thing the mentor wrote down themselves.
 *
 * The nudge engine already watches the roster and tells you what it noticed. This is
 * the other half: what *you* decided — "call Sara on Thursday about the price", "chase
 * the certificate photos before the 20th". A task carries its own date and its own
 * lead time, so the reminder appears when it is worth acting on rather than the day it
 * is already too late, and it can be pinned to one tutor or left on the roster at
 * large. Stored on the app, not on a tutor, because "renew the platform subscription"
 * belongs to nobody in particular.
 */
export interface Task {
  id: string;
  title: string;
  /** Anything you want to remember when the reminder fires. */
  detail: string;
  /** ISO date (YYYY-MM-DD) this has to be done by. */
  dueAt: string;
  /** How many days before `dueAt` it starts showing up in Insights. 0 = on the day. */
  remindDaysBefore: number;
  /**
   * The tutor this belongs to, or "" for a roster-wide task.
   *
   * Only the id is stored: a task must never keep its own copy of a name, or renaming
   * a tutor would leave stale text behind on the board. The name is looked up on
   * render, and a task whose tutor left the roster falls back to a plain label.
   */
  tutorId: string;
  kind: TaskKind;
  done: boolean;
  doneAt?: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ tutor -- */

export interface Tutor {
  id: string;
  name: string;
  /**
   * The name in Latin letters, when `name` is not already Latin.
   *
   * The reason this exists: a mentor's roster is full of Farsi/Arabic/CJK names that no
   * platform form, spreadsheet column or English-language email audience can read. The
   * roster-import prompt asks the AI for this transliteration (علیرضا ابتهاج →
   * "Alireza Ebtehaj"), and every account-creation prompt can then use it where the
   * platform requires Latin script. Blank is a valid value — the name is already Latin.
   */
  latinName: string;
  phone: string;
  country: string;
  /** ISO date they joined your roster. */
  startedAt: string;
  /** The main platform — the one their account content and commission are built for. */
  platformId: string;
  /**
   * Every platform this tutor actually teaches on.
   *
   * One person is routinely listed on several (Preply for adults, AmazingTalker for the
   * Asian market, Classgap for Spain). `platformId` stays the primary so nothing that
   * already reads a single platform changes meaning, and this is the full set, always
   * including the primary. Empty on records saved before this existed — read it through
   * `tutorPlatforms()`, never directly.
   */
  platformIds?: string[];
  phase: PhaseId;
  /** ISO date they entered the current phase — powers the "stuck here" nudges. */
  phaseSince: string;
  avatar?: string;
  email: string;
  tags: string[];
  /** The original background material (résumé, notes) the AI works from. */
  sourceText: string;
  /**
   * Running mentor notes, newest last. Conversations append to this — what they are
   * saving for, what is going on at home, what they asked you to remember — so the
   * context lives with the tutor instead of in your head.
   */
  notes: string;
  /**
   * Why this tutor is not being worked on — the reason you stopped, paused or never started.
   *
   * Separate from `notes` on purpose: notes are everything you know about a person and grow
   * forever, while this is one answer to one question, the one you are asked when a tutor goes
   * quiet or leaves the platform. It is what the Not-active sheet of the spreadsheet reports, so
   * the reason sits beside the name rather than inside a paragraph of history.
   */
  holdNote?: string;
  /** When that reason was last written, so a stale "too expensive right now" reads as stale. */
  holdNoteAt?: string;
  account: AccountData;
  goal?: Goal;
  plan?: Plan90;
  snapshots: Snapshot[];
  logs: LogEntry[];
  messages: CraftedMessage[];
  /** The most recent audit — the one every screen reads. */
  audit?: Audit;
  /** Every score this tutor has ever been given, oldest first, for the trend line. */
  auditHistory: AuditHistoryPoint[];
  nextFollowUpAt?: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------- app -- */

export interface TomanSettings {
  /** Iranian rial per USD. */
  rialPerUsd: number;
  updatedAt: string;
  /** Where the number came from — “you”, a live provider name, or a relay. */
  source?: string;
  /** True when the last update came from a free-market provider rather than typing. */
  live?: boolean;
}

/** How the app behaves, as opposed to what it knows. */
/**
 * Preferences.
 *
 * `keepRawLogs` is off by default on purpose: you asked for the log to be the clean
 * version, so the original chat is not stored unless you switch this on.
 */
export interface Preferences {
  keepRawLogs: boolean;
  autoRateRefresh: boolean;
}

export interface AppState {
  version: number;
  tutors: Tutor[];
  /** The mentor's own to-dos and reminders, in any order — screens sort them by date. */
  tasks: Task[];
  /** Custom platforms the mentor defined, merged over the built-in registry. */
  customPlatforms: Platform[];
  toman: TomanSettings;
  prefs: Preferences;
  lastFolderSyncAt?: string;
  folderName?: string;
}

export interface Message {
  text: string;
  sender: "user" | "bot";
}
