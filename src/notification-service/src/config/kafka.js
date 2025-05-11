const kafka = {
  clientId: 'notification-service',
  brokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['kafka:9092'],
  topic: 'order-events',
  groupId: 'notification-service-group',
  fromBeginning: false,
  retry: {
    initialRetryTime: 300,
    retries: 10
  }
};

module.exports = kafka;