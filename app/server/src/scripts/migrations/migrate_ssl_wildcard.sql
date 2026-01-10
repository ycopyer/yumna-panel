-- Migration: Add wildcard column to ssl_certificates
-- Created: 2026-01-09

USE filemanager_db;

ALTER TABLE ssl_certificates ADD COLUMN wildcard TINYINT(1) DEFAULT 0 AFTER auto_renew;
