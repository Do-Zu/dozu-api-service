import { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { authMiddleware, validateStudent } from '@/middleware/auth.middleware';
import classInviteMiddleware from '@/middleware/class-based-learning/classInvite.middleware';
import classInviteController from '@/controllers/class-based-learning/classInvite.controller';
import { validateJoinViaInvite, validateInviteToken, validateUserSearch } from '@/validations/classInvite.validation';
import { validationResult } from 'express-validator';

const router = Router();
globalAsyncHandler(router);

// Apply authentication and student validation to all routes
router.use(authMiddleware);
router.use(validateStudent);

// Accept invite
router.post(
    '/:token/accept',
    validateInviteToken,
    validateJoinViaInvite,
    (req: any, res: any, next: any) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
    classInviteMiddleware.validateInviteToken,
    classInviteMiddleware.checkInvitePermission,
    classInviteMiddleware.checkUserNotInClass,
    classInviteController.acceptInvite
);

// Reject invite
router.post(
    '/:token/reject',
    validateInviteToken,
    validateJoinViaInvite,
    (req: any, res: any, next: any) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
    classInviteMiddleware.validateInviteToken,
    classInviteMiddleware.checkInvitePermission,
    classInviteController.rejectInvite
);

// Search users (for teachers to find students to invite)
router.get(
    '/search',
    validateUserSearch,
    (req: any, res: any, next: any) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
    classInviteController.searchUsers
);

export const studentClassInviteRoutes = router;
