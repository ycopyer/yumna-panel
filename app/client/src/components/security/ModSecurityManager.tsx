import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Activity, Terminal, Save, RefreshCw, AlertTriangle, FileText, Settings } from 'lucide-react';
import axios from 'axios';

interface WAFStatus {
    enabled: string;
    configPath: string;
    logPath: string;
}

interface WAFRule {
    name: string;
    content: string;
}

interface WAFStats {
    total_blocks: number;
    sqli_blocks: number;
    xss_blocks: number;
    scanner_blocks: number;
    top_attackers: Record<string, number>;
}

const ModSecurityManager: React.FC = () => {
    const [status, setStatus] = useState<WAFStatus | null>(null);
    const [rules, setRules] = useState<WAFRule[]>([]);
    const [stats, setStats] = useState<WAFStats | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'logs' | 'settings'>('overview');
    const [loading, setLoading] = useState(true);
    const [selectedRule, setSelectedRule] = useState<WAFRule | null>(null);
    const [ruleContent, setRuleContent] = useState('');

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statusRes, statsRes] = await Promise.all([
                axios.get('/api/security/modsecurity/status'),
                axios.get('/api/security/modsecurity/stats')
            ]);
            setStatus(statusRes.data);
            setStats(statsRes.data);

            if (activeTab === 'rules') {
                const rulesRes = await axios.get('/api/security/modsecurity/rules');
                setRules(rulesRes.data);
            } else if (activeTab === 'logs') {
                const logsRes = await axios.get('/api/security/modsecurity/logs');
                setLogs(logsRes.data);
            }
        } catch (err) {
            console.error('Failed to fetch ModSecurity data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (newStatus: string) => {
        try {
            await axios.post('/api/security/modsecurity/status', { status: newStatus });
            fetchData();
        } catch (err) {
            alert('Failed to update WAF status');
        }
    };

    const handleSaveRule = async () => {
        if (!selectedRule) return;
        try {
            await axios.post('/api/security/modsecurity/rules', {
                name: selectedRule.name,
                content: ruleContent
            });
            alert('Rule saved successfully');
            fetchData();
        } catch (err) {
            alert('Failed to save rule');
        }
    };

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl ${status?.enabled === 'On' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        <Shield size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white">ModSecurity WAF</h1>
                        <p className="text-white/50">Web Application Firewall for global threat protection</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="flex rounded-xl bg-white/5 p-1 border border-white/10">
                        {['On', 'DetectionOnly', 'Off'].map((s) => (
                            <button
                                key={s}
                                onClick={() => handleUpdateStatus(s)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${status?.enabled === s
                                        ? 'bg-indigo-500 text-white shadow-lg'
                                        : 'text-white/40 hover:text-white'
                                    }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={fetchData}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10">
                {[
                    { id: 'overview', label: 'Overview', icon: Activity },
                    { id: 'rules', label: 'Security Rules', icon: ShieldCheck },
                    { id: 'logs', label: 'Audit Logs', icon: Terminal },
                    { id: 'settings', label: 'WAF Settings', icon: Settings }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold transition-all ${activeTab === tab.id
                                ? 'border-indigo-500 text-white'
                                : 'border-transparent text-white/40 hover:text-white'
                            }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="space-y-6">
                {activeTab === 'overview' && stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-3 mb-2">
                                <ShieldAlert className="text-rose-400" size={24} />
                                <span className="text-white/50 text-sm font-bold">Attacks Blocked</span>
                            </div>
                            <div className="text-3xl font-black text-white">{stats.total_blocks}</div>
                            <div className="text-xs text-white/30 mt-1">Global protection active</div>
                        </div>

                        <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-3 mb-2">
                                <Activity className="text-amber-400" size={24} />
                                <span className="text-white/50 text-sm font-bold">SQL Injection</span>
                            </div>
                            <div className="text-3xl font-black text-white">{stats.sqli_blocks}</div>
                            <div className="text-xs text-white/30 mt-1">Database threats</div>
                        </div>

                        <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-3 mb-2">
                                <ShieldCheck className="text-emerald-400" size={24} />
                                <span className="text-white/50 text-sm font-bold">WAF Status</span>
                            </div>
                            <div className={`text-3xl font-black ${status?.enabled === 'On' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {status?.enabled}
                            </div>
                            <div className="text-xs text-white/30 mt-1">Rule Engine</div>
                        </div>

                        <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-3 mb-2">
                                <Terminal className="text-indigo-400" size={24} />
                                <span className="text-white/50 text-sm font-bold">Recent Scans</span>
                            </div>
                            <div className="text-3xl font-black text-white">{stats.scanner_blocks}</div>
                            <div className="text-xs text-white/30 mt-1">Automated threats</div>
                        </div>

                        {/* Top Attackers */}
                        <div className="md:col-span-4 p-6 rounded-3xl bg-white/5 border border-white/10">
                            <h3 className="text-lg font-bold text-white mb-4">Top Blocked IP Addresses</h3>
                            <div className="space-y-2">
                                {Object.entries(stats.top_attackers).map(([ip, count]) => (
                                    <div key={ip} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                                        <div className="flex items-center gap-3">
                                            <AlertTriangle className="text-rose-400" size={16} />
                                            <span className="text-white font-mono">{ip}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold">
                                                {count} Blocks
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'rules' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white px-2">Rule Files</h3>
                            <div className="space-y-2">
                                {rules.map(rule => (
                                    <button
                                        key={rule.name}
                                        onClick={() => { setSelectedRule(rule); setRuleContent(rule.content); }}
                                        className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all ${selectedRule?.name === rule.name
                                                ? 'bg-indigo-500/10 border-indigo-500 text-white'
                                                : 'bg-white/5 border-transparent text-white/50 hover:bg-white/10 hover:text-white'
                                            }`}
                                    >
                                        <FileText size={18} />
                                        <span className="font-bold truncate">{rule.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="md:col-span-2 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-white">{selectedRule ? selectedRule.name : 'Select a rule file'}</h3>
                                {selectedRule && (
                                    <button
                                        onClick={handleSaveRule}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 text-white font-bold hover:brightness-110 transition-all"
                                    >
                                        <Save size={18} />
                                        Save Changes
                                    </button>
                                )}
                            </div>
                            <textarea
                                value={ruleContent}
                                onChange={(e) => setRuleContent(e.target.value)}
                                className="w-full h-[600px] p-6 rounded-3xl bg-black/40 border border-white/10 text-emerald-400 font-mono text-sm focus:outline-none focus:border-indigo-500/50 resize-none"
                                placeholder="Select a rule file to edit..."
                                disabled={!selectedRule}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-white">WAF Audit Logs</h3>
                        </div>
                        <div className="space-y-2 font-mono text-[13px]">
                            {logs.map((log, idx) => (
                                <div key={idx} className="p-3 rounded-xl bg-black/40 border border-white/5 text-emerald-400/80 break-words">
                                    {log}
                                </div>
                            ))}
                            {logs.length === 0 && (
                                <div className="text-center py-12 text-white/30">No logs found</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModSecurityManager;
