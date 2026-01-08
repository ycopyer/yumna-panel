import axios from 'axios';
import { FileItem } from './types';

export const useExplorerActions = (state: any, data: any, hosting: any, transfer: any) => {
    const {
        userId, path, activeView, setLoading, setFiles, setPath,
        setPreviewEdit, setPreviewFile, setPreviewFileItem, setPreviewType, setMatchResults,
        setIsDragging, setSelectedFiles, compressItems, setShowCompressModal,
        setCompressItems
    } = state;

    const { fetchFiles } = data;
    const { fetchWebsites, fetchDatabases, fetchDNS } = hosting;
    const { uploadFiles, downloadFile } = transfer;

    const saveContent = async (file: FileItem | any, content: string) => {
        try {
            const itemPath = activeView === 'drive' ? (path === '/' ? `/${file.name}` : `${path}/${file.name}`) : file.filePath;
            await axios.put('/api/save-content', { path: itemPath, content }, { headers: { 'x-user-id': userId } });
            return true;
        } catch (err) {
            console.error('Save error:', err);
            alert('Failed to save file content');
            return false;
        }
    };

    const changePermissions = async (file: FileItem | any, mode: string) => {
        try {
            const itemPath = activeView === 'drive' ? (path === '/' ? `/${file.name}` : `${path}/${file.name}`) : file.filePath;
            await axios.put('/api/chmod', { path: itemPath, mode }, { headers: { 'x-user-id': userId } });
            fetchFiles(path);
            return true;
        } catch (err: any) {
            console.error('Chmod error:', err);
            alert(`Failed to change permissions: ${err.response?.data?.error || err.message}`);
            return false;
        }
    };

    const deleteItem = async (file: FileItem | any) => {
        const confirmMsg = file.type === 'directory'
            ? `Are you sure you want to delete the folder "${file.name}" and all its contents?`
            : `Are you sure you want to delete "${file.name}"?`;

        if (!confirm(confirmMsg)) return;

        setLoading(true);
        try {
            if (activeView === 'websites') {
                await axios.delete(`/api/websites/${file.id}`, { headers: { 'x-user-id': userId } });
                fetchWebsites();
            } else if (activeView === 'databases') {
                await axios.delete(`/api/databases/${file.id}`, { headers: { 'x-user-id': userId } });
                fetchDatabases();
            } else if (activeView === 'dns') {
                await axios.delete(`/api/dns/${file.id}`, { headers: { 'x-user-id': userId } });
                fetchDNS();
            } else {
                const itemPath = path === '/' ? `/${file.name}` : `${path}/${file.name}`;
                await axios.delete(`/api/delete?userId=${userId}`, {
                    data: { path: itemPath, type: file.type }
                });
                fetchFiles(path);
            }
        } catch (err: any) {
            console.error('Delete error:', err);
            alert(`Failed to delete: ${err.response?.data?.error || err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (fileName: string) => {
        setSelectedFiles((prev: string[]) =>
            prev.includes(fileName) ? prev.filter(f => f !== fileName) : [...prev, fileName]
        );
    };

    const viewPreview = (file: FileItem, editMode: boolean = false) => {
        console.log('[useExplorerActions] viewPreview called:', { fileName: file.name, editMode, activeView, path });

        setPreviewFile(null);
        setPreviewType(null);
        setPreviewFileItem(null);
        setPreviewEdit(editMode);

        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
        const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'mkv'];
        const textExts = ['txt', 'md', 'log', 'json', 'xml', 'csv', 'js', 'ts', 'tsx', 'jsx', 'css', 'html', 'php', 'py', 'java', 'c', 'cpp', 'h', 'sql', 'sh', 'yaml', 'yml', 'env', 'gitignore', 'ini', 'conf', 'dockerfile', 'makefile', 'license'];

        const itemPath = activeView === 'drive'
            ? (path === '/' ? `/${file.name}` : `${path}/${file.name}`)
            : (file as any).filePath || file.path;

        if (!itemPath) {
            console.error('[useExplorerActions] viewPreview: itemPath not found for file', file);
            return;
        }

        const sessionId = localStorage.getItem('sessionId');
        const baseUrl = `/api/preview?path=${encodeURIComponent(itemPath)}&userId=${userId}&sessionId=${sessionId}`;

        setPreviewFileItem(file);

        if (imageExts.includes(ext)) {
            setPreviewFile(`${baseUrl}&type=image`);
            setPreviewType('image');
        } else if (videoExts.includes(ext)) {
            setPreviewFile(`${baseUrl}&type=video`);
            setPreviewType('video');
        } else if (ext === 'pdf') {
            const pdfUrl = `/api/view-pdf?path=${encodeURIComponent(itemPath)}&userId=${userId}&sessionId=${sessionId}`;
            setPreviewFile(pdfUrl);
            setPreviewType('pdf');
        } else if (textExts.includes(ext) || ['dockerfile', 'makefile', 'license'].includes(file.name.toLowerCase())) {
            setPreviewFile(`${baseUrl}&type=text`);
            setPreviewType('text');
        } else {
            console.warn('[useExplorerActions] viewPreview: File type not supported for preview:', ext);
        }
    };

    const checkPdfContent = async (file: FileItem) => {
        if (!userId || !file) return;
        const targetPath = path === '/' ? `/${file.name}` : `${path}/${file.name}`;

        setMatchResults((prev: any) => ({
            ...prev,
            [file.name]: { loading: true }
        }));

        try {
            const res = await axios.post(`/api/check-pdf-content`, {
                userId,
                path: targetPath
            });

            setMatchResults((prev: any) => ({
                ...prev,
                [file.name]: {
                    loading: false,
                    isMatch: res.data.isMatch,
                    identifier: res.data.identifier
                }
            }));
        } catch (err: any) {
            setMatchResults((prev: any) => ({
                ...prev,
                [file.name]: {
                    loading: false,
                    error: err.response?.data?.error || 'Check failed'
                }
            }));
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        // user object is not available directly, but we assume non-viewer logic can be checked elsewhere or we pass role
        // For now, assume uploadFiles handles permission via server or assume hook caller checks role

        const droppedFiles = Array.from(e.dataTransfer.files);
        if (droppedFiles.length > 0) {
            await uploadFiles(droppedFiles);
        }
    };

    const extractArchive = async (file: FileItem) => {
        if (!confirm(`Extract "${file.name}" here?`)) return;
        setLoading(true);
        try {
            const filePath = path === '/' ? `/${file.name}` : `${path}/${file.name}`;
            await axios.post(`/api/extract?userId=${userId}`, { path: filePath });
            alert('Extraction successful');
            fetchFiles(path);
        } catch (err: any) {
            console.error('Extract error:', err);
            alert(`Extraction failed: ${err.response?.data?.error || err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const compressSelection = async (name: string) => {
        setLoading(true);
        try {
            await axios.post(`/api/compress?userId=${userId}`, {
                items: compressItems.length > 0 ? compressItems : (state.selectedFiles),
                currentPath: path,
                name
            });
            alert('Compression successful');
            fetchFiles(path);
        } catch (err: any) {
            console.error('Compress error:', err);
            alert(`Compression failed: ${err.response?.data?.error || err.message}`);
        } finally {
            setLoading(false);
            setShowCompressModal(false);
            setCompressItems([]);
        }
    };

    const clearRecentFiles = async () => {
        if (!confirm('Are you sure you want to clear your recent history?')) return;
        setLoading(true);
        try {
            await axios.delete(`/api/recent-files/clear?userId=${userId}`);
            setFiles([]);
        } catch (err) {
            console.error('Failed to clear recent files', err);
        } finally {
            setLoading(false);
        }
    };

    return {
        saveContent,
        changePermissions,
        deleteItem,
        toggleSelect,
        viewPreview,
        checkPdfContent,
        handleDrop,
        extractArchive,
        compressSelection,
        clearRecentFiles
    };
};
