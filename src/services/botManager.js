const { Client, SnowflakeUtil } = require('discord.js-selfbot-v13');
const { getUserByApiKey, getUserCommands, getUserSettings, saveBotStatus, saveBotState, getBotState, incrementCommandUsage } = require('./databaseService');

const activeClients = new Map();
// Anahtar: apiKey, Değer: Array<IntervalID>
const activeIntervals = new Map();
// Anahtar: apiKey, Değer: AutoDeleteConfig
const activeAutoDeleteConfigs = new Map();
// Anahtar: apiKey, Değer: Boolean (Automation Enabled)
// Anahtar: apiKey, Değer: { click: boolean, messages: boolean }
const automationStates = new Map();

// Projede axios yoksa native https kullanırız.
const https = require('https');

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

function updateAutoDeleteConfig(apiKey, config) {
  if (activeClients.has(apiKey)) {
    activeAutoDeleteConfigs.set(apiKey, config);
    console.log(`Auto - click config updated for map key: ${apiKey} `);
  }
}

/**
 * @param {string} apiKey Kullanıcının API anahtarı.
 * @param {boolean} createIfMissing İstemci yoksa oluşturulsun mu? (Varsayılan: true)
 * @returns {Promise<Client|null>} Kullanıcıya ait Discord istemci nesnesi veya null.
 */
async function getClient(apiKey, createIfMissing = true) {
  // 1. İstemci zaten aktif mi diye kontrol et
  if (activeClients.has(apiKey)) {
    // Re-enable automation if it was paused (Resume all)
    automationStates.set(apiKey, { click: true, messages: true });
    // Ensure auto messages are running
    const client = activeClients.get(apiKey);
    await startAutoMessages(apiKey, client);
    return client;
  }

  if (!createIfMissing) {
    return null;
  }

  // ... (lines 91-106)
  activeClients.set(apiKey, client);
  automationStates.set(apiKey, { click: true, messages: true });

  // ... 

  /**
   * Otomasyonu (Click: false, Messages: false) durdurur ama Client'ı açık tutar (Auto-Delete için).
   */
  function stopAutomation(apiKey) {
    automationStates.set(apiKey, { click: false, messages: false });
    // stopAutoMessages(apiKey); // StartAutoMessages loop check handles this now, but let's clear intervals to be safe/efficient
    stopAutoMessages(apiKey);
    console.log(`Bot otomasyonu durduruldu (Auto-Delete aktif devam ediyor): ${apiKey}`);
  }

  function setAutomationFeatures(apiKey, features) {
    const current = automationStates.get(apiKey) || { click: false, messages: false };
    const newState = { ...current, ...features };
    automationStates.set(apiKey, newState);
    const client = activeClients.get(apiKey);
    if (client) {
      if (newState.messages) {
        startAutoMessages(apiKey, client);
      } else {
        stopAutoMessages(apiKey);
      }
    }

    console.log(`Automation features updated for ${apiKey}: `, newState);
    return newState;
  }

  // 2. İstemci aktif değilse, veritabanından kullanıcıyı al
  const user = await getUserByApiKey(apiKey);

  if (!user || !user.discordToken) {
    throw new Error('Geçersiz API anahtarı veya kullanıcı bulunamadı.');
  }

  // 3. Yeni bir istemci oluştur ve giriş yap
  const client = new Client({
    checkUpdate: false, // Otomatik güncelleme kontrolünü kapatabiliriz
  });

  return new Promise((resolve, reject) => {
    client.on('ready', async () => {
      console.log(`${client.user.username} olarak giriş yapıldı! API Key: ${apiKey} `);
      activeClients.set(apiKey, client);
      automationStates.set(apiKey, true);

      // Auto-Delete & Auto-Click Ayarlarını Yükle
      try {
        const settings = await getUserSettings(client.user.id);
        if (settings.autoDeleteConfig) {
          activeAutoDeleteConfigs.set(apiKey, settings.autoDeleteConfig);
          console.log(`Auto-delete & auto-click config loaded for ${client.user.username}`);
        }
      } catch (e) {
        console.error("Settings load error:", e);
      }

      // Otomatik Mesajları Başlat
      startAutoMessages(apiKey, client);

      // RPC Ayarlarını Kontrol Et ve Başlat
      restorePresence(apiKey, client);

      // Dinleyici ekle
      client.on('messageCreate', async (message) => {
        const content = message.content || '';

        // 1. ÖNCE CAPTCHA KONTROLÜ (En öncelikli)
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

          // Durumu "Locked" olarak güncelle
          saveBotState(client.user.id, true, imageBase64);

          // Captcha mesajı geldiğinde başka işlem yapma
          return;

        } else if (content.includes('captcha completed, you can keep playing!') &&
          message.mentions.users.has(client.user.id)) {
          // Captcha çözüldü!
          console.log(`✅ CAPTCHA SOLVED for user ${client.user.username}`);
          saveBotState(client.user.id, false, null);
          return; // İşlem tamam
        }

        // 2. KİLİT KONTROLÜ (Bot kilitliyse işlem yapma)
        const botState = getBotState(client.user.id);
        if (botState && botState.active) {
          // console.log(`[Bot Locked] Skipping message ${message.id}`);
          return;
        }

        const adConfig = activeAutoDeleteConfigs.get(apiKey);

        // --- AUTO DELETE (Main Bot) ---
        if (adConfig && adConfig.enabled && adConfig.channelId === message.channel.id) {
          if (message.embeds.length > 0) {
            const shouldDelete = message.embeds.some(embed => {
              return embed.color && adConfig.colors.includes(embed.color);
            });

            if (shouldDelete) {
              try {
                const deletePromise = message.delete();
                // Timeout promise ekle (10sn)
                const timeoutPromise = new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Delete timeout after 10s')), 10000)
                );

                await Promise.race([deletePromise, timeoutPromise]);
                console.log(`[AutoDelete] ✓ ${message.id}`);
                return; // Don't process further
              } catch (e) {
                // Timeout hatasını loglama (sessizce geç)
                if (!e.message || !e.message.includes('timeout')) {
                  console.error(`[AutoDelete] ✗ ${message.id}: ${e.message}`);
                }
              }
            }
          }
        }
        // -------------------------

        // --- AUTO CLICK (Main Bot Only) ---
        // adConfig already declared above
        const autoState = automationStates.get(apiKey);
        const isClickEnabled = autoState && autoState.click !== false; // Default true if not set false

        if (isClickEnabled && adConfig && adConfig.enabled && adConfig.channelId === message.channel.id) {
          if (message.embeds.length > 0) {
            // Check if message should be deleted (skip clicking)
            const shouldDelete = message.embeds.some(embed => {
              return embed.color && adConfig.colors.includes(embed.color);
            });

            // Only click if NOT in delete list
            if (!shouldDelete && message.components && message.components.length > 0) {
              try {
                const firstRow = message.components[0];
                if (firstRow && firstRow.components && firstRow.components.length > 0) {
                  const firstButton = firstRow.components[0];

                  // Validate button properties
                  if (!firstButton.customId) {
                    console.log(`[AutoClick] ✗ Skipped ${message.id}: Button has no customId`);
                    return;
                  }

                  // Check if it's actually a button (type can be string 'BUTTON' or number 2)
                  if (firstButton.type !== 'BUTTON' && firstButton.type !== 2) {
                    // console.log(`[AutoClick] ✗ Skipped ${message.id}: Component is not a button`);
                    return;
                  }

                  // Check if button is disabled
                  if (firstButton.disabled) {
                    return;
                  }

                  // Log button details for debugging
                  console.log(`[AutoClick] Attempting to click button: ${firstButton.customId} on message ${message.id} `);

                  // Add delay before clicking (increased to 1 second for stability)
                  await new Promise(resolve => setTimeout(resolve, 1000));

                  await clickButtonSafe(client, message, firstButton);
                  console.log(`[AutoClick] ✓ Clicked ${message.id} `);
                }
              } catch (e) {
                console.error(`[AutoClick] ✗ Failed on ${message.id}: ${e.message} `);
              }
            }
          }
        }
        // -------------------------
      });

      resolve(client);
    });

    client.login(user.discordToken).catch(err => {
      console.error(`Token ile giriş yapılamadı.API Key: ${apiKey} `, err);
      activeClients.delete(apiKey); // Başarısız girişişte istemciyi temizle
      reject(new Error('Discord\'a giriş yapılamadı. Token geçersiz olabilir.'));
    });
  });
}

// ... existing stopClient, stopAutomation ...

// THIS PART RESTORES THE DAMAGED startAutoMessages FUNCTION
async function startAutoMessages(apiKey, client) {
  // Check if automation is strictly disabled (or messages specifically)
  const state = automationStates.get(apiKey);
  if (state && state.messages === false) {
    console.log(`[AutoMessages] Skipped start for ${apiKey} (Messages Paused)`);
    return;
  }

  // Önce eskileri temizle
  stopAutoMessages(apiKey);

  try {
    const settings = await getUserSettings(client.user.id);
    const commands = await getUserCommands(client.user.id);

    if (!settings.channelId) {
      return;
    }

    const intervals = [];

    commands.forEach(cmd => {
      const intervalMs = parseInt(cmd.interval);
      if (!isNaN(intervalMs) && intervalMs > 0) {
        const timer = setInterval(async () => {
          // --- AUTOMATION STATE CHECK ---
          const loopState = automationStates.get(apiKey);
          if (loopState && loopState.messages === false) {
            return;
          }

          // --- CAPTCHA CHECK ---
          const currentClient = activeClients.get(apiKey);
          if (!currentClient || !currentClient.user) return;

          const cap = getBotState(currentClient.user.id);
          if (cap && cap.active) {
            return;
          }
          // ---------------------

          try {
            const channel = await client.channels.fetch(settings.channelId);
            if (channel) {
              await channel.send(cmd.text);
              incrementCommandUsage(client.user.id, cmd.text);
            }
          } catch (err) {
            console.error(`Auto - message error(${cmd.trigger}): ${err.message} `);

            // Auto-Recovery for Zombie Token
            if (err.message.includes('token was unavailable')) {
              console.log(`♻️ Zombie token detected for ${apiKey}. Restarting client in 2s...`);
              stopClient(apiKey);
              setTimeout(async () => {
                try {
                  console.log(`♻️ Reconnecting ${apiKey}...`);
                  await getClient(apiKey, true);
                } catch (reErr) {
                  console.error(`♻️ Recovery failed: ${reErr.message}`);
                }
              }, 2000);
            }
          }
        }, intervalMs);

        intervals.push(timer);
      }
    });

    if (intervals.length > 0) {
      activeIntervals.set(apiKey, intervals);
    }

  } catch (error) {
    console.error(`Error starting auto - messages: ${error.message} `);
  }
}

function stopAutoMessages(apiKey) {
  if (activeIntervals.has(apiKey)) {
    activeIntervals.get(apiKey).forEach(clearInterval);
    activeIntervals.delete(apiKey);
    console.log(`Stopped auto - messages for ${apiKey}`);
  }
}
