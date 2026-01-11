import React, { useState } from 'react';
import axios from 'axios';
import { Edit3, X, Loader2 } from 'lucide-react';

interface RenameModalProps {
    item: { name: string; type: string };
    currentPath: string;
    userId: number;
    onClose: () => void;
    onSuccess: () => void;
}

const RenameModal: React.FC<RenameModalProps> = ({ item, currentPath, userId, onClose, onSuccess }) => {
    const [newName, setNewName] = useState(item.name);
    const [renaming, setRenaming] = useState(false);

    const handleRename = async () => {
        if (!newName.trim() || newName === item.name) {
            alert('Please enter a different name');
            return;
        }

        setRenaming(true);
        try {
            const oldPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
            await axios.post(`/api/rename?userId=${userId}`, {
                oldPath,
                newName: newName.trim(),
                currentPath
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            alert(`Failed to rename: ${err.response?.data?.error || err.message}`);
        } finally {
            setRenaming(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div className="glass animate-fade" style={{ padding: '32px', width: '90%', maxWidth: '450px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.5px' }}>
                        <Edit3 size={28} color="#6366f1" />
                        Rename {item.type === 'directory' ? 'Folder' : 'File'}
                    </h2>
                    <button onClick={onClose} style={{ background: 'var(--nav-hover)', border: 'none', padding: '10px', borderRadius: '50%', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                    Current Name: <b style={{ color: 'var(--text-main)' }}>{item.name}</b>
                </div>

                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Identifier</label>
                <input
                    className="input-glass"
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Enter new name"
                    autoFocus
                    onKeyPress={(e) => { if (e.key === 'Enter') handleRename(); }}
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', marginBottom: '24px' }}
                />

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} disabled={renaming} className="btn-primary" style={{ background: 'rgba(255,255,255,0.1)', padding: '12px 24px' }}>
                        Cancel
                    </button>
                    <button
                        onClick={handleRename}
                        disabled={!newName.trim() || newName === item.name || renaming}
                        className="btn-primary"
                        style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px', opacity: (!newName.trim() || newName === item.name || renaming) ? 0.5 : 1 }}
                    >
                        {renaming ? <Loader2 className="animate-spin" size={18} /> : <Edit3 size={18} />}
                        Rename
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RenameModal;
