import React, { useState, useEffect } from 'react';
import { X, Puzzle, Loader2, Check, ShieldAlert, Download, Power, Search } from 'lucide-react';
import axios from 'axios';

interface PHPExtension {
    name: string;
    description: string;
    status: 'installed' | 'not_installed';
    enabled: boolean;
}

interface PHPExtensionsModalProps {
    onClose: () => void;
    userId: number;
    version?: string;
}

const PHPExtensionsModal: React.FC<PHPExtensionsModalProps> = ({ onClose, userId, version = '8.2' }) => {
    const [extensions, setExtensions] = useState<PHPExtension[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchExtensions();
    }, []);

    const fetchExtensions = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/php/extensions', {
                params: {
                    version: version.includes('-') ? undefined : version,
                    full_version: version.includes('-') ? version : undefined
                }
            });
            setExtensions(res.data);
        } catch (err) {
            console.error('Failed to fetch PHP extensions', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (extName: string, action: 'toggle' | 'install') => {
        setActionLoading(extName);
        try {
            const currentExt = extensions.find(e => e.name === extName);
            if (!currentExt && action === 'toggle') return;

            const isToggle = action === 'toggle';
            const newEnabled = isToggle ? !currentExt!.enabled : true;

            await axios.post('/api/php/extensions/toggle', {
                version: version.includes('-') ? undefined : version,
                full_version: version.includes('-') ? version : undefined,
                extension: extName,
                enabled: newEnabled
            }, {
                headers: { 'x-user-id': localStorage.getItem('userId') }
            });

            setExtensions(prev => prev.map(ext => {
                if (ext.name === extName) {
                    if (action === 'toggle') return { ...ext, enabled: newEnabled };
                    if (action === 'install') return { ...ext, status: 'installed', enabled: true };
                }
                return ext;
            }));
        } catch (err: any) {
            console.error('Action failed', err);
            alert(err.response?.data?.error || 'Failed to update extension.');
        } finally {
            setActionLoading(null);
        }
    };

    const filtered = extensions.filter(ex =>
        ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[2100] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="glass w-full max-w-2xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-transparent">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-500">
                            <Puzzle size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white">PHP Extensions</h3>
                            <p className="text-xs font-bold text-emerald-500/60 uppercase tracking-widest">Target Engine: PHP {version}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/40">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 bg-white/5">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-emerald-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search extensions (e.g. redis, imagick...)"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="animate-spin text-emerald-500" size={40} />
                            <p className="text-emerald-500/60 font-bold animate-pulse uppercase tracking-widest text-xs">Loading Extensions...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filtered.map((ext) => (
                                <div key={ext.name} className="p-5 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h4 className="font-black text-white group-hover:text-emerald-400 transition-colors">{ext.name}</h4>
                                            <p className="text-xs text-[var(--text-muted)] line-clamp-1">{ext.description}</p>
                                        </div>
                                        <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${ext.status === 'installed' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-500/20 text-slate-400'}`}>
                                            {ext.status === 'installed' ? 'Installed' : 'Available'}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mt-4">
                                        {ext.status === 'installed' ? (
                                            <>
                                                <button
                                                    onClick={() => handleAction(ext.name, 'toggle')}
                                                    disabled={!!actionLoading}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${ext.enabled ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30' : 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30'}`}
                                                >
                                                    {actionLoading === ext.name ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                                                    {ext.enabled ? 'Disable' : 'Enable'}
                                                </button>
                                                <div className="p-2 aspect-square rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                                    <Check size={14} />
                                                </div>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => handleAction(ext.name, 'install')}
                                                disabled={!!actionLoading}
                                                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 text-xs font-bold transition-all"
                                            >
                                                {actionLoading === ext.name ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                                Install Extension
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-8 border-t border-white/5 bg-slate-900/50 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-amber-500 font-bold text-xs italic">
                        <ShieldAlert size={16} />
                        Changes may require PHP-FPM restart.
                    </div>
                    <button onClick={onClose} className="btn-secondary px-6 rounded-xl">Close</button>
                </div>
            </div>
        </div>
    );
};

export default PHPExtensionsModal;
