import React, { useMemo, useState } from "react";
import type { Episode, Lesson } from "../../types";
import { AVATARS, CEFR_LEVELS, L1_OPTIONS, useProfileStore } from "../../store/profile";
import { useSaveEpisode, useSaveLesson } from "../../lib/api";
import { validateLesson, describeReport } from "../../lib/lesson/validate";
import { safeJson } from "../../lib/ai/json";
import { makeSource } from "../../lib/media/sources";
import { events } from "../../lib/events";
import { Button, Field, Input, Textarea } from "../ui";
import { FitFrame, TutorlyBrand, palettes } from "./shell";

const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" };

/** Flix's own accent (the splash config gets the same value). */
export const ACCENT = "#e50914";

/**
 * The player-setup step, shared shape with every other Tutorly game —
 * but the fields are the LEARNER's, because Flix feeds them straight into
 * the lesson-maker prompt. Name → personalisation, CEFR → difficulty, L1 →
 * translations, interests/facts → examples and feedback.
 */
export const LearnerSetup: React.FC<{
  darkMode: boolean;
  onToggleDark: () => void;
  onDone: (openedEpisodeId?: string) => void;
  onBack: () => void;
}> = ({ darkMode, onToggleDark, onDone, onBack }) => {
  const p = palettes(darkMode);
  const profile = useProfileStore();
  const saveEpisode = useSaveEpisode();
  const saveLesson = useSaveLesson();

  const [name, setName] = useState(profile.name);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [level, setLevel] = useState(profile.level);
  const [nativeLanguage, setNativeLanguage] = useState(profile.nativeLanguage);
  const [goals, setGoals] = useState(profile.goals);
  const [interests, setInterests] = useState(profile.interests);
  const [facts, setFacts] = useState(profile.facts);

  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [raw, setRaw] = useState("");
  const [parseNote, setParseNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const card: React.CSSProperties = {
    background: p.card,
    border: `1px solid ${p.border}`,
    borderRadius: 18,
    padding: "clamp(12px, 1.6vw, 20px)",
  };

  const parsed = useMemo(() => (raw.trim().length > 40 ? validateLesson(safeJson(raw)) : null), [raw]);

  const start = async (openEpisode = true) => {
    setError(null);
    setBusy(true);
    try {
      profile.setProfile({ name, avatar, level, nativeLanguage, goals, interests, facts });
      let episodeId: string | undefined;

      if (raw.trim().length > 40) {
        const result = validateLesson(safeJson(raw));
        if (!result.lesson) {
          setError(result.report.errors.join(" · ") || "That JSON is not a lesson pack.");
          setBusy(false);
          return;
        }
        episodeId = await importLesson(result.lesson, videoUrl.trim(), videoTitle.trim());
      }
      onDone(openEpisode ? episodeId : undefined);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /** Build an episode around the pasted pack so the lesson has something to play on. */
  const importLesson = async (lesson: Lesson, url: string, title: string): Promise<string> => {
    const sourceUrl = url || lesson.metadata.videoUrl || "";
    const episode: Episode = {
      id: `ep-${Date.now().toString(36)}`,
      title: title || lesson.metadata.title || "Imported video",
      show: "Imported",
      description: `Imported from a lesson pack · ${lesson.segments.length} segments`,
      cefrLevel: lesson.metadata.cefrLevel,
      targetLanguage: lesson.metadata.targetLanguage,
      poster: lesson.metadata.posterUrl,
      durationSeconds: lesson.metadata.estimatedDurationSeconds || 0,
      sources: sourceUrl ? [makeSource({ url: sourceUrl, label: "Imported source", licence: "owned", quality: 70 })] : [],
      tracks: [],
      lessonId: undefined,
      createdAt: Date.now(),
    };
    await saveEpisode.mutateAsync(episode);
    await saveLesson.mutateAsync({ lesson, episodeId: episode.id });
    events.emit("lesson:loaded", {
      episodeId: episode.id,
      activityCount: lesson.segments.reduce((n, s) => n + s.activities.length, 0),
      segmentCount: lesson.segments.length,
      qualityScore: lesson.quality?.score ?? 0,
    });
    return episode.id;
  };

  return (
    <div className="shell-setup-screen tutorly-shell-root" style={{ background: p.page, color: p.text, fontFamily: "'Montserrat','Inter',sans-serif" }}>
      <FitFrame min={0.66}>
        <div style={{ width: "100%", maxWidth: 1240, margin: "0 auto", padding: "clamp(10px, 2vh, 26px) clamp(12px, 3vw, 30px)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <TutorlyBrand darkMode={darkMode} size="md" />
            <div style={{ display: "flex", gap: 8 }}>                <Button kind="ghost" size="sm" onClick={onBack} style={{ background: "transparent", color: p.text, borderColor: p.border }}>
                ← Splash
              </Button>
              <Button kind="ghost" size="sm" onClick={onToggleDark} style={{ background: "transparent", color: p.text, borderColor: p.border }}>
                {darkMode ? "☀️ Light" : "🌙 Dark"}
              </Button>
            </div>
          </div>

          <h1 style={{ margin: "0 0 6px", fontSize: "clamp(1.3rem, 3.4vh, 2.1rem)", fontWeight: 950, letterSpacing: "-0.02em" }}>
            🎬 Who is watching today?
          </h1>
          <p style={{ margin: "0 0 14px", color: p.sub, fontSize: "clamp(0.85rem, 1.6vh, 1rem)" }}>
            These answers travel inside the AI prompt — every question, example and correction comes back personalised.
          </p>

          <div className="setup-grid">
            <div className="setup-col" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <section style={card}>
                <div style={{ ...labelStyle, color: p.sub, marginBottom: 8 }}>Learner</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>                    <Field label="Name">
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nika" style={inputFor(p, darkMode)} />
                  </Field>
                  <Field label="Level (CEFR)">
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {CEFR_LEVELS.map((value) => (
                        <Button
                          key={value}
                          size="sm"
                          kind={value === level ? "primary" : "ghost"}
                          onClick={() => setLevel(value)}
                          style={value === level ? undefined : { background: "transparent", color: p.text, borderColor: p.border }}
                        >
                          {value}
                        </Button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Native language (for translations)">
                    <select value={nativeLanguage} onChange={(e) => setNativeLanguage(e.target.value)} style={{ ...inputFor(p, darkMode), padding: "10px 12px" }}>
                      {L1_OPTIONS.map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div style={{ ...labelStyle, color: p.sub, margin: "12px 0 6px" }}>Avatar</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {AVATARS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setAvatar(emoji)}
                      aria-label={`avatar ${emoji}`}
                      style={{
                        fontSize: 22,
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        cursor: "pointer",
                        border: `2px solid ${emoji === avatar ? ACCENT : p.border}`,
                        background: emoji === avatar ? `${ACCENT}22` : "transparent",
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </section>

              <section style={card}>
                <div style={{ ...labelStyle, color: p.sub, marginBottom: 8 }}>What should the AI personalise with?</div>
                <div style={{ display: "grid", gap: 12 }}>
                  <Field label="Goals" hint="e.g. pass B1 speaking, understand films without subtitles">
                    <Input value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="Speak more fluently about everyday plans" style={inputFor(p, darkMode)} />
                  </Field>
                  <Field label="Interests">
                    <Input value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="Animation, football, cooking, sci-fi" style={inputFor(p, darkMode)} />
                  </Field>
                  <Field label="Facts to reuse in examples and feedback">
                    <Input value={facts} onChange={(e) => setFacts(e.target.value)} placeholder="Studies architecture in Tehran, walks in the park every morning" style={inputFor(p, darkMode)} />
                  </Field>
                </div>
              </section>
            </div>

            <div className="setup-col" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <section style={card}>
                <div style={{ ...labelStyle, color: p.sub, marginBottom: 8 }}>Optional — bring your own video</div>
                <div style={{ display: "grid", gap: 10 }}>
                  <Field label="Video URL" hint="HLS (.m3u8), DASH (.mpd) or a direct mp4/webm — authorised sources only">
                    <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://…/movie.m3u8" style={inputFor(p, darkMode)} />
                  </Field>
                  <Field label="Title">
                    <Input value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="Episode title" style={inputFor(p, darkMode)} />
                  </Field>
                </div>
              </section>

              <section style={card}>
                <div style={{ ...labelStyle, color: p.sub, marginBottom: 8 }}>Optional — paste a lesson JSON</div>
                <Textarea
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  rows={8}
                  placeholder='{ "metadata": { … }, "segments": [ … ] }'
                  style={{ ...inputFor(p, darkMode), fontFamily: "ui-monospace, monospace", fontSize: 12 }}
                />
                {parseNote && <div style={{ marginTop: 8, fontSize: 12, color: p.sub }}>{parseNote}</div>}
                {parsed && (
                  <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: parsed.report.errors.length ? "#e5484d" : ACCENT }}>
                    {describeReport(parsed.report)}
                  </div>
                )}
                <button
                  onClick={() => {
                    if (!raw.trim()) return;
                    setParseNote("Reading…");
                    const result = validateLesson(safeJson(raw));
                    setParseNote(describeReport(result.report));
                  }}
                  style={{ marginTop: 10, background: "transparent", border: "none", color: ACCENT, fontWeight: 900, cursor: "pointer", fontSize: 12 }}
                >
                  Check this JSON →
                </button>
              </section>

              <section style={{ ...card, display: "flex", flexDirection: "column", gap: 10 }}>
                {error && <div style={{ color: "#e5484d", fontSize: 13, fontWeight: 700 }}>{error}</div>}
                <Button kind="primary" size="lg" onClick={() => void start(true)} disabled={busy}>
                  {busy ? "Preparing…" : "▶ Start watching"}
                </Button>
                <Button
                  kind="ghost"
                  onClick={() => void start(false)}
                  disabled={busy}
                  style={{ background: "transparent", color: p.text, borderColor: p.border }}
                >
                  Save profile only
                </Button>
                <div style={{ fontSize: 11, color: p.sub }}>
                  Splash text, subtext and logo follow your Tutorly dashboard settings. Everything here is stored on this device.
                </div>
              </section>
            </div>
          </div>
        </div>
      </FitFrame>
    </div>
  );
};

function inputFor(p: ReturnType<typeof palettes>, dark: boolean): React.CSSProperties {
  return {
    width: "100%",
    background: dark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)",
    border: `1px solid ${p.border}`,
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 14,
    color: p.text,
    outline: "none",
  };
}


