import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Download, Plus, Trash2, Filter, Search, Globe, ChevronRight, AlertCircle, FileStack } from 'lucide-react';
import axios from 'axios';

interface IPRule {
    id: number;
    website_id: number;
    ip_address: string;
    rule_type: 'whitelist' | 'blacklist';
    description: string;
    created_at: string;
    created_by_username: string;
}

interface IPAccessControlManagerProps {
    websiteId: number;
    domain: string;
}

const IPAccessControlManager: React.FC<IPAccessControlManagerProps> = ({ websiteId, domain }) => {
    const [rules, setRules] = useState<IPRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total_rules: 0, whitelist_count: 0, blacklist_count: 0 });
    const [showAddForm, setShowAddForm] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Form State
    const [newIP, setNewIP] = useState('');
    const [newType, setNewType] = useState<'whitelist' | 'blacklist'>('whitelist');
    const [newDesc, setNewDesc] = useState('');
    const [bulkText, setBulkText] = useState('');

    useEffect(() => {
        fetchData();
    }, [websiteId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [rulesRes, statsRes] = await Promise.all([
                axios.get(`/api/security/ip-access/${websiteId}`),
                axios.get(`/api/security/ip-access/${websiteId}/stats`)
            ]);
            setRules(rulesRes.data);
            setStats(statsRes.data);
        } catch (err) {
            console.error('Failed to fetch IP access rules:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newIP) return;
        setSubmitting(true);
        try {
            await axios.post(`/api/security/ip-access/${websiteId}`, {
                ipAddress: newIP,
                ruleType: newType,
                description: newDesc
            });
            setNewIP('');
            setNewDesc('');
            setShowAddForm(false);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to add rule');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteRule = async (ruleId: number) => {
        if (!confirm('Are you sure you want to delete this rule?')) return;
        try {
            await axios.delete(`/api/security/ip-access/rules/${ruleId}`);
            fetchData();
        } catch (err) {
            alert('Failed to delete rule');
        }
    };

    const handleBulkImport = async () => {
        if (!bulkText.trim()) return;
        setSubmitting(true);
        try {
            const res = await axios.post(`/api/security/ip-access/${websiteId}/bulk`, {
                ipList: bulkText,
                ruleType: newType
            });
            alert(`Successfully imported ${res.data.imported} IPs. Failed: ${res.data.failed}`);
            setBulkText('');
            setShowBulkImport(false);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Bulk import failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleExport = async () => {
        try {
            const res = await axios.get(`/api/security/ip-access/${websiteId}/export`);
            const blob = new Blob([res.data.export_text], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${domain}_ip_access_rules.txt`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert('Export failed');
        }
    };

    const filteredRules = rules.filter(r =>
        r.ip_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                            <Shield size={20} />
                        </div>
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Total Rules</span>
                    </div>
                    <div className="text-3xl font-black text-white">{stats.total_rules}</div>
                </div>
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 hover:border-white/20 transition-all border-l-4 border-l-emerald-500/50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                            <ShieldCheck size={20} />
                        </div>
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Whitelisted</span>
                    </div>
                    <div className="text-3xl font-black text-emerald-400">{stats.whitelist_count}</div>
                </div>
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 hover:border-white/20 transition-all border-l-4 border-l-rose-500/50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                            <ShieldAlert size={20} />
                        </div>
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Blacklisted</span>
                    </div>
                    <div className="text-3xl font-black text-rose-400">{stats.blacklist_count}</div>
                </div>
            </div>

            {/* Actions & Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-indigo-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search rules by IP or description..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-white focus:border-indigo-500/50 outline-none transition-all placeholder:text-white/20"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${showAddForm ? 'bg-rose-500 text-white' : 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:brightness-110'}`}
                    >
                        {showAddForm ? 'Cancel' : <><Plus size={16} /> Add Rule</>}
                    </button>
                    <button
                        onClick={() => setShowBulkImport(!showBulkImport)}
                        className="flex items-center gap-2 px-6 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/10 transition-all"
                    >
                        <FileStack size={16} /> Bulk
                    </button>
                    <button
                        onClick={handleExport}
                        className="p-3.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-2xl border border-white/10 transition-all"
                        title="Export Rules"
                    >
                        <Download size={18} />
                    </button>
                </div>
            </div>

            {/* Add Rule Form */}
            {showAddForm && (
                <div className="p-8 bg-indigo-500/10 border border-indigo-500/20 rounded-[32px] animate-in slide-in-from-top-4 duration-300">
                    <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <Plus size={14} className="text-indigo-400" />
                        Create New IP Rule
                    </h4>
                    <form onSubmit={handleAddRule} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">IP Address / CIDR</label>
                            <input
                                placeholder="e.g. 192.168.1.1 or 10.0.0.0/24"
                                value={newIP}
                                onChange={e => setNewIP(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-bold outline-none focus:border-indigo-500/50"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Rule Type</label>
                            <select
                                value={newType}
                                onChange={e => setNewType(e.target.value as any)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-bold outline-none focus:border-indigo-500/50"
                            >
                                <option value="whitelist" style={{ background: '#1a1a1a' }}>Whitelist (Allow)</option>
                                <option value="blacklist" style={{ background: '#1a1a1a' }}>Blacklist (Deny)</option>
                            </select>
                        </div>
                        <div className="space-y-2 lg:col-span-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Description</label>
                            <div className="flex gap-2">
                                <input
                                    placeholder="Brief reason for this rule..."
                                    value={newDesc}
                                    onChange={e => setNewDesc(e.target.value)}
                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm font-bold outline-none focus:border-indigo-500/50"
                                />
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Bulk Import */}
            {showBulkImport && (
                <div className="p-8 bg-white/5 border border-white/10 rounded-[32px] animate-in slide-in-from-top-4 duration-300">
                    <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-4">Bulk IP Import</h4>
                    <p className="text-xs text-white/40 mb-6 font-bold">Enter one IP or CIDR per line to bulk import {newType} rules.</p>
                    <div className="space-y-6">
                        <textarea
                            value={bulkText}
                            onChange={e => setBulkText(e.target.value)}
                            placeholder="1.2.3.4&#10;5.6.7.8/24&#10;2001:db8::/32"
                            className="w-full h-48 bg-black/40 border border-white/10 rounded-2xl p-6 text-white font-mono text-sm outline-none focus:border-indigo-500/50 transition-all resize-none shadow-inner"
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowBulkImport(false)}
                                className="px-6 py-3 text-white/40 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkImport}
                                disabled={submitting || !bulkText.trim()}
                                className="px-10 py-3 bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-500/20 hover:brightness-110 transition-all"
                            >
                                {submitting ? 'Importing...' : 'Confirm Import'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rules Table */}
            <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/[0.02]">
                                <th className="px-8 py-5 text-[10px] font-black text-white/40 uppercase tracking-widest">IP Address / CIDR</th>
                                <th className="px-8 py-5 text-[10px] font-black text-white/40 uppercase tracking-widest">Type</th>
                                <th className="px-8 py-5 text-[10px] font-black text-white/40 uppercase tracking-widest">Description</th>
                                <th className="px-8 py-5 text-[10px] font-black text-white/40 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.05]">
                            {filteredRules.map(rule => (
                                <tr key={rule.id} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${rule.rule_type === 'whitelist' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                                <Globe size={16} />
                                            </div>
                                            <span className="font-mono font-black text-white text-sm">{rule.ip_address}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${rule.rule_type === 'whitelist' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                                            {rule.rule_type}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div>
                                            <p className="text-xs font-bold text-white/60 line-clamp-1">{rule.description || 'No description'}</p>
                                            <p className="text-[9px] font-medium text-white/20 mt-1 uppercase tracking-tighter">By {rule.created_by_username || 'System'} • {new Date(rule.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button
                                            onClick={() => handleDeleteRule(rule.id)}
                                            className="p-2 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredRules.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={4} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-20">
                                            <Shield size={48} className="text-white" />
                                            <p className="text-sm font-black uppercase tracking-widest">No IP rules found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Help/Notice */}
            <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-[24px] flex gap-4">
                <AlertCircle size={24} className="text-amber-500/60 shrink-0" />
                <div>
                    <h5 className="text-xs font-black text-amber-500 uppercase tracking-widest mb-1">Notice: Rule Precedence</h5>
                    <p className="text-[11px] font-bold text-white/40 leading-relaxed">
                        Whitelist takes precedence. If a whitelist exists, only those IPs are allowed and all others are denied.
                        If only blacklists exist, all IPs are allowed except those on the list. Changes trigger an automated Nginx reload.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default IPAccessControlManager;
