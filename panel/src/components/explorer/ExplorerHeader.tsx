import React, { useState } from 'react';
import { Menu, Sun, Moon, User, LogOut, Settings, ChevronDown } from 'lucide-react';

interface ExplorerHeaderProps {
    user: any;
    onToggleSidebar: () => void;
    toggleTheme: () => void;
    isDarkMode: boolean;
    onOpenSettings: () => void;
    onLogout: () => void;
    avatarUrl?: string;
}

const ExplorerHeader: React.FC<ExplorerHeaderProps> = ({
    user,
    onToggleSidebar,
    toggleTheme,
    isDarkMode,
    onOpenSettings,
    onLogout,
    avatarUrl
}) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [imgError, setImgError] = useState(false);

    return (
        <header className="flex items-center justify-between mb-8">
            {/* Mobile Sidebar Toggle */}
            <button
                onClick={onToggleSidebar}
                className="p-2 -ml-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--nav-hover)] active:scale-95 transition-all md:hidden"
            >
                <Menu size={24} />
            </button>

            {/* Spacer to push everything to right */}
            <div className="flex-1"></div>

            {/* Right Section: Theme & Profile */}
            <div className="flex items-center gap-4">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--nav-hover)] border border-transparent hover:border-[var(--border)] transition-all"
                    title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                {/* Profile Section */}
                <div className="relative">
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center gap-4 pl-2 pr-5 py-2 rounded-full bg-[var(--nav-hover)]/50 hover:bg-[var(--nav-hover)] border border-[var(--border)] transition-all group"
                    >
                        <div className="w-12 h-12 shrink-0 rounded-full overflow-hidden shadow-sm border border-[var(--border)]">
                            {avatarUrl && !imgError ? (
                                <img
                                    src={avatarUrl}
                                    alt="Avatar"
                                    className="w-full h-full object-cover bg-[var(--bg-main)]"
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <div className="w-full h-full bg-[var(--nav-hover)] flex items-center justify-center text-[var(--text-muted)]">
                                    <User size={24} />
                                </div>
                            )}
                        </div>
                        <div className="text-left hidden sm:block">
                            <p className="text-base font-black text-[var(--text-main)] leading-none mb-1">{user.username}</p>
                            <p className="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">{user.role}</p>
                        </div>
                        <ChevronDown size={16} className={`text-[var(--text-muted)] transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Profile Dropdown */}
                    {isProfileOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)}></div>
                            <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--bg-main)]/95 backdrop-blur-xl border border-[var(--border)] rounded-2xl shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-3 py-2 border-b border-[var(--border)] mb-2">
                                    <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Signed in as</p>
                                    <p className="text-sm font-black text-[var(--text-main)] truncate">{user.username}</p>
                                </div>
                                <div className="space-y-1">
                                    <button
                                        onClick={() => { onOpenSettings(); setIsProfileOpen(false); }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--nav-hover)] transition-all"
                                    >
                                        <Settings size={16} />
                                        Profile Settings
                                    </button>
                                    <button
                                        onClick={() => { onLogout(); setIsProfileOpen(false); }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500/10 transition-all"
                                    >
                                        <LogOut size={16} />
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

export default ExplorerHeader;
