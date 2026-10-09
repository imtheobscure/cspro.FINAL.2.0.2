import React, { useMemo } from "react";
import type { Platform, Task, Tutor } from "../types";
import { platformOf } from "../lib/platforms";
import { Avatar, Btn, Card, Empty, HeartScore, Meter, Pill, SectionTitle, Stat } from "../components/ui";
import { allNudges, averages, fallingBehind, healthOf, latestSnapshot, phaseMeta, sortedTasks, totalEarnings, upcomingEvents, weekTrend } from "../lib/domain";
import { relativeDate, shortDate, toman, usd } from "../lib/format";
import type { NudgeSeverity } from "../lib/domain";

/**
 * Insights — the "what do I do today" screen.
 *
 * The nudge engine watches every tutor for the things a mentor forgets: stuck in a
 * phase, no numbers logged, no trial booked, replies slow, cancellations, a score that
 * fell, a follow-up gone overdue. This screen sorts them by how much they matter, and
 * shows the two things that need a different kind of attention: tutors whose numbers
 * are sliding, and the calendar events that will empty their availability.
 */

const SEVERITY: Record<NudgeSeverity, { label: string; tone: string; icon: string }> = {
  urgent: { label: "Handle today", tone: "#EF4444", icon: "🚨" },
  warn: { label: "This week", tone: "#F59E0B", icon: "⚠️" },
  info: { label: "Worth doing", tone: "#3B82F6", icon: "💡" },
};

interface InsightsViewProps {
  tutors: Tutor[];
  /** The mentor's own tasks and reminders — they become alerts like everything else. */
  tasks: Task[];
  customPlatforms: Platform[];
  rialPerUsd: number;
  onOpenTutor: (id: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onPepTalk: () => void;
  onWeeklyUpdate: () => void;
}

const InsightsView: React.FC<InsightsViewProps> = ({
  tutors,
  tasks,
  customPlatforms,
  rialPerUsd,
  onOpenTutor,
  onToggleTask,
  onDeleteTask,
  onPepTalk,
  onWeeklyUpdate,
}) => {
  /*
   * One list, two sources: what the engine noticed about the roster, and what the mentor
   * wrote down themselves. They sort together by severity, so "call Sara on Thursday"
   * sits in Handle today exactly when it is late.
   */
  const nudges = useMemo(() => allNudges(tutors, tasks), [tutors, tasks]);
  const taskRows = useMemo(() => sortedTasks(tasks), [tasks]);
  const actionable = taskRows.filter((r) => !r.task.done && (r.overdue || r.inWindow));
  const scheduled = taskRows.filter((r) => !r.task.done && !r.overdue && !r.inWindow);
  const nextUp = scheduled[0];
  const sliding = useMemo(() => fallingBehind(tutors), [tutors]);
  const events = useMemo(() => upcomingEvents(), []);

  const grouped = (["urgent", "warn", "info"] as NudgeSeverity[]).map((severity) => ({
    severity,
    items: nudges.filter((n) => n.severity === severity),
  }));

  const rising = useMemo(
    () =>
      [...tutors]
        .map((t) => ({ t, trend: weekTrend(t) }))
        .filter((x) => x.trend.direction === "up")
        .sort((a, b) => b.trend.earningsPercent - a.trend.earningsPercent)
        .slice(0, 5),
    [tutors],
  );

  const healthBuckets = useMemo(() => {
    const buckets = { strong: 0, watch: 0, intervene: 0 };
    for (const t of tutors) {
      const score = healthOf(t).score;
      if (score >= 75) buckets.strong += 1;
      else if (score >= 50) buckets.watch += 1;
      else buckets.intervene += 1;
    }
    return buckets;
  }, [tutors]);

  return (
    <div className="space-y-5">
      <SectionTitle
        icon="🔔"
        title="Insights"
        sub={`${nudges.length} thing${nudges.length === 1 ? "" : "s"} the roster needs from you`}
        right={
          <div className="flex gap-2">
            <Btn variant="outline" onClick={onWeeklyUpdate}>
              📊 Weekly update
            </Btn>
            <Btn onClick={onPepTalk}>🤖 Daily pep talk</Btn>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Urgent" value={grouped[0].items.length} tone={grouped[0].items.length ? "#EF4444" : undefined} icon="🚨" />
        <Stat label="Falling behind" value={sliding.length} tone={sliding.length ? "#F59E0B" : undefined} icon="📉" />
        <Stat label="Health strong" value={healthBuckets.strong} sub={`${healthBuckets.watch} watch · ${healthBuckets.intervene} intervene`} icon="🫀" />
        <Stat label="Roster earned" value={usd(tutors.reduce((a, t) => a + totalEarnings(t), 0))} sub={toman(tutors.reduce((a, t) => a + totalEarnings(t), 0), rialPerUsd)} icon="💰" />
      </div>

      {nudges.length === 0 && tutors.length > 0 && (
        <Card>
          <p className="text-sm text-[#121118]/88">
            Nothing is flagged. That is the good state: everyone has current numbers, recent contact, and the phases match
            what is actually happening.
          </p>
        </Card>
      )}

      {grouped.map(({ severity, items }) =>
        items.length === 0 ? null : (
          <Card key={severity}>
            <SectionTitle icon={SEVERITY[severity].icon} title={SEVERITY[severity].label} sub={`${items.length} item${items.length === 1 ? "" : "s"}`} />
            <ul className="space-y-2">
              {items.map((n) => {
                const tutor = tutors.find((t) => t.id === n.tutorId);
                return (
                  <li key={n.id} className="flex items-start gap-3 rounded-2xl border border-black/12 p-3">
                    {tutor && <Avatar src={tutor.avatar} name={tutor.name} size={34} ring={`${platformOf(tutor.platformId, customPlatforms).color}44`} />}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{n.icon}</span>
                        {/* A task the mentor wrote for the whole roster has no tutor to
                            open, so its name is text rather than a link. */}
                        {tutor ? (
                          <button onClick={() => onOpenTutor(n.tutorId)} className="text-sm font-bold hover:text-[#FF79AC]">
                            {n.tutorName}
                          </button>
                        ) : (
                          <span className="text-sm font-bold">{n.tutorName}</span>
                        )}
                        <Pill tone={SEVERITY[severity].tone}>{n.title}</Pill>
                      </div>
                      <p className="mt-1 text-xs text-[#121118]/86">{n.detail}</p>
                      <p className="mt-0.5 text-xs font-semibold text-[#FF79AC]">→ {n.action}</p>
                    </div>
                    {tutor && (
                      <Btn size="sm" variant="ghost" onClick={() => onOpenTutor(n.tutorId)}>
                        Open
                      </Btn>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        ),
      )}

      {/*
       * The mentor's own list, sitting inside the screen they already open every morning.
       * Only what is inside its lead time is listed; the rest is one quiet line, because
       * a screen called "Handle today" must not be full of next month.
       */}
      <Card>
        <SectionTitle
          icon="📌"
          title="Your tasks & reminders"
          sub={
            actionable.length
              ? `${actionable.length} in the window now — written by you, on the board`
              : scheduled.length
                ? `${scheduled.length} scheduled, nothing due yet`
                : "Write them on the Tutor board and they appear here when their lead time opens"
          }
        />
        {actionable.length === 0 ? (
          <p className="text-sm text-[#121118]/86">
            {nextUp
              ? `Nothing needs you yet. The next one you wrote is “${nextUp.task.title}”, ${relativeDate(nextUp.task.dueAt)}.`
              : "No tasks written down. They are saved with the tutor they belong to, so a reminder carries the person with it."}
          </p>
        ) : (
          <ul className="space-y-2">
            {actionable.map(({ task, daysLeft, overdue }) => (
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
                    <Pill tone={overdue ? "#EF4444" : "#F59E0B"}>
                      {overdue
                        ? `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} late`
                        : daysLeft === 0
                          ? "today"
                          : `in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}{" "}
                      · {shortDate(task.dueAt)}
                    </Pill>
                    {task.tutorId && (
                      <button
                        onClick={() => onOpenTutor(task.tutorId)}
                        className="rounded-full bg-black/[0.06] px-2.5 py-1 text-[12px] font-semibold hover:text-[#FF79AC]"
                      >
                        {tutors.find((t) => t.id === task.tutorId)?.name ?? "tutor no longer on the roster"}
                      </button>
                    )}
                  </div>
                  {task.detail && <p className="mt-1 text-xs text-[#121118]/86">{task.detail}</p>}
                </div>
                <Btn size="sm" variant="ghost" onClick={() => onToggleTask(task.id)}>
                  Done
                </Btn>
                <Btn size="sm" variant="ghost" title="Delete this task" onClick={() => onDeleteTask(task.id)}>
                  🗑
                </Btn>
              </li>
            ))}
          </ul>
        )}
        {scheduled.length > 0 && actionable.length > 0 && nextUp && (
          <p className="mt-3 text-[12px] text-[#121118]/78">
            {scheduled.length} more scheduled later — the next is “{nextUp.task.title}” on {shortDate(nextUp.task.dueAt)}.
          </p>
        )}
      </Card>

      <Card>
        <SectionTitle
          icon="📉"
          title="Falling behind"
          sub="Two or more signals at once: earnings, lessons, rating, response time or health dropping together."
        />
        {sliding.length === 0 ? (
          <p className="text-sm text-[#121118]/86">Nobody is sliding. Numbers are steady or improving across the roster.</p>
        ) : (
          <ul className="space-y-2">
            {sliding.map(({ tutor, reasons }) => (
              <li key={tutor.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Avatar src={tutor.avatar} name={tutor.name} size={30} ring="#F59E0B55" />
                  <button onClick={() => onOpenTutor(tutor.id)} className="text-sm font-bold hover:text-[#FF79AC]">
                    {tutor.name}
                  </button>
                  <Pill tone={phaseMeta(tutor.phase).color}>{phaseMeta(tutor.phase).short}</Pill>
                  <HeartScore value={healthOf(tutor).score} size={34} />
                </div>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {reasons.map((r, i) => (
                    <li key={i} className="rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-amber-800">
                      {r}
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex gap-2">
                  <Btn size="sm" variant="outline" onClick={() => onOpenTutor(tutor.id)}>
                    Open and run SOS
                  </Btn>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle icon="🚀" title="Gaining ground" sub="Worth a message while it is working." />
          {rising.length === 0 ? (
            <p className="text-sm text-[#121118]/86">No week-over-week increases recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {rising.map(({ t, trend }) => (
                <li key={t.id} className="flex items-center gap-3 rounded-xl border border-black/12 p-2.5">
                  <Avatar src={t.avatar} name={t.name} size={30} />
                  <button onClick={() => onOpenTutor(t.id)} className="text-sm font-semibold hover:text-[#FF79AC]">
                    {t.name}
                  </button>
                  <span className="ml-auto text-sm font-bold text-emerald-600">▲ {trend.earningsPercent}%</span>
                  <span className="text-[12px] text-[#121118]/82">{latestSnapshot(t) ? usd(latestSnapshot(t)!.earningsUsd) : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionTitle icon="🫀" title="Roster health" sub="Completeness, students, freshness, contact and load — per tutor." />
          <div className="space-y-3">
            <Meter value={(healthBuckets.strong / Math.max(1, tutors.length)) * 100} color="#10B981" label="Strong (75+)" right={healthBuckets.strong} height={10} />
            <Meter value={(healthBuckets.watch / Math.max(1, tutors.length)) * 100} color="#F59E0B" label="Watch (50–74)" right={healthBuckets.watch} height={10} />
            <Meter value={(healthBuckets.intervene / Math.max(1, tutors.length)) * 100} color="#EF4444" label="Gentle intervention (<50)" right={healthBuckets.intervene} height={10} />
          </div>
          <p className="mt-3 text-[12px] text-[#121118]/82">
            A low score is not a verdict on the tutor — it is this app telling you where to spend an hour. The Intervention
            bucket is where burnout shows up before it costs someone their account.
          </p>
        </Card>
      </div>

      <Card>
        <SectionTitle icon="📅" title="Cultural calendar" sub="Iranian holidays move the week. Plan availability around them, before they arrive." />
        {events.length === 0 ? (
          <p className="text-sm text-[#121118]/86">No major events in the next 45 days.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={`${e.name}-${e.inDays}`} className="flex items-start gap-3 rounded-2xl border border-black/12 p-3">
                <span className="text-2xl">{e.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold">
                    {e.name} · {e.inDays === 0 ? "today" : `in ${e.inDays} days`}
                  </p>
                  <p className="text-xs text-[#121118]/86">{e.note}</p>
                </div>
                {e.inDays <= e.windowBeforeDays && <Pill tone="#F59E0B">plan now</Pill>}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[12px] text-[#121118]/78">
          Lunar dates (Eid, Muharram) shift every year — confirm the year's exact date before you plan a week around it.
        </p>
      </Card>

      {tutors.length === 0 && (
        <Empty icon="🔔" title="Nothing to watch yet" body="Add tutors to the roster and this screen starts telling you who needs you today." />
      )}

      <Card>
        <SectionTitle icon="🗓️" title="Every tutor, one line" sub="The roster at a glance, newest contact first." />
        <ul className="space-y-2">
          {[...tutors]
            .sort((a, b) => (a.name < b.name ? -1 : 1))
            .map((t) => {
              const avg = averages(t, 4);
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-black/12 p-2.5 text-xs">
                  <Avatar src={t.avatar} name={t.name} size={26} ring={`${platformOf(t.platformId, customPlatforms).color}44`} />
                  <button onClick={() => onOpenTutor(t.id)} className="font-semibold hover:text-[#FF79AC]">
                    {t.name}
                  </button>
                  <Pill tone={phaseMeta(t.phase).color}>{phaseMeta(t.phase).short}</Pill>
                  <span className="text-[#121118]/82">{avg.sampleSize ? `${usd(avg.earningsUsd)}/week avg` : "no numbers"}</span>
                  <span className="text-[#121118]/76">phase since {relativeDate(t.phaseSince)}</span>
                </li>
              );
            })}
        </ul>
      </Card>
    </div>
  );
};

export default InsightsView;
