import { Request, Response } from "express"
import { SuccessResponse } from "@/core/success";
import {questionService} from "@/services/question/questions.service";

export const questionController = {

    async create(req: Request, res: Response) {
        const dto = req.body;
        const question  = await questionService.create(dto);
        SuccessResponse.created(res, question);
    },

    async getByTopic(req: Request, res: Response): Promise<void> {
        const {topicId} = req.params;
        const questions = await questionService.getByTopic(Number(topicId));
        SuccessResponse.ok(res, questions);
    },

    async getQuizQuestions(req: Request, res: Response) {
        const { topicId } = req.params;
        const questions = await questionService.getQuizQuestions(Number(topicId));
        SuccessResponse.ok(res, questions);
    },

    async getById(req: Request, res: Response) {
        const { id } = req.params;
        const question = await questionService.getById(Number(id));
        SuccessResponse.ok(res, question);
    },

    async update(req: Request, res: Response) {
        const id = Number(req.params.id);
        const dto = req.body;
        await questionService.update(id, dto);
        SuccessResponse.ok(res, 'success');
    },

    async delete(req: Request, res: Response) {
        const id = Number(req.params.id);
        await questionService.delete(id);
        SuccessResponse.ok(res, 'success');
    },

    async submitQuizResult(req: Request, res: Response) {
        const dto = req.body;
        const result = await questionService.submitQuizResult(dto);
        SuccessResponse.ok(res, result);
    }

}