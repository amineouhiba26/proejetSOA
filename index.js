const config = require('./src/config');


const startServices = async () => {

    require('./src/auth-service');
    console.log(`Auth service started on port ${config.services.auth.port}`);
    

    require('./src/product-service');
    console.log(`Product service started on port ${config.services.product.port}`);
    console.log(`gRPC server started on port ${config.grpc.port}`);
    

    require('./src/order-service');
    console.log(`Order service started on port ${config.services.order.port}`);
    

    require('./src/api-gateway');
    console.log(`API Gateway started on port ${config.services.gateway.port}`);
    
    console.log(`
    =======================================================
    🚀 E-commerce Backend is now running!
    =======================================================
    
    Access the API Gateway at: http://localhost:${config.services.gateway.port}
    
    Available endpoints:
    - Auth: 
        POST /api/auth/register - Register a new user
        POST /api/auth/login - Login with username/password
        
    - GraphQL: 
        POST /api/graphql - GraphQL endpoint for product management
        
    - Orders: 
        GET /api/orders - Get all orders for current user
        GET /api/orders/:id - Get a specific order
        POST /api/orders - Create a new order
        PATCH /api/orders/:id/status - Update order status (admin only)
        
    Default Admin:
        username: admin
        password: admin123
    `);
};


const updatePackageJson = () => {
    const fs = require('fs');
    const path = require('path');
    const packageJsonPath = path.join(__dirname, 'package.json');
    
    try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        packageJson.scripts = {
            ...packageJson.scripts,
            start: 'node index.js',
            dev: 'nodemon index.js'
        };
        
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        console.log('Updated package.json with start scripts');
    } catch (error) {
        console.error('Error updating package.json:', error);
    }
};

updatePackageJson();
startServices();