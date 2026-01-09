import React, { useState } from 'react';
import { X, User, Lock, Mail, Loader2, Key } from 'lucide-react';
import axios from 'axios';

interface AddEmailAccountModalProps {
    userId: number;
    onClose: () => void;
    onSuccess: () => void;
}

const AddEmailAccountModal: React.FC<AddEmailAccountModalProps> = ({ userId, onClose, onSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [quota, setQuota] = useState('1024'); // Default 1GB
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return setError('Email and password are required');

        setLoading(true);
        setError('');
        try {
            await axios.post('/api/mail/accounts', { email, password, quota_mb: parseInt(quota), userId });
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade">
            <div className="glass w-full max-w-md rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-white/5 bg-gradient-to-r from-sky-500/10 to-transparent">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-sky-500/20 flex items-center justify-center border border-sky-500/30">
                            <Mail className="text-white" size={32} />
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-all">
                            <X size={24} />
                        </button>
                    </div>
                    <h2 className="text-3xl font-black text-white tracking-tight">New Account</h2>
                    <p className="text-white/50 font-medium">Create a secure mailbox for your domain.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Full Email Address</label>
                            <div className="relative">
                                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                                <input
                                    autoFocus
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="info@yourdomain.com"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all font-medium placeholder:text-white/20"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Account Password</label>
                            <div className="relative">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all font-medium placeholder:text-white/20"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Storage Quota (MB)</label>
                            <div className="relative">
                                <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                                <input
                                    type="number"
                                    value={quota}
                                    onChange={(e) => setQuota(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all font-medium"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 rounded-2xl bg-sky-500 text-white font-black shadow-lg shadow-sky-500/20 hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center justify-center gap-3"
                    >
                        {loading ? <Loader2 size={24} className="animate-spin text-white/40" /> : 'Create Mailbox'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddEmailAccountModal;
