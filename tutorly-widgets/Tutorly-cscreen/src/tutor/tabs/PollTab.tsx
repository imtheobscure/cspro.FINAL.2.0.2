import { useState } from "react";
import { useStore, store, uid } from "../../state/store";
import { Btn, TInput } from "../../ui/primitives";
import { Field, Section } from "../shared";
import type { Poll } from "../../state/types";

const TEMPLATES: { label: string; q: string; opts: string[] }[] = [
  { label: "Yes / No", q: "Do you agree?", opts: ["Yes", "No"] },
  { label: "Pick one (4)", q: "Which is correct?", opts: ["A", "B", "C", "D"] },
  { label: "Difficulty", q: "How difficult was that?", opts: ["Easy", "Medium", "Hard"] },
  { label: "Rating", q: "Rate this lesson", opts: ["⭐", "⭐⭐", "⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐⭐⭐"] },
];

function emptyPoll(): Poll {
  return {
    id: uid("p_"),
    question: "",
    options: [
      { id: uid("o_"), text: "Option 1", votes: 0 },
      { id: uid("o_"), text: "Option 2", votes: 0 },
    ],
    active: false,
  };
}

export default function PollTab() {
  const polls = useStore((s) => s.polls);
  const [edit, setEdit] = useState<Poll | null>(null);

  function save(p: Poll) {
    store.set((s) => {
      const ex = s.polls.find((x) => x.id === p.id);
      s.polls = ex ? s.polls.map((x) => (x.id === p.id ? p : x)) : [...s.polls, p];
      return { ...s };
    });
    setEdit(null);
  }
  function remove(id: string) {
    if (!confirm("Delete poll?")) return;
    store.set((s) => { s.polls = s.polls.filter((p) => p.id !== id); return { ...s }; });
  }
  function activate(id: string) {
    store.set((s) => {
      s.polls = s.polls.map((p) => ({ ...p, active: p.id === id }));
      return { ...s };
    });
  }
  function deactivate() {
    store.set((s) => { s.polls = s.polls.map((p) => ({ ...p, active: false })); return { ...s }; });
  }

  return (
    <div className="space-y-4">
      <Section title="Templates">
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <Btn key={t.label} variant="soft" onClick={() => setEdit({
              id: uid("p_"),
              question: t.q,
              options: t.opts.map((o) => ({ id: uid("o_"), text: o, votes: 0 })),
              active: false,
            })}>＋ {t.label}</Btn>
          ))}
          <Btn variant="primary" onClick={() => setEdit(emptyPoll())}>＋ Custom poll</Btn>
        </div>
      </Section>

      <Section title={`Polls (${polls.length})`}>
        {polls.length === 0 ? (
          <div className="text-xs text-slate-400 text-center py-6">No polls yet.</div>
        ) : (
          <div className="space-y-2">
            {polls.map((p) => (
              <div key={p.id} className={"border rounded-xl p-3 bg-white " + (p.active ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-200")}>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800">{p.question}</div>
                    <div className="text-xs text-slate-500">{p.options.length} options · {p.options.reduce((a, b) => a + b.votes, 0)} votes</div>
                  </div>
                  {p.active ? (
                    <Btn variant="danger" size="sm" onClick={deactivate}>⏹ Stop</Btn>
                  ) : (
                    <Btn variant="success" size="sm" onClick={() => activate(p.id)}>▶ Launch</Btn>
                  )}
                  <Btn variant="ghost" size="sm" onClick={() => setEdit(p)}>✏️</Btn>
                  <Btn variant="ghost" size="sm" onClick={() => remove(p.id)}>🗑</Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {edit && <PollEditor poll={edit} onClose={() => setEdit(null)} onSave={save} />}
    </div>
  );
}

function PollEditor({ poll, onClose, onSave }: { poll: Poll; onClose: () => void; onSave: (p: Poll) => void }) {
  const [p, setP] = useState<Poll>(poll);
  function setOpt(i: number, patch: Partial<Poll["options"][number]>) {
    setP({ ...p, options: p.options.map((o, j) => (i === j ? { ...o, ...patch } : o)) });
  }
  function addOpt() {
    setP({ ...p, options: [...p.options, { id: uid("o_"), text: "Option", votes: 0 }] });
  }
  function rmOpt(i: number) {
    setP({ ...p, options: p.options.filter((_, j) => i !== j) });
  }
  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={onClose}>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between">
          <h3 className="font-semibold">Edit poll</h3>
          <div className="flex gap-1">
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" onClick={() => onSave(p)}>Save</Btn>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <Field label="Question"><TInput value={p.question} onChange={(e) => setP({ ...p, question: e.target.value })} /></Field>
          <Field label="Options (tutor sets vote counts)">
            <div className="space-y-1.5">
              {p.options.map((o, i) => (
                <div key={o.id} className="flex gap-1 items-center">
                  <TInput value={o.text} onChange={(e) => setOpt(i, { text: e.target.value })} className="flex-1" />
                  <TInput type="number" value={o.votes} onChange={(e) => setOpt(i, { votes: Math.max(0, Number(e.target.value) || 0) })} className="w-20 text-center" />
                  <Btn variant="ghost" size="icon" onClick={() => rmOpt(i)}>✕</Btn>
                </div>
              ))}
              <Btn variant="ghost" size="sm" onClick={addOpt}>＋ Add option</Btn>
            </div>
          </Field>
        </div>
      </div>
    </div>
  );
}
