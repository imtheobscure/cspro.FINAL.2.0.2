"use client";

import { useMemo, useState } from "react";
import { href } from "@/lib/route";
import { THEMES, TOTAL_WORDS, UNITS, UNIT_MAP, label } from "@/lib/data";
import { LANGS, type Lang } from "@/lib/data/types";
import { t } from "@/lib/data/phrases";
import { autoLesson } from "@/lib/data/lessons";
import { useTutor } from "@/lib/store";
import {
  buildLessonPrompt,
  buildPackPrompt,
  installLesson,
  installPack,
  listLessons,
  listPacks,
  parseLessonJson,
  parsePackJson,
  removeLesson,
  removePack,
} from "@/lib/customPack";
import { BigButton } from "@/components/ui/Kit";

/**
 * AI PROMPT & JSON — add your own themes, or write a lesson plan.
 *
 * Two things can be added, both the same way: copy the prompt into an external AI
 * (ChatGPT, Claude, Gemini, Grok — anything), then paste the JSON it answers with
 * back here.
 *
 *   🧩 THEME  → a whole new category: units, words, emoji, all six languages and
 *               pinyin. It works in all eleven game modes at once.
 *   📚 LESSON → a complete, timed lesson plan for one unit — objectives,
 *               materials, six stages and the tutor's actual script, with the
 *               concept-check questions — layered over the plan LearnLoop writes
 *               by itself (lib/data/lessons.ts).
 *
 * Everything is saved on this device; nothing is uploaded anywhere.
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

export function PackStudio() {
  const homeLang = useTutor((s) => s.homeLang);
  const targetLang = useTutor((s) => s.targetLang);
  const mono = useTutor((s) => s.mono);
  const patch = useTutor((s) => s.patch);
  const [tab, setTab] = useState<"theme" | "lesson">("theme");
  const [topic, setTopic] = useState("");
  const [ageRange, setAgeRange] = useState("3–6");
  const [themeCount, setThemeCount] = useState(2);
  const [unitsPerTheme, setUnitsPerTheme] = useState(2);
  const [wordsPerUnit, setWordsPerUnit] = useState(8);
  const [langs, setLangs] = useState<Lang[]>(["en", "zh", "fr", "it", "de", "tr"]);
  const [notes, setNotes] = useState("");
  const [raw, setRaw] = useState("");
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");
  const [result, setResult] = useState<{ ok: boolean; message: string; warnings?: string[] } | null>(null);
  const [packs, setPacks] = useState(() => listPacks());
  const [lessons, setLessons] = useState(() => listLessons());
  /** The unit of the plan just installed, so the success note can link straight to it. */
  const [lessonUnit, setLessonUnit] = useState<string | null>(null);

  /* ── lesson builder state ── */
  const [unitId, setUnitId] = useState(UNITS[0]?.id ?? "");
  const [minutes, setMinutes] = useState(30);
  const [childAge, setChildAge] = useState("4");
  const [lessonNotes, setLessonNotes] = useState("");

  const prompt = useMemo(
    () =>
      tab === "theme"
        ? buildPackPrompt({
            topic: topic.trim() || "a topic a 4-year-old loves (pick something concrete and everyday)",
            themeCount,
            unitsPerTheme,
            wordsPerUnit,
            ageRange,
            languages: langs,
            notes: notes.trim() || undefined,
            existingTitles: THEMES.map((th) => t(th.name, "en")),
          })
        : buildLessonPrompt(
            {
              unitId,
              minutes,
              age: childAge,
              tutorLang: homeLang,
              targetLang,
              notes: lessonNotes.trim() || undefined,
              stageNames: (autoLesson(unitId, targetLang, mono)?.stages ?? []).map((s) => t(s.key, "en")),
            },
            UNIT_MAP[unitId]?.words ?? [],
          ),
    [tab, topic, themeCount, unitsPerTheme, wordsPerUnit, ageRange, langs, notes, unitId, minutes, childAge, homeLang, targetLang, mono, lessonNotes],
  );

  const doCopy = async () => {
    const ok = await copyText(prompt);
    setCopied(ok ? "ok" : "fail");
    window.setTimeout(() => setCopied("idle"), 2200);
  };

  const doInstall = () => {
    if (tab === "lesson") {
      const parsed = parseLessonJson(raw);
      if (!parsed.lesson) {
        setResult({ ok: false, message: parsed.error ?? "Could not read that JSON." });
        return;
      }
      installLesson(parsed.lesson);
      setLessons(listLessons());
      const unitName = t(UNIT_MAP[parsed.lesson.unitId]?.name ?? parsed.lesson.unitId, "en");
      setLessonUnit(parsed.lesson.unitId);
      setResult({
        ok: true,
        message: `Installed a ${parsed.lesson.stages}-stage, ~${parsed.lesson.minutes}-minute lesson for “${unitName}”.`,
        warnings: parsed.lesson.warnings,
      });
      setRaw("");
      patch({ seed: Math.floor(Math.random() * 900) + 3 });
      return;
    }

    const parsed = parsePackJson(raw);
    if (!parsed.themes || !parsed.pack) {
      setResult({ ok: false, message: parsed.error ?? "Could not read that JSON." });
      return;
    }
    installPack(parsed.themes, parsed.pack);
    setPacks(listPacks());
    setResult({
      ok: true,
      message: `Installed ${parsed.themes.map((th) => t(th.name, "en")).join(", ")} — ${parsed.themes.length} theme(s), ${parsed.themes.reduce(
        (n, th) => n + th.units.reduce((m, u) => m + u.words.length, 0),
        0,
      )} words. Open 🎈 Play to teach them.`,
      warnings: parsed.pack.warnings,
    });
    setRaw("");
    // Nudge every screen to re-read the library.
    patch({ seed: Math.floor(Math.random() * 900) + 3 });
  };

  const doRemoveLesson = (id: string) => {
    removeLesson(id);
    setLessons(listLessons());
    patch({ seed: Math.floor(Math.random() * 900) + 3 });
  };

  const doRemove = (id: string) => {
    removePack(id);
    setPacks(listPacks());
    patch({ themeId: THEMES[0].id, seed: Math.floor(Math.random() * 900) + 3 });
  };

  const backup = () =>
    JSON.stringify({ app: "learnloop", version: 1, packs: listPacks(), lessons: listLessons() }, null, 2);

  return (
    <div className="dot-grid min-h-screen bg-cream pb-20">
      <header className="border-b-4 border-sand bg-paper/90 px-6 py-4">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3">
          <a href={href.home} className="font-display text-3xl font-extrabold">
            ← LearnLoop
          </a>
          <a href={href.play} className="soft-ring ml-auto rounded-full bg-cream px-5 py-2.5 text-lg font-extrabold text-inksoft hover:bg-sand">
            🎈 Play
          </a>
          <a href={href.lesson()} className="soft-ring rounded-full bg-cream px-5 py-2.5 text-lg font-extrabold text-inksoft hover:bg-sand">
            📚 Lesson plan
          </a>
          <a href={href.teacher} className="soft-ring rounded-full bg-cream px-5 py-2.5 text-lg font-extrabold text-inksoft hover:bg-sand">
            📊 Tutor panel
          </a>
          <a href={href.voices} className="soft-ring rounded-full bg-cream px-5 py-2.5 text-lg font-extrabold text-inksoft hover:bg-sand">
            🎤 Voice test
          </a>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1400px] flex-col gap-8 px-6 py-8">
        <section className="rounded-[2.2rem] bg-paper p-8 tile-shadow">
          <h1 className="font-display text-4xl font-extrabold">📋 AI Prompt &amp; JSON — add your own content</h1>
          <p className="mt-3 max-w-[90ch] text-xl leading-snug font-semibold text-inksoft">
            <b>1)</b> Copy a prompt below into any external AI. <b>2)</b> Paste the JSON it answers with into the box and press
            install. A <b>theme</b> becomes a whole new category — units, words, emoji, all six languages and pinyin — playable in
            every mode. A <b>lesson</b> becomes a complete timed plan with the tutor&apos;s script for one unit. The library
            currently holds <b>{THEMES.length}</b> themes, <b>{UNITS.length}</b> units and <b>{TOTAL_WORDS}</b> words.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => {
                setTab("theme");
                setResult(null);
              }}
              className={`soft-ring cursor-pointer rounded-[1.3rem] px-6 py-3 font-display text-2xl font-extrabold ${
                tab === "theme" ? "bg-coral text-white" : "bg-cream text-inksoft"
              }`}
            >
              🧩 New theme (category)
            </button>
            <button
              onClick={() => {
                setTab("lesson");
                setResult(null);
              }}
              className={`soft-ring cursor-pointer rounded-[1.3rem] px-6 py-3 font-display text-2xl font-extrabold ${
                tab === "lesson" ? "bg-plum text-white" : "bg-cream text-inksoft"
              }`}
            >
              📚 New lesson plan
            </button>
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-2">
          <section className="flex flex-col gap-4 rounded-[2.2rem] bg-paper p-7 tile-shadow">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-3xl font-extrabold">1️⃣ The prompt</h2>
              <BigButton variant="coral" size="md" className="ml-auto" onClick={() => void doCopy()}>
                {copied === "ok" ? "✅ Copied" : copied === "fail" ? "⚠️ Copy failed" : "📋 Copy AI prompt"}
              </BigButton>
            </div>

            {tab === "theme" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-lg font-bold text-ink">
                    Topic for the AI
                    <input
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. At the doctor, Weather, My street…"
                      className="mt-1 w-full rounded-2xl border-2 border-sand bg-cream px-4 py-2 text-lg font-bold outline-none"
                    />
                  </label>
                  <label className="text-lg font-bold text-ink">
                    Age range
                    <input
                      value={ageRange}
                      onChange={(e) => setAgeRange(e.target.value)}
                      className="mt-1 w-full rounded-2xl border-2 border-sand bg-cream px-4 py-2 text-lg font-bold outline-none"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {(
                    [
                      ["Themes", themeCount, setThemeCount, 1, 6],
                      ["Units per theme", unitsPerTheme, setUnitsPerTheme, 1, 4],
                      ["Words per unit", wordsPerUnit, setWordsPerUnit, 4, 16],
                    ] as const
                  ).map(([label, value, set, min, max]) => (
                    <label key={label} className="text-lg font-bold text-ink">
                      {label} ({value})
                      <input
                        type="range"
                        min={min}
                        max={max}
                        value={value}
                        onChange={(e) => set(Number(e.target.value))}
                        className="mt-2 w-full"
                      />
                    </label>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-bold text-ink">Languages:</span>
                  {LANGS.map((l) => {
                    const on = l.id === "en" || langs.includes(l.id);
                    return (
                      <button
                        key={l.id}
                        disabled={l.id === "en"}
                        onClick={() =>
                          setLangs((cur) => (cur.includes(l.id) ? cur.filter((x) => x !== l.id) : [...cur, l.id]))
                        }
                        className={`soft-ring rounded-full px-4 py-1.5 text-lg font-extrabold ${
                          on ? "bg-sage text-white" : "bg-cream text-inksoft"
                        } ${l.id === "en" ? "opacity-80" : "cursor-pointer"}`}
                      >
                        {l.flag} {l.native}
                      </button>
                    );
                  })}
                </div>

                <label className="text-lg font-bold text-ink">
                  Extra instructions (optional)
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. only animals that live in our town"
                    className="mt-1 w-full rounded-2xl border-2 border-sand bg-cream px-4 py-2 text-lg font-bold outline-none"
                  />
                </label>

                <div className="text-lg font-bold text-inksoft">
                  Asks for {themeCount * unitsPerTheme * wordsPerUnit} words ({themeCount} × {unitsPerTheme} × {wordsPerUnit}) in{" "}
                  {LANGS.filter((l) => l.id === "en" || langs.includes(l.id)).length} languages.
                </div>
              </>
            ) : (
              <>
                <label className="text-lg font-bold text-ink">
                  Which unit is the lesson for?
                  <select
                    value={unitId}
                    onChange={(e) => setUnitId(e.target.value)}
                    className="mt-1 w-full rounded-2xl border-2 border-sand bg-cream px-4 py-2 text-lg font-bold text-ink outline-none"
                  >
                    {UNITS.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.icon} {t(u.name, "en")} · {u.words.length} words
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-[1.4rem] bg-cream p-4 text-lg font-semibold text-inksoft">
                  The AI will write the lesson around these words:{" "}
                  <b>
                    {(UNIT_MAP[unitId]?.words ?? [])
                      .slice(0, 8)
                      .map((wd) => `${wd.e} ${label(wd, "en")}`)
                      .join(", ")}
                  </b>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-lg font-bold text-ink">
                    Lesson length
                    <select
                      value={minutes}
                      onChange={(e) => setMinutes(Number(e.target.value))}
                      className="mt-1 w-full rounded-2xl border-2 border-sand bg-cream px-4 py-2 text-lg font-bold text-ink outline-none"
                    >
                      {[15, 20, 25, 30, 35, 40, 45, 60].map((m) => (
                        <option key={m} value={m}>
                          {m} minutes
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-lg font-bold text-ink">
                    Child&apos;s age
                    <select
                      value={childAge}
                      onChange={(e) => setChildAge(e.target.value)}
                      className="mt-1 w-full rounded-2xl border-2 border-sand bg-cream px-4 py-2 text-lg font-bold text-ink outline-none"
                    >
                      {["3", "4", "5", "6", "7", "8"].map((a) => (
                        <option key={a} value={a}>
                          {a} years old
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="text-lg font-bold text-ink">
                  Anything the lesson must include (optional)
                  <input
                    value={lessonNotes}
                    onChange={(e) => setLessonNotes(e.target.value)}
                    placeholder="e.g. the child loves dinosaurs; 5 minutes of movement at the end"
                    className="mt-1 w-full rounded-2xl border-2 border-sand bg-cream px-4 py-2 text-lg font-bold outline-none"
                  />
                </label>
              </>
            )}

            <textarea
              readOnly
              value={prompt}
              onFocus={(e) => e.currentTarget.select()}
              className="scroll-thin h-[320px] w-full rounded-[1.4rem] border-2 border-sand bg-cream p-4 font-mono text-sm leading-snug text-ink outline-none"
            />
          </section>

          <section className="flex flex-col gap-4 rounded-[2.2rem] bg-paper p-7 tile-shadow">
            <h2 className="font-display text-3xl font-extrabold">2️⃣ Paste the JSON back</h2>
            <p className="text-lg font-semibold text-inksoft">
              Paste the AI&apos;s answer exactly as it came (markdown fences are fine — they are stripped), or a backup file
              downloaded from this page.
            </p>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={
                tab === "theme"
                  ? '{ "themes": [ { "id": "ocean", "title": { … }, "units": [ { "words": [ … ] } ] } ] }'
                  : '{ "unitId": "pets", "objectives": [ … ], "stages": [ { "title": { … }, "steps": [ … ] } ] }'
              }
              className="scroll-thin h-[320px] w-full rounded-[1.4rem] border-2 border-sand bg-cream p-4 font-mono text-sm leading-snug text-ink outline-none"
            />
            <div className="flex flex-wrap gap-3">
              <BigButton variant={tab === "theme" ? "sage" : "plum"} size="lg" disabled={!raw.trim()} onClick={doInstall}>
                {tab === "theme" ? "⚡ Install themes" : "⚡ Install lesson plan"}
              </BigButton>
              <BigButton variant="paper" size="lg" onClick={() => setRaw("")}>
                Clear
              </BigButton>
              <BigButton variant="paper" size="lg" onClick={() => void copyText(backup()).then((ok) => setCopied(ok ? "ok" : "fail"))}>
                📋 Copy my content
              </BigButton>
            </div>

            {result && (
              <div
                className="rounded-[1.4rem] p-4 text-lg font-bold"
                style={{ background: result.ok ? "#dff4e6" : "#fde8e0", color: result.ok ? "#1e7a45" : "#b4451f" }}
              >
                {result.ok ? "✅ " : "⚠️ "}
                {result.message}
                {result.ok && lessonUnit && (
                  <a href={href.lesson(lessonUnit)} className="mt-1 block font-extrabold text-ink underline">
                    → {t("les.title", homeLang)}: {t(UNIT_MAP[lessonUnit]?.name ?? lessonUnit, "en")}
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

            <div className="rounded-[1.4rem] bg-cream p-5">
              <h3 className="font-display text-2xl font-extrabold">🤖 Installed themes ({packs.length})</h3>
              {!packs.length && (
                <p className="mt-2 text-lg font-semibold text-inksoft">
                  Nothing custom yet — the {THEMES.length} built-in themes are always here. Use the prompt to add a topic the
                  library does not cover.
                </p>
              )}
              <div className="mt-3 flex flex-col gap-2">
                {packs.map((p) => (
                  <div key={p.id + p.installedAt} className="flex flex-wrap items-center gap-3 rounded-[1.2rem] bg-paper px-4 py-3">
                    <span className="text-2xl">🧩</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-xl font-extrabold">
                        {p.themes.map((th) => t(th.name, homeLang)).join(", ")}
                      </div>
                      <div className="text-base font-semibold text-inksoft">
                        {p.themes.length} theme(s) · {p.themes.reduce((n, th) => n + th.units.reduce((m, u) => m + u.words.length, 0), 0)} words ·{" "}
                        {new Date(p.installedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <BigButton variant="paper" size="sm" onClick={() => doRemove(p.id)}>
                      🗑️ Remove
                    </BigButton>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.4rem] bg-cream p-5">
              <h3 className="font-display text-2xl font-extrabold">📚 Installed lesson plans ({lessons.length})</h3>
              {!lessons.length && (
                <p className="mt-2 text-lg font-semibold text-inksoft">
                  Every unit already has a lesson LearnLoop writes itself. Add one to make it yours.
                </p>
              )}
              <div className="mt-3 flex flex-col gap-2">
                {lessons.map((l) => (
                  <div key={l.unitId + l.installedAt} className="flex flex-wrap items-center gap-3 rounded-[1.2rem] bg-paper px-4 py-3">
                    <span className="text-2xl">📚</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-xl font-extrabold">
                        {t(UNIT_MAP[l.unitId]?.name ?? l.unitId, homeLang)}
                      </div>
                      <div className="text-base font-semibold text-inksoft">
                        {l.stages} stages · {l.steps} steps · ~{l.minutes} min · {new Date(l.installedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <a
                      href={href.lesson(l.unitId)}
                      className="soft-ring rounded-full bg-cream px-5 py-2.5 text-lg font-extrabold text-inksoft hover:bg-sand"
                    >
                      📖 {t("les.title", homeLang)}
                    </a>
                    <BigButton variant="paper" size="sm" onClick={() => doRemoveLesson(l.unitId)}>
                      🗑️ Remove
                    </BigButton>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
