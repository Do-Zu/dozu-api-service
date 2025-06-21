/**
 * Controller class for Progress (learning statistics) functionality
 */
import { Request, Response } from 'express';
import { SuccessResponse } from '@/core/success';
import { BadRequest } from '@/core/error';
import ProgressService from '@/services/progress/progress.service';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';

class ProgressController {
  /**
   * Get learning progress statistics for the current user
   * @param req Request object (should contain user info from auth middleware)
   * @param res Response object
   */
  public async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      let userId = getUserIdFromRequest(req);
      if (typeof userId !== 'number') userId = Number(userId);
      const stats = await ProgressService.getStatistics(userId);
      SuccessResponse.ok(res, stats);
    } catch (error) {
      if (error instanceof BadRequest) {
        throw error;
      }
      throw new BadRequest('Failed to fetch statistics');
    }
  }

  /**
   * Get dashboard statistics including study hours, completed topics, etc.
   */
  public async getDashboardStatistics(req: Request, res: Response): Promise<void> {
    try {
      let userId = getUserIdFromRequest(req);
      if (typeof userId !== 'number') userId = Number(userId);
      const dashboardStats = await ProgressService.getDashboardStatistics(userId);
      SuccessResponse.ok(res, dashboardStats);
    } catch (error) {
      if (error instanceof BadRequest) {
        throw error;
      }
      throw new BadRequest('Failed to fetch dashboard statistics');
    }
  }

  /**
   * Get daily study records for the current user
   */
  public async getDailyStudyRecords(req: Request, res: Response): Promise<void> {
    try {
      let userId = getUserIdFromRequest(req);
      if (typeof userId !== 'number') userId = Number(userId);
      const days = req.query.days ? Number(req.query.days) : 7;
      const dailyRecords = await ProgressService.getDailyStudyRecords(userId, days);
      SuccessResponse.ok(res, dailyRecords);
    } catch (error) {
      if (error instanceof BadRequest) {
        throw error;
      }
      throw new BadRequest('Failed to fetch daily study records');
    }
  }

  /**
   * Get learning methods distribution
   */
  public async getLearningMethodsDistribution(req: Request, res: Response): Promise<void> {
    try {
      let userId = getUserIdFromRequest(req);
      if (typeof userId !== 'number') userId = Number(userId);
      const distribution = await ProgressService.getLearningMethodsDistribution(userId);
      SuccessResponse.ok(res, distribution);
    } catch (error) {
      if (error instanceof BadRequest) {
        throw error;
      }
      throw new BadRequest('Failed to fetch learning methods distribution');
    }
  }

  /**
   * Get weekly comparison data
   */
  public async getWeeklyComparison(req: Request, res: Response): Promise<void> {
    try {
      let userId = getUserIdFromRequest(req);
      if (typeof userId !== 'number') userId = Number(userId);
      const comparison = await ProgressService.getWeeklyComparison(userId);
      SuccessResponse.ok(res, comparison);
    } catch (error) {
      if (error instanceof BadRequest) {
        throw error;
      }
      throw new BadRequest('Failed to fetch weekly comparison');
    }
  }

  /**
   * Get completed topics count
   */
  public async getCompletedTopics(req: Request, res: Response): Promise<void> {
    try {
      let userId = getUserIdFromRequest(req);
      if (typeof userId !== 'number') userId = Number(userId);
      const completedTopics = await ProgressService.getCompletedTopicsCount(userId);
      SuccessResponse.ok(res, { completedTopics });
    } catch (error) {
      if (error instanceof BadRequest) {
        throw error;
      }
      throw new BadRequest('Failed to fetch completed topics');
    }
  }
}

export const progressController = new ProgressController();