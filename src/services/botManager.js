const { Client, SnowflakeUtil } = require('discord.js-selfbot-v13');
const { getUserByApiKey, getUserCommands, getUserSettings, saveBotStatus, saveBotState, getBotState, incrementCommandUsage } = require('./databaseService');
const https = require('https');

// --- BotSession Class ---
class BotSession {
  constructor(apiKey, client) {
    this.apiKey = apiKey;
    this.client = client;
    this.intervals = []; // Array of Interval IDs
    this.autoDeleteConfig = {}; // AutoDeleteConfig object
    this.automationState = { click: true, messages: true }; // Automation flags
  }
}

const sessions = new Map(); // Key: apiKey, Value: BotSession

// --- Helpers ---

function downloadImageToBase64(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        const base64 = buffer.toString('base64');
        resolve(base64);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function clickButtonSafe(client, message, button) {
  const nonce = SnowflakeUtil.generate();
  const data = {
    type: 3,
    nonce,
    guild_id: message.guildId,
    channel_id: message.channelId,
    message_id: message.id,
    application_id: message.applicationId ?? message.author.id,
    session_id: client.sessionId,
    message_flags: message.flags.bitfield,
    data: {
      component_type: 2, // BUTTON
      custom_id: button.customId,
    },
  };

  await client.api.interactions.post({
    data,
  });
}

// --- Managers ---

function updateAutoDeleteConfig(apiKey, config) {
  const session = sessions.get(apiKey);
  if (session) {
    session.autoDeleteConfig = config;
    console.log(`Auto - delete config updated for session: ${apiKey}`);
  }
}

/**
 * @param {string} apiKey 
 * @param {boolean} createIfMissing 
 * @returns {Promise<Client|null>} 
 */
async function getClient(apiKey, createIfMissing = true) {
  // 1. Check existing session
  let session = sessions.get(apiKey);
  if (session) {
    // Re-enable automation if it was paused (Resume all)
    session.automationState = { click: true, messages: true };

    // Ensure auto messages are running
    await startAutoMessages(apiKey, session.client);
    return session.client;
  }

  if (!createIfMissing) {
    return null;
  }

  // 2. Get user from DB
  const user = await getUserByApiKey(apiKey);
  if (!user || !user.discordToken) {
    throw new Error('Geçersiz API anahtarı veya kullanıcı bulunamadı.');
  }

  // 3. Create new client
  const client = new Client({
    checkUpdate: false,
  });

  return new Promise((resolve, reject) => {
    client.on('ready', async () => {
      console.log(`${client.user.username} olarak giriş yapıldı! API Key: ${apiKey}`);

      // Create Session
      const newSession = new BotSession(apiKey, client);
      sessions.set(apiKey, newSession);

      // Load Settings
      try {
        const settings = await getUserSettings(client.user.id);
        if (settings.autoDeleteConfig) {
          newSession.autoDeleteConfig = settings.autoDeleteConfig;
          console.log(`Auto-delete config loaded for ${client.user.username}`);
        }
      } catch (e) {
        console.error("Settings load error:", e);
      }

      // Start Automations
      startAutoMessages(apiKey, client);
      restorePresence(apiKey, client);

      // Event Listener
      client.on('messageCreate', async (message) => handleMessage(message, apiKey));

      resolve(client);
    });

    client.login(user.discordToken).catch(err => {
      console.error(`Token ile giriş yapılamadı. API Key: ${apiKey}`, err);
      sessions.delete(apiKey);
      reject(new Error('Discord\'a giriş yapılamadı. Token geçersiz olabilir.'));
    });
  });
}

async function handleMessage(message, apiKey) {
  const session = sessions.get(apiKey);
  if (!session) return;
  const client = session.client;
  const content = message.content || '';

  // 1. CAPTCHA CHECK
  if (content.includes('STOP USING THIS COMMAND OR YOU WILL GET BLACKLISTED') &&
    content.includes('complete the captcha using')) {

    console.log(`⚠️ CAPTCHA DETECTED for user ${client.user.username}`);

    let imageBase64 = null;
    if (message.attachments.size > 0) {
      const attachment = message.attachments.first();
      if (attachment.contentType && attachment.contentType.startsWith('image/')) {
        try {
          imageBase64 = await downloadImageToBase64(attachment.url);
          console.log('Captcha image downloaded.');
        } catch (err) {
          console.error('Failed to download captcha image:', err);
        }
      }
    }

    saveBotState(client.user.id, true, imageBase64);
    return;

  } else if (content.includes('captcha completed, you can keep playing!') &&
    message.mentions.users.has(client.user.id)) {
    console.log(`✅ CAPTCHA SOLVED for user ${client.user.username}`);
    saveBotState(client.user.id, false, null);
    return;
  }

  // 2. LOCK CHECK
  const botState = getBotState(client.user.id);
  if (botState && botState.active) {
    return;
  }

  const adConfig = session.autoDeleteConfig;

  // --- AUTO DELETE ---
  if (adConfig && adConfig.enabled && adConfig.channelId === message.channel.id) {
    if (message.embeds.length > 0) {
      const shouldDelete = message.embeds.some(embed => {
        return embed.color && adConfig.colors.includes(embed.color);
      });

      if (shouldDelete) {
        try {
          // Safe delete with timeout
          const deletePromise = message.delete();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Delete timeout')), 10000)
          );
          await Promise.race([deletePromise, timeoutPromise]);
          console.log(`[AutoDelete] ✓ ${message.id}`);
          return; // Deleted, stop processing
        } catch (e) {
          if (!e.message || !e.message.includes('timeout')) {
            console.error(`[AutoDelete] ✗ ${message.id}: ${e.message}`);
          }
        }
      }
    }
  }

  // --- AUTO CLICK ---
  const isClickEnabled = session.automationState.click !== false;

  if (isClickEnabled && adConfig && adConfig.enabled && adConfig.channelId === message.channel.id) {
    if (message.embeds.length > 0) {
      // Re-check delete criteria just in case (though should have returned above)
      const shouldDelete = message.embeds.some(embed => {
        return embed.color && adConfig.colors.includes(embed.color);
      });

      if (!shouldDelete && message.components && message.components.length > 0) {
        try {
          const firstRow = message.components[0];
          if (firstRow && firstRow.components && firstRow.components.length > 0) {
            const firstButton = firstRow.components[0];

            if (!firstButton.customId) {
              console.log(`[AutoClick] ✗ Skipped ${message.id}: Button has no customId`);
              return;
            }

            if (firstButton.type !== 'BUTTON' && firstButton.type !== 2) return;
            if (firstButton.disabled) return;

            console.log(`[AutoClick] Clicking: ${firstButton.customId} on ${message.id}`);

            await new Promise(resolve => setTimeout(resolve, 1000));
            await clickButtonSafe(client, message, firstButton);
            console.log(`[AutoClick] ✓ Clicked ${message.id}`);
          }
        } catch (e) {
          console.error(`[AutoClick] ✗ Failed on ${message.id}: ${e.message}`);
        }
      }
    }
  }
}

function stopClient(apiKey) {
  const session = sessions.get(apiKey);
  if (session) {
    // Clear intervals
    session.intervals.forEach(clearInterval);
    session.intervals = [];

    // Destroy client
    if (session.client) {
      try {
        session.client.destroy();
      } catch (e) { console.error('Error destroying client:', e); }
    }

    sessions.delete(apiKey);
    console.log(`Bot durduruldu: ${apiKey}`);
  }
}

function stopAutomation(apiKey) {
  const session = sessions.get(apiKey);
  if (session) {
    session.automationState = { click: false, messages: false };
    stopAutoMessages(apiKey);
    console.log(`Bot otomasyonu durduruldu (Auto-Delete aktif): ${apiKey}`);
  }
}

function setAutomationFeatures(apiKey, features) {
  const session = sessions.get(apiKey);
  if (!session) {
    // If no session, logic implies we can't set features for a non-running bot here effectively
    // but we return default or what was requested.
    return { click: false, messages: false };
  }

  const current = session.automationState;
  const newState = { ...current, ...features };
  session.automationState = newState;

  if (newState.messages) {
    startAutoMessages(apiKey, session.client);
  } else {
    stopAutoMessages(apiKey);
  }

  console.log(`Automation features updated for ${apiKey}: `, newState);
  return newState;
}

async function startAutoMessages(apiKey, client) {
  const session = sessions.get(apiKey);
  if (!session) return;

  if (session.automationState.messages === false) {
    console.log(`[AutoMessages] Skipped for ${apiKey} (Messages Paused)`);
    return;
  }

  stopAutoMessages(apiKey); // Clear existing

  try {
    const settings = await getUserSettings(client.user.id);
    const commands = await getUserCommands(client.user.id);

    if (!settings.channelId) return;

    commands.forEach(cmd => {
      const intervalMs = parseInt(cmd.interval);
      if (!isNaN(intervalMs) && intervalMs > 0) {
        const timer = setInterval(async () => {
          // Refetch session state inside interval
          const currentSession = sessions.get(apiKey);
          if (!currentSession || currentSession.automationState.messages === false) return;

          // Captcha Check
          const cap = getBotState(client.user.id);
          if (cap && cap.active) return;

          try {
            const channel = await client.channels.fetch(settings.channelId);
            if (channel) {
              await channel.send(cmd.text);
              incrementCommandUsage(client.user.id, cmd.text);
            }
          } catch (err) {
            console.error(`Auto-message error (${cmd.trigger}): ${err.message}`);
            // Recovery
            if (err.message.includes('token was unavailable')) {
              console.log(`♻️ Zombie token inferred. Cycling ${apiKey}...`);
              stopClient(apiKey);
              setTimeout(() => getClient(apiKey, true).catch(Boolean), 2000);
            }
          }
        }, intervalMs);

        session.intervals.push(timer);
      }
    });

  } catch (error) {
    console.error(`Error starting auto-messages: ${error.message}`);
  }
}

function stopAutoMessages(apiKey) {
  const session = sessions.get(apiKey);
  if (session && session.intervals.length > 0) {
    session.intervals.forEach(clearInterval);
    session.intervals = [];
  }
}

// --- RPC ---
async function restorePresence(apiKey, client) {
  try {
    const settings = await getUserSettings(client.user.id);
    if (settings.rpcEnabled && settings.rpcSettings) {
      console.log(`Restoring RPC for ${client.user.username}`);
      await setClientPresence(client, settings.rpcSettings);
    }
  } catch (e) {
    console.error(`Restore presence error: ${e.message}`);
  }
}

async function setClientPresence(client, rpcSettings) {
  if (!rpcSettings || !rpcSettings.name) {
    client.user.setActivity(null);
    return;
  }

  const activityOptions = {
    type: rpcSettings.type || 'PLAYING',
  };

  if (rpcSettings.url && rpcSettings.type === 'STREAMING') {
    activityOptions.url = rpcSettings.url;
  }

  if (rpcSettings.details) activityOptions.details = rpcSettings.details;
  if (rpcSettings.state) activityOptions.state = rpcSettings.state;

  if (rpcSettings.largeImageKey || rpcSettings.smallImageKey) {
    activityOptions.assets = {};
    if (rpcSettings.largeImageKey) {
      activityOptions.assets.large_image = rpcSettings.largeImageKey;
      if (rpcSettings.largeImageText) activityOptions.assets.large_text = rpcSettings.largeImageText;
    }
    if (rpcSettings.smallImageKey) {
      activityOptions.assets.small_image = rpcSettings.smallImageKey;
      if (rpcSettings.smallImageText) activityOptions.assets.small_text = rpcSettings.smallImageText;
    }
  }

  if (rpcSettings.startTimestamp) {
    activityOptions.timestamps = { start: rpcSettings.startTimestamp };
  }

  client.user.setActivity(rpcSettings.name, activityOptions);
  console.log(`Presence updated for ${client.user.username}`);
}

module.exports = {
  getClient,
  stopClient,
  stopAutomation,
  setAutomationFeatures,
  updateAutoDeleteConfig,
  getAutomationState: (apiKey) => {
    const s = sessions.get(apiKey);
    return s ? s.automationState : { click: true, messages: true };
  },
  getCaptchaState: (apiKey) => {
    const s = sessions.get(apiKey);
    if (s && s.client) {
      return getBotState(s.client.user.id);
    }
    return { active: false, imageBase64: null };
  },
  restartAutoMessages: async (apiKey) => {
    const s = sessions.get(apiKey);
    if (s && s.client) {
      await startAutoMessages(apiKey, s.client);
    }
  },
  updatePresence: async (apiKey, rpcSettings) => {
    const s = sessions.get(apiKey);
    if (s && s.client) {
      await setClientPresence(s.client, rpcSettings);
    }
  }
};
