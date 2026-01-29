const { Client } = require('discord.js-selfbot-v13');
const { getSpamBots, updateSpamBotStatus, incrementCommandUsage } = require('./databaseService');

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
        client.on('ready', () => {
            console.log(`[SpamBot] ${client.user.tag} active!`);
            activeSpamClients.set(botId, client);
            updateSpamBotStatus(userId, botId, true);
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

function startSpamLoop(userId, botId, client, config) {
    if (activeSpamIntervals.has(botId)) clearInterval(activeSpamIntervals.get(botId));

    // Default 10s if not set
    const intervalTime = config.delay || 10000;
    const channels = config.channels || [];

    if (channels.length === 0) return;

    const interval = setInterval(async () => {
        if (!client.user) return; // Safety check

        for (const channelId of channels) {
            try {
                const channel = await client.channels.fetch(channelId);
                if (channel) {
                    const msg = generateRandomMessage();
                    await channel.send(msg);
                    console.log(`[SpamBot] Sent to ${channelId}`);
                    // Optional: Track stats for main user too?
                    // incrementCommandUsage(userId, "[SPAM] Random"); 
                }
            } catch (e) {
                console.error(`[SpamBot] Error sending to ${channelId}: ${e.message}`);
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
    stopSpamBot
};
