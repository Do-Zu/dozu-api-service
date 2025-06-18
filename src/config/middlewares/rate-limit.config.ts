import { rateLimit } from 'express-rate-limit';
import { config } from '../env.config';

/**
 * Rate Limiting Configuration
 * Protects against brute-force attacks
 *
 * IMPORTANT: This middleware requires Express 'trust proxy' setting to be properly configured
 * when running behind reverse proxies to correctly identify client IPs.
 * The trust proxy setting is configured in index.ts based on the environment.
 */
const rateLimitConfig = () => {
  const developmentOptions = {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 500, // Limit each IP to 500 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests, please try again later.',
    skipSuccessfulRequests: false, // Skip successful requests (2xx responses)
    skipFailedRequests: false, // Skip failed requests (4xx and 5xx responses)
  };

  const productionOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests, please try again later.',
    skipSuccessfulRequests: false, // Skip successful requests (2xx responses) in production for better performance
    skipFailedRequests: false, // Skip failed requests (4xx and 5xx responses)
  };

  return rateLimit(config.isDevelopment ? developmentOptions : productionOptions);
};

export default rateLimitConfig;
