import { body, param, query } from 'express-validator';

export const validateInviteByEmail = [
    body('emails')
        .isArray({ min: 1, max: 50 })
        .withMessage('Emails must be an array with 1-50 items'),
    body('emails.*')
        .isEmail()
        .withMessage('Each email must be a valid email address')
        .normalizeEmail(),
    body('expiresInDays')
        .optional()
        .isInt({ min: 1, max: 365 })
        .withMessage('Expires in days must be between 1 and 365'),
    body('useLimit')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('Use limit must be between 1 and 1000'),
];

export const validateGenerateInviteLink = [
    body('expiresInDays')
        .optional()
        .isInt({ min: 1, max: 365 })
        .withMessage('Expires in days must be between 1 and 365'),
    body('useLimit')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('Use limit must be between 1 and 1000'),
];

export const validateJoinViaInvite = [
    body('token')
        .isString()
        .isLength({ min: 10, max: 50 })
        .withMessage('Token must be a string between 10 and 50 characters')
        .matches(/^[A-Za-z0-9]+$/)
        .withMessage('Token must contain only alphanumeric characters'),
];

export const validateInviteToken = [
    param('token')
        .isString()
        .isLength({ min: 10, max: 50 })
        .withMessage('Token must be a string between 10 and 50 characters')
        .matches(/^[A-Za-z0-9]+$/)
        .withMessage('Token must contain only alphanumeric characters'),
];

export const validateUserSearch = [
    query('q')
        .isString()
        .isLength({ min: 2, max: 100 })
        .withMessage('Search query must be between 2 and 100 characters')
        .trim(),
];

export const validateClassId = [
    param('classId')
        .isInt({ min: 1 })
        .withMessage('Class ID must be a positive integer'),
];
