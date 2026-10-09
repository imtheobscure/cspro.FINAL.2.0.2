import React, { useEffect, useMemo, useState } from "react";
import type { ActivityType, Episode, Lesson, SubtitleCue } from "../../types";
import { ALL_ACTIVITY_TYPES, describeReport, validateLesson } from "../../lib/lesson/validate";
import {
  buildCuePrompt,
  buildLessonPrompt,
  buildSegmentPrompt,
  estimateTokens,
  type LessonMakerInput,
} from "../../lib/ai/prompt";
import { safeJson, prettyJson } from "../../lib/ai/json";
import { cuesToTranscript, formatClock, qaCues, searchCues, segmentCues, serializeCues, secondsToTimecode } from "../../lib/subtitles";
import { useProfileStore } from "../../store/profile";
import { useLessonStore } from "../../store/lesson";
import { events } from "../../lib/events";
import { downloadJson, downloadText, useSaveLesson } from "../../lib/api";
import { Button, Chip, Field, Input, ProgressBar, Tabs, Textarea } from "../ui";

type MakerTab = "prompt" | "paste" | "search" | "export";

/**
 * The lesson maker.
 *
 * This is the flow from the standalone Video-Lesson app, rebuilt inside the
 * player — with one structural improvement: the SUBTITLES ARE ALREADY IN THE
 * PROMPT. It reads the loaded text track, segments it on real pauses, and builds
 * a prompt that carries every cue's timestamp, so the activities the AI returns
 * land on the moments they teach.
 *
 *   1. Copy AI prompt  → paste into ChatGPT / Claude / Gemini
 *   2. Paste JSON      → validated, repaired and audited before class
 *   3. Subtitle search → find a line, jump to it, or make a micro-lesson for it
 *   4. Export          → VTT/SRT, transcript, QA report, clean JSON
 */
export const LessonMaker: React.FC<{
  episode: Episode;
  cues: SubtitleCue[];
  lesson: Lesson | null;
  time: number;
  /** When the learner clicks 📋 on a transcript line, this is that line. */
  focusCue: SubtitleCue | null;
  onSeek: (time: number) => void;
  onLessonLoaded: (lesson: Lesson) => void;
  onCopyPrompt: (input: { kind: "full" | "segment" | "cue"; label: string; text: string }) => void;
}> = ({ episode, cues, lesson, time, focusCue, onSeek, onLessonLoaded, onCopyPrompt }) => {
  const learner = useProfileStore((s) => s.learner());
  const saveLesson = useSaveLesson();
  const setLesson = useLessonStore((s) => s.setLesson);

  const [tab, setTab] = useState<MakerTab>("prompt");
  const [segmentsWanted, setSegmentsWanted] = useState(10);
  const [perSegment, setPerSegment] = useState(3);
  const [focus, setFocus] = useState("");
  const [types, setTypes] = useState<ActivityType[]>(ALL_ACTIVITY_TYPES);
  const [openPrompt, setOpenPrompt] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [raw, setRaw] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (focusCue) {
      setTab("search");
      setSearch(focusCue.text.split(/\s+/).slice(0, 4).join(" "));
    }
  }, [focusCue]);

  const autoSegments = useMemo(() => segmentCues(cues, segmentsWanted), [cues, segmentsWanted]);

  const base: LessonMakerInput = useMemo(
    () => ({
      episodeTitle: episode.title,
      show: episode.show,
      videoUrl: episode.sources[0]?.url,
      durationSeconds: episode.durationSeconds || (cues.at(-1)?.endTime ?? 0),
      cefrLevel: lesson?.metadata.cefrLevel || learner.level || "B1",
      targetLanguage: lesson?.metadata.targetLanguage || episode.targetLanguage || "English",
      learnerL1: learner.nativeLanguage || "fa",
      learner,
      cues,
      segmentCount: segmentsWanted,
      activitiesPerSegment: perSegment,
      activityTypes: types,
      focus: focus || undefined,
      transcriptSource: `${cues.length} cues from the ${episode.tracks.filter((t) => t.kind === "text").map((t) => t.label).join(" + ") || "loaded"} subtitle track`,
    }),
    [episode, cues, lesson, learner, segmentsWanted, perSegment, types, focus],
  );

  const prompts = useMemo(() => {
    const list: { id: string; kind: "full" | "segment" | "cue"; label: string; text: string }[] = [
      { id: "full", kind: "full", label: `Whole episode · ${autoSegments.length} segments`, text: buildLessonPrompt(base) },
    ];
    for (const [index, auto] of autoSegments.entries()) {
      const segmentCueSlice = cues.slice(auto.startCue, auto.endCue + 1);
      list.push({
        id: `seg-${index}`,
        kind: "segment",
        label: `Segment ${index + 1} · ${formatClock(auto.startTime)}–${formatClock(auto.endTime)}`,
        text: buildSegmentPrompt({ ...base, segment: { index, title: auto.title, startTime: auto.startTime, endTime: auto.endTime, cues: segmentCueSlice } }),
      });
    }
    if (focusCue) {
      const at = cues.findIndex((cue) => cue.id === focusCue.id);
      list.unshift({
        id: `cue-${focusCue.id}`,
        kind: "cue",
        label: `Line at ${formatClock(focusCue.startTime)} — micro-lesson`,
        text: buildCuePrompt(base, focusCue, cues.slice(Math.max(0, at - 2), at + 3)),
      });
    }
    return list;
  }, [base, autoSegments, cues, focusCue]);

  const copy = async (id: string, kind: "full" | "segment" | "cue", label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopiedId(id);
    onCopyPrompt({ kind, label, text });
    events.emit("maker:prompt-copied", { promptId: id, kind, characters: text.length, tokensEstimate: estimateTokens(text) });
    window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 2200);
  };

  const parsed = useMemo(() => (raw.trim().length > 40 ? validateLesson(safeJson(raw)) : null), [raw]);
  const qa = useMemo(() => qaCues(cues), [cues]);
  const results = useMemo(() => searchCues(cues, search, 60), [cues, search]);

  const loadLesson = async () => {
    if (!parsed?.lesson) return;
    const next = { ...parsed.lesson, metadata: { ...parsed.lesson.metadata, episodeId: episode.id } };
    await saveLesson.mutateAsync({ lesson: next, episodeId: episode.id });
    setLesson(next, episode.id);
    onLessonLoaded(next);
    events.emit("maker:lesson-parsed", {
      ok: true,
      errors: parsed.report.errors.length,
      warnings: parsed.report.warnings.length,
      activities: parsed.report.activityCount,
    });
  };

  const activeSegment = autoSegments.find((auto) => time >= auto.startTime && time < auto.endTime);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b p-2.5" style={{ borderColor: "var(--color-tf-line)" }}>
        <Tabs
          value={tab}
          onChange={(id) => setTab(id as MakerTab)}
          tabs={[
            { id: "prompt", label: "1 · AI prompt", icon: "📋" },
            { id: "paste", label: "2 · Paste JSON", icon: "📥" },
            { id: "search", label: "3 · Subtitle search", icon: "🔍" },
            { id: "export", label: "4 · Export", icon: "💾" },
          ]}
        />
      </div>

      <div className="tf-scroll min-h-0 flex-1 overflow-y-auto p-3">
        {tab === "prompt" && (
          <div className="space-y-3">
            <div className="rounded-2xl border p-3" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}>
              <div className="text-[12px] font-bold leading-relaxed">
                1️⃣ Copy a prompt → 2️⃣ paste it into any AI chat → 3️⃣ paste the JSON it returns in <b>Paste JSON</b> → 4️⃣ the activities appear on the
                timeline.
              </div>
              <div className="mt-1.5 text-[11px]" style={{ color: "var(--color-tf-sub)" }}>
                The prompt already contains this video's {cues.length} subtitle lines with their real timestamps, plus the learner profile — nothing to
                type by hand.
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Field label={`Segments: ${segmentsWanted}`} hint="The lesson schema asks for 8–16">
                <input type="range" min={4} max={16} value={segmentsWanted} onChange={(event) => setSegmentsWanted(Number(event.target.value))} className="w-full accent-[var(--color-tf-brand)]" />
              </Field>
              <Field label={`Activities per segment: ${perSegment}`}>
                <input type="range" min={2} max={6} value={perSegment} onChange={(event) => setPerSegment(Number(event.target.value))} className="w-full accent-[var(--color-tf-brand)]" />
              </Field>
              <Field label="Teaching focus (optional)" hint="e.g. past tenses, job interviews, conditionals">
                <Input value={focus} onChange={(event) => setFocus(event.target.value)} placeholder="What should this pack drill?" />
              </Field>
              <div className="rounded-xl border p-2.5 text-[11px]" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}>
                <b>≈{autoSegments.length * perSegment} activities</b> requested · {types.length}/{ALL_ACTIVITY_TYPES.length} activity types enabled ·{" "}
                {formatClock(episode.durationSeconds || (cues.at(-1)?.endTime ?? 0))} of video
              </div>
            </div>

            <div>
              <div className="mb-1 text-[11px] font-black uppercase tracking-wider" style={{ color: "var(--color-tf-sub)" }}>
                Activity types the AI must use
              </div>
              <div className="flex flex-wrap gap-1">
                {ALL_ACTIVITY_TYPES.map((type) => (
                  <Chip
                    key={type}
                    active={types.includes(type)}
                    tone={types.includes(type) ? "brand" : "muted"}
                    onClick={() => setTypes((current) => (current.includes(type) ? current.filter((t) => t !== type) : [...current, type]))}
                  >
                    {type}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {prompts.map((prompt) => (
                <div key={prompt.id} className="rounded-2xl border p-2.5" style={{ borderColor: copiedId === prompt.id ? "var(--color-tf-green)" : "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone={prompt.kind === "full" ? "brand" : prompt.kind === "cue" ? "purple" : "muted"}>{prompt.kind}</Chip>
                    <span className="text-[12.5px] font-black">{prompt.label}</span>
                    <span className="text-[11px]" style={{ color: "var(--color-tf-sub)" }}>
                      {prompt.text.length.toLocaleString()} chars ≈ {estimateTokens(prompt.text).toLocaleString()} tokens
                    </span>
                    <div className="ml-auto flex gap-1.5">
                      <Button size="sm" kind={copiedId === prompt.id ? "success" : "primary"} onClick={() => void copy(prompt.id, prompt.kind, prompt.label, prompt.text)}>
                        {copiedId === prompt.id ? "✓ Copied" : "📋 Copy"}
                      </Button>
                      <Button size="sm" onClick={() => setOpenPrompt(openPrompt === prompt.id ? null : prompt.id)}>
                        {openPrompt === prompt.id ? "Hide" : "Preview"}
                      </Button>
                      <Button size="sm" onClick={() => downloadText(`${episode.id}-${prompt.id}.txt`, prompt.text, "text/plain")} title="Download this prompt">
                        ⤓
                      </Button>
                    </div>
                  </div>
                  {openPrompt === prompt.id && (
                    <pre className="tf-scroll mt-2 max-h-[38vh] overflow-auto whitespace-pre-wrap rounded-xl p-2.5 text-[11.5px] leading-relaxed" style={{ background: "var(--color-tf-panel)", color: "var(--color-tf-sub)" }}>
                      {prompt.text}
                    </pre>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                kind="primary"
                onClick={() => void copy("all", "full", "Every prompt in one document", prompts.map((prompt) => `### ${prompt.label}\n\n${prompt.text}`).join("\n\n---\n\n"))}
              >
                📋 Copy every prompt
              </Button>
              <Button onClick={() => setTab("paste")}>Next: paste the JSON →</Button>
              {activeSegment && (
                <Button
                  onClick={() => {
                    const index = autoSegments.indexOf(activeSegment);
                    const prompt = prompts.find((p) => p.id === `seg-${index}`);
                    if (prompt) void copy(prompt.id, "segment", prompt.label, prompt.text);
                  }}
                >
                  🎯 Copy the prompt for the segment playing now
                </Button>
              )}
            </div>
          </div>
        )}

        {tab === "paste" && (
          <div className="space-y-3">
            <div className="text-[12px] font-bold">
              Paste the JSON the AI returned. It is validated, repairable problems are fixed automatically, and a quality report tells you what to expect
              before class.
            </div>
            <Textarea
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              rows={10}
              placeholder='{ "metadata": { "title": … }, "segments": [ { "activities": [ … ] } ] }'
              style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button kind="primary" onClick={() => void loadLesson()} disabled={!parsed?.lesson}>
                {parsed?.lesson ? "📥 Load this lesson" : "Nothing valid yet"}
              </Button>
              <Button onClick={() => setRaw("")}>Clear</Button>
              <Button onClick={() => void navigator.clipboard.writeText(buildLessonPrompt(base))}>📋 Re-copy the prompt</Button>
              {!!cues.length && (
                <Button onClick={() => void navigator.clipboard.writeText(cuesToTranscript(cues, { withTimestamps: true, withSpeakers: true }))} title="The transcript the AI should receive">
                  📋 Copy the transcript
                </Button>
              )}
            </div>

            {parsed && (
              <div className="space-y-2">
                <div className="rounded-2xl border p-3" style={{ borderColor: parsed.report.errors.length ? "#7f1d1d" : "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone={parsed.report.errors.length ? "muted" : "teal"}>{parsed.report.errors.length ? `${parsed.report.errors.length} errors` : "no errors"}</Chip>
                    <Chip tone="gold">{parsed.report.activityCount} activities</Chip>
                    <Chip tone="muted">{parsed.report.segmentCount} segments</Chip>
                    <Chip tone="muted">{parsed.report.hardCount} hard</Chip>
                    <Chip tone={parsed.report.score >= 70 ? "teal" : "gold"}>quality {parsed.report.score}/100</Chip>
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={parsed.report.score} max={100} height={6} />
                  </div>
                  <div className="mt-1.5 text-[11.5px] font-bold">{describeReport(parsed.report)}</div>
                  {!!parsed.report.errors.length && (
                    <ul className="mt-2 ml-4 list-disc text-[11.5px]" style={{ color: "#ff9b9b" }}>
                      {parsed.report.errors.slice(0, 8).map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  )}
                  {!!parsed.report.warnings.length && (
                    <ul className="mt-2 ml-4 list-disc text-[11.5px]" style={{ color: "var(--color-tf-gold)" }}>
                      {parsed.report.warnings.slice(0, 8).map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  )}
                  {!!parsed.report.missingTypes.length && (
                    <div className="mt-1.5 text-[11.5px]" style={{ color: "var(--color-tf-sub)" }}>
                      Types never used: {parsed.report.missingTypes.join(", ")}
                    </div>
                  )}
                </div>
                {parsed.lesson && (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(parsed.report.byType).map(([type, count]) => (
                      <Chip key={type} tone="muted">
                        {type} × {count}
                      </Chip>
                    ))}
                  </div>
                )}
              </div>
            )}

            {lesson && (
              <div className="rounded-2xl border p-3 text-[12px] font-bold" style={{ borderColor: "var(--color-tf-green)", background: "color-mix(in srgb, var(--color-tf-green) 10%, transparent)" }}>
                ✅ This episode already has a lesson loaded — pasting a new one replaces it (your XP and journal stay).
                <div className="mt-1.5 flex gap-1.5">
                  <Button size="sm" onClick={() => downloadJson(`${episode.id}-lesson.json`, lesson)}>
                    ⤓ Download the current lesson
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "search" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the subtitles… (word, phrase, speaker)" />
              {search.trim().length > 1 && (
                <Button
                  onClick={() =>
                    window.open(
                      `https://www.google.com/search?q=${encodeURIComponent(`subtitle file "${search.trim()}" srt vtt`)}`,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                  title="Look for a subtitle file on the web"
                >
                  🌐 Find subtitles
                </Button>
              )}
            </div>

            {focusCue && (
              <div className="rounded-2xl border p-3" style={{ borderColor: "var(--color-tf-purple)", background: "color-mix(in srgb, var(--color-tf-purple) 10%, transparent)" }}>
                <div className="text-[11px] font-black uppercase tracking-wider" style={{ color: "var(--color-tf-purple)" }}>
                  Micro-lesson for the line you picked
                </div>
                <div className="mt-1 text-[13px] font-bold">
                  “{focusCue.text}” <span style={{ color: "var(--color-tf-sub)" }}>· {secondsToTimecode(focusCue.startTime)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Button size="sm" kind="primary" onClick={() => void copy(`cue-${focusCue.id}`, "cue", "Line micro-lesson", buildCuePrompt(base, focusCue, cues.slice(cues.indexOf(focusCue) + 1, cues.indexOf(focusCue) + 4)))}>
                    📋 Copy the line prompt
                  </Button>
                  <Button size="sm" onClick={() => onSeek(focusCue.startTime)}>
                    ▶ Go to this line
                  </Button>
                  <Button size="sm" onClick={() => setFocusCueClearedReset()}>
                    Clear
                  </Button>
                </div>
              </div>
            )}

            <div className="text-[11px] font-bold" style={{ color: "var(--color-tf-sub)" }}>
              {search.trim().length > 1 ? `${results.length} lines match “${search.trim()}”` : `${cues.length} lines in this video`}
            </div>

            <div className="space-y-1.5">
              {(search.trim().length > 1 ? results.map((match) => ({ cue: match.cue, context: match.context })) : cues.slice(0, 80).map((cue) => ({ cue, context: "" }))).map(({ cue, context }, index) => (
                <div key={`${cue.id}-${index}`} className="rounded-xl border p-2" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}>
                  <div className="flex items-center gap-2 text-[10.5px] font-bold" style={{ color: "var(--color-tf-sub)" }}>
                    <span className="tabular-nums">{secondsToTimecode(cue.startTime)}</span>
                    {cue.speaker && <span style={{ color: "var(--color-tf-gold)" }}>{cue.speaker}</span>}
                  </div>
                  <div className="text-[13px] font-semibold">{context || cue.text}</div>
                  <div className="mt-1 flex gap-1.5">
                    <Button size="sm" onClick={() => onSeek(cue.startTime)}>
                      ▶ Jump
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        void copy(
                          `line-${cue.id}`,
                          "cue",
                          `Line at ${formatClock(cue.startTime)}`,
                          buildCuePrompt(base, cue, cues.slice(Math.max(0, cues.indexOf(cue) - 1), cues.indexOf(cue) + 2)),
                        )
                      }
                    >
                      📋 Line AI prompt
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "export" && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              <Button onClick={() => downloadText(`${episode.id}.vtt`, serializeCues(cues, "vtt"), "text/vtt")}>⤓ WebVTT</Button>
              <Button onClick={() => downloadText(`${episode.id}.srt`, serializeCues(cues, "srt"), "application/x-subrip")}>⤓ SRT</Button>
              <Button onClick={() => downloadText(`${episode.id}-transcript.txt`, cuesToTranscript(cues, { withTimestamps: true, withSpeakers: true, withTranslation: true }), "text/plain")}>⤓ Transcript (with translation)</Button>
              {lesson && <Button onClick={() => downloadJson(`${episode.id}-lesson.json`, lesson)}>⤓ Lesson JSON</Button>}
              <Button
                onClick={() => {
                  const clean = prompts.map((prompt) => prompt.text).join("\n\n---\n\n");
                  downloadText(`${episode.id}-ai-prompts.txt`, clean, "text/plain");
                }}
              >
                ⤓ All AI prompts
              </Button>
            </div>

            <div className="rounded-2xl border p-3" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] font-black">Subtitle QA</span>
                <Chip tone={qa.health >= 85 ? "teal" : qa.health >= 60 ? "gold" : "muted"}>health {qa.health}%</Chip>
                <Chip tone="muted">{qa.cues} cues</Chip>
                <Chip tone="muted">{qa.words} words</Chip>
                <Chip tone="muted">max {qa.readingSpeedMax} chars/sec</Chip>
                <Chip tone="muted">{qa.issues.filter((issue) => issue.level === "error").length} errors</Chip>
              </div>
              <div className="mt-2">
                <ProgressBar value={qa.health} height={6} />
              </div>
              <div className="tf-scroll mt-2 max-h-[26vh] overflow-y-auto">
                {qa.issues.length === 0 && <div className="text-[12px]" style={{ color: "var(--color-tf-sub)" }}>No problems found — this track is classroom-ready.</div>}
                {qa.issues.slice(0, 60).map((issue, index) => (
                  <button
                    key={`${issue.cueIndex}-${index}`}
                    onClick={() => onSeek(cues[issue.cueIndex]?.startTime ?? 0)}
                    className="mb-1 flex w-full items-center gap-2 rounded-lg border px-2 py-1 text-left text-[11.5px]"
                    style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel)" }}
                  >
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-black"
                      style={{
                        background: issue.level === "error" ? "#7f1d1d" : issue.level === "warning" ? "color-mix(in srgb, var(--color-tf-gold) 25%, transparent)" : "var(--color-tf-line)",
                        color: issue.level === "error" ? "#ffd7d7" : "var(--color-tf-text)",
                      }}
                    >
                      {issue.level}
                    </span>
                    <span className="tabular-nums" style={{ color: "var(--color-tf-sub)" }}>
                      {secondsToTimecode(cues[issue.cueIndex]?.startTime ?? 0)}
                    </span>
                    <span className="flex-1">{issue.message}</span>
                  </button>
                ))}
              </div>
            </div>

            {lesson?.quality && (
              <div className="rounded-2xl border p-3" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}>
                <div className="text-[12px] font-black">Loaded lesson report</div>
                <div className="mt-1 text-[11.5px]" style={{ color: "var(--color-tf-sub)" }}>
                  {describeReport(lesson.quality)}
                </div>
                {!!lesson.quality.warnings.length && (
                  <ul className="mt-1.5 ml-4 list-disc text-[11.5px]" style={{ color: "var(--color-tf-gold)" }}>
                    {lesson.quality.warnings.slice(0, 6).map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="rounded-2xl border p-3 text-[11.5px]" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}>
              <div className="font-black">📋 Clean JSON of the loaded lesson</div>
              {lesson ? (
                <>
                  <pre className="tf-scroll mt-1.5 max-h-[24vh] overflow-auto rounded-xl p-2" style={{ background: "var(--color-tf-panel)", color: "var(--color-tf-sub)" }}>
                    {prettyJson({ ...lesson, quality: undefined }).slice(0, 4000)}
                  </pre>
                  <Button size="sm" className="mt-1.5" onClick={() => void navigator.clipboard.writeText(prettyJson({ ...lesson, quality: undefined }))}>
                    📋 Copy JSON
                  </Button>
                </>
              ) : (
                <div style={{ color: "var(--color-tf-sub)" }}>No lesson loaded yet.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  /** Clearing the picked line just empties the search box; the maker stays open. */
  function setFocusCueClearedReset() {
    setSearch("");
  }
};
