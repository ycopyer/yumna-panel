import React, { useState, useEffect } from 'react';
import { X, Database, User, Shield, Key, RefreshCw, Trash2, Copy, Check, Loader2, Plus, Users } from 'lucide-react';
import axios from 'axios';

interface DatabaseManagementModalProps {
    database: any;
    onClose: () => void;
    onRefresh: () => void;
}

const DatabaseManagementModal: React.FC<DatabaseManagementModalProps> = ({ database, onClose, onRefresh }) => {
    const [activeTab, setActiveTab] = useState<'users' | 'tools'>('users');
    const [loading, setLoading] = useState(false);
    const [dbUsers, setDbUsers] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);

    // Create User State
    const [newUser, setNewUser] = useState({ username: '', password: '' });

    // Assign User State
    const [selectedUser, setSelectedUser] = useState('');

    // Tools State
    const [cloneName, setCloneName] = useState('');

    useEffect(() => {
        fetchDbUsers();
        fetchAllUsers();
    }, [database]);

    const fetchDbUsers = async () => {
        try {
            const res = await axios.get(`/api/databases/${database.name}/users`);
            setDbUsers(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchAllUsers = async () => {
        try {
            const res = await axios.get(`/api/database-users`);
            setAllUsers(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUser.username || !newUser.password) return;
        setLoading(true);
        try {
            await axios.post('/api/database-users', newUser);
            // Auto assign to this DB
            await axios.post(`/api/databases/${database.name}/grant`, { username: newUser.username, privileges: 'ALL' });
            setNewUser({ username: '', password: '' });
            fetchDbUsers();
            fetchAllUsers();
            alert('User created and assigned!');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    const handleAssignUser = async () => {
        if (!selectedUser) return;
        setLoading(true);
        try {
            await axios.post(`/api/databases/${database.name}/grant`, { username: selectedUser, privileges: 'ALL' });
            fetchDbUsers();
            setSelectedUser('');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to assign user');
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeUser = async (username: string) => {
        if (!confirm(`Revoke access for ${username}?`)) return;
        setLoading(true);
        try {
            await axios.post(`/api/databases/${database.name}/revoke`, { username });
            fetchDbUsers();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to revoke access');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (username: string) => {
        const newPass = prompt("Enter new password for " + username);
        if (!newPass) return;
        setLoading(true);
        try {
            await axios.put(`/api/database-users/${username}/password`, { password: newPass });
            alert("Password updated");
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    const generatePassword = () => {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let pass = "";
        for (let i = 0; i < 16; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setNewUser({ ...newUser, password: pass });
    };

    const handleClone = async () => {
        if (!cloneName) return;
        setLoading(true);
        try {
            await axios.post(`/api/databases/${database.id}/clone`, { newName: cloneName });
            alert('Database cloned successfully');
            onRefresh();
            setCloneName('');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Clone failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDropDatabase = async () => {
        if (!confirm(`CRITICAL: Drop database ${database.name}? This cannot be undone.`)) return;
        setLoading(true);
        try {
            await axios.delete(`/api/databases/${database.id}`);
            onRefresh();
            onClose();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Delete failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[1100] flex items-center justify-center p-4">
            <div className="glass w-full max-w-2xl rounded-[32px] overflow-hidden border border-white/5 shadow-2xl animate-scale-up flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-8 bg-gradient-to-br from-amber-600/20 to-transparent border-b border-white/5">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-lg">
                                <Database size={28} className="text-amber-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight">{database.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[11px] font-bold text-white/40">{database.size_mb || 0} MB • {database.table_count || 0} Tables</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex gap-2 mt-8">
                        <button onClick={() => setActiveTab('users')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-amber-500 text-white' : 'text-white/40 hover:bg-white/5'}`}>
                            <Users size={16} /> Users & Privileges
                        </button>
                        <button onClick={() => setActiveTab('tools')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'tools' ? 'bg-amber-500 text-white' : 'text-white/40 hover:bg-white/5'}`}>
                            <RefreshCw size={16} /> Operations
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

                    {activeTab === 'users' && (
                        <div className="space-y-8">

                            {/* Create User Form */}
                            <div className="p-6 bg-white/5 rounded-[24px] border border-white/5">
                                <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-6">Create New Database User</h4>
                                <form onSubmit={handleCreateUser} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="relative">
                                            <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                                            <input required placeholder="Username" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-white font-bold text-sm focus:border-amber-500/50 outline-none" />
                                        </div>
                                        <div className="relative">
                                            <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                                            <input required type="text" placeholder="Password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-10 text-white font-bold text-sm focus:border-amber-500/50 outline-none" />
                                            <button type="button" onClick={generatePassword} className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 hover:text-amber-400"><RefreshCw size={14} /></button>
                                        </div>
                                    </div>
                                    <button type="submit" disabled={loading} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all">
                                        {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Create & Assign User'}
                                    </button>
                                </form>
                            </div>

                            {/* Existing Users List */}
                            <div>
                                <div className="flex justify-between items-center mb-4 px-2">
                                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Assigned Users</h4>

                                    {/* Quick Assign */}
                                    <div className="flex items-center gap-2">
                                        <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="bg-white/5 border border-white/5 rounded-lg py-1 px-3 text-xs text-white font-bold outline-none">
                                            <option value="">Assign existing user...</option>
                                            {allUsers.filter(u => !dbUsers.find(du => du.User === u.User)).map(u => (
                                                <option key={u.User} value={u.User}>{u.User}</option>
                                            ))}
                                        </select>
                                        <button onClick={handleAssignUser} disabled={!selectedUser || loading} className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white transition-colors">
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {dbUsers.length === 0 ? (
                                        <div className="p-8 text-center border-2 border-dashed border-white/5 rounded-[24px]">
                                            <p className="text-sm font-bold text-white/20">No users assigned.</p>
                                        </div>
                                    ) : dbUsers.map(user => (
                                        <div key={user.User} className="p-4 bg-white/5 rounded-[20px] border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-amber-500/5 flex items-center justify-center border border-amber-500/10">
                                                    <User size={18} className="text-amber-400/60" />
                                                </div>
                                                <span className="text-sm font-bold text-white">{user.User}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleResetPassword(user.User)} className="p-2 rounded-lg text-white/20 hover:text-white hover:bg-white/10" title="Reset Password">
                                                    <Key size={14} />
                                                </button>
                                                <button onClick={() => handleRevokeUser(user.User)} className="p-2 rounded-lg text-white/20 hover:text-rose-500 hover:bg-rose-500/10" title="Revoke Access">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'tools' && (
                        <div className="space-y-6">
                            {/* Clone DB */}
                            <div className="p-6 bg-white/5 rounded-[24px] border border-white/5">
                                <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2"><Copy size={14} /> Clone Database</h4>
                                <div className="flex gap-4">
                                    <input placeholder="New Database Name" value={cloneName} onChange={e => setCloneName(e.target.value)} className="flex-1 bg-black/20 border border-white/5 rounded-xl py-2 px-4 text-white font-bold text-sm focus:border-amber-500/50 outline-none" />
                                    <button onClick={handleClone} disabled={loading || !cloneName} className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all">
                                        Clone
                                    </button>
                                </div>
                            </div>

                            {/* Drop DB */}
                            <div className="p-6 bg-rose-500/10 rounded-[24px] border border-rose-500/20">
                                <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Trash2 size={14} /> Danger Zone</h4>
                                <p className="text-[11px] text-rose-200/60 mb-6">Permanently delete this database and all its data. This action cannot be undone.</p>
                                <button onClick={handleDropDatabase} disabled={loading} className="w-full py-3 bg-rose-500 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:brightness-110 transition-all">
                                    Drop Database
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default DatabaseManagementModal;
