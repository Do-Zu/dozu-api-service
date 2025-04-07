import { Request, Response, NextFunction, Router, RequestHandler, Application } from 'express';

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head' | 'use';

const METHODS: HttpMethod[] = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'use'];

/**
 * Handles errors consistently
 * This middleware catches errors thrown in async route handlers and middleware,
 *
 * @param {Error} error - The error object to handle.
 * @param {NextFunction} [next] - The next middleware function in the stack.
 */
const handleError = (error: unknown, next?: NextFunction): void => {
  const normalizedError: Error =
    error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error');

  console.error('Error caught by global handler:', {
    name: normalizedError.name,
    message: normalizedError.message,
    stack: normalizedError.stack,
  });

  if (next) {
    next(normalizedError);
  }
};

/**
 * Wraps an async function to handle errors and promises
 * This middleware wraps an async function and catches any errors that occur during its execution.
 *
 * @param {Function} fn - The async function to wrap.
 * @returns {RequestHandler} - A middleware function that handles errors and promises.
 */
const asyncHandler = <Req extends Request = Request, Res extends Response = Response>(
  fn: (req: Req, res: Res, next: NextFunction) => Promise<any> | any
): RequestHandler => {
  return (req, res, next) => {
    try {
      const result = fn(req as Req, res as Res, next);

      if (result && typeof result.catch === 'function') {
        result.catch((error: unknown) => handleError(error, next));
      }

      if (result && typeof result.on === 'function') {
        result.on('error', (error: unknown) => handleError(error, next));
      }
    } catch (error) {
      handleError(error, next);
    }
  };
};

/**
 *Applies async error handling to all router methods
 * @param router - The router instance to apply the middleware to.
 * @returns {Router} - The router instance with the middleware applied.
 */
const globalAsyncHandler = (router: Router): Router => {
  // Create a WeakMap to cache wrapped handlers for better performance
  const handlerCache = new WeakMap<RequestHandler, RequestHandler>();

  METHODS.forEach((method: HttpMethod) => {
    const original = router[method].bind(router);

    // Override the router method
    (router[method] as any) = function (
      this: Router,
      path: string | RequestHandler | Router | Application,
      ...handlers: Array<RequestHandler | Router | Application>
    ): Router {
      // Handle middleware mounting case
      if (method === 'use' && typeof path === 'function') {
        handlers.unshift(path as RequestHandler);
        path = '/';
      }

      // Handle sub-router or sub-app mounting
      if (
        method === 'use' &&
        typeof path !== 'string' &&
        typeof path !== 'function' &&
        (path as any).stack
      ) {
        // Call original with correct arguments for router/app mounting
        return original.call(this, '/', path);
      }

      // Wrap handlers with asyncHandler, using cache for performance
      const wrappedHandlers = handlers.map(handler => {
        if (typeof handler !== 'function') {
          return handler;
        }

        // Check cache first before creating new wrapper
        if (!handlerCache.has(handler as RequestHandler)) {
          handlerCache.set(handler as RequestHandler, asyncHandler(handler as RequestHandler));
        }

        return handlerCache.get(handler as RequestHandler);
      });

      // Domain-based error handling - more performant implementation
      const domainHandler = (req: Request, res: Response, next: NextFunction): void => {
        const domain = require('domain').create();

        domain.on('error', (error: unknown) => {
          handleError(error, next);
        });

        domain.run(() => {
          // Set unhandled rejection handler for this request
          const rejectHandler = (error: unknown) => handleError(error, next);
          process.once('unhandledRejection', rejectHandler);

          // Clean up after request is done
          res.once('finish', () => {
            process.removeListener('unhandledRejection', rejectHandler);
            domain.exit();
          });

          next();
        });
      };

      // Add domain handler at the start
      wrappedHandlers.unshift(domainHandler);

      return original.call(this, path, ...wrappedHandlers);
    };
  });

  return router;
};

export default globalAsyncHandler;
