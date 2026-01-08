import React, { useState } from 'react';
import { X, Calendar, User, Activity, FileText, Search } from 'lucide-react';

interface DetailModalProps {
    type: 'action' | 'user' | 'file' | null;
    data: any;
    onClose: () => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ type, data, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');

    if (!type || !data) return null;

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const filterData = (items: any[]) => {
        if (!searchQuery) return items;
        const query = searchQuery.toLowerCase();

        return items.filter(item => {
            const username = (item.username || '').toLowerCase();
            const description = (item.description || '').toLowerCase();
            const action = (item.action || '').toLowerCase();
            const ip = (item.ipAddress || '').toLowerCase();

            return username.includes(query) ||
                description.includes(query) ||
                action.includes(query) ||
                ip.includes(query);
        });
    };

    const SearchInput = () => (
        <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
            <input
                type="text"
                placeholder="Search detail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[var(--nav-hover)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
                autoFocus
            />
        </div>
    );

    const renderActionDetail = () => {
        if (!data.activities) return null;

        const filteredActivities = filterData(data.activities);

        return (
            <div className="space-y-3">
                <SearchInput />
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold capitalize">{data.action} Activities</h3>
                    <span className="px-3 py-1 bg-[var(--primary)]/20 text-[var(--primary)] rounded-lg text-sm font-bold">
                        {filteredActivities.length} / {data.count} total
                    </span>
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                    {filteredActivities.map((activity: any, index: number) => (
                        <div key={index} className="p-4 bg-[var(--nav-hover)] rounded-xl hover:bg-[var(--primary)]/10 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <User size={16} className="text-[var(--primary)] flex-shrink-0" />
                                        <span className="font-medium">{activity.username || 'Unknown'}</span>
                                        <span className="text-xs text-[var(--text-muted)]">
                                            (ID: {activity.userId})
                                        </span>
                                    </div>
                                    <p className="text-sm text-[var(--text-muted)] mb-2 break-words">
                                        {activity.description}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
                                        <div className="flex items-center gap-1">
                                            <Calendar size={12} />
                                            <span>{formatDate(activity.createdAt)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span>📍</span>
                                            <span>{activity.ipAddress}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredActivities.length === 0 && (
                        <p className="text-center text-[var(--text-muted)] py-4">No matching records found</p>
                    )}
                </div>
            </div>
        );
    };

    const renderUserDetail = () => {
        if (!data.activities) return null;

        const filteredActivities = filterData(data.activities);

        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-xl font-bold">{data.username}</h3>
                        <p className="text-sm text-[var(--text-muted)]">User ID: {data.userId}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold text-[var(--primary)]">{data.activityCount}</p>
                        <p className="text-xs text-[var(--text-muted)]">total activities</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 bg-[var(--nav-hover)] rounded-xl">
                        <p className="text-xs text-[var(--text-muted)] mb-1">Last Activity</p>
                        <p className="text-sm font-medium">{formatDate(data.lastActivity)}</p>
                    </div>
                    <div className="p-3 bg-[var(--nav-hover)] rounded-xl">
                        <p className="text-xs text-[var(--text-muted)] mb-1">Action Types</p>
                        <p className="text-sm font-medium">{data.actions?.split(',').length || 0} types</p>
                    </div>
                </div>

                <SearchInput />

                <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                    <p className="text-sm font-bold mb-2">Recent Activities ({filteredActivities.length}):</p>
                    {filteredActivities.map((activity: any, index: number) => (
                        <div key={index} className="p-3 bg-[var(--nav-hover)] rounded-xl">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 bg-[var(--primary)]/20 text-[var(--primary)] rounded text-xs font-bold capitalize">
                                    {activity.action}
                                </span>
                                <span className="text-xs text-[var(--text-muted)]">
                                    {formatDate(activity.createdAt)}
                                </span>
                            </div>
                            <p className="text-sm text-[var(--text-muted)] break-words">
                                {activity.description}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                📍 {activity.ipAddress}
                            </p>
                        </div>
                    ))}
                    {filteredActivities.length === 0 && (
                        <p className="text-center text-[var(--text-muted)] py-4">No matching records found</p>
                    )}
                </div>
            </div>
        );
    };

    const renderFileDetail = () => {
        if (!data.downloads) return null;

        const fileName = data.description.replace(/^Downloaded: /, '').split('/').pop();
        const filteredDownloads = filterData(data.downloads);

        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold truncate">{fileName}</h3>
                        <p className="text-sm text-[var(--text-muted)] truncate">{data.description.replace(/^Downloaded: /, '')}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-2xl font-bold text-[var(--primary)]">{data.downloadCount}x</p>
                        <p className="text-xs text-[var(--text-muted)]">downloads</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 bg-[var(--nav-hover)] rounded-xl">
                        <p className="text-xs text-[var(--text-muted)] mb-1">Last Download</p>
                        <p className="text-sm font-medium">{formatDate(data.lastDownload)}</p>
                    </div>
                    <div className="p-3 bg-[var(--nav-hover)] rounded-xl">
                        <p className="text-xs text-[var(--text-muted)] mb-1">Unique Users</p>
                        <p className="text-sm font-medium">{data.downloads?.length || 0} users</p>
                    </div>
                </div>

                <SearchInput />

                <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                    <p className="text-sm font-bold mb-2">Download History ({filteredDownloads.length}):</p>
                    {filteredDownloads.map((download: any, index: number) => (
                        <div key={index} className="p-3 bg-[var(--nav-hover)] rounded-xl">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <User size={14} className="text-[var(--primary)]" />
                                    <span className="text-sm font-medium">{download.username || 'Unknown'}</span>
                                </div>
                                <span className="text-xs text-[var(--text-muted)]">
                                    {formatDate(download.createdAt)}
                                </span>
                            </div>
                            <p className="text-xs text-[var(--text-muted)]">
                                📍 {download.ipAddress}
                            </p>
                        </div>
                    ))}
                    {filteredDownloads.length === 0 && (
                        <p className="text-center text-[var(--text-muted)] py-4">No matching records found</p>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-16 md:pt-24 animate-fade overflow-hidden">
            <div className="glass bg-[var(--bg-dark)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col transform transition-all animate-scale-in">
                <div className="sticky top-0 bg-[var(--bg-dark)]/95 backdrop-blur-xl border-b border-[var(--border)] px-6 py-4 flex items-center justify-between z-10 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center">
                            {type === 'action' && <Activity size={20} className="text-[var(--primary)]" />}
                            {type === 'user' && <User size={20} className="text-[var(--primary)]" />}
                            {type === 'file' && <FileText size={20} className="text-[var(--primary)]" />}
                        </div>
                        <h2 className="text-xl font-bold">Detail Information</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[var(--nav-hover)] rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-hidden flex flex-col">
                    {type === 'action' && renderActionDetail()}
                    {type === 'user' && renderUserDetail()}
                    {type === 'file' && renderFileDetail()}
                </div>
            </div>
        </div>
    );
};

export default DetailModal;
