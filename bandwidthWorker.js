require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });
const db = require("./db");

/*
|--------------------------------------------------------------------------
| Bandwidth Tracking Worker & Analytics Engine
|--------------------------------------------------------------------------
| Tracks real-time data consumption (Download MB, Upload MB, Total MB)
| for all PPPoE users throughout the day.
|
| Features:
| 1. High-frequency in-memory delta tracking from RouterOS /interface.
| 2. Zero-overhead batch flushing to MySQL (`user_bandwidth_daily`).
| 3. Seamless handling of user reconnects and router counter resets.
| 4. Real-time up-to-the-second top user leaderboard (today, yesterday, 7d, 30d).
| 5. Peak Mbps and online duration tracking.
|--------------------------------------------------------------------------
*/

// Last raw byte readings per user from RouterOS interface: username -> { rxBytes, txBytes, time }
const lastReadings = new Map();

// Pending unflushed deltas for today: username -> { downloadBytes, uploadBytes, peakRxMbps, peakTxMbps, onlineSeconds, lastSeen }
const pendingDeltas = new Map();

let flushTimer = null;
let isFlushing = false;
const FLUSH_INTERVAL_MS = 15000; // Flush to MySQL every 15s

/**
 * Format bytes into human-readable string (KB, MB, GB, TB)
 */
function formatBytes(bytes, decimals = 2) {
    const num = Number(bytes) || 0;
    if (num <= 0) return "0.00 MB";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
    const i = Math.floor(Math.log(num) / Math.log(k));
    if (i <= 0) return num + " Bytes";
    return parseFloat((num / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Format duration in seconds into human-readable string (e.g. 4h 25m)
 */
function formatDuration(totalSeconds) {
    const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
}

/**
 * Record a live sample from the dashboard update loop
 * @param {Array} interfaces Array of { name, rxByte, txByte, running }
 * @param {Array} activeUsers Array of { name, address, uptime }
 * @param {Map} trafficMap Map of traffic metrics from calculateTraffic
 */
function recordSample(interfaces, activeUsers, trafficMap) {
    if (!Array.isArray(interfaces) || !Array.isArray(activeUsers)) {
        return;
    }

    const now = Date.now();
    // Build a quick lookup for interfaces by name
    const ifaceMap = new Map();
    for (const iface of interfaces) {
        if (iface && iface.name) {
            ifaceMap.set(iface.name, iface);
        }
    }

    for (const user of activeUsers) {
        const username = (user.name || "").trim();
        if (!username) continue;

        // In MikroTik, interface name for PPPoE user is <pppoe-username> or <pppoe-username-1>
        let iface = ifaceMap.get("<pppoe-" + username + ">");
        if (!iface) {
            // Check for reconnection suffix like <pppoe-username-1>
            for (const [name, candidate] of ifaceMap.entries()) {
                if (name.startsWith("<pppoe-" + username + "-") && name.endsWith(">")) {
                    iface = candidate;
                    break;
                }
            }
        }

        if (!iface) continue;

        // In RouterOS:
        // txByte = bytes sent out to customer = Customer Download
        // rxByte = bytes received from customer = Customer Upload
        const currentDownloadBytes = Number(iface.txByte || 0);
        const currentUploadBytes = Number(iface.rxByte || 0);

        // Fetch live Mbps rates if available from trafficMap
        let currentRxMbps = 0;
        let currentTxMbps = 0;
        if (trafficMap && trafficMap.has(iface.name)) {
            const tData = trafficMap.get(iface.name);
            currentRxMbps = Number(tData.rxMbps) || 0;
            currentTxMbps = Number(tData.txMbps) || 0;
        }

        const prev = lastReadings.get(username);

        if (prev) {
            const elapsedSeconds = Math.max(0.1, (now - prev.time) / 1000);

            // Compute delta
            let dlDelta = currentDownloadBytes - prev.txBytes;
            let ulDelta = currentUploadBytes - prev.rxBytes;

            // Handle session reconnect/reset: if counter dropped below previous, start from new reading
            if (dlDelta < 0) dlDelta = currentDownloadBytes;
            if (ulDelta < 0) ulDelta = currentUploadBytes;

            // Sanity check: cap single interval jump at 20GB to prevent anomalous overflows
            const MAX_INTERVAL_JUMP = 20 * 1024 * 1024 * 1024;
            if (dlDelta > MAX_INTERVAL_JUMP) dlDelta = 0;
            if (ulDelta > MAX_INTERVAL_JUMP) ulDelta = 0;

            if (dlDelta > 0 || ulDelta > 0 || elapsedSeconds > 0) {
                let pending = pendingDeltas.get(username);
                if (!pending) {
                    pending = {
                        downloadBytes: 0,
                        uploadBytes: 0,
                        peakRxMbps: 0,
                        peakTxMbps: 0,
                        onlineSeconds: 0,
                        lastSeen: new Date(),
                    };
                    pendingDeltas.set(username, pending);
                }

                pending.downloadBytes += dlDelta;
                pending.uploadBytes += ulDelta;
                pending.onlineSeconds += Math.round(elapsedSeconds);
                pending.lastSeen = new Date();

                // On client interface:
                // txMbps = Download speed
                // rxMbps = Upload speed
                if (currentTxMbps > pending.peakRxMbps) pending.peakRxMbps = currentTxMbps;
                if (currentRxMbps > pending.peakTxMbps) pending.peakTxMbps = currentRxMbps;
            }
        }

        // Save current reading for next interval
        lastReadings.set(username, {
            rxBytes: currentUploadBytes,
            txBytes: currentDownloadBytes,
            time: now,
        });
    }
}

/**
 * Flush accumulated in-memory deltas into MySQL database
 */
async function flushPendingDeltas() {
    if (isFlushing || pendingDeltas.size === 0 || !db.dbConfigured) {
        return;
    }

    isFlushing = true;

    // Snapshot entries to flush and clear buffer
    const entries = Array.from(pendingDeltas.entries());
    pendingDeltas.clear();

    try {
        for (const [username, delta] of entries) {
            if (delta.downloadBytes <= 0 && delta.uploadBytes <= 0 && delta.onlineSeconds <= 0) {
                continue;
            }

            const totalBytes = delta.downloadBytes + delta.uploadBytes;

            await db.query(
                `INSERT INTO \`user_bandwidth_daily\`
                    (\`username\`, \`usage_date\`, \`download_bytes\`, \`upload_bytes\`, \`total_bytes\`, \`peak_rx_mbps\`, \`peak_tx_mbps\`, \`online_seconds\`, \`last_seen\`)
                VALUES
                    (?, CURDATE(), ?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                    \`download_bytes\` = \`download_bytes\` + VALUES(\`download_bytes\`),
                    \`upload_bytes\`   = \`upload_bytes\`   + VALUES(\`upload_bytes\`),
                    \`total_bytes\`    = \`total_bytes\`    + VALUES(\`total_bytes\`),
                    \`peak_rx_mbps\`   = GREATEST(\`peak_rx_mbps\`, VALUES(\`peak_rx_mbps\`)),
                    \`peak_tx_mbps\`   = GREATEST(\`peak_tx_mbps\`, VALUES(\`peak_tx_mbps\`)),
                    \`online_seconds\` = \`online_seconds\` + VALUES(\`online_seconds\`),
                    \`last_seen\`      = NOW()`,
                [
                    username,
                    delta.downloadBytes,
                    delta.uploadBytes,
                    totalBytes,
                    delta.peakRxMbps,
                    delta.peakTxMbps,
                    delta.onlineSeconds,
                ]
            );
        }
    } catch (err) {
        console.error("[bandwidthWorker] flush error:", err.message);
        // Put unwritten entries back into pendingDeltas so data isn't lost
        for (const [username, delta] of entries) {
            const existing = pendingDeltas.get(username);
            if (existing) {
                existing.downloadBytes += delta.downloadBytes;
                existing.uploadBytes += delta.uploadBytes;
                existing.onlineSeconds += delta.onlineSeconds;
                if (delta.peakRxMbps > existing.peakRxMbps) existing.peakRxMbps = delta.peakRxMbps;
                if (delta.peakTxMbps > existing.peakTxMbps) existing.peakTxMbps = delta.peakTxMbps;
            } else {
                pendingDeltas.set(username, delta);
            }
        }
    } finally {
        isFlushing = false;
    }
}

/**
 * Start the background periodic flush timer
 */
function startWorker() {
    if (flushTimer) return;
    flushTimer = setInterval(flushPendingDeltas, FLUSH_INTERVAL_MS);
    console.log(`[bandwidthWorker] Worker started (flush interval: ${FLUSH_INTERVAL_MS / 1000}s)`);
}

/**
 * Stop worker and flush any pending updates
 */
async function stopWorker() {
    if (flushTimer) {
        clearInterval(flushTimer);
        flushTimer = null;
    }
    await flushPendingDeltas();
}

/**
 * Query Top Bandwidth Users with live real-time overlay
 * @param {Object} options { period: 'today'|'yesterday'|'7days'|'30days'|'month'|'YYYY-MM-DD', sort: 'total'|'download'|'upload'|'peak'|'online', limit: 50, search: '' }
 */
async function getTopUsers(options = {}) {
    if (!db.dbConfigured) {
        return { period: options.period || "today", summary: {}, users: [] };
    }

    const period = options.period || "today";
    const sort = options.sort || "total";
    const limit = Math.max(1, Math.min(500, Number(options.limit) || 50));
    const search = (options.search || "").trim();

    // Resolve date clause
    let dateClause = "b.`usage_date` = CURDATE()";
    let isToday = true;

    if (period === "yesterday") {
        dateClause = "b.`usage_date` = DATE_SUB(CURDATE(), INTERVAL 1 DAY)";
        isToday = false;
    } else if (period === "7days") {
        dateClause = "b.`usage_date` >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
        isToday = true; // includes today
    } else if (period === "30days") {
        dateClause = "b.`usage_date` >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
        isToday = true;
    } else if (period === "month") {
        dateClause = "b.`usage_date` >= DATE_FORMAT(CURDATE() ,'%Y-%m-01')";
        isToday = true;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
        dateClause = "b.`usage_date` = ?";
        isToday = (period === new Date().toISOString().split("T")[0]);
    }

    let searchClause = "";
    const params = [];
    if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
        params.push(period);
    }
    if (search) {
        searchClause = " AND (b.`username` LIKE ? OR u.`name` LIKE ? OR u.`phone` LIKE ?)";
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Determine ORDER BY column
    let orderCol = "SUM(b.`total_bytes`) DESC";
    if (sort === "download") orderCol = "SUM(b.`download_bytes`) DESC";
    else if (sort === "upload") orderCol = "SUM(b.`upload_bytes`) DESC";
    else if (sort === "peak") orderCol = "MAX(b.`peak_rx_mbps`) DESC";
    else if (sort === "online") orderCol = "SUM(b.`online_seconds`) DESC";

    const sql = `
        SELECT 
            b.\`username\`,
            u.\`name\`,
            u.\`phone\`,
            u.\`package\`,
            u.\`price\`,
            u.\`status\` AS account_status,
            SUM(b.\`download_bytes\`) AS total_download_bytes,
            SUM(b.\`upload_bytes\`)   AS total_upload_bytes,
            SUM(b.\`total_bytes\`)    AS total_bytes,
            MAX(b.\`peak_rx_mbps\`)   AS max_rx_mbps,
            MAX(b.\`peak_tx_mbps\`)   AS max_tx_mbps,
            SUM(b.\`online_seconds\`) AS total_online_seconds,
            MAX(b.\`last_seen\`)      AS last_seen
        FROM \`user_bandwidth_daily\` b
        LEFT JOIN \`mikrotik_users\` u ON u.\`username\` = b.\`username\`
        WHERE ${dateClause} ${searchClause}
        GROUP BY b.\`username\`, u.\`name\`, u.\`phone\`, u.\`package\`, u.\`price\`, u.\`status\`
        ORDER BY ${orderCol}
        LIMIT ${limit}
    `;

    const rows = await db.query(sql, params);

    // Overlay pending in-memory deltas if looking at today
    const usersMap = new Map();
    for (const r of rows) {
        usersMap.set(r.username, {
            username: r.username,
            name: r.name || r.username,
            phone: r.phone || "",
            package: r.package || "–",
            price: r.price !== null ? Number(r.price) : null,
            account_status: r.account_status || "active",
            download_bytes: Number(r.total_download_bytes || 0),
            upload_bytes: Number(r.total_upload_bytes || 0),
            total_bytes: Number(r.total_bytes || 0),
            peak_rx_mbps: Number(r.max_rx_mbps || 0),
            peak_tx_mbps: Number(r.max_tx_mbps || 0),
            online_seconds: Number(r.total_online_seconds || 0),
            last_seen: r.last_seen,
        });
    }

    if (isToday) {
        for (const [uname, pending] of pendingDeltas.entries()) {
            if (search && !uname.toLowerCase().includes(search.toLowerCase())) {
                continue;
            }
            let userObj = usersMap.get(uname);
            if (!userObj) {
                userObj = {
                    username: uname,
                    name: uname,
                    phone: "",
                    package: "–",
                    price: null,
                    account_status: "active",
                    download_bytes: 0,
                    upload_bytes: 0,
                    total_bytes: 0,
                    peak_rx_mbps: 0,
                    peak_tx_mbps: 0,
                    online_seconds: 0,
                    last_seen: new Date(),
                };
                usersMap.set(uname, userObj);
            }
            userObj.download_bytes += pending.downloadBytes;
            userObj.upload_bytes += pending.uploadBytes;
            userObj.total_bytes = userObj.download_bytes + userObj.upload_bytes;
            userObj.online_seconds += pending.onlineSeconds;
            if (pending.peakRxMbps > userObj.peak_rx_mbps) userObj.peak_rx_mbps = pending.peakRxMbps;
            if (pending.peakTxMbps > userObj.peak_tx_mbps) userObj.peak_tx_mbps = pending.peakTxMbps;
            userObj.last_seen = pending.lastSeen;
        }
    }

    let userList = Array.from(usersMap.values());

    // Sort list according to requested option
    userList.sort(function (a, b) {
        if (sort === "download") return b.download_bytes - a.download_bytes;
        if (sort === "upload") return b.upload_bytes - a.upload_bytes;
        if (sort === "peak") return b.peak_rx_mbps - a.peak_rx_mbps;
        if (sort === "online") return b.online_seconds - a.online_seconds;
        return b.total_bytes - a.total_bytes;
    });

    userList = userList.slice(0, limit);

    // Calculate overall aggregates
    let aggregateTotalBytes = 0;
    let aggregateDownloadBytes = 0;
    let aggregateUploadBytes = 0;

    for (const u of userList) {
        aggregateTotalBytes += u.total_bytes;
        aggregateDownloadBytes += u.download_bytes;
        aggregateUploadBytes += u.upload_bytes;
    }

    // Attach ranks, percentages, and human-readable formats
    const rankedUsers = userList.map(function (u, index) {
        const rank = index + 1;
        let medal = "";
        if (rank === 1) medal = "🥇";
        else if (rank === 2) medal = "🥈";
        else if (rank === 3) medal = "🥉";

        const percentOfTotal = aggregateTotalBytes > 0
            ? Math.round((u.total_bytes / aggregateTotalBytes) * 100)
            : 0;

        return {
            rank: rank,
            medal: medal,
            username: u.username,
            name: u.name,
            phone: u.phone,
            package: u.package,
            price: u.price,
            account_status: u.account_status,
            download_bytes: u.download_bytes,
            download_formatted: formatBytes(u.download_bytes),
            download_mb: Number((u.download_bytes / (1024 * 1024)).toFixed(2)),
            upload_bytes: u.upload_bytes,
            upload_formatted: formatBytes(u.upload_bytes),
            upload_mb: Number((u.upload_bytes / (1024 * 1024)).toFixed(2)),
            total_bytes: u.total_bytes,
            total_formatted: formatBytes(u.total_bytes),
            total_mb: Number((u.total_bytes / (1024 * 1024)).toFixed(2)),
            percent_of_total: percentOfTotal,
            peak_rx_mbps: Number(u.peak_rx_mbps.toFixed(2)),
            peak_tx_mbps: Number(u.peak_tx_mbps.toFixed(2)),
            online_seconds: u.online_seconds,
            online_formatted: formatDuration(u.online_seconds),
            last_seen: u.last_seen,
        };
    });

    const topConsumer = rankedUsers.length > 0 ? rankedUsers[0] : null;
    const avgBytes = rankedUsers.length > 0 ? Math.round(aggregateTotalBytes / rankedUsers.length) : 0;

    return {
        period: period,
        sort: sort,
        count: rankedUsers.length,
        summary: {
            total_bytes: aggregateTotalBytes,
            total_formatted: formatBytes(aggregateTotalBytes),
            total_download_bytes: aggregateDownloadBytes,
            total_download_formatted: formatBytes(aggregateDownloadBytes),
            total_upload_bytes: aggregateUploadBytes,
            total_upload_formatted: formatBytes(aggregateUploadBytes),
            avg_bytes_per_user: avgBytes,
            avg_formatted: formatBytes(avgBytes),
            top_consumer: topConsumer
                ? {
                    username: topConsumer.username,
                    name: topConsumer.name,
                    package: topConsumer.package,
                    total_formatted: topConsumer.total_formatted,
                    total_mb: topConsumer.total_mb,
                }
                : null,
        },
        users: rankedUsers,
    };
}

/**
 * Get daily history for a single user over the past N days
 */
async function getUserUsageHistory(username, days = 14) {
    if (!db.dbConfigured || !username) {
        return [];
    }

    const rows = await db.query(
        `SELECT 
            \`usage_date\`,
            \`download_bytes\`,
            \`upload_bytes\`,
            \`total_bytes\`,
            \`peak_rx_mbps\`,
            \`peak_tx_mbps\`,
            \`online_seconds\`
        FROM \`user_bandwidth_daily\`
        WHERE \`username\` = ? AND \`usage_date\` >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        ORDER BY \`usage_date\` DESC`,
        [username, days]
    );

    return rows.map(r => ({
        date: r.usage_date instanceof Date ? r.usage_date.toISOString().split("T")[0] : String(r.usage_date),
        download_bytes: Number(r.download_bytes || 0),
        download_formatted: formatBytes(r.download_bytes),
        upload_bytes: Number(r.upload_bytes || 0),
        upload_formatted: formatBytes(r.upload_bytes),
        total_bytes: Number(r.total_bytes || 0),
        total_formatted: formatBytes(r.total_bytes),
        peak_rx_mbps: Number(r.peak_rx_mbps || 0),
        peak_tx_mbps: Number(r.peak_tx_mbps || 0),
        online_seconds: Number(r.online_seconds || 0),
        online_formatted: formatDuration(r.online_seconds),
    }));
}

module.exports = {
    recordSample,
    flushPendingDeltas,
    startWorker,
    stopWorker,
    getTopUsers,
    getUserUsageHistory,
    formatBytes,
    formatDuration,
};
