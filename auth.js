require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });
const crypto = require("crypto");
const db = require("./db");

/*
|--------------------------------------------------------------------------
| Admin Authentication & Session Management
|--------------------------------------------------------------------------
| Passwords are saved and verified in plain text as requested.
|--------------------------------------------------------------------------
*/

const SESSIONS = new Map();
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function parseCookies(req) {
    const list = {};
    const cookieHeader = req.headers && req.headers.cookie;
    if (!cookieHeader) return list;

    cookieHeader.split(";").forEach(function (cookie) {
        const parts = cookie.split("=");
        if (parts.length >= 2) {
            list[parts.shift().trim()] = decodeURIComponent(parts.join("=").trim());
        }
    });
    return list;
}

function createSession(user) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + SESSION_TTL_MS;
    SESSIONS.set(token, {
        user: {
            id: user.id || null,
            username: user.username,
            name: user.name || user.username,
        },
        expiresAt: expiresAt,
    });
    return token;
}

function getSession(token) {
    if (!token || !SESSIONS.has(token)) {
        return null;
    }
    const session = SESSIONS.get(token);
    if (Date.now() > session.expiresAt) {
        SESSIONS.delete(token);
        return null;
    }
    return session;
}

function destroySession(token) {
    if (token) {
        SESSIONS.delete(token);
    }
}

async function verifyCredentials(username, password) {
    if (!username || typeof username !== "string" || !password || typeof password !== "string") {
        return null;
    }

    const trimmedUser = username.trim();

    // 1. Check database admin_users table (plain text comparison)
    if (db.dbConfigured) {
        try {
            const rows = await db.query(
                "SELECT `id`, `username`, `password`, `name` FROM `admin_users` WHERE `username` = ?",
                [trimmedUser]
            );

            if (rows.length > 0) {
                const admin = rows[0];
                if (admin.password === password) {
                    return {
                        id: admin.id,
                        username: admin.username,
                        name: admin.name || admin.username,
                    };
                }
            }
        } catch (e) {
            console.error("[auth] SQL query error:", e.message);
        }
    }

    // 2. Fallback to .env ADMIN_USER / ADMIN_PASSWORD
    const envUser = process.env.ADMIN_USER || "admin";
    const envPass = process.env.ADMIN_PASSWORD || "admin123";
    if (trimmedUser.toLowerCase() === envUser.toLowerCase() && password === envPass) {
        return {
            id: 0,
            username: envUser,
            name: "Administrator (Env)",
        };
    }

    return null;
}

/**
 * Express middleware to protect routes
 */
function requireAuth(req, res, next) {
    // Exclude public assets and login routes
    const path = req.path;
    if (
        path === "/login" ||
        path === "/api/login" ||
        path === "/favicon.ico" ||
        path.startsWith("/.well-known")
    ) {
        return next();
    }

    const cookies = parseCookies(req);
    const token = cookies.panel_session;
    const session = getSession(token);

    if (session) {
        req.user = session.user;
        return next();
    }

    // Unauthenticated
    const isApi = path.startsWith("/api/");
    if (isApi) {
        return res.status(401).json({
            success: false,
            error: "Authentication required",
            code: "UNAUTHORIZED",
        });
    }

    // Redirect browser to login
    return res.redirect("/login?redirect=" + encodeURIComponent(req.originalUrl || "/"));
}

/**
 * Render the HTML for the login page
 */
function renderLoginPage(errorMessage = "") {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <meta name="theme-color" content="#080c15">
    <title>Sign In – MikroTik Panel</title>
    <style>
        :root {
            --bg-main: #080c15;
            --bg-card: #111a2e;
            --bg-input: #0a1120;
            --border: #1e2c47;
            --border-light: rgba(255, 255, 255, 0.08);
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --primary: #2563eb;
            --primary-hover: #3b82f6;
            --primary-glow: rgba(37, 99, 235, 0.35);
            --red: #f43f5e;
            --red-bg: rgba(244, 63, 94, 0.12);
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-tap-highlight-color: transparent;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: radial-gradient(circle at 50% 20%, #16223f 0%, #080c15 70%);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .login-card {
            width: 100%;
            max-width: 410px;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 18px;
            padding: 34px 28px;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
            animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .brand {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: 26px;
            text-align: center;
        }
        .brand-icon {
            width: 52px;
            height: 52px;
            border-radius: 14px;
            background: linear-gradient(135deg, #2563eb, #7c3aed);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 22px;
            color: #fff;
            box-shadow: 0 8px 24px var(--primary-glow);
            margin-bottom: 12px;
        }
        .brand-title {
            font-size: 20px;
            font-weight: 800;
            letter-spacing: -0.02em;
            color: #fff;
        }
        .brand-sub {
            font-size: 13px;
            color: var(--text-muted);
            margin-top: 4px;
        }
        .alert-error {
            background: var(--red-bg);
            border: 1px solid var(--red);
            color: #ff859b;
            padding: 11px 14px;
            border-radius: 10px;
            font-size: 13px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .form-group {
            margin-bottom: 18px;
        }
        .form-group label {
            display: block;
            font-size: 12.5px;
            font-weight: 600;
            color: var(--text-muted);
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        .input-wrap {
            position: relative;
            display: flex;
            align-items: center;
        }
        .input-field {
            width: 100%;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: 10px;
            color: #fff;
            font-size: 14.5px;
            padding: 12px 14px;
            outline: none;
            transition: border-color 0.15s, box-shadow 0.15s;
        }
        .input-field:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px var(--primary-glow);
        }
        .toggle-btn {
            position: absolute;
            right: 12px;
            background: none;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            font-size: 13px;
            padding: 4px;
        }
        .toggle-btn:hover {
            color: #fff;
        }
        .btn-submit {
            width: 100%;
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            color: #fff;
            border: none;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 700;
            padding: 13px;
            cursor: pointer;
            box-shadow: 0 4px 16px var(--primary-glow);
            transition: all 0.15s ease;
            margin-top: 8px;
        }
        .btn-submit:hover {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            transform: translateY(-1px);
        }
        .btn-submit:active {
            transform: translateY(0);
        }
        .login-footer {
            margin-top: 24px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
        }
    </style>
</head>
<body>
    <div class="login-card">
        <div class="brand">
            <div class="brand-icon">MT</div>
            <div class="brand-title">MikroTik Panel</div>
            <div class="brand-sub">Sign in with your admin credentials</div>
        </div>

        ${errorMessage ? `
        <div class="alert-error">
            <span>⚠️</span>
            <span>${errorMessage}</span>
        </div>` : ""}

        <form method="POST" action="/login" id="loginForm">
            <div class="form-group">
                <label for="username">Username</label>
                <div class="input-wrap">
                    <input type="text" id="username" name="username" class="input-field" placeholder="admin" required autofocus autocomplete="username">
                </div>
            </div>

            <div class="form-group">
                <label for="password">Password</label>
                <div class="input-wrap">
                    <input type="password" id="password" name="password" class="input-field" placeholder="••••••••" required autocomplete="current-password">
                    <button type="button" class="toggle-btn" id="togglePass" aria-label="Toggle password visibility">👁️</button>
                </div>
            </div>

            <button type="submit" class="btn-submit" id="submitBtn">Sign In</button>
        </form>

        <div class="login-footer">
            Protected MikroTik ISP Management System
        </div>
    </div>

    <script>
        const passInput = document.getElementById("password");
        const toggleBtn = document.getElementById("togglePass");
        if (toggleBtn && passInput) {
            toggleBtn.addEventListener("click", function() {
                if (passInput.type === "password") {
                    passInput.type = "text";
                    toggleBtn.textContent = "🔒";
                } else {
                    passInput.type = "password";
                    toggleBtn.textContent = "👁️";
                }
            });
        }
    </script>
</body>
</html>`;
}

module.exports = {
    parseCookies,
    createSession,
    getSession,
    destroySession,
    verifyCredentials,
    requireAuth,
    renderLoginPage,
};
