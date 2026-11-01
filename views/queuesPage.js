/*
|--------------------------------------------------------------------------
| Bandwidth Booster & Queue Monitor (Parent & Child Queues)
|--------------------------------------------------------------------------
| Shows real-time CIR (Committed Information Rate) vs MIR (Maximum Burstable Rate),
| live user throughput, extra speed gained from the parent bandwidth pool,
| and highlights congested/capped users in RED at the top ("Need More Speed").
|--------------------------------------------------------------------------
*/

function renderQueuesPage(req, res) {
    const html = `<!DOCTYPE html>
<html lang="en">

<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#080c15">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="mobile-web-app-capable" content="yes">
<title>Bandwidth Booster &amp; Queues – MikroTik Panel</title>
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
    --green-bg: rgba(16, 185, 129, 0.15);
    --red: #f43f5e;
    --red-bg: rgba(244, 63, 94, 0.16);
    --red-border: rgba(244, 63, 94, 0.45);
    --amber: #f59e0b;
    --amber-bg: rgba(245, 158, 11, 0.15);
    --blue: #38bdf8;
    --blue-bg: rgba(56, 189, 248, 0.15);
    --purple: #a855f7;
    --purple-bg: rgba(168, 85, 247, 0.15);
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

/* App Bar & Navigation */

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
    padding: 7px 14px;
    border-radius: 8px;
    font-size: 13px;
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

/* Bottom Navigation Dock (Mobile) */

.bottom-dock {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: calc(62px + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
    background: rgba(10, 15, 26, 0.94);
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
    font-size: 10.5px;
    font-weight: 600;
    flex: 1;
    height: 100%;
    transition: all 0.15s ease;
}

.dock-item .dock-icon {
    font-size: 19px;
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

/* Page Header & Live Status */

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
    padding: 5px 8px;
    font-size: 11.5px;
    border-radius: 7px;
}

.btn-flex-1 {
    flex: 1;
}

/* Parent Bandwidth Pool Banner */

.parent-pool-card {
    background: linear-gradient(135deg, #0f172a, #1e293b);
    border: 1px solid rgba(56, 189, 248, 0.3);
    border-radius: 16px;
    padding: 16px 18px;
    margin-bottom: 18px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
}

.pool-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 12px;
}

.pool-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 800;
    color: #fff;
}

.pool-badge {
    background: rgba(56, 189, 248, 0.2);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.4);
    border-radius: 20px;
    padding: 3px 10px;
    font-size: 12px;
    font-weight: 700;
}

.pool-controls {
    display: flex;
    align-items: center;
    gap: 8px;
}

.pool-progress-bar-bg {
    width: 100%;
    height: 12px;
    background: rgba(10, 17, 32, 0.8);
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid var(--border);
    margin-bottom: 12px;
    position: relative;
}

.pool-progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #10b981 0%, #38bdf8 60%, #f59e0b 85%, #f43f5e 100%);
    width: 0%;
    transition: width 0.3s ease;
}

.pool-metrics-row {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
}

@media (min-width: 768px) {
    .pool-metrics-row {
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
    }
}

.pool-metric-item {
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 8px 12px;
}

.pmi-label {
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 600;
}

.pmi-val {
    font-size: 18px;
    font-weight: 800;
    margin-top: 2px;
}

/* Stats Chips Grid */

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

.stat-card.capped::before   { background: var(--red); }
.stat-card.boosting::before { background: var(--green); }
.stat-card.normal::before   { background: var(--blue); }
.stat-card.extra::before    { background: var(--purple); }
.stat-card.online::before   { background: var(--amber); }

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

.stat-val.red    { color: #fb7185; }
.stat-val.green  { color: #34d399; }
.stat-val.blue   { color: #38bdf8; }
.stat-val.purple { color: #c084fc; }
.stat-val.amber  { color: #fbbf24; }

/* Toolbar & Filters */

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

select, input {
    background: var(--bg-input);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 8px 12px;
    color: var(--text-main);
    font-size: 13px;
    outline: none;
}

/* User Cards (Mobile) */

.queue-cards-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.q-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: all 0.15s ease;
    position: relative;
}

/* Congested / Capped Highlight in RED */
.q-card.is-capped {
    border: 1px solid var(--red-border);
    background: linear-gradient(135deg, rgba(244, 63, 94, 0.08), #111a2e);
    box-shadow: 0 4px 20px rgba(244, 63, 94, 0.15);
}

.q-card.is-capped::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: var(--red);
    border-radius: 14px 0 0 14px;
}

.qc-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
}

.qc-user {
    display: flex;
    align-items: center;
    gap: 10px;
}

.qc-avatar {
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
    flex-shrink: 0;
}

.qc-avatar.capped-av {
    background: linear-gradient(135deg, #881337, #e11d48);
    color: #fff;
    border-color: #fda4af;
}

.qc-name {
    font-size: 15px;
    font-weight: 700;
    color: #f1f5f9;
}

.qc-sub {
    font-size: 12px;
    color: var(--text-dim);
    font-family: Consolas, monospace;
}

.qc-speed-display {
    text-align: right;
}

.qc-speed-val {
    font-size: 18px;
    font-weight: 800;
    font-family: Consolas, monospace;
}

.qc-speed-val.red    { color: #fb7185; }
.qc-speed-val.green  { color: #34d399; }
.qc-speed-val.blue   { color: #38bdf8; }
.qc-speed-val.dim    { color: #64748b; }

.qc-meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    background: rgba(10, 17, 32, 0.6);
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 12px;
}

.qc-chip {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--text-muted);
}

.util-bar-bg {
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 3px;
    overflow: hidden;
    margin-top: 4px;
}

.util-bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.2s ease;
}

.util-bar-fill.red   { background: #f43f5e; }
.util-bar-fill.green { background: #10b981; }
.util-bar-fill.blue  { background: #38bdf8; }

.qc-actions-row {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.qc-actions-row .btn {
    flex: 1;
    min-width: 58px;
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
    .queue-cards-list {
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

tr.tr-capped {
    background: rgba(244, 63, 94, 0.07);
}

tr.tr-capped td {
    border-bottom: 1px solid rgba(244, 63, 94, 0.2);
}

.badge {
    font-size: 11px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 12px;
    display: inline-block;
}

.badge.green  { background: var(--green-bg); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.3); }
.badge.red    { background: var(--red-bg); color: #fda4af; border: 1px solid rgba(244, 63, 94, 0.4); }
.badge.amber  { background: var(--amber-bg); color: #fde68a; }
.badge.blue   { background: var(--blue-bg); color: #bae6fd; }
.badge.purple { background: var(--purple-bg); color: #e9d5ff; }

/* Slide-Up Modals */

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
    max-width: 600px;
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

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
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

.code-box {
    background: #070b14;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px;
    font-family: Consolas, monospace;
    font-size: 12px;
    color: #38bdf8;
    max-height: 280px;
    overflow-y: auto;
    white-space: pre;
    line-height: 1.5;
}

.modal-footer {
    display: flex;
    gap: 8px;
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--border);
}

.modal-footer .btn {
    flex: 1;
    padding: 11px;
    font-size: 13.5px;
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
            <div class="brand-icon">⚡</div>
            <div>
                <div class="brand-title">MikroTik Queue &amp; Booster</div>
                <div class="brand-sub">CIR vs MIR &amp; Bandwidth Optimizer</div>
            </div>
        </div>

        <nav class="desktop-nav">
            <a href="/">📊 Dashboard</a>
            <a href="/users">👥 Customers</a>
            <a href="/queues" class="active">⚡ Booster</a>
            <a href="/money">💳 DigiKhata</a>
            <a href="/top-users">🏆 Top Users</a>
            <a href="/whatsapp">💬 WhatsApp</a>
            <a href="/logout" style="color:#fda4af;" title="Sign out">🚪 Logout</a>
        </nav>
    </header>

    <!-- Page Header & Actions -->
    <div class="page-header">
        <div class="header-title-block">
            <h1>⚡ Live Booster &amp; Queues</h1>
            <p>Monitors Committed Rate (CIR) vs Burstable Limit (MIR) &amp; extra speeds</p>
        </div>

        <div class="header-btn-row">
            <button class="btn btn-flex-1" id="btnScriptModal">
                📋 RouterOS Script Generator
            </button>
            <button class="btn primary btn-flex-1" id="btnRefreshNow">
                🔄 Live Refresh
            </button>
        </div>
    </div>

    <!-- Parent Bandwidth Pool Card -->
    <div class="parent-pool-card">
        <div class="pool-header">
            <div class="pool-title">
                <span>🌐 Total Parent Bandwidth Pool</span>
                <span class="pool-badge" id="poolBadge">190 Mbps Pool</span>
            </div>

            <div class="pool-controls">
                <span style="font-size:12px;color:var(--text-muted);">Parent Limit:</span>
                <select id="parentLimitSelect" style="padding:4px 8px;font-size:12.5px;">
                    <option value="100">100 Mbps</option>
                    <option value="150">150 Mbps</option>
                    <option value="190" selected>190 Mbps</option>
                    <option value="200">200 Mbps</option>
                    <option value="250">250 Mbps</option>
                    <option value="300">300 Mbps</option>
                    <option value="500">500 Mbps</option>
                    <option value="1000">1 Gbps</option>
                </select>
            </div>
        </div>

        <div class="pool-progress-bar-bg">
            <div class="pool-progress-bar-fill" id="poolFillBar"></div>
        </div>

        <div class="pool-metrics-row">
            <div class="pool-metric-item">
                <div class="pmi-label">Current ISP Traffic</div>
                <div class="pmi-val" style="color:#38bdf8;" id="poolUsedMbps">0.00 Mbps</div>
            </div>
            <div class="pool-metric-item">
                <div class="pmi-label">Free Booster Headroom</div>
                <div class="pmi-val" style="color:#34d399;" id="poolFreeMbps">190.00 Mbps</div>
            </div>
            <div class="pool-metric-item">
                <div class="pmi-label">Extra Speed Given</div>
                <div class="pmi-val" style="color:#c084fc;" id="poolExtraMbps">+0.00 Mbps</div>
            </div>
            <div class="pool-metric-item">
                <div class="pmi-label">Pool Utilization</div>
                <div class="pmi-val" style="color:#fbbf24;" id="poolPercent">0%</div>
            </div>
        </div>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
        <div class="stat-card capped">
            <div class="stat-label">🚨 Need More / Capped</div>
            <div class="stat-val red" id="stCapped">0</div>
        </div>
        <div class="stat-card boosting">
            <div class="stat-label">🚀 Booster Active (&gt; CIR)</div>
            <div class="stat-val green" id="stBoosting">0</div>
        </div>
        <div class="stat-card normal">
            <div class="stat-label">🔵 Within Plan (Normal)</div>
            <div class="stat-val blue" id="stNormal">0</div>
        </div>
        <div class="stat-card extra">
            <div class="stat-label">⚡ Extra Speed Delivered</div>
            <div class="stat-val purple" id="stExtraSpeed">+0 Mbps</div>
        </div>
        <div class="stat-card online full-width">
            <div class="stat-label">🟢 Total Active Sessions</div>
            <div class="stat-val amber" id="stOnlineCount">0</div>
        </div>
    </div>

    <!-- Toolbar & Filters -->
    <div class="toolbar">
        <div class="search-box">
            <span class="search-icon">🔍</span>
            <input type="text" id="searchInput" placeholder="Search user, name, IP, package..." autocomplete="off">
        </div>

        <div class="filter-row">
            <select id="statusFilter" class="btn-flex-1">
                <option value="all">All Subscribers</option>
                <option value="online">🟢 Online Sessions</option>
                <option value="capped">🚨 Capped / Need More Speed (Red)</option>
                <option value="boosting">🚀 Getting Extra Speed (> CIR)</option>
                <option value="normal">🔵 Within Plan (Normal)</option>
                <option value="idle">⚪ Idle / Offline</option>
            </select>

            <select id="pollIntervalSelect" style="max-width:140px;">
                <option value="1000">Poll: 1s</option>
                <option value="2000" selected>Poll: 2s</option>
                <option value="3000">Poll: 3s</option>
                <option value="5000">Poll: 5s</option>
                <option value="0">Poll: Off</option>
            </select>
        </div>
    </div>

    <!-- Mobile Queue Cards List -->
    <div class="queue-cards-list" id="queueCardsList">
        <div style="text-align:center;padding:30px;color:var(--text-dim);">
            Loading bandwidth analysis...
        </div>
    </div>

    <!-- Desktop Table View -->
    <div class="desktop-table-card">
        <table>
            <thead>
                <tr>
                    <th>Subscriber / IP</th>
                    <th>Subscribed CIR (Plan)</th>
                    <th>Assigned MIR (Router)</th>
                    <th>Live Speed (Rx / Tx)</th>
                    <th>Extra Speed Gained</th>
                    <th>Queue Utilization &amp; State</th>
                    <th style="text-align:right;">Actions</th>
                </tr>
            </thead>
            <tbody id="queueTableBody"></tbody>
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
    <a href="/users" class="dock-item">
        <div class="dock-icon">👥</div>
        <div>Customers</div>
    </a>
    <a href="/queues" class="dock-item active">
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
<!-- MODAL: MIKROTIK ROUTEROS QUEUE SCRIPT GENERATOR -->
<!-- ============================================================ -->
<div class="modal-backdrop" id="modalScript">
    <div class="modal">
        <div class="modal-header">
            <div class="modal-title">📋 Copy-Paste RouterOS Queue Script</div>
            <button class="modal-close" onclick="closeModal('modalScript')">&times;</button>
        </div>

        <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;line-height:1.5;">
            Paste these commands directly into <b>Winbox &gt; New Terminal</b> or RouterOS CLI to configure your <b>Parent Bandwidth Pool</b> and dynamic burst/PCQ queues.
        </div>

        <div class="form-row" style="margin-bottom:12px;">
            <div class="form-group">
                <label>Parent Interface / Target</label>
                <input type="text" id="genParentTarget" value="all" placeholder="e.g. ether1, vlan102, all">
            </div>
            <div class="form-group">
                <label>Total Parent Bandwidth (M)</label>
                <input type="number" id="genParentLimit" value="190">
            </div>
        </div>

        <div class="code-box" id="scriptCodeOutput"></div>

        <div class="modal-footer">
            <button type="button" class="btn" onclick="closeModal('modalScript')">Close</button>
            <button type="button" class="btn primary" id="btnCopyScript">📋 Copy Terminal Commands</button>
        </div>
    </div>
</div>

<!-- Toast -->
<div class="toast" id="toast"></div>

<!-- ============================================================ -->
<!-- CLIENT JAVASCRIPT ENGINE -->
<!-- ============================================================ -->
<script>

var parentPoolLimit = 190;
var queueUsers = [];
var pollTimer = null;

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

var toastTimer = null;
function toast(message, kind) {
    var el = document.getElementById("toast");
    el.textContent = message;
    el.className = "toast show " + (kind || "info");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
        el.className = "toast";
    }, 3500);
}

async function api(url, options) {
    var res = await fetch(url, options);
    var data = null;
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

function parseSpeedNumber(val) {
    if (!val) return 0;
    var m = String(val).match(/([0-9]+(?:\\.[0-9]+)?)/);
    return m ? Number(m[1]) : 0;
}

/*
| Load Live Queues & Bandwidth Booster Data
*/
async function loadQueueData() {
    try {
        var usersData = null;
        var dashData = null;

        try {
            var uRes = await fetch("/api/users");
            if (uRes.ok) usersData = await uRes.json();
        } catch (e) {
            console.error("Failed to fetch /api/users", e);
        }

        try {
            var dRes = await fetch("/api/dashboard");
            if (dRes.ok) dashData = await dRes.json();
        } catch (e) {
            console.error("Failed to fetch /api/dashboard", e);
        }

        var allUsers = (usersData && usersData.users) || [];
        var activeSessions = (dashData && dashData.users) || [];

        var sessionMap = new Map();
        for (var s of activeSessions) {
            sessionMap.set(s.name, s);
        }

        var userMap = new Map();
        for (var u of allUsers) {
            userMap.set(u.username, u);
        }

        var totalLiveTraffic = 0;
        var totalExtraSpeed = 0;
        var cappedCount = 0;
        var boostingCount = 0;
        var normalCount = 0;
        var idleCount = 0;
        var onlineCount = 0;

        var combinedKeys = new Set([...userMap.keys(), ...sessionMap.keys()]);

        queueUsers = Array.from(combinedKeys).map(function (username) {
            var u = userMap.get(username) || {};
            var s = sessionMap.get(username) || null;

            var isOnline = Boolean(s || u.online);
            if (isOnline) onlineCount++;

            var liveTotal = s ? (Number(s.totalMbps) || 0) : 0;
            var liveRx = s ? (Number(s.rxMbps) || 0) : 0;
            var liveTx = s ? (Number(s.txMbps) || 0) : 0;

            var pkgStr = (u.sql && (u.sql.package || u.sql.profile)) || u.package || u.profile || "4 Mbps";
            var profileStr = (u.mikrotik && u.mikrotik.profile) || (u.sql && u.sql.profile) || u.profile || pkgStr;

            var cirMbps = parseSpeedNumber(pkgStr) || 4;
            var mirMbps = parseSpeedNumber(profileStr) || (cirMbps * 2);
            if (mirMbps <= 0) mirMbps = 8;

            // Extra speed over CIR gained from free parent pool
            var extraMbps = (isOnline && liveTotal > cirMbps) ? Number((liveTotal - cirMbps).toFixed(2)) : 0;
            var utilPercent = (isOnline && mirMbps > 0) ? Math.min(100, Math.round((liveTotal / mirMbps) * 100)) : 0;

            // State flags
            // Capped / Need more speed: using >= 85% of their MIR ceiling and >= 1.0 Mbps
            var isCapped = isOnline && ((liveTotal >= (mirMbps * 0.85) && liveTotal >= 1.0) || utilPercent >= 85);
            var isBoosting = isOnline && (liveTotal > (cirMbps * 1.05)) && !isCapped;
            var isIdle = !isOnline || (liveTotal < 0.5);
            var isNormal = isOnline && !isCapped && !isBoosting && !isIdle;

            if (isCapped) cappedCount++;
            else if (isBoosting) boostingCount++;
            else if (isIdle && isOnline) idleCount++;
            else if (isNormal) normalCount++;

            totalLiveTraffic += liveTotal;
            totalExtraSpeed += extraMbps;

            return {
                username: username,
                name: (u.sql && u.sql.name) || u.name || username,
                phone: (u.sql && u.sql.phone) || u.phone || "",
                address: (s && s.address) || (u.activeSession && u.activeSession.address) || u.online_ip || "",
                uptime: (s && s.uptime) || (u.activeSession && u.activeSession.uptime) || (isOnline ? "Active" : "Offline"),
                pkg: pkgStr,
                profile: profileStr,
                price: (u.sql && u.sql.price !== null) ? u.sql.price : (u.price || 0),
                isOnline: isOnline,
                cirMbps: cirMbps,
                mirMbps: mirMbps,
                liveRx: liveRx,
                liveTx: liveTx,
                liveTotal: liveTotal,
                extraMbps: extraMbps,
                utilPercent: utilPercent,
                isCapped: isCapped,
                isBoosting: isBoosting,
                isNormal: isNormal,
                isIdle: isIdle
            };
        });

        // 🌟 SORTING ORDER:
        // 1. Capped / Need More Speed (Red) ON TOP (sorted by highest traffic & utilization)
        // 2. Boosting users getting extra speed (sorted by extraMbps descending)
        // 3. Online Normal active users (sorted by liveTotal descending)
        // 4. Online Idle users
        // 5. Offline users
        queueUsers.sort(function (a, b) {
            if (a.isCapped && !b.isCapped) return -1;
            if (!a.isCapped && b.isCapped) return 1;
            if (a.isCapped && b.isCapped) return b.liveTotal - a.liveTotal;

            if (a.isBoosting && !b.isBoosting) return -1;
            if (!a.isBoosting && b.isBoosting) return 1;
            if (a.isBoosting && b.isBoosting) return b.extraMbps - a.extraMbps;

            if (a.isOnline && !b.isOnline) return -1;
            if (!a.isOnline && b.isOnline) return 1;

            return b.liveTotal - a.liveTotal;
        });

        // Update Parent Pool Metrics
        var freeHeadroom = Math.max(0, parentPoolLimit - totalLiveTraffic);
        var poolUtilPercent = Math.min(100, Math.round((totalLiveTraffic / parentPoolLimit) * 100));

        document.getElementById("poolBadge").textContent = parentPoolLimit + " Mbps Pool";
        document.getElementById("poolUsedMbps").textContent = totalLiveTraffic.toFixed(2) + " Mbps";
        document.getElementById("poolFreeMbps").textContent = freeHeadroom.toFixed(2) + " Mbps";
        document.getElementById("poolExtraMbps").textContent = "+" + totalExtraSpeed.toFixed(2) + " Mbps";
        document.getElementById("poolPercent").textContent = poolUtilPercent + "%";
        document.getElementById("poolFillBar").style.width = poolUtilPercent + "%";

        // Update Stats Counters
        document.getElementById("stCapped").textContent = cappedCount;
        document.getElementById("stBoosting").textContent = boostingCount;
        document.getElementById("stNormal").textContent = normalCount;
        document.getElementById("stExtraSpeed").textContent = "+" + totalExtraSpeed.toFixed(1) + " Mbps";
        document.getElementById("stOnlineCount").textContent = onlineCount;

        renderQueues();
    } catch (e) {
        console.error("Queue load error:", e);
    }
}

function renderQueues() {
    var cardsList = document.getElementById("queueCardsList");
    var tbody = document.getElementById("queueTableBody");
    var q = document.getElementById("searchInput").value.toLowerCase().trim();
    var stateFilter = document.getElementById("statusFilter").value;

    var filtered = queueUsers.filter(function (u) {
        if (q) {
            var matches = u.username.toLowerCase().includes(q) ||
                u.name.toLowerCase().includes(q) ||
                u.address.toLowerCase().includes(q) ||
                u.pkg.toLowerCase().includes(q) ||
                u.profile.toLowerCase().includes(q);
            if (!matches) return false;
        }
        if (stateFilter === "online" && !u.isOnline) return false;
        if (stateFilter === "capped" && !u.isCapped) return false;
        if (stateFilter === "boosting" && !u.isBoosting) return false;
        if (stateFilter === "normal" && !u.isNormal) return false;
        if (stateFilter === "idle" && (!u.isIdle && u.isOnline)) return false;
        return true;
    });

    if (filtered.length === 0) {
        cardsList.innerHTML = '<div style="text-align:center;padding:36px;color:var(--text-dim);">No matching subscriber sessions.</div>';
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-dim);">No matching subscriber sessions.</td></tr>';
        return;
    }

    var cardsHtml = "";
    var tableHtml = "";

    for (var u of filtered) {
        var initial = (u.name || u.username).charAt(0).toUpperCase();

        var stateBadge = "";
        var speedClass = "blue";
        var barClass = "blue";
        var extraTag = "";

        if (u.isCapped) {
            stateBadge = '<span class="badge red">🚨 CAPPED (Need More)</span>';
            speedClass = "red";
            barClass = "red";
            extraTag = '<span style="color:#fb7185;font-weight:700;">🚨 Maxing Out ' + u.mirMbps + 'M Cap</span>';
        } else if (u.isBoosting) {
            stateBadge = '<span class="badge green">🚀 BOOSTING (+' + u.extraMbps + 'M)</span>';
            speedClass = "green";
            barClass = "green";
            extraTag = '<span style="color:#34d399;font-weight:700;">🎁 +' + u.extraMbps + ' Mbps Free Boost</span>';
        } else if (!u.isOnline) {
            stateBadge = '<span class="badge" style="background:#1e293b;color:#64748b;">OFFLINE</span>';
            speedClass = "dim";
            barClass = "blue";
            extraTag = '<span style="color:var(--text-dim);">Disconnected</span>';
        } else if (u.isIdle) {
            stateBadge = '<span class="badge" style="background:#1e293b;color:#94a3b8;">⚪ IDLE</span>';
            speedClass = "dim";
            barClass = "blue";
            extraTag = '<span style="color:var(--text-dim);">Low traffic</span>';
        } else {
            stateBadge = '<span class="badge blue">🔵 NORMAL PLAN</span>';
            speedClass = "blue";
            barClass = "blue";
            extraTag = '<span style="color:#93c5fd;">Within ' + u.cirMbps + 'M plan</span>';
        }

        // WhatsApp message
        var waMsg = encodeURIComponent("Assalam-o-Alaikum " + u.name + "! Your live speed is: " + u.liveTotal + " Mbps. Plan: " + u.pkg);
        var cleanPhone = String(u.phone || "").replace(/[^0-9]/g, "");
        var waUrl = cleanPhone ? "https://wa.me/" + (cleanPhone.startsWith("0") ? "92" + cleanPhone.slice(1) : cleanPhone) + "?text=" + waMsg : "";

        // 1. Mobile Card
        cardsHtml +=
            '<div class="q-card ' + (u.isCapped ? 'is-capped' : '') + '">' +
                '<div class="qc-top">' +
                    '<div class="qc-user">' +
                        '<div class="qc-avatar ' + (u.isCapped ? 'capped-av' : '') + '">' + escapeHtml(initial) + '</div>' +
                        '<div>' +
                            '<div class="qc-name">' + escapeHtml(u.name) + '</div>' +
                            '<div class="qc-sub">' + escapeHtml(u.username) + ' · ' + (u.isOnline ? '🟢 Online (' + escapeHtml(u.address || 'Active') + ')' : 'Offline') + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="qc-speed-display">' +
                        '<div class="qc-speed-val ' + speedClass + '">' + u.liveTotal.toFixed(2) + ' <span style="font-size:11px;">Mbps</span></div>' +
                        '<div style="font-size:11px;color:var(--text-dim);">' + (u.isOnline ? 'Rx ' + u.liveRx.toFixed(1) + ' · Tx ' + u.liveTx.toFixed(1) : 'Offline') + '</div>' +
                    '</div>' +
                '</div>' +

                '<div class="qc-meta-grid">' +
                    '<div class="qc-chip">📦 Plan (CIR): <b>' + escapeHtml(u.pkg) + ' (' + u.cirMbps + 'M)</b></div>' +
                    '<div class="qc-chip">⚡ Router (MIR): <b>' + escapeHtml(u.profile) + ' (' + u.mirMbps + 'M)</b></div>' +
                    '<div class="qc-chip">' + extraTag + '</div>' +
                    '<div class="qc-chip">⏱️ ' + escapeHtml(u.uptime) + '</div>' +
                    '<div style="grid-column:1 / -1;margin-top:2px;">' +
                        '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);">' +
                            '<span>Ceiling Usage: ' + u.utilPercent + '%</span>' +
                            '<span>' + stateBadge + '</span>' +
                        '</div>' +
                        '<div class="util-bar-bg"><div class="util-bar-fill ' + barClass + '" style="width:' + u.utilPercent + '%;"></div></div>' +
                    '</div>' +
                '</div>' +

                '<div class="qc-actions-row">' +
                    (u.isOnline ? '<button class="btn sm" data-kick="' + escapeHtml(u.username) + '" title="Kick active session">⚡ Kick</button>' : '') +
                    (u.isOnline ? '<button class="btn sm" data-remote="' + escapeHtml(u.username) + '" title="Open router remote access">🌐 Remote</button>' : '') +
                    '<a href="/users" class="btn sm" title="Edit Customer Plan">✏️ Edit</a>' +
                    (waUrl ? '<a href="' + waUrl + '" target="_blank" class="btn sm" style="background:#064e3b;color:#a7f3d0;border-color:#059669;">💬 WA</a>' : '') +
                '</div>' +
            '</div>';

        // 2. Desktop Table Row
        tableHtml +=
            '<tr class="' + (u.isCapped ? 'tr-capped' : '') + '">' +
                '<td>' +
                    '<div style="font-weight:700;' + (u.isCapped ? 'color:#fb7185;' : '') + '">' + (u.isCapped ? '🚨 ' : '') + escapeHtml(u.name) + '</div>' +
                    '<div style="font-size:12px;color:var(--text-dim);font-family:monospace;">' + escapeHtml(u.username) + (u.isOnline ? ' · 🟢 ' + escapeHtml(u.address || 'Active') : ' · Offline') + '</div>' +
                '</td>' +
                '<td><span class="badge blue">📦 ' + escapeHtml(u.pkg) + ' (' + u.cirMbps + 'M)</span></td>' +
                '<td><span class="badge purple">⚡ ' + escapeHtml(u.profile) + ' (' + u.mirMbps + 'M)</span></td>' +
                '<td>' +
                    '<div style="font-weight:800;font-family:monospace;' + (u.isCapped ? 'color:#fb7185;' : (u.isBoosting ? 'color:#34d399;' : '')) + '">' +
                        u.liveTotal.toFixed(2) + ' Mbps' +
                    '</div>' +
                    '<div style="font-size:11.5px;color:var(--text-dim);">' + (u.isOnline ? '↓ ' + u.liveRx.toFixed(1) + 'M · ↑ ' + u.liveTx.toFixed(1) + 'M' : '–') + '</div>' +
                '</td>' +
                '<td>' +
                    (u.extraMbps > 0
                        ? '<span style="color:#34d399;font-weight:800;font-size:13.5px;">+' + u.extraMbps.toFixed(2) + ' Mbps</span>'
                        : '<span style="color:var(--text-dim);">0.00</span>') +
                '</td>' +
                '<td>' +
                    '<div>' + stateBadge + ' <span style="font-size:12px;font-weight:700;margin-left:4px;">' + u.utilPercent + '%</span></div>' +
                    '<div class="util-bar-bg" style="max-width:140px;"><div class="util-bar-fill ' + barClass + '" style="width:' + u.utilPercent + '%;"></div></div>' +
                '</td>' +
                '<td style="text-align:right;">' +
                    '<div style="display:inline-flex;gap:4px;">' +
                        (u.isOnline ? '<button class="btn sm" data-kick="' + escapeHtml(u.username) + '">Kick</button>' : '') +
                        (u.isOnline ? '<button class="btn sm" data-remote="' + escapeHtml(u.username) + '">Remote</button>' : '') +
                        '<a href="/users" class="btn sm">Edit</a>' +
                        (waUrl ? '<a href="' + waUrl + '" target="_blank" class="btn sm" style="background:#064e3b;color:#a7f3d0;border-color:#059669;">WA</a>' : '') +
                    '</div>' +
                '</td>' +
            '</tr>';
    }

    cardsList.innerHTML = cardsHtml;
    tbody.innerHTML = tableHtml;

    // Attach listeners
    document.querySelectorAll("[data-kick]").forEach(function (btn) {
        btn.addEventListener("click", async function () {
            var u = btn.getAttribute("data-kick");
            try {
                await api("/api/users/" + encodeURIComponent(u) + "/kick", { method: "POST" });
                toast("Disconnected session for " + u, "info");
                loadQueueData();
            } catch (e) {
                toast("Kick failed: " + e.message, "error");
            }
        });
    });

    document.querySelectorAll("[data-remote]").forEach(function (btn) {
        btn.addEventListener("click", async function () {
            var u = btn.getAttribute("data-remote");
            try {
                var res = await api("/api/users/" + encodeURIComponent(u) + "/remote", { method: "POST" });
                toast("Opening remote router UI on port " + res.port, "info");
                window.open(res.url, "_blank");
            } catch (e) {
                toast("Remote error: " + e.message, "error");
            }
        });
    });
}

/*
| RouterOS Queue Script Generator
*/
function updateScriptGenerator() {
    var target = document.getElementById("genParentTarget").value.trim() || "all";
    var limit = Number(document.getElementById("genParentLimit").value) || parentPoolLimit;
    var newline = String.fromCharCode(10);

    var script = [
        "# ===========================================================",
        "# MikroTik RouterOS Bandwidth Booster & Queue Hierarchy",
        "# Total Parent Bandwidth: " + limit + "M (CIR Guarantee + Dynamic Free MIR Burst)",
        "# ===========================================================",
        "",
        "# 1. Create Parent Queue Tree",
        '/queue tree remove [find name="Total-' + limit + 'M-Parent"]',
        '/queue tree add name="Total-' + limit + 'M-Parent" parent="' + target + '" max-limit=' + limit + 'M limit-at=' + limit + 'M queue=default priority=1',
        "",
        "# 2. Create PCQ Queue Types for Fair Dynamic Sharing",
        '/queue type remove [find name="pcq-booster-down"]',
        '/queue type add name="pcq-booster-down" kind=pcq pcq-classifier=dst-address pcq-rate=0 pcq-total-limit=4000',
        '/queue type remove [find name="pcq-booster-up"]',
        '/queue type add name="pcq-booster-up" kind=pcq pcq-classifier=src-address pcq-rate=0 pcq-total-limit=4000',
        "",
        "# 3. Create Child Queues Under Parent Pool",
        '/queue tree add name="PPPoE-Down-Booster" parent="Total-' + limit + 'M-Parent" packet-mark=client-down-pkt max-limit=' + limit + 'M limit-at=50M queue=pcq-booster-down priority=2',
        '/queue tree add name="PPPoE-Up-Booster" parent="Total-' + limit + 'M-Parent" packet-mark=client-up-pkt max-limit=' + Math.round(limit / 2) + 'M limit-at=25M queue=pcq-booster-up priority=2',
        "",
        "# Done! Clients will automatically share the " + limit + "M pool and burst to higher MIR speeds when free."
    ].join(newline);

    document.getElementById("scriptCodeOutput").textContent = script;
}

document.getElementById("genParentTarget").addEventListener("input", updateScriptGenerator);
document.getElementById("genParentLimit").addEventListener("input", updateScriptGenerator);

document.getElementById("btnScriptModal").addEventListener("click", function () {
    document.getElementById("genParentLimit").value = parentPoolLimit;
    updateScriptGenerator();
    openModal("modalScript");
});

document.getElementById("btnCopyScript").addEventListener("click", function () {
    var text = document.getElementById("scriptCodeOutput").textContent;
    navigator.clipboard.writeText(text).then(function () {
        toast("Copied RouterOS script to clipboard!", "success");
    }).catch(function () {
        toast("Script ready in box", "info");
    });
});

/*
| Event Listeners
*/
document.getElementById("parentLimitSelect").addEventListener("change", function () {
    parentPoolLimit = Number(this.value) || 190;
    toast("Parent pool set to " + parentPoolLimit + " Mbps", "info");
    loadQueueData();
});

document.getElementById("searchInput").addEventListener("input", renderQueues);
document.getElementById("statusFilter").addEventListener("change", renderQueues);
document.getElementById("btnRefreshNow").addEventListener("click", function () {
    toast("Refreshing live throughput...", "info");
    loadQueueData();
});

function setupPolling() {
    if (pollTimer) clearInterval(pollTimer);
    var ms = Number(document.getElementById("pollIntervalSelect").value);
    if (ms > 0) {
        pollTimer = setInterval(loadQueueData, ms);
    }
}

document.getElementById("pollIntervalSelect").addEventListener("change", setupPolling);

/*
| Initial Launch
*/
loadQueueData();
setupPolling();

</script>
</body>
</html>`;

    res.send(html);
}

module.exports = { renderQueuesPage };
