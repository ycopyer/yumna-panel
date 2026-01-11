import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Plus, Trash2, Globe, Zap, AlertTriangle, Loader2, Search, CheckCircle2, XCircle, Info, ShieldCheck, Timer, ShieldX, Code, X } from 'lucide-react';

interface WhitelistItem {
    id: number;
    ip: string;
    description: string;
    created_at: string;
}

interface GeoBlockItem {
    id: number;
    country_code: string;
    country_name: string;
    is_active: boolean;
    created_at: string;
}

interface RateLimitItem {
    id: number;
    ip: string;
    endpoint: string;
    max_requests: number;
    window_seconds: number;
    is_active: boolean;
}

interface ThreatLog {
    id: number;
    ip: string;
    threat_type: string;
    severity: string;
    score: number;
    details: string;
    request_path: string;
    request_method: string;
    created_at: string;
}

interface ReputationItem {
    ip: string;
    behavioral_score: number;
    total_violations: number;
    risk_level: string;
    last_violation_at: string;
}

interface SecurityPattern {
    id: number;
    type: 'sqli' | 'xss' | 'bot';
    pattern: string;
    description: string;
    isActive: boolean;
    createdAt: string;
}

interface AdvancedFirewallTabsProps {
    initialSubTab?: 'whitelist' | 'geoblock' | 'ratelimit' | 'threats' | 'patterns';
}

const AdvancedFirewallTabs: React.FC<AdvancedFirewallTabsProps> = ({ initialSubTab = 'whitelist' }) => {
    const [subTab, setSubTab] = useState<'whitelist' | 'geoblock' | 'ratelimit' | 'threats' | 'patterns'>(initialSubTab);
    const [whitelist, setWhitelist] = useState<WhitelistItem[]>([]);
    const [geoblocks, setGeoblocks] = useState<GeoBlockItem[]>([]);
    const [ratelimits, setRatelimits] = useState<RateLimitItem[]>([]);
    const [threats, setThreats] = useState<ThreatLog[]>([]);
    const [reputations, setReputations] = useState<ReputationItem[]>([]);
    const [patterns, setPatterns] = useState<SecurityPattern[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form states
    const [newIP, setNewIP] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newCountryCode, setNewCountryCode] = useState('');
    const [newCountryName, setNewCountryName] = useState('');
    const [newLimit, setNewLimit] = useState(60);
    const [newWindow, setNewWindow] = useState(60);
    const [newEndpoint, setNewEndpoint] = useState('*');

    // Pattern Form
    const [newPatternType, setNewPatternType] = useState('sqli');
    const [newPatternRegex, setNewPatternRegex] = useState('');
    const [newPatternDesc, setNewPatternDesc] = useState('');
    const [patternSearch, setPatternSearch] = useState('');

    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        fetchData();
    }, [subTab]);

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            if (subTab === 'whitelist') {
                const res = await axios.get('/api/whitelist');
                setWhitelist(res.data);
            } else if (subTab === 'geoblock') {
                const res = await axios.get('/api/geoblock');
                setGeoblocks(res.data);
            } else if (subTab === 'ratelimit') {
                const res = await axios.get('/api/ratelimit');
                setRatelimits(res.data);
            } else if (subTab === 'threats') {
                const [threatRes, repoRes] = await Promise.all([
                    axios.get('/api/security/threats'),
                    axios.get('/api/security/reputation-stats')
                ]);
                setThreats(threatRes.data);
                setReputations(repoRes.data);
            } else if (subTab === 'patterns') {
                const res = await axios.get('/api/firewall/security-patterns');
                setPatterns(res.data);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleAddWhitelist = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post('/api/whitelist', { ip: newIP, description: newDesc });
            setNewIP('');
            setNewDesc('');
            setShowForm(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to add IP');
        }
    };

    const handleDeleteWhitelist = async (id: number) => {
        if (!window.confirm('Remove from whitelist?')) return;
        try {
            await axios.delete(`/api/whitelist/${id}`);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to delete');
        }
    };

    const handleAddGeoBlock = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post('/api/geoblock', { country_code: newCountryCode, country_name: newCountryName });
            setNewCountryCode('');
            setNewCountryName('');
            setShowForm(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to block country');
        }
    };

    const handleDeleteGeoBlock = async (id: number) => {
        if (!window.confirm('Unblock this country?')) return;
        try {
            await axios.delete(`/api/geoblock/${id}`);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to delete');
        }
    };

    const handleToggleGeoBlock = async (id: number, active: boolean) => {
        try {
            await axios.patch(`/api/geoblock/${id}`, { is_active: !active });
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to update');
        }
    };

    const handleAddRateLimit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post('/api/ratelimit', {
                ip: newIP,
                endpoint: newEndpoint,
                max_requests: newLimit,
                window_seconds: newWindow
            });
            setNewIP('');
            setShowForm(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to add rule');
        }
    };

    const handleAddPattern = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post('/api/firewall/security-patterns', {
                type: newPatternType,
                pattern: newPatternRegex,
                description: newPatternDesc,
                isActive: true
            });
            setNewPatternRegex('');
            setNewPatternDesc('');
            setShowForm(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to add pattern');
        }
    };

    const handleDeletePattern = async (id: number) => {
        if (!window.confirm('Delete this security pattern?')) return;
        try {
            await axios.delete(`/api/firewall/security-patterns/${id}`);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to delete pattern');
        }
    };

    const handleTogglePattern = async (pattern: SecurityPattern) => {
        try {
            await axios.put(`/api/firewall/security-patterns/${pattern.id}`, {
                ...pattern,
                isActive: !pattern.isActive
            });
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to update pattern');
        }
    };

    const getSeverityStyle = (severity: string) => {
        switch (severity.toLowerCase()) {
            case 'critical': return 'text-red-600 bg-red-100 border-red-200';
            case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
            case 'medium': return 'text-amber-600 bg-amber-100 border-amber-200';
            default: return 'text-blue-600 bg-blue-100 border-blue-200';
        }
    };

    return (
        <div className="space-y-6">
            {/* Sub-tabs */}
            <div className="flex bg-[var(--nav-hover)]/30 backdrop-blur-md p-1.5 rounded-2xl border border-[var(--border)] max-w-fit overflow-x-auto">
                {[
                    { id: 'whitelist', label: 'Whitelist', icon: ShieldCheck },
                    { id: 'geoblock', label: 'Geo-Blocking', icon: Globe },
                    { id: 'ratelimit', label: 'Rate Limiting', icon: Zap },
                    { id: 'patterns', label: 'Security Patterns', icon: Code },
                    { id: 'threats', label: 'Threat Detection', icon: AlertTriangle }
                ].map(item => (
                    <button
                        key={item.id}
                        onClick={() => { setSubTab(item.id as any); setShowForm(false); }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${subTab === item.id ? 'bg-[var(--primary)] text-white shadow-lg shadow-indigo-500/20' : 'text-[var(--text-muted)] hover:bg-[var(--nav-hover)] hover:text-[var(--text-main)]'}`}
                    >
                        <item.icon size={16} />
                        <span className="text-xs uppercase tracking-wider">{item.label}</span>
                    </button>
                ))}
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in duration-300">
                    <AlertTriangle size={20} />
                    <p className="text-sm font-bold">{error}</p>
                </div>
            )}

            {/* Content Area */}
            <div className="flex flex-col min-h-[400px]">
                <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                    <div className="flex-1 min-w-[300px]">
                        <h4 className="text-lg font-black text-[var(--text-main)]">
                            {subTab === 'whitelist' && 'Trusted IP Whitelist'}
                            {subTab === 'geoblock' && 'Country Geo-Blocking'}
                            {subTab === 'ratelimit' && 'Per-IP Rate Limiting'}
                            {subTab === 'patterns' && 'Security Pattern Management'}
                            {subTab === 'threats' && 'Zero-Day Heuristics & Behavioral Scoring'}
                        </h4>
                        <p className="text-xs text-[var(--text-muted)] font-medium mt-1">
                            {subTab === 'whitelist' && 'IPs listed here will bypass all security checks and auto-blocking.'}
                            {subTab === 'geoblock' && 'Block entire countries from accessing the system by their country code.'}
                            {subTab === 'ratelimit' && 'Set custom API request limits for specific IP addresses.'}
                            {subTab === 'patterns' && 'Manage Regex patterns for SQLi, XSS, and Bot detection.'}
                            {subTab === 'threats' && 'Proactive detection of shell payloads, obfuscated JS, and suspicious behavior.'}
                        </p>
                    </div>
                    {subTab !== 'threats' && (
                        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center mb-6">
                            <button
                                onClick={() => setShowForm(!showForm)}
                                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all active:scale-95 whitespace-nowrap shrink-0 ${showForm ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-[var(--primary)] text-white shadow-lg shadow-indigo-500/20'}`}
                            >
                                {showForm ? (
                                    <><X size={18} /> Cancel</>
                                ) : (
                                    <><Plus size={18} /> {subTab === 'patterns' ? 'Add Pattern' : 'Add Rule'}</>
                                )}
                            </button>

                            {/* Search Bar (Only for Patterns Tab) */}
                            {subTab === 'patterns' && (
                                <div className="relative flex-1 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                                    <input
                                        type="text"
                                        className="input-glass w-full pl-12 pr-4 py-3 rounded-xl text-sm border border-[var(--border)] focus:border-[var(--primary)] transition-all"
                                        placeholder="Search patterns, types, or descriptions..."
                                        value={patternSearch}
                                        onChange={e => setPatternSearch(e.target.value)}
                                        autoFocus={patterns.length > 5}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    {subTab === 'threats' && (
                        <div className="flex items-center gap-4">
                            <div className="bg-emerald-500/20 text-emerald-500 px-4 py-2 rounded-xl border border-emerald-500/30 flex items-center gap-2">
                                <ShieldCheck size={16} />
                                <span className="text-xs font-black uppercase">Heuristics Engine Online</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1">
                    {showForm && (
                        <div className="p-6 bg-[var(--nav-hover)]/30 border border-[var(--border)] rounded-2xl animate-in slide-in-from-top-4 duration-300">
                            {subTab === 'whitelist' && (
                                <form onSubmit={handleAddWhitelist} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">IP Address</label>
                                        <input type="text" value={newIP} onChange={e => setNewIP(e.target.value)} className="input-glass w-full h-11 px-4 rounded-xl text-sm" placeholder="e.g. 1.2.3.4" required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Description</label>
                                        <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="input-glass w-full h-11 px-4 rounded-xl text-sm" placeholder="e.g. Office IP" />
                                    </div>
                                    <button type="submit" className="bg-[var(--primary)] text-white h-11 px-8 rounded-xl font-black shadow-lg">Save IP</button>
                                </form>
                            )}
                            {subTab === 'geoblock' && (
                                <form onSubmit={handleAddGeoBlock} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Country Code (2-char)</label>
                                        <input type="text" maxLength={2} value={newCountryCode} onChange={e => setNewCountryCode(e.target.value.toUpperCase())} className="input-glass w-full h-11 px-4 rounded-xl text-sm" placeholder="e.g. CN" required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Country Name</label>
                                        <input type="text" value={newCountryName} onChange={e => setNewCountryName(e.target.value)} className="input-glass w-full h-11 px-4 rounded-xl text-sm" placeholder="e.g. China" required />
                                    </div>
                                    <button type="submit" className="bg-red-500 text-white h-11 px-8 rounded-xl font-black shadow-lg">Block Country</button>
                                </form>
                            )}
                            {subTab === 'ratelimit' && (
                                <form onSubmit={handleAddRateLimit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">IP Address</label>
                                        <input type="text" value={newIP} onChange={e => setNewIP(e.target.value)} className="input-glass w-full h-11 px-4 rounded-xl text-sm" placeholder="e.g. 1.2.3.4" required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Endpoint</label>
                                        <input type="text" value={newEndpoint} onChange={e => setNewEndpoint(e.target.value)} className="input-glass w-full h-11 px-4 rounded-xl text-sm" placeholder="e.g. *" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Max Req</label>
                                        <input type="number" value={newLimit} onChange={e => setNewLimit(parseInt(e.target.value))} className="input-glass w-full h-11 px-4 rounded-xl text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Window (s)</label>
                                        <input type="number" value={newWindow} onChange={e => setNewWindow(parseInt(e.target.value))} className="input-glass w-full h-11 px-4 rounded-xl text-sm" />
                                    </div>
                                    <button type="submit" className="bg-[var(--primary)] text-white h-11 px-4 rounded-xl font-black shadow-lg">Set Limit</button>
                                </form>
                            )}
                            {subTab === 'patterns' && (
                                <form onSubmit={handleAddPattern} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Type</label>
                                        <select value={newPatternType} onChange={e => setNewPatternType(e.target.value)} className="input-glass w-full h-11 px-4 rounded-xl text-sm bg-[var(--nav-hover)]">
                                            <option value="sqli">SQL Injection</option>
                                            <option value="xss">XSS</option>
                                            <option value="bot">Malicious Bot</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Regex Pattern (<span className="text-red-500">Caution</span>)</label>
                                        <input type="text" value={newPatternRegex} onChange={e => setNewPatternRegex(e.target.value)} className="input-glass w-full h-11 px-4 rounded-xl text-sm font-mono" placeholder="e.g. \b(UNION|SELECT)\b" required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Description</label>
                                        <input type="text" value={newPatternDesc} onChange={e => setNewPatternDesc(e.target.value)} className="input-glass w-full h-11 px-4 rounded-xl text-sm" placeholder="Short description" required />
                                    </div>
                                    <div className="md:col-span-full flex justify-end">
                                        <button type="submit" className="bg-[var(--primary)] text-white h-11 px-8 rounded-xl font-black shadow-lg">Add Pattern</button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}


                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="animate-spin text-[var(--primary)]" size={40} />
                        </div>
                    ) : (
                        <>
                            {subTab === 'threats' ? (
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    {/* Behavioral Scoring Section */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <Shield className="text-[var(--primary)]" size={18} />
                                            <h5 className="font-black text-sm uppercase tracking-widest text-[var(--text-main)]">IP Reputation & Behavioral Scoring</h5>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {reputations.map((repo, i) => (
                                                <div key={i} className="p-4 bg-[var(--nav-hover)] border border-[var(--border)] rounded-2xl flex flex-col gap-2">
                                                    <div className="flex justify-between items-start">
                                                        <p className="font-black text-[var(--text-main)]">{repo.ip}</p>
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${repo.risk_level === 'Critical' ? 'bg-red-500/20 text-red-500 border-red-500/30' : repo.risk_level === 'High' ? 'bg-orange-500/20 text-orange-500 border-orange-500/30' : 'bg-green-500/20 text-emerald-500 border-emerald-500/30'}`}>
                                                            {repo.risk_level}
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 space-y-3">
                                                        <div>
                                                            <div className="flex justify-between text-[10px] font-bold text-[var(--text-muted)] mb-1">
                                                                <span>RISK SCORE</span>
                                                                <span>{repo.behavioral_score}/200</span>
                                                            </div>
                                                            <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                                                                <div className={`h-full transition-all ${repo.behavioral_score > 100 ? 'bg-red-500' : repo.behavioral_score > 50 ? 'bg-orange-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (repo.behavioral_score / 200) * 100)}%` }} />
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[11px]">
                                                            <span className="text-[var(--text-muted)]">Violations</span>
                                                            <span className="font-black text-[var(--text-main)]">{repo.total_violations}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {reputations.length === 0 && (
                                                <div className="col-span-full p-8 text-center bg-[var(--nav-hover)]/30 border border-dashed border-[var(--border)] rounded-2xl opacity-50">
                                                    <p className="text-sm font-bold">All client behaviors are within safe parameters.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Threat Log Section */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <Zap className="text-amber-500" size={18} />
                                            <h5 className="font-black text-sm uppercase tracking-widest text-[var(--text-main)]">Zero-Day Heuristics Log</h5>
                                        </div>
                                        <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--nav-hover)]">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-black/20 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                                        <th className="px-6 py-4">Timestamp</th>
                                                        <th className="px-6 py-4">Origin IP</th>
                                                        <th className="px-6 py-4">Threat Intel</th>
                                                        <th className="px-6 py-4 text-center">Severity</th>
                                                        <th className="px-6 py-4 text-right">Score</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-[13px]">
                                                    {threats.map((threat, idx) => (
                                                        <tr key={idx} className="border-t border-[var(--border)] group hover:bg-white/5 transition-colors">
                                                            <td className="px-6 py-4 text-[var(--text-muted)] font-medium">
                                                                {new Date(threat.created_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: 'short' })}
                                                            </td>
                                                            <td className="px-6 py-4 font-black text-[var(--text-main)]">
                                                                {threat.ip}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-[var(--text-main)]">{threat.threat_type}</span>
                                                                    <span className="text-[10px] text-[var(--text-muted)] font-mono">{threat.request_method} {threat.request_path}</span>
                                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                                        {JSON.parse(threat.details).map((f: any, i: number) => (
                                                                            <span key={i} className="text-[9px] bg-black/30 px-1.5 py-0.5 rounded text-amber-500 font-bold border border-amber-500/20">{f.type}</span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className={`text-[10px] font-black px-2 py-1 rounded border uppercase ${getSeverityStyle(threat.severity)}`}>
                                                                    {threat.severity}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <span className="font-black text-lg text-[var(--text-main)] italic">{threat.score}</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {threats.length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className="px-6 py-20 text-center opacity-40 font-bold">No security events triggered. Engine is analyzing traffic...</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {/* Whitelist Cards */}
                                    {subTab === 'whitelist' && whitelist.map(item => (
                                        <div key={item.id} className="group p-4 bg-[var(--nav-hover)] border border-[var(--border)] rounded-2xl hover:border-[var(--primary)]/30 transition-all flex items-start justify-between">
                                            <div className="flex gap-3">
                                                <div className="p-2 bg-green-500/10 text-green-500 rounded-xl"><ShieldCheck size={18} /></div>
                                                <div>
                                                    <p className="font-black text-[var(--text-main)]">{item.ip}</p>
                                                    <p className="text-[10px] text-[var(--text-muted)] font-medium">{item.description || 'No description'}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => handleDeleteWhitelist(item.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg group-hover:opacity-100 opacity-0 transition-opacity"><Trash2 size={16} /></button>
                                        </div>
                                    ))}

                                    {/* GeoBlock Cards */}
                                    {subTab === 'geoblock' && geoblocks.map(item => (
                                        <div key={item.id} className="group p-4 bg-[var(--nav-hover)] border border-[var(--border)] rounded-2xl flex items-start justify-between">
                                            <div className="flex gap-3">
                                                <div className={`p-2 rounded-xl ${item.is_active ? 'bg-red-500/10 text-red-500' : 'bg-gray-500/10 text-gray-500'}`}>
                                                    <Globe size={18} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-black text-[var(--text-main)]">{item.country_name}</p>
                                                        <span className="text-[10px] font-black bg-black/20 px-1.5 py-0.5 rounded text-[var(--primary)]">{item.country_code}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleToggleGeoBlock(item.id, item.is_active)}
                                                        className={`text-[10px] font-black uppercase tracking-widest mt-1 ${item.is_active ? 'text-red-500' : 'text-gray-500'}`}
                                                    >
                                                        {item.is_active ? 'STATUS: ACTIVE' : 'STATUS: DISABLED'}
                                                    </button>
                                                </div>
                                            </div>
                                            <button onClick={() => handleDeleteGeoBlock(item.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg group-hover:opacity-100 opacity-0 transition-opacity"><Trash2 size={16} /></button>
                                        </div>
                                    ))}

                                    {/* Rate Limit Cards */}
                                    {subTab === 'ratelimit' && ratelimits.map(item => (
                                        <div key={item.id} className="group p-4 bg-[var(--nav-hover)] border border-[var(--border)] rounded-2xl">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex gap-3">
                                                    <div className="p-2 bg-[var(--primary)]/10 text-[var(--primary)] rounded-xl"><Zap size={18} /></div>
                                                    <div>
                                                        <p className="font-black text-[var(--text-main)]">{item.ip}</p>
                                                        <p className="text-[10px] text-[var(--text-muted)] font-mono">{item.endpoint}</p>
                                                    </div>
                                                </div>
                                                <button className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg group-hover:opacity-100 opacity-0 transition-opacity"><Trash2 size={16} /></button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                <div className="bg-black/20 p-2 rounded-xl text-center">
                                                    <p className="text-[10px] text-[var(--text-muted)] font-black uppercase">Quota</p>
                                                    <p className="text-sm font-black text-[var(--text-main)]">{item.max_requests}</p>
                                                </div>
                                                <div className="bg-black/20 p-2 rounded-xl text-center">
                                                    <p className="text-[10px] text-[var(--text-muted)] font-black uppercase">Window</p>
                                                    <p className="text-sm font-black text-[var(--text-main)]">{item.window_seconds}s</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {/* Security Patterns List (Table View) */}
                                    {subTab === 'patterns' && (
                                        <div className="col-span-full overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--nav-hover)] -mx-4 md:-mx-6">
                                            <table className="w-full text-left border-collapse table-auto">
                                                <thead>
                                                    <tr className="bg-black/20 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                                        <th className="px-3 py-3 w-[10%]">Type</th>
                                                        <th className="px-3 py-3 w-[20%]">Regex Pattern</th>
                                                        <th className="px-3 py-3 w-[50%]">Description</th>
                                                        <th className="px-3 py-3 w-[10%] text-center">Status</th>
                                                        <th className="px-3 py-3 w-[10%] text-center">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-sm">
                                                    {patterns
                                                        .filter(p =>
                                                            p.pattern.toLowerCase().includes(patternSearch.toLowerCase()) ||
                                                            p.description.toLowerCase().includes(patternSearch.toLowerCase()) ||
                                                            p.type.toLowerCase().includes(patternSearch.toLowerCase())
                                                        )
                                                        .map(item => (
                                                            <tr key={item.id} className={`border-t border-[var(--border)] group hover:bg-white/5 transition-colors ${!item.isActive && 'opacity-60 bg-gray-500/5'}`}>
                                                                <td className="px-3 py-3 align-top">
                                                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase border ${item.type === 'sqli' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                                        item.type === 'xss' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                                                                            'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                                        }`}>
                                                                        {item.type}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-3 font-mono text-[10px] text-[var(--text-muted)] break-all align-top leading-tight border-r border-[#ffffff05]" title={item.pattern}>
                                                                    {item.pattern}
                                                                </td>
                                                                <td className="px-3 py-3 text-xs font-bold text-[var(--text-main)] align-top break-words leading-relaxed">
                                                                    {item.description}
                                                                </td>
                                                                <td className="px-3 py-3 text-center align-top">
                                                                    <button
                                                                        onClick={() => handleTogglePattern(item)}
                                                                        className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border transition-all ${item.isActive ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20' : 'bg-gray-500/10 text-gray-500 border-gray-500/20 hover:bg-gray-500/20'}`}
                                                                    >
                                                                        {item.isActive ? 'Active' : 'Disabled'}
                                                                    </button>
                                                                </td>
                                                                <td className="px-3 py-3 text-center align-top">
                                                                    <button
                                                                        onClick={() => handleDeletePattern(item.id)}
                                                                        className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                                        title="Delete Pattern"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {!loading && (
                        (subTab === 'whitelist' && whitelist.length === 0) ||
                        (subTab === 'geoblock' && geoblocks.length === 0) ||
                        (subTab === 'ratelimit' && ratelimits.length === 0) ||
                        (subTab === 'patterns' && patterns.length === 0)
                    ) && (
                            <div className="flex flex-col items-center justify-center py-20 opacity-30">
                                <Shield size={64} />
                                <p className="font-bold mt-4">No custom rules defined</p>
                            </div>
                        )}
                </div>
            </div>
        </div>
    );
};

export default AdvancedFirewallTabs;
