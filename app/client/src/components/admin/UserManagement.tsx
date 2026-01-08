import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Shield, Trash2, Edit2, Plus, X, Save, Loader2, Key, Smartphone, Globe, Clock, LogOut } from 'lucide-react';

interface UserData {
    id: number;
    username: string;
    role: string;
    createdAt: string;
    email?: string;
    two_factor_enabled?: boolean;
    host?: string;
    port?: number;
    sftp_username?: string;
    sftp_name?: string;
    sftp_rootPath?: string;
    storage_quota?: number;
    used_storage?: number;
    website_count?: number;
}

const formatBytes = (bytes: number) => {
    if (!bytes && bytes !== 0) return '0 B';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface UserManagementProps {
    userId: number;
    onClose: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ userId, onClose }) => {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [viewingSessionsUser, setViewingSessionsUser] = useState<UserData | null>(null);
    const [userSessions, setUserSessions] = useState<any[]>([]);

    // Form states
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user');
    const [email, setEmail] = useState('');
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [storageQuota, setStorageQuota] = useState<number>(1);
    const [quotaUnit, setQuotaUnit] = useState<'MB' | 'GB'>('GB');
    const [submitting, setSubmitting] = useState(false);

    // SFTP Form states
    const [sftpHost, setSftpHost] = useState('');
    const [sftpPort, setSftpPort] = useState('22');
    const [sftpUser, setSftpUser] = useState('');
    const [sftpPass, setSftpPass] = useState('');
    const [sftpName, setSftpName] = useState('SFTP Server');
    const [sftpRootPath, setSftpRootPath] = useState('/');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/users', { headers: { 'x-user-id': userId } });
            setUsers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleManageSessions = async (user: UserData) => {
        setViewingSessionsUser(user);
        try {
            const res = await axios.get(`/api/admin/users/${user.id}/sessions`, {
                headers: { 'x-user-id': userId }
            });
            setUserSessions(res.data);
        } catch (err) {
            alert('Failed to fetch sessions');
        }
    };

    const handleRevokeSession = async (sessionId: string) => {
        if (!confirm('Are you sure? This will immediately log the user out from that device.')) return;
        try {
            await axios.delete(`/api/admin/sessions/${sessionId}`, {
                headers: { 'x-user-id': userId }
            });
            if (viewingSessionsUser) {
                const res = await axios.get(`/api/admin/users/${viewingSessionsUser.id}/sessions`, {
                    headers: { 'x-user-id': userId }
                });
                setUserSessions(res.data);
            }
        } catch (err) {
            alert('Failed to revoke session');
        }
    };

    const resetForm = () => {
        setUsername('');
        setPassword('');
        setRole('user');
        setEmail('');
        setTwoFactorEnabled(false);
        setSftpHost('');
        setSftpPort('22');
        setSftpUser('');
        setSftpPass('');
        setSftpName('SFTP Server');
        setSftpRootPath('/');
        setStorageQuota(1);
        setQuotaUnit('GB');
        setEditingUser(null);
        setIsAdding(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const bytesPerUnit = quotaUnit === 'GB' ? 1073741824 : 1048576;
            const finalQuota = Math.floor(storageQuota * bytesPerUnit);

            const userData = {
                username, role, email, two_factor_enabled: twoFactorEnabled,
                storage_quota: finalQuota,
                password: password || undefined,
                sftp: {
                    host: sftpHost, port: parseInt(sftpPort),
                    username: sftpUser, password: sftpPass || undefined,
                    name: sftpName, rootPath: sftpRootPath
                }
            };

            if (editingUser) {
                await axios.put(`/api/users/${editingUser.id}`, userData, { headers: { 'x-user-id': userId } });
            } else {
                await axios.post('/api/users', userData, { headers: { 'x-user-id': userId } });
            }
            fetchUsers();
            resetForm();
        } catch (err) {
            alert('Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await axios.delete(`/api/users/${id}`, { headers: { 'x-user-id': userId } });
            fetchUsers();
        } catch (err) {
            alert('Delete failed');
        }
    };

    const startEdit = (user: UserData) => {
        setEditingUser(user);
        setUsername(user.username);
        setRole(user.role);
        setEmail(user.email || '');
        setTwoFactorEnabled(!!user.two_factor_enabled);
        setPassword('');
        setSftpHost(user.host || '');
        setSftpPort(user.port?.toString() || '22');
        setSftpUser(user.sftp_username || '');
        setSftpPass('');
        setSftpName(user.sftp_name || 'SFTP Server');
        setSftpRootPath(user.sftp_rootPath || '/');

        const quotaBytes = user.storage_quota || 1073741824;
        if (quotaBytes >= 1073741824) {
            setQuotaUnit('GB');
            setStorageQuota(Number((quotaBytes / 1073741824).toFixed(2)));
        } else {
            setQuotaUnit('MB');
            setStorageQuota(Number((quotaBytes / 1048576).toFixed(2)));
        }
        setIsAdding(false);
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
            <div className="glass animate-fade" style={{ width: '100%', maxWidth: '750px', background: 'var(--bg-dark)', maxHeight: '95vh', overflowY: 'auto', padding: '0' }}>
                <div style={{ padding: '32px 40px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg-dark)', zIndex: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '12px', borderRadius: '12px' }}>
                            <User color="#6366f1" size={24} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
                                {viewingSessionsUser ? 'Active Sessions' : 'User Management'}
                            </h2>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                {viewingSessionsUser
                                    ? `Monitoring access for ${viewingSessionsUser.username}`
                                    : 'Manage system access and SFTP credentials'}
                            </p>
                        </div>
                    </div>
                    <button onClick={() => viewingSessionsUser ? setViewingSessionsUser(null) : onClose()} style={{ background: 'var(--nav-hover)', border: 'none', color: 'var(--text-muted)', padding: '10px', borderRadius: '50%', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ padding: '40px' }}>
                    {viewingSessionsUser ? (
                        <div className="flex flex-col gap-4">
                            <button
                                onClick={() => setViewingSessionsUser(null)}
                                className="mb-4 text-sm font-bold text-[var(--primary)] hover:underline flex items-center gap-2"
                            >
                                ← Back to User List
                            </button>

                            {userSessions.length === 0 ? (
                                <div className="text-center p-8 bg-[var(--nav-hover)] rounded-xl border border-[var(--border)]">
                                    <Shield size={48} className="mx-auto mb-4 text-[var(--text-muted)] opacity-50" />
                                    <p className="font-bold text-[var(--text-main)]">No active sessions found.</p>
                                    <p className="text-sm text-[var(--text-muted)]">User is currently offline.</p>
                                </div>
                            ) : (
                                userSessions.map(session => (
                                    <div key={session.sessionId} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--nav-hover)] flex justify-between items-center group">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-[var(--bg-dark)] p-3 rounded-lg border border-[var(--border)]">
                                                {session.deviceInfo.toLowerCase().includes('mobile') ? <Smartphone size={20} className="text-[var(--primary)]" /> : <Globe size={20} className="text-[var(--primary)]" />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-[var(--text-main)] text-sm mb-1">{session.deviceInfo}</p>
                                                <div className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
                                                    <div className="flex items-center gap-1.5">
                                                        <Globe size={10} />
                                                        <span>IP: {session.ipAddress || 'Unknown'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock size={10} />
                                                        <span>Last Active: {new Date(session.lastActive).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRevokeSession(session.sessionId)}
                                            className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-transparent hover:border-red-500"
                                            title="Revoke Session (Force Logout)"
                                        >
                                            <LogOut size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (isAdding || editingUser) ? (
                        <form onSubmit={handleSave} style={{ background: 'var(--nav-hover)', padding: '32px', borderRadius: '20px', marginBottom: '32px', border: '1px solid var(--border)' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)' }}>
                                {editingUser ? <Edit2 size={20} color="var(--primary)" /> : <Plus size={20} color="var(--primary)" />}
                                {editingUser ? `Configure Access: ${editingUser.username}` : 'Register New Team Member'}
                            </h3>
                            {editingUser && editingUser.id === userId && (
                                <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '12px', borderRadius: '12px', marginBottom: '24px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <div style={{ flexShrink: 0 }}><Shield size={18} className="text-blue-400" /></div>
                                    <p style={{ fontSize: '13px', color: '#93c5fd', margin: 0 }}>
                                        <strong>Looking for Notifications?</strong><br />
                                        Push Notifications & Avatar settings are in your <span style={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => { onClose(); }}>Personal Profile</span> (Sidebar Bottom).
                                    </p>
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <h4 style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>System Access</h4>
                                    <div>
                                        <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>User Identifier</p>
                                        <input className="input-glass" style={{ width: '100%', height: '44px' }} value={username} onChange={e => setUsername(e.target.value)} required />
                                    </div>

                                    <div>
                                        <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>Security Credentials {editingUser && '(Keep empty to ignore)'}</p>
                                        <div style={{ position: 'relative' }}>
                                            <Key size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                                            <input type="password" className="input-glass" style={{ width: '100%', paddingLeft: '40px', height: '44px' }} value={password} onChange={e => setPassword(e.target.value)} required={!editingUser} placeholder="••••••••" />
                                        </div>
                                    </div>

                                    <div>
                                        <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>Role</p>
                                        <select className="input-glass" style={{ width: '100%', padding: '0 12px', height: '44px', color: 'var(--text-main)' }} value={role} onChange={e => setRole(e.target.value)}>
                                            <option value="admin" style={{ background: 'var(--bg-dark)' }}>Administrator</option>
                                            <option value="user" style={{ background: 'var(--bg-dark)' }}>Regular User</option>
                                            <option value="viewer" style={{ background: 'var(--bg-dark)' }}>Auditor (Read-only)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>Email Address</p>
                                        <input className="input-glass" style={{ width: '100%', height: '44px' }} value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" />
                                    </div>

                                    <div>
                                        <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>Storage Quota</p>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <input type="number" className="input-glass" style={{ flex: 2, height: '44px' }} value={storageQuota} onChange={e => setStorageQuota(Number(e.target.value))} min="0.1" step="0.1" />
                                            <select className="input-glass" style={{ flex: 1, padding: '0 12px', height: '44px', color: 'var(--text-main)' }} value={quotaUnit} onChange={e => setQuotaUnit(e.target.value as 'MB' | 'GB')}>
                                                <option value="MB" style={{ background: 'var(--bg-dark)' }}>MB</option>
                                                <option value="GB" style={{ background: 'var(--bg-dark)' }}>GB</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                                        <input type="checkbox" id="2fa-toggle" checked={twoFactorEnabled} onChange={e => setTwoFactorEnabled(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                                        <label htmlFor="2fa-toggle" style={{ fontSize: '13px', fontWeight: '800', color: 'var(--primary)', cursor: 'pointer', textTransform: 'uppercase' }}>Enable 2FA</label>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <h4 style={{ fontSize: '12px', fontWeight: '800', color: 'var(--icon-success)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>SFTP Backbone</h4>
                                    <div>
                                        <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>Store Name</p>
                                        <input className="input-glass" style={{ width: '100%', height: '44px' }} value={sftpName} onChange={e => setSftpName(e.target.value)} placeholder="e.g. Office Server" />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '12px' }}>
                                        <div>
                                            <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>Host IP</p>
                                            <input className="input-glass" style={{ width: '100%', height: '44px' }} value={sftpHost} onChange={e => setSftpHost(e.target.value)} placeholder="e.g. 192.168.1.1" />
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '8px' }}>Port</p>
                                            <input className="input-glass" style={{ width: '100%', height: '44px' }} value={sftpPort} onChange={e => setSftpPort(e.target.value)} placeholder="22" />
                                        </div>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>Username</p>
                                        <input className="input-glass" style={{ width: '100%', height: '44px' }} value={sftpUser} onChange={e => setSftpUser(e.target.value)} />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>Password {editingUser && '(Empty to retain)'}</p>
                                        <input type="password" className="input-glass" style={{ width: '100%', height: '44px' }} value={sftpPass} onChange={e => setSftpPass(e.target.value)} placeholder="••••••••" />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>Remote Path</p>
                                        <input className="input-glass" style={{ width: '100%', height: '44px' }} value={sftpRootPath} onChange={e => setSftpRootPath(e.target.value)} placeholder="/home/username" />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '16px', marginTop: '32px', paddingTop: '32px', borderTop: '1px solid var(--border)' }}>
                                <button type="submit" disabled={submitting} className="btn-primary" style={{ flex: 2, height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '15px', fontWeight: '700' }}>{submitting ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> {editingUser ? 'Sync Configuration' : 'Confirm Registration'}</>}</button>
                                <button type="button" onClick={resetForm} style={{ flex: 1, background: 'var(--border)', border: 'none', borderRadius: '12px', color: 'var(--text-main)', cursor: 'pointer', fontSize: '15px', fontWeight: '600' }}>Disregard</button>
                            </div>
                        </form>
                    ) : (
                        <div style={{ marginBottom: '24px' }}>
                            <button onClick={() => setIsAdding(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '14px' }}>
                                <Plus size={18} /> Add New User
                            </button>
                        </div>
                    )}

                    {!viewingSessionsUser && !isAdding && !editingUser && (loading ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <Loader2 className="animate-spin" size={32} color="var(--primary)" />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {users.map(u => (
                                <div key={u.id} className="glass" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--nav-hover)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ background: 'var(--nav-hover)', padding: '10px', borderRadius: '10px' }}>
                                            <Shield size={20} color={u.role === 'admin' ? 'var(--icon-danger)' : u.role === 'user' ? 'var(--icon-success)' : 'var(--icon-file)'} />
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <p style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '15px' }}>{u.username}</p>
                                                {u.host && <span style={{ fontSize: '10px', fontWeight: '800', background: 'var(--nav-hover)', color: 'var(--icon-success)', padding: '2px 8px', borderRadius: '20px', border: '1px solid var(--border)', textTransform: 'uppercase' }}>SFTP Active</span>}
                                            </div>
                                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500', marginTop: '2px' }}>
                                                Authorized as <span style={{ textTransform: 'capitalize', color: 'var(--text-main)', fontWeight: '600' }}>{u.role}</span>
                                                {u.email && <span style={{ marginLeft: '8px', borderLeft: '1px solid var(--border)', paddingLeft: '8px' }}>{u.email}</span>}
                                                {u.two_factor_enabled && <span style={{ marginLeft: '8px', color: 'var(--primary)', fontWeight: '800', fontSize: '10px' }}>• 2FA ON</span>}
                                            </p>
                                            {u.storage_quota && <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Storage: <strong style={{ color: 'var(--text-main)' }}>{formatBytes(u.used_storage || 0)}</strong> / {formatBytes(u.storage_quota)}</p>}
                                            {u.website_count !== undefined && (
                                                <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                                                    <span style={{ fontSize: '10px', fontWeight: '800', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '3px 10px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                                        <Globe size={10} /> {u.website_count} Websites
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => handleManageSessions(u)} style={{ background: 'var(--nav-hover)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '10px', borderRadius: '10px', cursor: 'pointer', transition: '0.2s' }} className="icon-btn-hover" title="Manage Sessions">
                                            <Shield size={16} />
                                        </button>
                                        <button onClick={() => startEdit(u)} style={{ background: 'var(--nav-hover)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '10px', borderRadius: '10px', cursor: 'pointer', transition: '0.2s' }} className="icon-btn-hover">
                                            <Edit2 size={16} />
                                        </button>
                                        {u.id !== 1 && (
                                            <button onClick={() => handleDelete(u.id)} style={{ background: 'var(--nav-hover)', border: '1px solid var(--border)', color: 'var(--icon-danger)', padding: '10px', borderRadius: '10px', cursor: 'pointer', transition: '0.2s' }} className="icon-btn-delete">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            <style>{`
                .icon-btn-hover:hover { color: #6366f1 !important; background: rgba(99, 102, 241, 0.1) !important; border-color: rgba(99, 102, 241, 0.2) !important; }
                .icon-btn-delete:hover { background: rgba(239, 68, 68, 0.15) !important; border-color: rgba(239, 68, 68, 0.3) !important; }
            `}</style>
        </div>
    );
};

export default UserManagement;
