import { rateLimit } from 'express-rate-limit';
import { config } from '../env.config';

/**
 * Rate Limiting Configuration
 * Protects against brute-force attacks
 */
const rateLimitConfig = () => {
  const developmentOptions = {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 500, // Limit each IP to 500 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests, please try again later.',
  };

  const productionOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests, please try again later.',
  };

  return rateLimit(config.isDevelopment ? developmentOptions : productionOptions);
};

export default rateLimitConfig;
