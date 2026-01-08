const db = require('../config/db');

const queries = [
    `CREATE TABLE IF NOT EXISTS threat_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ip VARCHAR(45),
        threat_type VARCHAR(50),
        severity VARCHAR(20),
        score INT,
        details TEXT,
        is_blocked TINYINT(1) DEFAULT 0,
        request_path VARCHAR(255),
        request_method VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS security_reputation (
        ip VARCHAR(45) PRIMARY KEY,
        behavioral_score INT DEFAULT 0,
        total_violations INT DEFAULT 0,
        last_violation_at TIMESTAMP,
        locked_until TIMESTAMP NULL,
        risk_level VARCHAR(20) DEFAULT 'Low',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`
];

async function init() {
    console.log('Starting Security Database Initialization...');

    for (const query of queries) {
        await new Promise((resolve, reject) => {
            db.query(query, (err) => {
                if (err) {
                    console.error('Error executing query:', err.message);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    console.log('Security tables initialized successfully.');
    process.exit(0);
}

init().catch(err => {
    console.error('Initialization failed:', err);
    process.exit(1);
});
