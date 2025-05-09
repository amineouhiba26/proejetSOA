const { Kafka } = require('kafkajs');
const config = require('../config');
const net = require('net');

// Check if Kafka is available before attempting to connect
const checkKafkaAvailability = () => {
    return new Promise((resolve) => {
        const client = new net.Socket();
        const timeout = 1000; // 1 second timeout
        
        client.setTimeout(timeout);
        
        client.on('connect', () => {
            client.end();
            resolve(true);
        });
        
        client.on('timeout', () => {
            client.destroy();
            resolve(false);
        });
        
        client.on('error', () => {
            client.destroy();
            resolve(false);
        });
        
        // Parse broker string to get host and port
        const [host, port] = config.kafka.brokers[0].split(':');
        client.connect(parseInt(port), host);
    });
};

// Create Kafka client
const kafka = new Kafka({
    clientId: config.kafka.clientId + '-consumer',
    brokers: config.kafka.brokers
});

// Create consumer
const consumer = kafka.consumer({ groupId: 'order-events-group' });

// Initialize consumer connection
const initConsumer = async () => {
    const isAvailable = await checkKafkaAvailability();
    
    if (!isAvailable) {
        console.log('Kafka is not available. Event consumer disabled.');
        return;
    }
    
    try {
        await consumer.connect();
        console.log('Kafka consumer connected successfully');
        
        // Subscribe to the order events topic
        await consumer.subscribe({ 
            topic: config.kafka.topics.orderEvents,
            fromBeginning: true 
        });
        
        // Set up message handler
        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                try {
                    const eventData = JSON.parse(message.value.toString());
                    console.log(`Received event: ${eventData.eventType}`);
                    console.log(`Order ID: ${eventData.order._id}`);
                    console.log(`Status: ${eventData.order.status}`);
                    
                    // Here you could trigger other actions based on the event
                    // For example, send notifications, update analytics, etc.
                } catch (error) {
                    console.error('Error processing Kafka message:', error.message);
                }
            },
        });
    } catch (error) {
        console.log('Failed to initialize Kafka consumer:', error.message);
    }
};

module.exports = {
    initConsumer
};