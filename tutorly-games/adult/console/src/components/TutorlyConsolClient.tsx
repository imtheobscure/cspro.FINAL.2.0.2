"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { YOUTUBE_CATALOG, GENRES, FEATURED_ID, findGame, type ConsoleGame } from "@/data/catalog";
import { PLATFORM_CATALOG, PLATFORM_SOURCES, isPlatformSource } from "@/data/platforms";
import { generateFakeLeaderboardForGame, type LeaderboardEntry } from "@/data/fakeLeaderboard";
import GamingEnvironment, { type EnvironmentType } from "./console/GamingEnvironment";
import PlayableStage from "./games/PlayableStage";
import LeaderboardView from "./leaderboard/LeaderboardView";
import PlayerPicker from "./leaderboard/PlayerPicker";
import PartyPanel from "./leaderboard/PartyPanel";
import ProjectorBoard from "./leaderboard/ProjectorBoard";
import PlayerStatsPanel from "./leaderboard/PlayerStatsPanel";
import LoadUnityGameModal from "./modals/LoadUnityGameModal";
import { soundEffects } from "@/utils/audio";
// The console's four API calls, answered in the browser — see lib/localApi.ts.
import {
  getCustomGames,
  getPlayerScores,
  playerRecordsFor,
  saveScore,
  saveCustomGame,
} from "@/lib/localApi";
// Players, the dashboards' learners, and the PeerJS score room.
import {
  activePlayer as activePlayerOf,
  emptyRoster,
  loadRoster,
  localPlayerId,
  makePlayer,
  removePlayer as removePlayerFromRoster,
  saveRoster,
  setActivePlayer,
  touchPlayer,
  upsertPlayer,
  type ConsolePlayer,
  type Roster,
} from "@/lib/players";
import { loadDashboardContacts, matchContactByName, type Contact } from "@/lib/contacts";
import {
  Party,
  codeFromLocation,
  initialParty,
  roomShareable,
  type PartyProfile,
  type PartySnapshot,
} from "@/lib/party";
import { decodeResult, encodeResult, formatResultCode } from "@/lib/offlineCode";
import {
  clearUnclaimedStorage,
  describePurge,
  ensureGameServiceWorker,
  purgeAllGameCaches,
  purgeDetails,
  purgedFileCount,
} from "@/lib/gameCache";
import {
  Gamepad2,
  Search,
  Plus,
  Volume2,
  VolumeX,
  Sparkles,
  ExternalLink,
  ArrowUpDown,
  Play,
  Star,
  Trophy,
  FolderOpen,
  MonitorPlay,
  Trash2,
  RotateCw,
} from "lucide-react";

type SortKey = "popular" | "newest" | "title";
const PAGE_SIZE = 48;
const FAVORITES_KEY = "tutorly:console:favorites:v1";
/**
 * The game on the console is part of the address, so a bookmark opens it.
 *
 * `?room=` already made a share link mean something; this is the same idea for a
 * single game: the tutor's shortcut to "the game we always start with" is a URL,
 * not a search. It is written on every game change, so the address bar always
 * describes what is on screen.
 */
const GAME_PARAM = "game";

/** A title as a URL fragment, so `?game=word-waffle` is a link a person can type. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The game this page was opened for, if any. */
function gameRefFromLocation(): string {
  try {
    return new URL(window.location.href).searchParams.get(GAME_PARAM)?.trim() || "";
  } catch {
    return "";
  }
}

/**
 * A game reference as a game: the id the console writes, or a hand-typed slug.
 *
 * Bookmarks get the id, because it is stable and can never be ambiguous. Typing
 * `?game=taboo` by hand is the other half of the feature, and a title match is the
 * only way that can work.
 */
function findGameByRef(games: ConsoleGame[], ref: string): ConsoleGame | undefined {
  const wanted = ref.trim();
  if (!wanted) return undefined;
  const byId = games.find((g) => g.id === wanted);
  if (byId) return byId;
  const slug = slugify(wanted);
  return (
    games.find((g) => slugify(g.title) === slug) ||
    games.find((g) => g.id.toLowerCase() === wanted.toLowerCase())
  );
}

export default function TutorlyConsolClient() {
  const requestedRef = useRef(gameRefFromLocation()).current;
  const initialGame = findGameByRef(YOUTUBE_CATALOG, requestedRef) || findGame(FEATURED_ID) || YOUTUBE_CATALOG[0];
  const [activeGame, setActiveGame] = useState<ConsoleGame>(initialGame);
  const [customGames, setCustomGames] = useState<ConsoleGame[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Search / filter / sort
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("popular");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Environment
  const [activeRig, setActiveRig] = useState<EnvironmentType>("cinema");
  const [ambientRgb, setAmbientRgb] = useState(true);
  const [scanlines, setScanlines] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Player / scores
  const [roster, setRoster] = useState<Roster>(emptyRoster);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsState, setContactsState] = useState<"idle" | "loading" | "ready">("idle");
  const [showPractice, setShowPractice] = useState(true);
  const [liveScore, setLiveScore] = useState<number | null>(null);
  const [userBestScore, setUserBestScore] = useState(0);
  const [userRank, setUserRank] = useState<number | undefined>(undefined);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);

  // Score room (PeerJS)
  const [party, setParty] = useState<PartySnapshot>(initialParty);
  /** The projector scoreboard, and whose record is open. */
  const [projectorOpen, setProjectorOpen] = useState(false);
  const [statsPlayer, setStatsPlayer] = useState<ConsolePlayer | null>(null);
  const [partyProfile, setPartyProfile] = useState<PartyProfile>({ name: "Player1", avatar: "⚡" });
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const partyRef = useRef<Party | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [recentScores, setRecentScores] = useState<{ gameId: string; score: number; createdAt: string }[]>([]);

  /**
   * "Clear all game cache" is a two-press button, and both presses are on screen.
   *
   * Deleting every cached Unity build is not undoable and it costs a re-download, so
   * the first press only arms it and says what the second will do. A browser
   * `confirm()` would be one click, but it looks like a mistake or a phishing box and
   * it blocks the page — and this button gets pressed while a class is watching.
   */
  const [purgeArmed, setPurgeArmed] = useState(false);
  const [purging, setPurging] = useState(false);
  /**
   * Bumped to tell the stage to close whatever game it is running.
   *
   * The purge deletes Unity's databases, and a database a live game frame is
   * holding open cannot be deleted — the browser blocks the request and answers
   * nothing, so the cache reads as cleared while the level the class was on stays
   * exactly where it was. Stopping the game first is the difference between the
   * button working and the button reporting that it worked.
   */
  const [stageStopSignal, setStageStopSignal] = useState(0);
  const [purgeNote, setPurgeNote] = useState<string | null>(null);
  const [purgeLines, setPurgeLines] = useState<string[]>([]);
  /**
   * Keys the last purge found on this origin that nothing accounts for.
   *
   * Held so the tutor can decide about them *after* seeing them named. The purge
   * itself never deletes these: a key written before the console kept track of game
   * writes cannot be told apart from the Tutorly dashboard's own keys by any rule,
   * and this origin carries both.
   */
  const [unclaimedKeys, setUnclaimedKeys] = useState<string[]>([]);
  /** True once `?game=` has been answered by the catalogue, so it only happens once. */
  const urlGameResolvedRef = useRef(false);

  /** Who is playing right now. `playerName` is derived from the roster, so the box,
   *  the board and the score rows can never disagree about the name. */
  const activePlayer = useMemo(() => activePlayerOf(roster), [roster]);
  const playerName = activePlayer?.name?.trim() || "Player1";

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const lastSavedRef = useRef<number>(-1);
  const playerNameRef = useRef(playerName);
  const rigRef = useRef(activeRig);
  const userBestRef = useRef(0);
  const favoritesLoadedRef = useRef(false);

  // The stage keeps one message listener for the whole game, so the callbacks it
  // is given must not change identity on every render — these refs carry the
  // current values to them instead.
  useEffect(() => {
    playerNameRef.current = playerName;
  }, [playerName]);
  useEffect(() => {
    rigRef.current = activeRig;
  }, [activeRig]);
  useEffect(() => {
    userBestRef.current = userBestScore;
  }, [userBestScore]);

  /**
   * The roster is the source of truth for who is playing — `playerName` is derived
   * from it (see below), so there is exactly one thing to keep in sync. The ref
   * exists because the PeerJS callbacks below fire outside a render and still need
   * the roster as it is *now*, not as it was when the connection opened.
   */
  const rosterRef = useRef<Roster>(emptyRoster);
  const applyRoster = useCallback((next: Roster) => {
    rosterRef.current = next;
    setRoster(next);
  }, []);

  useEffect(() => {
    shareableRef.current = roomShareable();
  }, []);

  /**
   * The game file server, started with the console rather than per game.
   *
   * It is what makes a second open of a game instant instead of another 10–20 MB
   * download (see `public/unity-sw.js`), so it has to be alive before the first game
   * is opened. A console that never gets one still plays everything.
   */
  useEffect(() => {
    void ensureGameServiceWorker();
  }, []);

  useEffect(() => {
    const loaded = loadRoster();
    applyRoster(loaded);
    const active = activePlayerOf(loaded);
    if (active) setPartyProfile((p) => ({ ...p, name: active.name, avatar: active.avatar }));
  }, [applyRoster]);

  useEffect(() => {
    if (roster.players.length || roster.activeId) saveRoster(roster);
  }, [roster]);

  /**
   * The dashboards are read once, shortly after first paint: the scan is a couple of
   * IndexedDB reads and must not sit in front of the console's first render.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setContactsState("loading");
      loadDashboardContacts()
        .then((found) => {
          setContacts(found);
          contactsRef.current = found;
          setContactsState("ready");
        })
        .catch(() => setContactsState("ready"));
    }, 900);
    return () => window.clearTimeout(timer);
  }, []);

  /**
   * A share link opens the console with `?room=CODE`. The code is filled in and the
   * panel is highlighted, but the join is not automatic: the learner still has to
   * write their name, which is the one thing the room genuinely needs from them.
   */
  useEffect(() => {
    const code = codeFromLocation();
    if (code) {
      setInviteCode(code);
      showToast(`Room ${code} — write your name below to join`);
    }
  }, [showToast]);

  /**
   * One person, one row.
   *
   * A learner who joins from their own phone can only tell the host their *name*,
   * which is exactly the problem this solves: if that name is already a learner in
   * the tutor's dashboard, the score must land on that learner's record — their
   * best, their history, their face — instead of appearing as a second row next to
   * the person it belongs to. Falls back to a room-local guest record, because an
   * unresolved name must never be guessed onto somebody else.
   */
  const resolveGuestIdentity = useCallback(
    (peerId: string, name: string, avatar: string) => {
      const match = matchContactByName(contactsRef.current, name);
      if (match) {
        return { id: match.id, name: match.name, avatar: avatar || match.avatar, source: match.source, matched: true };
      }
      return { id: `guest:${peerId}`, name, avatar, source: "guest" as const, matched: false };
    },
    []
  );

  // Favorites live in this browser, next to the scores (see `lib/localApi.ts`).
  // The load runs before the save, so a stored list is never overwritten by the
  // empty first render — `favoritesLoadedRef` is the guard.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setFavorites(parsed.filter((id): id is string => typeof id === "string"));
    } catch {}
    favoritesLoadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!favoritesLoadedRef.current) return;
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {}
  }, [favorites]);


  // Load saved custom games. Storage is local (see `lib/localApi.ts`): a game
  // folder on a static host has no database, so "your games" means this browser.
  useEffect(() => {
    (async () => {
      try {
        const data = getCustomGames();
        const mapped: ConsoleGame[] = (data.games || []).map((g) => {
          const isLocal = g.sourceType === "local";
          const isYt = g.sourceType === "youtube";
          return {
            id: g.id,
            title: g.title,
            genre: g.category || "Arcade",
            thumbnailUrl:
              g.thumbnailUrl || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80",
            plays: "",
            playsNumeric: 0,
            developer: isLocal ? "Local build" : "",
            publisher: "",
            publishDate: "",
            publishedAt: 0,
            description: g.description || "",
            source: isYt ? "youtube" : isLocal ? "local" : "custom-url",
            youtubeUrl: isYt ? `https://www.youtube.com/playables/${g.id}` : undefined,
            directUrl: isYt ? undefined : g.url ?? undefined,
          };
        });
        setCustomGames(mapped);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  /**
   * Recent scores (for the "Your records" widget) — the **selected player's** rows,
   * not the whole browser's. With more than one learner on the console, a shared
   * list was actively misleading: it showed the other learner's results under the
   * current name.
   */
  /**
   * `playerArg` is passed by the roster effect below. The ref is not usable there:
   * `activePlayerRef` is assigned in an effect declared *after* this one, so on the
   * render where a player is restored from storage the ref still holds the previous
   * value (null on first load) — which left "Your recent records" permanently empty
   * for a returning player. Scoring still goes through the ref, which is correct by
   * then, so the argument is optional.
   */
  const refreshRecent = useCallback(async (playerArg?: ConsolePlayer | null) => {
    try {
      const player = playerArg ?? activePlayerRef.current;
      if (!player) {
        setRecentScores([]);
        return;
      }
      const rows = getPlayerScores(null, player)
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 8);
      setRecentScores(rows.map((r) => ({ gameId: r.gameId, score: r.score, createdAt: r.createdAt })));
    } catch {}
  }, []);
  useEffect(() => {
    refreshRecent(activePlayer);
  }, [refreshRecent, activePlayer]);

  /** "3m ago" style stamps for real rows, which have real dates. */
  const timeAgo = useCallback((iso?: string): string => {
    if (!iso) return "—";
    const ms = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(ms)) return "—";
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return days < 7 ? `${days}d ago` : `${Math.floor(days / 7)}w ago`;
  }, []);

  /**
   * The board.
   *
   * Real rows come from three places and are merged by player id, so one person is
   * one row however they got there: the score store (any player who has ever played
   * this game), the room roster (so a learner appears the moment they join, before
   * they score), and the currently selected player (always present, even at 0).
   * Practice rivals fill in underneath, and disappear entirely when the tutor asks
   * for their own class alone.
   */
  const buildBoard = useCallback((): LeaderboardEntry[] => {
    const avatarFor = new Map<string, string>();
    rosterRef.current.players.forEach((p) => avatarFor.set(p.id, p.avatar));
    // Room participants bring their own face; the guest's photo only ever lives here
    // and in the roster, never on every score row.
    [...partyBoardRef.current.guests, ...partyBoardRef.current.board].forEach((r) => {
      if (r.avatar) avatarFor.set(r.id === "host" ? "host" : r.id, r.avatar);
    });

    const byId = new Map<string, LeaderboardEntry>();
    const badgeFor = (plays: number) =>
      plays >= 10 ? "Regular" : plays >= 3 ? "Challenger" : plays >= 1 ? "Newcomer" : "Ready";

    for (const record of recordsRef.current) {
      byId.set(record.playerId, {
        id: record.playerId,
        rank: 0,
        playerName: record.name,
        score: Math.max(0, record.best),
        avatar: avatarFor.get(record.playerId) || record.avatar || "⚡",
        badge: badgeFor(record.plays),
        country: "",
        countryFlag: "",
        device: record.origin === "room" ? "PeerJS score room" : `Tutorly ${rigRef.current.toUpperCase()}`,
        durationSeconds: 0,
        isUser: record.playerId === activePlayerRef.current?.id,
        timeAgo: timeAgo(record.lastPlayedAt),
        verified: true,
        isReal: true,
        playerId: record.playerId,
        plays: record.plays,
        best: { all: record.best, week: record.bestWeek, today: record.bestToday },
      });
    }

    for (const row of partyBoardRef.current.board) {
      // The host's own room row is the tutor's own player row, not a second entry:
      // reusing the active player's id is what stops the board showing them twice.
      // The same applies to a guest whose name is a learner the tutor already keeps:
      // resolving that here as well as at save time means the row they *appear* in is
      // the row their score was filed under, so joining never forks a record.
      const asLearner = row.id === "host" ? null : matchContactByName(contactsRef.current, row.name);
      const id = row.id === "host"
        ? activePlayerRef.current?.id || "room:host"
        : asLearner
        ? asLearner.id
        : `guest:${row.id}`;
      if (asLearner && row.avatar) avatarFor.set(asLearner.id, row.avatar);
      const existing = byId.get(id);
      const score = Math.max(existing?.score ?? 0, row.best[activeGameRef.current] ?? 0);
      byId.set(id, {
        id,
        rank: existing?.rank ?? 0,
        playerName: row.name,
        score,
        avatar: row.avatar || existing?.avatar || "⚡",
        badge: existing?.badge ?? badgeFor(0),
        country: "",
        countryFlag: "",
        device: `${row.role === "host" ? "Host" : "Guest"} · PeerJS score room`,
        durationSeconds: 0,
        isUser: id === activePlayerRef.current?.id,
        timeAgo: existing?.timeAgo ?? "In the room",
        verified: true,
        isReal: true,
        playerId: id,
        plays: existing?.plays ?? 0,
        best: existing?.best ?? { all: score, week: score, today: score },
        roomRole: row.role,
      });
    }

    const selected = activePlayerRef.current;
    if (selected && !byId.has(selected.id)) {
      byId.set(selected.id, {
        id: selected.id,
        rank: 0,
        playerName: selected.name,
        score: 0,
        avatar: selected.avatar,
        badge: "Ready",
        country: "",
        countryFlag: "",
        device: `Tutorly ${rigRef.current.toUpperCase()}`,
        durationSeconds: 0,
        isUser: true,
        timeAgo: "Ready to play",
        verified: true,
        isReal: true,
        playerId: selected.id,
        plays: 0,
        best: { all: 0, week: 0, today: 0 },
      });
    }

    const realRows = [...byId.values()];
    const realNames = new Set(realRows.map((r) => r.playerName.trim().toLowerCase()));
    const fillers = showPracticeRef.current
      ? generateFakeLeaderboardForGame(activeGameRef.current).filter(
          (f) => !realNames.has(f.playerName.trim().toLowerCase())
        )
      : [];

    return [...realRows, ...fillers]
      .sort((a, b) => b.score - a.score || a.playerName.localeCompare(b.playerName))
      .map((e, i) => ({ ...e, rank: i + 1 }));
  }, [timeAgo]);

  /** Rebuild the whole board from the current inputs. */
  const refreshBoard = useCallback(() => {
    setLeaderboardEntries(buildBoard());
  }, [buildBoard]);

  /** Records live in a ref so `buildBoard` never has to be re-created for them. */
  const recordsRef = useRef<ReturnType<typeof playerRecordsFor>>([]);
  const partyBoardRef = useRef<PartySnapshot>(initialParty);
  /** The dashboard learners, readable from callbacks that must not re-create themselves. */
  const contactsRef = useRef<Contact[]>([]);
  /**
   * Whether this console's own address is one a phone could open. Read once at
   * first render: the origin cannot change without a reload, and reading it here
   * keeps `roomShareable()` (which touches `window`) out of the render path.
   */
  const shareableRef = useRef<boolean>(true);
  const activeGameRef = useRef<string>(activeGame.id);
  const activePlayerRef = useRef<ConsolePlayer | null>(null);
  const showPracticeRef = useRef(true);

  /** Re-read every player's best on the game that is on screen. */
  const reloadRecords = useCallback(() => {
    try {
      recordsRef.current = playerRecordsFor(activeGameRef.current);
    } catch {
      recordsRef.current = [];
    }
    refreshBoard();
  }, [refreshBoard]);

  useEffect(() => {
    activeGameRef.current = activeGame.id;
    lastSavedRef.current = -1;
    setLiveScore(null);
    reloadRecords();
    // A room follows the host's console: switching game switches it for everyone.
    partyRef.current?.setGame(activeGame.id);
  }, [activeGame.id, reloadRecords]);

  useEffect(() => {
    refreshBoard();
  }, [roster, refreshBoard]);

  useEffect(() => {
    activePlayerRef.current = activePlayer;
    refreshBoard();
  }, [activePlayer, refreshBoard]);

  useEffect(() => {
    showPracticeRef.current = showPractice;
    refreshBoard();
  }, [showPractice, refreshBoard]);

  useEffect(() => {
    partyBoardRef.current = party;
    refreshBoard();
  }, [party, refreshBoard]);

  // Rank and personal best both follow the board itself, so they cannot disagree
  // with what is on screen.
  useEffect(() => {
    const mine = leaderboardEntries.find((e) => e.isUser);
    setUserRank(mine?.rank);
    setUserBestScore(mine?.score ?? 0);
    userBestRef.current = mine?.score ?? 0;
  }, [leaderboardEntries]);

  const toggleFavorite = useCallback(
    (game: ConsoleGame) => {
      const isFavorite = favorites.includes(game.id);
      setFavorites((prev) => (prev.includes(game.id) ? prev.filter((id) => id !== game.id) : [game.id, ...prev]));
      soundEffects.playClick();
      showToast(isFavorite ? `Removed "${game.title}" from favorites` : `Added "${game.title}" to favorites`);
    },
    [favorites, showToast]
  );

  // Called by the stage whenever the game (or the player) reports a score
  const handleScoreReported = useCallback(
    async (score: number, auto: boolean) => {
      setLiveScore(score);
      if (!Number.isFinite(score) || score < 0) return;
      // Avoid re-saving the identical score the SDK keeps re-reporting
      if (auto && score === lastSavedRef.current) return;
      lastSavedRef.current = score;

      const player = activePlayerRef.current;
      if (!player) return;

      try {
        const saved = saveScore({
          gameId: activeGameRef.current,
          playerName: player.name,
          playerId: player.id,
          score,
          environment: activeRig,
          // No avatar on the row: a learner's photo belongs in the roster once, not
          // copied into every score they ever set.
          device: auto ? "ytgame SDK sendScore" : "Manual entry",
        });
        if ("error" in saved) return;
        refreshRecent();
        applyRoster(touchPlayer(rosterRef.current, player.id));

        const previousBest = userBestRef.current;
        reloadRecords();
        if (previousBest > 0 && score > previousBest) {
          confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 }, colors: ["#22d3ee", "#a855f7", "#fbbf24"] });
          showToast(`New personal best for ${player.name}: ${score.toLocaleString()}!`);
        } else if (previousBest === 0) {
          showToast(`${auto ? "Game reported" : "Logged"} score ${score.toLocaleString()} for ${player.name}`);
        }

        // A guest's score also goes to the host, which is the whole point of a room.
        partyRef.current?.reportScore(activeGameRef.current, score);
      } catch (e) {
        console.error(e);
      }
    },
    [activeRig, applyRoster, refreshRecent, reloadRecords, showToast]
  );

  /* -------------------------------------------------------------- players -- */

  /**
   * Select a player — from a suggestion, a saved chip, or a click on a board row.
   * A suggestion carrying a dashboard learner id keeps that identity, so the same
   * learner is one record across sessions and not a new name each week.
   */
  const pickPlayer = useCallback(
    (contact: { id?: string; name: string; avatar?: string; source?: ConsolePlayer["source"] }) => {
      const name = contact.name.trim();
      if (!name) return;
      const id = contact.id && contact.id.length ? contact.id : localPlayerId(name);
      const { roster: next, player } = upsertPlayer(rosterRef.current, {
        id,
        name,
        avatar: contact.avatar,
        source: contact.source || "console",
        makeActive: true,
      });
      applyRoster(next);
      setPartyProfile({ name: player.name, avatar: player.avatar });
      partyRef.current?.updateProfile({ name: player.name, avatar: player.avatar });
      soundEffects.playClick();
    },
    [applyRoster]
  );

  /**
   * Typing in the box renames the current player instead of creating a new one.
   *
   * It also renames them in the room. This is the flow a learner joining a shared
   * link actually uses — open the link, type your name, press Enter, press JOIN —
   * and without this the name they typed stayed on their own console while the room
   * kept announcing whatever name the box held before ("Player1" on a fresh
   * browser). The tutor's board would then show a name nobody chose.
   */
  const renameActivePlayer = useCallback(
    (name: string) => {
      const trimmed = name.slice(0, 24);
      const current = activePlayerRef.current;
      const { roster: next, player } = upsertPlayer(rosterRef.current, {
        id: current?.id || localPlayerId(trimmed || "Player1"),
        name: trimmed || "Player1",
        avatar: current?.avatar,
        source: current?.source || "console",
        makeActive: true,
      });
      applyRoster(next);
      const profile = { name: player.name, avatar: player.avatar };
      setPartyProfile(profile);
      partyRef.current?.updateProfile(profile);
    },
    [applyRoster]
  );

  const forgetPlayer = useCallback(
    (id: string) => {
      applyRoster(removePlayerFromRoster(rosterRef.current, id));
      showToast("Removed from your player list — their scores are kept");
    },
    [applyRoster, showToast]
  );

  const selectBoardRow = useCallback(
    (entry: LeaderboardEntry) => {
      pickPlayer({ id: entry.playerId, name: entry.playerName, avatar: entry.avatar, source: "console" });
      showToast(`Now playing as ${entry.playerName}`);
    },
    [pickPlayer, showToast]
  );

  /* ------------------------------------------------------------ score room -- */

  /**
   * One Party for the tab. It is created once and kept in a ref: a React strict-mode
   * double mount must not open two signalling connections, and the peer has to
   * outlive every render to receive a guest's score while the tutor is mid-question.
   */
  useEffect(() => {
    const party = new Party({
      onState: (snapshot) => setParty(snapshot),
      onGuestProfile: ({ peerId, name, avatar }) => {
        const who = resolveGuestIdentity(peerId, name, avatar);
        const { roster: next } = upsertPlayer(rosterRef.current, {
          id: who.id,
          name: who.name,
          avatar: who.avatar,
          source: who.source,
        });
        applyRoster(next);
        // Say it out loud, because "why is this learner already in my list" is the
        // question the tutor would otherwise have to work out from the board.
        if (who.matched) showToast(`${who.name} is in your dashboard — filing this room under their record`);
      },
      onGuestScore: ({ peerId, name, avatar, gameId, score }) => {
        // File it under the host's own records, so a learner's result is still there
        // after they close their laptop — and under their dashboard learner when the
        // name matches one, so a room never splits a learner into two rows.
        const who = resolveGuestIdentity(peerId, name, avatar);
        saveScore({
          gameId,
          playerName: who.name,
          playerId: who.id,
          score,
          device: "PeerJS score room",
          origin: "room",
          avatar: who.avatar,
        });
        if (gameId === activeGameRef.current) reloadRecords();
      },
    });
    partyRef.current = party;
    return () => {
      party.dispose();
      partyRef.current = null;
    };
  }, [applyRoster, reloadRecords, resolveGuestIdentity, showToast]);

  const startRoom = useCallback(() => {
    partyRef.current?.host({ name: playerName, avatar: activePlayerRef.current?.avatar || "⚡" });
  }, [playerName]);

  const joinRoom = useCallback(
    (code: string) => {
      partyRef.current?.join(code, { name: playerName, avatar: activePlayerRef.current?.avatar || "⚡" });
    },
    [playerName]
  );

  const leaveRoom = useCallback(() => {
    partyRef.current?.leave();
    setInviteCode(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("room");
      window.history.replaceState({}, "", url.toString());
    } catch {
      /* a URL we cannot rewrite is not worth failing over */
    }
  }, []);

  /** The tutor's own score joins the shared board while hosting a room. */
  useEffect(() => {
    if (party.role === "host" && party.status === "live" && userBestScore > 0) {
      partyRef.current?.addLocalScore(activeGame.id, userBestScore, {
        name: playerName,
        avatar: activePlayer?.avatar || "⚡",
      });
    }
  }, [party.role, party.status, userBestScore, activeGame.id, playerName, activePlayer]);

  const changePartyProfile = useCallback(
    (profile: PartyProfile) => {
      setPartyProfile(profile);
      partyRef.current?.updateProfile(profile);
    },
    []
  );

  /* ------------------------------------------------------- offline results --
     The no-network path: a learner plays on their own device, reads out the short
     code their console shows, and the tutor types it here. The code carries the
     score and the game it came from, never who earned it — so the name is typed
     too, and a name that matches a dashboard learner files under that learner for
     the same reason a room guest does.
     ---------------------------------------------------------------------- */
  const addOfflineResult = useCallback(
    (rawCode: string, rawName: string): { ok: boolean; message: string } => {
      const name = rawName.trim();
      if (!name) return { ok: false, message: "Type the learner's name as well — the code carries the score, not who earned it." };
      const decoded = decodeResult(rawCode, activeGameRef.current);
      if (!decoded.ok || decoded.score === undefined) {
        return { ok: false, message: decoded.error || "That code could not be read." };
      }
      const contact = matchContactByName(contactsRef.current, name);
      const { roster: next, player } = upsertPlayer(rosterRef.current, contact
        ? { id: contact.id, name: contact.name, avatar: contact.avatar, source: contact.source, makeActive: false }
        : { id: localPlayerId(name), name, source: "console", makeActive: false });
      applyRoster(next);
      const saved = saveScore({
        gameId: activeGameRef.current,
        playerName: player.name,
        playerId: player.id,
        score: decoded.score,
        durationSeconds: decoded.durationSeconds,
        device: "Result code (no room)",
        origin: "offline",
        avatar: player.avatar,
      });
      if ("error" in saved) return { ok: false, message: saved.error };
      reloadRecords();
      return {
        ok: true,
        message: `${decoded.score.toLocaleString()} added for ${player.name}${contact ? " — filed under their dashboard record" : ""}.`,
      };
    },
    [applyRoster, reloadRecords]
  );

  // Catalog filtering
  const allGames = useMemo(
    () => [...customGames, ...PLATFORM_CATALOG, ...YOUTUBE_CATALOG],
    [customGames]
  );

  /**
   * Answer `?game=` once the whole catalogue is known.
   *
   * A bookmark can point at a game the tutor loaded from a folder, which only exists
   * after `getCustomGames()` has answered — so the built-in catalogue resolves at
   * first render (instant, no flash of the wrong game) and the loaded ones are
   * resolved here. This has to sit below `allGames`: the dependency array is read
   * during render, and a `const` further down the file is still in its dead zone.
   */
  useEffect(() => {
    if (urlGameResolvedRef.current) return;
    const ref = gameRefFromLocation();
    if (!ref) {
      urlGameResolvedRef.current = true;
      return;
    }
    const found = findGameByRef(allGames, ref);
    if (found) {
      if (found.id !== activeGameRef.current) setActiveGame(found);
      urlGameResolvedRef.current = true;
      return;
    }
    // A loaded game can still turn up, but a built-in one that is not here is a real
    // "no": say so once, then stop looking.
    if (customGames.length > 0) {
      urlGameResolvedRef.current = true;
      showToast(`The link asks for "${ref}", which is not in the catalogue`);
    }
  }, [allGames, customGames.length, showToast]);

  const filteredGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = allGames.filter((g) => {
      if (showFavoritesOnly && !favorites.includes(g.id)) return false;
      if (selectedSource === "youtube" && g.source !== "youtube") return false;
      if (selectedSource === "mine" && !customGames.some((c) => c.id === g.id)) return false;
      // A platform tab shows exactly that platform's games.
      if (isPlatformSource(selectedSource) && g.source !== selectedSource) return false;
      if (selectedGenre !== "All" && g.genre !== selectedGenre) return false;
      if (!q) return true;
      return (
        g.title.toLowerCase().includes(q) ||
        g.developer.toLowerCase().includes(q) ||
        g.publisher.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.id.toLowerCase() === q ||
        g.genre.toLowerCase().includes(q)
      );
    });
    list.sort((a, b) => {
      if (sortBy === "popular") return b.playsNumeric - a.playsNumeric;
      if (sortBy === "newest") return b.publishedAt - a.publishedAt;
      return a.title.localeCompare(b.title);
    });
    return list;
  }, [allGames, customGames, favorites, searchQuery, selectedGenre, selectedSource, showFavoritesOnly, sortBy]);

  useEffect(
    () => setVisibleCount(PAGE_SIZE),
    [searchQuery, selectedGenre, selectedSource, sortBy, showFavoritesOnly]
  );

  /**
   * Put the game on the console, and in the address bar.
   *
   * `replaceState`, not `pushState`: the console is one screen, and a back button
   * that walks back through twenty games is not what a tutor wants when they press
   * it. Every other query parameter (`room`, `proxy`) is preserved, so a share link
   * keeps working after the host changes the game.
   */
  const selectGame = (g: ConsoleGame) => {
    setActiveGame(g);
    soundEffects.playClick();
    try {
      const url = new URL(window.location.href);
      url.searchParams.set(GAME_PARAM, g.id);
      window.history.replaceState({}, "", url.toString());
    } catch {
      /* a URL we cannot rewrite is not worth failing a game over */
    }
    stageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /** Put a game on the console from a stats row or a recent record. */
  const playGameById = (gameId: string) => {
    const game = allGames.find((g) => g.id === gameId);
    if (!game) {
      showToast("That game is no longer in the catalogue");
      return;
    }
    setStatsPlayer(null);
    selectGame(game);
  };

  const handleGameLoaded = async (g: ConsoleGame) => {
    setCustomGames((prev) => [g, ...prev.filter((x) => x.id !== g.id)]);
    // A loaded game is put on the console through the same path as a catalogue game,
    // so its address is written the same way and a bookmark of it opens it.
    setActiveGame(g);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set(GAME_PARAM, g.id);
      window.history.replaceState({}, "", url.toString());
    } catch {
      /* see selectGame */
    }
    urlGameResolvedRef.current = true;
    stageRef.current?.scrollIntoView({ behavior: "smooth" });
    showToast(`Loaded "${g.title}" into the console`);
    try {
      saveCustomGame({
        id: g.id,
        title: g.title,
        // A platform game that plays through the proxy has no direct URL, so the
        // library keeps its page address — that is what a tutor recognises later.
        url: g.source === "youtube" ? g.youtubeUrl : g.directUrl || g.pageUrl,
        sourceType: g.source === "youtube" ? "youtube" : g.source === "local" ? "local" : "url",
        category: g.genre,
        description: g.description,
        thumbnailUrl: g.thumbnailUrl,
      });
    } catch {}
  };

  /**
   * Delete every cached Unity build the console has ever stored.
   *
   * The per-game eraser next to Reload game is the precise tool; this is the blunt
   * one, for when a whole class of games is misbehaving or a cache exists that the
   * per-game match cannot see (a build from an older deployment, or one a service
   * worker is still holding). It reports what it found rather than saying "done",
   * because the one outcome worth knowing about is a database another tab still has
   * open — and reloading is offered rather than forced, so the report stays readable.
   */
  const runPurge = useCallback(async () => {
    if (purging) return;
    if (!purgeArmed) {
      setPurgeArmed(true);
      soundEffects.playClick();
      return;
    }
    setPurgeArmed(false);
    setPurging(true);
    setPurgeNote("Deleting every cached Unity build…");
    setPurgeLines([]);
    setUnclaimedKeys([]);
    soundEffects.playClick();
    try {
      // Stop the game before deleting anything it is holding open, and give the
      // frame a moment to actually go away: the delete is issued from here, and a
      // frame that is still unloading still holds its databases.
      setStageStopSignal((n) => n + 1);
      await new Promise((resolve) => setTimeout(resolve, 700));
      const report = await purgeAllGameCaches();
      // The purge stops the file server so nothing can repopulate a cache while it is
      // being emptied. Start it again, or caching would be silently dead until the
      // next page load and every game after this would stream from the network.
      void ensureGameServiceWorker();
      setPurgeLines(purgeDetails(report));
      setUnclaimedKeys(report.unclaimed);
      const files = purgedFileCount(report);
      setPurgeNote(
        `${describePurge(report)} — ${files.toLocaleString()} file${files === 1 ? "" : "s"} gone. ` +
          "Each game downloads itself again the next time it is played."
      );
      showToast(describePurge(report));
      soundEffects.playCoin();
    } catch (e) {
      setPurgeNote(`The cache could not be cleared: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setPurging(false);
    }
  }, [purgeArmed, purging, showToast]);

  /**
   * Remove the keys nothing accounts for, once and by request.
   *
   * This is the only place they are ever deleted. It is a separate press from CLEAR
   * CACHE on purpose: the tutor has just been shown the names, and a key like
   * `playerLevel` next to `resumeLevel` is something a person recognises instantly and
   * no automatic rule can.
   */
  const clearUnclaimed = useCallback(() => {
    const gone = clearUnclaimedStorage();
    setUnclaimedKeys([]);
    setPurgeLines((lines) => [
      ...lines,
      gone.length ? `cleared, since nothing accounted for them — ${gone.join(", ")}` : "nothing was left to clear",
    ]);
    setPurgeNote(
      gone.length
        ? `${gone.length} key${gone.length === 1 ? "" : "s"} that nothing accounted for removed. Reload a game to see it start fresh.`
        : "Those keys were already gone."
    );
    showToast(gone.length ? `${gone.length} stray key${gone.length === 1 ? "" : "s"} cleared` : "Nothing left to clear");
    soundEffects.playCoin();
  }, [showToast]);

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-8 py-3">
        <div className="w-full flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/25 shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-cyan-400">
                <Gamepad2 className="w-5 h-5" />
              </div>
            </div>
            <h1 className="text-lg font-black tracking-wider text-white">
              TUTORLY <span className="text-cyan-400">CONSOLE</span>
            </h1>
          </div>

          {/*
            `flex-wrap` and a wrappable group: these four controls carry the only way
            to open a game, reach the projector and clear the cache. They must never be
            pushed off the right edge, so on a narrow phone the group wraps to a second
            row rather than losing its last button off-screen.
          */}
          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 sm:ml-auto">
            <button
              onClick={() => {
                setIsModalOpen(true);
                soundEffects.playClick();
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black px-3 sm:px-4 py-2 rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">OPEN UNITY GAME</span>
              <span className="sm:hidden">OPEN</span>
            </button>
            <button
              onClick={() => {
                setProjectorOpen(true);
                soundEffects.playClick();
              }}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-mono border border-cyan-500/30"
              title="Full-screen scoreboard for the class projector"
            >
              <MonitorPlay className="w-4 h-4" />
              <span className="hidden sm:inline">PROJECTOR</span>
              <span className="sm:hidden">SCORE</span>
            </button>
            <button
              onClick={runPurge}
              disabled={purging}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono border transition disabled:opacity-60 ${
                purgeArmed
                  ? "bg-red-500/25 hover:bg-red-500/35 border-red-400/70 text-red-100"
                  : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800"
              }`}
              title={
                purgeArmed
                  ? "Press again to delete every cached Unity build for every game"
                  : "Delete every cached Unity build for every game — the whole cache, not one game's"
              }
            >
              <Trash2 className={`w-4 h-4 ${purging ? "animate-pulse text-red-400" : ""}`} />
              <span className="hidden sm:inline">{purging ? "CLEARING…" : purgeArmed ? "SURE?" : "CLEAR CACHE"}</span>
              {/*
                The short form still has to show the armed state: "SURE?" is a
                confirmation, and a phone that shows only a bin icon would let the
                destructive second press happen without ever asking the question.
              */}
              <span className="sm:hidden">{purging ? "…" : purgeArmed ? "SURE?" : "CACHE"}</span>
            </button>
            <button
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                soundEffects.enabled = next;
              }}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800"
              title="Toggle console + game audio"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
          </div>
        </div>

        {/*
          The blunt tool's own explanation. It is the only place that says how many
          files went, so it stays on screen until the tutor dismisses it or reloads.
        */}
        {(purgeArmed || purgeNote) && (
          <div
            className={`mt-2 rounded-xl border px-3 py-2 text-[11px] font-mono leading-relaxed ${
              purgeArmed
                ? "border-red-400/60 bg-red-500/10 text-red-100"
                : "border-slate-700 bg-slate-900/80 text-slate-300"
            }`}
          >
            {purgeArmed ? (
              <p>
                <strong className="text-red-200">Press CLEAR CACHE again</strong> to delete every cached Unity build for
                every game in this browser. Each game downloads itself again the next time it is played.
              </p>
            ) : (
              <p>{purgeNote}</p>
            )}
            {purgeLines.length > 0 && (
              <ul className="mt-1.5 space-y-0.5 text-slate-400">
                {purgeLines.slice(0, 12).map((line) => (
                  <li key={line}>• {line}</li>
                ))}
                {purgeLines.length > 12 && <li>…and {purgeLines.length - 12} more</li>}
              </ul>
            )}
            {/*
              Offered only while the names are on screen: this is a decision, not a
              cleanup step, and it should be made looking at what it will delete.
            */}
            {unclaimedKeys.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  onClick={clearUnclaimed}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/60 text-amber-100"
                  title={`Delete ${unclaimedKeys.join(", ")} — keys no app claims, which is where progress written before the console tracked game writes can hide`}
                >
                  <Trash2 className="w-3 h-3" />
                  Clear {unclaimedKeys.length} key{unclaimedKeys.length === 1 ? "" : "s"} nothing accounts for
                </button>
                <span className="text-slate-500">safe to skip — only these are not claimed by the console or the dashboard</span>
              </div>
            )}
            {purgeNote && !purging && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200"
                  title="Reload the console so the cleared file server takes effect"
                >
                  <RotateCw className="w-3 h-3" /> Reload now
                </button>
                <button
                  onClick={() => {
                    setPurgeNote(null);
                    setPurgeLines([]);
                  }}
                  className="text-slate-500 hover:text-slate-300 underline"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 w-full px-4 sm:px-6 py-8 space-y-12">
        {/* Stage */}
        <section ref={stageRef} className="space-y-5 scroll-mt-20">
          <div className="flex flex-wrap items-start justify-between gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800/80">
            <div className="flex gap-4 min-w-0">
              <img
                src={activeGame.thumbnailUrl}
                alt=""
                className="w-20 h-20 rounded-2xl object-cover border border-slate-700 shrink-0 hidden sm:block"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    {activeGame.genre}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                      activeGame.source === "youtube"
                        ? "bg-red-500/10 text-red-300 border-red-500/30"
                        : activeGame.source === "local"
                        ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                        : isPlatformSource(activeGame.source)
                        ? "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30"
                        : "bg-slate-500/10 text-slate-300 border-slate-500/30"
                    }`}
                  >
                    {activeGame.source === "youtube"
                      ? "YOUTUBE PLAYABLE"
                      : activeGame.source === "local"
                      ? "LOCAL UNITY BUILD"
                      : isPlatformSource(activeGame.source)
                      ? `${PLATFORM_SOURCES.find((s) => s.id === activeGame.source)?.name?.toUpperCase() || "PLATFORM"} GAME`
                      : "EXTERNAL URL"}
                  </span>
                  {activeGame.plays && <span className="text-[11px] text-slate-400 font-mono">{activeGame.plays}</span>}
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide truncate">{activeGame.title}</h2>
                <p className="text-xs text-slate-400 max-w-2xl mt-1 leading-relaxed line-clamp-2">{activeGame.description}</p>
                <p className="text-[11px] text-slate-500 font-mono mt-1 truncate">
                  {activeGame.developer && <>by {activeGame.developer} • </>}
                  {activeGame.publisher && activeGame.publisher !== activeGame.developer && <>{activeGame.publisher} • </>}
                  id {activeGame.id}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Live</span>
                <span className="text-xl font-black text-white font-mono">{liveScore !== null ? liveScore.toLocaleString() : "—"}</span>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Your best</span>
                <span className="text-xl font-black text-cyan-400 font-mono">{userBestScore > 0 ? userBestScore.toLocaleString() : "—"}</span>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Rank</span>
                <span className="text-xl font-black text-amber-400 font-mono">{userRank ? `#${userRank}` : "#—"}</span>
              </div>
            </div>
          </div>

          <GamingEnvironment
            activeRig={activeRig}
            onChangeRig={setActiveRig}
            ambientRgb={ambientRgb}
            onToggleAmbientRgb={() => setAmbientRgb(!ambientRgb)}
            scanlines={scanlines}
            onToggleScanlines={() => setScanlines(!scanlines)}
            gameTitle={activeGame.title}
          >
            <PlayableStage
              key={activeGame.id}
              game={activeGame}
              soundEnabled={soundEnabled}
              onToggleSound={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                soundEffects.enabled = next;
              }}
              onScoreReported={handleScoreReported}
              stopSignal={stageStopSignal}
            />
          </GamingEnvironment>
        </section>

        {/* Leaderboard + telemetry */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <LeaderboardView
              entries={leaderboardEntries}
              playerName={playerName}
              userBestScore={userBestScore}
              userRank={userRank}
              onSelectEntry={selectBoardRow}
              picker={
                <PlayerPicker
                  roster={roster}
                  contacts={contacts}
                  contactsState={contactsState}
                  onRenameActive={renameActivePlayer}
                  onPick={pickPlayer}
                  onRemove={forgetPlayer}
                  showPractice={showPractice}
                  onTogglePractice={setShowPractice}
                  onStats={setStatsPlayer}
                />
              }
            />
          </div>

          <div className="space-y-6">
            <PartyPanel
              party={party}
              contacts={contacts}
              profile={partyProfile}
              activeGameId={activeGame.id}
              initialCode={inviteCode}
              onHost={startRoom}
              onJoin={joinRoom}
              onLeave={leaveRoom}
              onProfileChange={changePartyProfile}
              onOpenProjector={() => setProjectorOpen(true)}
              onAddOfflineResult={addOfflineResult}
              shareable={shareableRef.current}
            />

            {/* Recent records */}
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-800">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Your recent records</h3>
              </div>
              {recentScores.length === 0 ? (
                <p className="text-[11px] text-slate-500 font-mono">No scores yet — play something!</p>
              ) : (
                <div className="space-y-1.5">
                  {recentScores.map((s, i) => {
                    const g = allGames.find((x) => x.id === s.gameId);
                    // The no-network handshake, on the learner's own screen: this is
                    // the code they read out to the tutor when a room cannot open.
                    const resultCode = formatResultCode(encodeResult(s.gameId, s.score));
                    return (
                      <div key={`${s.gameId}-${i}`} className="flex items-center gap-2 hover:bg-slate-800/60 rounded-lg px-2 py-1">
                        <button
                          onClick={() => g && selectGame(g)}
                          className="flex-1 flex items-center justify-between text-left text-[11px] font-mono min-w-0"
                          title={g ? `Put "${g.title}" on the console` : undefined}
                        >
                          <span className="text-slate-300 truncate">{g?.title || s.gameId}</span>
                          <span className="text-amber-300 font-bold shrink-0 ml-2">{s.score.toLocaleString()}</span>
                        </button>
                        <button
                          onClick={() => {
                            try {
                              void navigator.clipboard.writeText(resultCode);
                            } catch {}
                            showToast(`Result code ${resultCode} copied — the tutor types it in`);
                          }}
                          className="shrink-0 px-2 py-0.5 rounded border border-slate-700 bg-slate-950 text-[10px] font-mono text-cyan-300 hover:border-cyan-500/60"
                          title="Copy this as a result code, for when there is no room"
                        >
                          {resultCode}
                        </button>
                      </div>
                    );
                  })}
                  <p className="pt-1.5 text-[10px] font-mono text-slate-600 leading-relaxed">
                    The code beside a score is how it travels without a network — the tutor types it into NO NETWORK?
                    COMPARE BY CODE.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Catalog */}
        <section className="space-y-6 pt-4 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-black text-white tracking-wide">Games</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {filteredGames.length.toLocaleString()} / {allGames.length.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Every game crawled from youtube.com/playables — click any card and the console streams its real Unity build.
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 px-4 py-2 rounded-xl text-xs font-mono border border-cyan-500/30"
            >
              <FolderOpen className="w-4 h-4" /> Open local Unity folder / URL
            </button>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search title, developer, publisher, description or paste a Playable ID…"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value as typeof selectedSource)}
                className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
              >
                <option value="all">All sources</option>
                <option value="youtube">Playables ({YOUTUBE_CATALOG.length.toLocaleString()})</option>
                {PLATFORM_SOURCES.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name} ({source.count.toLocaleString()})
                  </option>
                ))}
                <option value="mine">My loaded games</option>
              </select>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                >
                  <option value="popular">Most played</option>
                  <option value="newest">Newest</option>
                  <option value="title">Title A–Z</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => {
                  setShowFavoritesOnly((v) => !v);
                  soundEffects.playClick();
                }}
                className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition flex items-center gap-1.5 ${
                  showFavoritesOnly
                    ? "bg-amber-400 text-slate-950 font-bold shadow-sm shadow-amber-400/30"
                    : "bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800"
                }`}
                title="Show only the games you starred"
              >
                <Star className={`w-3.5 h-3.5 ${showFavoritesOnly ? "fill-current" : ""}`} />
                Favorites
                {favorites.length > 0 && <span className="font-mono text-[10px] opacity-80">{favorites.length}</span>}
              </button>
              <span className="w-px h-5 bg-slate-800 shrink-0" />
              <span className="text-slate-500 font-mono uppercase text-[10px] shrink-0 mr-1">Genre:</span>
              {GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGenre(g)}
                  className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition ${
                    selectedGenre === g
                      ? "bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/30"
                      : "bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredGames.slice(0, visibleCount).map((g) => {
              const isCurrent = activeGame.id === g.id;
              const isFavorite = favorites.includes(g.id);
              return (
                <div
                  key={g.id}
                  className={`group relative bg-slate-900/80 rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col ${
                    isCurrent
                      ? "border-cyan-400/80 shadow-[0_0_30px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/50"
                      : "border-slate-800 hover:border-slate-600 hover:shadow-xl"
                  }`}
                >
                  <button onClick={() => selectGame(g)} className="relative aspect-square w-full overflow-hidden bg-slate-950 text-left">
                    <img
                      src={g.thumbnailUrl}
                      alt={g.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
                    {g.plays && (
                      <span className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur px-2 py-0.5 rounded-full text-[10px] font-mono text-slate-200 border border-slate-700">
                        {g.plays}
                      </span>
                    )}
                    {g.source !== "youtube" && (
                      <span
                        className={`absolute top-2 right-2 text-white px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          g.source === "local" ? "bg-purple-600" : isPlatformSource(g.source) ? "bg-fuchsia-600" : "bg-purple-600"
                        }`}
                      >
                        {g.source === "local"
                          ? "LOCAL"
                          : isPlatformSource(g.source)
                            ? String(g.source).toUpperCase()
                            : "URL"}
                      </span>
                    )}
                    {isCurrent && (
                      <span className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-cyan-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" /> ON CONSOLE
                      </span>
                    )}
                    {!isCurrent && (
                      <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <span className="w-12 h-12 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-xl">
                          <Play className="w-5 h-5 fill-current" />
                        </span>
                      </span>
                    )}
                  </button>
                  <div className="p-3 flex-1 flex flex-col">
                    <div className="text-[10px] text-cyan-400/80 font-mono mb-0.5 truncate">{g.genre}</div>
                    <h4 className="font-bold text-white text-xs leading-snug line-clamp-2 group-hover:text-cyan-300 transition">{g.title}</h4>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{g.developer || g.publisher || "—"}</p>
                    <div className="mt-auto pt-2 flex items-center gap-1.5">
                      <button
                        onClick={() => selectGame(g)}
                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-black flex items-center justify-center gap-1 ${
                          isCurrent ? "bg-cyan-500 text-slate-950" : "bg-slate-800 hover:bg-cyan-600 hover:text-slate-950 text-white"
                        }`}
                      >
                        <Play className="w-3 h-3 fill-current" /> {isCurrent ? "PLAYING" : "PLAY"}
                      </button>
                      <button
                        onClick={() => toggleFavorite(g)}
                        className={`p-1.5 rounded-lg border ${
                          isFavorite
                            ? "bg-amber-400/20 border-amber-400/60 text-amber-300"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                        }`}
                        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Star className={`w-3 h-3 ${isFavorite ? "fill-current" : ""}`} />
                      </button>
                      {g.youtubeUrl && (
                        <a
                          href={g.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
                          title="Open on YouTube"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {visibleCount < filteredGames.length && (
            <div className="text-center">
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 rounded-xl text-xs font-mono"
              >
                Show more ({(filteredGames.length - visibleCount).toLocaleString()} remaining)
              </button>
            </div>
          )}

          {filteredGames.length === 0 && (
            <div className="py-16 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
              <Sparkles className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h4 className="text-base font-bold text-white mb-1">Nothing matched</h4>
              <p className="text-xs text-slate-400 mb-4">
                If you pasted a Playables URL, open it via “Open Unity Game” — the console indexes it on the fly.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedGenre("All");
                  setSelectedSource("all");
                  setShowFavoritesOnly(false);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono rounded-xl border border-slate-700"
              >
                Reset filters
              </button>
            </div>
          )}
        </section>
      </main>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 border border-cyan-500/50 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-mono font-bold text-cyan-300">{toast}</span>
        </div>
      )}

      <LoadUnityGameModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onGameLoaded={handleGameLoaded} />

      {/* The class-facing scoreboard. Practice rivals are left off it on purpose. */}
      {projectorOpen && (
        <ProjectorBoard
          entries={leaderboardEntries}
          gameTitle={activeGame.title}
          roomCode={party.code}
          roomLink={party.status === "live" && party.role === "host" ? party.link : null}
          roomLive={party.status === "live"}
          shareable={shareableRef.current}
          roomNote={
            party.status === "error"
              ? party.error
              : party.status === "live" && party.role === "guest"
              ? "You are a guest in this room — the host's screen leads."
              : "No room is open. Open one from SCORE ROOM, or collect results with the code panel below it."
          }
          onClose={() => setProjectorOpen(false)}
        />
      )}

      {/* One saved player's record: games, bests, trend and time spent. */}
      {statsPlayer && (
        <PlayerStatsPanel
          player={statsPlayer}
          titleFor={(id) => allGames.find((g) => g.id === id)?.title || id}
          onPlayGame={playGameById}
          onClose={() => setStatsPlayer(null)}
        />
      )}
    </div>
  );
}
