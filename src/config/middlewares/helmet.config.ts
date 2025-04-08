import helmet from 'helmet';
import { config } from '../env.config';

/**
 * Helmet Configuration
 * Sets various HTTP headers to help secure the application
 */
const helmetConfig = () => {
  return helmet({
    contentSecurityPolicy: config.isProduction ? undefined : false,
    crossOriginEmbedderPolicy: config.isProduction,
    hidePoweredBy: true,
    hsts: config.isProduction,
  });
};

export default helmetConfig;
