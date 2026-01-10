-- Git Repositories Table
CREATE TABLE IF NOT EXISTS `git_repos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `websiteId` INT DEFAULT NULL,
  `name` VARCHAR(255) NOT NULL,
  `repoUrl` VARCHAR(512) NOT NULL,
  `branch` VARCHAR(100) DEFAULT 'main',
  `deployPath` VARCHAR(512) NOT NULL,
  `lastDeploy` TIMESTAMP NULL,
  `status` ENUM('active', 'deploying', 'error') DEFAULT 'active',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`websiteId`) REFERENCES `websites`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
