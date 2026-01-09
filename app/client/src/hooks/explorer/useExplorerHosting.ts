import { useCallback, useEffect } from 'react';
import axios from 'axios';

export const useExplorerHosting = (state: any) => {
    const {
        userId, setLoading, setFiles, setPath, setActiveView, setPhpOperations,
        activeView
    } = state;

    const fetchWebsites = useCallback(async () => {
        setLoading(true);
        setActiveView('websites');
        setFiles([]);
        setPath('/websites');
        try {
            const res = await axios.get(`/api/websites?userId=${userId}`);
            const sites = res.data.map((s: any) => ({
                ...s,
                name: s.domain,
                type: 'directory',
                size: 0,
                php: s.phpVersion,
                mtime: new Date(s.createdAt).getTime() / 1000
            }));
            setFiles(sites);
        } catch (err: any) {
            console.error('Failed to fetch websites:', err);
            alert('Failed to load websites: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    }, [userId, setLoading, setActiveView, setFiles, setPath]);

    const fetchDatabases = useCallback(async () => {
        setLoading(true);
        setActiveView('databases');
        setFiles([]);
        setPath('/databases');
        try {
            const res = await axios.get(`/api/databases?userId=${userId}`);
            const dbs = res.data.map((d: any) => ({
                ...d,
                name: d.name,
                type: 'file',
                size: 0,
                mtime: new Date(d.createdAt).getTime() / 1000,
                db_user: d.user,
                host: d.host || 'localhost'
            }));
            setFiles(dbs);
        } catch (err: any) {
            console.error('Failed to fetch databases:', err);
            alert('Failed to load databases: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    }, [userId, setLoading, setActiveView, setFiles, setPath]);

    const fetchDNS = useCallback(async () => {
        setLoading(true);
        setActiveView('dns');
        setFiles([]);
        setPath('/dns');
        try {
            const res = await axios.get(`/api/dns?userId=${userId}`);
            const zones = res.data.map((z: any) => ({
                ...z,
                name: z.domain,
                type: 'file',
                size: 0,
                mtime: new Date(z.createdAt).getTime() / 1000,
                records: z.records || 0
            }));
            setFiles(zones);
        } catch (err: any) {
            console.error('Failed to fetch DNS zones:', err);
            alert('Failed to load DNS zones: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    }, [userId, setLoading, setActiveView, setFiles, setPath]);

    const fetchPHP = useCallback(async () => {
        setLoading(true);
        setActiveView('php');
        setFiles([]);
        setPath('/php');
        try {
            const res = await axios.get(`/api/php/versions?userId=${userId}`);
            const versions = res.data.map((v: any) => ({
                ...v,
                name: `PHP ${v.version}`,
                type: 'file',
                size: 0,
                mtime: Date.now() / 1000,
                status: v.status || 'running'
            }));
            setFiles(versions);
        } catch (err: any) {
            console.error('Failed to fetch PHP versions:', err);
            setFiles([{ name: 'PHP 8.2', type: 'file', size: 0, mtime: Date.now() / 1000, status: 'running', version: '8.2' }]);
        } finally {
            setLoading(false);
        }
    }, [userId, setLoading, setActiveView, setFiles, setPath]);

    const fetchMail = useCallback(async () => {
        setLoading(true);
        setActiveView('mail');
        setFiles([]);
        setPath('/mail');
        try {
            const res = await axios.get(`/api/mail/domains?userId=${userId}`);
            const domains = res.data.map((d: any) => ({
                ...d,
                name: d.domain,
                type: 'directory',
                size: 0,
                mtime: new Date(d.createdAt).getTime() / 1000
            }));
            setFiles(domains);
        } catch (err: any) {
            console.error('Failed to fetch mail domains:', err);
            alert('Failed to load mail domains: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    }, [userId, setLoading, setActiveView, setFiles, setPath]);

    const fetchBackups = useCallback(async () => {
        setLoading(true);
        setActiveView('backups');
        setFiles([]);
        setPath('/backups');
        try {
            const res = await axios.get(`/api/backups?userId=${userId}`);
            const backups = res.data.map((b: any) => ({
                ...b,
                name: b.name,
                type: 'file',
                size: b.size_bytes,
                mtime: new Date(b.createdAt).getTime() / 1000
            }));
            setFiles(backups);
        } catch (err: any) {
            console.error('Failed to fetch backups:', err);
            alert('Failed to load backups: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    }, [userId, setLoading, setActiveView, setFiles, setPath]);

    const installPHPVersion = async (version: string) => {
        try {
            await axios.post('/api/php/install', { version }, {
                headers: { 'x-user-id': userId }
            });
            setPhpOperations((prev: any) => ({
                ...prev,
                [version]: { status: 'preparing', progress: 5, message: 'Initiating installation...' }
            }));
            return true;
        } catch (err: any) {
            alert(err.response?.data?.error || 'Installation failed');
            return false;
        }
    };

    const uninstallPHPVersion = async (v: any) => {
        if (!confirm(`Are you sure you want to uninstall ${v.name}?`)) return false;
        try {
            await axios.post('/api/php/uninstall', {
                version: v.version,
                full_version: v.full_version
            }, {
                headers: { 'x-user-id': userId }
            });
            setPhpOperations((prev: any) => ({
                ...prev,
                [v.version]: { status: 'stopping', progress: 10, message: 'Initiating removal...' }
            }));
            return true;
        } catch (err: any) {
            alert(err.response?.data?.error || 'Uninstallation failed');
            return false;
        }
    };

    const setPHPDefaultVersion = async (v: any) => {
        try {
            await axios.post('/api/php/default', {
                version: v.version,
                full_version: v.full_version
            }, {
                headers: { 'x-user-id': userId }
            });
            fetchPHP();
            return true;
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to set default');
            return false;
        }
    };

    // Poll PHP Operations
    useEffect(() => {
        if (activeView !== 'php') return;

        const fetchOps = async () => {
            try {
                // Use a timestamp to prevent any browser caching issues
                const res = await axios.get(`/api/php/operations?_t=${Date.now()}`);
                setPhpOperations(res.data);
                // Refresh PHP list if an operation just finished
                const hasFinished = Object.values(res.data).some((op: any) => op.status === 'completed');
                if (hasFinished) fetchPHP();
            } catch (e) {
                console.error('Failed to fetch PHP operations');
            }
        };

        fetchOps();
        const timer = setInterval(fetchOps, 5000); // Increased to 5s for stability
        return () => clearInterval(timer);
    }, [activeView, fetchPHP, setPhpOperations]);

    const fetchSSH = useCallback(async () => {
        setLoading(true);
        setActiveView('ssh');
        setFiles([]);
        setPath('/ssh');
        try {
            const res = await axios.get('/api/ssh-accounts');
            const accounts = res.data.map((acc: any) => ({
                ...acc,
                name: acc.username,
                type: 'file',
                size: 0,
                mtime: new Date(acc.createdAt).getTime() / 1000
            }));
            setFiles(accounts);
        } catch (err: any) {
            console.error('Failed to fetch SSH accounts:', err);
            alert('Failed to load SSH accounts: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    }, [setLoading, setActiveView, setFiles, setPath]);

    return {
        fetchWebsites,
        fetchDatabases,
        fetchDNS,
        fetchPHP,
        fetchMail,
        fetchBackups,
        fetchSSH,
        installPHPVersion,
        uninstallPHPVersion,
        setPHPDefaultVersion
    };
};
