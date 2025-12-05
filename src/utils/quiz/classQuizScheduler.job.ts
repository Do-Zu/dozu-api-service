import db from '@/libs/drizzleClient.lib';
import { classQuizzesTable } from '@/models';
import { and, eq, lte, isNotNull } from 'drizzle-orm';
import { classQuizSharedRepo } from '@/repositories/class-based-learning/class-quiz/classQuiz.shared.repo';

const POLLING_INTERVAL_MS = 60_000; // 1 minute

const now = () => new Date();

async function runOnce() {
  const current = now();

  // Auto publish: scheduled && startAt <= now
  const dueToPublish = await db
    .select({ id: classQuizzesTable.classQuizId })
    .from(classQuizzesTable)
    .where(
      and(
        eq(classQuizzesTable.status, 'scheduled'),
        isNotNull(classQuizzesTable.startAt),
        lte(classQuizzesTable.startAt, current),
      ),
    );

  for (const row of dueToPublish) {
    try {
      await classQuizSharedRepo.publish(row.id);
      
      await db
        .update(classQuizzesTable)
        .set({
          autoPublishError: null,
          autoPublishLastTriedAt: now(),
        })
        .where(eq(classQuizzesTable.classQuizId, row.id));
    } catch (e: any) {
      await db
        .update(classQuizzesTable)
        .set({
          autoPublishError: String(e?.message ?? 'Auto publish failed'),
          autoPublishLastTriedAt: now(),
        })
        .where(eq(classQuizzesTable.classQuizId, row.id));
    }
  }

  // Auto close: published && endAt <= now
  const dueToClose = await db
    .select({ id: classQuizzesTable.classQuizId })
    .from(classQuizzesTable)
    .where(
      and(
        eq(classQuizzesTable.status, 'published'),
        isNotNull(classQuizzesTable.endAt),
        lte(classQuizzesTable.endAt, current),
      ),
    );

  for (const row of dueToClose) {
    try {
      await classQuizSharedRepo.close(row.id);
    } catch (e) {
      console.error('Auto close quiz failed', row.id, e);
    }
  }
}

export function startClassQuizScheduler() {
  // run once when server boots
  runOnce().catch((err) => console.error('classQuizScheduler first run error', err));

  // repeat each POLLING_INTERVAL_MS
  setInterval(() => {
    runOnce().catch((err) => console.error('classQuizScheduler interval error', err));
  }, POLLING_INTERVAL_MS);
}
