const path = require('path');
const fs = require('fs');
const https = require('https');

// --- Yardımcı Fonksiyonlar ---
function log(message) {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    console.log(`[${timestamp}] ${message}`);
}

function safeLogToken(token) {
    return token ? `...${token.slice(-6)}` : 'N/A';
}

function deepMerge(target, source) {
    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key]) && typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key])) {
                target[key] = deepMerge(target[key] || {}, source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }
    return target;
}

function createDiscordClient(checkUpdate = false) {
    const { Client } = require('discord.js-selfbot-v13');
    return new Client({
        checkUpdate: checkUpdate,
        readyStatus: false
    });
}
process.on('uncaughtException', (err, origin) => {
    log(`🛑 YAKALANAMAYAN HATA: ${err.stack || err}`);
    log(`   Kaynak: ${origin}`);
});

process.on('unhandledRejection', (reason, promise) => {
    let reasonStr = reason;
    if (reason instanceof Error) {
        reasonStr = reason.stack || reason.message;
    }
    log(`🛑 YAKALANAMAYAN PROMISE REDDİ: ${reasonStr}`);
});



// --- Ortama bağlı kurulum ---
let app, BrowserWindow, ipcMain, dialog, Notification, Tray, Menu, shell;
let tray = null;
let mainWindow = null;
let userDataPath;

const isElectron = process.env.ELECTRON_RUN_AS_NODE !== 'true';

if (isElectron) {
    ({ app, BrowserWindow, ipcMain, dialog, Notification, Tray, Menu, shell } = require('electron'));
    userDataPath = app.getPath('userData');
}

const APP_DATA_FILE = path.join(userDataPath, 'app_data.json');

// --- Bot Durumu ve Ayarları ---
let botState = {
    token: '',
    channelId: '',
    minDelay: 8000,
    maxDelay: 9000,
    commands: [{ text: '+c', minDelay: 8000, maxDelay: 9000 }],
    theme: 'default',
    gemSystemEnabled: false,
    gems: [],
    isRunning: false,
    isSendingCommands: false,
    client: null,
    intervals: [],
    channel: null,
    rpcEnabled: false, 
    rpcSettings: {  
        applicationId: '',
        name: '',
        details: '',
        state: '',
        largeImageKey: '',
        largeImageText: '',
        smallImageKey: '',
        smallImageText: '',
        buttons: []
    },
    useMainRpcForSideBots: false
};

let randomBotsState = {
    configs: [],
    intervals: {},
    clients: {}
};

let RANDOM_MESSAGES = [];

let appData = {
    settings: {},
    stats: {},
    potatoLog: {},
    tokenData: [],
    randomBots: [],
    randomMessages: [],
    tokens: []
};

// --- Veri Yönetimi Fonksiyonları ---
function syncStateToAppData() {
    appData.settings = {
        token: botState.token,
        channelId: botState.channelId,
        minDelay: botState.minDelay,
        maxDelay: botState.maxDelay,
        commands: botState.commands,
        theme: botState.theme,
        gemSystemEnabled: botState.gemSystemEnabled,
        gems: botState.gems,
        useMainRpcForSideBots: botState.useMainRpcForSideBots,
        rpcEnabled: botState.rpcEnabled,
        rpcSettings: botState.rpcSettings
    };
    // stats removed
    appData.randomBots = randomBotsState.configs;
    appData.randomMessages = RANDOM_MESSAGES;
}

function loadData() {
    if (fs.existsSync(APP_DATA_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(APP_DATA_FILE, 'utf8'));
            // Deep merge loaded data into appData, preserving existing structure and defaults
            appData = deepMerge(appData, data);
            
            // Sync to states using deepMerge for botState as well
            if (appData.settings) {
                botState = deepMerge(botState, appData.settings);
            }
            // stats removed; ignore appData.stats if present
            if (appData.randomMessages) {
                RANDOM_MESSAGES = appData.randomMessages;
            }
            if (appData.randomBots) {
                loadRandomBots();
            }
            log('✅ Veri dosyası yüklendi.');
        } catch (e) {
            log(`❌ Veri dosyası yüklenirken hata: ${e.message}`);
        }
    } else {
        log('ℹ️ Veri dosyası bulunamadı, yeni bir tane oluşturulacak.');
    }
}

function saveData() {
    try {
        syncStateToAppData();
        fs.writeFileSync(APP_DATA_FILE, JSON.stringify(appData, null, 2));
        // Log a masked summary
        const s = appData.settings || {};
        const summary = {
            token: safeLogToken(s.token),
            channelId: s.channelId || null,
            commands: Array.isArray(s.commands) ? s.commands.length : 0,
            gemSystemEnabled: !!s.gemSystemEnabled
        };
        log(`💾 Veri dosyası kaydedildi. Özet: ${JSON.stringify(summary)}`);
    } catch (e) {
        log(`❌ Veri dosyası kaydedilemedi: ${e.message}`);
    }
}

function loadRandomBots() {
    const migratedData = appData.randomBots.map(config => {
        if (config.channelId && !config.channels) {
            return {
                token: config.token,
                isPausedForCaptcha: config.isPausedForCaptcha || false,
                channels: [{
                    channelId: config.channelId,
                    commands: config.commands || [],
                    commandSource: config.commandSource || 'onlyRandom'
                }]
            };
        }
        return {
            ...config,
            isRunning: false,
            channels: config.channels || []
        };
    });

    randomBotsState.configs = migratedData;
}
// --- Bildirim Fonksiyonu ---
function showNotification(title, body) {
    if (isElectron && Notification.isSupported()) {
        const notification = new Notification({
            title,
            body,
            icon: path.join(__dirname, 'icon.ico')
        });
        notification.show();

        notification.on('click', () => {
            if (mainWindow) {
                mainWindow.show();
                mainWindow.focus();
                // Send an IPC message to the renderer to navigate to the captcha section
                if (!mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('focus-on-captcha');
                }
            }
        });
    } else {
        log(`[BİLDİRİM] ${title}: ${body}`);
    }
}

// --- Yedekleme Sistemi ---
function createBackup() {
    try {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-') ;
        const backupDir = path.join(userDataPath, 'backups');
        
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
        const backupData = {
            ...appData,
            timestamp: new Date().toISOString()
        };
        
        fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
        
        // 7 günden eski yedekleri temizle
        const files = fs.readdirSync(backupDir);
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        files.forEach(file => {
            const filePath = path.join(backupDir, file);
            const stats = fs.statSync(filePath);
            if (stats.mtime.getTime() < weekAgo) {
                fs.unlinkSync(filePath);
                log(`🗑️ Eski yedek silindi: ${file}`);
            }
        });
        
        log(`💾 Otomatik yedekleme oluşturuldu: ${timestamp}`);
        return true;
    } catch (e) {
        log(`❌ Yedekleme hatası: ${e.message}`);
        return false;
    }
}

async function restoreBackup(backupFilePath) {
    try {
        if (!fs.existsSync(backupFilePath)) {
            log(`❌ Yedek dosyası bulunamadı: ${backupFilePath}`);
            return false;
        }

        const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
        appData = { ...appData, ...backupData };
        
        saveData();
        loadData();
        
        log(`✅ Yedekleme başarıyla geri yüklendi: ${backupFilePath}`);
        return true;
    } catch (e) {
        log(`❌ Yedek geri yükleme hatası: ${e.message}`);
        return false;
    }
}

// Her 30 dakikada bir yedekleme
setInterval(createBackup, 30 * 60 * 1000);

// --- Random Message Generator ---
function generateRandomMessage() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const nums = '0123456789';
    let randomChars = '';
    for (let i = 0; i < 50; i++) {
        randomChars += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    let randomNums = '';
    for (let i = 0; i < 30; i++) {
        randomNums += nums.charAt(Math.floor(Math.random() * nums.length));
    }
    return (randomChars + randomNums).split('').sort(() => 0.5 - Math.random()).join('');
}

// --- Random Bot Komut Yönetimi ---
function stopRandomBotCommands(botToken) {
    if (randomBotsState.intervals[botToken]) {
        randomBotsState.intervals[botToken].forEach(clearInterval);
        randomBotsState.intervals[botToken] = [];
    }
    const botConfig = randomBotsState.configs.find(c => c.token === botToken);
    if (botConfig) {
        botConfig.isPausedForCaptcha = true;
        log(`🤖 [${safeLogToken(botToken)}] Komut gönderimi duraklatıldı.`);
        if (isElectron && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('random-bots-status', randomBotsState.configs);
        }
    }
}

function startRandomBotCommands(botToken) {
    const botConfig = randomBotsState.configs.find(c => c.token === botToken);
    const client = randomBotsState.clients[botToken];

    if (!botConfig || !client) {
        log(`🤖 [${safeLogToken(botToken)}] Komut gönderimi başlatılamadı. Sebep: Bot veya Client bulunamadı.`);
        return;
    }
    if (!botConfig.isRunning) {
        log(`🤖 [${safeLogToken(botToken)}] Komut gönderimi başlatılamadı. Sebep: Bot 'isRunning' olarak işaretlenmemiş.`);
        return;
    }

    stopRandomBotCommands(botToken);

    if (!botConfig.channels || botConfig.channels.length === 0) {
        log(`🤖 [${safeLogToken(botToken)}] için yapılandırılmış kanal bulunamadı.`);
        return;
    }

    log(`🤖 [${safeLogToken(botToken)}] ${botConfig.channels.length} kanalda komut gönderimi hazırlanıyor...`);
    randomBotsState.intervals[botToken] = [];

    const sendMessagesInterval = setInterval(async () => {
        if (!randomBotsState.clients[botToken]) {
            clearInterval(sendMessagesInterval);
            return;
        }

        for (const channelConfig of botConfig.channels) {
            const { channelId, commands, commandSource } = channelConfig;
            if (!channelId) continue;

            let messageToSend = '';
            if (commandSource === 'onlyRandom') {
                messageToSend = generateRandomMessage();
            } else if (commandSource === 'mainBotCommands') {
                if (botState.commands && botState.commands.length > 0) {
                    const randomCmd = botState.commands[Math.floor(Math.random() * botState.commands.length)];
                    messageToSend = randomCmd.text;
                } else {
                    log(`⚠️ 🤖 [${client.user?.tag || 'UNKNOWN'}] -> #${channelId.slice(-4)} Ana bot komutları bulunamadı.`);
                    continue;
                }
            } else if (commandSource === 'ownCommands') {
                if (commands && commands.length > 0) {
                    const randomCmd = commands[Math.floor(Math.random() * commands.length)];
                    messageToSend = randomCmd.text;
                } else {
                    log(`⚠️ 🤖 [${client.user?.tag || 'UNKNOWN'}] -> #${channelId.slice(-4)} Kendi komutları bulunamadı.`);
                    continue;
                }
            }

            if (messageToSend) {
                try {
                    const channel = await client.channels.fetch(channelId);
                    await channel.send(messageToSend);
                } catch (err) {
                    if (String(err).includes('token was unavailable')) return;
                    log(`❌ 🤖 [${client.user?.tag || 'UNKNOWN'}] -> #${channelId.slice(-4)} Mesaj hatası: ${err}`);
                    if (err.code === 10003 || err.code === 50001) {
                        log(`🛑 🤖 [${client.user?.tag || 'UNKNOWN'}] -> #${channelId.slice(-4)} Kanal hatası nedeniyle durduruldu.`);
                    }
                }
            }
        }
    }, 10000); // 10-second interval
    randomBotsState.intervals[botToken].push(sendMessagesInterval);

    botConfig.isPausedForCaptcha = false;
    log(`🤖 [${safeLogToken(botToken)}] için komut gönderme başlatıldı.`);
    if (isElectron && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('random-bots-status', randomBotsState.configs);
    }

    botConfig.isPausedForCaptcha = false;
    log(`🤖 [${safeLogToken(botToken)}] için komut gönderme başlatıldı.`);
    if (isElectron && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('random-bots-status', randomBotsState.configs);
    }
}

// --- Random Bot Yönetimi ---
function stopRandomBot(token) {
    log(`🤖 [${safeLogToken(token)}] botu durduruluyor...`);
    if (randomBotsState.intervals[token]) {
        randomBotsState.intervals[token].forEach(clearInterval);
        delete randomBotsState.intervals[token];
    }
    if (randomBotsState.clients[token]) {
        randomBotsState.clients[token].destroy();
        delete randomBotsState.clients[token];
    }
    const config = randomBotsState.configs.find(c => c.token === token);
    if (config) {
        config.isRunning = false;
    }
    if (isElectron && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('random-bots-status', randomBotsState.configs);
    }
    log(`🤖 [${safeLogToken(token)}] botu durduruldu.`);
}

function stopRandomBots() {
    log('🤖 Tüm rastgele mesaj botları durduruluyor...');
    Object.keys(randomBotsState.intervals).forEach(token => {
        randomBotsState.intervals[token].forEach(clearInterval);
    });
    Object.values(randomBotsState.clients).forEach(client => {
        try {
            client.destroy();
        } catch (e) {
            log(`⚠️ Client destroy hatası: ${e.message}`);
        }
    });
    randomBotsState.intervals = {};
    randomBotsState.clients = {};
    randomBotsState.configs.forEach(c => c.isRunning = false);
    if (isElectron && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('random-bots-status', randomBotsState.configs);
    }
    log('🤖 Tüm rastgele mesaj botları durduruldu.');
}

async function startRandomBot(config) {
    const { token, channels } = config;
    log(`🤖 [${safeLogToken(token)}] Bot başlatma isteği alındı.`);
    
    if (!token) {
        log(`🤖 Hata: Token eksik. Bot atlanıyor.`);
        return;
    }
    
    if (!channels || channels.length === 0) {
        log(`🤖 Hata: ${safeLogToken(token)} için kanal yapılandırması eksik.`);
        return;
    }

    // Eğer bot zaten çalışıyorsa durdur ve yeniden başlat
    if (randomBotsState.clients[token]) {
        log(`🤖 Bot ${safeLogToken(token)} zaten çalışıyor, yeniden başlatılıyor...`);
        stopRandomBot(token);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Kısa bekleme
    }

    try {
        const client = createDiscordClient();
        randomBotsState.clients[token] = client;

        // Ready event
        client.once('ready', async () => {
            log(`🤖 ✅ [${client.user.tag}] olarak giriş yapıldı.`);
            config.isRunning = true;
            config.username = client.user.tag; // Kullanıcı adını kaydet
            
            // Durum güncelle
            if (isElectron && mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('random-bots-status', randomBotsState.configs);
            }

            if (botState.useMainRpcForSideBots && botState.rpcEnabled && botState.rpcSettings.applicationId) {
                await setRPC(client, botState.rpcSettings);
            }

            // Kanalları doğrula
            let validChannels = [];
            for (const channelConfig of channels) {
                try {
                    const channel = await client.channels.fetch(channelConfig.channelId);
                    if (channel) {
                        validChannels.push(channelConfig);
                        log(`🤖 ✅ [${client.user.tag}] Kanal erişimi doğrulandı: #${channel.name || channelConfig.channelId.slice(-4)}`);
                    }
                } catch (err) {
                    log(`🤖 ⚠️ [${client.user.tag}] Kanal erişim hatası (#${channelConfig.channelId.slice(-4)}): ${err}`);
                }
            }
            
            if (validChannels.length === 0) {
                log(`🤖 ❌ [${client.user.tag}] Hiçbir kanala erişilemedi, bot durduruluyor.`);
                stopRandomBot(token);
                return;
            }
            
            // Geçerli kanalları güncelle
            config.channels = validChannels;
            saveData();
            
            // Komut göndermeyi başlat
            log(`🤖 🚀 [${client.user.tag}] Komut gönderimi başlatılıyor...`);
            startRandomBotCommands(token);
        });

        // Message event
        client.on('messageCreate', (message) => {
            handleRandomBotMessage(message, token);
        });

        // Error event
        client.on('error', (err) => {
            log(`🤖 ❌ [${safeLogToken(token)}] Client hatası: ${err}`);
        });

        // Disconnect event
        client.on('disconnect', () => {
            log(`🤖 🔴 [${safeLogToken(token)}] Bağlantı kesildi.`);
            stopRandomBot(token);
        });

        // Login
        log(`🤖 🔄 [${safeLogToken(token)}] Giriş yapılıyor...`);
        await client.login(token);
        
    } catch (err) {
        log(`🤖 ❌ [${safeLogToken(token)}] Giriş hatası: ${err}`);
        if (err && err.stack) {
            log(`   Stack: ${err.stack.split('\n')[0]}`);
        }
        
        delete randomBotsState.clients[token];
        config.isRunning = false;
        
        if (isElectron && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('random-bots-status', randomBotsState.configs);
        }
    }
}
// --- RPC Fonksiyonları ---
async function setRPC(client, rpcSettings) {
    if (!client || !client.user) return; 
    
    try {
        const r = new (require('discord.js-selfbot-v13')).RichPresence(client)
            .setApplicationId(rpcSettings.applicationId)
            .setType('PLAYING')
            .setName(rpcSettings.name)
            .setDetails(rpcSettings.details)
            .setState(rpcSettings.state)
            .setAssetsLargeImage(rpcSettings.largeImageKey)
            .setAssetsLargeText(rpcSettings.largeImageText)
            .setAssetsSmallImage(rpcSettings.smallImageKey)
            .setAssetsSmallText(rpcSettings.smallImageText);

        if (rpcSettings.buttons && rpcSettings.buttons.length > 0) {
            rpcSettings.buttons.forEach(btn => {
                r.addButton(btn.label, btn.url);
            });
        }

        await client.user.setPresence({ activities: [r] });
        log(`✅ [${client.user.tag}] RPC ayarlandı.`);
    } catch (err) {
        log(`❌ [${client.user.tag}] RPC ayarlama hatası: ${err}`);
    }
}
// --- Ana Bot Yönetimi ---
function updateStatus(status) {
    if (isElectron && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('status', {
            status: status,
            isRunning: botState.isRunning,
            isSendingCommands: botState.isSendingCommands
        });
    }
    log(`📊 Durum güncellendi: ${status}`);
}

async function startBot() {
    if (botState.isRunning) {
        log('⚠️ Bot zaten çalışıyor.');
        return;
    }

    try {
        const { Client } = require('discord.js-selfbot-v13');
        botState.client = new Client({ checkUpdate: false });

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Bot login timed out (150 seconds)'));
            }, 150000);

            botState.client.once('ready', async () => {
                clearTimeout(timeout);
                
                if (!botState.client.user) {
                    reject(new Error('Kullanıcı bilgisi alınamadı'));
                    return;
                }
                    if (botState.rpcEnabled && botState.rpcSettings.applicationId) {
                    await setRPC(botState.client, botState.rpcSettings);
                    }
                log(`✅ ${botState.client.user.username} olarak giriş yapıldı.`);
                
                try {
                    botState.channel = await botState.client.channels.fetch(botState.channelId);
                    if (botState.channel) {
                        await botState.channel.send('.devamet');
                        log('📤 .devamet gönderildi.');
                    }
                    
                    botState.isRunning = true;
                    botState.isSendingCommands = true;
                    updateStatus('Çalışıyor');
                    startSendingAll();
                    resolve();
                } catch (err) {
                    reject(new Error(`Kanal erişim hatası: ${err}`));
                }
            });

            botState.client.on('messageCreate', handleMessage);
            botState.client.on('disconnect', () => {
                log('🔴 Botun bağlantısı kesildi.');
                stopBot();
            });

            botState.client.on('error', (err) => {
                log(`❌ Bot hatası: ${err}`);
            });

            botState.client.login(botState.token).catch(err => {
                clearTimeout(timeout);
                reject(err);
            });
        });

    } catch (err) {
        log(`❌ Bot başlatma hatası: ${err}`);
        stopBot();
        throw err;
    }
}

function stopBot() {
    stopAllIntervals();
    botState.isSendingCommands = false;
    if (botState.client) {
        try {
            botState.client.destroy();
        } catch (e) {
            log(`⚠️ Client destroy hatası: ${e.message}`);
        }
        botState.client = null;
    }
    botState.isRunning = false;
    botState.channel = null;
    updateStatus('Durduruldu');
    log('🤖 Bot durduruldu.');
}

function startSendingAll() {
    // Replace fixed-interval sending with per-command recursive timeouts.
    // This ensures each send uses a freshly calculated random delay and avoids
    // all commands firing simultaneously when intervals start.
    stopAllIntervals();
    botState.intervals = [];

    botState.commands.forEach(cmd => {
        if (!cmd.text) return;

        // use a named recursive function to schedule the next send after each execution
        const scheduleNext = () => {
            if (!botState.channel || !botState.isRunning || !botState.isSendingCommands) return;

            // ensure sensible delay bounds
            const min = Math.max(0, Number(cmd.minDelay) || 0);
            const max = Math.max(min, Number(cmd.maxDelay) || min);
            const delay = Math.floor(Math.random() * (max - min + 1)) + min;

            const timeoutId = setTimeout(async () => {
                // remove this timeout id from tracking (it's now executing)
                botState.intervals = botState.intervals.filter(i => i !== timeoutId);
                if (!botState.channel || !botState.isRunning || !botState.isSendingCommands) return;

                try {
                    await botState.channel.send(cmd.text);
                    if (isElectron && mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('stats-updated', {});
                        mainWindow.webContents.send('command-sent', {
                            command: cmd.text,
                            status: 'success',
                            timestamp: new Date()
                        });
                    }
                } catch (err) {
                    log(`❌ "${cmd.text}" gönderme hatası: ${err}`);
                    if (isElectron && mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('command-sent', {
                            command: cmd.text,
                            status: 'failed',
                            error: err,
                            timestamp: new Date()
                        });
                    }
                }

                // schedule next send for this command
                scheduleNext();
            }, delay);

            // keep track so we can clear on stop
            botState.intervals.push(timeoutId);
        };

        // Stagger initial scheduling slightly to avoid exact simultaneous starts
        const initialStagger = Math.floor(Math.random() * 500); // up to 500ms
        let initialId;
        initialId = setTimeout(() => {
            // initial timer executed; remove it from tracking and start the loop
            botState.intervals = botState.intervals.filter(i => i !== initialId);
            scheduleNext();
        }, initialStagger);
        botState.intervals.push(initialId);
    });
}

function stopAllIntervals() {
    // clear both interval and timeout ids
    botState.intervals.forEach(id => {
        try { clearTimeout(id); } catch (e) { /* ignore */ }
        try { clearInterval(id); } catch (e) { /* ignore */ }
    });
    botState.intervals = [];
}

function stopCommandSending() {
    if (!botState.isSendingCommands) return;
    stopAllIntervals();
    botState.isSendingCommands = false;
    log('⏸️ Komut gönderimi duraklatıldı.');
    updateStatus('Çalışıyor (Komutlar Duraklatıldı)');
}

function startCommandSending() {
    if (!botState.isRunning || botState.isSendingCommands) return;
    startSendingAll();
    botState.isSendingCommands = true;
    log('▶️ Komut gönderimi yeniden başlatıldı.');
    updateStatus('Çalışıyor');
}

async function handleCaptcha(message, client, token, isMainBot) {
    const mentionsMe = message.mentions.has(client.user);
    const captchaTriggerText = 'complete the captcha using `+captcha [code]` to verify you are a human!';
    const includesCaptchaText = message.content.includes(captchaTriggerText);

    if (mentionsMe && includesCaptchaText) {
        log(`🚨 [${client.user.tag}] CAPTCHA ALGILANDI!`);
        showNotification(`🚨 CAPTCHA Algılandı! (${client.user.tag})`, 'Komut gönderimi durduruldu.');

        if (message.attachments.size > 0) {
            const attachment = message.attachments.first();
            const captchasDir = path.join(userDataPath, 'captchas');
            if (!fs.existsSync(captchasDir)) {
                fs.mkdirSync(captchasDir, { recursive: true });
            }
            const imagePath = path.join(captchasDir, `captcha-${client.user.username}-${Date.now()}.png`);

            const file = fs.createWriteStream(imagePath);
            https.get(attachment.url, (response) => {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    if (isElectron && mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('captcha-required', {
                            token: token,
                            imageUrl: imagePath,
                            username: client.user.tag,
                            channelId: message.channel?.id || null,
                            timestamp: new Date().toISOString()
                        });
                    }
                });
            }).on('error', (err) => {
                log(`❌ Captcha resmi indirilemedi: ${err}`);
            });
        }

        if (isMainBot) {
            stopCommandSending();
        } else {
            stopRandomBotCommands(token);
        }
        return true;
    }
    return false;
}

// --- Mesaj İşleme ---
async function handleMessage(message) {
    if (!botState.isRunning || !botState.client || !botState.client.user) {
        return;
    }

   if (message.channel.id !== botState.channelId) {
        // ONLY return early if it's NOT a mention for the bot, or if it's not a known system message
        if (!message.mentions.has(botState.client.user) && !message.content.includes('complete the captcha')) { // Added basic check for captcha text.
            return;
        }
    }
if (message.author.id !== botState.client.user.id) {
        if (await handleCaptcha(message, botState.client, botState.token, true)) return;
    }
    if (botState.gemSystemEnabled) {
        // ... existing gem system logic ...
        const mentionsMe = message.mentions.has(botState.client.user);
        if (mentionsMe) {
            log('ℹ️ Gem sistemi için mention algılandı.');
            log(` > Mesaj içeriği: ${message.content}`);
            
            const emojiRegex = /<a?:(\w+):(\d+)>/g;
            let match;
            let processedEmoji = false;

            while ((match = emojiRegex.exec(message.content)) !== null) {
                processedEmoji = true;
                const emojiName = match[1];
                const emojiId = match[2];
                log(` > Mesajda emoji bulundu: ${emojiName} (ID: ${emojiId})`);

                const foundGem = botState.gems.find(gem => gem.emojiId === emojiId);
                if (foundGem) {
                    log(` > Eşleşen gem ayarı bulundu: ${foundGem.command}`);
                    if (foundGem.enabled) {
                        log(`💎 Gem aktif, komut çalıştırılıyor: ${foundGem.command}`);
                        setTimeout(() => {
                            if (botState.channel) botState.channel.send(foundGem.command);
                        }, 1000);
                    } else {
                        log(' > Bu gem ayarı pasif durumda.');
                    }
                } else {
                    log(' > Bu emoji için ayarlanmış bir gem komutu bulunamadı.');
                }
            }

            if (!processedEmoji) {
                log(' > Mesajda gem emojisi deseni bulunamadı.');
            }
        }
    }

    const cmd = message.content.trim();
    if (cmd === '.devamet' && !botState.isRunning) startBot();
    if (cmd === '.dur' && botState.isRunning) stopBot();
    if (cmd === '+patatesat') {
        sendPotatoFromToken(botState.token, message.author);
    }
}

async function handleRandomBotMessage(message, botToken) {
    const botConfig = randomBotsState.configs.find(c => c.token === botToken);
    if (!botConfig || !randomBotsState.clients[botToken] || !randomBotsState.clients[botToken].user) {
        return;
    }

    const client = randomBotsState.clients[botToken];
    const mentionsMe = message.mentions.has(client.user);

    if (await handleCaptcha(message, client, botToken, false)) return;
}

// --- Patates Gönderme ---
async function sendPotatoFromToken(token, initiator) {
    if (!initiator) {
        log('🥔 Patates atma işlemi için başlatan kullanıcı bulunamadı.');
        return { success: false, error: 'Başlatan kullanıcı bulunamadı.' };
    }

    log(`🥔 Patates atma işlemi başlatıldı. Tetikleyen: ${initiator.username}, Token: ${safeLogToken(token)}`);

    const channelId = botState.channelId;
    if (!channelId) {
        log('❌ Hedef kanal ID ayarlanmamış.');
        showNotification('❌ Patates Hatası', 'Lütfen önce hedef kanal IDsünü ayarlayın.');
        return { success: false, error: 'Hedef kanal ID ayarlanmamış.' };
    }

    const potatoLog = appData.potatoLog;
    const now = new Date().getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const tokenIdentifier = token.slice(-12);
    const lastSent = potatoLog[tokenIdentifier] || 0;

    if (now - lastSent < twentyFourHours) {
        const timeLeft = new Date(lastSent + twentyFourHours - now).toISOString().substr(11, 8);
        log(`🟡 Token ${safeLogToken(token)} bekleme süresinde. Kalan: ${timeLeft}`);
        showNotification('🟡 Patates Beklemede', `Token ${safeLogToken(token)} bekleme süresinde. Kalan: ${timeLeft}`);
        return { success: false, error: 'Bekleme süresi devam ediyor.' };
    }

    const { Client } = require('discord.js-selfbot-v13');
    const potatoClient = new Client();
    let success = false;

    try {
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                potatoClient.destroy();
                reject(new Error('Timeout'));
            }, 15000);

            potatoClient.on('ready', async () => {
                clearTimeout(timeout);
                log(`🥔 [${potatoClient.user.username}] olarak giriş yapıldı.`);
                try {
                    const channel = await potatoClient.channels.fetch(channelId);
                    if (channel) {
                        const messageToSend = `+potato <@${initiator.id}>`;
                        await channel.send(messageToSend);
                        log(`✅ [${potatoClient.user.username}] "${messageToSend}" mesajını gönderdi.`);
                        success = true;
                    } else {
                        log(`❌ [${potatoClient.user.username}] Kanal bulunamadı: ${channelId}`);
                    }
                } catch (err) {
                    log(`❌ [${potatoClient.user.username}] Mesaj gönderme hatası: ${err}`);
                } finally {
                    potatoClient.destroy();
                    resolve();
                }
            });

            potatoClient.login(token).catch(err => {
                clearTimeout(timeout);
                log(`❌ Token giriş hatası: ${String(err).substring(0, 50)}...`);
                potatoClient.destroy();
                reject(err);
            });
        });
    } catch (error) {
        // Hata zaten loglandı
    }

    if (success) {
        potatoLog[tokenIdentifier] = new Date().getTime();
        appData.potatoLog = potatoLog;
        saveData();
        const summary = `🥔 Patates atma tamamlandı. ${safeLogToken(token)} token ile gönderildi.`;
        log(summary);
        showNotification('✅ Patates Gönderildi', summary);
        return { success: true };
    } else {
        return { success: false, error: 'Patates gönderilemedi.' };
    }
}

// --- Token Kontrol ---
async function checkTokens() {
    log('🔍 Token kontrolü başlatıldı...');
    const tokens = appData.tokens;
    if (tokens.length === 0) {
        log('❌ Token bulunamadı.');
        return [];
    }

    log(`${tokens.length} token bulundu. Geçerlilik kontrol ediliyor...`);
    const { Client } = require('discord.js-selfbot-v13');
    const results = [];

    for (const token of tokens) {
        const trimmedToken = token.trim();
        const checkClient = createDiscordClient();
        let result = { token: trimmedToken, username: null, status: 'invalid' };
        
        try {
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    checkClient.destroy();
                    reject(new Error('Timeout'));
                }, 15000);

                checkClient.on('ready', () => {
                    clearTimeout(timeout);
                    log(`✅ GEÇERLİ: ${safeLogToken(trimmedToken)} (${checkClient.user.username})`);
                    result.username = checkClient.user.username;
                    result.status = 'valid';
                    result.avatarURL = checkClient.user.avatarURL(); // Fetch avatar URL
                    checkClient.destroy();
                    resolve();
                });
                
                checkClient.login(trimmedToken).catch(err => {
                    clearTimeout(timeout);
                    reject(err);
                });
            });
        } catch (error) {
            log(`❌ GEÇERSİZ: ${safeLogToken(trimmedToken)}`);
        } finally {
            results.push(result);
            if (checkClient && !checkClient.isReady()) {
                try {
                    checkClient.destroy();
                } catch (e) {
                    // Ignore
                }
            }
        }
        await new Promise(res => setTimeout(res, 500));
    }

    appData.tokenData = results;
    saveData();
    log('💾 Token kullanıcı adları kaydedildi.');
    
    if (isElectron && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('token-check-complete', results);
    }

    const summary = `🔍 Token kontrolü tamamlandı. ${results.filter(r => r.status === 'valid').length} geçerli, ${results.filter(r => r.status === 'invalid').length} geçersiz.`;
    log(summary);
    showNotification('✅ Token Kontrolü Bitti', summary);
    return results;
}

// --- Bot Toggle ---
async function toggleBot() {
    if (botState.isRunning) {
        stopBot();
        return { status: 'stopped' };
    } else {
        if (!botState.token || !botState.channelId || botState.commands.length === 0) {
            const errorMsg = 'Token, Kanal ID veya komut eksik!';
            log(`❌ Başlatma hatası: ${errorMsg}`);
            showNotification('❌ Bot Başlatılamadı', errorMsg);
            updateStatus('Hata');
            return { error: errorMsg };
        }
        updateStatus('Başlatılıyor...');
        try {
            // Promise.race ile timeout ekle
            await Promise.race([
                startBot(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Bot başlatma zaman aşımına uğradı (200 saniye). Token geçersiz veya ağ sorunu olabilir.')), 200000)
                )
            ]);
            return { status: 'started' };
        } catch (err) {
            log(`❌ Bot başlatma hatası (toggleBot içinde yakalandı): ${err}`);
            stopBot(); // Botu durdur ve durumu temizle
            updateStatus('Hata');
            return { error: err };
        }
    }
}

// --- Electron GUI ---
if (isElectron) {
    function createWindow() {
        mainWindow = new BrowserWindow({
            width: 580,
            height: 720,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                contextIsolation: true
            },
            title: 'Blackeker',
            icon: path.join(__dirname, 'icon.ico'),
            frame: false
        });
        mainWindow.loadFile('index.html');
        mainWindow.setMenu(null);
        mainWindow.on('close', (event) => {
            if (!app.isQuitting) {
                event.preventDefault();
                mainWindow.hide();
            }
            return false;
        });
    }

    // IPC Handlers
    ipcMain.handle('get-settings', () => appData.settings);
    ipcMain.handle('get-stats', () => appData.stats);
    ipcMain.handle('update-rpc-settings', (_, settings) => {
    botState.rpcEnabled = settings.enabled;
    botState.rpcSettings = settings.settings;
    
    if (botState.isRunning && botState.client && settings.enabled) {
        setRPC(botState.client, settings.settings);
    } else if (botState.isRunning && botState.client && !settings.enabled) {
        botState.client.user.setPresence({ activities: [] });
    }
    
    saveData();
    return { success: true };
});





// RPC ayarlarını getir
ipcMain.handle('get-rpc-settings', () => ({
    enabled: botState.rpcEnabled,
    settings: botState.rpcSettings
}));
    ipcMain.handle('update-setting', async (_, key, value) => {
        try {
            // Mask token when logging
            const displayValue = key === 'token' ? safeLogToken(value) : value;
            log(`IPC: update-setting -> ${key} = ${displayValue}`);
            appData.settings[key] = value;
            botState[key] = value;
            saveData();
            log(`IPC: update-setting saved -> ${key}`);
            return { success: true };
        } catch (e) {
            log(`❌ IPC update-setting error for ${key}: ${e.message}`);
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('update-commands', (_, commands) => {
        try {
            const count = Array.isArray(commands) ? commands.length : 0;
            log(`IPC: update-commands -> ${count} commands`);
            appData.settings.commands = commands;
            botState.commands = commands;
            saveData();
            log('IPC: update-commands saved');
            return { success: true };
        } catch (e) {
            log(`❌ IPC update-commands error: ${e.message}`);
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('update-gems', (_, gems) => {
        appData.settings.gems = gems;
        botState.gems = gems;
        saveData();
        return true;
    });

    ipcMain.handle('export-settings', async () => {
        log('📤 Dışa aktar butonuna basıldı.');
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Ayarları Dışa Aktar',
            defaultPath: 'discord-bot-ayarlar.json',
            filters: [{ name: 'JSON Dosyaları', extensions: ['json'] }]
        });
        if (!result.canceled && result.filePath) {
            fs.writeFileSync(result.filePath, JSON.stringify(appData, null, 2));
            return true;
        }
        return false;
    });

    ipcMain.handle('import-settings', async () => {
        log('📥 İçe aktar butonuna basıldı.');
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Ayarları İçe Aktar',
            filters: [{ name: 'JSON Dosyaları', extensions: ['json'] }],
            properties: ['openFile']
        });
        if (!result.canceled && result.filePaths.length > 0) {
            try {
                const data = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf8'));
                appData = { ...appData, ...data };
                saveData();
                loadData();
                return appData;
            } catch (e) {
                log(`❌ İçe aktarma hatası: ${e.message}`);
                showNotification('❌ İçe Aktarma Hatası', 'Ayar dosyası okunamadı.');
                return null;
            }
        }
        return null;
    });

    ipcMain.handle('toggle-bot', async () => {
        log('▶️ Botu Başlat/Durdur butonuna basıldı.');
        return await toggleBot();
    });

    ipcMain.handle('toggle-command-sending', () => {
        if (botState.isSendingCommands) {
            stopCommandSending();
        } else {
            startCommandSending();
        }
        return botState.isSendingCommands;
    });

    ipcMain.handle('send-potato', () => {
        log('🥔 Patates Yolla butonuna basıldı.');
        if (botState.client && botState.client.user) {
            sendPotatoFromToken(botState.token, botState.client.user);
        } else {
            log('❌ Patates göndermek için bot çalışıyor olmalı.');
            showNotification('❌ Bot Çalışmıyor', 'Lütfen önce botu başlatın.');
        }
    });

    ipcMain.handle('send-potato-from-account', async (_, token) => {
        log(`🥔 Patates Yolla butonuna basıldı: ${safeLogToken(token)}`);
        if (botState.client && botState.client.user) {
            return await sendPotatoFromToken(token, botState.client.user);
        } else {
            log('❌ Patates göndermek için ana bot çalışıyor olmalı.');
            showNotification('❌ Ana Bot Çalışmıyor', 'Lütfen önce ana botu başlatın.');
            return { success: false, error: 'Ana bot çalışmıyor' };
        }
    });

    ipcMain.handle('check-tokens', async () => {
        log('🔍 Tokenları Kontrol Et butonuna basıldı.');
        return await checkTokens();
    });

    ipcMain.handle('get-token-data', () => appData.tokenData);

    ipcMain.handle('get-tokens', () => appData.tokens.join('\n'));

    ipcMain.handle('save-tokens', (_, tokens) => {
        appData.tokens = tokens.split('\n').map(t => t.trim()).filter(t => t !== '');
        saveData();
        log('💾 Tokenler kaydedildi.');
        return { success: true };
    });

    ipcMain.handle('reset-potato-log', () => {
        appData.potatoLog = {};
        saveData();
        log('🥔 Patates zamanlayıcıları sıfırlandı.');
        return { success: true };
    });

    ipcMain.handle('get-random-bots', () => randomBotsState.configs);

    ipcMain.handle('update-random-bots', (_, configs) => {
        randomBotsState.configs = configs.map(c => ({
            ...c, 
            isRunning: false,
            channels: c.channels || []
        }));
        saveData();
        return true;
    });

        ipcMain.handle('create-channels-for-tokens', async (_, guildId) => {

            if (!botState.isRunning || !botState.client) {

                return { success: false, error: 'Ana bot çalışmıyor.' };

            }

            if (!guildId) {

                return { success: false, error: 'Sunucu IDsi belirtilmedi.' };

            }

    

            try {

                const guild = await botState.client.guilds.fetch(guildId);

                if (!guild) {

                    return { success: false, error: 'Sunucu bulunamadı.' };

                }

    

                const validTokens = appData.tokenData.filter(t => t.status === 'valid');

                if (validTokens.length === 0) {

                    return { success: false, error: 'Yapılandırılacak geçerli token bulunamadı.' };

                }

    

                log(`🏭 Starting channel creation for ${validTokens.length} tokens in guild ${guild.name}.`);

    

                let processedCount = 0;

                for (const tokenData of validTokens) {

                    const username = tokenData.username.replace(/[^a-zA-Z0-9_\-]/g, '').substring(0, 20) || 'user';

                    const newChannels = [];

    

                    for (let i = 1; i <= 4; i++) {

                        try {

                            const channelName = `${username}-${i}`;

                            const channel = await guild.channels.create(channelName, {

                                type: 'GUILD_TEXT',

                                permissionOverwrites: [

                                    {

                                        id: guild.roles.everyone,

                                        deny: ['VIEW_CHANNEL']

                                    }

                                ]

                            });

                            newChannels.push({ channelId: channel.id, commands: [], commandSource: 'onlyRandom' });

                            log(`✅ Created channel ${channel.name} in ${guild.name}.`);

                            await new Promise(res => setTimeout(res, 500)); // Avoid rate limits

                        } catch (err) {

                            log(`❌ Failed to create channel for ${username}: ${err}`);

                            // Stop creating channels for this user if one fails

                            break;

                        }

                    }

    

                    if (newChannels.length === 4) {

                        let botConfig = randomBotsState.configs.find(c => c.token === tokenData.token);

                        if (botConfig) {

                            botConfig.channels = newChannels;

                        } else {

                            randomBotsState.configs.push({

                                token: tokenData.token,

                                isPausedForCaptcha: false,

                                channels: newChannels

                            });

                        }

                        processedCount++;

                    }

                }

    

                saveData(); // Save the updated randomBotsState.configs

                log(`✅ Finished channel creation process. ${processedCount} accounts configured.`);

                return { success: true, count: processedCount };

            } catch (err) {

                log(`❌ An error occurred during channel creation: ${err}`);

                return { success: false, error: err };

            }

        });

    // Allow renderer to request sending an arbitrary message from a specific token to a channel
    ipcMain.handle('send-channel-message', async (_, token, channelId, message) => {
        try {
            if (!token || !channelId || !message) return { success: false, error: 'Eksik parametre' };

            let client = null;
            let isMain = false;

            if (botState.token === token) {
                client = botState.client;
                isMain = true;
            } else if (randomBotsState.clients[token]) {
                client = randomBotsState.clients[token];
            }

            if (!client) return { success: false, error: 'Bot client bulunamadı (giriş yapılmamış olabilir)' };

            try {
                const channel = await client.channels.fetch(channelId);
                if (!channel) return { success: false, error: 'Kanal bulunamadı' };
                await channel.send(message);
                log(`✉️ [${safeLogToken(token)}] -> #${channelId.slice(-6)} Mesaj gönderildi`);
                return { success: true };
            } catch (err) {
                log(`❌ Manuel mesaj gönderilemedi: ${err}`);
                return { success: false, error: err };
            }
        } catch (e) {
            log(`❌ send-channel-message handler hatası: ${e.message}`);
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('open-devtools', () => {
        if (isElectron && mainWindow && !mainWindow.isDestroyed()) {
            try {
                mainWindow.webContents.openDevTools({ mode: 'detach' });
                return { success: true };
            } catch (e) {
                log(`❌ open-devtools error: ${e.message}`);
                return { success: false, error: e.message };
            }
        }
        return { success: false, error: 'Main window not available' };
    });

    ipcMain.handle('toggle-random-bots', () => {
        const isRunning = randomBotsState.configs.some(c => c.isRunning);
        if (isRunning) {
            log('🤖 Rastgele mesaj botları durduruluyor...');
            stopRandomBots();
            return { status: 'stopped' };
        } else {
            log(`🤖 Rastgele mesaj botları başlatılıyor... (${randomBotsState.configs.length} konfigürasyon bulundu)`);
            randomBotsState.configs.forEach(config => {
                log(`🤖 Başlatılmaya çalışılan bot: ${safeLogToken(config.token)}`);
                startRandomBot(config);
            });
            return { status: 'started' };
        }
    });

    ipcMain.handle('resume-bot-commands', (_, token) => {
        log(`🤖 [${safeLogToken(token)}] botunun komut gönderimi devam ettiriliyor...`);
        if (token === botState.token) {
            startCommandSending();
        } else {
            const botConfig = randomBotsState.configs.find(c => c.token === token);
            if (botConfig && botConfig.isRunning) {
                startRandomBotCommands(token);
            } else {
                log(`🤖 [${safeLogToken(token)}] botu çalışmıyor.`);
            }
        }
    });

    ipcMain.handle('send-captcha-solution', async (_, token, solution, channelOverride) => {
        log(`🖼️ Captcha çözümü alındı. Token: ${safeLogToken(token)}, Çözüm: ${solution}, ChannelOverride: ${channelOverride}`);
        
        let client;
        let targetChannelId;
        let isMainBot = false;

        if (botState.token === token) {
            client = botState.client;
            targetChannelId = botState.channelId;
            isMainBot = true;
            } else if (randomBotsState.clients[token]) {
            client = randomBotsState.clients[token];
            const config = randomBotsState.configs.find(c => c.token === token);
            if (config && config.channels && config.channels.length > 0) {
                targetChannelId = config.channels[0].channelId;
            }
            }

        // prefer channelOverride (sent from renderer) if provided
        if (channelOverride) {
            targetChannelId = channelOverride;
            }

        if (client && targetChannelId) {
            try {
                const channel = await client.channels.fetch(targetChannelId);
                if (!channel) {
                    return { success: false, error: 'Kanal bulunamadı' };
                }
                await channel.send(`+captcha ${solution}`);
                log(`✅ Captcha çözümü gönderildi: +captcha ${solution}`);
                
                setTimeout(() => {
                    if (isMainBot) {
                        log('▶️ Ana botun komut gönderimi devam ediyor...');
                        startCommandSending();
                    } else {
                        log(`▶️ [${safeLogToken(token)}] botunun komut gönderimi devam ediyor...`);
                        startRandomBotCommands(token);
                    }
                }, 5000);

                return { success: true };
            } catch (err) {
                log(`❌ Captcha çözümü gönderilemedi: ${err}`);
                return { success: false, error: err };
            }
        } else {
            log(`❌ Captcha çözümü gönderilemedi: Bot veya hedef kanal bulunamadı. Client: ${client ? 'OK' : 'NULL'}, TargetChannelId: ${targetChannelId}`);
            return { success: false, error: 'Bot veya hedef kanal bulunamadı' };
        }
    });

    ipcMain.handle('get-captcha-images', async () => {
        const captchasDir = path.join(userDataPath, 'captchas');
        if (!fs.existsSync(captchasDir)) {
            return [];
        }
        const files = await fs.promises.readdir(captchasDir);
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
        }).map(file => path.join(captchasDir, file));
        return imageFiles;
    });

    ipcMain.handle('get-basename', (_, filePath) => path.basename(filePath));

    ipcMain.handle('create-backup', async () => {
        log('💾 Yedekleme isteği alındı.');
        return createBackup();
    });

    ipcMain.handle('restore-backup', async () => {
        log('📥 Yedekten geri yükleme isteği alındı.');
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Yedekten Geri Yükle',
            filters: [{ name: 'JSON Dosyaları', extensions: ['json'] }],
            properties: ['openFile']
        });
        if (!result.canceled && result.filePaths.length > 0) {
            return restoreBackup(result.filePaths[0]);
        }
        return false;
    });

    ipcMain.handle('get-backup-files', () => {
        const backupDir = path.join(userDataPath, 'backups');
        if (!fs.existsSync(backupDir)) {
            return [];
        }
        const files = fs.readdirSync(backupDir);
        return files.filter(file => file.startsWith('backup-') && file.endsWith('.json'))
            .map(file => path.join(backupDir, file));
    });

    // Renderer tarafından çağrılan eksik/uyumlu hale getirilmiş IPC handler'lar
    ipcMain.handle('open-log-file', async () => {
        try {
            const logDir = path.join(userDataPath, 'logs');
            if (!fs.existsSync(logDir)) {
                return { success: false, error: 'Log dizini bulunamadı.' };
            }
            // shell.openPath returns a promise
            await shell.openPath(logDir);
            return { success: true };
        } catch (e) {
            log(`❌ open-log-file hatası: ${e.message}`);
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('open-data-folder', async () => {
        try {
            await shell.openPath(userDataPath);
            return { success: true };
        } catch (e) {
            log(`❌ open-data-folder hatası: ${e.message}`);
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('save-random-bots', (_, configs) => {
        randomBotsState.configs = configs.map(c => ({
            ...c, 
            isRunning: false,
            channels: c.channels || []
        }));
        saveData();
        return true;
    });

    ipcMain.handle('hide-window', () => {
        if (mainWindow) {
            mainWindow.hide();
            log('Pencere sistem tepsisine gizlendi.');

            if (!tray) {
                const iconPath = path.join(__dirname, 'icon.ico');
                tray = new Tray(iconPath);

                const contextMenu = Menu.buildFromTemplate([
                    {
                        label: 'Göster',
                        click: () => mainWindow.show()
                    },
                    {
                        label: 'Çıkış',
                        click: () => {
                            app.isQuitting = true;
                            app.quit();
                        }
                    }
                ]);

                tray.setToolTip('Blackeker Bot Yönetim Paneli');
                tray.setContextMenu(contextMenu);

                tray.on('double-click', () => mainWindow.show());
            }
        }
    });

    ipcMain.handle('minimize-window', () => {
        if (mainWindow) {
            mainWindow.minimize();
            log('Pencere küçültüldü.');
        }
    });

    ipcMain.handle('close-window', () => {
        app.isQuitting = true;
        app.quit();
        log('Uygulama kapatıldı.');
    });

    app.whenReady().then(() => {
        loadData();
        createWindow();
    });

    app.on('window-all-closed', () => {});
    
    app.on('before-quit', () => {
        saveData();
        stopBot();
        stopRandomBots();
    });

    // If not Electron, run CLI mode
} else {
    log('CLI modu başlatılıyor...');
    const cli = require('./cli.js');
    cli.startCli();
}
