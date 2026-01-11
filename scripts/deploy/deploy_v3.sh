#!/bin/bash

# Yumna Panel v3.0 - Universal Deployment Script
# Supports:
# - Debian Family: Ubuntu 20.04+, Debian 11+
# - RHEL Family: CentOS 9, AlmaLinux 9, Rocky Linux 9
# - Arch Linux: Manjaro, Arch
# - FreeBSD: 13.x, 14.x
# - macOS: Monterey, Ventura, Sonoma (Apple Silicon/Intel)
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
OS_TYPE="linux"
SUDO_USER=${SUDO_USER:-$USER}

if [ "$(uname)" == "Darwin" ]; then
    OS="macOS"
    OS_TYPE="mac"
    PM="brew"
    HTTPD_PKG="httpd"
    HTTPD_SVC="httpd"
    DB_PKG="mariadb"
    NODE_SETUP=""
    BUILD_TOOLS="" # Xcode CLI assumed
    
    # helper for brew as non-root
    brew_install() {
        echo -e "${YELLOW}Installing $1 via Homebrew...${NC}"
        sudo -u $SUDO_USER brew install $1
    }
elif [ "$(uname)" == "FreeBSD" ]; then
    OS="FreeBSD"
    OS_TYPE="bsd"
    PM="pkg"
    HTTPD_PKG="apache24"
    HTTPD_SVC="apache24"
    DB_PKG="mariadb1011-server mariadb1011-client"
    NODE_SETUP=""
    BUILD_TOOLS="gmake gcc"
elif [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
    ID=$ID
    ID_LIKE=$ID_LIKE
    
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
    elif [[ "$ID" =~ (arch|manjaro) ]] || [[ "$ID_LIKE" =~ (arch) ]]; then
        PM="pacman"
        HTTPD_PKG="apache"
        HTTPD_SVC="httpd"
        DB_PKG="mariadb"
        NODE_SETUP=""
        BUILD_TOOLS="base-devel"
    fi
fi

if [ "$PM" == "unknown" ]; then
    echo -e "${RED}Unsupported OS. We support Linux, FreeBSD & macOS.${NC}"
    exit 1
fi

echo -e "${YELLOW}Detected OS: $OS ($PM)${NC}"

# --- SYSTEM UPDATE ---
echo -e "${BLUE}[1/X] Updating System...${NC}"
case $PM in
    apt)
        apt-get update -y && apt-get upgrade -y
        apt-get install -y curl wget git unzip zip htop software-properties-common ufw acl $BUILD_TOOLS python3-certbot-nginx
        ;;
    dnf)
        dnf update -y
        dnf install -y curl wget git unzip zip htop firewalld policycoreutils-python-utils $BUILD_TOOLS certbot python3-certbot-nginx
        ;;
    pacman)
        pacman -Syu --noconfirm
        pacman -S --noconfirm curl wget git unzip zip htop ufw $BUILD_TOOLS certbot-nginx
        ;;
    pkg)
        pkg update && pkg upgrade -y
        pkg install -y curl wget git unzip zip htop bash gsed $BUILD_TOOLS py39-certbot-nginx
        ;;
    brew)
        if ! command -v brew &> /dev/null; then
             echo -e "${RED}Homebrew not found. Please install Homebrew first.${NC}"
             exit 1
        fi
        echo "Updating Homebrew..."
        sudo -u $SUDO_USER brew update
        brew_install "wget git unzip htop node gnu-sed"
        # Ensure gsed is available
        export PATH="/usr/local/opt/gnu-sed/libexec/gnubin:$PATH"
        export PATH="/opt/homebrew/opt/gnu-sed/libexec/gnubin:$PATH"
        ;;
esac

# --- NODE.JS ---
echo -e "${BLUE}[2/X] Installing Node.js LTS...${NC}"
if ! command -v node &> /dev/null; then
    if [ -n "$NODE_SETUP" ]; then eval "$NODE_SETUP"; fi
    case $PM in
        apt) apt-get install -y nodejs ;;
        dnf) dnf install -y nodejs ;;
        pacman) pacman -S --noconfirm nodejs npm ;;
        pkg) pkg install -y node20 npm ;;
        brew) echo "Node.js installed via brew above." ;;
    esac
else
    echo "Node.js $(node -v) is already installed."
fi

# --- DATABASE ---
echo -e "${BLUE}[3/X] Installing Database...${NC}"
case $PM in
    apt|dnf)
        if [ "$PM" == "apt" ]; then apt-get install -y $DB_PKG; else dnf install -y $DB_PKG; fi
        systemctl start mariadb || systemctl start mysql
        systemctl enable mariadb || systemctl enable mysql
        ;;
    pacman)
        pacman -S --noconfirm $DB_PKG
        mariadb-install-db --user=mysql --basedir=/usr --datadir=/var/lib/mysql
        systemctl start mariadb
        systemctl enable mariadb
        ;;
    pkg)
        pkg install -y $DB_PKG
        sysrc mysql_enable="YES"
        service mysql-server start
        ;;
    brew)
        brew_install mariadb
        sudo brew services start mariadb
        ;;
esac

# --- MODE SELECTION ---
echo -e "${YELLOW}------------------------------------------------${NC}"
echo -e "${YELLOW} Installation Mode Selection ${NC}"
echo -e "${YELLOW}------------------------------------------------${NC}"
echo "1) Full Control Panel (Master Node)"
echo "2) Worker Node Only (Agent)"
echo "3) WHM Core Only (API)"
read -p "Enter Choice [1-3]: " INSTALL_MODE
INSTALL_MODE=${INSTALL_MODE:-1}

# --- WEB STACK SELECTION ---
WEB_STACK_CHOICE=1
if [ "$INSTALL_MODE" != "3" ]; then
    echo -e "${YELLOW}Select Web Server Stack:${NC}"
    echo "1) Nginx Only (Default)"
    echo "2) Apache Only"
    echo "3) Hybrid (Nginx + Apache)"
    read -p "Enter choice [1-3]: " WEB_STACK_CHOICE
    WEB_STACK_CHOICE=${WEB_STACK_CHOICE:-1}
fi

# --- WEB SERVER INSTALL FUNCTIONS ---
install_nginx() {
    case $PM in
        apt) apt-get install -y nginx ;;
        dnf) dnf install -y nginx ;;
        pacman) pacman -S --noconfirm nginx ;;
        pkg) pkg install -y nginx; sysrc nginx_enable="YES" ;;
        brew) brew_install nginx; sudo brew services start nginx ;;
    esac
    if [ "$PM" != "pkg" ] && [ "$PM" != "brew" ]; then systemctl enable --now nginx; elif [ "$PM" == "pkg" ]; then service nginx start; fi
}
install_apache() {
    case $PM in
        apt) apt-get install -y $HTTPD_PKG ;;
        dnf) dnf install -y $HTTPD_PKG ;;
        pacman) pacman -S --noconfirm $HTTPD_PKG ;;
        pkg) pkg install -y $HTTPD_PKG; sysrc apache24_enable="YES" ;;
        brew) brew_install httpd; sudo brew services start httpd ;;
    esac
    if [ "$PM" != "pkg" ] && [ "$PM" != "brew" ]; then systemctl enable --now $HTTPD_SVC; elif [ "$PM" == "pkg" ]; then service $HTTPD_SVC start; fi
}
disable_apache() {
    if [ "$PM" == "brew" ]; then
        sudo brew services stop $HTTPD_SVC 2>/dev/null || true
    elif [ "$PM" != "pkg" ]; then
        systemctl disable --now $HTTPD_SVC 2>/dev/null || true
    else
        service $HTTPD_SVC stop 2>/dev/null || true; sysrc ${HTTPD_SVC}_enable="NO"
    fi
}
disable_nginx() {
    if [ "$PM" == "brew" ]; then
         sudo brew services stop nginx 2>/dev/null || true
    elif [ "$PM" != "pkg" ]; then
        systemctl disable --now nginx 2>/dev/null || true
    else
        service nginx stop 2>/dev/null || true; sysrc nginx_enable="NO"
    fi
}

# --- WEB SERVER INSTALL ---
echo -e "${BLUE}[4/X] Installing Web Server...${NC}"
if [ "$INSTALL_MODE" == "3" ]; then
    install_nginx
    disable_apache
else
    case $WEB_STACK_CHOICE in
        2) # Apache
            install_apache
            disable_nginx
            if [ "$PM" == "apt" ]; then
                echo "Listen 80" > /etc/apache2/ports.conf
                sed -i 's/:8080/:80/g' /etc/apache2/sites-available/000-default.conf 2>/dev/null || true
                systemctl reload apache2
            elif [ "$PM" == "brew" ]; then
                # Homebrew Apache conf usually /usr/local/etc/httpd/httpd.conf
                CONF_PATH=$(find /usr/local/etc /opt/homebrew/etc -name httpd.conf 2>/dev/null | head -n 1)
                gsed -i 's/Listen 8080/Listen 80/g' "$CONF_PATH" 2>/dev/null || true
                sudo brew services restart httpd
            elif [ "$PM" != "pkg" ]; then 
                sed -i 's/Listen 8080/Listen 80/g' /etc/$HTTPD_SVC/conf/httpd.conf 2>/dev/null || true
                systemctl restart $HTTPD_SVC
            fi
            ;;
        3) # Hybrid
            install_nginx
            install_apache
            if [ "$PM" == "apt" ]; then
                echo "Listen 8080" > /etc/apache2/ports.conf
                sed -i 's/:80/:8080/g' /etc/apache2/sites-available/000-default.conf 2>/dev/null || true
                systemctl restart apache2
            elif [ "$PM" == "brew" ]; then
                CONF_PATH=$(find /usr/local/etc /opt/homebrew/etc -name httpd.conf 2>/dev/null | head -n 1)
                gsed -i 's/Listen 80/Listen 8080/g' "$CONF_PATH" 2>/dev/null || true
                sudo brew services restart httpd
                sudo brew services restart nginx
            elif [ "$PM" != "pkg" ]; then
                sed -i 's/Listen 80/Listen 8080/g' /etc/$HTTPD_SVC/conf/httpd.conf 2>/dev/null || true
                systemctl restart $HTTPD_SVC
                systemctl restart nginx
            fi
            ;;
        *) # Nginx
            install_nginx
            disable_apache
            if [ "$PM" == "apt" ]; then
                 echo "Listen 8080" > /etc/apache2/ports.conf
            elif [ "$PM" != "pkg" ]; then
                 [ -f /etc/$HTTPD_SVC/conf/httpd.conf ] && sed -i 's/Listen 80/Listen 8080/g' /etc/$HTTPD_SVC/conf/httpd.conf 2>/dev/null || true
            fi
            ;;
    esac
fi

WEB_STACK_NAME="nginx"
[ "$WEB_STACK_CHOICE" == "2" ] && WEB_STACK_NAME="apache"
[ "$WEB_STACK_CHOICE" == "3" ] && WEB_STACK_NAME="hybrid"

# --- DEPLOY ---
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
    mkdir -p /opt
    # Check permissions for /opt on Mac, might need chown
    if [ "$PM" == "brew" ]; then chown -R $SUDO_USER /opt/yumna-panel 2>/dev/null; fi
    git clone https://github.com/ycopyer/yumna-panel.git "$INSTALL_DIR"
fi

# --- MASTER CONFIG ---
if [ "$INSTALL_MODE" == "1" ] || [ "$INSTALL_MODE" == "3" ]; then
    echo -e "${BLUE}=== MASTER SETUP ===${NC}"
    cd "$INSTALL_DIR/whm"
    if [ ! -f .env ]; then
        [ -f .env.example ] && cp .env.example .env
        [ ! -f .env ] && echo "NODE_ENV=production" > .env
        S1=$(openssl rand -hex 32); S2=$(openssl rand -hex 32)
        gsed -i "s/change_this_to_a_secure_random_string_v3/$S1/" .env 2>/dev/null || sed -i "s/change_this_to_a_secure_random_string_v3/$S1/" .env
        gsed -i "s/change_this_shared_secret_for_nodes/$S2/" .env 2>/dev/null || sed -i "s/change_this_shared_secret_for_nodes/$S2/" .env
        CURRENT_AGENT_SECRET=$(grep AGENT_SECRET .env | cut -d '=' -f2)
    fi
    npm install --production

    if [ "$INSTALL_MODE" == "1" ]; then
        cd "$INSTALL_DIR/panel"
        npm install && npm run build
    fi

    # DB Config
    echo -e "${YELLOW}Setting up Database...${NC}"
    mysql -e "CREATE DATABASE IF NOT EXISTS yumna_whm;" 2>/dev/null || sudo mysql -e "CREATE DATABASE IF NOT EXISTS yumna_whm;" 2>/dev/null
    
    if [ "$PM" != "pkg" ] && [ "$PM" != "brew" ]; then
        cp "$INSTALL_DIR/scripts/systemd/yumna-whm.service" /etc/systemd/system/
    fi
fi

# --- AGENT CONFIG ---
if [ "$INSTALL_MODE" != "3" ]; then
    echo -e "${BLUE}=== AGENT SETUP ===${NC}"
    cd "$INSTALL_DIR/agent"
    
    WHM_URL="http://localhost:4000"
    if [ "$INSTALL_MODE" == "2" ]; then
        read -p "Enter WHM URL: " WHM_URL
    fi
    
    if [ ! -f .env ]; then
        [ -f .env.example ] && cp .env.example .env
        [ ! -f .env ] && echo "NODE_ENV=production" > .env && echo "PORT=3000" >> .env
        
        S=${CURRENT_AGENT_SECRET:-"change_me"}
        if [ "$INSTALL_MODE" == "2" ]; then
             read -p "Enter Agent Secret: " INP
             S=${INP:-$S}
        fi
        
        # Portable sed 
        SED_CMD="sed -i"
        if command -v gsed &> /dev/null; then SED_CMD="gsed -i"; fi

        $SED_CMD "s|WHM_URL=.*|WHM_URL=$WHM_URL|g" .env
        $SED_CMD "s/change_this_shared_secret_for_nodes/$S/" .env
        $SED_CMD "s/^AGENT_SECRET=.*/AGENT_SECRET=$S/" .env
        
        if grep -q "WEB_SERVER_STACK" .env; then
            $SED_CMD "s/WEB_SERVER_STACK=.*/WEB_SERVER_STACK=$WEB_STACK_NAME/" .env
        else
            echo "WEB_SERVER_STACK=$WEB_STACK_NAME" >> .env
        fi
    fi
    npm install --production
    
    if [ "$PM" != "pkg" ] && [ "$PM" != "brew" ]; then
        cp "$INSTALL_DIR/scripts/systemd/yumna-agent.service" /etc/systemd/system/
    fi
fi

# --- FINISHING ---
if [ "$PM" != "pkg" ] && [ "$PM" != "brew" ]; then
    systemctl daemon-reload
    [ "$INSTALL_MODE" != "2" ] && systemctl enable --now yumna-whm
    [ "$INSTALL_MODE" != "3" ] && systemctl enable --now yumna-agent
    
    # Firewall (Linux)
    if command -v ufw &> /dev/null; then
        ufw allow 22/tcp; ufw allow 80/tcp; ufw allow 443/tcp; ufw allow 3000/tcp
        [ "$INSTALL_MODE" != "2" ] && ufw allow 4000/tcp
        ufw --force enable
    elif command -v firewall-cmd &> /dev/null; then
        systemctl enable --now firewalld
        firewall-cmd --permanent --add-service=http; firewall-cmd --permanent --add-service=https
        firewall-cmd --permanent --add-port=3000/tcp; [ "$INSTALL_MODE" != "2" ] && firewall-cmd --permanent --add-port=4000/tcp
        firewall-cmd --reload
    fi
else
    echo -e "${YELLOW}Non-Systemd OS Detected ($OS).${NC}"
    echo -e "Please run services manually (e.g., 'npm start' inside whm/agent folders) or use 'pm2'."
    echo -e "If MacOS using Brew Services, nginx/httpd/mariadb are already started."
fi

echo -e "${GREEN}Installation Complete!${NC}"
