import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Box,
    Play,
    Square,
    RefreshCw,
    Terminal,
    Cpu,
    Activity,
    Loader2,
    MoreVertical,
    Search,
    AlertCircle,
    Trash2,
    Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CreateContainerModal from '../modals/CreateContainerModal';

interface Container {
    id: string;
    names: string[];
    image: string;
    state: string;
    status: string;
    ports: any[];
    created: number;
}

const DockerManager: React.FC = () => {
    const [containers, setContainers] = useState<Container[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedContainer, setSelectedContainer] = useState<string | null>(null);
    const [logs, setLogs] = useState<string>('');
    const [logsLoading, setLogsLoading] = useState(false);
    const [baseTime] = useState(Date.now());
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [dockerAvailable, setDockerAvailable] = useState(true);

    useEffect(() => {
        checkDockerStatus();
        fetchContainers();
        const interval = setInterval(fetchContainers, 5000);
        return () => clearInterval(interval);
    }, []);

    const checkDockerStatus = async () => {
        try {
            const res = await axios.get('/api/hosting/docker/status', {
                headers: { 'x-user-id': localStorage.getItem('userId') || '' }
            });
            setDockerAvailable(res.data.available);
        } catch (err) {
            console.error('Failed to check Docker status', err);
            setDockerAvailable(false);
        }
    };

    const fetchContainers = async () => {
        try {
            const res = await axios.get('/api/hosting/docker/containers?all=true');
            setContainers(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch containers', err);
            setLoading(false);
        }
    };

    const handleAction = async (id: string, action: 'start' | 'stop' | 'restart') => {
        setActionLoading(id);
        try {
            await axios.post(`/api/hosting/docker/containers/${id}/${action}`, {}, {
                headers: { 'x-user-id': localStorage.getItem('userId') || '' }
            });
            await fetchContainers();
        } catch (err: any) {
            alert(err.response?.data?.error || `Failed to ${action} container`);
        } finally {
            setActionLoading(null);
        }
    };

    const fetchLogs = async (id: string) => {
        setSelectedContainer(id);
        setLogsLoading(true);
        try {
            const res = await axios.get(`/api/hosting/docker/containers/${id}/logs?tail=200`, {
                headers: { 'x-user-id': localStorage.getItem('userId') || '' }
            });
            setLogs(res.data.logs);
        } catch (err) {
            setLogs('Failed to fetch logs');
        } finally {
            setLogsLoading(false);
        }
    };

    const filteredContainers = containers.filter(c =>
        c.names[0].toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.image.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusColor = (state: string) => {
        if (state === 'running') return 'emerald';
        if (state === 'exited') return 'slate';
        if (state === 'paused') return 'amber';
        if (state === 'restarting') return 'blue';
        return 'rose';
    };

    return (
        <div className="space-y-8 min-h-[80vh]">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/5">
                            <Box size={24} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tight">Docker Registry</h2>
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${dockerAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                                {dockerAvailable ? 'Engine Online' : 'Engine Offline'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-400 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Filter containers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/[0.02] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-xs font-bold text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-white/20"
                        />
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all"
                    >
                        <Plus size={16} /> Create Container
                    </button>
                    <button
                        onClick={() => fetchContainers()}
                        className="p-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl transition-all border border-white/5"
                    >
                        <RefreshCw size={20} className={loading && containers.length === 0 ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Grid */}
            {loading && containers.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                    <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em]">Connecting to Daemon</p>
                </div>
            ) : !dockerAvailable ? (
                <div className="py-20 flex flex-col items-center justify-center p-12 bg-red-500/5 border border-red-500/20 border-dashed rounded-[32px] text-center">
                    <div className="p-6 bg-red-500/10 rounded-full mb-4">
                        <AlertCircle size={32} className="text-red-400" />
                    </div>
                    <h3 className="text-lg font-black text-white mb-2">Docker Engine Not Available</h3>
                    <p className="text-white/60 text-sm font-medium mb-4 max-w-md">
                        The Docker daemon is not running or not accessible. Please ensure Docker Desktop is installed and running.
                    </p>
                    <button
                        onClick={() => { checkDockerStatus(); fetchContainers(); }}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all"
                    >
                        <RefreshCw size={14} /> Retry Connection
                    </button>
                </div>
            ) : filteredContainers.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center p-12 bg-white/[0.02] border border-white/5 border-dashed rounded-[32px] text-center">
                    <div className="p-6 bg-blue-500/5 rounded-full mb-4">
                        <Box size={32} className="text-white/10" />
                    </div>
                    <h3 className="text-lg font-black text-white mb-1">No Containers Found</h3>
                    <p className="text-white/40 text-sm font-medium italic">Your docker environment appears empty.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {filteredContainers.map((container) => {
                        const statusColor = getStatusColor(container.state);
                        return (
                            <motion.div
                                key={container.id}
                                layoutId={container.id}
                                className="group relative bg-white/[0.02] border border-white/5 rounded-[32px] p-6 hover:border-white/10 transition-all overflow-hidden"
                            >
                                {/* Ambient Glow */}
                                <div className={`absolute -right-20 -top-20 w-64 h-64 bg-${statusColor}-500/10 rounded-full blur-[80px] group-hover:bg-${statusColor}-500/20 transition-all duration-700`} />

                                <div className="relative z-10 flex flex-col h-full justify-between">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-14 h-14 rounded-2xl bg-${statusColor}-500/10 border border-${statusColor}-500/20 flex items-center justify-center text-${statusColor}-400 shadow-[0_0_15px_-3px_rgba(0,0,0,0.2)]`}>
                                                <Box size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-white tracking-tight line-clamp-1" title={container.names[0]}>
                                                    {container.names[0].replace(/^\//, '')}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-${statusColor}-500/10 text-${statusColor}-400 border border-${statusColor}-500/20`}>
                                                        {container.state}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-white/30 truncate max-w-[150px]" title={container.image}>
                                                        {container.image}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            {container.state === 'running' ? (
                                                <>
                                                    <button
                                                        onClick={() => handleAction(container.id, 'restart')}
                                                        disabled={actionLoading === container.id}
                                                        className="p-3 bg-white/5 hover:bg-blue-500/20 text-white/40 hover:text-blue-400 rounded-xl transition-all border border-white/5"
                                                        title="Restart"
                                                    >
                                                        <RefreshCw size={16} className={actionLoading === container.id ? "animate-spin" : ""} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(container.id, 'stop')}
                                                        disabled={actionLoading === container.id}
                                                        className="p-3 bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 rounded-xl transition-all border border-white/5"
                                                        title="Stop"
                                                    >
                                                        <Square size={16} fill="currentColor" className="opacity-80" />
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => handleAction(container.id, 'start')}
                                                    disabled={actionLoading === container.id}
                                                    className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl transition-all active:scale-95"
                                                    title="Start"
                                                >
                                                    {actionLoading === container.id ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    if (confirm('Are you sure you want to remove this container? This action cannot be undone.')) {
                                                        handleAction(container.id, 'remove' as any);
                                                    }
                                                }}
                                                disabled={actionLoading === container.id}
                                                className="p-3 bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-xl transition-all border border-white/5"
                                                title="Remove"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Metrics / Details */}
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Uptime</p>
                                            <p className="text-xs font-mono text-white/60 truncate">{container.status}</p>
                                        </div>
                                        <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Created</p>
                                            <p className="text-xs font-mono text-white/60">
                                                {new Date(container.created * 1000).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => fetchLogs(container.id)}
                                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all group-hover:border-white/10"
                                    >
                                        <Terminal size={14} /> View Logs
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )
            }

            {/* Logs Modal */}
            <AnimatePresence>
                {selectedContainer && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setSelectedContainer(null)}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="w-full max-w-4xl bg-[#0A0A0A] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                <div className="flex items-center gap-3">
                                    <Terminal size={20} className="text-white/40" />
                                    <h3 className="text-lg font-black text-white tracking-tight">Console Stream</h3>
                                </div>
                                <button onClick={() => fetchLogs(selectedContainer)} className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all">
                                    <RefreshCw size={16} className={logsLoading ? "animate-spin" : ""} />
                                </button>
                            </div>

                            <div className="flex-1 p-6 overflow-auto bg-black/50 font-mono text-xs">
                                {logsLoading ? (
                                    <div className="flex items-center justify-center h-40">
                                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                    </div>
                                ) : (
                                    <pre className="text-white/70 whitespace-pre-wrap leading-relaxed">{logs || 'No logs available.'}</pre>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Create Container Modal */}
            <CreateContainerModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => fetchContainers()}
            />
        </div >
    );
};

export default DockerManager;
