const fs = require('fs');
const path = require('path');
const { Client } = require('discord.js-selfbot-v13');

// Konsol renkleri
const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m"
};

const log = (message, color = colors.reset) => {
    console.log(color + message + colors.reset);
};

async function checkTokens() {
    log('=========================================', colors.cyan);
    log('      DISCORD TOKEN KONTROLCUSU', colors.cyan);
    log('=========================================\n');

    const tokensFilePath = path.join(__dirname, 'tokens.txt');

    if (!fs.existsSync(tokensFilePath)) {
        log(`❌ HATA: 'tokens.txt' dosyası bulunamadı.`, colors.red);
        return;
    }

    const tokens = fs.readFileSync(tokensFilePath, 'utf8').split(/\r?\n/).filter(t => t.trim() !== '');

    if (tokens.length === 0) {
        log('🟡 UYARI:  dosyası boş veya geçerli token içermiyor.', colors.yellow);
        return;
    }

    log(`🔎 ${tokens.length} adet token bulundu. Kontrol ediliyor...\n`);

    let validCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const client = new Client();

        const tokenPreview = `${token.substring(0, 15)}...${token.slice(-6)}`;
        process.stdout.write(`[${i + 1}/${tokens.length}] ${tokenPreview} -> `);

        try {
            await Promise.race([
                new Promise((resolve, reject) => {
                    client.on('ready', () => {
                        log(`GEÇERLİ (${client.user.username})`, colors.green);
                        validCount++;
                        client.destroy();
                        resolve();
                    });

                    client.login(token).catch(err => {
                        reject(err);
                    });
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Zaman aşımı')), 15000) // 15 saniye zaman aşımı
                )
            ]);
        } catch (error) {
            log(`GEÇERSİZ (${error.message.split('\n')[0]})`, colors.red);
            invalidCount++;
            if (client) client.destroy();
        }
        // Discord API'sini yormamak için küçük bir bekleme
        await new Promise(res => setTimeout(res, 500));
    }

    log('\n=========================================', colors.cyan);
    log('           KONTROL TAMAMLANDI', colors.cyan);
    log('=========================================');
    log(`  ✅ Geçerli: ${validCount}`, colors.green);
    log(`  ❌ Geçersiz: ${invalidCount}`, colors.red);
    log(`  📊 Toplam: ${tokens.length}`);
    log('=========================================\n', colors.cyan);
}

checkTokens();
