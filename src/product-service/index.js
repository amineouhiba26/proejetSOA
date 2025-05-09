const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const cors = require('cors');
const typeDefs = require('./graphql/schema');
const resolvers = require('./graphql/resolvers');
const connectDB = require('../db/connection');
const config = require('../config');
const User = require('../auth-service/models');

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Setup GraphQL server
async function startApolloServer() {
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        context: async ({ req }) => {
            // Get user ID from headers
            const userId = req.headers['user-id'] || null;
            
            // If we have a userId, fetch user info to get role
            let userRole = null;
            if (userId) {
                try {
                    const user = await User.findById(userId);
                    if (user) {
                        userRole = user.role;
                    }
                } catch (error) {
                    console.error('Error fetching user for context:', error);
                }
            }
            
            return { 
                userId, 
                userRole,
                isAdmin: userRole === 'admin'
            };
        }
    });

    await server.start();
    server.applyMiddleware({ app, path: '/api/graphql' });
    
    console.log(`GraphQL endpoint is available at /api/graphql`);
}

startApolloServer();

// Setup gRPC server for internal product lookup
require('../grpc/server');

// Start server
const PORT = config.services.product.port;
app.listen(PORT, () => {
    console.log(`Product service running on port ${PORT}`);
});

module.exports = app;