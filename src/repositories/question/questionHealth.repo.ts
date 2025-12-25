import db from '@/libs/drizzleClient.lib';
import { questionsTable } from '@/models/quiz/question.model';
import { itemSpacedRepetitionTrackingTable } from '@/models';
import { and, eq } from 'drizzle-orm';

export type QuestionWithTrackingRow = {
  question: {
    questionId: number;
    topicId: number;
    questionText: string;
    choices: string[] | null;
    correctIndex: number | null;
    questionType: string | null;
    explain: string | null;
    hint: string | null;
    createdAt: Date | null;
  };
  tracking: {
    itemId: number;
    userId: number;
    topicId: number;
    type: 'flashcard' | 'question';
    createdAt: Date;
    repetitionNumber: number;
    easinessFactor: string; // decimal string
    reviewInterval: number;
    lastReviewed: string | null;
    nextReview: string;
    status: 'new' | 'learning' | 'review' | 'relearning';
    step: number | null;
  } | null;
};

class QuestionHealthRepo {
  async getQuestionsWithTrackingForHealth(topicId: number, userId: number): Promise<QuestionWithTrackingRow[]> {
    const rows = await db
      .select({
        question: {
          questionId: questionsTable.questionId,
          topicId: questionsTable.topicId,
          questionText: questionsTable.questionText,
          choices: questionsTable.choices,
          correctIndex: questionsTable.correctIndex,
          questionType: questionsTable.questionType,
          explain: questionsTable.explain,
          hint: questionsTable.hint,
          createdAt: questionsTable.createdAt,
        },
        tracking: {
          itemId: itemSpacedRepetitionTrackingTable.itemId,
          userId: itemSpacedRepetitionTrackingTable.userId,
          topicId: itemSpacedRepetitionTrackingTable.topicId,
          type: itemSpacedRepetitionTrackingTable.type,
          createdAt: itemSpacedRepetitionTrackingTable.createdAt,
          repetitionNumber: itemSpacedRepetitionTrackingTable.repetitionNumber,
          easinessFactor: itemSpacedRepetitionTrackingTable.easinessFactor,
          reviewInterval: itemSpacedRepetitionTrackingTable.reviewInterval,
          lastReviewed: itemSpacedRepetitionTrackingTable.lastReviewed,
          nextReview: itemSpacedRepetitionTrackingTable.nextReview,
          status: itemSpacedRepetitionTrackingTable.status,
          step: itemSpacedRepetitionTrackingTable.step,
        },
      })
      .from(questionsTable)
      .leftJoin(
        itemSpacedRepetitionTrackingTable,
        and(
          eq(itemSpacedRepetitionTrackingTable.itemId, questionsTable.questionId),
          eq(itemSpacedRepetitionTrackingTable.type, 'question'),
          eq(itemSpacedRepetitionTrackingTable.userId, userId),
          eq(itemSpacedRepetitionTrackingTable.topicId, topicId),
        ),
      )
      .where(eq(questionsTable.topicId, topicId))
      .orderBy(questionsTable.createdAt);

    // drizzle leftJoin có thể trả tracking object full nhưng all-null => normalize về null
    return rows.map((r) => {
      const t = r.tracking;
      const tracking =
        t && t.itemId !== null && t.userId !== null
          ? (t as QuestionWithTrackingRow['tracking'])
          : null;

      return {
        question: r.question,
        tracking,
      };
    });
  }
}

export const questionHealthRepo = new QuestionHealthRepo();
