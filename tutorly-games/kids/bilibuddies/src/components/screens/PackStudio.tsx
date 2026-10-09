"use client";

import { useMemo, useState } from "react";
import { SUBTHEMES, THEMES, WORD_COUNT } from "@/data/dictionary";
import { LANGS } from "@/data/languages";
import type { LangCode } from "@/data/types";
import { href } from "@/lib/route";
import { buildPackPrompt, installPack, listPacks, parsePackJson, removePack } from "@/lib/customPack";
import { BigButton } from "@/components/ui/BigButton";
import { LogoMark } from "@/components/ui/Logo";
import { LessonStudio } from "@/components/screens/LessonStudio";
import { sfx } from "@/lib/sfx";

/**
 * AI PROMPT & JSON — add your own themes, or a lesson plan.
 *
 * Same two steps as every Tutorly game: copy the prompt into an external AI, then
 * paste the JSON it answers with back here.
 *
 *   🧩 THEME PACK → the theme lands in the studio with its subthemes, words,
 *                    emoji, chants and all six languages.
 *   📚 LESSON PLAN → a timed, tutor-ready plan (objectives, stages, script,
 *                    questions) for a word set the dictionary already has.
 *
 * Both stay on this device.
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
  const [tab, setTab] = useState<"theme" | "lesson">("theme");
  const [topic, setTopic] = useState("");
  const [ageRange, setAgeRange] = useState("3–6");
  const [themeCount, setThemeCount] = useState(2);
  const [subsPerTheme, setSubsPerTheme] = useState(2);
  const [wordsPerSub, setWordsPerSub] = useState(8);
  const [langs, setLangs] = useState<LangCode[]>(["en", "zh", "fr", "it", "de", "tr"]);
  const [notes, setNotes] = useState("");
  const [raw, setRaw] = useState("");
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");
  const [result, setResult] = useState<{ ok: boolean; message: string; warnings?: string[] } | null>(null);
  const [packs, setPacks] = useState(() => listPacks());

  const prompt = useMemo(
    () =>
      buildPackPrompt({
        topic: topic.trim() || "a topic a 4-year-old loves (concrete and everyday)",
        themeCount,
        subthemesPerTheme: subsPerTheme,
        wordsPerSubtheme: wordsPerSub,
        ageRange,
        languages: langs,
        notes: notes.trim() || undefined,
        existingTitles: THEMES.map((th) => th.t.en),
      }),
    [topic, themeCount, subsPerTheme, wordsPerSub, ageRange, langs, notes],
  );

  const doCopy = async (text: string) => {
    const ok = await copyText(text);
    setCopied(ok ? "ok" : "fail");
    window.setTimeout(() => setCopied("idle"), 2200);
  };

  const doInstall = () => {
    const parsed = parsePackJson(raw);
    if (!parsed.themes || !parsed.pack) {
      setResult({ ok: false, message: parsed.error ?? "Could not read that JSON." });
      return;
    }
    installPack(parsed.themes, parsed.pack);
    setPacks(listPacks());
    setResult({
      ok: true,
      message: `Installed ${parsed.themes.map((th) => th.t.en).join(", ")} — ${parsed.themes.length} theme(s), ${parsed.themes.reduce(
        (n, th) => n + th.subthemes.reduce((m, s) => m + s.words.length, 0),
        0,
      )} words. Open the studio and pick them.`,
      warnings: parsed.pack.warnings,
    });
    setRaw("");
  };

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center gap-3">
        <a href={href.home} className="pressable flex items-center gap-2 rounded-full border-2 border-line bg-white px-5 py-2.5">
          <LogoMark size={28} />
          <span className="display text-[1.05rem] font-extrabold text-ink">← BiliBuddies</span>
        </a>
        <a href={href.studio()} className="pressable display ml-auto rounded-full border-2 border-line bg-white px-5 py-2.5 text-[1.05rem] font-extrabold text-inksoft">
          🎛 Open the studio
        </a>
        <a href={href.voices} className="pressable display rounded-full border-2 border-line bg-white px-5 py-2.5 text-[1.05rem] font-extrabold text-inksoft">
          🎤 Voice test
        </a>
      </header>

      <section className="sticker sticker-lg p-7">
        <h1 className="display text-[clamp(1.7rem,3vw,2.5rem)] font-extrabold text-ink">📋 AI Prompt &amp; JSON — add your own themes, or a lesson plan</h1>
        <p className="mt-2 max-w-[90ch] text-[1.05rem] font-semibold leading-relaxed text-inksoft">
          <b>1)</b> Copy the prompt into any external AI (ChatGPT, Claude, Gemini, Grok…). <b>2)</b> Paste the JSON it answers
          with into the box and press install. A <b>theme</b> appears in the studio with subthemes, words, emoji, chants and all six
          languages. A <b>lesson plan</b> is a timed, tutor-ready plan — objectives, stages, the words to say out loud, the questions
          and what to expect back — for a word set you already have. Both are saved on this device. The dictionary currently holds{" "}
          <b>{THEMES.length}</b> themes, <b>{SUBTHEMES.length}</b> subthemes and <b>{WORD_COUNT}</b> words.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => {
              sfx.tap();
              setTab("theme");
            }}
            className={`pressable no-select display rounded-2xl border-2 px-5 py-2.5 text-[1.1rem] font-extrabold ${
              tab === "theme" ? "border-transparent bg-brand text-white" : "border-line bg-white text-inksoft"
            }`}
          >
            🧩 New theme pack
          </button>
          <button
            onClick={() => {
              sfx.tap();
              setTab("lesson");
            }}
            className={`pressable no-select display rounded-2xl border-2 px-5 py-2.5 text-[1.1rem] font-extrabold ${
              tab === "lesson" ? "border-transparent bg-grape text-white" : "border-line bg-white text-inksoft"
            }`}
          >
            📚 New lesson plan
          </button>
          <a href={href.lesson()} className="pressable display rounded-2xl border-2 border-line bg-white px-5 py-2.5 text-[1.1rem] font-extrabold text-inksoft">
            📚 Open lesson plan
          </a>
        </div>
      </section>

      {tab === "lesson" ? (
        <LessonStudio />
      ) : (
        <>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="sticker flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="display text-[1.6rem] font-extrabold text-ink">1️⃣ The prompt</h2>
            <BigButton variant="primary" size="md" className="ml-auto" onClick={() => void doCopy(prompt)}>
              {copied === "ok" ? "✅ Copied" : copied === "fail" ? "⚠️ Copy failed" : "📋 Copy AI prompt"}
            </BigButton>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="display text-[0.95rem] font-bold text-ink">
              Topic for the AI
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. At the doctor, My street, Telling time…"
                className="mt-1 w-full rounded-2xl border-2 border-line bg-white px-4 py-2 text-[1rem] font-bold outline-none"
              />
            </label>
            <label className="display text-[0.95rem] font-bold text-ink">
              Age range
              <input
                value={ageRange}
                onChange={(e) => setAgeRange(e.target.value)}
                className="mt-1 w-full rounded-2xl border-2 border-line bg-white px-4 py-2 text-[1rem] font-bold outline-none"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="display text-[0.95rem] font-bold text-ink">
              Themes ({themeCount})
              <input type="range" min={1} max={6} value={themeCount} onChange={(e) => setThemeCount(Number(e.target.value))} className="mt-2 w-full" />
            </label>
            <label className="display text-[0.95rem] font-bold text-ink">
              Subthemes ({subsPerTheme})
              <input type="range" min={1} max={4} value={subsPerTheme} onChange={(e) => setSubsPerTheme(Number(e.target.value))} className="mt-2 w-full" />
            </label>
            <label className="display text-[0.95rem] font-bold text-ink">
              Words each ({wordsPerSub})
              <input type="range" min={4} max={16} value={wordsPerSub} onChange={(e) => setWordsPerSub(Number(e.target.value))} className="mt-2 w-full" />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="display text-[0.95rem] font-bold text-ink">Languages:</span>
            {LANGS.map((l) => {
              const on = l.id === "en" || langs.includes(l.id);
              return (
                <button
                  key={l.id}
                  disabled={l.id === "en"}
                  onClick={() => setLangs((cur) => (cur.includes(l.id) ? cur.filter((x) => x !== l.id) : [...cur, l.id]))}
                  className={`display rounded-full border-2 px-4 py-1.5 text-[0.95rem] font-extrabold ${
                    on ? "border-line bg-mint text-white" : "border-line bg-white text-inksoft"
                  }`}
                >
                  {l.flag} {l.native}
                </button>
              );
            })}
          </div>

          <label className="display text-[0.95rem] font-bold text-ink">
            Extra instructions (optional)
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. keep every word a thing a child can hold"
              className="mt-1 w-full rounded-2xl border-2 border-line bg-white px-4 py-2 text-[1rem] font-bold outline-none"
            />
          </label>

          <div className="display text-[0.95rem] font-bold text-inksoft">
            Asks for {themeCount * subsPerTheme * wordsPerSub} words ({themeCount} × {subsPerTheme} × {wordsPerSub}) in{" "}
            {LANGS.filter((l) => l.id === "en" || langs.includes(l.id)).length} languages.
          </div>

          <textarea
            readOnly
            value={prompt}
            onFocus={(e) => e.currentTarget.select()}
            className="scroll-soft h-[320px] w-full rounded-2xl border-2 border-line bg-cream/60 p-4 font-mono text-[0.8rem] leading-snug text-ink outline-none"
          />
        </section>

        <section className="sticker flex flex-col gap-4 p-6">
          <h2 className="display text-[1.6rem] font-extrabold text-ink">2️⃣ Paste the JSON back</h2>
          <p className="text-[1rem] font-semibold text-inksoft">
            Paste the AI&apos;s answer exactly as it came (markdown fences are fine — they are stripped).
          </p>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder='{ "themes": [ { "id": "doctor", "title": { … }, "subthemes": [ { "words": [ … ] } ] } ] }'
            className="scroll-soft h-[320px] w-full rounded-2xl border-2 border-line bg-white p-4 font-mono text-[0.8rem] leading-snug text-ink outline-none"
          />
          <div className="flex flex-wrap gap-3">
            <BigButton variant="mint" size="lg" disabled={!raw.trim()} onClick={doInstall}>
              ⚡ Install themes
            </BigButton>
            <BigButton variant="soft" size="lg" onClick={() => setRaw("")}>
              Clear
            </BigButton>
            <BigButton variant="soft" size="lg" onClick={() => void doCopy(JSON.stringify({ app: "bilibuddies", version: 1, packs: listPacks() }, null, 2))}>
              📋 Copy my packs
            </BigButton>
          </div>

          {result && (
            <div
              className="rounded-2xl p-4 text-[1rem] font-bold"
              style={{ background: result.ok ? "#E4F7EA" : "#FDE8E0", color: result.ok ? "#1E7A45" : "#B4451F" }}
            >
              {result.ok ? "✅ " : "⚠️ "}
              {result.message}
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
            <h3 className="display text-[1.2rem] font-extrabold text-ink">🤖 Installed themes ({packs.length})</h3>
            {!packs.length && (
              <p className="mt-1 text-[1rem] font-semibold text-inksoft">
                Nothing custom yet — the {THEMES.length} built-in themes are always here.
              </p>
            )}
            <div className="mt-2 flex flex-col gap-2">
              {packs.map((p) => (
                <div key={p.id + p.installedAt} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white px-4 py-3">
                  <span className="text-[1.5rem]">🧩</span>
                  <div className="min-w-0 flex-1">
                    <div className="display text-[1.05rem] font-extrabold text-ink">{p.themes.map((th) => th.t.en).join(", ")}</div>
                    <div className="text-[0.9rem] font-semibold text-inksoft">
                      {p.themes.length} theme(s) · {p.themes.reduce((n, th) => n + th.subthemes.reduce((m, s) => m + s.words.length, 0), 0)} words ·{" "}
                      {new Date(p.installedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <BigButton
                    variant="soft"
                    size="sm"
                    onClick={() => {
                      removePack(p.id);
                      setPacks(listPacks());
                    }}
                  >
                    🗑️ Remove
                  </BigButton>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
        </>
      )}
    </div>
  );
}
