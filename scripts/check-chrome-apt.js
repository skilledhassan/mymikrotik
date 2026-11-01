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
            return execSync(plinkCmd, { stdio: "pipe", maxBuffer: 10 * 1024 * 1024 }).toString();
        } catch (err) {
            if (i === retries) throw err;
            await sleep(2000);
        }
    }
}

async function main() {
    console.log("Checking apt / chromium / google-chrome availability...");
    console.log(await runRemote("apt-cache policy google-chrome-stable || true"));
    console.log(await runRemote("apt-cache policy chromium || true"));
    console.log(await runRemote("which google-chrome || which chromium-browser || which chromium || echo 'none'"));
}

main().catch(console.error);
