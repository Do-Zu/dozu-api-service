import db from '@/libs/drizzleClient.lib';
import {
  eq,
  and,
  gte,
  count,
  sum,
  avg,
} from 'drizzle-orm';
import {
  IProgress,
  IProgressCreate,
  IProgressUpdate,
  IProgressQuery,
  ContentType,
  ProgressStatus,
} from '@/types/progress/progress.type';
import logger from '@/utils/logger';
import { progressTable } from '@/models/progress/progress.model';
import { dailyStudyRecordsTable } from '@/models/progress/dailystudy.model';

class ProgressRepository {
  async findAll(query: IProgressQuery = {}): Promise<IProgress[]> {
    try {
      const conditions = [];
      if (query.userId) conditions.push(eq(progressTable.userId, query.userId));
      if (query.contentType) conditions.push(eq(progressTable.contentType, query.contentType));
      if (query.status) conditions.push(eq(progressTable.status, query.status));      const result = await db
        .select()
        .from(progressTable)
        .where(conditions.length ? and(...conditions) : undefined);

      return result as IProgress[];
    } catch (error) {
      logger.error('Error fetching progress:', error);
      throw error;
    }
  }
  async findById(id: string): Promise<IProgress | undefined> {
    try {
      const result = await db
        .select()
        .from(progressTable)
        .where(eq(progressTable.id, id));

      return result[0] as IProgress;
    } catch (error) {
      logger.error('Error fetching progress by id:', error);
      throw error;
    }
  }
  async create(data: IProgressCreate): Promise<IProgress> {
    try {
      const progressId = `progress_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      const result = await db
        .insert(progressTable)
        .values({
          id: progressId,
          ...data,
          completionPercentage: data.completionPercentage || 0,
          status: data.status || ProgressStatus.NOT_STARTED,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastInteractionAt: new Date(),
        })        .returning();

      return result[0] as IProgress;
    } catch (error) {
      logger.error('Error creating progress:', error);
      throw error;
    }
  }

  async update(id: string, data: IProgressUpdate): Promise<IProgress | undefined> {
    try {
      const result = await db
        .update(progressTable)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(progressTable.id, id))        .returning();

      return result[0] as IProgress;
    } catch (error) {
      logger.error('Error updating progress:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<IProgress | undefined> {
    try {
      const result = await db
        .delete(progressTable)
        .where(eq(progressTable.id, id))        .returning();

      return result[0] as IProgress;
    } catch (error) {
      logger.error('Error deleting progress:', error);
      throw error;
    }
  }

  async getCompletedTopicsCount(userId: string | number): Promise<number> {
    try {
      const result = await db
        .select({ count: count() })
        .from(progressTable)
        .where(
          and(
            eq(progressTable.userId, String(userId)),
            eq(progressTable.status, ProgressStatus.COMPLETED)
          )
        );

      return Number(result[0]?.count || 0);
    } catch (error) {
      logger.error('Error getting completed topics count:', error);
      throw error;
    }
  }
  async getTotalStudyTime(userId: string | number, days: number = 7): Promise<number> {
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      const fromDateString = fromDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD

      const result = await db
        .select({ totalMinutes: sum(dailyStudyRecordsTable.totalMinutes) })
        .from(dailyStudyRecordsTable)
        .where(
          and(
            eq(dailyStudyRecordsTable.userId, String(userId)),
            gte(dailyStudyRecordsTable.date, fromDateString)
          )
        );

      const minutes = Number(result[0]?.totalMinutes || 0);
      return Math.round((minutes / 60) * 10) / 10;
    } catch (error) {
      logger.error('Error getting total study time:', error);
      throw error;
    }
  }
  async getDailyStudyHours(userId: string | number, days: number = 7): Promise<Array<{ day: string; hours: number; date: string }>> {
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      const fromDateString = fromDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD

      const result = await db
        .select({
          date: dailyStudyRecordsTable.date,
          totalMinutes: sum(dailyStudyRecordsTable.totalMinutes),
        })
        .from(dailyStudyRecordsTable)
        .where(
          and(
            eq(dailyStudyRecordsTable.userId, String(userId)),
            gte(dailyStudyRecordsTable.date, fromDateString)
          )
        )
        .groupBy(dailyStudyRecordsTable.date);

      return result.map(row => ({
        day: new Date(row.date).toLocaleDateString('en-US', { weekday: 'short' }),
        hours: Math.round((Number(row.totalMinutes) / 60) * 10) / 10,
        date: row.date, // row.date is already a string in YYYY-MM-DD format
      }));
    } catch (error) {
      logger.error('Error getting daily study hours:', error);
      throw error;
    }
  }

  async getLearningMethodsDistribution(userId: string | number): Promise<Array<{ method: ContentType; count: number }>> {
    try {
      const result = await db
        .select({
          contentType: progressTable.contentType,
          count: count(),
        })
        .from(progressTable)
        .where(
          and(
            eq(progressTable.userId, String(userId)),
            eq(progressTable.status, ProgressStatus.COMPLETED)
          )
        )
        .groupBy(progressTable.contentType);

      return result.map(row => ({
        method: row.contentType as ContentType,
        count: Number(row.count),
      }));
    } catch (error) {
      logger.error('Error getting learning methods distribution:', error);
      throw error;
    }
  }

  async getProgressStatistics(userId: string | number): Promise<{
    totalContents: number;
    completedContents: number;
    inProgressContents: number;
    notStartedContents: number;
    averageScore: number;
    totalTimeSpent: number;
  }> {
    try {
      const total = await db
        .select({ count: count() })
        .from(progressTable)
        .where(eq(progressTable.userId, String(userId)));

      const completed = await db
        .select({ count: count() })
        .from(progressTable)
        .where(
          and(
            eq(progressTable.userId, String(userId)),
            eq(progressTable.status, ProgressStatus.COMPLETED)
          )
        );

      const inProgress = await db
        .select({ count: count() })
        .from(progressTable)
        .where(
          and(
            eq(progressTable.userId, String(userId)),
            eq(progressTable.status, ProgressStatus.IN_PROGRESS)
          )
        );

      const notStarted = await db
        .select({ count: count() })
        .from(progressTable)
        .where(
          and(
            eq(progressTable.userId, String(userId)),
            eq(progressTable.status, ProgressStatus.NOT_STARTED)
          )
        );

      const scoreResult = await db
        .select({ avgScore: avg(progressTable.score) })
        .from(progressTable)
        .where(eq(progressTable.userId, String(userId)));

      const totalTimeResult = await db
        .select({ totalMinutes: sum(dailyStudyRecordsTable.totalMinutes) })
        .from(dailyStudyRecordsTable)
        .where(eq(dailyStudyRecordsTable.userId, String(userId)));

      return {
        totalContents: Number(total[0]?.count || 0),
        completedContents: Number(completed[0]?.count || 0),
        inProgressContents: Number(inProgress[0]?.count || 0),
        notStartedContents: Number(notStarted[0]?.count || 0),
        averageScore: scoreResult[0]?.avgScore ? Math.round(Number(scoreResult[0].avgScore) * 10) / 10 : 0,
        totalTimeSpent: Number(totalTimeResult[0]?.totalMinutes || 0) * 60, // seconds
      };
    } catch (error) {
      logger.error('Error getting progress statistics:', error);
      throw error;
    }
  }
}

export const progressRepository = new ProgressRepository();
