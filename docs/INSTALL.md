# 🛠️ Yumna Panel v3.0 - Installation Guide

## 📋 System Requirements

### Hardware (Minimum)
- **CPU**: 2 Cores
- **RAM**: 4 GB
- **Storage**: 20 GB SSD
- **Network**: Public IP Address

### OS Support
- **Linux**: Ubuntu 22.04 / 24.04 (Recommended), Debian 11/12
- **Windows**: Server 2019 / 2022 / Windows 10/11 (Development/Single Node)

---

## 🚀 Quick Start (Automated)

The easiest way to install Yumna Panel is using our automated script which sets up WHM, Agent, Panel, Database, and Web Server properly.

### Linux (Ubuntu/Debian)
1. Clone the repository to `/opt`:
```bash
git clone https://github.com/ycopyer/yumna-panel.git /opt/yumna-panel
```

2. Run the deployment script:
```bash
sudo bash /opt/yumna-panel/scripts/deploy/deploy_v3.sh
```

### Windows
1. Clone repository:
   ```powershell
   git clone https://github.com/ycopyer/yumna-panel c:\YumnaPanel
   ```
2. Run setup:
   ```powershell
   c:\YumnaPanel\scripts\run\online.bat
   ```

---

## 🔧 Manual Installation (Advanced)

### 1. Database Setup
Create the central database and user:
```sql
CREATE DATABASE yumna_whm;
CREATE USER 'yumna_whm'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON yumna_whm.* TO 'yumna_whm'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Configure WHM
1. Navigate to WHM directory:
   ```bash
   cd whm
   cp .env.example .env
   ```
2. Edit `.env` configuration:
   - **Database**: Update `DB_PASSWORD`
   - **Agent Secret**: Set a unique `AGENT_SECRET` (must match Agent nodes)
   - **Payment Gateways**: Add Stripe/PayPal keys if needed
   - **HA/CDN**: Configure if using advanced features

   *(See `.env.example` for full configuration options)*

3. Install & Start:
   ```bash
   npm install
   npm start
   ```

### 3. Configure Panel (Frontend)
1. Navigate to Panel directory:
   ```bash
   cd panel
   ```
2. Build frontend:
   ```bash
   npm install
   npm run build
   ```
3. Serve the `dist` folder via Nginx or Apache.

### 4. Configure Agent (On Target Nodes)
1. Navigate to Agent directory:
   ```bash
   cd agent
   cp .env.example .env
   ```
2. Edit `.env`:
   - Set `WHM_URL` to your WHM endpoint (e.g., `http://whm.your-domain.com`)
   - Set `AGENT_SECRET` to match WHM configuration
   - Set `AGENT_IP` to the node's public IP
3. Install & Start:
   ```bash
   npm install
   npm start
   ```

---

## 🔄 Post-Installation

### 1. Database Migration
WHM will automatically run migrations on first start. You can verify tables in `yumna_whm`.

### 2. Admin User
A default admin user is created on first run (check logs) OR you can create one manually:
```bash
# Inside WHM directory
node scripts/create_admin.js email=admin@example.com password=secure123
```

### 3. Setup Payment Gateways (Optional)
If you plan to accept payments:
1. Go to **Panel > Admin > Billing > Settings**.
2. Enable Stripe/PayPal and enter credentials.
3. Configure Webhooks in your Stripe/PayPal dashboard to point to:
   - `http://your-whm-url/api/payments/webhook/stripe`
   - `http://your-whm-url/api/payments/webhook/paypal`

### 4. Setup High Availability (Optional)
For multi-node WHM setup:
1. Set `HA_ENABLED=true` in `.env` on all WHM nodes.
2. Configure `DB_MASTER_HOST` and `DB_SLAVE_CONFIG`.
3. Start Load Balancer service.
*(See `docs/HIGH_AVAILABILITY.md` for details)*

### 5. Setup CDN (Optional)
To use Cloudflare/BunnyCDN:
1. Add API keys in `.env`.
2. Configure settings in **Panel > Admin > CDN**.
*(See `docs/CDN_INTEGRATION.md` for details)*

---

## 🆘 Troubleshooting

- **Logs**: Check `whm/logs/`, `agent/logs/`, or use `journalctl -u yumna-whm` (Linux).
- **Database**: Ensure MySQL/MariaDB is running and accessible.
- **Firewall**: Ensure ports `4000` (WHM), `3000` (Agent), `80/443` (Web) are open.

---

**Version**: 3.0.0 (Production)
