import React, { useState } from "react";
import type { Episode } from "../../types";
import { inviteLink, LIVEKIT_URL } from "../../lib/party/transport";
import { usePartyStore } from "../../store/party";
import { usePlayerStore } from "../../store/player";
import { useProfileStore } from "../../store/profile";
import { Button, Chip, Field, Input } from "../ui";

/**
 * Watch party.
 *
 * The room contract is three modes, because a classroom needs all three:
 *   host        — the teacher's tab drives; play/pause/seek are published
 *   follow      — students obey the host, drift-corrected (never a hard jump
 *                 for a fraction of a second)
 *   independent — students in the room but free to scrub back and re-listen
 *
 * Transport: LiveKit when the deployment has a token endpoint, otherwise a
 * same-device room over BroadcastChannel, so the feature is demonstrable with
 * zero infrastructure.
 */
export const PartyPanel: React.FC<{
  episode: Episode;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
}> = ({ episode, onSeek, onTogglePlay }) => {
  const party = usePartyStore();
  const playerName = useProfileStore((s) => s.name);
  const avatar = useProfileStore((s) => s.avatar);
  const [roomInput, setRoomInput] = useState("");
  const [busy, setBusy] = useState(false);

  const join = async () => {
    setBusy(true);
    try {
      await party.join({
        roomId: roomInput.trim() || undefined,
        userId: `${(playerName || "guest").replace(/\s+/g, "-").toLowerCase()}-${Math.random().toString(36).slice(2, 6)}`,
        userName: `${avatar} ${playerName || "Guest"}`,
        episodeId: episode.id,
      });
    } finally {
      setBusy(false);
    }
  };

  const share = () => {
    if (!party.roomId) return;
    const link = inviteLink(party.roomId);
    void navigator.clipboard.writeText(link).catch(() => undefined);
    window.prompt("Invite link (already copied):", link);
  };

  return (
    <div className="tf-scroll min-h-0 flex-1 overflow-y-auto p-3">
      {!party.roomId ? (
        <div className="space-y-3">
          <div className="rounded-2xl border p-3 text-[12.5px] leading-relaxed" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}>
            <div className="font-black">👥 Watch together</div>
            Everyone opens the same lesson; the player stays in step. Perfect for a class, a tutoring session or a shared screen — no account, no
            installation.
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Field label="Room code (leave empty to create one)" hint={LIVEKIT_URL ? `LiveKit: ${LIVEKIT_URL}` : "No LiveKit endpoint configured — rooms run on this device (BroadcastChannel), which is enough for tabs on one machine."}>
              <Input value={roomInput} onChange={(event) => setRoomInput(event.target.value)} placeholder="e.g. 7k2mqp" />
            </Field>
            <div className="flex items-end">
              <Button kind="primary" onClick={() => void join()} disabled={busy}>
                {busy ? "Joining…" : "▶ Create / join room"}
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border p-3 text-[11.5px]" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)", color: "var(--color-tf-sub)" }}>
            <b>Room state that stays in sync:</b> episode, playing/paused, current time, playback rate, subtitle track + subtitle mode — published with a
            server timestamp so a late joiner lands at the right second.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl border p-3" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}>
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="brand">room {party.roomId}</Chip>
              <Chip tone={party.connected ? "teal" : "muted"}>{party.connected ? "connected" : "offline"}</Chip>
              <Chip tone="muted">{party.transportKind === "livekit" ? "LiveKit WebRTC" : "on-device room"}</Chip>
              <Button size="sm" className="ml-auto" onClick={share}>
                🔗 Invite link
              </Button>
              <Button size="sm" kind="danger" onClick={() => party.leave()}>
                Leave
              </Button>
            </div>
            {party.detail && (
              <div className="mt-1.5 text-[11px]" style={{ color: "var(--color-tf-sub)" }}>
                {party.detail}
              </div>
            )}
            {party.error && (
              <div className="mt-1.5 text-[11px] font-bold" style={{ color: "var(--color-tf-gold)" }}>
                {party.error}
              </div>
            )}
          </div>

          <div>
            <div className="mb-1 text-[11px] font-black uppercase tracking-wider" style={{ color: "var(--color-tf-sub)" }}>
              Your role
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["host", "follow", "independent"] as const).map((mode) => (
                <Button key={mode} size="sm" kind={party.mode === mode ? "primary" : "ghost"} onClick={() => party.setMode(mode)}>
                  {mode === "host" ? "🎛 Host-controlled" : mode === "follow" ? "🎯 Follow host" : "🎥 Independent"}
                </Button>
              ))}
            </div>
            <div className="mt-1.5 text-[11px]" style={{ color: "var(--color-tf-sub)" }}>
              {party.mode === "host"
                ? "Every play, pause, seek and subtitle change you make is published to the room."
                : party.mode === "follow"
                  ? "Your player is corrected towards the host — small drift is smoothed by nudging the rate, large drift seeks."
                  : "You are in the room but control your own playhead (perfect for re-listening)."}
            </div>
          </div>

          <div className="rounded-2xl border p-3" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: "var(--color-tf-sub)" }}>
                Sync
              </span>
              <Chip tone={!party.drift || Math.abs(party.drift.drift) < 0.15 ? "teal" : Math.abs(party.drift.drift) < 1.2 ? "gold" : "muted"}>
                {party.drift ? `${party.drift.drift >= 0 ? "+" : ""}${party.drift.drift.toFixed(2)}s` : "—"}
              </Chip>
              <span className="text-[11.5px]" style={{ color: "var(--color-tf-sub)" }}>
                {party.drift?.detail ?? "not following"}
              </span>
            </div>
            {party.roomState && (
              <div className="mt-1.5 text-[11px]" style={{ color: "var(--color-tf-sub)" }}>
                host at {party.roomState.currentTime.toFixed(1)}s · {party.roomState.isPlaying ? "playing" : "paused"} · {party.roomState.playbackRate}× · subs{" "}
                {party.roomState.subtitleMode}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Button
                size="sm"
                onClick={() => {
                  const store = usePlayerStore.getState();
                  party.publish({
                    isPlaying: store.playing,
                    currentTime: store.time,
                    playbackRate: store.rate,
                    subtitleTrack: store.originalTrackId,
                    subtitleMode: store.subtitleMode,
                  });
                }}
              >
                📡 Publish my playhead now
              </Button>
              <Button size="sm" onClick={() => onTogglePlay()}>
                ⏯ Publish play/pause
              </Button>
              <Button size="sm" onClick={() => onSeek(party.roomState?.currentTime ?? 0)}>
                🎯 Jump to the host
              </Button>
            </div>
          </div>

          <div>
            <div className="mb-1 text-[11px] font-black uppercase tracking-wider" style={{ color: "var(--color-tf-sub)" }}>
              Participants ({party.participants.length})
            </div>
            <div className="space-y-1.5">
              {party.participants.map((participant) => (
                <div key={participant.id} className="flex items-center gap-2 rounded-xl border px-2.5 py-1.5" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}>
                  <span className="text-[13px] font-bold">{participant.name}</span>
                  {participant.isHost && <Chip tone="gold">host</Chip>}
                  {participant.isCoHost && <Chip tone="teal">co-host</Chip>}
                  <Button size="sm" className="ml-auto" onClick={() => party.toggleCoHost(participant.id)}>
                    {participant.isCoHost ? "Remove co-host" : "Make co-host"}
                  </Button>
                </div>
              ))}
              {!party.participants.length && (
                <div className="text-[11.5px]" style={{ color: "var(--color-tf-sub)" }}>
                  Nobody else has joined yet. Share the invite link.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
