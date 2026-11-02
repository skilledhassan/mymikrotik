/*
|--------------------------------------------------------------------------
| WhatsApp Gateway & Notification Management – Web View
|--------------------------------------------------------------------------
| Powered by OpenWA (https://github.com/rmyndharis/OpenWA)
| Features:
|   - OpenWA Gateway Connection Status & Test
|   - Gateway Configuration (Base URL, API Key, Session ID, Country Code)
|   - Expiry Sweep Notification Settings (Before Expiry & Daily Expired)
|   - Message Template Editor with dynamic tokens:
|       {name}, {username}, {password}, {package}, {price}, {expiry_date}, {days_left}
|   - 1-Click Instant Manual Expiry Sweep
|   - Direct Test Message Sender
|   - Delivery Audit Logs Table
|--------------------------------------------------------------------------
*/

function renderWhatsAppPage(req, res) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#080c15">
<title>WhatsApp Gateway – MikroTik Panel</title>
<style>
:root {
    --bg-main: #080c15;
    --bg-card: #111a2e;
    --bg-card-hover: #16223b;
    --bg-input: #0a1120;
    --border: #1e2c47;
    --border-light: rgba(255, 255, 255, 0.08);
    --text-main: #f8fafc;
    --text-muted: #94a3b8;
    --text-dim: #64748b;
    --primary: #2563eb;
    --primary-hover: #3b82f6;
    --primary-glow: rgba(37, 99, 235, 0.25);
    --green: #10b981;
    --green-bg: rgba(16, 185, 129, 0.14);
    --red: #f43f5e;
    --red-bg: rgba(244, 63, 94, 0.14);
    --amber: #f59e0b;
    --amber-bg: rgba(245, 158, 11, 0.14);
    --blue: #38bdf8;
    --blue-bg: rgba(56, 189, 248, 0.14);
    --purple: #a855f7;
    --purple-bg: rgba(168, 85, 247, 0.14);
    --wa-green: #25d366;
    --wa-dark: #075e54;
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-tap-highlight-color: transparent;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: var(--bg-main);
    color: var(--text-main);
    min-height: 100vh;
    padding: 16px 14px calc(80px + env(safe-area-inset-bottom));
    -webkit-font-smoothing: antialiased;
}

.container {
    max-width: 1400px;
    margin: 0 auto;
}

/* App Bar */
.app-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 16px;
    margin-bottom: 20px;
    border-bottom: 1px solid var(--border-light);
}

.brand {
    display: flex;
    align-items: center;
    gap: 10px;
}

.brand-icon {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: linear-gradient(135deg, #10b981, #059669);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 19px;
    color: #fff;
    box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
}

.brand-title {
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #fff;
}

.brand-sub {
    font-size: 11.5px;
    color: var(--text-muted);
}

.desktop-nav {
    display: none;
    gap: 6px;
    background: rgba(17, 26, 46, 0.8);
    padding: 4px;
    border-radius: 10px;
    border: 1px solid var(--border);
}

.desktop-nav a {
    color: var(--text-muted);
    text-decoration: none;
    padding: 7px 15px;
    border-radius: 8px;
    font-size: 13.5px;
    font-weight: 600;
    transition: all 0.15s ease;
}

.desktop-nav a:hover {
    color: #fff;
}

.desktop-nav a.active {
    background: var(--primary);
    color: #fff;
}

.desktop-nav a.logout-btn {
    color: #fda4af;
}

.desktop-nav a.logout-btn:hover {
    background: var(--red-bg);
    color: #fff;
}

@media (min-width: 768px) {
    body {
        padding: 24px 24px 40px;
    }
    .desktop-nav {
        display: flex;
    }
}

/* Mobile Bottom Dock */
.bottom-dock {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: calc(62px + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
    background: rgba(10, 15, 26, 0.94);
    backdrop-filter: blur(16px);
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-around;
    align-items: center;
    z-index: 900;
}

.dock-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    color: var(--text-muted);
    text-decoration: none;
    font-size: 11px;
    font-weight: 600;
    flex: 1;
    height: 100%;
}

.dock-item.active {
    color: var(--wa-green);
}

@media (min-width: 768px) {
    .bottom-dock {
        display: none;
    }
}

/* Page Header */
.page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 22px;
    flex-wrap: wrap;
}

.page-header h1 {
    font-size: 22px;
    font-weight: 800;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 8px;
}

.page-header p {
    font-size: 13px;
    color: var(--text-muted);
    margin-top: 4px;
}

.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 9999px;
    font-size: 12.5px;
    font-weight: 700;
}

.status-badge.online {
    background: var(--green-bg);
    color: #34d399;
    border: 1px solid var(--green);
}

.status-badge.offline {
    background: var(--red-bg);
    color: #fb7185;
    border: 1px solid var(--red);
}

.status-badge.checking {
    background: var(--amber-bg);
    color: #fbbf24;
    border: 1px solid var(--amber);
}

/* Grid layout */
.dashboard-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
}

@media (min-width: 1024px) {
    .dashboard-grid {
        grid-template-columns: 1fr 1fr;
    }
}

.card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 20px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.card-title {
    font-size: 16px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.form-group {
    margin-bottom: 14px;
}

.form-group label {
    display: block;
    font-size: 12px;
    font-weight: 700;
    color: var(--text-muted);
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

.input-field {
    width: 100%;
    background: var(--bg-input);
    border: 1px solid var(--border);
    border-radius: 9px;
    color: #fff;
    font-size: 13.5px;
    padding: 10px 12px;
    outline: none;
    font-family: inherit;
    transition: border-color 0.15s;
}

.input-field:focus {
    border-color: var(--primary);
}

textarea.input-field {
    min-height: 110px;
    resize: vertical;
    font-family: inherit;
    line-height: 1.4;
}

.row-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: #1e293b;
    border: 1px solid var(--border);
    color: #f1f5f9;
    padding: 10px 16px;
    border-radius: 9px;
    font-size: 13.5px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
    text-decoration: none;
}

.btn:hover {
    background: #334155;
    color: #fff;
}

.btn.primary {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    border-color: #2563eb;
    color: #fff;
}

.btn.primary:hover {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.btn.success {
    background: linear-gradient(135deg, #059669, #047857);
    border-color: #059669;
    color: #fff;
}

.btn.success:hover {
    background: linear-gradient(135deg, #10b981, #059669);
}

.btn.sm {
    padding: 6px 10px;
    font-size: 12px;
}

.token-pill {
    display: inline-block;
    background: rgba(37, 99, 235, 0.15);
    border: 1px solid rgba(37, 99, 235, 0.3);
    color: #93c5fd;
    font-family: monospace;
    font-size: 11.5px;
    padding: 2px 7px;
    border-radius: 6px;
    margin: 2px 2px;
    cursor: pointer;
}

.token-pill:hover {
    background: rgba(37, 99, 235, 0.3);
}

.tokens-bar {
    font-size: 12px;
    color: var(--text-dim);
    margin-top: 6px;
    line-height: 1.6;
}

.toggle-switch {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
}

.toggle-switch input {
    width: 20px;
    height: 20px;
    cursor: pointer;
}

/* Logs Table */
.logs-table-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 20px;
    margin-top: 20px;
    overflow-x: auto;
}

table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    text-align: left;
}

th {
    padding: 10px 12px;
    color: var(--text-muted);
    font-weight: 700;
    font-size: 11.5px;
    background: #0c1424;
    border-bottom: 1px solid var(--border);
    text-transform: uppercase;
}

td {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    color: var(--text-main);
    vertical-align: middle;
}

.badge {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
}

.badge.sent { background: var(--green-bg); color: #34d399; border: 1px solid var(--green); }
.badge.failed { background: var(--red-bg); color: #fb7185; border: 1px solid var(--red); }
.badge.blue { background: var(--blue-bg); color: #38bdf8; border: 1px solid var(--blue); }
.badge.purple { background: var(--purple-bg); color: #c084fc; border: 1px solid var(--purple); }
.badge.amber { background: var(--amber-bg); color: #fbbf24; border: 1px solid var(--amber); }

.toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: #111a2e;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px 18px;
    font-size: 13.5px;
    color: #fff;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    display: none;
    z-index: 1000;
}
.toast.show { display: block; animation: fadeIn 0.2s; }
.toast.success { border-color: var(--green); color: #34d399; }
.toast.error { border-color: var(--red); color: #fb7185; }

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
</head>
<body>

<div class="container">
    <!-- Top App Bar -->
    <header class="app-bar">
        <div class="brand">
            <div class="brand-icon">💬</div>
            <div>
                <div class="brand-title">WhatsApp &amp; Notifications</div>
                <div class="brand-sub">Powered by OpenWA Gateway</div>
            </div>
        </div>

        <nav class="desktop-nav">
            <a href="/">📊 Dashboard</a>
            <a href="/users">👥 Customers</a>
            <a href="/queues">⚡ Booster</a>
            <a href="/money">💳 DigiKhata</a>
            <a href="/top-users">🏆 Top Users</a>
            <a href="/whatsapp" class="active">💬 WhatsApp</a>
            <a href="/logout" class="logout-btn" title="Sign out">🚪 Logout</a>
        </nav>
    </header>

    <!-- Page Header -->
    <div class="page-header">
        <div>
            <h1>💬 WhatsApp Gateway &amp; Expiry Bot</h1>
            <p>Automated reminders before expiry and daily alerts for expired subscribers</p>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            <div id="gwStatusPill" class="status-badge checking">⏳ Checking OpenWA...</div>
            <button class="btn success sm" id="btnScanQr">📲 Scan QR Code</button>
            <button class="btn sm" id="btnTestConn">🔄 Test Connection</button>
            <button class="btn primary sm" id="btnRunSweep">🚀 Run Expiry Sweep Now</button>
        </div>
    </div>

    <!-- WhatsApp Remote Control & 24-Hour Schedule Status Banner -->
    <div class="card" style="margin-bottom: 20px; border-left: 4px solid var(--wa-green); background: linear-gradient(180deg, #111a2e 0%, #0d1526 100%);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:14px;">
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:24px;">👑</span>
                <div>
                    <div style="font-size:16px; font-weight:800; color:#fff;">WhatsApp Admin Remote Control &amp; Daily Scheduler</div>
                    <div style="font-size:12.5px; color:var(--text-muted);">
                        Authorized Admin: <strong style="color:#34d399;">03101361647</strong> &bull; Total control active via WhatsApp messages
                    </div>
                </div>
            </div>
            <div style="display:flex; gap:8px;">
                <span class="badge" style="background:rgba(37,211,102,0.15); color:#25d366; border:1px solid #25d366; font-size:12px; padding:6px 10px;">
                    🟢 Bot Engine Active
                </span>
            </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:14px;">
            <!-- 24-Hour Schedule -->
            <div style="background:#0a1120; border:1px solid var(--border); border-radius:10px; padding:12px 14px;">
                <div style="font-size:12px; font-weight:700; color:#38bdf8; text-transform:uppercase; margin-bottom:8px;">
                    ⏰ 24-Hour Automated Message Schedule
                </div>
                <div style="font-size:12.5px; line-height:1.7; color:var(--text-main);">
                    <div>☀️ <strong>08:00 AM</strong> &ndash; Morning Router &amp; Health Briefing</div>
                    <div>📩 <strong>10:00 AM</strong> &ndash; Advance Expiry Reminders to Customers</div>
                    <div>🔍 <strong>02:00 PM</strong> &ndash; Mid-day Network &amp; Health Audit</div>
                    <div>🚨 <strong>06:00 PM</strong> &ndash; Expired Sweep &amp; Overdue Notices</div>
                    <div>🌙 <strong>11:00 PM</strong> &ndash; Night DigiKhata Cashbook Summary</div>
                </div>
            </div>

            <!-- Quick WhatsApp Commands -->
            <div style="background:#0a1120; border:1px solid var(--border); border-radius:10px; padding:12px 14px;">
                <div style="font-size:12px; font-weight:700; color:#a855f7; text-transform:uppercase; margin-bottom:8px;">
                    📱 Live Commands (Send from 03101361647)
                </div>
                <div style="font-size:12px; line-height:1.7; color:var(--text-muted);">
                    <div><code style="color:#25d366; background:#1e293b; padding:1px 5px; border-radius:4px;">!menu</code> All commands</div>
                    <div><code style="color:#25d366; background:#1e293b; padding:1px 5px; border-radius:4px;">!status</code> Router CPU, RAM, uptime</div>
                    <div><code style="color:#25d366; background:#1e293b; padding:1px 5px; border-radius:4px;">!online</code> Active PPPoE sessions</div>
                    <div><code style="color:#25d366; background:#1e293b; padding:1px 5px; border-radius:4px;">!paid &lt;user&gt; &lt;amount&gt;</code> Bill + 30d auto-renew</div>
                    <div><code style="color:#25d366; background:#1e293b; padding:1px 5px; border-radius:4px;">!renew &lt;user&gt; [days]</code> Extend validity</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Main Grid -->
    <div class="dashboard-grid">
        <!-- Gateway Configuration -->
        <div class="card">
            <div class="card-title">
                <span>⚙️ OpenWA Gateway Settings</span>
                <label class="toggle-switch">
                    <input type="checkbox" id="cfgEnabled">
                    <span style="font-size:12.5px;font-weight:600;">Enable Bot</span>
                </label>
            </div>

            <form id="gwForm">
                <div class="form-group">
                    <label>OpenWA Base URL</label>
                    <input type="text" id="cfgBaseUrl" class="input-field" placeholder="http://localhost:2785/api" required>
                    <div style="font-size:11px;color:var(--text-dim);margin-top:4px;">Endpoint of your OpenWA instance (Swagger: /api/docs)</div>
                </div>

                <div class="row-2">
                    <div class="form-group">
                        <label>Session ID / UUID</label>
                        <input type="text" id="cfgSessionId" class="input-field" placeholder="default" required>
                    </div>
                    <div class="form-group">
                        <label>Default Country Code</label>
                        <input type="text" id="cfgCountryCode" class="input-field" placeholder="92" required>
                    </div>
                </div>

                <div class="form-group">
                    <label>OpenWA API Key (X-API-Key)</label>
                    <input type="password" id="cfgApiKey" class="input-field" placeholder="Enter API Key if configured">
                </div>

                <div class="form-group">
                    <label>Days Before Expiry to Send Reminder</label>
                    <input type="number" id="cfgDaysBefore" class="input-field" min="1" max="10" placeholder="2">
                    <div style="font-size:11px;color:var(--text-dim);margin-top:4px;">Active customers will receive a reminder this many days before package expiry.</div>
                </div>

                <button type="submit" class="btn primary" id="btnSaveGw">💾 Save Gateway Settings</button>
            </form>
        </div>

        <!-- Quick Test Message -->
        <div class="card">
            <div class="card-title">
                <span>📲 Instant Message Sender</span>
                <span class="badge blue">Direct OpenWA</span>
            </div>

            <form id="quickMsgForm">
                <div class="form-group">
                    <label>Recipient Phone Number</label>
                    <input type="text" id="testPhone" class="input-field" placeholder="03001234567 or 923001234567" required>
                </div>

                <div class="form-group">
                    <label>Message Text</label>
                    <textarea id="testMsg" class="input-field" placeholder="Type test message here..." required>Test message from MikroTik ISP Panel via OpenWA.</textarea>
                </div>

                <button type="submit" class="btn success" id="btnSendTest">📤 Send WhatsApp Message</button>
            </form>
        </div>

        <!-- Before Expiry Template -->
        <div class="card">
            <div class="card-title">
                <span>⏳ Template: Before Expiry Reminder (Roman Urdu)</span>
                <span class="badge amber">Upcoming</span>
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;line-height:1.4;">
                Polite advance reminder before package expiration. Multiple variations can be separated by <code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;color:#38bdf8;">---</code>.
            </div>

            <form id="templateBeforeForm">
                <div class="form-group">
                    <textarea id="tmplBefore" class="input-field" rows="8" style="font-size:12.5px;line-height:1.45;" required></textarea>
                    <div class="tokens-bar">
                        Click token to insert:
                        <span class="token-pill" onclick="insertToken('tmplBefore', '{name}')">{name}</span>
                        <span class="token-pill" onclick="insertToken('tmplBefore', '{username}')">{username}</span>
                        <span class="token-pill" onclick="insertToken('tmplBefore', '{password}')">{password}</span>
                        <span class="token-pill" onclick="insertToken('tmplBefore', '{package}')">{package}</span>
                        <span class="token-pill" onclick="insertToken('tmplBefore', '{price}')">{price}</span>
                        <span class="token-pill" onclick="insertToken('tmplBefore', '{expiry_date}')">{expiry_date}</span>
                        <span class="token-pill" onclick="insertToken('tmplBefore', '{days_left}')">{days_left}</span>
                        <span class="token-pill" onclick="insertSeparator('tmplBefore')" style="background:rgba(56,189,248,0.2);color:#38bdf8;border-color:rgba(56,189,248,0.4);">➕ Add "---" (New Variation)</span>
                    </div>
                </div>

                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                    <button type="submit" class="btn primary">💾 Save Before-Expiry Variations</button>
                    <button type="button" class="btn sm" onclick="previewVariations('tmplBefore', 'before')">👀 Preview Random Variation</button>
                </div>
            </form>
        </div>

        <!-- Expired Template with Sweet Variations -->
        <div class="card">
            <div class="card-title">
                <span>⚠️ Sweet Late Reminders (Roman Urdu Variations)</span>
                <span class="badge red">Daily Multi-Variations</span>
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;line-height:1.4;">
                💡 <b>Sweet &amp; Polite Roman Urdu</b>: Customer is never disabled on expiry! Instead, warm messages tell them their bill is late without hurting their self-respect.
                Separate different message variations with <code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;color:#38bdf8;">---</code>. The bot automatically rotates variations daily so users do not receive the same message repeatedly.
            </div>

            <form id="templateExpiredForm">
                <div class="form-group">
                    <textarea id="tmplExpired" class="input-field" rows="12" style="font-size:12.5px;line-height:1.45;" required></textarea>
                    <div class="tokens-bar">
                        Click token to insert:
                        <span class="token-pill" onclick="insertToken('tmplExpired', '{name}')">{name}</span>
                        <span class="token-pill" onclick="insertToken('tmplExpired', '{username}')">{username}</span>
                        <span class="token-pill" onclick="insertToken('tmplExpired', '{password}')">{password}</span>
                        <span class="token-pill" onclick="insertToken('tmplExpired', '{package}')">{package}</span>
                        <span class="token-pill" onclick="insertToken('tmplExpired', '{price}')">{price}</span>
                        <span class="token-pill" onclick="insertToken('tmplExpired', '{expiry_date}')">{expiry_date}</span>
                        <span class="token-pill" onclick="insertSeparator('tmplExpired')" style="background:rgba(56,189,248,0.2);color:#38bdf8;border-color:rgba(56,189,248,0.4);">➕ Add "---" (New Variation)</span>
                    </div>
                </div>

                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                    <button type="submit" class="btn primary">💾 Save Expired Variations</button>
                    <button type="button" class="btn sm" onclick="previewVariations('tmplExpired', 'expired')">👀 Preview Random Variation</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Logs Table -->
    <div class="logs-table-card">
        <div class="card-title">
            <span>📜 Recent Delivery Audit Logs</span>
            <button class="btn sm" onclick="loadLogs()">🔄 Refresh Logs</button>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Date / Time</th>
                    <th>Username</th>
                    <th>Phone</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Message</th>
                    <th>Details</th>
                </tr>
            </thead>
            <tbody id="logsBody">
                <tr><td colspan="7" style="text-align:center;color:var(--text-dim);">Loading logs...</td></tr>
            </tbody>
        </table>
    </div>

</div>

<!-- Mobile Bottom Dock -->
<div class="bottom-dock">
    <a href="/" class="dock-item">
        <span style="font-size:18px;">📊</span>
        <span>Dashboard</span>
    </a>
    <a href="/users" class="dock-item">
        <span style="font-size:18px;">👥</span>
        <span>Users</span>
    </a>
    <a href="/queues" class="dock-item">
        <span style="font-size:18px;">⚡</span>
        <span>Booster</span>
    </a>
    <a href="/money" class="dock-item">
        <span style="font-size:18px;">💳</span>
        <span>Khata</span>
    </a>
    <a href="/top-users" class="dock-item">
        <span style="font-size:18px;">🏆</span>
        <span>Top Users</span>
    </a>
    <a href="/whatsapp" class="dock-item active">
        <span style="font-size:18px;">💬</span>
        <span>WhatsApp</span>
    </a>
</div>
<!-- Modal: QR Code Scanner -->
<div id="modalQr" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);z-index:1000;align-items:center;justify-content:center;">
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:18px;padding:26px 24px;max-width:390px;width:92%;text-align:center;box-shadow:0 16px 40px rgba(0,0,0,0.6);">
        <h3 style="font-size:18px;font-weight:800;color:#fff;margin-bottom:6px;">📲 Link WhatsApp Device</h3>
        <p style="font-size:12.5px;color:var(--text-muted);margin-bottom:18px;line-height:1.4;">
            Open WhatsApp &rarr; <b>Linked devices</b> &rarr; <b>Link a device</b> and scan this code:
        </p>
        <div id="qrBox" style="background:#fff;padding:16px;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;min-height:230px;min-width:230px;box-shadow:0 4px 16px rgba(0,0,0,0.2);">
            <div id="qrLoadingText" style="color:#0f172a;font-size:13px;font-weight:600;">Connecting to OpenWA...</div>
            <img id="qrImage" style="display:none;width:220px;height:220px;" alt="Scan WhatsApp QR">
        </div>
        <div style="margin-top:20px;display:flex;gap:10px;">
            <button type="button" class="btn sm" onclick="closeQrModal()" style="flex:1;">Cancel</button>
            <button type="button" class="btn primary sm" onclick="loadQrCode()" style="flex:1;">🔄 Refresh QR</button>
        </div>
    </div>
</div>

<div class="toast" id="toast"></div>

<script>
function showToast(msg, type) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.className = "toast show " + (type || "success");
    setTimeout(() => { el.className = "toast"; }, 4000);
}

function insertToken(targetId, token) {
    const el = document.getElementById(targetId);
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    el.value = el.value.substring(0, start) + token + el.value.substring(end);
    el.focus();
    el.selectionStart = el.selectionEnd = start + token.length;
}

function insertSeparator(targetId) {
    const el = document.getElementById(targetId);
    if (!el) return;
    const sep = "\\n\\n---\\n\\n";
    const start = el.selectionStart;
    const end = el.selectionEnd;
    el.value = el.value.substring(0, start) + sep + el.value.substring(end);
    el.focus();
    el.selectionStart = el.selectionEnd = start + sep.length;
}

function previewVariations(targetId, type) {
    const el = document.getElementById(targetId);
    if (!el || !el.value.trim()) {
        showToast("Please enter template text first", "error");
        return;
    }
    const parts = el.value.split(/\\r?\\n\\s*---\\s*\\r?\\n/).map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) {
        showToast("No variations found", "error");
        return;
    }

    const randIdx = Math.floor(Math.random() * parts.length);
    const chosen = parts[randIdx]
        .replace(/{name}/g, "Muhammad Ali")
        .replace(/{username}/g, "ali.fastnet")
        .replace(/{password}/g, "12345")
        .replace(/{package}/g, "20 Mbps Fiber")
        .replace(/{price}/g, "2500")
        .replace(/{expiry_date}/g, "2026-09-24")
        .replace(/{days_left}/g, "2");

    alert("Preview (Variation " + (randIdx + 1) + " of " + parts.length + "):\\n\\n" + chosen);
}

async function loadSettings() {
    try {
        const res = await fetch("/api/whatsapp/settings");
        if (!res.ok) throw new Error("Status " + res.status);
        const data = await res.json();
        const s = data.settings || {};

        document.getElementById("cfgBaseUrl").value = s.openwa_base_url || "";
        document.getElementById("cfgSessionId").value = s.openwa_session_id || "";
        document.getElementById("cfgCountryCode").value = s.openwa_country_code || "92";
        document.getElementById("cfgApiKey").value = s.openwa_api_key || "";
        document.getElementById("cfgDaysBefore").value = s.whatsapp_days_before || 2;
        document.getElementById("cfgEnabled").checked = Boolean(s.whatsapp_enabled);

        document.getElementById("tmplBefore").value = s.template_before_expiry || "";
        document.getElementById("tmplExpired").value = s.template_expired || "";
    } catch (e) {
        showToast("Failed to load WhatsApp settings: " + e.message, "error");
    }
}

async function testConnection() {
    const pill = document.getElementById("gwStatusPill");
    pill.className = "status-badge checking";
    pill.textContent = "⏳ Testing OpenWA...";

    try {
        const res = await fetch("/api/whatsapp/test");
        const data = await res.json();
        if (data.ok) {
            pill.className = "status-badge online";
            pill.textContent = "🟢 OpenWA Connected";
            showToast("OpenWA gateway reachable!", "success");
        } else {
            pill.className = "status-badge offline";
            pill.textContent = "🔴 OpenWA Offline";
            showToast("OpenWA unreachable: " + (data.error || "HTTP " + data.status), "error");
        }
    } catch (e) {
        pill.className = "status-badge offline";
        pill.textContent = "🔴 Connection Error";
        showToast("Gateway error: " + e.message, "error");
    }
}

async function loadLogs() {
    const tbody = document.getElementById("logsBody");
    try {
        const res = await fetch("/api/whatsapp/logs?limit=30");
        const data = await res.json();
        const logs = data.logs || [];

        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-dim);">No delivery logs yet.</td></tr>';
            return;
        }

        let html = "";
        for (const log of logs) {
            const dateStr = log.created_at ? new Date(log.created_at).toLocaleString() : log.sent_date;
            const typeBadge = log.type === "before_expiry"
                ? '<span class="badge amber">Upcoming</span>'
                : (log.type === "expired" ? '<span class="badge red">Expired</span>' : '<span class="badge blue">Manual</span>');
            const statusBadge = log.status === "sent"
                ? '<span class="badge sent">✓ Sent</span>'
                : '<span class="badge failed">✕ Failed</span>';

            html += \`<tr>
                <td style="white-space:nowrap;font-size:12px;color:var(--text-muted);">\${dateStr}</td>
                <td><b>\${escapeHtml(log.username)}</b></td>
                <td style="font-family:monospace;">\${escapeHtml(log.phone)}</td>
                <td>\${typeBadge}</td>
                <td>\${statusBadge}</td>
                <td style="max-width:280px;white-space:pre-wrap;font-size:12px;color:var(--text-muted);">\${escapeHtml(log.message)}</td>
                <td style="font-size:11.5px;color:var(--red);">\${escapeHtml(log.error || "—")}</td>
            </tr>\`;
        }
        tbody.innerHTML = html;
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--red);">Error loading logs: ' + e.message + '</td></tr>';
    }
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

document.getElementById("gwForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    const payload = {
        openwa_base_url: document.getElementById("cfgBaseUrl").value.trim(),
        openwa_session_id: document.getElementById("cfgSessionId").value.trim(),
        openwa_country_code: document.getElementById("cfgCountryCode").value.trim(),
        openwa_api_key: document.getElementById("cfgApiKey").value.trim(),
        whatsapp_days_before: Number(document.getElementById("cfgDaysBefore").value),
        whatsapp_enabled: document.getElementById("cfgEnabled").checked,
    };

    try {
        const res = await fetch("/api/whatsapp/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            showToast("Gateway settings saved successfully!", "success");
            testConnection();
        } else {
            showToast(data.error || "Failed to save", "error");
        }
    } catch (err) {
        showToast("Error saving: " + err.message, "error");
    }
});

document.getElementById("templateBeforeForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    try {
        const res = await fetch("/api/whatsapp/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ template_before_expiry: document.getElementById("tmplBefore").value })
        });
        const data = await res.json();
        if (data.success) {
            showToast("Before-expiry template saved!", "success");
        }
    } catch (err) {
        showToast("Error saving: " + err.message, "error");
    }
});

document.getElementById("templateExpiredForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    try {
        const res = await fetch("/api/whatsapp/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ template_expired: document.getElementById("tmplExpired").value })
        });
        const data = await res.json();
        if (data.success) {
            showToast("Expired reminder template saved!", "success");
        }
    } catch (err) {
        showToast("Error saving: " + err.message, "error");
    }
});

document.getElementById("quickMsgForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    const btn = document.getElementById("btnSendTest");
    btn.disabled = true;
    btn.textContent = "Sending...";

    try {
        const res = await fetch("/api/whatsapp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                phone: document.getElementById("testPhone").value.trim(),
                message: document.getElementById("testMsg").value.trim(),
                type: "test"
            })
        });
        const data = await res.json();
        if (data.success) {
            showToast("WhatsApp message sent successfully!", "success");
            loadLogs();
        } else {
            showToast("Failed to send: " + (data.error || "Unknown error"), "error");
            loadLogs();
        }
    } catch (err) {
        showToast("Send error: " + err.message, "error");
    } finally {
        btn.disabled = false;
        btn.textContent = "📤 Send WhatsApp Message";
    }
});

document.getElementById("btnRunSweep").addEventListener("click", async function() {
    if (!confirm("Run automated expiry sweep now? This will check upcoming and expired packages and send WhatsApp notifications.")) return;
    const btn = document.getElementById("btnRunSweep");
    btn.disabled = true;
    btn.textContent = "Running Sweep...";

    try {
        const res = await fetch("/api/whatsapp/sweep", { method: "POST" });
        const data = await res.json();
        if (data.success) {
            const s = data.summary || {};
            showToast(\`Sweep complete: \${s.beforeExpirySent || 0} upcoming reminders, \${s.expiredSent || 0} expired reminders sent, \${s.skipped || 0} skipped.\`, "success");
            loadLogs();
        } else {
            showToast("Sweep error: " + (data.error || "Unknown error"), "error");
        }
    } catch (err) {
        showToast("Sweep error: " + err.message, "error");
    } finally {
        btn.disabled = false;
        btn.textContent = "🚀 Run Expiry Sweep Now";
    }
});

async function loadQrCode() {
    const modal = document.getElementById("modalQr");
    modal.style.display = "flex";
    const img = document.getElementById("qrImage");
    const txt = document.getElementById("qrLoadingText");
    img.style.display = "none";
    txt.style.display = "block";
    txt.textContent = "Connecting to OpenWA session...";

    try {
        await fetch("/api/whatsapp/start-session", { method: "POST" });
        const res = await fetch("/api/whatsapp/qr");
        const data = await res.json();

        if (data.ok && data.data && data.data.qrCode) {
            img.src = data.data.qrCode;
            img.style.display = "block";
            txt.style.display = "none";
        } else if (data.data && data.data.status === "ready") {
            txt.textContent = "✅ WhatsApp is already connected and ready!";
        } else {
            txt.textContent = (data.data && (data.data.message || data.data.status)) || data.error || "Waiting for OpenWA session QR...";
        }
    } catch (e) {
        txt.textContent = "Failed to load QR: " + e.message;
    }
}

function closeQrModal() {
    document.getElementById("modalQr").style.display = "none";
    testConnection();
}

document.getElementById("btnScanQr").addEventListener("click", loadQrCode);
document.getElementById("btnTestConn").addEventListener("click", testConnection);

// Initialize on page load
loadSettings();
testConnection();
loadLogs();
</script>
</body>
</html>`;
    res.send(html);
}

module.exports = {
    renderWhatsAppPage,
};
