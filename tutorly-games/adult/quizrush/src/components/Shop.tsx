"use client";

import {
  MULTIPLIER_VALUES,
  MULTIPLIER_COSTS,
  STREAK_BONUS_VALUES,
  STREAK_COSTS,
  INSURANCE_REDUCTION,
  INSURANCE_COSTS,
  type PlayerEconomy,
} from "@/lib/types";

function money(n: number) {
  return "$" + n.toLocaleString();
}

function Bar({ level, max }: { level: number; max: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={`h-2 flex-1 rounded-full ${i < level ? "bg-gradient-to-r from-indigo-400 to-cyan-400" : "bg-white/10"}`}
        />
      ))}
    </div>
  );
}

export default function Shop({
  cash,
  economy,
  onBuy,
  onClose,
  busy,
}: {
  cash: number;
  economy: PlayerEconomy;
  onBuy: (item: "multiplier" | "streak" | "insurance") => void;
  onClose: () => void;
  busy?: boolean;
}) {
  const items = [
    {
      key: "multiplier" as const,
      name: "Money Multiplier",
      emoji: "✖️",
      color: "from-yellow-400 to-amber-500",
      level: economy.multiplierLevel,
      max: 5,
      cur: `×${MULTIPLIER_VALUES[economy.multiplierLevel]} cash per correct`,
      next:
        economy.multiplierLevel < 5
          ? `→ ×${MULTIPLIER_VALUES[economy.multiplierLevel + 1]}`
          : "MAX",
      cost: economy.multiplierLevel < 5 ? MULTIPLIER_COSTS[economy.multiplierLevel + 1] : 0,
    },
    {
      key: "streak" as const,
      name: "Streak Bonus",
      emoji: "🔥",
      color: "from-orange-400 to-red-500",
      level: economy.streakLevel,
      max: 5,
      cur:
        economy.streakLevel > 0
          ? `+${money(STREAK_BONUS_VALUES[economy.streakLevel])} per streak step`
          : "No streak bonus yet",
      next:
        economy.streakLevel < 5
          ? `→ +${money(STREAK_BONUS_VALUES[economy.streakLevel + 1])}/step`
          : "MAX",
      cost: economy.streakLevel < 5 ? STREAK_COSTS[economy.streakLevel + 1] : 0,
    },
    {
      key: "insurance" as const,
      name: "Insurance",
      emoji: "🛡️",
      color: "from-sky-400 to-blue-600",
      level: economy.insuranceLevel,
      max: 3,
      cur: `${Math.round(INSURANCE_REDUCTION[economy.insuranceLevel] * 100)}% penalty removed`,
      next:
        economy.insuranceLevel < 3
          ? `→ ${Math.round(INSURANCE_REDUCTION[economy.insuranceLevel + 1] * 100)}%`
          : "MAX",
      cost: economy.insuranceLevel < 3 ? INSURANCE_COSTS[economy.insuranceLevel + 1] : 0,
    },
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">
      <div className="anim-pop glass-strong relative w-full max-w-3xl rounded-3xl p-5 md:p-7">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl md:text-4xl font-black">
              🛒 <span className="text-gradient">Upgrade Shop</span>
            </h2>
            <p className="text-sm md:text-base text-slate-400">Spend cash to snowball your income.</p>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-slate-400">Your Cash</div>
            <div className="money text-2xl md:text-4xl text-green-400">{money(cash)}</div>
          </div>
        </div>

        <div className="grid gap-3 md:gap-4">
          {items.map((it) => {
            const maxed = it.next === "MAX";
            const afford = !maxed && cash >= it.cost;
            return (
              <div key={it.key} className="glass flex items-center gap-4 rounded-2xl p-4">
                <div
                  className={`flex h-14 w-14 md:h-16 md:w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${it.color} text-3xl md:text-4xl shadow-lg`}
                >
                  {it.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg md:text-2xl font-bold">{it.name}</h3>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs md:text-sm font-bold">
                      Lv {it.level}/{it.max}
                    </span>
                  </div>
                  <p className="text-sm md:text-lg text-slate-300">
                    {it.cur} <span className="text-cyan-300 font-semibold">{it.next}</span>
                  </p>
                  <div className="mt-2">
                    <Bar level={it.level} max={it.max} />
                  </div>
                </div>
                <button
                  disabled={maxed || !afford || busy}
                  onClick={() => onBuy(it.key)}
                  className={`btn-glow shrink-0 rounded-2xl px-4 py-3 text-base md:text-xl font-black ${
                    maxed
                      ? "bg-white/10 text-slate-500"
                      : afford
                        ? "bg-gradient-to-r from-green-400 to-emerald-500 text-slate-900"
                        : "bg-white/10 text-slate-500"
                  }`}
                >
                  {maxed ? "MAX" : money(it.cost)}
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-2xl bg-white/10 py-3 text-lg md:text-xl font-bold hover:bg-white/20"
        >
          Back to Game ▶
        </button>
      </div>
    </div>
  );
}
