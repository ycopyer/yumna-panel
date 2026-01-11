const pool = require('../config/db');

const initV3 = async () => {
    const createServersTable = `
        CREATE TABLE IF NOT EXISTS servers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            hostname VARCHAR(255) NOT NULL,
            ip VARCHAR(45) NOT NULL,
            is_local BOOLEAN DEFAULT FALSE,
            ssh_user VARCHAR(255),
            ssh_password VARCHAR(255),
            ssh_port INT DEFAULT 22,
            status VARCHAR(50) DEFAULT 'unknown',
            cpu_usage FLOAT DEFAULT 0,
            ram_usage FLOAT DEFAULT 0,
            disk_usage FLOAT DEFAULT 0,
            uptime FLOAT DEFAULT 0,
            last_seen TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const createComplianceTable = `
        CREATE TABLE IF NOT EXISTS activity_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            event_id VARCHAR(50),
            userId INT,
            action VARCHAR(50),
            description TEXT,
            ipAddress VARCHAR(45),
            ipLocal VARCHAR(45),
            hash VARCHAR(255),
            prev_hash VARCHAR(255),
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user (userId),
            INDEX idx_event (event_id)
        )
    `;

    const createPushTable = `
        CREATE TABLE IF NOT EXISTS push_subscriptions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT,
            endpoint TEXT,
            p256dh TEXT,
            auth TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user (userId),
            UNIQUE KEY unique_endpoint (endpoint(255))
        )
    `;

    const createWebsitesTable = `
        CREATE TABLE IF NOT EXISTS websites (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            domain VARCHAR(255) UNIQUE NOT NULL,
            serverId INT DEFAULT 1,
            rootPath TEXT NOT NULL,
            phpVersion VARCHAR(10) DEFAULT '8.2',
            webStack ENUM('nginx', 'apache', 'hybrid') DEFAULT 'nginx',
            sslEnabled TINYINT DEFAULT 0,
            status ENUM('active', 'suspended') DEFAULT 'active',
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_status (status)
        )
    `;

    const createDatabasesTable = `
        CREATE TABLE IF NOT EXISTS \`databases\` (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            name VARCHAR(255) UNIQUE NOT NULL,
            user VARCHAR(255) NOT NULL,
            password TEXT NOT NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const createSslTable = `
        CREATE TABLE IF NOT EXISTS ssl_certificates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT,
            domain VARCHAR(255) NOT NULL,
            is_auto TINYINT DEFAULT 1,
            cert_path TEXT,
            key_path TEXT,
            fullchain_path TEXT,
            expiry_date TIMESTAMP NULL,
            provider VARCHAR(50) DEFAULT 'letsencrypt',
            status VARCHAR(20) DEFAULT 'active',
            wildcard TINYINT DEFAULT 0,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const createBillingProductsTable = `
        CREATE TABLE IF NOT EXISTS billing_products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            price DECIMAL(10, 2) NOT NULL,
            period ENUM('monthly', 'yearly', 'onetime') DEFAULT 'monthly',
            features JSON,
            creatorId INT DEFAULT NULL,
            status VARCHAR(20) DEFAULT 'active',
            INDEX idx_creator (creatorId)
        )
    `;

    const createBillingOrdersTable = `
        CREATE TABLE IF NOT EXISTS billing_orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            productId INT NOT NULL,
            serverId INT DEFAULT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            next_due TIMESTAMP NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user (userId),
            INDEX idx_server (serverId)
        )
    `;

    const createBillingInvoicesTable = `
        CREATE TABLE IF NOT EXISTS billing_invoices (
            id INT AUTO_INCREMENT PRIMARY KEY,
            orderId INT,
            userId INT NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            tax_amount DECIMAL(10, 2) DEFAULT 0,
            total_amount DECIMAL(10, 2) NOT NULL,
            status ENUM('unpaid', 'paid', 'cancelled', 'overdue') DEFAULT 'unpaid',
            due_at TIMESTAMP NULL,
            paid_at TIMESTAMP NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const createDnsZonesTable = `
        CREATE TABLE IF NOT EXISTS dns_zones (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            domain VARCHAR(255) UNIQUE NOT NULL,
            cloudflare_zone_id VARCHAR(255),
            dnssec_enabled TINYINT DEFAULT 0,
            dnssec_ds_record TEXT,
            dnssec_dnskey TEXT,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user (userId)
        )
    `;

    const createDnsRecordsTable = `
        CREATE TABLE IF NOT EXISTS dns_records (
            id INT AUTO_INCREMENT PRIMARY KEY,
            zoneId INT NOT NULL,
            type VARCHAR(20) NOT NULL,
            name VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            priority INT DEFAULT 0,
            ttl INT DEFAULT 3600,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_zone (zoneId)
        )
    `;

    const createSftpConfigsTable = `
        CREATE TABLE IF NOT EXISTS sftp_configs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT UNIQUE NOT NULL,
            host VARCHAR(255),
            port INT DEFAULT 22,
            username VARCHAR(255),
            password TEXT,
            rootPath TEXT,
            privateKey TEXT,
            useSFTP TINYINT DEFAULT 0,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const createGitReposTable = `
        CREATE TABLE IF NOT EXISTS git_repos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            websiteId INT,
            name VARCHAR(255) NOT NULL,
            repoUrl VARCHAR(255) NOT NULL,
            branch VARCHAR(100) DEFAULT 'main',
            deployPath TEXT NOT NULL,
            status VARCHAR(50) DEFAULT 'active',
            webhookSecret VARCHAR(255),
            lastDeploy TIMESTAMP NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_user (userId),
            INDEX idx_website (websiteId)
        )
    `;

    const createGitDeployHistoryTable = `
        CREATE TABLE IF NOT EXISTS git_deploy_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            repoId INT NOT NULL,
            status VARCHAR(50) NOT NULL,
            log LONGTEXT,
            triggeredBy VARCHAR(100) DEFAULT 'manual',
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_repo (repoId)
        )
    `;

    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role ENUM('admin', 'user', 'reseller') DEFAULT 'user',
            parentId INT DEFAULT NULL,
            status ENUM('active', 'suspended') DEFAULT 'active',
            two_factor_enabled TINYINT DEFAULT 0,
            max_websites INT DEFAULT 5,
            max_databases INT DEFAULT 5,
            max_dns_zones INT DEFAULT 5,
            npwp VARCHAR(20),
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_parent (parentId)
        )
    `;

    const createUsageMetricsTable = `
        CREATE TABLE IF NOT EXISTS usage_metrics (
            id INT AUTO_INCREMENT PRIMARY KEY,
            serverId INT NOT NULL,
            cpu_load FLOAT,
            ram_used BIGINT,
            ram_total BIGINT,
            disk_used BIGINT,
            disk_total BIGINT,
            net_rx BIGINT,
            net_tx BIGINT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_server (serverId),
            INDEX idx_time (timestamp)
        )
    `;

    const createUsageRatesTable = `
        CREATE TABLE IF NOT EXISTS usage_rates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(50) UNIQUE NOT NULL,
            unit VARCHAR(20) NOT NULL,
            price_per_unit DECIMAL(10, 4) NOT NULL,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `;

    const createFraudTable = `
        CREATE TABLE IF NOT EXISTS fraud_check_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT,
            ipAddress VARCHAR(45),
            score INT DEFAULT 0,
            reason TEXT,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const createIpBlacklistTable = `
        CREATE TABLE IF NOT EXISTS ip_blacklist (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ipAddress VARCHAR(45) UNIQUE NOT NULL,
            reason TEXT,
            expiresAt TIMESTAMP NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    try {
        await pool.promise().query(createUsersTable);
        await pool.promise().query(createServersTable);
        await pool.promise().query(createUsageMetricsTable);
        await pool.promise().query(createUsageRatesTable);
        await pool.promise().query(createComplianceTable);
        await pool.promise().query(createPushTable);
        await pool.promise().query(createWebsitesTable);
        await pool.promise().query(createDatabasesTable);
        await pool.promise().query(createSslTable);
        await pool.promise().query(createBillingProductsTable);
        await pool.promise().query(createBillingOrdersTable);
        await pool.promise().query(createBillingInvoicesTable);
        await pool.promise().query(createSftpConfigsTable);
        await pool.promise().query(createDnsZonesTable);
        await pool.promise().query(createDnsRecordsTable);
        await pool.promise().query(createGitReposTable);
        await pool.promise().query(createGitDeployHistoryTable);
        await pool.promise().query(createFraudTable);
        await pool.promise().query(createIpBlacklistTable);

        const createPluginsTable = `
            CREATE TABLE IF NOT EXISTS plugins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                version VARCHAR(20),
                status ENUM('active', 'inactive') DEFAULT 'inactive',
                config JSON,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createPermissionsTable = `
            CREATE TABLE IF NOT EXISTS user_permissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                userId INT NOT NULL,
                permission VARCHAR(100) NOT NULL,
                UNIQUE KEY user_perm (userId, permission)
            )
        `;

        await pool.promise().query(createPluginsTable);
        await pool.promise().query(createPermissionsTable);

        console.log('[MIGRATION] Tables verified: users, servers, fraud, billing, dns, ssl, plugins, permissions');

        // Seed default rates
        const [rateRows] = await pool.promise().query('SELECT * FROM usage_rates');
        if (rateRows.length === 0) {
            await pool.promise().query(`
                INSERT INTO usage_rates (name, unit, price_per_unit) VALUES
                ('cpu', 'load_avg_hour', 0.0100),
                ('ram', 'gb_hour', 0.0050),
                ('disk', 'gb_hour', 0.0001),
                ('bandwidth', 'gb', 0.0500)
            `);
            console.log('[MIGRATION] Default usage rates seeded.');
        }

        // Insert Local Node
        const [rows] = await pool.promise().query('SELECT * FROM servers WHERE is_local = 1');
        if (rows.length === 0) {
            await pool.promise().query(`
                INSERT INTO servers (name, hostname, ip, is_local, status)
                VALUES ('Master Node', 'localhost', '127.0.0.1', 1, 'active')
            `);
            console.log('[MIGRATION] Local Master Node inserted.');
        }
    } catch (err) {
        console.error('[MIGRATION] Failed:', err);
    }
};

module.exports = initV3;
