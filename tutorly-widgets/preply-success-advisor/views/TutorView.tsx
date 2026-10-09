import React, { useMemo, useState } from "react";
import type { PhaseId, Platform, Tutor } from "../types";
import { allPlatforms, platformOf, tutorPlatforms } from "../lib/platforms";
import { Avatar, Btn, Card, Field, Gauge, HeartScore, Meter, Pill, PlatformMark, SectionTitle, Stat, Tabs, inputClass } from "../components/ui";
import { PHASES, accountCompleteness, averages, badgesFor, healthOf, latestSnapshot, nudgesFor, phaseMeta, superTutorMonitor, tierFor, totalEarnings, weekTrend } from "../lib/domain";
import { moneyPair, num, relativeDate, shortDate, toman, usd } from "../lib/format";
import type { Toast } from "../lib/useAppState";
import AccountTab from "./tutor/AccountTab";
import CommentsTab from "./tutor/CommentsTab";
import AuditTab from "./tutor/AuditTab";
import GoalsTab from "./tutor/GoalsTab";
import PerformanceTab from "./tutor/PerformanceTab";
import CommunicationTab from "./tutor/CommunicationTab";
import MessagesTab from "./tutor/MessagesTab";
import { joinList, splitList, type TutorTabProps } from "./tutor/common";

type TabId = "account" | "audit" | "status" | "goals" | "performance" | "communication" | "messages" | "comments";

interface TutorViewProps {
  tutor: Tutor;
  customPlatforms: Platform[];
  rialPerUsd: number;
  onBack: () => void;
  onDelete: (id: string) => void;
  update: (updater: (tutor: Tutor) => Tutor) => void;
  toast: (message: string, tone?: Toast["tone"]) => void;
  keepRawLogs: boolean;
}

/** Everything about how the tutor sits in the pipeline: phase, contact, rules, alerts. */
const StatusTab: React.FC<TutorTabProps> = ({ tutor, platform, customPlatforms, rialPerUsd, update, toast }) => {
  const health = healthOf(tutor);
  const completeness = accountCompleteness(tutor.account);
  const monitor = superTutorMonitor(tutor);
  const nudges = nudgesFor(tutor);
  const phase = phaseMeta(tutor.phase);
  const platforms = useMemo(() => allPlatforms(customPlatforms), [customPlatforms]);

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle icon="🚦" title="Working status" sub="Where this tutor stands, and how long they have been standing there." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PHASES.map((p) => {
            const on = tutor.phase === p.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  if (on) return;
                  update((t) => ({ ...t, phase: p.id, phaseSince: new Date().toISOString().slice(0, 10), updatedAt: new Date().toISOString() }));
                  toast(`${tutor.name} moved to ${p.label}.`, "info");
                }}
                className={`rounded-2xl border p-3 text-left transition-all ${
                  on ? "border-transparent shadow-sm" : "border-black/12 hover:border-black/28"
                }`}
                style={on ? { background: `${p.color}14`, borderColor: p.color } : undefined}
              >
                <p className="text-sm font-bold">
                  {p.emoji} {p.short}
                </p>
                <p className="mt-0.5 text-[12px] leading-snug text-[#121118]/85">{p.goal}</p>
                {on && <p className="mt-1 text-[12px] font-semibold" style={{ color: p.color }}>current phase</p>}
              </button>
            );
          })}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label="In this phase" value={`${daysSince(tutor.phaseSince)} days`} sub={`nudge after ${phase.nudgeAfterDays} days`} icon="⏳" />
          <Stat label="On the roster since" value={shortDate(tutor.startedAt)} sub={relativeDate(tutor.startedAt)} icon="📅" />
          <Stat label="Next follow-up" value={tutor.nextFollowUpAt ? relativeDate(tutor.nextFollowUpAt) : "not set"} sub={tutor.nextFollowUpAt ? shortDate(tutor.nextFollowUpAt) : "set a date to be reminded"} icon="🔔" />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle icon="🫀" title="Health score" sub="Completeness, students, freshness, contact and load in one number." />
          <div className="flex items-center gap-4">
            <HeartScore value={health.score} size={92} />
            <div className="flex-1 space-y-2">
              {health.parts.map((p) => (
                <Meter key={p.key} value={p.ratio * 100 * (p.weight / 0.25)} color={p.ratio > 0.6 ? "#10B981" : p.ratio > 0.35 ? "#F59E0B" : "#EF4444"} label={p.label} right={p.detail} height={6} />
              ))}
            </div>
          </div>
          {health.burnoutRisk &&
            (health.overloaded ? (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <b>Gentle intervention.</b> {tutor.name} is carrying load without the momentum to match it. Before asking
                for more hours, ask what a normal week looks like right now — the SOS prompt has a burnout-aware plan.
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-black/16 bg-black/[0.05] p-3 text-xs text-[#121118]/90">
                <b>Nothing here says burnout.</b> The score is low because information is missing — the profile pieces or the
                weekly numbers — not because {tutor.name} is overloaded. Run an audit and log the next conversation; the
                score moves as soon as the facts do.
              </div>
            ))}
        </Card>

        <Card>
          <SectionTitle icon="📇" title="Contact and identity" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <input className={inputClass} value={tutor.name} onChange={(e) => update((t) => ({ ...t, name: e.target.value }))} placeholder="علیرضا ابتهاج" />
            </Field>
            <Field label="Latin name" hint="For platform forms and English emails — the roster import fills it in">
              <input
                className={inputClass}
                value={tutor.latinName}
                onChange={(e) => update((t) => ({ ...t, latinName: e.target.value }))}
                placeholder="Alireza Ebtehaj"
              />
            </Field>
            <Field label="Phone / WhatsApp">
              <input className={inputClass} value={tutor.phone} onChange={(e) => update((t) => ({ ...t, phone: e.target.value }))} />
            </Field>
            <Field label="Email">
              <input className={inputClass} value={tutor.email} onChange={(e) => update((t) => ({ ...t, email: e.target.value }))} />
            </Field>
            <Field label="Country">
              <input className={inputClass} value={tutor.country} onChange={(e) => update((t) => ({ ...t, country: e.target.value }))} />
            </Field>
            <Field label="Platforms" hint="Tick every platform this person teaches on — the marked one is the primary" className="sm:col-span-2">
              <div className="flex flex-wrap gap-1.5">
                {platforms.map((p) => {
                  const on = tutorPlatforms(tutor, customPlatforms).some((x) => x.id === p.id);
                  const primary = tutor.platformId === p.id;
                  return (
                    <span key={p.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const ids = tutorPlatforms(tutor, customPlatforms).map((x) => x.id);
                          if (on) {
                            // Never leave them with no platform at all: unticking the last
                            // one is a no-op rather than a validated-empty state.
                            if (ids.length === 1) return;
                            const next = ids.filter((id) => id !== p.id);
                            update((t) => ({
                              ...t,
                              platformIds: next,
                              platformId: primary ? next[0] : t.platformId,
                            }));
                            return;
                          }
                          update((t) => ({ ...t, platformIds: [...ids, p.id] }));
                        }}
                        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition ${
                          on ? "border-transparent text-white" : "border-black/16 text-[#121118]/88 hover:border-black/34"
                        }`}
                        style={on ? { background: p.color } : undefined}
                        title={on ? `${p.name} — click to remove` : `Add ${p.name}`}
                      >
                        <PlatformMark platform={p} size={14} />
                        {p.name}
                      </button>
                      {on && (
                        <button
                          type="button"
                          onClick={() => update((t) => ({ ...t, platformId: p.id }))}
                          className={`rounded-full px-1.5 py-1 text-[11px] font-bold ${
                            primary ? "bg-[#121118] text-white" : "bg-black/12 text-[#121118]/86 hover:bg-black/16"
                          }`}
                          title={primary ? "Primary platform" : "Make this the primary platform"}
                        >
                          {primary ? "★ primary" : "☆"}
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            </Field>
            <Field label="On the roster since">
              <input type="date" className={inputClass} value={tutor.startedAt} onChange={(e) => update((t) => ({ ...t, startedAt: e.target.value }))} />
            </Field>
            <Field label="Tags" hint="Comma separated — used by search" className="sm:col-span-2">
              <input className={inputClass} value={joinList(tutor.tags)} onChange={(e) => update((t) => ({ ...t, tags: splitList(e.target.value) }))} placeholder="IELTS, evening only, needs a laptop" />
            </Field>
            <Field label="Next follow-up date" className="sm:col-span-2">
              <input
                type="date"
                className={inputClass}
                value={tutor.nextFollowUpAt?.slice(0, 10) ?? ""}
                onChange={(e) => update((t) => ({ ...t, nextFollowUpAt: e.target.value || undefined }))}
              />
            </Field>
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle icon="🏅" title="Keys to success" sub={`What ${platform.name} looks for, checked against this tutor's numbers.`} />
        <div className="grid gap-2 sm:grid-cols-2">
          {monitor.map((row) => (
            <div key={row.criterion} className="flex items-start gap-2 rounded-xl border border-black/12 p-2.5">
              <span className="mt-0.5 text-sm">{row.value === "no data" ? "•" : row.met ? "✅" : "❌"}</span>
              <div>
                <p className="text-xs font-semibold">{row.criterion}</p>
                <p className="text-[12px] text-[#121118]/82">
                  {row.value} · target {row.target}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-2xl bg-black/[0.05] p-3">
          <p className="text-[12px] font-bold uppercase tracking-wide text-[#121118]/78">{platform.name} rules that matter</p>
          <ul className="mt-1.5 space-y-1.5">
            {platform.rules.map((r) => (
              <li key={r.label} className="text-xs text-[#121118]/90">
                <b className="text-[#121118]/94">{r.label}:</b> {r.detail}
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <Card>
        <SectionTitle icon="🔔" title="Alerts for this tutor" sub="The same engine that fills the Insights screen." />
        {nudges.length === 0 ? (
          <p className="rounded-2xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
            Nothing needs attention. Profile completeness is {completeness.percent}%.
          </p>
        ) : (
          <ul className="space-y-2">
            {nudges.map((n) => (
              <li key={n.id} className="flex items-start gap-2 rounded-xl border border-black/12 p-2.5">
                <span className="text-base">{n.icon}</span>
                <div>
                  <p className="text-xs font-bold">{n.title}</p>
                  <p className="text-[12px] text-[#121118]/86">{n.detail}</p>
                  <p className="mt-0.5 text-[12px] font-semibold text-[#FF79AC]">→ {n.action}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <SectionTitle icon="📊" title="Current numbers" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Last week"
            value={latestSnapshot(tutor) ? usd(latestSnapshot(tutor)!.earningsUsd) : "—"}
            sub={latestSnapshot(tutor) ? toman(latestSnapshot(tutor)!.earningsUsd, rialPerUsd) : "no data"}
          />
          <Stat label="4-week average" value={averages(tutor, 4).sampleSize ? usd(averages(tutor, 4).earningsUsd) : "—"} />
          <Stat label="Total earned" value={usd(totalEarnings(tutor))} />
          <Stat label="Lessons a week" value={num(averages(tutor, 4).lessons, 1)} />
        </div>
      </Card>
    </div>
  );
};

function daysSince(iso: string): number {
  if (!iso) return 0;
  const then = new Date(`${iso.slice(0, 10)}T00:00:00`).getTime();
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

/**
 * Which tab leads, and which tab you land on.
 *
 * The work changes with the status, so the profile should too. While a tutor is still
 * **preparing**, the profile content *is* the job — headlines, description, video,
 * subjects, price — so Account leads and is what opens. Once they hold an account
 * (**waiting**, **active** or **passive**) that content is done: the daily job is the
 * status, the numbers and the conversations, so Status takes the first slot and Account
 * moves to the end, where it is still one click away whenever something needs editing.
 * Nothing is ever hidden — only the order changes.
 */
function orderedTabs(tutor: Tutor, alertCount: number): { id: TabId; label: string; icon?: string; badge?: number }[] {
  const account = { id: "account" as TabId, label: "Account", icon: "🧱" };
  /*
   * Comments sits last, after Account, wherever Account happens to be.
   *
   * It is the answer to a question asked about a tutor who has gone quiet, so it belongs at
   * the end of the row rather than in the middle of the working tabs — read when you have
   * decided the account and the numbers are not where the story is. A tutor who already has a
   * reason written carries a badge, so a profile never hides the fact that someone is on hold.
   */
  const comments = { id: "comments" as TabId, label: "Comments", icon: "🗒️", badge: tutor.holdNote ? 1 : undefined };
  const rest = [
    { id: "status" as TabId, label: "Status", icon: "🚦", badge: alertCount || undefined },
    { id: "audit" as TabId, label: "Audit & score", icon: "🧠" },
    { id: "goals" as TabId, label: "Goals & plan", icon: "🎯" },
    { id: "performance" as TabId, label: "Performance", icon: "📈", badge: tutor.snapshots.length || undefined },
    { id: "communication" as TabId, label: "Communication", icon: "💬", badge: tutor.logs.length || undefined },
    { id: "messages" as TabId, label: "Messages", icon: "✉️", badge: tutor.messages.length || undefined },
  ];
  return tutor.phase === "preparing" ? [account, ...rest, comments] : [...rest, account, comments];
}

/** Follows the same rule as the tab order, so the profile opens on the leading tab. */
function defaultTab(tutor: Tutor): TabId {
  return tutor.phase === "preparing" ? "account" : "status";
}

const TutorView: React.FC<TutorViewProps> = ({ tutor, customPlatforms, rialPerUsd, onBack, onDelete, update, toast, keepRawLogs }) => {
  const [tab, setTab] = useState<TabId>(() => defaultTab(tutor));
  /** A header shortcut's request for the tab below to open its prompt. */
  const [pending, setPending] = useState<"create" | null>(null);

  const platform = platformOf(tutor.platformId, customPlatforms);
  const score = tutor.audit?.powerScore ?? 0;
  const tier = tierFor(score);
  const health = healthOf(tutor);
  const trend = weekTrend(tutor);
  const avg = averages(tutor, 4);
  const nudges = nudgesFor(tutor);
  const tabProps: TutorTabProps = { tutor, platform, customPlatforms, rialPerUsd, update, toast, keepRawLogs };

  return (
    <div>
      <button onClick={onBack} className="mb-3 text-xs font-semibold text-[#121118]/85 hover:text-[#121118]">
        ← Back to the board
      </button>

      <Card className={`mb-5 ${tier.glow}`}>
        <div className="flex flex-wrap items-start gap-5">
          <Avatar src={tutor.avatar} name={tutor.name} size={84} glow={score >= 61 ? tier.glow : undefined} ring={`${platform.color}55`} />

          <div className="min-w-[220px] flex-1">
            <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{tutor.name}</h1>
              {tutor.latinName && tutor.latinName.toLowerCase() !== tutor.name.toLowerCase() && (
                <span className="text-sm font-semibold text-[#121118]/88">({tutor.latinName})</span>
              )}
              <Pill tone={phaseMeta(tutor.phase).color}>
                {phaseMeta(tutor.phase).emoji} {phaseMeta(tutor.phase).short}
              </Pill>
              <Pill tone={platform.color} title={platform.colorSource}>
                  <PlatformMark platform={platform} size={14} /> {platform.name}
              </Pill>
              {tutor.audit && (
                <Pill tone={tier.color}>
                  {tier.emoji} {tier.name}
                </Pill>
              )}
            </div>
            <p className="mt-1 text-sm text-[#121118]/85">
              {tutor.phone || "no phone"} · {tutor.country || "no country"} · on the roster {relativeDate(tutor.startedAt)}
            </p>
            {/* Every platform they work on, not just the primary chip above. */}
            {tutorPlatforms(tutor, customPlatforms).length > 1 && (
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[#121118]/88">
                Also on:
                {tutorPlatforms(tutor, customPlatforms)
                  .filter((p) => p.id !== tutor.platformId)
                  .map((p) => (
                    <span key={p.id} className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: `${p.color}22` }}>
                      <PlatformMark platform={p} size={13} />
                      {p.name}
                    </span>
                  ))}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <Btn size="sm" variant="outline" onClick={() => setTab("audit")}>
                🧠 {tutor.audit ? `Re-audit (score ${score})` : "Run the Master AI audit"}
              </Btn>
              <Btn
                size="sm"
                variant="outline"
                onClick={() => {
                  setTab("account");
                  setPending("create");
                }}
              >
                🤖 Create the account content
              </Btn>
              <Btn size="sm" variant="outline" onClick={() => setTab("communication")}>
                💬 Analyze a conversation
              </Btn>
              <Btn
                size="sm"
                variant="danger"
                onClick={() => {
                  if (window.confirm(`Delete ${tutor.name} and everything stored about them?`)) {
                    onDelete(tutor.id);
                    toast(`${tutor.name} deleted.`, "info");
                  }
                }}
              >
                Delete
              </Btn>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-center">
              <Gauge value={score} color={tier.color} size={92} label={tutor.audit ? String(score) : "—"} sublabel="power score" />
              <p className="text-[12px] text-[#121118]/82">{tutor.audit ? `${tutor.audit.successProbability}% success` : "not audited"}</p>
            </div>
            <div className="text-center">
              <HeartScore value={health.score} size={72} />
              <p className="mt-1 text-[12px] text-[#121118]/82">health</p>
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-[12px] font-bold uppercase tracking-wide text-[#121118]/78">Last week</p>
              <p className="text-lg font-bold tabular-nums">{latestSnapshot(tutor) ? usd(latestSnapshot(tutor)!.earningsUsd) : "—"}</p>
              {trend.direction !== "flat" && (
                <p className={`text-xs font-bold ${trend.direction === "up" ? "text-emerald-600" : "text-red-500"}`}>
                  {trend.direction === "up" ? "▲" : "▼"} {Math.abs(trend.earningsPercent)}%
                </p>
              )}
              {avg.sampleSize > 0 && <p className="text-[12px] text-[#121118]/78">{num(avg.lessons, 1)} lessons/week</p>}
            </div>
          </div>
        </div>

        {nudges.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-black/12 pt-3">
            {nudges.slice(0, 4).map((n) => (
              <Pill key={n.id} tone={n.severity === "urgent" ? "#EF4444" : n.severity === "warn" ? "#F59E0B" : "#3B82F6"} title={n.detail}>
                {n.icon} {n.title}
              </Pill>
            ))}
            {nudges.length > 4 && <Pill tone="#121118">+{nudges.length - 4} more</Pill>}
          </div>
        )}

        {badgesFor(tutor, totalEarnings(tutor), rialPerUsd).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {badgesFor(tutor, totalEarnings(tutor), rialPerUsd).map((b) => (
              <Pill key={b.id} tone="#F59E0B" title={b.detail}>
                {b.emoji} {b.label}
              </Pill>
            ))}
          </div>
        )}
      </Card>

      <Tabs<TabId>
        tabs={orderedTabs(tutor, nudges.length)}
        active={tab}
        onChange={setTab}
      />

      {tab === "account" && <AccountTab {...tabProps} autoCreate={pending === "create"} onAutoCreateHandled={() => setPending(null)} />}
      {tab === "audit" && <AuditTab {...tabProps} />}
      {tab === "status" && <StatusTab {...tabProps} />}
      {tab === "goals" && <GoalsTab {...tabProps} />}
      {tab === "performance" && <PerformanceTab {...tabProps} />}
      {tab === "communication" && <CommunicationTab {...tabProps} />}
      {tab === "messages" && <MessagesTab {...tabProps} />}
      {tab === "comments" && <CommentsTab {...tabProps} />}

      <p className="mt-6 text-center text-[12px] text-[#121118]/76">
        Price on record: {tutor.account.priceUsd ? moneyPair(tutor.account.priceUsd, rialPerUsd) : "not set"} · platform cut{" "}
        {Math.round((platform.commission || 0) * 100)}%
      </p>
    </div>
  );
};

export default TutorView;
