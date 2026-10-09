import { useEffect, useRef, useState } from "react";
import { useStore, store, uid } from "../state/store";
import { Btn, TInput, TTextarea, Label } from "../ui/primitives";

export default function CanvasTabs() {
  const tabs = useStore((s) => s.canvasTabs);
  const [activeId, setActiveId] = useState<string | null>(tabs[0]?.id || null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [paused, setPaused] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!activeId && tabs[0]) setActiveId(tabs[0].id);
    if (activeId && !tabs.find((t) => t.id === activeId)) setActiveId(tabs[0]?.id || null);
  }, [tabs, activeId]);

  const active = tabs.find((t) => t.id === activeId);

  function newTab() {
    setEditing(true);
    setDraft("");
    setDraftTitle("Untitled " + (tabs.length + 1));
    setActiveId(null);
  }

  function editTab() {
    if (!active) return;
    setEditing(true);
    setDraft(active.html);
    setDraftTitle(active.title);
  }

  function showTab() {
    const html = draft.trim();
    if (!html) return;
    if (active) {
      store.set((s) => {
        s.canvasTabs = s.canvasTabs.map((t) => (t.id === active.id ? { ...t, html, title: draftTitle } : t));
        return { ...s };
      });
    } else {
      const newT = { id: uid("c_"), html, title: draftTitle || "Untitled" };
      store.set((s) => {
        s.canvasTabs = [...s.canvasTabs, newT];
        return { ...s };
      });
      setActiveId(newT.id);
    }
    setEditing(false);
  }

  function deleteTab(id: string) {
    if (!confirm("Delete this canvas tab?")) return;
    store.set((s) => {
      s.canvasTabs = s.canvasTabs.filter((t) => t.id !== id);
      return { ...s };
    });
  }

  function saveAsHtml(t: { title: string; html: string }) {
    const full = `<!doctype html><html><head><meta charset="utf-8"><title>${t.title}</title></head><body>${t.html}</body></html>`;
    const blob = new Blob([full], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t.title.replace(/[^a-z0-9]+/gi, "_")}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function togglePause() {
    setPaused((v) => !v);
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage({ type: paused ? "resume" : "pause" }, "*");
      } catch {}
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-1 overflow-x-auto flex-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { setActiveId(t.id); setEditing(false); }}
              className={
                "group inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-lg border-b-2 transition whitespace-nowrap " +
                (activeId === t.id && !editing
                  ? "bg-slate-50 border-indigo-500 text-indigo-700 font-semibold"
                  : "border-transparent text-slate-600 hover:bg-slate-50")
              }
            >
              <span className="truncate max-w-[140px]">{t.title}</span>
              <span
                onClick={(e) => { e.stopPropagation(); deleteTab(t.id); }}
                className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100"
              >
                ✕
              </span>
            </button>
          ))}
          <Btn size="sm" variant="ghost" onClick={newTab}>＋ New</Btn>
        </div>
        {active && !editing && (
          <>
            <Btn size="sm" variant="ghost" onClick={editTab}>✏️ Edit</Btn>
            <Btn size="sm" variant={paused ? "primary" : "ghost"} onClick={togglePause}>{paused ? "▶ Resume" : "⏸ Pause"}</Btn>
            <Btn size="sm" variant="ghost" onClick={() => saveAsHtml(active)}>💾 Save</Btn>
          </>
        )}
      </div>
      <div className="flex-1 min-h-0 relative bg-white">
        {editing ? (
          <div className="absolute inset-0 flex flex-col p-3 gap-2 bg-slate-50">
            <div className="flex items-center gap-2">
              <Label>Title</Label>
              <TInput value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} className="flex-1" />
              <Btn size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Btn>
              <Btn size="sm" variant="success" onClick={showTab}>▶ Show</Btn>
            </div>
            <Label>Paste AI-generated HTML</Label>
            <TTextarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="flex-1 font-mono text-xs"
              placeholder="<div>Paste HTML/CSS/JS here…</div>"
            />
            <div className="text-[11px] text-slate-500">
              💡 Tip: Use the Tutor Control → Canvas tab to copy a prompt for the AI.
            </div>
          </div>
        ) : active ? (
          <>
            <iframe
              ref={iframeRef}
              key={active.id + (paused ? "p" : "r")}
              title={active.title}
              sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups allow-forms"
              srcDoc={paused ? wrapWithPauseOverlay(active.html) : wrapHtml(active.html)}
              className="absolute inset-0 w-full h-full border-0"
            />
            {paused && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                <div className="text-white text-6xl">⏸</div>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-center">
            <div>
              <div className="text-6xl mb-3">🎨</div>
              <div className="text-slate-500 mb-3">No canvas yet. Create one to show interactive lessons.</div>
              <Btn variant="primary" onClick={newTab}>＋ New Canvas Tab</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function wrapHtml(inner: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;color:#0f172a}*{box-sizing:border-box}</style></head><body>${inner}<script>window.addEventListener('message',e=>{if(e.data&&e.data.type==='pause'){document.querySelectorAll('audio,video').forEach(m=>m.pause())}if(e.data&&e.data.type==='resume'){document.querySelectorAll('audio,video').forEach(m=>m.play().catch(()=>{}))}})<\/script></body></html>`;
}
function wrapWithPauseOverlay(inner: string) {
  // muted version
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#0f172a;color:#fff;font-family:sans-serif}.pause-mask{position:fixed;inset:0;background:#000;opacity:.6}</style></head><body>${inner}<div class="pause-mask"></div><script>document.querySelectorAll('audio,video').forEach(m=>m.pause())<\/script></body></html>`;
}
