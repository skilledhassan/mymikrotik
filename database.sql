-- ============================================================
-- MikroTik Panel – ISP Customer Database
-- ============================================================
-- MySQL is the source of truth for customer / account information.
-- MikroTik RouterOS stores the live PPPoE secret (authentication).
--
-- Run once to create the database tables:
--   mysql -u <DB_USER> -p<DB_PASSWORD> -h <DB_HOST> <DB_NAME> < database.sql
--
-- If `mikrotik_users` already exists from an earlier version, run the
-- ALTER TABLE block at the bottom instead of re-creating the table.
-- ============================================================

CREATE TABLE IF NOT EXISTS `mikrotik_users` (
    `id`            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `name`          VARCHAR(100)    DEFAULT NULL,
    `username`      VARCHAR(100)    NOT NULL,
    `password`      VARCHAR(255)    NOT NULL DEFAULT '',
    `mikrotik_id`   VARCHAR(64)     NOT NULL DEFAULT '',
    `profile`       VARCHAR(100)    DEFAULT NULL,
    `phone`         VARCHAR(50)     DEFAULT NULL,
    `package`       VARCHAR(100)    DEFAULT NULL,
    `price`         DECIMAL(10,2)   DEFAULT NULL,
    `start_date`    DATE            DEFAULT NULL,
    `expiry_date`   DATE            DEFAULT NULL,
    `status`        ENUM('active','expired','suspended') NOT NULL DEFAULT 'active',
    `comment`       TEXT            DEFAULT NULL,
    `created_at`    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_username` (`username`),
    KEY `idx_status` (`status`),
    KEY `idx_expiry` (`expiry_date`),
    KEY `idx_package` (`package`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Activity / audit log.  Passwords are NEVER written to this table.

CREATE TABLE IF NOT EXISTS `audit_log` (
    `id`            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `action`        VARCHAR(50)     NOT NULL,
    `username`      VARCHAR(100)    DEFAULT NULL,
    `details`       TEXT            DEFAULT NULL,
    `created_at`    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_action` (`action`),
    KEY `idx_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Money / wallet ledger
-- ============================================================
-- Records all money movements for the business:
--   income   – money received (adds to balance)
--   debit    – money spent   (subtracts from balance)
--   upcoming – expected money (not yet received, shown separately)
--   note     – journal entry, no amount
-- Wallet balance = SUM(income) - SUM(debit).

CREATE TABLE IF NOT EXISTS `money_entries` (
    `id`                INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `type`              ENUM('income','debit','upcoming','note','payment','charge','discount') NOT NULL DEFAULT 'income',
    `customer_username` VARCHAR(100)    DEFAULT NULL,
    `description`       VARCHAR(255)    NOT NULL,
    `amount`            DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    `payment_method`    VARCHAR(50)     NOT NULL DEFAULT 'cash',
    `category`          VARCHAR(100)    DEFAULT NULL,
    `entry_date`        DATE            NOT NULL,
    `created_at`        TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_type` (`type`),
    KEY `idx_customer` (`customer_username`),
    KEY `idx_entry_date` (`entry_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Money settings (key/value, JSON values)
-- ============================================================
--   monthly_costs  -> JSON array of { label, amount } running costs
--                     e.g. CIR 45000 + 2x 30 Mbps packages
--   package_prices -> JSON object { "<speed>": price } e.g. { "6": 1500 }

CREATE TABLE IF NOT EXISTS `money_settings` (
    `id`            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `skey`          VARCHAR(50)     NOT NULL,
    `svalue`        TEXT            NOT NULL,
    `updated_at`    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_skey` (`skey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Admin Users (Panel Authentication)
-- ============================================================
-- Passwords saved in plain text as configured.

CREATE TABLE IF NOT EXISTS `admin_users` (
    `id`            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `username`      VARCHAR(100)    NOT NULL UNIQUE,
    `password`      VARCHAR(255)    NOT NULL,
    `name`          VARCHAR(100)    DEFAULT 'Admin',
    `created_at`    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Default administrator credentials:
INSERT IGNORE INTO `admin_users` (`username`, `password`, `name`)
VALUES ('admin', 'admin123', 'Administrator');

-- ============================================================
-- WhatsApp Notifications & Delivery Logs (OpenWA)
-- ============================================================

CREATE TABLE IF NOT EXISTS `whatsapp_logs` (
    `id`            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `customer_id`   INT UNSIGNED    DEFAULT NULL,
    `username`      VARCHAR(100)    NOT NULL,
    `phone`         VARCHAR(50)     NOT NULL,
    `type`          ENUM('before_expiry', 'expired', 'manual', 'test') NOT NULL,
    `message`       TEXT            NOT NULL,
    `status`        ENUM('sent', 'failed') NOT NULL,
    `error`         TEXT            DEFAULT NULL,
    `sent_date`     DATE            NOT NULL,
    `created_at`    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_user_date` (`username`, `sent_date`, `type`),
    KEY `idx_sent_date` (`sent_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `whatsapp_settings` (
    `skey`          VARCHAR(50)     NOT NULL PRIMARY KEY,
    `svalue`        TEXT            NOT NULL,
    `updated_at`    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_bandwidth_daily` (
    `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `username`       VARCHAR(100)    NOT NULL,
    `usage_date`     DATE            NOT NULL,
    `download_bytes` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `upload_bytes`   BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `total_bytes`    BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `peak_rx_mbps`   DECIMAL(10, 2)  NOT NULL DEFAULT 0.00,
    `peak_tx_mbps`   DECIMAL(10, 2)  NOT NULL DEFAULT 0.00,
    `online_seconds` INT UNSIGNED    NOT NULL DEFAULT 0,
    `last_seen`      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_user_date` (`username`, `usage_date`),
    KEY `idx_usage_date` (`usage_date`),
    KEY `idx_total_bytes` (`total_bytes`),
    KEY `idx_download_bytes` (`download_bytes`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Upgrade for existing installations
-- ============================================================
-- ALTER TABLE `mikrotik_users`
--     ADD COLUMN `name`        VARCHAR(100) DEFAULT NULL AFTER `id`,
--     ADD COLUMN `password`    VARCHAR(255) NOT NULL DEFAULT '' AFTER `username`,
--     ADD COLUMN `profile`     VARCHAR(100) DEFAULT NULL AFTER `mikrotik_id`,
--     ADD COLUMN `start_date`  DATE DEFAULT NULL AFTER `price`,
--     ADD COLUMN `status`      ENUM('active','expired','suspended') NOT NULL DEFAULT 'active' AFTER `expiry_date`;
--
-- ALTER TABLE `money_entries`
--     ADD COLUMN `customer_username` VARCHAR(100) DEFAULT NULL AFTER `type`,
--     ADD COLUMN `payment_method`    VARCHAR(50) NOT NULL DEFAULT 'cash' AFTER `amount`,
--     ADD COLUMN `category`          VARCHAR(100) DEFAULT NULL AFTER `payment_method`;