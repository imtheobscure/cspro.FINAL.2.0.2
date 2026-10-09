import { useEffect, useState } from "react";
import { useStore } from "../state/store";
import { Btn, TInput } from "../ui/primitives";
import ParticipantsTab from "./tabs/ParticipantsTab";
import SpeakTab from "./tabs/SpeakTab";
import ReactionsTab from "./tabs/ReactionsTab";
import PollTab from "./tabs/PollTab";
import DialogueTab from "./tabs/DialogueTab";
import LeaderboardTab from "./tabs/LeaderboardTab";
import TranscriberTab from "./tabs/TranscriberTab";
import SettingsTab from "./tabs/SettingsTab";
import CanvasPromptTab from "./tabs/CanvasPromptTab";

const PASSWORD = "Admin#123";
const SESSION_KEY = "tutor-authed";

type TabKey =
  | "participants"
  | "speak"
  | "reactions"
  | "poll"
  | "dialogue"
  | "leaderboard"
  | "transcriber"
  | "canvas"
  | "settings";

export default function TutorControl() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  const [tab, setTab] = useState<TabKey>("participants");

  useEffect(() => {
    document.title = "Tutor Control";
  }, []);

  if (!authed) return <PasswordGate onPass={() => { sessionStorage.setItem(SESSION_KEY, "1"); setAuthed(true); }} />;

  return (
    <div className="fixed inset-0 bg-slate-50 flex text-slate-800">
      <Sidebar tab={tab} setTab={setTab} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <Header tab={tab} />
        <div className="p-6 max-w-6xl mx-auto">
          {tab === "participants" && <ParticipantsTab />}
          {tab === "speak" && <SpeakTab />}
          {tab === "reactions" && <ReactionsTab />}
          {tab === "poll" && <PollTab />}
          {tab === "dialogue" && <DialogueTab />}
          {tab === "leaderboard" && <LeaderboardTab />}
          {tab === "transcriber" && <TranscriberTab />}
          {tab === "canvas" && <CanvasPromptTab />}
          {tab === "settings" && <SettingsTab />}
        </div>
      </main>
    </div>
  );
}

function PasswordGate({ onPass }: { onPass: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="w-96 bg-white border border-slate-200 rounded-3xl shadow-2xl p-8">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl mb-4 shadow-lg">
          🔐
        </div>
        <h1 className="text-xl font-bold text-center text-slate-800">Tutor Control</h1>
        <p className="text-sm text-slate-500 text-center mt-1 mb-6">Restricted area · Enter password to continue</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (pw === PASSWORD) onPass();
            else { setErr(true); setPw(""); }
          }}
        >
          <TInput
            autoFocus
            type="password"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setErr(false); }}
            placeholder="Password"
            className={err ? "!border-rose-400 !ring-rose-200" : ""}
          />
          {err && <div className="text-xs text-rose-600 mt-2">Incorrect password.</div>}
          <Btn type="submit" variant="primary" className="w-full mt-4" size="lg">Unlock</Btn>
        </form>
      </div>
    </div>
  );
}

function Sidebar({ tab, setTab }: { tab: TabKey; setTab: (t: TabKey) => void }) {
  const npcs = useStore((s) => s.npcs);
  const peer = useStore((s) => s.peer);
  const items: { k: TabKey; label: string; icon: string }[] = [
    { k: "participants", label: "Participants", icon: "👥" },
    { k: "speak", label: "Speak", icon: "🗣" },
    { k: "reactions", label: "Reactions", icon: "✨" },
    { k: "poll", label: "Live Poll", icon: "📊" },
    { k: "dialogue", label: "Dialogue", icon: "💭" },
    { k: "leaderboard", label: "Leaderboard", icon: "🏆" },
    { k: "transcriber", label: "Transcriber", icon: "📝" },
    { k: "canvas", label: "Canvas", icon: "🎨" },
    { k: "settings", label: "Settings", icon: "⚙️" },
  ];
  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow">⚙</div>
          <div>
            <div className="font-bold text-slate-800 text-sm">Tutor Control</div>
            <div className="text-[10px] text-slate-500">Detached window</div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {items.map((it) => (
          <button
            key={it.k}
            onClick={() => setTab(it.k)}
            className={
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition " +
              (tab === it.k
                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow"
                : "text-slate-700 hover:bg-slate-100")
            }
          >
            <span>{it.icon}</span>
            <span>{it.label}</span>
          </button>
        ))}
      </div>
      <div className="p-3 border-t border-slate-100 space-y-1 text-[11px]">
        <div className="flex items-center justify-between text-slate-500">
          <span>Participants</span>
          <span className="font-bold text-slate-700">{npcs.length}</span>
        </div>
        <div className="flex items-center justify-between text-slate-500">
          <span>Hosting</span>
          <span className={peer.hosting ? "font-bold text-emerald-600" : "text-slate-400"}>
            {peer.hosting ? "● LIVE" : "Off"}
          </span>
        </div>
      </div>
    </aside>
  );
}

function Header({ tab }: { tab: TabKey }) {
  const titles: Record<TabKey, string> = {
    participants: "Participants",
    speak: "Speak as participant",
    reactions: "Reactions & Animations",
    poll: "Live Polls",
    dialogue: "Dialogue Generator",
    leaderboard: "Leaderboard",
    transcriber: "Live Transcriber",
    canvas: "Canvas Prompt Generator",
    settings: "Settings",
  };
  return (
    <header className="sticky top-0 z-10 bg-white/85 backdrop-blur border-b border-slate-200 px-6 py-3">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-lg font-bold text-slate-800">{titles[tab]}</h2>
      </div>
    </header>
  );
}
