const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const https = require('https');
const crypto = require('crypto');
const AdmZip = require('adm-zip');
const taskService = require('./TaskService');

class AppInstallerService {

    static async installApp({ appType, rootPath, domain, dbConfig, phpVersion }) {
        if (!fs.existsSync(rootPath)) {
            await fsPromises.mkdir(rootPath, { recursive: true });
        }

        const task = taskService.createTask('AppInstallation', { appType, domain });

        // Run in background
        if (appType === 'WordPress') {
            this.installWordPress(rootPath, domain, dbConfig, task.id);
        } else if (appType === 'Laravel') {
            this.installLaravel(rootPath, domain, dbConfig, phpVersion, task.id);
        } else {
            taskService.updateStatus(task.id, 'failed', `Unsupported app type: ${appType}`);
        }

        return { jobId: task.id };
    }

    static async installWordPress(rootPath, domain, dbConfig, taskId) {
        try {
            taskService.addLog(taskId, `Starting WordPress installation for ${domain}...`);
            const downloadUrl = 'https://wordpress.org/latest.zip';
            const zipPath = path.join(rootPath, 'wp_temp.zip');

            taskService.addLog(taskId, 'Downloading WordPress core...');
            await this.downloadFile(downloadUrl, zipPath);
            taskService.updateProgress(taskId, 30);

            taskService.addLog(taskId, 'Extracting archive...');
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(rootPath, true);
            taskService.updateProgress(taskId, 60);

            taskService.addLog(taskId, 'Configuring directory structure...');
            const wpDir = path.join(rootPath, 'wordpress');
            if (fs.existsSync(wpDir)) {
                const files = await fsPromises.readdir(wpDir);
                for (const file of files) {
                    await fsPromises.rename(path.join(wpDir, file), path.join(rootPath, file));
                }
                await fsPromises.rmdir(wpDir);
            }
            await fsPromises.unlink(zipPath);

            taskService.addLog(taskId, 'Generating wp-config.php...');
            const keys = Array(8).fill(0).map(() => crypto.randomBytes(64).toString('base64'));
            const wpConfig = `<?php
define( 'DB_NAME',     '${dbConfig.name}' );
define( 'DB_USER',     '${dbConfig.user}' );
define( 'DB_PASSWORD', '${dbConfig.password}' );
define( 'DB_HOST',     '${dbConfig.host || 'localhost'}' );
define( 'DB_CHARSET',  'utf8mb4' );
define( 'DB_COLLATE',  '' );

define('AUTH_KEY',         '${keys[0]}');
define('SECURE_AUTH_KEY',  '${keys[1]}');
define('LOGGED_IN_KEY',    '${keys[2]}');
define('NONCE_KEY',        '${keys[3]}');
define('AUTH_SALT',        '${keys[4]}');
define('SECURE_AUTH_SALT', '${keys[5]}');
define('LOGGED_IN_SALT',   '${keys[6]}');
define('NONCE_SALT',       '${keys[7]}');

$table_prefix = 'wp_';
define( 'WP_DEBUG', false );
if ( ! defined( 'ABSPATH' ) ) define( 'ABSPATH', __DIR__ . '/' );
require_once ABSPATH . 'wp-settings.php';
`;
            await fsPromises.writeFile(path.join(rootPath, 'wp-config.php'), wpConfig);
            taskService.addLog(taskId, 'WordPress installation completed successfully.');
            taskService.updateStatus(taskId, 'completed');
        } catch (e) {
            taskService.addLog(taskId, `ERROR: ${e.message}`);
            taskService.updateStatus(taskId, 'failed', e.message);
        }
    }

    static async installLaravel(rootPath, domain, dbConfig, phpVersion, taskId) {
        try {
            taskService.addLog(taskId, `Starting Laravel installation for ${domain}...`);

            // Cleanup dir
            taskService.addLog(taskId, 'Cleaning root directory...');
            const files = await fsPromises.readdir(rootPath);
            for (const file of files) {
                const fullPath = path.join(rootPath, file);
                await fsPromises.rm(fullPath, { recursive: true, force: true });
            }

            const isWin = process.platform === 'win32';
            const composerCmd = isWin ? 'C:\\YumnaPanel\\bin\\php\\composer.bat' : 'composer';

            taskService.addLog(taskId, 'Running composer create-project (this may take several minutes)...');

            const child = spawn(isWin ? 'cmd.exe' : 'bash', [
                isWin ? '/c' : '-c',
                `${composerCmd} create-project laravel/laravel . --prefer-dist --no-interaction`
            ], { cwd: rootPath });

            child.stdout.on('data', (data) => {
                const msg = data.toString().trim();
                if (msg) taskService.addLog(taskId, msg);
            });

            child.stderr.on('data', (data) => {
                const msg = data.toString().trim();
                if (msg) taskService.addLog(taskId, `[DEBUG] ${msg}`);
            });

            child.on('close', async (code) => {
                if (code !== 0) {
                    taskService.addLog(taskId, `Composer failed with code ${code}`);
                    taskService.updateStatus(taskId, 'failed', `Composer failed with code ${code}`);
                    return;
                }

                taskService.addLog(taskId, 'Composer project created. Configuring .env...');
                const envPath = path.join(rootPath, '.env');
                if (fs.existsSync(envPath)) {
                    try {
                        let env = await fsPromises.readFile(envPath, 'utf8');
                        env = env.replace(/DB_DATABASE=laravel/, `DB_DATABASE=${dbConfig.name}`);
                        env = env.replace(/DB_USERNAME=root/, `DB_USERNAME=${dbConfig.user}`);
                        env = env.replace(/DB_PASSWORD=/, `DB_PASSWORD=${dbConfig.password}`);
                        env = env.replace(/APP_URL=http:\/\/localhost/, `APP_URL=http://${domain}`);
                        await fsPromises.writeFile(envPath, env);
                        taskService.addLog(taskId, '.env configured.');
                    } catch (err) {
                        taskService.addLog(taskId, `Warning: Failed to update .env: ${err.message}`);
                    }
                }

                taskService.addLog(taskId, 'Laravel installation completed successfully.');
                taskService.updateStatus(taskId, 'completed');
            });

        } catch (e) {
            taskService.addLog(taskId, `ERROR: ${e.message}`);
            taskService.updateStatus(taskId, 'failed', e.message);
        }
    }

    static downloadFile(url, dest) {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(dest);
            https.get(url, (response) => {
                response.pipe(file);
                file.on('finish', () => {
                    file.close(resolve);
                });
            }).on('error', (err) => {
                fs.unlink(dest);
                reject(err);
            });
        });
    }
}

module.exports = AppInstallerService;

