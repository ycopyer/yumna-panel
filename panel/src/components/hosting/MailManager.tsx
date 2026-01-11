import React from 'react';
import { Mail, Plus, Trash2, Shield, Settings, ExternalLink, Activity, Users, Globe } from 'lucide-react';

interface MailManagerProps {
    domains: any[];
    loading: boolean;
    onRefresh: () => void;
    onAddDomain: () => void;
    onAddAccount: () => void;
    onManageDomain: (domain: any) => void;
}

const MailManager: React.FC<MailManagerProps> = ({ domains, loading, onRefresh, onAddDomain, onAddAccount, onManageDomain }) => {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black tracking-tight text-[var(--text-main)] mb-2">Email Control</h2>
                    <p className="text-[var(--text-muted)] font-medium">Professional grade enterprise mail server management.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onRefresh}
                        className="p-3 rounded-2xl bg-[var(--nav-hover)] border border-[var(--border)] text-[var(--text-main)] hover:border-[var(--primary)]/40 transition-all active:scale-95"
                    >
                        <Activity size={20} />
                    </button>
                    <button
                        onClick={onAddDomain}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[var(--primary)] text-white font-bold shadow-lg shadow-indigo-500/25 hover:brightness-110 active:scale-95 transition-all"
                    >
                        <Plus size={20} />
                        <span>Add Domain</span>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 rounded-[2rem] bg-[var(--nav-hover)] animate-pulse border border-[var(--border)]"></div>
                    ))}
                </div>
            ) : domains.length === 0 ? (
                <div className="glass p-16 rounded-[3rem] text-center border-2 border-dashed border-[var(--border)]">
                    <div className="w-24 h-24 bg-[var(--primary)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Mail size={40} className="text-[var(--primary)]" />
                    </div>
                    <h3 className="text-2xl font-black mb-2">No email domains found</h3>
                    <p className="text-[var(--text-muted)] mb-8 max-w-md mx-auto font-medium">Create your first professional email domain to start managing business communications.</p>
                    <button onClick={onAddDomain} className="px-8 py-3.5 rounded-2xl bg-[var(--primary)] text-white font-black shadow-xl hover:scale-105 active:scale-95 transition-all">
                        Get Started
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {domains.map((domain) => (
                        <div key={domain.id} className="group relative glass p-6 rounded-[2rem] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-all hover:shadow-2xl hover:-translate-y-1">
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-white/5 shadow-inner">
                                    <Mail className="text-[var(--primary)]" size={28} />
                                </div>
                                <div className="grid">
                                    <span className="text-lg font-black text-[var(--text-main)] truncate">{domain.domain}</span>
                                    <span className="text-[10px] uppercase font-black tracking-widest text-[var(--primary)]">ACTIVE SERVER</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="p-3 rounded-2xl bg-[var(--bg-dark)] border border-[var(--border)]">
                                    <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
                                        <Users size={12} />
                                        <span className="text-[10px] font-black uppercase">Accounts</span>
                                    </div>
                                    <span className="text-lg font-black text-[var(--text-main)]">{domain.accounts || 0}</span>
                                </div>
                                <div className="p-3 rounded-2xl bg-[var(--bg-dark)] border border-[var(--border)]">
                                    <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
                                        <Shield size={12} />
                                        <span className="text-[10px] font-black uppercase">Security</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-emerald-500">DKIM/SPF ON</span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => onManageDomain(domain)} className="flex-1 py-3 rounded-xl bg-[var(--nav-hover)] text-[var(--text-main)] font-bold text-xs hover:bg-[var(--primary)] hover:text-white transition-all border border-[var(--border)]">
                                    Manage Accounts
                                </button>
                                <button
                                    onClick={() => window.open(`http://webmail.${domain.domain}`, '_blank')}
                                    className="p-3 rounded-xl bg-[var(--nav-hover)] text-[var(--text-muted)] hover:text-sky-500 border border-[var(--border)] transition-all flex items-center justify-center gap-2 px-4 whitespace-nowrap"
                                >
                                    <Globe size={16} />
                                    <span className="text-[10px] font-black uppercase">Webmail</span>
                                </button>
                            </div>

                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MailManager;
