import React, { useState, useEffect } from 'react';
import { X, Key, Loader2, Shield } from 'lucide-react';
import axios from 'axios';

interface AddSSHAccountModalProps {
    userId: number;
    onClose: () => void;
    onSuccess: () => void;
}

const AddSSHAccountModal: React.FC<AddSSHAccountModalProps> = ({ userId, onClose, onSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [domainId, setDomainId] = useState('');
    const [domains, setDomains] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDomains = async () => {
            try {
                const res = await axios.get('/api/websites');
                setDomains(res.data);
            } catch (err) {
                console.error('Failed to fetch domains', err);
            }
        };
        fetchDomains();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) {
            return setError('Username and password are required');
        }

        setLoading(true);
        setError('');

        try {
            await axios.post('/api/ssh-accounts', {
                username,
                password,
                domainId: domainId ? parseInt(domainId) : null
            });
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create SSH account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade">
            <div className="glass w-full max-w-md rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-white/5 bg-gradient-to-br from-emerald-500/10 to-transparent">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                            <Key className="text-white" size={32} />
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-all">
                            <X size={24} />
                        </button>
                    </div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Create SSH Account</h2>
                    <p className="text-white/50 font-medium">Secure shell access with domain isolation.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">SSH Username</label>
                        <input
                            autoFocus
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium"
                            placeholder="e.g., user_ssh"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium"
                            placeholder="Enter strong password"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Restrict to Domain (Optional)</label>
                        <select
                            value={domainId}
                            onChange={(e) => setDomainId(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm font-medium"
                        >
                            <option value="" className="bg-slate-800">No Restriction (Full Access)</option>
                            {domains.map(d => (
                                <option key={d.id} value={d.id} className="bg-slate-800">{d.domain}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-white/30 font-bold ml-1">If selected, user can only access this domain's folder</p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <Shield className="text-emerald-500" size={20} />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-black text-white uppercase tracking-wider">Domain Isolation</p>
                                <p className="text-[10px] text-white/40 font-bold uppercase">Restricted file access</p>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-black shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center justify-center gap-3"
                    >
                        {loading ? <Loader2 size={24} className="animate-spin text-white/40" /> : 'Create SSH Account'}
                    </button>

                    <p className="text-center text-[10px] font-bold text-white/20 uppercase tracking-widest">
                        System user will be created automatically
                    </p>
                </form>
            </div>
        </div>
    );
};

export default AddSSHAccountModal;
