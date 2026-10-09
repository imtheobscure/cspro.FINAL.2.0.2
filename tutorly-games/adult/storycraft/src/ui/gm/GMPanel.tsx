import { useState } from "react";
import { useGameState, store } from "../../engine/store";
import { setPaused } from "../../engine/actions";
import { cn } from "../../utils/cn";
import { PlayersTab } from "./PlayersTab";
import { UniverseTab } from "./UniverseTab";
import { AITab } from "./AITab";
import { EffectsTab } from "./EffectsTab";
import { SoundTab } from "./SoundTab";
import { LiveTab } from "./LiveTab";
import { StoryMapTab } from "./StoryMapTab";
import { OverrideTab } from "./OverrideTab";
import { ExportTab } from "./ExportTab";
import { SettingsTab } from "./SettingsTab";
import { CollabTab } from "./CollabTab";
import { ConversationTab } from "./ConversationTab";

const TABS = [
  { id: "players", label: "Players", icon: "👥", C: PlayersTab },
  { id: "universe", label: "Universe", icon: "🌌", C: UniverseTab },
  { id: "ai", label: "Story Maker", icon: "📝", C: AITab },
  { id: "live", label: "Live Feed", icon: "📡", C: LiveTab },
  { id: "effects", label: "Effects", icon: "💥", C: EffectsTab },
  { id: "sound", label: "Environment", icon: "🌦️", C: SoundTab },
  { id: "map", label: "Story Map", icon: "🗺️", C: StoryMapTab },
  { id: "override", label: "Override", icon: "⌨️", C: OverrideTab },
  { id: "conv", label: "Conversation", icon: "🎬", C: ConversationTab },
  { id: "collab", label: "Collab", icon: "🌐", C: CollabTab },
  { id: "settings", label: "Settings", icon: "⚙️", C: SettingsTab },
  { id: "export", label: "Export", icon: "💾", C: ExportTab },
] as const;

export function GMPanel({ standalone }: { standalone?: boolean }) {
  const [tab, setTab] = useState<string>("players");
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState("");
  const state = useGameState();
  const Active = TABS.find((t) => t.id === tab)?.C ?? null;
  const locked = (state.chapters.find((c) => c.id === state.activeChapterId)?.decisions ?? []).length;
  const livePlayers = state.entities.filter((e) => e.kind === "player" && !e.dead).length;

  if (!authed) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
        <div className="w-full max-w-sm space-y-4 rounded-2xl bg-slate-900 p-8 shadow-2xl ring-1 ring-white/10">
          <div className="text-center">
            <div className="mx-auto mb-3 text-4xl">🔐</div>
            <h2 className="text-xl font-bold">Admin Access</h2>
            <p className="text-xs text-slate-400">Enter password to access GM Control Panel</p>
          </div>
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && pass === "Admin#123321") setAuthed(true); }}
            className="w-full rounded-lg bg-slate-950 px-4 py-2 text-center text-sm outline-none ring-1 ring-white/20 focus:ring-violet-500"
            placeholder="••••••••"
            autoFocus
          />
          <button
            onClick={() => { if (pass === "Admin#123321") setAuthed(true); else alert("Wrong password"); }}
            className="w-full rounded-lg bg-violet-600 py-2 text-sm font-bold transition hover:bg-violet-500"
          >
            Unlock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-900 text-slate-100">
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-slate-950 px-4 py-2.5">
        <span className="text-xl">🎛️</span>
        <div>
          <h1 className="text-sm font-black tracking-tight">GM CONTROL PANEL</h1>
          <p className="text-[10px] text-slate-500">{state.meta.title} · {state.settings.mode.toUpperCase()} · {state.settings.tone}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded-full bg-slate-800 px-2 py-1 text-[11px] text-slate-300">🔒 {locked}/{livePlayers}</span>
          <button onClick={() => setPaused(!state.paused)}
            className={cn("rounded-lg px-3 py-1.5 text-sm font-bold", state.paused ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-100")}>
            {state.paused ? "▶ Resume" : "⏸ Pause"}
          </button>
        </div>
      </header>

      <nav className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-white/10 bg-slate-950/80 px-2 py-1.5">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <div key={t.id} className={cn("group flex shrink-0 items-center gap-0.5 rounded-lg ring-1 ring-transparent",
              active && "bg-gradient-to-br from-violet-600 to-indigo-600 ring-white/10")}>
              <button
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  active ? "text-white" : "text-slate-400 hover:bg-white/5",
                )}
              >
                <span>{t.icon}</span><span>{t.label}</span>
              </button>
              {active && (
                <button
                  onClick={() => setTab("")}
                  title="Close this tab (click Players or another to re-open)"
                  className="mr-1 grid h-6 w-6 place-items-center rounded-md text-white/80 hover:bg-white/15"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
        {tab === "" && (
          <div className="ml-2 text-[11px] text-slate-500">All tabs closed — click one above to open.</div>
        )}
      </nav>

      <div className="flex shrink-0 items-center gap-3 bg-indigo-950/30 px-4 py-2 text-[10px] text-indigo-200">
        <span className="flex items-center gap-1">🌐 Hosted Code: <b className="font-mono text-emerald-400">{state.sessionCode}</b></span>
        <span className="h-3 w-px bg-white/10" />
        <span className="flex items-center gap-1">Status: <b className={state.isHosting ? "text-emerald-400" : "text-slate-400"}>{state.isHosting ? "Active" : "Local Only"}</b></span>
        <button 
          onClick={() => store.set(s => ({ ...s, isHosting: !s.isHosting }))}
          className="ml-auto rounded bg-indigo-500/20 px-2 py-0.5 hover:bg-indigo-500/40"
        >
          {state.isHosting ? "Stop Hosting" : "Go Online"}
        </button>
      </div>

      <main className="flex-1 overflow-y-auto p-4">
        {Active ? <Active /> : (
          <div className="grid h-full place-items-center text-center text-slate-400">
            <div>
              <div className="mb-2 text-5xl">🗂️</div>
              <h3 className="text-lg font-bold text-slate-200">All tabs closed</h3>
              <p className="text-xs text-slate-500">Click a tab above to open it again. The GM panel keeps running.</p>
            </div>
          </div>
        )}
      </main>

      {!standalone && (
        <footer className="shrink-0 border-t border-white/10 bg-slate-950 px-4 py-1.5 text-center text-[10px] text-slate-600">
          Players see only the canvas. Pop this panel out via the GM button on the canvas.
        </footer>
      )}
    </div>
  );
}
