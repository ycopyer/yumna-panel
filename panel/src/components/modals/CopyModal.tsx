import React, { useState } from 'react';
import { X, Copy as CopyIcon, Loader2 } from 'lucide-react';
import axios from 'axios';

interface CopyModalProps {
    file: any;
    currentPath: string;
    userId: number;
    onClose: () => void;
    onSuccess: () => void;
}

const CopyModal: React.FC<CopyModalProps> = ({ file, currentPath, userId, onClose, onSuccess }) => {
    const [newName, setNewName] = useState(`${file.name} - Copy`);
    const [copying, setCopying] = useState(false);

    const handleCopy = async () => {
        const srcPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
        const destPath = currentPath === '/' ? `/${newName}` : `${currentPath}/${newName}`;

        if (srcPath === destPath) {
            alert('Source and destination cannot be the same!');
            return;
        }

        if (!newName.trim()) {
            alert('Please enter a valid name!');
            return;
        }

        setCopying(true);
        try {
            await axios.post('/api/copy', { srcPath, destPath }, { params: { userId } });
            onSuccess();
            onClose();
        } catch (err: any) {
            alert(`Copy failed: ${err.response?.data?.error || err.message}`);
        } finally {
            setCopying(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1200] animate-fade">
            <div className="glass bg-[var(--bg-dark)] rounded-3xl shadow-2xl w-full max-w-lg border border-[var(--border)]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-[var(--primary)]/10 rounded-xl">
                            <CopyIcon size={24} className="text-[var(--primary)]" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-[var(--text-main)]">Make a Copy</h2>
                            <p className="text-sm text-[var(--text-muted)] mt-0.5">
                                Copying: <span className="font-bold text-[var(--primary)]">{file.name}</span>
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[var(--nav-hover)] rounded-xl transition-colors">
                        <X size={24} className="text-[var(--text-muted)]" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-[var(--text-main)] mb-2">
                            New Name
                        </label>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-[var(--nav-hover)] border border-[var(--border)] text-[var(--text-main)] font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                            placeholder="Enter new name..."
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCopy();
                                if (e.key === 'Escape') onClose();
                            }}
                        />
                    </div>

                    <div className="p-4 bg-[var(--nav-hover)]/50 rounded-xl border border-[var(--border)]">
                        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                            Copy Details
                        </p>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-[var(--text-muted)]">Type:</span>
                                <span className="font-bold text-[var(--text-main)] capitalize">{file.type}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--text-muted)]">Location:</span>
                                <span className="font-bold text-[var(--text-main)]">{currentPath}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[var(--border)] flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl font-bold text-[var(--text-main)] hover:bg-[var(--nav-hover)] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCopy}
                        disabled={copying || !newName.trim()}
                        className="px-6 py-2.5 rounded-xl font-bold bg-[var(--primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                    >
                        {copying && <Loader2 className="animate-spin" size={16} />}
                        {copying ? 'Copying...' : 'Create Copy'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CopyModal;
