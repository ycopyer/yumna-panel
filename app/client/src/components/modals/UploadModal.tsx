import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Upload, X, File, Folder, Loader2 } from 'lucide-react';

interface UploadModalProps {
    currentPath: string;
    userId: number;
    onClose: () => void;
    onSuccess: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ currentPath, userId, onClose, onSuccess }) => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFiles(Array.from(e.target.files));
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);

        if (e.dataTransfer.files) {
            setSelectedFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) return;

        setUploading(true);
        setProgress({ current: 0, total: selectedFiles.length });

        try {
            const formData = new FormData();
            selectedFiles.forEach(file => {
                formData.append('files', file);
            });
            formData.append('path', currentPath);

            await axios.post(`/api/upload?userId=${userId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setProgress(prev => ({ ...prev, current: Math.floor(percentCompleted / 100 * selectedFiles.length) }));
                    }
                }
            });

            setProgress({ current: selectedFiles.length, total: selectedFiles.length });
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 500);
        } catch (err: any) {
            alert(`Upload failed: ${err.response?.data?.error || err.message}`);
        } finally {
            setUploading(false);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div className="glass animate-fade" style={{ padding: '32px', width: '90%', maxWidth: '600px', maxHeight: '80vh', overflow: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Upload Files</h2>
                    <button onClick={onClose} style={{ background: 'var(--nav-hover)', border: 'none', padding: '10px', borderRadius: '50%', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                    Upload Destination: <b style={{ color: 'var(--text-main)' }}>{currentPath}</b>
                </div>

                {/* Drag & Drop Area */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        border: `2px dashed ${dragOver ? '#6366f1' : 'rgba(255,255,255,0.2)'}`,
                        borderRadius: '16px',
                        padding: '48px 24px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: dragOver ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.03)',
                        transition: 'all 0.3s',
                        marginBottom: '24px'
                    }}
                >
                    <Upload size={48} color={dragOver ? '#6366f1' : '#64748b'} style={{ margin: '0 auto 16px' }} />
                    <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                        {dragOver ? 'Drop files here' : 'Drag & drop files here'}
                    </p>
                    <p style={{ fontSize: '14px', color: '#64748b' }}>or click to browse</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />
                </div>

                {/* Selected Files List */}
                {selectedFiles.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}>
                            Selected Files ({selectedFiles.length})
                        </h3>
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {selectedFiles.map((file, idx) => (
                                <div key={idx} className="glass" style={{ padding: '12px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <File size={18} color="#94a3b8" />
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: '500' }}>{file.name}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>{formatFileSize(file.size)}</div>
                                        </div>
                                    </div>
                                    {!uploading && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
                                            }}
                                            style={{ padding: '4px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Progress */}
                {uploading && (
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '14px', color: '#94a3b8' }}>Uploading...</span>
                            <span style={{ fontSize: '14px', fontWeight: '500' }}>{progress.current} / {progress.total}</span>
                        </div>
                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div
                                style={{
                                    height: '100%',
                                    background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                    width: `${(progress.current / progress.total) * 100}%`,
                                    transition: 'width 0.3s'
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} disabled={uploading} className="btn-primary" style={{ background: 'rgba(255,255,255,0.1)', padding: '12px 24px' }}>
                        Cancel
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={selectedFiles.length === 0 || uploading}
                        className="btn-primary"
                        style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px', opacity: (selectedFiles.length === 0 || uploading) ? 0.5 : 1 }}
                    >
                        {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                        Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadModal;
