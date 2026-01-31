const { getClient } = require('../services/botManager');
const { getUserByApiKey } = require('../services/databaseService');

/**
 * Gelen istekleri doğrulayan Express ara yazılımı.
 * 'Authorization' başlığında geçerli bir API anahtarı bekler.
 * Başarılı olursa, ilgili Discord istemcisini 'req.discordClient' olarak ekler.
 * @param {object} req Express istek nesnesi.
 * @param {object} res Express yanıt nesnesi.
 * @param {function} next Bir sonraki ara yazılımı çağıran fonksiyon.
 */
async function authMiddleware(req, res, next) {
  // API anahtarını 'Authorization' veya 'x-api-key' başlığından al
  const apiKey = req.headers.authorization || req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'Yetkisiz: API anahtarı belirtilmedi.' });
  }

  try {
    // Bot yöneticisinden ilgili Discord istemcisini al (Otomatik başlatma YOK)
    const client = await getClient(apiKey, false);

    if (client && client.user) {
      // Bot aktifse ve user nesnesi mevcutsa
      req.discordClient = client;
      req.userId = client.user.id;
      req.username = client.user.username;
      req.apiKey = apiKey; // Add apiKey to request
    } else {
      // Bot aktif değilse, veritabanından kullanıcıyı doğrula
      const user = await getUserByApiKey(apiKey);
      if (!user) {
        console.error(`Yetkisiz erişim: Geçersiz API Key (${apiKey})`);
        return res.status(401).json({ success: false, error: 'Yetkisiz: Geçersiz API anahtarı.' });
      }
      req.discordClient = null;
      req.userId = user.userId;
      req.username = user.username;
      req.apiKey = apiKey; // Add apiKey to request
    }

    // Her şey yolundaysa, bir sonraki adıma geç
    next();
  } catch (error) {
    console.error(`Kimlik doğrulama hatası (API Key: ${apiKey}):`, error.message);
    // Hata durumunda yetkisiz hatası döndür
    return res.status(401).json({ success: false, error: `Yetkisiz: ${error.message}` });
  }
}

module.exports = authMiddleware;
