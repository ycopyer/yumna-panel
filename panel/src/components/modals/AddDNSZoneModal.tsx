import React, { useState, useEffect } from 'react';
import { X, Server, Globe, Loader2 } from 'lucide-react';
import axios from 'axios';

interface AddDNSZoneModalProps {
    userId: number;
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

const AddDNSZoneModal: React.FC<AddDNSZoneModalProps> = ({ userId, onClose, onSuccess }) => {
    const [domain, setDomain] = useState('');
    const [serverId, setServerId] = useState<number>(1);
    const [servers, setServers] = useState<ServerNode[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Fetch available servers
        axios.get('/api/dns/servers', { headers: { 'x-user-id': userId } })
            .then(res => {
                setServers(res.data);
                if (res.data.length > 0) {
                    setServerId(res.data[0].id);
                }
            })
            .catch(err => console.error('Failed to fetch servers', err));
    }, [userId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.post('/api/dns', {
                domain,
                serverId
            }, {
                headers: { 'x-user-id': userId }
            });

            // Show success message with server info
            if (response.data.server) {
                alert(`DNS Zone created successfully on ${response.data.server.name} (${response.data.server.ip})!`);
            }

            onSuccess();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to add DNS zone');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
            <div className="glass animate-scale-up" style={{ width: '100%', maxWidth: '450px', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                {/* Header */}
                <div style={{ padding: '24px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '10px', background: 'rgba(255,255,255,0.15)', borderRadius: '12px' }}>
                            <Server size={24} color="white" />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'white', margin: 0 }}>Add DNS Zone</h3>
                            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>Configure DNS for domain</p>
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
                                    onChange={e => setDomain(e.target.value)}
                                />
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
                                            {server.name} ({server.ip}) {server.is_local ? '🏠 Local' : '🌐 Remote'} - CPU: {Math.round(server.cpu_usage)}%
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {servers.length === 0 && (
                                <p style={{ marginTop: '8px', fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>
                                    ⚠️ No active servers available.
                                </p>
                            )}
                            {servers.find(s => s.id === serverId) && (
                                <div style={{ marginTop: '8px', padding: '10px 12px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '10px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                                    <p style={{ fontSize: '10px', color: 'rgba(99, 102, 241, 0.8)', fontWeight: '700', marginBottom: '4px' }}>
                                        📍 Selected: {servers.find(s => s.id === serverId)?.name}
                                    </p>
                                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                                        DNS zone will be created on {servers.find(s => s.id === serverId)?.is_local ? 'local' : 'remote'} server
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">
                                ℹ️ Auto-Configuration
                            </p>
                            <p className="text-[10px] text-white/50 leading-relaxed">
                                Default records (A, CNAME, NS) will be created automatically.
                            </p>
                        </div>

                        <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
                            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1, padding: '14px', borderRadius: '14px', fontWeight: 'bold' }}>Cancel</button>
                            <button type="submit" disabled={loading} className="btn-primary" style={{ flex: 1.5, padding: '14px', borderRadius: '14px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Create Zone'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddDNSZoneModal;
