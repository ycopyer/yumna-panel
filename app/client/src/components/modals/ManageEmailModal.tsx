import React, { useState, useEffect } from 'react';
import { X, Mail, Users, RefreshCw, Trash2, Plus, Shield, ShieldCheck, Key, Reply, AlertTriangle } from 'lucide-react';
import axios from 'axios';

interface ManageEmailModalProps {
    domain: any;
    onClose: () => void;
}

const ManageEmailModal: React.FC<ManageEmailModalProps> = ({ domain, onClose }) => {
    const [activeTab, setActiveTab] = useState<'accounts' | 'aliases' | 'autoresponders' | 'security'>('accounts');
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
                // Filter client side for now as the API returns all user's accounts
                // Ideally API should support ?domainId=X
                setData(res.data.filter((acc: any) => acc.domainId === domain.id));
            } else if (activeTab === 'aliases') {
                const res = await axios.get('/api/mail/aliases');
                setData(res.data.filter((alias: any) => alias.source.endsWith(`@${domain.domain}`)));
            } else if (activeTab === 'autoresponders') {
                // Autoresponders API is currently one-by-one by email, need a list endpoint or client side aggregation?
                // For now, let's just show a placeholder or mock fetch if API doesn't support list by domain
                // The backend doesn't have a 'list all autoresponders' route. 
                // We will skip fetching list for now and just show "Enter email to configure" UI.
                setData([]);
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

    // --- Delete Handlers ---
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

    // --- Create Handlers ---
    const handleCreateAutoresponder = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Check if email belongs to this domain
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

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade">
            {/* Same container structure... */}
            <div className="glass w-full max-w-4xl h-[80vh] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
                {/* Header and Tabs remain the same... */}
                <div className="p-8 border-b border-white/5 bg-gradient-to-r from-indigo-500/10 to-transparent flex justify-between items-start">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                            <Mail className="text-white" size={32} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tight">{domain.domain}</h2>
                            <p className="text-white/50 font-medium flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full bg-emerald-500`}></span>
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
                        { id: 'aliases', label: 'Aliases', icon: RefreshCw },
                        { id: 'autoresponders', label: 'Autoresponders', icon: Reply },
                        { id: 'security', label: 'Authentication', icon: ShieldCheck }
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
                                    {/* Account Form Fields */}
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
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-[var(--bg-dark)] flex items-center justify-center text-white/50">
                                                <Users size={20} />
                                            </div>
                                            <div>
                                                <p className="text-white font-bold">{acc.username}@{domain.domain}</p>
                                                <p className="text-xs text-white/40">Quota: {formatBytes(acc.quota_bytes)}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteAccount(acc.id)} className="p-2 text-white/40 hover:text-rose-500 transition-all hover:bg-rose-500/10 rounded-lg">
                                            <Trash2 size={18} />
                                        </button>
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
                                <h3 className="text-xl font-bold text-white">Email Aliases</h3>
                                <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 text-white font-bold text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all">
                                    <Plus size={16} /> New Alias
                                </button>
                            </div>

                            {showAddForm && (
                                <form onSubmit={handleCreateAlias} className="p-6 rounded-2xl bg-white/5 border border-white/10 animate-in slide-in-from-top-4">
                                    {/* Alias Form */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div className="flex items-center gap-2 bg-[var(--bg-dark)] rounded-xl px-4 border border-white/10">
                                            <span className="text-white/40 text-sm">Alias:</span>
                                            <input autoFocus type="text" placeholder="support" className="flex-1 bg-transparent py-3 text-white focus:outline-none" value={newItem.source || ''} onChange={e => setNewItem({ ...newItem, source: e.target.value })} />
                                            <span className="text-white/40">@{domain.domain}</span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-[var(--bg-dark)] rounded-xl px-4 border border-white/10">
                                            <span className="text-white/40 text-sm">Forward To:</span>
                                            <input type="email" placeholder="dest@example.com" className="flex-1 bg-transparent py-3 text-white focus:outline-none" value={newItem.destination || ''} onChange={e => setNewItem({ ...newItem, destination: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
                                        <button type="submit" className="px-6 py-2 rounded-xl bg-indigo-500 text-white font-bold text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all">Create Alias</button>
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
                                            <div className="flex items-center gap-3">
                                                <span className="text-white font-bold">{alias.source}</span>
                                                <span className="text-white/30">→</span>
                                                <span className="text-white/80 font-medium">{alias.destination}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteAlias(alias.id)} className="p-2 text-white/40 hover:text-rose-500 transition-all hover:bg-rose-500/10 rounded-lg">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                                {data.length === 0 && !loading && <div className="text-center py-12 text-white/30">No aliases configured.</div>}
                            </div>
                        </div>
                    )}

                    {activeTab === 'autoresponders' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-white">Autoresponders</h3>
                                <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 text-white font-bold text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all">
                                    <Plus size={16} /> New Autoresponder
                                </button>
                            </div>

                            {showAddForm && (
                                <form onSubmit={handleCreateAutoresponder} className="p-6 rounded-2xl bg-white/5 border border-white/10 animate-in slide-in-from-top-4">
                                    <div className="grid gap-4 mb-4">
                                        <div className="flex items-center gap-2 bg-[var(--bg-dark)] rounded-xl px-4 border border-white/10">
                                            <input autoFocus type="text" placeholder="username" className="flex-1 bg-transparent py-3 text-white focus:outline-none" value={newItem.email || ''} onChange={e => setNewItem({ ...newItem, email: e.target.value })} />
                                            <span className="text-white/40">@{domain.domain}</span>
                                        </div>
                                        <input type="text" placeholder="Subject" className="bg-[var(--bg-dark)] rounded-xl px-4 py-3 text-white border border-white/10 focus:outline-none" value={newItem.subject || ''} onChange={e => setNewItem({ ...newItem, subject: e.target.value })} />
                                        <textarea rows={4} placeholder="Message Body" className="bg-[var(--bg-dark)] rounded-xl px-4 py-3 text-white border border-white/10 focus:outline-none" value={newItem.body || ''} onChange={e => setNewItem({ ...newItem, body: e.target.value })} />
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
                                        <button type="submit" className="px-6 py-2 rounded-xl bg-indigo-500 text-white font-bold text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all">Save Autoresponder</button>
                                    </div>
                                </form>
                            )}

                            <div className="grid gap-3">
                                {data.map((ar: any) => (
                                    <div key={ar.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-[var(--bg-dark)] flex items-center justify-center text-white/50">
                                                <Reply size={20} />
                                            </div>
                                            <div>
                                                <p className="text-white font-bold">{ar.email}</p>
                                                <p className="text-xs text-white/40">Subject: {ar.subject}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteAutoresponder(ar.id)} className="p-2 text-white/40 hover:text-rose-500 transition-all hover:bg-rose-500/10 rounded-lg">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                                {data.length === 0 && !loading && <div className="text-center py-12 text-white/30">No autoresponders configured.</div>}
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
                                        <Key size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">DKIM Configuration</h3>
                                        <p className="text-white/50 text-sm">DomainKeys Identified Mail</p>
                                    </div>
                                </div>
                                <div className="bg-[var(--bg-dark)]/[0.5] p-4 rounded-xl font-mono text-xs text-emerald-400 break-all border border-emerald-500/20 relative group cursor-pointer hover:bg-[var(--bg-dark)] transition-colors">
                                    v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1...
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
                                <div className="bg-[var(--bg-dark)]/[0.5] p-4 rounded-xl font-mono text-xs text-blue-400 border border-blue-500/20">
                                    v=spf1 mx a include:_spf.yumnapanel.com ~all
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManageEmailModal;
