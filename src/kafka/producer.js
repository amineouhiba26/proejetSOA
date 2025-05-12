const { Kafka, Partitioners } = require('kafkajs');
const config = require('../config');
const net = require('net');


let isKafkaConnected = false;


const checkKafkaAvailability = () => {
    return new Promise((resolve) => {
        const client = new net.Socket();
        const timeout = 3000; // 3 second timeout
        
        client.setTimeout(timeout);
        
        client.on('connect', () => {
            client.end();
            resolve(true);
        });
        
        client.on('timeout', () => {
            client.destroy();
            console.log('Kafka connection timeout. Will retry in background.');
            resolve(false);
        });
        
        client.on('error', (err) => {
            client.destroy();
            console.log(`Kafka connection error: ${err.message}. Will retry in background.`);
            resolve(false);
        });
        

        const [host, port] = config.kafka.brokers[0].split(':');
        console.log(`Attempting to connect to Kafka at ${host}:${port}`);
        client.connect(parseInt(port), host);
    });
};


const initKafka = async () => {
    const isAvailable = await checkKafkaAvailability();
    
    if (!isAvailable) {
        console.log('Kafka is not available. Running without event streaming.');

        setTimeout(retryKafkaConnection, 5000);
        return;
    }
    
    try {

        const kafka = new Kafka({
            clientId: config.kafka.clientId,
            brokers: config.kafka.brokers
        });
        

        const admin = kafka.admin();
        await admin.connect();
        

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
        

        const producer = kafka.producer({ 
            createPartitioner: Partitioners.LegacyPartitioner 
        });
        await producer.connect();
        
        isKafkaConnected = true;
        console.log('Kafka producer connected successfully');
        

        module.exports.producer = producer;
    } catch (error) {
        console.log('Failed to initialize Kafka producer:', error.message);
        console.log('Running without event streaming. Will retry in background.');
        setTimeout(retryKafkaConnection, 5000);
    }
};


const retryKafkaConnection = async () => {
    console.log('Retrying Kafka producer connection...');
    const isAvailable = await checkKafkaAvailability();
    
    if (isAvailable) {
        try {

            const kafka = new Kafka({
                clientId: config.kafka.clientId,
                brokers: config.kafka.brokers
            });
            

            const admin = kafka.admin();
            await admin.connect();
            

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
            

            const producer = kafka.producer({ 
                createPartitioner: Partitioners.LegacyPartitioner 
            });
            await producer.connect();
            
            isKafkaConnected = true;
            console.log('Kafka producer connected successfully after retry');
            

            module.exports.producer = producer;
        } catch (error) {
            console.log('Failed to initialize Kafka producer after retry:', error.message);
            setTimeout(retryKafkaConnection, 5000);
        }
    } else {
        console.log('Kafka still not available for producer. Will retry again.');
        setTimeout(retryKafkaConnection, 5000);
    }
};


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