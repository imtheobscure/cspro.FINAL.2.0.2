export interface LeaderboardEntry {
  id: string | number;
  rank: number;
  playerName: string;
  score: number;
  /** Emoji, or a data URL when the row is a real person with a photo. */
  avatar: string;
  badge: string;
  country: string;
  countryFlag: string;
  device: string;
  durationSeconds: number;
  isUser: boolean;
  timeAgo: string;
  verified: boolean;
  /**
   * A real person — the tutor's player, or a learner in a score room — rather than
   * one of the practice rivals from the pool below. Real rows are the ones a tutor
   * can click to hand the session over, and the only ones the board should keep
   * when practice rivals are switched off.
   */
  isReal?: boolean;
  /** The console player id, when this row belongs to one (`lib/players.ts`). */
  playerId?: string;
  /** "host" / "guest" for room participants, omitted for locally saved players. */
  roomRole?: "host" | "guest";
  plays?: number;
  /**
   * Best score per time window, so the All-Time / This Week / Today tabs mean
   * something. Only real rows carry this — the practice rivals are an all-time
   * wall with no timestamps, which is why the tabs show real players only.
   */
  best?: { all: number; week: number; today: number };
}

export const FAKE_PLAYERS_POOL = [
  { name: "Valkyrie_X", avatar: "⚡", badge: "Apex Predator", country: "KR", flag: "🇰🇷", device: "Tutorly Ultra Rig" },
  { name: "NeonSpecter", avatar: "🌌", badge: "Grandmaster", country: "US", flag: "🇺🇸", device: "Unity WebGL Pro" },
  { name: "CyberViper99", avatar: "🐍", badge: "Challenger", country: "JP", flag: "🇯🇵", device: "Arcade Cabinet" },
  { name: "ShadowPulse", avatar: "🕶️", badge: "Speedrun God", country: "DE", flag: "🇩🇪", device: "Tutorly Handheld" },
  { name: "PixelKnight", avatar: "⚔️", badge: "Master Tier", country: "UK", flag: "🇬🇧", device: "Unity WebGL Pro" },
  { name: "GamerGlitch_01", avatar: "👾", badge: "Diamond I", country: "CA", flag: "🇨🇦", device: "Tutorly Ultra Rig" },
  { name: "RetroNova", avatar: "🚀", badge: "Elite Breaker", country: "BR", flag: "🇧🇷", device: "Arcade Cabinet" },
  { name: "ZeroCool_9X", avatar: "❄️", badge: "Diamond II", country: "FR", flag: "🇫🇷", device: "Tutorly Handheld" },
  { name: "AeroBlaze", avatar: "🔥", badge: "Platinum I", country: "SE", flag: "🇸🇪", device: "Unity WebGL Pro" },
  { name: "KitsuneStriker", avatar: "🦊", badge: "Platinum II", country: "JP", flag: "🇯🇵", device: "Tutorly Ultra Rig" },
  { name: "HelixDestroyer", avatar: "💥", badge: "Gold I", country: "AU", flag: "🇦🇺", device: "Arcade Cabinet" },
  { name: "EchoPhantom", avatar: "👻", badge: "Gold II", country: "NL", flag: "🇳🇱", device: "Tutorly Handheld" },
  { name: "SynapseOverload", avatar: "🧠", badge: "Gold III", country: "CH", flag: "🇨🇭", device: "Unity WebGL Pro" },
  { name: "CosmicRanger", avatar: "🛸", badge: "Silver I", country: "SG", flag: "🇸🇬", device: "Tutorly Ultra Rig" },
  { name: "TurboWhiz", avatar: "🏎️", badge: "Silver II", country: "IT", flag: "🇮🇹", device: "Arcade Cabinet" },
  { name: "ApexRider", avatar: "🏍️", badge: "Silver III", country: "ES", flag: "🇪🇸", device: "Tutorly Handheld" },
  { name: "OmegaDrift", avatar: "💨", badge: "Bronze I", country: "MX", flag: "🇲🇽", device: "Unity WebGL Pro" },
  { name: "ByteCrusher", avatar: "🦾", badge: "Bronze II", country: "PL", flag: "🇵🇱", device: "Tutorly Ultra Rig" },
  { name: "VortexNinja", avatar: "🥷", badge: "Rookie", country: "NO", flag: "🇳🇴", device: "Arcade Cabinet" },
  { name: "ZenithPulse", avatar: "🔮", badge: "Rookie", country: "FI", flag: "🇫🇮", device: "Tutorly Handheld" },
];

export function generateFakeLeaderboardForGame(gameId: string): LeaderboardEntry[] {
  // Deterministic per-game calibration: hash the ID into a score band so every
  // Playable gets a stable, believable rival ladder.
  let h = 2166136261;
  for (let i = 0; i < gameId.length; i++) {
    h ^= gameId.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const band = h % 5; // 0..4
  const bases = [1200, 4800, 18500, 46000, 92000];
  const variances = [45, 180, 700, 1900, 3600];
  const baseScore = bases[band] + (h % 997);
  const scoreVariance = variances[band];

  const timesAgo = [
    "2m ago", "14m ago", "35m ago", "1h ago", "2h ago",
    "3h ago", "5h ago", "8h ago", "12h ago", "1d ago",
    "1d ago", "2d ago", "2d ago", "3d ago", "4d ago",
    "5d ago", "6d ago", "1w ago", "1w ago", "2w ago"
  ];

  return FAKE_PLAYERS_POOL.map((player, index) => {
    // Generate smoothly descending scores with minor variation
    const score = Math.max(
      1000,
      Math.floor(baseScore - index * scoreVariance + (Math.sin(index * 2.3) * (scoreVariance * 0.25)))
    );

    return {
      id: `fake-${gameId}-${index}`,
      rank: index + 1,
      playerName: player.name,
      score,
      avatar: player.avatar,
      badge: player.badge,
      country: player.country,
      countryFlag: player.flag,
      device: player.device,
      durationSeconds: 120 + (20 - index) * 15,
      isUser: false,
      timeAgo: timesAgo[index % timesAgo.length],
      verified: true,
    };
  });
}
