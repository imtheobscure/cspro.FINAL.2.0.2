import React, { useState } from "react";
import PromptModal from "../../components/PromptModal";
import { Btn, Card, Gauge, Meter, Pill, SectionTitle, Sparkline } from "../../components/ui";
import { masterAuditPrompt, sosPrompt } from "../../lib/prompts";
import { normalizeAudit, clamp } from "../../lib/normalize";
import { superTutorMonitor, tierFor, scoreColor } from "../../lib/domain";
import { shortDate } from "../../lib/format";
import type { TutorTabProps } from "./common";

/**
 * The Master AI — Profile Auditor & Scoring Engine.
 *
 * One unified module that produces the 100-point Profile Power Score, a sub-score with
 * a tip for every criterion, the Success Probability Index, and exactly three ranked
 * actions. The same score drives the leaderboard tier, so the whole app speaks one
 * language about how strong a profile is.
 */
const AuditTab: React.FC<TutorTabProps> = ({ tutor, platform, update, toast }) => {
  const [running, setRunning] = useState(false);
  const [sos, setSos] = useState(false);
  const audit = tutor.audit;
  const tier = tierFor(audit?.powerScore ?? 0);
  const monitor = superTutorMonitor(tutor);
  const met = monitor.filter((m) => m.met).length;
  const history = tutor.auditHistory ?? [];

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle
          icon="🧠"
          title="Master AI · Profile Auditor & Scoring Engine"
          sub={`Scores the profile out of 100 against ${platform.name}'s own rubric, predicts booking success and ranks the three actions that matter most.`}
          right={
            <div className="flex gap-2">
              {audit && (
                <Btn variant="outline" onClick={() => setRunning(true)}>
                  🔄 Re-audit
                </Btn>
              )}
              <Btn onClick={() => setRunning(true)}>{audit ? "Run again" : "🤖 Run the audit"}</Btn>
            </div>
          }
        />

        {!audit ? (
          <div className="rounded-2xl border border-dashed border-black/16 bg-black/[0.05] p-6 text-center">
            <p className="text-3xl">🔍</p>
            <h3 className="mt-2 font-bold">This profile has not been audited yet</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-[#121118]/85">
              The audit searches the web for {platform.name}'s current criteria, scores every part of the profile,
              and hands you three actions in priority order. Its score also sets this tutor's leaderboard tier.
            </p>
            <Btn className="mt-3" onClick={() => setRunning(true)}>
              🤖 Run the audit
            </Btn>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
            <div className="flex items-center gap-5">
              <Gauge value={audit.powerScore} color={tier.color} size={124} sublabel="power score" thickness={10} />
              <div className="space-y-3">
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-wide text-[#121118]/78">Success probability</p>
                  <p className="text-2xl font-bold tabular-nums" style={{ color: tier.color }}>
                    {audit.successProbability}%
                  </p>
                  <p className="text-[12px] text-[#121118]/82">chance of converting a visitor to a paid trial in 30 days</p>
                </div>
                <Pill tone={tier.color}>
                  {tier.emoji} {tier.name}
                </Pill>
              </div>
            </div>
            <div>
              <p className="text-sm leading-relaxed text-[#121118]/93">{audit.summary}</p>
              <p className="mt-2 text-[12px] text-[#121118]/78">Audited {shortDate(audit.at)}</p>
              {history.length > 1 && (
                <div className="mt-3">
                  <p className="mb-1 text-[12px] font-bold uppercase tracking-wide text-[#121118]/78">Score history</p>
                  <Sparkline values={history.map((h) => h.powerScore)} color={tier.color} width={220} height={44} />
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {audit && (
        <>
          <Card>
            <SectionTitle icon="📋" title="Sub-criteria" sub="Each one scored out of 100 with the single biggest improvement." />
            <div className="space-y-3">
              {audit.subScores.map((s) => {
                const tone = scoreColor(s.score);
                return (
                  <div key={s.key} className="rounded-2xl border border-black/12 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold">{s.label}</p>
                      <span className="text-sm font-bold tabular-nums" style={{ color: tone }}>
                        {s.score}
                        <span className="text-[12px] text-[#121118]/76">/100</span>
                      </span>
                    </div>
                    <div className="mt-2">
                      <Meter value={s.score} color={tone} />
                    </div>
                    {s.tip && <p className="mt-2 text-xs text-[#121118]/88">💡 {s.tip}</p>}
                  </div>
                );
              })}
              {audit.subScores.length === 0 && <p className="text-xs text-[#121118]/82">No sub-scores came back in that audit.</p>}
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <SectionTitle icon="💪" title="What is working" />
              <ul className="space-y-2">
                {audit.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2 rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-800">
                    <span>✅</span>
                    <span>{s}</span>
                  </li>
                ))}
                {audit.strengths.length === 0 && <li className="text-xs text-[#121118]/82">Nothing listed.</li>}
              </ul>
            </Card>
            <Card>
              <SectionTitle icon="🩹" title="What is costing bookings" />
              <ul className="space-y-2">
                {audit.weaknesses.map((s, i) => (
                  <li key={i} className="flex gap-2 rounded-xl bg-red-50 p-2.5 text-xs text-red-700">
                    <span>⚠️</span>
                    <span>{s}</span>
                  </li>
                ))}
                {audit.weaknesses.length === 0 && <li className="text-xs text-[#121118]/82">Nothing listed.</li>}
              </ul>
            </Card>
          </div>

          <Card>
            <SectionTitle icon="🎯" title="Three actions, ranked by impact" sub="Work them in this order." />
            <ol className="space-y-3">
              {audit.actions.map((action, i) => (
                <li key={i} className="rounded-2xl border border-black/12 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-bold">
                      <span className="mr-2 inline-grid h-5 w-5 place-items-center rounded-full bg-[#121118] text-[11px] text-white">
                        {i + 1}
                      </span>
                      {action.title}
                    </p>
                    {action.impact && (
                      <Pill tone={/high/i.test(action.impact) ? "#EF4444" : /low/i.test(action.impact) ? "#64748B" : "#F59E0B"}>
                        {action.impact} impact
                      </Pill>
                    )}
                  </div>
                  {action.why && <p className="mt-1.5 text-xs text-[#121118]/88">Why: {action.why}</p>}
                  {action.how && <p className="mt-1 text-xs text-[#121118]/88">How: {action.how}</p>}
                </li>
              ))}
              {audit.actions.length === 0 && <li className="text-xs text-[#121118]/82">No actions came back.</li>}
            </ol>
          </Card>

          <Card>
            <SectionTitle
              icon="🏅"
              title="Success monitor"
              sub={`${met} of ${monitor.length} criteria met. A wrong tick is worse than a blank, so anything the app cannot see stays blank.`}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              {monitor.map((row) => (
                <div key={row.criterion} className="flex items-start gap-2 rounded-xl border border-black/12 p-2.5">
                  <span className={`mt-0.5 text-sm ${row.value === "no data" || row.value.includes("tracked by") ? "opacity-40" : ""}`}>
                    {row.value === "no data" || row.value.includes("tracked by") ? "•" : row.met ? "✅" : "❌"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">{row.criterion}</p>
                    <p className="text-[12px] text-[#121118]/82">
                      {row.value} · target {row.target}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {audit.superTutor.length > 0 && (
              <p className="mt-3 text-[12px] text-[#121118]/78">
                The audit also returned its own reading of {audit.superTutor.length} criteria for this month — it is kept in the JSON
                export alongside everything else.
              </p>
            )}
          </Card>

          {audit.sources.length > 0 && (
            <Card>
              <SectionTitle icon="🔗" title="What the audit searched" />
              <ul className="space-y-1.5">
                {audit.sources.map((s, i) => (
                  <li key={i} className="text-xs">
                    {s.url ? (
                      <a className="text-[#FF79AC] hover:underline" href={s.url} target="_blank" rel="noreferrer">
                        {s.title || s.url}
                      </a>
                    ) : (
                      <span className="text-[#121118]/88">{s.title}</span>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      <Card>
        <SectionTitle
          icon="🆘"
          title="SOS · Emergency recovery"
          sub="For the moment a score drops or no trial has been booked in a while."
          right={<Btn variant="danger" onClick={() => setSos(true)}>Open SOS prompt</Btn>}
        />
        <p className="text-xs text-[#121118]/86">
          Produces a three-point recovery plan with timings, the exact message to send, and what to check in seven days.
          It also says plainly when the real problem is burnout rather than effort.
        </p>
      </Card>

      <PromptModal
        open={running}
        onClose={() => setRunning(false)}
        title={masterAuditPrompt(tutor).title}
        purpose={masterAuditPrompt(tutor).purpose}
        prompt={masterAuditPrompt(tutor).prompt}
        schema={masterAuditPrompt(tutor).schema}
        summarize={(parsed) => {
          const norm = normalizeAudit(parsed);
          if (!norm) return "No score found in that answer.";
          return [
            `Power score: ${norm.powerScore}/100 · success probability: ${norm.successProbability}%`,
            `Sub-criteria: ${norm.subScores.length} · strengths: ${norm.strengths.length} · weaknesses: ${norm.weaknesses.length}`,
            `Actions: ${norm.actions.length}${norm.actions.length !== 3 ? "  ← the contract asks for exactly 3" : ""}`,
            `Sources: ${norm.sources.length}`,
          ].join("\n");
        }}
        onApply={(parsed) => {
          const norm = normalizeAudit(parsed);
          if (!norm) throw new Error("That answer had no score in it. Make sure you used the audit prompt.");
          const full = {
            ...norm,
            id: `a_${Date.now().toString(36)}`,
            at: new Date().toISOString(),
            powerScore: clamp(norm.powerScore, 0, 100),
            successProbability: clamp(norm.successProbability, 0, 100),
          };
          update((t) => ({
            ...t,
            audit: full,
            auditHistory: [
              ...(t.auditHistory ?? []),
              { at: full.at, powerScore: full.powerScore, successProbability: full.successProbability },
            ].slice(-24),
          }));
          toast(`Audit applied — power score ${full.powerScore}/100, ${full.actions.length} ranked actions.`);
        }}
      />

      <PromptModal
        open={sos}
        onClose={() => setSos(false)}
        title={sosPrompt(tutor, "", [], tutor.audit).title}
        purpose={sosPrompt(tutor, "", [], tutor.audit).purpose}
        prompt={sosPrompt(tutor, "", [], tutor.audit).prompt}
        schema={sosPrompt(tutor, "", [], tutor.audit).schema}
        onApply={(parsed) => {
          const root = (parsed ?? {}) as Record<string, unknown>;
          const message = typeof root.message === "string" ? root.message : "";
          const summary = typeof root.situation === "string" ? root.situation : "";
          if (message) {
            update((t) => ({
              ...t,
              messages: [
                ...t.messages,
                {
                  id: `m_${Date.now().toString(36)}`,
                  at: new Date().toISOString(),
                  tone: "sos",
                  occasion: "Emergency recovery",
                  text: message,
                },
              ],
              logs: [
                ...t.logs,
                {
                  id: `l_${Date.now().toString(36)}`,
                  at: new Date().toISOString(),
                  kind: "alert",
                  language: "",
                  raw: JSON.stringify(parsed, null, 2),
                  summary: summary || "SOS plan generated.",
                  mood: "at-risk",
                  swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
                  followUps: [],
                  actions: Array.isArray(root.recovery)
                    ? (root.recovery as Record<string, unknown>[]).map((r) => String(r?.step ?? ""))
                    : [],
                },
              ],
            }));
            toast("Recovery plan saved to the log, and the message is waiting in Messages.");
          } else {
            toast("That answer had no message field — nothing was saved.", "error");
          }
        }}
      />
    </div>
  );
};

export default AuditTab;
