import cors from 'cors';
import { config } from '../env.config';

/**
 * CORS Configuration
 * Handles Cross-Origin Resource Sharing settings for different environments
 */
const corsConfig = () => {
    const developmentOptions = {
        origin: config.allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Timestamp', 'X-Timezone'],
        credentials: true,
    };

    const productionOptions = {
        origin: config.allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Timestamp', 'X-Timezone'],
        credentials: true,
        maxAge: 86400, // 24h
    };

    return cors(config.isDevelopment ? developmentOptions : productionOptions);
};

export default corsConfig;
