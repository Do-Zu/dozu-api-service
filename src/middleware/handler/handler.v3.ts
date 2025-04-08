import { Request, Response, NextFunction, Router, RequestHandler, Application } from 'express';
import { ParsedQs } from 'qs';

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head' | 'use';

const METHODS: HttpMethod[] = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'use'];

/**
 * Handles errors consistently
 * This middleware catches errors thrown in async route handlers and middleware.
 *
 * @param {Error} error - The error object to handle.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function in the stack.
 */
const handleError = (error: unknown, req: Request, res: Response, next: NextFunction): void => {
  const normalizedError: Error =
    error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error');

  console.error('Error caught by global handler:', {
    name: normalizedError.name,
    message: normalizedError.message,
    stack: normalizedError.stack,
  });

  next(normalizedError);
};

/**
 * Wraps an async function to handle errors and promises
 * This middleware wraps an async function and catches any errors that occur during its execution.
 *
 * @param {RequestHandler} fn - The async function to wrap.
 * @returns {RequestHandler} - A middleware function that handles errors and promises.
 */
const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error: unknown) =>
      handleError(error, req, res, next)
    );
  };

/**
 * Applies async error handling to a router instance.
 *
 * @param {Router} router - The router instance to apply the middleware to.
 * @returns {Router} - The router instance with the middleware applied.
 */
// const withAsyncErrorHandling = (router: Router): Router => {
//     const handlerCache = new WeakMap<RequestHandler, RequestHandler>();

//     METHODS.forEach((method: HttpMethod) => {
//         const original = router[method].bind(router);

//         (router[method] as any) = function (
//             this: Router,
//             path: string | RequestHandler | Router | Application,
//             ...handlers: Array<RequestHandler | Router | Application>
//         ): Router {
//             // Explicitly define the type of wrappedHandlers with all generic parameters
//             const wrappedHandlers: RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>[] = [];
//             let actualPath: string | RequestHandler | Router | Application = path;

//             if (method === 'use' && typeof path === 'function') {
//                 handlers.unshift(path as RequestHandler);
//                 actualPath = '/';
//             } else if (
//                 method === 'use' &&
//                 typeof path !== 'string' &&
//                 typeof path !== 'function' &&
//                 (path as any)?.stack
//             ) {
//                 return original.call(this, '/', path);
//             }

//             handlers.forEach(handler => {
//                 if (typeof handler === 'function') {
//                     if (!handlerCache.has(handler)) {
//                         handlerCache.set(handler, asyncHandler(handler));
//                     }
//                     wrappedHandlers.push(handlerCache.get(handler)!);
//                 } else {
//                     wrappedHandlers.push(handler as RequestHandler);
//                 }
//             });

//             return original.call(this, actualPath, ...wrappedHandlers);
//         };
//     });

//     return router;
// };

// export default withAsyncErrorHandling;
