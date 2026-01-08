# 🛡️ Statement of Applicability (SoA)
**System:** SFTP File Manager Drive (v1.4.0)  
**Standard:** ISO/IEC 27001:2022 Implementation Guidance  
**Status:** 🛡️ Compliant with Advanced Controls  

## 📑 Overview
Dokumen ini merangkum penerapan kontrol keamanan informasi berdasarkan ISO 27001 Annex A yang telah diimplementasikan ke dalam sistem SFTP File Manager.

---

## 🔐 1. Organizational Controls (Annex A.5)

| Control | Implementation Title | Implementation Details |
|---------|----------------------|------------------------|
| **A.5.15** | Access Control | Sistem menggunakan RBAC (Role-Based Access Control) yang membedakan hak akses Admin, User, dan Viewer secara ketat di sisi server (middleware). |
| **A.5.16** | Identity Management | Setiap user memiliki identitas unik yang tersinkronisasi dengan database MySQL. Tidak ada akun anonim yang diizinkan melakukan operasi file. |
| **A.5.18** | Access Rights | Admin memiliki kontrol penuh untuk mencabut hak akses user atau membatalkan sesi aktif secara real-time. |

---

## 👥 2. People Controls (Annex A.6)

| Control | Implementation Title | Implementation Details |
|---------|----------------------|------------------------|
| **A.6.3** | Information Security Awareness | Sistem menyediakan template email 2FA formal yang mengedukasi pengguna tentang keamanan akun dan prosedur pelaporan jika terjadi akses ilegal. |

---

## 💻 3. Technological Controls (Annex A.8)

| Control | Implementation Title | Implementation Details |
|---------|----------------------|------------------------|
| **A.8.2** | Privileged Access Rights | Fungsi administrasi (Firewall, User Management) dilindungi oleh middleware `requireAdmin` yang memverifikasi role di setiap request. |
| **A.8.3** | Information Access Restriction | Kontrol Firewall di Layer 1 membatasi akses berdasarkan IP dan Username sebelum request mencapai data sensitif. |
| **A.8.5** | Secure Log-on | Implementasi Password + 2FA Email + Captcha untuk mencegah serangan otomatis dan brute-force. |
| **A.8.7** | Protection against Malware | Implementasi Zero-Day Heuristics Engine dan Shannon Entropy Analysis untuk mendeteksi payload berbahaya dan malware yang dipadatkan (packed) secara real-time. |
| **A.8.12** | Data Leakage Prevention | Path Sanitization mencegah serangan Path Traversal (`../`) yang bisa mengekspos file sistem di luar direktori SFTP. |
| **A.8.15** | Logging | Tabel `activity_history` dan `threat_logs` mencatat USER, IP, AKSI, HEURISTIC findings, dan TIMESTAMP untuk audit forensik. |
| **A.8.16** | Monitoring Activities | Behavioral Reputation Scoring memantau deviasi perilaku pengguna secara terus-menerus. Integrasi Telegram memberikan alert kritis instan. |
| **A.8.24** | Use of Cryptography | Menggunakan AES-256 (CBC) untuk mengenkripsi password internal dan kredensial server SFTP eksekutif di database. |
| **A.8.27** | Secure System Architecture | Arsitektur Middleware berlapis dengan deep-packet inspection pada level aplikasi untuk memfilter payload berbahaya sebelum pemrosesan. |

---

## 🔒 4. Conclusion
Sistem ini telah memenuhi kontrol teknis utama ISO 27001, khususnya dalam modul **Identity & Access Management (IAM)** dan **Security Monitoring**.

**Authored by:** Antigravity Security Engine  
**Authorized Date:** 2026-01-03
