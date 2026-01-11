const db = require('../config/db');

const sendNotification = (message) => {
    db.query("SELECT key_name, value_text FROM settings WHERE key_name IN ('telegram_bot_token', 'telegram_chat_id', 'enable_notifications')", (err, results) => {
        if (err) {
            console.error('[NOTIF] DB Error:', err);
            return;
        }
        if (results.length === 0) {
            console.log('[NOTIF] No settings found');
            return;
        }
        const conf = {};
        results.forEach(r => conf[r.key_name] = r.value_text);

        console.log('[NOTIF] Config:', { enabled: conf.enable_notifications, hasToken: !!conf.telegram_bot_token, hasChatId: !!conf.telegram_chat_id });

        if (conf.enable_notifications === 'true' && conf.telegram_bot_token && conf.telegram_chat_id) {
            const url = `https://api.telegram.org/bot${conf.telegram_bot_token}/sendMessage`;
            console.log('[NOTIF] Sending to:', url);
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: conf.telegram_chat_id,
                    text: `<b>📢 Yumna Panel Notification</b>\n\n${message}`,
                    parse_mode: 'HTML'
                })
            })
                .then(res => res.json())
                .then(data => console.log('[NOTIF] Telegram Response:', data))
                .catch(e => console.error('[NOTIF] Delivery failed:', e.message));
        } else {
            console.log('[NOTIF] Notifications disabled or missing config');
        }
    });
};

module.exports = { sendNotification };
