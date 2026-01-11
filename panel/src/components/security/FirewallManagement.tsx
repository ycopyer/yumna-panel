import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Trash2, Plus, Loader2, AlertTriangle, X, ShieldAlert, ShieldCheck, Globe, User, Settings, BarChart3, TrendingUp, CheckCircle, XCircle, Mail, Clock, Map as MapIcon, Zap, Activity, Scale, FileScan, LayoutList, ScrollText } from 'lucide-react';
import MalwareGuard from './MalwareGuard';
import ThreatMap from './ThreatMap';
import AdvancedFirewallTabs from './AdvancedFirewallTabs';
import SecurityDashboard from './SecurityDashboard';
import SecurityPatterns from './SecurityPatterns';
import ComplianceCenter from './ComplianceCenter';

interface FirewallRule {
    id: number;
    type: 'ip' | 'user';
    target: string;
    reason: string;
    country?: string;
    expiresAt: string | null;
    createdAt: string;
}

interface FirewallSettings {
    threshold: string;
    window: string;
    codes: string;
}

interface FirewallStats {
    total: number;
    active: number;
    byCountry: Array<{ country: string; count: number }>;
    recent: FirewallRule[];
}

interface UnblockRequest {
    id: number;
    ip: string;
    name: string;
    email: string;
    reason: string;
    block_reason: string;
    status: 'pending' | 'approved' | 'rejected';
    processedAt: string | null;
    processedBy: number | null;
    createdAt: string;
}

interface FirewallManagementProps {
    onClose: () => void;
    userId: string | number;
    initialTab?: 'map' | 'security' | 'rules' | 'advanced' | 'patterns' | 'settings' | 'stats' | 'requests' | 'threat-intel' | 'compliance' | 'malware';
}

const FirewallManagement: React.FC<FirewallManagementProps> = ({ onClose, userId, initialTab = 'map' }) => {
    const [activeTab, setActiveTab] = useState<any>(initialTab);
    const [rules, setRules] = useState<FirewallRule[]>([]);
    const [settings, setSettings] = useState<FirewallSettings>({ threshold: '40', window: '60', codes: '404,403,500,401,301,302,201,505' });
    const [stats, setStats] = useState<FirewallStats | null>(null);
    const [unblockRequests, setUnblockRequests] = useState<UnblockRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);

    // Form state
    const [newType, setNewType] = useState<'ip' | 'user'>('ip');
    const [newTarget, setNewTarget] = useState('');
    const [newReason, setNewReason] = useState('');
    const [newExpiry, setNewExpiry] = useState('');

    useEffect(() => {
        fetchRules();
        fetchSettings();
        fetchStats();
        fetchUnblockRequests();
    }, []);

    const fetchRules = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/firewall');
            setRules(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to fetch firewall rules');
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/firewall/settings');
            setSettings(res.data);
        } catch (err: any) {
            console.error('Failed to fetch settings:', err);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await axios.get('/api/firewall/stats');
            setStats(res.data);
        } catch (err: any) {
            console.error('Failed to fetch stats:', err);
        }
    };

    const handleAddRule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTarget) return;

        try {
            setSubmitting(true);
            await axios.post('/api/firewall', {
                type: newType,
                target: newTarget,
                reason: newReason,
                expiresAt: newExpiry || null
            });
            setShowAddForm(false);
            setNewTarget('');
            setNewReason('');
            setNewExpiry('');
            fetchRules();
            fetchStats();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to add rule');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteRule = async (id: number) => {
        if (!window.confirm('Are you sure you want to unblock this target?')) return;
        try {
            await axios.delete(`/api/firewall/${id}`);
            fetchRules();
            fetchStats();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to delete rule');
        }
    };

    const fetchUnblockRequests = async () => {
        try {
            const res = await axios.get('/api/firewall/unblock-requests');
            setUnblockRequests(res.data);
        } catch (err: any) {
            console.error('Failed to fetch unblock requests:', err);
        }
    };

    const handleApproveRequest = async (id: number) => {
        if (!window.confirm('Approve this unblock request? The IP will be unblocked immediately.')) return;
        try {
            setSubmitting(true);
            await axios.post(`/api/firewall/unblock-requests/${id}/approve`);
            fetchUnblockRequests();
            fetchRules();
            fetchStats();
            alert('Unblock request approved! IP has been unblocked.');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to approve request');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRejectRequest = async (id: number) => {
        if (!window.confirm('Reject this unblock request? The IP will remain blocked.')) return;
        try {
            setSubmitting(true);
            await axios.post(`/api/firewall/unblock-requests/${id}/reject`);
            fetchUnblockRequests();
            alert('Unblock request rejected.');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to reject request');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            await axios.post('/api/firewall/settings', settings);
            alert('Firewall settings updated successfully!');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to update settings');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Permanent';
        return new Date(dateStr).toLocaleString('id-ID', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[var(--bg-dark)] w-[90vw] lg:w-[60vw] h-[85vh] rounded-[40px] shadow-2xl border border-[var(--border)] flex flex-col overflow-hidden relative">


                {/* Header */}
                <div className="p-8 border-b border-[var(--border)] bg-gradient-to-r from-red-500/10 to-transparent">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-red-500/20 p-3 rounded-2xl border border-red-500/30">
                                <ShieldAlert size={28} className="text-red-500" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-[var(--text-main)]">Firewall & Security Suite</h2>
                                <p className="text-sm text-[var(--text-muted)] font-medium">Enterprise-grade threat protection & real-time monitoring</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-4 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/10 text-[var(--text-main)]">
                            <X size={28} />
                        </button>

                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mt-6 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
                        <button
                            onClick={() => setActiveTab('map')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${activeTab === 'map' ? 'bg-[var(--primary)] text-white shadow-lg' : 'bg-[var(--nav-hover)] text-[var(--text-muted)] hover:bg-[var(--nav-hover)]/80'}`}
                        >
                            <MapIcon size={18} /> Threat Map
                        </button>
                        <button
                            onClick={() => setActiveTab('threat-intel')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${activeTab === 'threat-intel' ? 'bg-amber-500 text-white shadow-lg' : 'bg-[var(--nav-hover)] text-[var(--text-muted)] hover:bg-[var(--nav-hover)]/80'}`}
                        >
                            <AlertTriangle size={18} /> Threat Intelligence
                        </button>
                        <button
                            onClick={() => setActiveTab('security')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${activeTab === 'security' ? 'bg-[var(--primary)] text-white shadow-lg' : 'bg-[var(--nav-hover)] text-[var(--text-muted)] hover:bg-[var(--nav-hover)]/80'}`}
                        >
                            <Activity size={18} /> Firewall Logs
                        </button>
                        <button
                            onClick={() => setActiveTab('malware')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${activeTab === 'malware' ? 'bg-red-600 text-white shadow-lg' : 'bg-[var(--nav-hover)] text-[var(--text-muted)] hover:bg-[var(--nav-hover)]/80'}`}
                        >
                            <FileScan size={18} /> Malware & Ransomware
                        </button>
                        <button
                            onClick={() => setActiveTab('advanced')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${activeTab === 'advanced' ? 'bg-[var(--primary)] text-white shadow-lg' : 'bg-[var(--nav-hover)] text-[var(--text-muted)] hover:bg-[var(--nav-hover)]/80'}`}
                        >
                            <Zap size={18} /> Advanced Rules
                        </button>
                        <button
                            onClick={() => setActiveTab('rules')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${activeTab === 'rules' ? 'bg-[var(--primary)] text-white shadow-lg' : 'bg-[var(--nav-hover)] text-[var(--text-muted)] hover:bg-[var(--nav-hover)]/80'}`}
                        >
                            <Shield size={18} /> Blocked List ({rules.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('requests')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${activeTab === 'requests' ? 'bg-[var(--primary)] text-white shadow-lg' : 'bg-[var(--nav-hover)] text-[var(--text-muted)] hover:bg-[var(--nav-hover)]/80'}`}
                        >
                            <Mail size={18} /> Appeals ({unblockRequests.filter(r => r.status === 'pending').length})
                        </button>
                        <button
                            onClick={() => setActiveTab('compliance')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${activeTab === 'compliance' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-[var(--nav-hover)] text-[var(--text-muted)] hover:bg-[var(--nav-hover)]/80'}`}
                        >
                            <Scale size={18} /> Compliance
                        </button>
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${activeTab === 'settings' ? 'bg-[var(--primary)] text-white shadow-lg' : 'bg-[var(--nav-hover)] text-[var(--text-muted)] hover:bg-[var(--nav-hover)]/80'}`}
                        >
                            <Settings size={18} /> Settings
                        </button>
                    </div>
                </div>

                <div className={`flex-1 ${activeTab === 'map' ? 'overflow-hidden' : 'overflow-y-auto'} p-4 md:p-8 custom-scrollbar`}>
                    {error && (
                        <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl flex items-center gap-3 animate-bounce-short">
                            <AlertTriangle size={20} />
                            <p className="text-sm font-bold">{error}</p>
                            <button onClick={() => setError('')} className="ml-auto p-1 hover:bg-red-500/10 rounded-lg">
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    {/* MAP DASHBOARD TAB */}
                    {activeTab === 'map' && (
                        <div className="h-full min-h-[600px]">
                            {loading ? (
                                <div className="flex justify-center items-center h-full">
                                    <Loader2 className="animate-spin text-[var(--primary)]" size={48} />
                                </div>
                            ) : stats ? (
                                <ThreatMap stats={stats} />
                            ) : (
                                <p className="text-center text-[var(--text-muted)] font-bold">No data unavailable</p>
                            )}
                        </div>
                    )}

                    {/* SECURITY DASHBOARD TAB */}
                    {activeTab === 'security' && <SecurityDashboard />}

                    {/* MALWARE & RANSOMWARE TAB */}
                    {activeTab === 'malware' && <MalwareGuard />}

                    {/* THREAT INTEL TAB */}
                    {activeTab === 'threat-intel' && <AdvancedFirewallTabs initialSubTab="threats" />}

                    {/* ADVANCED RULES TAB */}
                    {activeTab === 'advanced' && <AdvancedFirewallTabs />}

                    {/* COMPLIANCE TAB */}
                    {activeTab === 'compliance' && <ComplianceCenter />}

                    {/* SECURITY PATTERNS TAB */}
                    {activeTab === 'patterns' && (
                        <div className="bg-[var(--bg-main)] rounded-3xl overflow-hidden border border-[var(--border)]">
                            <SecurityPatterns
                                userId={String(userId)}
                                sessionId={localStorage.getItem('sessionId') || ''}
                            />
                        </div>
                    )}

                    {/* RULES TAB */}
                    {activeTab === 'rules' && (
                        <>
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-lg font-black text-[var(--text-main)] flex items-center gap-2">
                                    <Shield size={20} className="text-[var(--primary)]" />
                                    Active Restrictions ({rules.length})
                                </h3>
                                <button
                                    onClick={() => setShowAddForm(!showAddForm)}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 ${showAddForm ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-[var(--primary)] text-white shadow-lg shadow-indigo-500/20'}`}
                                >
                                    {showAddForm ? <><X size={18} /> Cancel</> : <><Plus size={18} /> Block Target</>}
                                </button>
                            </div>

                            {showAddForm && (
                                <form onSubmit={handleAddRule} className="mb-10 p-6 bg-[var(--nav-hover)]/30 border border-[var(--border)] rounded-3xl animate-in slide-in-from-top-4 duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Type</label>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setNewType('ip')}
                                                    className={`flex-1 py-3 rounded-xl font-bold border transition-all ${newType === 'ip' ? 'bg-[var(--primary)] border-[var(--primary)] text-white' : 'bg-transparent border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)]/50'}`}
                                                >
                                                    IP Address
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setNewType('user')}
                                                    className={`flex-1 py-3 rounded-xl font-bold border transition-all ${newType === 'user' ? 'bg-[var(--primary)] border-[var(--primary)] text-white' : 'bg-transparent border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)]/50'}`}
                                                >
                                                    Username
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Target</label>
                                            <input
                                                type="text"
                                                placeholder={newType === 'ip' ? 'e.g. 192.168.1.1' : 'e.g. hacker123'}
                                                value={newTarget}
                                                onChange={e => setNewTarget(e.target.value)}
                                                className="input-glass w-full h-12 px-4 rounded-xl font-bold outline-none"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Reason / Note</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Brute force attempts detected"
                                                value={newReason}
                                                onChange={e => setNewReason(e.target.value)}
                                                className="input-glass w-full h-12 px-4 rounded-xl font-bold outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Expires At (Optional)</label>
                                            <input
                                                type="datetime-local"
                                                value={newExpiry}
                                                onChange={e => setNewExpiry(e.target.value)}
                                                className="input-glass w-full h-12 px-4 rounded-xl font-bold outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-6 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="bg-[var(--primary)] text-white px-10 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {submitting ? <Loader2 className="animate-spin" size={20} /> : 'Save Restriction'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
                                    <Loader2 size={48} className="animate-spin text-[var(--primary)] mb-4" />
                                    <p className="font-bold">Syncing firewall rules...</p>
                                </div>
                            ) : rules.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 bg-[var(--nav-hover)]/20 rounded-[40px] border border-dashed border-[var(--border)]">
                                    <ShieldCheck size={64} className="text-green-500/30 mb-6" />
                                    <h4 className="text-xl font-black text-[var(--text-main)] mb-2">System Secure</h4>
                                    <p className="text-[var(--text-muted)] font-medium">No illegal activities or blocked targets found.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {rules.map(rule => (
                                        <div key={rule.id} className="group p-5 bg-[var(--nav-hover)]/30 border border-[var(--border)] rounded-3xl hover:border-red-500/30 hover:bg-red-500/5 transition-all duration-300 flex items-start justify-between">
                                            <div className="flex gap-4">
                                                <div className={`p-3 rounded-2xl border ${rule.type === 'ip' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-purple-500/10 border-purple-500/20 text-purple-500'}`}>
                                                    {rule.type === 'ip' ? <Globe size={20} /> : <User size={20} />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-black text-[var(--text-main)]">{rule.target}</h4>
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${rule.type === 'ip' ? 'bg-blue-500/20 text-blue-500' : 'bg-purple-500/20 text-purple-500'}`}>
                                                            {rule.type}
                                                        </span>
                                                        {rule.country && (
                                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-orange-500/20 text-orange-500">
                                                                {rule.country}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-[var(--text-muted)] font-bold mb-3 italic">"{rule.reason || 'No reason provided'}"</p>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] text-[var(--text-muted)] font-medium flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                                            Blocked until: {formatDate(rule.expiresAt)}
                                                        </p>
                                                        <p className="text-[10px] text-[var(--text-muted)] font-medium">
                                                            Created: {new Date(rule.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteRule(rule.id)}
                                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                title="Remove Block"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* SETTINGS TAB */}
                    {activeTab === 'settings' && (
                        <form onSubmit={handleSaveSettings} className="max-w-3xl mx-auto">
                            <div className="space-y-8">
                                <div className="p-6 bg-[var(--nav-hover)]/30 border border-[var(--border)] rounded-3xl">
                                    <h4 className="text-lg font-black text-[var(--text-main)] mb-6 flex items-center gap-2">
                                        <Settings size={20} className="text-[var(--primary)]" />
                                        Auto-Block Configuration
                                    </h4>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-sm font-black text-[var(--text-main)] mb-2 block">
                                                Threshold (Number of suspicious responses)
                                            </label>
                                            <input
                                                type="number"
                                                value={settings.threshold}
                                                onChange={e => setSettings({ ...settings, threshold: e.target.value })}
                                                className="input-glass w-full h-12 px-4 rounded-xl font-bold outline-none"
                                                min="1"
                                                max="1000"
                                            />
                                            <p className="text-xs text-[var(--text-muted)] mt-2">Block IP after this many suspicious responses</p>
                                        </div>

                                        <div>
                                            <label className="text-sm font-black text-[var(--text-main)] mb-2 block">
                                                Time Window (Seconds)
                                            </label>
                                            <input
                                                type="number"
                                                value={settings.window}
                                                onChange={e => setSettings({ ...settings, window: e.target.value })}
                                                className="input-glass w-full h-12 px-4 rounded-xl font-bold outline-none"
                                                min="10"
                                                max="3600"
                                            />
                                            <p className="text-xs text-[var(--text-muted)] mt-2">Monitor responses within this time period</p>
                                        </div>

                                        <div>
                                            <label className="text-sm font-black text-[var(--text-main)] mb-2 block">
                                                Monitored Response Codes (comma-separated)
                                            </label>
                                            <input
                                                type="text"
                                                value={settings.codes}
                                                onChange={e => setSettings({ ...settings, codes: e.target.value })}
                                                className="input-glass w-full h-12 px-4 rounded-xl font-bold outline-none"
                                                placeholder="404,403,500,401,301,302,201,505"
                                            />
                                            <p className="text-xs text-[var(--text-muted)] mt-2">HTTP status codes to monitor for suspicious activity</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-yellow-500/10 border border-yellow-500/20 p-6 rounded-3xl">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle size={20} className="text-yellow-500 mt-1" />
                                        <div>
                                            <h5 className="font-black text-yellow-500 mb-2">Example Configuration</h5>
                                            <p className="text-sm text-[var(--text-muted)]">
                                                With threshold=40, window=60, codes=404,403,500:<br />
                                                If an IP triggers 40+ errors (404/403/500) within 60 seconds, it will be auto-blocked for 24 hours.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-[var(--primary)] text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {submitting ? <Loader2 className="animate-spin" size={20} /> : 'Save Settings'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* STATS TAB */}
                    {activeTab === 'stats' && stats && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-6 bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 rounded-3xl">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-sm font-black text-[var(--text-muted)] uppercase">Total Blocks</h4>
                                        <Shield size={20} className="text-blue-500" />
                                    </div>
                                    <p className="text-4xl font-black text-blue-500">{stats.total}</p>
                                </div>

                                <div className="p-6 bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 rounded-3xl">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-sm font-black text-[var(--text-muted)] uppercase">Active Blocks</h4>
                                        <ShieldAlert size={20} className="text-red-500" />
                                    </div>
                                    <p className="text-4xl font-black text-red-500">{stats.active}</p>
                                </div>
                            </div>

                            <div className="p-6 bg-[var(--nav-hover)]/30 border border-[var(--border)] rounded-3xl">
                                <h4 className="text-lg font-black text-[var(--text-main)] mb-6 flex items-center gap-2">
                                    <Globe size={20} className="text-[var(--primary)]" />
                                    Blocks by Country
                                </h4>
                                <div className="space-y-3">
                                    {stats.byCountry.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-[var(--sidebar-bg)] rounded-xl">
                                            <span className="font-bold text-[var(--text-main)]">{item.country || 'Unknown'}</span>
                                            <span className="px-3 py-1 bg-red-500/20 text-red-500 rounded-full text-sm font-black">{item.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6 bg-[var(--nav-hover)]/30 border border-[var(--border)] rounded-3xl">
                                <h4 className="text-lg font-black text-[var(--text-main)] mb-6 flex items-center gap-2">
                                    <TrendingUp size={20} className="text-[var(--primary)]" />
                                    Recent Blocks (Last 20)
                                </h4>
                                <div className="space-y-2">
                                    {stats.recent.map((rule, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-[var(--sidebar-bg)] rounded-xl text-sm">
                                            <div className="flex items-center gap-3">
                                                <span className="font-black text-[var(--text-main)]">{rule.target}</span>
                                                {rule.country && (
                                                    <span className="px-2 py-0.5 bg-orange-500/20 text-orange-500 rounded-full text-xs font-black">{rule.country}</span>
                                                )}
                                            </div>
                                            <span className="text-xs text-[var(--text-muted)]">{new Date(rule.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* UNBLOCK REQUESTS TAB */}
                    {activeTab === 'requests' && (
                        <div className="space-y-6">
                            {/* Pending Requests */}
                            <div className="p-6 bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-3xl">
                                <h4 className="text-lg font-black text-[var(--text-main)] mb-6 flex items-center gap-2">
                                    <Clock size={20} className="text-yellow-500" />
                                    Pending Requests ({unblockRequests.filter(r => r.status === 'pending').length})
                                </h4>
                                {unblockRequests.filter(r => r.status === 'pending').length === 0 ? (
                                    <div className="text-center py-10 text-[var(--text-muted)]">
                                        <Mail size={48} className="mx-auto mb-4 opacity-30" />
                                        <p className="font-bold">No pending unblock requests</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {unblockRequests.filter(r => r.status === 'pending').map(req => (
                                            <div key={req.id} className="p-5 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-sm">
                                                {/* Header & Actions */}
                                                <div className="flex items-start justify-between mb-4 border-b border-[var(--border)] pb-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="px-2.5 py-1 bg-yellow-500/10 text-yellow-500 text-xs font-black rounded-lg border border-yellow-500/20">
                                                            REQUEST #{req.id}
                                                        </span>
                                                        <span className="font-mono font-black text-lg text-[var(--text-main)]">{req.ip}</span>
                                                        <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                                                            <Clock size={12} />
                                                            {new Date(req.createdAt).toLocaleString('id-ID')}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleApproveRequest(req.id)}
                                                            disabled={submitting}
                                                            className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-xs transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                                                        >
                                                            <CheckCircle size={14} /> Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectRequest(req.id)}
                                                            disabled={submitting}
                                                            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-xs transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                                                        >
                                                            <XCircle size={14} /> Reject
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* User Input Data */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                    <div className="space-y-1">
                                                        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Full Name</span>
                                                        <div className="text-sm font-medium text-[var(--text-main)] bg-[var(--input-bg)] p-2.5 rounded-lg border border-[var(--border)]">
                                                            {req.name}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Email Address</span>
                                                        <div className="text-sm font-medium text-[var(--text-main)] bg-[var(--input-bg)] p-2.5 rounded-lg border border-[var(--border)]">
                                                            {req.email}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-1 mb-4">
                                                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Reason for Unblock Request</span>
                                                    <div className="text-sm text-[var(--text-main)] bg-[var(--input-bg)] p-3 rounded-lg border border-[var(--border)] leading-relaxed">
                                                        {req.reason}
                                                    </div>
                                                </div>

                                                {/* System Info */}
                                                <div className="pt-3 border-t border-[var(--border)]">
                                                    <div className="flex items-start gap-2">
                                                        <ShieldAlert size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                                                        <div>
                                                            <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Original Block Reason</span>
                                                            <p className="text-xs font-medium text-red-500 dark:text-red-300 italic mt-0.5">{req.block_reason}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Processed Requests */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Approved */}
                                <div className="p-6 bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-3xl">
                                    <h4 className="text-lg font-black text-green-700 dark:text-green-400 mb-4 flex items-center gap-2">
                                        <CheckCircle size={20} />
                                        Approved ({unblockRequests.filter(r => r.status === 'approved').length})
                                    </h4>
                                    <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                                        {unblockRequests.filter(r => r.status === 'approved').slice(0, 10).map(req => (
                                            <div key={req.id} className="p-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-sm">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-mono font-black text-[var(--text-main)]">{req.ip}</span>
                                                    <span className="text-xs text-[var(--text-muted)]">#{req.id}</span>
                                                </div>
                                                <p className="text-xs text-[var(--text-muted)]">{req.name}</p>
                                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                                    {new Date(req.processedAt!).toLocaleDateString()}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Rejected */}
                                <div className="p-6 bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-3xl">
                                    <h4 className="text-lg font-black text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
                                        <XCircle size={20} />
                                        Rejected ({unblockRequests.filter(r => r.status === 'rejected').length})
                                    </h4>
                                    <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                                        {unblockRequests.filter(r => r.status === 'rejected').slice(0, 10).map(req => (
                                            <div key={req.id} className="p-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-sm">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-mono font-black text-[var(--text-main)]">{req.ip}</span>
                                                    <span className="text-xs text-[var(--text-muted)]">#{req.id}</span>
                                                </div>
                                                <p className="text-xs text-[var(--text-muted)]">{req.name}</p>
                                                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                    {new Date(req.processedAt!).toLocaleDateString()}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-red-500/5 border-t border-[var(--border)] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className="text-red-500" />
                        <span className="text-[9px] font-black uppercase tracking-wider text-red-500/80">Security Enforcement Active</span>
                    </div>
                </div>
            </div>
        </div >
    );

};

export default FirewallManagement;
