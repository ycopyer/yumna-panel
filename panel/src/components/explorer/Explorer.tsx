import React, { useState } from 'react';
import { Shield, Upload, Puzzle, FileEdit, Bot } from 'lucide-react';
import Sidebar from '../layout/Sidebar';
import ExplorerHeader from './ExplorerHeader';
import ExplorerModals from '../modals/ExplorerModals';
import ContextMenu from './ContextMenu';
import MultiFileEditor from '../common/MultiFileEditor';
import ExplorerBreadcrumbs from './ExplorerBreadcrumbs';
import ExplorerFileList from './ExplorerFileList';
import AIBot from '../common/AIBot';
import PWAInstallPrompt from '../common/PWAInstallPrompt';
import { useExplorer } from '../../hooks/useExplorer';
import DatabaseManager from '../hosting/DatabaseManager';
import DNSManager from '../hosting/DNSManager';
import PHPVersionManager from '../hosting/PHPVersionManager';
import MailManager from '../hosting/MailManager';
import BackupManager from '../hosting/BackupManager';
import PluginManager from '../admin/PluginManager';
import Terminal from '../system/Terminal';
import ServerManager from '../admin/ServerManager';
import SSHManager from '../system/SSHManager';
import CronManager from '../system/CronManager';
import SSLManager from '../hosting/SSLManager';
import FTPManager from '../hosting/FTPManager';
import AppInstaller from '../hosting/AppInstaller';
import ResourceMonitor from '../hosting/ResourceMonitor';
import Fail2BanManager from '../security/Fail2BanManager';
import SecurityAuditViewer from '../security/SecurityAuditViewer';
import ModSecurityManager from '../security/ModSecurityManager';
import MalwareScanner from '../security/MalwareScanner';
import FileIntegrityManager from '../security/FileIntegrityManager';
import VulnerabilityScanner from '../security/VulnerabilityScanner';
import TwoFactorManager from '../security/TwoFactorManager';
import SecurityDashboard from '../security/SecurityDashboard';
import SecurityCenter from '../security/SecurityCenter';
import DomainManager from '../hosting/DomainManager';
import CollaborationManager from '../hosting/CollaborationManager';
import WebsiteManager from '../hosting/WebsiteManager';
import DockerManager from '../hosting/DockerManager';
import BillingManager from '../hosting/BillingManager';
import AdminBillingManager from '../admin/AdminBillingManager';
import FraudMonitor from '../admin/FraudMonitor';
import CloudManager from '../hosting/CloudManager';
import PortForwardingManager from '../system/PortForwardingManager';

interface ExplorerProps {
    user: { userId?: number, id?: number, username: string, role: string };
    onLogout: () => void;
}

const Explorer: React.FC<ExplorerProps> = ({ user, onLogout }) => {
    const {
        path, files, loading, searchQuery, setSearchQuery, viewMode, setViewMode,
        selectedFiles, setSelectedFiles, shareFile, setShareFile, previewPdf, setPreviewPdf,
        showSettings, setShowSettings, showUserManagement, setShowUserManagement,
        showShareManagement, setShowShareManagement, siteSettings, downloadProgress,
        showUpload, setShowUpload, showCreateFolder, setShowCreateFolder,
        renameItem, setRenameItem, previewFile, setPreviewFile,
        previewFileItem, setPreviewFileItem,
        previewType, setPreviewType,
        showActivityHistory, setShowActivityHistory, showTrash, setShowTrash,
        isDragging, setIsDragging, activeView, setActiveView, propertiesItem, setPropertiesItem,
        showAIBot, setShowAIBot,
        showAnalytics, setShowAnalytics, serverPulse, sortConfig, setSortConfig, isDarkMode,
        favorites, showSiteSettings, setShowSiteSettings, userId,
        fetchFiles, fetchSharedFiles, fetchRecentFiles, fetchDocuments,
        fetchSiteSettings, toggleTheme, toggleFavorite, fetchFavoritesView,
        handleFolderClick, downloadFile, deleteItem, toggleSelect, uploadFiles,
        downloadSelected, downloadFileList, viewPreview, handleDrop,
        checkPdfContent, matchResults,
        contextMenu, setContextMenu,
        moveItem, setMoveItem,
        copyItem, setCopyItem,
        activeDownloads, setActiveDownloads,
        activeUploads, setActiveUploads,
        isManagerOpen, setIsManagerOpen,
        cancelDownload,
        showSecuritySettings, setShowSecuritySettings,
        showFirewall, setShowFirewall,
        firewallTab, setFirewallTab,
        userProfile, toggle2FA, fetchUserProfile,
        searchType, setSearchType, performSearch, isSearchActive,
        extractArchive, compressSelection,
        showCompressModal, setShowCompressModal,
        compressItems, setCompressItems,
        clearRecentFiles,
        showAddWebsite, setShowAddWebsite,
        showWebsiteManagement, setShowWebsiteManagement,
        manageWebsite, setManageWebsite,
        websiteTab, setWebsiteTab,
        showAddDatabase, setShowAddDatabase,
        showAddDNS, setShowAddDNS,
        showPHPExtensions, setShowPHPExtensions,
        showPHPConfig, setShowPHPConfig,
        showAddPHPVersion, setShowAddPHPVersion,
        showAddEmailDomain, setShowAddEmailDomain,
        showAddEmailAccount, setShowAddEmailAccount,
        manageEmailDomain, setManageEmailDomain,
        showMaintenance, setShowMaintenance,
        showAddBackup, setShowAddBackup,
        showAddBackupSchedule, setShowAddBackupSchedule,
        showAddRemoteStorage, setShowAddRemoteStorage,
        showTerminal, setShowTerminal,
        showAddSSHAccount, setShowAddSSHAccount,
        showServerManager, setShowServerManager,
        showServiceManager, setShowServiceManager,
        showAddSSL, setShowAddSSL,
        fetchWebsites, fetchDatabases, fetchDNS, fetchPHP, fetchMail, fetchBackups, fetchSSH, fetchSSL, fetchFTP, phpOperations,
        installPHPVersion, uninstallPHPVersion, setPHPDefaultVersion,
        saveContent, changePermissions,
        previewEdit, setPreviewEdit,
        showImageEditor, setShowImageEditor,
        imageEditorItem, setImageEditorItem,
        showDuplicateDetector, setShowDuplicateDetector,
        duplicateDetectorPath, setDuplicateDetectorPath,
        openTabs, setOpenTabs,
        activeTabId, setActiveTabId
    } = useExplorer(user, onLogout);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleNavigate = (view: string) => {
        if (view === 'drive') fetchFiles('/');
        else if (view === 'shared') fetchSharedFiles();
        else if (view === 'recent') fetchRecentFiles();
        else if (view === 'documents') fetchDocuments();
        else if (view === 'favorites') fetchFavoritesView();
        else if (view === 'websites') fetchWebsites();
        else if (view === 'databases') fetchDatabases();
        else if (view === 'dns') fetchDNS();
        else if (view === 'php') fetchPHP();
        else if (view === 'mail') fetchMail();
        else if (view === 'backups') fetchBackups();
        else if (view === 'ssh') fetchSSH();
        else if (view === 'ssl') fetchSSL();
        else if (view === 'ftp') fetchFTP();
        else if (view === 'cron') setActiveView('cron');
        else if (view === 'plugins') setActiveView('plugins');
        else if (view === 'domains') setActiveView('domains');
        else if (view === 'collaboration') setActiveView('collaboration');
        else if (view === 'monitor') setActiveView('monitor');
        else if (view === 'audit') setActiveView('audit');
        else if (view === 'security-dashboard') setActiveView('security-dashboard');
        else if (view === 'fail2ban') setActiveView('fail2ban');
        else if (view === 'waf') setActiveView('waf');
        else if (view === 'malware') setActiveView('malware');
        else if (view === 'integrity') setActiveView('integrity');
        else if (view === 'vulnerability') setActiveView('vulnerability');
        else if (view === '2fa') setActiveView('2fa');
        else if (view === 'security-center') setActiveView('security-center');
        else if (view === 'nodes') setActiveView('nodes');
        else if (view === 'docker') setActiveView('docker');
        else if (view === 'billing') setActiveView('billing');
        else if (view === 'admin-billing') setActiveView('admin-billing');
        else if (view === 'port-forwarding') setActiveView('port-forwarding');
        setIsSidebarOpen(false);
    };

    const handleOpenPath = (targetPath: string) => {
        setActiveView('drive');
        fetchFiles(targetPath);
    };

    const handleContextMenuAction = (action: string, file: any) => {
        const actions: Record<string, Function> = {
            'preview': viewPreview, 'download': downloadFile, 'favorite': toggleFavorite,
            'share': setShareFile, 'rename': setRenameItem, 'delete': deleteItem,
            'properties': setPropertiesItem, 'verify': checkPdfContent, 'move': setMoveItem,
            'copy': setCopyItem, 'extract': extractArchive, 'edit-content': (d: any) => viewPreview(d, true),
            'edit-image': (d: any) => { setImageEditorItem(d); setShowImageEditor(true); },
            'scan-duplicates': (d: any) => { setDuplicateDetectorPath(d.path || (path === '/' ? `/${d.name}` : `${path}/${d.name}`)); setShowDuplicateDetector(true); }
        };
        actions[action]?.(file);
    };

    const toggleSelectAll = () => {
        const allSelected = filteredFiles.length > 0 && filteredFiles.every(f => selectedFiles.includes(f.name));
        setSelectedFiles(prev => allSelected ? prev.filter(n => !filteredFiles.map(f => f.name).includes(n)) : [...new Set([...prev, ...filteredFiles.map(f => f.name)])]);
    };

    const filteredFiles = (isSearchActive ? files : files.filter(f => f?.name?.toLowerCase().includes(searchQuery.toLowerCase())))
        .sort((a: any, b: any) => {
            if (!sortConfig) return 0;
            let aVal = a[sortConfig.key], bVal = b[sortConfig.key];
            if (sortConfig.key === 'permissions') { aVal = a.permissions ?? 0; bVal = b.permissions ?? 0; }
            else if (sortConfig.key === 'owner') { aVal = `${a.uid}:${a.gid}`; bVal = `${b.uid}:${b.gid}`; }
            return aVal < bVal ? (sortConfig.direction === 'asc' ? -1 : 1) : (aVal > bVal ? (sortConfig.direction === 'asc' ? 1 : -1) : 0);
        });

    return (
        <div className="flex min-h-screen bg-[var(--bg-dark)]">
            <Sidebar
                user={user} userProfile={userProfile} siteSettings={siteSettings} activeView={activeView} favorites={favorites}
                isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} onNavigate={handleNavigate}
                onAction={(a) => {
                    const simpleActions: any = {
                        upload: setShowUpload,
                        createFolder: setShowCreateFolder,
                        activity: setShowActivityHistory,
                        trash: setShowTrash,
                        manageShares: setShowShareManagement,
                        manageUsers: setShowUserManagement,
                        settings: setShowSettings,
                        siteSettings: setShowSiteSettings,
                        analytics: setShowAnalytics,
                        'php-services': setShowServiceManager,
                        security: setShowSecuritySettings,
                        'add-website': setShowAddWebsite,
                        'add-database': setShowAddDatabase,
                        'add-dns': setShowAddDNS,
                        'php-extensions': setShowPHPExtensions,
                        'php-config': setShowPHPConfig,
                        'add-php': setShowAddPHPVersion,
                        'add-email-domain': setShowAddEmailDomain,
                        'add-email-account': setShowAddEmailAccount,
                        'maintenance': setShowMaintenance,
                        'terminal': setShowTerminal,
                        'add-ssh-account': setShowAddSSHAccount,
                        'manageNodes': () => handleNavigate('nodes')
                    };
                    if (simpleActions[a]) {
                        simpleActions[a](true);
                    }
                    else if (a === 'firewall' || a.startsWith('firewall-')) {
                        setFirewallTab(a.startsWith('firewall-') ? a.replace('firewall-', '') as any : 'map');
                        setShowFirewall(true);
                    }
                    else if (a === 'reset-dns') {
                        if (activeView !== 'dns') handleNavigate('dns');
                        setTimeout(() => alert('To reset a DNS zone, click "Manage DNS" on a specific domain card.'), 500);
                    }
                    else if (['manage-subdomains', 'modify-website', 'suspend-website', 'delete-website', 'website-installer'].includes(a)) {
                        if (files.length > 0 && activeView === 'websites') {
                            setManageWebsite(files[0]);
                            if (a === 'manage-subdomains') setWebsiteTab('subdomains');
                            else if (a === 'delete-website') setWebsiteTab('advanced');
                            else if (a === 'website-installer') setWebsiteTab('apps');
                            else setWebsiteTab('general');
                            setShowWebsiteManagement(true);
                        } else {
                            if (activeView !== 'websites') {
                                handleNavigate('websites');
                                setTimeout(() => alert(`Select a website first to use "${a}" functionality.`), 500);
                            } else if (files.length === 0) {
                                setShowAddWebsite(true);
                            }
                        }
                    }
                }}
                onLogout={onLogout}
            />

            <main className="flex-1 flex flex-col p-6 md:p-10 transition-all duration-300 overflow-hidden">
                <ExplorerHeader
                    user={user}
                    onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    toggleTheme={toggleTheme}
                    isDarkMode={isDarkMode}
                    onOpenSettings={() => setShowSettings(true)}
                    onLogout={onLogout}
                    avatarUrl={userProfile.avatar}
                />

                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4" onDragEnter={(e) => { e.preventDefault(); if (user.role !== 'viewer') setIsDragging(true); }}>
                    <ExplorerBreadcrumbs activeView={activeView} path={path} fetchFiles={fetchFiles} clearRecentFiles={clearRecentFiles} setShowAddWebsite={setShowAddWebsite} setShowAddDatabase={setShowAddDatabase} setShowAddDNS={setShowAddDNS} />
                </div>

                <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
                    {activeView === 'websites' ? (
                        <WebsiteManager
                            userId={userId}
                            userRole={user.role}
                            onManageWebsite={(website: any) => {
                                setManageWebsite(website);
                                setShowWebsiteManagement(true);
                            }}
                            onOpenPath={handleOpenPath}
                        />
                    ) : activeView === 'databases' ? (
                        <DatabaseManager
                            databases={files}
                            loading={loading}
                            onRefresh={fetchDatabases}
                            onAddDatabase={() => setShowAddDatabase(true)}
                        />
                    ) : activeView === 'dns' ? (
                        <DNSManager
                            zones={files}
                            loading={loading}
                            onRefresh={fetchDNS}
                            onAddZone={() => setShowAddDNS(true)}
                        />
                    ) : activeView === 'php' ? (
                        <PHPVersionManager
                            versions={files}
                            loading={loading}
                            onRefresh={fetchPHP}
                            onAddVersion={() => setShowAddPHPVersion(true)}
                            onInstallExtensions={(v) => setShowPHPExtensions(v || true)}
                            onEditConfig={(v) => setShowPHPConfig(v || true)}
                            onInstallVersion={installPHPVersion}
                            onUninstallVersion={uninstallPHPVersion}
                            onSetDefault={setPHPDefaultVersion}
                            phpOperations={phpOperations}
                        />
                    ) : activeView === 'mail' ? (
                        <MailManager
                            domains={files}
                            loading={loading}
                            onRefresh={fetchMail}
                            onAddDomain={() => setShowAddEmailDomain(true)}
                            onAddAccount={() => setShowAddEmailAccount(true)}
                            onManageDomain={setManageEmailDomain}
                        />
                    ) : activeView === 'backups' ? (
                        <BackupManager
                            backups={files}
                            loading={loading}
                            onRefresh={fetchBackups}
                            onAddBackup={() => setShowAddBackup(true)}
                            onAddSchedule={() => setShowAddBackupSchedule(true)}
                            onAddStorage={() => setShowAddRemoteStorage(true)}
                        />
                    ) : activeView === 'ssh' ? (
                        <SSHManager
                            accounts={files}
                            loading={loading}
                            onRefresh={fetchSSH}
                            onAddAccount={() => setShowAddSSHAccount(true)}
                        />
                    ) : activeView === 'ssl' ? (
                        <SSLManager
                            certificates={files}
                            loading={loading}
                            onRefresh={fetchSSL}
                            onAddSSL={() => setShowAddSSL(true)}
                        />
                    ) : activeView === 'apps' ? (
                        <AppInstaller
                            userId={user.userId || user.id || 0}
                            userRole={user.role}
                        />
                    ) : activeView === 'monitor' ? (
                        <ResourceMonitor />
                    ) : activeView === 'fail2ban' ? (
                        <Fail2BanManager />
                    ) : activeView === 'audit' ? (
                        <SecurityAuditViewer />
                    ) : activeView === 'waf' ? (
                        <ModSecurityManager />
                    ) : activeView === 'malware' ? (
                        <MalwareScanner />
                    ) : activeView === 'integrity' ? (
                        <FileIntegrityManager />
                    ) : activeView === 'vulnerability' ? (
                        <VulnerabilityScanner />
                    ) : activeView === '2fa' ? (
                        <TwoFactorManager />
                    ) : activeView === 'security-center' ? (
                        <SecurityCenter />
                    ) : activeView === 'ftp' ? (
                        <FTPManager
                            accounts={files}
                            loading={loading}
                            onRefresh={fetchFTP}
                            onAddAccount={() => (window as any).showCreateFTPModal?.()}
                        />
                    ) : activeView === 'cron' ? (
                        <CronManager />
                    ) : activeView === 'plugins' ? (
                        <PluginManager />
                    ) : activeView === 'domains' ? (
                        <DomainManager />
                    ) : activeView === 'collaboration' ? (
                        <CollaborationManager
                            websiteId={manageWebsite?.id || (files.length > 0 ? (files[0] as any).id : 0)}
                            websiteDomain={manageWebsite?.domain || (files.length > 0 ? (files[0] as any).domain || files[0].name : '')}
                            isOwner={user.role === 'admin' || user.userId === 1 || user.id === 1}
                        />
                    ) : activeView === 'nodes' ? (
                        <ServerManager userId={userId} onClose={() => handleNavigate('drive')} />
                    ) : activeView === 'docker' ? (
                        <DockerManager />
                    ) : activeView === 'billing' ? (
                        <BillingManager userId={userId} />
                    ) : activeView === 'admin-billing' ? (
                        <AdminBillingManager userId={userId} />
                    ) : activeView === 'fraud' ? (
                        <FraudMonitor onClose={() => handleNavigate('drive')} />
                    ) : activeView === 'cloud' ? (
                        <CloudManager userId={userId} />
                    ) : activeView === 'port-forwarding' ? (
                        <PortForwardingManager />
                    ) : (
                        <ExplorerFileList
                            loading={loading} filteredFiles={filteredFiles} searchQuery={searchQuery} isSearchActive={isSearchActive} activeView={activeView} viewMode={viewMode}
                            selectedFiles={selectedFiles} favorites={favorites} path={path} user={user} sortConfig={sortConfig} handleFolderClick={handleFolderClick} toggleSelect={toggleSelect}
                            toggleFavorite={toggleFavorite} downloadFile={downloadFile} viewPreview={viewPreview} isPreviewable={(n) => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'mp4', 'webm', 'ogg', 'mov', 'pdf', 'txt', 'md', 'log', 'json', 'xml', 'csv', 'js', 'ts', 'tsx', 'jsx', 'css', 'html', 'php', 'py', 'java', 'c', 'cpp', 'h', 'sql', 'sh', 'yaml', 'yml', 'env', 'gitignore', 'ini', 'conf', 'dockerfile', 'makefile', 'license'].includes(n.split('.').pop()?.toLowerCase() || '') || ['dockerfile', 'makefile', 'license'].includes(n.toLowerCase())}
                            setShareFile={setShareFile} setRenameItem={setRenameItem} deleteItem={deleteItem} setPropertiesItem={setPropertiesItem} formatSize={(b) => b === 0 ? '0 B' : (b / Math.pow(1024, Math.floor(Math.log(b) / Math.log(1024)))).toFixed(1) + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][Math.floor(Math.log(b) / Math.log(1024))]}
                            checkPdfContent={checkPdfContent} matchResults={matchResults} handleContextMenu={(e, f) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, file: f }); }}
                            handleDrop={handleDrop} toggleSelectAll={toggleSelectAll} requestSort={(k) => setSortConfig({ key: k, direction: sortConfig?.key === k && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                            setManageWebsite={setManageWebsite} setShowWebsiteManagement={setShowWebsiteManagement}
                            onOpenPath={handleOpenPath}
                        />
                    )}
                </div>

                {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} file={contextMenu.file} user={user} activeView={activeView} isFavorite={favorites.some(fav => fav.filePath === (activeView === 'drive' ? (path === '/' ? `/${contextMenu.file?.name}` : `${path}/${contextMenu.file?.name}`) : (contextMenu.file as any).filePath))} onClose={() => setContextMenu(null)} onAction={handleContextMenuAction} isPreviewable={(n) => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'mp4', 'webm', 'ogg', 'mov', 'pdf', 'txt', 'md', 'log', 'json', 'xml', 'csv', 'js', 'ts', 'tsx', 'jsx', 'css', 'html', 'php', 'py', 'java', 'c', 'cpp', 'h', 'sql', 'sh', 'yaml', 'yml', 'env', 'gitignore', 'ini', 'conf', 'dockerfile', 'makefile', 'license'].includes(n.split('.').pop()?.toLowerCase() || '') || ['dockerfile', 'makefile', 'license'].includes(n.toLowerCase())} />}
                {isDragging && <div className="fixed inset-0 bg-[var(--primary)]/10 backdrop-blur-md border-[6px] border-dashed border-[var(--primary)] z-[1000] flex items-center justify-center pointer-events-none animate-fade" onDragLeave={() => setIsDragging(false)}><div className="glass p-12 rounded-[2rem] text-center shadow-2xl scale-110"><div className="w-24 h-24 bg-[var(--primary)]/20 rounded-full flex items-center justify-center mx-auto mb-6"><Upload size={48} className="text-[var(--primary)] animate-bounce" /></div><h2 className="text-3xl font-black mb-2">Drop files anywhere</h2><p className="text-[var(--text-muted)] text-lg">Uploading to <span className="font-bold text-[var(--text-main)]">{path}</span></p></div></div>}
            </main>

            <ExplorerModals
                previewPdf={previewPdf} setPreviewPdf={setPreviewPdf} shareFile={shareFile} setShareFile={setShareFile}
                openTabs={openTabs} setOpenTabs={setOpenTabs} activeTabId={activeTabId} setActiveTabId={setActiveTabId}
                showSettings={showSettings} setShowSettings={setShowSettings} showUserManagement={showUserManagement} setShowUserManagement={setShowUserManagement} showShareManagement={showShareManagement} setShowShareManagement={setShowShareManagement} showUpload={showUpload} setShowUpload={setShowUpload} showCreateFolder={showCreateFolder} setShowCreateFolder={setShowCreateFolder} renameItem={renameItem} setRenameItem={setRenameItem} showActivityHistory={showActivityHistory} setShowActivityHistory={setShowActivityHistory} showTrash={showTrash} setShowTrash={setShowTrash} showAnalytics={showAnalytics} setShowAnalytics={setShowAnalytics} showSiteSettings={showSiteSettings} setShowSiteSettings={setShowSiteSettings} downloadProgress={downloadProgress} propertiesItem={propertiesItem} setPropertiesItem={setPropertiesItem} path={path} userId={userId} user={user} files={files} fetchFiles={fetchFiles} fetchSiteSettings={fetchSiteSettings} downloadFileList={downloadFileList} downloadFile={downloadFile} activeView={activeView} siteSettings={siteSettings} activeDownloads={activeDownloads} setActiveDownloads={setActiveDownloads} activeUploads={activeUploads} setActiveUploads={setActiveUploads} isManagerOpen={isManagerOpen} setIsManagerOpen={setIsManagerOpen} cancelDownload={cancelDownload} showSecuritySettings={showSecuritySettings} setShowSecuritySettings={setShowSecuritySettings} userProfile={userProfile} toggle2FA={toggle2FA} fetchUserProfile={fetchUserProfile} showAddWebsite={showAddWebsite} setShowAddWebsite={setShowAddWebsite} showWebsiteManagement={showWebsiteManagement} setShowWebsiteManagement={setShowWebsiteManagement} manageWebsite={manageWebsite} setManageWebsite={setManageWebsite} websiteTab={websiteTab} showAddDatabase={showAddDatabase} setShowAddDatabase={setShowAddDatabase} showAddDNS={showAddDNS} setShowAddDNS={setShowAddDNS} fetchWebsites={fetchWebsites} fetchDatabases={fetchDatabases} fetchDNS={fetchDNS} serverPulse={serverPulse} showServiceManager={showServiceManager} setShowServiceManager={setShowServiceManager} showFirewall={showFirewall} setShowFirewall={setShowFirewall} firewallTab={firewallTab} moveItem={moveItem} setMoveItem={setMoveItem} copyItem={copyItem} setCopyItem={setCopyItem} showCompressModal={showCompressModal} setShowCompressModal={setShowCompressModal} compressItems={compressItems} setCompressItems={setCompressItems} selectedFiles={selectedFiles} compressSelection={compressSelection}
                saveContent={saveContent} changePermissions={changePermissions}
                initialEditMode={previewEdit}
                showPHPExtensions={showPHPExtensions} setShowPHPExtensions={setShowPHPExtensions}
                showPHPConfig={showPHPConfig} setShowPHPConfig={setShowPHPConfig}
                showAddPHPVersion={showAddPHPVersion} setShowAddPHPVersion={setShowAddPHPVersion}
                showAddEmailDomain={showAddEmailDomain} setShowAddEmailDomain={setShowAddEmailDomain}
                showAddEmailAccount={showAddEmailAccount} setShowAddEmailAccount={setShowAddEmailAccount}
                manageEmailDomain={manageEmailDomain} setManageEmailDomain={setManageEmailDomain}
                showMaintenance={showMaintenance} setShowMaintenance={setShowMaintenance}
                showAddBackup={showAddBackup} setShowAddBackup={setShowAddBackup}
                showAddBackupSchedule={showAddBackupSchedule} setShowAddBackupSchedule={setShowAddBackupSchedule}
                showAddRemoteStorage={showAddRemoteStorage} setShowAddRemoteStorage={setShowAddRemoteStorage}
                showAddSSHAccount={showAddSSHAccount} setShowAddSSHAccount={setShowAddSSHAccount}
                showImageEditor={showImageEditor} setShowImageEditor={setShowImageEditor}
                imageEditorItem={imageEditorItem} setImageEditorItem={setImageEditorItem}
                showDuplicateDetector={showDuplicateDetector} setShowDuplicateDetector={setShowDuplicateDetector}
                duplicateDetectorPath={duplicateDetectorPath}
                fetchPHP={fetchPHP} fetchMail={fetchMail} fetchBackups={fetchBackups} fetchSSH={fetchSSH} onInstallVersion={installPHPVersion}
                showAddSSL={showAddSSL} setShowAddSSL={setShowAddSSL} fetchSSL={fetchSSL}
                onOpenPath={handleOpenPath}
            />
            {showTerminal && <Terminal onClose={() => setShowTerminal(false)} />}

            {/* AI Assistant Button */}
            {!showAIBot && (
                <button
                    onClick={() => setShowAIBot(true)}
                    className="fixed bottom-8 right-8 p-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] shadow-2xl shadow-indigo-600/40 transition-all hover:scale-110 z-[1900] group"
                >
                    <div className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500"></span>
                    </div>
                    <Bot size={28} className="animate-pulse" />
                </button>
            )}

            {showAIBot && <AIBot onClose={() => setShowAIBot(false)} />}

            <PWAInstallPrompt />
        </div>
    );
};

export default Explorer;
