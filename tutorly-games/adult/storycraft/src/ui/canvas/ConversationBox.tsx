import { useEffect, useRef, useState } from "react";
import { useGameState, store } from "../../engine/store";
import { audio } from "../../engine/audio";

/**
 * Persistent conversation feed shown beneath the Leaderboard on the canvas.
 *
 * Turn-based behavior:
 *  - Only one turn reads aloud at a time.
 *  - The current speaker is highlighted in BOTH the leaderboard and this feed.
 *  - No auto-loop. The next turn only plays after the previous one finishes.
 *  - Clicking a card manually re-plays just that card aloud.
 */
export function ConversationBox() {
  const state = useGameState();
  const lastPlayedIdx = useRef(0);
  const playingRef = useRef(false);
  const [, forceTick] = useState(0);

  // Reset cursor when conversation is reset (e.g. a new chapter).
  useEffect(() => {
    if (state.conversation.length < lastPlayedIdx.current) {
      lastPlayedIdx.current = 0;
      playingRef.current = false;
    }
  }, [state.conversation.length]);

  // Auto-play only NPC turns. ONE speaker at a time — sequential, never overlap.
  useEffect(() => {
    const eligible = state.conversation.filter(
      (m) => state.entities.find((e) => e.id === m.fromId)?.kind === "npc" && m.toPlayerIds.length > 0,
    );
    if (eligible.length <= lastPlayedIdx.current) return;
    if (playingRef.current) return;

    let cancelled = false;
    const playFrom = async (startIdx: number) => {
      for (let i = startIdx; i < eligible.length; i++) {
        if (cancelled) return;
        const m = eligible[i];
        const fromEnt = state.entities.find((e) => e.id === m.fromId);
        if (!fromEnt) {
          lastPlayedIdx.current = i + 1;
          continue;
        }
        playingRef.current = true;
        store.set((s) => ({ ...s, speakingEntityId: m.fromId }));
        const text = (m.ttsText || "").trim() || "...";
        await audio.speakAsync(text, fromEnt.voiceURI, { pitch: 0.95 });
        store.set((s) => ({ ...s, speakingEntityId: undefined }));
        lastPlayedIdx.current = i + 1;
        forceTick((t) => t + 1);
      }
      playingRef.current = false;
    };
    void playFrom(lastPlayedIdx.current);
    return () => { cancelled = true; };
  }, [state.conversation.length, state.entities]);

  // Show only the last 12 turns
  const visible = state.conversation.slice(-12);

  // Manual replay of a single card
  const replay = (m: typeof state.conversation[number]) => {
    const fromEnt = state.entities.find((e) => e.id === m.fromId);
    if (!fromEnt) return;
    store.set((s) => ({ ...s, speakingEntityId: m.fromId }));
    audio.speak(m.ttsText || "...", fromEnt.voiceURI, { pitch: 0.95 });
    setTimeout(() => store.set((s) => ({ ...s, speakingEntityId: undefined })), Math.max(3500, (m.ttsText || "").length * 55));
  };

  return (
    <section className="flex min-h-[260px] flex-1 flex-col rounded-2xl bg-slate-900/60 p-3 ring-1 ring-white/10">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-violet-300">💬 Conversation</h3>
        <span className="text-[10px] text-slate-500">{state.conversation.length} turns</span>
      </div>
      <div className="flex-1 overflow-y-auto pr-1">
        {visible.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div className="text-3xl opacity-30">🎭</div>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((m) => {
              const isSpeaking = state.speakingEntityId === m.fromId;
              const targets = m.toPlayerIds
                .map((id) => state.entities.find((e) => e.id === id)?.name)
                .filter(Boolean)
                .join(", ") || "everyone";
              return (
                <article
                  key={m.id}
                  onClick={() => replay(m)}
                  title="Click to read aloud"
                  className={`group cursor-pointer rounded-xl bg-slate-950/70 p-2.5 ring-1 transition ${
                    isSpeaking
                      ? "ring-violet-400/80 shadow-[0_0_24px_rgba(167,139,250,.45)] bg-violet-950/30"
                      : "ring-white/10 hover:ring-white/30 hover:bg-slate-900/80"
                  }`}
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className={`text-xl ${isSpeaking ? "animate-pulse" : ""}`}>{m.fromEmoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-black" style={{ color: m.fromColor }}>
                        {m.fromName}
                        {isSpeaking && <span className="ml-1 text-violet-300">🔊 speaking</span>}
                      </div>
                      <div className="text-[9px] text-slate-500">to {targets}</div>
                    </div>
                    <button
                      onClick={(ev) => {
                        ev.stopPropagation();
                        replay(m);
                      }}
                      className="grid h-7 w-7 place-items-center rounded-md bg-violet-500/20 text-violet-200 opacity-0 transition group-hover:opacity-100 hover:bg-violet-500/40"
                      title="Read this card aloud"
                    >
                      🔊
                    </button>
                  </div>
                  <div
                    className="prose prose-invert max-w-none text-[11px] leading-snug prose-img:my-1 prose-img:max-h-40 prose-img:rounded-md prose-p:my-1"
                    dangerouslySetInnerHTML={{ __html: m.richHtml || "<i>(empty message)</i>" }}
                  />
                  {m.challenge && (
                    <div className="mt-1.5 rounded-md bg-amber-500/10 p-1.5 text-[10px] ring-1 ring-amber-400/30">
                      <div className="font-bold text-amber-300">🏆 Challenge</div>
                      <p className="text-slate-200">{m.challenge.description}</p>
                      <p className="text-emerald-300">Reward: {m.challenge.rewardItemEmoji} {m.challenge.rewardItemName}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
