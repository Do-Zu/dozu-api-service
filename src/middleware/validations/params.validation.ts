import { z } from "zod"
import validateData from "./validator";

export const idParamSchema = (fieldName: string, message: string = 'Zod Error: Invalid Param') => {
    return z.object({
        [fieldName]: z.string().transform((val) => {
            const parsed = Number(val);
            if(Number.isNaN(parsed) || parsed <= 0) throw new Error(message);
            return parsed;
        })
    })
}

export const validateIdParam = (fieldName: string, message: string = 'Zod Error: Invalid Param') => {
    return validateData({ selector: req => req.params, schema: idParamSchema(fieldName, message) })
}