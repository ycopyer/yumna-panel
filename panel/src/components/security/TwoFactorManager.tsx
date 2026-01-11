import React, { useState, useEffect } from 'react';
import { Shield, Fingerprint, Lock, ShieldCheck, ShieldAlert, Key, QrCode, CheckCircle2, AlertCircle, RefreshCw, X, Copy, ExternalLink } from 'lucide-react';
import axios from 'axios';

const TwoFactorManager: React.FC = () => {
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [setupMode, setSetupMode] = useState(false);
    const [secret, setSecret] = useState('');
    const [qrCode, setQrCode] = useState('');
    const [token, setToken] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await axios.get('/api/security/2fa/status');
            setEnabled(res.data.enabled);
        } catch (err) {
            console.error('Failed to fetch 2FA status:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleStartSetup = async () => {
        setError('');
        try {
            const res = await axios.post('/api/security/2fa/setup');
            setSecret(res.data.secret);
            setQrCode(res.data.qrContent);
            setSetupMode(true);
        } catch (err) {
            setError('Failed to initialize 2FA setup');
        }
    };

    const handleVerifyAndEnable = async () => {
        setError('');
        try {
            await axios.post('/api/security/2fa/enable', { secret, token });
            setSuccess('Two-Factor Authentication enabled successfully!');
            setEnabled(true);
            setSetupMode(false);
            setTimeout(() => setSuccess(''), 5000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Invalid code. Please try again.');
        }
    };

    const handleDisable = async () => {
        if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) return;
        try {
            await axios.post('/api/security/2fa/disable');
            setEnabled(false);
            setSuccess('2FA has been disabled.');
            setTimeout(() => setSuccess(''), 5000);
        } catch (err) {
            setError('Failed to disable 2FA');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Secret key copied to clipboard');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20 text-white/40">
                <RefreshCw className="animate-spin mr-2" size={20} />
                Loading security settings...
            </div>
        );
    }

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl ${enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        <Fingerprint size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white">Two-Factor Authentication</h1>
                        <p className="text-white/50">Secure your account with an additional layer of protection</p>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Main Control Card */}
                <div className="md:col-span-1 space-y-6">
                    <div className={`p-8 rounded-[2.5rem] border transition-all duration-500 ${enabled
                            ? 'bg-emerald-500/5 border-emerald-500/20 shadow-2xl shadow-emerald-500/5'
                            : 'bg-white/5 border-white/10 shadow-xl'
                        }`}>
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                {enabled ? (
                                    <div className="p-3 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/40">
                                        <ShieldCheck size={24} />
                                    </div>
                                ) : (
                                    <div className="p-3 rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/40">
                                        <ShieldAlert size={24} />
                                    </div>
                                )}
                                <div>
                                    <div className="text-white font-black text-xl leading-none">{enabled ? 'SECURED' : 'UNPROTECTED'}</div>
                                    <div className="text-[10px] font-bold tracking-widest text-white/40 mt-1 uppercase">Current Status</div>
                                </div>
                            </div>
                            {enabled && (
                                <button
                                    onClick={handleDisable}
                                    className="text-white/20 hover:text-rose-400 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            )}
                        </div>

                        <p className="text-white/60 text-sm mb-8 leading-relaxed">
                            Two-factor authentication adds an extra layer of security to your account. In addition to your password, you'll need to provide a code generated by an app like Google Authenticator or Authy.
                        </p>

                        {!enabled ? (
                            <button
                                onClick={handleStartSetup}
                                disabled={setupMode}
                                className="w-full py-4 rounded-2xl bg-amber-500 text-white font-black hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2"
                            >
                                <Lock size={20} />
                                ENABLE 2FA PROTECTION
                            </button>
                        ) : (
                            <div className="flex flex-col items-center py-4 bg-emerald-500/10 rounded-3xl border border-emerald-500/20">
                                <p className="text-emerald-400 font-bold text-xs uppercase tracking-widest">Protection Active</p>
                                <p className="text-[#00FF00] font-mono text-[10px] mt-1">SYSPROP: SECURITY_LVL_MAX</p>
                            </div>
                        )}

                        {success && (
                            <div className="mt-4 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center gap-3 animate-in fade-in duration-300">
                                <CheckCircle2 size={20} />
                                <span className="text-sm font-bold">{success}</span>
                            </div>
                        )}
                    </div>

                    {/* Info Card */}
                    <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                        <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                            <Key size={18} className="text-blue-400" />
                            Security Best Practices
                        </h3>
                        <ul className="space-y-3">
                            {[
                                'Use a dedicated authenticator app',
                                'Store your backup codes in a safe place',
                                'Never share your 2FA code with anyone',
                                'Enable 2FA on all your critical accounts'
                            ].map((tip, idx) => (
                                <li key={idx} className="flex items-start gap-3 text-sm text-white/40">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500/50" />
                                    {tip}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Setup Area */}
                <div className="md:col-span-1">
                    {setupMode ? (
                        <div className="p-8 rounded-[2.5rem] bg-white/5 border border-amber-500/30 shadow-2xl animate-in zoom-in-95 duration-500">
                            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                                <QrCode className="text-amber-500" size={24} />
                                Configure App
                            </h3>

                            <div className="space-y-8">
                                <div className="flex flex-col items-center">
                                    <div className="p-4 bg-white rounded-3xl shadow-2xl">
                                        <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                                    </div>
                                    <p className="text-[10px] text-white/30 mt-4 text-center font-bold tracking-widest uppercase">Scan with your authenticator app</p>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-white/40 text-[10px] font-black uppercase tracking-widest">Secret Key</label>
                                        <button
                                            onClick={() => copyToClipboard(secret)}
                                            className="text-amber-500 hover:text-amber-400 text-[10px] font-bold flex items-center gap-1"
                                        >
                                            <Copy size={12} /> COPY
                                        </button>
                                    </div>
                                    <div className="px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white/50 font-mono text-xs break-all">
                                        {secret}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-white/40 text-[10px] font-black uppercase tracking-widest mb-3">Verification Code</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={token}
                                            onChange={(e) => setToken(e.target.value)}
                                            maxLength={6}
                                            className="flex-1 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-2xl tracking-[0.5em] text-center focus:outline-none focus:border-amber-500/50"
                                            placeholder="000000"
                                        />
                                        <button
                                            onClick={handleVerifyAndEnable}
                                            className="px-8 rounded-2xl bg-amber-500 text-white font-black hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-amber-500/25"
                                        >
                                            VERIFY
                                        </button>
                                    </div>
                                    {error && (
                                        <div className="mt-4 flex items-center gap-2 text-rose-400 text-xs font-bold">
                                            <AlertCircle size={14} /> {error}
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => setSetupMode(false)}
                                    className="w-full py-4 rounded-2xl bg-white/5 text-white/40 font-bold hover:bg-white/10 transition-all text-xs"
                                >
                                    CANCEL SETUP
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-12 text-center rounded-[2.5rem] border border-dashed border-white/10 bg-white/2">
                            <div className="p-6 rounded-full bg-white/5 text-white/10 mb-6">
                                <Shield size={64} />
                            </div>
                            <h3 className="text-xl font-black text-white/20">Security Portal</h3>
                            <p className="text-white/10 text-sm mt-2">Activate 2FA to unlock advanced security features and protect your hosting infrastructure from unauthorized access.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TwoFactorManager;
