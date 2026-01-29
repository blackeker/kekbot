const Database = require('better-sqlite3');
const { encrypt, decrypt } = require('./encryptionService');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// SQLite veritabanı dosyasının yolu
const dbPath = path.resolve(__dirname, '../../data/users.db');

let db;

/**
 * SQLite veritabanını başlatır ve tabloları oluşturur.
 */
function initializeDatabase() {
    try {
        db = new Database(dbPath);
        console.log('✅ SQLite veritabanı başlatıldı:', dbPath);

        // Users tablosu oluştur
        db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        discord_user_id TEXT PRIMARY KEY,
        api_key TEXT UNIQUE NOT NULL,
        encrypted_token TEXT NOT NULL,
        username TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);

        // Commands tablosu oluştur
        db.exec(`
      CREATE TABLE IF NOT EXISTS commands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        command_data TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(discord_user_id) ON DELETE CASCADE
      )
    `);

        // Settings tablosu oluştur
        db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        user_id TEXT PRIMARY KEY,
        channel_id TEXT,
        theme TEXT DEFAULT 'dark',
        rpc_enabled INTEGER DEFAULT 0,
        rpc_settings TEXT DEFAULT '{}',
        FOREIGN KEY (user_id) REFERENCES users(discord_user_id) ON DELETE CASCADE
      )
    `);

        // Bot States (Captcha) tablosu oluştur
        db.exec(`
      CREATE TABLE IF NOT EXISTS bot_states (
        user_id TEXT PRIMARY KEY,
        is_locked INTEGER DEFAULT 0,
        captcha_image TEXT,
        updated_at INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(discord_user_id) ON DELETE CASCADE
      )
    `);

        // İndeksler oluştur
        db.exec(`
      CREATE INDEX IF NOT EXISTS idx_api_key ON users(api_key);
      CREATE INDEX IF NOT EXISTS idx_commands_user_id ON commands(user_id);
    `);

        // Command Stats Tablosu
        db.exec(`
      CREATE TABLE IF NOT EXISTS command_stats (
        user_id TEXT NOT NULL,
        command_text TEXT NOT NULL,
        count INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, command_text)
      )
    `);

        // Spam Bots Tablosu
        db.exec(`
      CREATE TABLE IF NOT EXISTS spam_bots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL,
        config TEXT, 
        is_active INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(discord_user_id) ON DELETE CASCADE
      )
    `);

        console.log('✅ Veritabanı tabloları hazır.');
    } catch (error) {
        console.error('❌ Veritabanı başlatılamadı:', error.message);
        throw error;
    }
}

/**
 * Komut kullanım sayısını artırır.
 */
function incrementCommandUsage(userId, commandText) {
    if (!db) return;
    try {
        const stmt = db.prepare(`
            INSERT INTO command_stats (user_id, command_text, count)
            VALUES (?, ?, 1)
            ON CONFLICT(user_id, command_text) DO UPDATE SET count = count + 1
        `);
        stmt.run(userId, commandText);
    } catch (e) {
        console.error('Stats increment error:', e.message);
    }
}

/**
 * Komut istatistiklerini getirir.
 */
function getCommandStats(userId) {
    if (!db) return [];
    return db.prepare('SELECT command_text, count FROM command_stats WHERE user_id = ? ORDER BY count DESC').all(userId);
}

/**
 * Yeni bir kullanıcıyı Discord token'ı ile kaydeder.
 * @param {string} discordToken Kullanıcının Discord token'ı.
 * @returns {Promise<object>} Oluşturulan kullanıcı nesnesi ({ userId, apiKey }).
 */
async function registerUser(discordToken) {
    if (!db) throw new Error('Veritabanı hizmeti kullanıma hazır değil.');

    const { Client } = require('discord.js-selfbot-v13');
    const tempClient = new Client({ checkUpdate: false });

    try {
        await tempClient.login(discordToken);

        const discordUserId = tempClient.user.id;
        const username = tempClient.user.username;

        tempClient.destroy();

        // Kullanıcı zaten kayıtlı mı kontrol et
        const existingUser = db.prepare('SELECT discord_user_id FROM users WHERE discord_user_id = ?').get(discordUserId);
        if (existingUser) {
            throw new Error('Bu Discord hesabı zaten kayıtlı. Mevcut API anahtarınızı kullanın.');
        }

        const apiKey = uuidv4();
        const encryptedToken = encrypt(discordToken);
        const createdAt = Date.now();

        // Kullanıcıyı kaydet
        db.prepare(`
      INSERT INTO users (discord_user_id, api_key, encrypted_token, username, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(discordUserId, apiKey, encryptedToken, username, createdAt);

        // Varsayılan ayarları oluştur
        db.prepare(`
      INSERT INTO settings (user_id) VALUES (?)
    `).run(discordUserId);

        console.log(`✅ Yeni kullanıcı kaydedildi: ${username} (${discordUserId})`);
        return { userId: discordUserId, apiKey };

    } catch (error) {
        if (error.message.includes('zaten kayıtlı')) {
            throw error;
        }
        throw new Error(`Discord token geçersiz veya giriş yapılamadı: ${error.message}`);
    }
}

/**
 * API anahtarına göre kullanıcıyı bulur ve token'ını deşifre eder.
 * @param {string} apiKey Kullanıcının API anahtarı.
 * @returns {Promise<object|null>} Kullanıcı nesnesi ({ userId, discordToken }) veya bulunamazsa null.
 */
async function getUserByApiKey(apiKey) {
    if (!db) throw new Error('Veritabanı hizmeti kullanıma hazır değil.');

    const user = db.prepare('SELECT discord_user_id, username, encrypted_token FROM users WHERE api_key = ?').get(apiKey);

    if (!user) {
        console.log('Bu API anahtarı ile eşleşen kullanıcı bulunamadı.');
        return null;
    }

    const discordToken = decrypt(user.encrypted_token);

    return {
        userId: user.discord_user_id,
        username: user.username,
        discordToken: discordToken,
    };
}

/**
 * Kullanıcının komut listesini veritabanından alır.
 * @param {string} userId Kullanıcının ID'si.
 * @returns {Promise<Array<object>>} Kullanıcının komut listesi veya boş bir dizi.
 */
async function getUserCommands(userId) {
    if (!db) throw new Error('Veritabanı hizmeti kullanıma hazır değil.');

    const commands = db.prepare('SELECT command_data FROM commands WHERE user_id = ? ORDER BY id').all(userId);

    return commands.map(row => JSON.parse(row.command_data));
}

/**
 * Kullanıcının komut listesini veritabanına kaydeder (mevcutu tamamen değiştirir).
 * @param {string} userId Kullanıcının ID'si.
 * @param {Array<object>} commands Kaydedilecek komut listesi.
 * @returns {Promise<void>}
 */
async function saveUserCommands(userId, commands) {
    if (!db) throw new Error('Veritabanı hizmeti kullanıma hazır değil.');

    // Transaction ile tüm komutları sil ve yeniden ekle
    const deleteStmt = db.prepare('DELETE FROM commands WHERE user_id = ?');
    const insertStmt = db.prepare('INSERT INTO commands (user_id, command_data) VALUES (?, ?)');

    const transaction = db.transaction((userId, commands) => {
        deleteStmt.run(userId);
        for (const command of commands) {
            insertStmt.run(userId, JSON.stringify(command));
        }
    });

    transaction(userId, commands);
}

/**
 * Kullanıcının komut listesine yeni bir komut ekler.
 * @param {string} userId Kullanıcının ID'si.
 * @param {object} command Eklenecek komut objesi.
 * @returns {Promise<Array<object>>} Güncellenmiş komut listesi.
 */
async function addUserCommand(userId, command) {
    const currentCommands = await getUserCommands(userId);
    currentCommands.push(command);
    await saveUserCommands(userId, currentCommands);
    return currentCommands;
}

/**
 * Kullanıcının komut listesindeki belirli bir indeksteki komutu günceller.
 * @param {string} userId Kullanıcının ID'si.
 * @param {number} index Güncellenecek komutun indeksi.
 * @param {object} newCommand Yeni komut objesi.
 * @returns {Promise<Array<object>>} Güncellenmiş komut listesi.
 */
async function updateUserCommand(userId, index, newCommand) {
    const currentCommands = await getUserCommands(userId);
    if (index < 0 || index >= currentCommands.length) {
        throw new Error('Geçersiz komut indeksi.');
    }
    currentCommands[index] = newCommand;
    await saveUserCommands(userId, currentCommands);
    return currentCommands;
}

/**
 * Kullanıcının komut listesindeki belirli bir indeksteki komutu kısmen günceller.
 * @param {string} userId Kullanıcının ID'si.
 * @param {number} index Güncellenecek komutun indeksi.
 * @param {object} updates Güncellemeleri içeren obje.
 * @returns {Promise<Array<object>>} Güncellenmiş komut listesi.
 */
async function patchUserCommand(userId, index, updates) {
    const currentCommands = await getUserCommands(userId);
    if (index < 0 || index >= currentCommands.length) {
        throw new Error('Geçersiz komut indeksi.');
    }
    currentCommands[index] = { ...currentCommands[index], ...updates };
    await saveUserCommands(userId, currentCommands);
    return currentCommands;
}

/**
 * Kullanıcının komut listesinden belirli bir indeksteki komutu siler.
 * @param {string} userId Kullanıcının ID'si.
 * @param {number} index Silinecek komutun indeksi.
 * @returns {Promise<Array<object>>} Güncellenmiş komut listesi.
 */
async function deleteUserCommand(userId, index) {
    const currentCommands = await getUserCommands(userId);
    if (index < 0 || index >= currentCommands.length) {
        throw new Error('Geçersiz komut indeksi.');
    }
    currentCommands.splice(index, 1);
    await saveUserCommands(userId, currentCommands);
    return currentCommands;
}

/**
 * Kullanıcının ayarlarını veritabanından alır.
 * @param {string} userId Kullanıcının ID'si.
 * @returns {Promise<object>} Kullanıcının ayarları veya varsayılan ayarlar.
 */
async function getUserSettings(userId) {
    if (!db) throw new Error('Veritabanı hizmeti kullanıma hazır değil.');

    const settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(userId);

    if (!settings) {
        return {
            channelId: null,
            theme: 'dark',
            gemSystemEnabled: false,
            gems: [],
            rpcEnabled: false,
            rpcSettings: {}
        };
    }

    return {
        channelId: settings.channel_id,
        theme: settings.theme,
        rpcEnabled: Boolean(settings.rpc_enabled),
        rpcSettings: JSON.parse(settings.rpc_settings || '{}')
    };
}

/**
 * Kullanıcının ayarlarını veritabanına kaydeder.
 * @param {string} userId Kullanıcının ID'si.
 * @param {object} settings Kaydedilecek ayarlar.
 * @returns {Promise<void>}
 */
async function saveUserSettings(userId, settings) {
    if (!db) throw new Error('Veritabanı hizmeti kullanıma hazır değil.');

    const updates = [];
    const values = [];

    if (settings.channelId !== undefined) {
        updates.push('channel_id = ?');
        values.push(settings.channelId);
    }
    if (settings.theme !== undefined) {
        updates.push('theme = ?');
        values.push(settings.theme);
    }
    if (settings.rpcEnabled !== undefined) {
        updates.push('rpc_enabled = ?');
        values.push(settings.rpcEnabled ? 1 : 0);
    }
    if (settings.rpcSettings !== undefined) {
        updates.push('rpc_settings = ?');
        values.push(JSON.stringify(settings.rpcSettings));
    }

    if (updates.length > 0) {
        values.push(userId);
        const query = `UPDATE settings SET ${updates.join(', ')} WHERE user_id = ?`;
        db.prepare(query).run(...values);
    }
}

/**
 * Botun mevcut durumunu (captcha/kilit) kaydeder.
 * @param {string} userId Okunacak kullanıcı ID.
 * @param {boolean} isLocked Kilitli mi?
 * @param {string|null} imageBase64 Captcha resmi (varsa).
 */
function saveBotState(userId, isLocked, imageBase64) {
    if (!db) throw new Error('Veritabanı hizmeti kullanıma hazır değil.');

    // Upsert mantığı (Varsa güncelle, yoksa ekle)
    const stmt = db.prepare(`
        INSERT INTO bot_states (user_id, is_locked, captcha_image, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            is_locked = excluded.is_locked,
            captcha_image = excluded.captcha_image,
            updated_at = excluded.updated_at
    `);

    stmt.run(userId, isLocked ? 1 : 0, imageBase64, Date.now());
}

/**
 * Botun son kaydedilen durumunu getirir.
 * @param {string} userId 
 * @returns {object} { active: boolean, imageBase64: string|null }
 */
function getBotState(userId) {
    if (!db) throw new Error('Veritabanı hizmeti kullanıma hazır değil.');

    const row = db.prepare('SELECT is_locked, captcha_image FROM bot_states WHERE user_id = ?').get(userId);

    if (row) {
        return {
            active: Boolean(row.is_locked),
            imageBase64: row.captcha_image || null
        };
    }

    return { active: false, imageBase64: null };
}

/**
 * Veritabanını kapatır (uygulama kapatılırken).
 */
function closeDatabase() {
    if (db) {
        db.close();
        console.log('✅ Veritabanı bağlantısı kapatıldı.');
    }
}

// Veritabanını başlat
initializeDatabase();

/**
 * Spam botlarını listeler.
 */
function getSpamBots(userId) {
    if (!db) return [];
    return db.prepare('SELECT * FROM spam_bots WHERE user_id = ?').all(userId);
}

/**
 * Yeni spam bot ekler.
 */
function addSpamBot(userId, token) {
    if (!db) return;
    const stmt = db.prepare('INSERT INTO spam_bots (user_id, token, config) VALUES (?, ?, ?)');
    // Varsayılan config
    const defaultConfig = {
        channels: [],
        minDelay: 8000,
        maxDelay: 9000,
        randomMessages: true
    };
    stmt.run(userId, token, JSON.stringify(defaultConfig));
}

/**
 * Spam bot siler.
 */
function deleteSpamBot(userId, botId) {
    if (!db) return;
    db.prepare('DELETE FROM spam_bots WHERE id = ? AND user_id = ?').run(botId, userId);
}

/**
 * Spam bot durumunu günceller.
 */
function updateSpamBotStatus(userId, botId, isActive) {
    if (!db) return;
    db.prepare('UPDATE spam_bots SET is_active = ? WHERE id = ? AND user_id = ?').run(isActive ? 1 : 0, botId, userId);
}

/**
 * Spam bot config günceller.
 */
function updateSpamBotConfig(userId, botId, config) {
    if (!db) return;
    db.prepare('UPDATE spam_bots SET config = ? WHERE id = ? AND user_id = ?').run(JSON.stringify(config), botId, userId);
}

module.exports = {
    initializeDatabase,
    registerUser,
    getUserByApiKey,
    getUserCommands,
    saveUserCommands,
    addUserCommand,
    updateUserCommand,
    patchUserCommand,
    deleteUserCommand,
    getUserSettings,
    saveUserSettings,
    saveBotState,
    getBotState,
    closeDatabase,
    incrementCommandUsage,
    getCommandStats,
    getSpamBots,
    addSpamBot,
    deleteSpamBot,
    updateSpamBotStatus,
    updateSpamBotConfig
};
