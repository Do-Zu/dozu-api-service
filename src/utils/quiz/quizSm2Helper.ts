import { itemSpacedRepetitionTrackingTable } from '@/models/tracking/itemSpacedRepetitionTracking.model';
import db from '@/libs/drizzleClient.lib';
import { eq, and } from 'drizzle-orm';
import SuperMemo2 from '@/services/spaced-repetition-system/super-memo-2/superMemo2.service';

type ConfidenceLevel = 1 | 2 | 3;

function mapQuizAnswerToQuality(
  correct: boolean,
  confidence?: ConfidenceLevel
): 1 | 3 | 4 | 5 {
  if (!correct) return 1;          // AGAIN
  if (confidence === 1) return 3;  // GOOD 
  if (confidence === 2) return 4;  // GOOD+
  return 5;                        // EASY
}

export async function applySM2ForQuestion(
  userId: number,
  questionId: number,
  topicId: number,
  correct: boolean,
  confidence?: ConfidenceLevel
) {
  const now = new Date();
  const quality = mapQuizAnswerToQuality(correct, confidence);

  const existing = await db.query.itemSpacedRepetitionTrackingTable.findFirst({
    where: and(
      eq(itemSpacedRepetitionTrackingTable.userId, userId),
      eq(itemSpacedRepetitionTrackingTable.itemId, questionId),
      eq(itemSpacedRepetitionTrackingTable.type, 'question')
    ),
  });

  // FIRST TIME → LEARNING
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

    return;
  }

  // UPDATE EXISTING SR
  const sm2 = new SuperMemo2(
    existing.easinessFactor,
    existing.reviewInterval,
    existing.repetitionNumber,
    quality
  ).calc();

  const nextReview = SuperMemo2.getNextReview(now, sm2.reviewInterval);

  // STATE TRANSITION
  let nextStatus = existing.status;

  switch (existing.status) {
    case 'learning':
      nextStatus = correct ? 'review' : 'learning';
      break;

    case 'review':
      nextStatus = correct ? 'review' : 'relearning';
      break;

    case 'relearning':
      nextStatus = correct ? 'review' : 'relearning';
      break;
  }

  await db
    .update(itemSpacedRepetitionTrackingTable)
    .set({
      easinessFactor: sm2.easinessFactor,
      reviewInterval: sm2.reviewInterval,
      repetitionNumber: sm2.repetitionNumber,
      lastReviewed: now.toISOString(),
      nextReview,
      status: nextStatus,
    })
    .where(and(
      eq(itemSpacedRepetitionTrackingTable.userId, userId),
      eq(itemSpacedRepetitionTrackingTable.itemId, questionId),
      eq(itemSpacedRepetitionTrackingTable.type, 'question')
    ));
}
