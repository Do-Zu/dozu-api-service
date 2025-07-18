import express from 'express';
import { registerRoute } from '../register.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { getInputSetDocumentController } from '@/controllers/inputSet.controller';
const router = express.Router();

globalAsyncHandler(router);

// apply middleware here and use key word "use"
// router.use(middleware function here)

router.get('/document/:topicId', getInputSetDocumentController);

registerRoute('/input-set', router, {
    description: 'Authentication endpoints',
    version: 'v1',
    isEnabled: true,
});

export default router;
