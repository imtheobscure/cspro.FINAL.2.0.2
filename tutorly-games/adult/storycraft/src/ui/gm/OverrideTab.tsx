import { useEffect, useRef, useState } from "react";
import { useGameState, store } from "../../engine/store";
import { deployScene } from "../../engine/actions";
import { Button, Card, SectionTitle } from "../primitives";

// Lightweight HTML syntax highlighter (no deps): tags violet, attrs amber, strings green.
function highlight(code: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc(code)
    .replace(/(&lt;\/?)([a-zA-Z0-9-]+)/g, '$1<span style="color:#c4b5fd">$2</span>')
    .replace(/([a-zA-Z-]+)=(&quot;|")(.*?)(&quot;|")/g, '<span style="color:#fbbf24">$1</span>=<span style="color:#86efac">"$3"</span>');
}

export function OverrideTab() {
  const state = useGameState();
  const cur = state.chapters.find((c) => c.id === state.activeChapterId);
  const [code, setCode] = useState(cur?.html ?? "");
  const preRef = useRef<HTMLPreElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setCode(cur?.html ?? ""); }, [cur?.id]); // eslint-disable-line

  const sync = () => {
    if (preRef.current && taRef.current) {
      preRef.current.scrollTop = taRef.current.scrollTop;
      preRef.current.scrollLeft = taRef.current.scrollLeft;
    }
  };

  const saveCurrent = () => {
    if (!cur) return;
    store.set((s) => ({ ...s, chapters: s.chapters.map((c) => (c.id === cur.id ? { ...c, html: code } : c)) }));
    store.command({ type: "DEPLOY_HTML", html: code, opening: cur.narratorOpening });
  };

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle action={
          <div className="flex gap-2">
            <Button size="sm" variant="subtle" disabled={!cur} onClick={saveCurrent}>💾 Save & Re-render</Button>
            <Button size="sm" variant="primary" disabled={!code.trim()} onClick={() => deployScene(code)}>▶ Deploy as New</Button>
          </div>
        }>
          Manual Override Editor
        </SectionTitle>
        <p className="text-xs text-slate-400">Fallback editor with syntax highlighting to fix broken AI output. Edits the current chapter or deploys a fresh one.</p>
      </Card>

      <div className="relative h-[60vh] overflow-hidden rounded-xl ring-1 ring-white/10">
        <pre ref={preRef} aria-hidden className="pointer-events-none absolute inset-0 m-0 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-xs leading-5 text-slate-200"
          dangerouslySetInnerHTML={{ __html: highlight(code) + "\n" }} />
        <textarea ref={taRef} value={code} spellCheck={false}
          onChange={(e) => setCode(e.target.value)} onScroll={sync}
          className="absolute inset-0 m-0 resize-none overflow-auto whitespace-pre-wrap break-words bg-transparent p-3 font-mono text-xs leading-5 text-transparent caret-violet-400 outline-none"
          style={{ WebkitTextFillColor: "transparent" }}
          placeholder="Paste / edit raw HTML here…" />
      </div>
    </div>
  );
}
