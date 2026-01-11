import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { GitBranch, Plus, Trash2, RefreshCw, CheckCircle, XCircle, Loader2, Link2, ExternalLink, GitCommit, Settings, ChevronRight, X, Terminal, Workflow, ShieldCheck, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GitRepo {
    id: number;
    name: string;
    repoUrl: string;
    branch: string;
    deployPath: string;
    status: 'active' | 'deploying' | 'error';
    lastDeploy: string | null;
    webhookSecret?: string;
}

interface GitManagerProps {
    websiteId: number;
    userId: number;
    defaultDeployPath: string;
}

const GitManager: React.FC<GitManagerProps> = ({ websiteId, userId, defaultDeployPath }) => {
    const [repos, setRepos] = useState<GitRepo[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newRepo, setNewRepo] = useState({
        name: '',
        repoUrl: '',
        branch: 'main',
        deployPath: defaultDeployPath
    });

    useEffect(() => {
        fetchRepos();
    }, [websiteId]);

    const fetchRepos = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/hosting/git');
            setRepos(res.data.filter((r: any) => r.websiteId === websiteId));
        } catch (err) {
            console.error('Failed to fetch git repos');
        } finally {
            setLoading(false);
        }
    };

    const handleAddRepo = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('/api/hosting/git', {
                ...newRepo,
                websiteId
            });
            setShowAddModal(false);
            setNewRepo({ name: '', repoUrl: '', branch: 'main', deployPath: defaultDeployPath });
            fetchRepos();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to add repository');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to remove this repository link? (Files will not be deleted)')) return;
        try {
            await axios.delete(`/api/hosting/git/${id}`);
            fetchRepos();
        } catch (err) {
            alert('Failed to delete repository');
        }
    };

    const handleDeploy = async (id: number) => {
        setActionLoading(id);
        try {
            await axios.post(`/api/hosting/git/${id}/deploy`, {});
            fetchRepos();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Deployment failed');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-12">
            {/* Tactical Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                            <Workflow size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white tracking-tight">CI/CD Pipelines</h3>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Codebase Syncronization & Deploy Logic</p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-2xl shadow-indigo-600/20"
                >
                    <Plus size={18} /> Establish New Pipeline
                </button>
            </div>

            {/* SSH Key Section */}
            <DeployKeySection userId={userId} />

            {/* Pipeline Matrix */}
            <AnimatePresence mode="wait">
                {loading && repos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-6">
                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                        <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.4em]">Querying Commit History</p>
                    </div>
                ) : repos.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/[0.01] border border-white/5 border-dashed rounded-[48px] p-24 text-center group"
                    >
                        <div className="w-20 h-20 bg-white/[0.03] rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:bg-indigo-500/5 transition-all">
                            <GitBranch className="text-white/10 group-hover:text-indigo-400 transition-colors" size={40} />
                        </div>
                        <h4 className="text-xl font-black text-white/40 mb-2 uppercase tracking-tight">No Active Streams</h4>
                        <p className="text-white/20 text-sm max-w-sm mx-auto mb-10 italic leading-relaxed">
                            Connect a remote repository to automate your deployment cycle directly from source control.
                        </p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 text-white/60 font-black text-[10px] uppercase tracking-widest rounded-2xl border border-white/5 transition-all"
                        >
                            Open Pipeline Configurator <ChevronRight size={16} />
                        </button>
                    </motion.div>
                ) : (
                    <div className="grid gap-6">
                        {repos.map((repo, idx) => (
                            <motion.div
                                key={repo.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="group relative bg-white/[0.02] border border-white/5 rounded-[40px] p-10 hover:border-indigo-500/30 transition-all overflow-hidden"
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                                    <div className="flex gap-8">
                                        <div className="w-16 h-16 rounded-[28px] bg-gradient-to-br from-indigo-500/20 to-indigo-900/10 flex items-center justify-center border border-white/5 shrink-0 group-hover:scale-110 transition-transform">
                                            <GitBranch className="text-indigo-400" size={32} />
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-4 flex-wrap">
                                                <h4 className="text-2xl font-black text-white tracking-tight">{repo.name}</h4>
                                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${repo.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    repo.status === 'deploying' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                        'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                    }`}>
                                                    {repo.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <p className="text-[11px] font-mono text-white/30 truncate max-w-md flex items-center gap-2">
                                                    <Link2 size={12} className="text-indigo-400" /> {repo.repoUrl}
                                                </p>
                                                <div className="h-4 w-px bg-white/5" />
                                                <div className="flex items-center gap-2 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">
                                                    <GitCommit size={12} className="text-indigo-400" />
                                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{repo.branch}</span>
                                                </div>
                                            </div>

                                            {/* Webhook Info */}
                                            {repo.webhookSecret && (
                                                <div className="mt-4 p-4 bg-black/20 rounded-2xl border border-white/5 space-y-3">
                                                    <div className="flex items-center gap-2 text-white/40">
                                                        <ExternalLink size={12} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Webhook Config</span>
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <div className="flex items-center gap-2 bg-white/5 p-2 rounded-lg group/url hover:bg-white/10 transition-colors cursor-pointer" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/api/hosting/webhook/${repo.id}`); alert('Webhook URL Copied'); }}>
                                                            <code className="text-[10px] text-white/60 font-mono truncate flex-1">
                                                                {window.location.origin}/api/hosting/webhook/{repo.id}
                                                            </code>
                                                            <Copy size={10} className="text-white/20 group-hover/url:text-white transition-colors" />
                                                        </div>
                                                        <div className="flex items-center gap-2 bg-white/5 p-2 rounded-lg group/secret hover:bg-white/10 transition-colors cursor-pointer" onClick={() => { navigator.clipboard.writeText(repo.webhookSecret!); alert('Secret Copied'); }}>
                                                            <code className="text-[10px] text-white/60 font-mono truncate flex-1 filter blur-[3px] group-hover/secret:blur-0 transition-all">
                                                                {repo.webhookSecret}
                                                            </code>
                                                            <ShieldCheck size={10} className="text-white/20 group-hover/secret:text-emerald-400 transition-colors" />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <RefreshCw size={10} /> Last Push: {repo.lastDeploy ? new Date(repo.lastDeploy).toLocaleString() : 'VOID'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => handleDeploy(repo.id)}
                                            disabled={actionLoading === repo.id || repo.status === 'deploying'}
                                            className="px-8 py-4 bg-white/5 hover:bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl border border-white/5 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
                                        >
                                            {actionLoading === repo.id ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                                            Sync Stream
                                        </button>
                                        <button
                                            onClick={() => handleDelete(repo.id)}
                                            className="p-4 bg-white/5 hover:bg-rose-600/10 text-white/20 hover:text-rose-500 rounded-2xl border border-white/5 hover:border-rose-500/30 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                                <div className="absolute -bottom-10 -right-10 text-white/[0.02] font-black text-8xl tracking-tighter select-none pointer-events-none group-hover:text-indigo-500/[0.03] transition-colors uppercase">GIT</div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>

            {/* Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="relative w-full max-w-2xl bg-[#0A0A0A] border border-white/10 rounded-[48px] shadow-2xl overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-12 pb-8 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20">
                                        <Terminal size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-black text-white tracking-tight italic uppercase">Bridge Stream</h3>
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mt-1">Configure Repository Connection</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowAddModal(false)} className="p-3 bg-white/5 hover:bg-white/10 text-white/20 hover:text-white rounded-full transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleAddRepo} className="p-12 pt-0 space-y-8">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Label Node</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Production Core"
                                            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/10"
                                            value={newRepo.name}
                                            onChange={e => setNewRepo({ ...newRepo, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Target Branch</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all font-mono"
                                            value={newRepo.branch}
                                            onChange={e => setNewRepo({ ...newRepo, branch: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Repository Vector (SSH/HTTPS)</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            required
                                            placeholder="git@github.com:matrix/node.git"
                                            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 px-6 pl-14 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/10 font-mono"
                                            value={newRepo.repoUrl}
                                            onChange={e => setNewRepo({ ...newRepo, repoUrl: e.target.value })}
                                        />
                                        <Link2 size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Deployment Path (LOCKED)</label>
                                    <div className="w-full bg-black/40 border border-white/[0.02] rounded-2xl py-4 px-6 text-[11px] font-mono text-white/20 select-none">
                                        {newRepo.deployPath}
                                    </div>
                                </div>

                                <div className="pt-6 flex items-center justify-between">
                                    <button type="button" onClick={() => setShowAddModal(false)} className="px-8 py-4 text-white/20 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all">Abort</button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/20 active:scale-95 transition-all"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={20} /> : "Commence Authorization"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const DeployKeySection: React.FC<{ userId: number }> = ({ userId }) => {
    const [key, setKey] = useState<string | null>(null);
    const [revealed, setRevealed] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Pre-fetch key on load
        fetchKey();
    }, [userId]);

    const fetchKey = async () => {
        try {
            const res = await axios.get('/api/hosting/git/key');
            setKey(res.data.publicKey);
        } catch (e) { console.error(e); }
    };

    const handleRegen = async () => {
        if (!confirm('Regenerating this key will break access for all existing connected repositories. Continue?')) return;
        setLoading(true);
        try {
            const res = await axios.post('/api/hosting/git/key/regenerate');
            setKey(res.data.publicKey);
        } catch (e) {
            alert('Failed to regenerate key');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (key) {
            navigator.clipboard.writeText(key);
            alert('Public Key copied to clipboard!');
        }
    };

    return (
        <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-8 relative overflow-hidden group">
            <div className="absolute -left-10 -top-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl" />

            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start justify-between">
                <div className="space-y-4 max-w-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                            <ShieldCheck size={20} />
                        </div>
                        <h4 className="text-lg font-black text-white">Deployment Identity</h4>
                    </div>
                    <p className="text-white/40 text-sm leading-relaxed">
                        This is your unique <strong>deployment signature</strong>. Add this Public Key to your GitHub/GitLab repository's "Deploy Keys" section to authorize access without using your personal credentials.
                    </p>
                </div>

                <div className="w-full md:w-auto flex-1 max-w-2xl space-y-3">
                    <div className="relative group/key">
                        <div className={`w-full bg-black/30 border border-white/10 rounded-xl p-4 font-mono text-[10px] text-white/60 break-all transition-all ${revealed ? '' : 'blur-sm select-none'}`}>
                            {key || 'Loading Identity...'}
                        </div>
                        {!revealed && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <button onClick={() => setRevealed(true)} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-all backdrop-blur-md">
                                    Reveal Key
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 justify-end">
                        <button onClick={copyToClipboard} className="text-xs font-bold text-white/40 hover:text-white flex items-center gap-2 px-3 py-2 hover:bg-white/5 rounded-lg transition-all">
                            <Copy size={14} /> Copy to Clipboard
                        </button>
                        <button onClick={handleRegen} disabled={loading} className="text-xs font-bold text-rose-500/60 hover:text-rose-400 flex items-center gap-2 px-3 py-2 hover:bg-rose-500/10 rounded-lg transition-all">
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Regenerate Identity
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GitManager;
