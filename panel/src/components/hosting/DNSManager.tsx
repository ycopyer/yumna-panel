import React, { useState } from 'react';
import { Globe, Plus, Search, Layers, Settings, Shield, ExternalLink, Activity } from 'lucide-react';
import DNSManagementModal from '../modals/DNSManagementModal';

interface DNSManagerProps {
    zones: any[];
    loading: boolean;
    onRefresh: () => void;
    onAddZone: () => void;
}

const DNSManager: React.FC<DNSManagerProps> = ({ zones, loading, onRefresh, onAddZone }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedZone, setSelectedZone] = useState<any | null>(null);

    const filteredZones = zones.filter(zone =>
        zone.domain.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex-1 flex flex-col h-full bg-[var(--bg-dark)]/50">
            {/* Header / Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-dark)]/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                        <Globe size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-[var(--text-main)] tracking-tight">DNS Zone Editor</h2>
                        <p className="text-[11px] font-bold text-[var(--text-muted)]">Manage Domain Nameservers & Records</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                        <input
                            placeholder="Search domains..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl py-2 pl-9 pr-4 text-xs font-bold text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all w-48 focus:w-64"
                        />
                    </div>
                    <button
                        onClick={onAddZone}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:brightness-110 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95"
                    >
                        <Plus size={14} />
                        <span className="hidden sm:inline">Add DNS Zone</span>
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center animate-fade">
                        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin mb-4" />
                        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Loading DNS Zones...</p>
                    </div>
                ) : filteredZones.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center animate-fade">
                        <div className="p-6 rounded-[24px] bg-[var(--bg-card)] border border-[var(--border)] mb-4">
                            <Globe size={48} className="text-[var(--text-muted)] opacity-20" />
                        </div>
                        <h3 className="text-sm font-black text-[var(--text-main)] mb-1">No DNS Zones Found</h3>
                        <p className="text-xs text-[var(--text-muted)]">Add your first domain to manage its DNS records.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredZones.map(zone => (
                            <div key={zone.id} className="group relative bg-[var(--bg-card)] rounded-[24px] border border-[var(--border)] hover:border-indigo-500/50 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-indigo-500/5">

                                {/* Card Header */}
                                <div className="p-6 pb-4 flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 flex items-center justify-center border border-indigo-500/10 group-hover:scale-110 transition-transform duration-300">
                                            <Globe size={20} className="text-indigo-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-[var(--text-main)] group-hover:text-indigo-500 transition-colors cursor-pointer truncate max-w-[180px]" title={zone.domain}>
                                                {zone.domain}
                                            </h3>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <Activity size={10} className="text-green-500" />
                                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">Active Zone</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-2.5 py-1 rounded-lg bg-[var(--bg-dark)] border border-[var(--border)]">
                                        <span className="text-[10px] font-black text-[var(--text-muted)]">{zone.records || 0} Records</span>
                                    </div>
                                </div>

                                {/* Stats Bar */}
                                <div className="px-6 py-3 border-y border-[var(--border)] bg-[var(--bg-dark)]/20 flex gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <Layers size={10} className="text-[var(--text-muted)]" />
                                        <span className="text-[10px] font-bold text-[var(--text-muted)]">SOA Serial: {new Date().toISOString().slice(0, 10).replace(/-/g, '')}01</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="p-4 bg-[var(--bg-dark)]/30 flex items-center gap-2">
                                    <button
                                        onClick={() => setSelectedZone(zone)}
                                        className="flex-1 py-2.5 rounded-xl bg-[var(--bg-card)] hover:bg-indigo-600 hover:text-white border border-[var(--border)] hover:border-indigo-600 text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] transition-all flex items-center justify-center gap-2 group/btn"
                                    >
                                        <Settings size={12} className="group-hover/btn:rotate-90 transition-transform" />
                                        Manage DNS
                                    </button>
                                    <button
                                        onClick={() => window.open(`https://intodns.com/${zone.domain}`, '_blank')}
                                        className="p-2.5 rounded-xl bg-[var(--bg-card)] hover:bg-blue-500 hover:text-white border border-[var(--border)] hover:border-blue-500 text-[var(--text-muted)] transition-all flex items-center justify-center"
                                        title="External DNS Check"
                                    >
                                        <Shield size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedZone && (
                <DNSManagementModal
                    zone={selectedZone}
                    onClose={() => setSelectedZone(null)}
                    onRefresh={() => {
                        onRefresh();
                        setSelectedZone(null);
                    }}
                />
            )}
        </div>
    );
};

export default DNSManager;
