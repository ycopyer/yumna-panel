import React from 'react';
import { Search, Download, Sun, Moon, FileText, LayoutGrid, List as ListIcon, Archive, Menu } from 'lucide-react';

interface ExplorerHeaderProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    searchType: 'name' | 'content';
    setSearchType: (type: 'name' | 'content') => void;
    performSearch: (query: string, type: 'name' | 'content') => void;
    user: any;
    selectedFiles: string[];
    downloadSelected: () => void;
    onCompress: () => void;
    toggleTheme: () => void;
    isDarkMode: boolean;
    downloadFileList: () => void;
    viewMode: 'grid' | 'list';
    setViewMode: (mode: 'grid' | 'list') => void;
    onOpenSettings: () => void;
    avatarUrl?: string;
    currentPath?: string;
    onToggleSidebar?: () => void;
    activeView?: string;
}

const ExplorerHeader: React.FC<ExplorerHeaderProps> = ({
    searchQuery,
    setSearchQuery,
    searchType,
    setSearchType,
    performSearch,
    user,
    selectedFiles,
    downloadSelected,
    onCompress,
    toggleTheme,
    isDarkMode,
    downloadFileList,
    viewMode,
    setViewMode,
    onOpenSettings,
    avatarUrl,
    currentPath,
    onToggleSidebar,
    activeView
}) => {
    // Only show compress button if we are NOT in a pure SFTP path
    // We assume paths starting with '/Local Storage' or root '/' allow compression (mixed or local)
    // If user navigates to /SFTP, hide it.
    // Also if specific custom SFTP name is used, we might need stricter check, 
    // but usually checking for '/Local Storage' or '/' is safer whitelist.

    // Logic: Show if path is '/' OR path starts with '/Local Storage'
    // This effectively hides it for '/SFTP' and deep links there.
    const canCompress = currentPath === '/' || currentPath?.startsWith('/Local Storage');

    return (
        <header className="flex items-center justify-between mb-6 md:mb-8 gap-2 md:gap-4">
            {/* Mobile Sidebar Toggle */}
            <button
                onClick={onToggleSidebar}
                className="p-2 -ml-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--nav-hover)] active:scale-95 transition-all md:hidden"
            >
                <Menu size={24} />
            </button>

            <div className="relative flex-1 max-w-2xl mr-2 md:mx-10 flex items-center gap-2">
                <div className="relative flex-1">
                    <Search
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] cursor-pointer hover:text-[var(--primary)] transition-colors"
                        size={18}
                        onClick={() => performSearch(searchQuery, searchType)}
                    />
                    <input
                        className="input-glass w-full pl-12 pr-4 rounded-xl h-11"
                        placeholder={
                            searchType === 'content' ? "Deep content search..." :
                                activeView === 'websites' ? "Search websites & domains..." :
                                    activeView === 'databases' ? "Search database names..." :
                                        activeView === 'dns' ? "Search DNS zones..." :
                                            "Search files globally..."
                        }
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && performSearch(searchQuery, searchType)}
                    />
                </div>
                <select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value as 'name' | 'content')}
                    className="h-11 rounded-xl bg-[var(--nav-hover)] border border-[var(--border)] text-[var(--text-main)] px-3 text-sm focus:outline-none cursor-pointer"
                    title="Search Mode"
                >
                    <option value="name">Name</option>
                    <option value="content">Content</option>
                </select>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-sm text-[var(--text-muted)] flex items-center">
                    {avatarUrl && (
                        <div className="mr-3 w-8 h-8 rounded-full overflow-hidden border border-[var(--primary)]/30 p-0.5">
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                        </div>
                    )}
                    <div>
                        Welcome back, <span className="font-semibold text-[var(--text-main)]">{user.username}</span>
                    </div>
                </div>
                {selectedFiles.length > 0 && (
                    <>
                        {canCompress && (
                            <button
                                className="bg-[var(--nav-hover)] hover:bg-[var(--primary)] hover:text-white text-[var(--text-main)] p-2.5 rounded-xl transition-all duration-200 active:scale-95 shadow-sm flex items-center justify-center border border-[var(--border)]"
                                onClick={onCompress}
                                title={`Compress ${selectedFiles.length} selected files`}
                            >
                                <Archive size={18} />
                            </button>
                        )}
                        <button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl transition-all duration-200 active:scale-95 shadow-sm flex items-center justify-center"
                            onClick={downloadSelected}
                            title={`Download ${selectedFiles.length} selected files`}
                        >
                            <Download size={18} />
                        </button>
                    </>
                )}
                <div className="flex items-center bg-[var(--nav-hover)] border border-[var(--border)] rounded-xl p-1 shadow-sm">
                    <button
                        onClick={toggleTheme}
                        className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--nav-hover)] rounded-lg transition-colors cursor-pointer"
                        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    <div className="w-px h-6 bg-[var(--border)] mx-1"></div>

                    <button
                        onClick={downloadFileList}
                        className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--nav-hover)] rounded-lg transition-colors cursor-pointer"
                        title="Export Directory Map (.txt)"
                    >
                        <FileText size={18} />
                    </button>

                    <div className="w-px h-6 bg-[var(--border)] mx-1"></div>

                    <div className="flex gap-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all cursor-pointer ${viewMode === 'grid'
                                ? 'bg-[var(--primary)] text-white shadow-sm'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--nav-hover)]'
                                }`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all cursor-pointer ${viewMode === 'list'
                                ? 'bg-[var(--primary)] text-white shadow-sm'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--nav-hover)]'
                                }`}
                        >
                            <ListIcon size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};


export default ExplorerHeader;
