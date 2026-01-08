import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, User, Lock, Loader2 } from 'lucide-react';

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

        // Auto-refresh captcha every 15 minutes to prevent expiry
        const refreshInterval = setInterval(() => {
            console.log('[LOGIN] Auto-refreshing captcha to prevent expiry');
            fetchCaptcha();
        }, 15 * 60 * 1000); // 15 minutes

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

        // Check if captcha is too old (older than 18 minutes)
        const captchaAge = Date.now() - captchaTimestamp;
        const maxAge = 18 * 60 * 1000; // 18 minutes (before 20 min server expiry)

        if (captchaAge > maxAge) {
            console.warn('[LOGIN] Captcha too old, refreshing before submit');
            setError('Captcha sudah lama, sedang memperbarui...');
            await fetchCaptcha();
            setError('Captcha diperbarui, silakan login kembali');
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
            const errorMsg = err.response?.data?.error || 'Login failed';
            setError(errorMsg);

            // Auto-refresh captcha on any error
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
            alert(res.data.message || 'Kode baru berhasil dikirim.');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Gagal mengirim ulang kode.');
        } finally {
            setLoading(false);
        }
    };

    if (twoFactorRequired) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-6 animate-fade">
                <div className="glass max-w-[420px] w-full p-10 md:p-14 shadow-2xl relative overflow-hidden backdrop-blur-2xl bg-white/[0.02] border-white/[0.05] rounded-[32px]">
                    <div className="text-center mb-10 relative">
                        <div className="bg-[var(--primary)]/10 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-[var(--primary)]/20 shadow-[0_0_40px_rgba(99,102,241,0.1)]">
                            <Lock size={44} className="text-[var(--primary)]" />
                        </div>
                        <h1 className="text-3xl font-black text-[var(--text-main)] mb-3 tracking-tight">Two-Factor Auth</h1>
                        <p className="text-[var(--text-muted)] text-sm font-medium">Enter the 6-digit code sent to your email</p>
                    </div>

                    {error && (
                        <div className="mb-8 flex items-center gap-3 bg-rose-500/10 text-rose-500 p-4 rounded-2xl border border-rose-500/20">
                            <Shield size={18} className="flex-none" />
                            <p className="text-sm font-bold">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleVerify2FA} className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1 pl-1">Verification Code</label>
                            <input
                                className="input-glass w-full h-14 rounded-2xl font-bold text-center text-2xl tracking-[0.5em] placeholder:text-[var(--text-muted)]/30 outline-none transition-all"
                                placeholder="000000"
                                value={twoFactorCode}
                                onChange={e => setTwoFactorCode(e.target.value)}
                                maxLength={6}
                                required
                                autoFocus
                            />
                        </div>
                        <div className="flex flex-col gap-3 mt-4">
                            <button
                                className="btn-primary w-full h-16 rounded-2xl text-lg font-black shadow-xl shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                                disabled={loading || twoFactorCode.length < 6}
                            >
                                {loading ? <Loader2 className="animate-spin" size={24} /> : 'Verify & Continue'}
                            </button>
                            <button
                                type="button"
                                onClick={handleResend2FA}
                                className="w-full text-sm font-bold text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors py-2"
                                disabled={loading}
                            >
                                Resend Code (Minta Kode Baru)
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => setTwoFactorRequired(false)}
                            className="w-full text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors mt-2"
                        >
                            Back to Login
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-6 animate-fade">
            <div className="glass max-w-[420px] w-full p-10 md:p-14 shadow-2xl relative overflow-hidden backdrop-blur-2xl bg-white/[0.02] border-white/[0.05] rounded-[32px]">
                {/* Background Blobs */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)] opacity-5 blur-[80px] -translate-y-1/2 translate-x-1/2 rounded-full"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500 opacity-5 blur-[80px] translate-y-1/2 -translate-x-1/2 rounded-full"></div>

                <div className="text-center mb-10 relative">
                    <div className="bg-[var(--primary)]/10 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-[var(--primary)]/20 shadow-[0_0_40px_rgba(99,102,241,0.1)] transition-transform hover:scale-105 duration-300">
                        {siteSettings?.logo_url ? (
                            <img src={siteSettings.logo_url} alt="Logo" className="max-h-14 object-contain" />
                        ) : (
                            <Shield size={44} className="text-[var(--primary)]" />
                        )}
                    </div>

                    <h1 className="text-3xl font-black text-[var(--text-main)] mb-3 tracking-tight leading-tight">
                        {siteSettings?.site_title || 'Yumna Panel'}
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm font-medium tracking-wide">
                        Sign in to manage your vault
                    </p>
                </div>

                {error && (
                    <div className="mb-8 flex items-center gap-3 bg-rose-500/10 text-rose-500 p-4 rounded-2xl border border-rose-500/20 animate-bounce-short">
                        <Shield size={18} className="flex-none" />
                        <p className="text-sm font-bold">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6 relative">
                    <div className="space-y-2">
                        <label className="block text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1 pl-1">
                            Username or Email
                        </label>
                        <div className="relative group">
                            <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                            <input
                                className="input-glass w-full pl-12 h-14 rounded-2xl font-bold placeholder:text-[var(--text-muted)]/30 focus:ring-2 ring-[var(--primary)]/20 outline-none transition-all"
                                placeholder="Enter username or email..."
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1 pl-1">
                            Password
                        </label>
                        <div className="relative group">
                            <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                            <input
                                type="password"
                                className="input-glass w-full pl-12 h-14 rounded-2xl font-bold placeholder:text-[var(--text-muted)]/30 focus:ring-2 ring-[var(--primary)]/20 outline-none transition-all"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-4 pt-2">
                        <label className="block text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1 pl-1">
                            Security Verification
                        </label>
                        <div className="flex flex-col gap-4">
                            {captcha.svg && (
                                <div className="relative">
                                    <div
                                        className="bg-white/5 rounded-2xl p-2 border border-white/10 flex items-center justify-center relative group cursor-pointer overflow-hidden"
                                        dangerouslySetInnerHTML={{ __html: captcha.svg }}
                                        onClick={fetchCaptcha}
                                        title="Click to refresh captcha"
                                    />
                                    <button
                                        type="button"
                                        onClick={fetchCaptcha}
                                        className="absolute top-2 right-2 bg-[var(--primary)] hover:bg-[var(--primary)]/80 text-white p-2 rounded-lg transition-all shadow-lg"
                                        title="Refresh Captcha"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                                        </svg>
                                    </button>
                                    <div className="text-[10px] text-[var(--text-muted)] text-center mt-1 font-semibold">
                                        Klik gambar atau tombol untuk refresh
                                    </div>
                                </div>
                            )}
                            <div className="relative group">
                                <Shield size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                                <input
                                    className="input-glass w-full pl-12 h-14 rounded-2xl font-bold placeholder:text-[var(--text-muted)]/30 focus:ring-2 ring-[var(--primary)]/20 outline-none transition-all"
                                    placeholder="Enter 5 characters..."
                                    value={captchaText}
                                    onChange={e => setCaptchaText(e.target.value.toUpperCase())}
                                    required
                                    maxLength={5}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        className="btn-primary w-full h-16 rounded-2xl text-lg font-black shadow-xl shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 mt-4"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="animate-spin" size={24} /> : 'Sign Into Panel'}
                    </button>
                </form>

                <p className="mt-12 text-center text-[10px] font-bold text-[var(--text-muted)] opacity-50 uppercase tracking-[0.2em] leading-relaxed">
                    {siteSettings?.footer_text || 'Advanced Hosting & Server Control Panel'}
                </p>
            </div>
        </div>
    );
};


export default Login;
