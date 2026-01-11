import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Server, Cpu, HardDrive, Activity, Power, RefreshCw, Plus, Shield, Search, Loader2 } from 'lucide-react';

interface VM {
    vmid: number;
    name: string;
    status: 'running' | 'stopped';
    cpus: number;
    maxmem: number;
    maxdisk: number;
    uptime: number;
}

const CloudManager: React.FC<{ userId: number }> = ({ userId }) => {
    const [vms, setVms] = useState<VM[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchVMs();
    }, []);

    const fetchVMs = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/cloud/vms');
            setVms(res.data);
        } catch (err) {
            console.error('Failed to fetch VMs');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (vmid: number, action: string) => {
        try {
            await axios.post(`/api/cloud/vms/${vmid}/status`, { action });
            fetchVMs();
        } catch (err) {
            alert('Action failed');
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][i];
    };

    const filteredVMs = vms.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="space-y-8 animate-fade">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h3 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <div className="p-3 bg-indigo-500/20 rounded-2xl">
                            <Server className="text-indigo-400" size={24} />
                        </div>
                        Cloud Virtualization
                    </h3>
                    <p className="text-[11px] font-bold text-white/30 uppercase tracking-[0.2em] mt-2">Enterprise VPS & Container Management</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/10 group focus-within:border-indigo-500/50 transition-all">
                        <Search size={18} className="text-white/20 group-focus-within:text-indigo-400" />
                        <input
                            type="text"
                            placeholder="Search instances..."
                            className="bg-transparent border-none outline-none text-xs font-bold text-white placeholder:text-white/20 w-48"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="flex items-center gap-2 px-6 py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20">
                        <Plus size={16} /> Deploy Instance
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-6">
                    <Loader2 className="animate-spin text-indigo-400" size={40} />
                    <p className="text-xs font-black text-white/20 uppercase tracking-[0.3em]">Querying Hypervisor...</p>
                </div>
            ) : filteredVMs.length === 0 ? (
                <div className="py-32 flex flex-col items-center border border-dashed border-white/10 rounded-[3rem] bg-white/[0.01]">
                    <Activity size={48} className="text-white/10 mb-4" />
                    <p className="text-white/40 font-bold uppercase tracking-widest text-xs">No virtual instances found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {filteredVMs.map(vm => (
                        <div key={vm.vmid} className="group bg-black/40 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] hover:border-indigo-500/30 transition-all">
                            <div className="flex items-start justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className={`p-4 rounded-2xl border ${vm.status === 'running' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                        <Power size={20} className={vm.status === 'running' ? 'animate-pulse' : ''} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h4 className="text-xl font-black text-white tracking-tight">{vm.name}</h4>
                                            <span className="text-[9px] font-black text-white/20 px-2 py-0.5 border border-white/10 rounded-lg">ID: {vm.vmid}</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">Status: {vm.status}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleAction(vm.vmid, vm.status === 'running' ? 'stop' : 'start')} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 text-white/40 hover:text-white">
                                        <Power size={18} />
                                    </button>
                                    <button onClick={() => handleAction(vm.vmid, 'reboot')} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 text-white/40 hover:text-white">
                                        <RefreshCw size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 p-6 bg-white/[0.02] rounded-3xl border border-white/5">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">CPU Cores</p>
                                    <div className="flex items-center gap-2">
                                        <Cpu size={14} className="text-indigo-400" />
                                        <span className="text-sm font-bold text-white">{vm.cpus} vCPU</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Memory</p>
                                    <div className="flex items-center gap-2">
                                        <HardDrive size={14} className="text-purple-400" />
                                        <span className="text-sm font-bold text-white">{formatBytes(vm.maxmem)}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Storage</p>
                                    <div className="flex items-center gap-2">
                                        <HardDrive size={14} className="text-amber-400" />
                                        <span className="text-sm font-bold text-white">{formatBytes(vm.maxdisk)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CloudManager;
