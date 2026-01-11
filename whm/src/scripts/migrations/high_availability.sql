-- High Availability Database Schema
-- Tables for WHM clustering and failover management

-- WHM Cluster Nodes
CREATE TABLE IF NOT EXISTS whm_cluster_nodes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hostname VARCHAR(255) NOT NULL,
    ip VARCHAR(45) NOT NULL,
    port INT DEFAULT 4000,
    priority INT DEFAULT 100 COMMENT 'Lower number = higher priority',
    is_primary BOOLEAN DEFAULT FALSE,
    is_enabled BOOLEAN DEFAULT TRUE,
    status ENUM('healthy', 'unhealthy', 'unknown') DEFAULT 'unknown',
    last_health_check TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_primary (is_primary),
    INDEX idx_enabled (is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Failover Events Log
CREATE TABLE IF NOT EXISTS ha_failover_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    old_primary_id INT NULL,
    new_primary_id INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (old_primary_id) REFERENCES whm_cluster_nodes(id) ON DELETE SET NULL,
    FOREIGN KEY (new_primary_id) REFERENCES whm_cluster_nodes(id) ON DELETE CASCADE,
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Session Storage for HA (shared sessions across nodes)
CREATE TABLE IF NOT EXISTS ha_sessions (
    session_id VARCHAR(128) PRIMARY KEY,
    user_id INT NOT NULL,
    data JSON NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_expires (expires_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Cache Storage for HA (shared cache across nodes)
CREATE TABLE IF NOT EXISTS ha_cache (
    cache_key VARCHAR(255) PRIMARY KEY,
    cache_value LONGTEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Load Balancer Health Checks
CREATE TABLE IF NOT EXISTS ha_health_checks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    node_id INT NOT NULL,
    status ENUM('healthy', 'unhealthy') NOT NULL,
    response_time INT NOT NULL COMMENT 'Response time in milliseconds',
    error_message TEXT NULL,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (node_id) REFERENCES whm_cluster_nodes(id) ON DELETE CASCADE,
    INDEX idx_node_time (node_id, checked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default local node
INSERT INTO whm_cluster_nodes (hostname, ip, port, priority, is_primary, is_enabled)
VALUES ('localhost', '127.0.0.1', 4000, 1, TRUE, TRUE)
ON DUPLICATE KEY UPDATE hostname = hostname;

-- Create cleanup event for old health checks (keep last 7 days)
CREATE EVENT IF NOT EXISTS cleanup_old_health_checks
ON SCHEDULE EVERY 1 DAY
DO
DELETE FROM ha_health_checks WHERE checked_at < DATE_SUB(NOW(), INTERVAL 7 DAY);

-- Create cleanup event for expired sessions
CREATE EVENT IF NOT EXISTS cleanup_expired_sessions
ON SCHEDULE EVERY 1 HOUR
DO
DELETE FROM ha_sessions WHERE expires_at < NOW();

-- Create cleanup event for expired cache
CREATE EVENT IF NOT EXISTS cleanup_expired_cache
ON SCHEDULE EVERY 1 HOUR
DO
DELETE FROM ha_cache WHERE expires_at < NOW();
