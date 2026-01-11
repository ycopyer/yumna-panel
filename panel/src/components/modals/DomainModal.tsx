import React, { useState } from 'react';
import { X, Globe, Calendar, Shield, Server, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

interface DomainModalProps {
    domain?: any;
    onClose: () => void;
    onSuccess: () => void;
}

const DomainModal: React.FC<DomainModalProps> = ({ domain, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        domain: domain?.domain || '',
        registrar: domain?.registrar || '',
        registration_date: domain?.registration_date || '',
        expiry_date: domain?.expiry_date || '',
        auto_renew: domain?.auto_renew || false,
        whois_privacy: domain?.whois_privacy || false,
        nameservers: domain?.nameservers || ['', ''],
        status: domain?.status || 'active'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const url = domain ? `/api/hosting/domains/${domain.id}` : '/api/hosting/domains';
            const method = domain ? 'put' : 'post';

            await (axios as any)[method](url, {
                ...formData,
                nameservers: formData.nameservers.filter((ns: string) => ns.trim() !== '')
            });

            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleNameserverChange = (index: number, value: string) => {
        const newNameservers = [...formData.nameservers];
        newNameservers[index] = value;
        setFormData({ ...formData, nameservers: newNameservers });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-2xl bg-[#0D0D0D] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden shadow-indigo-500/10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative p-10 pb-6">
                    <div className="absolute top-0 right-0 p-8">
                        <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-full transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                            <Globe size={24} />
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tight">{domain ? 'Update Asset' : 'Register Asset'}</h2>
                    </div>
                    <p className="text-white/30 text-xs font-black uppercase tracking-[0.2em] ml-1">Configure your global domain identity</p>
                </div>

                <form onSubmit={handleSubmit} className="p-10 pt-4 space-y-8">
                    <div className="max-h-[60vh] overflow-y-auto px-1 space-y-8 custom-scrollbar pr-4">
                        {error && (
                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-xs font-black uppercase tracking-widest flex items-center gap-3">
                                <X size={16} />
                                {error}
                            </motion.div>
                        )}

                        {/* Section 1: Identity */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">01. Identity Matrix</span>
                                <div className="h-px flex-1 bg-white/5" />
                            </div>

                            <div className="group relative">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1 mb-2 block">FQDN / Domain Index</label>
                                <input
                                    type="text"
                                    placeholder="example.com"
                                    value={formData.domain}
                                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/10"
                                    required
                                    disabled={!!domain}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Registrar Handler</label>
                                    <input
                                        type="text"
                                        placeholder="Namecheap, etc"
                                        value={formData.registrar}
                                        onChange={(e) => setFormData({ ...formData, registrar: e.target.value })}
                                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Asset Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all appearance-none"
                                    >
                                        <option value="active" style={{ background: '#0a0a0a' }}>ACTIVE</option>
                                        <option value="expired" style={{ background: '#0a0a0a' }}>EXPIRED</option>
                                        <option value="pending_transfer" style={{ background: '#0a0a0a' }}>PENDING</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Expiry */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">02. Temporal Scan</span>
                                <div className="h-px flex-1 bg-white/5" />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Reg Date</label>
                                    <input type="date" value={formData.registration_date} onChange={(e) => setFormData({ ...formData, registration_date: e.target.value })} className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all [color-scheme:dark]" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Expiry Node</label>
                                    <input type="date" value={formData.expiry_date} onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })} className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all [color-scheme:dark]" />
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Protocal */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-rose-400 uppercase tracking-[0.3em]">03. Defense Protocol</span>
                                <div className="h-px flex-1 bg-white/5" />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <label className="relative flex flex-col items-center justify-center p-6 bg-white/[0.02] border border-white/5 rounded-3xl cursor-pointer hover:bg-white/[0.04] transition-all group">
                                    <input type="checkbox" className="sr-only" checked={formData.auto_renew} onChange={(e) => setFormData({ ...formData, auto_renew: e.target.checked })} />
                                    <Shield size={24} className={`mb-2 transition-all ${formData.auto_renew ? 'text-indigo-500 scale-110' : 'text-white/10'}`} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Auto-Renew</span>
                                    {formData.auto_renew && <div className="absolute inset-0 border-2 border-indigo-500/50 rounded-3xl" />}
                                </label>
                                <label className="relative flex flex-col items-center justify-center p-6 bg-white/[0.02] border border-white/5 rounded-3xl cursor-pointer hover:bg-white/[0.04] transition-all group">
                                    <input type="checkbox" className="sr-only" checked={formData.whois_privacy} onChange={(e) => setFormData({ ...formData, whois_privacy: e.target.checked })} />
                                    <LockIcon size={24} className={`mb-2 transition-all ${formData.whois_privacy ? 'text-emerald-500 scale-110' : 'text-white/10'}`} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Whois Privacy</span>
                                    {formData.whois_privacy && <div className="absolute inset-0 border-2 border-emerald-500/50 rounded-3xl" />}
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/10 flex items-center justify-between">
                        <button type="button" onClick={onClose} className="px-8 py-4 text-white/30 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-colors">Abourt Action</button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group flex items-center gap-3 px-10 py-4 bg-indigo-500 text-white rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-indigo-500/20 hover:brightness-110 active:scale-95 transition-all"
                        >
                            {loading ? <Loader2 className="animate-spin" size={16} /> : <><Globe size={16} /> Sync Index</>}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

const LockIcon = ({ size, className }: { size: number, className: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="18" height="11" x="3" y="11" rx="4" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
)

export default DomainModal;
