import React, { useState } from 'react';
import { X, Search, Trash2, FileStack, AlertCircle, Loader2, CheckCircle2, Copy } from 'lucide-react';
import axios from 'axios';

interface DuplicateGroup {
    hash: string;
    size: number;
    files: Array<{ path: string; mtime: string }>;
}

interface DuplicateDetectorModalProps {
    path: string;
    onClose: () => void;
    onRefresh: () => void;
}

const DuplicateDetectorModal: React.FC<DuplicateDetectorModalProps> = ({ path, onClose, onRefresh }) => {
    const [loading, setLoading] = useState(false);
    const [groups, setGroups] = useState<DuplicateGroup[]>([]);
    const [selectedToDelete, setSelectedToDelete] = useState<string[]>([]);
    const [deleting, setDeleting] = useState(false);

    const startScan = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/duplicates/scan', { params: { path } });
            setGroups(res.data);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Scan failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSelected = async () => {
        if (!confirm(`Delete ${selectedToDelete.length} duplicate files permanently?`)) return;
        setDeleting(true);
        try {
            for (const filePath of selectedToDelete) {
                await axios.delete('/api/delete', { data: { path: filePath, type: 'file' } });
            }
            alert('Cleanup complete');
            startScan();
            onRefresh();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Delete failed');
        } finally {
            setDeleting(false);
            setSelectedToDelete([]);
        }
    };

    const toggleSelect = (filePath: string) => {
        setSelectedToDelete(prev =>
            prev.includes(filePath) ? prev.filter(p => p !== filePath) : [...prev, filePath]
        );
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-fade" onClick={onClose} />

            <div className="relative w-full max-w-3xl bg-[#0f172a] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-zoom flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-inner">
                            <Copy size={24} className="text-indigo-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">Duplicate Radar</h2>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Scanning: {path}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl transition-all border border-white/5">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    {groups.length === 0 && !loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-6">
                            <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                <Search size={40} className="text-indigo-500 animate-pulse" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-white font-bold mb-2">Initialize Deep Scan</h3>
                                <p className="text-[10px] text-white/40 uppercase tracking-widest leading-loose">
                                    Our engine will analyze MD5 bitstreams to find bit-perfect<br />clones across your directory structure.
                                </p>
                            </div>
                            <button
                                onClick={startScan}
                                className="px-8 py-3 bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all"
                            >
                                Start Radar Scan
                            </button>
                        </div>
                    ) : loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 size={40} className="text-indigo-500 animate-spin" />
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Analyzing bitstreams...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                                <div className="flex items-center gap-3">
                                    <AlertCircle size={16} className="text-indigo-500" />
                                    <span className="text-[11px] font-black text-white/60 uppercase tracking-widest">
                                        Found {groups.length} Groups of Duplicates
                                    </span>
                                </div>
                                {selectedToDelete.length > 0 && (
                                    <button
                                        onClick={handleDeleteSelected}
                                        disabled={deleting}
                                        className="px-4 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-red-600 transition-all"
                                    >
                                        {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                        Wipe {selectedToDelete.length} Files
                                    </button>
                                )}
                            </div>

                            {groups.map((group, idx) => (
                                <div key={group.hash} className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
                                    <div className="px-6 py-4 bg-white/[0.02] flex items-center justify-between border-b border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-[10px] font-black text-indigo-500">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-white uppercase tracking-widest">Bit-Perfect Clone Group</p>
                                                <p className="text-[9px] font-bold text-white/30 truncate max-w-[200px]">{group.hash}</p>
                                            </div>
                                        </div>
                                        <div className="px-3 py-1 bg-white/5 rounded-full text-[9px] font-black text-white/60 uppercase tracking-widest">
                                            {formatSize(group.size)} Each
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-2">
                                        {group.files.map((file, fIdx) => (
                                            <div
                                                key={file.path}
                                                onClick={() => toggleSelect(file.path)}
                                                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${selectedToDelete.includes(file.path)
                                                    ? 'bg-red-500/10 border-red-500/30'
                                                    : 'bg-white/5 border-white/5 hover:border-white/20'
                                                    }`}
                                            >
                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${selectedToDelete.includes(file.path) ? 'bg-red-500 border-red-500' : 'border-white/20'
                                                    }`}>
                                                    {selectedToDelete.includes(file.path) && <X size={12} className="text-white" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-bold text-white truncate">{file.path}</p>
                                                    <p className="text-[9px] font-medium text-white/20 mt-0.5">Last modified: {new Date(file.mtime).toLocaleString()}</p>
                                                </div>
                                                {fIdx === 0 && (
                                                    <span className="text-[8px] font-black text-emerald-500/60 uppercase tracking-tighter px-2 py-0.5 bg-emerald-500/10 rounded-md">Original Suggestion</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-8 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">AI Safety Engine Active</span>
                    </div>
                    <button onClick={onClose} className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest transition-all">
                        Dismiss Radar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DuplicateDetectorModal;
