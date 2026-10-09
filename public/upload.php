<?php
/**
 * upload.php — accept ONE generated lesson page and return its public URL.
 *
 * WHAT IT IS FOR
 *   The lesson generator produces a self-contained .html lesson. This endpoint
 *   stores it under `/uploads/` and answers with the URL, so a tutor can hand the
 *   link to a learner. It accepts NOTHING else: no images, no JSON, no backups.
 *
 *   That is deliberately narrower than `tutorly.ir/cspro/upload.php`, which the
 *   avatar/profile code still calls (see `utils/imageUtils.ts`) and which organises
 *   files into `uploads/<tutor>/<lesson>/…`. The two are SEPARATE endpoints with
 *   SEPARATE contracts. Do not swap them: this one answers 415 to an image, so
 *   replacing the other with it would break every profile-photo upload.
 *
 * WHY THE PARANOIA
 *   Anything written here is served from the app's OWN origin, which means an
 *   uploaded page can read the app's cookies and localStorage. So this endpoint
 *   gets: a token gate, an extension + MIME + content check, a size cap, a rate
 *   limit, and it never lets a script execute inside `/uploads/`.
 *
 * THE TOKEN (do this)
 *   Create `cs-upload-token.php` ONE LEVEL ABOVE the web root (the same place and
 *   the same idea as `cs-db_config.php`):
 *
 *       <?php return 'some-long-random-string';
 *
 *   Then send it with every request, either as an `X-Upload-Token` header or as a
 *   `token` form field. If no token file exists the endpoint still runs — but it
 *   is then open to anyone on the internet, and each request writes a line to the
 *   host error log saying so. Set the token.
 *
 * RESPONSE (JSON, always these keys on success)
 *   { "success": true,  "filePath": "https://…/uploads/<name>.html", "bytes": 1234 }
 *   { "success": false, "error": "…" }
 */

// ── Configuration ────────────────────────────────────────────────────────────
/** Public origin and path the returned URL is built from (never from the Host header — that is injectable). */
const UPLOAD_PUBLIC_ORIGIN = 'https://cspro.tutomy.com';
const UPLOAD_PUBLIC_PATH   = '/uploads/';
/** Only .html, and no larger than this. */
const UPLOAD_MAX_BYTES     = 5 * 1024 * 1024;
/** Per-IP throttle. Fail-open: if the counter cannot be written, uploads still work (see below). */
const UPLOAD_RATE_MAX      = 30;
const UPLOAD_RATE_WINDOW   = 3600;

/** Origins allowed to call this from a browser. Same-origin use does not need CORS at all. */
$UPLOAD_ALLOWED_ORIGINS = [
    'https://cspro.tutomy.com',
    'https://cspro.tutorly.ir',
    'https://tutorly.ir',
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function upload_fail(int $status, string $message): void
{
    http_response_code($status);
    echo json_encode(['success' => false, 'error' => $message]);
    exit;
}

/**
 * Find the token file, searching one level ABOVE the web root first — the whole
 * point being that a leaked web root should not leak the secret. Mirrors the
 * search order auth.php uses for its database config.
 */
function upload_token(): ?string
{
    $names  = ['cs-upload-token.php', 'upload-token.php'];
    $dirs   = [dirname(__DIR__), __DIR__];
    foreach ($dirs as $dir) {
        foreach ($names as $name) {
            $path = $dir . DIRECTORY_SEPARATOR . $name;
            if (!is_file($path)) {
                continue;
            }
            $value = include $path;
            if (is_string($value) && trim($value) !== '') {
                return trim($value);
            }
            if (is_array($value)) {
                foreach (['token', 'upload_token', 'secret'] as $key) {
                    if (isset($value[$key]) && is_string($value[$key]) && trim($value[$key]) !== '') {
                        return trim($value[$key]);
                    }
                }
            }
        }
    }
    return null;
}

/** Write the .htaccess that stops anything in uploads/ being executed or listed. */
function uploads_guard(string $dir): void
{
    $guard = $dir . '.htaccess';
    if (is_file($guard)) {
        return;
    }
    // Deliberately NO `Options -Indexes`: on a host whose AllowOverride does not
    // grant Options, that line 500s the entire folder. Random filenames make an
    // index listing a non-issue; executing an uploaded script is not.
    $rules = "# Written by upload.php. Uploaded files are DATA, never code.\n"
        . "<IfModule mod_authz_core.c>\n"
        . "  <FilesMatch \"\\.(?i:php|phtml|phar|cgi|pl|py|sh|shtml)$\">\n"
        . "    Require all denied\n"
        . "  </FilesMatch>\n"
        . "</IfModule>\n"
        . "<IfModule mod_php.c>\n"
        . "  php_flag engine off\n"
        . "</IfModule>\n";
    @file_put_contents($guard, $rules);
}

// ── CORS (only for the origins above, and answer the preflight) ──────────────
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowOrigin = in_array($origin, $UPLOAD_ALLOWED_ORIGINS, true) ? $origin : UPLOAD_PUBLIC_ORIGIN;
header('Access-Control-Allow-Origin: ' . $allowOrigin);
header('Vary: Origin');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Upload-Token');
header('X-Content-Type-Options: nosniff');
header('Content-Type: application/json');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    upload_fail(405, 'Method not allowed. Use POST.');
}

// ── The token gate ───────────────────────────────────────────────────────────
$expectedToken = upload_token();
if ($expectedToken !== null) {
    $given = $_SERVER['HTTP_X_UPLOAD_TOKEN'] ?? (string) ($_POST['token'] ?? '');
    if ($given === '' || !hash_equals($expectedToken, $given)) {
        error_log('[upload] rejected: bad or missing X-Upload-Token from ' . ($_SERVER['REMOTE_ADDR'] ?? '?'));
        upload_fail(401, 'Not authorised.');
    }
} else {
    error_log('[upload] WARNING: no cs-upload-token.php found — this endpoint is OPEN to anyone. See the file header.');
}

// ── Did PHP itself reject the body before we saw it? ─────────────────────────
// Without this, a body over post_max_size arrives with $_FILES empty and the
// caller is told "no file uploaded" — which sends them hunting for a bug in the
// wrong place. Say what actually happened instead.
$contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
if (empty($_FILES) && $contentLength > 0) {
    $postMax = upload_ini_bytes('post_max_size');
    if ($postMax > 0 && $contentLength > $postMax) {
        upload_fail(413, 'The upload is larger than this host accepts (post_max_size = '
            . ini_get('post_max_size') . '). Raise post_max_size and upload_max_filesize, or upload a smaller lesson page.');
    }
    upload_fail(400, 'No file was received. Send it as multipart/form-data under the field name "file".');
}

if (!isset($_FILES['file'])) {
    upload_fail(400, 'No file was received. Send it as multipart/form-data under the field name "file".');
}

$file = $_FILES['file'];
if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    $code = is_array($file) ? (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) : UPLOAD_ERR_NO_FILE;
    switch ($code) {
        case UPLOAD_ERR_INI_SIZE:
        case UPLOAD_ERR_FORM_SIZE:
            upload_fail(413, 'The file is larger than this host accepts (upload_max_filesize = '
                . ini_get('upload_max_filesize') . ').');
        case UPLOAD_ERR_PARTIAL:
            upload_fail(400, 'The file was only partially uploaded. Try again.');
        case UPLOAD_ERR_NO_TMP_DIR:
        case UPLOAD_ERR_CANT_WRITE:
            upload_fail(500, 'The host could not store the upload (check its temp directory and free space).');
        case UPLOAD_ERR_EXTENSION:
            upload_fail(500, 'A PHP extension blocked the upload.');
        default:
            upload_fail(400, 'Upload failed.');
    }
}

if (!is_uploaded_file($file['tmp_name'] ?? '')) {
    upload_fail(400, 'Upload failed.');
}

$size = (int) ($file['size'] ?? 0);
if ($size <= 0) {
    upload_fail(400, 'The uploaded file is empty.');
}
if ($size > UPLOAD_MAX_BYTES) {
    upload_fail(413, 'File exceeds the ' . round(UPLOAD_MAX_BYTES / 1048576) . ' MB limit.');
}

// ── It must be an .html file, and it must LOOK like one ──────────────────────
$originalName = basename((string) ($file['name'] ?? ''));
if (strtolower(pathinfo($originalName, PATHINFO_EXTENSION)) !== 'html') {
    upload_fail(415, 'Only .html files are allowed.');
}

$mimeType = '';
if (function_exists('finfo_open')) {
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    if ($finfo !== false) {
        $mimeType = (string) finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
    }
}
$allowedMime = ['text/html', 'text/plain', 'application/xhtml+xml', 'application/xml', 'text/xml', ''];
if (!in_array($mimeType, $allowedMime, true)) {
    upload_fail(415, 'That does not look like an HTML file.');
}

// A real lesson page starts with markup. This rejects a renamed binary, and it
// rejects a "page" that is actually a PHP script (which some hosts would still
// execute if the folder guard were ever lost).
$head = (string) @file_get_contents($file['tmp_name'], false, null, 0, 4096);
if (stripos($head, '<!doctype') === false && stripos($head, '<html') === false) {
    upload_fail(415, 'That does not look like an HTML file — it has no <html> or <!doctype> at the top.');
}

// ── Throttle ────────────────────────────────────────────────────────────────
$uploadDir = __DIR__ . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR;
// Throttle state lives OUTSIDE the web root (only the IP hash is stored): it is
// bookkeeping, not content, and nothing about it should be reachable by URL.
$stateDir  = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'cspro-upload-rate' . DIRECTORY_SEPARATOR;

$ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$stateFile = $stateDir . 'throttle_' . hash('sha256', $ip) . '.json';
$now = time();
$hits = [];
if (is_file($stateFile)) {
    $decoded = json_decode((string) @file_get_contents($stateFile), true);
    if (is_array($decoded)) {
        foreach ($decoded as $t) {
            if (is_int($t) && $t > $now - UPLOAD_RATE_WINDOW) {
                $hits[] = $t;
            }
        }
    }
}
if (count($hits) >= UPLOAD_RATE_MAX) {
    header('Retry-After: ' . UPLOAD_RATE_WINDOW);
    upload_fail(429, 'Too many uploads from this address. Try again later.');
}

// ── Store it ────────────────────────────────────────────────────────────────
if (!is_dir($uploadDir) && !@mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
    upload_fail(500, 'Failed to create the uploads directory.');
}
uploads_guard($uploadDir);

$newFileName = date('Ymd-His') . '-' . bin2hex(random_bytes(8)) . '.html';
$targetPath  = $uploadDir . $newFileName;

if (!@move_uploaded_file($file['tmp_name'], $targetPath)) {
    error_log('[upload] move_uploaded_file failed for ' . $originalName . ' into ' . $uploadDir);
    upload_fail(500, 'Failed to save the file on the server.');
}
@chmod($targetPath, 0644);

// Record the hit, but only after the write succeeded. Fail-open on purpose: a
// read-only state directory should never take the uploader down with it.
if (@is_dir($stateDir) || @mkdir($stateDir, 0700, true) || is_dir($stateDir)) {
    $hits[] = $now;
    @file_put_contents($stateFile, json_encode($hits), LOCK_EX);
}

echo json_encode([
    'success'  => true,
    'filePath' => UPLOAD_PUBLIC_ORIGIN . UPLOAD_PUBLIC_PATH . $newFileName,
    'bytes'    => $size,
]);

/** Turn a php.ini shorthand size ("8M", "512K") into bytes. */
function upload_ini_bytes(string $name): int
{
    $value = trim((string) ini_get($name));
    if ($value === '') {
        return 0;
    }
    $unit = strtolower(substr($value, -1));
    $num  = (int) $value;
    switch ($unit) {
        case 'g':
            return $num * 1073741824;
        case 'm':
            return $num * 1048576;
        case 'k':
            return $num * 1024;
        default:
            return $num;
    }
}
