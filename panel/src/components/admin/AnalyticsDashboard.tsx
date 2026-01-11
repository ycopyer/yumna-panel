import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    BarChart3, Users, Share2, Activity, HardDrive, Download,
    TrendingUp, Calendar, Filter, RefreshCw, Loader2, X, Cpu
} from 'lucide-react';
import DetailModal from "../modals/DetailModal";
import ServerPulse from './ServerPulse';

// --- StatCard Component ---
interface StatCardProps {
    icon: React.ReactNode;
    title: string;
    value: number | string;
    color: string;
    isText?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, color, isText = false }) => {
    return (
        <div className="glass rounded-2xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-[var(--text-muted)] mb-1">{title}</p>
                    <p className="text-3xl font-bold text-[var(--text-main)]">
                        {isText ? value : typeof value === 'number' ? value.toLocaleString() : value}
                    </p>
                </div>
                <div className={`w-14 h-14 rounded-xl ${color} flex items-center justify-center text-white shadow-lg`}>
                    {icon}
                </div>
            </div>
        </div>
    );
};

// --- Analytics Interfaces ---
interface AnalyticsSummary {
    totalUsers: number;
    totalShares: number;
    todayActivity: number;
    actionBreakdown: { action: string; count: number }[];
}

interface StorageStats {
    totalLocalStorage: number;
    userStorageBreakdown: { username: string; size: number }[];
}

interface TopDownload {
    description: string;
    downloadCount: number;
    lastDownload: string;
}

interface ActiveUser {
    username: string;
    userId: number;
    activityCount: number;
    lastActivity: string;
    actions: string;
}

interface AnalyticsDashboardProps {
    userId: number;
    onClose: () => void;
    serverPulse?: any;
}

// --- Main Dashboard Component ---
const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ userId, onClose, serverPulse }) => {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
    const [topDownloads, setTopDownloads] = useState<TopDownload[]>([]);
    const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
    const [timeRange, setTimeRange] = useState(7);
    const [selectedDetail, setSelectedDetail] = useState<{ type: 'action' | 'user' | 'file'; data: any } | null>(null);

    useEffect(() => {
        fetchAnalytics();
    }, [timeRange]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const [summaryRes, storageRes, downloadsRes, usersRes] = await Promise.all([
                axios.get(`/api/analytics/summary`, { headers: { 'x-user-id': userId } }),
                axios.get(`/api/analytics/storage-stats`, { headers: { 'x-user-id': userId } }),
                axios.get(`/api/analytics/top-downloads?limit=10`, { headers: { 'x-user-id': userId } }),
                axios.get(`/api/analytics/active-users?days=${timeRange}`, { headers: { 'x-user-id': userId } })
            ]);
            setSummary(summaryRes.data);
            setStorageStats(storageRes.data);
            setTopDownloads(downloadsRes.data);
            setActiveUsers(usersRes.data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleActionClick = (action: string) => {
        axios.get(`/api/analytics/detail/action/${action}`, { headers: { 'x-user-id': userId } })
            .then(res => setSelectedDetail({ type: 'action', data: res.data }))
            .catch(err => console.error(err));
    };

    const handleUserClick = (targetUserId: number, username: string) => {
        axios.get(`/api/analytics/detail/user/${targetUserId}`, { headers: { 'x-user-id': userId } })
            .then(res => setSelectedDetail({ type: 'user', data: res.data }))
            .catch(err => console.error(err));
    };

    const handleFileClick = (description: string) => {
        const filePath = description.replace('Downloaded: ', '');
        axios.get(`/api/analytics/detail/file`, {
            params: { description },
            headers: { 'x-user-id': userId }
        })
            .then(res => setSelectedDetail({ type: 'file', data: res.data }))
            .catch(err => console.error(err));
    };

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getActionColor = (action: string): string => {
        const colors: Record<string, string> = {
            upload: 'bg-blue-500',
            download: 'bg-green-500',
            delete: 'bg-red-500',
            create: 'bg-purple-500',
            rename: 'bg-yellow-500',
            login: 'bg-indigo-500',
            view: 'bg-cyan-500',
            search: 'bg-pink-500'
        };
        return colors[action] || 'bg-gray-500';
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1100] flex items-center justify-center">
                <Loader2 className="animate-spin text-[var(--primary)]" size={48} />
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1100] overflow-y-auto custom-scrollbar">
            <div className="min-h-screen p-8 animate-fade">
                <div className="max-w-7xl mx-auto space-y-6 bg-[var(--bg-dark)]/50 p-6 rounded-3xl border border-[var(--border)]">
                    {/* Header */}
                    <div className="flex items-center justify-between sticky top-0 bg-[var(--bg-dark)]/90 backdrop-blur-xl p-4 -m-4 mb-4 z-10 rounded-2xl border-b border-[var(--border)] shadow-lg">
                        <div>
                            <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight flex items-center gap-3">
                                <Activity className="text-[var(--primary)]" size={32} />
                                Analytics Dashboard
                            </h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <select
                                value={timeRange}
                                onChange={(e) => setTimeRange(parseInt(e.target.value))}
                                className="input-glass px-4 py-2.5 rounded-xl font-bold text-sm"
                            >
                                <option value={7}>Last 7 days</option>
                                <option value={14}>Last 14 days</option>
                                <option value={30}>Last 30 days</option>
                                <option value={90}>Last 90 days</option>
                            </select>
                            <button
                                onClick={fetchAnalytics}
                                className="p-2.5 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-all"
                                title="Refresh Data"
                            >
                                <RefreshCw size={20} />
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2.5 rounded-xl bg-[var(--nav-hover)] text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                                title="Close Dashboard"
                            >
                                <X size={20} className="stroke-[3px]" />
                            </button>
                        </div>
                    </div>

                    {/* Real-time Server Pulse Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--primary)] opacity-80">Real-time Server Pulse</h2>
                        </div>
                        <ServerPulse data={serverPulse} />
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            icon={<Users size={24} />}
                            title="Total Users"
                            value={summary?.totalUsers || 0}
                            color="bg-blue-500"
                        />
                        <StatCard
                            icon={<Share2 size={24} />}
                            title="Active Shares"
                            value={summary?.totalShares || 0}
                            color="bg-green-500"
                        />
                        <StatCard
                            icon={<Activity size={24} />}
                            title="Today's Activity"
                            value={summary?.todayActivity || 0}
                            color="bg-purple-500"
                        />
                        <StatCard
                            icon={<HardDrive size={24} />}
                            title="Storage Used"
                            value={formatBytes(storageStats?.totalLocalStorage || 0)}
                            color="bg-orange-500"
                            isText
                        />
                    </div>

                    {/* Action Breakdown */}
                    <div className="glass rounded-2xl p-6">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <BarChart3 size={24} className="text-[var(--primary)]" />
                            Activity Breakdown (Last {timeRange} days)
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {summary?.actionBreakdown.map((item) => (
                                <div
                                    key={item.action}
                                    className="bg-[var(--nav-hover)] rounded-xl p-4 cursor-pointer hover:bg-[var(--primary)]/10 transition-colors"
                                    onClick={() => handleActionClick(item.action)}
                                >
                                    <div className={`w-10 h-10 rounded-lg ${getActionColor(item.action)} flex items-center justify-center mb-2`}>
                                        <span className="text-white text-sm font-bold">{item.count}</span>
                                    </div>
                                    <p className="text-sm text-[var(--text-muted)] capitalize">{item.action}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Storage Breakdown */}
                    <div className="glass rounded-2xl p-6">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <HardDrive size={24} className="text-[var(--primary)]" />
                            Storage by User
                        </h2>
                        <div className="space-y-3">
                            {storageStats?.userStorageBreakdown.slice(0, 10).map((user, index) => {
                                const percentage = (user.size / (storageStats.totalLocalStorage || 1)) * 100;
                                return (
                                    <div key={user.username} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium">{user.username}</span>
                                            <span className="text-[var(--text-muted)]">{formatBytes(user.size)}</span>
                                        </div>
                                        <div className="h-2 bg-[var(--nav-hover)] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-[var(--primary)] to-blue-400 transition-all"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Downloads */}
                        <div className="glass rounded-2xl p-6">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Download size={24} className="text-[var(--primary)]" />
                                Top Downloaded Files
                            </h2>
                            <div className="space-y-2">
                                {topDownloads.slice(0, 8).map((item, index) => {
                                    const fileName = item.description.replace(/^Downloaded: /, '').split('/').pop();
                                    return (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-3 bg-[var(--nav-hover)] rounded-xl hover:bg-[var(--primary)]/10 transition-colors cursor-pointer"
                                            onClick={() => handleFileClick(item.description)}
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/20 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-xs font-bold text-[var(--primary)]">#{index + 1}</span>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium truncate">{fileName}</p>
                                                    <p className="text-xs text-[var(--text-muted)]">
                                                        {formatDate(item.lastDownload)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className="text-sm font-bold text-[var(--primary)]">{item.downloadCount}x</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Most Active Users */}
                        <div className="glass rounded-2xl p-6">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <TrendingUp size={24} className="text-[var(--primary)]" />
                                Most Active Users
                            </h2>
                            <div className="space-y-2">
                                {activeUsers.slice(0, 8).map((user, index) => (
                                    <div
                                        key={user.userId}
                                        className="flex items-center justify-between p-3 bg-[var(--nav-hover)] rounded-xl hover:bg-[var(--primary)]/10 transition-colors cursor-pointer"
                                        onClick={() => handleUserClick(user.userId, user.username)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-blue-400 flex items-center justify-center">
                                                <span className="text-xs font-bold text-white">#{index + 1}</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{user.username}</p>
                                                <p className="text-xs text-[var(--text-muted)]">
                                                    {formatDate(user.lastActivity)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-[var(--primary)]">{user.activityCount}</p>
                                            <p className="text-xs text-[var(--text-muted)]">actions</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Detail Modal */}
                    <DetailModal
                        type={selectedDetail?.type || null}
                        data={selectedDetail?.data}
                        onClose={() => setSelectedDetail(null)}
                    />
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
