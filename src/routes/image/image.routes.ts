import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { Router } from 'express';
import { registerRoute } from '@/routes/register.routes';
import { authMiddleware } from '@/middleware/auth.middleware';
import { fileUploadSingleMiddleware } from '@/libs/multer.lib';
import imageController from '@/controllers/image/image.controller';

const router = Router(); 

globalAsyncHandler(router);
router.use(authMiddleware);

router.post('/', fileUploadSingleMiddleware, imageController.uploadImage);

registerRoute('/images', router, {
    description: 'Image API for uploading images',
    version: 'v1',
    isEnabled: true,
});

export const imageRoutes = router;
