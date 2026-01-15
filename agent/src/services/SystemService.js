const { exec } = require('child_process');

class SystemService {
    async restartService(serviceName) {
        return new Promise((resolve, reject) => {
            const isWin = process.platform === 'win32';

            // Special handling for agent self-restart
            if (!serviceName || serviceName === 'agent' || serviceName === 'yumna-agent') {
                if (isWin) {
                    // On Windows, if not a service, we can't easily self-restart without a wrapper.
                    // But we can try exiting and let a monitor (like nodemon/pm2) handle it.
                    setTimeout(() => process.exit(0), 1000);
                    return resolve({ success: true, message: 'Agent exiting for restart (Windows)' });
                } else {
                    // Linux: Try PM2 first as it's our standard
                    const cmd = 'pm2 restart yumna-agent || pm2 restart all || systemctl restart yumna-agent';
                    // We execute this with a slight delay so we can return the response first
                    setTimeout(() => {
                        exec(cmd, (err) => {
                            if (err) {
                                // Fallback: last resort self-kill
                                process.exit(0);
                            }
                        });
                    }, 1000);
                    return resolve({ success: true, message: 'Restart command scheduled' });
                }
            }

            let cmd = isWin
                ? `net stop "${serviceName}" && net start "${serviceName}"`
                : `systemctl restart ${serviceName}`;

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
