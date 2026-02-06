require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const personsRoutes = require('./routes/persons');
const publicRoutes = require('./routes/public');
const addressRoutes = require('./routes/address');
const changesRoutes = require('./routes/changes');
const addressManagementRoutes = require('./routes/addressManagement');
const { seedAdmin } = require('./utils/seed');

const app = express();

// Middleware - CORS for external HTML pages
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/persons', personsRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/address', addressRoutes);
app.use('/api/changes', changesRoutes);
app.use('/api/address-management', addressManagementRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Bir hata oluştu!' });
});

// Database connection and server start
const PORT = process.env.PORT || 3001;

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/adres-dogrulama')
  .then(async () => {
    console.log('MongoDB bağlantısı başarılı');
    await seedAdmin();
    // Run address seeding in background
    const seedAddresses = require('./utils/seedAddresses');
    seedAddresses().catch(err => console.error('Address seed error:', err));
    app.listen(PORT, () => {
      console.log(`Server ${PORT} portunda çalışıyor`);
    });
  })
  .catch(err => {
    console.error('MongoDB bağlantı hatası:', err);
    process.exit(1);
  });
