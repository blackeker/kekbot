const express = require('express');
const router = express.Router();
const { getUserSettings, saveUserSettings } = require('../services/databaseService');
const { updatePresence, updateAutoDeleteConfig } = require('../services/botManager');
const { info, error } = require('../utils/logger');

// Get Settings
router.get('/', async (req, res) => {
    try {
        const client = req.discordClient;
        const userId = client.user.id;

        const settings = await getUserSettings(userId);
        info(`Settings retrieved key for user: ${client.user.username}`);
        res.json({ success: true, data: settings });
    } catch (e) {
        error(`Error retrieving settings: ${e.message}`);
        res.status(500).json({ success: false, error: e.message });
    }
});

// Update RPC Settings
router.post('/rpc', async (req, res) => {
    try {
        const userId = req.userId; // authMiddleware'den gelir
        const apiKey = req.headers.authorization || req.headers['x-api-key'];
        const { rpcEnabled, rpcSettings } = req.body;

        if (typeof rpcEnabled !== 'boolean' || !rpcSettings) {
            return res.status(400).json({ success: false, error: 'Invalid payload: rpcEnabled (bool) and rpcSettings (obj) required.' });
        }

        // 1. Ayarları DB'ye kaydet
        // Mevcut ayarları çekmemize gerek yok, saveUserSettings merge yapar mı? 
        // databaseService'e bakınca update sorgusu kuruyor, yani kısmi güncelleme yapar.
        const updateData = {
            rpcEnabled: rpcEnabled ? 1 : 0, // DB INTEGER tutuyor
            rpcSettings: rpcSettings
        };

        await saveUserSettings(userId, updateData);

        // 2. Botu çalışıyorsa anlık güncelle
        if (req.discordClient) {
            if (rpcEnabled) {
                await updatePresence(apiKey, rpcSettings);
            } else {
                await updatePresence(apiKey, { name: null }); // Temizle
            }
        }

        info(`RPC settings updated for user: ${userId}`);
        res.json({ success: true, message: 'RPC ayarları güncellendi.' });

    } catch (e) {
        error(`RPC update error: ${e.message}`);
        res.status(500).json({ success: false, error: e.message });
    }
});
router.post('/gems', (req, res) => res.status(501).json({ success: false, error: 'Not implemented' }));
router.get('/export', (req, res) => res.status(501).json({ success: false, error: 'Not implemented' }));
router.post('/import', (req, res) => res.status(501).json({ success: false, error: 'Not implemented' }));

// Update Auto Delete Settings
router.post('/auto-delete', async (req, res) => {
    try {
        const userId = req.userId;
        const apiKey = req.headers.authorization || req.headers['x-api-key'];
        const { enabled, channelId, colors } = req.body;

        if (typeof enabled !== 'boolean' || !channelId || !Array.isArray(colors)) {
            return res.status(400).json({ success: false, error: 'Invalid payload: enabled(bool), channelId(string), colors(array) required.' });
        }

        const config = { enabled, channelId, colors };

        // 1. Save to DB
        // saveUserSettings partial update yapar, autoDeleteConfig tek alan olarak guncellenir
        await saveUserSettings(userId, { autoDeleteConfig: config });

        // 2. Update Runtime
        if (updateAutoDeleteConfig) {
            updateAutoDeleteConfig(apiKey, config);
        }

        info(`Auto-delete settings updated for user: ${userId}`);
        res.json({ success: true, message: 'Auto-delete configurasyonu guncellendi.' });

    } catch (e) {
        error(`Auto-delete update error: ${e.message}`);
        res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;
