/*
|--------------------------------------------------------------------------
| PPPoE Customer Management – Mobile Web App
|--------------------------------------------------------------------------
| Powered by JSON API /api (routes/users.js).
| Mobile Features:
|   - Real-time Stats: Total Customers, Active Users, Expiring Soon, Expired, Online
|   - Clear Separation: Actual Subscribed Package (Plan) vs Assigned Router Profile
|   - Fixed Native Bottom App Navigation Dock
|   - Responsive Customer Cards with Live Online/Offline Status Indicator
|   - 1-Tap Quick Actions:
|       ⚡ Renew (1M, 2M, 3M presets)
|       ✏️ Edit (Full profile, package plan, price, expiry editor)
|       ⚡ Kick / Disconnect (Drops live PPPoE session)
|       🌐 Remote Access (Opens customer's router interface via NAT port)
|       ⏸️ Suspend / ▶️ Activate
|       💳 DigiKhata Link
|       💬 WhatsApp 1-Tap Bill Reminder
|   - Slide-Up Bottom Sheet Modals with Auto-calculated Expiry Previews
|   - Instant Search & Filter Bar
|--------------------------------------------------------------------------
*/

function renderUsersPage(req, res) {
    const html = `<!DOCTYPE html>
<html lang="en">

<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#080c15">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="mobile-web-app-capable" content="yes">
<title>Customers – MikroTik Panel</title>
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

/* ============================================================ */
/* TOP APP BAR & NAVIGATION */
/* ============================================================ */

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

@media (min-width: 768px) {
    body {
        padding: 24px 24px 40px;
    }
    .desktop-nav {
        display: flex;
    }
}

/* ============================================================ */
/* MOBILE BOTTOM APP DOCK */
/* ============================================================ */

.bottom-dock {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: calc(62px + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
    background: rgba(10, 15, 26, 0.92);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
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
    transition: all 0.15s ease;
}

.dock-item .dock-icon {
    font-size: 20px;
    line-height: 1;
}

.dock-item:active {
    transform: scale(0.92);
}

.dock-item.active {
    color: var(--blue);
}

.dock-item.active .dock-icon {
    transform: translateY(-2px);
    filter: drop-shadow(0 2px 8px rgba(56, 189, 248, 0.5));
}

@media (min-width: 768px) {
    .bottom-dock {
        display: none;
    }
}

/* ============================================================ */
/* PAGE HEADER & ACTIONS */
/* ============================================================ */

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 18px;
}

.header-title-block h1 {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.02em;
    display: flex;
    align-items: center;
    gap: 8px;
}

.header-title-block p {
    color: var(--text-muted);
    font-size: 13px;
    margin-top: 2px;
}

.header-btn-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    width: 100%;
}

@media (min-width: 768px) {
    .header-btn-row {
        width: auto;
    }
}

/* Buttons */

button, .btn {
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    border-radius: 9px;
    padding: 8px 12px;
    cursor: pointer;
    border: 1px solid var(--border);
    background: var(--bg-card);
    color: var(--text-main);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: all 0.12s ease;
    text-decoration: none;
    touch-action: manipulation;
}

button:active, .btn:active {
    transform: scale(0.97);
}

button.primary, .btn.primary {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    border-color: #3b82f6;
    color: #fff;
    box-shadow: 0 4px 14px var(--primary-glow);
}

button.success, .btn.success {
    background: linear-gradient(135deg, #059669, #047857);
    border-color: #10b981;
    color: #fff;
}

button.danger, .btn.danger {
    background: linear-gradient(135deg, #e11d48, #be123c);
    border-color: #f43f5e;
    color: #fff;
}

button.sm, .btn.sm {
    padding: 6px 9px;
    font-size: 12px;
    border-radius: 7px;
}

.btn-flex-1 {
    flex: 1;
}

/* ============================================================ */
/* STATS CHIPS CARDS */
/* ============================================================ */

.stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 18px;
}

@media (min-width: 768px) {
    .stats-grid {
        grid-template-columns: repeat(5, 1fr);
        gap: 14px;
    }
}

.stat-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px 14px;
    position: relative;
    overflow: hidden;
}

.stat-card.full-width {
    grid-column: 1 / -1;
}

@media (min-width: 768px) {
    .stat-card.full-width {
        grid-column: span 1;
    }
}

.stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
}

.stat-card.total::before    { background: var(--blue); }
.stat-card.active::before   { background: var(--green); }
.stat-card.expiring::before { background: var(--amber); }
.stat-card.expired::before  { background: var(--red); }
.stat-card.online::before   { background: var(--purple); }

.stat-label {
    font-size: 11.5px;
    color: var(--text-muted);
    font-weight: 600;
    margin-bottom: 4px;
}

.stat-val {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.02em;
}

.stat-val.blue   { color: #38bdf8; }
.stat-val.green  { color: #34d399; }
.stat-val.amber  { color: #fbbf24; }
.stat-val.red    { color: #fb7185; }
.stat-val.purple { color: #c084fc; }

/* ============================================================ */
/* TOOLBAR & SEARCH */
/* ============================================================ */

.toolbar {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 14px;
}

@media (min-width: 768px) {
    .toolbar {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
    }
}

.search-box {
    position: relative;
    width: 100%;
}

@media (min-width: 768px) {
    .search-box {
        max-width: 380px;
    }
}

.search-box input {
    width: 100%;
    background: var(--bg-input);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 9px 12px 9px 34px;
    font-size: 13.5px;
    color: #fff;
    outline: none;
}

.search-box input:focus {
    border-color: var(--primary);
}

.search-icon {
    position: absolute;
    left: 11px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-dim);
    font-size: 14px;
}

.filter-row {
    display: flex;
    gap: 8px;
    width: 100%;
}

@media (min-width: 768px) {
    .filter-row {
        width: auto;
    }
}

select {
    background: var(--bg-input);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 8px 12px;
    color: var(--text-main);
    font-size: 13px;
    outline: none;
}

/* ============================================================ */
/* RESPONSIVE CUSTOMER CARDS (MOBILE-FIRST) */
/* ============================================================ */

.customer-cards-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.cust-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: background 0.12s ease;
}

.cust-card:active {
    background: var(--bg-card-hover);
}

.cc-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
}

.cc-user {
    display: flex;
    align-items: center;
    gap: 10px;
}

.cc-avatar {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: linear-gradient(135deg, #1e293b, #334155);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 14px;
    color: #93c5fd;
    border: 1px solid var(--border-light);
    position: relative;
    flex-shrink: 0;
}

.cc-status-dot {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    border: 2px solid var(--bg-card);
}

.cc-status-dot.online  { background: #10b981; }
.cc-status-dot.offline { background: #64748b; }

.cc-name {
    font-size: 15px;
    font-weight: 700;
    color: #f1f5f9;
}

.cc-sub {
    font-size: 12px;
    color: var(--text-dim);
    font-family: Consolas, monospace;
}

.cc-meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    background: rgba(10, 17, 32, 0.6);
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 12px;
}

.cc-chip {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--text-muted);
}

.cc-actions-row {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.cc-actions-row .btn {
    flex: 1;
    min-width: 58px;
}

.whatsapp-btn {
    background: #064e3b;
    border-color: #059669;
    color: #a7f3d0;
}

.remote-btn {
    background: #1e1b4b;
    border-color: #4338ca;
    color: #c7d2fe;
}

/* Desktop Table View */

.desktop-table-card {
    display: none;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow-x: auto;
}

@media (min-width: 900px) {
    .desktop-table-card {
        display: block;
    }
    .customer-cards-list {
        display: none;
    }
}

table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13.5px;
    text-align: left;
}

th {
    padding: 12px 14px;
    color: var(--text-muted);
    font-weight: 600;
    font-size: 12px;
    background: #0c1424;
    border-bottom: 1px solid var(--border);
    text-transform: uppercase;
    letter-spacing: 0.02em;
}

td {
    padding: 12px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    vertical-align: middle;
}

tr:hover td {
    background: rgba(255, 255, 255, 0.02);
}

.badge {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 12px;
    display: inline-block;
}

.badge.green  { background: var(--green-bg); color: #6ee7b7; }
.badge.red    { background: var(--red-bg); color: #fda4af; }
.badge.amber  { background: var(--amber-bg); color: #fde68a; }
.badge.blue   { background: var(--blue-bg); color: #bae6fd; }
.badge.purple { background: var(--purple-bg); color: #e9d5ff; }

/* ============================================================ */
/* SLIDE-UP BOTTOM SHEET MODALS */
/* ============================================================ */

.modal-backdrop {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(4, 7, 15, 0.85);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 1000;
    align-items: flex-end;
    justify-content: center;
}

.modal-backdrop.open {
    display: flex;
}

@media (min-width: 768px) {
    .modal-backdrop {
        align-items: center;
        padding: 20px;
    }
}

.modal {
    background: #111a2e;
    border: 1px solid var(--border);
    border-radius: 20px 20px 0 0;
    padding: 18px 18px calc(24px + env(safe-area-inset-bottom));
    width: 100%;
    max-width: 520px;
    max-height: 85vh;
    overflow-y: auto;
    animation: slideUpModal 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 -10px 40px rgba(0,0,0,0.6);
}

@media (min-width: 768px) {
    .modal {
        border-radius: 16px;
        max-height: 90vh;
        padding: 24px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.7);
    }
}

@keyframes slideUpModal {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
}

.sheet-handle {
    width: 36px;
    height: 4px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    margin: 0 auto 12px;
}

@media (min-width: 768px) {
    .sheet-handle {
        display: none;
    }
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
}

.modal-title {
    font-size: 17px;
    font-weight: 700;
    color: #fff;
}

.modal-close {
    background: transparent;
    border: none;
    font-size: 20px;
    color: var(--text-muted);
    padding: 4px 8px;
    cursor: pointer;
}

.form-group {
    margin-bottom: 12px;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}

label {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-muted);
}

input, select, textarea {
    background: var(--bg-input);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 10px 12px;
    color: var(--text-main);
    font-size: 14px;
    font-family: inherit;
    outline: none;
}

input:focus, select:focus, textarea:focus {
    border-color: var(--primary);
}

.modal-footer {
    display: flex;
    gap: 8px;
    margin-top: 18px;
    padding-top: 12px;
    border-top: 1px solid var(--border);
}

.modal-footer .btn {
    flex: 1;
    padding: 11px;
    font-size: 14px;
}

.error-banner {
    color: #f43f5e;
    font-size: 12.5px;
    margin-top: 6px;
    display: none;
}

/* Toast */

.toast {
    position: fixed;
    bottom: calc(75px + env(safe-area-inset-bottom));
    left: 50%;
    transform: translateX(-50%);
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 12px;
    padding: 10px 16px;
    font-size: 13.5px;
    font-weight: 600;
    z-index: 2000;
    display: none;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
    max-width: 90vw;
    text-align: center;
}

@media (min-width: 768px) {
    .toast {
        bottom: 24px;
        left: auto;
        right: 24px;
        transform: none;
    }
}

.toast.show {
    display: block;
    animation: fadeIn 0.15s ease;
}

.toast.success { border-color: var(--green); color: #6ee7b7; }
.toast.error   { border-color: var(--red); color: #fda4af; }
.toast.info    { border-color: var(--blue); color: #bae6fd; }

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
            <div class="brand-icon">M</div>
            <div>
                <div class="brand-title">MikroTik ISP Core</div>
                <div class="brand-sub">Subscriber &amp; Expiry Management</div>
            </div>
        </div>

        <nav class="desktop-nav">
            <a href="/">📊 Dashboard</a>
            <a href="/users" class="active">👥 Customers</a>
            <a href="/queues">⚡ Booster</a>
            <a href="/money">💳 DigiKhata</a>
            <a href="/top-users">🏆 Top Users</a>
            <a href="/whatsapp">💬 WhatsApp</a>
            <a href="/logout" style="color:#fda4af;" title="Sign out">🚪 Logout</a>
        </nav>
    </header>

    <!-- Page Header & Actions -->
    <div class="page-header">
        <div class="header-title-block">
            <h1>👥 PPPoE Subscribers</h1>
            <p>Customer accounts, packages, renewals, and live session control</p>
        </div>

        <div class="header-btn-row">
            <button class="btn btn-flex-1" id="btnSync">
                ⚡ Auto Sync
            </button>
            <button class="btn btn-flex-1" id="btnRemoteClose">
                🔒 Close Remote
            </button>
            <button class="btn btn-flex-1" id="btnImport">
                📥 Import
            </button>
            <button class="btn primary btn-flex-1" id="btnAdd">
                + Add Customer
            </button>
        </div>
    </div>

    <!-- Stats Chips Grid -->
    <div class="stats-grid">
        <div class="stat-card total">
            <div class="stat-label">Total Customers</div>
            <div class="stat-val blue" id="stTotal">–</div>
        </div>
        <div class="stat-card active">
            <div class="stat-label">Active Users</div>
            <div class="stat-val green" id="stActive">–</div>
        </div>
        <div class="stat-card expiring">
            <div class="stat-label">Expiring Soon (3d)</div>
            <div class="stat-val amber" id="stExpiring">–</div>
        </div>
        <div class="stat-card expired">
            <div class="stat-label">Expired / Disabled</div>
            <div class="stat-val red" id="stExpired">–</div>
        </div>
        <div class="stat-card online full-width">
            <div class="stat-label">Live Online Sessions</div>
            <div class="stat-val purple" id="stOnline">–</div>
        </div>
    </div>

    <!-- Toolbar & Filters -->
    <div class="toolbar">
        <div class="search-box">
            <span class="search-icon">🔍</span>
            <input type="text" id="searchInput" placeholder="Search name, username, phone, package, IP..." autocomplete="off">
        </div>

        <div class="filter-row">
            <select id="statusFilter" class="btn-flex-1">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expiring">Expiring Soon (3d)</option>
                <option value="expired">Expired</option>
                <option value="disabled">Disabled / Suspended</option>
                <option value="online">Online Now</option>
            </select>

            <select id="packageFilter" class="btn-flex-1">
                <option value="all">All Packages</option>
            </select>
        </div>
    </div>

    <!-- Mobile Customer Cards List -->
    <div class="customer-cards-list" id="usersCardsList">
        <div style="text-align:center;padding:30px;color:var(--text-dim);">
            Loading subscribers...
        </div>
    </div>

    <!-- Desktop Table View -->
    <div class="desktop-table-card">
        <table>
            <thead>
                <tr>
                    <th>Customer / Secret</th>
                    <th>Subscribed Package &amp; Price</th>
                    <th>Assigned Router Profile</th>
                    <th>Expiry &amp; Countdown</th>
                    <th>Online / Status</th>
                    <th style="text-align:right;">Actions</th>
                </tr>
            </thead>
            <tbody id="usersTableBody"></tbody>
        </table>
    </div>

</div>

<!-- ============================================================ -->
<!-- MOBILE BOTTOM APP NAVIGATION DOCK -->
<!-- ============================================================ -->
<nav class="bottom-dock">
    <a href="/" class="dock-item">
        <div class="dock-icon">📊</div>
        <div>Dashboard</div>
    </a>
    <a href="/users" class="dock-item active">
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

<!-- ============================================================ -->
<!-- MODAL: ADD / EDIT CUSTOMER -->
<!-- ============================================================ -->
<div class="modal-backdrop" id="modalUser">
    <div class="modal">
        <div class="sheet-handle"></div>
        <div class="modal-header">
            <div class="modal-title" id="muTitle">Add Customer</div>
            <button class="modal-close" onclick="closeModal('modalUser')">&times;</button>
        </div>

        <form id="formUser" onsubmit="handleUserSubmit(event)">
            <input type="hidden" id="fMode" value="create">
            <input type="hidden" id="fOriginalUsername">

            <div class="form-row">
                <div class="form-group">
                    <label>Username *</label>
                    <input type="text" id="fUsername" required placeholder="john123">
                </div>
                <div class="form-group">
                    <label>Password <span id="fPasswordRequired">*</span></label>
                    <input type="text" id="fPassword" placeholder="pass123">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" id="fName" placeholder="John Doe">
                </div>
                <div class="form-group">
                    <label>Phone / WhatsApp</label>
                    <input type="text" id="fPhone" placeholder="03001234567">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Subscribed Package (Plan) *</label>
                    <input type="text" id="fPackage" list="packageListOptions" required placeholder="e.g. 4 Mbps, 6 Mbps">
                    <datalist id="packageListOptions">
                        <option value="2 Mbps"></option>
                        <option value="4 Mbps"></option>
                        <option value="5 Mbps"></option>
                        <option value="6 Mbps"></option>
                        <option value="8 Mbps"></option>
                        <option value="10 Mbps"></option>
                        <option value="12 Mbps"></option>
                        <option value="15 Mbps"></option>
                        <option value="20 Mbps"></option>
                        <option value="25 Mbps"></option>
                        <option value="30 Mbps"></option>
                        <option value="50 Mbps"></option>
                    </datalist>
                </div>
                <div class="form-group">
                    <label>Assigned Router Profile *</label>
                    <select id="fProfile" required></select>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Monthly Price (Rs)</label>
                    <input type="number" id="fPrice" min="0" placeholder="1500">
                </div>
                <div class="form-group">
                    <label>Duration (Months)</label>
                    <select id="fMonths">
                        <option value="1">1 Month</option>
                        <option value="2">2 Months</option>
                        <option value="3">3 Months</option>
                        <option value="6">6 Months</option>
                        <option value="12">12 Months</option>
                    </select>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Start Date</label>
                    <input type="date" id="fStartDate">
                </div>
                <div class="form-group">
                    <label>Expiry Date</label>
                    <input type="date" id="fExpiryDate">
                </div>
            </div>

            <div class="form-group">
                <label>Notes / Address</label>
                <input type="text" id="fNotes" placeholder="e.g. Street 4, House 12">
            </div>

            <div class="error-banner" id="muError"></div>

            <div class="modal-footer">
                <button type="button" class="btn" onclick="closeModal('modalUser')">Cancel</button>
                <button type="submit" class="btn primary" id="muSaveBtn">Save Customer</button>
            </div>
        </form>
    </div>
</div>

<!-- ============================================================ -->
<!-- MODAL: RENEW CUSTOMER -->
<!-- ============================================================ -->
<div class="modal-backdrop" id="modalRenew">
    <div class="modal">
        <div class="sheet-handle"></div>
        <div class="modal-header">
            <div class="modal-title">⚡ Renew Subscription</div>
            <button class="modal-close" onclick="closeModal('modalRenew')">&times;</button>
        </div>

        <form id="formRenew" onsubmit="handleRenewSubmit(event)">
            <input type="hidden" id="rnUsername">

            <div class="form-group" style="background:#091224;padding:12px;border-radius:10px;border:1px solid var(--border);">
                <div style="font-size:12px;color:var(--text-muted);">Customer:</div>
                <div style="font-size:16px;font-weight:700;color:#fff;" id="rnCustomerName">–</div>
                <div style="font-size:12px;color:var(--text-dim);font-family:monospace;" id="rnUserTag">–</div>
                <div style="font-size:12px;color:#93c5fd;margin-top:4px;" id="rnCurrentExpiry"></div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Renew Duration</label>
                    <select id="rnMonths" onchange="updateRenewPreview()">
                        <option value="1">1 Month</option>
                        <option value="2">2 Months</option>
                        <option value="3">3 Months</option>
                        <option value="6">6 Months</option>
                        <option value="12">12 Months</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>New Expiry Date</label>
                    <input type="date" id="rnNewExpiry" required>
                </div>
            </div>

            <div class="error-banner" id="rnError"></div>

            <div class="modal-footer">
                <button type="button" class="btn" onclick="closeModal('modalRenew')">Cancel</button>
                <button type="submit" class="btn success" id="rnSaveBtn">⚡ Confirm Renewal</button>
            </div>
        </form>
    </div>
</div>

<!-- ============================================================ -->
<!-- MODAL: REMOTE ROUTER ACCESS -->
<!-- ============================================================ -->
<div class="modal-backdrop" id="modalRemote">
    <div class="modal" style="max-width:460px;">
        <div class="sheet-handle"></div>
        <div class="modal-header">
            <div class="modal-title">🌐 Customer Router Access</div>
            <button class="modal-close" onclick="closeModal('modalRemote')">&times;</button>
        </div>

        <div style="font-size:13.5px;color:var(--text-main);line-height:1.5;margin-bottom:14px;" id="remoteBody">
            Redirecting...
        </div>

        <div style="background:#091224;padding:12px;border-radius:10px;border:1px solid var(--border);margin-bottom:14px;" id="remoteInfoBox">
            <div style="font-size:12px;color:var(--text-muted);">Direct URL:</div>
            <a href="#" id="remoteUrlLink" target="_blank" style="font-size:15px;font-weight:700;color:var(--blue);word-break:break-all;">–</a>
            <div style="font-size:11.5px;color:var(--text-dim);margin-top:4px;" id="remoteIpInfo"></div>
        </div>

        <div class="modal-footer">
            <button type="button" class="btn" onclick="closeModal('modalRemote')">Done</button>
            <a href="#" id="remoteOpenBtn" target="_blank" class="btn primary">Open Router UI</a>
            <button type="button" class="btn danger" id="remoteCloseThisBtn">Close Rule</button>
        </div>
    </div>
</div>

<!-- ============================================================ -->
<!-- MODAL: CONFIRM ACTION -->
<!-- ============================================================ -->
<div class="modal-backdrop" id="modalConfirm">
    <div class="modal" style="max-width:440px;">
        <div class="sheet-handle"></div>
        <div class="modal-header">
            <div class="modal-title" id="mcTitle">Confirm Action</div>
            <button class="modal-close" onclick="closeModal('modalConfirm')">&times;</button>
        </div>

        <div style="font-size:14px;color:var(--text-main);line-height:1.5;margin-bottom:14px;" id="mcBody">
            Are you sure?
        </div>

        <div class="modal-footer">
            <button type="button" class="btn" onclick="closeModal('modalConfirm')">Cancel</button>
            <button type="button" class="btn primary" id="mcConfirmBtn">Confirm</button>
        </div>
    </div>
</div>

<!-- ============================================================ -->
<!-- MODAL: SEND WHATSAPP VIA OPENWA -->
<!-- ============================================================ -->
<div class="modal-backdrop" id="modalOpenWa">
    <div class="modal" style="max-width:480px;">
        <div class="sheet-handle"></div>
        <div class="modal-header">
            <div class="modal-title" id="mwaTitle">💬 Send WhatsApp via OpenWA</div>
            <button class="modal-close" onclick="closeModal('modalOpenWa')">&times;</button>
        </div>

        <form id="formOpenWa">
            <input type="hidden" id="waUsername">
            <input type="hidden" id="waCustomerId">

            <div class="form-group">
                <label>Recipient Phone</label>
                <input type="text" id="waPhone" required placeholder="03001234567">
            </div>

            <div class="form-group">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                    <label style="margin:0;">Template Preset</label>
                    <button type="button" class="btn sm" id="btnCycleWaVar" style="padding:2px 8px;font-size:11px;background:rgba(56,189,248,0.15);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);">🎲 Switch Sweet Variation</button>
                </div>
                <select id="waPreset">
                    <option value="expired">🌸 Sweet Late Reminder (5 Roman Urdu Variations)</option>
                    <option value="before">⏳ Before Expiry (3 Roman Urdu Variations)</option>
                    <option value="custom">✏️ Custom Message</option>
                </select>
            </div>

            <div class="form-group">
                <label>Message Content</label>
                <textarea id="waMessage" rows="6" required style="width:100%;font-family:inherit;font-size:13px;"></textarea>
            </div>

            <div class="error-banner" id="waError"></div>

            <div class="modal-footer">
                <button type="button" class="btn" onclick="closeModal('modalOpenWa')">Cancel</button>
                <button type="submit" class="btn success" id="waSubmitBtn">📤 Send WhatsApp</button>
            </div>
        </form>
    </div>
</div>

<!-- Toast -->
<div class="toast" id="toast"></div>

<!-- ============================================================ -->
<!-- CLIENT JAVASCRIPT ENGINE -->
<!-- ============================================================ -->
<script>

let usersList = [];
let profilesList = [];
let currentRenewUser = null;

const SPEED_PRICES_MAP = {
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
    "50": 8000
};

function autoSuggestPrice(pkgStr) {
    if (!pkgStr) return null;
    const match = String(pkgStr).match(/(d+(?:.d+)?)s*mb/i);
    if (!match) return null;
    const speed = String(Math.round(Number(match[1])));
    return SPEED_PRICES_MAP[speed] || null;
}

function localDateString(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
}

function fmtMoney(amount) {
    return "Rs " + Math.round(Number(amount || 0)).toLocaleString("en-PK");
}

function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function openModal(id) {
    document.getElementById(id).classList.add("open");
}

function closeModal(id) {
    document.getElementById(id).classList.remove("open");
}

let toastTimer = null;
function toast(message, kind) {
    const el = document.getElementById("toast");
    el.textContent = message;
    el.className = "toast show " + (kind || "info");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
        el.className = "toast";
    }, 3500);
}

async function api(url, options) {
    const res = await fetch(url, options);
    let data = null;
    try {
        data = await res.json();
    } catch (e) {
        data = null;
    }
    if (!res.ok) {
        throw new Error((data && data.error) || "Request failed (" + res.status + ")");
    }
    return data;
}

/*
| Load Profiles
*/
async function loadProfiles() {
    try {
        const data = await api("/api/profiles");
        profilesList = data.profiles || [];

        const selF = document.getElementById("fProfile");
        const selFilter = document.getElementById("packageFilter");

        selF.innerHTML = "";
        selFilter.innerHTML = '<option value="all">All Packages</option>';

        for (const p of profilesList) {
            const name = typeof p === "string" ? p : p.name;
            selF.innerHTML += '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>';
            selFilter.innerHTML += '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>';
        }
    } catch (e) {
        console.error("Profiles error:", e);
    }
}

/*
| Load Stats
*/
async function loadStats() {
    try {
        const data = await api("/api/stats");
        const s = data.stats || data || {};
        document.getElementById("stTotal").textContent = s.total !== undefined ? s.total : 0;
        document.getElementById("stActive").textContent = s.active !== undefined ? s.active : 0;
        document.getElementById("stExpiring").textContent = s.expiring !== undefined ? s.expiring : 0;
        document.getElementById("stExpired").textContent = (Number(s.expired) || 0) + (Number(s.disabled) || 0) + (Number(s.suspended) || 0);
        document.getElementById("stOnline").textContent = s.online !== undefined ? s.online : 0;
    } catch (e) {
        console.error("Stats error:", e);
    }
}

/*
| Load Customers
*/
async function loadUsers() {
    const q = document.getElementById("searchInput").value.trim();
    const status = document.getElementById("statusFilter").value;
    const pkg = document.getElementById("packageFilter").value;

    let url = "/api/users?search=" + encodeURIComponent(q) + "&status=" + encodeURIComponent(status) + "&package=" + encodeURIComponent(pkg);

    try {
        const data = await api(url);
        usersList = data.users || [];
        renderUsers();
    } catch (e) {
        toast("Failed to load customers: " + e.message, "error");
    }
}

function renderUsers() {
    const cardsList = document.getElementById("usersCardsList");
    const tbody = document.getElementById("usersTableBody");

    if (usersList.length === 0) {
        cardsList.innerHTML = '<div style="text-align:center;padding:36px;color:var(--text-dim);">No customer accounts found.</div>';
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-dim);">No customer accounts found.</td></tr>';
        return;
    }

    let cardsHtml = "";
    let tableHtml = "";

    for (const u of usersList) {
        const username = u.username;
        const password = (u.sql && u.sql.password) || u.password || "";
        const name = (u.sql && u.sql.name) || u.name || username;
        const phone = (u.sql && u.sql.phone) || u.phone || "";
        const pkg = (u.sql && (u.sql.package || u.sql.profile)) || u.package || (u.mikrotik && u.mikrotik.profile) || u.profile || "default";
        const profile = (u.mikrotik && u.mikrotik.profile) || (u.sql && u.sql.profile) || u.profile || pkg;
        const price = (u.sql && u.sql.price !== null && u.sql.price !== undefined) ? Number(u.sql.price) : (u.price !== null && u.price !== undefined ? Number(u.price) : 0);
        const expDate = (u.sql && u.sql.expiryDate) || u.expiry_date || u.expiryDate || "";
        const remDays = u.remainingDays !== undefined && u.remainingDays !== null ? u.remainingDays : (u.remaining_days !== undefined && u.remaining_days !== null ? u.remaining_days : null);
        const isDisabled = Boolean((u.mikrotik && u.mikrotik.disabled) || u.disabled || u.displayStatus === "disabled" || u.status === "disabled");
        const status = u.displayStatus || u.status || (isDisabled ? "disabled" : (u.expiryStatus || "active"));
        const isOnline = Boolean(u.online);
        const initial = name.charAt(0).toUpperCase();

        let statusBadge = "";
        if (isDisabled) {
            statusBadge = '<span class="badge red">DISABLED</span>';
        } else if (status === "expired") {
            statusBadge = '<span class="badge red">EXPIRED</span>';
        } else if (status === "expiring") {
            statusBadge = '<span class="badge amber">EXPIRING</span>';
        } else {
            statusBadge = '<span class="badge green">ACTIVE</span>';
        }

        let countdown = "–";
        if (remDays !== null && remDays !== undefined) {
            if (remDays < 0) {
                countdown = '<span style="color:#fb7185;font-weight:700;">' + Math.abs(remDays) + 'd ago</span>';
            } else if (remDays === 0) {
                countdown = '<span style="color:#fbbf24;font-weight:700;">Today</span>';
            } else {
                countdown = remDays + ' days left';
            }
        }

        // WhatsApp direct wa.me link
        const waLines = [
            "Assalam-o-Alaikum " + name + "!",
            "Your Internet Package: " + pkg,
            "Expiry Date: " + (expDate || "Pending"),
            "Monthly Fee: " + fmtMoney(price),
            "Kindly pay via EasyPaisa / JazzCash / Bank Transfer to keep your connection active."
        ];
        const waMsg = encodeURIComponent(waLines.join(String.fromCharCode(10)));
        const cleanPhone = String(phone || "").replace(/[^0-9]/g, "");
        const waUrl = cleanPhone ? "https://wa.me/" + (cleanPhone.startsWith("0") ? "92" + cleanPhone.slice(1) : cleanPhone) + "?text=" + waMsg : "";

        const profileBadgeHtml = (pkg.toLowerCase() !== profile.toLowerCase())
            ? '<span class="badge purple" title="Assigned router profile differs from billed package">⚡ ' + escapeHtml(profile) + '</span>'
            : '<span style="color:#c084fc;font-family:monospace;font-weight:600;">' + escapeHtml(profile) + '</span>';

        const passHtml = password
            ? ' · <span style="color:#38bdf8;font-family:monospace;font-weight:600;" title="Login Password">🔑 ' + escapeHtml(password) + '</span>'
            : '';

        // Mobile Card HTML
        cardsHtml +=
            '<div class="cust-card">' +
                '<div class="cc-top">' +
                    '<div class="cc-user">' +
                        '<div class="cc-avatar">' +
                            escapeHtml(initial) +
                            '<span class="cc-status-dot ' + (isOnline ? 'online' : 'offline') + '"></span>' +
                        '</div>' +
                        '<div>' +
                            '<div class="cc-name">' + escapeHtml(name) + '</div>' +
                            '<div class="cc-sub">' + escapeHtml(username) + (phone ? ' · ' + escapeHtml(phone) : '') + passHtml + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div>' + statusBadge + '</div>' +
                '</div>' +

                '<div class="cc-meta-grid">' +
                    '<div class="cc-chip">📦 Plan: <b>' + escapeHtml(pkg) + '</b></div>' +
                    '<div class="cc-chip">⚡ Router: <b>' + escapeHtml(profile) + '</b></div>' +
                    '<div class="cc-chip">💵 ' + fmtMoney(price) + '</div>' +
                    '<div class="cc-chip">📅 ' + (expDate || '–') + '</div>' +
                    '<div class="cc-chip" style="grid-column:1 / -1;">⏳ ' + countdown + '</div>' +
                '</div>' +

                '<div class="cc-actions-row">' +
                    '<button class="btn success sm" data-btn-renew="' + escapeHtml(username) + '">⚡ Renew</button>' +
                    '<button class="btn sm" data-btn-edit="' + escapeHtml(username) + '">✏️ Edit</button>' +
                    '<button class="btn sm" data-btn-kick="' + escapeHtml(username) + '" title="Kick / Disconnect session">⚡ Disconnect</button>' +
                    '<button class="btn sm remote-btn" data-btn-remote="' + escapeHtml(username) + '" title="Remote router access">🌐 Remote</button>' +
                    '<button class="btn ' + (isDisabled ? 'success' : 'danger') + ' sm" data-btn-toggle="' + escapeHtml(username) + '">' + (isDisabled ? '▶' : '⏸') + '</button>' +
                    '<a href="/money" class="btn sm" title="Open DigiKhata">💳</a>' +
                    '<button class="btn sm whatsapp-btn" data-btn-openwa="' + escapeHtml(username) + '" title="Send WhatsApp via OpenWA">💬 WA</button>' +
                '</div>' +
            '</div>';

        // Desktop Table Row HTML
        tableHtml +=
            '<tr>' +
                '<td>' +
                    '<div style="font-weight:700;">' + escapeHtml(name) + '</div>' +
                    '<div style="font-size:12px;color:var(--text-dim);font-family:monospace;">' + escapeHtml(username) + (phone ? ' · ' + escapeHtml(phone) : '') + passHtml + '</div>' +
                '</td>' +
                '<td>' +
                    '<span class="badge blue">📦 ' + escapeHtml(pkg) + '</span> ' +
                    '<span style="font-weight:700;margin-left:4px;">' + fmtMoney(price) + '</span>' +
                '</td>' +
                '<td>' +
                    profileBadgeHtml +
                '</td>' +
                '<td>' +
                    '<div>' + (expDate || '–') + '</div>' +
                    '<div style="font-size:11.5px;">' + countdown + '</div>' +
                '</td>' +
                '<td>' +
                    '<div style="display:flex;flex-direction:column;gap:3px;">' +
                        '<span class="badge ' + (isOnline ? 'green' : 'blue') + '">' + (isOnline ? '🟢 Online' : 'Offline') + '</span>' +
                        statusBadge +
                    '</div>' +
                '</td>' +
                '<td style="text-align:right;">' +
                    '<div style="display:inline-flex;gap:4px;">' +
                        '<button class="btn success sm" data-btn-renew="' + escapeHtml(username) + '">Renew</button>' +
                        '<button class="btn sm" data-btn-edit="' + escapeHtml(username) + '">Edit</button>' +
                        '<button class="btn sm" data-btn-kick="' + escapeHtml(username) + '" title="Kick session">Disconnect</button>' +
                        '<button class="btn sm remote-btn" data-btn-remote="' + escapeHtml(username) + '" title="Remote router access">Remote</button>' +
                        '<button class="btn ' + (isDisabled ? 'success' : 'danger') + ' sm" data-btn-toggle="' + escapeHtml(username) + '">' + (isDisabled ? 'Enable' : 'Disable') + '</button>' +
                        '<a href="/money" class="btn sm">Khata</a>' +
                        '<button class="btn sm whatsapp-btn" data-btn-openwa="' + escapeHtml(username) + '" title="Send WhatsApp via OpenWA Gateway">💬 WA</button>' +
                    '</div>' +
                '</td>' +
            '</tr>';
    }

    cardsList.innerHTML = cardsHtml;
    tbody.innerHTML = tableHtml;

    // Safely attach event listeners
    document.querySelectorAll("[data-btn-renew]").forEach(function (btn) {
        btn.addEventListener("click", function () { openRenewModal(btn.getAttribute("data-btn-renew")); });
    });
    document.querySelectorAll("[data-btn-edit]").forEach(function (btn) {
        btn.addEventListener("click", function () { openEditModal(btn.getAttribute("data-btn-edit")); });
    });
    document.querySelectorAll("[data-btn-kick]").forEach(function (btn) {
        btn.addEventListener("click", function () { kickUserSession(btn.getAttribute("data-btn-kick")); });
    });
    document.querySelectorAll("[data-btn-remote]").forEach(function (btn) {
        btn.addEventListener("click", function () { openRemoteAccess(btn.getAttribute("data-btn-remote")); });
    });
    document.querySelectorAll("[data-btn-toggle]").forEach(function (btn) {
        btn.addEventListener("click", function () { toggleUserStatus(btn.getAttribute("data-btn-toggle")); });
    });
    document.querySelectorAll("[data-btn-openwa]").forEach(function (btn) {
        btn.addEventListener("click", function () { openWaModal(btn.getAttribute("data-btn-openwa")); });
    });
}

/*
| Add Customer Modal
*/
document.getElementById("btnAdd").addEventListener("click", function () {
    document.getElementById("muTitle").textContent = "Add Customer";
    document.getElementById("fMode").value = "create";
    document.getElementById("fOriginalUsername").value = "";
    document.getElementById("fUsername").value = "";
    document.getElementById("fUsername").disabled = false;
    document.getElementById("fPassword").value = "";
    document.getElementById("fPassword").required = true;
    document.getElementById("fPasswordRequired").textContent = "*";
    document.getElementById("fName").value = "";
    document.getElementById("fPhone").value = "";
    document.getElementById("fPackage").value = "";
    document.getElementById("fPrice").value = "";
    document.getElementById("fNotes").value = "";
    document.getElementById("fStartDate").value = localDateString(new Date());
    document.getElementById("fMonths").value = "1";
    document.getElementById("muError").style.display = "none";
    updateExpiryPreview();
    openModal("modalUser");
});

// Auto fill price and profile when package changes
document.getElementById("fPackage").addEventListener("input", function () {
    const pkg = this.value.trim();
    const suggested = autoSuggestPrice(pkg);
    const priceInput = document.getElementById("fPrice");
    if (suggested && (!priceInput.value || priceInput.dataset.autoFilled === "true")) {
        priceInput.value = suggested;
        priceInput.dataset.autoFilled = "true";
    }

    // Attempt to match matching profile if not manually selected
    const profileSelect = document.getElementById("fProfile");
    for (let i = 0; i < profileSelect.options.length; i++) {
        const optVal = profileSelect.options[i].value.toLowerCase();
        if (optVal && pkg.toLowerCase().includes(optVal)) {
            profileSelect.selectedIndex = i;
            break;
        }
    }
});

document.getElementById("fPrice").addEventListener("input", function () {
    this.dataset.autoFilled = "false";
});

/*
| Edit Customer Modal
*/
function openEditModal(username) {
    const u = usersList.find(function (x) { return x.username === username; });
    if (!u) return;

    const name = (u.sql && u.sql.name) || u.name || "";
    const phone = (u.sql && u.sql.phone) || u.phone || "";
    const pkg = (u.sql && (u.sql.package || u.sql.profile)) || u.package || (u.mikrotik && u.mikrotik.profile) || u.profile || "";
    const profile = (u.mikrotik && u.mikrotik.profile) || (u.sql && u.sql.profile) || u.profile || pkg;
    const price = (u.sql && u.sql.price !== null && u.sql.price !== undefined) ? u.sql.price : (u.price !== null && u.price !== undefined ? u.price : "");
    const notes = (u.sql && u.sql.comment) || u.notes || u.comment || "";
    const startDate = (u.sql && u.sql.startDate) || u.start_date || u.startDate || localDateString(new Date());
    const expiryDate = (u.sql && u.sql.expiryDate) || u.expiry_date || u.expiryDate || "";

    const userPass = (u.sql && u.sql.password) || u.password || "";
    document.getElementById("muTitle").textContent = "Edit " + u.username;
    document.getElementById("fMode").value = "edit";
    document.getElementById("fOriginalUsername").value = u.username;
    document.getElementById("fUsername").value = u.username;
    document.getElementById("fUsername").disabled = false;
    document.getElementById("fPassword").value = userPass;
    document.getElementById("fPassword").required = false;
    document.getElementById("fPasswordRequired").textContent = "(plain password)";
    document.getElementById("fName").value = name;
    document.getElementById("fPhone").value = phone;
    document.getElementById("fPackage").value = pkg;
    document.getElementById("fProfile").value = profile;
    document.getElementById("fPrice").value = price;
    document.getElementById("fNotes").value = notes;
    document.getElementById("fStartDate").value = String(startDate).slice(0, 10);
    document.getElementById("fExpiryDate").value = String(expiryDate).slice(0, 10);
    document.getElementById("muError").style.display = "none";
    openModal("modalUser");
}

function openWaModal(username) {
    const u = usersList.find(function (x) { return x.username === username; });
    if (!u) return;

    const name = (u.sql && u.sql.name) || u.name || username;
    const phone = (u.sql && u.sql.phone) || u.phone || "";
    const password = (u.sql && u.sql.password) || u.password || "";
    const pkg = (u.sql && (u.sql.package || u.sql.profile)) || u.package || (u.mikrotik && u.mikrotik.profile) || u.profile || "Internet";
    const price = (u.sql && u.sql.price !== null && u.sql.price !== undefined) ? Number(u.sql.price) : (u.price !== null && u.price !== undefined ? Number(u.price) : 0);
    const expDate = (u.sql && u.sql.expiryDate) || u.expiry_date || u.expiryDate || "N/A";

    document.getElementById("waUsername").value = username;
    document.getElementById("waCustomerId").value = (u.sql && u.sql.id) || u.id || "";
    document.getElementById("waPhone").value = phone;
    document.getElementById("waError").style.display = "none";

    let expiredVarIndex = 0;
    let beforeVarIndex = 0;

    const sweetExpiredVars = [
        [
            "Assalam-o-Alaikum Pyare " + name + " Sahab! 🌸",
            "Umeed hai aap aur aapke ahl-e-khana khairiyat se honge.",
            "Aap hamare intihai muhtaram aur qeemti customer hain.",
            "Ek choti si guzarish thi ke aapke internet package (" + pkg + ") ki renewal date (" + expDate + ") guzar chuki hai aur payment thori late ho gayi hai.",
            "Aapki asani ke liye hum ne aapka internet band nahi kiya taake aapka kaam na ruke.",
            "Baraye meharbani waqt nikal kar monthly bill Rs. " + price + " ada farma dein taake service tasalsul se chalti rahe.",
            "Account ID: " + username,
            "Agar aap payment jama karwa chuke hain to shukriya aur is message ko nazar-andaz farmaiye.",
            "JazakAllah Khair! ❤️"
        ].join("\\n"),
        [
            "Salam " + name + " Bhai! Kaise hain aap? 🌺",
            "Aapki dosti aur hamare network se wabastagi hamare liye bohot qeemti hai.",
            "Aapko pyar bhara reminder dena tha ke aapka internet account (" + username + ") ka package " + expDate + " ko complete ho chuka hai aur bill thora late chal raha hai.",
            "Aapki izzat hamare sar ankhon par hai, is liye net bilkul on rakha hua hai.",
            "Jab bhi aapko asani ho, please bill amount Rs. " + price + " send farma dein taake hamara rabta hamesha mazboot rahe.",
            "Package: " + pkg,
            "Bohot shukriya aapke taawun ka! ✨"
        ].join("\\n"),
        [
            "Assalam-o-Alaikum Janab " + name + " Sahab! 🌟",
            "Dua hai ke aapka din khair-o-aafiyat se guzre.",
            "Shayad masroofiyat ki waja se zehan se nikal gaya ho, aapke internet (" + username + ") ki due date (" + expDate + ") guzar chuki hai aur payment thori late ho gayi hai.",
            "Hum ne connection disconnect nahi kiya kyun ke aap hamare qabil-e-ehtiram sarif hain.",
            "Baraye karam jaise hi waqt mile, package charges Rs. " + price + " clear farma dein taake bina rukawat tez net chalta rahe.",
            "Kisi bhi masle ya help ke liye hum har waqt hazir hain. Shukriya! 🙏"
        ].join("\\n"),
        [
            "Moazziz Customer " + name + ", Assalam-o-Alaikum! 💐",
            "Aapka aetimad hamara sab se bara sarmaya hai.",
            "Aapke internet package (" + pkg + ") ki tareekh " + expDate + " ko mukammal ho gayi thi.",
            "Aapki sahulat ke paish-e-nazar internet service continuously chal rahi hai taake aap preshan na hon.",
            "Baraye meharbani apne account (" + username + ") ka renewal bill Rs. " + price + " jald ada farma dein taake connection isi terhan active rahe.",
            "Aapke qeemti waqt aur taawun ke hum dil se mashkoor hain. Allah aapko khush rakhe! 🌸"
        ].join("\\n"),
        [
            "Assalam-o-Alaikum " + name + "! 😊",
            "Umeed hai aap theek-thaak honge.",
            "Aapka internet bill Rs. " + price + " thora late ho chuka hai (Due date: " + expDate + ").",
            "Aap hamare bohot achhe sarif hain, is liye hum ne net band nahi kiya taake aapka net chalta rahe.",
            "Please free ho kar bill payment transfer kar dein taake service bar-waqt renew ho sake.",
            "Username: " + username + " | Package: " + pkg,
            "Bohat shukriya aapke pyar aur taawun ka! ✨"
        ].join("\\n")
    ];

    const sweetBeforeVars = [
        [
            "Assalam-o-Alaikum Pyare " + name + " Sahab! 🌸",
            "Umeed hai aap khairiyat se honge.",
            "Aapka internet package (" + pkg + ") " + expDate + " ko renew hona hai (baqi " + Math.max(0, u.remainingDays || 0) + " din).",
            "Baraye meharbani waqt par renewal Rs. " + price + " karwa lein taake aapka internet bina kisi waqfe ke chalta rahe.",
            "Username: " + username,
            "Aapka bohot shukriya! ❤️"
        ].join("\\n"),
        [
            "Moazziz " + name + " Sahab, Salam-o-Alaikum! 🌺",
            "Aapki behtareen service hamari pehli koshish hai.",
            "Ek meetha sa reminder ke aapke internet account (" + username + ") ki package validity " + expDate + " ko khatam ho rahi hai.",
            "Package: " + pkg + " | Renewal Charges: Rs. " + price,
            "Barahe meharbani advance payment jama karwa dein taake tez-tareen speed barqarar rahe. JazakAllah! ✨"
        ].join("\\n"),
        [
            "Assalam-o-Alaikum " + name + " Bhai! 🌟",
            "Kaise hain aap? Aapke internet connection ki due date " + expDate + " bohot qareeb hai (" + Math.max(0, u.remainingDays || 0) + " din baqi).",
            "Aapka connection bina rukawat chalta rahe, is liye baraye meharbani bill Rs. " + price + " waqt par jama karwa lein.",
            "Aapka aetimad hi hamari pehchan hai. Bohat shukriya! 🙏"
        ].join("\\n")
    ];

    function updatePreview(preset) {
        if (preset === "before") {
            document.getElementById("waMessage").value = sweetBeforeVars[beforeVarIndex % sweetBeforeVars.length];
        } else if (preset === "expired") {
            document.getElementById("waMessage").value = sweetExpiredVars[expiredVarIndex % sweetExpiredVars.length];
        }
    }

    const presetEl = document.getElementById("waPreset");
    presetEl.value = (u.status === "expired" || u.remainingDays < 0) ? "expired" : "before";
    updatePreview(presetEl.value);

    presetEl.onchange = function () {
        updatePreview(this.value);
    };

    const cycleBtn = document.getElementById("btnCycleWaVar");
    if (cycleBtn) {
        cycleBtn.onclick = function() {
            if (presetEl.value === "expired") {
                expiredVarIndex = (expiredVarIndex + 1) % sweetExpiredVars.length;
                updatePreview("expired");
                toast("Switched to Sweet Variation #" + (expiredVarIndex + 1), "info");
            } else if (presetEl.value === "before") {
                beforeVarIndex = (beforeVarIndex + 1) % sweetBeforeVars.length;
                updatePreview("before");
                toast("Switched to Advance Reminder #" + (beforeVarIndex + 1), "info");
            }
        };
    }

    openModal("modalOpenWa");
}

document.getElementById("formOpenWa").addEventListener("submit", async function (e) {
    e.preventDefault();
    const btn = document.getElementById("waSubmitBtn");
    const errEl = document.getElementById("waError");
    btn.disabled = true;
    btn.textContent = "Sending...";
    errEl.style.display = "none";

    try {
        await api("/api/whatsapp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                phone: document.getElementById("waPhone").value.trim(),
                message: document.getElementById("waMessage").value.trim(),
                username: document.getElementById("waUsername").value,
                customerId: document.getElementById("waCustomerId").value || undefined,
                type: document.getElementById("waPreset").value === "before" ? "before_expiry" : (document.getElementById("waPreset").value === "expired" ? "expired" : "manual")
            })
        });

        toast("WhatsApp sent successfully via OpenWA!", "success");
        closeModal("modalOpenWa");
    } catch (err) {
        errEl.textContent = err.message || "Failed to send message";
        errEl.style.display = "block";
    } finally {
        btn.disabled = false;
        btn.textContent = "📤 Send WhatsApp";
    }
});

function updateExpiryPreview() {
    const startVal = document.getElementById("fStartDate").value;
    const months = Number(document.getElementById("fMonths").value) || 1;
    if (!startVal) return;

    const d = new Date(startVal);
    d.setMonth(d.getMonth() + months);
    document.getElementById("fExpiryDate").value = localDateString(d);
}

document.getElementById("fMonths").addEventListener("change", updateExpiryPreview);
document.getElementById("fStartDate").addEventListener("change", updateExpiryPreview);

async function handleUserSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById("muSaveBtn");
    btn.disabled = true;

    const mode = document.getElementById("fMode").value;
    const origUsername = document.getElementById("fOriginalUsername").value;
    const username = document.getElementById("fUsername").value.trim();
    const password = document.getElementById("fPassword").value.trim();
    const name = document.getElementById("fName").value.trim();
    const phone = document.getElementById("fPhone").value.trim();
    const pkg = document.getElementById("fPackage").value.trim() || document.getElementById("fProfile").value;
    const profile = document.getElementById("fProfile").value || pkg;
    const price = Number(document.getElementById("fPrice").value) || 0;
    const startDate = document.getElementById("fStartDate").value;
    const expiryDate = document.getElementById("fExpiryDate").value;
    const notes = document.getElementById("fNotes").value.trim();

    try {
        if (mode === "create") {
            await api("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: username,
                    password: password,
                    name: name,
                    phone: phone,
                    profile: profile,
                    package: pkg,
                    price: price,
                    startDate: startDate,
                    expiryDate: expiryDate,
                    notes: notes,
                    comment: notes,
                }),
            });
            toast("Customer created successfully!", "success");
        } else {
            await api("/api/users/" + encodeURIComponent(origUsername || username), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: username,
                    password: password || undefined,
                    name: name,
                    phone: phone,
                    profile: profile,
                    package: pkg,
                    price: price,
                    startDate: startDate,
                    expiryDate: expiryDate,
                    notes: notes,
                    comment: notes,
                }),
            });
            toast("Customer updated successfully!", "success");
        }

        closeModal("modalUser");
        loadUsers();
        loadStats();
    } catch (err) {
        const errEl = document.getElementById("muError");
        errEl.textContent = err.message;
        errEl.style.display = "block";
    } finally {
        btn.disabled = false;
    }
}

/*
| Renew Customer Modal
*/
function openRenewModal(username) {
    const u = usersList.find(function (x) { return x.username === username; });
    if (!u) return;

    currentRenewUser = u;
    const name = (u.sql && u.sql.name) || u.name || u.username;
    const pkg = (u.sql && (u.sql.package || u.sql.profile)) || u.package || (u.mikrotik && u.mikrotik.profile) || u.profile || "default";
    const expiryDate = (u.sql && u.sql.expiryDate) || u.expiry_date || u.expiryDate || "";

    document.getElementById("rnUsername").value = u.username;
    document.getElementById("rnCustomerName").textContent = name;
    document.getElementById("rnUserTag").textContent = u.username + " (" + pkg + ")";
    document.getElementById("rnCurrentExpiry").textContent = "Current Expiry: " + (expiryDate || "Not set");
    document.getElementById("rnMonths").value = "1";
    document.getElementById("rnError").style.display = "none";

    updateRenewPreview();
    openModal("modalRenew");
}

function updateRenewPreview() {
    if (!currentRenewUser) return;
    const months = Number(document.getElementById("rnMonths").value) || 1;
    const expDate = (currentRenewUser.sql && currentRenewUser.sql.expiryDate) || currentRenewUser.expiry_date || currentRenewUser.expiryDate || "";

    let base = new Date();
    if (expDate) {
        const cur = new Date(expDate);
        if (!isNaN(cur.getTime()) && cur > base) {
            base = cur;
        }
    }
    base.setMonth(base.getMonth() + months);
    document.getElementById("rnNewExpiry").value = localDateString(base);
}

async function handleRenewSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById("rnSaveBtn");
    btn.disabled = true;

    const username = document.getElementById("rnUsername").value;
    const months = Number(document.getElementById("rnMonths").value);
    const newExpiry = document.getElementById("rnNewExpiry").value;

    try {
        await api("/api/users/" + encodeURIComponent(username) + "/renew", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ months: months, expiryDate: newExpiry, new_expiry_date: newExpiry }),
        });
        toast("Subscription renewed for " + username + "!", "success");
        closeModal("modalRenew");
        loadUsers();
        loadStats();
    } catch (err) {
        const errEl = document.getElementById("rnError");
        errEl.textContent = err.message;
        errEl.style.display = "block";
    } finally {
        btn.disabled = false;
    }
}

/*
| Kick / Disconnect Session
*/
async function kickUserSession(username) {
    try {
        const res = await api("/api/users/" + encodeURIComponent(username) + "/kick", { method: "POST" });
        toast("Disconnected " + (res.kicked || 1) + " live session(s) for " + username, "info");
        loadUsers();
        loadStats();
    } catch (e) {
        toast("Disconnect failed: " + e.message, "error");
    }
}

/*
| Remote Router Access
*/
async function openRemoteAccess(username) {
    try {
        toast("Opening remote access for " + username + "...", "info");
        const res = await api("/api/users/" + encodeURIComponent(username) + "/remote", { method: "POST" });
        
        document.getElementById("remoteBody").innerHTML =
            'Remote access rule created on MikroTik for <b>' + escapeHtml(username) + '</b>.<br>Port <b>' + res.port + '</b> is now forwarded to customer IP <b>' + res.ip + '</b>.';
        
        document.getElementById("remoteUrlLink").href = res.url;
        document.getElementById("remoteUrlLink").textContent = res.url;
        document.getElementById("remoteOpenBtn").href = res.url;
        document.getElementById("remoteIpInfo").textContent = "Customer Router IP: " + res.ip;
        
        document.getElementById("remoteCloseThisBtn").onclick = async function () {
            closeModal("modalRemote");
            await closeRemoteAccessRules();
        };

        openModal("modalRemote");
        window.open(res.url, "_blank");
    } catch (e) {
        toast("Remote access error: " + e.message, "error");
    }
}

async function closeRemoteAccessRules() {
    try {
        const res = await api("/api/remote/close", { method: "POST" });
        toast("Remote access closed (" + (res.removed || 0) + " rules removed)", "success");
    } catch (e) {
        toast("Close failed: " + e.message, "error");
    }
}

document.getElementById("btnRemoteClose").addEventListener("click", closeRemoteAccessRules);

/*
| Toggle Disable / Enable / Suspend
*/
async function toggleUserStatus(username) {
    const u = usersList.find(function (x) { return x.username === username; });
    if (!u) return;

    const isDisabled = Boolean((u.mikrotik && u.mikrotik.disabled) || u.disabled || u.displayStatus === "disabled" || u.status === "disabled");
    const action = isDisabled ? "activate" : "suspend";
    try {
        await api("/api/users/" + encodeURIComponent(username) + "/" + action, { method: "POST" });
        toast("Customer " + (isDisabled ? "activated" : "suspended"), "info");
        loadUsers();
        loadStats();
    } catch (e) {
        toast("Failed: " + e.message, "error");
    }
}

/*
| Sync & Import
*/
document.getElementById("btnSync").addEventListener("click", async function () {
    const btn = document.getElementById("btnSync");
    btn.disabled = true;
    btn.textContent = "⏳ Syncing...";
    try {
        const res = await api("/api/sync", { method: "POST" });
        const s = res.summary || res;
        toast("Sync complete! " + (s.inserted || 0) + " added, " + (s.updated || 0) + " updated from MikroTik", "success");
        loadProfiles();
        loadUsers();
        loadStats();
    } catch (e) {
        toast("Sync failed: " + e.message, "error");
    } finally {
        btn.disabled = false;
        btn.textContent = "⚡ Auto Sync";
    }
});

document.getElementById("btnImport").addEventListener("click", function () {
    document.getElementById("mcTitle").textContent = "Import from MikroTik";
    document.getElementById("mcBody").textContent = "Import all PPPoE secrets from router into the local database? New users will be added with default 1-month validity and profile packages, while existing names and custom prices will remain preserved.";
    document.getElementById("mcConfirmBtn").onclick = async function () {
        closeModal("modalConfirm");
        try {
            const res = await api("/api/import", { method: "POST" });
            const s = res.summary || res;
            toast("Import done: " + (s.inserted || 0) + " added, " + (s.updated || 0) + " updated", "success");
            loadProfiles();
            loadUsers();
            loadStats();
        } catch (e) {
            toast("Import failed: " + e.message, "error");
        }
    };
    openModal("modalConfirm");
});

/*
| Search and Filter triggers
*/
let searchTimer = null;
document.getElementById("searchInput").addEventListener("input", function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadUsers, 250);
});
document.getElementById("statusFilter").addEventListener("change", loadUsers);
document.getElementById("packageFilter").addEventListener("change", loadUsers);

/*
| Initial Load
*/
loadProfiles();
loadUsers();
loadStats();

</script>
</body>
</html>`;

    res.send(html);
}

module.exports = { renderUsersPage };
