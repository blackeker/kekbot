const { Client } = require('discord.js-selfbot-v13');
const { getUserByApiKey, getUserCommands, getUserSettings, saveBotState, getBotState, incrementCommandUsage } = require('./databaseService');

const activeClients = new Map();
// Anahtar: apiKey, Değer: Array<IntervalID>
const activeIntervals = new Map();
// Anahtar: apiKey, Değer: AutoDeleteConfig
const activeAutoDeleteConfigs = new Map();

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
 * Auto-delete configini gunceller (Runtime)
 */
function updateAutoDeleteConfig(apiKey, config) {
  if (activeClients.has(apiKey)) {
    activeAutoDeleteConfigs.set(apiKey, config);
    console.log(`Auto-click config updated for map key: ${apiKey}`);
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
    return activeClients.get(apiKey);
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
      console.log(`${client.user.username} olarak giriş yapıldı! API Key: ${apiKey}`);
      activeClients.set(apiKey, client);

      // Auto Click Ayarlarını Yükle
      try {
        const settings = await getUserSettings(client.user.id);
        if (settings.autoDeleteConfig) {
          activeAutoDeleteConfigs.set(apiKey, settings.autoDeleteConfig);
          console.log(`Auto-click config loaded for ${client.user.username}`);
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

        // --- AUTO DELETE & AUTO CLICK ---
        const adConfig = activeAutoDeleteConfigs.get(apiKey);
        if (adConfig && adConfig.enabled && adConfig.channelId === message.channel.id) {
          console.log(`[AutoAction] Message received in monitored channel ${message.channel.id}`);
          console.log(`[AutoAction] Message has ${message.embeds.length} embeds, ${message.components?.length || 0} component rows`);

          if (message.embeds.length > 0) {
            message.embeds.forEach((embed, idx) => {
              console.log(`[AutoAction] Embed ${idx}: color=${embed.color}, title=${embed.title}`);
            });

            // Check if any embed matches the delete colors
            const shouldDelete = message.embeds.some(embed => {
              const matches = embed.color && adConfig.colors.includes(embed.color);
              if (matches) {
                console.log(`[AutoDelete] ✓ Color match found: ${embed.color}`);
              }
              return matches;
            });

            if (shouldDelete) {
              // DELETE: Color matches - delete the message
              try {
                console.log(`[AutoDelete] Attempting to delete message ${message.id}...`);
                await message.delete();
                console.log(`[AutoDelete] ✓ Successfully deleted message ${message.id}`);
                return; // Mesaj silindi, diğer işlemlere gerek yok
              } catch (e) {
                console.error(`[AutoDelete] ✗ Failed to delete message ${message.id}: ${e.message}`);
                console.error(`[AutoDelete] Error code: ${e.code}, Status: ${e.httpStatus}`);
              }
            } else {
              // CLICK: Color doesn't match - click the button
              console.log(`[AutoClick] No color match - will attempt to click button`);

              if (message.components && message.components.length > 0) {
                try {
                  console.log(`[AutoClick] Message has ${message.components.length} component rows`);

                  // Find the first button in the first row
                  const firstRow = message.components[0];
                  if (firstRow && firstRow.components && firstRow.components.length > 0) {
                    const firstButton = firstRow.components[0];
                    console.log(`[AutoClick] Found button: ${firstButton.label || firstButton.customId || 'Unknown'}`);

                    // Click the button using the message's clickButton method
                    await message.clickButton(firstButton.customId);
                    console.log(`[AutoClick] ✓ Successfully clicked button on message ${message.id}`);
                  } else {
                    console.log(`[AutoClick] No buttons found in first row`);
                  }
                } catch (e) {
                  console.error(`[AutoClick] ✗ Failed to click button: ${e.message}`);
                  console.error(`[AutoClick] Error details:`, e);
                }
              } else {
                console.log(`[AutoClick] Message has no components/buttons`);
              }
            }
          }
        }
        // -------------------------

        if (content.includes('STOP USING THIS COMMAND OR YOU WILL GET BLACKLISTED') &&
          content.includes('complete the captcha using')) {

          console.log(`⚠️ CAPTCHA DETECTED for user ${client.user.username}`);

          let imageBase64 = null;
          // Ekli resim var mı?
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

          // Durumu veritabanına kaydet
          saveBotState(client.user.id, true, imageBase64);
        } else if (content.includes('captcha completed, you can keep playing!') &&
          message.mentions.users.has(client.user.id)) {
          // Captcha çözüldü!
          console.log(`✅ CAPTCHA SOLVED for user ${client.user.username}`);
          saveBotState(client.user.id, false, null);
        } else if (content.startsWith('+captcha') && message.author.id === client.user.id) {
        }
      });

      resolve(client);
    });

    client.login(user.discordToken).catch(err => {
      console.error(`Token ile giriş yapılamadı. API Key: ${apiKey}`, err);
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
    console.log(`İstemci durduruldu ve listeden kaldırıldı: ${apiKey}`);
  }
}

module.exports = {
  getClient,
  stopClient,
  updateAutoDeleteConfig,
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
    console.error(`Restore presence error: ${e.message}`);
  }
}

/**
 * Discord Client için aktiviteyi ayarlar.
 * @param {Client} client 
 * @param {object} rpcSettings 
 */
async function setClientPresence(client, rpcSettings) {
  // rpcSettings: { type, name, details, state, largeImageKey, largeImageText, ... }
  // Discord.js-selfbot-v13 setActivity formatı:
  // client.user.setActivity(name, { type, details, state, assets: { ... } })

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
  console.log(`Presence updated for ${client.user.username}: ${rpcSettings.type} ${rpcSettings.name}`);
}

/**
 * Kullanıcı için otomatik mesaj zamanlayıcılarını başlatır.
 * @param {string} apiKey 
 * @param {Client} client 
 */
async function startAutoMessages(apiKey, client) {
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
          // Captcha Kontrolü (DB'den)
          const cap = getBotState(client.user.id);
          if (cap && cap.active) {
            return;
          }

          try {
            const channel = await client.channels.fetch(settings.channelId);
            if (channel) {
              await channel.send(cmd.text);
              incrementCommandUsage(client.user.id, cmd.text);
            }
          } catch (err) {
            console.error(`Auto-message error (${cmd.trigger}): ${err.message}`);
          }
        }, intervalMs);

        intervals.push(timer);
      }
    });

    if (intervals.length > 0) {
      activeIntervals.set(apiKey, intervals);
    }

  } catch (error) {
    console.error(`Error starting auto-messages: ${error.message}`);
  }
}

function stopAutoMessages(apiKey) {
  if (activeIntervals.has(apiKey)) {
    activeIntervals.get(apiKey).forEach(clearInterval);
    activeIntervals.delete(apiKey);
    console.log(`Stopped auto-messages for ${apiKey}`);
  }
}
