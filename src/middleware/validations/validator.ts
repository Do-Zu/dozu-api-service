import { BadRequest } from '@/core/error';
import logger from '@/utils/logger';
import { NextFunction, Request, Response } from 'express';
import { z, ZodType, ZodError } from 'zod';

function validateData<T extends ZodType<any, any>>({
    selector,
    schema,
}: {
    selector: (req: Request) => any;
    schema: T;
}) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const reqField = selector(req);
            const validatedData = schema.parse(reqField);
            if(reqField === req.params) {
                req.validatedParams = validatedData;
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

export default validateData;

// example

// basic usage
const numberSchema = z.number();
export const validateBasic = () => validateData<z.ZodNumber>({ selector: req => req.query, schema: numberSchema });

// validate req.params có id không
const idSchema = z.object({
    id: z.string(),
});
export const validateParams = () =>
    validateData<z.ZodObject<any, any>>({ selector: req => req.params, schema: idSchema });

// validate req.body
const userSchema = z.object({
    id: z.number(),
    user: z.object({
        username: z.string(),
        fullname: z.string(),
        age: z.number(),
    }),
    //...
});
export function validateUser() {
    return validateData<z.ZodObject<any, any>>({ selector: req => req.body, schema: userSchema });
}
