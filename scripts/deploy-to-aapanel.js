/**
 * Automated Deployment Script for aaPanel
 * Remote Host: 187.53.134.170
 * Remote User: hassan
 * Target Directory: /www/wwwroot/mymikrotik
 * Domain: http://truthguard.site/
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const CONFIG = {
    host: "187.53.134.170",
    user: "hassan",
    pass: "Player@1187",
    hostkey: "SHA256:WtLgZNyVZ0NzIBCbijzmthw8izKfF8ll6H2YbdxdPxk",
    remoteDir: "/www/wwwroot/mymikrotik",
    localRoot: path.resolve(__dirname, ".."),
    plinkPath: "C:\\Program Files\\PuTTY\\plink.exe",
    pscpPath: "C:\\Program Files\\PuTTY\\pscp.exe",
    tarPath: "C:\\WINDOWS\\system32\\tar.exe",
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runWithRetry(cmd, desc, retries = 3) {
    console.log(`[Deploy] ${desc}...`);
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const out = execSync(cmd, { stdio: "pipe", maxBuffer: 10 * 1024 * 1024 });
            return out.toString().trim();
        } catch (err) {
            console.warn(`  [Warning] Attempt ${attempt}/${retries} failed for: ${desc}`);
            if (attempt === retries) {
                const msg = (err.stdout ? err.stdout.toString() : "") + "\n" + (err.stderr ? err.stderr.toString() : "") + "\n" + err.message;
                throw new Error(`Step failed after ${retries} attempts: ${desc}\n${msg}`);
            }
            await sleep(2000);
        }
    }
}

async function deploy() {
    console.log("==================================================");
    console.log("🚀 Starting aaPanel Automated Deployment");
    console.log(`   Target: ${CONFIG.user}@${CONFIG.host}:${CONFIG.remoteDir}`);
    console.log(`   Domain: http://truthguard.site/ (Port: 3002)`);
    console.log("==================================================\n");

    const bundleName = "deploy.tar.gz";
    const bundleLocal = path.join(CONFIG.localRoot, bundleName);

    // 1. Pack project bundle
    const excludes = [
        '--exclude="node_modules"',
        '--exclude=".git"',
        '--exclude="OpenWA"',
        '--exclude="*.tar.gz"',
        '--exclude="*.zip"',
        '--exclude="*.log"',
        '--exclude="*.bak"',
        '--exclude=".system_generated"',
    ].join(" ");

    const filesToInclude = [
        "app.js",
        "auth.js",
        "bandwidthWorker.js",
        "database.sql",
        "dates.js",
        "db.js",
        "mikrotik.js",
        "package.json",
        "package-lock.json",
        "whatsapp.js",
        "routes",
        "views",
        "scripts",
        ".htaccess",
        ".well-known",
    ].join(" ");

    await runWithRetry(
        `"${CONFIG.tarPath}" ${excludes} -czf "${bundleLocal}" ${filesToInclude}`,
        "1. Packaging local workspace into deploy.tar.gz"
    );
    const stat = fs.statSync(bundleLocal);
    console.log(`✓ Package size: ${(stat.size / 1024).toFixed(1)} KB\n`);

    // 2. Transfer bundle via PSCP
    const pscpCmd = `"${CONFIG.pscpPath}" -batch -hostkey "${CONFIG.hostkey}" -pw "${CONFIG.pass}" "${bundleLocal}" ${CONFIG.user}@${CONFIG.host}:/home/hassan/${bundleName}`;
    await runWithRetry(pscpCmd, "2. Uploading deploy.tar.gz to VPS via pscp");
    console.log("✓ Upload successful.\n");

    // 3. Extract and update on VPS
    const remoteCommands = [
        // Extract to target
        `tar -xzf /home/hassan/${bundleName} -C ${CONFIG.remoteDir}/`,
        // Fix permissions
        `chown -R www:www ${CONFIG.remoteDir}/`,
        // If .env is missing, copy production template
        `[ ! -f ${CONFIG.remoteDir}/.env ] && cp ${CONFIG.remoteDir}/scripts/.env.production ${CONFIG.remoteDir}/.env && chown www:www ${CONFIG.remoteDir}/.env || true`,
        // Install any updated dependencies
        `cd ${CONFIG.remoteDir} && npm install --omit=dev --silent`,
        `chown -R www:www ${CONFIG.remoteDir}/node_modules`,
        // Reload PM2 process with env update
        `cd ${CONFIG.remoteDir} && (pm2 reload mymikrotik --update-env || pm2 restart mymikrotik --update-env || pm2 start app.js --name mymikrotik --time)`,
        `pm2 save`,
        // Allow process 2s to listen
        `sleep 2`,
        // Check health
        `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3002/login`,
    ].join(" && ");

    const sshCmd = `"${CONFIG.plinkPath}" -batch -hostkey "${CONFIG.hostkey}" -pw "${CONFIG.pass}" ${CONFIG.user}@${CONFIG.host} "echo '${CONFIG.pass}' | sudo -S bash -c '${remoteCommands}' 2>&1"`;
    const remoteOutput = await runWithRetry(sshCmd, "3. Extracting files, updating packages, and reloading PM2 on VPS");
    const lastCodeMatch = remoteOutput.match(/(\d{3})\s*$/);
    const httpStatus = lastCodeMatch ? lastCodeMatch[1] : "OK";
    console.log(`✓ Remote PM2 process reloaded! Local HTTP status: ${httpStatus}\n`);

    // 4. Clean up local tar
    if (fs.existsSync(bundleLocal)) {
        fs.unlinkSync(bundleLocal);
    }

    console.log("==================================================");
    console.log("🎉 DEPLOYMENT COMPLETE & LIVE!");
    console.log("   Status: ONLINE (HTTP " + httpStatus + ")");
    console.log("   aaPanel Port: 3002");
    console.log("   Domain: http://truthguard.site/");
    console.log("   Direct Server: http://187.53.134.170/");
    console.log("==================================================");
}

deploy().catch((err) => {
    console.error("\n❌ Deployment failed:", err.message);
    process.exit(1);
});
