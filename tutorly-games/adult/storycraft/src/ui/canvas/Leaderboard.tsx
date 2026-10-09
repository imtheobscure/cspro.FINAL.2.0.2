import { useEffect, useState } from "react";
import type { Entity, GameSettings } from "../../engine/types";
import { cn } from "../../utils/cn";
import { useGameState } from "../../engine/store";
import { setSelectedPlayer, updateEntity } from "../../engine/actions";
import { EVOLUTION_MAP, BASE_EMOJI_TO_CATEGORY } from "../../engine/defaults";
import { ConversationBox } from "./ConversationBox";
import { DecisionModal } from "./DecisionFlow";

/** Resolve the emoji to show: catalog ladder (level 0..5) determines the emoji. */
function displayEmoji(e: Entity): { emoji: string; title?: string; level?: number } {
  const cat = BASE_EMOJI_TO_CATEGORY[e.emoji];
  if (cat) {
    const level = Math.max(0, Math.min(5, e.evolutionLevel ?? 0));
    const sys = EVOLUTION_MAP[cat.id];
    const lvl = sys?.levels[level];
    return { emoji: cat.ladder[Math.max(0, level - 1)]?.emoji ?? cat.finalEmoji, title: lvl?.title, level };
  }
  return { emoji: e.emoji };
}

const rarityGlow = {
  common: "0 0 12px rgba(148,163,184,.45)",
  rare: "0 0 18px rgba(56,189,248,.75)",
  epic: "0 0 22px rgba(168,85,247,.85)",
  legendary: "0 0 28px rgba(245,158,11,.95)",
};

function HealthBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const tone = pct > 50 ? "#22c55e" : pct > 25 ? "#eab308" : "#ef4444";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/40" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color === "auto" ? tone : color }} />
    </div>
  );
}

function ReviveTimer({ at }: { at: number }) {
  const [left, setLeft] = useState(Math.max(0, Math.ceil((at - Date.now()) / 1000)));
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, Math.ceil((at - Date.now()) / 1000))), 250);
    return () => clearInterval(id);
  }, [at]);
  if (left <= 0) return <span className="text-emerald-400">reviving…</span>;
  return <span className="tabular-nums text-amber-400">⏳ {left}s</span>;
}

function EntityRow({ e, settings, names, isSpeaking, selected, onSelect, onOpenModal }: { e: Entity; settings: GameSettings; names: Record<string, string>; isSpeaking?: boolean; selected?: boolean; onSelect?: () => void; onOpenModal?: () => void }) {
  const adult = settings.mode === "adult";
  const hc = settings.highContrast;
  const disp = displayEmoji(e);
  const evolving = BASE_EMOJI_TO_CATEGORY[e.emoji] !== undefined;
  const isPlayer = e.kind === "player";
  return (
    <div
      onClick={isPlayer ? onSelect : undefined}
      title={isPlayer ? "Click to select — this player acts when you click choices in the game" : undefined}
      className={cn(
        "relative rounded-xl p-3 ring-1 transition-all",
        hc ? "bg-black ring-white/40" : "bg-slate-900/50 ring-white/10",
        isPlayer && "cursor-pointer hover:ring-white/30",
        e.dead && "opacity-50 grayscale",
        isSpeaking && "animate-pulse bg-violet-950/40 ring-violet-400/60 shadow-[0_0_25px_rgba(167,139,250,.3)]",
        selected && "bg-emerald-950/40 ring-2 ring-emerald-400/70 shadow-[0_0_22px_rgba(52,211,153,.3)]",
      )}
    >
      {isSpeaking && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[3px]">
          <div className="h-8 w-[3px] rounded-full bg-violet-400 animate-pulse" />
        </div>
      )}
      {selected && (
        <span className="absolute -top-2 left-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-white shadow">▶ ACTING</span>
      )}
      <div className="flex items-center gap-3">
        <span className={cn("relative rounded-xl bg-white/5 px-2 py-1 text-5xl leading-none [text-shadow:0_10px_20px_rgba(0,0,0,.65)]", evolving && "shadow-[0_0_36px_rgba(250,204,21,.55)]")} aria-hidden>
          {e.dead ? "💀" : disp.emoji}
          {e.kind === "npc" && (
            <span className="absolute -right-1 -top-1 text-sm" title="NPC">🤖</span>
          )}
          {disp.level !== undefined && !e.dead && (
            <span className="absolute -bottom-1 -right-1 rounded-full bg-amber-500 px-1 text-[9px] font-black text-black ring-1 ring-black/30" title={disp.title}>L{disp.level}</span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-lg font-black" style={{ color: hc ? "#fff" : e.color }}>
              {e.name}{isSpeaking && <span className="ml-2 text-violet-300">🔊</span>}
            </span>
            <span className="flex items-center gap-1 text-sm text-slate-300">
              {Array.from({ length: Math.max(0, e.lives) }).map((_, i) => (
                <span key={i}>❤</span>
              ))}
              {e.deaths > 0 && <span title="deaths">☠️{e.deaths}</span>}
            </span>
          </div>
          {e.role && <span className="text-xs font-semibold uppercase tracking-wide text-violet-300">{e.role}</span>}
        </div>
        {settings.scoringEnabled && (
          <span className="rounded-md bg-amber-500/15 px-2 py-1 text-sm font-black text-amber-300">★ {e.score}</span>
        )}
      </div>

      <div className="mt-1.5 space-y-1">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
          <span className="w-9">HP</span>
          <HealthBar value={e.health} max={e.maxHealth} color="auto" />
          <span className="w-9 text-right tabular-nums">{e.health}</span>
        </div>
        {adult && e.kind === "player" && (
          <>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
              <span className="w-9">🍖</span>
              <HealthBar value={100 - e.hunger} max={100} color="#f97316" />
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
              <span className="w-9">💧</span>
              <HealthBar value={100 - e.thirst} max={100} color="#38bdf8" />
            </div>
          </>
        )}
      </div>

      {(e.inventory.length > 0 || e.statuses.length > 0 || e.powerUps.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {e.inventory.map((it) => {
            const consumable = /potion|healing|medkit|medicine|bandage|elixir|food|apple|bread|meal|steak|meat|berry|fruit|ration|water|juice|drink|canteen|bottle|soda|tea|coffee/i.test(it.name);
            return (
              <div 
                key={it.id} 
                onClick={(ev) => {
                  ev.stopPropagation();
                  if (it.qty <= 0 || !consumable) return;
                  // Consume the item: reduce qty, apply stat effect
                  // updateEntity is imported at top of file
                  const newInv = e.inventory.map((i) =>
                    i.id === it.id ? { ...i, qty: Math.max(0, i.qty - 1) } : i,
                  );
                  const isHeal = /potion|healing|medkit|medicine|bandage|elixir/i.test(it.name);
                  const isFood = /food|apple|bread|meal|steak|meat|berry|fruit|ration/i.test(it.name);
                  const isDrink = /water|juice|drink|canteen|bottle|soda|tea|coffee/i.test(it.name);
                  const patch: Partial<Entity> = { inventory: newInv };
                  if (isHeal) patch.health = Math.min(e.maxHealth, e.health + 25);
                  if (isFood) patch.hunger = Math.max(0, e.hunger - 25);
                  if (isDrink) patch.thirst = Math.max(0, e.thirst - 25);
                  updateEntity(e.id, patch);
                }}
                className={cn(
                  "group relative rounded-xl bg-white/5 px-2 py-1 text-3xl ring-1 ring-white/10 [text-shadow:0_8px_18px_rgba(0,0,0,.55)] transition-opacity",
                  it.qty === 0 && "opacity-30 grayscale",
                  consumable && it.qty > 0 && "cursor-pointer hover:ring-emerald-400/60 hover:bg-emerald-950/30",
                )} 
                style={{ boxShadow: rarityGlow[it.rarity ?? "common"] }}
                title={consumable && it.qty > 0 ? `Click to use ${it.name}` : it.name}
              >
                {it.emoji}{it.qty > 1 ? <sub className="text-sm">{it.qty}</sub> : null}
                {/* Tooltip */}
                <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-36 -translate-x-1/2 scale-0 rounded-lg bg-black/90 p-2 text-center text-[10px] leading-tight text-white opacity-0 ring-1 ring-white/20 transition-all group-hover:scale-100 group-hover:opacity-100">
                  <b className="block text-amber-400">{it.name}</b>
                  <span className="text-[8px] uppercase tracking-wider text-slate-400">{it.rarity}</span>
                  {it.qty === 0 && <span className="block text-rose-400">Used up</span>}
                  {consumable && it.qty > 0 && <span className="block text-emerald-400 mt-0.5">Click to consume</span>}
                </div>
              </div>
            );
          })}
          {e.powerUps.map((p) => (
            <span key={p} className="rounded bg-violet-500/20 px-1 text-[10px] text-violet-200" title={p}>⚡{p}</span>
          ))}
          {e.statuses.map((st) => (
            <span key={st.id} className="rounded bg-rose-500/15 px-1 text-[11px]" title={`${st.label} (${st.turns < 0 ? "∞" : st.turns})`}>
              {st.emoji}
            </span>
          ))}
        </div>
      )}

      {e.kind === "npc" && e.relationships.length > 0 && (
        <div className="mt-1.5 space-y-0.5">
          {e.relationships.map((r) => (
            <div key={r.targetId} className="flex items-center gap-1 text-[10px]">
              <span className="w-14 truncate text-slate-400">→ {names[r.targetId] ?? "?"}</span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-black/40">
                <div
                  className="h-full"
                  style={{
                    marginLeft: `${50 + Math.min(0, r.value) / 2}%`,
                    width: `${Math.abs(r.value) / 2}%`,
                    background: r.value >= 0 ? "#22c55e" : "#ef4444",
                  }}
                />
              </div>
              <span className={cn("w-9 text-right", r.value >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {r.value >= 0 ? "💚" : "💢"}{r.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {e.dead && e.reviveAt && (
        <div className="mt-1 text-center text-[11px]">
          <ReviveTimer at={e.reviveAt} />
        </div>
      )}

      {/* "What do you do?" button for living players. Always visible. */}
      {isPlayer && !e.dead && (
        <div className="mt-2 flex items-center justify-between gap-1.5">
          <span className="text-[10px] text-slate-500">Step into this character</span>
          <button
            type="button"
            onClick={(ev) => {
              ev.stopPropagation();
              onOpenModal?.();
            }}
            className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1 text-[11px] font-black text-white shadow hover:brightness-110"
          >
            🧠 What do you do?
          </button>
        </div>
      )}
    </div>
  );
}

export function Leaderboard({ entities, settings, prompts }: { entities: Entity[]; settings: GameSettings; prompts: { entityId: string; hints: string[] }[] }) {
  const state = useGameState();
  const [modalPlayerId, setModalPlayerId] = useState<string | undefined>(undefined);
  const names = Object.fromEntries(entities.map((e) => [e.id, e.name]));
  const sorted = [...entities].sort((a, b) => {
    if (settings.scoringEnabled) return b.score - a.score;
    return Number(a.dead) - Number(b.dead);
  });

  return (
    <aside
      className={cn(
        "flex w-96 shrink-0 flex-col p-3",
        settings.highContrast ? "bg-black" : "bg-slate-950/70 backdrop-blur",
      )}
      aria-label="Live leaderboard"
    >
      {/* Top half: leaderboard, scrollable */}
      <div className="mb-2 flex flex-1 flex-col overflow-hidden">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-lg font-black uppercase tracking-widest text-slate-100">🏆 Leaderboard</h2>
          <span className="text-sm text-slate-400">{entities.length} entities</span>
        </div>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {sorted.map((e) => (
            <EntityRow
              key={e.id}
              e={e}
              settings={settings}
              names={names}
              isSpeaking={state.speakingEntityId === e.id}
              selected={state.selectedPlayerId === e.id}
              onSelect={() => setSelectedPlayer(state.selectedPlayerId === e.id ? undefined : e.id)}
              onOpenModal={() => {
                setSelectedPlayer(e.id);
                setModalPlayerId(e.id);
              }}
            />
          ))}
        </div>
      </div>
      {/* Bottom half: persistent conversation panel */}
      <div className="flex h-[42%] min-h-[200px] flex-col">
        <ConversationBox />
      </div>

      {/* DecisionModal: opens ONLY when the "What do you do?" button is clicked. */}
      {modalPlayerId && (() => {
        const player = state.entities.find((e) => e.id === modalPlayerId);
        if (!player || player.kind !== "player" || player.dead) return null;
        const hint = prompts.find((p) => p.entityId === player.id)?.hints ?? ["Act decisively", "Wait and observe", "Try a creative approach"];
        return (
          <DecisionModal
            player={player}
            hints={hint}
            open
            onClose={() => setModalPlayerId(undefined)}
          />
        );
      })()}
    </aside>
  );
}
