import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PaymentGatewaySettings.css';

interface Gateway {
    id: number;
    name: string;
    display_name: string;
    is_enabled: boolean;
    is_sandbox: boolean;
    config: any;
    supported_currencies: string[];
}

const PaymentGatewaySettings: React.FC = () => {
    const [gateways, setGateways] = useState<Gateway[]>([]);
    const [selectedGateway, setSelectedGateway] = useState<Gateway | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        loadGateways();
    }, []);

    const loadGateways = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/payments/gateways');
            setGateways(response.data);
        } catch (error: any) {
            console.error('Failed to load gateways:', error);
            showMessage('error', 'Failed to load payment gateways');
        } finally {
            setLoading(false);
        }
    };

    const loadGatewayConfig = async (gatewayName: string) => {
        try {
            const response = await axios.get(`/api/payments/gateways/${gatewayName}`);
            setSelectedGateway(response.data);
        } catch (error: any) {
            console.error('Failed to load gateway config:', error);
            showMessage('error', 'Failed to load gateway configuration');
        }
    };

    const handleSaveConfig = async () => {
        if (!selectedGateway) return;

        try {
            setSaving(true);
            await axios.put(`/api/payments/gateways/${selectedGateway.name}`, {
                is_enabled: selectedGateway.is_enabled,
                is_sandbox: selectedGateway.is_sandbox,
                settings: selectedGateway.config
            });

            showMessage('success', 'Gateway configuration saved successfully');
            await loadGateways();
        } catch (error: any) {
            console.error('Failed to save gateway config:', error);
            showMessage('error', error.response?.data?.error || 'Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    const handleConfigChange = (key: string, value: any) => {
        if (!selectedGateway) return;

        setSelectedGateway({
            ...selectedGateway,
            config: {
                ...selectedGateway.config,
                [key]: value
            }
        });
    };

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const renderGatewayConfig = () => {
        if (!selectedGateway) return null;

        switch (selectedGateway.name) {
            case 'stripe':
                return (
                    <div className="gateway-config">
                        <h3>Stripe Configuration</h3>

                        <div className="form-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={selectedGateway.is_enabled}
                                    onChange={(e) => setSelectedGateway({
                                        ...selectedGateway,
                                        is_enabled: e.target.checked
                                    })}
                                />
                                Enable Stripe
                            </label>
                        </div>

                        <div className="form-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={selectedGateway.is_sandbox}
                                    onChange={(e) => setSelectedGateway({
                                        ...selectedGateway,
                                        is_sandbox: e.target.checked
                                    })}
                                />
                                Sandbox Mode (Test)
                            </label>
                        </div>

                        <div className="form-group">
                            <label>Publishable Key</label>
                            <input
                                type="text"
                                value={selectedGateway.config.publishable_key || ''}
                                onChange={(e) => handleConfigChange('publishable_key', e.target.value)}
                                placeholder="pk_test_..."
                            />
                        </div>

                        <div className="form-group">
                            <label>Secret Key</label>
                            <input
                                type="password"
                                value={selectedGateway.config.secret_key || ''}
                                onChange={(e) => handleConfigChange('secret_key', e.target.value)}
                                placeholder="sk_test_..."
                            />
                        </div>

                        <div className="form-group">
                            <label>Webhook Secret</label>
                            <input
                                type="password"
                                value={selectedGateway.config.webhook_secret || ''}
                                onChange={(e) => handleConfigChange('webhook_secret', e.target.value)}
                                placeholder="whsec_..."
                            />
                            <small>Webhook URL: {window.location.origin}/api/payments/webhook/stripe</small>
                        </div>
                    </div>
                );

            case 'paypal':
                return (
                    <div className="gateway-config">
                        <h3>PayPal Configuration</h3>

                        <div className="form-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={selectedGateway.is_enabled}
                                    onChange={(e) => setSelectedGateway({
                                        ...selectedGateway,
                                        is_enabled: e.target.checked
                                    })}
                                />
                                Enable PayPal
                            </label>
                        </div>

                        <div className="form-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={selectedGateway.is_sandbox}
                                    onChange={(e) => setSelectedGateway({
                                        ...selectedGateway,
                                        is_sandbox: e.target.checked
                                    })}
                                />
                                Sandbox Mode (Test)
                            </label>
                        </div>

                        <div className="form-group">
                            <label>Client ID</label>
                            <input
                                type="text"
                                value={selectedGateway.config.client_id || ''}
                                onChange={(e) => handleConfigChange('client_id', e.target.value)}
                                placeholder="AYSq3RDGsmBLJE-otTkBtM-jBRd1TCQwFf9RGfwddNXWz0uFU9ztymylOhRS"
                            />
                        </div>

                        <div className="form-group">
                            <label>Client Secret</label>
                            <input
                                type="password"
                                value={selectedGateway.config.client_secret || ''}
                                onChange={(e) => handleConfigChange('client_secret', e.target.value)}
                                placeholder="EGnHDxD_qRPdaLdZz8iCr8N7_MzF-YHPTkjs6NKYQvQSBngp4PTTVWkPZRbL"
                            />
                        </div>

                        <div className="form-group">
                            <label>Webhook ID (Optional)</label>
                            <input
                                type="text"
                                value={selectedGateway.config.webhook_id || ''}
                                onChange={(e) => handleConfigChange('webhook_id', e.target.value)}
                                placeholder="1AB23456C7890123D"
                            />
                            <small>Webhook URL: {window.location.origin}/api/payments/webhook/paypal</small>
                        </div>
                    </div>
                );

            case 'manual':
                return (
                    <div className="gateway-config">
                        <h3>Manual Payment Configuration</h3>

                        <div className="form-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={selectedGateway.is_enabled}
                                    onChange={(e) => setSelectedGateway({
                                        ...selectedGateway,
                                        is_enabled: e.target.checked
                                    })}
                                />
                                Enable Manual Payment
                            </label>
                        </div>

                        <div className="form-group">
                            <label>Bank Name</label>
                            <input
                                type="text"
                                value={selectedGateway.config.bank_name || ''}
                                onChange={(e) => handleConfigChange('bank_name', e.target.value)}
                                placeholder="Bank Central Asia"
                            />
                        </div>

                        <div className="form-group">
                            <label>Account Number</label>
                            <input
                                type="text"
                                value={selectedGateway.config.account_number || ''}
                                onChange={(e) => handleConfigChange('account_number', e.target.value)}
                                placeholder="1234567890"
                            />
                        </div>

                        <div className="form-group">
                            <label>Account Holder</label>
                            <input
                                type="text"
                                value={selectedGateway.config.account_holder || ''}
                                onChange={(e) => handleConfigChange('account_holder', e.target.value)}
                                placeholder="PT Yumna Panel Indonesia"
                            />
                        </div>

                        <div className="form-group">
                            <label>Payment Instructions</label>
                            <textarea
                                value={selectedGateway.config.instructions || ''}
                                onChange={(e) => handleConfigChange('instructions', e.target.value)}
                                placeholder="Please transfer to the account above and send proof of payment..."
                                rows={4}
                            />
                        </div>
                    </div>
                );

            default:
                return <p>Unknown gateway type</p>;
        }
    };

    if (loading) {
        return <div className="payment-gateway-settings loading">Loading payment gateways...</div>;
    }

    return (
        <div className="payment-gateway-settings">
            <div className="settings-header">
                <h2>💳 Payment Gateway Settings</h2>
                <p>Configure payment methods for your billing system</p>
            </div>

            {message && (
                <div className={`message message-${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="settings-content">
                <div className="gateway-list">
                    <h3>Available Gateways</h3>
                    {gateways.map((gateway) => (
                        <div
                            key={gateway.id}
                            className={`gateway-item ${selectedGateway?.id === gateway.id ? 'active' : ''}`}
                            onClick={() => loadGatewayConfig(gateway.name)}
                        >
                            <div className="gateway-info">
                                <h4>{gateway.display_name}</h4>
                                <span className={`status ${gateway.is_enabled ? 'enabled' : 'disabled'}`}>
                                    {gateway.is_enabled ? '✓ Enabled' : '✗ Disabled'}
                                </span>
                            </div>
                            {gateway.is_sandbox && <span className="badge sandbox">Sandbox</span>}
                        </div>
                    ))}
                </div>

                <div className="gateway-config-panel">
                    {selectedGateway ? (
                        <>
                            {renderGatewayConfig()}
                            <div className="config-actions">
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSaveConfig}
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : 'Save Configuration'}
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setSelectedGateway(null)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="no-selection">
                            <p>Select a payment gateway to configure</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentGatewaySettings;
