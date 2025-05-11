const express = require('express');
const { Kafka } = require('kafkajs');
const nodemailer = require('nodemailer');
const axios = require('axios');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});  // Environment variables
const PORT = process.env.PORT || 3004;
const HOST = process.env.HOST || '0.0.0.0';
const KAFKA_BROKERS = process.env.KAFKA_BROKERS || 'kafka:9092';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3000';
const EMAIL_SERVICE = process.env.EMAIL_SERVICE || 'mailjet';
const EMAIL_HOST = process.env.EMAIL_HOST || 'in-v3.mailjet.com';
const EMAIL_PORT = process.env.EMAIL_PORT || 587;
const EMAIL_USER = process.env.EMAIL_USER || '018cd022d998484178167bd4e2ed76ae';
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || 'cc2e938b41484c50b9e995fbe1e94882';
const EMAIL_FROM = process.env.EMAIL_FROM || 'amine.ouhiba@polytechnicien.tn';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'amibz2001@gmail.com';

// Create email transporter
const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: false, // TLS
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD
  }
});

// Create Express app
const app = express();

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'notification-service',
    kafka: KAFKA_BROKERS,
    timestamp: new Date().toISOString()
  });
});

// Test product fetch endpoint
app.get('/test-product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    logger.info(`Testing product fetch for ID: ${productId}`);
    
    const response = await axios.get(`${PRODUCT_SERVICE_URL}/products/${productId}`);
    
    if (response.data) {
      logger.info(`Product data received: ${JSON.stringify(response.data)}`);
      return res.status(200).json({
        success: true,
        productData: response.data
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Product not found or returned empty data'
      });
    }
  } catch (error) {
    logger.error(`Test product fetch failed: ${error.message}`);
    if (error.response) {
      logger.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
    }
    return res.status(500).json({
      success: false,
      error: error.message,
      responseData: error.response ? error.response.data : null,
      responseStatus: error.response ? error.response.status : null
    });
  }
});

// Test email endpoint
app.get('/test-email', async (req, res) => {
  try {
    const testOrder = {
      _id: 'test-order-' + Date.now(),
      userId: 'test-user',
      username: 'Test User',
      timestamp: new Date().toISOString(),
      products: [
        { name: 'Test Product', quantity: 1, price: 10 }
      ],
      totalAmount: 10
    };

    const mailOptions = {
      from: `"soa project" <${EMAIL_FROM}>`,
      to: ADMIN_EMAIL,
      subject: "🛒 Test notification",
      text: `👤 User: ${testOrder.username} (ID: ${testOrder.userId})\n🕒 ${testOrder.timestamp}\n\nProducts:\n• ${testOrder.products[0].name} x ${testOrder.products[0].quantity} (${testOrder.products[0].price} DT each)\n\nTotal: ${testOrder.totalAmount} DT`
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: 'Test email sent successfully' });
  } catch (error) {
    logger.error(`Test email failed: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start Kafka consumer
const startKafkaConsumer = async () => {
  try {
    logger.info(`Connecting to Kafka at ${KAFKA_BROKERS}`);
    
    const kafka = new Kafka({
      clientId: 'notification-service',
      brokers: [KAFKA_BROKERS]
    });
    
    const consumer = kafka.consumer({ groupId: 'notification-group' });
    
    await consumer.connect();
    logger.info('Connected to Kafka');
    
    await consumer.subscribe({ topic: 'order-events', fromBeginning: false });
    logger.info('Subscribed to order-events topic');
    
    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const eventData = JSON.parse(message.value.toString());
          logger.info(`Received order event: ${JSON.stringify(eventData)}`);
          
          if (eventData.eventType === 'order_created' || eventData.order) {
            const order = eventData.order || eventData;
            
            // Get username if not included
            let username = order.username || 'Unknown';
            if (order.userId) {
              try {
                const response = await axios.get(`${AUTH_SERVICE_URL}/user/${order.userId}`);
                if (response.data && response.data.username) {
                  username = response.data.username;
                }
              } catch (err) {
                logger.warn(`Could not fetch user info: ${err.message}`);
              }
            }
            
            // Format product details with enhanced product information
            const productDetailsPromises = order.products.map(async p => {
              let productName = p.name;
              let productPrice = p.price;
              
              // If the product ID looks like a MongoDB ObjectId, we need to fetch product details
              if (p.productId && p.productId.match(/^[0-9a-fA-F]{24}$/)) {
                try {
                  logger.info(`Fetching product details for ID: ${p.productId}`);
                  const response = await axios.get(`${PRODUCT_SERVICE_URL}/products/${p.productId}`);
                  
                  if (response.data) {
                    logger.info(`Product data received: ${JSON.stringify(response.data)}`);
                    // Use fetched data regardless of whether we already have a name
                    productName = response.data.name || productName;
                    productPrice = response.data.price || productPrice;
                  } else {
                    logger.warn(`No product data returned for ID: ${p.productId}`);
                  }
                } catch (err) {
                  logger.error(`Error fetching product info for ID ${p.productId}: ${err.message}`);
                  if (err.response) {
                    logger.error(`Status: ${err.response.status}, Data: ${JSON.stringify(err.response.data)}`);
                  }
                }
              }
              
              // Format product line with available info
              let line = `• ${productName || `Product ${p.productId || 'Unknown'}`} x ${p.quantity}`;
              if (productPrice) {
                line += ` (${productPrice} DT each)`;
              }
              return line;
            });
            
            // Wait for all product details to be resolved
            const productDetails = await Promise.all(productDetailsPromises);
            
            // Send email notification
            const mailOptions = {
              from: `"soa project" <${EMAIL_FROM}>`,
              to: ADMIN_EMAIL,
              subject: "🛒 Nouvelle commande reçue",
              text: `👤 Utilisateur: ${username} (ID: ${order.userId})\n🕒 ${order.timestamp || order.createdAt || new Date().toISOString()}\n\nProduits:\n${productDetails.join('\n')}\n\nTotal: ${order.totalAmount} DT`
            };
            
            await transporter.sendMail(mailOptions);
            logger.info(`Email sent to admin for order ${order._id}`);
          }
        } catch (err) {
          logger.error(`Error processing message: ${err.message}`);
        }
      }
    });
  } catch (error) {
    logger.error(`Kafka consumer error: ${error.message}`);
    // Retry after 5 seconds
    setTimeout(startKafkaConsumer, 5000);
  }
};

// Start server
app.listen(PORT, HOST, () => {
  logger.info(`Notification service listening on ${HOST}:${PORT}`);
  
  // Verify email connection
  transporter.verify()
    .then(() => {
      logger.info('Email connection verified');
    })
    .catch(err => {
      logger.error(`Email connection error: ${err.message}`);
    });
  
  // Start Kafka consumer
  startKafkaConsumer();
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down...');
  process.exit(0);
});
