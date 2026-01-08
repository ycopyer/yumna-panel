# Troubleshooting: Test Connection Button Tidak Muncul

## Langkah-langkah Debugging:

### 1. Hard Refresh Browser
- Tekan `Ctrl + Shift + R` (Chrome/Edge)
- Atau `Ctrl + F5`
- Atau buka **DevTools** (F12) → klik kanan tombol refresh → pilih **"Empty Cache and Hard Reload"**

### 2. Clear Service Worker (PWA)
Aplikasi ini menggunakan PWA yang mungkin meng-cache versi lama:

1. Buka DevTools (F12)
2. Pergi ke tab **Application**
3. Di sidebar kiri, klik **Service Workers**
4. Klik **Unregister** pada service worker yang aktif
5. Refresh halaman (F5)

### 3. Verifikasi File Loaded
1. Buka DevTools (F12)
2. Pergi ke tab **Network**
3. Refresh halaman
4. Cari file `SettingsModal` atau file JS utama
5. Klik file tersebut dan cek apakah ada kode "Test Connection"

### 4. Cek Console Errors
1. Buka DevTools (F12)
2. Pergi ke tab **Console**
3. Lihat apakah ada error merah
4. Screenshot error jika ada

### 5. Verifikasi State
Buka Settings Modal dan di Console ketik:
```javascript
// Cek apakah komponen ter-render
document.querySelector('button').innerText
```

### 6. Restart Dev Server
Jika semua gagal, restart dev server:
```bash
# Stop current dev server (Ctrl+C)
# Then run:
npm run dev
```

## File yang Diubah:
- ✅ `client/src/components/SettingsModal.tsx` (Test Connection UI)
- ✅ `server/src/routes/profile.js` (Test Connection API)

## Endpoint API:
- URL: `POST /api/test-sftp-connection`
- Auth: Required (requireAuth middleware)
- Body: `{ host, port, username, password }`

## Cek Manual di Browser:
Buka: http://localhost:3000
Login → Klik Settings Icon → Lihat apakah ada tombol "Test Connection" di bawah field Password

Jika masih tidak muncul, screenshot Settings Modal dan kirimkan ke saya.
