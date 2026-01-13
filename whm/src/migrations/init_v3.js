const pool = require('../config/db');
const argon2 = require('argon2');

/**
 * Migration: Init V3 + Multi-Server Support + Security Tables
 */
const initV3 = async () => {
    console.log('[MIGRATION] Starting Init V3 (Unified Schema)...');

    // --- 1. CORE SYSTEM TABLES ---

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
            capabilities JSON,
            agentSecret VARCHAR(255),
            isPrimary TINYINT DEFAULT 0,
            cpu_usage FLOAT DEFAULT 0,
            ram_usage FLOAT DEFAULT 0,
            disk_usage FLOAT DEFAULT 0,
            uptime FLOAT DEFAULT 0,
            last_seen TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const createSettingsTable = `
        CREATE TABLE IF NOT EXISTS settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            key_name VARCHAR(100) UNIQUE NOT NULL,
            value_text TEXT,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `;

    // --- 2. HOSTING FEATURES TABLES ---

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
            INDEX idx_status (status),
            INDEX idx_server (serverId)
        )
    `;

    const createDatabasesTable = `
        CREATE TABLE IF NOT EXISTS \`databases\` (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            serverId INT DEFAULT 1,
            name VARCHAR(255) UNIQUE NOT NULL,
            user VARCHAR(255) NOT NULL,
            password TEXT NOT NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_server (serverId)
        )
    `;

    const createSslTable = `
        CREATE TABLE IF NOT EXISTS ssl_certificates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT,
            serverId INT DEFAULT 1,
            domain VARCHAR(255) NOT NULL,
            is_auto TINYINT DEFAULT 1,
            cert_path TEXT,
            key_path TEXT,
            fullchain_path TEXT,
            expiry_date TIMESTAMP NULL,
            provider VARCHAR(50) DEFAULT 'letsencrypt',
            status VARCHAR(20) DEFAULT 'active',
            wildcard TINYINT DEFAULT 0,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_server (serverId)
        )
    `;

    const createEmailTable = `
        CREATE TABLE IF NOT EXISTS email_accounts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            serverId INT DEFAULT 1,
            email VARCHAR(255) NOT NULL,
            password VARCHAR(255) NOT NULL,
            quota INT DEFAULT 1024,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user (userId),
            INDEX idx_server (serverId)
        )
    `;

    const createFtpTable = `
        CREATE TABLE IF NOT EXISTS ftp_accounts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            serverId INT DEFAULT 1,
            username VARCHAR(255) NOT NULL,
            password VARCHAR(255) NOT NULL,
            homedir VARCHAR(255) NOT NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user (userId),
            INDEX idx_server (serverId)
        )
    `;

    const createCronTable = `
        CREATE TABLE IF NOT EXISTS cron_jobs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            serverId INT DEFAULT 1,
            name VARCHAR(255) NOT NULL,
            schedule VARCHAR(255) NOT NULL,
            command TEXT NOT NULL,
            status VARCHAR(50) DEFAULT 'active',
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user (userId),
            INDEX idx_server (serverId)
        )
    `;

    const createDockerTable = `
        CREATE TABLE IF NOT EXISTS docker_containers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            serverId INT DEFAULT 1,
            name VARCHAR(255) NOT NULL,
            image VARCHAR(255) NOT NULL,
            status VARCHAR(50) DEFAULT 'created',
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user (userId),
            INDEX idx_server (serverId)
        )
    `;

    const createBackupsTable = `
        CREATE TABLE IF NOT EXISTS backups (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            serverId INT DEFAULT 1,
            type VARCHAR(50) NOT NULL,
            resourceId INT NOT NULL,
            filename VARCHAR(255) NOT NULL,
            size BIGINT DEFAULT 0,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user (userId),
            INDEX idx_server (serverId)
        )
    `;

    const createDnsZonesTable = `
        CREATE TABLE IF NOT EXISTS dns_zones (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            domain VARCHAR(255) UNIQUE NOT NULL,
            serverId INT DEFAULT 1,
            cloudflare_zone_id VARCHAR(255),
            dnssec_enabled TINYINT DEFAULT 0,
            dnssec_ds_record TEXT,
            dnssec_dnskey TEXT,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user (userId),
            INDEX idx_server (serverId)
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

    // --- 3. SECURITY & MONITORING TABLES ---

    const createFirewallTable = `
        CREATE TABLE IF NOT EXISTS firewall (
            id INT AUTO_INCREMENT PRIMARY KEY,
            type VARCHAR(50) NOT NULL,
            target VARCHAR(255) NOT NULL,
            reason TEXT,
            country VARCHAR(10),
            lat FLOAT,
            lon FLOAT,
            expiresAt DATETIME,
            serverId INT DEFAULT NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_server (serverId),
            INDEX idx_type (type)
        )
    `;

    const createPatternsTable = `
        CREATE TABLE IF NOT EXISTS security_patterns (
            id INT AUTO_INCREMENT PRIMARY KEY,
            type VARCHAR(50) NOT NULL,
            pattern TEXT NOT NULL,
            description TEXT,
            isActive BOOLEAN DEFAULT TRUE,
            serverId INT DEFAULT NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_server (serverId)
        )
    `;

    const createSessionsTable = `
        CREATE TABLE IF NOT EXISTS user_sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sessionId VARCHAR(255) UNIQUE NOT NULL,
            userId INT NOT NULL,
            deviceInfo TEXT,
            ipAddress VARCHAR(45),
            lastActive TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user (userId)
        )
    `;

    const createActiveSessionsTable = `
        CREATE TABLE IF NOT EXISTS active_sessions (
            id INT NOT NULL AUTO_INCREMENT,
            session_id VARCHAR(255) NOT NULL,
            user_id INT NOT NULL,
            ip VARCHAR(45) NULL,
            country VARCHAR(100) NULL,
            user_agent TEXT NULL,
            last_activity TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE INDEX idx_session_id_unique (session_id),
            INDEX idx_user (user_id)
        )
    `;

    const createLoginAttemptsTable = `
        CREATE TABLE IF NOT EXISTS login_attempts (
            id INT NOT NULL AUTO_INCREMENT,
            username VARCHAR(100) NULL,
            ip VARCHAR(45) NULL,
            country VARCHAR(100) NULL,
            lat FLOAT NULL,
            lon FLOAT NULL,
            user_agent TEXT NULL,
            success TINYINT(1) DEFAULT 0,
            failure_reason VARCHAR(255) NULL,
            attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            INDEX idx_ip (ip),
            INDEX idx_username (username),
            INDEX idx_attempted (attempted_at)
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

    // --- 4. BILLING TABLES ---

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

    // --- 5. COMPLIANCE & EXTRAS ---

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

    const create2faTable = `
        CREATE TABLE IF NOT EXISTS pending_2fa (
            id VARCHAR(50) PRIMARY KEY,
            user_id INT NOT NULL,
            code VARCHAR(10) NOT NULL,
            expires_at BIGINT NOT NULL,
            INDEX idx_user (user_id)
        )
    `;

    const createClusterNodesTable = `
        CREATE TABLE IF NOT EXISTS whm_cluster_nodes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            hostname VARCHAR(255) NOT NULL,
            ip VARCHAR(45) NOT NULL,
            port INT DEFAULT 4000,
            role ENUM('master', 'slave', 'lb') DEFAULT 'slave',
            status ENUM('healthy', 'unhealthy', 'unknown') DEFAULT 'unknown',
            is_enabled TINYINT DEFAULT 1,
            priority INT DEFAULT 10,
            last_checked TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

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

    try {
        // Execute Core Creation
        await pool.promise().query(createUsersTable);
        await pool.promise().query(createServersTable);
        await pool.promise().query(createSettingsTable);

        // Execute Hosting Features
        await pool.promise().query(createWebsitesTable);
        await pool.promise().query(createDatabasesTable);
        await pool.promise().query(createSslTable);
        await pool.promise().query(createEmailTable);
        await pool.promise().query(createFtpTable);
        await pool.promise().query(createCronTable);
        await pool.promise().query(createDockerTable);
        await pool.promise().query(createBackupsTable);
        await pool.promise().query(createDnsZonesTable);
        await pool.promise().query(createDnsRecordsTable);
        await pool.promise().query(createSftpConfigsTable);

        // Execute Security
        await pool.promise().query(createFirewallTable);
        await pool.promise().query(createPatternsTable);
        await pool.promise().query(createSessionsTable);
        await pool.promise().query(createActiveSessionsTable);
        await pool.promise().query(createLoginAttemptsTable);
        await pool.promise().query(createIpBlacklistTable);
        await pool.promise().query(createFraudTable);
        await pool.promise().query(createComplianceTable);
        await pool.promise().query(create2faTable);

        // Execute Billing & Others
        await pool.promise().query(createBillingProductsTable);
        await pool.promise().query(createBillingOrdersTable);
        await pool.promise().query(createBillingInvoicesTable);
        await pool.promise().query(createUsageMetricsTable);
        await pool.promise().query(createUsageRatesTable);
        await pool.promise().query(createClusterNodesTable);
        await pool.promise().query(createGitReposTable);
        await pool.promise().query(createGitDeployHistoryTable);
        await pool.promise().query(createPluginsTable);
        await pool.promise().query(createPermissionsTable);
        await pool.promise().query(createPushTable);

        console.log('[MIGRATION] Core Tables verified.');

        // --- MIGRATION SAFEGUARDS (For existing databases) ---
        // Ensure serverId columns exist in tables that might have been created before V3
        const ensureColumn = async (tableName, tableDef) => {
            try {
                // We rely on the fact that if table exists without column, we need to ALTER
                // But CREATE TABLE IF NOT EXISTS won't update schema.
                // So we assume standard tables needing serverId are:
                // websites, databases, ssl_certificates, email_accounts, ftp_accounts, cron_jobs, docker_containers, backups, firewall, security_patterns, billing_orders

                // Simple ADD COLUMN IF NOT EXISTS check
                await pool.promise().query(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS serverId INT DEFAULT 1`);
                await pool.promise().query(`ALTER TABLE ${tableName} ADD INDEX IF NOT EXISTS idx_server (serverId)`);
            } catch (e) {
                // Ignore errors
            }
        };

        // Run updates for legacy tables
        await ensureColumn('websites');
        await ensureColumn('databases');
        await ensureColumn('ssl_certificates');
        await ensureColumn('email_accounts');
        await ensureColumn('ftp_accounts');
        await ensureColumn('cron_jobs');
        await ensureColumn('docker_containers');
        await ensureColumn('backups');

        // Firewall has slightly different default (NULL or 1?) In schema above: DEFAULT NULL.
        // So we should handle firewall separately or let it be 1 (global?)
        // Schema says DEFAULT NULL. ensureColumn uses DEFAULT 1.
        // Let's manually fix firewall
        try {
            await pool.promise().query('ALTER TABLE firewall ADD COLUMN IF NOT EXISTS serverId INT DEFAULT NULL');
            await pool.promise().query('ALTER TABLE firewall ADD INDEX IF NOT EXISTS idx_server (serverId)');
        } catch (e) { }

        try {
            await pool.promise().query('ALTER TABLE security_patterns ADD COLUMN IF NOT EXISTS serverId INT DEFAULT NULL');
            await pool.promise().query('ALTER TABLE security_patterns ADD INDEX IF NOT EXISTS idx_server (serverId)');
        } catch (e) { }


        // --- 4. SCHEMA UPDATES (Post-Create) ---
        try {
            await pool.promise().query("ALTER TABLE servers ADD COLUMN connection_type ENUM('direct', 'tunnel') DEFAULT 'direct'");
            console.log('[MIGRATION] Added connection_type to servers.');
        } catch (e) {
            // Ignore if column exists
        }

        try {
            await pool.promise().query("ALTER TABLE servers ADD COLUMN agent_id VARCHAR(255) AFTER id");
            await pool.promise().query("ALTER TABLE servers ADD INDEX idx_agent_id (agent_id)");
            console.log('[MIGRATION] Added agent_id to servers.');
        } catch (e) {
            // Ignore if column exists
        }

        // --- SEEDING ---

        // Seed Usage Rates
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

        // Insert Local Master Node
        const [rows] = await pool.promise().query('SELECT * FROM servers WHERE is_local = 1');
        if (rows.length === 0) {
            await pool.promise().query(`
                INSERT INTO servers (name, hostname, ip, is_local, status)
                VALUES ('Master Node', 'localhost', '127.0.0.1', 1, 'active')
            `);
            console.log('[MIGRATION] Local Master Node inserted.');
        }

        // Seed default settings
        const [settingsRows] = await pool.promise().query('SELECT * FROM settings WHERE key_name = "site_title"');
        if (settingsRows.length === 0) {
            await pool.promise().query(`
                INSERT INTO settings (key_name, value_text) VALUES
                ('site_title', 'Yumna Panel'),
                ('footer_text', '© 2026 Yumna Panel Projects'),
                ('logo_url', '/vite.svg'),
                ('primary_color', '#10b981')
            `);
            console.log('[MIGRATION] Default settings seeded.');
        }

        // Seed default admin user
        const [userRows] = await pool.promise().query('SELECT * FROM users WHERE username = "admin"');
        if (userRows.length === 0) {
            const adminPass = await argon2.hash('admin123', { type: argon2.argon2id });
            await pool.promise().query(`
                INSERT INTO users (username, email, password, role, status)
                VALUES ('admin', 'admin@yumnapanel.local', ?, 'admin', 'active')
            `, [adminPass]);
            console.log('[MIGRATION] Default admin user seeded (admin / admin123).');
        }

        console.log('[MIGRATION] ✅ Init V3 Complete. System Ready.');
    } catch (err) {
        console.error('[MIGRATION] Failed:', err.message);
    }
};

module.exports = initV3;
