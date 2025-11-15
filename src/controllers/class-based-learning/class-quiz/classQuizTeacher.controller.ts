import { Request, Response } from 'express';
import { SuccessResponse } from '@/core/success';
import { BadRequest } from '@/core/error';
import { classQuizTeacherService } from '@/services/class-based-learning/class-quiz/classQuizTeacher.service';
import {
  CreateClassQuizDto,
  UpsertDraftDto,
  UpdateQuizSettingsDto,
  ScheduleDto,
} from '@/dtos/class-quiz/classQuiz.dto';

class ClassQuizTeacherController {
  async createClassQuiz(req: Request, res: Response) {
    const classId = Number(req.params.classId);
    if (isNaN(classId)) throw new BadRequest('Invalid classId');
    const body = req.body as CreateClassQuizDto;

    const out = await classQuizTeacherService.createDraftQuiz(classId, body);
    SuccessResponse.created(res, out);
  }

  async upsertDraft(req: Request, res: Response) {
    const classQuizId = Number(req.params.classQuizId);
    if (isNaN(classQuizId)) throw new BadRequest('Invalid classQuizId');
    const body = req.body as UpsertDraftDto;

    const out = await classQuizTeacherService.upsertDraft(classQuizId, body);
    SuccessResponse.ok(res, out);
  }

  async updateSettings(req: Request, res: Response) {
    const classQuizId = Number(req.params.classQuizId);
    if (isNaN(classQuizId)) throw new BadRequest('Invalid classQuizId');
    const body = req.body as UpdateQuizSettingsDto;

    const out = await classQuizTeacherService.updateSettings(classQuizId, body);
    SuccessResponse.ok(res, out);
  }

  async schedule(req: Request, res: Response) {
    const classQuizId = Number(req.params.classQuizId);
    if (isNaN(classQuizId)) throw new BadRequest('Invalid classQuizId');
    const body = req.body as ScheduleDto;

    const out = await classQuizTeacherService.schedule(classQuizId, body);
    SuccessResponse.ok(res, out);
  }

  async publish(req: Request, res: Response) {
    const classQuizId = Number(req.params.classQuizId);
    if (isNaN(classQuizId)) throw new BadRequest('Invalid classQuizId');

    const out = await classQuizTeacherService.publish(classQuizId);
    SuccessResponse.ok(res, out);
  }

  async pause(req: Request, res: Response) {
    const classQuizId = Number(req.params.classQuizId);
    if (isNaN(classQuizId)) throw new BadRequest('Invalid classQuizId');

    const out = await classQuizTeacherService.setAcceptingSubmissions(classQuizId, false);
    SuccessResponse.ok(res, out);
  }

  async resume(req: Request, res: Response) {
    const classQuizId = Number(req.params.classQuizId);
    if (isNaN(classQuizId)) throw new BadRequest('Invalid classQuizId');

    const out = await classQuizTeacherService.setAcceptingSubmissions(classQuizId, true);
    SuccessResponse.ok(res, out);
  }

  async close(req: Request, res: Response) {
    const classQuizId = Number(req.params.classQuizId);
    if (isNaN(classQuizId)) throw new BadRequest('Invalid classQuizId');

    const out = await classQuizTeacherService.close(classQuizId);
    SuccessResponse.ok(res, out);
  }

  async listClassQuizzes(req: Request, res: Response) {
    const classId = Number(req.params.classId);
    if (isNaN(classId)) throw new BadRequest('Invalid classId');
    const { status } = req.query as { status?: 'draft'|'scheduled'|'published'|'closed' };

    const out = await classQuizTeacherService.listClassQuizzes(classId, status);
    SuccessResponse.ok(res, out);
  }

    async getDraft(req: Request, res: Response) {
    const classQuizId = Number(req.params.classQuizId);
    if (isNaN(classQuizId)) throw new BadRequest('Invalid classQuizId');

    // authMiddleware đã gắn req.user => có thể dùng để kiểm tra sở hữu
    const teacherId = (req as any)?.user?.userId as number | undefined;

    const out = await classQuizTeacherService.getDraft(classQuizId, teacherId);
    // out: { draftJson, version, updatedAt }
    SuccessResponse.ok(res, out);
  }

  async getClassQuiz(req: Request, res: Response) {
    const classQuizId = Number(req.params.classQuizId);
    if (isNaN(classQuizId)) throw new BadRequest('Invalid classQuizId');

    const teacherId = (req as any)?.user?.userId as number | undefined;
    const out = await classQuizTeacherService.getClassQuizInfo(classQuizId, teacherId);
    SuccessResponse.ok(res, out);
  }
}

export const classQuizTeacherController = new ClassQuizTeacherController();
