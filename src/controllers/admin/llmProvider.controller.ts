import { Request, Response } from 'express';
import { adminLlmProviderService } from '@/services/admin/llmProvider.service';
import { SuccessResponse } from '@/core/success';

class AdminLlmProviderController {
  constructor() {}

  async handleGetAllProviders(req: Request, res: Response) {
    const providers = await adminLlmProviderService.getAllProviders(req.query as any);
    SuccessResponse.ok(res, providers, 'Fetched LLM providers successfully');
  }

  async handleGetProviderById(req: Request, res: Response) {
    const { id } = req.validated!.params as { id: number };
    const provider = await adminLlmProviderService.getProviderById(id);
    SuccessResponse.ok(res, provider, 'Fetched LLM provider successfully');
  }

  async handleCreateProvider(req: Request, res: Response) {
    const provider = await adminLlmProviderService.createProvider(req.body);
    SuccessResponse.created(res, provider, 'Created LLM provider successfully');
  }

  async handleUpdateProvider(req: Request, res: Response) {
    const { id } = req.validated!.params as { id: number };
    const provider = await adminLlmProviderService.updateProvider(id, req.body);
    SuccessResponse.ok(res, provider, 'Updated LLM provider successfully');
  }

  async handleDeleteProvider(req: Request, res: Response) {
    const { id } = req.validated!.params as { id: number };
    const result = await adminLlmProviderService.deleteProvider(id);
    SuccessResponse.ok(res, result, 'Deleted LLM provider successfully');
  }

  async handleToggleProviderAvailability(req: Request, res: Response) {
    const { id } = req.validated!.params as { id: number };
    const provider = await adminLlmProviderService.toggleProviderAvailability(id);
    SuccessResponse.ok(res, provider, 'Toggled provider availability successfully');
  }
}

export const adminLlmProviderController = new AdminLlmProviderController();

