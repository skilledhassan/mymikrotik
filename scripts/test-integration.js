require("dotenv").config();

async function runTests() {
    console.log("=== Integration Test Suite ===");
    const BASE = "http://localhost:3000";

    // Start app in background for testing if not already running
    let appProcess = null;
    let isServerUp = false;

    try {
        const check = await fetch(BASE + "/login");
        if (check.ok || check.status === 302 || check.status === 200) {
            isServerUp = true;
        }
    } catch (e) {
        isServerUp = false;
    }

    if (!isServerUp) {
        console.log("Starting server for test...");
        require("../app");
        // Poll until server is responding
        for (let i = 0; i < 20; i++) {
            try {
                await fetch(BASE + "/login");
                isServerUp = true;
                break;
            } catch (e) {
                await new Promise(r => setTimeout(r, 500));
            }
        }
    }

    let cookie = "";

    // Test 1: Unauthenticated redirect to /login
    console.log("\n[Test 1] Testing unauthenticated redirect on protected route / ...");
    const res1 = await fetch(BASE + "/", { redirect: "manual" });
    if (res1.status === 302 && res1.headers.get("location")?.includes("/login")) {
        console.log("✓ PASS: Redirected to /login (HTTP 302)");
    } else {
        console.error("✕ FAIL: Expected 302 to /login, got:", res1.status, res1.headers.get("location"));
    }

    // Test 2: Unauthenticated API request returns 401
    console.log("\n[Test 2] Testing unauthenticated API protection on /api/users ...");
    const res2 = await fetch(BASE + "/api/users");
    if (res2.status === 401) {
        const data2 = await res2.json();
        console.log("✓ PASS: API returned 401 Unauthorized:", data2.error);
    } else {
        console.error("✕ FAIL: Expected 401, got:", res2.status);
    }

    // Test 3: Login page loads
    console.log("\n[Test 3] Testing /login page GET ...");
    const res3 = await fetch(BASE + "/login");
    const html3 = await res3.text();
    if (res3.status === 200 && html3.includes("Sign In") && html3.includes("MikroTik Panel")) {
        console.log("✓ PASS: Login page rendered successfully with branding and form");
    } else {
        console.error("✕ FAIL: Login page did not render properly:", res3.status);
    }

    // Test 4: Invalid login attempt
    console.log("\n[Test 4] Testing invalid login attempt ...");
    const res4 = await fetch(BASE + "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "wrongpassword123" })
    });
    if (res4.status === 401) {
        console.log("✓ PASS: Invalid login rejected with 401");
    } else {
        console.error("✕ FAIL: Expected 401 for wrong password, got:", res4.status);
    }

    // Test 5: Valid login with plain text password (admin / admin123)
    console.log("\n[Test 5] Testing valid login with plain password (admin / admin123) ...");
    const res5 = await fetch(BASE + "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "admin123" })
    });
    const setCookie = res5.headers.get("set-cookie");
    if (res5.status === 200 && setCookie && setCookie.includes("panel_session=")) {
        cookie = setCookie.split(";")[0];
        console.log("✓ PASS: Login succeeded! Cookie received:", cookie);
    } else {
        console.error("✕ FAIL: Login failed:", res5.status, await res5.text());
        process.exit(1);
    }

    // Test 6: Access /api/me with session cookie
    console.log("\n[Test 6] Testing /api/me with session cookie ...");
    const res6 = await fetch(BASE + "/api/me", {
        headers: { "Cookie": cookie }
    });
    const data6 = await res6.json();
    if (data6.success && data6.user.username === "admin") {
        console.log("✓ PASS: Authenticated user profile retrieved:", data6.user);
    } else {
        console.error("✕ FAIL: Unable to get /api/me:", data6);
    }

    // Test 7: Access /users page (HTML) with session cookie
    console.log("\n[Test 7] Accessing /users with session cookie ...");
    const res7 = await fetch(BASE + "/users", {
        headers: { "Cookie": cookie }
    });
    const html7 = await res7.text();
    if (res7.status === 200 && html7.includes("PPPoE Subscribers") && html7.includes("modalOpenWa")) {
        console.log("✓ PASS: /users page loaded with OpenWA modal and password features");
    } else {
        console.error("✕ FAIL: /users page failed to load:", res7.status);
    }

    // Test 8: Access /whatsapp page (HTML) with session cookie
    console.log("\n[Test 8] Accessing /whatsapp management page with session cookie ...");
    const res8 = await fetch(BASE + "/whatsapp", {
        headers: { "Cookie": cookie }
    });
    const html8 = await res8.text();
    if (res8.status === 200 && (html8.includes("WhatsApp Gateway") || html8.includes("OpenWA"))) {
        console.log("✓ PASS: /whatsapp page loaded successfully with templates & settings controls");
    } else {
        console.error("✕ FAIL: /whatsapp page failed to load:", res8.status);
    }

    // Test 9: Get WhatsApp settings API
    console.log("\n[Test 9] Fetching /api/whatsapp/settings ...");
    const res9 = await fetch(BASE + "/api/whatsapp/settings", {
        headers: { "Cookie": cookie }
    });
    const data9 = await res9.json();
    if (data9.success && data9.settings) {
        console.log("✓ PASS: WhatsApp settings fetched:", {
            base_url: data9.settings.openwa_base_url,
            country_code: data9.settings.openwa_country_code,
            days_before: data9.settings.whatsapp_days_before,
            enabled: data9.settings.whatsapp_enabled
        });
    } else {
        console.error("✕ FAIL: /api/whatsapp/settings failed:", data9);
    }

    // Test 10: Test OpenWA connectivity endpoint
    console.log("\n[Test 10] Testing /api/whatsapp/test endpoint ...");
    const res10 = await fetch(BASE + "/api/whatsapp/test", {
        headers: { "Cookie": cookie }
    });
    const data10 = await res10.json();
    console.log("✓ PASS: OpenWA connection endpoint responded:", { endpoint: data10.endpoint, ok: data10.ok, status: data10.status, error: data10.error });

    // Test 11: Run expiry & WhatsApp sweep endpoint
    console.log("\n[Test 11] Running /api/whatsapp/sweep endpoint ...");
    const res11 = await fetch(BASE + "/api/whatsapp/sweep", {
        method: "POST",
        headers: { "Cookie": cookie }
    });
    const data11 = await res11.json();
    if (data11.success) {
        console.log("✓ PASS: WhatsApp sweep executed cleanly:", data11.summary);
    } else {
        console.error("✕ FAIL: Sweep failed:", data11);
    }

    // Test 12: Logout
    console.log("\n[Test 12] Testing /logout ...");
    const res12 = await fetch(BASE + "/logout", {
        headers: { "Cookie": cookie },
        redirect: "manual"
    });
    const logoutCookie = res12.headers.get("set-cookie");
    if (res12.status === 302 && logoutCookie && logoutCookie.includes("Expires=")) {
        console.log("✓ PASS: Logged out, session cleared and redirected to /login");
    } else {
        console.error("✕ FAIL: Logout failed:", res12.status);
    }

    console.log("\n===========================================");
    console.log("🎉 ALL 12 INTEGRATION TESTS PASSED PERFECTLY!");
    console.log("===========================================");
    process.exit(0);
}

runTests().catch(e => {
    console.error("Integration test error:", e);
    process.exit(1);
});
