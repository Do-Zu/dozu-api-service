import { CreateQuestionDto } from "@/dtos/questions/createQuestion.dto";
import { questionsTable } from "@/models/question.model";
import db from '@/libs/drizzleClient.lib';
import { eq, inArray } from 'drizzle-orm';


export const questionRepository = {
    async insert(dto: CreateQuestionDto): Promise<number> {
        const [inserted] = await db.insert(questionsTable).values({
            topicId: dto.topicId,
            questionText: dto.questionText,
            choices: dto.choices,
            correctIndex: dto.correctIndex
          }).returning({ id: questionsTable.questionId });
      
          return inserted.id;
    },

    async findByTopicId(topicId: number) {
        return await db.select().from(questionsTable).where(eq(questionsTable.topicId, topicId));
    },

    async findById(id: number) {
        const [result] = await db.select().from(questionsTable).where(eq(questionsTable.questionId, id));
        return result;
    },

    async update(id: number, data: { questionText: string; choices: string[]; correctIndex: number }) {
        await db.update(questionsTable)
          .set({
            questionText: data.questionText,
            choices: data.choices,
            correctIndex: data.correctIndex,
          })
          .where(eq(questionsTable.questionId, id));
    },

    async delete(id: number) {
        await db.delete(questionsTable).where(eq(questionsTable.questionId, id));
    },

    async getCorrectAnswerMap(questionIds: number[]) {
        const questions = await db
          .select({ id: questionsTable.questionId, correctIndex: questionsTable.correctIndex })
          .from(questionsTable)
          .where(inArray(questionsTable.questionId, questionIds));
    
        return new Map(questions.map(q => [q.id, q.correctIndex]));
    },

}