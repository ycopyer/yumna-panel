# Activity History Tracking - Implementation

## Overview
Setiap aktivitas user sekarang otomatis dicatat ke Activity History, termasuk:
- ✅ Open Folder
- ✅ Download File
- ✅ View PDF
- ✅ Preview File (image, video, text)
- ✅ Upload File
- ✅ Delete File
- ✅ Rename File
- ✅ Create Folder
- ✅ Share File
- ✅ Multi-download
- ✅ IP Tracking (Public & Local IP)
- ✅ Shared Link Monitoring (Anonymous Access)

## Backend Changes

### Logged Activities

#### 1. **View Folder** (`/api/ls`)
```javascript
logActivity(userId, 'view', `Opened folder: ${path}`);
```
- Dicatat setiap kali user membuka/navigasi ke folder
- Path disimpan dalam description

#### 2. **Download File** (`/api/download`)
```javascript
logActivity(userId, 'download', `Downloaded: ${filePath}`);
```
- Dicatat setiap kali user download file
- Full path file disimpan

#### 3. **View PDF** (`/api/view-pdf`)
```javascript
logActivity(userId, 'view', `Viewed PDF: ${filePath}`);
```
- Dicatat setiap kali user view PDF
- Khusus untuk PDF yang dibuka dalam iframe

#### 4. **Preview File** (`/api/preview`)
```javascript
logActivity(userId, 'view', `Previewed ${type}: ${filePath}`);
```
- Dicatat untuk preview image, video, atau text
- Type file dan path disimpan

#### 5. **Multi-download** (`/api/download-multi`)
```javascript
logActivity(userId, 'download', `Downloaded ${count} files from ${path}`);
```
- Dicatat jumlah file yang didownload dalam satu zip
- Path folder disimpan

#### 6. **Existing Activities** (sudah ada sebelumnya)
- Upload: `logActivity(userId, 'upload', 'Uploaded X file(s) to /path')`
- Delete: `logActivity(userId, 'delete', 'Moved to trash: /path')`
- Rename: `logActivity(userId, 'rename', 'Renamed: old -> new')`
- Create Folder: `logActivity(userId, 'create', 'Created folder: /path')`

## Frontend Changes

### ActivityHistory Component

#### New Action Type: **View**
- **Icon**: Eye icon (👁️)
- **Color**: Pink (#ec4899)
- **Represents**: File/folder viewing activities

#### Action Types dengan Icons:
1. 📤 **Upload** - Green (#10b981)
2. 📥 **Download** - Blue (#3b82f6)
3. 🗑️ **Delete** - Red (#ef4444)
4. ✏️ **Rename** - Orange (#f59e0b)
5. 📁 **Create** - Purple (#8b5cf6)
6. 🔗 **Share** - Cyan (#06b6d4)
7. 👁️ **View** - Pink (#ec4899)

#### Filter System
User dapat filter history berdasarkan action type:
- All (default)
- View
- Download
- Upload
- Delete
- Rename
- Create
- Share

## Activity History Database Structure

```sql
TABLE: activity_history
- id: INT AUTO_INCREMENT PRIMARY KEY
- userId: INT (Foreign key to users)
- action: VARCHAR(50) (upload, download, view, delete, rename, create, share)
- description: TEXT (detailed description)
- ipAddress: VARCHAR(45) (Public IP address)
- ipLocal: VARCHAR(45) (Server/Internal IP address)
- createdAt: DATETIME (auto timestamp)
```

## Usage Examples

### User Activity Timeline
```
👁️ View - Viewed PDF: /home/document.pdf - 2 minutes ago
📥 Download - Downloaded: /home/report.xlsx - 5 minutes ago
👁️ View - Opened folder: /home/projects - 10 minutes ago
📤 Upload - Uploaded 3 file(s) to /home - 15 minutes ago
📁 Create - Created folder: /home/new_folder - 20 minutes ago
```

### Filter by Download
```
📥 Downloaded 5 files from /home - Today at 14:30
📥 Downloaded: /reports/monthly.pdf - Today at 12:15
📥 Downloaded: /images/logo.png - Yesterday at 16:45
```

### Filter by View
```
👁️ Viewed PDF: /contracts/agreement.pdf - Just now
👁️ Previewed image: /photos/vacation.jpg - 3 minutes ago
👁️ Opened folder: /documents - 5 minutes ago
```

## Display Format

### Activity Item Display
```
┌─────────────────────────────────────────────────────────┐
│ [📥] Download • User: john_doe                          │
│                                                          │
│ Downloaded: /home/project/report.pdf                    │
│                                                          │
│ 🕐 5 minutes ago                                         │
│ 📅 Senin, 22 Desember 2025 - 20:25:30                   │
└─────────────────────────────────────────────────────────┘
```

### DateTime Information
- **Relative Time**: "Just now", "5 minutes ago", "2 hours ago", "3 days ago"
- **Full DateTime**: "Senin, 22 Desember 2025 - 20:25:30" (Indonesian format)
- **IP Information**: Public IP (Globe icon) and Local IP (Monitor icon) are displayed for each record.
- **Anonymous Guests**: Activities via shared links are displayed as "Guest (IP)" in the user field.

## Performance Considerations

### Database Indexing
```sql
INDEX idx_userId ON activity_history(userId)
INDEX idx_createdAt ON activity_history(createdAt)
```
- Fast filtering by user
- Fast sorting by datetime

### Pagination
- Current limit: 100 records per query
- Can be extended with pagination if needed

## Testing Checklist

### View Activities
- [ ] Buka folder → Check history untuk "Opened folder"
- [ ] Buka folder nested → Verify path yang benar
- [ ] Navigasi breadcrumb → Verify setiap folder dicatat

### Download Activities
- [ ] Download single file → Check "Downloaded: /path"
- [ ] Download multi-select → Check "Downloaded X files from /path"
- [ ] Download folder as zip → Verify dicatat

### Preview Activities
- [ ] View PDF → Check "Viewed PDF: /path"
- [ ] Preview image → Check "Previewed image: /path"
- [ ] Preview video → Check "Previewed video: /path"
- [ ] Preview text → Check "Previewed text: /path"

### File Operations
- [ ] Upload file → Check upload activity
- [ ] Rename file → Check rename activity
- [ ] Delete file → Check delete activity
- [ ] Create folder → Check create activity
- [ ] Share file → Check share activity

### Activity History UI
- [ ] Open Activity History modal
- [ ] Verify all activities muncul dengan benar
- [ ] Test filter by action type
- [ ] Verify datetime display (relative + full)
- [ ] Verify user info display
- [ ] Verify icons dan colors sesuai

### Edge Cases
- [ ] Rapid folder navigation → All logged
- [ ] Multiple downloads berturutan → All logged
- [ ] Preview multiple files → All logged
- [ ] Empty history → Empty state muncul

## Future Enhancements

1. **Batching for Performance**
   - Group activities dalam interval tertentu
   - Contoh: "Viewed 5 folders in /home - 2 minutes ago"

2. **Activity Search**
   - Search dalam descriptions
   - Search by date range
   - Search by specific files

3. **Export Activity Log**
   - Export to CSV/Excel
   - Export filtered results
   - Download as PDF report

4. **Activity Analytics**
   - Most accessed folders
   - Most downloaded files
   - User activity patterns
   - Time-based charts

5. **Real-time Updates**
   - WebSocket untuk live updates
   - Notification for new activities
   - Activity feed

6. **Privacy Controls**
   - Option to disable tracking
   - Clear history
   - Auto-delete old records

## Notes

- All activities are logged asynchronously (non-blocking)
- Failed activity logs don't affect main operations
- Activity history available to user themselves and admins
- Timestamps in UTC, displayed in local timezone
- Description field is searchable for future search feature
