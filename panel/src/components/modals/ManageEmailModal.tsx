import React, { useState, useEffect } from 'react';
import { X, Mail, Users, RefreshCw, Trash2, Plus, Shield, ShieldCheck, Key, Reply, AlertTriangle, AlertCircle, Activity, Settings, Globe, ExternalLink } from 'lucide-react';
import axios from 'axios';

interface ManageEmailModalProps {
    domain: any;
    onClose: () => void;
}

const ManageEmailModal: React.FC<ManageEmailModalProps> = ({ domain, onClose }) => {
    const [activeTab, setActiveTab] = useState<'accounts' | 'aliases' | 'autoresponders' | 'security' | 'logs' | 'lists'>('accounts');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any[]>([]);

    // Sub-forms state
    const [showAddForm, setShowAddForm] = useState(false);
    const [newItem, setNewItem] = useState<any>({});

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'accounts') {
                const res = await axios.get('/api/mail/accounts');
                setData(res.data.filter((acc: any) => acc.domainId === domain.id));
            } else if (activeTab === 'aliases') {
                const res = await axios.get('/api/mail/aliases');
                setData(res.data.filter((alias: any) => alias.source.endsWith(`@${domain.domain}`)));
            } else if (activeTab === 'autoresponders') {
                const res = await axios.get(`/api/mail/autoresponders?domain=${domain.domain}`);
                setData(res.data);
            } else if (activeTab === 'security') {
                const [dns, spam, webmail] = await Promise.all([
                    axios.get(`/api/mail/domains/${domain.id}/dns-config`),
                    axios.get(`/api/mail/domains/${domain.id}/spam-settings`),
                    axios.get(`/api/mail/domains/${domain.domain}/webmail-status`)
                ]);
                setData([{
                    ...dns.data,
                    spam: spam.data,
                    webmail: webmail.data
                }]);
            } else if (activeTab === 'logs') {
                const res = await axios.get(`/api/mail/logs?domain=${domain.domain}`);
                setData(res.data);
            } else if (activeTab === 'lists') {
                const res = await axios.get('/api/mail/lists');
                setData(res.data.filter((list: any) => list.domainId === domain.id));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post('/api/mail/accounts', {
                domainId: domain.id,
                username: newItem.username,
                password: newItem.password,
                quota_mb: parseInt(newItem.quota) || 1024
            });
            setShowAddForm(false);
            setNewItem({});
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to create account');
        }
    };

    const handleCreateAlias = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post('/api/mail/aliases', {
                source: `${newItem.source}@${domain.domain}`,
                destination: newItem.destination,
                userId: domain.userId
            });
            setShowAddForm(false);
            setNewItem({});
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to create alias');
        }
    };

    const formatBytes = (bytes: number) => {
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleDeleteAccount = async (id: number) => {
        if (!confirm('Delete this email account? Data will be lost.')) return;
        try {
            await axios.delete(`/api/mail/accounts/${id}`);
            fetchData();
        } catch (err: any) {
            alert('Failed to delete account');
        }
    };

    const handleDeleteAlias = async (id: number) => {
        if (!confirm('Delete this alias?')) return;
        try {
            await axios.delete(`/api/mail/aliases/${id}`);
            fetchData();
        } catch (err: any) {
            alert('Failed to delete alias');
        }
    };

    const handleDeleteAutoresponder = async (id: number) => {
        if (!confirm('Delete this autoresponder?')) return;
        try {
            await axios.delete(`/api/mail/autoresponders/${id}`);
            fetchData();
        } catch (err: any) {
            alert('Failed to delete autoresponder');
        }
    };

    const handleCreateAutoresponder = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!newItem.email.endsWith(`@${domain.domain}`)) {
                newItem.email = `${newItem.email}@${domain.domain}`;
            }

            await axios.post('/api/mail/autoresponders', {
                email: newItem.email,
                subject: newItem.subject,
                body: newItem.body,
                active: 1
            });
            setShowAddForm(false);
            setNewItem({});
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to set autoresponder');
        }
    };

    const handleCreateList = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post('/api/mail/lists', {
                domainId: domain.id,
                name: newItem.name
            });
            setShowAddForm(false);
            setNewItem({});
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to create list');
        }
    };

    const handleDeleteList = async (id: number) => {
        if (!confirm('Delete this mailing list?')) return;
        try {
            await axios.delete(`/api/mail/lists/${id}`);
            fetchData();
        } catch (err: any) {
            alert('Failed to delete list');
        }
    };

    const handleUpdateSpamSettings = async (enabled: boolean, score: number, method: string) => {
        try {
            await axios.post(`/api/mail/domains/${domain.id}/spam-settings`, { enabled, score, method });
            fetchData();
        } catch (err) {
            alert('Failed to update spam settings');
        }
    };

    const handleInstallWebmail = async () => {
        if (!confirm(`Install Roundcube Webmail for webmail.${domain.domain}?`)) return;
        setLoading(true);
        try {
            await axios.post(`/api/mail/domains/${domain.domain}/install-webmail`);
            fetchData();
        } catch (err) {
            alert('Failed to install webmail');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade">
            <div className="glass w-full max-w-4xl h-[80vh] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
                <div className="p-8 border-b border-white/5 bg-gradient-to-r from-indigo-500/10 to-transparent flex justify-between items-start">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                            <Mail className="text-white" size={32} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tight">{domain.domain}</h2>
                            <p className="text-white/50 font-medium flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                Active Mail Server
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-all">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex px-8 border-b border-white/5 overflow-x-auto">
                    {[
                        { id: 'accounts', label: 'Mailboxes', icon: Users },
                        { id: 'aliases', label: 'Forwarders', icon: RefreshCw },
                        { id: 'autoresponders', label: 'Autoresponders', icon: Reply },
                        { id: 'security', label: 'Authentication', icon: ShieldCheck },
                        { id: 'logs', label: 'Logs', icon: Activity },
                        { id: 'lists', label: 'Mailing Lists', icon: Users }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id as any); setShowAddForm(false); fetchData(); }}
                            className={`flex items-center gap-2 px-6 py-4 border-b-2 font-bold transition-all whitespace-nowrap
                                ${activeTab === tab.id ? 'border-indigo-500 text-white' : 'border-transparent text-white/40 hover:text-white hover:bg-white/5'}
                            `}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {activeTab === 'accounts' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-white">Email Accounts</h3>
                                <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 text-white font-bold text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all">
                                    <Plus size={16} /> New Mailbox
                                </button>
                            </div>

                            {showAddForm && (
                                <form onSubmit={handleCreateAccount} className="p-6 rounded-2xl bg-white/5 border border-white/10 animate-in slide-in-from-top-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                        <div className="md:col-span-2 flex items-center gap-2 bg-[var(--bg-dark)] rounded-xl px-4 border border-white/10">
                                            <input autoFocus type="text" placeholder="username" className="flex-1 bg-transparent py-3 text-white focus:outline-none" value={newItem.username || ''} onChange={e => setNewItem({ ...newItem, username: e.target.value })} />
                                            <span className="text-white/40">@{domain.domain}</span>
                                        </div>
                                        <input type="password" placeholder="Secure Password" className="bg-[var(--bg-dark)] rounded-xl px-4 py-3 text-white border border-white/10 focus:outline-none focus:border-indigo-500/50" value={newItem.password || ''} onChange={e => setNewItem({ ...newItem, password: e.target.value })} />
                                        <input type="number" placeholder="Quota (MB)" className="bg-[var(--bg-dark)] rounded-xl px-4 py-3 text-white border border-white/10 focus:outline-none focus:border-indigo-500/50" value={newItem.quota || ''} onChange={e => setNewItem({ ...newItem, quota: e.target.value })} />
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
                                        <button type="submit" className="px-6 py-2 rounded-xl bg-indigo-500 text-white font-bold text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all">Create Account</button>
                                    </div>
                                </form>
                            )}

                            <div className="grid gap-3">
                                {data.map((acc: any) => (
                                    <div key={acc.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="w-10 h-10 rounded-full bg-[var(--bg-dark)] flex items-center justify-center text-white/50">
                                                <Users size={20} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className="text-white font-bold">{acc.username}@{domain.domain}</p>
                                                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{formatBytes(acc.used_bytes || 0)} / {formatBytes(acc.quota_bytes)}</span>
                                                </div>
                                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ${((acc.used_bytes || 0) / acc.quota_bytes) > 0.9 ? 'bg-red-500' :
                                                            ((acc.used_bytes || 0) / acc.quota_bytes) > 0.7 ? 'bg-amber-500' : 'bg-indigo-500'
                                                            }`}
                                                        style={{ width: `${Math.min(((acc.used_bytes || 0) / acc.quota_bytes) * 100, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={async () => {
                                                    const newQuota = prompt(`Enter new quota in MB for ${acc.username}@${domain.domain}:`, (acc.quota_bytes / 1024 / 1024).toString());
                                                    if (newQuota) {
                                                        try {
                                                            await axios.put(`/api/mail/accounts/${acc.id}/quota`, { quota_mb: parseInt(newQuota) });
                                                            fetchData();
                                                        } catch (err: any) {
                                                            alert('Failed to update quota');
                                                        }
                                                    }
                                                }}
                                                className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-bold transition-all border border-blue-500/20"
                                            >
                                                Edit Quota
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    const percent = prompt('Simulate usage (0-100%):');
                                                    if (percent) {
                                                        try {
                                                            await axios.post(`/api/mail/accounts/${acc.id}/simulate-usage`, { percentage: parseInt(percent) });
                                                            fetchData();
                                                        } catch (err: any) {
                                                            alert('Failed to simulate usage');
                                                        }
                                                    }
                                                }}
                                                className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs font-bold transition-all border border-amber-500/20"
                                            >
                                                Test Usage
                                            </button>
                                            <button onClick={() => handleDeleteAccount(acc.id)} className="p-2 text-white/40 hover:text-rose-500 transition-all hover:bg-rose-500/10 rounded-lg">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {data.length === 0 && !loading && (
                                    <div className="text-center py-12 text-white/30">No mailboxes created yet.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'aliases' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-white">Email Forwarders (Aliases)</h3>
                                <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 text-white font-bold text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all">
                                    <Plus size={16} /> New Forwarder
                                </button>
                            </div>

                            {showAddForm && (
                                <form onSubmit={handleCreateAlias} className="p-6 rounded-2xl bg-white/5 border border-white/10 animate-in slide-in-from-top-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div className="flex items-center gap-2 bg-[var(--bg-dark)] rounded-xl px-4 border border-white/10">
                                            <input autoFocus type="text" placeholder="source" className="flex-1 bg-transparent py-3 text-white focus:outline-none" value={newItem.source || ''} onChange={e => setNewItem({ ...newItem, source: e.target.value })} />
                                            <span className="text-white/40">@{domain.domain}</span>
                                        </div>
                                        <input type="email" placeholder="Destination Email" className="bg-[var(--bg-dark)] rounded-xl px-4 py-3 text-white border border-white/10 focus:outline-none focus:border-indigo-500/50" value={newItem.destination || ''} onChange={e => setNewItem({ ...newItem, destination: e.target.value })} />
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
                                        <button type="submit" className="px-6 py-2 rounded-xl bg-indigo-500 text-white font-bold text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all">Create Forwarder</button>
                                    </div>
                                </form>
                            )}

                            <div className="grid gap-3">
                                {data.map((alias: any) => (
                                    <div key={alias.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-[var(--bg-dark)] flex items-center justify-center text-white/50">
                                                <RefreshCw size={20} />
                                            </div>
                                            <div>
                                                <p className="text-white font-bold">{alias.source}</p>
                                                <p className="text-xs text-white/40">→ {alias.destination}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteAlias(alias.id)} className="p-2 text-white/40 hover:text-rose-500 transition-all hover:bg-rose-500/10 rounded-lg">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                                {data.length === 0 && !loading && (
                                    <div className="text-center py-12 text-white/30">No forwarders configured.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'autoresponders' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-white">Autoresponders</h3>
                                <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 text-white font-bold text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all">
                                    <Plus size={16} /> Set Autoresponder
                                </button>
                            </div>

                            {showAddForm && (
                                <form onSubmit={handleCreateAutoresponder} className="p-6 rounded-2xl bg-white/5 border border-white/10 animate-in slide-in-from-top-4 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center gap-2 bg-[var(--bg-dark)] rounded-xl px-4 border border-white/10">
                                            <input autoFocus type="text" placeholder="email" className="flex-1 bg-transparent py-3 text-white focus:outline-none" value={newItem.email || ''} onChange={e => setNewItem({ ...newItem, email: e.target.value })} />
                                            <span className="text-white/40">@{domain.domain}</span>
                                        </div>
                                        <input type="text" placeholder="Subject" className="bg-[var(--bg-dark)] rounded-xl px-4 py-3 text-white border border-white/10 focus:outline-none focus:border-indigo-500/50" value={newItem.subject || ''} onChange={e => setNewItem({ ...newItem, subject: e.target.value })} />
                                    </div>
                                    <textarea
                                        placeholder="Autoresponder Body"
                                        rows={4}
                                        className="w-full bg-[var(--bg-dark)] rounded-xl px-4 py-3 text-white border border-white/10 focus:outline-none focus:border-indigo-500/50"
                                        value={newItem.body || ''}
                                        onChange={e => setNewItem({ ...newItem, body: e.target.value })}
                                    ></textarea>
                                    <div className="flex justify-end gap-3">
                                        <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
                                        <button type="submit" className="px-6 py-2 rounded-xl bg-indigo-500 text-white font-bold text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all">Save Autoresponder</button>
                                    </div>
                                </form>
                            )}

                            <div className="grid gap-3">
                                {data.map((ar: any) => (
                                    <div key={ar.id} className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-[var(--bg-dark)] flex items-center justify-center text-white/50">
                                                    <Reply size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold">{ar.email}</p>
                                                    <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider">{ar.subject}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => { setNewItem(ar); setShowAddForm(true); }} className="p-2 text-white/40 hover:text-indigo-400 transition-all hover:bg-white/5 rounded-lg">
                                                    <Settings size={18} />
                                                </button>
                                                <button onClick={() => handleDeleteAutoresponder(ar.id)} className="p-2 text-white/40 hover:text-rose-500 transition-all hover:bg-rose-500/10 rounded-lg">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-white/40 text-sm italic border-l-2 border-white/10 pl-4 mb-0">{ar.body}</p>
                                    </div>
                                ))}
                                {data.length === 0 && !loading && (
                                    <div className="text-center py-12 text-white/30">No autoresponders set.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            {data[0] ? (
                                <>
                                    <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
                                                <Key size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-white">DKIM Configuration</h3>
                                                <p className="text-white/50 text-sm">Selector: {data[0].dkim.selector}</p>
                                            </div>
                                        </div>
                                        <div
                                            onClick={() => { navigator.clipboard.writeText(data[0].dkim.record); alert('DKIM Record Copied!'); }}
                                            className="bg-[var(--bg-dark)]/[0.5] p-4 rounded-xl font-mono text-xs text-emerald-400 break-all border border-emerald-500/20 relative group cursor-pointer hover:bg-[var(--bg-dark)] transition-colors"
                                        >
                                            {data[0].dkim.record}
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-emerald-500 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity">COPY</span>
                                        </div>
                                    </div>

                                    <div className="p-6 rounded-3xl bg-blue-500/10 border border-blue-500/20">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400">
                                                <Shield size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-white">SPF Record</h3>
                                                <p className="text-white/50 text-sm">Sender Policy Framework</p>
                                            </div>
                                        </div>
                                        <div
                                            onClick={() => { navigator.clipboard.writeText(data[0].spf.record); alert('SPF Record Copied!'); }}
                                            className="bg-[var(--bg-dark)]/[0.5] p-4 rounded-xl font-mono text-xs text-blue-400 border border-blue-500/20 cursor-pointer relative group"
                                        >
                                            {data[0].spf.record}
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-blue-500 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity">COPY</span>
                                        </div>
                                    </div>

                                    <div className="p-6 rounded-3xl bg-purple-500/10 border border-purple-500/20">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
                                                <AlertCircle size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-white">DMARC Record</h3>
                                                <p className="text-white/50 text-sm">Domain-based Message Authentication</p>
                                            </div>
                                        </div>
                                        <div
                                            onClick={() => { navigator.clipboard.writeText(data[0].dmarc.record); alert('DMARC Record Copied!'); }}
                                            className="bg-[var(--bg-dark)]/[0.5] p-4 rounded-xl font-mono text-xs text-purple-400 border border-purple-500/20 cursor-pointer relative group"
                                        >
                                            {data[0].dmarc.record}
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-purple-500 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity">COPY</span>
                                        </div>
                                    </div>

                                    <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-xl bg-amber-500/20 text-amber-500">
                                                    <Shield size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-white">Spam Filter (SpamAssassin)</h3>
                                                    <p className="text-white/50 text-sm">Automated spam protection & filtering</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleUpdateSpamSettings(!data[0].spam.spam_enabled, data[0].spam.spam_score, data[0].spam.spam_marking_method)}
                                                className={`px-4 py-2 rounded-xl font-bold text-xs transition-colors ${data[0].spam.spam_enabled ? 'bg-amber-500 text-white' : 'bg-white/5 text-white/40'
                                                    }`}
                                            >
                                                {data[0].spam.spam_enabled ? 'ENABLED' : 'DISABLED'}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-[var(--bg-dark)] rounded-xl border border-white/5">
                                                <span className="text-[10px] font-black text-white/30 uppercase block mb-1">Sensitivity Score ({data[0].spam.spam_score})</span>
                                                <input
                                                    type="range" min="1" max="10" step="0.5"
                                                    value={data[0].spam.spam_score}
                                                    onChange={(e) => handleUpdateSpamSettings(data[0].spam.spam_enabled, parseFloat(e.target.value), data[0].spam.spam_marking_method)}
                                                    className="w-full accent-amber-500"
                                                />
                                            </div>
                                            <div className="p-4 bg-[var(--bg-dark)] rounded-xl border border-white/5">
                                                <span className="text-[10px] font-black text-white/30 uppercase block mb-1">Marking Method</span>
                                                <select
                                                    className="bg-transparent text-white/80 text-xs w-full focus:outline-none"
                                                    value={data[0].spam.spam_marking_method}
                                                    onChange={(e) => handleUpdateSpamSettings(data[0].spam.spam_enabled, data[0].spam.spam_score, e.target.value)}
                                                >
                                                    <option value="subject">Prefix [SPAM] to Subject</option>
                                                    <option value="header">Add X-Spam Headers Only</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 rounded-3xl bg-sky-500/10 border border-sky-500/20">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-xl bg-sky-500/20 text-sky-400">
                                                    <Globe size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-white">Webmail Client</h3>
                                                    <p className="text-white/50 text-sm">Roundcube Webmail Integration</p>
                                                </div>
                                            </div>
                                            {data[0].webmail.installed ? (
                                                <button
                                                    onClick={() => window.open(data[0].webmail.url, '_blank')}
                                                    className="px-4 py-2 rounded-xl bg-sky-500 text-white font-bold text-xs flex items-center gap-2"
                                                >
                                                    OPEN WEBMAIL <ExternalLink size={12} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleInstallWebmail}
                                                    className="px-6 py-2 rounded-xl bg-[var(--bg-dark)] text-white/60 hover:text-white border border-white/10 font-bold text-xs"
                                                >
                                                    INSTALL ROUNDCUBE
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-white/30 text-xs italic">
                                            {data[0].webmail.installed
                                                ? `Installed at ${data[0].webmail.url}`
                                                : "Professional webmail access via webmail.domain.com"}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-20 animate-pulse text-white/20">Generating Authentication Keys...</div>
                            )}
                        </div>
                    )}

                    {activeTab === 'logs' && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-white mb-4">Email Activity Logs</h3>
                            <div className="rounded-2xl border border-white/5 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-white/5">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-white/40 tracking-widest">Type</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-white/40 tracking-widest">Sender / Recipient</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-white/40 tracking-widest">Status</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-white/40 tracking-widest">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {data.map((log: any) => (
                                            <tr key={log.id} className="hover:bg-white/2 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-black border uppercase ${log.type === 'OUTGOING' ? 'text-blue-400 border-blue-400/20' : 'text-emerald-400 border-emerald-400/20'
                                                        }`}>
                                                        {log.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="text-white text-sm font-bold">{log.sender}</p>
                                                        <p className="text-white/30 text-[10px]">TO: {log.recipient}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[10px] font-black tracking-widest ${log.status === 'DELIVERED' ? 'text-emerald-500' : 'text-rose-500'
                                                        }`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-white/30 text-xs font-mono">
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {data.length === 0 && !loading && (
                                    <div className="text-center py-12 text-white/30 bg-white/2">No logs recorded yet.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'lists' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-white">Mailing Lists</h3>
                                <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 text-white font-bold text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all">
                                    <Plus size={16} /> New List
                                </button>
                            </div>

                            {showAddForm && (
                                <form onSubmit={handleCreateList} className="p-6 rounded-2xl bg-white/5 border border-white/10 animate-in slide-in-from-top-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div className="flex items-center gap-2 bg-[var(--bg-dark)] rounded-xl px-4 border border-white/10">
                                            <input autoFocus type="text" placeholder="list-name" className="flex-1 bg-transparent py-3 text-white focus:outline-none" value={newItem.name || ''} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                                            <span className="text-white/40">@{domain.domain}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
                                        <button type="submit" className="px-6 py-2 rounded-xl bg-indigo-500 text-white font-bold text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all">Create List</button>
                                    </div>
                                </form>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {data.map((list: any) => (
                                    <div key={list.id} className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-all group relative">
                                        <button
                                            onClick={() => handleDeleteList(list.id)}
                                            className="absolute top-4 right-4 p-2 rounded-lg bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="text-white font-bold">{list.name}</h4>
                                                <p className="text-xs text-white/40">{list.address}</p>
                                            </div>
                                            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                                                <Users size={16} />
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] font-black text-white/20 uppercase">
                                            <span>{list.subscribers || 0} Subscribers</span>
                                            <button
                                                onClick={async () => {
                                                    const email = prompt('Add subscriber email:');
                                                    if (email) {
                                                        try {
                                                            await axios.post(`/api/mail/lists/${list.id}/subscribers`, { email });
                                                            fetchData();
                                                        } catch (err) {
                                                            alert('Failed to add subscriber');
                                                        }
                                                    }
                                                }}
                                                className="text-indigo-500 hover:text-white transition-colors"
                                            >
                                                Manage Members
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {data.length === 0 && !loading && (
                                    <div className="text-center py-12 text-white/30 col-span-2">No mailing lists found.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManageEmailModal;
