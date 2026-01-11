import React, { useState } from 'react';
import { X, Plus, Trash2, Box, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

interface CreateContainerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface Port {
    host: string;
    container: string;
}

interface EnvVar {
    key: string;
    value: string;
}

const CreateContainerModal: React.FC<CreateContainerModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [image, setImage] = useState('');
    const [ports, setPorts] = useState<Port[]>([]);
    const [env, setEnv] = useState<EnvVar[]>([]);
    const [loading, setLoading] = useState(false);

    const handleAddPort = () => {
        setPorts([...ports, { host: '', container: '' }]);
    };

    const handleRemovePort = (index: number) => {
        setPorts(ports.filter((_, i) => i !== index));
    };

    const handlePortChange = (index: number, field: 'host' | 'container', value: string) => {
        const updated = [...ports];
        updated[index][field] = value;
        setPorts(updated);
    };

    const handleAddEnv = () => {
        setEnv([...env, { key: '', value: '' }]);
    };

    const handleRemoveEnv = (index: number) => {
        setEnv(env.filter((_, i) => i !== index));
    };

    const handleEnvChange = (index: number, field: 'key' | 'value', value: string) => {
        const updated = [...env];
        updated[index][field] = value;
        setEnv(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim() || !image.trim()) {
            alert('Container name and image are required');
            return;
        }

        setLoading(true);
        try {
            await axios.post('/api/hosting/docker/containers', {
                name: name.trim(),
                image: image.trim(),
                ports: ports.filter(p => p.host && p.container).map(p => ({
                    host: parseInt(p.host),
                    container: parseInt(p.container)
                })),
                env: env.filter(e => e.key && e.value)
            }, {
                headers: { 'x-user-id': localStorage.getItem('userId') || '' }
            });

            // Reset form
            setName('');
            setImage('');
            setPorts([]);
            setEnv([]);

            onSuccess();
            onClose();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to create container');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="w-full max-w-3xl bg-[#0A0A0A] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                <Box size={20} className="text-blue-400" />
                            </div>
                            <h3 className="text-xl font-black text-white tracking-tight">Create Container</h3>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                        {/* Container Name */}
                        <div>
                            <label className="block text-xs font-black text-white/40 uppercase tracking-widest mb-2">
                                Container Name *
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="my-container"
                                className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 px-4 text-sm font-medium text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-white/20"
                                required
                            />
                        </div>

                        {/* Image */}
                        <div>
                            <label className="block text-xs font-black text-white/40 uppercase tracking-widest mb-2">
                                Docker Image *
                            </label>
                            <input
                                type="text"
                                value={image}
                                onChange={(e) => setImage(e.target.value)}
                                placeholder="nginx:latest"
                                className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 px-4 text-sm font-medium text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-white/20"
                                required
                            />
                            <p className="text-[10px] text-white/30 mt-2 italic">
                                Image will be pulled automatically if not found locally
                            </p>
                        </div>

                        {/* Port Mappings */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-xs font-black text-white/40 uppercase tracking-widest">
                                    Port Mappings
                                </label>
                                <button
                                    type="button"
                                    onClick={handleAddPort}
                                    className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
                                >
                                    <Plus size={12} /> Add Port
                                </button>
                            </div>
                            <div className="space-y-2">
                                {ports.map((port, index) => (
                                    <div key={index} className="flex gap-2 items-center">
                                        <input
                                            type="number"
                                            value={port.host}
                                            onChange={(e) => handlePortChange(index, 'host', e.target.value)}
                                            placeholder="Host Port (e.g., 8080)"
                                            className="flex-1 bg-white/[0.02] border border-white/10 rounded-xl py-2 px-3 text-sm font-medium text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-white/20"
                                        />
                                        <span className="text-white/40">→</span>
                                        <input
                                            type="number"
                                            value={port.container}
                                            onChange={(e) => handlePortChange(index, 'container', e.target.value)}
                                            placeholder="Container Port (e.g., 80)"
                                            className="flex-1 bg-white/[0.02] border border-white/10 rounded-xl py-2 px-3 text-sm font-medium text-white focus:border-blue-500/50 outline-none transition-all placeholder:text-white/20"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemovePort(index)}
                                            className="p-2 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-lg transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                {ports.length === 0 && (
                                    <p className="text-xs text-white/20 italic text-center py-4">No port mappings configured</p>
                                )}
                            </div>
                        </div>

                        {/* Environment Variables */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-xs font-black text-white/40 uppercase tracking-widest">
                                    Environment Variables
                                </label>
                                <button
                                    type="button"
                                    onClick={handleAddEnv}
                                    className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
                                >
                                    <Plus size={12} /> Add Variable
                                </button>
                            </div>
                            <div className="space-y-2">
                                {env.map((envVar, index) => (
                                    <div key={index} className="flex gap-2 items-center">
                                        <input
                                            type="text"
                                            value={envVar.key}
                                            onChange={(e) => handleEnvChange(index, 'key', e.target.value)}
                                            placeholder="KEY"
                                            className="flex-1 bg-white/[0.02] border border-white/10 rounded-xl py-2 px-3 text-sm font-medium text-white focus:border-emerald-500/50 outline-none transition-all placeholder:text-white/20"
                                        />
                                        <span className="text-white/40">=</span>
                                        <input
                                            type="text"
                                            value={envVar.value}
                                            onChange={(e) => handleEnvChange(index, 'value', e.target.value)}
                                            placeholder="value"
                                            className="flex-1 bg-white/[0.02] border border-white/10 rounded-xl py-2 px-3 text-sm font-medium text-white focus:border-emerald-500/50 outline-none transition-all placeholder:text-white/20"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveEnv(index)}
                                            className="p-2 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-lg transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                {env.length === 0 && (
                                    <p className="text-xs text-white/20 italic text-center py-4">No environment variables configured</p>
                                )}
                            </div>
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="p-6 border-t border-white/5 flex items-center justify-end gap-3 bg-white/[0.02]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5 rounded-xl text-sm font-bold transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Box size={16} />
                                    Create Container
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default CreateContainerModal;
