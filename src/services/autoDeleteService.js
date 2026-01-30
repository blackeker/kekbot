const { Client } = require('discord.js-selfbot-v13');
const { getUserSettings } = require('./databaseService');

// Map<userId, Client>
const autoDeleteClients = new Map();
// Map<userId, config>
const autoDeleteConfigs = new Map();

/**
 * Start auto-delete bot for a user (independent from main bot)
 */
async function startAutoDelete(userId, token, config) {
    if (autoDeleteClients.has(userId)) {
        console.log(`[AutoDelete] Already running for user ${userId}`);
        return;
    }

    if (!config || !config.enabled || !config.channelId) {
        console.log(`[AutoDelete] Invalid config for user ${userId}`);
        return;
    }

    console.log(`[AutoDelete] Starting for user ${userId}...`);
    const client = new Client({ checkUpdate: false });

    return new Promise((resolve, reject) => {
        client.on('ready', () => {
            console.log(`[AutoDelete] ${client.user.tag} active!`);
            autoDeleteClients.set(userId, client);
            autoDeleteConfigs.set(userId, config);

            // Listen for messages
            client.on('messageCreate', async (message) => {
                const adConfig = autoDeleteConfigs.get(userId);
                if (!adConfig || !adConfig.enabled || adConfig.channelId !== message.channel.id) return;

                if (message.embeds.length > 0) {
                    const shouldDelete = message.embeds.some(embed => {
                        return embed.color && adConfig.colors.includes(embed.color);
                    });

                    if (shouldDelete) {
                        try {
                            await message.delete();
                            console.log(`[AutoDelete] ✓ Deleted ${message.id}`);
                        } catch (e) {
                            console.error(`[AutoDelete] ✗ Failed: ${e.message}`);
                        }
                    }
                }
            });

            resolve(true);
        });

        client.login(token).catch(err => {
            console.error(`[AutoDelete] Login failed for ${userId}: ${err.message}`);
            reject(err);
        });
    });
}

/**
 * Stop auto-delete for a user
 */
function stopAutoDelete(userId) {
    const client = autoDeleteClients.get(userId);
    if (client) {
        client.destroy();
        autoDeleteClients.delete(userId);
        autoDeleteConfigs.delete(userId);
        console.log(`[AutoDelete] Stopped for user ${userId}`);
    }
}

/**
 * Update auto-delete config at runtime
 */
function updateAutoDeleteConfig(userId, config) {
    if (autoDeleteConfigs.has(userId)) {
        autoDeleteConfigs.set(userId, config);
        console.log(`[AutoDelete] Config updated for user ${userId}`);
    }
}

/**
 * Restore all active auto-delete bots on startup
 */
async function restoreAllAutoDelete() {
    try {
        const Database = require('better-sqlite3');
        const path = require('path');
        const dbPath = path.resolve(__dirname, '../../data/users.db');
        const db = new Database(dbPath);

        // Get all users with auto-delete enabled
        const users = db.prepare('SELECT * FROM users').all();
        const settings = db.prepare('SELECT * FROM settings').all();
        db.close();

        let restored = 0;

        for (const user of users) {
            const userSettings = settings.find(s => s.user_id === user.discord_user_id);
            if (!userSettings) continue;

            const autoDeleteConfig = JSON.parse(userSettings.auto_delete_config || '{}');
            if (autoDeleteConfig.enabled) {
                try {
                    await startAutoDelete(user.discord_user_id, user.discord_token, autoDeleteConfig);
                    restored++;
                    console.log(`[AutoDelete] ✓ Restored for ${user.discord_user_id}`);
                } catch (e) {
                    console.error(`[AutoDelete] ✗ Failed to restore for ${user.discord_user_id}: ${e.message}`);
                }
            }
        }

        console.log(`[AutoDelete] Restored ${restored} auto-delete bots`);
    } catch (e) {
        console.error('[AutoDelete] Error restoring:', e.message);
    }
}

module.exports = {
    startAutoDelete,
    stopAutoDelete,
    updateAutoDeleteConfig,
    restoreAllAutoDelete
};
