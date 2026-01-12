# 🌐 Multi-Server Support - Complete Guide

## Overview

Yumna Panel v3.0 mendukung **multi-server deployment** untuk semua fitur utama. Anda bisa memilih server mana yang akan digunakan saat membuat:

- ✅ **Websites** - Virtual hosts & web applications
- ✅ **DNS Zones** - Domain name system records
- 🔄 **Databases** - MySQL/PostgreSQL databases
- 🔄 **Email Accounts** - Mail accounts & mailboxes
- 🔄 **FTP Accounts** - File transfer protocol users
- 🔄 **SSL Certificates** - HTTPS certificates
- 🔄 **Cron Jobs** - Scheduled tasks

---

## 🎯 Status Implementasi

### ✅ **Fully Implemented**

#### **1. Websites**
- Backend API dengan serverId
- Frontend dropdown server selection
- Route ke Agent yang sesuai
- Success message dengan server info

**Endpoint:**
- `GET /api/websites/servers` - Get available servers
- `POST /api/websites` - Create website dengan serverId

**Documentation:** `docs/MULTI_SERVER_WEBSITE_DEPLOYMENT.md`

#### **2. DNS Zones**
- Backend API dengan serverId
- Sync ke PowerDNS di server yang dipilih
- DNS Cluster support
- Frontend dropdown (perlu ditambahkan)

**Endpoint:**
- `GET /api/dns/servers` - Get available servers
- `POST /api/dns` - Create DNS zone dengan serverId

---

### 🔄 **Planned (Next Phase)**

#### **3. Databases**
```javascript
// POST /api/databases
{
  "name": "mydb",
  "user": "dbuser",
  "password": "secret",
  "serverId": 2  // Deploy to server 2
}
```

#### **4. Email Accounts**
```javascript
// POST /api/email/accounts
{
  "email": "user@domain.com",
  "password": "secret",
  "serverId": 2  // Deploy to server 2
}
```

#### **5. FTP Accounts**
```javascript
// POST /api/ftp/accounts
{
  "username": "ftpuser",
  "password": "secret",
  "serverId": 2  // Deploy to server 2
}
```

---

## 📊 Database Schema

Semua tabel fitur memiliki kolom `serverId`:

```sql
-- Websites
CREATE TABLE websites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    serverId INT DEFAULT 1,  -- ⭐ Server selection
    ...
);

-- DNS Zones
CREATE TABLE dns_zones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    serverId INT DEFAULT 1,  -- ⭐ Server selection
    ...
);

-- Databases
CREATE TABLE `databases` (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    name VARCHAR(255) UNIQUE NOT NULL,
    serverId INT DEFAULT 1,  -- ⭐ Server selection
    ...
);

-- Email Accounts (planned)
CREATE TABLE email_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    serverId INT DEFAULT 1,  -- ⭐ Server selection
    ...
);

-- FTP Accounts (planned)
CREATE TABLE ftp_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    serverId INT DEFAULT 1,  -- ⭐ Server selection
    ...
);

-- SSL Certificates
CREATE TABLE ssl_certificates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT,
    domain VARCHAR(255) NOT NULL,
    serverId INT DEFAULT 1,  -- ⭐ Server selection
    ...
);

-- Cron Jobs (planned)
CREATE TABLE cron_jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    serverId INT DEFAULT 1,  -- ⭐ Server selection
    ...
);
```

---

## 🔧 Migration

Untuk menambahkan `serverId` ke semua tabel:

```bash
# Di WHM server
cd c:\YumnaPanel\whm

# Run migration
node -e "require('./src/migrations/add_multi_server_support')().then(() => process.exit(0))"
```

Atau tambahkan ke `index.js`:

```javascript
const addMultiServerSupport = require('./migrations/add_multi_server_support');

// Run on startup
addMultiServerSupport().catch(err => {
    console.error('Migration failed:', err);
});
```

---

## 🎨 Frontend Implementation

### **Pattern untuk Semua Fitur**

```typescript
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Server } from 'lucide-react';

interface ServerNode {
    id: number;
    name: string;
    ip: string;
    is_local: boolean;
    cpu_usage: number;
    ram_usage: number;
}

const AddFeatureModal = ({ userId, onSuccess }) => {
    const [serverId, setServerId] = useState<number>(1);
    const [servers, setServers] = useState<ServerNode[]>([]);

    useEffect(() => {
        // Fetch available servers
        axios.get('/api/[feature]/servers', { 
            headers: { 'x-user-id': userId } 
        })
        .then(res => {
            setServers(res.data);
            if (res.data.length > 0) {
                setServerId(res.data[0].id);
            }
        });
    }, [userId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const response = await axios.post('/api/[feature]', {
            name,
            serverId,  // ⭐ Include serverId
            ...otherParams
        }, {
            headers: { 'x-user-id': userId }
        });

        // Show server info in success message
        alert(`Created successfully on ${response.data.server.name}!`);
        onSuccess();
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* Other fields... */}

            {/* Server Selection Dropdown */}
            <div>
                <label>Deploy to Server</label>
                <select 
                    value={serverId} 
                    onChange={e => setServerId(Number(e.target.value))}
                >
                    {servers.map(server => (
                        <option key={server.id} value={server.id}>
                            {server.name} ({server.ip}) 
                            {server.is_local ? '🏠 Local' : '🌐 Remote'} 
                            - CPU: {Math.round(server.cpu_usage)}%
                        </option>
                    ))}
                </select>
            </div>

            <button type="submit">Create</button>
        </form>
    );
};
```

---

## 🚀 Use Cases

### **1. Geographic Distribution**

Deploy resources berdasarkan lokasi customer:

```javascript
const deployByLocation = {
    'asia': 1,      // Singapore Server
    'america': 2,   // USA Server
    'europe': 3     // Europe Server
};

// Create website for Asian customer
await axios.post('/api/websites', {
    domain: 'asia-customer.com',
    serverId: deployByLocation['asia']
});

// Create DNS zone for European customer
await axios.post('/api/dns', {
    domain: 'eu-customer.com',
    serverId: deployByLocation['europe']
});
```

### **2. Load Balancing**

Deploy ke server dengan resource paling rendah:

```javascript
const servers = await axios.get('/api/websites/servers');

// Find server with lowest load
const bestServer = servers.data.reduce((best, current) => {
    const currentLoad = current.cpu_usage + current.ram_usage;
    const bestLoad = best.cpu_usage + best.ram_usage;
    return currentLoad < bestLoad ? current : best;
});

// Deploy to best server
await axios.post('/api/websites', {
    domain: 'balanced-site.com',
    serverId: bestServer.id
});
```

### **3. Environment Separation**

Pisahkan production, staging, dan development:

```javascript
const environments = {
    production: 1,
    staging: 2,
    development: 3
};

// Production website
await axios.post('/api/websites', {
    domain: 'prod.example.com',
    serverId: environments.production
});

// Staging database
await axios.post('/api/databases', {
    name: 'staging_db',
    serverId: environments.staging
});

// Development email
await axios.post('/api/email/accounts', {
    email: 'dev@example.com',
    serverId: environments.development
});
```

### **4. Disaster Recovery**

Backup resources ke multiple servers:

```javascript
// Primary website on Server 1
const primary = await axios.post('/api/websites', {
    domain: 'example.com',
    serverId: 1
});

// Backup website on Server 2
const backup = await axios.post('/api/websites', {
    domain: 'example.com',
    serverId: 2
});

// Setup load balancer to route between them
```

---

## 📝 API Reference

### **Common Pattern untuk Semua Fitur**

#### **GET /api/[feature]/servers**
Mendapatkan list server yang available.

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

#### **POST /api/[feature]**
Membuat resource baru dengan server selection.

**Request:**
```json
{
  "name": "resource-name",
  "serverId": 2,
  ...otherParams
}
```

**Response:**
```json
{
  "message": "Resource created successfully",
  "resourceId": 123,
  "server": {
    "id": 2,
    "name": "Production Server",
    "ip": "192.168.1.101"
  }
}
```

---

## 🔐 Security Considerations

### **1. Server Access Control**

Hanya server dengan status "active" yang bisa dipilih:

```javascript
// Backend validation
if (selectedServer.status !== 'active') {
    throw new Error('Server is not active');
}
```

### **2. Agent Authentication**

Semua request ke Agent menggunakan secret key:

```javascript
const agentClient = axios.create({
    headers: { 
        'X-Agent-Secret': process.env.AGENT_SECRET 
    }
});
```

### **3. User Permissions**

User hanya bisa deploy ke server yang mereka punya akses:

```javascript
// Admin can deploy to any server
// Regular users can only deploy to assigned servers
if (!isAdmin && !user.allowedServers.includes(serverId)) {
    throw new Error('Access denied to this server');
}
```

---

## 🎯 Best Practices

1. **Default to Local Server**
   - Gunakan `serverId = 1` sebagai default
   - Local server biasanya paling cepat

2. **Show Server Metrics**
   - Display CPU, RAM usage di dropdown
   - Bantu user memilih server yang tepat

3. **Validate Server Status**
   - Selalu cek server status sebelum deploy
   - Jangan deploy ke server offline

4. **Handle Agent Failures**
   - Log error tapi jangan rollback transaction
   - Resource tetap dibuat di database
   - Admin bisa manual sync nanti

5. **Provide Feedback**
   - Show server info di success message
   - User tahu resource di-deploy ke mana

---

## 🔜 Roadmap

### **Phase 1: Core Features** ✅
- [x] Websites
- [x] DNS Zones

### **Phase 2: Data Features** 🔄
- [ ] Databases
- [ ] Email Accounts
- [ ] FTP Accounts

### **Phase 3: Advanced Features** 📋
- [ ] SSL Certificates
- [ ] Cron Jobs
- [ ] Backup Jobs

### **Phase 4: Automation** 🚀
- [ ] Auto load balancing
- [ ] Geo-routing
- [ ] Health-based failover
- [ ] Resource migration tools

---

## 📚 Related Documentation

- [Multi-Server Integration Guide](MULTI_SERVER_INTEGRATION.md)
- [Website Deployment Guide](MULTI_SERVER_WEBSITE_DEPLOYMENT.md)
- [Quick Start Guide](QUICK_START_MULTI_SERVER.md)
- [Implementation Plan](MULTI_SERVER_IMPLEMENTATION_PLAN.md)

---

**Made with ❤️ by Yumna Panel Team**
**Version**: 3.0.0
**Last Updated**: 2026-01-12
