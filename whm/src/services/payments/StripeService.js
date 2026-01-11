const pool = require('../../config/db');

class StripeService {
    constructor() {
        this.stripe = null;
        this.config = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            const [gateways] = await pool.promise().query(
                'SELECT * FROM payment_gateways WHERE name = ? AND is_enabled = TRUE',
                ['stripe']
            );

            if (gateways.length === 0) {
                console.log('[Stripe] Gateway not enabled');
                return false;
            }

            this.config = gateways[0];
            const apiConfig = JSON.parse(this.config.config);

            if (!apiConfig.secret_key) {
                console.error('[Stripe] Secret key not configured');
                return false;
            }

            // Lazy load Stripe SDK
            const Stripe = require('stripe');
            this.stripe = Stripe(apiConfig.secret_key);
            this.initialized = true;

            console.log(`[Stripe] Initialized in ${this.config.is_sandbox ? 'SANDBOX' : 'LIVE'} mode`);
            return true;
        } catch (error) {
            console.error('[Stripe] Initialization error:', error.message);
            return false;
        }
    }

    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
        if (!this.initialized) {
            throw new Error('Stripe is not configured or enabled');
        }
    }

    /**
     * Create a Payment Intent for invoice payment
     */
    async createPaymentIntent(invoiceId, userId, metadata = {}) {
        await this.ensureInitialized();

        try {
            // Get invoice details
            const [invoices] = await pool.promise().query(
                'SELECT * FROM billing_invoices WHERE id = ? AND userId = ?',
                [invoiceId, userId]
            );

            if (invoices.length === 0) {
                throw new Error('Invoice not found');
            }

            const invoice = invoices[0];

            if (invoice.status === 'paid') {
                throw new Error('Invoice already paid');
            }

            // Create Stripe Payment Intent
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: Math.round(invoice.total_amount * 100), // Convert to cents
                currency: 'usd',
                metadata: {
                    invoice_id: invoiceId,
                    user_id: userId,
                    ...metadata
                },
                automatic_payment_methods: {
                    enabled: true,
                }
            });

            // Record transaction
            const [result] = await pool.promise().query(
                `INSERT INTO payment_transactions 
                (invoice_id, user_id, gateway, gateway_transaction_id, amount, currency, status, metadata) 
                VALUES (?, ?, 'stripe', ?, ?, 'USD', 'pending', ?)`,
                [
                    invoiceId,
                    userId,
                    paymentIntent.id,
                    invoice.total_amount,
                    JSON.stringify({ payment_intent: paymentIntent.id })
                ]
            );

            return {
                clientSecret: paymentIntent.client_secret,
                transactionId: result.insertId,
                amount: invoice.total_amount
            };
        } catch (error) {
            console.error('[Stripe] Payment Intent creation error:', error.message);
            throw error;
        }
    }

    /**
     * Create a Checkout Session (alternative to Payment Intent)
     */
    async createCheckoutSession(invoiceId, userId, successUrl, cancelUrl) {
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

            // Create Stripe Checkout Session
            const session = await this.stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: productName,
                                description: `Invoice #${invoiceId}`
                            },
                            unit_amount: Math.round(invoice.total_amount * 100)
                        },
                        quantity: 1
                    }
                ],
                mode: 'payment',
                success_url: successUrl,
                cancel_url: cancelUrl,
                metadata: {
                    invoice_id: invoiceId,
                    user_id: userId
                }
            });

            // Record transaction
            const [result] = await pool.promise().query(
                `INSERT INTO payment_transactions 
                (invoice_id, user_id, gateway, gateway_transaction_id, amount, currency, status, metadata) 
                VALUES (?, ?, 'stripe', ?, ?, 'USD', 'pending', ?)`,
                [
                    invoiceId,
                    userId,
                    session.id,
                    invoice.total_amount,
                    JSON.stringify({ session_id: session.id })
                ]
            );

            return {
                sessionId: session.id,
                url: session.url,
                transactionId: result.insertId
            };
        } catch (error) {
            console.error('[Stripe] Checkout Session creation error:', error.message);
            throw error;
        }
    }

    /**
     * Handle Stripe Webhook Events
     */
    async handleWebhook(payload, signature) {
        await this.ensureInitialized();

        const apiConfig = JSON.parse(this.config.config);
        const webhookSecret = apiConfig.webhook_secret;

        if (!webhookSecret) {
            throw new Error('Webhook secret not configured');
        }

        try {
            // Verify webhook signature
            const event = this.stripe.webhooks.constructEvent(
                payload,
                signature,
                webhookSecret
            );

            // Log webhook event
            await pool.promise().query(
                'INSERT INTO payment_webhook_events (gateway, event_id, event_type, payload) VALUES (?, ?, ?, ?)',
                ['stripe', event.id, event.type, JSON.stringify(event)]
            );

            // Handle different event types
            switch (event.type) {
                case 'payment_intent.succeeded':
                    await this.handlePaymentIntentSucceeded(event.data.object);
                    break;

                case 'payment_intent.payment_failed':
                    await this.handlePaymentIntentFailed(event.data.object);
                    break;

                case 'checkout.session.completed':
                    await this.handleCheckoutSessionCompleted(event.data.object);
                    break;

                case 'charge.refunded':
                    await this.handleChargeRefunded(event.data.object);
                    break;

                default:
                    console.log(`[Stripe] Unhandled event type: ${event.type}`);
            }

            return { received: true };
        } catch (error) {
            console.error('[Stripe] Webhook error:', error.message);
            throw error;
        }
    }

    async handlePaymentIntentSucceeded(paymentIntent) {
        const connection = await pool.promise().getConnection();
        try {
            await connection.beginTransaction();

            const invoiceId = paymentIntent.metadata.invoice_id;

            // Update transaction status
            await connection.query(
                'UPDATE payment_transactions SET status = ?, completed_at = NOW() WHERE gateway_transaction_id = ?',
                ['completed', paymentIntent.id]
            );

            // Update invoice status
            await connection.query(
                'UPDATE billing_invoices SET status = ?, paid_at = NOW() WHERE id = ?',
                ['paid', invoiceId]
            );

            // Get order and provision
            const [invoices] = await connection.query(
                'SELECT orderId, userId, productId FROM billing_invoices i LEFT JOIN billing_orders o ON i.orderId = o.id WHERE i.id = ?',
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
            console.log(`[Stripe] Payment succeeded for invoice ${invoiceId}`);
        } catch (error) {
            await connection.rollback();
            console.error('[Stripe] Error processing payment success:', error.message);
            throw error;
        } finally {
            connection.release();
        }
    }

    async handlePaymentIntentFailed(paymentIntent) {
        try {
            await pool.promise().query(
                'UPDATE payment_transactions SET status = ?, error_message = ? WHERE gateway_transaction_id = ?',
                ['failed', paymentIntent.last_payment_error?.message || 'Payment failed', paymentIntent.id]
            );

            console.log(`[Stripe] Payment failed: ${paymentIntent.id}`);
        } catch (error) {
            console.error('[Stripe] Error processing payment failure:', error.message);
        }
    }

    async handleCheckoutSessionCompleted(session) {
        // Similar to payment intent succeeded
        await this.handlePaymentIntentSucceeded({
            id: session.id,
            metadata: session.metadata
        });
    }

    async handleChargeRefunded(charge) {
        try {
            const [transactions] = await pool.promise().query(
                'SELECT id FROM payment_transactions WHERE gateway_transaction_id = ?',
                [charge.payment_intent]
            );

            if (transactions.length > 0) {
                const transactionId = transactions[0].id;

                await pool.promise().query(
                    'UPDATE payment_transactions SET status = ? WHERE id = ?',
                    ['refunded', transactionId]
                );

                await pool.promise().query(
                    'INSERT INTO payment_refunds (transaction_id, gateway_refund_id, amount, status, completed_at) VALUES (?, ?, ?, ?, NOW())',
                    [transactionId, charge.refunds.data[0]?.id, charge.amount_refunded / 100, 'completed']
                );

                console.log(`[Stripe] Refund processed for transaction ${transactionId}`);
            }
        } catch (error) {
            console.error('[Stripe] Error processing refund:', error.message);
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
                [transactionId, 'stripe']
            );

            if (transactions.length === 0) {
                throw new Error('Transaction not found');
            }

            const transaction = transactions[0];

            if (transaction.status !== 'completed') {
                throw new Error('Can only refund completed transactions');
            }

            // Create Stripe refund
            const refund = await this.stripe.refunds.create({
                payment_intent: transaction.gateway_transaction_id,
                amount: amount ? Math.round(amount * 100) : undefined,
                reason: reason || 'requested_by_customer'
            });

            // Record refund
            await pool.promise().query(
                'INSERT INTO payment_refunds (transaction_id, gateway_refund_id, amount, reason, status) VALUES (?, ?, ?, ?, ?)',
                [transactionId, refund.id, refund.amount / 100, reason, 'pending']
            );

            return {
                success: true,
                refundId: refund.id,
                amount: refund.amount / 100
            };
        } catch (error) {
            console.error('[Stripe] Refund error:', error.message);
            throw error;
        }
    }
}

module.exports = new StripeService();
