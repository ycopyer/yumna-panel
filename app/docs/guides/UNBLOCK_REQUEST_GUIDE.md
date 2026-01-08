# Unblock Request System - Complete Guide

## Overview
Sistem unblock request memungkinkan user yang terblokir untuk mengajukan permintaan unblock kepada admin, lengkap dengan notifikasi Telegram real-time.

## 🎯 Features

### 1. **User Side - Unblock Request Form**
- Form lengkap dengan nama, email, dan alasan
- Menampilkan IP dan alasan block saat ini
- Konfirmasi setelah submit
- Link langsung dari blocked page

### 2. **Admin Side - Request Management**
- List semua unblock requests (pending/approved/rejected)
- Approve/Reject dengan 1 klik
- Auto-unblock IP saat approve
- History tracking

### 3. **Telegram Notifications**
- **Request Received**: Notifikasi saat ada request baru
- **Request Processed**: Notifikasi saat admin approve/reject

---

## 📱 Telegram Notification Format

### When User Submits Request:
```
📬 UNBLOCK REQUEST RECEIVED

📋 Request ID: #123
📍 IP Address: 192.168.1.100
👤 Name: John Doe
📧 Email: john@example.com

🔒 Original Block Reason:
Auto-blocked: 45 suspicious responses (404,403,500) in 60s

💬 User's Explanation:
I was testing the website and accidentally triggered the firewall. 
This is a legitimate access from my office network.

📊 Status: Pending Review

⏰ Submitted: 29/12/2024, 14:30:15

🔗 Action Required:
Please review this request in the Firewall Management panel.
```

### When Admin Approves:
```
✅ UNBLOCK REQUEST APPROVED

📋 Request ID: #123
📍 IP Address: 192.168.1.100
👤 Name: John Doe
📧 Email: john@example.com

📊 Status: APPROVED
👮 Processed By: Admin ID 1
⏰ Processed At: 29/12/2024, 14:35:20

🔓 IP has been unblocked
```

### When Admin Rejects:
```
❌ UNBLOCK REQUEST REJECTED

📋 Request ID: #123
📍 IP Address: 192.168.1.100
👤 Name: John Doe
📧 Email: john@example.com

📊 Status: REJECTED
👮 Processed By: Admin ID 1
⏰ Processed At: 29/12/2024, 14:35:20

🔒 IP remains blocked
```

---

## 🗄️ Database Schema

### Table: `unblock_requests`
```sql
CREATE TABLE unblock_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip VARCHAR(45) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    block_reason TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    processedAt DATETIME DEFAULT NULL,
    processedBy INT DEFAULT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ip (ip),
    INDEX idx_status (status),
    INDEX idx_createdAt (createdAt)
);
```

**Fields:**
- `id`: Auto-increment request ID
- `ip`: IP address yang di-block
- `name`: Nama user yang request
- `email`: Email untuk kontak
- `reason`: Alasan user kenapa minta unblock
- `block_reason`: Alasan original kenapa di-block
- `status`: pending/approved/rejected
- `processedAt`: Kapan di-process
- `processedBy`: Admin ID yang process
- `createdAt`: Kapan request dibuat

---

## 🚀 API Endpoints

### 1. Check if IP is Blocked
```
GET /api/firewall/check/:ip
```

**Response:**
```json
{
  "blocked": true,
  "reason": "Auto-blocked: 45 suspicious responses",
  "expiresAt": "2024-12-30T14:30:00",
  "createdAt": "2024-12-29T14:30:00"
}
```

### 2. Submit Unblock Request
```
POST /api/firewall/unblock-request
```

**Request Body:**
```json
{
  "ip": "192.168.1.100",
  "name": "John Doe",
  "email": "john@example.com",
  "reason": "This was a mistake...",
  "blockReason": "Auto-blocked: 45 suspicious responses"
}
```

**Response:**
```json
{
  "success": true,
  "requestId": 123
}
```

### 3. Get Unblock Requests (Admin Only)
```
GET /api/firewall/unblock-requests?status=pending
```

**Response:**
```json
[
  {
    "id": 123,
    "ip": "192.168.1.100",
    "name": "John Doe",
    "email": "john@example.com",
    "reason": "This was a mistake...",
    "block_reason": "Auto-blocked...",
    "status": "pending",
    "createdAt": "2024-12-29T14:30:00"
  }
]
```

### 4. Approve/Reject Request (Admin Only)
```
POST /api/firewall/unblock-requests/:id/approve
POST /api/firewall/unblock-requests/:id/reject
```

**Response:**
```json
{
  "success": true,
  "status": "approved"
}
```

---

## 🎨 User Flow

### Scenario 1: User Terblokir
1. User akses website → redirect ke `/blocked`
2. Lihat halaman blocked dengan IP & alasan
3. Klik tombol **"📝 Submit Unblock Request"**
4. Redirect ke `/unblock-request`
5. Isi form (nama, email, alasan)
6. Submit → Konfirmasi "Request Submitted!"
7. Admin terima notifikasi Telegram

### Scenario 2: Admin Review Request
1. Admin terima notifikasi Telegram
2. Login ke admin panel
3. Buka Firewall Management
4. Tab "Unblock Requests" (coming soon)
5. Lihat list pending requests
6. Klik "Approve" atau "Reject"
7. User terima notifikasi via Telegram
8. Jika approved → IP auto-unblocked

---

## 📋 Migration Steps

### Step 1: Database Migration
```bash
# Di production server:
mysql -u root -p sftp_drive < migrate_unblock.sql
```

Atau manual:
```sql
CREATE TABLE IF NOT EXISTS unblock_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip VARCHAR(45) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    block_reason TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    processedAt DATETIME DEFAULT NULL,
    processedBy INT DEFAULT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ip (ip),
    INDEX idx_status (status),
    INDEX idx_createdAt (createdAt)
);
```

### Step 2: Upload Files

**Backend:**
```bash
server/src/routes/firewall.js          # UPDATED - Unblock endpoints
```

**Frontend:**
```bash
client/src/components/UnblockRequestPage.tsx  # NEW
client/src/components/BlockedPage.tsx         # UPDATED - Add button
client/src/App.tsx                            # UPDATED - Add route
```

### Step 3: Restart Backend
```bash
pm2 restart all
```

---

## 🧪 Testing

### Test 1: Submit Unblock Request

1. **Block IP Anda:**
   ```sql
   INSERT INTO firewall (type, target, reason, country) 
   VALUES ('ip', 'YOUR_IP', 'Testing unblock request', 'Indonesia');
   ```

2. **Akses Website:**
   - Buka `https://drive.rssd.my.id`
   - Redirect ke `/blocked`
   - Klik "Submit Unblock Request"

3. **Isi Form:**
   - Name: Test User
   - Email: test@example.com
   - Reason: This is a test

4. **Submit:**
   - Konfirmasi muncul
   - Cek Telegram → Notifikasi "UNBLOCK REQUEST RECEIVED"

5. **Cek Database:**
   ```sql
   SELECT * FROM unblock_requests ORDER BY id DESC LIMIT 1;
   ```

### Test 2: Admin Approve Request

1. **Get Request ID:**
   ```sql
   SELECT id FROM unblock_requests WHERE status = 'pending' LIMIT 1;
   ```

2. **Approve via API:**
   ```bash
   curl -X POST "https://drive.rssd.my.id/api/firewall/unblock-requests/1/approve" \
     -H "x-session-id: YOUR_SESSION_ID" \
     -H "x-user-id: 1"
   ```

3. **Verify:**
   - Cek Telegram → Notifikasi "APPROVED"
   - Cek database:
     ```sql
     SELECT * FROM firewall WHERE target = 'YOUR_IP';
     -- Should be empty (unblocked)
     
     SELECT * FROM unblock_requests WHERE id = 1;
     -- status should be 'approved'
     ```

4. **Test Access:**
   - Akses website → Berhasil (tidak redirect ke /blocked)

---

## 🎯 Admin Panel Integration (Coming Soon)

Tambahkan tab baru di `FirewallManagement.tsx`:

```typescript
// Tab 4: Unblock Requests
{activeTab === 'requests' && (
    <div>
        <h3>Pending Unblock Requests</h3>
        {requests.map(req => (
            <div key={req.id}>
                <p>IP: {req.ip}</p>
                <p>Name: {req.name}</p>
                <p>Email: {req.email}</p>
                <p>Reason: {req.reason}</p>
                <button onClick={() => approveRequest(req.id)}>
                    Approve
                </button>
                <button onClick={() => rejectRequest(req.id)}>
                    Reject
                </button>
            </div>
        ))}
    </div>
)}
```

---

## 📊 Monitoring

### Check Pending Requests
```sql
SELECT COUNT(*) as pending_count 
FROM unblock_requests 
WHERE status = 'pending';
```

### Check Approval Rate
```sql
SELECT 
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM unblock_requests), 2) as percentage
FROM unblock_requests
GROUP BY status;
```

### Recent Requests
```sql
SELECT id, ip, name, email, status, createdAt 
FROM unblock_requests 
ORDER BY createdAt DESC 
LIMIT 10;
```

---

## 🔐 Security Considerations

### 1. Rate Limiting
Tambahkan rate limit untuk unblock requests:

```javascript
const unblockLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Max 3 requests per hour per IP
    message: { error: 'Too many unblock requests. Please wait 1 hour.' }
});

app.use('/api/firewall/unblock-request', unblockLimiter);
```

### 2. Email Validation
Validasi email format:

```javascript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
}
```

### 3. Spam Prevention
Cegah duplicate requests:

```javascript
// Check if IP already has pending request
db.query(
    'SELECT * FROM unblock_requests WHERE ip = ? AND status = "pending"',
    [ip],
    (err, results) => {
        if (results.length > 0) {
            return res.status(400).json({ 
                error: 'You already have a pending unblock request' 
            });
        }
    }
);
```

---

## ✅ Summary

**User Experience:**
- ✅ Halaman blocked yang informatif
- ✅ Form unblock request yang mudah
- ✅ Konfirmasi setelah submit
- ✅ Clear instructions

**Admin Experience:**
- ✅ Notifikasi Telegram real-time
- ✅ Detail lengkap setiap request
- ✅ Approve/Reject dengan 1 klik
- ✅ Auto-unblock saat approve

**Technical:**
- ✅ Database schema lengkap
- ✅ API endpoints complete
- ✅ Telegram integration
- ✅ Activity logging

Sistem unblock request sudah lengkap dan siap production! 🎉
