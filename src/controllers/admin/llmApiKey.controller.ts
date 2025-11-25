import { Request, Response } from 'express';
import { adminLlmApiKeyService } from '@/services/admin/llmApiKey.service';
import { SuccessResponse } from '@/core/success';
import { GetLlmApiKeysQueryDto } from '@/dtos/admin/llmApiKey.dto';

class AdminLlmApiKeyController {
  constructor() {}

  async handleGetAllApiKeys(req: Request, res: Response) {
    const apiKeys = await adminLlmApiKeyService.getAllApiKeys(req.validated!.query as GetLlmApiKeysQueryDto);
    SuccessResponse.ok(res, apiKeys, 'Fetched API keys successfully');
  }

  async handleGetApiKeyById(req: Request, res: Response) {
    const { id } = req.validated!.params as { id: number };
    const apiKey = await adminLlmApiKeyService.getApiKeyById(id);
    SuccessResponse.ok(res, apiKey, 'Fetched API key successfully');
  }

  async handleCreateApiKey(req: Request, res: Response) {
    const apiKey = await adminLlmApiKeyService.createApiKey(req.body);
    SuccessResponse.created(res, apiKey, 'Created API key successfully');
  }

  async handleUpdateApiKey(req: Request, res: Response) {
    const { id } = req.validated!.params as { id: number };
    const apiKey = await adminLlmApiKeyService.updateApiKey(id, req.body);
    SuccessResponse.ok(res, apiKey, 'Updated API key successfully');
  }

  async handleDeleteApiKey(req: Request, res: Response) {
    const { id } = req.validated!.params as { id: number };
    const result = await adminLlmApiKeyService.deleteApiKey(id);
    SuccessResponse.ok(res, result, 'Deleted API key successfully');
  }

  async handleToggleApiKeyStatus(req: Request, res: Response) {
    const { id } = req.validated!.params as { id: number };
    const apiKey = await adminLlmApiKeyService.toggleApiKeyStatus(id);
    SuccessResponse.ok(res, apiKey, 'Toggled API key status successfully');
  }
}

export const adminLlmApiKeyController = new AdminLlmApiKeyController();

