import React, { useState } from 'react';
import { X, UserPlus, Mail, Shield, ShieldCheck, Database, Settings, Lock, Server, AtSign, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

interface AddTeamMemberModalProps {
    websiteId: number;
    onClose: () => void;
    onSuccess: () => void;
}

const AddTeamMemberModal: React.FC<AddTeamMemberModalProps> = ({ websiteId, onClose, onSuccess }) => {
    const [email, setEmail] = useState('');
    const [permissions, setPermissions] = useState<Record<string, boolean>>({
        files: true,
        database: false,
        settings: false,
        ssl: false,
        ftp: false,
        email: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await axios.post(`/api/hosting/collaboration/websites/${websiteId}/members`, { email, permissions }, {
                headers: {
                    'x-user-id': localStorage.getItem('userId') || '',
                    'x-session-id': localStorage.getItem('sessionId') || ''
                }
            });
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePermissionChange = (key: string) => {
        setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const permissionItems = [
        { id: 'files', label: 'File Manager', desc: 'Secure transmit & binary mod', icon: <Server size={18} />, color: 'indigo' },
        { id: 'database', label: 'Data Hub', desc: 'Query access & table mods', icon: <Database size={18} />, color: 'emerald' },
        { id: 'settings', label: 'Core Config', desc: 'Override system parameters', icon: <Settings size={18} />, color: 'amber' },
        { id: 'ssl', label: 'Crypto Shield', desc: 'Manage SSL/TLS layer', icon: <Lock size={18} />, color: 'blue' },
        { id: 'ftp', label: 'Relay Access', desc: 'External port management', icon: <Shield size={18} />, color: 'rose' },
        { id: 'email', label: 'Mail Matrix', desc: 'Communication node control', icon: <AtSign size={18} />, color: 'violet' }
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-2xl bg-[#0A0A0A] border border-white/10 rounded-[48px] shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative p-12 pb-8">
                    <button onClick={onClose} className="absolute top-8 right-8 p-3 bg-white/5 hover:bg-white/10 text-white/20 hover:text-white rounded-full transition-all">
                        <X size={20} />
                    </button>

                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20">
                            <UserPlus size={28} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tight">Authorize Agent</h2>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mt-1">Recruit New Operator to this Sector</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="px-12 pb-12 space-y-10">
                    {error && (
                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                            <X size={16} /> {error}
                        </div>
                    )}

                    {/* Email Input */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Mail size={12} /> Operator Identifier (Email)
                        </label>
                        <input
                            type="email"
                            placeholder="agent@yumna-intelligence.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/10"
                            required
                        />
                    </div>

                    {/* Permissions Grid */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Access Privilege Matrix</span>
                            <div className="h-px flex-1 bg-white/5" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {permissionItems.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => handlePermissionChange(item.id)}
                                    className={`flex items-center gap-4 p-4 rounded-[24px] border transition-all text-left group ${permissions[item.id] ? 'bg-indigo-500/5 border-indigo-500/30' : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.03]'}`}
                                >
                                    <div className={`p-2.5 rounded-xl transition-all ${permissions[item.id] ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-white/10 group-hover:text-white/30'}`}>
                                        {item.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-[11px] font-black uppercase tracking-wider leading-none mb-1 ${permissions[item.id] ? 'text-indigo-400' : 'text-white/40'}`}>{item.label}</p>
                                        <p className="text-[9px] font-bold text-white/10 truncate group-hover:text-white/20 transition-colors uppercase tracking-widest">{item.desc}</p>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] transition-all ${permissions[item.id] ? 'bg-indigo-400 shadow-indigo-400' : 'bg-white/5 shadow-transparent'}`} />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-6 flex items-center justify-between">
                        <button type="button" onClick={onClose} className="px-8 py-4 text-white/20 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all">Abort</button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-3 px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/20 active:scale-95 transition-all"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <>Commence Recruitment</>}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default AddTeamMemberModal;
