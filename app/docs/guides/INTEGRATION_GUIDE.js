/**
 * INTEGRATION GUIDE FOR EXPLORER.TSX
 * 
 * This file contains code snippets to add to Explorer.tsx
 * to integrate all new features (ActivityHistory, FilePreview, TrashBin, Drag & Drop)
 */

// ============================================
// STEP 1: Add these buttons to the sidebar navigation (around line 300-340)
// ============================================

/*
Add after the existing nav items and before the admin-only section:
*/

<div className="nav-item" onClick={() => setShowActivityHistory(true)} style={{ cursor: 'pointer' }}>
    <History size={20} />
    <span>Activity History</span>
</div>
<div className="nav-item" onClick={() => setShowTrash(true)} style={{ cursor: 'pointer' }}>
    <Trash2 size={20} />
    <span>Trash Bin</span>
</div>

// ============================================
// STEP 2: Update the main content wrapper to support drag & drop (around line 348)
// ============================================

/*
Replace:
  <main className="main-content">

With:
*/

<main 
    className="main-content"
    onDragEnter={handleDragEnter}
    onDragLeave={handleDragLeave}
    onDragOver={handleDragOver}
    onDrop={handleDrop}
    style={{ position: 'relative' }}
>
    {/* Drag & Drop Overlay */}
    {isDragging && (
        <div style={{
            position: 'absolute',
            inset: '16px',
            background: 'rgba(99, 102, 241, 0.95)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            zIndex: 50,
            border: '3px dashed white',
            borderRadius: '16px',
            pointerEvents: 'none'
        }}>
            <Upload size={64} color="white" />
            <p style={{ fontSize: '24px', fontWeight: '600', color: 'white' }}>
                Drop files here to upload
            </p>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
                Release to start uploading
            </p>
        </div>
    )}

    {/* Rest of main content... */}

// ============================================
// STEP 3: Update file card actions to add preview button (around line 467-485)
// ============================================

/*
Replace the existing file actions section with:
*/

<div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
    {file.type === 'file' && (
        <>
            <button 
                onClick={(e) => { e.stopPropagation(); downloadFile(file); }} 
                className="input-glass" 
                style={{ padding: '6px', border: 'none', background: 'transparent', color: '#94a3b8' }} 
                title="Download"
            >
                <Download size={16} />
            </button>
            {isPreviewable(file.name) && (
                <button 
                    onClick={(e) => { e.stopPropagation(); viewPreview(file); }} 
                    className="input-glass" 
                    style={{ padding: '6px', border: 'none', background: 'transparent', color: '#94a3b8' }} 
                    title="Preview"
                >
                    <ExternalLink size={16} />
                </button>
            )}
        </>
    )}
    {user.role !== 'viewer' && (
        <>
            <button 
                onClick={(e) => { e.stopPropagation(); setShareFile(file); }} 
                className="input-glass" 
                style={{ padding: '6px', border: 'none', background: 'transparent', color: '#94a3b8' }} 
                title="Share"
            >
                <Share2 size={16} />
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); setRenameItem(file); }} 
                className="input-glass" 
                style={{ padding: '6px', border: 'none', background: 'transparent', color: '#94a3b8' }} 
                title="Rename"
            >
                <Edit3 size={16} />
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); deleteItem(file); }} 
                className="input-glass" 
                style={{ padding: '6px', border: 'none', background: 'transparent', color: '#ef4444' }} 
                title="Delete"
            >
                <Trash2 size={16} />
            </button>
        </>
    )}
</div>

// ============================================
// STEP 4: Add these functions after viewPreview function (around line 233)
// ============================================

// Drag & Drop handlers
const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (user.role !== 'viewer') setIsDragging(true);
};

const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if leaving the main content area
    if (e.currentTarget === e.target) {
        setIsDragging(false);
    }
};

const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
};

const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (user.role === 'viewer') {
        alert('You do not have permission to upload files');
        return;
    }

    const items = e.dataTransfer.items;
    const files: File[] = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file) files.push(file);
        }
    }

    if (files.length > 0) {
        await uploadFiles(files);
    }
};

const uploadFiles = async (files: File[]) => {
    setLoading(true);
    try {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));
        formData.append('path', path);

        await axios.post(`http://localhost:5000/api/upload?userId=${userId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        alert(`Successfully uploaded ${files.length} file(s)`);
        fetchFiles(path);
    } catch (err: any) {
        console.error('Upload error:', err);
        alert(`Upload failed: ${err.response?.data?.error || err.message}`);
    } finally {
        setLoading(false);
    }
};

// ============================================
// STEP 5: Update viewPreview to support PDF (replace existing viewPreview function)
// ============================================

const viewPreview = (file: FileItem) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    const videoExts = ['mp4', 'webm', 'ogg', 'mov'];
    const itemPath = path === '/' ? `/${file.name}` : `${path}/${file.name}`;

    if (ext === 'pdf') {
        const url = `http://localhost:5000/api/view-pdf?path=${encodeURIComponent(itemPath)}&userId=${userId}`;
        setPreviewFile(url);
        setPreviewType('pdf');
    } else if (imageExts.includes(ext || '')) {
        const url = `http://localhost:5000/api/preview?path=${encodeURIComponent(itemPath)}&type=image&userId=${userId}`;
        setPreviewFile(url);
        setPreviewType('image');
    } else if (videoExts.includes(ext || '')) {
        const url = `http://localhost:5000/api/preview?path=${encodeURIComponent(itemPath)}&type=video&userId=${userId}`;
        setPreviewFile(url);
        setPreviewType('video');
    }
};

// ============================================
// STEP 6: Update deleteItem to pass size to trash (replace existing deleteItem function)
// ============================================

const deleteItem = async (file: FileItem) => {
    const itemPath = path === '/' ? `/${file.name}` : `${path}/${file.name}`;
    const confirmMsg = file.type === 'directory'
        ? `Are you sure you want to move the folder "${file.name}" to trash?`
        : `Are you sure you want to move "${file.name}" to trash?`;

    if (!confirm(confirmMsg)) return;

    setLoading(true);
    try {
        await axios.delete(`http://localhost:5000/api/delete?userId=${userId}`, {
            data: { path: itemPath, type: file.type, size: file.size || 0 }
        });
        fetchFiles(path);
    } catch (err: any) {
        console.error('Delete error:', err);
        alert(`Failed to delete: ${err.response?.data?.error || err.message}`);
    } finally {
        setLoading(false);
    }
};

// ============================================
// STEP 7: Add modal components at the end, before closing </div> (around line 555)
// ============================================

{/* Activity History Modal */ }
{
    showActivityHistory && (
        <ActivityHistory
            userId={userId}
            onClose={() => setShowActivityHistory(false)}
        />
    )
}

{/* Trash Bin Modal */ }
{
    showTrash && (
        <TrashBin
            userId={userId}
            onClose={() => setShowTrash(false)}
        />
    )
}

{/* File Preview Modal */ }
{
    previewFile && previewType && (
        <FilePreview
            fileUrl={previewFile}
            fileName={files.find(f => {
                const itemPath = path === '/' ? `/${f.name}` : `${path}/${f.name}`;
                return previewFile.includes(encodeURIComponent(itemPath));
            })?.name || 'Preview'}
            fileType={previewType}
            onClose={() => {
                setPreviewFile(null);
                setPreviewType(null);
            }}
            onDownload={() => {
                const file = files.find(f => {
                    const itemPath = path === '/' ? `/${f.name}` : `${path}/${f.name}`;
                    return previewFile.includes(encodeURIComponent(itemPath));
                });
                if (file) downloadFile(file);
            }}
        />
    )
}

{/* Rename Modal */ }
{
    renameItem && (
        <RenameModal
            item={renameItem}
            currentPath={path}
            userId={userId}
            onClose={() => setRenameItem(null)}
            onSuccess={() => {
                setRenameItem(null);
                fetchFiles(path);
            }}
        />
    )
}

// ============================================
// STEP 8: Remove old PDF preview modal (around line 493-507)
// ============================================

/*
Remove this entire block as it's replaced by FilePreview component:

{previewPdf && (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.9)', zIndex: 100, display: 'flex', flexDirection: 'column', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>PDF Preview</h3>
            <button onClick={() => setPreviewPdf(null)} className="btn-primary" style={{ padding: '8px', background: 'rgba(255,255,255,0.1)' }}>
                <X size={24} />
            </button>
        </div>
        <iframe
            src={previewPdf}
            style={{ width: '100%', height: '100%', border: 'none', borderRadius: '16px', background: 'white' }}
            title="PDF Preview"
        />
    </div>
)}
*/

// ============================================
// SUMMARY OF CHANGES
// ============================================

/*
1. ✅ Added ActivityHistory button to sidebar
2. ✅ Added TrashBin button to sidebar  
3. ✅ Added drag & drop overlay to main content
4. ✅ Added drag & drop event handlers
5. ✅ Updated file card actions with preview, rename, delete buttons
6. ✅ Updated viewPreview to support PDF
7. ✅ Updated deleteItem to pass size to trash
8. ✅ Added ActivityHistory modal
9. ✅ Added TrashBin modal
10. ✅ Added FilePreview modal (replaces old PDF preview)
11. ✅ Added RenameModal integration

TESTING:
- Test drag & drop file upload
- Test activity history viewing
- Test trash bin (delete, restore, empty)
- Test file preview for images, videos, PDFs
- Test rename functionality
- Test all file operations still work
*/
