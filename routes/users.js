const express = require("express");

const router = express.Router();

const mikrotik = require("../mikrotik");
const db = require("../db");
const dates = require("../dates");
const whatsapp = require("../whatsapp");
const { renderUsersPage } = require("../views/usersPage");

/*
|--------------------------------------------------------------------------
| Validation helpers
|--------------------------------------------------------------------------
*/

const USERNAME_REGEX = /^[a-zA-Z0-9._-]+$/;

function validateUsername(username) {
    if (!username || typeof username !== "string") {
        return { valid: false, error: "Username is required" };
    }
    if (username.length === 0 || username.length > 100) {
        return { valid: false, error: "Username must be 1-100 characters" };
    }
    if (!USERNAME_REGEX.test(username)) {
        return { valid: false, error: "Username contains invalid characters" };
    }
    return { valid: true };
}

function validatePassword(password, required) {
    if (!password || typeof password !== "string" || password.length === 0) {
        if (required) {
            return { valid: false, error: "Password is required" };
        }
        return { valid: true };
    }
    return { valid: true };
}

/*
|--------------------------------------------------------------------------
| Audit log
|--------------------------------------------------------------------------
| Records customer lifecycle events.  Passwords are never written here.
*/

async function logAudit(action, username, details) {
    if (!db.dbConfigured) {
        return;
    }
    try {
        await db.query(
            "INSERT INTO `audit_log` (`action`, `username`, `details`) VALUES (?, ?, ?)",
            [action, username || null, details || null]
        );
    } catch (error) {
        console.error("[audit] failed to log " + action + ":", error.message);
    }
}

/*
|--------------------------------------------------------------------------
| Customer (SQL) helpers
|--------------------------------------------------------------------------
| The password column is intentionally excluded from every SELECT used by
| API responses.  It is read in memory only when the panel must re-sync a
| secret to the router (e.g. when a PPPoE username is renamed) and is
| never returned to the browser or written to logs.
*/

const CUSTOMER_FIELDS = [
    "id",
    "mikrotik_id",
    "name",
    "username",
    "password",
    "profile",
    "phone",
    "package",
    "price",
    "start_date",
    "expiry_date",
    "status",
    "comment",
    "created_at",
    "updated_at",
];

const CUSTOMER_SELECT = "SELECT " + CUSTOMER_FIELDS.join(", ") + " FROM `mikrotik_users` ";

async function sqlAllCustomers() {
    if (!db.dbConfigured) {
        return [];
    }
    try {
        return await db.query(CUSTOMER_SELECT + "ORDER BY `username`", []);
    } catch (error) {
        console.error("[users] SQL query error:", error.message);
        return [];
    }
}

async function getCustomerRow(username) {
    if (!db.dbConfigured) {
        return null;
    }
    try {
        const rows = await db.query(CUSTOMER_SELECT + "WHERE `username` = ?", [username]);
        return rows[0] || null;
    } catch (error) {
        console.error("[users] SQL query error:", error.message);
        return null;
    }
}

async function getCustomerRowWithPassword(username) {
    if (!db.dbConfigured) {
        return null;
    }
    try {
        const rows = await db.query(
            CUSTOMER_SELECT + ", `password` FROM `mikrotik_users` WHERE `username` = ?",
            [username]
        );
        return rows[0] || null;
    } catch (error) {
        console.error("[users] SQL query error:", error.message);
        return null;
    }
}

function buildSqlInfo(row) {
    if (!row) {
        return null;
    }
    return {
        id: row.id,
        mikrotikId: row.mikrotik_id || "",
        name: row.name || "",
        profile: row.profile || "",
        phone: row.phone || "",
        package: row.package || "",
        price: row.price !== null && row.price !== undefined ? Number(row.price) : null,
        startDate: dates.formatDate(row.start_date),
        expiryDate: dates.formatDate(row.expiry_date),
        status: row.status || "active",
        comment: row.comment || "",
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function buildActiveSession(active) {
    if (!active) {
        return null;
    }
    return {
        address: active.address || "",
        callerId: active.callerId || "",
        uptime: active.uptime || "",
        service: active.service || "",
    };
}

/*
| Display status is what the customer table shows:
|   active / expiring / expired / suspended / disabled / missing
| Expiry from the SQL record takes precedence, then manual suspension,
| then a disabled PPP secret on the router.
*/

function computeDisplayStatus(user) {
    if (user.mikrotikMissing) {
        return "missing";
    }
    const expiry = user.sql ? dates.expiryStatus(user.sql.expiryDate) : null;
    if (expiry === "expired") {
        return "expired";
    }
    if (user.sql && user.sql.status === "suspended") {
        return "suspended";
    }
    if (expiry === "expiring") {
        return "expiring";
    }
    if (user.mikrotik && user.mikrotik.disabled) {
        return "disabled";
    }
    return "active";
}

/*
|--------------------------------------------------------------------------
| Data combination layer
|--------------------------------------------------------------------------
| Merges MikroTik PPP secrets + active sessions + SQL customer rows.
| Customers that exist in SQL but not on the router are flagged
| `mikrotikMissing`.  Secrets that exist on the router without a SQL row
| are still listed (MikroTik is the authentication source of truth).
*/

async function combineUsers() {
    const [secrets, activeSessions, sqlRows] = await Promise.all([
        mikrotik.getPppSecrets(),
        mikrotik.getPppActive(),
        sqlAllCustomers(),
    ]);

    const activeMap = new Map();
    for (const session of activeSessions) {
        activeMap.set(session.name, session);
    }

    const sqlMap = new Map();
    for (const row of sqlRows) {
        sqlMap.set(row.username, row);
    }

    const combined = [];

    for (const secret of secrets) {
        const username = secret.name;
        const sqlRow = sqlMap.get(username);
        const activeSession = activeMap.get(username);

        const effectivePackage = (sqlRow && (sqlRow.package || sqlRow.profile)) || secret.profile || "default";
        const effectiveProfile = secret.profile || (sqlRow && sqlRow.profile) || "default";
        const effectivePrice = sqlRow && sqlRow.price !== null && sqlRow.price !== undefined ? Number(sqlRow.price) : 0;
        const effectiveExpiry = sqlRow && sqlRow.expiry_date ? dates.formatDate(sqlRow.expiry_date) : null;
        const effectiveStartDate = sqlRow && sqlRow.start_date ? dates.formatDate(sqlRow.start_date) : null;

        const user = {
            id: sqlRow ? sqlRow.id : null,
            username: username,
            name: (sqlRow && sqlRow.name) || username,
            phone: (sqlRow && sqlRow.phone) || "",
            package: effectivePackage,
            profile: effectiveProfile,
            price: effectivePrice,
            start_date: effectiveStartDate,
            startDate: effectiveStartDate,
            expiry_date: effectiveExpiry,
            expiryDate: effectiveExpiry,
            status: sqlRow ? sqlRow.status : "active",
            notes: (sqlRow && sqlRow.comment) || secret.comment || "",
            comment: (sqlRow && sqlRow.comment) || secret.comment || "",
            mikrotik: {
                id: secret.id || "",
                service: secret.service || "",
                profile: secret.profile || "",
                localAddress: secret.localAddress || "",
                remoteAddress: secret.remoteAddress || "",
                disabled: secret.disabled === true,
                comment: secret.comment || "",
                lastLoggedIn: secret.lastLoggedIn || "",
                lastDisconnected: secret.lastDisconnected || "",
            },
            online: !!activeSession,
            online_ip: (activeSession && activeSession.address) || "",
            caller_id: (activeSession && activeSession.callerId) || "",
            activeSession: buildActiveSession(activeSession),
            sql: buildSqlInfo(sqlRow),
            expiryStatus: sqlRow ? dates.expiryStatus(sqlRow.expiry_date) : null,
            remainingDays: sqlRow ? dates.remainingDays(sqlRow.expiry_date) : null,
            remaining_days: sqlRow ? dates.remainingDays(sqlRow.expiry_date) : null,
            mikrotikMissing: false,
            disabled: secret.disabled === true,
        };

        user.displayStatus = computeDisplayStatus(user);
        combined.push(user);
        sqlMap.delete(username);
    }

    for (const [username, row] of sqlMap) {
        const effectiveExpiry = row.expiry_date ? dates.formatDate(row.expiry_date) : null;
        const effectiveStartDate = row.start_date ? dates.formatDate(row.start_date) : null;

        const user = {
            id: row.id,
            username: username,
            name: row.name || username,
            phone: row.phone || "",
            package: row.package || row.profile || "default",
            profile: row.profile || "default",
            price: row.price !== null && row.price !== undefined ? Number(row.price) : 0,
            start_date: effectiveStartDate,
            startDate: effectiveStartDate,
            expiry_date: effectiveExpiry,
            expiryDate: effectiveExpiry,
            status: row.status || "active",
            notes: row.comment || "",
            comment: row.comment || "",
            mikrotik: null,
            online: false,
            online_ip: "",
            caller_id: "",
            activeSession: null,
            sql: buildSqlInfo(row),
            expiryStatus: dates.expiryStatus(row.expiry_date),
            remainingDays: dates.remainingDays(row.expiry_date),
            remaining_days: dates.remainingDays(row.expiry_date),
            mikrotikMissing: true,
            disabled: false,
        };

        user.displayStatus = computeDisplayStatus(user);
        combined.push(user);
    }

    return combined;
}

async function getCombinedUser(username) {
    const [secret, sqlRow] = await Promise.all([
        mikrotik.getSecretByName(username),
        getCustomerRow(username),
    ]);

    if (!secret && !sqlRow) {
        return null;
    }

    if (!secret) {
        const effectiveExpiry = sqlRow && sqlRow.expiry_date ? dates.formatDate(sqlRow.expiry_date) : null;
        const effectiveStartDate = sqlRow && sqlRow.start_date ? dates.formatDate(sqlRow.start_date) : null;

        const user = {
            id: sqlRow ? sqlRow.id : null,
            username: username,
            name: (sqlRow && sqlRow.name) || username,
            phone: (sqlRow && sqlRow.phone) || "",
            package: (sqlRow && (sqlRow.package || sqlRow.profile)) || "default",
            profile: (sqlRow && sqlRow.profile) || "default",
            price: sqlRow && sqlRow.price !== null && sqlRow.price !== undefined ? Number(sqlRow.price) : 0,
            start_date: effectiveStartDate,
            startDate: effectiveStartDate,
            expiry_date: effectiveExpiry,
            expiryDate: effectiveExpiry,
            status: sqlRow ? sqlRow.status : "active",
            notes: (sqlRow && sqlRow.comment) || "",
            comment: (sqlRow && sqlRow.comment) || "",
            mikrotik: null,
            online: false,
            online_ip: "",
            caller_id: "",
            activeSession: null,
            sql: buildSqlInfo(sqlRow),
            expiryStatus: sqlRow ? dates.expiryStatus(sqlRow.expiry_date) : null,
            remainingDays: sqlRow ? dates.remainingDays(sqlRow.expiry_date) : null,
            remaining_days: sqlRow ? dates.remainingDays(sqlRow.expiry_date) : null,
            mikrotikMissing: true,
            disabled: false,
        };
        user.displayStatus = computeDisplayStatus(user);
        return user;
    }

    const effectivePackage = (sqlRow && (sqlRow.package || sqlRow.profile)) || secret.profile || "default";
    const effectiveProfile = secret.profile || (sqlRow && sqlRow.profile) || "default";
    const effectivePrice = sqlRow && sqlRow.price !== null && sqlRow.price !== undefined ? Number(sqlRow.price) : 0;
    const effectiveExpiry = sqlRow && sqlRow.expiry_date ? dates.formatDate(sqlRow.expiry_date) : null;
    const effectiveStartDate = sqlRow && sqlRow.start_date ? dates.formatDate(sqlRow.start_date) : null;

    const user = {
        id: sqlRow ? sqlRow.id : null,
        username: username,
        name: (sqlRow && sqlRow.name) || username,
        phone: (sqlRow && sqlRow.phone) || "",
        package: effectivePackage,
        profile: effectiveProfile,
        price: effectivePrice,
        start_date: effectiveStartDate,
        startDate: effectiveStartDate,
        expiry_date: effectiveExpiry,
        expiryDate: effectiveExpiry,
        status: sqlRow ? sqlRow.status : "active",
        notes: (sqlRow && sqlRow.comment) || secret.comment || "",
        comment: (sqlRow && sqlRow.comment) || secret.comment || "",
        mikrotik: {
            id: secret.id || "",
            service: secret.service || "",
            profile: secret.profile || "",
            localAddress: secret.localAddress || "",
            remoteAddress: secret.remoteAddress || "",
            disabled: secret.disabled === true,
            comment: secret.comment || "",
            lastLoggedIn: secret.lastLoggedIn || "",
            lastDisconnected: secret.lastDisconnected || "",
        },
        online: false,
        online_ip: "",
        caller_id: "",
        activeSession: null,
        sql: buildSqlInfo(sqlRow),
        expiryStatus: sqlRow ? dates.expiryStatus(sqlRow.expiry_date) : null,
        remainingDays: sqlRow ? dates.remainingDays(sqlRow.expiry_date) : null,
        remaining_days: sqlRow ? dates.remainingDays(sqlRow.expiry_date) : null,
        mikrotikMissing: false,
        disabled: secret.disabled === true,
    };
    user.displayStatus = computeDisplayStatus(user);
    return user;
}

/*
|--------------------------------------------------------------------------
| GET /api/users
|--------------------------------------------------------------------------
| List all customers with search + status + package filters.
*/

router.get("/users", async (req, res) => {
    try {
        const search = (req.query.search || "").toLowerCase().trim();
        const statusFilter = req.query.status || "all";
        const packageFilter = req.query.package || "all";

        let users = await combineUsers();

        if (search) {
            users = users.filter(function (u) {
                return (
                    u.username.toLowerCase().includes(search) ||
                    (u.sql && u.sql.name && u.sql.name.toLowerCase().includes(search)) ||
                    (u.sql && u.sql.phone && u.sql.phone.toLowerCase().includes(search)) ||
                    (u.sql && u.sql.package && u.sql.package.toLowerCase().includes(search)) ||
                    (u.sql && u.sql.comment && u.sql.comment.toLowerCase().includes(search)) ||
                    (u.mikrotik && u.mikrotik.comment && u.mikrotik.comment.toLowerCase().includes(search)) ||
                    (u.mikrotik && u.mikrotik.localAddress && u.mikrotik.localAddress.toLowerCase().includes(search)) ||
                    (u.mikrotik && u.mikrotik.remoteAddress && u.mikrotik.remoteAddress.toLowerCase().includes(search)) ||
                    (u.activeSession && u.activeSession.address && u.activeSession.address.toLowerCase().includes(search))
                );
            });
        }

        if (statusFilter && statusFilter !== "all") {
            users = users.filter(function (u) {
                switch (statusFilter) {
                    case "online":
                        return u.online === true;
                    case "offline":
                        return u.online === false && !u.mikrotikMissing;
                    case "active":
                        return u.displayStatus === "active";
                    case "expiring":
                        return u.displayStatus === "expiring";
                    case "expired":
                        return u.displayStatus === "expired";
                    case "suspended":
                        return u.displayStatus === "suspended";
                    case "disabled":
                        return u.displayStatus === "disabled";
                    case "missing":
                        return u.mikrotikMissing === true;
                    default:
                        return true;
                }
            });
        }

        if (packageFilter && packageFilter !== "all") {
            users = users.filter(function (u) {
                return u.sql && u.sql.package === packageFilter;
            });
        }

        const packages = [];
        const pkgSet = new Set();
        for (const u of users) {
            if (u.sql && u.sql.package) {
                pkgSet.add(u.sql.package);
            }
        }
        for (const pkg of pkgSet) {
            packages.push(pkg);
        }

        res.json({
            users: users,
            dbConfigured: db.dbConfigured,
            mikrotikConnected: mikrotik.isConnected(),
            packages: packages,
        });
    } catch (error) {
        console.error("[users] GET /api/users error:", error.message);
        res.status(500).json({ success: false, error: "Failed to fetch customers" });
    }
});

/*
|--------------------------------------------------------------------------
| GET /api/queues (Bandwidth Booster & Queue Monitor Data)
|--------------------------------------------------------------------------
*/
router.get("/queues", async (req, res) => {
    try {
        const users = await combineUsers();
        let activeSessions = [];
        if (mikrotik.isConnected()) {
            try {
                activeSessions = await mikrotik.getPppActive();
            } catch (e) {
                // Ignore router query errors
            }
        }

        res.json({
            success: true,
            users: users,
            activeSessions: activeSessions,
            dbConfigured: db.dbConfigured,
            mikrotikConnected: mikrotik.isConnected(),
        });
    } catch (error) {
        console.error("[users] GET /api/queues error:", error.message);
        res.status(500).json({ success: false, error: "Failed to fetch queue data: " + error.message });
    }
});

/*
|--------------------------------------------------------------------------
| GET /api/users/:username
|--------------------------------------------------------------------------
*/

router.get("/users/:username", async (req, res) => {
    const username = req.params.username;

    if (!USERNAME_REGEX.test(username)) {
        return res.status(400).json({ success: false, error: "Invalid username" });
    }

    try {
        const user = await getCombinedUser(username);
        if (!user) {
            return res.status(404).json({ success: false, error: "Customer not found" });
        }
        res.json(user);
    } catch (error) {
        console.error("[users] GET /api/users/:username error:", error.message);
        res.status(500).json({ success: false, error: "Failed to fetch customer" });
    }
});

/*
|--------------------------------------------------------------------------
| GET /api/users/:username/details
|--------------------------------------------------------------------------
*/

router.get("/users/:username/details", async (req, res) => {
    const username = req.params.username;

    if (!USERNAME_REGEX.test(username)) {
        return res.status(400).json({ success: false, error: "Invalid username" });
    }

    try {
        const user = await getCombinedUser(username);
        if (!user) {
            return res.status(404).json({ success: false, error: "Customer not found" });
        }

        if (mikrotik.isConnected() && user.mikrotik && user.mikrotik.id) {
            const activeSessions = await mikrotik.getPppActive();
            user.activeSessions = activeSessions
                .filter(function (s) {
                    return s.name === username;
                })
                .map(buildActiveSession);
        }

        res.json(user);
    } catch (error) {
        console.error("[users] GET /api/users/:username/details error:", error.message);
        res.status(500).json({ success: false, error: "Failed to fetch customer details" });
    }
});

/*
|--------------------------------------------------------------------------
| POST /api/users
|--------------------------------------------------------------------------
| Create a customer: validate -> create PPP secret on MikroTik ->
| save the customer record in MySQL.  If the DB insert fails the freshly
| created secret is rolled back so the two stores stay consistent.
*/

router.post("/users", async (req, res) => {
    const body = req.body || {};
    const username = body.username;

    const uVal = validateUsername(username);
    if (!uVal.valid) {
        return res.status(400).json({ success: false, error: uVal.error });
    }

    const pVal = validatePassword(body.password, true);
    if (!pVal.valid) {
        return res.status(400).json({ success: false, error: pVal.error });
    }

    try {
        if (await mikrotik.getSecretByName(username)) {
            return res.status(409).json({ success: false, error: "PPPoE username already exists: " + username });
        }

        if (db.dbConfigured && (await getCustomerRow(username))) {
            return res.status(409).json({ success: false, error: "Customer already exists: " + username });
        }

        const profile = body.profile || "default";

        const profiles = await mikrotik.getPppProfiles();
        if (profiles.length > 0 && !profiles.some(function (p) { return p.name === profile; })) {
            return res.status(400).json({ success: false, error: "Invalid PPPoE profile: " + profile });
        }

        const startDate = dates.parseDate(body.startDate) || dates.today();

        let expiryDate;
        if (body.expiryDate) {
            expiryDate = dates.parseDate(body.expiryDate);
            if (!expiryDate) {
                return res.status(400).json({ success: false, error: "Invalid expiry date" });
            }
            if (dates.remainingDays(expiryDate) < 0) {
                return res.status(400).json({ success: false, error: "Expiry date must be in the future" });
            }
        } else {
            const months = Math.max(1, Math.min(36, Number(body.months) || 1));
            expiryDate = dates.addMonths(startDate, months);
        }

        let secretResult;
        try {
            secretResult = await mikrotik.addSecret({
                name: username,
                password: body.password,
                service: body.service || "pppoe",
                profile: profile,
                comment: body.comment || "",
            });
        } catch (error) {
            console.error("[users] MikroTik create failed:", error.message);
            return res.status(502).json({
                success: false,
                error: "MikroTik API failed: " + (error.message || "could not create PPP secret"),
            });
        }

        if (db.dbConfigured) {
            try {
                await db.query(
                    "INSERT INTO `mikrotik_users` " +
                    "(`name`, `username`, `password`, `mikrotik_id`, `profile`, `phone`, `package`, `price`, `start_date`, `expiry_date`, `status`, `comment`) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)",
                    [
                        body.name || null,
                        username,
                        body.password,
                        secretResult && secretResult.id ? String(secretResult.id) : "",
                        profile,
                        body.phone || null,
                        body.package || null,
                        body.price || null,
                        dates.formatDate(startDate),
                        dates.formatDate(expiryDate),
                        body.comment || null,
                    ]
                );
            } catch (error) {
                try {
                    await mikrotik.deleteSecret(username);
                } catch (rollbackError) {
                    console.error("[users] rollback of secret failed:", rollbackError.message);
                }
                console.error("[users] DB insert failed, secret rolled back:", error.message);
                return res.status(500).json({ success: false, error: "Customer record could not be saved" });
            }
        }

        await logAudit("customer created", username, "profile: " + profile + ", expiry: " + dates.formatDate(expiryDate));

        res.status(201).json({
            success: true,
            username: username,
            expiryDate: dates.formatDate(expiryDate),
        });
    } catch (error) {
        console.error("[users] POST /api/users error:", error.message);
        res.status(500).json({ success: false, error: "Failed to create customer" });
    }
});

/*
|--------------------------------------------------------------------------
| PUT /api/users/:username
|--------------------------------------------------------------------------
| Edit a customer.  Changes are synchronised to MikroTik:
|   - profile / password / comment -> update the existing PPP secret
|   - username change -> add new secret + delete old one (no duplicates)
|   - status change -> enable/disable the secret accordingly
*/

router.put("/users/:username", async (req, res) => {
    const oldUsername = req.params.username;
    const body = req.body || {};
    const newUsername = body.username || oldUsername;

    if (!USERNAME_REGEX.test(oldUsername)) {
        return res.status(400).json({ success: false, error: "Invalid username" });
    }

    const uVal = validateUsername(newUsername);
    if (!uVal.valid) {
        return res.status(400).json({ success: false, error: uVal.error });
    }

    const pVal = validatePassword(body.password, false);
    if (!pVal.valid) {
        return res.status(400).json({ success: false, error: pVal.error });
    }

    const allowedStatus = ["active", "expired", "suspended"];
    if (body.status !== undefined && body.status !== null && !allowedStatus.includes(body.status)) {
        return res.status(400).json({ success: false, error: "Invalid status" });
    }

    try {
        const currentSecret = await mikrotik.getSecretByName(oldUsername);
        const sqlRow = await getCustomerRow(oldUsername);
        const dbRowWithPassword = await getCustomerRowWithPassword(oldUsername);

        if (!currentSecret && !sqlRow) {
            return res.status(404).json({ success: false, error: "Customer not found: " + oldUsername });
        }

        if (newUsername !== oldUsername) {
            if (await mikrotik.getSecretByName(newUsername)) {
                return res.status(409).json({ success: false, error: "PPPoE username already exists: " + newUsername });
            }
            if (db.dbConfigured && (await getCustomerRow(newUsername))) {
                return res.status(409).json({ success: false, error: "Customer already exists: " + newUsername });
            }
        }

        const inputStartDate = body.startDate !== undefined ? body.startDate : body.start_date;
        const inputExpiryDate = body.expiryDate !== undefined ? body.expiryDate : body.expiry_date;
        const comment = body.comment !== undefined ? body.comment : (body.notes !== undefined ? body.notes : undefined);
        const password = body.password || null;

        if (body.status === "active") {
            const targetExpiry = inputExpiryDate || (sqlRow && sqlRow.expiry_date);
            if (targetExpiry && dates.expiryStatus(targetExpiry) === "expired") {
                body.status = "expired";
            }
        }

        const profile = body.profile || (sqlRow && sqlRow.profile) || null;

        let secretDisabled = null;
        if (body.disabled !== undefined && body.disabled !== null) {
            secretDisabled = body.disabled === true;
        }

        /*
        | Synchronise the PPP secret
        */
        if (currentSecret) {
            if (newUsername !== oldUsername) {
                // Rename: build the new secret from the old one + overrides.
                // The current password comes from the body or the SQL row
                // (the API never reads it from the router).
                const dbPassword = dbRowWithPassword ? dbRowWithPassword.password : "";
                const renamePassword = password || dbPassword;
                if (!renamePassword) {
                    return res.status(400).json({
                        success: false,
                        error: "Password is required to rename this customer (not stored in database)",
                    });
                }

                const newSecretData = {
                    name: newUsername,
                    service: currentSecret.service || "pppoe",
                    profile: profile || currentSecret.profile || "default",
                    password: renamePassword,
                };
                if (currentSecret.localAddress) {
                    newSecretData.localAddress = currentSecret.localAddress;
                }
                if (currentSecret.remoteAddress) {
                    newSecretData.remoteAddress = currentSecret.remoteAddress;
                }
                if (comment !== undefined && comment !== null) {
                    newSecretData.comment = comment;
                } else if (currentSecret.comment) {
                    newSecretData.comment = currentSecret.comment;
                }
                if (secretDisabled !== null) {
                    newSecretData.disabled = secretDisabled;
                } else {
                    newSecretData.disabled = currentSecret.disabled === true;
                }

                await mikrotik.addSecret(newSecretData);
                await mikrotik.deleteSecret(oldUsername);

                try {
                    await mikrotik.disconnectSession(oldUsername);
                } catch (disconnectError) {
                    console.error("[users] could not disconnect old session " + oldUsername + ":", disconnectError.message);
                }
            } else {
                const updateData = {};
                if (password) {
                    updateData.password = password;
                }
                if (profile) {
                    updateData.profile = profile;
                }
                if (comment !== undefined && comment !== null) {
                    updateData.comment = comment;
                }
                if (secretDisabled !== null) {
                    updateData.disabled = secretDisabled;
                }

                if (Object.keys(updateData).length > 0) {
                    await mikrotik.updateSecret(oldUsername, updateData);
                }

                // Status change drives the enable/disable flag on the router
                if (body.status && sqlRow && body.status !== sqlRow.status) {
                    if (body.status === "suspended" || body.status === "expired") {
                        if (currentSecret.disabled !== true) {
                            await mikrotik.disableSecret(oldUsername);
                        }
                        try {
                            await mikrotik.disconnectSession(oldUsername);
                        } catch (disconnectError) {
                            console.error("[users] could not disconnect " + oldUsername + ":", disconnectError.message);
                        }
                    } else if (body.status === "active") {
                        if (currentSecret.disabled === true) {
                            await mikrotik.enableSecret(oldUsername);
                        }
                    }
                }
            }
        }

        /*
        | Persist the customer record
        */
        if (db.dbConfigured) {
            if (sqlRow) {
                await db.query(
                    "UPDATE `mikrotik_users` SET " +
                    "`name` = ?, `username` = ?, `profile` = ?, `phone` = ?, `package` = ?, " +
                    "`price` = ?, `start_date` = ?, `expiry_date` = ?, `status` = ?, `comment` = ? " +
                    "WHERE `id` = ?",
                    [
                        body.name !== undefined ? body.name : sqlRow.name,
                        newUsername,
                        profile !== null ? profile : sqlRow.profile,
                        body.phone !== undefined ? body.phone : sqlRow.phone,
                        body.package !== undefined ? body.package : sqlRow.package,
                        body.price !== undefined ? body.price : sqlRow.price,
                        inputStartDate !== undefined ? (dates.formatDate(inputStartDate) || sqlRow.start_date) : sqlRow.start_date,
                        inputExpiryDate !== undefined ? (dates.formatDate(inputExpiryDate) || sqlRow.expiry_date) : sqlRow.expiry_date,
                        body.status !== undefined ? body.status : (inputExpiryDate && dates.expiryStatus(inputExpiryDate) === "expired" ? "expired" : sqlRow.status),
                        comment !== undefined ? comment : sqlRow.comment,
                        sqlRow.id,
                    ]
                );

                if (password) {
                    await db.query(
                        "UPDATE `mikrotik_users` SET `password` = ? WHERE `id` = ?",
                        [password, sqlRow.id]
                    );
                }
            } else if (
                body.name !== undefined || body.phone !== undefined ||
                body.package !== undefined || inputExpiryDate !== undefined ||
                body.status !== undefined || comment !== undefined
            ) {
                await db.query(
                    "INSERT INTO `mikrotik_users` " +
                    "(`name`, `username`, `password`, `mikrotik_id`, `profile`, `phone`, `package`, `price`, `start_date`, `expiry_date`, `status`, `comment`) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
                    "ON DUPLICATE KEY UPDATE " +
                    "`name` = VALUES(`name`), `password` = VALUES(`password`), `mikrotik_id` = VALUES(`mikrotik_id`), " +
                    "`profile` = VALUES(`profile`), `phone` = VALUES(`phone`), `package` = VALUES(`package`), " +
                    "`price` = VALUES(`price`), `start_date` = VALUES(`start_date`), `expiry_date` = VALUES(`expiry_date`), " +
                    "`status` = VALUES(`status`), `comment` = VALUES(`comment`)",
                    [
                        body.name !== undefined ? body.name : null,
                        newUsername,
                        password || (dbRowWithPassword && dbRowWithPassword.password) || "",
                        currentSecret && currentSecret.id ? String(currentSecret.id) : "",
                        profile || null,
                        body.phone !== undefined ? body.phone : null,
                        body.package !== undefined ? body.package : null,
                        body.price !== undefined ? body.price : null,
                        inputStartDate !== undefined ? (dates.formatDate(inputStartDate) || null) : null,
                        inputExpiryDate !== undefined ? (dates.formatDate(inputExpiryDate) || null) : null,
                        body.status !== undefined ? body.status : (inputExpiryDate && dates.expiryStatus(inputExpiryDate) === "expired" ? "expired" : "active"),
                        comment !== undefined ? comment : null,
                    ]
                );
            }
        }

        await logAudit("customer edited", newUsername, "renamed from: " + (newUsername !== oldUsername ? oldUsername : "-"));

        res.json({ success: true, username: newUsername });
    } catch (error) {
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({ success: false, error: "Customer not found" });
        }
        console.error("[users] PUT /api/users/:username error:", error.message);
        res.status(500).json({ success: false, error: "Failed to update customer" });
    }
});

/*
|--------------------------------------------------------------------------
| DELETE /api/users/:username
|--------------------------------------------------------------------------
| Removes the PPP secret from MikroTik and the customer record from MySQL.
*/

router.delete("/users/:username", async (req, res) => {
    const username = req.params.username;

    if (!USERNAME_REGEX.test(username)) {
        return res.status(400).json({ success: false, error: "Invalid username" });
    }

    try {
        const secret = await mikrotik.getSecretByName(username);
        if (secret) {
            await mikrotik.deleteSecret(username);
        }

        if (db.dbConfigured) {
            try {
                await db.query("DELETE FROM `mikrotik_users` WHERE `username` = ?", [username]);
            } catch (sqlError) {
                console.error("[users] SQL delete error:", sqlError.message);
            }
        }

        await logAudit("customer deleted", username);

        res.json({ success: true, username: username });
    } catch (error) {
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({ success: false, error: "Customer not found" });
        }
        console.error("[users] DELETE /api/users/:username error:", error.message);
        res.status(500).json({ success: false, error: "Failed to delete customer" });
    }
});

/*
|--------------------------------------------------------------------------
| POST /api/users/:username/enable  |  disable
|--------------------------------------------------------------------------
| Raw secret toggles (no SQL status change).
*/

router.post("/users/:username/enable", async (req, res) => {
    const username = req.params.username;

    if (!USERNAME_REGEX.test(username)) {
        return res.status(400).json({ success: false, error: "Invalid username" });
    }

    try {
        const secret = await mikrotik.getSecretByName(username);
        if (!secret) {
            return res.status(404).json({ success: false, error: "PPPoE secret not found: " + username });
        }
        if (secret.disabled !== true) {
            return res.status(400).json({ success: false, error: "Secret is already enabled" });
        }

        await mikrotik.enableSecret(username);
        await logAudit("customer enabled", username);

        res.json({ success: true, username: username });
    } catch (error) {
        console.error("[users] enable error:", error.message);
        res.status(500).json({ success: false, error: "Failed to enable customer" });
    }
});

/*
|--------------------------------------------------------------------------
| POST /api/users/:username/disable
|--------------------------------------------------------------------------
| Disables the PPP secret AND disconnects any live session (disabling a
| secret alone does not kick an already connected user).  Safe to call
| on an already-disabled user: the secret is left as is and the session
| is still kicked.
*/

router.post("/users/:username/disable", async (req, res) => {
    const username = req.params.username;

    if (!USERNAME_REGEX.test(username)) {
        return res.status(400).json({ success: false, error: "Invalid username" });
    }

    try {
        const secret = await mikrotik.getSecretByName(username);
        if (!secret) {
            return res.status(404).json({ success: false, error: "PPPoE secret not found: " + username });
        }

        let wasDisabled = false;

        if (secret.disabled !== true) {
            await mikrotik.disableSecret(username);
        } else {
            wasDisabled = true;
        }

        let kicked = 0;

        try {
            kicked = await mikrotik.disconnectSession(username);
        } catch (disconnectError) {
            console.error("[users] could not disconnect " + username + ":", disconnectError.message);
        }

        await logAudit("customer disabled", username, (wasDisabled ? "already disabled, " : "") + kicked + " session(s) disconnected");

        res.json({ success: true, username: username, kicked: kicked });
    } catch (error) {
        console.error("[users] disable error:", error.message);
        res.status(500).json({ success: false, error: "Failed to disable customer" });
    }
});

/*
|--------------------------------------------------------------------------
| POST /api/users/:username/kick
|--------------------------------------------------------------------------
| Disconnects live sessions WITHOUT touching the disabled state.  Use
| this for users whose secret is already disabled but who are still
| connected (a disabled secret does not drop existing sessions).
*/

router.post("/users/:username/kick", async (req, res) => {
    const username = req.params.username;

    if (!USERNAME_REGEX.test(username)) {
        return res.status(400).json({ success: false, error: "Invalid username" });
    }

    try {
        const kicked = await mikrotik.disconnectSession(username);

        await logAudit("customer kicked", username, kicked + " session(s) disconnected");

        res.json({ success: true, username: username, kicked: kicked });
    } catch (error) {
        console.error("[users] kick error:", error.message);
        res.status(500).json({ success: false, error: "Failed to disconnect customer" });
    }
});

/*
|--------------------------------------------------------------------------
| POST /api/users/:username/remote
|--------------------------------------------------------------------------
| Opens remote access to the customer's router by adding a dst-nat rule:
|   /ip firewall nat add chain=dstnat in-interface=ether1 protocol=tcp \
|       dst-port=9001 action=dst-nat to-addresses=<user ip> to-ports=80 \
|       comment="REMOTE PPPoE ROUTER"
| Any previous rule with the same comment is removed first, so only one
| customer router is reachable on the port at a time.  Returns the URL the
| admin should open in the browser.
*/

router.post("/users/:username/remote", async (req, res) => {
    const username = req.params.username;

    if (!USERNAME_REGEX.test(username)) {
        return res.status(400).json({ success: false, error: "Invalid username" });
    }

    try {
        const secret = await mikrotik.getSecretByName(username);
        if (!secret) {
            return res.status(404).json({ success: false, error: "PPPoE secret not found: " + username });
        }

        const active = await mikrotik.getPppActive();
        const session = active.find(function (s) {
            return s.name === username;
        });

        if (!session || !session.address) {
            return res.status(409).json({
                success: false,
                error: "Customer is not online – no IP to redirect to",
            });
        }

        const port = Number((req.body || {}).port) || Number(process.env.REMOTE_ACCESS_PORT) || 9001;

        const removed = await mikrotik.clearRemoteAccessRules();
        await mikrotik.addRemoteAccessRule(session.address, { port });

        const url = "http://" + (process.env.MIKROTIK_HOST || "router") + ":" + port;

        await logAudit("remote access opened", username, session.address + " -> " + url + " (removed " + removed + " old rule(s))");

        res.json({
            success: true,
            username: username,
            ip: session.address,
            port: port,
            url: url,
        });
    } catch (error) {
        console.error("[users] remote access error:", error.message);
        res.status(500).json({ success: false, error: "Failed to open remote access: " + error.message });
    }
});

/*
|--------------------------------------------------------------------------
| POST /api/remote/close
|--------------------------------------------------------------------------
| Removes the active remote-access dst-nat rule(s).
*/

router.post("/remote/close", async (req, res) => {
    try {
        const removed = await mikrotik.clearRemoteAccessRules();

        await logAudit("remote access closed", null, removed + " rule(s) removed");

        res.json({ success: true, removed: removed });
    } catch (error) {
        console.error("[users] remote close error:", error.message);
        res.status(500).json({ success: false, error: "Failed to close remote access: " + error.message });
    }
});

/*
|--------------------------------------------------------------------------
| POST /api/users/:username/suspend
|--------------------------------------------------------------------------
| SQL status = suspended + PPP secret disabled.
*/

router.post("/users/:username/suspend", async (req, res) => {
    const username = req.params.username;

    if (!USERNAME_REGEX.test(username)) {
        return res.status(400).json({ success: false, error: "Invalid username" });
    }

    try {
        const sqlRow = await getCustomerRow(username);
        const secret = await mikrotik.getSecretByName(username);

        if (!sqlRow && !secret) {
            return res.status(404).json({ success: false, error: "Customer not found: " + username });
        }

        if (secret && secret.disabled !== true) {
            await mikrotik.disableSecret(username);
        }

        try {
            await mikrotik.disconnectSession(username);
        } catch (disconnectError) {
            console.error("[users] could not disconnect " + username + ":", disconnectError.message);
        }

        if (sqlRow && sqlRow.status !== "suspended") {
            await db.query("UPDATE `mikrotik_users` SET `status` = 'suspended' WHERE `id` = ?", [sqlRow.id]);
        }

        await logAudit("customer suspended", username);

        res.json({ success: true, username: username });
    } catch (error) {
        console.error("[users] suspend error:", error.message);
        res.status(500).json({ success: false, error: "Failed to suspend customer" });
    }
});

/*
|--------------------------------------------------------------------------
| POST /api/users/:username/activate
|--------------------------------------------------------------------------
| SQL status = active + PPP secret enabled.  Expired accounts must be
| renewed first (an expired account cannot be activated without a new
| expiry date).
*/

router.post("/users/:username/activate", async (req, res) => {
    const username = req.params.username;

    if (!USERNAME_REGEX.test(username)) {
        return res.status(400).json({ success: false, error: "Invalid username" });
    }

    try {
        const sqlRow = await getCustomerRow(username);
        const secret = await mikrotik.getSecretByName(username);

        if (!sqlRow && !secret) {
            return res.status(404).json({ success: false, error: "Customer not found: " + username });
        }

        if (sqlRow && dates.expiryStatus(sqlRow.expiry_date) === "expired") {
            return res.status(400).json({
                success: false,
                error: "Account is expired. Renew it first to activate.",
            });
        }

        if (secret && secret.disabled === true) {
            await mikrotik.enableSecret(username);
        }

        if (sqlRow && sqlRow.status !== "active") {
            await db.query("UPDATE `mikrotik_users` SET `status` = 'active' WHERE `id` = ?", [sqlRow.id]);
        }

        await logAudit("customer activated", username);

        res.json({ success: true, username: username });
    } catch (error) {
        console.error("[users] activate error:", error.message);
        res.status(500).json({ success: false, error: "Failed to activate customer" });
    }
});

/*
|--------------------------------------------------------------------------
| POST /api/users/:username/renew
|--------------------------------------------------------------------------
| Renewal:
|   - active customer  -> one calendar month added to the current expiry
|   - expired customer -> one calendar month from today
|   - optional custom `expiryDate` overrides the calculation
| Sets status back to active and enables the PPP secret.
*/

router.post("/users/:username/renew", async (req, res) => {
    const username = req.params.username;
    const body = req.body || {};

    if (!USERNAME_REGEX.test(username)) {
        return res.status(400).json({ success: false, error: "Invalid username" });
    }

    const months = Math.max(1, Math.min(36, Number(body.months) || 1));

    try {
        const sqlRow = await getCustomerRow(username);
        const secret = await mikrotik.getSecretByName(username);

        if (!sqlRow && !secret) {
            return res.status(404).json({ success: false, error: "Customer not found: " + username });
        }

        let base;
        if (sqlRow && sqlRow.expiry_date) {
            base = dates.expiryStatus(sqlRow.expiry_date) === "expired"
                ? dates.today()
                : dates.parseDate(sqlRow.expiry_date);
        } else {
            base = dates.today();
        }

        const inputExpiry = body.expiryDate || body.newExpiryDate || body.new_expiry_date;
        const newExpiry = inputExpiry
            ? dates.parseDate(inputExpiry)
            : dates.addMonths(base, months);

        if (!newExpiry) {
            return res.status(400).json({ success: false, error: "Invalid expiry date" });
        }
        if (dates.remainingDays(newExpiry) < 0) {
            return res.status(400).json({ success: false, error: "Expiry date must be in the future" });
        }

        if (secret && secret.disabled === true) {
            await mikrotik.enableSecret(username);
        }

        if (sqlRow) {
            await db.query(
                "UPDATE `mikrotik_users` SET `expiry_date` = ?, `status` = 'active' WHERE `id` = ?",
                [dates.formatDate(newExpiry), sqlRow.id]
            );
        } else if (db.dbConfigured) {
            await db.query(
                "INSERT INTO `mikrotik_users` (`username`, `expiry_date`, `status`, `mikrotik_id`) " +
                "VALUES (?, ?, 'active', ?) " +
                "ON DUPLICATE KEY UPDATE `expiry_date` = VALUES(`expiry_date`), `status` = 'active'",
                [
                    username,
                    dates.formatDate(newExpiry),
                    secret && secret.id ? String(secret.id) : "",
                ]
            );
        }

        await logAudit(
            "customer renewed",
            username,
            months + " month(s), new expiry: " + dates.formatDate(newExpiry)
        );

        res.json({ success: true, username: username, expiryDate: dates.formatDate(newExpiry) });
    } catch (error) {
        console.error("[users] renew error:", error.message);
        res.status(500).json({ success: false, error: "Failed to renew customer" });
    }
});

/*
|--------------------------------------------------------------------------
| GET /api/profiles
|--------------------------------------------------------------------------
| PPP profiles retrieved live from the router (never hard-coded).
*/

router.get("/profiles", async (req, res) => {
    try {
        const profiles = await mikrotik.getPppProfiles();
        const names = profiles
            .map(function (p) {
                return p.name;
            })
            .filter(function (name) {
                return name;
            });
        res.json({ profiles: names });
    } catch (error) {
        console.error("[users] GET /api/profiles error:", error.message);
        res.json({ profiles: [] });
    }
});

/*
|--------------------------------------------------------------------------
| GET /api/stats
|--------------------------------------------------------------------------
| Dashboard statistics from the SQL customer table + router.
*/

router.get("/stats", async (req, res) => {
    const stats = {
        dbConfigured: db.dbConfigured,
        mikrotikConnected: mikrotik.isConnected(),
        total: 0,
        active: 0,
        expired: 0,
        suspended: 0,
        disabled: 0,
        expiring: 0,
        expiringToday: 0,
        expiring7d: 0,
        online: 0,
    };

    if (db.dbConfigured) {
        try {
            const totalRows = await db.query("SELECT COUNT(*) AS c FROM `mikrotik_users`", []);
            stats.total = Number(totalRows[0].c) || 0;

            const statusRows = await db.query(
                "SELECT `status`, COUNT(*) AS c FROM `mikrotik_users` GROUP BY `status`",
                []
            );
            const byStatus = {};
            for (const r of statusRows) {
                byStatus[r.status] = Number(r.c) || 0;
            }
            stats.active = byStatus.active || 0;
            stats.expired = byStatus.expired || 0;
            stats.suspended = byStatus.suspended || 0;

            // Rows whose expiry has passed but that have not been swept yet
            const lateRows = await db.query(
                "SELECT COUNT(*) AS c FROM `mikrotik_users` WHERE `status` != 'expired' AND `expiry_date` IS NOT NULL AND `expiry_date` < CURDATE()",
                []
            );
            stats.expired += Number(lateRows[0].c) || 0;

            const expiringRows = await db.query(
                "SELECT COUNT(*) AS c FROM `mikrotik_users` WHERE `expiry_date` IS NOT NULL AND `expiry_date` >= CURDATE() AND `expiry_date` <= DATE_ADD(CURDATE(), INTERVAL 3 DAY) AND `status` NOT IN ('expired', 'suspended')",
                []
            );
            stats.expiring = Number(expiringRows[0].c) || 0;

            const todayRows = await db.query(
                "SELECT COUNT(*) AS c FROM `mikrotik_users` WHERE `expiry_date` = CURDATE()",
                []
            );
            stats.expiringToday = Number(todayRows[0].c) || 0;

            const weekRows = await db.query(
                "SELECT COUNT(*) AS c FROM `mikrotik_users` WHERE `expiry_date` IS NOT NULL AND `expiry_date` >= CURDATE() AND `expiry_date` <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND `status` NOT IN ('expired', 'suspended')",
                []
            );
            stats.expiring7d = Number(weekRows[0].c) || 0;
        } catch (error) {
            console.error("[users] stats error:", error.message);
        }
    }

    if (mikrotik.isConnected()) {
        try {
            const [active, secrets] = await Promise.all([
                mikrotik.getPppActive(),
                mikrotik.getPppSecrets(),
            ]);
            stats.online = active.length;
            const disabledSecrets = secrets.filter(s => s.disabled === true).length;
            stats.disabled = disabledSecrets;

            // If SQL had 0 records or is not configured, fall back to router secret counts
            if (stats.total === 0 && secrets.length > 0) {
                stats.total = secrets.length;
                stats.active = secrets.length - disabledSecrets;
                stats.expired = disabledSecrets;
            }
        } catch (error) {
            // Router unreachable -> keep 0
        }
    }

    res.json({
        success: true,
        stats: stats,
        ...stats,
    });
});

/*
|--------------------------------------------------------------------------
| POST /api/expiry/run
|--------------------------------------------------------------------------
| Manual trigger of the expiry sweep (also used by the scheduler and the
| standalone `npm run expire` command).
*/

router.post("/expiry/run", async (req, res) => {
    try {
        const summary = await runExpiryCheck();
        res.json({ success: true, summary: summary });
    } catch (error) {
        console.error("[users] expiry run error:", error.message);
        res.status(500).json({ success: false, error: "Expiry check failed: " + error.message });
    }
});

/*
|--------------------------------------------------------------------------
| Expiry sweep
|--------------------------------------------------------------------------
| Finds active customers whose expiry_date has passed, disables their PPP
| secret on the router and marks them expired in the database.  Safe to
| run repeatedly: already-expired customers are never touched again.
*/

async function runExpiryCheck() {
    if (!db.dbConfigured) {
        return { skipped: true, reason: "database-not-configured" };
    }

    const rows = await db.query(
        "SELECT `id`, `username`, `status` FROM `mikrotik_users` " +
        "WHERE `status` = 'active' AND `expiry_date` IS NOT NULL AND `expiry_date` < CURDATE()",
        []
    );

    const summary = {
        checked: rows.length,
        markedExpired: 0,
        keptActive: 0,
        failed: 0,
        failures: [],
    };

    for (const row of rows) {
        try {
            // Per policy: NEVER disable or disconnect customer when their package expires!
            // Their internet stays active and undisabled so their work/daily routine is not disrupted.
            // Only update database status to 'expired' so daily reminders and Khata tracking work.
            await db.query("UPDATE `mikrotik_users` SET `status` = 'expired' WHERE `id` = ?", [row.id]);
            await logAudit("customer expired", row.username, "automatic expiry sweep (kept active & undisabled per policy)");
            summary.markedExpired++;
            summary.keptActive++;
        } catch (error) {
            summary.failed++;
            summary.failures.push(row.username + ": " + (error.message || "unknown error"));
            await logAudit("expiry sync failed", row.username, error.message || "unknown error");
        }
    }

    // Trigger WhatsApp notification sweep (before expiry & expired daily reminders with sweet Roman Urdu variations)
    try {
        summary.whatsapp = await whatsapp.checkAndSendExpiryReminders();
    } catch (waError) {
        console.error("[users] whatsapp expiry sweep failed:", waError.message);
        summary.whatsapp = { error: waError.message };
    }

    return summary;
}

/*
|--------------------------------------------------------------------------
| POST /api/import
|--------------------------------------------------------------------------
| Imports all PPP secrets from the router into the customer table.
|   - New usernames      -> inserted (status from secret state)
|   - Existing usernames -> only mikrotik_id / profile refreshed, all
|                           admin-managed fields are left untouched
| Passwords are intentionally NOT pulled from the router.
*/

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function parseRouterOSDate(value) {
    if (!value) {
        return null;
    }
    const str = String(value).trim();

    // RouterOS format: "jan/01/2027 00:00:00"
    const m = str.match(/^(\w{3})\/(\d{1,2})\/(\d{4})/);
    if (m) {
        const month = MONTH_NAMES.indexOf(m[1].toLowerCase());
        if (month === -1) {
            return null;
        }
        // RouterOS represents "no expiration" as jan/01/1970
        if (Number(m[3]) <= 1970) {
            return null;
        }
        return dates.formatDate(new Date(Number(m[3]), month, Number(m[2])));
    }

    // ISO format: "2027-01-01"
    return dates.formatDate(str);
}

const SPEED_PRICES = {
    "2": 800,
    "4": 1000,
    "5": 1200,
    "6": 1500,
    "8": 2000,
    "10": 2500,
    "12": 2800,
    "13": 3000,
    "15": 3500,
    "20": 4000,
    "25": 4500,
    "30": 5500,
    "35": 6000,
    "40": 7000,
    "50": 8000,
};

function suggestPrice(profileName) {
    if (!profileName) return null;
    const match = String(profileName).match(/(\d+(?:\.\d+)?)\s*mb/i);
    if (!match) return null;
    const speed = String(Math.round(Number(match[1])));
    return SPEED_PRICES[speed] !== undefined ? SPEED_PRICES[speed] : null;
}

async function handleSyncAndImport(req, res) {
    if (!db.dbConfigured) {
        return res.status(503).json({ success: false, error: "Database not configured" });
    }

    try {
        const secrets = await mikrotik.getPppSecrets();

        const existingRows = await db.query("SELECT * FROM `mikrotik_users`", []);
        const existingByUsername = new Map();
        for (const row of existingRows) {
            existingByUsername.set(row.username, row);
        }

        const summary = {
            total: secrets.length,
            inserted: 0,
            updated: 0,
            errors: 0,
        };

        const todayStr = dates.formatDate(dates.today());
        const defaultExpiryDate = dates.formatDate(dates.addMonths(dates.today(), 1));

        for (const secret of secrets) {
            const username = secret.name;
            if (!username) {
                summary.errors++;
                continue;
            }

            const profile = secret.profile || "default";
            const suggestedPrice = suggestPrice(profile) || null;
            const parsedExpiry = parseRouterOSDate(secret.expiration);
            const expiryDate = parsedExpiry || defaultExpiryDate;
            const status = secret.disabled === true ? "suspended" : (dates.remainingDays(expiryDate) < 0 ? "expired" : "active");
            const comment = secret.comment || "";
            const password = secret.password || "";
            const mikrotikId = secret.id ? String(secret.id) : "";

            const existing = existingByUsername.get(username);

            try {
                if (existing) {
                    const newPrice = (existing.price !== null && existing.price !== undefined && Number(existing.price) > 0)
                        ? existing.price
                        : suggestedPrice;
                    const newPackage = existing.package || profile;
                    const newPassword = password || existing.password || "";
                    const newStatus = (existing.status === "suspended" || secret.disabled === true) ? "suspended" : existing.status;

                    await db.query(
                        "UPDATE `mikrotik_users` SET " +
                        "`mikrotik_id` = ?, `profile` = ?, `package` = ?, `price` = ?, `password` = ?, `status` = ? " +
                        "WHERE `id` = ?",
                        [mikrotikId, profile, newPackage, newPrice, newPassword, newStatus, existing.id]
                    );
                    summary.updated++;
                } else {
                    await db.query(
                        "INSERT INTO `mikrotik_users` " +
                        "(`username`, `name`, `password`, `mikrotik_id`, `profile`, `package`, `price`, `start_date`, `expiry_date`, `status`, `comment`) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        [
                            username,
                            username,
                            password,
                            mikrotikId,
                            profile,
                            profile,
                            suggestedPrice,
                            todayStr,
                            expiryDate,
                            status,
                            comment,
                        ]
                    );
                    summary.inserted++;
                    existingByUsername.set(username, { id: true });
                }
            } catch (error) {
                summary.errors++;
                console.error("[users] sync row failed for " + username + ":", error.message);
            }
        }

        await logAudit("customers synced from router", null, JSON.stringify(summary));

        res.json({
            success: true,
            summary: summary,
            total: summary.total,
            inserted: summary.inserted,
            updated: summary.updated,
            errors: summary.errors,
        });
    } catch (error) {
        console.error("[users] sync error:", error.message);
        res.status(500).json({ success: false, error: "Auto Sync failed: " + error.message });
    }
}

router.post("/sync", handleSyncAndImport);
router.post("/users/sync", handleSyncAndImport);
router.post("/import", handleSyncAndImport);
router.post("/users/import", handleSyncAndImport);

/*
|--------------------------------------------------------------------------
| Pages
|--------------------------------------------------------------------------
*/

module.exports = router;
module.exports.renderUsersPage = renderUsersPage;
module.exports.runExpiryCheck = runExpiryCheck;