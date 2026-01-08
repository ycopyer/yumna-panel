# 📜 Versions History & Changelog

All notable changes to the **Yumna Panel** project will be documented in this file.

---

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

**Current Version**: 1.8.0
**Last Updated**: 2026-01-07
