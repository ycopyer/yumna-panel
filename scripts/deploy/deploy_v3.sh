#!/bin/bash

# ====================================================
#   YUMNA PANEL V3 - UNIFIED DEPLOYMENT SCRIPT
# ====================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' 

echo -e "${BLUE}====================================================${NC}"
echo -e "${GREEN}🚀 Memulai Deployment Yumna Panel v3.0...${NC}"
echo -e "${BLUE}====================================================${NC}"

# Check for root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Harap jalankan sebagai root (sudo).${NC}"
  exit 1
fi

# 1. Update and Install Core Dependencies
echo -e "${YELLOW}[1/6] Memasang dependensi sistem...${NC}"
apt-get update && apt-get install -y \
    curl git unzip build-essential \
    mariadb-server nginx \
    openssh-server ufw

# Install Node.js 20
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# 2. Setup Yumna Directory
INSTALL_DIR="/opt/yumnapanel"
echo -e "${YELLOW}[2/6] Menyiapkan direktori di $INSTALL_DIR...${NC}"
mkdir -p $INSTALL_DIR
cp -r . $INSTALL_DIR
cd $INSTALL_DIR

# 3. Install NPM dependencies
echo -e "${YELLOW}[3/6] Memasang dependensi Node.js (WHM, Agent, Panel)...${NC}"
(cd whm && npm install)
(cd agent && npm install)
(cd panel && npm install)

# 4. Build Panel (Frontend)
echo -e "${YELLOW}[4/6] Membangun Panel Frontend...${NC}"
(cd panel && npm run build)

# 5. Setup Systemd Services
echo -e "${YELLOW}[5/6] Mengonfigurasi Layanan Systemd...${NC}"
cp deployment/systemd/yumna-whm.service /etc/systemd/system/
cp deployment/systemd/yumna-agent.service /etc/systemd/system/

systemctl daemon-reload
systemctl enable yumna-whm
systemctl enable yumna-agent
systemctl start yumna-whm
systemctl start yumna-agent

# 6. Configure Nginx for Panel
echo -e "${YELLOW}[6/6] Mengonfigurasi Web Server (Nginx)...${NC}"
NGINX_CONF="/etc/nginx/sites-available/yumna-panel"
cat > $NGINX_CONF <<EOF
server {
    listen 80;
    server_name _;

    root $INSTALL_DIR/panel/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# 7. Initialize Database
echo -e "${YELLOW}Inisialisasi Database...${NC}"
mysql -e "CREATE DATABASE IF NOT EXISTS yumna_v3;"
# Run WHM migration
cd whm && node -e "require('./src/migrations/init_v3')().then(() => process.exit(0))"

echo -e "${GREEN}====================================================${NC}"
echo -e "${GREEN}✅ YUMNA PANEL V3 BERHASIL TERINSTAL!${NC}"
echo -e "Akses Panel: http://$(hostname -I | awk '{print $1}')${NC}"
echo -e "${BLUE}====================================================${NC}"
