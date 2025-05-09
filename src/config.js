module.exports = {
    mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce',
    },
    services: {
        auth: {
            port: process.env.AUTH_SERVICE_PORT || 3001,
        },
        product: {
            port: process.env.PRODUCT_SERVICE_PORT || 3002,
        },
        order: {
            port: process.env.ORDER_SERVICE_PORT || 3003,
        },
        gateway: {
            port: process.env.API_GATEWAY_PORT || 3000,
        }
    },
    grpc: {
        port: process.env.GRPC_PORT || 50051,
    },
    kafka: {
        clientId: 'ecommerce-app',
        brokers: ['localhost:9092'],
        topics: {
            orderEvents: 'order-events'
        }
    }
};