"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { PageShell, SectionTitle, ContentStatus, APP_NAME } from "@/components/ui";
import { CONTENT_URL, MOCK_CONTENT_URL, useContent } from "@/lib/content-provider";
import { auditPackText, reportToText, SECTION_META, type AuditReport, type Severity } from "@/lib/pack-audit";
import { coercePackText, repairPack, type RepairResult } from "@/lib/pack-repair";
import { normalizePack } from "@/content/tutolingo";

const SEV: Record<Severity, { label: string; plural: string; badge: string; dot: string; panel: string }> = {
  error: { label: "Error", plural: "Errors", badge: "bg-red-100 text-red-600", dot: "bg-red-500", panel: "border-red-200 bg-red-50/70" },
  warning: { label: "Warning", plural: "Warnings", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-400", panel: "border-amber-200 bg-amber-50/70" },
  info: { label: "Note", plural: "Notes", badge: "bg-slate-100 text-slate-500", dot: "bg-slate-300", panel: "border-slate-200 bg-slate-50" },
};

const VERDICT: Record<AuditReport["verdict"], { title: string; sub: string; box: string; score: string }> = {
  ready: {
    title: "Ready to publish ✅",
    sub: "No errors and no warnings — this pack will give a complete course.",
    box: "border-[#58CC02] bg-[#F1FFE5]",
    score: "bg-[#58CC02]",
  },
  "needs-work": {
    title: "Needs work before it goes live ⚠️",
    sub: "The app will run, but parts of the course will be thin or fall back to simpler exercises.",
    box: "border-amber-300 bg-amber-50",
    score: "bg-amber-400",
  },
  broken: {
    title: "Do not publish yet ⛔",
    sub: "Too many items would be dropped or the file cannot be read. Send the issues below back to the AI agent.",
    box: "border-red-300 bg-red-50",
    score: "bg-red-500",
  },
};

const EMPTY_JSON = "";

/* ------------------------------ demo fixture ------------------------------ */

/** A deliberately broken pack, so the report can be seen before your own file exists. */
const DEMO_BROKEN_PACK = {
  meta: {
    app: "Lingo",
    version: "1.0",
    sourceDocument: "Unit 3 – Travel (example with problems)",
    targetLanguage: "English",
    level: "A2",
    coverage: {
      sectionsCovered: ["Unit 3 – Travel"],
      vocabularyCount: 40,
      grammarCount: 6,
      idiomCount: 10,
      conversationCount: 3,
      sentenceCount: 60,
      omissions: ["pages 42–44 (reading text)"],
    },
  },
  vocabulary: [
    { id: "v1", term: "luggage", pos: "noun", definition: "the bags you take when you travel", translation: "equipaje", example: { target: "My luggage is heavy.", native: "Mi equipaje es pesado." } },
    { id: "v2", term: "boarding pass", pos: "noun", definition: "the card that lets you get on the plane" },
    { id: "v3", term: "fare", pos: "noun", definition: "the price of a ticket", translation: "fare", example: { target: "The fare to Galway is cheap." } },
    { id: "v4", term: "runway", pos: "noun", definition: "the strip of ground planes take off from", translation: "pista", example: 42 },
  ],
  grammar: [
    {
      id: "g1",
      title: "Present Simple",
      rule: "Use the present simple for routines, habits and facts.",
      structure: "Subject + base verb (+s/es)",
      examples: [{ target: "I go to work at eight." }],
      exercises: [
        { type: "multiple_choice", prompt: "She ___ to the airport every Monday.", options: ["go", "goes", "going", "gone"], answer: "goes", explanation: "He/she/it takes -s." },
        { type: "fill_blank", prompt: "They ___ not travel in winter.", options: ["do", "does"], answer: "did" },
      ],
    },
  ],
  idioms: [],
  conversations: [
    {
      id: "c1",
      title: "At the airport",
      turns: [
        { speaker: "A", target: "Where is gate 12?", native: "¿Dónde está la puerta 12?" },
        { speaker: "B", target: "Down the hall on your left." },
        { speaker: "A", target: "Thanks!", native: "¡Gracias!" },
      ],
    },
  ],
  sentences: [
    { target: "I would like a window seat, please." },
    "Very good.",
    { target: "The train leaves at six.", native: "El tren sale a las seis." },
  ],
};

/* --------------------------------- page ---------------------------------- */

export default function CheckPage() {
  const { pack, source, localPack, loadPack } = useContent();
  /** The file the app is loading right now — the mock pack is checked when it is active. */
  const currentUrl = source === "mock" ? MOCK_CONTENT_URL : CONTENT_URL;
  const currentFile =
    source === "mock" ? "content/tutolingo-content.mock.json" : source === "local" ? localPack?.name ?? "the uploaded pack" : "content/tutolingo-content.json";
  const [text, setText] = useState(EMPTY_JSON);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [sourceLabel, setSourceLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [repair, setRepair] = useState<RepairResult | null>(null);
  const [repairAdjust, setRepairAdjust] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function check(candidate = text) {
    setReport(auditPackText(candidate));
    setMessage(null);
    setTimeout(() => document.getElementById("audit-report")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  /** Fix everything that can be fixed locally and hand back a publishable pack. */
  function autoRepair() {
    if (!text.trim()) return;
    let parsed: unknown;
    let adjustments: string[] = [];
    try {
      const coerced = coercePackText(text);
      parsed = coerced.value;
      adjustments = coerced.adjustments;
    } catch (e) {
      setRepair(null);
      setRepairAdjust([]);
      setMessage(`The JSON could not be parsed even after cleanup (${e instanceof Error ? e.message : "parse error"}). Fix the syntax the report names, then repair again.`);
      return;
    }
    const result = repairPack(parsed);
    setRepair(result);
    setRepairAdjust(adjustments);
    setText(result.json);
    setMessage(null);
    setReport(auditPackText(result.json));
    setTimeout(() => document.getElementById("repair-report")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  function pretty(raw: string) {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }

  async function readFile(file: File) {
    const content = await file.text();
    setText(content);
    setSourceLabel(file.name);
    setRepair(null);
    setRepairAdjust([]);
    check(content);
  }

  /**
   * Send the pack in the box to the app itself: it becomes the live course in this
   * browser, whether it just came out of the checker or out of the repair run.
   */
  function loadIntoApp(raw = text) {
    if (!raw.trim()) return;
    const result = loadPack(raw, sourceLabel || "checked pack");
    if (!result.ok) {
      setMessage(`Could not open it in ${APP_NAME}: ${result.error}`);
      return;
    }
    setMessage(
      result.empty
        ? `Loaded into ${APP_NAME}, but the pack carries nothing teachable — add the missing sections before learners see it.`
        : `Opened in ${APP_NAME} 🎉 — the course is live in this browser now (${report?.course.lessons ?? "?"} lessons). Nothing was uploaded anywhere.`,
    );
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 60);
  }

  async function loadCurrent() {
    // The uploaded pack is already in memory — no server file to fetch.
    if (source === "local") {
      if (!localPack) {
        setMessage("No pack has been loaded into this browser yet — paste or upload one above.");
        return;
      }
      setText(pretty(localPack.json));
      setSourceLabel(`the uploaded pack this app is loading now (${localPack.name})`);
      setRepair(null);
      setRepairAdjust([]);
      check(localPack.json);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(currentUrl, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const content = await res.text();
      setText(pretty(content));
      setSourceLabel(`the pack this app is loading now (${currentFile})`);
      setRepair(null);
      setRepairAdjust([]);
      check(content);
    } catch (e) {
      setMessage(`Could not read ${currentUrl} (${e instanceof Error ? e.message : "error"}). Paste the file instead.`);
    } finally {
      setBusy(false);
    }
  }

  function loadDemo() {
    const content = JSON.stringify(DEMO_BROKEN_PACK, null, 2);
    setText(content);
    setSourceLabel("example-with-problems.json");
    setRepair(null);
    setRepairAdjust([]);
    check(content);
  }

  function downloadFixed() {
    try {
      const cleaned = JSON.stringify(normalizePack(JSON.parse(text)), null, 2);
      const url = URL.createObjectURL(new Blob([cleaned], { type: "application/json;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "tutolingo-content.json";
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Downloaded the normalised pack — structural junk removed, but the warnings above still need the AI agent to fix them.");
    } catch {
      setMessage("The file is not valid JSON, so there is nothing to normalise yet.");
    }
  }

  async function copyReport() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(reportToText(report));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setMessage("The clipboard is blocked by the browser — download the file or select the text manually.");
    }
  }

  const sectionByKey = (key: string) => report?.sections.find((s) => s.key === key);

  return (
    <PageShell wide>
      <ContentStatus />
      <SectionTitle
        icon="🔍"
        title="Content-pack checker"
        sub={`Validate the AI's JSON before it goes live inside ${APP_NAME}`}
      />

      <div className="mb-3 rounded-3xl border-2 border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-600">
          The app repairs and ignores broken content silently, which makes a half-finished pack look fine. This checker reads
          the file the way the app reads it, and reports what would actually happen:
        </p>
        <ul className="mt-2 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
          <li>📄 <b>JSON validity</b> — code fences, trailing commas, smart quotes, stray prose</li>
          <li>🧩 <b>Schema</b> — missing keys, wrong types, duplicate terms and ids</li>
          <li>🌍 <b>Missing translations</b> — every item that lacks its L1 text</li>
          <li>🪶 <b>Thin content</b> — 1-exercise grammar points, 3-turn dialogues, empty examples</li>
          <li>🕳️ <b>Uncovered sections</b> — empty vocabulary/grammar/idioms/talk/sentences</li>
          <li>🎮 <b>Activity coverage</b> — which of the 8 activities can really run</li>
          <li>📦 <b>Silent drops</b> — items the app would throw away without telling you</li>
          <li>📊 <b>Course size</b> — units, lessons and exercises it will build</li>
          <li>🔧 <b>Auto-repair</b> — fills option sets, writes gaps, fixes counters, drops junk</li>
          <li>🧾 <b>Repair log</b> — every fix listed, plus what only the AI agent can add</li>
        </ul>
        <p className="mt-2 text-xs text-slate-400">
          Everything runs in your browser — the file is never uploaded anywhere.
        </p>
      </div>

      {/* Input */}
      <div className="mb-3 rounded-3xl border-2 border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-black text-slate-800">1 · Paste or upload the pack</h2>
          <span className="text-xs font-bold text-slate-400">
            {text ? `${text.length.toLocaleString("en-US")} characters${sourceLabel ? ` · ${sourceLabel}` : ""}` : "no file loaded"}
          </span>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void readFile(file);
          }}
          className={`mt-2 rounded-2xl border-2 border-dashed p-2 transition ${dragging ? "border-[#58CC02] bg-[#F1FFE5]" : "border-slate-200"}`}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            spellCheck={false}
            placeholder={'Drag a .json file here, or paste the agent\'s answer (it should start with { and end with }).'}
            className="w-full resize-y rounded-xl bg-slate-50 p-3 font-mono text-[11px] leading-relaxed text-slate-600 outline-none"
          />
          {dragging && <p className="pb-2 text-center text-xs font-black text-[#4b9417]">Drop the JSON file to check it</p>}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json,text/plain"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void readFile(file);
            e.target.value = "";
          }}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => check()}
            disabled={!text.trim()}
            className={`btn-3d rounded-2xl px-5 py-3 text-sm font-black text-white ${text.trim() ? "border-[#46A302] bg-[#58CC02]" : "border-slate-300 bg-slate-200"}`}
          >
            🔍 Check this pack
          </button>
          <button onClick={() => fileRef.current?.click()} className="btn-3d rounded-2xl border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-500">
            ⬆️ Choose a .json file
          </button>
          <button
            onClick={() => void loadCurrent()}
            disabled={busy}
            className="btn-3d rounded-2xl border-[#1899D6] bg-[#1CB0F6] px-5 py-3 text-sm font-black text-white"
          >
            {busy
              ? "Loading…"
              : source === "mock"
                ? "📦 Check the app's current pack (sample)"
                : source === "local"
                  ? "📦 Check the uploaded pack"
                  : "📦 Check the app's current pack"}
          </button>
          <button
            onClick={() => loadIntoApp()}
            disabled={!text.trim() || !!report?.parseError}
            className={`btn-3d rounded-2xl px-5 py-3 text-sm font-black text-white ${text.trim() && !report?.parseError ? "border-[#46A302] bg-[#58CC02]" : "border-slate-300 bg-slate-200"}`}
            title="Open the pack in the box as the course this app runs, right in this browser"
          >
            📥 Load into {APP_NAME}
          </button>
          <button onClick={loadDemo} className="btn-3d rounded-2xl border-purple-300 bg-purple-50 px-5 py-3 text-sm font-black text-purple-600">
            🧪 Load an example with problems
          </button>
          <button
            onClick={autoRepair}
            disabled={!text.trim()}
            className={`btn-3d rounded-2xl px-5 py-3 text-sm font-black text-white ${text.trim() ? "border-[#B45309] bg-[#F59E0B]" : "border-slate-300 bg-slate-200"}`}
            title="Fix option sets, gaps, coverage counters and drop unusable items"
          >
            🔧 Auto-repair this pack
          </button>
          {text && (
            <button
              onClick={() => {
                setText("");
                setReport(null);
                setRepair(null);
                setRepairAdjust([]);
                setSourceLabel("");
                setMessage(null);
              }}
              className="rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm font-black text-slate-400"
            >
              Clear
            </button>
          )}
        </div>

        {message && <p className="mt-2 rounded-2xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600">{message}</p>}
        <p className="mt-2 text-[11px] text-slate-400">
          The app is loading <code className="rounded bg-slate-100 px-1 font-mono">{currentFile}</code> — pack v{pack.meta.version || "—"}
          {pack.meta.sourceDocument ? ` (${pack.meta.sourceDocument})` : ""}. Press <b>📥 Load into {APP_NAME}</b> to run a
          checked pack in the app straight away: it is kept in this browser, so no file has to be published at all. The name to
          publish for everyone is <code className="mx-1 rounded bg-slate-100 px-1 font-mono">tutolingo-content.json</code>.
        </p>
      </div>

      {/* Repair report */}
      {repair && (
        <div id="repair-report" className="mb-3 rounded-3xl border-2 border-amber-300 bg-amber-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-black text-amber-800">🔧 Auto-repair complete</h2>
            <div className="flex flex-wrap gap-2">
              <button onClick={downloadFixed} className="btn-3d rounded-2xl border-[#1899D6] bg-[#1CB0F6] px-4 py-2.5 text-xs font-black text-white">
                ⬇️ Download the repaired pack
              </button>
              <button onClick={() => check(repair.json)} className="btn-3d rounded-2xl border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-600">
                🔍 Re-check the repaired pack
              </button>
              <button onClick={() => loadIntoApp(repair.json)} className="btn-3d rounded-2xl border-[#46A302] bg-[#58CC02] px-4 py-2.5 text-xs font-black text-white">
                📥 Use the repaired pack in {APP_NAME}
              </button>
            </div>
          </div>
          <p className="mt-1 text-sm text-amber-800">
            {repair.changed === 0
              ? "Nothing mechanical needed fixing — the report below is all that is left."
              : `${repair.changed} mechanical fix(es) applied. The JSON in the box above is now what the app will load — save it as content/tutolingo-content.json to publish.`}
          </p>
          {repairAdjust.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs font-bold text-amber-700">
              {repairAdjust.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}
          {repair.notes.length > 0 && (
            <div className="mt-3 max-h-64 overflow-y-auto rounded-2xl bg-white/80 p-2">
              <ul className="space-y-1">
                {repair.notes.map((n, i) => (
                  <li key={`${n.where}-${i}`} className="flex flex-wrap items-center gap-2 rounded-xl p-1">
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700">{n.section}</span>
                    <code className="font-mono text-[10px] font-bold text-slate-500">{n.where}</code>
                    <span className="text-xs text-slate-600">{n.action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {repair.remaining.length > 0 && (
            <div className="mt-3 rounded-2xl bg-white/80 p-2">
              <p className="text-xs font-black text-slate-600">Still needs the AI agent ({repair.remaining.length}) — no local fix possible:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[11px] text-slate-500">
                {repair.remaining.slice(0, 8).map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              {repair.remaining.length > 8 && <p className="mt-1 text-[10px] text-slate-400">… and {repair.remaining.length - 8} more — use “Copy the report for the AI agent”.</p>}
            </div>
          )}
        </div>
      )}

      {/* Report */}
      {!report && (
        <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-6 text-center text-sm font-bold text-slate-400">
          No report yet — paste a pack and press <b>Check this pack</b>.
        </div>
      )}

      {report && (
        <div id="audit-report" className="space-y-3">
          {/* Verdict */}
          <div className={`rounded-3xl border-2 p-4 ${VERDICT[report.verdict].box}`}>
            <div className="flex flex-wrap items-center gap-4">
              <div className={`grid h-20 w-20 shrink-0 place-items-center rounded-full text-2xl font-black text-white ${VERDICT[report.verdict].score}`}>
                {report.score}
              </div>
              <div className="min-w-[220px] flex-1">
                <h2 className="text-lg font-black text-slate-800">{VERDICT[report.verdict].title}</h2>
                <p className="text-sm text-slate-600">{VERDICT[report.verdict].sub}</p>
                {report.parseError && (
                  <p className="mt-1 rounded-2xl bg-white/70 px-3 py-2 font-mono text-[11px] text-red-600">
                    {report.parseError.message}
                    {report.parseError.line ? ` (line ${report.parseError.line}, column ${report.parseError.column})` : ""}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => void copyReport()} className="btn-3d rounded-2xl border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-600">
                  {copied ? "Copied ✓" : "📋 Copy the report for the AI agent"}
                </button>
                {!report.parseError && (
                  <button onClick={downloadFixed} className="btn-3d rounded-2xl border-[#1899D6] bg-[#1CB0F6] px-4 py-2.5 text-xs font-black text-white">
                    ⬇️ Download normalised pack
                  </button>
                )}
                {!report.parseError && (
                  <button onClick={() => loadIntoApp()} className="btn-3d rounded-2xl border-[#46A302] bg-[#58CC02] px-4 py-2.5 text-xs font-black text-white">
                    📥 Load into {APP_NAME}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "Items written", value: report.totals.items, tone: "text-slate-700" },
                { label: "Usable by the app", value: report.totals.kept, tone: "text-[#4b9417]" },
                { label: "Silently dropped", value: report.totals.dropped, tone: report.totals.dropped ? "text-red-500" : "text-slate-400" },
                { label: "Missing translations", value: report.totals.missingTranslations, tone: report.totals.missingTranslations ? "text-amber-600" : "text-slate-400" },
                { label: "Thin items", value: report.totals.thin, tone: report.totals.thin ? "text-amber-600" : "text-slate-400" },
                { label: "Errors", value: report.totals.errors, tone: report.totals.errors ? "text-red-500" : "text-slate-400" },
                { label: "Warnings", value: report.totals.warnings, tone: report.totals.warnings ? "text-amber-600" : "text-slate-400" },
                { label: "Notes", value: report.totals.infos, tone: "text-slate-400" },
              ].map((chip) => (
                <div key={chip.label} className="rounded-2xl bg-white/80 p-2.5 text-center">
                  <p className={`text-xl font-black ${chip.tone}`}>{chip.value.toLocaleString("en-US")}</p>
                  <p className="text-[10px] font-bold text-slate-400">{chip.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Course + meta */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border-2 border-slate-200 bg-white p-4">
              <h3 className="font-black text-slate-800">🎓 The course this pack builds</h3>
              {report.course.lessons > 0 ? (
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "Units", value: report.course.units },
                    { label: "Lessons", value: report.course.lessons },
                    { label: "Exercises each", value: report.course.exercisesPerLesson },
                  ].map((c) => (
                    <div key={c.label} className="rounded-2xl bg-slate-50 p-2.5">
                      <p className="text-xl font-black text-slate-700">{c.value}</p>
                      <p className="text-[10px] font-bold text-slate-400">{c.label}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-slate-400">Nothing to build — the file carries no usable items.</p>
              )}
              {report.totals.thin > 0 && report.course.lessons > 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  {report.totals.thin} item(s) are thin, so some lessons will repeat the same handful of exercises.
                </p>
              )}
              <p className="mt-2 text-[11px] text-slate-400">
                One unit covers ≈56 pack items; each unit has 7 lessons. More (complete) items = a longer, more varied course.
              </p>
            </div>

            <div className="rounded-3xl border-2 border-slate-200 bg-white p-4">
              <h3 className="font-black text-slate-800">🏷️ What the pack says about itself</h3>
              <dl className="mt-2 space-y-1 text-sm">
                {[
                  ["Source document", report.meta.sourceDocument || "— not set"],
                  ["First language (L1)", report.meta.l1Name ? `${report.meta.l1Name}${report.meta.l1 ? ` (${report.meta.l1})` : ""}` : "— not set"],
                  ["Teaching", report.meta.targetLanguage || "— not set"],
                  ["Level", report.meta.level || "— not set"],
                  ["Learner profile", report.meta.learnerProfile ? "provided" : "— missing"],
                  ["Declared sections", report.coverage.declaredSections.length ? report.coverage.declaredSections.join(" · ") : "— none reported"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-slate-50 pb-1">
                    <dt className="font-bold text-slate-400">{k}</dt>
                    <dd className="text-right font-black text-slate-600">{v}</dd>
                  </div>
                ))}
              </dl>
              {report.coverage.mismatches.length > 0 && (
                <div className="mt-2 rounded-2xl bg-amber-50 p-2.5">
                  <p className="text-xs font-black text-amber-700">Coverage claims do not match the file:</p>
                  <ul className="mt-1 list-disc pl-4 text-[11px] text-amber-700">
                    {report.coverage.mismatches.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
              {report.coverage.omissions.length > 0 && (
                <div className="mt-2 rounded-2xl bg-slate-50 p-2.5">
                  <p className="text-xs font-black text-slate-600">Omissions the agent admitted ({report.coverage.omissions.length}) — this material is NOT in the app:</p>
                  <ul className="mt-1 list-disc pl-4 text-[11px] text-slate-500">
                    {report.coverage.omissions.slice(0, 6).map((o) => (
                      <li key={o}>{o}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Sections */}
          <div className="rounded-3xl border-2 border-slate-200 bg-white p-4">
            <h3 className="font-black text-slate-800">🧩 Sections — what survives, what is missing</h3>
            <p className="mt-1 text-xs text-slate-400">
              “Usable” is what the app will really load. A gap between written and usable means the app quietly throws those items away.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {report.sections.map((s) => {
                const empty = s.raw === 0 && s.key !== "activities";
                const mismatch = s.declared !== null && s.declared !== s.raw;
                return (
                  <div key={s.key} className={`rounded-2xl border-2 p-3 ${empty ? "border-amber-200 bg-amber-50/60" : s.errors ? "border-red-200 bg-red-50/50" : "border-slate-200 bg-white"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-black text-slate-700">
                        <span className="mr-1">{s.icon}</span>
                        {s.label}
                      </p>
                      {empty ? (
                        <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-black text-amber-800">empty</span>
                      ) : (
                        <span className="text-xs font-black text-slate-500">
                          {s.kept}
                          <span className="text-slate-300">/{s.raw}</span>
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {s.errors > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-600">{s.errors} error(s)</span>}
                      {s.warnings > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700">{s.warnings} warning(s)</span>}
                      {s.dropped > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-600">{s.dropped} dropped</span>}
                      {s.missingTranslations > 0 && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black text-orange-600">{s.missingTranslations} no translation</span>}
                      {s.thin > 0 && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-black text-purple-600">{s.thin} thin</span>}
                      {s.errors + s.warnings + s.dropped + s.missingTranslations + s.thin === 0 && !empty && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-black text-green-600">clean ✓</span>
                      )}
                    </div>
                    {mismatch && (
                      <p className="mt-1 text-[10px] font-bold text-amber-700">
                        coverage.json claims {s.declared}, the file has {s.raw}
                      </p>
                    )}
                    {empty && <p className="mt-1 text-[10px] text-amber-700">Nothing here, so those activities stay out of the course.</p>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activities */}
          <div className="rounded-3xl border-2 border-slate-200 bg-white p-4">
            <h3 className="font-black text-slate-800">🎮 Activity coverage — the eight games the player can build</h3>
            <p className="mt-1 text-xs text-slate-400">A missing activity means the lesson engine silently falls back to a simpler one.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {report.activities.map((act) => (
                <div key={act.kind} className={`rounded-2xl border-2 p-3 ${act.ready ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}`}>
                  <p className="text-xs font-black text-slate-700">
                    {act.ready ? "✅" : "⛔"} {act.label}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-slate-400">{act.kind}</p>
                  {act.ready ? (
                    <>
                      <p className="mt-1 text-[11px] font-bold text-slate-500">{act.pool.toLocaleString("en-US")} usable item(s)</p>
                      <p className="text-[10px] text-slate-400">{act.sources.join(" · ")}</p>
                    </>
                  ) : (
                    <p className="mt-1 text-[11px] font-bold text-red-600">{act.blocker}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Issues */}
          <div className="rounded-3xl border-2 border-slate-200 bg-white p-4">
            <h3 className="font-black text-slate-800">📋 Every problem found ({report.issues.length})</h3>
            {report.issues.length === 0 ? (
              <p className="mt-2 rounded-2xl bg-green-50 p-3 text-sm font-black text-green-600">
                Nothing to report — this pack is complete and consistent. 🎉
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {(["error", "warning", "info"] as Severity[]).map((severity) => {
                  const group = report.issues.filter((i) => i.severity === severity);
                  if (!group.length) return null;
                  return (
                    <div key={severity} className={`rounded-2xl border-2 p-3 ${SEV[severity].panel}`}>
                      <p className="flex items-center gap-2 text-sm font-black text-slate-700">
                        <span className={`h-2.5 w-2.5 rounded-full ${SEV[severity].dot}`} />
                        {SEV[severity].plural} ({group.length})
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {group.map((issue, i) => (
                          <li key={`${issue.where}-${i}`} className="rounded-xl bg-white/80 p-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${SEV[issue.severity].badge}`}>{issue.section}</span>
                              <code className="font-mono text-[11px] font-bold text-slate-500">{issue.where}</code>
                              {(issue.count ?? 1) > 1 && (
                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black text-slate-600">×{issue.count}</span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-slate-600">{issue.message}</p>
                            {issue.fix && <p className="mt-0.5 text-[11px] font-bold text-[#4b9417]">→ {issue.fix}</p>}
                            {(issue.count ?? 1) > 1 && issue.samples && issue.samples.length > 1 && (
                              <p className="mt-1 text-[10px] text-slate-400">
                                also at: {issue.samples.slice(1).join(" · ")}
                                {(issue.count ?? 1) > issue.samples.length ? ` … and more` : ""}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Next steps */}
          <div className="rounded-3xl border-2 border-slate-200 bg-white p-4">
            <h3 className="font-black text-slate-800">🚀 What to do next</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
              <li>Press <b>📥 Load into {APP_NAME}</b> to try the pack in the app right now, without publishing a file.</li>
              <li>Press <b>Copy the report for the AI agent</b> and paste it back into the conversation that produced the file — it names every item that needs fixing.</li>
              <li>Or re-run the <Link href="/prompt" className="font-black text-[#1CB0F6]">AI content prompt</Link> with the same PDF if whole sections are missing.</li>
              <li>Press <b>Auto-repair this pack</b> to fix the mechanical problems locally — option sets, gaps, coverage counters and unusable items — and download a ready-to-publish JSON.</li>
              <li>Use <b>Download normalised pack</b> when you only want the structure cleaned up, without the repairs.</li>
              <li>
                Save the final file as <code className="rounded bg-slate-100 px-1 font-mono text-xs">content/tutolingo-content.json</code> next to the app, reload
                and check <Link href="/profile" className="font-black text-[#1CB0F6]">Profile → Course content</Link> for the live counts.
              </li>
            </ol>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {SECTION_META.slice(0, 3).map((s) => {
                const rep = sectionByKey(s.key);
                if (!rep) return null;
                return (
                  <div key={s.key} className="rounded-2xl bg-slate-50 p-2.5 text-center">
                    <p className="text-xl">{s.icon}</p>
                    <p className="text-lg font-black text-slate-700">{rep.kept}</p>
                    <p className="text-[10px] font-bold text-slate-400">{s.label} loaded</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
