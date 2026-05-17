const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

router.post('/register', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { firstName, lastName, email, username, password, role } = req.body;
    if (!firstName || !lastName || !email || !username || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (!['admin', 'lecturer', 'student'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const hash = await bcrypt.hash(password, 10);
    await conn.beginTransaction();
    const [userResult] = await conn.query(
      `INSERT INTO Users (firstName, lastName, email, username, userPassword, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [firstName, lastName, email, username, hash, role]
    );
    const id = userResult.insertId;

    if (role === 'student') await conn.query('INSERT INTO Students (studentID) VALUES (?)', [id]);
    if (role === 'lecturer') await conn.query('INSERT INTO Lecturers (lecturerID) VALUES (?)', [id]);
    if (role === 'admin') await conn.query('INSERT INTO Admins (adminID) VALUES (?)', [id]);

    await conn.commit();
    res.status(201).json({ idNumber: id, firstName, lastName, email, username, role });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM Users WHERE username = ?', [username]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.userPassword);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { idNumber: user.idNumber, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.json({
      message: 'Login successful',
      token,
      user: { idNumber: user.idNumber, username: user.username, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
