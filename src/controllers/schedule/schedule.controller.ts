import { Request, Response } from 'express';
import { scheduleService } from '@/services/schedule/schedule.service';
import { SuccessResponse } from '@/core/success';

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
    const data = await scheduleService.generateSchedule();

    SuccessResponse.ok(res, data);
  }
}

export const scheduleController = new ScheduleController();
