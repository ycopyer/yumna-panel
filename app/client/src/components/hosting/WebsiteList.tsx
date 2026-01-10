import React from 'react';
import {
    Globe,
    Settings,
    ExternalLink,
    FolderOpen,
    Shield,
    Activity,
    ChevronRight,
    Loader2,
    Plus,
    Database,
    Cpu,
    Lock,
    RefreshCw,
    Link2,
    Package,
    Trash2,
    Power
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Website {
    id?: number | string;
    name?: string;
    domain?: string;
    rootPath?: string;
    phpVersion?: string;
    webStack?: string;
    status?: string;
    sslEnabled?: boolean;
    createdAt?: string;
    owner?: string;
}

interface WebsiteListProps {
    websites: Website[];
    loading: boolean;
    onManageWebsite: (website: Website, tab?: string) => void;
    onAddWebsite: () => void;
    onOpenPath?: (path: string) => void;
}

const WebsiteList: React.FC<WebsiteListProps> = ({
    websites,
    loading,
    onManageWebsite,
    onAddWebsite,
    onOpenPath
}) => {
    if (loading) {
        return (
            <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-indigo-500 mb-4" size={56} />
                <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em]">Querying Cluster Nodes</p>
            </div>
        );
    }

    if (websites.length === 0) {
        return (
            <div className="flex-1 min-h-[500px] flex flex-col items-center justify-center p-12 text-center bg-white/[0.02] border border-white/5 border-dashed rounded-[48px]">
                <div className="p-8 rounded-full bg-white/[0.03] mb-6 shadow-inner">
                    <Globe size={64} className="text-white/10" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Satellite Array Empty</h3>
                <p className="text-white/30 text-sm max-w-md mb-8 leading-relaxed italic">
                    Establish your first node in the digital matrix. Deploy, scale, and secure your global infrastructure now.
                </p>
                <button
                    onClick={onAddWebsite}
                    className="flex items-center gap-3 px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-2xl shadow-indigo-600/20"
                >
                    <Plus size={20} />
                    Deploy New Node
                </button>
            </div>
        );
    }

    const getStatusMeta = (status: string) => {
        switch (status) {
            case 'active': return { color: 'emerald', label: 'Online' };
            case 'suspended': return { color: 'rose', label: 'Offline' };
            case 'maintenance': return { color: 'amber', label: 'Syncing' };
            default: return { color: 'white/40', label: 'Idle' };
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {websites.map((website, idx) => {
                const status = getStatusMeta(website.status || 'active');

                return (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={website.id}
                        whileHover={{ y: -10 }}
                        className="group relative bg-[#0D0D0D] border border-white/5 rounded-[40px] p-8 hover:border-indigo-500/30 transition-all duration-500 overflow-hidden"
                    >
                        {/* Status HUD */}
                        <div className="absolute top-8 right-8 flex items-center gap-2">
                            {website.sslEnabled && (
                                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                    <Lock size={12} />
                                </div>
                            )}
                            <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border bg-${status.color}-500/10 border-${status.color}-500/20 text-${status.color}`}>
                                {status.label}
                            </div>
                        </div>

                        {/* Node Identification */}
                        <div className="mb-8">
                            <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-indigo-500/20 to-indigo-900/10 flex items-center justify-center mb-6 ring-1 ring-white/10 group-hover:ring-indigo-500/50 transition-all">
                                <Globe size={32} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                            </div>
                            <h3 className="text-xl font-black text-white mb-2 truncate pr-20 tracking-tight">
                                {website.domain || website.name || 'ANONYMOUS-NODE'}
                            </h3>
                            <div className="flex items-center gap-2 text-white/20 font-mono text-[10px]">
                                <FolderOpen size={10} />
                                <span className="truncate">{website.rootPath || 'N/A'}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                    <Cpu size={10} /> Runtime
                                </p>
                                <p className="text-xs font-black text-white/60">PHP {website.phpVersion || 'N/A'}</p>
                            </div>
                            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                    <RefreshCw size={10} /> Stack
                                </p>
                                <p className="text-xs font-black text-white/60 uppercase">{website.webStack || 'Nginx'}</p>
                            </div>
                        </div>

                        {/* Control Interface */}
                        <div className="space-y-3 relative z-10">
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => website.domain && window.open(`http://${website.domain}`, '_blank')}
                                    className="flex items-center justify-center gap-2 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/5 transition-all active:scale-95 group/btn"
                                    disabled={!website.domain}
                                >
                                    <ExternalLink size={14} className="text-white/20 group-hover/btn:text-indigo-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Visit</span>
                                </button>
                                {onOpenPath && (
                                    <button
                                        onClick={() => website.rootPath && onOpenPath(website.rootPath)}
                                        className="flex items-center justify-center gap-2 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/5 transition-all active:scale-95 group/btn"
                                        disabled={!website.rootPath}
                                    >
                                        <Database size={14} className="text-white/20 group-hover/btn:text-emerald-400" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Store</span>
                                    </button>
                                )}
                            </div>

                            <div className="relative group/manage-btn">
                                <button
                                    onClick={() => onManageWebsite(website)}
                                    className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/10 transition-all hover:shadow-indigo-500/30"
                                >
                                    Management Console
                                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </button>

                                {/* Quick Actions Menu Overlay */}
                                <div className="absolute bottom-full left-0 right-0 mb-3 bg-[#111111] border border-white/5 rounded-3xl p-3 opacity-0 translate-y-4 pointer-events-none group-hover/manage-btn:opacity-100 group-hover/manage-btn:translate-y-0 group-hover/manage-btn:pointer-events-auto transition-all duration-300 shadow-2xl z-20 backdrop-blur-xl">
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { id: 'subdomains', label: 'Logic Relays', icon: Link2, color: 'text-amber-400' },
                                            { id: 'apps', label: 'App Installer', icon: Package, color: 'text-emerald-400' },
                                            { id: 'config', label: 'Config Matrix', icon: Settings, color: 'text-violet-400' },
                                            { id: 'ssl', label: 'Crypto Shield', icon: Lock, color: 'text-cyan-400' },
                                            { id: 'general', label: 'Stack & Power', icon: Cpu, color: 'text-sky-400' },
                                            { id: 'advanced', label: 'Destruction', icon: Trash2, color: 'text-rose-400' }
                                        ].map(action => (
                                            <button
                                                key={action.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onManageWebsite(website, action.id);
                                                }}
                                                className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 transition-all text-center group/action"
                                            >
                                                <action.icon size={16} className={`${action.color} group-hover/action:scale-110 transition-transform`} />
                                                <span className="text-[7px] font-black uppercase tracking-widest text-white/40">{action.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-white/5">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onManageWebsite(website, 'general'); }}
                                            className="w-full flex items-center justify-center gap-2 py-2 text-[8px] font-black uppercase tracking-widest text-white/20 hover:text-indigo-400 transition-all"
                                        >
                                            <Settings size={12} />
                                            Advanced Matrix Settings
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Background Flux */}
                        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-500/5 blur-[80px] group-hover:bg-indigo-500/10 transition-all pointer-events-none rounded-full" />
                    </motion.div>
                );
            })}
        </div>
    );
};

export default WebsiteList;
