import db from '@/libs/drizzleClient.lib';
import { FeynmanSessionRecord, feynmanSessionsTable } from '@/models';
import {
    FeynmanSessionSavePayload,
    FeynmanSessionUpdate,
    IGetSession,
    IUpdateReview,
} from '@/types/feynman/feynman.type';
import { getSystemDate } from '@/utils/date';
import { and, eq } from 'drizzle-orm';

/**
 * Repository for Feynman data access operations
 */
class FeynmanRepository {
    public storageSessionFeynman = async (payload: FeynmanSessionSavePayload) => {
        const {
            topicId,
            explanationHtml,
            explanationText,
            highlightedWords,
            method,
            questions,
            step,
            review,
            version,
        } = payload;

        await db.insert(feynmanSessionsTable).values({
            topicId,
            explanationHtml,
            explanationText,
            method,
            questions,
            savedAt: getSystemDate(),
            highlightedWords,
            step,
            review,
            version,
        });
    };

    public updateSession = async (payload: FeynmanSessionUpdate) => {
        const { topicId, method } = payload;

        const { explanationHtml, explanationText, highlightedWords, questions, step, review, version } = payload;

        const setData: Partial<FeynmanSessionRecord> = {};

        if (explanationHtml != null) setData.explanationHtml = explanationHtml;
        if (explanationText != null) setData.explanationText = explanationText;
        if (highlightedWords != null) setData.highlightedWords = highlightedWords;
        if (questions != null) setData.questions = questions;
        if (step != null) setData.step = step;
        if (review != null) setData.review = review;
        if (version != null) setData.version = version;

        setData.savedAt = getSystemDate();

        await db.transaction(async tx => {
            const updated = await tx
                .update(feynmanSessionsTable)
                .set(setData)
                .where(and(eq(feynmanSessionsTable.topicId, topicId), eq(feynmanSessionsTable.method, method)))
                .returning({ id: feynmanSessionsTable.id });

            if (updated.length > 0) return;

            const questionInsert = questions ?? {
                questions: [],
                hints: [],
                detectedGaps: [],
            };

            await tx.insert(feynmanSessionsTable).values({
                topicId,
                method,
                explanationHtml,
                explanationText,
                highlightedWords,
                questions: questionInsert,
                step,
                review,
                version,
                savedAt: getSystemDate(),
            });
        });
    };

    public updateReviewSession = async ({ topicId, method, review }: IUpdateReview) => {
        await db
            .update(feynmanSessionsTable)
            .set({
                review,
            })
            .where(and(eq(feynmanSessionsTable.topicId, topicId), eq(feynmanSessionsTable.method, method)));
    };

    public getSession = async ({ topicId, method }: IGetSession) => {
        const [row] = await db
            .select()
            .from(feynmanSessionsTable)
            .where(and(eq(feynmanSessionsTable.topicId, topicId), eq(feynmanSessionsTable.method, method)));

        return row;
    };
}

export const feynmanRepo = new FeynmanRepository();
