import { API_VERSION } from '@/constants/index.constant';
import logger from '@/utils/logger';
import { Router } from 'express';

interface RouteDefinition {
  readonly path: string;
  readonly router: Router;
  readonly description?: string; // Documentation for the route
  readonly version?: string; // API version
  readonly isEnabled?: boolean; // Allow disabling routes in certain environments
}

const routes: Map<string, RouteDefinition> = new Map();

/**
 * Register a route with the application
 *
 * @param path - The base path for the route
 * @param router - The express router instance
 * @param options - Additional options for the route
 */
export const registerRoute = (
  path: string,
  router: Router,
  options: Omit<RouteDefinition, 'path' | 'router'> = {}
): void => {
  if (!path || typeof path !== 'string') {
    const error = new Error('Route path must be a string and cannot be empty');
    logger.error(error.message);
    throw error;
  }

  if (!router) {
    const error = new Error('Router must be an instance of express.Router');
    logger.error(error.message);
    throw error;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (routes.has(normalizedPath)) {
    const warning = `Route '${normalizedPath}' already registered, overwriting previous definition`;
    logger.warn(warning);
    throw new Error(warning);
  }

  const routeDefinition: RouteDefinition = {
    path: normalizedPath,
    router,
    description: options?.description || undefined,
    version: options?.version || API_VERSION,
    isEnabled: options?.isEnabled ?? true,
  };

  routes.set(normalizedPath, routeDefinition);
  logger.info(`Registered route: ${normalizedPath}`);
};

/**
 * Get all registered routes
 * @param includeDisabled - Whether to include disabled routes
 */
export const getRoutes = (includeDisabled = false): RouteDefinition[] => {
  return Array.from(routes.values()).filter(route => includeDisabled || route.isEnabled);
};

/**
 * Generate route documentation
 */
export const getRouteDocumentation = (): Record<string, unknown>[] => {
  return Array.from(routes.entries()).map(([path, definition]) => ({
    path,
    description: definition.description || 'No description provided',
    version: definition.version || API_VERSION,
    enabled: definition.isEnabled,
  }));
};
