import React, { useState, useEffect } from 'react';
import { Shield, AlertCircle, Info, AlertTriangle, Download, RefreshCw, Filter, Calendar, User, Activity } from 'lucide-react';
import axios from 'axios';

interface AuditLog {
    id: number;
    event_type: string;
    severity: 'info' | 'warning' | 'critical';
    username: string;
    email: string;
    ip_address: string;
    action: string;
    details: any;
    status: 'success' | 'failed' | 'blocked';
    timestamp: string;
}

interface Stats {
    summary: {
        total_events: number;
        critical_events: number;
        warning_events: number;
        info_events: number;
        failed_events: number;
        blocked_events: number;
        unique_users: number;
        unique_ips: number;
    };
    top_events: Array<{ event_type: string; count: number }>;
    recent_critical: AuditLog[];
}

const SecurityAuditViewer: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('24h');
    const [filters, setFilters] = useState({
        event_type: '',
        severity: '',
        start_date: '',
        end_date: ''
    });

    useEffect(() => {
        fetchData();
    }, [timeframe]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [logsRes, statsRes] = await Promise.all([
                axios.get('/api/security/audit/logs', { params: { limit: 50, ...filters } }),
                axios.get('/api/security/audit/stats', { params: { timeframe } })
            ]);
            setLogs(logsRes.data);
            setStats(statsRes.data);
        } catch (err) {
            console.error('Failed to fetch audit data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const response = await axios.get('/api/security/audit/export', {
                params: filters,
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `security_audit_${new Date().toISOString()}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert('Failed to export logs');
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
            case 'warning': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            default: return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'critical': return <AlertCircle size={16} />;
            case 'warning': return <AlertTriangle size={16} />;
            default: return <Info size={16} />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success': return 'text-emerald-400 bg-emerald-500/10';
            case 'failed': return 'text-rose-400 bg-rose-500/10';
            case 'blocked': return 'text-amber-400 bg-amber-500/10';
            default: return 'text-white/40 bg-white/5';
        }
    };

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="p-4 rounded-2xl bg-indigo-500/20 text-indigo-400">
                        <Shield size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white">Security Audit Logs</h1>
                        <p className="text-white/50">Complete security event tracking & analysis</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <select
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value)}
                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                    >
                        <option value="1h">Last Hour</option>
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                    </select>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold hover:brightness-110 transition-all"
                    >
                        <Download size={18} />
                        Export CSV
                    </button>
                    <button
                        onClick={fetchData}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            {/* Statistics */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                        <div className="flex items-center gap-3 mb-2">
                            <Activity className="text-indigo-400" size={24} />
                            <span className="text-white/50 text-sm font-bold">Total Events</span>
                        </div>
                        <div className="text-3xl font-black text-white">{stats.summary.total_events}</div>
                        <div className="text-xs text-white/30 mt-1">{timeframe}</div>
                    </div>

                    <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                        <div className="flex items-center gap-3 mb-2">
                            <AlertCircle className="text-rose-400" size={24} />
                            <span className="text-white/50 text-sm font-bold">Critical</span>
                        </div>
                        <div className="text-3xl font-black text-rose-400">{stats.summary.critical_events}</div>
                        <div className="text-xs text-white/30 mt-1">High priority</div>
                    </div>

                    <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                        <div className="flex items-center gap-3 mb-2">
                            <AlertTriangle className="text-amber-400" size={24} />
                            <span className="text-white/50 text-sm font-bold">Warnings</span>
                        </div>
                        <div className="text-3xl font-black text-amber-400">{stats.summary.warning_events}</div>
                        <div className="text-xs text-white/30 mt-1">Needs attention</div>
                    </div>

                    <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                        <div className="flex items-center gap-3 mb-2">
                            <User className="text-blue-400" size={24} />
                            <span className="text-white/50 text-sm font-bold">Unique Users</span>
                        </div>
                        <div className="text-3xl font-black text-white">{stats.summary.unique_users}</div>
                        <div className="text-xs text-white/30 mt-1">{stats.summary.unique_ips} IPs</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                    <Filter size={20} className="text-white/60" />
                    <h3 className="text-lg font-bold text-white">Filters</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <select
                        value={filters.severity}
                        onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                        className="px-4 py-2 rounded-xl bg-[var(--bg-dark)] border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                    >
                        <option value="">All Severities</option>
                        <option value="critical">Critical</option>
                        <option value="warning">Warning</option>
                        <option value="info">Info</option>
                    </select>
                    <input
                        type="date"
                        value={filters.start_date}
                        onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                        className="px-4 py-2 rounded-xl bg-[var(--bg-dark)] border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                    />
                    <input
                        type="date"
                        value={filters.end_date}
                        onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                        className="px-4 py-2 rounded-xl bg-[var(--bg-dark)] border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                    />
                    <button
                        onClick={fetchData}
                        className="px-4 py-2 rounded-xl bg-indigo-500 text-white font-bold hover:brightness-110 transition-all"
                    >
                        Apply Filters
                    </button>
                </div>
            </div>

            {/* Audit Logs Table */}
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                <h3 className="text-lg font-bold text-white mb-4">Recent Events</h3>
                <div className="space-y-2">
                    {logs.map((log) => (
                        <div key={log.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className={`p-2 rounded-lg ${getSeverityColor(log.severity)}`}>
                                        {getSeverityIcon(log.severity)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-white font-bold">{log.action}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getStatusColor(log.status)}`}>
                                                {log.status}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full bg-white/5 text-white/60 text-xs font-mono">
                                                {log.event_type}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-white/40">
                                            <span className="flex items-center gap-1">
                                                <User size={12} />
                                                {log.username || 'System'}
                                            </span>
                                            <span className="font-mono">{log.ip_address}</span>
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                {new Date(log.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {logs.length === 0 && !loading && (
                        <div className="text-center py-12 text-white/30">No audit logs found</div>
                    )}
                </div>
            </div>

            {/* Top Events */}
            {stats && stats.top_events.length > 0 && (
                <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                    <h3 className="text-lg font-bold text-white mb-4">Top Event Types</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {stats.top_events.map((event, idx) => (
                            <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/5">
                                <div className="text-2xl font-black text-white mb-1">{event.count}</div>
                                <div className="text-xs text-white/40 font-mono">{event.event_type}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SecurityAuditViewer;
