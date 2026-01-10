import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Shield, Activity, Lock, Scan, Bug, FileText, FileCheck, Key, Map as MapIcon } from 'lucide-react';
import axios from 'axios';

import SecurityDashboard from './SecurityDashboard';
import AdvancedFirewallTabs from './AdvancedFirewallTabs';
import Fail2BanManager from './Fail2BanManager';
import MalwareScanner from './MalwareScanner';
import VulnerabilityScanner from './VulnerabilityScanner';
import SecurityAuditViewer from './SecurityAuditViewer';
import FileIntegrityManager from './FileIntegrityManager';
import TwoFactorManager from './TwoFactorManager';
import ThreatMap from './ThreatMap';

const SecurityCenter: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'map' | 'firewall' | 'fail2ban' | 'malware' | 'vuln' | 'audit' | 'integrity' | '2fa'>('dashboard');
    const [mapStats, setMapStats] = useState<any>({ byCountry: [], recent: [], total: 0, active: 0, serverGeo: null });

    useEffect(() => {
        axios.get('/api/security/stats').then(res => {
            const d = res.data;
            setMapStats({
                byCountry: d.topAttackers || [],
                recent: [],
                total: d.failedAttempts || 0,
                active: d.blockedCountries || 0,
                serverGeo: null
            });
        }).catch(err => console.error('Map stats error:', err));
    }, []);

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* Header / Tabs */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
                            <Shield size={24} />
                        </div>
                        Threat Defense Center
                    </h2>
                    <p className="text-sm font-medium text-[var(--text-muted)] mt-1 ml-1">Unified Security Management Console</p>
                </div>

                <div className="flex bg-[var(--nav-hover)]/50 backdrop-blur-md p-1.5 rounded-2xl border border-[var(--border)] overflow-x-auto max-w-full custom-scrollbar">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-[var(--primary)] text-white shadow-lg shadow-indigo-500/20' : 'text-[var(--text-muted)] hover:bg-[var(--nav-hover)] hover:text-[var(--text-main)]'}`}
                    >
                        <LayoutDashboard size={14} /> Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab('map')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'map' ? 'bg-[var(--primary)] text-white shadow-lg shadow-indigo-500/20' : 'text-[var(--text-muted)] hover:bg-[var(--nav-hover)] hover:text-[var(--text-main)]'}`}
                    >
                        <MapIcon size={14} /> Live Map
                    </button>
                    <button
                        onClick={() => setActiveTab('firewall')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'firewall' ? 'bg-[var(--primary)] text-white shadow-lg shadow-indigo-500/20' : 'text-[var(--text-muted)] hover:bg-[var(--nav-hover)] hover:text-[var(--text-main)]'}`}
                    >
                        <Activity size={14} /> Firewall
                    </button>
                    <button
                        onClick={() => setActiveTab('fail2ban')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'fail2ban' ? 'bg-[var(--primary)] text-white shadow-lg shadow-indigo-500/20' : 'text-[var(--text-muted)] hover:bg-[var(--nav-hover)] hover:text-[var(--text-main)]'}`}
                    >
                        <Lock size={14} /> Fail2Ban
                    </button>
                    <button
                        onClick={() => setActiveTab('malware')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'malware' ? 'bg-[var(--primary)] text-white shadow-lg shadow-indigo-500/20' : 'text-[var(--text-muted)] hover:bg-[var(--nav-hover)] hover:text-[var(--text-main)]'}`}
                    >
                        <Scan size={14} /> Malware
                    </button>
                    <button
                        onClick={() => setActiveTab('vuln')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'vuln' ? 'bg-[var(--primary)] text-white shadow-lg shadow-indigo-500/20' : 'text-[var(--text-muted)] hover:bg-[var(--nav-hover)] hover:text-[var(--text-main)]'}`}
                    >
                        <Bug size={14} /> Vuln
                    </button>
                    <button
                        onClick={() => setActiveTab('audit')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'audit' ? 'bg-[var(--primary)] text-white shadow-lg shadow-indigo-500/20' : 'text-[var(--text-muted)] hover:bg-[var(--nav-hover)] hover:text-[var(--text-main)]'}`}
                    >
                        <FileText size={14} /> Audit
                    </button>
                    <button
                        onClick={() => setActiveTab('integrity')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'integrity' ? 'bg-[var(--primary)] text-white shadow-lg shadow-indigo-500/20' : 'text-[var(--text-muted)] hover:bg-[var(--nav-hover)] hover:text-[var(--text-main)]'}`}
                    >
                        <FileCheck size={14} /> Integrity
                    </button>
                    <button
                        onClick={() => setActiveTab('2fa')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === '2fa' ? 'bg-[var(--primary)] text-white shadow-lg shadow-indigo-500/20' : 'text-[var(--text-muted)] hover:bg-[var(--nav-hover)] hover:text-[var(--text-main)]'}`}
                    >
                        <Key size={14} /> 2FA
                    </button>
                </div>
            </div>

            {/* Content Render */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {activeTab === 'dashboard' && <SecurityDashboard />}
                    {activeTab === 'map' && <div className="h-[600px] bg-[#050810] rounded-[32px] border border-cyan-500/30 overflow-hidden"><ThreatMap stats={mapStats} /></div>}
                    {activeTab === 'firewall' && <AdvancedFirewallTabs />}
                    {activeTab === 'fail2ban' && <Fail2BanManager />}
                    {activeTab === 'malware' && <MalwareScanner />}
                    {activeTab === 'vuln' && <VulnerabilityScanner />}
                    {activeTab === 'audit' && <SecurityAuditViewer />}
                    {activeTab === 'integrity' && <FileIntegrityManager />}
                    {activeTab === '2fa' && <TwoFactorManager />}
                </div>
            </div>
        </div>
    );
};

export default SecurityCenter;
