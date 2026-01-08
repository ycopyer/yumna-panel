#!/bin/bash

# ====================================================
#   YUMNA PANEL - LINUX PRODUCTION DEPLOYMENT SCRIPT
# ====================================================

# Warna untuk output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================${NC}"
echo -e "${GREEN}🚀 Memulai Deployment Produksi Yumna Panel...${NC}"
echo -e "${BLUE}====================================================${NC}"

# 1. Deteksi Instalasi
echo -e "${YELLOW}Mengecek komponen sistem...${NC}"
NODE_OK=$(command -v node &> /dev/null && echo "TERPASANG" || echo "BELUM ADA")
MARIA_OK=$(command -v mariadb &> /dev/null && echo "TERPASANG" || echo "BELUM ADA")
NGINX_OK=$(command -v nginx &> /dev/null && echo "TERPASANG" || echo "BELUM ADA")
APACHE_OK=$(command -v apache2 &> /dev/null && echo "TERPASANG" || echo "BELUM ADA")
PHP_OK=$(command -v php &> /dev/null && echo "TERPASANG" || echo "BELUM ADA")

echo -e "  - Node.js: $NODE_OK"
echo -e "  - MariaDB: $MARIA_OK"
echo -e "  - Nginx:   $NGINX_OK"
echo -e "  - Apache:  $APACHE_OK"
echo -e "  - PHP:     $PHP_OK"
echo -e "${BLUE}====================================================${NC}"

# Automatic Skip Logic
AUTO_SKIP=false
if [ "$NODE_OK" == "TERPASANG" ] && [ "$MARIA_OK" == "TERPASANG" ] && ([ "$NGINX_OK" == "TERPASANG" ] || [ "$APACHE_OK" == "TERPASANG" ]); then
    AUTO_SKIP=true
fi

if [ "$AUTO_SKIP" == "true" ]; then
    echo -e "${GREEN}[INFO] Komponen terdeteksi. Merestart layanan...${NC}"
    
    # 1. Start MariaDB
    echo -e "${BLUE}Merestart MariaDB...${NC}"
    sudo systemctl restart mariadb
    
    # 2. Start Web Server
    if [ "$NGINX_OK" == "TERPASANG" ]; then
        echo -e "${BLUE}Merestart Nginx...${NC}"
        sudo systemctl restart nginx
        WS_CHOICE=1
    else
        echo -e "${BLUE}Merestart Apache2...${NC}"
        sudo systemctl restart apache2
        WS_CHOICE=2
    fi
    
    # Skip deps and build, jump to PM2
    SKIP_DEPS=Y
    SKIP_BUILD=Y
    goto_pm2=true
else
    read -p "Lompati instalasi paket sistem & PHP Bundle? [Y/n]: " SKIP_DEPS
    SKIP_DEPS=${SKIP_DEPS:-Y}
fi

if [[ "$SKIP_DEPS" =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Menlewati instalasi dependensi...${NC}"
    # Tetap harus pilih Web Server untuk konfigurasi Nginx/Apache nanti
    if [ "$NGINX_OK" == "TERPASANG" ]; then WS_CHOICE=1; 
    elif [ "$APACHE_OK" == "TERPASANG" ]; then WS_CHOICE=2; 
    else
        echo -e "${YELLOW}Pilih Web Server untuk konfigurasi:${NC}"
        echo -e "1) Nginx"
        echo -e "2) Apache2"
        read -p "Pilihan [1-2]: " WS_CHOICE
    fi
else
    # 1. Update System
    echo -e "${YELLOW}[1/8] Memperbarui paket sistem...${NC}"
    sudo apt-get update -y

    # 2. Pilih Web Server
    echo -e "${BLUE}====================================================${NC}"
    echo -e "${YELLOW}Pilih Web Server yang ingin digunakan:${NC}"
    echo -e "1) Nginx (Direkomendasikan)"
    echo -e "2) Apache2"
    read -p "Masukkan pilihan [1-2]: " WS_CHOICE
    echo -e "${BLUE}====================================================${NC}"
fi

# Skip building frontend/backend if requested (Only ask if not auto-skipped)
if [ "$AUTO_SKIP" == "false" ]; then
    read -p "Lompati proses Build Frontend & npm install? [y/N]: " SKIP_BUILD
    SKIP_BUILD=${SKIP_BUILD:-N}
fi

if [[ "$SKIP_DEPS" =~ ^[Nn]$ ]]; then

# 3. Cek & Instal Core Dependencies (Node.js, MariaDB, WebServer, PHP Bundle)
echo -e "${YELLOW}[2/8] Memasang dependensi inti & PHP Bundle (5.6 - 8.4)...${NC}"

# Add Ondrej PHP PPA (Required for multi-version PHP on Ubuntu/Debian)
echo -e "${BLUE}Menambahkan repository PHP (Ondrej PPA)...${NC}"
sudo apt-get install -y software-properties-common
sudo add-apt-repository -y ppa:ondrej/php
sudo apt-get update -y

# Install Node.js
if ! command -v node &> /dev/null; then
    echo -e "${BLUE}Memasang Node.js...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PHP Bundle (5.6, 7.0, 7.1, 7.2, 7.3, 7.4, 8.0, 8.1, 8.2, 8.3, 8.4, 8.5)
PHP_VERSIONS=("5.6" "7.0" "7.1" "7.2" "7.3" "7.4" "8.0" "8.1" "8.2" "8.3" "8.4" "8.5")
echo -e "${BLUE}Memasang Bundle PHP versi: ${PHP_VERSIONS[*]}${NC}"

for ver in "${PHP_VERSIONS[@]}"; do
    echo -e "Memasang PHP $ver..."
    sudo apt-get install -y "php$ver-fpm" "php$ver-mysql" "php$ver-common" "php$ver-curl" "php$ver-gd" "php$ver-mbstring" "php$ver-xml" "php$ver-zip" "php$ver-bcmath"
done

# MariaDB
if ! command -v mariadb &> /dev/null; then
    echo -e "${BLUE}Memasang MariaDB Server...${NC}"
    sudo apt-get install -y mariadb-server
    sudo systemctl enable mariadb
    sudo systemctl start mariadb
else
    echo -e "${BLUE}Merestart MariaDB...${NC}"
    sudo systemctl restart mariadb
fi

# 3.1 (Moved to Software Center)
# phpMyAdmin and other plugins are now managed via the Panel's Software Center.
echo -e "${YELLOW}[2.1/8] Skipping pre-installed plugins (Use Software Center in Panel)...${NC}"
sudo mkdir -p /usr/local/yumnapanel/apps
sudo mkdir -p /usr/local/yumnapanel/temp
# Ensure current user owns the app directory for Node.js write access
sudo chown -R $USER:$USER /usr/local/yumnapanel
echo -e "${GREEN}✅ Plugin Directory Created: /usr/local/yumnapanel${NC}"

# Web Server Choice
if [ "$WS_CHOICE" == "1" ]; then
    if ! command -v nginx &> /dev/null; then
        echo -e "${BLUE}Memasang Nginx...${NC}"
        sudo apt-get install -y nginx
        sudo systemctl enable nginx
        sudo systemctl start nginx
    else
        echo -e "${BLUE}Merestart Nginx...${NC}"
        sudo systemctl restart nginx
    fi
else
    if ! command -v apache2 &> /dev/null; then
        echo -e "${BLUE}Memasang Apache2...${NC}"
        sudo apt-get install -y apache2
        # Enable modules for PHP-FPM
        sudo a2enmod proxy proxy_http proxy_fcgi setenvif rewrite
        sudo systemctl enable apache2
        sudo systemctl start apache2
    else
        echo -e "${BLUE}Merestart Apache2...${NC}"
        sudo systemctl restart apache2
    fi
fi

fi # End of SKIP_DEPS check
if ! command -v pm2 &> /dev/null; then sudo npm install pm2 -g; fi
if ! command -v clamscan &> /dev/null; then
    sudo apt-get install -y clamav clamav-daemon
    sudo systemctl enable clamav-daemon && sudo systemctl start clamav-daemon
fi

# 4. Konfigurasi Firewall (UFW)
echo -e "${YELLOW}[3/8] Konfigurasi Firewall (UFW)...${NC}"
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw --force enable

# 5. Build & Setup (Frontend/Backend)
if [[ "$SKIP_BUILD" =~ ^[Nn]$ ]]; then
    echo -e "${YELLOW}[4/8] Membangun Frontend (Vite Build)...${NC}"
    (cd client && npm install && npm run build)

    echo -e "${YELLOW}[5/8] Menyiapkan Server Backend...${NC}"
    cd server
    npm install
else
    # Jika skip build, pastikan kita tetap pindah ke folder server untuk langkah berikutnya
    cd server
fi
mkdir -p data uploads

# Setup .env if not exists
if [ ! -f .env ]; then
    echo -e "${BLUE}Membuat file .env default...${NC}"
    cat > .env <<EOF
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=yumna_db
ENCRYPTION_KEY=$(openssl rand -hex 16)
NODE_ENV=production
EOF
    echo -e "${YELLOW}⚠️  PENTING: Silakan sesuaikan database password di server/.env jika diperlukan.${NC}"
fi

# Initialize Database (Hanya jika baru)
if [ "$goto_pm2" != "true" ]; then
    echo -e "${BLUE}Menginisialisasi Database...${NC}"
    npm run init-db
    node src/scripts/init-security-db.js
fi
cd ..

# 6. Menyiapkan Konfigurasi Web Server
if [ "$goto_pm2" == "true" ]; then
    echo -e "${GREEN}Layanan sistem siap. Menjalankan Panel...${NC}"
else
    echo -e "${YELLOW}[6/8] Konfigurasi Web Server (${WS_CHOICE:+"Apache2"})...${NC}"
    DOMAIN_NAME=$(hostname -I | awk '{print $1}')
    FILE_ROOT=$(pwd)

# Grant Permissions to Web Server
if [ "$WS_CHOICE" == "1" ]; then
    sudo chown -R www-data:www-data "$FILE_ROOT/client/dist"
    sudo chown -R www-data:www-data "$FILE_ROOT/server/uploads"
else
    sudo chown -R www-data:www-data "$FILE_ROOT/client/dist"
    sudo chown -R www-data:www-data "$FILE_ROOT/server/uploads"
fi

# Create Blocked IPs config files if missing
sudo mkdir -p /etc/nginx /etc/apache2
sudo touch /etc/nginx/blocked_ips.conf
sudo touch /etc/apache2/blocked_ips.conf

if [ "$WS_CHOICE" == "1" ]; then
    # CONFIG NGINX
    NGINX_CONF="/etc/nginx/sites-available/yumna-panel"
    sudo bash -c "cat > $NGINX_CONF <<EOF
server {
    listen 80;
    server_name _;
    
    root $FILE_ROOT/client/dist;
    index index.html;

    location / {
        include /etc/nginx/blocked_ips.conf;
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /uploads {
        alias $FILE_ROOT/server/uploads;
    }
}
EOF"
    sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl restart nginx
else
    # CONFIG APACHE2
    APACHE_CONF="/etc/apache2/sites-available/yumna-panel.conf"
    sudo bash -c "cat > $APACHE_CONF <<EOF
<VirtualHost *:80>
    ServerName localhost
    
    DocumentRoot $FILE_ROOT/client/dist
    <Directory $FILE_ROOT/client/dist>
        Options Indexes FollowSymLinks
        AllowOverride All
        <RequireAll>
            Require all granted
            Include /etc/apache2/blocked_ips.conf
        </RequireAll>
    </Directory>

    # Proxy API requests to Node.js backend
    ProxyRequests Off
    ProxyPreserveHost On
    ProxyPass /api http://localhost:5000/api
    ProxyPassReverse /api http://localhost:5000/api

    # Handle Uploads directory
    Alias /uploads $FILE_ROOT/server/uploads
    <Directory $FILE_ROOT/server/uploads>
        Require all granted
    </Directory>

    ErrorLog \${APACHE_LOG_DIR}/yumna_error.log
    CustomLog \${APACHE_LOG_DIR}/yumna_access.log combined
</VirtualHost>
EOF"
    sudo a2dissite 000-default.conf
    sudo a2ensite yumna-panel.conf
    sudo systemctl restart apache2
fi
fi # End of goto_pm2 check

# 7. Menjalankan Server dengan PM2
echo -e "${YELLOW}[7/8] Menjalankan Server dengan PM2...${NC}"
pm2 delete yumna-panel 2>/dev/null
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup | grep "sudo" | bash # Improved startup hook detection

# 8. Konfigurasi SSL (Opsional - User harus jalankan manual)
echo -e "${YELLOW}[8/8] Deployment Selesai!${NC}"
echo -e "${GREEN}====================================================${NC}"
echo -e "${GREEN}✅ YUMNA PANEL BERHASIL TERINSTAL!${NC}"
echo -e "${BLUE}Informasi Akses:${NC}"
echo -e "URL: http://$DOMAIN_NAME"
echo -e "Backend Port: 5000"
echo -e "MariaDB: localhost:3306"
echo -e "${YELLOW}Tips Tambahan:${NC}"
echo -e "1. Install phpMyAdmin via Panel (Software Center)"
echo -e "2. Untuk HTTPS, jalankan: sudo apt-get install certbot python3-certbot-nginx && sudo certbot --nginx"
echo -e "3. Log Server: pm2 logs yumna-panel"
echo -e "4. Untuk konfigurasi DB, pastikan .env sudah benar."
echo -e "5. EMERGENCY: Jika Nginx/Apache mati, akses panel via http://$DOMAIN_NAME:5000"
echo -e "${BLUE}====================================================${NC}"
