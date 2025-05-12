const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const connectDB = require('../db/connection');
const config = require('../config');
const authRoutes = require('./routes');
const authController = require('./controllers');


const app = express();


connectDB();


app.use(cors());
app.use(bodyParser.json());


app.use('/api/auth', authRoutes);


authController.initAdminUser();


const PORT = config.services.auth.port;
app.listen(PORT, () => {
    console.log(`Auth service running on port ${PORT}`);
});

module.exports = app;