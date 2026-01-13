# 🌐 Yumna Panel v3.1 - Master Guide: Multi-Server Architecture

## 🚀 Overview
Yumna Panel v3.1 memperkenalkan arsitektur **WHM (Web Host Manager) + Agent** yang revolusioner. Dengan arsitektur terdistribusi ini, Anda dapat mengelola puluhan hingga ratusan server dari satu dashboard terpusat tanpa perlu login ke masing-masing server secara manual.

### 🏗️ Arsitektur Sistem
```
┌─────────────────────────────────────────────────────────────┐
│                    YUMNA PANEL v3.1                         │
│                  (Distributed Architecture)                  │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  🖥️  CONTROL PLANE (WHM) - Master Node                      │
│  ┌────────────────────────────────────────────────────┐     │
│  │  • Panel GUI (React) - Monitoring & Management     │     │
│  │  • WHM API (Node.js) - Orchestration Engine        │     │
│  │  • Central Database - Data Aggregator              │     │
│  └────────────────────────────────────────────────────┘     │
│                           │                                  │
│                           │ SSH & HTTP API (Shared Secret)   │
│                           ▼                                  │
└──────────────────────────────────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  🖥️ AGENT 1   │   │  🖥️ AGENT 2   │   │  🖥️ AGENT N   │
│  (Worker Node)│   │  (Worker Node)│   │  (Worker Node)│
├───────────────┤   ├───────────────┤   ├───────────────┤
│ Port: 4001    │   │ Port: 4001    │   │ Port: 4001    │
│ OS: Linux/BSD │   │ OS: Windows   │   │ OS: macOS     │
└───────────────┘   └───────────────┘   └───────────────┘
```

---

## ✅ Status Fitur Multi-Server
Semua modul utama Yumna Panel kini mendukung pemilihan server secara dinamis:

*   **Websites**: Deploy VHost ke server manapun dengan pilihan PHP version.
*   **Databases**: Create MySQL/MariaDB database di server remote.
*   **FTP Accounts**: Kelola akses file antar server.
*   **Email Accounts**: Setup mailbox di node yang diinginkan.
*   **DNS Zones**: Sinkronisasi zona DNS ke PowerDNS cluster.
*   **SSL Certificates**: Penerbitan sertifikat Let's Encrypt per server.
*   **Cron Jobs**: Penjadwalan tugas di server worker tertentu.

---

## ⚡ Deployment Agent (One-Click)
Salah satu fitur unggulan v3.1 adalah kemudahan dalam menambah server baru. Anda tidak perlu menginstal Agent secara manual via CLI.

### **Langkah Penambahan Server:**
1.  Buka menu **Node Orchestration**.
2.  Klik **Provision Node** dan masukkan IP, User, serta Password SSH server remote.
3.  Simpan, lalu klik ikon **Deploy Agent** (⚡).
4.  **Konfigurasi Database Fleksibel**: Sebuah modal akan muncul meminta Anda mengisi kustom `DB_HOST`, `DB_USER`, dan `DB_PASS` untuk Agent tersebut.
5.  Sistem akan otomatis:
    *   Menginstal Node.js & MariaDB.
    *   Mengunggah file Agent ke `/opt/yumnapanel/agent`.
    *   Membuat file `.env` yang lengkap.
    *   Menjalankan Agent sebagai **Systemd Service** (Linux) agar menyala otomatis saat reboot.

---

## 🛡️ Keamanan & Komunikasi
Komunikasi antar server menggunakan standar keamanan tinggi:
*   **Shared Secret**: Setiap request ke Agent divalidasi dengan `AGENT_SECRET` yang unik.
*   **Firewall Management**: Anda dapat mengelola rule IP Table/Firewall Windows untuk semua node dari satu dashboard.
*   **Zero Trust Pattern**: Agent hanya menerima instruksi dari IP Master Node yang telah didaftarkan.

---

## 💡 Best Practices
1.  **Monitor Resource**: Gunakan resource gauge di dashboard untuk melihat beban CPU/RAM sebelum melakukan deployment website baru ke sebuah server.
2.  **Versioning**: Pastikan variabel `PANEL_VERSION` di file `.env` Master Node diset ke `v3.1.0-production`.
3.  **SSH Security**: Gunakan user root atau user dengan akses sudo penuh untuk mempermudah proses deployment otomatis.

---

## 📚 Panduan Terkait
*   [Multi-Server Security Architecture](MULTI_SERVER_SECURITY.md)
*   [Multi-Server Integration Patterns](MULTI_SERVER_INTEGRATION.md)
*   [Website Deployment Details](MULTI_SERVER_WEBSITE_DEPLOYMENT.md)

---
**Version**: 3.1.0
**Status**: ✅ PRODUCTION READY
**Team**: Yumna Panel Core
