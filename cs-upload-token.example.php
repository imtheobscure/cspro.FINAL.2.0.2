<?php
/**
 * TEMPLATE for the upload token — commit this, never the real one.
 *
 * The live file is `cs-upload-token.php` (gitignored, listed under "Deployment
 * secrets" in .gitignore). To set it up:
 *
 *   1. Copy this file and rename the copy to `cs-upload-token.php`
 *   2. Put a long random string in it. Any of these is fine:
 *        - node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
 *        - openssl rand -base64 24
 *        - cPanel → PHP settings / just mash the keyboard; 30+ characters
 *   3. Upload it to ONE LEVEL ABOVE the web root — e.g. if the site is served
 *      from /home/miydtgmr/cspro.tutomy.com, the file goes in /home/miydtgmr/
 *      (the same place as cs-db_config.php)
 *
 * Then call upload.php with the token, either way round:
 *
 *     # as a header
 *     curl -X POST https://cspro.tutomy.com/upload.php \
 *          -H "X-Upload-Token: <your token>" \
 *          -F "file=@lesson.html"
 *
 *     # or as a form field
 *     curl -X POST https://cspro.tutomy.com/upload.php \
 *          -F "token=<your token>" \
 *          -F "file=@lesson.html"
 *
 * A good answer looks like:
 *     {"success":true,"filePath":"https://cspro.tutomy.com/uploads/….html","bytes":1234}
 *
 * No token file on the host = upload.php accepts ANYONE, and logs a warning on
 * every single request. Decide deliberately; don't leave it by accident.
 */

return 'REPLACE-WITH-A-LONG-RANDOM-STRING';
