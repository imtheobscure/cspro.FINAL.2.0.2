import { useState } from "react";
import { useGameState, store } from "../../engine/store";
import { addChatGroup, removeChatGroup, addToGroup, removeFromGroup } from "../../engine/actions";
import { peerManager } from "../../engine/peer";
import { Badge, Button, Card, Field, Input, SectionTitle, copyToClipboard } from "../primitives";

export function CollabTab() {
  const state = useGameState();
  const [groupName, setGroupName] = useState("");
  const [groupEmoji, setGroupEmoji] = useState("💬");
  const code = state.sessionCode;
  
  return (
    <div className="space-y-4">
      <Card className="border-2 border-indigo-500/30 bg-indigo-500/5">
        <SectionTitle>🌐 Session Hosting</SectionTitle>
        <p className="text-xs text-slate-400 mb-3">
          When you start a session, a <b>JOIN SESSION</b> button appears on the shared canvas. Players can click it to enter the code and open the side panel for chat, join, and annotations.
        </p>
        <div className="flex gap-2 mb-3">
          <Button 
            variant={state.isHosting ? "primary" : "subtle"} 
            onClick={() => {
              if (state.isHosting) {
                peerManager.close();
                store.set((s: typeof state) => ({ ...s, isHosting: false }));
              } else {
                peerManager.host(state.sessionCode);
                store.set((s: typeof state) => ({ ...s, isHosting: true, sessionPanelOpen: false }));
              }
            }}
          >
            {state.isHosting ? "⏹ Stop Hosting" : "▶ Start Hosting"}
          </Button>
          <Button variant="subtle" onClick={() => copyToClipboard(code)}>
            📋 Copy Code
          </Button>
        </div>
        <div className="rounded-lg bg-slate-950/60 p-3">
          <div className="text-[10px] text-slate-400 mb-1">SESSION CODE (used by the side panel)</div>
          <div className="flex items-center gap-2">
            <div className="font-mono text-2xl font-black text-violet-400 tracking-widest flex-1">{code}</div>
            <Button size="sm" variant="subtle" onClick={() => copyToClipboard(code)}>Copy</Button>
          </div>
        </div>
        <div className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${state.isHosting ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-400"}`}>
          {state.isHosting ? "● Active" : "○ Offline"}
        </div>
      </Card>

      <Card>
        <SectionTitle>Joined Players</SectionTitle>
        <div className="space-y-1">
          {state.sessionPeers.length === 0 && <p className="text-xs text-slate-500">No joined players yet. Start hosting and ask players to use the Join button on the canvas.</p>}
          {state.sessionPeers.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-2">
              <span className="text-sm font-bold" style={{ color: p.color }}>● {p.name}</span>
              <Badge color={p.color}>joined</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle action={
          <Button size="sm" variant="primary" onClick={() => {
            if (groupName.trim()) {
              addChatGroup(groupName.trim(), groupEmoji, []);
              setGroupName("");
            }
          }}>+ Create Group</Button>
        }>
          Player Groups & Chat Rooms
        </SectionTitle>
        <p className="text-xs text-slate-400 mb-3">
          Create groups for different sides (e.g., Mafia vs Town). Players in the same group can chat privately. GM sees all rooms.
        </p>
        <div className="flex gap-2 mb-3">
          <Field label="Group Name"><Input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="e.g. Mafia, Town, Allies..." className="flex-1" /></Field>
          <Field label="Icon"><Input value={groupEmoji} onChange={e => setGroupEmoji(e.target.value)} className="w-16 text-center text-2xl" /></Field>
        </div>
      </Card>

      <div className="space-y-3">
        {state.chatGroups.length === 0 && (
          <Card><p className="text-sm text-slate-500 text-center">No groups created yet. Create a group above.</p></Card>
        )}
        {state.chatGroups.map(g => {
          const members = g.memberIds.map(id => state.sessionPeers.find(e => e.id === id)).filter(Boolean);
          return (
            <Card key={g.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{g.emoji}</span>
                  <span className="font-bold text-lg" style={{ color: g.color }}>{g.name}</span>
                  <Badge color={g.color}>{members.length} members</Badge>
                </div>
                <Button size="icon" variant="danger" onClick={() => removeChatGroup(g.id)}>🗑️</Button>
              </div>

              <Field label="Members">
                <div className="flex flex-wrap gap-1">
                  {members.map((m: any) => (
                    <span key={m.id} className="flex items-center gap-1 rounded-full bg-slate-900/60 px-2 py-0.5 text-xs" style={{ borderLeft: `3px solid ${m.color}` }}>
                      {m.emoji} {m.name}
                      <button onClick={() => removeFromGroup(g.id, m.id)} className="text-slate-500 hover:text-rose-400">✕</button>
                    </span>
                  ))}
                </div>
              </Field>

              <Field label="Add Member">
                <div className="flex gap-1">
                  <select className="flex-1 rounded-lg bg-slate-900/70 px-2 py-1 text-xs text-slate-100 ring-1 ring-white/10" onChange={e => { if (e.target.value) { addToGroup(g.id, e.target.value); e.target.value = ""; } }}>
                    <option value="">Select entity...</option>
                    {state.sessionPeers.filter(e => !g.memberIds.includes(e.id)).map(e => (
                      <option key={e.id} value={e.id}>● {e.name}</option>
                    ))}
                  </select>
                </div>
              </Field>

              {g.messages.length > 0 && (
                <Field label={`Chat History (${g.messages.length} msgs)`}>
                  <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg bg-slate-950/60 p-2 text-xs">
                    {g.messages.slice(-10).map(m => (
                      <div key={m.id} className="text-slate-300">
                        <span className="font-bold" style={{ color: m.color }}>{m.authorName}:</span> {m.emoji} {m.text}
                        <span className="ml-2 text-[9px] text-slate-500">{new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    ))}
                  </div>
                </Field>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
