import React, { useState, useEffect } from 'react';
import { X, Save, Edit, Loader2, FileText, ChevronLeft, ChevronRight, Layout, Maximize2, Minimize2 } from 'lucide-react';
import FilePreview from './FilePreview';

interface Tab {
    file: any;
    url: string;
    type: string;
    editMode: boolean;
}

interface MultiFileEditorProps {
    tabs: Tab[];
    activeTabId: string | null;
    setActiveTabId: (id: string | null) => void;
    setOpenTabs: (tabs: any) => void;
    onSave: (file: any, content: string) => Promise<boolean>;
}

const MultiFileEditor: React.FC<MultiFileEditorProps> = ({ tabs, activeTabId, setActiveTabId, setOpenTabs, onSave }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);

    const closeTab = (id: string) => {
        const newTabs = tabs.filter(t => (t.file.path || t.file.name) !== id);
        setOpenTabs(newTabs);
        if (activeTabId === id) {
            setActiveTabId(newTabs.length > 0 ? (newTabs[newTabs.length - 1].file.path || newTabs[newTabs.length - 1].file.name) : null);
        }
    };

    const activeTab = tabs.find(t => (t.file.path || t.file.name) === activeTabId) || tabs[0];

    if (tabs.length === 0) return null;

    return (
        <div className={`fixed inset-0 z-[1000] flex flex-col bg-black/95 backdrop-blur-xl animate-fade ${isFullscreen ? 'p-0' : 'p-6'}`}>
            {/* Tab Bar */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar py-2">
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10">
                    {tabs.map((tab) => {
                        const id = tab.file.path || tab.file.name;
                        const isActive = activeTabId === id;
                        return (
                            <div
                                key={id}
                                onClick={() => setActiveTabId(id)}
                                className={`group flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-300 min-w-[140px] max-w-[240px] border ${isActive
                                        ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20'
                                        : 'bg-white/5 text-white/40 border-transparent hover:bg-white/10 hover:text-white/60'
                                    }`}
                            >
                                <FileText size={14} className={isActive ? 'text-white' : 'text-indigo-400/40'} />
                                <span className="text-[11px] font-black truncate flex-1 uppercase tracking-wider">{tab.file.name}</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); closeTab(id); }}
                                    className={`p-1 rounded-md transition-all ${isActive ? 'hover:bg-white/20 text-white' : 'hover:bg-white/10 text-white/20 group-hover:text-white/40'}`}
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center gap-2 ml-auto">
                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl transition-all border border-white/5"
                    >
                        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                    </button>
                    <button
                        onClick={() => setOpenTabs([])}
                        className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl transition-all border border-red-500/10"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Active Editor */}
            <div className="flex-1 relative rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl">
                {tabs.map(tab => (
                    <div
                        key={tab.file.path || tab.file.name}
                        className={`absolute inset-0 transition-opacity duration-300 ${(tab.file.path || tab.file.name) === activeTabId ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                    >
                        <FilePreview
                            fileUrl={tab.url}
                            fileName={tab.file.name}
                            fileType={tab.type as any}
                            onClose={() => closeTab(tab.file.path || tab.file.name)}
                            onSave={(content) => onSave(tab.file, content)}
                            initialEditMode={tab.editMode}
                            isFullscreen={true} // Embedded mode
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MultiFileEditor;
