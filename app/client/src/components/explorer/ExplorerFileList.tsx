import React from 'react';
import { Loader2, Folder } from 'lucide-react';
import FileItem from './FileItem';

interface ExplorerFileListProps {
    loading: boolean;
    filteredFiles: any[];
    searchQuery: string;
    isSearchActive: boolean;
    activeView: string;
    viewMode: 'grid' | 'list';
    selectedFiles: string[];
    favorites: any[];
    path: string;
    user: any;
    sortConfig: any;
    handleFolderClick: (file: any) => void;
    toggleSelect: (file: any) => void;
    toggleFavorite: (file: any) => void;
    downloadFile: (file: any) => void;
    viewPreview: (file: any, editMode?: boolean) => void;
    isPreviewable: (fileName: string) => boolean;
    setShareFile: (file: any) => void;
    setRenameItem: (item: any) => void;
    deleteItem: (file: any) => void;
    setPropertiesItem: (item: any) => void;
    formatSize: (bytes: number) => string;
    checkPdfContent: (file: any) => void;
    matchResults: any;
    handleContextMenu: (e: React.MouseEvent, file: any) => void;
    handleDrop: (e: React.DragEvent) => void;
    toggleSelectAll: () => void;
    requestSort: (key: string) => void;
    setManageWebsite: (website: any) => void;
    setShowWebsiteManagement: (show: boolean) => void;
    onOpenPath?: (path: string) => void;
}

const ExplorerFileList: React.FC<ExplorerFileListProps> = ({
    loading, filteredFiles, searchQuery, isSearchActive, activeView, viewMode,
    selectedFiles, favorites, path, user, sortConfig,
    handleFolderClick, toggleSelect, toggleFavorite, downloadFile, viewPreview,
    isPreviewable, setShareFile, setRenameItem, deleteItem, setPropertiesItem,
    formatSize, checkPdfContent, matchResults, handleContextMenu, handleDrop,
    toggleSelectAll, requestSort, setManageWebsite, setShowWebsiteManagement,
    onOpenPath
}) => {
    if (loading) {
        return (
            <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center animate-fade">
                <Loader2 className="animate-spin text-[var(--primary)] mb-4" size={56} />
                <p className="text-[var(--text-muted)] font-medium">Retrieving your data...</p>
            </div>
        );
    }

    if (filteredFiles.length === 0) {
        return (
            <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center animate-fade">
                <div className="p-8 rounded-full bg-[var(--nav-hover)] mb-6">
                    <Folder size={64} className="text-[var(--text-muted)] opacity-50" />
                </div>
                <p className="text-[var(--text-muted)] text-lg font-medium text-center max-w-md">
                    {searchQuery
                        ? `No results found for "${searchQuery}"`
                        : isSearchActive
                            ? `No global search results for "${searchQuery}"`
                            : activeView === 'drive'
                                ? 'This folder is empty or SFTP is not configured.'
                                : activeView === 'websites'
                                    ? 'No websites created yet. Add your first domain to get started.'
                                    : activeView === 'databases'
                                        ? 'No databases found. Create one to manage your data.'
                                        : activeView === 'dns'
                                            ? 'No DNS zones found. Add a domain to manage its records.'
                                            : activeView === 'shared'
                                                ? 'No files have been shared with you yet.'
                                                : activeView === 'php'
                                                    ? 'No PHP installations detected. Ensure PHP-FPM is running on the server.'
                                                    : 'No items found.'
                    }
                </p>
            </div>
        );
    }

    return (
        <div
            className={`${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6' : 'flex flex-col gap-1'}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
        >
            {viewMode === 'list' && (
                <div className="file-list-grid px-6 py-3 border-b border-[var(--border)] text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                    <div className="hide-mobile flex items-center justify-center">
                        {activeView === 'drive' && (
                            <input
                                type="checkbox"
                                checked={filteredFiles.length > 0 && filteredFiles.every(f => selectedFiles.includes(f.name))}
                                onChange={(e) => { e.stopPropagation(); toggleSelectAll(); }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] cursor-pointer transition-all"
                            />
                        )}
                    </div>
                    <button
                        onClick={() => requestSort('name')}
                        className="flex items-center gap-1.5 hover:text-[var(--text-main)] transition-colors"
                    >
                        {activeView === 'websites' ? 'List Website' : 'File Name'} {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </button>
                    <button
                        onClick={() => requestSort('type')}
                        className="hide-mobile flex items-center gap-1.5 hover:text-[var(--text-main)] transition-colors"
                    >
                        Type {sortConfig?.key === 'type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </button>
                    <button
                        onClick={() => requestSort('size')}
                        className="hide-mobile flex items-center gap-1.5 hover:text-[var(--text-main)] transition-colors"
                    >
                        Size {sortConfig?.key === 'size' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </button>
                    <button
                        onClick={() => requestSort('mtime')}
                        className="hide-mobile flex items-center gap-1.5 hover:text-[var(--text-main)] transition-colors"
                    >
                        Modified {sortConfig?.key === 'mtime' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </button>
                    <div className="hide-mobile flex items-center gap-1.5">
                        {activeView === 'websites' ? 'File Manager' : 'Content Check'}
                    </div>
                    <div className="text-right pr-4">Actions</div>
                </div>
            )}

            {filteredFiles.map((file, index) => (
                <FileItem
                    key={`${file.type}-${file.name}-${index}`}
                    file={file}
                    index={index}
                    viewMode={viewMode}
                    activeView={activeView}
                    selectedFiles={selectedFiles}
                    favorites={favorites}
                    path={path}
                    user={user}
                    handleFolderClick={handleFolderClick}
                    toggleSelect={toggleSelect}
                    toggleFavorite={toggleFavorite}
                    downloadFile={downloadFile}
                    viewPreview={viewPreview}
                    isPreviewable={isPreviewable}
                    setShareFile={setShareFile}
                    setRenameItem={setRenameItem}
                    deleteItem={deleteItem}
                    loading={loading}
                    setPropertiesItem={setPropertiesItem}
                    formatSize={formatSize}
                    checkPdfContent={checkPdfContent}
                    matchResults={matchResults}
                    onContextMenu={handleContextMenu}
                    onManageWebsite={(f) => {
                        setManageWebsite(f);
                        setShowWebsiteManagement(true);
                    }}
                    onOpenPath={onOpenPath}
                />
            ))}
        </div>
    );
};

export default ExplorerFileList;
