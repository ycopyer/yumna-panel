const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const taskService = require('./TaskService');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const KEY_PATH = path.join(os.homedir(), '.ssh', 'id_rsa_yumna');

class GitService {
    async getPublicKey() {
        try {
            await fs.access(KEY_PATH + '.pub');
            return await fs.readFile(KEY_PATH + '.pub', 'utf8');
        } catch (e) {
            // Generate
            await fs.mkdir(path.dirname(KEY_PATH), { recursive: true });
            await execPromise(`ssh-keygen -t rsa -b 4096 -f "${KEY_PATH}" -N "" -C "yumna-agent"`);
            return await fs.readFile(KEY_PATH + '.pub', 'utf8');
        }
    }

    /**
     * Deploys a repository to a target path.
     * If the path doesn't exist or is not a git repo, it clones.
     * Otherwise, it pulls.
     */
    async deploy(repo, jobId) {
        const { repoUrl, branch, deployPath } = repo;

        try {
            await fs.access(deployPath);
            const isGit = await this.isGitRepo(deployPath);

            if (isGit) {
                return this.pull(repo, jobId);
            } else {
                return this.clone(repo, jobId);
            }
        } catch (error) {
            // Path doesn't exist, create and clone
            await fs.mkdir(deployPath, { recursive: true });
            return this.clone(repo, jobId);
        }
    }

    async isGitRepo(dir) {
        try {
            await fs.access(path.join(dir, '.git'));
            return true;
        } catch (e) {
            return false;
        }
    }

    async clone(repo, jobId) {
        const { repoUrl, branch, deployPath } = repo;
        taskService.addLog(jobId, `Starting clone: ${repoUrl} [${branch}] -> ${deployPath}`);

        const args = ['clone', '-b', branch, '--single-branch', repoUrl, '.'];
        // Note: cloning into existing non-empty dir is tricky if we just created it.
        // We assume deployPath is the intended root.

        return this.runGitCommand(args, deployPath, jobId);
    }

    async pull(repo, jobId) {
        const { branch, deployPath } = repo;
        taskService.addLog(jobId, `Starting pull on branch: ${branch}`);

        const args = ['pull', 'origin', branch];
        return this.runGitCommand(args, deployPath, jobId);
    }

    runGitCommand(args, cwd, jobId) {
        return new Promise((resolve, reject) => {
            taskService.addLog(jobId, `Running: git ${args.join(' ')}`);

            const sshCmd = `ssh -i "${KEY_PATH}" -o StrictHostKeyChecking=no`;
            const git = spawn('git', args, {
                cwd,
                env: {
                    ...process.env,
                    GIT_TERMINAL_PROMPT: '0',
                    GIT_SSH_COMMAND: sshCmd
                }
            });

            git.stdout.on('data', (data) => {
                taskService.addLog(jobId, data.toString().trim());
            });

            git.stderr.on('data', (data) => {
                // Git often uses stderr for progress logs (e.g. "Cloning into...")
                taskService.addLog(jobId, data.toString().trim());
            });

            git.on('close', (code) => {
                if (code === 0) {
                    taskService.addLog(jobId, "Git operation completed successfully.");
                    taskService.updateStatus(jobId, 'completed');
                    resolve({ success: true });
                } else {
                    taskService.addLog(jobId, `Git operation failed with code ${code}`);
                    taskService.updateStatus(jobId, 'failed', `Exit code ${code}`);
                    reject(new Error(`Git command failed with code ${code}`));
                }
            });

            git.on('error', (err) => {
                taskService.addLog(jobId, `System error: ${err.message}`);
                taskService.updateStatus(jobId, 'failed', err.message);
                reject(err);
            });
        });
    }
}

module.exports = new GitService();
