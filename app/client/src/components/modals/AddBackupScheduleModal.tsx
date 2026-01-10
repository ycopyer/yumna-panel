import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Database, Archive, Globe, Server, CheckCircle2, Loader2, Info } from 'lucide-react';
import axios from 'axios';

interface AddBackupScheduleModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const AddBackupScheduleModal: React.FC<AddBackupScheduleModalProps> = ({ onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [storageOptions, setStorageOptions] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        type: 'daily',
        target: 'full',
        storageId: '',
        keepBackups: 7
    });

    useEffect(() => {
        fetchStorage();
    }, []);

    const fetchStorage = async () => {
        try {
            const res = await axios.get('/api/backups/storage');
            setStorageOptions(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('/api/backups/schedules', formData);
            onSuccess();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to create schedule');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-fade" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-[#0f172a] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-zoom">
                {/* Header */}
                <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                            <Calendar size={24} className="text-emerald-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">New Backup Schedule</h2>
                            <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Automate your redundancy</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl transition-all border border-white/5">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Schedule Name</label>
                            <input
                                required
                                type="text"
                                placeholder="e.g. Daily Full Backup"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold text-sm focus:border-emerald-500 outline-none transition-all placeholder:text-white/10"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Frequency</label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold text-sm focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value="daily" className="bg-[#0f172a]">Daily</option>
                                    <option value="weekly" className="bg-[#0f172a]">Weekly</option>
                                    <option value="monthly" className="bg-[#0f172a]">Monthly</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Backup Target</label>
                                <select
                                    value={formData.target}
                                    onChange={e => setFormData({ ...formData, target: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold text-sm focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value="full" className="bg-[#0f172a]">Full Backup</option>
                                    <option value="files" className="bg-[#0f172a]">Only Files</option>
                                    <option value="database" className="bg-[#0f172a]">Only Databases</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Remote Storage (Optional)</label>
                            <select
                                value={formData.storageId}
                                onChange={e => setFormData({ ...formData, storageId: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold text-sm focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="" className="bg-[#0f172a]">Local Server (Default)</option>
                                {storageOptions.map(st => (
                                    <option key={st.id} value={st.id} className="bg-[#0f172a]">{st.name} ({st.provider})</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Retention (Keep Last X)</label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={formData.keepBackups}
                                onChange={e => setFormData({ ...formData, keepBackups: parseInt(e.target.value) })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold text-sm focus:border-emerald-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-start gap-3">
                        <Info size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold text-emerald-500/70 leading-relaxed uppercase tracking-wider">
                            Schedules are processed automatically by the system background worker.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 bg-emerald-500 hover:brightness-110 disabled:opacity-50 text-white text-sm font-black uppercase tracking-widest rounded-3xl transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 active:scale-95 group"
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                        Save Schedule
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddBackupScheduleModal;
