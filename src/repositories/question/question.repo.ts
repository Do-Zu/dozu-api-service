import db from '@/libs/drizzleClient.lib';
import { questionsTable } from '@/models/quiz/question.model';
import { eq, and, inArray } from 'drizzle-orm';
import { QuestionBatchPayload } from '@/dtos/question/ question.dto';
import { IFlashcardStatus, itemSpacedRepetitionTrackingTable } from '@/models';

export type IQuestionBasic = {
  questionId: number;
  questionText: string;
  choices: string[];
  correctIndex: number;
  status: IFlashcardStatus; 
};

class QuestionRepo {

public async handleGetAllQuestionsForTopic(topicId: number): Promise<IQuestionBasic[]> {
  const questions = await db
    .select({
      questionId: questionsTable.questionId,
      questionText: questionsTable.questionText,
      choices: questionsTable.choices,
      correctIndex: questionsTable.correctIndex,
      status: itemSpacedRepetitionTrackingTable.status, 
    })
    .from(questionsTable)
    .leftJoin(
      itemSpacedRepetitionTrackingTable,
      and(
        eq(itemSpacedRepetitionTrackingTable.itemId, questionsTable.questionId),
        eq(itemSpacedRepetitionTrackingTable.type, 'question')
      )
    )
    .where(eq(questionsTable.topicId, topicId))
    .orderBy(questionsTable.createdAt);

  return questions.map(q => ({
    questionId: q.questionId,
    questionText: q.questionText,
    choices: q.choices ?? [],
    correctIndex: q.correctIndex ?? 0,
    status: (q.status ?? 'new') as IFlashcardStatus, 
  }));
}

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
