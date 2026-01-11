import React, { useState, useEffect } from 'react';
import {
    CheckSquare,
    Plus,
    Filter,
    Calendar,
    Clock,
    Search,
    Loader2,
    Flag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import TaskModal from '../modals/TaskModal';

interface TasksPanelProps {
    websiteId: number;
    onUpdate: () => void;
}

const TasksPanel: React.FC<TasksPanelProps> = ({ websiteId, onUpdate }) => {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any>(null);

    useEffect(() => {
        fetchTasks();
    }, [websiteId, statusFilter]);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/hosting/collaboration/websites/${websiteId}/tasks`, {
                params: { status: statusFilter },
                headers: {
                    'x-user-id': localStorage.getItem('userId') || '',
                    'x-session-id': localStorage.getItem('sessionId') || ''
                }
            });
            setTasks(response.data.tasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTaskClick = (task: any) => {
        setSelectedTask(task);
        setShowTaskModal(true);
    };

    const handleCreateTask = () => {
        setSelectedTask(null);
        setShowTaskModal(true);
    };

    const getPriorityMeta = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'critical': return { color: 'rose', icon: <Flag size={12} fill="currentColor" /> };
            case 'high': return { color: 'amber', icon: <Flag size={12} fill="currentColor" /> };
            case 'medium': return { color: 'indigo', icon: <Flag size={12} /> };
            default: return { color: 'emerald', icon: <Flag size={12} /> };
        }
    };

    const getStatusMeta = (status: string) => {
        const s = status.toLowerCase().replace('_', '-');
        switch (s) {
            case 'completed': return { color: 'emerald', label: 'Verified', shade: '400' };
            case 'in-progress': return { color: 'indigo', label: 'Processing', shade: '400' };
            case 'cancelled': return { color: 'rose', label: 'Dropped', shade: '400' };
            default: return { color: 'white', label: 'Backlog', shade: '40' }; // special handling for white/40
        }
    };

    const formatDueDate = (dueDate: string) => {
        if (!dueDate) return null;
        const date = new Date(dueDate);
        const now = new Date();
        const isOverdue = date < now;
        return {
            text: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            isOverdue
        };
    };

    const filteredTasks = tasks.filter(t =>
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.assignee_name && t.assignee_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                <div className="relative group w-full lg:max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-indigo-400 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search tasks, descriptions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:border-indigo-500/50 outline-none transition-all placeholder:text-white/20"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                    <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 p-1.5 rounded-2xl overflow-x-auto scrollbar-hide">
                        <div className="pl-3 pr-1 text-white/20">
                            <Filter size={14} />
                        </div>
                        {['', 'pending', 'in-progress', 'completed'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-5 py-2 whitespace-nowrap rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === status ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-white/30 hover:text-white hover:bg-white/5'}`}
                            >
                                {status || 'Global View'}
                            </button>
                        ))}
                    </div>

                    <button
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                        onClick={handleCreateTask}
                    >
                        <Plus size={16} />
                        Append Task
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                    <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em]">Querying Task Buffer</p>
                </div>
            ) : filteredTasks.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center p-12 bg-white/[0.02] border border-white/5 border-dashed rounded-[32px] text-center">
                    <div className="p-6 bg-indigo-500/5 rounded-full mb-4">
                        <CheckSquare size={32} className="text-white/10" />
                    </div>
                    <h3 className="text-lg font-black text-white mb-1">Board is Clear</h3>
                    <p className="text-white/40 text-sm font-medium italic">No tasks currently require your attention in this sector.</p>
                </div>
            ) : (
                <motion.div
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {filteredTasks.map((task, idx) => {
                        const priority = getPriorityMeta(task.priority);
                        const status = getStatusMeta(task.status);
                        const dueDate = formatDueDate(task.due_date);

                        return (
                            <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.04 }}
                                key={task.id}
                                whileHover={{ y: -5 }}
                                onClick={() => handleTaskClick(task)}
                                className={`group relative bg-[#0D0D0D] border-l-4 border-l-${priority.color}-500/50 border border-white/5 rounded-[24px] p-6 hover:border-white/20 transition-all cursor-pointer shadow-xl overflow-hidden`}
                            >
                                <div className={`absolute top-0 right-0 w-24 h-24 bg-${priority.color}-500/5 blur-[48px] -mr-8 -mt-8`} />

                                <div className="relative z-10 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className={`flex items-center gap-2 text-${priority.color}-400`}>
                                            {priority.icon}
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em]">{task.priority}</span>
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${status.color === 'white'
                                            ? 'border-white/5 bg-white/5 text-white/40'
                                            : `border-${status.color}-500/20 bg-${status.color}-500/10 text-${status.color}-400`
                                            }`}>
                                            {status.label}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-lg font-black text-white group-hover:text-indigo-400 transition-colors leading-tight tracking-tight">
                                            {task.title}
                                        </h3>
                                        {task.description && (
                                            <p className="text-[11px] font-medium text-white/40 line-clamp-2 leading-relaxed italic">
                                                {task.description}
                                            </p>
                                        )}
                                    </div>

                                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-black text-white/40">
                                                {task.assignee_name ? task.assignee_name.charAt(0).toUpperCase() : '?'}
                                            </div>
                                            <span className="text-[10px] font-bold text-white/40 truncate max-w-[80px]">
                                                {task.assignee_name || 'Unassigned'}
                                            </span>
                                        </div>

                                        {dueDate && (
                                            <div className={`flex items-center gap-1.5 ${dueDate.isOverdue ? 'text-rose-400' : 'text-white/20'}`}>
                                                <Calendar size={12} />
                                                <span className="text-[10px] font-black uppercase tracking-tighter">{dueDate.text}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            )}

            {showTaskModal && (
                <TaskModal
                    websiteId={websiteId}
                    task={selectedTask}
                    onClose={() => {
                        setShowTaskModal(false);
                        setSelectedTask(null);
                    }}
                    onSuccess={() => {
                        setShowTaskModal(false);
                        setSelectedTask(null);
                        fetchTasks();
                        onUpdate();
                    }}
                />
            )}
        </div>
    );
};

export default TasksPanel;
