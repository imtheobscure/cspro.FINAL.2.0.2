"use client";

import { useMemo, useState } from "react";
import { href, navigate } from "@/lib/route";
import { UNITS, UNIT_MAP, WORDS, label, unitTheme } from "@/lib/data";
import { t } from "@/lib/data/phrases";
import { buildLesson, hasCustomLesson, type LessonStage } from "@/lib/data/lessons";
import { useTutor, type Mode } from "@/lib/store";
import { useSetup } from "@/lib/useSetup";
import { useVoice } from "@/lib/useSpeech";
import { ArtTile } from "@/components/ui/ArtTile";
import { BigButton, Chip } from "@/components/ui/Kit";
import { IconArrowLeft, IconArrowRight, IconSpeaker, IconStar } from "@/components/ui/Icons";
import { sfxTap } from "@/lib/sfx";

/**
 * THE LESSON PLAN — the screen a tutor teaches from.
 *
 * LearnLoop's eleven modes are the child's side of the lesson; this is the
 * tutor's. It shows the plan for ONE unit as a timed run of stages and steps:
 * what to say out loud, the concept-check question to ask, what to expect back
 * and what to physically do. Every script, question and word is a button that
 * reads itself aloud in the language being taught, so the tutor can keep their
 * eyes on the child instead of the screen.
 *
 * The plan arrives two ways and the screen shows which one is in use:
 *   · GENERATED — LearnLoop writes it from the unit's own words, CCQs, drills and
 *     theme chant (lib/data/lessons.ts), so every unit has one out of the box.
 *   · YOURS — the tutor pasted a plan from an external AI on the 📋 AI Prompt &
 *     JSON screen. It layers over the generated one and keeps the unit's words,
 *     so switching language or editing the theme never leaves it stale.
 */

/** Stage colours, mirrored from the theme palette (lib/data/lessons.ts). */
const STAGE_COLOR: Record<string, string> = {
  "les.warmup": "#f5c453",
  "les.learn": "#7fb2de",
  "les.talk": "#e86a8a",
  "les.practise": "#8fbe9b",
  "les.chant": "#b394d6",
  "les.wrap": "#35302a",
};

const MODE_ICON: Partial<Record<Mode, string>> = {
  learn: "🃏",
  talk: "💬",
  listen: "👂",
  quiz: "❓",
  match: "🧲",
  memory: "🂠",
  sort: "🗂️",
  chant: "🎵",
  opposites: "↔️",
  numbers: "🔢",
  abc: "🔤",
};

export function LessonScreen({ unitId: wanted }: { unitId?: string } = {}) {
  const homeLang = useTutor((s) => s.homeLang);
  const targetLang = useTutor((s) => s.targetLang);
  const mono = useTutor((s) => s.mono);
  const unitIds = useTutor((s) => s.unitIds);
  const setMode = useTutor((s) => s.setMode);
  const patch = useTutor((s) => s.patch);
  const { say, sayWord } = useVoice();

  // Which unit this lesson is for. A 📚 link carries the unit in the hash (that is
  // how the installed-plan list hands one over); otherwise it starts on whatever
  // the tutor already picked on the play screen, and follows the dock from then on.
  const [chosen, setChosen] = useState<string | null>(null);
  const unitId =
    (chosen && UNIT_MAP[chosen] ? chosen : undefined) ??
    (wanted && UNIT_MAP[wanted] ? wanted : undefined) ??
    unitIds.find((id) => UNIT_MAP[id]) ??
    UNITS[0]?.id ??
    "";
  const theme = unitTheme(unitId);

  const plan = useMemo(() => buildLesson(unitId, targetLang, mono), [unitId, targetLang, mono]);
  const [stage, setStage] = useState(0);
  const [done, setDone] = useState<Record<string, boolean>>({});

  if (!plan) {
    return (
      <div className="mx-auto max-w-[1400px] px-6 py-16 text-center">
        <div className="font-display text-4xl font-extrabold text-inksoft">{t("les.noplan", homeLang)}</div>
        <a href={href.play} className="mt-4 inline-block text-xl font-extrabold text-sky underline">
          {t("nav.play", homeLang)}
        </a>
      </div>
    );
  }

  const st: LessonStage = plan.stages[Math.min(stage, plan.stages.length - 1)] ?? plan.stages[0];
  const totalSteps = plan.stages.reduce((a, x) => a + x.steps.length, 0);
  const doneCount = Object.values(done).filter(Boolean).length;
  const mine = hasCustomLesson(unitId);

  /** Open the unit in Play, in a given mode — the hand-off from plan to game. */
  const openUnit = (mode?: Mode) => {
    sfxTap();
    patch({ unitIds: [unitId], wordIds: [] });
    if (mode) setMode(mode);
    navigate(href.play);
  };

  const copyPlan = async () => {
    const lines: string[] = [
      `${plan.unit.icon} ${t("les.title", "en")} — ${t(plan.unit.name, "en")} (${t(plan.themeNameKey, "en")})`,
      `${plan.totalMinutes} min · ${plan.stages.length} stages · ${totalSteps} steps`,
      "",
      `${t("les.objectives", "en")}:`,
      ...plan.objectives.map((o) => `  - ${o}`),
      `${t("les.materials", "en")}: ${plan.materials.join(", ")}`,
      `${t("les.vocab", "en")}: ${plan.vocab.map((w) => label(w, "en")).join(", ")}`,
      "",
    ];
    plan.stages.forEach((s) => {
      lines.push(`## ${s.icon} ${t(s.key, "en")} (${s.steps.reduce((a, x) => a + x.minutes, 0)} min)`);
      s.steps.forEach((step) => {
        lines.push(`  [${step.minutes} min]`);
        if (step.script) lines.push(`    ${t("les.script", "en")}: ${step.script}`);
        if (step.ccq) lines.push(`    CCQ: ${step.ccq}`);
        if (step.expected) lines.push(`    ${t("les.expected", "en")}: ${step.expected}`);
        if (step.action) lines.push(`    ${t("les.action", "en")}: ${step.action}`);
      });
    });
    lines.push("", `${t("les.extension", "en")}: ${plan.extension}`);
    lines.push(`${t("les.review", "en")}: ${plan.review.join(" · ")}`);
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
      document.body.removeChild(ta);
    }
  };

  return (
    <div className="dot-grid min-h-screen bg-transparent pb-24">
      <header className="border-b-4 border-sand bg-paper/90 px-4 py-3">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3">
          <a href={href.home} className="soft-ring rounded-full bg-cream px-4 py-2 text-lg font-extrabold text-inksoft hover:bg-sand">
            <IconArrowLeft size={18} className="mr-1 inline align-[-3px]" /> {t("nav.home", homeLang)}
          </a>
          <a href={href.play} className="soft-ring rounded-full bg-cream px-4 py-2 text-lg font-extrabold text-inksoft hover:bg-sand">
            🎈 {t("nav.play", homeLang)}
          </a>
          <a href={href.teacher} className="soft-ring rounded-full bg-cream px-4 py-2 text-lg font-extrabold text-inksoft hover:bg-sand">
            📊 {t("nav.teacher", homeLang)}
          </a>
          <a href={href.pack} className="soft-ring rounded-full bg-cream px-4 py-2 text-lg font-extrabold text-inksoft hover:bg-sand">
            📋 {t("les.newplan", homeLang)}
          </a>
          <a href={href.voices} className="soft-ring rounded-full bg-cream px-4 py-2 text-lg font-extrabold text-inksoft hover:bg-sand">
            🎤 {t("ui.voice", homeLang)}
          </a>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6">
        {/* ── which unit, and what this plan is ── */}
        <section className="rounded-[2.2rem] bg-paper p-6 tile-shadow">
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-[1.3rem] text-4xl" style={{ background: theme?.soft ?? "#eef4fb" }}>
              {plan.unit.icon}
            </span>
            <div className="min-w-[260px]">
              <h1 className="font-display text-4xl leading-none font-extrabold">{t("les.title", homeLang)}</h1>
              <p className="mt-1 text-xl font-bold text-inksoft">
                {t(plan.unit.name, homeLang)} · {t(plan.themeNameKey, homeLang)}
              </p>
            </div>

            <label className="flex flex-col text-lg font-bold text-ink">
              {t("les.for", homeLang)}
              <select
                value={unitId}
                onChange={(e) => {
                  sfxTap();
                  setChosen(e.target.value);
                  setStage(0);
                  setDone({});
                }}
                className="mt-1 rounded-2xl border-2 border-line bg-cream px-4 py-2 text-lg font-bold text-ink outline-none"
              >
                {UNITS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.icon} {t(u.name, "en")} · {u.words.length}
                  </option>
                ))}
              </select>
            </label>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-cream px-5 py-2 text-lg font-extrabold text-inksoft">
                ⏱ {plan.totalMinutes} {t("les.min", homeLang)}
              </span>
              <span className="flex items-center gap-2 rounded-full bg-sunsoft px-5 py-2">
                <IconStar size={22} />
                <span className="font-display text-xl font-extrabold">
                  {doneCount}/{totalSteps}
                </span>
              </span>
            </div>
          </div>

          <p className="mt-4 text-lg font-semibold text-inksoft">
            {mine ? `🤖 ${t("les.fromai", homeLang)}` : `🧠 ${t("les.generated", homeLang)}`}{" "}
            <a href={href.pack} className="font-extrabold text-sky underline">
              {t("les.newplan", homeLang)}
            </a>
          </p>
        </section>

        {/* ── objectives, materials, target words ── */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-[2.2rem] bg-paper p-6 tile-shadow">
            <h2 className="mb-3 font-display text-2xl font-extrabold">🎯 {t("les.objectives", homeLang)}</h2>
            <ul className="flex flex-col gap-2">
              {plan.objectives.map((o) => (
                <li key={o} className="flex gap-2 text-lg font-semibold text-ink">
                  <span style={{ color: theme?.color ?? "#7fb2e5" }}>✦</span>
                  {o}
                </li>
              ))}
            </ul>
            <h2 className="mt-5 mb-2 font-display text-2xl font-extrabold">🧺 {t("les.materials", homeLang)}</h2>
            <div className="flex flex-wrap gap-2">
              {plan.materials.map((m) => (
                <Chip key={m}>{m}</Chip>
              ))}
            </div>
          </section>

          <section className="rounded-[2.2rem] bg-paper p-6 tile-shadow">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl font-extrabold">
                🔑 {t("les.vocab", homeLang)} · {plan.vocab.length}
              </h2>
              <BigButton size="sm" variant="paper" className="ml-auto" onClick={() => openUnit()}>
                {t("nav.play", homeLang)} <IconArrowRight size={16} />
              </BigButton>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {plan.vocab.map((w) => (
                <button
                  key={w.id}
                  onClick={() => void sayWord(w, targetLang, homeLang, mono)}
                  className="soft-ring flex cursor-pointer flex-col items-center gap-1 rounded-[1.1rem] bg-cream p-2 hover:bg-sand"
                >
                  <ArtTile word={w} size={52} />
                  <span className="text-center text-sm leading-tight font-extrabold">{label(w, targetLang)}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* ── the stages ── */}
        <div className="flex flex-wrap gap-2">
          {plan.stages.map((x, i) => (
            <button
              key={x.key + i}
              onClick={() => {
                sfxTap();
                setStage(i);
              }}
              className={`soft-ring flex cursor-pointer items-center gap-2 rounded-full border-b-4 border-sand px-5 py-2.5 text-lg font-extrabold transition ${
                i === stage ? "text-white" : "bg-paper text-inksoft"
              }`}
              style={i === stage ? { background: x.color || STAGE_COLOR[x.key] || theme?.color } : undefined}
            >
              <span className="text-xl">{x.icon}</span>
              {t(x.key, homeLang)}
              <span className={`text-xs ${i === stage ? "opacity-70" : "opacity-40"}`}>
                {x.steps.reduce((a, y) => a + y.minutes, 0)}′
              </span>
            </button>
          ))}
        </div>

        {/* ── the steps: what the tutor actually does ── */}
        <div className="flex flex-col gap-3">
          {st.steps.map((step, i) => {
            const key = `${stage}:${i}`;
            const on = Boolean(done[key]);
            const wordsHere = (step.wordIds ?? [])
              .map((id) => WORDS.find((w) => w.id === id))
              .filter((w): w is (typeof WORDS)[number] => Boolean(w));
            return (
              <div
                key={key}
                className={`rounded-[1.8rem] border-l-[10px] bg-paper p-5 tile-shadow transition ${on ? "opacity-60" : ""}`}
                style={{ borderLeftColor: st.color || STAGE_COLOR[st.key] || theme?.color }}
              >
                <div className="flex flex-wrap items-start gap-4">
                  <button
                    onClick={() => {
                      sfxTap();
                      setDone((c) => ({ ...c, [key]: !c[key] }));
                    }}
                    className={`soft-ring grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-2xl font-display text-xl font-extrabold ${
                      on ? "bg-sage text-white" : "bg-cream text-inksoft"
                    }`}
                    title={t("les.step", homeLang)}
                  >
                    {on ? "✓" : i + 1}
                  </button>

                  <div className="min-w-[220px] flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-cream px-3 py-0.5 text-base font-extrabold text-inksoft">
                        {step.minutes} {t("les.min", homeLang)}
                      </span>
                      {step.ccq && <span className="rounded-full bg-plumsoft px-3 py-0.5 text-base font-extrabold text-plum">CCQ</span>}
                    </div>

                    {step.script && (
                      <button
                        onClick={() => void say(step.script!, targetLang)}
                        className="soft-ring mb-1 flex cursor-pointer items-start gap-2 rounded-xl px-1 text-left"
                        title={t("les.sayit", homeLang)}
                      >
                        <IconSpeaker size={20} className="mt-1 shrink-0" style={{ color: theme?.color }} />
                        <span className="font-display text-3xl font-extrabold" style={{ color: theme?.color }}>
                          “{step.script}”
                        </span>
                      </button>
                    )}
                    {step.ccq && (
                      <button
                        onClick={() => void say(step.ccq!, targetLang)}
                        className="soft-ring flex cursor-pointer items-center gap-2 rounded-xl px-1 text-left"
                        title={t("les.sayit", homeLang)}
                      >
                        <IconSpeaker size={18} className="shrink-0 text-plum" />
                        <span className="text-2xl font-extrabold text-plum">{step.ccq}</span>
                      </button>
                    )}
                    {step.action && <div className="mt-1 text-xl leading-snug font-semibold text-ink">{step.action}</div>}
                    {step.expected && (
                      <div className="mt-1 text-lg font-bold text-inksoft">
                        👶 {t("les.expected", homeLang)}: <span className="text-ink">{step.expected}</span>
                      </div>
                    )}
                  </div>

                  {wordsHere.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {wordsHere.map((w) => (
                        <button
                          key={w.id}
                          onClick={() => void sayWord(w, targetLang, homeLang, mono)}
                          className="soft-ring grid cursor-pointer place-items-center rounded-2xl bg-cream p-1.5"
                          title={label(w, targetLang)}
                        >
                          <ArtTile word={w} size={58} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── hand-off to the game, and the wrap-up ── */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-[2.2rem] bg-paper p-6 tile-shadow">
            <h2 className="mb-3 font-display text-2xl font-extrabold">🎲 {t("les.play", homeLang)}</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {plan.linkedModes.map((m) => (
                <button
                  key={m}
                  onClick={() => openUnit(m as Mode)}
                  className="soft-ring flex cursor-pointer items-center gap-3 rounded-[1.3rem] bg-cream p-3 text-left hover:bg-sand"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl text-2xl" style={{ background: theme?.soft ?? "#eef4fb" }}>
                    {MODE_ICON[m as Mode] ?? "🎮"}
                  </span>
                  <span className="font-display text-lg font-extrabold">{t(`mode.${m}`, homeLang)}</span>
                  <IconArrowRight size={18} className="ml-auto text-inksoft" />
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[2.2rem] bg-paper p-6 tile-shadow">
            <h2 className="mb-3 font-display text-2xl font-extrabold">🔁 {t("les.review", homeLang)}</h2>
            <div className="flex flex-wrap gap-2">
              {plan.review.map((r, i) => (
                <button
                  key={i}
                  onClick={() => void say(r, targetLang)}
                  className="soft-ring cursor-pointer rounded-full px-4 py-2 text-xl font-extrabold text-white"
                  style={{ background: theme?.color ?? "#7fb2e5" }}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-sunsoft px-5 py-3">
              <div className="font-display text-xl font-extrabold text-sun">⭐ {t("les.extension", homeLang)}</div>
              <div className="mt-1 text-lg font-semibold text-ink">{plan.extension}</div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <BigButton size="md" variant="paper" onClick={() => void copyPlan()}>
                📋 {t("les.copy", homeLang)}
              </BigButton>
              <BigButton size="md" variant="coral" onClick={() => window.print()}>
                🖨️ {t("les.print", homeLang)}
              </BigButton>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
