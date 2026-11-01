const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const CONFIG = {
    host: "187.53.134.170",
    user: "hassan",
    pass: "Player@1187",
    hostkey: "SHA256:WtLgZNyVZ0NzIBCbijzmthw8izKfF8ll6H2YbdxdPxk",
    plink: "C:\\Program Files\\PuTTY\\plink.exe",
    pscp: "C:\\Program Files\\PuTTY\\pscp.exe",
    localDir: path.resolve(__dirname, ".."),
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runLocal(cmd, desc, retries = 3) {
    console.log(`\n---> [Local] ${desc}`);
    for (let i = 1; i <= retries; i++) {
        try {
            const out = execSync(cmd, { stdio: "pipe", maxBuffer: 10 * 1024 * 1024 });
            const res = out.toString().trim();
            if (res) console.log(res);
            return res;
        } catch (err) {
            console.warn(`[Local attempt ${i}/${retries}] failed: ${desc}`);
            if (i === retries) throw err;
            await sleep(2000);
        }
    }
}

async function runRemote(cmd, desc, retries = 3) {
    console.log(`\n---> [SSH] ${desc}`);
    const plinkCmd = `"${CONFIG.plink}" -batch -hostkey "${CONFIG.hostkey}" -pw "${CONFIG.pass}" ${CONFIG.user}@${CONFIG.host} "echo '${CONFIG.pass}' | sudo -S ${cmd}"`;
    for (let i = 1; i <= retries; i++) {
        try {
            const out = execSync(plinkCmd, { stdio: "pipe", maxBuffer: 20 * 1024 * 1024 });
            const res = out.toString().trim();
            if (res) console.log(res);
            return res;
        } catch (err) {
            console.warn(`[SSH attempt ${i}/${retries}] failed: ${desc}`);
            if (i === retries) {
                if (err.stdout) console.log(err.stdout.toString());
                if (err.stderr) console.error(err.stderr.toString());
                throw err;
            }
            await sleep(3000);
        }
    }
}

async function main() {
    console.log("==================================================");
    console.log("🚀 Setting up OpenWA WhatsApp Service on aaPanel VPS");
    console.log(`   Host: ${CONFIG.host}`);
    console.log("==================================================\n");

    const distTar = path.join(CONFIG.localDir, "openwa_dist.tar.gz");
    const envOpenwa = path.join(CONFIG.localDir, "scripts", ".env.openwa.production");
    const envProd = path.join(CONFIG.localDir, "scripts", ".env.production");
    const setupSh = path.join(CONFIG.localDir, "scripts", "setup_openwa.sh");

    // 1. Upload files
    await runLocal(
        `"${CONFIG.pscp}" -batch -hostkey "${CONFIG.hostkey}" -pw "${CONFIG.pass}" "${distTar}" ${CONFIG.user}@${CONFIG.host}:/home/hassan/openwa_dist.tar.gz`,
        "1. Upload openwa_dist.tar.gz"
    );

    await runLocal(
        `"${CONFIG.pscp}" -batch -hostkey "${CONFIG.hostkey}" -pw "${CONFIG.pass}" "${envOpenwa}" ${CONFIG.user}@${CONFIG.host}:/home/hassan/openwa.env`,
        "2. Upload openwa.env"
    );

    await runLocal(
        `"${CONFIG.pscp}" -batch -hostkey "${CONFIG.hostkey}" -pw "${CONFIG.pass}" "${envProd}" ${CONFIG.user}@${CONFIG.host}:/home/hassan/.env.production`,
        "3. Upload .env.production"
    );

    await runLocal(
        `"${CONFIG.pscp}" -batch -hostkey "${CONFIG.hostkey}" -pw "${CONFIG.pass}" "${setupSh}" ${CONFIG.user}@${CONFIG.host}:/home/hassan/setup_openwa.sh`,
        "4. Upload setup_openwa.sh"
    );

    // 2. Run remote setup script
    await runRemote(
        "bash /home/hassan/setup_openwa.sh",
        "5. Execute setup_openwa.sh on VPS"
    );

    // 3. Test WhatsApp testConnection from panel
    console.log("\nTesting OpenWA gateway from mymikrotik application...");
    await runRemote(
        "node -e \"require('dotenv').config({ path: '/www/wwwroot/mymikrotik/.env' }); const wa = require('/www/wwwroot/mymikrotik/whatsapp'); wa.testConnection().then(res => { console.log('WhatsApp connection test result:', JSON.stringify(res, null, 2)); process.exit(res.ok ? 0 : 1); }).catch(err => { console.error('Test error:', err); process.exit(1); });\"",
        "6. Test WhatsApp gateway connection from mymikrotik"
    );

    console.log("==================================================");
    console.log("🎉 OpenWA WHATSAPP GATEWAY IS RUNNING & CONNECTED!");
    console.log("==================================================");
}

main().catch(err => {
    console.error("FATAL ERROR in OpenWA setup:", err.message);
    process.exit(1);
});
