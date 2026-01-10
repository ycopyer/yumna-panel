-- Migration: Add SSL Certificates Table
-- Created: 2026-01-09

USE filemanager_db;

CREATE TABLE IF NOT EXISTS ssl_certificates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    domain VARCHAR(255) NOT NULL,
    is_auto TINYINT(1) DEFAULT 1, -- 1 for Let's Encrypt, 0 for Custom
    cert_path TEXT,
    key_path TEXT,
    fullchain_path TEXT,
    expiry_date DATETIME,
    provider VARCHAR(50) DEFAULT 'letsencrypt',
    status ENUM('active', 'expired', 'revoked', 'pending') DEFAULT 'active',
    last_renewal DATETIME,
    auto_renew TINYINT(1) DEFAULT 1,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX (domain),
    INDEX (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
