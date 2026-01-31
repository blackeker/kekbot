const express = require('express');
const router = express.Router();
const {
    getUserCommands, saveUserCommands, addUserCommand,
    updateUserCommand, patchUserCommand, deleteUserCommand
} = require('../services/databaseService');
const { restartAutoMessages } = require('../services/botManager');
const { error } = require('../utils/logger');

// Commands - GET
router.get('/', async (req, res) => {
    try {
        const cmds = await getUserCommands(req.userId);
        res.json({ success: true, data: cmds });
    } catch (e) {
        error(`Get commands error: ${e.message}`);
        res.status(500).json({ success: false, error: e.message });
    }
});

// Commands - POST (Bulk Update)
router.post('/', async (req, res) => {
    const { commands } = req.body;
    if (!Array.isArray(commands)) return res.status(400).json({ success: false, error: 'commands array required' });

    try {
        await saveUserCommands(req.userId, commands);

        // Komutlar değişti, otomasyonu yenile
        const apiKey = req.apiKey;
        if (req.discordClient) {
            await restartAutoMessages(apiKey);
        }

        res.json({ success: true, data: commands });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Commands - Add
router.post('/add', async (req, res) => {
    const { command } = req.body;
    if (!command || !command.text) return res.status(400).json({ success: false, error: 'Invalid command object' });
    try {
        const updated = await addUserCommand(req.userId, command);

        // Yeni komut eklendi (interval olabilir), otomasyonu yenile
        const apiKey = req.apiKey;
        if (req.discordClient) {
            await restartAutoMessages(apiKey);
        }

        res.json({ success: true, data: updated });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Commands - Update/Delete/Patch by Index
router.put('/:index', async (req, res) => handleCommandUpdate(req, res, updateUserCommand));
router.patch('/:index', async (req, res) => handleCommandUpdate(req, res, patchUserCommand));

async function handleCommandUpdate(req, res, fn) {
    const idx = parseInt(req.params.index);
    const data = req.body.command || req.body; // .command for full update, body for patch
    if (isNaN(idx)) return res.status(400).json({ success: false, error: 'Invalid index' });
    try {
        const updated = await fn(req.userId, idx, data);

        // Komut değişti, otomasyonu yenile
        const apiKey = req.apiKey;
        if (req.discordClient) {
            await restartAutoMessages(apiKey);
        }

        res.json({ success: true, data: updated });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
}

router.delete('/:index', async (req, res) => {
    const idx = parseInt(req.params.index);
    if (isNaN(idx)) return res.status(400).json({ success: false, error: 'Invalid index' });
    try {
        const updated = await deleteUserCommand(req.userId, idx);

        // Komut silindi, otomasyonu yenile
        const apiKey = req.apiKey;
        if (req.discordClient) {
            await restartAutoMessages(apiKey);
        }

        res.json({ success: true, data: updated });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});

module.exports = router;
