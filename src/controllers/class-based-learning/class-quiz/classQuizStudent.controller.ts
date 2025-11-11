import { Request, Response } from 'express';
import { SuccessResponse } from '@/core/success';
import { BadRequest, Forbidden } from '@/core/error';
import { classQuizStudentService } from '@/services/class-based-learning/class-quiz/classQuizStudent.service';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { SaveAnswerDto } from '@/dtos/class-quiz/classQuiz.dto';

class ClassQuizStudentController {
  async getPlayableMeta(req: Request, res: Response) {
    const classQuizId = Number(req.params.classQuizId);
    if (isNaN(classQuizId)) throw new BadRequest('Invalid classQuizId');
    const userId = getUserIdFromRequest(req);

    const out = await classQuizStudentService.getPlayableMeta(userId, classQuizId);
    SuccessResponse.ok(res, out);
  }

  async startAttempt(req: Request, res: Response) {
    const classQuizId = Number(req.params.classQuizId);
    if (isNaN(classQuizId)) throw new BadRequest('Invalid classQuizId');
    const userId = getUserIdFromRequest(req);

    const out = await classQuizStudentService.startAttempt(userId, classQuizId);
    SuccessResponse.created(res, out);
  }

  async saveAnswer(req: Request, res: Response) {
    const classQuizId = Number(req.params.classQuizId);
    const attemptId = Number(req.params.attemptId);
    if (isNaN(classQuizId) || isNaN(attemptId)) throw new BadRequest('Invalid ids');

    const body = req.body as SaveAnswerDto;
    const authUserId = getUserIdFromRequest(req);

    if (authUserId !== body.userId) throw new Forbidden('User mismatch');

    const out = await classQuizStudentService.saveAnswer({
      userId: authUserId,
      classQuizId,
      attemptId,
      snapshotQuestionIdx: body.snapshotQuestionIdx,
      userAnswerIndex: body.userAnswerIndex,
    });
    SuccessResponse.ok(res, out);
  }

  async submitAttempt(req: Request, res: Response) {
    const classQuizId = Number(req.params.classQuizId);
    const attemptId = Number(req.params.attemptId);
    if (isNaN(classQuizId) || isNaN(attemptId)) throw new BadRequest('Invalid ids');

    const authUserId = getUserIdFromRequest(req);
    const out = await classQuizStudentService.submitAttempt(authUserId, { classQuizId, attemptId });
    SuccessResponse.ok(res, out);
  }

  async myAttempts(req: Request, res: Response) {
    const classId = Number(req.params.classId);
    if (isNaN(classId)) throw new BadRequest('Invalid classId');

    const userId = getUserIdFromRequest(req);
    const out = await classQuizStudentService.myAttempts(userId, classId);
    SuccessResponse.ok(res, out);
  }

  async attemptDetail(req: Request, res: Response) {
    const classQuizId = Number(req.params.classQuizId);
    const attemptId = Number(req.params.attemptId);
    if (isNaN(classQuizId) || isNaN(attemptId)) throw new BadRequest('Invalid ids');

    const userId = getUserIdFromRequest(req);
    const out = await classQuizStudentService.attemptDetail(userId, { classQuizId, attemptId });
    SuccessResponse.ok(res, out);
  }
}

export const classQuizStudentController = new ClassQuizStudentController();
