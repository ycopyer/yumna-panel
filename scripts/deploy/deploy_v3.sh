#!/bin/bash

# Yumna Panel v3.0 - Unified Deployment Script
# Supports: Ubuntu 20.04/22.04/24.04, Debian 11/12
# Author: Yumna Panel Team

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "██╗   ██╗██╗   ██╗███╗   ███╗███╗   ██╗ █████╗ "
echo "╚██╗ ██╔╝██║   ██║████╗ ████║████╗  ██║██╔══██╗"
echo " ╚████╔╝ ██║   ██║██╔████╔██║██╔██╗ ██║███████║"
echo "  ╚██╔╝  ██║   ██║██║╚██╔╝██║██║╚██╗██║██╔══██║"
echo "   ██║   ╚██████╔╝██║ ╚═╝ ██║██║ ╚████║██║  ██║"
echo "   ╚═╝    ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝"
echo -e "${NC}"
echo -e "${GREEN}Yumna Panel v3.0 - Automated Installer${NC}"
echo "------------------------------------------------"

# Check Root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Please run as root (sudo)${NC}"
  exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
elif type lsb_release >/dev/null 2>&1; then
    OS=$(lsb_release -si)
    VER=$(lsb_release -sr)
else
    echo -e "${RED}Unsupported OS${NC}"
    exit 1
fi

echo -e "${YELLOW}Detected OS: $OS $VER${NC}"

# Update System
echo -e "${BLUE}[1/6] Updating System Repositories...${NC}"
apt-get update -y && apt-get upgrade -y

# Install Dependencies
echo -e "${BLUE}[2/6] Installing Core Dependencies...${NC}"
apt-get install -y curl wget git unzip zip htop software-properties-common ufw acl build-essential python3-certbot-nginx

# Install Node.js
echo -e "${BLUE}[3/6] Installing Node.js LTS...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo "Node.js $(node -v) is already installed."
fi

# Install MariaDB
echo -e "${BLUE}[4/6] Installing MariaDB Database...${NC}"
apt-get install -y mariadb-server
systemctl start mariadb
systemctl enable mariadb

# Install Nginx
echo -e "${BLUE}[5/6] Installing Nginx Web Server...${NC}"
apt-get install -y nginx
systemctl start nginx
systemctl enable nginx

# Clone Yumna Panel
INSTALL_DIR="/opt/yumna-panel"
echo -e "${BLUE}[6/6] Deploying Yumna Panel to $INSTALL_DIR...${NC}"

if [ -d "$INSTALL_DIR" ]; then
    if [ -d "$INSTALL_DIR/.git" ]; then
        echo -e "${YELLOW}Directory exists and is a git repo. Pulling latest updates...${NC}"
        cd "$INSTALL_DIR"
        git pull
    else
        echo -e "${YELLOW}Directory exists but is NOT a git repo. Backing up and cloning fresh...${NC}"
        mv "$INSTALL_DIR" "${INSTALL_DIR}_backup_$(date +%s)"
        git clone https://github.com/ycopyer/yumna-panel.git "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi
else
    git clone https://github.com/ycopyer/yumna-panel.git "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# Setup Environment
echo -e "${BLUE}Configuring Environment...${NC}"

# WHM Setup
cd "$INSTALL_DIR/whm"
if [ ! -f .env ]; then
    cp .env.example .env
    # Generate random secrets
    SECRET=$(openssl rand -hex 32)
    AGENT_SECRET=$(openssl rand -hex 32)
    sed -i "s/change_this_to_a_secure_random_string_v3/$SECRET/" .env
    sed -i "s/change_this_shared_secret_for_nodes/$AGENT_SECRET/" .env
fi
npm install --production

# Agent Setup
cd "$INSTALL_DIR/agent"
if [ ! -f .env ]; then
    cp .env.example .env || echo "AGENT_SECRET=$AGENT_SECRET" > .env
    # sed -i "s/YOUR_AGENT_SECRET/$AGENT_SECRET/" .env
fi
npm install --production

# Panel Setup (Build)
cd "$INSTALL_DIR/panel"
npm install
# npm run build # Requires more resources, maybe skip build on low-end VPS and download assets?
# For now, let's assume we build it.
echo -e "${YELLOW}Building Frontend (this may take a while)...${NC}"
npm run build

# Setup Systemd Services
echo -e "${BLUE}Installing Services...${NC}"
cp "$INSTALL_DIR/scripts/systemd/yumna-whm.service" /etc/systemd/system/
cp "$INSTALL_DIR/scripts/systemd/yumna-agent.service" /etc/systemd/system/

systemctl daemon-reload
systemctl enable yumna-whm yumna-agent
systemctl start yumna-whm yumna-agent

# Setup Database
echo -e "${BLUE}Configuring Database...${NC}"
mysql -e "CREATE DATABASE IF NOT EXISTS yumna_whm;"
mysql -e "CREATE USER IF NOT EXISTS 'yumna_whm'@'localhost' IDENTIFIED BY 'yumna_db_password';"
mysql -e "GRANT ALL PRIVILEGES ON yumna_whm.* TO 'yumna_whm'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

# Firewall
echo -e "${BLUE}Configuring Firewall...${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp # Agent
ufw allow 4000/tcp # WHM
ufw --force enable

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}    INSTALLATION COMPLETE! 🎊       ${NC}"
echo -e "${GREEN}=====================================${NC}"
echo -e "WHM URL:   http://$(curl -s ifconfig.me):4000"
echo -e "Panel URL: http://$(curl -s ifconfig.me)"
echo -e "DB User:   yumna_whm"
echo -e "DB Pass:   yumna_db_password"
echo ""
echo -e "${YELLOW}Please restart your session or reboot needed.${NC}"
