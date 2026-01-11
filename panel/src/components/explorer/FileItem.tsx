import React from 'react';
import {
    Folder, File, FileText, Share2, Star, Download, ExternalLink, Edit3, Trash2, Info, HelpCircle, CheckCircle2, XCircle, Loader2, AlertCircle,
    Globe, Database, Server as ServerIcon, Shield, Settings, FileEdit, FormInput
} from 'lucide-react';

interface FileItemProps {
    file: any;
    index: number;
    viewMode: 'grid' | 'list';
    activeView: string;
    selectedFiles: string[];
    favorites: any[];
    path: string;
    user: any;
    handleFolderClick: (name: string, item: any) => void;
    toggleSelect: (name: string) => void;
    toggleFavorite: (file: any) => void;
    downloadFile: (file: any) => void;
    viewPreview: (file: any, editMode?: boolean) => void;
    isPreviewable: (name: string) => boolean;
    setShareFile: (file: any) => void;
    setRenameItem: (file: any) => void;
    deleteItem: (file: any) => void;
    loading: boolean;
    setPropertiesItem: (file: any) => void;
    formatSize: (size: number) => string;
    checkPdfContent: (file: any) => void;
    matchResults: Record<string, { loading: boolean, isMatch?: boolean, error?: string, identifier?: string }>;
    onContextMenu: (e: React.MouseEvent, file: any) => void;
    onManageWebsite?: (file: any) => void;
    onOpenPath?: (path: string) => void;
}

const FileItem: React.FC<FileItemProps> = ({
    file,
    index,
    viewMode,
    activeView,
    selectedFiles,
    favorites,
    path,
    user,
    handleFolderClick,
    toggleSelect,
    toggleFavorite,
    downloadFile,
    viewPreview,
    isPreviewable,
    setShareFile,
    setRenameItem,
    deleteItem,
    loading,
    setPropertiesItem,
    formatSize,
    checkPdfContent,
    matchResults,
    onContextMenu,
    onManageWebsite,
    onOpenPath
}) => {
    const isSelected = selectedFiles.includes(file.name);
    const itemFullPath = activeView === 'drive' ? (path === '/' ? `/${file.name}` : `${path}/${file.name}`) : (file as any).filePath;
    const isFavorite = favorites.some(fav => fav.filePath === itemFullPath);

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isTextFile = (['txt', 'md', 'log', 'json', 'xml', 'csv', 'js', 'ts', 'tsx', 'jsx', 'css', 'html', 'php', 'py', 'java', 'c', 'cpp', 'h', 'sql', 'sh', 'yaml', 'yml', 'env', 'gitignore', 'ini', 'conf'].includes(ext) || ['dockerfile', 'makefile', 'license'].includes(file.name.toLowerCase())) && file.type === 'file';

    const containerClasses = viewMode === 'list'
        ? `file-list-grid py-3.5 px-6 rounded-xl border border-transparent transition-all duration-200 cursor-pointer group/item ${isSelected
            ? 'bg-[var(--primary)]/10 border-[var(--primary)]/30 shadow-[inset_0_0_12px_rgba(99,102,241,0.05)]'
            : 'hover:bg-[var(--nav-hover)] hover:shadow-md'
        }`
        : `relative glass p-5 flex flex-col gap-4 rounded-2xl transition-all duration-300 cursor-pointer group/item animate-fade ${isSelected
            ? 'bg-[var(--nav-active)] border-[var(--primary)] shadow-[0_0_20px_rgba(99,102,241,0.15)] ring-1 ring-[var(--primary)]/20 scale-[1.02]'
            : 'hover:bg-[var(--nav-hover)] hover:scale-[1.03] hover:shadow-xl'
        }`;

    const formatPermissions = (mode: number, type: string) => {
        if (!mode) return '----------';
        const m = mode & 0o777;
        const s = (val: number) => {
            let r = '';
            r += (val & 4) ? 'r' : '-';
            r += (val & 2) ? 'w' : '-';
            r += (val & 1) ? 'x' : '-';
            return r;
        };
        return (type === 'directory' ? 'd' : '-') + s((m >> 6) & 7) + s((m >> 3) & 7) + s(m & 7);
    };

    const listGridStyle = {
        display: 'grid',
        gridTemplateColumns: window.innerWidth < 768
            ? '1fr auto'
            : '48px minmax(0, 1fr) 120px 100px 180px 120px 140px',
        gap: '1rem',
        alignItems: 'center'
    };

    return (
        <div
            className={containerClasses}
            onDoubleClick={(e) => {
                e.preventDefault();
                if (file.type === 'file' && isPreviewable(file.name)) {
                    viewPreview(file);
                }
            }}
            onClick={() => {
                if (activeView === 'websites') onManageWebsite?.(file);
                else if (file.type === 'directory') handleFolderClick(file.name, file);
                else if (activeView !== 'shared') toggleSelect(file.name);
            }}
            onContextMenu={(e) => onContextMenu(e, file)}
        >
            {/* Checkbox Column (List: Column 1, Grid: Absolute) */}
            <div className={`hide-mobile ${viewMode === 'list' ? 'flex items-center justify-center' : 'absolute top-4 right-4 z-10'}`}>
                {activeView === 'drive' && (
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => { e.stopPropagation(); toggleSelect(file.name); }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] cursor-pointer transition-transform group-hover/item:scale-110"
                    />
                )}
            </div>

            {/* Icon & Name (List: Column 2, Grid: Main Content) */}
            <div className={`flex items-center gap-4 min-w-0 ${viewMode === 'grid' ? 'flex-col items-start gap-2' : ''}`}>
                <div className="relative flex-none">
                    <div className={`flex items-center justify-center rounded-xl transition-all duration-300 ${viewMode === 'grid' ? 'w-14 h-14' : 'w-10 h-10'}`}>
                        {activeView === 'websites' ? (
                            <Globe size={viewMode === 'grid' ? 44 : 24} className="text-blue-500" />
                        ) : activeView === 'databases' ? (
                            <Database size={viewMode === 'grid' ? 44 : 24} className="text-amber-500" />
                        ) : activeView === 'dns' ? (
                            <ServerIcon size={viewMode === 'grid' ? 44 : 24} className="text-indigo-500" />
                        ) : file.type === 'directory' ? (
                            <Folder size={viewMode === 'grid' ? 44 : 24} className="text-[var(--icon-folder)]" fill="currentColor" fillOpacity={0.25} />
                        ) : file.name.endsWith('.pdf') ? (
                            <FileText size={viewMode === 'grid' ? 44 : 24} className="text-rose-500" fill="currentColor" fillOpacity={0.15} />
                        ) : (
                            <File size={viewMode === 'grid' ? 40 : 22} className="text-[var(--icon-file)] opacity-80" />
                        )}
                    </div>
                    {file.isShared && (
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1 border-2 border-[var(--bg-dark)] shadow-sm" title="Shared">
                            <Share2 size={8} className="text-white" />
                        </div>
                    )}
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="text-[15px] font-bold text-[var(--text-main)] transition-colors group-hover/item:text-[var(--primary)] truncate" title={file.name}>
                        {file.name}
                    </span>
                    {(activeView === 'websites' || activeView === 'databases' || activeView === 'dns') && (
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            {activeView === 'websites' && (
                                <>
                                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase ${file.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                        {file.status}
                                    </span>
                                    <span className="bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase">
                                        PHP {file.php}
                                    </span>
                                    {file.ssl && (
                                        <span className="bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase flex items-center gap-1">
                                            <Shield size={8} /> SSL
                                        </span>
                                    )}
                                </>
                            )}
                            {activeView === 'databases' && (
                                <>
                                    <span className="bg-[var(--nav-hover)] text-[var(--text-muted)] px-1.5 py-0.5 rounded-md text-[9px] font-bold">
                                        User: {file.db_user}
                                    </span>
                                    <span className="bg-[var(--nav-hover)] text-[var(--text-muted)] px-1.5 py-0.5 rounded-md text-[9px] font-bold">
                                        Host: {file.host}
                                    </span>
                                </>
                            )}
                            {activeView === 'dns' && (
                                <span className="bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase">
                                    {file.records} Records
                                </span>
                            )}
                        </div>
                    )}
                    {viewMode === 'grid' && (
                        <span className="text-[11px] text-[var(--text-muted)] font-medium">
                            {activeView === 'shared' && (file as any).sharedBy
                                ? `From: ${(file as any).sharedBy}`
                                : activeView === 'documents' || activeView === 'recent'
                                    ? (file as any).path
                                    : file.type === 'file' ? formatSize(file.size) : 'Folder'
                            }
                        </span>
                    )}
                </div>
            </div>

            {/* List View Details (Columns 3-6) */}
            {viewMode === 'list' && (
                <>
                    <div className="hide-mobile text-[12px] font-semibold text-[var(--text-muted)] capitalize">
                        {file.type === 'directory' ? 'Folder' : (file.name.split('.').pop()?.toUpperCase() || 'File')}
                    </div>
                    <div className="hide-mobile text-[13px] font-bold text-[var(--text-muted)] group-hover/item:text-[var(--text-main)]">
                        {file.type === 'file' ? formatSize(file.size) : <span className="opacity-20">—</span>}
                    </div>
                    <div className="hide-mobile flex flex-col gap-0.5">
                        <span className="text-[12px] font-bold text-[var(--text-main)] whitespace-nowrap">
                            {new Date(file.mtime * 1000).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] font-medium">
                            {new Date(file.mtime * 1000).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')}
                        </span>
                    </div>
                    {/* Column 7: Content Check / File Manager */}
                    <div className="hide-mobile flex items-center gap-2">
                        {activeView === 'websites' ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onOpenPath) onOpenPath(file.rootPath || file.path);
                                }}
                                className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all transform active:scale-95"
                                title={`Open files: ${file.rootPath || file.path}`}
                            >
                                <Folder size={18} />
                            </button>
                        ) : file.name.toLowerCase().endsWith('.pdf') ? (
                            matchResults[file.name] ? (
                                matchResults[file.name].loading ? (
                                    <div className="flex items-center gap-2 text-indigo-500 animate-pulse">
                                        <Loader2 size={16} className="animate-spin" />
                                        <span className="text-[11px] font-bold uppercase">Checking...</span>
                                    </div>
                                ) : matchResults[file.name].error ? (
                                    <div className="flex items-center gap-2 text-rose-500" title={matchResults[file.name].error}>
                                        <AlertCircle size={16} />
                                        <span className="text-[11px] font-bold uppercase">Failed</span>
                                    </div>
                                ) : (
                                    <div className={`flex items-center gap-2 ${matchResults[file.name].isMatch ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {matchResults[file.name].isMatch ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                        <span className="text-[11px] font-bold uppercase">
                                            {matchResults[file.name].isMatch ? 'Matched' : 'Mismatch'}
                                        </span>
                                    </div>
                                )
                            ) : (
                                <button
                                    onClick={(e) => { e.stopPropagation(); checkPdfContent(file); }}
                                    className="px-2 py-1 rounded bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-bold uppercase hover:bg-[var(--primary)] hover:text-white transition-all transform active:scale-95"
                                >
                                    Verify
                                </button>
                            )
                        ) : (
                            <span className="opacity-20 text-[11px] font-medium">—</span>
                        )}
                    </div>
                </>
            )}

            {/* Action Buttons */}
            <div className={`flex items-center gap-1 transition-all duration-200 ${viewMode === 'list'
                ? 'justify-end'
                : 'mt-auto pt-4 border-t border-[var(--border)]/50'
                }`}>
                {file.type === 'file' && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(file); }}
                            className={`p-1.5 rounded-lg transition-colors hover:bg-amber-500/10 ${isFavorite ? 'text-amber-500' : 'text-[var(--text-muted)] hover:text-amber-500'}`}
                            title="Add to Favorites"
                        >
                            <Star size={16} fill={isFavorite ? "currentColor" : "transparent"} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); downloadFile(file); }}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
                            title="Download"
                        >
                            <Download size={16} />
                        </button>
                        {isPreviewable(file.name) && (
                            <button
                                onClick={(e) => {
                                    console.log('[FileItem] Preview clicked:', file.name);
                                    e.stopPropagation();
                                    viewPreview(file);
                                }}
                                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                                title="Preview"
                            >
                                <ExternalLink size={16} />
                            </button>
                        )}
                    </>
                )}

                {user.role !== 'viewer' && activeView === 'drive' && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); setShareFile(file); }}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors"
                            title="Share"
                        >
                            <Share2 size={16} />
                        </button>
                        {isTextFile && (
                            <button
                                onClick={(e) => {
                                    console.log('[FileItem] Edit Content clicked:', file.name);
                                    e.stopPropagation();
                                    viewPreview(file, true);
                                }}
                                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                                title="Edit Content"
                            >
                                <FileEdit size={16} />
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); setRenameItem(file); }}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                            title="Rename"
                        >
                            <FormInput size={16} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); if (!loading) deleteItem(file); }}
                            className={`p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Delete"
                            disabled={loading}
                        >
                            <Trash2 size={16} />
                        </button>
                    </>
                )}

                <button
                    onClick={(e) => { e.stopPropagation(); setPropertiesItem(file); }}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
                    title="Properties"
                >
                    <Info size={16} />
                </button>

                {activeView === 'websites' && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            // We need to trigger management modal
                            if (onManageWebsite) onManageWebsite(file);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
                    >
                        <Settings size={14} /> Manage
                    </button>
                )}
            </div>

            {/* Admin Property Badge (Grid View only) */}
            {
                user.role === 'admin' && viewMode === 'grid' && (
                    <div className="mt-2 p-2 bg-black/10 rounded-lg border border-white/5 shadow-inner">
                        <div className="flex items-center gap-1.5 mb-1.5 font-bold text-[8px] uppercase tracking-widest text-[var(--primary)]">
                            <HelpCircle size={10} /> Admin Properties
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[9px] font-medium text-[var(--text-muted)]">
                            <div>Perms: <span className="text-[var(--text-main)] font-mono">{(file as any).permissions?.toString(8).slice(-4) || 'N/A'}</span></div>
                            <div>Owner: <span className="text-[var(--text-main)]">{(file as any).uid ?? '0'}:{(file as any).gid ?? '0'}</span></div>
                            <div className="col-span-2">Modified: <span className="text-[var(--text-main)]">{new Date(file.mtime * 1000).toLocaleDateString()}</span></div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};


export default FileItem;
