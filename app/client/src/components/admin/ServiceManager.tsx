import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Cpu, Zap, Play, Square, RefreshCcw, Loader2, AlertCircle,
    CheckCircle2, XCircle, Settings2, Activity, Info, ShieldCheck,
    Terminal, Gauge, Database, Globe, ServerIcon
} from 'lucide-react';

interface Service {
    name: string;
    label: string;
    status: 'running' | 'stopped' | 'loading' | 'error';
    error?: string;
}

interface ServiceManagerProps {
    userId: number;
    onClose: () => void;
    serverPulse?: any;
}

const ServiceManager: React.FC<ServiceManagerProps> = ({ userId, onClose, serverPulse }) => {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState('');

    const fetchServices = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/services', {
                headers: { 'x-user-id': userId }
            });
            setServices(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to fetch services');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchServices();
        const interval = setInterval(fetchServices, 10000); // Polling every 10s
        return () => clearInterval(interval);
    }, [fetchServices]);

    const handleServiceAction = async (serviceName: string, action: 'start' | 'stop' | 'restart') => {
        try {
            setActionLoading(`${serviceName}-${action}`);
            const res = await axios.post(`/api/services/${serviceName}/${action}`, {}, {
                headers: { 'x-user-id': userId }
            });

            // Refresh services after 2 seconds to allow OS to update status
            setTimeout(fetchServices, 2000);

            if (res.data.success) {
                // Optional: show toast
            }
        } catch (err: any) {
            alert(err.response?.data?.error || `Failed to ${action} service`);
        } finally {
            setActionLoading(null);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'running': return <CheckCircle2 className="text-emerald-500" size={18} />;
            case 'stopped': return <XCircle className="text-rose-500" size={18} />;
            case 'loading': return <Loader2 className="animate-spin text-amber-500" size={18} />;
            default: return <AlertCircle className="text-[var(--text-muted)]" size={18} />;
        }
    };

    const getServiceIcon = (name: string) => {
        if (name.includes('mysql') || name.includes('maria')) return <Database size={24} />;
        if (name.includes('nginx') || name.includes('apache')) return <Globe size={24} />;
        if (name.includes('php')) return <Cpu size={24} />;
        return <ServerIcon size={24} />;
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade">
            <div className="bg-[var(--bg-dark)] w-[90vw] lg:w-[50vw] h-[80vh] rounded-[40px] shadow-2xl border border-[var(--border)] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-8 border-b border-[var(--border)] bg-gradient-to-r from-[var(--primary)]/10 to-transparent">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-[var(--primary)]/20 p-3 rounded-2xl border border-[var(--primary)]/30">
                                <Activity size={28} className="text-[var(--primary)]" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-[var(--text-main)]">PHP & Services Manager</h2>
                                <p className="text-sm text-[var(--text-muted)] font-medium">Control and monitor system runtime environments</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/10 text-[var(--text-main)]">
                            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} onClick={fetchServices} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                    {error && (
                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500">
                            <AlertCircle size={20} />
                            <p className="font-bold">{error}</p>
                        </div>
                    )}

                    {/* Services Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {services.map((service) => (
                            <div key={service.name} className={`glass p-6 rounded-3xl border transition-all group ${service.name === 'yumna-panel' ? 'bg-indigo-500/10 border-indigo-500/30 ring-1 ring-indigo-500/20' : 'border-[var(--border)] hover:border-[var(--primary)]/30'}`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl border ${service.status === 'running' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                                            {getServiceIcon(service.name)}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-[var(--text-main)] text-lg">{service.label}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                {getStatusIcon(service.status)}
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${service.status === 'running' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {service.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-[var(--nav-hover)] px-2 py-1 rounded-lg border border-[var(--border)]">
                                        <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-tighter">{service.name}</span>
                                    </div>
                                </div>

                                {service.name === 'yumna-panel' ? (
                                    <div className="mt-4 p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <ShieldCheck className="text-indigo-400" size={16} />
                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Panel Core Protection</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                                            Panel Engine berjalan secara independen pada <span className="text-indigo-400 font-bold">Port 5000</span>.
                                            Jika Anda mematikan Nginx/Apache, gunakan port 5000 untuk tetap mengakses panel.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex gap-2 mt-6">
                                        {service.status === 'stopped' ? (
                                            <button
                                                onClick={() => handleServiceAction(service.name, 'start')}
                                                disabled={!!actionLoading}
                                                className="btn-success flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                                            >
                                                {actionLoading === `${service.name}-start` ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                                                Start
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleServiceAction(service.name, 'stop')}
                                                disabled={!!actionLoading}
                                                className="btn-danger flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                                            >
                                                {actionLoading === `${service.name}-stop` ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
                                                Stop
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleServiceAction(service.name, 'restart')}
                                            disabled={!!actionLoading}
                                            className="btn-accent flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                                        >
                                            {actionLoading === `${service.name}-restart` ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                                            Restart
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* System Summary Info */}
                    <div className="mt-8 p-6 bg-indigo-500/5 rounded-[32px] border border-indigo-500/10">
                        <div className="flex items-center gap-3 mb-4">
                            <Info size={18} className="text-indigo-400" />
                            <h4 className="text-sm font-black text-indigo-400 uppercase tracking-widest">Runtime Intelligence</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1">
                                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Load Average</p>
                                <p className="text-lg font-black text-[var(--text-main)] flex items-center gap-2">
                                    <Gauge size={14} className="text-amber-500" />
                                    {serverPulse?.cpu?.loadAvg?.map((l: number) => l.toFixed(2)).join(', ') || '0.00, 0.00, 0.00'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">System Uptime</p>
                                <p className="text-lg font-black text-[var(--text-main)] flex items-center gap-2">
                                    <Terminal size={14} className="text-cyan-500" />
                                    {serverPulse?.uptime ? `${Math.floor(serverPulse.uptime / 3600)}h ${Math.floor((serverPulse.uptime % 3600) / 60)}m` : '0h 0m'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">CPU Engine</p>
                                <p className="text-lg font-black text-emerald-500 flex items-center gap-2 truncate" title={serverPulse?.cpu?.model}>
                                    <Cpu size={14} />
                                    {serverPulse?.cpu?.model?.split(' ')[0] || 'Unknown'} ({serverPulse?.cpu?.cores || 0} Cores)
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-white/5 border-t border-[var(--border)] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">Services All Healthy</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="btn-primary px-8 py-2 rounded-xl text-sm font-bold"
                    >
                        Close Manager
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ServiceManager;
