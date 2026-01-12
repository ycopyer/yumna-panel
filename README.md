# 🚀 Yumna Panel v3.0 - Distributed Server Control Plane

Modern, distributed, and highly scalable Hosting & Infrastructure Management Panel built for the modern cloud.

![Version](https://img.shields.io/badge/version-3.1.0-success.svg)
![Completion](https://img.shields.io/badge/roadmap-100%25%20complete-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Architecture](https://img.shields.io/badge/architecture-WHM%2FAgent-blue.svg)
![Status](https://img.shields.io/badge/status-production%20ready-success.svg)

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

### 🌐 Live DNS Server Clusters (v3.0)
- ✅ **PowerDNS Integration** - Real DNS server with MySQL backend.
- ✅ **Multi-Node Clustering** - Distribute DNS across multiple servers for high availability.
- ✅ **Automatic Zone Sync** - Zones automatically replicate to all cluster nodes.
- ✅ **DNSSEC Support** - Enable DNSSEC for enhanced security and data integrity.
- ✅ **Health Monitoring** - Real-time cluster health checks and node status.
- ✅ **Zone Transfer (AXFR)** - Automatic zone replication between nodes.
- ✅ **Cluster Management API** - Add/remove nodes, sync zones, monitor health.
- ✅ **PowerDNS Control** - Full PowerDNS daemon management and statistics.

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

### 🐳 Docker Container Management
- ✅ **Container Operations** - Create, start, stop, restart, and remove Docker containers.
- ✅ **Image Management** - Auto-pull images from Docker Hub if not available locally.
- ✅ **Live Monitoring** - Real-time container status with animated indicators.
- ✅ **Log Viewer** - Stream and view container logs with 200-line tail support.
- ✅ **Port Mapping** - Configure host-to-container port mappings during creation.
- ✅ **Environment Variables** - Set custom environment variables for containers.
- ✅ **Daemon Status** - Monitor Docker engine availability with graceful offline handling.

### ⛓️ Distributed Architecture (v3.0.0)
- ✅ **Distributed Control Plane (WHM)** - Centralized management for unlimited server nodes.
- ✅ **Lightweight Agents** - High-performance Node.js agents for target server orchestration.
- ✅ **Unified Dashboard** - Manage multiple servers from a single glassmorphism interface.
- ✅ **Multi-Server Integration** - Combine multiple panels into one centralized control plane.
- ✅ **Real-time Metrics** - Monitor CPU, RAM, Disk usage across all servers from one dashboard.
- ✅ **Automated Heartbeat** - Health checks every 5 minutes with automatic failover detection.
- ✅ **Remote Operations** - Deploy, restart services, and manage resources on any connected server.
- ✅ **Load Balancing** - Distribute traffic across multiple server nodes automatically.

#### **🌐 Multi-Server Resource Deployment (NEW!)**
- ✅ **Server Selection** - Choose which server to deploy resources to when creating:
  - Websites & Virtual Hosts
  - DNS Zones & Records
  - Databases (MySQL/PostgreSQL)
  - Email Accounts
  - FTP Accounts
  - SSL Certificates
  - Cron Jobs
- ✅ **Visual Server Metrics** - See CPU, RAM usage before selecting server
- ✅ **Smart Routing** - Automatic routing to local or remote Agent
- ✅ **Geographic Distribution** - Deploy resources closer to end users
- ✅ **Environment Isolation** - Separate production, staging, and development servers

**📖 Quick Start**: See [Multi-Server Integration Guide](docs/QUICK_START_MULTI_SERVER.md) to combine 2+ panels into one.
**📖 Complete Guide**: See [Multi-Server Final Summary](docs/MULTI_SERVER_FINAL_SUMMARY.md) for full documentation.

### 💼 Enterprise & Reseller Features (v3.0)
- ✅ **Reseller Hierarchy** - Multi-tier reseller system with parent-child relationships.
- ✅ **Custom Product Pricing** - Resellers can create and price their own hosting plans.
- ✅ **Indonesia Tax Compliance** - Automatic PPN 11% calculation with NPWP support.
- ✅ **Granular RBAC** - Role-based access control with custom permissions.
- ✅ **SLA Monitoring** - Automated uptime tracking and violation alerts.
- ✅ **Commercial Licensing** - Enterprise key verification system.

### 💳 Payment Gateway Integration (v3.0)
- ✅ **Stripe Integration** - Full credit/debit card payment support with Checkout Sessions.
- ✅ **PayPal Integration** - PayPal account payments with REST API v2.
- ✅ **Manual Payments** - Bank transfer and custom payment method support.
- ✅ **Transaction Management** - Complete transaction history and status tracking.
- ✅ **Webhook Handling** - Automated payment verification and provisioning.
- ✅ **Refund System** - Admin-controlled refund processing for all gateways.
- ✅ **Multi-Currency Support** - USD, EUR, GBP, IDR, SGD, MYR support.
- ✅ **Sandbox Mode** - Test mode for development and testing.

### 🔌 Developer SDK (v3.0)
- ✅ **Plugin Framework** - Comprehensive SDK for building Yumna Panel plugins.
- ✅ **Hook System** - 30+ hooks for extending core functionality.
- ✅ **CLI Tools** - Command-line tools for creating, validating, and building plugins.
- ✅ **API Integration** - Register custom API routes within plugins.
- ✅ **Settings Management** - Built-in settings system for plugin configuration.
- ✅ **Event System** - Plugin-to-plugin communication via events.
- ✅ **Utilities** - Validation, versioning, logging, and API helpers.
- ✅ **Example Plugins** - Ready-to-use examples (Slack notifications, analytics, etc.).

### 🛡️ Fraud Detection & Security (v3.0)
- ✅ **FraudGuard Engine** - Real-time velocity checks and IP reputation scoring.
- ✅ **Automated IP Blacklisting** - Auto-ban suspicious IPs based on behavior patterns.
- ✅ **Admin Fraud Monitor** - Dashboard for viewing detection logs and managing blacklists.
- ✅ **Transaction Protection** - Pre-order fraud analysis for billing operations.

### 🤖 AI-Powered Operations (v3.0)
- ✅ **Gemini AI Assistant** - Interactive chat bot for server troubleshooting.
- ✅ **Smart Code Review** - Automated security scanning for Git deployments.
- ✅ **Heuristic Scaling** - AI-driven resource allocation predictions.
- ✅ **Threat Prediction** - AI-enhanced firewall with FraudGuard integration.

### ☁️ Cloud Virtualization (v3.0)
- ✅ **Proxmox/KVM Integration** - Full VPS lifecycle management (create, start, stop, reboot).
- ✅ **Cloud Dashboard** - Visual interface for container and VM monitoring.
- ✅ **SDN Foundation** - Software-defined networking for private VPC setup.
- ✅ **Unified Management** - Manage VPS alongside traditional shared hosting.

### 🔌 Plugin Marketplace (v3.0)
- ✅ **Hook System** - Event-driven architecture for 3rd party developers.
- ✅ **Plugin Manager UI** - Install/uninstall plugins from the admin panel.
- ✅ **Curated Catalog** - phpMyAdmin, Roundcube, Docker UI, and more.
- ✅ **Developer SDK** - Foundation for building custom extensions.

---

## 🗺️ Development Roadmap

See our [ROADMAP.md](docs/ROADMAP.md) for the complete development journey.

**Current Status**: v3.0.0-final (Enterprise Edition)

**Recently Completed** (January 2026):
- ✅ Cloud Virtualization & VPS Management (KVM/Proxmox)
- ✅ AI-Ops & Gemini-powered Support Assistant
- ✅ Plugin Hook Infrastructure & Theme System
- ✅ Granular RBAC & Permissions
- ✅ SLA Monitoring & Uptime Reliability
- ✅ Commercial Licensing & Support Engine
- ✅ FraudGuard Service & IP Reputation Monitoring
- ✅ Indonesia Tax Compliance (PPN 11%, NPWP)
- ✅ Reseller Hierarchy & Sub-user Management

## 📜 Changelog

Detailed version history and changes can be found in the [CHANGELOG.md](docs/CHANGELOG.md).

---

## 📋 Prerequisites

- Node.js (v18 or higher recommended)
- MySQL/MariaDB
- SFTP server access
- **Windows/Linux Build Tools** (Required for compiling `argon2` native module)
- **Win-ACME / Certbot** (For SSL automation)

## 🛠️ Installation

### 1. Unified Deployment (Recommended)

Run the automated deployment script for a complete setup (WHM + Agent + Panel):

**🌍 Universal Installer**:
One script to rule them all. Supports:
- **Debian Family**: Ubuntu 20.04+, Debian 11+
- **RHEL Family**: CentOS 9, AlmaLinux 9, Rocky Linux 9
- **Arch Linux**: Arch, Manjaro
- **macOS**: Monterey, Ventura, Sonoma (Apple Silicon/Intel)
- **FreeBSD**: 13.x, 14.x (Experimental)

```bash
# Linux / macOS / FreeBSD
git clone https://github.com/ycopyer/yumna-panel.git /opt/yumna-panel
sudo bash /opt/yumna-panel/scripts/deploy/deploy_v3.sh
```

**🪟 Windows (Universal)**:
Run via PowerShell as Administrator:
```powershell
git clone https://github.com/ycopyer/yumna-panel.git C:\YumnaPanel
cd C:\YumnaPanel\scripts\deploy
.\deploy_v3.ps1
```
*(Or simply run `scripts\run\online.bat` as Administrator)*

### 2. Manual Installation
See [docs/INSTALL.md](docs/INSTALL.md) for detailed manual setup instructions.

## 👨‍💻 Development
To run Yumna Panel in development mode (Hot Reload):

### 1. Unified Environment Setup
Ensure you have Node.js (v20+) and MariaDB/MySQL installed.

**Stop Background Services** (if running):
```bash
# Windows
.\stop_background.vbs
```

### 2. Run Backend (WHM)
The central API and database manager.
```bash
cd whm
npm install
npm run dev
# Default: http://localhost:4000
```

### 3. Run Frontend (Panel)
The React administrative interface.
```bash
cd panel
npm install
npm run dev
# Default: http://localhost:5173
```

### 4. Run Agent (Worker)
The system executor for hosting tasks.
```bash
cd agent
npm install
npm run dev
# Default: http://localhost:3000 (or 4001)
```

---

## 🛠️ Troubleshooting

- **EADDRINUSE (Port busy)**: Run `taskkill /F /IM node.exe /T` (Windows) or `killall node` (Linux) to clear hanging processes.
- **MODULE_NOT_FOUND**: Always run `npm install` inside each component folder (`whm`, `agent`, `panel`) after an update.
- **ECONNREFUSED (Database)**: Ensure MariaDB service is started and your `.env` credentials are correct.

## 🛡️ Architecture
- **WHM**: Centralized Control Plane (API & Database).
- **Agent**: Lightweight micro-service running on target servers.
- **Panel**: React-based administrative interface.

## 📄 License
This project is licensed under the MIT License.

---

**Made with ❤️ by Yumna Panel Project Team**

**Version**: 3.0.0 (Production)

**Last Updated**: 2026-01-11

## 📚 Documentation

- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Contributing Guidelines](CONTRIBUTING.md)
- [Roadmap](docs/ROADMAP.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## 💬 Community & Support

- **Discord**: https://discord.gg/yumnapanel
- **Forum**: https://forum.yumnapanel.com
- **Email**: support@yumnapanel.com
- **Documentation**: https://docs.yumnapanel.com

## 🌟 Star History

If you find Yumna Panel useful, please consider giving it a star on GitHub!
