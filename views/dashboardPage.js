/*
|--------------------------------------------------------------------------
| MikroTik Live Dashboard Page
|--------------------------------------------------------------------------
*/

function renderDashboardPage(req, res) {
    const html = `<!DOCTYPE html>
<html lang="en">

<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#080c15">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="mobile-web-app-capable" content="yes">
<title>Dashboard – MikroTik Panel</title>

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
    margin-bottom: 18px;
    border-bottom: 1px solid var(--border-light);
}

.brand {
    display: flex;
    align-items: center;
    gap: 10px;
}

.brand-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: linear-gradient(135deg, #2563eb, #7c3aed);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 17px;
    color: #fff;
    box-shadow: 0 4px 12px var(--primary-glow);
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

.dock-item .dock-icon {
    font-size: 20px;
    line-height: 1;
}

.dock-item.active {
    color: var(--blue);
}

@media (min-width: 768px) {
    .bottom-dock {
        display: none;
    }
}

/* Status Pill */
.status-pill {
    font-size: 12px;
    padding: 4px 10px;
    border-radius: 9999px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.status-pill.online {
    background: var(--green-bg);
    color: #34d399;
    border: 1px solid var(--green);
}

.status-pill.offline {
    background: var(--red-bg);
    color: #fb7185;
    border: 1px solid var(--red);
}

/* Traffic Gauges Grid */
.traffic-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 14px;
    margin-bottom: 20px;
}

.gauge-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 18px 20px;
}

.gauge-label {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    font-weight: 700;
    color: var(--text-muted);
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

.gauge-val {
    font-size: 32px;
    font-weight: 800;
    color: #fff;
    line-height: 1.1;
}

.gauge-val.rx { color: #34d399; }
.gauge-val.tx { color: #38bdf8; }
.gauge-val.tot { color: #c084fc; }

/* Stats Grid */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
    margin-bottom: 24px;
}

.stat-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px;
    text-align: center;
}

.stat-label {
    font-size: 11.5px;
    color: var(--text-muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 4px;
}

.stat-val {
    font-size: 24px;
    font-weight: 800;
    color: #fff;
}

.stat-val.blue { color: var(--blue); }
.stat-val.green { color: var(--green); }
.stat-val.amber { color: var(--amber); }
.stat-val.red { color: var(--red); }

/* Sessions Card & Table */
.content-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 24px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.card-title {
    font-size: 16px;
    font-weight: 800;
    color: #fff;
}

.table-wrap {
    overflow-x: auto;
}

table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13.5px;
    text-align: left;
}

th {
    padding: 10px 12px;
    color: var(--text-muted);
    font-weight: 700;
    font-size: 12px;
    background: #0c1424;
    border-bottom: 1px solid var(--border);
    text-transform: uppercase;
}

td {
    padding: 11px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    color: var(--text-main);
}

.mobile-sessions {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

@media (min-width: 860px) {
    .mobile-sessions { display: none; }
}

@media (max-width: 859px) {
    .desktop-table-wrap { display: none; }
}

.session-card {
    background: #0d1527;
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.sc-user {
    display: flex;
    align-items: center;
    gap: 10px;
}

.sc-avatar {
    width: 34px;
    height: 34px;
    border-radius: 9px;
    background: rgba(37, 99, 235, 0.2);
    color: #60a5fa;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
}

.sc-name {
    font-size: 14px;
    font-weight: 700;
    color: #fff;
}

.sc-sub {
    font-size: 11.5px;
    color: var(--text-dim);
}

.sc-traffic {
    text-align: right;
}

.sc-speed {
    font-size: 14px;
    font-weight: 800;
    color: #c084fc;
}

.sc-rates {
    font-size: 11px;
    color: var(--text-muted);
}

.interfaces-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 12px;
}

.iface-card {
    background: linear-gradient(180deg, #0e172a 0%, #0a0f1d 100%);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: transform 0.15s ease, border-color 0.15s ease;
}

.iface-card:hover {
    border-color: rgba(99, 102, 241, 0.4);
    transform: translateY(-1px);
}

.iface-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.iface-name-box {
    display: flex;
    align-items: center;
    gap: 8px;
}

.iface-name {
    font-weight: 700;
    font-size: 13.5px;
    color: #f8fafc;
}

.iface-type-pill {
    font-size: 10px;
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.05);
    padding: 1px 6px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.06);
}

.iface-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 6px;
    letter-spacing: 0.5px;
}

.iface-badge.up {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.3);
}

.iface-badge.down {
    background: rgba(100, 116, 139, 0.15);
    color: #94a3b8;
    border: 1px solid rgba(100, 116, 139, 0.3);
}

.iface-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
}
.iface-dot.up { background: #34d399; box-shadow: 0 0 6px #34d399; }
.iface-dot.down { background: #64748b; }

.iface-rates-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    background: rgba(15, 23, 42, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 8px;
    padding: 8px 10px;
}

.iface-rate-item {
    display: flex;
    flex-direction: column;
}

.iface-rate-header {
    font-size: 10.5px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 2px;
}
.iface-rate-header.dl { color: #34d399; }
.iface-rate-header.ul { color: #38bdf8; }

.iface-rate-value {
    font-size: 13.5px;
    font-weight: 800;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    color: #ffffff;
}
.iface-rate-unit {
    font-size: 10px;
    font-weight: 500;
    color: var(--text-muted);
    margin-left: 2px;
}

.iface-bar {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 2px;
    overflow: hidden;
    display: flex;
}
.iface-bar-rx {
    height: 100%;
    background: #34d399;
    transition: width 0.3s ease;
}
.iface-bar-tx {
    height: 100%;
    background: #38bdf8;
    transition: width 0.3s ease;
}

.iface-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: var(--text-muted);
    padding-top: 2px;
}

.iface-total-val {
    font-weight: 700;
    color: #c084fc;
}

.iface-filters {
    display: flex;
    gap: 4px;
    background: rgba(15, 23, 42, 0.6);
    padding: 3px;
    border-radius: 8px;
    border: 1px solid var(--border);
}

.iface-filter-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
}

.iface-filter-btn:hover {
    color: #f1f5f9;
}

.iface-filter-btn.active {
    background: #2563eb;
    color: #ffffff;
    box-shadow: 0 1px 4px rgba(37, 99, 235, 0.4);
}

</style>
</head>

<body>

<div class="container">

    <!-- Top App Bar -->
    <header class="app-bar">
        <div class="brand">
            <div class="brand-icon">MT</div>
            <div>
                <div class="brand-title">MikroTik RouterOS</div>
                <div class="brand-sub" id="lastUpdated">Live Traffic &amp; Bandwidth Monitor</div>
            </div>
        </div>

        <div style="display:flex;align-items:center;gap:10px;">
            <span class="status-pill offline" id="connStatus">Connecting...</span>
            <nav class="desktop-nav">
                <a href="/" class="active">📊 Dashboard</a>
                <a href="/users">👥 Customers</a>
                <a href="/queues">⚡ Booster</a>
                <a href="/money">💳 DigiKhata</a>
                <a href="/top-users">🏆 Top Users</a>
                <a href="/whatsapp">💬 WhatsApp</a>
                <a href="/logout" class="logout-btn" title="Sign out">🚪 Logout</a>
            </nav>
        </div>
    </header>

    <!-- Bandwidth Gauges Grid -->
    <div class="traffic-grid">
        <div class="gauge-card">
            <div class="gauge-label">
                <span>🟢 Download (RX)</span>
                <span>VLAN Traffic</span>
            </div>
            <div class="gauge-val rx" id="vlanRx">0.00 <small style="font-size:14px;">Mbps</small></div>
        </div>

        <div class="gauge-card">
            <div class="gauge-label">
                <span>🔵 Upload (TX)</span>
                <span>VLAN Traffic</span>
            </div>
            <div class="gauge-val tx" id="vlanTx">0.00 <small style="font-size:14px;">Mbps</small></div>
        </div>

        <div class="gauge-card">
            <div class="gauge-label">
                <span>🟣 Aggregated Throughput</span>
                <span>RX + TX</span>
            </div>
            <div class="gauge-val tot" id="vlanTotal">0.00 <small style="font-size:14px;">Mbps</small></div>
        </div>
    </div>

    <!-- Customer Statistics -->
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-label">Total Subscribers</div>
            <div class="stat-val blue" id="stTotal">–</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Active Users</div>
            <div class="stat-val green" id="stActive">–</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Expiring Soon</div>
            <div class="stat-val amber" id="stExpiring">–</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Expired / Disabled</div>
            <div class="stat-val red" id="stExpired">–</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Online PPPoE</div>
            <div class="stat-val blue" id="stOnline">–</div>
        </div>
    </div>

    <!-- Active PPPoE Sessions -->
    <div class="content-card">
        <div class="card-header">
            <div class="card-title">👥 Active PPPoE Sessions (<span id="activeUsersCount">0</span>)</div>
            <span class="status-pill online" id="sessionBadge">Live</span>
        </div>

        <div class="mobile-sessions" id="mobileSessionsList">
            <div style="text-align:center;padding:24px;color:var(--text-dim);">Loading active sessions...</div>
        </div>

        <div class="desktop-table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>IP Address</th>
                        <th>Uptime</th>
                        <th>Download (RX)</th>
                        <th>Upload (TX)</th>
                        <th>Total Speed</th>
                    </tr>
                </thead>
                <tbody id="desktopSessionsBody">
                    <tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-dim);">Loading active sessions...</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Top Bandwidth Consumers Today Preview -->
    <div class="content-card">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <div class="card-title">🏆 Top Bandwidth Consumers Today</div>
            <a href="/top-users" style="color:#60a5fa;text-decoration:none;font-size:12.5px;font-weight:700;display:inline-flex;align-items:center;gap:4px;">
                View All Top Users &amp; Full Stats &rarr;
            </a>
        </div>
        <div id="topConsumersGrid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:12px;">
            <div style="text-align:center;padding:16px;color:var(--text-dim);grid-column:1/-1;">Tracking daily consumption...</div>
        </div>
    </div>

    <!-- Interfaces Status Grid -->
    <div class="content-card">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <div class="card-title">🔌 Network Interfaces (<span id="ifaceCount">0</span>)</div>
            <div class="iface-filters" id="ifaceFilters">
                <button type="button" class="iface-filter-btn active" data-filter="all" onclick="setIfaceFilter('all')">All</button>
                <button type="button" class="iface-filter-btn" data-filter="ether" onclick="setIfaceFilter('ether')">Ethernet</button>
                <button type="button" class="iface-filter-btn" data-filter="pppoe" onclick="setIfaceFilter('pppoe')">PPPoE</button>
                <button type="button" class="iface-filter-btn" data-filter="other" onclick="setIfaceFilter('other')">Other</button>
            </div>
        </div>
        <div class="interfaces-grid" id="interfacesGrid"></div>
    </div>

</div>

<!-- Mobile Bottom Dock -->
<nav class="bottom-dock">
    <a href="/" class="dock-item active">
        <div class="dock-icon">📊</div>
        <div>Dashboard</div>
    </a>
    <a href="/users" class="dock-item">
        <div class="dock-icon">👥</div>
        <div>Customers</div>
    </a>
    <a href="/queues" class="dock-item">
        <div class="dock-icon">⚡</div>
        <div>Booster</div>
    </a>
    <a href="/money" class="dock-item">
        <div class="dock-icon">💳</div>
        <div>DigiKhata</div>
    </a>
    <a href="/top-users" class="dock-item">
        <div class="dock-icon">🏆</div>
        <div>Top Users</div>
    </a>
    <a href="/whatsapp" class="dock-item">
        <div class="dock-icon">💬</div>
        <div>WhatsApp</div>
    </a>
</nav>

<script>

function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

async function updateDashboard() {
    try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) throw new Error("Status " + res.status);
        const data = await res.json();

        const connEl = document.getElementById("connStatus");
        if (data.connected) {
            connEl.textContent = "🟢 Router Online";
            connEl.className = "status-pill online";
        } else {
            connEl.textContent = "🔴 Disconnected";
            connEl.className = "status-pill offline";
        }

        if (data.updated) {
            document.getElementById("lastUpdated").textContent = "Updated " + data.updated;
        }

        // VLAN 102 Traffic
        const vlan = data.vlan102 || {};
        document.getElementById("vlanRx").innerHTML = Number(vlan.rxMbps || 0).toFixed(2) + ' <small style="font-size:14px;">Mbps</small>';
        document.getElementById("vlanTx").innerHTML = Number(vlan.txMbps || 0).toFixed(2) + ' <small style="font-size:14px;">Mbps</small>';
        document.getElementById("vlanTotal").innerHTML = Number(vlan.totalMbps || 0).toFixed(2) + ' <small style="font-size:14px;">Mbps</small>';

        // Sessions
        const users = (data.users || []).slice().sort(function (a, b) {
            return (Number(b.totalMbps) || 0) - (Number(a.totalMbps) || 0);
        });
        document.getElementById("activeUsersCount").textContent = users.length;
        document.getElementById("sessionBadge").textContent = users.length + " online";

        const mobileList = document.getElementById("mobileSessionsList");
        const desktopBody = document.getElementById("desktopSessionsBody");

        if (users.length === 0) {
            mobileList.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-dim);">No active PPPoE sessions.</div>';
            desktopBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-dim);">No active sessions.</td></tr>';
        } else {
            let mHtml = "";
            let dHtml = "";

            for (const u of users) {
                const initial = (u.name || "?").charAt(0).toUpperCase();

                mHtml +=
                    '<div class="session-card">' +
                        '<div class="sc-user">' +
                            '<div class="sc-avatar">' + escapeHtml(initial) + '</div>' +
                            '<div>' +
                                '<div class="sc-name">' + escapeHtml(u.name) + '</div>' +
                                '<div class="sc-sub">' + escapeHtml(u.address || "Active") + ' · ' + escapeHtml(u.uptime || "") + '</div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="sc-traffic">' +
                            '<div class="sc-speed">' + Number(u.totalMbps || 0).toFixed(2) + ' Mbps</div>' +
                            '<div class="sc-rates">↓ ' + Number(u.rxMbps || 0).toFixed(2) + ' ↑ ' + Number(u.txMbps || 0).toFixed(2) + '</div>' +
                        '</div>' +
                    '</div>';

                dHtml +=
                    '<tr>' +
                        '<td><b>' + escapeHtml(u.name) + '</b></td>' +
                        '<td>' + escapeHtml(u.address || "–") + '</td>' +
                        '<td>' + escapeHtml(u.uptime || "–") + '</td>' +
                        '<td style="color:#34d399;font-weight:700;">' + Number(u.rxMbps || 0).toFixed(2) + ' Mbps</td>' +
                        '<td style="color:#38bdf8;font-weight:700;">' + Number(u.txMbps || 0).toFixed(2) + ' Mbps</td>' +
                        '<td style="color:#c084fc;font-weight:800;">' + Number(u.totalMbps || 0).toFixed(2) + ' Mbps</td>' +
                    '</tr>';
            }

            mobileList.innerHTML = mHtml;
            desktopBody.innerHTML = dHtml;
        }

        // Interfaces
        let currentFilter = window.__ifaceFilter || "all";
        const allIfaces = (data.ethernet || []).concat(data.other || []);
        const countEl = document.getElementById("ifaceCount");
        if (countEl) countEl.textContent = allIfaces.length;

        const filteredIfaces = allIfaces.filter(function (iface) {
            const name = (iface.name || "").toLowerCase();
            const type = (iface.type || "").toLowerCase();
            const isEth = type === "ether" || name.startsWith("ether");
            const isPpp = type.includes("pppoe") || name.includes("pppoe");
            if (currentFilter === "ether") return isEth;
            if (currentFilter === "pppoe") return isPpp;
            if (currentFilter === "other") return !isEth && !isPpp;
            return true;
        });

        const ifaceGrid = document.getElementById("interfacesGrid");
        let iHtml = "";

        if (filteredIfaces.length === 0) {
            iHtml = '<div style="grid-column: 1 / -1; text-align:center; padding: 24px; color: var(--text-dim);">No interfaces match this filter</div>';
        } else {
            for (const iface of filteredIfaces) {
                const isUp = Boolean(iface.running);
                const rx = Number(iface.rxMbps || 0);
                const tx = Number(iface.txMbps || 0);
                const total = Number(iface.totalMbps !== undefined ? iface.totalMbps : (rx + tx));

                let rxPct = 0;
                let txPct = 0;
                if (total > 0) {
                    rxPct = Math.min(100, Math.max(0, Math.round((rx / total) * 100)));
                    txPct = 100 - rxPct;
                }

                const typeLabel = iface.type ? escapeHtml(iface.type) : (iface.name && iface.name.startsWith("ether") ? "ether" : "iface");

                iHtml +=
                    '<div class="iface-card">' +
                        '<div class="iface-top">' +
                            '<div class="iface-name-box">' +
                                '<span class="iface-dot ' + (isUp ? 'up' : 'down') + '"></span>' +
                                '<span class="iface-name">' + escapeHtml(iface.name) + '</span>' +
                                '<span class="iface-type-pill">' + typeLabel + '</span>' +
                            '</div>' +
                            '<span class="iface-badge ' + (isUp ? 'up' : 'down') + '">' + (isUp ? 'UP' : 'DOWN') + '</span>' +
                        '</div>' +

                        '<div class="iface-rates-row">' +
                            '<div class="iface-rate-item">' +
                                '<div class="iface-rate-header dl"><span>↓</span> Download (RX)</div>' +
                                '<div class="iface-rate-value">' + rx.toFixed(2) + '<span class="iface-rate-unit">Mbps</span></div>' +
                            '</div>' +
                            '<div class="iface-rate-item">' +
                                '<div class="iface-rate-header ul"><span>↑</span> Upload (TX)</div>' +
                                '<div class="iface-rate-value">' + tx.toFixed(2) + '<span class="iface-rate-unit">Mbps</span></div>' +
                            '</div>' +
                        '</div>' +

                        '<div class="iface-bar">' +
                            '<div class="iface-bar-rx" style="width:' + rxPct + '%;"></div>' +
                            '<div class="iface-bar-tx" style="width:' + txPct + '%;"></div>' +
                        '</div>' +

                        '<div class="iface-bottom">' +
                            '<span>Total Bandwidth</span>' +
                            '<span class="iface-total-val">' + total.toFixed(2) + ' Mbps</span>' +
                        '</div>' +
                    '</div>';
            }
        }

        ifaceGrid.innerHTML = iHtml;

    } catch (e) {
        document.getElementById("connStatus").textContent = "🔴 Server Error";
        document.getElementById("connStatus").className = "status-pill offline";
    }
}

async function updateStats() {
    try {
        const res = await fetch("/api/stats");
        if (!res.ok) return;
        const data = await res.json();
        const s = data.stats || {};
        document.getElementById("stTotal").textContent = s.total || 0;
        document.getElementById("stActive").textContent = s.active || 0;
        document.getElementById("stExpiring").textContent = s.expiring || 0;
        document.getElementById("stExpired").textContent = (s.expired || 0) + (s.disabled || 0);
        document.getElementById("stOnline").textContent = s.online || 0;
    } catch (e) {
        // Ignore stats polling errors
    }
}

function setIfaceFilter(filter) {
    window.__ifaceFilter = filter;
    document.querySelectorAll(".iface-filter-btn").forEach(function(btn) {
        if (btn.getAttribute("data-filter") === filter) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
    updateDashboard();
}

async function updateTopConsumers() {
    try {
        const res = await fetch("/api/analytics/top-users?limit=4&period=today");
        if (!res.ok) return;
        const data = await res.json();
        const grid = document.getElementById("topConsumersGrid");
        if (!grid) return;

        if (!data.users || data.users.length === 0) {
            grid.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-dim);grid-column:1/-1;">Tracking daily consumption. (Data updates as subscribers use the internet)</div>';
            return;
        }

        let html = "";
        for (const u of data.users) {
            const medal = u.medal || ('#' + u.rank);
            html +=
                '<div style="background:#0d1527;border:1px solid var(--border);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:8px;">' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                        '<div style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:13.5px;color:#fff;">' +
                            '<span>' + medal + '</span>' +
                            '<span>' + escapeHtml(u.name || u.username) + '</span>' +
                        '</div>' +
                        '<span style="font-size:11px;font-weight:700;color:#c084fc;">' + u.total_formatted + '</span>' +
                    '</div>' +
                    '<div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--text-muted);">' +
                        '<span style="color:#34d399;">↓ DL: ' + u.download_formatted + '</span>' +
                        '<span style="color:#38bdf8;">↑ UL: ' + u.upload_formatted + '</span>' +
                    '</div>' +
                    '<div style="width:100%;height:4px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;">' +
                        '<div style="height:100%;background:linear-gradient(90deg,#3b82f6,#a855f7);width:' + u.percent_of_total + '%;"></div>' +
                    '</div>' +
                '</div>';
        }
        grid.innerHTML = html;
    } catch (e) {
        // ignore
    }
}

updateDashboard();
updateStats();
updateTopConsumers();
setInterval(updateDashboard, 1500);
setInterval(updateStats, 15000);
setInterval(updateTopConsumers, 6000);

</script>
</body>
</html>`;
    res.send(html);
}

module.exports = {
    renderDashboardPage,
};
