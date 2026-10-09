<?php
// ============================================================
// TUTOR ACADEMY - SECURE AUTHENTICATION & TIER SYNC SERVICE
// For cPanel hosting without terminal requirements.
// Compatible with upload.php and Apache/Nginx web servers.
// ============================================================

// 1. CORS & Response Headers
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';
header("Access-Control-Allow-Origin: $origin");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Device-Id");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// 2. Encryption & Master Configuration
define('ENCRYPTION_KEY', 'TUTOMY_MASTER_VAULT_ENCRYPTION_KEY_2026_PRO_VIP_SECURE_AUTH');
define('DATA_DIR', __DIR__ . '/data/');
define('DB_FILE', DATA_DIR . 'tutors_secure_db.php');
define('PHP_GUARD_HEADER', "<?php http_response_code(403); exit('Access denied.'); ?>\n");

// Current auth-file structure version. Bump when new per-account fields are
// introduced so the Super Admin Console can detect an older deployed auth file
// and offer a one-click in-place migration that preserves every user/password.
define('AUTH_SCHEMA_VERSION', 3);

// Fields every account must carry in the current structure. Missing keys =
// "auth file needs updating to the new structure".
define('AUTH_REQUIRED_KEYS', json_encode([
    'schemaVersion',
    'tierExpiresAt',
    'tierSig',
    'emailVerified',
    'maxAdultLearners',
    'maxKidsLearners'
]));

/**
 * Client-compatible salted SHA-256 password hash.
 * Mirrors hashPassword() in services/tutorAuthService.ts so a password that the
 * Super Admin Console sets is also accepted by the browser's offline fallback.
 */
function clientPasswordHash($password) {
    return 'sha256_' . hash('sha256', 'TUTOMY_SALT_2026_SECURE_AUTH_HASH_' . $password);
}

/** Send a verification message through the hosting provider's configured mail transport. */
function sendTutorVerificationEmail($email, $name, $code) {
    if (!function_exists('mail')) return false;
    $safeName = trim(preg_replace('/[\r\n]+/', ' ', (string)$name));
    $subject = 'Tutomy Academy Gmail verification code';
    // Real CRLF line breaks are required: PHP's mail() rejects a header block
    // that arrives as one line (that is what silently killed verification mail).
    $eol = "\r\n";
    $body = "Hello " . ($safeName !== '' ? $safeName : 'Tutor') . ",\r\n\r\n"
        . "Your Tutomy Academy verification code is: " . $code . "\r\n\r\n"
        . "Enter this code in the app to activate your tutor account. The code expires in 15 minutes.\r\n\r\n"
        . "If you did not request this account, you can ignore this message.\r\n\r\nTutomy Academy Team";
    $headers = 'From: Tutomy Academy <cspro@tutomy.com>' . $eol
        . 'Reply-To: cspro@tutomy.com' . $eol
        . 'MIME-Version: 1.0' . $eol
        . 'Content-Type: text/plain; charset=UTF-8' . $eol;
    return @mail($email, $subject, $body, $headers);
}

/**
 * The password-reset mail — same transport as the verification mail, different
 * words. Reusing the verification wording would have told a returning tutor to
 * "activate your tutor account" when what they asked for was a new password.
 */
function sendTutorPasswordResetEmail($email, $name, $code) {
    $subject = 'Tutomy Academy - set a new password';
    $safeName = preg_replace('/[\r\n]+/', ' ', (string)$name);
    $eol = "\r\n";
    $body = "Hello " . ($safeName !== '' ? $safeName : 'Tutor') . ",\r\n\r\n"
        . "Use this code to set a new password: " . $code . "\r\n\r\n"
        . "It expires in 15 minutes and can be used once.\r\n\r\n"
        . "If you did not ask for this, you can ignore this message - your current password keeps working and nobody can change it without this code.\r\n\r\nTutomy Academy Team";
    $headers = 'From: Tutomy Academy <cspro@tutomy.com>' . $eol
        . 'Reply-To: cspro@tutomy.com' . $eol
        . 'MIME-Version: 1.0' . $eol
        . 'Content-Type: text/plain; charset=UTF-8' . $eol;
    return @mail($email, $subject, $body, $headers);
}

/** True when $password matches the account's stored hash (bcrypt or client hash). */
function tutorPasswordMatches($tutor, $password) {
    if (isset($tutor['passwordHash']) && $tutor['passwordHash'] !== '' && password_verify($password, $tutor['passwordHash'])) {
        return true;
    }
    if (isset($tutor['passwordHashSha256']) && $tutor['passwordHashSha256'] !== '' && hash_equals($tutor['passwordHashSha256'], clientPasswordHash($password))) {
        return true;
    }
    return false;
}

/** Map legacy tier labels to the current free/pro/vip model. */
function normalizeTierLabel($tier) {
    $t = strtolower(trim((string)$tier));
    if ($t === 'premium' || $t === 'pro' || $t === 'paid' || $t === 'donor') return 'pro';
    if ($t === 'elite' || $t === 'elite_master' || $t === 'vip_elite' || $t === 'master') return 'vip';
    if ($t === 'standard' || $t === '' || $t === 'none') return 'free';
    return ($t === 'vip' || $t === 'free') ? $t : 'free';
}

/** List of new-structure keys missing from one account record. */
function missingAuthFields($tutor) {
    $required = json_decode(AUTH_REQUIRED_KEYS, true);
    $missing = [];
    foreach ($required as $key) {
        if (!array_key_exists($key, $tutor)) $missing[] = $key;
    }
    return $missing;
}

/** In-place upgrade of one account to the current structure (never touches passwordHash/token). */
function upgradeAccountRecord($tutor, $email) {
    $t = is_array($tutor) ? $tutor : [];
    // Normalize legacy tier labels
    if (isset($t['tier'])) $t['tier'] = normalizeTierLabel($t['tier']);
    if (empty($t['tier'])) $t['tier'] = 'free';
    // New fields with safe defaults — existing paid access is preserved
    if (!array_key_exists('schemaVersion', $t)) $t['schemaVersion'] = AUTH_SCHEMA_VERSION;
    if (!array_key_exists('tierExpiresAt', $t)) $t['tierExpiresAt'] = '';
    if (!array_key_exists('tierSig', $t)) $t['tierSig'] = '';
    if (!array_key_exists('emailVerified', $t)) $t['emailVerified'] = true; // pre-existing usable accounts stay usable
    if (!array_key_exists('maxAdultLearners', $t)) {
        $t['maxAdultLearners'] = $t['tier'] === 'vip' ? -1 : ($t['tier'] === 'pro' ? 100 : 30);
    }
    if (!array_key_exists('maxKidsLearners', $t)) {
        $t['maxKidsLearners'] = $t['tier'] === 'vip' ? -1 : ($t['tier'] === 'pro' ? 100 : 30);
    }
    $t['schemaVersion'] = AUTH_SCHEMA_VERSION;
    return $t;
}

// Master Super Admin Credentials
define('ADMIN_EMAIL', 'info.tutomy@gmail.com');
define('ADMIN_DEFAULT_PASS', 't-@CjR:c!Q3=5NZ');

// 3. Ensure Data Directory Exists
if (!is_dir(DATA_DIR)) {
    if (!mkdir(DATA_DIR, 0755, true)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to initialize secure data directory.']);
        exit;
    }
}

// 4. Cryptographic Helpers (AES-256-CBC)
function encryptData($plainText) {
    $cipher = 'AES-256-CBC';
    $ivLength = openssl_cipher_iv_length($cipher);
    $iv = openssl_random_pseudo_bytes($ivLength);
    $encrypted = openssl_encrypt($plainText, $cipher, ENCRYPTION_KEY, 0, $iv);
    return base64_encode($iv . '::' . $encrypted);
}

function decryptData($encryptedString) {
    $cipher = 'AES-256-CBC';
    $raw = base64_decode($encryptedString);
    $parts = explode('::', $raw, 2);
    if (count($parts) !== 2) return null;
    list($iv, $encrypted) = $parts;
    return openssl_decrypt($encrypted, $cipher, ENCRYPTION_KEY, 0, $iv);
}

// ============================================================
// 4b. CREDENTIAL VAULT — Super Admin Console → "🔐 Credentials"
// ============================================================
// A SECOND lock in front of the most sensitive screen in the app. Even the
// master admin must clear it before any stored password can be read or changed:
//
//   • a secondary admin passphrase (separate from the sign-in password), and/or
//   • a Google Authenticator / Authy code (TOTP, set up once from this panel).
//
// Passwords are only *viewable* for accounts whose plaintext was captured while
// it was in memory (registration, sign-in, an admin reset). Accounts created
// before the vault existed only have one-way hashes — those can never be
// recovered, only reset. Set VAULT_CAPTURE_ENABLED to false to stop capturing
// plaintext entirely (the panel then becomes a reset + login-tester only).
// ============================================================

define('VAULT_FILE', DATA_DIR . 'admin_vault_secure.php');
define('VAULT_SCHEMA_VERSION', 1);
define('VAULT_UNLOCK_TTL', 900); // seconds an unlocked panel stays usable (15 min)
define('VAULT_CAPTURE_ENABLED', true);

/** Derived AES key for the password copies (separate from the tutors store key). */
function vaultKey() {
    return substr(hash('sha256', ENCRYPTION_KEY . '::credential-vault-v1', true), 0, 32);
}

function vaultEncrypt($plainText) {
    $iv = openssl_random_pseudo_bytes(16);
    $enc = openssl_encrypt($plainText, 'AES-256-CBC', vaultKey(), OPENSSL_RAW_DATA, $iv);
    if ($enc === false) return '';
    return base64_encode($iv . $enc);
}

function vaultDecrypt($blob) {
    $raw = base64_decode((string)$blob, true);
    if ($raw === false || strlen($raw) < 17) return null;
    $iv = substr($raw, 0, 16);
    $enc = substr($raw, 16);
    $out = openssl_decrypt($enc, 'AES-256-CBC', vaultKey(), OPENSSL_RAW_DATA, $iv);
    return $out === false ? null : $out;
}

/** Blank vault (no gate configured yet, no password copies). */
function vaultBlank() {
    return [
        'schemaVersion' => VAULT_SCHEMA_VERSION,
        'gate' => ['secondPassHash' => '', 'totpSecret' => '', 'totpEnabled' => false],
        'unlocks' => [],
        'passwords' => [],
        'updatedAt' => date('c')
    ];
}

/** Raw read of the encrypted vault file. null when it does not exist or cannot
 *  be read — the caller must NEVER treat null as "an empty vault" and save it. */
function vaultReadRaw() {
    if (!file_exists(VAULT_FILE)) {
        $GLOBALS['VAULT_STATE'] = 'missing';
        return null;
    }
    $lines = explode("\n", (string)@file_get_contents(VAULT_FILE), 2);
    if (count($lines) < 2 || trim($lines[1]) === '') {
        $GLOBALS['VAULT_STATE'] = 'corrupt';
        return null;
    }
    $decrypted = decryptData(trim($lines[1]));
    if ($decrypted === null || $decrypted === false) {
        $GLOBALS['VAULT_STATE'] = 'unreadable';
        return null;
    }
    $data = json_decode($decrypted, true);
    if (!is_array($data)) {
        $GLOBALS['VAULT_STATE'] = 'corrupt';
        return null;
    }
    $GLOBALS['VAULT_STATE'] = 'ok';
    return $data;
}

/** Read the encrypted vault file (never trust its shape). */
function vaultLoad() {
    $data = vaultReadRaw();
    $vault = is_array($data) ? $data : vaultBlank();
    if (!isset($vault['gate']) || !is_array($vault['gate'])) $vault['gate'] = vaultBlank()['gate'];
    foreach (['secondPassHash' => '', 'totpSecret' => '', 'totpEnabled' => false] as $k => $d) {
        if (!array_key_exists($k, $vault['gate'])) $vault['gate'][$k] = $d;
    }
    if (!isset($vault['unlocks']) || !is_array($vault['unlocks'])) $vault['unlocks'] = [];
    if (!isset($vault['passwords']) || !is_array($vault['passwords'])) $vault['passwords'] = [];
    $vault['schemaVersion'] = VAULT_SCHEMA_VERSION;
    return $vault;
}

/**
 * Persist the vault.
 *
 * $mode 'merge' (default) refuses to LOSE anything: if the on-disk vault holds a
 * second factor or a password copy that the incoming array no longer has, the
 * on-disk value wins. This is what stops a single failed read (or any other
 * blank-state bug) from silently deleting the admin's passphrase, their
 * authenticator link, or every revealed password.
 *
 * $mode 'replace' writes exactly what is given — used only by the explicit
 * "disable factor" and "forget password" actions.
 */
function vaultSave($vault, $mode = 'merge') {
    if ($mode === 'merge') {
        $onDisk = vaultReadRaw();
        if (is_array($onDisk)) {
            if ($vault['gate']['secondPassHash'] === '' && !empty($onDisk['gate']['secondPassHash'])) {
                $vault['gate']['secondPassHash'] = $onDisk['gate']['secondPassHash'];
            }
            if ($vault['gate']['totpSecret'] === '' && !empty($onDisk['gate']['totpSecret'])) {
                $vault['gate']['totpSecret'] = $onDisk['gate']['totpSecret'];
            }
            if (empty($vault['gate']['totpEnabled']) && !empty($onDisk['gate']['totpEnabled'])) {
                $vault['gate']['totpEnabled'] = true;
            }
            $onDiskPasswords = isset($onDisk['passwords']) && is_array($onDisk['passwords']) ? $onDisk['passwords'] : [];
            $kept = 0;
            foreach ($onDiskPasswords as $em => $copy) {
                if (!isset($vault['passwords'][$em])) {
                    $vault['passwords'][$em] = $copy;
                    $kept++;
                }
            }
            if ($kept) {
                error_log('[auth.php] vault save kept ' . $kept . ' stored password copy(ies) that were missing from the incoming state.');
            }
        }
    }
    $vault['updatedAt'] = date('c');
    // Drop expired unlock tokens so the file never grows unbounded.
    $now = time();
    foreach ($vault['unlocks'] as $h => $exp) {
        if ((int)$exp < $now) unset($vault['unlocks'][$h]);
    }
    $json = json_encode($vault, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    return writeFileAtomic(VAULT_FILE, PHP_GUARD_HEADER . encryptData($json));
}

/**
 * Was the vault file readable in this request?
 * A torn read on a shared host must never be treated as "an empty vault":
 * acting on it would silently delete the admin's second factor. $allowMissing
 * is true only where "no vault file yet" is a legitimate first-run state.
 */
function vaultReadHealthy($allowMissing = true) {
    $state = isset($GLOBALS['VAULT_STATE']) ? $GLOBALS['VAULT_STATE'] : 'unknown';
    if ($state === 'ok') return true;
    if ($allowMissing && $state === 'missing') return true;
    return false;
}

function vaultReadError() {
    $state = isset($GLOBALS['VAULT_STATE']) ? $GLOBALS['VAULT_STATE'] : 'unknown';
    return 'The credential vault file could not be read (' . $state . '). Nothing was changed — re-upload data/admin_vault_secure.php and check the data/ folder permissions, then try again.';
}

/** Has the admin set up ANY second factor yet? */
function vaultGateConfigured($vault) {
    return ($vault['gate']['secondPassHash'] !== '') || (!empty($vault['gate']['totpEnabled']) && $vault['gate']['totpSecret'] !== '');
}

/** Base32 helpers + TOTP (RFC 6238) — no external library needed. */
function vaultBase32Encode($raw) {
    $map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $bits = '';
    for ($i = 0; $i < strlen($raw); $i++) {
        $bits .= str_pad(decbin(ord($raw[$i])), 8, '0', STR_PAD_LEFT);
    }
    $out = '';
    foreach (str_split($bits, 5) as $chunk) {
        $out .= $map[bindec(str_pad($chunk, 5, '0', STR_PAD_RIGHT))];
    }
    return $out;
}

function vaultBase32Decode($b32) {
    $map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $clean = strtoupper(preg_replace('/[^A-Z2-7]/i', '', (string)$b32));
    $bits = '';
    for ($i = 0; $i < strlen($clean); $i++) {
        $pos = strpos($map, $clean[$i]);
        if ($pos === false) continue;
        $bits .= str_pad(decbin($pos), 5, '0', STR_PAD_LEFT);
    }
    $out = '';
    foreach (str_split($bits, 8) as $byte) {
        if (strlen($byte) === 8) $out .= chr(bindec($byte));
    }
    return $out;
}

function vaultTotpAt($secret, $counter) {
    $key = vaultBase32Decode($secret);
    if ($key === '') return '';
    $hash = hash_hmac('sha1', pack('NN', 0, $counter), $key, true);
    $offset = ord($hash[19]) & 0x0F;
    $code = ((ord($hash[$offset]) & 0x7F) << 24)
        | ((ord($hash[$offset + 1]) & 0xFF) << 16)
        | ((ord($hash[$offset + 2]) & 0xFF) << 8)
        | (ord($hash[$offset + 3]) & 0xFF);
    return str_pad((string)($code % 1000000), 6, '0', STR_PAD_LEFT);
}

/** Accept the current 30s window plus one step either side (clock drift). */
function vaultTotpValid($secret, $code) {
    $clean = preg_replace('/\s+/', '', (string)$code);
    if (!preg_match('/^\d{6}$/', $clean)) return false;
    $counter = (int)floor(time() / 30);
    for ($d = -1; $d <= 1; $d++) {
        $expected = vaultTotpAt($secret, $counter + $d);
        if ($expected !== '' && hash_equals($expected, $clean)) return true;
    }
    return false;
}

/**
 * Strict admin check for vault actions ONLY.
 * Unlike the older permissive checks, the master email alone is never enough
 * here — a live admin token or the master password must be supplied.
 */
function vaultAdminAuthorized($input, $tutors) {
    $adminEmail = strtolower(trim(isset($input['email']) ? $input['email'] : ''));
    $adminToken = isset($input['token']) ? trim($input['token']) : '';
    if ($adminEmail !== '' && $adminToken !== '' && isset($tutors[$adminEmail])
        && (isset($tutors[$adminEmail]['role']) ? $tutors[$adminEmail]['role'] : '') === 'admin'
        && hash_equals((string)(isset($tutors[$adminEmail]['token']) ? $tutors[$adminEmail]['token'] : ''), $adminToken)) {
        return true;
    }
    $masterPass = isset($input['adminPassword']) ? $input['adminPassword'] : (isset($input['password']) ? $input['password'] : '');
    if ($adminEmail === ADMIN_EMAIL && $masterPass === ADMIN_DEFAULT_PASS) return true;
    return false;
}

/** Issue a fresh short-lived unlock token; returns the raw token. */
function vaultIssueUnlock(&$vault) {
    $token = bin2hex(random_bytes(32));
    $vault['unlocks'][hash('sha256', $token)] = time() + VAULT_UNLOCK_TTL;
    return $token;
}

function vaultUnlockValid($vault, $token) {
    if ($token === '') return false;
    $key = hash('sha256', $token);
    if (!isset($vault['unlocks'][$key])) return false;
    if ((int)$vault['unlocks'][$key] < time()) return false;
    return true;
}

/**
 * True when the supplied second factor (unlock token, passphrase or TOTP) is good.
 * $allowPendingTotp is used only while CONFIRMING a brand-new authenticator:
 * the code has to be accepted before TOTP is switched on, otherwise the very
 * first code could never be verified.
 */
function vaultGateProofValid($vault, $input, $allowPendingTotp = false) {
    $unlockToken = isset($input['unlockToken']) ? trim($input['unlockToken']) : '';
    if ($unlockToken !== '' && vaultUnlockValid($vault, $unlockToken)) return true;

    $second = isset($input['secondPass']) ? (string)$input['secondPass'] : '';
    if ($second !== '' && $vault['gate']['secondPassHash'] !== '' && password_verify($second, $vault['gate']['secondPassHash'])) {
        return true;
    }

    $code = isset($input['totpCode']) ? (string)$input['totpCode'] : '';
    $totpUsable = !empty($vault['gate']['totpEnabled']) || $allowPendingTotp;
    if ($code !== '' && $totpUsable && $vault['gate']['totpSecret'] !== '' && vaultTotpValid($vault['gate']['totpSecret'], $code)) {
        return true;
    }
    return false;
}

/**
 * Keep an encrypted copy of a plaintext password while it is in memory.
 * Called on register / admin reset / successful sign-in — the only moments the
 * plaintext exists server-side. Silent no-op when the vault is disabled.
 */
function vaultCapturePassword($email, $password, $by) {
    if (!VAULT_CAPTURE_ENABLED) return false;
    $em = strtolower(trim($email));
    $password = (string)$password;
    if ($em === '' || $password === '' || strlen($password) > 200) return false;
    try {
        $vault = vaultLoad();
        // Never let a capture overwrite a vault we could not read.
        if (!vaultReadHealthy()) {
            error_log('[auth.php] vault capture skipped (unreadable vault: ' . (isset($GLOBALS['VAULT_STATE']) ? $GLOBALS['VAULT_STATE'] : '?') . ')');
            return false;
        }
        $vault['passwords'][$em] = [
            'blob' => vaultEncrypt($password),
            'at' => date('c'),
            'by' => $by === '' ? ADMIN_EMAIL : $by
        ];
        return vaultSave($vault);
    } catch (Exception $e) {
        error_log('[auth.php] vault capture failed: ' . $e->getMessage());
        return false;
    }
}

/** Describe what kind of password material an account actually carries. */
function vaultHashHealth($t) {
    $hash = isset($t['passwordHash']) ? (string)$t['passwordHash'] : '';
    $sha = isset($t['passwordHashSha256']) ? (string)$t['passwordHashSha256'] : '';
    $isBcrypt = $hash !== '' && preg_match('/^\$2[aby]\$/', $hash) === 1;
    if ($isBcrypt && $sha !== '') return 'bcrypt + offline copy';
    if ($isBcrypt) return 'bcrypt only';
    if ($hash !== '' && strpos($hash, 'sha256_') === 0) return 'offline hash only (no bcrypt) — sign-in may fail';
    if ($hash !== '' && $sha !== '') return 'legacy plaintext + offline copy';
    if ($hash !== '') return 'legacy/unrecognised hash — sign-in may fail';
    if ($sha !== '') return 'offline hash only (no bcrypt) — sign-in may fail';
    return 'NO PASSWORD STORED — this account cannot sign in';
}

// 5. MySQL Storage Layer (cPanel MySQL via phpMyAdmin)
// When a MySQL connection is configured and reachable, the `users` table is
// the authoritative store; the encrypted file below remains the offline
// fallback and is always kept in sync on every write.

/**
 * What the previous lookup got wrong, in one place.
 *
 * It tried exactly one file name — `db_config.php` — so a credentials file saved
 * as `db-config.php` (a hyphen, the name everyone types first) was invisible and
 * the console reported "Config file: NOT FOUND" while the file sat right there.
 * It also built a `$HOME` candidate unconditionally: cPanel's PHP-FPM/LiteSpeed
 * stack frequently leaves HOME unset, and the empty string produced the path
 * "/db_config.php", which can never exist and told the admin nothing.
 *
 * Both are fixed below, and every path that was tried is now reported back to the
 * Super Admin Console so "NOT FOUND" comes with the list of places we looked.
 */

/** Accepted file names, highest priority first. */
function dbConfigFileNames() {
    return [
        // Current name. A cPanel-prefixed name is also fine because the lookup
        // below matches `cs-*db_config.php` / `cs_*db_config.php` as well.
        'cs-db_config.php',
        'cs_db_config.php',
        // The user's natural mis-spelling (hyphen instead of underscore).
        'db-config.php',
        // Every build before this one documented this exact name.
        'db_config.php',
    ];
}

/**
 * Directories to look in, most secure first.
 *
 * The document root is deliberately LAST: a credentials file there is reachable
 * over HTTP and relies on `.htaccess` to be denied, which is a second line of
 * defence, not the first. One level above the document root is outside the web
 * root entirely — `/home/miydtgmr/cs-db_config.php` for a site served out of
 * `/home/miydtgmr/cspro.tutomy.com` — so it cannot be fetched at all.
 */
function dbConfigSearchDirs() {
    $dirs = [];
    // An absolute path from cPanel env (SetEnv AUTH_DB_CONFIG ...) wins: it lets
    // you park the file anywhere, even outside the account home.
    $explicit = getenv('AUTH_DB_CONFIG');
    if ($explicit) $dirs[] = rtrim(dirname($explicit), '/');
    $dirs[] = dirname(__DIR__);   // one level above the doc root — recommended
    $dirs[] = __DIR__;            // beside auth.php
    $home = getenv('HOME');
    if ($home) $dirs[] = rtrim($home, '/');   // ~ (only when it is really set)
    return array_values(array_unique($dirs));
}

function resolveDbConfig() {
    // 1. Environment variables (e.g. SetEnv in .htaccess or cPanel env)
    $cfg = [
        'host' => getenv('DB_HOST') ?: 'localhost',
        'name' => getenv('DB_NAME') ?: '',
        'user' => getenv('DB_USER') ?: '',
        'pass' => getenv('DB_PASS') ?: ''
    ];
    if ($cfg['name'] && $cfg['user']) {
        $GLOBALS['AUTH_DB_CONFIG_TRACE'] = ['source' => 'environment variables', 'used' => null, 'tried' => []];
        return $cfg;
    }
    // 2. A credentials file, outside the web root where possible.
    //    Also accept a cPanel-prefixed name (`miydtgmr_cs-db_config.php`), because
    //    that is what a File Manager download is often called.
    $names = dbConfigFileNames();
    $tried = [];
    foreach (dbConfigSearchDirs() as $dir) {
        if (!is_dir($dir)) continue;
        $entries = $names;
        $prefixed = glob($dir . '/cs*db_config.php');
        if (is_array($prefixed)) {
            foreach ($prefixed as $p) $entries[] = basename($p);
        }
        foreach (array_values(array_unique($entries)) as $name) {
            $path = $dir . '/' . $name;
            $tried[] = $path;
            if (!is_file($path)) continue;
            $db = include $path;
            if (!is_array($db)) continue;
            $resolved = [
                'host' => isset($db['host']) ? $db['host'] : 'localhost',
                'name' => isset($db['name']) ? $db['name'] : '',
                'user' => isset($db['user']) ? $db['user'] : '',
                'pass' => isset($db['pass']) ? $db['pass'] : ''
            ];
            // Remember which file actually answered, so the console can prove it.
            $GLOBALS['AUTH_DB_CONFIG_TRACE'] = [
                'source' => 'file',
                'used' => $path,
                'tried' => $tried,
                // Never the values — only whether each one was filled in.
                'hasName' => $resolved['name'] !== '',
                'hasUser' => $resolved['user'] !== ''
            ];
            return $resolved;
        }
    }
    $GLOBALS['AUTH_DB_CONFIG_TRACE'] = ['source' => 'none', 'used' => null, 'tried' => $tried];
    return null;
}

function mysqlConnect() {
    static $pdo = null;
    static $attempted = false;
    if ($attempted) return $pdo;
    $attempted = true;
    if (!class_exists('PDO')) return null;
    $cfg = resolveDbConfig();
    if (!$cfg || empty($cfg['name']) || empty($cfg['user'])) return null;
    try {
        $pdo = new PDO(
            'mysql:host=' . $cfg['host'] . ';dbname=' . $cfg['name'] . ';charset=utf8mb4',
            $cfg['user'],
            $cfg['pass'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]
        );
        // Keep existing cPanel databases compatible with the current auth
        // contract. ALTER is idempotent and failures are non-fatal for hosts
        // where the account cannot alter its own table.
        foreach ([
            // Salted SHA-256 copy of the password. The browser's offline fallback
            // and the admin password-reset flow both depend on it, so it must
            // survive the MySQL round-trip exactly like the bcrypt hash does.
            'password_hash_sha256 VARCHAR(128) NOT NULL DEFAULT \'\'',
            'verification_code VARCHAR(16) NOT NULL DEFAULT \'\'',
            'verification_token VARCHAR(128) NOT NULL DEFAULT \'\'',
            'verification_expires_at VARCHAR(40) NOT NULL DEFAULT \'\''
        ] as $column) {
            try { $pdo->exec('ALTER TABLE users ADD COLUMN ' . $column); } catch (Exception $ignored) {}
        }
        return $pdo;
    } catch (Exception $e) {
        error_log('[auth.php] MySQL unavailable: ' . $e->getMessage());
        return null;
    }
}

/**
 * Bring the `users` table up to the current schema in place.
 *
 * Called by the Super Admin Console "Update database schema" button so a host that
 * was set up before a column existed (or where schema.sql was never re-imported) can
 * heal itself with one click. Fully idempotent: it creates the table only when it is
 * missing and ADDs only the columns that are actually absent, so no row and no column
 * is ever dropped or rewritten.
 */
function ensureUsersSchema($pdo) {
    $report = ['tableCreated' => false, 'columnsAdded' => [], 'notes' => []];
    try {
        $exists = (int)$pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'users'")->fetchColumn() > 0;
        if (!$exists) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS `users` (
                `id` VARCHAR(64) NOT NULL,
                `email` VARCHAR(190) NOT NULL,
                `password_hash` VARCHAR(255) NOT NULL DEFAULT '',
                `password_hash_sha256` VARCHAR(128) NOT NULL DEFAULT '',
                `token` VARCHAR(128) NOT NULL DEFAULT '',
                `name` VARCHAR(120) NOT NULL DEFAULT '',
                `avatar_url` TEXT,
                `avatar_id` VARCHAR(64) NOT NULL DEFAULT 'tutor-default',
                `bio` TEXT,
                `teaching_method` VARCHAR(120) NOT NULL DEFAULT '',
                `interests` TEXT,
                `native_language` VARCHAR(60) NOT NULL DEFAULT 'English',
                `hourly_rate` DECIMAL(10,2) NOT NULL DEFAULT 25.00,
                `country` VARCHAR(60) NOT NULL DEFAULT '',
                `timezone` VARCHAR(60) NOT NULL DEFAULT 'UTC',
                `tier` VARCHAR(10) NOT NULL DEFAULT 'free',
                `status` VARCHAR(20) NOT NULL DEFAULT 'active',
                `role` VARCHAR(10) NOT NULL DEFAULT 'tutor',
                `device_id` VARCHAR(64) NOT NULL DEFAULT '',
                `notes` TEXT,
                `email_verified` TINYINT(1) NOT NULL DEFAULT 1,
                `schema_version` INT NOT NULL DEFAULT 3,
                `tier_expires_at` VARCHAR(40) NOT NULL DEFAULT '',
                `tier_sig` VARCHAR(128) NOT NULL DEFAULT '',
                `verification_code` VARCHAR(16) NOT NULL DEFAULT '',
                `verification_token` VARCHAR(128) NOT NULL DEFAULT '',
                `verification_expires_at` VARCHAR(40) NOT NULL DEFAULT '',
                `max_adult_learners` INT NOT NULL DEFAULT 30,
                `max_kids_learners` INT NOT NULL DEFAULT 30,
                `created_at` VARCHAR(40) NOT NULL DEFAULT '',
                `last_login` VARCHAR(40) NOT NULL DEFAULT '',
                PRIMARY KEY (`email`),
                KEY `idx_tier` (`tier`),
                KEY `idx_status` (`status`),
                KEY `idx_role` (`role`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $report['tableCreated'] = true;
        }

        // Every column the current auth contract expects, with the exact definition
        // from schema.sql. A missing column is added; a present one is left alone.
        $defs = [
            'id' => "VARCHAR(64) NOT NULL DEFAULT ''",
            'password_hash' => "VARCHAR(255) NOT NULL DEFAULT ''",
            'password_hash_sha256' => "VARCHAR(128) NOT NULL DEFAULT ''",
            'token' => "VARCHAR(128) NOT NULL DEFAULT ''",
            'name' => "VARCHAR(120) NOT NULL DEFAULT ''",
            'avatar_url' => 'TEXT NULL',
            'avatar_id' => "VARCHAR(64) NOT NULL DEFAULT 'tutor-default'",
            'bio' => 'TEXT NULL',
            'teaching_method' => "VARCHAR(120) NOT NULL DEFAULT ''",
            'interests' => 'TEXT NULL',
            'native_language' => "VARCHAR(60) NOT NULL DEFAULT 'English'",
            'hourly_rate' => 'DECIMAL(10,2) NOT NULL DEFAULT 25.00',
            'country' => "VARCHAR(60) NOT NULL DEFAULT ''",
            'timezone' => "VARCHAR(60) NOT NULL DEFAULT 'UTC'",
            'tier' => "VARCHAR(10) NOT NULL DEFAULT 'free'",
            'status' => "VARCHAR(20) NOT NULL DEFAULT 'active'",
            'role' => "VARCHAR(10) NOT NULL DEFAULT 'tutor'",
            'device_id' => "VARCHAR(64) NOT NULL DEFAULT ''",
            'notes' => 'TEXT NULL',
            'email_verified' => 'TINYINT(1) NOT NULL DEFAULT 1',
            'schema_version' => 'INT NOT NULL DEFAULT 3',
            'tier_expires_at' => "VARCHAR(40) NOT NULL DEFAULT ''",
            'tier_sig' => "VARCHAR(128) NOT NULL DEFAULT ''",
            'verification_code' => "VARCHAR(16) NOT NULL DEFAULT ''",
            'verification_token' => "VARCHAR(128) NOT NULL DEFAULT ''",
            'verification_expires_at' => "VARCHAR(40) NOT NULL DEFAULT ''",
            'max_adult_learners' => 'INT NOT NULL DEFAULT 30',
            'max_kids_learners' => 'INT NOT NULL DEFAULT 30',
            'created_at' => "VARCHAR(40) NOT NULL DEFAULT ''",
            'last_login' => "VARCHAR(40) NOT NULL DEFAULT ''"
        ];
        $present = [];
        $colStmt = $pdo->query("SELECT column_name AS name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users'");
        foreach ($colStmt->fetchAll() as $row) $present[strtolower($row['name'])] = true;
        foreach ($defs as $col => $def) {
            if (isset($present[$col])) continue;
            try {
                $pdo->exec('ALTER TABLE `users` ADD COLUMN `' . $col . '` ' . $def);
                $report['columnsAdded'][] = $col;
            } catch (Exception $e) {
                $report['notes'][] = $col . ' could not be added automatically (the database user may lack ALTER rights).';
            }
        }
    } catch (Exception $e) {
        $report['notes'][] = 'Schema check failed: ' . $e->getMessage();
    }
    return $report;
}

function mysqlIsLive() {
    return mysqlConnect() !== null;
}

/** Map one account record (camelCase JSON contract) to a users table row. */
function mysqlTutorToRow($t, $email) {
    return [
        'id' => isset($t['id']) ? $t['id'] : ('tut_' . time()),
        'email' => strtolower(trim($email)),
        'password_hash' => isset($t['passwordHash']) ? $t['passwordHash'] : '',
        'password_hash_sha256' => isset($t['passwordHashSha256']) ? $t['passwordHashSha256'] : '',
        'token' => isset($t['token']) ? $t['token'] : '',
        'name' => isset($t['name']) ? $t['name'] : '',
        'avatar_url' => isset($t['avatarUrl']) ? $t['avatarUrl'] : '',
        'avatar_id' => isset($t['avatarId']) ? $t['avatarId'] : 'tutor-default',
        'bio' => isset($t['bio']) ? $t['bio'] : '',
        'teaching_method' => isset($t['teachingMethod']) ? $t['teachingMethod'] : '',
        'interests' => isset($t['interests']) ? $t['interests'] : '',
        'native_language' => isset($t['nativeLanguage']) ? $t['nativeLanguage'] : 'English',
        'hourly_rate' => isset($t['hourlyRate']) ? floatval($t['hourlyRate']) : 25,
        'country' => isset($t['country']) ? $t['country'] : '',
        'timezone' => isset($t['timezone']) ? $t['timezone'] : 'UTC',
        'tier' => isset($t['tier']) ? $t['tier'] : 'free',
        'status' => isset($t['status']) ? $t['status'] : 'active',
        'role' => isset($t['role']) ? $t['role'] : 'tutor',
        'device_id' => isset($t['deviceId']) ? $t['deviceId'] : '',
        'notes' => isset($t['notes']) ? $t['notes'] : '',
        'email_verified' => !empty($t['emailVerified']) ? 1 : 0,
        'schema_version' => isset($t['schemaVersion']) ? intval($t['schemaVersion']) : AUTH_SCHEMA_VERSION,            'tier_expires_at' => isset($t['tierExpiresAt']) ? $t['tierExpiresAt'] : '',
            'tier_sig' => isset($t['tierSig']) ? $t['tierSig'] : '',
            'verification_code' => isset($t['verificationCode']) ? $t['verificationCode'] : '',
            'verification_token' => isset($t['verificationToken']) ? $t['verificationToken'] : '',
            'verification_expires_at' => isset($t['verificationExpiresAt']) ? $t['verificationExpiresAt'] : '',
            'max_adult_learners' => isset($t['maxAdultLearners']) ? intval($t['maxAdultLearners']) : 30,
        'max_kids_learners' => isset($t['maxKidsLearners']) ? intval($t['maxKidsLearners']) : 30,
        'created_at' => isset($t['createdAt']) ? $t['createdAt'] : date('c'),
        'last_login' => isset($t['lastLogin']) ? $t['lastLogin'] : date('c')
    ];
}

/** Map one users table row back to the camelCase JSON contract record. */
function mysqlRowToTutor($r) {
    return [
        'id' => $r['id'],
        'email' => $r['email'],
        'passwordHash' => $r['password_hash'],
        'passwordHashSha256' => isset($r['password_hash_sha256']) ? $r['password_hash_sha256'] : '',
        'token' => $r['token'],
        'name' => $r['name'],
        'avatarUrl' => $r['avatar_url'],
        'avatarId' => $r['avatar_id'],
        'bio' => $r['bio'],
        'teachingMethod' => $r['teaching_method'],
        'interests' => $r['interests'],
        'nativeLanguage' => $r['native_language'],
        'hourlyRate' => floatval($r['hourly_rate']),
        'country' => $r['country'],
        'timezone' => $r['timezone'],
        'tier' => $r['tier'],
        'status' => $r['status'],
        'role' => $r['role'],
        'deviceId' => $r['device_id'],
        'notes' => $r['notes'],
        'emailVerified' => !empty($r['email_verified']),
        'schemaVersion' => intval($r['schema_version']),
        'tierExpiresAt' => isset($r['tier_expires_at']) ? $r['tier_expires_at'] : '',
        'tierSig' => isset($r['tier_sig']) ? $r['tier_sig'] : '',
        'verificationCode' => isset($r['verification_code']) ? $r['verification_code'] : '',
        'verificationToken' => isset($r['verification_token']) ? $r['verification_token'] : '',
        'verificationExpiresAt' => isset($r['verification_expires_at']) ? $r['verification_expires_at'] : '',
        'maxAdultLearners' => intval($r['max_adult_learners']),
        'maxKidsLearners' => intval($r['max_kids_learners']),
        'createdAt' => $r['created_at'],
        'lastLogin' => $r['last_login']
    ];
}

/** Load every account from MySQL. Returns null when MySQL is not usable. */
function mysqlLoadAll() {
    $pdo = mysqlConnect();
    if (!$pdo) return null;
    try {
        $rows = $pdo->query('SELECT * FROM users')->fetchAll();
        $out = [];
        foreach ($rows as $r) {
            $out[strtolower(trim($r['email']))] = mysqlRowToTutor($r);
        }
        return $out;
    } catch (Exception $e) {
        error_log('[auth.php] MySQL load failed: ' . $e->getMessage());
        return null;
    }
}

/** Upsert ONE account into MySQL. Returns true on success — used by the
 *  Admin Console "Migrate File Accounts" action for per-account results. */
function mysqlUpsertOne($tut, $em) {
    $pdo = mysqlConnect();
    if (!$pdo) return false;
    $cols = ['id','email','password_hash','password_hash_sha256','token','name','avatar_url','avatar_id','bio','teaching_method','interests','native_language','hourly_rate','country','timezone','tier','status','role','device_id','notes','email_verified','schema_version','tier_expires_at','tier_sig','verification_code','verification_token','verification_expires_at','max_adult_learners','max_kids_learners','created_at','last_login'];
    $placeholders = '(' . implode(',', array_fill(0, count($cols), '?')) . ')';
    $updates = [];
    foreach ($cols as $c) {
        if ($c === 'email') continue;
        $updates[] = '`' . $c . '` = VALUES(`' . $c . '`)';
    }
    $sql = 'INSERT INTO users (' . implode(',', $cols) . ') VALUES ' . $placeholders .
           ' ON DUPLICATE KEY UPDATE ' . implode(', ', $updates);
    try {
        $stmt = $pdo->prepare($sql);
        $row = mysqlTutorToRow($tut, $em);
        $vals = [];
        foreach ($cols as $c) $vals[] = $row[$c];
        $stmt->execute($vals);
        return true;
    } catch (Exception $e) {
        error_log('[auth.php] MySQL upsert failed for ' . $em . ': ' . $e->getMessage());
        return false;
    }
}

/** Upsert every account into MySQL (per-row, non-fatal: one bad row never
 *  aborts the others, and file storage still runs regardless). */
function mysqlUpsertAll($tutorsMap) {
    $allOk = true;
    foreach ($tutorsMap as $em => $tut) {
        if (!mysqlUpsertOne($tut, $em)) $allOk = false;
    }
    return $allOk;
}

/** Delete one account from MySQL (used by the delete_tutor action). */
function mysqlDeleteUser($email) {
    $pdo = mysqlConnect();
    if (!$pdo) return;
    try {
        $stmt = $pdo->prepare('DELETE FROM users WHERE email = ?');
        $stmt->execute([strtolower(trim($email))]);
    } catch (Exception $e) {
        error_log('[auth.php] MySQL delete failed: ' . $e->getMessage());
    }
}

/**
 * Explain a connection failure in plain language WITHOUT echoing the credentials.
 *
 * A raw PDOException reads like
 *
 *   SQLSTATE[HY000] [1045] Access denied for user 'acct_db'@'localhost' (using password: YES)
 *
 * which prints the database USER name, and for error 1044 the DATABASE name too.
 * The console is admin-gated, but those strings also get screenshotted into chats
 * and support tickets, so the numeric code is mapped to a cause and the driver's
 * own text is dropped. The full message still goes to the host's PHP error log.
 */
function describeMysqlFailure($e) {
    $msg = $e instanceof Exception ? $e->getMessage() : (string)$e;
    if (preg_match('/\[(\d{4})\]/', $msg, $m)) {
        switch ($m[1]) {
            case '1045':
                return 'The database rejected these credentials — wrong user name or password. Re-check both against cPanel → MySQL Databases, then try again. The credentials file is read from the path shown above.';
            case '1044':
                return 'The credentials are valid, but that database user has no permission on this database. In cPanel → MySQL Databases, add the user to the database and grant ALL PRIVILEGES.';
            case '1049':
                return 'The database name in the credentials file does not exist on this host. Copy the exact name from cPanel → MySQL Databases (it is prefixed with your account name).';
            case '2002':
            case '2003':
                return 'The database server could not be reached from this host. On cPanel MySQL is always "localhost" — if the host was changed, set it back to localhost.';
            case '1040':
                return 'The database server is temporarily out of connections. Try again in a moment.';
        }
    }
    if (stripos($msg, 'could not find driver') !== false) {
        return 'PHP has no MySQL driver (pdo_mysql). Ask your host to enable pdo_mysql, then try again.';
    }
    return 'The database connection failed. The exact reason is in the host PHP error log (cPanel → Metrics → Errors) — it is not shown here because it can contain the database user name.';
}

/**
 * Full MySQL health report for the Super Admin Console "Test MySQL" button.
 * Uses a FRESH connection so an earlier failed attempt is never cached.
 * Never exposes credentials — only presence, paths and causes.
 */
function mysqlDiagnostics() {
    $cfg = resolveDbConfig();
    $trace = isset($GLOBALS['AUTH_DB_CONFIG_TRACE']) ? $GLOBALS['AUTH_DB_CONFIG_TRACE'] : ['source' => 'none', 'used' => null, 'tried' => []];
    $out = [
        'configFound' => $cfg !== null,
        'configSource' => $cfg === null ? 'none' : ($trace['source'] === 'environment variables' ? 'environment variables (.htaccess SetEnv)' : 'credentials file'),
        // The exact path that answered, and every path that was looked at when
        // none did. "NOT FOUND" is only useful with the list of places we looked.
        'configFile' => $trace['used'],
        'configTried' => $trace['tried'],
        'configHasNulls' => $cfg !== null && (empty($cfg['name']) || empty($cfg['user'])),
        'pdoAvailable' => class_exists('PDO'),
        // class_exists('PDO') can be true while the MySQL driver is absent, which
        // used to be reported as "PDO missing" and sent the admin after the wrong fix.
        'pdoMysqlDriver' => class_exists('PDO') && in_array('mysql', PDO::getAvailableDrivers(), true),
        'mysqlConnected' => false,
        'error' => null,
        'tableExists' => false,
        'accountCount' => 0,
        'storageSource' => 'encrypted-file fallback (no MySQL in use)'
    ];
    if ($cfg === null) {
        $out['error'] = 'No database credentials file was found. Save it as cs-db_config.php ONE LEVEL ABOVE the site — for this host that is /home/miydtgmr/cs-db_config.php — or beside auth.php. (db_config.php and db-config.php still work, and DB_HOST/DB_NAME/DB_USER/DB_PASS in .htaccess also works.) The paths that were checked are listed above.';
        return $out;
    }
    if (!class_exists('PDO')) {
        $out['error'] = 'PHP has no PDO extension at all on this server. Ask your host to enable pdo_mysql, then try again.';
        return $out;
    }
    if (!$out['pdoMysqlDriver']) {
        $out['error'] = 'PDO is enabled but the pdo_mysql DRIVER is not loaded, so PHP cannot talk to MySQL at all. Ask your host to enable pdo_mysql (it is separate from PDO itself). Without it, cloud backup and the users table cannot work on this host.';
        return $out;
    }
    if ($out['configHasNulls']) {
        $out['error'] = 'The credentials file was found but its "name" or "user" value is empty. Open the file shown above and fill in both from cPanel → MySQL Databases; the database and user names are prefixed with your cPanel account (e.g. miydtgmr_cspro356).';
        return $out;
    }
    try {
        $pdo = new PDO(
            'mysql:host=' . $cfg['host'] . ';dbname=' . $cfg['name'] . ';charset=utf8mb4',
            $cfg['user'],
            $cfg['pass'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]
        );
        $out['mysqlConnected'] = true;
        $stmt = $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'users'");
        $out['tableExists'] = (int)$stmt->fetchColumn() > 0;
        if ($out['tableExists']) {
            $out['accountCount'] = (int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
            $out['storageSource'] = $out['accountCount'] > 0
                ? 'mysql (users table)'
                : 'mysql (empty users table — falls back to file until the first save)';
        } else {
            $out['error'] = 'MySQL connected, but the "users" table does not exist. Import schema.sql via phpMyAdmin.';
        }
    } catch (Exception $e) {
        // Raw message to the log (server-side, safe), sanitized cause to the UI.
        error_log('[auth.php] MySQL diagnostics failed: ' . $e->getMessage());
        $out['error'] = describeMysqlFailure($e);
        $out['errorCode'] = (preg_match('/\[(\d{4})\]/', $e->getMessage(), $m) ? $m[1] : null);
    }
    return $out;
}

// 5b. VIP CLOUD BACKUP (snapshot + tiny index)
//
// Deliberately cheap on shared hosting: ONE row per tutor holds the whole
// gzip-compressed workspace (LONGBLOB), so a save is a single upsert and a
// restore is a single row read. `cloud_backup_index` holds a few small rows per
// tutor so the dashboard can show counts/sizes without reading the payload.
// Generated lesson HTML is never sent here — it stays on the tutor's hard disk.
//
// 50 MB compressed cap: a tutor's transcripts, feedback, bookings and settings are
// text, which gzips ~8-10x, so this holds far more than it sounds. Raise PHP's
// post_max_size to at least 70M for a payload this size to reach auth.php at all.

define('CLOUD_MAX_PAYLOAD_BYTES', 50 * 1024 * 1024);  // stored (compressed) cap

define('CLOUD_MAX_RAW_BYTES', 300 * 1024 * 1024);     // uncompressed guard

define('CLOUD_INDEX_SECTIONS', json_encode([
    'learners', 'sessions', 'calendar', 'todos', 'automations', 'bookings',
    'coursebooks', 'groups', 'tutor', 'settings', 'kids'
]));

/**
 * Creates the two cloud tables on first use so a host never has to re-import
 * schema.sql after an update. Idempotent and cached per request.
 */
function cloudEnsureSchema($pdo) {
    static $ready = false;
    if ($ready) return true;
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `cloud_backups` (
            `email`       VARCHAR(190)    NOT NULL,
            `payload`     LONGBLOB        NULL,
            `encoding`    VARCHAR(10)     NOT NULL DEFAULT 'gzip',
            `bytes`       INT UNSIGNED    NOT NULL DEFAULT 0,
            `raw_bytes`   INT UNSIGNED    NOT NULL DEFAULT 0,
            `revision`    BIGINT UNSIGNED NOT NULL DEFAULT 0,
            `device`      VARCHAR(64)     NOT NULL DEFAULT '',
            `checksum`    CHAR(40)        NOT NULL DEFAULT '',
            `created_at`  VARCHAR(40)     NOT NULL DEFAULT '',
            `updated_at`  VARCHAR(40)     NOT NULL DEFAULT '',
            PRIMARY KEY (`email`),
            KEY `idx_cloud_updated` (`updated_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $pdo->exec("CREATE TABLE IF NOT EXISTS `cloud_backup_index` (
            `email`       VARCHAR(190)    NOT NULL,
            `section`     VARCHAR(40)     NOT NULL,
            `item_count`  INT UNSIGNED    NOT NULL DEFAULT 0,
            `bytes`       INT UNSIGNED    NOT NULL DEFAULT 0,
            `updated_at`  VARCHAR(40)     NOT NULL DEFAULT '',
            PRIMARY KEY (`email`, `section`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $ready = true;
        return true;
    } catch (Exception $e) {
        error_log('[auth.php] cloud schema failed: ' . $e->getMessage());
        return false;
    }
}

/**
 * Validates the session token AND the tier for a cloud request.
 * Returns [tutor, email, error]. Cloud saving is VIP-only (the master admin
 * always counts as VIP).
 */
function cloudRequireVip($input) {
    $token = isset($input['token']) ? trim($input['token']) : '';
    $email = strtolower(trim(isset($input['email']) ? $input['email'] : ''));
    if ($email === '' || $token === '') {
        return [null, null, 'Email and session token are required.'];
    }
    $tutors = loadTutorsDB();
    if (!isset($tutors[$email])) {
        return [null, null, 'Account not found in the server database.'];
    }
    $tutor = $tutors[$email];
    if ((string)(isset($tutor['token']) ? $tutor['token'] : '') !== $token) {
        return [null, null, 'Unauthorized cloud request. Please sign in again.'];
    }
    $tier = strtolower((string)(isset($tutor['tier']) ? $tutor['tier'] : 'free'));
    $isAdmin = ($email === ADMIN_EMAIL) || (isset($tutor['role']) && $tutor['role'] === 'admin');
    if ($tier !== 'vip' && !$isAdmin) {
        return [null, null, 'Cloud saving is a VIP feature. Upgrade your plan to back up to the cloud.'];
    }
    return [$tutor, $email, null];
}

/** Shared decode of an uploaded cloud payload. Returns [stored, encoding, json, error]. */
function cloudDecodePayload($input) {
    $encoding = strtolower(trim(isset($input['encoding']) ? $input['encoding'] : 'gzip'));
    if ($encoding !== 'gzip' && $encoding !== 'identity') $encoding = 'gzip';
    $b64 = isset($input['payload']) ? $input['payload'] : '';
    if (!is_string($b64) || $b64 === '') return [null, null, null, 'The request carried no backup payload.'];
    $stored = base64_decode($b64, true);
    if ($stored === false || $stored === '') return [null, null, null, 'The backup payload could not be decoded (bad base64).'];
    if (strlen($stored) > CLOUD_MAX_PAYLOAD_BYTES) {
        return [null, null, null, 'The backup is larger than the 50 MB cloud limit. Keep generated lesson files on your hard disk and try again.'];
    }
    $json = $encoding === 'gzip' ? @gzdecode($stored) : $stored;
    if ($json === false || $json === null) return [null, null, null, 'The backup payload is not valid gzip data.'];
    if (strlen($json) > CLOUD_MAX_RAW_BYTES) {
        return [null, null, null, 'The backup expands beyond the cloud size limit.'];
    }
    if (!is_array(json_decode($json, true))) return [null, null, null, 'The backup is not valid JSON.'];
    return [$stored, $encoding, $json, null];
}

// 6. Database File Read / Write (encrypted file = offline fallback)
function loadTutorsDB() {
    // MySQL-first: when configured, reachable AND populated, the users table
    // is authoritative. An empty table falls through to the file store so the
    // admin seed / existing accounts migrate into MySQL on the next save.
    $mysqlTutors = mysqlLoadAll();
    if ($mysqlTutors !== null && count($mysqlTutors) > 0) {
        if (isset($mysqlTutors[ADMIN_EMAIL])) {
            $mysqlTutors[ADMIN_EMAIL]['tier'] = 'vip';
            $mysqlTutors[ADMIN_EMAIL]['role'] = 'admin';
            $mysqlTutors[ADMIN_EMAIL]['status'] = 'active';
        }
        return $mysqlTutors;
    }
    return loadFileStore();
}

/** Read ONLY the encrypted-file store (never MySQL). Used by loadTutorsDB when
 *  MySQL is empty/unreachable, and by db_migrate as the migration source. */
function loadFileStore() {
    $tutors = [];

    // 1. Try reading encrypted database
    $storeState = 'missing';
    $encryptedAccounts = 0;
    if (file_exists(DB_FILE)) {
        $raw = file_get_contents(DB_FILE);
        $lines = explode("\n", $raw, 2);
        if (count($lines) >= 2) {
            $payload = trim($lines[1]);
            if (!empty($payload)) {
                $decrypted = decryptData($payload);
                if ($decrypted !== null && $decrypted !== false) {
                    $data = json_decode($decrypted, true);
                    if (is_array($data)) {
                        $tutors = $data;
                        $storeState = 'ok';
                    } else {
                        $storeState = 'corrupt';
                    }
                } else {
                    $storeState = 'unreadable';
                }
            } else {
                $storeState = 'empty';
            }
        } else {
            $storeState = 'corrupt';
        }
    }
    $encryptedAccounts = count($tutors);

    // A store that exists but cannot be read is a DATA-INTEGRITY EMERGENCY: the
    // JSON mirror below never contains password hashes, so silently falling back
    // to it produces accounts that nobody can sign in to. Record the fact so the
    // Super Admin Console (and ?action=version) can shout about it, and so
    // saveTutorsDB() refuses to overwrite what is left on disk.
    $GLOBALS['TUTOR_STORE_STATE'] = $storeState;
    $GLOBALS['TUTOR_STORE_ENCRYPTED_ACCOUNTS'] = $encryptedAccounts;

    // 2. Also check JSON database files for any admin force-saved updates
    $altJsonPaths = [
        DATA_DIR . 'tutors_db.json',
        __DIR__ . '/data/tutors_db.json',
        __DIR__ . '/../data/tutors_db.json',
        __DIR__ . '/tutors_db.json',
        __DIR__ . '/../tutors_db.json'
    ];

    foreach ($altJsonPaths as $jPath) {
        if (file_exists($jPath)) {
            $jRaw = file_get_contents($jPath);
            if (!empty($jRaw)) {
                $jData = json_decode($jRaw, true);
                if (is_array($jData)) {
                    foreach ($jData as $key => $val) {
                        if (is_array($val) && isset($val['email'])) {
                            $em = strtolower(trim($val['email']));
                            // Merge/update
                            if (!isset($tutors[$em])) {
                                $tutors[$em] = $val;
                            } else {
                                if (isset($val['tier'])) $tutors[$em]['tier'] = $val['tier'];
                                if (isset($val['status'])) $tutors[$em]['status'] = $val['status'];
                                if (isset($val['role'])) $tutors[$em]['role'] = $val['role'];
                                if (isset($val['notes'])) $tutors[$em]['notes'] = $val['notes'];
                            }
                        }
                    }
                }
            }
        }
    }

    if (empty($tutors)) {
        // Initialize with default admin
        $adminId = 'admin_' . substr(md5(ADMIN_EMAIL), 0, 10);
        $tutors = [
            ADMIN_EMAIL => [
                'id' => $adminId,
                'email' => ADMIN_EMAIL,
                'passwordHash' => password_hash(ADMIN_DEFAULT_PASS, PASSWORD_DEFAULT),
                'name' => 'Super Admin',
                'avatarUrl' => '',
                'avatarId' => 'tutor-admin',
                'bio' => 'Tutomy Master Administrator',
                'teachingMethod' => 'All Frameworks',
                'interests' => 'Curriculum Design & System Management',
                'nativeLanguage' => 'English',
                'country' => 'Global',
                'timezone' => 'UTC',
                'tier' => 'vip',
                'status' => 'active',
                'role' => 'admin',
                'createdAt' => date('c'),
                'lastLogin' => date('c'),
                'deviceId' => 'admin_master_device',
                'token' => bin2hex(random_bytes(32)),
                'notes' => 'Master Super Admin Account',
                'emailVerified' => true,
                'schemaVersion' => AUTH_SCHEMA_VERSION,
                'tierExpiresAt' => '',
                'tierSig' => '',
                'maxAdultLearners' => -1,
                'maxKidsLearners' => -1
            ]
        ];
        saveTutorsDB($tutors);
    }

    // Always enforce master admin is VIP
    if (isset($tutors[ADMIN_EMAIL])) {
        $tutors[ADMIN_EMAIL]['tier'] = 'vip';
        $tutors[ADMIN_EMAIL]['role'] = 'admin';
        $tutors[ADMIN_EMAIL]['status'] = 'active';
    }

    return $tutors;
}

/**
 * Write a file so it can never be seen half-written or emptied.
 *
 * file_put_contents($f, $data, LOCK_EX) truncates on open, so if the lock or
 * the write fails (flock is unavailable on some shared/NFS hosts, disk full,
 * upload racing a save) the store is left EMPTY — and an empty account store is
 * precisely how "every user's password is suddenly wrong" happens. Instead we
 * write a private temp file next to the target and atomically rename it over.
 * The temp name keeps the .php suffix so, even if one is left behind, a direct
 * request executes the PHP guard header and returns 403 instead of the blob.
 */
function writeFileAtomic($path, $content) {
    $tmp = $path . '.' . bin2hex(random_bytes(4)) . '.php';
    $written = @file_put_contents($tmp, $content);
    if ($written !== false && @rename($tmp, $path)) {
        return true;
    }
    @unlink($tmp);
    error_log('[auth.php] atomic write failed for ' . $path . ' — falling back to a direct write.');
    return @file_put_contents($path, $content) !== false;
}

/**
 * Never let a save DROP password material that is already on disk.
 *
 * Several flows can hand us an account record with no hash: the hash-free JSON
 * mirror, a "Force Save" from an old browser tab, an imported backup, or a
 * MySQL round-trip. Writing that record over a good one is what turns a single
 * bad upload into "every user's password is wrong". Any incoming record that is
 * missing its hashes inherits them from the stored record instead.
 */
function preserveStoredHashes($tutorsMap) {
    $stored = [];
    if (file_exists(DB_FILE)) {
        $raw = file_get_contents(DB_FILE);
        $lines = explode("\n", (string)$raw, 2);
        if (count($lines) >= 2) {
            $decrypted = decryptData(trim($lines[1]));
            if ($decrypted !== null && $decrypted !== false) {
                $parsed = json_decode($decrypted, true);
                if (is_array($parsed)) $stored = $parsed;
            }
        }
    }
    if (empty($stored)) return $tutorsMap;

    $rescueHash = 0;
    $rescueSha = 0;
    foreach ($tutorsMap as $em => $tut) {
        if (!is_array($tut) || !isset($stored[$em]) || !is_array($stored[$em])) continue;
        $prev = $stored[$em];
        $hasHash = isset($tut['passwordHash']) && $tut['passwordHash'] !== '';
        $hasSha = isset($tut['passwordHashSha256']) && $tut['passwordHashSha256'] !== '';
        $prevHash = isset($prev['passwordHash']) ? (string)$prev['passwordHash'] : '';
        $prevSha = isset($prev['passwordHashSha256']) ? (string)$prev['passwordHashSha256'] : '';
        if (!$hasHash && $prevHash !== '') {
            $tutorsMap[$em]['passwordHash'] = $prevHash;
            $rescueHash++;
        }
        if (!$hasSha && $prevSha !== '') {
            $tutorsMap[$em]['passwordHashSha256'] = $prevSha;
            $rescueSha++;
        }
    }
    if ($rescueHash || $rescueSha) {
        error_log('[auth.php] preserved stored password hashes on save: ' . $rescueHash . ' bcrypt, ' . $rescueSha . ' offline');
    }
    return $tutorsMap;
}

function saveTutorsDB($tutorsMap) {
    // 0. Never downgrade an account to "no password" just because the caller
    //    handed us a record that has no hash (see preserveStoredHashes).
    $tutorsMap = preserveStoredHashes($tutorsMap);

    // 1. Persist to MySQL when available (authoritative store once populated)
    mysqlUpsertAll($tutorsMap);

    // 2. Save encrypted PHP database
    $json = json_encode($tutorsMap, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    $encrypted = encryptData($json);
    $fileContent = PHP_GUARD_HEADER . $encrypted;
    $res1 = writeFileAtomic(DB_FILE, $fileContent);

    // 2. Also save to tutors_db.json for static fallback compatibility
    $jsonPath = DATA_DIR . 'tutors_db.json';
    $cleanMap = [];
    foreach ($tutorsMap as $k => $tut) {
        $copy = $tut;
        unset($copy['passwordHash']);
        unset($copy['passwordHashSha256']);
        $cleanMap[$k] = $copy;
    }
    @writeFileAtomic($jsonPath, json_encode($cleanMap, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    // Also try root / parent data directory if accessible
    $altJson = __DIR__ . '/../data/tutors_db.json';
    if (is_dir(__DIR__ . '/../data')) {
        @writeFileAtomic($altJson, json_encode($cleanMap, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    return $res1 !== false;
}

// 6. Request Input Parsing
$inputRaw = file_get_contents('php://input');
$input = json_decode($inputRaw, true);
if (!is_array($input)) {
    $input = $_POST;
}

// Admin calls arrive under two namings: the classic auth.php names
// (email / token / password) and the Super Admin Console names
// (adminEmail / adminToken / adminPass). Accept both — an installed PWA can
// still be running an older cached bundle that uses either one, and a tier
// grant that is answered with 403 is the reason "premium never arrived".
if (is_array($input)) {
    if ((!isset($input['email']) || $input['email'] === '') && isset($input['adminEmail'])) $input['email'] = $input['adminEmail'];
    if ((!isset($input['token']) || $input['token'] === '') && isset($input['adminToken'])) $input['token'] = $input['adminToken'];
    if ((!isset($input['password']) || $input['password'] === '')) {
        if (isset($input['adminPass']) && $input['adminPass'] !== '') {
            $input['password'] = $input['adminPass'];
        } elseif (isset($input['adminPassword']) && $input['adminPassword'] !== '') {
            $input['password'] = $input['adminPassword'];
        }
    }
}

$action = isset($_GET['action']) ? $_GET['action'] : (isset($input['action']) ? $input['action'] : '');

// 7. Route Handlers
switch ($action) {

    // ----------------------------------------------------
    // REGISTER TUTOR
    // ----------------------------------------------------
    case 'register':
        $email = strtolower(trim(isset($input['email']) ? $input['email'] : ''));
        $password = isset($input['password']) ? $input['password'] : '';
        $name = trim(isset($input['name']) ? $input['name'] : '');
        $deviceId = isset($input['deviceId']) ? trim($input['deviceId']) : ('dev_' . bin2hex(random_bytes(8)));

        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Please provide a valid email address.']);
            exit;
        }

        if (strlen($password) < 6) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Password must be at least 6 characters.']);
            exit;
        }

        if (empty($name)) {
            $name = explode('@', $email)[0];
        }

        $tutors = loadTutorsDB();

        if (isset($tutors[$email])) {
            http_response_code(409);
            echo json_encode(['success' => false, 'error' => 'An account with this email already exists. Please sign in.']);
            exit;
        }

        $tutorId = 'tut_' . time() . '_' . substr(bin2hex(random_bytes(4)), 0, 6);
        $token = bin2hex(random_bytes(32));

        $newTutor = [
            'id' => $tutorId,
            'email' => $email,
            'passwordHash' => password_hash($password, PASSWORD_DEFAULT),
            'passwordHashSha256' => clientPasswordHash($password),
            'name' => $name,
            'avatarUrl' => isset($input['avatarUrl']) ? $input['avatarUrl'] : '',
            'avatarId' => isset($input['avatarId']) ? $input['avatarId'] : 'tutor-default',
            'bio' => isset($input['bio']) ? $input['bio'] : 'Language Tutor',
            'teachingMethod' => isset($input['teachingMethod']) ? $input['teachingMethod'] : 'Communicative Approach',
            'interests' => isset($input['interests']) ? $input['interests'] : '',
            'nativeLanguage' => isset($input['nativeLanguage']) ? $input['nativeLanguage'] : 'English',
            'hourlyRate' => isset($input['hourlyRate']) ? floatval($input['hourlyRate']) : 25,
            'country' => isset($input['country']) ? $input['country'] : '',
            'timezone' => isset($input['timezone']) ? $input['timezone'] : 'UTC',
            'tier' => 'free',
            'status' => $email === ADMIN_EMAIL ? 'active' : 'pending_verification',
            'role' => ($email === ADMIN_EMAIL) ? 'admin' : 'tutor',
            'createdAt' => date('c'),
            'lastLogin' => date('c'),
            'deviceId' => $deviceId,
            'token' => $token,
            'notes' => '',
            'emailVerified' => $email === ADMIN_EMAIL,
            'verificationCode' => $email === ADMIN_EMAIL ? '' : (string)random_int(100000, 999999),
            // Never trust a browser-supplied verification token. It must be
            // generated on the server and stored only in the authoritative store.
            'verificationToken' => $email === ADMIN_EMAIL ? '' : bin2hex(random_bytes(24)),
            'verificationExpiresAt' => $email === ADMIN_EMAIL ? '' : date('c', time() + 900),
            'schemaVersion' => AUTH_SCHEMA_VERSION,
            'tierExpiresAt' => '',
            'tierSig' => '',
            'maxAdultLearners' => 30,
            'maxKidsLearners' => 30
        ];

        $newTutor = upgradeAccountRecord($newTutor, $email);
        $tutors[$email] = $newTutor;
        if (!saveTutorsDB($tutors)) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to save tutor record to server storage.']);
            exit;
        }

        $mailSent = $email === ADMIN_EMAIL ? true : sendTutorVerificationEmail($email, $name, $newTutor['verificationCode']);
        unset($newTutor['passwordHash']);
        unset($newTutor['passwordHashSha256']);
        echo json_encode([
            'success' => true,
            'pendingVerification' => $email !== ADMIN_EMAIL,
            'mailSent' => $mailSent,
            'message' => $email === ADMIN_EMAIL
                ? 'Registration successful.'
                : ($mailSent ? 'Registration successful. Check your Gmail inbox and Spam folder for the verification code.' : 'Account created and awaiting Gmail verification. If the email does not arrive, ask the administrator to approve the account.'),
            'tutor' => $newTutor,
            'token' => $token
        ]);
        break;

    // ----------------------------------------------------
    // LOGIN TUTOR OR ADMIN
    // ----------------------------------------------------
    case 'login':
        $email = strtolower(trim(isset($input['email']) ? $input['email'] : ''));
        $password = isset($input['password']) ? $input['password'] : '';
        $deviceId = isset($input['deviceId']) ? trim($input['deviceId']) : '';

        if (empty($email) || empty($password)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Email and password are required.']);
            exit;
        }

        $tutors = loadTutorsDB();

        // Special fallback for initial admin provisioning if missing
        if ($email === ADMIN_EMAIL && !isset($tutors[$email])) {
            $tutors[$email] = [
                'id' => 'admin_' . substr(md5(ADMIN_EMAIL), 0, 10),
                'email' => ADMIN_EMAIL,
                'passwordHash' => password_hash(ADMIN_DEFAULT_PASS, PASSWORD_DEFAULT),
                'name' => 'Super Admin',
                'avatarUrl' => '',
                'avatarId' => 'tutor-admin',
                'bio' => 'Tutomy Master Administrator',
                'tier' => 'vip',
                'status' => 'active',
                'role' => 'admin',
                'createdAt' => date('c'),
                'lastLogin' => date('c'),
                'deviceId' => $deviceId,
                'token' => bin2hex(random_bytes(32)),
                'notes' => 'Master Super Admin',
                'emailVerified' => true,
                'schemaVersion' => AUTH_SCHEMA_VERSION,
                'tierExpiresAt' => '',
                'tierSig' => '',
                'maxAdultLearners' => -1,
                'maxKidsLearners' => -1
            ];
            saveTutorsDB($tutors);
        }

        if (!isset($tutors[$email])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Account not found. Please check your email or sign up.']);
            exit;
        }

        $tutor = $tutors[$email];

        // Check password verification
        $passwordValid = false;
        if (tutorPasswordMatches($tutor, $password)) {
            $passwordValid = true;
        } elseif ($email === ADMIN_EMAIL && $password === ADMIN_DEFAULT_PASS) {
            $passwordValid = true;
            // Update hash if plaintext matched
            $tutor['passwordHash'] = password_hash(ADMIN_DEFAULT_PASS, PASSWORD_DEFAULT);
        }

        if (!$passwordValid) {
            /*
             * Distinguish "wrong password" from "this account has no password at all"
             * — a hash-less account can never match, so the generic 401 left those
             * users with no way forward: "Repair sign-in" can only report them, and
             * the sole fix was an admin reset out of hours. This answers 409 +
             * `needsPasswordReset` so the app can offer the account holder a
             * self-service reset, proved by a code mailed to the address on file.
             */
            $hasUsableHash = trim((string)(isset($tutor['passwordHash']) ? $tutor['passwordHash'] : '')) !== ''
                || trim((string)(isset($tutor['passwordHashSha256']) ? $tutor['passwordHashSha256'] : '')) !== '';
            if (!$hasUsableHash) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'needsPasswordReset' => true,
                    'email' => $email,
                    'error' => 'This account has no usable password on the host yet, so no password can match it. Set a new one — a 6-digit code confirms it is really you.'
                ]);
                exit;
            }
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Incorrect password. Please try again.']);
            exit;
        }

        if (isset($tutor['status']) && $tutor['status'] === 'suspended') {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'This tutor account is currently suspended. Please contact info.tutomy@gmail.com for assistance.']);
            exit;
        }
        if ($email !== ADMIN_EMAIL && (($tutor['status'] ?? '') === 'pending_verification' || empty($tutor['emailVerified']))) {
            http_response_code(403);
            echo json_encode(['success' => false, 'pendingVerification' => true, 'email' => $email, 'error' => 'Please verify your Gmail address before signing in.']);
            exit;
        }

        // Refresh token & update last login
        $token = bin2hex(random_bytes(32));
        $tutor['token'] = $token;
        $tutor['lastLogin'] = date('c');
        if (!empty($deviceId)) {
            $tutor['deviceId'] = $deviceId;
        }

        $tutors[$email] = $tutor;
        saveTutorsDB($tutors);

        // This is the only other moment the plaintext exists server-side: while a
        // verified sign-in happens. Capture it so an older account becomes
        // viewable in the vault the first time its owner logs in.
        vaultCapturePassword($email, $password, 'self sign-in');

        unset($tutor['passwordHash']);
        unset($tutor['passwordHashSha256']);
        echo json_encode([
            'success' => true,
            'message' => 'Login successful!',
            'tutor' => $tutor,
            'token' => $token
        ]);
        break;

    // ----------------------------------------------------
    // RESEND GMAIL CODE
    // ----------------------------------------------------
    case 'resend_code':
        $email = strtolower(trim(isset($input['email']) ? $input['email'] : ''));
        $tutors = loadTutorsDB();
        if ($email === '' || !isset($tutors[$email])) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Account not found.']);
            break;
        }
        if ($email === ADMIN_EMAIL || !empty($tutors[$email]['emailVerified'])) {
            echo json_encode(['success' => false, 'error' => 'This account is already verified.']);
            break;
        }
        $tutors[$email]['verificationCode'] = (string)random_int(100000, 999999);
        $tutors[$email]['verificationToken'] = bin2hex(random_bytes(24));
        $tutors[$email]['verificationExpiresAt'] = date('c', time() + 900);
        $tutors[$email]['status'] = 'pending_verification';
        if (!saveTutorsDB($tutors)) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to save the new verification code.']);
            break;
        }
        $sent = sendTutorVerificationEmail($email, $tutors[$email]['name'] ?? 'Tutor', $tutors[$email]['verificationCode']);
        echo json_encode([
            'success' => $sent,
            'mailSent' => $sent,
            'message' => $sent ? 'A new verification code was sent to your Gmail.' : 'The account was updated, but the host mail transport could not send the message. Ask the administrator to verify the account.',
            'pendingVerification' => true
        ]);
        break;

    // ----------------------------------------------------
    // VERIFY GMAIL CODE / ADMIN APPROVAL
    // ----------------------------------------------------
    case 'verify_code':
        $email = strtolower(trim(isset($input['email']) ? $input['email'] : ''));
        $code = trim((string)(isset($input['code']) ? $input['code'] : ''));
        $tutors = loadTutorsDB();
        if ($email === '' || !isset($tutors[$email])) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Account not found.']);
            break;
        }
        $isAdminApproval = $code === 'ADMIN_APPROVE';
        if ($isAdminApproval) {
            $adminEmail = strtolower(trim(isset($input['adminEmail']) ? $input['adminEmail'] : ''));
            $adminToken = trim(isset($input['adminToken']) ? $input['adminToken'] : '');
            $adminPass = isset($input['adminPassword']) ? $input['adminPassword'] : (isset($input['password']) ? $input['password'] : '');
            $authorized = $adminEmail === ADMIN_EMAIL && $adminPass === ADMIN_DEFAULT_PASS;
            if (!$authorized && isset($tutors[$adminEmail]) && (($tutors[$adminEmail]['role'] ?? '') === 'admin') && hash_equals((string)($tutors[$adminEmail]['token'] ?? ''), $adminToken)) $authorized = true;
            if (!$authorized) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
                break;
            }
        } else {
            $expires = isset($tutors[$email]['verificationExpiresAt']) ? strtotime($tutors[$email]['verificationExpiresAt']) : 0;
            $storedCode = (string)($tutors[$email]['verificationCode'] ?? '');
            $storedToken = (string)($tutors[$email]['verificationToken'] ?? '');
            if ($code === '' || (($storedCode === '' || !hash_equals($storedCode, $code)) && ($storedToken === '' || !hash_equals($storedToken, $code))) || ($expires && $expires < time())) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid or expired verification code. Request a new code or contact the administrator.']);
                break;
            }
        }
        $tutors[$email]['emailVerified'] = true;
        $tutors[$email]['status'] = 'active';
        $tutors[$email]['verificationCode'] = '';
        $tutors[$email]['verificationToken'] = '';
        $tutors[$email]['verificationExpiresAt'] = '';
        saveTutorsDB($tutors);
        $clean = $tutors[$email];
        unset($clean['passwordHash']);
        unset($clean['passwordHashSha256']);
        echo json_encode(['success' => true, 'message' => 'Gmail verified successfully.', 'tutor' => $clean]);
        break;

    // ----------------------------------------------------
    // SELF-SERVICE PASSWORD RESET
    // ----------------------------------------------------
    // An account whose password hash was lost cannot be fixed by an admin alone
    // without a phone call, which is why "11 account(s) have no usable password
    // hash" sat there. These two actions let the account HOLDER prove control of
    // the address on file with a one-time code and then set a password themselves,
    // which is what actually clears that warning.
    //
    // The code reuses the verification_code / verification_expires_at columns so it
    // persists through MySQL exactly like the sign-up code does. Only one code can
    // be outstanding per account, which is fine: a person is either verifying their
    // address or resetting a password, never both at once.
    case 'password_reset_request':
        $email = strtolower(trim(isset($input['email']) ? $input['email'] : ''));
        $tutors = loadTutorsDB();
        // Answer identically whether or not the address has an account, so this
        // cannot be used to discover who is registered here.
        $resetGeneric = ['success' => true, 'mailSent' => true, 'message' => 'If that address has an account here, a 6-digit code is on its way. It expires in 15 minutes.'];
        if ($email === '' || !isset($tutors[$email])) {
            echo json_encode($resetGeneric);
            break;
        }
        $tutors[$email]['verificationCode'] = (string)random_int(100000, 999999);
        $tutors[$email]['verificationToken'] = bin2hex(random_bytes(24));
        $tutors[$email]['verificationExpiresAt'] = date('c', time() + 900);
        // Deliberately does NOT touch `status` or `emailVerified`: resetting a
        // password must never change whether an account is allowed to sign in.
        $resetSaved = saveTutorsDB($tutors);
        $resetSent = $resetSaved && sendTutorPasswordResetEmail($email, isset($tutors[$email]['name']) ? $tutors[$email]['name'] : 'Tutor', $tutors[$email]['verificationCode']);
        if (!$resetSent) {
            echo json_encode([
                'success' => false,
                'mailSent' => false,
                'error' => 'The code was created, but the host mail transport could not send it. Ask the administrator to set a new password from the Super Admin Console (Tutors tab → 🔑 Password).'
            ]);
            break;
        }
        echo json_encode($resetGeneric);
        break;

    case 'password_reset_confirm':
        $email = strtolower(trim(isset($input['email']) ? $input['email'] : ''));
        $code = trim((string)(isset($input['code']) ? $input['code'] : ''));
        $newPassword = isset($input['newPassword']) ? (string)$input['newPassword'] : '';
        $tutors = loadTutorsDB();
        if ($email === '' || !isset($tutors[$email])) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Account not found.']);
            break;
        }
        if (strlen($newPassword) < 6) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Please choose a password of at least 6 characters.']);
            break;
        }
        $resetExpires = isset($tutors[$email]['verificationExpiresAt']) ? strtotime($tutors[$email]['verificationExpiresAt']) : 0;
        $resetStored = (string)(isset($tutors[$email]['verificationCode']) ? $tutors[$email]['verificationCode'] : '');
        if ($code === '' || $resetStored === '' || !hash_equals($resetStored, $code) || ($resetExpires && $resetExpires < time())) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'That code is wrong or has expired. Request a new one and try again.']);
            break;
        }
        // Both hashes, exactly like the admin reset: bcrypt for the server check and
        // the salted SHA-256 the browser's offline fallback verifies against.
        $tutors[$email]['passwordHash'] = password_hash($newPassword, PASSWORD_DEFAULT);
        $tutors[$email]['passwordHashSha256'] = clientPasswordHash($newPassword);
        $tutors[$email]['passwordUpdatedAt'] = date('c');
        $tutors[$email]['passwordUpdatedBy'] = 'self-service reset';
        // Single use — and again, no status change.
        $tutors[$email]['verificationCode'] = '';
        $tutors[$email]['verificationToken'] = '';
        $tutors[$email]['verificationExpiresAt'] = '';
        if (!saveTutorsDB($tutors)) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'The new password could not be saved. Check the data/ permissions on the host.']);
            break;
        }
        vaultCapturePassword($email, $newPassword, 'self-service reset');
        try { if (mysqlIsLive()) mysqlUpsertOne($tutors[$email], $email); } catch (Exception $ignored) {}
        echo json_encode(['success' => true, 'message' => 'Your new password is set. You can sign in with it now.']);
        break;

    // ----------------------------------------------------
    // CHECK SESSION / GET PROFILE / FORCE REFRESH STATUS
    // ----------------------------------------------------
    case 'check_status':
    case 'force_refresh_status':
    case 'get_tier':
    case 'check_session':
        $token = isset($input['token']) ? trim($input['token']) : '';
        $email = strtolower(trim(isset($input['email']) ? $input['email'] : ''));

        if (empty($email)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Email required to check tier status.']);
            exit;
        }

        $tutors = loadTutorsDB();
        if (!isset($tutors[$email])) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Account not found in server database.']);
            exit;
        }

        $tutor = $tutors[$email];

        // If admin account, always ensure VIP and admin role
        if ($email === ADMIN_EMAIL || (isset($tutor['role']) && $tutor['role'] === 'admin')) {
            $tutor['tier'] = 'vip';
            $tutor['role'] = 'admin';
            $tutor['status'] = 'active';
            $tutor['emailVerified'] = true;
        }

        if ($email !== ADMIN_EMAIL && (($tutor['status'] ?? '') === 'pending_verification' || empty($tutor['emailVerified']))) {
            http_response_code(403);
            echo json_encode(['success' => false, 'pendingVerification' => true, 'email' => $email, 'error' => 'Please verify your Gmail address before signing in.']);
            exit;
        }

        // If token provided and empty in DB, sync it
        if (!empty($token) && (empty($tutor['token']) || $tutor['token'] !== $token)) {
            $tutor['token'] = $token;
            $tutors[$email]['token'] = $token;
            saveTutorsDB($tutors);
        }

        unset($tutor['passwordHash']);
        unset($tutor['passwordHashSha256']);
        echo json_encode([
            'success' => true,
            'tutor' => $tutor,
            'tier' => isset($tutor['tier']) ? $tutor['tier'] : 'free',
            'role' => isset($tutor['role']) ? $tutor['role'] : 'tutor',
            'status' => isset($tutor['status']) ? $tutor['status'] : 'active',
            'verifiedAt' => date('c')
        ]);
        break;

    // ----------------------------------------------------
    // SYNC PROFILE (TUTOR SELF UPDATE)
    // ----------------------------------------------------
    case 'sync_profile':
        $token = isset($input['token']) ? trim($input['token']) : '';
        $email = strtolower(trim(isset($input['email']) ? $input['email'] : ''));

        $tutors = loadTutorsDB();
        if (!isset($tutors[$email]) || (($tutors[$email]['token'] ?? '') !== $token)) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Unauthorized profile sync.']);
            exit;
        }

        $tutor = &$tutors[$email];
        if (isset($input['name'])) $tutor['name'] = trim($input['name']);
        if (isset($input['avatarUrl'])) $tutor['avatarUrl'] = $input['avatarUrl'];
        if (isset($input['avatarId'])) $tutor['avatarId'] = $input['avatarId'];
        if (isset($input['bio'])) $tutor['bio'] = $input['bio'];
        if (isset($input['teachingMethod'])) $tutor['teachingMethod'] = $input['teachingMethod'];
        if (isset($input['interests'])) $tutor['interests'] = $input['interests'];
        if (isset($input['nativeLanguage'])) $tutor['nativeLanguage'] = $input['nativeLanguage'];
        if (isset($input['hourlyRate'])) $tutor['hourlyRate'] = floatval($input['hourlyRate']);
        if (isset($input['country'])) $tutor['country'] = $input['country'];
        if (isset($input['timezone'])) $tutor['timezone'] = $input['timezone'];

        saveTutorsDB($tutors);

        $cleanTutor = $tutor;
        unset($cleanTutor['passwordHash']);
        unset($cleanTutor['passwordHashSha256']);
        echo json_encode([
            'success' => true,
            'message' => 'Profile updated successfully.',
            'tutor' => $cleanTutor
        ]);
        break;

    // ----------------------------------------------------
    // VIP CLOUD BACKUP: SAVE
    // ----------------------------------------------------
    // One upsert = one row write. The payload arrives gzip-compressed + base64
    // so a shared host never sees a multi-megabyte JSON body, and the tiny index
    // rows are rewritten in one transaction alongside it.
    case 'cloud_save': {
        list($cloudTutor, $cloudEmail, $cloudAuthError) = cloudRequireVip($input);
        if ($cloudAuthError) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => $cloudAuthError]);
            exit;
        }
        $pdo = mysqlConnect();
        if (!$pdo || !cloudEnsureSchema($pdo)) {
            http_response_code(503);
            echo json_encode(['success' => false, 'error' => 'Cloud storage is unavailable: MySQL is not configured or reachable on the server.']);
            exit;
        }
        list($cloudStored, $cloudEncoding, $cloudJson, $cloudDecodeError) = cloudDecodePayload($input);
        if ($cloudDecodeError) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => $cloudDecodeError]);
            exit;
        }
        $cloudDevice = substr(trim(isset($input['device']) ? $input['device'] : ''), 0, 64);
        $cloudNow = date('c');
        $cloudChecksum = sha1($cloudStored);
        try {
            $pdo->prepare(
                'INSERT INTO cloud_backups (email,payload,encoding,bytes,raw_bytes,revision,device,checksum,created_at,updated_at)
                 VALUES (?,?,?,?,?,1,?,?,?,?)
                 ON DUPLICATE KEY UPDATE payload=VALUES(payload), encoding=VALUES(encoding), bytes=VALUES(bytes),
                   raw_bytes=VALUES(raw_bytes), revision=revision+1, device=VALUES(device),
                   checksum=VALUES(checksum), updated_at=VALUES(updated_at)'
            )->execute([
                $cloudEmail,
                $cloudStored,
                $cloudEncoding,
                strlen($cloudStored),
                strlen($cloudJson),
                $cloudDevice,
                $cloudChecksum,
                $cloudNow,
                $cloudNow
            ]);

            $cloudAllowed = json_decode(CLOUD_INDEX_SECTIONS, true);
            $cloudIndex = (isset($input['index']) && is_array($input['index'])) ? $input['index'] : [];
            $pdo->beginTransaction();
            try {
                $pdo->prepare('DELETE FROM cloud_backup_index WHERE email = ?')->execute([$cloudEmail]);
                $cloudIns = $pdo->prepare('INSERT INTO cloud_backup_index (email,section,item_count,bytes,updated_at) VALUES (?,?,?,?,?)');
                foreach ($cloudIndex as $cloudRow) {
                    if (!is_array($cloudRow)) continue;
                    $cloudSection = isset($cloudRow['section']) ? strtolower(trim($cloudRow['section'])) : '';
                    if ($cloudSection === '' || !in_array($cloudSection, $cloudAllowed, true)) continue;
                    $cloudIns->execute([
                        $cloudEmail,
                        $cloudSection,
                        intval(isset($cloudRow['count']) ? $cloudRow['count'] : 0),
                        intval(isset($cloudRow['bytes']) ? $cloudRow['bytes'] : 0),
                        $cloudNow
                    ]);
                }
                $pdo->commit();
            } catch (Exception $indexError) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                throw $indexError;
            }

            $cloudRevStmt = $pdo->prepare('SELECT revision FROM cloud_backups WHERE email = ?');
            $cloudRevStmt->execute([$cloudEmail]);
            $cloudRevision = (int)$cloudRevStmt->fetchColumn();

            echo json_encode([
                'success' => true,
                'revision' => $cloudRevision,
                'bytes' => strlen($cloudStored),
                'rawBytes' => strlen($cloudJson),
                'savedAt' => $cloudNow
            ]);
        } catch (Exception $cloudSaveError) {
            error_log('[auth.php] cloud_save failed: ' . $cloudSaveError->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Could not write the cloud backup. Please try again.']);
        }
        break;
    }

    // ----------------------------------------------------
    // VIP CLOUD BACKUP: LOAD (single row read)
    // ----------------------------------------------------
    case 'cloud_load': {
        list($cloudTutor, $cloudEmail, $cloudAuthError) = cloudRequireVip($input);
        if ($cloudAuthError) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => $cloudAuthError]);
            exit;
        }
        $pdo = mysqlConnect();
        if (!$pdo || !cloudEnsureSchema($pdo)) {
            http_response_code(503);
            echo json_encode(['success' => false, 'error' => 'Cloud storage is unavailable: MySQL is not configured or reachable on the server.']);
            exit;
        }
        try {
            $cloudStmt = $pdo->prepare('SELECT payload, encoding, bytes, raw_bytes, revision, updated_at, checksum FROM cloud_backups WHERE email = ?');
            $cloudStmt->execute([$cloudEmail]);
            $cloudRow = $cloudStmt->fetch();
            if (!$cloudRow || $cloudRow['payload'] === null || $cloudRow['payload'] === '') {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'No cloud backup exists for this account yet.']);
                exit;
            }
            echo json_encode([
                'success' => true,
                'payload' => base64_encode($cloudRow['payload']),
                'encoding' => $cloudRow['encoding'],
                'bytes' => (int)$cloudRow['bytes'],
                'rawBytes' => (int)$cloudRow['raw_bytes'],
                'revision' => (int)$cloudRow['revision'],
                'updatedAt' => $cloudRow['updated_at'],
                'checksum' => $cloudRow['checksum']
            ]);
        } catch (Exception $cloudLoadError) {
            error_log('[auth.php] cloud_load failed: ' . $cloudLoadError->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Could not read the cloud backup. Please try again.']);
        }
        break;
    }

    // ----------------------------------------------------
    // VIP CLOUD BACKUP: INFO (dashboard status — never reads the payload)
    // ----------------------------------------------------
    case 'cloud_info': {
        list($cloudTutor, $cloudEmail, $cloudAuthError) = cloudRequireVip($input);
        if ($cloudAuthError) {
            // Answered with 200 so the settings panel can offer the VIP upgrade
            // instead of logging a failed request on every open.
            echo json_encode([
                'success' => false,
                'vipRequired' => (strpos($cloudAuthError, 'VIP') !== false),
                'exists' => false,
                'error' => $cloudAuthError
            ]);
            exit;
        }
        $pdo = mysqlConnect();
        if (!$pdo || !cloudEnsureSchema($pdo)) {
            http_response_code(503);
            echo json_encode(['success' => false, 'exists' => false, 'error' => 'Cloud storage is unavailable: MySQL is not configured or reachable on the server.']);
            exit;
        }
        try {
            $cloudStmt = $pdo->prepare('SELECT bytes, raw_bytes, revision, updated_at, device FROM cloud_backups WHERE email = ?');
            $cloudStmt->execute([$cloudEmail]);
            $cloudRow = $cloudStmt->fetch();
            $cloudIdxStmt = $pdo->prepare('SELECT section, item_count, bytes FROM cloud_backup_index WHERE email = ?');
            $cloudIdxStmt->execute([$cloudEmail]);
            $cloudSections = [];
            foreach ($cloudIdxStmt->fetchAll() as $cloudIdxRow) {
                $cloudSections[] = [
                    'section' => $cloudIdxRow['section'],
                    'count' => (int)$cloudIdxRow['item_count'],
                    'bytes' => (int)$cloudIdxRow['bytes']
                ];
            }
            echo json_encode([
                'success' => true,
                'exists' => (bool)$cloudRow,
                'bytes' => $cloudRow ? (int)$cloudRow['bytes'] : 0,
                'rawBytes' => $cloudRow ? (int)$cloudRow['raw_bytes'] : 0,
                'revision' => $cloudRow ? (int)$cloudRow['revision'] : 0,
                'updatedAt' => $cloudRow ? $cloudRow['updated_at'] : '',
                'device' => $cloudRow ? $cloudRow['device'] : '',
                'sections' => $cloudSections,
                'maxBytes' => CLOUD_MAX_PAYLOAD_BYTES
            ]);
        } catch (Exception $cloudInfoError) {
            error_log('[auth.php] cloud_info failed: ' . $cloudInfoError->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'exists' => false, 'error' => 'Could not read the cloud status.']);
        }
        break;
    }

    // ----------------------------------------------------
    // VIP CLOUD BACKUP: DELETE
    // ----------------------------------------------------
    case 'cloud_delete': {
        list($cloudTutor, $cloudEmail, $cloudAuthError) = cloudRequireVip($input);
        if ($cloudAuthError) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => $cloudAuthError]);
            exit;
        }
        $pdo = mysqlConnect();
        if (!$pdo || !cloudEnsureSchema($pdo)) {
            http_response_code(503);
            echo json_encode(['success' => false, 'error' => 'Cloud storage is unavailable: MySQL is not configured or reachable on the server.']);
            exit;
        }
        try {
            $pdo->prepare('DELETE FROM cloud_backups WHERE email = ?')->execute([$cloudEmail]);
            $pdo->prepare('DELETE FROM cloud_backup_index WHERE email = ?')->execute([$cloudEmail]);
            echo json_encode(['success' => true, 'message' => 'Cloud backup deleted.']);
        } catch (Exception $cloudDeleteError) {
            error_log('[auth.php] cloud_delete failed: ' . $cloudDeleteError->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Could not delete the cloud backup.']);
        }
        break;
    }

    // ----------------------------------------------------
    // ADMIN: GET ALL TUTORS
    // ----------------------------------------------------
    case 'get_tutors':
        $adminToken = isset($input['token']) ? trim($input['token']) : '';
        $adminEmail = strtolower(trim(isset($input['email']) ? $input['email'] : ''));

        $tutors = loadTutorsDB();
        $isAdmin = false;

        if (isset($tutors[$adminEmail]) && isset($tutors[$adminEmail]['role']) && $tutors[$adminEmail]['role'] === 'admin' && (($tutors[$adminEmail]['token'] ?? '') === $adminToken)) {
            $isAdmin = true;
        }

        if (!$isAdmin && $adminEmail === ADMIN_EMAIL) {
            // Also allow direct pass verification for admin
            if (isset($input['password']) && $input['password'] === ADMIN_DEFAULT_PASS) {
                $isAdmin = true;
            }
        }

        if (!$isAdmin) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
            exit;
        }

        $list = [];
        foreach ($tutors as $em => $tut) {
            $copy = $tut;
            unset($copy['passwordHash']);
            unset($copy['passwordHashSha256']);
            unset($copy['token']);
            $list[] = $copy;
        }

        echo json_encode([
            'success' => true,
            'tutors' => $list,
            'count' => count($list),
            'serverTime' => date('c')
        ]);
        break;

    // ----------------------------------------------------
    // ADMIN: UPDATE TUTOR TIER OR STATUS
    // ----------------------------------------------------
    case 'update_tier':
        $adminToken = isset($input['token']) ? trim($input['token']) : '';
        $adminEmail = strtolower(trim(isset($input['email']) ? $input['email'] : ''));
        $targetEmail = strtolower(trim(isset($input['targetEmail']) ? $input['targetEmail'] : ''));
        $newTier = isset($input['tier']) ? strtolower(trim($input['tier'])) : '';
        $newStatus = isset($input['status']) ? strtolower(trim($input['status'])) : '';
        $notes = isset($input['notes']) ? trim($input['notes']) : null;

        $tutors = loadTutorsDB();
        $isAdmin = (isset($tutors[$adminEmail]) && isset($tutors[$adminEmail]['role']) && $tutors[$adminEmail]['role'] === 'admin' && (($tutors[$adminEmail]['token'] ?? '') === $adminToken));
        if (!$isAdmin && $adminEmail === ADMIN_EMAIL && isset($input['password']) && $input['password'] === ADMIN_DEFAULT_PASS) {
            $isAdmin = true;
        }

        if (!$isAdmin) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
            exit;
        }

        if (!isset($tutors[$targetEmail])) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Target tutor not found.']);
            exit;
        }

        $allowedTiers = ['free', 'pro', 'vip', 'premium', 'elite'];
        $tierChanged = false;
        if (in_array($newTier, $allowedTiers, true)) {
            $tutors[$targetEmail]['tier'] = normalizeTierLabel($newTier);
            $tierChanged = true;
        }

        if (in_array($newStatus, ['active', 'suspended'], true)) {
            $tutors[$targetEmail]['status'] = $newStatus;
        }

        if ($notes !== null) {
            $tutors[$targetEmail]['notes'] = $notes;
        }

        // Duration-based grants: honor explicit tierExpiresAt, else derive from
        // durationDays (VIP 1.5M/120d, Pro/Premium 1M/60d by default). Free clears
        // it. Only applied when the tier itself is being granted/changed — a plain
        // status toggle never touches expiry or the signature.
        if ($tierChanged) {
            $durationDays = isset($input['durationDays']) ? intval($input['durationDays']) : 0;
            $explicitExpiry = isset($input['tierExpiresAt']) ? trim($input['tierExpiresAt']) : '';
            $granted = $tutors[$targetEmail]['tier'];
            if ($granted === 'free') {
                $tutors[$targetEmail]['tierExpiresAt'] = '';
                $tutors[$targetEmail]['tierSig'] = '';
            } elseif ($explicitExpiry !== '') {
                $tutors[$targetEmail]['tierExpiresAt'] = $explicitExpiry;
            } elseif ($durationDays > 0) {
                $tutors[$targetEmail]['tierExpiresAt'] = date('c', time() + $durationDays * 86400);
            } elseif (empty($tutors[$targetEmail]['tierExpiresAt'])) {
                $days = $granted === 'vip' ? 120 : 60;
                $tutors[$targetEmail]['tierExpiresAt'] = date('c', time() + $days * 86400);
            }
            // Re-sign so the client's tamper-evidence check passes after any grant
            $sigEmail = strtolower(trim($targetEmail));
            $sigExpiry = isset($tutors[$targetEmail]['tierExpiresAt']) ? $tutors[$targetEmail]['tierExpiresAt'] : '';
            $tutors[$targetEmail]['tierSig'] = hash_hmac(
                'sha256',
                $sigEmail . '|' . $granted . '|' . $sigExpiry,
                getenv('TIER_SIGNING_SECRET') ?: 'tutomy-tier-signing-v1'
            );
            $tutors[$targetEmail]['schemaVersion'] = AUTH_SCHEMA_VERSION;
        }

        saveTutorsDB($tutors);

        $cleanTutor = $tutors[$targetEmail];
        unset($cleanTutor['passwordHash']);
        unset($cleanTutor['passwordHashSha256']);
        echo json_encode([
            'success' => true,
            'message' => "Tutor {$targetEmail} updated to tier: {$cleanTutor['tier']}" . (!empty($cleanTutor['tierExpiresAt']) ? " (until " . date('Y-m-d', strtotime($cleanTutor['tierExpiresAt'])) . ")" : ""),
            'tutor' => $cleanTutor
        ]);
        break;

    // ----------------------------------------------------
    // ADMIN: SET / RESET A TUTOR PASSWORD
    // Rewrites ONE account's password only. Two hashes are stored for the same
    // password: the server-side bcrypt hash (used by password_verify) and the
    // client-compatible salted SHA-256 hash (used by the browser's offline
    // fallback), so the new password works for online AND offline sign-in.
    // ----------------------------------------------------
    case 'set_password':
        $adminToken = isset($input['token']) ? trim($input['token']) : '';
        $adminEmail = strtolower(trim(isset($input['email']) ? $input['email'] : ''));
        $targetEmail = strtolower(trim(isset($input['targetEmail']) ? $input['targetEmail'] : ''));
        $newPassword = isset($input['newPassword']) ? (string)$input['newPassword'] : '';

        $tutors = loadTutorsDB();
        $isAdmin = (isset($tutors[$adminEmail]) && isset($tutors[$adminEmail]['role']) && $tutors[$adminEmail]['role'] === 'admin' && (($tutors[$adminEmail]['token'] ?? '') === $adminToken));
        if (!$isAdmin && $adminEmail === ADMIN_EMAIL && isset($input['password']) && $input['password'] === ADMIN_DEFAULT_PASS) {
            $isAdmin = true;
        }
        if (!$isAdmin) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
            exit;
        }
        if ($targetEmail === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'A target tutor email is required.']);
            exit;
        }
        if (strlen($newPassword) < 6) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'The new password must be at least 6 characters.']);
            exit;
        }
        if (!isset($tutors[$targetEmail])) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Target tutor not found.']);
            exit;
        }

        $tutors[$targetEmail]['passwordHash'] = password_hash($newPassword, PASSWORD_DEFAULT);
        $tutors[$targetEmail]['passwordHashSha256'] = clientPasswordHash($newPassword);
        $tutors[$targetEmail]['passwordUpdatedAt'] = date('c');
        $tutors[$targetEmail]['passwordUpdatedBy'] = $adminEmail !== '' ? $adminEmail : ADMIN_EMAIL;
        // Keep the live sessions of that tutor valid — an admin password reset must
        // not sign the tutor out of a lesson in progress. Only the password changes.
        saveTutorsDB($tutors);

        // Record the new plaintext in the credential vault so the console can show
        // and re-check it later without touching the tutor's live session.
        vaultCapturePassword($targetEmail, $newPassword, $adminEmail !== '' ? $adminEmail : ADMIN_EMAIL);

        // Mirror the change into MySQL when the database store is in use.
        $mysqlSynced = false;
        try {
            if (mysqlIsLive()) {
                mysqlUpsertOne($tutors[$targetEmail], $targetEmail);
                $mysqlSynced = true;
            }
        } catch (Exception $e) {
            $mysqlSynced = false;
        }

        $cleanTutor = $tutors[$targetEmail];
        unset($cleanTutor['passwordHash']);
        unset($cleanTutor['passwordHashSha256']);
        echo json_encode([
            'success' => true,
            'message' => "Password updated for {$targetEmail}." . ($mysqlSynced ? ' Synced to MySQL too.' : ''),
            'tutor' => $cleanTutor,
            'mysqlSynced' => $mysqlSynced,
            'updatedAt' => $tutors[$targetEmail]['passwordUpdatedAt']
        ]);
        break;

    // ----------------------------------------------------
    // ADMIN: DELETE TUTOR
    // ----------------------------------------------------
    case 'delete_tutor':
        $adminToken = isset($input['token']) ? trim($input['token']) : '';
        $adminEmail = strtolower(trim(isset($input['email']) ? $input['email'] : ''));
        $targetEmail = strtolower(trim(isset($input['targetEmail']) ? $input['targetEmail'] : ''));

        $tutors = loadTutorsDB();
        $isAdmin = (isset($tutors[$adminEmail]) && isset($tutors[$adminEmail]['role']) && $tutors[$adminEmail]['role'] === 'admin' && (($tutors[$adminEmail]['token'] ?? '') === $adminToken));

        if (!$isAdmin) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
            exit;
        }

        if ($targetEmail === ADMIN_EMAIL) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Cannot delete master admin account.']);
            exit;
        }

        if (isset($tutors[$targetEmail])) {
            unset($tutors[$targetEmail]);
            mysqlDeleteUser($targetEmail);
            saveTutorsDB($tutors);
        }

        echo json_encode(['success' => true, 'message' => "Tutor {$targetEmail} deleted."]);
        break;

    // ----------------------------------------------------
    // ADMIN: FORCE SAVE DATABASE TO DISK FILE
    // ----------------------------------------------------
    case 'force_save_db':
    case 'force_save_tutors':
        $adminToken = isset($input['token']) ? trim($input['token']) : '';
        $adminEmail = strtolower(trim(isset($input['email']) ? $input['email'] : ''));

        $tutors = loadTutorsDB();
        $isAdmin = (isset($tutors[$adminEmail]) && isset($tutors[$adminEmail]['role']) && $tutors[$adminEmail]['role'] === 'admin' && (($tutors[$adminEmail]['token'] ?? '') === $adminToken));
        if (!$isAdmin && $adminEmail === ADMIN_EMAIL && isset($input['password']) && $input['password'] === ADMIN_DEFAULT_PASS) {
            $isAdmin = true;
        }
        // Knowing the master admin's e-mail is NOT proof of identity. Trusting
        // it let any caller list accounts, rewrite the whole store or hand
        // itself VIP access without a token or password. The token/password
        // checks above are now the only way in.


        if (!$isAdmin) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
            break;
        }

        $incomingList = isset($input['tutors']) ? $input['tutors'] : (isset($input['data']) ? $input['data'] : null);
        if ($incomingList && is_array($incomingList)) {
            $newDB = [];
            // Check if array list or associative map
            foreach ($incomingList as $key => $item) {
                if (is_array($item) && isset($item['email'])) {
                    $em = strtolower(trim($item['email']));
                    $newDB[$em] = $item;
                } elseif (is_array($item) && is_string($key)) {
                    $newDB[strtolower(trim($key))] = $item;
                }
            }
            if (!empty($newDB)) {
                $tutors = array_merge($tutors, $newDB);
            }
        }

        $saved = saveTutorsDB($tutors);
        if ($saved) {
            echo json_encode([
                'success' => true,
                'message' => 'Successfully force-saved and encrypted tutors database to server disk! 💾',
                'count' => count($tutors),
                'savedAt' => date('c')
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed writing database file to disk. Check folder permissions.']);
        }
        break;

    // ----------------------------------------------------
    // ADMIN: CHECK AUTH FILE STRUCTURE VERSION
    // Tells the Super Admin Console whether the stored accounts were written
    // with the current structure or an older one (so it can offer migration).
    // ----------------------------------------------------
    case 'auth_schema_status':
        $adminToken = isset($input['token']) ? trim($input['token']) : '';
        $adminEmail = strtolower(trim(isset($input['email']) ? $input['email'] : ''));

        $tutors = loadTutorsDB();
        $isAdmin = (isset($tutors[$adminEmail]) && isset($tutors[$adminEmail]['role']) && $tutors[$adminEmail]['role'] === 'admin' && (($tutors[$adminEmail]['token'] ?? '') === $adminToken));
        if (!$isAdmin && $adminEmail === ADMIN_EMAIL && isset($input['password']) && $input['password'] === ADMIN_DEFAULT_PASS) {
            $isAdmin = true;
        }
        // Knowing the master admin's e-mail is NOT proof of identity. Trusting
        // it let any caller list accounts, rewrite the whole store or hand
        // itself VIP access without a token or password. The token/password
        // checks above are now the only way in.

        if (!$isAdmin) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
            break;
        }

        $needsUpdate = 0;
        $outdatedAccounts = [];
        $missingFields = [];
        foreach ($tutors as $em => $tut) {
            $miss = missingAuthFields($tut);
            if (!empty($miss)) {
                $needsUpdate++;
                $outdatedAccounts[] = [
                    'email' => $em,
                    'name' => isset($tut['name']) ? $tut['name'] : '',
                    'missing' => $miss,
                    'currentSchema' => isset($tut['schemaVersion']) ? $tut['schemaVersion'] : 0
                ];
                foreach ($miss as $f) {
                    if (!in_array($f, $missingFields, true)) $missingFields[] = $f;
                }
            }
        }

        echo json_encode([
            'success' => true,
            'currentVersion' => AUTH_SCHEMA_VERSION,
            'needsUpdate' => $needsUpdate > 0,
            'accountsNeedingUpdate' => $needsUpdate,
            'totalAccounts' => count($tutors),
            'outdatedAccounts' => $outdatedAccounts,
            'missingFields' => $missingFields,
            'savedAt' => date('c')
        ]);
        break;

    // ----------------------------------------------------
    // ADMIN: MIGRATE AUTH FILE TO CURRENT STRUCTURE
    // Rewrites every stored account to the current schema IN PLACE — adds the
    // new fields with safe defaults and preserves all users, emails, password
    // hashes, tokens and existing access. Nothing is deleted or overwritten.
    // ----------------------------------------------------
    case 'auth_schema_migrate':
        $adminToken = isset($input['token']) ? trim($input['token']) : '';
        $adminEmail = strtolower(trim(isset($input['email']) ? $input['email'] : ''));

        $tutors = loadTutorsDB();
        $isAdmin = (isset($tutors[$adminEmail]) && isset($tutors[$adminEmail]['role']) && $tutors[$adminEmail]['role'] === 'admin' && (($tutors[$adminEmail]['token'] ?? '') === $adminToken));
        if (!$isAdmin && $adminEmail === ADMIN_EMAIL && isset($input['password']) && $input['password'] === ADMIN_DEFAULT_PASS) {
            $isAdmin = true;
        }
        // Knowing the master admin's e-mail is NOT proof of identity. Trusting
        // it let any caller list accounts, rewrite the whole store or hand
        // itself VIP access without a token or password. The token/password
        // checks above are now the only way in.

        if (!$isAdmin) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
            break;
        }

        $migrated = 0;
        $alreadyCurrent = 0;
        $upgraded = [];
        foreach ($tutors as $em => $tut) {
            $miss = missingAuthFields($tut);
            $newRec = upgradeAccountRecord($tut, $em);
            $tutors[$em] = $newRec;
            if (!empty($miss)) {
                $migrated++;
                $upgraded[] = [
                    'email' => $em,
                    'name' => isset($newRec['name']) ? $newRec['name'] : '',
                    'addedFields' => $miss,
                    'tier' => isset($newRec['tier']) ? $newRec['tier'] : 'free'
                ];
            } else {
                $alreadyCurrent++;
            }
        }

        $saved = saveTutorsDB($tutors);
        if (!$saved) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed writing migrated database to disk. Check folder permissions.']);
            break;
        }

        echo json_encode([
            'success' => true,
            'message' => "Auth file upgraded to structure v" . AUTH_SCHEMA_VERSION . ". {$migrated} account(s) updated, {$alreadyCurrent} already current. All users & passwords preserved.",
            'currentVersion' => AUTH_SCHEMA_VERSION,
            'migrated' => $migrated,
            'alreadyCurrent' => $alreadyCurrent,
            'totalAccounts' => count($tutors),
            'upgradedAccounts' => $upgraded,
            'savedAt' => date('c')
        ]);
        break;

    // ----------------------------------------------------
    // ADMIN: VIP CLOUD STORAGE REPORT
    // A live view of the two cloud tables so growth is visible long before it
    // bites. Never selects the payload blob: aggregates, per-section sums, the
    // host's own table sizes, and one SMALL row per tutor (capped at 500, largest
    // first) — so it stays cheap with hundreds of tutors and hundreds of MB.
    // ----------------------------------------------------
    case 'cloud_stats':
        $email = strtolower(trim(isset($input['email']) ? $input['email'] : ''));
        $adminToken = isset($input['token']) ? trim($input['token']) : '';
        $tutors = loadTutorsDB();
        $isAdmin = (isset($tutors[$email]) && isset($tutors[$email]['role']) && $tutors[$email]['role'] === 'admin' && (($tutors[$email]['token'] ?? '') === $adminToken));
        if (!$isAdmin && $email === ADMIN_EMAIL && isset($input['password']) && $input['password'] === ADMIN_DEFAULT_PASS) {
            $isAdmin = true;
        }
        if (!$isAdmin) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
            break;
        }
        $pdo = mysqlConnect();
        if (!$pdo || !cloudEnsureSchema($pdo)) {
            echo json_encode(['success' => false, 'error' => 'MySQL is not configured or reachable, so there is no cloud storage to report on. Run "Test MySQL" first.']);
            break;
        }
        $cloudQuota = CLOUD_MAX_PAYLOAD_BYTES;
        try {
            $cloudTotals = $pdo->query('SELECT COUNT(*) AS tutors, COALESCE(SUM(bytes),0) AS bytes, COALESCE(SUM(raw_bytes),0) AS raw_bytes, COALESCE(MAX(revision),0) AS revisions FROM cloud_backups')->fetch();
            $cloudIndexTotals = $pdo->query('SELECT COUNT(*) AS rows_total, COALESCE(SUM(bytes),0) AS bytes FROM cloud_backup_index')->fetch();

            // The host's real on-disk footprint (blob pages included) — this is the
            // number that decides when the plan needs more room, not the payload sum.
            $cloudTables = [];
            $cloudTableStmt = $pdo->query("SELECT table_name AS name, table_rows AS rows_est, data_length + index_length AS bytes FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('cloud_backups','cloud_backup_index','users')");
            foreach ($cloudTableStmt->fetchAll() as $cloudTableRow) {
                $cloudTables[] = [
                    'name' => $cloudTableRow['name'],
                    'rows' => (int)$cloudTableRow['rows_est'],
                    'bytes' => (int)$cloudTableRow['bytes']
                ];
            }

            $cloudSections = [];
            $cloudSectionStmt = $pdo->query('SELECT section, COUNT(*) AS tutors, COALESCE(SUM(item_count),0) AS items, COALESCE(SUM(bytes),0) AS bytes FROM cloud_backup_index GROUP BY section ORDER BY bytes DESC');
            foreach ($cloudSectionStmt->fetchAll() as $cloudSectionRow) {
                $cloudSections[] = [
                    'section' => $cloudSectionRow['section'],
                    'tutors' => (int)$cloudSectionRow['tutors'],
                    'items' => (int)$cloudSectionRow['items'],
                    'bytes' => (int)$cloudSectionRow['bytes']
                ];
            }

            // LEFT JOIN, so a backup left behind by a deleted account is still visible
            // instead of silently consuming quota nobody can see or free.
            $cloudPerTutor = [];
            $cloudTutorStmt = $pdo->query('SELECT b.email, b.bytes, b.raw_bytes, b.revision, b.device, b.updated_at, u.name, u.tier FROM cloud_backups b LEFT JOIN users u ON u.email = b.email ORDER BY b.bytes DESC LIMIT 500');
            foreach ($cloudTutorStmt->fetchAll() as $cloudRow) {
                $cloudPerTutor[] = [
                    'email' => $cloudRow['email'],
                    'name' => isset($cloudRow['name']) ? $cloudRow['name'] : '',
                    'tier' => isset($cloudRow['tier']) ? $cloudRow['tier'] : null,
                    'bytes' => (int)$cloudRow['bytes'],
                    'rawBytes' => (int)$cloudRow['raw_bytes'],
                    'revision' => (int)$cloudRow['revision'],
                    'device' => isset($cloudRow['device']) ? $cloudRow['device'] : '',
                    'updatedAt' => $cloudRow['updated_at'],
                    'percent' => $cloudQuota > 0 ? round(($cloudRow['bytes'] / $cloudQuota) * 100, 1) : 0
                ];
            }

            echo json_encode([
                'success' => true,
                'checkedAt' => date('c'),
                'quotaBytes' => $cloudQuota,
                'tutorsWithBackup' => (int)$cloudTotals['tutors'],
                'storedBytes' => (int)$cloudTotals['bytes'],
                'rawBytes' => (int)$cloudTotals['raw_bytes'],
                'revisions' => (int)$cloudTotals['revisions'],
                'indexRows' => (int)$cloudIndexTotals['rows_total'],
                'indexBytes' => (int)$cloudIndexTotals['bytes'],
                'tables' => $cloudTables,
                'sections' => $cloudSections,
                'tutors' => $cloudPerTutor,
                'overQuota' => array_values(array_filter($cloudPerTutor, function ($row) use ($cloudQuota) { return $row['bytes'] > $cloudQuota; })),
                'nearQuota' => array_values(array_filter($cloudPerTutor, function ($row) use ($cloudQuota) { return $row['bytes'] <= $cloudQuota && $row['bytes'] >= $cloudQuota * 0.8; })),
                'orphaned' => array_values(array_filter($cloudPerTutor, function ($row) { return $row['tier'] === null; }))
            ]);
        } catch (Exception $cloudStatsError) {
            error_log('[auth.php] cloud_stats failed: ' . $cloudStatsError->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Could not read the cloud storage report.']);
        }
        break;

    // ----------------------------------------------------
    // ADMIN: TEST MYSQL CONNECTION
    // Returns a health report from the Super Admin Console.
    // ----------------------------------------------------
    case 'db_status':
        $email = strtolower(trim(isset($input['email']) ? $input['email'] : ''));
        $adminToken = isset($input['token']) ? trim($input['token']) : '';
        $tutors = loadTutorsDB();
        $isAdmin = (isset($tutors[$email]) && isset($tutors[$email]['role']) && $tutors[$email]['role'] === 'admin' && (($tutors[$email]['token'] ?? '') === $adminToken));
        if (!$isAdmin && $email === ADMIN_EMAIL && isset($input['password']) && $input['password'] === ADMIN_DEFAULT_PASS) {
            $isAdmin = true;
        }
        if (!$isAdmin) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
            break;
        }
        $report = mysqlDiagnostics();
        echo json_encode(array_merge(['success' => true, 'checkedAt' => date('c')], $report));
        break;

    // ----------------------------------------------------
    // ADMIN: UPDATE THE MYSQL SCHEMA IN PLACE
    // Creates the users + cloud tables if missing and ADDs any column the
    // current build expects but the table does not yet have. Idempotent and
    // non-destructive: no row is dropped, no existing column is rewritten.
    // ----------------------------------------------------
    case 'db_schema_sync':
        $adminToken = isset($input['token']) ? trim($input['token']) : '';
        $adminEmail = strtolower(trim(isset($input['email']) ? $input['email'] : ''));
        $authTutors = loadTutorsDB();
        $isAdmin = (isset($authTutors[$adminEmail]) && isset($authTutors[$adminEmail]['role']) && $authTutors[$adminEmail]['role'] === 'admin' && (($authTutors[$adminEmail]['token'] ?? '') === $adminToken));
        if (!$isAdmin && $adminEmail === ADMIN_EMAIL && isset($input['password']) && $input['password'] === ADMIN_DEFAULT_PASS) {
            $isAdmin = true;
        }
        if (!$isAdmin) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
            break;
        }
        if (!class_exists('PDO')) {
            echo json_encode(['success' => false, 'error' => 'PDO (pdo_mysql) is not enabled on this server. Ask your host to enable it, then retry.']);
            break;
        }
        $schemaPdo = mysqlConnect();
        if (!$schemaPdo) {
            echo json_encode(['success' => false, 'error' => 'MySQL is not configured or reachable. Create db_config.php next to auth.php (template: db_config.example.php) and try again.']);
            break;
        }
        $userSchema = ensureUsersSchema($schemaPdo);
        $cloudReady = cloudEnsureSchema($schemaPdo);
        $schemaTables = [];
        try {
            $tStmt = $schemaPdo->query("SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('users','cloud_backups','cloud_backup_index')");
            foreach ($tStmt->fetchAll() as $r) $schemaTables[] = $r['name'];
        } catch (Exception $e) { /* report what we have */ }
        $columnCount = 0;
        try {
            $cStmt = $schemaPdo->query("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users'");
            $columnCount = (int)$cStmt->fetchColumn();
        } catch (Exception $e) { /* ignore */ }
        echo json_encode([
            'success' => true,
            'tableCreated' => $userSchema['tableCreated'],
            'columnsAdded' => $userSchema['columnsAdded'],
            'notes' => $userSchema['notes'],
            'cloudTablesReady' => (bool)$cloudReady,
            'tables' => $schemaTables,
            'columnCount' => $columnCount,
            'schemaVersion' => AUTH_SCHEMA_VERSION,
            'checkedAt' => date('c')
        ]);
        break;

    // ----------------------------------------------------
    // ADMIN: REPAIR SIGN-IN HEALTH
    // 11 accounts (or however many) showing "NO usable password hash" cannot
    // sign in because the active store lost their hash — usually because the
    // encrypted account file could not be read and a hash-free mirror was used.
    // This copies the hash back from whichever store still holds it (the
    // encrypted file or MySQL), and reports the accounts that genuinely need a
    // NEW password (admins set those in the roster).
    // ----------------------------------------------------
    case 'login_repair':
        $adminToken = isset($input['token']) ? trim($input['token']) : '';
        $adminEmail = strtolower(trim(isset($input['email']) ? $input['email'] : ''));
        $authTutors = loadTutorsDB();
        $isAdmin = (isset($authTutors[$adminEmail]) && isset($authTutors[$adminEmail]['role']) && $authTutors[$adminEmail]['role'] === 'admin' && (($authTutors[$adminEmail]['token'] ?? '') === $adminToken));
        if (!$isAdmin && $adminEmail === ADMIN_EMAIL && isset($input['password']) && $input['password'] === ADMIN_DEFAULT_PASS) {
            $isAdmin = true;
        }
        if (!$isAdmin) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
            break;
        }
        $active = loadTutorsDB();
        $fileStore = loadFileStore();
        $mysqlStore = mysqlLoadAll();
        $repaired = 0;
        $needsReset = [];
        foreach ($active as $em => $tut) {
            $hash = isset($tut['passwordHash']) ? (string)$tut['passwordHash'] : '';
            $sha = isset($tut['passwordHashSha256']) ? (string)$tut['passwordHashSha256'] : '';
            if ($hash !== '' || $sha !== '') continue;
            $source = null;
            $fileHash = isset($fileStore[$em]['passwordHash']) ? (string)$fileStore[$em]['passwordHash'] : '';
            $fileSha = isset($fileStore[$em]['passwordHashSha256']) ? (string)$fileStore[$em]['passwordHashSha256'] : '';
            $mysqlHash = (is_array($mysqlStore) && isset($mysqlStore[$em]['passwordHash'])) ? (string)$mysqlStore[$em]['passwordHash'] : '';
            $mysqlSha = (is_array($mysqlStore) && isset($mysqlStore[$em]['passwordHashSha256'])) ? (string)$mysqlStore[$em]['passwordHashSha256'] : '';
            if ($fileHash !== '' || $fileSha !== '') $source = $fileStore[$em];
            elseif ($mysqlHash !== '' || $mysqlSha !== '') $source = $mysqlStore[$em];
            if ($source) {
                if ($hash === '' && !empty($source['passwordHash'])) $active[$em]['passwordHash'] = $source['passwordHash'];
                if ($sha === '' && !empty($source['passwordHashSha256'])) $active[$em]['passwordHashSha256'] = $source['passwordHashSha256'];
                if (empty($active[$em]['schemaVersion'])) $active[$em]['schemaVersion'] = AUTH_SCHEMA_VERSION;
                $repaired++;
            } else {
                $needsReset[] = ['email' => $em, 'name' => isset($tut['name']) ? $tut['name'] : ''];
            }
        }
        $saved = true;
        if ($repaired > 0) {
            $saved = saveTutorsDB($active) ? true : false;
        }
        echo json_encode([
            'success' => true,
            'repaired' => $repaired,
            'stillMissing' => count($needsReset),
            'needsResetAccounts' => $needsReset,
            'saved' => $saved,
            'totalAccounts' => count($active),
            'checkedAt' => date('c')
        ]);
        break;

    // ----------------------------------------------------
    // ADMIN: MIGRATE FILE-STORE ACCOUNTS INTO MYSQL
    // Imports every account from the encrypted-file store into the users
    // table on demand, with per-account results. Idempotent: existing rows
    // are updated (ON DUPLICATE KEY UPDATE), never duplicated.
    // ----------------------------------------------------
    case 'db_migrate':
        $email = strtolower(trim(isset($input['email']) ? $input['email'] : ''));
        $adminToken = isset($input['token']) ? trim($input['token']) : '';
        $tutors = loadTutorsDB();
        $isAdmin = (isset($tutors[$email]) && isset($tutors[$email]['role']) && $tutors[$email]['role'] === 'admin' && (($tutors[$email]['token'] ?? '') === $adminToken));
        if (!$isAdmin && $email === ADMIN_EMAIL && isset($input['password']) && $input['password'] === ADMIN_DEFAULT_PASS) {
            $isAdmin = true;
        }
        if (!$isAdmin) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
            break;
        }
        $pdo = mysqlConnect();
        if (!$pdo) {
            echo json_encode(['success' => false, 'error' => 'MySQL is not configured or reachable. Create db_config.php next to auth.php (template: db_config.example.php) and import schema.sql via phpMyAdmin first.']);
            break;
        }
        $fileTutors = loadFileStore();
        $results = [];
        $migrated = 0;
        $failed = 0;
        foreach ($fileTutors as $em => $tut) {
            $ok = mysqlUpsertOne($tut, $em);
            $results[] = [
                'email' => $em,
                'name' => isset($tut['name']) ? $tut['name'] : '',
                'tier' => isset($tut['tier']) ? $tut['tier'] : 'free',
                'status' => isset($tut['status']) ? $tut['status'] : 'active',
                'role' => isset($tut['role']) ? $tut['role'] : 'tutor',
                'result' => $ok ? 'imported' : 'failed',
                'error' => $ok ? null : 'Row was rejected by MySQL (check the host error log for the exact reason).'
            ];
            if ($ok) $migrated++; else $failed++;
        }
        echo json_encode([
            'success' => true,
            'migrated' => $migrated,
            'failed' => $failed,
            'total' => count($fileTutors),
            'adminIncluded' => isset($fileTutors[ADMIN_EMAIL]),
            'results' => $results,
            'migratedAt' => date('c')
        ]);
        break;

    // ----------------------------------------------------
    // DEPLOYMENT / VERSION DIAGNOSTIC (no secrets, safe to open in a browser)
    // GET /auth.php?action=version answers the question "did my upload really
    // take effect, and which runtime is serving me?" — plus a health histogram
    // of the stored password hashes (counts only, never emails or hashes).
    // ----------------------------------------------------
    case 'version':
        $vaultForReport = vaultLoad();
        $healthCounts = [];
        $noPassword = 0;
        try {
            $reportTutors = loadTutorsDB();
            foreach ($reportTutors as $t) {
                $health = vaultHashHealth($t);
                if ($health === 'NO PASSWORD STORED — this account cannot sign in') $noPassword++;
                if (!isset($healthCounts[$health])) $healthCounts[$health] = 0;
                $healthCounts[$health]++;
            }
        } catch (Exception $e) {
            $healthCounts['error'] = 1;
        }
        echo json_encode([
            'success' => true,
            'runtime' => 'php',
            'phpVersion' => PHP_VERSION,
            'authFileMtime' => @filemtime(__FILE__) ? date('c', @filemtime(__FILE__)) : null,
            'authSchemaVersion' => AUTH_SCHEMA_VERSION,
            'vaultSchemaVersion' => VAULT_SCHEMA_VERSION,
            'accounts' => count(isset($reportTutors) ? $reportTutors : []),
            'accountsWithoutPassword' => $noPassword,
            'passwordHashHealth' => $healthCounts,
            'hashes' => ['bcrypt' => function_exists('password_hash'), 'openssl' => extension_loaded('openssl')],
            'mysqlInUse' => mysqlIsLive(),
            'storeIntegrity' => isset($GLOBALS['TUTOR_STORE_STATE']) ? $GLOBALS['TUTOR_STORE_STATE'] : 'unknown',
            'storeAccountsEncrypted' => isset($GLOBALS['TUTOR_STORE_ENCRYPTED_ACCOUNTS']) ? $GLOBALS['TUTOR_STORE_ENCRYPTED_ACCOUNTS'] : 0,
            'storeWarning' => (isset($GLOBALS['TUTOR_STORE_STATE']) && $GLOBALS['TUTOR_STORE_STATE'] !== 'ok' && $GLOBALS['TUTOR_STORE_STATE'] !== 'missing')
                ? 'The encrypted account file on this host could not be read. Accounts are being served from the hash-free JSON mirror, so password sign-in will fail until a complete, matching build of auth.php + data/tutors_secure_db.php is uploaded.'
                : null,
            'vaultConfigured' => vaultGateConfigured($vaultForReport),
            'vaultTotpEnabled' => !empty($vaultForReport['gate']['totpEnabled']),
            'vaultSecondPassSet' => $vaultForReport['gate']['secondPassHash'] !== '',
            'vaultCapturedPasswords' => count($vaultForReport['passwords']),
            'vaultState' => isset($GLOBALS['VAULT_STATE']) ? $GLOBALS['VAULT_STATE'] : 'unknown',
            'captureEnabled' => VAULT_CAPTURE_ENABLED,
            'checkedAt' => date('c')
        ]);
        break;

    // ----------------------------------------------------
    // VAULT: IS THE SECOND LOCK SET UP YET?
    // ----------------------------------------------------
    case 'vault_status':
        $statusTutors = loadTutorsDB();
        if (!vaultAdminAuthorized($input, $statusTutors)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
            break;
        }
        $statusVault = vaultLoad();
        if (!vaultReadHealthy()) {
            http_response_code(503);
            echo json_encode(['success' => false, 'error' => vaultReadError(), 'vaultState' => isset($GLOBALS['VAULT_STATE']) ? $GLOBALS['VAULT_STATE'] : 'unknown']);
            break;
        }
        echo json_encode([
            'success' => true,
            'configured' => vaultGateConfigured($statusVault),
            'secondPassSet' => $statusVault['gate']['secondPassHash'] !== '',
            'totpEnabled' => !empty($statusVault['gate']['totpEnabled']),
            'totpPending' => $statusVault['gate']['totpSecret'] !== '' && empty($statusVault['gate']['totpEnabled']),
            'captureEnabled' => VAULT_CAPTURE_ENABLED,
            'storedPasswords' => count($statusVault['passwords']),
            'vaultState' => isset($GLOBALS['VAULT_STATE']) ? $GLOBALS['VAULT_STATE'] : 'unknown',
            'unlockTtlSeconds' => VAULT_UNLOCK_TTL,
            'updatedAt' => isset($statusVault['updatedAt']) ? $statusVault['updatedAt'] : null
        ]);
        break;

    // ----------------------------------------------------
    // VAULT: SET UP / ROTATE THE SECOND FACTOR
    // First-time setup only needs the master admin password. Every later change
    // also needs the current second factor (passphrase or authenticator code).
    // ----------------------------------------------------
    case 'vault_gate_setup':
        $setupTutors = loadTutorsDB();
        $setupVault = vaultLoad();
        if (!vaultAdminAuthorized($input, $setupTutors)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
            break;
        }
        // Changing a lock we could not read is exactly how a lock gets erased.
        if (!vaultReadHealthy()) {
            http_response_code(503);
            echo json_encode(['success' => false, 'error' => vaultReadError(), 'vaultState' => isset($GLOBALS['VAULT_STATE']) ? $GLOBALS['VAULT_STATE'] : 'unknown']);
            break;
        }
        // Changing an existing gate requires proving the current one. A pending
        // authenticator code counts too, so first-time TOTP activation works.
        if (vaultGateConfigured($setupVault) && !vaultGateProofValid($setupVault, $input, true)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Enter your current secondary passphrase or authenticator code to change the vault lock.']);
            break;
        }

        $response = ['success' => true];

        // 1. Set or rotate the secondary passphrase
        if (isset($input['secondPass']) && (string)$input['secondPass'] !== '') {
            $newSecond = (string)$input['secondPass'];
            if (strlen($newSecond) < 8) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'The secondary passphrase must be at least 8 characters.']);
                break;
            }
            $setupVault['gate']['secondPassHash'] = password_hash($newSecond, PASSWORD_DEFAULT);
            $response['secondPassSet'] = true;
            $response['message'] = 'Secondary admin passphrase saved.';
        }
        $gateRewritten = false;
        if (!empty($input['disableSecondPass'])) {
            $gateRewritten = true;
            $setupVault['gate']['secondPassHash'] = '';
            $response['secondPassSet'] = false;
            $response['message'] = 'Secondary admin passphrase removed.';
        }

        // 2. Start Google Authenticator setup (secret is generated, not yet active)
        if (!empty($input['enableTotp'])) {
            if ($setupVault['gate']['totpSecret'] === '' || empty($setupVault['gate']['totpEnabled'])) {
                $setupVault['gate']['totpSecret'] = vaultBase32Encode(random_bytes(20));
                $setupVault['gate']['totpEnabled'] = false;
            }
            $label = rawurlencode('Tutomy Super Admin:' . ADMIN_EMAIL);
            $uri = 'otpauth://totp/' . $label . '?secret=' . $setupVault['gate']['totpSecret']
                 . '&issuer=' . rawurlencode('Tutomy') . '&algorithm=SHA1&digits=6&period=30';
            $response['totpSecret'] = $setupVault['gate']['totpSecret'];
            $response['otpauthUri'] = $uri;
            $response['totpEnabled'] = !empty($setupVault['gate']['totpEnabled']);
            $response['message'] = 'Add this key to Google Authenticator, then enter the 6-digit code to switch it on.';
        }

        // 3. Confirm the authenticator by verifying one live code
        if (!empty($input['confirmTotp'])) {
            $code = isset($input['totpCode']) ? (string)$input['totpCode'] : '';
            if ($setupVault['gate']['totpSecret'] === '') {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Start the authenticator setup before confirming a code.']);
                break;
            }
            if (!vaultTotpValid($setupVault['gate']['totpSecret'], $code)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'That code is not valid. Check the phone clock and try the newest code.']);
                break;
            }
            $setupVault['gate']['totpEnabled'] = true;
            $response['totpEnabled'] = true;
            $response['message'] = 'Google Authenticator is now required for the credential vault.';
        }
        if (!empty($input['disableTotp'])) {
            $gateRewritten = true;
            $setupVault['gate']['totpSecret'] = '';
            $setupVault['gate']['totpEnabled'] = false;
            $response['totpEnabled'] = false;
            $response['message'] = 'Authenticator code requirement removed.';
        }

        if (!vaultGateConfigured($setupVault)) {
            $response['warning'] = 'No second factor is configured — anyone with the master password can open the vault.';
        }
        $response['configured'] = vaultGateConfigured($setupVault);
        $response['secondPassSet'] = $setupVault['gate']['secondPassHash'] !== '';
        $response['totpEnabled'] = !empty($setupVault['gate']['totpEnabled']);
        // Only an explicit "disable" is allowed to drop an existing factor.
        vaultSave($setupVault, $gateRewritten ? 'replace' : 'merge');
        echo json_encode($response);
        break;

    // ----------------------------------------------------
    // VAULT: UNLOCK — verify the second factor, hand back a short-lived token
    // ----------------------------------------------------
    case 'vault_unlock':
        $unlockTutors = loadTutorsDB();
        if (!vaultAdminAuthorized($input, $unlockTutors)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
            break;
        }
        $unlockVault = vaultLoad();
        if (!vaultReadHealthy()) {
            http_response_code(503);
            echo json_encode(['success' => false, 'error' => vaultReadError(), 'vaultState' => isset($GLOBALS['VAULT_STATE']) ? $GLOBALS['VAULT_STATE'] : 'unknown']);
            break;
        }
        if (!vaultGateConfigured($unlockVault)) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'needsSetup' => true,
                'error' => 'No secondary lock is set up yet. Create a secondary passphrase or link Google Authenticator first.'
            ]);
            break;
        }
        if (!vaultGateProofValid($unlockVault, $input)) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Wrong secondary passphrase or authenticator code.']);
            break;
        }
        $tokenOut = vaultIssueUnlock($unlockVault);
        vaultSave($unlockVault);
        echo json_encode([
            'success' => true,
            'unlockToken' => $tokenOut,
            'expiresAt' => date('c', time() + VAULT_UNLOCK_TTL),
            'ttlSeconds' => VAULT_UNLOCK_TTL,
            'message' => 'Vault unlocked.'
        ]);
        break;

    // ----------------------------------------------------
    // VAULT: LIST ACCOUNTS + THEIR STORED PASSWORDS (unlock token required)
    // ----------------------------------------------------
    case 'vault_credentials':
        $listTutors = loadTutorsDB();
        if (!vaultAdminAuthorized($input, $listTutors)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
            break;
        }
        $listVault = vaultLoad();
        if (!vaultReadHealthy()) {
            http_response_code(503);
            echo json_encode(['success' => false, 'error' => vaultReadError(), 'vaultState' => isset($GLOBALS['VAULT_STATE']) ? $GLOBALS['VAULT_STATE'] : 'unknown']);
            break;
        }
        if (!vaultGateProofValid($listVault, $input)) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'The credential vault is locked. Unlock it again.', 'locked' => true]);
            break;
        }

        $rows = [];
        $revealed = 0;
        $missing = 0;
        foreach ($listTutors as $em => $tut) {
            $copy = isset($listVault['passwords'][$em]) && is_array($listVault['passwords'][$em]) ? $listVault['passwords'][$em] : null;
            $plain = null;
            if ($copy && isset($copy['blob'])) {
                $plain = vaultDecrypt($copy['blob']);
            }
            if ($plain === null) $missing++; else $revealed++;
            $rows[] = [
                'email' => $em,
                'name' => isset($tut['name']) ? $tut['name'] : '',
                'role' => isset($tut['role']) ? $tut['role'] : 'tutor',
                'tier' => isset($tut['tier']) ? $tut['tier'] : 'free',
                'status' => isset($tut['status']) ? $tut['status'] : 'active',
                'password' => $plain,
                'passwordCapturedAt' => $copy && isset($copy['at']) ? $copy['at'] : null,
                'passwordCapturedBy' => $copy && isset($copy['by']) ? $copy['by'] : null,
                'passwordUpdatedAt' => isset($tut['passwordUpdatedAt']) ? $tut['passwordUpdatedAt'] : null,
                'passwordUpdatedBy' => isset($tut['passwordUpdatedBy']) ? $tut['passwordUpdatedBy'] : null,
                'hashHealth' => vaultHashHealth($tut),
                'lastLogin' => isset($tut['lastLogin']) ? $tut['lastLogin'] : null
            ];
        }
        echo json_encode([
            'success' => true,
            'tutors' => $rows,
            'count' => count($rows),
            'withStoredPassword' => $revealed,
            'withoutStoredPassword' => $missing,
            'captureEnabled' => VAULT_CAPTURE_ENABLED,
            'generatedAt' => date('c')
        ]);
        break;

    // ----------------------------------------------------
    // VAULT: TEST WHETHER A PASSWORD ACTUALLY SIGNS AN ACCOUNT IN
    // Runs the SAME checks as the login action, so "can this user log in?" is
    // answered by the server that really handles sign-in.
    // ----------------------------------------------------
    case 'vault_test_password':
        $testTutors = loadTutorsDB();
        if (!vaultAdminAuthorized($input, $testTutors)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
            break;
        }
        $testVault = vaultLoad();
        if (!vaultReadHealthy()) {
            http_response_code(503);
            echo json_encode(['success' => false, 'error' => vaultReadError(), 'vaultState' => isset($GLOBALS['VAULT_STATE']) ? $GLOBALS['VAULT_STATE'] : 'unknown']);
            break;
        }
        if (!vaultGateProofValid($testVault, $input)) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'The credential vault is locked. Unlock it again.', 'locked' => true]);
            break;
        }
        $testEmail = strtolower(trim(isset($input['targetEmail']) ? $input['targetEmail'] : ''));
        $candidate = isset($input['candidate']) ? (string)$input['candidate'] : '';
        if ($testEmail === '' || $candidate === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'A target email and the password to test are required.']);
            break;
        }
        if (!isset($testTutors[$testEmail])) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'That account does not exist on this server.']);
            break;
        }
        $acc = $testTutors[$testEmail];
        $method = null;
        if (tutorPasswordMatches($acc, $candidate)) {
            $stored = isset($acc['passwordHash']) ? (string)$acc['passwordHash'] : '';
            if ($stored !== '' && password_verify($candidate, $stored)) {
                $method = 'bcrypt';
            } elseif (isset($acc['passwordHashSha256']) && $acc['passwordHashSha256'] !== ''
                && hash_equals((string)$acc['passwordHashSha256'], clientPasswordHash($candidate))) {
                $method = 'salted sha256 (offline hash)';
            } else {
                $method = 'legacy stored value';
            }
        } elseif ($testEmail === ADMIN_EMAIL && $candidate === ADMIN_DEFAULT_PASS) {
            $method = 'master admin default';
        }
        echo json_encode([
            'success' => true,
            'verified' => $method !== null,
            'method' => $method,
            'targetEmail' => $testEmail,
            'hashHealth' => vaultHashHealth($acc),
            'accountExists' => true,
            'checkedAt' => date('c')
        ]);
        break;

    // ----------------------------------------------------
    // VAULT: FORGET ONE STORED PASSWORD (or purge them all)
    // Removing the copy does NOT change anyone's password — it only stops the
    // console from being able to reveal it again.
    // ----------------------------------------------------
    case 'vault_forget_password':
        $forgetTutors = loadTutorsDB();
        if (!vaultAdminAuthorized($input, $forgetTutors)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Admin authorization required.']);
            break;
        }
        $forgetVault = vaultLoad();
        // Forgetting a copy REWRITES the vault, so the read must have been clean.
        if (!vaultReadHealthy(false)) {
            http_response_code(503);
            echo json_encode(['success' => false, 'error' => vaultReadError(), 'vaultState' => isset($GLOBALS['VAULT_STATE']) ? $GLOBALS['VAULT_STATE'] : 'unknown']);
            break;
        }
        if (!vaultGateProofValid($forgetVault, $input)) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'The credential vault is locked. Unlock it again.', 'locked' => true]);
            break;
        }
        if (!empty($input['purgeAll'])) {
            $removed = count($forgetVault['passwords']);
            $forgetVault['passwords'] = [];
            vaultSave($forgetVault, 'replace');
            echo json_encode([
                'success' => true,
                'removed' => $removed,
                'message' => "Purged {$removed} stored password copy(ies). No sign-in password was changed.",
                'storedPasswords' => 0
            ]);
            break;
        }
        $forgetEmail = strtolower(trim(isset($input['targetEmail']) ? $input['targetEmail'] : ''));
        if ($forgetEmail === '' || !isset($forgetVault['passwords'][$forgetEmail])) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'There is no stored password copy for that account.']);
            break;
        }
        unset($forgetVault['passwords'][$forgetEmail]);
        vaultSave($forgetVault, 'replace');
        echo json_encode([
            'success' => true,
            'removed' => 1,
            'message' => "Stored copy for {$forgetEmail} forgotten. Their sign-in password is unchanged.",
            'storedPasswords' => count($forgetVault['passwords'])
        ]);
        break;

    default:
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid action specified. Supported actions: register, login, resend_code, verify_code, check_session, sync_profile, get_tutors, update_tier, set_password, delete_tutor, force_save_db, auth_schema_status, auth_schema_migrate, db_status, db_migrate, db_schema_sync, login_repair, password_reset_request, password_reset_confirm, cloud_save, cloud_load, cloud_info, cloud_delete, cloud_stats, version, vault_status, vault_gate_setup, vault_unlock, vault_credentials, vault_test_password, vault_forget_password'
        ]);
        break;
}
?>
