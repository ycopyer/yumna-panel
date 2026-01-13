# 🗺️ YumnaPanel Development Roadmap

## Vision
Transform YumnaPanel into a world-class, open-source hosting control panel that rivals cPanel, Plesk, and DirectAdmin with modern technology, beautiful UI, and powerful features.

---

## 📌 Status Dashboard

**Current Status (January 2026)**:
- ✅ **Production-Ready Release (v3.1.0)**: 100% COMPLETE! 🎊
- ✅ **Payment Gateway Integrations**: Stripe & PayPal fully integrated
- ✅ **Live DNS Server Clusters**: PowerDNS integration with multi-node clustering
- ✅ **Developer SDK**: Plugin development framework and CLI tools
- ✅ **High Availability (HA)**: WHM clustering, database replication, load balancing
- ✅ **CDN Integration**: Cloudflare & BunnyCDN fully integrated
- ✅ **Database Tools**: Query builder, Redis manager, optimization tools
- ✅ **WordPress Tools**: Staging, AI optimization, security scanning

**🎊 ROADMAP 100% COMPLETE! 🎊**

**Recently Completed**:
- ✅ Cloud Virtualization & VPS Management (KVM/Proxmox)
- ✅ AI-Ops & Gemini-powered Support Assistant
- ✅ Plugin Hook Infrastructure & Theme System (v3.5)
- ✅ Granular RBAC (Role Based Access Control) & Permissions
- ✅ SLA Monitoring & Uptime Reliability Service
- ✅ Commercial Licensing & Support Engine
- ✅ FraudGuard Service & IP Reputation Monitoring
- ✅ Indonesia Tax Compliance (PPN 11%, NPWP)
- ✅ Reseller Hierarchy & Sub-user Management (v3.1)

---

## 🗺️ Yumna v3 Unified Roadmap (Panel + WHM + Billing)

This roadmap outlines the transformation of Yumna Panel into an enterprise-grade ecosystem consisting of three core pillars: **Client Panel**, **WHM (Control Plane)**, and **Billing System**.

### STAGE 0 — VISION & SCOPE (Week 0)
**Goal**: Define clear boundaries to prevent overlap.
- **Yumna Panel**: Client/User Area (Frontend focus).
- **Yumna WHM**: Admin & Server Control (Backend/Agent focus).
- **Yumna Billing**: Order, Invoice, Payment, Usage (Business logic).

### STAGE 1 — CORE PLATFORM (Month 1)
**Focus**: Structural Refactoring & API Boundaries.
- [x] **Folder Structure Reorganization**:
  - `yumna/panel` (Client Area)
  - `yumna/whm` (Control Plane)
  - `yumna/agent` (Server Executor)
  - [x] **Core Services Migration**:
    - Auth & Session Management (WHM)
    - Node Communication (Agent Heartbeat)
    - Docker Service Isolation
- [x] Stage 2: Website & Database Management (Agent Sync)
  - [x] Website CRUD & VHost Automation
  - [x] One-Click App Installers (WordPress, Laravel) with Real-time Logs
  - [x] Database CRUD & Stats
  - [x] Domain Binding & Aliases
  - [x] Web Server Config/Logs Management
- [x] Stage 3: File Manager & Security Migration
  - [x] Agent-side File API (ls, stat, read, write, etc.)
  - [x] WHM File Proxying
  - [x] Firewall Rules Sync & Stats
  - [x] Analytics & Server Pulse (Real-time Metrics)
- [x] Stage 4: WHM Dashboard & SSL Management
  - [x] Agent-side SSL Service (win-acme/certbot)
  - [x] WHM SSL Orchestration & Records
  - [x] Maintenance Mode Logic
  - [x] DNS Manager Migration to v3
  - [x] WHM User/Session Management
  - [x] System Service Controls (Restart, Logs)
- [x] **Initial API Decoupling**:
  - Auth: `/api/auth/{login,logout}` (WHM Managed)
  - WHM: `/api/whm/{servers,provision}` (Core API Active)
  - Panel: `/api/panel/{services,usage}` (UI Consumer Ready)
- [x] **Separation of Concerns**: WHM becomes the single source of truth for provisioning.

### STAGE 2 — MULTI-SERVER & SECURITY (Month 2)
**Focus**: Orchestration & Hardening.
- [x] **WHM Orchestration**: Multi-node server management (API Implemented).
- [x] **Secure Agent**: Token-based authentication between WHM and Agent.
- [x] **Domain Binding**: Enhanced logic in Panel.
  - Agent Side: Implemented `WebServerService` (Nginx/Apache).
  - API: `/web/vhost` endpoints active.
- [x] **SSL Management**: Let's Encrypt & Custom SSL (v3 Integrated).
- [x] **DNS Management**: Full migration to v3 Control Plane.
- [x] **Audit Logs**: Centralized logging in WHM (`activity_history`).
- [x] **Security Hardening**: Firewall sync and real-time threat monitoring.
- [x] **File Management**: Centralized File API for node management.
- [x] **Analytics**: Multi-node server pulse and activity tracking.

### STAGE 3 — COMMUNITY EDITION RELEASE (Month 3)
**Goal**: Yumna Community v3.1 (Panel + WHM).
- [x] **UI Implementation**:
  - [x] Panel: Dashboard, Service List (Websites), Billing History.
  - [x] WHM: Server Nodes, Website Control, Databases, DNS, SSL.
- [x] **Infrastructure**: Docker/Systemd setup, Reverse Proxy configuration.
- [x] **Release**: GitHub Repo, Open Source License, Documentation (v3.1.0-alpha Ready).

### STAGE 4 — DEMO & DOCS (Month 4)
- [x] Public Demo Environment (Mocks Integrated).
- [x] Comprehensive Installation Guides (INSTALL.md).

### STAGE 5 — BILLING CORE INTEGRATION (Month 5)
**Focus**: Connecting the Business Logic.
- [x] **Billing Schema**: Products, Orders, Invoices (Implemented in WHM).
- [x] **Core API**: Product management & Invoice listing.
- [x] **Provisioning Flow**: Paid Invoice -> Automated Quota Update.
- [x] **Gateway Abstraction**: Standardized Payment Interface.
- [x] **Error Handling**: Transaction rollback logic.

### STAGE 6 — USAGE-BASED BILLING (Month 6)
**Focus**: Metering & Monetization.
- [x] **Database Schema Finalization**: Migration init_v3.js.
- [x] **Metering Agents**: Real-time Node usage tracking.
- [x] **Usage-to-Invoice**: Automated billing engine.
- [x] **Analytics UI**: Historical usage charts for Metered Resource tracking.

### STAGE 7 — RESELLER & SUB-BILLING (Month 7)
- [x] Reseller Role implementation (Admin/Reseller hierarchy).
- [x] Pricing Markup & Sub-client management (Creator-based products).

### STAGE 8 — TAX & COMPLIANCE (Month 8)
- [x] Indonesia Tax Compliance (PPN 11%, NPWP field).
- [x] Region-compliant Invoicing (Subtotal/Tax breakdown).

### STAGE 9-12 — ENTERPRISE & SCALING (Month 9-12)
- [x] Fraud Detection & Abuse Control (FraudGuard Service, IP Blacklisting, Admin Monitor).
- [x] Enterprise Hardening (SLA Monitoring, Granular Permissions/ACL).
- [x] High Availability (HA) setup for WHM & Billing.
- [x] Commercial Support & Licensing System (Enterprise Key verification).

### STAGE 13 — MARKETPLACE & ECOSYSTEM (Year 2+)
**Goal**: Community-driven growth.
- [x] **Plugin Infrastructure**: Hook system (emit/register) for developers.
- [x] **Yumna Store**: Marketplace foundation for Themes and Apps.
- [x] **Developer SDK**: Documentation and CLI for modular development.

### STAGE 14 — AI-OPS & AUTO-PILOT
**Goal**: Self-healing and AI-assisted management.
- [x] **AI Support Bot**: Gemini-v1.5 Integrated documentation and chat.
- [x] **Heuristic Scaling**: Prediction model for resource allocation.
- [x] **Threat Prediction**: AI-driven firewall (FraudGuard AI).
- [x] **Smart Code Review**: Automated security scanning for Git deployments.

### STAGE 15 — CLOUD VIRTUALIZATION
**Goal**: Becoming a full Cloud Provider platform.
- [x] **KVM/Proxmox Integration**: Full VPS & Container lifecycle management.
- [x] **Software Defined Networking (SDN)**: Private VPC and VLAN foundation.
- [x] **Object Storage S3 Interface**: Integration readiness for distributed storage.

---

## 🔍 Legacy Feature Roadmap (v2.x)

These features are being maintained/completed while the v3 architecture is built.

### Phase 2.4: Git Integration 🔧
**Status**: Completed (v3 Integrated)
- [x] Git repository manager
- [x] Auto-deployment webhooks
- [x] Deployment history & logs

### Phase 3: Nice to Have
- [x] CDN Integration (Cloudflare, BunnyCDN)
- [x] Database Tools (Query Builder, Redis Manager)
- [x] WordPress Staging & AI Tools

---

**Last Updated**: January 13, 2026 (v3.1.0 Production Ready)
**Version**: 3.1.0
**Target Arch**: v3.1 Unified

## 🚀 Future Roadmap (v3.2)

### Phase 3.2: Yumna Tunnel (Reverse Connection)
**Goal**: Manage Agents behind NAT/Firewall without Public IP.
- [x] **Architecture Design**: WebSocket Reverse Tunnel design.
- [x] **Master Tunnel Server**: WebSocket Server implementation in WHM.
- [x] **Agent Tunnel Client**: Auto-connect mechanism in Agent service.
- [x] **Security**: TLS 1.3 & Token-based Authentication for tunnels.
- [x] **Command Routing**: Routing heartbeat and exec commands via WSS.
