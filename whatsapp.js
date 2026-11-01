require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });
const db = require("./db");

/*
|--------------------------------------------------------------------------
| OpenWA WhatsApp Integration
|--------------------------------------------------------------------------
| Official documentation: https://github.com/rmyndharis/OpenWA
| OpenWA exposes a REST API with endpoints:
|   POST /api/sessions/{sessionId}/messages/send-text
| Header:
|   X-API-Key: {apiKey}
| Body:
|   { "chatId": "<phone>@c.us", "text": "message" }
|--------------------------------------------------------------------------
*/

const DEFAULT_BEFORE_VARIATIONS = [
`Assalam-o-Alaikum Pyare {name} Sahab! 🌸
Umeed hai aap khairiyat se honge.
Aapka internet package ({package}) {expiry_date} ko renew hona hai (baqi {days_left} din).
Baraye meharbani waqt par renewal Rs. {price} karwa lein taake aapka internet bina kisi waqfe ke chalta rahe.
Username: {username}
Aapka bohot shukriya! ❤️`,

`Moazziz {name} Sahab, Salam-o-Alaikum! 🌺
Aapki behtareen service hamari pehli koshish hai.
Ek meetha sa reminder ke aapke internet account ({username}) ki package validity {expiry_date} ko khatam ho rahi hai.
Package: {package} | Renewal Charges: Rs. {price}
Barahe meharbani advance payment jama karwa dein taake tez-tareen speed barqarar rahe. JazakAllah! ✨`,

`Assalam-o-Alaikum {name} Bhai! 🌟
Kaise hain aap? Aapke internet connection ki due date {expiry_date} bohot qareeb hai ({days_left} din baqi).
Aapka connection bina rukawat chalta rahe, is liye baraye meharbani bill Rs. {price} waqt par jama karwa lein.
Aapka aetimad hi hamari pehchan hai. Bohat shukriya! 🙏`
];

const DEFAULT_EXPIRED_VARIATIONS = [
`Assalam-o-Alaikum Pyare {name} Sahab! 🌸
Umeed hai aap aur aapke ahl-e-khana khairiyat se honge.
Aap hamare intihai muhtaram aur qeemti customer hain.
Ek choti si guzarish thi ke aapke internet package ({package}) ki renewal date ({expiry_date}) guzar chuki hai aur payment thori late ho gayi hai.
Aapki asani ke liye hum ne aapka internet band nahi kiya taake aapka kaam na ruke.
Baraye meharbani waqt nikal kar monthly bill Rs. {price} ada farma dein taake service tasalsul se chalti rahe.
Account ID: {username}
Agar aap payment jama karwa chuke hain to shukriya aur is message ko nazar-andaz farmaiye.
JazakAllah Khair! ❤️`,

`Salam {name} Bhai! Kaise hain aap? 🌺
Aapki dosti aur hamare network se wabastagi hamare liye bohot qeemti hai.
Aapko pyar bhara reminder dena tha ke aapka internet account ({username}) ka package {expiry_date} ko complete ho chuka hai aur bill thora late chal raha hai.
Aapki izzat hamare sar ankhon par hai, is liye net bilkul on rakha hua hai.
Jab bhi aapko asani ho, please bill amount Rs. {price} send farma dein taake hamara rabta hamesha mazboot rahe.
Package: {package}
Bohot shukriya aapke taawun ka! ✨`,

`Assalam-o-Alaikum Janab {name} Sahab! 🌟
Dua hai ke aapka din khair-o-aafiyat se guzre.
Shayad masroofiyat ki waja se zehan se nikal gaya ho, aapke internet ({username}) ki due date ({expiry_date}) guzar chuki hai aur payment thori late ho gayi hai.
Hum ne connection disconnect nahi kiya kyun ke aap hamare qabil-e-ehtiram sarif hain.
Baraye karam jaise hi waqt mile, package charges Rs. {price} clear farma dein taake bina rukawat tez net chalta rahe.
Kisi bhi masle ya help ke liye hum har waqt hazir hain. Shukriya! 🙏`,

`Moazziz Customer {name}, Assalam-o-Alaikum! 💐
Aapka aetimad hamara sab se bara sarmaya hai.
Aapke internet package ({package}) ki tareekh {expiry_date} ko mukammal ho gayi thi.
Aapki sahulat ke paish-e-nazar internet service continuously chal rahi hai taake aap preshan na hon.
Baraye meharbani apne account ({username}) ka renewal bill Rs. {price} jald ada farma dein taake connection isi terhan active rahe.
Aapke qeemti waqt aur taawun ke hum dil se mashkoor hain. Allah aapko khush rakhe! 🌸`,

`Assalam-o-Alaikum {name}! 😊
Umeed hai aap theek-thaak honge.
Aapka internet bill Rs. {price} thora late ho chuka hai (Due date: {expiry_date}).
Aap hamare bohot achhe sarif hain, is liye hum ne net band nahi kiya taake aapka net chalta rahe.
Please free ho kar bill payment transfer kar dein taake service bar-waqt renew ho sake.
Username: {username} | Package: {package}
Bohat shukriya aapke pyar aur taawun ka! ✨`
];

const DEFAULT_BEFORE_TEMPLATE = DEFAULT_BEFORE_VARIATIONS.join("\n\n---\n\n");
const DEFAULT_EXPIRED_TEMPLATE = DEFAULT_EXPIRED_VARIATIONS.join("\n\n---\n\n");

function parseVariations(text, defaultVariations) {
    if (!text || typeof text !== "string") {
        return defaultVariations ? [...defaultVariations] : [];
    }
    const parts = text.split(/\r?\n\s*---\s*\r?\n/).map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) {
        return defaultVariations ? [...defaultVariations] : [text.trim()];
    }
    return parts;
}

function chooseVariation(variations, username, daysExpiredOrOffset = 0) {
    if (!Array.isArray(variations) || variations.length === 0) return "";
    if (variations.length === 1) return variations[0];

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24));

    let hash = 0;
    const key = String(username || "user") + "_" + String(daysExpiredOrOffset || 0);
    for (let i = 0; i < key.length; i++) {
        hash = (hash << 5) - hash + key.charCodeAt(i);
        hash |= 0;
    }
    const idx = Math.abs(hash + dayOfYear) % variations.length;
    return variations[idx];
}

async function getSettings() {
    const defaults = {
        openwa_base_url: process.env.OPENWA_BASE_URL || "http://localhost:2785/api",
        openwa_api_key: process.env.OPENWA_API_KEY || "",
        openwa_session_id: process.env.OPENWA_SESSION_ID || "default",
        openwa_country_code: process.env.OPENWA_DEFAULT_COUNTRY_CODE || "92",
        whatsapp_enabled: process.env.WHATSAPP_ENABLED !== "false",
        whatsapp_days_before: Number(process.env.WHATSAPP_DAYS_BEFORE) || 2,
        template_before_expiry: process.env.WHATSAPP_BEFORE_TEMPLATE || DEFAULT_BEFORE_TEMPLATE,
        template_expired: process.env.WHATSAPP_EXPIRED_TEMPLATE || DEFAULT_EXPIRED_TEMPLATE,
    };

    if (!db.dbConfigured) {
        return defaults;
    }

    try {
        const rows = await db.query("SELECT `skey`, `svalue` FROM `whatsapp_settings`", []);
        const map = {};
        for (const r of rows) {
            map[r.skey] = r.svalue;
        }

        return {
            openwa_base_url: map.openwa_base_url || defaults.openwa_base_url,
            openwa_api_key: map.openwa_api_key !== undefined ? map.openwa_api_key : defaults.openwa_api_key,
            openwa_session_id: map.openwa_session_id || defaults.openwa_session_id,
            openwa_country_code: map.openwa_country_code || defaults.openwa_country_code,
            whatsapp_enabled: map.whatsapp_enabled !== undefined ? (map.whatsapp_enabled === "true" || map.whatsapp_enabled === "1") : defaults.whatsapp_enabled,
            whatsapp_days_before: map.whatsapp_days_before ? Number(map.whatsapp_days_before) : defaults.whatsapp_days_before,
            template_before_expiry: map.template_before_expiry || defaults.template_before_expiry,
            template_expired: map.template_expired || defaults.template_expired,
        };
    } catch (e) {
        console.error("[whatsapp] getSettings error:", e.message);
        return defaults;
    }
}

async function saveSettings(settings) {
    if (!db.dbConfigured) {
        throw new Error("Database not configured");
    }

    const keys = [
        "openwa_base_url",
        "openwa_api_key",
        "openwa_session_id",
        "openwa_country_code",
        "whatsapp_enabled",
        "whatsapp_days_before",
        "template_before_expiry",
        "template_expired",
    ];

    for (const key of keys) {
        if (settings[key] !== undefined) {
            await db.query(
                "INSERT INTO `whatsapp_settings` (`skey`, `svalue`) VALUES (?, ?) " +
                "ON DUPLICATE KEY UPDATE `svalue` = VALUES(`svalue`)",
                [key, String(settings[key])]
            );
        }
    }

    return await getSettings();
}

/**
 * Normalise phone numbers into WhatsApp JID (e.g. 923001234567@c.us)
 */
function formatPhone(rawPhone, defaultCountryCode = "92") {
    if (!rawPhone || typeof rawPhone !== "string") {
        return null;
    }

    let cleaned = rawPhone.replace(/[\s\-\(\)\.]+/g, "").trim();

    if (cleaned.endsWith("@c.us")) {
        cleaned = cleaned.replace("@c.us", "");
    }

    if (cleaned.startsWith("+")) {
        cleaned = cleaned.substring(1);
    } else if (cleaned.startsWith("00")) {
        cleaned = cleaned.substring(2);
    } else if (cleaned.startsWith("0")) {
        // e.g. 03001234567 -> 923001234567
        cleaned = defaultCountryCode.replace("+", "") + cleaned.substring(1);
    } else if (cleaned.length === 10 && !cleaned.startsWith(defaultCountryCode)) {
        // 10 digits without leading 0 -> prepend country code
        cleaned = defaultCountryCode.replace("+", "") + cleaned;
    }

    // Only numbers
    cleaned = cleaned.replace(/\D/g, "");

    if (cleaned.length < 8) {
        return null;
    }

    return {
        number: cleaned,
        chatId: cleaned + "@c.us",
    };
}

/**
 * Render message template with customer variables
 */
function renderTemplate(template, user) {
    if (!template) return "";

    let text = template;
    if (typeof text === "string" && text.includes("---")) {
        const vars = parseVariations(text);
        text = chooseVariation(vars, user ? (user.username || user.name) : "");
    }

    const expiryStr = user && user.expiry_date
        ? (typeof user.expiry_date === "string"
            ? user.expiry_date.split("T")[0]
            : new Date(user.expiry_date).toISOString().split("T")[0])
        : "N/A";

    const daysLeft = user && user.days_left !== undefined ? String(user.days_left) : "";

    return text
        .replace(/{name}/g, (user && (user.name || user.username)) || "Customer")
        .replace(/{username}/g, (user && user.username) || "")
        .replace(/{password}/g, (user && user.password) || "")
        .replace(/{package}/g, (user && (user.package || user.profile)) || "Internet")
        .replace(/{price}/g, user && user.price !== null && user.price !== undefined ? String(user.price) : "0")
        .replace(/{expiry_date}/g, expiryStr)
        .replace(/{days_left}/g, daysLeft);
}

let cachedSessionUuid = null;

/**
 * Resolve session ID: OpenWA requires a UUID for /sessions/:id endpoints.
 * If user configured a name (e.g. 'default'), list sessions or create it and return its UUID.
 */
async function resolveSessionId(settings) {
    const raw = (settings.openwa_session_id || "default").trim();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(raw)) {
        return raw;
    }
    if (cachedSessionUuid) {
        return cachedSessionUuid;
    }

    const baseUrl = (settings.openwa_base_url || "http://localhost:2785/api").replace(/\/+$/, "");
    const apiKey = settings.openwa_api_key || "";
    const headers = { "Content-Type": "application/json" };
    if (apiKey) {
        headers["X-API-Key"] = apiKey;
    }

    const listUrl = baseUrl.includes("/sessions")
        ? baseUrl.replace(/\/sessions.*$/, "/sessions")
        : `${baseUrl}/sessions`;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(listUrl, { headers, signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
            const list = await res.json();
            if (Array.isArray(list) && list.length > 0) {
                const found = list.find((s) => s.name === raw || s.id === raw);
                if (found) {
                    cachedSessionUuid = found.id;
                    return found.id;
                }
                if (list[0].id) {
                    cachedSessionUuid = list[0].id;
                    return list[0].id;
                }
            }
        }
    } catch (e) {
        // OpenWA may not be up yet
    }

    // Attempt to create session if none existed
    try {
        const createName = (raw.replace(/[^a-zA-Z0-9-]/g, "") || "default").slice(0, 30);
        const createRes = await fetch(listUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({ name: createName }),
        });
        if (createRes.ok) {
            const created = await createRes.json();
            if (created && created.id) {
                cachedSessionUuid = created.id;
                return created.id;
            }
        }
    } catch (e) {
        // ignore
    }

    return raw;
}

/**
 * Send a WhatsApp text message via OpenWA REST API
 */
async function sendText(phone, messageText, options = {}) {
    const settings = await getSettings();

    const formatted = formatPhone(phone, settings.openwa_country_code);
    if (!formatted) {
        const errorMsg = `Invalid phone number: "${phone}"`;
        if (options.username && db.dbConfigured) {
            await logMessage({
                customerId: options.customerId || null,
                username: options.username,
                phone: phone || "unknown",
                type: options.type || "manual",
                message: messageText,
                status: "failed",
                error: errorMsg,
            });
        }
        return { success: false, error: errorMsg };
    }

    const baseUrl = (settings.openwa_base_url || "http://localhost:2785/api").replace(/\/+$/, "");
    const sessionId = await resolveSessionId(settings);
    const apiKey = settings.openwa_api_key || "";

    // OpenWA endpoint: /api/sessions/{sessionId}/messages/send-text
    let endpoint = "";
    if (baseUrl.includes("/sessions/")) {
        endpoint = `${baseUrl}/messages/send-text`;
    } else {
        endpoint = `${baseUrl}/sessions/${encodeURIComponent(sessionId)}/messages/send-text`;
    }

    const payload = {
        chatId: formatted.chatId,
        text: messageText,
    };

    const headers = {
        "Content-Type": "application/json",
    };
    if (apiKey) {
        headers["X-API-Key"] = apiKey;
    }

    let responseData = null;
    let success = false;
    let errorDetail = null;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(endpoint, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        clearTimeout(timeout);

        const rawText = await res.text();
        try {
            responseData = JSON.parse(rawText);
        } catch (e) {
            responseData = { raw: rawText };
        }

        if (res.ok) {
            success = true;
        } else {
            errorDetail = (responseData && (responseData.message || responseData.error)) || `HTTP ${res.status}: ${res.statusText}`;
        }
    } catch (fetchErr) {
        errorDetail = fetchErr.name === "AbortError"
            ? "Request timeout connecting to OpenWA"
            : (fetchErr.message || "Failed to reach OpenWA gateway");
    }

    // Log to whatsapp_logs table
    if (db.dbConfigured) {
        await logMessage({
            customerId: options.customerId || null,
            username: options.username || formatted.number,
            phone: formatted.number,
            type: options.type || "manual",
            message: messageText,
            status: success ? "sent" : "failed",
            error: errorDetail,
        });
    }

    return {
        success: success,
        chatId: formatted.chatId,
        error: errorDetail,
        response: responseData,
    };
}

async function logMessage({ customerId, username, phone, type, message, status, error }) {
    try {
        await db.query(
            "INSERT INTO `whatsapp_logs` (`customer_id`, `username`, `phone`, `type`, `message`, `status`, `error`, `sent_date`) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE())",
            [customerId, username, phone, type, message, status, error || null]
        );
    } catch (e) {
        console.error("[whatsapp] log error:", e.message);
    }
}

/**
 * Test OpenWA gateway connectivity
 */
async function testConnection() {
    const settings = await getSettings();
    const baseUrl = (settings.openwa_base_url || "http://localhost:2785/api").replace(/\/+$/, "");
    const apiKey = settings.openwa_api_key || "";

    const headers = {};
    if (apiKey) {
        headers["X-API-Key"] = apiKey;
    }

    const healthUrl = baseUrl.includes("/api")
        ? baseUrl.replace(/\/api.*$/, "/api/health")
        : `${baseUrl}/health`;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(healthUrl, {
            method: "GET",
            headers: headers,
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
            return {
                ok: false,
                status: res.status,
                error: `OpenWA returned HTTP ${res.status}: ${res.statusText}`,
                endpoint: healthUrl,
            };
        }

        const healthData = await res.json().catch(() => ({}));

        // Now resolve session to get session status
        const resolvedId = await resolveSessionId(settings);
        const sessionUrl = `${baseUrl.replace(/\/sessions.*$/, "")}/sessions/${encodeURIComponent(resolvedId)}`;
        let sessionData = null;

        try {
            const sRes = await fetch(sessionUrl, { headers });
            if (sRes.ok) {
                sessionData = await sRes.json().catch(() => null);
            }
        } catch (e) {
            // ignore
        }

        return {
            ok: true,
            status: 200,
            health: healthData,
            session: sessionData,
            sessionId: resolvedId,
            data: sessionData || healthData,
            endpoint: healthUrl,
        };
    } catch (err) {
        let msg = err.message;
        if (err.cause && err.cause.code === "ECONNREFUSED") {
            msg = `OpenWA gateway is not running or port 2785 is closed. Please start OpenWA first at ${baseUrl}`;
        } else if (err.name === "AbortError") {
            msg = `Connection timeout reaching OpenWA gateway at ${baseUrl}`;
        }
        return {
            ok: false,
            error: msg,
            endpoint: healthUrl,
        };
    }
}

/**
 * Fetch QR Code for pairing WhatsApp device
 */
async function getQrCode() {
    const settings = await getSettings();
    const baseUrl = (settings.openwa_base_url || "http://localhost:2785/api").replace(/\/+$/, "");
    const sessionId = await resolveSessionId(settings);
    const apiKey = settings.openwa_api_key || "";

    const headers = {};
    if (apiKey) {
        headers["X-API-Key"] = apiKey;
    }

    const endpoint = `${baseUrl}/sessions/${encodeURIComponent(sessionId)}/qr`;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        let res = await fetch(endpoint, { method: "GET", headers, signal: controller.signal });
        clearTimeout(timeout);
        let data = await res.json().catch(() => null);

        // If session is not started, automatically start it and re-fetch QR
        if (!res.ok && data && typeof data.message === "string" && data.message.includes("Session is not started")) {
            await startSession();
            await new Promise((r) => setTimeout(r, 3000));
            const retryRes = await fetch(endpoint, { method: "GET", headers });
            data = await retryRes.json().catch(() => null);
            res = retryRes;
        }

        return { ok: res.ok, status: res.status, data, sessionId };
    } catch (err) {
        let msg = err.message;
        if (err.cause && err.cause.code === "ECONNREFUSED") {
            msg = "OpenWA is not running on port 2785. Please start the OpenWA service first.";
        }
        return { ok: false, error: msg };
    }
}

/**
 * Start or resume an OpenWA session
 */
async function startSession() {
    const settings = await getSettings();
    const baseUrl = (settings.openwa_base_url || "http://localhost:2785/api").replace(/\/+$/, "");
    const sessionId = await resolveSessionId(settings);
    const apiKey = settings.openwa_api_key || "";

    const headers = { "Content-Type": "application/json" };
    if (apiKey) {
        headers["X-API-Key"] = apiKey;
    }

    const endpoint = `${baseUrl}/sessions/${encodeURIComponent(sessionId)}/start`;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        const res = await fetch(endpoint, { method: "POST", headers, signal: controller.signal });
        clearTimeout(timeout);
        const data = await res.json().catch(() => null);
        return { ok: res.ok, status: res.status, data, sessionId };
    } catch (err) {
        let msg = err.message;
        if (err.cause && err.cause.code === "ECONNREFUSED") {
            msg = "OpenWA is not running on port 2785. Please start the OpenWA service first.";
        }
        return { ok: false, error: msg };
    }
}

/**
 * Automated WhatsApp notification sweep:
 * 1. Sends reminder to active customers whose package is expiring soon (e.g. in 1-2 days).
 * 2. Sends reminder to expired customers on expiry day and EVERY NEXT DAY until renewed.
 */
async function checkAndSendExpiryReminders() {
    if (!db.dbConfigured) {
        return { skipped: true, reason: "database-not-configured" };
    }

    const settings = await getSettings();
    if (!settings.whatsapp_enabled) {
        return { skipped: true, reason: "whatsapp-disabled" };
    }

    const summary = {
        beforeExpirySent: 0,
        expiredSent: 0,
        failed: 0,
        skipped: 0,
        errors: [],
    };

    const daysBefore = settings.whatsapp_days_before || 2;

    // ============================================================
    // PART 1: BEFORE EXPIRY REMINDERS
    // ============================================================
    // Find active customers whose expiry_date is within [CURDATE(), CURDATE() + daysBefore]
    // with a valid phone number.
    try {
        const upcomingRows = await db.query(
            "SELECT `id`, `name`, `username`, `password`, `phone`, `package`, `price`, `expiry_date`, " +
            "DATEDIFF(`expiry_date`, CURDATE()) AS `days_left` " +
            "FROM `mikrotik_users` " +
            "WHERE `status` = 'active' " +
            "  AND `expiry_date` IS NOT NULL " +
            "  AND `expiry_date` > CURDATE() " +
            "  AND `expiry_date` <= DATE_ADD(CURDATE(), INTERVAL ? DAY) " +
            "  AND `phone` IS NOT NULL AND `phone` != ''",
            [daysBefore]
        );

        for (const user of upcomingRows) {
            // Check if we already sent a 'before_expiry' reminder to this user within the last `daysBefore` days
            const alreadySent = await db.query(
                "SELECT `id` FROM `whatsapp_logs` " +
                "WHERE `username` = ? AND `type` = 'before_expiry' AND `status` = 'sent' " +
                "  AND `created_at` >= DATE_SUB(NOW(), INTERVAL ? DAY) LIMIT 1",
                [user.username, daysBefore]
            );

            if (alreadySent.length > 0) {
                summary.skipped++;
                continue;
            }

            const beforeVariations = parseVariations(settings.template_before_expiry, DEFAULT_BEFORE_VARIATIONS);
            const chosenTemplate = chooseVariation(beforeVariations, user.username, user.days_left || 0);
            const message = renderTemplate(chosenTemplate, user);
            const result = await sendText(user.phone, message, {
                customerId: user.id,
                username: user.username,
                type: "before_expiry",
            });

            if (result.success) {
                summary.beforeExpirySent++;
            } else {
                summary.failed++;
                summary.errors.push(`${user.username} (before_expiry): ${result.error}`);
            }
        }
    } catch (err) {
        console.error("[whatsapp] before-expiry sweep error:", err.message);
        summary.errors.push("before-expiry error: " + err.message);
    }

    // ============================================================
    // PART 2: EXPIRED REMINDERS (ON EXPIRY & EVERY NEXT DAY)
    // ============================================================
    // Find customers whose package is expired (status = 'expired' OR expiry_date <= CURDATE())
    // and who haven't received an expired reminder TODAY.
    try {
        const expiredRows = await db.query(
            "SELECT `id`, `name`, `username`, `password`, `phone`, `package`, `price`, `expiry_date` " +
            "FROM `mikrotik_users` " +
            "WHERE (`status` = 'expired' OR (`expiry_date` IS NOT NULL AND `expiry_date` <= CURDATE())) " +
            "  AND `phone` IS NOT NULL AND `phone` != ''",
            []
        );

        for (const user of expiredRows) {
            // Check if an expired message was already sent TODAY (sent_date = CURDATE())
            const sentToday = await db.query(
                "SELECT `id` FROM `whatsapp_logs` " +
                "WHERE `username` = ? AND `type` = 'expired' AND `sent_date` = CURDATE() AND `status` = 'sent' LIMIT 1",
                [user.username]
            );

            if (sentToday.length > 0) {
                summary.skipped++;
                continue;
            }

            const expiredVariations = parseVariations(settings.template_expired, DEFAULT_EXPIRED_VARIATIONS);
            const daysLate = Math.max(1, Math.floor((Date.now() - new Date(user.expiry_date).getTime()) / (1000 * 60 * 60 * 24)));
            const chosenTemplate = chooseVariation(expiredVariations, user.username, daysLate);
            const message = renderTemplate(chosenTemplate, user);
            const result = await sendText(user.phone, message, {
                customerId: user.id,
                username: user.username,
                type: "expired",
            });

            if (result.success) {
                summary.expiredSent++;
            } else {
                summary.failed++;
                summary.errors.push(`${user.username} (expired): ${result.error}`);
            }
        }
    } catch (err) {
        console.error("[whatsapp] expired sweep error:", err.message);
        summary.errors.push("expired sweep error: " + err.message);
    }

    return summary;
}

/**
 * Fetch recent delivery logs
 */
async function getLogs(limit = 50, offset = 0) {
    if (!db.dbConfigured) return [];
    try {
        return await db.query(
            "SELECT * FROM `whatsapp_logs` ORDER BY `id` DESC LIMIT ? OFFSET ?",
            [Number(limit) || 50, Number(offset) || 0]
        );
    } catch (e) {
        console.error("[whatsapp] getLogs error:", e.message);
        return [];
    }
}

module.exports = {
    getSettings,
    saveSettings,
    formatPhone,
    renderTemplate,
    parseVariations,
    chooseVariation,
    sendText,
    testConnection,
    getQrCode,
    startSession,
    checkAndSendExpiryReminders,
    getLogs,
    DEFAULT_BEFORE_TEMPLATE,
    DEFAULT_EXPIRED_TEMPLATE,
    DEFAULT_BEFORE_VARIATIONS,
    DEFAULT_EXPIRED_VARIATIONS,
};
