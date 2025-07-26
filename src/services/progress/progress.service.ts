import logger from '@/utils/logger';
import { InternalServerError, NotFoundError } from '@/core/error';
import { progressRepository } from '@/repositories/progress/progress.repo';
import {
  IProgress,
  IProgressCreate,
  IProgressUpdate,
  IProgressQuery,
  ContentType,
  ProgressStatus,
  ProgressMetadata,
} from '@/types/progress/progress.type';
import { 
  createProgressSchema, 
  updateProgressSchema,
} from '@/middleware/validations/progress.validation';


class ProgressService {
  async getAllProgress(query: IProgressQuery = {}): Promise<IProgress[]> {
    return await progressRepository.findAllProgress(query);
  }

  async getProgressById(progressId: number): Promise<IProgress> {
    const progress = await progressRepository.findByIdProgress(progressId);
    if (!progress) {
      throw new NotFoundError('Progress not found');
    }
    return progress;
  }

  async createProgress(data: IProgressCreate): Promise<IProgress> {
    const validatedData = createProgressSchema.parse(data);
    return await progressRepository.createProgress(validatedData);
  }
  async updateProgress(progressId: number, data: IProgressUpdate): Promise<IProgress> {
    const validatedData = updateProgressSchema.parse(data);
    
    const existing = await progressRepository.findByIdProgress(progressId);
    if (!existing) {
      throw new NotFoundError('Progress not found');
    }

    const updated = await progressRepository.updateProgress(progressId, validatedData);
    if (!updated) {
      throw new InternalServerError('Failed to update progress');
    }
    return updated;
  }

  async deleteProgress(progressId: number): Promise<IProgress> {
    const deleted = await progressRepository.deleteProgress(progressId);
    if (!deleted) {
      throw new NotFoundError('Progress not found or already deleted');
    }
    return deleted;
  }

  async getCompletedTopicsCount(userId: number): Promise<number> {
    return await progressRepository.getCompletedTopicsCount(userId);
  }

  async getTotalStudyTime(userId: number, days = 7): Promise<number> {
    return await progressRepository.getTotalStudyTime(userId, days);
  }
  async getDailyStudyHours(userId: number, days = 7): Promise<Array<{ day: string; hours: number; date: string }>> {
    return await progressRepository.getDailyStudyHours(userId, days);
  }

  async getLearningMethodsDistribution(userId: number): Promise<Array<{ method: ContentType; count: number }>> {
    return await progressRepository.getLearningMethodsDistribution(userId);
  }

  async getProgressStatistics(userId: number): Promise<{
    totalContents: number;
    completedContents: number;
    inProgressContents: number;
    notStartedContents: number;
    averageScore: number;
    totalTimeSpent: number;
  }> {
    return await progressRepository.getProgressStatistics(userId);
  }

  /**
   * Update or create progress record for learning tracking
   */
  async updateLearningProgress(data: {
    userId: number;
    topicId: string;
    contentType: ContentType;
    timeSpent: number;
    isCompleted: boolean;
    metadata?: ProgressMetadata;
  }): Promise<IProgress> {
    const topicIdNum = parseInt(data.topicId);
    
    // First try to find existing progress
    const allProgress = await this.getAllProgress({ 
      userId: data.userId, 
      topicId: topicIdNum, 
      contentType: data.contentType 
    });
    const existingProgress = allProgress[0];

    if (existingProgress) {
      // Update existing progress
      const currentTimeSpent = existingProgress.metadata?.timeSpent || 0;
      const updatedTimeSpent = currentTimeSpent + data.timeSpent;
      
      // Only update to COMPLETED if isCompleted is true, otherwise keep existing status
      // This prevents downgrading from COMPLETED to IN_PROGRESS
      const updatedStatus = data.isCompleted 
        ? ProgressStatus.COMPLETED 
        : (existingProgress.status === ProgressStatus.COMPLETED 
           ? ProgressStatus.COMPLETED 
           : ProgressStatus.IN_PROGRESS);
      
      const updatedCompletionPercentage = data.isCompleted 
        ? 100 
        : (existingProgress.status === ProgressStatus.COMPLETED 
           ? 100 
           : existingProgress.completionPercentage);
      
      const updateData: IProgressUpdate = {
        status: updatedStatus,
        completionPercentage: updatedCompletionPercentage,
        metadata: {
          ...existingProgress.metadata,
          ...data.metadata,
          timeSpent: updatedTimeSpent
        }
      };

      return await this.updateProgress(existingProgress.progressId, updateData);
    } else {
      // Create new progress record
      const createData: IProgressCreate = {
        userId: data.userId,
        topicId: topicIdNum,
        contentType: data.contentType,
        status: data.isCompleted ? ProgressStatus.COMPLETED : ProgressStatus.IN_PROGRESS,
        completionPercentage: data.isCompleted ? 100 : 0,
        metadata: {
          ...data.metadata,
          timeSpent: data.timeSpent
        }
      };

      return await this.createProgress(createData);
    }
  }

  /**
   * Update daily study records
   */
  async updateDailyStudyRecord(data: {
    userId: number;
    date: string; // YYYY-MM-DD format
    additionalMinutes: number;
    sessionIncrement: number;
  }): Promise<void> {
    try {
      await progressRepository.updateDailyStudyRecord(
        data.userId, 
        data.date, 
        data.additionalMinutes
      );
      logger.info('Daily study record updated successfully:', data);
    } catch (error) {
      logger.error('Failed to update daily study record:', error);
      throw error;
    }
  }
}

export const progressService = new ProgressService();