import React, { useMemo, useState } from "react";
import type { PhaseId, Platform, Task, TaskKind, Tutor } from "../types";
import { allPlatforms, platformOf, tutorPlatforms, worksOnPlatform } from "../lib/platforms";
import { Avatar, Btn, Card, Empty, Field, Gauge, HeartScore, Modal, Pill, PlatformMark, SectionTitle, Stat, inputClass } from "../components/ui";
import { PHASES, averages, healthOf, latestSnapshot, nudgesFor, phaseMeta, scoreColor, sortedTasks, tierFor, weekTrend } from "../lib/domain";

import { moneyPair, num, relativeDate, shortDate, usd } from "../lib/format";
import { daysBetween } from "../lib/format";
import type { Toast } from "../lib/useAppState";

/**
 * The board.
 *
 * Four columns, one per phase, because the mentor's actual job is "who needs me
 * today, and what do I say" — not "browse a list". Every card surfaces the two things
 * that decide that: whether they are stuck (days in this phase), and how healthy they
 * are (score + heart). Search and filters are there for when the roster gets long.
 */

interface BoardViewProps {
  tutors: Tutor[];
  /** The mentor's own to-dos and reminders. */
  tasks: Task[];
  customPlatforms: Platform[];
  rialPerUsd: number;
  onOpenTutor: (id: string) => void;
  onAddTask: (partial: Partial<Task>) => Task;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onSetPhase: (id: string, phase: PhaseId) => void;
  onAddTutor: (partial: Partial<Tutor>) => void;
  onOpenRosterImport: () => void;
  /** The roster-wide message sweep: one prompt, one chat export, every tutor logged at once. */
  onOpenRosterComms: () => void;
  onDelete: (id: string) => void;
  toast: (message: string, tone?: Toast["tone"]) => void;
}

const PHASE_ORDER: PhaseId[] = ["preparing", "waiting", "active", "passive"];

/** How far ahead a reminder can start nagging. */
const LEAD_OPTIONS: { days: number; label: string }[] = [
  { days: 0, label: "On the day" },
  { days: 1, label: "1 day before" },
  { days: 2, label: "2 days before" },
  { days: 3, label: "3 days before" },
  { days: 7, label: "1 week before" },
  { days: 14, label: "2 weeks before" },
];

const KINDS: { id: TaskKind; label: string; icon: string; hint: string }[] = [
  { id: "task", label: "Task", icon: "📌", hint: "Something you have to do" },
  { id: "reminder", label: "Reminder", icon: "⏰", hint: "Something you must not forget on a date" },
];

/** Red once it is late, amber inside the lead time, quiet while it is still ahead. */
function dueTone(overdue: boolean, inWindow: boolean): string {
  if (overdue) return "#EF4444";
  if (inWindow) return "#F59E0B";
  return "#64748B";
}

const TutorMiniCard: React.FC<{
  tutor: Tutor;
  platform: Platform;
  customPlatforms: Platform[];
  rialPerUsd: number;
  onOpen: () => void;
  onPhase: (phase: PhaseId) => void;
}> = ({ tutor, platform, customPlatforms, rialPerUsd, onOpen, onPhase }) => {
  const score = tutor.audit?.powerScore ?? 0;
  const tier = tierFor(score);
  const health = healthOf(tutor);
  const stuckFor = daysBetween(tutor.phaseSince || tutor.createdAt);
  const phase = phaseMeta(tutor.phase);
  const overdue = stuckFor >= phase.nudgeAfterDays;
  const alerts = nudgesFor(tutor);
  const last = latestSnapshot(tutor);
  const trend = weekTrend(tutor);

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-black/12 bg-white p-3 transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-20px_rgba(18,17,24,0.35)] ${tier.glow}`}
    >
      <div className="flex items-start gap-2.5">
        <Avatar src={tutor.avatar} name={tutor.name} size={40} glow={score >= 61 ? tier.glow : undefined} ring={`${platform.color}44`} />
        <div className="min-w-0 flex-1">
          <button onClick={onOpen} className="block max-w-full truncate text-left text-sm font-bold hover:text-[#FF79AC]">
            {tutor.name}
          </button>
          {tutor.latinName && tutor.latinName.toLowerCase() !== tutor.name.toLowerCase() && (
            <p className="truncate text-[12px] font-semibold text-[#121118]/88">{tutor.latinName}</p>
          )}
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            <Pill tone={platform.color} title={platform.colorSource}>
              <PlatformMark platform={platform} size={13} /> {platform.name}
            </Pill>
            {/* A second chip for each extra platform, so several-marketplace tutors read
                at a glance without opening the profile. */}
            {tutorPlatforms(tutor, customPlatforms)
              .filter((p) => p.id !== platform.id)
              .map((p) => (
                <Pill key={p.id} tone={p.color} title={`Also on ${p.name}`} className="!px-2 !py-0.5">
                  <PlatformMark platform={p} size={12} />
                </Pill>
              ))}
            {tutor.audit && (
              <Pill tone={scoreColor(score)} title="Profile Power Score">
                {tier.emoji} {score}
              </Pill>
            )}
            {overdue && (
              <Pill tone="#EF4444" title={`${stuckFor} days in this phase`}>
                ⏰ {stuckFor}d
              </Pill>
            )}
            {alerts.length > 0 && <Pill tone="#F59E0B">{alerts.length} alert{alerts.length > 1 ? "s" : ""}</Pill>}
          </div>
          <p className="mt-1 text-[12px] text-[#121118]/82">
            {last ? (
              <>
                {usd(last.earningsUsd)} last week{" "}
                {trend.direction !== "flat" && (
                  <span className={trend.direction === "up" ? "text-emerald-600" : "text-red-500"}>
                    {trend.direction === "up" ? "▲" : "▼"} {Math.abs(trend.earningsPercent)}%
                  </span>
                )}
              </>
            ) : (
              "no numbers yet"
            )}
          </p>
        </div>
        <div className="shrink-0 text-center">
          <HeartScore value={health.score} size={38} />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {PHASE_ORDER.map((p) => (
            <button
              key={p}
              onClick={() => onPhase(p)}
              title={`Move to ${phaseMeta(p).label}`}
              className={`h-6 w-6 rounded-lg text-[12px] transition-all ${
                tutor.phase === p ? "ring-2 ring-offset-1" : "opacity-35 hover:opacity-100"
              }`}
              style={{ background: `${phaseMeta(p).color}22`, color: phaseMeta(p).color, boxShadow: tutor.phase === p ? `0 0 0 2px ${phaseMeta(p).color}` : undefined }}
            >
              {phaseMeta(p).emoji}
            </button>
          ))}
        </div>
        <Btn size="sm" variant="ghost" onClick={onOpen}>
          Open →
        </Btn>
      </div>

      {tutor.account.priceUsd > 0 && (
        <p className="mt-1 text-[11px] text-[#121118]/76">{moneyPair(tutor.account.priceUsd, rialPerUsd)} per hour</p>
      )}
    </div>
  );
};

const BoardView: React.FC<BoardViewProps> = ({
  tutors,
  tasks,
  customPlatforms,
  rialPerUsd,
  onOpenTutor,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onSetPhase,
  onAddTutor,
  onOpenRosterImport,
  onOpenRosterComms,
  onDelete,
  toast,
}) => {
  const [query, setQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const todayIso = new Date().toISOString().slice(0, 10);
  const [taskDraft, setTaskDraft] = useState({
    title: "",
    detail: "",
    dueAt: todayIso,
    remindDaysBefore: 1,
    tutorId: "",
    kind: "task" as TaskKind,
  });
  const [draft, setDraft] = useState({
    name: "",
    latinName: "",
    phone: "",
    country: "",
    platformId: "preply",
    phase: "preparing" as PhaseId,
    startedAt: new Date().toISOString().slice(0, 10),
  });

  const platforms = useMemo(() => allPlatforms(customPlatforms), [customPlatforms]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tutors.filter((t) => {
      // Any platform they work on counts, not just the primary — a tutor listed on Preply
      // and AmazingTalker must appear under both filters.
      if (platformFilter !== "all" && !worksOnPlatform(t, platformFilter)) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.latinName.toLowerCase().includes(q) ||
        t.phone.includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        tutorPlatforms(t, customPlatforms).some((p) => p.name.toLowerCase().includes(q))
      );
    });
  }, [tutors, query, platformFilter, customPlatforms]);

  /*
   * Tasks, resolved once for the whole card: statuses carry the derived "3 days late"
   * arithmetic, and the owner's name is looked up live so a rename shows through here
   * the moment it happens instead of leaving a stale string in the list.
   */
  const taskRows = useMemo(() => sortedTasks(tasks), [tasks]);
  const openTasks = taskRows.filter((r) => !r.task.done);
  const doneTasks = taskRows.filter((r) => r.task.done);
  const actingNow = openTasks.filter((r) => r.overdue || r.inWindow);
  const laterTasks = openTasks.filter((r) => !r.overdue && !r.inWindow);
  const tutorName = (id: string) => tutors.find((t) => t.id === id)?.name;

  /**
   * Save the draft task.
   *
   * The date and the lead time are kept after saving on purpose: a mentor usually writes
   * three things for the same person on the same day, and re-picking the date each time
   * is how a task ends up backdated to last week.
   */
  const saveTask = () => {
    if (!taskDraft.title.trim()) {
      toast("Give the task a title so you remember what it was about.", "error");
      return;
    }
    const created = onAddTask({ ...taskDraft, title: taskDraft.title.trim(), detail: taskDraft.detail.trim() });
    const owner = taskDraft.tutorId ? tutorName(taskDraft.tutorId) : "";
    toast(`${created.kind === "reminder" ? "Reminder" : "Task"} saved for ${shortDate(created.dueAt)}${owner ? ` · ${owner}` : ""}.`);
    setTaskDraft((d) => ({ ...d, title: "", detail: "" }));
    setTaskOpen(false);
  };

  /* Where the reminder will start showing up, so the lead time is not a guess. */
  const windowStart = useMemo(() => {
    const due = new Date(`${taskDraft.dueAt}T00:00:00`);
    if (Number.isNaN(due.getTime())) return "";
    due.setDate(due.getDate() - taskDraft.remindDaysBefore);
    return due.toISOString().slice(0, 10);
  }, [taskDraft.dueAt, taskDraft.remindDaysBefore]);

  const summaries = useMemo(() => {
    const urgent = tutors.flatMap((t) => nudgesFor(t)).filter((n) => n.severity === "urgent").length;
    const weekEarnings = tutors.reduce((a, t) => a + (latestSnapshot(t)?.earningsUsd ?? 0), 0);
    const active = tutors.filter((t) => t.phase === "active").length;
    /**
     * The average of the profiles that have actually been audited.
     *
     * Counting an unaudited tutor as zero made a roster of brand-new people look like a
     * failing one, and the mentor would read that headline as bad profiles when the
     * truth is that nobody has run the Master AI yet. The subtitle says how many were
     * scored, so the number can never be read as a whole-roster verdict.
     */
    const scored = tutors.filter((t) => t.audit);
    const avgScore = scored.length
      ? Math.round(scored.reduce((a, t) => a + (t.audit?.powerScore ?? 0), 0) / scored.length)
      : 0;
    return { urgent, weekEarnings, active, avgScore, scoredCount: scored.length };
  }, [tutors]);

  return (
    <div>
      <SectionTitle
        icon="🗂️"
        title="Tutor Dashboard"
        sub={`${tutors.length} on the roster · ${summaries.active} actively teaching`}
        right={
          <div className="flex flex-wrap gap-2">
            {/*
             * Update All sits first and reads as the heaviest action of the three, because
             * it is: the other two add people, this one writes into everyone's record at
             * once. It is outlined rather than filled so it cannot be mistaken for a
             * one-tap operation — it opens a prompt you have to read and run.
             */}
            {tutors.length > 0 && (
              <Btn variant="outline" onClick={onOpenRosterComms} title="Write up every tutor's messages from one chat export">
                🔄 Update All
              </Btn>
            )}
            <Btn variant="outline" onClick={onOpenRosterImport}>
              🤖 Add from a spreadsheet
            </Btn>
            <Btn onClick={() => setAdding(true)}>＋ Add manually</Btn>
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="On the roster" value={num(tutors.length)} icon="👥" sub={`${summaries.active} active`} />
        <Stat label="Needs you today" value={num(summaries.urgent)} tone={summaries.urgent ? "#EF4444" : undefined} icon="🚨" sub="urgent alerts" />
        <Stat label="Earned last week" value={usd(summaries.weekEarnings)} icon="💵" sub="across the roster" />
        <Stat
          label="Average power score"
          value={summaries.scoredCount ? summaries.avgScore : "—"}
          icon="⭐"
          sub={
            summaries.scoredCount
              ? `out of 100 · ${summaries.scoredCount} of ${tutors.length} audited`
              : "no profile audited yet"
          }
        />
      </div>

      {/*
       * Tasks and reminders.
       *
       * Deliberately above the columns: this is the list the mentor writes in, so it has to
       * be on the first screen of the board. Late items float to the top through
       * `sortedTasks`, and the lead time means a note for next month stays out of the way
       * until it starts to matter.
       */}
      <Card className="mb-5">
        <SectionTitle
          icon="📌"
          title="Tasks & reminders"
          sub={
            openTasks.length
              ? `${openTasks.length} open · ${actingNow.length} need you now${laterTasks.length ? ` · ${laterTasks.length} scheduled later` : ""}`
              : "Write down what you must not forget — Insights will show it when its lead time opens."
          }
          right={<Btn onClick={() => setTaskOpen(true)}>＋ Add task</Btn>}
        />

        {openTasks.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-black/16 p-4 text-center text-[12px] text-[#121118]/76">
            Nothing written down yet. A task carries its own date and its own lead time, so it appears in{" "}
            Insights → Handle today exactly when it is worth acting on — not a month early.
          </p>
        ) : (
          <ul className="space-y-2">
            {openTasks.slice(0, 6).map(({ task, daysLeft, overdue, inWindow }) => (
              <li
                key={task.id}
                className={`flex items-start gap-3 rounded-2xl border p-3 ${overdue ? "border-red-200 bg-red-50" : "border-black/12"}`}
              >
                <button
                  onClick={() => onToggleTask(task.id)}
                  title="Mark as done"
                  className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-black/20 bg-white text-[13px] hover:border-[#FF79AC]"
                >
                  {task.kind === "reminder" ? "⏰" : "📌"}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{task.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Pill tone={dueTone(overdue, inWindow)}>
                      {overdue
                        ? `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} late`
                        : daysLeft === 0
                          ? "today"
                          : `in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}{" "}
                      · {shortDate(task.dueAt)}
                    </Pill>
                    {task.tutorId ? (
                      <button
                        onClick={() => onOpenTutor(task.tutorId)}
                        className="rounded-full bg-black/[0.06] px-2.5 py-1 text-[12px] font-semibold hover:text-[#FF79AC]"
                      >
                        {tutorName(task.tutorId) ?? "tutor no longer on the roster"}
                      </button>
                    ) : (
                      <Pill tone="#64748B">whole roster</Pill>
                    )}
                    <span className="text-[12px] text-[#121118]/76">
                      reminds {task.remindDaysBefore === 0 ? "on the day" : `${task.remindDaysBefore} day${task.remindDaysBefore === 1 ? "" : "s"} before`}
                    </span>
                  </div>
                  {task.detail && <p className="mt-1 text-[12px] text-[#121118]/86">{task.detail}</p>}
                </div>
                <Btn
                  size="sm"
                  variant="ghost"
                  title="Delete this task"
                  onClick={() => {
                    if (window.confirm(`Delete “${task.title}”? This only removes the reminder.`)) {
                      onDeleteTask(task.id);
                    }
                  }}
                >
                  🗑
                </Btn>
              </li>
            ))}
            {openTasks.length > 6 && (
              <li className="text-[12px] text-[#121118]/76">
                +{openTasks.length - 6} more open — the rest are in Insights.
              </li>
            )}
          </ul>
        )}

        {doneTasks.length > 0 && (
          <div className="mt-3">
            <Btn size="sm" variant="ghost" onClick={() => setShowDone((v) => !v)}>
              {showDone ? "Hide" : "Show"} {doneTasks.length} done
            </Btn>
            {showDone && (
              <ul className="mt-2 space-y-1.5">
                {doneTasks.slice(0, 8).map(({ task }) => (
                  <li key={task.id} className="flex items-center gap-2 rounded-xl border border-black/12 p-2 text-[12px]">
                    <button onClick={() => onToggleTask(task.id)} title="Put it back on the list" className="text-[13px]">
                      ✅
                    </button>
                    <span className="min-w-0 flex-1 truncate text-[#121118]/70 line-through">{task.title}</span>
                    <span className="text-[#121118]/70">{shortDate(task.dueAt)}</span>
                    <Btn size="sm" variant="ghost" onClick={() => onDeleteTask(task.id)}>
                      🗑
                    </Btn>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      <Card className="mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Search" className="min-w-[200px] flex-1">
            <input className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, phone, tag or platform…" />
          </Field>
          <Field label="Platform">
            <select className={inputClass} value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
              <option value="all">All platforms</option>
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.emoji} {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Btn
            variant="ghost"
            onClick={() => {
              setQuery("");
              setPlatformFilter("all");
            }}
          >
            Clear
          </Btn>
          <span className="pb-2 text-xs text-[#121118]/82">
            showing {filtered.length} of {tutors.length}
          </span>
        </div>
      </Card>

      {tutors.length === 0 ? (
        <Empty
          icon="📋"
          title="No tutors yet"
          body="Start with your spreadsheet: the AI turns it into a roster with names, phone numbers and start dates in one paste."
          action={
            <div className="flex gap-2">
              <Btn onClick={onOpenRosterImport}>🤖 Add from a spreadsheet</Btn>
              <Btn variant="outline" onClick={() => setAdding(true)}>
                ＋ Add one manually
              </Btn>
            </div>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-4">
          {PHASES.map((phase) => {
            const column = filtered.filter((t) => t.phase === phase.id);
            return (
              <section key={phase.id} className="rounded-3xl border border-black/12 bg-white/60 p-3">
                <header className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="flex items-center gap-1.5 text-sm font-bold">
                      <span>{phase.emoji}</span>
                      {phase.short}
                      <span className="rounded-full bg-black/12 px-1.5 py-0.5 text-[11px] font-bold text-[#121118]/85">{column.length}</span>
                    </h3>
                    <p className="mt-0.5 text-[12px] leading-snug text-[#121118]/82">{phase.goal}</p>
                  </div>
                  <span className="mt-1 h-8 w-1.5 shrink-0 rounded-full" style={{ background: phase.color }} />
                </header>
                <div className="space-y-2.5">
                  {column.map((tutor) => (
                    <TutorMiniCard
                      key={tutor.id}
                      tutor={tutor}
                      platform={platformOf(tutor.platformId, customPlatforms)}
                      customPlatforms={customPlatforms}
                      rialPerUsd={rialPerUsd}
                      onOpen={() => onOpenTutor(tutor.id)}
                      onPhase={(p) => {
                        onSetPhase(tutor.id, p);
                        toast(`${tutor.name} moved to ${phaseMeta(p).label}.`, "info");
                      }}
                    />
                  ))}
                  {column.length === 0 && (
                    <p className="rounded-2xl border border-dashed border-black/16 p-4 text-center text-[12px] text-[#121118]/76">
                      nobody here
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* An at-a-glance list for the mentors who prefer a table. */}
      {tutors.length > 0 && (
        <Card className="mt-6 overflow-x-auto">
          <SectionTitle icon="📊" title="Every tutor, one line each" sub="sorted by what needs attention first" />
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-wide text-[#121118]/78">
                <th className="pb-2">Tutor</th>
                <th className="pb-2">Phase</th>
                <th className="pb-2">Score</th>
                <th className="pb-2">Health</th>
                <th className="pb-2">Last week</th>
                <th className="pb-2">Avg 4w</th>
                <th className="pb-2">Alerts</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {[...filtered]
                .sort((a, b) => nudgesFor(b).length - nudgesFor(a).length)
                .map((t) => {
                  const avg = averages(t, 4);
                  const last = latestSnapshot(t);
                  const alerts = nudgesFor(t);
                  const platform = platformOf(t.platformId, customPlatforms);
                  return (
                    <tr key={t.id} className="border-t border-black/12">
                      <td className="py-2">
                        <button onClick={() => onOpenTutor(t.id)} className="flex items-center gap-2 font-semibold hover:text-[#FF79AC]">
                          <Avatar src={t.avatar} name={t.name} size={26} ring={`${platform.color}44`} />
                          {t.name}
                        </button>
                      </td>
                      <td className="py-2">
                        <Pill tone={phaseMeta(t.phase).color}>
                          {phaseMeta(t.phase).emoji} {phaseMeta(t.phase).short}
                        </Pill>
                      </td>
                      <td className="py-2 tabular-nums">{t.audit ? t.audit.powerScore : "—"}</td>
                      <td className="py-2 tabular-nums">{healthOf(t).score}%</td>
                      <td className="py-2 tabular-nums">{last ? usd(last.earningsUsd) : "—"}</td>
                      <td className="py-2 tabular-nums">
                        {avg.sampleSize ? usd(avg.earningsUsd) : "—"}
                        {avg.sampleSize > 1 && <span className="ml-1 text-[11px] text-[#121118]/76">({avg.sampleSize}w)</span>}
                      </td>
                      <td className="py-2">
                        {alerts.length ? <Pill tone={alerts[0].severity === "urgent" ? "#EF4444" : "#F59E0B"}>{alerts.length}</Pill> : <span className="text-[#121118]/82">—</span>}
                      </td>
                      <td className="py-2 text-right">
                        <Btn size="sm" variant="ghost" onClick={() => onOpenTutor(t.id)}>
                          Open
                        </Btn>
                        <Btn
                          size="sm"
                          variant="ghost"
                          title="Remove from the roster"
                          onClick={() => {
                            if (window.confirm(`Remove ${t.name} from the roster? Their data is deleted from this app only.`)) {
                              onDelete(t.id);
                              toast(`${t.name} removed.`, "info");
                            }
                          }}
                        >
                          🗑
                        </Btn>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        title="Add a task or reminder"
        subtitle="Only the title is required — when you set the date, Insights starts showing this at the right moment."
        footer={
          <>
            <Btn variant="ghost" onClick={() => setTaskOpen(false)}>
              Cancel
            </Btn>
            <Btn onClick={saveTask}>Add task</Btn>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="What needs doing" className="sm:col-span-2" hint="Written in your own words — it is shown exactly like this in Insights">
            <input
              className={inputClass}
              value={taskDraft.title}
              onChange={(e) => setTaskDraft({ ...taskDraft, title: e.target.value })}
              placeholder="e.g. Ask Sara for the new profile screenshot"
              autoFocus
            />
          </Field>
          <Field label="Due date">
            <input type="date" className={inputClass} value={taskDraft.dueAt} onChange={(e) => setTaskDraft({ ...taskDraft, dueAt: e.target.value })} />
          </Field>
          <Field label="Remind me" hint="Before this window it stays out of the way">
            <select
              className={inputClass}
              value={taskDraft.remindDaysBefore}
              onChange={(e) => setTaskDraft({ ...taskDraft, remindDaysBefore: Number(e.target.value) })}
            >
              {LEAD_OPTIONS.map((o) => (
                <option key={o.days} value={o.days}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Belongs to" hint="Leave on the whole roster for things that are not about one person">
            <select className={inputClass} value={taskDraft.tutorId} onChange={(e) => setTaskDraft({ ...taskDraft, tutorId: e.target.value })}>
              <option value="">👥 Whole roster</option>
              {[...tutors]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {phaseMeta(t.phase).emoji} {t.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Type">
            <div className="flex gap-2">
              {KINDS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setTaskDraft({ ...taskDraft, kind: k.id })}
                  className={`flex-1 rounded-2xl border px-3 py-2 text-left text-[12px] transition-all ${
                    taskDraft.kind === k.id ? "border-[#FF79AC] bg-[#FF79AC]/10" : "border-black/12"
                  }`}
                >
                  <span className="mr-1">{k.icon}</span>
                  <b>{k.label}</b>
                  <span className="block text-[#121118]/76">{k.hint}</span>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Notes (optional)" className="sm:col-span-2">
            <textarea
              className={`${inputClass} min-h-[70px]`}
              value={taskDraft.detail}
              onChange={(e) => setTaskDraft({ ...taskDraft, detail: e.target.value })}
              placeholder="What you promised, what to say, what you need back…"
            />
          </Field>
        </div>
        <p className="mt-3 rounded-2xl bg-black/[0.05] p-3 text-[12px] leading-relaxed text-[#121118]/86">
          On the board it shows as a {KINDS.find((k) => k.id === taskDraft.kind)?.label.toLowerCase()} due{" "}
          {shortDate(taskDraft.dueAt)} ({relativeDate(taskDraft.dueAt)}). Insights picks it up{" "}
          {taskDraft.remindDaysBefore === 0 ? "on the day itself" : `from ${shortDate(windowStart)}, ${taskDraft.remindDaysBefore} day${taskDraft.remindDaysBefore === 1 ? "" : "s"} early`}
          {" "}and puts it under <b>Handle today</b> once it is late.
        </p>
      </Modal>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add a tutor"
        subtitle="Only the name is required — everything else can arrive later from the AI."
        footer={
          <>
            <Btn variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Btn>
            <Btn
              onClick={() => {
                if (!draft.name.trim()) {
                  toast("A name is needed to add someone.", "error");
                  return;
                }
                onAddTutor({ ...draft, phaseSince: draft.startedAt });
                toast(`${draft.name} added to ${phaseMeta(draft.phase).short}.`);
                setDraft({
                  name: "",
                  latinName: "",
                  phone: "",
                  country: "",
                  platformId: "preply",
                  phase: "preparing",
                  startedAt: new Date().toISOString().slice(0, 10),
                });
                setAdding(false);
              }}
            >
              Add tutor
            </Btn>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name">
            <input className={inputClass} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. سارا احمدی" />
          </Field>
          <Field label="Latin name" hint="Optional — for platform forms and English emails">
            <input className={inputClass} value={draft.latinName} onChange={(e) => setDraft({ ...draft, latinName: e.target.value })} placeholder="e.g. Sara Ahmadi" />
          </Field>
          <Field label="Phone / WhatsApp">
            <input className={inputClass} value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="+98 …" />
          </Field>
          <Field label="Platform">
            <select className={inputClass} value={draft.platformId} onChange={(e) => setDraft({ ...draft, platformId: e.target.value })}>
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.emoji} {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Phase">
            <select className={inputClass} value={draft.phase} onChange={(e) => setDraft({ ...draft, phase: e.target.value as PhaseId })}>
              {PHASES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.emoji} {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="On your roster since">
            <input type="date" className={inputClass} value={draft.startedAt} onChange={(e) => setDraft({ ...draft, startedAt: e.target.value })} />
          </Field>
          <Field label="Country">
            <input className={inputClass} value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })} placeholder="Iran" />
          </Field>
        </div>
        <p className="mt-3 rounded-2xl bg-black/[0.05] p-3 text-[12px] leading-relaxed text-[#121118]/86">
          Adding {tutors.length === 0 ? "your first tutor" : "a tutor"} this way creates an empty profile. To fill it,
          open the tutor and run <b>Create the account content</b> — that is where headlines, the description, video
          scripts and subjects come from. Started on {shortDate(draft.startedAt)} means this is{" "}
          {daysBetween(draft.startedAt)} days ago.
        </p>
      </Modal>
    </div>
  );
};

export default BoardView;
