const { Client } = require('discord.js-selfbot-v13');

// Map<botId, config> - Auto-delete configs for each spam bot
const autoDeleteConfigs = new Map();

/**
 * Attach auto-delete listener to a spam bot client
 * This makes auto-delete work independently from main bot
 */
function attachAutoDeleteToSpamBot(botId, client, config) {
    if (!config || !config.enabled || !config.channelId) {
        return;
    }

    autoDeleteConfigs.set(botId, config);

    // Add message listener for auto-delete
    client.on('messageCreate', async (message) => {
        const adConfig = autoDeleteConfigs.get(botId);
        if (!adConfig || !adConfig.enabled || adConfig.channelId !== message.channel.id) return;

        if (message.embeds.length > 0) {
            const shouldDelete = message.embeds.some(embed => {
                return embed.color && adConfig.colors.includes(embed.color);
            });

            if (shouldDelete) {
                try {
                    console.log(`[AutoDelete-${botId}] Attempting to delete message ${message.id} (author: ${message.author?.tag || 'unknown'}, color: ${message.embeds[0]?.color})`);

                    const deletedMessage = await message.delete();

                    // Verify deletion
                    if (deletedMessage) {
                        console.log(`[AutoDelete-${botId}] ✓ Successfully deleted ${message.id}`);
                    } else {
                        console.log(`[AutoDelete-${botId}] ⚠ Delete returned null for ${message.id}`);
                    }
                } catch (e) {
                    console.error(`[AutoDelete-${botId}] ✗ Failed to delete ${message.id}: ${e.message}`);
                    console.error(`[AutoDelete-${botId}] Error details:`, e);
                }
            }
        }
    });

    console.log(`[AutoDelete] Attached to spam bot ${botId} for channel ${config.channelId}`);
}

/**
 * Remove auto-delete from a spam bot
 */
function detachAutoDeleteFromSpamBot(botId) {
    autoDeleteConfigs.delete(botId);
    console.log(`[AutoDelete] Detached from spam bot ${botId}`);
}

/**
 * Update auto-delete config for a spam bot
 */
function updateAutoDeleteForSpamBot(botId, config) {
    autoDeleteConfigs.set(botId, config);
    console.log(`[AutoDelete] Config updated for spam bot ${botId}`);
}

/**
 * Get auto-delete config for a spam bot
 */
function getAutoDeleteConfig(botId) {
    return autoDeleteConfigs.get(botId);
}

module.exports = {
    attachAutoDeleteToSpamBot,
    detachAutoDeleteFromSpamBot,
    updateAutoDeleteForSpamBot,
    getAutoDeleteConfig
};
