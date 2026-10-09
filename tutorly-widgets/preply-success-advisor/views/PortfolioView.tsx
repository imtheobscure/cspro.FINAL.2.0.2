import React, { useMemo, useState } from "react";
import type { PhaseId, PhaseMeta, Platform, Snapshot, Tutor } from "../types";
import { allPlatforms, platformOf, tutorPlatforms } from "../lib/platforms";
import { Avatar, Btn, Card, Empty, HeartScore, Pill, PlatformMark, SectionTitle, Stat } from "../components/ui";
import {
  PHASES,
  accountCompleteness,
  averages,
  healthOf,
  latestSnapshot,
  nudgesFor,
  phaseMeta,
  projectedMonthly,
  scoresOf,
  sortedSnapshots,
  tierFor,
  totalEarnings,
  weekTrend,
  type Nudge,
  type Tier,
  type Trend,
} from "../lib/domain";
import { daysBetween, num, relativeDate, shortDate, tinyDate, usd } from "../lib/format";
import type { Toast } from "../lib/useAppState";

/**
 * The portfolio.
 *
 * The board answers "who needs me today" one column at a time, and the leaderboard
 * answers "who is winning". Neither answers the question a mentor asks when they sit
 * down on a Monday: *what does the whole book of business look like, and where is it
 * leaking?* That is this screen — every tutor of every status in one place, with the
 * roster's numbers rolled up and drawn, so the shape of the work is visible before a
 * single name is read.
 *
 * Three deliberate choices:
 *
 *  1. **Cards are the default.** A list of numbers tells you a tutor exists; a card tells
 *     you they have not been talked to in three weeks. The same card language as the
 *     board is reused, so nothing has to be relearned.
 *  2. **The table is one click away.** Past a few dozen tutors a card wall stops being
 *     scannable, and a mentor who wants to sort the whole roster needs rows, not tiles.
 *  3. **The charts are hand-drawn SVG, not a charting library.** The app ships as a
 *     single offline HTML file; a chart library would be more bytes than the whole rest
 *     of the app, for four diagrams.
 *
 * Every number here comes from the same selectors the rest of the app uses, so this
 * screen can never disagree with a tutor's own profile about their health or earnings.
 */

interface PortfolioViewProps {
  tutors: Tutor[];
  customPlatforms: Platform[];
  rialPerUsd: number;
  onOpenTutor: (id: string) => void;
  onSetPhase: (id: string, phase: PhaseId) => void;
  toast: (message: string, tone?: Toast["tone"]) => void;
}

/** Everything the screen needs about one tutor, computed once instead of per section. */
interface PortfolioRow {
  tutor: Tutor;
  phase: PhaseMeta;
  platform: Platform;
  extraPlatforms: Platform[];
  health: number;
  /** 0–100, and 0 means "never audited" rather than "a bad profile" — see `audited`. */
  score: number;
  audited: boolean;
  tier: Tier;
  last?: Snapshot;
  avg: Snapshot & { sampleSize: number };
  trend: Trend;
  lifetime: number;
  alerts: Nudge[];
  completeness: number;
  stuckFor: number;
  projected: number;
  weeks: number;
}

/** How many cards a status section shows before it offers the rest. */
const CARDS_PER_STATUS = 24;

/* ------------------------------------------------------------------ charts -- */

/**
 * A donut of shares.
 *
 * Drawn with one stroked circle per slice: `stroke-dasharray` cuts each arc out of the
 * full circumference and the offset walks it around, which needs no path maths and no
 * library.
 */
const Donut: React.FC<{
  slices: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerTop?: React.ReactNode;
  centerBottom?: React.ReactNode;
}> = ({ slices, size = 168, thickness = 18, centerTop, centerBottom }) => {
  const total = slices.reduce((a, s) => a + s.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let walked = 0;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={slices.map((s) => `${s.label} ${s.value}`).join(", ")}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#12111814" strokeWidth={thickness} />
        {total > 0 &&
          slices.map((slice) => {
            const share = slice.value / total;
            const dash = share * circumference;
            const el = (
              <circle
                key={slice.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={thickness}
                strokeLinecap="butt"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-walked}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
            walked += dash;
            return el;
          })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums leading-none">{centerTop}</span>
        {centerBottom && <span className="mt-1 text-[11px] font-bold uppercase tracking-wide text-[#121118]/82">{centerBottom}</span>}
      </div>
    </div>
  );
};

/** One labelled bar. The width is the value against the largest value in its group. */
const HBar: React.FC<{
  label: React.ReactNode;
  value: number;
  max: number;
  color: string;
  right: React.ReactNode;
  sub?: React.ReactNode;
}> = ({ label, value, max, color, right, sub }) => (
  <div>
    <div className="mb-1 flex items-baseline justify-between gap-2 text-[12px] font-semibold">
      <span className="flex min-w-0 items-center gap-1.5 truncate text-[#121118]/91">{label}</span>
      <span className="shrink-0 tabular-nums text-[#121118]">{right}</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-black/12">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${max > 0 ? Math.max(1.5, (value / max) * 100) : 0}%`, background: `linear-gradient(90deg, ${color}bb, ${color})` }}
      />
    </div>
    {sub && <p className="mt-0.5 text-[11px] text-[#121118]/78">{sub}</p>}
  </div>
);

/** A vertical histogram — the shape of a distribution, which bars of text cannot show. */
const Histogram: React.FC<{ buckets: { label: string; count: number; color: string }[]; height?: number }> = ({
  buckets,
  height = 118,
}) => {
  const max = Math.max(...buckets.map((b) => b.count), 1);
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {buckets.map((b) => (
        <div key={b.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[11px] font-bold tabular-nums text-[#121118]/91">{b.count}</span>
          <div
            className="w-full rounded-t-lg transition-all duration-700 ease-out"
            style={{ height: `${Math.max(3, (b.count / max) * 100)}%`, background: `linear-gradient(180deg, ${b.color}, ${b.color}99)` }}
            title={`${b.count} tutor${b.count === 1 ? "" : "s"} · ${b.label}`}
          />
          <span className="whitespace-nowrap text-[10px] font-semibold text-[#121118]/82">{b.label}</span>
        </div>
      ))}
    </div>
  );
};

/** Roster earnings week by week — the trend of the whole book, not of one tutor. */
const WeekBars: React.FC<{ weeks: { weekOf: string; total: number }[]; color: string }> = ({ weeks, color }) => {
  const max = Math.max(...weeks.map((w) => w.total), 1);
  return (
    <div className="flex h-28 items-end gap-1">
      {weeks.map((w) => (
        <div key={w.weekOf} className="group flex h-full flex-1 flex-col items-center justify-end">
          <div
            className="w-full rounded-t transition-all duration-700 ease-out"
            style={{ height: `${Math.max(2, (w.total / max) * 100)}%`, background: `linear-gradient(180deg, ${color}, ${color}88)` }}
            title={`Week of ${shortDate(w.weekOf)} — ${usd(w.total)} across the roster`}
          />
          <span className="mt-1 whitespace-nowrap text-[9px] font-semibold text-[#121118]/76">{tinyDate(w.weekOf)}</span>
        </div>
      ))}
    </div>
  );
};

/* --------------------------------------------------------------- the card --- */

const PortfolioCard: React.FC<{
  row: PortfolioRow;
  onOpen: () => void;
}> = ({ row, onOpen }) => {
  const { tutor, platform, phase, tier, last, trend, alerts, stuckFor } = row;
  const overdue = stuckFor >= phase.nudgeAfterDays;
  const urgent = alerts.some((a) => a.severity === "urgent");

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-black/12 bg-white p-3 transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-20px_rgba(18,17,24,0.35)] ${tier.glow}`}
    >
      {/* A colour bar down the edge, so a wall of cards still reads by status at a glance. */}
      <span className="absolute left-0 top-0 h-full w-1" style={{ background: phase.color }} />

      <div className="flex items-start gap-2.5 pl-1.5">
        <Avatar src={tutor.avatar} name={tutor.name} size={40} glow={row.score >= 61 ? tier.glow : undefined} ring={`${platform.color}44`} />
        <div className="min-w-0 flex-1">
          <button onClick={onOpen} className="block max-w-full truncate text-left text-sm font-bold hover:text-[#FF79AC]">
            {tutor.name}
          </button>
          {tutor.latinName && tutor.latinName.toLowerCase() !== tutor.name.toLowerCase() && (
            <p className="truncate text-[12px] font-semibold text-[#121118]/88">{tutor.latinName}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <Pill tone={platform.color} title={platform.colorSource}>
              <PlatformMark platform={platform} size={13} /> {platform.name}
            </Pill>
            {row.extraPlatforms.map((p) => (
              <Pill key={p.id} tone={p.color} title={`Also on ${p.name}`} className="!px-2 !py-0.5">
                <PlatformMark platform={p} size={12} />
              </Pill>
            ))}
            {row.audited ? (
              <Pill tone={tier.color} title="Profile Power Score">
                {tier.emoji} {row.score}
              </Pill>
            ) : (
              <Pill tone="#64748B" title="No audit has been run on this profile yet">
                not audited
              </Pill>
            )}
            {overdue && (
              <Pill tone="#EF4444" title={`${stuckFor} days in this status`}>
                ⏰ {stuckFor}d
              </Pill>
            )}
            {alerts.length > 0 && (
              <Pill tone={urgent ? "#EF4444" : "#F59E0B"} title={alerts.map((a) => a.title).join(" · ")}>
                {alerts.length} alert{alerts.length > 1 ? "s" : ""}
              </Pill>
            )}
          </div>
        </div>
        <div className="shrink-0 text-center">
          <HeartScore value={row.health} size={36} />
        </div>
      </div>

      {/* The four numbers that decide whether this person is a problem or a win. */}
      <div className="mt-2.5 grid grid-cols-3 gap-1.5 pl-1.5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#121118]/76">Last week</p>
          <p className="text-[13px] font-bold tabular-nums">{last ? usd(last.earningsUsd) : "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#121118]/76">Avg 4w</p>
          <p className="text-[13px] font-bold tabular-nums">{row.avg.sampleSize ? usd(row.avg.earningsUsd) : "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#121118]/76">Lifetime</p>
          <p className="text-[13px] font-bold tabular-nums">{row.lifetime ? usd(row.lifetime) : "—"}</p>
        </div>
      </div>

      {/* The reason they are not being worked on, where you already are when you decide who
          to chase. Written on the tutor's Comments tab; the same sentence goes to the
          Not-active sheet of the spreadsheet. */}
      {tutor.holdNote ? (
        <p className="mt-2 rounded-lg bg-black/[0.05] px-2 py-1.5 text-[11px] leading-relaxed text-[#121118]/88">
          <b className="text-[#121118]">Why not continuing:</b> {tutor.holdNote}
        </p>
      ) : null}

      <div className="mt-2 flex items-center justify-between gap-2 pl-1.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] text-[#121118]/78">
            {trend.direction !== "flat" && last ? (
              <span className={trend.direction === "up" ? "font-bold text-emerald-600" : "font-bold text-red-500"}>
                {trend.direction === "up" ? "▲" : "▼"} {Math.abs(trend.earningsPercent)}% week over week
              </span>
            ) : (
              <>in {phase.short} {relativeDate(tutor.phaseSince || tutor.createdAt)}</>
            )}
          </p>
        </div>
        <Btn size="sm" variant="ghost" onClick={onOpen}>
          Open →
        </Btn>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ screen -- */

const PortfolioView: React.FC<PortfolioViewProps> = ({ tutors, customPlatforms, rialPerUsd, onOpenTutor, onSetPhase, toast }) => {
  /** Cards first: the shape of a roster is easier to see than its columns. */
  const [layout, setLayout] = useState<"cards" | "table">("cards");
  const [phase, setPhase] = useState<PhaseId | "all">("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const platforms = useMemo(() => allPlatforms(customPlatforms), [customPlatforms]);

  /**
   * One pass over the roster.
   *
   * The reminder engine is the expensive part, so it runs once per tutor here instead of
   * once per section — with a few hundred tutors the difference between one pass and
   * five is the difference between a snappy screen and a visible pause.
   */
  const rows = useMemo<PortfolioRow[]>(
    () =>
      tutors.map((tutor) => {
        const platform = platformOf(tutor.platformId, customPlatforms);
        const scores = scoresOf(tutor);
        return {
          tutor,
          phase: phaseMeta(tutor.phase),
          platform,
          extraPlatforms: tutorPlatforms(tutor, customPlatforms).filter((p) => p.id !== platform.id),
          health: healthOf(tutor).score,
          score: scores.power,
          audited: !!scores.hasAudit,
          tier: tierFor(scores.hasAudit ? scores.power : 0),
          last: latestSnapshot(tutor),
          avg: averages(tutor, 4),
          trend: weekTrend(tutor),
          lifetime: totalEarnings(tutor),
          alerts: nudgesFor(tutor),
          completeness: accountCompleteness(tutor.account).percent,
          stuckFor: daysBetween(tutor.phaseSince || tutor.createdAt),
          projected: projectedMonthly(tutor, tutor.account.priceUsd || 0, platform.commission || 0),
          weeks: tutor.snapshots.length,
        };
      }),
    [tutors, customPlatforms],
  );

  const totals = useMemo(() => {
    const sum = (fn: (r: PortfolioRow) => number) => rows.reduce((a, r) => a + (fn(r) || 0), 0);
    const graded = rows.filter((r) => r.audited);
    const rated = rows.filter((r) => r.avg.rating > 0);
    const replied = rows.filter((r) => r.avg.responseHours > 0);
    const allAlerts = rows.flatMap((r) => r.alerts);

    /* Earnings per calendar week across everyone, so the roster's own trend is visible.
       Only the last 12 weeks — older ones are history, not a decision. */
    const byWeek = new Map<string, number>();
    for (const r of rows) {
      for (const snap of sortedSnapshots(r.tutor)) {
        if (!snap.weekOf) continue;
        byWeek.set(snap.weekOf, (byWeek.get(snap.weekOf) ?? 0) + snap.earningsUsd);
      }
    }
    const weeks = [...byWeek.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-12).map(([weekOf, total]) => ({ weekOf, total }));

    const byPhase = PHASES.map((p) => {
      const group = rows.filter((r) => r.tutor.phase === p.id);
      return {
        phase: p,
        count: group.length,
        share: rows.length ? Math.round((group.length / rows.length) * 100) : 0,
        earnings: group.reduce((a, r) => a + (r.last?.earningsUsd ?? 0), 0),
        lifetime: group.reduce((a, r) => a + r.lifetime, 0),
        avgHealth: group.length ? Math.round(group.reduce((a, r) => a + r.health, 0) / group.length) : 0,
        stuck: group.filter((r) => r.stuckFor >= p.nudgeAfterDays).length,
        students: group.reduce((a, r) => a + (r.last?.activeStudents ?? 0), 0),
      };
    });

    const platformMap = new Map<string, { platform: Platform; count: number; earnings: number }>();
    for (const r of rows) {
      for (const p of [r.platform, ...r.extraPlatforms]) {
        const entry = platformMap.get(p.id) ?? { platform: p, count: 0, earnings: 0 };
        entry.count += 1;
        entry.earnings += r.lifetime;
        platformMap.set(p.id, entry);
      }
    }

    const healthBuckets = [
      { label: "0–39", count: rows.filter((r) => r.health < 40).length, color: "#EF4444" },
      { label: "40–54", count: rows.filter((r) => r.health >= 40 && r.health < 55).length, color: "#F59E0B" },
      { label: "55–69", count: rows.filter((r) => r.health >= 55 && r.health < 70).length, color: "#3B82F6" },
      { label: "70–84", count: rows.filter((r) => r.health >= 70 && r.health < 85).length, color: "#10B981" },
      { label: "85–100", count: rows.filter((r) => r.health >= 85).length, color: "#8B5CF6" },
    ];

    return {
      onRoster: rows.length,
      lastWeek: sum((r) => r.last?.earningsUsd ?? 0),
      avgWeek: sum((r) => (r.avg.sampleSize ? r.avg.earningsUsd : 0)),
      lifetime: sum((r) => r.lifetime),
      projectedMonth: sum((r) => r.projected),
      avgHealth: rows.length ? Math.round(sum((r) => r.health) / rows.length) : 0,
      avgScore: graded.length ? Math.round(graded.reduce((a, r) => a + r.score, 0) / graded.length) : 0,
      gradedCount: graded.length,
      avgCompleteness: rows.length ? Math.round(sum((r) => r.completeness) / rows.length) : 0,
      lessonsLastWeek: sum((r) => r.last?.lessons ?? 0),
      activeStudents: sum((r) => r.last?.activeStudents ?? 0),
      avgRating: rated.length ? Number((rated.reduce((a, r) => a + r.avg.rating, 0) / rated.length).toFixed(2)) : 0,
      ratedCount: rated.length,
      avgResponse: replied.length ? Math.round((replied.reduce((a, r) => a + r.avg.responseHours, 0) / replied.length) * 10) / 10 : 0,
      urgent: allAlerts.filter((a) => a.severity === "urgent").length,
      warnings: allAlerts.filter((a) => a.severity === "warn").length,
      alerts: allAlerts.length,
      followUps: rows.reduce((a, r) => a + r.tutor.logs.flatMap((l) => l.followUps ?? []).filter((f) => !f.done).length, 0),
      withNumbers: rows.filter((r) => r.last).length,
      weeks,
      byPhase,
      platforms: [...platformMap.values()].sort((a, b) => b.count - a.count || b.earnings - a.earnings),
      healthBuckets,
      /* The tiers are counted over AUDITED tutors only, so the pills plus the
         "not audited" pill always add up to the roster and never double-count the
         same person as both unaudited and Common. */
      tiers: ["legendary", "epic", "rare", "common"].map((id) => {
        const min = id === "legendary" ? 81 : id === "epic" ? 61 : id === "rare" ? 41 : 0;
        const upper = id === "legendary" ? 101 : id === "epic" ? 81 : id === "rare" ? 61 : 41;
        const t = tierFor(min);
        const count = rows.filter((r) => r.audited && r.score >= min && r.score < upper).length;
        return { id, name: t.name, emoji: t.emoji, color: t.color, count };
      }),
    };
  }, [rows]);

  const visible = phase === "all" ? rows : rows.filter((r) => r.tutor.phase === phase);

  /** Most in need of attention first: urgent alerts, then how long they have been stuck. */
  const byAttention = useMemo(
    () =>
      [...visible].sort((a, b) => {
        const severity = (r: PortfolioRow) => (r.alerts.some((x) => x.severity === "urgent") ? 0 : r.alerts.some((x) => x.severity === "warn") ? 1 : 2);
        return severity(a) - severity(b) || b.stuckFor - a.stuckFor || a.tutor.name.localeCompare(b.tutor.name);
      }),
    [visible],
  );

  if (!tutors.length) {
    return (
      <div>
        <SectionTitle icon="📚" title="Portfolio" sub="Every status, every tutor, and the numbers for the whole book of business." />
        <Empty
          icon="📚"
          title="Nothing to summarise yet"
          body="Once tutors are on the roster this screen rolls them all up: how many sit in each status, what the roster earns, and where the risk is. Add your first tutor from the board."
        />
      </div>
    );
  }

  const maxPhaseEarnings = Math.max(...totals.byPhase.map((p) => p.earnings), 1);
  const maxLifetime = Math.max(...totals.byPhase.map((p) => p.lifetime), 1);
  const maxPlatformCount = Math.max(...totals.platforms.map((p) => p.count), 1);

  return (
    <div>
      <SectionTitle
        icon="📚"
        title="Portfolio"
        sub={`${num(totals.onRoster)} tutor${totals.onRoster === 1 ? "" : "s"} across all four statuses · the whole book of business in one view`}
        right={
          <div className="flex gap-1 rounded-2xl border border-black/12 bg-white p-1">
            {(
              [
                { id: "cards" as const, label: "Cards", icon: "🃏" },
                { id: "table" as const, label: "Table", icon: "📋" },
              ]
            ).map((mode) => (
              <button
                key={mode.id}
                onClick={() => setLayout(mode.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  layout === mode.id ? "bg-[#121118] text-white" : "text-[#121118]/86 hover:bg-black/12"
                }`}
              >
                {mode.icon} {mode.label}
              </button>
            ))}
          </div>
        }
      />

      {/* ------------------------------------------------------- the headline -- */}
      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="On the roster"
          value={num(totals.onRoster)}
          icon="👥"
          sub={`${totals.withNumbers} with numbers recorded`}
        />
        <Stat
          label="Earned last week"
          value={usd(totals.lastWeek)}
          icon="💵"
          tone={totals.lastWeek > 0 ? "#10B981" : undefined}
          sub={`${num(totals.lessonsLastWeek)} lessons · ${num(totals.activeStudents)} active students`}
        />
        <Stat
          label="Lifetime earnings"
          value={usd(totals.lifetime)}
          icon="🏦"
          sub={`${num(Math.round((totals.lifetime / Math.max(totals.onRoster, 1)) * 1))} average per tutor`}
        />
        <Stat
          label="Needs you today"
          value={num(totals.urgent)}
          icon="🚨"
          tone={totals.urgent ? "#EF4444" : undefined}
          sub={`${num(totals.alerts)} reminders in total`}
        />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Average health" value={`${totals.avgHealth}%`} icon="💗" sub={`${num(totals.urgent)} urgent · ${num(totals.warnings)} warnings`} />
        <Stat
          label="Average power score"
          value={totals.gradedCount ? totals.avgScore : "—"}
          icon="⭐"
          sub={totals.gradedCount ? `${totals.gradedCount} of ${totals.onRoster} audited` : "no profile audited yet"}
        />
        <Stat
          label="Projected month"
          value={totals.projectedMonth ? usd(totals.projectedMonth) : "—"}
          icon="🔮"
          sub="on current pace, after the platform's cut"
        />
        <Stat
          label="Open follow-ups"
          value={num(totals.followUps)}
          icon="📌"
          tone={totals.followUps ? "#F59E0B" : undefined}
          sub={`profile ${totals.avgCompleteness}% complete on average`}
        />
      </div>

      {/* ------------------------------------------------------------ charts -- */}
      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Card>
          <SectionTitle icon="🥧" title="Who is where" sub="Every status, side by side, however many tutors are in each." />
          <div className="flex flex-wrap items-center gap-5">
            <Donut
              slices={totals.byPhase.map((p) => ({ label: p.phase.short, value: p.count, color: p.phase.color }))}
              centerTop={num(totals.onRoster)}
              centerBottom="tutors"
            />
            <div className="min-w-[180px] flex-1 space-y-2.5">
              {totals.byPhase.map((p) => (
                <div key={p.phase.id}>
                  <div className="flex items-center justify-between gap-2 text-[12px] font-semibold">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.phase.color }} />
                      <span className="text-[#121118]">{p.phase.emoji} {p.phase.label}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-[#121118]">{p.count} · {p.share}%</span>
                  </div>
                  <p className="mt-0.5 pl-4 text-[11px] text-[#121118]/78">
                    {p.stuck ? `${p.stuck} stuck past ${p.phase.nudgeAfterDays} days · ` : ""}
                    health {p.count ? `${p.avgHealth}%` : "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle icon="📊" title="Where the money sits" sub="Earnings recorded last week, by status." />
          <div className="space-y-3.5">
            {totals.byPhase.map((p) => (
              <HBar
                key={p.phase.id}
                label={<>{p.phase.emoji} {p.phase.short}</>}
                value={p.earnings}
                max={maxPhaseEarnings}
                color={p.phase.color}
                right={usd(p.earnings)}
                sub={`${usd(p.lifetime)} earned by these ${p.count} tutor${p.count === 1 ? "" : "s"} in total`}
              />
            ))}
          </div>
          <div className="mt-4 border-t border-black/12 pt-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#121118]/78">Roster earnings, last 12 recorded weeks</p>
            <WeekBars weeks={totals.weeks} color="#FF79AC" />
            {totals.weeks.length < 2 && <p className="mt-1 text-[12px] text-[#121118]/78">Two recorded weeks are needed to show a trend.</p>}
          </div>
        </Card>

        <Card>
          <SectionTitle icon="💗" title="How healthy the book is" sub="Tutor health across the whole roster." />
          <Histogram buckets={totals.healthBuckets} />
          <div className="mt-4 space-y-2 border-t border-black/12 pt-3 text-[12px]">
            <div className="flex items-center justify-between">
              <span className="text-[#121118]/86">Average rating</span>
              <span className="font-bold tabular-nums">{totals.avgRating || "—"}{totals.ratedCount ? ` · ${totals.ratedCount} rated` : ""}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#121118]/86">Average reply time</span>
              <span className="font-bold tabular-nums">{totals.avgResponse ? `${totals.avgResponse}h` : "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#121118]/86">At risk (health under 55)</span>
              <span className={`font-bold tabular-nums ${totals.healthBuckets[0].count + totals.healthBuckets[1].count ? "text-red-600" : ""}`}>
                {num(totals.healthBuckets[0].count + totals.healthBuckets[1].count)}
              </span>
            </div>
          </div>
          <div className="mt-4 border-t border-black/12 pt-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#121118]/78">Profile tiers</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {totals.tiers.map((t) => (
                <Pill key={t.id} tone={t.color} title={`${t.name}: ${t.count}`}>
                  {t.emoji} {t.name} {t.count}
                </Pill>
              ))}
              <Pill tone="#64748B" title="These tutors have no audit yet, so no tier can be claimed">
                ❔ not audited {totals.onRoster - totals.gradedCount}
              </Pill>
            </div>
          </div>
        </Card>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle icon="🏢" title="Platforms" sub="A tutor counts once per platform they actually teach on." />
          <div className="space-y-3">
            {totals.platforms.map((p) => (
              <HBar
                key={p.platform.id}
                label={
                  <>
                    <PlatformMark platform={p.platform} size={14} /> {p.platform.name}
                  </>
                }
                value={p.count}
                max={maxPlatformCount}
                color={p.platform.color}
                right={`${p.count} tutor${p.count === 1 ? "" : "s"}`}
                sub={`${usd(p.earnings)} earned by them in total · the platform keeps ${Math.round((p.platform.commission || 0) * 100)}%`}
              />
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle icon="🧭" title="What each status is costing" sub="The size of each group against the work it needs." />
          <div className="space-y-3">
            {totals.byPhase.map((p) => (
              <div key={p.phase.id} className="rounded-2xl border border-black/12 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold">
                    {p.phase.emoji} {p.phase.label}
                  </p>
                  <span className="text-[12px] font-bold tabular-nums" style={{ color: p.phase.color }}>
                    {p.count} tutor{p.count === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] leading-snug text-[#121118]/82">{p.phase.goal}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#121118]/86">
                  <span>
                    <b>{p.stuck}</b> past the {p.phase.nudgeAfterDays}-day nudge
                  </span>
                  <span>
                    <b>{lastWeekLabel(p.earnings)}</b> last week
                  </span>
                  <span>
                    <b>{num(p.students)}</b> students between them
                  </span>
                  <span>
                    health <b>{p.count ? `${p.avgHealth}%` : "—"}</b>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ------------------------------------------------------- every tutor -- */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-bold uppercase tracking-wide text-[#121118]/82">Show</span>
          {(
            [
              { id: "all" as const, label: "All statuses", emoji: "📚", count: totals.onRoster },
              ...PHASES.map((p) => ({ id: p.id as PhaseId | "all", label: p.label, emoji: p.emoji, count: totals.byPhase.find((x) => x.phase.id === p.id)?.count ?? 0 })),
            ] as { id: PhaseId | "all"; label: string; emoji: string; count: number }[]
          ).map((chip) => {
            const on = phase === chip.id;
            const color = chip.id === "all" ? "#121118" : phaseMeta(chip.id).color;
            return (
              <button
                key={chip.id}
                onClick={() => setPhase(chip.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                  on ? "border-transparent text-white" : "border-black/16 text-[#121118]/86 hover:border-black/34"
                }`}
                style={on ? { background: color } : undefined}
              >
                {chip.emoji} {chip.label}
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${on ? "bg-white/20" : "bg-black/12"}`}>{chip.count}</span>
              </button>
            );
          })}
          <span className="ml-auto text-[12px] text-[#121118]/82">
            showing {visible.length} of {totals.onRoster}
          </span>
        </div>
      </Card>

      {layout === "cards" ? (
        <div className="space-y-5">
          {PHASES.filter((p) => phase === "all" || p.id === phase).map((p) => {
            const group = byAttention.filter((r) => r.tutor.phase === p.id);
            const shown = expanded[p.id] ? group : group.slice(0, CARDS_PER_STATUS);
            return (
              <section key={p.id}>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h3 className="flex items-center gap-2 text-base font-bold">
                    {p.emoji} {p.label}
                    <span className="rounded-full bg-black/12 px-2 py-0.5 text-[11px] font-bold text-[#121118]/85">{group.length}</span>
                  </h3>
                  <p className="text-[12px] text-[#121118]/82">{p.goal}</p>
                </div>
                {group.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-black/16 p-5 text-center text-[12px] text-[#121118]/76">
                    nobody in this status
                  </p>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                      {shown.map((row) => (
                        <PortfolioCard
                          key={row.tutor.id}
                          row={row}
                          onOpen={() => onOpenTutor(row.tutor.id)}
                        />
                      ))}
                    </div>
                    {group.length > CARDS_PER_STATUS && !expanded[p.id] && (
                      <div className="mt-3 text-center">
                        <Btn variant="outline" size="sm" onClick={() => setExpanded((e) => ({ ...e, [p.id]: true }))}>
                          Show all {group.length} in {p.short}
                        </Btn>
                      </div>
                    )}
                  </>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-x-auto">
          <SectionTitle
            icon="📋"
            title="Every tutor, one line each"
            sub="Sorted by who needs you first — urgent reminders, then the longest wait in a status."
          />
          <table className="w-full min-w-[1020px] text-sm">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-wide text-[#121118]/78">
                <th className="pb-2">Tutor</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">In status</th>
                <th className="pb-2">Score</th>
                <th className="pb-2">Health</th>
                <th className="pb-2">Last week</th>
                <th className="pb-2">Avg 4w</th>
                <th className="pb-2">Lifetime</th>
                <th className="pb-2">Students</th>
                <th className="pb-2">Profile</th>
                <th className="pb-2">Alerts</th>
                <th className="pb-2">Move to</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {byAttention.map((r) => {
                const overdue = r.stuckFor >= r.phase.nudgeAfterDays;
                return (
                  <tr key={r.tutor.id} className="border-t border-black/12">
                    <td className="py-2">
                      <button onClick={() => onOpenTutor(r.tutor.id)} className="flex items-center gap-2 font-semibold hover:text-[#FF79AC]">
                        <Avatar src={r.tutor.avatar} name={r.tutor.name} size={26} ring={`${r.platform.color}44`} />
                        {r.tutor.name}
                      </button>
                    </td>
                    <td className="py-2">
                      <Pill tone={r.phase.color}>
                        {r.phase.emoji} {r.phase.short}
                      </Pill>
                    </td>
                    <td className={`py-2 tabular-nums ${overdue ? "font-bold text-red-600" : ""}`}>{r.stuckFor}d</td>
                    <td className="py-2 tabular-nums">{r.audited ? r.score : "—"}</td>
                    <td className="py-2 tabular-nums">{r.health}%</td>
                    <td className="py-2 tabular-nums">{r.last ? usd(r.last.earningsUsd) : "—"}</td>
                    <td className="py-2 tabular-nums">
                      {r.avg.sampleSize ? usd(r.avg.earningsUsd) : "—"}
                      {r.avg.sampleSize > 1 && <span className="ml-1 text-[11px] text-[#121118]/76">({r.avg.sampleSize}w)</span>}
                    </td>
                    <td className="py-2 tabular-nums">{r.lifetime ? usd(r.lifetime) : "—"}</td>
                    <td className="py-2 tabular-nums">{r.last?.activeStudents ?? "—"}</td>
                    <td className="py-2 tabular-nums">{r.completeness}%</td>
                    <td className="py-2">
                      {r.alerts.length ? (
                        <Pill tone={r.alerts.some((a) => a.severity === "urgent") ? "#EF4444" : "#F59E0B"} title={r.alerts.map((a) => a.title).join(" · ")}>
                          {r.alerts.length}
                        </Pill>
                      ) : (
                        <span className="text-[#121118]/82">—</span>
                      )}
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        {PHASES.map((p) => (
                          <button
                            key={p.id}
                            title={`Move to ${p.label}`}
                            onClick={() => {
                              if (p.id === r.tutor.phase) return;
                              onSetPhase(r.tutor.id, p.id);
                              toast(`${r.tutor.name} moved to ${p.label}.`, "info");
                            }}
                            className={`h-6 w-6 rounded-lg text-[12px] transition-all ${
                              r.tutor.phase === p.id ? "opacity-100 ring-2 ring-offset-1" : "opacity-35 hover:opacity-100"
                            }`}
                            style={{
                              background: `${p.color}22`,
                              color: p.color,
                              boxShadow: r.tutor.phase === p.id ? `0 0 0 2px ${p.color}` : undefined,
                            }}
                          >
                            {p.emoji}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      <Btn size="sm" variant="ghost" onClick={() => onOpenTutor(r.tutor.id)}>
                        Open
                      </Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

/** "no earnings" reads better than "$0" on a summary line. */
function lastWeekLabel(value: number): string {
  return value > 0 ? usd(value) : "nothing";
}

export default PortfolioView;
