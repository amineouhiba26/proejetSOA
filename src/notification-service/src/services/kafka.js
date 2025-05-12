const { Kafka } = require('kafkajs');
const logger = require('../utils/logger');
const emailService = require('./email');
const kafkaConfig = require('../config/kafka');
const testKafkaConnection = require('../utils/test-kafka-connection');


const kafka = new Kafka({
  clientId: kafkaConfig.clientId,
  brokers: kafkaConfig.brokers,
  retry: kafkaConfig.retry
});

const consumer = kafka.consumer({ 
  groupId: kafkaConfig.groupId,
  retry: kafkaConfig.retry
});


const processMessage = async (message) => {
  try {
    const eventData = JSON.parse(message.value.toString());
    logger.info(`Received event: ${eventData.eventType}`);
    

    if (eventData.eventType === 'order_created') {
      const order = eventData.order;
      logger.info(`Processing order: ${JSON.stringify(order._id || order.id)}`);
      

      await emailService.sendEmail(order);
    }
  } catch (error) {
    logger.error(`Error processing message: ${error.message}`);
  }
};


const run = async () => {
  try {
    logger.info('Connecting to Kafka...');
    await consumer.connect();
    logger.info('Connected to Kafka successfully');
    

    await consumer.subscribe({ 
      topic: kafkaConfig.topic, 
      fromBeginning: kafkaConfig.fromBeginning 
    });
    logger.info(`Subscribed to topic: ${kafkaConfig.topic}`);


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


const startConsumer = async () => {
  try {

    const [host, port] = kafkaConfig.brokers[0].split(':');
    const isKafkaAvailable = await testKafkaConnection(host, port);
    
    if (!isKafkaAvailable) {
      logger.error('Kafka is not available. Will retry in 5 seconds...');
      setTimeout(startConsumer, 5000);
      return;
    }
    

    await run();
  } catch (error) {
    logger.error(`Failed to start Kafka consumer: ${error.message}`);

    logger.info('Will retry connection in 5 seconds...');
    setTimeout(startConsumer, 5000);
  }
};


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