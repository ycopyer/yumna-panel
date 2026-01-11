import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Bot, Send, X, Loader2, Sparkles, User, ShieldCheck } from 'lucide-react';

const AIBot: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai', text: string }>>([
        { role: 'ai', text: "Hello! I'm your Yumna AI Assistant. How can I help you manage your servers today?" }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            const res = await axios.post('/api/ai/ask', { prompt: userMsg });
            setMessages(prev => [...prev, { role: 'ai', text: res.data.answer }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I'm having trouble connecting to the brain center right now." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', width: '400px', height: '600px', zIndex: 2000 }} className="animate-fade-up">
            <div className="glass h-full flex flex-col rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden" style={{ background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(32px)' }}>
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
                                <p className="text-[10px] font-bold text-white/40 uppercase">Online & Learning</p>
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
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-4 rounded-3xl text-[13px] leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/5 text-white/80 border border-white/10 rounded-tl-none'}`}>
                                {m.text}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-white/5 border border-white/10 p-4 rounded-3xl rounded-tl-none flex items-center gap-3">
                                <Loader2 className="animate-spin text-indigo-400" size={14} />
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Thinking...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input */}
                <div style={{ padding: '24px', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 focus-within:border-indigo-500/50 transition-all">
                        <input
                            type="text"
                            placeholder="Type a message..."
                            className="flex-1 bg-transparent border-none outline-none text-sm text-white py-2 placeholder:text-white/20"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <button onClick={handleSend} className="p-2 bg-indigo-500 hover:bg-indigo-400 rounded-xl text-white transition-all">
                            <Send size={18} />
                        </button>
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-4 opacity-40">
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-white tracking-widest">
                            <Sparkles size={10} className="text-amber-400" /> Powered by Gemini
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIBot;
