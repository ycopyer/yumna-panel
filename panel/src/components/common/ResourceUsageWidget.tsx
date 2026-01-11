import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { HardDrive, Globe, Database, Mail, Server, Key, LayoutGrid } from 'lucide-react';

interface ResourceStats {
    storage: { used: number; limit: number };
    websites: { used: number; limit: number };
    subdomains: { used: number; limit: number };
    databases: { used: number; limit: number };
    emails: { used: number; limit: number };
    dns: { used: number; limit: number };
    ssh: { used: number; limit: number };
}

const formatBytes = (bytes: number) => {
    if (!bytes && bytes !== 0) return '0 B';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const ResourceUsageWidget: React.FC = () => {
    const [stats, setStats] = useState<ResourceStats | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            const res = await axios.get('/api/users/me/usage');
            setStats(res.data);
        } catch (err) {
            console.error('Failed to fetch usage stats', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        // Optional: Poll every 30 seconds
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading || !stats) return null;

    const renderItem = (icon: React.ReactNode, label: string, used: number, limit: number, isBytes = false) => {
        // Prevent division by zero
        const percent = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
        const isCritical = percent > 90;
        const colorClass = isCritical ? 'bg-red-500' : 'bg-[var(--primary)]';

        return (
            <div className="mb-3 last:mb-0">
                <div className="flex justify-between items-center mb-1 text-xs">
                    <div className="flex items-center gap-1.5 text-[var(--text-muted)] font-bold uppercase tracking-wider">
                        {icon}
                        <span>{label}</span>
                    </div>
                    <span className={`font-black ${isCritical ? 'text-red-500' : 'text-[var(--text-main)]'}`}>
                        {isBytes ? formatBytes(used) : used} <span className="text-[var(--text-muted)] opacity-60">/ {isBytes ? formatBytes(limit) : limit}</span>
                    </span>
                </div>
                <div className="h-1.5 w-full bg-[var(--bg-dark)] rounded-full overflow-hidden shadow-inner">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass} ${isCritical ? 'shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'shadow-[0_0_8px_rgba(99,102,241,0.3)]'}`}
                        style={{ width: `${percent}%` }}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="mt-6 px-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <p className="px-2 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-40">Resource Usage</p>
            <div className="p-4 bg-gradient-to-br from-[var(--nav-hover)] to-transparent rounded-2xl border border-[var(--border)] relative overflow-hidden group">
                {/* Decorative Background Glow */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--primary)]/5 blur-3xl rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>

                <div className="relative z-10 space-y-4">
                    {/* Storage (Always visible) */}
                    {renderItem(<HardDrive size={10} />, 'Storage', stats.storage.used, stats.storage.limit, true)}

                    {/* Only show others if limit > 0 (active features) to reduce clutter */}
                    {stats.websites.limit > 0 && renderItem(<Globe size={10} />, 'Websites', stats.websites.used, stats.websites.limit)}
                    {stats.subdomains.limit > 0 && renderItem(<LayoutGrid size={10} />, 'Subdomains', stats.subdomains.used, stats.subdomains.limit)}
                    {stats.databases.limit > 0 && renderItem(<Database size={10} />, 'Databases', stats.databases.used, stats.databases.limit)}
                    {stats.emails.limit > 0 && renderItem(<Mail size={10} />, 'Email Accounts', stats.emails.used, stats.emails.limit)}
                </div>
            </div>
        </div>
    );
};

export default ResourceUsageWidget;
