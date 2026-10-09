import { useStore, store } from "../state/store";
import { Btn } from "../ui/primitives";

export default function PollDisplay() {
  const polls = useStore((s) => s.polls);
  const active = polls.find((p) => p.active);
  if (!active) return null;
  const total = active.options.reduce((a, b) => a + b.votes, 0) || 1;

  function close() {
    store.set((s) => {
      s.polls = s.polls.map((p) => (p.id === active!.id ? { ...p, active: false } : p));
      return { ...s };
    });
  }

  return (
    <div className="fixed top-20 right-4 z-40 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 animate-slidein">
      <div className="flex items-start gap-2 mb-3">
        <div className="text-xl">📊</div>
        <div className="flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">Live Poll</div>
          <div className="font-bold text-slate-800">{active.question}</div>
        </div>
        <Btn size="icon" variant="ghost" onClick={close}>✕</Btn>
      </div>
      <div className="space-y-2">
        {active.options.map((o) => {
          const pct = (o.votes / total) * 100;
          return (
            <div key={o.id} className="relative">
              <div className="flex items-center justify-between text-xs font-medium mb-0.5">
                <span className="text-slate-700">{o.text}</span>
                <span className="text-slate-500">{o.votes} · {Math.round(pct)}%</span>
              </div>
              <div className="h-6 bg-slate-100 rounded-lg overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-[10px] text-slate-400 mt-2 text-right">{total} votes</div>
      <style>{`@keyframes slidein{from{transform:translateX(40px);opacity:0}to{transform:none;opacity:1}}.animate-slidein{animation:slidein .3s ease-out}`}</style>
    </div>
  );
}
