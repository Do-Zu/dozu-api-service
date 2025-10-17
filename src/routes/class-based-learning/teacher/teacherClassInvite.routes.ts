import { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import classInviteMiddleware from '@/middleware/class-based-learning/classInvite.middleware';
import classInviteController from '@/controllers/class-based-learning/classInvite.controller';
import { validateInviteByEmail, validateGenerateInviteLink } from '@/validations/classInvite.validation';

const router = Router({ mergeParams: true });
globalAsyncHandler(router);

// Generate invite link
router.post(
    '/generate-link',
    validateGenerateInviteLink,
    classInviteMiddleware.rateLimitInviteOperations,
    classInviteController.generateInviteLink
);

// Invite by email
router.post(
    '/email',
    validateInviteByEmail,
    classInviteMiddleware.rateLimitInviteOperations,
    classInviteController.inviteByEmail
);

// Get invites for class
router.get(
    '/',
    classInviteController.getInvitesForClass
);

// Regenerate invite link
router.post(
    '/regenerate',
    validateGenerateInviteLink,
    classInviteController.regenerateInviteLink
);

// Get invite statistics
router.get(
    '/stats',
    classInviteController.getInviteStats
);

export const teacherClassInviteRoutes = router;
