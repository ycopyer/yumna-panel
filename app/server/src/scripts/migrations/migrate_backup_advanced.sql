-- Migration: Advanced Backup System
-- Created: 2026-01-09

USE filemanager_db;

-- Remote Storage Configurations
CREATE TABLE IF NOT EXISTS remote_storage_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    provider ENUM('sftp', 's3', 'dropbox', 'google_drive') NOT NULL,
    config TEXT NOT NULL, -- JSON encrypted
    isActive TINYINT(1) DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Backup Schedules
CREATE TABLE IF NOT EXISTS backup_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    type ENUM('daily', 'weekly', 'monthly', 'custom') DEFAULT 'daily',
    cron VARCHAR(100), -- For custom or internal use
    target ENUM('full', 'files', 'database', 'email') DEFAULT 'full',
    storageId INT, -- NULL for local
    keepBackups INT DEFAULT 7,
    isActive TINYINT(1) DEFAULT 1,
    lastRun DATETIME,
    nextRun DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (storageId) REFERENCES remote_storage_configs(id) ON DELETE SET NULL
);

-- Enhance backups table (history)
ALTER TABLE backups ADD COLUMN IF NOT EXISTS scheduleId INT AFTER userId;
ALTER TABLE backups ADD COLUMN IF NOT EXISTS storageId INT AFTER scheduleId;
ALTER TABLE backups ADD COLUMN IF NOT EXISTS duration INT AFTER size; -- in seconds
ALTER TABLE backups ADD COLUMN IF NOT EXISTS error_message TEXT AFTER status;
ALTER TABLE backups ADD COLUMN IF NOT EXISTS encrypted TINYINT(1) DEFAULT 0;

-- Ensure foreign keys for the new columns in backups
ALTER TABLE backups ADD CONSTRAINT fk_backup_schedule FOREIGN KEY (scheduleId) REFERENCES backup_schedules(id) ON DELETE SET NULL;
ALTER TABLE backups ADD CONSTRAINT fk_backup_storage FOREIGN KEY (storageId) REFERENCES remote_storage_configs(id) ON DELETE SET NULL;
