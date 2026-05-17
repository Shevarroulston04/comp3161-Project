const express = require('express');
const pool = require('../db');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/courses/:courseID/sections', authenticateToken, requireRole('admin', 'lecturer'), async (req, res) => {
  try {
    const { courseID } = req.params;
    const { title, position_num } = req.body;

    if (!title || !position_num) {
      return res.status(400).json({ error: 'title and position_num are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO content_sections (course_id, title, position_num)
       VALUES (?, ?, ?)`,
      [courseID, title, position_num]
    );

    res.status(201).json({
      section_id: result.insertId,
      course_id: Number(courseID),
      title,
      position_num
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sections/:sectionID/content', authenticateToken, requireRole('admin', 'lecturer'), async (req, res) => {
  try {
    const { sectionID } = req.params;
    const { title, content_type, content_url } = req.body;

    if (!title || !content_type || !content_url) {
      return res.status(400).json({ error: 'title, content_type and content_url are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO course_contents (section_id, title, content_type, content_url, uploaded_by)
       VALUES (?, ?, ?, ?, ?)`,
      [sectionID, title, content_type, content_url, req.user.user_id]
    );

    res.status(201).json({
      content_id: result.insertId,
      section_id: Number(sectionID),
      title,
      content_type,
      content_url,
      uploaded_by: req.user.user_id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/courses/:courseID/content', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT cs.section_id, cs.course_id, cs.title AS section_title, cs.position_num,
              cc.content_id, cc.title AS content_title, cc.content_type, cc.content_url, cc.uploaded_at
       FROM content_sections cs
       LEFT JOIN course_contents cc ON cs.section_id = cc.section_id
       WHERE cs.course_id = ?
       ORDER BY cs.position_num, cc.uploaded_at`,
      [req.params.courseID]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;