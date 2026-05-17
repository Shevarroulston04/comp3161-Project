const express = require('express');
const pool = require('../db');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/courses/:courseID/events', authenticateToken, requireRole('admin', 'lecturer'), async (req, res) => {
  try {
    const { eventName, eventDescription, eventDate, startTime, endTime } = req.body;
    const [result] = await pool.query(
      `INSERT INTO CalendarEvent (courseID, eventName, eventDescription, eventDate, startTime, endTime, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.params.courseID, eventName, eventDescription || null, eventDate, startTime || null, endTime || null, req.user.idNumber]
    );
    res.status(201).json({ eventNumber: result.insertId, courseID: Number(req.params.courseID), eventName, eventDate });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/courses/:courseID/events', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM CalendarEvent WHERE courseID = ? ORDER BY eventDate, startTime', [req.params.courseID]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/students/:studentID/events', async (req, res) => {
  try {
    const { date } = req.query;
    let sql = `
      SELECT ce.* FROM CalendarEvent ce
      JOIN Enroll e ON ce.courseID = e.courseID
      WHERE e.studentID = ?`;
    const params = [req.params.studentID];
    if (date) { sql += ' AND ce.eventDate = ?'; params.push(date); }
    sql += ' ORDER BY ce.eventDate, ce.startTime';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
