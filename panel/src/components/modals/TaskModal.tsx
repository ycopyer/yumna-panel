import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Calendar, User, AlertCircle, Flag, Loader2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

interface TaskModalProps {
    websiteId: number;
    task?: any;
    onClose: () => void;
    onSuccess: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ websiteId, task, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        title: task?.title || '',
        description: task?.description || '',
        assigned_to: task?.assigned_to || '',
        priority: task?.priority || 'medium',
        status: task?.status || 'pending',
        due_date: task?.due_date ? task.due_date.split('T')[0] : ''
    });
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchTeamMembers();
    }, [websiteId]);

    const fetchTeamMembers = async () => {
        try {
            const response = await axios.get(`/api/hosting/collaboration/websites/${websiteId}/members`, {
                headers: {
                    'x-user-id': localStorage.getItem('userId') || '',
                    'x-session-id': localStorage.getItem('sessionId') || ''
                }
            });
            setTeamMembers(response.data.members || []);
        } catch (error) {
            console.error('Error fetching team members:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const url = task
                ? `/api/hosting/collaboration/websites/${websiteId}/tasks/${task.id}`
                : `/api/hosting/collaboration/websites/${websiteId}/tasks`;

            const method = task ? 'put' : 'post';
            await (axios as any)[method](url, formData, {
                headers: {
                    'x-user-id': localStorage.getItem('userId') || '',
                    'x-session-id': localStorage.getItem('sessionId') || ''
                }
            });

            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!task || !confirm('Permanently purge this task from the matrix?')) return;

        try {
            setLoading(true);
            await axios.delete(`/api/hosting/collaboration/websites/${websiteId}/tasks/${task.id}`, {
                headers: {
                    'x-user-id': localStorage.getItem('userId') || '',
                    'x-session-id': localStorage.getItem('sessionId') || ''
                }
            });
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="w-full max-w-xl bg-[#0A0A0A] border border-white/5 rounded-[40px] shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Visual Accent */}
                <div className={`h-2 w-full bg-gradient-to-r ${formData.priority === 'urgent' ? 'from-rose-600 to-rose-400' : 'from-indigo-600 to-violet-400'}`} />

                <div className="p-10">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                                    <CheckSquare size={20} />
                                </div>
                                <h2 className="text-2xl font-black text-white tracking-tight">{task ? 'Edit Mission' : 'New Objective'}</h2>
                            </div>
                            <p className="text-white/20 text-[9px] font-black uppercase tracking-[0.3em] ml-1">Assign and Track Operational Nodes</p>
                        </div>
                        <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-full transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {error && (
                            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <div className="space-y-6">
                            <div className="group">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1 mb-2 block">Mission Title</label>
                                <input
                                    type="text"
                                    placeholder="Brief summary of the objective..."
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/10"
                                    required
                                />
                            </div>

                            <div className="group">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1 mb-2 block">Operational Details</label>
                                <textarea
                                    placeholder="Describe the technical steps or requirements..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/10 min-h-[120px]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <User size={12} />
                                        Field Agent
                                    </label>
                                    <select
                                        value={formData.assigned_to}
                                        onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 px-6 text-xs font-black text-white outline-none focus:border-indigo-500/50 transition-all appearance-none uppercase tracking-widest"
                                    >
                                        <option value="" style={{ background: '#0a0a0a' }}>UNASSIGNED</option>
                                        {teamMembers.map((member) => (
                                            <option key={member.user_id} value={member.user_id} style={{ background: '#0a0a0a' }}>
                                                {member.username.toUpperCase()}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <Calendar size={12} />
                                        Final Deadline
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.due_date}
                                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 px-6 text-xs font-black text-white outline-none focus:border-indigo-500/50 transition-all [color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <Flag size={12} />
                                        Priority Level
                                    </label>
                                    <select
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 px-6 text-xs font-black text-white outline-none focus:border-indigo-500/50 transition-all appearance-none uppercase tracking-widest"
                                    >
                                        <option value="low" style={{ background: '#0a0a0a' }}>LOW PRIORITY</option>
                                        <option value="medium" style={{ background: '#0a0a0a' }}>MEDIUM</option>
                                        <option value="high" style={{ background: '#0a0a0a' }}>HIGH ALERT</option>
                                        <option value="urgent" style={{ background: '#0a0a0a' }}>CRITICAL</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Current State</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 px-6 text-xs font-black text-white outline-none focus:border-indigo-500/50 transition-all appearance-none uppercase tracking-widest"
                                    >
                                        <option value="pending" style={{ background: '#0a0a0a' }}>PENDING</option>
                                        <option value="in_progress" style={{ background: '#0a0a0a' }}>IN PROGRESS</option>
                                        <option value="completed" style={{ background: '#0a0a0a' }}>COMPLETED</option>
                                        <option value="cancelled" style={{ background: '#0a0a0a' }}>DROPPED</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                            {task && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="p-4 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500/40 hover:text-rose-500 rounded-2xl transition-all border border-rose-500/5"
                                >
                                    <Trash2 size={20} />
                                </button>
                            )}
                            <div className="flex-1" />
                            <div className="flex gap-4">
                                <button type="button" onClick={onClose} className="px-8 py-4 text-white/30 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex items-center gap-3 px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-600/20 active:scale-95 transition-all"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={16} /> : task ? 'Update Scan' : 'Commence Objective'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default TaskModal;
