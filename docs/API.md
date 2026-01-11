# Yumna Panel API Documentation

## Overview
Yumna Panel provides a comprehensive RESTful API for managing web hosting infrastructure, including websites, databases, DNS, SSL, billing, and cloud resources.

**Base URL**: `http://localhost:4000/api`

**Authentication**: All endpoints require JWT-based session authentication via headers:
- `x-user-id`: User ID
- `x-session-id`: Session token

---

## Authentication & Users

### POST /auth/login
Authenticate user and create session.

**Request Body**:
```json
{
  "username": "admin",
  "password": "password123",
  "captchaId": "uuid",
  "captchaText": "ABC123"
}
```

**Response**:
```json
{
  "sessionId": "session-uuid",
  "userId": 1,
  "role": "admin",
  "username": "admin"
}
```

### GET /users
List all users (Admin/Reseller only).

**Response**:
```json
[
  {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "status": "active",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
]
```

---

## Websites & Hosting

### GET /websites
List all websites for the authenticated user.

**Response**:
```json
[
  {
    "id": 1,
    "domain": "example.com",
    "documentRoot": "/var/www/example.com",
    "phpVersion": "8.2",
    "status": "active",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
]
```

### POST /websites
Create a new website.

**Request Body**:
```json
{
  "domain": "newsite.com",
  "documentRoot": "/var/www/newsite.com",
  "phpVersion": "8.2",
  "webserver": "nginx"
}
```

---

## Databases

### GET /databases
List all databases.

**Response**:
```json
[
  {
    "id": 1,
    "name": "mydb",
    "size": 10485760,
    "tableCount": 5,
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
]
```

### POST /databases
Create a new database.

**Request Body**:
```json
{
  "name": "newdb",
  "charset": "utf8mb4",
  "collation": "utf8mb4_unicode_ci"
}
```

---

## DNS Management

### GET /dns/zones
List all DNS zones.

**Response**:
```json
[
  {
    "id": 1,
    "domain": "example.com",
    "type": "master",
    "recordCount": 5
  }
]
```

### POST /dns/zones
Create a new DNS zone.

**Request Body**:
```json
{
  "domain": "newdomain.com",
  "type": "master"
}
```

### POST /dns/records
Add a DNS record.

**Request Body**:
```json
{
  "zoneId": 1,
  "name": "www",
  "type": "A",
  "content": "192.168.1.1",
  "ttl": 3600
}
```

---

## SSL Certificates

### GET /ssl
List all SSL certificates.

**Response**:
```json
[
  {
    "id": 1,
    "domain": "example.com",
    "issuer": "Let's Encrypt",
    "expiresAt": "2026-12-31T23:59:59.000Z",
    "status": "active"
  }
]
```

### POST /ssl/issue
Issue a new SSL certificate (Let's Encrypt).

**Request Body**:
```json
{
  "domain": "example.com",
  "email": "admin@example.com"
}
```

---

## Billing & Invoices

### GET /billing/products
List available products.

**Response**:
```json
[
  {
    "id": 1,
    "name": "Basic Hosting",
    "price": 9.99,
    "period": "monthly",
    "features": ["10GB Storage", "Unlimited Bandwidth"]
  }
]
```

### POST /billing/order
Create a new order.

**Request Body**:
```json
{
  "productId": 1
}
```

**Response**:
```json
{
  "orderId": 123,
  "invoiceId": 456,
  "amount": 9.99,
  "tax_amount": 1.10,
  "total_amount": 11.09,
  "due_at": "2026-01-14T00:00:00.000Z"
}
```

### GET /billing/invoices
List all invoices.

**Response**:
```json
[
  {
    "id": 1,
    "amount": 9.99,
    "tax_amount": 1.10,
    "total_amount": 11.09,
    "status": "unpaid",
    "due_at": "2026-01-14T00:00:00.000Z"
  }
]
```

---

## Cloud & VPS

### GET /cloud/vms
List all virtual machines (Proxmox integration).

**Response**:
```json
[
  {
    "vmid": 100,
    "name": "web-server-01",
    "status": "running",
    "cpus": 2,
    "maxmem": 2147483648,
    "maxdisk": 21474836480,
    "uptime": 86400
  }
]
```

### POST /cloud/vms
Create a new virtual machine.

**Request Body**:
```json
{
  "name": "new-vm",
  "cpus": 2,
  "memory": 2048,
  "disk": 20
}
```

### POST /cloud/vms/:vmid/status
Control VM power state.

**Request Body**:
```json
{
  "action": "start" // or "stop", "reboot"
}
```

---

## AI Assistant

### POST /ai/ask
Query the AI assistant.

**Request Body**:
```json
{
  "prompt": "How do I configure Nginx for my domain?",
  "context": "System: Web Server Configuration"
}
```

**Response**:
```json
{
  "answer": "To configure Nginx for your domain, you need to..."
}
```

### POST /ai/code-review
Request AI code review.

**Request Body**:
```json
{
  "code": "<?php echo $_GET['input']; ?>"
}
```

**Response**:
```json
{
  "review": "Security Issue: This code is vulnerable to XSS attacks..."
}
```

---

## Security & Fraud Detection

### GET /admin/fraud/logs
View fraud detection logs (Admin only).

**Response**:
```json
[
  {
    "id": 1,
    "userId": 5,
    "ipAddress": "192.168.1.100",
    "score": 75,
    "reason": "High velocity of actions from single IP",
    "createdAt": "2026-01-11T12:00:00.000Z"
  }
]
```

### POST /admin/fraud/blacklist
Manually blacklist an IP address.

**Request Body**:
```json
{
  "ipAddress": "192.168.1.100",
  "reason": "Manual Admin Blacklist"
}
```

---

## Plugins

### GET /plugins
List available plugins.

**Response**:
```json
[
  {
    "id": "phpmyadmin",
    "name": "phpMyAdmin",
    "description": "Web-based MySQL management tool",
    "version": "5.2.1",
    "installed": true
  }
]
```

### POST /plugins/install
Install a plugin.

**Request Body**:
```json
{
  "id": "phpmyadmin"
}
```

---

## Error Responses

All endpoints may return the following error formats:

**401 Unauthorized**:
```json
{
  "error": "Authentication required"
}
```

**403 Forbidden**:
```json
{
  "error": "Admin privileges required"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Database connection failed"
}
```

---

## Rate Limiting

- **Standard Users**: 100 requests per minute
- **Admin/Reseller**: 500 requests per minute
- **AI Endpoints**: 10 requests per minute

---

## Webhooks (Coming Soon)

Yumna Panel will support webhooks for real-time event notifications:
- `invoice.paid`
- `website.created`
- `ssl.renewed`
- `vm.status_changed`

---

For more information, visit: https://github.com/yumnapanel/docs
