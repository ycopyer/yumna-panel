import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Server, User, Lock, Save, Loader2, Shield, Settings } from 'lucide-react';

interface SettingsModalProps {
    userId: number;
    onClose: () => void;
    onSaved: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ userId, onClose, onSaved }) => {
    const [host, setHost] = useState('');
    const [port, setPort] = useState('22');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [userRole] = useState<string>(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        return storedUser.role || '';
    });



    const isAdmin = userRole.toLowerCase() === 'admin';

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await axios.get(`/api/settings/${userId}`);
                if (res.data) {
                    setHost(res.data.host || '');
                    setPort(res.data.port?.toString() || '22');
                    setUsername(res.data.username || '');
                }


            } catch (err) {
                console.error(err);
            } finally {
                setFetching(false);
            }
        };
        if (userId) fetchSettings();
    }, [userId, isAdmin, userRole]);

    const handleTestConnection = async () => {
        if (!host || !username || !password) {
            setTestResult({ success: false, message: 'Please fill in all fields before testing' });
            return;
        }

        setTesting(true);
        setTestResult(null);
        try {
            const res = await axios.post('/api/test-sftp-connection', {
                host,
                port: parseInt(port),
                username,
                password
            });
            setTestResult({ success: true, message: res.data.message || 'Connection successful!' });
        } catch (err: any) {
            setTestResult({
                success: false,
                message: err.response?.data?.error || 'Connection failed. Please check your credentials.'
            });
        } finally {
            setTesting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('/api/settings', {
                userId, host, port: parseInt(port), username, password
            });



            onSaved();
            onClose();
        } catch (err) {
            alert('Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
            <Loader2 className="animate-spin" size={32} color="var(--primary)" />
        </div>
    );

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
            <form className="glass animate-fade" onSubmit={handleSubmit} style={{ background: 'var(--card-bg)', width: '100%', maxWidth: '400px', padding: '30px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Server size={24} color="var(--primary)" />
                        <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>Terminal Configuration [v2]</h3>
                    </div>
                    <button type="button" onClick={onClose} style={{ background: 'var(--nav-hover)', border: 'none', padding: '8px', borderRadius: '50%', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* TEST BANNER - If you see this, hot reload works! */}
                <div style={{
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: 'white',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '14px'
                }}>
                    ✅ HOT RELOAD WORKING - Test Connection button should be visible below!
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>Host</p>
                        <div style={{ position: 'relative' }}>
                            <Shield size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
                            <input
                                className="input-glass"
                                style={{ width: '100%', paddingLeft: '40px' }}
                                placeholder="sftp.example.com"
                                value={host}
                                onChange={e => setHost(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px' }}>
                        <div style={{ flex: 3 }}>
                            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>SFTP Username</p>
                            <div style={{ position: 'relative' }}>
                                <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
                                <input
                                    className="input-glass"
                                    style={{ width: '100%', paddingLeft: '40px' }}
                                    placeholder="Username"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>Port</p>
                            <input
                                className="input-glass"
                                style={{ width: '100%', textAlign: 'center' }}
                                value={port}
                                onChange={e => setPort(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>SFTP Password</p>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                            <input
                                type="password"
                                className="input-glass"
                                style={{ width: '100%', paddingLeft: '40px' }}
                                placeholder="Leave blank to keep current"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Test Connection Button */}
                    <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={testing || !host || !username || !password}
                        className="btn-secondary"
                        style={{
                            height: '45px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '10px',
                            background: 'var(--nav-hover)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        {testing ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                Testing Connection...
                            </>
                        ) : (
                            <>
                                <Settings size={20} />
                                Test Connection
                            </>
                        )}
                    </button>

                    {/* Test Result Display */}
                    {testResult && (
                        <div style={{
                            padding: '12px 16px',
                            borderRadius: '8px',
                            background: testResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${testResult.success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            color: testResult.success ? '#22c55e' : '#ef4444',
                            fontSize: '14px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            {testResult.success ? '✓' : '✗'} {testResult.message}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{ marginTop: '10px', height: '45px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Save Configuration</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SettingsModal;
