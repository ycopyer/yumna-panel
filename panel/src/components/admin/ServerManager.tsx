import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Server, Plus, Trash2, Edit2, Shield, Activity, X, Save, Loader2, Globe, Cpu, HardDrive, RefreshCw, Zap, Clock, Wifi, ChevronDown, ChevronUp, Link2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NodeUsageChart from './NodeUsageChart';
import TunnelTerminal from './TunnelTerminal';

interface ServerNode {
    id: number;
    name: string;
    hostname: string;
    ip: string;
    ssh_user: string;
    ssh_port: number;
    status: 'active' | 'offline' | 'maintenance' | 'online' | 'connection_error';
    connection_type: 'direct' | 'tunnel';
    agent_id?: string;
    is_local: boolean;
    last_seen: string | null;
    cpu_usage: number;
    ram_usage: number;
    disk_usage: number;
    uptime: number;
    createdAt: string;
    is_syncing?: boolean;
}

interface ServerManagerProps {
    userId: number;
    onClose: () => void;
}

const ResourceGauge: React.FC<{ value: number; label: string; icon: React.ReactNode; color: string }> = ({ value, label, icon, color }) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(value, 100) / 100) * circumference;

    let dynamicColor = color;
    if (value > 90) dynamicColor = '#ef4444'; // Red
    else if (value > 75) dynamicColor = '#f59e0b'; // Amber

    return (
        <div className="flex flex-col items-center justify-center p-4 bg-white/[0.03] rounded-2xl border border-white/5 relative group overflow-hidden">
            <div className={`absolute inset-0 bg-${color}-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500`} style={{ backgroundColor: `${dynamicColor}10` }} />

            <div className="relative w-24 h-24 flex items-center justify-center mb-2">
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="48"
                        cy="48"
                        r={radius}
                        fill="none"
                        className="stroke-white/10"
                        strokeWidth="8"
                    />
                    <circle
                        cx="48"
                        cy="48"
                        r={radius}
                        fill="none"
                        stroke={dynamicColor}
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    <div className="text-white/40 mb-0.5 scale-75 transform">{icon}</div>
                    <span className="text-sm font-black tracking-tighter tabular-nums">{Math.round(value)}%</span>
                </div>
            </div>

            <div className="flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{label}</span>
            </div>
        </div>
    );
};

const ServerManager: React.FC<ServerManagerProps> = ({ userId, onClose }) => {
    const [servers, setServers] = useState<ServerNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingServer, setEditingServer] = useState<ServerNode | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [expandedNodes, setExpandedNodes] = useState<number[]>([]);

    // Form states
    const [name, setName] = useState('');
    const [hostname, setHostname] = useState('');
    const [ip, setIp] = useState('');
    const [sshUser, setSshUser] = useState('root');
    const [sshPass, setSshPass] = useState('');
    const [sshPort, setSshPort] = useState(22);
    const [status, setStatus] = useState<'active' | 'offline' | 'maintenance' | 'online' | 'connection_error'>('active');

    const [deployingIds, setDeployingIds] = useState<number[]>([]);

    // Deploy Auth/DB states
    const [showDeployModal, setShowDeployModal] = useState<number | null>(null);
    const [showTerminal, setShowTerminal] = useState<number | null>(null); // New Terminal State
    const [deployDbHost, setDeployDbHost] = useState('localhost');
    const [deployDbUser, setDeployDbUser] = useState('yumna_agent');
    const [deployDbPass, setDeployDbPass] = useState('yumna_password');

    const handleDeploy = async (id: number) => {
        setDeployingIds(prev => [...prev, id]);
        setShowDeployModal(null);
        try {
            const dbConfig = {
                db_host: deployDbHost,
                db_user: deployDbUser,
                db_pass: deployDbPass
            };
            await axios.post(`/api/servers/${id}/deploy-agent`, { dbConfig }, { headers: { 'x-user-id': userId } });
            alert('Deployment started in background. Please wait a few minutes.');

            const poll = setInterval(async () => {
                const res = await axios.get(`/api/servers/${id}/deploy-status`, { headers: { 'x-user-id': userId } });
                if (res.data.status === 'success' || res.data.status === 'failed') {
                    clearInterval(poll);
                    setDeployingIds(prev => prev.filter(p => p !== id));
                    fetchServers();
                }
            }, 5000);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Deployment failed to start');
            setDeployingIds(prev => prev.filter(p => p !== id));
        }
    };

    useEffect(() => {
        fetchServers();
        const interval = setInterval(fetchServers, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchServers = async () => {
        if (servers.length === 0) setLoading(true);
        try {
            const res = await axios.get('/api/servers', { headers: { 'x-user-id': userId } });
            setServers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async (id: number) => {
        setServers(prev => prev.map(s => s.id === id ? { ...s, is_syncing: true } : s));
        try {
            await axios.post(`/api/servers/${id}/sync`, {}, { headers: { 'x-user-id': userId } });
            setTimeout(fetchServers, 1000);
        } catch (err) {
            console.error('Sync failed', err);
        } finally {
            setTimeout(() => setServers(prev => prev.map(s => s.id === id ? { ...s, is_syncing: false } : s)), 1000);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const data = { name, hostname, ip, ssh_user: sshUser, ssh_password: sshPass || undefined, ssh_port: sshPort, status };
            if (editingServer) {
                await axios.put(`/api/servers/${editingServer.id}`, data, { headers: { 'x-user-id': userId } });
            } else {
                await axios.post('/api/servers', data, { headers: { 'x-user-id': userId } });
            }
            fetchServers();
            resetForm();
        } catch (err) {
            alert('Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setName('');
        setHostname('');
        setIp('');
        setSshUser('root');
        setSshPass('');
        setSshPort(22);
        setStatus('active');
        setIsAdding(false);
        setEditingServer(null);
    };

    const startEdit = (server: ServerNode) => {
        setEditingServer(server);
        setName(server.name || '');
        setHostname(server.hostname || '');
        setIp(server.ip || '');
        setSshUser(server.ssh_user || 'root');
        setSshPort(server.ssh_port || 22);
        setStatus(server.status || 'active');
        setSshPass('');
        setIsAdding(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to remove this server node?')) return;
        try {
            await axios.delete(`/api/servers/${id}`, { headers: { 'x-user-id': userId } });
            fetchServers();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Delete failed');
        }
    };

    const formatUptime = (seconds: number) => {
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor(seconds % (3600 * 24) / 3600);
        const m = Math.floor(seconds % 3600 / 60);
        return `${d}d ${h}h ${m}m`;
    };

    return (
        <div className="space-y-8 animate-fade">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-xl shadow-indigo-500/20">
                            <Server size={24} />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-white tracking-tight">Node Orchestration</h3>
                            <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Infrastructure Grid
                            </p>
                        </div>
                    </div>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="group relative flex items-center gap-3 px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all overflow-hidden border border-white/10"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Plus size={16} className="text-indigo-400 group-hover:text-white transition-colors" />
                        <span>Provision Node</span>
                    </button>
                )}
                {isAdding && (
                    <button
                        onClick={resetForm}
                        className="flex items-center gap-3 px-6 py-4 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all"
                    >
                        <X size={16} /> Cancel
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="wait">
                    {isAdding ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }} image-rendering
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            key="form"
                        >
                            <form onSubmit={handleSave} className="space-y-8 max-w-5xl mx-auto">
                                <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
                                    <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

                                    <div className="relative z-10">
                                        <h3 className="text-2xl font-black text-white mb-10 flex items-center gap-4 border-b border-white/5 pb-6">
                                            {editingServer ? <Edit2 className="text-indigo-400" /> : <Plus className="text-indigo-400" />}
                                            {editingServer ? `Configuration: ${editingServer.name}` : 'New Node Provisioning'}
                                        </h3>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                            <div className="space-y-8">
                                                <div className="group">
                                                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1 mb-3 block font-mono">Display Name</label>
                                                    <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-all font-bold text-lg" placeholder="e.g. Frankfurt-Node-01" required />
                                                </div>
                                                <div className="group">
                                                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1 mb-3 block font-mono">Hostname / Domain</label>
                                                    <input value={hostname} onChange={e => setHostname(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-all font-bold text-lg text-mono" placeholder="node1.yumnapanel.com" required />
                                                </div>
                                                <div className="group">
                                                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1 mb-3 block font-mono">IP Address</label>
                                                    <input value={ip} onChange={e => setIp(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-all font-bold text-lg text-mono" placeholder="1.2.3.4" required />
                                                </div>
                                            </div>

                                            <div className="space-y-8">
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1 mb-3 block font-mono">SSH User</label>
                                                        <input value={sshUser} onChange={e => setSshUser(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-all font-bold text-lg" placeholder="root" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1 mb-3 block font-mono">SSH Port</label>
                                                        <input type="number" value={sshPort} onChange={e => setSshPort(Number(e.target.value))} className="w-full bg-black/20 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-all font-bold text-lg" placeholder="22" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1 mb-3 block font-mono">SSH Password {editingServer && '(Empty to retain)'}</label>
                                                    <input type="password" value={sshPass} onChange={e => setSshPass(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-all font-bold text-lg" placeholder="••••••••" required={!editingServer} />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1 mb-3 block font-mono">Node Status</label>
                                                    <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full bg-black/20 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-all font-bold text-lg appearance-none">
                                                        <option value="active" className="bg-gray-900">Active</option>
                                                        <option value="offline" className="bg-gray-900">Offline</option>
                                                        <option value="maintenance" className="bg-gray-900">Maintenance</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button type="submit" disabled={submitting} className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-2xl py-6 text-xs font-black uppercase tracking-widest shadow-2xl shadow-indigo-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-3 transform active:scale-95">
                                        {submitting ? <Loader2 className="animate-spin" /> : <><Save size={18} /> {editingServer ? 'Update Configuration' : 'Initialize Provisioning'}</>}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            key="list"
                            className="space-y-6"
                        >
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-40 gap-8">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
                                        <RefreshCw className="text-indigo-400 animate-spin relative z-10" size={64} />
                                    </div>
                                    <p className="text-xs font-black text-white/30 uppercase tracking-[0.3em] animate-pulse">Scanning Network Grid...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                    <AnimatePresence>
                                        {servers.map((server, idx) => (
                                            <motion.div
                                                key={server.id}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: idx * 0.1 }}
                                                className="bg-black/30 backdrop-blur-md border border-white/5 p-8 rounded-[2.5rem] hover:border-indigo-500/30 transition-all group relative overflow-hidden flex flex-col h-full shadow-2xl"
                                            >
                                                <div className={`absolute top-0 right-0 w-64 h-64 ${server.status === 'active' ? 'bg-emerald-500/10' : server.status === 'offline' ? 'bg-red-500/10' : 'bg-amber-500/10'} rounded-full blur-[80px] pointer-events-none transition-colors duration-1000`} />

                                                <div className="relative z-10">
                                                    <div className="flex items-start justify-between mb-10">
                                                        <div className="flex items-center gap-6">
                                                            <div className={`w-16 h-16 flex items-center justify-center ${server.is_local ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'} rounded-2xl border shadow-inner`}>
                                                                {server.is_local ? <Cpu size={28} /> : <Server size={28} />}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-3">
                                                                    <h4 className="font-black text-white text-2xl tracking-tight">{server.name}</h4>
                                                                    {server.is_local && <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg uppercase border border-amber-500/20 tracking-wider">Local Master</span>}
                                                                </div>
                                                                <div className="flex items-center gap-4 mt-2">
                                                                    <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${server.connection_type === 'tunnel' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/5 border-white/5'}`}>
                                                                        {server.connection_type === 'tunnel' ? (
                                                                            <Link2 size={10} className="text-emerald-400" />
                                                                        ) : (
                                                                            <Globe size={10} className="text-indigo-400" />
                                                                        )}
                                                                        <p className={`text-[10px] font-mono font-bold ${server.connection_type === 'tunnel' ? 'text-emerald-400' : 'text-white/50'}`}>
                                                                            {server.connection_type === 'tunnel' ? 'TUNNEL' : server.ip}
                                                                        </p>
                                                                    </div>
                                                                    <div className="w-px h-3 bg-white/10" />
                                                                    <p className="text-[10px] font-mono font-bold text-white/30">{server.hostname}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className={`flex flex-col items-end gap-1 px-4 py-2 rounded-xl backdrop-blur-sm border ${server.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                                            server.status === 'online' ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' :
                                                                server.status === 'offline' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                                                    'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                                            }`}>
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${server.status === 'active' ? 'bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]' :
                                                                    server.status === 'online' ? 'bg-sky-400 animate-bounce' :
                                                                        server.status === 'offline' ? 'bg-red-400 shadow-[0_0_15px_rgba(239,68,68,1)]' :
                                                                            'bg-amber-400 animate-pulse'
                                                                    }`} />
                                                                <span className="text-[10px] font-black uppercase tracking-widest">
                                                                    {server.status === 'active' ? 'Agent Healthy' :
                                                                        server.status === 'online' ? 'OS Online (No Agent)' :
                                                                            server.status === 'offline' ? 'Server Down' :
                                                                                server.status}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {(server.is_local || (server.cpu_usage > 0 || server.ram_usage > 0)) && (
                                                        <div className="grid grid-cols-3 gap-6 mb-8">
                                                            <ResourceGauge
                                                                value={server.cpu_usage || 0}
                                                                label="CPU Load"
                                                                icon={<Zap size={20} className="text-indigo-400" />}
                                                                color="#6366f1"
                                                            />
                                                            <ResourceGauge
                                                                value={server.ram_usage || 0}
                                                                label="RAM Usage"
                                                                icon={<Activity size={20} className="text-purple-400" />}
                                                                color="#a855f7"
                                                            />
                                                            <ResourceGauge
                                                                value={server.disk_usage || 0}
                                                                label="Disk Space"
                                                                icon={<HardDrive size={20} className="text-emerald-400" />}
                                                                color="#10b981"
                                                            />
                                                        </div>
                                                    )}

                                                    <AnimatePresence>
                                                        {expandedNodes.includes(server.id) && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="overflow-hidden mb-8"
                                                            >
                                                                <NodeUsageChart serverId={server.id} userId={userId} />
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>

                                                    <div className="flex justify-center mb-6 -mt-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setExpandedNodes(prev =>
                                                                    prev.includes(server.id)
                                                                        ? prev.filter(id => id !== server.id)
                                                                        : [...prev, server.id]
                                                                );
                                                            }}
                                                            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all border border-white/5"
                                                        >
                                                            {expandedNodes.includes(server.id) ? (
                                                                <>Hide History <ChevronUp size={12} /></>
                                                            ) : (
                                                                <>View Usage History <ChevronDown size={12} /></>
                                                            )}
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center justify-between p-5 bg-white/[0.03] rounded-2xl border border-white/5 mt-auto">
                                                        <div className="flex gap-8">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest flex items-center gap-1.5 ">
                                                                    <Clock size={10} /> Uptime
                                                                </span>
                                                                <span className="text-xs font-bold text-white font-mono tracking-wide">
                                                                    {server.uptime ? formatUptime(server.uptime) : 'N/A'}
                                                                </span>
                                                            </div>
                                                            <div className="w-px h-8 bg-white/5" />
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest flex items-center gap-1.5">
                                                                    <Wifi size={10} /> Sync
                                                                </span>
                                                                <span className="text-xs font-bold text-white font-mono tracking-wide">
                                                                    {server.last_seen ? new Date(server.last_seen).toLocaleTimeString() : 'N/A'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-2">
                                                            {server.connection_type === 'tunnel' && (
                                                                <button
                                                                    onClick={() => setShowTerminal(server.id)}
                                                                    className="p-3 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-400 rounded-xl transition-all border border-emerald-500/20 hover:scale-110 active:scale-95 hover:shadow-lg hover:shadow-emerald-500/20 flex items-center gap-2"
                                                                    title="Open Remote Tunnel Shell"
                                                                >
                                                                    <div className="relative">
                                                                        <Server size={16} />
                                                                        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                                                    </div>
                                                                    <span className="text-[9px] font-black uppercase hidden 2xl:block">Shell</span>
                                                                </button>
                                                            )}
                                                            {!server.is_local && (
                                                                <button
                                                                    onClick={() => setShowDeployModal(server.id)}
                                                                    disabled={deployingIds.includes(server.id)}
                                                                    className={`p-3 bg-indigo-500/10 hover:bg-indigo-500 hover:text-white text-indigo-400 rounded-xl transition-all border border-indigo-500/20 hover:scale-110 active:scale-95 hover:shadow-lg hover:shadow-indigo-500/20 flex items-center gap-2 ${deployingIds.includes(server.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                    title="Re-install/Deploy Agent via SSH"
                                                                >
                                                                    {deployingIds.includes(server.id) ? (
                                                                        <Loader2 size={16} className="animate-spin" />
                                                                    ) : (
                                                                        <Zap size={16} />
                                                                    )}
                                                                    <span className="text-[9px] font-black uppercase">Deploy Agent</span>
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleSync(server.id)}
                                                                className="p-3 bg-white/5 hover:bg-blue-500 hover:text-white text-blue-400/60 rounded-xl transition-all border border-white/5 hover:border-blue-500 hover:scale-110 active:scale-95 hover:shadow-lg hover:shadow-blue-500/20"
                                                                title="Force Sync"
                                                            >
                                                                <RefreshCw size={16} className={server.is_syncing ? 'animate-spin' : ''} />
                                                            </button>
                                                            <button
                                                                onClick={() => startEdit(server)}
                                                                className="p-3 bg-white/5 hover:bg-indigo-500 hover:text-white text-white/40 rounded-xl transition-all border border-white/5 hover:scale-110 active:scale-95 hover:shadow-lg hover:shadow-indigo-500/20"
                                                                title="Edit Configuration"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            {!server.is_local && (
                                                                <button
                                                                    onClick={() => handleDelete(server.id)}
                                                                    className="p-3 bg-red-500/5 hover:bg-red-500 hover:text-white text-red-500/60 rounded-xl transition-all border border-red-500/10 hover:border-red-500 hover:scale-110 active:scale-95 hover:shadow-lg hover:shadow-red-500/20"
                                                                    title="Decommission Node"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}

                            {!loading && servers.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-32 bg-white/[0.01] rounded-[3rem] border border-dashed border-white/5 text-center">
                                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                                        <Server size={40} className="text-white/20" />
                                    </div>
                                    <h4 className="text-2xl font-black text-white mb-2 tracking-tight">Network Grid Empty</h4>
                                    <p className="text-sm text-white/40 max-w-md mx-auto leading-relaxed">
                                        Your orchestration layer is currently inactive. Connect your first remote server node to verify topology.
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <AnimatePresence>
                {showTerminal && (
                    <TunnelTerminal
                        serverId={showTerminal}
                        userId={userId}
                        onClose={() => setShowTerminal(null)}
                    />
                )}
                {showDeployModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowDeployModal(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-lg bg-gray-950 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
                        >
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

                            <h3 className="text-2xl font-black text-white mb-2 flex items-center gap-3">
                                <Zap className="text-indigo-400" size={24} />
                                Deploy Agent Configuration
                            </h3>
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-8 border-b border-white/5 pb-6">
                                Set credentials for the remote agent database
                            </p>

                            <div className="space-y-6 mb-10">
                                <div>
                                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1 mb-3 block">Agent Database Host</label>
                                    <input
                                        value={deployDbHost}
                                        onChange={e => setDeployDbHost(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-indigo-500/50"
                                        placeholder="localhost"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1 mb-3 block">Agent Database User</label>
                                    <input
                                        value={deployDbUser}
                                        onChange={e => setDeployDbUser(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-indigo-500/50"
                                        placeholder="yumna_agent"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1 mb-3 block">Agent Database Password</label>
                                    <input
                                        type="password"
                                        value={deployDbPass}
                                        onChange={e => setDeployDbPass(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-indigo-500/50"
                                        placeholder="yumna_password"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowDeployModal(null)}
                                    className="flex-1 px-6 py-4 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDeploy(showDeployModal)}
                                    className="flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl py-4 text-[11px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all transform active:scale-95"
                                >
                                    Start Deployment
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ServerManager;
