# Yumna Panel - Deployment Guide

## Production Deployment Checklist

### Prerequisites
- Ubuntu 20.04+ or CentOS 8+
- Node.js 18+ and npm
- MySQL 8.0+
- Nginx or Apache
- Docker (for containerized deployment)
- SSL Certificate (Let's Encrypt recommended)

---

## Method 1: Traditional Server Deployment

### 1. System Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Install Nginx
sudo apt install -y nginx

# Install PM2 for process management
sudo npm install -g pm2
```

### 2. Database Setup

```bash
# Login to MySQL
sudo mysql -u root -p

# Create database and user
CREATE DATABASE yumna_panel;
CREATE USER 'yumna'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON yumna_panel.* TO 'yumna'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Clone and Configure

```bash
# Clone repository
git clone https://github.com/yourusername/YumnaPanel.git
cd YumnaPanel

# Install dependencies
cd whm && npm install
cd ../panel && npm install
cd ../agent && npm install
cd ../app/server && npm install

# Configure environment
cd ../whm
cp .env.example .env
nano .env
```

**WHM .env Configuration**:
```env
WHM_PORT=4000
DB_HOST=localhost
DB_USER=yumna
DB_PASSWORD=your_secure_password
DB_NAME=yumna_panel
JWT_SECRET=your_jwt_secret_key_here
GEMINI_API_KEY=your_gemini_api_key
PROXMOX_URL=https://proxmox.example.com:8006
PROXMOX_TOKEN=your_proxmox_token
```

### 4. Build Frontend

```bash
cd ../panel
npm run build
```

### 5. Start Services with PM2

```bash
# Start WHM (Backend)
cd ../whm
pm2 start src/index.js --name yumna-whm

# Start Agent
cd ../agent
pm2 start src/index.js --name yumna-agent

# Start File Manager Server
cd ../app/server
pm2 start src/index.js --name yumna-filemanager

# Save PM2 configuration
pm2 save
pm2 startup
```

### 6. Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/yumna-panel
```

**Nginx Config**:
```nginx
server {
    listen 80;
    server_name panel.yourdomain.com;

    # Frontend (React Build)
    location / {
        root /path/to/YumnaPanel/panel/dist;
        try_files $uri $uri/ /index.html;
    }

    # WHM API
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # File Manager API
    location /fm-api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/yumna-panel /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. SSL with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d panel.yourdomain.com
```

---

## Method 2: Docker Deployment

### 1. Build Docker Images

```bash
# Build WHM
cd whm
docker build -t yumna-whm .

# Build Panel
cd ../panel
docker build -t yumna-panel .

# Build Agent
cd ../agent
docker build -t yumna-agent .
```

### 2. Docker Compose Setup

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: yumna_panel
      MYSQL_USER: yumna
      MYSQL_PASSWORD: yumnapassword
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - yumna-network

  whm:
    image: yumna-whm
    ports:
      - "4000:4000"
    environment:
      DB_HOST: mysql
      DB_USER: yumna
      DB_PASSWORD: yumnapassword
      DB_NAME: yumna_panel
      JWT_SECRET: your_jwt_secret
    depends_on:
      - mysql
    networks:
      - yumna-network

  panel:
    image: yumna-panel
    ports:
      - "3000:80"
    depends_on:
      - whm
    networks:
      - yumna-network

  agent:
    image: yumna-agent
    ports:
      - "5000:5000"
    networks:
      - yumna-network

volumes:
  mysql_data:

networks:
  yumna-network:
    driver: bridge
```

### 3. Deploy

```bash
docker-compose up -d
```

---

## Method 3: Kubernetes Deployment

### 1. Create Kubernetes Manifests

**whm-deployment.yaml**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: yumna-whm
spec:
  replicas: 3
  selector:
    matchLabels:
      app: yumna-whm
  template:
    metadata:
      labels:
        app: yumna-whm
    spec:
      containers:
      - name: whm
        image: yumna-whm:latest
        ports:
        - containerPort: 4000
        env:
        - name: DB_HOST
          value: "mysql-service"
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: username
---
apiVersion: v1
kind: Service
metadata:
  name: yumna-whm-service
spec:
  selector:
    app: yumna-whm
  ports:
  - port: 4000
    targetPort: 4000
  type: LoadBalancer
```

### 2. Deploy to Kubernetes

```bash
kubectl apply -f whm-deployment.yaml
kubectl apply -f panel-deployment.yaml
kubectl apply -f mysql-deployment.yaml
```

---

## Post-Deployment

### 1. Initialize Database

```bash
# The database will auto-initialize on first WHM start
# Check logs
pm2 logs yumna-whm
```

### 2. Create Admin User

```bash
# Access MySQL
mysql -u yumna -p yumna_panel

# Create admin
INSERT INTO users (username, email, password, role) 
VALUES ('admin', 'admin@yourdomain.com', '$argon2id$...', 'admin');
```

### 3. Security Hardening

```bash
# Enable firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable

# Disable root SSH
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart sshd
```

### 4. Monitoring Setup

```bash
# Install monitoring tools
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Setup monitoring dashboard
pm2 link your_pm2_secret_key your_pm2_public_key
```

---

## Backup Strategy

### Automated Daily Backups

```bash
# Create backup script
sudo nano /usr/local/bin/yumna-backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backups/yumna"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
mysqldump -u yumna -p'password' yumna_panel > $BACKUP_DIR/db_$DATE.sql

# Files backup
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /var/www

# Retain only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/yumna-backup.sh

# Add to crontab
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/yumna-backup.sh
```

---

## Troubleshooting

### WHM Won't Start
```bash
# Check logs
pm2 logs yumna-whm

# Check database connection
mysql -u yumna -p -h localhost yumna_panel
```

### Frontend 404 Errors
```bash
# Rebuild frontend
cd panel
npm run build

# Check Nginx config
sudo nginx -t
```

### High Memory Usage
```bash
# Check PM2 status
pm2 status

# Restart services
pm2 restart all
```

---

## Scaling Considerations

### Load Balancing
- Use Nginx or HAProxy for load balancing
- Deploy multiple WHM instances
- Use Redis for session storage

### Database Optimization
- Enable MySQL query cache
- Use read replicas for heavy loads
- Consider MySQL Cluster or Galera

### CDN Integration
- Use Cloudflare for static assets
- Enable Nginx caching
- Implement Redis caching layer

---

For support: support@yumnapanel.com
