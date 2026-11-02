const express = require("express");
const whatsapp = require("../whatsapp");
const whatsappBot = require("../whatsappBot");
const { renderWhatsAppPage } = require("../views/whatsappPage");

const router = express.Router();

/**
 * POST /api/whatsapp/webhook
 * Inbound webhook from OpenWA for incoming messages & events
 */
router.post("/webhook", async function (req, res) {
    try {
        const result = await whatsappBot.handleIncomingWebhook(req.body);
        res.json({ ok: true, result });
    } catch (e) {
        console.error("[whatsapp-webhook] error:", e.message);
        res.status(500).json({ ok: false, error: e.message });
    }
});

/**
 * GET /api/whatsapp/webhook
 * Webhook health & verification endpoint
 */
router.get("/webhook", function (req, res) {
    res.json({ ok: true, message: "WhatsApp Webhook receiver online" });
});

/**
 * GET /api/whatsapp/settings
 */
router.get("/settings", async function (req, res) {
    try {
        const settings = await whatsapp.getSettings();
        res.json({ success: true, settings });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/whatsapp/settings
 */
router.post("/settings", async function (req, res) {
    try {
        const updated = await whatsapp.saveSettings(req.body || {});
        res.json({ success: true, settings: updated });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * GET /api/whatsapp/variations
 */
router.get("/variations", async function (req, res) {
    try {
        const settings = await whatsapp.getSettings();
        const beforeVariations = whatsapp.parseVariations(settings.template_before_expiry, whatsapp.DEFAULT_BEFORE_VARIATIONS);
        const expiredVariations = whatsapp.parseVariations(settings.template_expired, whatsapp.DEFAULT_EXPIRED_VARIATIONS);
        res.json({
            success: true,
            before: beforeVariations,
            expired: expiredVariations,
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * GET /api/whatsapp/test
 */
router.get("/test", async function (req, res) {
    try {
        const result = await whatsapp.testConnection();
        res.json(result);
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

/**
 * GET /api/whatsapp/qr
 */
router.get("/qr", async function (req, res) {
    try {
        const result = await whatsapp.getQrCode();
        res.json(result);
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

/**
 * POST /api/whatsapp/start-session
 */
router.post("/start-session", async function (req, res) {
    try {
        const result = await whatsapp.startSession();
        res.json(result);
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

/**
 * POST /api/whatsapp/send
 */
router.post("/send", async function (req, res) {
    const { phone, message, customerId, username, type } = req.body || {};
    if (!phone || !message) {
        return res.status(400).json({ success: false, error: "Phone and message are required" });
    }

    try {
        const result = await whatsapp.sendText(phone, message, {
            customerId: customerId || null,
            username: username || phone,
            type: type || "manual",
        });

        if (result.success) {
            res.json({ success: true, chatId: result.chatId });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/whatsapp/sweep
 */
router.post("/sweep", async function (req, res) {
    try {
        const summary = await whatsapp.checkAndSendExpiryReminders();
        res.json({ success: true, summary });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * GET /api/whatsapp/logs
 */
router.get("/logs", async function (req, res) {
    try {
        const limit = Number(req.query.limit) || 50;
        const offset = Number(req.query.offset) || 0;
        const logs = await whatsapp.getLogs(limit, offset);
        res.json({ success: true, logs });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;
module.exports.renderWhatsAppPage = renderWhatsAppPage;
