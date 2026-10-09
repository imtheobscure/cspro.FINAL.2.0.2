"use client";

import { useEffect, useMemo, useState } from "react";
import { themeOfSubtheme } from "@/data/dictionary";
import { LANGS } from "@/data/languages";
import { ph } from "@/data/ui-phrases";
import type { LangCode } from "@/data/types";
import { href } from "@/lib/route";
import { buildLesson, hasCustomLesson, teachableSets, type LessonPlan, type LessonStage } from "@/lib/lessons";
import { reinstallSavedLessons } from "@/lib/customPack";
import { MODES, type ModeId } from "@/lib/studio";
import { sfx } from "@/lib/sfx";
import { speak } from "@/lib/tts";
import { BigButton, Chip } from "@/components/ui/BigButton";
import { LogoMark } from "@/components/ui/Logo";

/**
 * THE LESSON PLAN — the screen a tutor teaches from.
 *
 * BiliBuddies' eight modes are the child's side of the lesson; this is the
 * tutor's. It shows the plan for ONE word set as a timed run of stages and steps:
 * what to say out loud, the concept-check question to ask, what to expect back
 * and what to physically do.
 *
 * Every script, question, target word and review item is a button that reads
 * itself aloud in the language being taught, so the tutor can keep their eyes on
 * the child instead of the screen.
 *
 * The plan arrives two ways and the screen says which one is in use:
 *   · BiliBuddies writes it itself from the set's own words, the theme's own
 *     chant and the question bank in data/talk.ts (lib/lessons.ts), so every word
 *     set has one out of the box.
 *   · Or the tutor pasted their own plan from an external AI on the 📋 AI Prompt
 *     & JSON screen. It layers over the generated one and keeps the set's words,
 *     so switching language never leaves it stale.
 */

const LANGS_KEY = "bilibuddies.lessonLangs.v1";

type Langs = { target: LangCode; support: LangCode | "none" };

/** The languages this screen reads aloud in — remembered between visits. */
function readLangs(fallback: Langs): Langs {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(LANGS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Langs>;
    return {
      target: LANGS.some((l) => l.id === parsed.target) ? (parsed.target as LangCode) : fallback.target,
      support:
        parsed.support === "none" || LANGS.some((l) => l.id === parsed.support)
          ? (parsed.support as LangCode | "none")
          : fallback.support,
    };
  } catch {
    return fallback;
  }
}

function writeLangs(v: Langs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LANGS_KEY, JSON.stringify(v));
  } catch {
    /* private mode — the choice still holds for this session */
  }
}

export function LessonScreen({ setId }: { setId?: string }) {
  const sets = useMemo(() => teachableSets(), []);
  const [chosen, setChosen] = useState<string | null>(null);
  const subthemeId =
    (chosen && sets.some((s) => s.id === chosen) ? chosen : undefined) ?? setId ?? sets[0]?.id ?? "";

  const [langs, setLangs] = useState<Langs>(() => readLangs({ target: "en", support: "en" }));

  // Pasted plans live in localStorage; re-attaching them here as well as on boot
  // means a tutor who jumps straight to this screen still sees their own plan.
  useEffect(() => {
    reinstallSavedLessons();
  }, []);

  useEffect(() => {
    writeLangs(langs);
  }, [langs]);

  const plan: LessonPlan | null = useMemo(
    () => (subthemeId ? buildLesson(subthemeId, langs.target, langs.support) : null),
    [subthemeId, langs.target, langs.support],
  );

  const [stage, setStage] = useState(0);
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setStage(0);
    setDone({});
  }, [subthemeId, langs.target]);

  if (!plan) {
    return (
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-6 py-10">
        <header className="flex flex-wrap items-center gap-3">
          <a href={href.home} className="pressable flex items-center gap-2 rounded-full border-2 border-line bg-white px-5 py-2.5">
            <LogoMark size={28} />
            <span className="display text-[1.05rem] font-extrabold text-ink">← BiliBuddies</span>
          </a>
        </header>
        <section className="sticker sticker-lg p-8 text-center">
          <div className="text-[3rem]">📚</div>
          <h1 className="display mt-2 text-[1.7rem] font-extrabold text-ink">{ph("noPlan", langs.target)}</h1>
        </section>
      </div>
    );
  }

  const theme = themeOfSubtheme(subthemeId);
  const st: LessonStage = plan.stages[Math.min(stage, plan.stages.length - 1)] ?? plan.stages[0];
  const totalSteps = plan.stages.reduce((a, x) => a + x.steps.length, 0);
  const doneCount = Object.values(done).filter(Boolean).length;
  const mine = hasCustomLesson(subthemeId);
  const support = langs.support !== "none" && langs.support !== langs.target ? langs.support : null;

  /** Read a line aloud in the language being taught — the tutor keeps their eyes on the child. */
  const sayIn = (text: string, lang?: LangCode) => {
    sfx.tap();
    void speak(text, { lang: lang ?? langs.target, kind: "kid" });
  };

  /** Hand the word set to the studio in one mode — plan → play. */
  const openInStudio = (mode?: ModeId) => {
    sfx.pop();
    window.location.hash = href.studio(theme.id, subthemeId, mode).replace(/^#/, "");
  };

  const copyPlan = async () => {
    const lines: string[] = [
      `${plan.subtheme.emoji} ${ph("lesson", "en")} — ${plan.subtheme.t.en} (${theme.t.en})`,
      `${plan.totalMinutes} ${ph("minutes", "en")} · ${plan.stages.length} ${ph("stages", "en")} · ${totalSteps} ${ph("steps", "en")}`,
      "",
      `${ph("objectives", "en")}:`,
      ...plan.objectives.map((o) => `  - ${o}`),
      `${ph("materials", "en")}: ${plan.materials.join(", ")}`,
      `${ph("vocabList", "en")}: ${plan.vocab.map((w) => w.t.en).join(", ")}`,
      "",
    ];
    for (const x of plan.stages) {
      lines.push(`## ${x.icon} ${x.title.en} (${x.steps.reduce((a, y) => a + y.minutes, 0)} min)`);
      for (const step of x.steps) {
        lines.push(`  [${step.minutes} min]`);
        if (step.script) lines.push(`    ${ph("script", "en")}: ${step.script}`);
        if (step.ccq) lines.push(`    CCQ: ${step.ccq}`);
        if (step.expected) lines.push(`    ${ph("expected", "en")}: ${step.expected}`);
        if (step.action) lines.push(`    ${ph("action", "en")}: ${step.action}`);
      }
    }
    lines.push("", `${ph("extension", "en")}: ${plan.extension}`);
    lines.push(`${ph("review", "en")}: ${plan.review.join(" · ")}`);
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
    sfx.correct();
  };

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center gap-3">
        <a href={href.home} className="pressable flex items-center gap-2 rounded-full border-2 border-line bg-white px-5 py-2.5">
          <LogoMark size={28} />
          <span className="display text-[1.05rem] font-extrabold text-ink">← BiliBuddies</span>
        </a>
        <a href={href.studio(theme.id, subthemeId)} className="pressable display rounded-full border-2 border-line bg-white px-5 py-2.5 text-[1.05rem] font-extrabold text-inksoft">
          🎛 {ph("openInGame", langs.target)}
        </a>
        <a href={href.pack} className="pressable display ml-auto rounded-full border-2 border-line bg-white px-5 py-2.5 text-[1.05rem] font-extrabold text-inksoft">
          📋 {ph("newPlan", langs.target)}
        </a>
      </header>

      {/* ── which word set, and what this plan is ── */}
      <section className="sticker sticker-lg flex flex-wrap items-center gap-5 p-7">
        <span className="grid h-[68px] w-[68px] place-items-center rounded-3xl text-[2.2rem]" style={{ background: theme.soft }}>
          {plan.subtheme.emoji}
        </span>
        <div className="min-w-[260px]">
          <h1 className="display text-[clamp(1.7rem,3vw,2.4rem)] font-extrabold leading-none text-ink">
            📚 {ph("lesson", langs.target)}
          </h1>
          <p className="mt-1 text-[1.05rem] font-bold text-inksoft">
            {ph("planFor", langs.target).replace("{t}", plan.subtheme.t[langs.target] || plan.subtheme.t.en)} ·{" "}
            {theme.emoji} {theme.t[langs.target] || theme.t.en}
          </p>
        </div>

        <label className="display text-[0.95rem] font-bold text-ink">
          {ph("lessonFor", langs.target)}
          <select
            value={subthemeId}
            onChange={(e) => {
              sfx.tap();
              setChosen(e.target.value);
            }}
            className="mt-1 block max-w-[320px] rounded-2xl border-2 border-line bg-white px-4 py-2 text-[1rem] font-bold outline-none"
          >
            {sets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.emoji} {s.t.en} · {s.words.length}
              </option>
            ))}
          </select>
        </label>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <span className="rounded-2xl bg-cream px-4 py-2 text-[1.05rem] font-extrabold text-ink">
            ⏱ {plan.totalMinutes} {ph("minutes", langs.target)}
          </span>
          <span className="rounded-2xl bg-sun/60 px-4 py-2 text-[1.05rem] font-extrabold text-ink">
            ⭐ {doneCount}/{totalSteps}
          </span>
        </div>

        {/* the two languages this screen reads and writes in */}
        <div className="flex w-full flex-wrap items-center gap-3">
          <span className="display text-[0.95rem] font-bold text-ink">{ph("teachIn", langs.target)}</span>
          <div className="flex flex-wrap gap-1.5">
            {LANGS.map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  sfx.tap();
                  setLangs((c) => ({ ...c, target: l.id, support: c.support === l.id ? "none" : c.support }));
                }}
                className={`display rounded-full border-2 px-3.5 py-1.5 text-[0.95rem] font-extrabold ${
                  langs.target === l.id ? "border-ink bg-ink text-white" : "border-line bg-white text-inksoft"
                }`}
                title={l.native}
              >
                {l.flag} {l.native}
              </button>
            ))}
          </div>
          <span className="display ml-2 text-[0.95rem] font-bold text-ink">{ph("bridge", langs.target)}</span>
          <Chip active={langs.support === "none"} onClick={() => setLangs((c) => ({ ...c, support: "none" }))}>
            {ph("none", langs.target)}
          </Chip>
          {LANGS.filter((l) => l.id !== langs.target).map((l) => (
            <Chip key={l.id} active={langs.support === l.id} onClick={() => setLangs((c) => ({ ...c, support: l.id }))}>
              {l.flag} {l.native}
            </Chip>
          ))}
        </div>

        <p className="w-full text-[1rem] font-semibold text-inksoft">
          {mine ? `🤖 ${ph("yourPlan", langs.target)}` : `🧠 ${ph("generatedPlan", langs.target)}`}{" "}
          <a href={href.pack} className="font-extrabold text-ink underline">
            {ph("newPlan", langs.target)}
          </a>
        </p>
      </section>

      {/* ── objectives, materials, target words ── */}
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="sticker flex flex-col gap-3 p-6">
          <h2 className="display text-[1.5rem] font-extrabold text-ink">🎯 {ph("objectives", langs.target)}</h2>
          <ul className="flex flex-col gap-1.5">
            {plan.objectives.map((o) => (
              <li key={o} className="flex gap-2 text-[1.05rem] font-semibold text-ink">
                <span style={{ color: theme.color }}>✦</span>
                {o}
              </li>
            ))}
          </ul>
          <h2 className="display mt-2 text-[1.5rem] font-extrabold text-ink">🧺 {ph("materials", langs.target)}</h2>
          <div className="flex flex-wrap gap-2">
            {plan.materials.map((m) => (
              <span key={m} className="rounded-2xl bg-cream px-3.5 py-1.5 text-[0.95rem] font-bold text-inksoft">
                {m}
              </span>
            ))}
          </div>
        </section>

        <section className="sticker flex flex-col gap-3 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="display text-[1.5rem] font-extrabold text-ink">
              🔑 {ph("vocabList", langs.target)} · {plan.vocab.length}
            </h2>
            <BigButton variant="sky" size="sm" className="ml-auto" onClick={() => openInStudio()}>
              {ph("openInGame", langs.target)} →
            </BigButton>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {plan.vocab.map((w) => (
              <button
                key={w.id}
                onClick={() => sayIn(w.t[langs.target] || w.t.en)}
                title={ph("readAloud", langs.target)}
                className="pressable no-select flex flex-col items-center gap-1 rounded-2xl border-2 border-line bg-white p-2"
              >
                <span className="text-[2rem]">{w.emoji}</span>
                <span className="text-center text-[0.9rem] font-extrabold leading-tight text-ink">
                  {w.t[langs.target] || w.t.en}
                </span>
                {w.pinyin && langs.target === "zh" && <span className="text-[0.7rem] font-bold text-inksoft">{w.pinyin}</span>}
                {support && <span className="text-center text-[0.7rem] font-bold text-inksoft">{w.t[support]}</span>}
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
              sfx.tap();
              setStage(i);
            }}
            style={i === stage ? { background: x.color } : undefined}
            className={`pressable no-select display flex items-center gap-2 rounded-2xl border-2 px-4 py-2 text-[1rem] font-extrabold ${
              i === stage ? "border-transparent text-white" : "border-line bg-white text-inksoft"
            }`}
          >
            <span className="text-[1.3rem]">{x.icon}</span>
            {x.title[langs.target] || x.title.en}
            <span className={i === stage ? "opacity-80" : "opacity-50"}>
              {x.steps.reduce((a, y) => a + y.minutes, 0)}′
            </span>
          </button>
        ))}
      </div>

      {/* ── the steps: what the tutor actually does, in order ── */}
      <div className="flex flex-col gap-3">
        {st.steps.map((step, i) => {
          const key = `${stage}:${i}`;
          const on = Boolean(done[key]);
          const words = (step.wordIds ?? [])
            .map((id) => plan.vocab.find((w) => w.id === id) ?? plan.subtheme.words.find((w) => w.id === id))
            .filter((w): w is (typeof plan.subtheme.words)[number] => Boolean(w));

          return (
            <div
              key={key}
              className={`sticker flex flex-wrap items-start gap-4 p-5 transition ${on ? "opacity-60" : ""}`}
              style={{ borderLeft: `10px solid ${st.color}` }}
            >
              <button
                onClick={() => {
                  sfx.tap();
                  setDone((c) => ({ ...c, [key]: !c[key] }));
                }}
                title={ph("stepN", langs.target)}
                className={`display grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-2 text-[1.15rem] font-extrabold ${
                  on ? "border-transparent bg-mint text-white" : "border-line bg-white text-inksoft"
                }`}
              >
                {on ? "✓" : i + 1}
              </button>

              <div className="min-w-[240px] flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-2xl bg-cream px-3 py-0.5 text-[0.9rem] font-extrabold text-inksoft">
                    ⏱ {step.minutes} {ph("minutes", langs.target)}
                  </span>
                  {step.ccq && (
                    <span className="rounded-2xl bg-grape/25 px-3 py-0.5 text-[0.9rem] font-extrabold text-ink">CCQ</span>
                  )}
                </div>

                {step.script && (
                  <button
                    onClick={() => sayIn(step.script!)}
                    title={ph("readAloud", langs.target)}
                    className="pressable no-select mb-1 flex items-start gap-2 rounded-2xl px-1 text-left"
                  >
                    <span aria-hidden className="mt-1 text-[1.1rem]">
                      🔊
                    </span>
                    <span className="display text-[1.6rem] font-extrabold" style={{ color: theme.color }}>
                      “{step.script}”
                    </span>
                  </button>
                )}

                {step.ccq && (
                  <button
                    onClick={() => sayIn(step.ccq!)}
                    title={ph("readAloud", langs.target)}
                    className="pressable no-select flex items-center gap-2 rounded-2xl px-1 text-left"
                  >
                    <span aria-hidden className="text-[1.1rem]">
                      ❓
                    </span>
                    <span className="text-[1.25rem] font-extrabold text-ink">{step.ccq}</span>
                  </button>
                )}

                {step.action && (
                  <div className="mt-1 text-[1.05rem] font-semibold leading-snug text-inksoft">
                    <span className="mr-1">✋</span>
                    {step.action}
                  </div>
                )}

                {step.expected && (
                  <div className="mt-1 text-[1rem] font-bold text-inksoft">
                    👶 {ph("expected", langs.target)}: <span className="text-ink">{step.expected}</span>
                  </div>
                )}
              </div>

              {words.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {words.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => sayIn(w.t[langs.target] || w.t.en)}
                      title={w.t[langs.target] || w.t.en}
                      className="pressable no-select flex flex-col items-center rounded-2xl border-2 border-line bg-white px-2.5 py-1.5"
                    >
                      <span className="text-[1.6rem]">{w.emoji}</span>
                      <span className="text-[0.75rem] font-extrabold text-ink">{w.t[langs.target] || w.t.en}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── hand-off to the studio, then the wrap-up ── */}
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="sticker flex flex-col gap-3 p-6">
          <h2 className="display text-[1.5rem] font-extrabold text-ink">🎮 {ph("openInGame", langs.target)}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {MODES.filter((m) => plan.linkedModes.includes(m.id) || m.id === "learn").map((m) => (
              <button
                key={m.id}
                onClick={() => openInStudio(m.id)}
                className="pressable no-select flex flex-wrap items-center gap-3 rounded-2xl border-2 border-line bg-white p-3 text-left"
              >
                <span className="grid h-11 w-11 place-items-center rounded-2xl text-[1.5rem]" style={{ background: theme.soft }}>
                  {m.emoji}
                </span>
                <span className="display text-[1.05rem] font-extrabold text-ink">{m.label}</span>
                <span className="ml-auto text-inksoft">→</span>
              </button>
            ))}
          </div>
        </section>

        <section className="sticker flex flex-col gap-3 p-6">
          <h2 className="display text-[1.5rem] font-extrabold text-ink">🔁 {ph("review", langs.target)}</h2>
          <div className="flex flex-wrap gap-2">
            {plan.review.map((r, i) => (
              <button
                key={i}
                onClick={() => sayIn(r)}
                className="pressable no-select display rounded-2xl border-b-[5px] border-transparent bg-ink px-4 py-2 text-[1.05rem] font-extrabold text-white"
              >
                {r}
              </button>
            ))}
          </div>
          <div className="rounded-2xl bg-sun/40 px-4 py-3">
            <div className="display text-[1.05rem] font-extrabold text-ink">⭐ {ph("extension", langs.target)}</div>
            <div className="mt-1 text-[1rem] font-semibold text-inksoft">{plan.extension}</div>
          </div>
          <div className="flex flex-wrap gap-3">
            <BigButton variant="grape" size="md" onClick={() => void copyPlan()}>
              📋 {ph("copyPlan", langs.target)}
            </BigButton>
            <BigButton variant="soft" size="md" onClick={() => window.print()}>
              🖨️ {ph("printPlan", langs.target)}
            </BigButton>
          </div>
          <p className="text-[0.95rem] font-semibold text-inksoft">{ph("planHint", langs.target)}</p>
        </section>
      </div>
    </div>
  );
}
