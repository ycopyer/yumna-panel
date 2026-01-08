# 🚀 Yumna Panel - Advanced Hosting & Server Control Panel

Modern, secure, and feature-rich Webserver & Hosting Management Panel built with React and Node.js.

![Version](https://img.shields.io/badge/version-2.1.0-purple.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

### 🖥️ Desktop Control Center (v2.1.0)
- ✅ **Standalone EXE Launcher** - Native C# wrapper for a professional desktop experience
- ✅ **System Tray Integration** - Minimize to tray with quick-action service controls
- ✅ **Single Instance Logic** - Prevents duplicate window launches and handles focus automatically
- ✅ **Glassmorphism Dashboard** - Modern, premium UI for real-time service monitoring

### 🛡️ Unified Security Engine (v2.1.0)
- ✅ **ClamAV Shield** - Real-time antivirus status monitoring and direct process control
- ✅ **Firewall Orchestrator** - One-click Windows Firewall (netsh) toggle from the dashboard
- ✅ **Live Security Logs** - Real-time visualization of startup and security events

### 📝 Monaco Editor & Direct Edit (v1.8.0)
- ✅ **VS Code Engine** - Full Monaco Editor integration for professional text editing
- ✅ **Direct Edit Mode** - Instant "Edit Content" action button to skip preview

### 🧩 Software Center & Plugins (v1.7.0)
- ✅ **Plugin Marketplace** - Modular installation for phpMyAdmin, Docker, and Composer
- ✅ **phpMyAdmin Automation** - One-click setup with dynamic PHP linking

### 🌐 Webserver & Hosting Management (v1.6.0)
- ✅ **Website Management** - Manage Nginx/Apache VHosts with path auto-detection
- ✅ **SSL Automation** - One-click SSL issuance via Win-ACME
- ✅ **Database Control** - Professional MySQL/MariaDB management suite

## 📜 Changelog

### [2.1.0] - 2026-01-09
- **Native EXE Architecture**: Converted the panel into a professional C# executable.
- **System Tray PRO**: Added "Minimize to Tray" with right-click menu for Start/Stop services.
- **Security Dashboard**: Integrated real-time controls for ClamAV and Windows Firewall.

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

**Version**: 2.1.0
**Last Updated**: 2026-01-09
