const pool = require('./src/config/db');

const sessionId = 'd8ae746a-517a-423c-8667-fcfd8f577e97';
const userId = '1';

pool.query(
    'SELECT u.id, u.role, u.username, u.status, s.lastActive FROM user_sessions s JOIN users u ON s.userId = u.id WHERE s.sessionId = ? AND s.userId = ?',
    [sessionId, userId],
    (err, results) => {
        if (err) {
            console.error('Error:', err);
            process.exit(1);
        }
        console.log('Results:', JSON.stringify(results, null, 2));
        
        if (results.length > 0) {
            const user = results[0];
            const lastActive = new Date(user.lastActive).getTime();
            const now = Date.now();
            const thirtyMinutes = 30 * 60 * 1000;
            console.log('Now:', new Date(now).toISOString());
            console.log('Last Active:', new Date(lastActive).toISOString());
            console.log('Diff (ms):', now - lastActive);
            console.log('Expired:', (now - lastActive > thirtyMinutes));
        } else {
            console.log('No session found for that ID and UserID.');
            
            // Try searching only by sessionId
            pool.query('SELECT * FROM user_sessions WHERE sessionId = ?', [sessionId], (err2, results2) => {
                if (err2) {
                    console.error('Error searching only sessionId:', err2);
                    process.exit(1);
                }
                console.log('Results (session only):', JSON.stringify(results2, null, 2));
                process.exit(0);
            });
        }
    }
);
