require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { initializeTelegramBot } = require('./services/telegramBotService');
const { startReminderCron } = require('./services/reminderService');
const { startEmailPollingCron } = require('./services/emailParser');
const { startHourlyReminderEngine } = require('./services/hourlyReminderEngine');
const { ingestTelegram } = require('./controllers/ingestionController');

const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const opportunityRoutes = require('./routes/opportunityRoutes');
const ingestionRoutes = require('./routes/ingestionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');

const app = express();
const uploadsDir = path.join(__dirname, 'uploads');

// Connect to MongoDB
connectDB();

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Core middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/ingest', ingestionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/recommendations', recommendationRoutes);

// Telegram webhook alias to match ngrok webhook URL configuration.
app.post('/api/telegram/webhook', ingestTelegram);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Track Unity API is running' });
});

// Centralized error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  initializeTelegramBot();
  startReminderCron();
  startEmailPollingCron();
  startHourlyReminderEngine();
});
