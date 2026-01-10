# 🚀 Yumna Panel - Advanced Hosting & Server Control Panel

Modern, secure, and feature-rich Webserver & Hosting Management Panel built with React and Node.js.

![Version](https://img.shields.io/badge/version-2.2.3-purple.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Core Features

### 🖥️ Desktop Control Center (v2.1.0)
- ✅ **Standalone EXE Launcher** - Native C# wrapper for a professional desktop experience.
- ✅ **System Tray Integration** - Minimize to tray with quick-action service controls.
- ✅ **Single Instance Logic** - Prevents duplicate window launches and handles focus automatically.
- ✅ **Glassmorphism Dashboard** - Modern, premium UI for real-time service monitoring.

### 🛡️ Security & Firewall (Unified Engine)
- ✅ **Firewall Orchestrator** - One-click Windows Firewall (netsh) toggle and rule management.
- ✅ **IP Intelligence** - IP ban/unban, IPSet anti-brute force, and API IP whitelisting.
- ✅ **SSH Jail & SFTP Jail** - Enhanced environment security for shared hosting.
- ✅ **Rate Limiting** - Per-IP connection and request throttling.

### 🌐 Web Hosting Management (cPanel/Plesk Grade)
- ✅ **Domain & Subdomain** - Complete management of virtual hosts, aliases, and redirects.
- ✅ **SSL Hub** - Automatic issuance (Let's Encrypt / Win-ACME), force SSL, and HSTS.
- ✅ **Web Server Stack Hub** - Switch between Nginx, Apache, or Hybrid (Nginx Proxy + Apache) in real-time.
- ✅ **PHP Selector** - Support for multiple PHP versions per domain with FastCGI cache.
- ✅ **Web Stats & Logs** - Real-time access/error logs and traffic monitoring.
- ✅ **FTP Management** - Create and manage FTP accounts per domain.

### 🧑‍💻 User & Access Management
- ✅ **Multi-Tenant System** - Add, delete, or suspend users with shared/reseller role support.
- ✅ **Access Security** - 2FA, SSH Key management, and API Access Key generation.
- ✅ **Resource Quotas** - Per-user limits for disk, bandwidth, CPU, and RAM.
- ✅ **Audit & Logging** - Detailed login logs and action audit trails.

### 🗄️ Database Management
- ✅ **Multi-Engine** - Support for MySQL, MariaDB, and PostgreSQL.
- ✅ **User Control** - Comprehensive database user and permission management.
- ✅ **Operations** - One-click Import/Export/Dump and database cloning.
- ✅ **Restore Hub** - Integrated restore engine (including Restic support).

### 📧 Email Server Management
- ✅ **Domain Mail** - Full lifecycle for accounts, aliases, and autoresponders.
- ✅ **Security Core** - DKIM, SPF, SSL Mail, and Anti-spam/Antivirus protection.
- ✅ **Delivery Engine** - SMTP Relay support and granular rate limiting.
- ✅ **Webmail** - Built-in integration for Roundcube and SnappyMail.

### 🌍 DNS Management
- ✅ **Zones & Records** - Full control over A, CNAME, MX, TXT, SOA.
- ✅ **DNSSEC** - Generate and manage DNSSEC keys with DS/DNSKEY records.
- ✅ **Cloudflare Sync** - One-click synchronization with Cloudflare CDN.
- ✅ **TTL & Clustering** - Customizable TTL/SOA settings and DNS Cluster support.

### 🔐 FTP Account Manager
- ✅ **Restricted FTP Accounts** - Create isolated FTP accounts for developers.
- ✅ **Quota Management** - Per-user FTP account limits.
- ✅ **Password Security** - Bcrypt hashing with strong password generator.
- ✅ **Storage Statistics** - Real-time file count and storage usage tracking.

### 💾 Backup & Restore
- ✅ **Incremental Backups** - Advanced backup system powered by Restic.
- ✅ **Remote Storage** - Backup to S3, SFTP, or local storage with auto-scheduling.
- ✅ **Granular Restore** - Restore specific files, databases, or entire domains effortlessly.

### ⚙️ System & Service Management
- ✅ **Service Control** - Restart/Stop services (Web, Mail, DNS, FTP) from the GUI.
- ✅ **Health Monitoring** - RRD monitoring for Disk, CPU, and RAM usage.
- ✅ **System Automation** - Hostname, Timezone, and Panel auto-update system.
- ✅ **Web Terminal** - Integrated shell for direct server console access.
- ✅ **Cron Job Manager** - Schedule and manage automated tasks.
- ✅ **SSH Account Manager** - Manage SSH access with key-based authentication.

### 🧩 Integrasi & Otomasi
- ✅ **Migration Suite** - Import accounts from cPanel and DirectAdmin.
- ✅ **Quick Install** - Rapid application deployment and per-user Composer support.
- ✅ **API Automation** - Full REST API for seamless external integration.

### 🔁 Maintenance & Repair
- ✅ **Advanced Repair** - Automatic configuration rebuilding for User, Domain, DNS, and Mail.
- ✅ **Performance Sync** - Update templates across clusters and flush caches.
- ✅ **Sync Cluster** - Maintain consistency across multi-server environments.

---

## 🗺️ Development Roadmap

See our [ROADMAP.md](ROADMAP.md) for planned features and development timeline.

**Current Focus (January 2026)**:
- 🔄 SSL/TLS Certificate Manager with Let's Encrypt
- 🔄 Advanced Backup System with encryption
- 🔄 File Manager enhancements with code editor
- 🔄 WordPress Auto-Installer

**Recently Completed**:
- ✅ DNS DNSSEC & Cloudflare Sync (January 2026)
- ✅ FTP Account Manager (January 2026)
- ✅ Cron Job Manager (January 2026)

## 📜 Changelog

### [2.2.3] - 2026-01-10
- **Multi-Engine Web Stack**: Switchable Nginx, Apache, or Hybrid (Proxy) architectures.
- **Standalone Core Architecture**: Migrated all engines (Nginx, Apache, PHP) to standalone local paths.
- **Documentation Refactoring**: Reorganized all guides and roadmaps into a dedicated `docs/` folder.
- **Version Alignment**: Synced internal and public versioning to v2.2.3.

### [2.2.2] - 2026-01-10
- **Git Integration**: New Git & Deploy module with webhook support.
- **FTP Fixes**: Fixed database schema errors.

### [2.2.1] - 2026-01-10
- **Stability & Polish**: Fixed PWA connectivity, resolved avatar upload paths, and refined Sidebar UI (96px logo, simplified profile).

### [2.2.0] - 2026-01-09
- **DNS Enhancements**: Added DNSSEC key generation and Cloudflare synchronization.
- **FTP Manager**: Complete FTP account management system with quota enforcement.
- **Security**: Bcrypt password hashing for FTP accounts, ownership verification.
- **Database**: Added `ftp_accounts` table and DNS security columns.

### [2.1.0] - 2026-01-09
- **Native EXE Architecture**: Converted the panel into a professional C# executable.
- **System Tray PRO**: Added "Minimize to Tray" with right-click menu for Start/Stop services.
- **Comprehensive Feature Set**: Added professional-grade modules for Email, DNS, Multi-Tenancy, and Advanced Backups.

### [1.8.0] - 2026-01-07
- **Editor Upgrade**: Full Monaco Editor integration.

---

## 📋 Prerequisites

- Node.js (v18 or higher recommended)
- MySQL/MariaDB
- SFTP server access
- **Windows/Linux Build Tools** (Required for compiling `argon2` native module)
- **Win-ACME / Certbot** (For SSL automation)

## 🛠️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/ycopyer/yumna-panel
cd yumna-panel
```

### 2. Native Setup (Recommended)

#### 🪟 Windows
Run the provided setup script to automatically provision Nginx, MariaDB, and PHP:
```powershell
scripts\run\online.bat
```

#### 🐧 Linux (Ubuntu/Debian)
Run the automated deployment script which installs Nginx/Apache, Multi-PHP Bundle, MariaDB, and configures the firewall:
```bash
chmod +x scripts/deploy/deploy.sh
sudo ./scripts/deploy/deploy.sh
```
*The script will prompt you to choose between Nginx or Apache.*

## 🚀 Running the Application

### Production Mode (PM2)
```bash
pm2 start ecosystem.config.js
```

## 📄 License

This project is licensed under the MIT License.

---

**Made with ❤️ by Yumna Panel Project Team**

**Version**: 2.2.2
**Last Updated**: 2026-01-10
