import { Request, Response } from 'express';
import { adminLlmApiKeyModelService } from '@/services/admin/llmApiKeyModel.service';
import { SuccessResponse } from '@/core/success';
import { GetLlmApiKeyModelsQueryDto } from '@/dtos/admin/llmApiKeyModel.dto';

class AdminLlmApiKeyModelController {
  constructor() {}

  async handleGetAllApiKeyModels(req: Request, res: Response) {
    const relations = await adminLlmApiKeyModelService.getAllApiKeyModels(req.validated!.query as GetLlmApiKeyModelsQueryDto);
    SuccessResponse.ok(res, relations, 'Fetched API key-model relations successfully');
  }

  async handleGetApiKeyModelById(req: Request, res: Response) {
    const { id } = req.validated!.params as { id: number };
    const relation = await adminLlmApiKeyModelService.getApiKeyModelById(id);
    SuccessResponse.ok(res, relation, 'Fetched API key-model relation successfully');
  }

  async handleCreateApiKeyModel(req: Request, res: Response) {
    const relation = await adminLlmApiKeyModelService.createApiKeyModel(req.body);
    SuccessResponse.created(res, relation, 'Created API key-model relation successfully');
  }

  async handleUpdateApiKeyModel(req: Request, res: Response) {
    const { id } = req.validated!.params as { id: number };
    const relation = await adminLlmApiKeyModelService.updateApiKeyModel(id, req.body);
    SuccessResponse.ok(res, relation, 'Updated API key-model relation successfully');
  }

  async handleDeleteApiKeyModel(req: Request, res: Response) {
    const { id } = req.validated!.params as { id: number };
    const result = await adminLlmApiKeyModelService.deleteApiKeyModel(id);
    SuccessResponse.ok(res, result, 'Deleted API key-model relation successfully');
  }
}

export const adminLlmApiKeyModelController = new AdminLlmApiKeyModelController();

