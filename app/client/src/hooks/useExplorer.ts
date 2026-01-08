import { useEffect } from 'react';
import { useExplorerState } from './explorer/useExplorerState';
import { useExplorerData } from './explorer/useExplorerData';
import { useExplorerHosting } from './explorer/useExplorerHosting';
import { useExplorerTransfer } from './explorer/useExplorerTransfer';
import { useExplorerActions } from './explorer/useExplorerActions';

export type { FileItem } from './explorer/types';

export const useExplorer = (user: any, onLogout: () => void) => {
    // 1. Initialize State Hook
    const state = useExplorerState(user);

    // 2. Initialize Data Fetching Hook
    const data = useExplorerData(state, onLogout);

    // 3. Initialize Hosting Hook (Websites, DB, DNS, PHP)
    const hosting = useExplorerHosting(state);

    // 4. Initialize Transfer Hook (Upload/Download)
    const transfer = useExplorerTransfer(state, data);

    // 5. Initialize Actions Hook (File Operations)
    const actions = useExplorerActions(state, data, hosting, transfer);

    // 6. Restoration Effect
    useEffect(() => {
        const { activeView, path, setIsDarkMode } = state;
        const {
            fetchFiles, fetchSharedFiles, fetchRecentFiles, fetchDocuments,
            fetchFavoritesView, fetchSiteSettings, fetchFavorites, fetchUserProfile
        } = data;
        const { fetchWebsites, fetchDatabases, fetchDNS, fetchPHP } = hosting;

        // Restore active view content
        if (activeView === 'drive') fetchFiles(path);
        else if (activeView === 'shared') fetchSharedFiles();
        else if (activeView === 'recent') fetchRecentFiles();
        else if (activeView === 'documents') fetchDocuments();
        else if (activeView === 'favorites') fetchFavoritesView();
        else if (activeView === 'websites') fetchWebsites();
        else if (activeView === 'databases') fetchDatabases();
        else if (activeView === 'dns') fetchDNS();
        else if (activeView === 'php') fetchPHP();
        else fetchFiles('/');

        // Fetch global data
        fetchSiteSettings();
        fetchFavorites();
        fetchUserProfile();

        // Restore Theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.documentElement.classList.add('light-mode');
            setIsDarkMode(false);
        }
    }, [state.userId]); // Only re-run on user change/mount

    // 7. Analytics Polling Effect
    useEffect(() => {
        let interval: any;
        if (state.showAnalytics) {
            data.fetchServerPulse();
            interval = setInterval(data.fetchServerPulse, 3000);
        }
        return () => clearInterval(interval);
    }, [state.showAnalytics, data.fetchServerPulse]);

    // Return aggregated object with everything
    return {
        ...state,
        ...data,
        ...hosting,
        ...transfer,
        ...actions
    };
};
