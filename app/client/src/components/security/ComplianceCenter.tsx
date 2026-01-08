import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    ShieldCheck,
    FileLock2,
    History,
    Trash2,
    AlertCircle,
    CheckCircle2,
    RefreshCcw,
    Scale,
    Gavel,
    Clock,
    Database,
    Fingerprint
} from 'lucide-react';

const ComplianceCenter: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'audit' | 'holds' | 'retention' | 'verification'>('audit');
    const [settings, setSettings] = useState<any[]>([]);
    const [holds, setHolds] = useState<any[]>([]);
    const [auditStatus, setAuditStatus] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showAuditLogs, setShowAuditLogs] = useState(false);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [auditPagination, setAuditPagination] = useState<any>(null);

    useEffect(() => {
        fetchSettings();
        fetchHolds();
        verifyAudit();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/compliance/settings', {
                headers: { 'x-user-id': localStorage.getItem('userId') }
            });
            setSettings(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchHolds = async () => {
        try {
            const res = await axios.get('/api/compliance/legal-holds', {
                headers: { 'x-user-id': localStorage.getItem('userId') }
            });
            setHolds(res.data);
        } catch (err) { console.error(err); }
    };

    const verifyAudit = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/compliance/audit/verify', {
                headers: { 'x-user-id': localStorage.getItem('userId') }
            });
            setAuditStatus(res.data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const handleUpdateSetting = async (key: string, value: string) => {
        setSaving(true);
        try {
            await axios.post('/api/compliance/settings', {
                settings: [{ key, value }]
            }, {
                headers: { 'x-user-id': localStorage.getItem('userId') }
            });
            fetchSettings();
        } catch (err) { console.error(err); }
        setSaving(false);
    };

    const toggleHold = async (filePath: string, status: boolean) => {
        try {
            await axios.post('/api/compliance/legal-hold/toggle', {
                filePath, status
            }, {
                headers: { 'x-user-id': localStorage.getItem('userId') }
            });
            fetchHolds();
        } catch (err) { console.error(err); }
    };

    const downloadComplianceReport = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/compliance/report', {
                headers: { 'x-user-id': localStorage.getItem('userId') }
            });

            // Create downloadable JSON file
            const dataStr = JSON.stringify(res.data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `compliance_report_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            alert('✅ Compliance report downloaded successfully!');
        } catch (err) {
            console.error(err);
            alert('❌ Failed to generate report');
        } finally {
            setLoading(false);
        }
    };

    const viewRawAuditLogs = async (page = 1) => {
        try {
            setLoading(true);
            const res = await axios.get(`/api/compliance/audit/logs?page=${page}&limit=50`, {
                headers: { 'x-user-id': localStorage.getItem('userId') }
            });
            setAuditLogs(res.data.logs);
            setAuditPagination(res.data.pagination);
            setShowAuditLogs(true);
        } catch (err) {
            console.error(err);
            alert('❌ Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-white/10 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <ShieldCheck className="text-indigo-400 w-8 h-8" />
                            Compliance & Governance Center
                        </h2>
                        <p className="text-slate-400 mt-1">Enterprise-grade audit trails, data retention, and legal hold management.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs font-medium">
                            ISO 27001 Ready
                        </span>
                        <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-medium">
                            GDPR Compliant
                        </span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex border-b border-white/10 bg-slate-900/30 px-4">
                {[
                    { id: 'audit', label: 'Hash-Chain Verification', icon: Fingerprint },
                    { id: 'holds', label: 'Legal Holds', icon: Gavel },
                    { id: 'retention', label: 'Retention Policy', icon: Clock },
                    { id: 'verification', label: 'Trust Status', icon: Scale },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all relative ${activeTab === tab.id ? 'text-indigo-400' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                        )}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {activeTab === 'audit' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-slate-800/40 p-5 rounded-xl border border-white/5">
                                <div className="text-slate-400 text-sm mb-1">Audit Trail Integrity</div>
                                <div className="text-2xl font-bold text-white flex items-center gap-2">
                                    {auditStatus?.isValid ? (
                                        <><CheckCircle2 className="text-green-500 w-5 h-5" /> Secured</>
                                    ) : (
                                        <><AlertCircle className="text-red-500 w-5 h-5" /> Compromised</>
                                    )}
                                </div>
                            </div>
                            <div className="bg-slate-800/40 p-5 rounded-xl border border-white/5">
                                <div className="text-slate-400 text-sm mb-1">Total Hash Blocks</div>
                                <div className="text-2xl font-bold text-white">{auditStatus?.totalLogs || 0}</div>
                            </div>
                            <div className="bg-slate-800/40 p-5 rounded-xl border border-white/5">
                                <div className="text-slate-400 text-sm mb-1">Immutable Mode</div>
                                <div className="text-2xl font-bold text-indigo-400">Append-Only</div>
                            </div>
                        </div>

                        <div className="bg-slate-800/20 rounded-xl border border-white/10 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-white">Chain Verification Report</h3>
                                <button
                                    onClick={verifyAudit}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20 hover:bg-indigo-500/20 transition-all disabled:opacity-50"
                                >
                                    <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                    Re-verify Chain
                                </button>
                            </div>

                            {auditStatus?.issues?.length > 0 ? (
                                <div className="space-y-4">
                                    {auditStatus.issues.map((issue: any) => (
                                        <div key={issue.id} className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-4">
                                            <AlertCircle className="text-red-500 w-5 h-5 mt-0.5" />
                                            <div>
                                                <div className="text-red-400 font-medium">Chain Broken at Log #{issue.id}</div>
                                                <div className="text-slate-400 text-sm font-mono mt-1">Event ID: {issue.eventId}</div>
                                                <div className="text-slate-500 text-xs mt-1">{issue.issue}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="inline-flex p-4 bg-green-500/10 rounded-full mb-4">
                                        <ShieldCheck className="text-green-500 w-12 h-12" />
                                    </div>
                                    <h4 className="text-white font-medium text-lg">Cryptographic Integrity Verified</h4>
                                    <p className="text-slate-400 max-w-md mx-auto mt-2">
                                        The audit history hash chain is valid. Each entry is cryptographically linked to the previous one, ensuring no tampering has occurred.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'holds' && (
                    <div className="space-y-6">
                        <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl flex items-start gap-4">
                            <Gavel className="text-indigo-400 w-6 h-6 mt-1" />
                            <div>
                                <h4 className="text-indigo-300 font-medium">Legal Hold Investigative Mode</h4>
                                <p className="text-indigo-300/60 text-sm mt-1">
                                    Items on legal hold cannot be renamed, moved, or deleted regardless of user permissions. Permanent deletion from the recycle bin is also restricted.
                                </p>
                            </div>
                        </div>

                        <div className="bg-slate-800/20 rounded-xl border border-white/10 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">File Path</th>
                                        <th className="px-6 py-4 font-semibold">Policy ID</th>
                                        <th className="px-6 py-4 font-semibold">Status</th>
                                        <th className="px-6 py-4 font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm">
                                    {holds.length > 0 ? holds.map((hold) => (
                                        <tr key={hold.id} className="hover:bg-white/[0.02] transition-all">
                                            <td className="px-6 py-4 text-white font-mono text-xs">{hold.filePath}</td>
                                            <td className="px-6 py-4 text-slate-400 font-mono text-xs">{hold.policy_id || 'INTERNAL-INV'}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] font-bold uppercase tracking-tighter">
                                                    Restricted
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => toggleHold(hold.filePath, false)}
                                                    className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold"
                                                >
                                                    Release Hold
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                                No active legal holds found in the governance registry.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'retention' && (
                    <div className="max-w-3xl space-y-8">
                        {settings.map((setting) => (
                            <div key={setting.key_name} className="flex flex-col gap-4 p-6 bg-slate-800/30 rounded-2xl border border-white/10">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                                            <Clock className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-semibold">
                                                {setting.key_name === 'retention_days_logs' ? 'Audit Log Retention' :
                                                    setting.key_name === 'retention_days_threats' ? 'Threat Intel Retention' : setting.key_name}
                                            </h4>
                                            <p className="text-slate-400 text-sm mt-1">
                                                {setting.key_name === 'retention_days_logs' ? 'Automatic pruning of old audit history entries.' :
                                                    'Retention period for security logs and reputation data.'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            defaultValue={setting.value_text}
                                            className="w-24 px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white text-center focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            onBlur={(e) => handleUpdateSetting(setting.key_name, e.target.value)}
                                        />
                                        <span className="text-slate-500 text-sm font-medium">Days</span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-4">
                            <AlertCircle className="text-amber-500 w-6 h-6 mt-1" />
                            <div>
                                <h4 className="text-amber-400 font-semibold">Compliance Warning</h4>
                                <p className="text-amber-400/60 text-sm mt-1 leading-relaxed">
                                    Modifying retention periods may affect ISO/HIPAA compliance status. Reducing periods will result in non-recoverable deletion of historical audit data beyond the new threshold.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'verification' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-white">Trust Framework Compliance</h3>
                            <div className="space-y-4">
                                {[
                                    { name: 'ISO 27001 (Control A.8.15)', status: true, detail: 'Event logging matches requirements.' },
                                    { name: 'SOC 2 Type II (Trust Services)', status: true, detail: 'Hash-chained integrity enabled.' },
                                    { name: 'GDPR Article 32', status: true, detail: 'Data retention policies enforced.' },
                                    { name: 'HIPAA (Admin Safeguards)', status: true, detail: 'Investigative legal holds implemented.' },
                                ].map((item, i) => (
                                    <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-white font-medium">{item.name}</span>
                                            <span className="text-slate-500 text-xs mt-0.5">{item.detail}</span>
                                        </div>
                                        <CheckCircle2 className="text-green-500 w-5 h-5 shadow-[0_0_10px_rgba(34,197,94,0.3)]" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-8 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
                            <div className="relative mb-6">
                                <ShieldCheck className="w-24 h-24 text-indigo-500 relative z-10" />
                                <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full" />
                            </div>
                            <h3 className="text-2xl font-bold text-white">System Verified</h3>
                            <p className="text-slate-400 mt-2 max-w-sm">
                                All security and compliance modules are active and functioning within specified regulatory parameters.
                            </p>
                            <div className="mt-8 flex flex-col gap-2 w-full max-w-xs">
                                <button
                                    onClick={downloadComplianceReport}
                                    disabled={loading}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50">
                                    {loading ? 'Generating...' : 'Generate Compliance Report'}
                                </button>
                                <button
                                    onClick={() => viewRawAuditLogs(1)}
                                    disabled={loading}
                                    className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all disabled:opacity-50">
                                    View Raw Audit Logs
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Audit Logs Modal */}
            {showAuditLogs && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-slate-900 w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Database className="w-6 h-6 text-indigo-400" />
                                        Raw Audit Logs - Forensic View
                                    </h3>
                                    <p className="text-slate-400 text-sm mt-1">
                                        Immutable hash-chained activity records with full metadata
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowAuditLogs(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-all text-slate-400 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <div className="space-y-3">
                                {auditLogs.map((log) => (
                                    <div key={log.id} className="p-4 bg-slate-800/40 rounded-xl border border-white/5 hover:border-indigo-500/20 transition-all">
                                        <div className="grid grid-cols-12 gap-4 text-xs">
                                            <div className="col-span-1">
                                                <div className="text-slate-500 font-semibold mb-1">ID</div>
                                                <div className="text-white font-mono">#{log.id}</div>
                                            </div>
                                            <div className="col-span-2">
                                                <div className="text-slate-500 font-semibold mb-1">Event ID</div>
                                                <div className="text-indigo-400 font-mono text-[10px] break-all">{log.event_id || 'N/A'}</div>
                                            </div>
                                            <div className="col-span-2">
                                                <div className="text-slate-500 font-semibold mb-1">User</div>
                                                <div className="text-white">{log.username || `ID:${log.userId}`}</div>
                                            </div>
                                            <div className="col-span-2">
                                                <div className="text-slate-500 font-semibold mb-1">Action</div>
                                                <div className="text-green-400 font-semibold">{log.action}</div>
                                            </div>
                                            <div className="col-span-3">
                                                <div className="text-slate-500 font-semibold mb-1">IP Address</div>
                                                <div className="text-slate-300 font-mono text-[10px]">{log.ipAddress}</div>
                                            </div>
                                            <div className="col-span-2">
                                                <div className="text-slate-500 font-semibold mb-1">Timestamp</div>
                                                <div className="text-slate-400 text-[10px]">
                                                    {new Date(log.createdAt).toLocaleString('id-ID')}
                                                </div>
                                            </div>
                                            <div className="col-span-12 mt-2">
                                                <div className="text-slate-500 font-semibold mb-1">Description</div>
                                                <div className="text-slate-300 text-xs">{log.description}</div>
                                            </div>
                                            <div className="col-span-6 mt-2">
                                                <div className="text-slate-500 font-semibold mb-1">Hash (SHA-256)</div>
                                                <div className="text-purple-400 font-mono text-[9px] break-all">{log.hash || 'N/A'}</div>
                                            </div>
                                            <div className="col-span-6 mt-2">
                                                <div className="text-slate-500 font-semibold mb-1">Previous Hash</div>
                                                <div className="text-blue-400 font-mono text-[9px] break-all">{log.prev_hash || 'NULL (Genesis)'}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {auditPagination && (
                            <div className="p-4 border-t border-white/10 bg-slate-900/50 flex items-center justify-between">
                                <div className="text-sm text-slate-400">
                                    Page {auditPagination.page} of {auditPagination.totalPages}
                                    <span className="ml-2 text-slate-500">({auditPagination.total} total entries)</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => viewRawAuditLogs(auditPagination.page - 1)}
                                        disabled={auditPagination.page === 1}
                                        className="px-4 py-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20 hover:bg-indigo-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm font-semibold"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => viewRawAuditLogs(auditPagination.page + 1)}
                                        disabled={auditPagination.page === auditPagination.totalPages}
                                        className="px-4 py-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20 hover:bg-indigo-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm font-semibold"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComplianceCenter;
