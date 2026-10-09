/**
 * VIP CLOUD BACKUP — client side.
 *
 * Manual by design ("Upload to cloud" / "Download from cloud" buttons, plus the
 * bottom-right save prompt when the tutor chose Cloud as their backup target).
 * Nothing is ever pushed in the background, so a shared cPanel host sees one
 * request per explicit save.
 *
 * What travels: the business data a tutor cannot recreate — learners and their
 * session/feedback records, group classes, schedules, todos, automations,
 * bookings/payments, coursebooks, the young-learner kingdom and the tutor's
 * settings. Generated lesson HTML is deliberately NOT included; it lives on the
 * tutor's hard disk (it is text-heavy and would be the only thing capable of
 * bloating the server).
 *
 * What specifically does NOT travel: any inlined image. Avatars, whiteboard
 * snapshots, kid artwork, a custom classroom background — every `data:` URL is
 * blanked out before the payload is compressed (see `deepStripInlinedMedia`). At
 * one tutor with a hundred learners those bytes would be the entire backup, they
 * are the only part that can realistically breach the cap, and they are the one
 * part the tutor still has on their own disk. A hundred tutors each storing
 * pictures would be the difference between a few megabytes and a few gigabytes on
 * a shared host.
 *
 * Wire format: gzip(json) → base64, so the 50 MB cap on the server is generous.
 */
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { useLearnerStore, dehydrateLearners } from '../store/useLearnerStore';
import { useTodoStore } from '../store/useTodoStore';
import { useCalendarStore } from '../store/useCalendarStore';
import { useBookingStore } from '../store/useBookingStore';
import { useAutomationStore } from '../store/useAutomationStore';
import { useCoursebookStore } from '../store/useCoursebookStore';
import { applyClassroomSettings, applyKidsState, applyWorkspaceToStores } from '../utils/diskStorage';
import { deepStripInlinedMedia, type MediaStripStats } from '../utils/mediaStrip';
import { getAuthEndpoint } from './tutorAuthService';

/** Must match CLOUD_MAX_PAYLOAD_BYTES in public/auth.php. */
export const CLOUD_MAX_PAYLOAD_BYTES = 50 * 1024 * 1024;

export interface CloudSectionStat {
  section: string;
  count: number;
  bytes: number;
}

export interface CloudBackupInfo {
  success: boolean;
  exists: boolean;
  bytes: number;
  rawBytes: number;
  revision: number;
  updatedAt: string;
  device: string;
  sections: CloudSectionStat[];
  maxBytes: number;
  vipRequired?: boolean;
  error?: string;
}

export interface CloudSaveResult {
  success: boolean;
  revision?: number;
  bytes?: number;
  rawBytes?: number;
  savedAt?: string;
  error?: string;
  tooBig?: boolean;
  /** Inlined images that were left on the tutor's disk instead of being uploaded. */
  strippedCount?: number;
  strippedBytes?: number;
}

export interface CloudPayload {
  version: number;
  at: string;
  device: string;
  learners: any[];
  workspace: any;
  classroom: any;
  kidsState: any;
  kidsSettings: any;
  /** What the strip pass removed, so the status panel can say where the images went. */
  media?: { stripped: number; strippedBytes: number };
}

const CLOUD_PAYLOAD_VERSION = 1;

/* ── base64 / gzip helpers (no dependencies) ─────────────────────────────── */

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

async function gzipBytes(input: Uint8Array): Promise<Uint8Array | null> {
  try {
    if (typeof CompressionStream === 'undefined') return null;
    const stream = new Blob([input as BlobPart]).stream().pipeThrough(new CompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

async function gunzipBytes(input: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot decompress the cloud backup (DecompressionStream is unavailable).');
  }
  const stream = new Blob([input as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/* ── payload building ────────────────────────────────────────────────────── */

/** Device label so a tutor can see which computer wrote the cloud copy. */
export function currentDeviceLabel(): string {
  try {
    const ua = navigator.userAgent || '';
    const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    const platform = /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : 'Device';
    return `${browser} on ${platform}`;
  } catch {
    return 'Browser';
  }
}

/**
 * IndexedDB can be large, but a tutor's own uploaded profile photo is stored as a
 * data URL on the learner. Those bytes are exactly what would balloon the server
 * copy, and they are not needed to rebuild a profile (the avatar can be re-picked),
 * so the cloud payload keeps the avatar ID and drops the inlined image bytes.
 */
function stripInlineAvatars<T extends Record<string, any>>(learner: T): T {
  const clone: any = { ...learner };
  for (const key of ['avatar', 'avatarUrl', 'photo', 'photoUrl'] as const) {
    const value = clone[key];
    if (typeof value === 'string' && value.startsWith('data:') && value.length > 2048) {
      delete clone[key];
    }
  }
  return clone;
}

function serializable<T>(value: T): T | null {
  try { return JSON.parse(JSON.stringify(value)); } catch { return null; }
}

/** Collects the whole core workspace into one compact payload. */
export async function buildCloudPayload(): Promise<CloudPayload> {
  const learnersState = useLearnerStore.getState();
  const appState = useAppStore.getState();
  const learners = dehydrateLearners(learnersState.learners || []).map(stripInlineAvatars);

  const payload: CloudPayload = {
    version: CLOUD_PAYLOAD_VERSION,
    at: new Date().toISOString(),
    device: currentDeviceLabel(),
    learners: serializable(learners) || [],
    workspace: {
      version: CLOUD_PAYLOAD_VERSION,
      groupClasses: serializable(learnersState.groupClasses || []) || [],
      tutorInfo: serializable(appState.tutorInfo || {}) || {},
      appState: serializable(appState) || {},
      todos: serializable(useTodoStore.getState().todos || []) || [],
      calendar: serializable(useCalendarStore.getState()) || {},
      booking: serializable(useBookingStore.getState()) || {},
      automation: serializable(useAutomationStore.getState()) || {},
      coursebooks: serializable(useCoursebookStore.getState()) || {},
      platforms: (() => { try { return JSON.parse(localStorage.getItem('tutor-crafter-platforms') || '[]'); } catch { return []; } })(),
    },
    classroom: {
      shortcuts: safeLocal('classroom-shortcuts', []),
      background: safeLocal('classroom-bg', null),
      timeOffset: safeLocal('classroom-time-offset', 0),
      // Default agrees with the classroom screen's own fallback (`light`), so a
      // backup taken before anyone touched the theme does not restore a user into
      // dark mode they never asked for.
      theme: safeLocal('classroom-theme', 'light'),
      mapCities: safeLocal('classroom-map-cities', []),
      soundBoardPads: safeLocal('classroom-sound-board-pads', null),
      soundBoardVolume: safeLocal('classroom-sound-board-volume', null),
      zenMode: safeLocal('classroom-zen-mode', false),
      animateBg: safeLocal('classroom-bg-animate', false),
      weatherCity: (() => { try { return localStorage.getItem('classroom-weather-city') || ''; } catch { return ''; } })(),
      tutorlyPremium: (() => { try { return localStorage.getItem('tutorly_premium') === 'true'; } catch { return false; } })(),
      tutorlyVip: (() => { try { return localStorage.getItem('tutorly_vip') === 'true'; } catch { return false; } })(),
    },
    kidsState: serializable(await readKidsStateForCloud()) || null,
    kidsSettings: serializable(await readKidsSettingsForCloud()) || null,
  };

  /*
   * One strip pass over the finished payload, immediately before it is compressed.
   *
   * Doing it here rather than inside each collector means it cannot be forgotten by the
   * next thing anybody adds to the payload: whatever the shape, image bytes do not
   * travel. The count and the size are recorded in the payload so the status panel can
   * explain the difference between what is on the disk and what is on the server.
   */
  const stats: MediaStripStats = { count: 0, bytes: 0 };
  const stripped = deepStripInlinedMedia(payload, stats);
  return { ...stripped, media: { stripped: stats.count, strippedBytes: stats.bytes } };
}

function safeLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function readKidsStateForCloud(): Promise<any | null> {
  try {
    const idb = await import('idb-keyval');
    const raw = await idb.get('kids_learning_kingdom_v2');
    if (raw !== undefined && raw !== null) {
      if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch { /* fall through to the legacy key */ }
      } else {
        return raw;
      }
    }
    return safeLocal<any>('kids_learning_kingdom_v2', null);
  } catch {
    return safeLocal<any>('kids_learning_kingdom_v2', null);
  }
}

async function readKidsSettingsForCloud(): Promise<any | null> {
  try {
    const idb = await import('idb-keyval');
    const combat = await idb.get('combat_arena_storybook_v1');
    return {
      combat_arena_storybook_v1: combat === undefined ? undefined : (typeof combat === 'string' ? JSON.parse(combat) : combat),
      customTeacherStamps: safeLocal<any[]>('kids_custom_teacher_stamps', []),
    };
  } catch {
    return null;
  }
}

/** Per-section counts/sizes for the tiny cloud index table + status panel. */
export function computeSectionStats(payload: CloudPayload): CloudSectionStat[] {
  const sizeOf = (value: any): number => {
    try { return JSON.stringify(value ?? null).length; } catch { return 0; }
  };
  const ws = payload.workspace || {};
  const learners = payload.learners || [];
  const sessions = learners.reduce((sum: number, l: any) => sum + (Array.isArray(l?.sessions) ? l.sessions.length : 0), 0);
  const kidsLearners = Array.isArray(payload.kidsState?.learners) ? payload.kidsState.learners.length : 0;
  return [
    { section: 'learners', count: learners.length, bytes: sizeOf(learners) },
    { section: 'sessions', count: sessions, bytes: sizeOf(learners.map((l: any) => l?.sessions || [])) },
    { section: 'calendar', count: Array.isArray(ws.calendar?.calendarEvents) ? ws.calendar.calendarEvents.length : 0, bytes: sizeOf(ws.calendar) },
    { section: 'todos', count: Array.isArray(ws.todos) ? ws.todos.length : 0, bytes: sizeOf(ws.todos) },
    { section: 'automations', count: Array.isArray(ws.automation?.homeworkAssignments) ? ws.automation.homeworkAssignments.length : 0, bytes: sizeOf(ws.automation) },
    { section: 'bookings', count: Array.isArray(ws.booking?.packages) ? ws.booking.packages.length : 0, bytes: sizeOf(ws.booking) },
    { section: 'coursebooks', count: Array.isArray(ws.coursebooks?.coursebooks) ? ws.coursebooks.coursebooks.length : 0, bytes: sizeOf(ws.coursebooks) },
    { section: 'groups', count: Array.isArray(ws.groupClasses) ? ws.groupClasses.length : 0, bytes: sizeOf(ws.groupClasses) },
    { section: 'tutor', count: Object.keys(ws.tutorInfo || {}).length, bytes: sizeOf(ws.tutorInfo) },
    { section: 'settings', count: Object.keys(ws.appState || {}).length, bytes: sizeOf(ws.appState) + sizeOf(payload.classroom) },
    { section: 'kids', count: kidsLearners, bytes: sizeOf(payload.kidsState) + sizeOf(payload.kidsSettings) },
    /*
     * Not a section of the backup — the opposite. It records how many inlined images
     * were stripped and how many bytes that kept off the server, so a tutor looking at
     * their storage sees why the cloud copy is smaller than the disk copy instead of
     * wondering whether something went wrong.
     */
    { section: 'images kept on your disk', count: payload.media?.stripped ?? 0, bytes: payload.media?.strippedBytes ?? 0 },
  ];
}

/* ── auth / tier ─────────────────────────────────────────────────────────── */

function cloudCredentials(): { email: string; token: string } | null {
  const auth = useAuthStore.getState();
  const email = auth.tutor?.email || '';
  const token = auth.token || '';
  if (!email || !token) return null;
  return { email: email.toLowerCase(), token };
}

export function isVipTier(): boolean {
  const auth = useAuthStore.getState();
  const email = (auth.tutor?.email || '').toLowerCase();
  const role = auth.tutor?.role || '';
  return auth.tier === 'vip' || role === 'admin' || email === 'info.tutomy@gmail.com';
}

/** True when cloud saving is switched on in General settings (VIP only). */
export function isCloudBackupTarget(): boolean {
  const info: any = useAppStore.getState().tutorInfo || {};
  return info.backupTarget === 'cloud';
}

/** Current backup target; defaults to the hard disk. */
export function getBackupTarget(): 'disk' | 'cloud' {
  const info: any = useAppStore.getState().tutorInfo || {};
  return info.backupTarget === 'cloud' ? 'cloud' : 'disk';
}

/** True when the tutor has already been asked where to back up (ask once). */
export function hasChosenBackupTarget(): boolean {
  const info: any = useAppStore.getState().tutorInfo || {};
  return info.backupTarget === 'disk' || info.backupTarget === 'cloud';
}

/* ── requests ────────────────────────────────────────────────────────────── */

/**
 * Turn a raw fetch rejection into something a tutor (or the admin) can act on.
 *
 * A bare `TypeError: Failed to fetch` is what the browser throws when the request
 * never reached the server at all — offline, DNS/TLS failure, CORS, or the page
 * running inside a sandboxed frame. None of that is the tutor's data, so it is
 * stated plainly. Deliberately says nothing about the host, the database or any
 * credential: those live in server config, never in a user-facing message.
 */
function describeCloudNetworkError(err: any): string {
  const name = String(err?.name || '');
  const message = String(err?.message || err || '');
  if (name === 'AbortError') return 'The request was cancelled before it finished. Nothing was changed.';
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(message)) {
    return 'Could not reach the backup server — the request never left this browser. Check your internet connection, open the app in a normal browser tab (not an embedded frame), and make sure no ad-blocker or firewall is blocking the site. Nothing was uploaded or changed.';
  }
  if (/timeout|timed out/i.test(message)) {
    return 'The backup server took too long to answer. Try again — or, on a slow connection, save a smaller backup.';
  }
  return `The request to the backup server could not be completed (${message || 'unknown network error'}). Nothing was changed.`;
}

async function postCloud(action: string, body: Record<string, any>): Promise<any> {
  const creds = cloudCredentials();
  if (!creds) throw new Error('Please sign in before using cloud saving.');
  let res: Response;
  try {
    res = await fetch(`${getAuthEndpoint()}?action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, email: creds.email, token: creds.token }),
    });
  } catch (err: any) {
    throw new Error(describeCloudNetworkError(err));
  }
  if (res.status === 404 || res.status === 405) {
    throw new Error("This host is still running an older auth.php without cloud saving. Upload the new public/auth.php from your build (dist/auth.php) and try again.");
  }
  if (res.status === 413) {
    throw new Error('The server refused the upload as too large (HTTP 413). Raise PHP post_max_size to at least 70M on the host, then try again.');
  }
  if (res.status === 401 || res.status === 403) {
    // The server answered with a real auth error; its own message is returned below
    // when the body parses. If it does not, say what is wrong without leaking why.
    const text = await res.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch { data = null; }
    if (data && data.error) throw new Error(String(data.error));
    throw new Error('The backup server rejected this request as not authorised. Sign out and back in, then try again.');
  }
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { data = null; }
  if (data === null) {
    if (res.status >= 500) {
      throw new Error(`The backup server was reached but failed to answer (HTTP ${res.status}). Check the host's PHP error log, then try again — nothing was changed.`);
    }
    throw new Error(`The server did not return a valid answer (HTTP ${res.status}). If your provider limits upload size, raise PHP post_max_size to at least 70M.`);
  }
  return data;
}

/** Cloud status (small: never reads the payload). */
export async function getCloudBackupInfo(): Promise<CloudBackupInfo> {
  try {
    const data = await postCloud('cloud_info', {});
    return {
      success: !!data.success,
      exists: !!data.exists,
      bytes: Number(data.bytes || 0),
      rawBytes: Number(data.rawBytes || 0),
      revision: Number(data.revision || 0),
      updatedAt: data.updatedAt || '',
      device: data.device || '',
      sections: Array.isArray(data.sections) ? data.sections : [],
      maxBytes: Number(data.maxBytes || CLOUD_MAX_PAYLOAD_BYTES),
      vipRequired: !!data.vipRequired,
      error: data.error,
    };
  } catch (err: any) {
    return {
      success: false, exists: false, bytes: 0, rawBytes: 0, revision: 0, updatedAt: '', device: '',
      sections: [], maxBytes: CLOUD_MAX_PAYLOAD_BYTES, vipRequired: false, error: err?.message || String(err),
    };
  }
}

/** Uploads the current workspace. Manual action only. */
export async function saveToCloud(): Promise<CloudSaveResult> {
  if (!isVipTier()) {
    return { success: false, error: 'Cloud saving is a VIP feature.' };
  }
  try {
    const payload = await buildCloudPayload();
    const json = JSON.stringify(payload);
    const raw = new TextEncoder().encode(json);
    const gz = await gzipBytes(raw);
    const encoding = gz ? 'gzip' : 'identity';
    const stored = gz || raw;
    if (stored.byteLength > CLOUD_MAX_PAYLOAD_BYTES) {
      return {
        success: false,
        tooBig: true,
        error: `This backup is ${(stored.byteLength / 1024 / 1024).toFixed(1)} MB after compression, above the ${(CLOUD_MAX_PAYLOAD_BYTES / 1024 / 1024).toFixed(0)} MB cloud limit. Generated lesson files and inlined images never go to the cloud, so what remains is transcripts and notes — trim the longest session records and try again.`,
      };
    }
    const data = await postCloud('cloud_save', {
      payload: bytesToBase64(stored),
      encoding,
      device: payload.device,
      index: computeSectionStats(payload),
    });
    if (!data.success) return { success: false, error: data.error || 'Cloud save failed.' };
    return {
      success: true,
      revision: Number(data.revision || 0),
      bytes: Number(data.bytes || stored.byteLength),
      rawBytes: Number(data.rawBytes || raw.byteLength),
      savedAt: data.savedAt,
      strippedCount: payload.media?.stripped ?? 0,
      strippedBytes: payload.media?.strippedBytes ?? 0,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export interface CloudRestoreResult {
  success: boolean;
  learners?: number;
  revision?: number;
  updatedAt?: string;
  error?: string;
}

/**
 * Downloads the cloud copy and applies it to the live stores. `replace` mirrors
 * the disk restore's "Restore All" semantics; the default merges by learner id
 * so a cloud pull on a second device never drops browser-only work.
 */
export async function loadFromCloud(options?: { replace?: boolean }): Promise<CloudRestoreResult> {
  if (!isVipTier()) {
    return { success: false, error: 'Cloud saving is a VIP feature.' };
  }
  try {
    const data = await postCloud('cloud_load', {});
    if (!data.success || !data.payload) {
      return { success: false, error: data.error || 'No cloud backup exists for this account yet.' };
    }
    const stored = base64ToBytes(String(data.payload));
    const raw = data.encoding === 'gzip' ? await gunzipBytes(stored) : stored;
    const payload = JSON.parse(new TextDecoder().decode(raw)) as CloudPayload;
    if (!payload || typeof payload !== 'object') {
      return { success: false, error: 'The cloud backup could not be read.' };
    }

    const replace = options?.replace === true;
    const incoming = Array.isArray(payload.learners) ? payload.learners : [];
    if (incoming.length > 0) {
      const store = useLearnerStore.getState();
      const next = replace
        ? incoming
        : Array.from(new Map([
            ...(store.learners || []).map((l: any) => [String(l.id), l] as const),
            ...incoming.map((l: any) => [String(l.id), l] as const),
          ]).values());
      useLearnerStore.setState({ learners: next });
    }
    await applyWorkspaceToStores(payload.workspace || {});
    if (payload.classroom) applyClassroomSettings(payload.classroom);
    await applyKidsState(payload.kidsState, payload.kidsSettings, replace);

    return {
      success: true,
      learners: incoming.length,
      revision: Number(data.revision || 0),
      updatedAt: data.updatedAt || '',
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/** Removes the cloud copy for this account. */
export async function deleteCloudBackup(): Promise<{ success: boolean; error?: string }> {
  try {
    const data = await postCloud('cloud_delete', {});
    return { success: !!data.success, error: data.error };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/** Calls the server once to confirm the cloud tables + VIP access work. */
export async function testCloudConnection(): Promise<{ success: boolean; message: string }> {
  const info = await getCloudBackupInfo();
  if (info.vipRequired) return { success: false, message: 'Cloud saving is a VIP feature — this account is not VIP.' };
  if (!info.success) return { success: false, message: info.error || 'Cloud storage is not reachable.' };
  const size = info.exists ? `${(info.bytes / 1024).toFixed(1)} KB (newest revision ${info.revision})` : 'no backup yet';
  return { success: true, message: `Cloud storage is ready — ${size}.` };
}
