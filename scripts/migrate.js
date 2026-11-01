require("dotenv").config();
const db = require("../db");

async function migrate() {
    console.log("Starting database migration...");

    if (!db.dbConfigured) {
        throw new Error("Database not configured in .env");
    }

    // 1. Create admin_users table (passwords stored in plain text as requested)
    await db.query(`
        CREATE TABLE IF NOT EXISTS \`admin_users\` (
            \`id\`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
            \`username\`   VARCHAR(100) NOT NULL UNIQUE,
            \`password\`   VARCHAR(255) NOT NULL,
            \`name\`       VARCHAR(100) DEFAULT 'Admin',
            \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, []);
    console.log("✓ admin_users table ready");

    // Seed default admin if table is empty
    const adminRows = await db.query("SELECT COUNT(*) AS count FROM `admin_users`", []);
    if (adminRows[0].count === 0) {
        const defaultUser = process.env.ADMIN_USER || "admin";
        const defaultPass = process.env.ADMIN_PASSWORD || "admin123";
        await db.query(
            "INSERT INTO `admin_users` (`username`, `password`, `name`) VALUES (?, ?, 'Administrator')",
            [defaultUser, defaultPass]
        );
        console.log(`✓ Seeded default admin user: ${defaultUser} (password: ${defaultPass})`);
    }

    // 2. Create whatsapp_logs table
    await db.query(`
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
    console.log("✓ whatsapp_logs table ready");

    // 3. Create whatsapp_settings table
    await db.query(`
        CREATE TABLE IF NOT EXISTS \`whatsapp_settings\` (
            \`skey\`       VARCHAR(50) NOT NULL PRIMARY KEY,
            \`svalue\`     TEXT NOT NULL,
            \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, []);
    console.log("✓ whatsapp_settings table ready");

    // 4. Ensure mikrotik_users has password column and other fields
    try {
        const cols = await db.query("SHOW COLUMNS FROM `mikrotik_users`", []);
        const colNames = new Set(cols.map(c => c.Field));
        if (!colNames.has("password")) {
            await db.query("ALTER TABLE `mikrotik_users` ADD COLUMN `password` VARCHAR(255) NOT NULL DEFAULT '' AFTER `username`", []);
            console.log("✓ Added password column to mikrotik_users");
        }
    } catch (e) {
        console.log("Note on mikrotik_users columns:", e.message);
    }

    console.log("Database migration completed successfully!");
}

migrate()
    .then(() => process.exit(0))
    .catch(err => {
        console.error("Migration failed:", err);
        process.exit(1);
    });
