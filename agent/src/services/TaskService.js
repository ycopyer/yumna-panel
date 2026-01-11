const crypto = require('crypto');

class TaskService {
    constructor() {
        this.tasks = new Map();
    }

    createTask(type, metadata = {}) {
        const id = crypto.randomBytes(8).toString('hex');
        const task = {
            id,
            type,
            status: 'running',
            logs: [],
            metadata,
            startTime: new Date(),
            endTime: null,
            progress: 0
        };
        this.tasks.set(id, task);
        return task;
    }

    addLog(id, message) {
        const task = this.tasks.get(id);
        if (task) {
            const timestamp = new Date().toISOString();
            task.logs.push(`[${timestamp}] ${message}`);
            // Keep logs manageable
            if (task.logs.length > 2000) task.logs.shift();
        }
    }

    updateStatus(id, status, error = null) {
        const task = this.tasks.get(id);
        if (task) {
            task.status = status;
            if (error) task.error = error;
            if (status === 'completed' || status === 'failed') {
                task.endTime = new Date();
                task.progress = 100;
            }
        }
    }

    updateProgress(id, progress) {
        const task = this.tasks.get(id);
        if (task) {
            task.progress = progress;
        }
    }

    getTask(id) {
        return this.tasks.get(id);
    }

    cleanupTasks() {
        // Cleanup tasks older than 1 hour
        const now = new Date();
        for (const [id, task] of this.tasks.entries()) {
            if (task.endTime && (now - task.endTime > 3600000)) {
                this.tasks.delete(id);
            }
        }
    }
}

// Singleton
module.exports = new TaskService();
