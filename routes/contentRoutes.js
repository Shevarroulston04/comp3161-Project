const express = require('express');
const pool = require('../db');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/courses/:courseID/sections', authenticateToken, requireRole('lecturer', 'admin'), async (req, res) => {
  try {
    const { sectionName, sectionOrder } = req.body;
    const [result] = await pool.query('INSERT INTO Section (sectionName, courseID, sectionOrder) VALUES (?, ?, ?)', [sectionName, req.params.courseID, sectionOrder || 1]);
    res.status(201).json({ secNumber: result.insertId, sectionName, courseID: Number(req.params.courseID) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/sections/:secNumber/content', authenticateToken, requireRole('lecturer'), async (req, res) => {
  try {
    const { contentName, fileType, contentURL } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Content (secNumber, contentName, fileType, contentURL, uploadedBy) VALUES (?, ?, ?, ?, ?)',
      [req.params.secNumber, contentName, fileType, contentURL, req.user.idNumber]
    );
    res.status(201).json({ contentNumber: result.insertId, secNumber: Number(req.params.secNumber), contentName, fileType, contentURL });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/courses/:courseID/content', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.secNumber, s.sectionName, s.sectionOrder, c.contentNumber, c.contentName, c.fileType, c.contentURL
      FROM Section s LEFT JOIN Content c ON s.secNumber = c.secNumber
      WHERE s.courseID = ? ORDER BY s.sectionOrder, c.contentNumber
    `, [req.params.courseID]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
