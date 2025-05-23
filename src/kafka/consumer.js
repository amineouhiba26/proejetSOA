const { Kafka } = require('kafkajs');
const config = require('../config');
const net = require('net');


const checkKafkaAvailability = () => {
    return new Promise((resolve) => {
        const client = new net.Socket();
        const timeout = 3000; // Increase timeout to 3 seconds
        
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


const kafka = new Kafka({
    clientId: config.kafka.clientId + '-consumer',
    brokers: config.kafka.brokers
});


const consumer = kafka.consumer({ groupId: 'order-events-group' });


const initConsumer = async () => {
    const isAvailable = await checkKafkaAvailability();
    
    if (!isAvailable) {
        console.log('Kafka is not available. Event consumer disabled initially, will retry connection in the background.');

        setTimeout(retryKafkaConnection, 5000);
        return;
    }
    
    try {
        await consumer.connect();
        console.log('Kafka consumer connected successfully');
        

        await consumer.subscribe({ 
            topic: config.kafka.topics.orderEvents,
            fromBeginning: true 
        });
        

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                try {
                    const eventData = JSON.parse(message.value.toString());
                    console.log(`Received event: ${eventData.eventType}`);
                    console.log(`Order ID: ${eventData.order._id}`);
                    console.log(`Status: ${eventData.order.status}`);
                    


                } catch (error) {
                    console.error('Error processing Kafka message:', error.message);
                }
            },
        });
    } catch (error) {
        console.log('Failed to initialize Kafka consumer:', error.message);

        setTimeout(retryKafkaConnection, 5000);
    }
};


const retryKafkaConnection = async () => {
    console.log('Retrying Kafka connection...');
    const isAvailable = await checkKafkaAvailability();
    
    if (isAvailable) {
        try {
            await consumer.connect();
            console.log('Kafka consumer connected successfully after retry');
            
            await consumer.subscribe({ 
                topic: config.kafka.topics.orderEvents,
                fromBeginning: true 
            });
            
            await consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        const eventData = JSON.parse(message.value.toString());
                        console.log(`Received event: ${eventData.eventType}`);
                        console.log(`Order ID: ${eventData.order._id}`);
                        console.log(`Status: ${eventData.order.status}`);
                        

                    } catch (error) {
                        console.error('Error processing Kafka message:', error.message);
                    }
                },
            });
        } catch (error) {
            console.error(`Error connecting to Kafka on retry: ${error.message}`);
            setTimeout(retryKafkaConnection, 5000);
        }
    } else {
        console.log('Kafka still not available. Will retry again.');
        setTimeout(retryKafkaConnection, 5000);
    }
};

module.exports = {
    initConsumer
};