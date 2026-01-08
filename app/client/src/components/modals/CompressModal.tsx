import React, { useState } from 'react';
import { X, Archive, Loader2 } from 'lucide-react';

interface CompressModalProps {
    files: string[];
    onClose: () => void;
    onCompress: (name: string) => Promise<void> | void;
}

const CompressModal: React.FC<CompressModalProps> = ({ files, onClose, onCompress }) => {
    const [name, setName] = useState('archive.zip');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await onCompress(name);
        setLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade">
            <div className="glass w-full max-w-md rounded-2xl p-6 shadow-2xl scale-100 animate-scale">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[var(--primary)]/10 rounded-xl text-[var(--primary)]">
                            <Archive size={24} />
                        </div>
                        <h2 className="text-xl font-bold">Compress Files</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[var(--nav-hover)] rounded-full transition-colors">
                        <X size={20} className="text-[var(--text-muted)]" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                            Archive Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="input-glass w-full p-3 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none"
                            placeholder="archive.zip"
                            autoFocus
                        />
                        <p className="mt-2 text-sm text-[var(--text-muted)]">
                            Compressing {files.length} item{files.length !== 1 && 's'}
                        </p>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl hover:bg-[var(--nav-hover)] text-[var(--text-muted)] font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name}
                            className="bg-[var(--primary)] text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-[var(--primary)]/20 hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Archive size={18} />}
                            {loading ? 'Compressing...' : 'Create Archive'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CompressModal;
