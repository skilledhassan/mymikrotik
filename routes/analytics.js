const express = require("express");
const router = express.Router();
const auth = require("../auth");
const bandwidthWorker = require("../bandwidthWorker");

// All analytics API endpoints require admin session
router.use(auth.requireAuth);

/**
 * GET /api/analytics/top-users
 * Query top bandwidth consumers with customizable date range, sort order, and search filter
 */
router.get("/top-users", async (req, res) => {
    try {
        const { period, sort, limit, search } = req.query;
        const result = await bandwidthWorker.getTopUsers({
            period: period || "today",
            sort: sort || "total",
            limit: limit ? Number(limit) : 50,
            search: search || "",
        });

        // Merge live online session state from global dashboard if available
        if (req.app.locals.dashboard && Array.isArray(req.app.locals.dashboard.users)) {
            const onlineMap = new Map();
            for (const u of req.app.locals.dashboard.users) {
                onlineMap.set(u.name, u);
            }

            for (const user of result.users) {
                const live = onlineMap.get(user.username);
                user.is_online = Boolean(live);
                user.current_rx_mbps = live ? live.rxMbps : 0;
                user.current_tx_mbps = live ? live.txMbps : 0;
                user.current_total_mbps = live ? live.totalMbps : 0;
                user.ip_address = live ? live.address : "–";
                user.caller_id = live ? live.callerId : "–";
            }
        }

        res.json({
            success: true,
            ...result,
        });
    } catch (err) {
        console.error("[analytics] error fetching top users:", err);
        res.status(500).json({
            success: false,
            error: "Failed to retrieve top bandwidth consumers: " + err.message,
        });
    }
});

/**
 * GET /api/analytics/summary
 * High-level usage metrics for the dashboard KPI cards
 */
router.get("/summary", async (req, res) => {
    try {
        const period = req.query.period || "today";
        const result = await bandwidthWorker.getTopUsers({ period, limit: 10 });
        res.json({
            success: true,
            period: period,
            summary: result.summary,
        });
    } catch (err) {
        console.error("[analytics] summary error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/analytics/user/:username
 * Retrieve daily bandwidth history for a specific customer
 */
router.get("/user/:username", async (req, res) => {
    try {
        const username = req.params.username;
        const days = Number(req.query.days) || 14;
        const history = await bandwidthWorker.getUserUsageHistory(username, days);
        res.json({
            success: true,
            username: username,
            history: history,
        });
    } catch (err) {
        console.error("[analytics] user history error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/analytics/flush
 * Trigger manual flush of in-memory deltas into database
 */
router.post("/flush", async (req, res) => {
    try {
        await bandwidthWorker.flushPendingDeltas();
        res.json({ success: true, message: "Deltas flushed to database" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
