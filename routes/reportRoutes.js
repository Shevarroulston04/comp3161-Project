const express = require('express');
const pool = require('../db');
const router = express.Router();

const views = {
  'courses-50-plus': 'courses_50_or_more_students',
  'students-5-plus': 'students_5_or_more_courses',
  'lecturers-3-plus': 'lecturers_3_or_more_courses',
  'top-courses': 'top_10_most_enrolled_courses',
  'top-students': 'top_10_students_highest_averages'
};

router.get('/reports/:reportName', async (req, res) => {
  try {
    const view = views[req.params.reportName];
    if (!view) return res.status(404).json({ error: 'Report not found' });
    const [rows] = await pool.query(`SELECT * FROM ${view}`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
