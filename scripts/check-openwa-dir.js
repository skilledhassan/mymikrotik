const { execSync } = require("child_process");

const CONFIG = {
    host: "187.53.134.170",
    user: "hassan",
    pass: "Player@1187",
    hostkey: "SHA256:WtLgZNyVZ0NzIBCbijzmthw8izKfF8ll6H2YbdxdPxk",
    plink: "C:\\Program Files\\PuTTY\\plink.exe",
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runRemote(cmd, retries = 3) {
    const plinkCmd = `"${CONFIG.plink}" -batch -hostkey "${CONFIG.hostkey}" -pw "${CONFIG.pass}" ${CONFIG.user}@${CONFIG.host} "echo '${CONFIG.pass}' | sudo -S ${cmd}"`;
    for (let i = 1; i <= retries; i++) {
        try {
            return execSync(plinkCmd, { stdio: "pipe" }).toString();
        } catch (err) {
            if (i === retries) throw err;
            await sleep(2000);
        }
    }
}

async function main() {
    console.log("=== /home/hassan/OpenWA files ===");
    console.log(await runRemote("ls -la /home/hassan/OpenWA"));

    console.log("\n=== Checking .env in /home/hassan/OpenWA ===");
    console.log(await runRemote("cat /home/hassan/OpenWA/.env 2>/dev/null || echo 'No .env in OpenWA'"));

    console.log("\n=== Checking if dist/main.js exists ===");
    console.log(await runRemote("ls -la /home/hassan/OpenWA/dist/main.js 2>/dev/null || echo 'No dist/main.js'"));
}

main().catch(e => {
    console.error("Error:", e.message);
    if (e.stdout) console.log(e.stdout.toString());
    if (e.stderr) console.error(e.stderr.toString());
});
