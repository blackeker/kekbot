// Bu satır, .env dosyasındaki değişkenleri process.env'ye yükler
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

module.exports = {
  encryptionKey: process.env.ENCRYPTION_KEY,
};
