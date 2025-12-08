import { z } from 'zod';
import validator from './validator';

class ParamsValidator {
    private idSchema = (fieldName: string, message: string = 'Zod Error: Invalid Param') => {
        return z.object({
            [fieldName]: z.string().transform(val => {
                const parsed = Number(val);
                if (Number.isNaN(parsed) || parsed <= 0) throw new Error(message);
                return parsed;
            }),
        });
    };
    
    public validateId = (fieldName: string, message: string = 'Zod Error: Invalid Param') => {
        return validator.validate({ selector: 'params', schema: this.idSchema(fieldName, message) });
    };
}

export default new ParamsValidator();