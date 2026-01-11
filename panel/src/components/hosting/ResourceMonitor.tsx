import React, { useState, useEffect } from 'react';
import {
    Activity, Cpu, HardDrive, Zap, Info, ArrowUp, ArrowDown,
    Clock, RefreshCw, BarChart3, Database, AlertTriangle,
    Search, Filter, Maximize2, Terminal, ShieldAlert, Globe,
    Settings, Bell, CheckCircle2, AlertCircle, XCircle, Code, Layers
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line, Cell, PieChart, Pie
} from 'recharts';
import axios from 'axios';

interface RealtimeStats {
    cpu: { current: number; cores: number[] };
    memory: { total: number; active: number; usedPercent: number };
    disk: { total: number; used: number; percent: number };
    uptime: number;
    platform: string;
}

interface LogData {
    logs: string[];
    analysis: Array<{ type: string; cause: string; suggestion: string }>;
}

interface SlowQuery {
    time: string;
    userHost: string;
    queryTime: string;
    lockTime: string;
    rowsSent: string;
    rowsExamined: string;
    query: string;
}

interface TableStat {
    table: string;
    rows: number;
    size: number;
    engine: string;
}

interface PerformanceData {
    recommendations: Array<{ category: string; title: string; message: string; priority: 'low' | 'medium' | 'high' | 'critical' }>;
    score: number;
}

interface AlertConfig {
    id: number;
    metric: string;
    threshold: number;
    enabled: boolean;
    severity: 'info' | 'warning' | 'critical';
}

interface ActiveAlert {
    id: number;
    metric: string;
    value: number;
    threshold: number;
    message: string;
    severity: string;
    timestamp: string;
}

const ResourceMonitor: React.FC = () => {
    const [stats, setStats] = useState<RealtimeStats | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [mysqlStats, setMysqlStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'mysql' | 'logs' | 'alerts'>('overview');

    // Log state
    const [logData, setLogData] = useState<LogData>({ logs: [], analysis: [] });
    const [selectedLogType, setSelectedLogType] = useState<'error' | 'access'>('error');
    const [fetchingLogs, setFetchingLogs] = useState(false);

    // Alert & Performance state
    const [performance, setPerformance] = useState<PerformanceData | null>(null);
    const [alertConfigs, setAlertConfigs] = useState<AlertConfig[]>([]);
    const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);

    // MySQL specific state
    const [slowQueries, setSlowQueries] = useState<SlowQuery[]>([]);
    const [tableStats, setTableStats] = useState<TableStat[]>([]);
    const [fetchingMySQL, setFetchingMySQL] = useState(false);

    useEffect(() => {
        fetchStats();
        fetchHealthData();
        const interval = setInterval(() => {
            if (activeTab === 'overview') fetchStats();
        }, 5000);
        return () => clearInterval(interval);
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'logs') fetchLogs();
        if (activeTab === 'alerts') fetchHealthData();
        if (activeTab === 'mysql') fetchMySQLDetailed();
    }, [activeTab, selectedLogType]);

    const fetchStats = async () => {
        try {
            const [realtimeRes, historyRes, mysqlRes] = await Promise.all([
                axios.get('/api/monitor/realtime'),
                axios.get('/api/monitor/history'),
                axios.get('/api/monitor/mysql')
            ]);
            setStats(realtimeRes.data);
            setHistory(historyRes.data.map((h: any) => ({
                ...h,
                time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            })));
            setMysqlStats(mysqlRes.data);
        } catch (error) {
            console.error('Failed to fetch monitor stats');
        } finally {
            setLoading(false);
        }
    };

    const fetchHealthData = async () => {
        try {
            const [perfRes, configRes, activeRes] = await Promise.all([
                axios.get('/api/monitor/performance'),
                axios.get('/api/monitor/alerts/config'),
                axios.get('/api/monitor/alerts/active')
            ]);
            setPerformance(perfRes.data);
            setAlertConfigs(configRes.data);
            setActiveAlerts(activeRes.data);
        } catch (error) {
            console.error('Failed to fetch health data');
        }
    };

    const fetchLogs = async () => {
        setFetchingLogs(true);
        try {
            const res = await axios.get(`/api/monitor/logs?type=${selectedLogType}`);
            setLogData(res.data);
        } catch (error) {
            console.error('Failed to fetch logs');
        } finally {
            setFetchingLogs(false);
        }
    };

    const fetchMySQLDetailed = async () => {
        setFetchingMySQL(true);
        try {
            const [slowRes, tableRes] = await Promise.all([
                axios.get('/api/monitor/mysql/slow-queries'),
                axios.get('/api/monitor/mysql/tables')
            ]);
            setSlowQueries(slowRes.data);
            setTableStats(tableRes.data);
        } catch (error) {
            console.error('Failed to fetch MySQL details');
        } finally {
            setFetchingMySQL(false);
        }
    };

    const handleUpdateConfig = async (config: AlertConfig) => {
        try {
            await axios.put('/api/monitor/alerts/config', config);
            fetchHealthData();
        } catch (error) {
            alert('Failed to update configuration');
        }
    };

    const handleDismissAlert = async (id: number) => {
        try {
            await axios.post(`/api/monitor/alerts/dismiss/${id}`);
            fetchHealthData();
        } catch (error) {
            alert('Failed to dismiss alert');
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatUptime = (seconds: number) => {
        const days = Math.floor(seconds / (24 * 3600));
        const hours = Math.floor((seconds % (24 * 3600)) / 3600);
        return `${days}d ${hours}h`;
    };

    if (loading && !stats) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <RefreshCw size={48} className="text-indigo-500 animate-spin" />
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-loose">Analyzing System Resources...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-white flex items-center gap-3">
                        <Activity className="text-indigo-500" size={32} />
                        Live Monitor
                    </h2>
                    <div className="flex items-center gap-4 mt-1">
                        <p className="text-white/40 font-medium">Real-time resources and performance analytics.</p>
                        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Perf Score</span>
                            <span className={`text-[10px] font-black ${performance?.score && performance.score > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{performance?.score || 100}%</span>
                        </div>
                    </div>
                </div>

                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                    {(['overview', 'mysql', 'logs', 'alerts'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-3 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <StatCard icon={<Cpu size={24} />} label="CPU Load" value={`${stats?.cpu.current.toFixed(1)}%`} color="indigo" percent={stats?.cpu.current} />
                            <StatCard icon={<Zap size={24} />} label="RAM Memory" value={formatBytes(stats?.memory.active || 0)} subValue={`of ${formatBytes(stats?.memory.total || 0)}`} color="emerald" percent={stats?.memory.usedPercent} />
                            <StatCard icon={<HardDrive size={24} />} label="Disk Usage" value={`${stats?.disk.percent}%`} subValue={formatBytes((stats?.disk.total || 0) - (stats?.disk.used || 0)) + ' free'} color="amber" percent={stats?.disk.percent} />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <ChartCard title="CPU Utilization" icon={<Cpu size={18} />} color="#6366f1" data={history} dataKey="cpu_usage" />
                            <ChartCard title="RAM Allocation" icon={<Zap size={18} />} color="#10b981" data={history} dataKey="ram_usage" />
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8">
                            <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3"><ShieldAlert size={20} className="text-indigo-500" /> Optimize</h3>
                            <div className="space-y-4">
                                {performance?.recommendations.map((rec, i) => (
                                    <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-indigo-500/20 transition-all group">
                                        <span className={`text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded ${rec.priority === 'critical' ? 'bg-red-500/10 text-red-500' : rec.priority === 'high' ? 'bg-amber-500/10 text-amber-500' : 'bg-indigo-500/10 text-indigo-500'}`}>{rec.category}</span>
                                        <h4 className="text-[11px] font-black text-white mb-1 mt-2">{rec.title}</h4>
                                        <p className="text-[10px] text-white/40 leading-relaxed">{rec.message}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <StatCard icon={<Clock size={24} />} label="Uptime" value={formatUptime(stats?.uptime || 0)} subValue={stats?.platform || 'Linux'} color="fuchsia" />
                    </div>
                </div>
            )}

            {activeTab === 'mysql' && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8">
                            <h3 className="text-sm font-black text-white mb-6 flex items-center gap-3"><Database className="text-indigo-500" size={16} /> Global Stats</h3>
                            <div className="space-y-4">
                                <StatusItem label="Connected" value={mysqlStats?.Threads_connected} icon={<Activity size={14} />} />
                                <StatusItem label="Running" value={mysqlStats?.Threads_running} icon={<RefreshCw size={14} />} />
                                <StatusItem label="Questions" value={mysqlStats?.Questions} icon={<Info size={14} />} />
                                <StatusItem label="Slow Queries" value={mysqlStats?.Slow_queries} color="red" icon={<AlertTriangle size={14} />} />
                            </div>
                        </div>
                        <div className="lg:col-span-3 bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8">
                            <h3 className="text-sm font-black text-white mb-6 flex items-center gap-3"><Layers className="text-emerald-500" size={16} /> Largest Tables</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] font-black text-white/20 uppercase tracking-widest border-b border-white/5">
                                            <th className="pb-4">Table Name</th>
                                            <th className="pb-4">Rows</th>
                                            <th className="pb-4">Size</th>
                                            <th className="pb-4 text-right">Engine</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.02]">
                                        {tableStats.map((table, i) => (
                                            <tr key={i} className="text-[11px] text-white/60 hover:bg-white/[0.02] transition-colors">
                                                <td className="py-4 font-bold text-white">{table.table}</td>
                                                <td className="py-4">{table.rows.toLocaleString()}</td>
                                                <td className="py-4">{formatBytes(table.size)}</td>
                                                <td className="py-4 text-right">{table.engine}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] overflow-hidden">
                        <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-lg font-black text-white flex items-center gap-3"><Code className="text-amber-500" /> Slow Query Log</h3>
                            <button onClick={fetchMySQLDetailed} className="p-2.5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl border border-white/5 transition-all">
                                <RefreshCw size={16} className={fetchingMySQL ? 'animate-spin' : ''} />
                            </button>
                        </div>
                        <div className="p-8 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                            {slowQueries.length > 0 ? slowQueries.map((q, i) => (
                                <div key={i} className="p-6 bg-white/[0.01] border border-white/5 rounded-2xl space-y-4 hover:border-amber-500/20 transition-all">
                                    <div className="flex flex-wrap items-center gap-4">
                                        <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full uppercase tracking-widest">{q.queryTime}s Execution</span>
                                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{q.time}</span>
                                        <span className="text-[10px] font-black text-white/40">{q.userHost}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-[10px] font-black text-white/20 uppercase tracking-tighter">
                                        <span>Lock Time: {q.lockTime}s</span>
                                        <span>Rows Sent: {q.rowsSent}</span>
                                        <span>Examined: {q.rowsExamined}</span>
                                    </div>
                                    <pre className="text-[11px] font-mono text-white/80 bg-black/40 p-4 rounded-xl overflow-x-auto">{q.query}</pre>
                                </div>
                            )) : (
                                <div className="text-center py-20 text-white/20 italic">No slow queries recorded in the log yet.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'alerts' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] p-8">
                            <h3 className="text-lg font-black text-white mb-8 flex items-center gap-3"><Bell className="text-red-500" /> Active Incidents</h3>
                            {activeAlerts.length > 0 ? (
                                <div className="space-y-4">
                                    {activeAlerts.map(alert => (
                                        <div key={alert.id} className="flex items-center justify-between p-6 bg-red-500/5 border border-red-500/10 rounded-2xl animate-zoom">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-red-500/10 rounded-xl text-red-500"><AlertCircle size={20} /></div>
                                                <div>
                                                    <h4 className="text-sm font-black text-white">{alert.message}</h4>
                                                    <p className="text-[10px] text-white/40 font-bold mt-1">Detected: {new Date(alert.timestamp).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => handleDismissAlert(alert.id)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white rounded-xl transition-all">Dismiss</button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 bg-white/[0.01] rounded-3xl border border-dashed border-white/5">
                                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4"><CheckCircle2 className="text-emerald-500" size={32} /></div>
                                    <h4 className="text-sm font-black text-white">All Systems Nominal</h4>
                                    <p className="text-[11px] text-white/40 uppercase tracking-widest mt-2">No active alerts detected</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8">
                        <h3 className="text-lg font-black text-white mb-8 flex items-center gap-3"><Settings className="text-indigo-500" /> Thresholds</h3>
                        <div className="space-y-6">
                            {alertConfigs.map(config => (
                                <div key={config.id} className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white/5 rounded-lg">{config.metric === 'cpu' ? <Cpu size={14} /> : config.metric === 'ram' ? <Zap size={14} /> : <HardDrive size={14} />}</div>
                                            <span className="text-[11px] font-black text-white uppercase tracking-wider">{config.metric} Usage</span>
                                        </div>
                                        <button onClick={() => handleUpdateConfig({ ...config, enabled: !config.enabled })} className={`w-8 h-4 rounded-full relative transition-all ${config.enabled ? 'bg-indigo-500' : 'bg-white/10'}`}><div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${config.enabled ? 'left-4.5' : 'left-0.5'}`} /></button>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-black text-white/40 uppercase"><span>Alert At</span><span>{config.threshold}%</span></div>
                                        <input type="range" min="10" max="95" value={config.threshold} onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            setAlertConfigs(prev => prev.map(p => p.id === config.id ? { ...p, threshold: val } : p));
                                        }} onMouseUp={() => handleUpdateConfig(config)} className="w-full accent-indigo-500 bg-white/5 h-1.5 rounded-full appearance-none outline-none" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'logs' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-[3rem] overflow-hidden flex flex-col min-h-[600px]">
                        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                            <div className="flex items-center gap-6">
                                <h3 className="text-lg font-black text-white flex items-center gap-3"><Terminal className="text-indigo-500" /> Smart Error Analyzer</h3>
                                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                                    <button onClick={() => setSelectedLogType('error')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${selectedLogType === 'error' ? 'bg-red-500 text-white' : 'text-white/40 hover:text-white'}`}>Error</button>
                                    <button onClick={() => setSelectedLogType('access')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${selectedLogType === 'access' ? 'bg-indigo-500 text-white' : 'text-white/40 hover:text-white'}`}>Access</button>
                                </div>
                            </div>
                            <button onClick={fetchLogs} className="p-2.5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl border border-white/5 transition-all"><RefreshCw size={16} className={fetchingLogs ? 'animate-spin' : ''} /></button>
                        </div>
                        <div className="flex-1 p-8 font-mono text-[11px] leading-relaxed space-y-2 overflow-y-auto custom-scrollbar bg-black/20">
                            {logData.logs.length > 0 ? logData.logs.map((log, i) => (
                                <div key={i} className="text-white/40 break-all border-b border-white/[0.02] pb-2 last:border-0">{log}</div>
                            )) : <div className="text-white/20 text-center py-20 italic">No logs found for this period.</div>}
                        </div>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8">
                        <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3"><ShieldAlert className="text-indigo-500" /> AI Recommendations</h3>
                        <div className="space-y-4">
                            {logData.analysis.map((rec, i) => (
                                <div key={i} className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl space-y-2 animate-zoom">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest"><Zap size={12} /> Optimization</div>
                                    <p className="text-[11px] text-white font-bold leading-relaxed">{rec.suggestion}</p>
                                    <p className="text-[9px] text-white/20 italic line-clamp-1">{rec.cause}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Reusable Components
const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; subValue?: string; color: string; percent?: number; }> = ({ icon, label, value, subValue, color, percent }) => (
    <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] hover:bg-white/[0.04] transition-all group overflow-hidden relative">
        <div className={`absolute -right-8 -bottom-8 w-24 h-24 bg-${color}-500/5 rounded-full blur-2xl group-hover:scale-110 transition-transform`} />
        <div className="relative z-10">
            <div className={`p-4 bg-${color}-500/10 rounded-[2.5rem] border border-${color}-500/20 w-fit mb-6 text-${color}-500 group-hover:scale-110 transition-transform shadow-lg shadow-${color}-500/10`}>{icon}</div>
            <div className="space-y-1">
                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none">{label}</span>
                <div className="flex items-baseline gap-2">
                    <h4 className="text-2xl font-black text-white">{value}</h4>
                    {subValue && <span className="text-[11px] font-bold text-white/20">{subValue}</span>}
                </div>
            </div>
            {percent !== undefined && (
                <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-[10px] font-black text-white/40"><span>Utilization</span><span>{percent.toFixed(0)}%</span></div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full bg-${color}-500 rounded-full transition-all duration-1000`} style={{ width: `${percent}%` }} />
                    </div>
                </div>
            )}
        </div>
    </div>
);

const ChartCard: React.FC<{ title: string; icon: React.ReactNode; color: string; data: any[]; dataKey: string }> = ({ title, icon, color, data, dataKey }) => (
    <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8">
        <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-white flex items-center gap-3"><div className="p-2 bg-white/5 rounded-xl text-white/40">{icon}</div>{title} History</h3>
        </div>
        <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs><linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={color} stopOpacity={0.2} /><stop offset="95%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
                    <XAxis dataKey="time" hide /><Tooltip contentStyle={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }} itemStyle={{ color: '#fff', fontSize: '10px' }} />
                    <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} fillOpacity={1} fill={`url(#grad-${dataKey})`} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    </div>
);

const StatusItem: React.FC<{ label: string; value: any; icon: React.ReactNode; color?: string }> = ({ label, value, icon, color = 'indigo' }) => (
    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
        <div className="flex items-center gap-3"><div className={`p-2 bg-${color}-500/10 rounded-lg text-${color}-500`}>{icon}</div><span className="text-[11px] font-black text-white/60 tracking-wider uppercase">{label}</span></div>
        <span className="text-xs font-black text-white">{value || 0}</span>
    </div>
);

export default ResourceMonitor;
