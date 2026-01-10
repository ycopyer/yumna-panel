import React, { useState, useEffect } from 'react';
import { AlertTriangle, Mail, TrendingUp, Users, Database } from 'lucide-react';
import axios from 'axios';

interface QuotaAlert {
    id: number;
    username: string;
    domain: string;
    quota_bytes: number;
    used_bytes: number;
    usage_percent: number;
}

const EmailQuotaAlerts: React.FC = () => {
    const [alerts, setAlerts] = useState<QuotaAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [threshold, setThreshold] = useState(90);

    useEffect(() => {
        fetchAlerts();
    }, [threshold]);

    const fetchAlerts = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/mail/quota/alerts?threshold=${threshold}`);
            setAlerts(res.data);
        } catch (err) {
            console.error('Failed to fetch quota alerts:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatBytes = (bytes: number) => {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getUsageColor = (percent: number) => {
        if (percent >= 100) return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
        if (percent >= 95) return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    };

    if (loading) {
        return (
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 animate-pulse">
                <div className="h-6 bg-white/10 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                    <div className="h-16 bg-white/10 rounded-xl"></div>
                    <div className="h-16 bg-white/10 rounded-xl"></div>
                </div>
            </div>
        );
    }

    if (alerts.length === 0) {
        return (
            <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
                        <Database size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">All Email Quotas Healthy</h3>
                        <p className="text-white/50 text-sm">No accounts are near their storage limit</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Email Quota Alerts</h3>
                        <p className="text-white/50 text-sm">{alerts.length} account{alerts.length > 1 ? 's' : ''} near limit</p>
                    </div>
                </div>
                <select
                    value={threshold}
                    onChange={(e) => setThreshold(parseInt(e.target.value))}
                    className="px-3 py-2 rounded-xl bg-[var(--bg-dark)] text-white text-sm border border-white/10 focus:outline-none focus:border-amber-500/50"
                >
                    <option value="80">≥ 80% Full</option>
                    <option value="90">≥ 90% Full</option>
                    <option value="95">≥ 95% Full</option>
                    <option value="100">100% Full</option>
                </select>
            </div>

            <div className="space-y-3">
                {alerts.map((alert) => (
                    <div
                        key={alert.id}
                        className={`p-4 rounded-2xl border ${getUsageColor(alert.usage_percent)} transition-all hover:scale-[1.02]`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[var(--bg-dark)] flex items-center justify-center">
                                    <Mail size={18} className="text-white/60" />
                                </div>
                                <div>
                                    <p className="text-white font-bold">{alert.username}@{alert.domain}</p>
                                    <p className="text-xs text-white/40">
                                        {formatBytes(alert.used_bytes)} / {formatBytes(alert.quota_bytes)}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-black">{alert.usage_percent}%</div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-white/30">Used</div>
                            </div>
                        </div>

                        <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${alert.usage_percent >= 100 ? 'bg-rose-500' :
                                        alert.usage_percent >= 95 ? 'bg-orange-500' : 'bg-amber-500'
                                    }`}
                                style={{ width: `${Math.min(alert.usage_percent, 100)}%` }}
                            ></div>
                        </div>

                        {alert.usage_percent >= 100 && (
                            <div className="mt-3 px-3 py-2 rounded-lg bg-rose-500/20 border border-rose-500/30">
                                <p className="text-xs text-rose-300 font-bold flex items-center gap-2">
                                    <AlertTriangle size={14} />
                                    Quota exceeded - New emails may be rejected
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <button
                onClick={fetchAlerts}
                className="w-full mt-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm font-bold transition-all border border-white/10"
            >
                Refresh Alerts
            </button>
        </div>
    );
};

export default EmailQuotaAlerts;
