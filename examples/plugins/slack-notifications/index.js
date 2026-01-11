const { YumnaPlugin } = require('@yumnapanel/sdk');
const axios = require('axios');

/**
 * Slack Notifications Plugin
 * Sends notifications to Slack for various events
 */
class SlackNotificationsPlugin extends YumnaPlugin {
    constructor() {
        super({
            id: 'slack-notifications',
            name: 'Slack Notifications',
            version: '1.0.0',
            author: 'Yumna Panel Team',
            description: 'Send notifications to Slack for user events, backups, and more',
            settings: {
                webhookUrl: '',
                channel: '#general',
                username: 'Yumna Panel',
                iconEmoji: ':robot_face:',
                notifyUserCreate: true,
                notifyWebsiteCreate: true,
                notifyBackup: true,
                notifyPayment: true
            }
        });
    }

    async initialize() {
        await super.initialize();

        // Validate webhook URL
        const webhookUrl = this.getSetting('webhookUrl');
        if (!webhookUrl) {
            this.log('warn', 'Slack webhook URL not configured. Plugin will not send notifications.');
            return true;
        }

        // Register hooks based on settings
        if (this.getSetting('notifyUserCreate')) {
            this.registerHook('user:afterCreate', this.onUserCreate.bind(this), 10);
        }

        if (this.getSetting('notifyWebsiteCreate')) {
            this.registerHook('website:afterCreate', this.onWebsiteCreate.bind(this), 10);
        }

        if (this.getSetting('notifyBackup')) {
            this.registerHook('system:afterBackup', this.onBackupComplete.bind(this), 10);
        }

        if (this.getSetting('notifyPayment')) {
            this.registerHook('payment:afterProcess', this.onPaymentProcessed.bind(this), 10);
        }

        // Register API routes
        this.registerRoute('POST', '/test', this.testNotification.bind(this), { admin: true });
        this.registerRoute('GET', '/status', this.getStatus.bind(this), { auth: true });

        this.log('info', 'Slack Notifications plugin initialized');
        return true;
    }

    /**
     * Send message to Slack
     */
    async sendSlackMessage(message, color = 'good') {
        const webhookUrl = this.getSetting('webhookUrl');

        if (!webhookUrl) {
            this.log('warn', 'Cannot send Slack message: webhook URL not configured');
            return false;
        }

        try {
            const payload = {
                channel: this.getSetting('channel'),
                username: this.getSetting('username'),
                icon_emoji: this.getSetting('iconEmoji'),
                attachments: [{
                    color: color,
                    text: message,
                    footer: 'Yumna Panel',
                    footer_icon: 'https://yumnapanel.com/icon.png',
                    ts: Math.floor(Date.now() / 1000)
                }]
            };

            await axios.post(webhookUrl, payload);
            this.log('info', 'Slack message sent successfully');
            return true;

        } catch (error) {
            this.log('error', 'Failed to send Slack message:', error.message);
            return false;
        }
    }

    /**
     * Handle user creation
     */
    async onUserCreate(userData) {
        const message = `🎉 *New User Created*\n` +
            `Username: ${userData.username}\n` +
            `Email: ${userData.email}\n` +
            `Role: ${userData.role || 'user'}`;

        await this.sendSlackMessage(message, 'good');

        return userData;
    }

    /**
     * Handle website creation
     */
    async onWebsiteCreate(websiteData) {
        const message = `🌐 *New Website Created*\n` +
            `Domain: ${websiteData.domain}\n` +
            `User: ${websiteData.username || 'N/A'}\n` +
            `PHP Version: ${websiteData.phpVersion || 'default'}`;

        await this.sendSlackMessage(message, 'good');

        return websiteData;
    }

    /**
     * Handle backup completion
     */
    async onBackupComplete(backupData) {
        const message = `💾 *Backup Completed*\n` +
            `Type: ${backupData.type || 'full'}\n` +
            `Size: ${this.formatBytes(backupData.size || 0)}\n` +
            `Duration: ${backupData.duration || 'N/A'}`;

        await this.sendSlackMessage(message, 'good');

        return backupData;
    }

    /**
     * Handle payment processing
     */
    async onPaymentProcessed(paymentData) {
        const success = paymentData.status === 'completed';
        const color = success ? 'good' : 'danger';

        const message = success
            ? `💰 *Payment Received*\n` +
            `Amount: $${paymentData.amount}\n` +
            `Gateway: ${paymentData.gateway}\n` +
            `Invoice: #${paymentData.invoiceId}`
            : `⚠️ *Payment Failed*\n` +
            `Amount: $${paymentData.amount}\n` +
            `Gateway: ${paymentData.gateway}\n` +
            `Reason: ${paymentData.error || 'Unknown'}`;

        await this.sendSlackMessage(message, color);

        return paymentData;
    }

    /**
     * Test notification endpoint
     */
    async testNotification(req, res) {
        try {
            const message = '🧪 *Test Notification*\n' +
                'This is a test message from Yumna Panel Slack Notifications plugin.';

            const sent = await this.sendSlackMessage(message, '#439FE0');

            res.json({
                success: sent,
                message: sent ? 'Test notification sent' : 'Failed to send notification'
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get plugin status
     */
    async getStatus(req, res) {
        const webhookUrl = this.getSetting('webhookUrl');

        res.json({
            success: true,
            status: {
                configured: !!webhookUrl,
                channel: this.getSetting('channel'),
                notifications: {
                    userCreate: this.getSetting('notifyUserCreate'),
                    websiteCreate: this.getSetting('notifyWebsiteCreate'),
                    backup: this.getSetting('notifyBackup'),
                    payment: this.getSetting('notifyPayment')
                }
            }
        });
    }

    /**
     * Format bytes to human-readable size
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    async cleanup() {
        this.log('info', 'Cleaning up Slack Notifications plugin');
        await super.cleanup();
        return true;
    }
}

module.exports = SlackNotificationsPlugin;
