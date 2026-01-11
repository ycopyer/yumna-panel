import React, { useState } from 'react';
import { X, Server, Globe, Loader2 } from 'lucide-react';
import axios from 'axios';

interface AddDNSZoneModalProps {
    userId: number;
    onClose: () => void;
    onSuccess: () => void;
}

const AddDNSZoneModal: React.FC<AddDNSZoneModalProps> = ({ userId, onClose, onSuccess }) => {
    const [domain, setDomain] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // This would call an API to create a DNS zone
            await axios.post('/api/dns', { domain }, {
                headers: { 'x-user-id': userId }
            });
            onSuccess();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to add DNS zone');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
            <div className="glass animate-scale-up" style={{ width: '100%', maxWidth: '400px', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                {/* Header */}
                <div style={{ padding: '24px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '10px', background: 'rgba(255,255,255,0.15)', borderRadius: '12px' }}>
                            <Server size={24} color="white" />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'white', margin: 0 }}>Add DNS Zone</h3>
                            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>Configure DNS for domain</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ padding: '8px', background: 'rgba(0,0,0,0.1)', borderRadius: '10px', color: 'white', border: 'none', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Domain Name</label>
                            <div style={{ position: 'relative' }}>
                                <Globe size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    required
                                    className="input-glass"
                                    style={{ width: '100%', padding: '14px 14px 14px 44px', borderRadius: '14px' }}
                                    placeholder="example.com"
                                    value={domain}
                                    onChange={e => setDomain(e.target.value)}
                                />
                            </div>
                            <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px', fontWeight: '600' }}>
                                ℹ️ This will create a local zone and default records (A, CNAME, MX).
                            </p>
                        </div>

                        <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
                            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1, padding: '14px', borderRadius: '14px', fontWeight: 'bold' }}>Cancel</button>
                            <button type="submit" disabled={loading} className="btn-primary" style={{ flex: 1.5, padding: '14px', borderRadius: '14px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Create Zone'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddDNSZoneModal;
