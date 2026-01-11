#!/bin/bash

# Yumna Panel v3.0 - Universal Deployment Script
# Supports: 
# - Debian Family: Ubuntu 20.04+, Debian 11+
# - RHEL Family: CentOS 9 Stream, AlmaLinux 9, Rocky Linux 9
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
echo -e "${GREEN}Yumna Panel v3.0 - Universal Installer${NC}"
echo "------------------------------------------------"

# Check Root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Please run as root (sudo)${NC}"
  exit 1
fi

# --- OS DETECTION ---
PM="unknown"
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
    ID=$ID
    ID_LIKE=$ID_LIKE
fi

echo -e "${YELLOW}Detected OS: $OS $VER ($ID)${NC}"

if [[ "$ID" =~ (ubuntu|debian) ]] || [[ "$ID_LIKE" =~ (ubuntu|debian) ]]; then
    PM="apt"
    HTTPD_PKG="apache2"
    HTTPD_SVC="apache2"
    DB_PKG="mariadb-server"
    NODE_SETUP="curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
    BUILD_TOOLS="build-essential"
elif [[ "$ID" =~ (centos|rhel|fedora|almalinux|rocky) ]] || [[ "$ID_LIKE" =~ (rhel|fedora) ]]; then
    PM="dnf"
    HTTPD_PKG="httpd"
    HTTPD_SVC="httpd"
    DB_PKG="mariadb-server"
    NODE_SETUP="curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -"
    BUILD_TOOLS="gcc-c++ make"
else
    echo -e "${RED}Unsupported OS Family. We support Debian/Ubuntu & RHEL/CentOS/Rocky.${NC}"
    exit 1
fi

echo -e "${BLUE}Package Manager: $PM${NC}"

# --- SYSTEM UPDATE ---
echo -e "${BLUE}[1/X] Updating System...${NC}"
if [ "$PM" == "apt" ]; then
    apt-get update -y && apt-get upgrade -y
    apt-get install -y curl wget git unzip zip htop software-properties-common ufw acl $BUILD_TOOLS python3-certbot-nginx
else
    dnf update -y
    dnf install -y curl wget git unzip zip htop firewalld policycoreutils-python-utils $BUILD_TOOLS certbot python3-certbot-nginx
fi

# --- NODE.JS ---
echo -e "${BLUE}[2/X] Installing Node.js LTS...${NC}"
if ! command -v node &> /dev/null; then
    eval "$NODE_SETUP"
    if [ "$PM" == "apt" ]; then
        apt-get install -y nodejs
    else
        dnf install -y nodejs
    fi
else
    echo "Node.js $(node -v) is already installed."
fi

# --- DATABASE ---
echo -e "${BLUE}[3/X] Installing Database...${NC}"
if [ "$PM" == "apt" ]; then
    apt-get install -y $DB_PKG
else
    dnf install -y $DB_PKG
fi
systemctl start mariadb || systemctl start mysql
systemctl enable mariadb || systemctl enable mysql

# --- MODE SELECTION ---
echo -e "${YELLOW}------------------------------------------------${NC}"
echo -e "${YELLOW} Installation Mode Selection ${NC}"
echo -e "${YELLOW}------------------------------------------------${NC}"
echo "1) Full Control Panel (Master Node: WHM + Panel + Local Agent)"
echo "2) Worker Node Only (Hosting Server: Agent Only)"
echo "3) WHM Core Only (API Control Plane & Database)"
read -p "Enter Choice [1-3]: " INSTALL_MODE
INSTALL_MODE=${INSTALL_MODE:-1}

# --- WEB STACK SELECTION ---
WEB_STACK_CHOICE=1
if [ "$INSTALL_MODE" != "3" ]; then
    echo -e "${YELLOW}Select Web Server Stack for Hosting:${NC}"
    echo "1) Nginx Only (High Performance, Default)"
    echo "2) Apache Only (Classic, .htaccess support)"
    echo "3) Hybrid (Nginx Frontend + Apache Backend)"
    read -p "Enter choice [1-3]: " WEB_STACK_CHOICE
    WEB_STACK_CHOICE=${WEB_STACK_CHOICE:-1}
fi

# --- WEB SERVER INSTALLATION ---
echo -e "${BLUE}[4/X] Installing Web Server...${NC}"

install_nginx() {
    if [ "$PM" == "apt" ]; then apt-get install -y nginx; else dnf install -y nginx; fi
    systemctl start nginx
    systemctl enable nginx
}

install_apache() {
    if [ "$PM" == "apt" ]; then apt-get install -y $HTTPD_PKG; else dnf install -y $HTTPD_PKG; fi
    systemctl start $HTTPD_SVC
    systemctl enable $HTTPD_SVC
}

disable_apache() {
    systemctl stop $HTTPD_SVC 2>/dev/null || true
    systemctl disable $HTTPD_SVC 2>/dev/null || true
}

disable_nginx() {
    systemctl stop nginx 2>/dev/null || true
    systemctl disable nginx 2>/dev/null || true
}

if [ "$INSTALL_MODE" == "3" ]; then
    # WHM Only -> Nginx Proxy
    install_nginx
    disable_apache
else
    case $WEB_STACK_CHOICE in
        2) # Apache Only
            install_apache
            disable_nginx
            # Config Port 80
            if [ "$PM" == "apt" ]; then
                echo "Listen 80" > /etc/apache2/ports.conf
                sed -i 's/:8080/:80/g' /etc/apache2/sites-available/000-default.conf 2>/dev/null || true
                systemctl reload apache2
            else
                # RHEL httpd.conf check
                sed -i 's/Listen 8080/Listen 80/g' /etc/httpd/conf/httpd.conf
                systemctl restart httpd
            fi
            ;;
        3) # Hybrid
            install_nginx # Front
            install_apache # Back
            
            # Move Apache to 8080
            if [ "$PM" == "apt" ]; then
                echo "Listen 8080" > /etc/apache2/ports.conf
                sed -i 's/:80/:8080/g' /etc/apache2/sites-available/000-default.conf 2>/dev/null || true
                systemctl restart apache2
            else
                sed -i 's/Listen 80/Listen 8080/g' /etc/httpd/conf/httpd.conf
                systemctl restart httpd
            fi
            
            systemctl restart nginx
            ;;
        *) # Nginx Only
            install_nginx
            disable_apache
            # Prevent conflict hooks
            if [ "$PM" == "apt" ]; then
                 echo "Listen 8080" > /etc/apache2/ports.conf
            else
                 sed -i 's/Listen 80/Listen 8080/g' /etc/httpd/conf/httpd.conf 2>/dev/null || true
            fi
            ;;
    esac
fi

# Save selection
WEB_STACK_NAME="nginx"
[ "$WEB_STACK_CHOICE" == "2" ] && WEB_STACK_NAME="apache"
[ "$WEB_STACK_CHOICE" == "3" ] && WEB_STACK_NAME="hybrid"

# --- DEPLOY YUMNA PANEL ---
INSTALL_DIR="/opt/yumna-panel"
echo -e "${BLUE}[5/X] Deploying to $INSTALL_DIR...${NC}"

if [ -d "$INSTALL_DIR" ]; then
    if [ -d "$INSTALL_DIR/.git" ]; then
        cd "$INSTALL_DIR"; git pull
    else
        mv "$INSTALL_DIR" "${INSTALL_DIR}_backup_$(date +%s)"
        git clone https://github.com/ycopyer/yumna-panel.git "$INSTALL_DIR"
    fi
else
    git clone https://github.com/ycopyer/yumna-panel.git "$INSTALL_DIR"
fi

# --- MASTER CONFIG ---
if [ "$INSTALL_MODE" == "1" ] || [ "$INSTALL_MODE" == "3" ]; then
    echo -e "${BLUE}=== MASTER SETUP ===${NC}"
    cd "$INSTALL_DIR/whm"
    
    # Env Setup (Simplified)
    if [ ! -f .env ]; then
        [ -f .env.example ] && cp .env.example .env
        [ ! -f .env ] && echo "NODE_ENV=production" > .env
        
        # Secrets
        S1=$(openssl rand -hex 32); S2=$(openssl rand -hex 32)
        sed -i "s/change_this_to_a_secure_random_string_v3/$S1/" .env
        sed -i "s/change_this_shared_secret_for_nodes/$S2/" .env
        CURRENT_AGENT_SECRET=$(grep AGENT_SECRET .env | cut -d '=' -f2)
    fi
    npm install --production

    if [ "$INSTALL_MODE" == "1" ]; then
        cd "$INSTALL_DIR/panel"
        echo -e "${YELLOW}Building Panel...${NC}"
        npm install && npm run build
    fi

    # --- Database Setup Wizard ---
    echo -e "${YELLOW}------------------------------------------------${NC}"
    echo -e "${YELLOW} Central Database Configuration Wizard ${NC}"
    echo -e "${YELLOW}------------------------------------------------${NC}"
    
    read -p "Do you want to setup the central database automatically? [Y/n]: " SETUP_DB_CONFIRM
    SETUP_DB_CONFIRM=${SETUP_DB_CONFIRM:-Y}

    if [[ "$SETUP_DB_CONFIRM" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Please enter your Database ROOT password.${NC}"
        echo "If fresh install (no password), press ENTER."
        read -s -p "MariaDB/MySQL Root Password: " DB_ROOT_PASS
        echo ""

        # Default Values
        DEFAULT_DB_NAME="yumna_whm"
        DEFAULT_DB_USER="yumna_whm"
        DEFAULT_DB_PASS="yumna_db_password"
        
        # Use existing env values if present
        if [ -f "$INSTALL_DIR/whm/.env" ]; then
             if grep -q "DB_USER" "$INSTALL_DIR/whm/.env"; then
                 DEFAULT_DB_USER=$(grep "DB_USER" "$INSTALL_DIR/whm/.env" | cut -d '=' -f2)
                 DEFAULT_DB_PASS=$(grep "DB_PASSWORD" "$INSTALL_DIR/whm/.env" | cut -d '=' -f2)
             fi
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
            echo -e "${RED}Database setup warning: Could not auto-create DB.${NC}"
            echo "Please run manually: $SQL"
        fi
    fi
    
    cp "$INSTALL_DIR/scripts/systemd/yumna-whm.service" /etc/systemd/system/
fi

# --- AGENT CONFIG ---
if [ "$INSTALL_MODE" != "3" ]; then
    echo -e "${BLUE}=== AGENT SETUP ===${NC}"
    cd "$INSTALL_DIR/agent"
    
    WHM_URL="http://localhost:4000" 
    if [ "$INSTALL_MODE" == "2" ]; then
        echo -e "${YELLOW}Worker Node Setup: Connecting to Master...${NC}"
        read -p "Enter Master WHM URL (e.g. http://panel.domain.com:4000): " INPUT_URL
        WHM_URL=${INPUT_URL:-$WHM_URL}
    fi

    if [ ! -f .env ]; then
        echo -e "${YELLOW}Creating Agent configuration...${NC}"
        [ -f .env.example ] && cp .env.example .env
        [ ! -f .env ] && echo "NODE_ENV=production" > .env && echo "PORT=3000" >> .env
        
        # Determine Secret
        AGENT_SECRET_VAL=${CURRENT_AGENT_SECRET:-"change_me"}
        if [ "$INSTALL_MODE" == "2" ]; then
             read -p "Enter Agent Secret (from Master): " INPUT_S
             AGENT_SECRET_VAL=${INPUT_S:-$AGENT_SECRET_VAL}
        fi

        # Update WHM URL
        if grep -q "WHM_URL" .env; then
             sed -i "s|WHM_URL=.*|WHM_URL=$WHM_URL|g" .env
        else
             echo "WHM_URL=$WHM_URL" >> .env
        fi
        
        # Update Secret
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
    cp "$INSTALL_DIR/scripts/systemd/yumna-agent.service" /etc/systemd/system/
fi

# --- FIREWALL ---
echo -e "${BLUE}Configuring Firewall ($PM)...${NC}"
if [ "$PM" == "apt" ]; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 3000/tcp
    [ "$INSTALL_MODE" != "2" ] && ufw allow 4000/tcp
    ufw --force enable
else
    # Firewalld for RHEL
    systemctl start firewalld
    systemctl enable firewalld
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --permanent --add-port=3000/tcp
    [ "$INSTALL_MODE" != "2" ] && firewall-cmd --permanent --add-port=4000/tcp
    firewall-cmd --reload
fi

systemctl daemon-reload
[ "$INSTALL_MODE" != "2" ] && systemctl start yumna-whm
[ "$INSTALL_MODE" != "3" ] && systemctl start yumna-agent

echo -e "${GREEN}Installation Complete!${NC}"
