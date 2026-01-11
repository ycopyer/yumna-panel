import React, { useState, useEffect } from 'react';
import { X, Save, RotateCw, Maximize, Scissors, Wand2, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';

interface ImageEditorModalProps {
    filePath: string;
    onClose: () => void;
    onSaveSuccess?: () => void;
}

const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ filePath, onClose, onSaveSuccess }) => {
    const [info, setInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [operations, setOperations] = useState<any[]>([]);
    const [previewUrl, setPreviewUrl] = useState('');

    const [resizeWidth, setResizeWidth] = useState<number>(0);
    const [resizeHeight, setResizeHeight] = useState<number>(0);

    useEffect(() => {
        fetchInfo();
        setPreviewUrl(`/api/preview?path=${encodeURIComponent(filePath)}&t=${Date.now()}`);
    }, [filePath]);

    const fetchInfo = async () => {
        try {
            const res = await axios.get('/api/image/info', { params: { path: filePath } });
            setInfo(res.data);
            setResizeWidth(res.data.width);
            setResizeHeight(res.data.height);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const applyOperation = (op: any) => {
        setOperations([...operations, op]);
    };

    const handleSave = async (saveAsNew: boolean = false) => {
        setSaving(true);
        try {
            const finalOps = [...operations];
            if (resizeWidth !== info.width || resizeHeight !== info.height) {
                finalOps.push({ type: 'resize', width: resizeWidth, height: resizeHeight });
            }

            await axios.post('/api/image/edit', {
                path: filePath,
                operations: finalOps,
                saveAsNew
            });

            alert('Image saved successfully');
            if (onSaveSuccess) onSaveSuccess();
            onClose();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl animate-fade" onClick={onClose} />

            <div className="relative w-full max-w-6xl h-[90vh] bg-[#0f172a] rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden animate-zoom flex flex-col">
                {/* Header */}
                <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                            <Wand2 size={28} className="text-emerald-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight italic">Studio Visuals</h2>
                            <div className="flex items-center gap-3 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mt-1">
                                <span>{info?.format}</span>
                                <span className="w-1 h-1 rounded-full bg-white/20" />
                                <span>{info?.width}x{info?.height}</span>
                                <span className="w-1 h-1 rounded-full bg-white/20" />
                                <span className="text-emerald-500/60">{filePath.split('/').pop()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => handleSave(true)}
                            disabled={saving}
                            className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-2xl transition-all border border-white/10 text-[11px] font-black uppercase tracking-widest flex items-center gap-2"
                        >
                            Save As Copy
                        </button>
                        <button
                            onClick={() => handleSave(false)}
                            disabled={saving}
                            className="px-8 py-3 bg-emerald-500 text-white rounded-2xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all text-[11px] font-black uppercase tracking-widest flex items-center gap-2"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
                        </button>
                        <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl transition-all border border-white/5">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Toolbar */}
                    <div className="w-80 border-r border-white/5 bg-white/[0.01] p-8 flex flex-col gap-8 custom-scrollbar overflow-y-auto">
                        <section>
                            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <Maximize size={14} /> Geometry
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-white/40 mb-2 block uppercase">Width (px)</label>
                                    <input
                                        type="number"
                                        value={resizeWidth}
                                        onChange={e => setResizeWidth(parseInt(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-emerald-500/50 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-white/40 mb-2 block uppercase">Height (px)</label>
                                    <input
                                        type="number"
                                        value={resizeHeight}
                                        onChange={e => setResizeHeight(parseInt(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-emerald-500/50 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <RefreshCw size={14} /> Transformations
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => applyOperation({ type: 'rotate', angle: 90 })} className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-white/60 hover:text-white transition-all flex flex-col items-center gap-2">
                                    <RotateCw size={20} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Rotate 90°</span>
                                </button>
                                <button onClick={() => applyOperation({ type: 'flip' })} className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-white/60 hover:text-white transition-all flex flex-col items-center gap-2">
                                    <Maximize size={20} className="rotate-90" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Flip V</span>
                                </button>
                                <button onClick={() => applyOperation({ type: 'flop' })} className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-white/60 hover:text-white transition-all flex flex-col items-center gap-2">
                                    <Maximize size={20} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Flip H</span>
                                </button>
                                <button onClick={() => applyOperation({ type: 'grayscale' })} className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-white/60 hover:text-white transition-all flex flex-col items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-white/20 border border-white/40" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">B&W</span>
                                </button>
                            </div>
                        </section>

                        <section className="mt-auto">
                            <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                                <p className="text-[9px] font-bold text-emerald-500/60 leading-relaxed uppercase tracking-widest">
                                    Queue: {operations.length} operations pending.
                                </p>
                                {operations.length > 0 && (
                                    <button onClick={() => setOperations([])} className="mt-3 text-[9px] font-black text-red-500/60 hover:text-red-500 uppercase tracking-[0.2em] transition-all">
                                        Clear Stack
                                    </button>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Canvas Area */}
                    <div className="flex-1 bg-black/40 flex items-center justify-center p-12 relative overflow-hidden pattern-dots">
                        {loading ? (
                            <Loader2 size={48} className="text-emerald-500 animate-spin" />
                        ) : (
                            <div className="relative group">
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="max-w-full max-h-[60vh] rounded-2xl shadow-2xl border border-white/10"
                                    style={{
                                        filter: operations.some(o => o.type === 'grayscale') ? 'grayscale(1)' : 'none'
                                    }}
                                />
                                <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-emerald-500/20 group-hover:border-emerald-500/40 pointer-events-none transition-all" />
                            </div>
                        )}

                        {/* Status Float */}
                        <div className="absolute bottom-8 left-8 right-8 flex justify-center pointer-events-none">
                            <div className="px-6 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[9px] font-black text-white/60 uppercase tracking-[0.3em]">
                                Non-destructive Preview Mode
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageEditorModal;
