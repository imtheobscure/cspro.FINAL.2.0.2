<?php
// ============================================================
// MYSQL DATABASE CREDENTIALS — TUTOR ACADEMY
// ============================================================
// FILE NAME ON THE HOST:   cs-db_config.php
//                          (rename this template to exactly that)
//
// WHERE IT GOES — ONE LEVEL ABOVE THE SITE, outside the web root, so it
// cannot be fetched over HTTP at all:
//
//     /home/miydtgmr/cs-db_config.php        <-- recommended
//
// The site itself is /home/miydtgmr/cspro.tutomy.com/, and auth.php looks one
// level up from wherever it is running. Putting the file beside auth.php also
// works, but then a web request can reach it and only .htaccess stops it, so
// that is the fallback rather than the plan.
//
// NOTHING YOU UPLOAD CONTAINS THIS FILE. `npm run build` ships only this
// template (as dist/cs-db_config.example.php) and copies no real credentials
// file into dist/, because dist/ is exactly what gets uploaded publicly. So:
// after a rebuild you never lose this file, and you never re-upload it either.
//
// WHERE auth.php LOOKS — every name, then every folder:
//   names   cs-db_config.php · cs_db_config.php · db-config.php · db_config.php
//           (plus a cPanel-prefixed name such as miydtgmr_cs-db_config.php)
//   folders the folder named by the AUTH_DB_CONFIG env var (an absolute path)
//           one level above the document root        <-- recommended
//           the document root itself
//           $HOME, but only when the host really sets it
// The Super Admin Console reports the exact path that answered, and every path
// it checked when none did.
//
// FILL IN FROM cPanel → MySQL® Databases. Both names are prefixed with your
// cPanel account name (miydtgmr), so copy them, do not retype them:
// ============================================================

return [
    'host' => 'localhost',              // cPanel MySQL is always localhost
    'name' => 'miydtgmr_cspro356',      // the DATABASE name (cPanel-prefixed)
    'user' => 'miydtgmr_cspro356',      // the USER name (cPanel-prefixed)
    'pass' => 'YOUR_DB_PASSWORD'        // that user's password, from cPanel
];
