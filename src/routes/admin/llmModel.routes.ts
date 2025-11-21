import { Router } from 'express';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { registerRoute } from '@/routes/register.routes';
import { authMiddleware, validateAdmin } from '@/middleware/auth.middleware';
import { adminLlmModelController } from '@/controllers/admin/llmModel.controller';
import {
  validateGetLlmModelsQuery,
  validateCreateLlmModel,
  validateUpdateLlmModel,
  validateIdParam,
} from '@/middleware/validations/admin/llmModel.validation';

const router = Router();
globalAsyncHandler(router);
router.use(authMiddleware);
router.use(validateAdmin);

// Get all models with filters
router.get('/', validateGetLlmModelsQuery(), adminLlmModelController.handleGetAllModels);

// Get model by ID
router.get('/:id', validateIdParam(), adminLlmModelController.handleGetModelById);

// Create new model
router.post('/', validateCreateLlmModel(), adminLlmModelController.handleCreateModel);

// Update model
router.patch('/:id', validateIdParam(), validateUpdateLlmModel(), adminLlmModelController.handleUpdateModel);

// Delete model
router.delete('/:id', validateIdParam(), adminLlmModelController.handleDeleteModel);

// Toggle model availability
router.patch('/:id/toggle-availability', validateIdParam(), adminLlmModelController.handleToggleModelAvailability);

registerRoute('/admin/llm-models', router, {
  description: 'Admin LLM Models Management API',
  version: 'v1',
  isEnabled: true,
});

export const adminLlmModelRoutes = router;

