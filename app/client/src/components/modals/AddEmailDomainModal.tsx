import React, { useState } from 'react';
import { X, Mail, Shield, Check, Loader2 } from 'lucide-react';
import axios from 'axios';

interface AddEmailDomainModalProps {
    userId: number;
    onClose: () => void;
    onSuccess: () => void;
}

const AddEmailDomainModal: React.FC<AddEmailDomainModalProps> = ({ userId, onClose, onSuccess }) => {
    const [domain, setDomain] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!domain) return setError('Domain name is required');

        setLoading(true);
        setError('');
        try {
            await axios.post('/api/mail/domains', { domain, userId });
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to add domain');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade">
            <div className="glass w-full max-w-md rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-white/5 bg-gradient-to-r from-indigo-500/10 to-transparent">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                            <Mail className="text-white" size={32} />
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-all">
                            <X size={24} />
                        </button>
                    </div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Add Domain</h2>
                    <p className="text-white/50 font-medium">Connect a new domain to the mail server.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Domain Name</label>
                        <input
                            autoFocus
                            type="text"
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            placeholder="e.g. business.com"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-medium placeholder:text-white/20"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/5">
                            <Shield size={14} className="text-emerald-500" />
                            <span className="text-[10px] font-black uppercase text-white/60">Auto DKIM</span>
                        </div>
                        <div className="flex items-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/5">
                            <Check size={14} className="text-emerald-500" />
                            <span className="text-[10px] font-black uppercase text-white/60">SPF Check</span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 rounded-2xl bg-indigo-500 text-white font-black shadow-lg shadow-indigo-500/20 hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center justify-center gap-3"
                    >
                        {loading ? <Loader2 size={24} className="animate-spin text-white/40" /> : 'Activate Domain'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddEmailDomainModal;
