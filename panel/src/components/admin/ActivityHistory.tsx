import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, History, Download, Upload, Trash2, Edit3, FolderPlus, Share2, Clock, User, Calendar, Eye, Globe, Monitor, Loader2 } from 'lucide-react';

interface ActivityItem {
    id: number;
    userId: number;
    username: string;
    action: string;
    description: string;
    ipAddress?: string;
    ipLocal?: string;
    createdAt: string;
}

interface ActivityHistoryProps {
    userId?: number;
    userRole?: string;
    onClose: () => void;
}

const ActivityHistory: React.FC<ActivityHistoryProps> = ({ userId, userRole, onClose }) => {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');

    useEffect(() => {
        fetchActivities();
    }, [userId]);

    const fetchActivities = async () => {
        setLoading(true);
        try {
            // Determine which endpoint to use based on user role
            const isAdmin = userRole === 'admin';
            const url = isAdmin
                ? (userId ? `/api/activity-history?userId=${userId}` : '/api/activity-history')
                : '/api/my-activity-history';

            const res = await axios.get(url, {
                headers: { 'x-user-id': userId || localStorage.getItem('userId') }
            });
            setActivities(res.data);
        } catch (err) {
            console.error('Failed to fetch activity history:', err);
        } finally {
            setLoading(false);
        }
    };

    const getActionIcon = (action: string) => {
        switch (action.toLowerCase()) {
            case 'upload': return <Upload size={18} color="var(--icon-success)" />;
            case 'download': return <Download size={18} color="var(--primary)" />;
            case 'delete': return <Trash2 size={18} color="var(--icon-danger)" />;
            case 'rename': return <Edit3 size={18} color="var(--icon-warning)" />;
            case 'create': return <FolderPlus size={18} color="var(--primary)" />;
            case 'share': return <Share2 size={18} color="var(--icon-success)" />;
            case 'view': return <Eye size={18} color="var(--primary)" />;
            case 'preview': return <Eye size={18} color="var(--primary)" />;
            case 'verify': return <Monitor size={18} color="var(--icon-success)" />;
            default: return <History size={18} color="var(--text-muted)" />;
        }
    };

    const getActionColor = (action: string) => {
        switch (action.toLowerCase()) {
            case 'upload': return 'var(--icon-success)';
            case 'download': return 'var(--primary)';
            case 'delete': return 'var(--icon-danger)';
            case 'rename': return 'var(--icon-warning)';
            case 'create': return 'var(--primary)';
            case 'share': return 'var(--icon-success)';
            case 'view': return 'var(--primary)';
            case 'preview': return 'var(--primary)';
            case 'verify': return 'var(--icon-success)';
            default: return 'var(--text-muted)';
        }
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        let relativeTime = '';
        if (diffMins < 1) relativeTime = 'Just now';
        else if (diffMins < 60) relativeTime = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        else if (diffHours < 24) relativeTime = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        else if (diffDays < 7) relativeTime = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        else relativeTime = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        // Format lengkap: Senin, 22 Desember 2025 - 19:14:30
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        const dayName = days[date.getDay()];
        const day = date.getDate();
        const monthName = months[date.getMonth()];
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        const fullDateTime = `${dayName}, ${day} ${monthName} ${year} - ${hours}:${minutes}:${seconds}`;

        return { relativeTime, fullDateTime };
    };

    const hasVisitors = activities.some(a => a.description.includes('(via link)'));

    const filteredActivities = filter === 'all'
        ? activities
        : filter === 'visitors'
            ? activities.filter(a => a.description.includes('(via link)'))
            : activities.filter(a => a.action.toLowerCase() === filter);

    const actionTypes = ['all', ...(hasVisitors ? ['visitors'] : []), ...new Set(activities.map(a => a.action.toLowerCase()))];

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '24px'
        }}>
            <div className="glass animate-fade" style={{
                width: '100%',
                maxWidth: '1000px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            background: 'rgba(99, 102, 241, 0.2)',
                            padding: '10px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <History size={24} color="#6366f1" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
                                Activity History
                            </h2>
                            <p style={{ fontSize: '13px', color: '#94a3b8' }}>
                                {userId ? 'Your recent activities' : 'All user activities'} • {filteredActivities.length} records
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="input-glass"
                        style={{
                            padding: '8px',
                            border: 'none',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '8px'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Filter */}
                <div style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                    alignItems: 'center'
                }}>
                    <span style={{ fontSize: '13px', color: '#94a3b8', marginRight: '8px' }}>Filter:</span>
                    {actionTypes.map(type => (
                        <button
                            key={type}
                            onClick={() => setFilter(type)}
                            className="input-glass"
                            style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                border: 'none',
                                background: filter === type ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '8px',
                                textTransform: 'capitalize',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '24px'
                }}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px', color: 'var(--text-muted)', fontWeight: '700' }}>
                            <Loader2 className="animate-spin" size={32} />
                        </div>
                    ) : filteredActivities.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)', fontWeight: '700' }}>
                            No activities found matching this filter.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {filteredActivities.map((activity) => {
                                const { relativeTime, fullDateTime } = formatDateTime(activity.createdAt);
                                return (
                                    <div
                                        key={activity.id}
                                        className="glass"
                                        style={{
                                            padding: '18px',
                                            borderLeft: `3px solid ${getActionColor(activity.action)}`,
                                            transition: 'all 0.2s ease',
                                            cursor: 'default'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                            e.currentTarget.style.transform = 'translateX(4px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                            e.currentTarget.style.transform = 'translateX(0)';
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                                            {/* Icon */}
                                            <div style={{
                                                background: `${getActionColor(activity.action)}20`,
                                                padding: '10px',
                                                borderRadius: '10px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                {getActionIcon(activity.action)}
                                            </div>

                                            {/* Content */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                {/* Header Row */}
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    marginBottom: '8px',
                                                    flexWrap: 'wrap'
                                                }}>
                                                    <span style={{
                                                        fontSize: '14px',
                                                        fontWeight: '600',
                                                        color: getActionColor(activity.action),
                                                        textTransform: 'capitalize'
                                                    }}>
                                                        {activity.action}
                                                    </span>
                                                    <span style={{ color: 'var(--text-muted)' }}>•</span>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '700' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            {activity.description.includes('(via link)') ? (
                                                                <>
                                                                    <Globe size={14} color="var(--icon-success)" />
                                                                    <span style={{ color: 'var(--icon-success)', fontWeight: '800' }}>Shared Link Visitor</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <User size={14} color="var(--primary)" />
                                                                    <span style={{ color: 'var(--text-main)' }}>{activity.username}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                        {activity.ipAddress && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <Globe size={14} color="var(--icon-success)" />
                                                                <span>{activity.ipAddress}</span>
                                                            </div>
                                                        )}
                                                        {activity.ipLocal && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <Monitor size={14} color="var(--icon-warning)" />
                                                                <span>{activity.ipLocal}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Description */}
                                                <p style={{
                                                    fontSize: '14px',
                                                    color: 'var(--text-main)',
                                                    marginBottom: '10px',
                                                    wordBreak: 'break-word',
                                                    lineHeight: '1.5'
                                                }}>
                                                    {activity.description}
                                                </p>

                                                {/* DateTime Row */}
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    fontSize: '12px',
                                                    color: '#64748b',
                                                    flexWrap: 'wrap'
                                                }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        background: 'rgba(99, 102, 241, 0.1)',
                                                        padding: '4px 8px',
                                                        borderRadius: '6px'
                                                    }}>
                                                        <Clock size={12} color="#6366f1" />
                                                        <span style={{ color: '#94a3b8', fontWeight: '500' }}>
                                                            {relativeTime}
                                                        </span>
                                                    </div>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '5px'
                                                    }}>
                                                        <Calendar size={12} />
                                                        <span title={fullDateTime}>
                                                            {fullDateTime}
                                                        </span>
                                                    </div>

                                                    {activity.ipAddress && (
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '5px',
                                                            color: '#6366f1'
                                                        }}>
                                                            <Globe size={12} />
                                                            <span title="Public IP">
                                                                {activity.ipAddress}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {activity.ipLocal && (
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '5px',
                                                            color: '#10b981'
                                                        }}>
                                                            <Monitor size={12} />
                                                            <span title="Local IP">
                                                                {activity.ipLocal}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Stats */}
                {!loading && filteredActivities.length > 0 && (
                    <div style={{
                        padding: '16px 24px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        background: 'rgba(99, 102, 241, 0.05)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '13px',
                        color: '#94a3b8'
                    }}>
                        <span>
                            Showing {filteredActivities.length} of {activities.length} activities
                        </span>
                        <span>
                            Last updated: {new Date().toLocaleTimeString('id-ID')}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityHistory;
