import React, { useState } from 'react';
import { X, Shield, ShieldCheck, Database, Settings, Lock, Server, AtSign, Loader2, User } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

interface EditPermissionsModalProps {
    websiteId: number;
    member: any;
    onClose: () => void;
    onSuccess: () => void;
}

const EditPermissionsModal: React.FC<EditPermissionsModalProps> = ({
    websiteId,
    member,
    onClose,
    onSuccess
}) => {
    const initialPermissions = typeof member.permissions === 'string'
        ? JSON.parse(member.permissions)
        : member.permissions || {};

    const [permissions, setPermissions] = useState<Record<string, boolean>>({
        files: initialPermissions.files || false,
        database: initialPermissions.database || false,
        settings: initialPermissions.settings || false,
        ssl: initialPermissions.ssl || false,
        ftp: initialPermissions.ftp || false,
        email: initialPermissions.email || false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await axios.put(`/api/hosting/collaboration/websites/${websiteId}/members/${member.id}`, { permissions }, {
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
                        <div className="p-3 bg-violet-500/10 rounded-2xl text-violet-400 border border-violet-500/20">
                            <Shield size={28} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tight">Reconfigure Authority</h2>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mt-1">Adjust Operator Privilege Level</p>
                        </div>
                    </div>

                    {/* Member Info Hud */}
                    <div className="flex items-center gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-3xl mt-8">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center text-white/40 border border-white/10">
                            <User size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-black text-white uppercase tracking-wider">{member.username}</p>
                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{member.email}</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="px-12 pb-12 space-y-10">
                    {error && (
                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                            <X size={16} /> {error}
                        </div>
                    )}

                    {/* Permissions Grid */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Modified Access Privilege Matrix</span>
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
                            className="flex items-center gap-3 px-12 py-5 bg-violet-600 hover:bg-violet-500 text-white rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-violet-900/20 active:scale-95 transition-all"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <>Update Authorization</>}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default EditPermissionsModal;
