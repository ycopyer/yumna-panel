# 🌐 Multi-Server Support Implementation Plan

## Overview
Implementasi server selection untuk semua fitur utama Yumna Panel v3.1

---

## ✅ Status Implementasi

### **1. Websites** ✅ DONE
- [x] Backend API dengan serverId parameter
- [x] Frontend dropdown server selection
- [x] Route ke Agent yang sesuai
- [x] Documentation lengkap

### **2. DNS Zones** 🔄 IN PROGRESS
- [ ] Backend API dengan serverId parameter
- [ ] Frontend dropdown server selection
- [ ] Sync ke PowerDNS di server yang dipilih
- [ ] DNS Cluster support

### **3. Email Accounts** 🔄 PLANNED
- [ ] Backend API dengan serverId parameter
- [ ] Frontend dropdown server selection
- [ ] Route ke mail server yang sesuai
- [ ] SMTP/IMAP configuration per server

### **4. Databases** 🔄 PLANNED
- [ ] Backend API dengan serverId parameter
- [ ] Frontend dropdown server selection
- [ ] Route ke MySQL/PostgreSQL di server yang sesuai
- [ ] Database replication support

### **5. FTP Accounts** 🔄 PLANNED
- [ ] Backend API dengan serverId parameter
- [ ] Frontend dropdown server selection
- [ ] Route ke FTP server yang sesuai

### **6. SSL Certificates** 🔄 PLANNED
- [ ] Backend API dengan serverId parameter
- [ ] Frontend dropdown server selection
- [ ] Let's Encrypt per server
- [ ] Certificate sync

### **7. Cron Jobs** 🔄 PLANNED
- [ ] Backend API dengan serverId parameter
- [ ] Frontend dropdown server selection
- [ ] Schedule tasks di server yang dipilih

---

## 📋 Implementation Checklist

### **Phase 1: Database Schema** ✅
- [x] websites table has serverId
- [x] dns_zones table has serverId
- [ ] Add serverId to email_accounts table
- [ ] Add serverId to databases table
- [ ] Add serverId to ftp_accounts table
- [ ] Add serverId to ssl_certificates table
- [ ] Add serverId to cron_jobs table

### **Phase 2: Backend API**
For each feature:
1. Add serverId parameter to POST/PUT endpoints
2. Validate server exists and is active
3. Determine Agent URL (local vs remote)
4. Route request to appropriate Agent
5. Return server info in response

### **Phase 3: Frontend UI**
For each feature:
1. Fetch available servers from `/api/*/servers`
2. Add dropdown "Deploy to Server"
3. Display server metrics (CPU, RAM)
4. Show confirmation with selected server
5. Update success message

### **Phase 4: Agent Support**
Ensure each Agent can handle:
- DNS zone management (PowerDNS)
- Email account management (Postfix/Dovecot)
- Database management (MySQL/PostgreSQL)
- FTP account management
- SSL certificate management
- Cron job scheduling

---

## 🎯 Priority Order

1. **DNS Zones** (High Priority)
   - Frequently used
   - PowerDNS cluster already exists
   - Easy to implement

2. **Databases** (High Priority)
   - Critical for applications
   - MySQL replication support
   - Medium complexity

3. **Email Accounts** (Medium Priority)
   - Important for business
   - Postfix/Dovecot configuration
   - Medium complexity

4. **SSL Certificates** (Medium Priority)
   - Security critical
   - Let's Encrypt automation
   - Low complexity

5. **FTP Accounts** (Low Priority)
   - Less frequently used
   - Simple implementation
   - Low complexity

6. **Cron Jobs** (Low Priority)
   - Advanced feature
   - Simple implementation
   - Low complexity

---

## 📝 Implementation Template

### **Backend API Pattern**

```javascript
// POST /api/[feature]
router.post('/', requireAuth, async (req, res) => {
    let { name, serverId, ...otherParams } = req.body;
    
    // Default to server 1 if not specified
    if (!serverId) serverId = 1;
    
    const connection = await pool.promise().getConnection();
    try {
        await connection.beginTransaction();
        
        // Validate Server
        const [serverRows] = await connection.query(
            'SELECT * FROM servers WHERE id = ?', 
            [serverId]
        );
        if (serverRows.length === 0) {
            throw new Error('Selected server not found');
        }
        const selectedServer = serverRows[0];
        
        if (selectedServer.status !== 'active') {
            throw new Error(`Server is not active`);
        }
        
        // Insert to database with serverId
        const [result] = await connection.query(
            'INSERT INTO [table] (userId, serverId, name, ...) VALUES (?, ?, ?, ...)',
            [userId, serverId, name, ...]
        );
        const itemId = result.insertId;
        
        // Determine Agent URL
        let agentUrl;
        if (selectedServer.is_local) {
            agentUrl = process.env.AGENT_URL || 'http://localhost:4001';
        } else {
            agentUrl = `http://${selectedServer.ip}:4001`;
        }
        
        // Call Agent
        const agentClient = axios.create({
            baseURL: agentUrl,
            headers: { 'X-Agent-Secret': process.env.AGENT_SECRET }
        });
        
        await agentClient.post('/[feature]/create', {
            name,
            ...otherParams
        });
        
        await connection.commit();
        res.status(201).json({ 
            message: '[Feature] created successfully',
            itemId,
            server: {
                id: selectedServer.id,
                name: selectedServer.name,
                ip: selectedServer.ip
            }
        });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// GET /api/[feature]/servers
router.get('/servers', requireAuth, async (req, res) => {
    try {
        const [servers] = await pool.promise().query(
            'SELECT id, name, hostname, ip, is_local, status, cpu_usage, ram_usage FROM servers WHERE status = ? ORDER BY is_local DESC, name ASC',
            ['active']
        );
        res.json(servers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
```

### **Frontend UI Pattern**

```typescript
// State
const [serverId, setServerId] = useState<number>(1);
const [servers, setServers] = useState<ServerNode[]>([]);

// Fetch servers
useEffect(() => {
    axios.get('/api/[feature]/servers', { headers: { 'x-user-id': userId } })
        .then(res => {
            setServers(res.data);
            if (res.data.length > 0) {
                setServerId(res.data[0].id);
            }
        });
}, [userId]);

// Submit with serverId
const handleSubmit = async (e: React.FormEvent) => {
    const response = await axios.post('/api/[feature]', {
        name,
        serverId,
        ...otherParams
    });
    
    alert(`Created successfully on ${response.data.server.name}!`);
};

// UI Dropdown
<div>
    <label>Deploy to Server</label>
    <select value={serverId} onChange={e => setServerId(Number(e.target.value))}>
        {servers.map(server => (
            <option key={server.id} value={server.id}>
                {server.name} ({server.ip}) {server.is_local ? '🏠' : '🌐'}
            </option>
        ))}
    </select>
</div>
```

---

## 🚀 Next Steps

1. **Update Database Schema** - Add serverId columns
2. **Implement DNS Multi-Server** - Start with highest priority
3. **Implement Database Multi-Server** - Second priority
4. **Implement Email Multi-Server** - Third priority
5. **Update Documentation** - For each feature
6. **Testing** - End-to-end testing for all features

---

**Estimated Time**: 
- DNS: 2 hours
- Databases: 2 hours
- Email: 3 hours
- SSL: 1 hour
- FTP: 1 hour
- Cron: 1 hour
- **Total**: ~10 hours

---

**Made with ❤️ by Yumna Panel Team**
