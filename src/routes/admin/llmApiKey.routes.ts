import { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { registerRoute } from '@/routes/register.routes';
import { authMiddleware, validateAdmin } from '@/middleware/auth.middleware';
import { adminLlmApiKeyController } from '@/controllers/admin/llmApiKey.controller';
import {
  validateGetLlmApiKeysQuery,
  validateCreateLlmApiKey,
  validateUpdateLlmApiKey,
  validateLlmApiKeyIdParam,
} from '@/middleware/validations/admin/llmApiKey.validation';

const router = Router();
globalAsyncHandler(router);
router.use(authMiddleware);
router.use(validateAdmin);

// Get all API keys with filters
router.get('/', validateGetLlmApiKeysQuery(), adminLlmApiKeyController.handleGetAllApiKeys);

// Get API key by ID
router.get('/:id', validateLlmApiKeyIdParam(), adminLlmApiKeyController.handleGetApiKeyById);

// Create new API key
router.post('/', validateCreateLlmApiKey(), adminLlmApiKeyController.handleCreateApiKey);

// Update API key
router.patch('/:id', validateLlmApiKeyIdParam(), validateUpdateLlmApiKey(), adminLlmApiKeyController.handleUpdateApiKey);

// Delete API key
router.delete('/:id', validateLlmApiKeyIdParam(), adminLlmApiKeyController.handleDeleteApiKey);

// Toggle API key status
router.patch('/:id/toggle-status', validateLlmApiKeyIdParam(), adminLlmApiKeyController.handleToggleApiKeyStatus);

registerRoute('/admin/llm-api-keys', router, {
  description: 'Admin LLM API Keys Management API',
  version: 'v1',
  isEnabled: true,
});

export const adminLlmApiKeyRoutes = router;

