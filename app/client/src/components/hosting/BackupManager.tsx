import React, { useState, useEffect } from 'react';
import { Archive, Plus, Trash2, Download, RotateCcw, ShieldCheck, Clock, HardDrive, Activity, Globe, Database, Calendar, Settings, Server, CheckCircle2, AlertCircle, Trash } from 'lucide-react';
import axios from 'axios';

interface BackupManagerProps {
    backups: any[];
    loading: boolean;
    onRefresh: () => void;
    onAddBackup: () => void;
    onAddSchedule: () => void;
    onAddStorage: () => void;
}

const BackupManager: React.FC<BackupManagerProps> = ({ backups, loading, onRefresh, onAddBackup, onAddSchedule, onAddStorage }) => {
    const [activeTab, setActiveTab] = useState<'history' | 'schedules' | 'storage'>('history');
    const [schedules, setSchedules] = useState<any[]>([]);
    const [storage, setStorage] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({ total_size: 0, local_size: 0, remote_size: 0, count: 0 });
    const [tabLoading, setTabLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'schedules') fetchSchedules();
        if (activeTab === 'storage') fetchStorage();
        fetchStats();
    }, [activeTab]);

    const fetchStats = async () => {
        try {
            const res = await axios.get('/api/backups/stats');
            setStats(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    // Auto-refresh history if any backup is pending
    useEffect(() => {
        if (activeTab === 'history') {
            const hasPending = backups.some(b => b.status === 'pending');
            if (hasPending) {
                const interval = setInterval(() => {
                    onRefresh();
                }, 3000);
                return () => clearInterval(interval);
            }
        }
    }, [backups, onRefresh, activeTab]);

    const fetchSchedules = async () => {
        setTabLoading(true);
        try {
            const res = await axios.get('/api/backups/schedules');
            setSchedules(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setTabLoading(false);
        }
    };

    const fetchStorage = async () => {
        setTabLoading(true);
        try {
            const res = await axios.get('/api/backups/storage');
            setStorage(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setTabLoading(false);
        }
    };

    const handleDeleteBackup = async (id: number) => {
        if (!confirm('Are you sure you want to delete this backup?')) return;
        try {
            await axios.delete(`/api/backups/${id}`);
            onRefresh();
        } catch (err) {
            alert('Failed to delete backup');
        }
    };

    const handleDeleteSchedule = async (id: number) => {
        if (!confirm('Delete this backup schedule?')) return;
        try {
            await axios.delete(`/api/backups/schedules/${id}`);
            fetchSchedules();
        } catch (err) {
            alert('Failed to delete schedule');
        }
    };

    const handleDeleteStorage = async (id: number) => {
        if (!confirm('Remove this remote storage configuration?')) return;
        try {
            await axios.delete(`/api/backups/storage/${id}`);
            fetchStorage();
        } catch (err) {
            alert('Failed to remove storage');
        }
    };

    const handleRestore = async (id: number) => {
        if (!confirm('Warning: This will overwrite existing files and databases. Proceed with restoration?')) return;
        try {
            await axios.post(`/api/backups/${id}/restore`);
            alert('Restore completed successfully');
            onRefresh();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Restore failed');
        }
    };

    const handleVerify = async (id: number) => {
        try {
            const res = await axios.get(`/api/backups/${id}/verify`);
            alert(`${res.data.message}: Integrity OK (${res.data.entries} entries found)`);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Verification failed');
        }
    };

    const handleDownload = async (id: number, name: string) => {
        try {
            const response = await axios.get(`/api/backups/${id}/download`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', name.endsWith('.zip') ? name : `${name}.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
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
        <div className="flex-1 flex flex-col h-full bg-[var(--bg-dark)]/50">
            {/* Header */}
            <div className="px-8 py-6 border-b border-[var(--border)] bg-[var(--bg-dark)]/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-end justify-between mb-6">
                    <div>
                        <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tight">Disaster Recovery</h2>
                        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Advanced Redundancy & Snapshots</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onRefresh}
                            className="p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-emerald-500 hover:border-emerald-500/30 transition-all active:scale-95"
                        >
                            <Activity size={18} className={backups.some(b => b.status === 'pending') ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={onAddBackup}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                        >
                            <Plus size={16} />
                            Create Snapshot
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-[var(--bg-dark)] p-1 rounded-2xl border border-[var(--border)] max-w-md">
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'history' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--white)]/5'}`}
                    >
                        <Archive size={14} /> History
                    </button>
                    <button
                        onClick={() => setActiveTab('schedules')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'schedules' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--white)]/5'}`}
                    >
                        <Calendar size={14} /> Schedules
                    </button>
                    <button
                        onClick={() => setActiveTab('storage')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'storage' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--white)]/5'}`}
                    >
                        <Server size={14} /> Remote Storage
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {activeTab === 'history' && (
                    <div className="grid grid-cols-1 gap-6 animate-fade">
                        {/* Storage Visualization Card */}
                        <div className="bg-[var(--bg-card)] p-8 rounded-[2.5rem] border border-[var(--border)] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <HardDrive size={120} />
                            </div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-end mb-6">
                                    <div>
                                        <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider mb-1">Backup Footprint</h3>
                                        <div className="text-3xl font-black text-emerald-500 tracking-tight">{formatSize(stats.total_size)}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Total Snapshots</div>
                                        <div className="text-xl font-bold text-[var(--text-main)] tracking-tight">{stats.count}</div>
                                    </div>
                                </div>

                                {/* Stacked Progress Bar */}
                                <div className="h-4 w-full bg-[var(--bg-dark)] rounded-full overflow-hidden flex border border-[var(--border)] mb-6">
                                    <div
                                        style={{ width: `${(stats.local_size / stats.total_size) * 100 || 0}%` }}
                                        className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                    />
                                    <div
                                        style={{ width: `${(stats.remote_size / stats.total_size) * 100 || 0}%` }}
                                        className="h-full bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3 p-4 bg-[var(--bg-dark)]/50 rounded-2xl border border-[var(--border)]">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                        <div>
                                            <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Local Node</div>
                                            <div className="text-xs font-bold text-[var(--text-main)]">{formatSize(stats.local_size)}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 bg-[var(--bg-dark)]/50 rounded-2xl border border-[var(--border)]">
                                        <div className="w-3 h-3 rounded-full bg-cyan-500" />
                                        <div>
                                            <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Remote Nodes</div>
                                            <div className="text-xs font-bold text-[var(--text-main)]">{formatSize(stats.remote_size)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {backups.length === 0 ? (
                            <div className="py-20 text-center">
                                <Archive size={48} className="text-[var(--text-muted)] opacity-20 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-[var(--text-main)]">No Snapshots Found</h3>
                                <p className="text-xs text-[var(--text-muted)]">Your disaster recovery history will appear here.</p>
                            </div>
                        ) : (
                            backups.map(backup => (
                                <div key={backup.id} className="group flex items-center gap-6 bg-[var(--bg-card)] p-5 rounded-[2rem] border border-[var(--border)] hover:border-emerald-500/30 transition-all duration-300">
                                    <div className={`p-4 rounded-2xl ${backup.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : backup.status === 'failed' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                        <Archive size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h4 className="text-sm font-black text-[var(--text-main)] truncate">{backup.name || `Backup #${backup.id}`}</h4>
                                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${backup.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : backup.status === 'failed' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500 animate-pulse'}`}>
                                                {backup.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-[10px] font-bold text-[var(--text-muted)]">
                                            <span className="flex items-center gap-1.5"><Clock size={12} /> {new Date(backup.createdAt).toLocaleString()}</span>
                                            <span className="flex items-center gap-1.5"><HardDrive size={12} /> {formatSize(backup.size_bytes || backup.size)}</span>
                                            {backup.duration && <span className="flex items-center gap-1.5"><Activity size={12} /> {backup.duration}s</span>}
                                            {backup.schedule_name && <span className="flex items-center gap-1.5 text-emerald-500/60"><Calendar size={12} /> {backup.schedule_name}</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                        {backup.status === 'completed' && (
                                            <>
                                                <button onClick={() => handleDownload(backup.id, backup.name)} className="p-3 bg-[var(--bg-dark)] rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-emerald-400 transition-all" title="Download">
                                                    <Download size={16} />
                                                </button>
                                                <button onClick={() => handleVerify(backup.id)} className="p-3 bg-[var(--bg-dark)] rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-cyan-400 transition-all" title="Verify Integrity">
                                                    <ShieldCheck size={16} />
                                                </button>
                                                <button onClick={() => handleRestore(backup.id)} className="p-3 bg-[var(--bg-dark)] rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-amber-400 transition-all" title="Restore Snapshot">
                                                    <RotateCcw size={16} />
                                                </button>
                                            </>
                                        )}
                                        <button onClick={() => handleDeleteBackup(backup.id)} className="p-3 bg-[var(--bg-dark)] rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-red-500 transition-all" title="Delete">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'schedules' && (
                    <div className="space-y-6 animate-fade">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">Automated Schedules</h3>
                            <button onClick={onAddSchedule} className="px-4 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-500 hover:text-white transition-all">
                                <Plus size={14} className="inline mr-2" /> Add Schedule
                            </button>
                        </div>
                        {tabLoading ? (
                            <div className="py-20 text-center"><Activity size={24} className="animate-spin text-emerald-500 mx-auto" /></div>
                        ) : schedules.length === 0 ? (
                            <div className="p-12 text-center bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border)]">
                                <Calendar size={32} className="text-[var(--text-muted)] opacity-20 mx-auto mb-4" />
                                <p className="text-xs text-[var(--text-muted)] font-bold">No active backup schedules.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {schedules.map(sched => (
                                    <div key={sched.id} className="bg-[var(--bg-card)] p-6 rounded-[2.5rem] border border-[var(--border)] hover:border-emerald-500/20 transition-all">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500"><Calendar size={20} /></div>
                                                <div>
                                                    <h4 className="text-sm font-black text-[var(--text-main)]">{sched.name}</h4>
                                                    <span className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest">{sched.type}</span>
                                                </div>
                                            </div>
                                            <button onClick={() => handleDeleteSchedule(sched.id)} className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                                        </div>
                                        <div className="space-y-3 p-4 bg-[var(--bg-dark)]/50 rounded-2xl border border-[var(--border)]">
                                            <div className="flex justify-between text-[10px] font-bold">
                                                <span className="text-[var(--text-muted)] uppercase tracking-wider">Target</span>
                                                <span className="text-[var(--text-main)] uppercase">{sched.target}</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] font-bold">
                                                <span className="text-[var(--text-muted)] uppercase tracking-wider">Storage</span>
                                                <span className="text-[var(--text-main)] truncate max-w-[120px]">{sched.storage_name || 'Local Server'}</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] font-bold">
                                                <span className="text-[var(--text-muted)] uppercase tracking-wider">Next Run</span>
                                                <span className="text-emerald-500">{sched.nextRun ? new Date(sched.nextRun).toLocaleString() : 'Pending'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'storage' && (
                    <div className="space-y-6 animate-fade">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">Remote Storage Connectors</h3>
                            <button onClick={onAddStorage} className="px-4 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-500 hover:text-white transition-all">
                                <Plus size={14} className="inline mr-2" /> Connect Storage
                            </button>
                        </div>
                        {tabLoading ? (
                            <div className="py-20 text-center"><Activity size={24} className="animate-spin text-emerald-500 mx-auto" /></div>
                        ) : storage.length === 0 ? (
                            <div className="p-12 text-center bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border)]">
                                <Server size={32} className="text-[var(--text-muted)] opacity-20 mx-auto mb-4" />
                                <p className="text-xs text-[var(--text-muted)] font-bold">No remote storage configured.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {storage.map(st => (
                                    <div key={st.id} className="bg-[var(--bg-card)] p-6 rounded-[2.5rem] border border-[var(--border)] hover:border-emerald-500/20 transition-all group relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4">
                                            <button onClick={() => handleDeleteStorage(st.id)} className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-[var(--bg-dark)] border border-[var(--border)] mb-4 inline-block">
                                            <Globe size={24} className="text-emerald-500" />
                                        </div>
                                        <h4 className="text-sm font-black text-[var(--text-main)] mb-1">{st.name}</h4>
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{st.provider}</span>
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                                            <span className="text-[10px] font-bold text-emerald-500/60 uppercase">Connected</span>
                                        </div>
                                        <button className="w-full py-2.5 bg-[var(--bg-dark)] border border-[var(--border)] rounded-xl text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)] hover:text-emerald-500 hover:border-emerald-500/30 transition-all">
                                            Test Connection
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BackupManager;
