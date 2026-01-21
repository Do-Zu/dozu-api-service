import helmet from 'helmet';
import { config } from '../env.config';

/**
 * Helmet Configuration
 * Sets various HTTP headers to help secure the application
 */
const helmetConfig = () => {
  return helmet({
    contentSecurityPolicy: config.isProduction
      ? undefined
      : {
          directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'", "'unsafe-inline'"],
            "style-src": ["'self'", "'unsafe-inline'"],
            "img-src": ["'self'", "data:"],
          },
        },
    crossOriginEmbedderPolicy: config.isProduction,
    hidePoweredBy: true,
    hsts: config.isProduction,
  });
};

export default helmetConfig;
