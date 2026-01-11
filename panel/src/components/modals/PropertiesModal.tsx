import React, { useState, useEffect } from 'react';
import { X, Info, File, Folder, Calendar, HardDrive, Shield, User, Hash, Gavel, Scale, AlertCircle, Loader2, History, Clock as ClockIcon } from 'lucide-react';
import axios from 'axios';
import FileVersionHistoryModal from './FileVersionHistoryModal';

interface FileItem {
    name: string;
    type: 'directory' | 'file';
    size: number;
    mtime: number;
    atime: number;
    birthTime?: number;
    path?: string;
    permissions?: number;
    uid?: number;
    gid?: number;
}

interface PropertiesModalProps {
    item: FileItem;
    currentPath: string;
    role: string;
    onClose: () => void;
    onChangePermissions?: (item: FileItem, mode: string) => Promise<boolean>;
}

const PropertiesModal: React.FC<PropertiesModalProps> = ({ item, currentPath, role, onClose, onChangePermissions }) => {
    const [isHeld, setIsHeld] = useState(false);
    const [loading, setLoading] = useState(false);

    // Permission editing state
    const getOctal = (mode?: number) => mode ? (mode & 0o777).toString(8).padStart(3, '0') : '644';
    const [permissionInput, setPermissionInput] = useState(getOctal(item.permissions));
    const [savingPerms, setSavingPerms] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const fullPath = item.path || (currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`);

    useEffect(() => {
        if (role === 'admin') {
            checkHoldStatus();
        }
    }, [fullPath]);

    const handleSavePermissions = async () => {
        if (!onChangePermissions) return;
        setSavingPerms(true);
        const success = await onChangePermissions(item, permissionInput);
        setSavingPerms(false);
        if (success) {
            // Optional: visual feedback
        }
    };

    const checkHoldStatus = async () => {
        try {
            const res = await axios.get('/api/compliance/legal-holds', {
                headers: { 'x-user-id': localStorage.getItem('userId') }
            });
            const holds = res.data;
            setIsHeld(holds.some((h: any) => h.filePath === fullPath));
        } catch (err) { console.error(err); }
    };

    const togglingRef = React.useRef(false);

    const toggleHold = async () => {
        if (togglingRef.current) return;
        togglingRef.current = true;
        setLoading(true);
        try {
            await axios.post('/api/compliance/legal-hold/toggle', {
                filePath: fullPath,
                status: !isHeld
            }, {
                headers: { 'x-user-id': localStorage.getItem('userId') }
            });
            setIsHeld(!isHeld);
        } catch (err) { console.error(err); }
        setLoading(false);
        togglingRef.current = false;
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (timestamp: number) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp * 1000).toLocaleString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px'
        }} onClick={onClose}>
            <div
                className="glass animate-fade"
                style={{
                    width: '100%',
                    maxWidth: '500px',
                    padding: '32px',
                    position: 'relative',
                    overflow: 'hidden'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Visual indicator for Legal Hold */}
                {isHeld && (
                    <div className="absolute top-0 right-0 left-0 h-1 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse" />
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '12px', borderRadius: '12px', color: '#6366f1' }}>
                            <Info size={24} />
                        </div>
                        <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Item Details</h2>
                    </div>
                    <button onClick={onClose} style={{ background: 'var(--nav-hover)', border: 'none', padding: '10px', borderRadius: '50%', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Header with Icon and Name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
                        {item.type === 'directory' ? (
                            <Folder size={48} color="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                        ) : (
                            <File size={48} color="var(--text-muted)" />
                        )}
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', wordBreak: 'break-all' }}>{item.name}</div>
                            <div className="flex items-center gap-2">
                                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '2px' }}>{item.type === 'directory' ? 'System Folder' : 'Generic File'}</div>
                                {isHeld && (
                                    <span className="px-2 py-0.5 bg-red-500/20 text-red-500 rounded text-[9px] font-black tracking-tighter uppercase flex items-center gap-1">
                                        <Gavel size={10} /> Legal Hold
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Details List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <HardDrive size={18} color="var(--text-muted)" style={{ marginTop: '2px' }} />
                            <div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Location</div>
                                <div style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: '500', wordBreak: 'break-all' }}>{fullPath}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Hash size={18} color="var(--text-muted)" style={{ marginTop: '2px' }} />
                            <div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Size</div>
                                <div style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: '500' }}>{item.type === 'file' ? formatSize(item.size) : 'Folder Contents'}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Calendar size={18} color="var(--text-muted)" style={{ marginTop: '2px' }} />
                            <div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Last Modification</div>
                                <div style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: '500' }}>{formatDate(item.mtime)}</div>
                            </div>
                        </div>

                        {role === 'admin' && (
                            <>
                                <div style={{ margin: '8px 0', height: '1px', background: 'var(--border)' }} />

                                <div className="p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10 space-y-4">
                                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                        <Scale size={14} /> Governance & Investigation
                                    </h4>

                                    <div className="flex items-center justify-between">
                                        <div className="flex gap-3">
                                            <Gavel size={18} className={isHeld ? 'text-red-500' : 'text-slate-500'} />
                                            <div>
                                                <div className="text-sm font-bold text-[var(--text-main)]">Legal Hold</div>
                                                <div className="text-[10px] text-[var(--text-muted)]">Prevent deletion/rename for inquiry</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={toggleHold}
                                            disabled={loading}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isHeld
                                                ? 'bg-red-500 text-white hover:bg-red-600'
                                                : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20'
                                                }`}
                                        >
                                            {loading ? <Loader2 size={14} className="animate-spin" /> : isHeld ? 'Release' : 'Activate'}
                                        </button>
                                    </div>

                                    {isHeld && (
                                        <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                                            <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-red-400 leading-relaxed font-medium">
                                                Active Investigation: This item is locked. Any attempts to modify or delete will be recorded in the immutable audit trail with a high-severity event ID.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <Shield size={18} color="#6366f1" style={{ marginTop: '2px' }} />
                                        <div style={{ width: '100%' }}>
                                            <div style={{ fontSize: '12px', color: '#6366f1', fontWeight: '800', textTransform: 'uppercase' }}>Permissions</div>
                                            <div style={{
                                                fontSize: '13px',
                                                color: 'var(--text-main)',
                                                fontWeight: '700',
                                                fontFamily: 'monospace',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                marginTop: '4px'
                                            }}>
                                                <input
                                                    value={permissionInput}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        if (/^[0-7]*$/.test(val) && val.length <= 3) {
                                                            setPermissionInput(val);
                                                        }
                                                    }}
                                                    className="input-glass"
                                                    style={{
                                                        width: '50px',
                                                        padding: '4px',
                                                        textAlign: 'center',
                                                        background: 'rgba(0,0,0,0.2)',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        borderRadius: '6px',
                                                        color: 'white'
                                                    }}
                                                />
                                                {onChangePermissions && (
                                                    <button
                                                        onClick={handleSavePermissions}
                                                        disabled={savingPerms || permissionInput.length < 3}
                                                        className="btn-primary"
                                                        style={{
                                                            padding: '4px 8px',
                                                            fontSize: '10px',
                                                            background: savingPerms ? 'rgba(255,255,255,0.1)' : '#6366f1'
                                                        }}
                                                    >
                                                        {savingPerms ? '...' : 'SET'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <User size={18} color="#6366f1" style={{ marginTop: '2px' }} />
                                        <div>
                                            <div style={{ fontSize: '12px', color: '#6366f1', fontWeight: '800', textTransform: 'uppercase' }}>UID:GID</div>
                                            <div style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '700' }}>
                                                {item.uid ?? 'N/A'}:{item.gid ?? 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {item.type === 'file' && (
                        <div style={{ marginTop: '12px' }}>
                            <button
                                onClick={() => setShowHistory(true)}
                                className="w-full py-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/20 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                            >
                                <History size={16} /> View Version History
                            </button>
                        </div>
                    )}

                    <div style={{ marginTop: '12px' }}>
                        <button
                            onClick={onClose}
                            className="btn-primary"
                            style={{ width: '100%', padding: '12px' }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>

            {showHistory && (
                <FileVersionHistoryModal
                    filePath={fullPath}
                    onClose={() => setShowHistory(false)}
                    onRestoreSuccess={() => {
                        setShowHistory(false);
                        onClose();
                    }}
                />
            )}
        </div>
    );
};

export default PropertiesModal;
