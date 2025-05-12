const express = require('express');
const proxy = require('express-http-proxy');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('../config');
const { initConsumer } = require('../kafka/consumer');


const app = express();


app.use(cors());
app.use(bodyParser.json());


initConsumer();


const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || `http://localhost:${config.services.auth.port}`;
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || `http://localhost:${config.services.product.port}`;
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || `http://localhost:${config.services.order.port}`;


const formatProxyUrl = (url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url.replace(/\/$/, ''); // Remove trailing slash if exists
    }
    return `http://${url}`;
};



app.use('/api/auth', proxy(formatProxyUrl(AUTH_SERVICE_URL), {
    proxyReqPathResolver: (req) => {
        return `/api/auth${req.url}`;
    }
}));


app.use('/api/graphql', proxy(formatProxyUrl(PRODUCT_SERVICE_URL), {
    proxyReqPathResolver: (req) => {
        return `/api/graphql`;
    }
}));


app.use('/api/orders', proxy(formatProxyUrl(ORDER_SERVICE_URL), {
    proxyReqPathResolver: (req) => {
        return `/api/orders${req.url}`;
    }
}));


app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});


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