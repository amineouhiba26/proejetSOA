const express = require('express');
const router = express.Router();
const orderController = require('./controllers');

// 📦 Create a new order
router.post('/', orderController.createOrder);

// 👤 Get orders of the logged-in user
router.get('/user', orderController.getOrdersByUser);

// 🔒 Admin: Get all orders from all users
router.get('/admin/all', orderController.getAllOrders);

// 📄 Get order by ID (user or admin)
router.get('/:id', orderController.getOrderById);

// ✏️ Admin: Update order status
router.patch('/:id/status', orderController.updateOrderStatus);

module.exports = router;
