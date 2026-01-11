import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, User, Clock, Loader2, Smile, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

interface CommentsPanelProps {
    websiteId: number;
}

const CommentsPanel: React.FC<CommentsPanelProps> = ({ websiteId }) => {
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [targetType, setTargetType] = useState('general');
    const [targetId, setTargetId] = useState('website');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchComments();
    }, [websiteId, targetType, targetId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [comments]);

    const fetchComments = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/hosting/collaboration/websites/${websiteId}/comments`, {
                params: {
                    target_type: targetType,
                    target_id: targetId
                },
                headers: { 'x-user-id': localStorage.getItem('userId') || '' }
            });
            setComments(response.data.comments);
        } catch (error) {
            console.error('Error fetching comments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || submitting) return;

        try {
            setSubmitting(true);
            await axios.post(`/api/hosting/collaboration/websites/${websiteId}/comments`, {
                target_type: targetType,
                target_id: targetId,
                comment: newComment
            }, { headers: { 'x-user-id': localStorage.getItem('userId') || '' } });

            setNewComment('');
            fetchComments();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to post comment');
        } finally {
            setSubmitting(false);
        }
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-[600px] max-w-4xl mx-auto bg-black/20 rounded-[32px] border border-white/5 overflow-hidden shadow-2xl">
            {/* Thread Header */}
            <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <MessageSquare size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none">Security Channel</h3>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-tighter mt-1">{comments.length} transmitted signals</p>
                    </div>
                </div>
            </div>

            {/* Discussion Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10"
            >
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em]">Decrypting Comm Stream</p>
                    </div>
                ) : comments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-40">
                        <MessageSquare size={48} className="text-white/10" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Encryption active. Ready for input.</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {comments.map((comment, idx) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.3 }}
                                key={comment.id}
                                className={`flex items-start gap-4 ${comment.username === localStorage.getItem('username') ? 'flex-row-reverse' : ''}`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-black shadow-inner ${comment.username === localStorage.getItem('username') ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/40'}`}>
                                    {comment.username.charAt(0).toUpperCase()}
                                </div>
                                <div className={`max-w-[80%] space-y-1 ${comment.username === localStorage.getItem('username') ? 'items-end' : 'items-start'}`}>
                                    <div className={`flex items-center gap-2 mb-1 ${comment.username === localStorage.getItem('username') ? 'flex-row-reverse' : ''}`}>
                                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{comment.username}</span>
                                        <span className="text-[9px] font-bold text-white/10 tabular-nums">{formatTime(comment.created_at)}</span>
                                    </div>
                                    <div className={`p-4 rounded-2xl text-sm font-medium leading-relaxed ${comment.username === localStorage.getItem('username') ? 'bg-blue-600/90 text-white rounded-tr-none' : 'bg-white/5 text-white/80 border border-white/5 rounded-tl-none'}`}>
                                        {comment.comment}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* Input Module */}
            <div className="p-6 bg-white/[0.02] border-t border-white/5">
                <form onSubmit={handleSubmitComment} className="relative group">
                    <textarea
                        rows={1}
                        placeholder="Push message to channel..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmitComment(e);
                            }
                        }}
                        className="w-full bg-black/40 border border-white/5 rounded-[20px] py-4 pl-6 pr-32 text-sm text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-white/10 resize-none min-h-[56px] max-h-[150px] scrollbar-hide"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button type="button" className="p-2 text-white/20 hover:text-white/40 transition-colors">
                            <Paperclip size={18} />
                        </button>
                        <button type="button" className="p-2 text-white/20 hover:text-white/40 transition-colors">
                            <Smile size={18} />
                        </button>
                        <button
                            type="submit"
                            disabled={!newComment.trim() || submitting}
                            className={`p-3 rounded-xl transition-all shadow-lg ${!newComment.trim() || submitting ? 'bg-white/5 text-white/10' : 'bg-blue-600 text-white shadow-blue-600/20 active:scale-95'}`}
                        >
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                    </div>
                </form>
                <p className="mt-4 text-center text-[9px] font-bold text-white/10 uppercase tracking-[0.2em] italic">Press Enter to transmit • Shift+Enter for new line</p>
            </div>
        </div>
    );
};

export default CommentsPanel;
