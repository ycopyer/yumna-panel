import React, { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Power, RefreshCw, Loader2, Shield, Lock, Unlock, Terminal as TerminalIcon } from 'lucide-react';
import axios from 'axios';
import Terminal from './Terminal';

interface SSHManagerProps {
    accounts: any[];
    loading: boolean;
    onRefresh: () => void;
    onAddAccount: () => void;
}

const SSHManager: React.FC<SSHManagerProps> = ({ accounts, loading, onRefresh, onAddAccount }) => {
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [activeTerminal, setActiveTerminal] = useState<{ id: number, username: string } | null>(null);

    const handleToggleStatus = async (id: number, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        setProcessingId(id);

        try {
            await axios.patch(`/api/ssh-accounts/${id}`, { status: newStatus });
            onRefresh();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to update status');
        } finally {
            setProcessingId(null);
        }
    };

    const handleDelete = async (id: number, username: string) => {
        if (!confirm(`Are you sure you want to delete SSH account "${username}"? This will also remove the system user.`)) return;

        setProcessingId(id);
        try {
            await axios.delete(`/api/ssh-accounts/${id}`);
            onRefresh();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to delete account');
        } finally {
            setProcessingId(null);
        }
    };

    const handleResetPassword = async (id: number, username: string) => {
        const newPassword = prompt(`Enter new password for SSH user "${username}":`);
        if (!newPassword) return;

        setProcessingId(id);
        try {
            await axios.post(`/api/ssh-accounts/${id}/reset-password`, { newPassword });
            alert('Password reset successfully');
            onRefresh();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to reset password');
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black tracking-tight text-[var(--text-main)] mb-2">SSH Access</h2>
                    <p className="text-[var(--text-muted)] font-medium">Secure shell accounts with domain isolation.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onRefresh}
                        className="p-3 rounded-2xl bg-[var(--nav-hover)] border border-[var(--border)] text-[var(--text-main)] hover:border-[var(--primary)]/40 transition-all active:scale-95"
                    >
                        <RefreshCw size={20} />
                    </button>
                    <button
                        onClick={onAddAccount}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all"
                    >
                        <Plus size={20} />
                        <span>Create SSH Account</span>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 rounded-3xl bg-[var(--nav-hover)] animate-pulse border border-[var(--border)]"></div>
                    ))}
                </div>
            ) : accounts.length === 0 ? (
                <div className="glass p-16 rounded-[3rem] text-center border-2 border-dashed border-[var(--border)]">
                    <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Key size={40} className="text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-black mb-2">No SSH accounts found</h3>
                    <p className="text-[var(--text-muted)] mb-8 max-w-md mx-auto font-medium">Create secure SSH accounts for your users with domain-level isolation.</p>
                    <button onClick={onAddAccount} className="px-8 py-3.5 rounded-2xl bg-emerald-500 text-white font-black shadow-xl hover:scale-105 active:scale-95 transition-all">
                        Create First SSH Account
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {accounts.map((account) => (
                        <div key={account.id} className="group flex items-center gap-6 glass p-5 rounded-[2rem] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-all hover:bg-[var(--nav-hover)]/30">
                            <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform ${account.status === 'active'
                                ? 'bg-emerald-500/10 border-emerald-500/30'
                                : 'bg-red-500/10 border-red-500/30'
                                }`}>
                                {account.status === 'active' ? (
                                    <Unlock className="text-emerald-500" size={28} />
                                ) : (
                                    <Lock className="text-red-500" size={28} />
                                )}
                            </div>

                            <div className="flex-1 grid gap-1">
                                <div className="flex items-center gap-3">
                                    <span className="text-lg font-black text-[var(--text-main)]">{account.username}</span>
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${account.status === 'active'
                                        ? 'bg-emerald-500/10 text-emerald-500'
                                        : 'bg-red-500/10 text-red-500'
                                        }`}>
                                        {account.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-xs font-bold text-[var(--text-muted)]">
                                    <div className="flex items-center gap-1.5 min-w-[120px]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span>Host: {window.location.hostname}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Shield size={14} />
                                        <span>Root: {account.rootPath || 'System'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pr-2">
                                <button
                                    onClick={() => setActiveTerminal({ id: account.id, username: account.username })}
                                    disabled={account.status !== 'active'}
                                    className="px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50 disabled:grayscale font-bold text-xs flex items-center gap-2"
                                >
                                    <TerminalIcon size={16} />
                                    <span>Terminal</span>
                                </button>
                                <button
                                    onClick={() => handleResetPassword(account.id, account.username)}
                                    disabled={processingId === account.id}
                                    className="p-3 rounded-2xl bg-[var(--bg-dark)] border border-[var(--border)] text-[var(--text-muted)] hover:text-blue-500 hover:border-blue-500/50 transition-all disabled:opacity-50"
                                >
                                    {processingId === account.id ? <Loader2 size={20} className="animate-spin" /> : <Key size={20} />}
                                </button>
                                <button
                                    onClick={() => handleToggleStatus(account.id, account.status)}
                                    disabled={processingId === account.id}
                                    className={`p-3 rounded-2xl bg-[var(--bg-dark)] border border-[var(--border)] transition-all disabled:opacity-50 ${account.status === 'active'
                                            ? 'text-[var(--text-muted)] hover:text-amber-500 hover:border-amber-500/50'
                                            : 'text-[var(--text-muted)] hover:text-emerald-500 hover:border-emerald-500/50'
                                        }`}
                                >
                                    {processingId === account.id ? <Loader2 size={20} className="animate-spin" /> : <Power size={20} />}
                                </button>
                                <button
                                    onClick={() => handleDelete(account.id, account.username)}
                                    disabled={processingId === account.id}
                                    className="p-3 rounded-2xl bg-[var(--bg-dark)] border border-[var(--border)] text-[var(--text-muted)] hover:text-red-500 hover:border-red-500/50 transition-all disabled:opacity-50"
                                >
                                    {processingId === account.id ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTerminal && (
                <Terminal
                    sshAccountId={activeTerminal.id}
                    contextTitle={`SSH: ${activeTerminal.username}`}
                    onClose={() => setActiveTerminal(null)}
                />
            )}
        </div>
    );
};

export default SSHManager;
