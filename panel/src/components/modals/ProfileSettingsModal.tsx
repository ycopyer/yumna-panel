import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { X, User, Lock, Save, Loader2, Camera, Server, Mail, Shield, Bell } from 'lucide-react';
import usePushNotifications from '../../hooks/usePushNotifications';

interface ProfileSettingsModalProps {
    userId: number;
    onClose: () => void;
    onSaved: () => void;
}

const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({ userId, onClose, onSaved }) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'sftp' | 'notifications'>('profile');
    const [loading, setLoading] = useState(false);

    // Notifications Hook
    const { isSubscribed, subscribe, sendTestNotification, permission, loading: notifLoading } = usePushNotifications();
    const [fetching, setFetching] = useState(true);

    // Profile State
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [avatar, setAvatar] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [role, setRole] = useState('');
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

    // SFTP State
    const [host, setHost] = useState('');
    const [port, setPort] = useState('22');
    const [sftpUser, setSftpUser] = useState('');
    const [sftpPass, setSftpPass] = useState('');
    const [sftpName, setSftpName] = useState('');
    const [sftpRootPath, setSftpRootPath] = useState('/');

    // Test Connection State
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await axios.get(`/api/users/${userId}/profile`, {
                    headers: { 'x-user-id': userId }
                });
                const data = res.data;

                setUsername(data.username || '');
                setEmail(data.email || '');
                setRole(data.role || '');
                setTwoFactorEnabled(!!data.two_factor_enabled);
                setAvatar(data.avatar || null);

                // SFTP
                setHost(data.host || '');
                setPort(data.port?.toString() || '22');
                setSftpUser(data.sftp_username || '');
                setSftpName(data.sftp_name || '');
                setSftpRootPath(data.sftp_rootPath || '/');

            } catch (err) {
                console.error(err);
                alert('Failed to load profile');
            } finally {
                setFetching(false);
            }
        };
        fetchProfile();
    }, [userId]);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    setAvatar(e.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleTestConnection = async () => {
        if (!host || !sftpUser || !sftpPass) {
            setTestResult({ success: false, message: 'Please fill in Host, Username, and Password to test.' });
            return;
        }

        setTesting(true);
        setTestResult(null);
        try {
            const res = await axios.post('/api/test-sftp-connection', {
                host,
                port: parseInt(port),
                username: sftpUser,
                password: sftpPass
            }, {
                headers: { 'x-user-id': userId }
            });
            setTestResult({ success: true, message: res.data.message || 'Connection successful!' });
        } catch (err: any) {
            setTestResult({
                success: false,
                message: err.response?.data?.error || 'Connection failed. Please check credentials.'
            });
        } finally {
            setTesting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password && password !== confirmPassword) {
            alert("Passwords don't match!");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('email', email);
            if (password) formData.append('password', password);
            if (avatarFile) formData.append('avatar', avatarFile);

            const sftpConfig = {
                host,
                port: parseInt(port),
                username: sftpUser,
                password: sftpPass || undefined,
                name: sftpName,
                rootPath: sftpRootPath
            };
            formData.append('sftp', JSON.stringify(sftpConfig));

            await axios.put('/api/profile', formData, {
                headers: {
                    'x-user-id': userId,
                    'Content-Type': 'multipart/form-data'
                }
            });

            onSaved();
            onClose();
        } catch (err: any) {
            console.error(err);
            alert(`Failed to save profile: ${err.response?.data?.error || err.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
            <Loader2 className="animate-spin" size={32} color="var(--primary)" />
        </div>
    );

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
            <div className="glass animate-fade" style={{ background: 'var(--bg-dark)', width: '100%', maxWidth: '600px', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                {/* Header */}
                <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-dark)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ padding: '10px', background: 'var(--primary)', borderRadius: '12px', opacity: 0.9 }}>
                            <User size={24} color="white" />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Profile Settings</h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Manage your account and connections</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'var(--nav-hover)', border: 'none', padding: '10px', borderRadius: '50%', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ padding: '0 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '24px' }}>
                    <button
                        onClick={() => setActiveTab('profile')}
                        style={{
                            padding: '16px 4px',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'profile' ? '2px solid var(--primary)' : '2px solid transparent',
                            color: activeTab === 'profile' ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: activeTab === 'profile' ? '700' : '500',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Account Profile
                    </button>
                    <button
                        onClick={() => setActiveTab('sftp')}
                        style={{
                            padding: '16px 4px',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'sftp' ? '2px solid var(--icon-success)' : '2px solid transparent', // Different color for SFTP tab
                            color: activeTab === 'sftp' ? 'var(--icon-success)' : 'var(--text-muted)',
                            fontWeight: activeTab === 'sftp' ? '700' : '500',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        SFTP Configuration
                    </button>
                    <button
                        onClick={() => setActiveTab('notifications')}
                        style={{
                            padding: '16px 4px',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'notifications' ? '2px solid #a855f7' : '2px solid transparent', // Purple for notifications
                            color: activeTab === 'notifications' ? '#a855f7' : 'var(--text-muted)',
                            fontWeight: activeTab === 'notifications' ? '700' : '500',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Notifications
                    </button>
                </div>

                {/* Content */}
                <div style={{ maxHeight: 'calc(85vh - 140px)', overflowY: 'auto' }}>
                    <form onSubmit={handleSubmit} style={{ padding: '32px' }}>

                        {activeTab === 'profile' && (
                            <div className="animate-fade">
                                {/* Avatar Section */}
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
                                    <div style={{ position: 'relative' }}>
                                        <div style={{
                                            width: '100px', height: '100px', borderRadius: '50%',
                                            background: avatar ? `url(${avatar}) center/cover no-repeat` : 'var(--nav-hover)',
                                            border: '3px solid var(--bg-dark)', outline: '2px solid var(--primary)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {!avatar && <User size={40} className="text-[var(--text-muted)]" />}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            style={{
                                                position: 'absolute', bottom: '0', right: '0',
                                                background: 'var(--primary)', color: 'white',
                                                border: '2px solid var(--bg-dark)', borderRadius: '50%',
                                                padding: '8px', cursor: 'pointer',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                            }}
                                        >
                                            <Camera size={14} />
                                        </button>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleAvatarChange}
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div>
                                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '8px' }}>Username (Read-only)</p>
                                            <input className="input-glass" style={{ width: '100%', opacity: 0.7 }} value={username} readOnly disabled />
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '8px' }}>Role</p>
                                            <span style={{
                                                display: 'inline-block', padding: '10px 16px', borderRadius: '12px',
                                                background: 'var(--nav-hover)', color: 'var(--text-main)', fontSize: '14px', fontWeight: '600',
                                                width: '100%', border: '1px solid var(--border)'
                                            }}>
                                                {role.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '8px' }}>Email Address</p>
                                        <div style={{ position: 'relative' }}>
                                            <Mail size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                                            <input
                                                type="email"
                                                className="input-glass"
                                                style={{ width: '100%', paddingLeft: '44px' }}
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                placeholder="Enter your email"
                                            />
                                        </div>
                                    </div>

                                    <div style={{ width: '100%', height: '1px', background: 'var(--border)', margin: '10px 0' }}></div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div>
                                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '8px' }}>New Password</p>
                                            <div style={{ position: 'relative' }}>
                                                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                                                <input
                                                    type="password"
                                                    className="input-glass"
                                                    style={{ width: '100%', paddingLeft: '44px' }}
                                                    value={password}
                                                    onChange={e => setPassword(e.target.value)}
                                                    placeholder="Leave empty to keep"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '8px' }}>Confirm Password</p>
                                            <div style={{ position: 'relative' }}>
                                                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                                                <input
                                                    type="password"
                                                    className="input-glass"
                                                    style={{ width: '100%', paddingLeft: '44px' }}
                                                    value={confirmPassword}
                                                    onChange={e => setConfirmPassword(e.target.value)}
                                                    placeholder="Confirm new password"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'sftp' && (
                            <div className="animate-fade">
                                <div style={{
                                    background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)',
                                    padding: '16px', borderRadius: '12px', marginBottom: '24px',
                                    display: 'flex', gap: '12px', alignItems: 'center'
                                }}>
                                    <Server size={20} color="#10b981" />
                                    <div>
                                        <p style={{ fontSize: '14px', fontWeight: '700', color: '#10b981' }}>SFTP Connection</p>
                                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Configure your remote server settings here</p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div>
                                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '8px' }}>Connection Name</p>
                                        <input
                                            className="input-glass"
                                            style={{ width: '100%' }}
                                            value={sftpName}
                                            onChange={e => setSftpName(e.target.value)}
                                            placeholder="My Server"
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px' }}>
                                        <div>
                                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '8px' }}>Host / IP Address</p>
                                            <input
                                                className="input-glass"
                                                style={{ width: '100%' }}
                                                value={host}
                                                onChange={e => setHost(e.target.value)}
                                                placeholder="sftp.example.com"
                                            />
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '8px' }}>Port</p>
                                            <input
                                                className="input-glass"
                                                style={{ width: '100%', textAlign: 'center' }}
                                                value={port}
                                                onChange={e => setPort(e.target.value)}
                                                placeholder="22"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '8px' }}>Root Path</p>
                                        <input
                                            className="input-glass"
                                            style={{ width: '100%' }}
                                            value={sftpRootPath}
                                            onChange={e => setSftpRootPath(e.target.value)}
                                            placeholder="/var/www/html (Optional)"
                                        />
                                    </div>

                                    <div style={{ width: '100%', height: '1px', background: 'var(--border)', margin: '10px 0' }}></div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div>
                                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '8px' }}>SFTP Username</p>
                                            <div style={{ position: 'relative' }}>
                                                <User size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                                                <input
                                                    className="input-glass"
                                                    style={{ width: '100%', paddingLeft: '44px' }}
                                                    value={sftpUser}
                                                    onChange={e => setSftpUser(e.target.value)}
                                                    placeholder="username"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '8px' }}>SFTP Password</p>
                                            <div style={{ position: 'relative' }}>
                                                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                                                <input
                                                    type="password"
                                                    className="input-glass"
                                                    style={{ width: '100%', paddingLeft: '44px' }}
                                                    value={sftpPass}
                                                    onChange={e => setSftpPass(e.target.value)}
                                                    placeholder="Leave empty to keep"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="animate-fade">
                                <div style={{
                                    background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.2)',
                                    padding: '24px', borderRadius: '16px', marginBottom: '24px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{
                                        width: '64px', height: '64px', background: 'rgba(168, 85, 247, 0.2)',
                                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 16px auto', color: '#a855f7'
                                    }}>
                                        <Bell size={32} />
                                    </div>
                                    <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>Push Notifications</h4>
                                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px', maxWidth: '400px', margin: '8px auto' }}>
                                        Stay updated with real-time alerts for file activities, security warnings, and system updates directly on your device.
                                    </p>

                                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
                                        {permission === 'denied' ? (
                                            <div className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 text-sm font-medium">
                                                ❌ Permission Denied. Please enable in browser settings.
                                            </div>
                                        ) : isSubscribed ? (
                                            <div className="flex flex-col gap-3">
                                                <div className="px-4 py-2 bg-green-500/10 text-green-400 rounded-lg border border-green-500/20 text-sm font-medium font-bold flex items-center gap-2">
                                                    ✓ Notifications Active
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={sendTestNotification}
                                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors text-sm font-medium border border-white/10"
                                                >
                                                    Tap to Test Notification
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={subscribe}
                                                disabled={notifLoading}
                                                style={{
                                                    background: '#a855f7', color: 'white', border: 'none',
                                                    padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: '700',
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                                                    boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)'
                                                }}
                                            >
                                                {notifLoading ? <Loader2 className="animate-spin" size={18} /> : <Bell size={18} />}
                                                Enable Notifications
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="text-center text-xs text-slate-500">
                                    Supported on Android, iOS (Add to Home Screen), and Desktop Chrome/Edge.
                                </div>
                            </div>
                        )}

                        {/* Test Connection Button and Result (Only in SFTP tab) */}
                        {activeTab === 'sftp' && (
                            <div style={{ marginTop: '20px' }}>
                                <button
                                    type="button"
                                    onClick={handleTestConnection}
                                    disabled={testing || !host || !sftpUser}
                                    className="btn-secondary"
                                    style={{
                                        width: '100%',
                                        height: '45px',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        gap: '10px',
                                        background: 'rgba(99, 102, 241, 0.1)',
                                        border: '1px solid rgba(99, 102, 241, 0.3)',
                                        color: '#818cf8',
                                        marginTop: '10px'
                                    }}
                                >
                                    {testing ? (
                                        <>
                                            <Loader2 className="animate-spin" size={20} />
                                            Testing Connection...
                                        </>
                                    ) : (
                                        <>
                                            <Server size={20} />
                                            Test SFTP Connection
                                        </>
                                    )}
                                </button>

                                {testResult && (
                                    <div style={{
                                        marginTop: '12px',
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        background: testResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        border: `1px solid ${testResult.success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                        color: testResult.success ? '#4ade80' : '#f87171',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        {testResult.success ? '✓' : '✗'} {testResult.message}
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={loading}
                                style={{ width: '100%', height: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: '700' }}
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Save Changes</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div >
        </div >
    );
};

export default ProfileSettingsModal;
