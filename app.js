const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const forumRoutes = require('./routes/forumRoutes');
const contentRoutes = require('./routes/contentRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'frontend')));

// API routes
app.use('/api', authRoutes);
app.use('/api', courseRoutes);
app.use('/api', calendarRoutes);
app.use('/api', forumRoutes);
app.use('/api', contentRoutes);
app.use('/api', assignmentRoutes);
app.use('/api', reportRoutes);

// Health check
app.get('/api', (req, res) => {
  res.json({ message: 'EduVLE Course Management API is running', version: '1.0.0' });
});

// Catch-all: serve frontend for any non-API route (SPA support)
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`EduVLE server running on http://localhost:${PORT}`));
