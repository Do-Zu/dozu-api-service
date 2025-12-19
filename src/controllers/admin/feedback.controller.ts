import { Request, Response } from 'express';
import { SuccessResponse } from '@/core/success';
import { getAdminFeedbackQuerySchema, updateFeedbackSchema } from '@/dtos/admin/feedback.dto';
import { adminFeedbackService } from '@/services/admin/feedback.service';

class AdminFeedbackController {
  async getAllFeedback(req: Request, res: Response) {
    const query = getAdminFeedbackQuerySchema.parse(req.query);
    const result = await adminFeedbackService.getAllFeedback(query);
    SuccessResponse.ok(res, result, 'Feedback retrieved successfully');
  }

  async updateFeedback(req: Request, res: Response) {
    const feedbackId = Number(req.params.id);
    const payload = updateFeedbackSchema.parse(req.body);
    const result = await adminFeedbackService.updateFeedback(feedbackId, payload);
    SuccessResponse.ok(res, result, 'Feedback updated successfully');
  }

  // Phase 1 rule (ops): score<=1 & olderThan(7d) => ignored
  async runAutoIgnore(req: Request, res: Response) {
    const result = await adminFeedbackService.autoIgnoreLowScore(7);
    SuccessResponse.ok(res, result, 'Auto-ignore executed');
  }
}

export const adminFeedbackController = new AdminFeedbackController();
