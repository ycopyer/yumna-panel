const db = require('../config/db');
const { isOnLegalHold } = require('../services/compliance');

/**
 * Middleware to prevent deletion or renaming of files on Legal Hold.
 */
const checkLegalHold = async (req, res, next) => {
    // 1. Determine the path to check
    let pathToCheck = req.body.path || req.body.oldPath || (req.params && req.params.path);
    const trashId = req.params && req.params.id;

    // If it's a trash operation, we need to resolve the original path
    if (!pathToCheck && trashId) {
        try {
            const [rows] = await db.promise().query('SELECT filePath FROM trash WHERE id = ?', [trashId]);
            if (rows && rows.length > 0) {
                pathToCheck = rows[0].filePath;
            }
        } catch (e) {
            console.error('[Compliance Middleware] Trash lookup failed:', e.message);
        }
    }

    // Global empty trash check
    if (req.path === '/trash/empty') {
        // Special case: we might need to check if ANY file in the trash is on legal hold
        try {
            const [rows] = await db.promise().query(
                'SELECT t.filePath FROM trash t JOIN files_compliance fc ON t.filePath = fc.filePath WHERE fc.legal_hold = 1 AND t.userId = ?',
                [req.sessionData.userId]
            );
            if (rows && rows.length > 0) {
                return res.status(403).json({
                    error: `Compliance Violation: ${rows.length} items in your trash are under LEGAL HOLD. Emptying is restricted.`,
                    code: 'LEGAL_HOLD_TRASH_BLOCKED'
                });
            }
        } catch (e) {
            console.error('[Compliance Middleware] Global trash check failed:', e.message);
        }
    }

    if (!pathToCheck) return next();

    try {
        const isHeld = await isOnLegalHold(pathToCheck);
        if (isHeld) {
            return res.status(403).json({
                error: 'Compliance Violation: This item is under LEGAL HOLD and cannot be modified or deleted.',
                code: 'LEGAL_HOLD_ACTIVE'
            });
        }
        next();
    } catch (err) {
        console.error('[Compliance Middleware] Error:', err.message);
        next();
    }
};

module.exports = { checkLegalHold };
