import { Request, Response } from 'express';
import { adminLlmModelService } from '@/services/admin/llmModel.service';
import { SuccessResponse } from '@/core/success';

class AdminLlmModelController {
  constructor() {}

  async handleGetAllModels(req: Request, res: Response) {
    const models = await adminLlmModelService.getAllModels(req.query as any);
    SuccessResponse.ok(res, models, 'Fetched LLM models successfully');
  }

  async handleGetModelById(req: Request, res: Response) {
    const { id } = req.params;
    const model = await adminLlmModelService.getModelById(Number(id));
    SuccessResponse.ok(res, model, 'Fetched LLM model successfully');
  }

  async handleCreateModel(req: Request, res: Response) {
    const model = await adminLlmModelService.createModel(req.body);
    SuccessResponse.created(res, model, 'Created LLM model successfully');
  }

  async handleUpdateModel(req: Request, res: Response) {
    const { id } = req.params;
    const model = await adminLlmModelService.updateModel(Number(id), req.body);
    SuccessResponse.ok(res, model, 'Updated LLM model successfully');
  }

  async handleDeleteModel(req: Request, res: Response) {
    const { id } = req.params;
    const result = await adminLlmModelService.deleteModel(Number(id));
    SuccessResponse.ok(res, result, 'Deleted LLM model successfully');
  }

  async handleToggleModelAvailability(req: Request, res: Response) {
    const { id } = req.params;
    const model = await adminLlmModelService.toggleModelAvailability(Number(id));
    SuccessResponse.ok(res, model, 'Toggled model availability successfully');
  }
}

export const adminLlmModelController = new AdminLlmModelController();

