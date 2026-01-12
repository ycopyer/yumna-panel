import React, { useState, useEffect } from 'react';
import { X, Clock, Terminal, Loader2, Server, Calendar } from 'lucide-react';
import axios from 'axios';

interface AddCronJobModalProps {
    userId: number;
    onClose: () => void;
    onSuccess: () => void;
}

interface ServerNode {
    id: number;
    name: string;
    hostname: string;
    ip: string;
    is_local: boolean;
    status: string;
    cpu_usage: number;
    ram_usage: number;
    disk_usage: number;
}

const AddCronJobModal: React.FC<AddCronJobModalProps> = ({ userId, onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [schedule, setSchedule] = useState('0 0 * * *'); // Default: Daily at midnight
    const [command, setCommand] = useState('');
    const [serverId, setServerId] = useState<number>(1);
    const [servers, setServers] = useState<ServerNode[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Fetch available servers
        axios.get('/api/cron/servers', { headers: { 'x-user-id': userId } })
            .then(res => {
                setServers(res.data);
                if (res.data.length > 0) {
                    setServerId(res.data[0].id);
                }
            })
            .catch(err => console.error('Failed to fetch servers', err));
    }, [userId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !schedule || !command) {
            return setError('All fields are required');
        }

        setLoading(true);
        setError('');
        try {
            const response = await axios.post('/api/cron/jobs', {
                name,
                schedule,
                command,
                serverId
            }, {
                headers: { 'x-user-id': userId }
            });

            // Show success message with server info
            if (response.data.server) {
                alert(`Cron job created successfully on ${response.data.server.name} (${response.data.server.ip})!`);
            }

            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create cron job');
        } finally {
            setLoading(false);
        }
    };

    const schedulePresets = [
        { label: 'Every Minute', value: '* * * * *' },
        { label: 'Every Hour', value: '0 * * * *' },
        { label: 'Daily at Midnight', value: '0 0 * * *' },
        { label: 'Weekly (Sunday)', value: '0 0 * * 0' },
        { label: 'Monthly (1st)', value: '0 0 1 * *' },
    ];

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[1100] flex items-center justify-center p-4">
            <div className="glass w-full max-w-2xl rounded-[32px] overflow-hidden border border-white/5 shadow-2xl animate-scale-up">

                {/* Header */}
                <div className="p-8 bg-gradient-to-br from-purple-600/20 to-transparent border-b border-white/5">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shadow-lg">
                                <Clock size={28} className="text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight">Create Cron Job</h3>
                                <p className="text-xs text-white/40 mt-1">Schedule automated tasks to run periodically</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-black/20">
                    {error && (
                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                            {error}
                        </div>
                    )}

                    {/* Job Name */}
                    <div className="space-y-2">
                        <label className="text-xs font-black text-white/60 uppercase tracking-widest ml-1">
                            Job Name *
                        </label>
                        <div className="relative">
                            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                            <input
                                required
                                type="text"
                                placeholder="Daily Backup"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white font-bold text-sm focus:border-purple-500 outline-none transition-all"
                            />
                        </div>
                        <p className="text-[10px] text-white/30 ml-1">A descriptive name for this cron job</p>
                    </div>

                    {/* Schedule */}
                    <div className="space-y-2">
                        <label className="text-xs font-black text-white/60 uppercase tracking-widest ml-1">
                            Schedule (Cron Expression) *
                        </label>
                        <div className="relative">
                            <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                            <input
                                required
                                type="text"
                                placeholder="0 0 * * *"
                                value={schedule}
                                onChange={e => setSchedule(e.target.value)}
                                pattern="^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$"
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white font-bold text-sm font-mono focus:border-purple-500 outline-none transition-all"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {schedulePresets.map(preset => (
                                <button
                                    key={preset.value}
                                    type="button"
                                    onClick={() => setSchedule(preset.value)}
                                    className="px-3 py-1 rounded-lg bg-white/5 hover:bg-purple-500/20 text-white/60 hover:text-purple-400 text-[10px] font-bold uppercase tracking-wider transition-all"
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-white/30 ml-1">Format: minute hour day month weekday</p>
                    </div>

                    {/* Command */}
                    <div className="space-y-2">
                        <label className="text-xs font-black text-white/60 uppercase tracking-widest ml-1">
                            Command *
                        </label>
                        <div className="relative">
                            <Terminal size={16} className="absolute left-3 top-3 text-white/40" />
                            <textarea
                                required
                                placeholder="/usr/bin/php /var/www/html/backup.php"
                                value={command}
                                onChange={e => setCommand(e.target.value)}
                                rows={3}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white font-bold text-sm font-mono focus:border-purple-500 outline-none transition-all resize-none"
                            />
                        </div>
                        <p className="text-[10px] text-white/30 ml-1">Full path to the script or command to execute</p>
                    </div>

                    {/* Server Selection */}
                    <div className="space-y-2">
                        <label className="text-xs font-black text-white/60 uppercase tracking-widest ml-1">
                            Deploy to Server
                            {servers.length > 1 && <span className="ml-2 text-purple-400 font-normal">({servers.length} available)</span>}
                        </label>
                        <div className="relative">
                            <Server size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 z-10" />
                            <select
                                value={serverId}
                                onChange={(e) => setServerId(Number(e.target.value))}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white font-bold text-sm focus:border-purple-500 outline-none transition-all appearance-none cursor-pointer"
                            >
                                {servers.map(server => (
                                    <option key={server.id} value={server.id} style={{ background: '#1a1a2e' }}>
                                        {server.name} ({server.ip}) {server.is_local ? '🏠 Local' : '🌐 Remote'} - CPU: {Math.round(server.cpu_usage)}%
                                    </option>
                                ))}
                            </select>
                        </div>
                        {servers.length === 0 && (
                            <p className="text-xs text-red-400 font-semibold mt-2">⚠️ No active servers available.</p>
                        )}
                        {servers.find(s => s.id === serverId) && (
                            <div className="mt-3 p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
                                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">
                                    📍 Selected: {servers.find(s => s.id === serverId)?.name}
                                </p>
                                <p className="text-xs text-white/50">
                                    Cron job will run on {servers.find(s => s.id === serverId)?.is_local ? 'local' : 'remote'} server
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 font-bold text-sm transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Cron Job'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddCronJobModal;
