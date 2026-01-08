# 🚨 Incident Response Guide: Hash Chain Breach
**SFTP File Manager v1.4.0 - Security Incident Protocol**  
**Severity Level**: 🔴 **CRITICAL**  
**Last Updated**: 2026-01-03

---

## ⚠️ What Does "Hash Chain Broken" Mean?

When you see this alert:

```
Chain Broken at Log #3400
Event ID: LEG-20260103-13D78BDB
Hash chain broken (prev_hash mismatch)
```

It means:
- ❌ **Log entry #3400 has been tampered with**, OR
- ❌ **Log entry #3399 was deleted/modified**, OR
- ❌ **Database corruption occurred**

This is a **CRITICAL SECURITY INCIDENT** that requires immediate action.

---

## 🔴 Immediate Response (First 15 Minutes)

### Step 1: Isolate the System
```bash
# STOP all write operations immediately
# DO NOT delete or modify anything yet
```

**Actions:**
1. ✅ Take a **full database snapshot** immediately
2. ✅ Preserve current state for forensic analysis
3. ✅ Notify Security Team and Legal Counsel
4. ✅ Document the exact time of discovery

### Step 2: Capture Evidence

**SQL Query to Extract Broken Chain Context:**
```sql
-- Get the broken entry and surrounding logs
SELECT 
    id,
    userId,
    action,
    description,
    ipAddress,
    event_id,
    hash,
    prev_hash,
    createdAt
FROM activity_history
WHERE id BETWEEN 3395 AND 3405
ORDER BY id ASC;
```

**Save this output immediately** - it's your primary evidence.

### Step 3: Identify the Breach Point

Run this diagnostic query:

```sql
-- Find where the chain breaks
SELECT 
    curr.id AS broken_id,
    curr.event_id AS broken_event,
    curr.hash AS current_hash,
    curr.prev_hash AS expected_prev_hash,
    prev.hash AS actual_prev_hash,
    curr.createdAt AS broken_timestamp,
    curr.userId AS user_involved,
    curr.ipAddress AS source_ip
FROM activity_history curr
LEFT JOIN activity_history prev ON prev.id = curr.id - 1
WHERE curr.prev_hash != prev.hash
ORDER BY curr.id ASC;
```

---

## 🔍 Forensic Analysis

### Scenario 1: Deliberate Tampering

**Indicators:**
- ✅ Hash mismatch on specific entry
- ✅ Suspicious user activity around that time
- ✅ No database errors in logs

**Investigation Steps:**

1. **Identify the Actor:**
```sql
-- Who was active around the breach time?
SELECT 
    userId,
    username,
    action,
    ipAddress,
    createdAt
FROM activity_history ah
JOIN users u ON ah.userId = u.id
WHERE createdAt BETWEEN 
    (SELECT createdAt FROM activity_history WHERE id = 3400) - INTERVAL 1 HOUR
    AND
    (SELECT createdAt FROM activity_history WHERE id = 3400) + INTERVAL 1 HOUR
ORDER BY createdAt DESC;
```

2. **Check Database Access Logs:**
```bash
# MySQL/MariaDB audit log
sudo cat /var/log/mysql/audit.log | grep "UPDATE activity_history"
sudo cat /var/log/mysql/audit.log | grep "DELETE FROM activity_history"
```

3. **Review System Access:**
```bash
# Who had database access?
sudo cat /var/log/auth.log | grep mysql
sudo last -f /var/log/wtmp | grep <suspicious-user>
```

### Scenario 2: Database Corruption

**Indicators:**
- ✅ Multiple broken chains
- ✅ Database error logs present
- ✅ No suspicious user activity

**Investigation Steps:**

1. **Check Database Integrity:**
```sql
CHECK TABLE activity_history;
REPAIR TABLE activity_history;
```

2. **Review MySQL Error Logs:**
```bash
sudo tail -n 500 /var/log/mysql/error.log
```

3. **Check Disk Health:**
```bash
sudo smartctl -a /dev/sda
sudo dmesg | grep -i error
```

### Scenario 3: Migration/Upgrade Issue

**Indicators:**
- ✅ Breach occurred right after system update
- ✅ Multiple entries affected
- ✅ Pattern suggests batch operation

**Investigation Steps:**

1. **Review Recent Migrations:**
```bash
cd server/src/scripts
ls -lah migrate_*.js
git log --since="7 days ago" -- src/scripts/
```

2. **Check if Hash Algorithm Changed:**
```javascript
// Verify current hash implementation
const ComplianceService = require('./server/src/services/compliance');
console.log(ComplianceService.calculateHash({ test: 'data' }, 'prev'));
```

---

## 🛠️ Recovery Procedures

### Option 1: Restore from Backup (Recommended)

**If you have a clean backup from before the breach:**

```bash
# 1. Stop the application
pm2 stop all

# 2. Backup current (corrupted) database
mysqldump -u root -p filemanager_sftp > corrupted_backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Restore from last known-good backup
mysql -u root -p filemanager_sftp < backup_clean_20260102.sql

# 4. Verify integrity
node server/verify_chain.js

# 5. Restart application
pm2 start all
```

### Option 2: Rebuild Hash Chain (If Tampering is Isolated)

**⚠️ Only use if you're certain the breach is limited to a few entries**

Create `server/rebuild_chain.js`:

```javascript
const db = require('./src/config/db');
const ComplianceService = require('./src/services/compliance');

async function rebuildChain(startId) {
    console.log(`Rebuilding hash chain from ID ${startId}...`);
    
    const [logs] = await db.promise().query(
        'SELECT * FROM activity_history WHERE id >= ? ORDER BY id ASC',
        [startId]
    );
    
    let prevHash = null;
    if (startId > 1) {
        const [prev] = await db.promise().query(
            'SELECT hash FROM activity_history WHERE id = ?',
            [startId - 1]
        );
        prevHash = prev[0]?.hash || null;
    }
    
    for (const log of logs) {
        const logData = {
            userId: log.userId,
            action: log.action,
            description: log.description,
            ipAddress: log.ipAddress,
            ipLocal: log.ipLocal,
            timestamp: log.createdAt.toISOString()
        };
        
        const newHash = ComplianceService.calculateHash(logData, prevHash);
        
        await db.promise().query(
            'UPDATE activity_history SET hash = ?, prev_hash = ? WHERE id = ?',
            [newHash, prevHash, log.id]
        );
        
        console.log(`✅ Rebuilt hash for log #${log.id}`);
        prevHash = newHash;
    }
    
    console.log('✅ Hash chain rebuild complete!');
    process.exit(0);
}

// Start from the broken entry
rebuildChain(3400);
```

**Run it:**
```bash
node server/rebuild_chain.js
```

**⚠️ IMPORTANT**: Document WHY you're rebuilding and get approval from legal/compliance team first.

### Option 3: Quarantine and Continue

**If you can't restore immediately:**

```sql
-- Mark the broken section
UPDATE activity_history 
SET description = CONCAT('[QUARANTINED - INTEGRITY BREACH] ', description)
WHERE id BETWEEN 3395 AND 3405;

-- Create incident record
INSERT INTO compliance_settings (key_name, value_text) VALUES 
('incident_20260103_chain_breach', 'Log #3400 quarantined - under investigation');
```

---

## 📋 Post-Incident Actions

### 1. Root Cause Analysis Report

Document:
- ✅ **What happened**: Exact nature of the breach
- ✅ **When**: Timestamp of breach and discovery
- ✅ **Who**: Users/systems involved
- ✅ **How**: Attack vector or failure mode
- ✅ **Impact**: Data affected, compliance implications

### 2. Strengthen Controls

```javascript
// Add real-time integrity monitoring
// server/src/services/integrityMonitor.js

const cron = require('node-cron');
const ComplianceService = require('./compliance');
const { sendNotification } = require('./notification');

// Run integrity check every hour
cron.schedule('0 * * * *', async () => {
    console.log('[INTEGRITY] Running hourly chain verification...');
    
    const result = await verifyLastNLogs(100); // Check last 100 entries
    
    if (!result.isValid) {
        await sendNotification(`
🚨 <b>CRITICAL: Hash Chain Breach Detected</b>

Broken at Log #${result.brokenId}
Event ID: ${result.eventId}
Time: ${new Date().toISOString()}

IMMEDIATE ACTION REQUIRED!
        `);
    }
});
```

### 3. Access Control Review

```sql
-- Audit who has direct database access
SELECT user, host FROM mysql.user WHERE user != 'root';

-- Review admin users in application
SELECT id, username, role, createdAt FROM users WHERE role = 'admin';
```

### 4. Enable MySQL Audit Plugin

```sql
-- Enable comprehensive audit logging
INSTALL PLUGIN server_audit SONAME 'server_audit.so';
SET GLOBAL server_audit_logging = ON;
SET GLOBAL server_audit_events = 'CONNECT,QUERY,TABLE';
```

### 5. Implement Alerting

Add to `server/src/services/compliance.js`:

```javascript
static async logSecureActivity(userId, action, description, context = {}) {
    const prevHash = await this.getLastLogHash();
    const eventId = this.generateEventId(action.slice(0, 3).toUpperCase());
    
    const logData = { /* ... */ };
    const hash = this.calculateHash(logData, prevHash);
    
    // VERIFY IMMEDIATELY AFTER INSERT
    const inserted = await db.promise().query(/* insert query */);
    
    // Real-time verification
    const [check] = await db.promise().query(
        'SELECT hash, prev_hash FROM activity_history WHERE id = ?',
        [inserted.insertId]
    );
    
    if (check[0].prev_hash !== prevHash) {
        // IMMEDIATE ALERT
        await sendNotification('🚨 CRITICAL: Hash chain corruption detected in real-time!');
        throw new Error('Hash chain integrity violation');
    }
    
    return { eventId, hash };
}
```

---

## 📞 Escalation Matrix

| Severity | Who to Notify | Timeframe |
|----------|---------------|-----------|
| **CRITICAL** (Hash breach) | CISO, Legal, CEO | Immediate |
| **HIGH** (Multiple issues) | Security Team, IT Manager | 1 hour |
| **MEDIUM** (Single anomaly) | Security Team | 4 hours |
| **LOW** (False positive) | Log for review | 24 hours |

---

## 🔐 Prevention Checklist

- [ ] Enable MySQL audit plugin
- [ ] Implement hourly integrity checks
- [ ] Restrict direct database access
- [ ] Enable database replication for redundancy
- [ ] Set up automated backups (every 6 hours)
- [ ] Implement database access logging
- [ ] Review and rotate database credentials
- [ ] Enable two-factor authentication for database access
- [ ] Implement network segmentation (database on isolated VLAN)
- [ ] Set up SIEM integration for anomaly detection

---

## 📚 References

- **NIST Incident Response Guide**: SP 800-61 Rev. 2
- **ISO 27035**: Information Security Incident Management
- **GDPR Article 33**: Breach notification (72 hours)
- **SOC 2**: Incident response procedures

---

**Emergency Contact**: security@yourcompany.com  
**Incident Hotline**: +62-XXX-XXXX-XXXX  
**Status Page**: https://status.yourcompany.com

**Remember**: A broken hash chain is NOT a drill. Treat it as a potential data breach until proven otherwise.

---

**Authored by**: Antigravity Security Response Team  
**Version**: 1.4.0  
**Classification**: 🔴 CONFIDENTIAL - SECURITY INCIDENT PROTOCOL
