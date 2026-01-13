# 🌐 Multi-Server Integration Guide
## Menggabungkan 2 Panel (atau lebih) Menjadi Satu Dashboard Terpusat

Yumna Panel v3.1 menggunakan arsitektur **WHM (Web Host Manager) + Agent** yang memungkinkan Anda mengelola **unlimited servers** dari satu dashboard terpusat.

---

## 📐 Arsitektur Distributed Control Plane

```
┌─────────────────────────────────────────────────────────────┐
│                    YUMNA PANEL v3.1                         │
│                  (Distributed Architecture)                  │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  🖥️  CONTROL PLANE (WHM) - Server Utama                     │
│  ┌────────────────────────────────────────────────────┐     │
│  │  • Panel GUI (React) - Port 3001/5173              │     │
│  │  • WHM API (Node.js) - Port 4000                   │     │
│  │  • Database (MariaDB) - Port 3306                  │     │
│  │  • Agent Lokal - Port 4001                         │     │
│  └────────────────────────────────────────────────────┘     │
│                           │                                  │
│                           │ HTTP/HTTPS API                   │
│                           ▼                                  │
└──────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  🖥️ SERVER 1  │   │  🖥️ SERVER 2  │   │  🖥️ SERVER N  │
│  (Remote)     │   │  (Remote)     │   │  (Remote)     │
├───────────────┤   ├───────────────┤   ├───────────────┤
│ Agent: 4001   │   │ Agent: 4001   │   │ Agent: 4001   │
│ IP: 10.0.0.2  │   │ IP: 10.0.0.3  │   │ IP: 10.0.0.N  │
└───────────────┘   └───────────────┘   └───────────────┘
```

---

## 🎯 Skenario Integrasi

### **Skenario 1: Anda Punya 2 Server Terpisah**
- **Server A**: Panel Yumna di `192.168.1.100`
- **Server B**: Panel Yumna di `192.168.1.101`

**Solusi**: Jadikan **Server A** sebagai **Control Plane (WHM)**, dan **Server B** sebagai **Agent Node**.

### **Skenario 2: Anda Punya 2 Panel di Server yang Sama**
- **Panel 1**: Berjalan di port 4000 (WHM)
- **Panel 2**: Berjalan di port 5000 (WHM kedua)

**Solusi**: Matikan WHM kedua, gunakan hanya **1 WHM** untuk mengontrol semua Agent.

---

## 🔧 Langkah-Langkah Integrasi

### **Metode 1: Integrasi Server Remote (Recommended)**

#### **Step 1: Setup Control Plane (Server Utama)**

Di **Server A** (yang akan menjadi Control Plane):

1. Pastikan WHM, Panel, dan Database sudah berjalan:
```bash
# Cek status layanan
netstat -ano | findstr ":4000"  # WHM API
netstat -ano | findstr ":3001"  # Panel GUI
netstat -ano | findstr ":3306"  # MariaDB
```

2. Pastikan tabel `servers` ada di database:
```sql
USE yumna_panel;

-- Cek tabel servers
DESCRIBE servers;

-- Jika belum ada, jalankan migration
-- (Biasanya sudah otomatis dibuat saat instalasi)
```

#### **Step 2: Automated Deployment via WHM (Recommended)**

Di **Server A** (Control Plane), Anda sekarang dapat menginstal Agent ke **Server B** tanpa mengetik satu baris perintah pun di terminal server remote:

1.  Buka **Yumna Panel GUI** → **System** → **Server Management**.
2.  Klik **Add New Server**, masukkan detail SSH (IP, User, Password, Port).
3.  Klik **Add Server**.
4.  Pada list server, klik tombol **"Deploy Agent"** (Ikon ⚡).
5.  **Konfigurasi Database**: Masukkan kredensial database untuk Agent di modal yang muncul.
6.  Sistem akan melakukan koneksi SSH, menginstal Node.js, mentransfer file, dan menjalankan service Agent secara otomatis.

#### **Step 3: Verifikasi via Dashboard**

Setelah status server berubah menjadi **"Active"**, Anda akan langsung melihat statistik CPU, RAM, dan Disk dari server tersebut di dashboard utama.

---

### **Metode Alternatif: Integrasi Manual (Legacy)**
(Hanya gunakan jika server remote tidak mendukung SSH/SFTP)

---

#### **Step 3: Daftarkan Server Remote ke Control Plane**

Di **Server A** (Control Plane), gunakan API atau GUI untuk menambahkan server:

**Via API (cURL):**
```bash
curl -X POST http://localhost:4000/api/servers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "Server B - Production",
    "hostname": "server-b.example.com",
    "ip": "192.168.1.101",
    "ssh_user": "root",
    "ssh_password": "your-ssh-password",
    "ssh_port": 22,
    "is_local": false
  }'
```

**Via GUI (Panel):**
1. Login ke Panel di `http://localhost:3001`
2. Navigasi ke **System** → **Server Management**
3. Klik **Add New Server**
4. Isi form:
   - **Name**: Server B - Production
   - **Hostname**: server-b.example.com
   - **IP Address**: 192.168.1.101
   - **SSH User**: root
   - **SSH Password**: ********
   - **SSH Port**: 22
   - **Is Local**: ❌ (unchecked)
5. Klik **Add Server**

#### **Step 4: Verifikasi Koneksi**

```bash
# Di Server A, cek status server
curl -X GET http://localhost:4000/api/servers \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Trigger manual sync
curl -X POST http://localhost:4000/api/servers/2/sync \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

### **Metode 2: Integrasi Local Multi-Instance**

Jika Anda punya 2 panel di **server yang sama** (misalnya untuk development):

#### **Step 1: Hentikan Panel Kedua**
```bash
# Matikan WHM kedua
taskkill /F /IM node.exe /T
```

#### **Step 2: Gunakan 1 WHM untuk Semua Agent**

Edit konfigurasi Agent kedua untuk menunjuk ke WHM yang sama:

```bash
# Di folder agent kedua
cd c:\YumnaPanel2\agent

# Edit .env
cat > .env << EOF
PORT=4002  # Port berbeda dari agent pertama
AGENT_SECRET=same-secret-as-first-agent
WHM_URL=http://localhost:4000  # WHM yang sama
EOF

# Jalankan agent kedua
npm run dev
```

#### **Step 3: Daftarkan Agent Kedua sebagai "Local" Server**

```bash
curl -X POST http://localhost:4000/api/servers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "Local Agent 2",
    "hostname": "localhost",
    "ip": "127.0.0.1",
    "is_local": true
  }'
```

---

## 🗄️ Struktur Database

Tabel `servers` menyimpan informasi semua server:

```sql
CREATE TABLE IF NOT EXISTS servers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    hostname VARCHAR(255),
    ip VARCHAR(45) NOT NULL,
    is_local BOOLEAN DEFAULT 0,
    ssh_user VARCHAR(100),
    ssh_password TEXT,
    ssh_port INT DEFAULT 22,
    status ENUM('active', 'offline', 'connection_error', 'unknown') DEFAULT 'unknown',
    cpu_usage DECIMAL(5,2) DEFAULT 0,
    ram_usage DECIMAL(5,2) DEFAULT 0,
    disk_usage DECIMAL(5,2) DEFAULT 0,
    uptime BIGINT DEFAULT 0,
    last_seen TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 🔐 Keamanan

### **1. Agent Secret**
Pastikan semua Agent menggunakan `AGENT_SECRET` yang sama dengan WHM:

```env
# Di WHM (.env)
AGENT_SECRET=super-secret-key-12345

# Di Agent (.env)
AGENT_SECRET=super-secret-key-12345
```

### **2. Enkripsi SSH Password**
Password SSH di-enkripsi sebelum disimpan di database menggunakan AES-256.

### **3. Firewall Rules**
Buka port Agent (4001) hanya untuk IP WHM:

```bash
# Linux (iptables)
iptables -A INPUT -p tcp --dport 4001 -s 192.168.1.100 -j ACCEPT
iptables -A INPUT -p tcp --dport 4001 -j DROP

# Windows (netsh)
netsh advfirewall firewall add rule name="Yumna Agent" dir=in action=allow protocol=TCP localport=4001 remoteip=192.168.1.100
```

---

## 📊 Monitoring & Heartbeat

WHM secara otomatis melakukan **heartbeat check** setiap **5 menit** untuk semua server:

- **Local Agent**: HTTP call ke `http://localhost:4001/heartbeat`
- **Remote Agent**: SSH connection + metrics collection

Metrics yang dikumpulkan:
- ✅ CPU Usage
- ✅ RAM Usage
- ✅ Disk Usage
- ✅ Network I/O
- ✅ Uptime

---

## 🎨 Tampilan GUI Multi-Server

Setelah integrasi, di Panel GUI Anda akan melihat:

### **Dashboard Utama**
```
┌─────────────────────────────────────────────────────┐
│  📊 Yumna Panel - Multi-Server Dashboard            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🖥️  Server A (Local)          🟢 Active           │
│      CPU: 45% | RAM: 60% | Disk: 30%               │
│                                                     │
│  🖥️  Server B (Remote)         🟢 Active           │
│      CPU: 30% | RAM: 40% | Disk: 50%               │
│                                                     │
│  🖥️  Server C (Remote)         🔴 Offline          │
│      Last seen: 2 hours ago                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### **Server Management Page**
- **List Servers**: Lihat semua server dengan status real-time
- **Add Server**: Tambah server baru
- **Sync Server**: Force sync metrics
- **View Logs**: Lihat logs dari server remote
- **Restart Services**: Restart Nginx, Apache, MySQL, dll dari GUI

---

## 🚀 Operasi Multi-Server

### **1. Deploy Website ke Multiple Servers**

```javascript
// Contoh: Deploy website ke Server A dan Server B
POST /api/websites
{
  "domain": "example.com",
  "servers": [1, 2],  // Server ID 1 dan 2
  "webserver": "nginx",
  "php_version": "8.2"
}
```

### **2. Load Balancing**

WHM dapat mengkonfigurasi Nginx sebagai load balancer:

```nginx
upstream example_backend {
    server 192.168.1.100:80 weight=3;
    server 192.168.1.101:80 weight=2;
}

server {
    listen 80;
    server_name example.com;
    
    location / {
        proxy_pass http://example_backend;
    }
}
```

### **3. Database Replication**

Aktifkan replikasi database antar server:

```bash
# Di Panel GUI
System → Database → Replication → Add Slave Server
```

---

## 🛠️ Troubleshooting

### **Problem 1: Agent tidak terdeteksi**

**Solusi:**
```bash
# Cek apakah Agent berjalan
netstat -ano | findstr ":4001"

# Cek firewall
telnet 192.168.1.101 4001

# Cek logs Agent
tail -f /opt/yumna-panel/agent/logs/agent.log
```

### **Problem 2: Status server "connection_error"**

**Solusi:**
```bash
# Trigger manual sync
curl -X POST http://localhost:4000/api/servers/2/sync \
  -H "Authorization: Bearer YOUR_TOKEN"

# Cek SSH credentials
ssh root@192.168.1.101
```

### **Problem 3: Metrics tidak update**

**Solusi:**
```sql
-- Cek tabel usage_metrics
SELECT * FROM usage_metrics WHERE serverId = 2 ORDER BY timestamp DESC LIMIT 10;

-- Restart ServerNodeService
# Restart WHM
cd c:\YumnaPanel\whm
npm run dev
```

---

## 📚 API Reference

### **GET /api/servers**
List semua server

**Response:**
```json
[
  {
    "id": 1,
    "name": "Server A - Local",
    "hostname": "localhost",
    "ip": "127.0.0.1",
    "is_local": true,
    "status": "active",
    "cpu_usage": 45.2,
    "ram_usage": 60.5,
    "disk_usage": 30.1,
    "last_seen": "2026-01-12T12:30:00Z"
  },
  {
    "id": 2,
    "name": "Server B - Production",
    "hostname": "server-b.example.com",
    "ip": "192.168.1.101",
    "is_local": false,
    "status": "active",
    "cpu_usage": 30.0,
    "ram_usage": 40.0,
    "disk_usage": 50.0,
    "last_seen": "2026-01-12T12:29:00Z"
  }
]
```

### **POST /api/servers**
Tambah server baru

**Request:**
```json
{
  "name": "Server C - Staging",
  "hostname": "staging.example.com",
  "ip": "192.168.1.102",
  "ssh_user": "root",
  "ssh_password": "password123",
  "ssh_port": 22,
  "is_local": false
}
```

### **POST /api/servers/:id/sync**
Force sync server metrics

### **POST /api/servers/:id/restart**
Restart service di server remote

**Request:**
```json
{
  "service": "nginx"  // nginx, apache, mysql, postgresql
}
```

### **DELETE /api/servers/:id**
Hapus server dari panel (tidak bisa hapus local master)

---

## 🎯 Best Practices

1. **Gunakan 1 WHM untuk semua server** - Jangan jalankan multiple WHM
2. **Backup database WHM secara berkala** - Semua konfigurasi ada di sini
3. **Gunakan SSH Key authentication** - Lebih aman dari password
4. **Monitor heartbeat logs** - Deteksi server down lebih cepat
5. **Setup alerting** - Email/Slack notification saat server offline
6. **Use VPN/Private Network** - Jangan expose Agent port ke public internet

---

## 📞 Support

Jika ada pertanyaan atau masalah:
- **Documentation**: https://docs.yumnapanel.com
- **Discord**: https://discord.gg/yumnapanel
- **Email**: support@yumnapanel.com

---

**Made with ❤️ by Yumna Panel Team**
**Version**: 3.0.0
**Last Updated**: 2026-01-12
