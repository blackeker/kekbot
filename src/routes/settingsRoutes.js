const express = require('express');
const router = express.Router();
const { getUserSettings, saveUserSettings } = require('../services/databaseService');
const { updatePresence, updateAutoDeleteConfig, restartAutoMessages } = require('../services/botManager');
const { info, error } = require('../utils/logger');

// Update Settings (Generic)
router.post('/', async (req, res) => {
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

        // Save to DB
        await saveUserSettings(userId, settings);

        // Refresh Runtime
        const apiKey = req.headers.authorization || req.headers['x-api-key'];

        // 1. Restart Auto Messages (if channel changed)
        if (req.discordClient) {
            await restartAutoMessages(apiKey);
        }

        // Wait, I need restartAutoMessages. It is not currently imported in settingsRoutes.
        // I will add the import in a separate edit or include it here if I can replace imports.
        // It's safer to add imports at top first. I'll do this in two steps or simply assume I will add imports in next step.
        // Actually I can invoke `restartAutoMessages` if I import it.

        // I'll return success and handle imports separately or check context. 
        // Existing imports line 4: `const { updatePresence, updateAutoDeleteConfig } = require('../services/botManager');`
        // I need to add `restartAutoMessages` to line 4.

        const current = await getUserSettings(userId);
        info(`Settings updated for ${userId}`);
        res.json({ success: true, message: 'Ayarlar güncellendi', data: current });
    } catch (e) {
        error(`Settings update error: ${e.message}`);
        res.status(400).json({ success: false, error: e.message });
    }
});

// Get Settings
router.get('/', async (req, res) => {
    try {
        const client = req.discordClient;
        const userId = req.userId; // client.user.id might be null if client not ready? Auth middleware sets req.userId.
        // Prefer req.userId

        const settings = await getUserSettings(userId);
        info(`Settings retrieved for user: ${userId}`);
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
        await saveUserSettings(userId, { autoDeleteConfig: config });

        // 2. Update Runtime - Both services
        // Main bot auto-click config
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
