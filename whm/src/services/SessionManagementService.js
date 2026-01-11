const pool = require('../config/db');
const crypto = require('crypto');

/**
 * Shared Session Management Service
 * Manages sessions across cluster nodes using database
 */
class SessionManagementService {
    constructor() {
        this.sessionTimeout = 3600000; // 1 hour in milliseconds
    }

    /**
     * Create new session
     */
    async createSession(userId, data = {}) {
        try {
            const sessionId = this.generateSessionId();
            const expiresAt = new Date(Date.now() + this.sessionTimeout);

            await pool.promise().query(
                `INSERT INTO ha_sessions (session_id, user_id, data, expires_at) 
                 VALUES (?, ?, ?, ?)`,
                [sessionId, userId, JSON.stringify(data), expiresAt]
            );

            console.log(`[Session] Created session for user ${userId}: ${sessionId}`);

            return {
                sessionId,
                expiresAt
            };
        } catch (error) {
            console.error('[Session] Create error:', error.message);
            throw error;
        }
    }

    /**
     * Get session data
     */
    async getSession(sessionId) {
        try {
            const [sessions] = await pool.promise().query(
                `SELECT * FROM ha_sessions 
                 WHERE session_id = ? AND expires_at > NOW()`,
                [sessionId]
            );

            if (sessions.length === 0) {
                return null;
            }

            const session = sessions[0];

            return {
                sessionId: session.session_id,
                userId: session.user_id,
                data: JSON.parse(session.data),
                expiresAt: session.expires_at,
                createdAt: session.created_at
            };
        } catch (error) {
            console.error('[Session] Get error:', error.message);
            return null;
        }
    }

    /**
     * Update session data
     */
    async updateSession(sessionId, data) {
        try {
            const expiresAt = new Date(Date.now() + this.sessionTimeout);

            await pool.promise().query(
                `UPDATE ha_sessions 
                 SET data = ?, expires_at = ?, updated_at = NOW() 
                 WHERE session_id = ?`,
                [JSON.stringify(data), expiresAt, sessionId]
            );

            return true;
        } catch (error) {
            console.error('[Session] Update error:', error.message);
            return false;
        }
    }

    /**
     * Destroy session
     */
    async destroySession(sessionId) {
        try {
            await pool.promise().query(
                'DELETE FROM ha_sessions WHERE session_id = ?',
                [sessionId]
            );

            console.log(`[Session] Destroyed session: ${sessionId}`);
            return true;
        } catch (error) {
            console.error('[Session] Destroy error:', error.message);
            return false;
        }
    }

    /**
     * Destroy all sessions for a user
     */
    async destroyUserSessions(userId) {
        try {
            await pool.promise().query(
                'DELETE FROM ha_sessions WHERE user_id = ?',
                [userId]
            );

            console.log(`[Session] Destroyed all sessions for user ${userId}`);
            return true;
        } catch (error) {
            console.error('[Session] Destroy user sessions error:', error.message);
            return false;
        }
    }

    /**
     * Touch session (extend expiration)
     */
    async touchSession(sessionId) {
        try {
            const expiresAt = new Date(Date.now() + this.sessionTimeout);

            await pool.promise().query(
                'UPDATE ha_sessions SET expires_at = ? WHERE session_id = ?',
                [expiresAt, sessionId]
            );

            return true;
        } catch (error) {
            console.error('[Session] Touch error:', error.message);
            return false;
        }
    }

    /**
     * Get all active sessions for a user
     */
    async getUserSessions(userId) {
        try {
            const [sessions] = await pool.promise().query(
                `SELECT session_id, data, expires_at, created_at 
                 FROM ha_sessions 
                 WHERE user_id = ? AND expires_at > NOW()
                 ORDER BY created_at DESC`,
                [userId]
            );

            return sessions.map(s => ({
                sessionId: s.session_id,
                data: JSON.parse(s.data),
                expiresAt: s.expires_at,
                createdAt: s.created_at
            }));
        } catch (error) {
            console.error('[Session] Get user sessions error:', error.message);
            return [];
        }
    }

    /**
     * Generate secure session ID
     */
    generateSessionId() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Cleanup expired sessions
     */
    async cleanupExpiredSessions() {
        try {
            const [result] = await pool.promise().query(
                'DELETE FROM ha_sessions WHERE expires_at < NOW()'
            );

            if (result.affectedRows > 0) {
                console.log(`[Session] Cleaned up ${result.affectedRows} expired sessions`);
            }

            return result.affectedRows;
        } catch (error) {
            console.error('[Session] Cleanup error:', error.message);
            return 0;
        }
    }

    /**
     * Get session statistics
     */
    async getStatistics() {
        try {
            const [stats] = await pool.promise().query(`
                SELECT 
                    COUNT(*) as total_sessions,
                    COUNT(DISTINCT user_id) as unique_users,
                    AVG(TIMESTAMPDIFF(SECOND, created_at, NOW())) as avg_session_age
                FROM ha_sessions 
                WHERE expires_at > NOW()
            `);

            return stats[0];
        } catch (error) {
            console.error('[Session] Statistics error:', error.message);
            return {
                total_sessions: 0,
                unique_users: 0,
                avg_session_age: 0
            };
        }
    }
}

module.exports = new SessionManagementService();
