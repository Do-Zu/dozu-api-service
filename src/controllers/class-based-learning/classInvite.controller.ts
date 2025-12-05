import { Request, Response } from 'express';
import { BadRequest } from '@/core/error';
import { SuccessResponse } from '@/core/success';
import classInviteService from '@/services/class-based-learning/classInvite.service';
import userSearchService from '@/services/user/userSearch.service';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { IInviteByEmailBody, IGenerateInviteLinkBody, IJoinViaInviteBody } from '@/types/class-based-learning/classInvite.type';
import requestHelper from '@/core/request/request.helper';

class ClassInviteController {
    /**
     * Generate invite link for a class
     * POST /api/classes/teacher/:classId/invites/generate-link
     */
    public async generateInviteLink(req: Request, res: Response) {
        const classId = requestHelper.getIdParam(req, 'classId');
        const userId = getUserIdFromRequest(req);
        const data = req.body as IGenerateInviteLinkBody;

        const result = await classInviteService.generateInviteLink(classId, userId, data);
        SuccessResponse.ok(res, result);
    }

    /**
     * Invite users by email
     * POST /api/classes/teacher/:classId/invites/email
     */
    public async inviteByEmail(req: Request, res: Response) {
        const classId = requestHelper.getIdParam(req, 'classId');
        const userId = getUserIdFromRequest(req);
        const data = req.body as IInviteByEmailBody;

        const result = await classInviteService.inviteByEmail(classId, userId, data);
        SuccessResponse.ok(res, result);
    }

    /**
     * Regenerate invite link
     * POST /api/classes/teacher/:classId/invites/regenerate
     */
    public async regenerateInviteLink(req: Request, res: Response) {
        const classId = requestHelper.getIdParam(req, 'classId');
        const userId = getUserIdFromRequest(req);
        const data = req.body as IGenerateInviteLinkBody;

        const result = await classInviteService.regenerateInviteLink(classId, userId, data);
        SuccessResponse.ok(res, result);
    }

    /**
     * Accept invite
     * POST /api/invites/:token/accept
     */
    public async acceptInvite(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        const data = req.body as IJoinViaInviteBody;

        await classInviteService.acceptInvite(userId, data);
        SuccessResponse.ok(res, { message: 'Successfully joined the class' });
    }

    /**
     * Reject invite
     * POST /api/invites/:token/reject
     */
    public async rejectInvite(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        const data = req.body as IJoinViaInviteBody;

        await classInviteService.rejectInvite(userId, data);
        SuccessResponse.ok(res, { message: 'Invite rejected successfully' });
    }

    /**
     * Search users for invitation
     * GET /api/users/search?q=query
     */
    public async searchUsers(req: Request, res: Response) {
        const { q: query } = req.query;
        const classId = req.query.classId ? parseInt(req.query.classId as string) : undefined;

        if (!query || typeof query !== 'string') {
            throw new BadRequest('Search query is required');
        }

        const result = await userSearchService.searchUsers(query, classId);
        SuccessResponse.ok(res, result);
    }

    /**
     * Get invite statistics for a class
     * GET /api/classes/teacher/:classId/invites/stats
     */
    public async getInviteStats(req: Request, res: Response) {
        const classId = requestHelper.getIdParam(req, 'classId');

        const result = await classInviteService.getInviteStats(classId);
        SuccessResponse.ok(res, result);
    }

    /**
     * Cleanup expired invites (admin only)
     * POST /api/admin/invites/cleanup
     */
    public async cleanupExpiredInvites(req: Request, res: Response) {
        const result = await classInviteService.cleanupExpiredInvites();
        SuccessResponse.ok(res, result);
    }
}

export default new ClassInviteController();
