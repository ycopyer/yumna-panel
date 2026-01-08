import React from 'react';
import { ChevronRight, Globe, Database, Server as ServerIcon } from 'lucide-react';

interface ExplorerBreadcrumbsProps {
    activeView: string;
    path: string;
    fetchFiles: (path: string) => void;
    clearRecentFiles: () => void;
    setShowAddWebsite: (show: boolean) => void;
    setShowAddDatabase: (show: boolean) => void;
    setShowAddDNS: (show: boolean) => void;
}

const ExplorerBreadcrumbs: React.FC<ExplorerBreadcrumbsProps> = ({
    activeView, path, fetchFiles, clearRecentFiles,
    setShowAddWebsite, setShowAddDatabase, setShowAddDNS
}) => {
    return (
        <div className="flex items-center gap-2 text-lg font-medium">
            {activeView === 'drive' ? (
                <div className="flex items-center flex-wrap gap-1">
                    <span
                        className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer transition-colors"
                        onClick={() => fetchFiles('/')}
                    >
                        My Drive
                    </span>
                    {path !== '/' && path.split('/').filter(Boolean).map((part, i, arr) => (
                        <React.Fragment key={i}>
                            <ChevronRight size={16} className="text-[var(--border)] opacity-60" />
                            <span
                                className={`cursor-pointer transition-colors ${i === arr.length - 1 ? 'text-[var(--text-main)] font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                                onClick={() => fetchFiles('/' + arr.slice(0, i + 1).join('/'))}
                            >
                                {part}
                            </span>
                        </React.Fragment>
                    ))}
                </div>
            ) : (
                <span className="text-[var(--text-main)] font-bold">
                    {activeView === 'shared' && 'Shared with me'}
                    {activeView === 'recent' && (
                        <div className="flex items-center gap-4">
                            <span>Recent Files</span>
                            <button
                                onClick={clearRecentFiles}
                                className="px-3 py-1 text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-full border border-red-500/20 transition-all font-bold uppercase tracking-wider"
                            >
                                Clear History
                            </button>
                        </div>
                    )}
                    {activeView === 'documents' && 'Document Library'}
                    {activeView === 'favorites' && 'Pinned Favorites'}
                    {activeView === 'websites' && (
                        <div className="flex items-center gap-4">
                            <span>Websites & Virtual Hosts</span>
                            <button
                                onClick={() => setShowAddWebsite(true)}
                                className="px-4 py-2 bg-[var(--primary)] text-white text-xs font-black rounded-full hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 uppercase tracking-wider"
                            >
                                <Globe size={14} /> New Website
                            </button>
                        </div>
                    )}
                    {activeView === 'databases' && (
                        <div className="flex items-center gap-4">
                            <span>Database Management</span>
                            <button
                                onClick={() => setShowAddDatabase(true)}
                                className="px-4 py-2 bg-amber-500 text-white text-xs font-black rounded-full hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 uppercase tracking-wider"
                            >
                                <Database size={14} /> Add Database
                            </button>
                        </div>
                    )}
                    {activeView === 'dns' && (
                        <div className="flex items-center gap-4">
                            <span>DNS Zone Editor</span>
                            <button
                                onClick={() => setShowAddDNS(true)}
                                className="px-4 py-2 bg-rose-500 text-white text-xs font-black rounded-full hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 uppercase tracking-wider"
                            >
                                <ServerIcon size={14} /> New DNS Zone
                            </button>
                        </div>
                    )}
                </span>
            )}
        </div>
    );
};

export default ExplorerBreadcrumbs;
