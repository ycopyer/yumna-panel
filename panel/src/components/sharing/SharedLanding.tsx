import React from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, AlertCircle, ChevronRight, Shield } from 'lucide-react';
import { useSharedLanding } from '../../hooks/useSharedLanding';
import SharedLandingHeader from './SharedLandingHeader';
import SharedLandingModals from './SharedLandingModals';
import SharedLogin from './SharedLogin';
import SharedFileList from './SharedFileList';

const SharedLanding: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const {
        shareInfo, password, setPassword, subPath, setSubPath, files,
        isAuthenticated, error, loading, fetchingFiles, downloading,
        searchQuery, setSearchQuery, propertiesFile, setPropertiesFile,
        activeDownloads, setActiveDownloads, isManagerOpen, setIsManagerOpen,
        cancelDownload, siteSettings, downloadProgress, isDarkMode,
        toggleTheme, handleLogin, handleLogout, handleDownload,
        previewFile, setPreviewFile, previewType, setPreviewType, viewPreview,
        captcha, captchaText, setCaptchaText, fetchCaptcha
    } = useSharedLanding(id);

    const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a] animate-fade">
            <div className="relative">
                <Loader2 className="animate-spin text-indigo-500 mb-6" size={64} />
                <div className="absolute inset-0 blur-2xl bg-indigo-500/20 rounded-full animate-pulse"></div>
            </div>
            <p className="text-slate-400 font-medium tracking-wide">Establishing secure connection...</p>
        </div>
    );

    if (error && !shareInfo) return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.05),transparent)]">
            <div className="glass max-w-md w-full p-10 text-center animate-fade border-rose-500/20">
                <div className="bg-rose-500/10 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3 shadow-[0_0_30px_rgba(244,63,94,0.1)]">
                    <AlertCircle size={44} className="text-rose-500" />
                </div>
                <h3 className="text-2xl font-black text-white mb-4">Access Denied</h3>
                <p className="text-slate-400 leading-relaxed mb-8">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="btn-primary w-full py-4 rounded-2xl shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all font-bold"
                >
                    Try Again
                </button>
            </div>
        </div>
    );

    return (
        <div className={`min-h-screen bg-[var(--bg-dark)] transition-colors duration-300 ${isAuthenticated ? '' : 'flex items-center justify-center p-6'}`}>
            <div className={`w-full ${isAuthenticated ? 'min-h-screen flex flex-col' : 'max-w-md'}`}>
                {!isAuthenticated ? (
                    <SharedLogin
                        siteSettings={siteSettings}
                        shareInfo={shareInfo}
                        password={password}
                        setPassword={setPassword}
                        handleLogin={handleLogin}
                        error={error}
                        captcha={captcha}
                        captchaText={captchaText}
                        setCaptchaText={setCaptchaText}
                        fetchCaptcha={fetchCaptcha}
                    />
                ) : (
                    <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-10 max-w-7xl mx-auto w-full animate-fade">
                        <SharedLandingHeader
                            siteSettings={siteSettings}
                            shareInfo={shareInfo}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            toggleTheme={toggleTheme}
                            isDarkMode={isDarkMode}
                            handleDownload={handleDownload}
                            handleLogout={handleLogout}
                            downloading={downloading}
                        />

                        {shareInfo.isFolder && (
                            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 mb-4 sm:mb-6 bg-[var(--nav-hover)] border border-[var(--border)] rounded-xl sm:rounded-2xl overflow-x-auto custom-scrollbar whitespace-nowrap scroll-smooth shadow-sm no-scrollbar">
                                <button
                                    onClick={() => setSubPath('')}
                                    className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[12px] sm:text-sm font-bold transition-all ${subPath === '' ? 'bg-[var(--primary)] text-white shadow-md shadow-indigo-500/20' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--card-bg)]'}`}
                                >
                                    Home
                                </button>
                                {subPath.split('/').filter(Boolean).map((part, i, parts) => (
                                    <React.Fragment key={i}>
                                        <ChevronRight size={12} className="text-[var(--border)] opacity-60 flex-none" />
                                        <button
                                            onClick={() => setSubPath(parts.slice(0, i + 1).join('/'))}
                                            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[12px] sm:text-sm font-bold transition-all ${i === parts.length - 1 ? 'bg-[var(--primary)] text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                                        >
                                            {part}
                                        </button>
                                    </React.Fragment>
                                ))}
                            </div>
                        )}

                        <div className="glass flex-1 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl shadow-black/20 flex flex-col border-[var(--border)]/50 min-h-0">
                            <SharedFileList
                                fetchingFiles={fetchingFiles}
                                filteredFiles={filteredFiles}
                                subPath={subPath}
                                setSubPath={setSubPath}
                                shareInfo={shareInfo}
                                handleDownload={handleDownload}
                                setPropertiesFile={setPropertiesFile}
                                viewPreview={viewPreview}
                                setSearchQuery={setSearchQuery}
                            />
                        </div>

                        <div className="flex flex-col md:flex-row justify-between items-center px-4 pt-6 sm:pt-10 pb-4 sm:pb-6 gap-4 sm:gap-6 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                            <div className="flex items-center gap-3">
                                <span className="bg-[var(--nav-hover)] px-2.5 py-1.5 rounded-lg border border-[var(--border)]">{filteredFiles.filter(f => f.type === 'file').length} Files</span>
                                <span className="bg-[var(--nav-hover)] px-2.5 py-1.5 rounded-lg border border-[var(--border)]">{filteredFiles.filter(f => f.type === 'directory').length} Folders</span>
                            </div>

                            <div className="flex flex-col items-center md:items-end gap-1.5 text-center md:text-right">
                                <span className="text-[var(--text-main)] font-black text-[11px] sm:text-[13px] tracking-normal">{siteSettings.site_title || 'Yumna Panel'}</span>
                                <div className="flex flex-wrap justify-center md:justify-end items-center gap-x-3 gap-y-1 opacity-60">
                                    <span>© {new Date().getFullYear()}</span>
                                    {siteSettings.footer_text && (
                                        <>
                                            <span className="w-1 h-1 rounded-full bg-[var(--text-muted)] opacity-50 hide-mobile" />
                                            <span className="hide-mobile">{siteSettings.footer_text}</span>
                                        </>
                                    )}
                                </div>
                                {siteSettings.app_version && (
                                    <span className="opacity-40 text-[9px] font-medium tracking-widest px-2 py-0.5 rounded bg-white/5 border border-white/5">v{siteSettings.app_version}</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <SharedLandingModals
                propertiesFile={propertiesFile}
                setPropertiesFile={setPropertiesFile}
                shareInfo={shareInfo}
                handleDownload={handleDownload}
                activeDownloads={activeDownloads}
                setActiveDownloads={setActiveDownloads}
                isManagerOpen={isManagerOpen}
                setIsManagerOpen={setIsManagerOpen}
                cancelDownload={cancelDownload}
                downloadProgress={downloadProgress}
                previewFile={previewFile}
                setPreviewFile={setPreviewFile}
                previewType={previewType}
                files={files}
                handleDownload2={handleDownload}
                subPath={subPath}
            />
        </div>
    );
};


export default SharedLanding;
