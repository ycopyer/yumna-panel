#!/bin/bash

# ====================================================
#   YUMNA PANEL - LINUX CLI STATUS MONITOR
# ====================================================

# Warna untuk output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Fungsi untuk cek status systemd
check_service() {
    local service_name=$1
    local display_name=$2
    if systemctl is-active --quiet "$service_name"; then
        echo -e "  $display_name: ${GREEN}[ ONLINE ]${NC}"
    else
        echo -e "  $display_name: ${RED}[ OFFLINE ]${NC}"
    fi
}

# Fungsi untuk cek PM2
check_pm2() {
    if command -v pm2 &> /dev/null; then
        local pm2_status=$(pm2 status yumna-panel --format json | grep -o '"status":"online"' | head -1)
        if [ "$pm2_status" == '"status":"online"' ]; then
            echo -e "  Yumna Panel (Node): ${GREEN}[ ONLINE ]${NC}"
        else
            echo -e "  Yumna Panel (Node): ${RED}[ OFFLINE / NOT STARTED ]${NC}"
        fi
    else
        echo -e "  PM2 Manager: ${RED}[ NOT INSTALLED ]${NC}"
    fi
}

clear
echo -e "${BLUE}====================================================${NC}"
echo -e "${CYAN}   __     __ _ _                                      ${NC}"
echo -e "${CYAN}   \ \   / /| | | | _ __ ___  _ __   __ _              ${NC}"
echo -e "${CYAN}    \ \ / / | | | || '_ \` _ \| '_ \ / _\` |            ${NC}"
echo -e "${CYAN}     \ V /  | |_| || | | | | || | | | (_| |            ${NC}"
echo -e "${CYAN}      \_/    \__,_||_| |_| |_||_| |_|\__,_| PANEL     ${NC}"
echo -e "${BLUE}====================================================${NC}"
echo -e "${YELLOW}           Yumna Panel Status Monitor (CLI)         ${NC}"
echo -e "${BLUE}====================================================${NC}"

echo -e "\n${YELLOW}[ PRODUCTION SERVICES ]${NC}"
check_service "mariadb" "MariaDB SQL Engine "
if systemctl is-active --quiet "nginx"; then
    check_service "nginx" "Nginx Web Server   "
elif systemctl is-active --quiet "apache2"; then
    check_service "apache2" "Apache2 Web Server "
else
    echo -e "  Web Server: ${RED}[ NOT DETECTED ]${NC}"
fi
check_pm2

echo -e "\n${YELLOW}[ SECURITY & HELPERS ]${NC}"
check_service "clamav-daemon" "ClamAV Anti-Malware"
check_service "ufw" "UFW Firewall       "

# PHP-FPM Status
echo -e "\n${YELLOW}[ PHP FPM BUNDLE ]${NC}"
PHP_VERS=("5.6" "7.4" "8.2" "8.3" "8.4")
for ver in "${PHP_VERS[@]}"; do
    if systemctl list-unit-files "php$ver-fpm.service" &> /dev/null; then
        check_service "php$ver-fpm" "PHP $ver Engine    "
    fi
done

echo -e "\n${YELLOW}[ SYSTEM RESOURCES ]${NC}"
UPTIME=$(uptime -p)
LOAD=$(cat /proc/loadavg | awk '{print $1 " " $2 " " $3}')
RAM_TOTAL=$(free -m | awk '/^Mem:/{print $2}')
RAM_USED=$(free -m | awk '/^Mem:/{print $3}')
RAM_PERC=$(( RAM_USED * 100 / RAM_TOTAL ))

echo -e "  Uptime : $UPTIME"
echo -e "  Load   : $LOAD"
echo -e "  RAM    : ${RAM_USED}MB / ${RAM_TOTAL}MB (${RAM_PERC}%)"

echo -e "\n${BLUE}====================================================${NC}"
echo -e "${GREEN}  Type 'pm2 logs yumna-panel' for real-time logs.${NC}"
echo -e "${BLUE}====================================================${NC}\n"
