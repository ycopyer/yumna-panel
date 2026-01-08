const express = require('express');
const router = express.Router();
const PushService = require('../../services/pushNotification');
const { getSession, requireAuth } = require('../../middleware/auth');

/**
 * Get VAPID Public Key
 */
router.get('/notifications/vapid-key', (req, res) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
        return res.status(500).json({ error: 'VAPID keys not configured' });
    }
    res.json({ publicKey });
});

/**
 * Subscribe to Push Notifications
 */
router.post('/notifications/subscribe', getSession, requireAuth, async (req, res) => {
    try {
        const subscription = req.body;
        await PushService.saveSubscription(req.sessionData.userId, subscription);

        // Send welcome notification
        await PushService.sendToUser(
            req.sessionData.userId,
            'Notifications Enabled! 🎉',
            'You will now receive alerts for important file activities.',
            { url: '/' }
        );

        res.status(201).json({ success: true });
    } catch (err) {
        console.error('Subscription error:', err);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
});

/**
 * Send Test Notification (Admin only)
 */
router.post('/notifications/test', getSession, requireAuth, async (req, res) => {
    try {
        await PushService.sendToUser(
            req.sessionData.userId,
            'Test Notification',
            'This is a test message from Yumna Panel.',
            { url: '/' }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
