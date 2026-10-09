import { useState } from "react";

export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  streak: number;
  wrongStreak: number;
}

interface Props {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
}

export const FEMALE_AVATARS = ["🧛‍♀️", "🧟‍♀️", "🧕", "🦹‍♀️", "🧚‍♀️", "🧙‍♀️", "🧜‍♀️", "🧝‍♀️", "🧞‍♀️", "🧖‍♀️", "👸", "🦸‍♀️"];
export const MALE_AVATARS   = ["🧛‍♂️", "🧟‍♂️", "🥷", "🦹‍♂️", "🧚‍♂️", "🧙‍♂️", "🧜‍♂️", "🧝‍♂️", "🧞‍♂️", "🧖‍♂️", "🤴", "🦸‍♂️"];
export const ALL_AVATARS = [...FEMALE_AVATARS, ...MALE_AVATARS];

interface TierDef {
  name: string;
  min: number;
  emoji: string;
  ringClass: string;
  glowColor: string;
  textClass: string;
}

const DEFAULT_TIERS: TierDef[] = [
  { name: "Legendary", min: 150, emoji: "🥇", ringClass: "border-amber-400", glowColor: "rgba(251,191,36,0.55)", textClass: "text-amber-300" },
  { name: "Epic",      min: 50,  emoji: "🔮", ringClass: "border-fuchsia-400", glowColor: "rgba(217,70,239,0.55)", textClass: "text-fuchsia-300" },
  { name: "Common",    min: 0,   emoji: "⚪", ringClass: "border-slate-500", glowColor: "rgba(148,163,184,0.4)", textClass: "text-slate-200" },
];

export function getStreakFace(streak: number, wrong: number): string {
  if (streak >= 5) return "🤩";
  if (streak === 4) return "😎";
  if (streak === 3) return "😁";
  if (streak === 2) return "😀";
  if (streak === 1) return "🙂";
  if (wrong >= 5) return "🤒";
  if (wrong === 4) return "😪";
  if (wrong === 3) return "😥";
  if (wrong === 2) return "🤨";
  if (wrong === 1) return "😑";
  return "😐";
}

export function getTier(score: number, tiers: TierDef[]): TierDef {
  return tiers.find(t => score >= t.min) ?? tiers[tiers.length - 1];
}

export function SuitePlayersTab({ players, setPlayers }: Props) {
  const [nameInput, setNameInput] = useState("");
  const [gender, setGender] = useState<"f" | "m">("f");
  const [selectedAvatar, setSelectedAvatar] = useState(FEMALE_AVATARS[0]);
  const [tiers, setTiers] = useState<TierDef[]>(DEFAULT_TIERS);

  const avatarPool = gender === "f" ? FEMALE_AVATARS : MALE_AVATARS;

  const addPlayer = () => {
    const cleaned = nameInput.trim();
    if (!cleaned) return;
    setPlayers(prev => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        name: cleaned,
        avatar: selectedAvatar,
        score: 0,
        streak: 0,
        wrongStreak: 0,
      },
    ]);
    setNameInput("");
  };

  const removePlayer = (id: string) => setPlayers(prev => prev.filter(p => p.id !== id));

  const updateAvatar = (id: string, avatar: string) =>
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, avatar } : p));

  const updateName = (id: string, name: string) =>
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, name } : p));

  const updateTierMin = (idx: number, min: number) =>
    setTiers(prev => prev.map((t, i) => i === idx ? { ...t, min } : t));

  return (
    <div className="space-y-6 animate-[fadeIn_0.25s_ease-out]">
      {/* ADD PLAYER PANEL */}
      <div className="premium-panel p-6 grid lg:grid-cols-[1fr_360px] gap-6">
        <div>
          <h3 className="text-2xl font-black mb-1">➕ Add Player</h3>
          <p className="text-sm text-white/60 mb-4">Name your hero, choose a gender bank, then pick a glossy character avatar.</p>

          <div className="flex gap-2 flex-wrap mb-4">
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addPlayer()}
              placeholder="Player or Team Name…"
              className="flex-1 min-w-[200px] px-4 py-3 rounded-xl bg-black/45 border border-white/20 text-white focus:ring-2 focus:ring-fuchsia-400 outline-none"
            />
            <button onClick={addPlayer} className="px-6 py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 font-black hover:scale-105 transition shadow-xl">Add Hero</button>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => { setGender("f"); setSelectedAvatar(FEMALE_AVATARS[0]); }} className={`px-3 py-1.5 rounded-xl text-sm font-bold ${gender === "f" ? "bg-pink-500" : "bg-white/10 border border-white/20"}`}>♀ Female Heroes</button>
            <button onClick={() => { setGender("m"); setSelectedAvatar(MALE_AVATARS[0]); }} className={`px-3 py-1.5 rounded-xl text-sm font-bold ${gender === "m" ? "bg-blue-500" : "bg-white/10 border border-white/20"}`}>♂ Male Heroes</button>
          </div>

          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
            {avatarPool.map(av => (
              <button
                key={av}
                onClick={() => setSelectedAvatar(av)}
                className={`text-3xl p-2 rounded-xl hover:scale-125 transition glossy-emoji ${selectedAvatar === av ? "bg-white/25 ring-2 ring-fuchsia-400 scale-125" : ""}`}
              >{av}</button>
            ))}
          </div>
        </div>

        {/* TIERS PANEL */}
        <div className="bg-black/35 rounded-2xl p-4 border border-white/15 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-black text-lg">🏆 Tiers</h4>
            <button onClick={() => setTiers(DEFAULT_TIERS)} className="text-xs px-3 py-1 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20">Reset</button>
          </div>
          <p className="text-xs text-white/55 mb-3">Edit minimum score thresholds. Higher tiers shimmer with more glossy intensity.</p>
          <div className="space-y-2">
            {tiers.map((t, i) => (
              <div key={t.name} className={`flex items-center gap-2 p-3 rounded-xl border ${t.ringClass} ${t.textClass}`} style={{ background: `linear-gradient(90deg, ${t.glowColor}, transparent)` }}>
                <span className="text-2xl">{t.emoji}</span>
                <input
                  value={t.name}
                  onChange={e => setTiers(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                  className="flex-1 bg-transparent font-black text-sm outline-none border-b border-white/15 focus:border-white/40"
                />
                <label className="text-xs uppercase tracking-wider">Min</label>
                <input
                  type="number"
                  value={t.min}
                  onChange={e => updateTierMin(i, Number(e.target.value))}
                  className="w-16 px-2 py-1 rounded-lg bg-black/40 border border-white/15 text-white font-bold text-sm focus:ring-1 focus:ring-fuchsia-400 outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PLAYERS GRID */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {players.map(p => {
          const tier = getTier(p.score, tiers);
          const face = getStreakFace(p.streak, p.wrongStreak);
          const fire = p.streak >= 3;
          return (
            <div
              key={p.id}
              className={`relative p-5 rounded-3xl bg-gradient-to-br from-black/60 to-black/30 border-2 ${tier.ringClass} text-center flex flex-col items-center min-h-[280px] transition-all duration-300`}
              style={{ boxShadow: `0 14px 40px rgba(0,0,0,0.5), 0 0 35px ${tier.glowColor}` }}
            >
              <button onClick={() => removePlayer(p.id)} className="absolute top-2 right-2 text-xs text-white/40 hover:text-rose-400 transition" title="Remove">✖</button>

              {/* Tier badge */}
              <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${tier.ringClass} ${tier.textClass}`}
                style={{ background: "rgba(0,0,0,0.85)" }}>
                {tier.emoji} {tier.name}
              </div>

              {/* Streak emoji top-right corner */}
              <div className="absolute top-3 left-3 text-3xl glossy-emoji" title={`Streak face: ${face}`}>{face}</div>

              {/* Big glossy avatar */}
              <div className="my-5 relative">
                <div className="text-[110px] glossy-emoji animate-float-slow leading-none" style={{ filter: `drop-shadow(0 18px 22px ${tier.glowColor})` }}>
                  {p.avatar}
                </div>
                {fire && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-4xl animate-bounce">🔥</div>}
              </div>

              <input
                value={p.name}
                onChange={e => updateName(p.id, e.target.value)}
                className="bg-transparent text-center font-black text-base outline-none border-b border-transparent hover:border-white/30 focus:border-fuchsia-400 w-full"
              />

              <div className={`text-4xl font-black my-2 ${tier.textClass}`} style={{ textShadow: `0 0 18px ${tier.glowColor}` }}>{p.score}</div>

              {/* Avatar quick-swap */}
              <div className="flex flex-wrap gap-1 justify-center mb-3">
                {ALL_AVATARS.slice(0, 8).map(av => (
                  <button key={av} onClick={() => updateAvatar(p.id, av)} className={`text-lg p-1 rounded hover:scale-125 transition ${p.avatar === av ? "bg-white/20 ring-1 ring-white/50" : ""}`}>{av}</button>
                ))}
              </div>

              {/* Score adjusters */}
              <div className="flex items-center gap-2">
                <button onClick={() => setPlayers(prev => prev.map(x => x.id === p.id ? { ...x, score: Math.max(0, x.score - 10), streak: 0, wrongStreak: x.wrongStreak + 1 } : x))}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/30 hover:bg-rose-500/50 text-sm font-black">−10</button>
                <button onClick={() => setPlayers(prev => prev.map(x => x.id === p.id ? { ...x, score: x.score + 10, streak: x.streak + 1, wrongStreak: 0 } : x))}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/30 hover:bg-emerald-500/50 text-sm font-black">+10</button>
              </div>

              <div className="text-[10px] text-white/40 mt-2">Streak {p.streak} · Wrong {p.wrongStreak}</div>
            </div>
          );
        })}

        {players.length === 0 && (
          <div className="col-span-full text-center py-16 text-white/50">
            <div className="text-7xl mb-2">🧙‍♀️</div>
            <p>No heroes yet. Add your first player above!</p>
          </div>
        )}
      </div>
    </div>
  );
}
