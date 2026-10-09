import React, { useMemo, useState } from "react";
import PromptModal from "../../components/PromptModal";
import ReadyCommsCard from "./ReadyCommsCard";
import { Btn, Card, Field, Meter, Pill, SectionTitle, Stat, inputClass } from "../../components/ui";
import { goalWizardPrompt, priceBenchmarkPrompt, planProgress } from "../../lib/prompts";
import { normalizeGoal, normalizePlan90 } from "../../lib/normalize";
import { averages, badgesFor, newTutor, totalEarnings } from "../../lib/domain";
import { moneyPair, num, pct, toman, usd } from "../../lib/format";
import { joinList, numberOr, splitList, type TutorTabProps } from "./common";

/**
 * Goals and the 90-day plan.
 *
 * Everything here is expressed twice: in the platform's dollars, and in Toman at the
 * rate set in Settings. For a mentor working with Iranian tutors that pairing is the
 * difference between an abstract target and a number the tutor can feel, so the panel
 * is built around the two questions they actually ask: "how much can I earn?" and
 * "how long until I can afford this?".
 */
const GoalsTab: React.FC<TutorTabProps> = ({ tutor, platform, rialPerUsd, update, toast }) => {
  const [wizard, setWizard] = useState(false);
  const [benchmark, setBenchmark] = useState(false);
  const [answers, setAnswers] = useState("");
  const [hours, setHours] = useState(tutor.goal?.hoursPerWeek || tutor.account.availabilityHours || 20);
  const [savingFor, setSavingFor] = useState(tutor.goal?.lifeGoal || "");
  const [savingCost, setSavingCost] = useState(String(tutor.goal?.lifeGoalCostUsd || ""));

  const goal = tutor.goal;
  const plan = tutor.plan;
  const progress = planProgress(plan);
  const avg = averages(tutor, 4);
  const commission = platform.commission || 0;
  const rate = tutor.account.priceUsd || 0;

  /** What the tutor is on pace for at their current booked hours. */
  const currentMonthly = useMemo(
    () => Math.round(Math.max(avg.lessons, 0) * rate * (1 - commission) * 4.3),
    [avg.lessons, rate, commission],
  );
  /** What the slider says they would earn at a chosen number of hours. */
  const projected = useMemo(() => Math.round(hours * 4.3 * rate * (1 - commission)), [hours, rate, commission]);
  const freedom = goal?.monthlyIncomeUsd ? Math.min(100, Math.round((currentMonthly / goal.monthlyIncomeUsd) * 100)) : 0;
  const monthsToGoal =
    goal?.lifeGoalCostUsd && currentMonthly > 0 ? Math.ceil(goal.lifeGoalCostUsd / currentMonthly) : 0;
  const badges = badgesFor(tutor, totalEarnings(tutor), rialPerUsd);

  const setGoal = (patch: Partial<NonNullable<typeof goal>>) =>
    update((t) => ({
      ...t,
      goal: {
        monthlyIncomeUsd: 0,
        hoursPerWeek: 0,
        studentsTarget: 0,
        studentTypes: [],
        lifeGoal: "",
        lifeGoalCostUsd: 0,
        notes: "",
        createdAt: new Date().toISOString(),
        ...(t.goal ?? {}),
        ...patch,
      },
    }));

  return (
    <div className="space-y-5">
      <ReadyCommsCard tutor={tutor} platform={platform} rialPerUsd={rialPerUsd} update={update} toast={toast} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="On pace for" value={currentMonthly ? usd(currentMonthly) : "—"} sub={currentMonthly ? toman(currentMonthly, rialPerUsd) + " a month" : "needs price and lessons"} icon="🧮" />
        <Stat label="Target" value={goal?.monthlyIncomeUsd ? usd(goal.monthlyIncomeUsd) : "not set"} sub={goal?.monthlyIncomeUsd ? toman(goal.monthlyIncomeUsd, rialPerUsd) : "run the Goal Wizard"} icon="🎯" />
        <Stat label="Plan progress" value={progress.total ? pct(progress.percent) : "—"} sub={progress.total ? `${progress.done} of ${progress.total} weeks done` : "no plan yet"} icon="🗓️" />
        <Stat
          label="Room to grow"
          value={rate ? usd(Math.max(0, projected - currentMonthly)) : "—"}
          sub={rate ? `if they teach ${hours}h a week` : "set a price first"}
          icon="🚀"
        />
      </div>

      <Card>
        <SectionTitle
          icon="🧭"
          title="Smart Goal Wizard"
          sub="A short interview the AI turns into a 90-day growth plan, week by week, with a metric for each week."
          right={<Btn onClick={() => setWizard(true)}>{goal ? "🔄 Rebuild the plan" : "🤖 Start the interview"}</Btn>}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Field label="Monthly income target (USD)" hint={goal?.monthlyIncomeUsd ? `= ${toman(goal.monthlyIncomeUsd, rialPerUsd)} a month` : ""}>
              <input
                type="number"
                className={inputClass}
                value={goal?.monthlyIncomeUsd || ""}
                onChange={(e) => setGoal({ monthlyIncomeUsd: numberOr(e.target.value) })}
                placeholder="400"
              />
            </Field>
            <Field label="Hours available per week">
              <input type="number" className={inputClass} value={goal?.hoursPerWeek || ""} onChange={(e) => setGoal({ hoursPerWeek: numberOr(e.target.value) })} placeholder="20" />
            </Field>
            <Field label="Students target">
              <input type="number" className={inputClass} value={goal?.studentsTarget || ""} onChange={(e) => setGoal({ studentsTarget: numberOr(e.target.value) })} placeholder="12" />
            </Field>
          </div>
          <div className="space-y-3">
            <Field label="Who they want to teach" hint="Comma separated — this shapes the plan">
              <input
                className={inputClass}
                value={joinList(goal?.studentTypes ?? [])}
                onChange={(e) => setGoal({ studentTypes: splitList(e.target.value) })}
                placeholder="Adults, IELTS candidates, Business English"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Saving for">
                <input className={inputClass} value={savingFor} onChange={(e) => setSavingFor(e.target.value)} onBlur={() => setGoal({ lifeGoal: savingFor })} placeholder="A laptop" />
              </Field>
              <Field label="Cost (USD)">
                <input
                  type="number"
                  className={inputClass}
                  value={savingCost}
                  onChange={(e) => setSavingCost(e.target.value)}
                  onBlur={() => setGoal({ lifeGoalCostUsd: numberOr(savingCost) })}
                  placeholder="900"
                />
              </Field>
            </div>
            {goal?.notes && <p className="rounded-2xl bg-black/[0.05] p-3 text-xs text-[#121118]/88">{goal.notes}</p>}
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle icon="🕰️" title="Income visualiser" sub="Drag the slider: projected monthly earnings at that many teaching hours." />
        <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
          <div>
            <input
              type="range"
              min={1}
              max={60}
              value={hours}
              onChange={(e) => setHours(numberOr(e.target.value, 20))}
              className="w-full accent-[#FF79AC]"
              aria-label="Hours per week"
            />
            <div className="flex justify-between text-[12px] text-[#121118]/78">
              <span>1 hour</span>
              <span>{hours} hours a week</span>
              <span>60</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#FF79AC]/[0.08] p-3">
                <p className="text-[12px] font-bold uppercase tracking-wide text-[#121118]/82">Gross a month</p>
                <p className="text-2xl font-bold tabular-nums">{usd(hours * 4.3 * rate)}</p>
                <p className="text-xs text-[#121118]/86">{toman(hours * 4.3 * rate, rialPerUsd)}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3">
                <p className="text-[12px] font-bold uppercase tracking-wide text-emerald-700/70">After {platform.name}'s {pct(commission * 100)} cut</p>
                <p className="text-2xl font-bold tabular-nums text-emerald-700">{usd(projected)}</p>
                <p className="text-xs text-emerald-700/70">{toman(projected, rialPerUsd)}</p>
              </div>
            </div>
            {!rate && <p className="mt-3 text-xs text-amber-600">Set the hourly price on the Account tab and these numbers become real.</p>}
          </div>

          <div className="space-y-3">
            <div className="text-center">
              <p className="text-[12px] font-bold uppercase tracking-wide text-[#121118]/82">Economic freedom</p>
              <p className="text-3xl font-bold" style={{ color: freedom >= 100 ? "#10B981" : "#FF79AC" }}>
                {goal?.monthlyIncomeUsd ? pct(freedom) : "—"}
              </p>
              <p className="text-[12px] text-[#121118]/82">of their own monthly target</p>
            </div>
            <Meter value={freedom} color={freedom >= 100 ? "#10B981" : "#FF79AC"} height={12} />
            <p className="text-xs leading-relaxed text-[#121118]/88">
              {!goal?.monthlyIncomeUsd
                ? "Set a monthly target with the Goal Wizard to see how close they are."
                : freedom >= 100
                  ? `They are past their own target at ${usd(currentMonthly)} a month. The next conversation is about raising the price, not the hours.`
                  : freedom >= 60
                    ? `At ${usd(currentMonthly)} a month they are ${usd(goal.monthlyIncomeUsd - currentMonthly)} short of their target. One more regular student or a small price rise closes it.`
                    : `At ${usd(currentMonthly)} a month against a ${usd(goal.monthlyIncomeUsd)} target, the gap is ${usd(goal.monthlyIncomeUsd - currentMonthly)}. Work the plan's early weeks before adding hours.`}
            </p>
            {goal?.lifeGoal && (
              <div className="rounded-2xl bg-black/[0.06] p-3">
                <p className="text-[12px] font-bold uppercase tracking-wide text-[#121118]/82">Life goal</p>
                <p className="text-sm font-semibold">{goal.lifeGoal}</p>
                <p className="text-xs text-[#121118]/86">
                  {moneyPair(goal.lifeGoalCostUsd, rialPerUsd)} ·{" "}
                  {monthsToGoal > 0 ? `about ${monthsToGoal} month${monthsToGoal === 1 ? "" : "s"} at the current pace` : "needs current earnings first"}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {badges.length > 0 && (
        <Card>
          <SectionTitle icon="🪙" title="Badges earned" sub="Dollar Warrior unlocks as cumulative earnings pass 50M, 100M and 500M Toman." />
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <Pill key={b.id} tone="#F59E0B" title={b.detail}>
                {b.emoji} {b.label}
              </Pill>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <SectionTitle
          icon="💵"
          title="Price benchmarking"
          sub={`Compares ${tutor.account.priceUsd ? usd(tutor.account.priceUsd) : "the current rate"} with what ${platform.name} students actually pay this month.`}
          right={<Btn variant="outline" onClick={() => setBenchmark(true)}>🤖 Benchmark the price</Btn>}
        />
        <p className="text-xs text-[#121118]/86">
          Returns a competitive range in dollars, the same range in Toman, and a gradual raise plan tied to concrete
          conditions — reviews earned, trials converted, demand for their slots.
        </p>
      </Card>

      <Card>
        <SectionTitle icon="🗓️" title="The 90-day plan" sub={plan ? `${progress.done} of ${progress.total} weeks complete` : "No plan yet"} />
        {!plan ? (
          <div className="rounded-2xl border border-dashed border-black/16 bg-black/[0.05] p-6 text-center">
            <p className="text-sm text-[#121118]/86">
              Run the Goal Wizard and paste the JSON back — thirteen weeks, each with a theme, actions and one metric to
              check on Sunday.
            </p>
            <Btn className="mt-3" onClick={() => setWizard(true)}>
              🤖 Start the interview
            </Btn>
          </div>
        ) : (
          <>
            <Meter value={progress.percent} color="#8B5CF6" label="Plan progress" right={`${progress.percent}%`} height={10} />
            {plan.summary && <p className="mt-3 text-sm leading-relaxed text-[#121118]/91">{plan.summary}</p>}
            <div className="mt-4 space-y-2">
              {plan.weeks.map((week) => (
                <div key={week.week} className={`rounded-2xl border p-3 ${week.done ? "border-emerald-100 bg-emerald-50/60" : "border-black/12"}`}>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={week.done}
                      onChange={() =>
                        update((t) => ({
                          ...t,
                          plan: t.plan
                            ? { ...t.plan, weeks: t.plan.weeks.map((w) => (w.week === week.week ? { ...w, done: !w.done } : w)) }
                            : t.plan,
                        }))
                      }
                      className="mt-0.5 h-4 w-4 accent-emerald-600"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">
                        Week {week.week}
                        {week.focus ? ` · ${week.focus}` : ""}
                      </p>
                      {week.actions.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {week.actions.map((action, i) => (
                            <li key={i} className="text-xs text-[#121118]/88">
                              • {action}
                            </li>
                          ))}
                        </ul>
                      )}
                      {week.metric && <p className="mt-1 text-[12px] font-semibold text-[#8B5CF6]">📍 Check on Sunday: {week.metric}</p>}
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <Card>
        <SectionTitle icon="📝" title="Weekly check-in" sub="Every week the plan expects a short report card. Ask for the Insight page, log the week, and compare it with the plan's metric." />
        <p className="text-xs text-[#121118]/86">
          Current pace: {num(avg.lessons, 1)} lessons a week at {rate ? usd(rate) : "no price"} ·{" "}
          {currentMonthly ? `${usd(currentMonthly)} (${toman(currentMonthly, rialPerUsd)}) a month` : "no projection yet"}
          {goal?.hoursPerWeek ? ` · available ${goal.hoursPerWeek} hours a week` : ""}.
        </p>
      </Card>

      <PromptModal
        open={wizard}
        onClose={() => setWizard(false)}
        title={goalWizardPrompt(tutor, answers).title}
        purpose={goalWizardPrompt(tutor, answers).purpose}
        prompt={goalWizardPrompt(tutor, answers).prompt}
        schema={goalWizardPrompt(tutor, answers).schema}
        summarize={(parsed) => {
          const g = normalizeGoal(parsed);
          const p = normalizePlan90(parsed);
          return [
            `Goal: ${g?.monthlyIncomeUsd ? usd(g.monthlyIncomeUsd) : "not set"} a month · ${g?.hoursPerWeek ?? 0} hours a week`,
            `Plan: ${p?.weeks.length ?? 0} weeks${p && p.weeks.length !== 13 ? "  ← the contract asks for exactly 13" : ""}`,
          ].join("\n");
        }}
        onApply={(parsed) => {
          const g = normalizeGoal(parsed);
          const p = normalizePlan90(parsed);
          if (!g && !p) throw new Error("That answer had neither a goal nor a plan in it.");
          update((t) => ({ ...t, goal: g ?? t.goal, plan: p ?? t.plan }));
          toast(`Goal and plan applied${p ? ` — ${p.weeks.length} weeks` : ""}.`);
          setAnswers("");
        }}
      >
        <div>
          <Field
            label="The interview (typed answers)"
            hint="Type whatever they told you: income target, hours available, who they want to teach, what is in the way. The prompt carries it."
          >
            <textarea
              className={`${inputClass} h-32 resize-y`}
              value={answers}
              onChange={(e) => setAnswers(e.target.value)}
              placeholder={"e.g. She wants $400 a month, can teach 20 hours, prefers adults, no video yet, internet drops in the evenings."}
            />
          </Field>
          <div className="mt-2 flex gap-2">
            <Btn
              size="sm"
              variant="outline"
              onClick={() => {
                const seed = [
                  goal?.monthlyIncomeUsd ? `Income target: $${goal.monthlyIncomeUsd} a month.` : "",
                  `Hours available: ${goal?.hoursPerWeek ?? hours} a week.`,
                  goal?.studentTypes.length ? `Wants to teach: ${goal.studentTypes.join(", ")}.` : "",
                  goal?.lifeGoal ? `Saving for: ${goal.lifeGoal} ($${goal.lifeGoalCostUsd}).` : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                setAnswers(seed);
              }}
            >
              Start from the fields already filled
            </Btn>
          </div>
        </div>
      </PromptModal>

      <PromptModal
        open={benchmark}
        onClose={() => setBenchmark(false)}
        title={priceBenchmarkPrompt(tutor).title}
        purpose={priceBenchmarkPrompt(tutor).purpose}
        prompt={priceBenchmarkPrompt(tutor).prompt}
        schema={priceBenchmarkPrompt(tutor).schema}
        summarize={(parsed) => {
          const root = (parsed ?? {}) as Record<string, unknown>;
          const rec = Number(root.recommendedUsd ?? 0);
          const low = Number(root.marketLowUsd ?? 0);
          const high = Number(root.marketHighUsd ?? 0);
          return rec
            ? `Recommended ${usd(rec)} (${toman(rec, rialPerUsd)}) · market ${usd(low)}–${usd(high)}`
            : "No recommended price found in that answer.";
        }}
        onApply={(parsed) => {
          const root = (parsed ?? {}) as Record<string, unknown>;
          const rec = Number(root.recommendedUsd ?? 0);
          if (!rec) throw new Error('The answer needs a "recommendedUsd" number.');
          update((t) => ({
            ...t,
            account: { ...t.account, priceUsd: rec },
            logs: [
              ...t.logs,
              {
                id: `l_${Date.now().toString(36)}`,
                at: new Date().toISOString(),
                kind: "note",
                language: "",
                raw: JSON.stringify(parsed, null, 2),
                summary: `${String(root.rationale ?? "Price benchmarked.")}`,
                mood: "unknown",
                swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
                followUps: [],
                actions: [],
              },
            ],
          }));
          toast(`Price set to ${usd(rec)} (${toman(rec, rialPerUsd)}). The reasoning is saved in the log.`);
        }}
      />
    </div>
  );
};

export default GoalsTab;
