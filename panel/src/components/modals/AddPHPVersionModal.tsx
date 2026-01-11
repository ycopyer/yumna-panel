import React, { useState } from 'react';
import { X, Server, Download, ShieldCheck, AlertCircle, Loader2, Plus } from 'lucide-react';

import axios from 'axios';

interface AddPHPVersionModalProps {
    onClose: () => void;
    onSuccess: () => void;
    onInstallVersion: (version: string) => Promise<boolean>;
}

const AddPHPVersionModal: React.FC<AddPHPVersionModalProps> = ({ onClose, onSuccess, onInstallVersion }) => {
    const [loading, setLoading] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState('');
    const [error, setError] = useState<string | null>(null);

    const availableVersions = [
        { version: '8.5', label: 'PHP 8.5 (Cutting Edge)', description: 'The absolute latest features and experimental performance.' },
        { version: '8.4', label: 'PHP 8.4 (Modern Stable)', description: 'Current stable release with modern language features.' },
        { version: '8.3', label: 'PHP 8.3 (Stable)', description: 'Latest stable release with improved performance.' },
        { version: '8.2', label: 'PHP 8.2 (Recommended)', description: 'Mature version with widespread support.' },
        { version: '8.1', label: 'PHP 8.1 (Legacy)', description: 'Reliable version for older applications.' },
        { version: '7.4', label: 'PHP 7.4 (Deprecated)', description: 'Last of the 7.x series. Use only if necessary.' },
        { version: '7.3', label: 'PHP 7.3 (Archived)', description: 'Archived 7.x version for legacy compatibility.' },
        { version: '7.2', label: 'PHP 7.2 (Archived)', description: 'Legacy 7.x version for older frameworks.' },
        { version: '5.6', label: 'PHP 5.6 (EoL)', description: 'Legacy 5.x version. Highly discouraged for new sites.' }
    ];

    const [success, setSuccess] = useState<string | null>(null);

    const handleInstall = async () => {
        if (!selectedVersion) return;
        setLoading(true);
        setError(null);
        try {
            const ok = await onInstallVersion(selectedVersion);
            if (ok) {
                setSuccess('Native deployment task successfully broadcasted to server.');
                setTimeout(() => {
                    onSuccess();
                }, 2500);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Failed to initiate installation');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[2200] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="glass w-full max-w-lg rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-transparent">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-500">
                            <Download size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight">Native Engine Manager</h3>
                            <p className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-[0.2em]">Deploying Independent Binary</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/40">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {success ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                                <ShieldCheck size={48} className="text-emerald-500 animate-bounce" />
                            </div>
                            <h4 className="text-2xl font-black text-white mb-2">Installation Started!</h4>
                            <p className="text-[var(--text-muted)] font-medium max-w-[280px] leading-relaxed">
                                {success}
                            </p>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500 text-sm font-bold animate-shake">
                                    <AlertCircle size={18} />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <label className="text-xs font-black text-white/40 uppercase tracking-widest ml-1">Select Version to Install</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 p-2 bg-emerald-500/10 rounded-xl">
                                        <Server size={18} />
                                    </div>
                                    <select
                                        value={selectedVersion}
                                        onChange={(e) => setSelectedVersion(e.target.value)}
                                        className="w-full bg-white/10 border border-white/10 rounded-2xl py-4 pl-14 pr-10 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all appearance-none cursor-pointer hover:bg-white/20"
                                    >
                                        <option value="" disabled className="bg-slate-900 text-white/40">Choose a PHP version...</option>
                                        {availableVersions.map((v) => (
                                            <option key={v.version} value={v.version} className="bg-slate-900 text-white py-2">
                                                {v.label}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                                        {loading ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <div className="border-l border-white/10 pl-3 ml-1">
                                                <Plus size={16} />
                                            </div>
                                        )}
                                    </div>
                                </div>


                                {selectedVersion && (
                                    <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                                        <div className="p-5 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 flex items-start gap-4">
                                            <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-500 mt-1">
                                                <AlertCircle size={16} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-emerald-500 mb-1 uppercase tracking-tight">Version Details</p>
                                                <p className="text-[11px] font-medium text-white/60 leading-relaxed">
                                                    {availableVersions.find(v => v.version === selectedVersion)?.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>


                            <div className="p-5 rounded-3xl bg-amber-500/5 border border-amber-500/10">
                                <p className="text-[11px] font-bold text-amber-500/70 leading-relaxed italic">
                                    * Installation might take 2-5 minutes depending on server resources. The new version will be automatically configured for use once ready.
                                </p>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-8 border-t border-white/5 bg-slate-900/50 flex items-center gap-4">
                    <button onClick={onClose} className="flex-1 py-4 px-6 rounded-2xl bg-white/5 hover:bg-white/10 text-white/60 font-black uppercase tracking-widest text-[11px] transition-all">
                        Cancel
                    </button>
                    <button
                        onClick={handleInstall}
                        disabled={loading || !selectedVersion}
                        className="flex-[2] py-4 px-6 rounded-2xl bg-emerald-500 hover:brightness-110 disabled:opacity-30 disabled:grayscale text-white font-black uppercase tracking-widest text-[11px] shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Installing...</span>
                            </>
                        ) : (
                            <>
                                <Download size={16} />
                                <span>Initiate Installation</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddPHPVersionModal;
