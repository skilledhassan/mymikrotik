require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });

const { RouterOSClient } = require("routeros-client");

/*
|--------------------------------------------------------------------------
| MikroTik RouterOS Client
|--------------------------------------------------------------------------
| Centralized connection to the MikroTik router using routeros-client v1.1.1.
| The existing project already uses `new RouterOSClient({...})`, so we keep
| that exact pattern.  All RouterOS operations in the application go
| through this single client instance.
*/

const client = new RouterOSClient({
    host: process.env.MIKROTIK_HOST,
    user: process.env.MIKROTIK_USER,
    password: process.env.MIKROTIK_PASSWORD,
    port: Number(process.env.MIKROTIK_PORT) || 8728,
    timeout: 10000,
    keepalive: true,
});

let connected = false;

/*
|--------------------------------------------------------------------------
| Connection loss safety
|--------------------------------------------------------------------------
| node-routeros emits 'error' on the raw API whenever the router socket
| drops.  routeros-client only wires a `once` listener at connect time,
| so a single lost connection would otherwise crash the whole panel with
| an unhandled 'error' event.  We attach permanent listeners here, log
| the problem and reset the connected flag so callers can reconnect.
|--------------------------------------------------------------------------
*/

function handleRouterError(source, error) {
    console.error("[mikrotik] " + source + " connection error:", error.message || error);
    connected = false;
}

client.on("error", function (error) {
    handleRouterError("client", error);
});

client.rosApi.on("error", function (error) {
    handleRouterError("api", error);
});

client.rosApi.on("close", function () {
    connected = false;
});

let connectingPromise = null;

async function connect() {
    if (!process.env.MIKROTIK_HOST) {
        console.warn("[mikrotik] MIKROTIK_HOST is not set in environment variables. Router connection skipped.");
        return;
    }
    if (connected && client.isConnected()) {
        return;
    }
    if (connectingPromise) {
        return connectingPromise;
    }
    connectingPromise = (async function () {
        try {
            await client.connect();
            connected = true;
        } finally {
            connectingPromise = null;
        }
    })();
    return connectingPromise;
}

async function ensureConnected() {
    if (isConnected()) {
        return true;
    }
    try {
        await connect();
        return true;
    } catch (error) {
        console.error("[mikrotik] reconnect failed:", error.message || error);
        return false;
    }
}

async function close() {
    try {
        await client.close();
    } catch (error) {
        // Ignore close errors during shutdown
    }
    connected = false;
}

function isConnected() {
    return connected && client.isConnected();
}

function getApi() {
    return client.api();
}

/*
|--------------------------------------------------------------------------
| Connection watchdog
|--------------------------------------------------------------------------
| The dashboard commands run every second.  If the router dies mid-request
| the socket can end up half-open: commands never settle and no error is
| raised, so the panel would show "offline" forever without ever retrying.
| The watchdog runs on its own timer and covers every failure mode:
|   1. Socket reported dead        -> reconnect
|   2. Socket "connected" but the  -> ping times out, force close the
|      router never answers          stale socket and reconnect
| It runs independently of any request flow, so recovery happens within
| seconds even if a command hangs.
|--------------------------------------------------------------------------
*/

let watchdogTimer = null;
let watchdogBusy = false;

async function pingRouter(timeoutMs) {
    return new Promise(function (resolve) {
        if (!client.isConnected()) {
            return resolve(false);
        }

        const timer = setTimeout(function () {
            resolve(false);
        }, timeoutMs || 4000);

        client.rosApi
            .write(["/system/identity/print"])
            .then(function () {
                clearTimeout(timer);
                resolve(true);
            })
            .catch(function () {
                clearTimeout(timer);
                resolve(false);
            });
    });
}

async function doReconnect(force) {
    if (watchdogBusy) {
        return;
    }

    watchdogBusy = true;

    try {
        if (force) {
            try {
                await client.close();
            } catch (error) {
                // The stale socket may already be gone
            }
            connected = false;
        }

        await connect();

        console.log("[mikrotik] reconnected to router");
    } catch (error) {
        // Router still unreachable – the next tick retries
    } finally {
        watchdogBusy = false;
    }
}

async function watchdogTick() {
    if (watchdogBusy) {
        return;
    }

    if (!isConnected()) {
        await doReconnect(false);
        return;
    }

    const alive = await pingRouter(4000);

    if (!alive) {
        console.error("[mikrotik] router not answering – forcing reconnect");
        await doReconnect(true);
    }
}

function startWatchdog(intervalMs) {
    if (watchdogTimer) {
        return;
    }

    watchdogTimer = setInterval(function () {
        watchdogTick().catch(function (error) {
            console.error("[mikrotik] watchdog error:", error.message || error);
        });
    }, intervalMs || 5000);

    watchdogTimer.unref();
}

function stopWatchdog() {
    if (watchdogTimer) {
        clearInterval(watchdogTimer);
        watchdogTimer = null;
    }
}

/*
|--------------------------------------------------------------------------
| Property conversion helper
|--------------------------------------------------------------------------
| routeros-client v1.1.1 (with snakeCase = false, the default) returns
| RouterOS field names in their original dashed-case form (e.g.
| "local-address", "caller-id").  This helper re-maps them to
| camelCase so consuming code can use clean property names while still
| working if the underlying library ever changes behaviour.
*/

function toCamelCase(obj) {
    if (!obj) {
        return null;
    }

    const result = {};

    for (const key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) {
            continue;
        }

        let newKey = key.replace(/^\./, "");
        newKey = newKey.replace(/-([a-z])/g, function (match) {
            return match[1].toUpperCase();
        });

        result[newKey] = obj[key];
    }

    return result;
}

/*
|--------------------------------------------------------------------------
| PPP Secret fields selected from /ppp/secret
|--------------------------------------------------------------------------
| Password is intentionally excluded from the list endpoint to avoid
| ever sending it to the browser.  It is only read when explicitly
| requested in the details endpoint for an authenticated admin.
*/

const SECRET_FIELDS = [
    "id",
    "name",
    "service",
    "profile",
    "local-address",
    "remote-address",
    "disabled",
    "comment",
    "last-logged-in",
    "expiration",
    "last-disconnected",
];

const ACTIVE_FIELDS = [
    "id",
    "name",
    "service",
    "address",
    "caller-id",
    "uptime",
];

/*
|--------------------------------------------------------------------------
| PPP Secret read operations
|--------------------------------------------------------------------------
*/

async function getPppSecrets() {
    const api = client.api();

    const secrets = await api
        .menu("/ppp/secret")
        .select(SECRET_FIELDS)
        .get();

    return secrets.map(toCamelCase);
}

async function getPppActive() {
    const api = client.api();

    const active = await api
        .menu("/ppp/active")
        .select(ACTIVE_FIELDS)
        .get();

    return active.map(toCamelCase);
}

async function getPppProfiles() {
    const api = client.api();

    const profiles = await api
        .menu("/ppp/profile")
        .select(["name"])
        .get();

    return profiles.map(toCamelCase);
}

/*
| Find a secret by name.
| NOTE: we deliberately fetch the full list and filter in JavaScript
| instead of sending `?name=` filters to the router.  This RouterOS
| responds `!empty` to non-matching filtered /ppp prints, and the
| node-routeros library crashes the whole process on that reply.
*/

async function getSecretByName(username) {
    const secrets = await getPppSecrets();

    for (const secret of secrets) {
        if (secret.name === username) {
            return secret;
        }
    }

    return null;
}

/*
|--------------------------------------------------------------------------
| PPP Secret write operations
|--------------------------------------------------------------------------
| Each mutation first fetches the entry by name to obtain its .id, then
| uses a routeros-client Model which operates via `=numbers=<id>`.
| Items returned by get() already carry `$$path` and `id`, so the model
| can be built directly from them.
*/

async function addSecret(data) {
    const api = client.api();
    const result = await api.menu("/ppp/secret").add(data);
    return result;
}

async function updateSecret(username, data) {
    const secret = await getSecretByName(username);

    if (!secret) {
        const error = new Error("User not found: " + username);
        error.code = "NOT_FOUND";
        throw error;
    }

    const api = client.api();
    const model = api.model(secret);
    return await model.update(data);
}

async function enableSecret(username) {
    const secret = await getSecretByName(username);

    if (!secret) {
        const error = new Error("User not found: " + username);
        error.code = "NOT_FOUND";
        throw error;
    }

    const api = client.api();
    const model = api.model(secret);
    return await model.enable();
}

async function disableSecret(username) {
    const secret = await getSecretByName(username);

    if (!secret) {
        const error = new Error("User not found: " + username);
        error.code = "NOT_FOUND";
        throw error;
    }

    const api = client.api();
    const model = api.model(secret);
    return await model.disable();
}

async function deleteSecret(username) {
    const secret = await getSecretByName(username);

    if (!secret) {
        const error = new Error("User not found: " + username);
        error.code = "NOT_FOUND";
        throw error;
    }

    const api = client.api();
    const model = api.model(secret);
    return await model.remove();
}

/*
| Disconnect every active PPPoE session for a username.
| Disabling a PPP secret only prevents NEW logins; existing sessions
| remain connected until they are removed from /ppp/active.  This is the
| kick the user off the network.
| NOTE: the session list is filtered in JavaScript (see getSecretByName
| for why we never send name filters to /ppp prints).
*/

async function disconnectSession(username) {
    const sessions = await getPppActive();

    let count = 0;

    for (const session of sessions) {
        if (session.name !== username) {
            continue;
        }

        const api = client.api();
        const model = api.model(session);
        await model.remove();
        count++;
    }

    return count;
}

/*
|--------------------------------------------------------------------------
| Remote access to a customer's router (dst-nat port redirect)
|--------------------------------------------------------------------------
| Creates a dst-nat rule so the MikroTik's public IP on a port (9001 by
| default) forwards to a customer's PPPoE router web interface (port 80).
| Only one rule is active at a time – opening a new one removes any
| previous rule with the same comment.
*/

const REMOTE_ACCESS_COMMENT = "REMOTE PPPoE ROUTER";

const NAT_FIELDS = [
    "id",
    "comment",
    "chain",
    "action",
    "in-interface",
    "protocol",
    "dst-port",
    "to-addresses",
    "to-ports",
];

async function getNatRules() {
    const api = client.api();

    const rules = await api
        .menu("/ip/firewall/nat")
        .select(NAT_FIELDS)
        .get();

    return rules.map(toCamelCase);
}

async function clearRemoteAccessRules() {
    const rules = await getNatRules();

    let removed = 0;

    for (const rule of rules) {
        if ((rule.comment || "").indexOf(REMOTE_ACCESS_COMMENT) !== 0) {
            continue;
        }

        const api = client.api();
        const model = api.model(rule);
        await model.remove();
        removed++;
    }

    return removed;
}

async function addRemoteAccessRule(ip, options) {
    const api = client.api();

    const port = Number((options && options.port) || process.env.REMOTE_ACCESS_PORT) || 9001;
    const inInterface = (options && options.inInterface) || process.env.REMOTE_ACCESS_INTERFACE || "ether1";
    const toPort = Number((options && options.toPort) || process.env.REMOTE_ACCESS_TO_PORT) || 80;

    const result = await api.menu("/ip/firewall/nat").add({
        chain: "dstnat",
        inInterface: inInterface,
        protocol: "tcp",
        dstPort: port,
        action: "dst-nat",
        toAddresses: ip,
        toPorts: toPort,
        comment: REMOTE_ACCESS_COMMENT,
    });

    return result;
}

async function getRemoteAccessPort() {
    return Number(process.env.REMOTE_ACCESS_PORT) || 9001;
}

/*
|--------------------------------------------------------------------------
| Expiry / auto-disable scheduling
|--------------------------------------------------------------------------
| When AUTO_DISABLE_EXPIRED=true the application periodically scans the
| SQL customer table for expired users and disables the corresponding
| MikroTik PPP secret.  Off by default for safety.
*/

const AUTO_DISABLE_EXPIRED =
    process.env.AUTO_DISABLE_EXPIRED === "true";

module.exports = {
    client,
    connect,
    close,
    ensureConnected,
    isConnected,
    getApi,
    startWatchdog,
    stopWatchdog,
    toCamelCase,
    getPppSecrets,
    getPppActive,
    getPppProfiles,
    getSecretByName,
    addSecret,
    updateSecret,
    enableSecret,
    disableSecret,
    deleteSecret,
    disconnectSession,
    clearRemoteAccessRules,
    addRemoteAccessRule,
    getRemoteAccessPort,
    AUTO_DISABLE_EXPIRED,
};
