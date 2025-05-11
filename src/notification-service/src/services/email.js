const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const EMAIL_SERVICE = process.env.EMAIL_SERVICE || 'mailjet';
const EMAIL_HOST = process.env.EMAIL_HOST || 'in-v3.mailjet.com';
const EMAIL_PORT = process.env.EMAIL_PORT || 587;
const EMAIL_USER = process.env.EMAIL_USER || '018cd022d998484178167bd4e2ed76ae';
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || 'cc2e938b41484c50b9e995fbe1e94882';
const EMAIL_FROM = process.env.EMAIL_FROM || 'amine.ouhiba@polytechnicien.tn';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'amibz2001@gmail.com';

// Create and verify email transporter
const createTransporter = async () => {
    let transporterConfig = {};
    
    if (EMAIL_SERVICE === 'mailjet') {
        // Mailjet configuration
        transporterConfig = {
            host: EMAIL_HOST,
            port: EMAIL_PORT,
            secure: false, // TLS
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASSWORD
            }
        };
        logger.info('Using Mailjet SMTP configuration');
    } else if (EMAIL_SERVICE === 'gmail') {
        // Gmail configuration
        transporterConfig = {
            service: 'gmail',
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASSWORD
            }
        };
        logger.info('Using Gmail configuration');
    } else {
        // Default to Mailjet
        transporterConfig = {
            host: 'in-v3.mailjet.com',
            port: 587,
            secure: false,
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASSWORD
            }
        };
        logger.info(`Unknown service ${EMAIL_SERVICE}, defaulting to Mailjet`);
    }

    const transporter = nodemailer.createTransport(transporterConfig);

    // Verify connection configuration
    try {
        await transporter.verify();
        logger.info('Email transporter verified successfully');
        return transporter;
    } catch (error) {
        logger.error(`Email transporter verification failed: ${error.message}`);
        throw error;
    }
};

// Initialize the transporter (will be used as a singleton)
let transporter = null;

const initializeTransporter = async () => {
    if (!transporter) {
        try {
            transporter = await createTransporter();
        } catch (error) {
            logger.error('Failed to initialize email transporter');
            // We'll retry later when sending emails
        }
    }
    return transporter;
};

const sendEmail = async (order) => {
    if (!transporter) {
        try {
            transporter = await createTransporter();
        } catch (error) {
            logger.error(`Cannot send email - transporter initialization failed: ${error.message}`);
            return;
        }
    }

    try {
        // Format the order data for the email
        const productDetails = order.products 
            ? order.products.map(p => `• ${p.name || p.productId} x ${p.quantity}`).join('\n')
            : 'No products';

        const mailOptions = {
            from: `"soa project" <${EMAIL_FROM}>`,
            to: ADMIN_EMAIL,
            subject: '🛒 Nouvelle commande reçue',
            text: `👤 Utilisateur: ${order.username || 'Inconnu'} (ID: ${order.userId})\n🕒 ${order.timestamp || order.createdAt || new Date().toISOString()}\n\nProduits:\n${productDetails}\n\nTotal: ${order.totalAmount} DT`
        };

        await transporter.sendMail(mailOptions);
        logger.info(`Email sent successfully to ${ADMIN_EMAIL}`);
    } catch (error) {
        logger.error(`Error sending email: ${error.message}`);
        
        // If the error is authentication-related, try to reinitialize the transporter
        if (error.message.includes('auth') || error.message.includes('credentials')) {
            logger.info('Trying to reinitialize email transporter due to auth error');
            transporter = null;
        }
    }
};

module.exports = { 
    sendEmail,
    initializeTransporter
};