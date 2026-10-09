"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookmarkPlus, Check, Copy, Crown, LogOut, Send, Users, Wifi } from "lucide-react";
import type { TutorContext, TutorTurn } from "@/modules/ai/tutor";
import { usePlayerStore, type PlayerController } from "@/modules/player/store";
import { LiveKitTransport, livekitConfigured, planDriftCorrection, type PartyParticipant, type PartyPlaybackState } from "@/modules/watch-party/livekit";
import { formatTime } from "@/modules/lessons/types";
import { Button, cx } from "@/components/ui";
import type { WatchData, WordContext } from "./types";

/* ------------------------------------------------------------------ */
/* AI Tutor                                                            */
/* ------------------------------------------------------------------ */

export type TutorContextInput = Omit<TutorContext, "learner" | "savedVocabulary">;

export function TutorPanel({ getContext, selected, savedWords, onSaveWord, pendingQuestion, onQuestionConsumed }: { getContext: () => TutorContextInput; selected: WordContext | null; savedWords: Set<string>; onSaveWord: (word: string, ctx: WordContext) => Promise<void>; pendingQuestion: string | null; onQuestionConsumed: () => void }) {
  const [messages, setMessages] = useState<(TutorTurn & { provider?: string })[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const ask = useCallback(
    async (question: string) => {
      if (!question.trim() || busy) return;
      const ctx = getContext();
      setMessages((m) => [...m, { role: "user", content: question }]);
      setInput("");
      setBusy(true);
      try {
        const res = await fetch("/api/ai/tutor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ context: ctx, history: messages.slice(-8), question }) });
        const data = (await res.json()) as { answer?: string; provider?: string; error?: string };
        setMessages((m) => [...m, { role: "assistant", content: data.answer ?? data.error ?? "Sorry, something went wrong.", provider: data.provider }]);
      } catch {
        setMessages((m) => [...m, { role: "assistant", content: "I couldn't reach the tutor service. Please try again." }]);
      } finally {
        setBusy(false);
      }
    },
    [busy, getContext, messages],
  );

  useEffect(() => {
    if (pendingQuestion) {
      void ask(pendingQuestion);
      onQuestionConsumed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuestion]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const cleanSelected = selected?.word.toLowerCase().replace(/[^\p{L}'-]/gu, "") ?? "";
  const chips = selected ? [`What does “${cleanSelected}” mean here?`, `How do I pronounce “${cleanSelected}”?`, `Give me 2 more examples with “${cleanSelected}”`] : ["Explain the current line", "What grammar is used in this line?", "Translate this line naturally", "How do I pronounce this line?"];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 p-3">
        {selected ? (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-violet-500/15 p-2">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-widest text-violet-300">Selected word · {formatTime(selected.time)}</div>
              <div className="truncate text-sm font-semibold text-white">{cleanSelected}</div>
              <div className="truncate text-xs text-zinc-400">“{selected.sentence}”</div>
            </div>
            <Button size="sm" variant={savedWords.has(cleanSelected) ? "ghost" : "primary"} disabled={savedWords.has(cleanSelected)} onClick={() => onSaveWord(selected.word, selected)}>
              {savedWords.has(cleanSelected) ? <Check size={14} /> : <BookmarkPlus size={14} />} {savedWords.has(cleanSelected) ? "Saved" : "Save"}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-zinc-400">The tutor sees the current line, the 3 lines around it, the chapter, the lesson focus and your profile. Click any word to ask about it.</p>
        )}
        <div className="mt-2 flex flex-wrap gap-1">
          {chips.map((c) => (
            <button key={c} type="button" onClick={() => ask(c)} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-200 hover:bg-white/10">
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && <p className="text-center text-xs text-zinc-500">Ask anything about what you're watching.</p>}
        {messages.map((m, i) => (
          <div key={i} className={cx("max-w-[92%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm leading-relaxed", m.role === "user" ? "ml-auto bg-violet-500/30 text-white" : "bg-white/5 text-zinc-100")}>
            {m.content}
            {m.provider && <div className="mt-1 text-[10px] uppercase tracking-widest text-zinc-500">{m.provider === "offline" ? "offline tutor" : `via ${m.provider}`}</div>}
          </div>
        ))}
        {busy && <div className="w-16 rounded-2xl bg-white/5 px-3 py-2 text-sm text-zinc-400">…</div>}
        <div ref={endRef} />
      </div>
      <form
        className="flex gap-2 border-t border-white/10 p-2"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
      >
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask the tutor…" className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-violet-400 focus:outline-none" aria-label="Question for the tutor" />
        <Button type="submit" size="sm" disabled={busy || !input.trim()} aria-label="Send">
          <Send size={14} />
        </Button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Watch Party                                                         */
/* ------------------------------------------------------------------ */

type PartyState = { roomId: string; code: string; episodeId: string; hostUserId: string; mode: "host" | "follow" | "independent"; isPlaying: boolean; currentTime: number; playbackRate: number; serverTimestamp: number };
type Participant = { userId: string; role: string; name: string; color: string };

export function PartyPanel({ data, controller, onLockChange, onCodeChange }: { data: WatchData; controller: PlayerController; onLockChange: (locked: boolean) => void; onCodeChange: (code: string | null) => void }) {
  const [code, setCode] = useState<string | null>(data.partyCode);
  const [joinCode, setJoinCode] = useState("");
  const [state, setState] = useState<PartyState | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [drift, setDrift] = useState<number | null>(null);
  const [lastAction, setLastAction] = useState<string>("—");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [transport, setTransport] = useState<"livekit" | "polling">(() => (livekitConfigured() ? "livekit" : "polling"));
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHostRef = useRef(false);
  const modeRef = useRef<PartyState["mode"]>("host");
  const transportRef = useRef<"livekit" | "polling">(livekitConfigured() ? "livekit" : "polling");
  const lkRef = useRef<LiveKitTransport | null>(null);
  const publishedRef = useRef<{ at: number; time: number }>({ at: 0, time: 0 });

  const push = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!code || !isHostRef.current) return;
      await fetch(`/api/watch-party/${code}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }).catch(() => undefined);
      // Announce on the realtime channel too, so followers react immediately instead
      // of waiting for their next poll.
      if (transportRef.current === "livekit") await publishState(patch);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [code, controller],
  );

  /** Publishes the host's authoritative playback state on the LiveKit data channel. */
  const publishState = useCallback(
    async (patch: Record<string, unknown> = {}) => {
      const store = usePlayerStore.getState();
      const playback: PartyPlaybackState = {
        roomId: state?.roomId ?? code ?? "",
        code: code ?? "",
        episodeId: data.episode.id,
        hostUserId: state?.hostUserId ?? data.learner.userId,
        mode: (patch.mode as PartyState["mode"]) ?? state?.mode ?? "host",
        isPlaying: (patch.isPlaying as boolean) ?? !store.paused,
        currentTime: (patch.currentTime as number) ?? controller.currentTime,
        playbackRate: (patch.playbackRate as number) ?? store.rate,
        subtitleTrackId: store.sourceId,
        serverTimestamp: Date.now(),
      };
      publishedRef.current = { at: playback.serverTimestamp, time: playback.currentTime };
      await lkRef.current?.publish({ type: "state", state: playback, serverTimestamp: playback.serverTimestamp });
    },
    [code, controller, data.episode.id, data.learner.userId, state],
  );

  /** Applies a remote state: play/pause parity, rate, then drift correction. */
  const applyRemote = useCallback(
    (remote: PartyPlaybackState, serverNow: number) => {
      if (remote.episodeId !== data.episode.id) {
        window.location.href = `/watch/${remote.episodeId}?party=${remote.code}`;
        return;
      }
      const store = usePlayerStore.getState();
      const plan = planDriftCorrection({ local: controller.currentTime, state: remote, serverNow, isHost: isHostRef.current });
      setDrift(plan.drift);
      if (isHostRef.current || remote.mode === "independent") {
        setLastAction("host");
        return;
      }
      if (remote.isPlaying && store.paused) void controller.play();
      if (!remote.isPlaying && !store.paused) controller.pause();
      if (Math.abs(store.rate - remote.playbackRate) > 0.01 && !nudgeTimer.current) controller.setRate(remote.playbackRate);
      if (plan.action === "seek") controller.seek(plan.expected, "sync");
      else if (plan.action === "nudge" && !nudgeTimer.current) {
        controller.setRate(remote.playbackRate * (plan.drift > 0 ? 1.08 : 0.92));
        nudgeTimer.current = setTimeout(() => {
          controller.setRate(remote.playbackRate);
          nudgeTimer.current = null;
        }, 2000);
      }
      setLastAction(plan.action === "none" ? "in sync" : plan.action === "nudge" ? "smooth correction" : "hard seek");
      controller.bus.emit("WATCH_PARTY_SYNC", { drift: plan.drift, action: plan.action });
    },
    [controller, data.episode.id],
  );

  // Host: publish playback events + heartbeat
  useEffect(() => {
    if (!code || !isHost) return;
    const offs = [
      controller.bus.on("PLAY", ({ time }) => push({ isPlaying: true, currentTime: time })),
      controller.bus.on("PAUSE", ({ time }) => push({ isPlaying: false, currentTime: time })),
      controller.bus.on("SEEK", ({ to, source }) => source !== "sync" && push({ currentTime: to, isPlaying: !usePlayerStore.getState().paused })),
      controller.bus.on("PLAYBACK_RATE_CHANGE", ({ rate }) => push({ playbackRate: rate, currentTime: controller.currentTime })),
    ];
    const hb = setInterval(() => push({ currentTime: controller.currentTime, isPlaying: !usePlayerStore.getState().paused }), 5000);
    return () => {
      offs.forEach((o) => o());
      clearInterval(hb);
    };
  }, [code, isHost, controller, push]);

  // Everyone: poll room state (presence + sync)
  useEffect(() => {
    if (!code) return;
    let stopped = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/watch-party/${code}`, { cache: "no-store" });
        if (!res.ok) throw new Error((await res.json()).error ?? "Room unavailable");
        const json = (await res.json()) as { state: PartyState; participants: Participant[]; serverNow: number; you: { isHost: boolean } };
        if (stopped) return;
        setState(json.state);
        setParticipants(json.participants);
        setIsHost(json.you.isHost);
        isHostRef.current = json.you.isHost;
        modeRef.current = json.state.mode;
        onLockChange(json.state.mode === "host" && !json.you.isHost);
        setError(null);

        // With LiveKit carrying playback state, polling only refreshes presence,
        // roles and the room record — the sync maths would fight the data channel.
        if (transportRef.current !== "livekit") applyRemote(json.state as PartyPlaybackState, json.serverNow);
      } catch (e) {
        if (!stopped) setError((e as Error).message);
      }
    };
    void poll();
    const id = setInterval(poll, transportRef.current === "livekit" ? 6000 : 2000);
    return () => {
      stopped = true;
      clearInterval(id);
      onLockChange(false);
    };
  }, [code, controller, data.episode.id, onLockChange, applyRemote]);

  /* ---- LiveKit realtime transport (when configured) ---- */
  useEffect(() => {
    if (!code || transportRef.current !== "livekit") return;
    let cancelled = false;
    const lk = new LiveKitTransport();
    lkRef.current = lk;

    void (async () => {
      try {
        await lk.connect({
          code,
          identity: data.learner.userId,
          name: data.learner.name,
          onState: (remote, serverTimestamp) => {
            if (cancelled || isHostRef.current) return;
            setState(remote);
            modeRef.current = remote.mode;
            onLockChange(remote.mode === "host");
            applyRemote(remote, serverTimestamp);
          },
          onPresence: (remote: PartyParticipant[]) => {
            if (cancelled || !remote.length) return;
            setParticipants((prev) => (isHostRef.current ? prev : remote.map((p) => ({ ...p, name: p.name || p.userId }))));
          },
          onError: (message) => {
            if (cancelled) return;
            setTransport("polling");
            transportRef.current = "polling";
            setError(`${message} — falling back to HTTP sync`);
          },
        });
        if (!cancelled) await lk.publish({ type: "request-state", from: data.learner.userId });
      } catch (e) {
        if (cancelled) return;
        setTransport("polling");
        transportRef.current = "polling";
        setError(`${(e as Error).message} — using HTTP sync instead`);
      }
    })();

    return () => {
      cancelled = true;
      void lk.disconnect();
      if (lkRef.current === lk) lkRef.current = null;
    };
  }, [code, applyRemote, data.learner.userId, data.learner.name, onLockChange]);

  /* ---- Host heartbeat on the realtime channel ---- */
  useEffect(() => {
    if (!code || !isHost || transport !== "livekit") return;
    const id = setInterval(() => void publishState(), 3000);
    return () => clearInterval(id);
  }, [code, isHost, transport, publishState]);

  const create = async (mode: PartyState["mode"]) => {
    const res = await fetch("/api/watch-party", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", episodeId: data.episode.id, mode }) });
    const json = await res.json();
    if (!res.ok) return setError(json.error);
    setCode(json.code);
    onCodeChange(json.code);
    controller.bus.emit("WATCH_PARTY_JOINED", { code: json.code });
  };
  const join = async () => {
    const res = await fetch("/api/watch-party", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "join", code: joinCode }) });
    const json = await res.json();
    if (!res.ok) return setError(json.error);
    if (json.episodeId !== data.episode.id) {
      window.location.href = `/watch/${json.episodeId}?party=${json.code}`;
      return;
    }
    setCode(json.code);
    onCodeChange(json.code);
    controller.bus.emit("WATCH_PARTY_JOINED", { code: json.code });
  };
  const leave = () => {
    setCode(null);
    setState(null);
    onCodeChange(null);
    onLockChange(false);
  };
  const shareUrl = typeof window !== "undefined" && code ? `${window.location.origin}/watch/${data.episode.id}?party=${code}` : "";

  if (!code) {
    return (
      <div className="space-y-5 p-4">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-white">
            <Users size={16} /> Study together
          </h3>
          <p className="mt-1 text-xs text-zinc-400">Everyone plays the authorized video locally; the room only synchronizes state (play, pause, seek, rate, episode). Late joiners catch up automatically, drift is corrected smoothly.</p>
        </div>
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Create a room</div>
          <div className="grid gap-2">
            {(
              [
                ["host", "Host controlled", "Only the host controls playback"],
                ["follow", "Follow host", "Everyone follows, but can pause locally"],
                ["independent", "Independent", "Shared room, independent playback"],
              ] as const
            ).map(([m, title, desc]) => (
              <button key={m} type="button" onClick={() => create(m)} className="rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10">
                <div className="text-sm font-semibold text-white">{title}</div>
                <div className="text-xs text-zinc-400">{desc}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Join with a code</div>
          <div className="flex gap-2">
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="e.g. 7KQ2MZ" maxLength={6} className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm uppercase tracking-widest text-white focus:border-violet-400 focus:outline-none" aria-label="Room code" />
            <Button size="sm" onClick={join} disabled={joinCode.length < 4}>
              Join
            </Button>
          </div>
        </div>
        {error && <p className="text-xs text-rose-300">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-violet-300">Room code</div>
            <div className="font-mono text-2xl font-bold tracking-widest text-white">{code}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(shareUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/20"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Invite link"}
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-zinc-300">
          <Wifi size={12} className={error ? "text-rose-400" : "text-emerald-400"} />
          {isHost ? "You are the host" : `Mode: ${state?.mode ?? "…"} · ${lastAction}`}
          {!isHost && drift !== null && <span className="text-zinc-500">· drift {drift.toFixed(2)}s</span>}
          <span className={cx("ml-auto rounded-full px-2 py-0.5 text-[10px]", transport === "livekit" ? "bg-emerald-500/20 text-emerald-200" : "bg-white/10 text-zinc-400")}>
            {transport === "livekit" ? "LiveKit WebRTC" : "HTTP sync"}
          </span>
        </div>
        {isHost && (
          <div className="mt-2 flex gap-1">
            {(["host", "follow", "independent"] as const).map((m) => (
              <button key={m} type="button" onClick={() => push({ mode: m })} className={cx("flex-1 rounded-lg py-1 text-[11px] capitalize", state?.mode === m ? "bg-violet-500/40 text-white" : "bg-white/5 text-zinc-300 hover:bg-white/10")}>
                {m}
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Participants ({participants.length})</div>
        <ul className="space-y-1.5">
          {participants.map((p) => (
            <li key={p.userId} className="flex items-center gap-2 text-sm text-zinc-100">
              <span className="grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-black" style={{ background: p.color }}>
                {p.name.slice(0, 1).toUpperCase()}
              </span>
              {p.name}
              {p.role === "host" && <Crown size={12} className="text-amber-300" />}
              {p.userId === data.learner.userId && <span className="text-xs text-zinc-500">(you)</span>}
            </li>
          ))}
        </ul>
      </div>
      {state && (
        <div className="text-xs text-zinc-400">
          Room state: {state.isPlaying ? "playing" : "paused"} at {formatTime(state.currentTime)} · {state.playbackRate}×
        </div>
      )}
      {error && <p className="text-xs text-rose-300">{error}</p>}
      <Button variant="outline" size="sm" onClick={leave}>
        <LogOut size={14} /> Leave room
      </Button>
    </div>
  );
}
