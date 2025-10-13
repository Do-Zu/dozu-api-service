import { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { authMiddleware, validateTeacher } from '@/middleware/auth.middleware';
import classMiddleware from '@/middleware/class-based-learning/class.middleware';
import classInviteMiddleware from '@/middleware/class-based-learning/classInvite.middleware';
import classInviteController from '@/controllers/class-based-learning/classInvite.controller';
import { validateInviteByEmail, validateGenerateInviteLink, validateClassId } from '@/validations/classInvite.validation';
import { validationResult } from 'express-validator';

const router = Router({ mergeParams: true });
globalAsyncHandler(router);

// Apply authentication and teacher validation to all routes
router.use(authMiddleware);
router.use(validateTeacher);

// Verify teacher owns the class for all routes
const verifyClassAccess = [classMiddleware.verifyTeacherOwnsClass];

// Generate invite link
router.post(
    '/generate-link',
    ...verifyClassAccess,
    validateGenerateInviteLink,
    (req: any, res: any, next: any) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
    classInviteMiddleware.rateLimitInviteOperations,
    classInviteController.generateInviteLink
);

// Invite by email
router.post(
    '/email',
    ...verifyClassAccess,
    validateInviteByEmail,
    (req: any, res: any, next: any) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
    classInviteMiddleware.rateLimitInviteOperations,
    classInviteController.inviteByEmail
);

// Get invites for class
router.get(
    '/',
    ...verifyClassAccess,
    classInviteController.getInvitesForClass
);

// Regenerate invite link
router.post(
    '/regenerate',
    ...verifyClassAccess,
    validateGenerateInviteLink,
    (req: any, res: any, next: any) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
    classInviteController.regenerateInviteLink
);

// Get invite statistics
router.get(
    '/stats',
    ...verifyClassAccess,
    classInviteController.getInviteStats
);

export const teacherClassInviteRoutes = router;
