"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, cx } from "@/components/ui";

type Ep = { id: string; title: string; thumbnail: string | null; episodeNumber: number };

export function WatchPartyLobby({ episodes }: { episodes: Ep[] }) {
  const router = useRouter();
  const [episodeId, setEpisodeId] = useState(episodes[0]?.id ?? "");
  const [mode, setMode] = useState<"host" | "follow" | "independent">("host");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/watch-party", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", episodeId, mode }) });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error);
    router.push(`/watch/${json.episodeId}?party=${json.code}`);
  };
  const join = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/watch-party", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "join", code }) });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error);
    router.push(`/watch/${json.episodeId}?party=${json.code}`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="font-bold">Create a room</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {episodes.map((e) => (
            <button key={e.id} type="button" onClick={() => setEpisodeId(e.id)} className={cx("overflow-hidden rounded-xl border text-left transition", episodeId === e.id ? "border-violet-400 ring-2 ring-violet-400/40" : "border-white/10 hover:border-white/30")}>
              <div className="aspect-video bg-zinc-800">{e.thumbnail && <img src={e.thumbnail} alt="" className="h-full w-full object-cover" />}</div>
              <div className="p-2 text-xs">
                <div className="text-zinc-400">E{e.episodeNumber}</div>
                <div className="truncate font-semibold">{e.title}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-1">
          {(
            [
              ["host", "Host controlled"],
              ["follow", "Follow host"],
              ["independent", "Independent"],
            ] as const
          ).map(([m, l]) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={cx("rounded-full px-3 py-1.5 text-xs", mode === m ? "bg-violet-500/40 text-white" : "bg-white/5 text-zinc-300 hover:bg-white/10")}>
              {l}
            </button>
          ))}
        </div>
        <Button className="mt-4" onClick={create} disabled={busy || !episodeId}>
          Create room & start
        </Button>
      </Card>
      <Card>
        <h2 className="font-bold">Join with a code</h2>
        <div className="mt-3 flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} placeholder="7KQ2MZ" className="w-40 rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono uppercase tracking-widest text-white focus:border-violet-400 focus:outline-none" aria-label="Room code" />
          <Button onClick={join} disabled={busy || code.length < 4} variant="outline">
            Join
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
      </Card>
    </div>
  );
}
