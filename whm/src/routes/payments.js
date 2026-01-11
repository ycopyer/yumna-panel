const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../../middleware/auth');
const paymentGatewayManager = require('../../services/payments/PaymentGatewayManager');
const { getClientIp } = require('../../utils/helpers');

// --- Gateway Configuration (Admin Only) ---

/**
 * GET /api/payments/gateways
 * Get all available payment gateways
 */
router.get('/gateways', requireAuth, async (req, res) => {
    try {
        const gateways = await paymentGatewayManager.getAvailableGateways();
        res.json(gateways);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payments/gateways/:name
 * Get gateway configuration (Admin only)
 */
router.get('/gateways/:name', requireAuth, requireAdmin, async (req, res) => {
    try {
        const config = await paymentGatewayManager.getGatewayConfig(req.params.name);

        if (!config) {
            return res.status(404).json({ error: 'Gateway not found' });
        }

        res.json(config);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/payments/gateways/:name
 * Update gateway configuration (Admin only)
 */
router.put('/gateways/:name', requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await paymentGatewayManager.updateGatewayConfig(
            req.params.name,
            req.body
        );

        res.json({
            success: true,
            message: `${req.params.name} gateway configuration updated`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Payment Processing ---

/**
 * POST /api/payments/create
 * Create a payment for an invoice
 */
router.post('/create', requireAuth, async (req, res) => {
    try {
        const { invoiceId, gateway, options } = req.body;
        const userId = req.userId;

        if (!invoiceId || !gateway) {
            return res.status(400).json({
                error: 'Invoice ID and gateway are required'
            });
        }

        // Verify invoice belongs to user (unless admin)
        if (req.userRole !== 'admin') {
            const pool = require('../../config/db');
            const [invoices] = await pool.promise().query(
                'SELECT userId FROM billing_invoices WHERE id = ?',
                [invoiceId]
            );

            if (invoices.length === 0) {
                return res.status(404).json({ error: 'Invoice not found' });
            }

            if (invoices[0].userId !== userId) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
        }

        const result = await paymentGatewayManager.createPayment(
            invoiceId,
            userId,
            gateway,
            {
                ...options,
                ip: getClientIp(req),
                userAgent: req.headers['user-agent']
            }
        );

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('[Payment API] Create payment error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/payments/callback/:gateway
 * Handle payment callback/completion
 */
router.post('/callback/:gateway', requireAuth, async (req, res) => {
    try {
        const result = await paymentGatewayManager.processPaymentCallback(
            req.params.gateway,
            req.body
        );

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('[Payment API] Callback error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/payments/webhook/:gateway
 * Handle webhook from payment gateway (no auth required)
 */
router.post('/webhook/:gateway', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const gateway = req.params.gateway;
        const payload = req.body;
        const headers = req.headers;

        console.log(`[Payment Webhook] Received ${gateway} webhook`);

        await paymentGatewayManager.handleWebhook(gateway, payload, headers);

        res.json({ received: true });
    } catch (error) {
        console.error('[Payment Webhook] Error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// --- Transaction Management ---

/**
 * GET /api/payments/transactions
 * Get user's payment transactions
 */
router.get('/transactions', requireAuth, async (req, res) => {
    try {
        const userId = req.userRole === 'admin' ? null : req.userId;
        const limit = parseInt(req.query.limit) || 50;

        let transactions;

        if (req.userRole === 'admin') {
            const filters = {
                gateway: req.query.gateway,
                status: req.query.status,
                userId: req.query.userId
            };
            transactions = await paymentGatewayManager.getAllTransactions(filters, limit);
        } else {
            transactions = await paymentGatewayManager.getUserTransactions(userId, limit);
        }

        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payments/transactions/:id
 * Get specific transaction details
 */
router.get('/transactions/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.userRole === 'admin' ? null : req.userId;
        const transaction = await paymentGatewayManager.getTransaction(
            req.params.id,
            userId
        );

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json(transaction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payments/stats
 * Get payment statistics
 */
router.get('/stats', requireAuth, async (req, res) => {
    try {
        const userId = req.userRole === 'admin' ? null : req.userId;
        const stats = await paymentGatewayManager.getPaymentStats(userId);

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Refund Management (Admin Only) ---

/**
 * POST /api/payments/refund
 * Create a refund for a transaction
 */
router.post('/refund', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { transactionId, amount, reason } = req.body;

        if (!transactionId) {
            return res.status(400).json({ error: 'Transaction ID is required' });
        }

        const result = await paymentGatewayManager.createRefund(
            transactionId,
            amount,
            reason,
            req.userId
        );

        res.json({
            success: true,
            message: 'Refund processed successfully',
            ...result
        });
    } catch (error) {
        console.error('[Payment API] Refund error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/payments/refunds
 * Get all refunds (Admin only)
 */
router.get('/refunds', requireAuth, requireAdmin, async (req, res) => {
    try {
        const pool = require('../../config/db');
        const [refunds] = await pool.promise().query(`
            SELECT r.*, t.gateway, t.gateway_transaction_id, t.user_id, u.username
            FROM payment_refunds r
            LEFT JOIN payment_transactions t ON r.transaction_id = t.id
            LEFT JOIN users u ON t.user_id = u.id
            ORDER BY r.created_at DESC
            LIMIT 100
        `);

        res.json(refunds);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Webhook Events Log (Admin Only) ---

/**
 * GET /api/payments/webhook-events
 * Get webhook events log
 */
router.get('/webhook-events', requireAuth, requireAdmin, async (req, res) => {
    try {
        const pool = require('../../config/db');
        const gateway = req.query.gateway;
        const limit = parseInt(req.query.limit) || 50;

        let query = 'SELECT * FROM payment_webhook_events';
        const params = [];

        if (gateway) {
            query += ' WHERE gateway = ?';
            params.push(gateway);
        }

        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);

        const [events] = await pool.promise().query(query, params);

        res.json(events.map(e => ({
            ...e,
            payload: JSON.parse(e.payload || '{}')
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
