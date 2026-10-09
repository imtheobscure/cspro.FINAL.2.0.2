#!/usr/bin/env node
/**
 * ============================================================
 * TUTOMY — ACCOUNT & PASSWORD AUDIT (runs on your own computer)
 * ============================================================
 *
 * WHY: "everyone's password is wrong" is almost always a STORE problem, not a
 * password problem. This tool reads the files you downloaded from the host and
 * tells you exactly what is inside them — which accounts exist, what kind of
 * password material each one carries, and whether a password you know actually
 * verifies. No server, no upload, nothing is modified.
 *
 * WHAT TO DOWNLOAD FROM THE HOST (File Manager → download):
 *   1. <document root>/data/tutors_secure_db.php     ← every account + hashes
 *   2. <document root>/data/admin_vault_secure.php   ← the console's stored
 *                                                      password copies (if the
 *                                                      vault feature is in use)
 *   3. <document root>/data/tutors_db.json           ← optional, hash-free mirror
 *      (cPanel → phpMyAdmin → your database → users table → EXPORT as SQL/CSV is
 *       the other useful source when MySQL is in use; the relevant columns are
 *       email, password_hash, role, tier, status.)
 *
 * HOW TO RUN:
 *   npm run check:users -- path/to/tutors_secure_db.php
 *   npm run check:users -- path/to/tutors_secure_db.php --password you@example.com='YourPassword123'
 *   npm run check:users -- path/to/data            (audits every file it finds)
 *
 * The encryption key is the constant inside public/auth.php, so the file only
 * needs to be readable — PHP is not required.
 * ============================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const ENCRYPTION_KEY = 'TUTOMY_MASTER_VAULT_ENCRYPTION_KEY_2026_PRO_VIP_SECURE_AUTH';
const CLIENT_SALT = 'TUTOMY_SALT_2026_SECURE_AUTH_HASH_';

const colours = process.stdout.isTTY
  ? { red: (s) => `\x1b[31m${s}\x1b[0m`, green: (s) => `\x1b[32m${s}\x1b[0m`, yellow: (s) => `\x1b[33m${s}\x1b[0m`, dim: (s) => `\x1b[2m${s}\x1b[0m`, bold: (s) => `\x1b[1m${s}\x1b[0m` }
  : { red: (s) => s, green: (s) => s, yellow: (s) => s, dim: (s) => s, bold: (s) => s };

let bcrypt = null;
try {
  bcrypt = require('bcryptjs');
} catch {
  console.warn(colours.yellow('! bcryptjs is not installed, so bcrypt hashes cannot be test-verified. Run: npm install bcryptjs'));
}

// ── Store decryption ────────────────────────────────────────────────────────

/** AES-256-CBC with the raw PHP key ("openssl_encrypt(..., $key, 0, $iv)"). */
function decryptPayload(payload) {
  const raw = Buffer.from(payload, 'base64');
  if (raw.length < 18) return null;
  // PHP writes base64(iv . '::' . ciphertext). The IV is always 16 bytes, so
  // take it by length and tolerate the separator being present or not — this is
  // also what makes a file whose random IV happens to contain "::" readable.
  const iv = raw.subarray(0, 16);
  let rest = raw.subarray(16);
  if (rest.subarray(0, 2).toString('latin1') === '::') rest = rest.subarray(2);
  const key = Buffer.concat([Buffer.from(ENCRYPTION_KEY, 'utf8'), Buffer.alloc(32)]).subarray(0, 32);
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const out = Buffer.concat([decipher.update(rest), decipher.final()]).toString('utf8');
    return out;
  } catch {
    return null;
  }
}

/** Read a PHP-guarded store file (guard header line, then the payload). */
function readGuardedStore(file) {
  const text = fs.readFileSync(file, 'utf8');
  const nl = text.indexOf('\n');
  if (nl === -1) return { error: 'file has no payload line (looks truncated — re-upload it)' };
  const payload = text.slice(nl + 1).trim();
  if (!payload) return { error: 'the payload line is EMPTY (the file was truncated on upload — this alone locks every user out)' };
  const json = decryptPayload(payload);
  if (json === null) return { error: 'could not decrypt the payload (the file was written with a different ENCRYPTION_KEY, or it is damaged)' };
  try {
    return { data: JSON.parse(json) };
  } catch {
    return { error: 'decrypted, but the contents are not valid JSON (damaged file)' };
  }
}

const clientHash = (password) => 'sha256_' + crypto.createHash('sha256').update(CLIENT_SALT + password).digest('hex');

function hashHealth(t) {
  const hash = String(t?.passwordHash || '');
  const sha = String(t?.passwordHashSha256 || '');
  if (/^\$2[aby]\$\d\d\$/.test(hash) && sha) return { label: 'bcrypt + offline copy', ok: true };
  if (/^\$2[aby]\$\d\d\$/.test(hash)) return { label: 'bcrypt only', ok: true };
  if (hash.startsWith('sha256_')) return { label: 'offline hash only (no bcrypt) — PHP sign-in FAILS', ok: false };
  if (hash && sha) return { label: 'legacy plaintext + offline copy', ok: false };
  if (hash) return { label: 'unrecognised hash — sign-in likely FAILS', ok: false };
  if (sha) return { label: 'offline hash only (no bcrypt) — PHP sign-in FAILS', ok: false };
  return { label: 'NO PASSWORD STORED — this account cannot sign in', ok: false };
}

function verify(password, t) {
  const hash = String(t?.passwordHash || '');
  const sha = String(t?.passwordHashSha256 || '');
  if (/^\$2[aby]\$\d\d\$/.test(hash)) {
    if (!bcrypt) return 'bcrypt (verify skipped: bcryptjs missing)';
    return bcrypt.compareSync(password, hash) ? 'bcrypt ✅' : 'bcrypt ❌';
  }
  if (sha && sha === clientHash(password)) return 'salted sha256 ✅';
  if (sha) return 'salted sha256 ❌';
  if (hash && hash === password) return 'legacy plaintext ✅';
  return 'nothing to compare';
}

// ── Report ─────────────────────────────────────────────────────────────────

function reportAccounts(accounts, title, forcedPasswords) {
  const emails = Object.keys(accounts);
  console.log(`\n${colours.bold(title)} — ${emails.length} account(s)`);
  if (!emails.length) {
    console.log(colours.dim('  (no accounts in this file)'));
    return { broken: 0, total: 0 };
  }
  let broken = 0;
  for (const email of emails.sort()) {
    const t = accounts[email] || {};
    const health = hashHealth(t);
    if (!health.ok) broken++;
    const test = forcedPasswords[email.toLowerCase()] ? `  →  ${verify(forcedPasswords[email.toLowerCase()], t)}` : '';
    console.log(
      `  ${health.ok ? colours.green('✔') : colours.red('✖')} ${email.padEnd(34)}` +
      `${String(t.role || 'tutor').padEnd(6)} ${String(t.tier || 'free').padEnd(5)} ` +
      `${colours.dim(health.label)}${test}`
    );
    if (t.passwordUpdatedAt) console.log(colours.dim(`      last password change ${t.passwordUpdatedAt}${t.passwordUpdatedBy ? ` by ${t.passwordUpdatedBy}` : ''}`));
    if (test.includes('❌')) console.log(colours.red(`      that password does NOT sign this account in`));
  }
  const bad = Object.keys(accounts).filter((e) => !hashHealth(accounts[e]).ok).length;
  if (bad) console.log(colours.red(`  ${bad} of ${accounts.length} account(s) cannot sign in with a password in this store.`));
  return { broken, total: accounts.length };
}

function reportVault(vault, title, forcedPasswords) {
  const copies = vault?.passwords || {};
  const emails = Object.keys(copies);
  console.log(`\n${colours.bold(title)}`);
  console.log(`  gate: passphrase ${vault?.gate?.secondPassHash ? 'SET' : 'not set'} · Google Authenticator ${vault?.gate?.totpEnabled ? 'ON' : 'off'}`);
  console.log(`  stored readable password copies: ${emails.length}`);
  for (const email of emails.sort()) {
    let clear = null;
    try {
      const raw = Buffer.from(String(copies[email]?.blob || ''), 'base64');
      if (raw.length > 17) {
        const key = crypto.createHash('sha256').update(ENCRYPTION_KEY + '::credential-vault-v1', 'binary').digest().subarray(0, 32);
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, raw.subarray(0, 16));
        clear = Buffer.concat([decipher.update(raw.subarray(16)), decipher.final()]).toString('utf8');
      }
    } catch {
      clear = null;
    }
    const known = forcedPasswords[email.toLowerCase()];
    const matches = clear && known ? (clear === known ? colours.green(' (matches the password you supplied)') : colours.red(' (does NOT match the password you supplied)')) : '';
    console.log(`  • ${email.padEnd(34)} ${clear ? colours.bold(clear) : colours.dim('(could not be decrypted)')}${copies[email]?.by ? colours.dim(`  captured ${copies[email].at || '?'} by ${copies[email].by}`) : ''}${matches}`);
  }
  if (!emails.length) console.log(colours.dim('  (no readable copies yet — accounts are captured when they register, sign in, or are reset by the admin)'));
}

function parseForcedPasswords(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--password' && argv[i + 1]) {
      const [email, ...rest] = argv[i + 1].split('=');
      if (email && rest.length) out[email.toLowerCase().trim()] = rest.join('=');
      i++;
    }
  }
  return out;
}

// ── Main ───────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const targets = argv.filter((a) => !a.startsWith('--') && !/^[^=]+=/.test(a) && !(argv[argv.indexOf(a) - 1] === '--password'));
const forced = parseForcedPasswords(argv);

if (!targets.length) {
  console.log(fs.readFileSync(new URL(import.meta.url)).toString().split('*/')[0].replace(/^#![^\n]*\n/, ''));
  process.exit(1);
}

let problems = 0;

for (const target of targets) {
  const stat = fs.statSync(target);
  const files = stat.isDirectory()
    ? fs.readdirSync(target).filter((f) => /tutors_secure_db\.php|admin_vault_secure\.php|tutors_db\.json$/.test(f)).map((f) => path.join(target, f))
    : [target];

  for (const file of files) {
    const base = path.basename(file);
    console.log(`\n════ ${file} ════`);
    try {
      if (base === 'tutors_db.json') {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        const accounts = Array.isArray(data) ? Object.fromEntries(data.map((t) => [String(t.email || '').toLowerCase(), t])) : data;
        console.log(colours.dim('  This is the hash-free mirror. Accounts here without hashes are expected: it is NOT the store users are verified against.'));
        reportAccounts(accounts, 'Mirror contents (tiers/status only)', forced);
      } else {
        const result = readGuardedStore(file);
        if (result.error) {
          console.log(colours.red(`  ✖ ${result.error}`));
          problems++;
          continue;
        }
        if (base === 'admin_vault_secure.php') {
          reportVault(result.data, 'Credential vault', forced);
        } else {
          reportAccounts(result.data, 'Accounts', forced);
        }
      }
    } catch (e) {
      console.log(colours.red(`  ✖ ${e.message}`));
      problems++;
    }
  }
}

console.log('\n' + colours.bold('What to do next'));
console.log('  • Accounts marked ✖ with only an offline/sha256 hash or no hash cannot be checked by PHP.');
console.log('    Set a new password for them from the Super Admin Console (that writes a fresh bcrypt hash).');
console.log('  • Open  https://<your-host>/auth.php?action=version  to see which runtime is live');
console.log('    (php or node) and the same hash-health histogram straight from the host.');
console.log('  • If the store reports "truncated"/"EMPTY payload", a partial upload replaced a good file:');
console.log('    restore data/tutors_secure_db.php from a backup, then re-upload the full dist folder.');
if (problems) process.exitCode = 1;
