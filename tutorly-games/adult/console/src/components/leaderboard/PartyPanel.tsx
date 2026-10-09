"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Check, Link2, LogOut, Radio, Camera, Loader2, Users, Wifi, WifiOff, MonitorPlay, ChevronDown, ChevronUp } from "lucide-react";
import type { PartyProfile, PartySnapshot } from "@/lib/party";
import { normalizeCode } from "@/lib/party";
import { formatBytes, optimizeAvatar } from "@/lib/photo";
import { searchContacts, type Contact } from "@/lib/contacts";
import { Avatar } from "./PlayerPicker";

/**
 * Rooms, in the leaderboard column.
 *
 * Two states, because a tutor is only ever in one of them: hosting (share this
 * code) or joining (enter this code). The panel shows the code and the link at the
 * same size, because in a classroom one gets read aloud and the other gets pasted
 * into a chat.
 *
 * The photo picker is the guest side of the same idea: whatever is chosen off the
 * device is downscaled to a 128×128 JPEG *in this browser* before it is sent, so a
 * learner's 6 MB phone photo becomes a few kilobytes on the chat channel and on the
 * host's board. See `lib/photo.ts`.
 */

export interface PartyPanelProps {
  party: PartySnapshot;
  contacts: Contact[];
  profile: PartyProfile;
  activeGameId: string | null;
  /** Filled in when the page was opened from a share link (`?room=CODE`). */
  initialCode?: string | null;
  onHost: () => void;
  onJoin: (code: string) => void;
  onLeave: () => void;
  onProfileChange: (profile: PartyProfile) => void;
  /** Full-screen scoreboard for a projector. */
  onOpenProjector?: () => void;
  /** False while the console is on localhost, where a link cannot reach a phone. */
  shareable?: boolean;
  /**
   * File a score that arrived as a code instead of over a network. Returns the
   * verdict so the panel can show the reason a code was refused verbatim.
   */
  onAddOfflineResult?: (code: string, name: string) => { ok: boolean; message: string };
}

export default function PartyPanel({
  party,
  contacts,
  profile,
  activeGameId,
  initialCode,
  onHost,
  onJoin,
  onLeave,
  onProfileChange,
  onOpenProjector,
  onAddOfflineResult,
  shareable = true,
}: PartyPanelProps) {
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [showOffline, setShowOffline] = useState(false);
  const [offlineCode, setOfflineCode] = useState("");
  const [offlineName, setOfflineName] = useState("");
  const [offlineNote, setOfflineNote] = useState<{ ok: boolean; message: string } | null>(null);

  const submitOffline = () => {
    if (!onAddOfflineResult) return;
    const result = onAddOfflineResult(offlineCode, offlineName);
    setOfflineNote(result);
    if (result.ok) {
      setOfflineCode("");
      setOfflineName("");
    }
  };

  // A share link arrives with the code already known; the learner only adds a name.
  useEffect(() => {
    if (initialCode) setCode(normalizeCode(initialCode));
  }, [initialCode]);

  const idle = party.status === "idle";
  const busy = party.status === "starting" || party.status === "joining";
  const live = party.status === "live";
  const invited = !!initialCode && idle;

  const nameSuggestions = useMemo(
    () => (profile.name.trim().length >= 2 ? searchContacts(contacts, profile.name, 4) : []),
    [contacts, profile.name]
  );

  const copy = async (value: string, what: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* clipboard can be blocked — the text is on screen to copy by hand */
    }
    setCopied(what);
    window.setTimeout(() => setCopied(null), 1600);
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoBusy(true);
    setPhotoNote(null);
    try {
      const { dataUrl, bytes } = await optimizeAvatar(file);
      onProfileChange({ ...profile, avatar: dataUrl });
      setPhotoNote(`Saved as a ${formatBytes(bytes)} avatar`);
    } catch (err) {
      setPhotoNote(err instanceof Error ? err.message : "That photo could not be used.");
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const bestFor = (row: { best: Record<string, number> }) =>
    activeGameId ? row.best[activeGameId] ?? 0 : 0;

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-2xl">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-xl text-cyan-400">
            <Radio className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-white leading-tight">SCORE ROOM</h3>
            <p className="text-[10px] font-mono text-slate-500 leading-tight">
              {live
                ? party.role === "host"
                  ? "Guests join with the code below"
                  : "Connected to the host"
                : "Play with your learners, no server"}
            </p>
          </div>
        </div>
        {live && (
          <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      {/* ------------------------------------------------------------ idle -- */}
      {idle && (
        <div className={`mt-4 space-y-3 ${invited ? "rounded-xl ring-1 ring-cyan-500/50 p-3 -mx-3 bg-cyan-500/5" : ""}`}>
          {invited && (
            <p className="text-[11px] font-mono text-cyan-300">
              You were invited to room <strong>{code}</strong> — write your name, then press JOIN.
            </p>
          )}
          <button
            onClick={onHost}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition active:scale-[0.98]"
          >
            <Radio className="w-4 h-4" /> HOST A SCORE ROOM
          </button>
          {onOpenProjector && (
            <button
              onClick={onOpenProjector}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-black px-4 py-2 rounded-xl text-xs border border-slate-700 transition"
              title="Big scores for a projector — works with no room too"
            >
              <MonitorPlay className="w-4 h-4" /> PROJECTOR SCOREBOARD
            </button>
          )}
          {/*
            `min-w-0` on the fields below (and on the link and name rows further down):
            a flex item defaults to `min-width:auto`, and an input's intrinsic width is
            its `size` attribute — about 172px. The field therefore refused to shrink
            and pushed its button out past the row on a phone.
          */}
          <div className="flex items-center gap-2">
            <input
              value={code}
              onChange={(e) => setCode(normalizeCode(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && code.length >= 4) onJoin(code);
              }}
              placeholder="ROOM CODE"
              maxLength={5}
              aria-label="Room code"
              className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono tracking-[0.25em] text-cyan-300 placeholder:text-slate-600 placeholder:tracking-normal focus:outline-none focus:border-cyan-400 uppercase"
            />
            <button
              onClick={() => code.length >= 4 && onJoin(code)}
              disabled={code.length < 4}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-black px-3.5 py-2 rounded-xl text-xs border border-slate-700 transition"
            >
              <Wifi className="w-3.5 h-3.5" /> JOIN
            </button>
          </div>
        </div>
      )}

      {busy && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            {party.status === "starting" ? "Opening the room…" : `Looking for room ${party.code}…`}
          </div>
          {party.attempt && party.attempt.n > 1 && (
            <p className="text-[10px] font-mono text-slate-500">
              {party.attemptNote || "Retrying"} (try {party.attempt.n} of {party.attempt.of}). Nothing to redo on your
              side.
            </p>
          )}
        </div>
      )}

      {party.status === "error" && (
        <div className="mt-4 space-y-3">
          <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 leading-relaxed">
            {party.error}
          </p>
          <div className="flex items-center gap-3">
            {/* Errors here are almost always a broker moment, so the useful action is
                "do that again" — the tutor should never have to re-type a room code. */}
            <button
              onClick={() => (party.role === "host" ? onHost() : onJoin(party.code || code))}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-1.5 rounded-xl text-[11px] border border-slate-700"
            >
              <Wifi className="w-3.5 h-3.5" /> {party.role === "host" ? "Try hosting again" : "Try joining again"}
            </button>
            <button onClick={onLeave} className="text-[11px] font-mono text-slate-400 hover:text-white underline">
              Back to single player
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ live -- */}
      {live && (
        <div className="mt-4 space-y-4">
          {party.role === "host" ? (
            <>
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase">Room code</span>
                <div className="mt-1 flex items-center gap-2">
                  <code
                    onClick={() => copy(party.code ?? "", "code")}
                    title="Click to copy"
                    className="flex-1 text-center text-2xl font-black tracking-[0.35em] text-cyan-300 bg-slate-950 border border-slate-800 rounded-xl py-2 cursor-pointer hover:border-cyan-500/50 transition"
                  >
                    {party.code}
                  </code>
                  <button
                    onClick={() => copy(party.code ?? "", "code")}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700"
                    title="Copy the code"
                  >
                    {copied === "code" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase">
                  Share link{!shareable && " — local only"}
                </span>
                {!shareable && (
                  <p className="mt-1 text-[10px] font-mono text-amber-300/80 leading-relaxed">
                    This console is on localhost, so phones on other devices cannot open this link — read the code out
                    instead. Serving the console from its normal address makes the link work.
                  </p>
                )}
                <div className="mt-1 flex items-center gap-2">
                  <input
                    readOnly
                    value={party.link ?? ""}
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-300 focus:outline-none"
                  />
                  <button
                    onClick={() => copy(party.link ?? "", "link")}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700"
                    title="Copy the link"
                  >
                    {copied === "link" ? <Check className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase">
                  <Users className="w-3 h-3" /> Joined ({party.guests.length})
                </div>
                {party.guests.length === 0 ? (
                  <p className="mt-2 text-[11px] font-mono text-slate-500">
                    Nobody has joined yet — the link works on phones too.
                  </p>
                ) : (
                  <div className="mt-2 divide-y divide-slate-800/60">
                    {party.guests.map((g) => (
                      <div key={g.id} className="flex items-center gap-2.5 py-2">
                        <Avatar avatar={g.avatar} name={g.name} size={30} />
                        <span className="flex-1 text-xs font-bold text-white truncate">{g.name}</span>
                        <span className="text-sm font-black font-mono text-amber-400">
                          {bestFor(g).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2.5 bg-slate-950/70 border border-slate-800 rounded-xl p-2.5">
                <Avatar avatar={party.hostProfile?.avatar || "⚡"} name={party.hostProfile?.name || "Host"} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">
                    {party.hostProfile?.name || "Host"}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    Room {party.code} · you are a guest here
                  </div>
                </div>
              </div>

              {party.hostGameId && party.hostGameId !== activeGameId && (
                <p className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 rounded-xl px-3 py-2">
                  The host put a different game on the console — following it now.
                </p>
              )}

              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase mb-2">In this room</div>
                <div className="divide-y divide-slate-800/60 max-h-48 overflow-y-auto pr-1">
                  {party.board.map((row) => (
                    <div key={row.id} className="flex items-center gap-2.5 py-2">
                      <Avatar avatar={row.avatar} name={row.name} size={30} />
                      <span className="flex-1 text-xs font-bold text-white truncate">
                        {row.name}
                        {row.role === "host" && (
                          <span className="ml-1.5 text-[9px] font-mono text-cyan-400">HOST</span>
                        )}
                      </span>
                      <span className="text-sm font-black font-mono text-amber-400">
                        {bestFor(row).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Guest identity: name + photo */}
          <div className="pt-3 border-t border-slate-800">
            <div className="text-[10px] font-mono text-slate-500 uppercase mb-2">Your name and photo</div>
            <div className="flex items-center gap-2">
              <Avatar avatar={profile.avatar} name={profile.name} size={36} />
              <input
                value={profile.name}
                onChange={(e) => onProfileChange({ ...profile, name: e.target.value.slice(0, 24) })}
                placeholder="Your name"
                aria-label="Your name in the room"
                className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={photoBusy}
                title="Use a photo from this device"
                className="p-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl border border-slate-700"
              >
                {photoBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void onPhoto(e.target.files?.[0])}
              />
            </div>
            {photoNote && <p className="mt-1.5 text-[10px] font-mono text-slate-500">{photoNote}</p>}
            {nameSuggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {nameSuggestions.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onProfileChange({ name: c.name, avatar: c.avatar })}
                    className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950/70 pl-0.5 pr-2 py-0.5 hover:border-cyan-500/60"
                    title={`Use ${c.name} (${c.source === "kids" ? "Kids" : "Adult"} Dashboard)`}
                  >
                    <Avatar avatar={c.avatar} name={c.name} size={16} />
                    <span className="text-[10px] font-bold text-slate-300">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {onOpenProjector && (
            <button
              onClick={onOpenProjector}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black px-4 py-2.5 rounded-xl text-xs transition active:scale-[0.98]"
              title="Big scores for a projector: paste this on the class screen"
            >
              <MonitorPlay className="w-4 h-4" /> PROJECTOR SCOREBOARD
            </button>
          )}

          <button
            onClick={onLeave}
            className="w-full flex items-center justify-center gap-2 bg-slate-800/60 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-xl text-[11px] font-mono border border-slate-700 transition"
          >
            <LogOut className="w-3.5 h-3.5" /> {party.role === "host" ? "Close the room" : "Leave the room"}
          </button>
        </div>
      )}

      {/* ------------------------------------------------- no-network compare -- */}
      {onAddOfflineResult && (
        <div className="mt-4 pt-4 border-t border-slate-800">
          <button
            onClick={() => setShowOffline((v) => !v)}
            className="w-full flex items-center justify-between gap-2 text-left"
            title="Compare scores when a room cannot be opened"
          >
            <span className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <WifiOff className="w-3.5 h-3.5" /> NO NETWORK? COMPARE BY CODE
            </span>
            {showOffline ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          {showOffline && (
            <div className="mt-3 space-y-2.5">
              <p className="text-[11px] font-mono text-slate-500 leading-relaxed">
                When a school network blocks WebRTC, each learner&apos;s console shows a short result code after they
                play. Type it here with their name and their score joins the board — no room, no internet.
              </p>
              <div className="flex items-center gap-2">
                <input
                  value={offlineCode}
                  onChange={(e) => {
                    setOfflineCode(e.target.value.toUpperCase());
                    setOfflineNote(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitOffline();
                  }}
                  placeholder="RESULT CODE"
                  aria-label="Result code"
                  className="w-36 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono tracking-[0.15em] text-cyan-300 placeholder:text-slate-600 placeholder:tracking-normal focus:outline-none focus:border-cyan-400"
                />
                <input
                  value={offlineName}
                  onChange={(e) => {
                    setOfflineName(e.target.value.slice(0, 24));
                    setOfflineNote(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitOffline();
                  }}
                  placeholder={"Learner's name"}
                  aria-label="Learner name"
                  className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
                />
                <button
                  onClick={submitOffline}
                  disabled={offlineCode.trim().length < 8 || !offlineName.trim()}
                  className="shrink-0 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-black px-3.5 py-2 rounded-xl text-xs border border-slate-700 transition"
                >
                  ADD
                </button>
              </div>
              {offlineNote && (
                <p
                  className={`text-[11px] font-mono rounded-xl px-3 py-2 border leading-relaxed ${
                    offlineNote.ok
                      ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"
                      : "text-amber-300 bg-amber-500/10 border-amber-500/30"
                  }`}
                >
                  {offlineNote.message}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
