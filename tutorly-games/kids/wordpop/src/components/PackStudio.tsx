"use client";

import { useMemo, useState } from "react";
import { LANGS, CategoryId } from "@/lib/types";
import { LANG_META, ui } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { useCatalogue } from "@/lib/catalogue";
import {
  InstalledPack,
  buildPackPrompt,
  downloadPacks,
  installPack,
  listPacks,
  parseAnyPackJson,
  removePack,
  usePacks,
} from "@/lib/customPack";
import { href } from "@/lib/route";
import { BackLink, BigButton } from "./ui";
import { LessonStudio } from "./LessonStudio";
import { sfx } from "@/lib/sfx";

type Mode = "new" | "extend";

const SAMPLE_TOPIC = "Space and the night sky";
const RECOMMENDED_LANGS = LANGS;

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

export function PackStudio() {
  const s = useSettings();
  const catalogue = useCatalogue();
  const packs = usePacks();

  const [tab, setTab] = useState<"category" | "lesson">("category");
  const [mode, setMode] = useState<Mode>("new");
  const [categoryId, setCategoryId] = useState<CategoryId>(catalogue.categories[0]?.id ?? "self");
  const [topic, setTopic] = useState("");
  const [themeCount, setThemeCount] = useState(12);
  const [wordsPerTheme, setWordsPerTheme] = useState(20);
  const [langs, setLangs] = useState<string[]>(RECOMMENDED_LANGS);
  const [ageRange, setAgeRange] = useState("3–6");
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string; packs?: InstalledPack[]; warnings?: string[] } | null>(null);

  const prompt = useMemo(
    () =>
      buildPackPrompt({
        mode,
        topic: topic.trim() || SAMPLE_TOPIC,
        categoryId,
        themeCount,
        wordsPerTheme,
        languages: LANGS.filter((l) => langs.includes(l)),
        ageRange,
        notes,
        existingThemes: catalogue.themes
          .filter((t) => (mode === "extend" ? t.category === categoryId : true))
          .map((t) => t.title.en),
      }),
    [mode, topic, categoryId, themeCount, wordsPerTheme, langs, ageRange, notes, catalogue.themes],
  );

  const onCopy = async () => {
    sfx.pop();
    const ok = await copyText(prompt);
    setCopied(ok ? "ok" : "fail");
    setTimeout(() => setCopied("idle"), 2500);
  };

  const onLoad = () => {
    sfx.tick();
    const results = parseAnyPackJson(raw);
    if (!results.length) {
      setResult({ ok: false, message: "That is not JSON — paste the object the AI returned (it starts with { and ends with })." });
      return;
    }
    const good = results.filter((r) => r.pack).map((r) => r.pack!) as InstalledPack[];
    const errors = results.map((r) => r.error).filter(Boolean) as string[];
    for (const pack of good) installPack(pack);
    if (!good.length) {
      setResult({ ok: false, message: errors[0] ?? "No usable pack in that JSON." });
      return;
    }
    sfx.star();
    setResult({
      ok: true,
      message: `Installed ${good.length === 1 ? good[0].name : `${good.length} categories`} — ${good
        .reduce((sum, p) => sum + p.themes.length, 0)} themes, ${good.reduce((sum, p) => sum + p.wordCount, 0)} words.`,
      packs: good,
      warnings: good.flatMap((p) => p.warnings),
    });
    setRaw("");
  };

  const installed = packs.length ? packs : listPacks();
  const totalWords = catalogue.words;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <BackLink href={href.home} label={ui(s.target, "home")} />
        <BigButton tone="sky" size="md" href={href.voices}>🎤 Voice test</BigButton>
        <BigButton tone="white" size="md" href={href.lesson()}>📚 {ui(s.target, "lesson")}</BigButton>
        {installed.length > 0 && (
          <BigButton tone="white" size="md" onClick={() => { sfx.tick(); downloadPacks(installed); }}>
            ⬇️ Download my categories
          </BigButton>
        )}
      </div>

      <header className="card-soft px-6 py-6">
        <h1 className="font-display text-4xl font-bold sm:text-5xl">📋 AI Prompt &amp; JSON — add a category, or a lesson plan</h1>
        <p className="mt-2 max-w-3xl text-lg text-ink-soft">
          Two steps either way. <b>1)</b> Copy the prompt below and give it to ChatGPT, Claude, Gemini, Grok — any external AI. <b>2)</b> Paste
          the JSON it answers with into the box on the right and press install. A <b>category</b> (themes, words, emoji, all six languages)
          appears in the games and is saved on this device. A <b>lesson plan</b> is a timed, tutor-ready plan — objectives, stages, the words
          to say out loud, the questions and what to expect back — for a topic you already have. The library currently holds{" "}
          {catalogue.themes.length} themes and {totalWords} words.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => { sfx.tick(); setTab("category"); }}
            className={`btn-3d font-display rounded-full px-5 py-2.5 text-lg font-bold ${
              tab === "category" ? "bg-coral text-white" : "bg-white text-ink ring-1 ring-ink/10"
            }`}
          >
            🗂️ New category
          </button>
          <button
            onClick={() => { sfx.tick(); setTab("lesson"); }}
            className={`btn-3d font-display rounded-full px-5 py-2.5 text-lg font-bold ${
              tab === "lesson" ? "bg-lilac text-ink" : "bg-white text-ink ring-1 ring-ink/10"
            }`}
          >
            📚 New lesson plan
          </button>
        </div>
      </header>

      {tab === "lesson" ? (
        <LessonStudio />
      ) : (
        <>
      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── the prompt ── */}
        <section className="card-soft flex flex-col px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-3xl font-bold">1️⃣ The prompt</h2>
            <BigButton tone={copied === "ok" ? "mint" : "coral"} size="md" onClick={() => void onCopy()}>
              {copied === "ok" ? "✅ Copied!" : copied === "fail" ? "Select it manually" : "📋 Copy AI prompt"}
            </BigButton>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold text-ink-soft">
              Build
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as Mode)}
                className="mt-1 w-full rounded-xl border-2 border-ink/10 bg-cream px-3 py-2 text-base font-bold text-ink outline-none focus:border-sky"
              >
                <option value="new">A brand-new category</option>
                <option value="extend">New themes inside a category I have</option>
              </select>
            </label>

            {mode === "extend" ? (
              <label className="text-sm font-bold text-ink-soft">
                Category
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value as CategoryId)}
                  className="mt-1 w-full rounded-xl border-2 border-ink/10 bg-cream px-3 py-2 text-base font-bold text-ink outline-none focus:border-sky"
                >
                  {catalogue.categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.title.en}</option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="text-sm font-bold text-ink-soft">
                Age range
                <input
                  value={ageRange}
                  onChange={(e) => setAgeRange(e.target.value)}
                  className="mt-1 w-full rounded-xl border-2 border-ink/10 bg-cream px-3 py-2 text-base font-bold text-ink outline-none focus:border-sky"
                  placeholder="3–6"
                />
              </label>
            )}

            <label className="text-sm font-bold text-ink-soft sm:col-span-2">
              Topic for the AI
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={SAMPLE_TOPIC}
                className="mt-1 w-full rounded-xl border-2 border-ink/10 bg-cream px-3 py-2 text-base font-bold text-ink outline-none focus:border-sky"
              />
            </label>

            <label className="text-sm font-bold text-ink-soft">
              Themes ({themeCount})
              <input
                type="range" min={4} max={30} value={themeCount}
                onChange={(e) => setThemeCount(Number(e.target.value))}
                className="mt-2 w-full"
              />
            </label>
            <label className="text-sm font-bold text-ink-soft">
              Words per theme ({wordsPerTheme})
              <input
                type="range" min={8} max={40} value={wordsPerTheme}
                onChange={(e) => setWordsPerTheme(Number(e.target.value))}
                className="mt-2 w-full"
              />
            </label>

            <div className="sm:col-span-2">
              <p className="text-sm font-bold text-ink-soft">Languages (English is always included)</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {LANGS.map((l) => (
                  <button
                    key={l}
                    onClick={() => setLangs((prev) => (l === "en" ? prev : prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]))}
                    className={`rounded-full px-3 py-1.5 text-sm font-bold ${
                      langs.includes(l) ? "bg-ink text-white" : "bg-white text-ink-soft ring-1 ring-ink/10"
                    } ${l === "en" ? "cursor-not-allowed opacity-80" : ""}`}
                    title={l === "en" ? "English is the key language" : `Include ${LANG_META[l].name}`}
                  >
                    {LANG_META[l].flag} {LANG_META[l].native}
                  </button>
                ))}
              </div>
            </div>

            <label className="text-sm font-bold text-ink-soft sm:col-span-2">
              Extra instructions (optional)
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. include the Turkish word for each animal sound; avoid food words"
                className="mt-1 w-full rounded-xl border-2 border-ink/10 bg-cream px-3 py-2 text-base font-bold text-ink outline-none focus:border-sky"
              />
            </label>
          </div>

          <p className="mt-3 text-sm font-bold text-ink-soft">
            Asks for <b>{themeCount * wordsPerTheme} words</b> ({themeCount} themes × {wordsPerTheme}) in{" "}
            {LANGS.filter((l) => langs.includes(l)).length} languages.
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
          <h2 className="font-display text-3xl font-bold">2️⃣ Paste the JSON back</h2>
          <p className="mt-1 text-base text-ink-soft">
            Paste the AI&apos;s answer exactly as it came (markdown fences are fine — they are stripped), or a backup file downloaded from
            this page.
          </p>

          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder='{ "category": { … }, "themes": [ … ] }'
            spellCheck={false}
            className="mt-3 h-64 w-full resize-y rounded-2xl border-2 border-ink/10 bg-cream-2 p-3 font-mono text-[11px] leading-relaxed text-ink outline-none focus:border-sky"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <BigButton tone="mint" onClick={onLoad} disabled={!raw.trim()}>⚡ Install category</BigButton>
            <BigButton tone="white" size="md" onClick={() => { setRaw(""); setResult(null); }}>Clear</BigButton>
          </div>

          {result && (
            <div className={`mt-3 rounded-2xl px-4 py-3 text-base font-bold ${result.ok ? "bg-mint/60" : "bg-coral/25"}`}>
              {result.ok ? "✅ " : "⚠️ "}
              {result.message}
              {result.ok && result.packs?.length ? (
                <div className="mt-1 font-normal">
                  {result.packs.map((p) => (
                    <div key={p.id}>
                      {p.category.emoji} <b>{p.category.title[s.target] ?? p.category.title.en}</b> — {p.themes.length} themes ·{" "}
                      {p.wordCount} words
                    </div>
                  ))}
                  <a href={href.home} className="mt-1 inline-block font-bold text-ink underline" onClick={() => sfx.pop()}>
                    → See it on the topics page
                  </a>
                </div>
              ) : null}
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
        </section>
      </div>

      {/* ── installed ── */}
      <section className="card-soft px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-3xl font-bold">🤖 Installed categories ({installed.length})</h2>
          {installed.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <BigButton tone="white" size="md" onClick={() => void copyText(JSON.stringify({ app: "wordpop", version: 1, packs: installed }, null, 2)).then((ok) => setCopied(ok ? "ok" : "fail"))}>
                📋 Copy all (for another device)
              </BigButton>
              <BigButton tone="white" size="md" onClick={() => { sfx.tick(); downloadPacks(installed); }}>⬇️ Download .json</BigButton>
            </div>
          )}
        </div>

        {installed.length === 0 ? (
          <p className="mt-2 text-lg text-ink-soft">
            Nothing custom yet — the {catalogue.themes.length} built-in themes above are always here. Use the prompt on the left to add a
            category the library does not cover.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {installed.map((p) => (
              <div key={p.id} className="rounded-2xl bg-white p-3 ring-1 ring-ink/5">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{p.category.emoji}</span>
                  <div className="min-w-0">
                    <div className="font-display truncate text-xl font-bold">{p.category.title[s.target] ?? p.category.title.en}</div>
                    <div className="text-xs font-bold text-ink-soft">
                      {p.themes.length} themes · {p.wordCount} words · saved {new Date(p.installedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.themes.slice(0, 6).map((t) => (
                    <a key={t.id} href={href.theme(t.id)} className="rounded-full bg-cream-2 px-2 py-0.5 text-xs font-bold hover:bg-sun/50">
                      {t.emoji} {t.title.en}
                    </a>
                  ))}
                  {p.themes.length > 6 && <span className="text-xs font-bold text-ink-soft">+{p.themes.length - 6} more</span>}
                </div>
                <button
                  onClick={() => { if (confirm(`Remove the "${p.name}" category from this device?`)) { sfx.oops(); removePack(p.id); } }}
                  className="mt-2 rounded-full bg-coral/20 px-3 py-1 text-xs font-bold text-ink hover:bg-coral/40"
                >
                  🗑️ Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
        </>
      )}
    </div>
  );
}
