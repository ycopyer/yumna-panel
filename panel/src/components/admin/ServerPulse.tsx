import React from 'react';
import { Cpu, Activity, Clock, Server, Monitor } from 'lucide-react';

interface ServerPulseProps {
    data: any;
}

const ServerPulse: React.FC<ServerPulseProps> = ({ data }) => {
    if (!data) return null;

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    const formatUptime = (seconds: number): string => {
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${d}d ${h}h ${m}m`;
    };

    const getProgressColor = (percent: number) => {
        if (percent > 90) return 'bg-rose-500';
        if (percent > 70) return 'bg-amber-500';
        return 'bg-[var(--primary)]';
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade">
            {/* CPU Pulse */}
            <div className="glass rounded-2xl p-6 relative overflow-hidden group">
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                                <Cpu size={24} />
                            </div>
                            <h3 className="font-bold text-lg">CPU Usage</h3>
                        </div>
                        <span className="text-2xl font-black text-indigo-500">{data.cpu.percentage}%</span>
                    </div>

                    <div className="space-y-4">
                        <div className="h-3 w-full bg-[var(--bg-dark)] rounded-full overflow-hidden border border-[var(--border)]">
                            <div
                                className={`h-full transition-all duration-1000 ease-out ${getProgressColor(data.cpu.percentage)}`}
                                style={{ width: `${data.cpu.percentage}%` }}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[var(--nav-hover)] p-3 rounded-xl border border-[var(--border)]">
                                <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-black mb-1">Cores</p>
                                <p className="font-bold">{data.cpu.cores} Threads</p>
                            </div>
                            <div className="bg-[var(--nav-hover)] p-3 rounded-xl border border-[var(--border)]">
                                <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-black mb-1">Load Avg</p>
                                <p className="font-bold">{data.cpu.loadAvg[0].toFixed(2)}</p>
                            </div>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] font-medium truncate italic">{data.cpu.model}</p>
                    </div>
                </div>
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Activity size={80} />
                </div>
            </div>

            {/* RAM Pulse */}
            <div className="glass rounded-2xl p-6 relative overflow-hidden group">
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                                <Activity size={24} />
                            </div>
                            <h3 className="font-bold text-lg">Memory (RAM)</h3>
                        </div>
                        <span className="text-2xl font-black text-emerald-500">{data.memory.percentage}%</span>
                    </div>

                    <div className="space-y-4">
                        <div className="h-3 w-full bg-[var(--bg-dark)] rounded-full overflow-hidden border border-[var(--border)]">
                            <div
                                className={`h-full transition-all duration-1000 ease-out ${getProgressColor(data.memory.percentage)}`}
                                style={{ width: `${data.memory.percentage}%` }}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[var(--nav-hover)] p-3 rounded-xl border border-[var(--border)]">
                                <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-black mb-1">Used</p>
                                <p className="font-bold">{formatBytes(data.memory.used)}</p>
                            </div>
                            <div className="bg-[var(--nav-hover)] p-3 rounded-xl border border-[var(--border)]">
                                <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-black mb-1">Total</p>
                                <p className="font-bold">{formatBytes(data.memory.total)}</p>
                            </div>
                        </div>
                        <p className="text-xs text-emerald-500/80 font-bold uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
                            Available: {formatBytes(data.memory.free)}
                        </p>
                    </div>
                </div>
            </div>

            {/* System Info */}
            <div className="glass rounded-2xl p-6 relative overflow-hidden group bg-gradient-to-br from-[var(--bg-dark)] to-indigo-950/20">
                <div className="relative z-10 h-full flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500">
                                <Server size={24} />
                            </div>
                            <h3 className="font-bold text-lg">System Pulse</h3>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm py-2 border-b border-[var(--border)]/50">
                                <span className="text-[var(--text-muted)] flex items-center gap-2"><Monitor size={14} /> Hostname</span>
                                <span className="font-bold">{data.hostname}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm py-2 border-b border-[var(--border)]/50">
                                <span className="text-[var(--text-muted)] flex items-center gap-2"><Activity size={14} /> Platform</span>
                                <span className="font-bold">{data.platform} ({data.arch})</span>
                            </div>
                            <div className="flex items-center justify-between text-sm py-2 border-b border-[var(--border)]/50">
                                <span className="text-[var(--text-muted)] flex items-center gap-2"><Clock size={14} /> Node Uptime</span>
                                <span className="font-bold text-[var(--primary)]">{formatUptime(data.uptime)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 p-4 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20">
                        <p className="text-[10px] font-black uppercase text-[var(--primary)] mb-1">Status</p>
                        <p className="text-sm font-bold flex items-center gap-2">
                            <span className="w-2h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Operational & Healthy
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServerPulse;
