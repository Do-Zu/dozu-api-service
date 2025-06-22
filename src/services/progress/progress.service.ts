import { progressRepository } from '@/repositories/progress/progress.repo';
import {
  IProgress,
  IProgressCreate,
  IProgressUpdate,
  IProgressQuery,
  ContentType,
} from '@/types/progress/progress.type';

class ProgressService {
  async getAllProgress(query: IProgressQuery = {}): Promise<IProgress[]> {
    return await progressRepository.findAll(query);
  }

  async getProgressById(id: string): Promise<IProgress> {
    const progress = await progressRepository.findById(id);
    if (!progress) {
      throw new Error('Progress not found');
    }
    return progress;
  }

  async createProgress(data: IProgressCreate): Promise<IProgress> {
    // Optional: validate data before saving
    if (!data.userId || !data.contentId || !data.contentType) {
      throw new Error('Missing required progress fields');
    }

    return await progressRepository.create(data);
  }
  async updateProgress(id: string, data: IProgressUpdate): Promise<IProgress> {
    const existing = await progressRepository.findById(id);
    if (!existing) {
      throw new Error('Progress not found');
    }

    const updated = await progressRepository.update(id, data);
    if (!updated) {
      throw new Error('Failed to update progress');
    }
    return updated;
  }

  async deleteProgress(id: string): Promise<IProgress> {
    const deleted = await progressRepository.delete(id);
    if (!deleted) {
      throw new Error('Progress not found or already deleted');
    }
    return deleted;
  }

  async getCompletedTopicsCount(userId: string): Promise<number> {
    return await progressRepository.getCompletedTopicsCount(userId);
  }

  async getTotalStudyTime(userId: string, days = 7): Promise<number> {
    return await progressRepository.getTotalStudyTime(userId, days);
  }
  async getDailyStudyHours(userId: string, days = 7): Promise<Array<{ day: string; hours: number; date: string }>> {
    return await progressRepository.getDailyStudyHours(userId, days);
  }

  async getLearningMethodsDistribution(userId: string): Promise<Array<{ method: ContentType; count: number }>> {
    return await progressRepository.getLearningMethodsDistribution(userId);
  }

  async getProgressStatistics(userId: string): Promise<{
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