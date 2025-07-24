import { questionRepo } from '@/repositories/question/question.repo';
import { QuestionBatchPayload } from '@/dtos/question/ question.dto';

class QuestionService {
    async handleGetAllQuestionsForTopic(topicId: number) {
        return questionRepo.handleGetAllQuestionsForTopic(topicId);
    }
    async handleBatchQuestions(userId: number, topicId: number, batch: QuestionBatchPayload) {
        await questionRepo.handleBatchInsertUpdateDelete(userId, topicId, batch);
    }
}

export const questionService = new QuestionService();
