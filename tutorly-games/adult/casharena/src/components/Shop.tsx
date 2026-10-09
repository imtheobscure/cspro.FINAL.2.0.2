"use client";
import { useState } from "react";
import { ATTACKS, SHOP_UPGRADES, type EconState, fmtCash, buyUpgrade, POWERUPS, rollPowerUp, type PowerDef } from "@/lib/engine";
import type { AttackType } from "@/lib/types";
import { RollingCash } from "./Cash";
import { sfx } from "@/lib/audio";

const MYSTERY_COST = 250;

export function Shop({
  econ,
  onChange,
  onAttack,
  onMystery,
  onClose,
  multiplayer,
}: {
  econ: EconState;
  onChange: (s: EconState) => void;
  onAttack: (type: AttackType, cost: number) => void;
  onMystery: (def: PowerDef) => void;
  onClose: () => void;
  multiplayer: boolean;
}) {
  const [tab, setTab] = useState<"upgrades" | "attacks" | "mystery">("upgrades");
  const [flash, setFlash] = useState<string | null>(null);

  const buy = (key: (typeof SHOP_UPGRADES)[number]["key"]) => {
    const n = buyUpgrade(econ, key);
    if (n) { sfx.buy(); onChange(n); setFlash(key); setTimeout(() => setFlash(null), 600); }
    else sfx.wrong();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4" onClick={onClose}>
      <div className="glass w-full max-w-5xl rounded-3xl p-4 sm:p-6 max-h-[92dvh] overflow-y-auto anim-fade" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/cash-stack.png" alt="" className="h-14 w-14 rounded-xl object-cover" />
            <div>
              <div className="text-3xl font-black gold-text">THE SHOP</div>
              <div className="text-sm text-white/60">Spend cash to earn cash faster.</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-widest text-white/50">Your wallet</div>
            <RollingCash value={econ.cash} className="text-4xl" />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          {(["upgrades", "attacks", "mystery"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); sfx.click(); }} className={`rounded-xl px-4 py-2 font-black capitalize ${tab === t ? "bg-violet-600 text-white" : "bg-white/10 text-white/70"}`}>
              {t === "upgrades" ? "⚙️ Upgrades" : t === "attacks" ? "⚔️ Attacks" : "🎁 Mystery Box"}
            </button>
          ))}
        </div>

        {tab === "upgrades" && (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {SHOP_UPGRADES.map((d) => {
              const lvl = econ[d.key];
              const maxed = lvl >= d.max;
              const cost = maxed ? 0 : d.costs[lvl + 1];
              const can = !maxed && econ.cash >= cost;
              return (
                <div key={d.key} className={`rounded-2xl border border-white/10 bg-white/5 p-4 ${flash === d.key ? "anim-pop ring-4 ring-emerald-400" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className="text-5xl">{d.icon}</div>
                    <div>
                      <div className="text-xl font-black">{d.name}</div>
                      <div className="text-xs text-white/60">Level {lvl} / {d.max}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-1">
                    {Array.from({ length: d.max }).map((_, i) => (
                      <div key={i} className={`h-2 flex-1 rounded-full ${i < lvl ? "bg-gradient-to-r from-emerald-400 to-lime-300" : "bg-white/10"}`} />
                    ))}
                  </div>
                  <div className="mt-3 text-sm text-white/70">{d.desc}</div>
                  <div className="mt-2 text-base font-bold text-emerald-300">Now: {d.levelLabel(lvl)}</div>
                  {!maxed && <div className="text-sm text-white/60">Next: {d.levelLabel(lvl + 1)}</div>}
                  <button disabled={!can} onClick={() => buy(d.key)} className={`btn mt-3 w-full ${can ? "btn-cash" : "btn-ghost"}`}>
                    {maxed ? "MAXED ✓" : `Upgrade · ${fmtCash(cost)}`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === "attacks" && (
          <div className="mt-4">
            {!multiplayer && <div className="mb-3 rounded-xl bg-amber-500/20 p-3 text-amber-200 font-bold">Attacks need rivals — join a live game to use them.</div>}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ATTACKS.map((a) => {
                const can = multiplayer && econ.cash >= a.cost;
                return (
                  <div key={a.type} className="rounded-2xl border border-rose-400/20 bg-gradient-to-br from-rose-900/30 to-transparent p-4">
                    <div className="flex items-center gap-3">
                      <div className="text-5xl">{a.icon}</div>
                      <div>
                        <div className="text-xl font-black">{a.name}</div>
                        <div className="text-xs uppercase tracking-widest text-rose-300">Target: {a.target}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-white/70">{a.desc}</div>
                    <button disabled={!can} onClick={() => { sfx.attack(); onAttack(a.type, a.cost); }} className={`btn mt-3 w-full ${can ? "btn-danger" : "btn-ghost"}`}>
                      Launch · {fmtCash(a.cost)}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "mystery" && (
          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1.4fr]">
            <div className="rounded-2xl border border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-900/40 to-indigo-900/40 p-6 text-center anim-glow">
              <div className="text-8xl">🎁</div>
              <div className="mt-2 text-2xl font-black">Mystery Box</div>
              <div className="mt-1 text-sm text-white/70">A random power-up — could be a Legendary Jackpot!</div>
              <button
                disabled={econ.cash < MYSTERY_COST}
                onClick={() => {
                  const def = rollPowerUp();
                  onChange({ ...econ, cash: econ.cash - MYSTERY_COST, inventory: [...econ.inventory, def.key] });
                  if (def.rarity === "legendary") sfx.legendary(); else sfx.powerup();
                  onMystery(def);
                }}
                className={`btn mt-4 w-full ${econ.cash >= MYSTERY_COST ? "btn-gold" : "btn-ghost"}`}
              >
                Open · {fmtCash(MYSTERY_COST)}
              </button>
            </div>
            <div>
              <div className="mb-2 text-sm uppercase tracking-widest text-white/50">Possible drops</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {POWERUPS.map((p) => (
                  <div key={p.key} className={`rounded-xl bg-gradient-to-br ${p.color} p-2 text-sm font-bold`}>
                    <span className="text-xl">{p.icon}</span> {p.name}
                    <div className="text-[10px] uppercase opacity-70">{p.rarity}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <button onClick={onClose} className="btn btn-primary mt-5 w-full">Back to the game ➜</button>
      </div>
    </div>
  );
}
