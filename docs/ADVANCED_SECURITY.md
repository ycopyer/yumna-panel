# Advanced Security Features - Implementation Guide

## 🛡️ Overview
Comprehensive security suite including Fail2Ban brute force protection and IP-based access control for individual websites.

---

## ✨ Features Implemented

### 1. Fail2Ban Protection System

#### Backend Service: `Fail2BanService.js`

**Core Features:**
- Jail configuration management
- IP banning/unbanning (manual & automatic)
- Ban expiration tracking
- Statistics & monitoring
- Multiple jail support

**Supported Jails:**
- **SSH** - Port 22 protection
- **Nginx HTTP Auth** - Web authentication
- **Nginx Limit Req** - Rate limiting
- **phpMyAdmin** - Database admin protection
- **WordPress Auth** - CMS login protection

**Methods:**
```javascript
initialize()                    // Setup Fail2Ban
getJails()                      // List all jails
createJail(name, config)        // Create/update jail
getBannedIPs()                  // List banned IPs
banIP(ip, jail, reason)         // Manual ban
unbanIP(ip)                     // Remove ban
getStats()                      // Get statistics
cleanExpiredBans()              // Auto cleanup
```

#### API Endpoints:

**Initialize:**
```javascript
POST /api/security/fail2ban/initialize
```

**Get Jails:**
```javascript
GET /api/security/fail2ban/jails
```

**Create/Update Jail:**
```javascript
POST /api/security/fail2ban/jails
Body: {
  name: "ssh",
  config: {
    enabled: true,
    port: 22,
    logpath: "C:/YumnaPanel/logs/auth.log",
    maxretry: 3,
    bantime: 3600
  }
}
```

**Get Banned IPs:**
```javascript
GET /api/security/fail2ban/banned
```

**Ban IP:**
```javascript
POST /api/security/fail2ban/ban
Body: {
  ip: "192.168.1.100",
  jail: "manual",
  reason: "Suspicious activity"
}
```

**Unban IP:**
```javascript
POST /api/security/fail2ban/unban
Body: { ip: "192.168.1.100" }
```

**Get Statistics:**
```javascript
GET /api/security/fail2ban/stats
```

**Response:**
```json
{
  "total_jails": 5,
  "enabled_jails": 4,
  "total_bans": 23,
  "active_bans": 5,
  "jails_by_status": {
    "enabled": 4,
    "disabled": 1
  },
  "recent_bans": [...]
}
```

**Clean Expired Bans:**
```javascript
POST /api/security/fail2ban/clean
```

#### Frontend Component: `Fail2BanManager.tsx`

**Features:**
- **Overview Tab**: Real-time statistics dashboard
- **Jails Tab**: Jail configuration viewer
- **Banned IPs Tab**: Active bans management

**UI Elements:**
- Statistics cards (Total Jails, Total Bans, Active Bans, Protection Status)
- Recent bans list with time remaining
- Jail status indicators
- Manual ban modal
- Unban buttons
- Auto-refresh

---

### 2. IP Access Control (Whitelist/Blacklist)

#### Backend Service: `IPAccessControlService.js`

**Core Features:**
- Per-website IP access rules
- Whitelist & blacklist support
- Bulk import/export
- Nginx config auto-generation
- CIDR notation support
- IPv4 & IPv6 support

**Database Schema:**
```sql
CREATE TABLE ip_access_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  website_id INT NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  rule_type ENUM('whitelist', 'blacklist') NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT,
  FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
)
```

**Methods:**
```javascript
initialize()                              // Setup system
getRules(websiteId)                       // Get all rules
addRule(websiteId, ip, type, desc, user)  // Add rule
deleteRule(ruleId, userId, isAdmin)       // Delete rule
getStats(websiteId)                       // Get statistics
bulkImport(websiteId, ipList, type, user) // Import multiple IPs
exportRules(websiteId, type)              // Export to text
clearRules(websiteId, type)               // Clear all rules
generateNginxConfig(websiteId)            // Generate config file
```

#### API Endpoints:

**Initialize:**
```javascript
POST /api/security/ip-access/initialize
```

**Get Rules:**
```javascript
GET /api/security/ip-access/:websiteId
```

**Add Rule:**
```javascript
POST /api/security/ip-access/:websiteId
Body: {
  ip_address: "192.168.1.100",
  rule_type: "whitelist",
  description: "Office IP"
}
```

**Delete Rule:**
```javascript
DELETE /api/security/ip-access/rules/:ruleId
```

**Get Statistics:**
```javascript
GET /api/security/ip-access/:websiteId/stats
```

**Response:**
```json
{
  "total_rules": 15,
  "whitelist_count": 5,
  "blacklist_count": 10
}
```

**Bulk Import:**
```javascript
POST /api/security/ip-access/:websiteId/bulk-import
Body: {
  ip_list: "192.168.1.1\n192.168.1.2\n192.168.1.0/24",
  rule_type: "whitelist"
}
```

**Response:**
```json
{
  "success": true,
  "imported": 3,
  "failed": 0,
  "details": {
    "imported": ["192.168.1.1", "192.168.1.2", "192.168.1.0/24"],
    "failed": []
  }
}
```

**Export Rules:**
```javascript
GET /api/security/ip-access/:websiteId/export?rule_type=whitelist
```

**Response:**
```json
{
  "success": true,
  "export_text": "192.168.1.1 # whitelist - Office IP\n192.168.1.2 # whitelist - VPN",
  "count": 2
}
```

**Clear Rules:**
```javascript
DELETE /api/security/ip-access/:websiteId/clear?rule_type=blacklist
```

#### Nginx Configuration Generation:

**Generated Config Example:**
```nginx
# IP Access Control for example.com
# Generated: 2026-01-09T16:30:00.000Z

# Whitelist - Only these IPs are allowed
allow 192.168.1.100; # Office IP
allow 10.0.0.0/24; # Internal network
deny all; # Deny all other IPs

# Blacklist - These IPs are blocked
deny 203.0.113.0; # Suspicious activity
deny 198.51.100.0; # Brute force attempt
```

**Config Location:**
```
C:/YumnaPanel/etc/nginx/ip-access/{domain}_ip_access.conf
```

---

## 🎨 UI/UX Design

### Fail2Ban Manager:
- **Color Scheme**:
  - Rose/Red: Bans & blocked IPs
  - Emerald: Active protection
  - Amber: Warnings
  - Blue: Jails & configuration

- **Interactive Elements**:
  - Real-time statistics cards
  - Time remaining countdown
  - One-click unban
  - Manual ban modal
  - Auto-refresh button

### IP Access Control:
- **Features** (To be implemented in frontend):
  - Rule list with type badges
  - Add/Delete buttons
  - Bulk import textarea
  - Export download
  - Statistics cards
  - Nginx config preview

---

## 🔧 Configuration

### Environment Variables:
```env
# No additional env vars required
# Uses existing database connection
```

### File Locations:
```
C:/YumnaPanel/etc/fail2ban/          # Fail2Ban configs
C:/YumnaPanel/etc/fail2ban/jail.d/   # Jail configurations
C:/YumnaPanel/logs/fail2ban/         # Ban logs
C:/YumnaPanel/etc/nginx/ip-access/   # IP access configs
```

---

## 📊 Usage Examples

### 1. Setup Fail2Ban Protection:
```javascript
// Initialize (admin only)
await axios.post('/api/security/fail2ban/initialize');

// Ban suspicious IP
await axios.post('/api/security/fail2ban/ban', {
  ip: '203.0.113.0',
  jail: 'manual',
  reason: 'Multiple failed login attempts'
});

// Check statistics
const stats = await axios.get('/api/security/fail2ban/stats');
console.log(`Active bans: ${stats.data.active_bans}`);
```

### 2. Configure Website IP Access:
```javascript
// Whitelist office IP
await axios.post('/api/security/ip-access/123', {
  ip_address: '192.168.1.100',
  rule_type: 'whitelist',
  description: 'Office IP'
});

// Blacklist attacker
await axios.post('/api/security/ip-access/123', {
  ip_address: '203.0.113.0',
  rule_type: 'blacklist',
  description: 'Brute force attack'
});

// Bulk import whitelist
await axios.post('/api/security/ip-access/123/bulk-import', {
  ip_list: '192.168.1.0/24\n10.0.0.0/8',
  rule_type: 'whitelist'
});

// Export rules
const export_data = await axios.get('/api/security/ip-access/123/export');
console.log(export_data.data.export_text);
```

---

## 🚀 Integration with Nginx

### Automatic Config Inclusion:

Add to website's Nginx vhost:
```nginx
server {
    listen 80;
    server_name example.com;
    
    # Include IP access control
    include C:/YumnaPanel/etc/nginx/ip-access/example.com_ip_access.conf;
    
    location / {
        # ... rest of config
    }
}
```

### Reload Nginx:
```bash
nginx -t && nginx -s reload
```

---

## 🎯 Testing Checklist

### Fail2Ban:
- [x] Initialize service
- [x] Create default jails
- [x] Ban IP manually
- [x] Unban IP
- [x] View statistics
- [x] Clean expired bans
- [x] Frontend dashboard
- [x] Real-time updates

### IP Access Control:
- [x] Initialize service
- [x] Add whitelist rule
- [x] Add blacklist rule
- [x] Delete rule
- [x] Bulk import
- [x] Export rules
- [x] Clear rules
- [x] Generate Nginx config
- [x] Statistics tracking
- [ ] Frontend UI (pending)

---

## 💡 Best Practices

### Fail2Ban:
1. **Start with moderate settings**: maxretry=5, bantime=3600
2. **Monitor false positives**: Check banned IPs regularly
3. **Whitelist trusted IPs**: Add your own IPs to prevent lockout
4. **Regular cleanup**: Run clean expired bans weekly

### IP Access Control:
1. **Use whitelist for sensitive sites**: Admin panels, staging sites
2. **Document all rules**: Always add descriptions
3. **Test before deployment**: Verify rules don't block legitimate users
4. **Use CIDR notation**: For IP ranges (e.g., 192.168.1.0/24)
5. **Regular audits**: Review and remove outdated rules

---

## 🔒 Security Considerations

1. **Admin Access**: Only admins can initialize and configure jails
2. **User Isolation**: Users can only manage their own websites
3. **Audit Trail**: All actions logged with user ID and timestamp
4. **Automatic Cleanup**: Expired bans removed automatically
5. **Config Validation**: IP addresses validated before adding

---

## 💝 Credits

Developed with love by Yumna Panel Team
Built using: Node.js, Express, React, TypeScript, MySQL

---

**Last Updated**: 2026-01-09
**Version**: 2.3.0
**Status**: ✅ Production Ready
