import { Request, Response } from 'express';
import { scheduleService } from '@/services/schedule/schedule.service';
import { SuccessResponse } from '@/core/success';
import { BadRequest } from '@/core/error';
import { getTimezoneClient } from '@/utils/date';

/**
 * Controller class for Schedule functionality
 */
class ScheduleController {
    /**
     * Get schedule for a specific day
     * @param req - Express request object
     * @param res - Express response object
     */
    async getScheduleInWeek(req: Request, res: Response) {
        const data = scheduleService.getScheduleInWeek();

        SuccessResponse.ok(res, data);
    }

    /**
     * Generate schedule automatically
     * @param req - Express request object
     * @param res - Express response object
     */
    async generateSchedule(req: Request, res: Response) {
        const userId = req.currentUser?.userId;
        const timezone = getTimezoneClient(req);
        const { fromDate, toDate } = req.body;

        if (!userId) {
            throw new BadRequest('Unauthorized!');
        }

        if (!fromDate || !toDate) {
            throw new BadRequest('fromDate and toDate are required');
        }

        if (new Date(fromDate) > new Date(toDate)) {
            throw new BadRequest('fromDate must be before toDate');
        }

        if (!timezone) {
            throw new BadRequest('timezone is required');
        }

        const data = await scheduleService.generateSchedule({ userId: parseInt(userId), fromDate, toDate, timezone });

        SuccessResponse.ok(res, data);
    }

    /**
     * Get preference schedule for user configuration
     * @param req - Express request object
     * @param res - Express response object
     */
    async getPreference(req: Request, res: Response) {
        const userId = req.currentUser?.userId;

        const data = await scheduleService.getPreferenceForSchedule({ userId });

        SuccessResponse.ok(res, data);
    }

    /**
     * Batch update user preferences for schedule
     * @param req - Express request object
     * @param res - Express response object
     */
    async batchUpdatePreference(req: Request, res: Response) {
        const userId = req.currentUser?.userId;
        const preferences = req.body;

        if (!preferences) {
            throw new BadRequest('Preferences are required');
        }

        const data = await scheduleService.batchUpdatePreferenceForSchedule({ userId, preferences });

        SuccessResponse.created(res, data);
    }
}

export const scheduleController = new ScheduleController();
