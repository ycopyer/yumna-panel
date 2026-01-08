import React from 'react';
import { Folder, File as FileIcon, Shield, Clock, Search, Sun, Moon, FileText, Download, Loader2, LogOut } from 'lucide-react';

interface SharedLandingHeaderProps {
    siteSettings: any;
    shareInfo: any;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    toggleTheme: () => void;
    isDarkMode: boolean;
    handleDownload: (file?: any) => void;
    handleLogout: () => void;
    downloading: boolean;
}

const SharedLandingHeader: React.FC<SharedLandingHeaderProps> = ({
    siteSettings,
    shareInfo,
    searchQuery,
    setSearchQuery,
    toggleTheme,
    isDarkMode,
    handleDownload,
    handleLogout,
    downloading
}) => {
    return (
        <div className="glass header-glass" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1', minWidth: '200px' }}>
                <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '8px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '48px', height: '48px' }}>
                    {siteSettings.logo_url ? (
                        <img src={siteSettings.logo_url} alt="Logo" style={{ maxHeight: '36px', objectFit: 'contain' }} />
                    ) : (
                        shareInfo.isFolder ? <Folder size={24} color="#6366f1" /> : <FileIcon size={24} color="#6366f1" />
                    )}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <h1 style={{ fontSize: '18px', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shareInfo.title || shareInfo.fileName}</h1>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                            <Shield size={12} color="#6366f1" /> {shareInfo.title ? 'Shared File' : 'Public Access'}
                        </span>
                        {shareInfo.expiresAt && (
                            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                <Clock size={12} /> <span className="hide-mobile">Expires</span> {new Date(shareInfo.expiresAt).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="header-actions" style={{ display: 'flex', gap: '8px', flex: '1', justifyContent: 'flex-end', minWidth: '280px' }}>
                <div style={{ position: 'relative', flex: '1', minWidth: '120px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} />
                    <input
                        type="text"
                        className="input-glass"
                        placeholder="Search..."
                        style={{ height: '36px', paddingLeft: '34px', width: '100%', fontSize: '13px' }}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                        className="btn-primary"
                        onClick={toggleTheme}
                        style={{ height: '36px', padding: '0 10px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', minWidth: '36px' }}
                        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                    {shareInfo.permissions !== 'View' && (
                        <button
                            className="btn-primary dl-btn"
                            onClick={() => handleDownload()}
                            disabled={downloading}
                            style={{ height: '36px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', whiteSpace: 'nowrap' }}
                        >
                            {downloading ? <Loader2 className="animate-spin" size={16} /> : (
                                <>
                                    <Download size={16} /> <span className="hide-mobile">Full Zip</span>
                                </>
                            )}
                        </button>
                    )}
                    <button
                        className="btn-primary"
                        onClick={handleLogout}
                        style={{ height: '36px', padding: '0 10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', minWidth: '36px' }}
                        title="Log Out"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SharedLandingHeader;
