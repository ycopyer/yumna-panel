const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { requireAuth } = require('../../middleware/auth');

// Get team members for a website
router.get('/websites/:websiteId/members', requireAuth, async (req, res) => {
    try {
        const { websiteId } = req.params;

        // Verify user has access to this website
        const [website] = await db.promise().query(
            `SELECT w.* FROM websites w
       LEFT JOIN website_team_members wtm ON w.id = wtm.website_id
       WHERE w.id = ? AND (w.userId = ? OR wtm.user_id = ?)`,
            [websiteId, req.user.id, req.user.id]
        );

        if (website.length === 0) {
            return res.status(404).json({ error: 'Website not found or access denied' });
        }

        const [members] = await db.promise().query(
            `SELECT wtm.*, u.username, u.email, u.role as user_role
       FROM website_team_members wtm
       INNER JOIN users u ON wtm.user_id = u.id
       WHERE wtm.website_id = ?
       ORDER BY wtm.created_at DESC`,
            [websiteId]
        );

        res.json({ members });
    } catch (error) {
        console.error('Error fetching team members:', error);
        res.status(500).json({ error: 'Failed to fetch team members' });
    }
});

// Add team member to website
router.post('/websites/:websiteId/members', requireAuth, async (req, res) => {
    try {
        const { websiteId } = req.params;
        const { user_id, email, permissions } = req.body;

        // Verify ownership
        const [website] = await db.promise().query(
            'SELECT * FROM websites WHERE id = ? AND userId = ?',
            [websiteId, req.user.id]
        );

        if (website.length === 0) {
            return res.status(404).json({ error: 'Website not found or you are not the owner' });
        }

        let targetUserId = user_id;

        // If email provided, find user by email
        if (!targetUserId && email) {
            const [user] = await db.promise().query(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );

            if (user.length === 0) {
                return res.status(404).json({ error: 'User not found with this email' });
            }

            targetUserId = user[0].id;
        }

        if (!targetUserId) {
            return res.status(400).json({ error: 'User ID or email is required' });
        }

        // Check if already a member
        const [existing] = await db.promise().query(
            'SELECT id FROM website_team_members WHERE website_id = ? AND user_id = ?',
            [websiteId, targetUserId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'User is already a team member' });
        }

        const [result] = await db.promise().query(
            `INSERT INTO website_team_members (website_id, user_id, permissions)
       VALUES (?, ?, ?)`,
            [websiteId, targetUserId, JSON.stringify(permissions || {})]
        );

        const [newMember] = await db.promise().query(
            `SELECT wtm.*, u.username, u.email, u.role as user_role
       FROM website_team_members wtm
       INNER JOIN users u ON wtm.user_id = u.id
       WHERE wtm.id = ?`,
            [result.insertId]
        );

        res.status(201).json({
            message: 'Team member added successfully',
            member: newMember[0]
        });
    } catch (error) {
        console.error('Error adding team member:', error);
        res.status(500).json({ error: 'Failed to add team member' });
    }
});

// Update team member permissions
router.put('/websites/:websiteId/members/:memberId', requireAuth, async (req, res) => {
    try {
        const { websiteId, memberId } = req.params;
        const { permissions } = req.body;

        // Verify ownership
        const [website] = await db.promise().query(
            'SELECT * FROM websites WHERE id = ? AND userId = ?',
            [websiteId, req.user.id]
        );

        if (website.length === 0) {
            return res.status(404).json({ error: 'Website not found or you are not the owner' });
        }

        await db.promise().query(
            `UPDATE website_team_members 
       SET permissions = ?, updated_at = NOW()
       WHERE id = ? AND website_id = ?`,
            [JSON.stringify(permissions), memberId, websiteId]
        );

        const [updated] = await db.promise().query(
            `SELECT wtm.*, u.username, u.email, u.role as user_role
       FROM website_team_members wtm
       INNER JOIN users u ON wtm.user_id = u.id
       WHERE wtm.id = ?`,
            [memberId]
        );

        res.json({
            message: 'Permissions updated successfully',
            member: updated[0]
        });
    } catch (error) {
        console.error('Error updating permissions:', error);
        res.status(500).json({ error: 'Failed to update permissions' });
    }
});

// Remove team member
router.delete('/websites/:websiteId/members/:memberId', requireAuth, async (req, res) => {
    try {
        const { websiteId, memberId } = req.params;

        // Verify ownership
        const [website] = await db.promise().query(
            'SELECT * FROM websites WHERE id = ? AND userId = ?',
            [websiteId, req.user.id]
        );

        if (website.length === 0) {
            return res.status(404).json({ error: 'Website not found or you are not the owner' });
        }

        await db.promise().query(
            'DELETE FROM website_team_members WHERE id = ? AND website_id = ?',
            [memberId, websiteId]
        );

        res.json({ message: 'Team member removed successfully' });
    } catch (error) {
        console.error('Error removing team member:', error);
        res.status(500).json({ error: 'Failed to remove team member' });
    }
});

// Get activity feed for a website
router.get('/websites/:websiteId/activity', requireAuth, async (req, res) => {
    try {
        const { websiteId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        // Verify access
        const [website] = await db.promise().query(
            `SELECT w.* FROM websites w
       LEFT JOIN website_team_members wtm ON w.id = wtm.website_id
       WHERE w.id = ? AND (w.userId = ? OR wtm.user_id = ?)`,
            [websiteId, req.user.id, req.user.id]
        );

        if (website.length === 0) {
            return res.status(404).json({ error: 'Website not found or access denied' });
        }

        const [activities] = await db.promise().query(
            `SELECT wa.*, u.username, u.email
       FROM website_activities wa
       LEFT JOIN users u ON wa.user_id = u.id
       WHERE wa.website_id = ?
       ORDER BY wa.created_at DESC
       LIMIT ? OFFSET ?`,
            [websiteId, parseInt(limit), parseInt(offset)]
        );

        const [total] = await db.promise().query(
            'SELECT COUNT(*) as count FROM website_activities WHERE website_id = ?',
            [websiteId]
        );

        res.json({
            activities,
            total: total[0].count,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Error fetching activity feed:', error);
        res.status(500).json({ error: 'Failed to fetch activity feed' });
    }
});

// Add activity to feed
router.post('/websites/:websiteId/activity', requireAuth, async (req, res) => {
    try {
        const { websiteId } = req.params;
        const { action, description, metadata } = req.body;

        // Verify access
        const [website] = await db.promise().query(
            `SELECT w.* FROM websites w
       LEFT JOIN website_team_members wtm ON w.id = wtm.website_id
       WHERE w.id = ? AND (w.userId = ? OR wtm.user_id = ?)`,
            [websiteId, req.user.id, req.user.id]
        );

        if (website.length === 0) {
            return res.status(404).json({ error: 'Website not found or access denied' });
        }

        const [result] = await db.promise().query(
            `INSERT INTO website_activities (website_id, user_id, action, description, metadata)
       VALUES (?, ?, ?, ?, ?)`,
            [websiteId, req.user.id, action, description, JSON.stringify(metadata || {})]
        );

        const [activity] = await db.promise().query(
            `SELECT wa.*, u.username, u.email
       FROM website_activities wa
       LEFT JOIN users u ON wa.user_id = u.id
       WHERE wa.id = ?`,
            [result.insertId]
        );

        res.status(201).json({
            message: 'Activity logged successfully',
            activity: activity[0]
        });
    } catch (error) {
        console.error('Error logging activity:', error);
        res.status(500).json({ error: 'Failed to log activity' });
    }
});

// Get comments for a file/task
router.get('/websites/:websiteId/comments', requireAuth, async (req, res) => {
    try {
        const { websiteId } = req.params;
        const { target_type, target_id } = req.query;

        // Verify access
        const [website] = await db.promise().query(
            `SELECT w.* FROM websites w
       LEFT JOIN website_team_members wtm ON w.id = wtm.website_id
       WHERE w.id = ? AND (w.userId = ? OR wtm.user_id = ?)`,
            [websiteId, req.user.id, req.user.id]
        );

        if (website.length === 0) {
            return res.status(404).json({ error: 'Website not found or access denied' });
        }

        const [comments] = await db.promise().query(
            `SELECT wc.*, u.username, u.email
       FROM website_comments wc
       INNER JOIN users u ON wc.user_id = u.id
       WHERE wc.website_id = ? AND wc.target_type = ? AND wc.target_id = ?
       ORDER BY wc.created_at ASC`,
            [websiteId, target_type, target_id]
        );

        res.json({ comments });
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

// Add comment
router.post('/websites/:websiteId/comments', requireAuth, async (req, res) => {
    try {
        const { websiteId } = req.params;
        const { target_type, target_id, comment } = req.body;

        if (!comment || !target_type || !target_id) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Verify access
        const [website] = await db.promise().query(
            `SELECT w.* FROM websites w
       LEFT JOIN website_team_members wtm ON w.id = wtm.website_id
       WHERE w.id = ? AND (w.userId = ? OR wtm.user_id = ?)`,
            [websiteId, req.user.id, req.user.id]
        );

        if (website.length === 0) {
            return res.status(404).json({ error: 'Website not found or access denied' });
        }

        const [result] = await db.promise().query(
            `INSERT INTO website_comments (website_id, user_id, target_type, target_id, comment)
       VALUES (?, ?, ?, ?, ?)`,
            [websiteId, req.user.id, target_type, target_id, comment]
        );

        const [newComment] = await db.promise().query(
            `SELECT wc.*, u.username, u.email
       FROM website_comments wc
       INNER JOIN users u ON wc.user_id = u.id
       WHERE wc.id = ?`,
            [result.insertId]
        );

        res.status(201).json({
            message: 'Comment added successfully',
            comment: newComment[0]
        });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

// Delete comment
router.delete('/websites/:websiteId/comments/:commentId', requireAuth, async (req, res) => {
    try {
        const { websiteId, commentId } = req.params;

        // Verify ownership of comment or website
        const [comment] = await db.promise().query(
            `SELECT wc.* FROM website_comments wc
       INNER JOIN websites w ON wc.website_id = w.id
       WHERE wc.id = ? AND wc.website_id = ? AND (wc.user_id = ? OR w.userId = ?)`,
            [commentId, websiteId, req.user.id, req.user.id]
        );

        if (comment.length === 0) {
            return res.status(404).json({ error: 'Comment not found or access denied' });
        }

        await db.promise().query('DELETE FROM website_comments WHERE id = ?', [commentId]);

        res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});

// Get tasks for a website
router.get('/websites/:websiteId/tasks', requireAuth, async (req, res) => {
    try {
        const { websiteId } = req.params;
        const { status, assigned_to } = req.query;

        // Verify access
        const [website] = await db.promise().query(
            `SELECT w.* FROM websites w
       LEFT JOIN website_team_members wtm ON w.id = wtm.website_id
       WHERE w.id = ? AND (w.userId = ? OR wtm.user_id = ?)`,
            [websiteId, req.user.id, req.user.id]
        );

        if (website.length === 0) {
            return res.status(404).json({ error: 'Website not found or access denied' });
        }

        let query = `
      SELECT wt.*, 
        creator.username as creator_name,
        assignee.username as assignee_name
      FROM website_tasks wt
      LEFT JOIN users creator ON wt.created_by = creator.id
      LEFT JOIN users assignee ON wt.assigned_to = assignee.id
      WHERE wt.website_id = ?
    `;
        const params = [websiteId];

        if (status) {
            query += ' AND wt.status = ?';
            params.push(status);
        }

        if (assigned_to) {
            query += ' AND wt.assigned_to = ?';
            params.push(assigned_to);
        }

        query += ' ORDER BY wt.priority DESC, wt.due_date ASC';

        const [tasks] = await db.promise().query(query, params);

        res.json({ tasks });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// Create task
router.post('/websites/:websiteId/tasks', requireAuth, async (req, res) => {
    try {
        const { websiteId } = req.params;
        const { title, description, assigned_to, priority, due_date, status } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Task title is required' });
        }

        // Verify access
        const [website] = await db.promise().query(
            `SELECT w.* FROM websites w
       LEFT JOIN website_team_members wtm ON w.id = wtm.website_id
       WHERE w.id = ? AND (w.userId = ? OR wtm.user_id = ?)`,
            [websiteId, req.user.id, req.user.id]
        );

        if (website.length === 0) {
            return res.status(404).json({ error: 'Website not found or access denied' });
        }

        const [result] = await db.promise().query(
            `INSERT INTO website_tasks 
       (website_id, created_by, assigned_to, title, description, priority, due_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                websiteId,
                req.user.id,
                assigned_to || null,
                title,
                description || null,
                priority || 'medium',
                due_date || null,
                status || 'pending'
            ]
        );

        const [newTask] = await db.promise().query(
            `SELECT wt.*, 
        creator.username as creator_name,
        assignee.username as assignee_name
       FROM website_tasks wt
       LEFT JOIN users creator ON wt.created_by = creator.id
       LEFT JOIN users assignee ON wt.assigned_to = assignee.id
       WHERE wt.id = ?`,
            [result.insertId]
        );

        res.status(201).json({
            message: 'Task created successfully',
            task: newTask[0]
        });
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// Update task
router.put('/websites/:websiteId/tasks/:taskId', requireAuth, async (req, res) => {
    try {
        const { websiteId, taskId } = req.params;
        const { title, description, assigned_to, priority, due_date, status } = req.body;

        // Verify access
        const [task] = await db.promise().query(
            `SELECT wt.* FROM website_tasks wt
       INNER JOIN websites w ON wt.website_id = w.id
       LEFT JOIN website_team_members wtm ON w.id = wtm.website_id
       WHERE wt.id = ? AND wt.website_id = ? AND (w.userId = ? OR wtm.user_id = ? OR wt.assigned_to = ?)`,
            [taskId, websiteId, req.user.id, req.user.id, req.user.id]
        );

        if (task.length === 0) {
            return res.status(404).json({ error: 'Task not found or access denied' });
        }

        await db.promise().query(
            `UPDATE website_tasks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        assigned_to = COALESCE(?, assigned_to),
        priority = COALESCE(?, priority),
        due_date = COALESCE(?, due_date),
        status = COALESCE(?, status),
        updated_at = NOW()
       WHERE id = ?`,
            [title, description, assigned_to, priority, due_date, status, taskId]
        );

        const [updated] = await db.promise().query(
            `SELECT wt.*, 
        creator.username as creator_name,
        assignee.username as assignee_name
       FROM website_tasks wt
       LEFT JOIN users creator ON wt.created_by = creator.id
       LEFT JOIN users assignee ON wt.assigned_to = assignee.id
       WHERE wt.id = ?`,
            [taskId]
        );

        res.json({
            message: 'Task updated successfully',
            task: updated[0]
        });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// Delete task
router.delete('/websites/:websiteId/tasks/:taskId', requireAuth, async (req, res) => {
    try {
        const { websiteId, taskId } = req.params;

        // Verify ownership
        const [task] = await db.promise().query(
            `SELECT wt.* FROM website_tasks wt
       INNER JOIN websites w ON wt.website_id = w.id
       WHERE wt.id = ? AND wt.website_id = ? AND (w.userId = ? OR wt.created_by = ?)`,
            [taskId, websiteId, req.user.id, req.user.id]
        );

        if (task.length === 0) {
            return res.status(404).json({ error: 'Task not found or access denied' });
        }

        await db.promise().query('DELETE FROM website_tasks WHERE id = ?', [taskId]);

        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

module.exports = router;
