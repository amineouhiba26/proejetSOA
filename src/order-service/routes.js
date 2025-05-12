const express = require('express');
const router = express.Router();
const orderController = require('./controllers');


router.post('/', orderController.createOrder);


router.get('/user', orderController.getOrdersByUser);


router.get('/admin/all', orderController.getAllOrders);


router.get('/:id', orderController.getOrderById);


router.patch('/:id/status', orderController.updateOrderStatus);

module.exports = router;
