import { Request, Response } from 'express';
import { SuccessResponse } from '@/core/success';
import { BadRequest } from '@/core/error';
import { progressService } from '@/services/progress/progress.service';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';


class ProgressController {
  private DAY_OF_WEEK = 7;
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
   
      const userId = this.extractUserId(req);
      // const userId = 1;
      const query = {
        userId: userId,
        ...req.query
      };
      
      const progress = await progressService.getAllProgress(query);
      SuccessResponse.ok(res, progress);
    
  }

  /**
   * Get specific progress record by ID
   */
  public async getProgressById(req: Request, res: Response): Promise<void> {
   
      const { id } = req.params;
      const progressId = Number(id);
      if (isNaN(progressId)) throw new BadRequest('Invalid progress ID');
      
      const progress = await progressService.getProgressById(progressId);
      SuccessResponse.ok(res, progress);
   
  }

  /**
   * Create new progress record
   */
  public async createProgress(req: Request, res: Response): Promise<void> {
    
      const userId = this.extractUserId(req);
      const progressData = {
        ...req.body,
        userId: userId
      };
      const progress = await progressService.createProgress(progressData);
      SuccessResponse.created(res, progress);
    
  }

  public async updateProgress(req: Request, res: Response): Promise<void> {
   
      const { progressId, ...updateData } = req.body;
      const id = Number(progressId);
      if (isNaN(id)) throw new BadRequest('Invalid progress ID');
      
      const progress = await progressService.updateProgress(id, updateData);
      SuccessResponse.ok(res, progress);
    
  }

  /**
   * Delete progress record
   */
  public async deleteProgress(req: Request, res: Response): Promise<void> {
    
      const { id } = req.params;
      const progressId = Number(id);
      if (isNaN(progressId)) throw new BadRequest('Invalid progress ID');
      
      const progress = await progressService.deleteProgress(progressId);
      SuccessResponse.ok(res, progress);
    
  }

  /**
   * Get learning progress statistics for the current user
   */  public async getStatistics(req: Request, res: Response): Promise<void> {
    
      const userId = this.extractUserId(req);
      const stats = await progressService.getProgressStatistics(userId);
      SuccessResponse.ok(res, stats);   
    
  }
  /**
   * Get dashboard statistics including study hours, completed topics, etc.
   */
  public async getDashboardStatistics(req: Request, res: Response): Promise<void> {
   
      const userId = this.extractUserId(req);
      const [
        stats,
        completedTopics,
        dailyHours,
        totalStudyTime,
        learningMethods
      ] = await Promise.all([
        progressService.getProgressStatistics(userId),
        progressService.getCompletedTopicsCount(userId),
        progressService.getDailyStudyHours(userId, this.DAY_OF_WEEK),
        progressService.getTotalStudyTime(userId, this.DAY_OF_WEEK),
        progressService.getLearningMethodsDistribution(userId)
      ]);

      const dashboardStats = {
        totalStudyHours: totalStudyTime,
        completedTopics,
        dailyStudyHours: dailyHours,
        learningMethodsDistribution: learningMethods,
        progressStatistics: stats
      };

      SuccessResponse.ok(res, dashboardStats);
   
  }
  /**
   * Get daily study records for the current user
   */
  public async getDailyStudyRecords(req: Request, res: Response): Promise<void> {
    
      const userId = this.extractUserId(req);
      const days = req.query.days ? Number(req.query.days) : this.DAY_OF_WEEK;
      const records = await progressService.getDailyStudyHours(userId, days);
      SuccessResponse.ok(res, records);
  
  }

  /**
   * Get learning methods distribution
   */
  public async getLearningMethodsDistribution(req: Request, res: Response): Promise<void> {
  
      const userId = this.extractUserId(req);
      const distribution = await progressService.getLearningMethodsDistribution(userId);
      SuccessResponse.ok(res, distribution);
  
  }

  /**
   * Get weekly comparison data
   */
  public async getWeeklyComparison(req: Request, res: Response): Promise<void> {
    
      const userId = this.extractUserId(req);
      // Get current week and previous week data
      const [currentWeek, previousWeek] = await Promise.all([
        progressService.getTotalStudyTime(userId, this.DAY_OF_WEEK),
        progressService.getTotalStudyTime(userId, this.DAY_OF_WEEK + 7)
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
    
  }

  /**
   * Get completed topics count
   */
  public async getCompletedTopics(req: Request, res: Response): Promise<void> {
    
      const userId = this.extractUserId(req);
      const completedTopics = await progressService.getCompletedTopicsCount(userId);
      SuccessResponse.ok(res, { completedTopics });
   
  }

  /**
   * Update learning tracking data from client
   * Updates both progress table and daily_study_records
   */
  public async updateLearningTracking(req: Request, res: Response): Promise<void> {
    
      const userId = this.extractUserId(req);
      const {
        topicId,
        contentType,
        timeSpent, // in milliseconds from client
        isCompleted = false,
        cardsStudied = 0,
        accuracy = 0,
        sessionData
      } = req.body;

      if (!topicId || !contentType || typeof timeSpent !== 'number') {
        throw new BadRequest('Missing required fields: topicId, contentType, timeSpent');
      }

      // Convert timeSpent from milliseconds to seconds for database
      const timeSpentSeconds = Math.floor(timeSpent / 1000);
      const timeSpentMinutes = Math.floor(timeSpent / (1000 * 60));
      
      // For learning tracking, ensure at least 1 minute is recorded if cards were studied
      const recordedMinutes = cardsStudied > 0 ? Math.max(timeSpentMinutes, 1) : timeSpentMinutes;

      // Update or create progress record
      await progressService.updateLearningProgress({
        userId,
        topicId,
        contentType,
        timeSpent: timeSpentSeconds,
        isCompleted,
        metadata: {
          cardsStudied,
          accuracy,
          sessionData,
          lastUpdated: new Date().toISOString()
        }
      });

      // Update daily study records
      await progressService.updateDailyStudyRecord({
        userId,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        additionalMinutes: recordedMinutes,
        sessionIncrement: 1
      });

      SuccessResponse.ok(res, { 
        message: 'Learning tracking updated successfully',
        timeSpentMinutes,
        isCompleted 
      });
   
  }
}

export const progressController = new ProgressController();
