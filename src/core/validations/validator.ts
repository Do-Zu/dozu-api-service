import { BadRequest } from '@/core/error';
import logger from '@/utils/logger';
import { NextFunction, Request, Response } from 'express';
import { ZodType, ZodError } from 'zod';

class Validator {
    public validate<T extends ZodType<any, any>>({
        selector,
        schema,
    }: {
        selector: 'params' | 'query' | 'body';
        schema: T;
    }) {
        return (req: Request, res: Response, next: NextFunction) => {
            req.validated = req.validated || {};
            req.validated.params = req.validated.params || {};
            req.validated.query = req.validated.query || {};
            req.validated.body = req.validated.body || {};
            try {
                const reqField = req[selector];
                const validatedData = schema.parse(reqField);
                if (selector === 'params') {
                    req.validated.params = { ...req.validated.params, ...validatedData };
                } else if (selector === 'query') {
                    req.validated.query = { ...req.validated.query, ...validatedData };
                } else if (selector === 'body') {
                    req.validated.body = { ...req.validated.body, ...validatedData };
                }
                next();
            } catch (err) {
                if (err instanceof ZodError) {
                    const { errors } = err;
                    const errorMessages = errors.map(issue => {
                        return {
                            message: `${issue.path.join('.')} is ${issue.message}`,
                        };
                    });
                    logger.error(`Zod Error:`);
                    logger.error(errorMessages);
                    throw new BadRequest('Invalid data in Request');
                }
                if (err instanceof Error) {
                    throw new Error(err.message);
                }

                throw new Error('Something went wrong');
            }
        };
    }
}

export default new Validator();
