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
    max_websites?: number;
    max_subdomains?: number;
    max_cron_jobs?: number;
    max_databases?: number;
    max_ssh_accounts?: number;
    max_email_accounts?: number;
    max_dns_zones?: number;
    plan_name?: string;
    parentId?: number;
    parentName?: string;
    status?: 'active' | 'suspended';
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
    currentUserRole: string;
    onClose: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ userId, currentUserRole, onClose }) => {
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

    // Quota Form states
    const [storageQuota, setStorageQuota] = useState<number>(1);
    const [quotaUnit, setQuotaUnit] = useState<'MB' | 'GB'>('GB');
    const [maxWebsites, setMaxWebsites] = useState<number>(3);
    const [maxSubdomains, setMaxSubdomains] = useState<number>(10);
    const [maxCronJobs, setMaxCronJobs] = useState<number>(2);
    const [maxDatabases, setMaxDatabases] = useState<number>(3);
    const [maxSSHAccounts, setMaxSSHAccounts] = useState<number>(1);
    const [maxEmailAccounts, setMaxEmailAccounts] = useState<number>(5);
    const [maxDNSZones, setMaxDNSZones] = useState<number>(5);
    const [planName, setPlanName] = useState('Basic');

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
        setMaxWebsites(3);
        setMaxSubdomains(10);
        setMaxCronJobs(2);
        setMaxDatabases(3);
        setMaxSSHAccounts(1);
        setMaxEmailAccounts(5);
        setMaxDNSZones(5);
        setPlanName('Basic');
        setStatus('active');
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
                status,
                storage_quota: finalQuota,
                max_websites: maxWebsites,
                max_subdomains: maxSubdomains,
                max_cron_jobs: maxCronJobs,
                max_databases: maxDatabases,
                max_ssh_accounts: maxSSHAccounts,
                max_email_accounts: maxEmailAccounts,
                max_dns_zones: maxDNSZones,
                plan_name: planName,
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

    const handleToggleStatus = async (user: UserData) => {
        const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
        const action = newStatus === 'active' ? 'activate' : 'suspend';
        if (!confirm(`Are you sure you want to ${action} this user?`)) return;

        try {
            // We reuse the update endpoint. We need to send other fields too or ensure the backend handles partial updates.
            // The backend query is: 'UPDATE users SET username=?, role=?, email=?, status=?, ...'
            // It expects ALL fields. So we must send the full object.

            const userData = {
                username: user.username,
                role: user.role,
                email: user.email,
                status: newStatus,
                two_factor_enabled: user.two_factor_enabled,
                storage_quota: user.storage_quota,
                max_websites: user.max_websites,
                max_subdomains: user.max_subdomains,
                max_cron_jobs: user.max_cron_jobs,
                max_databases: user.max_databases,
                max_ssh_accounts: user.max_ssh_accounts,
                max_email_accounts: user.max_email_accounts,
                max_dns_zones: user.max_dns_zones,
                plan_name: user.plan_name,
                // Password optional, sftp config not needed for status update if backend allows
                // Our backend UPDATE seems to overwrite everything. So we must include everything.
                // We don't have sftp password here, but we can iterate user.sftp config if needed.
                // Wait, backend PUT /users/:id doesn't touch SFTP table. It only updates USERS table.
                // So this is safe.
            };

            await axios.put(`/api/users/${user.id}`, userData, { headers: { 'x-user-id': userId } });
            fetchUsers();
        } catch (err) {
            console.error(err);
            alert('Failed to update status');
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

        // Quotas
        setMaxWebsites(user.max_websites || 3);
        setMaxSubdomains(user.max_subdomains || 10);
        setMaxCronJobs(user.max_cron_jobs || 2);
        setMaxDatabases(user.max_databases || 3);
        setMaxSSHAccounts(user.max_ssh_accounts || 1);
        setMaxEmailAccounts(user.max_email_accounts || 5);
        setMaxDNSZones(user.max_dns_zones || 5);
        setPlanName(user.plan_name || 'Basic');
        setStatus(user.status || 'active');

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

    const [activeTab, setActiveTab] = useState<'details' | 'quota' | 'sftp'>('details');
    // Status State
    const [status, setStatus] = useState<'active' | 'suspended'>('active');

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
            <div className="glass animate-fade" style={{ width: '100%', maxWidth: '850px', background: 'var(--bg-dark)', maxHeight: '95vh', overflowY: 'auto', padding: '0' }}>
                <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg-dark)', zIndex: 10 }}>
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
                                    : 'Manage users, quotas, and access controls'}
                            </p>
                        </div>
                    </div>
                    <button onClick={() => viewingSessionsUser ? setViewingSessionsUser(null) : onClose()} style={{ background: 'var(--nav-hover)', border: 'none', color: 'var(--text-muted)', padding: '10px', borderRadius: '50%', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ padding: '32px' }}>
                    {viewingSessionsUser ? (
                        /* ... existing session view code ... */
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
                        <form onSubmit={handleSave} style={{ background: 'var(--nav-hover)', padding: '0', borderRadius: '20px', marginBottom: '32px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                            <div className="flex border-b border-[var(--border)]">
                                <button type="button" onClick={() => setActiveTab('details')} className={`flex-1 p-4 text-sm font-bold transition-all ${activeTab === 'details' ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-b-2 border-[var(--primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-dark)]'}`}>User Details</button>
                                <button type="button" onClick={() => setActiveTab('quota')} className={`flex-1 p-4 text-sm font-bold transition-all ${activeTab === 'quota' ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-b-2 border-[var(--primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-dark)]'}`}>Quotas & Limits</button>
                                <button type="button" onClick={() => setActiveTab('sftp')} className={`flex-1 p-4 text-sm font-bold transition-all ${activeTab === 'sftp' ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-b-2 border-[var(--primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-dark)]'}`}>SFTP Access</button>
                            </div>

                            <div className="p-8">
                                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)' }}>
                                    {editingUser ? <Edit2 size={20} color="var(--primary)" /> : <Plus size={20} color="var(--primary)" />}
                                    {editingUser ? `Edit User: ${editingUser.username}` : 'Create New User'}
                                </h3>

                                {activeTab === 'details' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <div>
                                                <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>Username</p>
                                                <input className="input-glass" style={{ width: '100%', height: '44px' }} value={username} onChange={e => setUsername(e.target.value)} required />
                                            </div>

                                            <div>
                                                <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>Role</p>
                                                <select className="input-glass" style={{ width: '100%', padding: '0 12px', height: '44px', color: 'var(--text-main)' }} value={role} onChange={e => setRole(e.target.value)} disabled={currentUserRole === 'reseller'}>
                                                    {currentUserRole === 'admin' && <option value="admin" style={{ background: 'var(--bg-dark)' }}>Administrator</option>}
                                                    {currentUserRole === 'admin' && <option value="reseller" style={{ background: 'var(--bg-dark)' }}>Reseller</option>}
                                                    <option value="user" style={{ background: 'var(--bg-dark)' }}>Regular User</option>
                                                </select>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginTop: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <input type="checkbox" id="2fa-toggle" checked={twoFactorEnabled} onChange={e => setTwoFactorEnabled(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                                                    <label htmlFor="2fa-toggle" style={{ fontSize: '13px', fontWeight: '800', color: 'var(--primary)', cursor: 'pointer', textTransform: 'uppercase' }}>Enable 2FA</label>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <input type="checkbox" id="status-toggle" checked={status === 'active'} onChange={e => setStatus(e.target.checked ? 'active' : 'suspended')} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                                                    <label htmlFor="status-toggle" style={{ fontSize: '13px', fontWeight: '800', color: status === 'active' ? 'var(--icon-success)' : 'var(--icon-danger)', cursor: 'pointer', textTransform: 'uppercase' }}>account {status}</label>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <div>
                                                <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>Password {editingUser && '(Empty to keep)'}</p>
                                                <div style={{ position: 'relative' }}>
                                                    <Key size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                                                    <input type="password" className="input-glass" style={{ width: '100%', paddingLeft: '40px', height: '44px' }} value={password} onChange={e => setPassword(e.target.value)} required={!editingUser} placeholder="••••••••" />
                                                </div>
                                            </div>

                                            <div>
                                                <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>Email Address</p>
                                                <input className="input-glass" style={{ width: '100%', height: '44px' }} value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'quota' && (
                                    <div className="space-y-6">
                                        <div>
                                            <p className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Service Plan Name</p>
                                            <input className="input-glass w-full h-11" value={planName} onChange={e => setPlanName(e.target.value)} placeholder="e.g. Starter, Premium, Enterprise" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <p className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Max Websites</p>
                                                <input type="number" className="input-glass w-full h-11" value={maxWebsites} onChange={e => setMaxWebsites(Number(e.target.value))} min="0" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Max Subdomains</p>
                                                <input type="number" className="input-glass w-full h-11" value={maxSubdomains} onChange={e => setMaxSubdomains(Number(e.target.value))} min="0" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <p className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Max Databases</p>
                                                <input type="number" className="input-glass w-full h-11" value={maxDatabases} onChange={e => setMaxDatabases(Number(e.target.value))} min="0" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Max Cron Jobs</p>
                                                <input type="number" className="input-glass w-full h-11" value={maxCronJobs} onChange={e => setMaxCronJobs(Number(e.target.value))} min="0" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <p className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Max SSH Accounts</p>
                                                <input type="number" className="input-glass w-full h-11" value={maxSSHAccounts} onChange={e => setMaxSSHAccounts(Number(e.target.value))} min="0" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Max Email Accounts</p>
                                                <input type="number" className="input-glass w-full h-11" value={maxEmailAccounts} onChange={e => setMaxEmailAccounts(Number(e.target.value))} min="0" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <p className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Max DNS Zones</p>
                                                <input type="number" className="input-glass w-full h-11" value={maxDNSZones} onChange={e => setMaxDNSZones(Number(e.target.value))} min="0" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Storage Quota</p>
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <input type="number" className="input-glass" style={{ flex: 2, height: '44px' }} value={storageQuota} onChange={e => setStorageQuota(Number(e.target.value))} min="0.1" step="0.1" />
                                                    <select className="input-glass" style={{ flex: 1, padding: '0 12px', height: '44px', color: 'var(--text-main)' }} value={quotaUnit} onChange={e => setQuotaUnit(e.target.value as 'MB' | 'GB')}>
                                                        <option value="MB" style={{ background: 'var(--bg-dark)' }}>MB</option>
                                                        <option value="GB" style={{ background: 'var(--bg-dark)' }}>GB</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-xl bg-[var(--bg-dark)] border border-[var(--border)]">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Shield size={16} className="text-[var(--primary)]" />
                                                <span className="text-sm font-bold text-[var(--text-main)]">Plan Summary: {planName || 'Custom'}</span>
                                            </div>
                                            <p className="text-xs text-[var(--text-muted)]">
                                                Limits: <strong>{maxWebsites} Websites</strong>, <strong>{maxSubdomains} Subdomains</strong>, <strong>{maxDatabases} DBs</strong>, <strong>{maxSSHAccounts} SSH</strong>, <strong>{maxEmailAccounts} Emails</strong>.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'sftp' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '16px', padding: '24px 32px', background: 'var(--bg-dark)', borderTop: '1px solid var(--border)' }}>
                                <button type="submit" disabled={submitting} className="btn-primary" style={{ flex: 2, height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '15px', fontWeight: '700' }}>{submitting ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> {editingUser ? 'Save Changes' : 'Create User'}</>}</button>
                                <button type="button" onClick={resetForm} style={{ flex: 1, background: 'var(--nav-hover)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-main)', cursor: 'pointer', fontSize: '15px', fontWeight: '600' }}>Cancel</button>
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
                                        <div style={{ background: 'var(--nav-hover)', padding: '10px', borderRadius: '10px', position: 'relative' }}>
                                            <Shield size={20} color={u.role === 'admin' ? 'var(--icon-danger)' : u.role === 'user' ? 'var(--icon-success)' : 'var(--icon-file)'} />
                                            {u.plan_name && <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-blue-500 rounded text-[8px] font-bold text-white uppercase">{u.plan_name}</div>}
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <p style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '15px' }}>{u.username}</p>
                                                {u.host && <span style={{ fontSize: '10px', fontWeight: '800', background: 'var(--nav-hover)', color: 'var(--icon-success)', padding: '2px 8px', borderRadius: '20px', border: '1px solid var(--border)', textTransform: 'uppercase' }}>SFTP Active</span>}
                                            </div>
                                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500', marginTop: '2px' }}>
                                                Authorized as <span style={{ textTransform: 'capitalize', color: 'var(--text-main)', fontWeight: '600' }}>{u.role}</span>
                                                {u.parentName && <span style={{ marginLeft: '8px', borderLeft: '1px solid var(--border)', paddingLeft: '8px' }}>Creator: <strong className="text-[var(--primary)]">{u.parentName}</strong></span>}
                                                {u.email && <span style={{ marginLeft: '8px', borderLeft: '1px solid var(--border)', paddingLeft: '8px' }}>{u.email}</span>}
                                            </p>
                                            <div className="flex gap-2 mt-2">
                                                {u.storage_quota && <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Storage: <strong style={{ color: 'var(--text-main)' }}>{formatBytes(u.used_storage || 0)}</strong> / {formatBytes(u.storage_quota)}</p>}
                                                {u.max_websites && <p style={{ fontSize: '11px', color: 'var(--text-muted)', borderLeft: '1px solid var(--border)', paddingLeft: '8px' }}>Web: <strong style={{ color: 'var(--text-main)' }}>{u.website_count || 0}/{u.max_websites}</strong></p>}
                                            </div>
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
                                            <>
                                                <button onClick={() => handleToggleStatus(u)} style={{ background: 'var(--nav-hover)', border: '1px solid var(--border)', color: u.status === 'suspended' ? 'var(--icon-success)' : 'orange', padding: '10px', borderRadius: '10px', cursor: 'pointer', transition: '0.2s' }} className="icon-btn-hover" title={u.status === 'suspended' ? "Activate User" : "Suspend User"}>
                                                    {u.status === 'suspended' ? <User size={16} /> : <LogOut size={16} />}
                                                </button>
                                                <button onClick={() => handleDelete(u.id)} style={{ background: 'var(--nav-hover)', border: '1px solid var(--border)', color: 'var(--icon-danger)', padding: '10px', borderRadius: '10px', cursor: 'pointer', transition: '0.2s' }} className="icon-btn-delete">
                                                    <Trash2 size={16} />
                                                </button>
                                            </>
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
