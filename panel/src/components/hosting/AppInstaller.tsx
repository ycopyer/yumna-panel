import React, { useState, useEffect } from 'react';
import {
    Plus, Search, LayoutGrid, List, Globe, Database, Settings,
    Download, Rocket, Loader2, CheckCircle2, AlertCircle, Trash2,
    ExternalLink, AppWindow, RefreshCw, ShieldCheck
} from 'lucide-react';
import axios from 'axios';
import AppInstallerModal from '../modals/AppInstallerModal';

interface AppTemplate {
    id: number;
    name: string;
    slug: string;
    description: string;
    category: string;
    version: string;
    logo_url?: string;
}

interface InstalledApp {
    id: number;
    name: string;
    website_domain: string;
    path: string;
    status: 'installing' | 'active' | 'error' | 'updating';
    version: string;
    admin_url?: string;
    health_status: 'healthy' | 'degraded' | 'offline' | 'unknown';
    last_health_verified?: string;
    update_available: boolean;
    auto_update_enabled: boolean;
}

const AppInstaller: React.FC<{ userId: number; userRole: string }> = ({ userId, userRole }) => {
    const [activeTab, setActiveTab] = useState<'available' | 'installed'>('available');
    const [templates, setTemplates] = useState<AppTemplate[]>([]);
    const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInstallModal, setShowInstallModal] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<AppTemplate | null>(null);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Poll for status updates
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const [templatesRes, installedRes] = await Promise.all([
                axios.get('/api/apps/templates'),
                axios.get('/api/apps/installed')
            ]);
            setTemplates(templatesRes.data);
            setInstalledApps(installedRes.data);
        } catch (error) {
            console.error('Failed to fetch app data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (appId: number, action: string, data?: any) => {
        try {
            if (action === 'health') {
                await axios.post(`/api/apps/${appId}/health`);
            } else if (action === 'update') {
                await axios.post(`/api/apps/${appId}/update`);
            } else if (action === 'auto-update') {
                await axios.put(`/api/apps/${appId}/auto-update`, { enabled: data });
            }
            fetchData();
        } catch (error) {
            console.error('Action failed:', error);
        }
    };

    const handleInstallClick = (template: AppTemplate) => {
        setSelectedTemplate(template);
        setShowInstallModal(true);
    };

    return (
        <div className="space-y-8 animate-fade">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-white flex items-center gap-3">
                        <Rocket className="text-indigo-500" size={32} />
                        One-Click Apps
                    </h2>
                    <p className="text-white/40 font-medium mt-1">Deploy WordPress, Laravel, and more in seconds.</p>
                </div>

                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                    <button
                        onClick={() => setActiveTab('available')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'available' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white'
                            }`}
                    >
                        App Store
                    </button>
                    <button
                        onClick={() => setActiveTab('installed')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'installed' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white'
                            }`}
                    >
                        My Apps
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 size={48} className="text-indigo-500 animate-spin" />
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Loading Marketplace...</p>
                </div>
            ) : activeTab === 'available' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map((template) => (
                        <div
                            key={template.id}
                            className="group relative bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 hover:bg-white/[0.04] hover:border-indigo-500/30 transition-all duration-500 overflow-hidden"
                        >
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all" />
                            <div className="relative flex flex-col h-full">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-110 transition-transform duration-500">
                                        {template.logo_url ? (
                                            <img src={template.logo_url} alt={template.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <AppWindow size={32} className="text-indigo-500" />
                                        )}
                                    </div>
                                    <div className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-wider border border-indigo-500/10">
                                        v{template.version}
                                    </div>
                                </div>
                                <h3 className="text-xl font-black text-white mb-2 group-hover:text-indigo-400 transition-colors">{template.name}</h3>
                                <p className="text-xs text-white/40 font-medium leading-relaxed mb-8 flex-1">{template.description}</p>
                                <button
                                    onClick={() => handleInstallClick(template)}
                                    className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                                >
                                    <Download size={16} />
                                    Quick Install
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {installedApps.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white/[0.02] border border-white/5 rounded-[3rem] text-center">
                            <div className="w-20 h-20 rounded-full bg-indigo-500/5 flex items-center justify-center mb-6">
                                <Rocket size={40} className="text-white/10" />
                            </div>
                            <h3 className="text-xl font-black text-white mb-2">No apps deployed yet</h3>
                            <p className="text-sm text-white/40 font-medium max-w-xs mx-auto mb-8">Deploy your first website in seconds.</p>
                            <button
                                onClick={() => setActiveTab('available')}
                                className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] border border-white/10 transition-all"
                            >
                                Browse App Store
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {installedApps.map((app) => (
                                <div
                                    key={app.id}
                                    className="bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/[0.04] transition-all group"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner ${app.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                            app.status === 'installing' || app.status === 'updating' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500' :
                                                'bg-red-500/10 border-red-500/20 text-red-500'
                                            }`}>
                                            {app.status === 'installing' || app.status === 'updating' ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle2 size={24} />}
                                            {app.status === 'active' && (
                                                <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0a0f1d] ${app.health_status === 'healthy' ? 'bg-emerald-500' :
                                                    app.health_status === 'degraded' ? 'bg-amber-500' :
                                                        'bg-red-500'
                                                    }`} title={`Health: ${app.health_status}`} />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-lg font-black text-white">{app.name}</h3>
                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${app.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10' :
                                                    'bg-indigo-500/10 text-indigo-500 border border-indigo-500/10'
                                                    }`}>
                                                    {app.status}
                                                </span>
                                                {app.update_available && (
                                                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/10 rounded-md text-[9px] font-black uppercase tracking-wider animate-pulse">
                                                        Update Available
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 text-xs font-bold text-white/40">
                                                <span className="flex items-center gap-1.5"><Globe size={14} /> {app.website_domain}</span>
                                                <span className="flex items-center gap-1.5"><Settings size={14} /> v{app.version}</span>
                                                {app.last_health_verified && (
                                                    <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-white/20" /> {new Date(app.last_health_verified).toLocaleTimeString()}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-4 mr-4 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Auto-Update</span>
                                            <button
                                                onClick={() => handleAction(app.id, 'auto-update', !app.auto_update_enabled)}
                                                className={`w-10 h-5 rounded-full relative transition-all ${app.auto_update_enabled ? 'bg-indigo-500' : 'bg-white/10'}`}
                                            >
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${app.auto_update_enabled ? 'left-6' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        {app.update_available && (
                                            <button
                                                onClick={() => handleAction(app.id, 'update')}
                                                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
                                            >
                                                <Download size={14} /> Update
                                            </button>
                                        )}

                                        {app.admin_url && (
                                            <button
                                                onClick={() => window.open(`http://${app.website_domain}${app.admin_url}`, '_blank')}
                                                className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all flex items-center gap-2"
                                            >
                                                <ExternalLink size={14} /> Admin
                                            </button>
                                        )}

                                        <button
                                            onClick={() => handleAction(app.id, 'health')}
                                            className="p-2.5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl transition-all border border-white/10"
                                        >
                                            <RefreshCw size={18} />
                                        </button>

                                        <button className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all border border-red-500/10">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {showInstallModal && selectedTemplate && (
                <AppInstallerModal
                    template={selectedTemplate}
                    onClose={() => setShowInstallModal(false)}
                    onSuccess={() => {
                        setShowInstallModal(false);
                        fetchData();
                        setActiveTab('installed');
                    }}
                />
            )}
        </div>
    );
};

export default AppInstaller;
