import { itemSpacedRepetitionTrackingTable } from '@/models/tracking/itemSpacedRepetitionTracking.model';
import db from '@/libs/drizzleClient.lib';
import { eq, and } from 'drizzle-orm';
import SuperMemo2 from '@/services/spaced-repetition-system/super-memo-2/superMemo2.origin';

export async function applySM2ForQuestion(userId: number, questionId: number, topicId: number, correct: boolean) {
  const now = new Date();
  const quality = correct ? 5 : 2;

  const existing = await db.query.itemSpacedRepetitionTrackingTable.findFirst({
    where: and(
      eq(itemSpacedRepetitionTrackingTable.userId, userId),
      eq(itemSpacedRepetitionTrackingTable.itemId, questionId),
      eq(itemSpacedRepetitionTrackingTable.type, 'question')
    ),
  });

  if (!existing) {
    const sm2 = new SuperMemo2(2.5, 0, 0, quality).calc();
    const nextReview = SuperMemo2.getNextReview(now, sm2.reviewInterval);

    await db.insert(itemSpacedRepetitionTrackingTable).values({
      userId,
      itemId: questionId,
      topicId,
      type: 'question',
      easinessFactor: sm2.easinessFactor,
      reviewInterval: sm2.reviewInterval,
      repetitionNumber: sm2.repetitionNumber,
      lastReviewed: now.toISOString(),
      nextReview,
      status: 'learning',
    });
  } else {
    const sm2 = new SuperMemo2(
      existing.easinessFactor,
      existing.reviewInterval,
      existing.repetitionNumber,
      quality
    ).calc();
    const nextReview = SuperMemo2.getNextReview(now, sm2.reviewInterval);

    await db.update(itemSpacedRepetitionTrackingTable)
      .set({
        easinessFactor: sm2.easinessFactor,
        reviewInterval: sm2.reviewInterval,
        repetitionNumber: sm2.repetitionNumber,
        lastReviewed: now.toISOString(),
        nextReview,
        status: 'review',
      })
      .where(and(
        eq(itemSpacedRepetitionTrackingTable.userId, userId),
        eq(itemSpacedRepetitionTrackingTable.itemId, questionId),
        eq(itemSpacedRepetitionTrackingTable.type, 'question')
      ));
  }
}
