<?php
// Root proxy / fallback to public/auth.php or self-contained runner
if (file_exists(__DIR__ . '/public/auth.php')) {
    require_once __DIR__ . '/public/auth.php';
} else {
    // If copied directly to root on cPanel:
    require_once __DIR__ . '/auth.php';
}
?>
