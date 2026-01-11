import React, { useState, useEffect } from 'react';
import { X, Globe, Plus, Trash2, RefreshCw, Loader2, Save, Cloud, Shield, Database, Activity, AlertTriangle, Settings } from 'lucide-react';
import axios from 'axios';

interface DNSManagementModalProps {
    zone: any;
    onClose: () => void;
    onRefresh: () => void;
}

const DNSManagementModal: React.FC<DNSManagementModalProps> = ({ zone, onClose, onRefresh }) => {
    const [activeTab, setActiveTab] = useState<'records' | 'settings' | 'cloudflare'>('records');
    const [loading, setLoading] = useState(false);
    const [records, setRecords] = useState<any[]>([]);
    const [isAdding, setIsAdding] = useState(false);

    // New Record State
    const [newRecord, setNewRecord] = useState({
        type: 'A',
        name: '',
        content: '',
        priority: 0,
        ttl: 3600
    });

    useEffect(() => {
        fetchRecords();
    }, [zone]);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/dns/${zone.id}/records`);
            setRecords(res.data);
        } catch (err) {
            console.error(err);
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
                                    <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">{records.length} ACTIVE RECORDS</span>
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-[9px] font-black text-green-500 uppercase">Synchronized</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex gap-2 mt-8">
                        {['records', 'settings', 'cloudflare'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all capitalize ${activeTab === tab ? 'bg-indigo-600 text-white' : 'text-white/40 hover:bg-white/5'}`}
                            >
                                {tab === 'records' && <Activity size={16} />}
                                {tab === 'settings' && <Settings size={16} />}
                                {tab === 'cloudflare' && <Cloud size={16} />}
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-black/20">

                    {activeTab === 'records' && (
                        <div className="space-y-6">

                            {/* Toolbar */}
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Resource Records</h4>
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
                                                className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 px-4 text-white font-bold text-xs focus:border-indigo-500 outline-none"
                                            />
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

                            {/* Record List */}
                            <div className="bg-white/5 rounded-[26px] border border-white/5 overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white/5 border-b border-white/5">
                                            <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest">Type</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest">Name</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest">Content</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest text-center">TTL</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {records.map(rec => (
                                            <tr key={rec.id} className="group hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${rec.type === 'A' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                        rec.type === 'CNAME' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                                            rec.type === 'MX' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                                'bg-white/10 text-white/60 border-white/10'
                                                        }`}>{rec.type}</span>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-xs text-indigo-300">{rec.name}.{zone.domain}</td>
                                                <td className="px-6 py-4 font-bold text-xs text-white/80 max-w-[200px] truncate">{rec.content}</td>
                                                <td className="px-6 py-4 text-center text-[10px] font-bold text-white/40">{rec.ttl}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => handleDeleteRecord(rec.id)} className="p-2 rounded-lg text-white/10 hover:text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
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
    );
};

export default DNSManagementModal;
