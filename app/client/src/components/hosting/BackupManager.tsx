import React from 'react';
import { Archive, Plus, Trash2, Download, RotateCcw, ShieldCheck, Clock, HardDrive, Filter, Activity } from 'lucide-react';

import axios from 'axios';

interface BackupManagerProps {
    backups: any[];
    loading: boolean;
    onRefresh: () => void;
    onAddBackup: () => void;
}

const BackupManager: React.FC<BackupManagerProps> = ({ backups, loading, onRefresh, onAddBackup }) => {

    // Auto-refresh if any backup is pending
    React.useEffect(() => {
        const hasPending = backups.some(b => b.status === 'pending');
        if (hasPending) {
            const interval = setInterval(() => {
                onRefresh();
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [backups, onRefresh]);

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this backup?')) return;
        try {
            await axios.delete(`/api/backups/${id}`);
            onRefresh();
        } catch (err) {
            console.error('Failed to delete backup', err);
        }
    };

    const handleDownload = async (id: number, name: string) => {
        try {
            const response = await axios.get(`/api/backups/${id}/download`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            const downloadName = name.endsWith('.zip') ? name : `${name}.zip`;
            link.href = url;
            link.setAttribute('download', downloadName);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Failed to download backup', err);
            alert('Failed to download backup');
        }
    };

    const formatSize = (bytes: number) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black tracking-tight text-[var(--text-main)] mb-2">Disaster Recovery</h2>
                    <p className="text-[var(--text-muted)] font-medium">Enterprise snapshots and automated system redundancy.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onRefresh}
                        className="p-3 rounded-2xl bg-[var(--nav-hover)] border border-[var(--border)] text-[var(--text-main)] hover:border-[var(--primary)]/40 transition-all active:scale-95"
                    >
                        <Activity size={20} className={backups.some(b => b.status === 'pending') ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={onAddBackup}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all"
                    >
                        <Plus size={20} />
                        <span>Create Snapshot</span>
                    </button>
                </div>
            </div>

            {loading && backups.length === 0 ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 rounded-3xl bg-[var(--nav-hover)] animate-pulse border border-[var(--border)]"></div>
                    ))}
                </div>
            ) : backups.length === 0 ? (
                <div className="glass p-16 rounded-[3rem] text-center border-2 border-dashed border-[var(--border)]">
                    <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Archive size={40} className="text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-black mb-2">No backups found</h3>
                    <p className="text-[var(--text-muted)] mb-8 max-w-md mx-auto font-medium">Secure your data by creating your first system snapshot or setting up off-site storage.</p>
                    <button onClick={onAddBackup} className="px-8 py-3.5 rounded-2xl bg-emerald-500 text-white font-black shadow-xl hover:scale-105 active:scale-95 transition-all">
                        Launch Initial Backup
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {backups.map((backup) => (
                        <div key={backup.id} className="group flex items-center gap-6 glass p-5 rounded-[2rem] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-all hover:bg-[var(--nav-hover)]/30">
                            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-dark)] border border-[var(--border)] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                <Archive className="text-emerald-500" size={28} />
                            </div>

                            <div className="flex-1 grid gap-1">
                                <div className="flex items-center gap-3">
                                    <span className="text-lg font-black text-[var(--text-main)]">{backup.name}</span>
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${backup.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                                        backup.status === 'failed' ? 'bg-red-500/10 text-red-500' :
                                            'bg-amber-500/10 text-amber-500'
                                        }`}>
                                        {backup.status || 'Pending'} {backup.status === 'pending' && <span className="inline-block w-2 h-2 ml-1 rounded-full bg-amber-500 animate-pulse"></span>}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-xs font-bold text-[var(--text-muted)]">
                                    <div className="flex items-center gap-1.5">
                                        <HardDrive size={14} />
                                        <span>{formatSize(backup.size_bytes)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Clock size={14} />
                                        <span>{new Date(backup.createdAt).toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <ShieldCheck size={14} />
                                        <span>Encrypted (AES-256)</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pr-2">
                                <button onClick={() => handleDownload(backup.id, backup.name)} className="p-3 rounded-2xl bg-[var(--bg-dark)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)]/50 transition-all">
                                    <Download size={20} />
                                </button>
                                <button className="p-3 rounded-2xl bg-[var(--bg-dark)] border border-[var(--border)] text-[var(--text-muted)] hover:text-amber-500 hover:border-amber-500/50 transition-all">
                                    <RotateCcw size={20} />
                                </button>
                                <button onClick={() => handleDelete(backup.id)} className="p-3 rounded-2xl bg-[var(--bg-dark)] border border-[var(--border)] text-[var(--text-muted)] hover:text-red-500 hover:border-red-500/50 transition-all">
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BackupManager;
