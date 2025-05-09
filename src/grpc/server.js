const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const config = require('../config');
const Product = require('../product-service/models');

// Load proto file
const PROTO_PATH = path.join(__dirname, 'proto/product.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const productService = protoDescriptor.ecommerce.ProductService;

// Implement the gRPC service methods
const getProduct = async (call, callback) => {
    try {
        const productId = call.request.id;
        const product = await Product.findById(productId);
        
        if (!product) {
            return callback({
                code: grpc.status.NOT_FOUND,
                message: 'Product not found'
            });
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
        callback({
            code: grpc.status.INTERNAL,
            message: 'Internal server error'
        });
    }
};

const checkProductStock = async (call, callback) => {
    try {
        const productQuantities = call.request.products;
        const unavailableProducts = [];
        let allAvailable = true;
        
        // Check each product's stock
        for (const item of productQuantities) {
            const product = await Product.findById(item.productId);
            
            if (!product) {
                unavailableProducts.push({
                    productId: item.productId,
                    name: 'Unknown Product',
                    availableQuantity: 0,
                    requestedQuantity: item.quantity
                });
                allAvailable = false;
                continue;
            }
            
            if (product.stock < item.quantity) {
                unavailableProducts.push({
                    productId: item.productId,
                    name: product.name,
                    availableQuantity: product.stock,
                    requestedQuantity: item.quantity
                });
                allAvailable = false;
            }
        }
        
        callback(null, {
            available: allAvailable,
            unavailableProducts: unavailableProducts
        });
    } catch (error) {
        console.error('gRPC checkProductStock error:', error);
        callback({
            code: grpc.status.INTERNAL,
            message: 'Internal server error'
        });
    }
};

// Create gRPC server
const server = new grpc.Server();
server.addService(productService.service, {
    getProduct,
    checkProductStock
});

// Start gRPC server
const startGrpcServer = () => {
    server.bindAsync(
        `0.0.0.0:${config.grpc.port}`,
        grpc.ServerCredentials.createInsecure(),
        (err, port) => {
            if (err) {
                console.error('Error starting gRPC server:', err);
                return;
            }
            server.start();
            console.log(`gRPC server running on port ${port}`);
        }
    );
};

startGrpcServer();

module.exports = {
    server
};