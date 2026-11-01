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
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const out = execSync(cmd, { stdio: "pipe", maxBuffer: 10 * 1024 * 1024 });
            const result = out.toString().trim();
            console.log(result);
            return result;
        } catch (err) {
            console.warn(`[Attempt ${attempt}/${retries}] Failed: ${desc}`);
            if (attempt === retries) {
                if (err.stdout) console.log(err.stdout.toString());
                if (err.stderr) console.error(err.stderr.toString());
                throw err;
            }
            await sleep(2000);
        }
    }
}

async function runRemote(cmd, desc, retries = 3) {
    console.log(`\n---> [SSH] ${desc}`);
    const plinkCmd = `"${CONFIG.plink}" -batch -hostkey "${CONFIG.hostkey}" -pw "${CONFIG.pass}" ${CONFIG.user}@${CONFIG.host} "echo '${CONFIG.pass}' | sudo -S ${cmd}"`;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const out = execSync(plinkCmd, { stdio: "pipe", maxBuffer: 10 * 1024 * 1024 });
            const result = out.toString().trim();
            console.log(result);
            return result;
        } catch (err) {
            console.warn(`[Attempt ${attempt}/${retries}] Failed: ${desc}`);
            if (attempt === retries) {
                if (err.stdout) console.log(err.stdout.toString());
                if (err.stderr) console.error(err.stderr.toString());
                throw err;
            }
            await sleep(2000);
        }
    }
}

async function main() {
    console.log("==========================================");
    console.log("Finalizing Database Migration & aaPanel Config");
    console.log("==========================================");

    // 1. Upload .env.production
    const envProdPath = path.join(CONFIG.localDir, "scripts", ".env.production");
    await runLocal(
        `"${CONFIG.pscp}" -batch -hostkey "${CONFIG.hostkey}" -pw "${CONFIG.pass}" "${envProdPath}" ${CONFIG.user}@${CONFIG.host}:/home/hassan/.env.production`,
        "Uploading .env.production"
    );

    // 2. Upload register_db.py
    const regPyPath = path.join(CONFIG.localDir, "scripts", "register_db.py");
    await runLocal(
        `"${CONFIG.pscp}" -batch -hostkey "${CONFIG.hostkey}" -pw "${CONFIG.pass}" "${regPyPath}" ${CONFIG.user}@${CONFIG.host}:/home/hassan/register_db.py`,
        "Uploading register_db.py"
    );

    // 3. Upload remote_finalize.sh
    const remoteShPath = path.join(CONFIG.localDir, "scripts", "remote_finalize.sh");
    await runLocal(
        `"${CONFIG.pscp}" -batch -hostkey "${CONFIG.hostkey}" -pw "${CONFIG.pass}" "${remoteShPath}" ${CONFIG.user}@${CONFIG.host}:/home/hassan/remote_finalize.sh`,
        "Uploading remote_finalize.sh"
    );

    // 4. Run remote_finalize.sh via bash with sudo
    await runRemote(
        "bash /home/hassan/remote_finalize.sh",
        "Executing remote_finalize.sh"
    );

    console.log("\n==========================================");
    console.log("🎉 ALL MIGRATION & LIVE DATABASE CHECKS PASSED!");
    console.log("==========================================");
}

main().catch(err => {
    console.error("FATAL ERROR:", err);
    process.exit(1);
});
