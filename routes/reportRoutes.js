const express = require('express');
const pool    = require('../db');
const router  = express.Router();

// Map URL slugs → actual view names defined in schema.sql
const VIEWS = {
  'courses-50-plus':  'CoursesWithFiftyPlusStudents',
  'students-5-plus':  'StudentsFivePlusCourses',
  'lecturers-3-plus': 'LecturersThreePlusCourses',
  'top-courses':      'TopTenEnrolledCourses',
  'top-students':     'TopTenStudentAverages',
};

// GET /api/reports/:reportName
router.get('/reports/:reportName', async (req, res) => {
  try {
    const view = VIEWS[req.params.reportName];
    if (!view) return res.status(404).json({ error: 'Report not found' });

    const [rows] = await pool.query(`SELECT * FROM \`${view}\``);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
