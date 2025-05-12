const Order = require('./models');
const User = require('../auth-service/models');
const grpcClient = require('../grpc/client');
const kafkaProducer = require('../kafka/producer');


exports.createOrder = async (req, res) => {
    const { products } = req.body;
    const userId = req.headers['user-id'];

    if (!userId || !products || !Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ message: 'Invalid request data' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const productQuantities = products.map(item => ({
            productId: item.productId,
            quantity: item.quantity
        }));

        const stockCheckResult = await grpcClient.checkProductsStock(productQuantities);
        if (!stockCheckResult.available) {
            return res.status(400).json({
                message: 'Some products are unavailable',
                unavailableProducts: stockCheckResult.unavailableProducts
            });
        }

        let orderProducts = [];
        let totalAmount = 0;
        for (const item of products) {
            const product = await grpcClient.getProduct(item.productId);
            orderProducts.push({
                productId: item.productId,
                quantity: item.quantity,
                price: product.price , 
                name: product.name
            });
            totalAmount += product.price * item.quantity;
        }

        const order = new Order({
            userId,
            username: user.username,
            products: orderProducts,
            totalAmount,
            status: 'received'
        });

        await order.save();
        await kafkaProducer.sendOrderEvent('order_created', order);

        res.status(201).json({
            message: 'Order created successfully',
            orderId: order._id,
            username: order.username,
            status: order.status,
            totalAmount: order.totalAmount,
            product: orderProducts.map(p => ({
                productId: p.productId,
                quantity: p.quantity,
                price: p.price,
                name: p.name
            }))
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ message: 'Server error creating order' });
    }
};


exports.getOrdersByUser = async (req, res) => {
    const userId = req.headers['user-id'];

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    try {
        const orders = await Order.find({ userId }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Get user orders error:', error);
        res.status(500).json({ message: 'Server error fetching orders' });
    }
};


exports.getAllOrders = async (req, res) => {
    const userId = req.headers['user-id'];
    const role = req.headers['user-role'];

    if (!userId) return res.status(401).json({ message: 'Authentication required' });

    try {
        const user = await User.findById(userId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized. Admin role required.' });
        }

        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Get all orders error:', error);
        res.status(500).json({ message: 'Server error fetching orders' });
    }
};


exports.getOrderById = async (req, res) => {
    const { id } = req.params;
    const userId = req.headers['user-id'];
    const role = req.headers['user-role'];

    if (!userId) return res.status(400).json({ message: 'User ID is required' });

    try {
        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        if (order.userId.toString() !== userId && role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to view this order' });
        }

        res.json(order);
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ message: 'Server error fetching order' });
    }
};


exports.updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.headers['user-id'];

    if (!userId) return res.status(401).json({ message: 'Authentication required' });

    const validStatuses = ['received', 'confirmed', 'completed', 'denied'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
    }

    try {
        const user = await User.findById(userId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized. Admin role required.' });
        }

        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        order.status = status;
        await order.save();
        await kafkaProducer.sendOrderEvent('order_status_updated', order);

        res.json({
            message: 'Order status updated successfully',
            orderId: order._id,
            status: order.status
        });
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ message: 'Server error updating order status' });
    }
};
