<?php
/**
 * Tutorly Console — the Playables proxy.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * A YouTube Playable is a Unity WebGL build sitting on
 * `<id>.playables.usercontent.goog`, and its response says
 * `Content-Security-Policy: … frame-ancestors https://*.youtube.com …`. So the
 * browser refuses to frame it from our origin, and no amount of client-side code
 * can change that: reading the document to strip the header needs a request the
 * browser is not allowed to make (the build host sends no CORS headers).
 *
 * In the Node version of this app that job was a route handler
 * (`src/app/api/play/[host]/[...path]/route.ts`). Console is now a static export —
 * it has to work from a folder on the cPanel host — so the same job is done here.
 * This is a direct transcription of that route: same safety checks, same HTML
 * transform, same content types.
 *
 * ADDRESSING
 * ----------
 * The game is addressed by path, not by query string:
 *
 *     /tutorly-games/adult/console/play.php/<host>/<path/inside/build>
 *
 * because a Unity build fetches its parts with **relative** URLs
 * (`Build/x.data`, `TemplateData/style.css`). Keeping the build host in the PATH
 * means those relative fetches come back to this file naturally — no rewriting
 * needed for them. Only root-absolute refs (`/foo.js`) are rewritten, and only in
 * HTML (see `tutorly_transform_html`).
 *
 * Two ways the path can reach PHP, both supported:
 *   · PATH_INFO        — `AcceptPathInfo On`, the Apache default for PHP;
 *   · mod_rewrite      — the rule in the `.htaccess` beside this file, which also
 *                        covers hosts configured with `AcceptPathInfo Off`.
 *
 * ENDPOINTS
 *   GET play.php/<host>/<path>          stream an asset (HTML is transformed)
 *   GET play.php/__probe__              {"ok":true,…} — how the app decides
 *                                       whether Playables can stream in-rig here
 *   GET play.php?resolve=<playableId>   look up a Playable's build host on YouTube
 *
 * Nothing here is reachable for any host but `*.playables.usercontent.goog`, which
 * keeps it from being an open proxy.
 */

declare(strict_types=1);

const UPSTREAM_SUFFIX = '.playables.usercontent.goog';
const PROXY_VERSION = 3;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// We control every byte of this response ourselves (see the encoding guard in
// `tutorly_commit`). Letting the host's own output compression re-gzip a build
// file after we have labelled it is how a browser ends up handing compressed
// bytes to WebAssembly — "expected magic word … found 1f 8b 08" on load.
if (function_exists('ini_set')) {
    @ini_set('zlib.output_compression', '0');
}

/**
 * Responses up to this size are buffered before anything is sent. Small enough to
 * be safe in memory, large enough that HTML, CSS and the loader JS all get
 * rewritten; anything bigger (the Unity `.data` payloads) streams straight
 * through instead.
 */
const BUFFER_LIMIT = 2097152; // 2 MB

/** Content types we can supply ourselves, keyed by extension. */
const MIME = [
    'html' => 'text/html; charset=utf-8',
    'htm' => 'text/html; charset=utf-8',
    'js' => 'application/javascript; charset=utf-8',
    'mjs' => 'application/javascript; charset=utf-8',
    'css' => 'text/css; charset=utf-8',
    'json' => 'application/json',
    'wasm' => 'application/wasm',
    'data' => 'application/octet-stream',
    'unityweb' => 'application/octet-stream',
    'mem' => 'application/octet-stream',
    'symbols' => 'application/octet-stream',
    'png' => 'image/png',
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'gif' => 'image/gif',
    'svg' => 'image/svg+xml',
    'webp' => 'image/webp',
    'ico' => 'image/x-icon',
    'mp3' => 'audio/mpeg',
    'ogg' => 'audio/ogg',
    'wav' => 'audio/wav',
    'mp4' => 'video/mp4',
    'webm' => 'video/webm',
    'ttf' => 'font/ttf',
    'woff' => 'font/woff',
    'woff2' => 'font/woff2',
    'txt' => 'text/plain',
    'xml' => 'application/xml',
    'bin' => 'application/octet-stream',
    'bundle' => 'application/octet-stream',
];

/**
 * Headers worth passing back from the build host.
 *
 * `content-encoding` belongs here because cURL hands back the RAW bytes, so a
 * file the host labelled gzip still needs that label. The Node twin in
 * `server.ts` must NOT forward it: Node's fetch decodes the body for you but
 * leaves the header in place, and the browser then fails with
 * `ERR_CONTENT_DECODING_FAILED` — a game that never boots. Do not "fix" one by
 * copying the other.
 *
 * `vary` is forwarded because the build host keys its compressed and plain
 * variants on `Accept-Encoding`. A shared cache that is not told that will store
 * one variant and hand it back for the other, and a Unity build whose parts came
 * from two different variants is exactly the "function signature mismatch" set.
 */
const PASSTHROUGH = ['accept-ranges', 'content-range', 'content-encoding', 'vary'];

/**
 * Our OWN cache validator, namespaced with the proxy generation.
 *
 * Forwarding the build host's `ETag` verbatim was a mistake with a permanent
 * consequence. A browser that stored a body from an earlier proxy build — one that
 * labelled a decoded body as gzip, or handed over a half-updated set — keeps
 * REVALIDATING that stored copy, and the host answers 304 because the ETag still
 * matches. So the broken copy is never replaced: the game dies with "RuntimeError:
 * null function or function signature mismatch" or "expected magic word 00 61 73 6d"
 * on every reload, in every browser that ever saw the old proxy, forever.
 *
 * So the validator the browser sees is OURS: `"tc3.<base64url(upstream etag|size)>"`.
 * The upstream value is embedded, so a revalidation still costs exactly one
 * conditional request upstream and still answers 304 when nothing changed — but a
 * copy stored by any other generation of this proxy carries a tag this file does
 * not recognise, and an unrecognised tag forces an UNCONDITIONAL fetch: 200 with
 * the bytes the host serves right now. Bump the prefix whenever a change could
 * have written a body that was not byte-identical to the build host's.
 *
 * The host's `ETag` and `Last-Modified` are therefore never forwarded to the
 * browser (see PASSTHROUGH, and the capture in the header callback below).
 */
const VALIDATOR_TAG_PREFIX = 'tc3.';

function tutorly_validator_tag(string $validator, int $length): string
{
    $raw = $validator . '|' . $length;
    return '"' . VALIDATOR_TAG_PREFIX . rtrim(strtr(base64_encode($raw), '+/', '-_'), '=') . '"';
}

/** The upstream validator inside one of our tags, or null for anything else. */
function tutorly_decode_tag(string $tag): ?array
{
    $tag = trim($tag);
    if (strlen($tag) > 1 && $tag[0] === '"' && substr($tag, -1) === '"') {
        $tag = substr($tag, 1, -1);
    }
    if (strpos($tag, VALIDATOR_TAG_PREFIX) !== 0) {
        return null;
    }
    $b64 = strtr(substr($tag, strlen(VALIDATOR_TAG_PREFIX)), '-_', '+/');
    $pad = strlen($b64) % 4;
    if ($pad > 0) {
        $b64 .= str_repeat('=', 4 - $pad);
    }
    $raw = base64_decode($b64, true);
    if (!is_string($raw) || strpos($raw, '|') === false) {
        return null;
    }
    $parts = explode('|', $raw, 2);
    return ['validator' => $parts[0], 'length' => (int) $parts[1]];
}

/** Pull our tag out of a browser `If-None-Match`, which may hold several. */
function tutorly_our_tag(string $ifNoneMatch): ?string
{
    if ($ifNoneMatch === '') {
        return null;
    }
    if (!preg_match('/"?' . preg_quote(VALIDATOR_TAG_PREFIX, '/') . '[A-Za-z0-9\-_]+"?/', $ifNoneMatch, $m)) {
        return null;
    }
    return $m[0];
}

/**
 * Why the build files are NOT cached blind, and media is.
 *
 * A Unity build is a set of files that only work together: the loader `.js` and
 * the `.wasm`/`.data` it drives share a function table. If a Playable is updated on
 * YouTube's side and the browser serves one file from its cache while fetching
 * another fresh, the very first JS->wasm call through a stale table index fails
 * with "RuntimeError: null function or function signature mismatch" in
 * `invoke_iiii`/`Browser_mainLoop_runner` — mid-game, "sometimes", in whichever
 * title had been updated. `no-cache` plus the conditional request forwarded below
 * removes the skew: unchanged files still cost only a 304.
 *
 * So these files are `no-store`: nothing may keep a copy, neither the browser nor
 * an intermediary (a cPanel host's LiteSpeed/mod_deflate, a CDN in front of it).
 *
 * Why the bluntest policy rather than `no-cache, must-revalidate`: the build host
 * sends NO `ETag` and NO `Last-Modified` for these assets, so there was never a
 * validator to revalidate against — `no-cache` already meant a full re-fetch on
 * every load. `no-store` costs nothing extra and additionally forbids a cache that
 * never asks (the host, a proxy tier, a service worker) from answering for the
 * build at all. The only way a mixed set can then reach the wasm compiler is if the
 * game requests one, and then it is the build's own problem, not ours.
 */
const COUPLED_EXT = [
    'js', 'mjs', 'wasm', 'data', 'unityweb', 'mem', 'symbols', 'bin', 'bundle',
    'json', 'css', 'html', 'htm', 'framework',
];

function tutorly_cache_control(string $path): string
{
    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    if (substr($ext, -3) === '.gz') {
        $ext = substr($ext, 0, -3);
    }
    return in_array($ext, COUPLED_EXT, true) ? 'no-store' : 'public, max-age=86400';
}

/**
 * What compression a stream's first bytes say it is (brotli has no magic, so it
 * cannot be detected this way — the `accept-encoding: identity` we send upstream
 * is what keeps it out of here).
 */
function tutorly_detect_encoding(string $bytes): string
{
    if (substr($bytes, 0, 2) === "\x1f\x8b") {
        return 'gzip';
    }
    if (substr($bytes, 0, 4) === "\x28\xb5\x2f\xfd") {
        return 'zstd';
    }
    $two = substr($bytes, 0, 2);
    if ($two === "\x78\x9c" || $two === "\x78\xda" || $two === "\x78\x01") {
        return 'deflate';
    }
    return '';
}

/**
 * Headers that let a console on ANOTHER origin use this proxy.
 *
 * The proxy usually sits next to the console (`<base>/play.php`), but the whole
 * point of the path contract is that the same file can be hosted elsewhere — a
 * different cPanel account, a second domain, a tunnel. A browser will not let one
 * origin read another's response without CORS, so without these headers the probe
 * fails with an opaque "network error" and the console reports that the proxy is
 * missing when it is in fact answering perfectly. `*` is correct here: the proxy
 * serves public YouTube builds and holds no session of its own.
 */
function tutorly_cors(): void
{
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, HEAD, OPTIONS');
    header('Access-Control-Allow-Headers: Range, Content-Type');
    header('Access-Control-Max-Age: 86400');
}

function tutorly_json(array $payload, int $status = 200): void
{
    http_response_code($status);
    tutorly_cors();
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function tutorly_fail(int $status, string $message): void
{
    tutorly_json(['error' => $message], $status);
}

/** This app's own folder, e.g. `/tutorly-games/adult/console`. */
function tutorly_app_base(): string
{
    $script = isset($_SERVER['SCRIPT_NAME']) ? (string) $_SERVER['SCRIPT_NAME'] : '/play.php';
    $dir = str_replace('\\', '/', dirname($script));
    if ($dir === '/' || $dir === '.' || $dir === '') {
        return '';
    }
    return rtrim($dir, '/');
}

function tutorly_is_safe_host(string $host): bool
{
    return preg_match('/^[a-z0-9-]{1,64}$/i', $host) === 1;
}

/** No traversal, no backslashes, no empty segment — one path, inside the build. */
function tutorly_is_safe_path(string $path): bool
{
    if ($path === '' || strpos($path, '\\') !== false || strpos($path, "\0") !== false) {
        return false;
    }
    foreach (explode('/', $path) as $segment) {
        if ($segment === '' || $segment === '.' || $segment === '..') {
            return false;
        }
    }
    return true;
}

function tutorly_mime_for(string $path): string
{
    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    if (substr($ext, -3) === '.gz') {
        $ext = substr($ext, 0, -3);
    }
    return MIME[$ext] ?? 'application/octet-stream';
}

function tutorly_is_html_path(string $path): bool
{
    return preg_match('/\.html?$/i', $path) === 1;
}

/**
 * Rewrite the wrapper document so it runs inside the console.
 *
 * Three changes, each with a reason:
 *   1. the CSP `<meta>` tags go — the header form is already dropped, because this
 *      response's headers are ours, not the build host's;
 *   2. root-absolute references are re-pointed at this proxy (relative ones already
 *      resolve correctly — that is why the build host is in the path);
 *   3. the YouTube Playables SDK is swapped for our `ytgame-shim.js`, which
 *      implements the same API surface (sendScore, saveData, …) so the game runs
 *      outside YouTube and still reports scores.
 */
/**
 * Stamp the build's own file names in the page itself.
 *
 * The runtime patch cannot reach a script the page creates for itself — and Unity's
 * loader does exactly that (`script.src = loaderUrl`). The loader is the file that
 * builds the wasm's function table and import object, so a cached loader next to a
 * fresh wasm is the classic `RuntimeError: null function or function signature
 * mismatch`. Rewriting the names in the HTML closes that hole: every file of the
 * set — loader, framework, wasm, data, and the template's own `.js` — is requested
 * under a URL that only exists for this build.
 */
function tutorly_stamp_build_urls(string $html, string $token): string
{
    if ($token === '') {
        return $html;
    }
    $out = preg_replace_callback(
        '/(["\'])(?!https?:|\/\/|blob:|data:)([^"\'\s<>]+\.(?:unityweb|data|wasm|mem|symbols|bin|bundle|js))(\?[^"\']*)?(["\'])/i',
        function ($m) use ($token) {
            if (isset($m[3]) && $m[3] !== '' && strpos($m[3], 'bt=') !== false) {
                return $m[0];
            }
            $query = isset($m[3]) ? $m[3] : '';
            return $m[1] . $m[2] . $query . ($query !== '' ? '&' : '?') . 'bt=' . $token . $m[4];
        },
        $html
    );
    return is_string($out) ? $out : $html;
}

function tutorly_transform_html(string $html, string $host, string $appBase, string $token = ''): string
{
    $proxyPrefix = $appBase . '/play.php/' . $host . '/';

    $out = preg_replace('/<meta[^>]+http-equiv=["\']?Content-Security-Policy["\']?[^>]*>/i', '', $html);
    $out = is_string($out) ? $out : $html;

    $rewritten = preg_replace(
        '/(src|href|data-src|poster)=(["\'])\/(?!\/|play\.php\/|ytgame-shim\.js)/i',
        '$1=$2' . $proxyPrefix,
        $out
    );
    $out = is_string($rewritten) ? $rewritten : $out;

    $rewritten = preg_replace('/url\((["\']?)\/(?!\/|play\.php\/|ytgame-shim\.js)/i', 'url($1' . $proxyPrefix, $out);
    $out = is_string($rewritten) ? $rewritten : $out;

    $swapped = preg_replace(
        '/(["\'])https?:\/\/www\.youtube\.com\/game_api\/v\d+\/?\1/i',
        '$1' . $appBase . '/ytgame-shim.js$1',
        $out
    );
    $out = is_string($swapped) ? $swapped : $out;

    if (stripos($out, 'ytgame-shim.js') === false) {
        $injected = preg_replace(
            '/<head[^>]*>/i',
            '$0' . "\n" . '<script src="' . $appBase . '/ytgame-shim.js"></script>',
            $out,
            1
        );
        $out = is_string($injected) ? $injected : $out;
    }

    // Before anything else in the page: stamp this build's asset URLs, both in the
    // names the page will use and for anything it builds at runtime.
    if ($token !== '') {
        $stamped = preg_replace('/<head[^>]*>/i', '$0' . "\n" . tutorly_build_stamp($token), $out, 1);
        $out = is_string($stamped) ? $stamped : $out;
    }

    return tutorly_stamp_build_urls($out, $token);
}

/**
 * A short, stable name for the build SET this HTML belongs to.
 *
 * A Unity build is one artifact split across four files (loader `.js`, framework
 * `.js`, `.wasm`, `.data`) that share a single function table. If a browser serves
 * one of them from an older copy, the first JS→wasm call through a stale table
 * index dies with `RuntimeError: null function or function signature mismatch`,
 * and the C# delegate plumbing throws `ArgumentException: Incompatible Delegate
 * Types`. Sending `no-store` stops NEW copies being stored but cannot evict one
 * cached under an older policy — so every build URL is also stamped with this
 * token. A changed build means changed URLs, and no stale file can be mixed into
 * a fresh set again. Nonces are removed first, so the token is stable per build.
 */
function tutorly_build_token(string $html, string $validator, string $fresh = ''): string
{
    $stable = preg_replace('/nonce="[^"]*"/i', '', $html);
    $stable = is_string($stable) ? $stable : $html;
    $stable = preg_replace('/\s+/', ' ', $stable);
    $stable = is_string($stable) ? $stable : $html;
    // The proxy's own version is part of the token as well: if this side changes
    // how a build is served, every stamp changes with it and nothing is served
    // "from cache" that was stored by an older proxy.
    //
    // `fresh` is the console's own marker, sent when a tutor asks for a fresh copy
    // (the rig's hard reset). It is not a cache policy - it is the one lever a page
    // has over caches it may not clear: a value nothing has ever requested, which
    // makes every stamped URL new, so the build set is fetched instead of recalled.
    $seed = $stable . '|' . $validator . '|v' . PROXY_VERSION . ($fresh !== '' ? '|f' . $fresh : '');
    $hash = 5381;
    $len = strlen($seed);
    for ($i = 0; $i < $len; $i++) {
        $hash = (($hash * 33) ^ ord($seed[$i])) & 0xFFFFFFFF;
    }
    return base_convert((string) $hash, 10, 36) . '-' . base_convert((string) $len, 10, 36);
}

/**
 * The freshness marker on a game-page request, if there is one.
 *
 * Kept to a short opaque token: it ends up inside build URLs, so anything that
 * could confuse a URL is dropped rather than encoded and carried around.
 */
function tutorly_fresh(): string
{
    $raw = isset($_GET['fresh']) ? (string) $_GET['fresh'] : '';
    return preg_match('/^[A-Za-z0-9._-]{1,32}$/', $raw) === 1 ? $raw : '';
}

/**
 * The stamp that makes a build set cache-proof.
 *
 * It runs before the game's own script and appends `?bt=<token>` to every build
 * file the page asks for — through both `XMLHttpRequest` and `fetch`, because
 * Unity's loader uses one or the other depending on its version. The proxy drops
 * the parameter before talking to the build host, so it never reaches YouTube.
 */
function tutorly_build_stamp(string $token): string
{
    $json = json_encode((string) $token, JSON_UNESCAPED_SLASHES);
    $body = '(function(){var T=' . $json . ';'
        // A suffix list rather than a regular expression: identical script in all
        // three providers, and nothing in it can be mangled by a layer of quoting.
        // `.js` is in the list because the loader is a script the page creates for
        // itself, and a stale loader with a fresh wasm is exactly the mismatch the
        // stamp exists to prevent.
        . 'var EXT=[".unityweb",".data",".wasm",".mem",".symbols",".bin",".bundle",".js"];'
        . 'function isBuild(u){if(typeof u!=="string"||!u)return false;if(u.indexOf("bt=")!==-1)return false;'
        . 'for(var i=0;i<EXT.length;i++){if(u.indexOf(EXT[i])!==-1)return true;}return false;}'
        . 'function stamp(u){return isBuild(u)?u+(u.indexOf("?")===-1?"?":"&")+"bt="+T:u;}'
        . 'function stampInput(i){try{if(typeof i==="string")return stamp(i);if(i&&typeof i.url==="string"&&isBuild(i.url))return new Request(stamp(i.url),i);}catch(e){}return i;}'
        . 'try{var o=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){try{if(typeof u==="string")arguments[1]=stamp(u);else if(u&&typeof u.href==="string")arguments[1]=stamp(u.href);}catch(e){}return o.apply(this,arguments);};}catch(e){}'
        . 'try{var f=window.fetch;if(f){window.fetch=function(i,n){return f.call(this,stampInput(i),n);};}}catch(e){}'
        . 'window.__tutorlyBuildToken=T;})();';
    return '<script>' . $body . '</script>';
}

/** Decode a JSON string literal scraped out of a YouTube page. */
function tutorly_json_string(string $raw): string
{
    $decoded = json_decode('"' . $raw . '"');
    if (is_string($decoded)) {
        return $decoded;
    }
    return str_replace(['\\u0026', '\\/'], ['&', '/'], $raw);
}

/**
 * `?resolve=<id>` — find a Playable's real build host, the way the old
 * `/api/playables/resolve` route did: read the public playables page and pull the
 * launch URL out of its `miniAppContainerViewModel`.
 */
function tutorly_resolve(string $rawId): void
{
    $id = null;
    if (preg_match('#playables/([A-Za-z0-9_-]{10,})#', $rawId, $match)) {
        $id = $match[1];
    } elseif (preg_match('/^[A-Za-z0-9_-]{10,}$/', trim($rawId))) {
        $id = trim($rawId);
    }
    if ($id === null) {
        tutorly_fail(400, 'Provide a YouTube Playables ID or URL (e.g. https://www.youtube.com/playables/Ugk...)');
    }

    $ch = curl_init('https://www.youtube.com/playables/' . rawurlencode($id) . '?hl=en');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_USERAGENT => UA,
        CURLOPT_HTTPHEADER => [
            'accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'accept-language: en-US,en;q=0.9',
            'cookie: SOCS=CAI; CONSENT=YES+cb.20240101-00-p0.en+FX+000',
        ],
    ]);
    $html = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if (!is_string($html) || $html === '') {
        tutorly_fail(502, $error !== '' ? $error : 'YouTube did not answer (HTTP ' . $status . ')');
    }

    $launch = null;
    if (preg_match('/"miniAppContainerViewModel":\{"url":\{"privateDoNotAccessOrElseTrustedResourceUrlWrappedValue":"([^"]+)"/', $html, $match)) {
        $launch = tutorly_json_string($match[1]);
    } elseif (preg_match('/"privateDoNotAccessOrElseTrustedResourceUrlWrappedValue":"(https:[^"]*playables\.usercontent\.goog[^"]*)"/', $html, $match)) {
        $launch = tutorly_json_string($match[1]);
    }

    if ($launch === null) {
        tutorly_fail(404, 'Could not locate a game build on that Playables page. The game may be region-locked, removed, or require sign-in.');
    }

    $parts = parse_url($launch);
    if ($parts === false) {
        tutorly_fail(502, 'YouTube returned a launch URL that cannot be parsed.');
    }
    $hostname = isset($parts['host']) ? $parts['host'] : '';
    $entryPath = ltrim(isset($parts['path']) ? $parts['path'] : 'index.html', '/');
    $hash = isset($parts['fragment']) ? $parts['fragment'] : '';
    if ($entryPath === '') {
        $entryPath = 'index.html';
    }

    if (preg_match('/^([a-z0-9-]+)\.playables\.usercontent\.goog$/i', $hostname, $hostMatch) !== 1) {
        // Not a proxied CDN build (e.g. gamesnacks.com) — the app frames those directly.
        tutorly_json([
            'id' => $id,
            'title' => $id,
            'launchUrl' => $launch,
            'buildHost' => $hostname,
            'entryPath' => $entryPath,
            'hash' => $hash,
            'direct' => true,
        ]);
    }

    $buildHost = $hostMatch[1];

    $title = $id;
    if (preg_match('/<title>([^<]*)<\/title>/', $html, $match)) {
        $title = trim(preg_replace('/\s*-\s*YouTube\s*$/', '', html_entity_decode($match[1], ENT_QUOTES | ENT_HTML5, 'UTF-8')));
        if ($title === '' || $title === null) {
            $title = $id;
        }
    }
    $genre = preg_match('/"primaryGenre":"([^"]*)"/', $html, $match) ? tutorly_json_string($match[1]) : '';
    $developer = preg_match('/\{"label":"Developer","value":"((?:[^"\\\\]|\\\\.)*)"\}/', $html, $match) ? tutorly_json_string($match[1]) : '';
    $description = preg_match('/"miniAppGameInfoDialogViewModel":\{[^{}]*?"description":"((?:[^"\\\\]|\\\\.)*)"/', $html, $match) ? tutorly_json_string($match[1]) : '';
    $thumb = '';
    if (preg_match('/"og:image"\s+content="([^"]+)"/', $html, $match)) {
        $thumb = html_entity_decode($match[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
    } elseif (preg_match('/property="og:image" content="([^"]+)"/', $html, $match)) {
        $thumb = html_entity_decode($match[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    tutorly_json([
        'id' => $id,
        'title' => $title,
        'launchUrl' => $launch,
        'buildHost' => $buildHost,
        'entryPath' => $entryPath,
        'hash' => $hash,
        'genre' => $genre,
        'developer' => $developer,
        'description' => $description,
        'thumbnailUrl' => $thumb,
        'direct' => false,
    ]);
}

/** Send our headers and (transformed, if HTML) body. */
function tutorly_commit(array &$state, string $host, string $appBase, bool $streaming): void
{
    $html = $state['html'];

    if (!$html) {
        $declared = isset($state['passthrough']['content-encoding']) ? $state['passthrough']['content-encoding'] : '';
        // The upstream was asked for identity, so this should be the raw file. If
        // the bytes say otherwise (a CDN that ignored it, an intermediary that
        // recompressed), label what we are actually holding instead of letting the
        // browser hand compressed bytes to the wasm compiler.
        $detected = tutorly_detect_encoding($state['buffer']);
        if ($detected !== '' && $declared === '') {
            $state['passthrough']['content-encoding'] = $detected;
            $declared = $detected;
        }

        // A `.wasm` that is not a wasm module (and is not compressed, so the
        // browser would decode it into one) means the build served the wrong
        // thing. Say so, instead of Unity's opaque "expected magic word".
        $ext = strtolower(pathinfo($state['path'], PATHINFO_EXTENSION));
        if (substr($ext, -3) === '.gz') {
            $ext = substr($ext, 0, -3);
        }
        if (
            $ext === 'wasm' && $declared === '' && $state['status'] === 200
            && empty($_SERVER['HTTP_RANGE'])
            && substr($state['buffer'], 0, 4) !== "\x00asm"
        ) {
            tutorly_fail(502, 'The game build served a file that is not a WebAssembly module. It may be mid-update — reload the game.');
        }
    }

    http_response_code($state['status'] > 0 ? $state['status'] : 200);
    tutorly_cors();
    $contentType = $state['ctype'] !== '' ? $state['ctype'] : ($html ? MIME['html'] : 'application/octet-stream');
    header('Content-Type: ' . $contentType);
    header('x-tutorly-proxy: ' . $host);
    foreach (PASSTHROUGH as $name) {
        if (isset($state['passthrough'][$name])) {
            header($name . ': ' . $state['passthrough'][$name]);
        }
    }

    if ($html) {
        $token = tutorly_build_token($state['buffer'], $state['upstreamEtag'] . $state['upstreamLastModified'], tutorly_fresh());
        $body = tutorly_transform_html($state['buffer'], $host, $appBase, $token);
        // The wrapper document is part of the set (it points at Build/…), so it is
        // `no-store` for the same reason as the build files themselves.
        header('Cache-Control: no-store');
        header('Content-Length: ' . strlen($body));
        echo $body;
    } else {
        header('Cache-Control: ' . tutorly_cache_control($state['path']));
        if ($state['upstreamEtag'] !== '' || $state['upstreamLength'] > 0) {
            header('ETag: ' . tutorly_validator_tag($state['upstreamEtag'], $state['upstreamLength']));
        }
        if (!$streaming) {
            header('Content-Length: ' . strlen($state['buffer']));
        } elseif ($state['upstreamLength'] > 0) {
            // The body is still exactly those bytes — saying so keeps the response
            // a bounded file rather than a chunked one an intermediary may mangle.
            header('Content-Length: ' . $state['upstreamLength']);
        }
        if ($state['buffer'] !== '') {
            echo $state['buffer'];
            $state['buffer'] = '';
        }
    }

    $state['committed'] = true;
}

/** Stream (buffer first, then stream) one upstream asset. */
function tutorly_proxy(string $host, string $path, string $appBase): void
{
    // Decode before encoding: a host may hand us an already-escaped segment.
    $encodedPath = implode('/', array_map('rawurlencode', array_map('rawurldecode', explode('/', $path))));
    $upstream = 'https://' . $host . UPSTREAM_SUFFIX . '/' . $encodedPath;

    $query = isset($_SERVER['QUERY_STRING']) ? (string) $_SERVER['QUERY_STRING'] : '';
    $query = preg_replace('/(^|&)(proxy_host|proxy_path|probe|resolve|u|bt)=[^&]*/', '$1', $query);
    $query = is_string($query) ? trim(preg_replace('/&+/', '&', $query), '&') : '';
    if ($query !== '') {
        $upstream .= '?' . $query;
    }

    $state = [
        'status' => 0,
        'ctype' => '',
        'passthrough' => [],
        'upstreamLength' => 0,
        'buffer' => '',
        'committed' => false,
        'html' => tutorly_is_html_path($path),
        'path' => $path,
        'upstreamEtag' => '',
        'upstreamLastModified' => '',
    ];

    // Ask for the file exactly as it is. The build host keys its compressed and
    // plain variants on this; requesting identity keeps exactly one variant in
    // flight, so no cache can mix them (see `vary` in PASSTHROUGH).
    $headers = ['accept: */*', 'accept-encoding: identity', 'user-agent: ' . UA];
    if (!empty($_SERVER['HTTP_RANGE'])) {
        $headers[] = 'range: ' . $_SERVER['HTTP_RANGE'];
    }
    // Only OUR validator is honoured, and only its embedded upstream value is sent
    // on — with `no-cache` that keeps a warm cache cheap (a 304 when the host
    // confirms the validator) while a tag from any older proxy falls through to a
    // full fetch. `If-Modified-Since` is deliberately ignored: a date cannot prove
    // the stored BODY is the one the host serves now, and that is the assumption a
    // mixed Unity build breaks. See VALIDATOR_TAG_PREFIX.
    $clientTag = tutorly_our_tag(isset($_SERVER['HTTP_IF_NONE_MATCH']) ? (string) $_SERVER['HTTP_IF_NONE_MATCH'] : '');
    if ($clientTag !== null) {
        $decoded = tutorly_decode_tag($clientTag);
        if ($decoded !== null && $decoded['validator'] !== '') {
            $headers[] = 'if-none-match: ' . $decoded['validator'];
        }
    }

    $ch = curl_init($upstream);
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_TIMEOUT => 120,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_HEADERFUNCTION => function ($curl, $line) use (&$state) {
            $trimmed = trim($line);
            if ($trimmed === '') {
                return strlen($line);
            }
            if (preg_match('#^HTTP/\S+\s+(\d{3})#', $trimmed, $match)) {
                $state['status'] = (int) $match[1];
                return strlen($line);
            }
            $pos = strpos($trimmed, ':');
            if ($pos !== false) {
                $name = strtolower(trim(substr($trimmed, 0, $pos)));
                $value = trim(substr($trimmed, $pos + 1));
                if ($name === 'content-type') {
                    $state['ctype'] = $value;
                    if (stripos($value, 'text/html') !== false) {
                        $state['html'] = true;
                    }
                } elseif ($name === 'content-length') {
                    $state['upstreamLength'] = (int) $value;
                } elseif ($name === 'etag') {
                    // Captured, not passed on: the browser must only ever see our
                    // namespaced tag (see VALIDATOR_TAG_PREFIX).
                    $state['upstreamEtag'] = $value;
                } elseif ($name === 'last-modified') {
                    $state['upstreamLastModified'] = $value;
                } elseif (in_array($name, PASSTHROUGH, true)) {
                    $state['passthrough'][$name] = $value;
                }
            }
            return strlen($line);
        },
        CURLOPT_WRITEFUNCTION => function ($curl, $chunk) use (&$state, $host, $appBase) {
            if ($state['committed']) {
                echo $chunk;
                return strlen($chunk);
            }
            $state['buffer'] .= $chunk;
            if ($state['html']) {
                // Buffered to the end on purpose: it has to be rewritten.
                return strlen($chunk);
            }
            if (strlen($state['buffer']) > BUFFER_LIMIT) {
                tutorly_commit($state, $host, $appBase, true);
            }
            return strlen($chunk);
        },
    ]);

    $ok = curl_exec($ch);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($ok === false && !$state['committed']) {
        tutorly_fail(502, 'Failed to reach the game build host: ' . ($curlError !== '' ? $curlError : 'unknown error'));
    }

    if (!$state['committed']) {
        if ($state['status'] === 304) {
            // Not modified: the host confirmed the validator the browser sent, so
            // its stored copy IS the current one. Answer with our own tag so the
            // browser keeps revalidating through us.
            http_response_code(304);
            tutorly_cors();
            header('ETag: ' . tutorly_validator_tag($state['upstreamEtag'], $state['upstreamLength']));
            header('Cache-Control: ' . tutorly_cache_control($state['path']));
            foreach (PASSTHROUGH as $name) {
                if (isset($state['passthrough'][$name])) {
                    header($name . ': ' . $state['passthrough'][$name]);
                }
            }
            return;
        }
        if ($state['status'] >= 400) {
            tutorly_fail($state['status'], 'Upstream returned HTTP ' . $state['status']);
        }
        tutorly_commit($state, $host, $appBase, false);
    }
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------
$appBase = tutorly_app_base();

// A console on another origin asks permission before a ranged asset request.
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    tutorly_cors();
    http_response_code(204);
    exit;
}

$rawPath = isset($_SERVER['PATH_INFO']) ? (string) $_SERVER['PATH_INFO'] : '';
if ($rawPath === '' && isset($_GET['proxy_host'], $_GET['proxy_path'])) {
    $rawPath = '/' . $_GET['proxy_host'] . '/' . $_GET['proxy_path'];
}
$rawPath = trim($rawPath, '/');

// Both shapes answer: the path form is what the console streams with, and
// `?__probe__=1` is the diagnostic used when a host refuses to pass extra path
// segments through to PHP (`AcceptPathInfo Off` and no working rewrite). A query
// probe answering on its own is NOT enough to stream — the app only reports the
// proxy as available for the path form — but it tells the tutor exactly what to fix.
if ($rawPath === '__probe__' || isset($_GET['__probe__'])) {
    tutorly_json([
        'ok' => true,
        'proxy' => 'php',
        'version' => PROXY_VERSION,
        'php' => PHP_VERSION,
        'curl' => function_exists('curl_init'),
        'mode' => $rawPath !== '__probe__' ? 'query' : (isset($_GET['proxy_host']) ? 'rewrite' : 'path-info'),
    ]);
}

if (isset($_GET['resolve'])) {
    tutorly_resolve((string) $_GET['resolve']);
}

if ($rawPath === '') {
    // Legacy absolute form, kept so a cached page from the Node version cannot 500.
    if (isset($_GET['u'])) {
        $parts = parse_url((string) $_GET['u']);
        $full = is_array($parts) && isset($parts['host']) ? $parts['host'] : '';
        $upstreamHost = preg_replace('/' . preg_quote(UPSTREAM_SUFFIX, '/') . '$/', '', $full);
        $legacyPath = is_array($parts) && isset($parts['path']) ? trim($parts['path'], '/') : '';
        if (!is_string($upstreamHost) || !tutorly_is_safe_host($upstreamHost) || !tutorly_is_safe_path($legacyPath)) {
            tutorly_fail(400, 'Not a valid Playables build address.');
        }
        tutorly_proxy($upstreamHost, $legacyPath, $appBase);
        exit;
    }
    tutorly_fail(400, 'Nothing to proxy. Use play.php/<host>/<path>, ?resolve=<id>, or play.php/__probe__.');
}

$segments = explode('/', $rawPath);
$host = array_shift($segments);
$path = implode('/', $segments);

if (!tutorly_is_safe_host($host) || !tutorly_is_safe_path($path)) {
    tutorly_fail(400, 'Invalid proxy target.');
}

// A build that asks for the shim relative to itself.
if (basename($path) === 'ytgame-shim.js') {
    header('Location: ' . $appBase . '/ytgame-shim.js', true, 307);
    exit;
}

tutorly_proxy($host, $path, $appBase);
