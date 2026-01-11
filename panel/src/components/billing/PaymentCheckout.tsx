import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PaymentCheckout.css';

interface PaymentCheckoutProps {
    invoiceId: number;
    onSuccess?: () => void;
    onCancel?: () => void;
}

interface Gateway {
    id: number;
    name: string;
    display_name: string;
    is_enabled: boolean;
    is_sandbox: boolean;
    supported_currencies: string[];
}

interface Invoice {
    id: number;
    amount: number;
    tax_amount: number;
    total_amount: number;
    status: string;
    due_at: string;
}

const PaymentCheckout: React.FC<PaymentCheckoutProps> = ({ invoiceId, onSuccess, onCancel }) => {
    const [gateways, setGateways] = useState<Gateway[]>([]);
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [selectedGateway, setSelectedGateway] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [invoiceId]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Load available gateways
            const gatewaysRes = await axios.get('/api/payments/gateways');
            setGateways(gatewaysRes.data);

            // Load invoice details
            const invoiceRes = await axios.get(`/api/billing/invoices`);
            const invoiceData = invoiceRes.data.find((inv: Invoice) => inv.id === invoiceId);

            if (invoiceData) {
                setInvoice(invoiceData);
            } else {
                setError('Invoice not found');
            }
        } catch (err: any) {
            console.error('Failed to load payment data:', err);
            setError('Failed to load payment information');
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!selectedGateway || !invoice) return;

        try {
            setProcessing(true);
            setError(null);

            const baseUrl = window.location.origin;

            const response = await axios.post('/api/payments/create', {
                invoiceId: invoice.id,
                gateway: selectedGateway,
                options: {
                    useCheckout: selectedGateway === 'stripe',
                    successUrl: `${baseUrl}/billing/payment-success?invoice=${invoice.id}`,
                    cancelUrl: `${baseUrl}/billing/payment-cancel?invoice=${invoice.id}`,
                    returnUrl: `${baseUrl}/billing/payment-return?invoice=${invoice.id}`,
                }
            });

            // Handle different gateway responses
            if (selectedGateway === 'stripe' && response.data.url) {
                // Redirect to Stripe Checkout
                window.location.href = response.data.url;
            } else if (selectedGateway === 'paypal' && response.data.approvalUrl) {
                // Redirect to PayPal
                window.location.href = response.data.approvalUrl;
            } else if (selectedGateway === 'stripe' && response.data.clientSecret) {
                // Handle Stripe Payment Intent (requires Stripe.js integration)
                setError('Stripe Payment Intent requires additional integration');
            } else {
                setError('Unknown payment response');
            }
        } catch (err: any) {
            console.error('Payment error:', err);
            setError(err.response?.data?.error || 'Payment processing failed');
            setProcessing(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="payment-checkout loading">
                <div className="spinner"></div>
                <p>Loading payment information...</p>
            </div>
        );
    }

    if (error && !invoice) {
        return (
            <div className="payment-checkout error">
                <div className="error-icon">⚠️</div>
                <h3>Error</h3>
                <p>{error}</p>
                {onCancel && (
                    <button className="btn btn-secondary" onClick={onCancel}>
                        Go Back
                    </button>
                )}
            </div>
        );
    }

    if (!invoice) {
        return null;
    }

    if (invoice.status === 'paid') {
        return (
            <div className="payment-checkout success">
                <div className="success-icon">✓</div>
                <h3>Invoice Already Paid</h3>
                <p>This invoice has already been paid.</p>
                {onSuccess && (
                    <button className="btn btn-primary" onClick={onSuccess}>
                        Continue
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="payment-checkout">
            <div className="checkout-header">
                <h2>💳 Complete Payment</h2>
                <p>Invoice #{invoice.id}</p>
            </div>

            {error && (
                <div className="alert alert-error">
                    <span className="alert-icon">⚠️</span>
                    {error}
                </div>
            )}

            <div className="checkout-content">
                {/* Invoice Summary */}
                <div className="invoice-summary">
                    <h3>Invoice Summary</h3>

                    <div className="summary-row">
                        <span>Subtotal</span>
                        <span>{formatCurrency(invoice.amount)}</span>
                    </div>

                    <div className="summary-row">
                        <span>Tax (PPN 11%)</span>
                        <span>{formatCurrency(invoice.tax_amount)}</span>
                    </div>

                    <div className="summary-row total">
                        <span>Total Amount</span>
                        <span>{formatCurrency(invoice.total_amount)}</span>
                    </div>

                    <div className="due-date">
                        Due Date: {formatDate(invoice.due_at)}
                    </div>
                </div>

                {/* Payment Method Selection */}
                <div className="payment-methods">
                    <h3>Select Payment Method</h3>

                    {gateways.length === 0 ? (
                        <div className="no-gateways">
                            <p>No payment methods available</p>
                        </div>
                    ) : (
                        <div className="gateway-options">
                            {gateways.map((gateway) => (
                                <div
                                    key={gateway.id}
                                    className={`gateway-option ${selectedGateway === gateway.name ? 'selected' : ''}`}
                                    onClick={() => setSelectedGateway(gateway.name)}
                                >
                                    <div className="gateway-radio">
                                        <input
                                            type="radio"
                                            name="gateway"
                                            value={gateway.name}
                                            checked={selectedGateway === gateway.name}
                                            onChange={() => setSelectedGateway(gateway.name)}
                                        />
                                    </div>
                                    <div className="gateway-details">
                                        <h4>{gateway.display_name}</h4>
                                        {gateway.is_sandbox && (
                                            <span className="badge sandbox">Test Mode</span>
                                        )}
                                        <p className="gateway-description">
                                            {gateway.name === 'stripe' && 'Pay securely with credit/debit card'}
                                            {gateway.name === 'paypal' && 'Pay with your PayPal account'}
                                            {gateway.name === 'manual' && 'Bank transfer or manual payment'}
                                        </p>
                                    </div>
                                    <div className="gateway-icon">
                                        {gateway.name === 'stripe' && '💳'}
                                        {gateway.name === 'paypal' && '🅿️'}
                                        {gateway.name === 'manual' && '🏦'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="checkout-actions">
                    <button
                        className="btn btn-primary btn-large"
                        onClick={handlePayment}
                        disabled={!selectedGateway || processing}
                    >
                        {processing ? (
                            <>
                                <span className="spinner-small"></span>
                                Processing...
                            </>
                        ) : (
                            <>Pay {formatCurrency(invoice.total_amount)}</>
                        )}
                    </button>

                    {onCancel && (
                        <button
                            className="btn btn-secondary btn-large"
                            onClick={onCancel}
                            disabled={processing}
                        >
                            Cancel
                        </button>
                    )}
                </div>

                {/* Security Notice */}
                <div className="security-notice">
                    <span className="security-icon">🔒</span>
                    <p>Your payment information is encrypted and secure</p>
                </div>
            </div>
        </div>
    );
};

export default PaymentCheckout;
