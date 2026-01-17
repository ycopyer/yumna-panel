import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Plus, Trash2, Globe, Cpu, Loader2, Shield, RefreshCw,
    ArrowRight, Network, Server, Zap, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PortMapping {
    id: number;
    serverId: number;
    serverName: string;
    masterPort: number;
    agentPort: number;
    description: string;
    isActive: boolean;
    createdAt: string;
}

const PortForwardingManager: React.FC = () => {
    const [mappings, setMappings] = useState<PortMapping[]>([]);
    const [servers, setServers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        serverId: '',
        masterPort: '',
        agentPort: '',
        description: ''
    });

    useEffect(() => {
        fetchMappings();
        fetchServers();
    }, []);

    const fetchMappings = async () => {
        try {
            const res = await axios.get('/api/tunnel-mappings');
            setMappings(res.data);
        } catch (err: any) {
            console.error('Failed to fetch mappings:', err.response?.data || err.message);
            // Don't alert here to avoid spamming on load
        } finally {
            setLoading(false);
        }
    };

    const fetchServers = async () => {
        try {
            const res = await axios.get('/api/servers');
            const serverList = res.data.servers || (Array.isArray(res.data) ? res.data : []);
            // Show all servers but we'll highlight tunnel ones
            setServers(serverList);
        } catch (err: any) {
            console.error('Failed to fetch servers:', err.response?.data || err.message);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading('adding');
        try {
            await axios.post('/api/tunnel-mappings', formData);
            setFormData({ serverId: '', masterPort: '', agentPort: '', description: '' });
            setShowAdd(false);
            fetchMappings();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to create mapping');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to remove this port mapping?')) return;
        setActionLoading(`deleting-${id}`);
        try {
            await axios.delete(`/api/tunnel-mappings/${id}`);
            fetchMappings();
        } catch (err) {
            alert('Deletion failed');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-10 animate-fade-in px-4 py-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                            <Network size={24} className="text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tight">PORT FORWARDING</h2>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] font-mono">REVERSE TUNNEL RELAY MATRIX</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => setShowAdd(true)}
                    className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-2xl shadow-indigo-600/20"
                >
                    <Plus size={18} /> Initialize Port Relay
                </button>
            </header>

            <AnimatePresence>
                {showAdd && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white/[0.02] border border-white/5 rounded-[40px] p-10 backdrop-blur-3xl shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-10 opacity-[0.02] rotate-12 pointer-events-none">
                            <Zap size={200} />
                        </div>

                        <div className="flex items-center justify-between mb-10">
                            <div className="space-y-1">
                                <h3 className="text-xl font-black text-white tracking-tight uppercase">Manual Relay Configuration</h3>
                                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Assigning Master Layer to Agent Node</p>
                            </div>
                            <button onClick={() => setShowAdd(false)} className="p-3 rounded-2xl bg-white/5 text-white/40 hover:text-white transition-all">
                                <RefreshCw size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Server size={12} /> Target Node (Tunnel Only)
                                </label>
                                <select
                                    required
                                    value={formData.serverId}
                                    onChange={e => setFormData({ ...formData, serverId: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:border-indigo-500/50 appearance-none transition-all"
                                >
                                    <option value="" disabled style={{ background: '#0a0a0a' }}>Select Server</option>
                                    {servers.map(s => (
                                        <option key={s.id} value={s.id} style={{ background: '#0a0a0a' }}>
                                            {s.name} ({s.connection_type === 'tunnel' ? 'TUNNEL' : 'DIRECT/IP'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Globe size={12} /> Master Port
                                    </label>
                                    <input
                                        required
                                        type="number"
                                        placeholder="e.g. 13306"
                                        value={formData.masterPort}
                                        onChange={e => setFormData({ ...formData, masterPort: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all font-mono"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Cpu size={12} /> Agent Port
                                    </label>
                                    <input
                                        required
                                        type="number"
                                        placeholder="e.g. 3306"
                                        value={formData.agentPort}
                                        onChange={e => setFormData({ ...formData, agentPort: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all font-mono"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-4">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Shield size={12} /> Resource Identifier (Description)
                                </label>
                                <input
                                    placeholder="e.g. Remote MariaDB Access for Development"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all"
                                />
                            </div>

                            <div className="md:col-span-2 pt-4">
                                <button
                                    type="submit"
                                    disabled={!!actionLoading}
                                    className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-3 active:scale-95"
                                >
                                    {actionLoading === 'adding' ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                                    Establish Relay Connection
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="space-y-6">
                <div className="flex items-center justify-between px-4">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Active Tunnel Relay Matrix</p>
                    <button onClick={fetchMappings} className="text-indigo-400/40 hover:text-indigo-400 transition-all">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center bg-white/[0.01] border border-white/5 rounded-[40px] border-dashed">
                        <Loader2 className="animate-spin text-indigo-500/40" size={40} />
                    </div>
                ) : mappings.length === 0 ? (
                    <div className="h-80 flex flex-col items-center justify-center bg-white/[0.01] border border-white/5 rounded-[48px] border-dashed text-center p-12">
                        <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6">
                            <Network size={40} className="text-white/10" />
                        </div>
                        <h4 className="text-xl font-black text-white/40 tracking-tight uppercase">No Ports Currently Relayed</h4>
                        <p className="text-[10px] font-bold text-white/10 uppercase tracking-widest mt-2 max-w-xs">Initialize a new port relay to bridge internal services via the reverse tunnel.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {mappings.map(map => (
                            <motion.div
                                key={map.id}
                                layout
                                className="bg-white/[0.02] border border-white/5 rounded-[32px] p-8 group hover:bg-white/[0.04] transition-all relative overflow-hidden"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                                    <div className="flex items-center gap-8">
                                        <div className="w-16 h-16 rounded-[24px] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-600/5">
                                            <Zap size={28} />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <h4 className="text-lg font-black text-white tracking-tight">{map.description || 'Generic Port Relay'}</h4>
                                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[8px] font-black uppercase tracking-widest">Active</span>
                                            </div>
                                            <div className="flex items-center gap-6 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                                <span className="flex items-center gap-2"><Server size={12} className="text-indigo-400/40" /> {map.serverName}</span>
                                                <span className="flex items-center gap-2 text-indigo-400 font-black">
                                                    MASTER:{map.masterPort}
                                                    <ArrowRight size={12} />
                                                    AGENT:{map.agentPort}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 opacity-0 group-hover:opacity-100 transition-all">
                                            <code className="text-[10px] font-mono text-indigo-300">
                                                ssh -p {map.masterPort} root@IP_MASTER
                                            </code>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(map.id)}
                                            disabled={!!actionLoading}
                                            className="p-4 rounded-2xl bg-rose-500/5 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 transition-all active:scale-90"
                                        >
                                            {actionLoading === `deleting-${map.id}` ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="absolute top-0 right-0 p-8 opacity-[0.01] pointer-events-none uppercase font-black text-3xl tracking-tighter select-none">
                                    PORT_{map.masterPort}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-amber-500/5 border border-amber-500/10 rounded-[40px] p-10 flex items-start gap-8">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 flex-shrink-0">
                    <AlertTriangle size={24} />
                </div>
                <div className="space-y-2">
                    <h5 className="text-sm font-black text-amber-500 uppercase tracking-widest">Network Architecture Protocol</h5>
                    <p className="text-[11px] font-bold text-amber-500/40 uppercase tracking-widest leading-relaxed">
                        Establishing a port relay exposes the internal services of the Agent node through the Master Panel's primary IP address.
                        Ensure that the Master Port (e.g., 10022) is open in your cloud provider's firewall (AWS, Google, DigitalOcean) and the OS firewall (UFW/Firewalld).
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PortForwardingManager;
