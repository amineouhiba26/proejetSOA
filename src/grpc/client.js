const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const config = require('../config');

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

// Create gRPC client
const client = new productService(
    `localhost:${config.grpc.port}`,
    grpc.credentials.createInsecure()
);

// Get product details
const getProduct = (productId) => {
    return new Promise((resolve, reject) => {
        client.getProduct({ id: productId }, (error, response) => {
            if (error) {
                return reject(error);
            }
            resolve(response);
        });
    });
};

// Check if products are in stock
const checkProductsStock = (products) => {
    return new Promise((resolve, reject) => {
        client.checkProductStock({ products }, (error, response) => {
            if (error) {
                return reject(error);
            }
            resolve(response);
        });
    });
};

module.exports = {
    getProduct,
    checkProductsStock
};