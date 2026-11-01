
const express = require("express");

const { client, connect, close, ensureConnected, isConnected, startWatchdog, stopWatchdog, AUTO_DISABLE_EXPIRED } = require("./mikrotik");
const db = require("./db");
const auth = require("./auth");
const usersRouter = require("./routes/users");
const moneyRouter = require("./routes/money");
const whatsappRouter = require("./routes/whatsapp");
const analyticsRouter = require("./routes/analytics");
const bandwidthWorker = require("./bandwidthWorker");
const { renderDashboardPage } = require("./views/dashboardPage");
const { renderMoneyPage } = require("./views/moneyPage");
const { renderQueuesPage } = require("./views/queuesPage");
const { renderAnalyticsPage } = require("./views/analyticsPage");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.locals.dashboard = null;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/*
|--------------------------------------------------------------------------
| CORS / Referrer Policy
|--------------------------------------------------------------------------
*/
app.use(function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }
    next();
});

/*
|--------------------------------------------------------------------------
| Dashboard State & MikroTik Metrics
|--------------------------------------------------------------------------
*/
let previousInterfaces = new Map();

let dashboard = {
    connected: false,
    vlan102: {
        rxMbps: 0,
        txMbps: 0,
        totalMbps: 0
    },
    users: [],
    ethernet: [],
    other: [],
    updated: null
};

async function getInterfaces() {
    const api = client.api();
    return await api
        .menu("/interface")
        .select(["name", "type", "running", "rx-byte", "tx-byte"])
        .get();
}

async function getActiveUsers() {
    const api = client.api();
    return await api
        .menu("/ppp/active")
        .select(["name", "service", "address", "caller-id", "uptime"])
        .get();
}

function calculateTraffic(interfaces) {
    const now = Date.now();
    const traffic = new Map();

    for (const iface of interfaces) {
        const name = iface.name || "";
        const rxBytes = Number(iface.rxByte || 0);
        const txBytes = Number(iface.txByte || 0);
        const previous = previousInterfaces.get(name);

        let rxMbps = 0;
        let txMbps = 0;

        if (previous) {
            const seconds = (now - previous.time) / 1000;
            if (seconds > 0) {
                let rxDifference = rxBytes - previous.rxBytes;
                let txDifference = txBytes - previous.txBytes;

                if (rxDifference < 0) rxDifference = 0;
                if (txDifference < 0) txDifference = 0;

                rxMbps = (rxDifference * 8) / seconds / 1000000;
                txMbps = (txDifference * 8) / seconds / 1000000;
            }
        }

        previousInterfaces.set(name, {
            rxBytes: rxBytes,
            txBytes: txBytes,
            time: now
        });

        traffic.set(name, {
            name: name,
            type: iface.type || "",
            running: Boolean(iface.running),
            rxMbps: rxMbps,
            txMbps: txMbps
        });
    }

    return traffic;
}

let dashboardUpdating = false;

async function updateDashboard() {
    if (dashboardUpdating) return;
    dashboardUpdating = true;

    try {
        const connected = await ensureConnected();
        if (!connected) {
            dashboard.connected = false;
            dashboard.updated = null;
            return;
        }

        const results = await Promise.race([
            Promise.all([
                getInterfaces(),
                getActiveUsers()
            ]),
            new Promise(function (_, reject) {
                setTimeout(function () {
                    reject(new Error("RouterOS command timed out"));
                }, 15000);
            })
        ]);

        const interfaces = results[0];
        const activeUsers = results[1];
        const traffic = calculateTraffic(interfaces);

        // Feed live metrics to continuous daily bandwidth tracker
        bandwidthWorker.recordSample(interfaces, activeUsers, traffic);

        // VLAN 102
        const vlan102 = traffic.get("vlan102");
        if (vlan102) {
            dashboard.vlan102 = {
                rxMbps: Number(vlan102.rxMbps.toFixed(2)),
                txMbps: Number(vlan102.txMbps.toFixed(2)),
                totalMbps: Number((vlan102.rxMbps + vlan102.txMbps).toFixed(2))
            };
        } else {
            dashboard.vlan102 = { rxMbps: 0, txMbps: 0, totalMbps: 0 };
        }

        // PPPoE Users
        const users = [];
        for (const user of activeUsers) {
            const username = user.name || "";
            const interfaceName = "<pppoe-" + username + ">";
            const iface = traffic.get(interfaceName);

            users.push({
                name: username,
                address: user.address || "",
                uptime: user.uptime || "",
                callerId: user.callerId || "",
                running: iface ? iface.running : true,
                rxMbps: iface ? Number(iface.rxMbps.toFixed(2)) : 0,
                txMbps: iface ? Number(iface.txMbps.toFixed(2)) : 0,
                totalMbps: iface ? Number((iface.rxMbps + iface.txMbps).toFixed(2)) : 0
            });
        }

        users.sort(function (a, b) {
            return (Number(b.totalMbps) || 0) - (Number(a.totalMbps) || 0);
        });
        dashboard.users = users;

        // Ethernet
        dashboard.ethernet = interfaces
            .filter(function (iface) { return iface.type === "ether"; })
            .map(function (iface) {
                const data = traffic.get(iface.name);
                return {
                    name: iface.name,
                    running: Boolean(iface.running),
                    rxMbps: data ? Number(data.rxMbps.toFixed(2)) : 0,
                    txMbps: data ? Number(data.txMbps.toFixed(2)) : 0,
                    totalMbps: data ? Number((data.rxMbps + data.txMbps).toFixed(2)) : 0
                };
            });

        // Other Interfaces
        const userInterfaceNames = new Set(
            activeUsers.map(function (u) { return "<pppoe-" + u.name + ">"; })
        );

        dashboard.other = interfaces
            .filter(function (iface) {
                const name = iface.name || "";
                if (iface.type === "ether") return false;
                if (name.startsWith("<pppoe-") && name.endsWith(">")) return false;
                if (userInterfaceNames.has(name)) return false;
                return true;
            })
            .map(function (iface) {
                const data = traffic.get(iface.name);
                return {
                    name: iface.name,
                    type: iface.type || "",
                    running: Boolean(iface.running),
                    rxMbps: data ? Number(data.rxMbps.toFixed(2)) : 0,
                    txMbps: data ? Number(data.txMbps.toFixed(2)) : 0,
                    totalMbps: data ? Number((data.rxMbps + data.txMbps).toFixed(2)) : 0
                };
            });

        dashboard.connected = true;
        dashboard.updated = new Date().toLocaleTimeString();
        app.locals.dashboard = dashboard;

    } catch (error) {
        console.error("Dashboard update error:", error.message || error);
        dashboard.connected = false;
    } finally {
        dashboardUpdating = false;
    }
}

/*
|--------------------------------------------------------------------------
| Authentication Routes (Public)
|--------------------------------------------------------------------------
*/

// GET /login
app.get("/login", function (req, res) {
    const cookies = auth.parseCookies(req);
    const session = auth.getSession(cookies.panel_session);
    if (session) {
        return res.redirect("/");
    }
    res.send(auth.renderLoginPage());
});

// POST /login (form submit)
app.post("/login", async function (req, res) {
    const { username, password } = req.body || {};
    const user = await auth.verifyCredentials(username, password);

    if (user) {
        const token = auth.createSession(user);
        res.setHeader(
            "Set-Cookie",
            `panel_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`
        );
        const redirectUrl = (req.query && req.query.redirect) || "/";
        return res.redirect(redirectUrl);
    }

    res.send(auth.renderLoginPage("Invalid username or password"));
});

// POST /api/login (JSON API)
app.post("/api/login", async function (req, res) {
    const { username, password } = req.body || {};
    const user = await auth.verifyCredentials(username, password);

    if (user) {
        const token = auth.createSession(user);
        res.setHeader(
            "Set-Cookie",
            `panel_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`
        );
        return res.json({ success: true, user: user });
    }

    res.status(401).json({ success: false, error: "Invalid username or password" });
});

// GET /logout & POST /logout
app.all("/logout", function (req, res) {
    const cookies = auth.parseCookies(req);
    auth.destroySession(cookies.panel_session);
    res.setHeader(
        "Set-Cookie",
        "panel_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
    );
    res.redirect("/login");
});

/*
|--------------------------------------------------------------------------
| Authentication Guard Middleware
|--------------------------------------------------------------------------
| Protects all subsequent routes: redirects browsers to /login,
| or responds 401 Unauthorized for API requests.
|--------------------------------------------------------------------------
*/
app.use(auth.requireAuth);

// GET /api/me (Current admin session info)
app.get("/api/me", function (req, res) {
    res.json({ success: true, user: req.user });
});

/*
|--------------------------------------------------------------------------
| Protected Web Interface Pages
|--------------------------------------------------------------------------
*/
app.get("/", renderDashboardPage);
app.get("/users", usersRouter.renderUsersPage);
app.get("/queues", renderQueuesPage);
app.get("/booster", renderQueuesPage);
app.get("/money", renderMoneyPage);
app.get("/whatsapp", whatsappRouter.renderWhatsAppPage);
app.get("/top-users", renderAnalyticsPage);
app.get("/analytics", renderAnalyticsPage);

/*
|--------------------------------------------------------------------------
| Protected APIs
|--------------------------------------------------------------------------
*/
app.get("/api/dashboard", function (req, res) {
    res.json(dashboard);
});

// Analytics & Top Bandwidth Users API
app.use("/api/analytics", analyticsRouter);

// WhatsApp API
app.use("/api/whatsapp", whatsappRouter);

// Money / DigiKhata API (operates even if router is offline)
app.use("/api/money", moneyRouter);

// Router connection guard for router-dependent /api routes
app.use("/api", function (req, res, next) {
    if (isConnected()) {
        return next();
    }

    ensureConnected()
        .then(function (ok) {
            if (!ok) {
                return res.status(503).json({
                    success: false,
                    error: "Router offline - reconnecting"
                });
            }
            next();
        })
        .catch(function () {
            res.status(503).json({
                success: false,
                error: "Router offline - reconnecting"
            });
        });
});

// Users / Customers Router
app.use("/api", usersRouter);

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/
async function start() {
    try {
        // Initialize all database schemas (admin_users, whatsapp_logs, whatsapp_settings, money_entries)
        console.log("Checking and initializing database schemas...");
        await db.initAllSchemas();
        console.log("Database tables ready.");

        // Start listening immediately so panel and login are responsive right away
        app.listen(PORT, function () {
            console.log("Panel running at http://localhost:" + PORT);
        });

        // Connect to MikroTik router
        await connect();
        console.log("Connected to MikroTik router");

        // Watchdog
        const watchdogInterval = Number(process.env.WATCHDOG_INTERVAL_MS) || 5000;
        startWatchdog(watchdogInterval);
        console.log("Router watchdog started (every " + (watchdogInterval / 1000) + "s)");

        // Initial dashboard metrics update
        await updateDashboard();
        setInterval(updateDashboard, 1000);

        // Start background daily bandwidth tracking worker
        bandwidthWorker.startWorker();

        // Automatic expiry & WhatsApp notification sweep
        if (AUTO_DISABLE_EXPIRED) {
            const expiryInterval = Number(process.env.EXPIRY_CHECK_INTERVAL_MS) || 60 * 60 * 1000;
            console.log("Expiry sweep enabled, checking every " + (expiryInterval / 60000) + " minutes");

            usersRouter.runExpiryCheck()
                .then(function (summary) {
                    console.log("Initial expiry sweep done:", JSON.stringify(summary));
                })
                .catch(function (error) {
                    console.error("Initial expiry sweep failed:", error.message || error);
                });

            setInterval(function () {
                usersRouter.runExpiryCheck()
                    .then(function (summary) {
                        console.log("Expiry sweep done:", JSON.stringify(summary));
                    })
                    .catch(function (error) {
                        console.error("Expiry sweep failed:", error.message || error);
                    });
            }, expiryInterval);
        }

    } catch (error) {
        console.error("Server startup error:", error.message || error);
        // Start web panel anyway so login and offline management work
        app.listen(PORT, function () {
            console.log("Panel running (Router offline) at http://localhost:" + PORT);
        });
    }
}

/*
|--------------------------------------------------------------------------
| Safety Nets & Graceful Shutdown
|--------------------------------------------------------------------------
*/
process.on("uncaughtException", function (error) {
    console.error("Uncaught exception (panel keeps running):", error.message || error);
});

process.on("unhandledRejection", function (reason) {
    console.error("Unhandled rejection (panel keeps running):", reason && reason.message ? reason.message : reason);
});

process.on("SIGINT", async function () {
    console.log("\nClosing MikroTik connection & flushing bandwidth stats...");
    try {
        await bandwidthWorker.stopWorker();
        stopWatchdog();
        await close();
    } catch (error) {}
    process.exit(0);
});

start();