const express = require('express');
const pool    = require('../db');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const router  = express.Router();

// ── POST /api/courses/:courseID/events ────────────────────────
router.post('/courses/:courseID/events', authenticateToken, requireRole('admin', 'lecturer'), async (req, res) => {
  try {
    const { eventName, eventDate } = req.body;
    if (!eventName || !eventDate) {
      return res.status(400).json({ error: 'eventName and eventDate are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO CalendarEvent (courseID, eventName, eventDate) VALUES (?, ?, ?)',
      [req.params.courseID, eventName, eventDate]
    );
    res.status(201).json({ eventNumber: result.insertId, courseID: Number(req.params.courseID), eventName, eventDate });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/courses/:courseID/events ─────────────────────────
router.get('/courses/:courseID/events', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM CalendarEvent WHERE courseID = ? ORDER BY eventDate ASC',
      [req.params.courseID]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/students/:studentID/events[?date=YYYY-MM-DD] ─────
router.get('/students/:studentID/events', async (req, res) => {
  try {
    const { date } = req.query;

    let sql = `
      SELECT ce.*
      FROM CalendarEvent ce
      JOIN Enroll e ON ce.courseID = e.courseID
      WHERE e.studentID = ?`;
    const params = [req.params.studentID];

    if (date) {
      sql += ' AND DATE(ce.eventDate) = ?';
      params.push(date);
    }
    sql += ' ORDER BY ce.eventDate ASC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
