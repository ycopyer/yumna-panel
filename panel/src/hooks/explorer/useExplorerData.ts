import { useCallback } from 'react';
import axios from 'axios';

export const useExplorerData = (state: any, onLogout: () => void) => {
    const {
        userId, path, setPath, setFiles, setLoading, setActiveView,
        setIsSearchActive, setShowSettings, setFavorites, setSiteSettings,
        setUserProfile, setServerPulse, activeView
    } = state;

    const fetchFiles = useCallback(async (targetPath: string) => {
        setLoading(true);
        try {
            const timestamp = Date.now();
            const res = await axios.get(`/api/ls?path=${encodeURIComponent(targetPath)}&userId=${userId}&_t=${timestamp}`);
            setFiles(res.data);
            setPath(targetPath);
            setActiveView('drive');
            setIsSearchActive(false);
        } catch (err: any) {
            console.error(err);
            if (axios.isAxiosError(err) && err.response?.status === 401) {
                onLogout();
            }
        } finally {
            setLoading(false);
        }
    }, [userId, setLoading, setFiles, setPath, setActiveView, setIsSearchActive, onLogout]);

    const fetchSharedFiles = async () => {
        setLoading(true);
        try {
            const timestamp = Date.now();
            const res = await axios.get(`/api/shared-with-me?userId=${userId}&_t=${timestamp}`);
            setFiles(res.data);
            setPath('/shared');
            setActiveView('shared');
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRecentFiles = async () => {
        setLoading(true);
        try {
            const timestamp = Date.now();
            const res = await axios.get(`/api/recent-files?userId=${userId}&_t=${timestamp}`);
            setFiles(res.data);
            setPath('/recent');
            setActiveView('recent');
        } catch (err: any) {
            console.error(err);
            if (axios.isAxiosError(err) && err.response?.status === 401) {
                setShowSettings(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const timestamp = Date.now();
            const res = await axios.get(`/api/documents?userId=${userId}&_t=${timestamp}`);
            setFiles(res.data);
            setPath('/documents');
            setActiveView('documents');
        } catch (err: any) {
            console.error(err);
            if (axios.isAxiosError(err) && err.response?.status === 401) {
                setShowSettings(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchFavorites = useCallback(async () => {
        try {
            const res = await axios.get(`/api/favorites?userId=${userId}`);
            setFavorites(res.data);
        } catch (err) {
            console.error('Failed to fetch favorites:', err);
        }
    }, [userId, setFavorites]);

    const fetchSiteSettings = useCallback(async () => {
        try {
            const res = await axios.get('/api/settings-site');
            setSiteSettings(res.data);
        } catch (err) {
            console.error('Failed to fetch site settings', err);
        }
    }, [setSiteSettings]);

    const fetchUserProfile = useCallback(async () => {
        try {
            const res = await axios.get(`/api/users/${userId}/profile`, {
                headers: { 'x-user-id': userId }
            });
            setUserProfile(res.data);
        } catch (err) {
            console.error('Failed to fetch user profile', err);
        }
    }, [userId, setUserProfile]);

    const fetchServerPulse = useCallback(async () => {
        try {
            const res = await axios.get('/api/analytics/server-pulse', {
                headers: { 'x-user-id': userId }
            });
            setServerPulse(res.data);
        } catch (err) {
            console.error('Failed to fetch server pulse', err);
        }
    }, [userId, setServerPulse]);

    const toggle2FA = async (enabled: boolean) => {
        try {
            await axios.post('/api/toggle-2fa', { enabled }, {
                headers: { 'x-user-id': userId }
            });
            fetchUserProfile();
            return true;
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to toggle 2FA');
            return false;
        }
    };

    const toggleFavorite = async (file: any) => {
        try {
            const filePath = activeView === 'drive' ? (path === '/' ? `/${file.name}` : `${path}/${file.name}`) : (file as any).filePath;
            await axios.post('/api/favorites/toggle', {
                userId,
                filePath,
                fileName: file.name,
                fileType: file.type
            });
            fetchFavorites();
        } catch (err) {
            console.error('Failed to toggle favorite:', err);
        }
    };

    const fetchFavoritesView = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/favorites?userId=${userId}`);
            const favItems = res.data.map((f: any) => ({
                name: f.fileName,
                type: f.fileType,
                size: 0,
                mtime: new Date(f.createdAt).getTime() / 1000,
                atime: new Date(f.createdAt).getTime() / 1000,
                birthTime: new Date(f.createdAt).getTime(),
                filePath: f.filePath,
                isFavorite: true
            }));
            setFiles(favItems);
            setPath('/favorites');
            setActiveView('favorites');
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const performSearch = useCallback(async (query: string, type: 'name' | 'content') => {
        if (!query) {
            fetchFiles(path); // This relies on path from state closure which is updated
            return;
        }
        setLoading(true);
        setIsSearchActive(true);
        try {
            const res = await axios.get(`/api/search?query=${encodeURIComponent(query)}&type=${type}&path=${encodeURIComponent(path)}&userId=${userId}`);
            setFiles(res.data);
        } catch (err) {
            console.error("Search failed", err);
        } finally {
            setLoading(false);
        }
    }, [userId, path, fetchFiles, setLoading, setIsSearchActive, setFiles]);

    const handleFolderClick = (folderName: string, item?: any) => {
        if (activeView === 'shared' && item?.shareId) {
            window.open(`/share/${item.shareId}`, '_blank');
            return;
        }
        if (item?.filePath) {
            fetchFiles(item.filePath);
            return;
        }
        if (item?.path && item.type === 'directory') {
            fetchFiles(item.path);
            return;
        }
        if (activeView === 'drive') {
            const newPath = path === '/' ? `/${folderName}` : `${path}/${folderName}`;
            fetchFiles(newPath);
        }
    };

    return {
        fetchFiles,
        fetchSharedFiles,
        fetchRecentFiles,
        fetchDocuments,
        fetchFavorites,
        fetchSiteSettings,
        fetchUserProfile,
        fetchServerPulse,
        toggle2FA,
        toggleFavorite,
        fetchFavoritesView,
        performSearch,
        handleFolderClick
    };
};
