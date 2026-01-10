const crypto = require('crypto');
const pool = require('../config/db');

class EmailConfigService {
    /**
     * Generate RSA Key Pair for DKIM
     */
    static generateDKIMKeys() {
        return new Promise((resolve, reject) => {
            crypto.generateKeyPair('rsa', {
                modulusLength: 2048,
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem'
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem'
                }
            }, (err, publicKey, privateKey) => {
                if (err) reject(err);
                else {
                    // Extract the base64 part for DKIM public tag
                    const publicKeyBase64 = publicKey
                        .replace('-----BEGIN PUBLIC KEY-----', '')
                        .replace('-----END PUBLIC KEY-----', '')
                        .replace(/\s/g, '');
                    resolve({ publicKey: publicKeyBase64, privateKey });
                }
            });
        });
    }

    /**
     * Setup DKIM for a domain
     */
    static async setupDKIM(domainId) {
        const { publicKey, privateKey } = await this.generateDKIMKeys();

        await pool.promise().query(
            'UPDATE email_domains SET dkim_private = ?, dkim_public = ? WHERE id = ?',
            [privateKey, publicKey, domainId]
        );

        return { publicKey };
    }

    /**
     * Get or Generate SPF record for a domain
     */
    static async getSPFRecord(domain) {
        // Standard SPF: allow current server IPs
        const spf = `v=spf1 a mx ip4:${process.env.SERVER_IP || '127.0.0.1'} ~all`;
        return spf;
    }

    /**
     * Get or Generate DMARC record
     */
    static async getDMARCRecord(domain) {
        return `v=DMARC1; p=none; rua=mailto:admin@${domain}`;
    }

    /**
     * Get all DNS records needed for email for a domain
     */
    static async getEmailDNSConfigs(domainId) {
        const [rows] = await pool.promise().query('SELECT * FROM email_domains WHERE id = ?', [domainId]);
        if (rows.length === 0) throw new Error('Domain not found');

        const domain = rows[0].domain;
        let dkimPublic = rows[0].dkim_public;

        if (!dkimPublic) {
            const keys = await this.setupDKIM(domainId);
            dkimPublic = keys.publicKey;
        }

        const spf = await this.getSPFRecord(domain);
        const dmarc = await this.getDMARCRecord(domain);

        return {
            domain,
            dkim: {
                selector: 'default',
                record: `v=DKIM1; k=rsa; p=${dkimPublic}`
            },
            spf: {
                record: spf
            },
            dmarc: {
                record: dmarc
            }
        };
    }
}

module.exports = EmailConfigService;
