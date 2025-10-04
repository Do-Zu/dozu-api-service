import { randomBytes } from 'crypto';

export const generateSecureCode = (length = 10) => {
    return randomBytes(length).toString('hex').slice(0, length).toUpperCase();
    // e.g. "A3F9B1C4D2"
};
