import React, { useState, useEffect } from 'react';
import {
    UserPlus,
    Mail,
    Shield,
    Trash2,
    Edit,
    Search,
    Lock,
    Loader2,
    Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import AddTeamMemberModal from '../modals/AddTeamMemberModal';
import EditPermissionsModal from '../modals/EditPermissionsModal';

interface TeamMembersPanelProps {
    websiteId: number;
    isOwner: boolean;
    onUpdate: () => void;
}

const TeamMembersPanel: React.FC<TeamMembersPanelProps> = ({ websiteId, isOwner, onUpdate }) => {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [showEditModal, setShowEditModal] = useState(false);

    useEffect(() => {
        fetchMembers();
    }, [websiteId]);

    const fetchMembers = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/hosting/collaboration/websites/${websiteId}/members`, {
                headers: {
                    'x-user-id': localStorage.getItem('userId') || '',
                    'x-session-id': localStorage.getItem('sessionId') || ''
                }
            });
            setMembers(response.data.members);
        } catch (error) {
            console.error('Error fetching members:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async (memberId: number) => {
        if (!confirm('Remove this team member?')) return;

        try {
            await axios.delete(`/api/hosting/collaboration/websites/${websiteId}/members/${memberId}`, {
                headers: {
                    'x-user-id': localStorage.getItem('userId') || '',
                    'x-session-id': localStorage.getItem('sessionId') || ''
                }
            });
            fetchMembers();
            onUpdate();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to remove member');
        }
    };

    const handleEditPermissions = (member: any) => {
        setSelectedMember(member);
        setShowEditModal(true);
    };

    const getPermissionBadges = (permissions: any) => {
        if (!permissions) return [];
        const perms = typeof permissions === 'string' ? JSON.parse(permissions) : permissions;
        const badges = [];
        if (perms.files) badges.push({ label: 'Files', class: 'bg-emerald-500/10 text-emerald-400' });
        if (perms.database) badges.push({ label: 'SQL', class: 'bg-indigo-500/10 text-indigo-400' });
        if (perms.settings) badges.push({ label: 'Config', class: 'bg-violet-500/10 text-violet-400' });
        if (perms.ssl) badges.push({ label: 'Sec', class: 'bg-rose-500/10 text-rose-400' });
        return badges;
    };

    const filteredMembers = members.filter(member =>
        member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative group w-full max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-violet-400 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search collaborators..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:border-violet-500/50 outline-none transition-all placeholder:text-white/20"
                    />
                </div>

                {isOwner && (
                    <button
                        className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-violet-600/20"
                        onClick={() => setShowAddModal(true)}
                    >
                        <UserPlus size={16} />
                        Grant Access
                    </button>
                )}
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
                    <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em]">Querying Member Index</p>
                </div>
            ) : filteredMembers.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center p-12 bg-white/[0.02] border border-white/5 border-dashed rounded-[32px] text-center">
                    <div className="p-6 bg-violet-500/5 rounded-full mb-4">
                        <Users size={32} className="text-white/10" />
                    </div>
                    <h3 className="text-lg font-black text-white mb-1">Squad is empty</h3>
                    <p className="text-white/40 text-sm font-medium italic">Grant access to users to start collaborating on this node.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {filteredMembers.map((member, idx) => {
                        const permBadges = getPermissionBadges(member.permissions);
                        return (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                key={member.id}
                                className="group relative bg-[#0D0D0D] border border-white/5 rounded-[24px] p-6 hover:border-white/10 transition-all"
                            >
                                <div className="flex items-start gap-5">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/40 to-indigo-600/40 border border-white/5 flex items-center justify-center text-xl font-black text-white group-hover:scale-105 transition-transform shadow-inner">
                                        {member.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-0.5">
                                                <h4 className="text-lg font-black text-white group-hover:text-violet-400 transition-colors leading-none tracking-tight">
                                                    {member.username}
                                                </h4>
                                                <div className="flex items-center gap-2">
                                                    <span className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${member.user_role === 'admin' ? 'bg-amber-500/10 text-amber-500' : 'bg-white/5 text-white/40'}`}>
                                                        <Shield size={8} />
                                                        {member.user_role}
                                                    </span>
                                                    <div className="w-1 h-1 rounded-full bg-white/10" />
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <Mail size={10} className="text-white/20" />
                                                        <span className="text-white/20 text-[9px] font-bold truncate max-w-[120px]">{member.email}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {isOwner && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleEditPermissions(member)}
                                                        className="p-2.5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl transition-all active:scale-90 border border-white/5"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveMember(member.id)}
                                                        className="p-2.5 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500/40 hover:text-rose-500 rounded-xl transition-all active:scale-90 border border-rose-500/5"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {permBadges.length > 0 ? permBadges.map((badge, i) => (
                                                <span key={i} className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border border-white/5 ${badge.class}`}>
                                                    {badge.label}
                                                </span>
                                            )) : (
                                                <span className="px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border border-white/5 bg-white/5 text-white/20 flex items-center gap-1.5">
                                                    <Lock size={10} />
                                                    Base Read-Only
                                                </span>
                                            )}
                                        </div>

                                        <div className="pt-2 flex items-center gap-2 text-white/10">
                                            <div className="h-[1px] flex-1 bg-white/5" />
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Since {new Date(member.created_at).getFullYear()}</span>
                                            <div className="h-[1px] flex-1 bg-white/5" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            )}

            <AnimatePresence>
                {showAddModal && <AddTeamMemberModal websiteId={websiteId} onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); fetchMembers(); onUpdate(); }} />}
                {showEditModal && selectedMember && <EditPermissionsModal websiteId={websiteId} member={selectedMember} onClose={() => { setShowEditModal(false); setSelectedMember(null); }} onSuccess={() => { setShowEditModal(false); setSelectedMember(null); fetchMembers(); }} />}
            </AnimatePresence>
        </div>
    );
};

export default TeamMembersPanel;
