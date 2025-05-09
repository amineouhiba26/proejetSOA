const express = require('express');
const router = express.Router();
const authController = require('./controllers');

// Register endpoint
router.post('/register', authController.register);

// Login endpoint
router.post('/login', authController.login);

module.exports = router;