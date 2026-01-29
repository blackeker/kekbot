# Buapi Kapsamlı Kullanım Kılavuzu

Bu belge, Buapi (Blackeker) API'sinin nasıl kullanılacağını, tüm uç noktaları (endpoints), parametreleri ve örnek istekleri detaylıca anlatır.

## 🔗 Temel Bilgiler

*   **Base URL**: `http://localhost:3000/api`
*   **Kimlik Doğrulama**: `Authorization` veya `x-api-key` başlığı (Header) kullanılır.
*   **Veri Formatı**: Tüm istekler ve yanıtlar `JSON` formatındadır.

---

## 🔐 1. Kimlik Doğrulama ve Kurulum

Sistemi kullanmaya başlamadan önce Discord Token'ınız ile kayıt olmalı ve bir API Anahtarı (API Key) almalısınız.

### 📝 Kayıt Ol (Register)
İlk adımda tokenınızı sisteme kaydedin.

*   **URL**: `/register`
*   **Metot**: `POST`
*   **Auth Gerektirmez**

**Örnek İstek (cURL):**
```bash
curl -X POST http://localhost:3000/api/register \
     -H "Content-Type: application/json" \
     -d '{"token": "OTk5..."}'
```

**Başarılı Yanıt:**
```json
{
  "success": true,
  "apiKey": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Kullanıcı başarıyla kaydedildi..."
}
```
🔴 **Önemli:** Size verilen `apiKey`'i saklayın. Sonraki tüm işlemlerde bu anahtarı kullanacaksınız.

---

### 🔑 Giriş Yap (Mevcut API Key ile)
Eğer zaten bir API anahtarınız varsa (`register` işleminden dönen), tekrar kayıt olmanıza gerek yoktur.
Anahtarın geçerliliğini kontrol etmek ve giriş yapmak için bu endpoint'i kullanın.

*   **URL**: `/verify`
*   **Metot**: `GET`
*   **Header**: `x-api-key: SIZE_VERILEN_API_KEY`

**Örnek İstek:**
```bash
curl -X GET http://localhost:3000/api/verify \
     -H "x-api-key: 550e8400-e29b-41d4-a716-446655440000"
```

**Başarılı Yanıt:**
```json
{
  "success": true,
  "message": "API anahtarı geçerli.",
  "user": {
    "username": "Blackeker",
    "id": "123456"
  }
}
```

---

## 🤖 2. Bot Kontrol İşlemleri

Bu işlemler için Header'da `x-api-key: SIZE_VERILEN_API_KEY` olmalıdır.

### ▶️ Botu Başlat (Start)
Botunuzu aktif hale getirir (Discord'a bağlanır). API ilk kez bir istek aldığında bot otomatik başlar ama manuel tetiklemek için kullanılabilir.

*   **URL**: `/bot/start`
*   **Metot**: `POST`

```bash
curl -X POST http://localhost:3000/api/bot/start \
     -H "x-api-key: 550e8400-e29b-41d4-a716-446655440000"
```

### ⏹️ Botu Durdur (Stop)
Botun Discord bağlantısını keser.

*   **URL**: `/bot/stop`
*   **Metot**: `POST`

### ℹ️ Durum Sorgula (Status)
Botun şu an çalışıp çalışmadığını ve hangi kullanıcı ile bağlı olduğunu gösterir.

*   **URL**: `/bot/status`
*   **Metot**: `GET`

**Yanıt:**
```json
{
  "success": true,
  "data": {
    "username": "KullaniciAdi",
    "id": "123456789",
    "isReady": true
  },
  "captchaState": {
    "active": false,
    "imageBase64": null,
    "timestamp": 0
  }
}
```
*   `captchaState.active`: `true` ise bot kilitlidir, captcha çözülmelidir.
*   `captchaState.imageBase64`: Captcha resminin Base64 formatı (varsa).

---

## 💬 3. Mesaj İşlemleri

### 📩 Mesaj Gönder
Bot hesabınızdan belirtilen kanala mesaj atar.

*   **URL**: `/bot/send-message`
*   **Metot**: `POST`

**Body Parametreleri:**
*   `channelId`: Mesajın gideceği Kanal ID'si (String).
*   `message`: Gönderilecek metin (String).

**Örnek:**
```bash
curl -X POST http://localhost:3000/api/bot/send-message \
     -H "Content-Type: application/json" \
     -H "x-api-key: API_KEY" \
     -d '{"channelId": "123456789012345678", "message": "Merhaba API!"}'
```

---

## ✋ 3.1. Captcha ve Kilit Durumu (Önemli)

Bot, Discord'dan "STOP USING THIS COMMAND" uyarısı aldığında kendini **kilitler**.

> **💾 Önemli Not (Persistence):** Kilit durumu ve Captcha resmi **veritabanına (users.db)** kaydedilir. Bot yeniden başlatılsa bile, eğer kilit açılmadıysa bot **Kilitli (Locked)** olarak başlar.

*   Bu durumda `/send-message` ve diğer işlemler **423 Locked** hatası döner.
*   **Yanıt:**
    ```json
    {
      "success": false,
      "error": "LOCKED: Captcha required. Solve it first.",
      "captchaRequired": true
    }
    ```
*   **Çözüm:** Kullanıcıya `captchaState.imageBase64` verisini gösterin ve manuel işlem yaptırın. Bot `captcha completed` mesajını gördüğünde kilidi otomatik açar.

---

## ⚙️ 4. Ayarlar (Settings)

### 📥 Ayarları Getir
Mevcut yapılandırmanızı görürsünüz.

*   **URL**: `/settings`
*   **Metot**: `GET`

### ✏️ Ayarları Güncelle
Botun davranışını değiştiren ayarları günceller.

*   **URL**: `/bot/settings`
*   **Metot**: `POST`

**Örnek Body:**
```json
{
  "theme": "light",
  "rpcEnabled": true,
  "rpcSettings": {
    "details": "Kodluyor...",
    "state": "Buapi Kullanıyor"
  },
  "gemSystemEnabled": true
}
```

---

### 🎮 Rich Presence (RPC) Ayarı
Botun aktivite durumunu (Oynuyor, İzliyor...) günceller.

*   **URL**: `/settings/rpc`
*   **Metot**: `POST`
*   **Body:**
    ```json
    {
      "rpcEnabled": true,
      "rpcSettings": {
        "type": "PLAYING", 
        "name": "Visual Studio Code",
        "details": "Debugging",
        "state": "v2.0",
        "largeImageKey": "https://example.com/image.png"
      }
    }
    ```
    *   `type`: `PLAYING`, `STREAMING`, `LISTENING`, `WATCHING`, `COMPETING`.

---

## ⚡ 5. Otomatik Mesaj / Görev Sistemi (Auto-Messages)

Bu uç noktalar (endpoints), botun belirli aralıklarla yapacağı **mesaj yayınlama görevlerini** yönetir.
*(Teknik olarak `/commands` altında tutulsa da, bu sistem artık bir otomasyon listesidir)*

> **ℹ️ Terimler:**
> *   `trigger`: **Görev Adı / Referans** (Örn: `Reklam-1`). Sadece sizin tanımanız içindir.
> *   `text`: **Mesaj İçeriği**. Kanala gönderilecek metin.
> *   `interval`: **Döngü Süresi (ms)**. Mesajın kaç milisaniyede bir tekrarlanacağı. **Zorunludur.**
>   *   *Not: Captcha kilidi devreye girerse döngü duraklar, kilit açılınca devam eder.*

### 📋 Görevleri Listele
*   **URL**: `/bot/commands`
*   **Metot**: `GET`

### ➕ Yeni Görev Ekle
*   **URL**: `/bot/commands/add`
*   **Metot**: `POST`

**Body:**
```json
{
  "command": {
    "trigger": "Reklam-1",
    "response": "Bu sunucu harika! Katılın: discord.gg/ornek",
    "interval": 30000 
  }
}
```
*(Yukarıdaki örnekte "Reklam-1" adlı görev, her 30 saniyede bir o mesajı kanala atar)*

### ✏️ Görev Düzenle
Belirli sıradaki (index) görevi günceller.

*   **URL**: `/bot/commands/:index` (Örn: `/bot/commands/0`)
*   **Metot**: `PUT`

### ❌ Görev Sil
*   **URL**: `/bot/commands/:index`
*   **Metot**: `DELETE`

---

## ⚠️ Hata Kodları

| Kod | Anlamı | Açıklama |
| :--- | :--- | :--- |
| **200** | OK | İşlem başarılı. |
| **201** | Created | Başarıyla oluşturuldu (Kayıt vb.). |
| **400** | Bad Request | Eksik parametre veya hatalı veri. |
| **401** | Unauthorized | API Key eksik veya geçersiz. |
| **404** | Not Found | Böyle bir endpoint yok. |
| **423** | Locked | Bot captcha nedeniyle kilitli. |
| **500** | Server Error | Sunucu tarafında bir hata oluştu. |

