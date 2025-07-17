import db from '@/libs/drizzleClient.lib';
import { questionsTable } from '@/models/quiz/question.model';
import { itemSpacedRepetitionTrackingTable } from '@/models/tracking/itemSpacedRepetitionTracking.model';
import { questionResultTable } from '@/models/quiz/questionResult.model';
import { quizResultTable } from '@/models/quiz/quizResult.model';
import { quizzesTable } from '@/models/quiz/quiz.model';
import { IQuizResultPayload } from '@/types/quiz/quiz.type';
import { eq, and, lt, sql, desc } from 'drizzle-orm';
import { QuizCreateDto } from '@/dtos/quiz/quiz.dto';

class QuizRepo {
    async getInitialQuiz(topicId: number) {
        return db.select().from(questionsTable).where(eq(questionsTable.topicId, topicId));
    }

    async getReviewQuiz(topicId: number, userId: number) {
        return db
            .select()
            .from(questionsTable)
            .innerJoin(
                itemSpacedRepetitionTrackingTable,
                eq(questionsTable.questionId, itemSpacedRepetitionTrackingTable.itemId)
            )
            .where(
                and(
                    eq(itemSpacedRepetitionTrackingTable.topicId, topicId),
                    eq(itemSpacedRepetitionTrackingTable.userId, userId),
                    lt(itemSpacedRepetitionTrackingTable.nextReview, new Date().toISOString())
                )
            );
    }

    async getLowEFQuiz(topicId: number, userId: number) {
        return db
            .select()
            .from(questionsTable)
            .innerJoin(
                itemSpacedRepetitionTrackingTable,
                eq(questionsTable.questionId, itemSpacedRepetitionTrackingTable.itemId)
            )
            .where(
                and(
                    eq(itemSpacedRepetitionTrackingTable.topicId, topicId),
                    eq(itemSpacedRepetitionTrackingTable.userId, userId),
                    lt(itemSpacedRepetitionTrackingTable.easinessFactor, '2.0') // Lọc theo EasinessFactor
                )
            );
    }

async getNewQuiz(topicId: number) {
    return db
        .select()
        .from(questionsTable)
        .where(
            and(
                eq(questionsTable.topicId, topicId),
                sql`NOT EXISTS (
                    SELECT 1
                    FROM ${itemSpacedRepetitionTrackingTable}
                    WHERE ${itemSpacedRepetitionTrackingTable}.item_id = ${questionsTable.questionId}
                )` 
            )
        );
}


    async getRandomQuiz(topicId: number) {
        return db.select().from(questionsTable).where(eq(questionsTable.topicId, topicId));
    }

    async getWrongQuiz(topicId: number, userId: number) {
        return db
            .select()
            .from(questionResultTable)
            .innerJoin(questionsTable, eq(questionResultTable.questionId, questionsTable.questionId))
            .where(
                and(
                    eq(questionResultTable.userId, userId),
                    eq(questionsTable.topicId, topicId),
                    eq(questionResultTable.correct, false)
                )
            );
    }

    async createQuizWithQuestions({ topicId, name, description }: QuizCreateDto) {
        const [quiz] = await db
            .insert(quizzesTable)
            .values({ topicId, name, description })
            .returning({ quizId: quizzesTable.quizId });

        return quiz.quizId;
    }

    async getQuizById(quizId: number) {
        const result = await db.query.quizzesTable.findFirst({
            where: eq(quizzesTable.quizId, quizId),
            columns: {
                quizId: true,
                name: true,
                description: true,
            },
        });

        return result ?? null;
    }

    async saveQuizAndQuestionResults(
        userId: number,
        quizId: number,
        results: IQuizResultPayload[],
        correctAnswersCount: number
    ) {
        // Insert into quiz_result table
        const [inserted] = await db
            .insert(quizResultTable)
            .values({
                quizId,
                correctAnswersCount,
                questionsCount: results.length,
                timeReviewed: new Date(),
            })
            .returning({ quizResultId: quizResultTable.quizResultId });

        // Insert the results of each question into question_result
        const questionResults = results.map(r => ({
            quizId,
            questionId: r.questionId,
            userId,
            correct: r.correct,
            answeredAt: new Date(),
        }));

        await db.insert(questionResultTable).values(questionResults);

        return inserted.quizResultId;
    }

    async getTopicIdByQuestionId(questionId: number): Promise<number> {
        const record = await db.query.questionsTable.findFirst({
            columns: { topicId: true },
            where: eq(questionsTable.questionId, questionId),
        });
        return record?.topicId ?? -1;
    }

    async getQuizHistoryByTopic(topicId: number) {
        return await db
            .select({
                quizResultId: quizResultTable.quizResultId,
                quizId: quizzesTable.quizId,
                correctAnswersCount: quizResultTable.correctAnswersCount,
                questionsCount: quizResultTable.questionsCount,
                timeReviewed: quizResultTable.timeReviewed,
            })
            .from(quizResultTable)
            .innerJoin(quizzesTable, eq(quizResultTable.quizId, quizzesTable.quizId))
            .where(eq(quizzesTable.topicId, topicId))
            .orderBy(desc(quizResultTable.timeReviewed));
    }

    async getQuizResultDetail(quizResultId: number) {
        // Join quiz_result, question_result, questions
        const rows = await db
            .select({
                quizResultId: quizResultTable.quizResultId,
                quizId: quizResultTable.quizId,
                correctAnswersCount: quizResultTable.correctAnswersCount,
                questionsCount: quizResultTable.questionsCount,
                timeReviewed: quizResultTable.timeReviewed,
                questionId: questionsTable.questionId,
                questionText: questionsTable.questionText,
                choices: questionsTable.choices,
                correctIndex: questionsTable.correctIndex,
                userAnswerCorrect: questionResultTable.correct,
            })
            .from(quizResultTable)
            .innerJoin(questionResultTable, eq(quizResultTable.quizId, questionResultTable.quizId))
            .innerJoin(questionsTable, eq(questionResultTable.questionId, questionsTable.questionId))
            .where(eq(quizResultTable.quizResultId, quizResultId));

        if (!rows.length) return null;

        const { quizId, correctAnswersCount, questionsCount, timeReviewed } = rows[0];

        const questions = rows.map(r => ({
            questionId: r.questionId,
            questionText: r.questionText,
            choices: r.choices,
            correctIndex: r.correctIndex,
            userAnswerCorrect: r.userAnswerCorrect,
        }));

        return {
            quizResultId,
            quizId,
            correctAnswersCount,
            questionsCount,
            timeReviewed,
            questions,
        };
    }
    //     {
    //   "quizResultId": 12,
    //   "quizId": 5,
    //   "correctAnswersCount": 7,
    //   "questionsCount": 10,
    //   "timeReviewed": "2025-07-13T10:00:00Z",
    //   "questions": [
    //     {
    //       "questionId": 101,
    //       "questionText": "What is 2 + 2?",
    //       "choices": ["2", "3", "4", "5"],
    //       "correctIndex": 2,
    //       "userAnswerCorrect": true
    //     },
    //     ...
    //   ]
    // }
}

export const quizRepo = new QuizRepo();
