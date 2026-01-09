import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, X, Loader2, Power } from 'lucide-react';
import axios from 'axios';

interface TerminalProps {
    onClose: () => void;
    sshAccountId?: number;
    contextTitle?: string;
}

const Terminal: React.FC<TerminalProps> = ({ onClose, sshAccountId, contextTitle }) => {
    const [history, setHistory] = useState<{ type: 'input' | 'output', content: string }[]>([]);
    const [input, setInput] = useState('');
    const [cwd, setCwd] = useState('~');
    const [loading, setLoading] = useState(false);
    const terminalEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const executeCommand = async (cmd: string) => {
        if (!cmd.trim()) return;

        setHistory(prev => [...prev, { type: 'input', content: `${cwd} $ ${cmd}` }]);
        setInput('');
        setLoading(true);

        try {
            const response = await axios.post('/api/terminal/exec', {
                command: cmd,
                sshAccountId: sshAccountId
            });
            const { output, cwd: newCwd } = response.data;

            if (newCwd) setCwd(newCwd);
            if (output) {
                setHistory(prev => [...prev, { type: 'output', content: output }]);
            }
        } catch (err: any) {
            setHistory(prev => [...prev, {
                type: 'output',
                content: `Error: ${err.response?.data?.error || err.message}`
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            executeCommand(input);
        }
    };

    const clearTerminal = () => {
        setHistory([]);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade">
            <div className="w-full max-w-5xl h-[80vh] bg-[#1e1e1e] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#252526]">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${sshAccountId ? 'bg-blue-500/20 border-blue-500/30' : 'bg-emerald-500/20 border-emerald-500/30'}`}>
                            <TerminalIcon className={sshAccountId ? 'text-blue-400' : 'text-emerald-500'} size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white">{contextTitle || 'System Terminal'}</h2>
                            <p className="text-xs text-white/40 font-bold">{sshAccountId ? 'Restricted Shell' : 'Admin Shell Access'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={clearTerminal}
                            className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold transition-all"
                        >
                            Clear
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-500 transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Terminal Output */}
                <div className="flex-1 overflow-y-auto p-4 font-mono text-sm custom-scrollbar bg-[#1e1e1e]">
                    <div className="space-y-1">
                        {history.map((item, idx) => (
                            <div key={idx} className={item.type === 'input' ? 'text-emerald-400' : 'text-white/80'}>
                                {item.type === 'input' ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-blue-400">{item.content.split('$')[0]}$</span>
                                        <span>{item.content.split('$').slice(1).join('$')}</span>
                                    </div>
                                ) : (
                                    <pre className="whitespace-pre-wrap break-words">{item.content}</pre>
                                )}
                            </div>
                        ))}
                        <div ref={terminalEndRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-white/10 bg-[#252526]">
                    <div className="flex items-center gap-2 font-mono text-sm">
                        <span className="text-blue-400 font-bold">{cwd} $</span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                            className="flex-1 bg-transparent text-emerald-400 outline-none placeholder-white/20"
                            placeholder={loading ? 'Executing...' : 'Type command...'}
                            autoComplete="off"
                        />
                        {loading && <Loader2 size={16} className="text-emerald-500 animate-spin" />}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-white/30 font-bold">
                        <Power size={10} />
                        <span>Press Enter to execute • Type 'clear' or use Clear button to reset</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Terminal;
