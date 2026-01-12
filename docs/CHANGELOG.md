# 📜 Versions History & Changelog

All notable changes to the **Yumna Panel** project will be documented in this file.

---

## [3.1.0] - 2026-01-12
### Added
- **Interactive Database Installer**:
    - New Wizard in `deploy_v3.sh` and `deploy_v3.ps1` prompts for Database Host, Name, User, and Password at first install.
    - Automatic creation of MariaDB Database and User on Linux Localhost setups using `sudo` privileges.
    - Auto-configuration of `.env` files based on wizard inputs.
- **Unified Security Architecture**:
    - Consolidated 5+ legacy firewall tables into a single robust `firewall` table and `security_patterns` table.
    - Improved synchronization speed between WHM and Agent nodes.
    - Standardized **Agent Port** to **4001** (previously 3000) for better firewall compliance.
    - Full implementation of "Threat Defense Center" with active session monitoring and login auditing.
- **System Stability**:
    - Fixed installer `mysql` authentication issues for modern MariaDB versions (Socket Auth compatible).
    - Unified Migration Script (`init_v3.js`) now handles all 20+ modules and security tables in one pass.

## [3.0.0] - 2026-01-11
### Added
- **Production Release**: Reached 100% Roadmap Completion! 🎊
- **High Availability (HA)**:
    - **WHM Clustering**: Multi-node control plane with automatic primary election.
    - **Failover System**: Automated and manual failover capabilities for zero-downtime operations.
    - **Load Balancing**: Built-in HTTP load balancer with Round-Robin, Least-Connections, and Weighted algorithms.
    - **Database Replication**: Master-Slave MySQL replication with read/write splitting.
    - **Session Sharing**: Distributed session management across cluster nodes.
- **CDN Integration**:
    - **Cloudflare**: Zone management, cache purging, SSL settings, and analytics.
    - **BunnyCDN**: Pull zone creation, storage management, and cache control.
- **Enterprise Tools**:
    - **Database Toolkit**: Advanced Query Builder, Table Maintenance (Optimize/Repair), and Redis Manager.
    - **WordPress Suite**: One-click Staging environments, Plugin updates, AI-Optimization, and Integrity scanning.
- **Unified v3 Architecture**: Full migration to microservice pattern (WHM + Agent).
    - MySQL provisioning and maintenance API.
    - Real-time system metrics (CPU, RAM, Uptime) with `systeminformation`.
    - **SSL Service**: Support for Let's Encrypt (win-acme/certbot) and custom certificate uploads.
    - **Maintenance Mode**: One-click maintenance toggle with custom placeholder page.
    - **Streaming Installation Logs**: Real-time log feedback for One-Click App Installers (Laravel/WordPress) using `child_process.spawn`.
- **WHM (Control Plane)**:
    - **Multi-node Server Management** with heartbeat monitoring.
    - **Centralized Website/Database orchestration** across multiple Agent nodes.
    - **DNS Manager Migration**: Complete migration of domain zones and records to WHM, including **automated reset to defaults**, **Cloudflare Synchronization**, and **DNSSEC Support**.
    - **Billing Core (Stage 5)**: Implementation of Products, Orders, Invoices, and **Automated Provisioning** (Quota updates on payment).
    - **Usage-Based Billing (Stage 6)**:
        - **Metering Agents**: Real-time CPU, Bandwidth, and Storage tracking on Agent nodes.
        - **Usage-to-Invoice**: Automated engine for generating invoices based on consumption metrics (CPU Load, RAM-hour, GB-storage, and Bandwidth).
        - **Usage Rates API**: Dynamic management of pricing for metered resources.
    - **Server Node Control**: Remote service restarts (Nginx, PHP, MySQL) and system log viewing via Agent API.
    - **Analytics Dashboard**: Enhanced with historical node usage charts, storage stats, top downloads, and active user tracking across nodes.
    - **Git Integration**: Full CI/CD pipeline integrated with SSH keys, manual deploys, real-time logs, and webhooks.
    - **Task Orchestration**: Centralized background job monitoring and log streaming.
- **Tooling & Infrastructure**:
    - Centralized migration system (`init_v3.js`).
    - Robust Auth middleware shared between WHM and Panel with **SFTP storage session persistence**.
    - Token-based (Agent Secret) internal API security between nodes.
    - **Dockerized Stack**: Optimized Dockerfiles and `docker-compose.yml` for WHM, Agent, and Panel services.
    - **Systemd Integration**: Native Linux service unit files for automated daemon management.
    - **Unified Deployment Script**: Robust `deploy_v3.sh` for one-click installation on Ubuntu/Debian.
    - **Billing & Products UI**: New frontend modules for invoice management and product catalogs.
    - **Payment Gateway Integration (Stage 5.5)**:
        - **Stripe Integration**: Full credit/debit card payment support with Payment Intents and Checkout Sessions.
        - **PayPal Integration**: PayPal account payments using REST API v2 with order creation and capture.
        - **Manual Payment Support**: Bank transfer and custom payment method configuration.
        - **Transaction Management**: Complete transaction history, status tracking, and payment statistics.
        - **Webhook Handling**: Automated payment verification and feature provisioning via webhooks.
        - **Refund System**: Admin-controlled refund processing for all payment gateways.
        - **Multi-Currency Support**: USD, EUR, GBP, IDR, SGD, MYR currency support.
        - **Sandbox Mode**: Test mode for development and testing with sandbox credentials.
        - **Payment Gateway Settings UI**: Admin interface for configuring gateway credentials and settings.
        - **Payment Checkout UI**: User-facing payment interface with gateway selection and invoice summary.
    - **Live DNS Server Clusters (Stage 6.5)**:
        - **PowerDNS Service**: Agent-side PowerDNS integration with MySQL backend and automatic schema creation.
        - **DNS Cluster Service**: WHM-side cluster orchestration for managing multiple DNS nodes.
        - **Automatic Zone Synchronization**: Zones automatically replicate to all cluster nodes on creation/update.
        - **DNSSEC Support**: Enable DNSSEC for zones with key generation and DS record management.
        - **Health Monitoring**: Real-time cluster health checks with node status and response time tracking.
        - **Cluster Management API**: Add/remove nodes, sync zones, monitor health, and manage cluster membership.
        - **PowerDNS Control**: Full daemon management including status, statistics, and zone notifications.
        - **Multi-Node Support**: Distribute DNS across multiple servers for high availability and load balancing.
        - **Agent DNS Routes**: PowerDNS management endpoints on agent nodes for zone sync and DNSSEC.
        - **WHM DNS Orchestration**: Centralized DNS management with automatic cluster-wide operations.
    - **Developer SDK (Stage 7.0)**:
        - **YumnaPlugin Base Class**: Core plugin framework with lifecycle management and hook system.
        - **Hook System**: 30+ hooks for extending user, website, database, DNS, payment, billing, and system operations.
        - **Route Registration**: Register custom API routes within plugins with authentication support.
        - **Settings Management**: Built-in settings system for plugin configuration and persistence.
        - **Event System**: Plugin-to-plugin communication via event emission.
        - **Plugin CLI**: Command-line tools for creating, validating, building, installing, and listing plugins.
        - **Plugin Utilities**: Validation, version comparison, compatibility checking, and manifest validation.
        - **API Helpers**: Standardized response creation, request validation, and error handling.
        - **Plugin Logger**: Context-aware logging with multiple log levels (info, warn, error, debug).
        - **Example Plugins**: Slack notifications, custom analytics, and backup notifications examples.
        - **Comprehensive Documentation**: Full SDK documentation with API reference, examples, and best practices.
    - **Installation Documentation**: Detailed setup and configuration guides (`INSTALL.md`, `PAYMENT_GATEWAY.md`, `DNS_CLUSTERS.md`, SDK `README.md`).

---

## [2.2.4] - 2026-01-11
### Added
- **Docker Container Management**: 
    - Full Docker integration with `dockerode` for managing containers, images, networks, and volumes.
    - Container operations: List, Create, Start, Stop, Restart, Remove with real-time status updates.
    - Auto-pull Docker images if not available locally during container creation.
    - Live container logs viewer with 200-line tail support.
    - Port mapping and environment variable configuration in creation modal.
    - Docker daemon status monitoring with graceful offline handling.
    - Modern UI with glassmorphism effects, animated status badges, and "blade" style cards.
    - Admin-only access with `requireAdmin` middleware protection.

### Fixed
- **Docker Error Handling**: Improved error handling to return empty arrays instead of 500 errors when Docker daemon is unavailable.
- **UI/UX**: Added informative "Engine Offline" message with retry button when Docker is not running.

## [2.2.3] - 2026-01-10
### Added
- **Multi-Engine Web Stack**: Switchable arsitektur untuk Nginx Only, Apache Only, atau Hybrid Stack (Nginx Proxy + Apache Backend).
- **Standalone Core Architecture**: Migrasi penuh dari Laragon ke sistem mandiri. Seluruh konfigurasi dan engine (Nginx, Apache, PHP) kini berada di `C:\YumnaPanel\bin` dan `C:\YumnaPanel\etc`.
- **Documentation Refactoring**: Memindahkan seluruh panduan implementasi dan roadmap ke dalam direktori `docs/` untuk pengorganisasian yang lebih baik.

### Changed
- **Aligned Versioning**: Penyelarasan versi internal dan publik menjadi v2.2.3 di seluruh komponen (Client & Server).
- **Default Index Template**: Memperbarui template `index.html` otomatis untuk website baru ke versi v2.2.3.

## [2.2.2] - 2026-01-10
### Added
- **Git Integration**: New "Git & Deploy" module for linking repositories (GitHub, GitLab, Bitbucket) and manual/webhook auto-deployment.
- **Auto-Deployment Webhooks**: Public endpoint for automated repository updates on push events.

### Fixed
- **FTP Architecture**: Resolved critical "Table not found" and missing column (updatedAt, description) errors in the FTP Account management system.
- **Process Management**: Fixed `EADDRINUSE` port 5000 conflicts during server restarts by implementing aggressive zombie process cleanup.

## [2.2.1] - 2026-01-10
### Fixed
- **PWA Stability**: Resolved persistent Service Worker "Failed to fetch" errors by switching to a robust network-only strategy.
- **Avatar System**: Fixed backend path handling for profile picture uploads, ensuring avatars are saved and retrieved correctly.
- **UI/UX Polish**: Updated sidebar logo size to 96px for better branding, reordered admin menu items, and removed gradient artifacts from profile pictures.
- **Admin Robustness**: Hardened role verification logic in Sidebar to prevent potential rendering crashes.

## [2.2.0] - 2026-01-09
### Added
- **DNS Enhancements**: Added DNSSEC key generation and Cloudflare synchronization.
- **FTP Manager**: Complete FTP account management system with quota enforcement.
- **Database Security**: Added `ftp_accounts` table and DNS security architecture.
- **Security Core**: Implemented Bcrypt password hashing for FTP accounts and rigorous ownership checking.

## [2.1.0] - 2026-01-09
### Added
- **Native Desktop GUI**: 
    - Converted the control center into a professional C# executable (`YumnaControlCenter.exe`).
    - Implemented a "Single Instance" logic to prevent multiple dashboard windows.
    - Integrated "Minimize to Tray" functionality to keep the panel accessible but out of the way.
- **Service Tray Orchestrator**:
    - Added a right-click context menu to the system tray for "Start All Services" and "Stop All Services".
    - Implemented Windows native toast notifications for service status updates.
- **Comprehensive Hosting Suite**:
    - Integrated professional-grade modules for **User & Tenant Management** (Quota, Shell, Suspend).
    - Added **Email Server Management** (DKIM, SPF, Anti-spam, Roundcube).
    - Expanded **DNS Management** (DNSSEC, SOA, TTL, Clustering).
    - Advanced **Backup & Restore** (Restic integration for incremental backups).
    - **System Maintenance Hub** (Repair, Rebuild, Sync Templates, Cluster Flush).
- **Unified Security Dashboard**:
    - Added real-time interactivity for **Windows Firewall** and **ClamAV Enterprise**.
- **Branding Excellence**:
    - Replaced sidebar text with official logo image (160px).
    - Implemented native window icon (ICO) for taskbar and system tray.

### Fixed
- **Window Management**: Disabled "Restore Down" and resizing borders to maintain pixel-perfect dashboard layout.
- **Process Cleanup**: Implementation of automatic backend termination when the launcher is exited from the tray.

## [1.8.0] - 2026-01-07
### Added
- **Monaco Editor Integration**: Replaced the basic text preview with a full-featured VS Code-based Monaco Editor.
- **Direct File Editing**: Added "Edit Content" action button to instantly open files in editing mode.
- **SFTP Saving Core**: Implemented secure, atomic file saving directly back to SFTP/Local storage.
- **Expanded File Support**: Added syntax highlighting and preview support for 40+ extensions including `.sh`, `.env`, `.yaml`, `.yml`, `Dockerfile`, and `Makefile`.
- **Enhanced Preview State**: Refactored the preview architecture to be highly robust and context-aware, fixing modal "no response" issues.

## [1.7.0] - 2026-01-07
### Added
- **Software Center**: Added modular Plugin Manager for phpMyAdmin, Docker, and Composer.
- **Advanced PHP Manager**: Install multiple versions, toggle extensions, and edit `php.ini` directly from UI.
- **Cross-Platform Core**: Unified path handling for seamless deployment on Windows and Linux.
- **phpMyAdmin Integration**: One-click install with auto-configured PHP extensions and Nginx proxy.

## [1.6.0] - 2026-01-06
### Added
- **Windows SSL Integration**: Support for automatic SSL certificate issuance on Windows using **Win-ACME**.
- **Automated Root Creation**:
    - Backend now automatically creates the physical `rootPath` folder if it doesn't exist.
    - Automatic `index.html` generation for new sites to prevent 403/404 errors.
- **Improved Hosting UX**:
    - "Open Website" action buttons added to the website management list.
    - Post-creation success modal with detailed local/remote access instructions.
    - Smart placeholder logic: auto-fills Document Root based on the detected OS (Windows: `C:/YumnaPanel/www`, Linux: `/var/www`).
- **Database Pro Suite**: Added support for cloning existing databases and managing user privileges.

### Fixed
- **Duplicate Entry Handling**: Improved backend error handling for domain creation (returns 409 Conflict instead of 500 Error for existing domains).
- **Service Stability**: Improved auto-start logic for PHP CGI processes on Windows.

---

## [1.5.4] - 2026-01-05
### Added
- **Hosting Panel Suite**: Complete website management system including VHost creation, PHP version selection, and Domain mapping.
- **DNS Automation Engine**:
    - Automatic DNS Zone creation for new websites.
    - Auto-injection of default records (A, CNAME, MX, NS) upon site creation.
    - Automatic 'A' record generation for new subdomains.
- **Refactored Explorer Architecture**: Split `Explorer.tsx` into modular components (`ExplorerFileList`, `ExplorerBreadcrumbs`) for improved maintainability and performance.

### Changed
- **UX Transparency**: Added "Panel Automation Active" indicators in creation modals to inform users of background infrastructure tasks.

---

## [1.5.3] - 2026-01-05
### Added
- **Service Manager Integration**: Real-time system monitoring and control for core services (Nginx, Apache, MySQL, PHP).
- **Deep Firewall Navigation**: Support for direct tab navigation into Malware Guard, Compliance Center, and Threat Intel from the Sidebar.

---

## [1.5.0] - 2026-01-01
### Added
- **Hybrid Malware Scanner**: Dual-layer protection using internal signatures and ClamAV Enterprise Engine.
- **Tree View Selection**: Interactive scan picker.

---

## [1.0.0] - 2025-10-01
### Added
- **Initial Release**: Core SFTP functionality, File Upload/Download, Basic Sharing.

---

**Current Version**: 3.1.0
**Last Updated**: 2026-01-12
