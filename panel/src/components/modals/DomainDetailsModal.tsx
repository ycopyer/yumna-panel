import React, { useState, useEffect } from 'react';
import {
    X,
    Globe,
    Info,
    Server,
    Link as LinkIcon,
    RefreshCw,
    ExternalLink,
    Shield,
    AlertCircle,
    CheckCircle,
    Loader2,
    Activity,
    Database,
    Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

interface DomainDetailsModalProps {
    domain: any;
    onClose: () => void;
    onUpdate: () => void;
}

const DomainDetailsModal: React.FC<DomainDetailsModalProps> = ({ domain, onClose, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<'info' | 'whois' | 'dns' | 'forwarding'>('info');
    const [whoisData, setWhoisData] = useState<string>('');
    const [dnsRecords, setDnsRecords] = useState<any>(null);
    const [forwarding, setForwarding] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [forwardingForm, setForwardingForm] = useState({
        target_url: '',
        type: '301',
        preserve_path: false
    });

    useEffect(() => {
        if (activeTab === 'whois' && !whoisData) fetchWhois();
        else if (activeTab === 'dns' && !dnsRecords) fetchDNS();
        else if (activeTab === 'forwarding' && !forwarding) fetchForwarding();
    }, [activeTab]);

    const fetchWhois = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/hosting/domains/${domain.id}/whois`, {
                headers: {
                    'x-user-id': localStorage.getItem('userId') || '',
                    'x-session-id': localStorage.getItem('sessionId') || ''
                }
            });
            setWhoisData(response.data.whois);
        } catch (error) {
            console.error('Error fetching WHOIS:', error);
            setWhoisData('System Error: Failed to retrieve WHOIS buffer.');
        } finally {
            setLoading(false);
        }
    };

    const fetchDNS = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/hosting/domains/${domain.id}/dns-check`, {
                headers: {
                    'x-user-id': localStorage.getItem('userId') || '',
                    'x-session-id': localStorage.getItem('sessionId') || ''
                }
            });
            setDnsRecords(response.data.dns);
        } catch (error) {
            console.error('Error fetching DNS:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchForwarding = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/hosting/domains/${domain.id}/forwarding`, {
                headers: {
                    'x-user-id': localStorage.getItem('userId') || '',
                    'x-session-id': localStorage.getItem('sessionId') || ''
                }
            });
            if (response.data.forwarding) {
                setForwarding(response.data.forwarding);
                setForwardingForm({
                    target_url: response.data.forwarding.target_url,
                    type: response.data.forwarding.type,
                    preserve_path: response.data.forwarding.preserve_path
                });
            }
        } catch (error) {
            console.error('Error fetching forwarding:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveForwarding = async () => {
        setLoading(true);
        try {
            await axios.post(`/api/hosting/domains/${domain.id}/forwarding`, forwardingForm, {
                headers: {
                    'x-user-id': localStorage.getItem('userId') || '',
                    'x-session-id': localStorage.getItem('sessionId') || ''
                }
            });
            fetchForwarding();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to save forwarding states.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteForwarding = async () => {
        if (!confirm('Purge domain forwarding logic?')) return;
        setLoading(true);
        try {
            await axios.delete(`/api/hosting/domains/${domain.id}/forwarding`, {
                headers: {
                    'x-user-id': localStorage.getItem('userId') || '',
                    'x-session-id': localStorage.getItem('sessionId') || ''
                }
            });
            setForwarding(null);
            setForwardingForm({ target_url: '', type: '301', preserve_path: false });
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to delete forwarding logic.');
        } finally {
            setLoading(false);
        }
    };

    const renderDNSRecords = () => {
        if (!dnsRecords) return null;
        return (
            <div className="space-y-6">
                {Object.entries(dnsRecords).map(([type, records]: [string, any]) => (
                    <div key={type} className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                        <div className="bg-white/[0.03] px-6 py-3 border-b border-white/5 flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{type} Vectors</h4>
                            <span className="text-[10px] font-bold text-indigo-400">{(records as any[]).length} active</span>
                        </div>
                        <div className="p-4">
                            {Array.isArray(records) && records.length > 0 ? (
                                <div className="space-y-2">
                                    {records.map((record: any, index: number) => (
                                        <div key={index} className="bg-black/20 p-3 rounded-xl border border-white/[0.02] font-mono text-[11px] text-white/60 break-all">
                                            {typeof record === 'object' ? JSON.stringify(record) : record}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[10px] font-black text-center py-4 text-white/10 uppercase tracking-widest italic">Signal Lost: No records found</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-4xl bg-[#080808] border border-white/10 rounded-[48px] shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Master Header */}
                <div className="relative p-12 pb-8 bg-gradient-to-b from-white/[0.03] to-transparent">
                    <button onClick={onClose} className="absolute top-8 right-8 p-4 bg-white/5 hover:bg-white/10 text-white/20 hover:text-white rounded-full transition-all">
                        <X size={24} />
                    </button>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${domain.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                                    {domain.status} NODE
                                </span>
                                <span className="text-white/20 text-[9px] font-black tracking-[0.3em] uppercase">Asset Hash: #{domain.id}</span>
                            </div>
                            <h2 className="text-5xl font-black text-white tracking-tighter">{domain.domain}</h2>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => window.open(`http://${domain.domain}`, '_blank')}
                                className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/5 transition-all"
                            >
                                <ExternalLink size={14} /> Global Link
                            </button>
                        </div>
                    </div>
                </div>

                {/* Navigation Stream */}
                <div className="px-12">
                    <div className="flex bg-white/[0.03] p-1 rounded-2xl border border-white/5">
                        {[
                            { id: 'info', icon: <Info size={14} />, label: 'Core Intel' },
                            { id: 'whois', icon: <Shield size={14} />, label: 'Whois Buffer' },
                            { id: 'dns', icon: <Activity size={14} />, label: 'DNS Flux' },
                            { id: 'forwarding', icon: <LinkIcon size={14} />, label: 'Logic Relay' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${activeTab === tab.id ? 'bg-white/10 text-white shadow-lg shadow-white/5' : 'text-white/20 hover:text-white'}`}
                            >
                                {tab.icon}
                                <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Matrix */}
                <div className="p-12 h-[500px] overflow-y-auto custom-scrollbar">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="h-full"
                        >
                            {activeTab === 'info' && (
                                <div className="space-y-12">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {[
                                            { label: 'Asset Registrar', value: domain.registrar || 'INTERNAL', icon: <Database size={16} /> },
                                            { label: 'Last Sync', value: domain.registration_date ? new Date(domain.registration_date).toLocaleDateString() : 'N/A', icon: <RefreshCw size={16} /> },
                                            { label: 'Expiry Node', value: domain.expiry_date ? new Date(domain.expiry_date).toLocaleDateString() : 'N/A', icon: <Zap size={16} />, color: domain.days_until_expiry <= 30 ? 'text-rose-400' : 'text-emerald-400' }
                                        ].map((stat, i) => (
                                            <div key={i} className="p-6 bg-white/[0.02] border border-white/5 rounded-[32px] group hover:bg-white/[0.04] transition-all">
                                                <div className="p-2 w-fit rounded-xl bg-white/5 text-white/30 mb-4 group-hover:text-indigo-400 transition-colors">{stat.icon}</div>
                                                <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                                                <p className={`text-lg font-black ${stat.color || 'text-white'}`}>{stat.value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Protocol Systems</span>
                                            <div className="h-px flex-1 bg-white/5" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className={`p-5 rounded-2xl border flex items-center gap-4 transition-all ${domain.auto_renew ? 'bg-indigo-500/5 border-indigo-500/20 text-indigo-400' : 'bg-white/[0.01] border-white/5 text-white/20'}`}>
                                                <RefreshCw size={20} className={domain.auto_renew ? 'animate-spin-slow' : ''} />
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest leading-none">Auto-Renew</p>
                                                    <p className="text-[9px] font-bold mt-1 opacity-60">{domain.auto_renew ? 'SYSTEM ACTIVE' : 'MANUAL OVERRIDE'}</p>
                                                </div>
                                            </div>
                                            <div className={`p-5 rounded-2xl border flex items-center gap-4 transition-all ${domain.whois_privacy ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-white/[0.01] border-white/5 text-white/20'}`}>
                                                <Shield size={20} />
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest leading-none">Whois Privacy</p>
                                                    <p className="text-[9px] font-bold mt-1 opacity-60">{domain.whois_privacy ? 'ENCRYPTED' : 'EXPOSED'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {domain.nameservers && (
                                        <div className="space-y-4">
                                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Authority Nameservers</p>
                                            <div className="flex flex-wrap gap-3">
                                                {JSON.parse(domain.nameservers).map((ns: string, i: number) => (
                                                    <div key={i} className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl font-mono text-[10px] text-white/40">{ns}</div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'whois' && (
                                <div className="h-full flex flex-col">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Raw Buffer Dump</h3>
                                        <button onClick={fetchWhois} className="p-2 text-white/20 hover:text-white transition-colors"><RefreshCw size={16} className={loading ? 'animate-spin text-indigo-400' : ''} /></button>
                                    </div>
                                    <div className="flex-1 bg-black/40 border border-white/5 rounded-3xl p-8 font-mono text-[11px] text-white/40 leading-relaxed overflow-y-auto custom-scrollbar whitespace-pre-wrap selection:bg-indigo-500/30 selection:text-white">
                                        {loading ? (
                                            <div className="h-full flex flex-col items-center justify-center space-y-4">
                                                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Decrypting Registry Stream</p>
                                            </div>
                                        ) : whoisData}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'dns' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Global Propagation Check</h3>
                                        <button onClick={fetchDNS} className="p-2 text-white/20 hover:text-white transition-colors"><RefreshCw size={16} className={loading ? 'animate-spin text-indigo-400' : ''} /></button>
                                    </div>
                                    {loading ? (
                                        <div className="py-20 flex flex-col items-center justify-center space-y-4">
                                            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                                            <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em]">Polling Global Nodes</p>
                                        </div>
                                    ) : renderDNSRecords()}
                                </div>
                            )}

                            {activeTab === 'forwarding' && (
                                <div className="max-w-2xl mx-auto space-y-10">
                                    <div className="text-center space-y-2">
                                        <div className="w-16 h-16 bg-indigo-500/10 rounded-3xl flex items-center justify-center text-indigo-400 mx-auto mb-4 border border-indigo-500/20 shadow-xl">
                                            <LinkIcon size={28} />
                                        </div>
                                        <h3 className="text-xl font-black text-white tracking-widest">DOMAIN RELAY LOGIC</h3>
                                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Redirect Asset Signal to External Location</p>
                                    </div>

                                    <div className="space-y-6 bg-white/[0.02] border border-white/5 p-8 rounded-[40px]">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Destination Vector (URL)</label>
                                            <input
                                                type="url"
                                                placeholder="https://target-node.com"
                                                value={forwardingForm.target_url}
                                                onChange={(e) => setForwardingForm({ ...forwardingForm, target_url: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/10"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Relay Protocol</label>
                                                <select
                                                    value={forwardingForm.type}
                                                    onChange={(e) => setForwardingForm({ ...forwardingForm, type: e.target.value })}
                                                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-xs font-black text-white outline-none focus:border-indigo-500/50 appearance-none uppercase tracking-widest"
                                                >
                                                    <option value="301" style={{ background: '#0a0a0a' }}>301 PERMANENT</option>
                                                    <option value="302" style={{ background: '#0a0a0a' }}>302 TEMPORARY</option>
                                                    <option value="frame" style={{ background: '#0a0a0a' }}>WRAITH FRAME</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Path Integrity</label>
                                                <button
                                                    onClick={() => setForwardingForm({ ...forwardingForm, preserve_path: !forwardingForm.preserve_path })}
                                                    className={`w-full py-4 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all ${forwardingForm.preserve_path ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-white/5 border-white/5 text-white/20'}`}
                                                >
                                                    {forwardingForm.preserve_path ? 'PRESERVE PATHS' : 'STRIP PATHS'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="pt-4 flex gap-4">
                                            <button
                                                onClick={handleSaveForwarding}
                                                disabled={loading || !forwardingForm.target_url}
                                                className="flex-1 flex items-center justify-center gap-3 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-600/20 transition-all active:scale-95"
                                            >
                                                {loading ? <Loader2 className="animate-spin" size={16} /> : 'Inject Logic'}
                                            </button>
                                            {forwarding && (
                                                <button
                                                    onClick={handleDeleteForwarding}
                                                    className="p-5 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500/40 hover:text-rose-500 border border-rose-500/5 rounded-2xl transition-all"
                                                >
                                                    <X size={20} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Secure Footer */}
                <div className="p-12 pt-0 flex justify-center">
                    <button onClick={onClose} className="px-12 py-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-full text-[9px] font-black uppercase tracking-[0.4em] transition-all border border-white/5">Exit Asset Console</button>
                </div>
            </motion.div>
        </div>
    );
};

export default DomainDetailsModal;
