import React, { useState } from 'react';
import { Server, Shield, Search, Power, Check, RefreshCw, Puzzle, FileEdit, Activity, Plus, Folder, Trash2, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface PHPVersionManagerProps {
    versions: any[];
    loading: boolean;
    onRefresh: () => void;
    onAddVersion: () => void;
    onInstallExtensions: (version?: string) => void;
    onEditConfig: (version?: string) => void;
    onInstallVersion: (version: string) => Promise<boolean>;
    onUninstallVersion: (v: any) => Promise<boolean>;
    onSetDefault: (v: any) => Promise<boolean>;
    phpOperations: Record<string, any>;
}

const PHPVersionManager: React.FC<PHPVersionManagerProps> = ({
    versions, loading, onRefresh, onAddVersion, onInstallExtensions,
    onEditConfig, onInstallVersion, onUninstallVersion, onSetDefault, phpOperations
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const filteredVersions = versions.filter(v =>
        v && v.version && v.version.toLowerCase().includes(searchQuery.toLowerCase())
    );


    const handleAction = async (v: any, action: string) => {
        setActionLoading(`${v.version}-${action}`);
        try {
            if (action === 'set-default') {
                await onSetDefault(v);
            } else {
                await axios.post('/api/php/restart', {
                    version: v.version,
                    full_version: v.full_version
                }, {
                    headers: { 'x-user-id': localStorage.getItem('userId') }
                });
                onRefresh();
            }
        } catch (err: any) {
            alert(err.response?.data?.error || `Action ${action} failed.`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleUninstall = async (v: any) => {
        setActionLoading(`${v.version}-uninstall`);
        try {
            await onUninstallVersion(v);
            onRefresh();
        } finally {
            setActionLoading(null);
        }
    };

    // Combine existing versions and active operations for unified grid display
    const opVersions = Object.keys(phpOperations);
    const regularVersions = filteredVersions.filter(v => !phpOperations[v.version]);

    return (
        <div className="flex-1 flex flex-col h-full bg-[var(--bg-dark)]/50">
            {/* Top Insight Card */}
            <div className="p-6">
                <div className="p-10 glass rounded-[2.5rem] border border-white/10 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-emerald-500/10 transition-colors"></div>
                    <div className="p-6 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 rounded-3xl border border-emerald-500/20 shadow-xl shadow-emerald-500/5 transition-transform group-hover:scale-110 duration-500">
                        <Shield className="text-emerald-500" size={48} />
                    </div>
                    <div className="flex-1 text-center md:text-left relative z-10">
                        <h2 className="text-3xl font-black text-[var(--text-main)] mb-2 tracking-tight">PHP Engine Management</h2>
                        <p className="text-[var(--text-muted)] max-w-xl text-lg font-medium leading-relaxed">
                            Fine-tune your server environment. Manage extensions, edit configurations, and monitor running PHP-FPM processes.
                        </p>
                        <div className="flex flex-wrap gap-4 mt-8">
                            <button className="btn-primary flex items-center gap-2.5 px-6 py-3.5 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 border border-emerald-500/50" onClick={onAddVersion}>
                                <Plus size={18} />
                                <span className="font-black uppercase tracking-wider text-xs">Deploy New Binary</span>
                            </button>
                            <button className="btn-secondary flex items-center gap-2.5 px-6 py-3.5 rounded-2xl border border-white/10 hover:border-amber-500/50 transition-all hover:scale-105 active:scale-95 bg-white/5" onClick={() => onEditConfig()}>
                                <FileEdit size={18} />
                                <span className="font-black uppercase tracking-wider text-xs text-white">Advanced INI Editor</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Version List Header */}
            <div className="flex items-center justify-between px-8 py-4 border-y border-white/5 bg-white/5 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                        <Activity size={18} />
                    </div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Available PHP Versions</h3>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-emerald-500 transition-colors" />
                        <input
                            placeholder="Filter versions..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all w-48 focus:w-64"
                        />
                    </div>
                    <button onClick={onRefresh} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all">
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {loading && filteredVersions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center animate-fade">
                        <RefreshCw className="animate-spin text-emerald-500 mb-4" size={40} />
                        <p className="text-xs font-black text-emerald-500/60 uppercase tracking-widest">Scanning Binaries...</p>
                    </div>
                ) : (filteredVersions.length === 0 && Object.keys(phpOperations).length === 0) ? (
                    <div className="h-full flex flex-col items-center justify-center animate-fade opacity-40">
                        <Server size={64} className="text-white mb-4" />
                        <p className="text-sm font-bold text-white uppercase tracking-widest">No PHP Installations Detected</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                        {/* 1. Show versions currently in operation (Integrated into grid) */}
                        {Object.entries(phpOperations).map(([v, op]) => (
                            <div key={`op-${v}`} className="glass rounded-[2rem] border border-emerald-500/30 bg-emerald-500/10 p-6 relative overflow-hidden flex flex-col justify-between">
                                <div className="absolute top-0 right-0 bg-emerald-500/20 text-emerald-500 text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">
                                    In Progress
                                </div>

                                <div className="flex items-center gap-5 mb-4">
                                    <div className="p-4 rounded-2xl bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 animate-spin-slow">
                                        <Loader2 size={24} className="animate-spin" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black text-white leading-tight">
                                            PHP {v}
                                        </h4>
                                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">
                                            {op.type === 'install' ? 'Initializing Deployment' : 'Decommissioning Engine'}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-auto">
                                    <div className="flex justify-between items-end mb-2">
                                        <p className="text-[10px] font-medium text-white/50 italic truncate max-w-[70%]">"{op.message}"</p>
                                        <span className="text-[10px] font-black text-emerald-500">{op.progress}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                        <div
                                            className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all duration-700 ease-out"
                                            style={{ width: `${op.progress}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-[9px] font-black text-emerald-500/40 uppercase tracking-tighter mt-2 text-center">
                                        System state: {op.status}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {/* 2. Show regular installed versions */}
                        {regularVersions.map((v) => (
                            <div key={v.version} className="glass group rounded-[2rem] border border-white/5 hover:border-emerald-500/30 transition-all p-6 relative overflow-hidden">
                                {v.is_default && (
                                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest shadow-lg">
                                        System Default
                                    </div>
                                )}

                                <div className="flex items-center gap-5 mb-6">
                                    <div className={`p-4 rounded-2xl ${v.status === 'running' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'} border border-white/5 group-hover:scale-110 transition-transform`}>
                                        <Server size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-lg font-black text-white leading-tight">PHP {v.version}</h4>
                                            {!v.is_default && (
                                                <button
                                                    onClick={() => handleUninstall(v)}
                                                    className="p-2 text-white/20 hover:text-red-500 transition-colors"
                                                    title="Uninstall Version"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className={`w-2 h-2 rounded-full ${v.status === 'running' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'} animate-pulse`}></div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${v.status === 'running' ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {v.status === 'running' ? 'Service Running' : 'Service Stopped'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => onInstallExtensions(v.full_version || v.version)}
                                        className="h-11 px-4 rounded-2xl bg-white/5 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 text-white hover:text-emerald-500 transition-all flex items-center justify-center group/btn"
                                        title="Manage Extensions"
                                    >
                                        <Puzzle size={16} className="group-hover/btn:rotate-12 transition-transform" />
                                    </button>

                                    <button
                                        onClick={() => onEditConfig(v.full_version || v.version)}
                                        className="h-11 px-4 rounded-2xl bg-white/5 hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 text-white hover:text-amber-500 transition-all flex items-center justify-center group/btn"
                                        title="Configure php.ini"
                                    >
                                        <FileEdit size={16} className="group-hover/btn:scale-110 transition-transform" />
                                    </button>

                                    <button
                                        onClick={() => handleAction(v, 'restart')}
                                        disabled={!!actionLoading}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 h-11 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] font-black uppercase tracking-widest text-white transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {actionLoading === `${v.version}-restart` ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                        Restart
                                    </button>

                                    {!v.is_default && (
                                        <button
                                            onClick={() => handleAction(v, 'set-default')}
                                            disabled={!!actionLoading}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 h-11 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/20 text-[11px] font-black uppercase tracking-widest text-emerald-500 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            {actionLoading === `${v.version}-set-default` ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                                            Set Default
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PHPVersionManager;
