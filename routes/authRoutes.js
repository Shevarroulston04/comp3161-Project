const express  = require('express');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');
const jwt      = require('jsonwebtoken');
const pool     = require('../db');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

// SHA-256 helper — matches the Python seeder's hashlib.sha256
const sha256 = (plain) => crypto.createHash('sha256').update(plain).digest('hex');

// Verify password against either bcrypt (API-registered users)
// or SHA-256 (seeder-populated users)
async function verifyPassword(plain, stored) {
  // bcrypt hashes always start with $2a$ / $2b$
  if (stored.startsWith('$2')) {
    return bcrypt.compare(plain, stored);
  }
  // Otherwise treat as a hex SHA-256 digest
  return sha256(plain) === stored;
}

// ── POST /api/register ────────────────────────────────────────
router.post('/register', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { firstName, lastName, username, password, role, email } = req.body;
    if (!firstName || !lastName || !username || !password || !role) {
      return res.status(400).json({ error: 'firstName, lastName, username, password and role are required' });
    }
    if (!['admin', 'lecturer', 'student'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin, lecturer, or student' });
    }

    const hash = await bcrypt.hash(password, 10);
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO Users (username, firstName, lastName, userPassword, role, email)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, firstName, lastName, hash, role, email || null]
    );
    const id = result.insertId;

    if (role === 'student')  await conn.query('INSERT INTO Students (studentID) VALUES (?)',  [id]);
    if (role === 'lecturer') await conn.query('INSERT INTO Lecturers (lecturerID) VALUES (?)', [id]);
    if (role === 'admin')    await conn.query('INSERT INTO Admins (adminID) VALUES (?)',       [id]);

    await conn.commit();
    res.status(201).json({ idNumber: id, username, firstName, lastName, role });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username already taken' });
    }
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ── POST /api/login ───────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const [rows] = await pool.query('SELECT * FROM Users WHERE username = ?', [username]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const ok   = await verifyPassword(password, user.userPassword);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { idNumber: user.idNumber, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        idNumber:  user.idNumber,
        username:  user.username,
        firstName: user.firstName,
        lastName:  user.lastName,
        role:      user.role,
        email:     user.email || null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/me ───────────────────────────────────────────────
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT idNumber, username, firstName, lastName, role, email FROM Users WHERE idNumber = ?',
      [req.user.idNumber]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
