import React, { useState } from 'react';
import { X, Wrench, RefreshCw, Trash2, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

interface MaintenanceModalProps {
    onClose: () => void;
}

const MaintenanceModal: React.FC<MaintenanceModalProps> = ({ onClose }) => {
    const [running, setRunning] = useState<string | null>(null);
    const [completed, setCompleted] = useState<Record<string, boolean>>({});

    const runTask = async (task: string, endpoint: string) => {
        setRunning(task);
        try {
            await axios.post(`/api/maintenance/${endpoint}`);
            setCompleted(prev => ({ ...prev, [task]: true }));
            setTimeout(() => setCompleted(prev => ({ ...prev, [task]: false })), 3000);
        } catch (err) {
            alert('Maintenance task failed: ' + task);
        } finally {
            setRunning(null);
        }
    };

    const tasks = [
        { id: 'rebuild', name: 'Rebuild Configs', desc: 'Sync all website and server configurations.', endpoint: 'rebuild-config', icon: RefreshCw, color: 'text-indigo-500' },
        { id: 'cache', name: 'Flush System Cache', desc: 'Clear RAM and temporary file buffers.', endpoint: 'flush-cache', icon: Trash2, color: 'text-rose-500' },
        { id: 'repair', name: 'Repair Permissions', desc: 'Fix CHMOD/CHOWN across all web roots.', endpoint: 'repair-permissions', icon: ShieldCheck, color: 'text-emerald-500' },
    ];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade">
            <div className="glass w-full max-w-2xl rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-10 border-b border-white/5 bg-gradient-to-br from-amber-500/10 to-transparent">
                    <div className="flex justify-between items-start mb-8">
                        <div className="w-20 h-20 rounded-[2rem] bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                            <Wrench className="text-white" size={40} />
                        </div>
                        <button onClick={onClose} className="p-3 rounded-2xl hover:bg-white/10 text-white/40 hover:text-white transition-all">
                            <X size={32} />
                        </button>
                    </div>
                    <h2 className="text-4xl font-black text-white tracking-tight">System Maintenance</h2>
                    <p className="text-white/50 text-lg font-medium">Keep your server running at peak performance with automated repair tools.</p>
                </div>

                <div className="p-10 grid gap-6">
                    {tasks.map((task) => (
                        <div key={task.id} className="group relative flex items-center gap-6 p-6 rounded-[2rem] bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                            <div className={`w-14 h-14 rounded-2xl bg-[var(--bg-dark)] border border-white/5 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform`}>
                                <task.icon className={task.color} size={28} />
                            </div>

                            <div className="flex-1">
                                <h3 className="text-xl font-black text-white mb-1">{task.name}</h3>
                                <p className="text-white/40 font-medium text-sm">{task.desc}</p>
                            </div>

                            <button
                                disabled={!!running}
                                onClick={() => runTask(task.id, task.endpoint)}
                                className={`px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50
                                    ${completed[task.id] ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}
                                `}
                            >
                                {running === task.id ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : completed[task.id] ? (
                                    <CheckCircle2 size={18} />
                                ) : (
                                    'Execute'
                                )}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="px-10 pb-10">
                    <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
                            <ShieldCheck className="text-amber-500" size={24} />
                        </div>
                        <div>
                            <h4 className="text-white font-black">Professional Tip</h4>
                            <p className="text-white/60 text-sm font-medium">Run "Repair Permissions" after manual file uploads via SFTP to ensure Nginx can serve your content correctly.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MaintenanceModal;
