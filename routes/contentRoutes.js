const express = require('express');
const pool    = require('../db');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const router  = express.Router();

// ── POST /api/courses/:courseID/sections ──────────────────────
router.post('/courses/:courseID/sections', authenticateToken, requireRole('lecturer', 'admin'), async (req, res) => {
  try {
    const { sectionName } = req.body;
    if (!sectionName) return res.status(400).json({ error: 'sectionName is required' });

    const [result] = await pool.query(
      'INSERT INTO Section (sectionName, courseID) VALUES (?, ?)',
      [sectionName, req.params.courseID]
    );
    res.status(201).json({ secNumber: result.insertId, sectionName, courseID: Number(req.params.courseID) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/sections/:secNumber/content ─────────────────────
router.post('/sections/:secNumber/content', authenticateToken, requireRole('lecturer'), async (req, res) => {
  try {
    const { contentName, fileType, contentURL } = req.body;
    if (!contentName || !fileType || !contentURL) {
      return res.status(400).json({ error: 'contentName, fileType, and contentURL are required' });
    }
    if (!['link', 'file', 'slides'].includes(fileType)) {
      return res.status(400).json({ error: 'fileType must be link, file, or slides' });
    }

    const [result] = await pool.query(
      'INSERT INTO Content (secNumber, contentName, fileType, contentURL) VALUES (?, ?, ?, ?)',
      [req.params.secNumber, contentName, fileType, contentURL]
    );
    res.status(201).json({
      contentNumber: result.insertId,
      secNumber: Number(req.params.secNumber),
      contentName, fileType, contentURL
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/courses/:courseID/content ────────────────────────
router.get('/courses/:courseID/content', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.secNumber, s.sectionName,
             c.contentNumber, c.contentName, c.fileType, c.contentURL
      FROM Section s
      LEFT JOIN Content c ON s.secNumber = c.secNumber
      WHERE s.courseID = ?
      ORDER BY s.secNumber, c.contentNumber
    `, [req.params.courseID]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
