require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });

const mysql = require("mysql2/promise");

/*
|--------------------------------------------------------------------------
| MySQL / MariaDB Connection Pool
|--------------------------------------------------------------------------
| Centralised database pool.  All SQL queries in the application use this
| pool.  Credentials come exclusively from environment variables — they
| are never hard-coded in JavaScript.
*/

const dbConfigured = Boolean(
    process.env.DB_HOST &&
    process.env.DB_USER &&
    process.env.DB_NAME
);

const poolConfig = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
};

if (process.env.DB_SSL === "true") {
    poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = mysql.createPool(poolConfig);

/*
|--------------------------------------------------------------------------
| Prepared-statement query helper
|--------------------------------------------------------------------------
| Every call uses parameter binding (?).  User input is never concatenated
| into the SQL string.
*/

async function query(sql, params) {
    if (!dbConfigured) {
        throw new Error("Database not configured");
    }
    const [rows] = await pool.execute(sql, params);
    return rows;
}

async function testConnection() {
    if (!dbConfigured) {
        throw new Error("Database not configured");
    }
    const rows = await query(
        "SELECT 1 AS alive",
        []
    );
    return rows;
}

async function initMoneySchema() {
    if (!dbConfigured) {
        return;
    }
    try {
        const columns = await query("SHOW COLUMNS FROM `money_entries`", []);
        const colNames = new Set(columns.map(function (c) { return c.Field; }));

        if (!colNames.has("customer_username")) {
            await query("ALTER TABLE `money_entries` ADD COLUMN `customer_username` VARCHAR(100) DEFAULT NULL AFTER `type`", []);
        }
        if (!colNames.has("payment_method")) {
            await query("ALTER TABLE `money_entries` ADD COLUMN `payment_method` VARCHAR(50) NOT NULL DEFAULT 'cash' AFTER `amount`", []);
        }
        if (!colNames.has("category")) {
            await query("ALTER TABLE `money_entries` ADD COLUMN `category` VARCHAR(100) DEFAULT NULL AFTER `payment_method`", []);
        }
    } catch (e) {
        // Non-critical if table doesn't exist yet or columns already exist
    }
}

async function initAllSchemas() {
    if (!dbConfigured) {
        return;
    }
    try {
        await initMoneySchema();

        await query(`
            CREATE TABLE IF NOT EXISTS \`admin_users\` (
                \`id\`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
                \`username\`   VARCHAR(100) NOT NULL UNIQUE,
                \`password\`   VARCHAR(255) NOT NULL,
                \`name\`       VARCHAR(100) DEFAULT 'Admin',
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `, []);

        const adminRows = await query("SELECT COUNT(*) AS count FROM `admin_users`", []);
        if (adminRows[0].count === 0) {
            const defaultUser = process.env.ADMIN_USER || "admin";
            const defaultPass = process.env.ADMIN_PASSWORD || "admin123";
            await query(
                "INSERT IGNORE INTO `admin_users` (`username`, `password`, `name`) VALUES (?, ?, 'Administrator')",
                [defaultUser, defaultPass]
            );
        }

        await query(`
            CREATE TABLE IF NOT EXISTS \`whatsapp_logs\` (
                \`id\`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
                \`customer_id\` INT UNSIGNED DEFAULT NULL,
                \`username\`    VARCHAR(100) NOT NULL,
                \`phone\`       VARCHAR(50) NOT NULL,
                \`type\`        ENUM('before_expiry', 'expired', 'manual', 'test') NOT NULL,
                \`message\`     TEXT NOT NULL,
                \`status\`      ENUM('sent', 'failed') NOT NULL,
                \`error\`       TEXT DEFAULT NULL,
                \`sent_date\`   DATE NOT NULL,
                \`created_at\`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (\`id\`),
                KEY \`idx_user_date\` (\`username\`, \`sent_date\`, \`type\`),
                KEY \`idx_sent_date\` (\`sent_date\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `, []);

        await query(`
            CREATE TABLE IF NOT EXISTS \`whatsapp_settings\` (
                \`skey\`       VARCHAR(50) NOT NULL PRIMARY KEY,
                \`svalue\`     TEXT NOT NULL,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `, []);

        await query(`
            CREATE TABLE IF NOT EXISTS \`user_bandwidth_daily\` (
                \`id\`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                \`username\`       VARCHAR(100) NOT NULL,
                \`usage_date\`     DATE NOT NULL,
                \`download_bytes\` BIGINT UNSIGNED NOT NULL DEFAULT 0,
                \`upload_bytes\`   BIGINT UNSIGNED NOT NULL DEFAULT 0,
                \`total_bytes\`    BIGINT UNSIGNED NOT NULL DEFAULT 0,
                \`peak_rx_mbps\`   DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                \`peak_tx_mbps\`   DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                \`online_seconds\` INT UNSIGNED NOT NULL DEFAULT 0,
                \`last_seen\`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`uq_user_date\` (\`username\`, \`usage_date\`),
                KEY \`idx_usage_date\` (\`usage_date\`),
                KEY \`idx_total_bytes\` (\`total_bytes\`),
                KEY \`idx_download_bytes\` (\`download_bytes\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `, []);

        try {
            const cols = await query("SHOW COLUMNS FROM `mikrotik_users`", []);
            const colNames = new Set(cols.map(c => c.Field));
            if (!colNames.has("password")) {
                await query("ALTER TABLE `mikrotik_users` ADD COLUMN `password` VARCHAR(255) NOT NULL DEFAULT '' AFTER `username`", []);
            }
        } catch (e) {
            // Ignore if mikrotik_users table does not exist yet
        }
    } catch (e) {
        console.error("[db] schema init warning:", e.message);
    }
}

module.exports = {
    pool,
    dbConfigured,
    query,
    testConnection,
    initMoneySchema,
    initAllSchemas,
};
