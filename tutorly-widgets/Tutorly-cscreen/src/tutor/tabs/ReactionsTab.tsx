import { useState, useRef } from "react";
import { useStore, store, bus, uid } from "../../state/store";
import { Btn, TInput } from "../../ui/primitives";
import { Field, Section } from "../shared";
import type { ReactionAnim } from "../../state/types";

const STYLES: ReactionAnim["style"][] = ["rain", "dance", "explode", "spiral", "fountain", "wave"];

export default function ReactionsTab() {
  const reactions = useStore((s) => s.reactions);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function add() {
    const r: ReactionAnim = { id: uid("r_"), name: "New", emoji: "🎈", style: "rain" };
    store.set((s) => { s.reactions = [...s.reactions, r]; return { ...s }; });
  }
  function update(id: string, patch: Partial<ReactionAnim>) {
    store.set((s) => { s.reactions = s.reactions.map((x) => (x.id === id ? { ...x, ...patch } : x)); return { ...s }; });
  }
  function remove(id: string) {
    if (!confirm("Delete reaction?")) return;
    store.set((s) => { s.reactions = s.reactions.filter((x) => x.id !== id); return { ...s }; });
  }
  function play(r: ReactionAnim) {
    bus.emit("reaction-start", r);
  }
  function stop() {
    bus.emit("reaction-stop");
  }
  function browseFor(id: string) {
    setPendingId(id);
    fileRef.current?.click();
  }
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !pendingId) return;
    const r = new FileReader();
    r.onload = () => update(pendingId!, { url: r.result as string });
    r.readAsDataURL(f);
    e.target.value = "";
    setPendingId(null);
  }

  return (
    <div className="space-y-4">
      <input ref={fileRef} type="file" accept="image/*,image/gif" hidden onChange={onFile} />
      <Section
        title={`Reaction animations (${reactions.length})`}
        right={
          <div className="flex gap-1">
            <Btn variant="danger" onClick={stop}>⏹ Stop all</Btn>
            <Btn variant="primary" onClick={add}>＋ Add</Btn>
          </div>
        }
      >
        <p className="text-xs text-slate-500 mb-3">Trigger animated emoji effects on the classroom screen. Plays alongside audio.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {reactions.map((r) => (
            <div key={r.id} className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
              <div className="flex items-center gap-2">
                <div className="text-3xl">{r.url ? <img src={r.url} className="w-10 h-10 object-contain" /> : r.emoji}</div>
                <div className="flex-1">
                  <TInput value={r.name} onChange={(e) => update(r.id, { name: e.target.value })} className="text-sm font-medium" />
                </div>
                <Btn variant="primary" size="sm" onClick={() => play(r)}>▶ Test</Btn>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Emoji">
                  <TInput value={r.emoji} onChange={(e) => update(r.id, { emoji: e.target.value })} maxLength={6} />
                </Field>
                <Field label="Style">
                  <select
                    value={r.style}
                    onChange={(e) => update(r.id, { style: e.target.value as any })}
                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Custom image URL (overrides emoji)">
                <div className="flex gap-1">
                  <TInput value={r.url || ""} onChange={(e) => update(r.id, { url: e.target.value || undefined })} placeholder="https://… or browse" className="flex-1" />
                  <Btn size="sm" variant="ghost" onClick={() => browseFor(r.id)}>Browse</Btn>
                  {r.url && <Btn size="sm" variant="ghost" onClick={() => update(r.id, { url: undefined })}>Clear</Btn>}
                </div>
              </Field>
              <div className="flex justify-end">
                <Btn size="sm" variant="ghost" onClick={() => remove(r.id)}>🗑 Delete</Btn>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
