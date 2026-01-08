import React from 'react';
import { X, Info, HardDrive, Calendar, Activity, Shield, Loader2, Check, AlertCircle, ChevronDown, ChevronUp, Folder, File as FileIcon, FileText, Image as ImageIcon, FileCode, MapPin } from 'lucide-react';
import FilePreview from '../common/FilePreview';

interface SharedLandingModalsProps {
    propertiesFile: any;
    setPropertiesFile: (file: any) => void;
    shareInfo: any;
    handleDownload: (file?: any) => void;
    activeDownloads: any[];
    setActiveDownloads: (downloads: any[] | ((prev: any[]) => any[])) => void;
    isManagerOpen: boolean;
    setIsManagerOpen: (open: boolean) => void;
    downloadProgress: any;
    previewFile: string | null;
    setPreviewFile: (file: string | null) => void;
    previewType: 'pdf' | 'text' | 'image' | 'video' | null;
    files?: any[];
    handleDownload2?: (file: any) => void;
    cancelDownload: (id: string) => void;
    subPath: string;
}

const SharedLandingModals: React.FC<SharedLandingModalsProps> = ({
    propertiesFile,
    setPropertiesFile,
    shareInfo,
    handleDownload,
    activeDownloads,
    setActiveDownloads,
    isManagerOpen,
    setIsManagerOpen,
    downloadProgress,
    previewFile,
    setPreviewFile,
    previewType,
    files = [],
    handleDownload2,
    cancelDownload,
    subPath
}) => {
    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (mtime: number) => {
        if (!mtime) return '--';
        return new Date(mtime * 1000).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const getFileIcon = (file: any) => {
        if (file.type === 'directory') return <Folder size={22} color="var(--icon-folder)" fill="var(--icon-folder)" fillOpacity={0.2} />;
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) return <FileText size={22} color="var(--icon-danger)" />;
        if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) return <ImageIcon size={22} color="var(--icon-success)" />;
        if (['js', 'ts', 'html', 'css', 'py', 'java', 'cpp'].includes(ext)) return <FileCode size={22} color="var(--icon-warning)" />;
        return <FileIcon size={22} color="var(--icon-file)" />;
    };

    return (
        <>
            {/* Properties Modal */}
            {propertiesFile && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setPropertiesFile(null)}>
                    <div className="glass animate-fade" style={{ maxWidth: '450px', width: '100%', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Info size={20} color="#6366f1" /> Item Properties
                            </h2>
                            <button onClick={() => setPropertiesFile(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ padding: '24px' }}>
                            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                                <div style={{ background: 'rgba(99, 102, 241, 0.1)', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 16px' }}>
                                    {getFileIcon(propertiesFile)}
                                </div>
                                <h3 style={{ fontSize: '16px', fontWeight: '600', wordBreak: 'break-all' }}>{propertiesFile.name}</h3>
                                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{propertiesFile.type === 'directory' ? 'Folder' : 'File'}</p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <div style={{ color: '#6366f1', background: 'rgba(99, 102, 241, 0.1)', padding: '10px', borderRadius: '10px', height: 'fit-content' }}>
                                        <HardDrive size={18} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Size</p>
                                        <p style={{ fontSize: '14px', fontWeight: '500', marginTop: '2px' }}>{propertiesFile.type === 'file' ? formatSize(propertiesFile.size) : 'Calculated by sub-items'}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <div style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '10px', height: 'fit-content' }}>
                                        <Calendar size={18} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Modified</p>
                                        <p style={{ fontSize: '14px', fontWeight: '500', marginTop: '2px' }}>{formatDate(propertiesFile.mtime)}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <div style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '10px', borderRadius: '10px', height: 'fit-content' }}>
                                        <Activity size={18} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Permissions</p>
                                        <p style={{ fontSize: '14px', fontWeight: '500', marginTop: '2px' }}>{shareInfo.permissions}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '10px', height: 'fit-content' }}>
                                        <Shield size={18} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Security</p>
                                        <p style={{ fontSize: '14px', fontWeight: '500', marginTop: '2px' }}>AES-256 Encrypted Transfer</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <div style={{ color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)', padding: '10px', borderRadius: '10px', height: 'fit-content' }}>
                                        <MapPin size={18} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Path</p>
                                        <p style={{ fontSize: '14px', fontWeight: '500', marginTop: '2px', wordBreak: 'break-all' }}>
                                            {propertiesFile.displayPath || (subPath ? `${subPath}/${propertiesFile.name}` : propertiesFile.name)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <button
                                className="btn-primary"
                                style={{ width: '100%', marginTop: '32px', height: '48px' }}
                                onClick={() => { handleDownload(propertiesFile); setPropertiesFile(null); }}
                            >
                                Download this Item
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Download Manager */}
            {activeDownloads.length > 0 && (
                <div style={{ position: 'fixed', bottom: '0', right: window.innerWidth <= 768 ? '0' : '30px', zIndex: 2000, width: window.innerWidth <= 768 ? '100%' : '360px', maxHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                    <div className="glass" style={{ borderRadius: window.innerWidth <= 768 ? '16px 16px 0 0' : '12px 12px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 -10px 40px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none' }}>
                        <div onClick={() => setIsManagerOpen(!isManagerOpen)} style={{ padding: '12px 20px', background: 'rgba(15, 23, 42, 0.95)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600' }}>
                                {activeDownloads.filter(d => d.status === 'downloading').length > 0
                                    ? `Downloading ${activeDownloads.filter(d => d.status === 'downloading').length} item(s)...`
                                    : 'Downloads complete'}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {isManagerOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                                <X size={18} onClick={(e) => { e.stopPropagation(); setActiveDownloads([]); }} style={{ cursor: 'pointer', color: '#64748b' }} />
                            </div>
                        </div>
                        {isManagerOpen && (
                            <div className="custom-scrollbar" style={{ maxHeight: '340px', overflowY: 'auto', background: 'rgba(30, 41, 59, 0.95)', padding: '8px 0' }}>
                                {activeDownloads.map((dl) => (
                                    <div key={dl.id} style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ background: dl.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '32px', height: '32px' }}>
                                            {dl.status === 'completed' ? <Check size={16} color="#10b981" /> : dl.status === 'error' ? <AlertCircle size={16} color="#ef4444" /> : <Loader2 size={16} color="#6366f1" className="animate-spin" />}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center', gap: '8px' }}>
                                                <p style={{ fontSize: '12px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: dl.status === 'error' ? '#ef4444' : '#f1f5f9' }}>{dl.name}</p>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>{dl.status === 'downloading' ? `${dl.progress}%` : dl.status === 'completed' ? 'Done' : 'Info'}</span>
                                                    {dl.status === 'downloading' ? (
                                                        <X size={14} style={{ cursor: 'pointer', color: '#ef4444' }} onClick={(e) => { e.stopPropagation(); cancelDownload(dl.id); }} />
                                                    ) : (
                                                        <X size={14} style={{ cursor: 'pointer', color: '#64748b' }} onClick={(e) => { e.stopPropagation(); setActiveDownloads(prev => prev.filter(d => d.id !== dl.id)); }} />
                                                    )}
                                                </div>
                                            </div>
                                            {dl.status === 'downloading' && (
                                                <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${dl.progress}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7)', transition: 'width 0.3s ease-out' }} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Recursive Scan Progress Modal */}
            {downloadProgress.show && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="glass animate-fade" style={{ padding: '40px', textAlign: 'center', maxWidth: '400px', width: '90%' }}>
                        <div style={{ background: 'var(--nav-hover)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 24px' }}>
                            <Loader2 className="animate-spin" size={40} color="var(--primary)" />
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px' }}>{downloadProgress.message}</h3>
                        {downloadProgress.itemCount > 0 && <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '700' }}>Found {downloadProgress.itemCount.toLocaleString()} items</p>}
                    </div>
                </div>
            )}

            {/* Preview Modal - Using FilePreview component like main drive */}
            {previewFile && previewType && (
                <FilePreview
                    fileUrl={previewFile}
                    fileName={files.find(f => previewFile.includes(encodeURIComponent(f.name)))?.name || 'Preview'}
                    fileType={previewType}
                    onClose={() => { setPreviewFile(null); }}
                    onDownload={() => {
                        const file = files.find(f => previewFile.includes(encodeURIComponent(f.name)));
                        if (file && handleDownload2) handleDownload2(file);
                    }}
                />
            )}
        </>
    );
};

export default SharedLandingModals;
