-- FTP Accounts Table
CREATE TABLE IF NOT EXISTS `ftp_accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `username` varchar(255) NOT NULL UNIQUE,
  `password` varchar(255) NOT NULL,
  `rootPath` varchar(500) DEFAULT NULL,
  `description` TEXT,
  `status` enum('active','suspended') DEFAULT 'active',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add max_ftp_accounts quota to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS max_ftp_accounts INT DEFAULT 5;
