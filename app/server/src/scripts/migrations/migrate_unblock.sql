-- Create unblock_requests table
CREATE TABLE IF NOT EXISTS unblock_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip VARCHAR(45) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    block_reason TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    processedAt DATETIME DEFAULT NULL,
    processedBy INT DEFAULT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ip (ip),
    INDEX idx_status (status),
    INDEX idx_createdAt (createdAt)
);

SELECT 'unblock_requests table created successfully!' as status;
