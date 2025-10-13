import { NextFunction, Request, Response } from 'express';
import { BadRequest, NotFoundError } from '@/core/error';
import classInviteService from '@/services/class-based-learning/classInvite.service';
import classInviteRepo from '@/repositories/class-based-learning/classInvite.repo';
import logger from '@/utils/logger';

class ClassInviteMiddleware {
    /**
     * Validate invite token and attach invite to request
     */
    public validateInviteToken = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { token } = req.params;

            if (!token) {
                throw new BadRequest('Invite token is required');
            }

            const invite = await classInviteRepo.getInviteByToken(token);
            if (!invite) {
                throw new NotFoundError('Invalid invite token');
            }

            // Validate invite is still valid
            const isValid = await classInviteService.validateInvite(invite);
            if (!isValid) {
                throw new BadRequest('Invite has expired or is no longer valid');
            }

            // Attach invite to request for use in controllers
            req.invite = invite;
            next();
        } catch (error) {
            logger.error('Error validating invite token:', error);
            next(error);
        }
    };

    /**
     * Check if user can accept/reject invite
     */
    public checkInvitePermission = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.currentUser?.userId;
            const invite = req.invite;

            if (!userId) {
                throw new BadRequest('User authentication required');
            }

            if (!invite) {
                throw new BadRequest('Invite not found');
            }

            // Check if invite is for a specific user
            if (invite.invitedUserId && invite.invitedUserId !== userId) {
                throw new BadRequest('This invite is not for you');
            }

            // Check if invite is for a specific email and user's email matches
            if (invite.invitedEmail && req.currentUser?.email !== invite.invitedEmail) {
                throw new BadRequest('This invite is not for your email address');
            }

            next();
        } catch (error) {
            logger.error('Error checking invite permission:', error);
            next(error);
        }
    };

    /**
     * Check if user is already in the class
     */
    public checkUserNotInClass = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.currentUser?.userId;
            const invite = req.invite;

            if (!userId || !invite) {
                throw new BadRequest('Invalid request');
            }

            // This will be implemented when we have the class enrollment service
            // For now, we'll skip this check
            next();
        } catch (error) {
            logger.error('Error checking user class membership:', error);
            next(error);
        }
    };

    /**
     * Rate limiting for invite operations
     */
    public rateLimitInviteOperations = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.currentUser?.userId;
            const classId = req.params.classId;

            if (!userId || !classId) {
                throw new BadRequest('Invalid request');
            }

            // Simple rate limiting: max 10 invites per hour per user per class
            // This could be enhanced with Redis for production
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            
            // Check recent invite activity
            const recentInvites = await classInviteRepo.getInvitesByClassId(parseInt(classId));
            const userRecentInvites = recentInvites.filter(
                invite => 
                    invite.invitedBy === userId && 
                    invite.createdAt > oneHourAgo
            );

            if (userRecentInvites.length >= 10) {
                throw new BadRequest('Rate limit exceeded. Please wait before sending more invites.');
            }

            next();
        } catch (error) {
            logger.error('Error checking rate limit:', error);
            next(error);
        }
    };
}

export default new ClassInviteMiddleware();
