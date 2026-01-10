import React, { useState, useEffect } from 'react';
import { X, Shield, Loader2, CheckCircle, Smartphone, AlertTriangle } from 'lucide-react';
import axios from 'axios';

interface TwoFactorSetupModalProps {
    type: 'ssh' | 'ftp';
    accountId: number;
    username: string;
    onClose: () => void;
    onSuccess: () => void;
}

const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({ type, accountId, username, onClose, onSuccess }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [setupData, setSetupData] = useState<{ secret: string, qrContent: string } | null>(null);
    const [token, setToken] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (step === 2 && !setupData) {
            handleSetupInit();
        }
    }, [step]);

    const handleSetupInit = async () => {
        setLoading(true);
        setError('');
        try {
            const endpoint = type === 'ssh' ? `/api/ssh-accounts/${accountId}/2fa/setup` : `/api/ftp/${accountId}/2fa/setup`;
            const res = await axios.post(endpoint);
            setSetupData(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to initialize 2FA setup');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAndEnable = async () => {
        if (!token || !setupData) return;
        setLoading(true);
        setError('');
        try {
            const endpoint = type === 'ssh' ? `/api/ssh-accounts/${accountId}/2fa/enable` : `/api/ftp/${accountId}/2fa/enable`;
            await axios.post(endpoint, {
                secret: setupData.secret,
                token
            });
            setStep(3);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 2000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Invalid verification code');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1500] flex items-center justify-center p-4">
            <div className="bg-[var(--bg-dark)] w-full max-w-lg rounded-[40px] border border-[var(--border)] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="p-8 border-b border-[var(--border)] flex justify-between items-center bg-gradient-to-r from-indigo-500/10 to-transparent">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
                            <Shield className="text-indigo-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white">2FA Security Setup</h3>
                            <p className="text-xs font-bold text-white/30 uppercase tracking-widest mt-0.5">{type === 'ssh' ? 'SSH Account' : 'FTP Account'}: {username}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-all">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8">
                    {step === 1 && (
                        <div className="space-y-6 text-center">
                            <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto">
                                <Smartphone size={40} className="text-indigo-400" />
                            </div>
                            <div>
                                <h4 className="text-lg font-black text-white mb-2">Internal Security Protocol</h4>
                                <p className="text-sm font-medium text-white/50 leading-relaxed">
                                    Enhance your account security by adding Two-Factor Authentication.
                                    You will need an authenticator app like Google Authenticator or Authy.
                                </p>
                            </div>
                            <button
                                onClick={() => setStep(2)}
                                className="w-full py-4 bg-indigo-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-indigo-500/25 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                Begin Security Setup
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            {loading && !setupData ? (
                                <div className="py-12 flex flex-col items-center gap-4">
                                    <Loader2 size={48} className="animate-spin text-indigo-500" />
                                    <p className="text-sm font-bold text-white/40 uppercase tracking-widest">Generating Secure Token...</p>
                                </div>
                            ) : error ? (
                                <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center">
                                    <AlertTriangle className="mx-auto mb-3 text-rose-500" size={32} />
                                    <p className="text-sm font-bold text-rose-500">{error}</p>
                                    <button onClick={handleSetupInit} className="mt-4 px-6 py-2 bg-rose-500 text-white rounded-xl text-xs font-black uppercase">Retry</button>
                                </div>
                            ) : setupData && (
                                <div className="space-y-6 animate-in fade-in duration-500">
                                    <div className="bg-white p-4 rounded-3xl mx-auto w-fit shadow-2xl border-4 border-white">
                                        <img src={setupData.qrContent} alt="Scan this QR code" className="w-48 h-48" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-white/50 mb-4">
                                            Scan this QR code with your authenticator app, then enter the 6-digit verification code below.
                                        </p>
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                maxLength={6}
                                                value={token}
                                                onChange={e => setToken(e.target.value.replace(/\D/g, ''))}
                                                placeholder="000 000"
                                                className="w-full h-16 bg-black/40 border-2 border-white/5 rounded-2xl text-center text-3xl font-black text-white outline-none focus:border-indigo-500/50 tracking-[0.5em] focus:tracking-[0.8em] transition-all"
                                            />
                                            {error && <p className="text-xs font-black text-rose-500 uppercase tracking-widest">{error}</p>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleVerifyAndEnable}
                                        disabled={loading || token.length !== 6}
                                        className="w-full py-4 bg-emerald-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-emerald-500/25 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                                    >
                                        {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Complete Setup'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 3 && (
                        <div className="py-12 text-center animate-in zoom-in duration-500">
                            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle size={56} className="text-emerald-500" />
                            </div>
                            <h4 className="text-2xl font-black text-white mb-2">System Secure</h4>
                            <p className="text-sm font-medium text-white/50">Two-Factor Authentication has been successfully enabled for this account.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TwoFactorSetupModal;
