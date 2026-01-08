import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Trash2, RotateCcw, AlertTriangle, Clock, File, Folder } from 'lucide-react';

interface TrashItem {
    id: number;
    userId: number;
    filePath: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    deletedAt: string;
}

interface TrashBinProps {
    userId: number;
    onClose: () => void;
    onRestore?: () => void;
}

const TrashBin: React.FC<TrashBinProps> = ({ userId, onClose, onRestore }) => {
    const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState<number[]>([]);

    useEffect(() => {
        fetchTrash();
    }, [userId]);

    const fetchTrash = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/trash?userId=${userId}`);
            setTrashItems(res.data);
        } catch (err) {
            console.error('Failed to fetch trash:', err);
        } finally {
            setLoading(false);
        }
    };

    const restoreItem = async (id: number) => {
        try {
            await axios.post(`/api/trash/restore/${id}?userId=${userId}`);
            if (onRestore) onRestore();
            fetchTrash();
        } catch (err: any) {
            alert(`Failed to restore: ${err.response?.data?.error || err.message}`);
        }
    };

    const permanentDelete = async (id: number) => {
        if (!confirm('Permanently delete this item from trash? This cannot be undone.')) return;

        try {
            await axios.delete(`/api/trash/${id}?userId=${userId}`);
            fetchTrash();
        } catch (err: any) {
            alert(`Failed to delete: ${err.response?.data?.error || err.message}`);
        }
    };

    const emptyTrash = async () => {
        if (!confirm('Empty entire trash? All items will be permanently deleted. This cannot be undone.')) return;

        try {
            await axios.delete(`/api/trash/empty?userId=${userId}`);
            fetchTrash();
        } catch (err: any) {
            alert(`Failed to empty trash: ${err.response?.data?.error || err.message}`);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '24px'
        }}>
            <div className="glass animate-fade" style={{
                width: '100%',
                maxWidth: '900px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            padding: '10px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Trash2 size={24} color="var(--icon-danger)" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>
                                Trash Bin
                            </h2>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
                                {trashItems.length} item{trashItems.length !== 1 ? 's' : ''} in trash
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {trashItems.length > 0 && (
                            <button
                                onClick={emptyTrash}
                                className="btn-primary"
                                style={{
                                    padding: '8px 16px',
                                    background: 'var(--icon-danger)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontWeight: '700'
                                }}
                            >
                                <AlertTriangle size={16} />
                                <span>Empty Trash</span>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px',
                                border: 'none',
                                background: 'var(--nav-hover)',
                                borderRadius: '50%',
                                color: 'var(--text-muted)',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '24px'
                }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontWeight: '700' }}>
                            Loading trash...
                        </div>
                    ) : trashItems.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                            <div style={{
                                background: 'var(--nav-active)',
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                margin: '0 auto 20px'
                            }}>
                                <Trash2 size={40} color="var(--primary)" />
                            </div>
                            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
                                Trash is empty
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600' }}>
                                Deleted files will appear here
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {trashItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="glass"
                                    style={{
                                        padding: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                        transition: 'all 0.2s ease',
                                        background: 'var(--nav-hover)',
                                        border: '1px solid var(--border)'
                                    }}
                                >
                                    {/* Icon */}
                                    <div style={{
                                        background: 'var(--nav-hover)',
                                        border: '1px solid var(--border)',
                                        padding: '12px',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        {item.fileType === 'directory' ? (
                                            <Folder size={24} color="var(--primary)" fill="var(--primary)" fillOpacity={0.1} />
                                        ) : (
                                            <File size={24} color="var(--text-muted)" />
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: '14px',
                                            fontWeight: '800',
                                            color: 'var(--text-main)',
                                            marginBottom: '4px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {item.fileName}
                                        </div>
                                        <div style={{
                                            fontSize: '12px',
                                            color: 'var(--text-muted)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            fontWeight: '700'
                                        }}>
                                            <span>{item.fileType === 'file' ? formatSize(item.fileSize) : 'Folder'}</span>
                                            <span style={{ opacity: 0.5 }}>•</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={12} />
                                                <span>Deleted {formatDate(item.deletedAt)}</span>
                                            </div>
                                        </div>
                                        <div style={{
                                            fontSize: '11px',
                                            color: 'var(--text-muted)',
                                            marginTop: '4px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            opacity: 0.8
                                        }}>
                                            {item.filePath}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                        <button
                                            onClick={() => restoreItem(item.id)}
                                            className="btn-primary"
                                            style={{
                                                padding: '8px 12px',
                                                background: 'var(--icon-success)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                fontSize: '13px',
                                                fontWeight: '700'
                                            }}
                                            title="Restore"
                                        >
                                            <RotateCcw size={14} />
                                            <span>Restore</span>
                                        </button>
                                        <button
                                            onClick={() => permanentDelete(item.id)}
                                            className="btn-primary"
                                            style={{
                                                padding: '8px 12px',
                                                background: 'var(--icon-danger)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                fontSize: '13px',
                                                fontWeight: '700'
                                            }}
                                            title="Delete Permanently"
                                        >
                                            <Trash2 size={14} />
                                            <span>Delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                {trashItems.length > 0 && (
                    <div style={{
                        padding: '16px 24px',
                        borderTop: '1px solid var(--border)',
                        background: 'rgba(239, 68, 68, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        color: 'var(--text-muted)',
                        fontWeight: '600'
                    }}>
                        <Clock size={16} color="var(--primary)" />
                        <span>
                            Restored files will return exactly where they were before deletion.
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrashBin;
