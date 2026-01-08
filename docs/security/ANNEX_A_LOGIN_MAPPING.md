# 📄 Mapping Annex A ke Sistem Login
**Modul:** Unified Authentication Gateway  
**Standard:** ISO/IEC 27001 Annex A (Control Mapping)

Sistem login kami dirancang untuk mematuhi standar keamanan internasional dengan kontrol berlapis sebagai berikut:

---

### 🔑 1. Akses Pengamanan Login (Annex A.8.5 - Secure Log-on)
Kontrol ini memastikan bahwa akses ke sistem hanya diberikan kepada pengguna yang sah.
- **Implementasi:**
  - **CAPTCHA Validation:** Mencegah serangan bot otomatis dan "Credential Stuffing".
  - **2FA (Two-Factor Authentication):** Kode verifikasi dikirim ke email sebagai faktor kepemilikan.
  - **Anti-Spam 2FA Throttle:** Mencegah penyalahgunaan SMTP dan serangan DoS lewat email.
- **File Kode:** `server/src/routes/auth.js`, `server/src/services/email.js`

### 🛡️ 2. Perlindungan Brute Force (Annex A.8.18 - Monitoring & Reviews)
Kontrol ini memastikan deteksi dan perlindungan terhadap aktivitas login yang mencurigakan.
- **Implementasi:**
  - **Rate Limiting:** Membatasi percobaan login (max 50/15 min) per IP Address.
  - **Account Blocking:** Kemampuan memblokir Username secara manual lewat Firewall jika terdeteksi aktivitas mencurigakan.
- **File Kode:** `server/src/app.js`, `server/src/middleware/firewall.js`

### 👤 3. Manajemen Identitas (Annex A.5.16 - Identity Management)
Memastikan setiap akses dapat diatribusikan ke individu yang unik.
- **Implementasi:**
  - **Unique Session ID:** UUID v4 dihasilkan untuk setiap login sukses dan disimpan di database.
  - **Device Tracking:** User-Agent dicatat dalam sesi untuk membedakan perangkat login.
- **File Kode:** `server/src/routes/auth.js` (Fungsi `createSession`)

### 🔐 4. Kriptografi Password (Annex A.8.24 - Use of Cryptography)
Melindungi kerahasiaan data otentikasi.
- **Implementasi:**
  - **AES-256 Encryption:** Password tidak disimpan dalam teks biasa (plaintext).
  - **Secure Transmission:** Mendukung penggunaan TLS (HTTPS) untuk melindungi data saat transit.
- **File Kode:** `server/src/utils/helpers.js` (Fungsi `encrypt`/`decrypt`)

### 📋 5. Logging Audit (Annex A.8.15 - Logging)
Mencatat setiap peristiwa otentikasi untuk kebutuhan audit.
- **Implementasi:**
  - **Login Success/Fail Log:** Mencatat tanggal, jam, IP, dan status login.
  - **Audit Information:** Email 2FA mencantumkan IP Address dan Waktu permintaan sebagai informasi audit bagi pengguna.
- **File Kode:** `server/src/utils/logger.js`, `server/src/routes/auth.js`

---

## 🏗️ Alur Keamanan Login (Summary)
1.  **Lapis 1 (Network):** Firewall Check (Blokir IP/User terlarang).
2.  **Lapis 2 (Bot Prev):** Validasi CAPTCHA.
3.  **Lapis 3 (Creds):** Sinkronisasi database dengan enkripsi AES.
4.  **Lapis 4 (Possession):** Pengiriman 2FA ke Email terdaftar.
5.  **Lapis 5 (Session):** Pembuatan Session ID unik di database.
6.  **Lapis 6 (Alert):** Notifikasi ke Telegram Admin (opsional jika dikonfigurasi).

---
**Status Compliance:** ✅ **High Assurance**  
**Authorized by:** Antigravity Security Compliance Engine
