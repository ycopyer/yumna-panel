import React from 'react';
import {
    LayoutGrid, History, Trash2, Heart, Globe, Database, Server as ServerIcon, Lock, Users, Share2, BarChart2, Shield, Settings,
    Activity as ActivityIcon, ShieldAlert, Cpu, LogOut, Search, ChevronRight, Upload, Folder, FolderPlus, ShieldCheck, Scale, Star, User, Menu, X,
    LayoutDashboard, HardDrive, Fingerprint, Plus, Link2, Power, Package, ExternalLink, RefreshCw, Puzzle, FileEdit, Mail, Archive, Wrench, Terminal, Key, Clock, Camera, Zap
} from 'lucide-react';
import ResourceUsageWidget from '../common/ResourceUsageWidget';

interface SidebarProps {
    user: { userId?: number, id?: number, username: string, role: string };
    siteSettings: any;
    activeView: string;
    favorites: any[];
    onNavigate: (view: any) => void;
    onAction: (action: string) => void;
    onLogout: () => void;
    userProfile?: any;
    isOpen?: boolean;
    onClose?: () => void;
}

const formatBytes = (bytes: number) => {
    if (!bytes && bytes !== 0) return '0 B';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const Sidebar: React.FC<SidebarProps> = ({
    user,
    userProfile,
    siteSettings,
    activeView,
    favorites,
    onNavigate,
    onAction,
    onLogout,
    isOpen = false,
    onClose
}) => {
    const onCloseSafe = onClose || (() => { });
    const userRole = (user.role || '').toLowerCase();
    const isAdmin = userRole === 'admin' || (user.userId === 1 || user.id === 1);

    // Add null check for userProfile
    const safeUserProfile = userProfile || {
        storage_quota: 0,
        used_storage: 0,
        cpu_usage: 0,
        ram_usage: 0
    };

    const usagePercent = safeUserProfile.storage_quota
        ? Math.min(100, ((safeUserProfile.used_storage || 0) / safeUserProfile.storage_quota) * 100)
        : 0;
    const isCritical = usagePercent > 90;

    const navItemBase = "flex items-center gap-3.5 px-4 py-3 rounded-xl cursor-pointer transition-all duration-300 group select-none";
    const navItemActive = "bg-[var(--nav-active)] text-[var(--primary)] shadow-[0_4px_12px_rgba(99,102,241,0.12)] ring-1 ring-[var(--primary)]/20";
    const navItemInactive = "text-[var(--text-muted)] hover:bg-[var(--nav-hover)] hover:text-[var(--text-main)]";

    return (
        <>
            {/* Mobile Overlay */}
            {
                isOpen && (
                    <div
                        className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-md animate-fade"
                        onClick={onClose}
                    />
                )
            }

            <aside
                className={`
                    fixed md:sticky top-0 left-0 h-screen w-72
                    bg-[var(--sidebar-bg)] border-r border-[var(--border)]
                    flex flex-col z-50 transition-all duration-500 ease-in-out backdrop-blur-xl
                    ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0 md:shadow-none'}
                `}
            >
                {/* Brand Header */}
                <div className="p-7">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3.5 group cursor-pointer">
                            <div className="relative">
                                <div className="relative w-24 h-24 flex items-center justify-center transform group-hover:scale-105 transition-transform">
                                    {siteSettings.logo_url ? (
                                        <img src={siteSettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                                    ) : (
                                        <Shield className="text-[var(--primary)]" size={64} />
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col ml-2">
                                <span className="text-lg font-black tracking-tight text-[var(--text-main)] truncate max-w-[140px] leading-tight">
                                    {siteSettings.site_title || 'Yumna Panel'}
                                </span>
                                <span className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-widest opacity-80">
                                    {isAdmin ? 'Enterprise Admin' : 'Cloud Hosting'}
                                </span>
                                <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-40 mt-1">
                                    v{siteSettings?.panel_version || '2.2.3'}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2.5 rounded-xl hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 md:hidden transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>


                </div>

                {/* Navigation Menu */}
                <div className="flex-1 px-4 pb-6 space-y-7 overflow-y-auto custom-scrollbar">



                    {/* HOSTING & CLOUD */}
                    <div>
                        <p className="px-4 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-40">Cloud Services</p>
                        <div className="space-y-1">
                            {/* Websites Item with Submenu */}
                            <div>
                                <div
                                    className={`${navItemBase} ${activeView === 'websites' ? navItemActive : navItemInactive}`}
                                    onClick={() => {
                                        onNavigate('websites');
                                        // If already on websites, maybe toggle submenu if we had state
                                        // But per user request, let's just make the submenu items visible or always expanded for now
                                    }}
                                >
                                    <Globe size={19} className={activeView === 'websites' ? 'text-[var(--primary)]' : 'opacity-70 group-hover:opacity-100'} />
                                    <span className="font-bold text-sm">Websites</span>
                                    <ChevronRight size={14} className={`ml-auto transition-transform duration-300 ${activeView === 'websites' ? 'rotate-90' : 'opacity-40'}`} />
                                </div>

                                {/* Submenu - Visible when websites view is active */}
                                <div className={`mt-1 ml-4 pl-4 border-l border-[var(--border)] overflow-hidden transition-all duration-500 space-y-0.5 ${activeView === 'websites' ? 'max-h-[400px] opacity-100 py-2' : 'max-h-0 opacity-0'}`}>
                                    <div
                                        className="flex items-center gap-3 px-4 py-2 rounded-xl text-[12px] font-bold text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 cursor-pointer transition-all group/sub"
                                        onClick={() => { onAction('add-website'); onClose?.(); }}
                                    >
                                        <Plus size={14} className="opacity-40 group-hover/sub:opacity-100" />
                                        Create Website
                                    </div>
                                    <div
                                        className={`flex items-center gap-3 px-4 py-2 rounded-xl text-[12px] font-bold cursor-pointer transition-all group/sub ${activeView === 'websites' ? 'text-[var(--primary)] bg-[var(--primary)]/10' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--nav-hover)]'}`}
                                        onClick={() => { onNavigate('websites'); onClose?.(); }}
                                    >
                                        <LayoutGrid size={14} className={activeView === 'websites' ? 'opacity-100' : 'opacity-40 group-hover/sub:opacity-100'} />
                                        List Websites
                                    </div>
                                </div>
                            </div>


                            {/* Domain Management Item */}
                            <div>
                                <div
                                    className={`${navItemBase} ${activeView === 'domains' ? navItemActive : navItemInactive}`}
                                    onClick={() => { onNavigate('domains'); onClose?.(); }}
                                >
                                    <Globe size={19} className={activeView === 'domains' ? 'text-[var(--primary)]' : 'opacity-70 group-hover:opacity-100'} />
                                    <span className="font-bold text-sm">Domain Manager</span>
                                </div>
                            </div>

                            {/* Collaboration Item */}
                            <div>
                                <div
                                    className={`${navItemBase} ${activeView === 'collaboration' ? navItemActive : navItemInactive}`}
                                    onClick={() => { onNavigate('collaboration'); onClose?.(); }}
                                >
                                    <Users size={19} className={activeView === 'collaboration' ? 'text-[var(--primary)]' : 'opacity-70 group-hover:opacity-100'} />
                                    <span className="font-bold text-sm">Collaboration</span>
                                </div>
                            </div>

                            {/* Databases Item with Submenu */}
                            <div>
                                <div
                                    className={`${navItemBase} ${activeView === 'databases' ? navItemActive : navItemInactive}`}
                                    onClick={() => { onNavigate('databases'); onClose?.(); }}
                                >
                                    <Database size={19} className={activeView === 'databases' ? 'text-[var(--primary)]' : 'opacity-70 group-hover:opacity-100'} />
                                    <span className="font-bold text-sm">Databases</span>
                                    <ChevronRight size={14} className={`ml-auto transition-transform duration-300 ${activeView === 'databases' ? 'rotate-90' : 'opacity-40'}`} />
                                </div>

                                {/* Submenu - Visible when databases view is active */}
                                <div className={`mt-1 ml-4 pl-4 border-l border-[var(--border)] overflow-hidden transition-all duration-500 space-y-0.5 ${activeView === 'databases' ? 'max-h-[200px] opacity-100 py-2' : 'max-h-0 opacity-0'}`}>
                                    <div
                                        className="flex items-center gap-3 px-4 py-2 rounded-xl text-[12px] font-bold text-[var(--text-muted)] hover:text-amber-500 hover:bg-amber-500/5 cursor-pointer transition-all group/sub"
                                        onClick={() => { onAction('add-database'); onClose?.(); }}
                                    >
                                        <Plus size={14} className="opacity-40 group-hover/sub:opacity-100" />
                                        Create Database
                                    </div>
                                    <div
                                        className={`flex items-center gap-3 px-4 py-2 rounded-xl text-[12px] font-bold cursor-pointer transition-all group/sub ${activeView === 'databases' ? 'text-[var(--primary)] bg-[var(--primary)]/10' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--nav-hover)]'}`}
                                        onClick={() => { onNavigate('databases'); onClose?.(); }}
                                    >
                                        <LayoutGrid size={14} className={activeView === 'databases' ? 'opacity-100' : 'opacity-40 group-hover/sub:opacity-100'} />
                                        List Databases
                                    </div>
                                    <a
                                        href="http://localhost:8090"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 px-4 py-2 rounded-xl text-[12px] font-bold text-[var(--text-muted)] hover:text-blue-500 hover:bg-blue-500/5 cursor-pointer transition-all group/sub"
                                    >
                                        <ExternalLink size={14} className="opacity-40 group-hover/sub:opacity-100" />
                                        phpMyAdmin
                                    </a>
                                </div>
                            </div>

                            {/* DNS Item with Submenu */}
                            <div>
                                <div
                                    className={`${navItemBase} ${activeView === 'dns' ? navItemActive : navItemInactive}`}
                                    onClick={() => { onNavigate('dns'); onClose?.(); }}
                                >
                                    <ServerIcon size={19} className={activeView === 'dns' ? 'text-[var(--primary)]' : 'opacity-70 group-hover:opacity-100'} />
                                    <span className="font-bold text-sm">Zone Editor</span>
                                    <ChevronRight size={14} className={`ml-auto transition-transform duration-300 ${activeView === 'dns' ? 'rotate-90' : 'opacity-40'}`} />
                                </div>

                                {/* Submenu - Visible when dns view is active */}
                                <div className={`mt-1 ml-4 pl-4 border-l border-[var(--border)] overflow-hidden transition-all duration-500 space-y-0.5 ${activeView === 'dns' ? 'max-h-[200px] opacity-100 py-2' : 'max-h-0 opacity-0'}`}>
                                    <div
                                        className="flex items-center gap-3 px-4 py-2 rounded-xl text-[12px] font-bold text-[var(--text-muted)] hover:text-indigo-500 hover:bg-indigo-500/5 cursor-pointer transition-all group/sub"
                                        onClick={() => { onAction('add-dns'); onClose?.(); }}
                                    >
                                        <Plus size={14} className="opacity-40 group-hover/sub:opacity-100" />
                                        Create DNS Zone
                                    </div>
                                    <div
                                        className={`flex items-center gap-3 px-4 py-2 rounded-xl text-[12px] font-bold cursor-pointer transition-all group/sub ${activeView === 'dns' ? 'text-[var(--primary)] bg-[var(--primary)]/10' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--nav-hover)]'}`}
                                        onClick={() => { onNavigate('dns'); onClose?.(); }}
                                    >
                                        <LayoutGrid size={14} className={activeView === 'dns' ? 'opacity-100' : 'opacity-40 group-hover/sub:opacity-100'} />
                                        List DNS Zones
                                    </div>
                                    <div
                                        className="flex items-center gap-3 px-4 py-2 rounded-xl text-[12px] font-bold text-[var(--text-muted)] hover:text-amber-500 hover:bg-amber-500/5 cursor-pointer transition-all group/sub"
                                        onClick={() => { onAction('reset-dns'); onClose?.(); }}
                                    >
                                        <RefreshCw size={14} className="opacity-40 group-hover/sub:opacity-100" />
                                        Reset Config
                                    </div>
                                </div>
                            </div>
                            {/* PHP Item with Submenu */}
                            <div>
                                <div
                                    className={`${navItemBase} ${activeView === 'php' ? navItemActive : navItemInactive}`}
                                    onClick={() => { onNavigate('php'); onClose?.(); }}
                                >
                                    <Cpu size={19} className={activeView === 'php' ? 'text-[var(--primary)]' : 'opacity-70 group-hover:opacity-100'} />
                                    <span className="font-bold text-sm">PHP Manager</span>
                                    <ChevronRight size={14} className={`ml-auto transition-transform duration-300 ${activeView === 'php' ? 'rotate-90' : 'opacity-40'}`} />
                                </div>

                                {/* Submenu - Visible when php view is active */}
                                <div className={`mt-1 ml-4 pl-4 border-l border-[var(--border)] overflow-hidden transition-all duration-500 space-y-0.5 ${activeView === 'php' ? 'max-h-[250px] opacity-100 py-2' : 'max-h-0 opacity-0'}`}>
                                    <div
                                        className="flex items-center gap-3 px-4 py-2 rounded-xl text-[12px] font-bold text-[var(--text-muted)] hover:text-emerald-500 hover:bg-emerald-500/5 cursor-pointer transition-all group/sub"
                                        onClick={() => { onAction('add-php'); onClose?.(); }}
                                    >
                                        <Plus size={14} className="opacity-40 group-hover/sub:opacity-100" />
                                        Install PHP Version
                                    </div>
                                    <div
                                        className="flex items-center gap-3 px-4 py-2 rounded-xl text-[12px] font-bold text-[var(--text-muted)] hover:text-emerald-500 hover:bg-emerald-500/5 cursor-pointer transition-all group/sub"
                                        onClick={() => { onAction('php-extensions'); onClose?.(); }}
                                    >
                                        <Puzzle size={14} className="opacity-40 group-hover/sub:opacity-100" />
                                        Install Extensions
                                    </div>
                                    <div
                                        className="flex items-center gap-3 px-4 py-2 rounded-xl text-[12px] font-bold text-[var(--text-muted)] hover:text-amber-500 hover:bg-amber-500/5 cursor-pointer transition-all group/sub"
                                        onClick={() => { onAction('php-config'); onClose?.(); }}
                                    >
                                        <FileEdit size={14} className="opacity-40 group-hover/sub:opacity-100" />
                                        Edit PHP Configs
                                    </div>
                                    <div
                                        className={`flex items-center gap-3 px-4 py-2 rounded-xl text-[12px] font-bold cursor-pointer transition-all group/sub ${activeView === 'php' ? 'text-[var(--primary)] bg-[var(--primary)]/10' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--nav-hover)]'}`}
                                        onClick={() => { onNavigate('php'); onClose?.(); }}
                                    >
                                        <LayoutGrid size={14} className={activeView === 'php' ? 'opacity-100' : 'opacity-40 group-hover/sub:opacity-100'} />
                                        Version Manager
                                    </div>
                                </div>
                            </div>

                            {/* Email Item with Submenu */}
                            <div>
                                <div
                                    className={`${navItemBase} ${activeView === 'mail' ? navItemActive : navItemInactive}`}
                                    onClick={() => { onNavigate('mail'); onClose?.(); }}
                                >
                                    <Mail size={19} className={activeView === 'mail' ? 'text-[var(--primary)]' : 'opacity-70 group-hover:opacity-100'} />
                                    <span className="font-bold text-sm">Email Server</span>
                                    <ChevronRight size={14} className={`ml-auto transition-transform duration-300 ${activeView === 'mail' ? 'rotate-90' : 'opacity-40'}`} />
                                </div>
                                <div className={`mt-1 ml-4 pl-4 border-l border-[var(--border)] overflow-hidden transition-all duration-500 space-y-0.5 ${activeView === 'mail' ? 'max-h-[200px] opacity-100 py-2' : 'max-h-0 opacity-0'}`}>
                                    <div
                                        className="flex items-center gap-3 px-4 py-2 rounded-xl text-[12px] font-bold text-[var(--text-muted)] hover:text-sky-500 hover:bg-sky-500/5 cursor-pointer transition-all group/sub"
                                        onClick={() => { onAction('add-email-domain'); onClose?.(); }}
                                    >
                                        <Plus size={14} className="opacity-40 group-hover/sub:opacity-100" />
                                        Add Domain
                                    </div>
                                    <div
                                        className="flex items-center gap-3 px-4 py-2 rounded-xl text-[12px] font-bold text-[var(--text-muted)] hover:text-sky-500 hover:bg-sky-500/5 cursor-pointer transition-all group/sub"
                                        onClick={() => { onAction('add-email-account'); onClose?.(); }}
                                    >
                                        <Plus size={14} className="opacity-40 group-hover/sub:opacity-100" />
                                        Create Account
                                    </div>
                                    <div
                                        className={`flex items-center gap-3 px-4 py-2 rounded-xl text-[12px] font-bold cursor-pointer transition-all group/sub ${activeView === 'mail' ? 'text-[var(--primary)] bg-[var(--primary)]/10' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--nav-hover)]'}`}
                                        onClick={() => { onNavigate('mail'); onClose?.(); }}
                                    >
                                        <LayoutGrid size={14} className={activeView === 'mail' ? 'opacity-100' : 'opacity-40 group-hover/sub:opacity-100'} />
                                        Manage Email
                                    </div>
                                </div>
                            </div>

                            {/* SSH Access Item */}
                            <div>
                                <div
                                    className={`${navItemBase} ${activeView === 'ssh' ? navItemActive : navItemInactive}`}
                                    onClick={() => { onNavigate('ssh'); onClose?.(); }}
                                >
                                    <Key size={19} className={activeView === 'ssh' ? 'text-[var(--primary)]' : 'opacity-70 group-hover:opacity-100'} />
                                    <span className="font-bold text-sm">SSH Access</span>
                                    <ChevronRight size={14} className={`ml-auto transition-transform duration-300 ${activeView === 'ssh' ? 'rotate-90' : 'opacity-40'}`} />
                                </div>
                                <div className={`mt-1 ml-4 pl-4 border-l border-[var(--border)] overflow-hidden transition-all duration-500 space-y-0.5 ${activeView === 'ssh' ? 'max-h-[200px] opacity-100 py-2' : 'max-h-0 opacity-0'}`}>
                                    <div
                                        className="flex items-center gap-3 px-4 py-2 rounded-xl text-[12px] font-bold text-[var(--text-muted)] hover:text-emerald-500 hover:bg-emerald-500/5 cursor-pointer transition-all group/sub"
                                        onClick={() => { onAction('add-ssh-account'); onClose?.(); }}
                                    >
                                        <Plus size={14} className="opacity-40 group-hover/sub:opacity-100" />
                                        Create SSH Account
                                    </div>
                                    <div
                                        className={`flex items-center gap-3 px-4 py-2 rounded-xl text-[12px] font-bold cursor-pointer transition-all group/sub ${activeView === 'ssh' ? 'text-[var(--primary)] bg-[var(--primary)]/10' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--nav-hover)]'}`}
                                        onClick={() => { onNavigate('ssh'); onClose?.(); }}
                                    >
                                        <LayoutGrid size={14} className={activeView === 'ssh' ? 'opacity-100' : 'opacity-40 group-hover/sub:opacity-100'} />
                                        Manage SSH Accounts
                                    </div>
                                </div>
                            </div>

                            {/* Cron Jobs Item */}
                            <div>
                                <div
                                    className={`${navItemBase} ${activeView === 'cron' ? navItemActive : navItemInactive}`}
                                    onClick={() => { onNavigate('cron'); onClose?.(); }}
                                >
                                    <Clock size={19} className={activeView === 'cron' ? 'text-[var(--primary)]' : 'opacity-70 group-hover:opacity-100'} />
                                    <span className="font-bold text-sm">Cron Jobs</span>
                                </div>
                            </div>

                            {/* SSL Hub Item */}
                            <div>
                                <div
                                    className={`${navItemBase} ${activeView === 'ssl' ? navItemActive : navItemInactive}`}
                                    onClick={() => { onNavigate('ssl'); onClose?.(); }}
                                >
                                    <ShieldCheck size={19} className={activeView === 'ssl' ? 'text-[var(--primary)]' : 'opacity-70 group-hover:opacity-100'} />
                                    <span className="font-bold text-sm">SSL Hub</span>
                                </div>
                            </div>

                            {/* FTP Manager Item */}
                            <div>
                                <div
                                    className={`${navItemBase} ${activeView === 'ftp' ? navItemActive : navItemInactive}`}
                                    onClick={() => { onNavigate('ftp'); onClose?.(); }}
                                >
                                    <Folder size={19} className={activeView === 'ftp' ? 'text-[var(--primary)]' : 'opacity-70 group-hover:opacity-100'} />
                                    <span className="font-bold text-sm">FTP Manager</span>
                                </div>
                            </div>

                            {/* Plugin Marketplace Item */}
                            <div>
                                <div
                                    className={`${navItemBase} ${activeView === 'plugins' ? navItemActive : navItemInactive}`}
                                    onClick={() => { onNavigate('plugins'); onClose?.(); }}
                                >
                                    <Package size={19} className={activeView === 'plugins' ? 'text-[var(--primary)]' : 'opacity-70 group-hover:opacity-100'} />
                                    <span className="font-bold text-sm">Software Center</span>
                                    <ChevronRight size={14} className={`ml-auto transition-transform duration-300 ${activeView === 'plugins' ? 'rotate-90' : 'opacity-40'}`} />
                                </div>
                                <div className={`mt-1 ml-4 pl-4 border-l border-[var(--border)] overflow-hidden transition-all duration-500 space-y-0.5 ${activeView === 'plugins' ? 'max-h-[100px] opacity-100 py-2' : 'max-h-0 opacity-0'}`}>
                                    <div
                                        className={`flex items-center gap-3 px-4 py-2 rounded-xl text-[12px] font-bold cursor-pointer transition-all group/sub ${activeView === 'plugins' ? 'text-[var(--primary)] bg-[var(--primary)]/10' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--nav-hover)]'}`}
                                        onClick={() => { onNavigate('plugins'); onClose?.(); }}
                                    >
                                        <LayoutGrid size={14} className={activeView === 'plugins' ? 'opacity-100' : 'opacity-40 group-hover/sub:opacity-100'} />
                                        Browser Apps
                                    </div>
                                </div>
                            </div>


                        </div>
                    </div>

                    {/* STORAGE ECOSYSTEM */}
                    <div>
                        <p className="px-4 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-40">File Ecosystem</p>
                        <div className="space-y-1">
                            <div
                                className={`${navItemBase} ${activeView === 'drive' ? navItemActive : navItemInactive}`}
                                onClick={() => { onNavigate('drive'); onClose?.(); }}
                            >
                                <HardDrive size={19} className={activeView === 'drive' ? 'text-[var(--primary)]' : 'opacity-70 group-hover:opacity-100'} />
                                <span className="font-bold text-sm">File Manager</span>
                            </div>
                            <div
                                className={`${navItemBase} ${activeView === 'trash' ? navItemActive : navItemInactive}`}
                                onClick={() => { onAction('trash'); onClose?.(); }}
                            >
                                <Trash2 size={19} className={activeView === 'trash' ? 'text-red-500' : 'opacity-70 group-hover:text-red-500'} />
                                <span className="font-bold text-sm">Trash Bin</span>
                            </div>
                            <div
                                className={`${navItemBase} ${activeView === 'backups' ? navItemActive : navItemInactive}`}
                                onClick={() => { onNavigate('backups'); onClose?.(); }}
                            >
                                <Archive size={19} className={activeView === 'backups' ? 'text-[var(--primary)]' : 'opacity-70 group-hover:opacity-100'} />
                                <span className="font-bold text-sm">Backup Center</span>
                            </div>
                        </div>

                        {/* Resource Usage Widget */}
                        <ResourceUsageWidget />
                    </div>

                    {/* ADVANCED SECURITY */}
                    <div>
                        <p className="px-4 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-40">System & Security</p>
                        <div className="space-y-1">
                            <div
                                className={`${navItemBase} ${activeView === 'monitor' ? navItemActive : navItemInactive}`}
                                onClick={() => { onNavigate('monitor'); onClose?.(); }}
                            >
                                <ActivityIcon size={19} className={activeView === 'monitor' ? 'text-[var(--primary)]' : 'opacity-70 group-hover:opacity-100'} />
                                <span className="font-bold text-sm">Server Pulse</span>
                            </div>
                            <div
                                className={`${navItemBase} ${navItemInactive}`}
                                onClick={() => { onAction('php-services'); onClose?.(); }}
                            >
                                <Cpu size={19} className="opacity-70 group-hover:text-emerald-500" />
                                <span className="font-bold text-sm">PHP & Services</span>
                            </div>
                            <div
                                className={`${navItemBase} ${activeView === 'security-center' ? navItemActive : navItemInactive}`}
                                onClick={() => { onNavigate('security-center'); onClose?.(); }}
                            >
                                <ShieldCheck size={19} className={activeView === 'security-center' ? 'text-[var(--primary)]' : 'opacity-70 group-hover:text-indigo-500'} />
                                <span className="font-bold text-sm">Threat Defense</span>
                            </div>
                        </div>
                    </div>

                    {/* ADMINISTRATION (Conditionally Integrated) */}
                    {isAdmin && (
                        <div className="pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <p className="px-4 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-red-500/70">Administration</p>
                            <div className="space-y-1">
                                <div className={navItemBase + " " + navItemInactive} onClick={() => { onAction('siteSettings'); onClose?.(); }}>
                                    <Settings size={19} className="opacity-70 group-hover:text-violet-400" />
                                    <span className="font-bold text-sm">System Branding</span>
                                </div>
                                <div className={navItemBase + " " + navItemInactive} onClick={() => { onAction('manageShares'); onClose?.(); }}>
                                    <Share2 size={19} className="opacity-70 group-hover:text-pink-400" />
                                    <span className="font-bold text-sm">Global Shares</span>
                                </div>
                                <div className={navItemBase + " " + navItemInactive} onClick={() => { onAction('terminal'); onClose?.(); }}>
                                    <Terminal size={19} className="opacity-70 group-hover:text-emerald-400" />
                                    <span className="font-bold text-sm">System Terminal</span>
                                </div>
                                <div className={navItemBase + " " + navItemInactive} onClick={() => { onAction('manageUsers'); onClose?.(); }}>
                                    <Users size={19} className="opacity-70 group-hover:text-sky-400" />
                                    <span className="font-bold text-sm">User Management</span>
                                </div>
                                <div className={navItemBase + " " + navItemInactive} onClick={() => { onAction('maintenance'); onClose?.(); }}>
                                    <Wrench size={19} className="opacity-70 group-hover:text-amber-400" />
                                    <span className="font-bold text-sm">System Maintenance</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>


            </aside>
        </>
    );
};

export default Sidebar;
