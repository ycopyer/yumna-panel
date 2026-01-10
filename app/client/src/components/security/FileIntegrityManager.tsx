import React, { useState, useEffect } from 'react';
import { Shield, Camera, AlertCircle, CheckCircle, Clock, Trash2, Play, FileText, Check, X, Bell, Database, RefreshCw } from 'lucide-react';
import axios from 'axios';

interface Snapshot {
    id: number;
    target_path: string;
    file_count: number;
    snapshot_file: string;
    status: 'active' | 'archived';
    created_at: string;
}

interface IntegrityAlert {
    id: number;
    snapshot_id: number;
    file_path: string;
    change_type: 'modified' | 'deleted' | 'added';
    old_hash: string;
    new_hash: string;
    detected_at: string;
    target_path: string;
    resolved: boolean;
}

const FileIntegrityManager: React.FC = () => {
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
    const [alerts, setAlerts] = useState<IntegrityAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [targetPath, setTargetPath] = useState('C:/YumnaPanel/www');
    const [activeTab, setActiveTab] = useState<'alerts' | 'snapshots'>('alerts');

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'alerts') {
                const res = await axios.get('/api/security/integrity/alerts');
                setAlerts(res.data);
            } else {
                const res = await axios.get('/api/security/integrity/snapshots');
                setSnapshots(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch integrity data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSnapshot = async () => {
        try {
            await axios.post('/api/security/integrity/snapshots', { targetPath });
            alert('Snapshot created successfully');
            if (activeTab === 'snapshots') fetchData();
        } catch (err) {
            alert('Failed to create snapshot');
        }
    };

    const handleRunCheck = async (snapshotId: number) => {
        setChecking(true);
        try {
            const res = await axios.post('/api/security/integrity/check', { snapshotId });
            alert(`Integrity check completed. ${res.data.alerts_found} changes detected.`);
            fetchData();
        } catch (err) {
            alert('Failed to run integrity check');
        } finally {
            setChecking(false);
        }
    };

    const handleResolveAlert = async (id: number) => {
        try {
            await axios.post(`/api/security/integrity/alerts/${id}/resolve`);
            setAlerts(alerts.filter(a => a.id !== id));
        } catch (err) {
            alert('Failed to resolve alert');
        }
    };

    const getChangeTypeStyles = (type: string) => {
        switch (type) {
            case 'modified': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'deleted': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            case 'added': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            default: return 'bg-white/5 text-white/50 border-white/10';
        }
    };

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="p-4 rounded-2xl bg-indigo-500/20 text-indigo-400">
                        <Camera size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white">File Integrity Monitoring</h1>
                        <p className="text-white/50">Detect unauthorized changes to your system files</p>
                    </div>
                </div>
                <button
                    onClick={handleCreateSnapshot}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-500 text-white font-black hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-indigo-500/25"
                >
                    <Shield size={20} />
                    CREATE NEW SNAPSHOT
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10">
                <button
                    onClick={() => setActiveTab('alerts')}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold transition-all ${activeTab === 'alerts' ? 'border-indigo-500 text-white' : 'border-transparent text-white/40 hover:text-white'
                        }`}
                >
                    <Bell size={18} />
                    Security Alerts
                    {alerts.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                            {alerts.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('snapshots')}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold transition-all ${activeTab === 'snapshots' ? 'border-indigo-500 text-white' : 'border-transparent text-white/40 hover:text-white'
                        }`}
                >
                    <Database size={18} />
                    Snapshot History
                </button>
            </div>

            <div className="space-y-6">
                {activeTab === 'alerts' && (
                    <div className="space-y-4">
                        {alerts.map((alert) => (
                            <div key={alert.id} className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                                <div className="flex items-start justify-between">
                                    <div className="flex gap-4">
                                        <div className={`mt-1 p-2 rounded-xl border ${getChangeTypeStyles(alert.change_type)}`}>
                                            <AlertCircle size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-white font-bold">{alert.file_path.split(/[\\/]/).pop()}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${getChangeTypeStyles(alert.change_type)}`}>
                                                    {alert.change_type}
                                                </span>
                                            </div>
                                            <div className="text-xs text-white/30 font-mono mb-2">{alert.file_path}</div>
                                            <div className="flex items-center gap-4 text-[10px] text-white/40">
                                                <span className="flex items-center gap-1"><Clock size={12} /> {new Date(alert.detected_at).toLocaleString()}</span>
                                                <span className="flex items-center gap-1"><Database size={12} /> Snapshot #{alert.snapshot_id}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleResolveAlert(alert.id)}
                                        className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all group"
                                        title="Mark as resolved"
                                    >
                                        <Check size={20} className="group-hover:scale-110 transition-transform" />
                                    </button>
                                </div>
                                {alert.change_type === 'modified' && (
                                    <div className="mt-4 p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="text-rose-400/60 font-bold uppercase">Original Hash</span>
                                            <span className="text-emerald-400/60 font-bold uppercase">New Hash</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 font-mono text-[10px] text-rose-400/40 truncate">{alert.old_hash}</div>
                                            <div className="text-white/20">→</div>
                                            <div className="flex-1 font-mono text-[10px] text-emerald-400 truncate">{alert.new_hash}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        {alerts.length === 0 && !loading && (
                            <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                                <div className="inline-flex p-4 rounded-full bg-emerald-500/10 text-emerald-400 mb-4">
                                    <CheckCircle size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-white">System Integrity Verified</h3>
                                <p className="text-white/40">No unauthorized file changes detected</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'snapshots' && (
                    <div className="space-y-4">
                        {snapshots.map((snapshot) => (
                            <div key={snapshot.id} className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-all">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
                                            <Database size={24} />
                                        </div>
                                        <div>
                                            <div className="text-white font-bold">{snapshot.target_path}</div>
                                            <div className="flex items-center gap-4 text-xs text-white/40">
                                                <span className="flex items-center gap-1"><Clock size={12} /> {new Date(snapshot.created_at).toLocaleString()}</span>
                                                <span className="flex items-center gap-1"><FileText size={12} /> {snapshot.file_count} files tracked</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleRunCheck(snapshot.id)}
                                            disabled={checking}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 text-white font-bold hover:brightness-110 disabled:opacity-50 transition-all"
                                        >
                                            {checking ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} />}
                                            Run Check
                                        </button>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${snapshot.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'
                                            }`}>
                                            {snapshot.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileIntegrityManager;
