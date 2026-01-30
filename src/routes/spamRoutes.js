const express = require('express');
const router = express.Router();
const {
    getSpamBots, addSpamBot, deleteSpamBot,
    updateSpamBotStatus, updateSpamBotConfig
} = require('../services/databaseService');
const { startSpamBot, stopSpamBot } = require('../services/spamService');

// Get all spam bots
router.get('/', (req, res) => {
    try {
        const bots = getSpamBots(req.userId);
        res.json({ success: true, data: bots });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Add new spam bot
router.post('/', (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ success: false, error: 'Token is required' });

        addSpamBot(req.userId, token);
        res.json({ success: true, message: 'Bot added' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Delete spam bot
router.delete('/:id', (req, res) => {
    try {
        const botId = parseInt(req.params.id);
        stopSpamBot(req.userId, botId); // Stop if running
        deleteSpamBot(req.userId, botId);
        res.json({ success: true, message: 'Bot deleted' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Start bot
router.post('/:id/start', async (req, res) => {
    try {
        const botId = parseInt(req.params.id);
        const bots = getSpamBots(req.userId);
        const bot = bots.find(b => b.id === botId);

        if (!bot) return res.status(404).json({ success: false, error: 'Bot not found' });

        const config = JSON.parse(bot.config || '{}');
        await startSpamBot(req.userId, botId, bot.token, config);

        res.json({ success: true, message: 'Bot started' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Send Potato
router.post('/potato', async (req, res) => {
    try {
        const { targetUserId } = req.body;
        // Hedef yoksa, isteği yapan ana hesabın kendisi olsun
        const target = targetUserId || req.userId;

        const count = await require('../services/spamService').sendPotato(req.userId, target);

        res.json({ success: true, message: `${count} bot patates gönderdi.`, count });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Stop bot
router.post('/:id/stop', (req, res) => {
    try {
        const botId = parseInt(req.params.id);
        stopSpamBot(req.userId, botId);
        res.json({ success: true, message: 'Bot stopped' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Update config
router.post('/:id/config', (req, res) => {
    try {
        const botId = parseInt(req.params.id);
        const { config } = req.body;

        updateSpamBotConfig(req.userId, botId, config);

        // If running, restart to apply config? Or just update runtime?
        // Simple way: User must restart bot to apply.

        res.json({ success: true, message: 'Config updated' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;
