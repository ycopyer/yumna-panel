const cron = require('node-cron');
const { exec } = require('child_process');
const mysql = require('mysql2/promise');

class CronScheduler {
    constructor(dbConfig) {
        this.dbConfig = dbConfig;
        this.jobs = []; // Array of { id, task }
    }

    async init() {
        console.log('[Cron] Initializing Scheduler...');
        await this.loadJobs();
    }

    async loadJobs() {
        // Clear existing
        this.jobs.forEach(j => j.task.stop());
        this.jobs = [];

        try {
            const connection = await mysql.createConnection(this.dbConfig);
            const [rows] = await connection.query('SELECT * FROM cron_jobs WHERE isActive = 1');
            await connection.end();

            console.log(`[Cron] Loaded ${rows.length} active jobs.`);

            for (const job of rows) {
                if (!cron.validate(job.schedule)) {
                    console.error(`[Cron] Invalid schedule for job ${job.id}: ${job.schedule}`);
                    continue;
                }

                const task = cron.schedule(job.schedule, () => {
                    this.executeJob(job);
                });

                this.jobs.push({ id: job.id, task });
            }
        } catch (e) {
            console.error('[Cron] Failed to load jobs:', e.message);
        }
    }

    async executeJob(job) {
        console.log(`[Cron] Running job ${job.id}: ${job.command}`);

        // Update DB Last Run (Optimistic)
        try {
            const connection = await mysql.createConnection(this.dbConfig);
            await connection.query('UPDATE cron_jobs SET lastRun = NOW() WHERE id = ?', [job.id]);
            await connection.end();
        } catch (e) {
            console.error('[Cron] DB Update Error:', e.message);
        }

        // Execute
        // Security Note: Executing via shell is risky. Ensure only trusted admins or sandboxed users can add jobs.
        exec(job.command, (error, stdout, stderr) => {
            if (error) {
                console.error(`[Cron] Job ${job.id} error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`[Cron] Job ${job.id} stderr: ${stderr}`);
            }
            // Optional: Log stdout to file or DB if needed
        });
    }

    reload() {
        console.log('[Cron] Reloading jobs...');
        this.loadJobs();
    }
}

module.exports = CronScheduler;
