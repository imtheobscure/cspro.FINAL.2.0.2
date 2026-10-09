import React from "react";
import { usePlayerStore } from "../../store/player";
import { useProfileStore } from "../../store/profile";
import { useLessonStore } from "../../store/lesson";
import { usePartyStore } from "../../store/party";
import { Button, Chip, Field, Modal, Tabs } from "../ui";
import { PIPELINE_NOTES } from "../../lib/media/pipeline";
import { LICENCE_LABELS } from "../../lib/media/sources";

/**
 * Settings.
 *
 * Grouped by what a teacher actually changes mid-class: how the video plays,
 * how the subtitles look, how the lesson behaves, and what is stored on this
 * device. The streaming engine picker is here because the fallback chain is a
 * classroom reliability feature, not a developer toy.
 */
export const SettingsModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const player = usePlayerStore();
  const profile = useProfileStore();
  const lessonReset = useLessonStore((s) => s.reset);
  const leaveRoom = usePartyStore((s) => s.leave);
  const [tab, setTab] = React.useState("playback");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="⚙️ Settings"
      maxWidth={760}
      footer={
        <div className="flex items-center gap-2">
          <Button kind="primary" onClick={onClose}>
            Done
          </Button>
          <span className="text-[11px] font-bold" style={{ color: "var(--color-tf-sub)" }}>
            Everything here is stored on this device only.
          </span>
        </div>
      }
    >
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "playback", label: "Playback", icon: "▶" },
          { id: "subtitles", label: "Subtitles", icon: "💬" },
          { id: "lesson", label: "Lesson", icon: "🎓" },
          { id: "data", label: "Data", icon: "💾" },
        ]}
      />

      <div className="mt-4 space-y-4">
        {tab === "playback" && (
          <>
            <Field label="Streaming engine" hint={PIPELINE_NOTES[profile.preferEngine === "hlsjs" ? "hlsjs" : profile.preferEngine === "native" ? "native" : "shaka"]}>
              <div className="flex flex-wrap gap-1.5">
                {(["auto", "shaka", "hlsjs", "native"] as const).map((engine) => (
                  <Chip key={engine} tone={profile.preferEngine === engine ? "brand" : "muted"} active={profile.preferEngine === engine} onClick={() => profile.setPreference({ preferEngine: engine })}>
                    {engine === "auto" ? "Auto (recommended)" : engine}
                  </Chip>
                ))}
              </div>
            </Field>
            <div className="grid gap-2 sm:grid-cols-2">
              <ToggleRow label="Autoplay when an episode opens" value={profile.autoPlay} onChange={(value) => profile.setPreference({ autoPlay: value })} />
              <ToggleRow label="Animations (overlays, transitions)" value={profile.animations} onChange={(value) => profile.setPreference({ animations: value })} />
              <ToggleRow label="Studio mode (event log + diagnostics)" value={profile.studio} onChange={(value) => profile.setPreference({ studio: value })} />
              <ToggleRow label="Show the splash screen on start" value={profile.showSplash} onChange={(value) => profile.setPreference({ showSplash: value })} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label={`Playback rate ${player.rate}×`}>
                <input type="range" min={0.5} max={2} step={0.05} value={player.rate} onChange={(event) => player.setPreference({ rate: Number(event.target.value) })} className="w-full accent-[var(--color-tf-brand)]" />
              </Field>
              <Field label={`Volume ${Math.round(player.volume * 100)}%`}>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={player.volume}
                  onChange={(event) => player.setPreference({ volume: Number(event.target.value), muted: Number(event.target.value) === 0 })}
                  className="w-full accent-[var(--color-tf-brand)]"
                />
              </Field>
            </div>
          </>
        )}

        {tab === "subtitles" && (
          <>
            <Field label="Subtitle mode">
              <div className="flex flex-wrap gap-1.5">
                {(["off", "original", "translation", "dual"] as const).map((mode) => (
                  <Chip key={mode} tone={player.subtitleMode === mode ? "brand" : "muted"} active={player.subtitleMode === mode} onClick={() => player.setSubtitleMode(mode)}>
                    {mode}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label={`Subtitle size ${player.subtitleScale.toFixed(2)}×`}>
              <input type="range" min={0.7} max={1.8} step={0.05} value={player.subtitleScale} onChange={(event) => player.setPreference({ subtitleScale: Number(event.target.value) })} className="w-full accent-[var(--color-tf-brand)]" />
            </Field>
            <div className="grid gap-2 sm:grid-cols-2">
              <ToggleRow label="Highlight the word being spoken" value={player.showWordHighlight} onChange={(value) => player.setPreference({ showWordHighlight: value })} />
              <ToggleRow label="Keep the transcript in step" value={player.followTranscript} onChange={(value) => player.setPreference({ followTranscript: value })} />
              <ToggleRow label="Pause after every subtitle line" value={player.pauseAfterLine} onChange={(value) => player.setPreference({ pauseAfterLine: value })} />
              <Field label="Dual-subtitle order">
                <div className="flex gap-1.5">
                  <Chip tone={player.dualOrder === "original-first" ? "brand" : "muted"} active={player.dualOrder === "original-first"} onClick={() => player.setPreference({ dualOrder: "original-first" })}>
                    original on top
                  </Chip>
                  <Chip tone={player.dualOrder === "translation-first" ? "brand" : "muted"} active={player.dualOrder === "translation-first"} onClick={() => player.setPreference({ dualOrder: "translation-first" })}>
                    translation on top
                  </Chip>
                </div>
              </Field>
            </div>
          </>
        )}

        {tab === "lesson" && (
          <>
            <div className="rounded-2xl border p-3 text-[12px] leading-relaxed" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}>
              The lesson engine pauses the video at every activity timestamp, scores the answer, explains why it is right or wrong, awards XP and
              continues. Activities that are not marked <b>requiredForNext</b> can be skipped.
            </div>

            {/*
              Catalog credentials. This build is static, so the keys belong in this
              browser; the Discover view has the same fields inline for convenience.
            */}
            <Field
              label="Discover catalog keys"
              hint="TMDB searches every movie and TV series (cast, seasons, trailers, official streaming destinations). A YouTube Data API key unlocks YouTube search, and a Vimeo access token unlocks its documentary catalog. All are stored in this browser only; Dailymotion search and playback need no key."
            >
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <input
                  value={profile.tmdbKey}
                  onChange={(event) => profile.setCatalogKeys({ tmdbKey: event.target.value.trim() })}
                  placeholder="TMDB API key"
                  className="rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)", color: "var(--color-tf-text)" }}
                />
                <input
                  value={profile.youtubeKey}
                  onChange={(event) => profile.setCatalogKeys({ youtubeKey: event.target.value.trim() })}
                  placeholder="YouTube Data API key (optional)"
                  className="rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)", color: "var(--color-tf-text)" }}
                />
                <input
                  value={profile.vimeoKey}
                  onChange={(event) => profile.setCatalogKeys({ vimeoKey: event.target.value.trim() })}
                  placeholder="Vimeo access token (optional)"
                  className="rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)", color: "var(--color-tf-text)" }}
                />
                <input
                  value={profile.catalogRegion}
                  onChange={(event) => profile.setCatalogKeys({ catalogRegion: event.target.value.trim().toUpperCase().slice(0, 2) })}
                  placeholder="Region (US, GB…)"
                  className="rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)", color: "var(--color-tf-text)" }}
                />
              </div>
            </Field>
            <Field label={`Learner profile — ${profile.name || "unnamed"}`}>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={profile.name}
                  onChange={(event) => profile.setProfile({ name: event.target.value })}
                  placeholder="Name"
                  className="rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)", color: "var(--color-tf-text)" }}
                />
                <input
                  value={profile.level}
                  onChange={(event) => profile.setProfile({ level: event.target.value })}
                  placeholder="CEFR level"
                  className="rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)", color: "var(--color-tf-text)" }}
                />
                <input
                  value={profile.goals}
                  onChange={(event) => profile.setProfile({ goals: event.target.value })}
                  placeholder="Goals"
                  className="rounded-xl border px-3 py-2 text-sm sm:col-span-2"
                  style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)", color: "var(--color-tf-text)" }}
                />
                <input
                  value={profile.facts}
                  onChange={(event) => profile.setProfile({ facts: event.target.value })}
                  placeholder="Facts used in examples"
                  className="rounded-xl border px-3 py-2 text-sm sm:col-span-2"
                  style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)", color: "var(--color-tf-text)" }}
                />
              </div>
            </Field>
          </>
        )}

        {tab === "data" && (
          <>
            <div className="rounded-2xl border p-3 text-[12px] leading-relaxed" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}>
              Episodes, subtitles and lessons live in this browser's IndexedDB; progress and preferences in localStorage. Nothing is uploaded anywhere.
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button kind="danger" onClick={() => lessonReset()}>
                Reset lesson progress (XP, streaks, journal)
              </Button>
              <Button
                kind="danger"
                onClick={() => {
                  leaveRoom();
                  player.reset();
                }}
              >
                Reset player preferences
              </Button>
              <Button
                kind="danger"
                onClick={() => {
                  if (window.confirm("Forget the learner profile and start the setup again?")) profile.reset();
                }}
              >
                Reset the learner profile
              </Button>
            </div>
            <div className="text-[11px] font-bold" style={{ color: "var(--color-tf-sub)" }}>
              Authorised sources only: {Object.values(LICENCE_LABELS).join(" · ")}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

const ToggleRow: React.FC<{ label: string; value: boolean; onChange: (value: boolean) => void }> = ({ label, value, onChange }) => (
  <button
    onClick={() => onChange(!value)}
    className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[12.5px] font-bold"
    style={{ borderColor: value ? "var(--color-tf-brand)" : "var(--color-tf-line)", background: value ? "color-mix(in srgb, var(--color-tf-brand) 12%, transparent)" : "var(--color-tf-panel-2)" }}
  >
    <span
      className="grid h-5 w-9 place-items-center rounded-full text-[10px]"
      style={{ background: value ? "var(--color-tf-brand)" : "var(--color-tf-line)", color: "#fff" }}
    >
      {value ? "ON" : "OFF"}
    </span>
    <span className="flex-1">{label}</span>
  </button>
);
