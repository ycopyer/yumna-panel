# 🚀 Yumna Panel - Advanced Hosting & Server Control Panel

Modern, secure, and feature-rich Webserver & Hosting Management Panel built with React and Node.js.

![Version](https://img.shields.io/badge/version-1.8.0-purple.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

### 📝 Monaco Editor & Direct Edit (v1.8.0)
- ✅ **VS Code Engine** - Full Monaco Editor integration for professional text editing
- ✅ **Direct Edit Mode** - Instant "Edit Content" action button to skip preview
- ✅ **Syntax Highlighting** - Support for 40+ file extensions (JS, PHP, SQL, Python, Shell, etc.)
- ✅ **Config Specialist** - Professional editing of `.env`, `.yaml`, `.ini`, `Dockerfile`, and `Makefile`
- ✅ **Atomic Save** - Robust save functionality directly back to SFTP/Local storage

### 🧩 Software Center & Plugins (v1.7.0)
- ✅ **Plugin Marketplace** - Modular installation for essential tools (phpMyAdmin, Docker, Composer)
- ✅ **phpMyAdmin Automation** - One-click setup with dynamic PHP engine linking and auto-configuration
- ✅ **Cross-Platform** - Unified logic supporting both Windows (TCP) and Linux (Unix Sockets) environments

### 🌐 Webserver & Hosting Management (v1.6.0)
- ✅ **Website Management** - Manage Nginx/Apache Virtual Hosts with Smart Path Auto-detection
- ✅ **SSL Automation** - One-click SSL issuance using **Win-ACME (Windows)** & Certbot (Linux)
- ✅ **Website Wizard** - Auto-create Document Root & Default Index page for new sites
- ✅ **Database Control** - Create, manage, drop, and clone MySQL/MariaDB databases
- ✅ **DNS Automation** - Auto-configure DNS Zones & Records (A, CNAME, MX)
- ✅ **Advanced PHP Control** - Multi-version installer (5.6 - 8.x), extension toggle (mysqli, gd, etc.), and `php.ini` editor

### 📁 File Management
- ✅ **Upload Files** - Single & multiple file upload with drag & drop support
- ✅ **Download Files** - Individual files or multiple files as ZIP
- ✅ **Create Folders** - Organize your files with folders
- ✅ **Rename** - Rename files and folders
- ✅ **Delete** - Move files to trash (with recovery option)
- ✅ **Advanced Preview/Edit** - Integrated Monaco Editor for text, native players for media
- ✅ **Unix Permissions** - Display file `mode`, `uid`, and `gid` in detail view
- ✅ **Search** - Recursive global search support for shared directories

### ️ Cyber-Intelligence & Zero-Day Defense
- ✅ **Interactive Threat Map** - Real-time visualization of network attacks with missile & explosion animations
- ✅ **Zero-Day Heuristics Engine** - Proactive detection of shell payloads, SQLi, and advanced obfuscation
- ✅ **Behavioral Reputation Scoring** - Real-time client risk assessment with persistent behavioral memory
- ✅ **AbuseIPDB™ Integration** - Global IP reputation checks and technical network fingerprints
- ✅ **Geo-Blocking Management** - Block entire countries with a single click (Leaflet integrated)
- ✅ **Massive Bot Protection** - Signature-based blocking for 500+ malicious crawlers and AI scrapers
- ✅ **Unblock Appeals System** - Professional interface for managing user IP release requests

### � Premium Mobile UX
- ✅ **Mobile PWA** - Installable as a Progressive Web App on Android/iOS
- ✅ **Radical Responsiveness** - 8px typography & optimized 40px touch targets
- ✅ **One-Handed Navigation** - Key actions moved near thumb zones
- ✅ Glassmorphism design with Dark/Light theme support

## 📜 Changelog

For a detailed version history, please refer to the [CHANGELOG.md](./docs/CHANGELOG.md) file.

### [1.8.0] - 2026-01-07
- **Editor Upgrade**: Full Monaco Editor integration replace basic text preview.
- **Direct Edit**: New "Edit Content" button for instant production modifications.
- **Robust Path Sync**: Refactored preview state to prevent "no response" modal issues.

### [1.7.0] - 2026-01-07
- **Software Center**: Modular Plugin Manager for phpMyAdmin, Docker, and Composer.
- **phpMyAdmin Integration**: One-click install with auto-configured PHP extensions.

### [1.6.0] - 2026-01-06
- **Windows Standalone Ready**: Integrated Win-ACME for automatic SSL.
- **Smart Hosting**: Automatic document root creation and OS-aware path suggestions.

## 📋 Prerequisites

- Node.js (v18 or higher recommended)
- MySQL/MariaDB
- SFTP server access
- **Windows/Linux Build Tools** (Required for compiling `argon2` native module)
- **Win-ACME / Certbot** (For SSL automation)

## 🛠️ Installation

### 1. Clone the repository

```bash
git clone <repository-url>
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

**Version**: 1.8.0
**Last Updated**: 2026-01-07
