import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Globe, Plus, Search, Filter, Grid, List, Loader2,
    ExternalLink, Settings, FolderOpen, Shield, Activity,
    ChevronRight, Database, Mail, Lock, Code, BarChart3,
    RefreshCw, AlertCircle, CheckCircle, Clock, Zap, Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import WebsiteManagementPage from './WebsiteManagementPage';
import WebsiteList from './WebsiteList';

interface Website {
    id?: number | string;
    name?: string;
    domain?: string;
    rootPath?: string;
    phpVersion?: string;
    status?: string;
    sslEnabled?: boolean;
    createdAt?: string;
    owner?: string;
}

interface WebsiteManagerProps {
    userId: number;
    userRole: string;
    onManageWebsite?: (website: Website) => void;
    onOpenPath?: (path: string) => void;
}

const WebsiteManager: React.FC<WebsiteManagerProps> = ({
    userId,
    userRole,
    onManageWebsite,
    onOpenPath
}) => {
    const [websites, setWebsites] = useState<Website[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);
    const [targetTab, setTargetTab] = useState<string | undefined>(undefined);

    useEffect(() => {
        fetchWebsites();
    }, []);

    const fetchWebsites = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/websites');
            setWebsites(response.data);
        } catch (error) {
            console.error('Failed to fetch websites:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredWebsites = websites.filter(site => {
        const matchesSearch = (site.domain?.toLowerCase() || site.name?.toLowerCase() || '').includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'all' || site.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const stats = {
        total: websites.length,
        active: websites.filter(w => w.status === 'active').length,
        critical: websites.filter(w => w.status === 'suspended').length,
        apps: websites.length * 2, // Mocking some sub-apps count
    };

    const handleManageWebsite = (website: Website, tab?: string) => {
        setTargetTab(tab);
        setSelectedWebsite(website);
    };

    if (selectedWebsite) {
        return (
            <WebsiteManagementPage
                website={selectedWebsite}
                userId={userId}
                userRole={userRole}
                initialTab={targetTab as any}
                onBack={() => {
                    setSelectedWebsite(null);
                    setTargetTab(undefined);
                    fetchWebsites();
                }}
                onRefresh={fetchWebsites}
                onOpenPath={onOpenPath || (() => { })}
            />
        );
    }

    return (
        <div className="min-h-screen bg-[#080808] text-white p-12">
            {/* Tactical Header */}
            <div className="mb-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-500/20">
                                Global Infrastructure
                            </span>
                            <span className="text-white/20 text-[9px] font-black uppercase tracking-widest">v1.5.0-STABLE</span>
                        </div>
                        <h1 className="text-5xl font-black text-white tracking-tighter mb-4">
                            Operational Hub
                        </h1>
                        <p className="text-white/30 text-lg font-medium italic max-w-2xl leading-relaxed">
                            Monitor and coordinate your distributed satellite nodes across the global matrix.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-4 px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 shadow-2xl shadow-indigo-600/20"
                    >
                        <Plus size={20} />
                        Establish New Node
                    </button>
                </div>

                {/* Intelligence Board */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    {[
                        { label: 'Satellite Array', value: stats.total, icon: <Globe />, color: 'text-white' },
                        { label: 'Active Signals', value: stats.active, icon: <Zap />, color: 'text-emerald-400' },
                        { label: 'Offline Nodes', value: stats.critical, icon: <AlertCircle />, color: 'text-rose-400' },
                        { label: 'App Registry', value: stats.apps, icon: <Package />, color: 'text-indigo-400' }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white/[0.02] border border-white/5 rounded-[32px] p-8 hover:bg-white/[0.04] transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-white/20">{stat.icon}</div>
                                <span className="text-[9px] font-black text-white/10 uppercase tracking-[0.2em]">{stat.label}</span>
                            </div>
                            <div className={`text-4xl font-black tracking-tighter ${stat.color}`}>{stat.value}</div>
                        </div>
                    ))}
                </div>

                {/* Tactical Controls */}
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 relative group">
                        <Search size={22} className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Filter by Domain Vector / Node Name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-16 pr-8 py-5 bg-white/[0.02] border border-white/5 rounded-[24px] text-white font-bold placeholder:text-white/10 focus:outline-none focus:border-indigo-500/50 transition-all shadow-inner"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="pl-6 pr-12 py-5 bg-white/[0.02] border border-white/5 rounded-[24px] text-white font-black text-[10px] uppercase tracking-widest focus:outline-none focus:border-indigo-500/50 appearance-none transition-all cursor-pointer"
                            >
                                <option value="all" style={{ background: '#0a0a0a' }}>ALL STATUS</option>
                                <option value="active" style={{ background: '#0a0a0a' }}>ONLINE</option>
                                <option value="suspended" style={{ background: '#0a0a0a' }}>OFFLINE</option>
                                <option value="maintenance" style={{ background: '#0a0a0a' }}>SYNCING</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                        </div>
                        <button
                            onClick={fetchWebsites}
                            className="p-5 bg-white/[0.02] border border-white/5 rounded-[24px] text-white/20 hover:text-indigo-400 hover:border-indigo-500/40 transition-all shadow-xl active:scale-90"
                        >
                            <RefreshCw size={22} className={loading ? 'animate-spin text-indigo-500' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Viewport */}
            <div className="relative">
                <WebsiteList
                    websites={filteredWebsites}
                    loading={loading}
                    onManageWebsite={handleManageWebsite}
                    onAddWebsite={() => setShowAddModal(true)}
                    onOpenPath={onOpenPath}
                />
            </div>

            {/* Ambient Flux */}
            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full -z-10 pointer-events-none" />
            <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-rose-500/5 blur-[100px] rounded-full -z-10 pointer-events-none" />
        </div>
    );
};

const ChevronDown = ({ size, className }: { size: number, className: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m6 9 6 6 6-6" />
    </svg>
)

const Package = ({ size, className }: { size?: number, className?: string }) => (
    <svg width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m7.5 4.27 9 5.15" />
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
    </svg>
)

export default WebsiteManager;
