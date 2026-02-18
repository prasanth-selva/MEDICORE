/**
 * Environment Variable Validator
 * Validates required env vars at startup — fail fast with clear messages
 */
const { logger } = require('../middleware/logger');

const REQUIRED_VARS = [
    { name: 'DB_HOST', description: 'PostgreSQL host' },
    { name: 'DB_NAME', description: 'PostgreSQL database name' },
    { name: 'DB_USER', description: 'PostgreSQL user' },
    { name: 'DB_PASSWORD', description: 'PostgreSQL password' },
];

const RECOMMENDED_VARS = [
    { name: 'JWT_SECRET', description: 'JWT signing secret' },
    { name: 'JWT_REFRESH_SECRET', description: 'JWT refresh token secret' },
    { name: 'REDIS_HOST', description: 'Redis host' },
    { name: 'AI_SERVICE_URL', description: 'AI microservice URL' },
    { name: 'CORS_ORIGINS', description: 'Allowed CORS origins (comma-separated)' },
];

function validateEnvironment() {
    const missing = [];
    const warnings = [];

    for (const v of REQUIRED_VARS) {
        if (!process.env[v.name]) {
            missing.push(`  ❌ ${v.name} — ${v.description}`);
        }
    }

    for (const v of RECOMMENDED_VARS) {
        if (!process.env[v.name]) {
            warnings.push(`  ⚠️  ${v.name} — ${v.description}`);
        }
    }

    if (missing.length > 0) {
        logger.error(`Missing required environment variables:\n${missing.join('\n')}`);
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }

    if (warnings.length > 0) {
        logger.warn(`Missing recommended environment variables:\n${warnings.join('\n')}`);
    }

    // Warn about insecure defaults
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.includes('change-in-production')) {
        logger.warn('⚠️  JWT_SECRET contains placeholder text — change for production!');
    }

    logger.info('✅ Environment validation complete');
}

module.exports = { validateEnvironment };
