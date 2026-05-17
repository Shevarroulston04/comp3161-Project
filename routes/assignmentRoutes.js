const express = require('express');
const pool    = require('../db');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const router  = express.Router();

// ── POST /api/courses/:courseID/assignments  (lecturer) ───────
router.post('/courses/:courseID/assignments', authenticateToken, requireRole('lecturer'), async (req, res) => {
  try {
    const { assignmentName, maxMarks, dueDate } = req.body;
    if (!assignmentName || !maxMarks) {
      return res.status(400).json({ error: 'assignmentName and maxMarks are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO Assignment (courseID, assignmentName, maxMarks, dueDate) VALUES (?, ?, ?, ?)',
      [req.params.courseID, assignmentName, maxMarks, dueDate || null]
    );
    res.status(201).json({ assignmentNumber: result.insertId, courseID: Number(req.params.courseID), assignmentName, maxMarks });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/courses/:courseID/assignments ────────────────────
router.get('/courses/:courseID/assignments', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM Assignment WHERE courseID = ? ORDER BY dueDate IS NULL, dueDate ASC',
      [req.params.courseID]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/assignments/:assignmentNumber/submissions  (lecturer / admin) ──
router.get('/assignments/:assignmentNumber/submissions', authenticateToken, requireRole('lecturer', 'admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.studentID, s.assignmentNumber, s.grade, s.submissionDate,
             s.submissionText, s.submissionURL, s.feedback, s.gradedDate,
             u.firstName, u.lastName, u.username
      FROM Submit s
      JOIN Users u ON s.studentID = u.idNumber
      WHERE s.assignmentNumber = ?
      ORDER BY s.submissionDate DESC
    `, [req.params.assignmentNumber]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/assignments/:assignmentNumber/submissions  (student) ──
router.post('/assignments/:assignmentNumber/submissions', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const { submissionText, submissionURL } = req.body;
    if (!submissionText && !submissionURL) {
      return res.status(400).json({ error: 'Provide submissionText or submissionURL' });
    }

    // grade NULL until lecturer grades; ON DUPLICATE KEY allows re-submission
    await pool.query(`
      INSERT INTO Submit (studentID, assignmentNumber, submissionText, submissionURL, grade)
      VALUES (?, ?, ?, ?, NULL)
      ON DUPLICATE KEY UPDATE
        submissionText = VALUES(submissionText),
        submissionURL  = VALUES(submissionURL),
        submissionDate = NOW()
    `, [req.user.idNumber, req.params.assignmentNumber, submissionText || null, submissionURL || null]);

    res.status(201).json({ message: 'Submission received', studentID: req.user.idNumber, assignmentNumber: Number(req.params.assignmentNumber) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/submissions/:studentID/:assignmentNumber/grade  (lecturer) ──
router.post('/submissions/:studentID/:assignmentNumber/grade', authenticateToken, requireRole('lecturer'), async (req, res) => {
  try {
    const { grade, feedback } = req.body;
    if (grade === undefined || grade === null) {
      return res.status(400).json({ error: 'grade is required' });
    }

    const [result] = await pool.query(`
      UPDATE Submit
      SET grade = ?, feedback = ?, gradedDate = NOW()
      WHERE studentID = ? AND assignmentNumber = ?
    `, [grade, feedback || null, req.params.studentID, req.params.assignmentNumber]);

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Submission not found' });
    res.json({ message: 'Grade saved', grade });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/students/:studentID/grades ───────────────────────
router.get('/students/:studentID/grades', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.assignmentNumber, s.grade, s.submissionDate, s.gradedDate, s.feedback,
             a.assignmentName, a.maxMarks, a.courseID,
             c.courseName
      FROM Submit s
      JOIN Assignment a ON s.assignmentNumber = a.assignmentNumber
      JOIN Course     c ON a.courseID         = c.courseID
      WHERE s.studentID = ? AND s.grade IS NOT NULL
      ORDER BY s.gradedDate DESC
    `, [req.params.studentID]);

    const avg = rows.length
      ? rows.reduce((sum, r) => sum + parseFloat(r.grade), 0) / rows.length
      : null;

    res.json({
      grades:         rows,
      overallAverage: avg !== null ? parseFloat(avg.toFixed(2)) : null,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
