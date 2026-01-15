# 🤖 Yumna AI Assistant - FAQ & Knowledge Base

Selamat datang di asisten AI YumnaPanel! Berikut adalah daftar pertanyaan yang sering diajukan (FAQ) dan panduan cepat untuk membantu Anda mengelola server.

### 👋 Sapaan & Interaksi
**Q: Halo, Hai, Hallo, Heii**
A: Halo! Saya adalah Asisten AI YumnaPanel. Ada yang bisa saya bantu untuk mengelola server atau website Anda hari ini?

**Q: Assalamualaikum**
A: Wa'alaikumussalam! Semoga hari Anda menyenangkan. Ada fitur YumnaPanel yang ingin Anda tanyakan atau butuh bantuan teknis?

**Q: Terima kasih, Thanks, Makasih**
A: Sama-sama! Senang bisa membantu. Jika butuh bantuan lagi, jangan ragu untuk bertanya. Selamat bekerja!

**Q: Apa kabar?**
A: Kabar baik! Saya selalu siap membantu Anda mengelola infrastruktur server dengan lebih mudah. Bagaimana dengan Anda?

---

### 🌐 Kelola Website & Domain
**Q: Bagaimana cara menambahkan website baru?**
A: Buka menu **Explorer** atau **Websites**, lalu klik "Create Website". Masukkan domain Anda (contoh: example.com) dan tentukan Document Root-nya.

**Q: Bagaimana cara mengubah versi PHP?**
A: Anda dapat mengubah versi PHP per domain melalui pengaturan website. Versi yang didukung biasanya berkisar dari PHP 7.4 hingga 8.3.

**Q: Apa itu "Hybrid Stack"?**
A: YumnaPanel mendukung mode Hybrid dimana **Nginx** bertindak sebagai reverse proxy (menangani file statis) dan **Apache** menangani konten dinamis (PHP). Ini adalah konfigurasi yang direkomendasikan untuk performa dan fleksibilitas .htaccess.

**Q: Bagaimana cara setup Subdomain?**
A: Anda bisa menambahkan subdomain sebagai website baru atau melalui menu **DNS Management**. Pastikan A Record subdomain tersebut sudah diarahkan ke IP server Anda.

**Q: Apakah saya bisa menggunakan Node.js atau Python?**
A: Ya! YumnaPanel mendukung deployment aplikasi Node.js (via PM2) dan Python (via Gunicorn/WSGI). Anda dapat mengaturnya di menu "App Manager".

---

### � Email & DNS
**Q: Bagaimana cara membuat akun Email?**
A: Buka menu **Mail**, pilih domain Anda, lalu klik "Create Account". Anda bisa menentukan kuota box untuk setiap user.

**Q: Bagaimana cara akses Webmail?**
A: Anda bisa mengakses webmail melalui URL `mail.domainanda.com` atau melalui menu log-in cepat di dalam Panel.

**Q: Apa itu SPF, DKIM, dan DMARC?**
A: Ini adalah catatan DNS untuk memverifikasi bahwa email dikirim dari server yang sah. YumnaPanel secara otomatis menggenerasi catatan ini saat Anda membuat domain email guna mencegah email masuk ke folder Spam.

**Q: Bagaimana cara mengatur Nameserver?**
A: Jika server Anda bertindak sebagai DNS Server, arahkan NS domain Anda di Registrar ke `ns1.yumnapanel.com` dan `ns2.yumnapanel.com` (sesuai setup branding Anda).

---

### �📂 File Management & Explorer
**Q: Bagaimana cara upload file?**
A: Buka menu **Explorer**, masuk ke direktori tujuan, lalu gunakan tombol "Upload" di toolbar atau cukup Drag & Drop file Anda ke area browser.

**Q: Di mana lokasi file website saya?**
A: Secara default, file website admin berada di `C:/YumnaPanel/www/` (Windows) atau `/var/www/` (Linux). Untuk user biasa, biasanya berada di folder home mereka.

**Q: Apakah saya bisa kompres file ke ZIP melalaui Panel?**
A: Ya! Klik kanan pada file atau folder di Explorer, lalu pilih opsi "Archive" atau "Zip".

**Q: Cara menggunakan FTP?**
A: Buka menu **FTP Accounts**, buat akun baru, lalu gunakan aplikasi seperti FileZilla dengan host IP Server Anda dan port 21.

---

### 🛡️ Keamanan & Firewall
**Q: Bagaimana cara memblokir IP yang mencurigakan?**
A: Buka menu **Security Center**. Anda dapat melihat log serangan dan memblokir IP secara manual atau membiarkan sistem FraudGuard melakukannya secara otomatis.

**Q: Bagaimana cara memasang SSL?**
A: YumnaPanel mendukung instalasi SSL gratis via Let's Encrypt. Buka detail website Anda, lalu klik tab **SSL** dan pilih "Issue Certificate".

**Q: Bisakah saya memasang SSL berbayar (PositiveSSL/Comodo)?**
A: Bisa. Buka tab SSL, pilih "Custom Certificate", lalu masukkan file CRT dan Private Key yang Anda dapatkan dari vendor SSL.

**Q: Apa itu FraudGuard?**
A: Fitur keamanan cerdas yang mendeteksi pola serangan Brute Force, SQL Injection, dan DDoS secara real-time untuk memproteksi server Anda.

---

### 🗄️ Database
**Q: Bagaimana cara membuat database baru?**
A: Buka menu **Databases**, masukkan nama database yang diinginkan, dan buat user database baru untuk mengaksesnya.

**Q: Apakah ada phpMyAdmin?**
A: Ya, phpMyAdmin tersedia sebagai plugin. Pastikan Anda sudah menginstalnya di menu "Plugins".

**Q: Cara Remote Database dari luar server?**
A: Pastikan Anda menambahkan IP remote Anda ke dalam "Allowed Hosts" di pengaturan Database agar koneksi tidak diblokir oleh firewall.

---

### � Backup & Restore
**Q: Bagaimana cara melakukan Backup?**
A: Anda bisa melakukan backup manual via menu **Backups** atau mengatur jadwal backup otomatis ke Local Storage, Google Drive, atau S3 Object Storage.

**Q: Apakah backup mencakup Database?**
A: Ya, sistem backup terpadu kami mencakup File Website, Database MySQL, dan Konfigurasi Email dalam satu paket arsip.

---

### �🚀 Multi-Server & Distributed
**Q: Apa bedanya Master Node dan Agent Node?**
A: **Master Node (WHM)** adalah pusat kontrol panel, sedangkan **Agent Node** adalah server worker tempat website dan resource Anda benar-benar berjalan.

**Q: Server saya offline di dashboard, apa yang harus dilakukan?**
A: Pastikan Agent service berjalan di server tersebut. Anda bisa mencoba merestart agent dengan command `npm run restart` di folder agent atau via SSH.

---

### ⚙️ System & Troubleshoot
**Q: Panel terasa lambat, apa penyebabnya?**
A: Cek penggunaan CPU dan RAM di Dashboard. Jika sudah mencapai 90%+, pertimbangkan untuk upgrade resource atau optimasi website Anda.

**Q: Lupa password admin?**
A: Anda dapat mereset password via command line di folder WHM menggunakan script utilitas yang disediakan.

**Q: Cara cek Log Error Website?**
A: Masuk ke menu **Websites**, pilih domain, lalu klik tab **Logs**. Anda bisa melihat error log Apache/Nginx secara langsung.

---

**Tip AI:** Jika Anda memiliki pertanyaan teknis lebih lanjut, sertakan detail error message agar asisten AI kami dapat membantu dengan lebih akurat!
