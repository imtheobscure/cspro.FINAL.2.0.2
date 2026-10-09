/**
 * Prove VIP cloud saving works on YOUR host, end to end.
 *
 *   CLOUD_TEST_EMAIL='vip@example.com' CLOUD_TEST_PASSWORD='…' npx tsx tools/cloud-roundtrip.ts
 *
 * It walks the exact path the app walks — strip inlined images, gzip, base64, POST — and then
 * proves the server gave back what it was given:
 *
 *   1. the VIP gate rejects an unauthenticated request
 *   2. login over the real endpoint returns a session token
 *   3. the account is actually VIP (otherwise cloud saving is refused by design)
 *   4. cloud_save accepts the payload and reports a revision
 *   5. cloud_load returns the SAME bytes, same checksum, same sizes
 *   6. cloud_info confirms the revision advanced and the sizes match
 *
 * READ THIS BEFORE RUNNING IT. `cloud_save` is an upsert: it REPLACES that account's backup for
 * good. So use a dedicated test/VIP account, and if the account already has a backup the script
 * stops rather than overwriting it — pass --force to override, and --delete-after to remove the
 * test row at the end (also requires --force, because it deletes whatever was there).
 *
 * Options
 *   --force          overwrite an existing backup on that account
 *   --delete-after   delete the backup row when the run finishes
 *   --keep           (default) leave the test backup in place
 *   --endpoint=URL   override the auth.php URL (default https://cspro.tutomy.com/auth.php)
 */

import { gzipSync, gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { deepStripInlinedMedia } from '../utils/mediaStrip';

const DEFAULT_ENDPOINT = 'https://cspro.tutomy.com/auth.php';

const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(name);
const option = (name: string, fallback: string) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const ENDPOINT = option('endpoint', process.env.AUTH_ENDPOINT || DEFAULT_ENDPOINT);
const EMAIL = (process.env.CLOUD_TEST_EMAIL || '').trim().toLowerCase();
const PASSWORD = process.env.CLOUD_TEST_PASSWORD || '';
const FORCE = flag('--force');
const DELETE_AFTER = flag('--delete-after');

const QUOTA = 50 * 1024 * 1024;
/** The app's own cap: anything this big is treated as inlined image bytes, not data. */
const BIG_IMAGE = 20 * 1024;

let failures = 0;
let step = 0;

const ok = (label: string, detail = '') => console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ''}`);
const bad = (label: string, detail = '') => {
  failures++;
  console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
};
const info = (text: string) => console.log(`     ${text}`);
const heading = (title: string) => console.log(`\n${++step}. ${title}`);
const fmt = (bytes: number) => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`);

/** One POST to auth.php, exactly as services/tutorAuthService.ts does it. */
async function call(action: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${ENDPOINT}?action=${action}&_t=${Date.now()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`auth.php?action=${action} answered with ${res.status} and no JSON:\n${text.slice(0, 400)}`);
  }
}

/** A payload shaped like the real one, deliberately carrying two big inlined images. */
function buildTestPayload(device: string) {
  return {
    exportedAt: new Date().toISOString(),
    version: 'cloud-roundtrip',
    device,
    learners: [
      {
        id: 'rt-learner-1',
        name: 'Round Trip Learner',
        category: 'general-english',
        cefrLevel: 'B1',
        // A real tutor's avatar lives here — this is what must never reach MySQL.
        avatarUrl: `data:image/png;base64,${'A'.repeat(BIG_IMAGE)}`,
        notes: 'Created by tools/cloud-roundtrip.ts to prove the backup path works.',
      },
    ],
    sessions: [
      { id: 'rt-session-1', learnerId: 'rt-learner-1', date: '2026-09-23', feedback: 'Spoke for 12 minutes, past simple solid.' },
      { id: 'rt-session-2', learnerId: 'rt-learner-1', date: '2026-09-21', feedback: 'Needs work on articles.' },
    ],
    calendar: [{ id: 'rt-event-1', title: 'Round trip check', at: '2026-09-24T10:00:00Z' }],
    todos: [{ id: 'rt-todo-1', text: 'Verify cloud restore', done: false }],
    // A big base64 blob with NO data: prefix — the other shape the strip must catch.
    settings: { theme: 'dark', whiteboardSnapshot: 'B'.repeat(BIG_IMAGE * 4) },
  };
}

function assert(condition: boolean, label: string, detail = '') {
  if (condition) ok(label, detail);
  else bad(label, detail);
  return condition;
}

async function main() {
  console.log('☁️  VIP cloud backup round trip');
  info(`endpoint: ${ENDPOINT}`);
  info(`account:  ${EMAIL || '(missing)'}`);
  if (FORCE) info('--force: an existing backup on this account WILL be overwritten');
  if (DELETE_AFTER) info('--delete-after: the backup row will be deleted at the end');

  if (!EMAIL || !PASSWORD) {
    console.error(
      '\n✋ Missing credentials.\n\n' +
        "  CLOUD_TEST_EMAIL='vip@example.com' CLOUD_TEST_PASSWORD='…' npx tsx tools/cloud-roundtrip.ts\n\n" +
        'Use a VIP account you do not mind overwriting. Never paste a password into this file.'
    );
    process.exit(2);
  }

  // ── 1. The gate ──────────────────────────────────────────────────────────
  heading('VIP gate is closed to anonymous callers');
  const anon = await call('cloud_info', { email: EMAIL });
  assert(anon.success === false, 'cloud_info without a token is refused', String(anon.error || '').slice(0, 90));

  const anonSave = await call('cloud_save', { email: EMAIL, encoding: 'gzip', payload: 'AAAA' });
  assert(anonSave.success === false, 'cloud_save without a token is refused', String(anonSave.error || '').slice(0, 90));

  // ── 2. Login ─────────────────────────────────────────────────────────────
  heading('Login over the live endpoint');
  const login = await call('login', { email: EMAIL, password: PASSWORD, deviceId: 'cloud-roundtrip-script' });
  if (!login.success || !login.token) {
    bad('login failed', login.error || 'no token returned');
    console.log('\n✋ Cannot continue without a session token. If the account needs Gmail verification, verify it in the app first.');
    process.exit(1);
  }
  const token: string = login.token;
  const tier: string = String(login.tutor?.tier || 'free');
  ok('signed in', `tier: ${tier.toUpperCase()}`);

  // ── 3. Is this account actually allowed to use the cloud? ────────────────
  heading('Account is entitled to cloud saving');
  const before = await call('cloud_info', { email: EMAIL, token });
  if (tier !== 'vip' && !login.tutor?.role?.includes('admin')) {
    bad('this account is not VIP', 'cloud saving is VIP-only by design — grant VIP in the Super Admin Console, then re-run');
    console.log(`\n   Server said: ${before.error || '(no error)'}`);
    process.exit(1);
  }
  ok('cloud_info authorised for VIP');

  const existingBytes: number = before.bytes || 0;
  const existingRev: number = before.revision || 0;
  if (existingBytes > 0) {
    info(`existing backup: ${fmt(existingBytes)} · revision ${existingRev} · ${before.updatedAt} · ${before.device || 'unknown device'}`);
    if (!FORCE) {
      console.log(
        '\n✋ This account already has a backup and cloud_save would REPLACE it.\n' +
          '   Re-run with --force if that is genuinely what you want, or use a throwaway VIP account.'
      );
      process.exit(2);
    }
  } else {
    info('no existing backup — this run will create revision 1');
  }

  // ── 4. The client pipeline: strip → gzip → base64 ────────────────────────
  heading('Client pipeline strips images, then compresses');
  const raw = buildTestPayload('cloud-roundtrip-script');
  const rawJson = JSON.stringify(raw);
  const stats = { count: 0, bytes: 0 };
  const stripped = deepStripInlinedMedia(JSON.parse(rawJson), stats);
  const json = JSON.stringify(stripped);

  assert(stats.count >= 2, 'inlined images were stripped before upload', `${stats.count} image(s), ${fmt(stats.bytes)} kept on disk`);
  assert(!json.includes('data:image'), 'no data: URL survived into the upload');
  assert(!json.includes('B'.repeat(1000)), 'no prefix-less base64 blob survived into the upload');
  assert(json.includes('Spoke for 12 minutes'), 'real records survive the strip untouched');

  const gz = gzipSync(Buffer.from(json, 'utf8'));
  const payload = gz.toString('base64');
  const checksum = createHash('sha1').update(gz).digest('hex');
  info(`payload: ${fmt(json.length)} raw → ${fmt(gz.length)} gzipped → ${fmt(payload.length)} base64`);

  // ── 5. Save ──────────────────────────────────────────────────────────────
  heading('cloud_save writes the row');
  const index = [
    { section: 'learners', count: (stripped as any).learners.length, bytes: JSON.stringify((stripped as any).learners).length },
    { section: 'sessions', count: (stripped as any).sessions.length, bytes: JSON.stringify((stripped as any).sessions).length },
    { section: 'calendar', count: (stripped as any).calendar.length, bytes: JSON.stringify((stripped as any).calendar).length },
    { section: 'todos', count: (stripped as any).todos.length, bytes: JSON.stringify((stripped as any).todos).length },
  ];
  const saved = await call('cloud_save', {
    email: EMAIL,
    token,
    encoding: 'gzip',
    payload,
    device: 'cloud-roundtrip-script',
    index,
  });
  if (!assert(saved.success === true, 'cloud_save returned success', saved.error || '')) {
    console.log('\n✋ Save failed, so there is nothing to read back. The error above came from the host.');
    process.exit(1);
  }
  const expectedRev = existingBytes > 0 ? existingRev + 1 : 1;
  assert(saved.revision === expectedRev, `revision is ${expectedRev}`, `server said ${saved.revision}`);
  assert(saved.bytes === gz.length, 'server stored the exact byte count', `${saved.bytes}`);
  assert(saved.rawBytes === json.length, 'server read the exact raw size', `${saved.rawBytes}`);

  // ── 6. Read it back ──────────────────────────────────────────────────────
  heading('cloud_load returns what was stored');
  const loaded = await call('cloud_load', { email: EMAIL, token });
  if (!assert(loaded.success === true, 'cloud_load returned success', loaded.error || '')) process.exit(1);

  const loadedGz = Buffer.from(loaded.payload, 'base64');
  const loadedJson = gunzipSync(loadedGz).toString('utf8');
  assert(loadedGz.length === gz.length, 'stored size matches', `${loadedGz.length} vs ${gz.length}`);
  assert(createHash('sha1').update(loadedGz).digest('hex') === checksum, 'checksum matches the upload', checksum.slice(0, 12) + '…');
  assert(loaded.checksum === checksum, 'server-side checksum agrees', String(loaded.checksum).slice(0, 12) + '…');

  // The real test: the restored object must be identical, key for key.
  let same = false;
  try {
    same = JSON.stringify(JSON.parse(loadedJson)) === json;
  } catch (error) {
    bad('the restored payload is not valid JSON', (error as Error).message);
  }
  assert(same, 'restored payload is byte-for-byte identical to what was sent');
  assert(loadedJson.length === json.length, 'restored raw size matches', `${loadedJson.length} vs ${json.length}`);
  assert((loaded.rawBytes || 0) === json.length, 'restored raw_bytes matches');

  // ── 7. Info agrees ───────────────────────────────────────────────────────
  heading('cloud_info reports the new state');
  const after = await call('cloud_info', { email: EMAIL, token });
  assert(after.success === true, 'cloud_info returned success');
  assert(after.exists === true, 'a backup now exists for this account');
  assert(after.revision === expectedRev, `revision is ${expectedRev}`, `server said ${after.revision}`);
  assert(after.bytes === gz.length, 'reported size matches the stored payload', `${after.bytes}`);
  assert(after.maxBytes === QUOTA, 'quota is reported', fmt(after.maxBytes));
  const sections = (after.sections || []).map((s: any) => s.section).sort();
  assert(
    sections.join(',') === 'calendar,learners,sessions,todos',
    'index rows were written for every section',
    sections.join(', ') || '(none)'
  );

  // ── 8. Cleanup ───────────────────────────────────────────────────────────
  if (DELETE_AFTER) {
    heading('Cleanup');
    const deleted = await call('cloud_delete', { email: EMAIL, token });
    assert(deleted.success === true, 'test backup deleted', deleted.error || '');
    const gone = await call('cloud_info', { email: EMAIL, token });
    assert(gone.exists === false, 'the account is back to having no cloud backup');
  } else {
    heading('Left in place');
    info('The test backup is still on the server (--delete-after removes it). It is small, and');
    info('the account\'s own next save replaces it. If this was a real tutor, re-run with --force');
    info('only after they have saved from the app, or delete it in phpMyAdmin.');
  }

  // ── Verdict ──────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(64));
  if (failures === 0) {
    console.log('✅ PASS — VIP cloud saving works end to end on this host.');
    console.log(`   ${fmt(gz.length)} stored · ${fmt(json.length)} raw · revision ${expectedRev} · ${stats.count} image(s) kept on disk.`);
    console.log('   Open the Super Admin Console → MySQL & Host Diagnostics → VIP Cloud Storage to watch this row.');
  } else {
    console.log(`❌ FAIL — ${failures} check(s) failed. Fix the first ❌ above; later ones usually follow from it.`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('\n💥 The run stopped early:', error?.message || error);
  console.error('   Check that the endpoint is reachable and that AUTH_ENDPOINT is right.');
  process.exitCode = 1;
});
