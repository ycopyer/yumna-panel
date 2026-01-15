#!/bin/bash
# YumnaPanel Agent Update Script
# Usage: curl -sSL http://your-panel-ip:4000/scripts/update_agent.sh | bash

AGENT_DIR="/opt/yumna-agent" # Adjust to your agent directory
PANEL_URL="http://192.168.10.69:4000" # Your panel IP

echo "[YUMNA] Updating Agent..."

if [ ! -d "$AGENT_DIR" ]; then
    echo "Error: Agent directory $AGENT_DIR not found. Please adjust the script."
    exit 1
fi

cd "$AGENT_DIR"

# Backup index and FileService
mkdir -p src/services
cp src/index.js src/index.js.bak
cp src/services/FileService.js src/services/FileService.js.bak 2>/dev/null

# Download latest versions from Panel (if we expose them as static files)
# For now, this script assumes you have the files ready or can pull them.
# In a real scenario, we could use git pull or curl from a public/protected URL.

echo "[YUMNA] Please ensure you have pushed the latest code from the Panel."
echo "[YUMNA] Or use the 'Upgrade Agent' button in the Server Management section of your Panel."

# Restarting the service
if command -v pm2 &> /dev/null; then
    pm2 restart all
elif [ -f "/etc/systemd/system/yumna-agent.service" ]; then
    systemctl restart yumna-agent
else
    npm run restart || npm start &
fi

echo "[YUMNA] Update process triggered."
