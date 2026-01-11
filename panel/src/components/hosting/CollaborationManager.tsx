import React, { useState, useEffect } from 'react';
import {
    Users,
    MessageSquare,
    CheckSquare,
    Activity,
    Plus,
    Search,
    Filter,
    ArrowUpRight,
    Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import TeamMembersPanel from './TeamMembersPanel';
import ActivityFeedPanel from './ActivityFeedPanel';
import TasksPanel from './TasksPanel';
import CommentsPanel from './CommentsPanel';
import '../styles/CollaborationManager.css';

interface CollaborationManagerProps {
    websiteId: number;
    websiteDomain: string;
    isOwner: boolean;
}

const CollaborationManager: React.FC<CollaborationManagerProps> = ({
    websiteId,
    websiteDomain,
    isOwner
}) => {
    const [activeTab, setActiveTab] = useState<'team' | 'activity' | 'tasks' | 'comments'>('team');
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        members: 0,
        pendingTasks: 0,
        completedTasks: 0,
        recentActivities: 0
    });

    useEffect(() => {
        fetchStats();
    }, [websiteId]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const [membersRes, tasksRes, activitiesRes] = await Promise.all([
                axios.get(`/api/hosting/collaboration/websites/${websiteId}/members`, {
                    headers: {
                        'x-user-id': localStorage.getItem('userId') || '',
                        'x-session-id': localStorage.getItem('sessionId') || ''
                    }
                }),
                axios.get(`/api/hosting/collaboration/websites/${websiteId}/tasks`, {
                    headers: {
                        'x-user-id': localStorage.getItem('userId') || '',
                        'x-session-id': localStorage.getItem('sessionId') || ''
                    }
                }),
                axios.get(`/api/hosting/collaboration/websites/${websiteId}/activity`, {
                    params: { limit: 1 },
                    headers: {
                        'x-user-id': localStorage.getItem('userId') || '',
                        'x-session-id': localStorage.getItem('sessionId') || ''
                    }
                })
            ]);

            setStats({
                members: membersRes.data.members?.length || 0,
                pendingTasks: tasksRes.data.tasks?.filter((t: any) => t.status === 'pending' || t.status === 'in-progress').length || 0,
                completedTasks: tasksRes.data.tasks?.filter((t: any) => t.status === 'completed').length || 0,
                recentActivities: activitiesRes.data.total || 0
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'team', label: 'Team Members', icon: <Users size={16} /> },
        { id: 'activity', label: 'Activity Feed', icon: <Activity size={16} /> },
        { id: 'tasks', label: 'Tasks', icon: <CheckSquare size={16} /> },
        { id: 'comments', label: 'Discussion', icon: <MessageSquare size={16} /> }
    ];

    return (
        <div className="collaboration-manager space-y-8 p-8 max-w-[1600px] mx-auto animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-violet-500/10 rounded-2xl text-violet-400 border border-violet-500/20 shadow-inner">
                            <Users size={24} />
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tight leading-none">Collaboration Hub</h2>
                    </div>
                    <p className="text-white/40 text-sm font-medium ml-14 tracking-wide uppercase text-[10px]">{websiteDomain}</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-violet-400 transition-colors">
                            <Search size={14} />
                        </div>
                        <input
                            type="text"
                            placeholder="SEARCH COLLABORATORS..."
                            className="bg-white/[0.03] border border-white/10 rounded-2xl py-3 pl-10 pr-6 text-[10px] font-black tracking-widest text-white outline-none focus:border-violet-500/50 focus:bg-white/[0.05] transition-all w-64"
                        />
                    </div>

                    <div className="flex items-center gap-4 bg-white/[0.03] border border-white/10 rounded-2xl p-2 pr-6">
                        <div className="flex -space-x-2">
                            {[1, 2, 3].map((_, i) => (
                                <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0A0A0A] bg-violet-500 flex items-center justify-center text-[10px] font-black">
                                    {String.fromCharCode(65 + i)}
                                </div>
                            ))}
                        </div>
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">
                            Active Now
                        </span>
                    </div>

                    <button
                        onClick={fetchStats}
                        className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-white/40 hover:text-white hover:border-white/20 transition-all"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin text-violet-400" /> : <Filter size={18} />}
                    </button>

                    <button className="flex items-center gap-3 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-violet-600/20 transition-all active:scale-95">
                        <Plus size={16} />
                        New Asset
                    </button>
                </div>
            </div>

            {/* Premium Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Collaborators', value: stats.members, icon: <Users />, color: 'violet', desc: 'Active team members' },
                    { label: 'Pending Work', value: stats.pendingTasks, icon: <CheckSquare />, color: 'amber', desc: 'Tasks in progress' },
                    { label: 'Achievements', value: stats.completedTasks, icon: <CheckSquare />, color: 'emerald', desc: 'Completed objectives' },
                    { label: 'Global Events', value: stats.recentActivities, icon: <Activity />, color: 'indigo', desc: 'Total tracked actions' }
                ].map((stat, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="group relative overflow-hidden p-6 bg-white/[0.02] border border-white/5 rounded-[32px] hover:border-white/20 transition-all duration-500"
                    >
                        <div className="relative z-10 flex justify-between items-start">
                            <div className="space-y-4">
                                <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-500/10 flex items-center justify-center text-${stat.color}-400 mb-4 group-hover:scale-110 transition-transform`}>
                                    {React.cloneElement(stat.icon as React.ReactElement, { size: 22 })}
                                </div>
                                <div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black text-white">{stat.value}</span>
                                    </div>
                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{stat.label}</p>
                                </div>
                            </div>
                            <div className="text-white/5 flex flex-col items-end gap-2">
                                <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                {React.cloneElement(stat.icon as React.ReactElement, { size: 64 })}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Modern Tabs Navigation */}
            <div className="relative bg-white/[0.02] border border-white/5 p-1.5 rounded-[24px] inline-flex mb-8 self-start">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`relative z-10 flex items-center gap-3 px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab.id ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
                    >
                        {tab.icon}
                        {tab.label}
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="activeTabGlow"
                                className="absolute inset-0 bg-violet-600 rounded-2xl -z-10 shadow-lg shadow-violet-600/30"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Panel Content Area */}
            <div className="relative min-h-[500px] bg-white/[0.01] border border-white/5 rounded-[48px] overflow-hidden p-1">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.99 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full h-full p-8"
                    >
                        {activeTab === 'team' && (
                            <TeamMembersPanel
                                websiteId={websiteId}
                                isOwner={isOwner}
                                onUpdate={fetchStats}
                            />
                        )}

                        {activeTab === 'activity' && (
                            <ActivityFeedPanel
                                websiteId={websiteId}
                            />
                        )}

                        {activeTab === 'tasks' && (
                            <TasksPanel
                                websiteId={websiteId}
                                onUpdate={fetchStats}
                            />
                        )}

                        {activeTab === 'comments' && (
                            <CommentsPanel
                                websiteId={websiteId}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default CollaborationManager;
