const { logActivity } = require('../utils/logger');

// List of known ransomware extensions
const SUSPICIOUS_EXTENSIONS = [
    '.wnry', '.wcry', '.locky', '.crypt', '.encrypted', '.enc', '.crypted',
    '.darkness', '.kbk', '.kraken', '.locked', '.nochance', '.oshit',
    '.ryuk', '.sodinokibi', '.stop', '.uudjvu', '.wanacry', '.wlu',
    '.lock', '.000', '.micro', '.zepto'
];

// In-memory counter for mass modification detection (Simple implementation)
// Key: userId, Value: { count, startTime }
const modificationRate = new Map();

const RATE_LIMIT_THRESHOLD = 50; // Max file ops
const RATE_LIMIT_WINDOW = 10000; // per 10 secons

const checkRansomwareActivity = (req, res, next) => {
    const { path: filePath, newPath, destination, newName } = req.body;
    const userId = req.sessionData ? req.sessionData.userId : 'unknown';

    // 1. Check Rate Limiting (Mass Modification Prevention)
    // Only monitor destructive/change ops: rename, delete, move, upload
    const now = Date.now();
    let stats = modificationRate.get(userId) || { count: 0, startTime: now };

    if (now - stats.startTime > RATE_LIMIT_WINDOW) {
        // Reset window
        stats = { count: 1, startTime: now };
    } else {
        stats.count++;
    }
    modificationRate.set(userId, stats);

    if (stats.count > RATE_LIMIT_THRESHOLD) {
        logActivity(userId, 'ransomware_alert', `High frequency file operations detected (${stats.count} ops/10s). Action blocked.`, req);
        return res.status(429).json({
            error: 'Security Alert: Abnormal file operation frequency. Account temporarily locked for check.'
        });
    }

    // 2. Check Extension Blacklist (On Rename/Upload)
    let targetName = null;

    if (newPath) targetName = newPath;
    else if (newName) targetName = newName; // Support generic name param
    else if (req.file) targetName = req.file.originalname;
    else if (req.files && req.files.length > 0) targetName = req.files[0].originalname;

    if (targetName) {
        const ext = targetName.slice(((targetName.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
        if (ext && SUSPICIOUS_EXTENSIONS.includes(`.${ext}`)) {

            // Log High Severity Alert
            logActivity(userId, 'ransomware_blocked', `Blocked attempt to create/rename file with ransomware extension: ${targetName}`, req);

            console.error(`[SECURITY] Ransomware behavior detected from User ${userId}: Usage of extension .${ext}`);

            // Return error immediately
            return res.status(403).json({
                error: 'Security Alert: Operation blocked by Anti-Ransomware Shield. This action mimics ransomware behavior.'
            });
        }
    }

    next();
};

module.exports = { checkRansomwareActivity };
