# 🗺️ Version Roadmap & Strategic Vision

## 🔹 v1.6.0 – Hosting Foundation (Current)
**Target**: Shared hosting & VPS users
**Status**: ✅ COMPLETED (Production Ready)

### 🌐 Hosting & Web
*   ✅ **Website Management**: Live Config Editor (Nginx/Apache).
*   ✅ **SSL Automation**: Integrated **Win-ACME (Windows)** & Certbot (Linux).
*   ✅ **Smart Wizard**: Auto-create Document Root & default `index.html`.
*   ✅ **OS-Aware Pathing**: Intelligent default paths based on detected OS.
*   ✅ **One-Click App Installer**: Auto-deploy WordPress.
*   ✅ **PHP Engine Control**: Per-site selection with service auto-start.
*   ✅ **Site Logs**: Real-time access & error logs viewer.
*   ✅ **Access Instructions**: Instant guidance for local/remote site access.

### 💾 Backup & Restore
*   **Website Backup**: Scheduled full site backup (files + config).
*   **Database Backup**: Automated MySQL dumps.
*   **Schedule**: flexible cron-based backup policies (Daily/Weekly).
*   **Restore**: One-click restore with integrity verification.

### ⏱️ Cron Manager
*   GUI cron job editor.
*   Real-time log output viewer.
*   Enable/Disable toggle for jobs.
*   Preset templates (Laravel Scheduler, WordPress Cron).

### 📦 Resource Control
*   Disk quota management.
*   Inode usage limits/alerts.
*   Bandwidth tracking.
*   Threshold notifications.

---

## 🔹 v1.7.x – Security & DevOps Upgrade
**Target**: Developers & security-aware admins

### 🛡️ Web Security
*   **WAF Integration**: ModSecurity + OWASP CRS ruleset management.
*   **HTTP Security Headers**: GUI for CSP, HSTS, X-Frame-Options.
*   **Rate Limiting**: Granular request limits per Virtual Host.

### 🔁 Deployment & Staging
*   **Git Integration**: Connect GitHub/GitLab repositories.
*   **Auto-Deploy**: Webhooks support for push-to-deploy.
*   **Staging Environment**: One-click clone to staging subdomain.
*   **Rollback**: Instant revert to previous build.

### 🔎 Log Intelligence
*   **Access Log Analysis**: Anomaly detection logic.
*   **Brute-force Heatmap**: Visualizing attack sources.
*   **Request Fingerprinting**: Identify unique attack signatures.
*   **Process Killer**: Auto-kill suspicious high-CPU processes.

---

## 🔹 v1.8.x – Professional Hosting Stack
**Target**: Business & agency hosting

### 📨 Email Hosting (Basic)
*   Mailbox creation (virtual users).
*   Forwarders & Catch-all support.
*   Integrated Webmail (Roundcube/Snappy).
*   SMTP health tester.

### 📊 Monitoring & Alerts
*   Website Uptime Monitoring (Internal ping).
*   Response time analytics.
*   SSL/TLS expiry warnings.
*   Resource Spike Detection (CPU/RAM).
*   Alerts via Telegram & Email.

### 🌍 DNS & Network
*   **DNSSEC Manager**: Easy signing for domains.
*   **Anycast Design**: Prep for multi-node DNS.
*   **HTTP/3 & QUIC**: Toggle support in Nginx/Apache.

---

## 🔹 v2.0 – Enterprise & Cyber Defense Edition
**Target**: SOC, enterprise, regulated environments

### 🧠 AI Threat Engine
*   **Polymorphic WebShell Detection**: Identifying mutated shells.
*   **Living-off-the-land**: Detecting misuse of standard binaries.
*   **Auto-Quarantine**: Isolate compromised sites automatically.
*   **Explainable AI**: Human-readable threat analysis reports.

### 🧾 Compliance & Audit Mode
*   **Immutable Logs (WORM)**: Write-Once-Read-Many logging for audit trails.
*   **Legal Hold**: Freeze data states for investigation.
*   **Compliance Export**: One-click ISO 27001 / SOC 2 report generation.
*   **Correlation Engine**: Linking filesystem events with network logs.

### 🌐 Multi-Server Cluster
*   **Master/Worker Architecture**: Centralized control panel.
*   **Centralized Intelligence**: Shared threat database across nodes.
*   **Migration**: Seamless site movement between worker nodes.
*   **HA Ready**: High Availability configuration support.

---

## 🔹 v2.1+ – Cloud Native & Automation

### 🐳 Container Support
*   **Docker Integration**: Run apps in isolated containers.
*   **Docker Compose UI**: Visual stack management.
*   **Resource Limits**: CPU/RAM capping per container.

### 🧠 Policy Engine
*   **IFTTT for Checkops**: "If CPU > 90%, restart Nginx".
*   **Auto-Mitigation**: Pre-defined workflows for attack scenarios.

### 🎨 Platform Enhancements
*   **White-label**: Custom branding for hosting providers.
*   **Marketplace**: Plugin system for community extensions.
*   **SDK**: Developer tooling for custom integration.

---

## 📌 Long-Term Goals
1.  **Replace Legacy Panels**: Offer a secure, modern alternative to cPanel/DirectAdmin.
2.  **VPS Standard**: Become the default secure panel for VPS & private cloud deployments.
3.  **Security Engine**: Build the strongest open-source hosting security engine.

## 🤝 Community & Open Source
*   **License**: MIT License.
*   **Architecture**: Plugin-first design.
*   **Transparency**: Public security roadmap.
*   **Voting**: Community-driven feature prioritization.

> **Yumna Panel – Hosting Freedom. Security Intelligence. Open Source.**
