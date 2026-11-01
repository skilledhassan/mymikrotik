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
    const confPath = "/www/server/panel/vhost/nginx/node_mymikrotik.conf";
    console.log("Checking current Nginx config...");
    const content = await runRemote(`cat ${confPath}`);
    console.log("Current server_name line(s):");
    content.split("\n").forEach(line => {
        if (line.includes("server_name")) console.log("  ", line);
    });

    if (!content.includes("187.53.134.170")) {
        console.log("Adding 187.53.134.170 to server_name...");
        await runRemote(`sed -i 's/server_name truthguard.site;/server_name truthguard.site 187.53.134.170;/g' ${confPath}`);
    } else {
        console.log("IP is already in server_name.");
    }

    console.log("Reloading Nginx...");
    await runRemote("/etc/init.d/nginx reload || nginx -s reload");
    console.log("✓ Nginx reloaded successfully!");
}

main().catch(e => {
    console.error("Error:", e.message);
    if (e.stdout) console.log(e.stdout.toString());
    if (e.stderr) console.error(e.stderr.toString());
});
