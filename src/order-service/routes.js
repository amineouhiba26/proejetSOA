const express = require('express');
const router = express.Router();
const orderController = require('./controllers');

// Create a new order
router.post('/', orderController.createOrder);

// Get all orders for current user
router.get('/', orderController.getUserOrders);

// Get all orders (admin only)
router.get('/admin/all', orderController.getAllOrders);

// Get a specific order by ID
router.get('/:id', orderController.getOrderById);

// Update order status (admin only)
router.patch('/:id/status', orderController.updateOrderStatus);

module.exports = router;