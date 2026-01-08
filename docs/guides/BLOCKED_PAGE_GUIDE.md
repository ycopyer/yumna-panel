# Blocked Page & Telegram Notification - Implementation Guide

## Overview
Fitur ini memberikan pengalaman yang lebih baik untuk user yang terblokir dan notifikasi real-time ke admin via Telegram.

## 🎨 Blocked Page Features

### Tampilan Halaman Blocked
Ketika IP/User terblokir, mereka akan diarahkan ke halaman profesional yang menampilkan:

1. **Header Alert** - Icon shield dengan animasi pulse
2. **IP Information** - IP address user yang terblokir
3. **Block Reason** - Alasan kenapa diblokir
4. **Status Badge** - Badge merah "BLOCKED"
5. **Instruksi Lengkap** - 3 langkah apa yang harus dilakukan
6. **Contact Information** - Email & Phone IT Help Desk
7. **Block ID** - Unique identifier untuk tracking

### URL Format
```
/blocked?ip=192.168.1.1&reason=Suspicious+activity&type=ip
```

### Konfigurasi Contact Info
Tambahkan ke database `settings`:

```sql
INSERT INTO settings (key_name, value_text) VALUES 
('contact_email', 'admin@yourdomain.com'),
('contact_phone', '+62 812-3456-7890');
```

---

## 📱 Telegram Notification Features

### Format Notifikasi
Ketika IP auto-blocked, admin akan menerima notifikasi Telegram dengan format:

```
🚨 FIREWALL AUTO-BLOCK ALERT 🚨

📍 IP Address: 192.168.1.100
🌍 Country: Indonesia
⚠️ Total Violations: 45 suspicious responses
📊 Response Codes: 404, 403, 500
⏱️ Time Window: 60 seconds
🔐 Access Types: view, download, login

📋 Recent Activity:
1. view - Previewed image: /folder/file.jpg
2. download - Downloaded: /documents/report.pdf
3. login - Failed login attempt
4. view - Accessed: /api/explorer
5. download - Downloaded: /data/export.csv

🛡️ Action Taken: IP blocked for 24 hours

⏰ Timestamp: 29/12/2024, 13:45:30
```

### Informasi yang Dikirim
1. **IP Address** - IP yang diblokir (dengan format code)
2. **Country** - Negara asal IP (dari ip-api.com)
3. **Total Violations** - Jumlah response mencurigakan
4. **Response Codes** - Unique codes yang di-trigger (404, 403, dll)
5. **Time Window** - Periode monitoring (default: 60 detik)
6. **Access Types** - Jenis akses yang dilakukan (login, view, download, dll)
7. **Recent Activity** - 5 aktivitas terakhir dari IP tersebut
8. **Action Taken** - Durasi block (24 jam)
9. **Timestamp** - Waktu block (timezone Jakarta)

---

## 🔧 Setup & Configuration

### 1. Database Migration
Pastikan kolom `country` sudah ada:

```sql
ALTER TABLE firewall ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT NULL;
```

### 2. Upload Files ke Production

**Backend Files:**
```bash
server/src/middleware/firewall.js          # UPDATED - Redirect logic
server/src/middleware/responseMonitor.js   # UPDATED - Telegram notification
server/src/routes/utility.js               # NEW - Get IP & settings
server/src/app.js                          # UPDATED - Mount utility routes
```

**Frontend Files:**
```bash
client/src/components/BlockedPage.tsx      # NEW - Blocked page UI
client/src/App.tsx                         # UPDATED - Add /blocked route
```

### 3. Konfigurasi Telegram (Jika Belum)

Di database `settings`:

```sql
-- Enable notifications
UPDATE settings SET value_text = 'true' WHERE key_name = 'enable_notifications';

-- Set Bot Token (dari @BotFather)
UPDATE settings SET value_text = 'YOUR_BOT_TOKEN' WHERE key_name = 'telegram_bot_token';

-- Set Chat ID (dari @userinfobot)
UPDATE settings SET value_text = 'YOUR_CHAT_ID' WHERE key_name = 'telegram_chat_id';
```

### 4. Restart Backend

```bash
pm2 restart all
# atau
node index.js
```

---

## 🧪 Testing

### Test Blocked Page

1. **Manual Block IP:**
   ```sql
   INSERT INTO firewall (type, target, reason, country) 
   VALUES ('ip', 'YOUR_IP', 'Testing blocked page', 'Indonesia');
   ```

2. **Akses Website:**
   - Buka browser
   - Akses `https://drive.rssd.my.id`
   - Anda akan di-redirect ke `/blocked`
   - Lihat halaman blocked dengan info lengkap

3. **Unblock:**
   ```sql
   DELETE FROM firewall WHERE target = 'YOUR_IP';
   ```

### Test Auto-Block + Telegram

1. **Set Threshold Rendah:**
   - Buka Firewall Management
   - Tab "Auto-Block Settings"
   - Set: Threshold=5, Window=60, Codes=404

2. **Trigger Auto-Block:**
   ```bash
   # Akses endpoint yang tidak ada 5x:
   curl https://drive.rssd.my.id/api/test404
   curl https://drive.rssd.my.id/api/test404
   curl https://drive.rssd.my.id/api/test404
   curl https://drive.rssd.my.id/api/test404
   curl https://drive.rssd.my.id/api/test404
   ```

3. **Verifikasi:**
   - Cek Telegram → Notifikasi muncul
   - Akses website → Redirect ke blocked page
   - Cek database:
     ```sql
     SELECT * FROM firewall WHERE target = 'YOUR_IP';
     ```

---

## 📊 Monitoring

### Cek Blocked IPs
```sql
SELECT id, type, target, country, reason, createdAt, expiresAt 
FROM firewall 
ORDER BY createdAt DESC 
LIMIT 20;
```

### Cek Auto-Block Logs
```bash
pm2 logs | grep "Auto-blocking"
```

### Cek Telegram Delivery
```bash
pm2 logs | grep "NOTIF"
```

---

## 🎨 Customization

### Ubah Contact Info di Blocked Page

Edit `BlockedPage.tsx`:

```typescript
<BlockedPage 
    contactEmail="support@yourdomain.com"
    contactPhone="+62 812-3456-7890"
    siteTitle="Your Site Name"
/>
```

Atau simpan di database dan fetch dari API.

### Ubah Durasi Block

Edit `responseMonitor.js` line 124:

```javascript
// Dari 24 jam ke 48 jam:
expiresAt: DATE_ADD(NOW(), INTERVAL 48 HOUR)
```

### Ubah Format Telegram

Edit `responseMonitor.js` line 146-164:

```javascript
const telegramMessage = `
🚨 CUSTOM FORMAT
IP: ${ip}
Country: ${country}
...
`;
```

---

## 🔐 Security Best Practices

### 1. Whitelist Important IPs
```sql
-- Jangan auto-block IP kantor/admin
-- Implementasi whitelist di responseMonitor.js:
const whitelistedIPs = ['1.2.3.4', '5.6.7.8'];
if (whitelistedIPs.includes(ip)) return;
```

### 2. Rate Limit Telegram
Jika terlalu banyak block, Telegram bisa rate-limit. Tambahkan debounce:

```javascript
const lastNotification = new Map();
const NOTIFICATION_COOLDOWN = 60000; // 1 menit

if (lastNotification.get(ip) && Date.now() - lastNotification.get(ip) < NOTIFICATION_COOLDOWN) {
    return; // Skip notification
}
lastNotification.set(ip, Date.now());
```

### 3. Log Retention
Auto-delete old blocks:

```sql
-- Cron job untuk hapus block expired > 7 hari
DELETE FROM firewall 
WHERE expiresAt < DATE_SUB(NOW(), INTERVAL 7 DAY);
```

---

## ❓ Troubleshooting

### Blocked Page Tidak Muncul
- Cek route di `App.tsx` → `/blocked` harus ada
- Cek `firewall.js` middleware → redirect logic
- Hard refresh browser: `Ctrl+Shift+R`

### Telegram Tidak Terkirim
```bash
# Cek logs:
pm2 logs | grep "NOTIF"

# Cek settings:
SELECT * FROM settings WHERE key_name LIKE 'telegram%';

# Test manual:
curl -X POST "https://api.telegram.org/botYOUR_TOKEN/sendMessage" \
  -d "chat_id=YOUR_CHAT_ID" \
  -d "text=Test message"
```

### IP Tidak Terdeteksi dengan Benar
```javascript
// Cek getClientIp di helpers.js
// Pastikan handle proxy/cloudflare:
const ip = req.headers['cf-connecting-ip'] || 
           req.headers['x-forwarded-for']?.split(',')[0] || 
           req.connection.remoteAddress;
```

### Country Selalu "Unknown"
- Pastikan server bisa akses internet
- API ip-api.com rate limit: 45 req/minute
- Gunakan cache untuk IP yang sama

---

## 📈 Future Enhancements

- [ ] Email notification (selain Telegram)
- [ ] Discord webhook support
- [ ] Custom block duration per IP
- [ ] Whitelist management UI
- [ ] Block history chart
- [ ] Export blocked IPs to CSV
- [ ] Geo-blocking by country
- [ ] Auto-unblock after verification

---

## 📝 Summary

✅ **Blocked Page**: Halaman profesional dengan instruksi lengkap
✅ **Telegram Alert**: Notifikasi real-time dengan detail lengkap
✅ **Auto-Block**: Otomatis blokir IP mencurigakan
✅ **Country Tracking**: Geo-location setiap IP
✅ **Access History**: Log aktivitas terakhir
✅ **Contact Info**: Email & Phone IT Help Desk

Semua fitur sudah terintegrasi dan siap production! 🚀
