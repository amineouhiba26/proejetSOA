# E-Commerce Microservices Platform

A modern e-commerce platform built with a Service-Oriented Architecture (SOA) using Node.js, Express, MongoDB, gRPC, and Kafka.

## Architecture Overview

This project demonstrates a microservices architecture for an e-commerce platform with the following components:

- **API Gateway**: Entry point for all client requests
- **Auth Service**: User authentication and authorization
- **Product Service**: Product catalog management with GraphQL
- **Order Service**: Order processing and management
- **Shared Infrastructure**: MongoDB, Kafka, and gRPC

![Architecture Diagram](https://mermaid.ink/img/pako:eNqFksFuwjAMhl_FyoUDEwMKcEJaW8QDrNIkDj0k9WJNaSMnVaWqvPt8QLC1HbZLnPj_v9-Jc8LaKQwRbRZpC1hQYmWsLWTFGIe11dn-_W2NmXJccoPIhGOlYeP4DQpjQXjgVgHHpPAGtFPzVhm7R_0LdO2E-UbsRNtEOq-iiKRJ7xbpRFqNrDGMUJSsqIKXMPJwb-Np9mZUQk0fUH-CsuR7rXI0GZcobMD2RiVcZVQXbB7B4FJAcO9nUxYFmBISvvmL-1a7Xuf0aHTtLEcYPkLTSq8XvFSiU5tJA1pRzjZKVsQPMx-gG4CuYbYFDNrD4b1WXfZUNQN71jYt8vLmvWV18VtbjPIjzkgVbVOB2BunAx2OKiYmtixoSmk3mKy5cEHfFfWULDHGXu7VEH_RlZilZTVF-BkdP6axxiicYrSQP29j3WY?type=png)

## Key Technologies

- **Node.js & Express**: Backend services
- **MongoDB**: Database for persistent storage
- **Kafka**: Event streaming for asynchronous communication
- **gRPC**: High-performance RPC for service-to-service communication
- **GraphQL**: API for product service
- **Docker**: Containerization for services

## Services Details

### API Gateway

The API Gateway acts as the entry point for all client requests and routes them to the appropriate microservices.

**Key Features:**
- Request routing to microservices
- Consistent interface for clients
- Proxying requests to appropriate services

**Implementation:**
- Express router with HTTP proxy
- Kafka consumer for event processing
- Environment-based service discovery

### Auth Service

Handles user authentication and authorization.

**Key Features:**
- User registration
- User login
- Role-based authorization

**Implementation:**
- REST API with Express
- MongoDB for user data storage
- Simple password-based authentication (in a production environment, would use JWT and password hashing)

### Product Service

Manages the product catalog with a GraphQL API.

**Key Features:**
- Product CRUD operations
- Stock management
- GraphQL API for flexible queries

**Implementation:**
- Apollo Server for GraphQL
- MongoDB for product storage
- gRPC server for internal service-to-service communication

### Order Service

Processes and manages customer orders.

**Key Features:**
- Order creation
- Order status management
- Stock verification

**Implementation:**
- REST API with Express
- gRPC client for communication with Product Service
- Kafka producer for order events
- MongoDB for order storage

## Communication Patterns

### Synchronous Communication (gRPC)

gRPC is used for direct service-to-service communication where immediate responses are required, providing high-performance, binary serialization, and strong typing through Protocol Buffers.

**Implementation Details:**

1. **Protocol Buffers Definition** (`src/grpc/proto/product.proto`):
```proto
syntax = "proto3";

service ProductService {
  rpc GetProduct(ProductRequest) returns (ProductResponse) {}
  rpc CreateProduct(CreateProductRequest) returns (ProductResponse) {}
  rpc CheckProductStock(StockCheckRequest) returns (StockCheckResponse) {}
}

message ProductRequest {
  string id = 1;
}

message CreateProductRequest {
  string name = 1;
  string description = 2;
  double price = 3;
  int32 stock = 4;
}

message ProductResponse {
  string id = 1;
  string name = 2;
  string description = 3;
  double price = 4;
  int32 stock = 5;
}

message StockCheckRequest {
  repeated ProductQuantity products = 1;
}

message ProductQuantity {
  string productId = 1;
  int32 quantity = 2;
}

message StockCheckResponse {
  bool available = 1;
  repeated string unavailableProducts = 2;
}
```

2. **Server Implementation** (`src/grpc/server.js` in Product Service):
```javascript
// Initialize gRPC server
const server = new grpc.Server();
const productProtoPath = path.resolve(__dirname, 'proto/product.proto');
const productProto = protoLoader.loadSync(productProtoPath);
const productDefinition = grpc.loadPackageDefinition(productProto).ProductService;

// Implement gRPC methods
const getProduct = async (call, callback) => {
    try {
        const productId = call.request.id;
        const product = await Product.findById(productId);
        if (!product) {
            return callback({ code: grpc.status.NOT_FOUND, message: 'Product not found' });
        }
        callback(null, {
            id: product._id.toString(),
            name: product.name,
            description: product.description,
            price: product.price,
            stock: product.stock
        });
    } catch (error) {
        console.error('gRPC getProduct error:', error);
        callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
    }
};

// Add service to server
server.addService(productDefinition.service, {
    getProduct,
    createProduct,
    checkProductStock
});

// Start server
server.bindAsync(`0.0.0.0:${config.grpc.port}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        console.error('Failed to start gRPC server:', err);
        return;
    }
    console.log(`gRPC server running on port ${port}`);
    server.start();
});
```

3. **Client Usage** (`src/grpc/client.js` in Order Service):
```javascript
// Initialize gRPC client
const client = (() => {
    const productProtoPath = path.resolve(__dirname, '../grpc/proto/product.proto');
    const productProto = protoLoader.loadSync(productProtoPath);
    const productDefinition = grpc.loadPackageDefinition(productProto).ProductService;
    
    // Using container name in Docker environment or localhost for development
    const host = process.env.PRODUCT_SERVICE_URL 
        ? process.env.PRODUCT_SERVICE_URL.replace('http://', '') 
        : `localhost:${config.grpc.port}`;
        
    return new productDefinition(host, grpc.credentials.createInsecure());
})();

// Promisify gRPC methods for easier usage with async/await
const getProduct = (id) => {
    return new Promise((resolve, reject) => {
        client.getProduct({ id }, (err, response) => {
            if (err) return reject(err);
            resolve(response);
        });
    });
};

// Check stock availability when creating an order
const checkProductsStock = async (productQuantities) => {
    try {
        const stockCheckResult = await new Promise((resolve, reject) => {
            client.checkProductStock({ products: productQuantities }, (err, response) => {
                if (err) return reject(err);
                resolve(response);
            });
        });
        
        if (!stockCheckResult.available) {
            return {
                success: false,
                message: 'Some products are unavailable',
                unavailableProducts: stockCheckResult.unavailableProducts
            };
        }
        return { success: true };
    } catch (error) {
        console.error('Error checking product stock:', error);
        throw new Error('Failed to check product availability');
    }
};
```

### Asynchronous Communication (Kafka)

Kafka is used for event-driven communication, especially for broadcasting events that multiple services might be interested in. Our implementation focuses on reliability with robust retry mechanisms.

**Implementation Details:**

1. **Kafka Producer** (`src/kafka/producer.js`):
```javascript
const { Kafka } = require('kafkajs');

class KafkaProducer {
    constructor(brokers = ['kafka:9092'], clientId = 'api-gateway') {
        this.kafka = new Kafka({
            clientId,
            brokers: Array.isArray(brokers) ? brokers : [brokers],
            connectionTimeout: 3000, // Increased timeout for better reliability
            retry: {
                initialRetryTime: 100,
                retries: 8
            }
        });
        
        this.producer = this.kafka.producer();
        this.isConnected = false;
        this.connectionPromise = null;
    }

    async connect() {
        if (this.isConnected) return;
        
        if (this.connectionPromise) {
            return this.connectionPromise;
        }
        
        this.connectionPromise = new Promise(async (resolve, reject) => {
            try {
                console.log('Connecting to Kafka producer...');
                await this.producer.connect();
                this.isConnected = true;
                console.log('Kafka producer connected successfully');
                resolve();
            } catch (error) {
                console.error('Error connecting to Kafka producer:', error.message);
                this.isConnected = false;
                this.connectionPromise = null;
                
                // Set up background reconnection
                setTimeout(() => {
                    console.log('Attempting to reconnect Kafka producer...');
                    this.connect().catch(e => console.error('Reconnection failed:', e.message));
                }, 5000);
                
                reject(error);
            }
        });
        
        return this.connectionPromise;
    }

    async sendMessage(topic, message, key = null) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            
            const messageValue = typeof message === 'string' 
                ? message 
                : JSON.stringify(message);
                
            await this.producer.send({
                topic,
                messages: [
                    {
                        key: key ? key.toString() : null,
                        value: messageValue
                    }
                ]
            });
            
            console.log(`Message sent to topic ${topic} successfully`);
            return true;
        } catch (error) {
            console.error(`Error sending message to topic ${topic}:`, error.message);
            this.isConnected = false;
            throw error;
        }
    }

    async sendOrderEvent(eventType, orderData) {
        const event = {
            eventType,
            timestamp: new Date().toISOString(),
            payload: orderData
        };
        
        return this.sendMessage('order-events', event, orderData._id);
    }

    async disconnect() {
        if (this.isConnected) {
            await this.producer.disconnect();
            this.isConnected = false;
            console.log('Kafka producer disconnected');
        }
    }
}

module.exports = KafkaProducer;
```

2. **Kafka Consumer** (`src/kafka/consumer.js`):
```javascript
const { Kafka } = require('kafkajs');

class KafkaConsumer {
    constructor(brokers = ['kafka:9092'], groupId = 'api-gateway-group', clientId = 'api-gateway-consumer') {
        this.kafka = new Kafka({
            clientId,
            brokers: Array.isArray(brokers) ? brokers : [brokers],
            connectionTimeout: 3000, // Increased timeout
            retry: {
                initialRetryTime: 300,
                retries: 10
            }
        });
        
        this.consumer = this.kafka.consumer({ groupId });
        this.isConnected = false;
        this.connectionPromise = null;
    }

    async connect() {
        if (this.isConnected) return;
        
        if (this.connectionPromise) {
            return this.connectionPromise;
        }
        
        this.connectionPromise = new Promise(async (resolve, reject) => {
            try {
                console.log('Connecting to Kafka consumer...');
                await this.consumer.connect();
                this.isConnected = true;
                console.log('Kafka consumer connected successfully');
                resolve();
            } catch (error) {
                console.error('Error connecting to Kafka consumer:', error.message);
                this.isConnected = false;
                this.connectionPromise = null;
                
                // Set up background reconnection
                setTimeout(() => {
                    console.log('Attempting to reconnect Kafka consumer...');
                    this.connect().catch(e => console.error('Reconnection failed:', e.message));
                }, 5000);
                
                reject(error);
            }
        });
        
        return this.connectionPromise;
    }

    async subscribe(topics) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            
            // Subscribe to the topics
            const topicsArray = Array.isArray(topics) ? topics : [topics];
            
            for (const topic of topicsArray) {
                await this.consumer.subscribe({ topic, fromBeginning: true });
                console.log(`Subscribed to topic: ${topic}`);
            }
            
            return true;
        } catch (error) {
            console.error('Error subscribing to topics:', error.message);
            this.isConnected = false;
            throw error;
        }
    }

    async run(config) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            
            await this.consumer.run({
                partitionsConsumedConcurrently: 3,
                ...config
            });
            
            return true;
        } catch (error) {
            console.error('Error running consumer:', error.message);
            this.isConnected = false;
            throw error;
        }
    }

    async disconnect() {
        if (this.isConnected) {
            await this.consumer.disconnect();
            this.isConnected = false;
            console.log('Kafka consumer disconnected');
        }
    }
}

module.exports = KafkaConsumer;
```

3. **Usage in Services**:

In Order Service (`src/order-service/controllers.js`):
```javascript
// When order is created
const createOrder = async (req, res) => {
    try {
        // Validate the order data
        if (!req.body.products || !Array.isArray(req.body.products)) {
            return res.status(400).json({ message: 'Products array is required' });
        }
        
        // Create and save the order
        const order = new Order({
            user: req.headers['user-id'] || 'anonymous',
            products: req.body.products,
            status: 'pending'
        });
        
        await order.save();
        
        // Publish order created event to Kafka
        try {
            await kafkaProducer.sendOrderEvent('order_created', order.toJSON());
        } catch (kafkaError) {
            console.error('Failed to publish order event to Kafka:', kafkaError);
            // Continue processing even if Kafka fails (graceful degradation)
        }
        
        return res.status(201).json({
            message: 'Order created successfully',
            orderId: order._id
        });
    } catch (error) {
        console.error('Error creating order:', error);
        return res.status(500).json({ message: 'Error creating order' });
    }
};
```

In API Gateway (`src/api-gateway/index.js`):
```javascript
// Initialize Kafka consumer for order events
const initOrderEventsConsumer = async () => {
    try {
        const consumer = new KafkaConsumer(
            process.env.KAFKA_BROKERS || 'kafka:9092',
            'api-gateway-order-group'
        );
        
        await consumer.connect();
        await consumer.subscribe('order-events');
        
        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                try {
                    const eventData = JSON.parse(message.value.toString());
                    console.log(`Received order event: ${eventData.eventType}`);
                    
                    // Process different event types
                    switch (eventData.eventType) {
                        case 'order_created':
                            // Notify relevant systems about new order
                            emitSocketEvent('new_order', eventData.payload);
                            break;
                            
                        case 'order_status_changed':
                            // Update UI for relevant users
                            emitSocketEvent('order_updated', eventData.payload);
                            break;
                            
                        default:
                            console.log(`Unknown event type: ${eventData.eventType}`);
                    }
                } catch (error) {
                    console.error('Error processing order event:', error);
                }
            }
        });
        
        console.log('Order events consumer started successfully');
    } catch (error) {
        console.error('Failed to initialize order events consumer:', error);
        // Attempt to reconnect after delay
        setTimeout(initOrderEventsConsumer, 10000);
    }
};

// Initialize Kafka consumer when the application starts
initOrderEventsConsumer();
```

4. **Docker Configuration for Kafka** (in `docker-compose.yml`):
```yaml
  zookeeper:
    image: wurstmeister/zookeeper
    ports:
      - "2181:2181"
    networks:
      - app-network

  kafka:
    image: wurstmeister/kafka
    ports:
      - "9092:9092"
    environment:
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_CREATE_TOPICS: "order-events:1:1,inventory-events:1:1"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on:
      - zookeeper
    networks:
      - app-network
```

5. **Troubleshooting Kafka Connectivity**:

Key issues we resolved:
- Updated Kafka advertised listeners from `localhost:9092` to `kafka:9092` in Docker environment
- Added retry mechanisms with progressive backoff
- Implemented background reconnection for failed connections
- Added KAFKA_BROKERS environment variable to services
- Increased connection timeouts for better reliability in containerized environment

## Setup and Running

### Prerequisites

- Docker and Docker Compose
- Node.js (for local development)
- MongoDB (automatically set up with Docker Compose)

### Environment Setup and Configuration

The project uses environment variables for service discovery and configuration in Docker containers. These are critical for proper inter-service communication:

**API Gateway Environment Variables**:
```
AUTH_SERVICE_URL=http://auth-service:3001
PRODUCT_SERVICE_URL=http://product-service:3002
ORDER_SERVICE_URL=http://order-service:3003
KAFKA_BROKERS=kafka:9092
```

**Service Environment Variables**:
```
MONGO_URI=mongodb://mongodb:27017/microservices
KAFKA_BROKERS=kafka:9092
```

**Docker Compose Configuration** (`docker-compose.yml`):
```yaml
version: '3'

services:
  api-gateway:
    build:
      context: .
      dockerfile: ./src/api-gateway/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - AUTH_SERVICE_URL=http://auth-service:3001
      - PRODUCT_SERVICE_URL=http://product-service:3002
      - ORDER_SERVICE_URL=http://order-service:3003
      - KAFKA_BROKERS=kafka:9092
    depends_on:
      - auth-service
      - product-service
      - order-service
      - kafka
    networks:
      - app-network

  auth-service:
    build:
      context: .
      dockerfile: ./src/auth-service/Dockerfile
    environment:
      - MONGO_URI=mongodb://mongodb:27017/microservices
    depends_on:
      - mongodb
    networks:
      - app-network

  product-service:
    build:
      context: .
      dockerfile: ./src/product-service/Dockerfile
    environment:
      - MONGO_URI=mongodb://mongodb:27017/microservices
    depends_on:
      - mongodb
    networks:
      - app-network

  order-service:
    build:
      context: .
      dockerfile: ./src/order-service/Dockerfile
    environment:
      - MONGO_URI=mongodb://mongodb:27017/microservices
      - KAFKA_BROKERS=kafka:9092
      - PRODUCT_SERVICE_URL=product-service:50051
    depends_on:
      - mongodb
      - kafka
      - product-service
    networks:
      - app-network

  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    networks:
      - app-network

  zookeeper:
    image: wurstmeister/zookeeper
    ports:
      - "2181:2181"
    networks:
      - app-network

  kafka:
    image: wurstmeister/kafka
    ports:
      - "9092:9092"
    environment:
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_CREATE_TOPICS: "order-events:1:1,inventory-events:1:1"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on:
      - zookeeper
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  mongodb_data:
```

**Key Configuration Points**:

1. **Service URLs**: Each service URL points to the container name, not localhost, which is crucial in Docker networking
2. **Kafka Configuration**: `KAFKA_ADVERTISED_LISTENERS` set to `kafka:9092` for container-based connectivity
3. **Network Configuration**: All services on the same `app-network` for discovery
4. **Dependencies**: Services wait for their dependencies using `depends_on`
5. **Volume Configuration**: MongoDB data persists between container restarts

### Running with Docker Compose

1. Clone the repository:
```bash
git clone <repository-url>
cd projet-SOA
```

2. Start the services:
```bash
docker-compose up -d
```

3. Access the services:
   - API Gateway: http://localhost:3000
   - Auth Service: http://localhost:3001
   - Product Service (GraphQL): http://localhost:3002/api/graphql
   - Order Service: http://localhost:3003

### Running Locally for Development

1. Install dependencies:
```bash
npm install
```

2. Start MongoDB and Kafka (using Docker):
```bash
docker-compose up -d mongodb kafka zookeeper
```

3. Start the services individually:
```bash
# Start Auth Service
node src/auth-service/index.js

# Start Product Service
node src/product-service/index.js

# Start Order Service
node src/order-service/index.js

# Start API Gateway
node src/api-gateway/index.js
```

## API Documentation

### Auth Service

**Register User:**
```
POST /api/auth/register
Body: { "username": "user1", "password": "password123" }
```

**Login:**
```
POST /api/auth/login
Body: { "username": "user1", "password": "password123" }
```

### Product Service (GraphQL)

**Query Products:**
```graphql
{
  products {
    id
    name
    price
    description
    stock
  }
}
```

**Create Product (Admin):**
```graphql
mutation {
  createProduct(
    name: "Product Name",
    price: 29.99,
    description: "Product description",
    stock: 100
  ) {
    id
    name
    price
  }
}
```

### Order Service

**Create Order:**
```
POST /api/orders
Headers: { "user-id": "user_id_here" }
Body: { "products": [{ "productId": "product_id_here", "quantity": 2 }] }
```

**Get User Orders:**
```
GET /api/orders/user
Headers: { "user-id": "user_id_here" }
```

## Troubleshooting

### Common Issues and Solutions

#### 1. API Gateway Cannot Connect to Microservices

**Symptoms**:
- 500 errors from the API Gateway
- "Connection refused" errors in logs
- Timeouts when attempting to access services

**Solutions**:
- Ensure that service container names match the environment variables in the API Gateway (`AUTH_SERVICE_URL`, `PRODUCT_SERVICE_URL`, etc.)
- Check that URLs are properly formatted with `http://` prefix (our helper function handles this)
- Make sure all services are on the same Docker network
- Verify that the services are actually running with `docker-compose ps`

**Code Fix Example**:
```javascript
// Helper function to properly format URLs
const formatProxyUrl = (url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url.replace(/\/$/, ''); // Remove trailing slash if exists
    }
    return `http://${url}`;
};

// Proxy request to the appropriate service
app.use('/api/auth', (req, res) => {
    createProxyMiddleware({
        target: formatProxyUrl(AUTH_SERVICE_URL),
        changeOrigin: true,
        pathRewrite: {
            '^/api/auth': '/api', // Rewrite path
        },
    })(req, res);
});
```

#### 2. Kafka Connection Issues

**Symptoms**:
- "Failed to connect to Kafka" errors in logs
- Events not being published or consumed
- Service reconnection loops

**Solutions**:
- Ensure `KAFKA_ADVERTISED_LISTENERS` is set to `PLAINTEXT://kafka:9092` in `docker-compose.yml`
- Make sure all services have the correct `KAFKA_BROKERS` environment variable
- Wait for Kafka and Zookeeper to fully initialize before dependent services
- Implement robust retry and reconnection logic in Kafka clients

**Code Fix Example**:
```javascript
// In Kafka producer.js
constructor(brokers = ['kafka:9092'], clientId = 'api-gateway') {
    this.kafka = new Kafka({
        clientId,
        brokers: Array.isArray(brokers) ? brokers : [brokers],
        connectionTimeout: 3000, // Increased from default
        retry: {
            initialRetryTime: 100,
            retries: 8
        }
    });
    
    // Set up background reconnection after failed connection
    setTimeout(() => {
        console.log('Attempting to reconnect Kafka producer...');
        this.connect().catch(e => console.error('Reconnection failed:', e.message));
    }, 5000);
}
```

#### 3. gRPC Connection Issues

**Symptoms**:
- "Failed to connect to gRPC server" errors
- Order service failing to communicate with product service
- Product availability checks failing

**Solutions**:
- Check that the gRPC server is properly initialized and running
- Ensure the Product Service container exposes the gRPC port
- Make sure the client is using the correct service hostname (container name)
- Verify proto files are consistent between client and server

**Code Fix Example**:
```javascript
// In gRPC client.js
const host = process.env.PRODUCT_SERVICE_URL 
    ? process.env.PRODUCT_SERVICE_URL.replace('http://', '').split(':')[0] + ':50051'
    : `localhost:${config.grpc.port}`;
    
return new productDefinition(host, grpc.credentials.createInsecure());
```

#### 4. MongoDB Connection Issues

**Symptoms**:
- Services failing to start
- Database connection errors in logs
- Timeout errors when attempting DB operations

**Solutions**:
- Verify that the MongoDB container is running
- Check that the connection string uses the container name (`mongodb://mongodb:27017/microservices`)
- Add retry logic for MongoDB connections

**Code Fix Example**:
```javascript
// MongoDB connection with retry logic
const connectWithRetry = async (retries = 5, delay = 5000) => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://mongodb:27017/microservices');
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Failed to connect to MongoDB', error);
        
        if (retries > 0) {
            console.log(`Retrying in ${delay/1000} seconds...`);
            setTimeout(() => connectWithRetry(retries - 1, delay), delay);
        }
    }
};

connectWithRetry();
```

### Debugging Tips

1. **Check Container Logs**:
   ```bash
   docker-compose logs api-gateway
   docker-compose logs kafka
   ```

2. **Inspect Container Networks**:
   ```bash
   docker network inspect projet-soa_app-network
   ```

3. **Enter Running Containers**:
   ```bash
   docker-compose exec api-gateway sh
   # Then test connectivity to other services
   wget -O- http://auth-service:3001/healthcheck
   ```

4. **Verify Kafka Topics**:
   ```bash
   docker-compose exec kafka kafka-topics.sh --list --bootstrap-server kafka:9092
   ```

5. **Check Environment Variables**:
   ```bash
   docker-compose exec api-gateway env | grep SERVICE
   ```

## Architecture Benefits

1. **Scalability**: Services can be scaled independently based on load
2. **Resilience**: Failure in one service doesn't affect others
3. **Technology Diversity**: Each service can use the most appropriate technology
4. **Development Agility**: Teams can develop and deploy services independently
5. **Performance**: Efficient communication patterns for different requirements
   - gRPC for high-performance, low-latency synchronous calls
   - Kafka for reliable async event processing

## Future Improvements

Based on our experience with this system, here are recommended improvements for production readiness:

1. **Health Checks and Service Discovery**
   - Implement health check endpoints in all services
   - Add readiness/liveness probes for Kubernetes deployment
   - Implement service discovery with Consul or etcd

2. **Security Enhancements**
   - Add JWT authentication with proper token validation
   - Implement role-based access control (RBAC)
   - Add TLS/SSL for all service communication
   - Secure Kafka with authentication and authorization

3. **Observability**
   - Implement distributed tracing with Jaeger or Zipkin
   - Add structured logging with correlation IDs
   - Implement metrics collection with Prometheus
   - Create Grafana dashboards for monitoring

4. **Resilience**
   - Implement circuit breakers with Hystrix or resilience4j
   - Add retry mechanisms with exponential backoff
   - Implement rate limiting and throttling
   - Add graceful degradation for all dependencies

5. **CI/CD Pipeline**
   - Automated testing for each microservice
   - Integration tests across services
   - Automated deployment with blue/green strategy
   - Container scanning and security checks

## Contributing

Guidelines for contributing to this project:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
