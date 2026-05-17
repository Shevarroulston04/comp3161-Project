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

    const [lecturer] = await pool.query('SELECT lecturerID FROM Lecturers WHERE lecturerID = ?', [lecturerID]);
    if (lecturer.length === 0) return res.status(400).json({ error: 'Invalid lecturerID' });

    const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM Course WHERE lecturerID = ?', [lecturerID]);
    if (countRows[0].total >= 5) return res.status(400).json({ error: 'Lecturer already teaches 5 courses' });

    const [result] = await pool.query(
      `INSERT INTO Course (courseCode, courseName, courseDescription, lecturerID, adminID)
       VALUES (?, ?, ?, ?, ?)`,
      [courseCode, courseName, courseDescription || null, lecturerID, req.user.idNumber]
    );
    res.status(201).json({ courseID: result.insertId, courseCode, courseName, courseDescription, lecturerID, adminID: req.user.idNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/courses', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*, CONCAT(u.firstName, ' ', u.lastName) AS lecturerName
      FROM Course c JOIN Users u ON c.lecturerID = u.idNumber
      ORDER BY c.courseName
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/courses/student/:studentID', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*, CONCAT(u.firstName, ' ', u.lastName) AS lecturerName
      FROM Enroll e
      JOIN Course c ON e.courseID = c.courseID
      JOIN Users u ON c.lecturerID = u.idNumber
      WHERE e.studentID = ?
      ORDER BY c.courseName
    `, [req.params.studentID]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/courses/lecturer/:lecturerID', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Course WHERE lecturerID = ? ORDER BY courseName', [req.params.lecturerID]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/courses/:courseID/enroll', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const [course] = await pool.query('SELECT courseID FROM Course WHERE courseID = ?', [req.params.courseID]);
    if (course.length === 0) return res.status(404).json({ error: 'Course not found' });

    const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM Enroll WHERE studentID = ?', [req.user.idNumber]);
    if (countRows[0].total >= 6) return res.status(400).json({ error: 'Student cannot enroll in more than 6 courses' });

    await pool.query('INSERT INTO Enroll (studentID, courseID) VALUES (?, ?)', [req.user.idNumber, req.params.courseID]);
    res.status(201).json({ studentID: req.user.idNumber, courseID: Number(req.params.courseID) });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Student already enrolled in this course' });
    res.status(500).json({ error: err.message });
  }
});

router.get('/courses/:courseID/members', async (req, res) => {
  try {
    const [lecturer] = await pool.query(`
      SELECT 'lecturer' AS memberType, u.idNumber, u.firstName, u.lastName, u.email
      FROM Course c JOIN Users u ON c.lecturerID = u.idNumber
      WHERE c.courseID = ?
    `, [req.params.courseID]);
    const [students] = await pool.query(`
      SELECT 'student' AS memberType, u.idNumber, u.firstName, u.lastName, u.email
      FROM Enroll e JOIN Users u ON e.studentID = u.idNumber
      WHERE e.courseID = ? ORDER BY u.lastName, u.firstName
    `, [req.params.courseID]);
    res.json({ lecturer: lecturer[0] || null, students });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
