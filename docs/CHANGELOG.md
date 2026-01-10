# 📜 Versions History & Changelog

All notable changes to the **Yumna Panel** project will be documented in this file.

---

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

**Current Version**: 2.2.2
**Last Updated**: 2026-01-10
