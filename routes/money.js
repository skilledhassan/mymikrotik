const express = require("express");

const router = express.Router();

const db = require("../db");
const mikrotik = require("../mikrotik");
const dates = require("../dates");

// Trigger schema upgrade check on load
if (db.dbConfigured && db.initMoneySchema) {
    db.initMoneySchema().catch(function (err) {
        console.error("[money] Schema init error:", err.message);
    });
}

/*
|--------------------------------------------------------------------------
| Money / DigiKhata Ledger Backend API
|--------------------------------------------------------------------------
| Unified financial system for ISP operations:
|   1. DigiKhata Customer Ledger (Udhaar & Wasool / Due & Advance tracking)
|   2. Business Cash Book / Rokar (All Cash In & Cash Out)
|   3. Upcoming Renewal & Revenue Projections
|   4. Upstream Fixed Costs & Package Pricing
|--------------------------------------------------------------------------
*/

const VALID_ENTRY_TYPES = ["income", "debit", "upcoming", "note", "payment", "charge", "discount"];

function dateString(value) {
    if (!value) return null;
    if (value instanceof Date) {
        return dates.formatDate(value);
    }
    return String(value).slice(0, 10);
}

function formatDate(d) {
    return (
        d.getFullYear() +
        "-" +
        String(d.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(d.getDate()).padStart(2, "0")
    );
}

function dayOffset(reference, n) {
    return new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() + n);
}

function periodRanges(reference) {
    const today = dayOffset(reference, 0);
    const firstOfMonth = new Date(reference.getFullYear(), reference.getMonth(), 1);
    const lastOfMonth = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);

    return [
        { key: "today", label: "Today", start: today, end: today },
        { key: "tomorrow", label: "Tomorrow", start: dayOffset(reference, 1), end: dayOffset(reference, 1) },
        { key: "days3", label: "Next 3 Days", start: today, end: dayOffset(reference, 2) },
        { key: "days7", label: "Next 7 Days", start: today, end: dayOffset(reference, 6) },
        { key: "week1", label: "Next Week", start: dayOffset(reference, 1), end: dayOffset(reference, 7) },
        { key: "week2", label: "2nd Week", start: dayOffset(reference, 8), end: dayOffset(reference, 14) },
        { key: "week3", label: "3rd Week", start: dayOffset(reference, 15), end: dayOffset(reference, 21) },
        { key: "week4", label: "4th Week", start: dayOffset(reference, 22), end: dayOffset(reference, 28) },
        { key: "month", label: "This Month", start: firstOfMonth, end: lastOfMonth },
    ];
}

/*
|--------------------------------------------------------------------------
| Settings (Monthly running costs & package prices)
|--------------------------------------------------------------------------
*/

const DEFAULT_MONTHLY_COSTS = [
    { label: "CIR Main Upstream", amount: 45000 },
    { label: "30 Mbps Upstream Packages (2 x 3700)", amount: 7400 },
];

const SPEED_PRICES = {
    "2": null,
    "4": null,
    "6": 1500,
    "8": 2000,
    "10": 2500,
    "12": 2800,
    "13": 3000,
    "15": 3500,
    "20": 4000,
    "30": 5500,
    "35": 6000,
    "50": 8000,
};

const DEFAULT_PACKAGE_PRICES = {};

function suggestPrice(profileName) {
    if (!profileName) return null;
    const match = String(profileName).match(/(\d+(?:\.\d+)?)\s*mb/i);
    if (!match) return null;
    const speed = String(Math.round(Number(match[1])));
    return SPEED_PRICES[speed] !== undefined ? SPEED_PRICES[speed] : null;
}

async function getSettings() {
    let monthlyCosts = null;
    let packagePrices = null;

    if (db.dbConfigured) {
        try {
            const rows = await db.query(
                "SELECT `skey`, `svalue` FROM `money_settings`",
                []
            );

            for (const row of rows) {
                try {
                    const parsed = JSON.parse(row.svalue);
                    if (row.skey === "monthly_costs") {
                        monthlyCosts = parsed;
                    } else if (row.skey === "package_prices") {
                        packagePrices = parsed;
                    }
                } catch (e) {}
            }
        } catch (error) {
            console.error("[money] settings read error:", error.message);
        }
    }

    if (!Array.isArray(monthlyCosts) || monthlyCosts.length === 0) {
        monthlyCosts = DEFAULT_MONTHLY_COSTS;
    }

    if (!packagePrices || typeof packagePrices !== "object") {
        packagePrices = DEFAULT_PACKAGE_PRICES;
    }

    const monthlyCostTotal = monthlyCosts.reduce(function (sum, item) {
        return sum + (Number(item.amount) || 0);
    }, 0);

    return {
        monthlyCosts: monthlyCosts,
        packagePrices: packagePrices,
        monthlyCostTotal: monthlyCostTotal,
    };
}

/*
|--------------------------------------------------------------------------
| Customer Fees Helper
|--------------------------------------------------------------------------
*/

async function customerFees() {
    if (!db.dbConfigured) {
        return { items: [], total: 0, missing: 0 };
    }

    const settings = await getSettings();
    const prices = settings.packagePrices || {};

    const rows = await db.query(
        "SELECT `username`, `name`, `profile`, `price`, `expiry_date`, `status` FROM `mikrotik_users` " +
            "WHERE `status` = 'active' ORDER BY `username`",
        []
    );

    const items = rows.map(function (row) {
        const customPrice = Number(row.price) > 0 ? Number(row.price) : null;
        const profilePrice =
            row.profile && prices[row.profile] !== undefined
                ? Number(prices[row.profile])
                : suggestPrice(row.profile);

        const effectivePrice = customPrice !== null ? customPrice : profilePrice;

        return {
            username: row.username,
            name: row.name || row.username,
            profile: row.profile || "",
            price: effectivePrice || 0,
            custom: customPrice !== null,
            expiryDate: row.expiry_date ? dateString(row.expiry_date) : null,
            remainingDays: dates.remainingDays(row.expiry_date),
            expiryStatus: dates.expiryStatus(row.expiry_date),
        };
    });

    const total = items.reduce(function (sum, item) {
        return sum + (item.price || 0);
    }, 0);

    const missing = items.filter(function (item) {
        return !item.price;
    }).length;

    return {
        items: items,
        total: total,
        missing: missing,
    };
}

/*
|--------------------------------------------------------------------------
| Overall Cashbook Totals
|--------------------------------------------------------------------------
*/

async function totals() {
    let income = 0;
    let debit = 0;
    let upcoming = 0;

    if (db.dbConfigured) {
        try {
            const rows = await db.query(
                "SELECT `type`, COALESCE(SUM(`amount`), 0) AS `sum` " +
                    "FROM `money_entries` GROUP BY `type`",
                []
            );

            for (const row of rows) {
                const s = Number(row.sum) || 0;
                if (row.type === "income" || row.type === "payment") {
                    income += s;
                } else if (row.type === "debit" || row.type === "charge") {
                    debit += s;
                } else if (row.type === "upcoming") {
                    upcoming += s;
                }
            }
        } catch (e) {
            console.error("[money] totals error:", e.message);
        }
    }

    const fees = await customerFees();

    return {
        income: income,
        debit: debit,
        balance: income - debit,
        upcoming: upcoming,
        customerUpcoming: fees.total,
    };
}

/*
|--------------------------------------------------------------------------
| DigiKhata Customer Engine
|--------------------------------------------------------------------------
| Builds the complete customer ledger list with due/advance calculations:
|   - Due (Mene Lene Hein): Expired or overdue monthly bills + unpaid custom charges
|   - Advance (Mene Dene Hein): Overpaid amount in wallet balance
|   - Upcoming: Renewing in next 1-7 days or this month
|--------------------------------------------------------------------------
*/

async function getKhataData() {
    if (!db.dbConfigured) {
        return {
            customers: [],
            summary: {
                totalDue: 0,
                totalAdvance: 0,
                upcoming7d: 0,
                upcomingMonth: 0,
                totalCustomers: 0,
                dueCount: 0,
                upcomingCount: 0,
                settledCount: 0,
                cashBalance: 0,
                monthlyProfit: 0,
            },
        };
    }

    const settings = await getSettings();
    const prices = settings.packagePrices || {};

    const [userRows, entryRows] = await Promise.all([
        db.query(
            "SELECT `id`, `name`, `username`, `profile`, `phone`, `package`, `price`, `start_date`, `expiry_date`, `status`, `comment` " +
            "FROM `mikrotik_users` ORDER BY `username`",
            []
        ),
        db.query(
            "SELECT `id`, `type`, `customer_username`, `description`, `amount`, `payment_method`, `category`, `entry_date` " +
            "FROM `money_entries` ORDER BY `entry_date` DESC, `id` DESC",
            []
        ),
    ]);

    // Group ledger transactions by customer
    const txByCustomer = new Map();
    for (const entry of entryRows) {
        let username = entry.customer_username;
        if (!username && entry.description) {
            // Match legacy description e.g. "rj.ali paid"
            for (const u of userRows) {
                if (entry.description.toLowerCase().includes(u.username.toLowerCase())) {
                    username = u.username;
                    break;
                }
            }
        }

        if (username) {
            if (!txByCustomer.has(username)) {
                txByCustomer.set(username, []);
            }
            txByCustomer.get(username).push(entry);
        }
    }

    let totalDueSum = 0;
    let totalAdvanceSum = 0;
    let upcoming7dSum = 0;
    let upcomingMonthSum = 0;
    let dueCount = 0;
    let upcomingCount = 0;
    let settledCount = 0;

    const todayStr = dates.formatDate(dates.today());
    const week7Str = dates.formatDate(dayOffset(dates.today(), 7));
    const currentMonthPrefix = todayStr.slice(0, 7);

    const customers = userRows.map(function (row) {
        const customPrice = Number(row.price) > 0 ? Number(row.price) : null;
        const profilePrice =
            row.profile && prices[row.profile] !== undefined
                ? Number(prices[row.profile])
                : suggestPrice(row.profile);

        const effectivePrice = customPrice !== null ? customPrice : (profilePrice || 0);

        const txList = txByCustomer.get(row.username) || [];

        let totalPaid = 0;
        let totalCharged = 0;
        let totalDiscount = 0;
        let lastPayment = null;

        for (const tx of txList) {
            const amt = Number(tx.amount) || 0;
            const t = tx.type;

            if (t === "income" || t === "payment") {
                totalPaid += amt;
                if (!lastPayment) {
                    lastPayment = {
                        date: dateString(tx.entry_date),
                        amount: amt,
                        method: tx.payment_method || "cash",
                    };
                }
            } else if (t === "debit" || t === "charge") {
                totalCharged += amt;
            } else if (t === "discount") {
                totalDiscount += amt;
            }
        }

        const expDateStr = row.expiry_date ? dateString(row.expiry_date) : null;
        const remainingDays = row.expiry_date ? dates.remainingDays(row.expiry_date) : null;
        const expiryStatus = row.expiry_date ? dates.expiryStatus(row.expiry_date) : null;

        // Determine Due vs Advance
        let dueAmount = 0;
        let advanceAmount = 0;
        let khataStatus = "settled";

        const customNet = totalCharged - totalPaid - totalDiscount;

        const isExpired = expiryStatus === "expired" || row.status === "expired" || (remainingDays !== null && remainingDays < 0);
        const isExpiringSoon = expiryStatus === "expiring" || (remainingDays !== null && remainingDays >= 0 && remainingDays <= 3);
        const isUpcoming7d = remainingDays !== null && remainingDays >= 0 && remainingDays <= 7;

        if (isExpired) {
            // Customer is overdue
            dueAmount = (customNet > 0 ? customNet : 0) + (effectivePrice || 0);
            if (customNet < 0) {
                // Deduct any prepaid advance from overdue fee
                dueAmount = Math.max(0, dueAmount - Math.abs(customNet));
                if (dueAmount === 0) {
                    advanceAmount = Math.abs(customNet) - (effectivePrice || 0);
                }
            }
            khataStatus = dueAmount > 0 ? "due" : "settled";
        } else if (customNet > 0) {
            // Active user with extra unpaid charges
            dueAmount = customNet;
            khataStatus = "due";
        } else if (customNet < 0) {
            // Active user with prepaid credit / advance
            advanceAmount = Math.abs(customNet);
            khataStatus = "advance";
        } else if (isExpiringSoon && effectivePrice > 0) {
            khataStatus = "upcoming";
        } else {
            khataStatus = "settled";
        }

        if (dueAmount > 0) {
            totalDueSum += dueAmount;
            dueCount++;
        } else if (advanceAmount > 0) {
            totalAdvanceSum += advanceAmount;
        } else if (khataStatus === "upcoming") {
            upcomingCount++;
        } else {
            settledCount++;
        }

        if (isUpcoming7d && effectivePrice > 0) {
            upcoming7dSum += effectivePrice;
        }

        if (expDateStr && expDateStr.startsWith(currentMonthPrefix) && effectivePrice > 0) {
            upcomingMonthSum += effectivePrice;
        }

        return {
            id: row.id,
            name: row.name || row.username,
            username: row.username,
            phone: row.phone || "",
            profile: row.profile || "",
            package: row.package || row.profile || "",
            price: effectivePrice,
            isCustomPrice: customPrice !== null,
            startDate: row.start_date ? dateString(row.start_date) : null,
            expiryDate: expDateStr,
            remainingDays: remainingDays,
            expiryStatus: expiryStatus,
            accountStatus: row.status || "active",
            comment: row.comment || "",
            khataStatus: khataStatus,
            dueAmount: Number(dueAmount.toFixed(2)),
            advanceAmount: Number(advanceAmount.toFixed(2)),
            upcomingAmount: Number((effectivePrice || 0).toFixed(2)),
            totalPaid: Number(totalPaid.toFixed(2)),
            totalCharged: Number(totalCharged.toFixed(2)),
            lastPayment: lastPayment,
            txCount: txList.length,
        };
    });

    const currentTotals = await totals();

    // Compute this month's profit
    const thisMonthStart = todayStr.slice(0, 7) + "-01";
    let thisMonthIncome = 0;
    let thisMonthDebit = 0;

    for (const tx of entryRows) {
        const d = dateString(tx.entry_date);
        if (d && d >= thisMonthStart && d <= todayStr) {
            const amt = Number(tx.amount) || 0;
            if (tx.type === "income" || tx.type === "payment") {
                thisMonthIncome += amt;
            } else if (tx.type === "debit" || tx.type === "charge") {
                thisMonthDebit += amt;
            }
        }
    }

    const monthlyProfit = thisMonthIncome - thisMonthDebit - settings.monthlyCostTotal;

    return {
        customers: customers,
        summary: {
            totalDue: Number(totalDueSum.toFixed(2)),
            totalAdvance: Number(totalAdvanceSum.toFixed(2)),
            upcoming7d: Number(upcoming7dSum.toFixed(2)),
            upcomingMonth: Number(upcomingMonthSum.toFixed(2)),
            totalCustomers: customers.length,
            dueCount: dueCount,
            upcomingCount: upcomingCount,
            settledCount: settledCount,
            cashBalance: currentTotals.balance,
            totalIncome: currentTotals.income,
            totalDebit: currentTotals.debit,
            thisMonthIncome: thisMonthIncome,
            thisMonthDebit: thisMonthDebit,
            monthlyProfit: Number(monthlyProfit.toFixed(2)),
            monthlyCost: settings.monthlyCostTotal,
        },
        settings: settings,
    };
}

/*
|--------------------------------------------------------------------------
| GET /api/money/khata
|--------------------------------------------------------------------------
| Returns all customer accounts formatted for the DigiKhata UI.
|--------------------------------------------------------------------------
*/

router.get("/khata", async function (req, res) {
    try {
        const data = await getKhataData();
        res.json({
            success: true,
            ...data,
        });
    } catch (error) {
        console.error("[money] GET /api/money/khata error:", error.message);
        res.status(500).json({ success: false, error: "Failed to load DigiKhata ledger: " + error.message });
    }
});

/*
|--------------------------------------------------------------------------
| POST /api/money/khata/payment
|--------------------------------------------------------------------------
| Record a customer payment ("Wasool" / Cash In):
|   - Adds entry to money_entries (linked to customer_username)
|   - Optionally extends customer expiry date by N months in MySQL
|   - Re-enables customer secret on MikroTik if currently disabled
|--------------------------------------------------------------------------
*/

router.post("/khata/payment", async function (req, res) {
    const body = req.body || {};
    const username = String(body.username || "").trim();

    if (!username) {
        return res.status(400).json({ success: false, error: "Customer username is required" });
    }

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ success: false, error: "Payment amount must be a positive number" });
    }

    const paymentMethod = String(body.paymentMethod || "cash").toLowerCase();
    const date = body.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
        ? body.date
        : dates.formatDate(dates.today());

    const description = String(
        body.description ||
        (username + " fee received (" + paymentMethod.toUpperCase() + ")")
    ).trim();

    const autoRenew = body.autoRenew === true || body.autoRenew === "true";
    const renewMonths = Math.max(1, Math.min(36, Number(body.renewMonths) || 1));
    const explicitExpiry = body.newExpiryDate ? dates.parseDate(body.newExpiryDate) : null;

    try {
        let sqlUser = null;
        if (db.dbConfigured) {
            const rows = await db.query(
                "SELECT `id`, `name`, `username`, `price`, `expiry_date`, `status` FROM `mikrotik_users` WHERE `username` = ?",
                [username]
            );
            sqlUser = rows[0] || null;
        }

        // 1. Insert ledger entry
        const insertRes = await db.query(
            "INSERT INTO `money_entries` (`type`, `customer_username`, `description`, `amount`, `payment_method`, `category`, `entry_date`) " +
            "VALUES ('income', ?, ?, ?, ?, 'monthly_fee', ?)",
            [username, description, amount, paymentMethod, date]
        );

        let newExpiryDateStr = null;

        // 2. Handle auto-renewal if requested
        if (autoRenew && sqlUser) {
            let baseDate = dates.today();
            if (sqlUser.expiry_date && dates.expiryStatus(sqlUser.expiry_date) !== "expired") {
                baseDate = dates.parseDate(sqlUser.expiry_date) || dates.today();
            }

            const newExpiry = explicitExpiry || dates.addMonths(baseDate, renewMonths);
            newExpiryDateStr = dates.formatDate(newExpiry);

            await db.query(
                "UPDATE `mikrotik_users` SET `expiry_date` = ?, `status` = 'active' WHERE `id` = ?",
                [newExpiryDateStr, sqlUser.id]
            );

            // Re-enable PPP secret on MikroTik if disabled
            try {
                const secret = await mikrotik.getSecretByName(username);
                if (secret && secret.disabled === true) {
                    await mikrotik.enableSecret(username);
                }
            } catch (mkErr) {
                console.error("[money] MikroTik secret re-enable failed for " + username + ":", mkErr.message);
            }

            // Log audit
            try {
                await db.query(
                    "INSERT INTO `audit_log` (`action`, `username`, `details`) VALUES (?, ?, ?)",
                    [
                        "payment received & renewed",
                        username,
                        "Rs " + amount + " (" + paymentMethod + "), renewed until " + newExpiryDateStr,
                    ]
                );
            } catch (aErr) {}
        } else {
            // Log simple payment audit
            try {
                await db.query(
                    "INSERT INTO `audit_log` (`action`, `username`, `details`) VALUES (?, ?, ?)",
                    [
                        "payment received",
                        username,
                        "Rs " + amount + " (" + paymentMethod + ")",
                    ]
                );
            } catch (aErr) {}
        }

        const updatedKhata = await getKhataData();

        res.status(201).json({
            success: true,
            message: "Payment of Rs " + amount.toLocaleString() + " recorded for " + username,
            entryId: insertRes.insertId,
            newExpiryDate: newExpiryDateStr,
            summary: updatedKhata.summary,
        });
    } catch (error) {
        console.error("[money] payment error:", error.message);
        res.status(500).json({ success: false, error: "Failed to record payment: " + error.message });
    }
});

/*
|--------------------------------------------------------------------------
| POST /api/money/khata/charge
|--------------------------------------------------------------------------
| Record a custom charge / bill ("Udhaar" / Debit):
|   - Extra wire, router hardware, installation, static IP, etc.
|--------------------------------------------------------------------------
*/

router.post("/khata/charge", async function (req, res) {
    const body = req.body || {};
    const username = String(body.username || "").trim();

    if (!username) {
        return res.status(400).json({ success: false, error: "Customer username is required" });
    }

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ success: false, error: "Charge amount must be a positive number" });
    }

    const category = String(body.category || "custom_charge").trim();
    const description = String(
        body.description ||
        (username + " charge: " + category)
    ).trim();

    const date = body.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
        ? body.date
        : dates.formatDate(dates.today());

    try {
        const insertRes = await db.query(
            "INSERT INTO `money_entries` (`type`, `customer_username`, `description`, `amount`, `payment_method`, `category`, `entry_date`) " +
            "VALUES ('debit', ?, ?, ?, 'system', ?, ?)",
            [username, description, amount, category, date]
        );

        try {
            await db.query(
                "INSERT INTO `audit_log` (`action`, `username`, `details`) VALUES (?, ?, ?)",
                [
                    "customer charged",
                    username,
                    "Rs " + amount + " for " + description,
                ]
            );
        } catch (aErr) {}

        const updatedKhata = await getKhataData();

        res.status(201).json({
            success: true,
            message: "Charge of Rs " + amount.toLocaleString() + " added for " + username,
            entryId: insertRes.insertId,
            summary: updatedKhata.summary,
        });
    } catch (error) {
        console.error("[money] charge error:", error.message);
        res.status(500).json({ success: false, error: "Failed to add charge: " + error.message });
    }
});

/*
|--------------------------------------------------------------------------
| GET /api/money/khata/:username
|--------------------------------------------------------------------------
| Get itemized passbook statement for a customer.
|--------------------------------------------------------------------------
*/

router.get("/khata/:username", async function (req, res) {
    const username = req.params.username;

    if (!username) {
        return res.status(400).json({ success: false, error: "Username required" });
    }

    try {
        let customer = null;
        if (db.dbConfigured) {
            const rows = await db.query(
                "SELECT `id`, `name`, `username`, `profile`, `phone`, `package`, `price`, `start_date`, `expiry_date`, `status`, `comment` " +
                "FROM `mikrotik_users` WHERE `username` = ?",
                [username]
            );
            customer = rows[0] || null;
        }

        if (!customer) {
            return res.status(404).json({ success: false, error: "Customer not found: " + username });
        }

        const entries = await db.query(
            "SELECT `id`, `type`, `customer_username`, `description`, `amount`, `payment_method`, `category`, `entry_date`, `created_at` " +
            "FROM `money_entries` WHERE `customer_username` = ? OR `description` LIKE ? " +
            "ORDER BY `entry_date` DESC, `id` DESC",
            [username, "%" + username + "%"]
        );

        let totalPaid = 0;
        let totalCharged = 0;

        for (const e of entries) {
            const amt = Number(e.amount) || 0;
            if (e.type === "income" || e.type === "payment") {
                totalPaid += amt;
            } else if (e.type === "debit" || e.type === "charge") {
                totalCharged += amt;
            }
        }

        const settings = await getSettings();
        const prices = settings.packagePrices || {};
        const profilePrice = customer.profile && prices[customer.profile] !== undefined
            ? Number(prices[customer.profile])
            : suggestPrice(customer.profile);

        const effectivePrice = Number(customer.price) > 0 ? Number(customer.price) : (profilePrice || 0);

        const expDate = customer.expiry_date ? dateString(customer.expiry_date) : null;
        const remainingDays = customer.expiry_date ? dates.remainingDays(customer.expiry_date) : null;
        const expiryStatus = customer.expiry_date ? dates.expiryStatus(customer.expiry_date) : null;

        res.json({
            success: true,
            customer: {
                name: customer.name || customer.username,
                username: customer.username,
                phone: customer.phone || "",
                profile: customer.profile || "",
                package: customer.package || customer.profile || "",
                price: effectivePrice,
                startDate: customer.start_date ? dateString(customer.start_date) : null,
                expiryDate: expDate,
                remainingDays: remainingDays,
                expiryStatus: expiryStatus,
                status: customer.status || "active",
                totalPaid: totalPaid,
                totalCharged: totalCharged,
                netBalance: totalCharged - totalPaid,
            },
            transactions: entries.map(function (e) {
                return {
                    id: e.id,
                    type: e.type,
                    description: e.description,
                    amount: Number(e.amount),
                    paymentMethod: e.payment_method || "cash",
                    category: e.category || "",
                    date: dateString(e.entry_date),
                    createdAt: e.created_at,
                };
            }),
        });
    } catch (error) {
        console.error("[money] get customer khata error:", error.message);
        res.status(500).json({ success: false, error: "Failed to load customer statement: " + error.message });
    }
});

/*
|--------------------------------------------------------------------------
| POST /api/money/khata/quick-price
|--------------------------------------------------------------------------
| Update a customer's custom monthly fee.
|--------------------------------------------------------------------------
*/

router.post("/khata/quick-price", async function (req, res) {
    const username = String(req.body.username || "").trim();
    const price = Number(req.body.price);

    if (!username) {
        return res.status(400).json({ success: false, error: "Username is required" });
    }

    if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({ success: false, error: "Price must be a valid non-negative number" });
    }

    try {
        await db.query(
            "UPDATE `mikrotik_users` SET `price` = ? WHERE `username` = ?",
            [price, username]
        );

        res.json({
            success: true,
            username: username,
            price: price,
        });
    } catch (error) {
        console.error("[money] quick-price error:", error.message);
        res.status(500).json({ success: false, error: "Failed to update price" });
    }
});

/*
|--------------------------------------------------------------------------
| POST /api/money/khata/sync-all
|--------------------------------------------------------------------------
| Sync & enroll all customers into DigiKhata:
|   - Fills missing prices from MikroTik profile speed defaults
|   - Re-computes all Khata accounts
|--------------------------------------------------------------------------
*/

router.post("/khata/sync-all", async function (req, res) {
    try {
        const settings = await getSettings();
        const prices = settings.packagePrices || {};

        const rows = await db.query(
            "SELECT `id`, `username`, `profile`, `price` FROM `mikrotik_users`",
            []
        );

        let updated = 0;

        for (const row of rows) {
            if (Number(row.price) > 0) {
                continue; // Already has custom price
            }

            const profilePrice =
                row.profile && prices[row.profile] !== undefined
                    ? Number(prices[row.profile])
                    : suggestPrice(row.profile);

            if (profilePrice && profilePrice > 0) {
                await db.query(
                    "UPDATE `mikrotik_users` SET `price` = ? WHERE `id` = ?",
                    [profilePrice, row.id]
                );
                updated++;
            }
        }

        const khataData = await getKhataData();

        res.json({
            success: true,
            updatedCount: updated,
            totalCustomers: khataData.customers.length,
            summary: khataData.summary,
        });
    } catch (error) {
        console.error("[money] sync-all error:", error.message);
        res.status(500).json({ success: false, error: "Failed to sync customers: " + error.message });
    }
});

/*
|--------------------------------------------------------------------------
| Legacy & Cash Book Endpoints (Preserved & Enhanced)
|--------------------------------------------------------------------------
*/

router.get("/customer-upcoming", async function (req, res) {
    try {
        res.json({
            success: true,
            ...(await customerFees()),
        });
    } catch (error) {
        console.error("[money] GET customer-upcoming error:", error.message);
        res.status(500).json({ success: false, error: "Failed to load customer fees" });
    }
});

router.post("/apply-prices", async function (req, res) {
    try {
        const fees = await customerFees();
        let updated = 0;

        for (const item of fees.items) {
            if (item.custom || !item.price) {
                continue;
            }

            await db.query(
                "UPDATE `mikrotik_users` SET `price` = ? WHERE `username` = ?",
                [item.price, item.username]
            );
            updated++;
        }

        res.json({
            success: true,
            updated: updated,
            ...(await customerFees()),
        });
    } catch (error) {
        console.error("[money] apply-prices error:", error.message);
        res.status(500).json({ success: false, error: "Failed to apply package prices" });
    }
});

router.get("/settings", async function (req, res) {
    try {
        res.json({
            success: true,
            settings: await getSettings(),
        });
    } catch (error) {
        console.error("[money] GET settings error:", error.message);
        res.status(500).json({ success: false, error: "Failed to load settings" });
    }
});

router.put("/settings", async function (req, res) {
    const body = req.body || {};

    if (!Array.isArray(body.monthlyCosts) || body.monthlyCosts.length === 0) {
        return res.status(400).json({ success: false, error: "At least one monthly cost is required" });
    }

    const cleanedCosts = [];
    for (const item of body.monthlyCosts) {
        const label = String(item.label || "").trim();
        const amount = Number(item.amount);

        if (!label) {
            return res.status(400).json({ success: false, error: "Every cost needs a label" });
        }
        if (label.length > 100) {
            return res.status(400).json({ success: false, error: "Cost label too long" });
        }
        if (!Number.isFinite(amount) || amount < 0) {
            return res.status(400).json({ success: false, error: "Cost amount must be a positive number" });
        }
        cleanedCosts.push({ label: label, amount: amount });
    }

    if (!body.packagePrices || typeof body.packagePrices !== "object") {
        return res.status(400).json({ success: false, error: "Package prices are required" });
    }

    const cleanedPrices = {};
    for (const name of Object.keys(body.packagePrices)) {
        const raw = body.packagePrices[name];
        if (raw === "" || raw === null || raw === undefined) {
            continue;
        }
        const price = Number(raw);
        if (!Number.isFinite(price) || price < 0) {
            return res.status(400).json({ success: false, error: "Package price must be a positive number" });
        }
        cleanedPrices[name] = price;
    }

    async function upsert(key, value) {
        const existing = await db.query(
            "SELECT `id` FROM `money_settings` WHERE `skey` = ?",
            [key]
        );

        if (existing.length > 0) {
            await db.query(
                "UPDATE `money_settings` SET `svalue` = ? WHERE `skey` = ?",
                [JSON.stringify(value), key]
            );
        } else {
            await db.query(
                "INSERT INTO `money_settings` (`skey`, `svalue`) VALUES (?, ?)",
                [key, JSON.stringify(value)]
            );
        }
    }

    try {
        await upsert("monthly_costs", cleanedCosts);
        await upsert("package_prices", cleanedPrices);

        res.json({
            success: true,
            settings: await getSettings(),
        });
    } catch (error) {
        console.error("[money] PUT settings error:", error.message);
        res.status(500).json({ success: false, error: "Failed to save settings" });
    }
});

router.get("/packages", async function (req, res) {
    try {
        const settings = await getSettings();
        const stored = settings.packagePrices || {};

        let routerOnline = true;
        let profiles = [];

        try {
            profiles = await mikrotik.getPppProfiles();
        } catch (error) {
            routerOnline = false;
            profiles = Object.keys(stored).map(function (name) {
                return { name: name };
            });
        }

        const packages = profiles
            .filter(function (profile) {
                return profile && profile.name;
            })
            .map(function (profile) {
                return {
                    name: profile.name,
                    price:
                        stored[profile.name] !== undefined
                            ? stored[profile.name]
                            : suggestPrice(profile.name),
                };
            });

        res.json({
            success: true,
            routerOnline: routerOnline,
            packages: packages,
        });
    } catch (error) {
        console.error("[money] GET packages error:", error.message);
        res.status(500).json({ success: false, error: "Failed to load packages" });
    }
});

router.get("/periods", async function (req, res) {
    try {
        const settings = await getSettings();
        const fees = await customerFees();

        const rows = await db.query(
            "SELECT `type`, `amount`, `entry_date` FROM `money_entries` " +
                "WHERE `type` IN ('income','debit','upcoming','payment','charge')",
            []
        );

        const ranges = periodRanges(new Date());

        const periods = ranges.map(function (range) {
            const start = formatDate(range.start);
            const end = formatDate(range.end);

            let income = 0;
            let debits = 0;
            let upcoming = 0;

            for (const row of rows) {
                const d = dateString(row.entry_date);
                if (d < start || d > end) {
                    continue;
                }

                const amount = Number(row.amount) || 0;
                if (row.type === "income" || row.type === "payment") {
                    income += amount;
                } else if (row.type === "debit" || row.type === "charge") {
                    debits += amount;
                } else if (row.type === "upcoming") {
                    upcoming += amount;
                }
            }

            const cost = range.key === "month" ? settings.monthlyCostTotal : 0;

            let customerTotal = 0;
            let customerCount = 0;

            for (const item of fees.items) {
                if (!item.expiryDate || item.expiryDate < start || item.expiryDate > end) {
                    continue;
                }
                customerTotal += item.price || 0;
                customerCount++;
            }

            upcoming += customerTotal;

            return {
                key: range.key,
                label: range.label,
                start: start,
                end: end,
                income: income,
                upcoming: upcoming,
                debits: debits,
                cost: cost,
                customerTotal: customerTotal,
                customerCount: customerCount,
                profit: income - debits - cost,
            };
        });

        res.json({
            success: true,
            periods: periods,
            monthlyCost: settings.monthlyCostTotal,
        });
    } catch (error) {
        console.error("[money] GET periods error:", error.message);
        res.status(500).json({ success: false, error: "Failed to compute earnings" });
    }
});

/*
| GET /api/money (Cash book list)
*/

router.get("/", async function (req, res) {
    try {
        const type = req.query.type;
        const category = req.query.category;
        const customer = req.query.customer;

        let sql = "SELECT `id`, `type`, `customer_username`, `description`, `amount`, `payment_method`, `category`, `entry_date`, `created_at` FROM `money_entries` WHERE 1=1 ";
        const params = [];

        if (type && VALID_ENTRY_TYPES.includes(type)) {
            sql += "AND `type` = ? ";
            params.push(type);
        }

        if (category) {
            sql += "AND `category` = ? ";
            params.push(category);
        }

        if (customer) {
            sql += "AND `customer_username` = ? ";
            params.push(customer);
        }

        sql += "ORDER BY `entry_date` DESC, `id` DESC";

        const entries = await db.query(sql, params);

        const customers = await db.query(
            "SELECT `username`, `name`, `profile`, `expiry_date` FROM `mikrotik_users`",
            []
        );

        const customerMap = new Map();
        for (const c of customers) {
            customerMap.set(c.username, c);
        }

        const formatted = entries.map(function (entry) {
            const u = entry.customer_username ? customerMap.get(entry.customer_username) : null;
            return {
                id: entry.id,
                type: entry.type,
                customer_username: entry.customer_username || null,
                description: entry.description,
                amount: Number(entry.amount),
                payment_method: entry.payment_method || "cash",
                category: entry.category || "",
                entry_date: dateString(entry.entry_date),
                createdAt: entry.created_at,
                user: u ? {
                    username: u.username,
                    name: u.name || u.username,
                    profile: u.profile || "",
                    expiryDate: u.expiry_date ? dateString(u.expiry_date) : null,
                } : null,
            };
        });

        res.json({
            success: true,
            entries: formatted,
            totals: await totals(),
        });
    } catch (error) {
        console.error("[money] GET /api/money error:", error.message);
        res.status(500).json({ success: false, error: "Failed to load ledger entries" });
    }
});

/*
| POST /api/money (Add generic Cash In / Cash Out entry)
*/

router.post("/", async function (req, res) {
    const body = req.body || {};
    const type = String(body.type || "income").toLowerCase();

    if (!VALID_ENTRY_TYPES.includes(type)) {
        return res.status(400).json({ success: false, error: "Invalid entry type" });
    }

    const description = String(body.description || "").trim();
    if (!description) {
        return res.status(400).json({ success: false, error: "Description is required" });
    }

    let amount = 0;
    if (type !== "note") {
        amount = Number(body.amount);
        if (!Number.isFinite(amount) || amount < 0) {
            return res.status(400).json({ success: false, error: "Amount must be a positive number" });
        }
    }

    const paymentMethod = String(body.paymentMethod || "cash").toLowerCase();
    const category = String(body.category || "").trim() || null;
    const customer = String(body.customerUsername || "").trim() || null;

    let entryDate = body.date;
    if (!entryDate || !/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
        entryDate = dates.formatDate(dates.today());
    }

    try {
        const result = await db.query(
            "INSERT INTO `money_entries` (`type`, `customer_username`, `description`, `amount`, `payment_method`, `category`, `entry_date`) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            [type, customer, description, amount, paymentMethod, category, entryDate]
        );

        res.status(201).json({
            success: true,
            id: result.insertId,
            entry: {
                id: result.insertId,
                type: type,
                customer_username: customer,
                description: description,
                amount: amount,
                payment_method: paymentMethod,
                category: category,
                entryDate: entryDate,
            },
            totals: await totals(),
        });
    } catch (error) {
        console.error("[money] POST error:", error.message);
        res.status(500).json({ success: false, error: "Failed to save ledger entry" });
    }
});

/*
| DELETE /api/money/:id
*/

router.delete("/khata/transaction/:id", deleteMoneyEntry);
router.delete("/:id", deleteMoneyEntry);

async function deleteMoneyEntry(req, res) {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ success: false, error: "Invalid entry ID" });
    }

    try {
        const result = await db.query(
            "DELETE FROM `money_entries` WHERE `id` = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: "Entry not found" });
        }

        const updatedKhata = await getKhataData();

        res.json({
            success: true,
            deleted: id,
            summary: updatedKhata.summary,
            totals: await totals(),
        });
    } catch (error) {
        console.error("[money] DELETE error:", error.message);
        res.status(500).json({ success: false, error: "Failed to delete entry" });
    }
}

module.exports = router;