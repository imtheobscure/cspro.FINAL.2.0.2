"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PageShell, SectionTitle, ContentStatus, L1Input, APP_NAME } from "@/components/ui";
import { PackDropZone } from "@/components/PackDropZone";
import { languageCode, languageName } from "@/content/languages";
import { buildContentPrompt, CONTENT_FILE_PATH, DEFAULT_TARGET_LANGUAGE } from "@/content/ai-prompt";
import { normalizePack, packItemCount, type ContentPack } from "@/content/tutolingo";
import { totalLessons, totalUnits } from "@/content/units";
import { useContent } from "@/lib/content-provider";
import { coercePackText } from "@/lib/pack-repair";
import { downloadTextFile } from "@/lib/local-pack";
import { useStore } from "@/lib/store";

export default function PromptPage() {
  const { pack, source, localPack, loadPack, removePack } = useContent();
  const { state, update } = useStore();

  const [l1, setL1] = useState(state.l1 === "auto" ? "" : state.l1);
  const [learnerInfo, setLearnerInfo] = useState(state.learnerInfo);
  const [edited, setEdited] = useState(false);

  // The store hydrates after the first render, so prefill the form once it is ready.
  useEffect(() => {
    if (edited) return;
    setL1((cur) => cur || (state.l1 && state.l1 !== "auto" ? state.l1 : pack.meta.l1 ? languageName(pack.meta.l1) : ""));
    setLearnerInfo((cur) => cur || state.learnerInfo);
  }, [edited, state.l1, state.learnerInfo, pack.meta.l1]);
  const [sourceName, setSourceName] = useState(pack.meta.sourceDocument ?? "");
  const [targetLanguage, setTargetLanguage] = useState(pack.meta.targetLanguage || DEFAULT_TARGET_LANGUAGE);
  const [level, setLevel] = useState(pack.meta.level ?? "");
  const [copied, setCopied] = useState(false);
  const [askL1, setAskL1] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [jsonStatus, setJsonStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const l1CardRef = useRef<HTMLDivElement | null>(null);

  const prompt = useMemo(
    () =>
      buildContentPrompt({
        l1: languageCode(l1) ?? "",
        l1Name: l1 ? languageName(l1) : "«the learner's first language»",
        targetLanguage: targetLanguage || DEFAULT_TARGET_LANGUAGE,
        learnerInfo,
        sourceName,
        level,
      }),
    [l1, targetLanguage, learnerInfo, sourceName, level],
  );

  async function doCopy() {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setError(null);
    setTimeout(() => setCopied(false), 2500);
  }

  /** The L1 must be chosen before the prompt can be copied. */
  function handleCopyClick() {
    if (!l1) {
      setAskL1(true);
      setError("Type the learner's first language first — it decides which language every translation is written in.");
      l1CardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!learnerInfo.trim()) {
      setAskL1(true);
      setError("Add a little learner information so the agent can personalise the examples (you can keep it very short).");
      return;
    }
    void doCopy();
  }

  function confirmL1() {
    if (!l1) {
      setError("Please type the learner's first language to continue.");
      return;
    }
    setAskL1(false);
    // remember the choice for the rest of the app
    update((s) => ({ ...s, l1, learnerInfo: learnerInfo.trim() ? learnerInfo : s.learnerInfo }));
    void doCopy();
  }

  function download() {
    downloadTextFile("tutolingo-content-prompt.txt", prompt, "text/plain;charset=utf-8");
  }

  /** Open the agent's answer as the live course, without touching any server file. */
  function loadJson(raw = jsonText, label = "pasted on the AI Prompt page") {
    const result = loadPack(raw, label);
    if (!result.ok) {
      setJsonStatus({ tone: "error", text: result.error });
      return;
    }
    setJsonStatus({
      tone: "ok",
      text: describePack(result.pack, `Opened ${result.name} — ${result.empty ? "but it carries nothing teachable, so the path stays empty" : "the whole course is live now"}`),
    });
  }

  /** Keep a copy of the agent's answer as a file, so it can be published too. */
  function saveJsonFile() {
    if (!jsonText.trim()) return;
    try {
      const pack = normalizePack(coercePackText(jsonText).value);
      downloadTextFile("tutolingo-content.json", JSON.stringify(pack, null, 2));
      setJsonStatus({
        tone: "ok",
        text: describePack(pack, "Saved tutolingo-content.json — copy it into the tutolingo/ folder on your host to publish it for everyone"),
      });
    } catch (e) {
      downloadTextFile("tutolingo-content.raw.txt", jsonText, "text/plain;charset=utf-8");
      setJsonStatus({
        tone: "error",
        text: `The text is not valid JSON yet (${e instanceof Error ? e.message : "parse error"}), so it was saved as a .txt for safekeeping. Run it through the Checker to find the problem.`,
      });
    }
  }

  function describePack(p: ContentPack, lead: string): string {
    return `${lead}: ${totalLessons(p).toLocaleString("en-US")} lessons in ${totalUnits(p).toLocaleString("en-US")} units from ${packItemCount(p).toLocaleString("en-US")} items.`;
  }

  return (
    <PageShell>
      <ContentStatus />
      <SectionTitle
        icon="🤖"
        title="AI content prompt"
        sub={`One prompt → one massive JSON file → the whole ${APP_NAME} course`}
      />

      <div className="mb-3 rounded-3xl border-2 border-slate-200 bg-white p-4">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
          <li>Answer the two questions below: type the learner&apos;s first language (L1) and their profile.</li>
          <li>Press <b>Copy AI prompt</b> and paste it into your AI agent together with the PDF.</li>
          <li>
            The agent answers with one single JSON file. Paste that answer into <b>step 3</b> below — it is opened in{" "}
            {APP_NAME} straight away and kept in this browser, so nothing has to be installed or uploaded.
          </li>
          <li>
            Optionally run the <Link href="/check" className="font-black text-[#1CB0F6]">content-pack checker</Link> on the agent&apos;s answer — it lists missing translations,
            thin exercises and empty sections before anything goes live.
          </li>
          <li>Publish it for everyone by saving the JSON as <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">{CONTENT_FILE_PATH}</code> next to the app.</li>
        </ol>
      </div>

      {/* Step 1: the learner */}
      <div ref={l1CardRef} className="card-light mb-3 rounded-3xl border-2 border-[#1CB0F6] bg-white p-4">
        <h2 className="font-black text-slate-800">1 · Who is this content for?</h2>
        <p className="mt-1 text-xs text-slate-400">
          The learner&apos;s first language (L1) decides the language of <b>every</b> translation in the generated file.
        </p>

        <label className={`mt-3 block text-sm font-black text-slate-600 ${l1 ? "" : "text-red-500"}`} htmlFor="prompt-l1">
          Learner&apos;s first language (L1) — type it <span className="text-red-400">*</span>
        </label>
        <L1Input
          id="prompt-l1"
          value={l1}
          packDefault={pack.meta.l1}
          onChange={(v) => {
            setEdited(true);
            setL1(v === "auto" ? "" : v);
            setError(null);
          }}
        />

        <label className="mt-3 block text-sm font-black text-slate-600" htmlFor="prompt-learner">
          Learner information (used to personalise examples)
        </label>
        <textarea
          id="prompt-learner"
          value={learnerInfo}
          onChange={(e) => {
            setEdited(true);
            setLearnerInfo(e.target.value);
            setError(null);
          }}
          rows={4}
          placeholder="e.g. Sara, 27, marketing manager in Tehran, preparing for IELTS 7.5, loves cooking and football, struggles with tenses."
          className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-[#58CC02]"
        />
        <p className="mt-1 text-[11px] text-slate-400">
          Names, age, job, interests, goals, weak areas, exam targets… the more specific, the more personal the generated examples and dialogues.
        </p>

        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-black text-slate-500">Optional: source file, level and target language</summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <label className="text-xs font-bold text-slate-500">
              Source document
              <input
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="Unit 4 – Present Tenses.pdf"
                className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-[#58CC02]"
              />
            </label>
            <label className="text-xs font-bold text-slate-500">
              Level
              <input
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                placeholder="B1–B2"
                className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-[#58CC02]"
              />
            </label>
            <label className="text-xs font-bold text-slate-500">
              Target language
              <input
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-[#58CC02]"
              />
            </label>
          </div>
          <button
            onClick={() => update((s) => ({ ...s, l1: l1 || s.l1, learnerInfo }))}
            className="btn-3d mt-2 rounded-xl border-[#1899D6] bg-[#1CB0F6] px-4 py-2 text-xs font-black text-white"
          >
            Save to my profile
          </button>
        </details>
      </div>

      {/* Step 2: copy */}
      <div className="card-light mb-3 rounded-3xl border-2 border-slate-200 bg-white p-4">
        <h2 className="font-black text-slate-800">2 · Copy the prompt to your AI agent</h2>
        {error && <p className="mt-2 rounded-2xl bg-red-50 px-3 py-2 text-sm font-bold text-red-500">{error}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={handleCopyClick} className="btn-3d rounded-2xl border-[#46A302] bg-[#58CC02] px-6 py-3 text-sm font-black text-white">
            {copied ? "Copied ✓" : "📋 Copy AI prompt"}
          </button>
          <button onClick={download} className="btn-3d rounded-2xl border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-500">
            ⬇️ Download .txt
          </button>
          <Link href="/check" className="btn-3d rounded-2xl border-[#1899D6] bg-[#1CB0F6] px-5 py-3 text-sm font-black text-white">
            🔍 Check a pack
          </Link>
          <span className="self-center text-xs font-bold text-slate-400">
            L1: {l1 ? languageName(l1) : "not selected"} · {prompt.length.toLocaleString("en-US")} characters
          </span>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Tip: paste the prompt together with the PDF, then ask the agent to reply with the JSON only.
        </p>
      </div>

      {/* Step 3: the agent's answer goes straight into the app */}
      <div className="card-light rounded-3xl border-2 border-slate-200 bg-white p-4">
        <h2 className="font-black text-slate-800">3 · Load the JSON your agent wrote</h2>
        <p className="mt-1 text-xs text-slate-400">
          Paste the agent&apos;s answer below (or drop the file on the box) and press <b>Open in {APP_NAME}</b>. The pack is
          parsed the way the app parses it — code fences, smart quotes and surrounding chatter are forgiven — then kept in
          this browser, so a reload keeps your course. Nothing is sent anywhere.
        </p>

        <textarea
          value={jsonText}
          onChange={(e) => {
            setJsonText(e.target.value);
            setJsonStatus(null);
          }}
          rows={10}
          spellCheck={false}
          placeholder={'Paste the JSON here — it should start with { and end with }.'}
          className="mt-2 w-full resize-y rounded-2xl border-2 border-slate-200 bg-slate-50 p-3 font-mono text-[11px] leading-relaxed text-slate-600 outline-none focus:border-[#58CC02]"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadJson()}
            disabled={!jsonText.trim()}
            className={`btn-3d rounded-2xl px-5 py-3 text-sm font-black text-white ${jsonText.trim() ? "border-[#46A302] bg-[#58CC02]" : "border-slate-300 bg-slate-200"}`}
          >
            📥 Open in {APP_NAME}
          </button>
          <button
            onClick={saveJsonFile}
            disabled={!jsonText.trim()}
            className={`btn-3d rounded-2xl px-5 py-3 text-sm font-black ${jsonText.trim() ? "border-[#1899D6] bg-[#1CB0F6] text-white" : "border-slate-300 bg-slate-200 text-slate-400"}`}
          >
            💾 Save as {CONTENT_FILE_PATH.split("/").pop()}
          </button>
          <Link href="/check" className="btn-3d rounded-2xl border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-500">
            🔍 Check it first
          </Link>
          {jsonText.trim() && (
            <button
              onClick={() => {
                setJsonText("");
                setJsonStatus(null);
              }}
              className="rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm font-black text-slate-400"
            >
              Clear
            </button>
          )}
        </div>

        {jsonStatus && (
          <p className={`mt-2 rounded-2xl px-3 py-2 text-xs font-bold ${jsonStatus.tone === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-500"}`}>
            {jsonStatus.tone === "ok" ? "✅ " : "⚠️ "}
            {jsonStatus.text}
          </p>
        )}

        <div className="mt-3">
          <PackDropZone
            compact
            title="…or drop the .json file the agent saved"
            hint="the course opens right away"
            onLoaded={(info) => setJsonStatus({ tone: "ok", text: `Opened ${info.name} — ${info.lessons.toLocaleString("en-US")} lessons in ${info.units.toLocaleString("en-US")} units.` })}
          />
        </div>

        {source === "local" && localPack && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-[#F1FFE5] px-3 py-2">
            <p className="flex-1 text-xs font-bold text-[#4b9417]">
              🟢 {APP_NAME} is running <b>{localPack.name}</b> loaded in this browser.
            </p>
            <Link href="/" className="btn-3d rounded-xl border-[#46A302] bg-[#58CC02] px-3 py-1.5 text-xs font-black text-white">
              Go to my course ▶
            </Link>
            <button onClick={removePack} className="rounded-xl border-2 border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-400">
              Remove uploaded file
            </button>
          </div>
        )}
      </div>

      {/* L1 gate modal */}
      {askL1 && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setAskL1(false)}>
          <div className="animate-pop-in w-full max-w-md rounded-3xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-800">🌍 Which language should translations use?</h3>
            <p className="mt-1 text-sm text-slate-500">
              Type the learner&apos;s first language (any language) so the agent writes every translation in it.
            </p>
            <div className="mt-3">
              <L1Input id="prompt-l1-modal" value={l1} packDefault={pack.meta.l1} onChange={(v) => setL1(v === "auto" ? "" : v)} />
            </div>
            {!learnerInfo.trim() && (
              <textarea
                value={learnerInfo}
                onChange={(e) => setLearnerInfo(e.target.value)}
                rows={3}
                placeholder="Learner information (age, job, interests, goals)…"
                className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-[#58CC02]"
              />
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => setAskL1(false)} className="rounded-2xl border-2 border-slate-200 py-2.5 text-sm font-black text-slate-500">
                Cancel
              </button>
              <button onClick={confirmL1} className="btn-3d rounded-2xl border-[#46A302] bg-[#58CC02] py-2.5 text-sm font-black text-white">
                Save &amp; copy
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
