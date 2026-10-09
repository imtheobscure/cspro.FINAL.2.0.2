import { useState } from "react";
import { useGameState } from "../../engine/store";
import { setSessionPanelOpen, sendChat, upsertSessionPeer } from "../../engine/actions";
import { peerManager } from "../../engine/peer";
import { Button } from "../primitives";
import { Pointers } from "./Pointers";

const EMOJIS = ["😀","😂","😍","😱","😡","👍","👎","❤️","🔥","💀","🎉","⚔️","🛡️","💎","🧪","🗡️","👻","🐉","👀","🧠","💬","🤔","😎","🤩","🥳"];

export function SessionPanel() {
  const state = useGameState();
  const [tab, setTab] = useState<"join" | "chat" | "annotate">("join");
  const [text, setText] = useState("");
  const [name, setName] = useState("Player");
  const [color, setColor] = useState("#a78bfa");
  const [joined, setJoined] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [status, setStatus] = useState("Not connected");
  const [error, setError] = useState("");

  return (
    <>
      <Pointers />
      {/* Backdrop */}
      <div
        onClick={() => setSessionPanelOpen(false)}
        className="absolute inset-0 z-40 bg-black/50 backdrop-blur-sm"
      />
      {/* Side Panel */}
      <aside className="absolute right-0 top-0 z-50 flex h-screen w-[420px] flex-col bg-slate-950/95 text-slate-100 shadow-[-20px_0_60px_rgba(0,0,0,0.5)] ring-1 ring-white/10 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-violet-900/40 to-fuchsia-900/40 px-4 py-3">
          <span className="text-2xl">🌐</span>
          <div className="flex-1">
            <h2 className="text-base font-black tracking-wide">SESSION PANEL</h2>
            <p className="text-[10px] text-slate-400">Live collaboration with GM & players</p>
          </div>
          <button onClick={() => setSessionPanelOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-white/10">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 border-b border-white/10">
          {(["join", "chat", "annotate"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-bold uppercase tracking-wider transition ${
                tab === t
                  ? "bg-violet-600/20 text-violet-200"
                  : "text-slate-400 hover:bg-white/5"
              }`}
            >
              {t === "join" ? "🔗 Join" : t === "chat" ? "💬 Chat" : "✏️ Annotate"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "join" && (
            <div className="space-y-4">
              {!joined ? (
                <>
                  <div>
                    <p className="mb-2 text-xs text-slate-400">Enter your name and the 6-character session code from your Game Master.</p>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="mb-2 w-full rounded-lg bg-slate-900/70 px-4 py-2 text-center text-sm font-bold text-slate-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                    <input
                      type="text"
                      maxLength={6}
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="ABC123"
                      className="w-full rounded-lg bg-slate-900/70 px-4 py-3 text-center font-mono text-2xl font-black tracking-[0.3em] text-violet-300 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                  <Button
                    variant="primary"
                    className="w-full"
                    disabled={joinCode.length < 6 || !name.trim()}
                    onClick={() => {
                      setError("");
                      setStatus("Connecting...");
                      const codeOk = joinCode.toUpperCase() === state.sessionCode && state.isHosting;
                      const peerId = `local-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;
                      if (codeOk) {
                        upsertSessionPeer({ id: peerId, name: name.trim(), color });
                        setJoined(true);
                        setStatus("Joined session");
                        setTab("chat");
                        return;
                      }
                      let settled = false;
                      const off = peerManager.onStatus((s) => {
                        setStatus(s);
                        if (s === "Connected") {
                          settled = true;
                          setJoined(true);
                          setError("");
                          setTab("chat");
                        }
                        if (s.toLowerCase().includes("error")) {
                          settled = true;
                          setJoined(false);
                          setError("Could not join. Check the code and ask the GM to start hosting.");
                        }
                      });
                      peerManager.join(joinCode, name.trim(), color);
                      setTimeout(() => {
                        off();
                        if (!settled && !joined) {
                          setError("Connection timed out. Check the code and make sure the GM started hosting.");
                          setStatus("Not connected");
                        }
                      }, 12000);
                    }}
                  >
                    Join Session
                  </Button>
                  {error && <div className="rounded-lg bg-rose-500/10 p-3 text-xs text-rose-300 ring-1 ring-rose-400/30">{error}</div>}
                  <div className="rounded-lg bg-slate-900/50 p-3 text-xs text-slate-400">
                    💡 <b>Tip:</b> The session code is shown in the GM panel (Collab tab). The session can be live or starting soon.
                  </div>
                </>
              ) : (
                <div className="space-y-3 text-center">
                  <div className="text-5xl">✅</div>
                  <h3 className="text-xl font-bold text-emerald-400">Connected!</h3>
                  <p className="text-sm text-slate-300">You are now part of the session.</p>
                  <p className="text-[10px] text-slate-500">{status}</p>
                  <p className="text-xs text-slate-500">Wait for the GM to begin or join live decisions via the Chat tab.</p>
                  <Button variant="subtle" onClick={() => setJoined(false)}>Disconnect</Button>
                </div>
              )}
            </div>
          )}

          {tab === "chat" && (
            <div className="flex h-full flex-col">
              <div className="mb-2 flex items-center gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 rounded bg-slate-900/70 px-2 py-1 text-xs ring-1 ring-white/10"
                  placeholder="Your name"
                />
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-6 w-8 rounded" />
              </div>
              {joined && <div className="mb-2 rounded-lg bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300 ring-1 ring-emerald-400/30">Connected as <b>{name}</b></div>}
              <div className="mb-2 flex-1 space-y-1.5 overflow-y-auto rounded-lg bg-slate-950/60 p-2">
                {state.chat.length === 0 && <p className="text-xs text-slate-500 text-center">No messages yet. Say hi!</p>}
                {state.chat.slice(-50).map((m) => (
                  <div key={m.id} className="text-sm">
                    <b style={{ color: m.color }}>{m.authorName}:</b> <span className="text-slate-200">{m.emoji} {m.text}</span>
                    <span className="ml-1 text-[10px] text-slate-600">{new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                ))}
              </div>
              <div className="mb-2 flex flex-wrap gap-1">
                {EMOJIS.map((e) => (
                  <button key={e} onClick={() => { sendChat("peer", name, color, "", e); peerManager.broadcast({ type: "CHAT", authorId: "peer", authorName: name, color, text: "", emoji: e }); }} className="rounded p-1 text-lg hover:bg-white/10">{e}</button>
                ))}
              </div>
              <form
                className="flex gap-2"
                onSubmit={(ev) => {
                  ev.preventDefault();
                  if (text.trim()) {
                    sendChat("peer", name, color, text.trim());
                    peerManager.broadcast({ type: "CHAT", authorId: "peer", authorName: name, color, text: text.trim() });
                    setText("");
                  }
                }}
              >
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="flex-1 rounded bg-slate-900/70 px-3 py-2 text-sm ring-1 ring-white/10"
                  placeholder="Type a message…"
                />
                <Button variant="primary" type="submit">Send</Button>
              </form>
            </div>
          )}

          {tab === "annotate" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">Use annotations to draw or mark regions of the shared canvas. Other players can see your marks.</p>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="subtle" onClick={() => alert("📌 Pin added to canvas (visual demo)")}>📌 Pin</Button>
                <Button variant="subtle" onClick={() => alert("✏️ Free draw enabled (visual demo)")}>✏️ Draw</Button>
                <Button variant="subtle" onClick={() => alert("🔤 Text added (visual demo)")}>🔤 Text</Button>
                <Button variant="subtle" onClick={() => alert("🔴 Laser pointer toggled (visual demo)")}>🔴 Laser</Button>
                <Button variant="subtle" onClick={() => alert("⬜ Rectangle drawn (visual demo)")}>⬜ Box</Button>
                <Button variant="subtle" onClick={() => alert("⭕ Circle drawn (visual demo)")}>⭕ Circle</Button>
              </div>
              <div className="rounded-lg bg-slate-900/50 p-3 text-xs text-slate-400">
                <b className="text-violet-300">Active Annotations:</b> Ready. Pins, shapes, and laser tools are available for live moderation.
              </div>
            </div>
          )}
        </div>

        {/* Footer status */}
        <div className="shrink-0 border-t border-white/10 bg-slate-950/80 px-4 py-2 text-[10px] text-slate-500">
          Status: <b className={state.isHosting ? "text-emerald-400" : "text-slate-400"}>{state.isHosting ? "Hosting active" : "Hosting offline"}</b>
        </div>
      </aside>
    </>
  );
}
