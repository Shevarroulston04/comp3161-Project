const express = require('express');
const pool = require('../db');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/courses/:courseID/assignments', authenticateToken, requireRole('admin', 'lecturer'), async (req, res) => {
  try {
    const { courseID } = req.params;
    const { title, description, due_date, total_marks } = req.body;

    if (!title || !due_date) {
      return res.status(400).json({ error: 'title and due_date are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO assignments (course_id, title, description, due_date, total_marks, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [courseID, title, description || null, due_date, total_marks || 100, req.user.user_id]
    );

    res.status(201).json({
      assignment_id: result.insertId,
      course_id: Number(courseID),
      title,
      description,
      due_date,
      total_marks: total_marks || 100,
      created_by: req.user.user_id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/courses/:courseID/assignments', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM assignments WHERE course_id = ? ORDER BY due_date`,
      [req.params.courseID]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/assignments/:assignmentID/submissions', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const { assignmentID } = req.params;
    const { submission_text, submission_file_url } = req.body;

    const [result] = await pool.query(
      `INSERT INTO submissions (assignment_id, student_id, submission_text, submission_file_url)
       VALUES (?, ?, ?, ?)`,
      [assignmentID, req.user.user_id, submission_text || null, submission_file_url || null]
    );

    res.status(201).json({
      submission_id: result.insertId,
      assignment_id: Number(assignmentID),
      student_id: req.user.user_id,
      submission_text: submission_text || null,
      submission_file_url: submission_file_url || null
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Student already submitted this assignment' });
    }

    res.status(500).json({ error: err.message });
  }
});

router.post('/submissions/:submissionID/grade', authenticateToken, requireRole('admin', 'lecturer'), async (req, res) => {
  try {
    const { submissionID } = req.params;
    const { marks_awarded, feedback } = req.body;

    if (marks_awarded === undefined) {
      return res.status(400).json({ error: 'marks_awarded is required' });
    }

    const [result] = await pool.query(
      `INSERT INTO grades (submission_id, graded_by, marks_awarded, feedback)
       VALUES (?, ?, ?, ?)`,
      [submissionID, req.user.user_id, marks_awarded, feedback || null]
    );

    res.status(201).json({
      grade_id: result.insertId,
      submission_id: Number(submissionID),
      graded_by: req.user.user_id,
      marks_awarded,
      feedback: feedback || null
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Submission already graded' });
    }

    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

