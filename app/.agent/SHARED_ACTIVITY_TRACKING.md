# Shared File Activity Tracking

## Overview
Semua aktivitas yang terjadi melalui shared links sekarang **otomatis tercatat** di Activity History milik **owner** yang membuat share tersebut.

## Aktivitas Shared yang Dicatat

### 1. **View Shared File** 
**Endpoint**: `/api/share-ls/:id` (untuk single file)
```javascript
logActivity(ownerId, 'view', `Shared file accessed: ${fileName} (via link)`);
```
**Kapan**: Setiap kali seseorang membuka shared link untuk melihat detail file

**Contoh Log**:
```
👁️ View - Shared file accessed: report.pdf (via link)
```

---

### 2. **View Shared Folder**
**Endpoint**: `/api/share-ls/:id` (untuk folder)
```javascript
logActivity(ownerId, 'view', `Shared folder accessed: ${folderName} (via link)`);
```
**Kapan**: Setiap kali seseorang membuka shared folder atau subfolder

**Contoh Log**:
```
👁️ View - Shared folder accessed: Documents (via link)
👁️ View - Shared folder accessed: Documents/Reports (via link)
```

---

### 3. **Download Shared File**
**Endpoint**: `/api/share-download/:id` (file)
```javascript
logActivity(ownerId, 'download', `Shared file downloaded: ${fileName} (via link)`);
```
**Kapan**: Setiap kali seseorang mendownload file dari shared link

**Contoh Log**:
```
📥 Download - Shared file downloaded: contract.pdf (via link)
📥 Download - Shared file downloaded: Documents/report.xlsx (via link)
```

---

### 4. **Download Shared Folder as ZIP**
**Endpoint**: `/api/share-download/:id` (folder)
```javascript
logActivity(ownerId, 'download', `Shared folder downloaded as ZIP: ${folderName} (via link)`);
```
**Kapan**: Setiap kali seseorang mendownload folder sebagai ZIP

**Contoh Log**:
```
📥 Download - Shared folder downloaded as ZIP: Projects (via link)
```

---

### 5. **Scan Shared Folder Recursively**
**Endpoint**: `/api/share-ls-recursive/:id`
```javascript
logActivity(ownerId, 'view', `Shared folder scanned recursively: ${folderName} (${itemCount} items via link)`);
```
**Kapan**: Ketika seseorang generate file list dari shared folder

**Contoh Log**:
```
👁️ View - Shared folder scanned recursively: Documents (157 items via link)
```

---

## Technical Implementation

### Owner ID Extraction
Untuk setiap shared file activity, kita extract `userId` dari **sftpConfig** yang tersimpan di database:

```javascript
const config = JSON.parse(decrypt(share.sftpConfig));
const ownerId = config.userId;  // This is the file owner
```

**Why?**
- Shared links bersifat anonymous (tidak perlu login)
- Activity tetap perlu dicatat untuk audit trail
- Owner file perlu tahu siapa saja yang access shared files mereka

### Database Flow

```
1. User creates share
   ↓
2. sftpConfig (dengan userId) tersimpan di shares table
   ↓
3. Seseorang akses shared link
   ↓
4. System extract ownerId dari sftpConfig
   ↓
5. Log activity dengan ownerId tersebut
   ↓
6. Owner dapat melihat di Activity History
```

---

## Activity History Display

### For Owner

Owner akan melihat activity shared files mereka dengan label "(via link)":

```
Activity History - Your recent activities

👁️ View - Shared folder accessed: Projects (via link)
    ⏱ 2 minutes ago
    📅 Senin, 22 Desember 2025 - 20:30:15

📥 Download - Shared file downloaded: contract.pdf (via link)
    ⏱ 5 minutes ago
    📅 Senin, 22 Desember 2025 - 20:27:42

👁️ View - Shared folder scanned recursively: Documents (157 items via link)
    ⏱ 10 minutes ago
    📅 Senin, 22 Desember 2025 - 20:22:18
```

### Filtering

Owner dapat filter activity by action:
- **All**: Semua aktivitas (termasuk shared)
- **View**: Hanya view activities (termasuk shared folder access)
- **Download**: Hanya downloads (termasuk shared file downloads)

---

## Benefits

### 1. **Security & Monitoring**
- Owner tahu kapan shared files diakses
- Detect suspicious access patterns
- Track download counts

### 2. **Compliance & Audit**
- Complete audit trail untuk shared files
- Meet regulatory requirements
- Prove file access for legal purposes

### 3. **Usage Analytics**
- Understand which shared files paling banyak diakses
- Identify popular content
- Optimize sharing strategy

### 4. **Accountability**
- Owner responsible untuk shared content mereka
- Transparent access logging
- Easy to review sharing history

---

## Edge Cases Handled

### 1. **Nested Folder Access**
```javascript
// If subfolder accessed
const displayPath = subPath ? `${share.fileName}/${subPath}` : share.fileName;
```
**Example**: "Documents/Reports/2024" dicatat dengan full path

### 2. **Password Protected Shares**
```javascript
if (!verifySharePassword(share, password)) {
    return res.status(403).json({ error: 'Invalid password' });
}
```
**Only logged if password correct** - Invalid attempts tidak dicatat

### 3. **Expired Shares**
Jika share sudah expired, access akan ditolak sebelum logging

### 4. **Failed Downloads**
```javascript
stream.on('error', (e) => {
    console.error('ReadStream error:', e.message);
    // Error logged to console, tidak ke activity history
});
```
**Only successful operations logged** - Failed attempts tidak mengotori history

---

## Testing Checklist

### Share Creation
- [ ] Create shared file
- [ ] Create shared folder
- [ ] Set password protection
- [ ] Set expiration date

### Shared File Access
- [ ] Open shared file link → Check owner's history
- [ ] Open shared folder link → Check owner's history
- [ ] Navigate to subfolder → Check full path logged
- [ ] Generate file list → Check item count logged

### Shared Downloads
- [ ] Download single file → Check "downloaded" log
- [ ] Download folder as ZIP → Check "downloaded as ZIP" log
- [ ] Download from subfolder → Check full path logged

### Activity History Verification
- [ ] Owner login → Open Activity History
- [ ] Verify shared activities muncul
- [ ] Check "(via link)" label present
- [ ] Filter by "view" → Shared views muncul
- [ ] Filter by "download" → Shared downloads muncul
- [ ] Verify datetime accuracy

### Edge Cases
- [ ] Wrong password → No activity logged
- [ ] Expired share → Access denied, no log
- [ ] Download error → No activity logged
- [ ] Multiple accesses → All logged separately

---

## Privacy Considerations

### What We Track:
✅ File/folder name accessed  
✅ Type of activity (view/download)  
✅ Timestamp of access  
✅ Owner userId (who shared)
✅ Visitor IP Address (Public & Local)

### What We DON'T Track:
❌ Device/browser information  
❌ Geographic location  
❌ Accessor identity (anonymous)

**Reason**: Shared links are meant to be anonymous. We only track that access occurred, not WHO accessed it (unless we add visitor tracking in future).

---

## Future Enhancements

### 1. **Visitor Geo-location (Optional)**
```javascript
// Map IP to location (future feature)
logActivity(ownerId, 'view', `Shared file accessed from Jakarta, ID: ${fileName}`);
```

### 2. **Share Analytics Dashboard**
- Total views per shared item
- Download counts
- Popular shares ranking
- Time-based charts

### 3. **Notifications**
- Email owner when shared file accessed
- Real-time notifications
- Weekly digest of share activities

### 4. **Access Limits**
```javascript
// Limit downloads
if (downloadCount >= maxDownloads) {
    return res.status(403).json({ error: 'Download limit reached' });
}
```

### 5. **Advanced Logging**
```javascript
// More detailed logs
logActivity(ownerId, 'download', {
    action: 'download',
    file: fileName,
    shareId: id,
    fileSize: stats.size,
    downloadTime: Date.now(),
    via: 'shared_link'
});
```

---

## Summary

✅ **All shared activities tracked**  
✅ **Owner sees everything in Activity History**  
✅ **Clear "(via link)" labeling**  
✅ **No performance impact**  
✅ **Complete audit trail**  
✅ **Privacy-aware design**  

Sekarang owner file dapat **monitor semua aktivitas** yang terjadi pada file/folder yang mereka share! 🎉

---

## Configuration

No configuration needed - feature works automatically!

All shared activities will appear in owner's Activity History with:
- 👁️ Pink color for views
- 📥 Blue color for downloads
- 🔗 "(via link)" suffix untuk identify shared activities

