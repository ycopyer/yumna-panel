# 🌐 Multi-Server Website Deployment

## Fitur Server Selection saat Membuat Website

Yumna Panel v3.0 mendukung **deployment website ke multiple servers**. Saat membuat website baru, Anda bisa memilih server mana yang akan digunakan untuk hosting.

---

## 🎯 Cara Menggunakan

### **1. Buka Panel GUI**
```
http://localhost:3001
```

### **2. Navigasi ke Website Management**
- Klik **Hosting** di sidebar
- Klik **Websites**
- Klik tombol **Add New Website**

### **3. Pilih Server untuk Deployment**

Di form "Add New Website", Anda akan melihat dropdown **"Deploy to Server"**:

```
┌─────────────────────────────────────────────────┐
│  Deploy to Server                (2 available)  │
├─────────────────────────────────────────────────┤
│  ▼ Master Node (127.0.0.1) 🏠 Local             │
│     CPU: 45% | RAM: 60%                         │
│                                                 │
│  📍 Selected: Master Node                       │
│  Website will be deployed to your local server  │
└─────────────────────────────────────────────────┘
```

**Pilihan yang tersedia:**
- **🏠 Local Server** - Server lokal (Master Node)
- **🌐 Remote Server** - Server remote yang sudah didaftarkan
- **Metrics** - Menampilkan CPU & RAM usage untuk membantu memilih server

### **4. Isi Form Website**
- **Domain Name**: `example.com`
- **Document Root**: Auto-generated berdasarkan server
- **PHP Version**: Pilih versi PHP (7.4 - 8.3)
- **Web Server Stack**: Nginx / Apache / Hybrid
- **Deploy to Server**: **Pilih server yang diinginkan** ⭐

### **5. Klik "Create Website"**

Sistem akan:
1. ✅ Validasi server yang dipilih (harus status "active")
2. ✅ Membuat entry di database dengan `serverId`
3. ✅ Mengirim request ke Agent di server yang dipilih
4. ✅ Agent membuat VHost configuration
5. ✅ Agent membuat directory website
6. ✅ Menampilkan konfirmasi: *"Website created successfully on Server B (192.168.1.101)!"*

---

## 📊 Contoh Skenario

### **Skenario 1: Load Balancing Manual**

Anda punya 3 server:
- **Server A** (Local) - CPU 80%, RAM 70%
- **Server B** (Remote) - CPU 30%, RAM 40%
- **Server C** (Remote) - CPU 25%, RAM 35%

**Keputusan**: Deploy website baru ke **Server C** karena resource paling rendah.

### **Skenario 2: Geographic Distribution**

Anda punya server di berbagai lokasi:
- **Server SG** (Singapore) - 103.28.x.x
- **Server US** (USA) - 192.0.2.x
- **Server EU** (Europe) - 198.51.100.x

**Keputusan**: 
- Website untuk customer Asia → Deploy ke **Server SG**
- Website untuk customer Amerika → Deploy ke **Server US**
- Website untuk customer Eropa → Deploy ke **Server EU**

### **Skenario 3: Environment Separation**

Anda punya server untuk berbagai environment:
- **Production Server** - 192.168.1.100
- **Staging Server** - 192.168.1.101
- **Development Server** - 192.168.1.102

**Keputusan**:
- Website production → Deploy ke **Production Server**
- Website testing → Deploy ke **Staging Server**
- Website development → Deploy ke **Development Server**

---

## 🔧 Technical Details

### **Database Schema**

Tabel `websites` memiliki kolom `serverId`:

```sql
CREATE TABLE websites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    serverId INT DEFAULT 1,  -- ⭐ Server selection
    rootPath TEXT NOT NULL,
    phpVersion VARCHAR(10) DEFAULT '8.2',
    webStack ENUM('nginx', 'apache', 'hybrid') DEFAULT 'nginx',
    sslEnabled TINYINT DEFAULT 0,
    status ENUM('active', 'suspended') DEFAULT 'active',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (serverId) REFERENCES servers(id)
);
```

### **API Endpoint**

#### **GET /api/websites/servers**
Mendapatkan list server yang available untuk deployment.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Master Node",
    "hostname": "localhost",
    "ip": "127.0.0.1",
    "is_local": true,
    "status": "active",
    "cpu_usage": 45.2,
    "ram_usage": 60.5,
    "disk_usage": 30.1
  },
  {
    "id": 2,
    "name": "Production Server",
    "hostname": "prod.example.com",
    "ip": "192.168.1.101",
    "is_local": false,
    "status": "active",
    "cpu_usage": 30.0,
    "ram_usage": 40.0,
    "disk_usage": 50.0
  }
]
```

#### **POST /api/websites**
Membuat website baru dengan server selection.

**Request:**
```json
{
  "domain": "example.com",
  "rootPath": "/var/www/example.com",
  "phpVersion": "8.2",
  "webStack": "nginx",
  "serverId": 2,  // ⭐ Server ID yang dipilih
  "targetUserId": 1
}
```

**Response:**
```json
{
  "message": "Website created successfully",
  "websiteId": 123,
  "server": {
    "id": 2,
    "name": "Production Server",
    "ip": "192.168.1.101"
  }
}
```

### **Backend Logic**

Saat website dibuat, WHM akan:

1. **Validasi Server**
   ```javascript
   const [serverRows] = await connection.query(
       'SELECT * FROM servers WHERE id = ?', 
       [serverId]
   );
   if (serverRows.length === 0) {
       throw new Error('Selected server not found');
   }
   if (selectedServer.status !== 'active') {
       throw new Error('Server is not active');
   }
   ```

2. **Tentukan Agent URL**
   ```javascript
   let agentUrl;
   if (selectedServer.is_local) {
       agentUrl = 'http://localhost:4001';
   } else {
       agentUrl = `http://${selectedServer.ip}:4001`;
   }
   ```

3. **Kirim Request ke Agent**
   ```javascript
   const agentClient = axios.create({
       baseURL: agentUrl,
       headers: { 'X-Agent-Secret': AGENT_SECRET }
   });

   await agentClient.post('/web/vhost', {
       domain,
       rootPath,
       phpVersion,
       stack: webStack,
       ssl: false
   });
   ```

---

## 🎨 UI Features

### **Visual Indicators**

Dropdown server menampilkan:
- ✅ **Server Name** - Nama server
- ✅ **IP Address** - IP server
- ✅ **Type** - 🏠 Local atau 🌐 Remote
- ✅ **CPU Usage** - Persentase CPU
- ✅ **RAM Usage** - Persentase RAM

### **Smart Defaults**

- Server pertama (biasanya Local Master) dipilih secara default
- Jika hanya ada 1 server, dropdown tetap ditampilkan tapi hanya 1 pilihan
- Jika tidak ada server aktif, muncul warning: *"⚠️ No active servers available"*

### **Confirmation Message**

Setelah website dibuat, muncul alert:
```
✅ Website created successfully on Production Server (192.168.1.101)!
```

---

## 🚀 Advanced Use Cases

### **1. Automatic Load Balancing**

Anda bisa membuat script untuk memilih server dengan resource paling rendah:

```javascript
const servers = await axios.get('/api/websites/servers');
const bestServer = servers.data.reduce((best, current) => {
    const currentLoad = current.cpu_usage + current.ram_usage;
    const bestLoad = best.cpu_usage + best.ram_usage;
    return currentLoad < bestLoad ? current : best;
});

// Deploy ke server dengan load terendah
await axios.post('/api/websites', {
    domain: 'auto-balanced.com',
    serverId: bestServer.id
});
```

### **2. Geo-Based Deployment**

```javascript
const deployByGeo = (customerCountry) => {
    const serverMap = {
        'SG': 1, // Singapore server
        'US': 2, // USA server
        'EU': 3  // Europe server
    };
    return serverMap[customerCountry] || 1; // Default to SG
};

await axios.post('/api/websites', {
    domain: 'customer-site.com',
    serverId: deployByGeo('US')
});
```

### **3. Bulk Deployment**

Deploy multiple websites ke berbagai server:

```javascript
const websites = [
    { domain: 'site1.com', serverId: 1 },
    { domain: 'site2.com', serverId: 2 },
    { domain: 'site3.com', serverId: 3 }
];

for (const site of websites) {
    await axios.post('/api/websites', {
        domain: site.domain,
        serverId: site.serverId,
        phpVersion: '8.2',
        webStack: 'nginx'
    });
}
```

---

## ❓ FAQ

**Q: Apakah saya harus memilih server setiap kali membuat website?**
**A:** Tidak. Jika Anda tidak memilih, sistem akan otomatis menggunakan server default (ID 1, biasanya Local Master).

**Q: Bisakah saya memindahkan website ke server lain setelah dibuat?**
**A:** Saat ini belum ada fitur "migrate website". Anda perlu membuat website baru di server tujuan dan copy files secara manual.

**Q: Apa yang terjadi jika server yang dipilih offline?**
**A:** Sistem akan menolak pembuatan website dengan error: *"Server is not active"*.

**Q: Bisakah saya deploy 1 website ke multiple servers sekaligus?**
**A:** Saat ini belum didukung. Anda perlu membuat website terpisah untuk setiap server, atau setup load balancer manual.

**Q: Bagaimana cara melihat website saya di-deploy ke server mana?**
**A:** Di Website List, akan ada kolom "Server" yang menampilkan nama server tempat website di-host.

---

## 🔜 Future Enhancements

Fitur yang akan datang:
- ✨ **Website Migration** - Pindahkan website antar server dengan 1 klik
- ✨ **Multi-Server Deployment** - Deploy 1 website ke multiple servers sekaligus
- ✨ **Auto Load Balancing** - Sistem otomatis pilih server dengan resource terendah
- ✨ **Geo-Routing** - Otomatis route traffic ke server terdekat
- ✨ **Health Check** - Otomatis failover jika server down

---

**Made with ❤️ by Yumna Panel Team**
**Version**: 3.0.0
**Last Updated**: 2026-01-12
