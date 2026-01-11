# 🛠️ Yumna Panel v3.0 - Installation Guide

## 📋 System Requirements

### Hardware (Minimum)
- **CPU**: 2 Cores
- **RAM**: 4 GB (Master Node), 2 GB (Worker Node)
- **Storage**: 20 GB SSD
- **Network**: Public IP Address

### OS Support (Universal)
Yumna Panel v3.0 features a universal installer that automatically detects your OS:

**🐧 Linux**
- **Debian Family**: Ubuntu 20.04+, Debian 11+ (Uses `apt`)
- **RHEL Family**: CentOS 9 Stream, AlmaLinux 9, Rocky Linux 9 (Uses `dnf`)
- **Arch Linux**: Arch, Manjaro (Uses `pacman`)

**🍎 macOS**
- **Versions**: Monterey, Ventura, Sonoma
- **Architecture**: Apple Silicon (M1/M2/M3) & Intel
- **Requirement**: Homebrew must be installed (`brew`).

**😈 FreeBSD (Experimental)**
- **Versions**: 13.x, 14.x
- **Requirement**: `pkg` package manager.
- **Note**: Uses `rc.d` instead of `systemd`. Manual IPFW configuration recommended.

---

## 🚀 Installation Steps

We provide a **Universal Installer** that detects your OS and guides you through the process.

### 1. Clone & Run Installer
Run the following commands on your server:

```bash
# Clone Repository to /opt/yumna-panel
git clone https://github.com/ycopyer/yumna-panel.git /opt/yumna-panel

# Run Installer
sudo bash /opt/yumna-panel/scripts/deploy/deploy_v3.sh
```

### 2. Choose Installation Mode
The installer will ask you to select a mode:

#### 1) Full Control Panel (Master Node)
*Best for: Single Server Setup or Main Controller*
- Installs **WHM** (Control Plane API & Database)
- Installs **Panel** (Frontend UI)
- Installs **Agent** (Local Hosting Capability)
- Installs **Web Server** (Nginx/Apache/Hybrid)
- Includes Database & Service Auto-Setup.

#### 2) Worker Node Only (Agent)
*Best for: Adding more servers to an existing cluster*
- Installs **Agent** ONLY.
- Connects to your existing Master Node.
- Installs **Web Server** (Nginx/Apache/Hybrid) for hosting.
- Requires: **Master WHM URL** and **Agent Secret**.

#### 3) WHM Core Only (API)
*Best for: Headless setups or dedicated control plane*
- Installs **WHM** & **Database** ONLY.
- No frontend, No agent, No hosting stack.
- Ideal for high-scale, segregated environments.

---

## 🌐 Web Server Stacks

You can choose your preferred web server stack during installation:

- **Nginx Only** (Default): High performance, modern stack.
- **Apache Only**: Classic stack, supports `.htaccess` natively.
- **Hybrid (Nginx + Apache)**: Best of both worlds. Nginx as frontend proxy (Port 80/443), Apache as backend (Port 8080) for `.htaccess` compatibility.

---

## 🔄 Post-Installation

### 1. Accessing the Panel
- **URL**: `http://YOUR-SERVER-IP/`
- **Port 4000**: WHM API (`http://YOUR-SERVER-IP:4000`)
- **Default Login**: Create your admin account via the CLI if not prompted.

### 2. Multi-Node Configuration
If you installed a **Worker Node**:
1. Go to your **Master Panel** > **Servers**.
2. Add the new server manually or verify it appears if Auto-Discovery is enabled.
3. Ensure the `AGENT_SECRET` matches between Master and Worker (check `/opt/yumna-panel/whm/.env` on Master).

---

## 🆘 Troubleshooting

- **Logs**:
  - WHM: `journalctl -u yumna-whm -f`
  - Agent: `journalctl -u yumna-agent -f`
- **Firewall**:
  - Ensure Ports 80, 443, 3000 (Agent), 4000 (WHM) are open.
  - The installer tries to configure `ufw` or `firewalld` automatically.

---

**Version**: 3.0.0 (Universal)
