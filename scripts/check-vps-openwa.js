const { execSync } = require("child_process");

const CONFIG = {
    host: "187.53.134.170",
    user: "hassan",
    pass: "Player@1187",
    hostkey: "SHA256:WtLgZNyVZ0NzIBCbijzmthw8izKfF8ll6H2YbdxdPxk",
    plink: "C:\\Program Files\\PuTTY\\plink.exe",
};

function runRemote(cmd) {
    const plinkCmd = `"${CONFIG.plink}" -batch -hostkey "${CONFIG.hostkey}" -pw "${CONFIG.pass}" ${CONFIG.user}@${CONFIG.host} "echo '${CONFIG.pass}' | sudo -S ${cmd}"`;
    return execSync(plinkCmd, { stdio: "pipe" }).toString();
}

try {
    console.log("=== PM2 List ===");
    console.log(runRemote("pm2 list"));

    console.log("\n=== Port 2785 check ===");
    console.log(runRemote("ss -tulpn | grep 2785 || echo 'Nothing on 2785'"));

    console.log("\n=== Checking for Chrome / Chromium ===");
    console.log(runRemote("which google-chrome || which chromium-browser || which chromium || echo 'No system chrome'"));

    console.log("\n=== Checking /www/wwwroot/ or /home/hassan for OpenWA ===");
    console.log(runRemote("ls -d /www/wwwroot/mymikrotik/OpenWA /home/hassan/OpenWA 2>/dev/null || echo 'OpenWA folder not found'"));

    console.log("\n=== Checking Ubuntu OS version & RAM ===");
    console.log(runRemote("uname -a && free -h"));
} catch (e) {
    console.error("Error:", e.message);
    if (e.stdout) console.log(e.stdout.toString());
    if (e.stderr) console.error(e.stderr.toString());
}
