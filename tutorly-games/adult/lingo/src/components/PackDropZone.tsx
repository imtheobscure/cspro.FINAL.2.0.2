"use client";

import React, { useRef, useState } from "react";
import { packItemCount } from "@/content/tutolingo";
import { totalLessons, totalUnits } from "@/content/units";
import { useContent } from "@/lib/content-provider";
import { readPackFile } from "@/lib/local-pack";

export interface LoadedPackInfo {
  name: string;
  units: number;
  lessons: number;
  items: number;
}

/**
 * Drop (or pick) a Lingo content JSON and the course appears immediately.
 *
 * This is the phone/deployed-site path into the app: there is no web root to copy
 * `tutolingo-content.json` into, so the file is opened in the browser and kept
 * there (see src/lib/local-pack.ts).
 */
export function PackDropZone({
  title = "Drop your content JSON here",
  hint = "or tap to choose the file the AI agent gave you",
  compact = false,
  onLoaded,
  className = "",
}: {
  title?: string;
  hint?: string;
  compact?: boolean;
  onLoaded?: (info: LoadedPackInfo) => void;
  className?: string;
}) {
  const { loadPack } = useContent();
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  function apply(text: string, name: string) {
    const result = loadPack(text, name);
    if (!result.ok) {
      setStatus({ tone: "error", text: `${name} could not be opened — ${result.error}` });
      return;
    }
    const info: LoadedPackInfo = {
      name: result.name,
      units: totalUnits(result.pack),
      lessons: totalLessons(result.pack),
      items: packItemCount(result.pack),
    };
    if (result.empty) {
      setStatus({
        tone: "error",
        text: `${name} is valid JSON but carries nothing teachable — no vocabulary, grammar, idioms, conversations or sentences. Run it through the Checker.`,
      });
    } else {
      setStatus({
        tone: "ok",
        text: `Loaded ${info.lessons.toLocaleString("en-US")} lessons in ${info.units.toLocaleString("en-US")} units from ${name}.`,
      });
    }
    onLoaded?.(info);
  }

  async function takeFiles(files: FileList | null | undefined) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      apply(await readPackFile(file), file.name);
    } catch (e) {
      setStatus({ tone: "error", text: e instanceof Error ? e.message : `${file.name} could not be read.` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void takeFiles(e.dataTransfer.files);
        }}
        className={`block cursor-pointer rounded-3xl border-2 border-dashed text-center transition ${
          dragging ? "border-[#58CC02] bg-[#F1FFE5]" : "border-[#1CB0F6] bg-[#F2FAFF] hover:bg-[#E8F6FF]"
        } ${compact ? "px-4 py-3" : "px-6 py-5"}`}
      >
        <input
          type="file"
          accept=".json,application/json,text/plain"
          className="sr-only"
          onChange={(e) => {
            void takeFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <span className={`block ${compact ? "text-2xl" : "text-4xl"}`}>{busy ? "⏳" : dragging ? "📥" : "📄"}</span>
        <span className={`block font-black text-slate-800 ${compact ? "mt-1 text-sm" : "mt-2"}`}>
          {busy ? "Opening the file…" : dragging ? "Drop it to load the course" : title}
        </span>
        <span className="mt-0.5 block text-xs font-bold text-slate-500">{hint}</span>
        <span className="mt-2 inline-block rounded-xl border-2 border-[#1899D6] bg-[#1CB0F6] px-4 py-2 text-xs font-black text-white shadow-[0_3px_0_#1681b8]">
          Choose a .json file
        </span>
      </label>

      {status && (
        <p
          className={`mt-2 rounded-2xl px-3 py-2 text-xs font-bold ${
            status.tone === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-500"
          }`}
        >
          {status.tone === "ok" ? "✅ " : "⚠️ "}
          {status.text}
        </p>
      )}
    </div>
  );
}
