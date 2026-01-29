const crypto = require('crypto');
const { encryptionKey } = require('../config'); // src/config.js'den anahtarı al

// Şifreleme anahtarının doğru formatta olduğundan emin olun
if (!encryptionKey || encryptionKey.length !== 64) {
  throw new Error('Geçersiz veya eksik ENCRYPTION_KEY. Anahtar 64 karakterlik bir hex dizesi olmalıdır. Lütfen .env dosyasını kontrol edin.');
}
const key = Buffer.from(encryptionKey, 'hex');

// Şifreleme algoritması
const algorithm = 'aes-256-gcm';
const ivLength = 16; // AES-GCM için Başlatma Vektörü (IV) uzunluğu
const authTagLength = 16; // Kimlik doğrulama etiketi uzunluğu

/**
 * Verilen metni AES-256-GCM ile şifreler.
 * @param {string} text Şifrelenecek metin.
 * @returns {string} Şifrelenmiş metin (iv:authTag:encryptedText formatında).
 */
function encrypt(text) {
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // IV, kimlik doğrulama etiketi ve şifreli metni birleştirerek döndür
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * AES-256-GCM ile şifrelenmiş bir metnin şifresini çözer.
 * @param {string} encryptedText Şifresi çözülecek metin (iv:authTag:encryptedText formatında).
 * @returns {string} Orijinal, şifresi çözülmüş metin.
 */
function decrypt(encryptedText) {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Geçersiz şifrelenmiş metin formatı. Beklenen format: iv:authTag:encryptedText');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Şifre çözme hatası:', error);
    throw new Error('Metnin şifresi çözülemedi. Anahtar veya şifreli metin hatalı olabilir.');
  }
}

module.exports = {
  encrypt,
  decrypt,
};
