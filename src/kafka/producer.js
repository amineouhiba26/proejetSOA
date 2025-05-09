const { Kafka, Partitioners } = require('kafkajs');
const config = require('../config');
const net = require('net');

// Flag to track Kafka availability
let isKafkaConnected = false;

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

// Create Kafka producer if Kafka is available
const initKafka = async () => {
    const isAvailable = await checkKafkaAvailability();
    
    if (!isAvailable) {
        console.log('Kafka is not available. Running without event streaming.');
        return;
    }
    
    try {
        // Create Kafka client
        const kafka = new Kafka({
            clientId: config.kafka.clientId,
            brokers: config.kafka.brokers
        });
        
        // Create admin client to ensure topics exist
        const admin = kafka.admin();
        await admin.connect();
        
        // Create topics if they don't exist
        const existingTopics = await admin.listTopics();
        
        if (!existingTopics.includes(config.kafka.topics.orderEvents)) {
            await admin.createTopics({
                topics: [
                    { 
                        topic: config.kafka.topics.orderEvents,
                        numPartitions: 1,
                        replicationFactor: 1
                    }
                ]
            });
            console.log(`Created Kafka topic: ${config.kafka.topics.orderEvents}`);
        }
        
        await admin.disconnect();
        
        // Create producer with legacy partitioner to avoid warning
        const producer = kafka.producer({ 
            createPartitioner: Partitioners.LegacyPartitioner 
        });
        await producer.connect();
        
        isKafkaConnected = true;
        console.log('Kafka producer connected successfully');
        
        // Attach the producer to module.exports
        module.exports.producer = producer;
    } catch (error) {
        console.log('Failed to initialize Kafka producer:', error.message);
        console.log('Running without event streaming.');
    }
};

// Send order event
const sendOrderEvent = async (eventType, orderData) => {
    if (!isKafkaConnected) {
        console.log(`[Kafka Disabled] Would have sent ${eventType} event for order ${orderData._id}`);
        return;
    }
    
    try {
        await module.exports.producer.send({
            topic: config.kafka.topics.orderEvents,
            messages: [
                {
                    key: orderData._id.toString(),
                    value: JSON.stringify({
                        eventType,
                        timestamp: new Date().toISOString(),
                        order: orderData
                    })
                }
            ]
        });
        console.log(`Order event ${eventType} sent to Kafka`);
    } catch (error) {
        console.error('Error sending order event to Kafka:', error.message);
    }
};

module.exports = {
    initKafka,
    sendOrderEvent,
    producer: null
};