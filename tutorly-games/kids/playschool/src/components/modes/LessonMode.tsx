"use client";

import { useMemo, useState } from "react";
import { href } from "@/lib/route";
import { motion } from "framer-motion";
import { UNITS, WORD_MAP, label, unitTheme } from "@/lib/data";
import { t } from "@/lib/data/phrases";
import { buildLesson, type LessonStage } from "@/lib/data/lessons";
import { CHANT_MAP } from "@/lib/data/chants";
import type { Setup } from "@/lib/useSetup";
import { useFeedback } from "@/components/ui/Feedback";
import { ArtTile } from "@/components/ui/ArtTile";
import { BigButton, Chip } from "@/components/ui/Kit";
import { IconArrowRight, IconSpeaker, IconStar } from "@/components/ui/Icons";
import { sfxTap } from "@/lib/sfx";

const STAGE_COLOR: Record<string, string> = {
  "les.warmup": "#f5c453",
  "les.present": "#7fb2de",
  "les.practise": "#8fbe9b",
  "les.produce": "#e86a8a",
  "les.games": "#b394d6",
  "les.wrapup": "#35302a",
};

export function LessonMode({ s }: { s: Setup }) {
  const fb = useFeedback();
  const unitId = s.words.length ? s.unitIdOfWords : "body";
  const plan = useMemo(() => buildLesson(unitId, s.targetLang, s.mono), [unitId, s.targetLang, s.mono]);
  const [stage, setStage] = useState(0);
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  if (!plan) {
    return <div className="p-20 text-center font-display text-3xl font-extrabold text-inksoft">No lesson for this unit yet.</div>;
  }

  const st: LessonStage = plan.stages[Math.min(stage, plan.stages.length - 1)];
  const chant = CHANT_MAP[s.theme.chantId];
  const chantLines = chant?.lines[s.targetLang] ?? [];

  const totalTicks = plan.stages.reduce((a, x) => a + x.steps.length, 0);
  const doneTicks = Object.values(checked).filter(Boolean).length;

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-5">
      {/* header */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-16 w-16 place-items-center rounded-[1.3rem] text-4xl" style={{ background: s.theme.soft }}>
            {plan.unit.icon}
          </span>
          <div>
            <div className="font-display text-4xl leading-none font-extrabold">{t("les.plan", s.homeLang)}</div>
            <div className="text-xl font-bold text-inksoft">
              {t(plan.unit.name, s.homeLang)} · {t(plan.themeNameKey, s.homeLang)}
            </div>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="rounded-full bg-paper px-5 py-2 text-lg font-extrabold text-inksoft tile-shadow">
            ⏱ {plan.totalMinutes} {t("les.minutes", s.homeLang)}
          </div>
          <div className="flex items-center gap-2 rounded-full bg-sunsoft px-5 py-2">
            <IconStar size={22} className="text-sun" />
            <span className="font-display text-xl font-extrabold">
              {doneTicks}/{totalTicks}
            </span>
          </div>
        </div>
      </div>

      {/* objectives + vocab */}
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[2rem] bg-paper p-6 tile-shadow">
          <div className="mb-3 font-display text-2xl font-extrabold">🎯 {t("les.objectives", s.homeLang)}</div>
          <ul className="flex flex-col gap-2">
            {plan.objectives.map((o) => (
              <li key={o} className="flex gap-2 text-lg font-semibold text-ink">
                <span style={{ color: s.theme.color }}>✦</span>
                {o}
              </li>
            ))}
          </ul>
          <div className="mt-4 font-display text-2xl font-extrabold">🧺 {t("les.materials", s.homeLang)}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {plan.materials.map((m) => (
              <span key={m} className="rounded-full bg-cream px-3 py-1.5 text-base font-bold text-ink">
                {m}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] bg-paper p-6 tile-shadow">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-display text-2xl font-extrabold">
              🔑 {t("les.vocab", s.homeLang)} · {plan.vocab.length}
            </span>
            <a
              href={href.play}
              className="soft-ring rounded-full bg-cream px-3 py-1 text-base font-extrabold text-inksoft"
              onClick={() => sfxTap()}
            >
              {t("les.openUnit", s.homeLang)}
            </a>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {plan.vocab.map((w) => (
              <button
                key={w.id}
                onClick={() => void s.sayWord(w, s.targetLang, s.homeLang, s.mono)}
                className="soft-ring flex cursor-pointer flex-col items-center gap-1 rounded-[1.1rem] bg-cream p-2 hover:bg-sand"
              >
                <ArtTile word={w} size={52} color={s.theme.color} />
                <span className="text-center text-sm leading-tight font-extrabold">{label(w, s.targetLang)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* stage tabs */}
      <div className="flex flex-wrap gap-2">
        {plan.stages.map((x, i) => (
          <button
            key={x.key + i}
            onClick={() => (sfxTap(), setStage(i))}
            className={`soft-ring flex cursor-pointer items-center gap-2 rounded-full border-b-4 px-5 py-2.5 text-lg font-extrabold transition ${
              i === stage ? "text-white" : "bg-paper text-inksoft"
            }`}
            style={i === stage ? { background: STAGE_COLOR[x.key] ?? s.theme.color, borderBottomColor: "rgba(0,0,0,.15)" } : undefined}
          >
            <span className="text-xl">{x.icon}</span>
            {t(x.key, s.homeLang)}
            <span className={`text-xs ${i === stage ? "opacity-70" : "opacity-40"}`}>
              {x.steps.reduce((a, y) => a + y.minutes, 0)}′
            </span>
          </button>
        ))}
      </div>

      {/* steps */}
      <div className="flex flex-col gap-3">
        {st.steps.map((step, i) => {
          const key = stage * 100 + i;
          const on = Boolean(checked[key]);
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`rounded-[1.8rem] border-l-[10px] bg-paper p-5 tile-shadow transition ${on ? "opacity-70" : ""}`}
              style={{ borderLeftColor: STAGE_COLOR[st.key] ?? s.theme.color }}
            >
              <div className="flex flex-wrap items-start gap-4">
                <button
                  onClick={() => {
                    sfxTap();
                    setChecked((c) => ({ ...c, [key]: !c[key] }));
                    if (!on) fb.star();
                  }}
                  className={`soft-ring grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-2xl font-display text-xl font-extrabold ${
                    on ? "bg-sage text-white" : "bg-cream text-inksoft"
                  }`}
                >
                  {on ? "✓" : i + 1}
                </button>

                <div className="min-w-[220px] flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-cream px-3 py-0.5 text-base font-extrabold text-inksoft">
                      {step.minutes} {t("les.minutes", s.homeLang)}
                    </span>
                    {step.ccq && <span className="rounded-full bg-plumsoft px-3 py-0.5 text-base font-extrabold text-plum">CCQ</span>}
                    {step.sayKey && <span className="rounded-full bg-skysoft px-3 py-0.5 text-base font-extrabold text-sky">{t("les.say", s.homeLang)}</span>}
                  </div>

                  {step.script && (
                    <button
                      onClick={() => void s.say(step.script!, s.targetLang)}
                      className="soft-ring mb-1 flex cursor-pointer items-start gap-2 rounded-xl px-1 text-left"
                    >
                      <IconSpeaker size={20} className="mt-1 shrink-0" style={{ color: s.theme.color }} />
                      <span className="font-display text-3xl font-extrabold" style={{ color: s.theme.color }}>
                        “{step.script}”
                      </span>
                    </button>
                  )}
                  {step.sayKey && (
                    <button
                      onClick={() => void s.say(t(step.sayKey!, s.targetLang, step.sayVars), s.targetLang)}
                      className="soft-ring flex cursor-pointer items-center gap-2 rounded-xl px-1 text-left"
                    >
                      <IconSpeaker size={18} className="shrink-0 text-sky" />
                      <span className="text-2xl font-extrabold text-ink">{t(step.sayKey, s.targetLang, step.sayVars)}</span>
                    </button>
                  )}
                  {step.ccq && (
                    <button
                      onClick={() => void s.say(step.ccq!, s.targetLang)}
                      className="soft-ring flex cursor-pointer items-center gap-2 rounded-xl px-1 text-left"
                    >
                      <IconSpeaker size={18} className="shrink-0 text-plum" />
                      <span className="text-2xl font-extrabold text-plum">{step.ccq}</span>
                    </button>
                  )}
                  {step.action && <div className="mt-1 text-xl leading-snug font-semibold text-ink">{step.action}</div>}
                  {step.expected && (
                    <div className="mt-1 text-lg font-bold text-inksoft">
                      👶 {t("les.expected", s.homeLang)}: <span className="text-ink">{step.expected}</span>
                    </div>
                  )}
                </div>

                {step.wordIds && (
                  <div className="flex gap-2">
                    {step.wordIds.map((id) => {
                      const wd = WORD_MAP[id];
                      return wd ? (
                        <button
                          key={id}
                          onClick={() => void s.sayWord(wd, s.targetLang, s.homeLang, s.mono)}
                          className="soft-ring grid cursor-pointer place-items-center rounded-2xl bg-cream p-1.5"
                        >
                          <ArtTile word={wd} size={62} color={s.theme.color} />
                        </button>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* chant block */}
      {chantLines.length > 0 && (
        <div className="rounded-[2rem] bg-paper p-6 tile-shadow">
          <div className="mb-3 font-display text-2xl font-extrabold">🎵 {chant.title[s.targetLang] ?? chant.title.en}</div>
          <div className="flex flex-wrap gap-2">
            {chantLines.map((l, i) => (
              <button
                key={i}
                onClick={() => void s.say(l, s.targetLang)}
                className="soft-ring cursor-pointer rounded-full bg-cream px-4 py-2 text-xl font-extrabold text-ink hover:bg-sand"
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* footer: games + review */}
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[2rem] bg-paper p-6 tile-shadow">
          <div className="mb-3 font-display text-2xl font-extrabold">🎲 {t("les.games", s.homeLang)}</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {plan.linkedGames.map((g) => (
              <a
                key={g.mode}
                href={`/play?mode=${g.mode}`}
                className="soft-ring flex cursor-pointer items-center gap-3 rounded-[1.3rem] bg-cream p-3 hover:bg-sand"
                onClick={() => sfxTap()}
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl text-2xl" style={{ background: s.theme.soft }}>
                  {g.mode === "trace" ? "✍️" : g.mode === "echo" ? "👾" : g.mode === "scavenger" ? "🔎" : "🚂"}
                </span>
                <span>
                  <span className="block font-display text-lg font-extrabold">{t(g.labelKey, s.homeLang)}</span>
                  <span className="block text-sm font-semibold text-inksoft">{g.why}</span>
                </span>
                <IconArrowRight size={20} className="ml-auto text-inksoft" />
              </a>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] bg-paper p-6 tile-shadow">
          <div className="mb-3 font-display text-2xl font-extrabold">🔁 {t("les.review", s.homeLang)}</div>
          <div className="flex flex-wrap gap-2">
            {plan.review.map((r, i) => (
              <span key={i} className="rounded-full px-4 py-2 text-xl font-extrabold text-white" style={{ background: s.theme.color }}>
                {r}
              </span>
            ))}
          </div>
          <div className="mt-4 rounded-2xl bg-sunsoft px-5 py-3">
            <div className="font-display text-xl font-extrabold text-sun">⭐ {t("les.extension", s.homeLang)}</div>
            <div className="mt-1 text-lg font-semibold text-ink">{plan.extension}</div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {UNITS.slice(0, 0).map((u) => (
              <Chip key={u.id}>{u.icon}</Chip>
            ))}
            <BigButton
              size="md"
              variant="coral"
              onClick={() => window.print()}
            >
              🖨️ {t("les.print", s.homeLang)}
            </BigButton>
          </div>
        </div>
      </div>
    </div>
  );
}
