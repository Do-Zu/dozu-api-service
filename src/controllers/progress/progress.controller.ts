import { Request, Response } from 'express';
import { SuccessResponse } from '@/core/success';
import { BadRequest } from '@/core/error';
import { progressService } from '@/services/progress/progress.service';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';

class ProgressController {
  private extractUserId(req: Request): number {
    const id = getUserIdFromRequest(req);
    const userId = typeof id === 'number' ? id : Number(id);
    if (isNaN(userId)) throw new BadRequest('Invalid user ID');
    return userId;
  }

  /**
   * Get all progress records for the current user
   */
  public async getAllProgress(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const query = {
        userId: String(userId),
        ...req.query
      };
      const progress = await progressService.getAllProgress(query);
      SuccessResponse.ok(res, progress);
    } catch (error: unknown) {
      throw error instanceof BadRequest
        ? error
        : new BadRequest('Failed to fetch progress records');
    }
  }

  /**
   * Get specific progress record by ID
   */
  public async getProgressById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const progress = await progressService.getProgressById(id);
      SuccessResponse.ok(res, progress);
    } catch (error: unknown) {
      throw error instanceof BadRequest
        ? error
        : new BadRequest('Failed to fetch progress record');
    }
  }

  /**
   * Create new progress record
   */
  public async createProgress(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const progressData = {
        ...req.body,
        userId: String(userId)
      };
      const progress = await progressService.createProgress(progressData);
      SuccessResponse.created(res, progress);
    } catch (error: unknown) {
      throw error instanceof BadRequest
        ? error
        : new BadRequest('Failed to create progress record');
    }
  }

  /**
   * Update progress record
   */
  public async updateProgress(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const progress = await progressService.updateProgress(id, req.body);
      SuccessResponse.ok(res, progress);
    } catch (error: unknown) {
      throw error instanceof BadRequest
        ? error
        : new BadRequest('Failed to update progress record');
    }
  }

  /**
   * Delete progress record
   */
  public async deleteProgress(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const progress = await progressService.deleteProgress(id);
      SuccessResponse.ok(res, progress);
    } catch (error: unknown) {
      throw error instanceof BadRequest
        ? error
        : new BadRequest('Failed to delete progress record');
    }
  }

  /**
   * Get learning progress statistics for the current user
   */  public async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const stats = await progressService.getProgressStatistics(String(userId));
      SuccessResponse.ok(res, stats);    } catch (error: unknown) {
      throw error instanceof BadRequest
        ? error
        : new BadRequest('Failed to fetch statistics');
    }
  }
  /**
   * Get dashboard statistics including study hours, completed topics, etc.
   */
  public async getDashboardStatistics(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const [
        stats,
        completedTopics,
        dailyHours,
        totalStudyTime,
        learningMethods
      ] = await Promise.all([
        progressService.getProgressStatistics(String(userId)),
        progressService.getCompletedTopicsCount(String(userId)),
        progressService.getDailyStudyHours(String(userId), 7),
        progressService.getTotalStudyTime(String(userId), 7),
        progressService.getLearningMethodsDistribution(String(userId))
      ]);

      const dashboardStats = {
        totalStudyHours: totalStudyTime,
        completedTopics,
        dailyStudyHours: dailyHours,
        learningMethodsDistribution: learningMethods,
        progressStatistics: stats
      };

      SuccessResponse.ok(res, dashboardStats);
    } catch (error: unknown) {
      throw error instanceof BadRequest
        ? error
        : new BadRequest('Failed to fetch dashboard statistics');
    }
  }
  /**
   * Get daily study records for the current user
   */
  public async getDailyStudyRecords(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const days = req.query.days ? Number(req.query.days) : 7;
      const records = await progressService.getDailyStudyHours(String(userId), days);
      SuccessResponse.ok(res, records);
    } catch (error: unknown) {
      throw error instanceof BadRequest
        ? error
        : new BadRequest('Failed to fetch daily study records');
    }
  }

  /**
   * Get learning methods distribution
   */
  public async getLearningMethodsDistribution(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const distribution = await progressService.getLearningMethodsDistribution(String(userId));
      SuccessResponse.ok(res, distribution);
    } catch (error: unknown) {
      throw error instanceof BadRequest
        ? error
        : new BadRequest('Failed to fetch learning methods distribution');
    }
  }

  /**
   * Get weekly comparison data
   */
  public async getWeeklyComparison(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      // Get current week and previous week data
      const [currentWeek, previousWeek] = await Promise.all([
        progressService.getTotalStudyTime(String(userId), 7),
        progressService.getTotalStudyTime(String(userId), 14)
      ]);
      
      const previousWeekHours = previousWeek - currentWeek;
      const percentageChange = previousWeekHours > 0 
        ? ((currentWeek - previousWeekHours) / previousWeekHours) * 100 
        : 0;

      const comparison = {
        currentWeek: currentWeek,
        previousWeek: previousWeekHours,
        percentageChange: Math.round(percentageChange * 10) / 10
      };
      
      SuccessResponse.ok(res, comparison);
    } catch (error: unknown) {
      throw error instanceof BadRequest
        ? error
        : new BadRequest('Failed to fetch weekly comparison');
    }
  }

  /**
   * Get completed topics count
   */
  public async getCompletedTopics(req: Request, res: Response): Promise<void> {
    try {
      const userId = this.extractUserId(req);
      const completedTopics = await progressService.getCompletedTopicsCount(String(userId));
      SuccessResponse.ok(res, { completedTopics });
    } catch (error: unknown) {
      throw error instanceof BadRequest
        ? error
        : new BadRequest('Failed to fetch completed topics');
    }
  }
}

export const progressController = new ProgressController();
