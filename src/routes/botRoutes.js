const express = require('express');
const router = express.Router();
const {
    getCommandStats
} = require('../services/databaseService');
const {
    stopAutomation,
    getAutomationState, getCaptchaState,
    getClient, setAutomationFeatures
} = require('../services/botManager');
const { info, error, getLogs } = require('../utils/logger');
const { getUserSettings } = require('../services/databaseService'); // Needed for captcha

// Stats Endpoint
router.get('/stats', (req, res) => {
    try {
        const stats = getCommandStats(req.userId);
        res.json({ success: true, data: stats });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Logs Endpoint
router.get('/logs', (req, res) => {
    try {
        const since = req.query.since || null;
        const logs = getLogs(since);
        res.json({ success: true, data: logs });
    } catch (e) {
        error(`Get logs error: ${e.message}`);
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/status', (req, res) => {
    const client = req.discordClient;
    const apiKey = req.apiKey;

    // Automation Status
    const autoState = getAutomationState(apiKey);
    const capState = getCaptchaState(apiKey);

    if (!client || !client.user) {
        return res.json({
            success: true,
            data: {
                username: null,
                id: req.userId,
                isReady: false,
                stats: null
            },
            automationEnabled: false,
            automationState: autoState,
            captchaState: { active: false, imageBase64: null }
        });
    }

    // Calculate Uptime
    const uptimeMs = client.uptime || 0;
    const hours = Math.floor(uptimeMs / 3600000);
    const minutes = Math.floor((uptimeMs % 3600000) / 60000);
    const uptimeStr = `${hours}s ${minutes}dk`;

    res.json({
        success: true,
        data: {
            username: client.user.username,
            id: client.user.id,
            isReady: client.isReady(),
            stats: {
                guilds: client.guilds?.cache?.size || 0,
                ping: client.ws?.ping || -1,
                uptime: uptimeStr
            }
        },
        automationEnabled: autoState.click || autoState.messages, // Composite status
        automationState: autoState,
        captchaState: capState
    });
});


// Start
router.post('/start', async (req, res) => {
    const apiKey = req.apiKey;

    // Eğer zaten çalışıyorsa
    if (req.discordClient) {
        try {
            await getClient(apiKey);
            return res.json({ success: true, message: 'Bot zaten çalışıyor. (Otomasyon aktif edildi)' });
        } catch (e) {
            return res.json({ success: true, message: 'Bot zaten çalışıyor.' });
        }
    }

    try {
        const client = await getClient(apiKey, true); // Force start
        info(`Bot started for user: ${client.user.username}`);
        res.json({ success: true, message: 'Bot başarıyla başlatıldı.' });
    } catch (e) {
        error(`Bot start error: ${e.message}`);
        res.status(500).json({ success: false, error: e.message });
    }
});

// Stop
router.post('/stop', (req, res) => {
    const apiKey = req.apiKey;
    try {
        if (!req.discordClient) {
            return res.json({ success: true, message: 'Bot zaten kapalı.' });
        }
        stopAutomation(apiKey);
        info(`Bot automation paused: ${req.discordClient.user.username}`);
        res.json({ success: true, message: 'Bot otomasyonu durduruldu.' });
    } catch (e) {
        error(`Error stopping bot: ${e.message}`);
        res.status(500).json({ success: false, error: 'Bot durdurulurken hata.' });
    }
});

// Send Message
router.post('/send-message', async (req, res) => {
    const { channelId, message } = req.body;
    const client = req.discordClient;
    const apiKey = req.apiKey;

    if (!client) {
        return res.status(503).json({ success: false, error: 'Bot is not running.' });
    }

    // Captcha kontrolü
    const captcha = getCaptchaState(apiKey);
    if (captcha.active) {
        return res.status(423).json({
            success: false,
            error: 'LOCKED: Captcha required.',
            captchaRequired: true
        });
    }

    if (!channelId || !message) return res.status(400).json({ success: false, error: 'Missing channelId or message.' });

    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel || typeof channel.send !== 'function') {
            return res.status(400).json({ success: false, error: 'Invalid channel.' });
        }
        await channel.send(message);
        info(`Message sent to ${channelId} by ${client.user.username}`);
        res.json({ success: true, message: 'Mesaj gönderildi.' });
    } catch (e) {
        error(`Send message error: ${e.message}`);
        res.status(500).json({ success: false, error: e.message });
    }
});
// Solve Captcha
router.post('/solve-captcha', async (req, res) => {
    const { solution } = req.body;
    const client = req.discordClient;

    if (!client) {
        return res.status(503).json({ success: false, error: 'Bot is not running.' });
    }

    if (!solution) return res.status(400).json({ success: false, error: 'Solution required.' });

    try {
        const settings = await getUserSettings(req.userId);
        if (!settings.channelId) {
            return res.status(400).json({ success: false, error: 'Ayarlarda Kanal ID ayarlanmamış.' });
        }

        const channel = await client.channels.fetch(settings.channelId);
        if (!channel || typeof channel.send !== 'function') {
            return res.status(400).json({ success: false, error: 'Invalid channel.' });
        }

        await channel.send(`+captcha ${solution}`);
        info(`Captcha solution sent by ${client.user.username}`);

        res.json({ success: true, message: 'Captcha çözümü gönderildi.' });
    } catch (e) {
        error(`Solve captcha error: ${e.message}`);
        res.status(500).json({ success: false, error: e.message });
    }
});

// Toggle specific automation features
router.post('/features', async (req, res) => {
    try {
        const apiKey = req.apiKey;
        const { click, messages } = req.body;

        const featuresToUpdate = {};
        if (typeof click === 'boolean') featuresToUpdate.click = click;
        if (typeof messages === 'boolean') featuresToUpdate.messages = messages;

        const newState = setAutomationFeatures(apiKey, featuresToUpdate);

        res.json({ success: true, data: newState });
    } catch (e) {
        error(`Error updating features: ${e.message}`);
        res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;
