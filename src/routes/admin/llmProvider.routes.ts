import { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { registerRoute } from '@/routes/register.routes';
import { authMiddleware, validateAdmin } from '@/middleware/auth.middleware';
import { adminLlmProviderController } from '@/controllers/admin/llmProvider.controller';
import {
  validateGetLlmProvidersQuery,
  validateCreateLlmProvider,
  validateUpdateLlmProvider,
  validateIdParam,
} from '@/middleware/validations/admin/llmProvider.validation';

const router = Router();
globalAsyncHandler(router);
router.use(authMiddleware);
router.use(validateAdmin);

// Get all providers with filters
router.get('/', validateGetLlmProvidersQuery(), adminLlmProviderController.handleGetAllProviders);

// Get provider by ID
router.get('/:id', validateIdParam(), adminLlmProviderController.handleGetProviderById);

// Create new provider
router.post('/', validateCreateLlmProvider(), adminLlmProviderController.handleCreateProvider);

// Update provider
router.patch('/:id', validateIdParam(), validateUpdateLlmProvider(), adminLlmProviderController.handleUpdateProvider);

// Delete provider
router.delete('/:id', validateIdParam(), adminLlmProviderController.handleDeleteProvider);

// Toggle provider availability
router.patch('/:id/toggle-availability', validateIdParam(), adminLlmProviderController.handleToggleProviderAvailability);

registerRoute('/admin/llm-providers', router, {
  description: 'Admin LLM Providers Management API',
  version: 'v1',
  isEnabled: true,
});

export const adminLlmProviderRoutes = router;

