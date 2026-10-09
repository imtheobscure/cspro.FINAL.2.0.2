/**
 * The whole workspace, kept in the browser.
 *
 * Interview used to be a Next.js + PostgreSQL server app: a cookie identified a
 * workspace, and every profile change, answer, session and imported pack was a
 * round trip to a `pg` database. That made it the one game in the set that could
 * not simply live in a folder on a web host.
 *
 * This module is the replacement. It implements the same operations — the same
 * shapes, the same validation and the same error messages the UI already showed —
 * against `localStorage`, so:
 *
 *   · the app builds as a static export and deploys exactly like WordPop or Flix;
 *   · there is nothing to install, no `DATABASE_URL`, no `drizzle-kit push`;
 *   · the learner's work stays on their own device, which is a better answer for
 *     interview answers than a shared server database anyway;
 *   · `workspace-provider.tsx` calls `localApi()` instead of `fetch()`, and every
 *     screen above it is untouched.
 *
 * Trade-off, stated plainly: progress no longer follows the learner between
 * devices or browsers. The Settings → My data screen exports the whole workspace
 * as JSON and the browser's own storage is the only copy — the app says so.
 *
 * Storage layout:
 *   `tutorly.workspace.v1`   the profile, sessions (newest last) and packs
 *   `tutorly-draft-<id>`     unsubmitted answer drafts (written by the room)
 */
import type {
  InterviewAnswer,
  InterviewPack,
  Profile,
  SavedPack,
  Scenario,
  Session,
  Workspace,
} from './types';
import { defaultPreferences } from './types';
import { characters } from './characters';
import { questionBank, scenarioGuides, scenarios } from './curriculum';
import { adaptiveFollowUp, createSessionQuestions, evaluateAnswers } from './interview-engine';

const STORAGE_KEY = 'tutorly.workspace.v1';
const MAX_SESSIONS = 200;
const MAX_PACKS = 50;

/** Raised for anything the UI should show the learner as a message. */
export class LocalApiError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/**
 * A v4-shaped id.
 *
 * `crypto.randomUUID` only exists in a secure context, so there is a fallback
 * path for anything served over plain HTTP on a LAN address. The casts are
 * deliberate: the DOM types here do not include `randomUUID`, and `'x' in obj`
 * narrowing on an optional member is what turned this into a `never`.
 */
function uid(): string {
  const c = globalThis.crypto as (Crypto & { randomUUID?: () => string }) | undefined;
  if (typeof c?.randomUUID === 'function') return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof c?.getRandomValues === 'function') c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function emptyProfile(): Profile {
  return {
    id: uid(),
    name: '',
    role: 'General',
    organization: '',
    facts: '',
    level: 'B1',
    scenario: 'job',
    completedLessons: [],
    bookmarks: [],
    preferences: { ...defaultPreferences },
    createdAt: new Date().toISOString(),
  };
}

function emptyWorkspace(): Workspace {
  return { profile: emptyProfile(), sessions: [], packs: [] };
}

/**
 * Read the workspace, creating it on first visit.
 *
 * A corrupt or half-written value is replaced rather than thrown away silently:
 * the learner gets a working app either way, and nothing here can be recovered
 * from anywhere else, so refusing to start would be worse than starting fresh.
 */
function read(): Workspace {
  if (typeof localStorage === 'undefined') return emptyWorkspace();
  let parsed: Partial<Workspace> | null = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) parsed = JSON.parse(raw) as Partial<Workspace>;
  } catch {
    parsed = null;
  }
  const base = emptyWorkspace();
  if (!parsed || typeof parsed !== 'object') return base;
  const profile = { ...base.profile, ...(parsed.profile ?? {}) } as Profile;
  // Preferences and the array fields are merged defensively: a workspace written
  // by an older build can be missing any of them, and a missing `preferences`
  // would crash the settings dialog on the next render.
  profile.preferences = { ...defaultPreferences, ...(parsed.profile?.preferences ?? {}) };
  profile.completedLessons = Array.isArray(profile.completedLessons) ? profile.completedLessons : [];
  profile.bookmarks = Array.isArray(profile.bookmarks) ? profile.bookmarks : [];
  return {
    profile,
    sessions: Array.isArray(parsed.sessions) ? (parsed.sessions as Session[]) : [],
    packs: Array.isArray(parsed.packs) ? (parsed.packs as SavedPack[]) : [],
  };
}

function write(workspace: Workspace): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  } catch {
    // Quota exhausted (answers are long). The UI's own "we could not save that
    // change" message is the honest outcome, and the learner is told to export.
    throw new LocalApiError(
      'This browser has no room left to save. Export your workspace from Settings → My data, then delete a few older interviews.',
      507,
    );
  }
}

export function resetWorkspaceStorage(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('tutorly-draft-')) localStorage.removeItem(key);
    }
  } catch {
    /* nothing to do — the caller reloads regardless */
  }
}

/** Newest first, capped at the same 200 the old server query limited itself to. */
function sorted(sessions: Session[]): Session[] {
  return [...sessions]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
    .slice(0, MAX_SESSIONS);
}

type Action =
  | { action: 'profile'; data: Partial<Profile> }
  | { action: 'preferences'; data: Profile['preferences'] }
  | { action: 'bookmark'; id: string }
  | { action: 'lesson'; id: number; complete: boolean };

/**
 * The stand-in for `api<T>(url, method, data)` in `workspace-provider.tsx`.
 *
 * Deliberately the same call signature and the same response envelopes the routes
 * returned, so the only change in the UI was the function name. Each branch below
 * mirrors one deleted route file; where a route had a guard (answer order, pack
 * limits, workspace confirmation) the guard is kept verbatim, because those
 * messages are part of how the app explains itself.
 */
export async function localApi<T>(url: string, method = 'GET', data?: unknown): Promise<T> {
  const path = url.split('?')[0];
  const workspace = read();

  if (path === '/api/workspace') {
    if (method === 'GET') {
      return { profile: workspace.profile, sessions: sorted(workspace.sessions), packs: workspace.packs } as T;
    }
    if (method === 'PUT') {
      const action = data as Action;
      const current = workspace.profile;
      let profile = current;
      if (action?.action === 'profile') {
        // Same whitelist the zod schema enforced: a caller cannot smuggle an id
        // or createdAt through this endpoint.
        const d = action.data ?? {};
        profile = {
          ...current,
          name: (d.name ?? current.name).slice(0, 80),
          role: (d.role ?? current.role).slice(0, 120),
          organization: (d.organization ?? current.organization).slice(0, 150),
          facts: (d.facts ?? current.facts).slice(0, 6000),
          level: d.level ?? current.level,
          scenario: d.scenario ?? current.scenario,
        };
      } else if (action?.action === 'preferences') {
        profile = { ...current, preferences: { ...current.preferences, ...action.data } };
      } else if (action?.action === 'bookmark') {
        if (!questionBank.some((q) => q.id === action.id)) throw new LocalApiError('Question not found.', 404);
        profile = {
          ...current,
          bookmarks: current.bookmarks.includes(action.id)
            ? current.bookmarks.filter((id) => id !== action.id)
            : [...current.bookmarks, action.id],
        };
      } else if (action?.action === 'lesson') {
        profile = {
          ...current,
          completedLessons: action.complete
            ? [...new Set([...current.completedLessons, action.id])]
            : current.completedLessons.filter((id) => id !== action.id),
        };
      } else {
        throw new LocalApiError('That change is not something we can save.');
      }
      write({ ...workspace, profile });
      return { profile } as T;
    }
    if (method === 'DELETE') {
      if ((data as { confirmation?: string })?.confirmation !== 'DELETE') {
        throw new LocalApiError('Please confirm that you want to delete your workspace.');
      }
      resetWorkspaceStorage();
      return { deleted: true } as T;
    }
  }

  if (path === '/api/sessions' && method === 'POST') {
    const input = data as { characterId: number; scenario: Scenario; packId?: string };
    if (!Number.isInteger(input?.characterId) || input.characterId < 1 || input.characterId > characters.length) {
      throw new LocalApiError('Please choose one of the 24 interviewers.');
    }
    let pack: InterviewPack | undefined;
    if (input.packId) {
      const stored = workspace.packs.find((p) => p.id === input.packId);
      if (!stored) throw new LocalApiError('Interview pack not found.', 404);
      if (stored.characterId !== input.characterId || stored.scenario !== input.scenario) {
        throw new LocalApiError('The interview pack does not match this character or scenario.');
      }
      pack = stored.content;
    }
    const character = characters[input.characterId - 1];
    const questions = createSessionQuestions(character, workspace.profile, input.scenario, pack);
    const guidance = {
      before: pack?.before || [character.preparation, ...scenarioGuides[input.scenario].before],
      after: pack?.after || [character.reflection, ...scenarioGuides[input.scenario].after],
    };
    const session: Session = {
      id: uid(),
      learnerId: workspace.profile.id,
      characterId: character.id,
      scenario: input.scenario,
      title:
        pack?.title || `${scenarios.find((s) => s.id === input.scenario)?.name} with ${character.name}`,
      status: 'in_progress',
      questions,
      guidance,
      answers: [],
      duration: 0,
      metrics: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    write({ ...workspace, sessions: [...workspace.sessions, session] });
    return { session } as T;
  }

  const sessionMatch = /^\/api\/sessions\/([^/]+)$/.exec(path);
  if (sessionMatch) {
    const id = sessionMatch[1];
    const index = workspace.sessions.findIndex((s) => s.id === id);
    if (index === -1) throw new LocalApiError('Interview session not found.', 404);
    const current = workspace.sessions[index];

    if (method === 'PATCH') {
      const input = data as InterviewAnswer;
      const text = (input?.text ?? '').trim();
      if (!text) throw new LocalApiError('Please write something before continuing.');
      if (text.length > 12000) throw new LocalApiError('That answer is longer than we can save. Please shorten it.');
      if (current.status === 'completed') throw new LocalApiError('This interview is already complete.', 409);

      const previous = current.answers.find((a) => a.questionId === input.questionId);
      if (previous) {
        if (previous.text === text) return { session: current } as T;
        throw new LocalApiError(
          'This answer has already been submitted. Refresh the session to continue.',
          409,
        );
      }
      // The room can only ever be one answer behind: this is what stops a stale
      // tab (or a reopened session) from writing into the middle of a transcript.
      if (current.questions[current.answers.length]?.id !== input.questionId) {
        throw new LocalApiError(
          'The interview has moved to another question. Please reopen it from My progress.',
          409,
        );
      }

      const answerIndex = current.answers.length;
      const questions = [...current.questions];
      if (
        answerIndex === 1 &&
        current.characterId >= 5 &&
        !questions[0].id.startsWith('ai-') &&
        !questions.some((q) => q.id === 'adaptive-follow-up')
      ) {
        questions.splice(answerIndex + 1, 0, adaptiveFollowUp(current.characterId, current.scenario, text));
      }
      const answers = [...current.answers, { questionId: input.questionId, text, seconds: Math.max(0, Math.round(input.seconds || 0)) }];
      const completed = answers.length === questions.length;
      const session: Session = {
        ...current,
        questions,
        answers,
        duration: current.duration + (answers[answers.length - 1].seconds || 0),
        status: completed ? 'completed' : 'in_progress',
        completedAt: completed ? new Date().toISOString() : null,
        metrics: completed ? evaluateAnswers(answers) : null,
      };
      const sessions = [...workspace.sessions];
      sessions[index] = session;
      write({ ...workspace, sessions });
      return { session } as T;
    }

    if (method === 'DELETE') {
      write({ ...workspace, sessions: workspace.sessions.filter((s) => s.id !== id) });
      return { deleted: true } as T;
    }
  }

  if (path === '/api/packs') {
    if (method === 'POST') {
      const content = data as InterviewPack;
      if (workspace.packs.length >= MAX_PACKS) {
        throw new LocalApiError(
          'Your workspace can hold 50 interview packs. Delete an older pack before adding another.',
        );
      }
      const pack: SavedPack = {
        id: uid(),
        title: String(content?.title ?? 'Imported interview').slice(0, 200),
        characterId: content.characterId,
        scenario: content.scenario,
        content,
        createdAt: new Date().toISOString(),
      };
      write({ ...workspace, packs: [pack, ...workspace.packs] });
      return { pack } as T;
    }
    if (method === 'DELETE') {
      const { id } = data as { id: string };
      if (!workspace.packs.some((p) => p.id === id)) throw new LocalApiError('Interview pack not found.', 404);
      write({ ...workspace, packs: workspace.packs.filter((p) => p.id !== id) });
      return { deleted: true } as T;
    }
  }

  throw new LocalApiError('That request could not be completed. Please try again.', 404);
}

/**
 * A read-only peek at the workspace for code that is not inside the provider
 * (the streak/last-session helpers want the same view the provider holds).
 */
export function readWorkspace(): Workspace {
  return { ...read(), sessions: sorted(read().sessions) };
}
