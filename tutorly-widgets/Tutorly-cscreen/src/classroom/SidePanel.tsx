import { useEffect, useRef, useState } from "react";
import { useStore, store } from "../state/store";
import { Btn } from "../ui/primitives";
import PeerPanel from "./PeerPanel";
import AnnotationsPanel from "./AnnotationsPanel";
import Chat from "../chat/Chat";
import { Avatar } from "../chat/Avatar";

interface Props {
  onClose: () => void;
  onOpenTutor: () => void;
}

type Tab = "chat" | "people" | "peer" | "tools";

export default function SidePanel({ onClose, onOpenTutor }: Props) {
  const [tab, setTab] = useState<Tab>(() => {
    try {
      if (new URL(window.location.href).searchParams.get("join")) return "peer";
    } catch {}
    return "chat";
  });
  const [width, setWidth] = useState(() => {
    try {
      return Number(localStorage.getItem("panel-w")) || 380;
    } catch {
      return 380;
    }
  });
  const resizingRef = useRef(false);

  useEffect(() => {
    localStorage.setItem("panel-w", String(width));
  }, [width]);

  useEffect(() => {
    function move(e: MouseEvent) {
      if (!resizingRef.current) return;
      const w = Math.min(720, Math.max(320, e.clientX));
      setWidth(w);
    }
    function up() {
      resizingRef.current = false;
      document.body.style.cursor = "";
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  return (
    <aside
      style={{ width }}
      className="fixed left-0 top-0 bottom-0 z-50 flex flex-col border-r border-slate-200 bg-white/95 shadow-2xl backdrop-blur-xl"
    >
      <header className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 font-bold text-white shadow">🎓</div>
        <div className="flex-1">
          <div className="font-semibold text-slate-800">Tutor Academy</div>
          <div className="text-[10px] text-slate-500">Tutomy.com • Live classroom</div>
        </div>
        <Btn size="icon" variant="ghost" onClick={onOpenTutor} title="Open Tutor Control">
          ⚙️
        </Btn>
        <Btn size="icon" variant="ghost" onClick={onClose} title="Close panel">
          ✕
        </Btn>
      </header>

      <nav className="flex items-center gap-1 border-b border-slate-100 bg-slate-50/40 px-2 py-2">
        <TabBtn active={tab === "chat"} onClick={() => setTab("chat")} icon="💬">
          Chat
        </TabBtn>
        <TabBtn active={tab === "people"} onClick={() => setTab("people")} icon="👥">
          People
        </TabBtn>
        <TabBtn active={tab === "peer"} onClick={() => setTab("peer")} icon="🔗">
          Share
        </TabBtn>
        <TabBtn active={tab === "tools"} onClick={() => setTab("tools")} icon="🖌">
          Tools
        </TabBtn>
      </nav>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "chat" && <Chat onClose={onClose} onOpenTutor={onOpenTutor} />}
        {tab === "people" && <PeopleTab />}
        {tab === "peer" && (
          <div className="h-full overflow-y-auto">
            <PeerPanel />
          </div>
        )}
        {tab === "tools" && (
          <div className="h-full overflow-y-auto">
            <AnnotationsPanel />
          </div>
        )}
      </div>

      {/* Resizer */}
      <div
        onMouseDown={() => {
          resizingRef.current = true;
          document.body.style.cursor = "ew-resize";
        }}
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize transition hover:bg-indigo-300/40"
        title="Drag to resize"
      />
    </aside>
  );
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        "flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-lg transition " +
        (active ? "bg-white shadow-sm border border-slate-200 text-indigo-600" : "text-slate-600 hover:bg-white/70")
      }
    >
      <span>{icon}</span>
      <span>{children}</span>
    </button>
  );
}

function PeopleTab() {
  const npcs = useStore((s) => s.npcs);
  const learners = useStore((s) => s.learners);
  const speaker = useStore((s) => s.speaker);
  const raisedHands = useStore((s) => s.raisedHands);

  function toggleMic(id: string) {
    store.set((s) => {
      s.npcs = s.npcs.map((n) => (n.id === id ? { ...n, mic: !n.mic } : n));
      return { ...s };
    });
  }

  return (
    <div className="h-full space-y-4 overflow-y-auto p-3">
      {raisedHands.length > 0 && (
        <section>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-600">✋ Raised Hands</h4>
          <div className="space-y-1">
            {raisedHands.map((h) => (
              <div key={h.id} className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5">
                <span className="text-lg">✋</span>
                <span className="text-sm font-medium text-amber-900">{h.name}</span>
                <span className="ml-auto text-[10px] text-amber-700">{Math.round((Date.now() - h.ts) / 1000)}s ago</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Participants ({npcs.length})</h4>
        <div className="space-y-1">
          {npcs.map((n) => {
            const speaking = speaker.npcId === n.id && speaker.speaking;
            return (
              <div key={n.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-slate-50">
                <div className="relative">
                  <Avatar name={n.name} avatar={n.avatar} size={34} ring={speaking} />
                  {speaking && <span className="absolute -bottom-0.5 -right-0.5 text-xs">🔊</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-800">{n.name}</div>
                  <div className="truncate text-[11px] text-slate-500">{n.role}</div>
                </div>
                <button
                  onClick={() => toggleMic(n.id)}
                  className={"flex h-7 w-7 items-center justify-center rounded-lg text-sm transition " + (n.mic ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400")}
                  title={n.mic ? "Mic on" : "Mic off"}
                >
                  {n.mic ? "🎤" : "🚫"}
                </button>
              </div>
            );
          })}
          {npcs.length === 0 && <div className="py-6 text-center text-xs text-slate-400">No participants yet. Add some in Tutor Control.</div>}
        </div>
      </section>

      {learners.length > 0 && (
        <section>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Learners ({learners.length})</h4>
          <div className="space-y-1">
            {learners.map((l) => (
              <div key={l.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                <Avatar name={l.name} avatar={l.avatar} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-800">{l.name}</div>
                  <div className="text-[11px] text-slate-500">
                    {l.rarity} · {l.score} pts
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// Kept as re-exports so existing imports (Classroom, tutor tabs, peers) keep working.
export { Avatar };
export { addMessage } from "../chat/bus";
