import React, { useState } from 'react';
import axios from 'axios';
import { FolderPlus, X, Loader2 } from 'lucide-react';

interface CreateFolderModalProps {
    currentPath: string;
    userId: number;
    onClose: () => void;
    onSuccess: () => void;
}

const CreateFolderModal: React.FC<CreateFolderModalProps> = ({ currentPath, userId, onClose, onSuccess }) => {
    const [folderName, setFolderName] = useState('');
    const [creating, setCreating] = useState(false);

    const handleCreate = async () => {
        if (!folderName.trim()) {
            alert('Please enter a folder name');
            return;
        }

        setCreating(true);
        try {
            await axios.post(`/api/create-folder?userId=${userId}`, {
                path: currentPath,
                folderName: folderName.trim()
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            alert(`Failed to create folder: ${err.response?.data?.error || err.message}`);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div className="glass animate-fade" style={{ padding: '32px', width: '90%', maxWidth: '450px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.5px' }}>
                        <FolderPlus size={28} color="#6366f1" />
                        New Folder
                    </h2>
                    <button onClick={onClose} style={{ background: 'var(--nav-hover)', border: 'none', padding: '10px', borderRadius: '50%', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                    Target Location: <b style={{ color: 'var(--text-main)' }}>{currentPath}</b>
                </div>

                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Folder Name</label>
                <input
                    className="input-glass"
                    type="text"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    placeholder="Enter folder name"
                    autoFocus
                    onKeyPress={(e) => { if (e.key === 'Enter') handleCreate(); }}
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', marginBottom: '24px' }}
                />

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} disabled={creating} className="btn-primary" style={{ background: 'rgba(255,255,255,0.1)', padding: '12px 24px' }}>
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={!folderName.trim() || creating}
                        className="btn-primary"
                        style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px', opacity: (!folderName.trim() || creating) ? 0.5 : 1 }}
                    >
                        {creating ? <Loader2 className="animate-spin" size={18} /> : <FolderPlus size={18} />}
                        Create
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateFolderModal;
