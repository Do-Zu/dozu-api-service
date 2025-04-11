import cors from 'cors';
import { config } from '../env.config';

/**
 * CORS Configuration
 * Handles Cross-Origin Resource Sharing settings for different environments
 */
const corsConfig = () => {
  const developmentOptions = {
    origin: '*', // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  };

  const productionOptions = {
    origin: ['https://api.dozu.blog', 'https://dev.api.dozu.blog'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400, // 24h
  };

  return cors(config.isDevelopment ? developmentOptions : productionOptions);
};

export default corsConfig;
