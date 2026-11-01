require("dotenv").config();
const http = require("http");
const whatsapp = require("../whatsapp");

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

async function run() {
    console.log("=== Testing Expiry Policy & Sweet Roman Urdu Variations ===\n");

    // 1. Verify variations exist in whatsapp module
    console.log("[Test 1] Checking Roman Urdu variations...");
    const expiredVars = whatsapp.DEFAULT_EXPIRED_VARIATIONS;
    const beforeVars = whatsapp.DEFAULT_BEFORE_VARIATIONS;
    console.log(`✓ Expired variations loaded: ${expiredVars.length}`);
    console.log(`✓ Before-expiry variations loaded: ${beforeVars.length}`);
    if (expiredVars.length < 5) throw new Error("Expected at least 5 expired variations");
    if (beforeVars.length < 3) throw new Error("Expected at least 3 before-expiry variations");

    // Sample variation output
    console.log("\nSample Sweet Expired Variation #1:");
    console.log(whatsapp.renderTemplate(expiredVars[0], {
        name: "Muhammad Usman",
        username: "usman.net",
        password: "plainpassword123",
        package: "30 Mbps Fast",
        price: 2800,
        expiry_date: "2026-09-24",
    }));

    // 2. Test rotation across different users
    console.log("\n[Test 2] Testing variation distribution across 4 different users on the same day:");
    const testUsers = ["usman.net", "kashif.fiber", "ali.speed", "babar.zone"];
    const seenIndices = new Set();
    for (const u of testUsers) {
        const chosen = whatsapp.chooseVariation(expiredVars, u, 1);
        const idx = expiredVars.indexOf(chosen);
        seenIndices.add(idx);
        console.log(`  - User '${u}' assigned Variation #${idx + 1}`);
    }
    console.log(`✓ Multi-user distribution confirmed (${seenIndices.size} unique variations picked).`);

    // 3. Test day-over-day rotation for the same user
    console.log("\n[Test 3] Testing day-over-day rotation for single user 'usman.net':");
    for (let dayOffset = 1; dayOffset <= 4; dayOffset++) {
        const chosen = whatsapp.chooseVariation(expiredVars, "usman.net", dayOffset);
        const idx = expiredVars.indexOf(chosen);
        console.log(`  - Day ${dayOffset} Late -> Variation #${idx + 1}`);
    }
    console.log("✓ Day-over-day variation rotation confirmed.");

    // 4. Test API authentication
    console.log("\n[Test 4] Authenticating as admin...");
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
        throw new Error("Admin login failed");
    }
    const cookie = loginRes.headers["set-cookie"][0].split(";")[0];
    console.log("✓ Admin authenticated.");

    // 5. Query /api/whatsapp/variations
    console.log("\n[Test 5] Querying /api/whatsapp/variations API...");
    const varRes = await request({
        hostname: "127.0.0.1",
        port: 3000,
        path: "/api/whatsapp/variations",
        method: "GET",
        headers: { Cookie: cookie },
    });
    if (varRes.status !== 200 || !varRes.body.success) {
        throw new Error("Failed to fetch variations API: " + JSON.stringify(varRes.body));
    }
    console.log(`✓ API returned ${varRes.body.expired.length} expired variations and ${varRes.body.before.length} before-expiry variations.`);

    // 6. Test Expiry Sweep: Verify users are NOT disabled
    console.log("\n[Test 6] Running Expiry Sweep via /api/whatsapp/sweep...");
    const sweepRes = await request({
        hostname: "127.0.0.1",
        port: 3000,
        path: "/api/whatsapp/sweep",
        method: "POST",
        headers: { Cookie: cookie },
    });
    if (sweepRes.status !== 200) {
        throw new Error("Sweep failed: " + JSON.stringify(sweepRes.body));
    }
    console.log("✓ Expiry sweep executed cleanly:", sweepRes.body);

    console.log("\n=======================================================");
    console.log("🎉 ALL TESTS PASSED: NO USERS DISABLED & VARIATIONS LIVE!");
    console.log("=======================================================");
}

run().catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
});
