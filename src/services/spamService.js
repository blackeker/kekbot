const { Client } = require('discord.js-selfbot-v13');
const Database = require('better-sqlite3');
const path = require('path');
const { getSpamBots, updateSpamBotStatus, incrementCommandUsage } = require('./databaseService');
const { attachAutoDeleteToSpamBot } = require('./autoDeleteService');

// Map<botId, Client>
const activeSpamClients = new Map();
// Map<botId, Interval>
const activeSpamIntervals = new Map();

function generateRandomMessage() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const nums = '0123456789';
    let str = '';
    // 50 chars + 30 nums mixed
    for (let i = 0; i < 50; i++) str += chars.charAt(Math.floor(Math.random() * chars.length));
    for (let i = 0; i < 30; i++) str += nums.charAt(Math.floor(Math.random() * nums.length));
    return str.split('').sort(() => 0.5 - Math.random()).join('');
}

async function startSpamBot(userId, botId, token, config) {
    if (activeSpamClients.has(botId)) return; // Already running

    console.log(`Starting Spam Bot ${botId}...`);
    const client = new Client({ checkUpdate: false });

    return new Promise((resolve, reject) => {
        client.on('ready', async () => {
            console.log(`[SpamBot] ${client.user.tag} active!`);
            activeSpamClients.set(botId, client);
            updateSpamBotStatus(userId, botId, true);

            // Rename channels to username-1, username-2, etc.
            await renameChannels(client, config);

            startSpamLoop(userId, botId, client, config);
            resolve(true);
        });

        client.login(token).catch(err => {
            console.error(`[SpamBot] Login failed for ${botId}: ${err.message}`);
            updateSpamBotStatus(userId, botId, false);
            reject(err);
        });
    });
}

async function renameChannels(client, config) {
    const targets = config.channels || [];
    const username = client.user.username;

    if (targets.length === 0) return;

    for (let i = 0; i < targets.length; i++) {
        try {
            const channel = await client.channels.fetch(targets[i]).catch(() => null);
            if (channel && channel.setName) {
                const newName = `${username}-${i + 1}`;

                // Skip if already renamed
                if (channel.name === newName) {
                    console.log(`[SpamBot] Channel ${targets[i]} already named ${newName}, skipping`);
                    continue;
                }

                await channel.setName(newName);
                console.log(`[SpamBot] Renamed channel ${targets[i]} to ${newName}`);
            }
        } catch (e) {
            console.error(`[SpamBot] Failed to rename channel ${targets[i]}: ${e.message}`);
        }
    }
}

const gifList = [
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcDdtY2J6dG55bnh6bmw5bmw5bmw5bmw5bmw5bmw5bmw5bmw5/l0HlHJGHe3yAMhdQY/giphy.gif",
    "https://media.giphy.com/media/3o7TKr3nzbh5WgCFxe/giphy.gif",
    "https://media.giphy.com/media/l0HlPtbGpcnqa0fja/giphy.gif",
    "https://media.giphy.com/media/l41YtZOb9EUABfdq8/giphy.gif",
    "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif"
];

function getRandomGif() {
    return gifList[Math.floor(Math.random() * gifList.length)];
}

function startSpamLoop(userId, botId, client, config) {
    if (activeSpamIntervals.has(botId)) clearInterval(activeSpamIntervals.get(botId));

    const intervalTime = config.delay || 10000;
    const targets = config.channels || []; // Can be channel IDs or User IDs
    const targetType = config.targetType || 'channel'; // 'channel' or 'dm'
    const messageType = config.messageType || 'text'; // 'text' or 'gif'

    if (targets.length === 0) return;

    const interval = setInterval(async () => {
        if (!client.user) return;

        for (const targetId of targets) {
            try {
                let msg = (messageType === 'gif') ? getRandomGif() : generateRandomMessage();

                if (targetType === 'dm') {
                    // DM Mode
                    const user = await client.users.fetch(targetId).catch(() => null);
                    if (user) {
                        await user.send(msg);
                        console.log(`[SpamBot] DM sent to ${targetId}`);
                    }
                } else {
                    // Channel Mode (Default)
                    const channel = await client.channels.fetch(targetId).catch(() => null);
                    if (channel) {
                        await channel.send(msg);
                    }
                }
            } catch (e) {
                console.error(`[SpamBot] Error sending to ${targetId}: ${e.message}`);
            }
        }
    }, intervalTime);

    activeSpamIntervals.set(botId, interval);
}

function stopSpamBot(userId, botId) {
    if (activeSpamIntervals.has(botId)) {
        clearInterval(activeSpamIntervals.get(botId));
        activeSpamIntervals.delete(botId);
    }

    if (activeSpamClients.has(botId)) {
        const client = activeSpamClients.get(botId);
        client.destroy();
        activeSpamClients.delete(botId);
    }

    updateSpamBotStatus(userId, botId, false);
    console.log(`[SpamBot] Stopped ${botId}`);
}

module.exports = {
    startSpamBot,
    stopSpamBot,
    sendPotato: async (userId, targetUserId) => {
        // userId: Sahibi, targetUserId: +potato <target>
        const bots = getSpamBots(userId);
        let count = 0;

        const tasks = bots.map(async (bot) => {
            let client;
            let isTemp = false;

            if (activeSpamClients.has(bot.id)) {
                client = activeSpamClients.get(bot.id);
            } else {
                try {
                    client = new Client({ checkUpdate: false });
                    isTemp = true;
                    // Login with timout to prevent hanging
                    await new Promise((resolve, reject) => {
                        client.once('ready', resolve);
                        client.login(bot.token).catch(reject);
                        setTimeout(() => reject(new Error('Login timeout')), 15000);
                    });
                } catch (e) {
                    console.error(`[Potato] Failed to login bot ${bot.id}: ${e.message}`);
                    if (isTemp && client) client.destroy();
                    return;
                }
            }

            try {
                const config = JSON.parse(bot.config || '{}');
                const channels = config.channels || [];

                // İlk kanala gönder (veya hepsine? Genelde tek kanal spam için yeterli)
                if (channels.length > 0) {
                    const channelId = channels[0];
                    const channel = await client.channels.fetch(channelId).catch(() => null);
                    if (channel) {
                        await channel.send(`+potato <@${targetUserId}>`);
                        // Atomik olmayan sayac artisi ama Promise.all bekledigi icin sonuc tutarli olmayabilir.
                        // map icinde dis degiskeni guncelliyoruz.
                        // JS single thread oldugu icin race condition olmaz (await disinda).
                        count++;
                        console.log(`[Potato] ${client.user.tag} sent potato to ${targetUserId}`);
                    }
                }
            } catch (e) {
                console.error(`[Potato] Error for bot ${bot.id}: ${e.message}`);
            } finally {
                if (isTemp && client) client.destroy();
            }
        });

        await Promise.all(tasks);
        return count;
    }
};

/**
 * Uygulama başladığında tüm aktif spam botlarını otomatik başlatır
 */
async function restoreAllActiveSpamBots() {
    try {
        const Database = require('better-sqlite3');
        const path = require('path');
        const dbPath = path.resolve(__dirname, '../../data/users.db');
        const db = new Database(dbPath);

        // Tüm aktif spam botlarını getir
        const activeBots = db.prepare('SELECT * FROM spam_bots WHERE is_active = 1 ORDER BY user_id, id').all();

        // Her kullanıcı için auto-delete config'i al
        const settings = db.prepare('SELECT user_id, auto_delete_config FROM settings').all();
        db.close();

        if (activeBots.length === 0) {
            console.log('[SpamService] No active spam bots to restore');
            return;
        }

        console.log(`[SpamService] Restoring ${activeBots.length} active spam bots...`);

        // Track which users already have auto-delete attached
        const autoDeleteAttached = new Set();

        for (const bot of activeBots) {
            try {
                const config = JSON.parse(bot.config || '{}');
                await startSpamBot(bot.user_id, bot.id, bot.token, config);

                // Only attach auto-delete to FIRST bot per user
                // DISABLED: Auto-delete is now handled by the main bot in botManager.js
                // to ensure proper permissions (spam bots cannot delete others' messages in DMs)
                /*
                if (!autoDeleteAttached.has(bot.user_id)) {
                    const userSettings = settings.find(s => s.user_id === bot.user_id);
                    if (userSettings && userSettings.auto_delete_config) {
                        const autoDeleteConfig = JSON.parse(userSettings.auto_delete_config);
                        if (autoDeleteConfig.enabled) {
                            const client = activeSpamClients.get(bot.id);
                            if (client) {
                                attachAutoDeleteToSpamBot(bot.id, client, autoDeleteConfig);
                                autoDeleteAttached.add(bot.user_id);
                            }
                        }
                    }
                }
                */

                console.log(`[SpamService] ✓ Restored spam bot ${bot.id}`);
            } catch (e) {
                console.error(`[SpamService] ✗ Failed to restore bot ${bot.id}: ${e.message}`);
            }
        }

        console.log('[SpamService] All active spam bots restored');
    } catch (e) {
        console.error('[SpamService] Error restoring spam bots:', e.message);
    }
}

module.exports.restoreAllActiveSpamBots = restoreAllActiveSpamBots;
