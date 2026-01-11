const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class SSLService {
    static async issueLetsEncrypt(domain, rootPath, wildcard = false) {
        const isWin = os.platform() === 'win32';
        console.log(`[AGENT] Issuing Let's Encrypt for ${domain} (Wildcard: ${wildcard})`);

        if (isWin) {
            const wacsPath = 'C:\\YumnaPanel\\bin\\security\\acme\\wacs.exe';
            const certPath = 'C:\\YumnaPanel\\etc\\ssl';

            // Ensure cert path exists
            await fs.mkdir(certPath, { recursive: true });

            let hosts = `${domain},www.${domain}`;
            let validation = `--validation filesystem --webroot "${rootPath}"`;

            if (wildcard) {
                hosts = `*.${domain},${domain}`;
                validation = `--validation dns-01 --dnsscript "C:\\YumnaPanel\\bin\\dns\\dns-hook.bat"`;
            }

            const cmd = `"${wacsPath}" --source manual --host ${hosts} ${validation} --store pemfiles --pemfilespath "${certPath}" --accepttos --emailadminonexpiry --verbose`;

            return new Promise((resolve, reject) => {
                exec(cmd, { maxBuffer: 1024 * 1024 * 5 }, (err, stdout, stderr) => {
                    if (err) {
                        console.error('[AGENT] SSL WACS Error:', stdout);
                        return reject(new Error(`WACS Error: ${stdout || stderr}`));
                    }
                    resolve({ success: true, details: stdout });
                });
            });
        } else {
            // Linux Certbot
            let certbotCmd = `sudo certbot certonly --nginx -d ${domain} -d www.${domain} --non-interactive --agree-tos --register-unsafely-without-email`;
            if (wildcard) {
                certbotCmd = `sudo certbot certonly --manual -d *.${domain} -d ${domain} --preferred-challenges dns --manual-auth-hook "/usr/local/bin/yumna-dns-hook" --manual-cleanup-hook "/usr/local/bin/yumna-dns-hook" --non-interactive --agree-tos`;
            }

            return new Promise((resolve, reject) => {
                exec(certbotCmd, (err, stdout, stderr) => {
                    if (err) return reject(new Error(`Certbot Error: ${stderr}`));
                    resolve({ success: true, details: stdout });
                });
            });
        }
    }

    static async saveCustomSSL(domain, cert, key, chain) {
        const certDir = os.platform() === 'win32' ? 'C:/YumnaPanel/etc/ssl' : '/etc/ssl/yumnapanel';
        await fs.mkdir(certDir, { recursive: true });

        const certPath = path.join(certDir, `${domain}-custom.pem`);
        const keyPath = path.join(certDir, `${domain}-custom.key`);
        const chainPath = chain ? path.join(certDir, `${domain}-custom-chain.pem`) : certPath;

        await fs.writeFile(certPath, cert);
        await fs.writeFile(keyPath, key);
        if (chain) await fs.writeFile(chainPath, chain);

        return { certPath, keyPath, chainPath };
    }
}

module.exports = SSLService;
