import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Activity, ShieldAlert, Users, Target, Clock,
    Smartphone, Monitor, Globe, LogOut, Skull,
    CheckCircle, XCircle, Trash2, Loader2, AlertTriangle,
    Shield, MapPin, Search, ChevronRight, Database, FileScan
} from 'lucide-react';

interface SecurityStats {
    totalAttempts: number;
    failedAttempts: number;
    successRate: string;
    activeSessions: number;
    whitelistedIPs: number;
    blockedCountries: number;
    topAttackers: Array<{ ip: string; country: string; count: number }>;
    ransomwareBlocked: number;
    malwareBlocked: number;
}

interface LoginAttempt {
    id: number;
    username: string;
    ip: string;
    country: string;
    lat: number;
    lon: number;
    user_agent: string;
    success: boolean;
    failure_reason: string;
    attempted_at: string;
}

interface ActiveSession {
    session_id: string;
    user_id: number;
    username: string;
    email: string;
    ip: string;
    country: string;
    user_agent: string;
    last_activity: string;
}

const SecurityDashboard: React.FC = () => {
    const [stats, setStats] = useState<SecurityStats | null>(null);
    const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
    const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
    const [autoPurge, setAutoPurge] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchSecurityData();
        const interval = setInterval(fetchSecurityData, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    const fetchSecurityData = async () => {
        try {
            const [statsRes, attemptsRes, sessionsRes, purgeRes] = await Promise.all([
                axios.get('/api/security/stats'),
                axios.get('/api/security/login-attempts?limit=50'),
                axios.get('/api/security/sessions'),
                axios.get('/api/security/auto-purge')
            ]);
            setStats(statsRes.data);
            setLoginAttempts(attemptsRes.data);
            setActiveSessions(sessionsRes.data);
            setAutoPurge(purgeRes.data.enabled);
            setLoading(false);
        } catch (err: any) {
            setError('Failed to sync security data');
            setLoading(false);
        }
    };

    const handleKickSession = async (sessionId: string) => {
        if (!window.confirm('Terminate this session? User will be logged out immediately.')) return;
        try {
            await axios.delete(`/api/security/sessions/${sessionId}`);
            fetchSecurityData();
        } catch (err) {
            alert('Failed to terminate session');
        }
    };

    const getDeviceIcon = (ua: string) => {
        if (/mobile/i.test(ua)) return <Smartphone size={16} />;
        return <Monitor size={16} />;
    };

    const getFlagUrl = (countryCode: string) => {
        if (!countryCode) return null;
        return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
    };

    const handleToggleAutoPurge = async () => {
        try {
            const res = await axios.post('/api/security/auto-purge', { enabled: !autoPurge });
            setAutoPurge(res.data.enabled);
        } catch (err) {
            alert('Failed to update Auto-Purge setting');
        }
    };

    if (loading && !stats) return (
        <div className="flex flex-col items-center justify-center py-40">
            <Loader2 className="animate-spin text-[var(--primary)] mb-4" size={40} />
            <p className="font-bold text-[var(--text-muted)] animate-pulse">Establishing secure link...</p>
        </div>
    );

    return (
        <div className="space-y-8 pb-10">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-6 gap-4 mt-4">
                <div className="p-6 bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-3xl shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-indigo-500/20 rounded-2xl text-indigo-400"><Activity size={24} /></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">Total Attempts (24h)</span>
                    </div>
                    <p className="text-3xl font-black text-white">{stats?.totalAttempts}</p>
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-indigo-400">
                        <span>{stats?.successRate}% Success Rate</span>
                    </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 rounded-3xl shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-red-500/20 rounded-2xl text-red-400"><Skull size={24} /></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">Failed Attempts</span>
                    </div>
                    <p className="text-3xl font-black text-red-500">{stats?.failedAttempts}</p>
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-red-400">
                        <AlertTriangle size={12} />
                        <span>Potential intrusion detected</span>
                    </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 rounded-3xl shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-green-500/20 rounded-2xl text-green-400"><Users size={24} /></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">Active Sessions</span>
                    </div>
                    <p className="text-3xl font-black text-green-500">{stats?.activeSessions}</p>
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-green-400">
                        <Globe size={12} />
                        <span>From {activeSessions.length} IPs</span>
                    </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 rounded-3xl shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-orange-500/20 rounded-2xl text-orange-400"><Shield size={24} /></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">Defense Rules</span>
                    </div>
                    <div className="flex gap-4">
                        <div>
                            <p className="text-2xl font-black text-white">{stats?.whitelistedIPs}</p>
                            <p className="text-[9px] font-bold text-[var(--text-muted)]">WHITELIST</p>
                        </div>
                        <div className="w-px h-10 bg-[var(--border)] mt-2"></div>
                        <div>
                            <p className="text-2xl font-black text-white">{stats?.blockedCountries}</p>
                            <p className="text-[9px] font-bold text-[var(--text-muted)]">GEO-BLOCK</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 rounded-3xl shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-purple-500/20 rounded-2xl text-purple-400"><Database size={24} /></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">Ransomware Shield</span>
                    </div>
                    <div className="flex gap-4">
                        <div>
                            <p className="text-2xl font-black text-white">ACTIVE</p>
                            <p className="text-[9px] font-bold text-[var(--text-muted)]">STATUS</p>
                        </div>
                        <div className="w-px h-10 bg-[var(--border)] mt-2"></div>
                        <div>
                            <p className="text-2xl font-black text-purple-500">{stats?.ransomwareBlocked}</p>
                            <p className="text-[9px] font-bold text-[var(--text-muted)]">BLOCKED</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-pink-500/10 to-transparent border border-pink-500/20 rounded-3xl shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-pink-500/20 rounded-2xl text-pink-400"><FileScan size={24} /></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">Malware Scanner</span>
                    </div>
                    <div className="flex gap-4">
                        <div>
                            <p className="text-2xl font-black text-white">ACTIVE</p>
                            <p className="text-[9px] font-bold text-[var(--text-muted)]">STATUS</p>
                        </div>
                        <div className="w-px h-10 bg-[var(--border)] mt-2"></div>
                        <div>
                            <p className="text-2xl font-black text-pink-500">{stats?.malwareBlocked}</p>
                            <p className="text-[9px] font-bold text-[var(--text-muted)]">THREATS</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* Active Sessions List */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-[40px] overflow-hidden shadow-2xl">
                        <div className="p-8 border-b border-[var(--border)] bg-gradient-to-r from-green-500/5 to-transparent flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-500/20 rounded-2xl text-green-500"><Users size={24} /></div>
                                <div>
                                    <h4 className="text-xl font-black text-[var(--text-main)]">Active Sessions</h4>
                                    <p className="text-xs text-[var(--text-muted)] font-medium">Currently logged in users and their device info</p>
                                </div>
                            </div>
                            <span className="px-4 py-1.5 bg-green-500/20 rounded-full text-green-500 text-xs font-black">REALTIME MONITORING</span>
                        </div>
                        <div className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-[var(--border)] bg-[var(--nav-hover)]/30">
                                            <th className="px-8 py-4 text-[10px] font-black uppercase text-[var(--text-muted)]">User</th>
                                            <th className="px-8 py-4 text-[10px] font-black uppercase text-[var(--text-muted)]">Network / Location</th>
                                            <th className="px-8 py-4 text-[10px] font-black uppercase text-[var(--text-muted)]">Device</th>
                                            <th className="px-8 py-4 text-[10px] font-black uppercase text-[var(--text-muted)] text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border)]">
                                        {activeSessions.map(session => (
                                            <tr key={session.session_id} className="hover:bg-[var(--nav-hover)]/20 transition-colors">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-black">
                                                            {session.username[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-[var(--text-main)]">{session.username}</p>
                                                            <p className="text-[10px] text-[var(--text-muted)] font-medium">{session.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-black text-indigo-400 font-mono">{session.ip}</span>
                                                            <span className="px-2 py-0.5 bg-[var(--nav-hover)] rounded-md text-[9px] font-black uppercase tracking-tighter text-[var(--text-muted)]">SSL SECURE</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] font-bold uppercase">
                                                            <Globe size={10} />
                                                            {session.country || 'Unknown'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-[var(--nav-hover)] rounded-xl text-[var(--text-muted)]">
                                                            {getDeviceIcon(session.user_agent)}
                                                        </div>
                                                        <span className="text-xs text-[var(--text-muted)] font-medium max-w-[150px] truncate" title={session.user_agent}>
                                                            {session.user_agent.split(')')[0] + ')'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <button
                                                        onClick={() => handleKickSession(session.session_id)}
                                                        className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                                        title="Force Logout"
                                                    >
                                                        <LogOut size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Login History */}
                    <div className="bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-[40px] overflow-hidden shadow-2xl">
                        <div className="p-8 border-b border-[var(--border)] bg-gradient-to-r from-red-500/5 to-transparent">
                            <h4 className="text-xl font-black text-[var(--text-main)]">Recent Login Activity</h4>
                            <p className="text-xs text-[var(--text-muted)] font-medium mt-1">Audit log for successful and failed authentication attempts</p>
                        </div>
                        <div className="p-0 max-h-[500px] overflow-y-auto custom-scrollbar">
                            <div className="divide-y divide-[var(--border)]">
                                {loginAttempts.map(attempt => (
                                    <div key={attempt.id} className="p-6 hover:bg-[var(--nav-hover)]/20 transition-colors flex items-center justify-between">
                                        <div className="flex items-center gap-6">
                                            <div className={`p-4 rounded-2xl border ${attempt.success ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                                                {attempt.success ? <CheckCircle size={24} /> : <XCircle size={24} />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h5 className="font-black text-[var(--text-main)] tracking-tight">{attempt.username}</h5>
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${attempt.success ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                                        {attempt.success ? 'SUCCESS' : 'DENIED'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 mt-1">
                                                    <span className="text-xs font-mono font-bold text-indigo-400">{attempt.ip}</span>
                                                    <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase flex items-center gap-1">
                                                        {getFlagUrl(attempt.country) && (
                                                            <img src={getFlagUrl(attempt.country)!} className="w-3.5 h-2.5 rounded-sm object-cover" alt={attempt.country} />
                                                        )}
                                                        {attempt.country || 'Unknown'}
                                                    </span>
                                                    <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase flex items-center gap-1">
                                                        <Clock size={10} />
                                                        {new Date(attempt.attempted_at).toLocaleString()}
                                                    </span>
                                                </div>
                                                {!attempt.success && (
                                                    <p className="text-[10px] text-red-400 mt-1.5 font-bold uppercase tracking-widest flex items-center gap-2">
                                                        <AlertTriangle size={10} />
                                                        REASON: {attempt.failure_reason}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="p-3 bg-[var(--nav-hover)] rounded-2xl text-[var(--text-muted)]">
                                            {getDeviceIcon(attempt.user_agent)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Stats */}
                <div className="space-y-6">
                    {/* Top Attackers */}
                    <div className="p-8 bg-black/40 border border-[var(--border)] rounded-[40px] shadow-2xl overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700">
                            <Skull size={120} />
                        </div>
                        <h4 className="text-lg font-black text-red-500 flex items-center gap-3 mb-6">
                            <Target size={20} />
                            Potential Threats
                        </h4>
                        <div className="space-y-4">
                            {stats?.topAttackers.length === 0 ? (
                                <div className="py-10 text-center opacity-30 italic font-bold">No active threats detected</div>
                            ) : stats?.topAttackers.map((attacker, i) => (
                                <div key={i} className="bg-red-500/5 border border-red-500/10 p-4 rounded-2xl flex items-center justify-between hover:border-red-500/30 transition-all cursor-pointer group/item">
                                    <div className="flex items-center gap-3">
                                        <div className="text-lg font-black text-red-700/50 mr-2">#{i + 1}</div>
                                        <div>
                                            <p className="font-mono font-bold text-red-400">{attacker.ip}</p>
                                            <p className="text-[10px] text-red-500/40 uppercase font-black">{attacker.country || 'Unknown Location'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-red-500">{attacker.count}</p>
                                        <p className="text-[8px] font-black text-red-500/50 uppercase">FAILS</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 pt-6 border-t border-red-500/10">
                            <button
                                onClick={handleToggleAutoPurge}
                                className={`w-full py-4 rounded-2xl font-black transition-all border text-sm uppercase tracking-widest flex items-center justify-center gap-3 ${autoPurge
                                    ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/20 hover:bg-green-600'
                                    : 'bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border-red-500/20'
                                    }`}
                            >
                                <ShieldAlert size={18} /> {autoPurge ? 'Auto-Purge: ENABLED' : 'Enable Auto-Purge'}
                            </button>
                        </div>
                    </div>

                    {/* Security Tip */}
                    <div className="p-8 bg-blue-500/5 border border-blue-500/20 rounded-[40px] shadow-2xl">
                        <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-500 inline-block mb-4"><Shield size={24} /></div>
                        <h4 className="text-lg font-black text-blue-400 mb-2">Security Advice</h4>
                        <p className="text-sm text-blue-300/60 leading-relaxed font-medium">
                            "We detected more than 50 failed attempts from China today. Consider using <b>Geo-Blocking</b> to restrict access from that region if you don't expect business there."
                        </p>
                    </div>

                    {/* System Guard Status */}
                    <div className="p-8 bg-green-500/5 border border-green-500/20 rounded-[40px] shadow-2xl">
                        <h4 className="text-sm font-black text-green-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                            Firewall Sentinel
                        </h4>
                        <div className="space-y-4 font-mono text-xs">
                            <div className="flex justify-between items-center text-green-300/70 border-b border-green-500/10 pb-2">
                                <span>PACKET INSPECTION</span>
                                <span className="text-green-500 font-bold">STABLE</span>
                            </div>
                            <div className="flex justify-between items-center text-green-300/70 border-b border-green-500/10 pb-2">
                                <span>RATE LIMITING</span>
                                <span className="text-green-500 font-bold">READY</span>
                            </div>
                            <div className="flex justify-between items-center text-green-300/70 border-b border-green-500/10 pb-2">
                                <span>IP REPUTATION</span>
                                <span className="text-green-500 font-bold">CONNECTED</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SecurityDashboard;
