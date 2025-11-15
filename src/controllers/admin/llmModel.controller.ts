import { Request, Response } from 'express';
import { adminLlmModelService } from '@/services/admin/llmModel.service';
import { SuccessResponse } from '@/core/success';
import { GetLlmModelsQueryDto } from '@/dtos/admin/llmModel.dto';

class AdminLlmModelController {
  constructor() {}

  async handleGetAllModels(req: Request, res: Response) {
    const models = await adminLlmModelService.getAllModels(req.validated!.query as GetLlmModelsQueryDto);
    SuccessResponse.ok(res, models, 'Fetched LLM models successfully');
  }

  async handleGetModelById(req: Request, res: Response) {
    const { id } = req.validated!.params as { id: number };
    const model = await adminLlmModelService.getModelById(id);
    SuccessResponse.ok(res, model, 'Fetched LLM model successfully');
  }

  async handleCreateModel(req: Request, res: Response) {
    const model = await adminLlmModelService.createModel(req.body);
    SuccessResponse.created(res, model, 'Created LLM model successfully');
  }

  async handleUpdateModel(req: Request, res: Response) {
    const { id } = req.validated!.params as { id: number };
    const model = await adminLlmModelService.updateModel(id, req.body);
    SuccessResponse.ok(res, model, 'Updated LLM model successfully');
  }

  async handleDeleteModel(req: Request, res: Response) {
    const { id } = req.validated!.params as { id: number };
    const result = await adminLlmModelService.deleteModel(id);
    SuccessResponse.ok(res, result, 'Deleted LLM model successfully');
  }

  async handleToggleModelAvailability(req: Request, res: Response) {
    const { id } = req.validated!.params as { id: number };
    const model = await adminLlmModelService.toggleModelAvailability(id);
    SuccessResponse.ok(res, model, 'Toggled model availability successfully');
  }
}

export const adminLlmModelController = new AdminLlmModelController();

