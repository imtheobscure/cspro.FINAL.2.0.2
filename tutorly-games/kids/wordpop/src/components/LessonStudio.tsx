"use client";

import { useEffect, useMemo, useState } from "react";
import { LANG_META, ui } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { useCatalogue } from "@/lib/catalogue";
import { href, navigate } from "@/lib/route";
import {
  buildLessonPrompt,
  installLesson,
  listLessonPlans,
  parseLessonJson,
  reinstallSavedLessons,
  removeLesson,
  type StoredLesson,
} from "@/lib/customPack";
import { defaultStageNames } from "@/lib/lessons";
import { BigButton } from "./ui";
import { sfx } from "@/lib/sfx";

/**
 * THE LESSON TAB — the second thing the AI-prompt screen can add.
 *
 * A category pack adds topics. A LESSON PLAN is different: it is a timed,
 * tutor-ready plan for a topic that ALREADY exists — objectives, materials,
 * six stages and the words the tutor actually says out loud, with the
 * concept-check questions and what to expect back.
 *
 * Every topic already has a plan WordPop writes from its own words, so this tab
 * is optional: it is how a tutor replaces that plan with one an external AI
 * wrote around their child. Only the pasted plan is stored, never a frozen
 * copy of the topic, so switching language or editing the words never leaves
 * the plan stale.
 */

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function LessonStudio() {
  const s = useSettings();
  const catalogue = useCatalogue();
  const themes = catalogue.themes;

  const [themeId, setThemeId] = useState(themes[0]?.id ?? "");
  const [minutes, setMinutes] = useState(30);
  const [age, setAge] = useState("3–6");
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");
  const [raw, setRaw] = useState("");
  const [lessons, setLessons] = useState<StoredLesson[]>([]);
  const [result, setResult] = useState<{ ok: boolean; message: string; warnings?: string[] } | null>(null);

  // Plans live in localStorage; attach them so the list and the reader agree.
  useEffect(() => {
    reinstallSavedLessons();
    setLessons(listLessonPlans());
  }, []);

  // An installed pack can add topics right after this screen mounts.
  useEffect(() => {
    if (themeId && themes.some((t) => t.id === themeId)) return;
    setThemeId(themes[0]?.id ?? "");
  }, [themes, themeId]);

  const theme = themes.find((t) => t.id === themeId) ?? themes[0];

  // The tutor speaks their home language; the child is learning the target one.
  const tutorLang = s.support !== "none" && s.support !== s.target ? s.support : s.target;

  const prompt = useMemo(
    () =>
      theme
        ? buildLessonPrompt(
            {
              themeId: theme.id,
              minutes,
              age,
              tutorLang,
              targetLang: s.target,
              notes: notes.trim() || undefined,
              stageNames: defaultStageNames(),
            },
            themes,
          )
        : "",
    [theme, minutes, age, tutorLang, s.target, notes, themes],
  );

  const onCopy = async () => {
    sfx.pop();
    const ok = await copyText(prompt);
    setCopied(ok ? "ok" : "fail");
    setTimeout(() => setCopied("idle"), 2500);
  };

  const onInstall = () => {
    sfx.tick();
    const parsed = parseLessonJson(raw, themes);
    if (!parsed.lesson) {
      setResult({ ok: false, message: parsed.error ?? "No usable lesson plan in that JSON." });
      return;
    }
    installLesson(parsed.lesson, themes);
    setLessons(listLessonPlans());
    sfx.star();
    const name = themes.find((t) => t.id === parsed.lesson!.themeId)?.title.en ?? parsed.lesson.themeId;
    setResult({
      ok: true,
      message: `Installed a ${parsed.lesson.stages}-stage, ~${parsed.lesson.minutes}-minute plan for “${name}”. Open 📚 Lesson plan to teach it.`,
      warnings: parsed.lesson.warnings,
    });
    setRaw("");
  };

  const onRemove = (id: string) => {
    const name = themes.find((t) => t.id === id)?.title.en ?? id;
    if (!confirm(`Remove your lesson plan for “${name}”? WordPop's own plan comes back.`)) return;
    sfx.oops();
    removeLesson(id);
    setLessons(listLessonPlans());
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* ── the prompt ── */}
      <section className="card-soft flex flex-col px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-3xl font-bold">1️⃣ The lesson prompt</h2>
          <BigButton tone={copied === "ok" ? "mint" : "lilac"} size="md" onClick={() => void onCopy()}>
            {copied === "ok" ? "✅ Copied!" : copied === "fail" ? "Select it manually" : "📋 Copy AI prompt"}
          </BigButton>
        </div>
        <p className="mt-1 text-base text-ink-soft">
          This prompt carries the topic&apos;s real words, so the AI writes a plan this game can actually teach — the stages, the tutor&apos;s
          script, the questions to ask and what to expect back.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-bold text-ink-soft sm:col-span-2">
            {ui(s.target, "lessonFor")}
            <select
              value={theme?.id ?? ""}
              onChange={(e) => setThemeId(e.target.value)}
              className="mt-1 w-full rounded-xl border-2 border-ink/10 bg-cream px-3 py-2 text-base font-bold text-ink outline-none focus:border-sky"
            >
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.emoji} {t.title.en} · {t.words.length} words
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-bold text-ink-soft">
            {ui(s.target, "lessonLength")} ({minutes} {ui(s.target, "minutes")})
            <input
              type="range"
              min={10}
              max={60}
              step={5}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="mt-2 w-full"
            />
          </label>

          <label className="text-sm font-bold text-ink-soft">
            {ui(s.target, "childAge")}
            <input
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="mt-1 w-full rounded-xl border-2 border-ink/10 bg-cream px-3 py-2 text-base font-bold text-ink outline-none focus:border-sky"
              placeholder="3–6"
            />
          </label>

          <label className="text-sm font-bold text-ink-soft sm:col-span-2">
            {ui(s.target, "mustInclude")}
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. the child is shy — start with the soft toy; no worksheets"
              className="mt-1 w-full rounded-xl border-2 border-ink/10 bg-cream px-3 py-2 text-base font-bold text-ink outline-none focus:border-sky"
            />
          </label>
        </div>

        <p className="mt-3 text-sm font-bold text-ink-soft">
          {ui(s.target, "willLearn")}{" "}
          <b>{(theme?.words ?? []).slice(0, 8).map((w) => w.t.en).join(", ")}</b>
          {(theme?.words.length ?? 0) > 8 ? ` +${(theme?.words.length ?? 0) - 8}` : ""} · {LANG_META[s.target].flag}{" "}
          {LANG_META[s.target].native}
          {tutorLang !== s.target ? ` · tutor speaks ${LANG_META[tutorLang].flag}` : ""}
        </p>

        <textarea
          readOnly
          value={prompt}
          onFocus={(e) => e.currentTarget.select()}
          className="mt-3 h-64 w-full resize-y rounded-2xl border-2 border-ink/10 bg-cream-2 p-3 font-mono text-[11px] leading-relaxed text-ink outline-none"
          spellCheck={false}
        />
      </section>

      {/* ── the JSON ── */}
      <section className="card-soft flex flex-col px-5 py-5">
        <h2 className="font-display text-3xl font-bold">2️⃣ Paste the lesson JSON back</h2>
        <p className="mt-1 text-base text-ink-soft">
          Paste the AI&apos;s answer exactly as it came (markdown fences are fine — they are stripped). The plan is attached to the topic named
          in the JSON and saved on this device.
        </p>

        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder='{ "themeId": "…", "objectives": [ … ], "stages": [ … ] }'
          spellCheck={false}
          className="mt-3 h-64 w-full resize-y rounded-2xl border-2 border-ink/10 bg-cream-2 p-3 font-mono text-[11px] leading-relaxed text-ink outline-none focus:border-sky"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <BigButton tone="mint" disabled={!raw.trim()} onClick={onInstall}>⚡ Install lesson plan</BigButton>
          <BigButton tone="white" size="md" href={href.lesson()}>📚 Open lesson plan</BigButton>
          <BigButton tone="white" size="md" onClick={() => { setRaw(""); setResult(null); }}>Clear</BigButton>
        </div>

        {result && (
          <div className={`mt-3 rounded-2xl px-4 py-3 text-base font-bold ${result.ok ? "bg-mint/60" : "bg-coral/25"}`}>
            {result.ok ? "✅ " : "⚠️ "}
            {result.message}
            {result.ok && (
              <a href={href.lesson()} className="mt-1 block font-bold text-ink underline" onClick={() => sfx.pop()}>
                → Teach this plan now
              </a>
            )}
            {result.warnings?.length ? (
              <details className="mt-2 font-normal">
                <summary className="cursor-pointer font-bold">{result.warnings.length} note(s) while importing</summary>
                <ul className="mt-1 list-inside list-disc space-y-1 text-sm">
                  {result.warnings.slice(0, 10).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        )}

        {/* ── the plans already installed ── */}
        <h3 className="font-display mt-5 text-2xl font-bold">
          📚 {ui(s.target, "installedPlans")} ({lessons.length})
        </h3>
        {lessons.length === 0 ? (
          <p className="mt-1 text-base text-ink-soft">🧠 {ui(s.target, "planHint")}</p>
        ) : (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {lessons.map((l) => (
              <div key={l.themeId} className="rounded-2xl bg-white p-3 ring-1 ring-ink/5">
                <div className="font-display truncate text-lg font-bold">{l.title}</div>
                <div className="text-xs font-bold text-ink-soft">
                  {l.stages} {ui(s.target, "stages")} · {l.steps} {ui(s.target, "step")} · ~{l.minutes} {ui(s.target, "minutes")} · saved{" "}
                  {new Date(l.installedAt).toLocaleDateString()}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <button
                    onClick={() => { sfx.pop(); navigate(href.lesson(l.themeId)); }}
                    className="rounded-full bg-sky px-3 py-1 text-xs font-bold text-ink hover:bg-sky/80"
                  >
                    📖 Teach it
                  </button>
                  <button
                    onClick={() => { sfx.pop(); navigate(href.theme(l.themeId)); }}
                    className="rounded-full bg-cream-2 px-3 py-1 text-xs font-bold text-ink hover:bg-sun/50"
                  >
                    🎮 Play it
                  </button>
                  <button
                    onClick={() => onRemove(l.themeId)}
                    className="rounded-full bg-coral/20 px-3 py-1 text-xs font-bold text-ink hover:bg-coral/40"
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
