const pool = require('../../config/db');
const stripeService = require('./StripeService');
const paypalService = require('./PayPalService');

class PaymentGatewayManager {
    constructor() {
        this.gateways = {
            stripe: stripeService,
            paypal: paypalService
        };
    }

    /**
     * Get all available payment gateways
     */
    async getAvailableGateways() {
        try {
            const [gateways] = await pool.promise().query(
                'SELECT id, name, display_name, is_enabled, is_sandbox, supported_currencies FROM payment_gateways WHERE is_enabled = TRUE ORDER BY name'
            );

            return gateways.map(gateway => ({
                ...gateway,
                supported_currencies: JSON.parse(gateway.supported_currencies || '[]')
            }));
        } catch (error) {
            console.error('[PaymentGatewayManager] Error fetching gateways:', error.message);
            return [];
        }
    }

    /**
     * Get gateway configuration (admin only)
     */
    async getGatewayConfig(gatewayName) {
        try {
            const [gateways] = await pool.promise().query(
                'SELECT * FROM payment_gateways WHERE name = ?',
                [gatewayName]
            );

            if (gateways.length === 0) {
                return null;
            }

            const gateway = gateways[0];
            return {
                ...gateway,
                config: JSON.parse(gateway.config || '{}'),
                supported_currencies: JSON.parse(gateway.supported_currencies || '[]')
            };
        } catch (error) {
            console.error('[PaymentGatewayManager] Error fetching gateway config:', error.message);
            return null;
        }
    }

    /**
     * Update gateway configuration (admin only)
     */
    async updateGatewayConfig(gatewayName, config) {
        try {
            await pool.promise().query(
                'UPDATE payment_gateways SET config = ?, is_enabled = ?, is_sandbox = ?, updated_at = NOW() WHERE name = ?',
                [JSON.stringify(config.settings), config.is_enabled, config.is_sandbox, gatewayName]
            );

            // Reinitialize the service
            if (this.gateways[gatewayName]) {
                await this.gateways[gatewayName].initialize();
            }

            return { success: true };
        } catch (error) {
            console.error('[PaymentGatewayManager] Error updating gateway config:', error.message);
            throw error;
        }
    }

    /**
     * Create payment for an invoice using specified gateway
     */
    async createPayment(invoiceId, userId, gatewayName, options = {}) {
        try {
            // Validate gateway
            const [gateways] = await pool.promise().query(
                'SELECT * FROM payment_gateways WHERE name = ? AND is_enabled = TRUE',
                [gatewayName]
            );

            if (gateways.length === 0) {
                throw new Error(`Payment gateway '${gatewayName}' is not available`);
            }

            const gateway = this.gateways[gatewayName];

            if (!gateway) {
                throw new Error(`Payment gateway '${gatewayName}' is not implemented`);
            }

            // Create payment based on gateway type
            switch (gatewayName) {
                case 'stripe':
                    if (options.useCheckout) {
                        return await gateway.createCheckoutSession(
                            invoiceId,
                            userId,
                            options.successUrl,
                            options.cancelUrl
                        );
                    } else {
                        return await gateway.createPaymentIntent(invoiceId, userId, options.metadata);
                    }

                case 'paypal':
                    return await gateway.createOrder(
                        invoiceId,
                        userId,
                        options.returnUrl,
                        options.cancelUrl
                    );

                default:
                    throw new Error(`Payment creation not supported for gateway: ${gatewayName}`);
            }
        } catch (error) {
            console.error('[PaymentGatewayManager] Error creating payment:', error.message);
            throw error;
        }
    }

    /**
     * Process payment callback/completion
     */
    async processPaymentCallback(gatewayName, data) {
        try {
            const gateway = this.gateways[gatewayName];

            if (!gateway) {
                throw new Error(`Payment gateway '${gatewayName}' is not implemented`);
            }

            switch (gatewayName) {
                case 'paypal':
                    // Capture PayPal order
                    return await gateway.captureOrder(data.orderId);

                default:
                    throw new Error(`Payment callback not supported for gateway: ${gatewayName}`);
            }
        } catch (error) {
            console.error('[PaymentGatewayManager] Error processing payment callback:', error.message);
            throw error;
        }
    }

    /**
     * Handle webhook from payment gateway
     */
    async handleWebhook(gatewayName, payload, headers) {
        try {
            const gateway = this.gateways[gatewayName];

            if (!gateway) {
                throw new Error(`Payment gateway '${gatewayName}' is not implemented`);
            }

            switch (gatewayName) {
                case 'stripe':
                    return await gateway.handleWebhook(payload, headers['stripe-signature']);

                case 'paypal':
                    return await gateway.handleWebhook(payload, headers);

                default:
                    throw new Error(`Webhook not supported for gateway: ${gatewayName}`);
            }
        } catch (error) {
            console.error('[PaymentGatewayManager] Error handling webhook:', error.message);
            throw error;
        }
    }

    /**
     * Get payment transaction details
     */
    async getTransaction(transactionId, userId = null) {
        try {
            let query = 'SELECT * FROM payment_transactions WHERE id = ?';
            const params = [transactionId];

            if (userId) {
                query += ' AND user_id = ?';
                params.push(userId);
            }

            const [transactions] = await pool.promise().query(query, params);

            if (transactions.length === 0) {
                return null;
            }

            const transaction = transactions[0];
            return {
                ...transaction,
                metadata: JSON.parse(transaction.metadata || '{}')
            };
        } catch (error) {
            console.error('[PaymentGatewayManager] Error fetching transaction:', error.message);
            return null;
        }
    }

    /**
     * Get all transactions for a user
     */
    async getUserTransactions(userId, limit = 50) {
        try {
            const [transactions] = await pool.promise().query(
                `SELECT t.*, i.amount as invoice_amount, i.total_amount as invoice_total 
                FROM payment_transactions t 
                LEFT JOIN billing_invoices i ON t.invoice_id = i.id 
                WHERE t.user_id = ? 
                ORDER BY t.created_at DESC 
                LIMIT ?`,
                [userId, limit]
            );

            return transactions.map(t => ({
                ...t,
                metadata: JSON.parse(t.metadata || '{}')
            }));
        } catch (error) {
            console.error('[PaymentGatewayManager] Error fetching user transactions:', error.message);
            return [];
        }
    }

    /**
     * Get all transactions (admin only)
     */
    async getAllTransactions(filters = {}, limit = 100) {
        try {
            let query = `
                SELECT t.*, i.amount as invoice_amount, i.total_amount as invoice_total, u.username 
                FROM payment_transactions t 
                LEFT JOIN billing_invoices i ON t.invoice_id = i.id 
                LEFT JOIN users u ON t.user_id = u.id 
                WHERE 1=1
            `;
            const params = [];

            if (filters.gateway) {
                query += ' AND t.gateway = ?';
                params.push(filters.gateway);
            }

            if (filters.status) {
                query += ' AND t.status = ?';
                params.push(filters.status);
            }

            if (filters.userId) {
                query += ' AND t.user_id = ?';
                params.push(filters.userId);
            }

            query += ' ORDER BY t.created_at DESC LIMIT ?';
            params.push(limit);

            const [transactions] = await pool.promise().query(query, params);

            return transactions.map(t => ({
                ...t,
                metadata: JSON.parse(t.metadata || '{}')
            }));
        } catch (error) {
            console.error('[PaymentGatewayManager] Error fetching all transactions:', error.message);
            return [];
        }
    }

    /**
     * Create a refund
     */
    async createRefund(transactionId, amount, reason, processedBy) {
        try {
            const [transactions] = await pool.promise().query(
                'SELECT * FROM payment_transactions WHERE id = ?',
                [transactionId]
            );

            if (transactions.length === 0) {
                throw new Error('Transaction not found');
            }

            const transaction = transactions[0];
            const gateway = this.gateways[transaction.gateway];

            if (!gateway) {
                throw new Error(`Refund not supported for gateway: ${transaction.gateway}`);
            }

            // Create refund via gateway
            const result = await gateway.createRefund(transactionId, amount, reason);

            // Update refund record with admin who processed it
            await pool.promise().query(
                'UPDATE payment_refunds SET processed_by = ? WHERE transaction_id = ? ORDER BY id DESC LIMIT 1',
                [processedBy, transactionId]
            );

            return result;
        } catch (error) {
            console.error('[PaymentGatewayManager] Error creating refund:', error.message);
            throw error;
        }
    }

    /**
     * Get payment statistics
     */
    async getPaymentStats(userId = null) {
        try {
            let query = `
                SELECT 
                    COUNT(*) as total_transactions,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
                    SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as refunded_count,
                    SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue,
                    SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END) as total_refunded
                FROM payment_transactions
            `;
            const params = [];

            if (userId) {
                query += ' WHERE user_id = ?';
                params.push(userId);
            }

            const [stats] = await pool.promise().query(query, params);

            return stats[0] || {
                total_transactions: 0,
                completed_count: 0,
                failed_count: 0,
                refunded_count: 0,
                total_revenue: 0,
                total_refunded: 0
            };
        } catch (error) {
            console.error('[PaymentGatewayManager] Error fetching payment stats:', error.message);
            return null;
        }
    }
}

module.exports = new PaymentGatewayManager();
