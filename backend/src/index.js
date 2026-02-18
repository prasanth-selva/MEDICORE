require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const hpp = require('hpp');

const sequelize = require('./config/database');
const { connectRedis, disconnectRedis } = require('./config/redis');
const { validateEnvironment } = require('./config/envValidator');
const { setupSwagger } = require('./config/swagger');
const errorHandler = require('./middleware/errorHandler');
const { logger, requestId, httpLogger } = require('./middleware/logger');
const { apiLimiter } = require('./middleware/rateLimiter');
const { initializeTransporter } = require('./services/emailService');
const setupSocket = require('./socket');

// Routes
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const doctorRoutes = require('./routes/doctors');
const appointmentRoutes = require('./routes/appointments');
const prescriptionRoutes = require('./routes/prescriptions');
const inventoryRoutes = require('./routes/inventory');
const billingRoutes = require('./routes/billing');
const sosRoutes = require('./routes/sos');
const sosRoutes = require('./routes/sos');

const dashboardRoutes = require('./routes/dashboard');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const server = http.createServer(app);

// ─── Validate Environment ────────────────────────────────────
validateEnvironment();

// ─── Socket.IO setup ─────────────────────────────────────────
const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
    : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'];

const io = new Server(server, {
    cors: { origin: corsOrigins, methods: ['GET', 'POST'] },
    pingTimeout: 60000,
    pingInterval: 25000,
});

app.set('io', io);
setupSocket(io);

// ─── Security Middleware ─────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));
app.use(cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
}));
app.use(hpp()); // Prevent HTTP parameter pollution

// ─── Body Parsing ────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging & Request ID ────────────────────────────────────
app.use(requestId);
app.use(httpLogger);

// ─── Rate Limiting ───────────────────────────────────────────
app.use('/api/', apiLimiter);

// ─── Static Files (uploads) ─────────────────────────────────
app.use('/uploads', express.static('uploads'));

// ─── Swagger API Documentation ───────────────────────────────
setupSwagger(app);

// ─── API Routes (v1 + backward compat) ───────────────────────
const mountRoutes = (router) => {
    router.use('/auth', authRoutes);
    router.use('/patients', patientRoutes);
    router.use('/doctors', doctorRoutes);
    router.use('/appointments', appointmentRoutes);
    router.use('/prescriptions', prescriptionRoutes);
    router.use('/inventory', inventoryRoutes);
    router.use('/billing', billingRoutes);
    router.use('/sos', sosRoutes);
    router.use('/sos', sosRoutes);

    router.use('/dashboard', dashboardRoutes);
    router.use('/analytics', analyticsRoutes);
};

// v1 routes
const v1Router = express.Router();
mountRoutes(v1Router);
app.use('/api/v1', v1Router);

// Backward compatible routes
const legacyRouter = express.Router();
mountRoutes(legacyRouter);
app.use('/api', legacyRouter);

// ─── Health Check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'MediCore HMS API', version: '1.0.0' });
});

app.get('/api/v1/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'MediCore HMS API', version: '1.0.0' });
});

// Deep health check
app.get('/api/v1/health/deep', async (req, res) => {
    const checks = {};

    // Database
    try {
        await sequelize.authenticate();
        checks.database = { status: 'healthy' };
    } catch (err) {
        checks.database = { status: 'unhealthy', error: err.message };
    }

    // Redis
    try {
        const { redisHealthCheck } = require('./config/redis');
        checks.redis = await redisHealthCheck();
    } catch (err) {
        checks.redis = { status: 'unhealthy', error: err.message };
    }

    // AI Service
    try {
        const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const response = await fetch(`${aiUrl}/health/ping`, { signal: controller.signal });
        clearTimeout(timeout);
        checks.ai_service = { status: response.ok ? 'healthy' : 'unhealthy' };
    } catch (err) {
        checks.ai_service = { status: 'unreachable', error: err.message };
    }

    const overallStatus = Object.values(checks).every(c => c.status === 'healthy') ? 'healthy' : 'degraded';
    res.status(overallStatus === 'healthy' ? 200 : 503).json({
        status: overallStatus,
        timestamp: new Date().toISOString(),
        checks,
    });
});

// ─── Error Handler ───────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const start = async () => {
    try {
        await sequelize.authenticate();
        logger.info('✅ PostgreSQL connected');

        await connectRedis();

        // Initialize email transporter
        initializeTransporter();

        server.listen(PORT, () => {
            logger.info(`🏥 MediCore HMS API running on port ${PORT}`);
            logger.info(`📡 Socket.IO ready`);
            logger.info(`📚 API Docs: http://localhost:${PORT}/api/docs`);
            logger.info(`🔗 API v1: http://localhost:${PORT}/api/v1`);
        });
    } catch (err) {
        logger.error('❌ Failed to start server:', err);
        process.exit(1);
    }
};

// ─── Graceful Shutdown ───────────────────────────────────────
const gracefulShutdown = async (signal) => {
    logger.info(`\n${signal} received. Shutting down gracefully...`);

    server.close(async () => {
        logger.info('HTTP server closed');

        try {
            await sequelize.close();
            logger.info('Database connections closed');
        } catch (err) {
            logger.error('Error closing database:', err.message);
        }

        try {
            await disconnectRedis();
        } catch (err) {
            logger.error('Error closing Redis:', err.message);
        }

        logger.info('✅ Graceful shutdown complete');
        process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
        logger.error('⚠️ Forced shutdown after 10s timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
});

start();
