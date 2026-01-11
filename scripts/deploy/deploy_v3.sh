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
echo -e "${BLUE}[1/X] Updating System Repositories...${NC}"
apt-get update -y && apt-get upgrade -y

# Install Dependencies
echo -e "${BLUE}[2/X] Installing Core Dependencies...${NC}"
apt-get install -y curl wget git unzip zip htop software-properties-common ufw acl build-essential python3-certbot-nginx

# Install Node.js
echo -e "${BLUE}[3/X] Installing Node.js LTS...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo "Node.js $(node -v) is already installed."
fi

# Install MariaDB
echo -e "${BLUE}[4/X] Installing MariaDB Database...${NC}"
apt-get install -y mariadb-server
systemctl start mariadb || systemctl start mysql
systemctl enable mariadb || systemctl enable mysql

# --- Mode Selection ---
echo -e "${YELLOW}------------------------------------------------${NC}"
echo -e "${YELLOW} Installation Mode Selection ${NC}"
echo -e "${YELLOW}------------------------------------------------${NC}"
echo "1) Full Control Panel (Master Node: WHM + Panel + Local Agent)"
echo "2) Worker Node Only (Hosting Server: Agent Only)"
echo "3) WHM Core Only (API Control Plane & Database)"
read -p "Enter Choice [1-3]: " INSTALL_MODE
INSTALL_MODE=${INSTALL_MODE:-1}

# Web Server Selection
# Only ask for Web Stack if we are installing an Agent (Mode 1 or 2)
if [ "$INSTALL_MODE" != "3" ]; then
    echo -e "${YELLOW}Select Web Server Stack for Hosting:${NC}"
    echo "1) Nginx Only (High Performance, Default)"
    echo "2) Apache Only (Classic, .htaccess support)"
    echo "3) Hybrid (Nginx Frontend + Apache Backend)"
    read -p "Enter choice [1-3]: " WEB_STACK_CHOICE
    WEB_STACK_CHOICE=${WEB_STACK_CHOICE:-1}
else
    # For WHM Only, minimal Nginx as proxy
    WEB_STACK_CHOICE=1
fi

# Web Server Installation Logic
echo -e "${BLUE}[5/X] Installing Web Server...${NC}"

if [ "$INSTALL_MODE" == "3" ]; then
    # Minimal Nginx for WHM proxy
    apt-get install -y nginx
    systemctl start nginx
    systemctl enable nginx
    # Ensure Apache is completely DEAD
    systemctl stop apache2 2>/dev/null || true
    systemctl disable apache2 2>/dev/null || true
    # Remove apache2 startup links just in case
    update-rc.d apache2 remove 2>/dev/null || true
else
    # Standard hosting stack
    case $WEB_STACK_CHOICE in
        2)
            # APCHE ONLY
            echo -e "${YELLOW}Configuring Apache Only...${NC}"
            apt-get install -y apache2
            # Kill Nginx
            systemctl stop nginx 2>/dev/null || true
            systemctl disable nginx 2>/dev/null || true
            
            # Ensure Apache listens on 80
            echo "Listen 80" > /etc/apache2/ports.conf
            if [ -f /etc/apache2/sites-available/000-default.conf ]; then
                sed -i 's/:8080/:80/g' /etc/apache2/sites-available/000-default.conf
            fi
            
            systemctl start apache2
            systemctl enable apache2
            ;;
        3)
            # HYBRID (Nginx Front, Apache Back)
            echo -e "${YELLOW}Configuring Hybrid Stack (Nginx TCP:80 -> Apache TCP:8080)...${NC}"
            apt-get install -y nginx apache2
            
            # 1. Configure Apache to move away from port 80 immediately
            echo "Listen 8080" > /etc/apache2/ports.conf
            
            # Update default vhost to 8080 
            if [ -f /etc/apache2/sites-available/000-default.conf ]; then
                sed -i 's/<VirtualHost.*:80>/<VirtualHost *:8080>/g' /etc/apache2/sites-available/000-default.conf
                sed -i 's/<VirtualHost.*:8080>/<VirtualHost *:8080>/g' /etc/apache2/sites-available/000-default.conf
            fi
            
            # 2. Restart Apache on new port
            systemctl restart apache2
            
            # 3. Start Nginx on Port 80
            systemctl restart nginx
            systemctl enable apache2 nginx
            ;;
        *)
            # NGINX ONLY
            echo -e "${YELLOW}Configuring Nginx Only...${NC}"
            apt-get install -y nginx
            # Kill Apache
            systemctl stop apache2 2>/dev/null || true
            systemctl disable apache2 2>/dev/null || true
            # Prevent Apache from grabbing port 80 even if started accidentally
            if [ -f /etc/apache2/ports.conf ]; then
                echo "Listen 8080" > /etc/apache2/ports.conf
            fi
            
            systemctl start nginx
            systemctl enable nginx
            ;;
    esac
fi

# Save selection for Agent
WEB_STACK_NAME="nginx"
[ "$WEB_STACK_CHOICE" == "2" ] && WEB_STACK_NAME="apache"
[ "$WEB_STACK_CHOICE" == "3" ] && WEB_STACK_NAME="hybrid"

# Clone Yumna Panel
INSTALL_DIR="/opt/yumna-panel"
echo -e "${BLUE}[6/X] Deploying Yumna Panel to $INSTALL_DIR...${NC}"

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

# --- MASTER MODE / WHM ONLY CONFIGURATION ---
if [ "$INSTALL_MODE" == "1" ] || [ "$INSTALL_MODE" == "3" ]; then
    echo -e "${BLUE}=== WHM CORE CONFIGURATION ===${NC}"
    
    # WHM Setup
    cd "$INSTALL_DIR/whm"
    if [ ! -f .env ]; then
        echo -e "${YELLOW}Creating WHM configuration...${NC}"
        if [ -f .env.example ]; then
            cp .env.example .env
        else
            echo "NODE_ENV=production" > .env
            echo "PORT=4000" >> .env
            echo "DB_HOST=localhost" >> .env
            echo "DB_USER=yumna_whm" >> .env
            echo "DB_PASSWORD=yumna_db_password" >> .env
            echo "DB_NAME=yumna_whm" >> .env
            echo "SECRET_KEY=yumna_secret_$(openssl rand -hex 16)" >> .env
            echo "AGENT_SECRET=yumna_secret_agent_$(openssl rand -hex 16)" >> .env
        fi
        
        # Ensure new secrets
        SECRET=$(openssl rand -hex 32)
        AGENT_SECRET=$(openssl rand -hex 32)
        sed -i "s/change_this_to_a_secure_random_string_v3/$SECRET/" .env
        sed -i "s/change_this_shared_secret_for_nodes/$AGENT_SECRET/" .env
        
        CURRENT_AGENT_SECRET=$(grep AGENT_SECRET .env | cut -d '=' -f2)
    fi
    npm install --production

    # Panel Setup (Build) - ONLY FOR MODE 1
    if [ "$INSTALL_MODE" == "1" ]; then
        cd "$INSTALL_DIR/panel"
        echo -e "${YELLOW}Building Frontend Panel...${NC}"
        npm install
        npm run build
    fi

    # Database Setup Wizard - FOR MODE 1 AND 3
    echo -e "${YELLOW}------------------------------------------------${NC}"
    echo -e "${YELLOW} Central Database Configuration Wizard ${NC}"
    echo -e "${YELLOW}------------------------------------------------${NC}"
    
    read -p "Do you want to setup the central database automatically? [Y/n]: " SETUP_DB_CONFIRM
    SETUP_DB_CONFIRM=${SETUP_DB_CONFIRM:-Y}

    if [[ "$SETUP_DB_CONFIRM" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Please enter your Database ROOT password.${NC}"
        read -s -p "MariaDB/MySQL Root Password: " DB_ROOT_PASS
        echo ""

        # Default Values
        DEFAULT_DB_NAME="yumna_whm"
        DEFAULT_DB_USER="yumna_whm"
        DEFAULT_DB_PASS="yumna_db_password"
        
        # Use existing env values if present
        if grep -q "DB_USER" "$INSTALL_DIR/whm/.env"; then
             DEFAULT_DB_USER=$(grep "DB_USER" "$INSTALL_DIR/whm/.env" | cut -d '=' -f2)
             DEFAULT_DB_PASS=$(grep "DB_PASSWORD" "$INSTALL_DIR/whm/.env" | cut -d '=' -f2)
        fi

        SQL="CREATE DATABASE IF NOT EXISTS \`${DEFAULT_DB_NAME}\`;"
        SQL="${SQL} CREATE USER IF NOT EXISTS '${DEFAULT_DB_USER}'@'localhost' IDENTIFIED BY '${DEFAULT_DB_PASS}';"
        SQL="${SQL} GRANT ALL PRIVILEGES ON \`${DEFAULT_DB_NAME}\`.* TO '${DEFAULT_DB_USER}'@'localhost';"
        SQL="${SQL} FLUSH PRIVILEGES;"

        echo -e "${BLUE}Executing Setup...${NC}"
        if [ -z "$DB_ROOT_PASS" ]; then
            mysql -e "$SQL" 2>/dev/null || sudo mysql -e "$SQL" 2>/dev/null
        else
            mysql -u root -p"$DB_ROOT_PASS" -e "$SQL" 2>/dev/null
        fi

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Database setup complete!${NC}"
        else
            echo -e "${RED}Database setup failed. Please configure DB manually.${NC}"
        fi
    fi

    # Install WHM Service
    cp "$INSTALL_DIR/scripts/systemd/yumna-whm.service" /etc/systemd/system/
fi

# --- AGENT SETUP ---
# Only for Mode 1 and 2
if [ "$INSTALL_MODE" != "3" ]; then
    echo -e "${BLUE}=== AGENT CONFIGURATION ===${NC}"
    cd "$INSTALL_DIR/agent"

    # Need to know WHM URL if Worker Mode
    WHM_URL_VAL="http://localhost:4000"
    AGENT_SECRET_VAL="$CURRENT_AGENT_SECRET"

    if [ "$INSTALL_MODE" == "2" ]; then
        echo -e "${YELLOW}Worker Node Setup: We need to connect to your Master Node.${NC}"
        read -p "Enter WHM Master URL (e.g., http://panel.example.com:4000): " INPUT_WHM_URL
        WHM_URL_VAL=${INPUT_WHM_URL:-"http://localhost:4000"}
        
        read -p "Enter Agent Secret (from Master Node .env): " INPUT_AGENT_SECRET
        AGENT_SECRET_VAL=${INPUT_AGENT_SECRET:-"change_me"}
    fi

    if [ ! -f .env ]; then
        echo -e "${YELLOW}Creating Agent configuration...${NC}"
        if [ -f .env.example ]; then
            cp .env.example .env
        else
            echo "NODE_ENV=production" > .env
            echo "PORT=3000" >> .env
        fi
        
        # Update config
        if grep -q "WHM_URL" .env; then
             sed -i "s|WHM_URL=.*|WHM_URL=$WHM_URL_VAL|g" .env
        else
             echo "WHM_URL=$WHM_URL_VAL" >> .env
        fi
        
        if grep -q "AGENT_SECRET" .env; then
              sed -i "s/change_this_shared_secret_for_nodes/$AGENT_SECRET_VAL/" .env
              sed -i "s/^AGENT_SECRET=.*/AGENT_SECRET=$AGENT_SECRET_VAL/" .env
        else
              echo "AGENT_SECRET=$AGENT_SECRET_VAL" >> .env
        fi
        
        # Web Stack
        if grep -q "WEB_SERVER_STACK" .env; then
             sed -i "s/WEB_SERVER_STACK=.*/WEB_SERVER_STACK=$WEB_STACK_NAME/" .env
        else
             echo "WEB_SERVER_STACK=$WEB_STACK_NAME" >> .env
        fi
    fi
    npm install --production

    # Install Agent Service
    cp "$INSTALL_DIR/scripts/systemd/yumna-agent.service" /etc/systemd/system/
    systemctl enable yumna-agent
    systemctl start yumna-agent
fi

# --- FINISHING ---
# Service enable
systemctl daemon-reload

if [ "$INSTALL_MODE" == "1" ] || [ "$INSTALL_MODE" == "3" ]; then
    systemctl enable yumna-whm
    systemctl start yumna-whm
fi

# Firewall
if [ "$INSTALL_MODE" == "3" ]; then
    ufw allow 4000/tcp # WHM API
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
elif [ "$INSTALL_MODE" != "3" ]; then
    ufw allow 22/tcp
    ufw allow 3000/tcp # Agent
    ufw allow 80/tcp
    ufw allow 443/tcp
    if [ "$INSTALL_MODE" == "1" ]; then
        ufw allow 4000/tcp # WHM in Master mode
    fi
    ufw --force enable
fi

# Summary
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}    INSTALLATION COMPLETE! 🎊       ${NC}"
echo -e "${GREEN}=====================================${NC}"

if [ "$INSTALL_MODE" == "1" ]; then
    PUBLIC_IP=$(curl -s ifconfig.me)
    echo -e "Mode:      MASTER NODE (Full Panel)"
    echo -e "WHM URL:   http://$PUBLIC_IP:4000"
    echo -e "Panel URL: http://$PUBLIC_IP"
    echo -e "Agent:     Running locally on port 3000"
    echo -e "Secret:    $(grep AGENT_SECRET $INSTALL_DIR/whm/.env | cut -d '=' -f2)"
elif [ "$INSTALL_MODE" == "2" ]; then
    echo -e "Mode:      WORKER NODE (Agent Only)"
    echo -e "Agent:     Running on port 3000"
    echo -e "Connected: $WHM_URL_VAL"
else
    PUBLIC_IP=$(curl -s ifconfig.me)
    echo -e "Mode:      WHM CORE ONLY"
    echo -e "WHM API:   http://$PUBLIC_IP:4000"
    echo -e "Agent:     DISABLED"
    echo -e "Secret:    $(grep AGENT_SECRET $INSTALL_DIR/whm/.env | cut -d '=' -f2)"
fi

echo ""
echo -e "${YELLOW}Please restart your session if needed.${NC}"
