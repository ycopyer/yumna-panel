const fs = require('fs').promises;
const path = require('path');
const pool = require('../config/db');

class DatabaseMonitorService {
    static async getSlowQueries(limit = 50) {
        const logPath = 'C:\\YumnaPanel\\logs\\mysql\\slow.log';

        try {
            const content = await fs.readFile(logPath, 'utf8');
            const entries = this.parseSlowLog(content);
            return entries.slice(-limit).reverse();
        } catch (error) {
            console.error('[DB-MONITOR] Failed to read slow log:', error.message);
            return [];
        }
    }

    static parseSlowLog(content) {
        // Simple parser for MySQL slow query log format
        const entries = [];
        const lines = content.split('\n');
        let currentEntry = null;

        for (const line of lines) {
            if (line.startsWith('# Time:')) {
                if (currentEntry) entries.push(currentEntry);
                currentEntry = { time: line.substring(8).trim(), query: '' };
            } else if (line.startsWith('# User@Host:')) {
                if (currentEntry) currentEntry.userHost = line.substring(12).trim();
            } else if (line.startsWith('# Query_time:')) {
                const match = line.match(/Query_time:\s+([0-9.]+)\s+Lock_time:\s+([0-9.]+)\s+Rows_sent:\s+(\d+)\s+Rows_examined:\s+(\d+)/);
                if (currentEntry && match) {
                    currentEntry.queryTime = match[1];
                    currentEntry.lockTime = match[2];
                    currentEntry.rowsSent = match[3];
                    currentEntry.rowsExamined = match[4];
                }
            } else if (!line.startsWith('#') && line.trim()) {
                if (currentEntry) {
                    currentEntry.query += line.trim() + ' ';
                }
            }
        }
        if (currentEntry) entries.push(currentEntry);
        return entries;
    }

    static async getTableStats() {
        try {
            const [rows] = await pool.promise().query(`
                SELECT 
                    table_name AS "table",
                    table_rows AS "rows",
                    data_length + index_length AS "size",
                    engine
                FROM information_schema.tables
                WHERE table_schema = (SELECT DATABASE())
                ORDER BY (data_length + index_length) DESC
                LIMIT 10
            `);
            return rows;
        } catch (error) {
            return [];
        }
    }
}

module.exports = DatabaseMonitorService;
