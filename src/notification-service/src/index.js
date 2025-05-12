const express = require('express');
const { Kafka } = require('kafkajs');
const nodemailer = require('nodemailer');
const axios = require('axios');
const winston = require('winston');


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
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://api-gateway:3000';
const EMAIL_SERVICE = process.env.EMAIL_SERVICE || 'mailjet';
const EMAIL_HOST = process.env.EMAIL_HOST || 'in-v3.mailjet.com';
const EMAIL_PORT = process.env.EMAIL_PORT || 587;
const EMAIL_USER = process.env.EMAIL_USER || '018cd022d998484178167bd4e2ed76ae';
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || 'cc2e938b41484c50b9e995fbe1e94882';
const EMAIL_FROM = process.env.EMAIL_FROM || 'amine.ouhiba@polytechnicien.tn';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'amibz2001@gmail.com';


const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: false, // TLS
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD
  }
});


const app = express();


app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'notification-service',
    kafka: KAFKA_BROKERS,
    timestamp: new Date().toISOString()
  });
});


app.get('/test-product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    logger.info(`Testing product fetch for ID: ${productId}`);
    

    const graphqlQuery = {
      query: `query { product(id: "${productId}") { id name description price stock } }`
    };
    
    logger.info(`Making GraphQL request with query: ${JSON.stringify(graphqlQuery)}`);
    
    const response = await axios.post(`${PRODUCT_SERVICE_URL}/api/graphql`, graphqlQuery);
    
    logger.info(`Complete GraphQL response: ${JSON.stringify(response.data)}`);
    
    if (response.data && response.data.data && response.data.data.product) {
      const productData = response.data.data.product;
      logger.info(`Product data extracted: ${JSON.stringify(productData)}`);
      return res.status(200).json({
        success: true,
        productData: productData
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Product not found or returned empty data',
        responseData: response.data
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


app.get('/test-product-email/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    

    const graphqlQuery = {
      query: `query { product(id: "${productId}") { id name description price stock } }`
    };
    
    const response = await axios.post(`${PRODUCT_SERVICE_URL}/api/graphql`, graphqlQuery);
    
    let productName = 'Unknown Product';
    let productPrice = 0;
    
    if (response.data && response.data.data && response.data.data.product) {
      const productData = response.data.data.product;
      productName = productData.name;
      productPrice = productData.price;
    }
    

    const mailOptions = {
      from: `"soa project" <${EMAIL_FROM}>`,
      to: ADMIN_EMAIL,
      subject: "🛒 Test Product Email",
      text: `Test email for product:\n• ${productName} x 1 (${productPrice} DT each)\n\nProduct ID tested: ${productId}`
    };
    
    await transporter.sendMail(mailOptions);
    
    res.status(200).json({ 
      success: true, 
      message: 'Test product email sent successfully',
      productDetails: {
        id: productId,
        name: productName,
        price: productPrice
      }
    });
  } catch (error) {
    logger.error(`Test product email failed: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});


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
            

            const productDetailsPromises = order.products.map(async (p) => {
              let productName = p.name || 'Unknown Product';
              let productPrice = p.price || 0;
              

              if (p.productId && (!p.name || p.name === 'Unknown Product')) {
                try {
                  logger.info(`Fetching product details for ID: ${p.productId}`);
                  

                  const graphqlQuery = {
                    query: `query { product(id: "${p.productId}") { id name description price stock } }`
                  };
                  

                  logger.info(`Making GraphQL request to ${PRODUCT_SERVICE_URL}/api/graphql with query: ${JSON.stringify(graphqlQuery)}`);
                  
                  const response = await axios.post(`${PRODUCT_SERVICE_URL}/api/graphql`, graphqlQuery);
                  

                  logger.info(`Complete GraphQL response: ${JSON.stringify(response.data)}`);
                  
                  if (response.data && response.data.data && response.data.data.product) {
                    const productData = response.data.data.product;
                    productName = productData.name || 'No name provided';
                    productPrice = productData.price || productPrice;
                    
                    logger.info(`Successfully extracted product info: Name=${productName}, Price=${productPrice}`);
                  } else {
                    logger.warn(`GraphQL response did not contain expected product data structure`);
                  }
                } catch (err) {
                  logger.error(`Error fetching product info for ID ${p.productId}: ${err.message}`);
                  if (err.response) {
                    logger.error(`Status: ${err.response.status}, Data: ${JSON.stringify(err.response.data)}`);
                  } else if (err.request) {
                    logger.error(`No response received. Request: ${JSON.stringify(err.request)}`);
                  } else {
                    logger.error(`Error before sending request: ${err.message}`);
                  }
                }
              }
              

              let line = `• ${productName} x ${p.quantity}`;
              if (productPrice) {
                line += ` (${productPrice} DT each)`;
              }
              return { line, productName, productPrice };
            });
            
            try {

              const productDetailsResults = await Promise.all(productDetailsPromises);
              logger.info(`Resolved product details: ${JSON.stringify(productDetailsResults)}`);
              

              const productDetails = productDetailsResults.map(result => result.line);
              

              const mailOptions = {
                from: `"soa project" <${EMAIL_FROM}>`,
                to: ADMIN_EMAIL,
                subject: "🛒 Nouvelle commande reçue",
                text: `👤 Utilisateur: ${username} (ID: ${order.userId})\n🕒 ${order.timestamp || order.createdAt || new Date().toISOString()}\n\nProduits:\n${productDetails.join('\n')}\n\nTotal: ${order.totalAmount} DT`
              };
              
              await transporter.sendMail(mailOptions);
              logger.info(`Email sent to admin for order ${order._id}`);
            } catch (err) {
              logger.error(`Error processing product details or sending email: ${err.message}`);
            }
          }
        } catch (err) {
          logger.error(`Error processing message: ${err.message}`);
        }
      }
    });
  } catch (error) {
    logger.error(`Kafka consumer error: ${error.message}`);

    setTimeout(startKafkaConsumer, 5000);
  }
};


app.listen(PORT, HOST, () => {
  logger.info(`Notification service listening on ${HOST}:${PORT}`);
  

  transporter.verify()
    .then(() => {
      logger.info('Email connection verified');
    })
    .catch(err => {
      logger.error(`Email connection error: ${err.message}`);
    });
  

  startKafkaConsumer();
});


process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down...');
  process.exit(0);
});
