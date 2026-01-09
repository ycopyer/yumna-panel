import React, { useState } from 'react';
import { Server, Plus, Search, Key, FolderOpen, Activity, Lock, Unlock } from 'lucide-react';
import FTPManagementModal from '../modals/FTPManagementModal';
import CreateFTPModal from '../modals/CreateFTPModal';

interface FTPManagerProps {
    accounts: any[];
    loading: boolean;
    onRefresh: () => void;
    onAddAccount: () => void;
}

const FTPManager: React.FC<FTPManagerProps> = ({ accounts, loading, onRefresh, onAddAccount }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const filteredAccounts = accounts.filter(account =>
        account.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'text-green-500 bg-green-500/10 border-green-500/20';
            case 'suspended': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
            default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[var(--bg-dark)]/50">
            {/* Header / Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-dark)]/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
                        <Server size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-[var(--text-main)] tracking-tight">FTP Account Manager</h2>
                        <p className="text-[11px] font-bold text-[var(--text-muted)]">Create & Manage Restricted FTP Access</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                        <input
                            placeholder="Search accounts..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl py-2 pl-9 pr-4 text-xs font-bold text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all w-48 focus:w-64"
                        />
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:brightness-110 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95"
                    >
                        <Plus size={14} />
                        <span className="hidden sm:inline">Add FTP Account</span>
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center animate-fade">
                        <div className="w-12 h-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin mb-4" />
                        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Loading FTP Accounts...</p>
                    </div>
                ) : filteredAccounts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center animate-fade">
                        <div className="p-6 rounded-[24px] bg-[var(--bg-card)] border border-[var(--border)] mb-4">
                            <Server size={48} className="text-[var(--text-muted)] opacity-20" />
                        </div>
                        <h3 className="text-sm font-black text-[var(--text-main)] mb-1">No FTP Accounts Found</h3>
                        <p className="text-xs text-[var(--text-muted)]">Create your first FTP account for restricted file access.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredAccounts.map(account => (
                            <div key={account.id} className="group relative bg-[var(--bg-card)] rounded-[24px] border border-[var(--border)] hover:border-cyan-500/50 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-cyan-500/5">

                                {/* Card Header */}
                                <div className="p-6 pb-4 flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 flex items-center justify-center border border-cyan-500/10 group-hover:scale-110 transition-transform duration-300">
                                            <Key size={20} className="text-cyan-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-[var(--text-main)] group-hover:text-cyan-500 transition-colors cursor-pointer truncate max-w-[180px]" title={account.username}>
                                                {account.username}
                                            </h3>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                {account.status === 'active' ? (
                                                    <Unlock size={10} className="text-green-500" />
                                                ) : (
                                                    <Lock size={10} className="text-amber-500" />
                                                )}
                                                <span className={`text-[10px] font-bold uppercase tracking-tighter px-2 py-0.5 rounded border ${getStatusColor(account.status)}`}>
                                                    {account.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Path Info */}
                                <div className="px-6 py-3 border-y border-[var(--border)] bg-[var(--bg-dark)]/20">
                                    <div className="flex items-center gap-2">
                                        <FolderOpen size={10} className="text-[var(--text-muted)]" />
                                        <span className="text-[10px] font-bold text-[var(--text-muted)] truncate" title={account.rootPath}>
                                            {account.rootPath || '/home/ftp'}
                                        </span>
                                    </div>
                                    {account.description && (
                                        <p className="text-[9px] text-[var(--text-muted)] mt-1 italic truncate">
                                            {account.description}
                                        </p>
                                    )}
                                </div>

                                {/* Stats */}
                                <div className="px-6 py-3 bg-[var(--bg-dark)]/10 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <Activity size={10} className="text-[var(--text-muted)]" />
                                        <span className="text-[10px] font-bold text-[var(--text-muted)]">
                                            Created: {new Date(account.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="p-4 bg-[var(--bg-dark)]/30">
                                    <button
                                        onClick={() => setSelectedAccount(account)}
                                        className="w-full py-2.5 rounded-xl bg-[var(--bg-card)] hover:bg-cyan-600 hover:text-white border border-[var(--border)] hover:border-cyan-600 text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] transition-all flex items-center justify-center gap-2 group/btn"
                                    >
                                        <Key size={12} className="group-hover/btn:rotate-12 transition-transform" />
                                        Manage Account
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedAccount && (
                <FTPManagementModal
                    account={selectedAccount}
                    onClose={() => setSelectedAccount(null)}
                    onRefresh={() => {
                        onRefresh();
                        setSelectedAccount(null);
                    }}
                />
            )}

            {showCreateModal && (
                <CreateFTPModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        onRefresh();
                    }}
                />
            )}
        </div>
    );
};

export default FTPManager;
