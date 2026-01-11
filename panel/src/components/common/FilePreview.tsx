import React, { useState, useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2, FileText, Edit, Save, Loader2 } from 'lucide-react';
import axios from 'axios';
import Editor from '@monaco-editor/react';

interface FilePreviewProps {
    fileUrl: string;
    fileName: string;
    fileType: 'image' | 'video' | 'pdf' | 'text';
    onClose: () => void;
    onDownload?: () => void;
    onSave?: (content: string) => Promise<boolean>;
    initialEditMode?: boolean;
    isFullscreen?: boolean;
}

const getLanguageFromFileName = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'js': case 'jsx': return 'javascript';
        case 'ts': case 'tsx': return 'typescript';
        case 'css': return 'css';
        case 'html': return 'html';
        case 'json': return 'json';
        case 'php': return 'php';
        case 'py': return 'python';
        case 'java': return 'java';
        case 'c': return 'c';
        case 'cpp': return 'cpp';
        case 'sql': return 'sql';
        case 'md': return 'markdown';
        case 'xml': return 'xml';
        case 'yaml': case 'yml': return 'yaml';
        case 'sh': return 'shell';
        default: return 'plaintext';
    }
};

const FilePreview: React.FC<FilePreviewProps> = ({ fileUrl, fileName, fileType, onClose, onDownload, onSave, initialEditMode, isFullscreen: propFullscreen }) => {
    const [zoom, setZoom] = useState(100);
    const [rotation, setRotation] = useState(0);
    const [internalFullscreen, setInternalFullscreen] = useState(false);

    const isFullscreen = propFullscreen || internalFullscreen;
    const setIsFullscreen = setInternalFullscreen;
    const [textContent, setTextContent] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Edit state
    const [isEditing, setIsEditing] = useState(initialEditMode || false);
    const [editContent, setEditContent] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        console.log('[FilePreview] mounted:', { fileName, fileType, initialEditMode });
    }, [fileName, fileType, initialEditMode]);

    useEffect(() => {
        setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    }, []);

    useEffect(() => {
        if (fileType === 'text') {
            loadTextFile();
        }
    }, [fileUrl, fileType]);

    const loadTextFile = async () => {
        setLoading(true);
        try {
            const response = await axios.get(fileUrl, { responseType: 'text' });
            setTextContent(response.data);
            setEditContent(response.data);
        } catch (error) {
            console.error('Failed to load text file:', error);
            setTextContent('Failed to load file content.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!onSave) return;
        setSaving(true);
        const success = await onSave(editContent);
        if (success) {
            setTextContent(editContent);
            setIsEditing(false);
        }
        setSaving(false);
    };

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));
    const handleRotate = () => setRotation(prev => (prev + 90) % 360);
    const handleReset = () => {
        setZoom(100);
        setRotation(0);
    };

    const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

    return (
        <div
            style={{
                position: propFullscreen ? 'relative' : 'fixed',
                inset: 0,
                background: propFullscreen ? 'transparent' : 'rgba(0, 0, 0, 0.95)',
                backdropFilter: propFullscreen ? 'none' : 'blur(8px)',
                zIndex: propFullscreen ? 1 : 1000,
                display: 'flex',
                flexDirection: 'column',
                padding: isFullscreen ? 0 : '24px',
                height: '100%'
            }}
        >
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                padding: isFullscreen ? '16px 24px' : '0',
                background: isFullscreen ? 'rgba(0, 0, 0, 0.8)' : 'transparent'
            }}>
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                        {fileName} {isEditing && <span className="text-yellow-400 text-sm font-normal">(Editing)</span>}
                    </h3>
                    <p style={{ fontSize: '13px', color: '#94a3b8' }}>
                        {fileType.toUpperCase()} Preview
                    </p>
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>

                    {fileType === 'text' && onSave && !isEditing && (
                        <button
                            onClick={() => { setIsEditing(true); setEditContent(textContent); }}
                            className="btn-primary"
                            style={{ padding: '8px 16px', background: '#6366f1' }}
                        >
                            <Edit size={18} />
                            <span className="hidden sm:inline" style={{ marginLeft: '8px' }}>Edit</span>
                        </button>
                    )}

                    {fileType === 'text' && isEditing && (
                        <>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="btn-primary"
                                style={{ padding: '8px 16px', background: '#10b981' }}
                            >
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                <span className="hidden sm:inline" style={{ marginLeft: '8px' }}>{saving ? 'Saving...' : 'Save'}</span>
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                disabled={saving}
                                className="btn-primary"
                                style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)' }}
                            >
                                Cancel
                            </button>
                        </>
                    )}

                    {fileType === 'image' && (
                        <>
                            <button
                                onClick={handleZoomOut}
                                className="btn-primary"
                                style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.1)' }}
                                title="Zoom Out"
                            >
                                <ZoomOut size={18} />
                            </button>
                            <span style={{ fontSize: '13px', color: '#94a3b8', minWidth: '50px', textAlign: 'center' }}>
                                {zoom}%
                            </span>
                            <button
                                onClick={handleZoomIn}
                                className="btn-primary"
                                style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.1)' }}
                                title="Zoom In"
                            >
                                <ZoomIn size={18} />
                            </button>
                            <button
                                onClick={handleRotate}
                                className="btn-primary"
                                style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.1)' }}
                                title="Rotate"
                            >
                                <RotateCw size={18} />
                            </button>
                        </>
                    )}

                    {fileType === 'text' && (
                        <>
                            <button
                                onClick={handleZoomOut}
                                className="btn-primary"
                                style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.1)' }}
                                title="Decrease Font Size"
                            >
                                <ZoomOut size={18} />
                            </button>
                            <span style={{ fontSize: '13px', color: '#94a3b8', minWidth: '50px', textAlign: 'center' }}>
                                {zoom}%
                            </span>
                            <button
                                onClick={handleZoomIn}
                                className="btn-primary"
                                style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.1)' }}
                                title="Increase Font Size"
                            >
                                <ZoomIn size={18} />
                            </button>
                        </>
                    )}

                    <button
                        onClick={toggleFullscreen}
                        className="btn-primary"
                        style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.1)' }}
                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    >
                        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>

                    {onDownload && (
                        <button
                            onClick={onDownload}
                            className="btn-primary"
                            style={{ padding: '8px 16px', background: '#10b981' }}
                        >
                            <Download size={18} />
                            <span className="hidden sm:inline" style={{ marginLeft: '8px' }}>Download</span>
                        </button>
                    )}

                    {fileType === 'pdf' && isMobile && (
                        <button
                            onClick={() => window.open(fileUrl, '_blank')}
                            className="btn-primary"
                            style={{ padding: '8px 16px', background: '#6366f1' }}
                        >
                            <Maximize2 size={18} />
                            <span style={{ marginLeft: '8px' }}>Open Fullscreen</span>
                        </button>
                    )}

                    <button
                        onClick={onClose}
                        className="btn-primary"
                        style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.2)' }}
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Preview Content */}
            <div style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden', // Changed from auto to hidden for Monaco
                position: 'relative'
            }}>
                {fileType === 'image' && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '100%',
                        height: '100%',
                        padding: '20px',
                        overflow: 'auto'
                    }}>
                        <img
                            src={fileUrl}
                            alt={fileName}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                                transition: 'transform 0.3s ease',
                                borderRadius: '8px',
                                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
                            }}
                        />
                    </div>
                )}

                {fileType === 'video' && (
                    <video
                        src={fileUrl}
                        controls
                        autoPlay
                        style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            borderRadius: isFullscreen ? '0' : '12px',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
                        }}
                    >
                        Your browser does not support the video tag.
                    </video>
                )}

                {fileType === 'pdf' && (
                    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                        {isMobile && (
                            <div className="md:hidden" style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(15,23,42,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
                                <FileText size={64} className="text-indigo-500 mb-4 opacity-50" />
                                <h4 className="text-white font-bold mb-2">PDF Viewer</h4>
                                <p className="text-slate-400 text-sm mb-6">Mobile browsers often limit inline PDF viewing. For the best experience, open it directly.</p>
                                <button
                                    onClick={() => window.open(fileUrl, '_blank')}
                                    className="btn-primary"
                                    style={{ padding: '12px 24px', fontSize: '16px' }}
                                >
                                    Open PDF Directly
                                </button>
                            </div>
                        )}
                        <iframe
                            src={fileUrl}
                            style={{
                                width: '100%',
                                height: '100%',
                                border: 'none',
                                borderRadius: isFullscreen ? '0' : '12px',
                                background: 'white'
                            }}
                            title={fileName}
                        />
                    </div>
                )}

                {fileType === 'text' && (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        padding: isFullscreen ? '0' : '20px',
                        overflow: 'hidden'
                    }}>
                        <div className="glass" style={{
                            padding: '0', // No padding for editor
                            borderRadius: isFullscreen ? '0' : '16px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}>
                            {loading ? (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    color: '#94a3b8'
                                }}>
                                    <FileText size={48} style={{ marginRight: '12px' }} />
                                    <span>Loading text file...</span>
                                </div>
                            ) : (
                                <Editor
                                    height="100%"
                                    defaultLanguage={getLanguageFromFileName(fileName)}
                                    value={isEditing ? editContent : textContent}
                                    theme="vs-dark"
                                    onChange={(value) => setEditContent(value || '')}
                                    options={{
                                        readOnly: !isEditing,
                                        minimap: { enabled: true },
                                        fontSize: 14 * (zoom / 100),
                                        wordWrap: 'on',
                                        scrollBeyondLastLine: false,
                                        automaticLayout: true,
                                        padding: { top: 20, bottom: 20 },
                                        fontFamily: 'Consolas, Monaco, "Courier New", monospace'
                                    }}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Keyboard shortcuts hint */}
            {fileType === 'image' && !isFullscreen && (
                <div style={{
                    marginTop: '16px',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#64748b',
                    padding: '8px'
                }}>
                    <span style={{ marginRight: '16px' }}>💡 Tip: Use controls to zoom and rotate</span>
                </div>
            )}

            {fileType === 'text' && !isFullscreen && (
                <div style={{
                    marginTop: '8px',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#64748b',
                }}>
                    <span>💡 Monaco Editor: Use Ctrl+F to find, Ctrl+Z to undo</span>
                </div>
            )}

        </div>
    );
};

export default FilePreview;
