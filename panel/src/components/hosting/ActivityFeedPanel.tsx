import React, { useState, useEffect } from 'react';
import {
    Activity,
    RefreshCw,
    Filter,
    FileText,
    Settings,
    Database,
    Shield,
    Key,
    User,
    CheckSquare,
    MessageSquare,
    Globe,
    AlertCircle,
    Package,
    ArrowRight,
    Search,
    Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

interface ActivityFeedPanelProps {
    websiteId: number;
}

const ActivityFeedPanel: React.FC<ActivityFeedPanelProps> = ({ websiteId }) => {
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [limit, setLimit] = useState(50);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        fetchActivities();
    }, [websiteId, limit]);

    const fetchActivities = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/hosting/collaboration/websites/${websiteId}/activity`, {
                params: { limit },
                headers: {
                    'x-user-id': localStorage.getItem('userId') || '',
                    'x-session-id': localStorage.getItem('sessionId') || ''
                }
            });
            setActivities(response.data.activities);
        } catch (error) {
            console.error('Error fetching activities:', error);
        } finally {
            setLoading(false);
        }
    };

    const getActivityTheme = (action: string) => {
        const a = action.toLowerCase();
        if (a.includes('file')) return { icon: <FileText size={14} />, color: 'emerald' };
        if (a.includes('db') || a.includes('database')) return { icon: <Database size={14} />, color: 'indigo' };
        if (a.includes('ssl') || a.includes('cert')) return { icon: <Shield size={14} />, color: 'rose' };
        if (a.includes('member') || a.includes('team')) return { icon: <User size={14} />, color: 'violet' };
        if (a.includes('task')) return { icon: <CheckSquare size={14} />, color: 'amber' };
        if (a.includes('comment')) return { icon: <MessageSquare size={14} />, color: 'blue' };
        if (a.includes('config') || a.includes('settings')) return { icon: <Settings size={14} />, color: 'slate' };
        if (a.includes('app') || a.includes('deploy')) return { icon: <Package size={14} />, color: 'fuchsia' };
        return { icon: <Activity size={14} />, color: 'indigo' };
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const filteredActivities = activities.filter(a =>
        a.action.toLowerCase().includes(filter.toLowerCase()) ||
        (a.username && a.username.toLowerCase().includes(filter.toLowerCase())) ||
        (a.description && a.description.toLowerCase().includes(filter.toLowerCase()))
    );

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative group w-full max-w-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-violet-400 transition-colors" size={16} />
                    <input
                        type="text"
                        placeholder="Filter event log..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold text-white focus:border-violet-500/50 outline-none transition-all placeholder:text-white/20"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 p-1 rounded-xl">
                        {[25, 50, 100].map(val => (
                            <button
                                key={val}
                                onClick={() => setLimit(val)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${limit === val ? 'bg-violet-600 text-white' : 'text-white/30 hover:text-white'}`}
                            >
                                Last {val}
                            </button>
                        ))}
                    </div>
                    <button
                        className="p-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl transition-all active:scale-95 border border-white/5"
                        onClick={fetchActivities}
                        title="Force Sync"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin text-violet-400' : ''} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
                    <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em]">Streaming Event Buffers</p>
                </div>
            ) : filteredActivities.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center p-12 bg-white/[0.02] border border-white/5 border-dashed rounded-[32px] text-center">
                    <div className="p-6 bg-violet-500/5 rounded-full mb-4">
                        <Activity size={32} className="text-white/10" />
                    </div>
                    <h3 className="text-lg font-black text-white mb-1">Log Empty</h3>
                    <p className="text-white/40 text-sm font-medium italic">No events have been captured for this node yet.</p>
                </div>
            ) : (
                <div className="relative space-y-4">
                    {/* Vertical Line */}
                    <div className="absolute left-10 top-2 bottom-2 w-px bg-gradient-to-b from-violet-500/20 via-indigo-500/10 to-transparent hidden sm:block" />

                    {filteredActivities.map((activity, idx) => {
                        const theme = getActivityTheme(activity.action);
                        return (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                key={activity.id}
                                className="group relative flex items-start gap-6"
                            >
                                <div className="relative z-10 flex-shrink-0 mt-1 hidden sm:block">
                                    <div className={`w-20 h-20 rounded-2xl bg-${theme.color}-500/10 border border-${theme.color}-500/20 flex items-center justify-center text-${theme.color}-400 group-hover:scale-110 transition-transform shadow-inner`}>
                                        {React.cloneElement(theme.icon as React.ReactElement, { size: 28 })}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0 bg-white/[0.02] border border-white/5 rounded-[24px] p-6 group-hover:bg-white/[0.04] group-hover:border-white/10 transition-all">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="sm:hidden w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400">
                                                {theme.icon}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-black text-white group-hover:text-violet-400 transition-colors uppercase tracking-[0.1em]">
                                                    {activity.username || 'System Engine'}
                                                </span>
                                                <ArrowRight size={12} className="text-white/20" />
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-${theme.color}-500/10 text-${theme.color}-400 border border-${theme.color}-500/20`}>
                                                    {activity.action}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-tighter tabular-nums whitespace-nowrap">
                                            {formatTime(activity.created_at)}
                                        </span>
                                    </div>

                                    <p className="text-sm font-medium text-white/60 leading-relaxed italic group-hover:text-white/80 transition-colors">
                                        "{activity.description || 'System generated event captured successfully.'}"
                                    </p>

                                    {activity.metadata && (
                                        <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 overflow-hidden">
                                            <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] whitespace-nowrap">Tracing Meta:</span>
                                            <div className="flex gap-2 min-w-0 overflow-x-auto pb-1 scrollbar-hide">
                                                {Object.entries(typeof activity.metadata === 'string' ? JSON.parse(activity.metadata) : activity.metadata).map(([k, v], i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-black/40 border border-white/5 rounded-md text-[8px] font-bold text-white/40 whitespace-nowrap">
                                                        {k}: <span className="text-white/60">{String(v)}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ActivityFeedPanel;
