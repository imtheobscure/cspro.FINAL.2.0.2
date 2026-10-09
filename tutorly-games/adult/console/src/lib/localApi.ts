/**
 * The console's four API calls, answered in the browser.
 *
 * Console used to be a Next.js server app with a PostgreSQL database
 * (`/api/scores`, `/api/custom-games`, `/api/playables/resolve`, `/api/play/…`).
 * A game folder on a static host cannot run any of that, so the two storage
 * endpoints now live in `localStorage`: same request shapes, same response
 * shapes, same field names — every caller above this file is unchanged.
 *
 * What that means in practice, stated plainly because it is a real trade-off:
 *   · scores and custom games are per-browser, not global. Two learners on two
 *     machines keep two leaderboards (the "global" board still shows the
 *     practice roster from `data/fakeLeaderboard.ts`, clearly not real players).
 *   · nothing is lost on a static host — there was no database to talk to there
 *     anyway, and the previous server version already fell back to an empty list.
 *
 * The proxy (`/api/play/…`) is the one endpoint that genuinely needs a server —
 * browsers cannot rewrite another origin's CSP — so it is handled by `play.php`
 * (see `lib/proxy.ts`), which is shipped in the app's public folder.
 */

const SCORES_KEY = "tutorly:console:scores:v1";
const CUSTOM_KEY = "tutorly:console:custom-games:v1";

export interface ScoreRow {
  id: number;
  gameId: string;
  playerName: string;
  /** The player record this score belongs to (see `lib/players.ts`). Rows saved
   *  before the roster existed have none — those are matched by name instead. */
  playerId?: string;
  score: number;
  durationSeconds: number;
  environment: string;
  device: string;
  /** Kept for back-compat only. Every saved row carries `true` here, so nothing
   *  should read it to decide who "you" are any more. */
  isUser: boolean;
  avatar: string;
  badge: string;
  country: string;
  createdAt: string;
  /**
   * How the row got here:
   *   "local"   — played on this console;
   *   "room"    — arrived from a learner over PeerJS;
   *   "offline" — typed in as a result code, because a room was not available.
   */
  origin?: "local" | "room" | "offline";
}

export interface CustomGameRow {
  id: string;
  title: string;
  url: string | null;
  sourceType: string;
  category: string;
  description: string;
  thumbnailUrl: string;
  uploadedHtml: string | null;
  createdAt: string;
}

const FALLBACK_THUMB =
  "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80";

function read<T>(key: string): T[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, rows: T[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(rows.slice(0, 300)));
  } catch {
    /* private mode / quota — a missing high score is not worth failing a session over */
  }
}

/** GET /api/scores[?gameId=…] — newest-first, best score first per game. */
export function getScores(gameId?: string | null): { scores: ScoreRow[] } {
  const rows = read<ScoreRow>(SCORES_KEY);
  const filtered = gameId ? rows.filter((r) => r.gameId === gameId) : rows;
  return { scores: [...filtered].sort((a, b) => b.score - a.score).slice(0, gameId ? 50 : 100) };
}

/** POST /api/scores */
export function saveScore(body: {
  gameId?: string;
  playerName?: string;
  playerId?: string;
  score?: number;
  durationSeconds?: number;
  environment?: string;
  device?: string;
  avatar?: string;
  origin?: "local" | "room" | "offline";
  /** ISO stamp for a row that is being filed *after* it was played (a typed-in
   *  result code). Without it the row would claim it happened just now. */
  createdAt?: string;
}): { success: true; entry: ScoreRow } | { error: string } {
  const { gameId, score } = body;
  if (!gameId || score === undefined) return { error: "gameId and score are required" };

  const entry: ScoreRow = {
    id: Date.now(),
    gameId,
    playerName: body.playerName || "Player1",
    playerId: body.playerId,
    score: Number(score),
    durationSeconds: Number(body.durationSeconds || 60),
    environment: body.environment || "Cinema Ultra Rig",
    device: body.device || "Unity WebGL Pro",
    isUser: true,
    avatar: body.avatar || "⚡",
    badge: "Challenger",
    country: "US",
    createdAt: body.createdAt || new Date().toISOString(),
    origin: body.origin || "local",
  };

  // A row with no id reads as a duplicate of the previous save, so give the
  // second-and-later score in the same millisecond a distinct one.
  const rows = read<ScoreRow>(SCORES_KEY);
  if (rows.some((r) => r.id === entry.id)) entry.id = entry.id + 1;

  write(SCORES_KEY, [entry, ...rows]);
  return { success: true, entry };
}

/** GET /api/custom-games — newest first. */
export function getCustomGames(): { games: CustomGameRow[] } {
  return { games: read<CustomGameRow>(CUSTOM_KEY).slice(0, 50) };
}

/** POST /api/custom-games */
export function saveCustomGame(body: {
  id?: string;
  title?: string;
  url?: string | null;
  sourceType?: string;
  category?: string;
  description?: string;
  thumbnailUrl?: string;
  uploadedHtml?: string | null;
}): { success: true; game: CustomGameRow } | { error: string } {
  if (!body.title || !body.url) return { error: "title and url are required" };

  const game: CustomGameRow = {
    id: body.id || `custom-${Date.now()}`,
    title: body.title,
    url: body.url,
    sourceType: body.sourceType || "url",
    category: body.category || "Custom",
    description: body.description || "User-loaded Unity WebGL game",
    thumbnailUrl: body.thumbnailUrl || FALLBACK_THUMB,
    uploadedHtml: body.uploadedHtml || null,
    createdAt: new Date().toISOString(),
  };

  const rows = read<CustomGameRow>(CUSTOM_KEY).filter((g) => g.id !== game.id);
  write(CUSTOM_KEY, [game, ...rows]);
  return { success: true, game };
}

/** Used by the leaderboard view when it wants a game's rows without the API shape. */
export function bestScoreFor(gameId: string): number {
  const { scores } = getScores(gameId);
  return scores.length ? scores[0].score : 0;
}

/** Every row saved for one game, newest first. */
export function getGameScores(gameId: string): ScoreRow[] {
  return read<ScoreRow>(SCORES_KEY).filter((r) => r.gameId === gameId);
}

/**
 * Rows belonging to one player. Identity is the player id; a row saved before the
 * roster existed is matched by name, which is what keeps an old record attached
 * to the person who earned it instead of silently resetting to zero.
 */
export function getPlayerScores(gameId: string | null, player: { id: string; name: string }): ScoreRow[] {
  const name = player.name.trim().toLowerCase();
  return read<ScoreRow>(SCORES_KEY).filter((r) => {
    if (gameId && r.gameId !== gameId) return false;
    if (r.playerId) return r.playerId === player.id;
    return r.playerName.trim().toLowerCase() === name;
  });
}

/** The number the RANKINGS board shows for a player: their best on this game. */
export function bestScoreForPlayer(gameId: string, player: { id: string; name: string }): number {
  return getPlayerScores(gameId, player).reduce((best, r) => Math.max(best, r.score), 0);
}

/**
 * Everyone who has ever played this game, grouped per player, best score first.
 * The leaderboard uses this to rank the tutor's real players — including the ones
 * who joined over a room — instead of only the currently selected one.
 */
export interface PlayerRecord {
  playerId: string;
  name: string;
  avatar: string;
  /** Best on this game in each window, so the board's time tabs can filter. */
  best: number;
  bestWeek: number;
  bestToday: number;
  plays: number;
  lastPlayedAt: string;
  /** Where the latest result came from: this console, a PeerJS room, or a code. */
  origin: "local" | "room" | "offline";
}

/* ------------------------------------------------------------------- stats --
   Everything below is derived from the score rows that are already stored, on
   purpose: there is no separate "stats" store to drift out of step with the
   scores, so a player's progress panel can never disagree with their rows.
   --------------------------------------------------------------------------- */

export interface PlayerGameStat {
  gameId: string;
  plays: number;
  best: number;
  /** Mean of every row, so a lucky single run does not read as "their level". */
  average: number;
  seconds: number;
  lastPlayedAt: string;
}

export interface PlayerDayStat {
  /** `YYYY-MM-DD`, local date. */
  date: string;
  /** Two-letter weekday for the axis. */
  label: string;
  best: number;
  plays: number;
  seconds: number;
}

export interface PlayerStats {
  games: PlayerGameStat[];
  /** Daily activity, oldest first, exactly `days` entries including empty days. */
  days: PlayerDayStat[];
  totalPlays: number;
  totalSeconds: number;
  bestOverall: number;
  distinctGames: number;
  firstPlayedAt: string | null;
  lastPlayedAt: string | null;
  /** Rows that arrived from a room or a typed result code, i.e. someone else played them. */
  fromOthers: number;
}

function localDateKey(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * One player's whole record, read from their own rows: what they played, how much
 * of it, how they are trending over the last fortnight, and how long they spent.
 * `days` is always full length with empty days included, because a trend line
 * that silently skips the days you did not play is a lie by omission.
 */
export function getPlayerStats(player: { id: string; name: string }, days = 14): PlayerStats {
  const rows = getPlayerScores(null, player);
  const byGame = new Map<string, PlayerGameStat>();
  let totalSeconds = 0;
  let bestOverall = 0;
  let firstPlayedAt: string | null = null;
  let lastPlayedAt: string | null = null;
  let fromOthers = 0;
  const perDay = new Map<string, PlayerDayStat>();

  for (const row of rows) {
    totalSeconds += Number(row.durationSeconds) || 0;
    bestOverall = Math.max(bestOverall, row.score);
    if (row.origin === "room" || row.origin === "offline") fromOthers += 1;
    if (!firstPlayedAt || row.createdAt < firstPlayedAt) firstPlayedAt = row.createdAt;
    if (!lastPlayedAt || row.createdAt > lastPlayedAt) lastPlayedAt = row.createdAt;

    const game = byGame.get(row.gameId);
    if (game) {
      game.plays += 1;
      game.best = Math.max(game.best, row.score);
      game.average += row.score;
      game.seconds += Number(row.durationSeconds) || 0;
      if (row.createdAt > game.lastPlayedAt) game.lastPlayedAt = row.createdAt;
    } else {
      byGame.set(row.gameId, {
        gameId: row.gameId,
        plays: 1,
        best: row.score,
        average: row.score,
        seconds: Number(row.durationSeconds) || 0,
        lastPlayedAt: row.createdAt,
      });
    }

    const key = localDateKey(row.createdAt);
    if (key) {
      const day = perDay.get(key);
      if (day) {
        day.plays += 1;
        day.best = Math.max(day.best, row.score);
        day.seconds += Number(row.durationSeconds) || 0;
      } else {
        perDay.set(key, { date: key, label: "", best: row.score, plays: 1, seconds: Number(row.durationSeconds) || 0 });
      }
    }
  }

  const games = [...byGame.values()]
    .map((g) => ({ ...g, average: g.plays ? Math.round(g.average / g.plays) : 0 }))
    .sort((a, b) => b.plays - a.plays || b.best - a.best);

  const span: PlayerDayStat[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = localDateKey(d.toISOString());
    const found = perDay.get(key);
    span.push({
      date: key,
      label: d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2),
      best: found?.best ?? 0,
      plays: found?.plays ?? 0,
      seconds: found?.seconds ?? 0,
    });
  }

  return {
    games,
    days: span,
    totalPlays: rows.length,
    totalSeconds,
    bestOverall,
    distinctGames: games.length,
    firstPlayedAt,
    lastPlayedAt,
    fromOthers,
  };
}

/** One human-readable duration: `"1h 24m"`, `"9m"`, `"45s"`. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function playerRecordsFor(gameId: string): PlayerRecord[] {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();

  const grouped = new Map<string, PlayerRecord>();
  for (const row of read<ScoreRow>(SCORES_KEY)) {
    if (row.gameId !== gameId) continue;
    // Group by player id when there is one, otherwise by name, so an old row and a
    // new row for the same person land in the same bucket.
    const key = row.playerId || `name:${row.playerName.trim().toLowerCase()}`;
    const at = new Date(row.createdAt).getTime();
    const inWeek = Number.isFinite(at) && at >= weekAgo;
    const inToday = Number.isFinite(at) && at >= todayStart;
    const current = grouped.get(key);
    if (current) {
      current.best = Math.max(current.best, row.score);
      current.plays += 1;
      if (inWeek) current.bestWeek = Math.max(current.bestWeek, row.score);
      if (inToday) current.bestToday = Math.max(current.bestToday, row.score);
      if (row.createdAt > current.lastPlayedAt) {
        current.lastPlayedAt = row.createdAt;
        current.origin = row.origin === "room" ? "room" : row.origin === "offline" ? "offline" : "local";
      }
      if (!current.avatar || current.avatar === "⚡") current.avatar = row.avatar || current.avatar;
    } else {
      grouped.set(key, {
        playerId: row.playerId || key,
        name: row.playerName,
        avatar: row.avatar || "⚡",
        best: row.score,
        bestWeek: inWeek ? row.score : 0,
        bestToday: inToday ? row.score : 0,
        plays: 1,
        lastPlayedAt: row.createdAt,
        origin: row.origin === "room" ? "room" : row.origin === "offline" ? "offline" : "local",
      });
    }
  }
  return [...grouped.values()].sort((a, b) => b.best - a.best);
}
