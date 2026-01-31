const { Client, SnowflakeUtil } = require('discord.js-selfbot-v13');
const { getUserByApiKey, getUserCommands, getUserSettings, saveBotStatus, saveBotState, getBotState, incrementCommandUsage } = require('./databaseService');

const activeClients = new Map();
// Anahtar: apiKey, Değer: Array<IntervalID>
const activeIntervals = new Map();
// Anahtar: apiKey, Değer: AutoDeleteConfig
const activeAutoDeleteConfigs = new Map();
// Anahtar: apiKey, Değer: Boolean (Automation Enabled)
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


/**
 * Safe button click implementation that awaits the API request
 * to prevent unhandled promise rejections on API errors (e.g. 400 Bad Request)
 */
async function clickButtonSafe(client, message, button) {
  const nonce = SnowflakeUtil.generate();
  const data = {
    type: 3, // MESSAGE_COMPONENT
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

/**
 * Auto-delete configini gunceller (Runtime)
 */
function updateAutoDeleteConfig(apiKey, config) {
  if (activeClients.has(apiKey)) {
    activeAutoDeleteConfigs.set(apiKey, config);
    console.log(`Auto - click config updated for map key: ${apiKey} `);
  }
}

/**
 * Verilen API anahtarı için bir Discord istemcisi döndürür.
 * İstemci zaten aktifse, mevcut olanı döndürür.
 * Değilse, yeni bir tane oluşturur, giriş yapar ve saklar.
 * @param {string} apiKey Kullanıcının API anahtarı.
 * @param {boolean} createIfMissing İstemci yoksa oluşturulsun mu? (Varsayılan: true)
 * @returns {Promise<Client|null>} Kullanıcıya ait Discord istemci nesnesi veya null.
 */
async function getClient(apiKey, createIfMissing = true) {
  // 1. İstemci zaten aktif mi diye kontrol et
  if (activeClients.has(apiKey)) {
    // Re-enable automation if it was paused
    automationStates.set(apiKey, true);
    // Ensure auto messages are running
    const client = activeClients.get(apiKey);
    await startAutoMessages(apiKey, client);
    return client;
  }

  if (!createIfMissing) {
    return null;
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
        const isAutomationEnabled = automationStates.get(apiKey);
        if (isAutomationEnabled && adConfig && adConfig.enabled && adConfig.channelId === message.channel.id) {
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

/**
 * Bir istemciyi durdurur ve aktif listeden kaldırır.
 * (Örn: Kullanıcı hesabını sildiğinde kullanılabilir)
 * @param {string} apiKey Durdurulacak istemcinin API anahtarı.
 */
function stopClient(apiKey) {
  if (activeClients.has(apiKey)) {
    const client = activeClients.get(apiKey);
    client.destroy();
    activeClients.delete(apiKey);
    activeAutoDeleteConfigs.delete(apiKey);
    stopAutoMessages(apiKey);
    console.log(`İstemci durduruldu ve listeden kaldırıldı: ${apiKey} `);
  }
}

/**
 * Otomasyonu (Click & Messages) durdurur ama Client'ı açık tutar (Auto-Delete için).
 */
function stopAutomation(apiKey) {
  automationStates.set(apiKey, false);
  stopAutoMessages(apiKey);
  console.log(`Bot otomasyonu durduruldu (Auto-Delete aktif devam ediyor): ${apiKey}`);
}

module.exports = {
  getClient,
  stopClient,
  stopAutomation,
  updateAutoDeleteConfig,
  getAutomationState: (apiKey) => {
    return automationStates.get(apiKey) === true;
  },
  getCaptchaState: (apiKey) => {
    // API Key'den User ID bulup DB'den çekmemiz lazım, ama client aktifse user.id var
    // Client aktif değilse bile DB'den okuyabilmek için apiKey -> userId dönüşümü gerek
    const client = activeClients.get(apiKey);
    if (client) {
      return getBotState(client.user.id);
    }
    return { active: false, imageBase64: null }; // Client yoksa varsayılan dön
  },
  restartAutoMessages: async (apiKey) => {
    const client = activeClients.get(apiKey);
    if (client) {
      await startAutoMessages(apiKey, client);
    }
  },
  updatePresence: async (apiKey, rpcSettings) => {
    const client = activeClients.get(apiKey);
    if (!client) return; // Client yoksa işlem yapma (veya hata fırlatılabilir)

    await setClientPresence(client, rpcSettings);
  }
};

/**
 * Veritabanından RPC ayarlarını okuyup uygular.
 */
async function restorePresence(apiKey, client) {
  try {
    const settings = await getUserSettings(client.user.id);
    if (settings.rpcEnabled && settings.rpcSettings) {
      console.log(`Restoring RPC for ${client.user.username}`);
      await setClientPresence(client, settings.rpcSettings);
    }
  } catch (e) {
    console.error(`Restore presence error: ${e.message} `);
  }
}

/**
 * Discord Client için aktiviteyi ayarlar.
 * @param {Client} client 
 * @param {object} rpcSettings 
 */
async function setClientPresence(client, rpcSettings) {
  if (!rpcSettings || !rpcSettings.name) {
    // Ayarlar boşsa veya isim yoksa temizle
    client.user.setActivity(null);
    return;
  }

  const activityOptions = {
    type: rpcSettings.type || 'PLAYING', // PLAYING, STREAMING, LISTENING, WATCHING, COMPETING
  };

  if (rpcSettings.url && rpcSettings.type === 'STREAMING') {
    activityOptions.url = rpcSettings.url;
  }

  // Rich Presence detayları (Bazı client'lar destekler)
  // Selfbot'ta bazen sadece type ve name çalışır, ama deneyelim.
  // Selfbot v13'te RichPresence genellikle "RichPresence" class'ı ile veya setActivity options ile yapılır.

  if (rpcSettings.details) activityOptions.details = rpcSettings.details;
  if (rpcSettings.state) activityOptions.state = rpcSettings.state;

  if (rpcSettings.largeImageKey || rpcSettings.smallImageKey) {
    activityOptions.assets = {};
    if (rpcSettings.largeImageKey) {
      activityOptions.assets.large_image = rpcSettings.largeImageKey; // url veya key
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
  console.log(`Presence updated for ${client.user.username}: ${rpcSettings.type} ${rpcSettings.name} `);
}

/**
 * Kullanıcı için otomatik mesaj zamanlayıcılarını başlatır.
 * @param {string} apiKey 
 * @param {Client} client 
 */
async function startAutoMessages(apiKey, client) {
  // Check if automation is strictly disabled
  if (automationStates.get(apiKey) === false) {
    console.log(`[AutoMessages] Skipped start for ${apiKey} (Automation Paused)`);
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
          if (automationStates.get(apiKey) === false) {
            return;
          }

          const currentClient = activeClients.get(apiKey);
          if (!currentClient || !currentClient.user) return;

          const cap = getBotState(currentClient.user.id);
          if (cap && cap.active) {
            // console.log(`[Auto] Paused due to Captcha: ${cmd.trigger}`);
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

              // Stop everything first
              stopClient(apiKey);

              // Restart after short delay
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
