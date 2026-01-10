# Domain Management & Collaboration Features

## Overview
Implementasi lengkap untuk **Domain Management** dan **Collaboration Features** pada YumnaPanel.

## 📋 Features Implemented

### 1. Domain Management 🌐

#### Backend (`/app/server/src/routes/hosting/domains.js`)
- ✅ CRUD operations untuk domain
- ✅ WHOIS lookup integration
- ✅ DNS record checking (A, AAAA, MX, NS, TXT)
- ✅ Domain forwarding (301, 302, Frame)
- ✅ Nameserver management
- ✅ Domain expiry tracking
- ✅ Auto-renew dan WHOIS privacy settings

#### Frontend
**Components:**
- `DomainManager.tsx` - Main domain management interface
- `DomainModal.tsx` - Add/Edit domain modal
- `DomainDetailsModal.tsx` - Detailed domain information with tabs

**Features:**
- Grid view dengan search dan filtering
- Status indicators (Active, Expired, Pending Transfer, etc.)
- Expiry alerts dengan color coding
- WHOIS information viewer
- DNS records checker dengan real-time lookup
- Domain forwarding configuration
- Nameserver management

#### Database Tables
```sql
domains
- id, user_id, domain, registrar
- registration_date, expiry_date
- auto_renew, whois_privacy
- nameservers (JSON)
- status, created_at, updated_at

domain_forwarding
- id, domain_id, target_url
- type (301/302/frame)
- preserve_path, enabled
```

### 2. Collaboration Features 👥

#### Backend (`/app/server/src/routes/hosting/collaboration.js`)
- ✅ Team member management
- ✅ Role-based permissions system
- ✅ Activity feed logging
- ✅ Comments system (files, tasks, general)
- ✅ Task management dengan assignment

#### Frontend
**Main Components:**
- `CollaborationManager.tsx` - Main collaboration interface
- `TeamMembersPanel.tsx` - Team member management
- `ActivityFeedPanel.tsx` - Activity timeline
- `TasksPanel.tsx` - Task management
- `CommentsPanel.tsx` - Comments system

**Modals:**
- `AddTeamMemberModal.tsx` - Add team members dengan permissions
- `EditPermissionsModal.tsx` - Edit member permissions
- `TaskModal.tsx` - Create/Edit tasks

**Features:**
- Team member invitation by email
- Granular permissions (Files, Database, Settings, SSL, FTP, Email)
- Real-time activity feed
- Task management dengan priority dan due dates
- Comments dengan threading
- Team statistics dashboard

#### Database Tables
```sql
website_team_members
- id, website_id, user_id
- permissions (JSON)
- created_at, updated_at

website_activities
- id, website_id, user_id
- action, description
- metadata (JSON)
- created_at

website_comments
- id, website_id, user_id
- target_type, target_id
- comment, created_at, updated_at

website_tasks
- id, website_id, created_by, assigned_to
- title, description
- priority, status, due_date
- completed_at, created_at, updated_at
```

## 🚀 Installation

### 1. Run Database Migration
```bash
# Navigate to server directory
cd app/server

# Run migration
mysql -u root -p yumnapanel < migrations/007_domain_collaboration.sql
```

### 2. Install Dependencies
```bash
# Install whois package for WHOIS lookup
npm install whois
```

### 3. Restart Server
```bash
npm run dev
```

## 📖 Usage

### Domain Management

#### Add Domain
1. Navigate to **Domain Management**
2. Click **Add Domain**
3. Enter domain information:
   - Domain name (e.g., example.com)
   - Registrar
   - Registration & Expiry dates
   - Enable Auto-Renew
   - Enable WHOIS Privacy
   - Add Nameservers

#### View Domain Details
1. Click on any domain card
2. View tabs:
   - **Information**: Basic domain info
   - **WHOIS**: Live WHOIS lookup
   - **DNS Check**: Real-time DNS records
   - **Forwarding**: Configure domain forwarding

#### Setup Domain Forwarding
1. Open domain details
2. Go to **Forwarding** tab
3. Enter target URL
4. Select redirect type (301/302/Frame)
5. Enable "Preserve URL path" if needed
6. Click **Save Forwarding**

### Collaboration Features

#### Add Team Member
1. Open website collaboration
2. Go to **Team Members** tab
3. Click **Add Member**
4. Enter user email
5. Select permissions:
   - File Manager
   - Database
   - Website Settings
   - SSL Certificates
   - FTP Accounts
   - Email Accounts
6. Click **Add Member**

#### Create Task
1. Go to **Tasks** tab
2. Click **New Task**
3. Fill in task details:
   - Title
   - Description
   - Assign to team member
   - Set priority (Low/Medium/High/Urgent)
   - Set due date
   - Set status
4. Click **Create Task**

#### View Activity Feed
1. Go to **Activity Feed** tab
2. View chronological timeline of all website activities
3. Filter by time range (Last 25/50/100)

#### Add Comments
1. Go to **Comments** tab
2. Type your comment
3. Click **Post Comment**
4. View all comments in chronological order

## 🎨 Styling

Custom CSS files:
- `DomainManager.css` - Domain management styles
- `CollaborationManager.css` - Collaboration features styles

Features:
- Responsive design
- Dark/Light theme support
- Modern card-based UI
- Smooth animations
- Color-coded status indicators

## 🔒 Security

### Permissions System
- Owner-only actions (Add/Remove members, Edit permissions)
- Granular permission control per feature
- Activity logging for audit trail
- User authentication required for all operations

### API Security
- User authentication via `x-user-id` header
- Ownership verification on all operations
- SQL injection prevention
- Input validation

## 📊 API Endpoints

### Domain Management
```
GET    /api/hosting/domains              - List all domains
POST   /api/hosting/domains              - Add new domain
PUT    /api/hosting/domains/:id          - Update domain
DELETE /api/hosting/domains/:id          - Delete domain
GET    /api/hosting/domains/:id/whois    - Get WHOIS info
GET    /api/hosting/domains/:id/dns-check - Check DNS records
POST   /api/hosting/domains/:id/forwarding - Setup forwarding
GET    /api/hosting/domains/:id/forwarding - Get forwarding
DELETE /api/hosting/domains/:id/forwarding - Remove forwarding
```

### Collaboration
```
# Team Members
GET    /api/hosting/collaboration/websites/:id/members
POST   /api/hosting/collaboration/websites/:id/members
PUT    /api/hosting/collaboration/websites/:id/members/:memberId
DELETE /api/hosting/collaboration/websites/:id/members/:memberId

# Activity Feed
GET    /api/hosting/collaboration/websites/:id/activity
POST   /api/hosting/collaboration/websites/:id/activity

# Comments
GET    /api/hosting/collaboration/websites/:id/comments
POST   /api/hosting/collaboration/websites/:id/comments
DELETE /api/hosting/collaboration/websites/:id/comments/:commentId

# Tasks
GET    /api/hosting/collaboration/websites/:id/tasks
POST   /api/hosting/collaboration/websites/:id/tasks
PUT    /api/hosting/collaboration/websites/:id/tasks/:taskId
DELETE /api/hosting/collaboration/websites/:id/tasks/:taskId
```

## 🐛 Troubleshooting

### WHOIS Lookup Fails
- Ensure `whois` package is installed
- Check domain name format
- Some TLDs may not support WHOIS

### DNS Check Returns Empty
- Verify domain has DNS records
- Check nameserver configuration
- Ensure domain is properly delegated

### Team Member Not Found
- Verify user exists in system
- Check email address is correct
- User must have an account first

## 📝 Notes

- Domain expiry alerts calculated in days
- Activity feed limited to prevent performance issues
- Comments support file, task, and general targets
- Tasks can be filtered by status and assignee
- Permissions are stored as JSON for flexibility

## 🔄 Future Enhancements

- Email notifications for expiring domains
- Bulk domain operations
- Domain transfer automation
- Real-time collaboration notifications
- Task dependencies and subtasks
- Comment mentions (@username)
- File attachments in comments

---

**Created:** January 9, 2026  
**Version:** 1.0  
**Author:** YumnaPanel Team
