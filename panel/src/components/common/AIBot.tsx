import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Bot, Send, X, Loader2, Sparkles, User, ShieldCheck } from 'lucide-react';

const AIBot: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai', text: string, suggestions?: string[] }>>([
        {
            role: 'ai',
            text: "Halo! Saya Asisten AI Yumna. Ada yang bisa saya bantu hari ini?",
            suggestions: ["Bagaimana cara tambah website?", "Cara ganti versi PHP?", "Lupa password admin?"]
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (textOverride?: string) => {
        const userMsg = textOverride || input;
        if (!userMsg.trim() || loading) return;

        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            const res = await axios.post('/api/ai/ask', { prompt: userMsg });
            // Handle both structured {answer, suggestions} and legacy string responses
            const answerText = typeof res.data === 'string' ? res.data : (res.data.answer || "No response received.");
            const suggestionsList = res.data.suggestions || [];

            setMessages(prev => [...prev, {
                role: 'ai',
                text: answerText,
                suggestions: suggestionsList
            }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'ai', text: "Maaf, terjadi masalah koneksi ke pusat data." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', width: '420px', height: '640px', zIndex: 2000 }} className="animate-fade-up">
            <div className="glass h-full flex flex-col rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden" style={{ background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(32px)' }}>
                {/* Header */}
                <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, transparent 100%)' }}>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/20">
                            <Bot className="text-white" size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Yumna AI</h3>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                <p className="text-[10px] font-bold text-white/40 uppercase">Expert Mode Active</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* Messages */}
                <div ref={scrollRef} style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }} className="custom-scrollbar">
                    {messages.map((m, i) => (
                        <div key={i} className="flex flex-col gap-3">
                            <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-4 rounded-3xl text-[13px] leading-relaxed shadow-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/5 text-white/80 border border-white/10 rounded-tl-none'}`}>
                                    {m.text}
                                </div>
                            </div>

                            {/* Dynamic Suggestions for AI messages */}
                            {!loading && m.role === 'ai' && m.suggestions && m.suggestions.length > 0 && i === messages.length - 1 && (
                                <div className="flex flex-col gap-2 ml-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Pertanyaan Berkaitan:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {m.suggestions.map((s, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleSend(s)}
                                                className="px-4 py-2 bg-white/5 hover:bg-indigo-500/20 border border-white/10 hover:border-indigo-500/40 rounded-full text-[11px] text-white/60 hover:text-white transition-all text-left"
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-white/5 border border-white/10 p-4 rounded-3xl rounded-tl-none flex items-center gap-3">
                                <Loader2 className="animate-spin text-indigo-400" size={14} />
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Searching Knowledge Base...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input */}
                <div style={{ padding: '24px', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 focus-within:border-indigo-500/50 transition-all">
                        <input
                            type="text"
                            placeholder="Tanya asisten tentang server..."
                            className="flex-1 bg-transparent border-none outline-none text-sm text-white py-2 placeholder:text-white/20"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <button onClick={() => handleSend()} className="p-2 bg-indigo-500 hover:bg-indigo-400 rounded-xl text-white transition-all">
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIBot;
