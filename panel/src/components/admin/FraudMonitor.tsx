import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldAlert, User, Globe, AlertTriangle, ShieldCheck, Trash2, Clock, Loader2, X } from 'lucide-react';

interface FraudLog {
    id: number;
    userId: number;
    ipAddress: string;
    score: number;
    reason: string;
    createdAt: string;
    username?: string;
}

const FraudMonitor: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [logs, setLogs] = useState<FraudLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'logs' | 'blacklist'>('logs');

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const endpoint = activeTab === 'logs' ? '/api/admin/fraud/logs' : '/api/admin/fraud/blacklist';
            const res = await axios.get(endpoint);
            setLogs(res.data);
        } catch (err) {
            console.error('Failed to fetch fraud data');
        } finally {
            setLoading(false);
        }
    };

    const handleBlacklist = async (ip: string) => {
        if (!confirm(`Are you sure you want to manually blacklist ${ip}?`)) return;
        try {
            await axios.post('/api/admin/fraud/blacklist', { ipAddress: ip, reason: 'Manual Admin Blacklist' });
            fetchData();
        } catch (err) {
            alert('Operation failed');
        }
    };

    const handleRemoveBlacklist = async (id: number) => {
        try {
            await axios.delete(`/api/admin/fraud/blacklist/${id}`);
            fetchData();
        } catch (err) {
            alert('Failed to remove from blacklist');
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200 }}>
            <div className="glass animate-fade" style={{ width: '100%', maxWidth: '900px', background: 'var(--bg-dark)', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-500/10 rounded-xl">
                            <ShieldAlert className="text-red-500" size={24} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>Fraud & Abuse Control</h2>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Monitoring suspicious activity and IP reputation</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-all">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex bg-[var(--bg-dark)] px-8 py-2 border-b border-[var(--border)]">
                    <button onClick={() => setActiveTab('logs')} className={`px-6 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === 'logs' ? 'border-red-500 text-red-500' : 'border-transparent text-white/40 hover:text-white'}`}>Detection Logs</button>
                    <button onClick={() => setActiveTab('blacklist')} className={`px-6 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === 'blacklist' ? 'border-red-500 text-red-500' : 'border-transparent text-white/40 hover:text-white'}`}>IP Blacklist</button>
                </div>

                <div style={{ padding: '32px', maxHeight: '600px', overflowY: 'auto' }}>
                    {loading ? (
                        <div className="flex flex-col items-center py-20 gap-4">
                            <Loader2 className="animate-spin text-red-500" size={32} />
                            <p className="text-xs font-bold text-white/20 uppercase tracking-widest">Scanning logs...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-20 bg-white/[0.01] rounded-3xl border border-dashed border-white/10">
                            <ShieldCheck size={48} className="mx-auto mb-4 text-emerald-500/20" />
                            <p className="text-white/40 font-bold">No suspicious activity detected.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {logs.map(log => (
                                <div key={log.id} className="p-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex items-center justify-between group">
                                    <div className="flex items-center gap-6">
                                        <div className={`p-4 rounded-xl border ${log.score >= 80 ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                                            <AlertTriangle size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h4 className="font-bold text-white">{log.ipAddress}</h4>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${log.score >= 80 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                                    SCORE: {log.score}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-white/40 mt-1 max-w-[400px] line-clamp-1">{log.reason}</p>
                                            <div className="flex items-center gap-4 mt-2 text-[10px] text-white/20 font-bold uppercase tracking-wider">
                                                <span className="flex items-center gap-1.5"><User size={10} /> {log.username || `User ID: ${log.userId}`}</span>
                                                <span className="flex items-center gap-1.5"><Clock size={10} /> {new Date(log.createdAt).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {activeTab === 'logs' ? (
                                            <button onClick={() => handleBlacklist(log.ipAddress)} className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest border border-red-500/20 transition-all">
                                                Block IP
                                            </button>
                                        ) : (
                                            <button onClick={() => handleRemoveBlacklist(log.id)} className="p-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-lg border border-emerald-500/20 transition-all">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FraudMonitor;
