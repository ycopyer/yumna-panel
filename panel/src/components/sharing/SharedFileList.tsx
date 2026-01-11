import React, { useState } from 'react';
import { Search, Folder, File as FileIcon, FileText, Image as ImageIcon, FileCode, Download, MoreVertical, CheckCircle2, XCircle, Loader2, AlertCircle, Eye } from 'lucide-react';
import ContextMenu from '../explorer/ContextMenu';

interface SharedFileListProps {
    fetchingFiles: boolean;
    filteredFiles: any[];
    subPath: string;
    setSubPath: (path: string) => void;
    shareInfo: any;
    handleDownload: (file: any) => void;
    setPropertiesFile: (file: any) => void;
    viewPreview: (file: any) => void;
    setSearchQuery: (query: string) => void;
}

const SharedFileList: React.FC<SharedFileListProps> = ({
    fetchingFiles,
    filteredFiles,
    subPath,
    setSubPath,
    shareInfo,
    handleDownload,
    setPropertiesFile,
    viewPreview,
    setSearchQuery
}) => {
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, file: any } | null>(null);
    const [sortBy, setSortBy] = useState<string>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const handleContextMenu = (e: React.MouseEvent, file: any) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, file });
    };

    const handleContextMenuAction = (action: string, file: any) => {
        switch (action) {
            case 'preview':
                viewPreview(file);
                break;
            case 'download':
                handleDownload(file);
                break;
            case 'properties':
                setPropertiesFile(file);
                break;
            case 'goto':
                if (file.displayPath) {
                    // Extract parent path: "folder/sub/file.txt" -> "folder/sub"
                    const parts = file.displayPath.split('/');
                    const parentPath = parts.slice(0, -1).join('/');
                    setSubPath(parentPath);
                    setSearchQuery('');
                }
                break;
            default:
                break;
        }
    };

    const isPreviewable = (name: string) => {
        const ext = name.split('.').pop()?.toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'mp4', 'webm', 'txt'].includes(ext || '');
    };
    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getSortedFiles = () => {
        return [...filteredFiles].sort((a, b) => {
            let valA: any;
            let valB: any;

            if (sortBy === 'name') {
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
            } else if (sortBy === 'type') {
                valA = (a.type === 'directory' ? 'folder' : 'file') + (a.name.split('.').pop() || '');
                valB = (b.type === 'directory' ? 'folder' : 'file') + (b.name.split('.').pop() || '');
            } else if (sortBy === 'size') {
                valA = a.size || 0;
                valB = b.size || 0;
            } else if (sortBy === 'mtime') {
                valA = a.mtime || 0;
                valB = b.mtime || 0;
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const sortedFiles = getSortedFiles();

    const toggleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const getFileIcon = (file: any) => {
        if (file.type === 'directory') return <Folder size={22} className="text-[var(--icon-folder)]" fill="currentColor" fillOpacity={0.2} />;
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) return <FileText size={22} className="text-rose-500" />;
        if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) return <ImageIcon size={22} className="text-emerald-500" />;
        if (['js', 'ts', 'html', 'css', 'py', 'java', 'cpp'].includes(ext)) return <FileCode size={22} className="text-amber-500" />;
        return <FileIcon size={22} className="text-[var(--primary)]" />;
    };

    if (fetchingFiles) {
        return (
            <div className="flex flex-col items-center justify-center flex-1 py-32 animate-fade">
                <div className="relative mb-6">
                    <Search className="animate-pulse text-indigo-500" size={64} />
                    <div className="absolute inset-0 blur-2xl bg-indigo-500/10 rounded-full"></div>
                </div>
                <p className="text-[var(--text-muted)] font-bold tracking-widest uppercase text-xs">Reading directory data...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[var(--bg-dark)]/50">
            {/* Header */}
            <div
                className="grid px-4 sm:px-8 py-4 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-70 select-none sticky top-0 z-10 glass bg-[var(--bg-dark)] shadow-sm border-b border-[var(--border)] items-center"
                style={{
                    gridTemplateColumns: `minmax(0, 1fr) ${window.innerWidth <= 768 ? '40px' : '110px'}`,
                    gap: '12px'
                }}
            >
                {/* Header Columns */}
                <div className="contents md:grid md:grid-cols-[minmax(0,1fr)_120px_100px_180px] md:gap-6">
                    <div className="flex items-center gap-3 cursor-pointer hover:text-[var(--primary)] transition-colors" onClick={() => toggleSort('name')}>
                        <div className="w-8 sm:w-10 flex-none" />
                        <span>File Name</span>
                        {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </div>
                    <div className="hidden md:flex items-center gap-1 cursor-pointer hover:text-[var(--primary)] transition-colors" onClick={() => toggleSort('type')}>
                        <span>Type</span>
                        {sortBy === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </div>
                    <div className="hidden md:flex items-center gap-1 cursor-pointer hover:text-[var(--primary)] transition-colors" onClick={() => toggleSort('size')}>
                        <span>Size</span>
                        {sortBy === 'size' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </div>
                    <div className="hidden md:flex items-center gap-1 cursor-pointer hover:text-[var(--primary)] transition-colors" onClick={() => toggleSort('mtime')}>
                        <span>Date Modified</span>
                        {sortBy === 'mtime' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </div>
                </div>
                <div className="text-right">Actions</div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                {sortedFiles.length === 0 ? (
                    <div className="py-20 text-center text-[var(--text-muted)] animate-fade">
                        <div className="bg-[var(--nav-hover)] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 opacity-30">
                            <Search size={32} />
                        </div>
                        <p className="text-lg font-black text-[var(--text-main)] mb-1">No items found</p>
                        <p className="text-xs">This directory is currently empty.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1 p-2 sm:p-4">
                        {sortedFiles.map((file, i) => (
                            <div
                                key={i}
                                className="grid px-3 sm:px-8 py-3 rounded-xl sm:rounded-2xl border border-transparent hover:bg-[var(--nav-hover)]/40 hover:shadow-md transition-all duration-300 cursor-pointer group/item items-center"
                                style={{
                                    gridTemplateColumns: `minmax(0, 1fr) ${window.innerWidth <= 768 ? '40px' : '110px'}`,
                                    gap: '12px'
                                }}
                                onDoubleClick={(e) => {
                                    e.preventDefault();
                                    if (file.type === 'file' && isPreviewable(file.name)) {
                                        viewPreview(file);
                                    }
                                }}
                                onClick={() => {
                                    if (file.type === 'directory') {
                                        const newPath = file.searchSubPath || (subPath ? `${subPath}/${file.name}` : file.name);
                                        setSubPath(newPath);
                                        // If it was a search result, clear search to show the folder contents
                                        if (file.searchSubPath) setSearchQuery('');
                                    }
                                }}
                                onContextMenu={(e) => handleContextMenu(e, file)}
                            >
                                {/* Left Side: Content Wrapper */}
                                <div className="contents md:grid md:grid-cols-[minmax(0,1fr)_120px_100px_180px] md:gap-6 items-center min-w-0">
                                    {/* Column 1: Icon + Name */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="relative flex-none">
                                            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl transition-all duration-300">
                                                {getFileIcon(file)}
                                            </div>
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[8px] sm:text-[15px] font-bold text-[var(--text-main)] transition-colors group-hover/item:text-[var(--primary)] truncate" title={file.name}>
                                                {file.name}
                                            </span>
                                            {/* Path / Subtitle */}
                                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                                {file.displayPath && (
                                                    <>
                                                        <span className="text-[9px] font-medium text-[var(--primary)] opacity-80 truncate max-w-[150px]" title={file.displayPath}>
                                                            {file.displayPath.split('/').slice(0, -1).join('/') || '/'}
                                                        </span>
                                                        <span className="text-[9px] text-[var(--text-muted)] opacity-50">•</span>
                                                    </>
                                                )}
                                                <span className="text-[9px] font-black text-[var(--text-muted)] uppercase shrink-0">
                                                    {file.type === 'directory' ? 'Folder' : (file.name.split('.').pop()?.toUpperCase() || 'File')}
                                                </span>
                                                <span className="text-[9px] text-[var(--text-muted)] opacity-50 hidden sm:inline">•</span>
                                                <span className="text-[9px] font-bold text-[var(--text-muted)] truncate hidden sm:inline">
                                                    {file.type === 'directory' ? '-' : formatSize(file.size)}
                                                </span>
                                                <div className="md:hidden flex items-center gap-0.5 ml-1">
                                                    {isPreviewable(file.name) && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); viewPreview && viewPreview(file); }}
                                                            className="p-1 rounded bg-[var(--primary)]/10 text-[var(--primary)]"
                                                        >
                                                            <Eye size={10} />
                                                        </button>
                                                    )}
                                                    {shareInfo.permissions !== 'View' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                                                            className="p-1 rounded bg-emerald-500/10 text-emerald-500"
                                                        >
                                                            <Download size={10} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 2: Type (Desktop) */}
                                    <div className="hidden md:block text-[12px] font-semibold text-[var(--text-muted)] capitalize">
                                        {file.type === 'directory' ? 'Folder' : (file.name.split('.').pop()?.toUpperCase() || 'File')}
                                    </div>

                                    {/* Column 3: Size (Desktop) */}
                                    <div className="hidden md:block text-[12px] font-semibold text-[var(--text-muted)]">
                                        {file.type === 'directory' ? '-' : formatSize(file.size)}
                                    </div>

                                    <div className="hidden md:flex flex-col justify-center">
                                        <span className="text-[12px] font-bold text-[var(--text-main)]">
                                            {new Date(file.mtime * 1000).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                        <span className="text-[10px] text-[var(--text-muted)] font-medium">
                                            {new Date(file.mtime * 1000).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')}
                                        </span>
                                    </div>
                                </div>

                                {/* Column 5: Actions */}
                                <div className="flex items-center justify-end gap-0.5">
                                    {isPreviewable(file.name) && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); viewPreview && viewPreview(file); }}
                                            className="hidden md:flex p-1.5 sm:p-2 rounded-lg text-[var(--text-muted)] hover:text-sky-500 hover:bg-sky-500/10 transition-colors"
                                            title="Preview"
                                        >
                                            <Eye size={16} />
                                        </button>
                                    )}
                                    {shareInfo.permissions !== 'View' && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                                            className="hidden md:flex p-1.5 sm:p-2 rounded-lg text-[var(--text-muted)] hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                                            title="Download"
                                        >
                                            <Download size={16} />
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setPropertiesFile(file); }}
                                        className="p-1.5 sm:p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
                                        title="Properties"
                                    >
                                        <MoreVertical size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    file={contextMenu.file}
                    user={{ role: shareInfo.permissions === 'View' ? 'viewer' : 'user' }}
                    activeView="shared"
                    isFavorite={false}
                    onClose={() => setContextMenu(null)}
                    onAction={handleContextMenuAction}
                    isPreviewable={isPreviewable}
                />
            )}
        </div>
    );
};

export default SharedFileList;
