const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, requireAdmin, requirePrivileged } = require('../middleware/auth');
const fraudGuard = require('../services/FraudGuardService');
const { getClientIp } = require('../utils/helpers');

// --- Products (Admin Only) ---

router.get('/products', requireAuth, async (req, res) => {
    try {
        let query = 'SELECT * FROM billing_products WHERE status = "active"';
        const params = [];

        if (req.userRole !== 'admin') {
            // Get user's parent to show relevant products
            const [user] = await pool.promise().query('SELECT parentId FROM users WHERE id = ?', [req.userId]);
            const parentId = user[0]?.parentId;

            // Show products created by their parent, or global ones if no parent
            if (parentId) {
                query += ' AND creatorId = ?';
                params.push(parentId);
            } else {
                query += ' AND creatorId IS NULL';
            }
        }

        const [rows] = await pool.promise().query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/products', requirePrivileged, async (req, res) => {
    const { name, description, price, period, features } = req.body;
    try {
        await pool.promise().query(
            'INSERT INTO billing_products (name, description, price, period, features, creatorId) VALUES (?, ?, ?, ?, ?, ?)',
            [name, description, price, period || 'monthly', JSON.stringify(features), req.userId]
        );
        res.json({ success: true, message: 'Product created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/products/:id', requirePrivileged, async (req, res) => {
    const { name, description, price, period, features } = req.body;
    try {
        // If not admin, verify ownership
        if (req.userRole !== 'admin') {
            const [check] = await pool.promise().query('SELECT creatorId FROM billing_products WHERE id = ?', [req.params.id]);
            if (check.length === 0 || check[0].creatorId !== req.userId) {
                return res.status(403).json({ error: 'Unauthorized to edit this product' });
            }
        }

        await pool.promise().query(
            'UPDATE billing_products SET name = ?, description = ?, price = ?, period = ?, features = ? WHERE id = ?',
            [name, description, price, period, JSON.stringify(features), req.params.id]
        );
        res.json({ success: true, message: 'Product updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/products/:id', requirePrivileged, async (req, res) => {
    try {
        // If not admin, verify ownership
        if (req.userRole !== 'admin') {
            const [check] = await pool.promise().query('SELECT creatorId FROM billing_products WHERE id = ?', [req.params.id]);
            if (check.length === 0 || check[0].creatorId !== req.userId) {
                return res.status(403).json({ error: 'Unauthorized to delete this product' });
            }
        }

        // Soft delete or hide by setting status to 'inactive'
        await pool.promise().query('UPDATE billing_products SET status = "inactive" WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Invoices ---

router.get('/invoices', requireAuth, async (req, res) => {
    const userId = req.userId;
    const isAdmin = req.userRole === 'admin';

    try {
        let query = 'SELECT * FROM billing_invoices';
        const params = [];

        if (!isAdmin) {
            query += ' WHERE userId = ?';
            params.push(userId);
        }

        query += ' ORDER BY createdAt DESC';
        const [rows] = await pool.promise().query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Simple Order Simulation ---
router.post('/order', requireAuth, async (req, res) => {
    const { productId } = req.body;
    const userId = req.userId;
    const ip = getClientIp(req);

    try {
        // 0. Fraud Analysis
        const fraudCheck = await fraudGuard.analyzeAction(userId, ip, 'order');
        if (!fraudCheck.isSafe) {
            console.warn(`[BILLING] Order blocked by FraudGuard for UserID ${userId}. Reason: ${fraudCheck.reasons.join(', ')}`);
            return res.status(403).json({
                error: 'Order blocked by security system',
                details: 'Suspicious activity detected. If this is a mistake, please contact support.'
            });
        }

        // 1. Get Product
        const [products] = await pool.promise().query('SELECT * FROM billing_products WHERE id = ?', [productId]);
        if (products.length === 0) return res.status(404).json({ error: 'Product not found' });
        const product = products[0];

        // 2. Create Order
        const [orderResult] = await pool.promise().query(
            'INSERT INTO billing_orders (userId, productId, amount, status) VALUES (?, ?, ?, "pending")',
            [userId, productId, product.price]
        );
        const orderId = orderResult.insertId;

        // 3. Create Invoice with Tax (PPN 11%)
        const taxRate = 0.11;
        const taxAmount = product.price * taxRate;
        const totalAmount = product.price + taxAmount;
        const dueAt = new Date();
        dueAt.setDate(dueAt.getDate() + 3); // 3 days to pay

        await pool.promise().query(
            'INSERT INTO billing_invoices (orderId, userId, amount, tax_amount, total_amount, status, due_at) VALUES (?, ?, ?, ?, ?, "unpaid", ?)',
            [orderId, userId, product.price, taxAmount, totalAmount, dueAt]
        );

        res.json({ success: true, message: `Order placed. Total: $${totalAmount.toFixed(2)} (Incl. 11% PPN)`, orderId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Invoice Payment & Provisioning ---

router.post('/invoices/:id/pay', requireAuth, async (req, res) => {
    const invoiceId = req.params.id;

    const connection = await pool.promise().getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get Invoice & Order details
        const [invoices] = await connection.query(`
            SELECT i.*, o.productId 
            FROM billing_invoices i 
            JOIN billing_orders o ON i.orderId = o.id 
            WHERE i.id = ?`, [invoiceId]);

        if (invoices.length === 0) throw new Error('Invoice not found');
        const invoice = invoices[0];

        if (req.userRole !== 'admin' && invoice.userId !== req.userId) {
            throw new Error('Unauthorized to pay this invoice');
        }

        if (invoice.status === 'paid') throw new Error('Invoice already paid');

        // 2. Update Invoice Status
        await connection.query('UPDATE billing_invoices SET status = "paid", paid_at = NOW() WHERE id = ?', [invoiceId]);
        await connection.query('UPDATE billing_orders SET status = "active", next_due = DATE_ADD(NOW(), INTERVAL 1 MONTH) WHERE id = ?', [invoice.orderId]);

        // 3. Provision Features (Update User Quota)
        const [products] = await connection.query('SELECT features FROM billing_products WHERE id = ?', [invoice.productId]);
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
                await connection.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
            }
        }

        await connection.commit();
        res.json({ success: true, message: 'Invoice paid and features provisioned' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// --- Usage Rates ---

router.get('/rates', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.promise().query('SELECT * FROM usage_rates');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/rates', requireAuth, requireAdmin, async (req, res) => {
    const { name, unit, price_per_unit } = req.body;
    try {
        await pool.promise().query(
            'INSERT INTO usage_rates (name, unit, price_per_unit) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE unit = VALUES(unit), price_per_unit = VALUES(price_per_unit)',
            [name, unit, price_per_unit]
        );
        res.json({ success: true, message: 'Rate updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Usage-to-Invoice Generation (Stage 6) ---

router.post('/generate-usage-invoices', requireAuth, requireAdmin, async (req, res) => {
    try {
        const [rates] = await pool.promise().query('SELECT * FROM usage_rates');
        const rateMap = rates.reduce((acc, r) => ({ ...acc, [r.name]: r.price_per_unit }), {});

        const [orders] = await pool.promise().query('SELECT * FROM billing_orders WHERE status = "active" AND serverId IS NOT NULL');
        const results = [];

        for (const order of orders) {
            const [usage] = await pool.promise().query(`
                SELECT 
                    AVG(cpu_load) as avg_cpu,
                    AVG(ram_used / 1024 / 1024 / 1024) as avg_ram_gb,
                    AVG(disk_used / 1024 / 1024 / 1024) as avg_disk_gb,
                    (MAX(net_rx + net_tx) - MIN(net_rx + net_tx)) / 1024 / 1024 / 1024 as bandwidth_gb
                FROM usage_metrics 
                WHERE serverId = ? AND timestamp > DATE_SUB(NOW(), INTERVAL 30 DAY)
            `, [order.serverId]);

            const metrics = usage[0];
            if (!metrics.avg_cpu && !metrics.bandwidth_gb) continue;

            const hours = 720; // 30 days
            const cpuCost = (metrics.avg_cpu || 0) * (rateMap['cpu'] || 0.01) * hours;
            const ramCost = (metrics.avg_ram_gb || 0) * (rateMap['ram'] || 0.005) * hours;
            const diskCost = (metrics.avg_disk_gb || 0) * (rateMap['disk'] || 0.0001) * hours;
            const netCost = (metrics.bandwidth_gb || 0) * (rateMap['bandwidth'] || 0.05);

            const baseAmount = parseFloat((cpuCost + ramCost + diskCost + netCost).toFixed(2));
            const taxRate = 0.11;
            const taxAmount = baseAmount * taxRate;
            const totalAmount = baseAmount + taxAmount;

            if (totalAmount > 0.50) { // Minimum invoice $0.50
                const [inv] = await pool.promise().query(
                    'INSERT INTO billing_invoices (orderId, userId, amount, tax_amount, total_amount, status, due_at) VALUES (?, ?, ?, ?, ?, "unpaid", DATE_ADD(NOW(), INTERVAL 7 DAY))',
                    [order.id, order.userId, baseAmount, taxAmount, totalAmount]
                );
                results.push({ orderId: order.id, amount: totalAmount, invoiceId: inv.insertId });
            }
        }
        res.json({ success: true, message: `Processed ${results.length} usage-based invoices`, details: results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
