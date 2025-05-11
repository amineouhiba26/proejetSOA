const { Kafka } = require('kafkajs');
const logger = require('../utils/logger');
const emailService = require('./email');
const kafkaConfig = require('../config/kafka');
const testKafkaConnection = require('../utils/test-kafka-connection');

// Create Kafka instance with retry configuration
const kafka = new Kafka({
  clientId: kafkaConfig.clientId,
  brokers: kafkaConfig.brokers,
  retry: kafkaConfig.retry
});

const consumer = kafka.consumer({ 
  groupId: kafkaConfig.groupId,
  retry: kafkaConfig.retry
});

// Process Kafka message
const processMessage = async (message) => {
  try {
    const eventData = JSON.parse(message.value.toString());
    logger.info(`Received event: ${eventData.eventType}`);
    
    // Only process order_created events for notifications
    if (eventData.eventType === 'order_created') {
      const order = eventData.order;
      logger.info(`Processing order: ${JSON.stringify(order._id || order.id)}`);
      
      // Send notification email
      await emailService.sendEmail(order);
    }
  } catch (error) {
    logger.error(`Error processing message: ${error.message}`);
  }
};

// Start the Kafka consumer
const run = async () => {
  try {
    logger.info('Connecting to Kafka...');
    await consumer.connect();
    logger.info('Connected to Kafka successfully');
    
    // Subscribe to the configured topic
    await consumer.subscribe({ 
      topic: kafkaConfig.topic, 
      fromBeginning: kafkaConfig.fromBeginning 
    });
    logger.info(`Subscribed to topic: ${kafkaConfig.topic}`);

    // Run the consumer
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        await processMessage(message);
      },
    });
  } catch (error) {
    logger.error(`Error in Kafka consumer: ${error.message}`);
    throw error;
  }
};

// Start the consumer with retry logic
const startConsumer = async () => {
  try {
    // First check if Kafka is available by testing the connection
    const [host, port] = kafkaConfig.brokers[0].split(':');
    const isKafkaAvailable = await testKafkaConnection(host, port);
    
    if (!isKafkaAvailable) {
      logger.error('Kafka is not available. Will retry in 5 seconds...');
      setTimeout(startConsumer, 5000);
      return;
    }
    
    // If Kafka is available, start the consumer
    await run();
  } catch (error) {
    logger.error(`Failed to start Kafka consumer: ${error.message}`);
    // Retry connection after 5 seconds
    logger.info('Will retry connection in 5 seconds...');
    setTimeout(startConsumer, 5000);
  }
};

// Graceful shutdown function
const shutdown = async () => {
  try {
    logger.info('Disconnecting Kafka consumer...');
    await consumer.disconnect();
    logger.info('Kafka consumer disconnected');
  } catch (error) {
    logger.error(`Error disconnecting Kafka consumer: ${error.message}`);
  }
};

module.exports = {
  startConsumer,
  shutdown
};