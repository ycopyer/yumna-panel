const db = require('../config/db');
const { getClientIp, getLocalIp } = require('./helpers');
const { sendNotification } = require('../services/notification');

const ComplianceService = require('../services/compliance');

const PushService = require('../services/pushNotification');

const logActivity = async (userId, action, description, req = null) => {
    // ... (existing notifyActions map) ...
    const notifyActions = {
        'delete': '🗑️ <b>Item Deleted</b>',
        'upload': '📤 <b>File Uploaded</b>',
        'rename': '✏️ <b>Item Renamed</b>',
        'create': '📁 <b>Folder Created</b>',
        'login': '🔑 <b>User Login</b>',
        'download': '📥 <b>Item Downloaded</b>',
        'extract': '📦 <b>Archive Extracted</b>',
        'compress': '🤐 <b>Archive Created</b>',
        'search': '🔍 <b>Search Performed</b>',
        'export': '📄 <b>Directory Map Exported</b>',
        'view': '👀 <b>Item Viewed</b>',
        'share_view': '🌐 <b>Public Share Access</b>',
        'share_preview': '🖼️ <b>File Preview (Public)</b>',
        'share_download': '⬇️ <b>Download (Public Share)</b>',
        'firewall_add': '🚫 <b>Access Blocked (Firewall)</b>',
        'firewall_remove': '✅ <b>Access Restored (Firewall)</b>',
        'firewall_intercept': '🛡️ <b>Illegal Activity Neutralized</b>',
        'legal_hold': '⚖️ <b>Legal Hold Modified</b>'
    };

    const ipAddress = req ? getClientIp(req) : 'system';
    const ipLocal = req ? getLocalIp(req) : 'system';

    // Helper to actually send the notification after gathering data
    const sendLog = async (username) => {
        try {
            const { eventId } = await ComplianceService.logSecureActivity(userId, action, description, { ipAddress, ipLocal });

            let title = notifyActions[action];
            if (!title) {
                const readableAction = action.charAt(0).toUpperCase() + action.slice(1);
                title = `ℹ️ <b>${readableAction}</b>`;
            }

            const date = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

            let msg = `${title}\n\n`;
            msg += `👤 <b>User:</b> ${username}\n`;
            msg += `📄 <b>Detail:</b> ${description}\n`;
            msg += `💻 <b>IP Addr:</b> ${ipAddress}\n`;
            msg += `🆔 <b>Event ID:</b> <code>${eventId}</code>\n`;
            msg += `📅 <b>Time:</b> ${date}`;

            // Send to Telegram
            sendNotification(msg);

            // Send to PWA Push (User's Device)
            const cleanTitle = title.replace(/<[^>]*>/g, ''); // Remove <b> tags
            // Don't await this to avoid blocking response logging if it's slow
            const pushTarget = (req && req.targetUserId) ? req.targetUserId : userId;
            if (pushTarget) {
                PushService.sendToUser(pushTarget, cleanTitle, `${description}\nby ${username}`).catch(e => console.error('[PUSH] Failed in logger:', e.message));
            }

        } catch (err) {
            console.error('[COMPLIANCE] Secure logging failed:', err.message);
        }
    };

    // Check if this is a public share access
    if (req && req.isPublicShare) {
        let visitorName = 'Guest/Public Visitor';
        if (req.user && req.user.username) {
            visitorName = `${req.user.username} (via Share)`;
        } else if (req.sharePasswordUsed) {
            visitorName = 'Guest (Password Authenticated)';
        }
        await sendLog(visitorName);
        return;
    }

    // Try to resolve username for authenticated users
    if (req && req.user && req.user.username) {
        await sendLog(req.user.username);
    } else if (req && req.sessionData && req.sessionData.config && req.sessionData.config.username) {
        await sendLog(req.sessionData.config.username);
    } else {
        db.query('SELECT username FROM users WHERE id = ?', [userId], async (err, results) => {
            const resolvedName = (results && results.length > 0) ? results[0].username : 'Unknown/System';
            await sendLog(resolvedName);
        });
    }
};

module.exports = { logActivity };
