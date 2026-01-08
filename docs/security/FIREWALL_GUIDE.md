# 🛡️ Firewall & Cyber-Intelligence Guide

## Overview
Platform ini dilengkapi dengan sistem keamanan multi-layer yang menggabungkan pro-active blocking, real-time threat visualization, dan active intelligence melalui **Zero-Day Heuristics Engine**.

## 🛡️ Key Features

### 1. Active Threat Intelligence & Zero-Day Defense (v1.4.0)
- **Zero-Day Heuristics**: Deteksi signature-less terhadap payload berbahaya (PHP injections, JS obfuscation, reverse shells).
- **Behavioral Scoring**: Sistem reputasi dinamis yang memantau skor risiko tiap IP berdasarkan riwayat perilaku malicious.
- **Shannon Entropy Analysis**: Algoritma matematik untuk mengidentifikasi file/payload yang memiliki tingkat keacakan tinggi, sering digunakan untuk mendeteksi malware yang dipack/enkripsi.
- **Forensic Logs**: Dashboard khusus yang merinci setiap pelanggaran heuristik untuk audit keamanan mendalam.

### 2. Global IP Intelligence (powered by AbuseIPDB™)
- **Reputation Check**: Setiap IP yang terdeteksi melakukan aktvitas mencurigakan dicek terhadap database global AbuseIPDB (100 Juta+ laporan).
- **Confidence Score**: Menampilkan persentase keyakinan bahwa sebuah IP adalah sumber abuse.
- **Technical Fingerprint**: Menampilkan ISP, Domain, Usage Type, dan Geolocation secara detail.
- **Reporting System**: Admin dapat langsung melaporkan IP berbahaya ke AbuseIPDB dari dashboard.

### 3. Interactive Threat Map
- **Missile Animations**: Visualisasi serangan real-time dengan animasi rudal dari asal serangan ke server master.
- **Explosion Effects**: Efek ledakan visual saat serangan mencapai target.
- **Defense Status**: Indikator "UNDER ATTACK" yang aktif hanya saat ada upaya intrusi yang sedang berlangsung secara visual.

### 4. Unified Security Suite
- **Threat Intel Center**: Satu dashboard untuk memantau Behavioral Scores dan Zero-Day logs.
- **Whitelist/Geo-block**: Mengelola pengecualian dan pemblokiran regional secara manual.
- **Bot Mitigation**: Signature-based blocking untuk 500+ bot (AI, Scrapers, SEO).

### 4. Unblock Appeals System
- **Request Management**: Interface profesional untuk mengaudit permintaan unblock dari user yang terjaring firewall.
- **Theme-Aware UI**: Tampilan dashboard appeals yang otomatis mengikuti tema Light/Dark mode.

## 📊 Konfigurasi Lanjutan (.env)

| Key | Deskripsi | Default |
|-----|-----------|---------|
| `ABUSE_IPDB_KEY` | API Key dari abuseipdb.com (v2) | Required for Intel |
| `ENCRYPTION_KEY` | Kunci enkripsi AES-256 (min 32 char) | Required |
| `FIREWALL_THRESHOLD` | Batas error code sebelum auto-block | 40 |

## 🛠️ Security Workflows

### Menganalisa Ancaman (Target Intel)
1. Klik marker atau baris log pada **Threat Map**.
2. Modal **Target Intel** akan muncul menampilkan ringkasan IP.
3. Klik pada **Abuse Confidence Score** untuk membuka **Full Intelligence Report**.
4. Gunakan **Network Fingerprint** untuk melihat apakah IP tersebut berasal dari Data Center atau ISP Resmi.
5. Klik **REPORT MALICIOUS** jika aktivitas tersebut adalah serangan nyata.

### Mengelola Whitelist
- IP yang masuk Whitelist tidak akan pernah terblokir oleh auto-blocking system.
- Gunakan fitur ini untuk IP internal kantor atau server monitoring.

## 📁 Database Schema Updates (v1.4.0)

### Tabel `ip_reputation_cache` (NEW)
Digunakan untuk menyimpan hasil lookup dari AbuseIPDB agar lebih cepat dan hemat kuota API.
```sql
CREATE TABLE ip_reputation_cache (
    ip VARCHAR(45) PRIMARY KEY,
    abuse_score INT,
    total_reports INT,
    country_code CHAR(2),
    isp VARCHAR(255),
    last_check DATETIME,
    raw_data JSON
);
```

### Tabel `threat_logs` (NEW)
Menyimpan detail setiap pelanggaran heuristik dan payload berbahaya.
```sql
CREATE TABLE threat_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip VARCHAR(45),
    threat_type VARCHAR(100),
    severity ENUM('Low', 'Medium', 'High', 'Critical'),
    score INT,
    details TEXT,
    request_path TEXT,
    request_method VARCHAR(10),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tabel `security_reputation` (NEW)
Menyimpan akumulasi skor perilaku (behavioral score) tiap IP secara persisten.
```sql
CREATE TABLE security_reputation (
    ip VARCHAR(45) PRIMARY KEY,
    behavioral_score INT DEFAULT 0,
    total_violations INT DEFAULT 0,
    risk_level ENUM('Low', 'Medium', 'High', 'Critical'),
    last_violation_at DATETIME
);
```

## 📝 Best Practices Security
1. **Initialize Security Tables**: Jalankan `node init-security-db.js` sebelum mengaktifkan Zero-Day Protection.
2. **Review Threat Intel Center**: Cek tab **Threat Intelligence** setiap hari untuk memantau tren serangan heuristik.
3. **Monitor Risk Level**: IP dengan level "Critical" (> 150 score) harus divalidasi apakah perlu masuk permanent Blacklist.
4. **Shannon Threshold**: Default entropy threshold adalah 5.2. Jika banyak false positive pada file terkompresi legiti, sesuaikan di `threatDetection.js`.

## 🐛 Troubleshooting Cyber-Intel

### Modal Report Terpotong
- Update terbaru telah memindahkan modal ke `fixed` position dengan dual-column layout. Pastikan browser sudah melakukan hard-refresh jika tampilan masih berantakan.

### Status Selalu "UNDER ATTACK"
- Sistem terbaru hanya akan menampilkan "UNDER ATTACK" jika ada animasi serangan aktif di peta. Jika status tidak berubah, cek apakah ada tab lain yang sedang memutar data realtime.

### AbuseIPDB Error 500
- Pastikan API Key di `.env` sudah benar dan kuota bulanan AbuseIPDB Anda belum habis.

---
**Version**: 1.4.0 | **Last Updated**: 2026-01-03
