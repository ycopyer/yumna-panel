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

# Web Server Selection
echo -e "${YELLOW}Select Web Server Stack:${NC}"
echo "1) Nginx Only (High Performance, Default)"
echo "2) Apache Only (Classic, .htaccess support)"
echo "3) Hybrid (Nginx Frontend + Apache Backend)"
read -p "Enter choice [1-3]: " WEB_STACK_CHOICE
WEB_STACK_CHOICE=${WEB_STACK_CHOICE:-1}

# Web Server Installation Logic
case $WEB_STACK_CHOICE in
    2)
        echo -e "${BLUE}[5/6] Installing Apache Web Server...${NC}"
        apt-get install -y apache2
        systemctl start apache2
        systemctl enable apache2
        # Disable default site to avoid conflicts
        a2dissite 000-default.conf || true
        systemctl reload apache2
        ;;
    3)
        echo -e "${BLUE}[5/6] Installing Hybrid Stack (Nginx + Apache)...${NC}"
        apt-get install -y nginx apache2
        
        # Configure Apache ports for backend
        echo "Listen 8080" > /etc/apache2/ports.conf
        # Need to configure default vhost to 8080 or disable it
        sed -i 's/:80/:8080/g' /etc/apache2/sites-available/000-default.conf
        
        systemctl start apache2 nginx
        systemctl enable apache2 nginx
        ;;
    *)
        echo -e "${BLUE}[5/6] Installing Nginx Web Server...${NC}"
        apt-get install -y nginx
        systemctl start nginx
        systemctl enable nginx
        # If apache is installed, stop/disable it to prevent conflict on port 80
        systemctl stop apache2 2>/dev/null || true
        systemctl disable apache2 2>/dev/null || true
        ;;
esac

# Save selection to Agent .env for future reference
WEB_STACK_NAME="nginx"
[ "$WEB_STACK_CHOICE" == "2" ] && WEB_STACK_NAME="apache"
[ "$WEB_STACK_CHOICE" == "3" ] && WEB_STACK_NAME="hybrid"

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
    echo -e "${YELLOW}Creating WHM configuration...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
    else
        # Fallback default content
        echo "NODE_ENV=production" > .env
        echo "PORT=4000" >> .env
        echo "DB_HOST=localhost" >> .env
        echo "DB_USER=yumna_whm" >> .env
        echo "DB_PASSWORD=yumna_db_password" >> .env
        echo "DB_NAME=yumna_whm" >> .env
        echo "SECRET_KEY=yumna_secret_$(openssl rand -hex 16)" >> .env
        echo "AGENT_SECRET=yumna_agent_$(openssl rand -hex 16)" >> .env
    fi
    
    # Update secrets if they are still placeholders
    SECRET=$(openssl rand -hex 32)
    AGENT_SECRET=$(openssl rand -hex 32)
    sed -i "s/change_this_to_a_secure_random_string_v3/$SECRET/" .env
    sed -i "s/change_this_shared_secret_for_nodes/$AGENT_SECRET/" .env
    
    # Ensure AGENT_SECRET is captured for Agent setup
    CURRENT_AGENT_SECRET=$(grep AGENT_SECRET .env | cut -d '=' -f2)
fi

npm install --production

# Agent Setup
cd "$INSTALL_DIR/agent"
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating Agent configuration...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
    else
        # Fallback default content
        echo "NODE_ENV=production" > .env
        echo "PORT=3000" >> .env
        echo "WHM_URL=http://localhost:4000" >> .env
        echo "WEB_SERVER_STACK=$WEB_STACK_NAME" >> .env
    fi

    # Retrieve secret from WHM config if available
    if [ -n "$CURRENT_AGENT_SECRET" ]; then
        # Replace or Append
        if grep -q "AGENT_SECRET" .env; then
             sed -i "s/change_this_shared_secret_for_nodes/$CURRENT_AGENT_SECRET/" .env
             sed -i "s/^AGENT_SECRET=.*/AGENT_SECRET=$CURRENT_AGENT_SECRET/" .env
        else
             echo "AGENT_SECRET=$CURRENT_AGENT_SECRET" >> .env
        fi
    fi
    
    # Ensure Web Stack is set if using existing .env
    if ! grep -q "WEB_SERVER_STACK" .env; then
        echo "WEB_SERVER_STACK=$WEB_STACK_NAME" >> .env
    fi
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

# Function to run mysql command (try multiple methods)
run_sql() {
    if mysql -e "$1" 2>/dev/null; then
        return 0
    elif sudo mysql -e "$1" 2>/dev/null; then
        return 0
    else
        echo -e "${YELLOW}MySQL root access failed. Trying without password...${NC}"
        # Some systems allow passwordless root login via socket
        return 1
    fi
}

# Ensure MariaDB is running
systemctl start mariadb || systemctl start mysql

# Try to secure installation first (optional/automated)
# Creating DB and User
SQL_CMDS="
CREATE DATABASE IF NOT EXISTS yumna_whm;
CREATE USER IF NOT EXISTS 'yumna_whm'@'localhost' IDENTIFIED BY 'yumna_db_password';
GRANT ALL PRIVILEGES ON yumna_whm.* TO 'yumna_whm'@'localhost';
FLUSH PRIVILEGES;
"

if ! run_sql "$SQL_CMDS"; then
    echo -e "${RED}Failed to configure database automatically.${NC}"
    echo -e "${YELLOW}Please run the following SQL manually:${NC}"
    echo "$SQL_CMDS"
else
    echo -e "${GREEN}Database configured successfully.${NC}"
fi

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
