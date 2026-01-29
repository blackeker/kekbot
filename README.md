# Buapi (Blackeker Discord Bot API)

Bu proje (**Blackeker**), Discord selfbot işlemleri için geliştirilmiş CLI ve REST API tabanlı bir headless bot uygulamasıdır. Kullanıcıların Discord tokenları ile kayıt olup bir API anahtarı (API Key) almasını ve bu anahtar ile botu yönetmesini sağlar.

## 🚀 Özellikler

*   **API Tabanlı Bot Yönetimi**: Botu başlatma, durdurma ve durumunu sorgulama.
*   **Token Kayıt Sistemi**: Discord token ile güvenli kayıt ve API Key üretimi.
*   **Gelişmiş Komut Yönetimi**: Komut tanımlarını listeleme, ekleme, düzenleme ve silme (Veritabanı kayıtları).
*   **Mesaj Gönderme**: API üzerinden belirli bir kanala mesaj gönderme.
*   **Akıllı Captcha Tespiti:** Bot, doğrulama gerektiren mesajları (örneğin "STOP USING THIS COMMAND") algılar ve kendini **Otomatik Kilit Moduna (Locked)** alır.
    *   📸 **Kalıcı (Persistent) Saklama:** Captcha resmi ve kilit durumu **SQLite veritabanına** kaydedilir. Botu kapatıp açsanız bile kilit durumu devam eder.
    *   API üzerinden Base64 formatında resim sunulur.
*   **Otomatik Mesaj (Broadcast) Sistemi:** Belirlediğiniz kanala, belirlediğiniz aralıklarla (Interval) otomatik mesaj atar. Captcha kilidi varken bu işlem **duraklatılır**.ma.
*   **Ayarlar Yönetimi**: Bot ayarlarını (tema, RPC, gem sistemi vb.) uzaktan yapılandırma.
*   **Rich Presence (RPC):** Botun durumunu (Oynuyor, İzliyor vb.) özelleştirme.
*   **Güvenlik & Performans**:
    *   `Helmet` ile HTTP başlık güvenliği.
    *   `Rate Limit` ile istek sınırlaması.
    *   `Compression` ile veri sıkıştırma.
    *   `SQLite` veritabanı ile hızlı ve yerel veri saklama.

### 🔬 Teknik Özellikler

*   **AES-256-GCM Şifreleme**: Discord tokenlarınız veritabanında AES-256-GCM algoritması ile şifrelenerek saklanır.
*   **Akıllı Oturum Yönetimi (Lazy Loading)**: Bot istemcileri sunucu başladığında değil, ilk API isteği geldiğinde (middleware aracılığıyla) otomatik olarak başlatılır ve `activeClients` havuzunda önbelleğe alınır.
*   **Multi-Tenancy**: Tek bir sunucu üzerinde birden fazla Discord hesabı/botu tamamen izole edilmiş şekilde çalışabilir.
*   **CLI & Headless Mod**: Sunucu arayüzsüz (headless) çalışacak şekilde tasarlanmıştır, tüm kontroller REST API üzerinden sağlanır.
*   **İlişkisel Veri Yapısı**: Kullanıcılar, Komutlar ve Ayarlar tabloları `CASCADE` silme kuralları ile birbirine bağlıdır.

## 🛠 Kurulum ve Çalıştırma

### Gereksinimler
*   Node.js (v16 veya üzeri önerilir)
*   npm

### Kurulum

Projeyi klonlayın ve gerekli paketleri yükleyin:

```bash
npm install
```

### Çalıştırma

Geliştirme modunda başlatmak için:

```bash
npm run dev
```

Normal modda başlatmak için:

```bash
npm start
```

API varsayılan olarak `3000` portunda çalışır (veya `.env` dosyasında belirtilen `PORT`).
Sağlık kontrolü: `http://localhost:3000/api/health`

---

## 📚 API Dokümantasyonu

> 📘 **Detaylı Kullanım Kılavuzu İster misiniz?**
>
> Tüm uç noktalar, cURL örnekleri ve detaylı açıklamalar için [API_USAGE.md](API_USAGE.md) dosyasını inceleyin.

Tüm **korumalı** isteklerde `Authorization` veya `x-api-key` header'ında size verilen **API Key** kullanılmalıdır.

### 🔐 Kimlik Doğrulama (Auth)

#### 1. Kayıt Ol (Register)
Discord tokenınızı kullanarak sisteme kayıt olun ve bir API Key alın.

*   **Endpoint**: `POST /api/register`
*   **Body**:
    ```json
    {
      "token": "DISCORD_TOKENINIZ"
    }
    ```
*   **Yanıt**:
    ```json
    {
      "success": true,
      "apiKey": "bize-verilen-api-key"
    }
    ```

#### 2. Sağlık Kontrolü (Health Check)
API'nin çalışıp çalışmadığını kontrol eder.

*   **Endpoint**: `GET /api/health`

---

### 🤖 Bot İşlemleri

#### Bot Durumu
Botun o anki durumunu (hazır mı, kullanıcı adı ne) döner.
*   **Endpoint**: `GET /api/bot/status`
*   **Header**: `x-api-key: API_KEY`

#### Bot Başlat/Kontrol
Botu başlatır (zaten çalışıyorsa onaylar).
*   **Endpoint**: `POST /api/bot/start`
*   **Header**: `x-api-key: API_KEY`

#### Bot Durdur
Çalışan botu durdurur.
*   **Endpoint**: `POST /api/bot/stop`
*   **Header**: `x-api-key: API_KEY`

#### Mesaj Gönder
Belirtilen kanala mesaj gönderir.
*   **Endpoint**: `POST /api/bot/send-message`
*   **Header**: `x-api-key: API_KEY`
*   **Body**:
    ```json
    {
      "channelId": "KANAL_ID",
      "message": "Merhaba Dünya!"
    }
    ```

---

### ⚙️ Ayarlar (Settings)

#### Ayarları Getir
Mevcut kullanıcı ayarlarını listeler.
*   **Endpoint**: `GET /api/settings`
*   **Header**: `x-api-key: API_KEY`

#### Ayarları Güncelle
Bot ayarlarını günceller.
*   **Endpoint**: `POST /api/bot/settings`
*   **Header**: `x-api-key: API_KEY`
*   **Body** (Örnek):
    ```json
    {
      "theme": "dark",
      "rpcEnabled": true,
      "gemSystemEnabled": false
    }
    ```

---

### 📝 Komut Yönetimi (Commands)
Botun kullanacağı komut tanımlarını yönetir (Veritabanı CRUD işlemleri).

#### Komutları Listele
*   **Endpoint**: `GET /api/bot/commands`

#### Tek Komut Ekle
*   **Endpoint**: `POST /api/bot/commands/add`
*   **Body**:
    ```json
    {
      "command": { "trigger": "!ping", "response": "Pong!" }
    }
    ```

#### Komut Düzenle (Put)
*   **Endpoint**: `PUT /api/bot/commands/:index`

#### Komut Sil (Delete)
*   **Endpoint**: `DELETE /api/bot/commands/:index`

---

## 📂 Proje Yapısı

*   `src/api.js`: Express sunucusu ve middleware yapılandırması.
*   `src/routes/`: API rotaları (`auth`, `bot`, `settings`).
*   `src/services/`: Veritabanı ve bot mantığı servisleri.
*   `src/middleware/`: Yetkilendirme (`authMiddleware`) gibi ara yazılımlar.
