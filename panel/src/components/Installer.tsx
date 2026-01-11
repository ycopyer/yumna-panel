import React, { useState } from 'react';
import { Database, ShieldCheck, User, Server, CheckCircle2, Loader2, Key } from 'lucide-react';
import axios from 'axios';

const Installer: React.FC = () => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [config, setConfig] = useState({
        dbHost: '127.0.0.1',
        dbPort: '3306',
        dbUser: 'root',
        dbPass: '',
        dbName: 'filemanager_db',
        adminUser: 'admin',
        adminPass: ''
    });

    const handleInstall = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.post('/api/install/setup', config);
            if (response.data.success) {
                setStep(3);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Installation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-900">
            <div className="max-w-xl w-full">
                {/* Header */}
                <div className="text-center mb-10 space-y-2">
                    <div className="inline-flex p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
                        <Server className="w-10 h-10 text-blue-400" />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-white">
                        System <span className="text-blue-400">Setup</span>
                    </h1>
                    <p className="text-slate-400">Configure your workspace and database in seconds.</p>
                </div>

                {/* Glass Card */}
                <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl shadow-blue-500/5">

                    {/* Progress Tabs */}
                    <div className="flex justify-between mb-10 relative">
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-700 -translate-y-1/2 z-0" />
                        {[1, 2, 3].map((s) => (
                            <div key={s} className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${step >= s ? 'bg-blue-500 border-blue-400' : 'bg-slate-800 border-slate-600 text-slate-500'}`}>
                                {step > s ? <CheckCircle2 className="w-6 h-6 text-white" /> : <span className="font-bold">{s}</span>}
                            </div>
                        ))}
                    </div>

                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Database className="w-5 h-5 text-blue-400" /> Database Configuration
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Host</label>
                                    <input type="text" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-colors" value={config.dbHost} onChange={e => setConfig({ ...config, dbHost: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Port</label>
                                    <input type="text" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-colors" value={config.dbPort} onChange={e => setConfig({ ...config, dbPort: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Database Name</label>
                                <input type="text" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-colors" value={config.dbName} onChange={e => setConfig({ ...config, dbName: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Username</label>
                                    <input type="text" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-colors" value={config.dbUser} onChange={e => setConfig({ ...config, dbUser: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Password</label>
                                    <input type="password" placeholder="Optional" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-colors" value={config.dbPass} onChange={e => setConfig({ ...config, dbPass: e.target.value })} />
                                </div>
                            </div>
                            <button onClick={() => setStep(2)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]">
                                Continue Setup
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-emerald-400" /> Admin Account
                            </h2>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Admin Username</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input type="text" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-12 pr-4 py-2.5 outline-none focus:border-blue-500 transition-colors" value={config.adminUser} onChange={e => setConfig({ ...config, adminUser: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Admin Password</label>
                                <div className="relative">
                                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input type="password" placeholder="Min. 8 characters" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-12 pr-4 py-2.5 outline-none focus:border-blue-500 transition-colors" value={config.adminPass} onChange={e => setConfig({ ...config, adminPass: e.target.value })} />
                                </div>
                            </div>

                            {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

                            <div className="flex gap-4">
                                <button onClick={() => setStep(1)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-all">
                                    Back
                                </button>
                                <button onClick={handleInstall} disabled={loading} className="flex-[2] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2">
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Finalize Installation'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center py-6 space-y-6 animate-in zoom-in-95">
                            <div className="inline-flex p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-white">System Ready!</h2>
                                <p className="text-slate-400">All tables established and configurations saved.</p>
                            </div>
                            <button onClick={() => window.location.href = '/'} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all">
                                Go to Login
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-slate-500 text-sm mt-8">
                    &copy; 2026 Admin Panel &bull; Yumna Panel
                </p>
            </div>
        </div>
    );
};

export default Installer;
