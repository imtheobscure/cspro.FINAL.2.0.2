"use client";

import { useEffect, useMemo, useState } from "react";
import { getSubtheme, themeOfSubtheme, wordsOf } from "@/data/dictionary";
import { LANGS } from "@/data/languages";
import { ph } from "@/data/ui-phrases";
import type { LangCode } from "@/data/types";
import { href } from "@/lib/route";
import {
  buildLessonPrompt,
  installLesson,
  listLessonPlans,
  parseLessonJson,
  reinstallSavedLessons,
  removeLesson,
  type StoredLesson,
} from "@/lib/customPack";
import { defaultStageNames, teachableSets } from "@/lib/lessons";
import { BigButton } from "@/components/ui/BigButton";
import { sfx } from "@/lib/sfx";

/**
 * THE LESSON TAB — the second thing the AI-prompt screen can add.
 *
 * A theme pack adds word sets. A LESSON PLAN is different: it is a timed,
 * tutor-ready plan for a word set that ALREADY exists — objectives, materials,
 * six stages and the words the tutor actually says out loud, with the
 * concept-check questions and what to expect back.
 *
 * Every word set already has a plan BiliBuddies writes from its own words, the
 * theme's chant and the question bank in data/talk.ts, so this tab is optional:
 * it is how a tutor replaces that plan with one an external AI wrote around their
 * child. Only the pasted plan is stored, never a frozen copy of the word set, so
 * switching language or editing the words never leaves the plan stale.
 */

const copyText = async (text: string): Promise<boolean> => {
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
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
};

export function LessonStudio() {
  const sets = useMemo(() => teachableSets(), []);
  const [setId, setSetId] = useState(sets[0]?.id ?? "");
  const [target, setTarget] = useState<LangCode>("en");
  const [support, setSupport] = useState<LangCode | "none">("none");
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

  // A pack installed in the other tab can add word sets while this one is open.
  useEffect(() => {
    if (setId && sets.some((s) => s.id === setId)) return;
    setSetId(sets[0]?.id ?? "");
  }, [sets, setId]);

  const subtheme = setId ? getSubtheme(setId) : undefined;
  const theme = setId ? themeOfSubtheme(setId) : undefined;
  const words = subtheme ? wordsOf(subtheme) : [];
  const tutorLang: LangCode = support !== "none" && support !== target ? support : target;

  const prompt = useMemo(
    () =>
      setId
        ? buildLessonPrompt({
            subthemeId: setId,
            minutes,
            age,
            tutorLang,
            targetLang: target,
            notes: notes.trim() || undefined,
            stageNames: defaultStageNames(),
          })
        : "",
    [setId, minutes, age, tutorLang, target, notes],
  );

  const onCopy = async () => {
    sfx.tap();
    const ok = await copyText(prompt);
    setCopied(ok ? "ok" : "fail");
    window.setTimeout(() => setCopied("idle"), 2200);
  };

  const onInstall = () => {
    const parsed = parseLessonJson(raw);
    if (!parsed.lesson) {
      setResult({ ok: false, message: parsed.error ?? "No usable lesson plan in that JSON." });
      return;
    }
    installLesson(parsed.lesson);
    setLessons(listLessonPlans());
    sfx.correct();
    const name = getSubtheme(parsed.lesson.subthemeId)?.t.en ?? parsed.lesson.subthemeId;
    setResult({
      ok: true,
      message: `Installed a ${parsed.lesson.stages}-stage, ~${parsed.lesson.minutes}-minute plan for “${name}”. Open 📚 Lesson plan to teach it.`,
      warnings: parsed.lesson.warnings,
    });
    setRaw("");
  };

  const onRemove = (id: string) => {
    const name = getSubtheme(id)?.t.en ?? id;
    if (!window.confirm(`Remove your lesson plan for “${name}”? BiliBuddies' own plan comes back.`)) return;
    sfx.wrong();
    removeLesson(id);
    setLessons(listLessonPlans());
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {/* ── the prompt ── */}
      <section className="sticker flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="display text-[1.6rem] font-extrabold text-ink">1️⃣ The lesson prompt</h2>
          <BigButton
            variant={copied === "ok" ? "mint" : "grape"}
            size="md"
            className="ml-auto"
            onClick={() => void onCopy()}
          >
            {copied === "ok" ? "✅ Copied" : copied === "fail" ? "⚠️ Copy failed" : "📋 Copy AI prompt"}
          </BigButton>
        </div>
        <p className="text-[1rem] font-semibold text-inksoft">
          This prompt carries the word set&apos;s real words, its theme&apos;s chant, so the AI writes a plan this studio can actually
          teach — the stages, the tutor&apos;s script, the questions to ask and what to expect back.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="display text-[0.95rem] font-bold text-ink sm:col-span-2">
            {ph("lessonFor", target)}
            <select
              value={setId}
              onChange={(e) => {
                sfx.tap();
                setSetId(e.target.value);
              }}
              className="mt-1 w-full rounded-2xl border-2 border-line bg-white px-4 py-2 text-[1rem] font-bold outline-none"
            >
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.emoji} {s.t.en} · {s.words.length} words
                </option>
              ))}
            </select>
          </label>

          <label className="display text-[0.95rem] font-bold text-ink">
            {ph("lessonLength", target)} ({minutes} {ph("minutes", target)})
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

          <label className="display text-[0.95rem] font-bold text-ink">
            {ph("childAge", target)}
            <input
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="mt-1 w-full rounded-2xl border-2 border-line bg-white px-4 py-2 text-[1rem] font-bold outline-none"
            />
          </label>

          <div className="sm:col-span-2">
            <p className="display text-[0.95rem] font-bold text-ink">{ph("teachIn", target)}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {LANGS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    sfx.tap();
                    setTarget(l.id);
                    if (support === l.id) setSupport("none");
                  }}
                  className={`display rounded-full border-2 px-3.5 py-1.5 text-[0.95rem] font-extrabold ${
                    target === l.id ? "border-ink bg-ink text-white" : "border-line bg-white text-inksoft"
                  }`}
                >
                  {l.flag} {l.native}
                </button>
              ))}
            </div>
            <p className="display mt-2 text-[0.95rem] font-bold text-ink">{ph("bridge", target)}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <button
                onClick={() => setSupport("none")}
                className={`display rounded-full border-2 px-3.5 py-1.5 text-[0.95rem] font-extrabold ${
                  support === "none" ? "border-ink bg-ink text-white" : "border-line bg-white text-inksoft"
                }`}
              >
                {ph("none", target)}
              </button>
              {LANGS.filter((l) => l.id !== target).map((l) => (
                <button
                  key={l.id}
                  onClick={() => setSupport(l.id)}
                  className={`display rounded-full border-2 px-3.5 py-1.5 text-[0.95rem] font-extrabold ${
                    support === l.id ? "border-ink bg-ink text-white" : "border-line bg-white text-inksoft"
                  }`}
                >
                  {l.flag} {l.native}
                </button>
              ))}
            </div>
          </div>

          <label className="display text-[0.95rem] font-bold text-ink sm:col-span-2">
            {ph("mustInclude", target)}
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. the child is shy — start with the soft toy; no worksheets"
              className="mt-1 w-full rounded-2xl border-2 border-line bg-white px-4 py-2 text-[1rem] font-bold outline-none"
            />
          </label>
        </div>

        <p className="display text-[0.95rem] font-bold text-inksoft">
          {ph("willLearn", target)} <b>{words.slice(0, 8).map((w) => w.t.en).join(", ")}</b>
          {words.length > 8 ? ` +${words.length - 8}` : ""}
          {theme ? ` · ${theme.emoji} ${theme.t.en}` : ""}
        </p>

        <textarea
          readOnly
          value={prompt}
          onFocus={(e) => e.currentTarget.select()}
          className="scroll-soft h-[320px] w-full rounded-2xl border-2 border-line bg-cream/60 p-4 font-mono text-[0.8rem] leading-snug text-ink outline-none"
        />
      </section>

      {/* ── the JSON ── */}
      <section className="sticker flex flex-col gap-4 p-6">
        <h2 className="display text-[1.6rem] font-extrabold text-ink">2️⃣ Paste the lesson JSON back</h2>
        <p className="text-[1rem] font-semibold text-inksoft">
          Paste the AI&apos;s answer exactly as it came (markdown fences are fine — they are stripped). The plan is attached to the word set
          named in the JSON and saved on this device.
        </p>

        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder='{ "subthemeId": "self-body", "objectives": [ … ], "stages": [ … ] }'
          className="scroll-soft h-[320px] w-full rounded-2xl border-2 border-line bg-white p-4 font-mono text-[0.8rem] leading-snug text-ink outline-none"
        />

        <div className="flex flex-wrap gap-3">
          <BigButton variant="mint" size="lg" disabled={!raw.trim()} onClick={onInstall}>
            ⚡ Install lesson plan
          </BigButton>
          <BigButton variant="soft" size="lg" href={href.lesson()}>
            📚 Open lesson plan
          </BigButton>
          <BigButton variant="soft" size="lg" onClick={() => { setRaw(""); setResult(null); }}>
            Clear
          </BigButton>
        </div>

        {result && (
          <div
            className="rounded-2xl p-4 text-[1rem] font-bold"
            style={{ background: result.ok ? "#E4F7EA" : "#FDE8E0", color: result.ok ? "#1E7A45" : "#B4451F" }}
          >
            {result.ok ? "✅ " : "⚠️ "}
            {result.message}
            {result.ok && (
              <a href={href.lesson()} className="mt-1 block font-bold text-ink underline">
                → Teach this plan now
              </a>
            )}
            {result.warnings?.length ? (
              <details className="mt-2 font-normal">
                <summary className="cursor-pointer font-bold">{result.warnings.length} note(s) while importing</summary>
                <ul className="mt-1 list-inside list-disc space-y-1 text-[0.9rem]">
                  {result.warnings.slice(0, 10).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        )}

        <div className="rounded-2xl bg-cream/70 p-4">
          <h3 className="display text-[1.2rem] font-extrabold text-ink">
            📚 {ph("installedPlans", target)} ({lessons.length})
          </h3>
          {!lessons.length && <p className="mt-1 text-[1rem] font-semibold text-inksoft">🧠 {ph("planHint", target)}</p>}
          <div className="mt-2 flex flex-col gap-2">
            {lessons.map((l) => {
              const set = getSubtheme(l.subthemeId);
              const th = themeOfSubtheme(l.subthemeId);
              return (
                <div key={l.subthemeId} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white px-4 py-3">
                  <span className="text-[1.5rem]">{set?.emoji ?? "📚"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="display text-[1.05rem] font-extrabold text-ink">
                      {l.title} <span className="text-inksoft">· {th.t.en}</span>
                    </div>
                    <div className="text-[0.9rem] font-semibold text-inksoft">
                      {l.stages} {ph("stages", target)} · {l.steps} {ph("steps", target)} · ~{l.minutes} {ph("minutes", target)} · saved{" "}
                      {new Date(l.installedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <BigButton variant="sky" size="sm" href={href.lesson(l.subthemeId)}>
                    📖 Teach it
                  </BigButton>
                  <BigButton variant="soft" size="sm" href={href.studio(th.id, l.subthemeId)}>
                    🎛 Play it
                  </BigButton>
                  <BigButton variant="soft" size="sm" onClick={() => onRemove(l.subthemeId)}>
                    🗑️ Remove
                  </BigButton>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
