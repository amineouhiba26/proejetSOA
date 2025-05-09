const express = require('express');
const proxy = require('express-http-proxy');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('../config');
const { initConsumer } = require('../kafka/consumer');

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize Kafka consumer
initConsumer();

// Proxy routes to respective services
// Auth Service
app.use('/api/auth', proxy(`localhost:${config.services.auth.port}`, {
    proxyReqPathResolver: (req) => {
        return `/api/auth${req.url}`;
    }
}));

// Product Service (GraphQL)
app.use('/api/graphql', proxy(`localhost:${config.services.product.port}`, {
    proxyReqPathResolver: (req) => {
        return `/api/graphql`;
    }
}));

// Order Service
app.use('/api/orders', proxy(`localhost:${config.services.order.port}`, {
    proxyReqPathResolver: (req) => {
        return `/api/orders${req.url}`;
    }
}));

// Simple health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
const PORT = config.services.gateway.port;
app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
    console.log(`
    Available endpoints:
    - Auth: /api/auth/register, /api/auth/login
    - GraphQL: /api/graphql
    - Orders: /api/orders
    `);
});

module.exports = app;