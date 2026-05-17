const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/courses/:courseID/forums', authenticateToken, async (req, res) => {
  try {
    const { header } = req.body;
    const [result] = await pool.query('INSERT INTO Forum (courseID, header, createdBy) VALUES (?, ?, ?)', [req.params.courseID, header, req.user.idNumber]);
    res.status(201).json({ forumNumber: result.insertId, courseID: Number(req.params.courseID), header });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/courses/:courseID/forums', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Forum WHERE courseID = ? ORDER BY createdAt DESC', [req.params.courseID]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/forums/:forumNumber/threads', authenticateToken, async (req, res) => {
  try {
    const { title, forumMessage } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Thread (forumNumber, createdBy, title, forumMessage) VALUES (?, ?, ?, ?)',
      [req.params.forumNumber, req.user.idNumber, title, forumMessage]
    );
    res.status(201).json({ threadNumber: result.insertId, forumNumber: Number(req.params.forumNumber), title, forumMessage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/forums/:forumNumber/threads', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Thread WHERE forumNumber = ? ORDER BY createdAt DESC', [req.params.forumNumber]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/threads/:threadNumber/replies', authenticateToken, async (req, res) => {
  try {
    const { replyMessage, parentReplyID } = req.body;
    const [result] = await pool.query(
      'INSERT INTO ThreadReply (threadNumber, parentReplyID, createdBy, replyMessage) VALUES (?, ?, ?, ?)',
      [req.params.threadNumber, parentReplyID || null, req.user.idNumber, replyMessage]
    );
    res.status(201).json({ replyID: result.insertId, threadNumber: Number(req.params.threadNumber), parentReplyID: parentReplyID || null, replyMessage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/threads/:threadNumber/replies', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM ThreadReply WHERE threadNumber = ? ORDER BY createdAt ASC', [req.params.threadNumber]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
