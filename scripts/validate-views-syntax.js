const fs = require("fs");
const path = require("path");
const vm = require("vm");

const viewsDir = path.resolve(__dirname, "..", "views");

const viewFiles = [
    { name: "usersPage.js", fn: "renderUsersPage" },
    { name: "dashboardPage.js", fn: "renderDashboardPage" },
    { name: "whatsappPage.js", fn: "renderWhatsAppPage" },
    { name: "moneyPage.js", fn: "renderMoneyPage" },
    { name: "analyticsPage.js", fn: "renderAnalyticsPage" },
    { name: "queuesPage.js", fn: "renderQueuesPage" }
];

console.log("Checking views for client-side JavaScript syntax errors...\n");

for (const vf of viewFiles) {
    const fullPath = path.join(viewsDir, vf.name);
    if (!fs.existsSync(fullPath)) continue;

    try {
        const mod = require(fullPath);
        const renderFn = mod[vf.fn] || (typeof mod === "function" ? mod : null);
        if (!renderFn) {
            console.error(`❌ Could not find function ${vf.fn} in ${vf.name}`);
            continue;
        }

        let capturedHtml = "";
        const mockReq = {
            session: { username: "admin" },
            user: { username: "admin" },
            query: {},
            params: {}
        };
        const mockRes = {
            send: (h) => { capturedHtml = h; },
            status: () => mockRes,
            render: () => {}
        };

        try {
            renderFn(mockReq, mockRes);
        } catch (e) {
            console.error(`Error rendering ${vf.name}:`, e.message);
            continue;
        }

        if (!capturedHtml) {
            console.warn(`[${vf.name}] No HTML captured.`);
            continue;
        }

        // Extract <script> blocks (excluding script src="...")
        const scriptRegex = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
        let match;
        let scriptIndex = 1;
        while ((match = scriptRegex.exec(capturedHtml)) !== null) {
            const scriptContent = match[1];
            try {
                new vm.Script(scriptContent);
                console.log(`✓ [${vf.name}] Script block #${scriptIndex} is SYNTACTICALLY VALID.`);
            } catch (err) {
                console.error(`❌ [${vf.name}] Script block #${scriptIndex} SYNTAX ERROR:`, err.message);
                const lines = scriptContent.split("\n");
                const errLineMatch = err.stack.match(/evalmachine\.<anonymous>:(\d+)/);
                if (errLineMatch) {
                    const lineNo = parseInt(errLineMatch[1], 10);
                    console.error(`   Error around line ${lineNo}:`);
                    for (let i = Math.max(0, lineNo - 4); i <= Math.min(lines.length - 1, lineNo + 4); i++) {
                        console.error(`   ${i + 1}: ${lines[i]}`);
                    }
                }
            }
            scriptIndex++;
        }
    } catch (err) {
        console.error(`Error processing ${vf.name}:`, err);
    }
}
