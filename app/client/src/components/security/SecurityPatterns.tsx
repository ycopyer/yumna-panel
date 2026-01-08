import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Plus, Edit2, Trash2, Save, X, AlertTriangle, Search, Filter, CheckCircle, XCircle, Bot } from 'lucide-react';

interface Pattern {
    id: number;
    type: 'sqli' | 'xss' | 'bot';
    pattern: string;
    description: string;
    isActive: number;
    createdAt: string;
}

interface SecurityPatternsProps {
    userId: string;
    sessionId: string;
}

const SecurityPatterns: React.FC<SecurityPatternsProps> = ({ userId, sessionId }) => {
    const [patterns, setPatterns] = useState<Pattern[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [filter, setFilter] = useState<'all' | 'sqli' | 'xss' | 'bot'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    const [formData, setFormData] = useState({
        type: 'sqli' as 'sqli' | 'xss' | 'bot',
        pattern: '',
        description: '',
        isActive: 1
    });

    const headers = {
        'x-user-id': userId,
        'x-session-id': sessionId
    };

    const fetchPatterns = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/firewall/security-patterns', { headers });
            setPatterns(res.data);
        } catch (err: any) {
            console.error('Failed to fetch patterns:', err);
            alert(err.response?.data?.error || 'Failed to load patterns');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPatterns();
    }, []);

    const handleAdd = async () => {
        if (!formData.pattern.trim()) {
            alert('Pattern is required');
            return;
        }

        try {
            await axios.post('/api/firewall/security-patterns', formData, { headers });
            alert('Pattern added successfully');
            setShowAddForm(false);
            setFormData({ type: 'sqli', pattern: '', description: '', isActive: 1 });
            fetchPatterns();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to add pattern');
        }
    };

    const handleUpdate = async (id: number) => {
        const pattern = patterns.find(p => p.id === id);
        if (!pattern) return;

        try {
            await axios.put(`/api/firewall/security-patterns/${id}`, pattern, { headers });
            alert('Pattern updated successfully');
            setEditingId(null);
            fetchPatterns();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to update pattern');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this pattern?')) return;

        try {
            await axios.delete(`/api/firewall/security-patterns/${id}`, { headers });
            alert('Pattern deleted successfully');
            fetchPatterns();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to delete pattern');
        }
    };

    const toggleActive = (id: number) => {
        setPatterns(patterns.map(p =>
            p.id === id ? { ...p, isActive: p.isActive ? 0 : 1 } : p
        ));
    };

    const updatePattern = (id: number, field: keyof Pattern, value: any) => {
        setPatterns(patterns.map(p =>
            p.id === id ? { ...p, [field]: value } : p
        ));
    };

    // Advanced filtering
    const filteredPatterns = patterns.filter(p => {
        const matchesType = filter === 'all' || p.type === filter;
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && p.isActive) ||
            (statusFilter === 'inactive' && !p.isActive);
        const matchesSearch = !searchQuery ||
            p.pattern.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.id.toString().includes(searchQuery);

        return matchesType && matchesStatus && matchesSearch;
    });

    const stats = {
        total: patterns.length,
        sqli: patterns.filter(p => p.type === 'sqli').length,
        xss: patterns.filter(p => p.type === 'xss').length,
        bot: patterns.filter(p => p.type === 'bot').length,
        active: patterns.filter(p => p.isActive).length
    };

    return (
        <div className="security-patterns-container">
            {/* Header with Stats */}
            <div className={`stats-grid`}>
                <div className="stat-card total">
                    <div className="stat-icon">
                        <Shield size={24} />
                    </div>
                    <div>
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Total Patterns</div>
                    </div>
                </div>
                <div className="stat-card sqli">
                    <div className="stat-icon">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <div className="stat-value">{stats.sqli}</div>
                        <div className="stat-label">SQL Injection</div>
                    </div>
                </div>
                <div className="stat-card xss">
                    <div className="stat-icon">
                        <XCircle size={24} />
                    </div>
                    <div>
                        <div className="stat-value">{stats.xss}</div>
                        <div className="stat-label">XSS Patterns</div>
                    </div>
                </div>
                <div className="stat-card bot">
                    <div className="stat-icon">
                        <Bot size={24} />
                    </div>
                    <div>
                        <div className="stat-value">{stats.bot}</div>
                        <div className="stat-label">Bots / Crawlers</div>
                    </div>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="toolbar">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search by ID, pattern, or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="clear-btn">
                            <X size={16} />
                        </button>
                    )}
                </div>

                <div className="filter-group">
                    <Filter size={18} />
                    <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
                        <option value="all">All Types</option>
                        <option value="sqli">SQL Injection</option>
                        <option value="xss">XSS</option>
                        <option value="bot">Bots & Crawlers</option>
                    </select>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                        <option value="all">All Status</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                    </select>
                </div>

                <button className="btn-add" onClick={() => setShowAddForm(!showAddForm)}>
                    {showAddForm ? <X size={18} /> : <Plus size={18} />}
                    {showAddForm ? 'Cancel' : 'Add Pattern'}
                </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="add-form">
                    <h3>Add New Security Pattern</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Type *</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                            >
                                <option value="sqli">SQL Injection</option>
                                <option value="xss">XSS</option>
                                <option value="bot">Bot / Crawler</option>
                            </select>
                        </div>
                        <div className="form-group full-width">
                            <label>Pattern (Regex) *</label>
                            <input
                                type="text"
                                value={formData.pattern}
                                onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                                placeholder={formData.type === 'bot' ? 'e.g., GPTBot|ChatGPT' : 'e.g., \\b(UNION|SELECT)\\b'}
                            />
                        </div>
                        <div className="form-group full-width">
                            <label>Description</label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief description of this pattern"
                            />
                        </div>
                    </div>
                    <button className="btn-save" onClick={handleAdd}>
                        <Save size={18} />
                        Save Pattern
                    </button>
                </div>
            )}

            {/* Results Info */}
            {searchQuery && (
                <div className="results-info">
                    Found {filteredPatterns.length} pattern{filteredPatterns.length !== 1 ? 's' : ''} matching "{searchQuery}"
                </div>
            )}

            {/* Patterns List */}
            {loading ? (
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Loading patterns...</p>
                </div>
            ) : (
                <div className="patterns-list">
                    {filteredPatterns.length === 0 ? (
                        <div className="empty-state">
                            <AlertTriangle size={48} />
                            <p>No patterns found</p>
                            {searchQuery && <button onClick={() => setSearchQuery('')} className="btn-reset">Clear Search</button>}
                        </div>
                    ) : (
                        filteredPatterns.map(pattern => (
                            <div key={pattern.id} className={`pattern-card ${!pattern.isActive ? 'inactive' : ''}`}>
                                <div className="pattern-header">
                                    <div className="pattern-meta-left">
                                        <span className="pattern-id">#{pattern.id}</span>
                                        <span className={`type-badge ${pattern.type}`}>
                                            {pattern.type === 'sqli' ? 'SQLi' : pattern.type === 'xss' ? 'XSS' : 'Bot'}
                                        </span>
                                    </div>
                                    <div className="actions">
                                        <label className="toggle" title={pattern.isActive ? 'Active' : 'Inactive'}>
                                            <input
                                                type="checkbox"
                                                checked={!!pattern.isActive}
                                                onChange={() => toggleActive(pattern.id)}
                                                disabled={editingId === pattern.id}
                                            />
                                            <span className="slider"></span>
                                        </label>
                                        {editingId === pattern.id ? (
                                            <>
                                                <button
                                                    className="btn-icon save"
                                                    onClick={() => handleUpdate(pattern.id)}
                                                    title="Save Changes"
                                                >
                                                    <Save size={16} />
                                                </button>
                                                <button
                                                    className="btn-icon cancel"
                                                    onClick={() => {
                                                        setEditingId(null);
                                                        fetchPatterns();
                                                    }}
                                                    title="Cancel"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    className="btn-icon edit"
                                                    onClick={() => setEditingId(pattern.id)}
                                                    title="Edit Pattern"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    className="btn-icon delete"
                                                    onClick={() => handleDelete(pattern.id)}
                                                    title="Delete Pattern"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="pattern-content">
                                    {editingId === pattern.id ? (
                                        <>
                                            <div className="edit-field">
                                                <label>Pattern:</label>
                                                <input
                                                    type="text"
                                                    value={pattern.pattern}
                                                    onChange={(e) => updatePattern(pattern.id, 'pattern', e.target.value)}
                                                />
                                            </div>
                                            <div className="edit-field">
                                                <label>Description:</label>
                                                <input
                                                    type="text"
                                                    value={pattern.description}
                                                    onChange={(e) => updatePattern(pattern.id, 'description', e.target.value)}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="pattern-regex">
                                                <code>{pattern.pattern}</code>
                                            </div>
                                            {pattern.description && (
                                                <div className="pattern-description">
                                                    {pattern.description}
                                                </div>
                                            )}
                                            <div className="pattern-footer">
                                                <span className="date">Created: {new Date(pattern.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            <style>{`
                .security-patterns-container {
                    padding: 0;
                    background: var(--bg-main);
                    color: var(--text-main);
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 16px;
                    padding: 20px;
                    background: var(--bg-dark);
                    border-bottom: 1px solid var(--border);
                }

                .stat-card {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 20px;
                    background: var(--bg-main);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    transition: all 0.2s;
                }

                .stat-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }

                .stat-icon {
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 10px;
                    background: var(--nav-hover);
                }

                .stat-card.total .stat-icon { background: #e0f2fe; color: #0284c7; }
                .stat-card.sqli .stat-icon { background: #fee2e2; color: #dc2626; }
                .stat-card.xss .stat-icon { background: #fef3c7; color: #d97706; }
                .stat-card.bot .stat-icon { background: #ede9fe; color: #7c3aed; }
                .stat-card.active .stat-icon { background: #d1fae5; color: #10b981; }

                .stat-value {
                    font-size: 28px;
                    font-weight: 700;
                    color: var(--text-main);
                }

                .stat-label {
                    font-size: 13px;
                    color: var(--text-muted);
                    font-weight: 500;
                }

                .toolbar {
                    display: flex;
                    gap: 12px;
                    padding: 20px;
                    background: var(--bg-main);
                    border-bottom: 1px solid var(--border);
                    flex-wrap: wrap;
                }

                .search-box {
                    flex: 1;
                    min-width: 250px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 16px;
                    background: var(--bg-dark);
                    border: 1px solid var(--border);
                    border-radius: 10px;
                    transition: all 0.2s;
                }

                .search-box:focus-within {
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(7, 46, 7, 0.1);
                }

                .search-box svg {
                    color: var(--text-muted);
                }

                .search-box input {
                    flex: 1;
                    border: none;
                    background: transparent;
                    outline: none;
                    font-size: 14px;
                    color: var(--text-main);
                }

                .search-box input::placeholder {
                    color: var(--text-muted);
                }

                .clear-btn {
                    padding: 4px;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    color: var(--text-muted);
                    border-radius: 4px;
                    transition: all 0.2s;
                }

                .clear-btn:hover {
                    background: var(--nav-hover);
                    color: var(--text-main);
                }

                .filter-group {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .filter-group svg {
                    color: var(--text-muted);
                }

                .filter-group select {
                    padding: 10px 14px;
                    background: var(--bg-dark);
                    border: 1px solid var(--border);
                    border-radius: 10px;
                    font-size: 14px;
                    color: var(--text-main);
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .filter-group select:hover {
                    border-color: var(--primary);
                }

                .btn-add {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 20px;
                    background: var(--primary);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 600;
                    transition: all 0.2s;
                    white-space: nowrap;
                }

                .btn-add:hover {
                    background: #0a4010;
                    transform: translateY(-1px);
                }

                .add-form {
                    margin: 20px;
                    padding: 24px;
                    background: var(--bg-main);
                    border: 2px solid var(--primary);
                    border-radius: 12px;
                }

                .add-form h3 {
                    margin: 0 0 20px 0;
                    font-size: 18px;
                    font-weight: 600;
                    color: var(--text-main);
                }

                .form-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 16px;
                    margin-bottom: 16px;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .form-group.full-width {
                    grid-column: 1 / -1;
                }

                .form-group label {
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--text-main);
                }

                .form-group input,
                .form-group select {
                    padding: 12px;
                    background: var(--bg-dark);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    font-size: 14px;
                    color: var(--text-main);
                    transition: all 0.2s;
                }

                .form-group input:focus,
                .form-group select:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(7, 46, 7, 0.1);
                }

                .btn-save {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 24px;
                    background: #10b981;
                    color: white;
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 600;
                    transition: all 0.2s;
                }

                .btn-save:hover {
                    background: #059669;
                    transform: translateY(-1px);
                }

                .results-info {
                    padding: 12px 20px;
                    background: #dbeafe;
                    color: #1e40af;
                    font-size: 14px;
                    font-weight: 500;
                    border-bottom: 1px solid var(--border);
                }

                .patterns-list {
                    padding: 20px;
                    display: grid;
                    gap: 12px;
                }

                .pattern-card {
                    background: var(--bg-main);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 16px;
                    transition: all 0.2s;
                }

                .pattern-card:hover {
                    border-color: var(--primary);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                }

                .pattern-card.inactive {
                    opacity: 0.6;
                    background: var(--bg-dark);
                }

                .pattern-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid var(--border);
                }

                .pattern-meta-left {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .pattern-id {
                    font-size: 12px;
                    font-weight: 700;
                    color: var(--text-muted);
                    background: var(--nav-hover);
                    padding: 4px 8px;
                    border-radius: 6px;
                }

                .type-badge {
                    padding: 4px 12px;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .type-badge.sqli {
                    background: #fee2e2;
                    color: #dc2626;
                }

                .type-badge.xss {
                    background: #fef3c7;
                    color: #d97706;
                }

                .type-badge.bot {
                    background: #ede9fe;
                    color: #7c3aed;
                }

                .actions {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .toggle {
                    position: relative;
                    display: inline-block;
                    width: 44px;
                    height: 24px;
                }

                .toggle input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }

                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #cbd5e1;
                    transition: 0.3s;
                    border-radius: 24px;
                }

                .slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: 0.3s;
                    border-radius: 50%;
                }

                input:checked + .slider {
                    background-color: #10b981;
                }

                input:checked + .slider:before {
                    transform: translateX(20px);
                }

                .btn-icon {
                    padding: 8px;
                    background: var(--nav-hover);
                    border: none;
                    cursor: pointer;
                    border-radius: 8px;
                    transition: all 0.2s;
                    color: var(--text-muted);
                }

                .btn-icon:hover {
                    transform: scale(1.1);
                }

                .btn-icon.edit:hover {
                    background: #dbeafe;
                    color: #2563eb;
                }

                .btn-icon.delete:hover {
                    background: #fee2e2;
                    color: #dc2626;
                }

                .btn-icon.save:hover {
                    background: #d1fae5;
                    color: #10b981;
                }

                .btn-icon.cancel:hover {
                    background: #f3f4f6;
                    color: #6b7280;
                }

                .pattern-content {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .pattern-regex code {
                    display: block;
                    padding: 12px;
                    background: var(--bg-dark);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    font-family: 'Courier New', monospace;
                    font-size: 13px;
                    word-break: break-all;
                    color: var(--text-main);
                }

                .pattern-description {
                    font-size: 14px;
                    color: var(--text-muted);
                    line-height: 1.5;
                }

                .pattern-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-top: 8px;
                    border-top: 1px solid var(--border);
                }

                .pattern-footer .date {
                    font-size: 12px;
                    color: var(--text-muted);
                }

                .edit-field {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .edit-field label {
                    font-size: 12px;
                    font-weight: 600;
                    color: var(--text-muted);
                }

                .edit-field input {
                    padding: 10px;
                    background: var(--bg-dark);
                    border: 1px solid var(--border);
                    border-radius: 6px;
                    font-size: 13px;
                    color: var(--text-main);
                }

                .loading,
                .empty-state {
                    text-align: center;
                    padding: 60px 20px;
                    color: var(--text-muted);
                }

                .loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                }

                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid var(--border);
                    border-top-color: var(--primary);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                }

                .empty-state svg {
                    color: var(--text-muted);
                    opacity: 0.5;
                }

                .btn-reset {
                    margin-top: 12px;
                    padding: 10px 20px;
                    background: var(--primary);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 600;
                }

                @media (max-width: 768px) {
                    .stats-grid {
                        grid-template-columns: 1fr;
                    }

                    .toolbar {
                        flex-direction: column;
                    }

                    .search-box {
                        width: 100%;
                    }

                    .form-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
};

export default SecurityPatterns;
