const express = require('express');
const cors = require('cors');
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

app.get('/', (req, res) => {
  res.json({ message: 'COMP3161 Course Management API is running' });
});

app.use('/api', authRoutes);
app.use('/api', courseRoutes);
app.use('/api', calendarRoutes);
app.use('/api', forumRoutes);
app.use('/api', contentRoutes);
app.use('/api', assignmentRoutes);
app.use('/api', reportRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
