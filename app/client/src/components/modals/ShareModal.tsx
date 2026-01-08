import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Calendar, Lock, Share2, Copy, Check, Clock, Eye, Edit3, Shield, Loader2, Trash2, Search, User, Globe } from 'lucide-react';

interface ShareModalProps {
    file: { name: string, type: 'directory' | 'file' };
    currentPath: string;
    userId: number;
    onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ file, currentPath, userId, onClose }) => {
    const [expiry, setExpiry] = useState('');
    const [password, setPassword] = useState('');
    const [permissions, setPermissions] = useState('View'); // View, Read, Full
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [shareId, setShareId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState('');
    const [showForm, setShowForm] = useState(true);

    // User Sharing State
    const [shareMode, setShareMode] = useState<'public' | 'user'>('public');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
    const [searching, setSearching] = useState(false);

    const fullPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;

    useEffect(() => {
        const checkExisting = async () => {
            try {
                const res = await axios.get(`/api/share-by-path?path=${encodeURIComponent(fullPath)}&userId=${userId}`);
                if (res.data) {
                    setShareId(res.data.id);
                    setIsEditing(true);
                    setShowForm(false);
                    setPermissions(res.data.permissions);
                    if (res.data.expiresAt) {
                        setExpiry(new Date(res.data.expiresAt).toISOString().split('T')[0]);
                    }
                    if (res.data.password) setPassword(res.data.password);
                    if (res.data.title) setTitle(res.data.title);

                    if (res.data.recipientUserId) {
                        setShareMode('user');
                        // Ideally we would fetch the user details here, can default for now or fetch if critical
                    }
                }
            } catch (e) {
                console.error('Error fetching share info', e);
            } finally {
                setFetching(false);
            }
        };
        checkExisting();
    }, [fullPath, userId]);

    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }

        const timeoutId = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await axios.get(`/api/users/search?query=${searchQuery}&userId=${userId}`);
                setSearchResults(res.data);
            } catch (error) {
                console.error('Search failed', error);
            } finally {
                setSearching(false);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, userId]);

    const handleShare = async () => {
        setLoading(true);
        try {
            const res = await axios.post('/api/share', {
                filePath: fullPath,
                fileName: file.name,
                title: title || null,
                expiresAt: expiry ? new Date(expiry).toISOString() : null,
                password: password || null,
                permissions: permissions,
                isFolder: file.type === 'directory',
                userId: userId,
                existingId: shareId,
                recipientUserId: shareMode === 'user' && selectedRecipient ? selectedRecipient.id : null
            });
            setShareId(res.data.id);
            if (!isEditing) setIsEditing(true);
            setShowForm(false);
        } catch (err: any) {
            console.error('Share creation error:', err);
            console.error('Error response:', err.response?.data);
            const errorMsg = err.response?.data?.error || err.message || 'Unknown error';
            alert(`Failed to create share link: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async () => {
        if (!shareId || !window.confirm('Are you sure you want to revoke this share?')) return;
        setLoading(true);
        try {
            await axios.delete(`/api/share/${shareId}?userId=${userId}`);
            setShareId(null);
            setIsEditing(false);
            setExpiry('');
            setPassword('');
            setPermissions('View');
            setTitle('');
            setShowForm(true);
        } catch (err) {
            alert('Failed to revoke share');
        } finally {
            setLoading(false);
        }
    };

    const shareUrl = `${window.location.origin}/share/${shareId}`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (fetching) return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 60 }}>
            <Loader2 className="animate-spin" size={32} color="white" />
        </div>
    );

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50 }}>
            <div className="glass animate-fade" style={{ background: '#1e293b', width: '100%', maxWidth: '450px', padding: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Share2 color="var(--primary)" />
                        <h3 style={{ fontSize: '20px', fontWeight: '600' }}>Share {file.type === 'directory' ? 'Folder' : 'File'}</h3>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                {showForm ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>Title (Optional)</p>
                            <input
                                type="text"
                                className="input-glass"
                                placeholder="e.g., Project Files, Invoice 2024, etc."
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div>
                            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>File Name</p>
                            <div className="input-glass" style={{ background: 'rgba(0,0,0,0.2)' }}>{file.name}</div>
                        </div>

                        {/* Share Mode Toggle */}
                        <div style={{ display: 'flex', background: 'var(--nav-hover)', padding: '4px', borderRadius: '12px' }}>
                            <button
                                onClick={() => setShareMode('public')}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${shareMode === 'public' ? 'bg-[var(--primary)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <Globe size={16} />
                                    Public Link
                                </div>
                            </button>
                            <button
                                onClick={() => setShareMode('user')}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${shareMode === 'user' ? 'bg-[var(--primary)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <User size={16} />
                                    Specific User
                                </div>
                            </button>
                        </div>

                        {shareMode === 'user' && (
                            <div className="animate-fade">
                                <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>Select Recipient</p>
                                {selectedRecipient ? (
                                    <div className="flex items-center justify-between p-3 bg-[var(--nav-hover)] border border-[var(--border)] rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 flex items-center justify-center overflow-hidden">
                                                {selectedRecipient.avatar ? (
                                                    <img src={selectedRecipient.avatar} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={16} className="text-[var(--primary)]" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">{selectedRecipient.username}</p>
                                                <p className="text-xs text-[var(--text-muted)]">{selectedRecipient.email}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedRecipient(null)}
                                            className="p-1.5 hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 rounded-lg transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                                        <input
                                            type="text"
                                            className="input-glass w-full pl-10"
                                            placeholder="Search by username..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                        />
                                        {searching && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <Loader2 className="animate-spin text-[var(--text-muted)]" size={16} />
                                            </div>
                                        )}
                                        {searchResults.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-dark)] border border-[var(--border)] rounded-xl shadow-xl z-20 overflow-hidden max-h-48 overflow-y-auto">
                                                {searchResults.map(user => (
                                                    <button
                                                        key={user.id}
                                                        onClick={() => {
                                                            setSelectedRecipient(user);
                                                            setSearchQuery('');
                                                            setSearchResults([]);
                                                        }}
                                                        className="w-full text-left p-3 hover:bg-[var(--nav-hover)] transition-colors flex items-center gap-3 border-b border-[var(--border)] last:border-0"
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                            {user.avatar ? (
                                                                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <User size={14} className="text-[var(--primary)]" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-sm text-[var(--text-main)]">{user.username}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '15px' }}>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>Expiration (Optional)</p>
                                <div style={{ position: 'relative' }}>
                                    <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
                                    <input
                                        type="date"
                                        className="input-glass"
                                        style={{ width: '100%', paddingLeft: '40px' }}
                                        value={expiry}
                                        onChange={e => setExpiry(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>Password (Optional)</p>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
                                    <input
                                        type="password"
                                        className="input-glass"
                                        style={{ width: '100%', paddingLeft: '40px' }}
                                        placeholder="Set password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '10px' }}>Permissions</p>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {[
                                    { id: 'View', icon: Eye, label: 'View Only' },
                                    { id: 'Read', icon: Shield, label: 'Read/Download' },
                                    { id: 'Full', icon: Edit3, label: 'Full Access' }
                                ].map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => setPermissions(p.id)}
                                        className="input-glass"
                                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', padding: '12px', background: permissions === p.id ? 'var(--primary)' : 'rgba(15, 23, 42, 0.5)', borderColor: permissions === p.id ? 'var(--primary)' : 'var(--border)' }}
                                    >
                                        <p.icon size={18} />
                                        <span style={{ fontSize: '12px' }}>{p.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            className="btn-primary"
                            onClick={handleShare}
                            disabled={loading}
                            style={{ marginTop: '10px', height: '45px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                        >
                            {loading ? <Clock className="animate-spin" size={20} /> : (isEditing ? 'Update Share' : 'Generate Link')}
                        </button>
                    </div>
                ) : (
                    <div className="animate-fade">
                        <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px dashed var(--primary)', padding: '20px', borderRadius: '12px', textAlign: 'center', marginBottom: '20px' }}>
                            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '10px' }}>{isEditing ? 'Share is active' : (shareMode === 'user' ? 'Shared with user' : 'Your link is ready')}</p>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input className="input-glass" readOnly value={shareMode === 'user' ? `Shared with ${selectedRecipient?.username || 'user'}` : shareUrl} style={{ flex: 1, fontSize: '13px' }} />
                                {shareMode === 'public' && (
                                    <button className="btn-primary" onClick={copyToClipboard} style={{ padding: '0 15px' }}>
                                        {copied ? <Check size={18} /> : <Copy size={18} />}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button className="input-glass" onClick={() => setShowForm(true)} style={{ flex: 1 }}>
                                <Edit3 size={18} style={{ marginRight: '8px' }} /> Edit
                            </button>
                            <button className="input-glass" onClick={handleRevoke} style={{ flex: 1, color: '#ef4444' }}>
                                <Trash2 size={18} style={{ marginRight: '8px' }} /> Revoke
                            </button>
                        </div>

                        <p style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', marginTop: '20px' }}>
                            {shareMode === 'user'
                                ? `Checking 'Shared with me' to access.`
                                : `Anyone with this link can ${permissions.toLowerCase()} the file.`}
                            {expiry && ` Expires on ${new Date(expiry).toLocaleDateString()}.`}
                        </p>
                        <button className="btn-primary" onClick={onClose} style={{ width: '100%', marginTop: '20px', background: 'var(--bg-glass)' }}>Close</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShareModal;
