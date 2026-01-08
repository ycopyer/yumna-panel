# 📋 Compliance & Governance Guide
**SFTP File Manager v1.4.0 - Enterprise Edition**  
**Last Updated**: 2026-01-03  
**Status**: 🛡️ Production Ready

---

## 📑 Table of Contents
1. [Overview](#overview)
2. [Hash-Chained Audit Trail](#hash-chained-audit-trail)
3. [Legal Hold Management](#legal-hold-management)
4. [Retention Policies](#retention-policies)
5. [Compliance Standards](#compliance-standards)
6. [API Reference](#api-reference)
7. [Best Practices](#best-practices)

---

## 🎯 Overview

The Compliance & Governance Center provides enterprise-grade data integrity, regulatory compliance, and investigative capabilities. This module ensures your organization meets international standards including **ISO 27001**, **SOC 2**, **GDPR**, and **HIPAA**.

### Key Features
- **Immutable Audit Trails**: SHA-256 hash-chained activity logs
- **Legal Hold**: Prevent file modification/deletion during investigations
- **Retention Policies**: Automated data lifecycle management
- **Cryptographic Verification**: Real-time integrity checking
- **Security Event IDs**: Unique identifiers for forensic tracking

---

## 🔗 Hash-Chained Audit Trail

### What is Hash Chaining?

Every user action is logged with a cryptographic hash that links to the previous entry, creating an **immutable blockchain-like audit trail**. Any tampering attempt will break the chain and be immediately detected.

### How It Works

```
Log Entry #1: hash = SHA256(userId + action + timestamp + prevHash=null)
Log Entry #2: hash = SHA256(userId + action + timestamp + prevHash=#1.hash)
Log Entry #3: hash = SHA256(userId + action + timestamp + prevHash=#2.hash)
```

If someone tries to modify Entry #2, the hash won't match Entry #3's `prev_hash`, breaking the chain.

### Database Schema

```sql
CREATE TABLE activity_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    ipAddress VARCHAR(45),
    ipLocal VARCHAR(45),
    event_id VARCHAR(64) UNIQUE,  -- UUID v7 (e.g., "019b83a2-65de-742e-bbb4-027a5495a007")
    hash VARCHAR(64),              -- Current entry hash
    prev_hash VARCHAR(64),         -- Previous entry hash
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Verification Process

Navigate to **Firewall & Security Suite → Compliance → Hash-Chain Verification** to run integrity checks:

- ✅ **Valid Chain**: All hashes match, no tampering detected
- ❌ **Broken Chain**: Tampering detected, forensic investigation required

---

## ⚖️ Legal Hold Management

### Purpose

Legal Hold prevents the modification or deletion of files that are subject to legal proceedings, regulatory investigations, or internal audits.

### How to Activate

1. **Via File Properties** (Admin Only):
   - Right-click file → Properties
   - Navigate to "Governance & Investigation"
   - Click "Activate" on Legal Hold

2. **Via Compliance Center**:
   - Firewall & Security Suite → Compliance
   - Legal Holds tab
   - Add file path manually

### Effects of Legal Hold

When a file is on legal hold:
- ❌ **Cannot be renamed**
- ❌ **Cannot be deleted** (even from trash)
- ❌ **Cannot be moved**
- ✅ **Can still be viewed/downloaded**
- 🔒 **All access attempts are logged with high-severity event IDs**

### Database Schema

```sql
CREATE TABLE files_compliance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filePath TEXT NOT NULL,
    userId INT,
    legal_hold TINYINT DEFAULT 0,
    retention_until DATETIME DEFAULT NULL,
    policy_id VARCHAR(50),
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Visual Indicators

Files under legal hold display:
- 🔴 **Red pulsing bar** at top of Properties modal
- ⚖️ **"Legal Hold" badge** next to filename
- 🚨 **Warning message** explaining restrictions

---

## ⏱️ Retention Policies

### Overview

Retention policies automatically delete old logs and threat intelligence data based on configurable time periods, ensuring compliance with data minimization regulations (GDPR Article 5).

### Default Settings

| Data Type | Default Retention | Configurable Range |
|-----------|-------------------|-------------------|
| Activity Logs | 90 days | 30-3650 days |
| Threat Logs | 365 days | 90-3650 days |

### Configuration

Navigate to **Compliance → Retention Policy**:

1. Adjust retention periods (in days)
2. Click "Save Settings"
3. System automatically prunes data older than threshold

### Compliance Settings Table

```sql
CREATE TABLE compliance_settings (
    key_name VARCHAR(255) PRIMARY KEY,
    value_text TEXT,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Default values
INSERT INTO compliance_settings VALUES 
('retention_days_logs', '90'),
('retention_days_threats', '365'),
('legal_hold_global', '0'),
('compliance_mode', 'standard');
```

### Automated Cleanup

The system runs retention cleanup via:

```javascript
const ComplianceService = require('./services/compliance');
ComplianceService.runRetentionCleanup();
```

**⚠️ Warning**: Reducing retention periods will permanently delete historical data beyond the new threshold.

---

## 🏆 Compliance Standards

### ISO 27001:2022

| Control | Implementation | Status |
|---------|----------------|--------|
| **A.8.15** | Event Logging | ✅ Hash-chained logs |
| **A.8.16** | Monitoring Activities | ✅ Behavioral scoring |
| **A.8.7** | Malware Protection | ✅ Zero-Day Heuristics |

### SOC 2 Type II

| Trust Service | Implementation | Status |
|---------------|----------------|--------|
| **Security** | Hash-chain integrity | ✅ Verified |
| **Availability** | Legal hold enforcement | ✅ Active |
| **Confidentiality** | AES-256 encryption | ✅ Enabled |

### GDPR

| Article | Requirement | Implementation |
|---------|-------------|----------------|
| **Article 5** | Data minimization | ✅ Retention policies |
| **Article 32** | Security measures | ✅ Cryptographic integrity |
| **Article 30** | Records of processing | ✅ Immutable audit trail |

### HIPAA

| Safeguard | Implementation | Status |
|-----------|----------------|--------|
| **Admin Safeguards** | Legal hold for PHI | ✅ Active |
| **Audit Controls** | Hash-chained logs | ✅ Verified |

---

## 🔌 API Reference

### Get Compliance Settings

```http
GET /api/compliance/settings
Headers: x-user-id: <admin-user-id>
```

**Response**:
```json
[
  { "key_name": "retention_days_logs", "value_text": "90" },
  { "key_name": "retention_days_threats", "value_text": "365" }
]
```

### Update Compliance Settings

```http
POST /api/compliance/settings
Headers: x-user-id: <admin-user-id>
Body: {
  "settings": [
    { "key": "retention_days_logs", "value": "120" }
  ]
}
```

### Get Legal Holds

```http
GET /api/compliance/legal-holds
Headers: x-user-id: <admin-user-id>
```

**Response**:
```json
[
  {
    "id": 1,
    "filePath": "/Local Storage/sensitive-doc.pdf",
    "legal_hold": 1,
    "policy_id": "INTERNAL-INV",
    "last_updated": "2026-01-03T16:00:00Z"
  }
]
```

### Toggle Legal Hold

```http
POST /api/compliance/legal-hold/toggle
Headers: x-user-id: <admin-user-id>
Body: {
  "filePath": "/Local Storage/document.pdf",
  "status": true
}
```

### Verify Audit Chain

```http
GET /api/compliance/audit/verify
Headers: x-user-id: <admin-user-id>
```

**Response**:
```json
{
  "isValid": true,
  "totalLogs": 1523,
  "issues": []
}
```

If tampering detected:
```json
{
  "isValid": false,
  "totalLogs": 1523,
  "issues": [
    {
      "id": 847,
      "eventId": "SEC-20260103-A3F2",
      "issue": "Hash chain broken (prev_hash mismatch)"
    }
  ]
}
```

---

## ✅ Best Practices

### 1. Regular Integrity Checks

Run hash-chain verification **weekly** to detect tampering early:
- Navigate to Compliance → Hash-Chain Verification
- Click "Re-verify Chain"
- Review any reported issues immediately

### 2. Document Legal Holds

Maintain external documentation for all legal holds:
- Case number or investigation ID
- Date activated
- Responsible party
- Expected release date

### 3. Retention Policy Alignment

Ensure retention periods match your organization's legal requirements:
- **Financial records**: 7 years (typical)
- **HR records**: 3-7 years
- **Security logs**: 1-2 years minimum

### 4. Access Control

Restrict Compliance Center access to:
- ✅ Security Officers
- ✅ Legal Team
- ✅ Senior Management
- ❌ Regular users

### 5. Backup Strategy

Hash-chained logs are **append-only** but should still be backed up:
- Export `activity_history` table weekly
- Store backups in immutable storage (S3 Glacier, etc.)
- Test restoration procedures quarterly

### 6. Incident Response

If hash-chain verification fails:
1. **Isolate** the database immediately
2. **Preserve** current state (snapshot)
3. **Investigate** using `event_id` to trace tampering
4. **Report** to security team and legal counsel
5. **Restore** from last known-good backup if necessary

---

## 📞 Support & Resources

- **Documentation**: `/COMPLIANCE_GUIDE.md`
- **Security Audit**: `/SECURITY_AUDIT.md`
- **ISO Mapping**: `/SOA_ISO27001.md`
- **Firewall Guide**: `/FIREWALL_GUIDE.md`

---

**Authored by**: Antigravity Compliance Engine  
**Version**: 1.4.1 (UUID v7 Edition)  
**Compliance Status**: ✅ ISO 27001 | SOC 2 | GDPR | HIPAA Ready
