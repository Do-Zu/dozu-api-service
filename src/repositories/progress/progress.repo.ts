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
import { getDateFormatted } from '@/utils/date/date';
import { minutesToHours, generateDailyStudyHoursWithEmptyDays } from '@/utils/progress/progressHelpers';

import { progressTable } from '@/models/progress/progress.model';
import { dailyStudyRecordsTable, DailyStudyRecord } from '@/models/progress/dailyStudy.model';

class ProgressRepository {
  async findAllProgress(query: IProgressQuery): Promise<IProgress[]> {
    const conditions = [];
    if (query.userId) conditions.push(eq(progressTable.userId, query.userId));
    if (query.topicId) conditions.push(eq(progressTable.topicId, query.topicId));
    if (query.contentType) conditions.push(eq(progressTable.contentType, query.contentType));
    if (query.status) conditions.push(eq(progressTable.status, query.status));
    const result = await db
      .select()
      .from(progressTable)
      .where(conditions.length ? and(...conditions) : undefined);

    return result as IProgress[];
  }

  async findByIdProgress(progressId: number): Promise<IProgress | undefined> {
    const result = await db
      .select()
      .from(progressTable)
      .where(eq(progressTable.progressId, progressId));
    return result[0] as IProgress;
  }

  async createProgress(data: IProgressCreate): Promise<IProgress> {
    const result = await db
      .insert(progressTable)
      .values({
        userId: data.userId,
        topicId: data.topicId,
        contentType: data.contentType,
        status: data.status || ProgressStatus.NOT_STARTED,
        completionPercentage: data.completionPercentage || 0,
        score: data.score,
        metadata: data.metadata,
        updatedAt: new Date(),
        lastInteractionAt: new Date(),
      })
      .returning();

    return result[0] as IProgress;
  }

  async updateProgress(progressId: number, data: IProgressUpdate): Promise<IProgress | undefined> {
    const result = await db
      .update(progressTable)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(progressTable.progressId, progressId))
      .returning();

    return result[0] as IProgress;
  }

  async deleteProgress(progressId: number): Promise<IProgress | undefined> {
    const result = await db
      .delete(progressTable)
      .where(eq(progressTable.progressId, progressId))
      .returning();

    return result[0] as IProgress;
  }

  async getCompletedTopicsCount(userId: number): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(progressTable)
      .where(
        and(
          eq(progressTable.userId, userId),
          eq(progressTable.status, ProgressStatus.COMPLETED)
        )
      );

    return Number(result[0]?.count || 0);
  }

  async getTotalStudyTime(userId: number, days: number = 7): Promise<number> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromDateString = getDateFormatted(fromDate);

    const result = await db
      .select({ totalMinutes: sum(dailyStudyRecordsTable.totalMinutes) })
      .from(dailyStudyRecordsTable)
      .where(
        and(
          eq(dailyStudyRecordsTable.userId, userId),
          gte(dailyStudyRecordsTable.date, fromDateString)
        )
      );

    return minutesToHours(result[0]?.totalMinutes);
  }

  async getDailyStudyHours(userId: number, days: number = 7): Promise<Array<{ day: string; hours: number; date: string }>> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromDateString = getDateFormatted(fromDate);

    const result = await db
      .select({
        date: dailyStudyRecordsTable.date,
        totalMinutes: sum(dailyStudyRecordsTable.totalMinutes),
      })
      .from(dailyStudyRecordsTable)
      .where(
        and(
          eq(dailyStudyRecordsTable.userId, userId),
          gte(dailyStudyRecordsTable.date, fromDateString)
        )
      )
      .groupBy(dailyStudyRecordsTable.date);

    // Fill missing days with 0 hours to ensure complete 7-day chart
    return generateDailyStudyHoursWithEmptyDays(result, days);
  }

  async getLearningMethodsDistribution(userId: number): Promise<Array<{ method: ContentType; count: number }>> {
    const result = await db
      .select({
        contentType: progressTable.contentType,
        count: count(),
      })
      .from(progressTable)
      .where(
        and(
          eq(progressTable.userId, userId),
          eq(progressTable.status, ProgressStatus.COMPLETED)
        )
      )
      .groupBy(progressTable.contentType);

    return result.map(row => ({
      method: row.contentType as ContentType,
      count: Number(row.count),
    }));
  }

  async getProgressStatistics(userId: number): Promise<{
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
        .where(eq(progressTable.userId, userId));

      const completed = await db
        .select({ count: count() })
        .from(progressTable)
        .where(
          and(
            eq(progressTable.userId, userId),
            eq(progressTable.status, ProgressStatus.COMPLETED)
          )
        );

      const inProgress = await db
        .select({ count: count() })
        .from(progressTable)
        .where(
          and(
            eq(progressTable.userId, userId),
            eq(progressTable.status, ProgressStatus.IN_PROGRESS)
          )
        );

      const notStarted = await db
        .select({ count: count() })
        .from(progressTable)
        .where(
          and(
            eq(progressTable.userId, userId),
            eq(progressTable.status, ProgressStatus.NOT_STARTED)
          )
        );

      const scoreResult = await db
        .select({ avgScore: avg(progressTable.score) })
        .from(progressTable)
        .where(eq(progressTable.userId, userId));

      const totalTimeResult = await db
        .select({ totalMinutes: sum(dailyStudyRecordsTable.totalMinutes) })
        .from(dailyStudyRecordsTable)
        .where(eq(dailyStudyRecordsTable.userId, userId));

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

  // DAILY STUDY RECORDS
  async createDailyStudyRecord(data: {
    userId: number;
    date?: string; // YYYY-MM-DD, optional - defaults to today
    totalMinutes: number;
    sessionsCount?: number;
  }): Promise<DailyStudyRecord> {
    const dateString = data.date || getDateFormatted(new Date());

    const result = await db
      .insert(dailyStudyRecordsTable)
      .values({
        userId: data.userId,
        date: dateString,
        totalMinutes: data.totalMinutes,
        sessionsCount: data.sessionsCount || 1,
        updatedAt: new Date(),
      })
      .returning();

    return result[0] as DailyStudyRecord;
  }

  async updateDailyStudyRecord(userId: number, date: string, additionalMinutes: number): Promise<DailyStudyRecord> {
    const existing = await db
      .select()
      .from(dailyStudyRecordsTable)
      .where(
        and(
          eq(dailyStudyRecordsTable.userId, userId),
          eq(dailyStudyRecordsTable.date, date)
        )
      );

    if (existing.length > 0) {
      const result = await db
        .update(dailyStudyRecordsTable)
        .set({
          totalMinutes: existing[0].totalMinutes + additionalMinutes,
          sessionsCount: existing[0].sessionsCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(dailyStudyRecordsTable.dailyStudyId, existing[0].dailyStudyId))
        .returning();

      return result[0] as DailyStudyRecord;
    } else {
      return await this.createDailyStudyRecord({
        userId,
        date,
        totalMinutes: additionalMinutes,
        sessionsCount: 1,
      });
    }
  }
}

export const progressRepository = new ProgressRepository();