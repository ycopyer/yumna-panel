# 🌐 Live DNS Server Clusters - Documentation

## Overview

Yumna Panel v3.0 includes comprehensive DNS server clustering with PowerDNS integration, enabling true DNS hosting with high availability, automatic zone synchronization, and DNSSEC support.

## Features

### Core DNS Features
- ✅ **PowerDNS Integration** - Real DNS server (not just database)
- ✅ **Multi-Node Clustering** - Distribute DNS across multiple servers
- ✅ **Automatic Zone Sync** - Zones automatically replicate to all cluster nodes
- ✅ **DNSSEC Support** - Enable DNSSEC for enhanced security
- ✅ **Health Monitoring** - Real-time cluster health checks
- ✅ **High Availability** - Redundant DNS servers for reliability

### Supported DNS Record Types
- A (IPv4 Address)
- AAAA (IPv6 Address)
- CNAME (Canonical Name)
- MX (Mail Exchange)
- TXT (Text)
- NS (Name Server)
- SOA (Start of Authority)
- SRV (Service)
- CAA (Certification Authority Authorization)

---

## Architecture

### Components

1. **PowerDNS Service** (Agent)
   - Runs on each agent node
   - Manages PowerDNS daemon
   - Handles zone synchronization
   - Provides DNSSEC capabilities

2. **DNS Cluster Service** (WHM)
   - Centralized cluster management
   - Coordinates zone distribution
   - Monitors node health
   - Manages cluster membership

3. **DNS API Routes**
   - Agent: PowerDNS operations
   - WHM: Cluster orchestration
   - User: Zone and record management

---

## Installation

### Prerequisites

#### Linux (Ubuntu/Debian)
```bash
# Install PowerDNS with MySQL backend
sudo apt-get update
sudo apt-get install -y pdns-server pdns-backend-mysql

# Install PowerDNS utilities
sudo apt-get install -y pdns-tools
```

#### CentOS/RHEL
```bash
# Install PowerDNS
sudo yum install -y pdns pdns-backend-mysql

# Install utilities
sudo yum install -y pdns-tools
```

### Configuration

#### 1. Configure PowerDNS

Create `/etc/powerdns/pdns.conf`:

```ini
# Database Configuration
launch=gmysql
gmysql-host=localhost
gmysql-port=3306
gmysql-dbname=yumna_panel
gmysql-user=yumna_user
gmysql-password=your_password

# API Configuration
api=yes
api-key=your_api_key_here
webserver=yes
webserver-address=0.0.0.0
webserver-port=8081
webserver-allow-from=127.0.0.1,::1

# Security
security-poll-suffix=
setgid=pdns
setuid=pdns

# Performance
cache-ttl=20
negquery-cache-ttl=60
query-cache-ttl=20
```

#### 2. Start PowerDNS

```bash
# Enable and start PowerDNS
sudo systemctl enable pdns
sudo systemctl start pdns

# Check status
sudo systemctl status pdns
```

#### 3. Configure Agent

Update `agent/.env`:

```env
AGENT_ID=dns-node-1
AGENT_SECRET=your_secure_secret
AGENT_PORT=3001
DB_HOST=localhost
DB_USER=yumna_user
DB_PASSWORD=your_password
DB_NAME=yumna_panel
```

#### 4. Start Agent

```bash
cd agent
npm install
npm start
```

---

## Usage

### Adding a Server to DNS Cluster

#### Via API
```bash
curl -X POST http://your-whm:4000/api/dns/cluster/nodes/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

#### Via WHM Interface
1. Navigate to **DNS → Cluster Management**
2. Click **Add Node**
3. Select server from list
4. Click **Add to Cluster**

### Creating a DNS Zone

#### Via API
```bash
curl -X POST http://your-whm:4000/api/dns \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "example.com"
  }'
```

The zone will automatically:
- Create default records (A, NS, SOA)
- Sync to all cluster nodes
- Be ready to serve DNS queries

### Managing DNS Records

#### Add A Record
```bash
curl -X POST http://your-whm:4000/api/dns/1/records \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "A",
    "name": "www",
    "content": "192.168.1.100",
    "ttl": 3600
  }'
```

#### Add MX Record
```bash
curl -X POST http://your-whm:4000/api/dns/1/records \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "MX",
    "name": "@",
    "content": "mail.example.com",
    "priority": 10,
    "ttl": 3600
  }'
```

### Enabling DNSSEC

```bash
curl -X POST http://your-whm:4000/api/dns/1/dnssec \
  -H "Authorization: Bearer YOUR_TOKEN"
```

This will:
- Generate DNSSEC keys
- Enable signing for the zone
- Return DS records for registrar

---

## API Reference

### WHM Endpoints

#### Get Cluster Status
```
GET /api/dns/cluster/status
```

**Response:**
```json
{
  "totalNodes": 3,
  "onlineNodes": 3,
  "offlineNodes": 0,
  "nodes": [
    {
      "nodeId": 1,
      "hostname": "dns1.example.com",
      "ip": "192.168.1.10",
      "status": "online",
      "dnsStatus": {
        "running": true,
        "zones": 50,
        "records": 500
      }
    }
  ]
}
```

#### Get Cluster Statistics
```
GET /api/dns/cluster/statistics
```

**Response:**
```json
{
  "totalZones": 50,
  "totalRecords": 500,
  "clusterNodes": 3,
  "onlineNodes": 3,
  "offlineNodes": 0,
  "averageZonesPerNode": 17
}
```

#### Sync Zone to Cluster
```
POST /api/dns/cluster/sync/:zoneId
```

**Response:**
```json
{
  "success": true,
  "zone": "example.com",
  "results": [
    {
      "nodeId": 1,
      "hostname": "dns1.example.com",
      "success": true,
      "message": "Zone synced successfully"
    }
  ],
  "totalNodes": 3,
  "successCount": 3
}
```

#### Sync All Zones to Node
```
POST /api/dns/cluster/sync-all/:serverId
```

**Response:**
```json
{
  "success": true,
  "node": "dns1.example.com",
  "totalZones": 50,
  "successCount": 50,
  "results": [...]
}
```

#### Health Check
```
GET /api/dns/cluster/health
```

**Response:**
```json
{
  "timestamp": "2026-01-11T12:00:00Z",
  "totalNodes": 3,
  "healthyNodes": 3,
  "results": [
    {
      "nodeId": 1,
      "hostname": "dns1.example.com",
      "healthy": true,
      "responseTime": 45
    }
  ]
}
```

### Agent Endpoints

#### Get DNS Status
```
GET /api/dns/status
```

**Response:**
```json
{
  "running": true,
  "message": "PowerDNS is running",
  "version": "PowerDNS 4.5.0",
  "statistics": {
    "status": "running",
    "zones": 50,
    "records": 500
  }
}
```

#### Sync Zone
```
POST /api/dns/sync-zone
```

**Request:**
```json
{
  "zone": {
    "id": 1,
    "domain": "example.com"
  },
  "records": [
    {
      "type": "A",
      "name": "@",
      "content": "192.168.1.100"
    }
  ]
}
```

#### Enable DNSSEC
```
POST /api/dns/zones/example.com/dnssec
```

---

## Cluster Management

### Adding a New DNS Node

1. **Install PowerDNS** on the new server
2. **Configure database** connection
3. **Add server** to Yumna Panel
4. **Add to DNS cluster**:
   ```bash
   curl -X POST http://whm:4000/api/dns/cluster/nodes/SERVER_ID
   ```
5. **Sync all zones**:
   ```bash
   curl -X POST http://whm:4000/api/dns/cluster/sync-all/SERVER_ID
   ```

### Removing a DNS Node

```bash
curl -X DELETE http://whm:4000/api/dns/cluster/nodes/SERVER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Monitoring Cluster Health

```bash
# Get cluster status
curl http://whm:4000/api/dns/cluster/status \
  -H "Authorization: Bearer YOUR_TOKEN"

# Perform health check
curl http://whm:4000/api/dns/cluster/health \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## DNSSEC Configuration

### Enabling DNSSEC

1. **Enable for zone**:
   ```bash
   curl -X POST http://whm:4000/api/dns/1/dnssec \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. **Get DS records**:
   The response will include DS records to add to your registrar

3. **Add to registrar**:
   - Log in to your domain registrar
   - Navigate to DNSSEC settings
   - Add the DS record provided

### Verifying DNSSEC

```bash
# Check DNSSEC status
dig +dnssec example.com

# Verify chain of trust
dig +dnssec +multi example.com
```

---

## Troubleshooting

### PowerDNS Not Starting

```bash
# Check logs
sudo journalctl -u pdns -n 50

# Test configuration
sudo pdns_server --config-check

# Verify database connection
mysql -u yumna_user -p yumna_panel -e "SHOW TABLES;"
```

### Zone Not Syncing

1. **Check cluster status**:
   ```bash
   curl http://whm:4000/api/dns/cluster/status
   ```

2. **Verify agent connectivity**:
   ```bash
   curl http://agent:3001/health \
     -H "X-Agent-Secret: YOUR_SECRET"
   ```

3. **Manual sync**:
   ```bash
   curl -X POST http://whm:4000/api/dns/cluster/sync/ZONE_ID
   ```

### DNS Queries Not Resolving

```bash
# Test DNS resolution
dig @your-dns-server example.com

# Check PowerDNS is listening
sudo netstat -tulpn | grep pdns

# Verify zone exists
sudo pdnsutil list-all-zones
```

---

## Performance Tuning

### PowerDNS Configuration

```ini
# Increase cache
cache-ttl=60
query-cache-ttl=60
negquery-cache-ttl=60

# Enable packet cache
packet-cache-ttl=60

# Increase threads
receiver-threads=4
distributor-threads=4
```

### Database Optimization

```sql
-- Add indexes for performance
CREATE INDEX idx_records_name_type ON records(name, type);
CREATE INDEX idx_records_domain_id ON records(domain_id);

-- Optimize tables
OPTIMIZE TABLE domains;
OPTIMIZE TABLE records;
```

---

## Security Best Practices

1. **Restrict API Access**:
   ```ini
   webserver-allow-from=127.0.0.1,::1,YOUR_WHM_IP
   ```

2. **Use Strong API Key**:
   ```ini
   api-key=GENERATE_STRONG_RANDOM_KEY
   ```

3. **Enable DNSSEC**:
   - Protects against DNS spoofing
   - Ensures data integrity

4. **Firewall Rules**:
   ```bash
   # Allow DNS (UDP/TCP 53)
   sudo ufw allow 53/tcp
   sudo ufw allow 53/udp
   
   # Restrict API access
   sudo ufw allow from YOUR_WHM_IP to any port 8081
   ```

---

## Production Checklist

- [ ] PowerDNS installed on all nodes
- [ ] Database properly configured
- [ ] Firewall rules configured
- [ ] At least 2 DNS nodes for redundancy
- [ ] DNSSEC enabled for critical zones
- [ ] Monitoring configured
- [ ] Backup strategy in place
- [ ] NS records updated at registrar
- [ ] Test DNS resolution from external locations

---

## Support

For issues or questions:
- Check PowerDNS logs: `journalctl -u pdns`
- Review cluster status: `GET /api/dns/cluster/status`
- Check agent logs: `journalctl -u yumna-agent`
- Contact support: support@yumnapanel.com

---

**Last Updated**: January 11, 2026  
**Version**: 3.0.0-alpha  
**PowerDNS Version**: 4.5.0+
