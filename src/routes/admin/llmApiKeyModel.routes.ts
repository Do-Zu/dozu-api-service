import { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { registerRoute } from '@/routes/register.routes';
import { authMiddleware, validateAdmin } from '@/middleware/auth.middleware';
import { adminLlmApiKeyModelController } from '@/controllers/admin/llmApiKeyModel.controller';
import {
  validateGetLlmApiKeyModelsQuery,
  validateCreateLlmApiKeyModel,
  validateUpdateLlmApiKeyModel,
  validateLlmApiKeyModelIdParam,
} from '@/middleware/validations/admin/llmApiKeyModel.validation';

const router = Router();
globalAsyncHandler(router);
router.use(authMiddleware);
router.use(validateAdmin);

// Get all API key-model relations with filters
router.get('/', validateGetLlmApiKeyModelsQuery(), adminLlmApiKeyModelController.handleGetAllApiKeyModels);

// Get API key-model relation by ID
router.get('/:id', validateLlmApiKeyModelIdParam(), adminLlmApiKeyModelController.handleGetApiKeyModelById);

// Create new API key-model relation
router.post('/', validateCreateLlmApiKeyModel(), adminLlmApiKeyModelController.handleCreateApiKeyModel);

// Update API key-model relation
router.patch('/:id', validateLlmApiKeyModelIdParam(), validateUpdateLlmApiKeyModel(), adminLlmApiKeyModelController.handleUpdateApiKeyModel);

// Delete API key-model relation
router.delete('/:id', validateLlmApiKeyModelIdParam(), adminLlmApiKeyModelController.handleDeleteApiKeyModel);

registerRoute('/admin/llm-api-key-models', router, {
  description: 'Admin LLM API Key-Model Relations Management API',
  version: 'v1',
  isEnabled: true,
});

export const adminLlmApiKeyModelRoutes = router;

