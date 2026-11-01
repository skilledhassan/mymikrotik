function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderAnalyticsPage(req, res) {
    const user = req.user || { username: "admin", name: "Administrator" };

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Top Bandwidth Users &amp; Consumption | MikroTik</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">

<style>
:root {
    --bg-main: #060a12;
    --bg-card: rgba(11, 19, 36, 0.95);
    --border: rgba(255, 255, 255, 0.08);
    --primary: #3b82f6;
    --success: #10b981;
    --warning: #f59e0b;
    --danger: #ef4444;
    --purple: #a855f7;
    --text-main: #f8fafc;
    --text-muted: #94a3b8;
    --text-dim: #64748b;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    background-color: var(--bg-main);
    color: var(--text-main);
    min-height: 100vh;
    padding-bottom: 90px;
    background-image: 
        radial-gradient(circle at 15% 15%, rgba(59, 130, 246, 0.06) 0%, transparent 40%),
        radial-gradient(circle at 85% 85%, rgba(168, 85, 247, 0.06) 0%, transparent 40%);
}

.container {
    max-width: 1300px;
    margin: 0 auto;
    padding: 16px 20px;
}

/* App Bar */
.app-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 0 20px 0;
    border-bottom: 1px solid var(--border);
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 16px;
}

.brand {
    display: flex;
    align-items: center;
    gap: 14px;
}

.brand-icon {
    width: 44px;
    height: 44px;
    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.35);
}

.brand-title {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: #ffffff;
}

.brand-sub {
    font-size: 13px;
    color: var(--text-muted);
}

/* Navigation items */
.nav-links {
    display: flex;
    gap: 8px;
    align-items: center;
}

.nav-link {
    color: var(--text-muted);
    text-decoration: none;
    font-size: 13px;
    font-weight: 600;
    padding: 8px 14px;
    border-radius: 8px;
    border: 1px solid transparent;
    transition: all 0.2s;
}

.nav-link:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.05);
}

.nav-link.active {
    color: #fff;
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.3);
}

.user-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.04);
    padding: 6px 12px;
    border-radius: 20px;
    border: 1px solid var(--border);
}

/* Period selector banner */
.period-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 12px 18px;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 12px;
}

.period-pills {
    display: flex;
    gap: 6px;
    background: rgba(15, 23, 42, 0.7);
    padding: 4px;
    border-radius: 10px;
    border: 1px solid var(--border);
}

.period-pill {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 12.5px;
    font-weight: 700;
    padding: 7px 16px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
}

.period-pill:hover {
    color: #fff;
}

.period-pill.active {
    background: #3b82f6;
    color: #fff;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
}

.refresh-btn {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid var(--border);
    color: var(--text-main);
    font-size: 12.5px;
    font-weight: 600;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
}

.refresh-btn:hover {
    background: rgba(255, 255, 255, 0.1);
}

/* KPI Summary Cards */
.kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
}

.kpi-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 18px 20px;
    position: relative;
    overflow: hidden;
}

.kpi-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
}

.kpi-card.purple::before { background: linear-gradient(90deg, #a855f7, #6366f1); }
.kpi-card.green::before { background: linear-gradient(90deg, #10b981, #06b6d4); }
.kpi-card.blue::before { background: linear-gradient(90deg, #3b82f6, #38bdf8); }
.kpi-card.amber::before { background: linear-gradient(90deg, #f59e0b, #ec4899); }

.kpi-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
}

.kpi-value {
    font-size: 26px;
    font-weight: 800;
    font-family: 'JetBrains Mono', monospace;
    color: #fff;
    margin-bottom: 6px;
}

.kpi-sub {
    font-size: 12px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 10px;
}

/* Leaderboard Content Card */
.content-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 22px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    margin-bottom: 24px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px;
    flex-wrap: wrap;
    gap: 14px;
}

.card-title {
    font-size: 17px;
    font-weight: 800;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 8px;
}

/* Search and Filters toolbar */
.toolbar {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
}

.search-input {
    background: #0d1527;
    border: 1px solid var(--border);
    border-radius: 8px;
    color: #fff;
    font-size: 13px;
    padding: 8px 14px;
    outline: none;
    min-width: 220px;
    transition: border-color 0.2s;
}

.search-input:focus {
    border-color: #3b82f6;
}

.filter-select {
    background: #0d1527;
    border: 1px solid var(--border);
    border-radius: 8px;
    color: #fff;
    font-size: 12.5px;
    font-weight: 600;
    padding: 8px 12px;
    outline: none;
    cursor: pointer;
}

/* Table styling */
.table-wrap {
    overflow-x: auto;
    border-radius: 12px;
    border: 1px solid var(--border);
}

table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    text-align: left;
}

th {
    background: #0d1527;
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
}

td {
    padding: 14px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    vertical-align: middle;
}

tr:hover td {
    background: rgba(255, 255, 255, 0.02);
}

.rank-cell {
    font-weight: 800;
    font-size: 14px;
    width: 60px;
    text-align: center;
}

.rank-1 { color: #fbbf24; }
.rank-2 { color: #cbd5e1; }
.rank-3 { color: #d97706; }

.user-title {
    font-weight: 700;
    color: #fff;
    font-size: 14px;
}

.user-meta {
    font-size: 11.5px;
    color: var(--text-muted);
    margin-top: 2px;
}

.rate-val {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    font-size: 13px;
}
.rate-val.dl { color: #34d399; }
.rate-val.ul { color: #38bdf8; }
.rate-val.tot { color: #c084fc; font-weight: 800; font-size: 14px; }

.status-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 6px;
}
.status-dot.online { background: #10b981; box-shadow: 0 0 8px #10b981; }
.status-dot.offline { background: #64748b; }

.bar-wrap {
    width: 120px;
    height: 6px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 3px;
    overflow: hidden;
    margin-top: 4px;
}
.bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #a855f7);
    border-radius: 3px;
}

.btn-action {
    background: rgba(16, 185, 129, 0.15);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #34d399;
    font-size: 11.5px;
    font-weight: 700;
    padding: 6px 10px;
    border-radius: 6px;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: all 0.2s;
}
.btn-action:hover {
    background: rgba(16, 185, 129, 0.25);
}

.btn-history {
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #60a5fa;
    font-size: 11.5px;
    font-weight: 700;
    padding: 6px 10px;
    border-radius: 6px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-right: 6px;
    transition: all 0.2s;
}
.btn-history:hover {
    background: rgba(59, 130, 246, 0.25);
}

/* History Modal */
.modal-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(4px);
    z-index: 1000;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.modal-content {
    background: #0b1324;
    border: 1px solid var(--border);
    border-radius: 16px;
    width: 100%;
    max-width: 650px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
}

.modal-body {
    padding: 20px;
    overflow-y: auto;
}

.modal-close {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 20px;
    cursor: pointer;
}

/* Bottom dock */
.bottom-dock {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(11, 19, 36, 0.95);
    backdrop-filter: blur(12px);
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-around;
    padding: 10px 0;
    z-index: 100;
}

.dock-item {
    color: var(--text-muted);
    text-decoration: none;
    font-size: 11px;
    font-weight: 600;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
}
.dock-item.active { color: #3b82f6; }
.dock-icon { font-size: 18px; }

@media (max-width: 768px) {
    .nav-links { display: none; }
    .kpi-grid { grid-template-columns: 1fr; }
    .toolbar { width: 100%; }
    .search-input { width: 100%; }
}
</style>
</head>

<body>

<div class="container">

    <!-- App Bar -->
    <header class="app-bar">
        <div class="brand">
            <div class="brand-icon">🏆</div>
            <div>
                <div class="brand-title">Top Bandwidth Consumers</div>
                <div class="brand-sub">Real-Time Data Consumption &amp; ISP Usage Leaderboard</div>
            </div>
        </div>

        <nav class="nav-links">
            <a href="/" class="nav-link">📊 Dashboard</a>
            <a href="/users" class="nav-link">👥 Customers</a>
            <a href="/queues" class="nav-link">⚡ Booster</a>
            <a href="/money" class="nav-link">💳 DigiKhata</a>
            <a href="/top-users" class="nav-link active">🏆 Top Users</a>
            <a href="/whatsapp" class="nav-link">💬 WhatsApp</a>
        </nav>

        <div class="user-badge">
            <span>👤 ${escapeHtml(user.username)}</span>
            <a href="/logout" style="color:#ef4444;text-decoration:none;font-weight:700;margin-left:6px;">Logout</a>
        </div>
    </header>

    <!-- Period Toolbar -->
    <div class="period-bar">
        <div class="period-pills" id="periodPills">
            <button class="period-pill active" data-period="today" onclick="setPeriod('today')">Today</button>
            <button class="period-pill" data-period="yesterday" onclick="setPeriod('yesterday')">Yesterday</button>
            <button class="period-pill" data-period="7days" onclick="setPeriod('7days')">Last 7 Days</button>
            <button class="period-pill" data-period="month" onclick="setPeriod('month')">This Month</button>
        </div>

        <div style="display:flex;align-items:center;gap:10px;">
            <span id="lastUpdated" style="font-size:12px;color:var(--text-muted);">Live tracking active</span>
            <button class="refresh-btn" onclick="loadData()">
                <span>🔄</span> Refresh
            </button>
        </div>
    </div>

    <!-- KPI Summary Grid -->
    <div class="kpi-grid">
        <div class="kpi-card purple">
            <div class="kpi-label">📦 Total Data Consumed</div>
            <div class="kpi-value" id="kpiTotal">–</div>
            <div class="kpi-sub">
                <span style="color:#34d399;">↓ <span id="kpiDl">–</span> DL</span>
                <span style="color:#38bdf8;">↑ <span id="kpiUl">–</span> UL</span>
            </div>
        </div>

        <div class="kpi-card amber">
            <div class="kpi-label">👑 #1 Top Consumer</div>
            <div class="kpi-value" id="kpiTopUser" style="font-size:20px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;">–</div>
            <div class="kpi-sub">
                <span id="kpiTopUsage" style="font-weight:700;color:#fbbf24;">–</span>
                <span id="kpiTopPkg">Package: –</span>
            </div>
        </div>

        <div class="kpi-card blue">
            <div class="kpi-label">👥 Active Consumers</div>
            <div class="kpi-value" id="kpiCount">–</div>
            <div class="kpi-sub">Subscribers actively consuming data</div>
        </div>

        <div class="kpi-card green">
            <div class="kpi-label">⚡ Average Consumption</div>
            <div class="kpi-value" id="kpiAvg">–</div>
            <div class="kpi-sub">Average per active subscriber</div>
        </div>
    </div>

    <!-- Leaderboard Table -->
    <div class="content-card">
        <div class="card-header">
            <div class="card-title">
                <span>🏆 Data Usage Leaderboard</span>
                <span style="font-size:12px;font-weight:600;color:var(--text-dim);" id="tableSubtitle"></span>
            </div>

            <div class="toolbar">
                <input type="text" class="search-input" id="searchInput" placeholder="🔍 Search username, name, phone..." oninput="debounceSearch()">
                <select class="filter-select" id="sortSelect" onchange="loadData()">
                    <option value="total">Sort: Total Data (High to Low)</option>
                    <option value="download">Sort: Download (RX) Only</option>
                    <option value="upload">Sort: Upload (TX) Only</option>
                    <option value="peak">Sort: Peak Speed (Mbps)</option>
                    <option value="online">Sort: Online Duration</option>
                </select>
                <select class="filter-select" id="limitSelect" onchange="loadData()">
                    <option value="25">Top 25</option>
                    <option value="50" selected>Top 50</option>
                    <option value="100">Top 100</option>
                    <option value="500">All</option>
                </select>
            </div>
        </div>

        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th style="width:60px;text-align:center;">Rank</th>
                        <th>Subscriber</th>
                        <th>Status</th>
                        <th>Download (RX)</th>
                        <th>Upload (TX)</th>
                        <th>Total Consumed</th>
                        <th>Peak Speed</th>
                        <th>Online Time</th>
                        <th style="text-align:right;">Actions</th>
                    </tr>
                </thead>
                <tbody id="usersTbody">
                    <tr><td colspan="9" style="text-align:center;padding:32px;color:var(--text-muted);">Loading bandwidth analytics...</td></tr>
                </tbody>
            </table>
        </div>
    </div>

</div>

<!-- Customer History Modal -->
<div class="modal-overlay" id="historyModal">
    <div class="modal-content">
        <div class="modal-header">
            <div style="font-weight:800;font-size:16px;" id="historyTitle">Customer Data Usage History</div>
            <button class="modal-close" onclick="closeHistoryModal()">&times;</button>
        </div>
        <div class="modal-body" id="historyBody">
            <div style="text-align:center;padding:24px;color:var(--text-muted);">Loading history...</div>
        </div>
    </div>
</div>

<!-- Mobile Bottom Dock -->
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
    <a href="/money" class="dock-item">
        <div class="dock-icon">💳</div>
        <div>DigiKhata</div>
    </a>
    <a href="/top-users" class="dock-item active">
        <div class="dock-icon">🏆</div>
        <div>Top Users</div>
    </a>
    <a href="/whatsapp" class="dock-item">
        <div class="dock-icon">💬</div>
        <div>WhatsApp</div>
    </a>
</nav>

<script>
let currentPeriod = "today";
let searchTimer = null;

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function setPeriod(p) {
    currentPeriod = p;
    document.querySelectorAll(".period-pill").forEach(function(btn) {
        if (btn.getAttribute("data-period") === p) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
    loadData();
}

function debounceSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadData, 300);
}

async function loadData() {
    const sort = document.getElementById("sortSelect").value;
    const limit = document.getElementById("limitSelect").value;
    const search = document.getElementById("searchInput").value.trim();

    const tbody = document.getElementById("usersTbody");

    try {
        const queryParams = new URLSearchParams({
            period: currentPeriod,
            sort: sort,
            limit: limit,
            search: search,
        });

        const res = await fetch("/api/analytics/top-users?" + queryParams.toString());
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();

        // Update KPIs
        const s = data.summary || {};
        document.getElementById("kpiTotal").textContent = s.total_formatted || "0 MB";
        document.getElementById("kpiDl").textContent = s.total_download_formatted || "0 MB";
        document.getElementById("kpiUl").textContent = s.total_upload_formatted || "0 MB";
        document.getElementById("kpiCount").textContent = data.count || 0;
        document.getElementById("kpiAvg").textContent = s.avg_formatted || "0 MB";

        if (s.top_consumer) {
            document.getElementById("kpiTopUser").textContent = s.top_consumer.name || s.top_consumer.username;
            document.getElementById("kpiTopUsage").textContent = s.top_consumer.total_formatted;
            document.getElementById("kpiTopPkg").textContent = "Package: " + (s.top_consumer.package || "–");
        } else {
            document.getElementById("kpiTopUser").textContent = "None";
            document.getElementById("kpiTopUsage").textContent = "0 MB";
            document.getElementById("kpiTopPkg").textContent = "";
        }

        document.getElementById("tableSubtitle").textContent = "Showing " + (data.users || []).length + " consumers for " + currentPeriod;

        if (!data.users || data.users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--text-muted);">No bandwidth usage recorded for this period yet. (Worker accumulates data while users are active)</td></tr>';
            return;
        }

        let html = "";
        for (const u of data.users) {
            const medalClass = u.rank === 1 ? 'rank-1' : (u.rank === 2 ? 'rank-2' : (u.rank === 3 ? 'rank-3' : ''));
            const rankDisplay = u.medal ? (u.medal + ' #' + u.rank) : ('#' + u.rank);
            const isOnline = Boolean(u.is_online);

            const liveSpeedText = isOnline
                ? ('<div style="font-size:11px;color:#34d399;font-weight:700;">Live: ' + Number(u.current_total_mbps || 0).toFixed(2) + ' Mbps</div>')
                : '';

            html += 
                '<tr>' +
                    '<td class="rank-cell ' + medalClass + '">' + rankDisplay + '</td>' +
                    '<td>' +
                        '<div class="user-title">' + escapeHtml(u.name || u.username) + '</div>' +
                        '<div class="user-meta">' +
                            '<b>' + escapeHtml(u.username) + '</b> • ' + escapeHtml(u.package || "–") +
                            (u.phone ? (' • 📞 ' + escapeHtml(u.phone)) : '') +
                        '</div>' +
                    '</td>' +
                    '<td>' +
                        '<div style="display:flex;align-items:center;">' +
                            '<span class="status-dot ' + (isOnline ? 'online' : 'offline') + '"></span>' +
                            '<span style="font-size:12px;font-weight:600;color:' + (isOnline ? '#34d399' : '#94a3b8') + ';">' + (isOnline ? 'ONLINE' : 'Offline') + '</span>' +
                        '</div>' +
                        liveSpeedText +
                    '</td>' +
                    '<td>' +
                        '<div class="rate-val dl">' + u.download_formatted + '</div>' +
                        '<div style="font-size:10.5px;color:var(--text-dim);">' + u.download_mb.toLocaleString() + ' MB</div>' +
                    '</td>' +
                    '<td>' +
                        '<div class="rate-val ul">' + u.upload_formatted + '</div>' +
                        '<div style="font-size:10.5px;color:var(--text-dim);">' + u.upload_mb.toLocaleString() + ' MB</div>' +
                    '</td>' +
                    '<td>' +
                        '<div class="rate-val tot">' + u.total_formatted + '</div>' +
                        '<div class="bar-wrap">' +
                            '<div class="bar-fill" style="width:' + u.percent_of_total + '%;"></div>' +
                        '</div>' +
                        '<div style="font-size:10px;color:var(--text-dim);margin-top:2px;">' + u.percent_of_total + '% of network</div>' +
                    '</td>' +
                    '<td>' +
                        '<div style="font-weight:700;font-size:12.5px;">↓ ' + u.peak_rx_mbps + ' Mbps</div>' +
                        '<div style="font-size:11px;color:var(--text-dim);">↑ ' + u.peak_tx_mbps + ' Mbps</div>' +
                    '</td>' +
                    '<td>' +
                        '<div style="font-weight:600;">' + u.online_formatted + '</div>' +
                    '</td>' +
                    '<td style="text-align:right;white-space:nowrap;">' +
                        '<button class="btn-history" onclick="viewUserHistory(\\'' + escapeHtml(u.username) + '\\')">📈 History</button>' +
                        (u.phone ? ('<a class="btn-action" href="/users?search=' + encodeURIComponent(u.username) + '">💬 WA</a>') : '') +
                    '</td>' +
                '</tr>';
        }

        tbody.innerHTML = html;
        document.getElementById("lastUpdated").textContent = "Updated " + new Date().toLocaleTimeString();

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:24px;color:#ef4444;">Error loading analytics: ' + e.message + '</td></tr>';
    }
}

async function viewUserHistory(username) {
    document.getElementById("historyModal").style.display = "flex";
    document.getElementById("historyTitle").textContent = "Data Usage History: " + username;
    const body = document.getElementById("historyBody");
    body.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);">Fetching 14-day history...</div>';

    try {
        const res = await fetch("/api/analytics/user/" + encodeURIComponent(username) + "?days=14");
        const data = await res.json();

        if (!data.history || data.history.length === 0) {
            body.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);">No historical records found for this subscriber.</div>';
            return;
        }

        let hHtml = '<table style="width:100%;font-size:12.5px;"><thead><tr><th>Date</th><th>Download</th><th>Upload</th><th>Total</th><th>Peak Speed</th><th>Online</th></tr></thead><tbody>';
        for (const row of data.history) {
            hHtml +=
                '<tr>' +
                    '<td><b>' + row.date + '</b></td>' +
                    '<td style="color:#34d399;font-weight:700;">' + row.download_formatted + '</td>' +
                    '<td style="color:#38bdf8;font-weight:700;">' + row.upload_formatted + '</td>' +
                    '<td style="color:#c084fc;font-weight:800;">' + row.total_formatted + '</td>' +
                    '<td>' + row.peak_rx_mbps + ' Mbps</td>' +
                    '<td>' + row.online_formatted + '</td>' +
                '</tr>';
        }
        hHtml += '</tbody></table>';
        body.innerHTML = hHtml;
    } catch (e) {
        body.innerHTML = '<div style="color:#ef4444;text-align:center;padding:24px;">Failed to load history: ' + e.message + '</div>';
    }
}

function closeHistoryModal() {
    document.getElementById("historyModal").style.display = "none";
}

loadData();
// Automatically refresh leaderboard every 10 seconds
setInterval(loadData, 10000);
</script>
</body>
</html>`;

    res.send(html);
}

module.exports = {
    renderAnalyticsPage,
};
