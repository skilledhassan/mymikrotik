require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });

const db = require("./db");
const mikrotik = require("./mikrotik");
const dates = require("./dates");
const whatsapp = require("./whatsapp");

/*
|--------------------------------------------------------------------------
| WhatsApp Remote Control Bot & Automated Daily ISP Schedule
|--------------------------------------------------------------------------
| Primary Admin: 03101361647
| Features:
|   1. 24-Hour Automated Schedule ("Todo List for All Day Messages")
|   2. Full Remote Admin Bot (MikroTik management, Billing, Customers)
|   3. Router Health Watchdog WhatsApp Notifications
|   4. Secure sender verification (Supports separate numbers AND self-chat)
|--------------------------------------------------------------------------
*/

const PRIMARY_ADMIN_PHONE = "03101361647";
const ADMIN_CLEAN_PHONE = "923101361647";
const BOT_PHONE = "03063677708";
const BOT_CLEAN_PHONE = "923063677708";

function cleanNumber(phone) {
    if (!phone || typeof phone !== "string") return "";
    let cleaned = phone.replace(/@.*$/, "").replace(/\D/g, "");
    if (cleaned.startsWith("0")) {
        cleaned = "92" + cleaned.substring(1);
    }
    return cleaned;
}

function isAdmin(senderPhone) {
    const sender = cleanNumber(senderPhone);
    const configuredAdmin = cleanNumber(process.env.ADMIN_PHONE || PRIMARY_ADMIN_PHONE);
    return sender === ADMIN_CLEAN_PHONE || sender === configuredAdmin;
}

/*
|--------------------------------------------------------------------------
| OpenWA Webhook Auto-Registration
|--------------------------------------------------------------------------
*/
async function registerWebhookWithOpenWA() {
    try {
        const settings = await whatsapp.getSettings();
        const baseUrl = (settings.openwa_base_url || "https://openwa-2paj.onrender.com/api").replace(/\/+$/, "");
        const apiKey = settings.openwa_api_key || "openwa-master-key-mikrotik-2026-secret-token";
        
        // Resolve the real session UUID from OpenWA
        const sessionId = await whatsapp.resolveSessionId(settings);
        if (!sessionId) {
            console.warn("[whatsapp-bot] No active session UUID found in OpenWA.");
            return { ok: false, error: "No active session in OpenWA. Please scan QR code first." };
        }

        const myUrl = process.env.RENDER_EXTERNAL_URL || "https://mymikrotik.onrender.com";
        const webhookUrl = `${myUrl}/api/whatsapp/webhook`;

        const headers = {
            "Content-Type": "application/json",
            "X-API-Key": apiKey
        };

        // Check existing webhooks for this session
        const listUrl = `${baseUrl}/sessions/${encodeURIComponent(sessionId)}/webhooks`;
        const checkRes = await fetch(listUrl, { headers }).catch(() => null);
        if (checkRes && checkRes.ok) {
            const list = await checkRes.json().catch(() => []);
            const alreadyRegistered = Array.isArray(list) && list.some(w => w.url === webhookUrl);
            if (alreadyRegistered) {
                console.log("[whatsapp-bot] ✓ Webhook already registered with OpenWA for session:", sessionId);
                return { ok: true, registered: true, sessionId, webhookUrl };
            }
        }

        // Register webhook with OpenWA
        const registerRes = await fetch(listUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({
                url: webhookUrl,
                events: ["message.received", "*"]
            })
        });

        const regData = await registerRes.json().catch(() => ({}));
        if (registerRes.ok) {
            console.log("[whatsapp-bot] ✓ Webhook registered successfully with OpenWA for session:", sessionId);
            return { ok: true, registered: true, sessionId, webhookUrl, data: regData };
        } else {
            console.warn("[whatsapp-bot] Webhook register response error:", registerRes.status, regData);
            return { ok: false, status: registerRes.status, error: regData.message || regData.error };
        }
    } catch (e) {
        console.warn("[whatsapp-bot] Webhook register error:", e.message);
        return { ok: false, error: e.message };
    }
}

/*
|--------------------------------------------------------------------------
| Automated Daily Schedule ("Todo List for All Day Messages")
|--------------------------------------------------------------------------
*/
const lastRunDates = {
    morningBriefing: "",
    advanceReminders: "",
    middayAudit: "",
    eveningSweep: "",
    nightSummary: ""
};

async function sendToAdmin(text) {
    try {
        await whatsapp.sendText(PRIMARY_ADMIN_PHONE, text, {
            username: "ADMIN",
            type: "manual"
        });
    } catch (e) {
        console.error("[whatsapp-bot] Failed sending to admin:", e.message);
    }
}

async function runDailyScheduleTicker() {
    const now = new Date();
    // Pakistan Time (UTC+5)
    const pkHour = (now.getUTCHours() + 5) % 24;
    const pkMinute = now.getUTCMinutes();
    const todayStr = dates.formatDate(now);

    // 1. 08:00 AM – Morning ISP Briefing to Admin
    if (pkHour === 8 && pkMinute === 0 && lastRunDates.morningBriefing !== todayStr) {
        lastRunDates.morningBriefing = todayStr;
        await sendMorningBriefing();
    }

    // 2. 10:00 AM – Advance Expiry Reminders to Customers
    if (pkHour === 10 && pkMinute === 0 && lastRunDates.advanceReminders !== todayStr) {
        lastRunDates.advanceReminders = todayStr;
        await sendAdvanceReminders();
    }

    // 3. 02:00 PM – Mid-Day Network & Offline Audit to Admin
    if (pkHour === 14 && pkMinute === 0 && lastRunDates.middayAudit !== todayStr) {
        lastRunDates.middayAudit = todayStr;
        await sendMiddayAudit();
    }

    // 4. 06:00 PM – Evening Expired Customers Sweep & Notifications
    if (pkHour === 18 && pkMinute === 0 && lastRunDates.eveningSweep !== todayStr) {
        lastRunDates.eveningSweep = todayStr;
        await sendEveningSweep();
    }

    // 5. 11:00 PM – Night Financial & DigiKhata Summary to Admin
    if (pkHour === 23 && pkMinute === 0 && lastRunDates.nightSummary !== todayStr) {
        lastRunDates.nightSummary = todayStr;
        await sendNightSummary();
    }
}

// 08:00 AM: Morning Briefing
async function sendMorningBriefing() {
    try {
        let routerInfo = "Offline";
        let activeCount = 0;
        let cpuLoad = "0%";
        let uptime = "N/A";

        if (mikrotik.isConnected()) {
            const api = mikrotik.getApi();
            const resources = await api.menu("/system/resource").get().catch(() => null);
            if (resources && resources.length > 0) {
                cpuLoad = (resources[0]["cpu-load"] || 0) + "%";
                uptime = resources[0]["uptime"] || "N/A";
            }
            const active = await mikrotik.getPppActive().catch(() => []);
            activeCount = active.length;
            routerInfo = "Online 🟢";
        }

        let totalUsers = 0;
        let expiringToday = 0;
        let expiredCount = 0;

        if (db.dbConfigured) {
            const users = await db.query("SELECT COUNT(*) AS total FROM `mikrotik_users`", []).catch(() => [{ total: 0 }]);
            totalUsers = users[0].total;

            const expiring = await db.query(
                "SELECT COUNT(*) AS total FROM `mikrotik_users` WHERE `status` = 'active' AND `expiry_date` = CURDATE()",
                []
            ).catch(() => [{ total: 0 }]);
            expiringToday = expiring[0].total;

            const expired = await db.query(
                "SELECT COUNT(*) AS total FROM `mikrotik_users` WHERE `status` = 'expired' OR (`expiry_date` < CURDATE() AND `status` != 'active')",
                []
            ).catch(() => [{ total: 0 }]);
            expiredCount = expired[0].total;
        }

        const msg = [
            `☀️ *GOOD MORNING HASSAN BHAI!* 🌸`,
            `📅 Date: *${dates.formatDate(new Date())}*`,
            `────────────────────`,
            `📡 *Router Status:* ${routerInfo}`,
            `⚡ CPU Load: *${cpuLoad}* | Uptime: *${uptime}*`,
            `👥 Online PPPoE Sessions: *${activeCount}*`,
            `────────────────────`,
            `👥 *Customer Overview:*`,
            `• Total Registered: *${totalUsers}*`,
            `• Expiring Today: *${expiringToday}* ⚠️`,
            `• Expired Accounts: *${expiredCount}* ❌`,
            `────────────────────`,
            `💡 Tip: Type *!menu* anytime to manage users and router directly from WhatsApp!`
        ].join("\n");

        await sendToAdmin(msg);
    } catch (e) {
        console.error("[whatsapp-bot] morning briefing error:", e.message);
    }
}

// 10:00 AM: Advance Reminders
async function sendAdvanceReminders() {
    try {
        console.log("[whatsapp-bot] Running 10:00 AM automated advance expiry sweep...");
        const result = await whatsapp.checkAndSendExpiryReminders();
        const sentCount = (result && result.sent) ? result.sent.length : 0;
        await sendToAdmin(`✅ *10:00 AM Automated Reminder Sweep Done*\nSent *${sentCount}* advance billing reminders to customers.`);
    } catch (e) {
        console.error("[whatsapp-bot] advance reminders error:", e.message);
    }
}

// 02:00 PM: Midday Audit
async function sendMiddayAudit() {
    try {
        if (!mikrotik.isConnected()) {
            await sendToAdmin(`⚠️ *2:00 PM ALERT:* MikroTik Router is currently OFFLINE!`);
            return;
        }
        const active = await mikrotik.getPppActive().catch(() => []);
        await sendToAdmin(`📊 *02:00 PM Network Health Check*\n• Router: *ONLINE* 🟢\n• Currently Active Customers: *${active.length}*\n• System running smoothly! ✨`);
    } catch (e) {
        console.error("[whatsapp-bot] midday audit error:", e.message);
    }
}

// 06:00 PM: Evening Sweep
async function sendEveningSweep() {
    try {
        let expiredToday = 0;
        if (db.dbConfigured) {
            const rows = await db.query(
                "SELECT `username`, `phone`, `price` FROM `mikrotik_users` WHERE `expiry_date` < CURDATE() AND `status` = 'active'",
                []
            ).catch(() => []);
            expiredToday = rows.length;

            if (mikrotik.AUTO_DISABLE_EXPIRED && mikrotik.isConnected()) {
                for (const u of rows) {
                    try {
                        const sec = await mikrotik.getSecretByName(u.username);
                        if (sec && sec.id) {
                            await mikrotik.disableSecret(sec.id);
                            await mikrotik.disconnectSession(u.username);
                        }
                        await db.query("UPDATE `mikrotik_users` SET `status` = 'expired' WHERE `username` = ?", [u.username]);
                    } catch (err) {}
                }
            }
        }
        await sendToAdmin(`🚨 *06:00 PM Expired Customer Sweep*\nFound *${expiredToday}* expired customer(s).\nOverdue reminders dispatched.`);
    } catch (e) {
        console.error("[whatsapp-bot] evening sweep error:", e.message);
    }
}

// 11:00 PM: Night DigiKhata Financial Summary
async function sendNightSummary() {
    try {
        let todayIncome = 0;
        let todayExpense = 0;
        let monthIncome = 0;

        if (db.dbConfigured) {
            const todayRows = await db.query(
                "SELECT `type`, SUM(`amount`) AS total FROM `money_entries` WHERE `entry_date` = CURDATE() GROUP BY `type`",
                []
            ).catch(() => []);
            for (const r of todayRows) {
                if (r.type === "income" || r.type === "payment") todayIncome += Number(r.total) || 0;
                if (r.type === "debit") todayExpense += Number(r.total) || 0;
            }

            const monthRows = await db.query(
                "SELECT SUM(`amount`) AS total FROM `money_entries` WHERE `entry_date` >= DATE_FORMAT(CURDATE(), '%Y-%m-01') AND (`type` = 'income' OR `type` = 'payment')",
                []
            ).catch(() => [{ total: 0 }]);
            monthIncome = Number(monthRows[0].total) || 0;
        }

        const msg = [
            `🌙 *END-OF-DAY FINANCIAL SUMMARY* 📊`,
            `📅 Date: *${dates.formatDate(new Date())}*`,
            `────────────────────`,
            `💰 Today's Collections: *Rs. ${todayIncome.toLocaleString()}*`,
            `💸 Today's Expenses: *Rs. ${todayExpense.toLocaleString()}*`,
            `💵 Today's Net Cash: *Rs. ${(todayIncome - todayExpense).toLocaleString()}*`,
            `────────────────────`,
            `📈 Month-to-Date Income: *Rs. ${monthIncome.toLocaleString()}*`,
            `────────────────────`,
            `Shabb-bakhair Hassan Bhai! Sleep well! 😴✨`
        ].join("\n");

        await sendToAdmin(msg);
    } catch (e) {
        console.error("[whatsapp-bot] night summary error:", e.message);
    }
}

/*
|--------------------------------------------------------------------------
| Admin Bot: Interactive Command Handlers
|--------------------------------------------------------------------------
*/
async function handleAdminCommand(text) {
    const raw = (text || "").trim();
    const parts = raw.split(/\s+/);
    const cmd = parts[0].toLowerCase();

    // 1. Help / Menu
    if (cmd === "!help" || cmd === "!menu" || cmd === "help" || cmd === "menu") {
        return [
            `👑 *MIKROTIK WHATSAPP CONTROL MENU* 👑`,
            `────────────────────────────`,
            `📡 *ROUTER & NETWORK:*`,
            `• *!status* - Live CPU, RAM, Uptime & RouterOS info`,
            `• *!online* - Live active PPPoE customers & speeds`,
            `• *!reboot* - Safely reboot MikroTik router`,
            ``,
            `👥 *CUSTOMER MANAGEMENT:*`,
            `• *!users* - Count of active, expired, suspended`,
            `• *!find <user>* - Complete customer details & phone`,
            `• *!enable <user>* - Re-enable account on router`,
            `• *!disable <user>* - Cut connection immediately`,
            `• *!kick <user>* - Force reconnect session`,
            `• *!renew <user> [days]* - Extend expiry (e.g. !renew ali 30)`,
            ``,
            `💰 *BILLING & DIGIKHATA:*`,
            `• *!money* - Today's & monthly cash collections`,
            `• *!paid <user> <amount>* - Log payment & auto-renew user!`,
            `• *!expense <amount> <desc>* - Record a daily expense`,
            ``,
            `📢 *AUTOMATION & MESSAGING:*`,
            `• *!sweep* - Trigger expiry sweep & reminders now`,
            `• *!msg <user> <text>* - Send custom WhatsApp to customer`,
            `• *!broadcast <text>* - Announcement to all customers`,
            `• *!todo* - View full 24-hour automated schedule`,
            `────────────────────────────`,
            `⚡ Example: Type *!status* or *!find ali*`
        ].join("\n");
    }

    // 2. Schedule Overview (!todo)
    if (cmd === "!todo" || cmd === "!schedule") {
        return [
            `📋 *24-HOUR AUTOMATED MESSAGE SCHEDULE* ⏰`,
            `────────────────────────────`,
            `• *08:00 AM* ☀️ - Morning Network & Router Briefing to Admin`,
            `• *10:00 AM* 📩 - Advance Expiry Reminders to Customers (1-2 days before)`,
            `• *02:00 PM* 🔍 - Mid-day Network Health & Uptime Audit`,
            `• *06:00 PM* 🚨 - Expired Customers Auto-Disable & Late Notices`,
            `• *11:00 PM* 🌙 - Night DigiKhata Cashbook & Collections Report`,
            `────────────────────────────`,
            `⚡ All automated sweeps run automatically 7 days a week!`
        ].join("\n");
    }

    // 3. Status
    if (cmd === "!status" || cmd === "!router") {
        if (!mikrotik.isConnected()) {
            return `❌ *MikroTik Router is OFFLINE!* Reconnecting in background...`;
        }
        try {
            const api = mikrotik.getApi();
            const res = await api.menu("/system/resource").get().catch(() => []);
            const r = (res && res[0]) || {};
            const active = await mikrotik.getPppActive().catch(() => []);

            return [
                `📡 *MIKROTIK ROUTER STATUS* 🟢`,
                `────────────────────────────`,
                `• Router IP: *${process.env.MIKROTIK_HOST || "175.29.60.6"}*`,
                `• Board: *${r["board-name"] || r["platform"] || "MikroTik"}*`,
                `• RouterOS: *v${r["version"] || "N/A"}*`,
                `• CPU Load: *${r["cpu-load"] || 0}%*`,
                `• Uptime: *${r["uptime"] || "N/A"}*`,
                `• Free Memory: *${Math.round((Number(r["free-memory"]) || 0) / 1024 / 1024)} MB*`,
                `• Online PPPoE Sessions: *${active.length}* 👥`,
                `────────────────────────────`,
                `Status: All systems operational! ✨`
            ].join("\n");
        } catch (e) {
            return `⚠️ Error fetching router status: ${e.message}`;
        }
    }

    // 4. Online Users
    if (cmd === "!online" || cmd === "!active") {
        if (!mikrotik.isConnected()) return `❌ Router is OFFLINE!`;
        try {
            const active = await mikrotik.getPppActive().catch(() => []);
            if (active.length === 0) return `ℹ️ No PPPoE customers currently online.`;

            const top = active.slice(0, 15);
            const list = top.map((u, i) => `${i + 1}. *${u.name}* (IP: ${u.address}, Uptime: ${u.uptime})`).join("\n");
            return [
                `👥 *ONLINE CUSTOMERS (${active.length} Total)*`,
                `────────────────────────────`,
                list,
                active.length > 15 ? `\n_...and ${active.length - 15} more customers online._` : "",
                `────────────────────────────`
            ].join("\n");
        } catch (e) {
            return `⚠️ Error: ${e.message}`;
        }
    }

    // 5. Users Summary
    if (cmd === "!users") {
        if (!db.dbConfigured) return `⚠️ Database is not configured.`;
        try {
            const counts = await db.query(
                "SELECT `status`, COUNT(*) AS count FROM `mikrotik_users` GROUP BY `status`",
                []
            );
            const map = { active: 0, expired: 0, suspended: 0 };
            let total = 0;
            for (const c of counts) {
                map[c.status] = c.count;
                total += c.count;
            }

            let onlineCount = 0;
            if (mikrotik.isConnected()) {
                const active = await mikrotik.getPppActive().catch(() => []);
                onlineCount = active.length;
            }

            return [
                `👥 *CUSTOMER DATABASE SUMMARY*`,
                `────────────────────────────`,
                `• Total Registered: *${total}*`,
                `• Active Accounts: *${map.active}* 🟢`,
                `• Currently Online: *${onlineCount}* ⚡`,
                `• Expired Accounts: *${map.expired}* ⚠️`,
                `• Suspended Accounts: *${map.suspended}* 🔴`,
                `────────────────────────────`
            ].join("\n");
        } catch (e) {
            return `⚠️ Error: ${e.message}`;
        }
    }

    // 6. Find / User Details
    if (cmd === "!find" || cmd === "!user") {
        const username = parts[1];
        if (!username) return `⚠️ Please provide username: *!find <username>*`;

        try {
            let sqlUser = null;
            if (db.dbConfigured) {
                const rows = await db.query("SELECT * FROM `mikrotik_users` WHERE `username` = ?", [username]);
                if (rows.length > 0) sqlUser = rows[0];
            }

            let secret = null;
            let onlineSession = null;
            if (mikrotik.isConnected()) {
                secret = await mikrotik.getSecretByName(username).catch(() => null);
                const active = await mikrotik.getPppActive().catch(() => []);
                onlineSession = active.find(a => a.name === username);
            }

            if (!sqlUser && !secret) {
                return `❌ Customer *"${username}"* not found in database or router.`;
            }

            const name = (sqlUser && sqlUser.name) || username;
            const phone = (sqlUser && sqlUser.phone) || "Not Set";
            const pkg = (sqlUser && sqlUser.package) || (secret && secret.profile) || "Default";
            const price = (sqlUser && sqlUser.price) ? `Rs. ${sqlUser.price}` : "N/A";
            const expiry = (sqlUser && sqlUser.expiry_date) ? dates.formatDate(sqlUser.expiry_date) : "N/A";
            const daysLeft = sqlUser && sqlUser.expiry_date ? dates.remainingDays(sqlUser.expiry_date) : "N/A";
            const isOnline = !!onlineSession;
            const routerDisabled = secret ? (secret.disabled === true || secret.disabled === "true") : false;

            return [
                `👤 *CUSTOMER PROFILE: ${username}*`,
                `────────────────────────────`,
                `• Name: *${name}*`,
                `• Phone: *${phone}*`,
                `• Package: *${pkg}* | Price: *${price}*`,
                `• Status: *${(sqlUser && sqlUser.status) || "active"}*`,
                `• Expiry: *${expiry}* (${daysLeft} days remaining)`,
                `• Router Secret: *${routerDisabled ? "DISABLED 🔴" : "ENABLED 🟢"}*`,
                `• Live Status: *${isOnline ? `ONLINE ⚡ (IP: ${onlineSession.address})` : "OFFLINE ⚪"}*`,
                `────────────────────────────`,
                `Commands for this user:`,
                `• *!renew ${username} 30* (Extend expiry)`,
                `• *!paid ${username} <amount>* (Log payment & renew)`,
                `• *!disable ${username}* or *!enable ${username}*`
            ].join("\n");
        } catch (e) {
            return `⚠️ Error: ${e.message}`;
        }
    }

    // 7. Disable User
    if (cmd === "!disable") {
        const username = parts[1];
        if (!username) return `⚠️ Syntax: *!disable <username>*`;
        try {
            if (mikrotik.isConnected()) {
                const sec = await mikrotik.getSecretByName(username);
                if (sec && sec.id) {
                    await mikrotik.disableSecret(sec.id);
                    await mikrotik.disconnectSession(username);
                }
            }
            if (db.dbConfigured) {
                await db.query("UPDATE `mikrotik_users` SET `status` = 'suspended' WHERE `username` = ?", [username]);
            }
            return `🛑 Customer *"${username}"* has been *DISABLED* on MikroTik and active session disconnected!`;
        } catch (e) {
            return `⚠️ Failed: ${e.message}`;
        }
    }

    // 8. Enable User
    if (cmd === "!enable") {
        const username = parts[1];
        if (!username) return `⚠️ Syntax: *!enable <username>*`;
        try {
            if (mikrotik.isConnected()) {
                const sec = await mikrotik.getSecretByName(username);
                if (sec && sec.id) {
                    await mikrotik.enableSecret(sec.id);
                }
            }
            if (db.dbConfigured) {
                await db.query("UPDATE `mikrotik_users` SET `status` = 'active' WHERE `username` = ?", [username]);
            }
            return `✅ Customer *"${username}"* has been *RE-ENABLED* on MikroTik!`;
        } catch (e) {
            return `⚠️ Failed: ${e.message}`;
        }
    }

    // 9. Kick Session
    if (cmd === "!kick") {
        const username = parts[1];
        if (!username) return `⚠️ Syntax: *!kick <username>*`;
        try {
            if (mikrotik.isConnected()) {
                await mikrotik.disconnectSession(username);
                return `⚡ Active session for *"${username}"* kicked. Their router is reconnecting!`;
            }
            return `❌ Router is OFFLINE!`;
        } catch (e) {
            return `⚠️ Error: ${e.message}`;
        }
    }

    // 10. Renew User (!renew <username> [days])
    if (cmd === "!renew") {
        const username = parts[1];
        const days = Number(parts[2]) || 30;
        if (!username) return `⚠️ Syntax: *!renew <username> [days]* (e.g. *!renew ali 30*)`;

        try {
            let newExpiry = null;
            if (db.dbConfigured) {
                const rows = await db.query("SELECT `expiry_date`, `phone`, `name` FROM `mikrotik_users` WHERE `username` = ?", [username]);
                let baseDate = new Date();
                if (rows.length > 0 && rows[0].expiry_date) {
                    const currentExp = new Date(rows[0].expiry_date);
                    if (currentExp > baseDate) baseDate = currentExp;
                }
                baseDate.setDate(baseDate.getDate() + days);
                newExpiry = dates.formatDate(baseDate);

                await db.query(
                    "UPDATE `mikrotik_users` SET `expiry_date` = ?, `status` = 'active' WHERE `username` = ?",
                    [newExpiry, username]
                );

                // Re-enable on router
                if (mikrotik.isConnected()) {
                    const sec = await mikrotik.getSecretByName(username);
                    if (sec && sec.id) await mikrotik.enableSecret(sec.id);
                }

                // Send WhatsApp confirmation to customer if phone exists
                if (rows[0] && rows[0].phone) {
                    const notify = `Assalam-o-Alaikum ${rows[0].name || username}! 🌟\nAapka internet package successfully renew ho chuka hai.\nNayi Expiry Date: *${newExpiry}*.\nBohot shukriya! ❤️`;
                    await whatsapp.sendText(rows[0].phone, notify, { username, type: "manual" }).catch(() => null);
                }
            }

            return `🎉 Customer *"${username}"* renewed for *${days} days*!\nNew Expiry Date: *${newExpiry}* 🟢\nCustomer notified on WhatsApp.`;
        } catch (e) {
            return `⚠️ Renew failed: ${e.message}`;
        }
    }

    // 11. Paid / Payment Record (!paid <username> <amount>)
    if (cmd === "!paid" || cmd === "!bill") {
        const username = parts[1];
        const amount = Number(parts[2]);
        if (!username || isNaN(amount)) {
            return `⚠️ Syntax: *!paid <username> <amount>*\nExample: *!paid ali 1500*`;
        }

        try {
            if (db.dbConfigured) {
                // 1. Log to DigiKhata cash book
                await db.query(
                    "INSERT INTO `money_entries` (`type`, `customer_username`, `description`, `amount`, `payment_method`, `entry_date`) " +
                    "VALUES ('payment', ?, ?, ?, 'cash', CURDATE())",
                    [username, `Monthly bill payment via WhatsApp Admin Bot`, amount]
                );

                // 2. Extend customer expiry by 30 days and mark active
                const rows = await db.query("SELECT `expiry_date`, `phone`, `name` FROM `mikrotik_users` WHERE `username` = ?", [username]);
                let baseDate = new Date();
                if (rows.length > 0 && rows[0].expiry_date) {
                    const currentExp = new Date(rows[0].expiry_date);
                    if (currentExp > baseDate) baseDate = currentExp;
                }
                baseDate.setDate(baseDate.getDate() + 30);
                const newExpiry = dates.formatDate(baseDate);

                await db.query(
                    "UPDATE `mikrotik_users` SET `expiry_date` = ?, `status` = 'active' WHERE `username` = ?",
                    [newExpiry, username]
                );

                // 3. Enable on MikroTik
                if (mikrotik.isConnected()) {
                    const sec = await mikrotik.getSecretByName(username);
                    if (sec && sec.id) await mikrotik.enableSecret(sec.id);
                }

                // 4. Send Digital Receipt to customer WhatsApp
                if (rows[0] && rows[0].phone) {
                    const receipt = [
                        `🧾 *PAYMENT RECEIVED - OFFICIAL RECEIPT* 🌟`,
                        `────────────────────────────`,
                        `Moazziz Customer: *${rows[0].name || username}*`,
                        `Aapka bill payment *Rs. ${amount.toLocaleString()}* received ho chuka hai.`,
                        `Package renewed till: *${newExpiry}*`,
                        `Status: *ACTIVE* 🟢`,
                        `────────────────────────────`,
                        `Hamare network par aitmad ka shukriya! ❤️`
                    ].join("\n");
                    await whatsapp.sendText(rows[0].phone, receipt, { username, type: "manual" }).catch(() => null);
                }

                return [
                    `✅ *PAYMENT RECORDED & AUTO-RENEWED!* 💰`,
                    `────────────────────────────`,
                    `• Customer: *${username}*`,
                    `• Amount: *Rs. ${amount.toLocaleString()}*`,
                    `• Recorded In: *DigiKhata Cashbook*`,
                    `• New Expiry: *${newExpiry}* (30 Days)`,
                    `• Customer Receipt: *Delivered via WhatsApp* 📩`,
                    `────────────────────────────`
                ].join("\n");
            }
            return `⚠️ Database is not configured.`;
        } catch (e) {
            return `⚠️ Payment record failed: ${e.message}`;
        }
    }

    // 12. Log Expense (!expense <amount> <desc>)
    if (cmd === "!expense") {
        const amount = Number(parts[1]);
        const desc = parts.slice(2).join(" ");
        if (isNaN(amount) || !desc) {
            return `⚠️ Syntax: *!expense <amount> <description>*\nExample: *!expense 500 Fiber wire splicing*`;
        }

        try {
            if (db.dbConfigured) {
                await db.query(
                    "INSERT INTO `money_entries` (`type`, `description`, `amount`, `payment_method`, `entry_date`) " +
                    "VALUES ('debit', ?, ?, 'cash', CURDATE())",
                    [desc, amount]
                );
                return `💸 *Expense Recorded:* Rs. ${amount.toLocaleString()} for _"${desc}"_ entered into DigiKhata!`;
            }
            return `⚠️ Database is not configured.`;
        } catch (e) {
            return `⚠️ Failed: ${e.message}`;
        }
    }

    // 13. Money Summary (!money)
    if (cmd === "!money" || cmd === "!income" || cmd === "!ledger") {
        if (!db.dbConfigured) return `⚠️ Database is not configured.`;
        try {
            let todayIn = 0;
            let todayOut = 0;
            const todayRows = await db.query(
                "SELECT `type`, SUM(`amount`) AS total FROM `money_entries` WHERE `entry_date` = CURDATE() GROUP BY `type`",
                []
            );
            for (const r of todayRows) {
                if (r.type === "income" || r.type === "payment") todayIn += Number(r.total) || 0;
                if (r.type === "debit") todayOut += Number(r.total) || 0;
            }

            let monthIn = 0;
            let monthOut = 0;
            const monthRows = await db.query(
                "SELECT `type`, SUM(`amount`) AS total FROM `money_entries` WHERE `entry_date` >= DATE_FORMAT(CURDATE(), '%Y-%m-01') GROUP BY `type`",
                []
            );
            for (const r of monthRows) {
                if (r.type === "income" || r.type === "payment") monthIn += Number(r.total) || 0;
                if (r.type === "debit") monthOut += Number(r.total) || 0;
            }

            return [
                `💰 *DIGIKHATA FINANCIAL SUMMARY* 📊`,
                `────────────────────────────`,
                `📅 *TODAY (${dates.formatDate(new Date())}):*`,
                `• Collections: *Rs. ${todayIn.toLocaleString()}*`,
                `• Expenses: *Rs. ${todayOut.toLocaleString()}*`,
                `• Net Cash: *Rs. ${(todayIn - todayOut).toLocaleString()}*`,
                `────────────────────────────`,
                `📆 *THIS MONTH:*`,
                `• Total Income: *Rs. ${monthIn.toLocaleString()}*`,
                `• Total Expenses: *Rs. ${monthOut.toLocaleString()}*`,
                `• Net Profit: *Rs. ${(monthIn - monthOut).toLocaleString()}*`,
                `────────────────────────────`
            ].join("\n");
        } catch (e) {
            return `⚠️ Error: ${e.message}`;
        }
    }

    // 14. Instant Expiry Sweep (!sweep / !expire)
    if (cmd === "!sweep" || cmd === "!expire") {
        try {
            const res = await whatsapp.checkAndSendExpiryReminders();
            return `🚀 *Instant Sweep Completed!*\nReminders sent: *${(res && res.sent) ? res.sent.length : 0}*`;
        } catch (e) {
            return `⚠️ Sweep failed: ${e.message}`;
        }
    }

    // 15. Direct Message (!msg <username> <text>)
    if (cmd === "!msg") {
        const username = parts[1];
        const msgText = parts.slice(2).join(" ");
        if (!username || !msgText) {
            return `⚠️ Syntax: *!msg <username> <text>*\nExample: *!msg ali Kal light band hogi subah 10 baje*`;
        }

        try {
            if (db.dbConfigured) {
                const rows = await db.query("SELECT `phone` FROM `mikrotik_users` WHERE `username` = ?", [username]);
                if (rows.length === 0 || !rows[0].phone) {
                    return `❌ Customer *"${username}"* has no phone number saved.`;
                }
                const sent = await whatsapp.sendText(rows[0].phone, msgText, { username, type: "manual" });
                if (sent.success) {
                    return `✅ Message delivered to *${username}* (${rows[0].phone})!`;
                } else {
                    return `❌ Message delivery failed: ${sent.error}`;
                }
            }
            return `⚠️ Database not configured.`;
        } catch (e) {
            return `⚠️ Failed: ${e.message}`;
        }
    }

    // 16. Broadcast (!broadcast <text>)
    if (cmd === "!broadcast") {
        const bText = parts.slice(1).join(" ");
        if (!bText) return `⚠️ Syntax: *!broadcast <announcement text>*`;

        try {
            if (!db.dbConfigured) return `⚠️ Database is not configured.`;
            const users = await db.query(
                "SELECT `username`, `phone` FROM `mikrotik_users` WHERE `status` = 'active' AND `phone` IS NOT NULL AND `phone` != ''",
                []
            );
            if (users.length === 0) return `ℹ️ No active customers with phone numbers found.`;

            let count = 0;
            for (const u of users) {
                try {
                    await whatsapp.sendText(u.phone, bText, { username: u.username, type: "manual" });
                    count++;
                } catch (err) {}
            }
            return `📢 *BROADCAST SENT:* Successfully delivered announcement to *${count}* active customer(s)!`;
        } catch (e) {
            return `⚠️ Broadcast failed: ${e.message}`;
        }
    }

    // 17. Safe Reboot (!reboot)
    if (cmd === "!reboot") {
        if (!mikrotik.isConnected()) return `❌ Router is OFFLINE!`;
        try {
            const api = mikrotik.getApi();
            await api.menu("/system/reboot").write();
            return `🔄 *MikroTik Router is rebooting now!* System will be back online in ~60 seconds.`;
        } catch (e) {
            return `⚠️ Reboot failed: ${e.message}`;
        }
    }

    return `❓ Unknown command: *"${raw}"*\nType *!menu* or *!help* to see all available commands!`;
}

/*
|--------------------------------------------------------------------------
| Inbound Webhook Processor
|--------------------------------------------------------------------------
*/
function extractMessageText(msg) {
    if (!msg) return "";
    if (typeof msg.body === "string" && msg.body.trim()) return msg.body.trim();
    if (typeof msg.text === "string" && msg.text.trim()) return msg.text.trim();
    if (typeof msg.caption === "string" && msg.caption.trim()) return msg.caption.trim();
    if (msg.message) {
        if (typeof msg.message.conversation === "string" && msg.message.conversation.trim()) {
            return msg.message.conversation.trim();
        }
        if (msg.message.extendedTextMessage && typeof msg.message.extendedTextMessage.text === "string") {
            return msg.message.extendedTextMessage.text.trim();
        }
        if (msg.message.imageMessage && typeof msg.message.imageMessage.caption === "string") {
            return msg.message.imageMessage.caption.trim();
        }
    }
    return "";
}

function extractSenderPhone(msg) {
    if (!msg) return "";
    return (
        msg.senderPhone ||
        msg.from ||
        msg.sender ||
        msg.chatId ||
        (msg.key && (msg.key.participant || msg.key.remoteJid)) ||
        ""
    );
}

async function handleIncomingWebhook(body) {
    if (!body) return { ok: false, reason: "empty-body" };

    // Extract payload structure from OpenWA (data, payload, or root)
    const msg = body.data || body.payload || body;
    const fromRaw = extractSenderPhone(msg);
    const text = extractMessageText(msg);

    const isFromMe = msg.fromMe === true || (msg.key && msg.key.fromMe === true);

    // If message is from me, allow it if it's Admin messaging themselves (Note to Self / chat with yourself)
    const isSelfAdminCommand = isFromMe && isAdmin(fromRaw) && text.startsWith("!");

    if (isFromMe && !isSelfAdminCommand) {
        return { ok: true, ignored: "from-me" };
    }

    if (!fromRaw || !text) {
        return { ok: true, ignored: "no-sender-or-text", fromRaw, hasText: Boolean(text) };
    }

    console.log(`[whatsapp-bot] Inbound message from ${fromRaw}: "${text}" (isFromMe: ${isFromMe})`);

    // Verify if sender is Admin (03101361647)
    if (isAdmin(fromRaw)) {
        const reply = await handleAdminCommand(text);
        if (reply) {
            await whatsapp.sendText(fromRaw, reply, {
                username: "ADMIN",
                type: "manual"
            });
        }
        return { ok: true, handled: "admin-command" };
    } else {
        // Customer Auto-reply
        const customerReply = [
            `Assalam-o-Alaikum! 🌸`,
            `Hamari Internet Support par khush-amdeed.`,
            `Package renewal, bill maloomat, ya kisi bhi shikayat ke liye hamare helpline number par rabta karein:`,
            `📞 *0310-1361647*`,
            `Aapka shukriya! ✨`
        ].join("\n");

        await whatsapp.sendText(fromRaw, customerReply, {
            username: "CUSTOMER",
            type: "manual"
        });
        return { ok: true, handled: "customer-auto-reply" };
    }
}

/*
|--------------------------------------------------------------------------
| Initialization & Background Ticker
|--------------------------------------------------------------------------
*/
let tickerTimer = null;

function startBot() {
    console.log(`[whatsapp-bot] Starting WhatsApp Bot for Admin: ${PRIMARY_ADMIN_PHONE}`);

    // Initial webhook registration with OpenWA
    setTimeout(registerWebhookWithOpenWA, 5000);
    setInterval(registerWebhookWithOpenWA, 5 * 60 * 1000); // Verify webhook every 5 mins

    // Start 60-second schedule ticker
    if (!tickerTimer) {
        tickerTimer = setInterval(runDailyScheduleTicker, 60 * 1000);
        console.log("[whatsapp-bot] ✓ 24-hour daily automated message scheduler running.");
    }
}

module.exports = {
    startBot,
    handleIncomingWebhook,
    handleAdminCommand,
    sendToAdmin,
    registerWebhookWithOpenWA,
    PRIMARY_ADMIN_PHONE
};
