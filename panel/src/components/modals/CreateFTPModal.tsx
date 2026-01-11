import React, { useState } from 'react';
import { X, Key, FolderOpen, Loader2, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

interface CreateFTPModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const CreateFTPModal: React.FC<CreateFTPModalProps> = ({ onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        rootPath: '',
        description: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await axios.post('/api/ftp', formData);
            alert('FTP account created successfully!');
            onSuccess();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to create FTP account');
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[1100] flex items-center justify-center p-4">
            <div className="glass w-full max-w-2xl rounded-[32px] overflow-hidden border border-white/5 shadow-2xl animate-scale-up">

                {/* Header */}
                <div className="p-8 bg-gradient-to-br from-cyan-600/20 to-transparent border-b border-white/5">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shadow-lg">
                                <Key size={28} className="text-cyan-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight">Create FTP Account</h3>
                                <p className="text-xs text-white/40 mt-1">Set up a new restricted FTP access account</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-black/20">

                    {/* Username */}
                    <div className="space-y-2">
                        <label className="text-xs font-black text-white/60 uppercase tracking-widest ml-1">
                            FTP Username *
                        </label>
                        <input
                            required
                            type="text"
                            placeholder="ftp_developer"
                            value={formData.username}
                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                            pattern="[a-zA-Z0-9_-]+"
                            title="Only letters, numbers, underscores, and hyphens allowed"
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white font-bold text-sm focus:border-cyan-500 outline-none transition-all"
                        />
                        <p className="text-[10px] text-white/30 ml-1">Only letters, numbers, underscores, and hyphens</p>
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <label className="text-xs font-black text-white/60 uppercase tracking-widest ml-1">
                            Password *
                        </label>
                        <div className="relative">
                            <input
                                required
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter secure password"
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
                            <p className="text-[10px] text-white/30 ml-1">Minimum 8 characters</p>
                            <button
                                type="button"
                                onClick={generatePassword}
                                className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider"
                            >
                                Generate Strong Password
                            </button>
                        </div>
                    </div>

                    {/* Root Path */}
                    <div className="space-y-2">
                        <label className="text-xs font-black text-white/60 uppercase tracking-widest ml-1">
                            Root Directory (Optional)
                        </label>
                        <div className="relative">
                            <FolderOpen size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                            <input
                                type="text"
                                placeholder="/home/user/ftp_directory (auto-generated if empty)"
                                value={formData.rootPath}
                                onChange={e => setFormData({ ...formData, rootPath: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white font-bold text-sm focus:border-cyan-500 outline-none transition-all"
                            />
                        </div>
                        <p className="text-[10px] text-white/30 ml-1">Leave empty to auto-generate a secure path</p>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-xs font-black text-white/60 uppercase tracking-widest ml-1">
                            Description (Optional)
                        </label>
                        <textarea
                            placeholder="e.g., Developer access for project XYZ"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white font-bold text-sm focus:border-cyan-500 outline-none transition-all resize-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 font-bold text-sm transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create FTP Account'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateFTPModal;
