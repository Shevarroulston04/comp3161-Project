const express = require('express');
const pool = require('../db');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/courses/:courseID/events', authenticateToken, requireRole('admin', 'lecturer'), async (req, res) => {
  try {
    const { courseID } = req.params;
    const { title, description, event_date, start_time, end_time } = req.body;

    if (!title || !event_date) {
      return res.status(400).json({ error: 'title and event_date are required' });
    }

    const [courseRows] = await pool.query(
      'SELECT course_id FROM courses WHERE course_id = ?',
      [courseID]
    );

    if (courseRows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const [result] = await pool.query(
      `INSERT INTO calendar_events 
       (course_id, title, description, event_date, start_time, end_time, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        courseID,
        title,
        description || null,
        event_date,
        start_time || null,
        end_time || null,
        req.user.user_id
      ]
    );

    res.status(201).json({
      event_id: result.insertId,
      course_id: Number(courseID),
      title,
      description,
      event_date,
      start_time,
      end_time,
      created_by: req.user.user_id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/courses/:courseID/events', async (req, res) => {
  try {
    const { courseID } = req.params;

    const [rows] = await pool.query(
      `SELECT event_id, course_id, title, description, event_date, start_time, end_time, created_by, created_at
       FROM calendar_events
       WHERE course_id = ?
       ORDER BY event_date, start_time`,
      [courseID]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/students/:studentID/events', async (req, res) => {
  try {
    const { studentID } = req.params;
    const { date } = req.query;

    let query = `
      SELECT ce.*
      FROM calendar_events ce
      JOIN enrollments e ON ce.course_id = e.course_id
      WHERE e.student_id = ?
    `;

    const values = [studentID];

    if (date) {
      query += ` AND ce.event_date = ?`;
      values.push(date);
    }

    query += ` ORDER BY ce.event_date, ce.start_time`;

    const [rows] = await pool.query(query, values);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;