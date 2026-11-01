/*
|--------------------------------------------------------------------------
| Date helpers – server local timezone
|--------------------------------------------------------------------------
| All expiry/remaining-day calculations use the server's local timezone,
| never UTC, so dates match what the ISP operator sees in the panel.
*/

function toDateOnly(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    }
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) {
        return null;
    }
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDate(value) {
    const d = toDateOnly(value);
    if (!d) {
        return null;
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
}

function parseDate(value) {
    return toDateOnly(value);
}

function today() {
    return toDateOnly(new Date());
}

/*
| Add a whole number of calendar months.  The day is clamped to the last
| day of the target month, so 31 Jan + 1 month = 28/29 Feb (never 2/3 Mar).
*/
function addMonths(value, months) {
    const d = toDateOnly(value);
    if (!d) {
        return null;
    }
    const day = d.getDate();
    const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(day, lastDay));
    return target;
}

/*
| Whole days between `from` (default today) and `value`.  Positive means
| the date is still ahead.  Both dates are normalised to local midnight.
*/
function remainingDays(value, from) {
    const d = toDateOnly(value);
    const base = toDateOnly(from) || today();
    if (!d) {
        return null;
    }
    return Math.ceil((d.getTime() - base.getTime()) / 86400000);
}

/*
| Expiry status based on remaining days:
|   expired  -> date already passed
|   expiring -> 0 to 3 days left (including today)
|   active   -> more than 3 days left
*/
function expiryStatus(value, from) {
    const days = remainingDays(value, from);
    if (days === null) {
        return null;
    }
    if (days < 0) {
        return "expired";
    }
    if (days <= 3) {
        return "expiring";
    }
    return "active";
}

module.exports = {
    toDateOnly,
    formatDate,
    parseDate,
    today,
    addMonths,
    remainingDays,
    expiryStatus,
};