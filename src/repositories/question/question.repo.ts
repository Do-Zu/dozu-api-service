import db from '@/libs/drizzleClient.lib';
import { questionsTable } from '@/models/quiz/question.model';
import { eq, inArray } from 'drizzle-orm';
import { QuestionBatchPayload } from '@/dtos/question/ question.dto';

class QuestionRepo {
  public async handleBatchInsertUpdateDelete(
    userId: number,
    topicId: number,
    { insert, update, delete: deleteIds }: QuestionBatchPayload
  ) {
    const insertData = insert?.map((q) => ({
      topicId,
      userId,
      questionText: q.questionText,
      choices: q.choices,
      correctIndex: q.correctIndex,
    })) ?? [];

    const updateOps = update
      ?.filter((q) => typeof q.id === 'number')
      .map((q) =>
        db
          .update(questionsTable)
          .set({
            questionText: q.questionText,
            choices: q.choices,
            correctIndex: q.correctIndex,
          })
          .where(eq(questionsTable.questionId, q.id as number))
      ) ?? [];

    const deleteQuery = deleteIds?.length
      ? db.delete(questionsTable).where(inArray(questionsTable.questionId, deleteIds))
      : null;

    if (insertData.length) await db.insert(questionsTable).values(insertData);
    if (updateOps.length) await Promise.all(updateOps.map((q) => q));
    if (deleteQuery) await deleteQuery;
  }
}

export const questionRepo = new QuestionRepo();
