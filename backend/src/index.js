require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

const sequelize = require('./config/database');
const { connectRedis } = require('./config/redis');
const errorHandler = require('./middleware/errorHandler');
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
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingTimeout: 60000,
    pingInterval: 25000,
});

app.set('io', io);
setupSocket(io);

// Middleware  
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'MediCore HMS API' });
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

const start = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ PostgreSQL connected');

        await connectRedis();

        server.listen(PORT, () => {
            console.log(`🏥 MediCore HMS API running on port ${PORT}`);
            console.log(`📡 Socket.IO ready`);
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
};

start();
