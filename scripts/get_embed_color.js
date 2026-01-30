const { Client } = require('discord.js-selfbot-v13');
const Database = require('better-sqlite3');
const path = require('path');
const { decrypt } = require('../src/services/encryptionService');

const dbPath = path.resolve(__dirname, '../data/users.db');
const db = new Database(dbPath);

async function findColor() {
    // 1. Get User and Settings
    const user = db.prepare('SELECT * FROM users LIMIT 1').get();
    if (!user) {
        console.log('No user found in DB.');
        return;
    }

    const settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(user.discord_user_id);
    if (!settings || !settings.channel_id) {
        console.log('No channel configured in settings.');
        return;
    }

    const token = decrypt(user.encrypted_token);
    // const channelId = settings.channel_id;
    const channelId = '1435279104046923858'; // User provided
    const targetMsgId = '1466776830290956513';

    console.log(`User: ${user.username}, Channel: ${channelId}`);
    console.log(`Target Message: ${targetMsgId}`);

    // 2. Login
    const client = new Client({ checkUpdate: false });

    client.on('ready', async () => {
        console.log(`Logged in as ${client.user.tag}`);

        try {
            const channel = await client.channels.fetch(channelId);
            if (!channel) {
                console.log('Channel not found.');
                process.exit(0);
            }

            console.log(`Fetching message from ${channel.name}...`);
            try {
                const msg = await channel.messages.fetch(targetMsgId);
                console.log('Message found!');

                if (msg.embeds.length > 0) {
                    msg.embeds.forEach((embed, i) => {
                        console.log(`\n--- Embed ${i + 1} ---`);
                        console.log(`Color (Int): ${embed.color}`);
                        console.log(`Color (Hex): #${embed.color?.toString(16).padStart(6, '0')}`);
                        console.log(`Title: ${embed.title}`);
                        console.log(`Description: ${embed.description}`);
                    });
                } else {
                    console.log('Message has no embeds.');
                }

            } catch (e) {
                console.error('Message could not be fetched (might be in another channel or deleted):', e.message);
            }

        } catch (e) {
            console.error('Error:', e.message);
        }

        client.destroy();
    });

    client.login(token);
}

findColor();
