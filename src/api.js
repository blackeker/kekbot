const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { initializeDatabase } = require('./services/databaseService');
const authMiddleware = require('./middleware/authMiddleware');
const { info, error, initLogger } = require('./utils/logger');

// Init Logger Hooks
initLogger();

// Routes
const authRoutes = require('./routes/authRoutes');
const botRoutes = require('./routes/botRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const spamRoutes = require('./routes/spamRoutes');

function createApiServer() {
    const app = express();
    const API_PORT = process.env.PORT || 3000;

    // Database Initialization
    try {
        initializeDatabase();
        info('SQLite database initialized.');
    } catch (e) {
        error(`CRITICAL: Database init failed: ${e.message}`);
        process.exit(1);
    }

    // Middleware
    app.use(helmet());
    app.use(compression());
    app.use(cors());
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ limit: '10mb', extended: true }));
    // app.use(morgan('combined')); // Logging disabled per user request

    // Rate Limiting
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => {
            // API Key veya Token varsa limit uygulama
            return req.headers.authorization || req.headers['x-api-key'];
        }
    });
    app.use('/api', limiter);

    // Public Routes
    app.use('/api', authRoutes);

    // Protected Routes
    app.use('/api/bot', authMiddleware, botRoutes);
    app.use('/api/settings', authMiddleware, settingsRoutes);

    // 404 Handler
    app.use((req, res) => {
        res.status(404).json({ success: false, error: 'Endpoint not found' });
    });

    // Error Handler
    app.use((err, req, res, next) => {
        error(`API Error: ${err.message}`);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    });

    const server = app.listen(API_PORT, () => {
        info(`API Server running on port ${API_PORT}`);
        info(`Health check: http://localhost:${API_PORT}/api/health`);
    });

    return server;
}

module.exports = { createApiServer };
