import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, User, Lock, Loader2, ArrowRight, CheckCircle2, Globe, Cpu, Database, Mail, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoginProps {
    onLogin: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [twoFactorRequired, setTwoFactorRequired] = useState(false);
    const [twoFactorId, setTwoFactorId] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [siteSettings, setSiteSettings] = useState<any>(null);
    const [captcha, setCaptcha] = useState({ id: '', svg: '' });
    const [captchaText, setCaptchaText] = useState('');
    const [captchaTimestamp, setCaptchaTimestamp] = useState(Date.now());

    useEffect(() => {
        fetchSiteSettings();
        fetchCaptcha();

        const refreshInterval = setInterval(() => {
            fetchCaptcha();
        }, 15 * 60 * 1000);

        return () => clearInterval(refreshInterval);
    }, []);

    const fetchCaptcha = async () => {
        try {
            const res = await axios.get(`/api/captcha?_t=${Date.now()}`);
            setCaptcha(res.data);
            setCaptchaText('');
            setCaptchaTimestamp(Date.now());
        } catch (err) {
            console.error('Failed to fetch captcha:', err);
        }
    };

    const fetchSiteSettings = async () => {
        try {
            const res = await axios.get('/api/settings-site');
            setSiteSettings(res.data);
        } catch (err) {
            console.error('Failed to fetch site settings:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const captchaAge = Date.now() - captchaTimestamp;
        if (captchaAge > 18 * 60 * 1000) {
            setError('Captcha expired, refreshing...');
            await fetchCaptcha();
            return;
        }

        setLoading(true);
        setError('');
        try {
            const res = await axios.post('/api/login', {
                username,
                password,
                captchaId: captcha.id,
                captchaText
            });

            if (res.data.requires2FA) {
                setTwoFactorRequired(true);
                setTwoFactorId(res.data.twoFactorId);
            } else {
                onLogin(res.data);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Login failed');
            await fetchCaptcha();
        } finally {
            setLoading(false);
        }
    };

    const handleVerify2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await axios.post('/api/verify-2fa', {
                twoFactorId,
                code: twoFactorCode
            });
            onLogin(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleResend2FA = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await axios.post('/api/resend-2fa', { twoFactorId });
            alert(res.data.message || 'New code sent.');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to resend code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-0 md:p-6 overflow-hidden selection:bg-indigo-500/30">
            {/* Animated Background Elements */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse [animation-delay:2s]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-5xl md:h-[700px] flex flex-col md:flex-row bg-[#0f172a]/80 backdrop-blur-3xl border border-white/5 rounded-none md:rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden"
            >
                {/* Left Side: Info / Branding (Hidden on small mobile) */}
                <div className="hidden md:flex md:w-[45%] bg-[#1e293b]/40 p-12 flex-col justify-between border-r border-white/5 relative group">
                    <div className="relative z-10">
                        <div className="flex flex-col gap-4 mb-12">
                            <div className="w-[148px] h-[148px] flex items-center justify-center transition-transform duration-500 hover:scale-105">
                                {siteSettings?.logo_url ? (
                                    <img src={siteSettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                                ) : (
                                    <Shield className="text-indigo-500" size={148} />
                                )}
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-white tracking-widest uppercase mb-1">{siteSettings?.site_title || 'YUMNA PANEL'}</h1>
                                <span className="text-[10px] font-black text-indigo-500/60 uppercase tracking-[0.2em]">Version {siteSettings?.panel_version || '2.2.3'}</span>
                            </div>
                        </div>

                        <h2 className="text-4xl font-black text-white leading-tight mb-8 tracking-tighter">
                            Kuasai Web dengan <br />
                            <span className="text-indigo-500">Performa Ultra-Hybrid.</span>
                        </h2>

                        <div className="space-y-6">
                            {[
                                { icon: Globe, text: "Multi-Engine Hyper-Stack: Nginx & Apache", color: "text-blue-400" },
                                { icon: Shield, text: "Keamanan Institusi & Live Threat Defense", color: "text-rose-400" },
                                { icon: Cpu, text: "Automasi Git-to-Live & Webhook Terpadu", color: "text-amber-400" },
                                { icon: Database, text: "Database Berkecepatan Tinggi & Skalabel", color: "text-emerald-400" }
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5 + (i * 0.1) }}
                                    className="flex items-center gap-4 group/item"
                                >
                                    <div className={`p-2 rounded-xl bg-white/5 border border-white/10 ${item.color} group-hover/item:bg-white/10 transition-colors`}>
                                        <item.icon size={18} />
                                    </div>
                                    <span className="text-sm font-bold text-white/50 group-hover/item:text-white/80 transition-colors">{item.text}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <div className="relative z-10">
                        <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 backdrop-blur-md">
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-2">Systems Status</p>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                                <span className="text-[10px] font-bold text-white/40 tracking-wider">All instances operational • Latency 24ms</span>
                            </div>
                        </div>
                    </div>

                    {/* Decorative Element */}
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-600/5 blur-[80px] rounded-full"></div>
                </div>

                {/* Right Side: Login Form */}
                <div className="flex-1 p-8 md:p-16 flex flex-col justify-center relative overflow-y-auto custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {!twoFactorRequired ? (
                            <motion.div
                                key="login"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="w-full max-w-[380px] mx-auto"
                            >
                                <div className="mb-10 text-center md:text-left">
                                    {/* Mobile Logo Only */}
                                    <div className="md:hidden flex flex-col items-center gap-4 mb-8">
                                        <div className="w-[148px] h-[148px] flex items-center justify-center">
                                            {siteSettings?.logo_url ? (
                                                <img src={siteSettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                                            ) : (
                                                <Shield className="text-indigo-500" size={148} />
                                            )}
                                        </div>
                                        <div>
                                            <h1 className="text-2xl font-black text-white tracking-widest uppercase mb-1">{siteSettings?.site_title || 'YUMNA PANEL'}</h1>
                                            <span className="text-[10px] font-black text-indigo-500/60 uppercase tracking-[0.2em] block text-center">Version {siteSettings?.panel_version || '2.2.3'}</span>
                                        </div>
                                    </div>

                                    <h1 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase font-outline">ACCESS PROTOCOL</h1>
                                    <p className="text-white/40 text-xs font-bold tracking-[0.1em] italic">Otentikasi aman ke gerbang infrastruktur Anda.</p>
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3"
                                    >
                                        <div className="p-1.5 bg-rose-500 rounded-lg">
                                            <Shield size={14} className="text-white" />
                                        </div>
                                        <p className="text-xs font-black text-rose-500 uppercase tracking-widest">{error}</p>
                                    </motion.div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Account Vector</label>
                                        <div className="relative group">
                                            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-indigo-500 transition-colors" />
                                            <input
                                                className="w-full h-14 bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-4 text-white font-bold placeholder:text-white/10 outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all"
                                                placeholder="Username or Email"
                                                value={username}
                                                onChange={e => setUsername(e.target.value)}
                                                required
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Cipher Key</label>
                                        <div className="relative group">
                                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-indigo-500 transition-colors" />
                                            <input
                                                type="password"
                                                className="w-full h-14 bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-4 text-white font-bold placeholder:text-white/10 outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all"
                                                placeholder="Password"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Visual Verification</label>
                                        <div className="p-3 bg-white/[0.03] border border-white/5 rounded-2xl space-y-4">
                                            <div className="flex items-center justify-between gap-4">
                                                <div
                                                    className="bg-white/5 rounded-xl border border-white/10 p-1 flex-1 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors h-12 overflow-hidden"
                                                    dangerouslySetInnerHTML={{ __html: captcha.svg }}
                                                    onClick={fetchCaptcha}
                                                    title="Refresh Captcha"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={fetchCaptcha}
                                                    className="p-3 h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all active:scale-95 flex items-center justify-center"
                                                >
                                                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                                                </button>
                                            </div>
                                            <input
                                                className="w-full h-12 bg-black/40 border border-white/5 rounded-xl px-4 text-center text-indigo-400 font-mono text-lg tracking-[0.5em] focus:border-indigo-500/40 outline-none transition-all"
                                                placeholder="*****"
                                                value={captchaText}
                                                onChange={e => setCaptchaText(e.target.value.toUpperCase())}
                                                maxLength={5}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <button
                                        disabled={loading}
                                        className="group relative w-full h-16 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.3em] rounded-2xl shadow-2xl shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-4 overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                        {loading ? <Loader2 size={24} className="animate-spin" /> : (
                                            <>
                                                Initialize Access
                                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="2fa"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="w-full max-w-[380px] mx-auto text-center"
                            >
                                <div className="mb-10">
                                    <div className="w-20 h-20 bg-indigo-500/10 rounded-[30px] flex items-center justify-center mx-auto mb-6 border border-indigo-500/20 shadow-xl shadow-indigo-500/5">
                                        <Lock size={36} className="text-indigo-400" />
                                    </div>
                                    <h1 className="text-3xl font-black text-white mb-2 tracking-tight uppercase">Factor Authentication</h1>
                                    <p className="text-white/40 text-xs font-bold tracking-wide italic leading-relaxed">Identity verification module active. <br />Check your primary comm-link.</p>
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3"
                                    >
                                        <div className="p-1.5 bg-rose-500 rounded-lg">
                                            <Shield size={14} className="text-white" />
                                        </div>
                                        <p className="text-xs font-black text-rose-500 uppercase tracking-widest leading-relaxed uppercase">{error}</p>
                                    </motion.div>
                                )}

                                <form onSubmit={handleVerify2FA} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Temporal Pulse Code</label>
                                        <input
                                            className="w-full h-20 bg-white/[0.03] border border-white/5 rounded-2xl text-center text-4xl font-mono tracking-[0.5em] text-indigo-400 outline-none focus:border-indigo-500/50 transition-all"
                                            placeholder="000000"
                                            value={twoFactorCode}
                                            onChange={e => setTwoFactorCode(e.target.value)}
                                            maxLength={6}
                                            required
                                            autoFocus
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <button
                                            disabled={loading}
                                            className="w-full h-16 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.3em] rounded-2xl shadow-2xl shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-4"
                                        >
                                            {loading ? <Loader2 size={24} className="animate-spin" /> : 'Confirm Pulse'}
                                        </button>

                                        <div className="flex flex-col gap-2">
                                            <button
                                                type="button"
                                                onClick={handleResend2FA}
                                                className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors"
                                            >
                                                Resend verification pulse
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setTwoFactorRequired(false)}
                                                className="text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white/40 transition-colors"
                                            >
                                                Back to primary uplink
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Footer Info */}
                    <div className="mt-12 text-center">
                        <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.4em]">
                            {siteSettings?.footer_text || 'Advanced Hosting & Server Control Panel'}
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Floating Security Badge (Small Mobile) */}
            <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full backdrop-blur-md">
                <CheckCircle2 size={12} className="text-emerald-500" />
                <span className="text-[9px] font-black uppercase tracking-wider text-white/40">Secure Identity Layer v2.2.3</span>
            </div>
        </div>
    );
};

export default Login;
