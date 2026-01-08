# 📊 Compliance Report & Audit Logs - Quick Reference

## 🎯 Generate Compliance Report

### Cara Menggunakan
1. Buka **Firewall & Security Suite** → **Compliance** tab
2. Pilih sub-tab **"Trust Status"**
3. Klik tombol **"Generate Compliance Report"**
4. File JSON akan otomatis terdownload

### Format Report
File: `compliance_report_YYYY-MM-DD.json`

```json
{
  "generated_at": "2026-01-03T17:45:00Z",
  "generated_by": 1,
  "version": "1.4.0",
  
  "executive_summary": {
    "hash_chain_integrity": "VERIFIED",
    "total_audit_logs": 5234,
    "chain_issues": 0,
    "active_legal_holds": 3,
    "recent_threats": 12,
    "overall_status": "SECURE"
  },
  
  "audit_trail": {
    "total_entries": 5234,
    "integrity_status": "Valid",
    "issues_found": 0,
    "oldest_entry": "2025-12-01T00:00:00Z",
    "newest_entry": "2026-01-03T17:45:00Z"
  },
  
  "legal_holds": {
    "active_count": 3,
    "status": "Active investigations ongoing"
  },
  
  "retention_policies": {
    "retention_days_logs": "90",
    "retention_days_threats": "365"
  },
  
  "security_metrics": {
    "recent_threats_30d": 12,
    "top_activities": [
      { "action": "login", "count": 450, "last_occurrence": "..." },
      { "action": "upload", "count": 320, "last_occurrence": "..." }
    ]
  },
  
  "user_statistics": {
    "admin": 2,
    "user": 15
  },
  
  "compliance_standards": [
    {
      "name": "ISO 27001:2022",
      "controls": ["A.8.7", "A.8.15", "A.8.16", "A.8.27"],
      "status": "Compliant"
    },
    {
      "name": "SOC 2 Type II",
      "controls": ["Security", "Availability", "Confidentiality"],
      "status": "Compliant"
    },
    {
      "name": "GDPR",
      "controls": ["Article 5", "Article 30", "Article 32"],
      "status": "Compliant"
    },
    {
      "name": "HIPAA",
      "controls": ["Admin Safeguards", "Audit Controls"],
      "status": "Compliant"
    }
  ],
  
  "recommendations": [
    "Continue regular integrity checks",
    "Maintain current retention policies",
    "Review legal holds quarterly"
  ]
}
```

### Kapan Menggunakan
- ✅ **Audit eksternal** (ISO, SOC 2, GDPR)
- ✅ **Management review** bulanan/kuartalan
- ✅ **Compliance documentation** untuk regulator
- ✅ **Incident investigation** sebagai baseline

---

## 🔍 View Raw Audit Logs

### Cara Menggunakan
1. Buka **Firewall & Security Suite** → **Compliance** tab
2. Pilih sub-tab **"Trust Status"**
3. Klik tombol **"View Raw Audit Logs"**
4. Modal akan muncul dengan data forensik lengkap

### Informasi yang Ditampilkan

Setiap log entry menampilkan:

| Field | Deskripsi | Contoh |
|-------|-----------|--------|
| **ID** | Sequential log number | #3400 |
| **Event ID** | Unique security event identifier | `LEG-20260103-13D78BDB` |
| **User** | Username yang melakukan aksi | `admin` atau `ID:5` |
| **Action** | Jenis aktivitas | `login`, `upload`, `delete` |
| **IP Address** | IP address sumber | `192.168.1.100` |
| **Timestamp** | Waktu kejadian | `03/01/2026, 17:45:30` |
| **Description** | Detail aktivitas | `Uploaded document.pdf to /SFTP/folder` |
| **Hash (SHA-256)** | Cryptographic hash entry ini | `a3f2b8c1d4e5f6a7...` |
| **Previous Hash** | Hash dari entry sebelumnya | `9x8y7z6w5v4u3t2s...` |

### Fitur Modal

#### Pagination
- **50 entries per page**
- Navigation: Previous / Next buttons
- Status: `Page 1 of 105 (5234 total entries)`

#### Forensic Details
Setiap entry menampilkan **full hash chain**:
```
Entry #3400
├─ Hash: a3f2b8c1d4e5f6a7b8c9d0e1f2a3b4c5...
└─ Prev Hash: 9x8y7z6w5v4u3t2s1r0q9p8o7n6m5l4k...
    └─ Links to Entry #3399
```

### Kapan Menggunakan
- 🔍 **Forensic investigation** setelah security incident
- 🔍 **Verify specific event** dengan Event ID
- 🔍 **Track user activity** untuk compliance audit
- 🔍 **Validate hash chain** secara manual
- 🔍 **Export evidence** untuk legal proceedings

---

## 🔐 API Endpoints

### Generate Report
```http
GET /api/compliance/report
Headers: x-user-id: <admin-user-id>
```

**Response**: JSON object dengan comprehensive compliance data

### View Audit Logs
```http
GET /api/compliance/audit/logs?page=1&limit=50
Headers: x-user-id: <admin-user-id>
```

**Response**:
```json
{
  "logs": [
    {
      "id": 3400,
      "userId": 1,
      "username": "admin",
      "action": "upload",
      "description": "Uploaded file.pdf",
      "ipAddress": "192.168.1.100",
      "ipLocal": "127.0.0.1",
      "event_id": "UPL-20260103-A3F2B8",
      "hash": "a3f2b8c1d4e5f6...",
      "prev_hash": "9x8y7z6w5v4u...",
      "createdAt": "2026-01-03T17:45:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 5234,
    "totalPages": 105
  }
}
```

---

## 📋 Best Practices

### Report Generation
1. **Frequency**: Generate monthly untuk management review
2. **Storage**: Archive reports untuk audit trail
3. **Comparison**: Compare dengan report sebelumnya untuk trend analysis
4. **Distribution**: Share dengan compliance team dan auditors

### Audit Log Review
1. **Regular Checks**: Review logs mingguan untuk anomaly detection
2. **Event ID Tracking**: Document Event IDs untuk incident investigation
3. **Hash Verification**: Spot-check hash chain integrity
4. **User Behavior**: Monitor unusual activity patterns

### Compliance Workflow
```
Monthly:
├─ Generate Compliance Report
├─ Review hash chain integrity
├─ Check legal holds status
└─ Update retention policies if needed

Quarterly:
├─ Full audit log review
├─ External auditor access
├─ Compliance standard mapping update
└─ Management presentation

Annually:
├─ ISO/SOC 2 certification renewal
├─ GDPR compliance assessment
└─ Security policy review
```

---

## 🚨 Troubleshooting

### Report Generation Failed
**Error**: `❌ Failed to generate report`

**Causes**:
- Database connection issue
- Insufficient permissions
- Missing compliance_settings table

**Solution**:
```bash
# Check database connection
mysql -u root -p filemanager_sftp -e "SELECT 1"

# Verify tables exist
mysql -u root -p filemanager_sftp -e "SHOW TABLES LIKE 'compliance%'"

# Re-run migration if needed
node server/src/scripts/migrate_compliance.js
```

### Audit Logs Not Loading
**Error**: `❌ Failed to load audit logs`

**Causes**:
- activity_history table missing hash columns
- Large dataset causing timeout

**Solution**:
```sql
-- Check table structure
DESCRIBE activity_history;

-- Should have: event_id, hash, prev_hash columns
-- If missing, run migration:
-- node server/src/scripts/migrate_compliance.js

-- For large datasets, increase timeout
SET SESSION max_execution_time = 60000;
```

---

**Version**: 1.4.0  
**Last Updated**: 2026-01-03  
**Status**: ✅ Production Ready
