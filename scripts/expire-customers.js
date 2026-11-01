/*
|--------------------------------------------------------------------------
| Automatic customer expiry sweep (standalone command)
|--------------------------------------------------------------------------
| Finds active customers whose expiry_date has passed, disables their PPP
| secret on the MikroTik router and marks them expired in the database.
|
| Manual run:
|   node scripts/expire-customers.js
|   npm run expire
|
| Cron example (hourly):
|   0 * * * *  cd /path/to/panel && /usr/bin/node scripts/expire-customers.js >> expire.log 2>&1
|
| Safe to run repeatedly – already expired customers are never touched
| again, and failed customers are left active so the next run retries.
|--------------------------------------------------------------------------
*/

require("dotenv").config();

const mikrotik = require("../mikrotik");
const { runExpiryCheck } = require("../routes/users");

(async function () {
    let summary = null;

    try {
        summary = await runExpiryCheck();

        console.log(
            new Date().toISOString() +
            " expiry check done: " +
            JSON.stringify(summary)
        );
    } catch (error) {
        console.error(
            new Date().toISOString() +
            " expiry check FAILED: " +
            (error.message || error)
        );
        process.exitCode = 1;
    } finally {
        try {
            await mikrotik.close();
        } catch (closeError) {
            // Ignore close errors
        }
    }
})();