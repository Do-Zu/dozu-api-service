import ankiSettingController from '@/controllers/anki-setting/ankiSetting.controller';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { Router } from 'express';
import { registerRoute } from '../register.routes';
import paramsValidator from '@/core/validations/params.validator';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();
globalAsyncHandler(router);

router.use(authMiddleware);
router.get('/', ankiSettingController.getSettingsForUser); // not tested yet
router.get('/default', ankiSettingController.getDefaultSettingForUser);
router.get(
    '/topic/:topicId',
    paramsValidator.validateId('topicId'),
    ankiSettingController.getUserSettingsWithActiveForTopic
);

router.patch('/:settingId', paramsValidator.validateId('settingId'), ankiSettingController.updateSettingById);
router.patch(
    '/:settingId/assign_to_topic/:topicId',
    paramsValidator.validateId('settingId'),
    paramsValidator.validateId('topicId'),
    ankiSettingController.updateSettingByIdAndAssignToTopic
);

router.post('/', ankiSettingController.createSettingForUser);
router.delete('/:settingId', paramsValidator.validateId('settingId'), ankiSettingController.deleteSettingById);

registerRoute('/anki_settings', router, {
    description: 'API for customizing settings for learning with Anki',
    version: 'v1',
    isEnabled: true,
});

export const ankiSettingRoutes = router;
