const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const cors = require('cors');
const typeDefs = require('./graphql/schema');
const resolvers = require('./graphql/resolvers');
const connectDB = require('../db/connection');
const config = require('../config');
const User = require('../auth-service/models');


const app = express();


connectDB();


app.use(cors());
app.use(express.json());


async function startApolloServer() {
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        context: async ({ req }) => {

            const userId = req.headers['user-id'] || null;
            

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


require('../grpc/server');


const PORT = config.services.product.port;
app.listen(PORT, () => {
    console.log(`Product service running on port ${PORT}`);
});

module.exports = app;