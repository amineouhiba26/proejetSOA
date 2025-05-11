const config = {
  port: process.env.PORT || 3004,
  host: process.env.HOST || '0.0.0.0',
  auth_service_url: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  
  kafka: {
    brokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['kafka:9092'],
    topic: process.env.KAFKA_TOPIC || 'order-events',
    groupId: process.env.KAFKA_GROUP_ID || 'notification-service-group',
    fromBeginning: process.env.KAFKA_FROM_BEGINNING === 'true' || false,
    retry: {
      initialRetryTime: 300,
      retries: 10
    }
  },
  
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'soaApp2001@outlook.com',
      pass: process.env.EMAIL_PASSWORD || 'salnamine01',
    },
    from: process.env.EMAIL_FROM || 'soaApp2001@outlook.com',
    admin: process.env.ADMIN_EMAIL || 'amibz2001@gmail.com',
  },
};

module.exports = config;