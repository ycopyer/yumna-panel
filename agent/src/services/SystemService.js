const { exec } = require('child_process');

class SystemService {
    async restartService(serviceName) {
        return new Promise((resolve, reject) => {
            const isWin = process.platform === 'win32';
            let cmd = '';

            if (isWin) {
                // Windows services (e.g., 'nginx', 'mysql', 'php-fpm')
                // Note: php-fpm on windows is usually run via CLI, but let's assume it's a service
                cmd = `net stop "${serviceName}" && net start "${serviceName}"`;
            } else {
                cmd = `systemctl restart ${serviceName}`;
            }

            exec(cmd, (err, stdout, stderr) => {
                if (err) return reject(new Error(stderr || stdout));
                resolve({ success: true, output: stdout });
            });
        });
    }

    async getSystemLogs(lines = 100) {
        return new Promise((resolve, reject) => {
            const isWin = process.platform === 'win32';
            let cmd = isWin ? `powershell Get-EventLog -LogName System -Newest ${lines}` : `journalctl -n ${lines}`;

            exec(cmd, (err, stdout, stderr) => {
                if (err) return reject(new Error(stderr || stdout));
                resolve({ success: true, logs: stdout });
            });
        });
    }
}

module.exports = new SystemService();
