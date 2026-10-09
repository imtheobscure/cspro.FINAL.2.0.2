"use client";

import { useEffect, useMemo, useState } from "react";
import { ACTIVITIES, LANGS, type Activity, type Lang } from "@/lib/types";
import { LANG_META, ui } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { useCatalogue, themeIn } from "@/lib/catalogue";
import { href, navigate } from "@/lib/route";
import { buildLesson, hasCustomLesson, type LessonPlan, type LessonStage } from "@/lib/lessons";
import { reinstallSavedLessons } from "@/lib/customPack";
import { BackLink, BigButton } from "./ui";
import { sfx } from "@/lib/sfx";
import { speak } from "@/lib/tts";

/**
 * THE LESSON PLAN — the screen a tutor teaches from.
 *
 * WordPop's six activities are the child's side of the lesson; this is the
 * tutor's. It shows the plan for ONE topic as a timed run of stages and steps:
 * what to say out loud, the concept-check question to ask, what to expect back
 * and what to physically do.
 *
 * Every script, question, target word and review item is a button that reads
 * itself aloud in the language being taught, so the tutor can keep their eyes
 * on the child instead of the screen.
 *
 * The plan arrives two ways and the screen says which one is in use:
 *   · WordPop writes it itself from the topic's own words, concept-check
 *     questions and chant (lib/lessons.ts), so every topic has one out of the box.
 *   · Or the tutor pasted their own plan from an external AI on the 📋 AI
 *     Prompt & JSON screen. It layers over the generated one and keeps the
 *     topic's words, so switching language never leaves it stale.
 */

const ACTIVITY_ICON: Partial<Record<Activity, string>> = {
  learn: "💬",
  chant: "🎵",
  match: "🧩",
  memory: "🃏",
  quiz: "❓",
  listen: "👂",
};

export function LessonScreen({ themeId: wanted }: { themeId?: string }) {
  const s = useSettings();
  const catalogue = useCatalogue();

  // Pasted plans live in localStorage; re-attaching them here as well as on boot
  // means a tutor who jumps straight to this screen still sees their own plan.
  const [booted, setBooted] = useState(false);
  useEffect(() => {
    reinstallSavedLessons();
    setBooted(true);
  }, []);
  void booted;

  const themes = catalogue.themes;
  const [chosen, setChosen] = useState<string | null>(null);
  const themeId = (chosen && themeIn(catalogue, chosen) ? chosen : undefined) ?? wanted ?? "";
  const theme = themeIn(catalogue, themeId) ?? themes[0];

  const plan: LessonPlan | null = useMemo(
    () => (theme ? buildLesson(theme, s.target, s.support) : null),
    [theme, s.target, s.support],
  );

  const [stage, setStage] = useState(0);
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setStage(0);
    setDone({});
  }, [theme?.id, s.target]);

  if (!theme || !plan) {
    return (
      <div className="card-soft mx-auto max-w-xl px-6 py-10 text-center">
        <div className="text-6xl">📚</div>
        <h1 className="font-display mt-3 text-3xl font-bold">{ui(s.target, "noPlan")}</h1>
        <div className="mt-4 flex justify-center">
          <BigButton tone="sky" href={href.home}>← {ui(s.target, "pickTheme")}</BigButton>
        </div>
      </div>
    );
  }

  const st: LessonStage = plan.stages[Math.min(stage, plan.stages.length - 1)] ?? plan.stages[0];
  const totalSteps = plan.stages.reduce((a, x) => a + x.steps.length, 0);
  const doneCount = Object.values(done).filter(Boolean).length;
  const mine = hasCustomLesson(theme.id);
  const support = s.support !== "none" && s.support !== s.target ? s.support : null;

  /** Hand the topic to the game in one activity — plan → play. */
  const openInGame = (activity?: Activity) => {
    sfx.pop();
    const suffix = activity ? `/${activity}` : "";
    navigate(`${href.theme(theme.id)}${suffix}`);
  };

  /** Read a line aloud in the language being taught — the tutor keeps their eyes on the child. */
  const sayIn = (text: string) => {
    sfx.tick();
    void speak(text, s.target);
  };

  const copyPlan = async () => {
    const lines: string[] = [
      `${theme.emoji} ${ui("en", "lesson")} — ${theme.title.en}`,
      `${plan.totalMinutes} ${ui("en", "minutes")} · ${plan.stages.length} ${ui("en", "stages")} · ${totalSteps} ${ui("en", "step")}`,
      "",
      `${ui("en", "objectives")}:`,
      ...plan.objectives.map((o) => `  - ${o}`),
      `${ui("en", "materials")}: ${plan.materials.join(", ")}`,
      `${ui("en", "vocabList")}: ${plan.vocab.map((w) => w.t.en).join(", ")}`,
      "",
    ];
    for (const x of plan.stages) {
      lines.push(`## ${x.icon} ${x.title.en} (${x.steps.reduce((a, y) => a + y.minutes, 0)} min)`);
      for (const step of x.steps) {
        lines.push(`  [${step.minutes} min]`);
        if (step.script) lines.push(`    ${ui("en", "script")}: ${step.script}`);
        if (step.ccq) lines.push(`    CCQ: ${step.ccq}`);
        if (step.expected) lines.push(`    ${ui("en", "expected")}: ${step.expected}`);
        if (step.action) lines.push(`    ${ui("en", "action")}: ${step.action}`);
      }
    }
    lines.push("", `${ui("en", "extension")}: ${plan.extension}`);
    lines.push(`${ui("en", "review")}: ${plan.review.join(" · ")}`);
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    sfx.star();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <BackLink href={href.home} label={ui(s.target, "home")} />
        <BigButton tone="white" size="md" href={href.pack}>📋 {ui(s.target, "newPlan")}</BigButton>
        <BigButton tone="lilac" size="md" onClick={() => void copyPlan()}>📋 {ui(s.target, "copyPlan")}</BigButton>
        <BigButton tone="white" size="md" onClick={() => window.print()}>🖨️ {ui(s.target, "print")}</BigButton>
      </div>

      {/* ── which topic, and what this plan is ── */}
      <header className="card-soft px-6 py-6">
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-cream-2 text-4xl">{theme.emoji}</span>
          <div className="min-w-[240px]">
            <h1 className="font-display text-4xl font-bold leading-none">📚 {ui(s.target, "lesson")}</h1>
            <p className="mt-1 text-lg font-bold text-ink-soft">
              {ui(s.target, "planFor", { t: theme.title[s.target] ?? theme.title.en })}
            </p>
          </div>

          <label className="text-sm font-bold text-ink-soft">
            {ui(s.target, "lessonFor")}
            <select
              value={theme.id}
              onChange={(e) => {
                sfx.tick();
                setChosen(e.target.value);
              }}
              className="mt-1 block w-full max-w-xs rounded-xl border-2 border-ink/10 bg-cream px-3 py-2 text-base font-bold text-ink outline-none focus:border-sky"
            >
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.emoji} {t.title.en} · {t.words.length}
                </option>
              ))}
            </select>
          </label>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-cream-2 px-4 py-2 text-lg font-bold text-ink">
              ⏱ {plan.totalMinutes} {ui(s.target, "minutes")}
            </span>
            <span className="rounded-full bg-sun/60 px-4 py-2 text-lg font-bold text-ink">
              ⭐ {doneCount}/{totalSteps}
            </span>
          </div>
        </div>

        <p className="mt-3 text-base font-bold text-ink-soft">
          {mine ? `🤖 ${ui(s.target, "yourPlan")}` : `🧠 ${ui(s.target, "generatedPlan")}`}{" "}
          <a href={href.pack} className="font-bold text-ink underline" onClick={() => sfx.pop()}>
            {ui(s.target, "newPlan")}
          </a>
          {support && (
            <span className="ml-2">
              · 🏠 {LANG_META[support].flag} {LANG_META[support].native}
            </span>
          )}
        </p>
      </header>

      {/* ── objectives, materials, target words ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card-soft px-5 py-5">
          <h2 className="font-display text-2xl font-bold">🎯 {ui(s.target, "objectives")}</h2>
          <ul className="mt-2 space-y-1">
            {plan.objectives.map((o) => (
              <li key={o} className="flex gap-2 text-lg font-bold text-ink">
                <span className="text-sun">✦</span>
                {o}
              </li>
            ))}
          </ul>
          <h2 className="font-display mt-4 text-2xl font-bold">🧺 {ui(s.target, "materials")}</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {plan.materials.map((m) => (
              <span key={m} className="rounded-full bg-cream-2 px-3 py-1 text-sm font-bold text-ink">
                {m}
              </span>
            ))}
          </div>
        </section>

        <section className="card-soft px-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl font-bold">
              🔑 {ui(s.target, "vocabList")} · {plan.vocab.length}
            </h2>
            <BigButton tone="sky" size="sm" className="ml-auto" onClick={() => openInGame()}>
              {ui(s.target, "openInGame")} →
            </BigButton>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {plan.vocab.map((w) => (
              <button
                key={w.id}
                onClick={() => sayIn(w.t[s.target] ?? w.t.en)}
                title={ui(s.target, "readAloud")}
                className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl bg-cream-2 p-2 ring-1 ring-ink/5 transition-all hover:-translate-y-0.5 hover:bg-sun/40"
              >
                <span className="text-3xl">{w.emoji}</span>
                <span className="text-center text-sm leading-tight font-bold">{w.t[s.target] ?? w.t.en}</span>
                {support && <span className="text-center text-[11px] font-bold text-ink-soft">{w.t[support]}</span>}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* ── which stage ── */}
      <div className="flex flex-wrap gap-2">
        {plan.stages.map((x, i) => (
          <button
            key={x.title.en + i}
            onClick={() => {
              sfx.tick();
              setStage(i);
            }}
            className={`font-display flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-lg font-bold transition-all ${
              i === stage ? "btn-3d text-white" : "bg-white text-ink ring-1 ring-ink/10 hover:bg-cream-2"
            }`}
            style={i === stage ? { background: x.color } : undefined}
          >
            <span className="text-xl">{x.icon}</span>
            {x.title[s.target] ?? x.title.en}
            <span className={`text-xs ${i === stage ? "opacity-80" : "opacity-40"}`}>
              {x.steps.reduce((a, y) => a + y.minutes, 0)}′
            </span>
          </button>
        ))}
      </div>

      {/* ── the steps: what the tutor actually does, in order ── */}
      <div className="space-y-3">
        {st.steps.map((step, i) => {
          const key = `${stage}:${i}`;
          const on = Boolean(done[key]);
          const words = (step.wordIds ?? [])
            .map((id) => theme.words.find((w) => w.id === id))
            .filter((w): w is (typeof theme.words)[number] => Boolean(w));

          return (
            <div
              key={key}
              className={`card-soft px-5 py-4 transition ${on ? "opacity-55" : ""}`}
              style={{ borderLeft: `10px solid ${st.color}` }}
            >
              <div className="flex flex-wrap items-start gap-4">
                <button
                  onClick={() => {
                    sfx.tick();
                    setDone((c) => ({ ...c, [key]: !c[key] }));
                  }}
                  title={ui(s.target, "step")}
                  className={`font-display grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-2xl text-xl font-bold ${
                    on ? "bg-mint text-ink" : "bg-cream-2 text-ink-soft"
                  }`}
                >
                  {on ? "✓" : i + 1}
                </button>

                <div className="min-w-[220px] flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-cream-2 px-3 py-0.5 text-sm font-bold text-ink">
                      ⏱ {step.minutes} {ui(s.target, "minutes")}
                    </span>
                    {step.ccq && <span className="rounded-full bg-plum/25 px-3 py-0.5 text-sm font-bold text-ink">CCQ</span>}
                  </div>

                  {step.script && (
                    <button
                      onClick={() => sayIn(step.script!)}
                      title={ui(s.target, "readAloud")}
                      className="mb-1 flex cursor-pointer items-start gap-2 rounded-xl text-left hover:bg-cream-2"
                    >
                      <span aria-hidden className="mt-1 text-lg">🔊</span>
                      <span className="font-display text-2xl font-bold" style={{ color: st.color }}>
                        “{step.script}”
                      </span>
                    </button>
                  )}

                  {step.ccq && (
                    <button
                      onClick={() => sayIn(step.ccq!)}
                      title={ui(s.target, "readAloud")}
                      className="flex cursor-pointer items-center gap-2 rounded-xl text-left hover:bg-cream-2"
                    >
                      <span aria-hidden className="text-lg">❓</span>
                      <span className="text-xl font-bold text-ink">{step.ccq}</span>
                    </button>
                  )}

                  {step.action && (
                    <div className="mt-1 text-lg leading-snug font-bold text-ink-soft">
                      <span className="mr-1">✋</span>
                      {step.action}
                    </div>
                  )}

                  {step.expected && (
                    <div className="mt-1 text-base font-bold text-ink-soft">
                      👶 {ui(s.target, "expected")}: <span className="text-ink">{step.expected}</span>
                    </div>
                  )}
                </div>

                {words.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {words.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => sayIn(w.t[s.target] ?? w.t.en)}
                        title={w.t[s.target] ?? w.t.en}
                        className="flex cursor-pointer flex-col items-center rounded-2xl bg-cream-2 px-2 py-1 ring-1 ring-ink/5 hover:bg-sun/40"
                      >
                        <span className="text-2xl">{w.emoji}</span>
                        <span className="text-xs font-bold">{w.t[s.target] ?? w.t.en}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── hand-off to the game, then the wrap-up ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card-soft px-5 py-5">
          <h2 className="font-display text-2xl font-bold">🎮 {ui(s.target, "openInGame")}</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {ACTIVITIES.map((a) => (
              <button
                key={a}
                onClick={() => openInGame(a)}
                className="flex cursor-pointer items-center gap-3 rounded-2xl bg-cream-2 p-3 text-left transition-all hover:-translate-y-0.5 hover:bg-sun/40"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-2xl">{ACTIVITY_ICON[a] ?? "🎮"}</span>
                <span className="font-display text-lg font-bold text-ink">{ui(s.target, a)}</span>
                <span className="ml-auto text-ink-soft">→</span>
              </button>
            ))}
          </div>
        </section>

        <section className="card-soft px-5 py-5">
          <h2 className="font-display text-2xl font-bold">🔁 {ui(s.target, "review")}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {plan.review.map((r, i) => (
              <button
                key={i}
                onClick={() => sayIn(r)}
                className="cursor-pointer rounded-full bg-ink px-4 py-1.5 text-lg font-bold text-white transition-all hover:-translate-y-0.5"
              >
                {r}
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-2xl bg-sun/40 px-4 py-3">
            <div className="font-display text-lg font-bold text-ink">⭐ {ui(s.target, "extension")}</div>
            <div className="mt-1 text-base font-bold text-ink-soft">{plan.extension}</div>
          </div>
          <p className="mt-3 text-sm font-bold text-ink-soft">
            {LANGS.map((l: Lang) => LANG_META[l].flag).join(" ")} — {ui(s.target, "planHint")}
          </p>
        </section>
      </div>
    </div>
  );
}
