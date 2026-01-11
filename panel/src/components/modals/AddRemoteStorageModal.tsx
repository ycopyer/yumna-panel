import React, { useState } from 'react';
import { X, Globe, Server, Shield, Loader2, CheckCircle2, AlertCircle, Key, HardDrive, LayoutGrid } from 'lucide-react';
import axios from 'axios';

interface AddRemoteStorageModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const AddRemoteStorageModal: React.FC<AddRemoteStorageModalProps> = ({ onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [testLoading, setTestLoading] = useState(false);
    const [provider, setProvider] = useState<'sftp' | 's3' | 'dropbox' | 'google_drive'>('sftp');

    const [formData, setFormData] = useState({
        name: '',
        host: '',
        port: '22',
        username: '',
        password: '',
        remotePath: '/backups'
    });

    const handleTest = async () => {
        setTestLoading(true);
        try {
            const res = await axios.post('/api/backups/storage/test', {
                provider,
                config: formData
            });
            alert(res.data.message);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Connection failed');
        } finally {
            setTestLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('/api/backups/storage', {
                name: formData.name,
                provider,
                config: formData
            });
            onSuccess();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to connect storage');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-fade" onClick={onClose} />

            <div className="relative w-full max-w-xl bg-[#0f172a] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-zoom">
                {/* Header */}
                <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shadow-inner">
                            <Server size={24} className="text-cyan-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">Connect Remote Storage</h2>
                            <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest">External redundancy node</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl transition-all border border-white/5">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                    {/* Provider Selector */}
                    <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10">
                        {(['sftp', 's3', 'dropbox', 'google_drive'] as const).map(p => (
                            <button
                                key={p}
                                onClick={() => setProvider(p)}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${provider === p ? 'bg-cyan-500 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'} ${p !== 'sftp' ? 'opacity-40 cursor-not-allowed' : ''}`}
                                disabled={p !== 'sftp'}
                            >
                                {p.replace('_', ' ')}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Configuration Name</label>
                            <input
                                required
                                type="text"
                                placeholder="e.g. My SFTP Storage"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold text-sm focus:border-cyan-500 outline-none transition-all"
                            />
                        </div>

                        {provider === 'sftp' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Host Address</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="ip or domain"
                                        value={formData.host}
                                        onChange={e => setFormData({ ...formData, host: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold text-sm focus:border-cyan-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Port</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.port}
                                        onChange={e => setFormData({ ...formData, port: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold text-sm focus:border-cyan-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Username</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold text-sm focus:border-cyan-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Password</label>
                                    <input
                                        required
                                        type="password"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold text-sm focus:border-cyan-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Remote Directory</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.remotePath}
                                        onChange={e => setFormData({ ...formData, remotePath: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold text-sm focus:border-cyan-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4 pt-4">
                            <button
                                type="button"
                                onClick={handleTest}
                                disabled={testLoading}
                                className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl border border-white/10 transition-all flex items-center justify-center gap-2"
                            >
                                {testLoading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                                Test Connection
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-[2] py-4 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                Save Configuration
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddRemoteStorageModal;
