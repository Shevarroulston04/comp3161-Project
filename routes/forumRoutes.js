const express = require('express');
const pool    = require('../db');
const { authenticateToken } = require('../middleware/authMiddleware');
const router  = express.Router();

// ── POST /api/courses/:courseID/forums ────────────────────────
router.post('/courses/:courseID/forums', authenticateToken, async (req, res) => {
  try {
    const { header } = req.body;
    if (!header) return res.status(400).json({ error: 'Forum header is required' });

    const [result] = await pool.query(
      'INSERT INTO Forum (courseID, header) VALUES (?, ?)',
      [req.params.courseID, header]
    );
    res.status(201).json({ forumNumber: result.insertId, courseID: Number(req.params.courseID), header });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/courses/:courseID/forums ─────────────────────────
router.get('/courses/:courseID/forums', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT f.forumNumber, f.courseID, f.header,
             COUNT(DISTINCT t.threadNumber) AS threadCount
      FROM Forum f
      LEFT JOIN Thread t ON f.forumNumber = t.forumNumber AND t.parentThreadID IS NULL
      WHERE f.courseID = ?
      GROUP BY f.forumNumber, f.courseID, f.header
    `, [req.params.courseID]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/forums/:forumNumber/threads ─────────────────────
// Creates a top-level thread (parentThreadID = NULL)
router.post('/forums/:forumNumber/threads', authenticateToken, async (req, res) => {
  try {
    const { title, forumMessage } = req.body;
    if (!title || !forumMessage) return res.status(400).json({ error: 'title and forumMessage are required' });

    const [result] = await pool.query(
      'INSERT INTO Thread (forumNumber, userID, title, forumMessage, parentThreadID) VALUES (?, ?, ?, ?, NULL)',
      [req.params.forumNumber, req.user.idNumber, title, forumMessage]
    );
    res.status(201).json({ threadNumber: result.insertId, forumNumber: Number(req.params.forumNumber), title, forumMessage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/forums/:forumNumber/threads ──────────────────────
// Returns top-level threads only (parentThreadID IS NULL)
router.get('/forums/:forumNumber/threads', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT t.threadNumber, t.forumNumber, t.title, t.forumMessage, t.parentThreadID,
             u.idNumber AS authorID, u.firstName, u.lastName, u.username,
             (SELECT COUNT(*) FROM Thread r WHERE r.parentThreadID = t.threadNumber) AS replyCount
      FROM Thread t
      JOIN Users u ON t.userID = u.idNumber
      WHERE t.forumNumber = ? AND t.parentThreadID IS NULL
      ORDER BY t.threadNumber DESC
    `, [req.params.forumNumber]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/threads/:threadNumber ────────────────────────────
// Returns the original thread + ALL descendant replies flat list
// (client-side builds the tree using parentThreadID)
router.get('/threads/:threadNumber', async (req, res) => {
  try {
    // Original post
    const [threadRows] = await pool.query(`
      SELECT t.*, u.firstName, u.lastName, u.username, u.idNumber AS authorID
      FROM Thread t JOIN Users u ON t.userID = u.idNumber
      WHERE t.threadNumber = ?
    `, [req.params.threadNumber]);
    if (threadRows.length === 0) return res.status(404).json({ error: 'Thread not found' });

    // All replies (direct and nested) — fetch recursively via CTE if MySQL 8+,
    // or via simple recursive approach: get up to 5 levels deep
    const [replies] = await pool.query(`
      WITH RECURSIVE reply_tree AS (
        SELECT t.threadNumber, t.forumNumber, t.userID, t.title,
               t.forumMessage, t.parentThreadID
        FROM Thread t
        WHERE t.parentThreadID = ?

        UNION ALL

        SELECT t.threadNumber, t.forumNumber, t.userID, t.title,
               t.forumMessage, t.parentThreadID
        FROM Thread t
        JOIN reply_tree rt ON t.parentThreadID = rt.threadNumber
      )
      SELECT rt.*, u.firstName, u.lastName, u.username, u.idNumber AS authorID
      FROM reply_tree rt
      JOIN Users u ON rt.userID = u.idNumber
      ORDER BY rt.threadNumber ASC
    `, [req.params.threadNumber]);

    res.json({ thread: threadRows[0], replies });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/threads/:threadNumber/replies ───────────────────
// Creates a reply (a Thread with parentThreadID set)
router.post('/threads/:threadNumber/replies', authenticateToken, async (req, res) => {
  try {
    const { replyMessage, parentReplyID } = req.body;
    if (!replyMessage) return res.status(400).json({ error: 'replyMessage is required' });

    // Look up the forum of the parent thread
    const [parent] = await pool.query(
      'SELECT forumNumber FROM Thread WHERE threadNumber = ?',
      [req.params.threadNumber]
    );
    if (parent.length === 0) return res.status(404).json({ error: 'Thread not found' });

    // parentReplyID lets the client reply to a specific reply (nested);
    // if omitted, we reply directly to the top-level thread
    const actualParent = parentReplyID || req.params.threadNumber;

    const [result] = await pool.query(
      `INSERT INTO Thread (forumNumber, userID, title, forumMessage, parentThreadID)
       VALUES (?, ?, 'Re: reply', ?, ?)`,
      [parent[0].forumNumber, req.user.idNumber, replyMessage, actualParent]
    );

    res.status(201).json({
      threadNumber: result.insertId,
      forumNumber:  parent[0].forumNumber,
      parentThreadID: Number(actualParent),
      replyMessage,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
