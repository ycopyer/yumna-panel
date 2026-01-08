#!/bin/bash

# Firewall Feature Deployment Script for Production
# Run this on your Linux production server

echo "=========================================="
echo "Firewall Feature Deployment (Production)"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get MySQL credentials
echo -e "${YELLOW}Enter MySQL credentials:${NC}"
read -p "MySQL Host [localhost]: " MYSQL_HOST
MYSQL_HOST=${MYSQL_HOST:-localhost}

read -p "MySQL Database [sftp_drive]: " MYSQL_DB
MYSQL_DB=${MYSQL_DB:-sftp_drive}

read -p "MySQL User [root]: " MYSQL_USER
MYSQL_USER=${MYSQL_USER:-root}

read -sp "MySQL Password: " MYSQL_PASS
echo ""

# Step 1: Database Migration
echo ""
echo -e "${YELLOW}[1/5] Running database migration...${NC}"

mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASS" "$MYSQL_DB" <<EOF
-- Add country column to firewall table
ALTER TABLE firewall ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT NULL;

-- Insert default firewall settings
INSERT INTO settings (key_name, value_text) VALUES ('firewall_threshold', '40')
ON DUPLICATE KEY UPDATE value_text = '40';

INSERT INTO settings (key_name, value_text) VALUES ('firewall_window', '60')
ON DUPLICATE KEY UPDATE value_text = '60';

INSERT INTO settings (key_name, value_text) VALUES ('firewall_codes', '404,403,500,401,301,302,201,505')
ON DUPLICATE KEY UPDATE value_text = '404,403,500,401,301,302,201,505';

SELECT 'Migration completed!' as status;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database migration successful${NC}"
else
    echo -e "${RED}✗ Database migration failed${NC}"
    exit 1
fi

# Step 2: Check required files
echo ""
echo -e "${YELLOW}[2/5] Checking required files...${NC}"

FILES=(
    "src/middleware/responseMonitor.js"
    "src/routes/firewall.js"
    "src/app.js"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ $file${NC}"
    else
        echo -e "${RED}✗ $file NOT FOUND${NC}"
        echo "Please upload missing files from your local development!"
        exit 1
    fi
done

# Step 3: Install dependencies (if needed)
echo ""
echo -e "${YELLOW}[3/5] Checking Node.js dependencies...${NC}"
if ! grep -q "https" package.json 2>/dev/null; then
    echo "Note: 'https' module is built-in, no installation needed"
fi
echo -e "${GREEN}✓ Dependencies OK${NC}"

# Step 4: Restart PM2
echo ""
echo -e "${YELLOW}[4/5] Restarting backend with PM2...${NC}"

if command -v pm2 &> /dev/null; then
    pm2 restart all
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ PM2 restart successful${NC}"
    else
        echo -e "${RED}✗ PM2 restart failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ PM2 not found. Please restart manually:${NC}"
    echo "  cd /var/www/html/SFTDrive/server"
    echo "  pm2 restart sftp-drive-server"
    echo "  OR: node index.js"
fi

# Step 5: Verify
echo ""
echo -e "${YELLOW}[5/5] Verification...${NC}"

# Check if process is running
sleep 2
if pm2 list | grep -q "online"; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${RED}✗ Backend not running. Check logs: pm2 logs${NC}"
fi

# Final instructions
echo ""
echo "=========================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Clear browser cache (Ctrl+Shift+R)"
echo "2. Login as admin"
echo "3. Check sidebar for 'Firewall (Blocks)' menu"
echo ""
echo "Troubleshooting:"
echo "  - Check logs: pm2 logs"
echo "  - Check errors: pm2 logs --err"
echo "  - Restart: pm2 restart all"
echo ""
echo "Documentation: /var/www/html/SFTDrive/FIREWALL_GUIDE.md"
echo "=========================================="
