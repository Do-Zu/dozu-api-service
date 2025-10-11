import ankiSettingController from '@/controllers/anki-setting/ankiSetting.controller';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { Router } from 'express';
import { registerRoute } from '../register.routes';
import paramsValidator from '@/core/validations/params.validator';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = Router();
globalAsyncHandler(router);

router.use(authMiddleware);
router.get('/', ankiSettingController.getSettingsForUser);
router.get('/default', ankiSettingController.getDefaultSettingForUser);

router.patch('/:settingId', paramsValidator.validateId('settingId'), ankiSettingController.updateSettingById);

registerRoute('/anki_settings', router, {
    description: 'API for customizing settings for learning with Anki',
    version: 'v1',
    isEnabled: true,
});

export const ankiSettingRoutes = router;
