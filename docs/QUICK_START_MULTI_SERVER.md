# 🚀 Quick Start: Menggabungkan 2 Panel Menjadi Satu

## 📋 Ringkasan

Yumna Panel v3.1 menggunakan arsitektur **1 WHM (Control Plane)** + **Multiple Agents (Workers)**.

```
┌─────────────────────────────────────┐
│  Panel GUI + WHM (Server Utama)     │  ← Satu dashboard untuk semua
│  http://localhost:3001              │
└──────────────┬──────────────────────┘
               │
       ┌───────┴───────┐
       ▼               ▼
   Server 1        Server 2
   (Agent)         (Agent)
```

---

## ⚡ Cara Cepat (3 Langkah)

### **Langkah 1: Pastikan WHM Berjalan di Server Utama**

```bash
# Cek apakah WHM sudah aktif
netstat -ano | findstr ":4000"

# Jika belum, jalankan:
cd c:\YumnaPanel\whm
npm run dev
```

### **Langkah 2: Install Agent di Server Kedua**

**Di Server 2** (yang akan dikontrol):

```bash
# Clone repository
git clone https://github.com/ycopyer/yumna-panel.git c:\YumnaPanel
cd c:\YumnaPanel\agent

# Install dependencies
npm install

# Buat file .env
echo PORT=4001 > .env
echo AGENT_SECRET=your-secret-key >> .env
echo WHM_URL=http://192.168.1.100:4000 >> .env

# Jalankan Agent
npm run dev
```

### **Langkah 3: Daftarkan Server Kedua ke Panel**

**Opsi A: Via GUI (Mudah)**

1. Buka Panel GUI: `http://localhost:3001`
2. Login sebagai Admin
3. Klik **System** → **Server Management**
4. Klik **Provision Node**
5. Isi form:
   - **Name**: Server 2
   - **IP**: 192.168.1.101
   - **SSH User**: root
   - **SSH Password**: ********
6. Klik **Initialize Provisioning**

**Opsi B: Via Script (Otomatis)**

```bash
# Di Server Utama
cd c:\YumnaPanel\scripts
powershell -ExecutionPolicy Bypass -File add-server.ps1
```

---

## ✅ Verifikasi

Setelah integrasi berhasil, Anda akan melihat:

1. **Di Panel GUI**: 2 server cards dengan metrics real-time
2. **Status**: Kedua server menampilkan status "Active" 🟢
3. **Metrics**: CPU, RAM, Disk usage dari kedua server

---

## 🎯 Apa yang Bisa Dilakukan?

Dari **1 dashboard**, Anda bisa:

- ✅ Monitor semua server (CPU, RAM, Disk)
- ✅ Deploy website ke multiple servers
- ✅ Restart services (Nginx, MySQL, dll) di server manapun
- ✅ Manage databases di semua server
- ✅ Setup load balancing
- ✅ Backup/restore dari semua server

---

## 📚 Dokumentasi Lengkap

Lihat: `docs/MULTI_SERVER_INTEGRATION.md`

---

## ❓ FAQ

**Q: Apakah saya perlu 2 Panel GUI?**
**A:** Tidak! Cukup 1 Panel GUI untuk mengontrol semua server.

**Q: Berapa banyak server yang bisa diintegrasikan?**
**A:** Unlimited! Yumna Panel v3.1 dirancang untuk distributed architecture.

**Q: Apakah Agent harus di server yang berbeda?**
**A:** Tidak harus. Anda bisa menjalankan multiple Agents di 1 server (untuk testing).

**Q: Bagaimana cara menghapus server?**
**A:** Di Panel GUI → Server Management → Klik tombol Trash di server card.

---

**Made with ❤️ by Yumna Panel Team**
