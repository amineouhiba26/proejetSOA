const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const connectDB = require('../db/connection');
const config = require('../config');
const orderRoutes = require('./routes');
const kafkaProducer = require('../kafka/producer');

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Initialize Kafka producer
kafkaProducer.initKafka();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/orders', orderRoutes);

// Start server
const PORT = config.services.order.port;
app.listen(PORT, () => {
    console.log(`Order service running on port ${PORT}`);
});

module.exports = app;