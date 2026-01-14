# Panduan Penggunaan File Operations di YumnaPanel

## 📍 **Di Mana Saya Bisa Menggunakan Operasi File?**

### **1. File Explorer (UI) - Operasi Dasar** ✅

**Lokasi:** Panel → **Explorer** (menu sidebar kiri)

**Operasi yang Tersedia:**
- ✅ Browse files & folders (ls)
- ✅ Upload files
- ✅ Download files
- ✅ Create folder (mkdir)
- ✅ Delete files/folders
- ✅ Rename files/folders
- ✅ Edit text files (read/write)
- ✅ View file properties (stat)

**Cara Pakai:**
1. Login ke Panel
2. Klik menu **"Explorer"** di sidebar
3. Navigate ke folder yang diinginkan
4. Klik kanan pada file/folder untuk melihat opsi
5. Atau gunakan toolbar di atas untuk upload/create folder

---

### **2. API Endpoints - Semua Operasi** ✅

**Lokasi:** Akses via HTTP Request ke backend

**Operasi yang Tersedia:** **28 operasi lengkap** (termasuk archive, search, checksum, dll)

#### **A. Lihat Daftar Semua Operasi**
```bash
GET /api/help
Authorization: Bearer <your-token>
```

**Response:** JSON lengkap dengan daftar semua operasi + contoh penggunaan

#### **B. Contoh Penggunaan API**

**1. Create ZIP Backup**
```bash
POST /api/zip
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "path": "/websites/example.com",
  "files": ["public_html", "config.php", ".htaccess"],
  "archiveName": "backup-2026-01-14.zip"
}
```

**2. Extract ZIP**
```bash
POST /api/unzip
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "path": "/websites/example.com/backup.zip",
  "destination": "/websites/example.com/restored"
}
```

**3. Search Files**
```bash
GET /api/search?path=/websites/example.com&pattern=*.php&maxDepth=5
Authorization: Bearer <your-token>
```

**4. Search Content (grep)**
```bash
GET /api/grep?path=/websites/example.com&query=database_password&recursive=true
Authorization: Bearer <your-token>
```

**5. Check Directory Size**
```bash
GET /api/du?path=/websites/example.com/uploads
Authorization: Bearer <your-token>
```

**6. Calculate Checksum**
```bash
GET /api/checksum?path=/websites/example.com/backup.zip&algorithm=sha256
Authorization: Bearer <your-token>
```

---

### **3. Terminal/Shell (untuk Admin)** ✅

**Lokasi:** Panel → **Nodes** → Klik tombol **SHELL** pada server

**Operasi yang Tersedia:** Semua command Linux/Windows native
- ✅ zip, unzip, tar, gzip
- ✅ grep, find, du
- ✅ chmod, chown
- ✅ md5sum, sha256sum
- ✅ Dan semua command shell lainnya

**Cara Pakai:**
1. Login ke Panel
2. Klik menu **"Nodes"** di sidebar
3. Cari server yang ingin diakses
4. Klik tombol **"SHELL"** (ikon terminal)
5. Terminal interaktif akan terbuka
6. Jalankan command seperti biasa:
   ```bash
   # Buat ZIP
   zip -r backup.zip /websites/example.com
   
   # Search files
   find /websites -name "*.php"
   
   # Check size
   du -sh /websites/example.com/uploads
   
   # Calculate checksum
   sha256sum backup.zip
   ```

---

## 🎯 **Rekomendasi Penggunaan**

### **Untuk User Biasa:**
✅ **Gunakan File Explorer (UI)**
- Paling mudah dan user-friendly
- Drag & drop upload
- Visual file browser
- Cocok untuk operasi dasar sehari-hari

### **Untuk Developer/Advanced User:**
✅ **Gunakan API Endpoints**
- Automation & scripting
- Integration dengan aplikasi lain
- Batch operations
- Custom workflows

### **Untuk System Admin:**
✅ **Gunakan Terminal/Shell**
- Full control dengan native commands
- Scripting & automation
- Troubleshooting
- Advanced operations

---

## 📚 **Dokumentasi Lengkap**

### **1. API Reference**
```bash
GET /api/help
```
Menampilkan dokumentasi lengkap semua endpoint dengan contoh.

### **2. Markdown Documentation**
File: `docs/TUNNEL_FILE_TRANSFER_COMPLETE.md`
- Architecture overview
- Detailed API examples
- Security considerations
- Troubleshooting guide

---

## 🔐 **Authentication**

Semua API endpoint memerlukan **Bearer Token**:

```bash
Authorization: Bearer <your-token>
```

**Cara Mendapatkan Token:**
1. Login ke Panel
2. Buka Developer Tools (F12)
3. Cek localStorage atau sessionStorage
4. Cari key `token` atau `authToken`

Atau gunakan endpoint login:
```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "your-username",
  "password": "your-password"
}
```

Response akan berisi token yang bisa digunakan.

---

## 💡 **Use Cases & Examples**

### **Use Case 1: Backup Website**
**Via API:**
```bash
# 1. Create backup
POST /api/tar
{
  "path": "/websites/example.com",
  "files": ["public_html", "database_backup.sql"],
  "archiveName": "backup-2026-01-14.tar.gz",
  "compress": "gzip"
}

# 2. Download backup
GET /api/download?path=/websites/example.com/backup-2026-01-14.tar.gz&name=backup.tar.gz
```

**Via Terminal:**
```bash
cd /websites/example.com
tar -czf backup-2026-01-14.tar.gz public_html database_backup.sql
```

---

### **Use Case 2: Find & Replace in Files**
**Via API:**
```bash
# 1. Find files containing text
GET /api/grep?path=/websites/example.com&query=mysql_connect&recursive=true

# 2. Read file
GET /api/read-content?path=/websites/example.com/config.php

# 3. Update file
PUT /api/save-content
{
  "path": "/websites/example.com/config.php",
  "content": "<?php\n// Updated content\n?>"
}
```

**Via Terminal:**
```bash
# Find files
grep -r "mysql_connect" /websites/example.com

# Replace in files
sed -i 's/mysql_connect/mysqli_connect/g' /websites/example.com/config.php
```

---

### **Use Case 3: Disk Space Analysis**
**Via API:**
```bash
# Check each folder size
GET /api/du?path=/websites/example.com/uploads
GET /api/du?path=/websites/example.com/cache
GET /api/du?path=/websites/example.com/logs
```

**Via Terminal:**
```bash
du -sh /websites/example.com/*
```

---

### **Use Case 4: File Integrity Check**
**Via API:**
```bash
# Calculate checksum before transfer
GET /api/checksum?path=/websites/example.com/backup.zip&algorithm=sha256

# After download, compare checksums
```

**Via Terminal:**
```bash
sha256sum backup.zip
```

---

## 🚀 **Quick Start Guide**

### **1. Untuk Operasi Dasar (Upload, Download, Edit)**
→ **Gunakan File Explorer UI**
1. Login ke Panel
2. Klik "Explorer"
3. Navigate & klik kanan untuk opsi

### **2. Untuk Archive Operations (ZIP, TAR, GZIP)**
→ **Gunakan API atau Terminal**

**API:**
```bash
curl -X POST https://your-panel.com/api/zip \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/websites/example.com",
    "files": ["uploads", "config.php"],
    "archiveName": "backup.zip"
  }'
```

**Terminal:**
```bash
# Buka Shell di Panel → Nodes → SHELL
zip -r backup.zip /websites/example.com/uploads /websites/example.com/config.php
```

### **3. Untuk Search & Analysis**
→ **Gunakan API atau Terminal**

**API:**
```bash
# Search files
curl "https://your-panel.com/api/search?path=/websites&pattern=*.php" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search content
curl "https://your-panel.com/api/grep?path=/websites&query=password&recursive=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Terminal:**
```bash
# Search files
find /websites -name "*.php"

# Search content
grep -r "password" /websites
```

---

## ❓ **FAQ**

**Q: Apakah semua operasi bisa digunakan via UI?**
A: Saat ini operasi dasar (upload, download, edit, delete, rename) sudah ada di File Explorer UI. Untuk operasi advanced (archive, search, checksum), gunakan API atau Terminal.

**Q: Bagaimana cara mengakses API dari aplikasi saya?**
A: Gunakan HTTP client (axios, fetch, curl) dengan Bearer token authentication. Lihat contoh di dokumentasi `/api/help`.

**Q: Apakah operasi ini bekerja untuk server Tunnel?**
A: Ya! Semua operasi otomatis support baik Direct maupun Tunnel mode.

**Q: Bagaimana cara melihat daftar lengkap operasi?**
A: Akses endpoint `GET /api/help` atau baca file `docs/TUNNEL_FILE_TRANSFER_COMPLETE.md`.

**Q: Apakah ada batasan ukuran file?**
A: Upload/download menggunakan chunking, jadi tidak ada batasan ukuran file (tested sampai GB).

---

## 📞 **Support**

Jika ada pertanyaan atau masalah:
1. Cek dokumentasi lengkap di `docs/TUNNEL_FILE_TRANSFER_COMPLETE.md`
2. Akses API help: `GET /api/help`
3. Lihat logs di Terminal untuk troubleshooting

---

**Last Updated:** 2026-01-14  
**Version:** 3.2.0  
**Total Operations:** 28
