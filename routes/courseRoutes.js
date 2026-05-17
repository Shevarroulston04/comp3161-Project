const express = require('express');
const pool = require('../db');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/courses', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { courseCode, courseName, courseDescription, lecturerID } = req.body;

    if (!courseCode || !courseName || !lecturerID) {
      return res.status(400).json({ error: 'courseCode, courseName and lecturerID are required' });
    }

    const [lecturerRows] = await pool.query(
      `SELECT user_id FROM users WHERE user_id = ? AND role = 'lecturer'`,
      [lecturerID]
    );

    if (lecturerRows.length === 0) {
      return res.status(400).json({ error: 'Invalid lecturerID' });
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM courses WHERE lecturer_id = ?`,
      [lecturerID]
    );

    if (countRows[0].total >= 5) {
      return res.status(400).json({ error: 'Lecturer already teaches 5 courses' });
    }

    const [result] = await pool.query(
      `INSERT INTO courses (course_code, course_name, description, lecturer_id, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [courseCode, courseName, courseDescription || null, lecturerID, req.user.user_id]
    );

    res.status(201).json({
      course_id: result.insertId,
      course_code: courseCode,
      course_name: courseName,
      description: courseDescription || null,
      lecturer_id: lecturerID,
      created_by: req.user.user_id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/courses', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.course_id, c.course_code, c.course_name, c.description,
             c.lecturer_id, c.created_by, c.created_at,
             CONCAT(u.first_name, ' ', u.last_name) AS lecturer_name
      FROM courses c
      JOIN users u ON c.lecturer_id = u.user_id
      ORDER BY c.course_name
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/courses/student/:studentID', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.course_id, c.course_code, c.course_name, c.description,
             CONCAT(u.first_name, ' ', u.last_name) AS lecturer_name
      FROM enrollments e
      JOIN courses c ON e.course_id = c.course_id
      JOIN users u ON c.lecturer_id = u.user_id
      WHERE e.student_id = ?
      ORDER BY c.course_name
    `, [req.params.studentID]);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/courses/lecturer/:lecturerID', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT course_id, course_code, course_name, description, created_at
       FROM courses
       WHERE lecturer_id = ?
       ORDER BY course_name`,
      [req.params.lecturerID]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/courses/:courseID/enroll', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const [courseRows] = await pool.query(
      `SELECT course_id FROM courses WHERE course_id = ?`,
      [req.params.courseID]
    );

    if (courseRows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM enrollments WHERE student_id = ?`,
      [req.user.user_id]
    );

    if (countRows[0].total >= 6) {
      return res.status(400).json({ error: 'Student cannot enroll in more than 6 courses' });
    }

    const [result] = await pool.query(
      `INSERT INTO enrollments (student_id, course_id)
       VALUES (?, ?)`,
      [req.user.user_id, req.params.courseID]
    );

    res.status(201).json({
      enrollment_id: result.insertId,
      student_id: req.user.user_id,
      course_id: Number(req.params.courseID)
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Student already enrolled in this course' });
    }

    res.status(500).json({ error: err.message });
  }
});

router.get('/courses/:courseID/members', async (req, res) => {
  try {
    const [lecturerRows] = await pool.query(`
      SELECT 'lecturer' AS member_type,
             u.user_id, u.first_name, u.last_name, u.email
      FROM courses c
      JOIN users u ON c.lecturer_id = u.user_id
      WHERE c.course_id = ?
    `, [req.params.courseID]);

    const [studentRows] = await pool.query(`
      SELECT 'student' AS member_type,
             u.user_id, u.first_name, u.last_name, u.email
      FROM enrollments e
      JOIN users u ON e.student_id = u.user_id
      WHERE e.course_id = ?
      ORDER BY u.last_name, u.first_name
    `, [req.params.courseID]);

    res.json({
      lecturer: lecturerRows[0] || null,
      students: studentRows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;