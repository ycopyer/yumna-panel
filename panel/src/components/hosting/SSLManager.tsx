import React, { useState } from 'react';
import { Shield, Plus, Search, Calendar, Globe, Trash2, ExternalLink, AlertCircle, CheckCircle2, Lock, Unlock } from 'lucide-react';
import axios from 'axios';

interface SSLManagerProps {
    certificates: any[];
    loading: boolean;
    onRefresh: () => void;
    onAddSSL: () => void;
}

const SSLManager: React.FC<SSLManagerProps> = ({ certificates, loading, onRefresh, onAddSSL }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const filteredCerts = certificates.filter(cert =>
        cert.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cert.provider.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to remove this SSL certificate record?')) return;

        setActionLoading(`delete-${id}`);
        try {
            await axios.delete(`/api/ssl/${id}`);
            onRefresh();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to delete certificate');
        } finally {
            setActionLoading(null);
        }
    };

    const isExpired = (expiry: string) => {
        return new Date(expiry) < new Date();
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const handleRenew = async (id: number) => {
        setActionLoading(`renew-${id}`);
        try {
            const res = await axios.post(`/api/ssl/${id}/renew`);
            alert(res.data.message || 'SSL Certificate renewed successfully!');
            onRefresh();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to renew certificate');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[var(--bg-dark)]/50">
            {/* Header / Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-dark)]/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
                        <Shield size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-[var(--text-main)] tracking-tight">SSL/TLS Certificates</h2>
                        <p className="text-[11px] font-bold text-[var(--text-muted)]">Secure your websites with Let's Encrypt or Custom SSL</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                        <input
                            placeholder="Search domains..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl py-2 pl-9 pr-4 text-xs font-bold text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all w-48 focus:w-64"
                        />
                    </div>
                    <button
                        onClick={onAddSSL}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95"
                    >
                        <Plus size={14} />
                        <span className="hidden sm:inline">Add Certificate</span>
                    </button>
                    <button
                        onClick={onRefresh}
                        className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-cyan-500 hover:border-cyan-500/30 transition-all"
                        title="Refresh List"
                    >
                        <Globe size={14} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center animate-fade">
                        <div className="w-12 h-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin mb-4" />
                        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Loading Certificates...</p>
                    </div>
                ) : filteredCerts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center animate-fade text-center max-w-md mx-auto">
                        <div className="p-8 rounded-[2.5rem] bg-[var(--bg-card)] border border-[var(--border)] mb-6 shadow-2xl relative">
                            <Shield size={64} className="text-[var(--text-muted)] opacity-10 mx-auto" />
                            <Lock size={24} className="text-cyan-500/40 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <h3 className="text-xl font-black text-[var(--text-main)] mb-2">No Certificates Found</h3>
                        <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-8 font-medium">
                            Protect your visitors' data and improve SEO by installing SSL certificates for your domains.
                        </p>
                        <button
                            onClick={onAddSSL}
                            className="px-8 py-3 bg-[var(--primary)] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[var(--primary)]/20"
                        >
                            Get Started Now
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCerts.map((cert) => (
                            <div key={cert.id} className="group bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border)] hover:border-cyan-500/40 transition-all duration-500 overflow-hidden hover:shadow-2xl hover:shadow-cyan-500/5 hover:-translate-y-1">
                                <div className="p-7">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-2xl ${cert.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {cert.status === 'active' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                                            </div>
                                            <div>
                                                <h4 className="text-base font-black text-[var(--text-main)] tracking-tight group-hover:text-cyan-500 transition-colors truncate max-w-[160px]">
                                                    {cert.domain}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${cert.provider === 'letsencrypt' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/10' : 'bg-purple-500/10 text-purple-500 border border-purple-500/10'}`}>
                                                        {cert.provider}
                                                    </span>
                                                    {cert.auto_renew ? (
                                                        <span className="flex items-center gap-1 text-[9px] font-black text-green-500/60 uppercase tracking-widest">
                                                            <Globe size={10} /> Auto
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <div className={`text-[10px] font-black px-3 py-1 rounded-lg ${isExpired(cert.expiry_date) ? 'bg-red-500/10 text-red-500 border border-red-500/10' : 'bg-green-500/10 text-green-500 border border-green-500/10'}`}>
                                                {cert.status.toUpperCase()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 mb-7 p-4 bg-[var(--bg-dark)]/40 rounded-2xl border border-[var(--border)]">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                                                <Calendar size={12} className="text-cyan-500" /> Expiry Date
                                            </span>
                                            <span className={`text-xs font-black ${isExpired(cert.expiry_date) ? 'text-red-500' : 'text-[var(--text-main)]'}`}>
                                                {formatDate(cert.expiry_date)}
                                            </span>
                                        </div>
                                        <div className="h-1 bg-[var(--border)] rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${isExpired(cert.expiry_date) ? 'bg-red-500' : 'bg-cyan-500'}`}
                                                style={{ width: isExpired(cert.expiry_date) ? '100%' : '75%' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => window.open(`https://${cert.domain}`, '_blank')}
                                            className="flex-1 py-3 bg-[var(--bg-dark)]/60 hover:bg-cyan-500/10 text-[var(--text-muted)] hover:text-cyan-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--border)] hover:border-cyan-500/30 transition-all flex items-center justify-center gap-2"
                                        >
                                            <ExternalLink size={12} /> View Site
                                        </button>

                                        {cert.provider === 'letsencrypt' && (
                                            <button
                                                disabled={!!actionLoading}
                                                onClick={() => handleRenew(cert.id)}
                                                className="flex-1 py-3 bg-cyan-600/10 hover:bg-cyan-600 text-cyan-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-cyan-500/20 hover:border-cyan-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {actionLoading === `renew-${cert.id}` ? (
                                                    <Globe size={12} className="animate-spin" />
                                                ) : <Shield size={12} />}
                                                Renew
                                            </button>
                                        )}

                                        <button
                                            disabled={actionLoading === `delete-${cert.id}`}
                                            onClick={() => handleDelete(cert.id)}
                                            className="p-3 bg-red-500/5 hover:bg-red-500/10 text-red-500/40 hover:text-red-500 rounded-xl border border-[var(--border)] hover:border-red-500/30 transition-all disabled:opacity-50"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SSLManager;
