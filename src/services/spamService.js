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
                        console.log(`[SpamBot] Sent to channel ${targetId}`);
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
    stopSpamBot
};
