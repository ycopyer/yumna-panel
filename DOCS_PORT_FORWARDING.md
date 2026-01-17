# Port Forwarding (Reverse Tunnel Relay) Documentation

Fitur **Port Forwarding** (atau **Port Relay**) pada Yumna Panel memungkinkan Anda untuk mengakses layanan internal pada server Agent (yang terhubung via Reverse Tunnel) melalui alamat IP Master Panel. Ini sangat berguna untuk server yang tidak memiliki IP Publik atau berada di belakang NAT/Firewall ketat.

## 🚀 Cara Kerja
Layanan `TcpForwarderService` pada Master Panel akan mendengarkan (*listen*) pada port tertentu (**Master Port**) dan meneruskan seluruh lalu lintas data secara transparan ke port tujuan pada Agent (**Agent Port**) melalui tunnel WebSocket yang aman.

---

## 🛠 Panduan Konfigurasi
1. Buka menu **Port Forwarding** di Sidebar Dashboard.
2. Klik tombol **"Initialize Port Relay"**.
3. Isi kolom berikut:
   - **Target Node:** Pilih server Agent yang diinginkan (Status harus `active`).
   - **Master Port:** Port kosong di server Master (Contoh: `13306`).
   - **Agent Port:** Port layanan di server Agent (Contoh: `3306` untuk MySQL).
   - **Description:** Nama pengenal (Contoh: `Akses Database WebServ2`).
4. Klik **Establish Relay Connection**.

---

## 💻 Contoh Penggunaan

### 1. Mengakses MariaDB/MySQL via Navicat
Jika Anda memetakan Master Port `13306` -> Agent Port `3306`:
- **Host/IP:** `IP_MASTER_PANEL`
- **Port:** `13306`
- **User & Pass:** Gunakan kredensial database yang ada di server Agent.

### 2. Mengakses SSH Server
Jika Anda memetakan Master Port `10022` -> Agent Port `22`:
- **Command:** `ssh -p 10022 root@IP_MASTER_PANEL`

### 3. Mengakses Layanan Web
Jika Anda memetakan Master Port `9000` -> Agent Port `80`:
- **URL:** `http://IP_MASTER_PANEL:9000`

---

## ❗ Hal Penting (PENTING)
Agar fitur ini dapat diakses dari jaringan luar:
1. **Firewall Master VPS:** Anda harus membuka port Master (misal `13306`) pada Firewall provider Anda (Security Groups) atau via CLI:
   ```bash
   ufw allow 13306/tcp
   ```
2. **Koneksi Tunnel:** Pastikan Agent terhubung menggunakan mode **Reverse Tunnel**. Jika status Agent adalah `direct`, mapping ini tidak diperlukan karena Anda bisa mengaksesnya langsung via IP Agent.
3. **Re-initialize:** Jika ada perubahan mapping, layanan akan otomatis di-reload secara real-time.

---

*© 2026 Yumna Panel - Advanced Infrastructure Management*
