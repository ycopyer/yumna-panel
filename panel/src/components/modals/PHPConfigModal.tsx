import React, { useState, useEffect } from 'react';
import { X, FileEdit, Loader2, Save, RotateCcw, ShieldCheck, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface PHPConfigModalProps {
    onClose: () => void;
    userId: number;
    version?: string;
}

const PHPConfigModal: React.FC<PHPConfigModalProps> = ({ onClose, userId, version = '8.2' }) => {
    const [config, setConfig] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchConfig();
    }, [version]);

    const fetchConfig = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/php/config', {
                params: {
                    version: version.includes('-') ? undefined : version,
                    full_version: version.includes('-') ? version : undefined
                }
            });
            setConfig(res.data.content);
        } catch (err: any) {
            console.error('Failed to fetch PHP config', err);
            setMessage({ type: 'error', text: err.response?.data?.error || 'Target not found.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setMessage(null);
            await axios.post('/api/php/config/save', {
                version: version.includes('-') ? undefined : version,
                full_version: version.includes('-') ? version : undefined,
                content: config
            }, {
                headers: { 'x-user-id': userId }
            });
            setMessage({ type: 'success', text: 'Native configuration synchronized successfully.' });
            setTimeout(() => setMessage(null), 5000);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save configuration.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-[2100] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="glass w-full max-w-4xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[90vh]">
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-amber-500/10 to-transparent">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-500">
                            <FileEdit size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white">Advanced INI Editor</h3>
                            <p className="text-xs font-bold text-amber-500/60 uppercase tracking-widest">Target: php.ini (PHP {version})</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/40">
                        <X size={20} />
                    </button>
                </div>

                {/* Status Bar */}
                {message && (
                    <div className={`px-8 py-3 flex items-center gap-3 animate-in slide-in-from-top duration-300 ${message.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {message.type === 'success' ? <ShieldCheck size={16} /> : <AlertCircle size={16} />}
                        <span className="text-xs font-bold uppercase tracking-wider">{message.text}</span>
                    </div>
                )}

                {/* Editor Content */}
                <div className="flex-1 p-8 bg-slate-950/50 relative overflow-hidden">
                    {loading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                            <Loader2 className="animate-spin text-amber-500" size={40} />
                            <p className="text-amber-500/60 font-bold animate-pulse uppercase tracking-widest text-xs">Parsing Configuration...</p>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col gap-4">
                            <div className="flex items-center justify-between px-2">
                                <p className="text-[var(--text-muted)] text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                    Direct INI Access
                                </p>
                                <button onClick={fetchConfig} className="text-white/40 hover:text-white transition-colors flex items-center gap-2 text-[10px] font-bold uppercase">
                                    <RotateCcw size={12} />
                                    Reload Original
                                </button>
                            </div>
                            <textarea
                                value={config}
                                onChange={(e) => setConfig(e.target.value)}
                                className="flex-1 w-full bg-slate-900/50 border border-white/5 rounded-3xl p-8 text-emerald-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all shadow-inner custom-scrollbar resize-none"
                                placeholder="; PHP configuration file..."
                                spellCheck={false}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-white/5 bg-slate-900/80 flex items-center justify-between">
                    <div className="flex flex-col">
                        <p className="text-white font-bold text-sm">Caution Required</p>
                        <p className="text-[var(--text-muted)] text-[10px] font-medium max-w-sm">
                            Incorrect settings in `php.ini` can cause applications to crash or compromise server security.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="btn-secondary px-8 rounded-2xl">Cancel</button>
                        <button
                            onClick={handleSave}
                            disabled={loading || saving}
                            className="btn-primary flex items-center gap-3 px-10 rounded-2xl shadow-xl shadow-indigo-500/20 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            <span>Commit Changes</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PHPConfigModal;
