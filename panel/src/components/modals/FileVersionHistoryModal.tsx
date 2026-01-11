import React, { useState, useEffect } from 'react';
import { X, History, RotateCcw, Trash2, Clock, HardDrive, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface FileVersion {
    id: number;
    filePath: string;
    size: number;
    comment: string;
    createdAt: string;
}

interface FileVersionHistoryModalProps {
    filePath: string;
    onClose: () => void;
    onRestoreSuccess?: () => void;
}

const FileVersionHistoryModal: React.FC<FileVersionHistoryModalProps> = ({ filePath, onClose, onRestoreSuccess }) => {
    const [versions, setVersions] = useState<FileVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    useEffect(() => {
        fetchVersions();
    }, [filePath]);

    const fetchVersions = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/versions', { params: { filePath } });
            setVersions(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (id: number) => {
        if (!confirm('This will replace the current file content. A backup of current data will be created first. Proceed?')) return;
        setActionLoading(id);
        try {
            await axios.post(`/api/versions/${id}/restore`);
            alert('Version restored successfully');
            if (onRestoreSuccess) onRestoreSuccess();
            fetchVersions();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Restore failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Permanent delete this version snapshot?')) return;
        setActionLoading(id);
        try {
            await axios.delete(`/api/versions/${id}`);
            fetchVersions();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Delete failed');
        } finally {
            setActionLoading(null);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-fade" onClick={onClose} />

            <div className="relative w-full max-w-xl bg-[#0f172a] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-zoom flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-inner">
                            <History size={24} className="text-indigo-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">Version Timeline</h2>
                            <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest truncate max-w-[200px]">
                                {filePath.split('/').pop()}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl transition-all border border-white/5">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 size={40} className="text-indigo-500 animate-spin" />
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Scanning Chronology...</p>
                        </div>
                    ) : versions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                            <Clock size={48} className="text-white" />
                            <p className="text-sm font-bold text-white">No version snapshots found</p>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">Versions are created automatically when you save changes in the editor.</p>
                        </div>
                    ) : (
                        versions.map((v, idx) => (
                            <div key={v.id} className="group relative flex items-center gap-6 bg-white/[0.02] p-5 rounded-[2rem] border border-white/5 hover:bg-white/[0.04] hover:border-indigo-500/30 transition-all duration-300">
                                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_#6366f1]" />
                                </div>

                                <div className="flex-1 min-w-0 ml-4">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h4 className="text-[13px] font-black text-white">
                                            {idx === 0 ? 'Latest Archive' : `Snapshot #${versions.length - idx}`}
                                        </h4>
                                        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                            {v.comment}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-[10px] font-bold text-white/40">
                                        <span className="flex items-center gap-1.5"><Clock size={12} /> {new Date(v.createdAt).toLocaleString()}</span>
                                        <span className="flex items-center gap-1.5"><HardDrive size={12} /> {formatSize(v.size)}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleRestore(v.id)}
                                        disabled={actionLoading !== null}
                                        className="p-3 bg-white/5 hover:bg-amber-500/10 text-white/40 hover:text-amber-500 rounded-xl transition-all border border-white/5"
                                        title="Rollback to this version"
                                    >
                                        {actionLoading === v.id ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(v.id)}
                                        disabled={actionLoading !== null}
                                        className="p-3 bg-white/5 hover:bg-red-500/10 text-white/40 hover:text-red-500 rounded-xl transition-all border border-white/5"
                                        title="Delete Snapshot"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-8 bg-white/[0.02] border-t border-white/5">
                    <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-start gap-3">
                        <AlertCircle size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold text-indigo-500/70 leading-relaxed uppercase tracking-wider">
                            Immutable logging active. All restoration events are recorded with the original user signature for compliance.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FileVersionHistoryModal;
