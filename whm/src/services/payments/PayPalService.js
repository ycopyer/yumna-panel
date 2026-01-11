const pool = require('../../config/db');
const axios = require('axios');

class PayPalService {
    constructor() {
        this.config = null;
        this.initialized = false;
        this.baseURL = null;
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    async initialize() {
        try {
            const [gateways] = await pool.promise().query(
                'SELECT * FROM payment_gateways WHERE name = ? AND is_enabled = TRUE',
                ['paypal']
            );

            if (gateways.length === 0) {
                console.log('[PayPal] Gateway not enabled');
                return false;
            }

            this.config = gateways[0];
            const apiConfig = JSON.parse(this.config.config);

            if (!apiConfig.client_id || !apiConfig.client_secret) {
                console.error('[PayPal] Client credentials not configured');
                return false;
            }

            // Set base URL based on sandbox mode
            this.baseURL = this.config.is_sandbox
                ? 'https://api-m.sandbox.paypal.com'
                : 'https://api-m.paypal.com';

            this.initialized = true;
            console.log(`[PayPal] Initialized in ${this.config.is_sandbox ? 'SANDBOX' : 'LIVE'} mode`);
            return true;
        } catch (error) {
            console.error('[PayPal] Initialization error:', error.message);
            return false;
        }
    }

    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
        if (!this.initialized) {
            throw new Error('PayPal is not configured or enabled');
        }
    }

    /**
     * Get OAuth Access Token
     */
    async getAccessToken() {
        await this.ensureInitialized();

        // Return cached token if still valid
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            const apiConfig = JSON.parse(this.config.config);
            const auth = Buffer.from(`${apiConfig.client_id}:${apiConfig.client_secret}`).toString('base64');

            const response = await axios.post(
                `${this.baseURL}/v1/oauth2/token`,
                'grant_type=client_credentials',
                {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            this.accessToken = response.data.access_token;
            // Set expiry to 5 minutes before actual expiry for safety
            this.tokenExpiry = Date.now() + ((response.data.expires_in - 300) * 1000);

            return this.accessToken;
        } catch (error) {
            console.error('[PayPal] Access token error:', error.response?.data || error.message);
            throw new Error('Failed to obtain PayPal access token');
        }
    }

    /**
     * Create PayPal Order
     */
    async createOrder(invoiceId, userId, returnUrl, cancelUrl) {
        await this.ensureInitialized();

        try {
            const [invoices] = await pool.promise().query(
                'SELECT i.*, o.productId FROM billing_invoices i LEFT JOIN billing_orders o ON i.orderId = o.id WHERE i.id = ? AND i.userId = ?',
                [invoiceId, userId]
            );

            if (invoices.length === 0) {
                throw new Error('Invoice not found');
            }

            const invoice = invoices[0];

            if (invoice.status === 'paid') {
                throw new Error('Invoice already paid');
            }

            // Get product details
            let productName = 'Service Payment';
            if (invoice.productId) {
                const [products] = await pool.promise().query(
                    'SELECT name FROM billing_products WHERE id = ?',
                    [invoice.productId]
                );
                if (products.length > 0) {
                    productName = products[0].name;
                }
            }

            const accessToken = await this.getAccessToken();

            // Create PayPal order
            const response = await axios.post(
                `${this.baseURL}/v2/checkout/orders`,
                {
                    intent: 'CAPTURE',
                    purchase_units: [
                        {
                            reference_id: `INV-${invoiceId}`,
                            description: `Invoice #${invoiceId} - ${productName}`,
                            custom_id: `${userId}`,
                            amount: {
                                currency_code: 'USD',
                                value: invoice.total_amount.toFixed(2),
                                breakdown: {
                                    item_total: {
                                        currency_code: 'USD',
                                        value: invoice.amount.toFixed(2)
                                    },
                                    tax_total: {
                                        currency_code: 'USD',
                                        value: invoice.tax_amount.toFixed(2)
                                    }
                                }
                            }
                        }
                    ],
                    application_context: {
                        return_url: returnUrl,
                        cancel_url: cancelUrl,
                        brand_name: 'Yumna Panel',
                        user_action: 'PAY_NOW'
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const order = response.data;

            // Record transaction
            const [result] = await pool.promise().query(
                `INSERT INTO payment_transactions 
                (invoice_id, user_id, gateway, gateway_transaction_id, amount, currency, status, metadata) 
                VALUES (?, ?, 'paypal', ?, ?, 'USD', 'pending', ?)`,
                [
                    invoiceId,
                    userId,
                    order.id,
                    invoice.total_amount,
                    JSON.stringify({ order_id: order.id })
                ]
            );

            // Get approval URL
            const approvalUrl = order.links.find(link => link.rel === 'approve')?.href;

            return {
                orderId: order.id,
                approvalUrl: approvalUrl,
                transactionId: result.insertId
            };
        } catch (error) {
            console.error('[PayPal] Order creation error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Capture PayPal Order (after user approval)
     */
    async captureOrder(orderId) {
        await this.ensureInitialized();

        const connection = await pool.promise().getConnection();
        try {
            await connection.beginTransaction();

            const accessToken = await this.getAccessToken();

            // Capture the order
            const response = await axios.post(
                `${this.baseURL}/v2/checkout/orders/${orderId}/capture`,
                {},
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const capture = response.data;

            if (capture.status === 'COMPLETED') {
                // Get transaction
                const [transactions] = await connection.query(
                    'SELECT invoice_id, user_id FROM payment_transactions WHERE gateway_transaction_id = ?',
                    [orderId]
                );

                if (transactions.length === 0) {
                    throw new Error('Transaction not found');
                }

                const transaction = transactions[0];
                const invoiceId = transaction.invoice_id;

                // Update transaction status
                await connection.query(
                    'UPDATE payment_transactions SET status = ?, completed_at = NOW(), metadata = ? WHERE gateway_transaction_id = ?',
                    ['completed', JSON.stringify(capture), orderId]
                );

                // Update invoice status
                await connection.query(
                    'UPDATE billing_invoices SET status = ?, paid_at = NOW() WHERE id = ?',
                    ['paid', invoiceId]
                );

                // Get order and provision
                const [invoices] = await connection.query(
                    'SELECT i.orderId, i.userId, o.productId FROM billing_invoices i LEFT JOIN billing_orders o ON i.orderId = o.id WHERE i.id = ?',
                    [invoiceId]
                );

                if (invoices.length > 0) {
                    const invoice = invoices[0];

                    // Update order status
                    await connection.query(
                        'UPDATE billing_orders SET status = ?, next_due = DATE_ADD(NOW(), INTERVAL 1 MONTH) WHERE id = ?',
                        ['active', invoice.orderId]
                    );

                    // Provision features
                    if (invoice.productId) {
                        const [products] = await connection.query(
                            'SELECT features FROM billing_products WHERE id = ?',
                            [invoice.productId]
                        );

                        if (products.length > 0) {
                            const features = JSON.parse(products[0].features || '{}');
                            const updates = [];
                            const params = [];

                            if (features.websites) {
                                updates.push('max_websites = ?');
                                params.push(features.websites);
                            }
                            if (features.databases) {
                                updates.push('max_databases = ?');
                                params.push(features.databases);
                            }

                            if (updates.length > 0) {
                                params.push(invoice.userId);
                                await connection.query(
                                    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
                                    params
                                );
                            }
                        }
                    }
                }

                await connection.commit();
                console.log(`[PayPal] Payment captured for order ${orderId}`);

                return {
                    success: true,
                    captureId: capture.id,
                    status: capture.status
                };
            } else {
                throw new Error(`PayPal capture failed with status: ${capture.status}`);
            }
        } catch (error) {
            await connection.rollback();
            console.error('[PayPal] Capture error:', error.response?.data || error.message);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Handle PayPal Webhook Events
     */
    async handleWebhook(payload, headers) {
        await this.ensureInitialized();

        try {
            // Verify webhook signature
            const verified = await this.verifyWebhookSignature(payload, headers);

            if (!verified) {
                throw new Error('Invalid webhook signature');
            }

            const event = JSON.parse(payload);

            // Log webhook event
            await pool.promise().query(
                'INSERT INTO payment_webhook_events (gateway, event_id, event_type, payload) VALUES (?, ?, ?, ?)',
                ['paypal', event.id, event.event_type, payload]
            );

            // Handle different event types
            switch (event.event_type) {
                case 'CHECKOUT.ORDER.APPROVED':
                    console.log(`[PayPal] Order approved: ${event.resource.id}`);
                    break;

                case 'PAYMENT.CAPTURE.COMPLETED':
                    await this.handleCaptureCompleted(event.resource);
                    break;

                case 'PAYMENT.CAPTURE.DENIED':
                case 'PAYMENT.CAPTURE.DECLINED':
                    await this.handleCaptureFailed(event.resource);
                    break;

                case 'PAYMENT.CAPTURE.REFUNDED':
                    await this.handleCaptureRefunded(event.resource);
                    break;

                default:
                    console.log(`[PayPal] Unhandled event type: ${event.event_type}`);
            }

            return { received: true };
        } catch (error) {
            console.error('[PayPal] Webhook error:', error.message);
            throw error;
        }
    }

    async verifyWebhookSignature(payload, headers) {
        // PayPal webhook verification
        // This is a simplified version - in production, implement full verification
        // using PayPal's webhook verification API
        return true;
    }

    async handleCaptureCompleted(capture) {
        console.log(`[PayPal] Capture completed: ${capture.id}`);
        // Additional processing if needed
    }

    async handleCaptureFailed(capture) {
        try {
            await pool.promise().query(
                'UPDATE payment_transactions SET status = ?, error_message = ? WHERE gateway_transaction_id = ?',
                ['failed', 'Payment capture failed', capture.id]
            );

            console.log(`[PayPal] Capture failed: ${capture.id}`);
        } catch (error) {
            console.error('[PayPal] Error processing capture failure:', error.message);
        }
    }

    async handleCaptureRefunded(refund) {
        try {
            const [transactions] = await pool.promise().query(
                'SELECT id FROM payment_transactions WHERE gateway_transaction_id = ?',
                [refund.id]
            );

            if (transactions.length > 0) {
                const transactionId = transactions[0].id;

                await pool.promise().query(
                    'UPDATE payment_transactions SET status = ? WHERE id = ?',
                    ['refunded', transactionId]
                );

                await pool.promise().query(
                    'INSERT INTO payment_refunds (transaction_id, gateway_refund_id, amount, status, completed_at) VALUES (?, ?, ?, ?, NOW())',
                    [transactionId, refund.id, parseFloat(refund.amount.value), 'completed']
                );

                console.log(`[PayPal] Refund processed for transaction ${transactionId}`);
            }
        } catch (error) {
            console.error('[PayPal] Error processing refund:', error.message);
        }
    }

    /**
     * Create a refund
     */
    async createRefund(transactionId, amount, reason) {
        await this.ensureInitialized();

        try {
            const [transactions] = await pool.promise().query(
                'SELECT * FROM payment_transactions WHERE id = ? AND gateway = ?',
                [transactionId, 'paypal']
            );

            if (transactions.length === 0) {
                throw new Error('Transaction not found');
            }

            const transaction = transactions[0];

            if (transaction.status !== 'completed') {
                throw new Error('Can only refund completed transactions');
            }

            const metadata = JSON.parse(transaction.metadata || '{}');
            const captureId = metadata.capture_id;

            if (!captureId) {
                throw new Error('Capture ID not found');
            }

            const accessToken = await this.getAccessToken();

            // Create PayPal refund
            const response = await axios.post(
                `${this.baseURL}/v2/payments/captures/${captureId}/refund`,
                {
                    amount: amount ? {
                        currency_code: 'USD',
                        value: amount.toFixed(2)
                    } : undefined,
                    note_to_payer: reason || 'Refund requested'
                },
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const refund = response.data;

            // Record refund
            await pool.promise().query(
                'INSERT INTO payment_refunds (transaction_id, gateway_refund_id, amount, reason, status) VALUES (?, ?, ?, ?, ?)',
                [transactionId, refund.id, parseFloat(refund.amount.value), reason, 'pending']
            );

            return {
                success: true,
                refundId: refund.id,
                amount: parseFloat(refund.amount.value)
            };
        } catch (error) {
            console.error('[PayPal] Refund error:', error.response?.data || error.message);
            throw error;
        }
    }
}

module.exports = new PayPalService();
