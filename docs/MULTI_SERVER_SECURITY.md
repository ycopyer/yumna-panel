# 🛡️ Multi-Server Security Architecture

## 🔒 Overview

Keamanan dalam arsitektur distributed/multi-server Yumna Panel dibangun di atas prinsip **"Zero Trust"** (Jangan percaya siapapun, verifikasi semuanya). Meskipun server-server ini milik Anda, kita tetap menganggap jaringan di antaranya tidak aman.

---

## 1. Transport Security (Jalur Komunikasi)

### **A. Agent Communication**
Komunikasi antara **WHM (Control Plane)** dan **Agent (Worker Nodes)** sangat sensitif karena Agent memiliki akses root (via Node.js).

*   **Mechanism**: HTTP Headers Authentication
*   **Header**: `X-Agent-Secret`
*   **Best Practice**:
    *   Gunakan **VPN / WireGuard** antar server jika memungkinkan.
    *   Jika via Public Internet, **WAJIB menggunakan HTTPS/SSL** untuk API Agent.
    *   Whitelist IP: Agent hanya boleh menerima request dari IP WHM.

### **B. Database Transport**
*   **Local**: Socket/Localhost (Aman)
*   **Remote**:
    *   Gunakan **SSL/TLS** untuk koneksi MySQL antar server.
    *   Bind MySQL hanya ke IP VPN (Internal IP), jangan ke 0.0.0.0 (Public IP) kecuali terpaksa dan di-firewall.

---

## 2. Authentication Security (Verifikasi Identitas)

### **A. Shared Secret System**
Setiap request dari WHM ke Agent harus menyertakan **Secret Key** yang identik.

*   **WHM Config** (`whm/.env`):
    ```env
    AGENT_SECRET=yumna_super_secret_key_change_me
    ```
*   **Agent Config** (`agent/.env`):
    ```env
    AGENT_SECRET=yumna_super_secret_key_change_me
    ```

**Flow:**
1. WHM kirim request ke Agent: `POST /api/websites`
2. Header: `X-Agent-Secret: yumna_super_secret_key_change_me`
3. Agent terima request.
4. Agent cek: Apakah `req.headers['x-agent-secret'] === process.env.AGENT_SECRET`?
   *   **Match**: Proses request.
   *   **Mismatch**: Reject `401 Unauthorized`.

### **B. API Gateway Security**
User tidak pernah berinteraksi langsung dengan Agent.
*   **User** → **WHM** (Auth Token Verified) → **Agent** (Secret Verified)
*   Ini mencegah User mem-bypass permission check di WHM.

---

## 3. Application Security (Firewall & Isolation)

### **A. Centralized Firewall Management**
Fitur Security yang baru saja diimplementasikan (`security.js`) memungkinkan Anda mengelola Firewall di semua server dari satu tempat.

*   **Global Rules**: Blokir IP Hacker di **SEMUA** server sekaligus.
*   **Local Rules**: Buka port 80/443 hanya di Web Server, buka port 3306 hanya di DB Server.

**Contoh Strategi:**
*   **WHM Server**: Buka port 3000 (Panel), 4000 (API). Tutup lainnya.
*   **Web Server**: Buka port 80, 443. Tutup 3306 (DB).
*   **DB Server**: Buka port 3306 (Hanya dari IP Web Server). Tutup 80/443.

### **B. Process Isolation**
*   Setiap website berjalan dengan **User Linux terpisah**.
*   PHP-FPM pool terisolasi.
*   Docker container isolation (jika menggunakan fitur Docker baru).

---

## 🚨 Security Checklist untuk Production

### **1. Secure the Secret**
Ganti `AGENT_SECRET` default dengan string acak panjang (64 char).
```bash
openssl rand -hex 32
```

### **2. Firewall (UFW/IPTables)**
Pastikan Agent Port (default: 4001) **HANYA** bisa diakses oleh IP WHM.

**Di Server Agent:**
```bash
# Allow SSH
ufw allow 22
# Allow WHM IP to access Agent
ufw allow from <WHM_IP_ADDRESS> to any port 4001
# Allow Web Traffic
ufw allow 80
ufw allow 443
# Deny everything else
ufw enable
```

### **3. SSL for Agent**
Jangan jalankan Agent via HTTP di public network. Gunakan Reverse Proxy (Nginx) di depan Agent untuk handle SSL, atau setup Stunnel.

### **4. Database Access**
Jangan gunakan `root` user untuk koneksi aplikasi. Buat user spesifik per database.

---

## 🔍 Audit & Monitoring

### **Activity Logs**
Semua aksi "Cross-Server" dicatat di database WHM.
*   "Website Created on Server B by User A"
*   "Firewall Rule Added to All Servers by Admin"

### **Agent Logs**
Selalu cek logs di Agent (`pm2 logs agent`) untuk melihat percobaan akses ganda atau unauthorized.

---

**Kesimpulan:**
Yumna Panel didesain dengan keamanan berlapis. Kunci utamanya adalah **isolasi jaringan** (Firewall) dan **kekuatan Secret Key**. Jika Anda mengikuti checklist di atas, infrastruktur multi-server Anda akan sangat aman.
