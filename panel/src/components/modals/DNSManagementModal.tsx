import React, { useState, useEffect } from 'react';
import { X, Globe, Plus, Trash2, RefreshCw, Loader2, Save, Cloud, Shield, Database, Activity, AlertTriangle, Settings, ArrowRightLeft, Download, Upload, History as HistoryIcon, Edit } from 'lucide-react';
import axios from 'axios';

interface DNSManagementModalProps {
    zone: any;
    onClose: () => void;
    onRefresh: () => void;
}

const DNSManagementModal: React.FC<DNSManagementModalProps> = ({ zone, onClose, onRefresh }) => {
    const [activeTab, setActiveTab] = useState<'records' | 'settings' | 'cloudflare' | 'templates' | 'history' | 'tools' | 'trash'>('records');
    const [loading, setLoading] = useState(false);
    const [records, setRecords] = useState<any[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<number[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [pendingChanges, setPendingChanges] = useState<any[]>([]);
    const [trashRecords, setTrashRecords] = useState<any[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingRecord, setEditingRecord] = useState<any>(null);
    const [isLocked, setIsLocked] = useState(zone.is_locked || false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importData, setImportData] = useState('');
    const [replaceMode, setReplaceMode] = useState(false);

    // New Record State
    const [newRecord, setNewRecord] = useState({
        type: 'A',
        name: '',
        content: '',
        priority: 0,
        ttl: 3600
    });
    const [webhookUrl, setWebhookUrl] = useState(zone.webhook_url || '');
    const [analysis, setAnalysis] = useState<any>(null);

    useEffect(() => {
        if (newRecord.content && newRecord.content.length > 3) {
            const timer = setTimeout(() => {
                analyzeContent();
            }, 500);
            return () => clearTimeout(timer);
        } else {
            setAnalysis(null);
        }
    }, [newRecord.content, newRecord.type, newRecord.name]);

    const analyzeContent = async () => {
        try {
            const res = await axios.post('/api/dns/analyze', {
                type: newRecord.type,
                name: newRecord.name,
                content: newRecord.content
            });
            setAnalysis(res.data);
        } catch (err) {
            // ignore
        }
    };

    const applyFix = () => {
        if (analysis && analysis.fixedContent) {
            setNewRecord({ ...newRecord, content: analysis.fixedContent });
            setAnalysis(null);
        }
    };

    const handleToggleLock = async () => {
        setLoading(true);
        try {
            if (isLocked) {
                await axios.post(`/api/dns/${zone.id}/unlock`);
                setIsLocked(false);
                alert('Zone Unlocked');
            } else {
                await axios.post(`/api/dns/${zone.id}/lock`);
                setIsLocked(true);
                alert('Zone Locked - Read Only Mode Active');
            }
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to toggle lock');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
        if (activeTab === 'history') fetchHistory();
    }, [zone, activeTab]);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/dns/${zone.id}/records`);
            setRecords(res.data);
            setSelectedRecords([]);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/dns/${zone.id}/history`);
            setHistory(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPendingChanges = async () => {
        try {
            const res = await axios.get(`/api/dns/${zone.id}/preview`);
            setPendingChanges(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (activeTab === 'records') fetchPendingChanges();
        if (activeTab === 'trash') fetchTrashRecords();
    }, [records, activeTab]);

    const fetchTrashRecords = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/dns/${zone.id}/trash`);
            setTrashRecords(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (id: number) => {
        if (!confirm('Restore this record to drafts?')) return;
        setLoading(true);
        try {
            await axios.post(`/api/dns/records/${id}/restore`);
            fetchTrashRecords();
            alert('Record restored to Drafts. Please Publish to go live.');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to restore record');
        } finally {
            setLoading(false);
        }
    };

    const handlePermanentDelete = async (id: number) => {
        if (!confirm('Permanently delete this record? This cannot be undone.')) return;
        setLoading(true);
        try {
            await axios.delete(`/api/dns/records/${id}/permanent`);
            fetchTrashRecords();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to delete record');
        } finally {
            setLoading(false);
        }
    };

    const handleAddRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post(`/api/dns/${zone.id}/records`, newRecord);
            setNewRecord({ type: 'A', name: '', content: '', priority: 0, ttl: 3600 });
            setIsAdding(false);
            fetchRecords();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to add record');
        } finally {
            setLoading(false);
        }
    };

    const handleEditRecord = (record: any) => {
        // If record has draft_data (pending_update), use draft data for editing
        let editData = record;
        if (record.status === 'pending_update' && record.draft_data) {
            try {
                const draft = JSON.parse(record.draft_data);
                editData = {
                    id: record.id,
                    type: draft.type || record.type,
                    name: draft.name || record.name,
                    content: draft.content || record.content,
                    priority: draft.priority !== undefined ? draft.priority : (record.priority || 0),
                    ttl: draft.ttl || record.ttl || 3600
                };
            } catch (e) {
                // If parsing fails, use original record
                editData = record;
            }
        }

        setEditingRecord({
            id: editData.id,
            type: editData.type,
            name: editData.name,
            content: editData.content,
            priority: editData.priority || 0,
            ttl: editData.ttl || 3600
        });
        setIsEditing(true);
    };

    const handleUpdateRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRecord) return;
        setLoading(true);
        try {
            await axios.put(`/api/dns/records/${editingRecord.id}`, editingRecord);
            setEditingRecord(null);
            setIsEditing(false);
            fetchRecords();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to update record');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingRecord(null);
        setIsEditing(false);
    };

    const handleDeleteRecord = async (id: number) => {
        if (!confirm('Delete this DNS record?')) return;
        setLoading(true);
        try {
            await axios.delete(`/api/dns/records/${id}`);
            fetchRecords();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to delete record');
        } finally {
            setLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedRecords.length} records?`)) return;
        setLoading(true);
        try {
            await axios.post(`/api/dns/records/bulk-delete`, { ids: selectedRecords });
            fetchRecords();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to delete records');
        } finally {
            setLoading(false);
        }
    };

    const handleApplyTemplate = async (templateId: string) => {
        if (!confirm(`Apply this template? New records will be added to ${zone.domain}.`)) return;
        setLoading(true);
        try {
            await axios.post(`/api/dns/${zone.id}/template`, { templateId });
            fetchRecords();
            alert('Template applied successfully');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to apply template');
        } finally {
            setLoading(false);
        }
    };

    const handleRollback = async (versionId: number) => {
        if (!confirm('Revert all DNS records to this version? Current records will be replaced.')) return;
        setLoading(true);
        try {
            await axios.post(`/api/dns/${zone.id}/rollback/${versionId}`);
            fetchRecords();
            setActiveTab('records');
            alert('Rollback successful');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Rollback failed');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/dns/${zone.id}/export`, {
                responseType: 'blob'
            });

            // Create blob URL and trigger download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${zone.domain}.zone`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to export zone');
        } finally {
            setLoading(false);
        }
    };

    const handleImport = () => {
        setShowImportModal(true);
    };

    const handleImportSubmit = async () => {
        if (!importData.trim()) {
            alert('Please paste BIND zone file content or upload a file');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`/api/dns/${zone.id}/import`, {
                bindData: importData,
                replaceAll: replaceMode
            });
            fetchRecords();
            setShowImportModal(false);
            setImportData('');
            setReplaceMode(false);
            alert('Import successful');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Import failed');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setImportData(content);
        };
        reader.readAsText(file);
    };

    const handleResetZone = async () => {
        if (!confirm('Reset current zone to default records? This will delete all custom records.')) return;
        setLoading(true);
        try {
            await axios.post(`/api/dns/${zone.id}/reset`);
            fetchRecords();
            alert('Zone reset complete');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to reset zone');
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async () => {
        if (!confirm('Publish all changes to the DNS Cluster? This will make your changes live across all name servers.')) return;
        setLoading(true);
        try {
            await axios.post(`/api/dns/${zone.id}/publish`);
            fetchRecords();
            setPendingChanges([]);
            alert('Changes published successfully!');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to publish changes');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveWebhook = async () => {
        setLoading(true);
        try {
            await axios.post(`/api/dns/${zone.id}/webhook`, { webhook_url: webhookUrl });
            alert('Webhook URL updated successfully');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to update webhook');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteZone = async () => {
        if (!confirm(`CRITICAL: All DNS records for ${zone.domain} will be deleted. Proceed?`)) return;
        setLoading(true);
        try {
            await axios.delete(`/api/dns/${zone.id}`);
            onRefresh();
            onClose();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to delete zone');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[1100] flex items-center justify-center p-4">
                <div className="glass w-full max-w-4xl rounded-[32px] overflow-hidden border border-white/5 shadow-2xl animate-scale-up flex flex-col max-h-[90vh]">

                    {/* Header */}
                    <div className="p-8 bg-gradient-to-br from-indigo-600/20 to-transparent border-b border-white/5">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-lg">
                                    <Globe size={28} className="text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white tracking-tight">{zone.domain}</h3>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">{records.length} RECORDS</span>
                                        {pendingChanges.length > 0 ? (
                                            <button
                                                onClick={handlePublish}
                                                className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500 text-white hover:brightness-110 transition-all shadow-lg shadow-amber-500/20"
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                <span className="text-[9px] font-black uppercase tracking-wide">Publish {pendingChanges.length} Changes</span>
                                                <Save size={10} />
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                <span className="text-[9px] font-black text-green-500 uppercase">Synchronized</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleToggleLock}
                                        className={`p-2 rounded-xl transition-all ${isLocked ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30' : 'bg-white/5 hover:bg-white/10 text-white/40 hover:text-white'}`}
                                        title={isLocked ? "Zone Locked (Read-Only)" : "Lock Zone"}
                                    >
                                        <Shield size={20} className={isLocked ? "fill-amber-500" : ""} />
                                    </button>
                                    <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-8 overflow-x-auto pb-2 no-scrollbar">
                            {[
                                { id: 'records', label: 'Records', icon: <Activity size={16} /> },
                                { id: 'tools', label: 'Tools', icon: <Database size={16} /> },
                                { id: 'history', label: 'History', icon: <HistoryIcon size={16} /> },
                                { id: 'trash', label: 'Trash', icon: <Trash2 size={16} /> },
                                { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
                                { id: 'cloudflare', label: 'Cloudflare', icon: <Cloud size={16} /> }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap capitalize ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-white/40 hover:bg-white/5'}`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-black/20">

                            {activeTab === 'records' && (
                                <div className="space-y-6">

                                    {/* Toolbar */}
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-3">
                                            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Resource Records</h4>
                                            {selectedRecords.length > 0 && (
                                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 animate-fade">
                                                    <span className="text-[10px] font-black text-rose-500 uppercase">{selectedRecords.length} Selected</span>
                                                    <button
                                                        onClick={handleBulkDelete}
                                                        className="p-1 rounded bg-rose-500 text-white hover:brightness-110 transition-all"
                                                        title="Delete Selected"
                                                    >
                                                        <Trash2 size={10} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setIsAdding(!isAdding)}
                                            className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-xl text-xs font-bold transition-all border border-indigo-500/20"
                                        >
                                            <Plus size={14} /> Add Record
                                        </button>
                                    </div>

                                    {/* Add Record Form */}
                                    {isAdding && (
                                        <div className="p-6 bg-white/5 rounded-[24px] border border-indigo-500/20 animate-scale-up">
                                            <form onSubmit={handleAddRecord} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-white/20 uppercase ml-1">Type</label>
                                                    <select
                                                        value={newRecord.type}
                                                        onChange={e => setNewRecord({ ...newRecord, type: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 px-3 text-white font-bold text-xs ring-0 focus:border-indigo-500 outline-none"
                                                    >
                                                        {['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV'].map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                </div>
                                                <div className="md:col-span-1 space-y-1.5">
                                                    <label className="text-[10px] font-black text-white/20 uppercase ml-1">Host (@/name)</label>
                                                    <input
                                                        required
                                                        placeholder="@"
                                                        value={newRecord.name}
                                                        onChange={e => setNewRecord({ ...newRecord, name: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 px-4 text-white font-bold text-xs focus:border-indigo-500 outline-none"
                                                    />
                                                </div>
                                                <div className="md:col-span-1 space-y-1.5">
                                                    <label className="text-[10px] font-black text-white/20 uppercase ml-1">Points To / Content</label>
                                                    <input
                                                        required
                                                        placeholder="IP or Domain"
                                                        value={newRecord.content}
                                                        onChange={e => setNewRecord({ ...newRecord, content: e.target.value })}
                                                        className={`w-full bg-white/5 border rounded-xl py-2.5 px-4 text-white font-bold text-xs focus:border-indigo-500 outline-none ${analysis && !analysis.isValid ? 'border-amber-500/50' : 'border-white/5'}`}
                                                    />
                                                    {analysis && (
                                                        <div className="mt-2 space-y-2">
                                                            {analysis.warnings.map((w: string, i: number) => (
                                                                <p key={i} className="text-[10px] text-amber-500 flex items-center gap-1 font-bold">
                                                                    <AlertTriangle size={10} /> {w}
                                                                </p>
                                                            ))}
                                                            {analysis.suggestion && (
                                                                <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                                                    <span className="text-[10px] text-indigo-300 font-bold">{analysis.suggestion}</span>
                                                                    {analysis.fixedContent && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={applyFix}
                                                                            className="px-2 py-1 rounded bg-indigo-500 text-white text-[9px] font-black uppercase hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20"
                                                                        >
                                                                            Auto Fix
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-white/20 uppercase ml-1">Priority</label>
                                                    <input
                                                        type="number"
                                                        value={newRecord.priority}
                                                        onChange={e => setNewRecord({ ...newRecord, priority: parseInt(e.target.value) })}
                                                        className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 px-4 text-white font-bold text-xs focus:border-indigo-500 outline-none"
                                                    />
                                                </div>
                                                <div className="flex items-end gap-2">
                                                    <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all">Save</button>
                                                    <button type="button" onClick={() => setIsAdding(false)} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/40"><X size={18} /></button>
                                                </div>
                                            </form>
                                        </div>
                                    )}

                                    {/* Edit Record Form */}
                                    {isEditing && editingRecord && (
                                        <div className="p-6 bg-amber-500/5 rounded-[24px] border border-amber-500/20 animate-scale-up">
                                            <h4 className="text-sm font-black text-amber-400 uppercase tracking-widest mb-4">Edit Record</h4>
                                            <form onSubmit={handleUpdateRecord} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-white/20 uppercase ml-1">Type</label>
                                                    <select
                                                        value={editingRecord.type}
                                                        onChange={e => setEditingRecord({ ...editingRecord, type: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 px-3 text-white font-bold text-xs ring-0 focus:border-amber-500 outline-none"
                                                    >
                                                        {['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV'].map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                </div>
                                                <div className="md:col-span-1 space-y-1.5">
                                                    <label className="text-[10px] font-black text-white/20 uppercase ml-1">Host (@/name)</label>
                                                    <input
                                                        required
                                                        value={editingRecord.name}
                                                        onChange={e => setEditingRecord({ ...editingRecord, name: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 px-4 text-white font-bold text-xs focus:border-amber-500 outline-none"
                                                    />
                                                </div>
                                                <div className="md:col-span-1 space-y-1.5">
                                                    <label className="text-[10px] font-black text-white/20 uppercase ml-1">Content</label>
                                                    <input
                                                        required
                                                        value={editingRecord.content}
                                                        onChange={e => setEditingRecord({ ...editingRecord, content: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 px-4 text-white font-bold text-xs focus:border-amber-500 outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-white/20 uppercase ml-1">Priority</label>
                                                    <input
                                                        type="number"
                                                        value={editingRecord.priority}
                                                        onChange={e => setEditingRecord({ ...editingRecord, priority: parseInt(e.target.value) })}
                                                        className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 px-4 text-white font-bold text-xs focus:border-amber-500 outline-none"
                                                    />
                                                </div>
                                                <div className="flex items-end gap-2">
                                                    <button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-500 text-white rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all">Update</button>
                                                    <button type="button" onClick={handleCancelEdit} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/40"><X size={18} /></button>
                                                </div>
                                            </form>
                                        </div>
                                    )}

                                    {/* Record List */}
                                    <div className="bg-white/5 rounded-[26px] border border-white/5 overflow-hidden">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-white/5 border-b border-white/5">
                                                    <th className="px-4 py-4 w-10 text-center">
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-indigo-500"
                                                            onChange={(e) => {
                                                                if (e.target.checked) setSelectedRecords(records.map(r => r.id));
                                                                else setSelectedRecords([]);
                                                            }}
                                                            checked={selectedRecords.length === records.length && records.length > 0}
                                                        />
                                                    </th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest">Type</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest">Name</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest">Content</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest text-center">TTL</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {records.map(rec => {
                                                    const isPendingCreate = rec.status === 'pending_create';
                                                    const isPendingDelete = rec.status === 'pending_delete';
                                                    const isPendingUpdate = rec.status === 'pending_update';

                                                    // Get display data - use draft if pending update
                                                    let displayData = rec;
                                                    if (isPendingUpdate && rec.draft_data) {
                                                        try {
                                                            const draft = JSON.parse(rec.draft_data);
                                                            displayData = { ...rec, ...draft };
                                                        } catch (e) {
                                                            // If parsing fails, use original
                                                        }
                                                    }

                                                    // Determine row style based on status
                                                    let rowClass = `group hover:bg-white/[0.04] transition-colors ${selectedRecords.includes(rec.id) ? 'bg-indigo-500/5' : ''}`;
                                                    if (isPendingCreate) rowClass = 'bg-emerald-500/10 hover:bg-emerald-500/20';
                                                    if (isPendingDelete) rowClass = 'bg-rose-500/10 hover:bg-rose-500/20 opacity-60';
                                                    if (isPendingUpdate) rowClass = 'bg-amber-500/10 hover:bg-amber-500/20';

                                                    return (
                                                        <tr key={rec.id} className={rowClass}>
                                                            <td className="px-4 py-4 text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    className="rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-indigo-500"
                                                                    checked={selectedRecords.includes(rec.id)}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) setSelectedRecords([...selectedRecords, rec.id]);
                                                                        else setSelectedRecords(selectedRecords.filter(id => id !== rec.id));
                                                                    }}
                                                                />
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${displayData.type === 'A' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                                    displayData.type === 'CNAME' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                                                        displayData.type === 'MX' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                                            'bg-white/10 text-white/60 border-white/10'
                                                                    }`}>{displayData.type}</span>
                                                                {isPendingCreate && <span className="ml-2 text-[9px] text-emerald-400 font-bold uppercase tracking-wider">New</span>}
                                                                {isPendingDelete && <span className="ml-2 text-[9px] text-rose-400 font-bold uppercase tracking-wider">Del</span>}
                                                                {isPendingUpdate && <span className="ml-2 text-[9px] text-amber-400 font-bold uppercase tracking-wider">Mod</span>}
                                                            </td>
                                                            <td className={`px-6 py-4 font-bold text-xs ${isPendingDelete ? 'line-through text-white/40' : 'text-indigo-300'}`}>{displayData.name}.{zone.domain}</td>
                                                            <td className={`px-6 py-4 font-bold text-xs ${isPendingDelete ? 'line-through text-white/40' : 'text-white/80'} max-w-[200px] truncate`}>{displayData.content}</td>
                                                            <td className="px-6 py-4 text-center text-[10px] font-bold text-white/40">{displayData.ttl}</td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    {!isPendingDelete && (
                                                                        <>
                                                                            <button onClick={() => handleEditRecord(rec)} className="p-2 rounded-lg text-white/10 hover:text-blue-500 hover:bg-blue-500/10 transition-all opacity-0 group-hover:opacity-100">
                                                                                <Edit size={14} />
                                                                            </button>
                                                                            <button onClick={() => handleDeleteRecord(rec.id)} className="p-2 rounded-lg text-white/10 hover:text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100">
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'tools' && (
                                <div className="space-y-8 animate-fade">
                                    {/* BIND Migration */}
                                    <div className="p-8 rounded-[32px] bg-indigo-500/5 border border-indigo-500/10">
                                        <h4 className="text-sm font-black text-white mb-2 flex items-center gap-2"><ArrowRightLeft size={18} className="text-indigo-400" /> BIND Migration</h4>
                                        <p className="text-xs text-white/40 mb-6">Import or export records in standard BIND zone file format.</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={handleExport}
                                                className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-indigo-500/30 transition-all group"
                                            >
                                                <Download size={24} className="text-indigo-400 mb-3 group-hover:scale-110 transition-transform" />
                                                <span className="text-[11px] font-black uppercase text-white tracking-widest">Export BIND</span>
                                            </button>
                                            <button
                                                onClick={handleImport}
                                                className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-indigo-500/30 transition-all group"
                                            >
                                                <Upload size={24} className="text-indigo-400 mb-3 group-hover:scale-110 transition-transform" />
                                                <span className="text-[11px] font-black uppercase text-white tracking-widest">Import BIND</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Service Templates */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {[
                                            {
                                                id: 'google_workspace',
                                                name: 'Google Workspace',
                                                desc: 'Standard MX and SPF records for Gmail & G Suite.',
                                                icon: <Globe className="text-blue-400" />,
                                                color: 'blue'
                                            },
                                            {
                                                id: 'microsoft_365',
                                                name: 'Microsoft 365',
                                                desc: 'Exchange Online, Autodiscover, and SPF for Outlook.',
                                                icon: <Cloud className="text-orange-400" />,
                                                color: 'orange'
                                            }
                                        ].map(tpl => (
                                            <div key={tpl.id} className="p-6 rounded-[32px] bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-all group">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                                                        {tpl.icon}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-black text-white">{tpl.name}</h4>
                                                        <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">Email Template</p>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-white/60 mb-6 leading-relaxed">
                                                    {tpl.desc}
                                                </p>
                                                <button
                                                    onClick={() => handleApplyTemplate(tpl.id)}
                                                    className="w-full py-3 rounded-xl bg-white/5 hover:bg-indigo-600 text-white border border-white/5 hover:border-indigo-600 text-[11px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    Apply Template
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'history' && (
                                <div className="space-y-4 animate-fade">
                                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">Last 10 Snapshots</h4>
                                    {history.length === 0 ? (
                                        <div className="p-12 text-center bg-white/5 rounded-[32px] border border-white/5">
                                            <HistoryIcon size={48} className="text-white/10 mx-auto mb-4" />
                                            <p className="text-white/40 text-xs">No history found for this zone.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {history.map((ver, idx) => (
                                                <div key={ver.id} className="p-5 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/[0.08] transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                                            <span className="text-xs font-black text-indigo-400">v{ver.versionNumber}</span>
                                                        </div>
                                                        <div>
                                                            <h5 className="text-xs font-bold text-white">{ver.comment}</h5>
                                                            <p className="text-[10px] text-white/40">{new Date(ver.createdAt).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                    {idx > 0 && (
                                                        <button
                                                            onClick={() => handleRollback(ver.id)}
                                                            className="px-4 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all text-[10px] font-black uppercase opacity-0 group-hover:opacity-100"
                                                        >
                                                            Rollback
                                                        </button>
                                                    )}
                                                    {idx === 0 && (
                                                        <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[9px] font-black uppercase tracking-widest border border-green-500/20">Current Version</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            {activeTab === 'trash' && (
                                <div className="space-y-4 animate-fade">
                                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">Trash Bin</h4>
                                    {trashRecords.length === 0 ? (
                                        <div className="p-12 text-center bg-white/5 rounded-[32px] border border-white/5">
                                            <Trash2 size={48} className="text-white/10 mx-auto mb-4" />
                                            <p className="text-white/40 text-xs">Trash bin is empty.</p>
                                        </div>
                                    ) : (
                                        <div className="bg-white/5 rounded-[26px] border border-white/5 overflow-hidden">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-white/5 border-b border-white/5">
                                                        <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest">Deleted At</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest">Type</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest">Name</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest">Content</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {trashRecords.map(rec => (
                                                        <tr key={rec.id} className="group hover:bg-white/[0.04] transition-colors">
                                                            <td className="px-6 py-4 text-[10px] font-bold text-white/40">{new Date(rec.deleted_at).toLocaleString()}</td>
                                                            <td className="px-6 py-4">
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-black border bg-white/10 text-white/60 border-white/10 opacity-50">{rec.type}</span>
                                                            </td>
                                                            <td className="px-6 py-4 font-bold text-xs text-white/40">{rec.name}.{zone.domain}</td>
                                                            <td className="px-6 py-4 font-bold text-xs text-white/40 max-w-[200px] truncate">{rec.content}</td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <button
                                                                        onClick={() => handleRestore(rec.id)}
                                                                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all text-[10px] font-black uppercase"
                                                                    >
                                                                        Restore
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handlePermanentDelete(rec.id)}
                                                                        className="p-2 rounded-lg text-white/10 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                                                                        title="Permanently Delete"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'settings' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade">
                                    <div className="space-y-6">
                                        <div className="p-6 bg-white/5 rounded-[24px] border border-white/5">
                                            <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2"><Globe size={14} className="text-indigo-400" /> Nameservers</h4>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                                    <span className="text-xs font-bold text-white/40">NS1</span>
                                                    <span className="text-xs font-black text-white">ns1.yumnapanel.com</span>
                                                </div>
                                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                                    <span className="text-xs font-bold text-white/40">NS2</span>
                                                    <span className="text-xs font-black text-white">ns2.yumnapanel.com</span>
                                                </div>
                                            </div>
                                            <p className="mt-4 text-[10px] leading-relaxed text-white/20 italic">
                                                Note: Personal branding nameservers (ns1/ns2.domain.com) require glue records at your registrar.
                                            </p>
                                        </div>

                                        <div className="p-6 bg-amber-500/5 rounded-[24px] border border-amber-500/10">
                                            <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2"><RefreshCw size={14} /> Zone Reset</h4>
                                            <p className="text-[11px] text-amber-200/60 mb-6">This will restore the zone to its initial state, including default A, CNAME, and NS records based on the server IP.</p>
                                            <button onClick={handleResetZone} className="w-full py-3 bg-amber-500/20 hover:bg-amber-500 text-amber-500 hover:text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all border border-amber-500/20">
                                                Reset to Defaults
                                            </button>
                                        </div>

                                        <div className="p-6 bg-white/5 rounded-[24px] border border-white/5">
                                            <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2"><Activity size={14} className="text-blue-400" /> Webhook Notification</h4>
                                            <p className="text-[11px] text-white/40 mb-4">Send a POST request to this URL whenever DNS changes are published.</p>
                                            <div className="flex gap-2">
                                                <input
                                                    type="url"
                                                    placeholder="https://api.example.com/webhook"
                                                    value={webhookUrl}
                                                    onChange={(e) => setWebhookUrl(e.target.value)}
                                                    className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white focus:border-indigo-500 outline-none"
                                                />
                                                <button onClick={handleSaveWebhook} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold text-xs transition-all">
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="p-6 bg-rose-500/10 rounded-[24px] border border-rose-500/20">
                                            <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2"><AlertTriangle size={14} /> Danger Zone</h4>
                                            <p className="text-[11px] text-rose-200/60 mb-6">Permanently remove this DNS zone and all its records from the system. DNS lookups will fail immediately if this zone is active.</p>
                                            <button onClick={handleDeleteZone} className="w-full py-3 bg-rose-500 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:brightness-110 transition-all shadow-xl shadow-rose-500/10">
                                                Delete Zone
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'cloudflare' && (
                                <div className="space-y-6 animate-fade">
                                    <div className="p-6 bg-orange-500/5 rounded-[24px] border border-orange-500/10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                                                <Cloud size={24} className="text-orange-500" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-white">Cloudflare Integration</h4>
                                                <p className="text-xs text-white/40">Sync DNS records to Cloudflare CDN</p>
                                            </div>
                                        </div>

                                        <form onSubmit={async (e) => {
                                            e.preventDefault();
                                            const formData = new FormData(e.currentTarget);
                                            const apiToken = formData.get('apiToken') as string;
                                            const accountId = formData.get('accountId') as string;

                                            if (!confirm('Sync this zone to Cloudflare? Existing records will be created.')) return;

                                            setLoading(true);
                                            try {
                                                const res = await axios.post(`/api/dns/${zone.id}/cloudflare`, {
                                                    apiToken,
                                                    accountId
                                                });
                                                alert(`Success! ${res.data.message}\n\nCloudflare Zone ID: ${res.data.details.cfZoneId}\nSynced Records: ${res.data.details.syncedRecords}\nErrors: ${res.data.details.errors}`);
                                            } catch (err: any) {
                                                alert(err.response?.data?.error || 'Failed to sync with Cloudflare');
                                            } finally {
                                                setLoading(false);
                                            }
                                        }} className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-white/60 uppercase tracking-widest ml-1">
                                                    Cloudflare API Token *
                                                </label>
                                                <input
                                                    required
                                                    name="apiToken"
                                                    type="password"
                                                    placeholder="Your Cloudflare API Token"
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white font-bold text-sm focus:border-orange-500 outline-none transition-all"
                                                />
                                                <p className="text-[10px] text-white/30 ml-1">
                                                    Get your API token from Cloudflare Dashboard → My Profile → API Tokens
                                                </p>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-white/60 uppercase tracking-widest ml-1">
                                                    Account ID (Optional)
                                                </label>
                                                <input
                                                    name="accountId"
                                                    type="text"
                                                    placeholder="Cloudflare Account ID"
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white font-bold text-sm focus:border-orange-500 outline-none transition-all"
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="w-full py-3 bg-orange-500 hover:bg-orange-400 text-white font-black text-sm uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                {loading ? (
                                                    <>
                                                        <Loader2 size={16} className="animate-spin" />
                                                        Syncing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Cloud size={16} />
                                                        Sync to Cloudflare
                                                    </>
                                                )}
                                            </button>
                                        </form>
                                    </div>

                                    <div className="p-6 bg-blue-500/5 rounded-[24px] border border-blue-500/10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                                <Shield size={24} className="text-blue-500" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-white">Enable DNSSEC</h4>
                                                <p className="text-xs text-white/40">Secure your DNS with cryptographic signatures</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={async () => {
                                                if (!confirm('Enable DNSSEC for this zone? You will need to add DS records to your registrar.')) return;

                                                setLoading(true);
                                                try {
                                                    const res = await axios.post(`/api/dns/${zone.id}/dnssec`);
                                                    const dnssec = res.data.dnssec;

                                                    const message = `DNSSEC Enabled Successfully!\n\n` +
                                                        `Domain: ${dnssec.domain}\n\n` +
                                                        `DS Record:\n${dnssec.ds_record}\n\n` +
                                                        `DNSKEY Record:\n${dnssec.dnskey_record}\n\n` +
                                                        `Instructions:\n${dnssec.instructions.join('\n')}`;

                                                    alert(message);
                                                    fetchRecords();
                                                } catch (err: any) {
                                                    alert(err.response?.data?.error || 'Failed to enable DNSSEC');
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                            disabled={loading}
                                            className="w-full py-3 bg-blue-500 hover:bg-blue-400 text-white font-black text-sm uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" />
                                                    Enabling...
                                                </>
                                            ) : (
                                                <>
                                                    <Shield size={16} />
                                                    Enable DNSSEC
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[1200] flex items-center justify-center p-4">
                    <div className="glass w-full max-w-2xl rounded-[32px] overflow-hidden border border-white/5 shadow-2xl animate-scale-up">
                        <div className="p-8 bg-gradient-to-br from-blue-600/20 to-transparent border-b border-white/5">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-2xl font-black text-white tracking-tight">Import DNS Records</h3>
                                    <p className="text-sm text-white/40 mt-1">Upload or paste BIND zone file</p>
                                </div>
                                <button onClick={() => setShowImportModal(false)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="p-8 space-y-6">
                            {/* File Upload */}
                            <div>
                                <label className="text-xs font-black text-white/40 uppercase tracking-widest mb-3 block">Upload Zone File</label>
                                <input
                                    type="file"
                                    accept=".zone,.txt"
                                    onChange={handleFileUpload}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-500 file:text-white file:font-bold file:text-xs hover:file:bg-blue-600 file:cursor-pointer"
                                />
                            </div>

                            {/* Divider */}
                            <div className="flex items-center gap-4">
                                <div className="flex-1 h-px bg-white/10"></div>
                                <span className="text-xs font-black text-white/20 uppercase">OR</span>
                                <div className="flex-1 h-px bg-white/10"></div>
                            </div>

                            {/* Textarea */}
                            <div>
                                <label className="text-xs font-black text-white/40 uppercase tracking-widest mb-3 block">Paste BIND Zone Content</label>
                                <textarea
                                    value={importData}
                                    onChange={(e) => setImportData(e.target.value)}
                                    placeholder="$ORIGIN example.com.&#10;$TTL 3600&#10;@    IN    SOA    ns1.example.com. admin.example.com. (&#10;              2024010101 ; Serial&#10;              3600       ; Refresh&#10;              1800       ; Retry&#10;              604800     ; Expire&#10;              86400 )    ; Minimum TTL&#10;@    IN    NS     ns1.example.com.&#10;@    IN    A      192.0.2.1&#10;www  IN    A      192.0.2.1"
                                    className="w-full h-64 bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white text-xs font-mono focus:border-blue-500 outline-none resize-none custom-scrollbar"
                                />
                            </div>

                            {/* Replace Mode */}
                            <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                                <input
                                    type="checkbox"
                                    id="replaceMode"
                                    checked={replaceMode}
                                    onChange={(e) => setReplaceMode(e.target.checked)}
                                    className="w-4 h-4 rounded border-white/10 bg-white/5 text-amber-600 focus:ring-amber-500"
                                />
                                <label htmlFor="replaceMode" className="text-xs text-white/80 cursor-pointer">
                                    <span className="font-bold text-amber-400">Replace all existing records</span>
                                    <span className="text-white/40 ml-2">(Uncheck to append)</span>
                                </label>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={handleImportSubmit}
                                    disabled={loading || !importData.trim()}
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3 text-sm font-black uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={16} />
                                            Import Records
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowImportModal(false);
                                        setImportData('');
                                        setReplaceMode(false);
                                    }}
                                    className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl text-sm font-bold transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default DNSManagementModal;
