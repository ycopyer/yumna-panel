import React, { useState, useEffect, useRef } from 'react';
import { X, Terminal as TerminalIcon, RefreshCw, Loader2 } from 'lucide-react';
import axios from 'axios';

interface TunnelTerminalProps {
    serverId: number;
    onClose: () => void;
    userId: number;
}

const TunnelTerminal: React.FC<TunnelTerminalProps> = ({ serverId, onClose, userId }) => {
    const [shellId, setShellId] = useState<string | null>(null);
    const [output, setOutput] = useState<string>('');
    const [input, setInput] = useState('');
    const [status, setStatus] = useState('connecting'); // connecting, connected, disconnected
    const terminalEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const pollingRef = useRef<any>(null); // Use any for NodeJS.Timeout vs Window.Timeout issues

    // Initial connection
    useEffect(() => {
        let mounted = true;
        const startSession = async () => {
            try {
                setOutput('Initializing secure tunnel shell session...\n');
                const res = await axios.post('/api/terminal/start', { serverId }, { headers: { 'x-user-id': userId } });
                if (mounted) {
                    setShellId(res.data.shellId);
                    setStatus('connected');
                    setOutput(prev => prev + 'Session established. Accessing remote shell...\n\n');
                    startPolling(res.data.shellId);
                }
            } catch (err: any) {
                if (mounted) {
                    const msg = err.response?.data?.error || err.message;
                    setOutput(prev => prev + `\nConnection Failed: ${msg}\n`);
                    setStatus('disconnected');
                }
            }
        };
        startSession();

        return () => {
            mounted = false;
            if (pollingRef.current) clearInterval(pollingRef.current);
            // Optionally send KILL signal here if we want to cleanup aggressively
        };
    }, [serverId, userId]);

    const startPolling = (sid: string) => {
        pollingRef.current = setInterval(async () => {
            try {
                const res = await axios.get(`/api/terminal/output?shellId=${sid}`, { headers: { 'x-user-id': userId } });
                if (res.data.events && res.data.events.length > 0) {
                    // Data from agent is base64 encoded
                    const newText = res.data.events.map((e: any) => {
                        try {
                            return atob(e.data);
                        } catch { return ''; }
                    }).join('');

                    setOutput(prev => prev + newText);
                }
            } catch (e) {
                console.error("Polling error", e);
            }
        }, 800);
    };

    useEffect(() => {
        terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [output]);

    const handleKeyDown = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (!shellId) return;
            // Send input + newline
            const cmd = input + '\n';
            // Optimistic update for better UX? No, let stdout handle echo
            try {
                await axios.post('/api/terminal/input', { serverId, shellId, data: cmd }, { headers: { 'x-user-id': userId } });
                setInput('');
            } catch (err) {
                console.error("Input failed", err);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/95 z-[200] flex flex-col font-mono text-sm animate-fade">
            <div className="bg-[#1e1e1e] border-b border-white/10 p-3 flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${status === 'connected' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        <TerminalIcon size={18} />
                    </div>
                    <div>
                        <h3 className="font-bold text-white tracking-wide">Remote Tunnel Shell</h3>
                        <p className="text-[10px] uppercase tracking-widest text-white/40">{status === 'connected' ? 'LIVE SECURE CONNECTION' : status}</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            <div
                className="flex-1 overflow-auto p-6 whitespace-pre-wrap break-all text-gray-300 font-mono text-sm selection:bg-emerald-500/30"
                onClick={() => inputRef.current?.focus()}
            >
                {output}
                <div ref={terminalEndRef} />
            </div>

            <div className="p-4 border-t border-white/10 bg-[#1e1e1e] flex items-center shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
                <span className="text-emerald-500 mr-3 font-bold">{'>'}</span>
                <input
                    ref={inputRef}
                    className="bg-transparent outline-none flex-1 text-white font-mono placeholder-white/20"
                    placeholder="Type command..."
                    value={input}
                    autoFocus
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                />
            </div>
        </div>
    );
};
export default TunnelTerminal;
