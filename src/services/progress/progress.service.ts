import { InternalServerError, NotFoundError } from '@/core/error';
import { progressRepository } from '@/repositories/progress/progress.repo';
import {
  IProgress,
  IProgressCreate,
  IProgressUpdate,
  IProgressQuery,
  ContentType,
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
}

export const progressService = new ProgressService();