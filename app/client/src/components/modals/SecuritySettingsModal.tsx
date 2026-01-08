import React, { useState, useEffect } from 'react';
import { Shield, X, Lock, CheckCircle2, AlertCircle, Loader2, Smartphone, Monitor, Globe, Clock, Trash2, LogOut } from 'lucide-react';
import axios from 'axios';

interface SecuritySettingsModalProps {
    userProfile: { email?: string, two_factor_enabled?: boolean };
    onToggle: (enabled: boolean) => Promise<boolean>;
    onClose: () => void;
}

interface Session {
    sessionId: string;
    deviceInfo: string;
    ipAddress: string;
    lastActive: string;
    isCurrent: boolean;
}

const SecuritySettingsModal: React.FC<SecuritySettingsModalProps> = ({ userProfile, onToggle, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'auth' | 'sessions'>('auth');
    const [sessions, setSessions] = useState<Session[]>([]);
    const [sessionLoading, setSessionLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'sessions') {
            fetchSessions();
        }
    }, [activeTab]);

    const fetchSessions = async () => {
        setSessionLoading(true);
        try {
            const res = await axios.get('/api/sessions');
            setSessions(res.data);
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
        } finally {
            setSessionLoading(false);
        }
    };

    const handleRevokeSession = async (sessionId: string) => {
        try {
            await axios.delete(`/api/sessions/${sessionId}`);
            fetchSessions();
        } catch (error) {
            console.error('Failed to revoke session:', error);
        }
    };

    const handleRevokeAllOthers = async () => {
        if (!confirm('Are you sure you want to sign out from all other devices?')) return;
        try {
            await axios.delete('/api/sessions');
            fetchSessions();
        } catch (error) {
            console.error('Failed to revoke sessions:', error);
        }
    };

    const handleToggle = async () => {
        setLoading(true);
        try {
            await onToggle(!userProfile.two_factor_enabled);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const getDeviceIcon = (info: string) => {
        if (info.toLowerCase().includes('mobile') || info.toLowerCase().includes('android') || info.toLowerCase().includes('iphone')) {
            return <Smartphone size={20} className="text-[var(--primary)]" />;
        }
        return <Monitor size={20} className="text-[var(--primary)]" />;
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
            <div className="glass animate-fade" style={{ width: '100%', maxWidth: '600px', background: 'var(--bg-dark)', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
                <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '10px', borderRadius: '12px' }}>
                            <Shield color="#6366f1" size={24} />
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>Security Vault</h2>
                    </div>
                    <button onClick={onClose} style={{ background: 'var(--nav-hover)', border: 'none', color: 'var(--text-muted)', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                <div className="flex border-b border-[var(--border)]">
                    <button
                        onClick={() => setActiveTab('auth')}
                        className={`flex-1 py-4 text-sm font-bold transition-colors relative ${activeTab === 'auth' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                    >
                        Two-Factor Auth
                        {activeTab === 'auth' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--primary)]" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('sessions')}
                        className={`flex-1 py-4 text-sm font-bold transition-colors relative ${activeTab === 'sessions' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                    >
                        Active Sessions
                        {activeTab === 'sessions' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--primary)]" />}
                    </button>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar" style={{ minHeight: '400px' }}>
                    {activeTab === 'auth' ? (
                        <div className="animate-fade">
                            <div style={{ background: 'var(--nav-hover)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)', marginBottom: '32px' }}>
                                <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                                    <div style={{ background: 'var(--bg-dark)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Lock size={20} color="var(--primary)" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>Two-Factor Authentication</p>
                                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                                            Secure your account with an additional verification step. A unique code will be sent to your email during login.
                                        </p>
                                    </div>
                                </div>

                                {!userProfile.email && (
                                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '16px', borderRadius: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <AlertCircle size={18} color="#ef4444" />
                                        <p style={{ fontSize: '13px', color: '#ef4444', fontWeight: '600' }}>Email address is required for 2FA. Please contact administrator.</p>
                                    </div>
                                )}

                                {userProfile.email && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                                        <div>
                                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Recovery Email</p>
                                            <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>{userProfile.email}</p>
                                        </div>
                                        <button
                                            onClick={handleToggle}
                                            disabled={loading}
                                            style={{
                                                background: userProfile.two_factor_enabled ? 'rgba(16, 185, 129, 0.1)' : 'var(--primary)',
                                                color: userProfile.two_factor_enabled ? '#10b981' : 'white',
                                                border: userProfile.two_factor_enabled ? '1px solid rgba(16, 185, 129, 0.2)' : 'none',
                                                padding: '10px 20px',
                                                borderRadius: '12px',
                                                fontSize: '14px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                transition: '0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            {loading ? <Loader2 size={16} className="animate-spin" /> : userProfile.two_factor_enabled ? <><CheckCircle2 size={16} /> Enabled</> : 'Activate 2FA'}
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                                    Verification codes are valid for 10 minutes.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fade">
                            {sessionLoading ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="animate-spin text-[var(--primary)]" size={32} />
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center mb-4">
                                        <p className="text-sm text-[var(--text-muted)] font-medium">Devices logged into your account:</p>
                                        {sessions.length > 1 && (
                                            <button
                                                onClick={handleRevokeAllOthers}
                                                className="text-xs font-bold text-rose-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
                                            >
                                                <LogOut size={14} /> Sign out all other devices
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        {sessions.map((session) => (
                                            <div key={session.sessionId} className={`p-4 rounded-xl border ${session.isCurrent ? 'bg-[var(--primary)]/10 border-[var(--primary)]/30' : 'bg-[var(--nav-hover)] border-transparent'} flex items-center justify-between group`}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${session.isCurrent ? 'bg-[var(--primary)]' : 'bg-[var(--bg-dark)]'}`}>
                                                        {React.cloneElement(getDeviceIcon(session.deviceInfo) as React.ReactElement, { className: session.isCurrent ? 'text-white' : 'text-[var(--text-muted)]' })}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-sm text-[var(--text-main)] truncate max-w-[200px]" title={session.deviceInfo}>
                                                                {session.deviceInfo.split(')')[0] + ')' || 'Unknown Device'}
                                                            </p>
                                                            {session.isCurrent && (
                                                                <span className="px-2 py-0.5 bg-green-500/20 text-green-500 text-[10px] uppercase font-bold rounded-full">Current</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-muted)]">
                                                            <div className="flex items-center gap-1">
                                                                <Globe size={12} /> {session.ipAddress}
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Clock size={12} /> {formatDate(session.lastActive)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                {!session.isCurrent && (
                                                    <button
                                                        onClick={() => handleRevokeSession(session.sessionId)}
                                                        className="p-2 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                        title="Revoke Access"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SecuritySettingsModal;
