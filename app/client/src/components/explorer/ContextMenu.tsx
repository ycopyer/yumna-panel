import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    Download, Share2, Edit3, Trash2, Info, ExternalLink,
    Star, CornerUpRight, Copy, CheckCircle2, Archive, FileEdit
} from 'lucide-react';

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    file: any;
    user: any;
    activeView: string;
    isFavorite: boolean;
    onAction: (action: string, file: any) => void;
    isPreviewable: (name: string) => boolean;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
    x, y, onClose, file, user, activeView, isFavorite, onAction, isPreviewable
}) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const MenuItem = ({ icon: Icon, label, onClick, danger = false, disabled = false }: any) => (
        <button
            disabled={disabled}
            onClick={(e) => {
                e.stopPropagation();
                if (!disabled) {
                    onClick();
                    onClose();
                }
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors
                ${disabled ? 'opacity-40 cursor-not-allowed' :
                    danger ? 'text-rose-500 hover:bg-rose-500/10' : 'text-[var(--text-main)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]'}
            `}
        >
            <Icon size={18} />
            <span className="flex-1 text-left">{label}</span>
        </button>
    );

    const Divider = () => <div className="h-px bg-[var(--border)] my-1.5 mx-2 opacity-50" />;

    const isArchive = file.name.toLowerCase().endsWith('.zip') ||
        file.name.toLowerCase().endsWith('.tar.gz') ||
        file.name.toLowerCase().endsWith('.tar') ||
        file.name.toLowerCase().endsWith('.7z') ||
        file.name.toLowerCase().endsWith('.rar');

    const isTextFile = ['txt', 'md', 'log', 'json', 'xml', 'csv', 'js', 'ts', 'tsx', 'jsx', 'css', 'html', 'php', 'py', 'java', 'c', 'cpp', 'h', 'sql']
        .includes(file.name.split('.').pop()?.toLowerCase() || '');

    // Use portal to render at root level to avoid parent transform/positioning issues
    return createPortal(
        <div
            ref={menuRef}
            className="fixed z-[9999] min-w-[240px] glass bg-[var(--bg-dark)]/90 py-2 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-[var(--border)] animate-fade"
            style={{
                left: `${Math.min(x + 2, window.innerWidth - 250)}px`,
                top: `${Math.min(y + 2, window.innerHeight - 450)}px`, // Adjusted bottom offset
                transformOrigin: 'top left',
                backdropFilter: 'blur(20px)'
            }}
            onContextMenu={(e) => e.preventDefault()}
        >
            <div className="px-4 py-2 mb-1 border-b border-[var(--border)] opacity-60">
                <p className="text-[10px] font-black uppercase tracking-widest truncate">{file.name}</p>
            </div>

            {isPreviewable(file.name) && (
                <MenuItem
                    icon={ExternalLink}
                    label="Preview"
                    onClick={() => onAction('preview', file)}
                />
            )}

            {isTextFile && user.role !== 'viewer' && (
                <MenuItem
                    icon={FileEdit}
                    label="Edit Content"
                    onClick={() => onAction('edit-content', file)}
                />
            )}

            {file.displayPath && (
                <MenuItem
                    icon={CornerUpRight}
                    label="Go to file location"
                    onClick={() => onAction('goto', file)}
                />
            )}

            <MenuItem
                icon={Download}
                label="Download"
                onClick={() => onAction('download', file)}
            />

            {isArchive && user.role !== 'viewer' && (
                <MenuItem
                    icon={Archive}
                    label="Extract Here"
                    onClick={() => onAction('extract', file)}
                />
            )}

            <MenuItem
                icon={Star}
                label={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                onClick={() => onAction('favorite', file)}
            />

            <Divider />

            {user.role !== 'viewer' && activeView === 'drive' && (
                <>
                    <MenuItem
                        icon={Share2}
                        label="Share Item"
                        onClick={() => onAction('share', file)}
                    />
                    <MenuItem
                        icon={Edit3}
                        label="Rename"
                        onClick={() => onAction('rename', file)}
                    />
                    <MenuItem
                        icon={CornerUpRight}
                        label="Move to..."
                        onClick={() => onAction('move', file)}
                    />
                    <MenuItem
                        icon={Copy}
                        label="Make a copy"
                        onClick={() => onAction('copy', file)}
                    />
                    <Divider />
                    <MenuItem
                        icon={Trash2}
                        label="Move to Trash"
                        danger
                        onClick={() => onAction('delete', file)}
                    />
                    <Divider />
                </>
            )}

            <MenuItem
                icon={Info}
                label="View Details / Properties"
                onClick={() => onAction('properties', file)}
            />

            {file.name.toLowerCase().endsWith('.pdf') && (
                <>
                    <Divider />
                    <MenuItem
                        icon={CheckCircle2}
                        label="Verify Content Integrity"
                        onClick={() => onAction('verify', file)}
                    />
                </>
            )}
        </div>,
        document.body
    );
};

export default ContextMenu;
