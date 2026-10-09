import { useState } from "react";
import { useStore, store, uid } from "../../state/store";
import { Btn } from "../../ui/primitives";
import { Section } from "../shared";
import { pickAvatar } from "../../lib/avatars";
import type { Learner, Rarity } from "../../state/types";

const RARITIES: Rarity[] = ["Common", "Rare", "Epic", "Legendary"];

export default function LeaderboardTab() {
  const learners = useStore((s) => s.learners);
  const npcs = useStore((s) => s.npcs);
  const participantScores = useStore((s) => s.participantScores);

  function add() {
    store.set((s) => ({
      ...s,
      learners: [
        ...s.learners,
        // A real face from the portrait library, not a letter in a circle.
        { id: uid("L_"), name: "New Learner", avatar: pickAvatar(s.learners.map((l) => l.avatar)), score: 0, badges: [], rarity: "Common" as Rarity },
      ],
    }));
  }

  function updateLearner(id: string, patch: Partial<Learner>) {
    store.set((s) => ({
      ...s,
      learners: s.learners.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  }

  function updateNpc(id: string, patch: Partial<{ score: number; badges: string[]; rarity: Rarity }>) {
    store.set((s) => {
      const current = s.participantScores[id] || { score: 0, badges: [], rarity: "Common" as Rarity };
      return {
        ...s,
        participantScores: {
          ...s.participantScores,
          [id]: { ...current, ...patch },
        },
      };
    });
  }

  function remove(id: string) {
    if (!confirm("Remove learner?")) return;
    store.set((s) => ({ ...s, learners: s.learners.filter((l) => l.id !== id) }));
  }

  function addBadge(id: string, isNpc: boolean) {
    const b = prompt("Badge emoji (e.g. 🏆 🎯 🌟)?");
    if (!b) return;
    if (isNpc) {
      const cur = participantScores[id] || { score: 0, badges: [], rarity: "Common" as Rarity };
      updateNpc(id, { badges: [...cur.badges, b] });
    } else {
      const cur = learners.find((l) => l.id === id);
      if (!cur) return;
      updateLearner(id, { badges: [...cur.badges, b] });
    }
  }

  function removeBadge(id: string, isNpc: boolean, idx: number) {
    if (isNpc) {
      const cur = participantScores[id] || { score: 0, badges: [], rarity: "Common" as Rarity };
      updateNpc(id, { badges: cur.badges.filter((_, i) => i !== idx) });
    } else {
      const cur = learners.find((l) => l.id === id);
      if (!cur) return;
      updateLearner(id, { badges: cur.badges.filter((_, i) => i !== idx) });
    }
  }

  // Build unified sorted list — always read fresh values from store slices
  const allParticipants = [
    ...learners.map((l) => ({
      id: l.id,
      name: l.name,
      avatar: l.avatar,
      score: l.score,
      badges: l.badges,
      rarity: l.rarity,
      type: "learner" as const,
    })),
    ...npcs.map((n) => ({
      id: n.id,
      name: n.name,
      avatar: n.avatar,
      score: participantScores[n.id]?.score ?? 0,
      badges: participantScores[n.id]?.badges ?? [],
      rarity: (participantScores[n.id]?.rarity ?? "Common") as Rarity,
      type: "npc" as const,
    })),
  ].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-4">
      <Section
        title={`All participants (${allParticipants.length})`}
        right={<Btn variant="primary" onClick={add}>＋ Add learner</Btn>}
      >
        {allParticipants.length === 0 ? (
          <div className="text-xs text-slate-400 text-center py-6">
            No participants yet. Add NPCs in the Participants tab.
          </div>
        ) : (
          <div className="space-y-2">
            {allParticipants.map((p, rank) => (
              <ParticipantRow
                key={p.id}
                p={p}
                rank={rank}
                onScoreChange={(delta) => {
                  const next = Math.max(0, p.score + delta);
                  p.type === "learner" ? updateLearner(p.id, { score: next }) : updateNpc(p.id, { score: next });
                }}
                onScoreSet={(v) => {
                  p.type === "learner" ? updateLearner(p.id, { score: v }) : updateNpc(p.id, { score: v });
                }}
                onRarityChange={(r) => {
                  p.type === "learner" ? updateLearner(p.id, { rarity: r }) : updateNpc(p.id, { rarity: r });
                }}
                onAddBadge={() => addBadge(p.id, p.type === "npc")}
                onRemoveBadge={(i) => removeBadge(p.id, p.type === "npc", i)}
                onRemove={p.type === "learner" ? () => remove(p.id) : undefined}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

interface RowProps {
  p: {
    id: string;
    name: string;
    avatar: string;
    score: number;
    badges: string[];
    rarity: Rarity;
    type: "learner" | "npc";
  };
  rank: number;
  onScoreChange: (delta: number) => void;
  onScoreSet: (v: number) => void;
  onRarityChange: (r: Rarity) => void;
  onAddBadge: () => void;
  onRemoveBadge: (i: number) => void;
  onRemove?: () => void;
}

function ParticipantRow({ p, rank, onScoreChange, onScoreSet, onRarityChange, onAddBadge, onRemoveBadge, onRemove }: RowProps) {
  const [localScore, setLocalScore] = useState<string>(String(p.score));

  // Keep localScore in sync when external updates arrive
  const displayScore = String(p.score);
  if (localScore !== displayScore && document.activeElement?.tagName !== "INPUT") {
    setLocalScore(displayScore);
  }

  const rankIcon = rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `#${rank + 1}`;

  const rarityColors: Record<Rarity, string> = {
    Common: "bg-slate-100 text-slate-700",
    Rare: "bg-sky-100 text-sky-700",
    Epic: "bg-fuchsia-100 text-fuchsia-700",
    Legendary: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 border border-slate-200 rounded-xl bg-white hover:border-indigo-200 transition">
      {/* Rank */}
      <div className="text-lg w-8 text-center flex-shrink-0">{rankIcon}</div>

      {/* Avatar + Name */}
      <div className="flex items-center gap-2 w-36 flex-shrink-0">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center font-bold text-indigo-700 text-sm flex-shrink-0">
          {p.avatar ? (
            <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
          ) : (
            p.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-800 truncate">{p.name}</div>
          <div className="text-[10px] text-slate-400 uppercase">{p.type}</div>
        </div>
      </div>

      {/* Score */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Btn
          size="sm"
          variant="danger"
          onClick={() => { onScoreChange(-5); setLocalScore(String(Math.max(0, p.score - 5))); }}
          className="!px-2"
        >
          −5
        </Btn>
        <Btn
          size="sm"
          variant="danger"
          onClick={() => { onScoreChange(-1); setLocalScore(String(Math.max(0, p.score - 1))); }}
          className="!px-2"
        >
          −1
        </Btn>
        <input
          type="number"
          min={0}
          value={localScore}
          onChange={(e) => setLocalScore(e.target.value)}
          onBlur={(e) => {
            const v = Math.max(0, Number(e.target.value) || 0);
            setLocalScore(String(v));
            onScoreSet(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="w-16 text-center px-2 py-1 text-sm border border-slate-200 rounded-lg bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <Btn
          size="sm"
          variant="success"
          onClick={() => { onScoreChange(1); setLocalScore(String(p.score + 1)); }}
          className="!px-2"
        >
          +1
        </Btn>
        <Btn
          size="sm"
          variant="success"
          onClick={() => { onScoreChange(5); setLocalScore(String(p.score + 5)); }}
          className="!px-2"
        >
          +5
        </Btn>
        <span className="text-xs text-slate-500 ml-1">pts</span>
      </div>

      {/* Rarity */}
      <div className="flex-shrink-0">
        <select
          value={p.rarity}
          onChange={(e) => onRarityChange(e.target.value as Rarity)}
          className={`px-2 py-1 text-xs rounded-lg border border-slate-200 font-semibold cursor-pointer ${rarityColors[p.rarity]}`}
        >
          {RARITIES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-1 flex-1 min-w-24">
        {p.badges.map((b, i) => (
          <span
            key={i}
            className="text-lg cursor-pointer hover:opacity-60"
            title="Click to remove badge"
            onClick={() => onRemoveBadge(i)}
          >
            {b}
          </span>
        ))}
        <Btn size="sm" variant="soft" onClick={onAddBadge} className="!px-2 !py-0.5 !text-xs">
          🏅 Badge
        </Btn>
      </div>

      {/* Remove */}
      {onRemove && (
        <Btn size="sm" variant="danger" onClick={onRemove} className="flex-shrink-0">
          🗑
        </Btn>
      )}
    </div>
  );
}
