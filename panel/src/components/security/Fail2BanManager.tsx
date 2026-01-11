import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Ban, CheckCircle, X, Plus, Trash2, RefreshCw, Clock, Activity } from 'lucide-react';
import axios from 'axios';

interface BannedIP {
    ip: string;
    jail: string;
    reason: string;
    timestamp: string;
    expires: string;
}

interface Jail {
    name: string;
    enabled: string;
    port: string;
    maxretry: string;
    bantime: string;
    logpath: string;
}

interface Stats {
    total_jails: number;
    enabled_jails: number;
    total_bans: number;
    active_bans: number;
    jails_by_status: {
        enabled: number;
        disabled: number;
    };
    recent_bans: BannedIP[];
}

const Fail2BanManager: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'jails' | 'banned'>('overview');
    const [stats, setStats] = useState<Stats | null>(null);
    const [jails, setJails] = useState<Jail[]>([]);
    const [bannedIPs, setBannedIPs] = useState<BannedIP[]>([]);
    const [loading, setLoading] = useState(true);
    const [showBanModal, setShowBanModal] = useState(false);
    const [newBan, setNewBan] = useState({ ip: '', jail: 'manual', reason: '' });

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'overview') {
                const res = await axios.get('/api/security/fail2ban/stats');
                setStats(res.data);
            } else if (activeTab === 'jails') {
                const res = await axios.get('/api/security/fail2ban/jails');
                setJails(res.data);
            } else if (activeTab === 'banned') {
                const res = await axios.get('/api/security/fail2ban/banned');
                setBannedIPs(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch Fail2Ban data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleBanIP = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post('/api/security/fail2ban/ban', newBan);
            setShowBanModal(false);
            setNewBan({ ip: '', jail: 'manual', reason: '' });
            fetchData();
        } catch (err: any) {
            alert('Failed to ban IP: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleUnbanIP = async (ip: string) => {
        if (!confirm(`Unban IP ${ip}?`)) return;
        try {
            await axios.post('/api/security/fail2ban/unban', { ip });
            fetchData();
        } catch (err: any) {
            alert('Failed to unban IP');
        }
    };

    const handleCleanExpired = async () => {
        try {
            const res = await axios.post('/api/security/fail2ban/clean');
            alert(`Cleaned ${res.data.cleaned} expired bans`);
            fetchData();
        } catch (err: any) {
            alert('Failed to clean expired bans');
        }
    };

    const formatTimeRemaining = (expires: string) => {
        const now = new Date();
        const expireDate = new Date(expires);
        const diff = expireDate.getTime() - now.getTime();

        if (diff <= 0) return 'Expired';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="p-4 rounded-2xl bg-rose-500/20 text-rose-400">
                        <Shield size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white">Fail2Ban Protection</h1>
                        <p className="text-white/50">Brute force attack prevention & IP banning</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowBanModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 text-white font-bold hover:brightness-110 transition-all"
                    >
                        <Ban size={18} />
                        Ban IP
                    </button>
                    <button
                        onClick={fetchData}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10">
                {[
                    { id: 'overview', label: 'Overview', icon: Activity },
                    { id: 'jails', label: 'Jails', icon: Shield },
                    { id: 'banned', label: 'Banned IPs', icon: Ban }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold transition-all ${activeTab === tab.id
                                ? 'border-rose-500 text-white'
                                : 'border-transparent text-white/40 hover:text-white'
                            }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="space-y-6">
                {activeTab === 'overview' && stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-3 mb-2">
                                <Shield className="text-blue-400" size={24} />
                                <span className="text-white/50 text-sm font-bold">Total Jails</span>
                            </div>
                            <div className="text-3xl font-black text-white">{stats.total_jails}</div>
                            <div className="text-xs text-white/30 mt-1">{stats.enabled_jails} enabled</div>
                        </div>

                        <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-3 mb-2">
                                <Ban className="text-rose-400" size={24} />
                                <span className="text-white/50 text-sm font-bold">Total Bans</span>
                            </div>
                            <div className="text-3xl font-black text-white">{stats.total_bans}</div>
                            <div className="text-xs text-white/30 mt-1">All time</div>
                        </div>

                        <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-3 mb-2">
                                <AlertTriangle className="text-amber-400" size={24} />
                                <span className="text-white/50 text-sm font-bold">Active Bans</span>
                            </div>
                            <div className="text-3xl font-black text-white">{stats.active_bans}</div>
                            <div className="text-xs text-white/30 mt-1">Currently blocked</div>
                        </div>

                        <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-3 mb-2">
                                <CheckCircle className="text-emerald-400" size={24} />
                                <span className="text-white/50 text-sm font-bold">Protection</span>
                            </div>
                            <div className="text-3xl font-black text-emerald-400">Active</div>
                            <div className="text-xs text-white/30 mt-1">System protected</div>
                        </div>

                        {/* Recent Bans */}
                        <div className="md:col-span-4 p-6 rounded-3xl bg-white/5 border border-white/10">
                            <h3 className="text-lg font-bold text-white mb-4">Recent Bans</h3>
                            <div className="space-y-2">
                                {stats.recent_bans.map((ban, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                                        <div className="flex items-center gap-3">
                                            <Ban className="text-rose-400" size={16} />
                                            <span className="text-white font-mono">{ban.ip}</span>
                                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold">
                                                {ban.jail}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-white/40 text-sm">{ban.reason}</span>
                                            <span className="text-white/30 text-xs">{formatTimeRemaining(ban.expires)}</span>
                                        </div>
                                    </div>
                                ))}
                                {stats.recent_bans.length === 0 && (
                                    <div className="text-center py-8 text-white/30">No recent bans</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'jails' && (
                    <div className="grid gap-4">
                        {jails.map((jail) => (
                            <div key={jail.name} className="p-6 rounded-3xl bg-white/5 border border-white/10">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <Shield className={jail.enabled === 'true' ? 'text-emerald-400' : 'text-white/30'} size={24} />
                                        <div>
                                            <h3 className="text-lg font-bold text-white">{jail.name}</h3>
                                            <p className="text-xs text-white/40">Port: {jail.port}</p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${jail.enabled === 'true'
                                            ? 'bg-emerald-500/20 text-emerald-400'
                                            : 'bg-white/10 text-white/40'
                                        }`}>
                                        {jail.enabled === 'true' ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <span className="text-white/40">Max Retry:</span>
                                        <span className="text-white font-bold ml-2">{jail.maxretry}</span>
                                    </div>
                                    <div>
                                        <span className="text-white/40">Ban Time:</span>
                                        <span className="text-white font-bold ml-2">{jail.bantime}s</span>
                                    </div>
                                    <div>
                                        <span className="text-white/40">Log Path:</span>
                                        <span className="text-white/60 font-mono text-xs ml-2 truncate block">{jail.logpath}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {jails.length === 0 && (
                            <div className="text-center py-12 text-white/30">No jails configured</div>
                        )}
                    </div>
                )}

                {activeTab === 'banned' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white">Banned IP Addresses</h3>
                            <button
                                onClick={handleCleanExpired}
                                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm font-bold transition-all"
                            >
                                Clean Expired
                            </button>
                        </div>
                        <div className="grid gap-3">
                            {bannedIPs.map((ban, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-4">
                                        <Ban className="text-rose-400" size={20} />
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-white font-mono font-bold">{ban.ip}</span>
                                                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold">
                                                    {ban.jail}
                                                </span>
                                            </div>
                                            <p className="text-xs text-white/40 mt-1">{ban.reason}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="flex items-center gap-2 text-white/60 text-sm">
                                                <Clock size={14} />
                                                {formatTimeRemaining(ban.expires)}
                                            </div>
                                            <div className="text-xs text-white/30">{new Date(ban.timestamp).toLocaleString()}</div>
                                        </div>
                                        <button
                                            onClick={() => handleUnbanIP(ban.ip)}
                                            className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                                        >
                                            <CheckCircle size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {bannedIPs.length === 0 && (
                                <div className="text-center py-12 text-white/30">No banned IPs</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Ban IP Modal */}
            {showBanModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--bg-dark)] rounded-3xl border border-white/10 p-8 max-w-md w-full">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-white">Ban IP Address</h2>
                            <button onClick={() => setShowBanModal(false)} className="p-2 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleBanIP} className="space-y-4">
                            <div>
                                <label className="block text-white/60 text-sm font-bold mb-2">IP Address</label>
                                <input
                                    type="text"
                                    placeholder="192.168.1.100"
                                    value={newBan.ip}
                                    onChange={(e) => setNewBan({ ...newBan, ip: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-rose-500/50"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-white/60 text-sm font-bold mb-2">Jail</label>
                                <input
                                    type="text"
                                    placeholder="manual"
                                    value={newBan.jail}
                                    onChange={(e) => setNewBan({ ...newBan, jail: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-rose-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-white/60 text-sm font-bold mb-2">Reason</label>
                                <input
                                    type="text"
                                    placeholder="Suspicious activity"
                                    value={newBan.reason}
                                    onChange={(e) => setNewBan({ ...newBan, reason: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-rose-500/50"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowBanModal(false)}
                                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-bold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 rounded-xl bg-rose-500 hover:brightness-110 text-white font-bold transition-all"
                                >
                                    Ban IP
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Fail2BanManager;
