# Yumna Panel - API Documentation

Infrastruktur API Yumna Panel dirancang untuk integrasi yang aman, cepat, dan handal. Semua endpoint (kecuali otentikasi) memerlukan header identifikasi sesi yang valid.

## Dasar (Base)
- **Base URL**: `/api`
- **Format Data**: `application/json`
- **Header Wajib (Authenticated)**:
  - `x-user-id`: ID pengguna yang sedang aktif.
  - `x-session-id`: ID sesi yang valid.

---

## 1. Otentikasi & Keamanan (Auth)

### Get Captcha
Mengambil data captcha visual untuk proses login.
- **Endpoint**: `GET /captcha`
- **Response**: `{ "id": "uuid", "svg": "<svg>..." }`

### Login
Otentikasi pengguna utama.
- **Endpoint**: `POST /login`
- **Body**:
  ```json
  {
    "username": "user_admin",
    "password": "your_password",
    "captchaId": "uuid_from_captcha",
    "captchaText": "CODE123"
  }
  ```
- **Response (Success)**: `{ "userId": 1, "username": "admin", "role": "admin", "sessionId": "sess_uuid" }`
- **Response (2FA Required)**: `{ "requires2FA": true, "twoFactorId": "uuid" }`

### Verify 2FA
Verifikasi kode sekali pakai (OTP) yang dikirim melalui email.
- **Endpoint**: `POST /verify-2fa`
- **Body**: `{ "twoFactorId": "uuid", "code": "654321" }`

---

## 2. Manajemen File (Explorer)

### List Directory
Melihat daftar file dan folder pada path tertentu.
- **Endpoint**: `GET /ls?path=/Local Storage/www`
- **Response**: Array of object file/folder `{ name, type, size, mtime, permissions, isShared, ... }`

### Download File/Folder
Mengunduh file tunggal atau folder (sebagai .zip).
- **Endpoint**: `GET /download?path=/folder/file.ext&name=file.ext`

### Save Content
Memperbarui konten file teks.
- **Endpoint**: `PUT /save-content`
- **Body**: `{ "path": "/path/to/file.txt", "content": "konten baru" }`

### Change Permissions (Chmod)
Mengubah izin akses file/folder (mode oktal).
- **Endpoint**: `PUT /chmod`
- **Body**: `{ "path": "/path/to/file", "mode": "755" }`

---

## 3. Hosting & Website

### Manajemen Website
- **GET /hosting/websites**: Daftar website yang terdaftar.
- **POST /hosting/websites**: Membuat website baru.
  - **Body**: `{ "domain": "domain.com", "rootPath": "/www/domain" }`
- **DELETE /hosting/websites/:domain**: Menghapus website.

### Manajemen Database
- **GET /hosting/databases**: Daftar database.
- **POST /hosting/databases**: Membuat database baru.
  - **Body**: `{ "name": "db_name", "user": "db_user", "password": "pass" }`

### Manajemen DNS
- **GET /hosting/dns**: Daftar zona DNS.
- **POST /hosting/dns/records**: Menambah record DNS (A, CNAME, MX, dll).

---

## 4. Keamanan & Firewall

### Threat Intelligence
- **GET /security/stats**: Mendapatkan statistik serangan real-time (Map Data).
- **GET /security/firewall**: Daftar IP yang diblokir.
- **POST /security/firewall/block**: Memblokir IP secara manual.

---

## 5. Sistem & Utilitas

### Server Pulse (Analytics)
Mendapatkan statistik penggunaan resource server (CPU, RAM, Disk).
- **Endpoint**: `GET /analytics/server-pulse`

### Terminal Access
Akses shell perintah melalui browser (Web Terminal).
- **Endpoint**: `POST /terminal/execute` (WebSocket supported for live terminal).

### Site Settings
Mengambil atau memperbarui pengaturan panel (Logo, Title, API Keys).
- **GET /settings-site**
- **POST /settings-site** (Admin only)

---

## Kode Status (Response Codes)
- `200 OK`: Permintaan berhasil.
- `400 Bad Request`: Parameter atau input tidak valid.
- `401 Unauthorized`: Sesi tidak valid atau belum login.
- `403 Forbidden`: Tidak memiliki izin (khusus admin).
- `429 Too Many Requests`: Trigger rate limiting.
- `500 Server Error`: Kesalahan internal pada server.

&copy; 2026 Yumna Panel Ecosystem. Crafted for high-performance infrastructure.
