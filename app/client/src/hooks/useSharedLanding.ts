import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

export const useSharedLanding = (id: string | undefined) => {
    const [shareInfo, setShareInfo] = useState<any>(null);
    const [password, setPassword] = useState(() => (id ? sessionStorage.getItem(`share_pass_${id}`) : '') || '');
    const [subPath, setSubPath] = useState(() => (id ? sessionStorage.getItem(`share_path_${id}`) : '') || '');
    const [files, setFiles] = useState<any[]>([]);
    const [isAuthenticated, setIsAuthenticated] = useState(() => id ? !!sessionStorage.getItem(`share_pass_${id}`) : false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [fetchingFiles, setFetchingFiles] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [propertiesFile, setPropertiesFile] = useState<any>(null);
    const [activeDownloads, setActiveDownloads] = useState<any[]>([]);
    const [isManagerOpen, setIsManagerOpen] = useState(true);
    const [siteSettings, setSiteSettings] = useState<any>({});
    const [downloadProgress, setDownloadProgress] = useState<{ show: boolean, message: string, itemCount: number }>({ show: false, message: '', itemCount: 0 });
    const [isDarkMode, setIsDarkMode] = useState(() => !document.documentElement.classList.contains('light-mode'));
    const [previewFile, setPreviewFile] = useState<string | null>(null);
    const [previewType, setPreviewType] = useState<'pdf' | 'text' | 'image' | 'video' | null>(null);
    const [captcha, setCaptcha] = useState({ id: '', svg: '' });
    const [captchaText, setCaptchaText] = useState('');
    const abortControllers = useRef<Record<string, AbortController>>({});

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.documentElement.classList.add('light-mode');
            setIsDarkMode(false);
        } else {
            document.documentElement.classList.remove('light-mode');
            setIsDarkMode(true);
        }
    }, []);

    const toggleTheme = () => {
        const isNowLight = document.documentElement.classList.toggle('light-mode');
        setIsDarkMode(!isNowLight);
        localStorage.setItem('theme', isNowLight ? 'light' : 'dark');
    };

    const fetchCaptcha = useCallback(async () => {
        try {
            const res = await axios.get('/api/captcha');
            setCaptcha(res.data);
            setCaptchaText('');
        } catch (err) {
            console.error('Failed to fetch captcha:', err);
        }
    }, []);

    const fetchFiles = useCallback(async () => {
        if (!id || !isAuthenticated) return;
        setFetchingFiles(true);
        try {
            const res = await axios.post(`/api/share-ls/${id}?subPath=${encodeURIComponent(subPath)}&search=${encodeURIComponent(searchQuery)}`, { password });
            setFiles(res.data);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to fetch contents');
            if (err.response?.status === 403) {
                sessionStorage.removeItem(`share_pass_${id}`);
                setIsAuthenticated(false);
                fetchCaptcha(); // Get new captcha if forbidden
            }
        } finally {
            setFetchingFiles(false);
        }
    }, [id, isAuthenticated, subPath, password, searchQuery, fetchCaptcha]);

    useEffect(() => {
        if (id && subPath) {
            sessionStorage.setItem(`share_path_${id}`, subPath);
        } else if (id && subPath === '') {
            sessionStorage.removeItem(`share_path_${id}`);
        }
    }, [id, subPath]);

    useEffect(() => {
        const fetchInfo = async () => {
            if (!id) return;
            try {
                const res = await axios.get(`/api/share-info/${id}`);
                setShareInfo(res.data);

                const storedPassword = sessionStorage.getItem(`share_pass_${id}`);
                if (storedPassword) {
                    // Password already initialized from sessionStorage in useState
                    setIsAuthenticated(true);
                } else if (!res.data.hasPassword) {
                    setIsAuthenticated(true);
                } else {
                    fetchCaptcha();
                }
            } catch (err: any) {
                setError(err.response?.data?.error || 'Share not found or expired');
            } finally {
                setLoading(false);
            }
        };

        const fetchSiteSettings = async () => {
            try {
                const res = await axios.get('/api/settings-site');
                setSiteSettings(res.data);
            } catch (err) {
                console.error('Failed to fetch site settings', err);
            }
        };

        fetchInfo();
        fetchSiteSettings();
    }, [id, fetchCaptcha]);

    useEffect(() => {
        if (isAuthenticated) {
            const timer = setTimeout(() => {
                fetchFiles();
            }, searchQuery ? 500 : 0); // Debounce search
            return () => clearTimeout(timer);
        }
    }, [isAuthenticated, fetchFiles, searchQuery]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

        setLoading(true);
        setError('');

        try {
            await axios.post(`/api/share-auth/${id}`, {
                password,
                captchaId: captcha.id,
                captchaText
            });

            sessionStorage.setItem(`share_pass_${id}`, password);
            sessionStorage.setItem(`share_last_active_${id}`, Date.now().toString());
            setIsAuthenticated(true);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Authentication failed');
            fetchCaptcha();
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = useCallback(() => {
        if (id) {
            sessionStorage.removeItem(`share_pass_${id}`);
            sessionStorage.removeItem(`share_last_active_${id}`);
        }
        setIsAuthenticated(false);
        setFiles([]);
    }, [id]);

    // Auto-logout after 15 mins of inactivity
    useEffect(() => {
        if (!isAuthenticated || !id) return;

        const checkInactivity = () => {
            const lastActive = sessionStorage.getItem(`share_last_active_${id}`);
            if (lastActive) {
                const diff = Date.now() - parseInt(lastActive);
                const fifteenMins = 15 * 60 * 1000;
                if (diff > fifteenMins) {
                    handleLogout();
                    alert('Session expired due to inactivity (15 minutes).');
                }
            }
        };

        const updateActivity = () => {
            sessionStorage.setItem(`share_last_active_${id}`, Date.now().toString());
        };

        const interval = setInterval(checkInactivity, 30000); // Check every 30 seconds

        // Listen for user interactions to update last active timestamp
        window.addEventListener('mousemove', updateActivity);
        window.addEventListener('keydown', updateActivity);
        window.addEventListener('click', updateActivity);
        window.addEventListener('scroll', updateActivity);

        return () => {
            clearInterval(interval);
            window.removeEventListener('mousemove', updateActivity);
            window.removeEventListener('keydown', updateActivity);
            window.removeEventListener('click', updateActivity);
            window.removeEventListener('scroll', updateActivity);
        };
    }, [isAuthenticated, id, handleLogout]);

    const handleDownload = async (file?: any) => {
        if (!id || !shareInfo) return;
        const targetSubPath = file ? (subPath ? `${subPath}/${file.name}` : file.name) : subPath;
        const targetName = file ? file.name : shareInfo.fileName;
        const isFolder = file ? file.type === 'directory' : shareInfo.isFolder;
        const downloadId = Math.random().toString(36).substr(2, 9);

        const newDownload = {
            id: downloadId,
            name: targetName,
            progress: 0,
            status: 'downloading',
            isFolder
        };

        setActiveDownloads(prev => [newDownload, ...prev]);
        setIsManagerOpen(true);

        const controller = new AbortController();
        abortControllers.current[downloadId] = controller;

        try {
            const res = await axios.post(`/api/share-download/${id}`, {
                password: password,
                subPath: targetSubPath
            }, {
                responseType: 'blob',
                signal: controller.signal,
                onDownloadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setActiveDownloads(prev => prev.map(dl =>
                            dl.id === downloadId ? { ...dl, progress: percent } : dl
                        ));
                    } else {
                        const loadedMB = Math.floor(progressEvent.loaded / (1024 * 1024));
                        const estimated = Math.min(95, Math.max(5, loadedMB % 95));
                        setActiveDownloads(prev => prev.map(dl =>
                            dl.id === downloadId ? { ...dl, progress: estimated } : dl
                        ));
                    }
                }
            });

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', isFolder ? `${targetName}.zip` : targetName);
            document.body.appendChild(link);
            link.click();
            link.remove();

            setActiveDownloads(prev => prev.map(dl =>
                dl.id === downloadId ? { ...dl, status: 'completed', progress: 100 } : dl
            ));
        } catch (err: any) {
            if (axios.isCancel(err)) {
                setActiveDownloads(prev => prev.map(dl =>
                    dl.id === downloadId ? { ...dl, status: 'cancelled' } : dl
                ));
            } else {
                setActiveDownloads(prev => prev.map(dl =>
                    dl.id === downloadId ? { ...dl, status: 'error' } : dl
                ));
            }
        } finally {
            delete abortControllers.current[downloadId];
        }
    };

    const cancelDownload = (downloadId: string) => {
        if (abortControllers.current[downloadId]) {
            abortControllers.current[downloadId].abort();
        }
    };



    const viewPreview = async (file: any) => {
        if (!id || !file || !shareInfo) return;

        // Build the correct full path
        let targetPath;
        if (shareInfo.isFolder) {
            const basePath = shareInfo.filePath;
            if (subPath) {
                targetPath = `${basePath}/${subPath}/${file.name}`;
            } else {
                targetPath = `${basePath}/${file.name}`;
            }
        } else {
            targetPath = shareInfo.filePath;
        }

        const ext = file.name.split('.').pop()?.toLowerCase();

        let type: 'pdf' | 'text' | 'image' | 'video' | null = null;
        if (ext === 'pdf') type = 'pdf';
        else if (['txt', 'log', 'md', 'json', 'xml', 'csv'].includes(ext || '')) type = 'text';
        else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) type = 'image';
        else if (['mp4', 'webm', 'ogg'].includes(ext || '')) type = 'video';

        if (type) {
            try {
                // Generate secure token (hides password and path from URL)
                const tokenRes = await axios.post(`/api/share-preview-token/${id}`, {
                    password,
                    path: targetPath,
                    type
                });

                const token = tokenRes.data.token;
                const previewUrl = `/api/share-preview/${id}/${token}`;

                console.log('[DEBUG] Secure preview URL (no password/path exposed):', previewUrl);
                setPreviewFile(previewUrl);
                setPreviewType(type);
            } catch (err: any) {
                console.error('Failed to generate preview token:', err);
                alert('Failed to load preview');
            }
        }
    };

    return {
        shareInfo, setShareInfo,
        password, setPassword,
        subPath, setSubPath,
        files, setFiles,
        isAuthenticated, setIsAuthenticated,
        error, setError,
        loading, setLoading,
        fetchingFiles, setFetchingFiles,
        downloading, setDownloading,
        searchQuery, setSearchQuery,
        propertiesFile, setPropertiesFile,
        activeDownloads, setActiveDownloads,
        isManagerOpen, setIsManagerOpen,
        cancelDownload,
        siteSettings, setSiteSettings,
        downloadProgress, setDownloadProgress,
        isDarkMode,
        toggleTheme,
        handleLogin,
        handleLogout,
        handleDownload,
        previewFile, setPreviewFile,
        previewType, setPreviewType,
        viewPreview,
        captcha, captchaText, setCaptchaText, fetchCaptcha
    };
};
