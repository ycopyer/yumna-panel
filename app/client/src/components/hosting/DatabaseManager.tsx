import React, { useState } from 'react';
import { Database, Plus, Search, Layers, HardDrive, Settings, Hash, User, ExternalLink } from 'lucide-react';
import DatabaseManagementModal from '../modals/DatabaseManagementModal';

interface DatabaseManagerProps {
    databases: any[];
    loading: boolean;
    onRefresh: () => void;
    onAddDatabase: () => void;
}

const DatabaseManager: React.FC<DatabaseManagerProps> = ({ databases, loading, onRefresh, onAddDatabase }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDb, setSelectedDb] = useState<any | null>(null);

    const filteredDbs = databases.filter(db =>
        db.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        db.user.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex-1 flex flex-col h-full bg-[var(--bg-dark)]/50">
            {/* Header / Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-dark)]/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                        <Database size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-[var(--text-main)] tracking-tight">Databases</h2>
                        <p className="text-[11px] font-bold text-[var(--text-muted)]">Manage MySQL Databases & Privileges</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                        <input
                            placeholder="Search databases..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl py-2 pl-9 pr-4 text-xs font-bold text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all w-48 focus:w-64"
                        />
                    </div>
                    <a
                        href="http://localhost:8090"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95"
                    >
                        <ExternalLink size={14} />
                        <span className="hidden sm:inline">phpMyAdmin</span>
                    </a>
                    <button
                        onClick={onAddDatabase}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:brightness-110 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-[var(--primary)]/20 active:scale-95"
                    >
                        <Plus size={14} />
                        <span className="hidden sm:inline">Add Database</span>
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center animate-fade">
                        <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin mb-4" />
                        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Loading Databases...</p>
                    </div>
                ) : filteredDbs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center animate-fade">
                        <div className="p-6 rounded-[24px] bg-[var(--bg-card)] border border-[var(--border)] mb-4">
                            <Database size={48} className="text-[var(--text-muted)] opacity-20" />
                        </div>
                        <h3 className="text-sm font-black text-[var(--text-main)] mb-1">No Databases Found</h3>
                        <p className="text-xs text-[var(--text-muted)]">Create your first database to get started.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredDbs.map(db => (
                            <div key={db.id} className="group relative bg-[var(--bg-card)] rounded-[24px] border border-[var(--border)] hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300 overflow-hidden">

                                {/* Card Header */}
                                <div className="p-6 pb-4 flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 flex items-center justify-center border border-amber-500/10 group-hover:scale-110 transition-transform duration-300">
                                            <Database size={20} className="text-amber-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-[var(--text-main)] group-hover:text-amber-500 transition-colors cursor-pointer truncate max-w-[150px]" title={db.name}>
                                                {db.name}
                                            </h3>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <User size={10} className="text-[var(--text-muted)]" />
                                                <span className="text-[10px] font-bold text-[var(--text-muted)] truncate max-w-[120px]" title={db.user}>{db.user}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-2.5 py-1 rounded-lg bg-[var(--bg-dark)] border border-[var(--border)]">
                                        <span className="text-[10px] font-black text-[var(--text-muted)]">{db.size_mb || 0} MB</span>
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-px bg-[var(--border)] bg-opacity-30 border-y border-[var(--border)]">
                                    <div className="bg-[var(--bg-card)] p-3 flex flex-col items-center justify-center hover:bg-[var(--bg-dark)]/30 transition-colors">
                                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Tables</span>
                                        <span className="text-sm font-black text-[var(--text-main)] flex items-center gap-1.5">
                                            <Layers size={12} className="text-amber-500" /> {db.table_count || 0}
                                        </span>
                                    </div>
                                    <div className="bg-[var(--bg-card)] p-3 flex flex-col items-center justify-center hover:bg-[var(--bg-dark)]/30 transition-colors">
                                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Collation</span>
                                        <span className="text-[10px] font-black text-[var(--text-main)] flex items-center gap-1.5 truncate max-w-full px-2 text-center">
                                            utf8mb4
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="p-4 bg-[var(--bg-dark)]/30 flex items-center gap-2">
                                    <button
                                        onClick={() => setSelectedDb(db)}
                                        className="flex-1 py-2.5 rounded-xl bg-[var(--bg-card)] hover:bg-amber-500 hover:text-white border border-[var(--border)] hover:border-amber-500 text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] transition-all flex items-center justify-center gap-2 group/btn"
                                    >
                                        <Settings size={12} className="group-hover/btn:rotate-90 transition-transform" />
                                        Manage
                                    </button>
                                    <a
                                        href={`http://localhost:8090/index.php?db=${db.name}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2.5 rounded-xl bg-[var(--bg-card)] hover:bg-blue-500 hover:text-white border border-[var(--border)] hover:border-blue-500 text-[var(--text-muted)] transition-all flex items-center justify-center group/pma"
                                        title="Open in phpMyAdmin"
                                    >
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedDb && (
                <DatabaseManagementModal
                    database={selectedDb}
                    onClose={() => setSelectedDb(null)}
                    onRefresh={() => {
                        onRefresh();
                        setSelectedDb(null);
                    }}
                />
            )}
        </div>
    );
};

export default DatabaseManager;
