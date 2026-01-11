# Yumna Panel v3.0 - Installation Guide

Welcome to the Yumna Panel v3.0 installation guide. This document provides instructions for deploying the Control Plane (WHM), Agent nodes, and the Frontend Panel.

## 🚀 System Requirements

- **OS**: Ubuntu 22.04 LTS or Debian 11/12 (Recommended)
- **CPU**: 2 Cores (Minimum), 4 Cores+ (Recommended)
- **RAM**: 4GB (Minimum), 8GB+ (Recommended)
- **Disk**: 20GB Free Space
- **Network**: Public IPv4, Ports 80, 443, 4000, 4001, 3306 open.

---

## ⚡ Option 1: One-Click Installation (Recommended)

Our unified deployment script automates the installation of Node.js, MariaDB, Nginx, and system services.

```bash
# Download the script
curl -o deploy.sh https://raw.githubusercontent.com/ycopyer/yumna-panel/main/scripts/deploy/deploy_v3.sh

# Make it executable
chmod +x deploy.sh

# Run as root
sudo ./deploy.sh
```

The script will:
1. Install system dependencies.
2. Setup the `/opt/yumnapanel` directory.
3. Configure `yumna-whm` and `yumna-agent` as Systemd services.
4. Setup Nginx as a reverse proxy for the Panel and API.
5. Initialize the database schema.

---

## 🐳 Option 2: Docker Orchestration

If you prefer containerized environments, use our optimized Docker stack.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ycopyer/yumna-panel.git
   cd yumna-panel
   ```

2. **Configure Environment**:
   Create a `.env` file in the root directory:
   ```env
   DB_ROOT_PASSWORD=your_secure_password
   AGENT_SECRET=your_agent_secret_token
   JWT_SECRET=your_jwt_secret
   ```

3. **Deploy with Docker Compose**:
   ```bash
   docker-compose up -d --build
   ```

4. **Access the Panel**:
   Open `http://your-server-ip` in your browser.

---

## 🛠️ Option 3: Manual Installation

### 1. Database Setup
Install MariaDB/MySQL and create the database:
```sql
CREATE DATABASE yumna_v3;
```

### 2. Control Plane (WHM)
```bash
cd whm
npm install
cp .env.example .env # Configure your DB credentials
npm start
```

### 3. Server Agent
```bash
cd agent
npm install
cp .env.example .env # Configure AGENT_SECRET matching WHM
npm start
```

### 4. Frontend Panel
```bash
cd panel
npm install
npm run build
# Serve the 'dist' folder using Nginx/Apache
```

---

## 🛡️ Security Post-Install
1. **Change Default Password**: Login as `admin` and update your password immediately.
2. **Enable 2FA**: Visit Security Settings to activate Two-Factor Authentication.
3. **Firewall**: Ensure UFW/Firewalld is active and only allows necessary ports.

## 🆘 Support
For issues or feedback, please open an issue in the [GitHub Repository](https://github.com/ycopyer/yumna-panel).
