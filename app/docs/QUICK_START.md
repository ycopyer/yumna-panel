# 🚀 Quick Start Guide - Yumna Panel

## Langkah Cepat (5 Menit)

### 1. Pre-requisites (Windows)
Untuk setup tercepat di Windows, gunakan script provisioning otomatis:
```powershell
scripts\run\online.bat
```
Script ini akan menginstall Nginx, PHP, MariaDB, dan dependensi lainnya secara otomatis.

### 2. Manual Installation
Jika ingin setup manual:
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies  
cd ../client
npm install
```

### 3. Setup Configuration (.env)
Buat file `.env` di folder `server`:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=yumna_db
# KUNCI ENKRIPSI HARUS MINIMAL 32 KARAKTER
ENCRYPTION_KEY=Apakatadunia123456789012ILoveYouFull
```

### 4. Setup Database & Security
```bash
cd server
npm run init-db
node init-security-db.js
node src/scripts/migrate_bot_enum.js
node src/scripts/seed_massive_bots.js
```

### 5. Jalankan Aplikasi (Production)
```bash
pm2 start ecosystem.config.js
```

### 6. Akses Aplikasi
Buka browser: **http://localhost:5000**

**Login Default:**
- Username: `admin`
- Password: `admin`

## ✅ Fitur Utama (v1.6.0)

- **Hosting Suite**: Auto-Website Wizard, Windows SSL (Win-ACME), PHP Selector, MySQL DB Cloning.
- **Advanced Security**: Argon2id Hashing, Zero-Day Heuristics, Bot Protection, Real-time Threat Map.
- **Explorer**: Pro-grade file management with recursive search, drag & drop, and PWA support.
