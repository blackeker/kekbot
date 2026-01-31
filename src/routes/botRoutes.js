const express = require('express');
const router = express.Router();
const {
    getUserCommands, saveUserCommands, addUserCommand,
    updateUserCommand, patchUserCommand, deleteUserCommand,
    getUserSettings, getCommandStats
} = require('../services/databaseService');
const { stopClient, getCaptchaState, restartAutoMessages, getClient } = require('../services/botManager');
const { stopAllSpamBotsForUser } = require('../services/spamService');
const { info, error, getLogs } = require('../utils/logger');

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
    if (!client || !client.user) {
        return res.json({
            success: true,
            data: {
                username: null,
                id: req.userId,
                isReady: false,
                stats: null
            },
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
        captchaState: getCaptchaState(req.headers.authorization || req.headers['x-api-key'])
    });
});


// Start
router.post('/start', async (req, res) => {
    const apiKey = req.headers.authorization || req.headers['x-api-key'];
    // Eğer zaten çalışıyorsa
    if (req.discordClient) {
        return res.json({ success: true, message: 'Bot zaten çalışıyor.' });
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
    const apiKey = req.headers.authorization || req.headers['x-api-key'];
    try {
        if (!req.discordClient) {
            return res.json({ success: true, message: 'Bot zaten kapalı.' });
        }
        stopClient(apiKey);
        stopAllSpamBotsForUser(req.userId); // Also stop all spam bots
        info(`Bot and spam bots stopped: ${req.discordClient.user.username}`);
        res.json({ success: true, message: 'Bot durduruldu.' });
    } catch (e) {
        error(`Error stopping bot: ${e.message}`);
        res.status(500).json({ success: false, error: 'Bot durdurulurken hata.' });
    }
});

// Send Message
router.post('/send-message', async (req, res) => {
    const { channelId, message } = req.body;
    const client = req.discordClient;

    if (!client) {
        return res.status(503).json({ success: false, error: 'Bot is not running. Please start it first.' });
    }

    const apiKey = req.headers.authorization || req.headers['x-api-key'];

    // Captcha kontrolü
    const captcha = getCaptchaState(apiKey);
    if (captcha.active) {
        return res.status(423).json({
            success: false,
            error: 'LOCKED: Captcha required. Solve it first.',
            captchaRequired: true
        });
    }

    if (!channelId || !message) return res.status(400).json({ success: false, error: 'Missing channelId or message.' });

    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel || typeof channel.send !== 'function') {
            return res.status(400).json({ success: false, error: 'Invalid channel or cannot send.' });
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
        // Kanalı ayarlardan al
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

        // Optimistic unlock? No, let the bot listener handle it.
        res.json({ success: true, message: 'Captcha çözümü gönderildi.' });
    } catch (e) {
        error(`Solve captcha error: ${e.message}`);
        res.status(500).json({ success: false, error: e.message });
    }
});

// Settings (Update)
router.post('/settings', async (req, res) => {
    try {
        const userId = req.userId;
        const { channelId, theme, gemSystemEnabled, gems, rpcEnabled, rpcSettings } = req.body;

        const settings = {};
        if (channelId !== undefined) settings.channelId = channelId;
        if (theme !== undefined) settings.theme = theme;
        if (typeof gemSystemEnabled === 'boolean') settings.gemSystemEnabled = gemSystemEnabled;
        if (Array.isArray(gems)) settings.gems = gems;
        if (typeof rpcEnabled === 'boolean') settings.rpcEnabled = rpcEnabled;
        if (rpcSettings) settings.rpcSettings = rpcSettings;

        if (rpcSettings) settings.rpcSettings = rpcSettings;

        await saveUserSettings(userId, settings);
        const current = await getUserSettings(userId);

        // Settings değiştiği için (Channel ID olabilir) otomasyonu yenile
        const apiKey = req.headers.authorization || req.headers['x-api-key'];
        if (req.discordClient) {
            await restartAutoMessages(apiKey);
        }

        info(`Settings updated for ${userId}`);
        res.json({ success: true, message: 'Ayarlar güncellendi', data: current });
    } catch (e) {
        error(`Settings update error: ${e.message}`);
        res.status(400).json({ success: false, error: e.message });
    }
});

// Commands - GET
router.get('/commands', async (req, res) => {
    try {
        const cmds = await getUserCommands(req.userId);
        res.json({ success: true, data: cmds });
    } catch (e) {
        error(`Get commands error: ${e.message}`);
        res.status(500).json({ success: false, error: e.message });
    }
});

// Commands - POST (Bulk Update)
router.post('/commands', async (req, res) => {
    const { commands } = req.body;
    if (!Array.isArray(commands)) return res.status(400).json({ success: false, error: 'commands array required' });

    try {
        await saveUserCommands(req.userId, commands);

        // Komutlar değişti, otomasyonu yenile
        const apiKey = req.headers.authorization || req.headers['x-api-key'];
        if (req.discordClient) {
            await restartAutoMessages(apiKey);
        }

        res.json({ success: true, data: commands });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Commands - Add
router.post('/commands/add', async (req, res) => {
    const { command } = req.body;
    if (!command || !command.text) return res.status(400).json({ success: false, error: 'Invalid command object' });
    try {
        const updated = await addUserCommand(req.userId, command);

        // Yeni komut eklendi (interval olabilir), otomasyonu yenile
        const apiKey = req.headers.authorization || req.headers['x-api-key'];
        if (req.discordClient) {
            await restartAutoMessages(apiKey);
        }

        res.json({ success: true, data: updated });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Commands - Update/Delete/Patch by Index
router.put('/commands/:index', async (req, res) => handleCommandUpdate(req, res, updateUserCommand));
router.patch('/commands/:index', async (req, res) => handleCommandUpdate(req, res, patchUserCommand));

async function handleCommandUpdate(req, res, fn) {
    const idx = parseInt(req.params.index);
    const data = req.body.command || req.body; // .command for full update, body for patch
    if (isNaN(idx)) return res.status(400).json({ success: false, error: 'Invalid index' });
    try {
        const updated = await fn(req.userId, idx, data);

        // Komut değişti, otomasyonu yenile
        const apiKey = req.headers.authorization || req.headers['x-api-key'];
        if (req.discordClient) {
            await restartAutoMessages(apiKey);
        }

        res.json({ success: true, data: updated });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
}

router.delete('/commands/:index', async (req, res) => {
    const idx = parseInt(req.params.index);
    if (isNaN(idx)) return res.status(400).json({ success: false, error: 'Invalid index' });
    try {
        const updated = await deleteUserCommand(req.userId, idx);

        // Komut silindi, otomasyonu yenile
        const apiKey = req.headers.authorization || req.headers['x-api-key'];
        if (req.discordClient) {
            await restartAutoMessages(apiKey);
        }

        res.json({ success: true, data: updated });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});

module.exports = router;
