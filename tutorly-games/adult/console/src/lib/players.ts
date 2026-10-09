/**
 * The console's player roster.
 *
 * Before this, your name was one string in `tutorly:gamertag` — type over it and
 * the record was gone, and the board could only ever hold one real row. The tutor
 * asked to be able to *come back* to a learner ("click a button to select the same
 * user and continue their record"), so a name is now a small player record, and
 * every score is filed against the record that earned it.
 *
 *   `tutorly:console:players:v1`
 *     { players: [{ id, name, avatar, source, createdAt, lastPlayedAt }], activeId }
 *
 * `id` is stable and namespaced by where the player came from:
 *   · `adult:<learnerId>` / `kids:<learnerId>` — picked from a dashboard, so the
 *     player keeps their real learner identity (and their face) between sessions;
 *   · `guest:<peerId>` — joined this room over PeerJS;
 *   · `local:<slug>` — a name typed straight into the box.
 *
 * Nothing here talks to the network and nothing here is destructive: switching
 * player never deletes a record, and an unreadable roster is treated as empty.
 */

import { searchContacts, type Contact, type ContactSource } from "./contacts";

export interface ConsolePlayer {
  id: string;
  name: string;
  /** Emoji or data/https URL. */
  avatar: string;
  source: ContactSource;
  createdAt: string;
  lastPlayedAt?: string;
}

export interface Roster {
  players: ConsolePlayer[];
  activeId: string | null;
}

const ROSTER_KEY = "tutorly:console:players:v1";
/** The pre-roster key, still written by older builds. Read once, then left alone. */
const LEGACY_NAME_KEY = "tutorly:gamertag";
const AVATAR_FALLBACK = "⚡";

export const emptyRoster: Roster = { players: [], activeId: null };

/** `"Ana Müller"` → `"ana-muller"`, so the same typed name always means one player. */
export function localPlayerId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `local:${slug || "player"}`;
}

export function loadRoster(): Roster {
  try {
    const raw = window.localStorage.getItem(ROSTER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Roster>;
      const players = Array.isArray(parsed?.players)
        ? parsed.players.filter(
            (p): p is ConsolePlayer => !!p && typeof p.name === "string" && typeof p.id === "string"
          )
        : [];
      const activeId = typeof parsed?.activeId === "string" ? parsed.activeId : null;
      if (players.length) return { players, activeId };
      if (activeId === null && players.length === 0) return { players: [], activeId: null };
    }
  } catch {
    /* corrupt roster — fall through to the migration path below */
  }

  // First run: adopt whatever the old gamertag key already held, so the tutor's
  // current name (and its scores, which are matched by name) stays put.
  try {
    const legacy = window.localStorage.getItem(LEGACY_NAME_KEY);
    if (legacy && legacy.trim()) {
      const player = makePlayer({ name: legacy.trim(), source: "console" });
      return { players: [player], activeId: player.id };
    }
  } catch {
    /* nothing to migrate */
  }
  return { players: [], activeId: null };
}

export function saveRoster(roster: Roster): void {
  try {
    window.localStorage.setItem(ROSTER_KEY, JSON.stringify(roster));
  } catch {
    /* quota/private mode — the roster is a convenience, never a blocker */
  }
  // Keep the legacy key in step so anything still reading it sees the right name.
  const active = activePlayer(roster);
  if (active) {
    try {
      window.localStorage.setItem(LEGACY_NAME_KEY, active.name);
    } catch {
      /* ignore */
    }
  }
}

export function makePlayer(input: {
  name: string;
  avatar?: string;
  source?: ContactSource;
  id?: string;
}): ConsolePlayer {
  const name = input.name.trim() || "Player1";
  return {
    id: input.id || localPlayerId(name),
    name,
    avatar: input.avatar || AVATAR_FALLBACK,
    source: input.source || "console",
    createdAt: new Date().toISOString(),
  };
}

export function activePlayer(roster: Roster): ConsolePlayer | null {
  if (!roster.activeId) return roster.players[0] ?? null;
  return roster.players.find((p) => p.id === roster.activeId) ?? roster.players[0] ?? null;
}

export function findPlayer(roster: Roster, id: string | null | undefined): ConsolePlayer | null {
  if (!id) return null;
  return roster.players.find((p) => p.id === id) ?? null;
}

/**
 * Add a player if they are new, refresh their name/avatar if they are not, and
 * return both the new roster and the player — callers need the resolved record
 * (it carries the id the scores are filed under).
 */
export function upsertPlayer(
  roster: Roster,
  input: { name: string; avatar?: string; source?: ContactSource; id?: string; makeActive?: boolean }
): { roster: Roster; player: ConsolePlayer } {
  const candidate = makePlayer(input);
  const existing = roster.players.find((p) => p.id === candidate.id);
  const player: ConsolePlayer = existing
    ? {
        ...existing,
        name: candidate.name,
        avatar: input.avatar || existing.avatar,
        source: input.source || existing.source,
      }
    : candidate;

  const players = existing
    ? roster.players.map((p) => (p.id === player.id ? player : p))
    : [...roster.players, player];

  return {
    roster: { players, activeId: input.makeActive === false ? roster.activeId : player.id },
    player,
  };
}

export function removePlayer(roster: Roster, id: string): Roster {
  const players = roster.players.filter((p) => p.id !== id);
  const activeId = roster.activeId === id ? players[0]?.id ?? null : roster.activeId;
  return { players, activeId };
}

export function setActivePlayer(roster: Roster, id: string): Roster {
  return { ...roster, activeId: id };
}

/** Stamp a play so the picker can show most-recent first. */
export function touchPlayer(roster: Roster, id: string): Roster {
  return {
    ...roster,
    players: roster.players.map((p) =>
      p.id === id ? { ...p, lastPlayedAt: new Date().toISOString() } : p
    ),
  };
}

/** Most recently played first, then newest added — the order the picker shows. */
export function rosterByRecency(roster: Roster): ConsolePlayer[] {
  return [...roster.players].sort((a, b) => {
    const at = a.lastPlayedAt || a.createdAt;
    const bt = b.lastPlayedAt || b.createdAt;
    return bt.localeCompare(at);
  });
}

/**
 * Suggest names for the box: the tutor's own saved players first (they are one
 * click away from continuing a record), then anyone typed so far this session,
 * then the dashboard learners. Duplicates are dropped by id.
 */
export function suggestFor(query: string, roster: Roster, contacts: Contact[], limit = 6): Contact[] {
  const saved: Contact[] = searchContacts(
    roster.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, source: p.source })),
    query,
    limit
  );
  const fromDashboards = searchContacts(contacts, query, limit);
  const seen = new Set(saved.map((c) => c.id));
  return [...saved, ...fromDashboards.filter((c) => !seen.has(c.id))].slice(0, limit);
}
