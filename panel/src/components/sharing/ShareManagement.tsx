import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Share2, Trash2, ExternalLink, Folder, File as FileIcon, X, ChevronDown, ChevronRight, Loader2, Calendar } from 'lucide-react';

interface ShareData {
    id: string;
    filePath: string;
    fileName: string;
    expiresAt: string | null;
    permissions: string;
    isFolder: number;
    createdAt: string;
    access_count: number;
    last_accessed_at: string | null;
    last_access_ip: string | null;
}

interface ShareManagementProps {
    onClose: () => void;
}

const ShareManagement: React.FC<ShareManagementProps> = ({ onClose }) => {
    const [shares, setShares] = useState<ShareData[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedShare, setExpandedShare] = useState<string | null>(null);
    const [shareContents, setShareContents] = useState<{ [key: string]: any[] }>({});
    const [loadingContents, setLoadingContents] = useState<string | null>(null);

    const fetchShares = async () => {
        setLoading(true);
        try {
            const userId = localStorage.getItem('userId');
            const res = await axios.get('/api/shares-all', {
                headers: { 'x-user-id': userId }
            });
            setShares(res.data);
        } catch (err) {
            console.error('Failed to fetch shares', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchContents = async (shareId: string) => {
        if (shareContents[shareId]) return;
        setLoadingContents(shareId);
        try {
            const userId = localStorage.getItem('userId');
            const res = await axios.get(`/api/admin/share-ls/${shareId}`, {
                headers: { 'x-user-id': userId }
            });
            setShareContents(prev => ({ ...prev, [shareId]: res.data }));
        } catch (err) {
            console.error('Failed to fetch contents', err);
            setShareContents(prev => ({ ...prev, [shareId]: [{ name: 'Unable to load contents', error: true }] }));
        } finally {
            setLoadingContents(null);
        }
    };

    useEffect(() => {
        fetchShares();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to revoke this share link? This will immediately terminate all access.')) return;
        try {
            const userId = localStorage.getItem('userId');
            await axios.delete(`/api/share/${id}`, {
                headers: { 'x-user-id': userId }
            });
            fetchShares();
        } catch (err) {
            alert('Failed to delete share');
        }
    };

    const toggleExpand = (share: ShareData) => {
        if (share.isFolder) {
            if (expandedShare === share.id) {
                setExpandedShare(null);
            } else {
                setExpandedShare(share.id);
                fetchContents(share.id);
            }
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Never';
        return new Date(dateStr).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
            <div className="glass animate-fade" style={{ width: '100%', maxWidth: '950px', background: 'var(--card-bg)', maxHeight: '90vh', overflowY: 'auto', borderRadius: '24px' }}>
                <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.5)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ background: 'var(--primary)', padding: '10px', borderRadius: '12px' }}>
                            <Share2 size={24} color="white" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Link Security Explorer</h2>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>Monitor and revoke active shared resources</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="hover-scale" style={{ background: 'var(--nav-hover)', border: 'none', padding: '10px', borderRadius: '50%', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ padding: '32px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '80px 0' }}>
                            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
                            <p style={{ marginTop: '20px', color: 'var(--text-muted)', fontWeight: '800', fontSize: '18px' }}>Scanning Network Nodes...</p>
                        </div>
                    ) : shares.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '80px 0', border: '2px dashed var(--border)', borderRadius: '24px', background: 'var(--nav-hover)' }}>
                            <Share2 size={64} style={{ opacity: 0.1, margin: '0 auto 24px' }} />
                            <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>No active transmissions</h3>
                            <p style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Start sharing files to monitor access patterns.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {shares.map(share => (
                                <div key={share.id} style={{ border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden', background: 'rgba(30, 41, 59, 0.4)', transition: 'all 0.3s' }}>
                                    <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: '1 1 300px' }}>
                                            <div style={{ background: 'var(--nav-active)', padding: '14px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                                                {share.isFolder ? <Folder size={24} color="var(--icon-folder)" fill="var(--icon-folder)" fillOpacity={0.2} /> : <FileIcon size={24} color="var(--icon-file)" />}
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                                    <p style={{ fontWeight: '900', color: 'var(--text-main)', fontSize: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{share.fileName}</p>
                                                    <span style={{ fontSize: '10px', background: 'var(--primary)', padding: '3px 10px', borderRadius: '6px', color: 'white', fontWeight: '900', textTransform: 'uppercase' }}>
                                                        {share.permissions}
                                                    </span>
                                                </div>
                                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', opacity: 0.7 }}>{share.filePath}</p>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flex: '1 1 auto', justifyContent: 'flex-end' }}>
                                            <div style={{ display: 'flex', gap: '24px' }}>
                                                <div style={{ textAlign: 'center' }}>
                                                    <p style={{ fontSize: '18px', fontWeight: '900', color: 'var(--primary)' }}>{share.access_count}</p>
                                                    <p style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Views</p>
                                                </div>
                                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <div style={{ color: 'var(--text-main)', fontSize: '11px', fontWeight: '800' }}>
                                                        <span style={{ color: 'var(--primary)' }}>Last Activity:</span> {formatDate(share.last_accessed_at)}
                                                    </div>
                                                    {share.last_access_ip && (
                                                        <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '700' }}>
                                                            IP: <span style={{ color: 'var(--text-main)' }}>{share.last_access_ip}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                {share.isFolder === 1 && (
                                                    <button
                                                        onClick={() => toggleExpand(share)}
                                                        className="hover-glow"
                                                        style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '10px 16px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                                                    >
                                                        {expandedShare === share.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                        <span style={{ fontSize: '13px', fontWeight: '800' }}>Inspect</span>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => window.open(`${window.location.origin}/share/${share.id}`, '_blank')}
                                                    style={{ background: 'var(--nav-hover)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '10px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
                                                    title="Browse Link"
                                                >
                                                    <ExternalLink size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(share.id)}
                                                    className="btn-danger"
                                                    style={{ background: '#ef4444', border: 'none', color: 'white', padding: '10px', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}
                                                    title="Kill Access"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Contents */}
                                    {expandedShare === share.id && (
                                        <div style={{ padding: '0 24px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15, 23, 42, 0.2)' }}>
                                            <div style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', marginTop: '20px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                    <h4 style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Encapsulated Assets</h4>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>
                                                        Expiring: <span style={{ color: 'var(--icon-danger)' }}>{formatDate(share.expiresAt)}</span>
                                                    </div>
                                                </div>
                                                {loadingContents === share.id ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px', color: 'var(--text-muted)', justifyContent: 'center' }}>
                                                        <Loader2 className="animate-spin" size={24} color="var(--primary)" />
                                                        <span style={{ fontSize: '14px', fontWeight: '800' }}>Fetching remote catalog...</span>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {shareContents[share.id]?.map((item, idx) => (
                                                            <div key={idx} className="hover-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                                {item.type === 'directory' ? <Folder size={16} color="var(--icon-folder)" /> : <FileIcon size={16} color="var(--icon-file)" />}
                                                                <span style={{ fontSize: '14px', fontWeight: '700', color: item.error ? '#ef4444' : 'var(--text-main)' }}>{item.name}</span>
                                                                {item.size && <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>{(item.size / 1024).toFixed(1)} KB</span>}
                                                            </div>
                                                        ))}
                                                        {(!shareContents[share.id] || shareContents[share.id].length === 0) && (
                                                            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: '700', fontSize: '14px' }}>
                                                                Directory contains no readable assets
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShareManagement;
