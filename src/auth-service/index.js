const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const connectDB = require('../db/connection');
const config = require('../config');
const authRoutes = require('./routes');
const authController = require('./controllers');

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/auth', authRoutes);

// Create admin user on startup
authController.initAdminUser();

// Start server
const PORT = config.services.auth.port;
app.listen(PORT, () => {
    console.log(`Auth service running on port ${PORT}`);
});

module.exports = app;