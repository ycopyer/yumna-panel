import React, { useState, useEffect } from 'react';
import { X, Globe, Folder, Cpu, Loader2, Link2, Plus, Trash2, AlertTriangle, ShieldCheck, Scale, History, Power, Package, DownloadCloud, FileCode, Lock, Terminal, RefreshCw, ShieldAlert, Activity } from 'lucide-react';
import axios from 'axios';
import IPAccessControlManager from '../security/IPAccessControlManager';

interface WebsiteManagementModalProps {
    website: any;
    userId: number;
    onClose: () => void;
    onRefresh: () => void;
    onOpenPath: (path: string) => void;
    userRole: string;
    initialTab?: 'general' | 'subdomains' | 'config' | 'ssl' | 'logs' | 'apps' | 'files' | 'advanced' | 'ip-access';
}

const WebsiteManagementModal: React.FC<WebsiteManagementModalProps> = ({ website, userId, onClose, onRefresh, onOpenPath, userRole, initialTab = 'general' }) => {

    const [activeTab, setActiveTab] = useState<'general' | 'subdomains' | 'config' | 'ssl' | 'logs' | 'apps' | 'files' | 'advanced' | 'ip-access'>(initialTab);
    const [subdomains, setSubdomains] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Settings State
    const [rootPath, setRootPath] = useState(website.rootPath);
    const [phpVersion, setPhpVersion] = useState(website.phpVersion || '8.2');
    const [webStack, setWebStack] = useState<'nginx' | 'apache' | 'hybrid'>(website.webStack || 'nginx');
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

    // Installation Progress State
    const [installProgress, setInstallProgress] = useState<string[]>([]);
    const [showProgressModal, setShowProgressModal] = useState(false);

    const isAdmin = userRole === 'admin';


    useEffect(() => {
        if (activeTab === 'subdomains') fetchSubdomains();
        if (activeTab === 'config') fetchConfig();
        if (activeTab === 'logs') fetchLogs();
        if (activeTab === 'advanced' && isAdmin) fetchUsers();
    }, [activeTab, website.id]);

    const fetchUsers = async () => {
        try {
            const res = await axios.get('/api/users', { headers: { 'x-user-id': userId } });
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
            onClose();
        } catch (err) {
            alert('Deletion failed');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[1100] flex items-center justify-center p-4">
            <div className="glass w-full max-w-6xl rounded-3xl overflow-hidden border border-[var(--border)] shadow-2xl animate-scale-up flex flex-col h-[90vh]">

                {/* Modern Header with Gradient */}
                <div className="relative bg-gradient-to-r from-[var(--primary)] via-[var(--primary)]/80 to-[var(--primary)]/60 px-8 py-6 border-b border-white/10">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItMnptMC0ydjJoLTJ2LTJoMnptLTItMmgydjJoLTJ2LTJ6bTItMmgydjJoLTJ2LTJ6bTAtMmgydjJoLTJ2LTJ6bTItMmgydjJoLTJ2LTJ6bS0yLTJoMnYyaC0ydi0yem0yLTJoMnYyaC0ydi0yem0wLTJoMnYyaC0ydi0yem0yLTJoMnYyaC0ydi0yeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-xl">
                                <Globe size={32} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight">{website.domain}</h2>
                                <p className="text-sm font-bold text-white/60 mt-1">Website Management Console</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 ${status === 'active'
                                ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                }`}>
                                <span className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></span>
                                {status === 'active' ? 'Active' : 'Suspended'}
                            </div>
                            <button
                                onClick={onClose}
                                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Layout */}
                <div className="flex h-full min-h-0">
                    {/* Enhanced Sidebar */}
                    <div className="w-72 bg-[var(--bg-dark)] border-r border-[var(--border)] p-6 flex flex-col">
                        <div className="space-y-2 flex-1">
                            <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-wider px-3 mb-4">Navigation</p>
                            {[
                                { id: 'general', icon: Globe, label: 'Overview', color: 'indigo' },
                                { id: 'subdomains', icon: Link2, label: 'Subdomains', color: 'blue' },
                                { id: 'files', icon: Folder, label: 'File Manager', color: 'emerald' },
                                { id: 'config', icon: FileCode, label: 'Configuration', color: 'amber' },
                                { id: 'ssl', icon: Lock, label: 'SSL/TLS', color: 'green' },
                                { id: 'ip-access', icon: ShieldAlert, label: 'IP Control', color: 'purple' },
                                { id: 'logs', icon: Terminal, label: 'Logs', color: 'slate' },
                                { id: 'apps', icon: Package, label: 'Applications', color: 'cyan' },
                                { id: 'advanced', icon: ShieldCheck, label: 'Advanced', color: 'rose' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all group ${activeTab === tab.id
                                        ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20'
                                        : 'text-[var(--text-muted)] hover:bg-[var(--nav-hover)] hover:text-[var(--text-main)]'
                                        }`}
                                >
                                    <tab.icon size={18} className={activeTab === tab.id ? '' : 'opacity-60 group-hover:opacity-100'} />
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="mt-auto pt-6 border-t border-[var(--border)]">
                            <div className="p-4 bg-[var(--nav-hover)] rounded-xl mb-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <Activity size={14} className="text-[var(--primary)]" />
                                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Status</span>
                                </div>
                                <div className="text-lg font-black text-[var(--text-main)]">{status}</div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full py-3 rounded-xl bg-[var(--nav-hover)] hover:bg-[var(--border)] text-[var(--text-main)] font-bold text-sm transition-all"
                            >
                                Close Panel
                            </button>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-main)]">
                        <div className="p-8 pb-4 flex justify-between items-center">
                            <div>
                                <h4 className="text-xl font-black text-white">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Management</h4>
                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">Site Instance #{website.id}</p>
                            </div>
                            <div className="flex gap-2">
                                {activeTab === 'logs' && (
                                    <button onClick={fetchLogs} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 transition-all">
                                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                                    </button>
                                )}
                                <button onClick={onClose} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 transition-all">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
                            {activeTab === 'general' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="glass p-6 rounded-[24px] border border-white/5">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                                    <Folder size={18} className="text-indigo-400" />
                                                </div>
                                                <h5 className="text-sm font-black text-white uppercase tracking-tight">Root Path</h5>
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    value={rootPath}
                                                    onChange={e => setRootPath(e.target.value)}
                                                    className="flex-1 bg-black/40 border border-white/5 rounded-l-2xl py-3 px-4 text-white font-bold text-sm focus:border-indigo-500/50 outline-none transition-all"
                                                />
                                                <button
                                                    onClick={() => onOpenPath(rootPath)}
                                                    className="px-4 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-r-2xl hover:bg-indigo-500 hover:text-white transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                                >
                                                    <Folder size={14} /> Open Files
                                                </button>
                                            </div>

                                        </div>
                                        <div className="glass p-6 rounded-[24px] border border-white/5">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                                    <Cpu size={18} className="text-emerald-400" />
                                                </div>
                                                <h5 className="text-sm font-black text-white uppercase tracking-tight">PHP Environment</h5>
                                            </div>
                                            <select
                                                value={phpVersion}
                                                onChange={e => setPhpVersion(e.target.value)}
                                                className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 px-4 text-white font-bold text-sm focus:border-indigo-500/50 outline-none transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="8.4">PHP 8.4 (Experimental)</option>
                                                <option value="8.3">PHP 8.3 (Stable)</option>
                                                <option value="8.2">PHP 8.2 (Legacy Stable)</option>
                                                <option value="8.1">PHP 8.1</option>
                                                <option value="7.4">PHP 7.4 (End of Life)</option>
                                                <option value="5.6">PHP 5.6 (Vintage)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Web Stack Selection */}
                                    <div className="glass p-8 rounded-[32px] border border-white/5 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-8 text-indigo-500/5 rotate-12 transition-transform group-hover:rotate-0 duration-700">
                                            <RefreshCw size={120} />
                                        </div>
                                        <div className="relative z-10">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                                    <RefreshCw size={18} className="text-indigo-400" />
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-black text-white uppercase tracking-tight">Web Server Stack</h5>
                                                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">Choose your processing engine</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {[
                                                    { id: 'nginx', label: 'Nginx Only', desc: 'Lightweight & Fast' },
                                                    { id: 'apache', label: 'Apache Only', desc: '.htaccess Support' },
                                                    { id: 'hybrid', label: 'Nginx + Apache', desc: 'Speed + Compatibility' }
                                                ].map(stack => (
                                                    <button
                                                        key={stack.id}
                                                        type="button"
                                                        onClick={() => setWebStack(stack.id as any)}
                                                        className={`p-5 rounded-2xl border transition-all text-left ${webStack === stack.id
                                                            ? 'bg-indigo-500 border-indigo-400 shadow-lg shadow-indigo-500/20'
                                                            : 'bg-white/5 border-white/5 hover:border-white/10'
                                                            }`}
                                                    >
                                                        <p className={`text-xs font-black uppercase tracking-widest mb-1 ${webStack === stack.id ? 'text-white' : 'text-indigo-400'}`}>
                                                            {stack.label}
                                                        </p>
                                                        <p className={`text-[10px] font-bold ${webStack === stack.id ? 'text-white/70' : 'text-white/30'}`}>
                                                            {stack.desc}
                                                        </p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-white/5 rounded-[24px] border border-white/5 flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-bold text-white">Maintenance Mode</h4>
                                            <p className="text-[10px] text-white/40 font-bold mt-1">Force 503 Service Unavailable for all visitors.</p>
                                        </div>
                                        <button
                                            onClick={handleToggleMaintenance}
                                            disabled={!!actionLoading}
                                            className={`relative w-12 h-6 rounded-full transition-all duration-300 ${maintenanceMode ? 'bg-indigo-500' : 'bg-white/10'}`}
                                        >
                                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${maintenanceMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                        </button>
                                    </div>

                                    <div className="flex gap-3 mt-6">
                                        <button
                                            onClick={handleUpdateSettings}
                                            disabled={!!actionLoading}
                                            className="flex-1 py-4 bg-indigo-500 rounded-2xl text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/20 hover:brightness-110 active:scale-[0.98] transition-all"
                                        >
                                            {actionLoading === 'updating' ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Apply Environment Changes'}
                                        </button>
                                        <button
                                            onClick={handleToggleStatus}
                                            className={`p-4 rounded-2xl border transition-all ${status === 'active' ? 'border-rose-500/20 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'}`}
                                        >
                                            <Power size={20} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'subdomains' && (
                                <div className="space-y-8">
                                    <div className="p-6 bg-white/5 rounded-[24px] border border-white/5">
                                        <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-6">Add New Subdomain</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div className="relative">
                                                <input
                                                    placeholder="subdomain"
                                                    value={newSub.prefix}
                                                    onChange={e => setNewSub({ ...newSub, prefix: e.target.value })}
                                                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 px-4 text-white font-bold text-sm focus:border-indigo-500/50 outline-none"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-white/20">.{website.domain}</span>
                                            </div>
                                            <input
                                                placeholder="Custom Root (Optional)"
                                                value={newSub.rootPath}
                                                onChange={e => setNewSub({ ...newSub, rootPath: e.target.value })}
                                                className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 px-4 text-white font-bold text-sm focus:border-indigo-500/50 outline-none"
                                            />
                                        </div>
                                        <button onClick={handleAddSubdomain} className="w-full py-3.5 bg-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2">
                                            <Plus size={16} /> Create Sub-Host
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        <h5 className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Active Domains</h5>
                                        {subdomains.map(sub => (
                                            <div key={sub.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-white/20 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                                        <Link2 size={18} className="text-indigo-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white">{sub.domain}</p>
                                                        <p className="text-[10px] font-bold text-white/20 truncate max-w-[240px]">{sub.rootPath}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleDeleteSub(sub.id)} className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'config' && (
                                <div className="h-full flex flex-col space-y-4 min-h-[400px]">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                            <AlertTriangle size={12} className="text-amber-500" />
                                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">DANGEROUS: DIRECT CONFIG EDIT</span>
                                        </div>
                                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Engine: {configType.toUpperCase()}</span>
                                    </div>
                                    <textarea
                                        value={rawConfig}
                                        onChange={e => setRawConfig(e.target.value)}
                                        spellCheck={false}
                                        className="flex-1 bg-black/60 border border-white/5 rounded-2xl p-6 text-indigo-400 font-mono text-xs leading-relaxed outline-none focus:border-indigo-500/50 transition-all resize-none shadow-inner"
                                    />
                                    <button
                                        onClick={saveConfig}
                                        disabled={!!actionLoading}
                                        className="w-full py-4 bg-amber-500 text-black font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-amber-500/10 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                    >
                                        {actionLoading === 'saving-config' ? <Loader2 size={16} className="animate-spin" /> : <FileCode size={16} />}
                                        Override {configType.toUpperCase()} Configuration
                                    </button>
                                </div>
                            )}

                            {activeTab === 'logs' && (
                                <div className="h-full flex flex-col space-y-4 min-h-[400px]">
                                    <div className="flex gap-2">
                                        <button onClick={() => setLogType('access')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${logType === 'access' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>Access Logs</button>
                                        <button onClick={() => setLogType('error')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${logType === 'error' ? 'bg-rose-500 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>Error Logs</button>
                                    </div>
                                    <div className="flex-1 bg-black/60 border border-white/5 rounded-2xl p-6 overflow-auto custom-scrollbar shadow-inner">
                                        <pre className="text-white/60 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">{logs || 'No log data retrieved.'}</pre>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'ssl' && (
                                <div className="space-y-6">
                                    <div className="p-8 bg-indigo-500/10 rounded-[32px] border border-indigo-500/20 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 text-indigo-500/5 rotate-12">
                                            <Lock size={120} />
                                        </div>
                                        <div className="relative z-10">
                                            <h4 className="text-lg font-black text-white tracking-tight mb-2">Let's Encrypt™ SSL</h4>
                                            <p className="text-sm font-bold text-white/40 mb-8 max-w-md leading-relaxed">
                                                Secure your website with automated, free domain-validated SSL certificates. Valid for {website.domain} and www.{website.domain}.
                                            </p>
                                            <button
                                                onClick={handleIssueSSL}
                                                disabled={!!actionLoading}
                                                className="px-8 py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center gap-3"
                                            >
                                                {actionLoading === 'ssl' ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                                                Issue Free Certificate
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-white/5 rounded-[24px] border border-white/5 flex items-center justify-between opacity-50 cursor-not-allowed">
                                        <div className="flex items-center gap-4">
                                            <Plus size={20} className="text-white/20" />
                                            <div>
                                                <h5 className="text-sm font-bold text-white">Custom SSL Certificate</h5>
                                                <p className="text-[10px] font-bold text-white/20">Manual TXT/DNS validation</p>
                                            </div>
                                        </div>
                                        <span className="text-[9px] font-black bg-white/10 text-white/40 px-2 py-1 rounded-lg uppercase tracking-widest">Coming Soon</span>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'apps' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-8 bg-gradient-to-br from-blue-900/40 to-black rounded-[32px] border border-white/10 hover:border-blue-500/30 transition-all group cursor-pointer relative overflow-hidden">
                                        <div className="absolute -right-4 -bottom-4 text-white/5 rotate-12 group-hover:rotate-0 transition-all duration-700">
                                            <Package size={140} />
                                        </div>
                                        <div className="relative z-10">
                                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-500/20">
                                                <svg viewBox="0 0 512 512" className="w-9 h-9 fill-[#21759b]"><path d="M60.48 259.9c0-67.5 40.2-126.3 98.4-153.5L81.78 322c-13.6-19.4-21.3-42.8-21.3-62.1zm416.3-51.4c.8 4.2 1.3 8.5 1.3 12.9c0 40.2-16.1 76.5-42.1 102.7l-98.3-287c47.7 26 83.9 69.3 103.1 120.7l36 50.7zm-146.4-56l-37.4 110.8l-40-118H219.7l64.6 179l-72.3 198.6c13.7 3.3 28.1 5 42.8 5c25.4 0 49.3-5.2 71.3-14.7L426 152.5h-95.6zM277.5 24.1c117.8 0 215.1 86 232.7 198.8h.1L450.7 75.3c-23-28.8-54-50.6-89.6-61.6c-17.5-5.3-36.1-8.3-55.5-8.3c-28.5 0-55.6 6.5-80.1 18.2c-3.1-4.7-5.9-9.5-8-14.4zm-14.3 0c26.1-13 55.6-20.3 86.8-20.3c27.1 0 53.1 5.6 77.2 15.8L370.5 119l-92.4 256.7L186.2 119l-38.3 111.4l-75.1-224C108 30.2 150.3 54.3 186.2 54.3c15.2 0 30.1-2.9 44.1-8.1l32.9-72.4z" /></svg>
                                            </div>
                                            <h5 className="text-lg font-black text-white mb-2">WordPress CI</h5>
                                            <p className="text-xs font-bold text-white/40 mb-8 leading-relaxed">Auto-deploy latest WP core, database creation, and salt generation.</p>
                                            <button
                                                onClick={async () => {
                                                    if (confirm(`Install WordPress?`)) {
                                                        setActionLoading('installing-wp');
                                                        try { await axios.post(`/api/websites/${website.id}/install`, { appType: 'WordPress' }); alert('WP Ready!'); }
                                                        catch (err: any) { alert(err.response?.data?.error); } finally { setActionLoading(null); }
                                                    }
                                                }}
                                                disabled={!!actionLoading}
                                                className="w-full py-3.5 bg-blue-600 rounded-xl text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20"
                                            >
                                                Deploy Instance
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-8 bg-gradient-to-br from-red-900/40 to-black rounded-[32px] border border-white/10 hover:border-red-500/30 transition-all group cursor-pointer relative overflow-hidden">
                                        <div className="absolute -right-4 -bottom-4 text-white/5 rotate-12 group-hover:rotate-0 transition-all duration-700">
                                            <Package size={140} />
                                        </div>
                                        <div className="relative z-10">
                                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-red-500/20">
                                                <div className="w-9 h-9 flex items-center justify-center">
                                                    <svg viewBox="0 0 24 24" className="w-full h-full fill-[#FF2D20]"><path d="M7.6 20.9l-2.4-8.8c.3.1.6.2.9.2 1.4 0 2.3-.9 2.3-2.3 0-1.4-.9-2.2-2.3-2.2-1.4 0-2.3.8-2.3 2.2 0 .6.2 1.2.6 1.6l2.1 7.6.7.3.4 1.4zm11-1.6l-3.2-11.4c.4-.2.6-.6.6-1.1 0-1.4-.9-2.2-2.3-2.2-1.4 0-2.3.8-2.3 2.2 0 .6.2 1.2.6 1.6l2.3 7.8-3.2 11c.2 0 .5.1.8.1 1.4 0 2.3-.9 2.3-2.3 0-1.2-.6-1.9-1.4-2.2l1.6-4.9h.8l3.4 1.4z" /><path d="M12.2 2.2C11.5.9 10.1 0 8.5 0 6.6 0 5 1.6 5 3.5c0 .5.1 1 .3 1.4L.9 19.5c-.3 1.1 0 2.3.8 3.1.8.8 2 1.1 3.1.8l1.4-.4 1.4-3.5c-.4-.4-.6-1-.6-1.6 0-1.4.9-2.2 2.3-2.2 1.4 0 2.3.8 2.3 2.2 0 .5-.1 1-.3 1.4l2.4 8.7c.3 1.1 1.5 1.8 2.6 1.5 1.1-.3 1.8-1.5 1.5-2.6l-2.1-7.6c.4-.4.6-1 .6-1.6 0-1.4-.9-2.2-2.3-2.2-1.4 0-2.3.8-2.3 2.2 0 .5.1 1 .3 1.4l-3-10.9.1-.1z" /></svg>
                                                </div>
                                            </div>
                                            <h5 className="text-lg font-black text-white mb-2">Laravel Framework</h5>
                                            <p className="text-xs font-bold text-white/40 mb-8 leading-relaxed">Installs fresh Laravel via Composer. Requires empty directory.</p>
                                            <button
                                                onClick={async () => {
                                                    const res = prompt('Install Laravel Project?\n\nEnter "confirm" to proceed. This will run "composer create-project" in the root path. WARNING: All existing files will be deleted.');
                                                    if (res === 'confirm') {
                                                        setActionLoading('installing-laravel');
                                                        setShowProgressModal(true);
                                                        setInstallProgress(['🚀 Starting Laravel installation...', '📦 Downloading Laravel framework...', '⏳ This may take 2-5 minutes. Check server console for detailed progress.']);

                                                        try {
                                                            await axios.post(`/api/websites/${website.id}/install`, { appType: 'Laravel' }, { timeout: 300000 });
                                                            setInstallProgress(prev => [...prev, '✅ Laravel installed successfully!', '🎉 Visit your domain to see the welcome page.']);
                                                            setTimeout(() => {
                                                                alert('✅ Laravel installed successfully! Visit your domain to see the welcome page.');
                                                                setShowProgressModal(false);
                                                                onRefresh();
                                                            }, 2000);
                                                        }
                                                        catch (err: any) {
                                                            setInstallProgress(prev => [...prev, `❌ Installation failed: ${err.response?.data?.error || err.message}`]);
                                                            setTimeout(() => {
                                                                alert('❌ Installation failed: ' + (err.response?.data?.error || err.message));
                                                                setShowProgressModal(false);
                                                            }, 2000);
                                                        }
                                                        finally { setActionLoading(null); }
                                                    }
                                                }}
                                                disabled={!!actionLoading}
                                                className="w-full py-3.5 bg-red-600 rounded-xl text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                {actionLoading === 'installing-laravel' ? (
                                                    <>
                                                        <Loader2 size={14} className="animate-spin" />
                                                        Installing... (Check Console)
                                                    </>
                                                ) : 'Deploy Instance'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'files' && (
                                <div className="h-full flex flex-col">
                                    <div className="p-6 bg-indigo-500/10 rounded-[24px] border border-indigo-500/20 mb-6">
                                        <div className="flex items-center gap-3 mb-3">
                                            <Folder size={20} className="text-indigo-400" />
                                            <div>
                                                <h4 className="text-sm font-black text-white uppercase tracking-tight">Website Files</h4>
                                                <p className="text-[10px] font-bold text-white/40 mt-0.5">Manage files and folders for this website</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-4 p-3 bg-black/20 rounded-xl">
                                            <Terminal size={14} className="text-indigo-400" />
                                            <code className="text-xs font-mono text-indigo-300">{website.rootPath}</code>
                                        </div>
                                    </div>

                                    <div className="flex-1 bg-black/20 rounded-[24px] border border-white/5 p-4 overflow-hidden">
                                        <div className="h-full flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
                                                    <Folder size={32} className="text-indigo-400" />
                                                </div>
                                                <h5 className="text-lg font-black text-white mb-2">File Manager</h5>
                                                <p className="text-sm font-bold text-white/40 mb-6 max-w-md">
                                                    Click the button below to open the full file manager for this website's root directory.
                                                </p>
                                                <button
                                                    onClick={() => {
                                                        onOpenPath(website.rootPath);
                                                        onClose();
                                                    }}
                                                    className="px-6 py-3 bg-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-500/20 hover:brightness-110 transition-all flex items-center gap-2 mx-auto"
                                                >
                                                    <Folder size={16} />
                                                    Open File Manager
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'advanced' && (
                                <div className="space-y-6">
                                    <div className="p-8 bg-rose-500/10 rounded-[32px] border border-rose-500/20 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 text-rose-500/5 rotate-12">
                                            <Trash2 size={120} />
                                        </div>
                                        <div className="relative z-10">
                                            <h4 className="text-lg font-black text-rose-500 tracking-tight mb-2">Delete Website</h4>
                                            <p className="text-sm font-bold text-rose-500/60 mb-8 max-w-sm">This will permanently remove the virtual host, subdomains, and DNS settings. Files will NOT be deleted.</p>
                                            <button
                                                onClick={handleDeleteWebsite}
                                                disabled={!!actionLoading}
                                                className="px-8 py-3.5 bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-rose-500/20 active:scale-95 transition-all"
                                            >
                                                Permanently Delete
                                            </button>
                                        </div>
                                    </div>

                                    {isAdmin && (
                                        <div className="p-8 bg-indigo-500/10 rounded-[32px] border border-indigo-500/20">
                                            <h4 className="text-lg font-black text-indigo-400 tracking-tight mb-2">Transfer Ownership</h4>
                                            <p className="text-sm font-bold text-indigo-400/60 mb-6 max-w-sm">Move this website and its DNS records to another user.</p>

                                            <div className="flex gap-3">
                                                <select
                                                    value={websiteOwner}
                                                    onChange={e => setWebsiteOwner(Number(e.target.value))}
                                                    className="flex-1 bg-black/40 border border-white/5 rounded-2xl py-3 px-4 text-white font-bold text-sm outline-none"
                                                >
                                                    {users.map(u => (
                                                        <option key={u.id} value={u.id} style={{ background: '#1a1a1a' }}>{u.username} ({u.role})</option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={handleTransferOwnership}
                                                    disabled={actionLoading === 'transfer'}
                                                    className="px-6 py-3 bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl transition-all"
                                                >
                                                    {actionLoading === 'transfer' ? <Loader2 size={16} className="animate-spin" /> : 'Transfer'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-6 bg-white/5 rounded-[24px] border border-white/5">
                                            <Scale size={20} className="text-indigo-400 mb-3" />
                                            <h5 className="text-xs font-black text-white uppercase tracking-widest">Resource Quota</h5>
                                            <p className="text-[10px] font-bold text-white/20 mt-1">Unlimited Bandwidth</p>
                                        </div>
                                        <div className="p-6 bg-white/5 rounded-[24px] border border-white/5">
                                            <History size={20} className="text-emerald-400 mb-3" />
                                            <h5 className="text-xs font-black text-white uppercase tracking-widest">Auto-Scale</h5>
                                            <p className="text-[10px] font-bold text-white/20 mt-1">Status: Active</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {activeTab === 'ip-access' && (
                                <IPAccessControlManager websiteId={website.id} domain={website.domain} />
                            )}
                        </div>

                        {/* Breadcrumb style footer */}
                        <div className="px-8 py-3 bg-black/20 border-t border-white/5 text-[9px] font-black text-white/20 uppercase tracking-[0.3em] flex justify-between">
                            <span>Yumna Panel • Web Stack v1.5.3</span>
                            <span>Node 20.x • PHP Enabled</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Installation Progress Modal */}
            {showProgressModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[1200] flex items-center justify-center p-4">
                    <div className="glass w-full max-w-2xl rounded-[32px] overflow-hidden border border-white/10 shadow-2xl">
                        <div className="p-8 bg-gradient-to-br from-red-500/10 to-transparent">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                                    <Package size={24} className="text-red-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white">Laravel Installation</h3>
                                    <p className="text-xs font-bold text-white/40 mt-1">Installing framework and dependencies...</p>
                                </div>
                            </div>

                            <div className="bg-black/60 rounded-2xl p-6 border border-white/5 max-h-96 overflow-y-auto custom-scrollbar">
                                {installProgress.map((msg, idx) => (
                                    <div key={idx} className="flex items-start gap-3 mb-3 last:mb-0">
                                        <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
                                        <p className="text-sm font-mono text-white/80 leading-relaxed">{msg}</p>
                                    </div>
                                ))}
                                {actionLoading === 'installing-laravel' && (
                                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
                                        <Loader2 size={16} className="animate-spin text-red-400" />
                                        <p className="text-xs font-bold text-white/60">Processing... Please wait</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <Terminal size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs font-black text-amber-500 uppercase tracking-widest mb-1">Server Console</p>
                                        <p className="text-xs font-bold text-white/60 leading-relaxed">
                                            For detailed real-time progress, check your server console where <code className="px-1.5 py-0.5 bg-black/40 rounded text-amber-400">npm run dev</code> is running. You'll see live Composer output there.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WebsiteManagementModal;

