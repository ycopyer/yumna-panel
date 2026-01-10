const mysql = require('mysql2/promise');
const dbConfig = require('../config/db');

class MailingListService {
    /**
     * Create a new mailing list
     */
    static async createList(userId, domainId, listName) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            const [domainRows] = await connection.query('SELECT domain FROM email_domains WHERE id = ?', [domainId]);
            if (domainRows.length === 0) throw new Error('Domain not found');
            const domain = domainRows[0].domain;
            const fullAddress = `${listName}@${domain}`;

            const [result] = await connection.query(
                'INSERT INTO email_mailing_lists (userId, domainId, name, address) VALUES (?, ?, ?, ?)',
                [userId, domainId, listName, fullAddress]
            );
            return { id: result.insertId, name: listName, address: fullAddress };
        } finally {
            await connection.end();
        }
    }

    /**
     * Get mailing lists for a user or domain
     */
    static async getLists(userId = null, domainId = null) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            let query = 'SELECT * FROM email_mailing_lists';
            let params = [];
            let conditions = [];

            if (userId) {
                conditions.push('userId = ?');
                params.push(userId);
            }
            if (domainId) {
                conditions.push('domainId = ?');
                params.push(domainId);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            const [rows] = await connection.query(query, params);

            // For each list, get subscriber count
            for (let list of rows) {
                const [countRes] = await connection.query(
                    'SELECT COUNT(*) as count FROM email_mailing_list_subscribers WHERE listId = ?',
                    [list.id]
                );
                list.subscribers = countRes[0].count;
            }

            return rows;
        } finally {
            await connection.end();
        }
    }

    /**
     * Add subscriber to a list
     */
    static async addSubscriber(listId, email) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            await connection.query(
                'INSERT IGNORE INTO email_mailing_list_subscribers (listId, email) VALUES (?, ?)',
                [listId, email]
            );
            return { success: true };
        } finally {
            await connection.end();
        }
    }

    /**
     * Get subscribers for a list
     */
    static async getSubscribers(listId) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            const [rows] = await connection.query(
                'SELECT * FROM email_mailing_list_subscribers WHERE listId = ?',
                [listId]
            );
            return rows;
        } finally {
            await connection.end();
        }
    }

    /**
     * Remove subscriber
     */
    static async removeSubscriber(listId, subscriberId) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            await connection.query(
                'DELETE FROM email_mailing_list_subscribers WHERE id = ? AND listId = ?',
                [subscriberId, listId]
            );
            return { success: true };
        } finally {
            await connection.end();
        }
    }

    /**
     * Delete mailing list
     */
    static async deleteList(listId) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            await connection.query('DELETE FROM email_mailing_lists WHERE id = ?', [listId]);
            return { success: true };
        } finally {
            await connection.end();
        }
    }
}

module.exports = MailingListService;
