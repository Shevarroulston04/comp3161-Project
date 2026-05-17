const express = require('express');
const pool = require('../db');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/courses/:courseID/forums', authenticateToken, requireRole('admin', 'lecturer'), async (req, res) => {
  try {
    const { courseID } = req.params;
    const { title } = req.body;

    if (!title) return res.status(400).json({ error: 'title is required' });

    const [result] = await pool.query(
      `INSERT INTO forums (course_id, title, created_by)
       VALUES (?, ?, ?)`,
      [courseID, title, req.user.user_id]
    );

    res.status(201).json({
      forum_id: result.insertId,
      course_id: Number(courseID),
      title,
      created_by: req.user.user_id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/courses/:courseID/forums', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM forums WHERE course_id = ? ORDER BY created_at DESC`,
      [req.params.courseID]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/forums/:forumID/threads', authenticateToken, async (req, res) => {
  try {
    const { forumID } = req.params;
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO threads (forum_id, title, content, created_by)
       VALUES (?, ?, ?, ?)`,
      [forumID, title, content, req.user.user_id]
    );

    res.status(201).json({
      thread_id: result.insertId,
      forum_id: Number(forumID),
      title,
      content,
      created_by: req.user.user_id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/forums/:forumID/threads', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM threads WHERE forum_id = ? ORDER BY created_at DESC`,
      [req.params.forumID]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/threads/:threadID/replies', authenticateToken, async (req, res) => {
  try {
    const { threadID } = req.params;
    const { content, parent_reply_id } = req.body;

    if (!content) return res.status(400).json({ error: 'content is required' });

    const [result] = await pool.query(
      `INSERT INTO thread_replies (thread_id, parent_reply_id, content, created_by)
       VALUES (?, ?, ?, ?)`,
      [threadID, parent_reply_id || null, content, req.user.user_id]
    );

    res.status(201).json({
      reply_id: result.insertId,
      thread_id: Number(threadID),
      parent_reply_id: parent_reply_id || null,
      content,
      created_by: req.user.user_id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/threads/:threadID/replies', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM thread_replies WHERE thread_id = ? ORDER BY created_at ASC`,
      [req.params.threadID]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;