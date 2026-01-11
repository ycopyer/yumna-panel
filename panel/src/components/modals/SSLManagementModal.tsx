import React, { useState, useEffect } from 'react';
import { X, Shield, Globe, Lock, Unlock, Upload, CheckCircle2, AlertCircle, Loader2, Sparkles, Key } from 'lucide-react';
import axios from 'axios';

interface SSLManagementModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const SSLManagementModal: React.FC<SSLManagementModalProps> = ({ onClose, onSuccess }) => {
    const [activeTab, setActiveTab] = useState<'letsencrypt' | 'custom'>('letsencrypt');
    const [loading, setLoading] = useState(false);
    const [domains, setDomains] = useState<any[]>([]);
    const [selectedDomain, setSelectedDomain] = useState('');
    const [isWildcard, setIsWildcard] = useState(false);

    // Custom SSL state
    const [customDomain, setCustomDomain] = useState('');
    const [certData, setCertData] = useState('');
    const [keyData, setKeyData] = useState('');
    const [chainData, setChainData] = useState('');

    useEffect(() => {
        fetchDomains();
    }, []);

    const fetchDomains = async () => {
        try {
            const res = await axios.get('/api/websites');
            setDomains(res.data);
            if (res.data.length > 0) setSelectedDomain(res.data[0].domain);
        } catch (err) {
            console.error('Failed to fetch domains', err);
        }
    };

    const handleIssueLetsEncrypt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDomain) return;

        setLoading(true);
        try {
            await axios.post('/api/ssl/letsencrypt', {
                domain: selectedDomain,
                wildcard: isWildcard
            });
            onSuccess();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to issue Let\'s Encrypt certificate.');
        } finally {
            setLoading(false);
        }
    };

    const handleUploadCustom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customDomain || !certData || !keyData) {
            alert('Domain, Certificate, and Private Key are required');
            return;
        }

        setLoading(true);
        try {
            await axios.post('/api/ssl/upload', {
                domain: customDomain,
                cert: certData,
                key: keyData,
                chain: chainData
            });
            onSuccess();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to upload custom SSL');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-fade" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-[#0f172a] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-zoom">
                {/* Header */}
                <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shadow-inner">
                            <Shield size={24} className="text-cyan-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">SSL/TLS Manager</h2>
                            <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Install New Certificate</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl transition-all border border-white/5">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-2 gap-2 bg-white/5 border-b border-white/5">
                    <button
                        onClick={() => setActiveTab('letsencrypt')}
                        className={`flex-1 py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all core-transition flex items-center justify-center gap-3 ${activeTab === 'letsencrypt' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <Sparkles size={16} /> Let's Encrypt (Auto)
                    </button>
                    <button
                        onClick={() => setActiveTab('custom')}
                        className={`flex-1 py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all core-transition flex items-center justify-center gap-3 ${activeTab === 'custom' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <Upload size={16} /> Custom SSL
                    </button>
                </div>

                <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {activeTab === 'letsencrypt' ? (
                        <form onSubmit={handleIssueLetsEncrypt} className="space-y-6 animate-fade">
                            <div className="p-6 bg-cyan-500/5 rounded-3xl border border-cyan-500/10 mb-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
                                        <Lock size={18} />
                                    </div>
                                    <h3 className="font-black text-white text-sm">Automated Let's Encrypt</h3>
                                </div>
                                <p className="text-xs text-white/50 leading-relaxed font-medium">
                                    Get a free, automated SSL certificate from Let's Encrypt. The domain must be pointing to this server's IP address and reachable via HTTP for verification.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Select Domain</label>
                                <div className="relative">
                                    <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                                    <select
                                        value={selectedDomain}
                                        onChange={(e) => setSelectedDomain(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold text-sm focus:border-cyan-500 outline-none transition-all appearance-none cursor-pointer hover:bg-white/10"
                                        required
                                    >
                                        {domains.length === 0 ? (
                                            <option disabled>No websites found</option>
                                        ) : (
                                            domains.map(d => (
                                                <option key={d.id} value={d.domain} className="bg-[#0f172a]">{d.domain}</option>
                                            ))
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 group cursor-pointer" onClick={() => setIsWildcard(!isWildcard)}>
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${isWildcard ? 'bg-cyan-500 border-cyan-500 text-white' : 'border-white/10 group-hover:border-white/20'}`}>
                                    {isWildcard && <CheckCircle2 size={14} />}
                                </div>
                                <div className="flex-1">
                                    <div className="text-[10px] font-black text-white uppercase tracking-wider">Include Wildcard (*.{selectedDomain})</div>
                                    <div className="text-[9px] font-medium text-white/40">Requires DNS-01 verification (automated for hosted zones)</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                                <AlertCircle size={16} className="text-amber-500 shrink-0" />
                                <p className="text-[10px] font-bold text-amber-500/80 leading-relaxed uppercase tracking-wider">
                                    A and www records MUST point to this server before proceeding.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || domains.length === 0}
                                className="w-full py-5 bg-cyan-500 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-3 active:scale-95 group"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Issuing Certificate...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={20} className="group-hover:scale-110 transition-transform" />
                                        Issue Certificate
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleUploadCustom} className="space-y-6 animate-fade">
                            <div className="p-6 bg-purple-500/5 rounded-3xl border border-purple-500/10 mb-6 text-center">
                                <Upload size={32} className="text-purple-500 mx-auto mb-3" />
                                <h3 className="font-black text-white text-sm mb-1 uppercase tracking-wider">Upload Custom SSL</h3>
                                <p className="text-xs text-white/50 px-8">Bring your own certificate from Comodo, DigiCert, or others.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Domain Name</label>
                                <input
                                    type="text"
                                    placeholder="example.com"
                                    value={customDomain}
                                    onChange={(e) => setCustomDomain(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold text-sm focus:border-purple-500 outline-none transition-all placeholder:text-white/10"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Certificate (CRT/PEM)</label>
                                        <Sparkles size={12} className="text-purple-500" />
                                    </div>
                                    <textarea
                                        placeholder="-----BEGIN CERTIFICATE-----..."
                                        value={certData}
                                        onChange={(e) => setCertData(e.target.value)}
                                        className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-[10px] font-mono text-white/70 focus:border-purple-500 outline-none transition-all custom-scrollbar resize-none"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Private Key (KEY)</label>
                                        <Key size={12} className="text-purple-500" />
                                    </div>
                                    <textarea
                                        placeholder="-----BEGIN PRIVATE KEY-----..."
                                        value={keyData}
                                        onChange={(e) => setKeyData(e.target.value)}
                                        className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-[10px] font-mono text-white/70 focus:border-purple-500 outline-none transition-all custom-scrollbar resize-none"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">CA-Bundle / Chain (Optional)</label>
                                    <textarea
                                        placeholder="-----BEGIN CERTIFICATE-----..."
                                        value={chainData}
                                        onChange={(e) => setChainData(e.target.value)}
                                        className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl p-4 text-[10px] font-mono text-white/70 focus:border-purple-500 outline-none transition-all custom-scrollbar resize-none"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 bg-purple-500 hover:brightness-110 disabled:opacity-50 text-white text-sm font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-purple-500/20 flex items-center justify-center gap-3 py-6 active:scale-95"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={20} />
                                        Save Certificate
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SSLManagementModal;
