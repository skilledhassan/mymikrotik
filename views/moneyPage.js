/*
|--------------------------------------------------------------------------
| Money & DigiKhata – Mobile Web App & ISP Customer Ledger
|--------------------------------------------------------------------------
| Powered by /api/money JSON API.
| Mobile Features:
|   - Fixed Native Bottom App Navigation Dock (Dashboard, Customers, DigiKhata)
|   - Touch-Optimized Customer Khata Cards with Quick Wasool & Udhaar
|   - Responsive Slide-Up Bottom Sheet Modals with Quick Amount Chips
|   - Real-time Balance Tracking (Lene Hein / Dene Hein / Settled)
|   - WhatsApp 1-Tap Bill Reminder & Statement Sharing
|--------------------------------------------------------------------------
*/

function renderMoneyPage(req, res) {
    const html = `<!DOCTYPE html>
<html lang="en">

<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#090d16">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="mobile-web-app-capable" content="yes">
<title>DigiKhata &amp; Wallet – MikroTik Panel</title>
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

/* Desktop Nav Links (Hidden on Mobile) */
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
    transition: transform 0.15s ease;
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
/* PAGE HEADER & QUICK ACTIONS */
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
    padding: 6px 10px;
    font-size: 12px;
    border-radius: 7px;
}

.btn-flex-1 {
    flex: 1;
}

/* ============================================================ */
/* DIGIKHATA KPI CARDS GRID (APP SUMMARY) */
/* ============================================================ */

.kpi-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 20px;
}

@media (min-width: 768px) {
    .kpi-grid {
        grid-template-columns: repeat(5, 1fr);
        gap: 14px;
    }
}

.kpi-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px 14px;
    position: relative;
    overflow: hidden;
}

.kpi-card.full-width {
    grid-column: 1 / -1;
}

@media (min-width: 768px) {
    .kpi-card.full-width {
        grid-column: span 1;
    }
}

.kpi-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
}

.kpi-card.due::before     { background: var(--red); }
.kpi-card.advance::before { background: var(--green); }
.kpi-card.upcoming::before{ background: var(--amber); }
.kpi-card.balance::before { background: var(--blue); }
.kpi-card.profit::before  { background: var(--purple); }

.kpi-label {
    font-size: 11.5px;
    color: var(--text-muted);
    font-weight: 600;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
}

.kpi-badge {
    font-size: 10.5px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 12px;
}

.kpi-badge.red   { background: var(--red-bg); color: #fda4af; }
.kpi-badge.green { background: var(--green-bg); color: #6ee7b7; }
.kpi-badge.amber { background: var(--amber-bg); color: #fde68a; }
.kpi-badge.blue  { background: var(--blue-bg); color: #bae6fd; }
.kpi-badge.purple{ background: var(--purple-bg); color: #e9d5ff; }

.kpi-val {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.02em;
}

@media (min-width: 768px) {
    .kpi-val {
        font-size: 24px;
    }
}

.kpi-val.red    { color: #fb7185; }
.kpi-val.green  { color: #34d399; }
.kpi-val.amber  { color: #fbbf24; }
.kpi-val.blue   { color: #38bdf8; }
.kpi-val.purple { color: #c084fc; }

.kpi-sub {
    font-size: 11px;
    color: var(--text-dim);
    margin-top: 3px;
}

/* ============================================================ */
/* TAB SWITCHER */
/* ============================================================ */

.tabs-wrapper {
    display: flex;
    gap: 6px;
    margin-bottom: 14px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 8px;
    overflow-x: auto;
    scrollbar-width: none;
}

.tabs-wrapper::-webkit-scrollbar {
    display: none;
}

.tab-btn {
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-muted);
    font-size: 13px;
    padding: 7px 13px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    white-space: nowrap;
}

.tab-btn.active {
    background: var(--bg-card);
    border-color: var(--border);
    color: #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.tab-count {
    background: rgba(255, 255, 255, 0.12);
    font-size: 10.5px;
    padding: 1px 5px;
    border-radius: 8px;
    margin-left: 4px;
}

.tab-content {
    display: none;
}

.tab-content.active {
    display: block;
}

/* ============================================================ */
/* TOOLBAR & SWIPEABLE FILTERS */
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

.filter-scroll {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    scrollbar-width: none;
    padding-bottom: 2px;
}

.filter-scroll::-webkit-scrollbar {
    display: none;
}

.filter-pill {
    padding: 5px 11px;
    font-size: 12px;
    border-radius: 20px;
    border: 1px solid var(--border);
    background: var(--bg-card);
    color: var(--text-muted);
    white-space: nowrap;
    cursor: pointer;
    font-weight: 500;
}

.filter-pill.active {
    background: var(--primary);
    border-color: var(--primary);
    color: #fff;
}

/* ============================================================ */
/* RESPONSIVE CUSTOMER KHATA CARDS (MOBILE-FIRST) */
/* ============================================================ */

.khata-cards-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.khata-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: transform 0.1s ease, border-color 0.12s ease;
}

.khata-card:active {
    background: var(--bg-card-hover);
}

.kc-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
}

.kc-user-info {
    display: flex;
    align-items: center;
    gap: 10px;
}

.kc-avatar {
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

.kc-name {
    font-size: 15px;
    font-weight: 700;
    color: #f1f5f9;
}

.kc-sub {
    font-size: 12px;
    color: var(--text-dim);
    font-family: Consolas, monospace;
}

.kc-balance-box {
    text-align: right;
}

.kc-balance-title {
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
}

.kc-balance-amount {
    font-size: 17px;
    font-weight: 800;
}

.kc-balance-amount.due    { color: #fb7185; }
.kc-balance-amount.advance{ color: #34d399; }
.kc-balance-amount.settled{ color: var(--text-dim); }

.kc-meta-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px 10px;
    background: rgba(10, 17, 32, 0.6);
    border-radius: 8px;
    font-size: 12px;
}

.kc-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--text-muted);
}

.kc-actions-row {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.kc-actions-row .btn {
    flex: 1;
    min-width: 70px;
}

.whatsapp-btn {
    background: #064e3b;
    border-color: #059669;
    color: #a7f3d0;
}

/* Desktop Table Container (Shown on Large Screens) */

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
    .khata-cards-list {
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

/* ============================================================ */
/* PERIODS FORECAST CARDS */
/* ============================================================ */

.periods-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
}

@media (min-width: 640px) {
    .periods-grid {
        grid-template-columns: 1fr 1fr;
    }
}

@media (min-width: 1024px) {
    .periods-grid {
        grid-template-columns: repeat(4, 1fr);
    }
}

.period-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 14px 16px;
}

.period-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
}

.period-title {
    font-size: 14.5px;
    font-weight: 700;
    color: #fff;
}

.period-date {
    font-size: 11px;
    color: var(--text-dim);
}

.period-line {
    display: flex;
    justify-content: space-between;
    font-size: 12.5px;
    padding: 3px 0;
}

.period-line .lbl { color: var(--text-muted); }
.period-line .val { font-weight: 700; }

.period-div {
    border-top: 1px solid var(--border);
    margin: 8px 0;
}

/* ============================================================ */
/* MOBILE SLIDE-UP BOTTOM SHEET MODALS */
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
    .modal.wide {
        max-width: 720px;
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

.quick-amount-chips {
    display: flex;
    gap: 6px;
    margin-top: 4px;
    overflow-x: auto;
}

.amount-chip {
    padding: 4px 9px;
    font-size: 11.5px;
    font-weight: 700;
    border-radius: 6px;
    background: rgba(37, 99, 235, 0.15);
    border: 1px solid rgba(37, 99, 235, 0.3);
    color: #93c5fd;
    cursor: pointer;
}

.checkbox-group {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 13px;
    color: #e2e8f0;
    margin: 8px 0;
}

.checkbox-group input {
    width: 18px;
    height: 18px;
    accent-color: var(--primary);
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
                <div class="brand-sub">DigiKhata &amp; Wallet Management</div>
            </div>
        </div>

        <nav class="desktop-nav">
            <a href="/">📊 Dashboard</a>
            <a href="/users">👥 Customers</a>
            <a href="/queues">⚡ Booster</a>
            <a href="/money" class="active">💳 DigiKhata</a>
            <a href="/top-users">🏆 Top Users</a>
            <a href="/whatsapp">💬 WhatsApp</a>
            <a href="/logout" style="color:#fda4af;" title="Sign out">🚪 Logout</a>
        </nav>
    </header>

    <!-- Page Header & Actions -->
    <div class="page-header">
        <div class="header-title-block">
            <h1>💳 DigiKhata &amp; ISP Wallet</h1>
            <p>Customer Udhaar/Wasool ledger &amp; billing dues</p>
        </div>

        <div class="header-btn-row">
            <button class="btn btn-flex-1" id="btnSyncAll" title="Sync all MikroTik customers into DigiKhata">
                ⚡ Sync Users
            </button>
            <button class="btn btn-flex-1" id="btnSettings">
                ⚙️ Costs
            </button>
            <button class="btn primary btn-flex-1" id="btnAddCash">
                💵 Add Cash In/Out
            </button>
        </div>
    </div>

    <!-- DigiKhata KPI Cards Grid -->
    <div class="kpi-grid">
        <!-- 1. Total You'll Get (Mene Lene Hein) -->
        <div class="kpi-card due">
            <div class="kpi-label">
                <span>🔴 LENE HEIN (DUE)</span>
                <span class="kpi-badge red" id="badgeDueCount">0 Due</span>
            </div>
            <div class="kpi-val red" id="kpiTotalDue">Rs 0</div>
            <div class="kpi-sub" id="subDueText">Pending customer dues</div>
        </div>

        <!-- 2. Total You'll Give (Advance / Mene Dene Hein) -->
        <div class="kpi-card advance">
            <div class="kpi-label">
                <span>🟢 DENE HEIN (ADVANCE)</span>
                <span class="kpi-badge green" id="badgeAdvanceCount">0</span>
            </div>
            <div class="kpi-val green" id="kpiTotalAdvance">Rs 0</div>
            <div class="kpi-sub">Prepaid customer credits</div>
        </div>

        <!-- 3. Upcoming Renewals (Next 7 Days) -->
        <div class="kpi-card upcoming">
            <div class="kpi-label">
                <span>🟡 UPCOMING (7D)</span>
                <span class="kpi-badge amber" id="badgeUpcomingCount">0</span>
            </div>
            <div class="kpi-val amber" id="kpiUpcoming7d">Rs 0</div>
            <div class="kpi-sub">Due in next 7 days</div>
        </div>

        <!-- 4. Main Cash in Hand / Wallet Balance -->
        <div class="kpi-card balance">
            <div class="kpi-label">
                <span>🔵 WALLET CASH</span>
                <span class="kpi-badge blue">Net</span>
            </div>
            <div class="kpi-val blue" id="kpiCashBalance">Rs 0</div>
            <div class="kpi-sub">Inflow − Outflow</div>
        </div>

        <!-- 5. This Month Projected Profit -->
        <div class="kpi-card profit full-width">
            <div class="kpi-label">
                <span>📈 MONTH NET PROFIT</span>
                <span class="kpi-badge purple" id="badgeMonthCost">Cost: Rs 0</span>
            </div>
            <div class="kpi-val purple" id="kpiMonthlyProfit">Rs 0</div>
            <div class="kpi-sub">Revenue minus fixed CIR costs</div>
        </div>
    </div>

    <!-- Tab Bar -->
    <div class="tabs-wrapper">
        <button class="tab-btn active" data-tab="tabKhata">
            👥 Customers Khata <span class="tab-count" id="tabCountKhata">0</span>
        </button>
        <button class="tab-btn" data-tab="tabCashbook">
            💵 Cash Book <span class="tab-count" id="tabCountCashbook">0</span>
        </button>
        <button class="tab-btn" data-tab="tabUpcoming">
            📅 Projections
        </button>
    </div>

    <!-- TAB 1: CUSTOMER KHATA (UDHAAR / WASOOL BOOK) -->
    <div class="tab-content active" id="tabKhata">
        <div class="toolbar">
            <div class="search-box">
                <span class="search-icon">🔍</span>
                <input type="text" id="khataSearch" placeholder="Search name, username, phone..." autocomplete="off">
            </div>

            <div class="filter-scroll">
                <button class="filter-pill active" data-filter="all">All (<span id="cntAll">0</span>)</button>
                <button class="filter-pill" data-filter="due">🔴 Due (<span id="cntDue">0</span>)</button>
                <button class="filter-pill" data-filter="upcoming">🟡 7d Upcoming (<span id="cntUpcoming">0</span>)</button>
                <button class="filter-pill" data-filter="advance">🟢 Advance (<span id="cntAdvance">0</span>)</button>
                <button class="filter-pill" data-filter="settled">⚪ Settled (<span id="cntSettled">0</span>)</button>
            </div>
        </div>

        <!-- Mobile-First Cards List -->
        <div class="khata-cards-list" id="khataCardsList">
            <div style="text-align:center;padding:30px;color:var(--text-dim);">
                Loading DigiKhata accounts...
            </div>
        </div>

        <!-- Desktop Table View -->
        <div class="desktop-table-card">
            <table>
                <thead>
                    <tr>
                        <th>Customer / PPPoE</th>
                        <th>Package &amp; Price</th>
                        <th>Due / Expiry Date</th>
                        <th>Remaining</th>
                        <th>Status</th>
                        <th>Khata Balance</th>
                        <th>Last Payment</th>
                        <th style="text-align:right;">Actions</th>
                    </tr>
                </thead>
                <tbody id="khataTableBody"></tbody>
            </table>
        </div>
    </div>

    <!-- TAB 2: CASH BOOK (ROKAR & EXPENSES) -->
    <div class="tab-content" id="tabCashbook">
        <div class="toolbar">
            <div class="filter-scroll">
                <button class="filter-pill active" data-cbfilter="all">All Transactions</button>
                <button class="filter-pill" data-cbfilter="income">🟢 Cash In</button>
                <button class="filter-pill" data-cbfilter="debit">🔴 Cash Out</button>
            </div>

            <div style="display:flex;gap:6px;">
                <button class="btn success sm" id="btnAddIncome">+ Cash In</button>
                <button class="btn danger sm" id="btnAddExpense">+ Cash Out</button>
            </div>
        </div>

        <div class="khata-cards-list" id="cashbookCardsList"></div>
    </div>

    <!-- TAB 3: UPCOMING EARNINGS & PERIOD PROJECTIONS -->
    <div class="tab-content" id="tabUpcoming">
        <div class="periods-grid" id="periodGrid"></div>
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
    <a href="/queues" class="dock-item">
        <div class="dock-icon">⚡</div>
        <div>Booster</div>
    </a>
    <a href="/money" class="dock-item active">
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
<!-- MODAL: WASOOL / GOT PAYMENT -->
<!-- ============================================================ -->
<div class="modal-backdrop" id="modalPayment">
    <div class="modal">
        <div class="sheet-handle"></div>
        <div class="modal-header">
            <div class="modal-title">🟢 Wasool / Got Payment</div>
            <button class="modal-close" onclick="closeModal('modalPayment')">&times;</button>
        </div>

        <form id="formPayment" onsubmit="handlePaymentSubmit(event)">
            <input type="hidden" id="payUsername">

            <div class="form-group" style="background:#091224;padding:10px 12px;border-radius:10px;border:1px solid var(--border);">
                <div style="font-size:12px;color:var(--text-muted);">Customer:</div>
                <div style="font-size:16px;font-weight:700;color:#fff;" id="payCustomerName">–</div>
                <div style="font-size:12px;color:var(--text-dim);font-family:monospace;" id="payCustomerUsername">–</div>
                <div style="margin-top:4px;font-size:12.5px;" id="payCustomerDueInfo"></div>
            </div>

            <div class="form-group">
                <label>Amount Received (Rs) *</label>
                <input type="number" id="payAmount" step="1" min="1" required placeholder="1500">
                <div class="quick-amount-chips" id="payQuickChips"></div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Method *</label>
                    <select id="payMethod">
                        <option value="cash">💵 Cash</option>
                        <option value="easypaisa">🟢 EasyPaisa</option>
                        <option value="jazzcash">🔴 JazzCash</option>
                        <option value="bank">🏦 Bank</option>
                        <option value="nayapay">🟠 NayaPay</option>
                        <option value="sadapay">🔵 SadaPay</option>
                        <option value="other">📝 Other</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Duration</label>
                    <select id="payRenewMonths">
                        <option value="1">1 Month</option>
                        <option value="2">2 Months</option>
                        <option value="3">3 Months</option>
                        <option value="6">6 Months</option>
                        <option value="12">12 Months</option>
                    </select>
                </div>
            </div>

            <div class="form-group">
                <label>Date Received</label>
                <input type="date" id="payDate" required>
            </div>

            <label class="checkbox-group">
                <input type="checkbox" id="payAutoRenew" checked>
                <span><b>Auto-renew expiry &amp; activate internet</b></span>
            </label>

            <div class="form-group">
                <label>Note / Receipt Reference</label>
                <input type="text" id="payNote" placeholder="e.g. JazzCash Trx ID...">
            </div>

            <div class="error-banner" id="payError"></div>

            <div class="modal-footer">
                <button type="button" class="btn" onclick="closeModal('modalPayment')">Cancel</button>
                <button type="submit" class="btn success">✅ Record Wasool</button>
            </div>
        </form>
    </div>
</div>

<!-- ============================================================ -->
<!-- MODAL: UDHAAR / CHARGE BILL -->
<!-- ============================================================ -->
<div class="modal-backdrop" id="modalCharge">
    <div class="modal">
        <div class="sheet-handle"></div>
        <div class="modal-header">
            <div class="modal-title">🔴 Udhaar / Add Customer Charge</div>
            <button class="modal-close" onclick="closeModal('modalCharge')">&times;</button>
        </div>

        <form id="formCharge" onsubmit="handleChargeSubmit(event)">
            <input type="hidden" id="chgUsername">

            <div class="form-group" style="background:#091224;padding:10px 12px;border-radius:10px;border:1px solid var(--border);">
                <div style="font-size:12px;color:var(--text-muted);">Customer:</div>
                <div style="font-size:15px;font-weight:700;color:#fff;" id="chgCustomerName">–</div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Amount (Rs) *</label>
                    <input type="number" id="chgAmount" step="1" min="1" required placeholder="500">
                </div>

                <div class="form-group">
                    <label>Category *</label>
                    <select id="chgCategory">
                        <option value="monthly_fee">Monthly Fee</option>
                        <option value="installation">Installation</option>
                        <option value="wire_cable">Wire Repair</option>
                        <option value="router_hardware">Router / ONU</option>
                        <option value="static_ip">Static IP</option>
                        <option value="other">Other</option>
                    </select>
                </div>
            </div>

            <div class="form-group">
                <label>Description *</label>
                <input type="text" id="chgDesc" required placeholder="e.g. 50 meter wire replaced">
            </div>

            <div class="form-group">
                <label>Date</label>
                <input type="date" id="chgDate" required>
            </div>

            <div class="error-banner" id="chgError"></div>

            <div class="modal-footer">
                <button type="button" class="btn" onclick="closeModal('modalCharge')">Cancel</button>
                <button type="submit" class="btn danger">Add Charge (Udhaar)</button>
            </div>
        </form>
    </div>
</div>

<!-- ============================================================ -->
<!-- MODAL: CUSTOMER PASSBOOK STATEMENT -->
<!-- ============================================================ -->
<div class="modal-backdrop" id="modalPassbook">
    <div class="modal wide">
        <div class="sheet-handle"></div>
        <div class="modal-header">
            <div class="modal-title" id="pbTitle">📜 Customer Passbook</div>
            <button class="modal-close" onclick="closeModal('modalPassbook')">&times;</button>
        </div>

        <div id="pbHeaderCard" style="background:#091224;padding:14px;border-radius:12px;border:1px solid var(--border);margin-bottom:14px;"></div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <div style="font-weight:700;font-size:14px;color:#fff;">History</div>
            <div id="pbWhatsAppBtn"></div>
        </div>

        <div id="pbCardsList" style="display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto;"></div>

        <div class="modal-footer">
            <button type="button" class="btn primary" onclick="closeModal('modalPassbook')">Done</button>
        </div>
    </div>
</div>

<!-- ============================================================ -->
<!-- MODAL: QUICK PRICE EDIT -->
<!-- ============================================================ -->
<div class="modal-backdrop" id="modalPrice">
    <div class="modal" style="max-width:400px;">
        <div class="sheet-handle"></div>
        <div class="modal-header">
            <div class="modal-title">✏️ Edit Monthly Price</div>
            <button class="modal-close" onclick="closeModal('modalPrice')">&times;</button>
        </div>

        <form id="formPrice" onsubmit="handlePriceSubmit(event)">
            <input type="hidden" id="qpUsername">

            <div class="form-group">
                <label>Customer:</label>
                <div style="font-weight:700;font-size:15px;" id="qpName">–</div>
            </div>

            <div class="form-group">
                <label>Custom Monthly Fee (Rs) *</label>
                <input type="number" id="qpPrice" step="1" min="0" required placeholder="1500">
            </div>

            <div class="error-banner" id="qpError"></div>

            <div class="modal-footer">
                <button type="button" class="btn" onclick="closeModal('modalPrice')">Cancel</button>
                <button type="submit" class="btn primary">Save Price</button>
            </div>
        </form>
    </div>
</div>

<!-- ============================================================ -->
<!-- MODAL: GENERAL CASH IN / CASH OUT -->
<!-- ============================================================ -->
<div class="modal-backdrop" id="modalGeneralCash">
    <div class="modal">
        <div class="sheet-handle"></div>
        <div class="modal-header">
            <div class="modal-title" id="gcTitle">💵 Add Transaction</div>
            <button class="modal-close" onclick="closeModal('modalGeneralCash')">&times;</button>
        </div>

        <form id="formGeneralCash" onsubmit="handleGeneralCashSubmit(event)">
            <div class="form-group">
                <label>Transaction Type *</label>
                <select id="gcType">
                    <option value="income">🟢 Cash In (Income)</option>
                    <option value="debit">🔴 Cash Out (Expense)</option>
                    <option value="note">📝 Journal Note</option>
                </select>
            </div>

            <div class="form-group">
                <label>Description *</label>
                <input type="text" id="gcDesc" required placeholder="e.g. Bandwidth payment">
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Amount (Rs) *</label>
                    <input type="number" id="gcAmount" step="0.01" min="0" placeholder="0.00">
                </div>

                <div class="form-group">
                    <label>Method</label>
                    <select id="gcMethod">
                        <option value="cash">Cash</option>
                        <option value="bank">Bank</option>
                        <option value="easypaisa">EasyPaisa</option>
                        <option value="jazzcash">JazzCash</option>
                        <option value="other">Other</option>
                    </select>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Category</label>
                    <input type="text" id="gcCategory" placeholder="e.g. Bandwidth">
                </div>

                <div class="form-group">
                    <label>Date</label>
                    <input type="date" id="gcDate" required>
                </div>
            </div>

            <div class="error-banner" id="gcError"></div>

            <div class="modal-footer">
                <button type="button" class="btn" onclick="closeModal('modalGeneralCash')">Cancel</button>
                <button type="submit" class="btn primary">Save Entry</button>
            </div>
        </form>
    </div>
</div>

<!-- ============================================================ -->
<!-- MODAL: SETTINGS (COSTS & PACKAGES) -->
<!-- ============================================================ -->
<div class="modal-backdrop" id="modalSettings">
    <div class="modal" style="max-width:540px;">
        <div class="sheet-handle"></div>
        <div class="modal-header">
            <div class="modal-title">⚙️ Costs &amp; Packages</div>
            <button class="modal-close" onclick="closeModal('modalSettings')">&times;</button>
        </div>

        <div style="margin-bottom:16px;">
            <label style="font-size:13px;color:#fff;">Monthly Upstream Fixed Costs</label>
            <div id="costList" style="display:flex;flex-direction:column;gap:6px;margin-top:6px;"></div>
            <button type="button" class="btn sm" id="btnAddCostRow" style="margin-top:6px;">+ Add Fixed Cost</button>
        </div>

        <div style="margin-bottom:16px;">
            <label style="font-size:13px;color:#fff;">PPP Profile Package Prices</label>
            <div id="pkgList" style="display:flex;flex-direction:column;gap:6px;max-height:180px;overflow-y:auto;margin-top:6px;"></div>
        </div>

        <div class="error-banner" id="settingsError"></div>

        <div class="modal-footer">
            <button type="button" class="btn" onclick="closeModal('modalSettings')">Cancel</button>
            <button type="button" class="btn primary" id="btnSaveSettings">Save</button>
        </div>
    </div>
</div>

<!-- Toast notification -->
<div class="toast" id="toast"></div>

<!-- ============================================================ -->
<!-- CLIENT JAVASCRIPT ENGINE -->
<!-- ============================================================ -->
<script>

let rawCustomers = [];
let cashbookEntries = [];
let appSettings = {};
let currentKhataFilter = "all";
let currentCbFilter = "all";

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
| Tab Navigation
*/
document.querySelectorAll(".tab-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
        const targetId = btn.dataset.tab;
        document.querySelectorAll(".tab-btn").forEach(function (b) { b.classList.remove("active"); });
        document.querySelectorAll(".tab-content").forEach(function (c) { c.classList.remove("active"); });
        btn.classList.add("active");
        const target = document.getElementById(targetId);
        if (target) target.classList.add("active");

        if (targetId === "tabCashbook") loadCashbook();
        if (targetId === "tabUpcoming") loadPeriods();
    });
});

/*
| Khata Filter Pills
*/
document.querySelectorAll(".filter-pill[data-filter]").forEach(function (pill) {
    pill.addEventListener("click", function () {
        document.querySelectorAll(".filter-pill[data-filter]").forEach(function (p) { p.classList.remove("active"); });
        pill.classList.add("active");
        currentKhataFilter = pill.dataset.filter;
        renderKhata();
    });
});

/*
| Cashbook Filter Pills
*/
document.querySelectorAll(".filter-pill[data-cbfilter]").forEach(function (pill) {
    pill.addEventListener("click", function () {
        document.querySelectorAll(".filter-pill[data-cbfilter]").forEach(function (p) { p.classList.remove("active"); });
        pill.classList.add("active");
        currentCbFilter = pill.dataset.cbfilter;
        renderCashbook();
    });
});

/*
| Search Handler
*/
let searchTimer = null;
document.getElementById("khataSearch").addEventListener("input", function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderKhata, 250);
});

/*
|--------------------------------------------------------------------------
| Load & Render DigiKhata
|--------------------------------------------------------------------------
*/

async function loadKhata() {
    try {
        const data = await api("/api/money/khata");
        rawCustomers = data.customers || [];
        appSettings = data.settings || {};

        // Update Top KPI Cards
        const sum = data.summary || {};
        document.getElementById("kpiTotalDue").textContent = fmtMoney(sum.totalDue);
        document.getElementById("badgeDueCount").textContent = sum.dueCount + " Due";
        document.getElementById("subDueText").textContent = sum.dueCount + " customer(s) pending";

        document.getElementById("kpiTotalAdvance").textContent = fmtMoney(sum.totalAdvance);
        document.getElementById("badgeAdvanceCount").textContent = (rawCustomers.filter(function (c) { return c.advanceAmount > 0; }).length) + " Users";

        document.getElementById("kpiUpcoming7d").textContent = fmtMoney(sum.upcoming7d);
        document.getElementById("badgeUpcomingCount").textContent = sum.upcomingCount + " Users";

        document.getElementById("kpiCashBalance").textContent = fmtMoney(sum.cashBalance);
        document.getElementById("kpiMonthlyProfit").textContent = fmtMoney(sum.monthlyProfit);
        document.getElementById("badgeMonthCost").textContent = "Cost: " + fmtMoney(sum.monthlyCost);

        // Update counts
        document.getElementById("tabCountKhata").textContent = rawCustomers.length;
        document.getElementById("cntAll").textContent = rawCustomers.length;
        document.getElementById("cntDue").textContent = sum.dueCount;
        document.getElementById("cntUpcoming").textContent = sum.upcomingCount;
        document.getElementById("cntAdvance").textContent = rawCustomers.filter(function (c) { return c.advanceAmount > 0; }).length;
        document.getElementById("cntSettled").textContent = sum.settledCount;

        renderKhata();
    } catch (err) {
        toast("Failed to load DigiKhata: " + err.message, "error");
    }
}

function renderKhata() {
    const cardsList = document.getElementById("khataCardsList");
    const tbody = document.getElementById("khataTableBody");
    const query = document.getElementById("khataSearch").value.toLowerCase().trim();

    let filtered = rawCustomers.filter(function (c) {
        if (currentKhataFilter === "due" && c.khataStatus !== "due") return false;
        if (currentKhataFilter === "upcoming" && c.khataStatus !== "upcoming") return false;
        if (currentKhataFilter === "advance" && c.khataStatus !== "advance") return false;
        if (currentKhataFilter === "settled" && c.khataStatus !== "settled") return false;

        if (query) {
            const matches =
                c.name.toLowerCase().includes(query) ||
                c.username.toLowerCase().includes(query) ||
                c.phone.toLowerCase().includes(query) ||
                c.package.toLowerCase().includes(query);
            if (!matches) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        const emptyMsg = '<div style="text-align:center;padding:36px;color:var(--text-dim);font-size:13.5px;">No customer records match current filter.</div>';
        cardsList.innerHTML = emptyMsg;
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-dim);">No customer records.</td></tr>';
        return;
    }

    let cardsHtml = "";
    let tableHtml = "";

    for (const c of filtered) {
        const initial = (c.name || c.username).charAt(0).toUpperCase();

        let balClass = "settled";
        let balTitle = "SETTLED";
        let balAmountStr = "Rs 0";

        if (c.dueAmount > 0) {
            balClass = "due";
            balTitle = "🔴 LENE HEIN";
            balAmountStr = fmtMoney(c.dueAmount);
        } else if (c.advanceAmount > 0) {
            balClass = "advance";
            balTitle = "🟢 ADVANCE";
            balAmountStr = fmtMoney(c.advanceAmount);
        }

        let remainingText = "–";
        if (c.remainingDays !== null) {
            if (c.remainingDays < 0) {
                remainingText = '<span style="color:#fb7185;font-weight:700;">Expired (' + Math.abs(c.remainingDays) + 'd ago)</span>';
            } else if (c.remainingDays === 0) {
                remainingText = '<span style="color:#fbbf24;font-weight:700;">Due Today</span>';
            } else {
                remainingText = c.remainingDays + ' days left';
            }
        }

        // WhatsApp message
        const dueAmountToPay = c.dueAmount > 0 ? c.dueAmount : (c.price || 0);
        const waLines = [
            "Assalam-o-Alaikum " + (c.name || c.username) + "!",
            "Your Internet Bill for (" + (c.package || "Internet") + ") is due: Rs " + dueAmountToPay + ".",
            "Expiry/Due Date: " + (c.expiryDate || "Pending") + ".",
            "Kindly pay via EasyPaisa / JazzCash / Bank Transfer to maintain active internet service.",
            "Thank you!"
        ];
        const waMsg = encodeURIComponent(waLines.join(String.fromCharCode(10)));
        const cleanPhone = String(c.phone || "").replace(/[^0-9]/g, "");
        const waUrl = cleanPhone ? "https://wa.me/" + (cleanPhone.startsWith("0") ? "92" + cleanPhone.slice(1) : cleanPhone) + "?text=" + waMsg : "";

        // 1. Mobile Card HTML
        cardsHtml +=
            '<div class="khata-card">' +
                '<div class="kc-top">' +
                    '<div class="kc-user-info">' +
                        '<div class="kc-avatar">' + escapeHtml(initial) + '</div>' +
                        '<div>' +
                            '<div class="kc-name">' + escapeHtml(c.name || c.username) + '</div>' +
                            '<div class="kc-sub">' + escapeHtml(c.username) + (c.phone ? ' · ' + escapeHtml(c.phone) : '') + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="kc-balance-box">' +
                        '<div class="kc-balance-title ' + balClass + '">' + balTitle + '</div>' +
                        '<div class="kc-balance-amount ' + balClass + '">' + balAmountStr + '</div>' +
                    '</div>' +
                '</div>' +

                '<div class="kc-meta-row">' +
                    '<div class="kc-chip">📦 <b>' + escapeHtml(c.package) + '</b> (' + fmtMoney(c.price) + ')</div>' +
                    '<div class="kc-chip">⏳ ' + remainingText + '</div>' +
                '</div>' +

                '<div class="kc-actions-row">' +
                    '<button class="btn success sm" data-btn-pay="' + escapeHtml(c.username) + '">🟢 + Wasool</button>' +
                    '<button class="btn danger sm" data-btn-chg="' + escapeHtml(c.username) + '">🔴 - Udhaar</button>' +
                    '<button class="btn sm" data-btn-pb="' + escapeHtml(c.username) + '">📜 Passbook</button>' +
                    (waUrl ? '<a href="' + waUrl + '" target="_blank" class="btn sm whatsapp-btn">💬 WA</a>' : '') +
                '</div>' +
            '</div>';

        // 2. Desktop Table Row HTML
        tableHtml +=
            '<tr>' +
                '<td>' +
                    '<div style="font-weight:700;">' + escapeHtml(c.name) + '</div>' +
                    '<div style="font-size:12px;color:var(--text-dim);font-family:monospace;">' + escapeHtml(c.username) + (c.phone ? ' · ' + escapeHtml(c.phone) : '') + '</div>' +
                '</td>' +
                '<td>' +
                    '<span class="kpi-badge blue">' + escapeHtml(c.package) + '</span> ' +
                    '<span style="font-weight:700;margin-left:4px;">' + fmtMoney(c.price) + '</span>' +
                    '<span class="price-edit-btn" data-un="' + escapeHtml(c.username) + '" data-pr="' + (c.price || 0) + '" data-nm="' + escapeHtml(c.name) + '" style="cursor:pointer;margin-left:4px;" title="Edit price">✏️</span>' +
                '</td>' +
                '<td>' + (c.expiryDate ? escapeHtml(c.expiryDate) : '–') + '</td>' +
                '<td>' + remainingText + '</td>' +
                '<td><span class="kpi-badge ' + (c.khataStatus === "due" ? "red" : (c.khataStatus === "advance" ? "green" : "blue")) + '">' + c.khataStatus.toUpperCase() + '</span></td>' +
                '<td><span class="kc-balance-amount ' + balClass + '" style="font-size:14px;">' + balAmountStr + '</span></td>' +
                '<td>' + (c.lastPayment ? '<span style="color:#34d399;font-weight:600;">' + fmtMoney(c.lastPayment.amount) + '</span>' : '–') + '</td>' +
                '<td style="text-align:right;">' +
                    '<div style="display:inline-flex;gap:4px;">' +
                        '<button class="btn success sm" data-btn-pay="' + escapeHtml(c.username) + '">Wasool</button>' +
                        '<button class="btn danger sm" data-btn-chg="' + escapeHtml(c.username) + '">Udhaar</button>' +
                        '<button class="btn sm" data-btn-pb="' + escapeHtml(c.username) + '">Passbook</button>' +
                        (waUrl ? '<a href="' + waUrl + '" target="_blank" class="btn sm whatsapp-btn">WA</a>' : '') +
                    '</div>' +
                '</td>' +
            '</tr>';
    }

    cardsList.innerHTML = cardsHtml;
    tbody.innerHTML = tableHtml;

    // Attach click listeners safely
    document.querySelectorAll("[data-btn-pay]").forEach(function (btn) {
        btn.addEventListener("click", function () { openPaymentModal(btn.getAttribute("data-btn-pay")); });
    });
    document.querySelectorAll("[data-btn-chg]").forEach(function (btn) {
        btn.addEventListener("click", function () { openChargeModal(btn.getAttribute("data-btn-chg")); });
    });
    document.querySelectorAll("[data-btn-pb]").forEach(function (btn) {
        btn.addEventListener("click", function () { openPassbookModal(btn.getAttribute("data-btn-pb")); });
    });
    document.querySelectorAll(".price-edit-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
            openPriceModal(btn.getAttribute("data-un"), Number(btn.getAttribute("data-pr")), btn.getAttribute("data-nm"));
        });
    });
}

/*
|--------------------------------------------------------------------------
| Cashbook & General Ledger
|--------------------------------------------------------------------------
*/

async function loadCashbook() {
    try {
        const data = await api("/api/money");
        cashbookEntries = data.entries || [];
        document.getElementById("tabCountCashbook").textContent = cashbookEntries.length;
        renderCashbook();
    } catch (e) {
        toast("Failed to load cashbook: " + e.message, "error");
    }
}

function renderCashbook() {
    const list = document.getElementById("cashbookCardsList");

    let filtered = cashbookEntries.filter(function (e) {
        if (currentCbFilter === "income" && (e.type !== "income" && e.type !== "payment")) return false;
        if (currentCbFilter === "debit" && (e.type !== "debit" && e.type !== "charge")) return false;
        return true;
    });

    if (filtered.length === 0) {
        list.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-dim);">No transactions found.</div>';
        return;
    }

    let html = "";
    for (const e of filtered) {
        const isIncome = e.type === "income" || e.type === "payment";
        const amtStr = isIncome ? "+ " + fmtMoney(e.amount) : "- " + fmtMoney(e.amount);
        const color = isIncome ? "#34d399" : "#fb7185";

        html +=
            '<div class="khata-card" style="padding:12px 14px;">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                    '<div>' +
                        '<div style="font-size:14px;font-weight:700;color:#fff;">' + escapeHtml(e.description) + '</div>' +
                        '<div style="font-size:11.5px;color:var(--text-dim);margin-top:2px;">' +
                            escapeHtml(e.entry_date) + ' · ' + (e.customer_username ? '<b>' + escapeHtml(e.customer_username) + '</b> · ' : '') + escapeHtml((e.payment_method || 'cash').toUpperCase()) +
                        '</div>' +
                    '</div>' +
                    '<div style="text-align:right;">' +
                        '<div style="font-size:16px;font-weight:800;color:' + color + ';">' + amtStr + '</div>' +
                        '<button class="btn sm danger icon-only" data-del="' + e.id + '" style="margin-top:4px;padding:3px 7px;font-size:11px;">🗑️</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
    }

    list.innerHTML = html;

    list.querySelectorAll("[data-del]").forEach(function (btn) {
        btn.addEventListener("click", function () { deleteEntry(Number(btn.getAttribute("data-del"))); });
    });
}

async function deleteEntry(id) {
    if (!confirm("Delete this entry?")) return;
    try {
        await api("/api/money/" + id, { method: "DELETE" });
        toast("Deleted entry", "info");
        loadKhata();
        loadCashbook();
    } catch (e) {
        toast("Delete failed: " + e.message, "error");
    }
}

/*
|--------------------------------------------------------------------------
| Periods / Earnings Forecast
|--------------------------------------------------------------------------
*/

function fmtShort(dateStr) {
    const parts = String(dateStr).split("-");
    if (parts.length !== 3) return dateStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return Number(parts[2]) + " " + months[Number(parts[1]) - 1];
}

async function loadPeriods() {
    try {
        const data = await api("/api/money/periods");
        const grid = document.getElementById("periodGrid");
        let html = "";

        for (const p of data.periods) {
            const rangeText = p.start === p.end ? fmtShort(p.start) : fmtShort(p.start) + " – " + fmtShort(p.end);
            const isMonth = p.key === "month";
            const profitColor = p.profit >= 0 ? "#34d399" : "#fb7185";

            html +=
                '<div class="period-card" style="' + (isMonth ? 'border-color:var(--primary);background:linear-gradient(180deg,rgba(37,99,235,0.1),var(--bg-card));' : '') + '">' +
                    '<div class="period-header">' +
                        '<div class="period-title">' + escapeHtml(p.label) + '</div>' +
                        '<div class="period-date">' + rangeText + '</div>' +
                    '</div>' +
                    '<div class="period-line"><span class="lbl">Actual Income:</span><span class="val" style="color:#34d399;">' + fmtMoney(p.income) + '</span></div>' +
                    '<div class="period-line"><span class="lbl">Upcoming (' + p.customerCount + ' users):</span><span class="val" style="color:#38bdf8;">' + fmtMoney(p.customerTotal) + '</span></div>' +
                    '<div class="period-line"><span class="lbl">Debits / Expenses:</span><span class="val" style="color:#fb7185;">' + fmtMoney(p.debits) + '</span></div>' +
                    (isMonth ? '<div class="period-line"><span class="lbl">Fixed CIR Cost:</span><span class="val" style="color:#fb7185;">' + fmtMoney(p.cost) + '</span></div>' : '') +
                    '<div class="period-div"></div>' +
                    '<div class="period-line"><span class="lbl"><b>Net Profit:</b></span><span class="val" style="color:' + profitColor + ';font-size:15px;">' + fmtMoney(p.profit) + '</span></div>' +
                '</div>';
        }

        grid.innerHTML = html;
    } catch (e) {
        toast("Failed to load projections: " + e.message, "error");
    }
}

/*
|--------------------------------------------------------------------------
| Payment Modal Handler ("Wasool")
|--------------------------------------------------------------------------
*/

function openPaymentModal(username) {
    const c = rawCustomers.find(function (x) { return x.username === username; });
    if (!c) return;

    document.getElementById("payUsername").value = c.username;
    document.getElementById("payCustomerName").textContent = c.name || c.username;
    document.getElementById("payCustomerUsername").textContent = c.username + (c.package ? " (" + c.package + ")" : "");

    const dueAmount = c.dueAmount > 0 ? c.dueAmount : (c.price || 0);
    document.getElementById("payAmount").value = dueAmount || "";

    const dueEl = document.getElementById("payCustomerDueInfo");
    if (c.dueAmount > 0) {
        dueEl.innerHTML = '<span style="color:#fb7185;font-weight:700;">Overdue: ' + fmtMoney(c.dueAmount) + '</span> (Expiry: ' + (c.expiryDate || 'Expired') + ')';
    } else if (c.advanceAmount > 0) {
        dueEl.innerHTML = '<span style="color:#34d399;font-weight:700;">Advance: ' + fmtMoney(c.advanceAmount) + '</span> (Monthly: ' + fmtMoney(c.price) + ')';
    } else {
        dueEl.innerHTML = '<span style="color:#38bdf8;">Monthly Fee: ' + fmtMoney(c.price) + '</span> (Expiry: ' + (c.expiryDate || 'N/A') + ')';
    }

    // Quick amount chips
    const chipsBox = document.getElementById("payQuickChips");
    const p = Number(c.price || 0);
    chipsBox.innerHTML =
        '<div class="amount-chip" onclick="setPayAmount(' + dueAmount + ')">Due: ' + fmtMoney(dueAmount) + '</div>' +
        (p && p !== dueAmount ? '<div class="amount-chip" onclick="setPayAmount(' + p + ')">1M: ' + fmtMoney(p) + '</div>' : '') +
        (p ? '<div class="amount-chip" onclick="setPayAmount(' + (p * 2) + ')">2M: ' + fmtMoney(p * 2) + '</div>' : '');

    document.getElementById("payDate").value = localDateString(new Date());
    document.getElementById("payNote").value = "";
    document.getElementById("payError").style.display = "none";
    document.getElementById("payAutoRenew").checked = true;

    openModal("modalPayment");
}

function setPayAmount(amt) {
    document.getElementById("payAmount").value = amt;
}

async function handlePaymentSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector("button[type='submit']");
    btn.disabled = true;

    const username = document.getElementById("payUsername").value;
    const amount = Number(document.getElementById("payAmount").value);
    const paymentMethod = document.getElementById("payMethod").value;
    const date = document.getElementById("payDate").value;
    const renewMonths = Number(document.getElementById("payRenewMonths").value);
    const autoRenew = document.getElementById("payAutoRenew").checked;
    const note = document.getElementById("payNote").value.trim();

    try {
        const res = await api("/api/money/khata/payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: username,
                amount: amount,
                paymentMethod: paymentMethod,
                date: date,
                autoRenew: autoRenew,
                renewMonths: renewMonths,
                description: note,
            }),
        });

        toast(res.message || "Payment recorded!", "success");
        closeModal("modalPayment");
        loadKhata();
    } catch (err) {
        const errEl = document.getElementById("payError");
        errEl.textContent = err.message;
        errEl.style.display = "block";
    } finally {
        btn.disabled = false;
    }
}

/*
|--------------------------------------------------------------------------
| Charge Modal Handler ("Udhaar")
|--------------------------------------------------------------------------
*/

function openChargeModal(username) {
    const c = rawCustomers.find(function (x) { return x.username === username; });
    if (!c) return;

    document.getElementById("chgUsername").value = c.username;
    document.getElementById("chgCustomerName").textContent = (c.name || c.username) + " (" + c.username + ")";
    document.getElementById("chgAmount").value = "";
    document.getElementById("chgDesc").value = "";
    document.getElementById("chgDate").value = localDateString(new Date());
    document.getElementById("chgError").style.display = "none";

    openModal("modalCharge");
}

async function handleChargeSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector("button[type='submit']");
    btn.disabled = true;

    const username = document.getElementById("chgUsername").value;
    const amount = Number(document.getElementById("chgAmount").value);
    const category = document.getElementById("chgCategory").value;
    const desc = document.getElementById("chgDesc").value.trim();
    const date = document.getElementById("chgDate").value;

    try {
        const res = await api("/api/money/khata/charge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: username,
                amount: amount,
                category: category,
                description: desc,
                date: date,
            }),
        });

        toast(res.message || "Charge recorded", "info");
        closeModal("modalCharge");
        loadKhata();
    } catch (err) {
        const errEl = document.getElementById("chgError");
        errEl.textContent = err.message;
        errEl.style.display = "block";
    } finally {
        btn.disabled = false;
    }
}

/*
|--------------------------------------------------------------------------
| Passbook Statement Modal
|--------------------------------------------------------------------------
*/

async function openPassbookModal(username) {
    openModal("modalPassbook");
    const headerEl = document.getElementById("pbHeaderCard");
    const listEl = document.getElementById("pbCardsList");
    const waEl = document.getElementById("pbWhatsAppBtn");

    headerEl.innerHTML = '<div style="color:var(--text-dim);font-size:13px;">Loading statement...</div>';
    listEl.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-dim);">Loading...</div>';
    waEl.innerHTML = "";

    try {
        const data = await api("/api/money/khata/" + encodeURIComponent(username));
        const c = data.customer || {};
        const txs = data.transactions || [];

        document.getElementById("pbTitle").textContent = "📜 " + (c.name || c.username);

        const balColor = c.netBalance > 0 ? "#fb7185" : (c.netBalance < 0 ? "#34d399" : "#94a3b8");
        const balLabel = c.netBalance > 0 ? "Due (Lene Hein)" : (c.netBalance < 0 ? "Advance" : "Settled");

        headerEl.innerHTML =
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">' +
                '<div>' +
                    '<div style="font-size:16px;font-weight:800;color:#fff;">' + escapeHtml(c.name || c.username) + '</div>' +
                    '<div style="color:var(--text-dim);font-size:12px;">' + escapeHtml(c.username) + (c.phone ? ' · ' + escapeHtml(c.phone) : '') + '</div>' +
                    '<div style="margin-top:4px;font-size:12px;color:#93c5fd;">' + escapeHtml(c.package) + ' · ' + fmtMoney(c.price) + '/mo</div>' +
                '</div>' +
                '<div style="text-align:right;">' +
                    '<div style="font-size:11px;color:var(--text-muted);">' + balLabel + '</div>' +
                    '<div style="font-size:20px;font-weight:800;color:' + balColor + ';">' + fmtMoney(Math.abs(c.netBalance)) + '</div>' +
                    '<div style="font-size:11.5px;color:var(--text-dim);">Paid: ' + fmtMoney(c.totalPaid) + '</div>' +
                '</div>' +
            '</div>';

        // WhatsApp Statement
        if (c.phone) {
            const cleanPhone = String(c.phone).replace(/[^0-9]/g, "");
            const waPhone = cleanPhone.startsWith("0") ? "92" + cleanPhone.slice(1) : cleanPhone;
            const pbLines = [
                "Statement for " + (c.name || c.username) + " (" + (c.package || "Internet") + "):",
                "Total Paid: Rs " + c.totalPaid,
                "Current Due Balance: Rs " + (c.netBalance > 0 ? c.netBalance : 0),
                "Expiry Date: " + (c.expiryDate || "N/A"),
                "Thank you for choosing our internet service!"
            ];
            const waMsg = encodeURIComponent(pbLines.join(String.fromCharCode(10)));
            waEl.innerHTML = '<a href="https://wa.me/' + waPhone + '?text=' + waMsg + '" target="_blank" class="btn sm whatsapp-btn">💬 Share on WA</a>';
        }

        if (txs.length === 0) {
            listEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-dim);font-size:13px;">No transactions recorded.</div>';
            return;
        }

        let html = "";
        for (const t of txs) {
            const isIncome = t.type === "income" || t.type === "payment";
            const amtStr = isIncome ? "+ " + fmtMoney(t.amount) : "- " + fmtMoney(t.amount);
            const color = isIncome ? "#34d399" : "#fb7185";

            html +=
                '<div style="background:#091224;padding:10px 12px;border-radius:10px;display:flex;justify-content:space-between;align-items:center;border:1px solid var(--border);">' +
                    '<div style="flex:1;min-width:0;margin-right:8px;">' +
                        '<div style="font-size:13.5px;font-weight:700;color:#fff;">' + escapeHtml(t.description) + '</div>' +
                        '<div style="font-size:11.5px;color:var(--text-dim);margin-top:2px;">' + escapeHtml(t.date) + ' · ' + escapeHtml((t.paymentMethod || "cash").toUpperCase()) + '</div>' +
                    '</div>' +
                    '<div style="display:flex;align-items:center;gap:10px;">' +
                        '<div style="font-size:15px;font-weight:800;color:' + color + ';">' + amtStr + '</div>' +
                        '<button type="button" class="btn danger sm" style="padding:4px 8px;font-size:11px;" title="Delete this entry" data-del-tx="' + t.id + '" data-user="' + escapeHtml(username) + '" data-desc="' + escapeHtml(t.description) + '">🗑️</button>' +
                    '</div>' +
                '</div>';
        }
        listEl.innerHTML = html;

        listEl.querySelectorAll("[data-del-tx]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                const txId = Number(btn.getAttribute("data-del-tx"));
                const u = btn.getAttribute("data-user");
                const desc = btn.getAttribute("data-desc");
                deletePassbookTx(txId, u, desc);
            });
        });
    } catch (err) {
        headerEl.innerHTML = '<div style="color:#fb7185;">Error: ' + err.message + '</div>';
    }
}

async function deletePassbookTx(id, username, desc) {
    if (!confirm("Are you sure you want to delete this entry (" + (desc || "transaction") + ")?")) return;
    try {
        await api("/api/money/" + id, { method: "DELETE" });
        toast("Transaction deleted!", "info");
        openPassbookModal(username);
        loadKhata();
    } catch (e) {
        toast("Failed to delete transaction: " + e.message, "error");
    }
}

/*
|--------------------------------------------------------------------------
| Quick Price Edit Modal
|--------------------------------------------------------------------------
*/

function openPriceModal(username, currentPrice, name) {
    document.getElementById("qpUsername").value = username;
    document.getElementById("qpName").textContent = (name || username) + " (" + username + ")";
    document.getElementById("qpPrice").value = currentPrice || "";
    document.getElementById("qpError").style.display = "none";
    openModal("modalPrice");
}

async function handlePriceSubmit(e) {
    e.preventDefault();
    const username = document.getElementById("qpUsername").value;
    const price = Number(document.getElementById("qpPrice").value);

    try {
        await api("/api/money/khata/quick-price", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: username, price: price }),
        });
        toast("Price updated for " + username, "success");
        closeModal("modalPrice");
        loadKhata();
    } catch (err) {
        const errEl = document.getElementById("qpError");
        errEl.textContent = err.message;
        errEl.style.display = "block";
    }
}

/*
|--------------------------------------------------------------------------
| Sync All Users to DigiKhata
|--------------------------------------------------------------------------
*/

document.getElementById("btnSyncAll").addEventListener("click", async function () {
    const btn = document.getElementById("btnSyncAll");
    btn.disabled = true;
    btn.textContent = "⏳ Syncing...";

    try {
        const res = await api("/api/money/khata/sync-all", { method: "POST" });
        toast("Synced " + res.totalCustomers + " customers into DigiKhata", "success");
        loadKhata();
    } catch (e) {
        toast("Sync failed: " + e.message, "error");
    } finally {
        btn.disabled = false;
        btn.textContent = "⚡ Sync Users";
    }
});

/*
|--------------------------------------------------------------------------
| General Cash In / Out
|--------------------------------------------------------------------------
*/

document.getElementById("btnAddCash").addEventListener("click", function () {
    document.getElementById("gcTitle").textContent = "💵 Add Transaction";
    document.getElementById("gcType").value = "income";
    document.getElementById("gcDesc").value = "";
    document.getElementById("gcAmount").value = "";
    document.getElementById("gcCategory").value = "";
    document.getElementById("gcDate").value = localDateString(new Date());
    document.getElementById("gcError").style.display = "none";
    openModal("modalGeneralCash");
});

document.getElementById("btnAddIncome").addEventListener("click", function () {
    document.getElementById("gcTitle").textContent = "🟢 Add Cash In";
    document.getElementById("gcType").value = "income";
    document.getElementById("gcDesc").value = "";
    document.getElementById("gcAmount").value = "";
    document.getElementById("gcCategory").value = "";
    document.getElementById("gcDate").value = localDateString(new Date());
    document.getElementById("gcError").style.display = "none";
    openModal("modalGeneralCash");
});

document.getElementById("btnAddExpense").addEventListener("click", function () {
    document.getElementById("gcTitle").textContent = "🔴 Add Cash Out";
    document.getElementById("gcType").value = "debit";
    document.getElementById("gcDesc").value = "";
    document.getElementById("gcAmount").value = "";
    document.getElementById("gcCategory").value = "";
    document.getElementById("gcDate").value = localDateString(new Date());
    document.getElementById("gcError").style.display = "none";
    openModal("modalGeneralCash");
});

async function handleGeneralCashSubmit(e) {
    e.preventDefault();
    const type = document.getElementById("gcType").value;
    const desc = document.getElementById("gcDesc").value.trim();
    const amount = Number(document.getElementById("gcAmount").value);
    const paymentMethod = document.getElementById("gcMethod").value;
    const category = document.getElementById("gcCategory").value.trim();
    const date = document.getElementById("gcDate").value;

    try {
        await api("/api/money", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: type,
                description: desc,
                amount: amount,
                paymentMethod: paymentMethod,
                category: category,
                date: date,
            }),
        });

        toast("Recorded transaction!", "success");
        closeModal("modalGeneralCash");
        loadKhata();
        loadCashbook();
    } catch (err) {
        const errEl = document.getElementById("gcError");
        errEl.textContent = err.message;
        errEl.style.display = "block";
    }
}

/*
|--------------------------------------------------------------------------
| Settings (Costs & Packages)
|--------------------------------------------------------------------------
*/

document.getElementById("btnSettings").addEventListener("click", openSettingsModal);

async function openSettingsModal() {
    openModal("modalSettings");
    document.getElementById("settingsError").style.display = "none";

    try {
        const [settingsData, pkgData] = await Promise.all([
            api("/api/money/settings"),
            api("/api/money/packages"),
        ]);

        const settings = settingsData.settings || {};
        const costs = settings.monthlyCosts || [];
        const costList = document.getElementById("costList");
        costList.innerHTML = "";

        costs.forEach(function (c) {
            addCostRow(c.label, c.amount);
        });

        const pkgList = document.getElementById("pkgList");
        pkgList.innerHTML = "";
        const packages = pkgData.packages || [];

        packages.forEach(function (pkg) {
            const row = document.createElement("div");
            row.style.display = "flex";
            row.style.gap = "8px";
            row.style.alignItems = "center";
            row.innerHTML =
                '<div style="flex:1;font-size:13px;color:#fff;">' + escapeHtml(pkg.name) + '</div>' +
                '<input type="number" class="pkg-price-input" data-pkg="' + escapeHtml(pkg.name) + '" value="' + (pkg.price || "") + '" placeholder="Rs 0" style="width:120px;padding:6px 10px;">';
            pkgList.appendChild(row);
        });
    } catch (e) {
        toast("Failed to load settings: " + e.message, "error");
    }
}

function addCostRow(label, amount) {
    const list = document.getElementById("costList");
    const row = document.createElement("div");
    row.className = "cost-item-row";
    row.style.display = "flex";
    row.style.gap = "6px";
    row.style.alignItems = "center";
    row.innerHTML =
        '<input type="text" class="cost-label" placeholder="Cost label (e.g. CIR)" value="' + escapeHtml(label || "") + '" style="flex:1;padding:6px 10px;">' +
        '<input type="number" class="cost-amount" placeholder="Rs" value="' + (amount !== undefined && amount !== null ? amount : "") + '" style="width:110px;padding:6px 10px;">' +
        '<button type="button" class="btn danger sm icon-only">✕</button>';
    row.querySelector("button").addEventListener("click", function () { row.remove(); });
    list.appendChild(row);
}

document.getElementById("btnAddCostRow").addEventListener("click", function () {
    addCostRow("", "");
});

document.getElementById("btnSaveSettings").addEventListener("click", async function () {
    const costRows = document.querySelectorAll(".cost-item-row");
    const monthlyCosts = [];

    costRows.forEach(function (r) {
        const l = r.querySelector(".cost-label").value.trim();
        const a = Number(r.querySelector(".cost-amount").value);
        if (l && Number.isFinite(a) && a >= 0) {
            monthlyCosts.push({ label: l, amount: a });
        }
    });

    if (monthlyCosts.length === 0) {
        document.getElementById("settingsError").textContent = "At least one monthly fixed cost is required";
        document.getElementById("settingsError").style.display = "block";
        return;
    }

    const packagePrices = {};
    document.querySelectorAll(".pkg-price-input").forEach(function (inp) {
        const name = inp.dataset.pkg;
        const val = inp.value.trim();
        if (val !== "") {
            packagePrices[name] = Number(val);
        }
    });

    try {
        await api("/api/money/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                monthlyCosts: monthlyCosts,
                packagePrices: packagePrices,
            }),
        });

        toast("Settings saved!", "success");
        closeModal("modalSettings");
        loadKhata();
    } catch (e) {
        document.getElementById("settingsError").textContent = e.message;
        document.getElementById("settingsError").style.display = "block";
    }
});

/*
| Initial Load
*/
loadKhata();

</script>
</body>
</html>`;

    res.send(html);
}

module.exports = { renderMoneyPage };