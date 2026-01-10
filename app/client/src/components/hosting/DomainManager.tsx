import React, { useState, useEffect } from 'react';
import {
    Globe,
    Plus,
    Search,
    Calendar,
    Shield,
    ExternalLink,
    Trash2,
    AlertCircle,
    CheckCircle,
    Clock,
    Link as LinkIcon,
    ArrowUpRight,
    Loader2,
    RefreshCw,
    Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import DomainModal from '../modals/DomainModal';
import DomainDetailsModal from '../modals/DomainDetailsModal';
import '../styles/DomainManager.css';

interface Domain {
    id: number;
    domain: string;
    registrar: string;
    registration_date: string;
    expiry_date: string;
    auto_renew: boolean;
    whois_privacy: boolean;
    nameservers: string[];
    status: 'active' | 'expired' | 'pending_transfer' | 'locked' | 'parked';
    website_count: number;
    days_until_expiry: number;
    created_at: string;
}

const DomainManager: React.FC = () => {
    const [domains, setDomains] = useState<Domain[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');

    useEffect(() => {
        fetchDomains();
    }, []);

    const fetchDomains = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/hosting/domains', {
                headers: {
                    'x-user-id': localStorage.getItem('userId') || '',
                    'x-session-id': localStorage.getItem('sessionId') || ''
                }
            });
            setDomains(response.data.domains);
        } catch (error) {
            console.error('Error fetching domains:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddDomain = () => {
        setSelectedDomain(null);
        setShowAddModal(true);
    };

    const handleDomainClick = (domain: Domain) => {
        setSelectedDomain(domain);
        setShowDetailsModal(true);
    };

    const handleDeleteDomain = async (domainId: number) => {
        if (!confirm('Are you sure you want to delete this domain?')) return;

        try {
            await axios.delete(`/api/hosting/domains/${domainId}`, {
                headers: {
                    'x-user-id': localStorage.getItem('userId') || '',
                    'x-session-id': localStorage.getItem('sessionId') || ''
                }
            });
            fetchDomains();
        } catch (error) {
            console.error('Error deleting domain:', error);
            alert('Failed to delete domain');
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'active':
                return { icon: <CheckCircle size={14} />, label: 'Active', class: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' };
            case 'expired':
                return { icon: <AlertCircle size={14} />, label: 'Expired', class: 'text-rose-400 bg-rose-400/10 border-rose-400/20' };
            case 'pending_transfer':
                return { icon: <Clock size={14} />, label: 'Pending Transfer', class: 'text-amber-400 bg-amber-400/10 border-amber-400/20' };
            default:
                return { icon: <AlertCircle size={14} />, label: status, class: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20' };
        }
    };

    const getExpiryInfo = (days: number) => {
        if (days < 0) return { text: 'Expired', class: 'text-rose-400' };
        if (days <= 30) return { text: `${days}d left`, class: 'text-rose-400 font-black' };
        if (days <= 90) return { text: `${days}d left`, class: 'text-amber-400' };
        return { text: `${days}d left`, class: 'text-emerald-400' };
    };

    const filteredDomains = domains.filter(domain => {
        const matchesSearch = domain.domain.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'all' || domain.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const stats = {
        total: domains.length,
        active: domains.filter(d => d.status === 'active').length,
        expiring: domains.filter(d => d.days_until_expiry <= 30 && d.days_until_expiry > 0).length,
        expired: domains.filter(d => d.days_until_expiry <= 0).length
    };

    return (
        <div className="domain-manager space-y-8 p-8 max-w-[1600px] mx-auto animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20">
                            <Globe size={24} />
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tight leading-none">Domain Assets</h2>
                    </div>
                    <p className="text-white/40 text-sm font-medium ml-14">Centralized control for your digital footprint.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchDomains}
                        className="p-4 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-2xl border border-white/5 transition-all active:scale-95"
                        title="Refresh Data"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        className="group flex items-center gap-3 px-8 py-4 bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-500/20 hover:brightness-110 active:scale-95 transition-all"
                        onClick={handleAddDomain}
                    >
                        <Plus size={18} />
                        Register Domain
                        <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </button>
                </div>
            </div>

            {/* Premium Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Total Managed', value: stats.total, icon: <Globe />, color: 'indigo' },
                    { label: 'Active Assets', value: stats.active, icon: <CheckCircle />, color: 'emerald' },
                    { label: 'Critical Expiry', value: stats.expiring, icon: <AlertCircle />, color: 'amber' },
                    { label: 'Expired Items', value: stats.expired, icon: <Clock />, color: 'rose' }
                ].map((stat, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="relative overflow-hidden group p-6 bg-white/[0.03] border border-white/10 rounded-[32px] hover:border-white/20 transition-all duration-500"
                    >
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-${stat.color}-500/10 blur-[64px] rounded-full -mr-16 -mt-16 group-hover:bg-${stat.color}-500/20 transition-all duration-700`} />
                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className={`p-2.5 rounded-xl bg-white/5 text-${stat.color}-400 group-hover:scale-110 transition-transform`}>
                                    {React.cloneElement(stat.icon as React.ReactElement, { size: 18 })}
                                </div>
                                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{stat.label}</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-white">{stat.value}</span>
                                <span className="text-xs text-white/20 font-bold">UNITS</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col lg:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-indigo-400 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search assets by domain name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white focus:border-indigo-500/50 outline-none transition-all placeholder:text-white/20 focus:bg-white/[0.05]"
                    />
                </div>

                <div className="flex gap-2">
                    <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 rounded-2xl p-1.5">
                        <div className="pl-3 pr-1 text-white/20">
                            <Filter size={14} />
                        </div>
                        {['all', 'active', 'expired'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setFilterStatus(tab)}
                                className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${filterStatus === tab ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-[400px] flex flex-col items-center justify-center space-y-4"
                    >
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-indigo-500/20 rounded-full animate-ping" />
                            <Loader2 className="absolute top-0 left-0 w-16 h-16 text-indigo-500 animate-spin" />
                        </div>
                        <p className="text-white/40 text-xs font-black uppercase tracking-[0.3em]">Synching Data Modules</p>
                    </motion.div>
                ) : filteredDomains.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="h-[400px] flex flex-col items-center justify-center p-12 bg-white/[0.02] border border-white/5 border-dashed rounded-[48px] text-center"
                    >
                        <div className="p-8 bg-indigo-500/5 rounded-full mb-6">
                            <Globe size={48} className="text-white/10" />
                        </div>
                        <h3 className="text-xl font-black text-white mb-2">No results matching index</h3>
                        <p className="text-white/40 text-sm max-w-sm mb-8 font-medium italic">We couldn't find any domains that match your current search criteria or filter status.</p>
                        <button className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-xs transition-all border border-white/5" onClick={() => { setSearchTerm(''); setFilterStatus('all'); fetchDomains(); }}>
                            Reset Global View
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        layout
                        className="grid grid-cols-1 xl:grid-cols-2 gap-6"
                    >
                        {filteredDomains.map((domain, idx) => {
                            const status = getStatusInfo(domain.status);
                            const expiry = getExpiryInfo(domain.days_until_expiry);

                            return (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    key={domain.id}
                                    whileHover={{ y: -4 }}
                                    className="group relative bg-white/[0.03] border border-white/10 rounded-[32px] p-8 hover:bg-white/[0.05] hover:border-white/20 transition-all cursor-pointer"
                                    onClick={() => handleDomainClick(domain)}
                                >
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex gap-5">
                                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-violet-600/20 rounded-[22px] flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform shadow-inner">
                                                <Globe size={28} />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black text-white group-hover:text-indigo-400 transition-colors tracking-tight line-clamp-1">{domain.domain}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">{domain.registrar || 'Self-Managed'}</span>
                                                    <div className="w-1 h-1 rounded-full bg-white/10" />
                                                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${status.class}`}>
                                                        {status.icon}
                                                        {status.label}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                            <button
                                                className="p-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl active:scale-90 transition-all border border-white/10"
                                                onClick={(e) => { e.stopPropagation(); window.open(`http://${domain.domain}`, '_blank'); }}
                                            >
                                                <ExternalLink size={16} />
                                            </button>
                                            <button
                                                className="p-3 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500/40 hover:text-rose-500 rounded-xl active:scale-90 transition-all border border-rose-500/10"
                                                onClick={(e) => { e.stopPropagation(); handleDeleteDomain(domain.id); }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                                            <div className="flex items-center gap-2 text-white/30 text-[9px] font-black uppercase tracking-widest mb-1.5">
                                                <Calendar size={12} />
                                                Next Renewal
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-white/80">{new Date(domain.expiry_date).toLocaleDateString()}</span>
                                                <span className={`text-[10px] font-black uppercase tracking-tighter ${expiry.class}`}>{expiry.text}</span>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                                            <div className="flex items-center gap-2 text-white/30 text-[9px] font-black uppercase tracking-widest mb-1.5">
                                                <LinkIcon size={12} />
                                                Active Nodes
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-white/80">{domain.website_count} Applications</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex gap-2">
                                            {domain.auto_renew && (
                                                <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                                    <RefreshCw size={10} className="animate-spin-slow" />
                                                    Auto-Renew
                                                </div>
                                            )}
                                            {domain.whois_privacy && (
                                                <div className="px-3 py-1 bg-white/5 text-white/40 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                                    <Shield size={10} />
                                                    Encrypted WHOIS
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors pointer-events-auto"
                                            onClick={(e) => { e.stopPropagation(); handleDomainClick(domain); }}
                                        >
                                            Advanced Ops
                                            <ArrowUpRight size={14} />
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modals */}
            <AnimatePresence>
                {showAddModal && (
                    <DomainModal
                        onClose={() => setShowAddModal(false)}
                        onSuccess={() => {
                            setShowAddModal(false);
                            fetchDomains();
                        }}
                    />
                )}

                {showDetailsModal && selectedDomain && (
                    <DomainDetailsModal
                        domain={selectedDomain}
                        onClose={() => {
                            setShowDetailsModal(false);
                            setSelectedDomain(null);
                        }}
                        onUpdate={() => {
                            fetchDomains();
                        }}
                    />
                )}
            </AnimatePresence>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
            `}} />
        </div>
    );
};

export default DomainManager;
