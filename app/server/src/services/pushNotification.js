const webpush = require('web-push');
const db = require('../config/db');

// Initialize VAPID
const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (publicKey && privateKey) {
    webpush.setVapidDetails(
        'mailto:admin@example.com',
        publicKey,
        privateKey
    );
}

const PushService = {
    /**
     * Save user subscription to database
     */
    saveSubscription: async (userId, subscription) => {
        return new Promise((resolve, reject) => {
            db.query(
                `INSERT INTO push_subscriptions (userId, endpoint, p256dh, auth) 
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE p256dh = ?, auth = ?`,
                [
                    userId,
                    subscription.endpoint,
                    subscription.keys.p256dh,
                    subscription.keys.auth,
                    subscription.keys.p256dh,
                    subscription.keys.auth
                ],
                (err, res) => {
                    if (err) reject(err);
                    else resolve(res);
                }
            );
        });
    },

    /**
     * Send notification to specific user
     */
    sendToUser: async (userId, title, body, data = {}) => {
        return new Promise((resolve, reject) => {
            // Get user subscriptions
            db.query(
                'SELECT * FROM push_subscriptions WHERE userId = ?',
                [userId],
                async (err, subs) => {
                    if (err) return reject(err);

                    const payload = JSON.stringify({
                        title,
                        body,
                        url: data.url,
                        ...data
                    });

                    const promises = subs.map(sub => {
                        const pushSubscription = {
                            endpoint: sub.endpoint,
                            keys: {
                                p256dh: sub.p256dh,
                                auth: sub.auth
                            }
                        };

                        return webpush.sendNotification(pushSubscription, payload)
                            .catch(error => {
                                if (error.statusCode === 410 || error.statusCode === 404) {
                                    // Subscription expired or invalid, delete it
                                    console.log(`[PUSH] Removing invalid subscription for user ${userId}`);
                                    db.query('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
                                } else {
                                    console.error('[PUSH] Error sending:', error);
                                }
                            });
                    });

                    await Promise.all(promises);
                    resolve({ sent: promises.length });
                }
            );
        });
    },

    /**
     * Send notification to ALL admins
     */
    sendToAdmins: async (title, body, data = {}) => {
        return new Promise((resolve) => {
            db.query("SELECT id FROM users WHERE role = 'admin'", async (err, admins) => {
                if (err) return resolve(0);

                for (const admin of admins) {
                    await PushService.sendToUser(admin.id, title, body, data);
                }
                resolve();
            });
        });
    }
};

module.exports = PushService;
