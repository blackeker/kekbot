const { createApiServer } = require('./api');
const { info, error } = require('./utils/logger');
info('🚀 Blackeker Discord Bot API başlatılıyor...');
info('📦 Çoklu kullanıcı desteği aktif (SQLite)');
info('🔐 Korumalı API uç noktaları hazır');

// Start API Server
try {
    createApiServer();
    const { restoreAllActiveSpamBots } = require('./services/spamService');

    setTimeout(() => {
        restoreAllActiveSpamBots().catch(err => {
            error(`Failed to restore spam bots: ${err.message}`);
        });
    }, 2000); // 2 saniye bekle (DB hazır olsun)

} catch (err) {
    error(`❌ FATAL: API sunucusu başlatılamadı: ${err.message}`);
    process.exit(1);
}

// Graceful shutdown
process.on('SIGINT', () => {
    info('🛑 Uygulama kapatılıyor...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    info('🛑 Uygulama kapatılıyor...');
    process.exit(0);
});
