-- ============================================================
-- TUTOR ACADEMY — USERS TABLE (MySQL)
-- ============================================================
-- How to use:
--   1. cPanel → MySQL® Databases → create a database (e.g. tutomy_auth)
--      and a database user with ALL PRIVILEGES on it.
--   2. cPanel → phpMyAdmin → open your new database → Import tab
--      → choose this schema.sql file → Go.
--   3. The master admin account is SEEDED at the bottom of this file (hashed
--      password), so you can log in to the Super Admin Console immediately
--      after importing. If it is ever deleted, auth.php re-seeds it on the
--      first request. Every existing account from the encrypted-file store
--      migrates into this table on the next save — or on demand from the
--      Super Admin Console → MySQL panel → "Migrate File Accounts".
--
-- The email column is the primary key because the whole app (React client,
-- auth.php, admin console) identifies accounts by lowercase email.
-- Timestamps are stored as ISO-8601 strings (VARCHAR) so they round-trip
-- exactly with the existing JSON contract — no timezone surprises.
-- ============================================================

CREATE TABLE IF NOT EXISTS `users` (
  `id`                 VARCHAR(64)  NOT NULL,
  `email`              VARCHAR(190) NOT NULL,
  `password_hash`      VARCHAR(255) NOT NULL DEFAULT '',
  -- Salted SHA-256 copy used by the browser's offline sign-in and by the
  -- Super Admin Console password reset. Must round-trip through MySQL.
  `password_hash_sha256` VARCHAR(128) NOT NULL DEFAULT '',
  `token`              VARCHAR(128) NOT NULL DEFAULT '',
  `name`               VARCHAR(120) NOT NULL DEFAULT '',
  `avatar_url`         TEXT,
  `avatar_id`          VARCHAR(64)  NOT NULL DEFAULT 'tutor-default',
  `bio`                TEXT,
  `teaching_method`    VARCHAR(120) NOT NULL DEFAULT '',
  `interests`          TEXT,
  `native_language`    VARCHAR(60)  NOT NULL DEFAULT 'English',
  `hourly_rate`        DECIMAL(10,2) NOT NULL DEFAULT 25.00,
  `country`            VARCHAR(60)  NOT NULL DEFAULT '',
  `timezone`           VARCHAR(60)  NOT NULL DEFAULT 'UTC',
  `tier`               VARCHAR(10)  NOT NULL DEFAULT 'free',
  `status`             VARCHAR(20)  NOT NULL DEFAULT 'active',
  `role`               VARCHAR(10)  NOT NULL DEFAULT 'tutor',
  `device_id`          VARCHAR(64)  NOT NULL DEFAULT '',
  `notes`              TEXT,
  `email_verified`     TINYINT(1)   NOT NULL DEFAULT 1,
  `schema_version`     INT          NOT NULL DEFAULT 3,
  `tier_expires_at`    VARCHAR(40)  NOT NULL DEFAULT '',
  `tier_sig`           VARCHAR(128) NOT NULL DEFAULT '',
  -- Gmail verification (register / resend / verify). auth.php also adds these
  -- automatically to an older table, so an existing install keeps working.
  `verification_code`   VARCHAR(16)  NOT NULL DEFAULT '',
  `verification_token`  VARCHAR(128) NOT NULL DEFAULT '',
  `verification_expires_at` VARCHAR(40) NOT NULL DEFAULT '',
  `max_adult_learners` INT          NOT NULL DEFAULT 30,
  `max_kids_learners`  INT          NOT NULL DEFAULT 30,
  `created_at`         VARCHAR(40)  NOT NULL DEFAULT '',
  `last_login`         VARCHAR(40)  NOT NULL DEFAULT '',
  PRIMARY KEY (`email`),
  KEY `idx_tier`   (`tier`),
  KEY `idx_status` (`status`),
  KEY `idx_role`   (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- VIP CLOUD BACKUP — SNAPSHOT + INDEX (HYBRID)
-- ============================================================
-- Storage is deliberately tiny so it is safe on shared cPanel hosting:
--
--   cloud_backups        ONE ROW PER TUTOR. The tutor's workspace is sent as
--                        gzip-compressed JSON and stored in a single LONGBLOB,
--                        so a full save is one row write and a restore is one
--                        row read — no per-learner rows, no joins, no N+1.
--   cloud_backup_index   A handful of tiny rows per tutor (one per section:
--                        learners, sessions, calendar, todos, …) purely so the
--                        dashboard can show honest counts/sizes without ever
--                        touching the big payload.
--
-- Generated lesson HTML is intentionally NOT stored here: it lives on the
-- tutor's hard disk. The cloud copy holds the business data a tutor cannot
-- recreate — learners, session/feedback records, schedules, bookings and
-- settings.
--
-- Both tables are InnoDB + utf8mb4 to match `users`, and every column is fixed
-- width or a blob so the table stays fast on a small shared-host buffer pool.
-- ============================================================

CREATE TABLE IF NOT EXISTS `cloud_backups` (
  `email`       VARCHAR(190)     NOT NULL,
  `payload`     LONGBLOB         NULL,                    -- gzip-compressed JSON (or raw when encoding='identity')
  `encoding`    VARCHAR(10)      NOT NULL DEFAULT 'gzip',
  `bytes`       INT UNSIGNED     NOT NULL DEFAULT 0,      -- stored size
  `raw_bytes`   INT UNSIGNED     NOT NULL DEFAULT 0,      -- uncompressed size
  `revision`    BIGINT UNSIGNED  NOT NULL DEFAULT 0,
  `device`      VARCHAR(64)      NOT NULL DEFAULT '',
  `checksum`    CHAR(40)         NOT NULL DEFAULT '',      -- sha1 of the stored payload
  `created_at`  VARCHAR(40)      NOT NULL DEFAULT '',
  `updated_at`  VARCHAR(40)      NOT NULL DEFAULT '',
  PRIMARY KEY (`email`),
  KEY `idx_cloud_updated` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cloud_backup_index` (
  `email`       VARCHAR(190)     NOT NULL,
  `section`     VARCHAR(40)      NOT NULL,
  `item_count`  INT UNSIGNED     NOT NULL DEFAULT 0,
  `bytes`       INT UNSIGNED     NOT NULL DEFAULT 0,
  `updated_at`  VARCHAR(40)      NOT NULL DEFAULT '',
  PRIMARY KEY (`email`, `section`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- MASTER SUPER ADMIN SEED
-- email:    info.tutomy@gmail.com
-- password: (bcrypt-hashed below — never store the plaintext)
-- The hash is bcrypt cost 10, verifiable with PHP password_verify():
--   password_verify('t-@CjR:c!Q3=5NZ', '<hash>') === true
-- ============================================================
INSERT INTO `users` (
  `id`, `email`, `password_hash`, `token`, `name`, `avatar_url`, `avatar_id`,
  `bio`, `teaching_method`, `interests`, `native_language`, `hourly_rate`,
  `country`, `timezone`, `tier`, `status`, `role`, `device_id`, `notes`,
  `email_verified`, `schema_version`, `tier_expires_at`, `tier_sig`,
  `max_adult_learners`, `max_kids_learners`, `created_at`, `last_login`
) VALUES (
  'admin_61b9038fcb', 'info.tutomy@gmail.com',
  '$2b$10$3SzTYT2.l6lqmtHPV5O2D.5GjOSxjr4HY1ZSdQggLJBP4gf6V.Bei',
  '', 'Super Admin', NULL, 'tutor-admin',
  'Tutomy Master Administrator', 'All Frameworks', 'Curriculum Design & System Management', 'English',
  25.00, 'Global', 'UTC', 'vip', 'active', 'admin', 'admin_master_device',
  'Master Super Admin Account', 1, 3, '', '', -1, -1,
  '2024-01-01T00:00:00+00:00', '2024-01-01T00:00:00+00:00'
)
ON DUPLICATE KEY UPDATE `id` = `id`;
-- (ON DUPLICATE KEY UPDATE id=id is a no-op: re-importing is safe and never
--  overwrites runtime changes like a rotated token or updated tier.)