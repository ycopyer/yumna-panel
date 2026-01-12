import React, { useState } from 'react';
import { X, Globe, Folder, Cpu, Loader2, Shield, RefreshCw, Server } from 'lucide-react';
import axios from 'axios';

interface AddWebsiteModalProps {
    userId: number;
    userRole: string;
    onClose: () => void;
    onSuccess: () => void;
}

interface ServerNode {
    id: number;
    name: string;
    hostname: string;
    ip: string;
    is_local: boolean;
    status: string;
    cpu_usage: number;
    ram_usage: number;
    disk_usage: number;
}

const AddWebsiteModal: React.FC<AddWebsiteModalProps> = ({ userId, userRole, onClose, onSuccess }) => {
    const [domain, setDomain] = useState('');
    const [rootPath, setRootPath] = useState('');
    const [phpVersion, setPhpVersion] = useState('8.2');
    const [webStack, setWebStack] = useState<'nginx' | 'apache' | 'hybrid'>('nginx');
    const [serverId, setServerId] = useState<number>(1);
    const [targetUserId, setTargetUserId] = useState<number>(userId);
    const [users, setUsers] = useState<any[]>([]);
    const [servers, setServers] = useState<ServerNode[]>([]);
    const [loading, setLoading] = useState(false);

    const isAdmin = userRole === 'admin';

    const [defaultBaseDir, setDefaultBaseDir] = useState('');

    React.useEffect(() => {
        // Fetch server defaults
        axios.get('/api/websites/defaults')
            .then(res => setDefaultBaseDir(res.data.baseDir))
            .catch(err => console.error('Failed to fetch defaults', err));

        // Fetch available servers
        axios.get('/api/websites/servers', { headers: { 'x-user-id': userId } })
            .then(res => {
                setServers(res.data);
                // Set default to first server (usually local)
                if (res.data.length > 0) {
                    setServerId(res.data[0].id);
                }
            })
            .catch(err => console.error('Failed to fetch servers', err));

        if (isAdmin) {
            axios.get('/api/users', { headers: { 'x-user-id': userId } })
                .then(res => setUsers(res.data))
                .catch(err => console.error('Failed to fetch users', err));
        }
    }, [isAdmin, userId]);



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.post('/api/websites', {
                domain,
                rootPath,
                phpVersion,
                webStack,
                serverId,
                targetUserId: isAdmin ? targetUserId : userId
            }, {
                headers: { 'x-user-id': userId }
            });

            // Show success message with server info
            const serverInfo = response.data.server;
            alert(`Website created successfully on ${serverInfo.name} (${serverInfo.ip})!`);

            onSuccess();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to add website');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
            <div className="glass animate-scale-up" style={{ width: '100%', maxWidth: '480px', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                {/* Header */}
                <div style={{ padding: '24px', background: 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '10px', background: 'rgba(255,255,255,0.15)', borderRadius: '12px' }}>
                            <Globe size={24} color="white" />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'white', margin: 0 }}>Add New Website</h3>
                            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>Configure a new virtual host</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ padding: '8px', background: 'rgba(0,0,0,0.1)', borderRadius: '10px', color: 'white', border: 'none', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Domain Name</label>
                            <div style={{ position: 'relative' }}>
                                <Globe size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    required
                                    className="input-glass"
                                    style={{ width: '100%', padding: '14px 14px 14px 44px', borderRadius: '14px' }}
                                    placeholder="example.com"
                                    value={domain}
                                    onChange={e => {
                                        setDomain(e.target.value);
                                        if (defaultBaseDir) setRootPath(`${defaultBaseDir}/${e.target.value}`);
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Document Root</label>
                            <div style={{ position: 'relative' }}>
                                <Folder size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    required
                                    className="input-glass"
                                    style={{ width: '100%', padding: '14px 14px 14px 44px', borderRadius: '14px' }}
                                    placeholder={defaultBaseDir ? `${defaultBaseDir}/domain.com` : "/var/www/domain"}
                                    value={rootPath}
                                    onChange={e => setRootPath(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PHP Version</label>
                            <div style={{ position: 'relative' }}>
                                <Cpu size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <select
                                    className="input-glass"
                                    style={{ width: '100%', padding: '14px 14px 14px 44px', borderRadius: '14px', appearance: 'none', cursor: 'pointer' }}
                                    value={phpVersion}
                                    onChange={e => setPhpVersion(e.target.value)}
                                >
                                    <option value="8.3">PHP 8.3 (Latest)</option>
                                    <option value="8.2">PHP 8.2 (Stable)</option>
                                    <option value="8.1">PHP 8.1</option>
                                    <option value="8.0">PHP 8.0</option>
                                    <option value="7.4">PHP 7.4 (Legacy)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Web Server Stack</label>
                            <div style={{ position: 'relative' }}>
                                <RefreshCw size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <select
                                    className="input-glass"
                                    style={{ width: '100%', padding: '14px 14px 14px 44px', borderRadius: '14px', appearance: 'none', cursor: 'pointer' }}
                                    value={webStack}
                                    onChange={e => setWebStack(e.target.value as any)}
                                >
                                    <option value="nginx">Nginx Only (High Performance)</option>
                                    <option value="apache">Apache Only (Maximum Compatibility)</option>
                                    <option value="hybrid">Nginx + Apache (Hybrid Power)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Deploy to Server
                                {servers.length > 1 && <span style={{ marginLeft: '8px', fontSize: '10px', color: 'var(--primary)', fontWeight: 'normal' }}>({servers.length} available)</span>}
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Server size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1 }} />
                                <select
                                    className="input-glass"
                                    style={{ width: '100%', padding: '14px 14px 14px 44px', borderRadius: '14px', appearance: 'none', cursor: 'pointer' }}
                                    value={serverId}
                                    onChange={e => setServerId(Number(e.target.value))}
                                >
                                    {servers.map(server => (
                                        <option key={server.id} value={server.id} style={{ background: 'var(--bg-dark)' }}>
                                            {server.name} ({server.ip}) {server.is_local ? '🏠 Local' : '🌐 Remote'} - CPU: {Math.round(server.cpu_usage)}% | RAM: {Math.round(server.ram_usage)}%
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {servers.length === 0 && (
                                <p style={{ marginTop: '8px', fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>
                                    ⚠️ No active servers available. Please add a server first.
                                </p>
                            )}
                            {servers.find(s => s.id === serverId) && (
                                <div style={{ marginTop: '8px', padding: '10px 12px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '10px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                                    <p style={{ fontSize: '10px', color: 'rgba(99, 102, 241, 0.8)', fontWeight: '700', marginBottom: '4px' }}>
                                        📍 Selected: {servers.find(s => s.id === serverId)?.name}
                                    </p>
                                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                                        {servers.find(s => s.id === serverId)?.is_local
                                            ? 'Website will be deployed to your local server'
                                            : `Website will be deployed to remote server at ${servers.find(s => s.id === serverId)?.ip}`
                                        }
                                    </p>
                                </div>
                            )}
                        </div>

                        {isAdmin && (
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assign Owner (Admin Only)</label>
                                <div style={{ position: 'relative' }}>
                                    <Shield size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <select
                                        className="input-glass"
                                        style={{ width: '100%', padding: '14px 14px 14px 44px', borderRadius: '14px', appearance: 'none', cursor: 'pointer' }}
                                        value={targetUserId}
                                        onChange={e => setTargetUserId(Number(e.target.value))}
                                    >
                                        {users.map(u => (
                                            <option key={u.id} value={u.id} style={{ background: 'var(--bg-dark)' }}>{u.username} ({u.role})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 mb-2">
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1 items-center flex gap-2">
                                <Shield size={12} /> Panel Automation Active
                            </p>
                            <p className="text-[11px] text-white/50 leading-relaxed font-medium">
                                Creating this website will automatically generate a <b>VHost</b> configuration and <b>DNS Zone</b> records (A, CNAME, MX) for your domain.
                            </p>
                        </div>

                        <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
                            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1, padding: '14px', borderRadius: '14px', fontWeight: 'bold' }}>Cancel</button>
                            <button type="submit" disabled={loading} className="btn-primary" style={{ flex: 2, padding: '14px', borderRadius: '14px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Create Website'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddWebsiteModal;
