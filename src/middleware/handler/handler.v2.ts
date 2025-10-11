import logger from '@/utils/logger';
import { Router, Request, Response, NextFunction, RequestHandler, Application } from 'express';

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head' | 'use';
const METHODS: HttpMethod[] = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'use'];

/**
 * Wraps a request handler to catch both synchronous and asynchronous errors
 */
export const asyncHandler = (handler: RequestHandler): RequestHandler => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = handler(req, res, next);

            if (result instanceof Promise) {
                await result.catch((error: unknown) => {
                    logger.error('Async error caught in handler', {
                        error: error instanceof Error ? error.message : 'Unknown error',
                        stack: error instanceof Error ? error.stack : undefined,
                    });
                    next(error);
                });
            }
        } catch (error) {
            logger.error('Sync error caught in handler', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
            });
            next(error);
        }
    };
};

/**
 * Enhances an Express router to automatically wrap all handlers with asyncHandler
 */
export const globalAsyncHandler = (router: Router): Router => {
    const handlerCache = new WeakMap<RequestHandler, RequestHandler>();

    METHODS.forEach((method: HttpMethod) => {
        const originalMethod = router[method].bind(router);

        // Override the router method with enhanced version
        router[method] = function (
            this: Router,
            path: string | Router | RequestHandler | Application,
            ...handlers: RequestHandler[]
        ): Router {
            // Special handling for 'use' method which can have different signatures
            if (method === 'use') {
                // Case: router.use(handler) - function as first argument
                if (typeof path === 'function') {
                    handlers.unshift(path);
                    return enhanceAndApply(this, originalMethod, '/', handlers);
                }

                // Case: router.use(router) - mounting a sub-router
                if (typeof path !== 'string' && path && 'stack' in path) {
                    return originalMethod.call(this, '/', path);
                }
            }

            // Standard case: path is a path parameter
            return enhanceAndApply(this, originalMethod, path, handlers);
        } as any; // Cast to any to bypass TypeScript's checks on the router method
    });

    // Helper function to wrap handlers and apply the original method
    function enhanceAndApply(
        context: Router,
        originalMethod: Function,
        path: string | Router | RequestHandler | Application,
        handlers: RequestHandler[]
    ): Router {
        const wrappedHandlers = handlers.map(handler => {
            if (!handlerCache.has(handler)) {
                handlerCache.set(handler, asyncHandler(handler));
            }
            return handlerCache.get(handler) as RequestHandler;
        });

        // Call the original method directly with individual arguments
        return originalMethod.call(context, path, ...wrappedHandlers);
    }

    return router;
};
