import React, { useState, useEffect } from 'react';
import { X, Folder, ChevronRight, Home, Loader2 } from 'lucide-react';
import axios from 'axios';

interface MoveModalProps {
    file: any;
    currentPath: string;
    userId: number;
    onClose: () => void;
    onSuccess: () => void;
}

const MoveModal: React.FC<MoveModalProps> = ({ file, currentPath, userId, onClose, onSuccess }) => {
    const [targetPath, setTargetPath] = useState('/');
    const [folders, setFolders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [moving, setMoving] = useState(false);

    useEffect(() => {
        fetchFolders(targetPath);
    }, [targetPath]);

    const fetchFolders = async (path: string) => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/ls?path=${encodeURIComponent(path)}&userId=${userId}`);
            const dirs = res.data.filter((item: any) => item.type === 'directory');
            setFolders(dirs);
        } catch (err) {
            console.error('Failed to fetch folders:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMove = async () => {
        const srcPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
        const destPath = targetPath === '/' ? `/${file.name}` : `${targetPath}/${file.name}`;

        if (srcPath === destPath) {
            alert('Source and destination are the same!');
            return;
        }

        setMoving(true);
        try {
            await axios.post('/api/move', { srcPath, destPath }, { params: { userId } });
            onSuccess();
            onClose();
        } catch (err: any) {
            alert(`Move failed: ${err.response?.data?.error || err.message}`);
        } finally {
            setMoving(false);
        }
    };

    const pathParts = targetPath.split('/').filter(Boolean);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1200] animate-fade">
            <div className="glass bg-[var(--bg-dark)] rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-[var(--border)]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
                    <div>
                        <h2 className="text-2xl font-black text-[var(--text-main)]">Move Item</h2>
                        <p className="text-sm text-[var(--text-muted)] mt-1">
                            Moving: <span className="font-bold text-[var(--primary)]">{file.name}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[var(--nav-hover)] rounded-xl transition-colors">
                        <X size={24} className="text-[var(--text-muted)]" />
                    </button>
                </div>

                {/* Breadcrumb */}
                <div className="px-6 py-4 bg-[var(--nav-hover)]/30 border-b border-[var(--border)] flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => setTargetPath('/')}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--primary)]/10 transition-colors text-[var(--text-main)] font-semibold"
                    >
                        <Home size={16} />
                        <span>Root</span>
                    </button>
                    {pathParts.map((part, i) => (
                        <React.Fragment key={i}>
                            <ChevronRight size={14} className="text-[var(--text-muted)]" />
                            <button
                                onClick={() => setTargetPath('/' + pathParts.slice(0, i + 1).join('/'))}
                                className="px-3 py-1.5 rounded-lg hover:bg-[var(--primary)]/10 transition-colors text-[var(--text-main)] font-semibold"
                            >
                                {part}
                            </button>
                        </React.Fragment>
                    ))}
                </div>

                {/* Folder List */}
                <div className="flex-1 overflow-auto p-6 custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="animate-spin text-[var(--primary)]" size={40} />
                        </div>
                    ) : folders.length === 0 ? (
                        <div className="text-center py-20 text-[var(--text-muted)]">
                            <Folder size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="font-semibold">No folders in this directory</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {folders.map((folder, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        const newPath = targetPath === '/' ? `/${folder.name}` : `${targetPath}/${folder.name}`;
                                        setTargetPath(newPath);
                                    }}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-[var(--nav-hover)] transition-all border border-transparent hover:border-[var(--primary)]/30 group"
                                >
                                    <Folder size={24} className="text-[var(--icon-folder)] group-hover:scale-110 transition-transform" fill="currentColor" fillOpacity={0.2} />
                                    <span className="flex-1 text-left font-semibold text-[var(--text-main)] group-hover:text-[var(--primary)]">
                                        {folder.name}
                                    </span>
                                    <ChevronRight size={18} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[var(--border)] flex items-center justify-between gap-4">
                    <div className="text-sm text-[var(--text-muted)]">
                        Destination: <span className="font-bold text-[var(--text-main)]">{targetPath}</span>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl font-bold text-[var(--text-main)] hover:bg-[var(--nav-hover)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleMove}
                            disabled={moving}
                            className="px-6 py-2.5 rounded-xl font-bold bg-[var(--primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                        >
                            {moving && <Loader2 className="animate-spin" size={16} />}
                            {moving ? 'Moving...' : 'Move Here'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MoveModal;
