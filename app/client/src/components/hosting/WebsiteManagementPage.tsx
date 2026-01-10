import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    ArrowLeft, Globe, Folder, Cpu, Loader2, Link2, Plus, Trash2,
    AlertTriangle, ShieldCheck, Scale, History, Power, Package,
    FileCode, Lock, Terminal, RefreshCw, ShieldAlert, Activity,
    ExternalLink, Save, X, CheckCircle, XCircle, Clock, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import IPAccessControlManager from '../security/IPAccessControlManager';
import GitManager from './GitManager';
import { GitBranch as GitIcon } from 'lucide-react';

interface WebsiteManagementPageProps {
    website: any;
    userId: number;
    userRole: string;
    onBack: () => void;
    onRefresh: () => void;
    onOpenPath: (path: string) => void;
    initialTab?: 'general' | 'subdomains' | 'config' | 'ssl' | 'logs' | 'apps' | 'files' | 'advanced' | 'ip-access' | 'git';
}

const WebsiteManagementPage: React.FC<WebsiteManagementPageProps> = ({
    website,
    userId,
    userRole,
    onBack,
    onRefresh,
    onOpenPath,
    initialTab
}) => {
    const [activeTab, setActiveTab] = useState<'general' | 'subdomains' | 'config' | 'ssl' | 'logs' | 'apps' | 'files' | 'advanced' | 'ip-access' | 'git'>(initialTab || 'general');
    const [subdomains, setSubdomains] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Settings State
    const [rootPath, setRootPath] = useState(website.rootPath);
    const [phpVersion, setPhpVersion] = useState(website.phpVersion || website.php || '8.2');
    const [webStack, setWebStack] = useState(website.webStack || 'nginx');
    const [status, setStatus] = useState<'active' | 'suspended'>(website.status || 'active');
    const [maintenanceMode, setMaintenanceMode] = useState(!!website.maintenance_mode);

    // Config State
    const [rawConfig, setRawConfig] = useState('');
    const [configType, setConfigType] = useState('nginx');

    // Logs State
    const [logs, setLogs] = useState('');
    const [logType, setLogType] = useState<'access' | 'error'>('access');

    // New Subdomain State
    const [newSub, setNewSub] = useState({ prefix: '', rootPath: '' });

    // Admin Ownership State
    const [websiteOwner, setWebsiteOwner] = useState<number>(website.userId);
    const [users, setUsers] = useState<any[]>([]);

    const isAdmin = userRole === 'admin';

    useEffect(() => {
        if (activeTab === 'subdomains') fetchSubdomains();
        if (activeTab === 'config') fetchConfig();
        if (activeTab === 'logs') fetchLogs();
        if (activeTab === 'advanced' && isAdmin) fetchUsers();
    }, [activeTab, website.id]);

    const fetchUsers = async () => {
        try {
            const res = await axios.get('/api/users');
            setUsers(res.data);
        } catch (err) {
            console.error('Failed to fetch users');
        }
    };

    const fetchSubdomains = async () => {
        try {
            const res = await axios.get(`/api/websites/${website.id}/subdomains`);
            setSubdomains(res.data);
        } catch (err) {
            console.error('Failed to fetch subdomains');
        }
    };

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/websites/${website.id}/config`);
            setRawConfig(res.data.config);
            setConfigType(res.data.type);
        } catch (err: any) {
            setRawConfig('# Configuration not found');
        } finally {
            setLoading(false);
        }
    };

    const saveConfig = async () => {
        setActionLoading('saving-config');
        try {
            await axios.put(`/api/websites/${website.id}/config`, { config: rawConfig, type: configType });
            alert('Configuration saved and server reloaded');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to save config');
        } finally {
            setActionLoading(null);
        }
    };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/websites/${website.id}/logs`, { params: { logType } });
            setLogs(res.data.logs);
        } catch (err) {
            setLogs('No logs available.');
        } finally {
            setLoading(false);
        }
    };

    const handleIssueSSL = async () => {
        if (!confirm('Issue Let\'s Encrypt SSL for ' + website.domain + '?')) return;
        setActionLoading('ssl');
        try {
            const res = await axios.post(`/api/websites/${website.id}/ssl`);
            alert(res.data.message);
        } catch (err: any) {
            alert(err.response?.data?.error || 'SSL auto-issue failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleUpdateSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading('updating');
        try {
            await axios.put(`/api/websites/${website.id}`, { rootPath, phpVersion, webStack });
            onRefresh();
            alert('Settings updated successfully');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Update failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleToggleStatus = async () => {
        const nextStatus = status === 'active' ? 'suspended' : 'active';
        setActionLoading('status');
        try {
            await axios.put(`/api/websites/${website.id}/status`, { status: nextStatus });
            setStatus(nextStatus);
            onRefresh();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to toggle status');
        } finally {
            setActionLoading(null);
        }
    };

    const handleToggleMaintenance = async () => {
        const nextState = !maintenanceMode;
        setActionLoading('maintenance');
        try {
            await axios.put(`/api/websites/${website.id}/maintenance`, { enabled: nextState });
            setMaintenanceMode(nextState);
            onRefresh();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to toggle maintenance mode');
        } finally {
            setActionLoading(null);
        }
    };

    const handleAddSubdomain = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading('adding-sub');
        const fullDomain = `${newSub.prefix}.${website.domain}`;
        try {
            await axios.post('/api/subdomains', {
                websiteId: website.id,
                domain: fullDomain,
                rootPath: newSub.rootPath || `${website.rootPath}/${newSub.prefix}`,
                phpVersion
            });
            setNewSub({ prefix: '', rootPath: '' });
            fetchSubdomains();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to add subdomain');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteSub = async (id: number) => {
        if (!confirm('Are you sure you want to delete this subdomain?')) return;
        setActionLoading(`deleting-sub-${id}`);
        try {
            await axios.delete(`/api/subdomains/${id}`);
            fetchSubdomains();
        } catch (err) {
            alert('Delete failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleTransferOwnership = async () => {
        if (!confirm('Are you sure you want to transfer this website to another user?')) return;
        setActionLoading('transfer');
        try {
            await axios.put(`/api/websites/${website.id}/owner`, { targetUserId: websiteOwner });
            alert('Ownership transferred successfully');
            onRefresh();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Transfer failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteWebsite = async () => {
        if (!confirm(`CRITICAL: Are you sure you want to delete ${website.domain}? This will remove all configurations.`)) return;
        setActionLoading('deleting-web');
        try {
            await axios.delete(`/api/websites/${website.id}`);
            onRefresh();
            onBack();
        } catch (err) {
            alert('Deletion failed');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#080808] text-white">
            {/* Master Terminal Header */}
            <div className="sticky top-0 z-[50] bg-black/60 backdrop-blur-xl border-b border-white/5 shadow-2xl">
                <div className="px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-8">
                            <button
                                onClick={onBack}
                                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all group"
                            >
                                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                            </button>

                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-500/5">
                                    <Globe size={28} className="text-indigo-400" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h1 className="text-2xl font-black tracking-tight">{website.domain}</h1>
                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                            {status}
                                        </span>
                                    </div>
                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mt-1">Operational Node Vector • ID_{website.id}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => window.open(`http://${website.domain}`, '_blank')}
                                className="flex items-center gap-3 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-indigo-600/20"
                            >
                                <ExternalLink size={16} /> global live-view
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tactical Tabs */}
                <div className="px-8 flex gap-1 overflow-x-auto scrollbar-hide border-t border-white/[0.02]">
                    {[
                        { id: 'general', icon: Globe, label: 'Core Intel' },
                        { id: 'subdomains', icon: Link2, label: 'Logic Relays' },
                        { id: 'files', icon: Folder, label: 'Data Store' },
                        { id: 'git', icon: GitIcon, label: 'Git Stream' },
                        { id: 'config', icon: FileCode, label: 'Config Matrix' },
                        { id: 'ssl', icon: Lock, label: 'Crypto Shield' },
                        { id: 'ip-access', icon: ShieldAlert, label: 'IP Defense' },
                        { id: 'logs', icon: Terminal, label: 'Event Logs' },
                        { id: 'apps', icon: Package, label: 'Registry' },
                        { id: 'advanced', icon: ShieldCheck, label: 'Advanced' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-5 font-black text-[10px] uppercase tracking-widest transition-all relative ${activeTab === tab.id
                                ? 'text-indigo-400'
                                : 'text-white/30 hover:text-white/60'
                                }`}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 rounded-t-full shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Matrix Viewport */}
            <div className="p-12">
                <div className="max-w-7xl mx-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {activeTab === 'general' && (
                                <div className="space-y-10">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        {[
                                            { label: 'Status', value: status, icon: <Activity />, color: status === 'active' ? 'text-emerald-400' : 'text-rose-400' },
                                            { label: 'Engine', value: 'PHP ' + phpVersion, icon: <Cpu />, color: 'text-indigo-400' },
                                            { label: 'Encryption', value: website.sslEnabled ? 'ACTIVE' : 'NONE', icon: <Lock />, color: website.sslEnabled ? 'text-emerald-400' : 'text-white/20' },
                                            { label: 'Sync State', value: maintenanceMode ? 'PAUSED' : 'LIVE', icon: <Zap />, color: maintenanceMode ? 'text-amber-400' : 'text-emerald-400' }
                                        ].map((stat, i) => (
                                            <div key={i} className="bg-white/[0.02] border border-white/5 rounded-[32px] p-8 group hover:bg-white/[0.04] transition-all">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="text-white/20 group-hover:text-indigo-400 transition-colors">{stat.icon}</div>
                                                    <span className="text-[9px] font-black text-white/10 uppercase tracking-[0.2em]">{stat.label}</span>
                                                </div>
                                                <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <form onSubmit={handleUpdateSettings} className="space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-8 space-y-4">
                                                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                                                    <Folder size={12} /> Root Path Access
                                                </label>
                                                <div className="flex gap-3">
                                                    <input
                                                        value={rootPath}
                                                        onChange={e => setRootPath(e.target.value)}
                                                        className="flex-1 bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all font-mono"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenPath(rootPath)}
                                                        className="px-6 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/5 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all"
                                                    >
                                                        <Folder size={16} /> Open
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-8 space-y-4">
                                                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                                                    <Cpu size={12} /> Runtime Engine Version
                                                </label>
                                                <select
                                                    value={phpVersion}
                                                    onChange={e => setPhpVersion(e.target.value)}
                                                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:border-indigo-500/50 appearance-none transition-all uppercase tracking-widest"
                                                >
                                                    <option value="8.4" style={{ background: '#0a0a0a' }}>PHP 8.4 STABLE</option>
                                                    <option value="8.3" style={{ background: '#0a0a0a' }}>PHP 8.3 CURRENT</option>
                                                    <option value="8.2" style={{ background: '#0a0a0a' }}>PHP 8.2 LEGACY</option>
                                                    <option value="8.1" style={{ background: '#0a0a0a' }}>PHP 8.1 LTS</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
                                            <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-8 space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                                                        <RefreshCw size={12} /> Web Server Stack Architecture
                                                    </label>
                                                    <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-[8px] font-black uppercase tracking-widest">High Availability</span>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    {[
                                                        { id: 'nginx', label: 'NGINX ONLY', desc: 'Ultra-fast static performance', icon: <Zap size={16} /> },
                                                        { id: 'apache', label: 'APACHE ONLY', desc: 'Maximum compatibility (.htaccess)', icon: <Scale size={16} /> },
                                                        { id: 'hybrid', label: 'HYBRID STACK', desc: 'Nginx Proxy + Apache Backend', icon: <RefreshCw size={16} /> }
                                                    ].map(stack => (
                                                        <button
                                                            key={stack.id}
                                                            type="button"
                                                            onClick={() => setWebStack(stack.id)}
                                                            className={`p-6 rounded-[24px] border transition-all text-left flex flex-col gap-3 group relative overflow-hidden ${webStack === stack.id
                                                                    ? 'bg-indigo-600/10 border-indigo-500/40 text-white'
                                                                    : 'bg-black/40 border-white/5 text-white/40 hover:border-white/20'
                                                                }`}
                                                        >
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${webStack === stack.id ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-white/30 group-hover:bg-white/10'
                                                                }`}>
                                                                {stack.icon}
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase tracking-widest">{stack.label}</p>
                                                                <p className="text-[9px] font-bold opacity-40 mt-1">{stack.desc}</p>
                                                            </div>
                                                            {webStack === stack.id && (
                                                                <motion.div layoutId="stack-active" className="absolute top-4 right-4 animate-pulse">
                                                                    <CheckCircle size={16} className="text-indigo-400" />
                                                                </motion.div>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-8 flex items-center justify-between">
                                            <div className="space-y-1">
                                                <h4 className="text-sm font-black text-white uppercase tracking-widest">Maintenance Mode</h4>
                                                <p className="text-[10px] font-bold text-white/20 uppercase tracking-tighter">Force 503 SIG_ABORT for all external requests</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleToggleMaintenance}
                                                className={`w-16 h-8 rounded-full transition-all relative ${maintenanceMode ? 'bg-indigo-600' : 'bg-white/10'}`}
                                            >
                                                <motion.div animate={{ x: maintenanceMode ? 32 : 4 }} className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg" />
                                            </button>
                                        </div>

                                        <div className="flex gap-4">
                                            <button
                                                type="submit"
                                                disabled={!!actionLoading}
                                                className="flex-1 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                                            >
                                                {actionLoading === 'updating' ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                                Synchronize Settings
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleToggleStatus}
                                                className={`px-10 py-5 rounded-[24px] border font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${status === 'active'
                                                    ? 'border-rose-500/20 bg-rose-500/5 text-rose-500 hover:bg-rose-500/10'
                                                    : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500 hover:bg-emerald-500/10'
                                                    }`}
                                            >
                                                <Power size={18} />
                                                {status === 'active' ? 'Suspend' : 'Resume'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {activeTab === 'subdomains' && (
                                <div className="space-y-8 max-w-4xl mx-auto">
                                    <div className="bg-white/[0.02] border border-white/5 rounded-[40px] p-10">
                                        <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-8">Register Local Relay</h3>
                                        <form onSubmit={handleAddSubdomain} className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="relative group">
                                                    <input
                                                        placeholder="subdomain"
                                                        value={newSub.prefix}
                                                        onChange={e => setNewSub({ ...newSub, prefix: e.target.value })}
                                                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 pr-32 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all font-mono"
                                                    />
                                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20 uppercase tracking-widest">.{website.domain}</span>
                                                </div>
                                                <input
                                                    placeholder="Custom Target Path (Optional)"
                                                    value={newSub.rootPath}
                                                    onChange={e => setNewSub({ ...newSub, rootPath: e.target.value })}
                                                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all font-mono"
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-600/10 transition-all active:scale-95 flex items-center justify-center gap-3"
                                            >
                                                <Plus size={18} /> Initialize Sub-Node
                                            </button>
                                        </form>
                                    </div>

                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-4">Active Routing Matrix</p>
                                        {subdomains.length === 0 ? (
                                            <div className="bg-white/[0.01] border border-white/5 border-dashed rounded-[40px] p-20 text-center">
                                                <Link2 size={48} className="text-white/10 mx-auto mb-4" />
                                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">No active sub-relays found.</p>
                                            </div>
                                        ) : (
                                            <div className="grid gap-4">
                                                {subdomains.map(sub => (
                                                    <div key={sub.id} className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex items-center justify-between hover:bg-white/[0.04] transition-all group">
                                                        <div className="flex items-center gap-6">
                                                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                                                <Link2 size={20} />
                                                            </div>
                                                            <div>
                                                                <p className="text-lg font-black text-white tracking-tight">{sub.domain}</p>
                                                                <p className="text-[10px] font-mono text-white/30 truncate max-w-md">{sub.rootPath}</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteSub(sub.id)}
                                                            className="p-4 rounded-2xl text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Trash2 size={20} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'files' && (
                                <div className="bg-white/[0.02] border border-white/5 rounded-[60px] p-24 text-center max-w-3xl mx-auto backdrop-blur-sm">
                                    <div className="w-24 h-24 rounded-[32px] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-indigo-500/10">
                                        <Folder size={48} className="text-indigo-400" />
                                    </div>
                                    <h3 className="text-3xl font-black text-white mb-4 tracking-tight">DATA STORE CONSOLE</h3>
                                    <p className="text-white/30 text-sm mb-12 italic leading-relaxed">
                                        Direct access into the node's underlying file structure. Secure binary transmit enabled.
                                    </p>
                                    <button
                                        onClick={() => onOpenPath(website.rootPath)}
                                        className="px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-indigo-600/20 hover:shadow-indigo-500/40 transition-all flex items-center gap-4 mx-auto active:scale-95"
                                    >
                                        <Folder size={20} /> Launch File Explorer
                                    </button>
                                </div>
                            )}

                            {activeTab === 'config' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 px-5 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                                            <AlertTriangle size={18} className="text-rose-500" />
                                            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">DANGER: HARDWARE OVERRIDE</span>
                                        </div>
                                        <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">ENGINE_{configType.toUpperCase()}</span>
                                    </div>
                                    <div className="relative group">
                                        <textarea
                                            value={rawConfig}
                                            onChange={e => setRawConfig(e.target.value)}
                                            spellCheck={false}
                                            className="w-full h-[650px] bg-black/60 border border-white/5 rounded-[40px] p-10 text-indigo-400 font-mono text-sm leading-relaxed outline-none focus:border-indigo-500/50 transition-all resize-none shadow-inner scrollbar-thin scrollbar-thumb-white/10"
                                        />
                                        <div className="absolute top-10 right-10 text-white/5 pointer-events-none uppercase font-black text-6xl tracking-tighter select-none">{configType}</div>
                                    </div>
                                    <button
                                        onClick={saveConfig}
                                        disabled={!!actionLoading}
                                        className="w-full py-6 bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-[0.3em] rounded-[32px] shadow-2xl shadow-rose-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-4"
                                    >
                                        {actionLoading === 'saving-config' ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
                                        Override System Parameters
                                    </button>
                                </div>
                            )}

                            {activeTab === 'ssl' && (
                                <div className="space-y-6 max-w-4xl mx-auto">
                                    <div className="bg-gradient-to-br from-indigo-900/40 to-transparent border border-white/5 rounded-[60px] p-20 relative overflow-hidden group">
                                        <div className="absolute -top-10 -right-10 p-10 text-white/5 rotate-12 group-hover:rotate-0 transition-all duration-1000">
                                            <Lock size={300} />
                                        </div>
                                        <div className="relative z-10 space-y-8">
                                            <div className="w-20 h-20 bg-emerald-500/10 rounded-[32px] flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-xl">
                                                <ShieldCheck size={40} />
                                            </div>
                                            <div>
                                                <h3 className="text-4xl font-black text-white tracking-tighter mb-4">CRYPTO SHIELD ENCRYPTION</h3>
                                                <p className="text-white/40 text-lg max-w-xl leading-relaxed italic">
                                                    Deploy institutional-grade Let's Encrypt™ SSL certificates with automated renewal sequences.
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleIssueSSL}
                                                disabled={!!actionLoading}
                                                className="px-12 py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-2xl shadow-emerald-900/20 active:scale-95 transition-all flex items-center gap-4 text-xs uppercase tracking-widest"
                                            >
                                                {actionLoading === 'ssl' ? <Loader2 size={24} className="animate-spin" /> : <ShieldCheck size={24} />}
                                                Initialize Verification Sequence
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'git' && (
                                <div className="max-w-6xl mx-auto">
                                    <GitManager
                                        websiteId={website.id}
                                        userId={userId}
                                        defaultDeployPath={website.rootPath}
                                    />
                                </div>
                            )}

                            {activeTab === 'logs' && (
                                <div className="space-y-6">
                                    <div className="flex gap-4">
                                        {[
                                            { id: 'access', label: 'Access Stream', color: 'indigo' },
                                            { id: 'error', label: 'Fault Logs', color: 'rose' }
                                        ].map(l => (
                                            <button
                                                key={l.id}
                                                onClick={() => setLogType(l.id as any)}
                                                className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${logType === l.id
                                                    ? `bg-${l.color}-600 text-white shadow-lg shadow-${l.color}-600/20`
                                                    : 'bg-white/5 text-white/30 hover:bg-white/10'
                                                    }`}
                                            >
                                                {l.label}
                                            </button>
                                        ))}
                                        <button
                                            onClick={fetchLogs}
                                            className="ml-auto p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/30 transition-all active:scale-90"
                                        >
                                            <RefreshCw size={20} className={loading ? 'animate-spin text-indigo-400' : ''} />
                                        </button>
                                    </div>
                                    <div className="bg-[#050505] border border-white/5 rounded-[40px] p-10 h-[650px] overflow-auto shadow-inner">
                                        <pre className="text-white/60 font-mono text-[11px] leading-relaxed whitespace-pre-wrap selection:bg-indigo-500/40">{logs || 'Waiting for log transmission...'}</pre>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'apps' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {[
                                        { id: 'wp', name: 'WordPress', color: 'blue', icon: 'M60.48 259.9c0-67.5 40.2-126.3 98.4-153.5L81.78 322c-13.6-19.4-21.3-42.8-21.3-62.1zm416.3-51.4c.8 4.2 1.3 8.5 1.3 12.9c0 40.2-16.1 76.5-42.1 102.7l-98.3-287c47.7 26 83.9 69.3 103.1 120.7l36 50.7zm-146.4-56l-37.4 110.8l-40-118H219.7l64.6 179l-72.3 198.6c13.7 3.3 28.1 5 42.8 5c25.4 0 49.3-5.2 71.3-14.7L426 152.5h-95.6zM277.5 24.1c117.8 0 215.1 86 232.7 198.8h.1L450.7 75.3c-23-28.8-54-50.6-89.6-61.6c-17.5-5.3-36.1-8.3-55.5-8.3c-28.5 0-55.6 6.5-80.1 18.2c-3.1-4.7-5.9-9.5-8-14.4zm-14.3 0c26.1-13 55.6-20.3 86.8-20.3c27.1 0 53.1 5.6 77.2 15.8L370.5 119l-92.4 256.7L186.2 119l-38.3 111.4l-75.1-224C108 30.2 150.3 54.3 186.2 54.3c15.2 0 30.1-2.9 44.1-8.1l32.9-72.4z', desc: 'Enterprise CMS Deployment' },
                                        { id: 'laravel', name: 'Laravel', color: 'rose', icon: 'M7.6 20.9l-2.4-8.8c.3.1.6.2.9.2 1.4 0 2.3-.9 2.3-2.3 0-1.4-.9-2.2-2.3-2.2-1.4 0-2.3.8-2.3 2.2 0 .6.2 1.2.6 1.6l2.1 7.6.7.3.4 1.4zm11-1.6l-3.2-11.4c.4-.2.6-.6.6-1.1 0-1.4-.9-2.2-2.3-2.2-1.4 0-2.3.8-2.3 2.2 0 .6.2 1.2.6 1.6l2.3 7.8-3.2 11c.2 0 .5.1.8.1 1.4 0 2.3-.9 2.3-2.3 0-1.2-.6-1.9-1.4-2.2l1.6-4.9h.8l3.4 1.4z', desc: 'Modern App Architecture', coming: true }
                                    ].map(app => (
                                        <div key={app.id} className="bg-white/[0.02] border border-white/5 rounded-[48px] p-10 hover:bg-white/[0.04] transition-all group overflow-hidden relative">
                                            <div className="relative z-10 space-y-6">
                                                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-2xl">
                                                    <svg viewBox="0 0 512 512" className={`w-12 h-12 fill-${app.color === 'blue' ? '[#21759b]' : '[#FF2D20]'}`}>
                                                        <path d={app.icon} />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h4 className="text-2xl font-black text-white tracking-tight">{app.name}</h4>
                                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">{app.desc}</p>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        if (app.coming) return;
                                                        if (confirm(`Begin ${app.name} installation?`)) {
                                                            setActionLoading(`installing-${app.id}`);
                                                            try {
                                                                await axios.post(`/api/websites/${website.id}/install`, { appType: app.name });
                                                                alert(`${app.name} installed successfully!`);
                                                            } catch (err: any) {
                                                                alert(err.response?.data?.error);
                                                            } finally {
                                                                setActionLoading(null);
                                                            }
                                                        }
                                                    }}
                                                    disabled={!!actionLoading || app.coming}
                                                    className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl ${app.coming ? 'bg-white/5 text-white/20 cursor-not-allowed' : `bg-${app.color === 'blue' ? 'blue' : 'rose'}-600 text-white hover:brightness-110 active:scale-95`}`}
                                                >
                                                    {app.coming ? 'Coming Soon' : `Deploy ${app.name} Node`}
                                                </button>
                                            </div>
                                            <div className="absolute -right-12 -bottom-12 p-10 opacity-[0.02] group-hover:opacity-[0.05] group-hover:scale-110 transition-all duration-1000 rotate-12">
                                                <Package size={250} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'ip-access' && (
                                <div className="max-w-5xl mx-auto">
                                    <IPAccessControlManager websiteId={website.id} domain={website.domain} />
                                </div>
                            )}

                            {activeTab === 'advanced' && (
                                <div className="space-y-10 max-w-4xl mx-auto">
                                    <div className="bg-rose-500/5 border border-rose-500/20 rounded-[48px] p-12 relative overflow-hidden group">
                                        <div className="absolute -top-12 -right-12 p-10 text-rose-500/5 rotate-12 group-hover:rotate-0 transition-all duration-1000">
                                            <Trash2 size={250} />
                                        </div>
                                        <div className="relative z-10 space-y-8">
                                            <div className="w-20 h-20 bg-rose-500/10 rounded-[32px] flex items-center justify-center text-rose-500 border border-rose-500/20 shadow-xl">
                                                <Trash2 size={40} />
                                            </div>
                                            <div>
                                                <h3 className="text-3xl font-black text-white tracking-tighter mb-4">CRITICAL: PURGE NODE</h3>
                                                <p className="text-rose-500/60 text-lg leading-relaxed italic max-w-xl">
                                                    Irreversible destruction of the virtual host configuration. Data persistence depends on manual preservation.
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleDeleteWebsite}
                                                disabled={!!actionLoading}
                                                className="px-12 py-5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl shadow-2xl shadow-rose-900/40 active:scale-95 transition-all text-xs uppercase tracking-[0.2em]"
                                            >
                                                Execute Deletion Command
                                            </button>
                                        </div>
                                    </div>

                                    {isAdmin && (
                                        <div className="bg-white/[0.02] border border-white/5 rounded-[48px] p-12 space-y-8">
                                            <div className="flex items-center gap-6">
                                                <div className="w-16 h-16 bg-indigo-500/10 rounded-3xl flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-xl">
                                                    <Scale size={32} />
                                                </div>
                                                <div>
                                                    <h3 className="text-2xl font-black text-white tracking-tight">Authority Transfer</h3>
                                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">Reassign Ownership to Different Identity</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <select
                                                    value={websiteOwner}
                                                    onChange={e => setWebsiteOwner(Number(e.target.value))}
                                                    className="flex-1 bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none appearance-none uppercase tracking-widest"
                                                >
                                                    {users.map(u => (
                                                        <option key={u.id} value={u.id} style={{ background: '#0a0a0a' }}>{u.username.toUpperCase()} [{u.role.toUpperCase()}]</option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={handleTransferOwnership}
                                                    disabled={actionLoading === 'transfer'}
                                                    className="px-10 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-900/20 transition-all text-[10px] uppercase tracking-widest active:scale-95"
                                                >
                                                    {actionLoading === 'transfer' ? <Loader2 size={20} className="animate-spin" /> : 'Confirm Transfer'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default WebsiteManagementPage;
