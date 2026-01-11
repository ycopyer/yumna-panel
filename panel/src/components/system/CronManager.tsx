import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, Plus, Trash2, Play, AlertCircle, CheckCircle, Activity, Save, X } from 'lucide-react';

interface CronJob {
    id: number;
    command: string;
    schedule: string;
    description: string;
    isActive: number;
    lastRun: string;
    nextRun: string;
}

const CronManager: React.FC = () => {
    const [jobs, setJobs] = useState<CronJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);

    // Form State
    const [command, setCommand] = useState('');
    const [schedule, setSchedule] = useState('* * * * *');
    const [description, setDescription] = useState('');
    const [error, setError] = useState<string | null>(null);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/cron');
            setJobs(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            await axios.post('/api/cron', { command, schedule, description });
            setShowAdd(false);
            setCommand('');
            setSchedule('* * * * *');
            setDescription('');
            fetchJobs();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create cron job');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this job?')) return;
        try {
            await axios.delete(`/api/cron/${id}`);
            fetchJobs();
        } catch (err) {
            console.error(err);
        }
    };

    const toggleActive = async (job: CronJob) => {
        try {
            await axios.put(`/api/cron/${job.id}`, { isActive: !job.isActive });
            fetchJobs();
        } catch (err) {
            console.error(err);
        }
    };

    const getHumanReadableSchedule = (cronExp: string) => {
        // Very basic parser or just return string
        return cronExp;
    };

    return (
        <div className="flex-1 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight mb-2">Cron Jobs</h1>
                    <p className="text-[var(--text-muted)]">Schedule and automate system tasks.</p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white font-bold rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
                >
                    <Plus size={18} />
                    <span>New Job</span>
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-500">
                    <AlertCircle size={20} />
                    <span className="font-bold">{error}</span>
                </div>
            )}

            {showAdd && (
                <div className="mb-8 p-6 glass rounded-3xl border border-[var(--primary)]/20 animate-in slide-in-from-top-4">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Clock className="text-[var(--primary)]" />
                            New Scheduled Task
                        </h3>
                        <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-[var(--nav-hover)] rounded-full text-[var(--text-muted)]">
                            <X size={20} />
                        </button>
                    </div>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-2">Schedule (Cron Expression)</label>
                                <input
                                    type="text"
                                    className="input-glass w-full"
                                    value={schedule}
                                    onChange={e => setSchedule(e.target.value)}
                                    placeholder="* * * * *"
                                    required
                                />
                                <p className="text-[10px] text-[var(--text-muted)] mt-1">Min Hour Day Month Weekday</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-2">Description (Optional)</label>
                                <input
                                    type="text"
                                    className="input-glass w-full"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Daily Backup"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-2">Command</label>
                            <input
                                type="text"
                                className="input-glass w-full font-mono text-sm"
                                value={command}
                                onChange={e => setCommand(e.target.value)}
                                placeholder="php /var/www/script.php"
                                required
                            />
                        </div>
                        <div className="flex justify-end pt-4">
                            <button type="submit" className="flex items-center gap-2 px-8 py-3 bg-[var(--primary)] text-white font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all">
                                <Save size={18} />
                                <span>Create Task</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4">
                {jobs.map(job => (
                    <div key={job.id} className={`p-5 glass rounded-2xl border ${job.isActive ? 'border-[var(--border)]' : 'border-red-500/10'} hover:border-[var(--primary)]/30 transition-all group`}>
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${job.isActive ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'bg-[var(--nav-hover)] text-[var(--text-muted)]'}`}>
                                    <Activity size={24} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="font-bold text-lg">{job.description || 'Untitled Task'}</h3>
                                        <span className="text-xs font-mono bg-[var(--nav-hover)] px-2 py-1 rounded-md text-[var(--text-muted)]">{job.schedule}</span>
                                    </div>
                                    <code className="block text-sm font-mono text-[var(--text-muted)] bg-black/20 p-2 rounded-lg mb-2 max-w-lg break-all">
                                        {job.command}
                                    </code>
                                    <div className="flex items-center gap-4 text-xs font-bold text-[var(--text-muted)]">
                                        <span className="flex items-center gap-1">
                                            <HistoryIcon /> Last Run: {job.lastRun ? new Date(job.lastRun).toLocaleString() : 'Never'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => toggleActive(job)}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${job.isActive
                                            ? 'border-green-500 text-green-500 hover:bg-green-500/10'
                                            : 'border-[var(--text-muted)] text-[var(--text-muted)] hover:bg-[var(--text-muted)]/10'
                                        }`}
                                >
                                    {job.isActive ? 'Active' : 'Paused'}
                                </button>
                                <button
                                    onClick={() => handleDelete(job.id)}
                                    className="p-2.5 rounded-xl hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {!loading && jobs.length === 0 && (
                    <div className="text-center py-20 opacity-50">
                        <Clock size={48} className="mx-auto mb-4 text-[var(--text-muted)]" />
                        <h3 className="text-xl font-bold mb-2">No Cron Jobs</h3>
                        <p>Create a scheduled task to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const HistoryIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></svg>
);

export default CronManager;
