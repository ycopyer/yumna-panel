import React, { useState, useEffect } from 'react';
import {
    X, Globe, Database, User, Lock, Mail, Folder, Rocket,
    Loader2, ChevronRight, ChevronLeft, CheckCircle2, AlertCircle,
    Info, Layout, ShieldCheck
} from 'lucide-react';
import axios from 'axios';

interface AppInstallerModalProps {
    template: {
        id: number;
        name: string;
        slug: string;
    };
    onClose: () => void;
    onSuccess: () => void;
}

interface Website {
    id: number;
    domain: string;
}

const AppInstallerModal: React.FC<AppInstallerModalProps> = ({ template, onClose, onSuccess }) => {
    const [step, setStep] = useState(1);
    const [websites, setWebsites] = useState<Website[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingWebsites, setFetchingWebsites] = useState(true);

    const [formData, setFormData] = useState({
        websiteId: '',
        installDir: '',
        dbName: `${template.slug}_${Math.random().toString(36).substring(7)}`,
        dbUser: `user_${Math.random().toString(36).substring(7)}`,
        dbPass: Math.random().toString(36).substring(2, 12) + '!',
        adminUser: 'admin',
        adminPass: '',
        adminEmail: ''
    });

    useEffect(() => {
        fetchWebsites();
    }, []);

    const fetchWebsites = async () => {
        try {
            const res = await axios.get('/api/websites');
            setWebsites(res.data);
            if (res.data.length > 0) {
                setFormData(prev => ({ ...prev, websiteId: res.data[0].id.toString() }));
            }
        } catch (error) {
            console.error('Failed to fetch websites');
        } finally {
            setFetchingWebsites(false);
        }
    };

    const handleInstall = async () => {
        setLoading(true);
        try {
            await axios.post('/api/apps/install', {
                websiteId: parseInt(formData.websiteId),
                templateId: template.id,
                options: formData
            });
            onSuccess();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Installation failed');
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-2xl animate-fade" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-[#0a0f1d] rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden animate-zoom flex flex-col max-h-[90vh]">

                {/* Header Section */}
                <div className="px-10 py-8 border-b border-white/5 bg-gradient-to-r from-white/[0.02] to-transparent flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-inner">
                            <Rocket size={28} className="text-indigo-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Deploying {template.name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-indigo-500' : 'bg-white/10'}`} />
                                <span className={`w-8 h-1 rounded-full ${step >= 2 ? 'bg-indigo-500' : 'bg-white/10'}`} />
                                <span className={`w-8 h-1 rounded-full ${step >= 3 ? 'bg-indigo-500' : 'bg-white/10'}`} />
                                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-2">Step {step} of 3</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-4 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl transition-all border border-white/5">
                        <X size={20} />
                    </button>
                </div>

                {/* Content Section */}
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">

                    {step === 1 && (
                        <div className="space-y-8 animate-fade-in-right">
                            <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-3xl flex items-start gap-4">
                                <Info size={20} className="text-indigo-500 mt-1" />
                                <p className="text-xs text-indigo-400 font-bold leading-relaxed uppercase tracking-wider">
                                    Choose the destination for your application. If you want to install it in a subfolder (e.g. yourdomain.com/blog), specify the directory name.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-4 flex items-center gap-2">
                                        <Globe size={12} /> Target Website
                                    </label>
                                    <select
                                        value={formData.websiteId}
                                        onChange={(e) => setFormData({ ...formData, websiteId: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm font-bold focus:outline-none focus:border-indigo-500/50 appearance-none"
                                    >
                                        {fetchingWebsites ? <option>Loading websites...</option> :
                                            websites.length === 0 ? <option>No websites found</option> :
                                                websites.map(w => <option key={w.id} value={w.id}>{w.domain}</option>)
                                        }
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-4 flex items-center gap-2">
                                        <Folder size={12} /> Installation Directory (Optional)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 font-bold text-sm">/</span>
                                        <input
                                            type="text"
                                            placeholder="Leave empty for root"
                                            value={formData.installDir}
                                            onChange={(e) => setFormData({ ...formData, installDir: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-6 py-4 text-white text-sm font-bold placeholder:text-white/10 focus:outline-none focus:border-indigo-500/50"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8 animate-fade-in-right">
                            <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl flex items-start gap-4">
                                <Database size={20} className="text-emerald-500 mt-1" />
                                <p className="text-xs text-emerald-400 font-bold leading-relaxed uppercase tracking-wider">
                                    We've pre-generated secure database credentials for you.
                                    You can customize them if needed, but the auto-generated ones are highly recommended.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-4 flex items-center gap-2">
                                        <Database size={12} /> Database Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.dbName}
                                        onChange={(e) => setFormData({ ...formData, dbName: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm font-bold focus:outline-none focus:border-indigo-500/50"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-4 flex items-center gap-2">
                                        <User size={12} /> DB Username
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.dbUser}
                                        onChange={(e) => setFormData({ ...formData, dbUser: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm font-bold focus:outline-none focus:border-indigo-500/50"
                                    />
                                </div>

                                <div className="space-y-3 md:col-span-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-4 flex items-center gap-2">
                                        <Lock size={12} /> DB Password
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.dbPass}
                                        onChange={(e) => setFormData({ ...formData, dbPass: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm font-bold focus:outline-none focus:border-indigo-500/50"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-8 animate-fade-in-right">
                            <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-3xl flex items-start gap-4">
                                <ShieldCheck size={20} className="text-amber-500 mt-1" />
                                <p className="text-xs text-amber-400 font-bold leading-relaxed uppercase tracking-wider">
                                    Finally, set up your administrator account. This will be used to log in to your new website's dashboard.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-4 flex items-center gap-2">
                                        <User size={12} /> Admin Username
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.adminUser}
                                        onChange={(e) => setFormData({ ...formData, adminUser: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm font-bold focus:outline-none focus:border-indigo-500/50"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-4 flex items-center gap-2">
                                            <Lock size={12} /> Admin Password
                                        </label>
                                        <input
                                            type="password"
                                            placeholder="Type strong password"
                                            value={formData.adminPass}
                                            onChange={(e) => setFormData({ ...formData, adminPass: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm font-bold focus:outline-none focus:border-indigo-500/50"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-4 flex items-center gap-2">
                                            <Mail size={12} /> Admin Email
                                        </label>
                                        <input
                                            type="email"
                                            placeholder="admin@example.com"
                                            value={formData.adminEmail}
                                            onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm font-bold focus:outline-none focus:border-indigo-500/50"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Controls */}
                <div className="px-10 py-8 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
                    <button
                        onClick={step === 1 ? onClose : prevStep}
                        className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3"
                    >
                        <ChevronLeft size={16} />
                        {step === 1 ? 'Cancel' : 'Back'}
                    </button>

                    <button
                        onClick={step === 3 ? handleInstall : nextStep}
                        disabled={loading || (step === 3 && (!formData.adminPass || !formData.adminEmail))}
                        className={`px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl flex items-center gap-3 ${loading ? 'bg-indigo-500/50 cursor-not-allowed text-white/50' : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/20 active:scale-[0.98]'
                            }`}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Deploying...
                            </>
                        ) : (
                            <>
                                {step === 3 ? 'Start Installation' : 'Next Step'}
                                <ChevronRight size={16} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AppInstallerModal;
