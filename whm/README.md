# Yumna WHM (Web Host Manager)

This directory contains the Control Plane (Backend) for administrators to manage the infrastructure.

## Responsibilities
- Server Orchestration
- Provisioning Logic (API)
- User & Account Management
- Billing Integration Hooks
- Audit Logging
- Single Source of Truth for System State

## Key Features
- **Multi-Server Orchestration**: Manage unlimited remote servers via SSH or Tunnel.
- **Yumna Tunnel**: Reverse connection support for servers behind NAT/Firewall.
- **Centralized Management**: DNS, SSL, Database, and Web Server configuration from a single pane.
- **High Availability**: Load balancing and database replication support.
- **Security**: FraudGuard, IP Blacklisting, and Role-Based Access Control.

## Tech Stack
- **Runtime**: Node.js v20+
- **Framework**: Express.js
- **Database**: MySQL / MariaDB (via mysql2)
- **Communication**: SSH (Direct) & WebSocket (Tunnel)
- **Security**: Argon2 Hashing, JWT Auth
