const User = require('./models');

// Register a new user
exports.register = async (req, res) => {
    const { username, password } = req.body;
    
    try {
        // Check if user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        // Create new user
        const user = new User({
            username,
            password, // In a real app, you should hash passwords
            role: 'user' // Default role
        });
        
        await user.save();
        
        res.status(201).json({
            message: 'User registered successfully',
            userId: user._id,
            username: user.username,
            role: user.role
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// Login user
exports.login = async (req, res) => {
    const { username, password } = req.body;
    
    try {
        // Find user
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        // Check password (simple comparison for demo purposes)
        if (password !== user.password) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        // Send user info in response
        res.json({
            message: 'Login successful',
            userId: user._id,
            username: user.username,
            role: user.role
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// Create admin user if one doesn't exist
exports.initAdminUser = async () => {
    try {
        const adminExists = await User.findOne({ role: 'admin' });
        if (!adminExists) {
            const admin = new User({
                username: 'admin',
                password: 'admin123', // In a real app, use a strong hashed password
                role: 'admin'
            });
            await admin.save();
            console.log('Admin user created');
        } else {
            console.log('Admin user already exists');
        }
    } catch (error) {
        console.error('Error creating admin user:', error);
    }
};