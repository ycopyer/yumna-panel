import { useState, useRef, useEffect } from 'react';
import { FileItem } from './types';

export const useExplorerState = (user: any) => {
    const [path, setPath] = useState(() => localStorage.getItem('explorer_path') || '/');
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState<'name' | 'content'>('name');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [shareFile, setShareFile] = useState<FileItem | null>(null);
    const [previewPdf, setPreviewPdf] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showUserManagement, setShowUserManagement] = useState(false);
    const [showShareManagement, setShowShareManagement] = useState(false);
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [siteSettings, setSiteSettings] = useState<any>({});
    const [downloadProgress, setDownloadProgress] = useState<{ show: boolean, message: string, itemCount: number }>({ show: false, message: '', itemCount: 0 });
    const [showUpload, setShowUpload] = useState(false);
    const [showCreateFolder, setShowCreateFolder] = useState(false);
    const [renameItem, setRenameItem] = useState<FileItem | null>(null);
    const [previewFile, setPreviewFile] = useState<string | null>(null);
    const [previewFileItem, setPreviewFileItem] = useState<FileItem | null>(null);
    const [previewType, setPreviewType] = useState<'image' | 'video' | 'pdf' | 'text' | null>(null);
    const [showActivityHistory, setShowActivityHistory] = useState(false);
    const [showTrash, setShowTrash] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [activeView, setActiveView] = useState<'drive' | 'shared' | 'recent' | 'documents' | 'favorites' | 'websites' | 'databases' | 'dns' | 'php' | 'plugins'>(() => (localStorage.getItem('explorer_view') as any) || 'drive');
    const [propertiesItem, setPropertiesItem] = useState<FileItem | null>(null);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });
    const [isDarkMode, setIsDarkMode] = useState(() => !document.documentElement.classList.contains('light-mode'));
    const [favorites, setFavorites] = useState<any[]>([]);
    const [showSiteSettings, setShowSiteSettings] = useState(false);
    const [matchResults, setMatchResults] = useState<Record<string, { loading: boolean, isMatch?: boolean, error?: string, identifier?: string }>>({});
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, file: FileItem | null } | null>(null);
    const [moveItem, setMoveItem] = useState<FileItem | null>(null);
    const [copyItem, setCopyItem] = useState<FileItem | null>(null);
    const [showCompressModal, setShowCompressModal] = useState(false);
    const [compressItems, setCompressItems] = useState<string[]>([]);
    const [activeDownloads, setActiveDownloads] = useState<any[]>([]);
    const [activeUploads, setActiveUploads] = useState<any[]>([]);
    const [isManagerOpen, setIsManagerOpen] = useState(true);
    const [userProfile, setUserProfile] = useState<{ email?: string, two_factor_enabled?: boolean, avatar?: string }>({});
    const [showSecuritySettings, setShowSecuritySettings] = useState(false);
    const [showFirewall, setShowFirewall] = useState(false);
    const [firewallTab, setFirewallTab] = useState<'map' | 'security' | 'rules' | 'advanced' | 'patterns' | 'settings' | 'stats' | 'requests'>('map');
    const [showAddWebsite, setShowAddWebsite] = useState(false);
    const [showWebsiteManagement, setShowWebsiteManagement] = useState(false);
    const [manageWebsite, setManageWebsite] = useState<any>(null);
    const [websiteTab, setWebsiteTab] = useState<'general' | 'subdomains' | 'advanced' | 'apps'>('general');
    const [showAddDatabase, setShowAddDatabase] = useState(false);
    const [showAddDNS, setShowAddDNS] = useState(false);
    const [showServiceManager, setShowServiceManager] = useState(false);
    const [showPHPExtensions, setShowPHPExtensions] = useState<boolean | string>(false);
    const [showPHPConfig, setShowPHPConfig] = useState<boolean | string>(false);
    const [showAddPHPVersion, setShowAddPHPVersion] = useState(false);
    const [serverPulse, setServerPulse] = useState<any>(null);
    const [phpOperations, setPhpOperations] = useState<Record<string, any>>({});
    const [previewEdit, setPreviewEdit] = useState(false);
    const abortControllers = useRef<Record<string, AbortController>>({});

    const userId = (user.userId || user.id || 0) as number;

    useEffect(() => {
        localStorage.setItem('explorer_path', path);
        localStorage.setItem('explorer_view', activeView);
    }, [path, activeView]);

    const toggleTheme = () => {
        const isNowLight = document.documentElement.classList.toggle('light-mode');
        setIsDarkMode(!isNowLight);
        localStorage.setItem('theme', isNowLight ? 'light' : 'dark');
    };

    return {
        path, setPath,
        files, setFiles,
        loading, setLoading,
        searchQuery, setSearchQuery,
        searchType, setSearchType,
        viewMode, setViewMode,
        selectedFiles, setSelectedFiles,
        shareFile, setShareFile,
        previewPdf, setPreviewPdf,
        showSettings, setShowSettings,
        showUserManagement, setShowUserManagement,
        showShareManagement, setShowShareManagement,
        isSearchActive, setIsSearchActive,
        siteSettings, setSiteSettings,
        downloadProgress, setDownloadProgress,
        showUpload, setShowUpload,
        showCreateFolder, setShowCreateFolder,
        renameItem, setRenameItem,
        previewFile, setPreviewFile,
        previewFileItem, setPreviewFileItem,
        previewType, setPreviewType,
        showActivityHistory, setShowActivityHistory,
        showTrash, setShowTrash,
        isDragging, setIsDragging,
        activeView, setActiveView,
        propertiesItem, setPropertiesItem,
        showAnalytics, setShowAnalytics,
        sortConfig, setSortConfig,
        isDarkMode, setIsDarkMode,
        favorites, setFavorites,
        showSiteSettings, setShowSiteSettings,
        matchResults, setMatchResults,
        contextMenu, setContextMenu,
        moveItem, setMoveItem,
        copyItem, setCopyItem,
        showCompressModal, setShowCompressModal,
        compressItems, setCompressItems,
        activeDownloads, setActiveDownloads,
        activeUploads, setActiveUploads,
        isManagerOpen, setIsManagerOpen,
        userProfile, setUserProfile,
        showSecuritySettings, setShowSecuritySettings,
        showFirewall, setShowFirewall,
        firewallTab, setFirewallTab,
        showAddWebsite, setShowAddWebsite,
        showWebsiteManagement, setShowWebsiteManagement,
        manageWebsite, setManageWebsite,
        websiteTab, setWebsiteTab,
        showAddDatabase, setShowAddDatabase,
        showAddDNS, setShowAddDNS,
        showServiceManager, setShowServiceManager,
        showPHPExtensions, setShowPHPExtensions,
        showPHPConfig, setShowPHPConfig,
        showAddPHPVersion, setShowAddPHPVersion,
        serverPulse, setServerPulse,
        phpOperations, setPhpOperations,
        previewEdit, setPreviewEdit,
        abortControllers,
        userId,
        toggleTheme
    };
};
