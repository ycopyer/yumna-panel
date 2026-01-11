import React, { useState, useEffect } from 'react';
import { X, Key, Trash2, Loader2, Save, Eye, EyeOff, FolderOpen, Activity, Lock, Unlock, HardDrive, Shield } from 'lucide-react';
import axios from 'axios';
import TwoFactorSetupModal from './TwoFactorSetupModal';

interface FTPManagementModalProps {
    account: any;
    onClose: () => void;
    onRefresh: () => void;
}

const FTPManagementModal: React.FC<FTPManagementModalProps> = ({ account, onClose, onRefresh }) => {
    const [activeTab, setActiveTab] = useState<'settings' | 'stats'>('settings');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [formData, setFormData] = useState({
        password: '',
        rootPath: account.rootPath || '',
        description: account.description || '',
        status: account.status,
        two_factor_enabled: account.two_factor_enabled
    });
    const [show2FASetup, setShow2FASetup] = useState(false);

    useEffect(() => {
        if (activeTab === 'stats') {
            fetchStats();
        }
    }, [activeTab]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/ftp/${account.id}/stats`);
            setStats(res.data);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const updateData: any = {
                rootPath: formData.rootPath,
                description: formData.description,
                status: formData.status
            };

            if (formData.password) {
                updateData.password = formData.password;
            }

            await axios.put(`/api/ftp/${account.id}`, updateData);
            alert('FTP account updated successfully!');
            onRefresh();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to update FTP account');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Delete FTP account "${account.username}"? This action cannot be undone.`)) return;

        setLoading(true);
        try {
            await axios.delete(`/api/ftp/${account.id}`);
            onRefresh();
            onClose();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to delete FTP account');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async () => {
        const newStatus = formData.status === 'active' ? 'suspended' : 'active';
        setFormData({ ...formData, status: newStatus });
    };

    const handleDisable2FA = async () => {
        if (!confirm('Disable 2FA for this FTP account? Security will be reduced.')) return;
        setLoading(true);
        try {
            await axios.post(`/api/ftp/${account.id}/2fa/disable`);
            setFormData({ ...formData, two_factor_enabled: 0 });
            onRefresh();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to disable 2FA');
        } finally {
            setLoading(false);
        }
    };

    const generatePassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 16; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData({ ...formData, password });
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[1100] flex items-center justify-center p-4 text-[var(--text-main)]">
            <div className="glass w-full max-w-3xl rounded-[32px] overflow-hidden border border-white/5 shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-8 bg-gradient-to-br from-cyan-600/20 to-transparent border-b border-white/5">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shadow-lg">
                                <Key size={28} className="text-cyan-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight">{account.username}</h3>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">FTP Account</span>
                                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${formData.status === 'active'
                                        ? 'bg-green-500/10 border-green-500/20'
                                        : 'bg-amber-500/10 border-amber-500/20'
                                        }`}>
                                        {formData.status === 'active' ? (
                                            <Unlock size={10} className="text-green-500" />
                                        ) : (
                                            <Lock size={10} className="text-amber-500" />
                                        )}
                                        <span className={`text-[9px] font-black uppercase ${formData.status === 'active' ? 'text-green-500' : 'text-amber-500'
                                            }`}>
                                            {formData.status}
                                        </span>
                                    </div>
                                    {formData.two_factor_enabled === 1 && (
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-indigo-500/10 border-indigo-500/20 text-indigo-400">
                                            <Shield size={10} />
                                            <span className="text-[9px] font-black uppercase">2FA Active</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex gap-2 mt-8">
                        {['settings', 'stats'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all capitalize ${activeTab === tab ? 'bg-cyan-600 text-white' : 'text-white/40 hover:bg-white/5'
                                    }`}
                            >
                                {tab === 'settings' && <Key size={16} />}
                                {tab === 'stats' && <Activity size={16} />}
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-black/20">

                    {activeTab === 'settings' && (
                        <div className="space-y-6 animate-fade">
                            {/* 2FA Status */}
                            <div className="p-6 bg-white/5 rounded-[24px] border border-white/5 border-l-4 border-l-indigo-500/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                                            <Shield size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-white mb-1">2FA Security</h4>
                                            <p className="text-xs text-white/40">
                                                {formData.two_factor_enabled
                                                    ? 'MFA protection is active'
                                                    : 'MFA protection is disabled'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => formData.two_factor_enabled ? handleDisable2FA() : setShow2FASetup(true)}
                                        className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${formData.two_factor_enabled
                                            ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/20'
                                            : 'bg-indigo-500 text-white hover:brightness-110 shadow-lg shadow-indigo-500/20'
                                            }`}
                                    >
                                        {formData.two_factor_enabled ? 'Disable 2FA' : 'Setup 2FA'}
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleUpdate} className="space-y-6">
                                {/* Status Toggle */}
                                <div className="p-6 bg-white/5 rounded-[24px] border border-white/5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-black text-white mb-1">Account Status</h4>
                                            <p className="text-xs text-white/40">
                                                {formData.status === 'active'
                                                    ? 'Account is active and can connect via FTP'
                                                    : 'Account is suspended and cannot connect'}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleToggleStatus}
                                            className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${formData.status === 'active'
                                                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white border border-amber-500/20'
                                                : 'bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white border border-green-500/20'
                                                }`}
                                        >
                                            {formData.status === 'active' ? 'Suspend' : 'Activate'}
                                        </button>
                                    </div>
                                </div>

                                {/* Change Password */}
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-white/60 uppercase tracking-widest ml-1">
                                        Change Password (Leave empty to keep current)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Enter new password"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            minLength={8}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 pr-24 text-white font-bold text-sm focus:border-cyan-500 outline-none transition-all"
                                        />
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/60 transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] text-white/30 ml-1">Minimum 8 characters if changing</p>
                                        <button
                                            type="button"
                                            onClick={generatePassword}
                                            className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider"
                                        >
                                            Generate Password
                                        </button>
                                    </div>
                                </div>

                                {/* Root Path */}
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-white/60 uppercase tracking-widest ml-1">
                                        Root Directory
                                    </label>
                                    <div className="relative">
                                        <FolderOpen size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                                        <input
                                            type="text"
                                            value={formData.rootPath}
                                            onChange={e => setFormData({ ...formData, rootPath: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white font-bold text-sm focus:border-cyan-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-white/60 uppercase tracking-widest ml-1">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white font-bold text-sm focus:border-cyan-500 outline-none transition-all resize-none"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save size={16} />
                                                Save Changes
                                            </>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        disabled={loading}
                                        className="px-6 py-3 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white font-black text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-rose-500/20"
                                    >
                                        <Trash2 size={16} />
                                        Delete
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'stats' && (
                        <div className="space-y-6 animate-fade">
                            {loading ? (
                                <div className="h-[300px] flex flex-col items-center justify-center">
                                    <Loader2 size={32} className="text-cyan-500 animate-spin mb-4" />
                                    <p className="text-xs text-white/40">Loading statistics...</p>
                                </div>
                            ) : stats ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-6 bg-white/5 rounded-[24px] border border-white/5">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                                <HardDrive size={20} className="text-blue-400" />
                                            </div>
                                            <h4 className="text-sm font-black text-white">Storage Used</h4>
                                        </div>
                                        <p className="text-3xl font-black text-white mb-1">{stats.formattedSize}</p>
                                        <p className="text-xs text-white/40">{stats.totalSize.toLocaleString()} bytes</p>
                                    </div>

                                    <div className="p-6 bg-white/5 rounded-[24px] border border-white/5">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                                <FolderOpen size={20} className="text-green-400" />
                                            </div>
                                            <h4 className="text-sm font-black text-white">Total Files</h4>
                                        </div>
                                        <p className="text-3xl font-black text-white mb-1">{stats.fileCount}</p>
                                        <p className="text-xs text-white/40">Files in directory</p>
                                    </div>

                                    <div className="md:col-span-2 p-6 bg-white/5 rounded-[24px] border border-white/5">
                                        <h4 className="text-sm font-black text-white mb-4">Account Information</h4>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                                <span className="text-xs text-white/40">Created</span>
                                                <span className="text-xs font-bold text-white">{new Date(account.createdAt).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                                <span className="text-xs text-white/40">Last Updated</span>
                                                <span className="text-xs font-bold text-white">{new Date(account.updatedAt).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-2">
                                                <span className="text-xs text-white/40">Root Path</span>
                                                <span className="text-xs font-bold text-white font-mono">{account.rootPath}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-[300px] flex flex-col items-center justify-center">
                                    <p className="text-sm text-white/40">No statistics available</p>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>

            {show2FASetup && (
                <TwoFactorSetupModal
                    type="ftp"
                    accountId={account.id}
                    username={account.username}
                    onClose={() => setShow2FASetup(false)}
                    onSuccess={() => {
                        onRefresh();
                        setFormData({ ...formData, two_factor_enabled: 1 });
                    }}
                />
            )}
        </div>
    );
};

export default FTPManagementModal;
