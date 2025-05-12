const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const connectDB = require('../db/connection');
const config = require('../config');
const orderRoutes = require('./routes');
const kafkaProducer = require('../kafka/producer');


const app = express();


connectDB();


kafkaProducer.initKafka();


app.use(cors());
app.use(bodyParser.json());


app.use('/api/orders', orderRoutes);


const PORT = config.services.order.port;
app.listen(PORT, () => {
    console.log(`Order service running on port ${PORT}`);
});

module.exports = app;