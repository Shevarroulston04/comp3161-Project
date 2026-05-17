const express = require('express');
const pool = require('../db');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/courses/:courseID/assignments', authenticateToken, requireRole('lecturer'), async (req, res) => {
  try {
    const { assignmentName, assignmentDescription, maxMarks, dueDate } = req.body;
    const [result] = await pool.query(
      `INSERT INTO Assignment (courseID, assignmentName, assignmentDescription, maxMarks, dueDate, createdBy)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.params.courseID, assignmentName, assignmentDescription || null, maxMarks || 100, dueDate || null, req.user.idNumber]
    );
    res.status(201).json({ assignmentNumber: result.insertId, courseID: Number(req.params.courseID), assignmentName });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/courses/:courseID/assignments', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Assignment WHERE courseID = ? ORDER BY dueDate', [req.params.courseID]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/assignments/:assignmentNumber/submissions', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const { submissionText, submissionURL } = req.body;
    await pool.query(
      `INSERT INTO Submit (studentID, assignmentNumber, submissionText, submissionURL)
       VALUES (?, ?, ?, ?)`,
      [req.user.idNumber, req.params.assignmentNumber, submissionText || null, submissionURL || null]
    );
    res.status(201).json({ studentID: req.user.idNumber, assignmentNumber: Number(req.params.assignmentNumber), submissionText, submissionURL });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Assignment already submitted by this student' });
    res.status(500).json({ error: err.message });
  }
});

router.post('/submissions/:studentID/:assignmentNumber/grade', authenticateToken, requireRole('lecturer'), async (req, res) => {
  try {
    const { grade, feedback } = req.body;
    const [result] = await pool.query(
      `UPDATE Submit SET grade = ?, feedback = ?, gradedBy = ?, gradedDate = NOW()
       WHERE studentID = ? AND assignmentNumber = ?`,
      [grade, feedback || null, req.user.idNumber, req.params.studentID, req.params.assignmentNumber]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Submission not found' });
    res.json({ message: 'Grade saved' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
