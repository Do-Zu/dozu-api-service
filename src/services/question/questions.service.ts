import { SubmitQuizResultDto } from '@/dtos/questions/submitQuizResult.dto';
import { CreateQuestionDto } from "@/dtos/questions/createQuestion.dto";
import { questionRepository } from "@/repositories/question.repo";
import { fisherYatesShuffle } from '@/utils/shuffle';

export const questionService = {
    async create(dto: CreateQuestionDto) {
        return await questionRepository.insert(dto);
    },

    async getByTopic(topicId: number) {
        return await questionRepository.findByTopicId(topicId);
    },

    async getQuizQuestions(topicId: number) {
        const all = await questionRepository.findByTopicId(topicId);
        const shuffled = fisherYatesShuffle(all);
        return shuffled.slice(0, 30);
    },

    async getById(id: number) {
        return await questionRepository.findById(id);
    },

    async update(id: number, data: { questionText: string; choices: string[]; correctIndex: number }) {
        return await questionRepository.update(id, data);
    },

    async delete(id: number) {
        return await questionRepository.delete(id);
    },

    async submitQuizResult(dto: SubmitQuizResultDto) {
        const correctMap = await questionRepository.getCorrectAnswerMap(dto.answers.map(a => a.questionId));
    
        const result = dto.answers.map(ans => {
          const correctIndex = correctMap.get(ans.questionId);
          const isCorrect = ans.userAnswer === correctIndex;
          return { ...ans, isCorrect };
        });
    
        const total = result.length;
        const correct = result.filter(r => r.isCorrect).length;
        const score = Math.round((correct / total) * 100);
    
        return { score, correct, total, result };
      }

}