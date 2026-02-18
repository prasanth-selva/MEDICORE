const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'MediCore HMS API',
            version: '1.0.0',
            description: 'AI-Powered Hospital Management System — RESTful API Documentation',
            contact: {
                name: 'MediCore Team',
            },
        },
        servers: [
            { url: '/api/v1', description: 'API v1' },
            { url: '/api', description: 'API (backward compatible)' },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        code: { type: 'string' },
                        requestId: { type: 'string' },
                        details: { type: 'array', items: { type: 'object' } },
                    },
                },
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'admin@medicore.com' },
                        password: { type: 'string', example: 'admin123' },
                    },
                },
                LoginResponse: {
                    type: 'object',
                    properties: {
                        user: {
                            type: 'object',
                            properties: {
                                id: { type: 'string', format: 'uuid' },
                                name: { type: 'string' },
                                email: { type: 'string' },
                                role: { type: 'string', enum: ['admin', 'doctor', 'pharmacist', 'receptionist', 'patient'] },
                            },
                        },
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' },
                    },
                },
                Patient: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        patient_code: { type: 'string' },
                        first_name: { type: 'string' },
                        last_name: { type: 'string' },
                        date_of_birth: { type: 'string', format: 'date' },
                        gender: { type: 'string' },
                        blood_group: { type: 'string' },
                        phone: { type: 'string' },
                        email: { type: 'string' },
                    },
                },
                Doctor: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        specialty: { type: 'string' },
                        status: { type: 'string', enum: ['available', 'with_patient', 'break', 'lunch', 'meeting', 'leave'] },
                        consultation_fee: { type: 'number' },
                        room_number: { type: 'string' },
                    },
                },
                Medicine: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        generic_name: { type: 'string' },
                        category: { type: 'string' },
                        unit_price: { type: 'number' },
                        current_stock: { type: 'integer' },
                    },
                },
                Prescription: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        patient_id: { type: 'string', format: 'uuid' },
                        doctor_id: { type: 'string', format: 'uuid' },
                        items: { type: 'array' },
                        diagnosis: { type: 'string' },
                        status: { type: 'string', enum: ['pending', 'received', 'dispensed'] },
                    },
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: ['./src/routes/*.js'],
};

const spec = swaggerJsdoc(options);

function setupSwagger(app) {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec, {
        customCss: `
            .swagger-ui .topbar { display: none; }
            .swagger-ui .info { margin: 20px 0; }
        `,
        customSiteTitle: 'MediCore HMS — API Docs',
    }));
}

module.exports = { setupSwagger, spec };
