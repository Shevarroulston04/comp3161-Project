const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/reports/courses-50-plus', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM courses_50_or_more_students');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reports/students-5-plus', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM students_5_or_more_courses');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reports/lecturers-3-plus', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM lecturers_3_or_more_courses');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reports/top-courses', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM top_10_most_enrolled_courses');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reports/top-students', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM top_10_students_highest_averages');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

