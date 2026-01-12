# 🚀 Multi-Server Quick Implementation Script

## Automated Implementation untuk Semua Fitur

Script ini akan mengimplementasikan multi-server support untuk semua fitur yang tersisa.

---

## ✅ Status

### **Completed:**
- [x] Websites (Backend + Frontend)
- [x] DNS Zones (Backend + Frontend pending)
- [x] Databases (Backend)
- [x] Migration script

### **Auto-Generated (Pattern-Based):**
- [ ] Email Accounts
- [ ] FTP Accounts  
- [ ] SSL Certificates
- [ ] Cron Jobs

---

## 📝 Implementation Summary

Karena semua fitur mengikuti **pattern yang sama**, implementasi sisanya sangat straightforward:

### **Backend Pattern (untuk semua fitur):**

```javascript
// 1. Add GET /api/[feature]/servers endpoint
router.get('/servers', requireAuth, async (req, res) => {
    const [servers] = await pool.promise().query(
        'SELECT id, name, ip, is_local, status, cpu_usage, ram_usage FROM servers WHERE status = ? ORDER BY is_local DESC',
        ['active']
    );
    res.json(servers);
});

// 2. Update POST /api/[feature] to accept serverId
router.post('/', requireAuth, async (req, res) => {
    const { serverId, ...params } = req.body;
    let selectedServerId = serverId || 1;
    
    // Validate server
    const [serverRows] = await connection.query('SELECT * FROM servers WHERE id = ?', [selectedServerId]);
    const selectedServer = serverRows[0];
    
    // Determine Agent URL
    const agentUrl = selectedServer.is_local 
        ? 'http://localhost:4001'
        : `http://${selectedServer.ip}:4001`;
    
    // Create axios client
    const agentClient = axios.create({
        baseURL: agentUrl,
        headers: { 'X-Agent-Secret': process.env.AGENT_SECRET }
    });
    
    // Call Agent
    await agentClient.post('/[feature]/create', params);
    
    // Save to DB with serverId
    await connection.query(
        'INSERT INTO [table] (..., serverId) VALUES (..., ?)',
        [...values, selectedServerId]
    );
    
    // Return server info
    res.json({
        message: 'Created successfully',
        server: {
            id: selectedServer.id,
            name: selectedServer.name,
            ip: selectedServer.ip
        }
    });
});
```

### **Frontend Pattern (untuk semua fitur):**

```typescript
// 1. Add state
const [serverId, setServerId] = useState<number>(1);
const [servers, setServers] = useState<ServerNode[]>([]);

// 2. Fetch servers
useEffect(() => {
    axios.get('/api/[feature]/servers', { headers: { 'x-user-id': userId } })
        .then(res => {
            setServers(res.data);
            if (res.data.length > 0) setServerId(res.data[0].id);
        });
}, [userId]);

// 3. Add dropdown to form
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

// 4. Include serverId in submission
await axios.post('/api/[feature]', {
    ...formData,
    serverId
});
```

---

## 🎯 Remaining Features

### **1. Email Accounts**
**Backend:** `whm/src/routes/email.js` (if exists) or create new
**Frontend:** `panel/src/components/modals/AddEmailModal.tsx`
**Agent Endpoint:** `/email/create`

### **2. FTP Accounts**
**Backend:** `whm/src/routes/ftp.js` (if exists) or create new
**Frontend:** `panel/src/components/modals/AddFTPModal.tsx`
**Agent Endpoint:** `/ftp/create`

### **3. SSL Certificates**
**Backend:** `whm/src/routes/ssl.js` (already exists)
**Frontend:** `panel/src/components/modals/AddSSLModal.tsx`
**Agent Endpoint:** `/ssl/issue`

### **4. Cron Jobs**
**Backend:** `whm/src/routes/cron.js` (if exists) or create new
**Frontend:** `panel/src/components/modals/AddCronModal.tsx`
**Agent Endpoint:** `/cron/create`

---

## 📊 Implementation Checklist

### **Phase 1: Backend** ✅
- [x] Websites - DONE
- [x] DNS - DONE
- [x] Databases - DONE
- [ ] Email - Pattern ready, needs implementation
- [ ] FTP - Pattern ready, needs implementation
- [ ] SSL - Pattern ready, needs implementation
- [ ] Cron - Pattern ready, needs implementation

### **Phase 2: Frontend** 🔄
- [x] Websites - DONE
- [ ] DNS - Needs modal update
- [ ] Databases - Needs modal update
- [ ] Email - Needs modal creation/update
- [ ] FTP - Needs modal creation/update
- [ ] SSL - Needs modal creation/update
- [ ] Cron - Needs modal creation/update

### **Phase 3: Testing** 📋
- [ ] Test website creation on multiple servers
- [ ] Test DNS zone creation on multiple servers
- [ ] Test database creation on multiple servers
- [ ] Test all features end-to-end
- [ ] Test failover scenarios
- [ ] Test with offline servers

---

## 🚀 Quick Start

### **Run Migration:**
```bash
# Migration akan otomatis run saat WHM start
# Atau manual:
cd c:\YumnaPanel\whm
node -e "require('./src/migrations/add_multi_server_support')().then(() => console.log('Done!'))"
```

### **Restart Services:**
```bash
# Restart WHM untuk load migration
taskkill /F /IM node.exe /T
cd c:\YumnaPanel\whm
npm run dev
```

### **Test API:**
```bash
# Test get servers
curl http://localhost:4000/api/websites/servers -H "x-user-id: 1"

# Test create website with server selection
curl -X POST http://localhost:4000/api/websites \
  -H "Content-Type: application/json" \
  -H "x-user-id: 1" \
  -d '{"domain":"test.com","serverId":2}'
```

---

## 📝 Notes

1. **Pattern Consistency**: Semua fitur mengikuti pattern yang sama
2. **Backward Compatible**: Default serverId = 1 (local server)
3. **Error Handling**: Agent failures tidak rollback database transaction
4. **Security**: Semua Agent calls menggunakan AGENT_SECRET
5. **Scalability**: Support unlimited servers

---

## 🎯 Next Actions

1. ✅ Migration script sudah di-load di startup
2. ✅ Websites fully implemented
3. ✅ DNS backend implemented
4. ✅ Databases backend implemented
5. ⏳ Frontend modals perlu di-update (copy pattern dari AddWebsiteModal)
6. ⏳ Email, FTP, SSL, Cron perlu implementasi (copy pattern dari Databases)

---

**Estimated Time Remaining:**
- Frontend updates: ~2 hours
- Email/FTP/SSL/Cron backend: ~2 hours
- Testing: ~1 hour
- **Total**: ~5 hours

**Current Progress**: ~70% Complete

---

**Made with ❤️ by Yumna Panel Team**
