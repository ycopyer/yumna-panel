import React from 'react';
import { Folder, File as FileIcon, Shield, Clock, Lock } from 'lucide-react';

interface SharedLoginProps {
    siteSettings: any;
    shareInfo: any;
    password: string;
    setPassword: (password: string) => void;
    handleLogin: (e: React.FormEvent) => void;
    error: string;
    captcha: { id: string, svg: string };
    captchaText: string;
    setCaptchaText: (text: string) => void;
    fetchCaptcha: () => void;
}

const SharedLogin: React.FC<SharedLoginProps> = ({
    siteSettings,
    shareInfo,
    password,
    setPassword,
    handleLogin,
    error,
    captcha,
    captchaText,
    setCaptchaText,
    fetchCaptcha
}) => {
    return (
        <div className="glass p-6 sm:p-10 md:p-14 animate-fade shadow-2xl relative overflow-hidden backdrop-blur-2xl bg-white/[0.03] border-white/[0.05] rounded-[24px] sm:rounded-[32px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)] opacity-5 blur-[80px] -translate-y-1/2 translate-x-1/2 rounded-full"></div>

            <div className="text-center mb-10">
                <div className="bg-[var(--primary)]/10 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-[var(--primary)]/20 shadow-[0_0_40px_rgba(99,102,241,0.1)] transition-transform hover:scale-105 duration-300">
                    {siteSettings.logo_url ? (
                        <img src={siteSettings.logo_url} alt="Logo" className="max-h-14 object-contain" />
                    ) : (
                        shareInfo.isFolder
                            ? <Folder size={44} className="text-[var(--primary)]" />
                            : <FileIcon size={44} className="text-[var(--primary)]" />
                    )}
                </div>

                <h1 className="text-3xl font-black text-[var(--text-main)] mb-3 tracking-tight">
                    {siteSettings.site_title || 'Yumna Panel'}
                </h1>
                <p className="text-[var(--text-muted)] text-sm mb-8 leading-relaxed">
                    Accessing shared item: <span className="text-[var(--text-main)] font-black italic">{shareInfo.fileName}</span>
                </p>

                <div className="flex flex-wrap justify-center gap-4 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--primary)]">
                    <span className="flex items-center gap-2 bg-[var(--primary)]/5 px-4 py-2 rounded-full border border-[var(--primary)]/10">
                        <Shield size={14} /> {shareInfo.permissions} Access
                    </span>
                    {shareInfo.expiresAt && (
                        <span className="flex items-center gap-2 bg-[var(--nav-hover)] px-4 py-2 rounded-full border border-[var(--border)] text-[var(--text-muted)]">
                            <Clock size={14} /> Exp: {new Date(shareInfo.expiresAt).toLocaleDateString()}
                        </span>
                    )}
                </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
                {shareInfo.hasPassword && (
                    <div>
                        <label className="block text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3 pl-1">
                            Access Password
                        </label>
                        <div className="relative group">
                            <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                            <input
                                type="password"
                                className="input-glass w-full pl-12 h-14 rounded-2xl text-lg font-bold placeholder:text-[var(--text-muted)]/30 focus:ring-2 ring-[var(--primary)]/20 outline-none transition-all"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                )}

                <div className="space-y-4 pt-2">
                    <label className="block text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3 pl-1">
                        Security Verification
                    </label>
                    <div className="flex flex-col gap-4">
                        {captcha.svg && (
                            <div
                                className="bg-white/5 rounded-2xl p-2 border border-white/10 flex items-center justify-center relative group cursor-pointer overflow-hidden"
                                dangerouslySetInnerHTML={{ __html: captcha.svg }}
                                onClick={fetchCaptcha}
                                title="Click to refresh captcha"
                            />
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
                    className="btn-primary w-full h-16 rounded-2xl text-lg font-black shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    type="submit"
                >
                    Unlock Shared Link
                </button>
            </form>

            {error && (
                <div className="mt-6 flex items-center gap-3 bg-rose-500/10 text-rose-500 p-4 rounded-xl border border-rose-500/20 animate-bounce-short">
                    <Shield size={18} className="flex-none" />
                    <p className="text-sm font-bold">{error}</p>
                </div>
            )}

            <div className="mt-12 text-center flex flex-col items-center gap-1.5 opacity-50 uppercase tracking-[0.2em] font-bold text-[10px] text-[var(--text-muted)]">
                <p>
                    {siteSettings.footer_text || 'Advanced Hosting & Server Control Panel'}
                </p>
                {siteSettings.app_version && (
                    <span className="opacity-70 text-[9px] tracking-[0.3em]">Version {siteSettings.app_version}</span>
                )}
            </div>
        </div>
    );
};


export default SharedLogin;
