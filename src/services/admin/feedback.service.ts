import db from '@/libs/drizzleClient.lib';
import { and, count, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';
import { feedbackTable } from '@/models';
import { NotFoundError } from '@/core/error';
import type { GetAdminFeedbackQueryDto, UpdateFeedbackDto } from '@/dtos/admin/feedback.dto';

class AdminFeedbackService {
  async getAllFeedback(filters: GetAdminFeedbackQueryDto) {
    const {
      page = 1,
      limit = 50,
      minScore,
      maxScore,
      hasImage,
      status,
      category,
      search,
      importantOnly,
    } = filters;

    const offset = (page - 1) * limit;
  const conditions: SQL[] = [];

    // Golden rule default: hide spam
    const effectiveImportantOnly = importantOnly ?? true;
    if (effectiveImportantOnly) {
      conditions.push(gte(feedbackTable.score, 3));
    }

    if (minScore !== undefined) conditions.push(gte(feedbackTable.score, minScore));
    if (maxScore !== undefined) conditions.push(lte(feedbackTable.score, maxScore));
    if (hasImage !== undefined) conditions.push(eq(feedbackTable.hasImage, hasImage));
    if (status) conditions.push(eq(feedbackTable.status, status));
    if (category) conditions.push(eq(feedbackTable.category, category));

    if (search) {
      // single SQL condition to avoid nullable typing issues
      conditions.push(sql`
        (
          coalesce(${feedbackTable.message}, '') ILIKE ${`%${search}%`}
          OR coalesce(${feedbackTable.userEmail}, '') ILIKE ${`%${search}%`}
          OR coalesce(${feedbackTable.userName}, '') ILIKE ${`%${search}%`}
        )
      `);
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const items = await db
      .select({
        feedbackId: feedbackTable.feedbackId,
        message: feedbackTable.message,
        imageUrl: feedbackTable.imageUrl,
        hasImage: feedbackTable.hasImage,
        isImportant: feedbackTable.isImportant,
        score: feedbackTable.score,
        reasons: feedbackTable.reasons,
        status: feedbackTable.status,
        category: feedbackTable.category,
        userId: feedbackTable.userId,
        userEmail: feedbackTable.userEmail,
        userName: feedbackTable.userName,
        createdAt: feedbackTable.createdAt,
        updatedAt: feedbackTable.updatedAt,
      })
      .from(feedbackTable)
      .where(whereClause)
      .orderBy(desc(feedbackTable.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select({ count: count() })
      .from(feedbackTable)
      .where(whereClause);

    return {
      items,
      total: Number(totalResult[0]?.count || 0),
      page,
      limit,
    };
  }

  async updateFeedback(feedbackId: number, payload: UpdateFeedbackDto) {
    const [updated] = await db
      .update(feedbackTable)
      .set({
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.category !== undefined ? { category: payload.category ?? null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(feedbackTable.feedbackId, feedbackId))
      .returning({
        feedbackId: feedbackTable.feedbackId,
        status: feedbackTable.status,
        category: feedbackTable.category,
        updatedAt: feedbackTable.updatedAt,
      });

    if (!updated) throw new NotFoundError('Feedback not found');
    return updated;
  }

  async autoIgnoreLowScore(days = 7) {
    const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const updated = await db
      .update(feedbackTable)
      .set({ status: 'ignored', updatedAt: new Date() })
      .where(
        and(
          lte(feedbackTable.score, 1),
          lte(feedbackTable.createdAt, threshold),
          eq(feedbackTable.status, 'new')
        )
      )
      .returning({ feedbackId: feedbackTable.feedbackId });

    return { updatedCount: updated.length, updatedIds: updated.map((x) => x.feedbackId) };
  }
}

export const adminFeedbackService = new AdminFeedbackService();
