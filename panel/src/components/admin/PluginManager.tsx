import React, { useState, useEffect } from 'react';
import { Package, Download, Trash2, ExternalLink, Loader2, Box, Database, Server, Terminal } from 'lucide-react';
import axios from 'axios';

interface Plugin {
    id: string;
    name: string;
    description: string;
    version: string;
    icon: string;
    category: string;
    installed: boolean;
}

const PluginManager: React.FC = () => {
    const [plugins, setPlugins] = useState<Plugin[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchPlugins = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/plugins', {
                headers: { 'x-user-id': localStorage.getItem('userId') }
            });
            setPlugins(res.data);
        } catch (err) {
            console.error('Failed to fetch plugins', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlugins();
    }, []);

    const handleInstall = async (id: string, name: string) => {
        setActionLoading(id);
        try {
            await axios.post('/api/plugins/install', { id }, {
                headers: { 'x-user-id': localStorage.getItem('userId') }
            });
            alert(`${name} installed successfully!`);
            fetchPlugins();
        } catch (err: any) {
            alert(`Failed to install ${name}: ` + (err.response?.data?.error || err.message));
        } finally {
            setActionLoading(null);
        }
    };

    const handleUninstall = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to uninstall ${name}?`)) return;
        setActionLoading(id);
        try {
            await axios.post('/api/plugins/uninstall', { id }, {
                headers: { 'x-user-id': localStorage.getItem('userId') }
            });
            fetchPlugins();
        } catch (err: any) {
            alert(`Failed to uninstall ${name}: ` + (err.response?.data?.error || err.message));
        } finally {
            setActionLoading(null);
        }
    };

    const getIcon = (iconName: string) => {
        switch (iconName) {
            case 'Database': return <Database size={24} />;
            case 'Box': return <Box size={24} />;
            case 'Package': return <Package size={24} />;
            case 'Terminal': return <Terminal size={24} />;
            default: return <Server size={24} />;
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[var(--bg-dark)]/50">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-white/5 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500">
                        <Package size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight">Plugin Marketplace</h2>
                        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Extend your panel functionality</p>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="p-8 overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <Loader2 size={40} className="animate-spin text-purple-500 mb-4" />
                        <p className="text-xs font-black text-purple-500/60 uppercase tracking-widest">Loading Marketplace...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {plugins.map((plugin) => (
                            <div key={plugin.id} className="glass rounded-[2rem] border border-white/5 hover:border-purple-500/30 p-6 flex flex-col h-full transition-all group">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-4 rounded-2xl bg-white/5 text-[var(--text-main)] border border-white/5 group-hover:bg-purple-500/20 group-hover:text-purple-500 transition-colors">
                                        {getIcon(plugin.icon)}
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${plugin.installed ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-white/5 text-white/40 border-white/10'}`}>
                                        {plugin.installed ? 'Installed' : 'Available'}
                                    </div>
                                </div>

                                <h3 className="text-lg font-black text-[var(--text-main)] mb-2">{plugin.name}</h3>
                                <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6 flex-1">
                                    {plugin.description}
                                </p>

                                <div className="mt-auto pt-6 border-t border-white/5 flex items-center gap-3">
                                    {plugin.installed ? (
                                        <>
                                            {plugin.id === 'phpmyadmin' && (
                                                <a
                                                    href={`http://${window.location.hostname}:8090`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex-1 py-3 bg-[var(--bg-card)] hover:bg-[var(--nav-hover)] text-[var(--text-main)] rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-white/10"
                                                >
                                                    <ExternalLink size={14} /> Open
                                                </a>
                                            )}
                                            <button
                                                onClick={() => handleUninstall(plugin.id, plugin.name)}
                                                disabled={!!actionLoading}
                                                className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all border border-red-500/20"
                                            >
                                                {actionLoading === plugin.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => handleInstall(plugin.id, plugin.name)}
                                            disabled={!!actionLoading}
                                            className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-500/20"
                                        >
                                            {actionLoading === plugin.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                            Install Now
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

export default PluginManager;
