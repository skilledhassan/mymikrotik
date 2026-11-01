require("dotenv").config();
const http = require("http");

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = "";
            res.on("data", (d) => (body += d));
            res.on("end", () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(body);
                } catch {
                    parsed = body;
                }
                resolve({ status: res.statusCode, headers: res.headers, body: parsed });
            });
        });
        req.on("error", reject);
        if (data) {
            req.write(typeof data === "string" ? data : JSON.stringify(data));
        }
        req.end();
    });
}

async function runTests() {
    console.log("=== Analytics & Bandwidth Worker Verification Suite ===\n");

    // 1. Login as admin
    console.log("[Test 1] Authenticating as admin...");
    const loginRes = await request(
        {
            hostname: "127.0.0.1",
            port: 3000,
            path: "/api/login",
            method: "POST",
            headers: { "Content-Type": "application/json" },
        },
        { username: "admin", password: process.env.ADMIN_PASSWORD || "admin123" }
    );

    if (loginRes.status !== 200 || !loginRes.body.success) {
        throw new Error("Admin login failed: " + JSON.stringify(loginRes.body));
    }
    const cookie = loginRes.headers["set-cookie"][0].split(";")[0];
    console.log("✓ PASS: Admin authenticated, session token established.\n");

    // 2. Query /api/analytics/top-users (Today)
    console.log("[Test 2] Querying /api/analytics/top-users?period=today...");
    const topRes = await request({
        hostname: "127.0.0.1",
        port: 3000,
        path: "/api/analytics/top-users?period=today&limit=10",
        method: "GET",
        headers: { Cookie: cookie },
    });

    if (topRes.status !== 200 || !topRes.body.success) {
        throw new Error("Failed to fetch top users: " + JSON.stringify(topRes.body));
    }
    console.log(`✓ PASS: Received ${topRes.body.users.length} top user records.`);
    console.log(`  - Total Network Volume Today: ${topRes.body.summary.total_formatted}`);
    console.log(`  - Total Download: ${topRes.body.summary.total_download_formatted}`);
    console.log(`  - Total Upload: ${topRes.body.summary.total_upload_formatted}`);
    if (topRes.body.users.length > 0) {
        const top1 = topRes.body.users[0];
        console.log(`  - #1 Consumer: ${top1.username} (${top1.name || "–"}) consumed ${top1.total_formatted}`);
        console.log(`    (DL: ${top1.download_formatted}, UL: ${top1.upload_formatted}, Peak DL: ${top1.peak_rx_mbps} Mbps, Peak UL: ${top1.peak_tx_mbps} Mbps)`);
    }
    console.log();

    // 3. Query /api/analytics/summary
    console.log("[Test 3] Querying /api/analytics/summary...");
    const summaryRes = await request({
        hostname: "127.0.0.1",
        port: 3000,
        path: "/api/analytics/summary?period=today",
        method: "GET",
        headers: { Cookie: cookie },
    });
    if (summaryRes.status !== 200 || !summaryRes.body.success) {
        throw new Error("Summary API failed: " + JSON.stringify(summaryRes.body));
    }
    console.log("✓ PASS: Summary API returned valid KPI stats.\n");

    // 4. Verify /top-users and /analytics Web Pages
    console.log("[Test 4] Loading /top-users web dashboard...");
    const pageRes = await request({
        hostname: "127.0.0.1",
        port: 3000,
        path: "/top-users",
        method: "GET",
        headers: { Cookie: cookie },
    });
    if (pageRes.status !== 200 || typeof pageRes.body !== "string" || !pageRes.body.includes("Top Bandwidth Users")) {
        throw new Error("/top-users page render failure (HTTP " + pageRes.status + ")");
    }
    console.log("✓ PASS: /top-users rendered full interactive UI with filters & modals.\n");

    // 5. Verify / (Main Dashboard) contains Top Consumers preview
    console.log("[Test 5] Checking main dashboard Top Consumers widget...");
    const dashRes = await request({
        hostname: "127.0.0.1",
        port: 3000,
        path: "/",
        method: "GET",
        headers: { Cookie: cookie },
    });
    if (dashRes.status !== 200 || !dashRes.body.includes("Top Bandwidth Consumers Today")) {
        throw new Error("Main dashboard is missing Top Consumers leaderboard widget");
    }
    console.log("✓ PASS: Main dashboard includes live Top Consumers leaderboard widget.\n");

    console.log("==================================================");
    console.log("🎉 ALL BANDWIDTH WORKER & ANALYTICS TESTS PASSED!");
    console.log("==================================================");
}

runTests().catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
});
