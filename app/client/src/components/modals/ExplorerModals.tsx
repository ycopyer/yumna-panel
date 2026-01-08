import React from 'react';
import { X, Loader2, ChevronDown, ChevronUp, Check, AlertCircle, Puzzle, FileEdit } from 'lucide-react';
import ShareModal from './ShareModal';
import ProfileSettingsModal from './ProfileSettingsModal';
import UserManagement from '../admin/UserManagement';
import ShareManagement from '../sharing/ShareManagement';
import SiteSettingsModal from './SiteSettingsModal';
import UploadModal from './UploadModal';
import CreateFolderModal from './CreateFolderModal';
import RenameModal from './RenameModal';
import ActivityHistory from '../admin/ActivityHistory';
import FilePreview from '../common/FilePreview';
import TrashBin from '../explorer/TrashBin';
import PropertiesModal from './PropertiesModal';
import AnalyticsDashboard from '../admin/AnalyticsDashboard';
import SecuritySettingsModal from './SecuritySettingsModal';
import AddWebsiteModal from './AddWebsiteModal';
import WebsiteManagementModal from './WebsiteManagementModal';
import AddDatabaseModal from './AddDatabaseModal';
import MoveModal from './MoveModal';
import CopyModal from './CopyModal';
import CompressModal from './CompressModal';
import AddDNSZoneModal from './AddDNSZoneModal';
import ServiceManager from '../admin/ServiceManager';
import FirewallManagement from '../security/FirewallManagement';
import PHPExtensionsModal from './PHPExtensionsModal';
import PHPConfigModal from './PHPConfigModal';
import AddPHPVersionModal from './AddPHPVersionModal';

interface ExplorerModalsProps {
    previewPdf: string | null;
    setPreviewPdf: (url: string | null) => void;
    shareFile: any;
    setShareFile: (file: any) => void;
    showSettings: boolean;
    setShowSettings: (show: boolean) => void;
    showUserManagement: boolean;
    setShowUserManagement: (show: boolean) => void;
    showShareManagement: boolean;
    setShowShareManagement: (show: boolean) => void;
    showUpload: boolean;
    setShowUpload: (show: boolean) => void;
    showCreateFolder: boolean;
    setShowCreateFolder: (show: boolean) => void;
    renameItem: any;
    setRenameItem: (item: any) => void;
    previewFile: string | null;
    setPreviewFile: (url: string | null) => void;
    previewFileItem: any;
    setPreviewFileItem: (file: any) => void;
    previewType: string | null;
    setPreviewType: (type: any) => void;
    showActivityHistory: boolean;
    setShowActivityHistory: (show: boolean) => void;
    showTrash: boolean;
    setShowTrash: (show: boolean) => void;
    showAnalytics: boolean;
    setShowAnalytics: (show: boolean) => void;
    showSiteSettings: boolean;
    setShowSiteSettings: (show: boolean) => void;
    downloadProgress: { show: boolean, message: string, itemCount: number };
    propertiesItem: any;
    setPropertiesItem: (item: any) => void;
    path: string;
    userId: number;
    user: any;
    files: any[];
    fetchFiles: (path: string) => void;
    fetchSiteSettings: () => void;
    downloadFileList: () => void;
    downloadFile: (file: any) => void;
    activeView: string;
    siteSettings: any;
    activeDownloads: any[];
    setActiveDownloads: React.Dispatch<React.SetStateAction<any[]>>;
    activeUploads: any[];
    setActiveUploads: React.Dispatch<React.SetStateAction<any[]>>;
    isManagerOpen: boolean;
    setIsManagerOpen: (open: boolean) => void;
    cancelDownload: (name: string) => void;
    showSecuritySettings: boolean;
    setShowSecuritySettings: (show: boolean) => void;
    userProfile: any;
    toggle2FA: (enabled: boolean) => Promise<boolean>;
    fetchUserProfile: () => void;
    showAddWebsite: boolean;
    setShowAddWebsite: (show: boolean) => void;
    showWebsiteManagement: boolean;
    setShowWebsiteManagement: (show: boolean) => void;
    manageWebsite: any;
    setManageWebsite: (site: any) => void;
    websiteTab: any;
    showAddDatabase: boolean;
    setShowAddDatabase: (show: boolean) => void;
    showAddDNS: boolean;
    setShowAddDNS: (show: boolean) => void;
    fetchWebsites: () => void;
    fetchDatabases: () => void;
    fetchDNS: () => void;
    serverPulse: any;
    showServiceManager: boolean;
    setShowServiceManager: (show: boolean) => void;
    showFirewall: boolean;
    setShowFirewall: (show: boolean) => void;
    firewallTab: any;
    moveItem: any;
    setMoveItem: (item: any) => void;
    copyItem: any;
    setCopyItem: (item: any) => void;
    showCompressModal: boolean;
    setShowCompressModal: (show: boolean) => void;
    compressItems: string[];
    setCompressItems: (items: string[]) => void;
    selectedFiles: string[];
    compressSelection: (name: string) => void;
    showPHPExtensions: boolean | string;
    setShowPHPExtensions: (show: boolean | string) => void;
    showPHPConfig: boolean | string;
    setShowPHPConfig: (show: boolean | string) => void;
    showAddPHPVersion: boolean;
    setShowAddPHPVersion: (show: boolean) => void;
    fetchPHP: () => void;
    onInstallVersion: (version: string) => Promise<boolean>;
    onOpenPath: (path: string) => void;
    saveContent: (file: any, content: string) => Promise<boolean>;
    changePermissions: (file: any, mode: string) => Promise<boolean>;
    initialEditMode?: boolean;
}

const ExplorerModals: React.FC<ExplorerModalsProps> = ({
    previewPdf, setPreviewPdf,
    shareFile, setShareFile,
    showSettings, setShowSettings,
    showUserManagement, setShowUserManagement,
    showShareManagement, setShowShareManagement,
    showUpload, setShowUpload,
    showCreateFolder, setShowCreateFolder,
    renameItem, setRenameItem,
    previewFile, setPreviewFile,
    previewFileItem, setPreviewFileItem,
    previewType, setPreviewType,
    showActivityHistory, setShowActivityHistory,
    showTrash, setShowTrash,
    showAnalytics, setShowAnalytics,
    showSiteSettings, setShowSiteSettings,
    downloadProgress,
    propertiesItem, setPropertiesItem,
    path, userId, user, files,
    fetchFiles, fetchSiteSettings, downloadFile,
    activeView, siteSettings,
    onOpenPath,
    activeDownloads, setActiveDownloads,
    activeUploads, setActiveUploads,
    isManagerOpen, setIsManagerOpen,
    cancelDownload,
    showSecuritySettings, setShowSecuritySettings,
    userProfile, toggle2FA, fetchUserProfile,
    showAddWebsite, setShowAddWebsite,
    showWebsiteManagement, setShowWebsiteManagement,
    manageWebsite, setManageWebsite,
    websiteTab,
    showAddDatabase, setShowAddDatabase,
    showAddDNS, setShowAddDNS,
    fetchWebsites, fetchDatabases, fetchDNS,
    serverPulse,
    showServiceManager, setShowServiceManager,
    showFirewall, setShowFirewall, firewallTab,
    moveItem, setMoveItem,
    copyItem, setCopyItem,
    showCompressModal, setShowCompressModal,
    compressItems, setCompressItems,
    selectedFiles, compressSelection,
    showPHPExtensions, setShowPHPExtensions,
    showPHPConfig, setShowPHPConfig,
    showAddPHPVersion, setShowAddPHPVersion,
    fetchPHP, onInstallVersion,
    saveContent, changePermissions, initialEditMode
}) => {
    const totalTransfers = activeDownloads.length + activeUploads.length;
    const activeTransfers = activeDownloads.filter(d => d.status === 'downloading').length +
        activeUploads.filter(u => u.status === 'uploading').length;

    return (
        <>
            {previewPdf && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.9)', zIndex: 100, display: 'flex', flexDirection: 'column', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600' }}>PDF Preview</h3>
                        <button onClick={() => setPreviewPdf(null)} className="btn-primary" style={{ padding: '8px', background: 'rgba(255,255,255,0.1)' }}>
                            <X size={24} />
                        </button>
                    </div>
                    <iframe src={previewPdf} style={{ width: '100%', height: '100%', border: 'none', borderRadius: '16px', background: 'white' }} title="PDF Preview" />
                </div>
            )}

            {shareFile && <ShareModal file={shareFile} currentPath={path} userId={userId} onClose={() => setShareFile(null)} />}
            {showSettings && <ProfileSettingsModal userId={userId} onClose={() => setShowSettings(false)} onSaved={() => { fetchFiles(path); fetchSiteSettings(); fetchUserProfile(); }} />}
            {showUserManagement && <UserManagement userId={userId} onClose={() => setShowUserManagement(false)} />}
            {showShareManagement && <ShareManagement onClose={() => setShowShareManagement(false)} />}

            {showUpload && (
                <UploadModal
                    currentPath={path}
                    onClose={() => setShowUpload(false)}
                    onSuccess={() => fetchFiles(path)}
                    userId={userId}
                />
            )}

            {showCreateFolder && (
                <CreateFolderModal
                    currentPath={path}
                    userId={userId}
                    onClose={() => setShowCreateFolder(false)}
                    onSuccess={() => fetchFiles(path)}
                />
            )}

            {renameItem && (
                <RenameModal
                    item={renameItem}
                    currentPath={activeView === 'drive' ? path : ''}
                    userId={userId}
                    onClose={() => setRenameItem(null)}
                    onSuccess={() => fetchFiles(path)}
                />
            )}

            {showActivityHistory && <ActivityHistory onClose={() => setShowActivityHistory(false)} />}
            {showTrash && <TrashBin userId={userId} onClose={() => setShowTrash(false)} />}
            {showAnalytics && <AnalyticsDashboard userId={userId} onClose={() => setShowAnalytics(false)} />}

            {showSiteSettings && <SiteSettingsModal
                currentSettings={siteSettings}
                userId={userId}
                onClose={() => setShowSiteSettings(false)}
                onSave={fetchSiteSettings}
            />}

            {showSecuritySettings && <SecuritySettingsModal onClose={() => setShowSecuritySettings(false)} userProfile={userProfile} onToggle={toggle2FA} />}
            {showServiceManager && <ServiceManager userId={userId} onClose={() => setShowServiceManager(false)} serverPulse={serverPulse} />}
            {showFirewall && <FirewallManagement userId={userId} initialTab={firewallTab} onClose={() => setShowFirewall(false)} />}

            {showAddWebsite && <AddWebsiteModal userId={userId} userRole={user.role} onClose={() => setShowAddWebsite(false)} onSuccess={() => { setShowAddWebsite(false); fetchWebsites(); }} />}

            {showWebsiteManagement && manageWebsite && (
                <WebsiteManagementModal
                    website={manageWebsite}
                    userId={userId}
                    userRole={user.role}
                    initialTab={websiteTab}
                    onClose={() => { setShowWebsiteManagement(false); setManageWebsite(null); }}
                    onRefresh={() => { fetchWebsites(); }}
                    onOpenPath={(targetPath) => {
                        setShowWebsiteManagement(false);
                        setManageWebsite(null);
                        onOpenPath(targetPath);
                    }}
                />
            )}

            {showAddDatabase && <AddDatabaseModal userId={userId} onClose={() => setShowAddDatabase(false)} onSuccess={() => { setShowAddDatabase(false); fetchDatabases(); }} />}
            {showAddDNS && <AddDNSZoneModal userId={userId} onClose={() => setShowAddDNS(false)} onSuccess={() => { setShowAddDNS(false); fetchDNS(); }} />}

            {showPHPExtensions && <PHPExtensionsModal userId={userId} version={typeof showPHPExtensions === 'string' ? showPHPExtensions : undefined} onClose={() => setShowPHPExtensions(false)} />}
            {showPHPConfig && <PHPConfigModal userId={userId} version={typeof showPHPConfig === 'string' ? showPHPConfig : undefined} onClose={() => setShowPHPConfig(false)} />}
            {showAddPHPVersion && <AddPHPVersionModal onClose={() => setShowAddPHPVersion(false)} onInstallVersion={onInstallVersion} onSuccess={() => { setShowAddPHPVersion(false); fetchPHP(); }} />}

            {/* Combined Transfer Manager */}
            {totalTransfers > 0 && (
                <div style={{ position: 'fixed', bottom: '0', right: '30px', zIndex: 2000, width: '360px', maxHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                    <div className="glass" style={{ borderRadius: '12px 12px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 -10px 40px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none' }}>
                        <div onClick={() => setIsManagerOpen(!isManagerOpen)} style={{ padding: '12px 20px', background: 'rgba(15, 23, 42, 0.95)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9' }}>
                                {activeTransfers > 0
                                    ? `Transfers: ${activeTransfers} in progress...`
                                    : 'All transfers complete'}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {isManagerOpen ? <ChevronDown size={18} color="#f1f5f9" /> : <ChevronUp size={18} color="#f1f5f9" />}
                            </div>
                        </div>
                        {isManagerOpen && (
                            <div style={{ background: 'rgba(15, 23, 42, 0.95)', padding: '16px', overflowY: 'auto', maxHeight: '300px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {/* Downloads */}
                                {activeDownloads.map((item) => (
                                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '8px', borderRadius: '8px' }}>
                                            <Loader2 size={16} className={item.status === 'downloading' ? 'animate-spin text-indigo-400' : 'text-green-400'} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <div style={{ fontSize: '12px', fontWeight: '600', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                                                <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                                                    {item.status === 'downloading' ? `${item.progress}%` : 'Done'}
                                                </div>
                                            </div>
                                            {(item.status === 'downloading' || item.status === 'uploading') && (
                                                <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${item.progress}%`, height: '100%', background: item.type === 'Download' ? 'linear-gradient(90deg, #6366f1, #a855f7)' : 'linear-gradient(90deg, #10b981, #3b82f6)', transition: 'width 0.3s ease-out' }} />
                                                </div>
                                            )}
                                        </div>
                                        {item.status === 'downloading' && (
                                            <button onClick={() => cancelDownload(item.name)} style={{ padding: '4px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {/* Uploads */}
                                {activeUploads.map((item) => (
                                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '8px', borderRadius: '8px' }}>
                                            <Loader2 size={16} className={item.status === 'uploading' ? 'animate-spin text-emerald-400' : 'text-green-400'} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <div style={{ fontSize: '12px', fontWeight: '600', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                                                <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                                                    {item.status === 'uploading' ? `${item.progress}%` : 'Done'}
                                                </div>
                                            </div>
                                            {(item.status === 'downloading' || item.status === 'uploading') && (
                                                <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${item.progress}%`, height: '100%', background: item.type === 'Download' ? 'linear-gradient(90deg, #6366f1, #a855f7)' : 'linear-gradient(90deg, #10b981, #3b82f6)', transition: 'width 0.3s ease-out' }} />
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

            {moveItem && (
                <MoveModal
                    file={moveItem}
                    currentPath={path}
                    userId={userId}
                    onClose={() => setMoveItem(null)}
                    onSuccess={() => {
                        fetchFiles(path);
                        setMoveItem(null);
                    }}
                />
            )}

            {copyItem && (
                <CopyModal
                    file={copyItem}
                    currentPath={path}
                    userId={userId}
                    onClose={() => setCopyItem(null)}
                    onSuccess={() => {
                        fetchFiles(path);
                        setCopyItem(null);
                    }}
                />
            )}

            {showCompressModal && (
                <CompressModal
                    files={compressItems.length > 0 ? compressItems : selectedFiles}
                    onClose={() => {
                        setShowCompressModal(false);
                        setCompressItems([]);
                    }}
                    onCompress={compressSelection}
                />
            )}

            {propertiesItem && <PropertiesModal item={propertiesItem} currentPath={activeView === 'drive' ? path : ''} role={user.role} onClose={() => setPropertiesItem(null)} onChangePermissions={changePermissions} />}

            {previewFile && previewType && (
                <FilePreview
                    fileUrl={previewFile}
                    fileName={previewFileItem?.name || 'Preview'}
                    fileType={previewType as any}
                    onClose={() => {
                        setPreviewFile(null);
                        setPreviewType(null);
                        setPreviewFileItem(null);
                    }}
                    onDownload={() => {
                        if (previewFileItem) downloadFile(previewFileItem);
                    }}
                    onSave={async (content) => {
                        if (previewFileItem) {
                            return await saveContent(previewFileItem, content);
                        }
                        return false;
                    }}
                    initialEditMode={initialEditMode}
                />
            )}
        </>
    );
};

export default ExplorerModals;
