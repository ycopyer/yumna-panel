import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Save, Image as ImageIcon, Type, Globe, Loader2 } from 'lucide-react';

interface SiteSettingsModalProps {
    userId: number;
    onClose: () => void;
    currentSettings: any;
    onSave: () => void;
}

const SiteSettingsModal: React.FC<SiteSettingsModalProps> = ({ userId, onClose, currentSettings, onSave }) => {
    const [settings, setSettings] = useState({
        logo_url: '',
        site_title: '',
        footer_text: '',
        primary_color: '#6366f1',
        telegram_bot_token: '',
        telegram_chat_id: '',
        enable_notifications: 'false',
        dns_ns1: 'ns1.yumnapanel.com',
        dns_ns2: 'ns2.yumnapanel.com'
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchFullSettings = async () => {
            try {
                // Try fetching from admin endpoint to get full tokens
                const res = await axios.get('/api/admin/settings-site', {
                    headers: { 'x-user-id': userId }
                });
                setSettings(prev => ({
                    ...prev,
                    ...res.data
                }));
            } catch (err) {
                // Fallback to currentSettings if admin fetch fails
                if (currentSettings) {
                    setSettings({
                        logo_url: currentSettings.logo_url || '',
                        site_title: currentSettings.site_title || '',
                        footer_text: currentSettings.footer_text || '',
                        primary_color: currentSettings.primary_color || '#6366f1',
                        telegram_bot_token: currentSettings.telegram_bot_token || '',
                        telegram_chat_id: currentSettings.telegram_chat_id || '',
                        enable_notifications: currentSettings.enable_notifications || 'false',
                        dns_ns1: currentSettings.dns_ns1 || 'ns1.yumnapanel.com',
                        dns_ns2: currentSettings.dns_ns2 || 'ns2.yumnapanel.com'
                    });
                }
            }
        };

        fetchFullSettings();
    }, [currentSettings]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await axios.post('/api/settings-site', settings, {
                headers: { 'x-user-id': userId }
            });
            onSave();
            onClose();
        } catch (err) {
            console.error('Failed to save settings:', err);
            alert('Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(8px)'
        }}>
            <div className="glass animate-fade" style={{
                width: '100%',
                maxWidth: '500px',
                padding: '40px',
                position: 'relative',
                maxHeight: '95vh',
                overflowY: 'auto'
            }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={24} />
                </button>

                <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-main)' }}>Site Customization</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '32px' }}>Branding and visual identity settings</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <ImageIcon size={16} color="#6366f1" /> Logo URL
                        </label>
                        <input
                            className="input-glass"
                            style={{ width: '100%', height: '44px' }}
                            placeholder="https://example.com/logo.png"
                            value={settings.logo_url}
                            onChange={e => setSettings({ ...settings, logo_url: e.target.value })}
                        />
                        {settings.logo_url && (
                            <div style={{ marginTop: '4px', padding: '16px', background: 'var(--nav-hover)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                                <img src={settings.logo_url} alt="Logo Preview" style={{ maxHeight: '60px', objectFit: 'contain' }} />
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <Globe size={16} color="#10b981" /> Site Title
                        </label>
                        <input
                            className="input-glass"
                            style={{ width: '100%', height: '44px' }}
                            placeholder="Yumna Panel"
                            value={settings.site_title}
                            onChange={e => setSettings({ ...settings, site_title: e.target.value })}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <Type size={16} color="#f59e0b" /> Footer Text
                        </label>
                        <input
                            className="input-glass"
                            style={{ width: '100%', height: '44px' }}
                            placeholder="© 2024 Your Company"
                            value={settings.footer_text}
                            onChange={e => setSettings({ ...settings, footer_text: e.target.value })}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: settings.primary_color }} /> Primary Accent Color
                        </label>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <input
                                type="color"
                                style={{ width: '44px', height: '44px', padding: '0', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '12px' }}
                                value={settings.primary_color}
                                onChange={e => setSettings({ ...settings, primary_color: e.target.value })}
                            />
                            <input
                                className="input-glass"
                                style={{ flex: 1, height: '44px' }}
                                value={settings.primary_color}
                                onChange={e => setSettings({ ...settings, primary_color: e.target.value })}
                                placeholder="#6366f1"
                            />
                        </div>
                    </div>

                    <div style={{ background: 'var(--nav-hover)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Default Nameservers</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>PRIMARY NS (NS1)</p>
                                <input
                                    className="input-glass"
                                    style={{ width: '100%', height: '40px', fontSize: '13px' }}
                                    placeholder="ns1.yourdomain.com"
                                    value={settings.dns_ns1}
                                    onChange={e => setSettings({ ...settings, dns_ns1: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>SECONDARY NS (NS2)</p>
                                <input
                                    className="input-glass"
                                    style={{ width: '100%', height: '40px', fontSize: '13px' }}
                                    placeholder="ns2.yourdomain.com"
                                    value={settings.dns_ns2}
                                    onChange={e => setSettings({ ...settings, dns_ns2: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ margin: '8px 0', height: '1px', background: 'var(--border)' }} />

                    <div style={{ background: 'var(--nav-hover)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Telegram Notifications</h4>
                            <div
                                onClick={() => setSettings({ ...settings, enable_notifications: settings.enable_notifications === 'true' ? 'false' : 'true' })}
                                style={{
                                    width: '44px',
                                    height: '24px',
                                    background: settings.enable_notifications === 'true' ? 'var(--primary)' : 'var(--text-muted)',
                                    borderRadius: '12px',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    transition: '0.3s'
                                }}
                            >
                                <div style={{
                                    width: '18px',
                                    height: '18px',
                                    background: 'white',
                                    borderRadius: '50%',
                                    position: 'absolute',
                                    top: '3px',
                                    left: settings.enable_notifications === 'true' ? '23px' : '3px',
                                    transition: '0.3s',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>BOT TOKEN</p>
                                <input
                                    className="input-glass"
                                    style={{ width: '100%', height: '40px', fontSize: '13px' }}
                                    placeholder="e.g. 123456:ABC-DEF..."
                                    value={settings.telegram_bot_token}
                                    onChange={e => setSettings({ ...settings, telegram_bot_token: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>CHAT ID</p>
                                <input
                                    className="input-glass"
                                    style={{ width: '100%', height: '40px', fontSize: '13px' }}
                                    placeholder="e.g. 987654321"
                                    value={settings.telegram_chat_id}
                                    onChange={e => setSettings({ ...settings, telegram_chat_id: e.target.value })}
                                />
                            </div>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '4px' }}>
                                Receive real-time alerts for system logins and file operations.
                            </p>
                        </div>
                    </div>

                    <button
                        className="btn-primary"
                        onClick={handleSave}
                        disabled={loading}
                        style={{ marginTop: '8px', height: '48px', fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Save Branding</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SiteSettingsModal;
