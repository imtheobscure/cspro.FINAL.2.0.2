import React, { useMemo, useState } from "react";
import PromptModal from "../../components/PromptModal";
import ReadyCommsCard from "./ReadyCommsCard";
import { Btn, Card, Empty, Field, Meter, Pill, SectionTitle, Stat, inputClass } from "../../components/ui";
import { insightPagePrompt } from "../../lib/prompts";
import { asNumber, normalizeSnapshot, weekStart } from "../../lib/normalize";
import { averages, latestSnapshot, newSnapshot, sortedSnapshots, weekTrend } from "../../lib/domain";
import { moneyPair, num, pct, tinyDate, toman, usd } from "../../lib/format";
import { numberOr, type TutorTabProps } from "./common";

/**
 * Performance.
 *
 * One row per week is all the app needs to see the whole business: earnings, lessons,
 * trials and how many converted, students, rating and response time. Everything else —
 * trends, projections, health, badges, the leaderboard — is derived from these rows, so
 * logging a week is the single most valuable thing the mentor does.
 */

const EarningsChart: React.FC<{ values: { label: string; value: number }[]; color: string; rialPerUsd: number }> = ({
  values,
  color,
  rialPerUsd,
}) => {
  if (values.length === 0) return <p className="text-xs text-[#121118]/82">No weeks logged yet.</p>;
  const max = Math.max(...values.map((v) => v.value), 1);
  return (
    <div className="flex h-40 items-end gap-1.5">
      {values.map((v, i) => (
        <div key={i} className="group flex flex-1 flex-col items-center gap-1">
          <span className="text-[11px] font-bold tabular-nums text-[#121118]/85 opacity-0 transition-opacity group-hover:opacity-100">
            {usd(v.value)}
          </span>
          <div
            className="w-full rounded-t-lg transition-all duration-500"
            style={{ height: `${Math.max(3, (v.value / max) * 100)}%`, background: `linear-gradient(180deg, ${color}, ${color}77)` }}
            title={`${v.label}: ${usd(v.value)} · ${toman(v.value, rialPerUsd)}`}
          />
          <span className="text-[11px] text-[#121118]/78">{v.label}</span>
        </div>
      ))}
    </div>
  );
};

const PerformanceTab: React.FC<TutorTabProps> = ({ tutor, platform, rialPerUsd, update, toast }) => {
  const [reading, setReading] = useState(false);
  const [draft, setDraft] = useState(() => ({
    weekOf: weekStart(),
    earningsUsd: "",
    lessons: "",
    trials: "",
    trialsConverted: "",
    activeStudents: "",
    newStudents: "",
    rating: "",
    responseHours: "",
    cancellations: "",
    notes: "",
  }));

  const weeks = useMemo(() => sortedSnapshots(tutor), [tutor]);
  const avg = averages(tutor, 4);
  const last = latestSnapshot(tutor);
  const trend = weekTrend(tutor);
  const chart = weeks.slice(-12).map((s) => ({ label: tinyDate(s.weekOf), value: s.earningsUsd }));
  const conversion = last && last.trials ? Math.round((last.trialsConverted / last.trials) * 100) : 0;

  const saveWeek = () => {
    const snapshot = newSnapshot({
      weekOf: draft.weekOf,
      earningsUsd: numberOr(draft.earningsUsd),
      lessons: numberOr(draft.lessons),
      trials: numberOr(draft.trials),
      trialsConverted: numberOr(draft.trialsConverted),
      activeStudents: numberOr(draft.activeStudents),
      newStudents: numberOr(draft.newStudents),
      rating: numberOr(draft.rating),
      responseHours: numberOr(draft.responseHours),
      cancellations: numberOr(draft.cancellations),
      notes: draft.notes,
    });
    update((t) => ({
      ...t,
      snapshots: [...t.snapshots.filter((s) => s.weekOf !== snapshot.weekOf), snapshot].sort((a, b) => (a.weekOf < b.weekOf ? -1 : 1)),
    }));
    toast(`Week of ${snapshot.weekOf} saved — ${usd(snapshot.earningsUsd)} (${toman(snapshot.earningsUsd, rialPerUsd)}).`);
    setDraft({ ...draft, earningsUsd: "", lessons: "", trials: "", trialsConverted: "", activeStudents: "", newStudents: "", rating: "", responseHours: "", cancellations: "", notes: "" });
  };

  return (
    <div className="space-y-5">
      <ReadyCommsCard tutor={tutor} platform={platform} rialPerUsd={rialPerUsd} update={update} toast={toast} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Last week" value={last ? usd(last.earningsUsd) : "—"} sub={last ? toman(last.earningsUsd, rialPerUsd) : "log a week below"} icon="💵" />
        <Stat
          label="Trend"
          value={trend.direction === "flat" ? "—" : `${trend.direction === "up" ? "▲" : "▼"} ${Math.abs(trend.earningsPercent)}%`}
          tone={trend.direction === "down" ? "#EF4444" : trend.direction === "up" ? "#10B981" : undefined}
          sub="week over week"
          icon="📈"
        />
        <Stat label="4-week average" value={avg.sampleSize ? usd(avg.earningsUsd) : "—"} sub={avg.sampleSize ? `over ${avg.sampleSize} weeks` : "no data"} icon="📊" />
        <Stat label="Trial conversion" value={conversion ? pct(conversion) : "—"} sub={last ? `${last.trialsConverted} of ${last.trials} last week` : "needs trials"} icon="🤝" />
      </div>

      <Card>
        <SectionTitle
          icon="📈"
          title="Earnings by week"
          sub="The last twelve weeks. Hover a bar for both currencies."
          right={<Btn variant="outline" onClick={() => setReading(true)}>🤖 Read an Insight page</Btn>}
        />
        <EarningsChart values={chart} color="#FF79AC" rialPerUsd={rialPerUsd} />
        {last && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <Meter value={Math.min(100, (avg.lessons / 25) * 100)} color="#3B82F6" label="Lessons a week" right={num(avg.lessons, 1)} />
            </div>
            <div>
              <Meter value={Math.min(100, (avg.activeStudents / 15) * 100)} color="#8B5CF6" label="Active students" right={num(avg.activeStudents, 1)} />
            </div>
            <div>
              <Meter value={Math.min(100, (avg.rating / 5) * 100)} color="#10B981" label="Rating" right={avg.rating ? avg.rating.toFixed(2) : "—"} />
            </div>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle icon="➕" title="Log a week" sub="The Insight page has all of it: Overview earnings, lessons, active and new students, rating and response time." />
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="Week starting (Monday)">
            <input type="date" className={inputClass} value={draft.weekOf} onChange={(e) => setDraft({ ...draft, weekOf: e.target.value })} />
          </Field>
          <Field label="Earnings (USD)">
            <input type="number" className={inputClass} value={draft.earningsUsd} onChange={(e) => setDraft({ ...draft, earningsUsd: e.target.value })} placeholder="120" />
          </Field>
          <Field label="Lessons">
            <input type="number" className={inputClass} value={draft.lessons} onChange={(e) => setDraft({ ...draft, lessons: e.target.value })} placeholder="14" />
          </Field>
          <Field label="Trials">
            <input type="number" className={inputClass} value={draft.trials} onChange={(e) => setDraft({ ...draft, trials: e.target.value })} placeholder="3" />
          </Field>
          <Field label="Trials converted">
            <input type="number" className={inputClass} value={draft.trialsConverted} onChange={(e) => setDraft({ ...draft, trialsConverted: e.target.value })} placeholder="2" />
          </Field>
          <Field label="Active students">
            <input type="number" className={inputClass} value={draft.activeStudents} onChange={(e) => setDraft({ ...draft, activeStudents: e.target.value })} placeholder="6" />
          </Field>
          <Field label="New students">
            <input type="number" className={inputClass} value={draft.newStudents} onChange={(e) => setDraft({ ...draft, newStudents: e.target.value })} placeholder="2" />
          </Field>
          <Field label="Rating">
            <input type="number" step="0.1" className={inputClass} value={draft.rating} onChange={(e) => setDraft({ ...draft, rating: e.target.value })} placeholder="4.9" />
          </Field>
          <Field label="Response time (hours)">
            <input type="number" step="0.5" className={inputClass} value={draft.responseHours} onChange={(e) => setDraft({ ...draft, responseHours: e.target.value })} placeholder="3" />
          </Field>
          <Field label="Cancellations">
            <input type="number" className={inputClass} value={draft.cancellations} onChange={(e) => setDraft({ ...draft, cancellations: e.target.value })} placeholder="0" />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <input className={inputClass} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Anything the numbers do not say" />
          </Field>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Btn onClick={saveWeek}>Save this week</Btn>
          {draft.earningsUsd && <span className="text-xs text-[#121118]/85">{moneyPair(numberOr(draft.earningsUsd), rialPerUsd)}</span>}
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <SectionTitle icon="🗓️" title="Every week on record" sub={`${weeks.length} week${weeks.length === 1 ? "" : "s"}`} />
        {weeks.length === 0 ? (
          <Empty icon="📅" title="No weeks logged" body="Log a week above, or paste the Insight page and let the AI read it into a row." />
        ) : (
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-wide text-[#121118]/78">
                <th className="pb-2">Week</th>
                <th className="pb-2">Earnings</th>
                <th className="pb-2">In Toman</th>
                <th className="pb-2">Lessons</th>
                <th className="pb-2">Trials</th>
                <th className="pb-2">Conv.</th>
                <th className="pb-2">Students</th>
                <th className="pb-2">Rating</th>
                <th className="pb-2">Replies</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {[...weeks].reverse().map((s) => (
                <tr key={s.id} className="border-t border-black/12">
                  <td className="py-2 font-semibold">{tinyDate(s.weekOf)}</td>
                  <td className="py-2 tabular-nums">{usd(s.earningsUsd)}</td>
                  <td className="py-2 tabular-nums text-[#121118]/88">{toman(s.earningsUsd, rialPerUsd, { compact: false })}</td>
                  <td className="py-2 tabular-nums">{s.lessons}</td>
                  <td className="py-2 tabular-nums">
                    {s.trials} <span className="text-[11px] text-[#121118]/78">({s.trialsConverted}→)</span>
                  </td>
                  <td className="py-2">
                    {s.trials ? (
                      <Pill tone={s.trialsConverted / s.trials >= 0.5 ? "#10B981" : "#F59E0B"}>{Math.round((s.trialsConverted / s.trials) * 100)}%</Pill>
                    ) : (
                      <span className="text-[#121118]/82">—</span>
                    )}
                  </td>
                  <td className="py-2 tabular-nums">
                    {s.activeStudents} <span className="text-[11px] text-[#121118]/78">+{s.newStudents}</span>
                  </td>
                  <td className="py-2 tabular-nums">{s.rating || "—"}</td>
                  <td className="py-2 tabular-nums">{s.responseHours ? `${s.responseHours}h` : "—"}</td>
                  <td className="py-2 text-right">
                    <Btn
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        update((t) => ({ ...t, snapshots: t.snapshots.filter((x) => x.id !== s.id) }));
                        toast(`Week of ${s.weekOf} deleted.`, "info");
                      }}
                    >
                      🗑
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {platform.id === "preply" && (
          <p className="mt-3 text-[12px] text-[#121118]/82">
            Preply's Overview panel shows earnings, lessons, active students and new students with 7/30/90-day filters. Use the
            30-day view and the prompt converts it to a weekly figure.
          </p>
        )}
      </Card>

      <PromptModal
        open={reading}
        onClose={() => setReading(false)}
        title={insightPagePrompt(tutor, weekStart()).title}
        purpose={insightPagePrompt(tutor, weekStart()).purpose}
        prompt={insightPagePrompt(tutor, weekStart()).prompt}
        schema={insightPagePrompt(tutor, weekStart()).schema}
        summarize={(parsed) => {
          const s = normalizeSnapshot(parsed);
          return `Week ${s.weekOf ?? weekStart()}: ${usd(asNumber(s.earningsUsd))} · ${asNumber(s.lessons)} lessons · ${asNumber(s.trials)} trials · rating ${s.rating || "n/a"}`;
        }}
        onApply={(parsed) => {
          const patch = normalizeSnapshot(parsed, draft.weekOf);
          const snapshot = newSnapshot({ ...patch, weekOf: patch.weekOf || weekStart() });
          update((t) => ({
            ...t,
            snapshots: [...t.snapshots.filter((s) => s.weekOf !== snapshot.weekOf), snapshot].sort((a, b) => (a.weekOf < b.weekOf ? -1 : 1)),
          }));
          toast(`Insight page read: ${usd(snapshot.earningsUsd)} for the week of ${snapshot.weekOf}.`);
        }}
      />
    </div>
  );
};

export default PerformanceTab;
