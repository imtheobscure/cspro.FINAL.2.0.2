import { ART } from "./art";

export type SceneTheme = "race" | "rocket" | "boxing" | "heist" | "practice" | "neon" | "avalanche" | "kraken";
export type MusicTheme = "race" | "rocket" | "boxing" | "heist" | "kids" | "arena" | "debate" | "hub" | "neon" | "snow" | "storm" | "none";

export interface Mode {
  id: string;
  name: string;
  tag: string;
  desc: string;
  blurb: string;
  theme: SceneTheme;
  music: MusicTheme;
  img: string;
  ghostWpm: number;
  accent: string;
  hud: [string, string, string];
}

export const MODES: Mode[] = [
  { id: "race", name: "Turbo Circuit", tag: "Street circuit · ghost car", desc: "Your voice is the throttle. Out-read the record ghost through a photoreal sunset circuit.", blurb: "Keep the needle in the red without clipping words.", theme: "race", music: "race", img: ART.race, ghostWpm: 132, accent: "#f97316", hud: ["SPEED", "LAP", "GHOST"] },
  { id: "rocket", name: "Orbit Launch", tag: "Vertical mile · thrust", desc: "Fluency is thrust. Ride the column of fire until you punch through the atmosphere.", blurb: "Smooth speech keeps the engines lit.", theme: "rocket", music: "rocket", img: ART.rocket, ghostWpm: 126, accent: "#38bdf8", hud: ["ALTITUDE", "THRUST", "RECORD"] },
  { id: "boxing", name: "Title Fight", tag: "Championship rounds", desc: "Every clean word is a punch. Accuracy is stamina. Drop the champion before the bell.", blurb: "Misses cost stamina. Streaks are combinations.", theme: "boxing", music: "boxing", img: ART.boxing, ghostWpm: 120, accent: "#ef4444", hud: ["STAMINA", "CHAMP HP", "COMBO"] },
  { id: "heist", name: "Vault Heist", tag: "Silent professional", desc: "Crack the vault by reading cleanly before the rival crew drills through.", blurb: "Precision over speed — one miss trips a laser.", theme: "heist", music: "heist", img: ART.heist, ghostWpm: 118, accent: "#fbbf24", hud: ["LOCKS", "RIVAL", "SIGNAL"] },
  { id: "practice", name: "Practice Studio", tag: "PTE booth · no timer pressure", desc: "Unlimited takes in a West End booth. Model karaoke, IPA, native audio, full diagnostics.", blurb: "Train like the exam. No rounds, no crowd, just craft.", theme: "practice", music: "hub", img: ART.practice, ghostWpm: 100, accent: "#a78bfa", hud: ["PROGRESS", "ACCURACY", "PACE"] },
  { id: "neon", name: "Neon Drift", tag: "Midnight megacity", desc: "Rain, neon, a screaming inline-four. Chain perfect words to hold a four-wheel drift.", blurb: "Combos tilt the bike. Break the chain and you high-side.", theme: "neon", music: "neon", img: ART.neon, ghostWpm: 138, accent: "#f472b6", hud: ["DRIFT", "NITRO", "RIVAL"] },
  { id: "avalanche", name: "Whiteout", tag: "Ski the slide", desc: "A mountain is coming down behind you. Read faster than the snow, land every phoneme.", blurb: "The ghost is the avalanche. Do not let it catch you.", theme: "avalanche", music: "snow", img: ART.avalanche, ghostWpm: 128, accent: "#7dd3fc", hud: ["DROP", "AVALANCHE", "EDGE"] },
  { id: "kraken", name: "Maelstrom", tag: "Cannon vs the deep", desc: "A ship in a black squall. Each phrase is a cannon volley. Sink the beast before the deck floods.", blurb: "Hits drive the tentacles back. Misses take on water.", theme: "kraken", music: "storm", img: ART.kraken, ghostWpm: 122, accent: "#34d399", hud: ["HULL", "KRAKEN", "VOLLEY"] },
];

export const modeById = (id: string) => MODES.find((m) => m.id === id) || MODES[0];
