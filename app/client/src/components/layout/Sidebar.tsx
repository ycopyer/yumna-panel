import React from 'react';
import {
    LayoutGrid, History, Trash2, Heart, Globe, Database, Server as ServerIcon, Lock, Users, Share2, BarChart2, Shield, Settings,
    Activity as ActivityIcon, ShieldAlert, Cpu, LogOut, Search, ChevronRight, Upload, Folder, FolderPlus, ShieldCheck, Scale, Star, User, Menu, X,
    LayoutDashboard, HardDrive, Fingerprint, Plus, Link2, Power, Package, ExternalLink, RefreshCw, Puzzle, FileEdit
} from 'lucide-react';

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
    const isAdmin = user.role?.toLowerCase() === 'admin' || (user.userId === 1 || user.id === 1);
    const usagePercent = userProfile?.storage_quota
        ? Math.min(100, ((userProfile.used_storage || 0) / userProfile.storage_quota) * 100)
        : 0;
    const isCritical = usagePercent > 90;

    const navItemBase = "flex items-center gap-3.5 px-4 py-3 rounded-xl cursor-pointer transition-all duration-300 group select-none";
    const navItemActive = "bg-[var(--nav-active)] text-[var(--primary)] shadow-[0_4px_12px_rgba(99,102,241,0.12)] ring-1 ring-[var(--primary)]/20";
    const navItemInactive = "text-[var(--text-muted)] hover:bg-[var(--nav-hover)] hover:text-[var(--text-main)]";

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-md animate-fade"
                    onClick={onClose}
                />
            )}

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
                                <div className="absolute inset-0 bg-[var(--primary)] blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                <div className="relative bg-gradient-to-br from-[var(--primary)] to-indigo-600 rounded-2xl p-2.5 w-12 h-12 flex items-center justify-center shadow-xl border border-white/10 overflow-hidden transform group-hover:rotate-6 transition-transform">
                                    {siteSettings.logo_url ? (
                                        <img src={siteSettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                                    ) : (
                                        <Shield className="text-white" size={24} />
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-black tracking-tight text-[var(--text-main)] truncate max-w-[140px] leading-tight">
                                    {siteSettings.site_title || 'Yumna Panel'}
                                </span>
                                <span className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-widest opacity-80">
                                    {isAdmin ? 'Enterprise Admin' : 'Cloud Hosting'}
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

                    {/* Quick Actions */}
                    {user.role !== 'viewer' && (
                        <div className="grid grid-cols-2 gap-3 mb-2">
                            <button
                                onClick={() => { onAction('upload'); onClose?.(); }}
                                className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-[var(--primary)] text-white shadow-lg shadow-indigo-500/25 active:scale-95 transition-all hover:brightness-110"
                            >
                                <Upload size={18} />
                                <span className="text-[10px] font-black uppercase tracking-wider">Upload</span>
                            </button>
                            <button
                                onClick={() => { onAction('createFolder'); onClose?.(); }}
                                className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-[var(--nav-hover)] text-[var(--text-main)] border border-[var(--border)] hover:border-[var(--primary)]/40 active:scale-95 transition-all group"
                            >
                                <FolderPlus size={18} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
                                <span className="text-[10px] font-black uppercase tracking-wider">New Dir</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Navigation Menu */}
                <div className="flex-1 px-4 pb-6 space-y-7 overflow-y-auto custom-scrollbar">

                    {/* SYSTEM DASHBOARD */}
                    <div>
                        <p className="px-4 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-40">Intelligence</p>
                        <div className="space-y-1">
                            <div
                                className={`${navItemBase} ${activeView === 'analytics' ? navItemActive : navItemInactive}`}
                                onClick={() => { onAction('analytics'); onClose?.(); }}
                            >
                                <ActivityIcon size={19} className={activeView === 'analytics' ? 'text-[var(--primary)]' : 'opacity-70 group-hover:opacity-100'} />
                                <span className="font-bold text-sm">Server Pulse</span>
                            </div>
                            <div
                                className={`${navItemBase} ${activeView === 'audit' ? navItemActive : navItemInactive}`}
                                onClick={() => { onAction('activity'); onClose?.(); }}
                            >
                                <Fingerprint size={19} className={activeView === 'audit' ? 'text-[var(--primary)]' : 'opacity-70 group-hover:opacity-100'} />
                                <span className="font-bold text-sm">Security Audit</span>
                            </div>
                        </div>
                    </div>

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
                                    <div
                                        className="flex items-center gap-3 px-4 py-2 rounded-xl text-[12px] font-bold text-[var(--text-muted)] hover:text-amber-500 hover:bg-amber-500/5 cursor-pointer transition-all group/sub"
                                        onClick={() => { onAction('manage-subdomains'); onClose?.(); }}
                                    >
                                        <Link2 size={14} className="opacity-40 group-hover/sub:opacity-100" />
                                        Create Sub/Addon
                                    </div>
                                    <div
                                        className="flex items-center gap-3 px-4 py-2 rounded-xl text-[12px] font-bold text-[var(--text-muted)] hover:text-sky-500 hover:bg-sky-500/5 cursor-pointer transition-all group/sub"
                                        onClick={() => { onAction('manage-subdomains'); onClose?.(); }}
                                    >
                                        <History size={14} className="opacity-40 group-hover/sub:opacity-100" />
                                        List Sub/Addon
                                    </div>
                                    <div
                                        className="flex items-center gap-3 px-4 py-2 rounded-xl text-[12px] font-bold text-[var(--text-muted)] hover:text-violet-500 hover:bg-violet-500/5 cursor-pointer transition-all group/sub"
                                        onClick={() => { onAction('modify-website'); onClose?.(); }}
                                    >
                                        <Settings size={14} className="opacity-40 group-hover/sub:opacity-100" />
                                        Modify Website
                                    </div>
                                    <div
                                        className="flex items-center gap-3 px-4 py-2 rounded-xl text-[12px] font-bold text-[var(--text-muted)] hover:text-emerald-500 hover:bg-emerald-500/5 cursor-pointer transition-all group/sub"
                                        onClick={() => { onAction('website-installer'); onClose?.(); }}
                                    >
                                        <Package size={14} className="opacity-40 group-hover/sub:opacity-100" />
                                        App Installer
                                    </div>
                                    <div
                                        className="flex items-center gap-3 px-4 py-2 rounded-xl text-[12px] font-bold text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/5 cursor-pointer transition-all group/sub"
                                        onClick={() => { onAction('suspend-website'); onClose?.(); }}
                                    >
                                        <Power size={14} className="opacity-40 group-hover/sub:opacity-100" />
                                        Suspend/Unsuspend
                                    </div>
                                    <div
                                        className="flex items-center gap-3 px-4 py-2 rounded-xl text-[12px] font-bold text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/5 cursor-pointer transition-all group/sub"
                                        onClick={() => { onAction('delete-website'); onClose?.(); }}
                                    >
                                        <Trash2 size={14} className="opacity-40 group-hover/sub:opacity-100" />
                                        Delete Website
                                    </div>
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
                                        href="/phpmyadmin"
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
                        </div>

                        {/* Storage Indicator integrated */}
                        {userProfile?.storage_quota > 0 && (
                            <div className="mt-4 px-2">
                                <div className="p-3.5 bg-gradient-to-br from-[var(--nav-hover)] to-transparent rounded-2xl border border-[var(--border)] relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-[var(--primary)]/5 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-end mb-2.5">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">Drive Usage</span>
                                                <span className="text-xs font-black text-[var(--text-main)]">
                                                    {formatBytes(userProfile.used_storage || 0)} <span className="text-[var(--text-muted)] font-bold">/ {formatBytes(userProfile.storage_quota)}</span>
                                                </span>
                                            </div>
                                            <span className={`text-xs font-black p-1.5 rounded-lg ${isCritical ? 'bg-red-500/20 text-red-500' : 'bg-[var(--primary)]/10 text-[var(--primary)]'}`}>
                                                {usagePercent.toFixed(0)}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-[var(--bg-dark)] rounded-full overflow-hidden shadow-inner">
                                            <div
                                                className={`h-full transition-all duration-1000 ease-out rounded-full ${isCritical ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-gradient-to-r from-[var(--primary)] to-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]'} `}
                                                style={{ width: `${usagePercent}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ADVANCED SECURITY */}
                    <div>
                        <p className="px-4 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-40">Cyber Security</p>
                        <div className="space-y-1">
                            <div
                                className={`${navItemBase} ${navItemInactive}`}
                                onClick={() => { onAction('php-services'); onClose?.(); }}
                            >
                                <Cpu size={19} className="opacity-70 group-hover:text-emerald-500" />
                                <span className="font-bold text-sm">PHP & Services</span>
                            </div>
                            <div
                                className={`${navItemBase} ${navItemInactive}`}
                                onClick={() => { onAction('firewall'); onClose?.(); }}
                            >
                                <ShieldAlert size={19} className="opacity-70 group-hover:text-amber-500" />
                                <span className="font-bold text-sm">Threat Map</span>
                            </div>
                            <div
                                className={`${navItemBase} ${navItemInactive}`}
                                onClick={() => { onAction('firewall-malware'); onClose?.(); }}
                            >
                                <ShieldCheck size={19} className="opacity-70 group-hover:text-rose-500" />
                                <span className="font-bold text-sm">Malware Guard</span>
                            </div>
                            <div
                                className={`${navItemBase} ${navItemInactive}`}
                                onClick={() => { onAction('firewall-compliance'); onClose?.(); }}
                            >
                                <Scale size={19} className="opacity-70 group-hover:text-indigo-500" />
                                <span className="font-bold text-sm">Compliance</span>
                            </div>
                        </div>
                    </div>

                    {/* ADMINISTRATION (Conditionally Integrated) */}
                    {isAdmin && (
                        <div className="pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <p className="px-4 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-red-500/70">Terminal Admin</p>
                            <div className="space-y-1">
                                <div className={navItemBase + " " + navItemInactive} onClick={() => { onAction('manageUsers'); onClose?.(); }}>
                                    <Users size={19} className="opacity-70 group-hover:text-sky-400" />
                                    <span className="font-bold text-sm">User Management</span>
                                </div>
                                <div className={navItemBase + " " + navItemInactive} onClick={() => { onAction('manageShares'); onClose?.(); }}>
                                    <Share2 size={19} className="opacity-70 group-hover:text-pink-400" />
                                    <span className="font-bold text-sm">Global Shares</span>
                                </div>
                                <div className={navItemBase + " " + navItemInactive} onClick={() => { onAction('siteSettings'); onClose?.(); }}>
                                    <Settings size={19} className="opacity-70 group-hover:text-violet-400" />
                                    <span className="font-bold text-sm">System Branding</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer / Account Settings */}
                <div className="p-4 mt-auto">
                    <div className="bg-[var(--nav-hover)]/40 rounded-3xl border border-[var(--border)] p-2">
                        <div className="flex flex-col gap-1">
                            <div
                                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[var(--nav-hover)] transition-all cursor-pointer group"
                                onClick={() => { onAction('settings'); onClose?.(); }}
                            >
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-900 flex items-center justify-center border border-white/5 shadow-lg group-hover:border-[var(--primary)]/50 transition-colors">
                                    <User size={20} className="text-white/80" />
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-sm font-black text-[var(--text-main)] truncate">{user.username}</span>
                                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{user.role}</span>
                                </div>
                                <ChevronRight size={16} className="ml-auto text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
                            </div>

                            <div className="h-[1px] bg-[var(--border)] mx-3 my-1"></div>

                            <button
                                onClick={onLogout}
                                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-red-500/10 text-red-500/70 hover:text-red-500 transition-all font-bold text-sm group"
                            >
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/5 group-hover:bg-red-500/20 transition-colors">
                                    <LogOut size={18} />
                                </div>
                                <span>Logout Session</span>
                            </button>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
