import axios from 'axios';

export const useExplorerTransfer = (state: any, data: any) => {
    const {
        userId, path, activeView, files, setLoading, setDownloadProgress,
        setActiveDownloads, setActiveUploads, setIsManagerOpen, abortControllers
    } = state;
    const { fetchFiles } = data;

    const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB

    const uploadFiles = async (filesToUpload: File[]) => {
        setIsManagerOpen(true);
        for (const file of filesToUpload) {
            const uploadId_key = `upload_${file.name}_${file.size}`;
            const uploadId_local = localStorage.getItem(uploadId_key);

            const newUpload = {
                id: uploadId_local || Math.random().toString(36).substr(2, 9),
                name: file.name,
                progress: 0,
                status: 'uploading',
                size: file.size
            };

            setActiveUploads((prev: any[]) => [newUpload, ...prev]);

            try {
                // 1. Init
                let uploadId = uploadId_local;
                if (!uploadId) {
                    const initRes = await axios.post('/api/upload/init', {
                        name: file.name,
                        size: file.size,
                        path: path
                    }, { params: { userId } });
                    uploadId = initRes.data.uploadId;
                    localStorage.setItem(uploadId_key, uploadId!);
                }

                // 2. Upload Chunks
                const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
                const startChunk = parseInt(localStorage.getItem(`${uploadId}_chunk`) || '0');

                for (let i = startChunk; i < totalChunks; i++) {
                    const start = i * CHUNK_SIZE;
                    const end = Math.min(file.size, start + CHUNK_SIZE);
                    const chunk = file.slice(start, end);

                    const formData = new FormData();
                    formData.append('chunk', chunk);
                    formData.append('uploadId', uploadId!);
                    formData.append('index', i.toString());
                    formData.append('totalChunks', totalChunks.toString());

                    await axios.post('/api/upload/chunk', formData, {
                        params: { userId },
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });

                    localStorage.setItem(`${uploadId}_chunk`, (i + 1).toString());
                    const percent = Math.round(((i + 1) * 100) / totalChunks);
                    setActiveUploads((prev: any[]) => prev.map(up =>
                        up.name === file.name ? { ...up, progress: percent } : up
                    ));
                }

                // 3. Complete
                await axios.post('/api/upload/complete', {
                    uploadId,
                    name: file.name,
                    path: path,
                    totalChunks,
                    totalSize: file.size
                }, { params: { userId } });

                setActiveUploads((prev: any[]) => prev.map(up =>
                    up.name === file.name ? { ...up, status: 'completed', progress: 100 } : up
                ));

                localStorage.removeItem(uploadId_key);
                localStorage.removeItem(`${uploadId}_chunk`);

            } catch (err: any) {
                console.error('Upload error:', err);
                setActiveUploads((prev: any[]) => prev.map(up =>
                    up.name === file.name ? { ...up, status: 'error' } : up
                ));
            }
        }
        fetchFiles(path);
    };

    const downloadFile = async (file: any) => {
        if (activeView === 'shared' && file.shareId) {
            window.open(`/share/${file.shareId}`, '_blank');
            return;
        }

        const filePath = file.filePath || file.path || (path === '/' ? `/${file.name}` : `${path}/${file.name}`);
        const downloadId = Math.random().toString(36).substr(2, 9);
        const fileName = file.name;
        const isFolder = file.type === 'directory';

        const newDownload = {
            id: downloadId,
            name: fileName,
            progress: 0,
            status: 'downloading',
            isFolder
        };

        setActiveDownloads((prev: any[]) => [newDownload, ...prev]);
        setIsManagerOpen(true);

        const controller = new AbortController();
        abortControllers.current[downloadId] = controller;

        try {
            const res = await axios.get('/api/download', {
                params: { path: filePath, name: fileName, userId },
                responseType: 'blob',
                signal: controller.signal,
                onDownloadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setActiveDownloads((prev: any[]) => prev.map(dl =>
                            dl.id === downloadId ? { ...dl, progress: percent } : dl
                        ));
                    } else {
                        const loadedMB = Math.floor(progressEvent.loaded / (1024 * 1024));
                        const estimated = Math.min(95, Math.max(5, (loadedMB * 5) % 95));
                        setActiveDownloads((prev: any[]) => prev.map(dl =>
                            dl.id === downloadId ? { ...dl, progress: estimated } : dl
                        ));
                    }
                }
            });

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', isFolder ? `${fileName}.zip` : fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            setActiveDownloads((prev: any[]) => prev.map(dl =>
                dl.id === downloadId ? { ...dl, status: 'completed', progress: 100 } : dl
            ));
        } catch (err: any) {
            if (axios.isCancel(err)) {
                setActiveDownloads((prev: any[]) => prev.map(dl =>
                    dl.id === downloadId ? { ...dl, status: 'cancelled' } : dl
                ));
            } else {
                console.error('Download error:', err);
                setActiveDownloads((prev: any[]) => prev.map(dl =>
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

    const downloadSelected = async () => {
        const { selectedFiles, setSelectedFiles } = state;
        if (selectedFiles.length === 0) return;
        if (selectedFiles.length === 1) {
            const file = files.find((f: any) => f.name === selectedFiles[0]);
            if (file) downloadFile(file);
            setSelectedFiles([]);
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post('/api/download-multi', {
                path,
                files: selectedFiles
            }, {
                params: { userId },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'selected_files.zip');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err: any) {
            console.error('Multi-download failed', err);
            const msg = err.response?.data?.error || err.message || 'Unknown error';
            alert(`Multi-download failed: ${msg}`);
        } finally {
            setLoading(false);
            setSelectedFiles([]);
        }
    };

    const downloadFileList = async () => {
        setDownloadProgress({ show: true, message: 'Exporting directory map with content matching report...', itemCount: 0 });
        try {
            const sessionId = localStorage.getItem('sessionId');
            console.log('[Explorer] Exporting with SessionID:', sessionId);
            const url = `/api/export-dir-map?path=${encodeURIComponent(path)}&userId=${userId}&sessionId=${sessionId}&_t=${Date.now()}`;
            window.open(url, '_blank');

            setDownloadProgress({ show: true, message: 'Export Complete!', itemCount: 0 });
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err: any) {
            console.error('Failed to export directory map', err);
            const msg = err.response?.data?.error || err.message || 'Unknown error';
            alert(`Failed to export directory map: ${msg}`);
        } finally {
            setDownloadProgress({ show: false, message: '', itemCount: 0 });
        }
    };

    return {
        uploadFiles,
        downloadFile,
        cancelDownload,
        downloadSelected,
        downloadFileList
    };
};
