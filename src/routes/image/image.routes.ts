import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { Router } from 'express';
import { registerRoute } from '@/routes/register.routes';
import { authMiddleware } from '@/middleware/auth.middleware';
import { fileUploadSingleMiddleware } from '@/libs/multer.lib';
import imageController from '@/controllers/image/image.controller';
import { validateSingleFileUpload } from '@/middleware/validations/upload.validation';
import imageValidation from '@/middleware/image/image.validation';

const router = Router();

globalAsyncHandler(router);
router.use(authMiddleware);

router.post(
    '/',
    fileUploadSingleMiddleware,
    validateSingleFileUpload(),
    imageValidation.validateImageSizeLimit,
    imageController.uploadImage
);

registerRoute('/images', router, {
    description: 'Image API for uploading images',
    version: 'v1',
    isEnabled: true,
});

export const imageRoutes = router;
